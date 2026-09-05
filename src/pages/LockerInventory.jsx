import React, { useState, useEffect } from 'react';
import { MainLayout } from '../layouts/MainLayout';
import { Plus, X, Lock, Building2, CheckCircle, AlertCircle, Trash2, Pencil, Search } from 'lucide-react';
import { Button } from '../components/Button';
import api from '../api/client';
import { hasPermission } from '../utils/permissions';

export const LockerInventory = () => {
  const [lockers, setLockers] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editLocker, setEditLocker] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState('');
  const [buildingFilter, setBuildingFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [formData, setFormData] = useState({ buildingId: '', lockerNumber: '' });

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchLockers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/admin/lockers');
      setLockers(res.data || []);
    } catch (err) {
      console.error('Failed to fetch lockers', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBuildings = async () => {
    try {
      const res = await api.get('/api/admin/properties');
      setBuildings(res.data || []);
    } catch (err) {
      console.error('Failed to fetch buildings', err);
    }
  };

  useEffect(() => {
    fetchLockers();
    fetchBuildings();
  }, []);

  const openCreate = () => {
    setEditLocker(null);
    setFormData({ buildingId: '', lockerNumber: '' });
    setShowModal(true);
  };

  const openEdit = (locker) => {
    setEditLocker(locker);
    setFormData({ buildingId: locker.buildingId, lockerNumber: locker.lockerNumber });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.buildingId || !formData.lockerNumber.trim()) {
      showToast('Building and Locker Number are required.', 'error');
      return;
    }
    try {
      if (editLocker) {
        await api.put(`/api/admin/lockers/${editLocker.id}`, formData);
        showToast('Locker updated successfully!');
      } else {
        await api.post('/api/admin/lockers', formData);
        showToast('Locker created successfully!');
      }
      setShowModal(false);
      fetchLockers();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to save locker.', 'error');
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/api/admin/lockers/${id}`);
      showToast('Locker deleted.');
      setDeleteConfirm(null);
      fetchLockers();
    } catch (err) {
      showToast(err.response?.data?.error || 'Cannot delete this locker.', 'error');
      setDeleteConfirm(null);
    }
  };

  const filtered = lockers.filter(l => {
    const matchSearch = !search || l.lockerNumber.toLowerCase().includes(search.toLowerCase()) || l.property?.name?.toLowerCase().includes(search.toLowerCase());
    const matchBuilding = !buildingFilter || String(l.buildingId) === String(buildingFilter);
    const matchStatus = !statusFilter || l.status === statusFilter;
    return matchSearch && matchBuilding && matchStatus;
  });

  return (
    <MainLayout title="Locker Inventory">
      {toast && (
        <div className={`fixed top-4 right-4 z-[100] flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl text-sm font-semibold text-white transition-all duration-300 ${toast.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`}>
          {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          {toast.message}
        </div>
      )}

      <div className="flex flex-col gap-6">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-xl shadow-[0_5px_15px_rgba(0,0,0,0.05)] border border-slate-100">
          <div className="flex-1 flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
            <Search size={18} className="text-slate-400" />
            <input
              type="text"
              placeholder="Search by locker number or building..."
              className="bg-transparent border-none outline-none text-sm w-full text-slate-700 placeholder:text-slate-400"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
            <Building2 size={18} className="text-slate-400" />
            <select
              className="bg-transparent border-none outline-none text-sm text-slate-700 min-w-[160px] cursor-pointer"
              value={buildingFilter}
              onChange={(e) => setBuildingFilter(e.target.value)}
            >
              <option value="">All Buildings</option>
              {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
            <Lock size={18} className="text-slate-400" />
            <select
              className="bg-transparent border-none outline-none text-sm text-slate-700 min-w-[130px] cursor-pointer"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="Available">Available</option>
              <option value="Occupied">Occupied</option>
            </select>
          </div>

          {hasPermission('Lockers', 'add') && (
            <Button variant="primary" onClick={openCreate}>
              <Plus size={18} /> Add Locker
            </Button>
          )}
        </div>

        {/* TABLE */}
        <div className="bg-white rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.06)] overflow-hidden border border-slate-100">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-slate-400 text-sm">Loading lockers...</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Lock size={36} className="text-slate-200" />
              <p className="text-slate-400 text-sm">No lockers found. Create your first locker to get started.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Building</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Locker Number</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Current Tenant</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((locker, i) => (
                    <tr key={locker.id} className="hover:bg-slate-50/80 transition-all duration-200" style={{ animationDelay: `${i * 0.03}s` }}>
                      <td className="px-6 py-4 text-sm font-medium text-slate-700">{locker.property?.name || '—'}</td>
                      <td className="px-6 py-4">
                        <span className="flex items-center gap-2 text-sm font-bold text-slate-800">
                          <Lock size={14} className="text-indigo-400" />
                          {locker.lockerNumber}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${locker.status === 'Occupied' ? 'bg-red-50 text-red-700 border-red-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${locker.status === 'Occupied' ? 'bg-red-500' : 'bg-emerald-500'}`}></span>
                          {locker.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{locker.currentTenant || '—'}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          {hasPermission('Lockers', 'edit') && (
                            <button
                              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                              onClick={() => openEdit(locker)}
                              title="Edit Locker"
                            >
                              <Pencil size={15} />
                            </button>
                          )}
                          {hasPermission('Lockers', 'delete') && (
                            <button
                              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all"
                              onClick={() => setDeleteConfirm(locker)}
                              title="Delete Locker"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 text-xs text-slate-500 font-medium">
                Showing {filtered.length} of {lockers.length} lockers
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CREATE / EDIT MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-900">{editLocker ? 'Edit Locker' : 'Add Locker'}</h3>
              <button type="button" onClick={() => setShowModal(false)} className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 mb-8">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Building <span className="text-red-500">*</span></label>
                <select
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all text-sm"
                  value={formData.buildingId}
                  onChange={(e) => setFormData({ ...formData, buildingId: e.target.value })}
                  required
                >
                  <option value="">Select Building</option>
                  {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Locker Number <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  placeholder="e.g. L01"
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all text-sm"
                  value={formData.lockerNumber}
                  onChange={(e) => setFormData({ ...formData, lockerNumber: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button type="submit" variant="primary">{editLocker ? 'Save Changes' : 'Create Locker'}</Button>
            </div>
          </form>
        </div>
      )}

      {/* DELETE CONFIRM */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-300 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={28} className="text-red-500" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Delete Locker?</h3>
            <p className="text-sm text-slate-500 mb-6">Locker <strong>{deleteConfirm.lockerNumber}</strong> in <strong>{deleteConfirm.property?.name}</strong> will be permanently deleted. This action cannot be undone.</p>
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
              <Button variant="primary" className="flex-1 !bg-red-500 hover:!bg-red-600" onClick={() => handleDelete(deleteConfirm.id)}>Delete</Button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
};
