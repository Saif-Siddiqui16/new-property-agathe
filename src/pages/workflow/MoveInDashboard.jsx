import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import {
    Calendar,
    Lock,
    CheckCircle2,
    AlertCircle,
    ArrowRight,
    Filter,
    Search,
    MoreVertical,
    Clock,
    FileCheck,
    Hammer,
    User,
    ChevronRight,
    Unlock,
    Trash2,
    XCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { MainLayout } from '../../layouts/MainLayout';

const MoveInDashboard = () => {
    const navigate = useNavigate();
    const [moveIns, setMoveIns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        upcoming: 0,
        blockedPrep: 0,
        blockedReq: 0,
        readyInspection: 0,
        completed: 0
    });

    useEffect(() => {
        fetchMoveIns();
    }, []);

    const fetchMoveIns = async () => {
        try {
            const res = await api.get('/api/admin/workflow/move-in');
            if (res.data.success) {
                setMoveIns(res.data.data);
                calculateStats(res.data.data);
            }
        } catch (error) {
            console.error('Error fetching move-ins:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOverride = async (id) => {
        const reason = window.prompt("Reason for admin override:");
        if (!reason) return;
        const missing = window.prompt("Missing items (comma separated):");

        try {
            const res = await api.post(`/api/admin/workflow/move-in/${id}/override`, {
                reason,
                missingItems: missing || ''
            });

            if (res.data.success) {
                alert('Override successful');
                fetchMoveIns();
            }
        } catch (error) {
            alert('Override failed: ' + (error.response?.data?.message || error.message));
        }
    };
    const calculateStats = (data) => {
        const s = { upcoming: 0, blockedPrep: 0, blockedReq: 0, readyInspection: 0, completed: 0 };
        data.forEach(item => {
            if (item.status === 'PENDING') s.upcoming++;
            if (item.status === 'BLOCKED_IN_PREPARATION' || item.status === 'BLOCKED_IN_CONSTRUCTION') s.blockedPrep++;
            if (item.status === 'REQUIREMENTS_PENDING') s.blockedReq++;
            if (item.status === 'READY_FOR_MOVE_IN') s.readyInspection++;
            if (item.status === 'INSPECTION_COMPLETED') s.completed++;
        });
        setStats(s);
    };

    const handleExport = async () => {
        try {
            const res = await api.get('/api/admin/workflow/move-in/export', { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `move-in-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            alert('Failed to export PDF: ' + error.message);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'BLOCKED_IN_PREPARATION':
            case 'BLOCKED_IN_CONSTRUCTION': return 'bg-red-50 text-red-600 border-red-100';
            case 'REQUIREMENTS_PENDING': return 'bg-orange-50 text-orange-600 border-orange-100';
            case 'READY_FOR_MOVE_IN': return 'bg-blue-50 text-blue-600 border-blue-100';
            case 'INSPECTION_COMPLETED': return 'bg-green-50 text-green-600 border-green-100';
            default: return 'bg-gray-50 text-gray-600 border-gray-100';
        }
    };

    const Column = ({ title, subtitle, icon: Icon, color, count, items }) => (
        <div className="flex-1 min-w-[280px] bg-gray-50/50 rounded-xl p-3 flex flex-col gap-3">
            <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg ${color}`}>
                        <Icon size={16} />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900 text-[13px] leading-tight">{title}</h3>
                        <p className="text-[10px] text-gray-500 font-medium">{subtitle}</p>
                    </div>
                </div>
                <span className="bg-white px-1.5 py-0.5 rounded-md text-[10px] font-black text-gray-400 border border-gray-100">
                    {count}
                </span>
            </div>

            <div className="flex flex-col gap-2 overflow-y-auto max-h-[calc(100vh-320px)] pr-1 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
                {items.map(item => (
                    <Card key={item.id} item={item} />
                ))}
            </div>
        </div>
    );

    const handleCompleteMoveIn = async (id) => {
        if (!window.confirm("Are you sure you want to finalize this move-in and mark the unit as OCCUPIED?")) return;
        try {
            setLoading(true);
            const res = await api.post(`/api/admin/workflow/move-in/${id}/approve`);
            if (res.data.success) {
                alert('Move-in completed successfully! Unit is now OCCUPIED.');
                fetchMoveIns();
            }
        } catch (error) {
            alert('Failed to complete move-in: ' + (error.response?.data?.message || error.message));
        } finally {
            setLoading(false);
        }
    };

    const handleCancelMoveIn = async (id) => {
        if (!window.confirm("Are you sure you want to cancel this move-in? This will remove it from the dashboard.")) return;
        try {
            const res = await api.put(`/api/admin/workflow/move-in/${id}/cancel`);
            if (res.data.success) {
                fetchMoveIns();
            }
        } catch (error) {
            alert('Failed to cancel move-in: ' + error.message);
        }
    };

    const handleToggleRequirement = async (moveInId, requirement, currentStatus) => {
        try {
            const res = await api.put(`/api/admin/workflow/move-in/${moveInId}/requirement`, {
                requirement,
                completed: !currentStatus
            });
            if (res.data.success) {
                fetchMoveIns();
            }
        } catch (error) {
            console.error('Error toggling requirement:', error);
            alert('Failed to update requirement');
        }
    };

    // Timezone-safe date parser
    const safeDate = (dateStr) => {
        if (!dateStr) return null;
        const datePart = String(dateStr).substring(0, 10);
        return new Date(datePart + 'T12:00:00');
    };

    const Card = ({ item }) => {
        const handleAction = (e) => {
            e.stopPropagation();

            // Priority 1: Inspections
            if (item.status === 'INSPECTION_IN_PROGRESS' && item.inspectionId) {
                navigate(`/admin/workflow/inspections/${item.inspectionId}/form`);
                return;
            }
            if (item.status === 'INSPECTION_COMPLETED') {
                handleCompleteMoveIn(item.id);
                return;
            }
            if (item.status === 'READY_FOR_MOVE_IN') {
                navigate('/admin/workflow/inspections/new', { state: { moveInId: item.id } });
                return;
            }

            // Priority 2: Blocked/Prep
            if (item.status === 'PENDING' || item.status.includes('BLOCKED')) {
                if (item.status.includes('PREPARATION')) {
                    navigate('/admin/workflow/unit-prep');
                } else if (item.status.includes('CONSTRUCTION')) {
                    navigate('/unit-readiness');
                } else {
                    handleToggleRequirement(item.id, 'Process', true);
                }
            } else if (item.status === 'REQUIREMENTS_PENDING') {
                handleOverride(item.id);
            }
        };

        const isBlocked = item.status.includes('BLOCKED');
        const displayDate = safeDate(item.targetDate);

        return (
            <div
                className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all cursor-pointer group relative"
                onClick={handleAction}
            >
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <button
                        onClick={(e) => { e.stopPropagation(); handleCancelMoveIn(item.id); }}
                        className="p-1.5 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-lg transition-colors"
                        title="Cancel Move-In"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>

                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-1.5">
                        {item.unit.is_priority && (
                            <span className="bg-red-100 text-red-600 text-[9px] font-black px-1.5 py-0.5 rounded animate-pulse">PRIORITY</span>
                        )}
                        <span className="bg-indigo-50 text-indigo-600 text-[9px] font-black px-1.5 py-0.5 rounded border border-indigo-100">
                            {item.unit.property?.name || 'Unit'}
                        </span>
                    </div>

                    <div>
                        <h4 className="font-black text-gray-900 text-sm leading-tight">Unit {item.unit.unitNumber}</h4>
                        <div className="flex flex-col min-w-0">
                            <p className="text-xs text-gray-500 font-bold truncate">
                                {item.lease?.tenant?.name || item.unit?.reserved_by_user?.name || 'Prospect Reservation'}
                            </p>
                            {(item.lease?.tenant?.phone || item.unit?.reserved_by_user?.phone) && (
                                <p className="text-xs text-blue-600 font-black tracking-tight leading-tight mt-0.5">
                                    {item.lease?.tenant?.phone || item.unit?.reserved_by_user?.phone}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-[10px] text-gray-500 bg-gray-50 p-1 rounded-lg border border-gray-100/50">
                        <Calendar size={12} className="text-indigo-500" />
                        <span className="font-black">{displayDate ? format(displayDate, 'MMM d, yyyy') : 'TBD'}</span>
                        <div className="w-1 h-1 rounded-full bg-gray-300" />
                        <span className="flex items-center gap-1 font-bold">
                            <Clock size={10} />
                            {item.daysRemaining > 0 ? `${item.daysRemaining} days left` : item.daysRemaining === 0 ? 'Today' : `${Math.abs(item.daysRemaining)} days overdue`}
                        </span>
                    </div>

                    <div className="pt-1 flex flex-col gap-1.5">
                        <div
                            className={`w-full flex items-center justify-between p-2 rounded-lg transition-all border ${item.status === 'INSPECTION_COMPLETED'
                                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                                    : item.status === 'INSPECTION_IN_PROGRESS'
                                        ? 'bg-amber-600 text-white border-amber-500 shadow-sm'
                                        : isBlocked ? 'bg-gray-100 text-gray-400 border-gray-200' : 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                                } ${loading || isBlocked ? 'cursor-not-allowed opacity-70' : 'hover:brightness-110 active:scale-95'}`}
                        >
                            <div className="flex items-center gap-2">
                                {item.status === 'INSPECTION_COMPLETED' ? <CheckCircle2 size={14} /> : isBlocked ? <Lock size={14} /> : <Unlock size={14} />}
                                <span className="text-[9px] font-black uppercase tracking-wider">
                                    {isBlocked ? 'Prep In Progress' :
                                        item.status === 'REQUIREMENTS_PENDING' ? 'Override & Continue' :
                                            item.status === 'READY_FOR_MOVE_IN' ? 'Start Inspection' :
                                                item.status === 'INSPECTION_IN_PROGRESS' ? 'Continue Inspection' :
                                                    item.status === 'INSPECTION_COMPLETED' ? 'Finalize Move-In' : 'Process'}
                                </span>
                            </div>
                            {!isBlocked && <ChevronRight size={12} />}
                        </div>
                    </div>

                    {item.requirements && (
                        <div className="grid grid-cols-2 gap-x-2 gap-y-2 pt-1.5 mt-0.5 border-t border-gray-50">
                            <Requirement
                                badge="Ready"
                                status={item.unit.unit_ready_completed || item.unit.ready_for_leasing}
                                label={item.unit.unit_ready_completed ? 'Unit Ready' : 'Prep Pending'}
                            />
                            <Requirement
                                badge="Repairs"
                                status={item.requirements.repairs}
                                label={item.requirements.repairs ? 'Clear' : 'Tasks Open'}
                            />
                            <Requirement
                                badge="Rent"
                                status={item.requirements.rent}
                                onClick={(e) => { e.stopPropagation(); handleToggleRequirement(item.id, 'Rent', item.requirements.rent); }}
                            />
                            <Requirement
                                badge="Deposit"
                                status={item.requirements.deposit}
                                onClick={(e) => { e.stopPropagation(); handleToggleRequirement(item.id, 'Deposit', item.requirements.deposit); }}
                            />
                            <Requirement
                                badge="Insure"
                                status={item.requirements.insurance}
                                onClick={(e) => { e.stopPropagation(); handleToggleRequirement(item.id, 'Insurance', item.requirements.insurance); }}
                            />
                            <Requirement
                                badge="Lease"
                                status={!!item.leaseId}
                            />
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const Requirement = ({ badge, status, label, onClick }) => {
        const isNotRequired = status === 'NOT_REQUIRED';
        const isPaid = status === 'PAID' || status === true;
        const isMissing = status === 'MISSING' || status === false;

        return (
            <div
                onClick={onClick}
                className={`flex items-center gap-1.5 p-1 rounded-md transition-all ${onClick ? 'cursor-pointer hover:bg-gray-50' : ''}`}
            >
                {isPaid ? (
                    <div className="bg-emerald-500 rounded-full p-0.5 shadow-sm">
                        <CheckCircle2 size={10} className="text-white" />
                    </div>
                ) : isNotRequired ? (
                    <div className="bg-gray-300 rounded-full p-0.5 shadow-sm">
                        <CheckCircle2 size={10} className="text-white" />
                    </div>
                ) : (
                    <div className="bg-red-500 rounded-full p-0.5 shadow-sm">
                        <AlertCircle size={10} className="text-white" />
                    </div>
                )}
                <div className="flex flex-col">
                    <span className={`text-[9px] font-black uppercase tracking-wider ${isPaid ? 'text-gray-400' :
                            isNotRequired ? 'text-gray-300' :
                                'text-red-600'
                        }`}>
                        {badge}
                    </span>
                    {label && (
                        <span className={`text-[8px] font-bold leading-none ${isPaid ? 'text-gray-600' : 'text-red-500'}`}>
                            {label}
                        </span>
                    )}
                </div>
            </div>
        );
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading Dashboard...</div>;

    return (
        <MainLayout title="Move-In Dashboard">
            <div className="p-0 bg-transparent min-h-screen">
                {/* Header */}
                <div className="flex items-center justify-between mb-4 mt-2">
                    <div>
                        <h1 className="text-xl font-black text-gray-900 tracking-tight">Move-In Dashboard</h1>
                        <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Track tenant move-ins • Follow workflow</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleExport}
                            className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-xl text-xs font-black text-gray-600 hover:bg-gray-50 uppercase tracking-widest"
                        >
                            Export <ChevronRight size={14} className="rotate-90" />
                        </button>
                        <button
                            onClick={() => navigate('/admin/workflow/inspections/new')}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black hover:bg-indigo-700 shadow-md uppercase tracking-widest"
                        >
                            <Calendar size={14} />
                            Schedule
                        </button>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-5 gap-3 mb-6">
                    <StatCard icon={Calendar} label="Upcoming" sublabel="30 Days" value={stats.upcoming} color="text-blue-600" bg="bg-blue-50" />
                    <StatCard icon={Lock} label="Blocked Prep" sublabel="Not ready" value={stats.blockedPrep} color="text-red-600" bg="bg-red-50" />
                    <StatCard icon={FileCheck} label="Blocked Req" sublabel="Action needed" value={stats.blockedReq} color="text-orange-600" bg="bg-orange-50" />
                    <StatCard icon={Search} label="Ready" sublabel="Verified" value={stats.readyInspection} color="text-indigo-600" bg="bg-indigo-50" />
                    <StatCard icon={CheckCircle2} label="Completed" sublabel="Done" value={stats.completed} color="text-green-600" bg="bg-green-50" />
                </div>

                {/* Filters */}
                <div className="flex items-center justify-between mb-6 bg-white p-2 rounded-xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-100">
                            <Filter size={16} className="text-gray-400" />
                            <select className="bg-transparent text-sm font-semibold outline-none border-none">
                                <option>All Buildings</option>
                            </select>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-100">
                            <Calendar size={16} className="text-gray-400" />
                            <select className="bg-transparent text-sm font-semibold outline-none border-none">
                                <option>Next 30 Days</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search units, tenants..."
                                className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
                            />
                        </div>
                    </div>
                </div>

                {/* Kanban Columns */}
                <div className="flex gap-6 overflow-x-auto pb-4 h-[calc(100vh-380px)] scrollbar-thin scrollbar-thumb-gray-200">
                    <Column
                        title="Upcoming Move-Ins"
                        subtitle="Upcoming within 30 days"
                        icon={Calendar}
                        color="bg-blue-100 text-blue-600"
                        count={stats.upcoming}
                        items={moveIns.filter(m => m.status === 'PENDING')}
                    />
                    <Column
                        title="Blocked - In Preparation"
                        subtitle="Lease/Reservation exists but unit is NOT Ready"
                        icon={Lock}
                        color="bg-red-100 text-red-600"
                        count={stats.blockedPrep}
                        items={moveIns.filter(m => m.status === 'BLOCKED_IN_PREPARATION' || m.status === 'BLOCKED_IN_CONSTRUCTION')}
                    />
                    <Column
                        title="Blocked - Missing Requirements"
                        subtitle="Unit Ready but Rent/Deposit/Insurance incomplete"
                        icon={FileCheck}
                        color="bg-orange-100 text-orange-600"
                        count={stats.blockedReq}
                        items={moveIns.filter(m => m.status === 'REQUIREMENTS_PENDING')}
                    />
                    <Column
                        title="Ready for Move-In Inspection"
                        subtitle="Unit Ready + All requirements complete or overridden"
                        icon={Search}
                        color="bg-yellow-100 text-yellow-600"
                        count={stats.readyInspection}
                        items={moveIns.filter(m => m.status === 'READY_FOR_MOVE_IN' || m.status === 'INSPECTION_IN_PROGRESS')}
                    />
                    <Column
                        title="Inspection Completed"
                        subtitle="Inspection done - check deficiencies"
                        icon={CheckCircle2}
                        color="bg-green-100 text-green-600"
                        count={stats.completed}
                        items={moveIns.filter(m => m.status === 'INSPECTION_COMPLETED')}
                    />
                </div>
            </div>
        </MainLayout>
    );
};

const StatCard = ({ icon: Icon, label, sublabel, value, color, bg }) => (
    <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm flex items-start gap-3 hover:border-indigo-100 transition-all cursor-pointer group">
        <div className={`p-2 rounded-xl ${bg} ${color} group-hover:scale-110 transition-transform`}>
            <Icon size={18} />
        </div>
        <div className="flex flex-col">
            <span className="text-xl font-black text-gray-900 leading-none">{value}</span>
            <span className="text-[11px] font-black text-gray-900 leading-tight mt-1">{label}</span>
            <span className="text-[9px] font-bold text-gray-400 uppercase">{sublabel}</span>
        </div>
    </div>
);

export default MoveInDashboard;
