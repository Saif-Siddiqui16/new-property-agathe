import React, { useState, useEffect } from 'react';
import { MainLayout } from '../layouts/MainLayout';
import { Button } from '../components/Button';
import { Plus, Search, User, Eye, Trash2, Pencil, Calendar, AlertCircle, Building, Building2, UserPlus, Mail, Smartphone, Send, CheckCircle } from 'lucide-react';
import api from '../api/client';
import { hasPermission } from '../utils/permissions';
import { AccessControl } from '../components/AccessControl';

const initialOwners = [
    {
        id: 1,
        name: 'Grand Holdings Ltd',
        email: 'owner@example.com',
        phone: '+1 (555) 111-2222',
        password: '123456',
        properties: ['Grand Residency', 'Sunset Heights'],
        totalUnits: 36,
        status: 'Active'
    },
    {
        id: 2,
        name: 'Emerald Realty',
        email: 'emerald@example.com',
        phone: '+1 (555) 333-4444',
        password: '123456',
        properties: ['Emerald Square'],
        totalUnits: 12,
        status: 'Active'
    }
];

export const Owners = () => {
    const [__forceUpdate, __setForceUpdate] = useState(0);
    useEffect(() => {
        const handleUpdate = () => __setForceUpdate(p => p + 1);
        window.addEventListener('permissionsUpdated', handleUpdate);
        return () => window.removeEventListener('permissionsUpdated', handleUpdate);
    }, []);

    const [owners, setOwners] = useState([]);
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [invitingOwner, setInvitingOwner] = useState(null);
    const [inviteMethods, setInviteMethods] = useState({ email: true, sms: true });
    const [isSendingInvite, setIsSendingInvite] = useState(false);
    const [viewingOwner, setViewingOwner] = useState(null);
    const [editingOwner, setEditingOwner] = useState(null);

    const [availableProperties, setAvailableProperties] = useState([]);
    const [selectedProperties, setSelectedProperties] = useState([]);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    // Fetch properties from backend
    useEffect(() => {
        fetchOwnersData();
    }, []);

    const fetchOwnersData = async () => {
        try {
            const res = await api.get('/api/admin/owners');
            setOwners(res.data?.data || res.data || []);
        } catch (error) {
            console.error('Failed to fetch owners', error);
        }
    };

    const fetchAvailableProperties = async (ownerId = null) => {
        try {
            console.log('Fetching available properties with ownerId:', ownerId);
            const params = ownerId ? { ownerId } : {};
            console.log('API params:', params);
            const res = await api.get('/api/admin/properties/available', { params });
            console.log('Received properties:', res.data);
            const properties = res.data?.data || res.data || [];
            setAvailableProperties(properties);
            return properties;
        } catch (error) {
            console.error('Failed to fetch available properties', error);
            return [];
        }
    };

    /* 💾 PERSIST OWNERS - Optional/Removed in favor of backend source of truth */
    // useEffect(() => {
    //     localStorage.setItem('owners', JSON.stringify(owners));
    // }, [owners]);

    /* 🔍 SEARCH */
    const filteredOwners = owners.filter(
        (o) =>
            (o.name && o.name.toLowerCase().includes(search.toLowerCase())) ||
            (o.email && o.email.toLowerCase().includes(search.toLowerCase())) ||
            (o.phone && o.phone.toLowerCase().includes(search.toLowerCase()))
    );

    /* ➕ ADD/EDIT OWNER */
    const handleSaveOwner = async (e) => {
        e.preventDefault();
        const form = e.target;

        const payload = {
            firstName: form.firstName.value,
            lastName: form.lastName.value,
            name: `${form.firstName.value} ${form.lastName.value}`.trim(),
            email: form.email.value,
            phone: form.phone.value,
            companyName: form.companyName?.value || '',
            propertyIds: selectedProperties.map(p => p.id),
        };

        try {
            if (editingOwner) {
                await api.put(`/api/admin/owners/${editingOwner.id}`, payload);
            } else {
                await api.post('/api/admin/owners', payload);
                alert("Owner account created!");
            }
            fetchOwnersData();
            setShowModal(false);
            setEditingOwner(null);
            setSelectedProperties([]);
            form.reset();
        } catch (e) {
            console.error(e);
            alert(e.response?.data?.message || 'Error saving owner');
        }
    };

    const handleSendInvite = (owner) => {
        setInvitingOwner(owner);
        setShowInviteModal(true);
    };

    const processInvite = async () => {
        if (!inviteMethods.email && !inviteMethods.sms) {
            alert('Please select at least one delivery method');
            return;
        }

        setIsSendingInvite(true);
        try {
            const methods = [];
            if (inviteMethods.email) methods.push('email');
            if (inviteMethods.sms) methods.push('sms');

            // Using the same endpoint as tenants if it's generic, or check if we need a specific owner one
            // Based on admin.controller.js audits, we might need to add this endpoint or use a generic one.
            // For now, I'll assume /api/admin/owners/${invitingOwner.id}/send-invite exists or I will create it.
            const res = await api.post(`/api/admin/owners/${invitingOwner.id}/send-invite`, { methods });

            let msg = 'Invitations processed successfully.';
            if (res.data.data?.results) {
                const { email, sms } = res.data.data.results;
                if (email.attempted) msg += `\nEmail: ${email.success ? 'Sent' : 'Failed (' + (email.error || 'Unknown error') + ')'}`;
                if (sms.attempted) msg += `\nSMS: ${sms.success ? 'Sent' : 'Failed (' + (sms.error || 'Unknown error') + ')'}`;
            }

            alert(msg);
            setShowInviteModal(false);
            setInvitingOwner(null);
            await fetchOwnersData();
        } catch (e) {
            console.error(e);
            alert(e.response?.data?.message || 'Failed to send invite');
        } finally {
            setIsSendingInvite(false);
        }
    };

    const deleteOwner = async (id) => {
        if (!window.confirm('Are you sure? This will delete the login but preserve property data.')) return;
        try {
            await api.delete(`/api/admin/owners/${id}`);
            fetchOwnersData();
        } catch (e) {
            console.error(e);
            alert('Error deleting owner');
        }
    };

    const handleEditOwner = async (owner) => {
        const props = await fetchAvailableProperties(owner.id);
        setEditingOwner(owner);
        // Filter properties where this owner is one of the owners
        const currentProps = props.filter(p => p.ownerIds?.includes(owner.id));
        setSelectedProperties(currentProps);
        setShowModal(true);
    };

    return (
        <MainLayout title="Owners Management">
            <div className="flex flex-col gap-6">

                {/* TOP BAR */}
                <section className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-xl shadow-[0_5px_15px_rgba(0,0,0,0.06)] gap-4">
                    <div className="flex items-center gap-3 bg-slate-50 px-4 py-2.5 rounded-lg border border-slate-200 focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all w-full md:w-auto md:min-w-[320px]">
                        <Search size={18} className="text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by name, company, email..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="bg-transparent border-none outline-none text-slate-700 placeholder:text-slate-400 w-full text-sm font-medium"
                        />
                    </div>

                    {hasPermission('Owners', 'add') && (
                        <Button variant="primary" onClick={() => {
                            setEditingOwner(null);
                            setSelectedProperties([]);
                            fetchAvailableProperties();
                            setShowModal(true);
                        }}>
                            <Plus size={18} />
                            Add New Owner
                        </Button>
                    )}
                </section>

                {/* TABLE */}
                <section className="bg-white rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.08)] overflow-hidden">
                    {/* Desktop Table Header - Hidden on Mobile */}
                    <div className="hidden md:grid grid-cols-[1.2fr_1.2fr_1.2fr_1.2fr_0.6fr_0.8fr] bg-slate-50 border-b border-slate-200 px-6 py-4">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Contact Name</span>
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Company</span>
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Email (Login)</span>
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Assigned Portfolio</span>
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Units</span>
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Actions</span>
                    </div>

                    <div className="divide-y divide-slate-100">
                        {filteredOwners.map((owner) => (
                            <div key={owner.id}>
                                {/* Desktop Table Row - Hidden on Mobile */}
                                <div className="hidden md:grid grid-cols-[1.2fr_1.2fr_1.2fr_1.2fr_0.6fr_0.8fr] px-6 py-4 items-center hover:bg-slate-50/80 transition-all duration-200">
                                    <span className="flex items-center gap-3 font-medium text-slate-700">
                                        <div className="min-w-[32px] w-8 h-8 rounded-full flex items-center justify-center bg-slate-100 text-slate-500">
                                            <User size={16} />
                                        </div>
                                        <span className="truncate flex flex-col">
                                            {owner.name}
                                        </span>
                                    </span>

                                    <span className="text-sm text-indigo-600 truncate font-bold">{owner.companyName || '-'}</span>

                                    <span className="text-sm text-slate-600 truncate">{owner.email}</span>

                                    <span className="text-sm text-slate-600 truncate italic">
                                        {owner.properties.length > 0 ? owner.properties.join(', ') : 'No properties assigned'}
                                    </span>

                                    <span className="text-sm font-bold text-slate-700">{owner.totalUnits}</span>

                                    <span className="flex justify-center gap-1">
                                        <button
                                            onClick={() => setViewingOwner(owner)}
                                            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                                        >
                                            <Eye size={16} />
                                        </button>
                                        <AccessControl module="Owners" action="edit">
                                            <button
                                                onClick={() => handleSendInvite(owner)}
                                                className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-200 ${owner.isInviteSent ? 'text-green-600 hover:bg-green-50' : 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'}`}
                                                title={owner.isInviteSent ? "Resend Invite" : "Send Invite"}
                                            >
                                                {owner.isInviteSent ? <CheckCircle size={16} /> : <Send size={16} />}
                                            </button>
                                        </AccessControl>
                                        <AccessControl module="Owners" action="edit">
                                            <button
                                                onClick={() => handleEditOwner(owner)}
                                                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                                            >
                                                <Pencil size={16} />
                                            </button>
                                        </AccessControl>
                                        <AccessControl module="Owners" action="delete">
                                            <button
                                                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all"
                                                onClick={() => deleteOwner(owner.id)}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </AccessControl>
                                    </span>
                                </div>

                                {/* Mobile Card View - Hidden on Desktop */}
                                <div className="md:hidden p-4 hover:bg-slate-50/80 transition-all duration-200">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-slate-100 text-slate-500">
                                                <User size={18} />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-slate-800">{owner.name}</p>
                                                {owner.companyName && (
                                                    <p className="text-xs text-indigo-600 font-bold">{owner.companyName}</p>
                                                )}
                                            </div>
                                        </div>
                                        <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded">{owner.totalUnits} Units</span>
                                    </div>

                                    <div className="space-y-2 mb-3">
                                        <div className="flex items-center gap-2 text-xs">
                                            <Mail size={12} className="text-slate-400" />
                                            <span className="text-slate-600">{owner.email}</span>
                                        </div>
                                        <div className="flex items-start gap-2 text-xs">
                                            <Building2 size={12} className="text-slate-400 mt-0.5" />
                                            <span className="text-slate-600 italic">
                                                {owner.properties.length > 0 ? owner.properties.join(', ') : 'No properties assigned'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex gap-2 pt-3 border-t border-slate-100">
                                        <button
                                            onClick={() => setViewingOwner(owner)}
                                            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-all text-xs font-semibold"
                                        >
                                            <Eye size={14} />
                                            View
                                        </button>
                                        <AccessControl module="Owners" action="edit">
                                            <button
                                                onClick={() => handleSendInvite(owner)}
                                                className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg transition-all text-xs font-semibold ${owner.isInviteSent ? 'text-green-600 bg-green-50 hover:bg-green-100' : 'text-amber-600 bg-amber-50 hover:bg-amber-100'}`}
                                            >
                                                {owner.isInviteSent ? (
                                                    <>
                                                        <CheckCircle size={14} />
                                                        Resend
                                                    </>
                                                ) : (
                                                    <>
                                                        <Send size={14} />
                                                        Invite
                                                    </>
                                                )}
                                            </button>
                                        </AccessControl>
                                        <AccessControl module="Owners" action="edit">
                                            <button
                                                onClick={() => handleEditOwner(owner)}
                                                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-blue-600 bg-blue-50 hover:bg-blue-100 transition-all text-xs font-semibold"
                                            >
                                                <Pencil size={14} />
                                                Edit
                                            </button>
                                        </AccessControl>
                                        <AccessControl module="Owners" action="delete">
                                            <button
                                                onClick={() => deleteOwner(owner.id)}
                                                className="flex items-center justify-center px-3 py-2 rounded-lg text-red-600 bg-red-50 hover:bg-red-100 transition-all"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </AccessControl>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* ADD/EDIT OWNER MODAL */}
                {showModal && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
                        <form
                            className="bg-white rounded-2xl p-8 w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto"
                            onSubmit={handleSaveOwner}
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-2xl font-bold text-slate-800">{editingOwner ? 'Edit Portfolio Access' : 'Create Owner Access'}</h3>
                                <button type="button" onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                            </div>

                            <div className="space-y-6">
                                {/* Company Information */}
                                <div>
                                    <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">Entity / Company</h4>
                                    <div className="space-y-4">
                                        <div className="flex flex-col gap-2">
                                            <label className="text-sm font-medium text-slate-600">Company Name</label>
                                            <input
                                                name="companyName"
                                                defaultValue={editingOwner?.companyName || ''}
                                                placeholder="e.g. Grand Holdings Ltd"
                                                required
                                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium"
                                            />
                                            <p className="text-[10px] text-slate-400 italic">Adding multiple users to the same company allows them to share property visibility.</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Contact Information */}
                                <div>
                                    <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">Primary Contact (Login User)</h4>
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="flex flex-col gap-2">
                                                <label className="text-sm font-medium text-slate-600">First Name</label>
                                                <input
                                                    name="firstName"
                                                    defaultValue={editingOwner?.name?.split(' ')[0] || ''}
                                                    placeholder="First Name"
                                                    required
                                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium"
                                                />
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                <label className="text-sm font-medium text-slate-600">Last Name</label>
                                                <input
                                                    name="lastName"
                                                    defaultValue={editingOwner?.name?.split(' ').slice(1).join(' ') || ''}
                                                    placeholder="Last Name"
                                                    required
                                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium"
                                                />
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-2">
                                            <label className="text-sm font-medium text-slate-600">Email (Username)</label>
                                            <input
                                                name="email"
                                                type="email"
                                                defaultValue={editingOwner?.email || ''}
                                                placeholder="contact@company.com"
                                                required
                                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium"
                                            />
                                        </div>

                                        <div className="flex flex-col gap-2">
                                            <label className="text-sm font-medium text-slate-600">Phone</label>
                                            <div className="relative">
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium select-none pointer-events-none">+1</span>
                                                <input
                                                    name="phone"
                                                    type="tel"
                                                    defaultValue={editingOwner?.phone?.replace(/^\+1|^\+/, '').trim() || ''}
                                                    placeholder="(555) 000-0000"
                                                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium"
                                                />
                                            </div>
                                        </div>

                                    </div>
                                </div>

                                {/* Portfolio Information */}
                                <div>
                                    <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">Building Assignments</h4>
                                    <div className="space-y-4">
                                        {/* Selected Properties Tags */}
                                        <div className="flex flex-wrap gap-2">
                                            {selectedProperties.map((prop) => (
                                                <span key={prop.id} className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 border border-indigo-100 rounded-lg text-sm font-medium text-indigo-700">
                                                    {prop.name}
                                                    <button type="button" onClick={() => setSelectedProperties(prev => prev.filter(p => p.id !== prop.id))} className="hover:text-indigo-900">✕</button>
                                                </span>
                                            ))}
                                        </div>

                                        <div className="relative">
                                            <button
                                                type="button"
                                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-left text-slate-700 hover:border-indigo-400 transition-all font-medium flex justify-between items-center"
                                            >
                                                <span className={selectedProperties.length === 0 ? "text-slate-400" : ""}>
                                                    {selectedProperties.length > 0 ? "Assign more buildings..." : "Select Buildings to Assign"}
                                                </span>
                                                <Plus size={16} />
                                            </button>

                                            {isDropdownOpen && (
                                                <div className="absolute z-10 w-full mt-2 bg-white border border-slate-100 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                                                    {availableProperties
                                                        .filter(p => !selectedProperties.some(sp => sp.id === p.id))
                                                        .map(p => (
                                                            <button
                                                                key={p.id}
                                                                type="button"
                                                                onClick={() => {
                                                                    setSelectedProperties([...selectedProperties, p]);
                                                                    setIsDropdownOpen(false);
                                                                }}
                                                                className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 text-slate-700 font-medium text-sm flex items-center justify-between"
                                                            >
                                                                {p.name}
                                                                <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">Add</span>
                                                            </button>
                                                        ))
                                                    }
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-slate-100">
                                <Button type="button" variant="secondary" onClick={() => { setShowModal(false); setEditingOwner(null); }}>Cancel</Button>
                                <Button type="submit" variant="primary">{editingOwner ? 'Sync Portfolio' : 'Create Access'}</Button>
                            </div>
                        </form>
                    </div>
                )}

                {/* INVITE MODAL */}
                {showInviteModal && invitingOwner && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[60] animate-in fade-in duration-300">
                        <div className="bg-white rounded-[32px] w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-400 overflow-hidden flex flex-col">
                            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white">
                                <div>
                                    <h3 className="text-xl font-black text-slate-800 tracking-tight">Send Invite</h3>
                                    <p className="text-slate-500 font-medium text-xs mt-1">Select delivery methods for {invitingOwner.name}</p>
                                </div>
                                <button
                                    onClick={() => { setShowInviteModal(false); setInvitingOwner(null); }}
                                    className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-all"
                                >
                                    <Plus className="rotate-45" size={20} />
                                </button>
                            </div>

                            <div className="p-8 space-y-4">
                                <div className="space-y-3">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">DELIVERY METHODS</label>

                                    <button
                                        onClick={() => setInviteMethods(prev => ({ ...prev, email: !prev.email }))}
                                        className={`w-full p-4 rounded-2xl border-2 transition-all flex items-center gap-4 ${inviteMethods.email ? 'border-indigo-600 bg-indigo-50/50' : 'border-slate-100 bg-white hover:border-slate-200'}`}
                                    >
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${inviteMethods.email ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-400'}`}>
                                            <Mail size={20} />
                                        </div>
                                        <div className="text-left">
                                            <p className={`font-bold text-sm ${inviteMethods.email ? 'text-indigo-900' : 'text-slate-700'}`}>Email Invitation</p>
                                            <p className="text-[10px] text-slate-500 font-medium">Send credentials to {invitingOwner.email || 'Email missing'}</p>
                                        </div>
                                        {inviteMethods.email && <CheckCircle size={20} className="ml-auto text-indigo-600" />}
                                    </button>

                                    <button
                                        onClick={() => setInviteMethods(prev => ({ ...prev, sms: !prev.sms }))}
                                        className={`w-full p-4 rounded-2xl border-2 transition-all flex items-center gap-4 ${inviteMethods.sms ? 'border-indigo-600 bg-indigo-50/50' : 'border-slate-100 bg-white hover:border-slate-200'}`}
                                    >
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${inviteMethods.sms ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-400'}`}>
                                            <Smartphone size={20} />
                                        </div>
                                        <div className="text-left">
                                            <p className={`font-bold text-sm ${inviteMethods.sms ? 'text-indigo-900' : 'text-slate-700'}`}>SMS Invitation</p>
                                            <p className="text-[10px] text-slate-500 font-medium">Send credentials to {invitingOwner.phone || 'Phone missing'}</p>
                                        </div>
                                        {inviteMethods.sms && <CheckCircle size={20} className="ml-auto text-indigo-600" />}
                                    </button>
                                </div>
                            </div>

                            <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex gap-3">
                                <Button
                                    variant="secondary"
                                    className="flex-1"
                                    onClick={() => { setShowInviteModal(false); setInvitingOwner(null); }}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    variant="primary"
                                    className="flex-1 shadow-lg shadow-indigo-100"
                                    onClick={processInvite}
                                    isLoading={isSendingInvite}
                                    disabled={!inviteMethods.email && !inviteMethods.sms}
                                >
                                    Confirm & Send
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* OWNER DETAIL MODAL */}
                {
                    viewingOwner && (
                        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
                            <div className="bg-white rounded-2xl p-8 w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-300">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100 font-bold text-lg">
                                            {viewingOwner.name.split(' ').map(n => n[0]).join('')}
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-bold text-slate-800">{viewingOwner.name}</h3>
                                            <p className="text-sm text-slate-500 font-medium">Owner Details</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setViewingOwner(null)}
                                        className="p-2 hover:bg-slate-100 rounded-lg transition-all text-slate-400"
                                    >
                                        ✕
                                    </button>
                                </div>

                                <div className="space-y-6">
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-1">
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Email</p>
                                            <p className="text-slate-700 font-medium">{viewingOwner.email}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Phone</p>
                                            <p className="text-slate-700 font-medium">{viewingOwner.phone || 'N/A'}</p>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Properties & Units</p>
                                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                                            <div className="flex justify-between items-center mb-3">
                                                <span className="text-sm font-medium text-slate-600">Total Units Managed</span>
                                                <span className="text-sm font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg">{viewingOwner.totalUnits} Units</span>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {viewingOwner.properties.map((prop, i) => (
                                                    <span key={i} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 shadow-sm">
                                                        <Building2 size={12} className="text-slate-400" />
                                                        {prop}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-8 flex justify-end">
                                    <Button variant="secondary" onClick={() => setViewingOwner(null)}>
                                        Close
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )
                }

            </div>
        </MainLayout>
    );
};
