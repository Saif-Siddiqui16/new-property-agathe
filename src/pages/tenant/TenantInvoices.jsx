import React, { useState } from 'react';
import { TenantLayout } from '../../layouts/TenantLayout';
import { Download, Eye, FileText, CheckCircle2, Clock, X } from 'lucide-react';
import { Button } from '../../components/Button';
import api from '../../api/client';

const dummyInvoices = [
    { id: 'INV-001', month: 'January 2026', amount: '$1,200.00', status: 'Paid', date: '2026-01-01' },
    { id: 'INV-002', month: 'February 2026', amount: '$1,200.00', status: 'Due', date: '2026-02-01' },
    { id: 'INV-000', month: 'December 2025', amount: '$1,200.00', status: 'Paid', date: '2025-12-01' },
];

export const TenantInvoices = () => {
    const [invoices, setInvoices] = useState([]);
    const [viewingInvoice, setViewingInvoice] = useState(null);

    React.useEffect(() => {
        const fetchInvoices = async () => {
            try {
                const res = await api.get('/api/tenant/invoices');
                // Map backend data to UI expectations if needed, but we already formatted in controller
                // Note: Amount from backend is number, frontend expects formatted string or number.
                // Controller sends number. Let's format locally if desired or rely on usage.
                setInvoices(res.data.map(inv => ({
                    ...inv,
                    amount: `$${inv.amount.toLocaleString('en-CA', { minimumFractionDigits: 2 })}` 
                })));
            } catch (e) { console.error(e); }
        };
        fetchInvoices();
    }, []);

    return (
        <TenantLayout title="My Invoices">
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <section className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/20">
                        <h3 className="font-black text-slate-800 text-lg">Invoice History</h3>
                        <span className="text-sm font-bold text-slate-400">Showing {invoices.length} entries</span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-slate-50">
                                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Invoice ID</th>
                                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Month</th>
                                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Due Date</th>
                                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Amount</th>
                                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Status</th>
                                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {invoices.map((inv) => (
                                    <tr key={inv.id} className="hover:bg-slate-50 transition-colors group">
                                        <td className="px-6 py-5 font-bold text-slate-700">{inv.id}</td>
                                        <td className="px-6 py-5 font-bold text-slate-800">{inv.month}</td>
                                        <td className="px-6 py-5 text-sm font-medium text-slate-500">{inv.date}</td>
                                        <td className="px-6 py-5">
                                            <div className="flex flex-col">
                                                <span className="font-black text-slate-800">{inv.amount}</span>
                                                {inv.status === 'Partial' && (
                                                    <span className="text-[10px] text-amber-600 font-bold uppercase tracking-tighter">
                                                        Balance: ${inv.balanceDue?.toLocaleString('en-CA')}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-tight border ${inv.status === 'Paid'
                                                ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                                : 'bg-amber-50 text-amber-600 border-amber-100'
                                                }`}>
                                                {inv.status === 'Paid' ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                                                {inv.status}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            <div className="flex items-center justify-end gap-2 outline-none">
                                                <button
                                                    onClick={() => setViewingInvoice(inv)}
                                                    className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all"
                                                >
                                                    <Eye size={18} />
                                                </button>
                                                <button
                                                    onClick={async () => {
                                                        try {
                                                            const res = await api.get(`/api/tenant/invoices/${inv.dbId}/download`, { responseType: 'blob' });
                                                            const url = window.URL.createObjectURL(new Blob([res.data]));
                                                            const link = document.createElement('a');
                                                            link.href = url;
                                                            link.setAttribute('download', `invoice-${inv.id}.pdf`);
                                                            document.body.appendChild(link);
                                                            link.click();
                                                            link.remove();
                                                        } catch (e) { alert('Download failed'); }
                                                    }}
                                                    className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                                                >
                                                    <Download size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>

            {/* INVOICE MODAL */}
            {viewingInvoice && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300" onClick={() => setViewingInvoice(null)}>
                    <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
                        <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center">
                                    <FileText size={24} />
                                </div>
                                <div className="space-y-0.5">
                                    <h3 className="text-xl font-black text-slate-800">Invoice Details</h3>
                                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">{viewingInvoice.id}</p>
                                </div>
                            </div>
                            <button onClick={() => setViewingInvoice(null)} className="p-2 text-slate-400 hover:bg-slate-50 rounded-xl transition-all">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="p-8 space-y-8">
                            <div className="grid grid-cols-2 gap-8">
                                <div className="space-y-1">
                                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Billed To</p>
                                    <h4 className="font-bold text-slate-800 text-lg">{viewingInvoice.tenantName}</h4>
                                    <p className="text-sm text-slate-500 font-medium">{viewingInvoice.building} — {viewingInvoice.unit}</p>
                                </div>
                                <div className="space-y-1 text-right">
                                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Issued By</p>
                                    <h4 className="font-bold text-slate-800 text-lg">Property Management</h4>
                                    <p className="text-sm text-slate-500 font-medium">Administration</p>
                                </div>
                            </div>

                            <div className="rounded-2xl border border-slate-100 overflow-hidden">
                                <table className="w-full">
                                    <thead className="bg-slate-50 border-b border-slate-100">
                                        <tr>
                                            <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase text-left">Description</th>
                                            <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase text-right">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        <tr>
                                            <td className="px-6 py-4 font-bold text-slate-700">Monthly Rent - {viewingInvoice.month}</td>
                                            <td className="px-6 py-4 font-black text-slate-800 text-right">{viewingInvoice.amount}</td>
                                        </tr>
                                        <tr>
                                            <td className="px-6 py-4 font-bold text-slate-700">Service Charges</td>
                                            <td className="px-6 py-4 font-black text-slate-800 text-right">${viewingInvoice.serviceFees?.toLocaleString('en-CA', { minimumFractionDigits: 2 })}</td>
                                        </tr>
                                    </tbody>
                                    <tfoot className="bg-slate-50/50">
                                        <tr>
                                            <td className="px-6 py-4 font-black text-slate-800">Total Amount</td>
                                            <td className="px-6 py-4 font-black text-primary-600 text-lg text-right">{viewingInvoice.amount}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>

                            <div className="flex gap-4">
                                <Button
                                    variant="secondary"
                                    className="flex-1 rounded-2xl py-4 h-auto font-bold"
                                    onClick={async () => {
                                        try {
                                            const res = await api.get(`/api/tenant/invoices/${viewingInvoice.dbId}/download`, { responseType: 'blob' });
                                            const url = window.URL.createObjectURL(new Blob([res.data]));
                                            const link = document.createElement('a');
                                            link.href = url;
                                            link.setAttribute('download', `invoice-${viewingInvoice.id}.pdf`);
                                            document.body.appendChild(link);
                                            link.click();
                                            link.remove();
                                        } catch (e) { alert('Download failed'); }
                                    }}
                                >
                                    Download PDF
                                </Button>
                                {(viewingInvoice.status === 'Due' || viewingInvoice.status === 'Partial') && (
                                    <Button
                                        variant="primary"
                                        className="flex-1 rounded-2xl py-4 h-auto font-bold"
                                        onClick={() => window.location.href = '/tenant/payments'}
                                    >
                                        Pay Now
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </TenantLayout>
    );
};
