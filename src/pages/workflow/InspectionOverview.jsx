import React, { useState, useEffect } from 'react';
import { 
    ChevronRight, 
    ArrowLeft, 
    Edit2, 
    MoreHorizontal, 
    CheckCircle2, 
    FileText, 
    Image as ImageIcon, 
    MessageSquare, 
    History,
    MoreVertical,
    Clock,
    AlertCircle,
    User,
    Building2,
    Home,
    Download,
    XCircle,
    ArrowRight
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import api from '../../api/client';
import { MainLayout } from '../../layouts/MainLayout';

const InspectionOverview = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const [inspection, setInspection] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('Overview');

    useEffect(() => {
        fetchInspectionDetails();
    }, [id]);

    const fetchInspectionDetails = async () => {
        try {
            const res = await api.get(`/api/admin/workflow/inspections/${id}`);
            if (res.data.success) {
                setInspection(res.data.data);
            }
        } catch (error) {
            console.error('Error fetching inspection details:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500 font-black uppercase tracking-widest">Loading inspection details...</div>;
    if (!inspection) return <div className="p-8 text-center text-red-500 font-black uppercase tracking-widest">Inspection not found</div>;

    const stats = {
        totalItems: inspection.template?.structure?.rooms?.reduce((acc, room) => acc + (room.questions?.length || 0), 0) || 0,
        completed: inspection.responses?.length || 0,
        pending: 0,
        na: 0,
        percent: 0
    };
    
    stats.pending = Math.max(0, stats.totalItems - stats.completed);
    stats.percent = stats.totalItems > 0 ? Math.round((stats.completed / stats.totalItems) * 100) : 0;

    return (
        <MainLayout title="Inspection Details">
            <div className="p-0 bg-transparent min-h-screen">
            {/* Header */}
            <div className="max-w-7xl mx-auto flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="p-2.5 bg-white rounded-2xl border border-gray-100 text-gray-400 hover:text-gray-900 transition-colors shadow-sm">
                        <ArrowLeft size={20} />
                    </button>
                    <div className="flex flex-col">
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-black text-gray-900 tracking-tighter">{inspection.template?.name}</h1>
                            <span className={`text-[10px] font-black px-2 py-1 rounded-lg uppercase border tracking-widest ${
                                inspection.status === 'COMPLETED' ? 'bg-green-50 text-green-600 border-green-100' : 
                                inspection.status === 'DRAFT' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                'bg-gray-50 text-gray-500 border-gray-100'
                            }`}>{inspection.status}</span>
                        </div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mt-1">
                            Inspection ID: INSP-{inspection.id.toString().padStart(5, '0')} • 
                            Type: {inspection.template?.type} • 
                            Created: {format(new Date(inspection.createdAt), 'MMM dd, yyyy')} • 
                            Inspector: {inspection.inspector?.name}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => navigate(`/admin/workflow/inspections/${id}/form`)}
                        className="p-2.5 bg-white rounded-2xl border border-gray-100 text-gray-400 hover:text-gray-900 transition-colors shadow-sm"
                        title="Edit Inspection"
                    >
                        <Edit2 size={18} />
                    </button>
                    <div className="relative group/more">
                        <button className="p-2.5 bg-white rounded-2xl border border-gray-100 text-gray-400 hover:text-gray-900 transition-colors shadow-sm">
                            <MoreHorizontal size={18} />
                        </button>
                        <div className="absolute right-0 top-full pt-2 w-48 hidden group-hover/more:block z-50">
                            <div className="bg-white rounded-xl shadow-xl border border-gray-100 py-2">
                                <button 
                                    onClick={async () => {
                                        if (window.confirm('Are you sure you want to delete this inspection? This cannot be undone.')) {
                                            try {
                                                await api.delete(`/api/admin/workflow/inspections/${id}`);
                                                navigate('/admin/workflow/inspections');
                                            } catch (e) {
                                                alert('Failed to delete: ' + (e.response?.data?.message || e.message));
                                            }
                                        }
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 font-bold flex items-center gap-2"
                                >
                                    <XCircle size={16} />
                                    Delete Inspection
                                </button>
                            </div>
                        </div>
                    </div>
                    {inspection.status !== 'COMPLETED' && (
                        <button 
                            onClick={() => navigate(`/admin/workflow/inspections/${id}/form`)}
                            className="px-8 py-2.5 bg-indigo-600 text-white rounded-2xl text-sm font-black shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95"
                        >
                            {inspection.responses?.length > 0 ? 'Resume Inspection' : 'Start Inspection'}
                        </button>
                    )}
                </div>
            </div>

            {/* Content Grid */}
            <div className="max-w-7xl mx-auto grid grid-cols-12 gap-8">
                
                {/* Left Column: Details & Progress */}
                <div className="col-span-8 flex flex-col gap-8">
                    
                    {/* Tabs Bar */}
                    <div className="flex items-center gap-8 border-b border-gray-100 pb-1">
                        <Tab label="Overview" active={activeTab === 'Overview'} icon={FileText} onClick={() => setActiveTab('Overview')} />
                        <Tab label="Inspection Form" icon={CheckCircle2} onClick={() => navigate(`/admin/workflow/inspections/${id}/form`)} />
                        <Tab label={`Photos (${inspection.responses?.filter(r => r.photoUrl).length || 0})`} active={activeTab === 'Photos'} icon={ImageIcon} onClick={() => setActiveTab('Photos')} />
                        <Tab label={`Notes (${inspection.responses?.filter(r => r.notes).length || 0})`} active={activeTab === 'Notes'} icon={MessageSquare} onClick={() => setActiveTab('Notes')} />
                        <Tab label="History" active={activeTab === 'History'} icon={History} onClick={() => setActiveTab('History')} />
                    </div>

                    {activeTab === 'Overview' ? (
                        <>
                            <div className="grid grid-cols-2 gap-8">
                                {/* Inspection Details Card */}
                                <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
                                    <h3 className="text-lg font-black text-gray-900 mb-6 tracking-tight uppercase tracking-widest text-[11px] text-gray-400">Inspection Details</h3>
                                    <div className="flex flex-col gap-5">
                                        <DetailRow label="Inspection Type" value={inspection.template?.type} />
                                        <DetailRow label="Template" value={inspection.template?.name} />
                                        <DetailRow label="Status" value={inspection.status} status={inspection.status === 'COMPLETED' ? 'green' : 'blue'} />
                                        <DetailRow label="Created Date" value={format(new Date(inspection.createdAt), 'MMM dd, yyyy p')} />
                                        <DetailRow label="Last Updated" value={format(new Date(inspection.updatedAt), 'MMM dd, yyyy p')} />
                                    </div>
                                </div>

                                {/* Inspector / Property Info */}
                                <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
                                    <h3 className="text-lg font-black text-gray-900 mb-6 tracking-tight uppercase tracking-widest text-[11px] text-gray-400">Assignment & Location</h3>
                                    <div className="flex flex-col gap-5">
                                        <DetailRow label="Inspector" value={inspection.inspector?.name} icon={User} />
                                        <DetailRow label="Tenant" value={inspection.lease?.tenant?.name || 'N/A'} icon={User} />
                                        <DetailRow label="Unit / Bedroom" value={inspection.unit?.name} icon={Home} />
                                        <DetailRow label="Unit Type" value={inspection.unit?.unitType || 'Standard'} />
                                        <DetailRow label="Priority" value="Normal" status="orange" />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-8">
                                {/* Progress Summary */}
                                <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm flex flex-col items-center">
                                    <h3 className="text-lg font-black text-gray-900 mb-8 self-start uppercase tracking-widest text-[11px] text-gray-400">Progress Summary</h3>
                                    <div className="relative w-48 h-48 mb-8">
                                        <svg className="w-full h-full transform -rotate-90">
                                            <circle cx="96" cy="96" r="88" stroke="currentColor" strokeWidth="16" fill="transparent" className="text-gray-50" />
                                            <circle cx="96" cy="96" r="88" stroke="currentColor" strokeWidth="16" fill="transparent" strokeDasharray={552} strokeDashoffset={552 - (552 * stats.percent) / 100} className="text-indigo-600 transition-all duration-1000" />
                                        </svg>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                                            <span className="text-4xl font-black text-gray-900 leading-none">{stats.percent}%</span>
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Completed</span>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-x-12 gap-y-4 w-full">
                                        <ProgressItem label="Total Items" value={stats.totalItems} color="bg-gray-400" />
                                        <ProgressItem label="Completed" value={stats.completed} color="bg-green-500" />
                                        <ProgressItem label="Pending" value={stats.pending} color="bg-orange-500" />
                                        <ProgressItem label="N/A" value={stats.na} color="bg-gray-200" />
                                    </div>
                                </div>

                                {/* Ticket Summary */}
                                <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
                                    <h3 className="text-lg font-black text-gray-900 mb-6 uppercase tracking-widest text-[11px] text-gray-400">Ticket Summary</h3>
                                    <div className="flex flex-col gap-4">
                                        <TicketStat icon={AlertCircle} label="Total Tickets" value={inspection.tickets?.length || 0} color="bg-red-50 text-red-600" />
                                        <TicketStat icon={Clock} label="Open Tickets" value={inspection.tickets?.filter(t => t.status === 'Open').length || 0} color="bg-orange-50 text-orange-600" />
                                        <TicketStat icon={CheckCircle2} label="Resolved Tickets" value={inspection.tickets?.filter(t => t.status === 'Resolved').length || 0} color="bg-green-50 text-green-600" />
                                    </div>
                                    <button 
                                        onClick={() => navigate('/tickets')}
                                        className="w-full mt-8 py-3 rounded-2xl bg-gray-50 text-[11px] font-black text-gray-500 uppercase tracking-widest hover:bg-gray-100 transition-all border border-gray-100 shadow-inner"
                                    >
                                        View All Tickets
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : activeTab === 'Photos' ? (
                        <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm min-h-[400px]">
                            <h3 className="text-lg font-black text-gray-900 mb-6 uppercase tracking-widest text-[11px] text-gray-400">Inspection Photos</h3>
                            <div className="grid grid-cols-3 gap-4">
                                {inspection.responses?.filter(r => r.photoUrl).map((resp, i) => (
                                    <div key={i} className="aspect-square rounded-2xl overflow-hidden border border-gray-100 group relative">
                                        <img src={resp.photoUrl} alt="Inspection" className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <span className="text-white text-[10px] font-black uppercase tracking-widest">{resp.questionText || 'Room Detail'}</span>
                                        </div>
                                    </div>
                                ))}
                                {inspection.responses?.filter(r => r.photoUrl).length === 0 && (
                                    <div className="col-span-3 flex flex-col items-center justify-center py-20 text-gray-300">
                                        <ImageIcon size={48} className="mb-4 opacity-20" />
                                        <p className="font-bold uppercase text-xs tracking-widest">No photos found for this inspection</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : activeTab === 'Notes' ? (
                        <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm min-h-[400px]">
                            <h3 className="text-lg font-black text-gray-900 mb-6 uppercase tracking-widest text-[11px] text-gray-400">Inspection Notes</h3>
                            <div className="flex flex-col gap-4">
                                {inspection.responses?.filter(r => r.notes).map((resp, i) => (
                                    <div key={i} className="p-5 bg-gray-50 rounded-2xl border border-gray-100">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{resp.questionText || 'Observation'}</span>
                                            <span className="text-[10px] font-bold text-gray-400">{resp.response || 'N/A'}</span>
                                        </div>
                                        <p className="text-sm font-bold text-gray-700 leading-relaxed">{resp.notes}</p>
                                    </div>
                                ))}
                                {inspection.responses?.filter(r => r.notes).length === 0 && (
                                    <div className="flex flex-col items-center justify-center py-20 text-gray-300">
                                        <MessageSquare size={48} className="mb-4 opacity-20" />
                                        <p className="font-bold uppercase text-xs tracking-widest">No notes recorded for this inspection</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm min-h-[400px]">
                            <h3 className="text-lg font-black text-gray-900 mb-6 uppercase tracking-widest text-[11px] text-gray-400">Activity History</h3>
                            <div className="flex flex-col gap-6 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-50">
                                <TimelineEvent icon={CheckCircle2} color="bg-green-500" label="Inspection Created" time={format(new Date(inspection.createdAt), 'MMM dd, yyyy p')} />
                                {inspection.status === 'COMPLETED' && (
                                    <TimelineEvent icon={CheckCircle2} color="bg-indigo-500" label="Inspection Completed & Signed" time={format(new Date(inspection.updatedAt), 'MMM dd, yyyy p')} />
                                )}
                            </div>
                        </div>
                    )}

                </div>

                {/* Right Column: Actions & Timeline */}
                <div className="col-span-4 flex flex-col gap-8">
                    
                    {/* Action Cards */}
                    <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm flex flex-col gap-4">
                        <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest pl-2 mb-2">Actions</h3>
                        {inspection.status !== 'COMPLETED' ? (
                            <QuickAction 
                                icon={ArrowRight} 
                                label={inspection.responses?.length > 0 ? 'Resume Inspection' : 'Start Inspection'} 
                                color="bg-indigo-600 text-white" 
                                onClick={() => navigate(`/admin/workflow/inspections/${id}/form`)}
                            />
                        ) : (
                            <QuickAction 
                                icon={FileText} 
                                label="View Full Report" 
                                color="bg-indigo-600 text-white" 
                                onClick={async () => {
                                    try {
                                        const response = await api.get(`/api/admin/workflow/inspections/${id}/download`, { responseType: 'blob' });
                                        const file = new Blob([response.data], { type: 'application/pdf' });
                                        const fileURL = URL.createObjectURL(file);
                                        window.open(fileURL, '_blank');
                                    } catch (e) { console.error('Failed to view report', e); }
                                }}
                            />
                        )}
                        <QuickAction 
                            icon={Download} 
                            label="Download PDF" 
                            color="bg-gray-50 text-gray-600 border border-gray-100" 
                            onClick={async () => {
                                try {
                                    const response = await api.get(`/api/admin/workflow/inspections/${id}/download`, { responseType: 'blob' });
                                    const url = window.URL.createObjectURL(new Blob([response.data]));
                                    const link = document.createElement('a');
                                    link.href = url;
                                    link.setAttribute('download', `inspection-${id}.pdf`);
                                    document.body.appendChild(link);
                                    link.click();
                                    link.remove();
                                } catch (e) { console.error('Download failed', e); }
                            }}
                        />
                        {inspection.status !== 'COMPLETED' && (
                            <QuickAction 
                                icon={XCircle} 
                                label="Cancel Inspection" 
                                color="bg-red-50 text-red-500 border border-red-100" 
                                onClick={async () => {
                                    if (window.confirm('Are you sure you want to cancel this inspection?')) {
                                        try {
                                            await api.put(`/api/admin/workflow/inspections/${id}`, { status: 'CANCELLED' });
                                            fetchInspectionDetails();
                                        } catch (e) { console.error('Cancel failed', e); }
                                    }
                                }}
                            />
                        )}
                    </div>

                    {/* Property Image / Info */}
                    <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm">
                        <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest pl-2 mb-4">Property Information</h3>
                        <div className="w-full h-40 rounded-2xl bg-gray-100 mb-4 overflow-hidden relative group">
                            <img src="https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&q=80&w=400" alt="Building" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                            <div className="absolute bottom-3 left-3 text-white">
                                <p className="text-xs font-black uppercase tracking-widest">{inspection.unit?.property?.name || 'Building'}</p>
                                <p className="text-[10px] font-bold opacity-80">{inspection.unit?.name}</p>
                            </div>
                        </div>
                        <div className="flex flex-col gap-2 px-1">
                            <div className="flex items-center justify-between text-xs font-bold text-gray-900">
                                <span>Unit / Bedroom</span>
                                <span className="text-indigo-600">{inspection.unit?.name}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs font-bold text-gray-900">
                                <span>Unit Type</span>
                                <span className="text-gray-500">{inspection.unit?.unitType || 'Standard'}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs font-bold text-gray-900">
                                <span>Tenant</span>
                                <span className="text-gray-500">{inspection.lease?.tenant?.name || 'N/A'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Activity Timeline */}
                    <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm flex-1">
                        <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest pl-2 mb-6">Activity Timeline</h3>
                        <div className="flex flex-col gap-6 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-50">
                            <TimelineEvent icon={CheckCircle2} color="bg-green-500" label="Inspection created" time={format(new Date(inspection.createdAt), 'MMM dd, yyyy p')} />
                            {inspection.status === 'COMPLETED' && (
                                <TimelineEvent icon={CheckCircle2} color="bg-indigo-500" label="Inspection completed" time={format(new Date(inspection.completedAt), 'MMM dd, yyyy p')} />
                            )}
                        </div>
                        <button className="w-full mt-8 text-[11px] font-black text-gray-400 uppercase tracking-widest hover:text-indigo-600 transition-colors">View Full History</button>
                    </div>

                </div>
            </div>
            </div>
        </MainLayout>
    );
};

const Tab = ({ label, active, icon: Icon, onClick }) => (
    <button 
        onClick={onClick}
        className={`flex items-center gap-2 px-2 py-3 border-b-2 transition-all text-xs font-black uppercase tracking-widest
        ${active ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
    >
        <Icon size={14} />
        {label}
    </button>
);

const DetailRow = ({ label, value, status, icon: Icon }) => (
    <div className="flex items-center justify-between group">
        <span className="text-xs font-bold text-gray-400">{label}</span>
        <div className="flex items-center gap-2">
            {Icon && <Icon size={14} className="text-gray-300" />}
            <span className={`text-xs font-black transition-all ${
                status === 'blue' ? 'text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100' : 
                status === 'orange' ? 'text-orange-600 bg-orange-50 px-2 py-0.5 rounded-lg border border-orange-100' : 
                'text-gray-900'
            }`}>{value}</span>
        </div>
    </div>
);

const ProgressItem = ({ label, value, color }) => (
    <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${color}`} />
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</span>
        </div>
        <span className="text-xs font-black text-gray-900">{value}</span>
    </div>
);

const TicketStat = ({ icon: Icon, label, value, color }) => (
    <div className={`p-4 rounded-2xl border border-transparent hover:border-gray-100 transition-all flex items-center justify-between ${color}`}>
        <div className="flex items-center gap-3">
            <Icon size={20} />
            <span className="text-xs font-black uppercase tracking-widest">{label}</span>
        </div>
        <span className="text-xl font-black">{value}</span>
    </div>
);

const QuickAction = ({ icon: Icon, label, color, onClick }) => (
    <button 
        onClick={onClick}
        className={`w-full py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all active:scale-95 shadow-sm hover:shadow-lg ${color}`}
    >
        <Icon size={18} />
        {label}
    </button>
);

const TimelineEvent = ({ icon: Icon, color, label, time }) => (
    <div className="flex items-start gap-4 relative z-10">
        <div className={`w-6 h-6 rounded-full ${color} text-white flex items-center justify-center shadow-lg shadow-${color}/20`}>
            <Icon size={12} />
        </div>
        <div className="flex flex-col gap-0.5">
            <span className="text-xs font-black text-gray-900 leading-none">{label}</span>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{time}</span>
        </div>
    </div>
);

const PlayCircle = (props) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <polygon points="10 8 16 12 10 16 10 8" />
  </svg>
)

export default InspectionOverview;
