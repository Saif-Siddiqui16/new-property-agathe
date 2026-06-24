import React from 'react';
import { TenantLayout } from '../../layouts/TenantLayout';
import { CreditCard, FileText, Wrench, ShieldCheck, ArrowRight, AlertCircle, Car } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../api/client';

// ... dashboard cards defined in state below

export const TenantDashboard = () => {
    const [name, setName] = React.useState('Tenant');
    const [recentTickets, setRecentTickets] = React.useState([]);
    const [unreadCount, setUnreadCount] = React.useState(0);
    const [nextDue, setNextDue] = React.useState('');
    const [dashboardCards, setDashboardCards] = React.useState([
        { title: 'Current Rent', value: 'Loading...', subValue: '-', icon: CreditCard, color: 'bg-blue-500', path: '/tenant/invoices' },
        { title: 'Lease Status', value: 'Loading...', subValue: '-', icon: FileText, color: 'bg-emerald-500', path: '/tenant/lease' },
        { title: 'Maintenance', value: '0 Open', subValue: 'Check Tickets', icon: Wrench, color: 'bg-amber-500', path: '/tenant/tickets' },
        { title: 'Insurance', value: '...', subValue: '-', icon: ShieldCheck, color: 'bg-purple-500', path: '/tenant/insurance' },
        { title: 'My Vehicles', value: '0', subValue: 'Registered', icon: Car, color: 'bg-indigo-500', path: '/tenant/vehicles' }
    ]);

    React.useEffect(() => {
        const fetchDashboard = async () => {
            try {
                const res = await api.get('/api/tenant/dashboard');
                const { tenantName, stats } = res.data;

                setName(tenantName || 'Tenant');
                setRecentTickets(stats.recentTickets || []);
                setUnreadCount(stats.unreadCount || 0);

                if (stats.nextDueDate) {
                    const d = new Date(stats.nextDueDate);
                    setNextDue(`Your next rent payment is due on ${d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })}.`);
                } else {
                    setNextDue('No upcoming rent payments due.');
                }

                setDashboardCards([
                    {
                        title: 'Current Rent',
                        value: stats.currentRent > 0 ? `$${stats.currentRent.toLocaleString('en-CA')}` : '$0.00',
                        subValue: stats.rentDueStatus,
                        icon: CreditCard,
                        color: 'bg-blue-500',
                        path: '/tenant/invoices'
                    },
                    {
                        title: 'Lease Status',
                        value: stats.leaseStatus,
                        subValue: stats.leaseExpiry ? `Ends ${new Date(stats.leaseExpiry).toLocaleDateString()}` : 'N/A',
                        icon: FileText,
                        color: 'bg-emerald-500',
                        path: '/tenant/lease'
                    },
                    {
                        title: 'Maintenance',
                        value: `${stats.openTickets} Open`,
                        subValue: 'Check Tickets',
                        icon: Wrench,
                        color: 'bg-amber-500',
                        path: '/tenant/tickets'
                    },
                    {
                        title: 'Insurance',
                        value: stats.insuranceStatus,
                        subValue: stats.insuranceStatus === 'Expiring Soon' ? 'Update Required' : 'Compliance Status',
                        icon: ShieldCheck,
                        color: stats.insuranceStatus === 'Expiring Soon' ? 'bg-amber-500' : (stats.insuranceStatus === 'Compliant' ? 'bg-emerald-500' : 'bg-red-500'),
                        path: '/tenant/insurance'
                    },
                    {
                        title: 'My Vehicles',
                        value: `${stats.vehicleCount || 0} Registered`,
                        subValue: stats.unauthorizedVehicles > 0 ? `${stats.unauthorizedVehicles} Unauthorized` : 'Status: OK',
                        icon: Car,
                        color: 'bg-indigo-500',
                        path: '/tenant/vehicles'
                    }
                ]);
            } catch (e) {
                console.error(e);
            }
        };
        fetchDashboard();
    }, []);

    return (
        <TenantLayout title="Dashboard">
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

                {/* WELCOME BANNER */}
                <section className="bg-indigo-600 rounded-3xl p-8 text-white relative overflow-hidden shadow-xl shadow-indigo-100">
                    <div className="relative z-10 space-y-2">
                        <h2 className="text-3xl font-bold">Good morning, {name}! 👋</h2>
                        <p className="text-indigo-100 font-medium text-lg">{nextDue}</p>
                        <div className="pt-4">
                            <Link to="/tenant/payments" className="inline-flex items-center gap-2 bg-white text-indigo-600 px-6 py-3 rounded-xl font-bold hover:bg-indigo-50 transition-all shadow-lg hover:translate-y-[-2px] active:scale-95">
                                Pay Rent Now
                                <ArrowRight size={20} />
                            </Link>
                        </div>
                    </div>
                    {/* Abstract background shapes */}
                    <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-indigo-500 rounded-full blur-3xl opacity-50"></div>
                    <div className="absolute bottom-[-20%] left-[-5%] w-48 h-48 bg-indigo-400 rounded-full blur-2xl opacity-30"></div>
                </section>

                {/* STAT CARDS */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                    {dashboardCards.map((card, idx) => (
                        <Link
                            key={idx}
                            to={card.path}
                            className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group active:scale-[0.98]"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className={`w-12 h-12 ${card.color} rounded-xl flex items-center justify-center text-white shadow-lg`}>
                                    <card.icon size={24} />
                                </div>
                                <ArrowRight size={18} className="text-slate-300 group-hover:text-primary transition-colors" />
                            </div>
                            <h4 className="text-slate-500 font-bold text-sm uppercase tracking-wider">{card.title}</h4>
                            <div className="mt-1 space-y-1">
                                <p className="text-2xl font-black text-slate-800 tracking-tight">{card.value}</p>
                                <p className="text-sm font-medium text-slate-400">{card.subValue}</p>
                            </div>
                        </Link>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* NOTIFICATIONS */}
                    <section className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden h-fit">
                        <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                            <h3 className="font-black text-slate-800 text-lg">Notifications</h3>
                            <Link to="/tenant/communication" className="text-xs font-bold text-primary hover:underline">View All</Link>
                        </div>
                        <div className="divide-y divide-slate-50">
                            {unreadCount > 0 ? (
                                <div className="p-8 flex flex-col items-center justify-center text-center space-y-3">
                                    <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center animate-bounce">
                                        <AlertCircle size={32} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-800 text-lg">You have {unreadCount} new message{unreadCount > 1 ? 's' : ''}!</h4>
                                        <p className="text-sm text-slate-500 font-medium">Please check your inbox to read messages from the management.</p>
                                    </div>
                                    <Link to="/tenant/communication" className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-indigo-700 transition-all active:scale-95 shadow-lg shadow-indigo-100">
                                        Open Inbox
                                    </Link>
                                </div>
                            ) : (
                                <div className="p-12 flex flex-col items-center justify-center text-center space-y-3 opacity-60">
                                    <ShieldCheck size={48} className="text-slate-300" />
                                    <p className="text-slate-500 font-bold">You are all caught up!</p>
                                    <p className="text-xs text-slate-400">No new unread messages from admin.</p>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* RECENT TICKETS */}
                    <section className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden h-fit">
                        <div className="p-6 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
                            <h3 className="font-black text-slate-800 text-lg">Recent Tickets</h3>
                            <Link to="/tenant/tickets" className="text-xs font-bold text-primary hover:underline">View All</Link>
                        </div>
                        <div className="p-2 space-y-1">
                            {recentTickets.length > 0 ? (
                                recentTickets.map((t, idx) => (
                                    <Link key={idx} to="/tenant/tickets" className="block p-4 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100 cursor-pointer">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.id}</p>
                                        <h4 className="font-bold text-slate-700 truncate">{t.title}</h4>
                                        <div className="mt-2 flex items-center gap-1.5">
                                            <div className={`w-1.5 h-1.5 rounded-full ${t.status === 'Resolved' ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
                                            <span className={`text-[11px] font-bold uppercase tracking-tight ${t.status === 'Resolved' ? 'text-emerald-600' : 'text-amber-600'}`}>{t.status}</span>
                                        </div>
                                    </Link>
                                ))
                            ) : (
                                <div className="p-8 text-center text-slate-400 italic text-sm">
                                    No maintenance tickets found.
                                </div>
                            )}
                        </div>
                    </section>
                </div>
            </div>
        </TenantLayout>
    );
};
