import React, { useState, useEffect } from 'react';
import { MainLayout } from '../layouts/MainLayout';
import { Button } from '../components/Button';
import { Search, Eye, Filter, CheckCircle, Clock, AlertTriangle, X, Plus, User, Building, Home, ChevronDown, Trash2, Edit2, Play, Camera, Printer } from 'lucide-react';
import clsx from 'clsx';
import api from '../api/client';
import { hasPermission } from '../utils/permissions';

const priorityColors = {
    High: 'bg-red-50 text-red-700 border-red-100',
    Medium: 'bg-amber-50 text-amber-700 border-amber-100',
    Low: 'bg-blue-50 text-blue-700 border-blue-100',
};

const statusIcons = {
    'Open': <AlertTriangle size={14} className="text-amber-500" />,
    'In Progress': <Clock size={14} className="text-blue-500" />,
    'Resolved': <CheckCircle size={14} className="text-emerald-500" />,
};

export const Tickets = () => {
    const [__forceUpdate, __setForceUpdate] = useState(0);
    useEffect(() => {
        const handleUpdate = () => __setForceUpdate(p => p + 1);
        window.addEventListener('permissionsUpdated', handleUpdate);
        return () => window.removeEventListener('permissionsUpdated', handleUpdate);
    }, []);

    const [tickets, setTickets] = useState([]);
    const [buildings, setBuildings] = useState([]);
    const [tenants, setTenants] = useState([]);
    const [selectedBuildingId, setSelectedBuildingId] = useState('');
    const [loadingTenants, setLoadingTenants] = useState(false);
    const [search, setSearch] = useState('');
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingTicket, setEditingTicket] = useState(null);
    const [viewingTenantDetails, setViewingTenantDetails] = useState(null);
    const [successMessage, setSuccessMessage] = useState('');
    const [attachments, setAttachments] = useState({});
    
    // Print State
    const [selectedForPrint, setSelectedForPrint] = useState(new Set());

    useEffect(() => {
        fetchTickets();
        fetchBuildings();
    }, []);

    useEffect(() => {
        if (selectedBuildingId) {
            fetchTenants(selectedBuildingId);
        } else {
            setTenants([]);
        }
    }, [selectedBuildingId]);

    const fetchTickets = async () => {
        try {
            const res = await api.get('/api/admin/tickets');
            setTickets(res.data);
        } catch (e) {
            console.error('Error fetching tickets', e);
        }
    };

    const fetchBuildings = async () => {
        try {
            const res = await api.get('/api/admin/properties');
            setBuildings(res.data);
        } catch (e) { console.error(e); }
    };

    const fetchTenants = async (buildingId) => {
        setLoadingTenants(true);
        try {
            const res = await api.get(`/api/admin/tenants?propertyId=${buildingId}&limit=1000`);
            setTenants(res.data?.data || res.data || []);
        } catch (e) { console.error(e); }
        finally { setLoadingTenants(false); }
    };

    const filteredTickets = tickets.filter(t =>
        (t.tenant || '').toLowerCase().includes(search.toLowerCase()) ||
        (t.id || '').toLowerCase().includes(search.toLowerCase()) ||
        (t.subject || '').toLowerCase().includes(search.toLowerCase())
    );

    const updateStatus = async (id, newStatus) => {
        const ticket = tickets.find(t => t.id === id);
        if (!ticket) return;

        try {
            await api.put(`/api/admin/tickets/${ticket.dbId}/status`, { status: newStatus });
            setTickets(tickets.map(t => t.id === id ? { ...t, status: newStatus } : t));
            setSelectedTicket(prev => prev ? { ...prev, status: newStatus } : null);
        } catch (e) {
            alert('Failed to update status');
        }
    };

    const handleDeleteTicket = async (dbId) => {
        if (!window.confirm('Are you sure you want to delete this ticket?')) return;
        try {
            await api.delete(`/api/admin/tickets/${dbId}`);
            setTickets(tickets.filter(t => t.dbId !== dbId));
            setSuccessMessage('Ticket Deleted Successfully!');
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (e) {
            alert('Failed to delete ticket');
        }
    };

    const handleSaveTicket = async (e) => {
        e.preventDefault();
        const form = e.target;
        const tenantId = form.tenantId.value;
        const tenantObj = tenants.find(t => t.id === parseInt(tenantId));

        try {
            const formData = new FormData();
            formData.append('propertyId', selectedBuildingId);
            formData.append('unitId', tenantObj?.unitId || editingTicket?.unitId);
            formData.append('tenantId', tenantId);
            formData.append('subject', form.subject.value);
            formData.append('description', form.description.value);
            formData.append('priority', form.priority.value);

            if (editingTicket) {
                // For editing, we use a regular JSON put if no new files, but controller might expect form-data
                // Simpler to stay consistent with form-data if we want file support, but for text only JSON is easier.
                // However, the current createTicket uses multer.

                await api.put(`/api/admin/tickets/${editingTicket.dbId}`, {
                    tenantId: parseInt(tenantId),
                    propertyId: parseInt(selectedBuildingId),
                    unitId: tenantObj?.unitId,
                    subject: form.subject.value,
                    description: form.description.value,
                    priority: form.priority.value,
                });
            } else {
                // Handle Attachments only for new tickets for now (simple)
                if (form.images.files.length > 0) {
                    Array.from(form.images.files).forEach(file => {
                        formData.append('images', file);
                    });
                }

                if (form.video.files.length > 0) {
                    formData.append('video', form.video.files[0]);
                }

                await api.post('/api/admin/tickets', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            }

            fetchTickets();
            setShowAddModal(false);
            setEditingTicket(null);
            setSelectedBuildingId('');
            setSuccessMessage(editingTicket ? 'Ticket Updated Successfully!' : 'Ticket Created Successfully!');
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (e) {
            console.error('Error saving ticket:', e);
            alert('Failed to save ticket');
        }
    };

    const allFilteredSelected = filteredTickets.length > 0 && filteredTickets.every(t => selectedForPrint.has(t.id));
    
    const toggleSelectAll = () => {
        if (allFilteredSelected) {
            setSelectedForPrint(new Set());
        } else {
            const newSet = new Set(selectedForPrint);
            filteredTickets.forEach(t => newSet.add(t.id));
            setSelectedForPrint(newSet);
        }
    };

    const toggleSelect = (id) => {
        const newSet = new Set(selectedForPrint);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedForPrint(newSet);
    };

    const handlePrint = () => {
        const printWindow = window.open('', '', 'width=900,height=800');
        printWindow.document.write(`
            <html>
                <head>
                    <title>Print Tickets</title>
                    <style>
                        body { font-family: system-ui, -apple-system, sans-serif; padding: 20px; color: #1e293b; }
                        h1 { text-align: center; margin-bottom: 24px; color: #0f172a; grid-column: span 2; }
                        .print-container { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
                        .page { page-break-inside: avoid; break-inside: avoid; }
                        .ticket-card { border: 2px solid #e2e8f0; border-radius: 12px; padding: 16px; background: #fff; height: 100%; box-sizing: border-box; }
                        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 8px; }
                        .badge { padding: 4px 10px; border-radius: 999px; font-size: 10px; font-weight: 800; text-transform: uppercase; border: 1px solid #e2e8f0; }
                        .priority-High { background: #fef2f2; color: #b91c1c; border-color: #fee2e2; }
                        .priority-Medium { background: #fffbeb; color: #b45309; border-color: #fef3c7; }
                        .priority-Low { background: #eff6ff; color: #1d4ed8; border-color: #dbeafe; }
                        .title { font-weight: 900; font-size: 16px; margin: 0; color: #4f46e5; }
                        .subject { font-weight: 800; font-size: 14px; margin-bottom: 8px; color: #0f172a; }
                        .detail { font-size: 12px; margin-bottom: 4px; color: #334155; }
                        .desc-box { background: #f8fafc; padding: 10px; border-radius: 8px; font-size: 12px; margin-top: 8px; white-space: pre-wrap; border: 1px solid #f1f5f9; }
                        .date { font-size: 10px; color: #64748b; margin-top: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
                        .images-container { display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap; }
                        .images-container img { max-width: 100%; max-height: 120px; border-radius: 8px; border: 1px solid #e2e8f0; object-fit: cover; }
                        @media print {
                            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                        }
                    </style>
                </head>
                <body>
                    <div class="print-container">
                        <h1>Maintenance Tickets</h1>
                        ${tickets.filter(t => selectedForPrint.has(t.id)).map(ticket => `
                            <div class="page">
                                <div class="ticket-card">
                                    <div class="header">
                                        <h3 class="title">${ticket.id}</h3>
                                        <span class="badge priority-${ticket.priority}">${ticket.priority}</span>
                                    </div>
                                    <div class="subject">${ticket.subject}</div>
                                    <div class="detail"><strong>Tenant:</strong> ${ticket.tenant}</div>
                                    <div class="detail"><strong>Unit:</strong> ${ticket.unit}</div>
                                    <div class="detail"><strong>Status:</strong> ${ticket.status}</div>
                                    <div class="desc-box"><strong>Description:</strong><br/>${ticket.desc || 'No description'}</div>
                                    ${ticket.attachments && ticket.attachments.length > 0 ? `
                                        <div class="images-container">
                                            ${ticket.attachments.filter(a => a.type === 'image' || (a.url && a.url.match(/\\.(jpg|jpeg|png|webp|gif)/i))).map(att => `
                                                <img src="${att.url}" alt="Attachment" />
                                            `).join('')}
                                        </div>
                                    ` : ''}
                                    <div class="date"><strong>Reported:</strong> ${ticket.createdAt}</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    <script>
                        window.onload = () => {
                            setTimeout(() => {
                                window.print();
                                window.close();
                            }, 500);
                        }
                    </script>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    return (
        <MainLayout title="Maintenance Tickets">
            <div className="flex flex-col gap-6 relative">

                {successMessage && (
                    <div className="fixed top-24 right-8 z-[100] animate-in slide-in-from-right-full duration-500">
                        <div className="bg-emerald-600 text-white px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3">
                            <CheckCircle size={20} />
                            <span className="font-bold">{successMessage}</span>
                        </div>
                    </div>
                )}

                <section className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-xl shadow-[0_5px_15px_rgba(0,0,0,0.06)] gap-4">
                    <div className="flex items-center gap-3 bg-slate-50 px-4 py-2.5 rounded-lg border border-slate-200 focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all w-full md:w-auto md:min-w-[320px]">
                        <Search size={18} className="text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by ID, tenant, or subject"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="bg-transparent border-none outline-none text-slate-700 placeholder:text-slate-400 w-full text-sm font-medium"
                        />
                    </div>

                    <div className="flex gap-2">
                        {selectedForPrint.size > 0 && (
                            <Button variant="secondary" size="sm" onClick={handlePrint} className="!border-indigo-200 !text-indigo-600 hover:!bg-indigo-50">
                                <Printer size={16} />
                                Print ({selectedForPrint.size})
                            </Button>
                        )}
                        <Button variant="secondary" size="sm">
                            <Filter size={16} />
                            Filters
                        </Button>
                        {hasPermission('Tickets', 'add') && (
                            <Button variant="primary" size="sm" onClick={() => setShowAddModal(true)}>
                                <Plus size={16} />
                                Add Ticket
                            </Button>
                        )}
                    </div>
                </section>

                <section className="bg-white rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.08)] overflow-hidden">
                    <div className="grid grid-cols-[auto_1fr_1.5fr_1.2fr_1.2fr_1fr_1fr_0.5fr] gap-4 bg-slate-50 border-b border-slate-200 px-6 py-4 items-center">
                        <input type="checkbox" checked={allFilteredSelected} onChange={toggleSelectAll} className="w-4 h-4 text-indigo-600 rounded border-slate-300 cursor-pointer" />
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Ticket ID</span>
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Subject</span>
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tenant</span>
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Unit</span>
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Priority</span>
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</span>
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Actions</span>
                    </div>

                    <div className="divide-y divide-slate-100">
                        {filteredTickets.map((ticket, index) => (
                            <div
                                key={ticket.id}
                                className="grid grid-cols-[auto_1fr_1.5fr_1.2fr_1.2fr_1fr_1fr_0.5fr] gap-4 px-6 py-4 items-center hover:bg-slate-50/80 transition-all duration-200"
                            >
                                <input type="checkbox" checked={selectedForPrint.has(ticket.id)} onChange={() => toggleSelect(ticket.id)} className="w-4 h-4 text-indigo-600 rounded border-slate-300 cursor-pointer" />
                                <span className="text-sm font-medium text-indigo-600">{ticket.id}</span>
                                <div className="flex flex-col pr-4 overflow-hidden">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-slate-700 font-medium truncate">{ticket.subject}</span>
                                        {ticket.isRequired && (
                                            <span className="px-1.5 py-0.5 rounded bg-red-50 text-[8px] font-black text-red-600 uppercase border border-red-100">Required</span>
                                        )}
                                        {ticket.attachments && ticket.attachments.length > 0 && (
                                            <div className="flex items-center gap-1 text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100" title={`${ticket.attachments.length} attachments`}>
                                                <Camera size={10} />
                                                <span className="text-[10px] font-bold">{ticket.attachments.length}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex flex-col items-start gap-1">
                                    <button
                                        onClick={() => {
                                            setViewingTenantDetails(ticket.tenantDetails || { name: ticket.tenant });
                                        }}
                                        className="text-sm text-indigo-600 font-semibold hover:underline text-left w-fit"
                                    >
                                        {ticket.tenant}
                                    </button>
                                    {ticket.userRole !== 'TENANT' && (
                                        <span className="text-[9px] font-black bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200 uppercase tracking-tighter">
                                            Staff / Inspector
                                        </span>
                                    )}
                                </div>
                                <span className="text-sm text-slate-500">{ticket.unit}</span>

                                <span>
                                    <span className={clsx("px-2 py-1 rounded-full text-[10px] font-bold border uppercase tracking-tight", priorityColors[ticket.priority])}>
                                        {ticket.priority}
                                    </span>
                                </span>

                                <span className="flex items-center gap-2 text-sm text-slate-700">
                                    {statusIcons[ticket.status]}
                                    {ticket.status}
                                </span>

                                 <span className="flex justify-center gap-1">
                                    <button
                                        onClick={() => setSelectedTicket(ticket)}
                                        className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                                        title="View Details"
                                    >
                                        <Eye size={16} />
                                    </button>
                                    {hasPermission('Tickets', 'edit') && (
                                        <button
                                            onClick={() => {
                                                setEditingTicket(ticket);
                                                setSelectedBuildingId(ticket.propertyId?.toString() || '');
                                                setShowAddModal(true);
                                            }}
                                            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-all"
                                            title="Edit Ticket"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                    )}
                                    {hasPermission('Tickets', 'delete') && (
                                        <button
                                            onClick={() => handleDeleteTicket(ticket.dbId)}
                                            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all"
                                            title="Delete Ticket"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </span>
                            </div>
                        ))}
                    </div>
                </section>

                {selectedTicket && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200 p-4">
                        <div className="bg-white rounded-2xl p-8 w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="text-2xl font-bold text-slate-800">{selectedTicket.id}</h3>
                                    <p className="text-sm text-slate-500">Created: {selectedTicket.createdAt}</p>
                                </div>
                                <button onClick={() => setSelectedTicket(null)} className="text-slate-400 hover:text-slate-600">
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                            {selectedTicket.userRole === 'TENANT' ? 'Tenant' : 'Assigned Person'}
                                        </label>
                                        <p className="font-medium text-slate-700">{selectedTicket.tenant}</p>
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Unit</label>
                                        <p className="font-medium text-slate-700">{selectedTicket.unit}</p>
                                    </div>
                                </div>

                                {selectedTicket.inspectorName !== 'N/A' && (
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                        <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Reported By</label>
                                        <div className="flex items-center gap-2 mt-1">
                                            <User size={14} className="text-slate-400" />
                                            <p className="text-sm font-bold text-slate-700">{selectedTicket.inspectorName} (Inspector)</p>
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Subject</label>
                                    <div className="flex items-center gap-3 mt-1">
                                        <p className="text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100 flex-1 font-medium">
                                            {selectedTicket.subject}
                                        </p>
                                        {selectedTicket.isRequired && (
                                            <div className="flex flex-col items-center gap-1 bg-rose-50 border border-rose-100 p-2 rounded-lg min-w-[100px]">
                                                <AlertTriangle size={16} className="text-rose-600" />
                                                <span className="text-[10px] font-black text-rose-700 uppercase tracking-tighter text-center leading-none">Blocking<br/>Readiness</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Description</label>
                                    <p className="text-slate-600 text-sm mt-1">
                                        {selectedTicket.desc || 'No description provided'}
                                    </p>
                                </div>
                                {selectedTicket.attachments && selectedTicket.attachments.length > 0 && (
                                    <div>
                                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                            Attachments
                                        </label>

                                        <div className="mt-3 grid grid-cols-2 gap-3">
                                            {selectedTicket.attachments.map((att, idx) => (
                                                <div
                                                    key={idx}
                                                    className="border border-slate-200 rounded-lg p-2 bg-slate-50"
                                                >
                                                    {att.type === 'image' && (
                                                        <img
                                                            src={att.url}
                                                            alt="attachment"
                                                            className="w-full h-32 object-cover rounded-md"
                                                        />
                                                    )}

                                                    {att.type === 'video' && (
                                                        <video
                                                            src={att.url}
                                                            controls
                                                            className="w-full h-32 rounded-md"
                                                        />
                                                    )}

                                                    <a
                                                        href={att.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="block text-xs text-indigo-600 font-semibold mt-2 text-center hover:underline"
                                                    >
                                                        Open in new tab
                                                    </a>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}


                                <div className="pt-4 border-t border-slate-100 flex flex-col gap-3">
                                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Update Status</label>
                                    <div className="flex flex-wrap gap-2">
                                        {['Open', 'In Progress', 'Resolved'].map(status => (
                                            <button
                                                key={status}
                                                onClick={() => updateStatus(selectedTicket.id, status)}
                                                className={clsx(
                                                    "px-4 py-2 rounded-lg text-sm font-medium transition-all border",
                                                    selectedTicket.status === status
                                                        ? "bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100"
                                                        : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300"
                                                )}
                                            >
                                                {status}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 flex justify-end">
                                <Button variant="primary" onClick={() => setSelectedTicket(null)}>
                                    Close
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {showAddModal && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] animate-in fade-in duration-200">
                        <form
                            className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto"
                            onSubmit={handleSaveTicket}
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-2xl font-bold text-slate-800">
                                    {editingTicket ? 'Edit Ticket' : 'New Maintenance Ticket'}
                                </h3>
                                <button type="button" onClick={() => { setShowAddModal(false); setEditingTicket(null); }} className="text-slate-400 hover:text-slate-600">
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Building</label>
                                    <div className="relative">
                                        <Building size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <select
                                            value={selectedBuildingId}
                                            onChange={(e) => setSelectedBuildingId(e.target.value)}
                                            required
                                            className="w-full pl-12 pr-10 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-indigo-500 bg-white appearance-none text-slate-800 font-medium"
                                        >
                                            <option value="">Select Building</option>
                                            <option value="all" className="font-bold text-indigo-600">🏢 All Buildings (Total wide task)</option>
                                            {buildings.map(b => (
                                                <option key={b.id} value={b.id.toString()}>{b.name}{b.civicNumber ? ` - ${b.civicNumber}` : ''}</option>
                                            ))}
                                        </select>
                                        <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Tenant</label>
                                    <div className="relative">
                                        <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <select
                                            key={`${editingTicket?.dbId || 'new'}-${selectedBuildingId}-${tenants.length}`}
                                            name="tenantId"
                                            required={selectedBuildingId !== 'all'}
                                            defaultValue={editingTicket?.tenantId}
                                            disabled={loadingTenants || !selectedBuildingId || selectedBuildingId === 'all'}
                                            className="w-full pl-12 pr-10 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-indigo-500 bg-white appearance-none text-slate-800 font-medium disabled:opacity-50"
                                        >
                                            <option value="">{loadingTenants ? 'Fetching tenants...' : (selectedBuildingId === 'all' ? 'Not Applicable' : 'Select Tenant')}</option>
                                            {selectedBuildingId !== 'all' && tenants.map(t => (
                                                <option key={t.id} value={t.id}>{t.name} ({t.unit})</option>
                                            ))}
                                        </select>
                                        <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Subject</label>
                                    <input
                                        name="subject"
                                        required
                                        defaultValue={editingTicket?.subject}
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-indigo-500"
                                        placeholder="e.g. Toilet leaking"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Description</label>
                                    <textarea
                                        name="description"
                                        defaultValue={editingTicket?.desc}
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-indigo-500 h-24 resize-none"
                                        placeholder="Describe the issue in detail..."
                                    ></textarea>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Priority</label>
                                    <select
                                        name="priority"
                                        defaultValue={editingTicket?.priority || 'Low'}
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-indigo-500 bg-white"
                                    >
                                        <option value="Low">Low</option>
                                        <option value="Medium">Medium</option>
                                        <option value="High">High</option>
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-4 pt-2">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Images</label>
                                        <input
                                            type="file"
                                            name="images"
                                            multiple
                                            accept=".jpg,.png,.jpeg"
                                            className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-slate-100 file:text-slate-600 cursor-pointer"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Video</label>
                                        <input
                                            type="file"
                                            name="video"
                                            accept=".mp4,.mov"
                                            className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-slate-100 file:text-slate-600 cursor-pointer"
                                        />
                                    </div>
                                </div>

                                {editingTicket?.attachments && editingTicket.attachments.length > 0 && (
                                    <div className="space-y-1.5 pt-2">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Existing Attachments</label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {editingTicket.attachments.map((att, idx) => (
                                                <a 
                                                    key={idx} 
                                                    href={att.url} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer" 
                                                    className="relative group rounded-xl overflow-hidden border border-slate-200 h-20 bg-slate-50 flex items-center justify-center"
                                                >
                                                    {att.type === 'image' || att.url.match(/\.(jpg|jpeg|png|webp|gif)/i) ? (
                                                        <img src={att.url} alt="" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                                                    ) : (
                                                        <div className="flex flex-col items-center gap-1">
                                                            <Play size={20} className="text-indigo-500" />
                                                            <span className="text-[8px] font-bold text-slate-400 uppercase">Video</span>
                                                        </div>
                                                    )}
                                                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                        <Eye size={16} className="text-white" />
                                                    </div>
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-3 mt-8">
                                <Button type="button" variant="secondary" className="flex-1" onClick={() => { setShowAddModal(false); setEditingTicket(null); }}>Cancel</Button>
                                <Button type="submit" variant="primary" className="flex-1">{editingTicket ? 'Update Ticket' : 'Save Ticket'}</Button>
                            </div>
                        </form>
                    </div>
                )}

                {viewingTenantDetails && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] animate-in fade-in duration-200">
                        <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-300">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-slate-800">Tenant Info</h3>
                                <button onClick={() => setViewingTenantDetails(null)} className="text-slate-400 hover:text-slate-600">
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="flex flex-col items-center gap-4 text-center">
                                <div className="w-20 h-20 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 border-4 border-white shadow-lg">
                                    <User size={40} />
                                </div>
                                <div>
                                    <h4 className="text-lg font-bold text-slate-900">{viewingTenantDetails.name}</h4>
                                    <div className="flex items-center justify-center gap-1.5 mt-1">
                                        <span className={clsx("w-2 h-2 rounded-full", viewingTenantDetails.leaseStatus === 'Active' ? 'bg-emerald-500' : 'bg-red-500')}></span>
                                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{viewingTenantDetails.leaseStatus} Lease</span>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 space-y-3">
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-white text-slate-400 shadow-sm">
                                        <Building size={18} />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Assigned Unit</p>
                                        <p className="font-semibold text-slate-700">{viewingTenantDetails.property} • {viewingTenantDetails.unit}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 flex gap-3">
                                <Button variant="secondary" className="flex-1" onClick={() => setViewingTenantDetails(null)}>Close</Button>
                                <Button variant="primary" className="flex-1">View Full Profile</Button>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </MainLayout>
    );
};
