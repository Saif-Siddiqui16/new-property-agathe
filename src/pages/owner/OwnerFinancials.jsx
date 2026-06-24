import React from 'react';
import { OwnerLayout } from '../../layouts/owner/OwnerLayout';
import {
    Download,
    CircleDollarSign,
    ArrowUpRight,
    ArrowDownRight,
    Search,
    Clock,
    CheckCircle2,
    FileText
} from 'lucide-react';
import { Button } from '../../components/Button';
import api from '../../api/client';

export const OwnerFinancials = () => {
    const [financialStats, setFinancialStats] = React.useState([
        { label: 'Rent Collected (MTD)', value: '$ 0', icon: CircleDollarSign, color: 'text-emerald-600' },
        { label: 'Outstanding Dues', value: '$ 0', icon: Clock, color: 'text-rose-600' },
        { label: 'Net Earnings (MTD)', value: '$ 0', icon: CheckCircle2, color: 'text-violet-600' },
        { label: 'Security Deposits', value: '$ 0', icon: FileText, color: 'text-blue-600' },
    ]);
    const [transactions, setTransactions] = React.useState([]);

    React.useEffect(() => {
        const fetchFin = async () => {
            try {
                const res = await api.get('/api/owner/financials');
                const { collected, outstandingDues, securityDepositsHeld, netEarnings, transactions: txns } = res.data;

                setFinancialStats([
                    { label: 'Rent Collected (MTD)', value: `$ ${collected.toLocaleString('en-CA')}`, icon: CircleDollarSign, color: 'text-emerald-600' },
                    { label: 'Outstanding Dues', value: `$ ${outstandingDues.toLocaleString('en-CA')}`, icon: Clock, color: 'text-rose-600' },
                    { label: 'Net Earnings (MTD)', value: `$ ${netEarnings.toLocaleString('en-CA')}`, icon: CheckCircle2, color: 'text-violet-600' },
                    { label: 'Security Deposits', value: `$ ${securityDepositsHeld.toLocaleString('en-CA')}`, icon: FileText, color: 'text-blue-600' },
                ]);
                setTransactions(txns);
            } catch (e) {
                console.error(e);
            }
        };
        fetchFin();
    }, []);

    const handleDownload = async (id, invoiceNo) => {
        try {
            const token = localStorage.getItem('accessToken');
            const downloadUrl = `${api.defaults.baseURL}/api/owner/invoices/${id}/download?token=${token}`;
            window.open(downloadUrl, '_blank');
        } catch (error) {
            console.error("Download failed:", error);
            alert("Failed to download invoice. Please try again.");
        }
    };

    return (
        <OwnerLayout title="Financial Summary">
            <div className="space-y-8 pb-12">
                {/* Header Action */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6">
                    <div>
                        <h3 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight italic uppercase">Revenue Streams</h3>
                        <p className="text-slate-500 font-medium mt-1 text-sm">Real-time tracking of your portfolio's financial health.</p>
                    </div>
                    {/* <Button variant="secondary" className="w-full sm:w-auto gap-2 h-12 rounded-2xl font-black text-[10px] md:text-xs uppercase tracking-widest border-2">
                        <Download size={18} />
                        Download YTD Statement
                    </Button> */}
                </div>

                {/* Financial KPIs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                    {financialStats.map((stat, idx) => (
                        <div key={idx} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm border-b-4 border-b-slate-50 hover:border-b-indigo-500 transition-all duration-300">
                            <div className="flex items-center justify-between mb-4">
                                <div className={`w-10 h-10 rounded-xl bg-slate-50 ${stat.color} flex items-center justify-center`}>
                                    <stat.icon size={20} />
                                </div>
                                {/* Trend removed */}
                            </div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
                            <h4 className="text-xl font-black text-slate-800 tracking-tight italic">{stat.value}</h4>
                        </div>
                    ))}
                </div>

                {/* Recent Transactions Table */}
                <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                    <div className="p-4 md:p-8 border-b border-slate-50 flex flex-col md:flex-row justify-between md:items-center bg-slate-50/30 gap-4">
                        <div className="flex items-center gap-3">
                            <h4 className="text-base md:text-lg font-black text-slate-800 tracking-tight italic uppercase">Ledger Activity</h4>
                            <span className="px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-600 text-[9px] font-black uppercase tracking-widest border border-indigo-100 italic">{
                                new Date().toLocaleString('default', { month: 'long', year: 'numeric' })
                            }</span>
                        </div>
                        <div className="flex items-center gap-4 bg-white border border-slate-100 px-4 py-2 rounded-xl text-slate-400 w-full md:w-64 group">
                            <Search size={14} className="group-focus-within:text-indigo-600 transition-colors" />
                            <input
                                type="text"
                                placeholder="Search ledger..."
                                className="bg-transparent border-none outline-none text-[10px] font-bold text-slate-600 w-full placeholder:text-slate-300"
                                disabled
                            />
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left min-w-[800px]">
                            <thead className="bg-slate-50/50">
                                <tr>
                                    {/* Transaction ID Removed */}
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Property</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Amount</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {transactions.map((txn, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                                        {/* Transaction ID Removed */}
                                        <td className="px-8 py-5 text-sm font-black text-slate-700 italic">{txn.property}</td>
                                        <td className="px-8 py-5 text-xs font-bold text-slate-400">{txn.date}</td>
                                        <td className="px-8 py-5 text-xs font-black text-slate-500 uppercase tracking-widest">{txn.type}</td>
                                        <td className="px-8 py-5 text-sm font-black text-slate-800 text-right italic font-mono">${txn.amount.toLocaleString('en-CA')}</td>
                                        <td className="px-8 py-5 text-center">
                                            <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${txn.status === 'Paid'
                                                ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                                : 'bg-amber-50 text-amber-600 border-amber-100 animate-pulse'
                                                }`}>
                                                {txn.status}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5 text-center">
                                            <button
                                                onClick={() => handleDownload(txn.id, txn.id)} // Passing ID as invoice number filler for now as standard ID was used in listing
                                                className="p-2 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all">
                                                <FileText size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="p-6 bg-slate-50/30 border-t border-slate-50 flex justify-center">
                        <button className="text-[10px] font-black text-slate-400 hover:text-indigo-600 uppercase tracking-[0.2em] transition-all">Load Historical Archives</button>
                    </div>
                </div>
            </div>
        </OwnerLayout>
    );
};
