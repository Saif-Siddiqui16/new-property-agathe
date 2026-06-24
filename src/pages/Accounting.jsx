import React, { useState } from 'react';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { PaymentModal } from '../components/PaymentModal';
import { DollarSign } from 'lucide-react';
import { hasPermission } from '../utils/permissions';

const MOCK_TRANSACTIONS = [
    { id: 1, date: '2024-01-01', description: 'Rent - Jan 2024', type: 'Invoice', amount: 1200.00, balance: 1200.00, status: 'Unpaid' },
    { id: 2, date: '2024-01-05', description: 'Payment from Alice', type: 'Payment', amount: -1000.00, balance: 200.00, status: 'Partial' },
    { id: 3, date: '2024-02-01', description: 'Rent - Feb 2024', type: 'Invoice', amount: 1200.00, balance: 1400.00, status: 'Unpaid' },
];

import api from '../api/client';

export const Accounting = () => {
    const [__forceUpdate, __setForceUpdate] = useState(0);
    React.useEffect(() => {
        const handleUpdate = () => __setForceUpdate(p => p + 1);
        window.addEventListener('permissionsUpdated', handleUpdate);
        return () => window.removeEventListener('permissionsUpdated', handleUpdate);
    }, []);

    if (!hasPermission('General Ledger', 'view')) {
        return (
            <MainLayout title="Permission Denied">
                <div className="p-12 text-center bg-white rounded-[2rem] border border-slate-100 shadow-sm mt-8">
                    <h3 className="text-xl font-black text-slate-800">Access Restricted</h3>
                    <p className="max-w-md mx-auto mt-2 text-slate-500 font-medium italic">
                        You do not have permission to view this section. Please contact your administrator.
                    </p>
                </div>
            </MainLayout>
        );
    }

    const [transactions, setTransactions] = useState([]);
    const [stats, setStats] = useState({ totalRent: 0, totalDeposits: 0, totalFees: 0, totalRefunds: 0 });
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

    React.useEffect(() => {
        fetchTxs();
    }, []);

    const fetchTxs = async () => {
        try {
            const res = await api.get('/api/admin/accounting/transactions');
            if (res.data && res.data.stats) {
                setTransactions(res.data.transactions || []);
                setStats(res.data.stats);
            } else {
                setTransactions(res.data || []);
            }
        } catch (e) {
            console.error(e);
            setTransactions([]);
        }
    };

    const { totalRent, totalDeposits, totalFees, totalRefunds } = stats;

    // Pagination Logic
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    // Sort transactions by date descending for the list display
    const currentItems = transactions.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(transactions.length / itemsPerPage);

    return (
        <DashboardLayout title="Accounting & Ledger">
            <div className="flex justify-between items-center mb-6">
                <div>{/* Buttons removed as requested */}</div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                <Card className="p-4 bg-white border-slate-200 shadow-sm border-l-4 border-blue-500">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Rent Revenue</div>
                    <div className="text-2xl font-black text-slate-800">${totalRent.toLocaleString('en-CA')}</div>
                </Card>
                <Card className="p-4 bg-white border-slate-200 shadow-sm border-l-4 border-purple-500">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Deposits</div>
                    <div className="text-2xl font-black text-slate-800">${totalDeposits.toLocaleString('en-CA')}</div>
                </Card>
                <Card className="p-4 bg-white border-slate-200 shadow-sm border-l-4 border-orange-500">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Fees</div>
                    <div className="text-2xl font-black text-slate-800">${totalFees.toLocaleString('en-CA')}</div>
                </Card>
                <Card className="p-4 bg-white border-slate-200 shadow-sm border-l-4 border-red-500">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Deposit Refunds</div>
                    <div className="text-2xl font-black text-red-600">${totalRefunds.toLocaleString('en-CA')}</div>
                </Card>
            </div>

            <Card title="General Ledger">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-100 bg-slate-50/50">
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Date</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Tenant</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Type</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Amount</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Balance</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {currentItems.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-slate-400 italic">No transactions found</td>
                                </tr>
                            ) : (
                                currentItems.map((tx) => (
                                    <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-600">{tx.date}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-sm font-bold text-slate-900">{tx.tenant}</span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2.5 py-1 rounded text-[10px] font-black uppercase ${['Payment', 'LIABILITY DEDUCTION'].includes(tx.type) ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'
                                                }`}>
                                                {tx.type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`text-sm font-black ${['Payment', 'LIABILITY DEDUCTION'].includes(tx.type) ? 'text-emerald-600' : 'text-slate-900'}`}>
                                                {tx.amount < 0 ? '-' : ''}${Math.abs(tx.amount).toLocaleString('en-CA')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-bold text-slate-900 font-mono">${tx.balance.toLocaleString('en-CA')}</td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${tx.status === 'Unpaid' ? 'bg-red-50 text-red-700 border-red-100' :
                                                tx.status === 'Partial' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                                    'bg-emerald-50 text-emerald-700 border-emerald-100'
                                                }`}>
                                                {tx.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-white rounded-b-xl">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                        Page {currentPage} of {totalPages || 1}
                    </p>
                    <div className="flex gap-1.5">
                        {Array.from({ length: totalPages || 1 }, (_, i) => i + 1).map((page) => (
                            <button
                                key={page}
                                onClick={() => setCurrentPage(page)}
                                className={`w-8 h-8 rounded-lg text-xs font-black transition-all border ${currentPage === page
                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                    : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-500 hover:text-indigo-600'
                                    }`}
                            >
                                {page}
                            </button>
                        ))}
                    </div>
                </div>
            </Card>

            {selectedInvoice && (
                <PaymentModal
                    invoice={selectedInvoice}
                    onClose={() => setSelectedInvoice(null)}
                    onSubmit={(data) => {
                        console.log('Processing payment:', data);
                        // In real world, call API to record payment
                        setSelectedInvoice(null);
                    }}
                />
            )}
        </DashboardLayout>
    );
};
