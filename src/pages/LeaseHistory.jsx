import React, { useEffect, useState } from 'react';
import { MainLayout } from '../layouts/MainLayout';
import { useNavigate } from 'react-router-dom';
import { Eye, Pencil, Trash2, X, FileText, Calendar, User, Home, Bed, AlertTriangle, CheckCircle, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../components/Button';
import api from '../api/client';
import { hasPermission } from '../utils/permissions';

// DUMMY_LEASES removed
export const LeaseHistory = () => {
    const navigate = useNavigate();
    const [__forceUpdate, __setForceUpdate] = useState(0);
    useEffect(() => {
        const handleUpdate = () => __setForceUpdate(p => p + 1);
        window.addEventListener('permissionsUpdated', handleUpdate);
        return () => window.removeEventListener('permissionsUpdated', handleUpdate);
    }, []);

    const [leases, setLeases] = useState([]);
    const [selectedLease, setSelectedLease] = useState(null);
    const [editLease, setEditLease] = useState(null);
    const [buildings, setBuildings] = useState([]);
    const [search, setSearch] = useState('');
    const [buildingFilter, setBuildingFilter] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
    const [isLoading, setIsLoading] = useState(false);

    /* LOAD DATA */
    const fetchLeases = async () => {
        setIsLoading(true);
        try {
            const res = await api.get('/api/admin/leases', {
                params: { 
                    page, 
                    limit: 15,
                    status: statusFilter || undefined,
                    propertyId: buildingFilter || undefined,
                    leaseType: typeFilter || undefined,
                    search: search || undefined
                }
            });
            // Handle new paginated response structure
            if (res.data.status === 'success') {
                setLeases(res.data.data);
                setPagination(res.data.pagination);
            } else {
                setLeases(res.data);
            }
        } catch (error) {
            console.error('Failed to fetch leases', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchLeases();
    }, [page, statusFilter, buildingFilter, typeFilter]);

    // Handle search debouncing or immediate effect
    useEffect(() => {
        const timer = setTimeout(() => {
            if (page === 1) fetchLeases();
            else setPage(1);
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    useEffect(() => {
        const fetchBuildings = async () => {
            try {
                const res = await api.get('/api/admin/properties');
                setBuildings(res.data);
            } catch (error) {
                console.error('Failed to fetch buildings', error);
            }
        };
        fetchBuildings();
    }, []);

    /* SEND CREDENTIALS */
    const handleSendCredentials = async (leaseId) => {
        try {
            await api.post(`/api/admin/leases/${leaseId}/send-credentials`);
            alert('Credentials sent successfully!');
            fetchLeases();
        } catch (error) {
            console.error(error);
            alert('Failed to send credentials');
        }
    };

    /* DELETE */
    const handleDelete = async (id) => {
        if (!window.confirm('Delete this lease?')) return;
        try {
            await api.delete(`/api/admin/leases/${id}`);
            const updated = leases.filter((l) => l.id !== id);
            setLeases(updated);
        } catch (error) {
            alert('Failed to delete lease');
        }
    };

    /* SAVE EDIT */
    const handleEditSave = async (e) => {
        if (!editLease.tenantFirstName?.trim() || !editLease.tenantLastName?.trim()) {
            alert('First Name and Last Name are required.');
            return;
        }

        e?.preventDefault();
        try {
            const payload = {
                monthlyRent: editLease.monthlyRent,
                startDate: editLease.startDate,
                endDate: editLease.endDate,
                firstName: editLease.tenantFirstName,
                lastName: editLease.tenantLastName
            };

            await api.put(`/api/admin/leases/${editLease.id}`, payload);
            fetchLeases();
            setEditLease(null);
        } catch (error) {
            console.error(error);
            alert('Failed to update lease');
        }
    };

    const displayLeases = leases;

    return (
        <MainLayout title="Lease History">
            <div className="flex flex-col gap-6">

                {/* FILTERS */}
                <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-xl shadow-[0_5px_15px_rgba(0,0,0,0.05)] border border-slate-100">
                    <div className="flex-1 flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
                        <Search size={18} className="text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by tenant, unit, or building..."
                            className="bg-transparent border-none outline-none text-sm w-full text-slate-700 placeholder:text-slate-400"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                        <Home size={18} className="text-slate-400" />
                        <select
                            className="bg-transparent border-none outline-none text-sm text-slate-700 min-w-[150px] cursor-pointer"
                            value={buildingFilter}
                            onChange={(e) => {
                                setBuildingFilter(e.target.value);
                                setPage(1);
                            }}
                        >
                            <option value="">All Buildings</option>
                            {buildings.map(b => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                        <FileText size={18} className="text-slate-400" />
                        <select
                            className="bg-transparent border-none outline-none text-sm text-slate-700 min-w-[150px] cursor-pointer"
                            value={typeFilter}
                            onChange={(e) => {
                                setTypeFilter(e.target.value);
                                setPage(1);
                            }}
                        >
                            <option value="">All Lease Types</option>
                            <option value="Full Unit Lease">Full Unit Lease</option>
                            <option value="Bedroom Lease">Bedroom Lease</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                        <AlertTriangle size={18} className="text-slate-400" />
                        <select
                            className="bg-transparent border-none outline-none text-sm text-slate-700 min-w-[150px] cursor-pointer font-medium"
                            value={statusFilter}
                            onChange={(e) => {
                                setStatusFilter(e.target.value);
                                setPage(1); // Reset to page 1 on filter change
                            }}
                        >
                            <option value="">All Statuses</option>
                            <option value="Active">Active</option>
                            <option value="Expired">Expired</option>
                        </select>
                    </div>

                    <div className="flex gap-2">
                        {hasPermission('Leases', 'add') && (
                            <>
                                <Button variant="secondary" onClick={() => navigate('/leases/new-bedroom')}>
                                    <Bed size={18} />
                                    Bedroom Lease
                                </Button>
                                <Button variant="primary" onClick={() => navigate('/leases/new')}>
                                    <FileText size={18} />
                                    Full Unit Lease
                                </Button>
                            </>
                        )}
                    </div>
                </div>

                {/* TABLE */}
                <div className="bg-white rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.06)] overflow-hidden border border-slate-100">
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Lease Type</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Building</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Unit</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Bedroom</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Tenant</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Term</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Monthly Rent</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Action</th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-100">
                                {displayLeases.map((lease, index) => (
                                    <tr
                                        key={lease.id}
                                        className="hover:bg-slate-50/80 transition-all duration-200 animate-in slide-in-from-left-2 fade-in fill-mode-forwards"
                                        style={{ animationDelay: `${index * 0.05}s` }}
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${lease.leaseType === 'Bedroom Lease' ? 'bg-amber-50 text-amber-700 border border-amber-100' : 'bg-blue-50 text-blue-700 border border-blue-100'}`}>
                                                {lease.leaseType}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 font-medium">{lease.buildingName}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="font-semibold text-slate-800">{lease.unit}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{lease.bedroom}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-700">{lease.tenant}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-mono text-[13px]">{lease.term}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-700">${(lease.monthlyRent || 0).toLocaleString('en-CA')}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${lease.status.toLowerCase() === 'active'
                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                                : 'bg-slate-100 text-slate-600 border-slate-200'
                                                }`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${lease.status.toLowerCase() === 'active' ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                                                {lease.status.charAt(0).toUpperCase() + lease.status.slice(1).toLowerCase()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-200 ${lease.isCredentialsSent
                                                        ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100'
                                                        : 'text-amber-600 bg-amber-50 hover:bg-amber-100 hover:scale-105 shadow-sm'
                                                        }`}
                                                    onClick={() => handleSendCredentials(lease.id)}
                                                    title={lease.isCredentialsSent ? "Credentials already sent - Click to Resend" : "⚠️ Credentials Not Sent - Click to Send"}
                                                >
                                                    {lease.isCredentialsSent ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
                                                </button>
                                                <button
                                                    className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all duration-200"
                                                    onClick={() => setSelectedLease(lease)}
                                                    title="View Details"
                                                >
                                                    <Eye size={16} />
                                                </button>
                                                {hasPermission('Leases', 'edit') && (
                                                    <button
                                                        className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all duration-200"
                                                        onClick={() => setEditLease({ ...lease })}
                                                        title="Edit Lease"
                                                    >
                                                        <Pencil size={16} />
                                                    </button>
                                                )}
                                                {hasPermission('Leases', 'delete') && (
                                                    <button
                                                        className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all duration-200"
                                                        onClick={() => handleDelete(lease.id)}
                                                        title="Delete Lease"
                                                    >
                                                        <Trash2 size={16} />
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
                    <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider order-2 sm:order-1">
                            Showing Page {pagination.page} of {pagination.totalPages} <span className="mx-1">•</span> {pagination.total} Total Leases
                        </div>
                        <div className="flex items-center gap-1.5 order-1 sm:order-2">
                            <Button 
                                variant="secondary" 
                                size="sm" 
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={pagination.page <= 1 || isLoading}
                                className="!px-2 !py-1"
                            >
                                <ChevronLeft size={14} />
                            </Button>

                            <div className="flex items-center gap-1">
                                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(pageNum => (
                                    <button
                                        key={pageNum}
                                        onClick={() => setPage(pageNum)}
                                        disabled={isLoading}
                                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-all duration-200 ${
                                            pagination.page === pageNum
                                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                                            : 'bg-white text-slate-600 border border-slate-200 hover:border-indigo-300 hover:text-indigo-600'
                                        }`}
                                    >
                                        {pageNum}
                                    </button>
                                ))}
                            </div>

                            <Button 
                                variant="secondary" 
                                size="sm" 
                                onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                                disabled={pagination.page >= pagination.totalPages || isLoading}
                                className="!px-2 !py-1"
                            >
                                <ChevronRight size={14} />
                            </Button>
                        </div>
                    </div>
                </div>

                {/* VIEW MODAL */}
                {selectedLease && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
                        <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-300">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-slate-900">Lease Details</h3>
                                <button
                                    onClick={() => setSelectedLease(null)}
                                    className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="space-y-4 mb-8">
                                <div className="flex justify-between py-3 border-b border-slate-100">
                                    <span className="text-sm font-medium text-slate-500">Lease Type</span>
                                    <span className="text-sm font-semibold text-slate-900">{selectedLease.leaseType}</span>
                                </div>
                                <div className="flex justify-between py-3 border-b border-slate-100">
                                    <span className="text-sm font-medium text-slate-500">Building</span>
                                    <span className="text-sm font-semibold text-slate-900">{selectedLease.buildingName}</span>
                                </div>
                                <div className="flex justify-between py-3 border-b border-slate-100">
                                    <span className="text-sm font-medium text-slate-500">Unit</span>
                                    <span className="text-sm font-semibold text-slate-900">{selectedLease.unit}</span>
                                </div>
                                <div className="flex justify-between py-3 border-b border-slate-100">
                                    <span className="text-sm font-medium text-slate-500">Bedroom</span>
                                    <span className="text-sm font-semibold text-slate-900">{selectedLease.bedroom}</span>
                                </div>
                                <div className="flex justify-between py-3 border-b border-slate-100">
                                    <span className="text-sm font-medium text-slate-500">Tenant</span>
                                    <span className="text-sm font-medium text-slate-900">{selectedLease.tenant}</span>
                                </div>
                                <div className="flex justify-between py-3 border-b border-slate-100">
                                    <span className="text-sm font-medium text-slate-500">Term</span>
                                    <span className="text-sm font-medium text-slate-900">{selectedLease.term}</span>
                                </div>
                                <div className="flex justify-between py-3 border-b border-slate-100">
                                    <span className="text-sm font-medium text-slate-500">Monthly Rent</span>
                                    <span className="text-sm font-semibold text-slate-900">${(selectedLease.monthlyRent || 0).toLocaleString('en-CA')}</span>
                                </div>
                                <div className="flex justify-between py-3 border-b border-slate-100">
                                    <span className="text-sm font-medium text-slate-500">Status</span>
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${selectedLease.status.toLowerCase() === 'active'
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : 'bg-slate-100 text-slate-600'
                                        }`}>
                                        {selectedLease.status.charAt(0).toUpperCase() + selectedLease.status.slice(1).toLowerCase()}
                                    </span>
                                </div>
                            </div>

                            <div className="flex justify-end">
                                <Button variant="secondary" onClick={() => setSelectedLease(null)}>Close</Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* EDIT MODAL */}
                {editLease && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
                        <form onSubmit={handleEditSave} className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-300">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-slate-900">Edit Lease</h3>
                                <button
                                    type="button"
                                    onClick={() => setEditLease(null)}
                                    className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="space-y-4 mb-8">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700">First Name</label>
                                        <div className="relative">
                                            <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <input
                                                className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all text-sm"
                                                value={editLease.tenantFirstName || ''}
                                                onChange={(e) => setEditLease({ ...editLease, tenantFirstName: e.target.value })}
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700">Last Name</label>
                                        <div className="relative">
                                            <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <input
                                                className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all text-sm"
                                                value={editLease.tenantLastName || ''}
                                                onChange={(e) => setEditLease({ ...editLease, tenantLastName: e.target.value })}
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700">Start Date</label>
                                        <div className="relative">
                                            <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <input
                                                type="date"
                                                className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all text-sm"
                                                value={editLease.startDate}
                                                onChange={(e) => setEditLease({ ...editLease, startDate: e.target.value })}
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700">End Date</label>
                                        <div className="relative">
                                            <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <input
                                                type="date"
                                                className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all text-sm"
                                                value={editLease.endDate}
                                                onChange={(e) => setEditLease({ ...editLease, endDate: e.target.value })}
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700">Monthly Rent</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                                        <input
                                            type="number"
                                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all text-sm font-semibold"
                                            value={editLease.monthlyRent}
                                            onChange={(e) => setEditLease({ ...editLease, monthlyRent: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3">
                                <Button type="button" variant="secondary" onClick={() => setEditLease(null)}>Cancel</Button>
                                <Button type="submit" variant="primary">Save Changes</Button>
                            </div>
                        </form>
                    </div>
                )}

            </div>
        </MainLayout>
    );
};
