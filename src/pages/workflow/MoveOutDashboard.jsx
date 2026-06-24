import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { 
    Calendar, 
    UserCheck, 
    Search, 
    PlayCircle, 
    CheckSquare, 
    MoreVertical, 
    ArrowRight, 
    Clock, 
    Filter,
    ChevronRight,
    ClipboardList,
    Edit2
} from 'lucide-react';
import { format } from 'date-fns';
import { MainLayout } from '../../layouts/MainLayout';



const MoveOutDashboard = () => {
    const navigate = useNavigate();
    const [moveOuts, setMoveOuts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedMoveOut, setSelectedMoveOut] = useState(null);
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [scheduleType, setScheduleType] = useState('VISUAL'); // 'VISUAL' or 'FINAL'
    const [stats, setStats] = useState({
        upcoming: 0,
        confirmed: 0,
        scheduled: 0,
        inProgress: 0,
        ready: 0,
        completed: 0
    });

    useEffect(() => {
        fetchMoveOuts();
    }, []);

    const fetchMoveOuts = async () => {
        try {
            const res = await api.get('/api/admin/workflow/move-out');
            if (res.data.success) {
                setMoveOuts(res.data.data);
                calculateStats(res.data.data);
            }
        } catch (error) {
            console.error('Error fetching move-outs:', error);
        } finally {
            setLoading(false);
        }
    };

    const calculateStats = (data) => {
        const s = { upcoming: 0, confirmed: 0, scheduled: 0, inProgress: 0, ready: 0, completed: 0 };
        data.forEach(item => {
            const hasBothStarted = item.visualInspectionId && item.finalInspectionId;
            if (item.status === 'COMPLETED') s.completed++;
            else if (item.status === 'INSPECTIONS_COMPLETED') s.ready++;
            else if (item.status === 'PENDING') s.upcoming++;
            else if (item.status === 'CONFIRMED') s.confirmed++;
            else if (item.status === 'INSPECTION_IN_PROGRESS' || hasBothStarted) s.inProgress++;
            else if (item.status.includes('SCHEDULED')) s.scheduled++;
        });
        setStats(s);
    };

    const safeDate = (dateStr) => {
        if (!dateStr) return null;
        // Extracts YYYY-MM-DD and parses as local calendar date
        const datePart = String(dateStr).substring(0, 10);
        const [y, m, d] = datePart.split('-').map(Number);
        return new Date(y, m - 1, d);
    };

    const handleExport = async () => {
        try {
            const res = await api.get('/api/admin/workflow/move-out/export', { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `move-out-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            alert('Failed to export PDF: ' + error.message);
        }
    };

    const handleSchedule = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const date = formData.get('date');
        const time = formData.get('time');

        try {
            const endpoint = scheduleType === 'VISUAL' 
                ? `/api/admin/workflow/move-out/${selectedMoveOut.id}/confirm`
                : `/api/admin/workflow/move-out/${selectedMoveOut.id}/schedule-final`;
            
            const payload = scheduleType === 'VISUAL' 
                ? { visualDate: date, visualTime: time }
                : { finalDate: date, finalTime: time };

            const res = await api.put(endpoint, payload);
            if (res.data.success) {
                setShowScheduleModal(false);
                fetchMoveOuts();
            }
        } catch (error) {
            alert("Failed to schedule: " + error.message);
        }
    };

    const handleClearSchedule = async () => {
        if (!window.confirm("Are you sure you want to clear this appointment?")) return;
        
        try {
            const endpoint = scheduleType === 'VISUAL' 
                ? `/api/admin/workflow/move-out/${selectedMoveOut.id}/confirm`
                : `/api/admin/workflow/move-out/${selectedMoveOut.id}/schedule-final`;
            
            const payload = scheduleType === 'VISUAL' 
                ? { visualDate: '', visualTime: '' }
                : { finalDate: '', finalTime: '' };

            const res = await api.put(endpoint, payload);
            if (res.data.success) {
                setShowScheduleModal(false);
                fetchMoveOuts();
            }
        } catch (error) {
            alert("Failed to clear schedule: " + error.message);
        }
    };


    const Column = ({ title, icon: Icon, color, count, items, subtitle }) => (
        <div className="flex-1 min-w-[280px] bg-gray-50/50 rounded-2xl p-3 flex flex-col gap-3">
            <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-xl ${color}`}>
                        <Icon size={16} />
                    </div>
                    <div>
                        <h3 className="font-black text-gray-900 text-[13px] leading-tight tracking-tight">{title}</h3>
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{subtitle}</p>
                    </div>
                </div>
                <span className="bg-white px-1.5 py-0.5 rounded-lg text-[10px] font-black text-gray-400 border border-gray-100 shadow-sm">
                    {count}
                </span>
            </div>

            <div className="flex flex-col gap-2 overflow-y-auto max-h-[calc(100vh-320px)] pr-1 scrollbar-thin scrollbar-thumb-gray-200">
                {items.map(item => (
                    <Card key={item.id} item={item} />
                ))}
            </div>
        </div>
    );

    const Card = ({ item }) => {
        const [menuOpen, setMenuOpen] = useState(false);

        const handleAction = async (action) => {
            setMenuOpen(false);
            try {
                if (action === 'CANCEL') {
                    if (window.confirm("Are you sure you want to cancel this Move-Out?")) {
                        const res = await api.put(`/api/admin/workflow/move-out/cancel/${item.leaseId}`);
                        if (res.data.success) fetchMoveOuts();
                    }
                }
                // Add more actions here
            } catch (e) {
                alert("Action failed: " + e.message);
            }
        };

        return (
            <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg hover:border-indigo-100 transition-all group relative overflow-visible">
                <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between px-0.5">
                        <div className="flex items-center gap-1.5">
                            <span className="bg-blue-100 text-blue-600 text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase">Move-Out</span>
                            <span className="bg-gray-100 text-gray-500 text-[9px] font-black px-1.5 py-0.5 rounded-full truncate max-w-[60px]">
                                {item.unit.unitNumber}
                            </span>
                        </div>
                        <div className="relative">
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setMenuOpen(!menuOpen);
                                }}
                                className="p-0.5 rounded-lg hover:bg-gray-100 text-gray-300 hover:text-gray-600 transition-colors"
                            >
                                <MoreVertical size={14} />
                            </button>
                            
                            {menuOpen && (
                                <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 z-50 animate-in fade-in zoom-in duration-100">
                                    <button 
                                        onClick={() => handleAction('CANCEL')}
                                        className="w-full text-left px-4 py-2 text-xs font-black text-red-600 hover:bg-red-50 transition-colors uppercase tracking-wider"
                                    >
                                        Cancel Move-Out
                                    </button>
                                    <button 
                                        onClick={() => navigate(`/units/${item.unitId}`)}
                                        className="w-full text-left px-4 py-2 text-xs font-black text-gray-700 hover:bg-gray-50 transition-colors uppercase tracking-wider"
                                    >
                                        View Unit Details
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    <div onClick={() => navigate(`/units/${item.unitId}`)} className="cursor-pointer px-0.5">
                        <h4 className="font-black text-gray-900 text-sm leading-tight tracking-tight truncate">Unit {item.unit.unitNumber}</h4>
                        <div className="flex flex-col">
                            <p className="text-[11px] font-black text-gray-500 truncate">
                                {item.lease.tenant?.name || 'N/A'}
                            </p>
                            {item.lease.tenant?.phone && (
                                <p className="text-xs text-blue-600 font-black tracking-tight leading-tight mt-0.5">
                                    {item.lease.tenant.phone}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col gap-1 py-1 px-0.5">
                        <div className="flex items-center gap-1.5 text-xs font-black text-gray-400">
                            <Calendar size={10} className="text-indigo-400" />
                            Target: {format(safeDate(item.targetDate) || new Date(), 'MMM d, yyyy')}
                        </div>
                        
                        {/* Inspection Status Tags */}
                        {(item.status.includes('SCHEDULED') || item.status === 'INSPECTION_IN_PROGRESS') && (
                            <div className="mt-1 flex flex-col gap-1 bg-gray-50/50 p-2 rounded-xl border border-gray-50">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Visual Inspection</span>
                                    {(() => {
                                        const insp = item.inspections?.find(i => i.id === item.visualInspectionId);
                                        if (insp?.status === 'COMPLETED') {
                                            return <span className="bg-green-100 text-green-600 text-[10px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-tighter">✅ Completed ({format(safeDate(item.visualDate), 'MMM d')})</span>;
                                        } else if (item.visualInspectionId) {
                                            return <span className="bg-blue-100 text-blue-600 text-[10px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-tighter">⏳ Started ({format(safeDate(item.visualDate), 'MMM d')}{item.visualTime ? ` @ ${item.visualTime}` : ''})</span>;
                                        } else if (item.visualDate) {
                                            return (
                                                <span 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setScheduleType('VISUAL');
                                                        setSelectedMoveOut(item);
                                                        setShowScheduleModal(true);
                                                    }}
                                                    className="bg-orange-100 text-orange-600 text-[10px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-tighter cursor-pointer hover:bg-orange-200 transition-colors flex items-center gap-1"
                                                    title="Click to reschedule"
                                                >
                                                    📅 TO-DO ({format(safeDate(item.visualDate), 'MMM d')}{item.visualTime ? ` @ ${item.visualTime}` : ''})
                                                    <Edit2 size={8} />
                                                </span>
                                            );
                                        } else {
                                            return <span className="bg-gray-100 text-gray-400 text-[10px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-tighter">⏳ REMAINING</span>;
                                        }
                                    })()}
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Move-Out Inspection</span>
                                    {(() => {
                                        const insp = item.inspections?.find(i => i.id === item.finalInspectionId);
                                        if (insp?.status === 'COMPLETED') {
                                            return <span className="bg-green-100 text-green-600 text-[10px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-tighter">✅ Completed ({format(safeDate(item.finalDate), 'MMM d')})</span>;
                                        } else if (item.finalInspectionId) {
                                            return <span className="bg-blue-100 text-blue-600 text-[10px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-tighter">⏳ Started ({format(safeDate(item.finalDate), 'MMM d')}{item.finalTime ? ` @ ${item.finalTime}` : ''})</span>;
                                        } else if (item.finalDate) {
                                            return (
                                                <span 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setScheduleType('FINAL');
                                                        setSelectedMoveOut(item);
                                                        setShowScheduleModal(true);
                                                    }}
                                                    className="bg-orange-100 text-orange-600 text-[10px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-tighter cursor-pointer hover:bg-orange-200 transition-colors flex items-center gap-1"
                                                    title="Click to reschedule"
                                                >
                                                    📅 TO-DO ({format(safeDate(item.finalDate), 'MMM d')}{item.finalTime ? ` @ ${item.finalTime}` : ''})
                                                    <Edit2 size={8} />
                                                </span>
                                            );
                                        } else {
                                            return <span className="bg-gray-100 text-gray-400 text-[10px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-tighter">⏳ REMAINING</span>;
                                        }
                                    })()}
                                </div>
                            </div>
                        )}

                        <div className="flex items-center gap-1.5 text-[10px] font-black mt-1">
                            <Clock size={10} className={item.urgency === 'OVERDUE' ? 'text-red-400' : 'text-orange-400'} />
                            <span className={item.urgency === 'OVERDUE' ? 'text-red-500' : 'text-gray-400'}>
                                {Math.abs(item.daysRemaining)} {item.daysRemaining < 0 ? 'days overdue' : 'days left'}
                            </span>
                        </div>
                    </div>

                    <div className="pt-2 border-t border-gray-50 flex flex-col gap-2">
                        <button 
                            onClick={async (e) => {
                                e.stopPropagation();
                                if (item.status === 'PENDING') {
                                    // Rule 2.2: Simple confirmation of move-out
                                    if (window.confirm("Confirm that this tenant is moving out?")) {
                                        try {
                                            const res = await api.put(`/api/admin/workflow/move-out/${item.id}/confirm`, {});
                                            if (res.data.success) fetchMoveOuts();
                                        } catch (e) {
                                            alert("Error confirming: " + e.message);
                                        }
                                    }
                                    return;
                                }

                                // If any inspection is missing, priority is to START it
                                if (item.status === 'CONFIRMED') {
                                    setScheduleType('VISUAL');
                                    setSelectedMoveOut(item);
                                    setShowScheduleModal(true);
                                    return;
                                }

                                if (item.status.includes('SCHEDULED')) {
                                    if (!item.finalDate) {
                                        setScheduleType('FINAL');
                                        setSelectedMoveOut(item);
                                        setShowScheduleModal(true);
                                        return;
                                    }

                                    // If scheduled but not started, prioritize STARTING it
                                    if (!item.visualInspectionId || !item.finalInspectionId) {
                                        const nextType = item.visualInspectionId ? 'MOVE_OUT' : 'VISUAL';
                                        navigate('/admin/workflow/inspections/new', { 
                                            state: { 
                                                moveOutId: item.id,
                                                unitId: item.unitId,
                                                leaseId: item.leaseId,
                                                type: nextType,
                                                visualDate: item.visualDate,
                                                visualTime: item.visualTime,
                                                finalDate: item.finalDate,
                                                finalTime: item.finalTime
                                            } 
                                        });
                                        return;
                                    }
                                }

                                // If both are started, THEN allow continuing
                                const activeInspection = item.inspections?.find(i => i.status === 'DRAFT' || i.status === 'IN_PROGRESS');
                                if (activeInspection) {
                                    navigate(`/admin/workflow/inspections/${activeInspection.id}/form`);
                                    return;
                                }

                                if (item.status === 'INSPECTIONS_COMPLETED') {
                                    if (window.confirm("Confirm all inspections are complete and move unit to Preparation?")) {
                                        try {
                                            const res = await api.put(`/api/admin/workflow/move-out/${item.id}/complete`);
                                            if (res.data.success) fetchMoveOuts();
                                        } catch (e) {
                                            alert("Error completing: " + (e.response?.data?.message || e.message));
                                        }
                                    }
                                }
                            }}
                            className="w-full flex items-center justify-between p-1.5 rounded-xl bg-gray-50 hover:bg-indigo-50 transition-colors border border-transparent hover:border-indigo-100"
                        >
                            <div className="flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                                <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">
                                    {item.status === 'PENDING' ? 'CONFIRM MOVE-OUT' : 
                                     item.status === 'CONFIRMED' ? 'SCHEDULE VISUAL' :
                                     item.status.includes('SCHEDULED') && !item.finalDate ? 'SCHEDULE FINAL' :
                                     item.status.includes('SCHEDULED') && !item.visualInspectionId ? 'START VISUAL' :
                                     item.status.includes('SCHEDULED') && !item.finalInspectionId ? 'START FINAL' :
                                     item.inspections?.some(i => i.status === 'DRAFT' || i.status === 'IN_PROGRESS') ? 'CONTINUE INSPECTION' :
                                     item.status === 'INSPECTION_IN_PROGRESS' ? 'CONTINUE' :
                                     item.status === 'INSPECTIONS_COMPLETED' ? 'FINALIZE' : 'VIEW'}
                                </span>
                            </div>
                            <ArrowRight size={12} className="text-gray-400" />
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const StatCard = ({ icon: Icon, label, sublabel, value, color, bg }) => (
        <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm flex items-start gap-3 hover:shadow-lg transition-all cursor-pointer group">
            <div className={`p-2.5 rounded-xl ${bg} ${color} group-hover:scale-110 transition-transform shadow-sm`}>
                <Icon size={18} />
            </div>
            <div className="flex flex-col">
                <span className="text-xl font-black text-gray-900 leading-none mb-1">{value}</span>
                <span className="text-[11px] font-black text-gray-900 leading-tight mb-0.5">{label}</span>
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{sublabel}</span>
            </div>
        </div>
    );

    if (loading) return <div className="p-8 text-center text-gray-500 font-black">SYNCING DASHBOARD...</div>;

    return (
        <MainLayout title="Move-Out Dashboard">
            <div className="p-0 bg-transparent min-h-screen">
            {/* Header */}
            <div className="flex items-center justify-between mb-4 mt-2">
                <div>
                    <h1 className="text-xl font-black text-gray-900 tracking-tight">Move-Out Dashboard</h1>
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Track upcoming move-outs • Follow workflow</p>
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={handleExport}
                        className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-xl text-xs font-black text-gray-700 hover:bg-gray-100 transition-colors border border-gray-100"
                    >
                        Export <ChevronRight size={14} className="rotate-90 text-gray-400" />
                    </button>
                    <button 
                        onClick={() => navigate('/admin/workflow/inspections/new')}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black hover:bg-indigo-700 shadow-md transition-all active:scale-95"
                    >
                        <Search size={14} />
                        Schedule
                    </button>
                </div>
            </div>

            {/* Premium Stats Grid */}
            <div className="grid grid-cols-6 gap-3 mb-6">
                <StatCard icon={Calendar} label="Upcoming" sublabel="30 Days" value={stats.upcoming} color="text-blue-600" bg="bg-blue-50" />
                <StatCard icon={UserCheck} label="Confirmed" sublabel="30 Days" value={stats.confirmed} color="text-orange-600" bg="bg-orange-50" />
                <StatCard icon={Clock} label="Scheduled" sublabel="Action" value={stats.scheduled} color="text-yellow-600" bg="bg-yellow-50" />
                <StatCard icon={PlayCircle} label="Progress" sublabel="Active" value={stats.inProgress} color="text-purple-600" bg="bg-purple-50" />
                <StatCard icon={CheckSquare} label="Ready" sublabel="Verified" value={stats.ready} color="text-green-600" bg="bg-green-50" />
                <StatCard icon={ClipboardList} label="Completed" sublabel="Archived" value={stats.completed} color="text-indigo-600" bg="bg-indigo-50" />
            </div>

            {/* Search & Filter Bar */}
            <div className="flex items-center gap-4 mb-8">
                <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-2xl border border-gray-100">
                    <Filter size={16} className="text-gray-400" />
                    <select className="bg-transparent text-xs font-black text-gray-700 outline-none border-none uppercase tracking-wider">
                        <option>All Buildings</option>
                    </select>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-2xl border border-gray-100">
                    <Calendar size={16} className="text-gray-400" />
                    <select className="bg-transparent text-xs font-black text-gray-700 outline-none border-none uppercase tracking-wider">
                        <option>Move-Out Date: Next 30 Days</option>
                    </select>
                </div>
                <div className="flex-1 relative">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                        type="text" 
                        placeholder="Search units, tenants..." 
                        className="w-full pl-12 pr-6 py-3 bg-gray-50 border border-gray-100 rounded-3xl text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 focus:bg-white transition-all shadow-inner"
                    />
                </div>
            </div>

            {/* Kanban Columns */}
            <div className="flex gap-4 overflow-x-auto pb-6 h-[calc(100vh-380px)] scrollbar-thin scrollbar-thumb-gray-200">
                <Column 
                    title="Upcoming Move-Outs" 
                    subtitle="Upcoming within 30 days"
                    icon={Calendar} 
                    color="bg-blue-100 text-blue-600" 
                    count={stats.upcoming} 
                    items={moveOuts.filter(m => m.status === 'PENDING')}
                />
                <Column 
                    title="Confirmed Move-Out" 
                    subtitle="Tenant confirmed"
                    icon={UserCheck} 
                    color="bg-orange-100 text-orange-600" 
                    count={stats.confirmed} 
                    items={moveOuts.filter(m => m.status === 'CONFIRMED')}
                />
                <Column 
                    title="Move-Out Inspection Remaining" 
                    subtitle="Final scheduled"
                    icon={Clock} 
                    color="bg-yellow-100 text-yellow-600" 
                    count={stats.scheduled} 
                    items={moveOuts.filter(m => m.status.includes('SCHEDULED') && !(m.visualInspectionId && m.finalInspectionId) && m.status !== 'COMPLETED' && m.status !== 'CANCELLED')}
                />
                <Column 
                    title="Inspection In Progress" 
                    subtitle="Active surveys"
                    icon={PlayCircle} 
                    color="bg-purple-100 text-purple-600" 
                    count={stats.inProgress} 
                    items={moveOuts.filter(m => (m.status === 'INSPECTION_IN_PROGRESS' || (m.visualInspectionId && m.finalInspectionId)) && !['COMPLETED', 'CANCELLED', 'INSPECTIONS_COMPLETED', 'PENDING', 'CONFIRMED'].includes(m.status))}
                />
                <Column 
                    title="Ready for Completion" 
                    subtitle="Ready for end"
                    icon={CheckSquare} 
                    color="bg-green-100 text-green-600" 
                    count={stats.ready} 
                    items={moveOuts.filter(m => m.status === 'INSPECTIONS_COMPLETED' && m.status !== 'COMPLETED')}
                />
            </div>

            {/* Schedule Modal */}
            {showScheduleModal && (
                <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200 border border-gray-100 overflow-hidden">
                        <form onSubmit={handleSchedule}>
                            <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                                <div>
                                    <h2 className="text-xl font-black text-gray-900 tracking-tight">
                                        Schedule {scheduleType === 'VISUAL' ? 'Visual' : 'Move-Out'} Inspection
                                    </h2>
                                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mt-1">
                                        Unit {selectedMoveOut?.unit?.unitNumber} • {selectedMoveOut?.lease?.tenant?.name}
                                    </p>
                                </div>
                                <button 
                                    type="button"
                                    onClick={() => setShowScheduleModal(false)}
                                    className="p-2 hover:bg-white rounded-full transition-colors text-gray-400 hover:text-gray-900"
                                >
                                    <MoreVertical size={20} className="rotate-45" />
                                </button>
                            </div>
                            
                            <div className="p-8 flex flex-col gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Select Date</label>
                                    <div className="relative">
                                        <Calendar size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500" />
                                        <input 
                                            required
                                            type="date" 
                                            name="date"
                                            defaultValue={scheduleType === 'VISUAL' ? (selectedMoveOut?.visualDate ? String(selectedMoveOut.visualDate).substring(0,10) : '') : (selectedMoveOut?.finalDate ? String(selectedMoveOut.finalDate).substring(0,10) : '')}
                                            className="w-full pl-12 pr-6 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Select Time</label>
                                    <div className="relative">
                                        <Clock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500" />
                                        <input 
                                            required
                                            type="time" 
                                            name="time"
                                            defaultValue={scheduleType === 'VISUAL' ? selectedMoveOut?.visualTime : selectedMoveOut?.finalTime}
                                            className="w-full pl-12 pr-6 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 bg-gray-50/50 flex flex-col gap-3">
                                <div className="flex gap-3">
                                    <button 
                                        type="button"
                                        onClick={() => setShowScheduleModal(false)}
                                        className="flex-1 py-3.5 px-6 rounded-2xl text-sm font-black text-gray-500 hover:bg-white transition-all uppercase tracking-widest border border-transparent hover:border-gray-100"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit"
                                        className="flex-[2] py-3.5 px-6 bg-indigo-600 text-white rounded-2xl text-sm font-black hover:bg-indigo-700 shadow-lg shadow-indigo-500/20 transition-all active:scale-95 uppercase tracking-widest"
                                    >
                                        Confirm Appointment
                                    </button>
                                </div>
                                {((scheduleType === 'VISUAL' && selectedMoveOut?.visualDate) || 
                                  (scheduleType === 'FINAL' && selectedMoveOut?.finalDate)) && (
                                    <button 
                                        type="button"
                                        onClick={handleClearSchedule}
                                        className="w-full py-3 px-6 rounded-2xl text-xs font-black text-red-500 hover:bg-red-50 transition-all uppercase tracking-widest border border-transparent hover:border-red-100 mt-2"
                                    >
                                        Clear Appointment
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>
                </div>
            )}
            </div>
        </MainLayout>
    );
};

export default MoveOutDashboard;
