import React from 'react';
import { OwnerLayout } from '../../layouts/owner/OwnerLayout';
import {
    Building2,
    Users,
    TrendingUp,
    CircleDollarSign,
    AlertCircle,
    ArrowUpRight,
    ArrowDownRight,
    CheckCircle2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';

export const OwnerDashboard = () => {
    const navigate = useNavigate();
    const [stats, setStats] = React.useState([]);
    const [tenants, setTenants] = React.useState([]);
    const [recentFinancials, setRecentFinancials] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [insuranceExpiryCount, setInsuranceExpiryCount] = React.useState(0);
    const [recentActivity, setRecentActivity] = React.useState([]);
    const [ownerName, setOwnerName] = React.useState('Owner');

    React.useEffect(() => {
        const fetchData = async () => {
            try {
                const [statsRes, finRes, profileRes] = await Promise.all([
                    api.get('/api/owner/dashboard/stats'),
                    api.get('/api/owner/dashboard/financial-pulse'),
                    api.get('/api/owner/profile')
                ]);

                const data = statsRes.data;
                const financials = finRes.data;
                if (profileRes.data && profileRes.data.name) {
                    setOwnerName(profileRes.data.name);
                }

                // 1. Map Stats
                setStats([
                    {
                        label: 'Total Properties',
                        value: data.propertyCount?.toString() || '0',
                        icon: Building2,
                        color: 'text-indigo-600',
                        bg: 'bg-indigo-50',
                        trend: 'Active Portfolio',
                        trendUp: data.propertyCount > 0
                    },
                    {
                        label: 'Total Units',
                        value: data.unitCount?.toString() || '0',
                        icon: Building2,
                        color: 'text-blue-600',
                        bg: 'bg-blue-50',
                        trend: 'Registered',
                        trendUp: null
                    },
                    {
                        label: 'Vacant Units',
                        value: data.occupancy?.vacantUnits?.toString() || '0',
                        icon: Building2,
                        color: 'text-amber-600',
                        bg: 'bg-amber-50',
                        trend: 'Full units available',
                        trendUp: null,
                        details: data.occupancy?.vacantUnitsList || []
                    },
                    {
                        label: 'Vacant Bedrooms',
                        value: data.occupancy?.vacantBedrooms?.toString() || '0',
                        icon: Users,
                        color: 'text-orange-600',
                        bg: 'bg-orange-50',
                        trend: 'Room-wise vacancies',
                        trendUp: null,
                        details: data.occupancy?.vacantBedroomsList || []
                    },
                    /* Occupancy Rate removed as requested */
                    /* Monthly Revenue removed as requested */
                    {
                        label: 'Outstanding Dues',
                        value: `$ ${data.outstandingDues ? data.outstandingDues.toLocaleString('en-CA') : '0'}`,
                        icon: AlertCircle,
                        color: 'text-rose-600',
                        bg: 'bg-rose-50',
                        trend: 'Rent to be collected',
                        trendUp: data.outstandingDues === 0
                    },
                ]);

                setInsuranceExpiryCount(data.insuranceExpiryCount || 0);
                setRecentActivity(data.recentActivity || []);
                setTenants(data.tenants || []);

                // Sort financials chronologically (oldest to newest)
                if (financials && Array.isArray(financials)) {
                    const sortedFinancials = [...financials].sort((a, b) => {
                        const dateA = new Date(a.month);
                        const dateB = new Date(b.month);
                        return dateA - dateB;
                    });
                    setRecentFinancials(sortedFinancials);
                } else {
                    setRecentFinancials(financials);
                }

            } catch (error) {
                console.error("Failed to fetch owner dashboard data", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) {
        return (
            <OwnerLayout title="Portfolio Overview">
                <div className="flex items-center justify-center h-screen">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                </div>
            </OwnerLayout>
        );
    }

    return (
        <OwnerLayout title="Portfolio Overview">
            <div className="space-y-8 pb-12">
                {/* Welcome Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                    <div>
                        <h3 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">Welcome back, {ownerName}</h3>
                        <p className="text-slate-500 font-medium mt-1 text-sm md:text-base">Here is the update on your property portfolio performance.</p>
                    </div>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                    {stats.map((stat, idx) => (
                        <div key={idx} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm shadow-slate-200/50 hover:shadow-xl hover:shadow-indigo-100/50 hover:-translate-y-1 transition-all duration-300 group overflow-hidden relative min-h-[160px]">
                            <div className="relative z-10 flex flex-col h-full">
                                <div className="flex justify-between items-start">
                                    <div className={`w-12 h-12 ${stat.bg} ${stat.color} rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110 duration-500`}>
                                        <stat.icon size={24} />
                                    </div>
                                    {stat.details && stat.details.length > 0 && (
                                        <div className="group/nested relative">
                                            <span className="text-[10px] font-black text-slate-300 border border-slate-200 px-2 py-0.5 rounded-full cursor-help hover:bg-slate-50 hover:text-indigo-600 transition-colors">LIST</span>
                                            <div className="absolute top-0 right-full mr-2 w-48 bg-slate-900 text-white text-[10px] p-3 rounded-2xl opacity-0 invisible group-hover/nested:opacity-100 group-hover/nested:visible transition-all duration-300 z-50 shadow-2xl">
                                                <p className="font-black text-slate-400 uppercase tracking-widest mb-2 border-b border-white/10 pb-1">Vacant Details</p>
                                                <ul className="space-y-1 max-h-40 overflow-y-auto custom-scrollbar">
                                                    {stat.details.map((item, i) => (
                                                        <li key={i} className="font-bold border-l-2 border-indigo-500 pl-2">{item}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-2">{stat.label}</p>
                                <h4 className="text-2xl font-bold text-slate-900 tracking-tight mb-2 leading-none">{stat.value}</h4>
                                <div className="mt-auto pt-4 border-t border-slate-50">
                                    <div className="flex items-center gap-1">
                                        {stat.trendUp === true && <ArrowUpRight size={14} className="text-emerald-500" />}
                                        {stat.trendUp === false && <ArrowDownRight size={14} className="text-rose-500" />}
                                        <span className={`text-[10px] font-semibold ${stat.trendUp === true ? 'text-emerald-600' : stat.trendUp === false ? 'text-rose-600' : 'text-slate-500'}`}>
                                            {stat.trend}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            {/* Decorative Background Icon */}
                            <stat.icon size={120} className={`absolute -right-8 -bottom-8 opacity-[0.03] ${stat.color} group-hover:scale-110 transition-transform duration-700`} />
                        </div>
                    ))}
                </div>

                {/* Secondary Content */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">
                        {/* Financial Pulse */}
                        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-4 md:p-8 space-y-6">
                            <div className="flex justify-between items-center">
                                <h4 className="text-lg md:text-xl font-bold text-slate-900 tracking-tight">Recent Financial Pulse</h4>
                                <button onClick={() => navigate('/owner/financials')} className="text-[10px] md:text-xs font-bold text-indigo-600 hover:underline decoration-2">View Full Financials</button>
                            </div>
                            <div className="overflow-x-auto bg-slate-50 rounded-2xl border border-slate-100 -mx-4 md:mx-0">
                                <table className="w-full text-left min-w-[500px]">
                                    <thead className="bg-slate-100/50">
                                        <tr>
                                            <th className="px-4 md:px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Month</th>
                                            <th className="px-4 md:px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Target</th>
                                            <th className="px-4 md:px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actual Collected</th>
                                            <th className="px-4 md:px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Remaining Dues</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {recentFinancials.map((row, idx) => (
                                            <tr key={idx} className="hover:bg-white transition-colors group">
                                                <td className="px-4 md:px-6 py-4 text-xs font-semibold text-slate-700">{row.month}</td>
                                                <td className="px-4 md:px-6 py-4 text-sm font-medium text-slate-400 text-right font-mono">${row.expected.toLocaleString('en-CA')}</td>
                                                <td className="px-4 md:px-6 py-4 text-sm font-bold text-slate-900 text-right font-mono">${row.collected.toLocaleString('en-CA')}</td>
                                                <td className="px-4 md:px-6 py-4 text-right">
                                                    <span className={`px-2 py-1 rounded-lg text-[10px] font-bold ${row.dues > 0 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                                        {row.dues > 0 ? `$${row.dues.toLocaleString('en-CA')}` : 'CLEAR'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Recent Tenants */}
                        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-4 md:p-8 space-y-6">
                            <div className="flex justify-between items-center">
                                <h4 className="text-lg md:text-xl font-bold text-slate-900 tracking-tight">Active Tenants</h4>
                                <button onClick={() => navigate('/owner/properties')} className="text-[10px] md:text-xs font-bold text-indigo-600 hover:underline decoration-2">View All Properties</button>
                            </div>
                            <div className="overflow-x-auto bg-slate-50 rounded-2xl border border-slate-100 -mx-4 md:mx-0">
                                <table className="w-full text-left min-w-[500px]">
                                    <thead className="bg-slate-100/50">
                                        <tr>
                                            <th className="px-4 md:px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tenant Name</th>
                                            <th className="px-4 md:px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Email</th>
                                            <th className="px-4 md:px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Property / Unit</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {tenants.map((tenant, idx) => (
                                            <tr key={idx} className="hover:bg-white transition-colors group">
                                                <td className="px-4 md:px-6 py-4 text-sm font-bold text-slate-700">{tenant.name}</td>
                                                <td className="px-4 md:px-6 py-4 text-xs font-medium text-slate-500">{tenant.email}</td>
                                                <td className="px-4 md:px-6 py-4 text-xs font-bold text-slate-600">
                                                    {tenant.property} <span className="text-slate-400 mx-1">•</span> Unit {tenant.unit}
                                                </td>
                                            </tr>
                                        ))}
                                        {tenants.length === 0 && (
                                            <tr>
                                                <td colSpan="3" className="px-4 py-8 text-center text-slate-400 text-sm font-medium italic">No recent tenants found.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Quick Access / Notice & Activity */}
                    <div className="space-y-6">
                        {insuranceExpiryCount > 0 && (
                            <div className="bg-indigo-600 rounded-3xl p-8 flex flex-col justify-between text-white shadow-2xl shadow-indigo-200 overflow-hidden relative group">
                                <div className="relative z-10 space-y-6">
                                    <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
                                        <AlertCircle size={24} />
                                    </div>
                                    <div className="space-y-2">
                                        <h4 className="text-xl font-black italic tracking-tight uppercase">Compliance Notice</h4>
                                        <p className="text-indigo-100 text-sm font-medium leading-relaxed">
                                            {insuranceExpiryCount} properties have insurance policies expiring.
                                        </p>
                                    </div>
                                </div>
                                <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:scale-125 transition-transform duration-700"></div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </OwnerLayout>
    );
};
