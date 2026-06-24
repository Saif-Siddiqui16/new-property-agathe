import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import {
    Calendar,
    Hammer,
    CheckCircle2,
    Clock,
    AlertTriangle,
    Filter,
    Search,
    MoreVertical,
    ChevronRight,
    Sparkles,
    CheckSquare,
    User,
    ArrowRight
} from 'lucide-react';
import { format } from 'date-fns';
import { MainLayout } from '../../layouts/MainLayout';



const UnitPrepDashboard = () => {
    const navigate = useNavigate();
    const [prepUnits, setPrepUnits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [buildingFilter, setBuildingFilter] = useState('All');
    const [stats, setStats] = useState({
        upcomingMoveOuts: 0,
        confirmedMoveOuts: 0,
        inspectionsScheduled: 0,
        inRepair: 0,
        readyForCompletion: 0,
        unitsReady: 0
    });

    useEffect(() => {
        fetchPrepUnits();
    }, []);

    const fetchPrepUnits = async () => {
        try {
            const res = await api.get('/api/admin/workflow/unit-prep');
            if (res.data.success) {
                setPrepUnits(res.data.data);
                if (res.data.stats) setStats(res.data.stats);
            }
        } catch (error) {
            console.error('Error fetching prep units:', error);
        } finally {
            setLoading(false);
        }
    };

    const updateStage = async (unitId, nextStage) => {
        try {
            const res = await api.put(`/api/admin/workflow/unit-prep/${unitId}/stage`,
                { nextStage }
            );
            if (res.data.success) {
                fetchPrepUnits();
            }
        } catch (error) {
            alert(error.response?.data?.message || 'Error updating stage');
        }
    };

    const calculateStats = (data) => {
        const s = { pending: 0, readyCleaning: 0, cleaningInProgress: 0, cleaningCompleted: 0, unitReady: 0 };
        data.forEach(item => {
            if (item.current_stage === 'PENDING_TICKETS') s.pending++;
            if (item.current_stage === 'READY_FOR_CLEANING') s.readyCleaning++;
            if (item.current_stage === 'CLEANING_IN_PROGRESS') s.cleaningInProgress++;
            if (item.current_stage === 'CLEANING_COMPLETED') s.cleaningCompleted++;
            if (item.current_stage === 'UNIT_READY') s.unitReady++;
        });
        setStats(s);
    };

    const handleExport = async () => {
        try {
            const res = await api.get('/api/admin/workflow/unit-prep/export', { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `unit-prep-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            alert('Failed to export PDF: ' + error.message);
        }
    };

    const Column = ({ title, icon: Icon, color, count, items, subtitle, badgeColor }) => (
        <div className="flex-1 min-w-[320px] bg-gray-50/50 rounded-3xl p-4 flex flex-col gap-4">
            <div className="flex items-center justify-between px-1">
                <div>
                    <h3 className="font-black text-gray-900 text-sm leading-tight tracking-tight">{title}</h3>
                    <p className="text-[10px] font-bold text-gray-400 max-w-[200px] leading-tight">{subtitle}</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-[10px] font-black ${badgeColor} shadow-sm border border-white/20`}>
                    {count}
                </span>
            </div>

            <div className="flex flex-col gap-3 overflow-y-auto max-h-[calc(100vh-320px)] pr-1 scrollbar-thin scrollbar-thumb-gray-200">
                {items.map(item => (
                    <Card key={item.id} item={item} columnTitle={title} />
                ))}
            </div>
        </div>
    );

    const Card = ({ item, columnTitle }) => (
        <div className="bg-white p-5 rounded-2xl shadow-md border border-gray-100 hover:shadow-lg transition-all group relative flex flex-col gap-4 mb-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                    <span className="bg-amber-50 text-amber-600 text-[9px] font-black px-2 py-0.5 rounded-full uppercase border border-amber-100">Priority</span>
                    <span className="bg-red-50 text-red-500 text-[9px] font-black px-2 py-0.5 rounded-full uppercase border border-red-100">Prioritized</span>
                </div>
                <MoreVertical size={16} className="text-gray-400" />
            </div>

            <div className="py-1">
                <h4 className="font-black text-indigo-600 text-xl leading-tight tracking-tighter">
                    {item.name || item.unitNumber || `Unit #${item.id}`}
                </h4>
                <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500">
                    <span>{item.unitType || 'Unit'}</span>
                    <span className="text-gray-300">•</span>
                    <span>
                        {item.leases?.[0]?.tenant?.name ||
                            item.moveOuts?.[0]?.lease?.tenant?.name ||
                            'Vacant'}
                    </span>
                </div>
            </div>

            <div className="bg-gray-50/50 p-2.5 rounded-xl border border-gray-50">
                <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Repair Status</span>
                    <span className={`text-[10px] font-black uppercase ${item.hasRequiredTickets ? 'text-red-500' : 'text-green-600'}`}>
                        {item.hasRequiredTickets ? `${item.requiredTicketsCount} Blocking` : 'No Blocks'}
                    </span>
                </div>
                {item.tentative_move_in_date && (
                    <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        <span className="text-[11px] font-bold text-gray-600">
                            Move-in: {format(new Date(item.tentative_move_in_date), 'MMM dd')}
                        </span>
                    </div>
                )}
            </div>

            <button
                onClick={() => {
                    const stages = ['PENDING_TICKETS', 'READY_FOR_CLEANING', 'CLEANING_IN_PROGRESS', 'CLEANING_COMPLETED', 'UNIT_READY'];
                    const currentIndex = stages.indexOf(item.current_stage);
                    if (currentIndex < stages.length - 1) {
                        updateStage(item.id, stages[currentIndex + 1]);
                    }
                }}
                className={`w-full py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all shadow-sm flex items-center justify-center gap-2
                ${item.hasRequiredTickets ? 'bg-gray-100 text-gray-400 cursor-not-allowed' :
                        columnTitle.includes('Deficiencies') ? 'bg-indigo-600 text-white hover:bg-indigo-700' :
                            columnTitle.includes('Ready for Cleaning') ? 'bg-amber-600 text-white hover:bg-amber-700' :
                                columnTitle.includes('Progress') ? 'bg-blue-600 text-white hover:bg-blue-700' :
                                    'bg-green-600 text-white hover:bg-green-700'}`}>
                {item.hasRequiredTickets ? 'Blocked by Tickets' :
                    item.current_stage === 'PENDING_TICKETS' ? 'Move to Cleaning' :
                        item.current_stage === 'READY_FOR_CLEANING' ? 'Start Cleaning' :
                            item.current_stage === 'CLEANING_IN_PROGRESS' ? 'Complete Cleaning' :
                                item.current_stage === 'CLEANING_COMPLETED' ? 'Mark Unit Ready' : 'Unit Ready'}
                <ArrowRight size={14} />
            </button>
        </div>
    );

    const StatCard = ({ icon: Icon, label, sublabel, value, color, bg }) => (
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex items-start gap-4 hover:shadow-xl transition-all cursor-pointer group">
            <div className={`p-4 rounded-2xl ${bg} ${color} group-hover:scale-110 transition-transform shadow-sm`}>
                <Icon size={24} />
            </div>
            <div className="flex flex-col">
                <span className="text-2xl font-black text-gray-900 leading-none mb-1">{value}</span>
                <span className="text-[13px] font-black text-gray-900 leading-tight mb-0.5">{label}</span>
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">{sublabel}</span>
            </div>
        </div>
    );

    if (loading) return <div className="p-8 text-center text-gray-500 font-black">PREPARING DASHBOARD...</div>;

    return (
        <MainLayout title="Unit Preparation">
            <div className="p-0 bg-transparent min-h-screen">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 tracking-tighter">Unit Preparation Dashboard</h1>
                        <p className="text-gray-500 text-sm font-medium">Track units moving toward readiness • Follow your exact workflow</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleExport}
                            className="flex items-center gap-2 px-5 py-2.5 bg-gray-50 rounded-2xl text-sm font-black text-gray-700 hover:bg-gray-100 transition-colors border border-gray-100"
                        >
                            Export <ChevronRight size={18} className="rotate-90 text-gray-400" />
                        </button>
                        <button
                            onClick={() => navigate('/admin/workflow/inspections/new')}
                            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-2xl text-sm font-black hover:bg-indigo-700 shadow-xl shadow-indigo-200 transition-all active:scale-95"
                        >
                            <Sparkles size={18} />
                            Schedule Inspection
                        </button>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-6 gap-4 mb-10">
                    <StatCard icon={Calendar} label="Upcoming Move-Outs" sublabel="Next 30 Days" value={stats.upcomingMoveOuts} color="text-blue-600" bg="bg-blue-50" />
                    <StatCard icon={CheckSquare} label="Confirmed Move-Outs" sublabel="Next 30 Days" value={stats.confirmedMoveOuts} color="text-orange-600" bg="bg-orange-50" />
                    <StatCard icon={Sparkles} label="In Cleaning" sublabel="Awaiting Clean" value={stats.cleaningTotal || 0} color="text-purple-600" bg="bg-purple-50" />
                    <StatCard icon={Hammer} label="In Repair" sublabel="Maintenance active" value={stats.inRepair} color="text-red-600" bg="bg-red-50" />
                    <StatCard icon={CheckCircle2} label="Cleaning Done" sublabel="Awaiting Ready" value={stats.readyForCompletion} color="text-green-600" bg="bg-green-50" />
                    <StatCard icon={Sparkles} label="Units Ready" sublabel="Units Ready" value={stats.unitsReady} color="text-indigo-600" bg="bg-indigo-50" />
                </div>

                {/* Filters */}
                <div className="flex items-center gap-4 mb-8">
                    <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-2xl border border-gray-100">
                        <Filter size={16} className="text-gray-400" />
                        <select
                            value={buildingFilter}
                            onChange={(e) => setBuildingFilter(e.target.value)}
                            className="bg-transparent text-xs font-black text-gray-700 outline-none border-none uppercase tracking-wider"
                        >
                            <option value="All">All Buildings</option>
                            {[...new Set(prepUnits.map(u => u.property?.name).filter(Boolean))].map(b => (
                                <option key={b} value={b}>{b}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex-1 relative ml-4">
                        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search unit number or tenant..."
                            className="w-full pl-12 pr-6 py-3 bg-gray-50 border border-gray-100 rounded-3xl text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-inner"
                        />
                    </div>
                </div>

                {/* Kanban Columns */}
                {(() => {
                    const filtered = prepUnits.filter(u => {
                        const nameToSearch = (u.name || u.unitNumber || '').toLowerCase();
                        const tenantToSearch = (u.leases?.[0]?.tenant?.name || u.moveOuts?.[0]?.lease?.tenant?.name || '').toLowerCase();
                        const matchesSearch = nameToSearch.includes(searchTerm.toLowerCase()) ||
                            tenantToSearch.includes(searchTerm.toLowerCase());
                        const matchesBuilding = buildingFilter === 'All' || u.property?.name === buildingFilter;
                        return matchesSearch && matchesBuilding;
                    });

                    return (
                        <div className="flex gap-6 overflow-x-auto pb-6 h-[calc(100vh-380px)] scrollbar-thin scrollbar-thumb-gray-200">
                            <Column
                                title="Maintenance Required"
                                subtitle="Blocked: Fix required tickets first"
                                icon={AlertTriangle}
                                badgeColor="bg-red-500 text-white"
                                count={filtered.filter(p => p.current_stage === 'PENDING_TICKETS').length}
                                items={filtered.filter(p => p.current_stage === 'PENDING_TICKETS')}
                            />
                            <Column
                                title="Ready for Cleaning"
                                subtitle="Maintenance clear: start cleaning"
                                icon={Sparkles}
                                badgeColor="bg-amber-500 text-white"
                                count={filtered.filter(p => p.current_stage === 'READY_FOR_CLEANING').length}
                                items={filtered.filter(p => p.current_stage === 'READY_FOR_CLEANING')}
                            />
                            <Column
                                title="Cleaning In Progress"
                                subtitle="Team is currently cleaning"
                                icon={Hammer}
                                badgeColor="bg-blue-500 text-white"
                                count={filtered.filter(p => p.current_stage === 'CLEANING_IN_PROGRESS').length}
                                items={filtered.filter(p => p.current_stage === 'CLEANING_IN_PROGRESS')}
                            />
                            <Column
                                title="Cleaning Completed"
                                subtitle="Awaiting final readiness check"
                                icon={CheckSquare}
                                badgeColor="bg-green-500 text-white"
                                count={filtered.filter(p => p.current_stage === 'CLEANING_COMPLETED').length}
                                items={filtered.filter(p => p.current_stage === 'CLEANING_COMPLETED')}
                            />
                            <Column
                                title="Unit Ready"
                                subtitle="100% Ready for new move-in"
                                icon={CheckCircle2}
                                badgeColor="bg-indigo-500 text-white"
                                count={filtered.filter(p => p.current_stage === 'UNIT_READY').length}
                                items={filtered.filter(p => p.current_stage === 'UNIT_READY')}
                            />
                        </div>
                    );
                })()}
            </div>
        </MainLayout>
    );
};

export default UnitPrepDashboard;
