import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { MainLayout } from '../layouts/MainLayout';
import { useTranslation } from 'react-i18next';
import { Button } from '../components/Button';
import { 
  Car, 
  Search, 
  Plus, 
  Trash2, 
  Pencil, 
  AlertCircle, 
  CheckCircle, 
  Building2, 
  User, 
  MapPin, 
  Camera,
  X,
  Filter,
  Eye,
  Phone
} from 'lucide-react';
import api from '../api/client';
import { VehicleForm } from './VehicleForm';
import { hasPermission } from '../utils/permissions';
import clsx from 'clsx';

export const Vehicles = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const initialFilter = queryParams.get('filter');

  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [buildingFilter, setBuildingFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState(initialFilter || '');
  const [properties, setProperties] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [viewingVehicle, setViewingVehicle] = useState(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1, limit: 10 });
  const [forceUpdate, setForceUpdate] = useState(0);

  useEffect(() => {
    const handleUpdate = () => setForceUpdate(prev => prev + 1);
    window.addEventListener('permissionsUpdated', handleUpdate);
    return () => window.removeEventListener('permissionsUpdated', handleUpdate);
  }, []);

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (buildingFilter) params.append('buildingId', buildingFilter);
      if (statusFilter) params.append('unauthorizedOnly', statusFilter);
      params.append('page', page);
      params.append('limit', 10);
      
      const res = await api.get(`/api/admin/vehicles?${params.toString()}`);
      let { data, pagination: pagin } = res.data;

      setVehicles(data);
      setPagination(pagin || { total: data.length, totalPages: 1, limit: 10 });
    } catch (e) {
      console.error('Failed to fetch vehicles', e);
    } finally {
      setLoading(false);
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
    fetchProperties();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchVehicles();
    }, 400);
    return () => clearTimeout(timer);
  }, [search, buildingFilter, statusFilter, page]);

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to remove this vehicle record?')) {
      try {
        await api.delete(`/api/admin/vehicles/${id}`);
        fetchVehicles();
      } catch (e) {
        alert('Failed to delete vehicle');
      }
    }
  };

  const handleEdit = (vehicle) => {
    setEditingVehicle(vehicle);
    setShowForm(true);
  };

  return (
    <MainLayout title={t('sidebar.vehicles')}>
      <div className="flex flex-col gap-6">
        
        {/* TOP BAR / FILTERS */}
        <section className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-100 gap-4">
          <div className="flex items-center gap-3 bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200 focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all w-full md:w-auto md:min-w-[320px]">
            <Search size={18} className="text-slate-400" />
            <input
              type="text"
              placeholder={t('sidebar.overview')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent border-none outline-none text-slate-700 placeholder:text-slate-400 w-full text-sm font-medium"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="flex items-center gap-2 bg-slate-50 py-2.5 px-3.5 rounded-xl border border-slate-200 w-full md:w-auto">
              <Building2 size={16} className="text-slate-400" />
              <select
                value={buildingFilter}
                onChange={(e) => setBuildingFilter(e.target.value)}
                className="bg-transparent border-none outline-none text-sm text-slate-700 font-medium cursor-pointer min-w-[150px]"
              >
                <option value="">{t('sidebar.buildings')}</option>
                {properties.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            {hasPermission('Vehicles', 'add') && (
              <Button variant="primary" onClick={() => { setEditingVehicle(null); setShowForm(true); }} className="whitespace-nowrap rounded-xl shadow-lg shadow-indigo-100">
                <Plus size={18} />
                {t('vehicle.register')}
              </Button>
            )}
          </div>
        </section>

        {/* VEHICLE LIST */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          {loading ? (
            <div className="p-20 flex flex-col items-center justify-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
              <p className="text-slate-500 font-medium italic">{t('vehicle.loading')}</p>
            </div>
          ) : vehicles.length === 0 ? (
            <div className="p-20 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-300">
                <Car size={40} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-800">No Vehicles Found</h3>
                <p className="text-slate-500 mt-1 max-w-xs">No vehicle records match your current filters or none have been registered yet.</p>
              </div>
              <Button variant="secondary" onClick={() => { setSearch(''); setBuildingFilter(''); setStatusFilter(''); setPage(1); }}>Clear Filters</Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('vehicle.details')}</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('sidebar.tenants')}</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('vehicle.location')}</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('common.status')}</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {vehicles.map((v) => (
                    <tr key={v.id} className="group hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-slate-100 overflow-hidden flex items-center justify-center text-slate-400 shrink-0 border border-slate-200">
                            {v.photo1Url ? (
                              <img src={v.photo1Url} alt="Vehicle" className="w-full h-full object-cover" />
                            ) : (
                              <Car size={20} />
                            )}
                          </div>
                          <div>
                            <div className="text-sm font-black text-slate-800 uppercase tracking-tight">
                              {v.licensePlate}
                            </div>
                            <div className="text-xs font-semibold text-slate-500 uppercase mt-0.5">
                              {v.color} {v.make} {v.model}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <User size={14} className="text-slate-400" />
                            <span className="text-sm font-bold text-slate-700">{v.tenantName}</span>
                          </div>
                          {v.tenantPhone && (
                            <div className="flex items-center gap-1.5 mt-0.5 ml-0.5">
                              <Phone size={10} className="text-indigo-400" />
                              <span className="text-[11px] font-semibold text-slate-500">{v.tenantPhone}</span>
                            </div>
                          )}
                        </div>
                        {v.parkingSpace && (
                          <div className="text-[10px] font-bold text-slate-400 uppercase mt-1 flex items-center gap-1">
                            <MapPin size={10} />
                            Space: {v.parkingSpace}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-5">
                        <div className="text-sm font-bold text-slate-800">{v.buildingName}</div>
                        <div className="text-xs font-semibold text-slate-500 mt-0.5">Unit {v.unitNumber}</div>
                      </td>
                      <td className="px-6 py-5">
                        <span className={clsx(
                          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border",
                          v.isAuthorized 
                            ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
                            : "bg-red-50 text-red-700 border-red-100"
                        )}>
                          {v.isAuthorized ? (
                            <>
                              <CheckCircle size={10} />
                              Authorized
                            </>
                          ) : (
                            <>
                              <AlertCircle size={10} />
                              Not Authorized
                            </>
                          )}
                        </span>
                        {!v.isAuthorized && (
                          <div className="text-[9px] font-bold text-red-400 uppercase mt-1">Lease Expired: {v.leaseExpiry}</div>
                        )}
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex justify-end gap-1">
                          <button 
                            onClick={() => setViewingVehicle(v)}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                            title="View Details"
                          >
                            <Eye size={16} />
                          </button>
                          {hasPermission('Vehicles', 'edit') && (
                            <button 
                              onClick={() => handleEdit(v)}
                              className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                              title="Edit Vehicle"
                            >
                              <Pencil size={16} />
                            </button>
                          )}
                          {hasPermission('Vehicles', 'delete') && (
                            <button 
                              onClick={() => handleDelete(v.id)}
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                              title="Delete Vehicle"
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
          )}

          {/* PAGINATION */}
          {!loading && vehicles.length > 0 && (
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-tight">
                Showing {vehicles.length} of {pagination.total} vehicles
              </p>
              <div className="flex items-center gap-2">
                <Button 
                  variant="secondary" 
                  size="sm" 
                  disabled={page === 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  className="rounded-lg h-8 px-3"
                >
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {[...Array(pagination.totalPages)].map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setPage(i + 1)}
                      className={clsx(
                        "w-8 h-8 rounded-lg text-xs font-black transition-all",
                        page === i + 1 
                          ? "bg-indigo-600 text-white shadow-md shadow-indigo-100" 
                          : "text-slate-400 hover:bg-white hover:text-slate-600 border border-transparent hover:border-slate-200"
                      )}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
                <Button 
                  variant="secondary" 
                  size="sm" 
                  disabled={page === pagination.totalPages}
                  onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                  className="rounded-lg h-8 px-3"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </section>
      </div>

      {viewingVehicle && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[32px] w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-400 max-h-[90vh] overflow-hidden flex flex-col border border-slate-100">
            <div className="px-8 py-6 border-b border-slate-100 bg-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <Car size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800 tracking-tight">Vehicle Details</h3>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">{viewingVehicle.licensePlate}</p>
                </div>
              </div>
              <button onClick={() => setViewingVehicle(null)} className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-all">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6 custom-scrollbar">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Make / Model</p>
                  <p className="text-sm font-bold text-slate-800">{viewingVehicle.make} {viewingVehicle.model}</p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Color</p>
                  <p className="text-sm font-bold text-slate-800">{viewingVehicle.color}</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Authorization Status</p>
                  <span className={clsx(
                    "inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border",
                    viewingVehicle.isAuthorized 
                      ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
                      : "bg-red-50 text-red-700 border-red-100"
                  )}>
                    {viewingVehicle.isAuthorized ? <CheckCircle size={10} /> : <AlertCircle size={10} />}
                    {viewingVehicle.isAuthorized ? 'Authorized' : 'Not Authorized'}
                  </span>
                </div>

                {viewingVehicle.leaseExpiry && !viewingVehicle.isAuthorized && (
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-red-50/50 border border-red-100">
                    <p className="text-[10px] font-black text-red-600 uppercase tracking-widest">Lease Expiry Notice</p>
                    <p className="text-xs font-bold text-red-700">Expired: {viewingVehicle.leaseExpiry}</p>
                  </div>
                )}

                <div className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-500"><User size={18} /></div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Registrant (Tenant)</p>
                    <p className="text-sm font-bold text-slate-800">{viewingVehicle.tenantName}</p>
                    {viewingVehicle.tenantPhone && (
                      <a href={`tel:${viewingVehicle.tenantPhone}`} className="text-xs font-bold text-indigo-600 flex items-center gap-1 mt-0.5 hover:underline">
                        <Phone size={10} />
                        {viewingVehicle.tenantPhone}
                      </a>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-500"><Building2 size={18} /></div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Building & Unit</p>
                    <p className="text-sm font-bold text-slate-800">{viewingVehicle.buildingName} | Unit {viewingVehicle.unitNumber}</p>
                  </div>
                </div>

                {viewingVehicle.parkingSpace && (
                  <div className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-500"><MapPin size={18} /></div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Parking Space Number</p>
                      <p className="text-sm font-black text-indigo-600">{viewingVehicle.parkingSpace}</p>
                    </div>
                  </div>
                )}
              </div>

              {(viewingVehicle.photo1Url || viewingVehicle.photo2Url) && (
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Vehicle Media</p>
                  <div className="grid grid-cols-2 gap-4">
                    {viewingVehicle.photo1Url && (
                      <div className="h-40 rounded-2xl bg-slate-50 overflow-hidden border border-slate-100">
                        <img src={viewingVehicle.photo1Url} alt="Vehicle View 1" className="w-full h-full object-cover" />
                      </div>
                    )}
                    {viewingVehicle.photo2Url && (
                      <div className="h-40 rounded-2xl bg-slate-50 overflow-hidden border border-slate-100">
                        <img src={viewingVehicle.photo2Url} alt="Vehicle View 2" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex shrink-0">
              <Button type="button" variant="secondary" onClick={() => setViewingVehicle(null)} className="w-full rounded-2xl h-12 font-bold">
                Close Details
              </Button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <VehicleForm 
          isOpen={showForm} 
          onClose={() => setShowForm(false)} 
          fetchVehicles={fetchVehicles}
          editingVehicle={editingVehicle}
        />
      )}
    </MainLayout>
  );
};
