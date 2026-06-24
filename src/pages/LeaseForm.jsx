import React, { useState, useEffect } from 'react';
import { MainLayout } from '../layouts/MainLayout';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { Button } from '../components/Button';
import { Home, User, Calendar, DollarSign, Shield, ChevronDown, Bed } from 'lucide-react';

export const LeaseForm = () => {
  const navigate = useNavigate();
  const [buildings, setBuildings] = useState([]);
  const [units, setUnits] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [selectedBuilding, setSelectedBuilding] = useState('');
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [bedrooms, setBedrooms] = useState([]);
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
      // Show all tenants including residents
      setTenants(res.data?.data || res.data || []);
    } catch (error) {
      console.error('Failed to fetch tenants', error);
    }
  };

  const handleBuildingChange = async (e) => {
    const buildingId = e.target.value;
    setSelectedBuilding(buildingId);
    setUnits([]);
    setForm({ ...form, unitId: '', tenantId: '' });

    if (buildingId) {
      try {
        // Fetch all units for this building, including New Construction (INACTIVE) units so they can be reserved
        const unitsRes = await api.get(`/api/admin/units?propertyId=${buildingId}&limit=1000&showInactive=true`);
        const allUnits = Array.isArray(unitsRes.data.data) ? unitsRes.data.data : (Array.isArray(unitsRes.data) ? unitsRes.data : []);

        // Simplified filtering for Full Unit Lease:
        const availableUnits = allUnits.filter(u => {
          // Full Unit requires the unit to be physically vacant
          if (u.status === 'Occupied' || u.status === 'Fully Booked') return false;

          return true;
        });

        setUnits(availableUnits);
      } catch (error) {
        console.error('Failed to fetch units', error);
      }
    }
  };

  const handleUnitChange = async (e) => {
    const unitId = e.target.value;
    setForm({ ...form, unitId, tenantId: '' });
    setSelectedUnit(null);

    if (unitId) {
      const unit = units.find(u => u.id === parseInt(unitId));
      setSelectedUnit(unit);
      setBedrooms([]);

      try {
        // Fetch vacant bedrooms for this specific unit
        const bedroomRes = await api.get(`/api/admin/units/bedrooms/vacant?unitId=${unitId}`);
        setBedrooms(bedroomRes.data);

        // Check if there's a DRAFT lease with tenant for this unit
        const leaseRes = await api.get(`/api/admin/leases/active/${unitId}`);
        if (leaseRes.data && leaseRes.data.tenantId) {
          setForm(prev => ({
            ...prev,
            tenantId: leaseRes.data.tenantId.toString()
          }));
        }
      } catch (error) {
        console.error('Failed to fetch data for unit', error);
      }
    }
  };

  const handleSave = async () => {
    if (!form.unitId || !form.tenantId || !form.startDate || !form.endDate) {
      alert('Please fill all required fields (Unit, Tenant, Start Date, End Date)');
      return;
    }

    try {
      const payload = {
        unitId: parseInt(form.unitId),
        bedroomId: form.bedroomId ? parseInt(form.bedroomId) : null,
        tenantId: parseInt(form.tenantId),
        coTenantIds: form.coTenantIds.map(id => parseInt(id)),
        startDate: form.startDate,
        endDate: form.endDate,
        monthlyRent: parseFloat(form.monthlyRent) || 0,
        securityDeposit: parseFloat(form.securityDeposit) || 0,
        sendCredentials: form.sendCredentials === true
      };

      const res = await api.post('/api/admin/leases', payload);

      alert('Lease created successfully.');
      navigate('/leases');
    } catch (error) {
      console.error('Failed to create lease', error);
      alert(error.response?.data?.message || 'Error creating lease');
    }
  };

  return (
    <MainLayout title="Create New Lease">
      <div className="max-w-[760px] mx-auto bg-white p-8 rounded-2xl shadow-lg border border-slate-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center gap-3 mb-8 pb-4 border-b border-slate-100">
          <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
            <Home size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800 m-0">New Lease</h2>
            <p className="text-slate-500 text-sm mt-1">Create a full unit lease</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
          <div>
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
                    {u.unitNumber || u.name}
                  </option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <ChevronDown size={18} />
              </div>
            </div>
          </div>

          {/* Bedroom Selection (Optional for Full Lease) */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2 uppercase tracking-wide">Bedroom (Optional)</label>
            <div className="relative">
              <Bed size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <select
                name="bedroomId"
                value={form.bedroomId}
                onChange={(e) => setForm({ ...form, bedroomId: e.target.value })}
                disabled={!form.unitId}
                className="w-full pl-12 pr-10 py-3 rounded-xl border border-slate-200 bg-slate-50/50 outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium text-slate-800 appearance-none disabled:opacity-50"
              >
                <option value="">Full Unit (No specific room)</option>
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
            <label className="block text-sm font-semibold text-slate-700 mb-2 uppercase tracking-wide">Select Primary Tenant</label>
            <div className="relative">
              <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <select
                name="tenantId"
                value={form.tenantId}
                onChange={(e) => setForm({ ...form, tenantId: e.target.value })}
                disabled={!form.unitId}
                className="w-full pl-12 pr-10 py-3 rounded-xl border border-slate-200 bg-slate-50/50 outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium text-slate-800 appearance-none disabled:opacity-50"
              >
                <option value="">Select Primary Tenant</option>
                {tenants.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <ChevronDown size={18} />
              </div>
            </div>
            {form.tenantId && tenants.find(t => t.id.toString() === form.tenantId.toString())?.type === 'RESIDENT' && (
              <p className="text-xs font-semibold text-amber-600 mt-2 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-100 flex items-center gap-2 w-fit">
                <Shield size={14} />
                Resident of: {tenants.find(t => t.id.toString() === form.tenantId.toString())?.parentName || 'Unknown Parent'}
              </p>
            )}
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
            <p className="text-xs text-slate-500 mt-1">Select additional tenants for this lease.</p>
          </div>

          {/* Dates */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2 uppercase tracking-wide">Start Date</label>
            <div className="relative">
              <Calendar size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium text-slate-800"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2 uppercase tracking-wide">End Date</label>
            <div className="relative">
              <Calendar size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium text-slate-800"
              />
            </div>
          </div>

          {/* Financials */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2 uppercase tracking-wide">Monthly Rent ($)</label>
            <div className="relative">
              <DollarSign size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                placeholder="0.00"
                type="number"
                value={form.monthlyRent}
                onChange={(e) => setForm({ ...form, monthlyRent: e.target.value })}
                className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium text-slate-800"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2 uppercase tracking-wide">Security Deposit ($)</label>
            <div className="relative">
              <Shield size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                placeholder="0.00"
                type="number"
                value={form.securityDeposit}
                onChange={(e) => setForm({ ...form, securityDeposit: e.target.value })}
                className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium text-slate-800"
              />
            </div>
          </div>
        </div>

        {/* Send Credentials Toggle */}
        <div className="flex items-center mt-8 mb-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
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

        <div className="flex justify-end gap-4 mt-10 pt-6 border-t border-slate-100">
          <Button variant="secondary" onClick={() => navigate('/leases')}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} className="min-w-[140px] shadow-lg shadow-indigo-200">
            Save Lease
          </Button>
        </div>
      </div>
    </MainLayout >
  );
};
