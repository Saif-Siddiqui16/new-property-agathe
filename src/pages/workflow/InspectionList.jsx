import React, { useState, useEffect } from 'react';
import { 
    Plus, 
    Search, 
    Filter, 
    Calendar, 
    ChevronRight, 
    MoreVertical, 
    FileText, 
    CheckCircle2, 
    Clock, 
    AlertCircle,
    User,
    ClipboardList,
    Download,
    Eye
} from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { MainLayout } from '../../layouts/MainLayout';

const InspectionList = () => {
    const navigate = useNavigate();
    const [inspections, setInspections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0
    });
    const [filters, setFilters] = useState({
        type: 'All',
        status: 'All',
        building: 'All Buildings',
        unit: 'All Units',
        inspector: 'All Inspectors',
        search: '',
        myInspections: false
    });

    useEffect(() => {
        fetchInspections();
    }, [pagination.page]);

    const fetchInspections = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/api/admin/workflow/inspections?page=${pagination.page}&limit=${pagination.limit}`);
            if (res.data.success) {
                const mappedData = res.data.data.map(insp => ({
                    id: insp.id,
                    type: insp.template?.name || (insp.template?.type === 'MOVE_OUT' ? 'Move-Out' : 'Move-In'),
                    unit: insp.unit?.name || 'Unknown',
                    tenant: insp.lease?.tenant?.name || 'No Tenant',
                    date: format(new Date(insp.createdAt), 'MMM dd, yyyy'),
                    inspector: insp.inspector?.name || 'N/A',
                    status: insp.status === 'DRAFT' ? 'In Progress' : (insp.status === 'COMPLETED' ? 'Completed' : 'Scheduled'),
                    signature: insp.tenantSignature ? 'Signed' : 'Pending',
                    tickets: insp.tickets?.length || 0
                }));
                setInspections(mappedData);
                if (res.data.pagination) {
                    setPagination(prev => ({
                        ...prev,
                        total: res.data.pagination.total,
                        totalPages: res.data.pagination.totalPages
                    }));
                }
            }
        } catch (error) {
            console.error('Error fetching inspections:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusStyle = (status) => {
        switch (status) {
            case 'Completed': return 'bg-green-50 text-green-600 border-green-100';
            case 'In Progress': return 'bg-blue-50 text-blue-600 border-blue-100';
            case 'Scheduled': return 'bg-gray-50 text-gray-500 border-gray-100';
            default: return 'bg-gray-50 text-gray-500 border-gray-100';
        }
    };

    const getSignatureStyle = (sig) => {
        return sig === 'Signed' ? 'text-green-600 bg-green-50' : 'text-orange-600 bg-orange-50';
    };

    const filteredInspections = inspections.filter(insp => {
        const matchesSearch = 
            insp.unit.toLowerCase().includes(filters.search.toLowerCase()) ||
            insp.tenant.toLowerCase().includes(filters.search.toLowerCase()) ||
            insp.type.toLowerCase().includes(filters.search.toLowerCase()) ||
            insp.inspector.toLowerCase().includes(filters.search.toLowerCase());
        
        const matchesType = filters.type === 'All' || insp.type === filters.type;
        const matchesStatus = filters.status === 'All' || insp.status === filters.status;
        const matchesInspector = filters.inspector === 'All Inspectors' || insp.inspector === filters.inspector;
        const matchesUnit = filters.unit === 'All Units' || insp.unit === filters.unit;
        const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
        const matchesMyInspections = !filters.myInspections || insp.inspector === currentUser.name;

        return matchesSearch && matchesType && matchesStatus && matchesInspector && matchesUnit && matchesMyInspections;
    });

    const uniqueInspectors = ['All Inspectors', ...new Set(inspections.map(i => i.inspector))];
    const uniqueUnits = ['All Units', ...new Set(inspections.map(i => i.unit))];
    const uniqueTypes = ['All', ...new Set(inspections.map(i => i.type))];
    const uniqueStatuses = ['All', 'Scheduled', 'In Progress', 'Completed'];

    if (loading) return <div className="p-8 text-center text-gray-500 font-black tracking-tighter">LOADING INSPECTIONS...</div>;

    return (
        <MainLayout title="Inspection List">
            <div className="p-4 sm:p-0 bg-transparent min-h-screen">
                {/* Responsive Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tighter">Inspections</h1>
                        <p className="text-gray-500 text-sm font-medium">Manage and track property inspections across all units</p>
                    </div>
                    <button 
                        onClick={() => navigate('/admin/workflow/inspections/new')}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 sm:py-2.5 bg-indigo-600 text-white rounded-2xl text-sm font-black hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all active:scale-95"
                    >
                        <Plus size={18} />
                        New Inspection
                    </button>
                </div>

                {/* Filters Bar - Scrollable on Mobile */}
                <div className="flex items-center gap-4 mb-8 bg-white p-3 rounded-2xl border border-gray-100 shadow-sm overflow-x-auto no-scrollbar">
                    <div className="flex items-center gap-4 min-w-max">
                        <FilterGroup label="Type" value={filters.type} options={uniqueTypes} onChange={(val) => setFilters({...filters, type: val})} />
                        <FilterGroup label="Status" value={filters.status} options={uniqueStatuses} onChange={(val) => setFilters({...filters, status: val})} />
                        <FilterGroup label="Unit" value={filters.unit} options={uniqueUnits} onChange={(val) => setFilters({...filters, unit: val})} />
                        <FilterGroup label="Inspector" value={filters.inspector} options={uniqueInspectors} onChange={(val) => setFilters({...filters, inspector: val})} />
                    </div>
                    
                    <div className="flex-1 min-w-[200px] relative ml-2">
                        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input 
                            type="text" 
                            placeholder="Search..." 
                            value={filters.search}
                            onChange={(e) => setFilters({...filters, search: e.target.value})}
                            className="w-full pl-12 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
                        />
                    </div>

                    <div className="flex items-center gap-2 ml-4 min-w-max">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">My</span>
                        <button 
                            onClick={() => setFilters({...filters, myInspections: !filters.myInspections})}
                            className={`w-10 h-5 rounded-full relative transition-all ${filters.myInspections ? 'bg-indigo-600' : 'bg-gray-200'}`}
                        >
                            <div className={`absolute top-1 w-3 h-3 bg-white rounded-full shadow-sm transition-all ${filters.myInspections ? 'left-6' : 'left-1'}`} />
                        </button>
                    </div>
                </div>

                {/* Table - Hidden on very small screens, scrollable on tablets */}
                <div className="hidden sm:block bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[900px]">
                            <thead>
                                <tr className="bg-gray-50/50 border-b border-gray-100 text-[11px] font-black text-gray-400 uppercase tracking-widest">
                                    <th className="px-6 py-4">Inspection Type</th>
                                    <th className="px-6 py-4">Unit</th>
                                    <th className="px-6 py-4 hidden lg:table-cell">Tenant</th>
                                    <th className="px-6 py-4 hidden md:table-cell">Date</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Signature</th>
                                    <th className="px-6 py-4 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredInspections.map((insp) => (
                                    <tr 
                                        key={insp.id} 
                                        onClick={() => navigate(`/admin/workflow/inspections/${insp.id}`)}
                                        className="hover:bg-gray-50/50 transition-colors group cursor-pointer"
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-2 h-2 rounded-full ${insp.type === 'Move-Out' ? 'bg-blue-500' : 'bg-indigo-500'}`} />
                                                <span className="font-bold text-gray-900">{insp.type}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-black text-gray-700">{insp.unit}</td>
                                        <td className="px-6 py-4 hidden lg:table-cell">
                                            <div className="flex items-center gap-2 text-sm font-bold text-gray-600">
                                                <div className="w-6 h-6 rounded-full bg-indigo-50 flex items-center justify-center text-[10px] text-indigo-600">
                                                    {insp.tenant.charAt(0)}
                                                </div>
                                                <span className="truncate max-w-[120px]">{insp.tenant}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-bold text-gray-500 hidden md:table-cell">{insp.date}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border ${getStatusStyle(insp.status)}`}>
                                                {insp.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase ${getSignatureStyle(insp.signature)}`}>
                                                {insp.signature}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-center gap-2">
                                                <button 
                                                    onClick={(e) => { 
                                                        e.stopPropagation(); 
                                                        if (insp.status === 'Completed') {
                                                            navigate(`/admin/workflow/inspections/${insp.id}`);
                                                        } else {
                                                            navigate(`/admin/workflow/inspections/${insp.id}/form`);
                                                        }
                                                    }}
                                                    className="px-4 py-2 bg-gray-50 rounded-xl text-[10px] font-black text-gray-700 uppercase hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                                                >
                                                    {insp.status === 'Completed' ? 'Report' : 'Open'}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Mobile Card Layout - Shown only on small screens */}
                <div className="flex flex-col gap-4 sm:hidden">
                    {filteredInspections.map((insp) => (
                        <div 
                            key={insp.id}
                            onClick={() => navigate(`/admin/workflow/inspections/${insp.id}`)}
                            className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm active:scale-[0.98] transition-all"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${insp.type === 'Move-Out' ? 'bg-blue-500' : 'bg-indigo-500'}`} />
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{insp.type}</span>
                                    </div>
                                    <h3 className="text-xl font-black text-gray-900 tracking-tight">Unit {insp.unit}</h3>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border ${getStatusStyle(insp.status)}`}>
                                    {insp.status}
                                </span>
                            </div>
                            
                            <div className="flex items-center justify-between text-sm font-bold text-gray-500">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-indigo-50 flex items-center justify-center text-[10px] text-indigo-600">
                                        {insp.tenant.charAt(0)}
                                    </div>
                                    {insp.tenant}
                                </div>
                                <span>{insp.date}</span>
                            </div>

                            <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between">
                                <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase ${getSignatureStyle(insp.signature)}`}>
                                    Signature: {insp.signature}
                                </span>
                                <button className="text-indigo-600 font-black text-xs uppercase tracking-widest flex items-center gap-1">
                                    View Details <ChevronRight size={14} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Dynamic Pagination */}
                <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <span className="text-xs font-bold text-gray-400">
                        Showing {Math.min(pagination.total, (pagination.page - 1) * pagination.limit + 1)} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
                    </span>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                            disabled={pagination.page === 1}
                            className={`p-2.5 rounded-xl border border-gray-100 ${pagination.page === 1 ? 'text-gray-200 cursor-not-allowed' : 'bg-gray-50 text-gray-400 hover:bg-white'}`}
                        >
                            <ChevronRight size={18} className="rotate-180" />
                        </button>
                        <div className="flex gap-1">
                            {[...Array(pagination.totalPages)].map((_, i) => (
                                <button 
                                    key={i}
                                    onClick={() => setPagination(prev => ({ ...prev, page: i + 1 }))}
                                    className={`w-9 h-9 flex items-center justify-center rounded-xl text-xs font-black transition-all ${pagination.page === i + 1 ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-white text-gray-500 border border-gray-100'}`}
                                >
                                    {i + 1}
                                </button>
                            ))}
                        </div>
                        <button 
                            onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.totalPages, prev.page + 1) }))}
                            disabled={pagination.page === pagination.totalPages}
                            className={`p-2.5 rounded-xl border border-gray-100 ${pagination.page === pagination.totalPages ? 'text-gray-200 cursor-not-allowed' : 'bg-gray-50 text-gray-400 hover:bg-white'}`}
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>
                </div>
            </div>
            
            <style dangerouslySetInnerHTML={{ __html: `
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}} />
        </MainLayout>
    );
};

const FilterGroup = ({ label, options, value, onChange }) => (
    <div className="flex flex-col gap-1 min-w-[140px]">
        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">{label}</label>
        <div className="relative">
            <select 
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full pl-3 pr-8 py-2 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-black text-gray-700 outline-none appearance-none cursor-pointer hover:bg-white transition-colors"
            >
                {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            <ChevronRight size={14} className="absolute right-3 top-1/2 -translate-y-1/2 rotate-90 text-gray-400 pointer-events-none" />
        </div>
    </div>
);

export default InspectionList;
