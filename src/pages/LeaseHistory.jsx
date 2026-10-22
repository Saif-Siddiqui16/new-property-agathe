import React, { useEffect, useState } from 'react';
import { MainLayout } from '../layouts/MainLayout';
import { useNavigate } from 'react-router-dom';
import { Eye, Pencil, Trash2, X, FileText, Calendar, User, Home, Bed, AlertTriangle, CheckCircle, Search, ChevronLeft, ChevronRight, ChevronDown, Shield, Plus, Lock, Building2, Tag, Sparkles } from 'lucide-react';
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
    const [tenants, setTenants] = useState([]);
    const [editUnits, setEditUnits] = useState([]);
    const [editBedrooms, setEditBedrooms] = useState([]);
    const [search, setSearch] = useState('');
    const [buildingFilter, setBuildingFilter] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
    const [isLoading, setIsLoading] = useState(false);

    // Locker state
    const [leaseLockers, setLeaseLockers] = useState([]);
    const [availableLockers, setAvailableLockers] = useState([]);
    const [newLockerRows, setNewLockerRows] = useState([]);
    const [lockerToEdit, setLockerToEdit] = useState(null);

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
                setBuildings(res.data?.data || res.data || []);
            } catch (error) {
                console.error('Failed to fetch buildings', error);
            }
        };
        fetchBuildings();

        const fetchTenants = async () => {
            try {
                const res = await api.get('/api/admin/tenants?limit=1000');
                setTenants(res.data?.data || res.data || []);
            } catch (error) {
                console.error('Failed to fetch tenants', error);
            }
        };
        fetchTenants();

        // Fetch all available lockers for the dropdown
        const fetchLockers = async () => {
            try {
                const res = await api.get('/api/admin/lockers');
                setAvailableLockers(res.data || []);
            } catch (err) {
                console.error('Failed to fetch lockers', err);
            }
        };
        fetchLockers();
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

    // Timezone-safe date parser: parses at local noon to prevent UTC midnight shifts in Canadian timezones
    const safeDate = (dateStr) => {
        if (!dateStr) return null;
        const datePart = String(dateStr).substring(0, 10);
        return new Date(datePart + 'T12:00:00');
    };

    const calculateDurationMonths = (start, end) => {
        if (!start || !end) return 12;
        const s = safeDate(start);
        const e = safeDate(end);
        if (!s || !e || isNaN(s.getTime()) || isNaN(e.getTime())) return 12;
        let months = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth()) + 1;
        return months > 0 ? months : 12;
    };

    const fetchUnitsForEdit = async (propId) => {
        if (!propId) {
            setEditUnits([]);
            return;
        }
        try {
            const unitsRes = await api.get(`/api/admin/units?propertyId=${propId}&limit=1000&showInactive=true`);
            const allUnits = Array.isArray(unitsRes.data?.data) ? unitsRes.data.data : (Array.isArray(unitsRes.data) ? unitsRes.data : []);
            setEditUnits(allUnits);
        } catch (e) {
            console.error('Failed to fetch units for edit', e);
            setEditUnits([]);
        }
    };

    const fetchBedroomsForEdit = async (unitId) => {
        if (!unitId) {
            setEditBedrooms([]);
            return;
        }
        try {
            const bedroomRes = await api.get(`/api/admin/units/bedrooms/vacant?unitId=${unitId}`);
            setEditBedrooms(Array.isArray(bedroomRes.data) ? bedroomRes.data : []);
        } catch (e) {
            console.error('Failed to fetch bedrooms for edit', e);
            setEditBedrooms([]);
        }
    };

    const handleEditBuildingChange = (e) => {
        const propId = e.target.value;
        setEditLease(prev => ({
            ...prev,
            propertyId: propId,
            unitId: '',
            bedroomId: ''
        }));
        fetchUnitsForEdit(propId);
        setEditBedrooms([]);
    };

    const handleEditUnitChange = (e) => {
        const uId = e.target.value;
        setEditLease(prev => ({
            ...prev,
            unitId: uId,
            bedroomId: ''
        }));
        fetchBedroomsForEdit(uId);
    };

    const handleEditTenantChange = (e) => {
        const tId = e.target.value;
        const selectedTenant = tenants.find(t => t.id.toString() === tId);
        setEditLease(prev => ({
            ...prev,
            tenantId: tId,
            tenantFirstName: selectedTenant?.firstName || prev.tenantFirstName,
            tenantLastName: selectedTenant?.lastName || prev.tenantLastName,
            companyName: (selectedTenant?.type === 'COMPANY' || selectedTenant?.type === 'Company') ? (selectedTenant.companyName || selectedTenant.name) : prev.companyName,
            tenantType: selectedTenant?.type || prev.tenantType,
            coTenantIds: (prev.coTenantIds || []).filter(cid => cid.toString() !== tId)
        }));
    };

    /* SAVE EDIT */
    const handleEditSave = async (e) => {
        if ((editLease.tenantType === 'COMPANY' || editLease.companyName) && !editLease.companyName?.trim()) {
            alert('Company Name is required.');
            return;
        }

        if (!editLease.tenantFirstName?.trim() || !editLease.tenantLastName?.trim()) {
            alert('First Name and Last Name are required.');
            return;
        }

        e?.preventDefault();
        try {
            let promoPayload = {
                hasPromotion: false,
                promoType: null,
                promoDistribution: null,
                promoTotalDiscount: 0,
                promoMonthlyDiscount: 0,
                promoDurationMonths: 0
            };

            if (editLease.hasPromotion) {
                const baseRent = parseFloat(editLease.monthlyRent) || 0;
                const totalLeaseMonths = calculateDurationMonths(editLease.startDate, editLease.endDate);
                
                // GUARDRAIL: When lease is extended, lock duration to the initial promotional term
                const origDuration = parseInt(editLease.originalPromoDurationMonths) || 0;
                const durationMonths = (origDuration > 0 && totalLeaseMonths > origDuration) ? origDuration : totalLeaseMonths;

                let totalDiscount = 0;
                if (editLease.promoType === 'ONE_MONTH_FREE') totalDiscount = baseRent;
                else if (editLease.promoType === 'TWO_MONTHS_FREE') totalDiscount = baseRent * 2;
                else if (editLease.promoType === 'CUSTOM_AMOUNT') totalDiscount = parseFloat(editLease.promoTotalDiscount) || 0;

                let monthlyDiscount = 0;
                if (editLease.promoDistribution === 'DISTRIBUTED') {
                    monthlyDiscount = durationMonths > 0 ? parseFloat((totalDiscount / durationMonths).toFixed(2)) : 0;
                } else {
                    monthlyDiscount = totalDiscount;
                }

                // If lease is extended, preserve the original promoEndDate cutoff
                const promoEndDate = (origDuration > 0 && totalLeaseMonths > origDuration && editLease.promoEndDate) 
                    ? editLease.promoEndDate 
                    : editLease.endDate;

                promoPayload = {
                    hasPromotion: true,
                    promoType: editLease.promoType,
                    promoDistribution: editLease.promoDistribution,
                    promoTotalDiscount: totalDiscount,
                    promoMonthlyDiscount: monthlyDiscount,
                    promoDurationMonths: editLease.promoDistribution === 'DISTRIBUTED' ? durationMonths : (editLease.promoType === 'TWO_MONTHS_FREE' ? 2 : 1),
                    promoStartDate: editLease.promoStartDate || editLease.startDate,
                    promoEndDate: promoEndDate
                };
            }

            const payload = {
                monthlyRent: editLease.monthlyRent,
                startDate: editLease.startDate,
                endDate: editLease.endDate,
                firstName: editLease.tenantFirstName,
                lastName: editLease.tenantLastName,
                companyName: editLease.companyName,
                tenantId: editLease.tenantId ? parseInt(editLease.tenantId) : undefined,
                unitId: editLease.unitId ? parseInt(editLease.unitId) : undefined,
                bedroomId: editLease.bedroomId ? parseInt(editLease.bedroomId) : null,
                securityDeposit: editLease.securityDeposit ? parseFloat(editLease.securityDeposit) : 0,
                coTenantIds: (editLease.coTenantIds || []).map(id => parseInt(id)).filter(id => !isNaN(id)),
                ...promoPayload,
                lockers: [
                    // Existing locker edits (end date changes)
                    ...leaseLockers
                        .filter(lr => lockerToEdit && lockerToEdit.id === lr.id)
                        .map(lr => ({ rentalId: lr.id, endDate: lr.endDate, rentAmount: lr.rentAmount })),
                    // New lockers added
                    ...newLockerRows
                        .filter(row => row.lockerId && row.startDate && row.endDate && row.rentAmount)
                        .map(row => ({ lockerId: row.lockerId, startDate: row.startDate, endDate: row.endDate, rentAmount: row.rentAmount }))
                ]
            };

            await api.put(`/api/admin/leases/${editLease.id}`, payload);
            fetchLeases();
            setEditLease(null);
            setNewLockerRows([]);
            setLockerToEdit(null);
            setLeaseLockers([]);
        } catch (error) {
            console.error(error);
            alert('Failed to update lease');
        }
    };

    const openEditWithLockers = async (lease) => {
        const pId = lease.propertyId ? lease.propertyId.toString() : '';
        const uId = lease.unitId ? lease.unitId.toString() : '';
        const bId = lease.bedroomId ? lease.bedroomId.toString() : '';
        const tId = lease.tenantId ? lease.tenantId.toString() : '';
        const coIds = Array.isArray(lease.coTenantIds) ? lease.coTenantIds.map(id => id.toString()) : [];

        setEditLease({
            ...lease,
            propertyId: pId,
            unitId: uId,
            bedroomId: bId,
            tenantId: tId,
            coTenantIds: coIds,
            securityDeposit: lease.securityDeposit !== undefined && lease.securityDeposit !== null ? lease.securityDeposit : '',
            hasPromotion: Boolean(lease.hasPromotion),
            promoType: lease.promoType || 'ONE_MONTH_FREE',
            promoDistribution: lease.promoDistribution || 'FIRST_MONTH',
            promoTotalDiscount: lease.promoTotalDiscount || 0,
            promoMonthlyDiscount: lease.promoMonthlyDiscount || 0,
            promoDurationMonths: lease.promoDurationMonths || 0,
            originalPromoDurationMonths: lease.promoDurationMonths || 0,
            promoStartDate: lease.promoStartDate || '',
            promoEndDate: lease.promoEndDate || ''
        });
        setNewLockerRows([]);
        setLockerToEdit(null);

        if (pId) {
            fetchUnitsForEdit(pId);
        } else {
            setEditUnits([]);
        }

        if (uId) {
            fetchBedroomsForEdit(uId);
        } else {
            setEditBedrooms([]);
        }

        // Fetch existing locker rentals for this lease
        try {
            const res = await api.get(`/api/admin/leases/${lease.id}/lockers`);
            setLeaseLockers(res.data || []);
        } catch {
            setLeaseLockers([]);
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
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {lease.companyName ? (
                                                <div>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-sm font-bold text-slate-800">{lease.companyName}</span>
                                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-100 uppercase tracking-wider">Company</span>
                                                    </div>
                                                    <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                                                        <span className="text-slate-400 font-medium">Rep:</span>
                                                        <span className="font-medium text-slate-600">{lease.responsiblePerson || lease.primaryTenantName || lease.tenant}</span>
                                                        {lease.coTenants && lease.coTenants.length > 0 && (
                                                            <span className="text-slate-400">({lease.coTenants.join(', ')})</span>
                                                        )}
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-sm font-medium text-slate-700">{lease.tenant}</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-mono text-[13px]">{lease.term}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-700">
                                            <div>${(lease.monthlyRent || 0).toLocaleString('en-CA')}</div>
                                            {lease.hasPromotion && (
                                                <div className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full mt-1">
                                                    <Tag size={10} />
                                                    <span>
                                                        {lease.promoType === 'ONE_MONTH_FREE' ? '1 Mo Free' :
                                                         lease.promoType === 'TWO_MONTHS_FREE' ? '2 Mos Free' :
                                                         lease.promoType === 'CUSTOM_AMOUNT' ? `-$${(lease.promoTotalDiscount || 0).toLocaleString('en-CA')}` :
                                                         'Promo'}
                                                    </span>
                                                </div>
                                            )}
                                        </td>
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
                                                        onClick={() => openEditWithLockers(lease)}
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
                                {selectedLease.companyName ? (
                                    <>
                                        <div className="flex justify-between py-3 border-b border-slate-100">
                                            <span className="text-sm font-medium text-slate-500">Company (Lessee)</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-bold text-slate-900">{selectedLease.companyName}</span>
                                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-100 uppercase">Company</span>
                                            </div>
                                        </div>
                                        <div className="flex justify-between py-3 border-b border-slate-100">
                                            <span className="text-sm font-medium text-slate-500">Responsible Person</span>
                                            <span className="text-sm font-medium text-slate-900">{selectedLease.responsiblePerson || selectedLease.primaryTenantName || selectedLease.tenant}</span>
                                        </div>
                                        {selectedLease.coTenants && selectedLease.coTenants.length > 0 && (
                                            <div className="flex justify-between py-3 border-b border-slate-100">
                                                <span className="text-sm font-medium text-slate-500">Co-Tenants</span>
                                                <span className="text-sm font-medium text-slate-900">{selectedLease.coTenants.join(', ')}</span>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="flex justify-between py-3 border-b border-slate-100">
                                        <span className="text-sm font-medium text-slate-500">Tenant</span>
                                        <span className="text-sm font-medium text-slate-900">{selectedLease.tenant}</span>
                                    </div>
                                )}
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

                                {selectedLease.hasPromotion && (
                                    <div className="bg-emerald-50/70 rounded-xl p-4 border border-emerald-200 mt-3">
                                        <div className="flex items-center justify-between gap-2 mb-3">
                                            <div className="flex items-center gap-1.5 text-emerald-800 font-bold text-sm">
                                                <Tag size={16} className="text-emerald-600" />
                                                <span>Promotional Rent Discount</span>
                                            </div>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                                                (selectedLease.promoEndDate && new Date() > new Date(selectedLease.promoEndDate + 'T23:59:59'))
                                                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                                    : 'bg-emerald-100 text-emerald-700'
                                            }`}>
                                                {(selectedLease.promoEndDate && new Date() > new Date(selectedLease.promoEndDate + 'T23:59:59')) ? 'Expired' : 'Applied'}
                                            </span>
                                        </div>
                                        <div className="space-y-2 text-xs">
                                            {selectedLease.promoEndDate && (
                                                <div className="flex justify-between py-1 border-b border-emerald-100/60">
                                                    <span className="text-slate-500 font-medium">Promotion Expiry</span>
                                                    <span className="font-semibold text-slate-800 font-mono">
                                                        {selectedLease.promoEndDate} ({selectedLease.promoDurationMonths || 12} mos term)
                                                    </span>
                                                </div>
                                            )}
                                            <div className="flex justify-between py-1 border-b border-emerald-100/60">
                                                <span className="text-slate-500 font-medium">Original Monthly Rent</span>
                                                <span className="font-semibold text-slate-900">${(selectedLease.monthlyRent || 0).toLocaleString('en-CA')}</span>
                                            </div>
                                            <div className="flex justify-between py-1 border-b border-emerald-100/60">
                                                <span className="text-slate-500 font-medium">Promotional Offer</span>
                                                <span className="font-bold text-emerald-800">
                                                    {selectedLease.promoType === 'ONE_MONTH_FREE' ? '1 Month Free' :
                                                     selectedLease.promoType === 'TWO_MONTHS_FREE' ? '2 Months Free' :
                                                     selectedLease.promoType === 'CUSTOM_AMOUNT' ? `Custom ($${(selectedLease.promoTotalDiscount || 0).toLocaleString('en-CA')})` :
                                                     selectedLease.promoType || 'Active Promotion'}
                                                </span>
                                            </div>
                                            <div className="flex justify-between py-1 border-b border-emerald-100/60">
                                                <span className="text-slate-500 font-medium">Total Discount Value</span>
                                                <span className="font-bold text-emerald-700">${(selectedLease.promoTotalDiscount || 0).toLocaleString('en-CA')}</span>
                                            </div>
                                            <div className="flex justify-between py-1 border-b border-emerald-100/60">
                                                <span className="text-slate-500 font-medium">Distribution Method</span>
                                                <span className="font-semibold text-slate-800">
                                                    {selectedLease.promoDistribution === 'DISTRIBUTED' ? 'Distributed Over Lease Term' : 'Free Rent Applied to First Month'}
                                                </span>
                                            </div>
                                            <div className="flex justify-between py-1 border-b border-emerald-100/60">
                                                <span className="text-slate-500 font-medium">Monthly Discount Amount</span>
                                                <span className="font-bold text-emerald-600">
                                                    {selectedLease.promoDistribution === 'DISTRIBUTED'
                                                        ? `-$${(selectedLease.promoMonthlyDiscount || 0).toLocaleString('en-CA')}/month`
                                                        : `-$${(selectedLease.promoTotalDiscount || 0).toLocaleString('en-CA')} (Month 1)`}
                                                </span>
                                            </div>
                                            <div className="flex justify-between py-1">
                                                <span className="text-slate-500 font-medium">Promotional Period</span>
                                                <span className="font-semibold text-slate-900">
                                                    {selectedLease.promoDistribution === 'DISTRIBUTED'
                                                        ? `Months 1–${selectedLease.promoDurationMonths || 12}`
                                                        : selectedLease.promoType === 'TWO_MONTHS_FREE' ? 'Months 1–2 only' : 'Month 1 only'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {selectedLease.lockers && selectedLease.lockers.length > 0 && (
                                    <div className="mt-4">
                                        <div className="flex items-center gap-2 mb-3">
                                            <Lock size={15} className="text-indigo-500" />
                                            <span className="text-sm font-bold text-slate-700">Locker Rentals</span>
                                        </div>
                                        {selectedLease.lockers.map((lr, i) => {
                                            const today = new Date().toISOString().split('T')[0];
                                            const sDate = lr.startDate?.substring(0, 10);
                                            const eDate = lr.endDate?.substring(0, 10);
                                            let status = 'Upcoming';
                                            if (sDate <= today && eDate >= today) status = 'Active';
                                            else if (eDate < today) status = 'Ended';

                                            return (
                                                <div key={i} className="bg-indigo-50 rounded-lg p-3 mb-2 text-xs text-slate-700 border border-indigo-100 flex justify-between items-center">
                                                    <div>
                                                        <div className="font-bold text-indigo-700">{lr.locker?.property?.name} — {lr.locker?.lockerNumber}</div>
                                                        <div className="text-slate-500 mt-1">${Number(lr.rentAmount).toFixed(2)}/mo · {sDate} → {eDate}</div>
                                                    </div>
                                                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                                                        status === 'Active' ? 'bg-emerald-100 text-emerald-700' :
                                                        status === 'Upcoming' ? 'bg-amber-100 text-amber-700' :
                                                        'bg-slate-200 text-slate-600'
                                                    }`}>
                                                        {status}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                            </div>

                            <div className="flex justify-end">
                                <Button variant="secondary" onClick={() => setSelectedLease(null)}>Close</Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* EDIT MODAL */}
                {editLease && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200 p-4">
                        <form onSubmit={handleEditSave} className="bg-white rounded-2xl p-6 md:p-8 w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-300">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="text-xl font-bold text-slate-900">Edit Lease</h3>
                                    <p className="text-xs text-slate-400 mt-0.5">Update lease terms, property details, and occupants</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setEditLease(null)}
                                    className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="space-y-4 mb-8">
                                {/* Building Selection */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700">Building</label>
                                    <div className="relative">
                                        <Home size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <select
                                            value={editLease.propertyId || ''}
                                            onChange={handleEditBuildingChange}
                                            className="w-full pl-10 pr-10 py-2 rounded-lg border border-slate-200 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all text-sm appearance-none bg-white font-medium"
                                        >
                                            <option value="">Select Building</option>
                                            {buildings.map(b => (
                                                <option key={b.id} value={b.id}>{b.name}</option>
                                            ))}
                                        </select>
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                            <ChevronDown size={16} />
                                        </div>
                                    </div>
                                </div>

                                {/* Unit and Bedroom Selection */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700">Unit</label>
                                        <div className="relative">
                                            <Home size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <select
                                                value={editLease.unitId || ''}
                                                onChange={handleEditUnitChange}
                                                disabled={!editLease.propertyId}
                                                className="w-full pl-10 pr-10 py-2 rounded-lg border border-slate-200 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all text-sm appearance-none bg-white font-medium disabled:opacity-50"
                                            >
                                                <option value="">Select Unit</option>
                                                {editUnits.map(u => (
                                                    <option key={u.id} value={u.id}>{u.unitNumber || u.name}</option>
                                                ))}
                                            </select>
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                                <ChevronDown size={16} />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700">Bedroom (Optional)</label>
                                        <div className="relative">
                                            <Bed size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <select
                                                value={editLease.bedroomId || ''}
                                                onChange={(e) => setEditLease({ ...editLease, bedroomId: e.target.value })}
                                                disabled={!editLease.unitId}
                                                className="w-full pl-10 pr-10 py-2 rounded-lg border border-slate-200 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all text-sm appearance-none bg-white font-medium disabled:opacity-50"
                                            >
                                                <option value="">Full Unit (No specific room)</option>
                                                {editBedrooms.map(b => (
                                                    <option key={b.id} value={b.id}>{b.bedroomNumber || b.displayName}</option>
                                                ))}
                                            </select>
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                                <ChevronDown size={16} />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Primary Tenant */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700">Primary Tenant</label>
                                    <div className="relative">
                                        <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <select
                                            value={editLease.tenantId || ''}
                                            onChange={handleEditTenantChange}
                                            className="w-full pl-10 pr-10 py-2 rounded-lg border border-slate-200 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all text-sm appearance-none bg-white font-medium"
                                        >
                                            <option value="">Select Primary Tenant</option>
                                            {tenants.map(t => (
                                                <option key={t.id} value={t.id}>{t.name} ({t.type || 'Individual'})</option>
                                            ))}
                                        </select>
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                            <ChevronDown size={16} />
                                        </div>
                                    </div>
                                    {editLease.tenantId && tenants.find(t => t.id.toString() === editLease.tenantId?.toString())?.type === 'RESIDENT' && (
                                        <p className="text-xs font-semibold text-amber-600 mt-1 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-100 flex items-center gap-1.5 w-fit">
                                            <Shield size={12} />
                                            Resident of: {tenants.find(t => t.id.toString() === editLease.tenantId?.toString())?.parentName || 'Unknown Parent'}
                                        </p>
                                    )}
                                </div>

                                {/* Co-Applicants / Occupants Multi-select */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700">Co-Applicants / Occupants (Optional)</label>
                                    <div className="relative">
                                        <div className="flex flex-wrap gap-1.5 mb-2 min-h-[28px]">
                                            {(editLease.coTenantIds || []).map(id => {
                                                const t = tenants.find(tenant => tenant.id.toString() === id.toString());
                                                return (
                                                    <span key={id} className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 border border-indigo-100 rounded-lg text-xs font-semibold text-indigo-700">
                                                        {t ? t.name : `Tenant #${id}`}
                                                        <button
                                                            type="button"
                                                            onClick={() => setEditLease(prev => ({
                                                                ...prev,
                                                                coTenantIds: (prev.coTenantIds || []).filter(cid => cid.toString() !== id.toString())
                                                            }))}
                                                            className="hover:text-indigo-900 text-sm font-bold ml-1 leading-none"
                                                        >
                                                            &times;
                                                        </button>
                                                    </span>
                                                );
                                            })}
                                        </div>
                                        <div className="relative">
                                            <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <select
                                                value=""
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    if (val && !(editLease.coTenantIds || []).some(cid => cid.toString() === val.toString())) {
                                                        setEditLease(prev => ({
                                                            ...prev,
                                                            coTenantIds: [...(prev.coTenantIds || []), val]
                                                        }));
                                                    }
                                                }}
                                                className="w-full pl-10 pr-10 py-2 rounded-lg border border-slate-200 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all text-sm appearance-none bg-slate-50/50 font-medium"
                                            >
                                                <option value="">Add Co-Tenant...</option>
                                                {tenants
                                                    .filter(t => t.id.toString() !== editLease.tenantId?.toString() && !(editLease.coTenantIds || []).some(cid => cid.toString() === t.id.toString()))
                                                    .map(t => (
                                                        <option key={t.id} value={t.id}>{t.name}</option>
                                                    ))}
                                            </select>
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                                <ChevronDown size={16} />
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-[11px] text-slate-400">Select additional tenants / occupants for this lease.</p>
                                </div>

                                {Boolean(editLease.companyName || editLease.tenantType === 'COMPANY') && (
                                    <div className="space-y-2 p-3 bg-purple-50/50 rounded-xl border border-purple-100">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-bold text-purple-900 uppercase tracking-wider">Company Legal Name (Lessee)</label>
                                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 uppercase">Company Lease</span>
                                        </div>
                                        <div className="relative">
                                            <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-400" />
                                            <input
                                                className="w-full pl-10 pr-4 py-2 rounded-lg border border-purple-200 bg-white outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all text-sm font-semibold text-slate-800"
                                                value={editLease.companyName || ''}
                                                onChange={(e) => setEditLease({ ...editLease, companyName: e.target.value })}
                                                placeholder="Company Name"
                                                required
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700">
                                            {Boolean(editLease.companyName || editLease.tenantType === 'COMPANY') ? 'Rep. First Name' : 'First Name'}
                                        </label>
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
                                        <label className="text-sm font-medium text-slate-700">
                                            {Boolean(editLease.companyName || editLease.tenantType === 'COMPANY') ? 'Rep. Last Name' : 'Last Name'}
                                        </label>
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

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700">Monthly Rent</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                                            <input
                                                type="number"
                                                className="w-full pl-8 pr-4 py-2 rounded-lg border border-slate-200 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all text-sm font-semibold"
                                                value={editLease.monthlyRent}
                                                onChange={(e) => setEditLease({ ...editLease, monthlyRent: e.target.value })}
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700">Security Deposit</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                                            <input
                                                type="number"
                                                className="w-full pl-8 pr-4 py-2 rounded-lg border border-slate-200 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all text-sm font-semibold"
                                                value={editLease.securityDeposit || ''}
                                                onChange={(e) => setEditLease({ ...editLease, securityDeposit: e.target.value })}
                                                placeholder="0"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* PROMOTIONAL DISCOUNT SECTION */}
                                <div className="border-t border-slate-100 pt-4 mt-2">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <Tag size={16} className="text-emerald-600" />
                                            <div>
                                                <span className="text-sm font-bold text-slate-800">Promotional Rent Discount</span>
                                                <p className="text-[11px] text-slate-400 m-0">Apply or update promotional rent discount</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center bg-slate-100 p-0.5 rounded-lg">
                                            <button
                                                type="button"
                                                onClick={() => setEditLease(prev => ({ ...prev, hasPromotion: false }))}
                                                className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
                                                    !editLease.hasPromotion ? 'bg-white text-slate-700 shadow-xs' : 'text-slate-500 hover:text-slate-700'
                                                }`}
                                            >
                                                No
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setEditLease(prev => ({
                                                    ...prev,
                                                    hasPromotion: true,
                                                    promoType: prev.promoType || 'ONE_MONTH_FREE',
                                                    promoDistribution: prev.promoDistribution || 'FIRST_MONTH'
                                                }))}
                                                className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
                                                    editLease.hasPromotion ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-700'
                                                }`}
                                            >
                                                Yes
                                            </button>
                                        </div>
                                    </div>

                                    {editLease.hasPromotion && (() => {
                                        const editBaseRent = parseFloat(editLease.monthlyRent) || 0;
                                        const totalLeaseMonths = calculateDurationMonths(editLease.startDate, editLease.endDate);
                                        const origDuration = parseInt(editLease.originalPromoDurationMonths) || 0;
                                        const isExtended = origDuration > 0 && totalLeaseMonths > origDuration;
                                        const editDurationMonths = isExtended ? origDuration : totalLeaseMonths;

                                        let editCalculatedDiscount = 0;
                                        if (editLease.promoType === 'ONE_MONTH_FREE') editCalculatedDiscount = editBaseRent;
                                        else if (editLease.promoType === 'TWO_MONTHS_FREE') editCalculatedDiscount = editBaseRent * 2;
                                        else if (editLease.promoType === 'CUSTOM_AMOUNT') editCalculatedDiscount = parseFloat(editLease.promoTotalDiscount) || 0;

                                        let editMonthlyDiscount = 0;
                                        if (editLease.promoDistribution === 'DISTRIBUTED') {
                                            editMonthlyDiscount = editDurationMonths > 0 ? parseFloat((editCalculatedDiscount / editDurationMonths).toFixed(2)) : 0;
                                        } else {
                                            editMonthlyDiscount = editCalculatedDiscount;
                                        }

                                        return (
                                            <div className="bg-emerald-50/60 rounded-xl p-3.5 border border-emerald-100 space-y-3">
                                                {isExtended && (
                                                    <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px]">
                                                        <Shield size={14} className="text-amber-600 shrink-0" />
                                                        <div>
                                                            <span className="font-bold">Guardrail Active:</span> Lease extended to {totalLeaseMonths} mos. Promotional discount strictly expires after initial {origDuration} mos.
                                                        </div>
                                                    </div>
                                                )}
                                                <div>
                                                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-1.5">Promotion Offer</label>
                                                    <div className="grid grid-cols-3 gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => setEditLease(prev => ({ ...prev, promoType: 'ONE_MONTH_FREE' }))}
                                                            className={`p-2 rounded-lg border text-left text-xs transition-all ${
                                                                editLease.promoType === 'ONE_MONTH_FREE'
                                                                    ? 'border-emerald-500 bg-white font-bold text-emerald-800 ring-2 ring-emerald-500/20'
                                                                    : 'border-slate-200 bg-white/70 text-slate-700'
                                                            }`}
                                                        >
                                                            1 Month Free
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setEditLease(prev => ({ ...prev, promoType: 'TWO_MONTHS_FREE' }))}
                                                            className={`p-2 rounded-lg border text-left text-xs transition-all ${
                                                                editLease.promoType === 'TWO_MONTHS_FREE'
                                                                    ? 'border-emerald-500 bg-white font-bold text-emerald-800 ring-2 ring-emerald-500/20'
                                                                    : 'border-slate-200 bg-white/70 text-slate-700'
                                                            }`}
                                                        >
                                                            2 Months Free
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setEditLease(prev => ({ ...prev, promoType: 'CUSTOM_AMOUNT' }))}
                                                            className={`p-2 rounded-lg border text-left text-xs transition-all ${
                                                                editLease.promoType === 'CUSTOM_AMOUNT'
                                                                    ? 'border-emerald-500 bg-white font-bold text-emerald-800 ring-2 ring-emerald-500/20'
                                                                    : 'border-slate-200 bg-white/70 text-slate-700'
                                                            }`}
                                                        >
                                                            Custom ($)
                                                        </button>
                                                    </div>

                                                    {editLease.promoType === 'CUSTOM_AMOUNT' && (
                                                        <div className="mt-2">
                                                            <input
                                                                type="number"
                                                                placeholder="Custom discount amount"
                                                                value={editLease.promoTotalDiscount || ''}
                                                                onChange={(e) => setEditLease(prev => ({ ...prev, promoTotalDiscount: e.target.value }))}
                                                                className="w-full px-3 py-1.5 text-xs rounded border border-slate-200 bg-white outline-none focus:border-emerald-500"
                                                            />
                                                        </div>
                                                    )}
                                                </div>

                                                <div>
                                                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-1.5">Distribution Method</label>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => setEditLease(prev => ({ ...prev, promoDistribution: 'FIRST_MONTH' }))}
                                                            className={`p-2 rounded-lg border text-left text-xs transition-all ${
                                                                editLease.promoDistribution === 'FIRST_MONTH'
                                                                    ? 'border-emerald-500 bg-white font-bold text-emerald-800 ring-2 ring-emerald-500/20'
                                                                    : 'border-slate-200 bg-white/70 text-slate-700'
                                                            }`}
                                                        >
                                                            First Month Free
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setEditLease(prev => ({ ...prev, promoDistribution: 'DISTRIBUTED' }))}
                                                            className={`p-2 rounded-lg border text-left text-xs transition-all ${
                                                                editLease.promoDistribution === 'DISTRIBUTED'
                                                                    ? 'border-emerald-500 bg-white font-bold text-emerald-800 ring-2 ring-emerald-500/20'
                                                                    : 'border-slate-200 bg-white/70 text-slate-700'
                                                            }`}
                                                        >
                                                            Distributed ({editDurationMonths} mos)
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="bg-white rounded-lg p-2.5 border border-emerald-200 text-[11px] space-y-1">
                                                    <div className="flex justify-between text-slate-600">
                                                        <span>Total Discount:</span>
                                                        <span className="font-bold text-emerald-700">${editCalculatedDiscount.toLocaleString('en-CA')}</span>
                                                    </div>
                                                    <div className="flex justify-between text-slate-600">
                                                        <span>Monthly Discount:</span>
                                                        <span className="font-bold text-emerald-700">
                                                            {editLease.promoDistribution === 'DISTRIBUTED'
                                                                ? `-$${editMonthlyDiscount.toLocaleString('en-CA')}/mo`
                                                                : `-$${editCalculatedDiscount.toLocaleString('en-CA')} (Month 1)`}
                                                        </span>
                                                    </div>
                                                    <div className="text-[10px] text-slate-400 italic pt-1 border-t border-slate-100">
                                                        * Updating promotional parameters applies to future invoices only. Past invoices remain unchanged.
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>

                                {/* LOCKER SECTION (Req 11) */}
                                <div className="border-t border-slate-100 pt-4 mt-2">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <Lock size={15} className="text-indigo-500" />
                                            <span className="text-sm font-bold text-slate-700">Lockers</span>
                                        </div>
                                        <button
                                            type="button"
                                            className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
                                            onClick={() => setNewLockerRows([...newLockerRows, { lockerId: '', rentAmount: '', startDate: '', endDate: '' }])}
                                        >
                                            <Plus size={13} /> Add Another Locker
                                        </button>
                                    </div>

                                    {/* Existing Lockers */}
                                    {leaseLockers.map((lr, i) => (
                                        <div key={lr.id} className="bg-indigo-50 rounded-lg p-3 mb-2 border border-indigo-100">
                                            <div className="text-xs font-bold text-indigo-700 mb-2">{lr.locker?.property?.name} — {lr.locker?.lockerNumber}</div>
                                            <div className="grid grid-cols-3 gap-2">
                                                <div>
                                                    <label className="text-[10px] text-slate-500 font-medium uppercase">Rent</label>
                                                    <input
                                                        type="number"
                                                        className="w-full px-2 py-1.5 text-xs rounded border border-slate-200 outline-none focus:border-indigo-400"
                                                        value={lr.rentAmount}
                                                        onChange={(e) => {
                                                            const updated = [...leaseLockers];
                                                            updated[i] = { ...lr, rentAmount: e.target.value };
                                                            setLeaseLockers(updated);
                                                        }}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] text-slate-500 font-medium uppercase">End Date</label>
                                                    <input
                                                        type="date"
                                                        className="w-full px-2 py-1.5 text-xs rounded border border-slate-200 outline-none focus:border-indigo-400"
                                                        value={lr.endDate?.substring(0, 10)}
                                                        onChange={(e) => {
                                                            const updated = [...leaseLockers];
                                                            updated[i] = { ...lr, endDate: e.target.value };
                                                            setLeaseLockers(updated);
                                                            setLockerToEdit(lr);
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    {/* New Locker Rows */}
                                    {newLockerRows.map((row, i) => (
                                        <div key={i} className="bg-slate-50 rounded-lg p-3 mb-2 border border-slate-200">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-xs font-bold text-slate-600">New Locker {i + 1}</span>
                                                <button type="button" className="text-red-400 hover:text-red-600" onClick={() => setNewLockerRows(newLockerRows.filter((_, idx) => idx !== i))}>
                                                    <X size={13} />
                                                </button>
                                            </div>
                                            <div className="space-y-2">
                                                <select
                                                    className="w-full px-2 py-1.5 text-xs rounded border border-slate-200 outline-none focus:border-indigo-400"
                                                    value={row.lockerId}
                                                    onChange={(e) => { const r = [...newLockerRows]; r[i] = { ...row, lockerId: e.target.value }; setNewLockerRows(r); }}
                                                >
                                                    <option value="">Select Locker</option>
                                                    {availableLockers.map(l => (
                                                        <option key={l.id} value={l.id}>{l.property?.name} — {l.lockerNumber}</option>
                                                    ))}
                                                </select>
                                                <div className="grid grid-cols-3 gap-2">
                                                    <div>
                                                        <label className="text-[10px] text-slate-500 font-medium uppercase">Rent/mo</label>
                                                        <input type="number" placeholder="40" className="w-full px-2 py-1.5 text-xs rounded border border-slate-200 outline-none focus:border-indigo-400" value={row.rentAmount} onChange={(e) => { const r = [...newLockerRows]; r[i] = { ...row, rentAmount: e.target.value }; setNewLockerRows(r); }} />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] text-slate-500 font-medium uppercase">Start</label>
                                                        <input type="date" className="w-full px-2 py-1.5 text-xs rounded border border-slate-200 outline-none focus:border-indigo-400" value={row.startDate} onChange={(e) => { const r = [...newLockerRows]; r[i] = { ...row, startDate: e.target.value }; setNewLockerRows(r); }} />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] text-slate-500 font-medium uppercase">End</label>
                                                        <input type="date" className="w-full px-2 py-1.5 text-xs rounded border border-slate-200 outline-none focus:border-indigo-400" value={row.endDate} onChange={(e) => { const r = [...newLockerRows]; r[i] = { ...row, endDate: e.target.value }; setNewLockerRows(r); }} />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    {leaseLockers.length === 0 && newLockerRows.length === 0 && (
                                        <p className="text-xs text-slate-400 italic">No lockers assigned. Click "Add Another Locker" to assign one.</p>
                                    )}
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
