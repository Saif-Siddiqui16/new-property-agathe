import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TenantLayout } from '../../layouts/TenantLayout';
import api from '../../api/client';
import {
    FileText,
    CreditCard,
    Download,
    RefreshCw,
    Receipt,
    FileBarChart,
    Calendar,
    Eye,
    ArrowLeft
} from 'lucide-react';
import { Button } from '../../components/Button';

const ICON_MAP = {
    payment_history: CreditCard,
    invoice_summary: Receipt
};
const COLOR_MAP = {
    payment_history: { color: 'text-emerald-600', bg: 'bg-emerald-50' },
    invoice_summary: { color: 'text-indigo-600', bg: 'bg-indigo-50' }
};

export const TenantReports = () => {
    const navigate = useNavigate();
    const [reports, setReports] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedReport, setSelectedReport] = useState(null);

    const fetchReports = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await api.get('/api/tenant/reports');
            const payload = res.data;
            const list = Array.isArray(payload?.reports) ? payload.reports : (Array.isArray(payload) ? payload : []);
            const mapped = list.map(r => ({
                ...r,
                id: r.id || r.type,
                icon: ICON_MAP[r.type] || FileBarChart,
                ...COLOR_MAP[r.type]
            }));
            setReports(mapped);
            setStats(payload?.stats || null);
        } catch (e) {
            console.error(e);
            setError(e.response?.data?.message || 'Failed to load reports.');
            setReports([]);
            setStats(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReports();
    }, []);

    const statsRows = stats
        ? [
            { label: 'Reports Available', value: stats.reportsViewable ?? '—', sub: stats.reportsViewableSub ?? '' },
            { label: 'Paid (Total)', value: stats.paidAmount != null ? `$${Number(stats.paidAmount).toLocaleString()}` : '—', sub: `${stats.paidCount ?? 0} payments` },
            { label: 'Outstanding', value: stats.outstandingAmount != null ? `$${Number(stats.outstandingAmount).toLocaleString()}` : '—', sub: stats.dataLatency ?? 'Real-time' }
        ]
        : [
            { label: 'Reports Available', value: '—', sub: '' },
            { label: 'Paid (Total)', value: '—', sub: '' },
            { label: 'Outstanding', value: '—', sub: '' }
        ];

    const renderReportTable = () => {
        if (!selectedReport) return null;

        const isPayment = selectedReport.type === 'payment_history';

        return (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between">
                    <button
                        onClick={() => setSelectedReport(null)}
                        className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-100 rounded-2xl text-slate-500 font-black uppercase tracking-widest text-[10px] hover:text-slate-800 hover:shadow-md transition-all group"
                    >
                        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                        Back to Reports
                    </button>
                </div>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h3 className="text-3xl font-black text-slate-800 tracking-tight uppercase italic">{selectedReport.title}</h3>
                        <p className="text-sm font-medium text-slate-500">{selectedReport.description}</p>
                    </div>
                </div>

                <div className="bg-white rounded-[32px] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-100">
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Date</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">{isPayment ? 'Invoice #' : 'Month'}</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">{isPayment ? 'Method' : 'Status'}</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {selectedReport.data?.map((row, i) => (
                                    <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-8 py-6">
                                            <p className="font-bold text-slate-700">{new Date(row.date).toLocaleDateString('en-CA')}</p>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400">
                                                    {isPayment ? <Receipt size={14} /> : <Calendar size={14} />}
                                                </div>
                                                <span className="font-black text-slate-600 uppercase tracking-tight">{isPayment ? row.invoiceNo : row.month}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            {isPayment ? (
                                                <span className="text-xs font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200/50">
                                                    {row.method}
                                                </span>
                                            ) : (
                                                <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border
                                                    ${row.status === 'Paid' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                        row.status === 'Partial' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                                            'bg-red-50 text-red-600 border-red-100'}`}>
                                                    {row.status}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <p className="text-lg font-black text-slate-800 tracking-tighter italic">
                                                ${row.amount?.toLocaleString()}
                                            </p>
                                            {!isPayment && row.balance > 0 && (
                                                <p className="text-[10px] font-bold text-red-500 uppercase tracking-tighter">Due: ${row.balance?.toLocaleString()}</p>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <TenantLayout title="My Reports">
            <div className="space-y-8 pb-12">
                {!selectedReport && (
                    <>
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                            <div>
                                <h3 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight italic uppercase">Account Reports</h3>
                                <p className="text-slate-500 font-medium mt-1 text-sm md:text-base">Your invoice and payment history at a glance.</p>
                            </div>
                            <Button variant="secondary" onClick={fetchReports} disabled={loading}>
                                <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                                Refresh
                            </Button>
                        </div>

                        {error && (
                            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {statsRows.map((s, i) => (
                                <div key={i} className="bg-white px-6 py-5 rounded-3xl border border-slate-100 shadow-xl shadow-slate-100/50">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{s.label}</p>
                                    <p className="text-2xl font-black text-slate-800 italic tracking-tight leading-none">{s.value}</p>
                                    <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-tighter mt-2">{s.sub}</p>
                                </div>
                            ))}
                        </div>

                        {loading ? (
                            <div className="flex items-center justify-center py-16">
                                <RefreshCw size={40} className="animate-spin text-slate-300" />
                            </div>
                        ) : reports.length === 0 ? (
                            <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center text-slate-500">
                                <FileText size={48} className="mx-auto mb-4 text-slate-300" />
                                <p className="font-medium">No reports available.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {reports.map((report, idx) => (
                                    <div key={report.id || idx} className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-xl shadow-slate-100/30 hover:shadow-2xl hover:-translate-y-1 transition-all group flex flex-col sm:flex-row gap-6">
                                        <div className={`w-16 h-16 shrink-0 rounded-2xl ${report.bg || 'bg-slate-50'} ${report.color || 'text-slate-600'} flex items-center justify-center mx-auto sm:mx-0 shadow-lg shadow-current/10`}>
                                            <report.icon size={32} />
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="text-xl font-black text-slate-800 uppercase tracking-tight italic">{report.title}</h4>
                                            <p className="text-sm text-slate-500 mt-2 font-medium leading-relaxed">{report.description}</p>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-6 bg-slate-50 inline-block px-3 py-1 rounded-full">Last Activity: {report.lastGenerated || '—'}</p>
                                            <div className="mt-6 flex gap-2">
                                                <Button
                                                    variant="primary"
                                                    className="w-full h-14 rounded-2xl font-black italic shadow-lg shadow-primary-500/20"
                                                    onClick={() => setSelectedReport(report)}
                                                >
                                                    <CreditCard size={18} className="mr-2" /> View Report
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}

                {selectedReport && renderReportTable()}

                <div className="bg-slate-900 rounded-[32px] p-8 text-white border border-slate-800 text-center relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/10 rounded-full blur-[100px] -mr-32 -mt-32"></div>
                    <p className="relative z-10 font-bold opacity-80">For detailed invoices and payment history, use <span className="text-primary-400">My Invoices</span> and <span className="text-primary-400">Pay Rent</span> from the menu.</p>
                </div>
            </div>
        </TenantLayout>
    );
};

