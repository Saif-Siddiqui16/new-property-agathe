import React, { useState, useEffect } from 'react';
import { MainLayout } from '../layouts/MainLayout';
import { Button } from '../components/Button';
import {
    Search,
    Plus,
    Filter,
    Calendar,
    Building,
    User,
    CheckCircle2,
    Clock,
    AlertCircle,
    MoreVertical,
    Wrench,
    X,
    Trash2,
    Edit2,
    ClipboardList,
    TrendingUp,
    TrendingDown,
    Activity,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    LayoutList
} from 'lucide-react';
import clsx from 'clsx';
import api from '../api/client';
import { hasPermission } from '../utils/permissions';

const statusStyles = {
    Completed: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    Upcoming: 'bg-amber-50 text-amber-700 border-amber-100',
    Overdue: 'bg-red-50 text-red-700 border-red-100',
};

const statusIcons = {
    Completed: <CheckCircle2 size={14} className="text-emerald-500" />,
    Upcoming: <Clock size={14} className="text-amber-500" />,
    Overdue: <AlertCircle size={14} className="text-red-500" />,
};

export const Maintenance = () => {
    const [__forceUpdate, __setForceUpdate] = useState(0);
    useEffect(() => {
        const handleUpdate = () => __setForceUpdate(p => p + 1);
        window.addEventListener('permissionsUpdated', handleUpdate);
        return () => window.removeEventListener('permissionsUpdated', handleUpdate);
    }, []);

    const [tasks, setTasks] = useState([]);
    const [buildings, setBuildings] = useState([]);
    const [search, setSearch] = useState('');
    const [filterBuildingId, setFilterBuildingId] = useState('all');
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
    const [viewMode, setViewMode] = useState('list'); // 'list' or 'calendar'
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [allBuildingsSelected, setAllBuildingsSelected] = useState(false);
    const [selectedBuildingIds, setSelectedBuildingIds] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const tasksPerPage = 10;

    useEffect(() => {
        fetchTasks();
        fetchBuildings();
    }, [filterBuildingId]);

    useEffect(() => {
        setCurrentPage(1);
    }, [search, filterBuildingId]);

    const fetchTasks = async () => {
        try {
            const res = await api.get(`/api/admin/maintenance?propertyId=${filterBuildingId}`);
            setTasks(res.data);
        } catch (e) {
            console.error(e);
        }
    };

    const fetchBuildings = async () => {
        try {
            const res = await api.get('/api/admin/properties');
            setBuildings(res.data);
        } catch (e) { console.error(e); }
    };

    const stats = {
        total: tasks.length,
        upcoming: tasks.filter(t => t.status === 'Upcoming').length,
        overdue: tasks.filter(t => t.status === 'Overdue').length,
        completed: tasks.filter(t => t.status === 'Completed').length,
    };

    const filteredTasks = tasks.filter(t =>
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.building.toLowerCase().includes(search.toLowerCase()) ||
        t.vendor.toLowerCase().includes(search.toLowerCase())
    );

    const handleMarkCompleted = async (id) => {
        const task = tasks.find(t => t.id === id);
        if (!task) return;
        try {
            await api.put(`/api/admin/maintenance/${task.dbId}`, { status: 'Completed' });
            fetchTasks();
        } catch (e) { alert('Failed'); }
    };

    const handleDeleteTask = async (dbId) => {
        if (!window.confirm('Delete this maintenance task?')) return;
        try {
            await api.delete(`/api/admin/maintenance/${dbId}`);
            fetchTasks();
        } catch (e) {
            alert('Failed to delete task');
        }
    };

    const handleSaveTask = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);

        try {
            const payload = {
                name: formData.get('name'),
                buildingId: formData.get('allBuildings') === 'true' ? 'all' : formData.getAll('buildingId').join(','),
                type: formData.get('type'),
                frequency: formData.get('frequency'),
                dueDate: formData.get('dueDate'),
                vendor: formData.get('vendor'),
                status: formData.get('status') || 'Upcoming',
                notes: formData.get('notes'),
            };

            if (editingTask) {
                await api.put(`/api/admin/maintenance/${editingTask.dbId}`, payload);
            } else {
                await api.post('/api/admin/maintenance', payload);
            }
            fetchTasks();
            setShowAddModal(false);
            setEditingTask(null);
            setAllBuildingsSelected(false);
            setSelectedBuildingIds([]);
        } catch (e) {
            alert('Failed to save task');
        }
    };

    return (
        <MainLayout title="Maintenance Management">
            <div className="flex flex-col gap-6">

                {/* STATS */}
                <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <StatCard label="Total Tasks" value={stats.total} icon={ClipboardList} color="indigo" />
                    <StatCard label="Upcoming" value={stats.upcoming} icon={Clock} color="amber" />
                    <StatCard label="Overdue" value={stats.overdue} icon={AlertCircle} color="red" />
                    <StatCard label="Completed" value={stats.completed} icon={CheckCircle2} color="emerald" />
                </section>

                {/* TOP BAR */}
                <section className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-100 gap-4">
                    <div className="flex items-center gap-4 flex-1 w-full">
                        <div className="flex items-center gap-3 bg-slate-50 px-4 py-2.5 rounded-lg border border-slate-200 focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all w-full md:w-auto md:min-w-[320px]">
                            <Search size={18} className="text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search tasks, buildings, or vendors..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="bg-transparent border-none outline-none text-slate-700 placeholder:text-slate-400 w-full text-sm font-medium"
                            />
                        </div>

                        <div className="relative min-w-[200px]">
                            <Building size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                            <select
                                value={filterBuildingId}
                                onChange={(e) => setFilterBuildingId(e.target.value)}
                                className="w-full pl-12 pr-10 py-2.5 rounded-lg border border-slate-200 outline-none focus:border-indigo-500 bg-slate-50 text-sm font-medium appearance-none"
                            >
                                <option value="all">All Buildings</option>
                                {buildings.map(b => (
                                    <option key={b.id} value={b.id}>{b.name}{b.civicNumber ? ` - ${b.civicNumber}` : ''}</option>
                                ))}
                            </select>
                            <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 mr-2">
                            <button
                                onClick={() => setViewMode('list')}
                                className={clsx(
                                    "p-1.5 rounded-md transition-all",
                                    viewMode === 'list' ? "bg-white shadow-sm text-indigo-600" : "text-slate-500 hover:text-slate-700"
                                )}
                                title="List View"
                            >
                                <LayoutList size={20} />
                            </button>
                            <button
                                onClick={() => setViewMode('calendar')}
                                className={clsx(
                                    "p-1.5 rounded-md transition-all",
                                    viewMode === 'calendar' ? "bg-white shadow-sm text-indigo-600" : "text-slate-500 hover:text-slate-700"
                                )}
                                title="Calendar View"
                            >
                                <Calendar size={20} />
                            </button>
                        </div>
                        {hasPermission('Maintenance', 'add') && (
                            <Button variant="primary" size="sm" onClick={() => setShowAddModal(true)}>
                                <Plus size={16} />
                                Add Task
                            </Button>
                        )}
                    </div>
                </section>

                {viewMode === 'list' ? (
                    /* TASKS TABLE */
                    <section className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                        <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr_0.8fr_0.5fr] bg-slate-50 border-b border-slate-200 px-6 py-4">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Task Details</span>
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Building</span>
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Frequency</span>
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Next Due Date</span>
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Vendor</span>
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Status</span>
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Actions</span>
                        </div>

                        <div className="divide-y divide-slate-100 text-sm">
                            {filteredTasks.slice((currentPage - 1) * tasksPerPage, currentPage * tasksPerPage).map((task) => (
                                <div key={task.id} className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr_0.8fr_0.5fr] px-6 py-4 items-center hover:bg-slate-50/50 transition-colors">
                                    <div className="flex flex-col">
                                        <span className="font-bold text-indigo-600 mb-0.5">{task.id}</span>
                                        <span className="font-semibold text-slate-700">{task.name}</span>
                                        <span className="text-xs text-slate-400 line-clamp-1">{task.notes}</span>
                                    </div>

                                    <span className="flex items-center gap-2 text-slate-600 font-medium">
                                        <Building size={14} className="text-slate-400" />
                                        {task.building}
                                    </span>

                                    <span className="text-slate-600 font-medium">{task.frequency}</span>

                                    <span className="flex items-center gap-2 text-slate-600 font-medium">
                                        <Calendar size={14} className="text-slate-400" />
                                        {task.dueDate}
                                    </span>

                                    <span className="flex items-center gap-2 text-slate-600 font-medium truncate">
                                        <User size={14} className="text-slate-400" />
                                        {task.vendor}
                                    </span>

                                    <div>
                                        <span className={clsx("flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border w-fit", statusStyles[task.status])}>
                                            {statusIcons[task.status]}
                                            {task.status}
                                        </span>
                                    </div>

                                     <div className="flex justify-end gap-2">
                                        {task.status !== 'Completed' && hasPermission('Maintenance', 'edit') && (
                                            <button
                                                onClick={() => handleMarkCompleted(task.id)}
                                                className="p-2 hover:bg-emerald-50 hover:text-emerald-600 rounded-lg transition-colors bg-white border border-slate-200 shadow-sm"
                                                title="Mark as Completed"
                                            >
                                                <CheckCircle2 size={16} />
                                            </button>
                                        )}
                                        {hasPermission('Maintenance', 'edit') && (
                                            <button
                                                onClick={() => {
                                                    setEditingTask(task);
                                                    setShowAddModal(true);
                                                    setSelectedBuildingIds(task.buildingId ? [task.buildingId] : []);
                                                }}
                                                className="p-2 hover:bg-amber-50 hover:text-amber-600 rounded-lg transition-colors bg-white border border-slate-200 shadow-sm"
                                                title="Edit Task"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                        )}
                                        {hasPermission('Maintenance', 'delete') && (
                                            <button
                                                onClick={() => handleDeleteTask(task.dbId)}
                                                className="p-2 hover:bg-rose-50 hover:text-rose-600 rounded-lg transition-colors bg-white border border-slate-200 shadow-sm"
                                                title="Delete Task"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {filteredTasks.length === 0 && (
                                <div className="p-12 text-center text-slate-400">
                                    No maintenance tasks found matching your criteria.
                                </div>
                            )}
                            {filteredTasks.length > tasksPerPage && (
                                <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-t border-slate-100">
                                    <span className="text-xs text-slate-500 font-medium select-none">
                                        Showing {Math.min((currentPage - 1) * tasksPerPage + 1, filteredTasks.length)} to {Math.min(currentPage * tasksPerPage, filteredTasks.length)} of {filteredTasks.length} tasks
                                    </span>
                                    <div className="flex items-center gap-1.5">
                                        <button 
                                            type="button"
                                            disabled={currentPage === 1}
                                            onClick={() => setCurrentPage(prev => prev - 1)}
                                            className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 disabled:opacity-30 hover:bg-slate-50 cursor-pointer transition-all hover:border-slate-300"
                                        >
                                            <ChevronLeft size={16} />
                                        </button>
                                        
                                        {Array.from({ length: Math.ceil(filteredTasks.length / tasksPerPage) }, (_, i) => i + 1).map(pageNum => (
                                            <button
                                                key={pageNum}
                                                type="button"
                                                onClick={() => setCurrentPage(pageNum)}
                                                className={clsx(
                                                    "w-8 h-8 flex items-center justify-center rounded-lg border text-xs font-bold transition-all cursor-pointer",
                                                    currentPage === pageNum 
                                                        ? "bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-100" 
                                                        : "bg-white text-slate-600 border-slate-200 hover:border-indigo-400 hover:text-indigo-600"
                                                )}
                                            >
                                                {pageNum}
                                            </button>
                                        ))}

                                        <button 
                                            type="button"
                                            disabled={currentPage * tasksPerPage >= filteredTasks.length}
                                            onClick={() => setCurrentPage(prev => prev + 1)}
                                            className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 disabled:opacity-30 hover:bg-slate-50 cursor-pointer transition-all hover:border-slate-300"
                                        >
                                            <ChevronRight size={16} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>
                ) : (
                    <CalendarView
                        tasks={filteredTasks}
                        currentMonth={currentMonth}
                        setCurrentMonth={setCurrentMonth}
                        onEdit={(t) => {
                            setEditingTask(t);
                            setShowAddModal(true);
                            setSelectedBuildingIds(t.buildingId ? [t.buildingId] : []);
                        }}
                    />
                )}
            </div>

            {(showAddModal || editingTask) && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[85vh]">
                        <div className="p-6 border-b border-slate-50 flex items-center justify-between flex-shrink-0">
                            <h3 className="text-xl font-bold text-slate-800">
                                {editingTask ? 'Edit Maintenance Task' : 'Add New Maintenance Task'}
                            </h3>
                            <button onClick={() => { setShowAddModal(false); setEditingTask(null); setAllBuildingsSelected(false); }} className="text-slate-400 hover:text-slate-600">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleSaveTask} className="flex flex-col flex-1 overflow-hidden">
                            <div className="p-8 space-y-4 overflow-y-auto flex-1">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5 col-span-2">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Task Name</label>
                                        <input name="name" required defaultValue={editingTask?.name} className="w-full h-11 px-4 rounded-xl border border-slate-200 outline-none focus:border-indigo-500 font-medium" placeholder="e.g. Elevator Inspection" />
                                    </div>
                                    <div className="space-y-1.5 col-span-2">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex justify-between">
                                            <span>Target Building(s)</span>
                                        </label>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 border border-slate-200 p-3 rounded-xl max-h-[140px] overflow-y-auto bg-slate-50">
                                            <label className="flex items-center gap-2 p-1.5 hover:bg-white transition-colors cursor-pointer text-sm font-bold text-indigo-600 border border-transparent hover:border-slate-100 rounded-lg">
                                                <input 
                                                    type="checkbox" 
                                                    name="allBuildings" 
                                                    value="true" 
                                                    checked={allBuildingsSelected}
                                                    onChange={(e) => setAllBuildingsSelected(e.target.checked)}
                                                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" 
                                                />
                                                🏢 All Buildings
                                            </label>
                                            <hr className="sm:col-span-2 border-slate-200" />
                                            {buildings.map(b => (
                                                <label key={b.id} className={clsx("flex items-center gap-2 p-1.5 hover:bg-white transition-colors cursor-pointer text-sm font-medium text-slate-700 border border-transparent hover:border-slate-100 rounded-lg", allBuildingsSelected && "opacity-40 pointer-events-none")}>
                                                    <input 
                                                        type="checkbox" 
                                                        name="buildingId" 
                                                        value={b.id} 
                                                        checked={allBuildingsSelected || selectedBuildingIds.includes(b.id)}
                                                        disabled={allBuildingsSelected}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setSelectedBuildingIds(prev => [...prev, b.id]);
                                                            } else {
                                                                setSelectedBuildingIds(prev => prev.filter(id => id !== b.id));
                                                            }
                                                        }}
                                                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" 
                                                    />
                                                    {b.name}
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Task Type</label>
                                        <input name="type" required defaultValue={editingTask?.type} className="w-full h-11 px-4 rounded-xl border border-slate-200 outline-none focus:border-indigo-500 font-medium" placeholder="e.g. HVAC, Fire, etc." />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Frequency</label>
                                        <select name="frequency" required defaultValue={editingTask?.frequency} className="w-full h-11 px-4 rounded-xl border border-slate-200 outline-none focus:border-indigo-500 font-medium bg-white">
                                            <option value="One-time">One-time</option>
                                            <option value="Monthly">Monthly</option>
                                            <option value="Yearly">Yearly</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Next Due Date</label>
                                        <input name="dueDate" type="date" required defaultValue={editingTask?.dueDate} className="w-full h-11 px-4 rounded-xl border border-slate-200 outline-none focus:border-indigo-500 font-medium" />
                                    </div>
                                    <div className="space-y-1.5 col-span-2">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Vendor Name</label>
                                        <input name="vendor" defaultValue={editingTask?.vendor} className="w-full h-11 px-4 rounded-xl border border-slate-200 outline-none focus:border-indigo-500 font-medium" placeholder="Contractor or Service Provider" />
                                    </div>
                                    <div className="space-y-1.5 col-span-2">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Notes</label>
                                        <textarea name="notes" defaultValue={editingTask?.notes} className="w-full h-24 p-4 rounded-xl border border-slate-200 outline-none focus:border-indigo-500 font-medium resize-none text-sm" placeholder="Any specific details..." />
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-3 p-6 border-t border-slate-50 flex-shrink-0">
                                <Button type="button" variant="secondary" className="flex-1" onClick={() => { setShowAddModal(false); setEditingTask(null); }}>Cancel</Button>
                                <Button type="submit" variant="primary" className="flex-1">Save Task</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </MainLayout>
    );
};

const CalendarView = ({ tasks, currentMonth, setCurrentMonth, onEdit }) => {
    const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const totalDays = daysInMonth(year, month);
    const startDay = firstDayOfMonth(year, month);

    const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
    const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    const calendarDays = [];
    for (let i = 0; i < startDay; i++) calendarDays.push(null);
    for (let d = 1; d <= totalDays; d++) calendarDays.push(d);

    const getTasksForDay = (day) => {
        if (!day) return [];
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return tasks.filter(t => t.dueDate === dateStr);
    };

    return (
        <section className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Calendar className="text-indigo-600" size={20} />
                    {monthNames[month]} {year}
                </h3>
                <div className="flex gap-2">
                    <button onClick={prevMonth} className="p-2 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-all text-slate-600">
                        <ChevronLeft size={20} />
                    </button>
                    <button onClick={() => setCurrentMonth(new Date())} className="px-4 py-2 text-sm font-bold text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all">
                        Today
                    </button>
                    <button onClick={nextMonth} className="p-2 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-all text-slate-600">
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-7 border-b border-slate-100">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                    <div key={d} className="py-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] bg-slate-50/30">
                        {d}
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-7 auto-rows-[120px]">
                {calendarDays.map((day, i) => {
                    const dayTasks = getTasksForDay(day);
                    const isToday = day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();

                    return (
                        <div key={i} className={clsx(
                            "border-r border-b border-slate-100 p-2 transition-colors overflow-hidden group",
                            !day ? "bg-slate-50/30" : "hover:bg-slate-50/50 cursor-default"
                        )}>
                            {day && (
                                <>
                                    <div className="flex justify-between items-start mb-1">
                                        <span className={clsx(
                                            "text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full transition-all",
                                            isToday ? "bg-indigo-600 text-white shadow-md shadow-indigo-200" : "text-slate-400"
                                        )}>
                                            {day}
                                        </span>
                                        {dayTasks.length > 0 && (
                                            <span className="text-[10px] font-black text-indigo-400 bg-indigo-50 px-1.5 py-0.5 rounded-md">
                                                {dayTasks.length} {dayTasks.length === 1 ? 'TASK' : 'TASKS'}
                                            </span>
                                        )}
                                    </div>
                                    <div className="space-y-1 overflow-y-auto max-h-[85px] scrollbar-none">
                                        {dayTasks.map(t => (
                                            <div
                                                key={t.id}
                                                onClick={() => onEdit(t)}
                                                className={clsx(
                                                    "p-1.5 rounded text-[10px] font-bold border truncate cursor-pointer transition-all hover:scale-[1.02]",
                                                    t.status === 'Completed' ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                                                    t.status === 'Overdue' ? "bg-red-50 text-red-700 border-red-100" :
                                                    "bg-amber-50 text-amber-700 border-amber-100"
                                                )}
                                                title={`${t.name} - ${t.building}`}
                                            >
                                                {t.name}
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    );
                })}
            </div>
        </section>
    );
};

const StatCard = ({ label, value, icon: Icon, color }) => {
    const colorStyles = {
        indigo: 'text-indigo-600 bg-indigo-50 border-indigo-100',
        amber: 'text-amber-600 bg-amber-50 border-amber-100',
        red: 'text-red-600 bg-red-50 border-red-100',
        emerald: 'text-emerald-600 bg-emerald-50 border-emerald-100',
    };

    return (
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
            <div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
                <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-slate-800 tracking-tight">{value}</span>
                </div>
            </div>
            <div className={clsx("w-14 h-14 rounded-2xl flex items-center justify-center border", colorStyles[color])}>
                <Icon size={28} />
            </div>
        </div>
    );
};
