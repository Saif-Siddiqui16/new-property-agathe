import React, { useState, useEffect } from 'react';
import { MainLayout } from '../layouts/MainLayout';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { Button } from '../components/Button';
import { BedDouble, Calendar, DollarSign, Home, User, Shield, ChevronDown, CheckCircle, Bed } from 'lucide-react';

export const LeaseFormBedroom = () => {
    const navigate = useNavigate();
    const [buildings, setBuildings] = useState([]);
    const [units, setUnits] = useState([]);
    const [bedrooms, setBedrooms] = useState([]);
    const [tenants, setTenants] = useState([]);
    const [selectedBuilding, setSelectedBuilding] = useState('');
    const [lockedFields, setLockedFields] = useState(false);
    const [form, setForm] = useState({
        unitId: '',
        bedroomId: '',
        tenantId: '',
        coTenantIds: [],
        startDate: '',
        endDate: '',
        monthlyRent: '',
        securityDeposit: '',
        sendCredentials: false
    });

    useEffect(() => {
        fetchBuildings();
        fetchTenants();
    }, []);

    const fetchBuildings = async () => {
        try {
            const res = await api.get('/api/admin/properties');
            setBuildings(res.data?.data || res.data || []);
        } catch (error) {
            console.error('Failed to fetch buildings', error);
        }
    };

    const fetchTenants = async () => {
        try {
            const res = await api.get('/api/admin/tenants?limit=1000');
            // Show all tenants including residents for room assignment
            setTenants(res.data?.data || res.data || []);
        } catch (error) {
            console.error('Failed to fetch tenants', error);
        }
    };

    const handleBuildingChange = async (e) => {
        const buildingId = e.target.value;
        setSelectedBuilding(buildingId);
        setUnits([]);
        setBedrooms([]);
        setForm({
            ...form,
            unitId: '',
            bedroomId: '',
            tenantId: '',
            startDate: '',
            endDate: '',
            monthlyRent: '',
            securityDeposit: ''
        });
        setLockedFields(false);

        if (buildingId) {
            try {
                // Fetch units for this building
                const res = await api.get(`/api/admin/units?propertyId=${buildingId}&limit=1000&showInactive=true`);
                const allUnits = Array.isArray(res.data.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []);

                // Improved filtering for Bedroom-wise Lease:
                const filteredUnits = allUnits.filter(u => {
                    // 1. If it has an active Company Lease, it IS available for bedroom assignments
                    // even if status is 'Fully Booked' or 'Occupied'
                    if (u.hasCompanyLease) return true;

                    // 2. Hide if explicitly Fully Booked (all bedrooms occupied by individual tenants)
                    if (u.status === 'Fully Booked') return false;

                    // 3. Hide if Occupied in FULL_UNIT mode
                    if ((u.rentalMode === 'FULL_UNIT' || !u.rentalMode) && u.status === 'Occupied') return false;

                    return true;
                });
                setUnits(filteredUnits);
            } catch (error) {
                console.error('Failed to fetch units', error);
            }
        }
    };

    const handleUnitChange = async (e) => {
        const unitId = e.target.value;
        const selectedUnit = units.find(u => u.id.toString() === unitId);

        let newForm = { ...form, unitId, bedroomId: '', tenantId: '' };
        let isLocked = false;

        const currentTenant = tenants.find(t => t.id.toString() === form.tenantId);
        const isResident = currentTenant?.type === 'RESIDENT' || currentTenant?.type === 'Resident';

        if (selectedUnit && selectedUnit.hasCompanyLease && selectedUnit.companyLeaseDetails &&
            selectedUnit.companyLeaseDetails.leaseType === 'FULL_UNIT' && isResident) {
            // Only lock if company rented the ENTIRE unit AND adding a resident
            newForm.startDate = selectedUnit.companyLeaseDetails.startDate ? selectedUnit.companyLeaseDetails.startDate.substring(0, 10) : '';
            newForm.endDate = selectedUnit.companyLeaseDetails.endDate ? selectedUnit.companyLeaseDetails.endDate.substring(0, 10) : '';
            newForm.monthlyRent = selectedUnit.companyLeaseDetails.monthlyRent || '';
            newForm.securityDeposit = selectedUnit.companyLeaseDetails.securityDeposit || '';
            isLocked = true;
        } else {
            // Reset if switching away or NOT adding a resident
            newForm.startDate = '';
            newForm.endDate = '';
            newForm.monthlyRent = '';
            newForm.securityDeposit = '';
        }

        setForm(newForm);
        setLockedFields(isLocked);
        setBedrooms([]);

        if (unitId) {
            try {
                // Fetch vacant bedrooms for this specific unit
                const res = await api.get(`/api/admin/units/bedrooms/vacant?unitId=${unitId}`);
                setBedrooms(res.data);
            } catch (error) {
                error;
                console.error('Failed to fetch bedrooms', error);
            }
        }
    };

    // New useEffect to handle locking when tenant changes
    useEffect(() => {
        if (!form.unitId) return;
        const selectedUnit = units.find(u => u.id.toString() === form.unitId);
        const currentTenant = tenants.find(t => t.id.toString() === form.tenantId);
        const isResident = currentTenant?.type === 'RESIDENT' || currentTenant?.type === 'Resident';

        if (selectedUnit && selectedUnit.hasCompanyLease && selectedUnit.companyLeaseDetails &&
            selectedUnit.companyLeaseDetails.leaseType === 'FULL_UNIT' && isResident) {
            setForm(prev => ({
                ...prev,
                startDate: selectedUnit.companyLeaseDetails.startDate ? selectedUnit.companyLeaseDetails.startDate.substring(0, 10) : '',
                endDate: selectedUnit.companyLeaseDetails.endDate ? selectedUnit.companyLeaseDetails.endDate.substring(0, 10) : '',
                monthlyRent: selectedUnit.companyLeaseDetails.monthlyRent || '',
                securityDeposit: selectedUnit.companyLeaseDetails.securityDeposit || ''
            }));
            setLockedFields(true);
        } else {
            setLockedFields(false);
        }
    }, [form.tenantId, form.unitId, units, tenants]);
    const handleSave = async () => {
        if (!form.unitId || !form.bedroomId || !form.tenantId || !form.startDate || !form.endDate) {
            alert('Please fill all required fields (Unit, Bedroom, Tenant, Dates)');
            return;
        }

        try {
            const payload = {
                ...form,
                unitId: parseInt(form.unitId),
                bedroomId: parseInt(form.bedroomId),
                tenantId: parseInt(form.tenantId),
                coTenantIds: form.coTenantIds.map(id => parseInt(id)),
                monthlyRent: parseFloat(form.monthlyRent) || 0,
                securityDeposit: parseFloat(form.securityDeposit) || 0,
                isFullUnitLease: false,
                sendCredentials: form.sendCredentials // Explicitly send flag
            };
            const res = await api.post('/api/admin/leases', payload);

            let msg = 'Bedroom Lease created successfully.';
            if (res.data.notifications) {
                const { status, sms, email, message } = res.data.notifications;
                if (status === 'Sent') {
                    msg += `\n\nCredentials sent via: ${sms ? 'SMS ' : ''}${email ? 'Email' : ''}`;
                } else if (status === 'Skipped') {
                    msg += `\n\nOnboarding: ${message}`;
                } else if (status === 'Failed') {
                    msg += '\n\nFailed to send credentials (check SMS/Email settings)';
                }
            }

            alert(msg);
            navigate('/leases');
        } catch (error) {
            console.error('Failed to create lease', error);
            alert(error.response?.data?.message || 'Error creating lease');
        }
    };

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    return (
        <MainLayout title="Bedroom Lease">
            <div className="max-w-3xl mx-auto py-6">
                <div className="bg-white p-8 rounded-2xl shadow-xl animate-in slide-in-from-bottom-4 duration-500 fade-in border border-slate-100">
                    <div className="flex items-center gap-3 mb-8 pb-4 border-b border-slate-100">
                        <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                            <BedDouble size={24} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-slate-800 m-0">New Bedroom Lease</h2>
                            <p className="text-slate-500 text-sm mt-1">Create a lease for an individual bedroom</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        {/* Building Selection */}
                        <div className="md:col-span-2">
                            <label className="block text-sm font-semibold text-slate-700 mb-2 uppercase tracking-wide">BUILDING NAME</label>
                            <div className="relative">
                                <Home size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                <select
                                    value={selectedBuilding}
                                    onChange={handleBuildingChange}
                                    className="w-full pl-12 pr-10 py-3 rounded-xl border border-slate-200 bg-slate-50/50 outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium text-slate-800 appearance-none"
                                >
                                    <option value="">Choose a Building</option>
                                    {buildings.map(b => (
                                        <option key={b.id} value={b.id}>{b.name}</option>
                                    ))}
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                    <ChevronDown size={18} />
                                </div>
                            </div>
                        </div>

                        {/* Unit Selection */}
                        <div className="md:col-span-1">
                            <label className="block text-sm font-semibold text-slate-700 mb-2 uppercase tracking-wide">Unit</label>
                            <div className="relative">
                                <Home size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                <select
                                    name="unitId"
                                    value={form.unitId}
                                    onChange={handleUnitChange}
                                    disabled={!selectedBuilding}
                                    className="w-full pl-12 pr-10 py-3 rounded-xl border border-slate-200 bg-slate-50/50 outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium text-slate-800 appearance-none disabled:opacity-50"
                                >
                                    <option value="">Select Unit</option>
                                    {units.map(u => (
                                        <option key={u.id} value={u.id}>
                                            {u.unitNumber || u.unit_identifier || u.name} ({u.status})
                                        </option>
                                    ))}
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                    <ChevronDown size={18} />
                                </div>
                            </div>
                        </div>

                        {/* Bedroom Selection */}
                        <div className="md:col-span-1">
                            <label className="block text-sm font-semibold text-slate-700 mb-2 uppercase tracking-wide">Bedroom</label>
                            <div className="relative">
                                <Bed size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                <select
                                    name="bedroomId"
                                    value={form.bedroomId}
                                    onChange={handleChange}
                                    disabled={!form.unitId}
                                    className="w-full pl-12 pr-10 py-3 rounded-xl border border-slate-200 bg-slate-50/50 outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium text-slate-800 appearance-none disabled:opacity-50"
                                >
                                    <option value="">Select Bedroom</option>
                                    {bedrooms.map(b => (
                                        <option key={b.id} value={b.id}>
                                            {b.bedroomNumber || b.displayName}
                                        </option>
                                    ))}
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                    <ChevronDown size={18} />
                                </div>
                            </div>
                        </div>

                        {/* Tenant Selection */}
                        <div className="md:col-span-2">
                            <label className="block text-sm font-semibold text-slate-700 mb-2 uppercase tracking-wide">Select Tenant</label>
                            <div className="relative">
                                <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                <select
                                    name="tenantId"
                                    value={form.tenantId}
                                    onChange={handleChange}
                                    disabled={!form.bedroomId}
                                    className="w-full pl-12 pr-10 py-3 rounded-xl border border-slate-200 bg-slate-50/50 outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium text-slate-800 appearance-none disabled:opacity-50"
                                >
                                    <option value="">Select Tenant</option>
                                    {tenants.map(t => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                    <ChevronDown size={18} />
                                </div>
                            </div>
                        </div>

                        {/* Co-Tenants Selection (Multi-select) */}
                        <div className="md:col-span-2">
                            <label className="block text-sm font-semibold text-slate-700 mb-2 uppercase tracking-wide">Co-Applicants / Occupants (Optional)</label>
                            <div className="relative">
                                <div className="flex flex-wrap gap-2 mb-2 p-1 min-h-[30px]">
                                    {form.coTenantIds.map(id => {
                                        const t = tenants.find(tenant => tenant.id.toString() === id.toString());
                                        return t ? (
                                            <span key={id} className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 border border-indigo-100 rounded-lg text-sm font-medium text-indigo-700">
                                                {t.name} {t.type === 'RESIDENT' && t.parentName ? `(Res. of ${t.parentName})` : ''}
                                                <button
                                                    type="button"
                                                    onClick={() => setForm(prev => ({
                                                        ...prev,
                                                        coTenantIds: prev.coTenantIds.filter(cid => cid !== id)
                                                    }))}
                                                    className="hover:text-indigo-900"
                                                >
                                                    &times;
                                                </button>
                                            </span>
                                        ) : null;
                                    })}
                                </div>
                                <User size={18} className="absolute left-4 top-[50%] -translate-y-1/2 text-slate-400 mt-2" />
                                <select
                                    value=""
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (val && !form.coTenantIds.includes(val)) {
                                            setForm(prev => ({
                                                ...prev,
                                                coTenantIds: [...prev.coTenantIds, val]
                                            }));
                                        }
                                    }}
                                    disabled={!form.unitId || !form.tenantId}
                                    className="w-full pl-12 pr-10 py-3 rounded-xl border border-slate-200 bg-slate-50/50 outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium text-slate-800 appearance-none disabled:opacity-50"
                                >
                                    <option value="">Add Co-Tenant...</option>
                                    {tenants
                                        .filter(t => t.id.toString() !== form.tenantId && !form.coTenantIds.includes(t.id.toString()))
                                        .map(t => (
                                            <option key={t.id} value={t.id}>{t.name}</option>
                                        ))}
                                </select>
                                <div className="absolute right-4 top-[50%] -translate-y-1/2 pointer-events-none text-slate-400 mt-2">
                                    <ChevronDown size={18} />
                                </div>
                            </div>
                            <p className="text-xs text-slate-500 mt-1">Select additional tenants for this bedroom lease.</p>
                        </div>

                        {/* Financials */}
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2 uppercase tracking-wide">Monthly Rent ($)</label>
                            <div className="relative">
                                <DollarSign size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    name="monthlyRent"
                                    placeholder="0.00"
                                    type="number"
                                    value={form.monthlyRent}
                                    onChange={handleChange}
                                    disabled={lockedFields}
                                    className={`w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium text-slate-800 ${lockedFields ? 'bg-slate-100 text-slate-500' : 'bg-slate-50/50'}`}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2 uppercase tracking-wide">Security Deposit ($)</label>
                            <div className="relative">
                                <Shield size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    name="securityDeposit"
                                    placeholder="0.00"
                                    type="number"
                                    value={form.securityDeposit}
                                    onChange={handleChange}
                                    disabled={lockedFields}
                                    className={`w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium text-slate-800 ${lockedFields ? 'bg-slate-100 text-slate-500' : 'bg-slate-50/50'}`}
                                />
                            </div>
                        </div>

                        {/* Dates */}
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2 uppercase tracking-wide">Start Date</label>
                            <div className="relative">
                                <Calendar size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="date"
                                    name="startDate"
                                    value={form.startDate}
                                    onChange={handleChange}
                                    disabled={lockedFields}
                                    className={`w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium text-slate-800 placeholder-slate-400 ${lockedFields ? 'bg-slate-100 text-slate-500' : 'bg-slate-50/50'}`}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2 uppercase tracking-wide">End Date</label>
                            <div className="relative">
                                <Calendar size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="date"
                                    name="endDate"
                                    value={form.endDate}
                                    onChange={handleChange}
                                    disabled={lockedFields}
                                    className={`w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium text-slate-800 placeholder-slate-400 ${lockedFields ? 'bg-slate-100 text-slate-500' : 'bg-slate-50/50'}`}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Send Credentials Toggle */}
                    <div className="flex items-center mb-8 p-4 bg-blue-50 rounded-xl border border-blue-100">
                        <input
                            type="checkbox"
                            id="sendCredentials"
                            className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
                            checked={form.sendCredentials}
                            onChange={(e) => setForm({ ...form, sendCredentials: e.target.checked })}
                        />
                        <label htmlFor="sendCredentials" className="ml-3 block text-sm font-medium text-blue-900">
                            Send Welcome Credentials
                            <span className="block text-xs text-blue-600 font-normal mt-0.5">
                                Automatically send login details to the tenant via Email and SMS
                            </span>
                        </label>
                    </div>

                    <div className="flex justify-end gap-4 pt-4 border-t border-slate-100">
                        <Button variant="secondary" onClick={() => navigate('/leases')}>
                            Cancel
                        </Button>
                        <Button variant="primary" onClick={handleSave} className="min-w-[140px] shadow-lg shadow-indigo-200">
                            <CheckCircle size={18} />
                            Save Lease
                        </Button>
                    </div>
                </div>
            </div>
        </MainLayout>
    );
};
