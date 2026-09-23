import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';
import api from '../api/client';

export const TemporaryAssignmentModal = ({ isOpen, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [tenants, setTenants] = useState([]);
  const [properties, setProperties] = useState([]);
  const [units, setUnits] = useState([]);
  
  const [selectedTenant, setSelectedTenant] = useState('');
  const [selectedLease, setSelectedLease] = useState('');
  const [tempBuildingId, setTempBuildingId] = useState('');
  const [tempUnitId, setTempUnitId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('Repairs/Maintenance');
  const [variance, setVariance] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchTenants();
      fetchProperties();
    }
  }, [isOpen]);

  const fetchTenants = async () => {
    try {
      const res = await api.get('/api/admin/tenants');
      setTenants(res.data?.data || res.data || []);
    } catch (e) {
      console.error('Failed to fetch tenants', e);
    }
  };

  const fetchProperties = async () => {
    try {
      const res = await api.get('/api/admin/properties');
      setProperties(res.data?.data || res.data || []);
    } catch (e) {
      console.error('Failed to fetch properties', e);
    }
  };

  useEffect(() => {
    if (tempBuildingId) {
      api.get(`/api/admin/units?building_id=${tempBuildingId}&limit=100`)
        .then(res => setUnits(res.data?.data || res.data || []))
        .catch(err => console.error('Failed to fetch units', err));
    } else {
      setUnits([]);
    }
  }, [tempBuildingId]);

  if (!isOpen) return null;

  const currentTenantObj = tenants.find(t => t.id.toString() === selectedTenant);
  const activeLeases = (currentTenantObj?.leases || []).filter(l => l.status === 'Active' && !l.tempUnitId && !l.temp_unit_id);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedLease || !tempUnitId || !startDate || !endDate) {
      alert("Please fill all required fields.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        temp_building_id: parseInt(tempBuildingId),
        temp_unit_id: parseInt(tempUnitId),
        start_date: startDate,
        expected_end_date: endDate,
        reason: reason,
        variance: variance ? parseFloat(variance) : null
      };
      
      await api.post(`/api/admin/leases/${selectedLease}/assign-temporary-unit`, payload);
      alert('Temporary unit assigned successfully');
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      alert('Failed to assign temporary unit. Please check your inputs.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-800 text-lg">Add Temporary Assignment</h3>
            <p className="text-xs text-slate-500 mt-1">Assign a temporary unit to an existing tenant</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Select Tenant</label>
              <select 
                required 
                value={selectedTenant}
                onChange={(e) => {
                  setSelectedTenant(e.target.value);
                  setSelectedLease('');
                }}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm"
              >
                <option value="">Choose Tenant...</option>
                {tenants.map(t => (
                  <option key={t.id} value={t.id}>{t.name || `${t.firstName || ''} ${t.lastName || ''}`.trim() || `Tenant ${t.id}`}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Select Lease</label>
              <select 
                required 
                value={selectedLease}
                onChange={(e) => setSelectedLease(e.target.value)}
                disabled={!selectedTenant}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm disabled:opacity-50"
              >
                <option value="">Choose Active Lease...</option>
                {activeLeases.map(l => (
                  <option key={l.id} value={l.id}>Lease #{l.id} (Unit: {l.unit?.name || l.unitId})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Temporary Building</label>
              <select 
                required 
                value={tempBuildingId}
                onChange={(e) => setTempBuildingId(e.target.value)}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm"
              >
                <option value="">Select Building...</option>
                {properties.map(b => (
                  <option key={b.id} value={b.id}>{b.name || 'Building ' + b.id}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Temporary Unit</label>
              <select 
                required 
                value={tempUnitId}
                onChange={(e) => setTempUnitId(e.target.value)}
                disabled={!tempBuildingId}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm disabled:opacity-50"
              >
                <option value="">Select Unit...</option>
                {units.map(u => (
                  <option key={u.id} value={u.id}>{u.name || u.unitNumber}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Start Date</label>
              <input 
                type="date" 
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Expected End Date</label>
              <input 
                type="date" 
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Reason</label>
            <select 
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm text-slate-700"
            >
              <option value="Repairs/Maintenance">Repairs/Maintenance</option>
              <option value="Contracted unit not ready">Contracted unit not ready</option>
              <option value="Water Damage">Water Damage</option>
              <option value="Remediation">Remediation</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">
              Temporary Accommodation Variance ($) <span className="text-slate-400 font-normal text-xs">(Optional)</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
              <input 
                type="number" 
                step="0.01"
                value={variance}
                onChange={(e) => setVariance(e.target.value)}
                placeholder="0.00"
                className="w-full pl-8 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm"
              />
            </div>
            <p className="text-[10px] text-slate-500 mt-1">Amount to add/subtract from rent during temporary assignment. Use negative for discount.</p>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? 'Assigning...' : 'Assign Temporary Unit'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
