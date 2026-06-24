import React, { useEffect, useState } from 'react';
import { MainLayout } from '../layouts/MainLayout';
import { Eye, Trash2, CheckCircle, X, CreditCard, Wallet, Banknote, Loader2, Plus, Edit2, Send, Download, ChevronDown } from 'lucide-react';
import { Button } from '../components/Button';
import clsx from 'clsx';
import api from '../api/client';
import { hasPermission } from '../utils/permissions';

export const Invoices = () => {
    const [__forceUpdate, __setForceUpdate] = useState(0);
    useEffect(() => {
        const handleUpdate = () => __setForceUpdate(p => p + 1);
        window.addEventListener('permissionsUpdated', handleUpdate);
        return () => window.removeEventListener('permissionsUpdated', handleUpdate);
    }, []);

    const [predefinedServices, setPredefinedServices] = useState([]);
    const [showPresetsModal, setShowPresetsModal] = useState(false);
    const [newPreset, setNewPreset] = useState({ name: '', amount: '' });

    const [invoices, setInvoices] = useState([]);
    const [viewInvoice, setViewInvoice] = useState(null);
    const [isPaying, setIsPaying] = useState(null);
    const [paymentStatus, setPaymentStatus] = useState('idle'); // idle, processing, success
    const [editInvoice, setEditInvoice] = useState(null);
    const [isBatchRunning, setIsBatchRunning] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [settings, setSettings] = useState({});
    
    const [lineItems, setLineItems] = useState([{ description: '', amount: '' }]);

    // New State for Building/Tenant Selection
    const [buildings, setBuildings] = useState([]);
    const [selectedBuilding, setSelectedBuilding] = useState('');
    const [tenants, setTenants] = useState([]);
    const [availableMonths, setAvailableMonths] = useState([]);

    const [form, setForm] = useState({
        tenantId: '',
        unitId: '',
        tenant: '', // Display name or for edit mode
        unit: '',   // Unit ID (or number for display)
        unitName: '', // For display in create mode
        month: '',
        rent: '',
        serviceFees: '',
        category: 'RENT',
        description: '',
    });

    useEffect(() => {
        fetchInvoices();
        fetchBuildings();
        fetchSettings();
        fetchServiceItems();
    }, []);

    const fetchServiceItems = async () => {
        try {
            const res = await api.get('/api/admin/service-items');
            setPredefinedServices(res.data || []);
        } catch (e) {
            console.error('Failed to fetch service items', e);
        }
    };

    const fetchSettings = async () => {
        try {
            const res = await api.get('/api/admin/settings');
            setSettings(res.data.settings || {});
        } catch (e) {
            console.error('Failed to fetch settings', e);
        }
    };

    const fetchInvoices = async () => {
        try {
            const res = await api.get('/api/admin/invoices');
            setInvoices(res.data?.data || res.data || []);
        } catch (e) {
            console.error(e);
        }
    };

    const fetchBuildings = async () => {
        try {
            const res = await api.get('/api/admin/properties');
            setBuildings(res.data?.data || res.data || []);
        } catch (error) {
            console.error('Failed to fetch buildings', error);
        }
    };

    const fetchTenantsForBuilding = async (propertyId) => {
        try {
            const res = await api.get(`/api/admin/tenants?propertyId=${propertyId}&limit=1000&includePast=true`);
            setTenants(res.data?.data || res.data || []);
        } catch (error) {
            console.error('Failed to fetch tenants', error);
        }
    };

    const handleBuildingChange = (e) => {
        const buildingId = e.target.value;
        setSelectedBuilding(buildingId);
        setTenants([]);
        setAvailableMonths([]);
        setForm(prev => ({ ...prev, tenantId: '', tenant: '', unitId: '', unitName: '', month: '' }));

        if (buildingId) {
            fetchTenantsForBuilding(buildingId);
        }
    };

    const generateLeaseMonths = (start, end) => {
        if (!start || !end) return [];
        const startDate = new Date(start);
        const endDate = new Date(end);
        const months = [];

        let current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
        const endMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 1);

        while (current <= endMonth) {
            months.push(current.toLocaleString('default', { month: 'long', year: 'numeric' }));
            current.setMonth(current.getMonth() + 1);
        }
        return months;
    };

    const handleTenantChange = (e) => {
        const tenantId = e.target.value;
        if (!tenantId) {
            setAvailableMonths([]);
            setForm(prev => ({ ...prev, tenantId: '', tenant: '', unit: '', unitId: '', unitName: '', month: '' }));
            return;
        }

        const selectedTenant = tenants.find(t => t.id === parseInt(tenantId));
        if (selectedTenant) {
            const months = generateLeaseMonths(selectedTenant.leaseStartDate, selectedTenant.leaseEndDate);
            setAvailableMonths(months);

            const currentMonthStr = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
            const defaultMonth = months.includes(currentMonthStr) ? currentMonthStr : (months[0] || '');

            setForm(prev => ({
                ...prev,
                tenantId: selectedTenant.id,
                tenant: selectedTenant.name,
                unitId: selectedTenant.unitId,
                unit: selectedTenant.unit,
                unitName: selectedTenant.unit,
                month: defaultMonth,
                rent: (selectedTenant.rentAmount || 0).toString(),
            }));
        }
    };

    const handleBatchInvoicing = async () => {
        if (!window.confirm('Run batch invoicing for all active leases for the current month?')) return;
        setIsBatchRunning(true);
        try {
            const res = await api.post('/api/admin/invoices/batch');
            alert(`Batch complete! Created: ${res.data.createdCount}, Skipped: ${res.data.skippedCount}`);
            fetchInvoices();
        } catch (e) {
            console.error(e);
            alert('Batch run failed');
        } finally {
            setIsBatchRunning(false);
        }
    };

    const markPaid = async (id) => {
        try {
            await api.put(`/api/admin/invoices/${id}`, { status: 'paid' });
            fetchInvoices();
        } catch (e) { alert('Error updating status'); }
    };

    const markSent = async (id) => {
        try {
            await api.put(`/api/admin/invoices/${id}`, { status: 'sent' });
            fetchInvoices();
            if (viewInvoice && viewInvoice.id === id) {
                setViewInvoice({ ...viewInvoice, status: 'sent' });
            }
        } catch (e) { alert('Error updating status'); }
    };

    const deleteInvoice = async (id) => {
        if (!window.confirm('Delete this invoice?')) return;
        try {
            await api.delete(`/api/admin/invoices/${id}`);
            fetchInvoices();
        } catch (e) { alert('Error deleting invoice'); }
    };

    const handleSave = async (e, forcedStatus = null) => {
        if (e) e.preventDefault();

        try {
            const payload = {
                month: form.month,
                rent: form.category === 'RENT' ? form.rent : 0,
                serviceFees: (form.category === 'SERVICE' || form.category === 'SECURITY_DEPOSIT') ? form.serviceFees : 0,
                category: form.category,
                description: form.description,
                items: form.category === 'SERVICE' ? lineItems.filter(item => item.description && item.amount) : []
            };

            if (forcedStatus) payload.status = forcedStatus;

            if (editInvoice) {
                await api.put(`/api/admin/invoices/${editInvoice.id}`, payload);
            } else {
                await api.post('/api/admin/invoices', {
                    ...payload,
                    tenantId: form.tenantId,
                    unitId: form.unitId,
                    status: forcedStatus || 'draft'
                });
            }
            fetchInvoices();
            setShowForm(false);
            setEditInvoice(null);
            setForm({ tenantId: '', unitId: '', tenant: '', unit: '', unitName: '', month: '', rent: '', serviceFees: '', category: 'RENT', description: '' });
            setLineItems([{ description: '', amount: '' }]);
            setSelectedBuilding('');
            setAvailableMonths([]);
        } catch (e) {
            alert('Failed to save invoice');
        }
    };

    const openEdit = (inv) => {
        setEditInvoice(inv);
        const months = generateLeaseMonths(inv.leaseStartDate, inv.leaseEndDate);
        setAvailableMonths(months);

        setForm({
            tenantId: inv.tenantId || '',
            unitId: inv.unitId || '',
            tenant: inv.tenant,
            unit: inv.unit,
            month: inv.month,
            rent: (inv.rent || 0).toString(),
            serviceFees: (inv.serviceFees || 0).toString(),
            category: inv.category || 'RENT',
            description: inv.description || '',
        });
        setLineItems(inv.items && inv.items.length > 0 ? inv.items.map(i => ({ description: i.description, amount: i.amount.toString() })) : [{ description: '', amount: '' }]);
        setShowForm(true);
    };

    const [filterBuilding, setFilterBuilding] = useState('');
    const [filterUnit, setFilterUnit] = useState('');
    const [filterYear, setFilterYear] = useState('');
    const [filterMonth, setFilterMonth] = useState('');
    const [filterType, setFilterType] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 15;

    // Helper to parse inconsistent month strings (e.g., "April 2026", "Feb 2026", "2026-04-01")
    const getMonthYear = (str) => {
        if (!str) return { month: -1, year: -1 };
        
        let date = new Date(str);
        if (isNaN(date.getTime())) {
            // Handle formats like "Feb 2026" or "February 2026"
            const parts = str.split(' ');
            if (parts.length === 2) {
                const monthNames = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
                const month = monthNames.findIndex(m => m.startsWith(parts[0].toLowerCase()));
                const year = parseInt(parts[1]);
                return { month, year };
            }
        }
        return { month: date.getMonth(), year: date.getFullYear() };
    };

    const filteredInvoices = invoices.filter(inv => {
        const matchesBuilding = !filterBuilding || (inv.propertyId?.toString() === filterBuilding);
        const matchesUnit = !filterUnit || (inv.unit?.toLowerCase() || '').includes(filterUnit.toLowerCase());
        
        const { month, year } = getMonthYear(inv.month);
        const matchesYear = !filterYear || (year.toString() === filterYear);
        const matchesMonth = !filterMonth || (month.toString() === filterMonth);
        const matchesType = !filterType || (inv.category || 'RENT') === filterType;

        return matchesBuilding && matchesUnit && matchesYear && matchesMonth && matchesType;
    });

    // Summary calculations for the filtered view
    const filteredTotal = filteredInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
    const rentTotal = filteredInvoices.filter(inv => (inv.category || 'RENT') === 'RENT').reduce((sum, inv) => sum + (inv.amount || 0), 0);
    const depositTotal = filteredInvoices.filter(inv => inv.category === 'DEPOSIT' || inv.category === 'SECURITY_DEPOSIT').reduce((sum, inv) => sum + (inv.amount || 0), 0);
    const serviceTotal = filteredInvoices.filter(inv => inv.category === 'SERVICE').reduce((sum, inv) => sum + (inv.amount || 0), 0);
    const hasActiveFilters = filterBuilding || filterUnit || filterYear || filterMonth || filterType;

    const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);
    const currentInvoices = filteredInvoices.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const years = [...new Set(invoices.map(inv => getMonthYear(inv.month).year))].filter(y => y > 0).sort((a,b) => b-a);
    const months = [
        { id: 0, name: 'January' }, { id: 1, name: 'February' }, { id: 2, name: 'March' }, { id: 3, name: 'April' },
        { id: 4, name: 'May' }, { id: 5, name: 'June' }, { id: 6, name: 'July' }, { id: 7, name: 'August' },
        { id: 8, name: 'September' }, { id: 9, name: 'October' }, { id: 10, name: 'November' }, { id: 11, name: 'December' }
    ];

    return (
        <MainLayout title="Rent Invoices">
            <div className="p-6 flex flex-col gap-6">
                
                {/* GLOBAL FILTERS */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-wrap items-center gap-4">
                    <div className="flex-1 min-w-[200px]">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block">Building</label>
                        <select 
                            className="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/10"
                            value={filterBuilding}
                            onChange={(e) => { setFilterBuilding(e.target.value); setCurrentPage(1); }}
                        >
                            <option value="">All Buildings</option>
                            {buildings.map(b => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="w-32">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block">Unit</label>
                        <input 
                            type="text" 
                            placeholder="e.g. 301"
                            className="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/10"
                            value={filterUnit}
                            onChange={(e) => { setFilterUnit(e.target.value); setCurrentPage(1); }}
                        />
                    </div>

                    <div className="w-32">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block">Year</label>
                        <select 
                            className="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/10"
                            value={filterYear}
                            onChange={(e) => { setFilterYear(e.target.value); setCurrentPage(1); }}
                        >
                            <option value="">Year</option>
                            {years.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>

                    <div className="w-36">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block">Month</label>
                        <select 
                            className="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/10"
                            value={filterMonth}
                            onChange={(e) => { setFilterMonth(e.target.value); setCurrentPage(1); }}
                        >
                            <option value="">Month</option>
                            {months.map(m => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="w-44">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block">Type</label>
                        <select 
                            className="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/10"
                            value={filterType}
                            onChange={(e) => { setFilterType(e.target.value); setCurrentPage(1); }}
                        >
                            <option value="">All Types</option>
                            <option value="RENT">Rent</option>
                            <option value="DEPOSIT">Deposit</option>
                            <option value="SERVICE">Service Fees</option>
                        </select>
                    </div>

                    {hasActiveFilters && (
                        <button 
                            onClick={() => { setFilterBuilding(''); setFilterUnit(''); setFilterYear(''); setFilterMonth(''); setFilterType(''); setCurrentPage(1); }}
                            className="mt-5 text-xs font-bold text-rose-500 hover:text-rose-700 underline"
                        >
                            Reset
                        </button>
                    )}
                </div>

                {/* ACCOUNTING SUMMARY BAR — dynamic based on filterType */}
                {!filterType ? (
                    /* All Types view: full breakdown */
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-6 py-4 flex flex-wrap items-center gap-6">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Invoices</span>
                            <span className="text-lg font-black text-slate-800 mt-0.5">{filteredInvoices.length} <span className="text-sm font-semibold text-slate-400">Invoice{filteredInvoices.length !== 1 ? 's' : ''}</span></span>
                        </div>
                        <div className="h-10 w-px bg-slate-100"></div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Grand Total</span>
                            <span className="text-lg font-black text-slate-800 font-mono mt-0.5">$ {filteredTotal.toLocaleString('en-CA')}</span>
                        </div>
                        <div className="h-10 w-px bg-slate-100"></div>
                        <div className="flex gap-5 flex-wrap">
                            <div className="flex flex-col items-start bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-2.5">
                                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Rent Total</span>
                                <span className="text-base font-black text-indigo-700 font-mono mt-0.5">$ {rentTotal.toLocaleString('en-CA')}</span>
                            </div>
                            <div className="flex flex-col items-start bg-purple-50 border border-purple-100 rounded-xl px-4 py-2.5">
                                <span className="text-[10px] font-black uppercase tracking-widest text-purple-400">Deposit Total</span>
                                <span className="text-base font-black text-purple-700 font-mono mt-0.5">$ {depositTotal.toLocaleString('en-CA')}</span>
                            </div>
                            <div className="flex flex-col items-start bg-amber-50 border border-amber-100 rounded-xl px-4 py-2.5">
                                <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">Service Fees Total</span>
                                <span className="text-base font-black text-amber-700 font-mono mt-0.5">$ {serviceTotal.toLocaleString('en-CA')}</span>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* Single-type selected: focused summary card */
                    <div className={`rounded-2xl border shadow-sm px-6 py-4 flex flex-wrap items-center gap-8 ${
                        filterType === 'RENT' ? 'bg-indigo-50 border-indigo-200' :
                        filterType === 'DEPOSIT' ? 'bg-purple-50 border-purple-200' :
                        'bg-amber-50 border-amber-200'
                    }`}>
                        <div className="flex flex-col">
                            <span className={`text-[10px] font-black uppercase tracking-widest ${
                                filterType === 'RENT' ? 'text-indigo-400' :
                                filterType === 'DEPOSIT' ? 'text-purple-400' : 'text-amber-400'
                            }`}>
                                {filterType === 'RENT' ? 'Rent Invoices' : filterType === 'DEPOSIT' ? 'Deposit Invoices' : 'Service Fee Invoices'}
                            </span>
                            <span className={`text-2xl font-black mt-0.5 ${
                                filterType === 'RENT' ? 'text-indigo-700' :
                                filterType === 'DEPOSIT' ? 'text-purple-700' : 'text-amber-700'
                            }`}>{filteredInvoices.length} <span className="text-sm font-semibold opacity-60">Invoice{filteredInvoices.length !== 1 ? 's' : ''}</span></span>
                        </div>
                        <div className={`h-12 w-px ${
                            filterType === 'RENT' ? 'bg-indigo-200' :
                            filterType === 'DEPOSIT' ? 'bg-purple-200' : 'bg-amber-200'
                        }`}></div>
                        <div className="flex flex-col">
                            <span className={`text-[10px] font-black uppercase tracking-widest ${
                                filterType === 'RENT' ? 'text-indigo-400' :
                                filterType === 'DEPOSIT' ? 'text-purple-400' : 'text-amber-400'
                            }`}>
                                {filterType === 'RENT' ? 'Total Rent Collected' : filterType === 'DEPOSIT' ? 'Total Deposits Collected' : 'Total Service Fees'}
                            </span>
                            <span className={`text-3xl font-black font-mono mt-0.5 ${
                                filterType === 'RENT' ? 'text-indigo-700' :
                                filterType === 'DEPOSIT' ? 'text-purple-700' : 'text-amber-700'
                            }`}>$ {filteredTotal.toLocaleString('en-CA')}</span>
                        </div>
                        <div className={`ml-auto text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border ${
                            filterType === 'RENT' ? 'text-indigo-600 border-indigo-300 bg-indigo-100' :
                            filterType === 'DEPOSIT' ? 'text-purple-600 border-purple-300 bg-purple-100' :
                            'text-amber-600 border-amber-300 bg-amber-100'
                        }`}>
                            Filtered View
                        </div>
                    </div>
                )}

                <div className="flex justify-end gap-3 px-1">
                    {hasPermission('Invoices', 'edit') && (
                        <Button
                            variant="secondary"
                            onClick={() => setShowPresetsModal(true)}
                            className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                        >
                            Preset Rates ⚙️
                        </Button>
                    )}
                    {hasPermission('Invoices', 'add') && (
                        <Button
                            variant="secondary"
                            onClick={handleBatchInvoicing}
                            disabled={isBatchRunning}
                            className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                        >
                            {isBatchRunning ? <Loader2 size={18} className="mr-1 animate-spin" /> : <CreditCard size={18} className="mr-1" />}
                            Run Batch Rent Invoicing
                        </Button>
                    )}
                    {hasPermission('Invoices', 'add') && (
                        <Button variant="secondary" onClick={() => {
                            setEditInvoice(null);
                            setForm({ tenantId: '', unitId: '', tenant: '', unit: '', unitName: '', month: '', rent: '0', serviceFees: '', category: 'SECURITY_DEPOSIT', description: 'Security Deposit' });
                            setShowForm(true);
                        }} className="bg-purple-50 border-purple-100 text-purple-700 hover:bg-purple-100">
                            <Plus size={18} className="mr-1" />
                            Create Deposit Invoice
                        </Button>
                    )}
                    {hasPermission('Invoices', 'add') && (
                        <Button variant="secondary" onClick={() => {
                            setEditInvoice(null);
                            setForm({ tenantId: '', unitId: '', tenant: '', unit: '', unitName: '', month: '', rent: '0', serviceFees: '', category: 'SERVICE', description: '' });
                            setShowForm(true);
                        }}>
                            <Plus size={18} className="mr-1" />
                            Create Service Fee Invoice
                        </Button>
                    )}
                    {hasPermission('Invoices', 'add') && (
                        <Button variant="primary" onClick={() => {
                            setEditInvoice(null);
                            setForm({ tenantId: '', unitId: '', tenant: '', unit: '', unitName: '', month: '', rent: '', serviceFees: '0', category: 'RENT', description: '' });
                            setShowForm(true);
                        }}>
                            <Plus size={18} className="mr-1" />
                            Create Rent Invoice
                        </Button>
                    )}
                </div>

                <div className="w-full bg-white rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.06)] overflow-hidden border border-slate-100">
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-gray-100">
                                    <th className="p-4 text-xs text-left uppercase text-slate-500 font-bold tracking-wider whitespace-nowrap">Invoice No</th>
                                    <th className="p-4 text-xs text-left uppercase text-slate-500 font-bold tracking-wider whitespace-nowrap">Tenant</th>
                                    <th className="p-4 text-xs text-left uppercase text-slate-500 font-bold tracking-wider whitespace-nowrap">Unit</th>
                                    <th className="p-4 text-xs text-left uppercase text-slate-500 font-bold tracking-wider whitespace-nowrap">Type</th>
                                    <th className="p-4 text-xs text-left uppercase text-slate-500 font-bold tracking-wider whitespace-nowrap">Month</th>
                                    <th className="p-4 text-xs text-left uppercase text-slate-500 font-bold tracking-wider whitespace-nowrap">Amount</th>
                                    <th className="p-4 text-xs text-left uppercase text-slate-500 font-bold tracking-wider whitespace-nowrap">Status</th>
                                    <th className="p-4 text-xs text-left uppercase text-slate-500 font-bold tracking-wider whitespace-nowrap">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {currentInvoices.map(inv => (
                                    <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors border-b border-gray-100 last:border-0 hover:shadow-[0_4px_12px_rgba(0,0,0,0.03)] group/row">
                                        <td className="p-4 text-sm text-slate-700 font-bold font-mono whitespace-nowrap">{inv.invoiceNo}</td>
                                        <td className="p-4 text-sm text-slate-600 font-medium whitespace-nowrap">{inv.tenant}</td>
                                        <td className="p-4 text-sm text-slate-600 whitespace-nowrap">{inv.unit}</td>
                                        <td className="p-4 text-sm">
                                            <span className={clsx(
                                                "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase whitespace-nowrap shadow-sm border",
                                                inv.category === 'SERVICE' ? "bg-amber-50 text-amber-700 border-amber-100" : 
                                                inv.category === 'SECURITY_DEPOSIT' || inv.category === 'DEPOSIT' ? "bg-purple-50 text-purple-700 border-purple-100" :
                                                "bg-indigo-50 text-indigo-700 border-indigo-100"
                                            )}>
                                                {inv.category || 'RENT'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-sm text-slate-500 font-medium whitespace-nowrap">{inv.month}</td>
                                        <td className="p-4 text-sm text-slate-900 font-black font-mono whitespace-nowrap italic">$ {inv.amount.toLocaleString('en-CA')}</td>
                                        <td className="p-4 text-sm">
                                            <span className={clsx(
                                                "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider whitespace-nowrap shadow-sm border",
                                                inv.status === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                                inv.status === 'sent' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' :
                                                'bg-slate-50 text-slate-500 border-slate-100'
                                            )}>
                                                {inv.status}
                                            </span>
                                        </td>
                                        <td className="p-4 text-center">
                                            <div className="flex justify-center gap-2 text-slate-400 whitespace-nowrap opacity-60 group-hover/row:opacity-100 transition-opacity">
                                                <button onClick={() => setViewInvoice(inv)} className="p-1.5 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" title="View Detail">
                                                    <Eye size={16} />
                                                </button>
                                                {hasPermission('Invoices', 'edit') && (
                                                    <button onClick={() => openEdit(inv)} className="p-1.5 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all" title="Edit Record">
                                                        <Edit2 size={16} />
                                                    </button>
                                                )}
                                                {inv.status === 'sent' && hasPermission('Payments', 'add') && (
                                                    <button
                                                        onClick={() => {
                                                            setIsPaying(inv);
                                                            setPaymentStatus('idle');
                                                        }}
                                                        className="px-3 py-1 bg-emerald-600 text-white rounded-lg shadow-sm hover:bg-emerald-700 text-[10px] font-black uppercase transition-all flex items-center gap-1.5"
                                                    >
                                                        <CreditCard size={12} />
                                                        Pay
                                                    </button>
                                                )}
                                                {hasPermission('Invoices', 'delete') && (
                                                    <button onClick={() => deleteInvoice(inv.id)} className="p-1.5 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all" title="Delete Permanent">
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
                </div>

                {/* PAGINATION UI */}
                {totalPages > 1 && (
                    <div className="flex justify-center items-center gap-2 mt-4 pb-10">
                        {[...Array(totalPages)].map((_, idx) => (
                            <button
                                key={idx + 1}
                                onClick={() => setCurrentPage(idx + 1)}
                                className={`w-10 h-10 rounded-xl text-sm font-black transition-all border ${
                                    currentPage === idx + 1 
                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100' 
                                    : 'bg-white text-slate-500 border-slate-100 hover:border-indigo-300 hover:text-indigo-600'
                                }`}
                            >
                                {idx + 1}
                            </button>
                        ))}
                    </div>
                )}

                {viewInvoice && (
                    <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-[100] backdrop-blur-md animate-in fade-in duration-300 px-4">
                        <div className="bg-white rounded-3xl w-full max-w-2xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh] overflow-hidden border border-slate-200">
                            <div className="px-8 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between shrink-0">
                                <div className="flex items-center gap-2">
                                    <div className={clsx("w-2 h-2 rounded-full",
                                        viewInvoice.status === 'paid' ? 'bg-emerald-500' :
                                            viewInvoice.status === 'sent' ? 'bg-indigo-500' : 'bg-slate-400')}></div>
                                    <span className="text-[11px] font-black uppercase text-slate-500 tracking-widest">
                                        Invoice Status: {viewInvoice.status}
                                    </span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={async () => {
                                            try {
                                                const res = await api.get(`/api/admin/invoices/${viewInvoice.id}/download`, { responseType: 'blob' });
                                                const url = window.URL.createObjectURL(new Blob([res.data]));
                                                const link = document.createElement('a');
                                                link.href = url;
                                                link.setAttribute('download', `invoice-${viewInvoice.invoiceNo}.pdf`);
                                                document.body.appendChild(link);
                                                link.click();
                                                link.remove();
                                            } catch (e) { alert('Download failed'); }
                                        }}
                                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors border border-slate-200 bg-white"
                                    >
                                        <Download size={14} />
                                        Download PDF
                                    </button>
                                    <button onClick={() => setViewInvoice(null)} className="p-1.5 rounded-lg hover:bg-slate-200 transition-colors text-slate-400 border border-transparent">
                                        <X size={20} />
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-12 bg-white">
                                <div className="max-w-xl mx-auto space-y-12">
                                    <div className="flex justify-between items-start">
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-3 text-indigo-600">
                                                {settings.companyLogo ? (
                                                    <img src={settings.companyLogo} alt="Logo" className="w-10 h-10 object-contain" />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-xl italic">P</div>
                                                )}
                                                <h2 className="text-xl font-black tracking-tighter text-slate-900 uppercase italic">
                                                    {settings.companyName || 'Masteko'}
                                                </h2>
                                            </div>
                                            <div className="text-[11px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed whitespace-pre-line">
                                                {settings.companyAddress || ''}
                                                {settings.companyPhone && `\nPhone: ${settings.companyPhone}`}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic opacity-10">INVOICE</h1>
                                            <div className="mt-4 space-y-1">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Invoice Number</p>
                                                <p className="font-mono text-lg font-bold text-slate-800">{viewInvoice.invoiceNo}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-12 pt-8 border-t border-slate-100">
                                        <div className="space-y-4">
                                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Billed To</h4>
                                            <div>
                                                <p className="text-lg font-black text-slate-800 italic">{viewInvoice.tenant || 'Tenant'}</p>
                                                <p className="text-sm text-slate-600 font-medium">Unit {viewInvoice.unit || 'N/A'}</p>
                                                <p className="text-sm text-slate-400">Primary Resident</p>
                                            </div>
                                        </div>
                                        <div className="space-y-6">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Date Issued</p>
                                                    <p className="text-sm font-bold text-slate-700">{(viewInvoice.month || 'Jan 2026').split(' ')[0]} 01, {(viewInvoice.month || 'Jan 2026').split(' ')[1] || ''}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Due Date</p>
                                                    <p className="text-sm font-bold text-rose-600 underline underline-offset-4 decoration-2">{(viewInvoice.month || 'Jan 2026').split(' ')[0]} 10, {(viewInvoice.month || 'Jan 2026').split(' ')[1] || ''}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="bg-slate-900 rounded-xl px-6 py-3 flex items-center justify-between">
                                            <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">Description</span>
                                            <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">Amount</span>
                                        </div>
                                        <div className="space-y-0.5">
                                            <div className="px-6 py-4 flex items-center justify-between border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                                <div>
                                                    <p className="font-bold text-slate-800">Monthly Rent Payment</p>
                                                    <p className="text-[11px] text-slate-400 font-medium uppercase tracking-widest mt-0.5">Period: {viewInvoice.month}</p>
                                                </div>
                                                <span className="font-bold text-slate-700 font-mono italic">$ {(viewInvoice.rent || 0).toLocaleString('en-CA')}</span>
                                            </div>
                                            {viewInvoice.category === 'SERVICE' && viewInvoice.items && viewInvoice.items.length > 0 ? (
                                                viewInvoice.items.map((item, idx) => (
                                                    <div key={idx} className="px-6 py-4 flex items-center justify-between border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                                        <div>
                                                            <p className="font-bold text-slate-800">{item.description}</p>
                                                            <p className="text-[11px] text-slate-400 font-medium uppercase tracking-widest mt-0.5">Service Item</p>
                                                        </div>
                                                        <span className="font-bold text-slate-700 font-mono italic">$ {(parseFloat(item.amount) || 0).toLocaleString('en-CA')}</span>
                                                    </div>
                                                ))
                                            ) : (viewInvoice.serviceFees || 0) > 0 && (
                                                <div className="px-6 py-4 flex items-center justify-between border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                                    <div>
                                                        <p className="font-bold text-slate-800">Common Area Service Fees</p>
                                                        <p className="text-[11px] text-slate-400 font-medium uppercase tracking-widest mt-0.5">Maintenance & Amenities</p>
                                                    </div>
                                                    <span className="font-bold text-slate-700 font-mono italic">$ {(viewInvoice.serviceFees || 0).toLocaleString('en-CA')}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex justify-end pt-4">
                                        <div className="w-64 space-y-3">
                                            <div className="flex justify-between items-center text-sm px-2">
                                                <span className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Subtotal</span>
                                                <span className="font-bold text-slate-600 font-mono italic">$ {(viewInvoice.amount || 0).toLocaleString('en-CA')}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-sm px-2">
                                                <span className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Taxes (0%)</span>
                                                <span className="font-bold text-slate-600 font-mono italic">$ 0</span>
                                            </div>
                                            <div className="bg-indigo-600 rounded-2xl p-6 shadow-xl shadow-indigo-100 flex justify-between items-center text-white mt-4 relative overflow-hidden group">
                                                <div className="relative z-10">
                                                    <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Total Due</p>
                                                    <p className="text-2xl font-black tracking-tight mt-1 italic">$ {(viewInvoice.amount || 0).toLocaleString('en-CA')}</p>
                                                </div>
                                                <div className="absolute right-[-10%] top-[-20%] w-24 h-24 bg-white/5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-12 text-center border-t border-slate-50">
                                        <p className="text-xs text-slate-400 font-medium leading-relaxed italic">
                                            Thank you for being a valued tenant. Please ensure payments are made before the due date to avoid late fees.
                                            Contact support@propmanagesaas.com for any billing inquiries.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-8 bg-slate-50 border-t border-slate-100 shrink-0">
                                {viewInvoice.status === 'draft' ? (
                                    <div className="flex gap-4">
                                        {hasPermission('Invoices', 'edit') && (
                                            <Button
                                                onClick={() => {
                                                    const inv = viewInvoice;
                                                    setViewInvoice(null);
                                                    openEdit(inv);
                                                }}
                                                variant="secondary"
                                                className="flex-1 rounded-2xl py-4 h-auto font-black shadow-none border-2 border-slate-200 hover:bg-white flex items-center justify-center gap-2 group"
                                            >
                                                <Edit2 size={18} className="group-hover:rotate-12 transition-transform" />
                                                Edit Draft
                                            </Button>
                                        )}
                                        {hasPermission('SMS Hub', 'add') && (
                                            <Button
                                                onClick={() => markSent(viewInvoice.id)}
                                                className="flex-[2] rounded-2xl py-4 h-auto font-black shadow-xl shadow-indigo-100 flex items-center justify-center gap-3 group relative overflow-hidden"
                                            >
                                                <span className="relative z-10">Send to Tenant</span>
                                                <Send size={18} className="relative z-10 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                                <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-violet-600 group-hover:scale-105 transition-transform duration-500"></div>
                                            </Button>
                                        )}
                                    </div>
                                ) : (
                                    <Button
                                        onClick={() => setViewInvoice(null)}
                                        className="w-full rounded-2xl py-4 h-auto font-black shadow-lg shadow-slate-100 bg-slate-900 hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                                    >
                                        Return to Invoices
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {showForm && (
                    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-[110] backdrop-blur-sm animate-in fade-in">
                        <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl animate-in zoom-in-95 overflow-hidden flex flex-col max-h-[90vh]">
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
                                        {editInvoice ? <Edit2 size={20} /> : <Plus size={20} />}
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-800">{editInvoice ? 'Update Invoice' : 'Create New Invoice'}</h3>
                                        <p className="text-xs text-slate-500 font-medium">Fill in the details below</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowForm(false)} className="p-2 rounded-lg hover:bg-slate-200 transition-colors text-slate-400">
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleSave} className="p-6 space-y-5 overflow-y-auto flex-1 custom-scrollbar">
                                {!editInvoice && (
                                    <>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Select Building</label>
                                            <div className="relative">
                                                <select
                                                    value={selectedBuilding}
                                                    onChange={handleBuildingChange}
                                                    className="w-full p-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50/50 transition-all font-medium text-slate-800 appearance-none bg-white"
                                                >
                                                    <option value="">Choose Building</option>
                                                    {buildings.map(b => (
                                                        <option key={b.id} value={b.id}>{b.name}{b.civicNumber ? ` - ${b.civicNumber}` : ''}</option>
                                                    ))}
                                                </select>
                                                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Tenant</label>
                                                <div className="relative">
                                                    <select
                                                        value={form.tenantId || ''}
                                                        onChange={handleTenantChange}
                                                        disabled={!selectedBuilding}
                                                        className="w-full p-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50/50 transition-all font-medium text-slate-800 appearance-none bg-white disabled:bg-slate-50 disabled:text-slate-400"
                                                    >
                                                        <option value="">Select Tenant</option>
                                                        {tenants.filter(t => t.type !== 'RESIDENT' && t.type !== 'Resident').map(t => (
                                                            <option key={t.id} value={t.id}>{t.name}</option>
                                                        ))}
                                                    </select>
                                                    <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                                </div>
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Unit</label>
                                                <input
                                                    placeholder="Unit"
                                                    value={form.unitName || ''}
                                                    readOnly
                                                    className="w-full p-3 rounded-xl border border-slate-200 text-sm bg-slate-50 font-medium text-slate-600 focus:outline-none"
                                                />
                                            </div>
                                        </div>
                                    </>
                                )}

                                {editInvoice && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Tenant Name</label>
                                            <input
                                                value={form.tenant}
                                                readOnly
                                                className="w-full p-3 rounded-xl border border-slate-200 text-sm bg-slate-50 text-slate-600"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Unit Number</label>
                                            <input
                                                value={form.unit}
                                                readOnly
                                                className="w-full p-3 rounded-xl border border-slate-200 text-sm bg-slate-50 text-slate-600"
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Billing Month</label>
                                    <div className="relative">
                                        <select
                                            value={form.month}
                                            onChange={(e) => setForm({ ...form, month: e.target.value })}
                                            required
                                            disabled={availableMonths.length === 0}
                                            className="w-full p-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50/50 transition-all font-medium text-slate-800 appearance-none bg-white disabled:bg-slate-50 disabled:text-slate-400"
                                        >
                                            <option value="">Select Month</option>
                                            {availableMonths.map(m => (
                                                <option key={m} value={m}>{m}</option>
                                            ))}
                                        </select>
                                        <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Invoice Type</label>
                                    <div className="flex gap-2 p-1 bg-slate-100 rounded-xl overflow-x-auto no-scrollbar">
                                        <button
                                            type="button"
                                            onClick={() => setForm({ ...form, category: 'RENT', serviceFees: '0', description: '', rent: (editInvoice?.rent || '0').toString() })}
                                            className={clsx(
                                                "flex-1 py-2 px-3 text-[10px] font-black uppercase rounded-lg transition-all whitespace-nowrap",
                                                form.category === 'RENT' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                                            )}
                                        >
                                            Rent
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setForm({ ...form, category: 'SERVICE', rent: '0', description: '' })}
                                            className={clsx(
                                                "flex-1 py-2 px-3 text-[10px] font-black uppercase rounded-lg transition-all whitespace-nowrap",
                                                form.category === 'SERVICE' ? "bg-white text-amber-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                                            )}
                                        >
                                            Service Fee
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setForm({ ...form, category: 'SECURITY_DEPOSIT', rent: '0', description: 'Security Deposit' })}
                                            className={clsx(
                                                "flex-1 py-2 px-3 text-[10px] font-black uppercase rounded-lg transition-all whitespace-nowrap",
                                                form.category === 'SECURITY_DEPOSIT' ? "bg-white text-purple-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                                            )}
                                        >
                                            Deposit
                                        </button>
                                    </div>
                                </div>

                                {form.category === 'SERVICE' && (
                                    <div className="space-y-3 pt-2 border-t border-slate-100">
                                        <div className="flex justify-between items-center px-1">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Service Fee Items</label>
                                            <span className="text-[9px] text-slate-400 font-bold uppercase">Multi-line Invoice</span>
                                        </div>
                                        
                                        <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
                                            {lineItems.map((item, index) => (
                                                <div key={index} className="flex gap-2 items-center bg-slate-50 p-2 rounded-xl border border-slate-200 animate-in fade-in duration-200">
                                                    <div className="flex-1 relative">
                                                        <select
                                                            value={item.description}
                                                            onChange={(e) => {
                                                                 const selected = e.target.value;
                                                                 const preset = predefinedServices.find(p => p.name === selected);
                                                                 const newItems = [...lineItems];
                                                                 newItems[index].description = selected;
                                                                 if (preset) newItems[index].amount = preset.amount.toString();
                                                                 setLineItems(newItems);
                                                                 
                                                                 const total = newItems.reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0);
                                                                 setForm(prev => ({ ...prev, serviceFees: total.toString() }));
                                                             }}
                                                             className="w-full p-2.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-indigo-500 transition-all font-medium text-slate-800 bg-white"
                                                         >
                                                             <option value="">Select Service / Repair</option>
                                                             {predefinedServices.map(p => (
                                                                 <option key={p.name} value={p.name}>{p.name} (${p.amount})</option>
                                                             ))}
                                                            <option value="Other">Other Custom Charge</option>
                                                        </select>
                                                    </div>
                                                    <div className="w-24">
                                                        <input
                                                            type="text"
                                                            placeholder="0.00"
                                                            value={item.amount}
                                                            onChange={(e) => {
                                                                const newItems = [...lineItems];
                                                                newItems[index].amount = e.target.value;
                                                                setLineItems(newItems);
                                                                const total = newItems.reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0);
                                                                setForm(prev => ({ ...prev, serviceFees: total.toString() }));
                                                            }}
                                                            className="w-full p-2.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-800 text-right font-mono focus:outline-none focus:border-indigo-500"
                                                        />
                                                    </div>
                                                    <button 
                                                        type="button" 
                                                        onClick={() => {
                                                            const newItems = lineItems.filter((_, i) => i !== index);
                                                            setLineItems(newItems.length ? newItems : [{ description: '', amount: '' }]);
                                                            const total = newItems.reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0);
                                                            setForm(prev => ({ ...prev, serviceFees: total.toString() }));
                                                        }}
                                                        className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-100"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => setLineItems([...lineItems, { description: '', amount: '' }])}
                                            className="w-full py-2.5 border-2 border-dashed border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center justify-center gap-1 group"
                                        >
                                            <Plus size={14} className="group-hover:rotate-90 transition-transform" /> 
                                            Add Another Item
                                        </button>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-50">
                                    <div className="space-y-1.5">
                                        <div className="flex justify-between items-center px-1">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Base Rent ($)</label>
                                            {parseFloat(form.serviceFees) > 0 && <span className="text-[9px] text-amber-600 font-bold uppercase">Disabled</span>}
                                        </div>
                                        <input
                                            type="text"
                                            inputMode="decimal"
                                            placeholder="0.00"
                                            value={form.rent}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                if (val === '' || /^\d*\.?\d*$/.test(val)) {
                                                    setForm({ ...form, rent: val, serviceFees: '0', category: form.category === 'SECURITY_DEPOSIT' ? 'SECURITY_DEPOSIT' : 'RENT' });
                                                }
                                            }}
                                            required={parseFloat(form.serviceFees) === 0 && form.category !== 'SECURITY_DEPOSIT'}
                                            disabled={parseFloat(form.serviceFees) > 0 || form.category === 'SECURITY_DEPOSIT'}
                                            readOnly={!!form.tenantId && !editInvoice} 
                                            className="w-full p-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50/50 transition-all font-medium text-slate-900 font-mono disabled:bg-slate-50 disabled:text-slate-400 read-only:bg-slate-50 read-only:text-indigo-600"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <div className="flex justify-between items-center px-1">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Service Fees ($)</label>
                                            {parseFloat(form.rent) > 0 && <span className="text-[9px] text-amber-600 font-bold uppercase">Disabled</span>}
                                        </div>
                                        <input
                                            type="text"
                                            inputMode="decimal"
                                            placeholder="0.00"
                                            value={form.serviceFees}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                if (val === '' || /^\d*\.?\d*$/.test(val)) {
                                                    setForm({ ...form, serviceFees: val, rent: '0', category: form.category === 'SECURITY_DEPOSIT' ? 'SECURITY_DEPOSIT' : 'SERVICE' });
                                                }
                                            }}
                                            required={parseFloat(form.rent) === 0 && form.category !== 'RENT'}
                                            disabled={parseFloat(form.rent) > 0 && form.category !== 'SECURITY_DEPOSIT'}
                                            className="w-full p-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50/50 transition-all font-medium text-slate-900 font-mono disabled:bg-slate-50 disabled:text-slate-400"
                                        />
                                    </div>
                                </div>

                                <div className="bg-indigo-600 rounded-2xl p-5 text-white shadow-xl shadow-indigo-100 flex justify-between items-center">
                                    <div className="space-y-0.5">
                                        <p className="text-[10px] font-black uppercase tracking-[0.15em] opacity-80">Total Calculation</p>
                                        <p className="text-xs font-semibold opacity-60">Rent + Service Fees</p>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-2xl font-black tracking-tighter">$ {((parseFloat(form.rent) || 0) + (parseFloat(form.serviceFees) || 0)).toLocaleString('en-CA')}</span>
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-2 pb-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowForm(false)}
                                        className="flex-1 py-3.5 rounded-xl border-none cursor-pointer bg-slate-100 text-slate-600 hover:bg-slate-200 font-bold text-sm transition-all text-center"
                                    >
                                        Cancel
                                    </button>
                                    {!editInvoice && (
                                        <button
                                            type="button"
                                            onClick={(e) => handleSave(e, 'draft')}
                                            className="flex-1 py-3.5 rounded-xl border-none cursor-pointer bg-amber-50 text-amber-600 hover:bg-amber-100 font-bold text-sm transition-all"
                                        >
                                            Save Draft
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={(e) => handleSave(e, 'sent')}
                                        className="flex-1 py-3.5 rounded-xl border-none cursor-pointer bg-indigo-600 text-white hover:bg-indigo-700 font-bold text-sm shadow-lg shadow-indigo-100 transition-all active:scale-95"
                                    >
                                        {editInvoice ? 'Update & Save' : 'Finalize & Send'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {isPaying && (
                    <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-[120] backdrop-blur-md animate-in fade-in">
                        <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95">
                            {paymentStatus === 'idle' && (
                                <div className="p-8">
                                    <div className="flex justify-between items-center mb-6">
                                        <h3 className="text-2xl font-black text-slate-800 tracking-tight">Complete Payment</h3>
                                        <button onClick={() => setIsPaying(null)} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400">
                                            <X size={24} />
                                        </button>
                                    </div>

                                    <div className="bg-slate-900 rounded-2xl p-6 mb-8 text-white shadow-xl shadow-slate-200/50">
                                        <div className="flex justify-between items-end mb-4">
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Due Amount</p>
                                                <p className="text-3xl font-black tracking-tighter">$ {isPaying.amount.toLocaleString('en-CA')}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-400 mb-1">Invoice</p>
                                                <p className="font-bold text-xs">{isPaying.invoiceNo}</p>
                                            </div>
                                        </div>
                                        <div className="pt-4 border-t border-slate-800 flex justify-between items-center">
                                            <span className="text-xs font-bold text-slate-500">{isPaying.month}</span>
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-slate-800 px-2.5 py-1 rounded-full">Secure SSL</span>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 px-1">Payment Method</p>
                                        <button
                                            onClick={() => {
                                                setPaymentStatus('processing');
                                                setTimeout(() => {
                                                    setPaymentStatus('success');
                                                    markPaid(isPaying.id);
                                                }, 2000);
                                            }}
                                            className="w-full flex items-center gap-4 p-4 rounded-2xl border border-slate-100 hover:border-indigo-500 hover:bg-indigo-50/50 transition-all group active:scale-[0.98]"
                                        >
                                            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                                <CreditCard size={24} />
                                            </div>
                                            <div className="text-left flex-1">
                                                <p className="font-bold text-slate-800 group-hover:text-indigo-900">Card Payment</p>
                                                <p className="text-xs text-slate-500">Instant Verification</p>
                                            </div>
                                        </button>
                                        <button
                                            onClick={() => {
                                                setPaymentStatus('processing');
                                                setTimeout(() => {
                                                    setPaymentStatus('success');
                                                    markPaid(isPaying.id);
                                                }, 2000);
                                            }}
                                            className="w-full flex items-center gap-4 p-4 rounded-2xl border border-slate-100 hover:border-emerald-500 hover:bg-emerald-50/50 transition-all group active:scale-[0.98]"
                                        >
                                            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                                                <Wallet size={24} />
                                            </div>
                                            <div className="text-left flex-1">
                                                <p className="font-bold text-slate-800 group-hover:text-emerald-900">UPI / Net Banking</p>
                                                <p className="text-xs text-slate-500">No Transaction Fees</p>
                                            </div>
                                        </button>
                                    </div>
                                </div>
                            )}

                            {paymentStatus === 'processing' && (
                                <div className="p-16 flex flex-col items-center justify-center text-center space-y-8">
                                    <div className="relative">
                                        <div className="w-24 h-24 rounded-full border-4 border-slate-100 border-t-indigo-600 animate-spin"></div>
                                        <Loader2 size={32} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-600 animate-pulse" />
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="text-2xl font-black text-slate-800 tracking-tight">Authorizing...</h3>
                                        <p className="text-slate-500 font-medium">Communicating with the bank securely</p>
                                    </div>
                                </div>
                            )}

                            {paymentStatus === 'success' && (
                                <div className="p-16 flex flex-col items-center justify-center text-center space-y-8 animate-in zoom-in-50 duration-500">
                                    <div className="w-24 h-24 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border-4 border-emerald-100 shadow-xl shadow-emerald-50">
                                        <CheckCircle size={48} className="animate-bounce" />
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="text-3xl font-black text-slate-800 tracking-tighter">Payment Confirmed!</h3>
                                        <p className="text-slate-500 font-medium leading-relaxed">
                                            Transaction <span className="text-slate-900 font-bold">#RCP-982173</span> was successful. <br />
                                            The invoice has been updated.
                                        </p>
                                    </div>
                                    <Button variant="primary" className="w-full h-14 rounded-2xl py-0 font-bold shadow-xl shadow-indigo-100" onClick={() => setIsPaying(null)}>
                                        Return to Dashboard
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {showPresetsModal && (
                    <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-[110] backdrop-blur-md animate-in fade-in duration-300 px-4">
                        <div className="bg-white rounded-3xl w-full max-w-lg shadow-[0_20px_50px_rgba(0,0,0,0.2)] animate-in zoom-in-95 duration-300 flex flex-col p-6 max-h-[80vh] overflow-hidden border border-slate-200">
                            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                                <h3 className="text-lg font-bold text-slate-800">Manage Service Fee Rates</h3>
                                <button onClick={() => setShowPresetsModal(false)} className="p-1.5 rounded-lg hover:bg-slate-200 transition-colors text-slate-400 border border-transparent"><X size={20} /></button>
                            </div>

                            <div className="flex gap-2 mb-4">
                                <input type="text" placeholder="Service Name" value={newPreset.name} onChange={e => setNewPreset({ ...newPreset, name: e.target.value })} className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-indigo-500" />
                                <input type="number" placeholder="0.00" value={newPreset.amount} onChange={e => setNewPreset({ ...newPreset, amount: e.target.value })} className="w-24 px-3 py-2 rounded-lg border border-slate-200 text-sm text-right focus:outline-none focus:border-indigo-500" />
                                <button 
                                    onClick={async () => {
                                        if (!newPreset.name) return alert('Name Required');
                                        try {
                                            await api.post('/api/admin/service-items', newPreset);
                                            setNewPreset({ name: '', amount: '' });
                                            fetchServiceItems();
                                        } catch (e) { alert('Failed to create'); }
                                    }}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm px-4 py-2 rounded-lg transition-colors"
                                >Add</button>
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                                {predefinedServices.map((p) => (
                                    <div key={p.id} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100 hover:shadow-sm transition-all">
                                        <div>
                                            <p className="font-bold text-slate-800 text-sm">{p.name}</p>
                                            <p className="text-xs font-medium text-slate-500">$ {parseFloat(p.amount).toLocaleString('en-CA')}</p>
                                        </div>
                                        <button 
                                            onClick={async () => {
                                                if (!window.confirm('Delete this preset?')) return;
                                                try {
                                                    await api.delete(`/api/admin/service-items/${p.id}`);
                                                    fetchServiceItems();
                                                } catch (e) { alert('Error deleting'); }
                                            }}
                                            className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </MainLayout>
    );
};
