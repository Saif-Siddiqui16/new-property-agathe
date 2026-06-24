import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { Mail, Search, Filter, History, Paperclip, Eye, RotateCw, X, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { MainLayout } from '../layouts/MainLayout';
import { hasPermission } from '../utils/permissions';

const EmailHistory = () => {
    const [__forceUpdate, __setForceUpdate] = useState(0);
    useEffect(() => {
        const handleUpdate = () => __setForceUpdate(p => p + 1);
        window.addEventListener('permissionsUpdated', handleUpdate);
        return () => window.removeEventListener('permissionsUpdated', handleUpdate);
    }, []);

    if (!hasPermission('Sent Emails', 'view')) {
        return (
            <MainLayout title="Permission Denied">
                <div className="p-12 text-center bg-white rounded-[2rem] border border-slate-100 shadow-sm mt-8">
                    <h3 className="text-xl font-black text-slate-800">Access Restricted</h3>
                    <p className="max-w-md mx-auto mt-2 text-slate-500 font-medium italic">
                        You do not have permission to view this section. Please contact your administrator.
                    </p>
                </div>
            </MainLayout>
        );
    }

    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        tenantName: '',
        buildingId: '',
        subject: '',
        templateId: ''
    });
    const [pagination, setPagination] = useState({
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 1
    });
    const [buildings, setBuildings] = useState([]);
    const [templates, setTemplates] = useState([]);

    const [selectedLog, setSelectedLog] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [statusMsg, setStatusMsg] = useState(null);

    useEffect(() => {
        fetchHistory();
        fetchMetadata();
    }, []);

    const fetchHistory = async (page = 1) => {
        setLoading(true);
        try {
            const params = { ...filters, page, limit: pagination.limit };
            const queryParams = new URLSearchParams(params).toString();
            const response = await api.get(`/api/admin/email/history?${queryParams}`);
            
            // Handle new paginated structure
            if (response.data && response.data.data) {
                setHistory(response.data.data);
                setPagination(response.data.pagination);
            } else {
                setHistory(response.data);
            }
        } catch (error) {
            console.error('Error fetching email history:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async (id) => {
        if (!window.confirm('Are you sure you want to resend this exact email?')) return;
        setActionLoading(true);
        try {
            await api.post(`/api/admin/email/history/${id}/resend`);
            setStatusMsg({ type: 'success', text: 'Email resent successfully!' });
            fetchHistory();
        } catch (error) {
            setStatusMsg({ type: 'error', text: 'Failed to resend: ' + (error.response?.data?.error || error.message) });
        } finally {
            setActionLoading(false);
            setTimeout(() => setStatusMsg(null), 3000);
        }
    };


    const fetchMetadata = async () => {
        try {
            const bRes = await api.get('/api/admin/properties');
            setBuildings(Array.isArray(bRes.data) ? bRes.data : (bRes.data?.data || []));

            if (hasPermission('Email Templates', 'view')) {
                const tRes = await api.get('/api/admin/email/templates');
                setTemplates(Array.isArray(tRes.data) ? tRes.data : (tRes.data?.data || []));
            }
        } catch (error) {
            console.error('Error fetching metadata:', error);
        }
    };

    const handleFilterChange = (e) => {
        setFilters({ ...filters, [e.target.name]: e.target.value });
    };

    const getStatusColor = (status) => {
        switch (status?.toLowerCase()) {
            case 'sent': return 'bg-green-100 text-green-800 border-green-200';
            case 'failed': return 'bg-red-100 text-red-800 border-red-200';
            case 'delivered': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'opened': return 'bg-purple-100 text-purple-800 border-purple-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    return (
        <MainLayout title="Sent Emails History">
            <div className="space-y-6">
                <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <History className="h-6 w-6 text-indigo-600" />
                            Sent Emails Dashboard
                        </h1>
                        <p className="text-gray-500 mt-1">Track and manage all outgoing communications.</p>
                    </div>
                </div>

                {/* Filters Section */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tenant Name</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                name="tenantName"
                                value={filters.tenantName}
                                onChange={handleFilterChange}
                                placeholder="Recipient name..."
                                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Building</label>
                        <select
                            name="buildingId"
                            value={filters.buildingId}
                            onChange={handleFilterChange}
                            className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                        >
                            <option value="">All Buildings</option>
                            {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Template</label>
                        <select
                            name="templateId"
                            value={filters.templateId}
                            onChange={handleFilterChange}
                            className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                        >
                            <option value="">All Templates</option>
                            {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    </div>
                    <div className="flex gap-2 items-end">
                        <button
                            onClick={fetchHistory}
                            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
                        >
                            <Filter className="h-4 w-4" />
                            Apply Filters
                        </button>
                    </div>
                </div>

                {/* Status Alert */}
                {statusMsg && (
                    <div className={`p-4 rounded-xl border text-sm font-bold animate-in slide-in-from-top-4 duration-300 ${
                        statusMsg.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'
                    }`}>
                        {statusMsg.text}
                    </div>
                )}

                {/* History Table */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 text-sm font-semibold text-gray-600">Date Sent</th>
                                <th className="px-6 py-4 text-sm font-semibold text-gray-600">Recipient</th>
                                <th className="px-6 py-4 text-sm font-semibold text-gray-600">Subject</th>
                                <th className="px-6 py-4 text-sm font-semibold text-gray-600">Template</th>
                                <th className="px-6 py-4 text-sm font-semibold text-gray-600">Status</th>
                                <th className="px-6 py-4 text-sm font-semibold text-gray-600">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan="6" className="px-6 py-4 h-12 bg-gray-50/50"></td>
                                    </tr>
                                ))
                            ) : history.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                                        No emails found for the selected criteria.
                                    </td>
                                </tr>
                            ) : history.map((log) => (
                                <tr key={log.id} className="hover:bg-gray-50/50 transition-colors group">
                                    <td className="px-6 py-4 text-sm text-gray-600">
                                        {log.timestamp ? format(new Date(log.timestamp), 'MMM d, yyyy HH:mm') : 'N/A'}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-gray-900">{log.recipientUser?.name || 'N/A'}</div>
                                        <div className="text-xs text-gray-500">{log.recipient}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 max-w-xs overflow-hidden text-ellipsis whitespace-nowrap">
                                            {log.hasAttachments && <Paperclip className="h-3 w-3 text-gray-400" />}
                                            <span className="text-sm text-gray-700">{log.subject}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            {log.emailTemplate?.name || 'Manual'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusColor(log.status)}`}>
                                            {log.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <button 
                                                onClick={async () => {
                                                    setLoading(true);
                                                    try {
                                                        const res = await api.get(`/api/admin/email/history/${log.id}`);
                                                        setSelectedLog(res.data);
                                                    } catch (err) {
                                                        console.error('Error fetching log:', err);
                                                        setSelectedLog(log); // fallback
                                                    } finally {
                                                        setLoading(false);
                                                    }
                                                }}
                                                className="p-1.5 hover:bg-indigo-50 rounded-lg bg-gray-50 text-indigo-600 transition-colors" 
                                                title="View Email Body"
                                            >
                                                <Eye className="h-4 w-4" />
                                            </button>
                                            {hasPermission('Sent Emails', 'add') && (
                                                <button 
                                                    onClick={() => handleResend(log.id)}
                                                    disabled={actionLoading}
                                                    className="p-1.5 hover:bg-orange-50 rounded-lg bg-gray-50 text-orange-600 transition-colors disabled:opacity-50"
                                                    title="Resend to Recipient"
                                                >
                                                    <RotateCw className={`h-4 w-4 ${actionLoading ? 'animate-spin' : ''}`} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                {pagination.totalPages > 1 && (
                    <div className="flex items-center justify-between bg-white px-6 py-4 rounded-2xl shadow-sm border border-gray-100">
                        <div className="flex flex-1 justify-between sm:hidden">
                            <button
                                onClick={() => fetchHistory(pagination.page - 1)}
                                disabled={pagination.page === 1}
                                className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => fetchHistory(pagination.page + 1)}
                                disabled={pagination.page === pagination.totalPages}
                                className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                            >
                                Next
                            </button>
                        </div>
                        <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                            <div>
                                <p className="text-sm text-gray-700">
                                    Showing <span className="font-medium">{(pagination.page - 1) * pagination.limit + 1}</span> to{' '}
                                    <span className="font-medium">
                                        {Math.min(pagination.page * pagination.limit, pagination.total)}
                                    </span>{' '}
                                    of <span className="font-medium">{pagination.total}</span> results
                                </p>
                            </div>
                            <div>
                                <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                                    <button
                                        onClick={() => fetchHistory(pagination.page - 1)}
                                        disabled={pagination.page === 1}
                                        className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-30"
                                    >
                                        <X className="h-4 w-4 rotate-45" /> {/* Using X as a generic arrow fallback if chevron not available */}
                                        <span className="sr-only">Previous</span>
                                    </button>
                                    
                                    {[...Array(pagination.totalPages)].map((_, i) => (
                                        <button
                                            key={i + 1}
                                            onClick={() => fetchHistory(i + 1)}
                                            className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 ${
                                                pagination.page === i + 1
                                                    ? 'z-10 bg-indigo-600 text-white'
                                                    : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50'
                                            }`}
                                        >
                                            {i + 1}
                                        </button>
                                    ))}

                                    <button
                                        onClick={() => fetchHistory(pagination.page + 1)}
                                        disabled={pagination.page === pagination.totalPages}
                                        className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-30"
                                    >
                                        <span className="sr-only">Next</span>
                                        <X className="h-4 w-4 -rotate-[135deg]" />
                                    </button>
                                </nav>
                            </div>
                        </div>
                    </div>
                )}

                {/* PREVIEW MODAL */}
                {selectedLog && (
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
                        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
                            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">Email Broadcast Details</h3>
                                    <p className="text-xs text-gray-500">Sent to {selectedLog.recipient} on {format(new Date(selectedLog.timestamp), 'PPP p')}</p>
                                </div>
                                <button 
                                    onClick={() => setSelectedLog(null)}
                                    className="p-2 hover:bg-white hover:shadow-sm rounded-full transition-all"
                                >
                                    <X className="h-5 w-5 text-gray-500" />
                                </button>
                            </div>
                            <div className="p-8 overflow-y-auto">
                                <div className="mb-6">
                                    <span className="text-[10px] font-black text-indigo-400 block uppercase mb-1">Subject</span>
                                    <p className="text-xl font-bold text-gray-900 border-l-4 border-indigo-600 pl-4">{selectedLog.subject}</p>
                                </div>
                                <div className="h-px bg-gray-100 mb-6" />
                                <div className="bg-gray-50/50 p-6 rounded-2xl border border-gray-100 min-h-[200px]">
                                    <span className="text-[10px] font-black text-indigo-400 block uppercase mb-4">HTML Body Content</span>
                                    <div 
                                        className="prose prose-indigo max-w-none text-gray-700" 
                                        dangerouslySetInnerHTML={{ __html: selectedLog.content }}
                                    />
                                </div>
                                {selectedLog.hasAttachments && (
                                    <div className="mt-8 space-y-3">
                                        <span className="text-[10px] font-black text-orange-400 block uppercase">Attachments in Browser</span>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {selectedLog.attachments?.map((doc, idx) => (
                                                <a 
                                                    key={idx}
                                                    href={doc.fileUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-4 bg-orange-50/50 rounded-2xl border border-orange-100 flex items-center justify-between hover:bg-orange-100 transition-all group"
                                                >
                                                    <div className="flex items-center gap-3 overflow-hidden">
                                                        <FileText className="h-5 w-5 text-orange-600 shrink-0" />
                                                        <span className="text-sm font-bold text-orange-950 truncate">{doc.name}</span>
                                                    </div>
                                                    <div className="h-8 w-8 rounded-full bg-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
                                                        <Eye className="h-4 w-4 text-orange-600" />
                                                    </div>
                                                </a>
                                            ))}
                                            {(!selectedLog.attachments || selectedLog.attachments.length === 0) && (
                                                <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 flex items-center gap-2">
                                                    <Paperclip className="h-4 w-4 text-indigo-600" />
                                                    <span className="text-sm font-bold text-indigo-700 italic">This email was sent with attachments.</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                                <button 
                                    onClick={() => setSelectedLog(null)}
                                    className="px-8 py-3 bg-white border border-gray-200 text-gray-600 font-black rounded-2xl hover:bg-gray-100 transition-all shadow-sm active:scale-95"
                                >
                                    Close Preview
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </MainLayout>
    );
};

export default EmailHistory;
