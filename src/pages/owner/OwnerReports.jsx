import React, { useState, useEffect } from 'react';
import { OwnerLayout } from '../../layouts/owner/OwnerLayout';
import {
    BarChart3,
    PieChart,
    Download,
    FileText,
    TrendingUp,
    Users,
    CircleDollarSign,
    ExternalLink,
    RefreshCw
} from 'lucide-react';
import { Button } from '../../components/Button';
import api from '../../api/client';

const ICON_MAP = {
    monthly_summary: BarChart3,
    annual_overview: CircleDollarSign,
    occupancy_stats: Users,
    tax_statement: FileText
};
const COLOR_MAP = {
    monthly_summary: { color: 'text-indigo-600', bg: 'bg-indigo-50' },
    annual_overview: { color: 'text-emerald-600', bg: 'bg-emerald-50' },
    occupancy_stats: { color: 'text-blue-600', bg: 'bg-blue-50' },
    tax_statement: { color: 'text-violet-600', bg: 'bg-violet-50' }
};

export const OwnerReports = () => {
    const [availableReports, setAvailableReports] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchReports = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await api.get('/api/owner/reports');
            const payload = res.data;
            const reports = Array.isArray(payload?.reports) ? payload.reports : (Array.isArray(payload) ? payload : []);
            const mapped = reports.map(r => ({
                ...r,
                id: r.id || r.type,
                icon: ICON_MAP[r.type] || FileText,
                ...COLOR_MAP[r.type]
            }));
            setAvailableReports(mapped);
            setStats(payload?.stats || null);
        } catch (e) {
            console.error(e);
            setError(e.response?.data?.message || 'Failed to load reports.');
            setAvailableReports([]);
            setStats(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReports();
    }, []);



    return (
        <OwnerLayout title="Performance Reports">
            <div className="space-y-8 pb-12">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                    <div>
                        <h3 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight italic uppercase">Portfolio Analytics</h3>
                        <p className="text-slate-500 font-medium mt-1 text-sm md:text-base">Export-ready reports generated from managed property data.</p>
                    </div>
                    <Button variant="secondary" onClick={fetchReports} disabled={loading}>
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                        Refresh
                    </Button>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <RefreshCw size={40} className="animate-spin text-slate-300" />
                    </div>
                ) : availableReports.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center text-slate-500">
                        <FileText size={48} className="mx-auto mb-4 text-slate-300" />
                        <p className="font-medium">No reports available.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-1 gap-6 md:gap-8">
                        {availableReports.map((report, idx) => (
                            <div key={report.id || idx} className="bg-white rounded-2xl md:rounded-2.5rem p-6 md:p-8 border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-indigo-100/50 transition-all duration-500 group flex flex-col sm:flex-row gap-6 md:gap-8">
                                <div className={`w-16 h-16 md:w-20 md:h-20 shrink-0 rounded-2xl ${report.bg || 'bg-slate-50'} ${report.color || 'text-slate-600'} flex items-center justify-center transition-transform group-hover:scale-110 duration-500 shadow-inner mx-auto sm:mx-0`}>
                                    <report.icon size={32} className="md:w-9 md:h-9" />
                                </div>
                                <div className="flex flex-col justify-between flex-1">
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-start">
                                            <h4 className="text-xl font-black text-slate-800 tracking-tight italic uppercase group-hover:text-indigo-600 transition-colors leading-tight">{report.title}</h4>
                                            <span className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest italic">
                                                <TrendingUp size={12} /> Active
                                            </span>
                                        </div>
                                        <p className="text-sm text-slate-500 font-medium leading-relaxed">{report.description}</p>
                                    </div>
                                    <div className="flex flex-col sm:flex-row items-center justify-between mt-6 md:mt-8 gap-4">
                                        <div className="flex flex-col gap-1">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Last Run: {report.lastGenerated || '—'}</p>
                                        </div>
                                        <div className="flex gap-2 w-full sm:w-auto items-center">
                                            {report.type === 'monthly_summary' && (
                                                <select
                                                    className="h-11 px-3 rounded-xl bg-slate-50 border-none text-xs font-bold text-slate-600 focus:ring-2 focus:ring-indigo-100 outline-none"
                                                    onClick={(e) => e.stopPropagation()}
                                                    defaultValue={new Date().getMonth()}
                                                    id={`month-select-${idx}`}
                                                >
                                                    {Array.from({ length: 12 }, (_, i) => (
                                                        <option key={i} value={i}>
                                                            {new Date(0, i).toLocaleString('default', { month: 'short' })}
                                                        </option>
                                                    ))}
                                                </select>
                                            )}

                                            {/* Year Selector for all reports to control reporting period header/data */}
                                            <select
                                                className="h-11 px-3 rounded-xl bg-slate-50 border-none text-xs font-bold text-slate-600 focus:ring-2 focus:ring-indigo-100 outline-none"
                                                onClick={(e) => e.stopPropagation()}
                                                defaultValue={new Date().getFullYear()}
                                                id={`year-select-${idx}`}
                                            >
                                                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                                                    <option key={year} value={year}>{year}</option>
                                                ))}
                                            </select>

                                            <Button
                                                variant="secondary"
                                                className="flex-[3] sm:flex-none gap-2 h-11 px-6 rounded-xl font-black text-[10px] uppercase tracking-widest border-2"
                                                onClick={async () => {
                                                    try {
                                                        const yearSelect = document.getElementById(`year-select-${idx}`);
                                                        const selectedYear = yearSelect ? yearSelect.value : new Date().getFullYear();

                                                        let query = `?year=${selectedYear}`;

                                                        if (report.type === 'monthly_summary') {
                                                            const monthSelect = document.getElementById(`month-select-${idx}`);
                                                            const selectedMonth = monthSelect ? parseInt(monthSelect.value) + 1 : new Date().getMonth() + 1;
                                                            query += `&month=${selectedMonth}`;
                                                        } else {
                                                            // For other reports, default to current month for headers if needed
                                                            query += `&month=${new Date().getMonth() + 1}`;
                                                        }

                                                        const token = localStorage.getItem('accessToken');
                                                        const downloadUrl = `${api.defaults.baseURL}/api/owner/reports/${report.id || report.type}/download${query}&token=${token}`;
                                                        window.open(downloadUrl, '_blank');
                                                    } catch (e) {
                                                        console.error(e);
                                                        alert('Report download failed.');
                                                    }
                                                }}
                                            >
                                                <Download size={16} /> Export
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </OwnerLayout>
    );
};
