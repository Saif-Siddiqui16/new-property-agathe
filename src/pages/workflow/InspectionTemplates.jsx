import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Plus,
    Search,
    Edit2,
    Copy,
    Trash2,
    MoreHorizontal,
    Layout,
    Lock,
    RotateCcw,
    Settings2,
    ChevronRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '../../layouts/MainLayout';

import api from '../../api/client';

const InspectionTemplates = () => {
    const navigate = useNavigate();
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0
    });

    useEffect(() => {
        fetchTemplates();
    }, [pagination.page]);

    const fetchTemplates = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/api/admin/workflow/templates?page=${pagination.page}&limit=${pagination.limit}`);
            if (res.data.success) {
                setTemplates(res.data.data.map(t => ({
                    ...t,
                    rooms: t.structure?.rooms?.length || 0,
                    items: t.structure?.rooms?.reduce((acc, r) => acc + (r.questions?.length || 0), 0) || 0,
                    status: 'Active',
                    building: 'All Buildings'
                })));
                if (res.data.pagination) {
                    setPagination(prev => ({
                        ...prev,
                        total: res.data.pagination.total,
                        totalPages: res.data.pagination.totalPages
                    }));
                }
            }
        } catch (error) {
            console.error('Error fetching templates:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500 font-black">FETCHING TEMPLATES...</div>;

    return (
        <MainLayout title="Inspection Templates">
            <div className="p-0 bg-transparent min-h-screen">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 tracking-tighter">Inspection Templates</h1>
                        <p className="text-gray-500 text-sm font-medium">Manage inspection templates for Move-Out and Move-In inspections</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate('/admin/workflow/templates/new')}
                            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-2xl text-sm font-black hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all active:scale-95"
                        >
                            <Plus size={18} />
                            Create Template
                        </button>
                        <button
                            onClick={() => navigate('/admin/workflow/response-groups')}
                            className="flex items-center gap-2 px-6 py-2.5 bg-white text-gray-700 rounded-2xl text-sm font-black hover:bg-gray-50 border border-gray-100 shadow-sm transition-all active:scale-95"
                        >
                            <Settings2 size={18} />
                            Manage Answer Buttons
                        </button>
                        <button
                            onClick={() => {
                                setLoading(true);
                                fetchTemplates();
                            }}
                            className="flex items-center gap-2 px-6 py-2.5 bg-gray-50 text-gray-700 rounded-2xl text-sm font-black hover:bg-gray-100 transition-all border border-gray-100 active:scale-95"
                        >
                            <RotateCcw size={18} className={loading ? 'animate-spin' : ''} />
                            Refresh Page
                        </button>
                    </div>
                </div>

                <div className="mb-6 flex items-center justify-between bg-white p-2 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex-1 max-w-md relative ml-2">
                        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search templates..."
                            className="w-full pl-12 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
                        />
                    </div>
                </div>

                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50 border-b border-gray-100 text-[11px] font-black text-gray-400 uppercase tracking-widest">
                                <th className="px-6 py-4">Template Name</th>
                                <th className="px-6 py-4">Type</th>
                                <th className="px-6 py-4">Building</th>
                                <th className="px-6 py-4 text-center">Rooms</th>
                                <th className="px-6 py-4 text-center">Items</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {templates.map((temp) => (
                                <tr key={temp.id} className="hover:bg-gray-50/50 transition-colors group cursor-pointer">
                                    <td className="px-6 py-4 font-black text-gray-900">{temp.name}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border 
                                            ${temp.type === 'MOVE_OUT' || temp.type === 'Move-Out' ? 'bg-blue-50 text-blue-600 border-blue-100' : 
                                              temp.type === 'VISUAL' ? 'bg-yellow-50 text-yellow-600 border-yellow-100' :
                                              'bg-indigo-50 text-indigo-600 border-indigo-100'}`}>
                                            {temp.type.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm font-bold text-gray-500">{temp.building}</td>
                                    <td className="px-6 py-4 text-center font-black text-gray-700">{temp.rooms}</td>
                                    <td className="px-6 py-4 text-center font-black text-gray-700">{temp.items}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase ${temp.status === 'Active' ? 'text-green-600 bg-green-50' : 'text-gray-400 bg-gray-50'}`}>
                                            {temp.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-end gap-2">
                                            <ActionButton
                                                icon={Edit2}
                                                onClick={() => navigate(`/admin/workflow/templates/${temp.id}/edit`)}
                                                title="Edit Template"
                                            />
                                            <ActionButton
                                                icon={Copy}
                                                onClick={async () => {
                                                    if (window.confirm('Duplicate this template?')) {
                                                        try {
                                                            await api.post(`/api/admin/workflow/templates/${temp.id}/duplicate`);
                                                            fetchTemplates();
                                                        } catch (e) {
                                                            alert('Failed to duplicate');
                                                        }
                                                    }
                                                }}
                                                title="Duplicate Template"
                                            />
                                            <ActionButton
                                                icon={Trash2}
                                                onClick={async () => {
                                                    if (window.confirm('Delete this template?')) {
                                                        try {
                                                            await api.delete(`/api/admin/workflow/templates/${temp.id}`);
                                                            fetchTemplates();
                                                        } catch (e) {
                                                            alert('Failed to delete');
                                                        }
                                                    }
                                                }}
                                                title="Delete Template"
                                                className="hover:text-red-600"
                                            />
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Dynamic Pagination */}
                <div className="mt-8 flex items-center justify-between px-2">
                    <span className="text-xs font-bold text-gray-400">
                        Showing {(pagination.page - 1) * pagination.limit + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} templates
                    </span>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                            disabled={pagination.page === 1}
                            className={`p-2 rounded-xl border border-gray-100 ${pagination.page === 1 ? 'text-gray-200 cursor-not-allowed' : 'bg-gray-50 text-gray-400 hover:bg-white transition-colors'}`}
                        >
                            <ChevronRight size={16} className="rotate-180" />
                        </button>
                        
                        {[...Array(pagination.totalPages)].map((_, i) => {
                            const pageNum = i + 1;
                            if (
                                pageNum === 1 || 
                                pageNum === pagination.totalPages || 
                                (pageNum >= pagination.page - 1 && pageNum <= pagination.page + 1)
                            ) {
                                return (
                                    <button 
                                        key={pageNum}
                                        onClick={() => setPagination(prev => ({ ...prev, page: pageNum }))}
                                        className={`w-8 h-8 flex items-center justify-center rounded-xl text-xs font-black transition-all ${pagination.page === pageNum ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-white text-gray-500 hover:bg-gray-50 border border-transparent hover:border-gray-100'}`}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            }
                            return null;
                        })}

                        <button 
                            onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.totalPages, prev.page + 1) }))}
                            disabled={pagination.page === pagination.totalPages}
                            className={`p-2 rounded-xl border border-gray-100 ${pagination.page === pagination.totalPages ? 'text-gray-200 cursor-not-allowed' : 'bg-gray-50 text-gray-400 hover:bg-white transition-colors'}`}
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            </div>
        </MainLayout>
    );
};

const ActionButton = ({ icon: Icon, onClick, title, className = "" }) => (
    <button
        onClick={(e) => {
            e.stopPropagation();
            onClick?.();
        }}
        title={title}
        className={`p-2.5 hover:bg-white rounded-2xl transition-colors border border-transparent hover:border-gray-200 text-gray-400 hover:text-indigo-600 shadow-sm hover:shadow-md ${className}`}
    >
        <Icon size={16} />
    </button>
);

export default InspectionTemplates;
