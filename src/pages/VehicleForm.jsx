import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  X, 
  User, 
  Building2, 
  CreditCard, 
  Car, 
  MapPin, 
  Camera,
  Trash2,
  ChevronRight,
  ChevronLeft,
  CheckCircle,
  AlertCircle,
  Clock
} from 'lucide-react';
import api from '../api/client';
import { useTranslation } from 'react-i18next';
import { Button } from '../components/Button';
import clsx from 'clsx';

export const VehicleForm = ({ isOpen, onClose, fetchVehicles, editingVehicle }) => {
  const { t } = useTranslation();
  const [tenants, setTenants] = useState([]);
  const [loadingTenants, setLoadingTenants] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [saving, setSaving] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    tenantId: '',
    leaseId: '',
    make: '',
    model: '',
    color: '',
    licensePlate: '',
    parkingSpace: '',
  });

  const [photos, setPhotos] = useState({
    photo1: null,
    photo2: null
  });

  const [previews, setPreviews] = useState({
    photo1: null,
    photo2: null
  });

  useEffect(() => {
    fetchTenants();
    if (editingVehicle) {
      setFormData({
        tenantId: editingVehicle.tenantId.toString(),
        leaseId: editingVehicle.leaseId ? editingVehicle.leaseId.toString() : '',
        make: editingVehicle.make || '',
        model: editingVehicle.model || '',
        color: editingVehicle.color || '',
        licensePlate: editingVehicle.licensePlate || '',
        parkingSpace: editingVehicle.parkingSpace || '',
      });
      setPreviews({
        photo1: editingVehicle.photo1Url || null,
        photo2: editingVehicle.photo2Url || null
      });
    }
  }, [editingVehicle]);

  const fetchTenants = async () => {
    try {
      setLoadingTenants(true);
      const res = await api.get('/api/admin/tenants?limit=1000');
      setTenants(res.data?.data || res.data || []);
    } catch (e) {
      console.error('Failed to fetch tenants', e);
    } finally {
      setLoadingTenants(false);
    }
  };

  useEffect(() => {
    if (formData.tenantId) {
      const tenant = tenants.find(t => t.id === parseInt(formData.tenantId));
      if (tenant) {
        setSelectedTenant(tenant);
        // Find active lease to auto-set leaseId
        // The backend `getAllTenants` doesn't always include leaseId directly, 
        // but it includes building and unit info.
        // If editing, we keep the existing leaseId.
        if (!editingVehicle) {
          setFormData(prev => ({ ...prev, leaseId: tenant.leaseId || '' }));
        }
      }
    } else {
      setSelectedTenant(null);
    }
  }, [formData.tenantId, tenants]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const { name, files } = e.target;
    if (files && files[0]) {
      const file = files[0];
      setPhotos(prev => ({ ...prev, [name]: file }));
      setPreviews(prev => ({ ...prev, [name]: URL.createObjectURL(file) }));
    }
  };

  const removePhoto = (name) => {
    setPhotos(prev => ({ ...prev, [name]: null }));
    setPreviews(prev => ({ ...prev, [name]: null }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      const submitData = new FormData();
      Object.keys(formData).forEach(key => {
        submitData.append(key, formData[key]);
      });
      
      if (photos.photo1) submitData.append('photo1', photos.photo1);
      if (photos.photo2) submitData.append('photo2', photos.photo2);

      if (editingVehicle) {
        await api.put(`/api/admin/vehicles/${editingVehicle.id}`, submitData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        await api.post('/api/admin/vehicles', submitData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }

      await fetchVehicles();
      onClose();
    } catch (e) {
      console.error('Failed to save vehicle', e);
      alert(e.response?.data?.message || 'Error saving vehicle information');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-[32px] w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-400 max-h-[90vh] overflow-hidden flex flex-col border border-slate-100">
        
        {/* HEADER */}
        <div className="px-10 py-8 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
          <div>
            <h3 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                <Car size={24} />
              </div>
              {editingVehicle ? t('vehicle.edit_profile') : t('vehicle.register')}
            </h3>
            <p className="text-slate-500 font-medium text-sm mt-1">
              {t('vehicle.identification_note')}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-all duration-300"
          >
            <X size={24} />
          </button>
        </div>

        {/* FORM */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-10 py-8 custom-scrollbar">
          <div className="space-y-8">
            
            {/* SECTION: TENANT ASSIGNMENT */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-slate-400 font-black text-[11px] uppercase tracking-widest px-1">
                <User size={14} className="text-indigo-500" />
                {t('vehicle.step_resident')}
              </div>
              
              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 ml-1">{t('vehicle.select_tenant')}</label>
                  <select
                    name="tenantId"
                    value={formData.tenantId}
                    onChange={handleChange}
                    required
                    className="w-full h-[54px] px-5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-700 font-semibold focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none"
                  >
                    <option value="">{t('vehicle.choose_tenant')}</option>
                    {tenants.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>

                {selectedTenant && (
                  <div className="p-5 rounded-2xl bg-indigo-50/50 border border-indigo-100 flex items-center justify-between animate-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center text-indigo-600 border border-indigo-100">
                        <Building2 size={24} />
                      </div>
                      <div>
                        <div className="text-sm font-black text-slate-800 uppercase tracking-tight">Auto-Populated Details</div>
                        <div className="text-xs font-bold text-slate-500 mt-0.5">
                          Building: {selectedTenant.property} | Unit: {selectedTenant.unit}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* SECTION: VEHICLE DETAILS */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-slate-400 font-black text-[11px] uppercase tracking-widest px-1">
                <CreditCard size={14} className="text-indigo-500" />
                {t('vehicle.step_info')}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 ml-1">{t('vehicle.plate')} *</label>
                  <input
                    type="text"
                    name="licensePlate"
                    value={formData.licensePlate}
                    onChange={handleChange}
                    required
                    placeholder="E.g. ABC-1234"
                    className="w-full h-[54px] px-5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-700 font-semibold focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none uppercase placeholder:normal-case"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 ml-1">{t('vehicle.color')} *</label>
                  <input
                    type="text"
                    name="color"
                    value={formData.color}
                    onChange={handleChange}
                    required
                    placeholder="E.g. Silver, Black"
                    className="w-full h-[54px] px-5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-700 font-semibold focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 ml-1">{t('vehicle.make')} *</label>
                  <input
                    type="text"
                    name="make"
                    value={formData.make}
                    onChange={handleChange}
                    required
                    placeholder="E.g. Honda, Toyota"
                    className="w-full h-[54px] px-5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-700 font-semibold focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 ml-1">{t('vehicle.model')} *</label>
                  <input
                    type="text"
                    name="model"
                    value={formData.model}
                    onChange={handleChange}
                    required
                    placeholder="E.g. Civic, RAV4"
                    className="w-full h-[54px] px-5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-700 font-semibold focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none"
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <label className="text-sm font-bold text-slate-700 ml-1">{t('vehicle.parking')}</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="text"
                      name="parkingSpace"
                      value={formData.parkingSpace}
                      onChange={handleChange}
                      placeholder="Enter assigned stall or space number"
                      className="w-full h-[54px] pl-12 pr-5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-700 font-semibold focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION: MEDIA */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-slate-400 font-black text-[11px] uppercase tracking-widest px-1">
                <Camera size={14} className="text-indigo-500" />
                {t('vehicle.step_media')}
              </div>

              <div className="grid grid-cols-2 gap-6">
                {['photo1', 'photo2'].map((photoKey, idx) => (
                  <div key={photoKey} className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 ml-1">Photo {idx + 1}</label>
                    <div className={clsx(
                      "relative h-44 rounded-3xl border-2 border-dashed flex flex-col items-center justify-center gap-3 transition-all cursor-pointer overflow-hidden",
                      previews[photoKey] ? "border-indigo-200 bg-slate-50" : "border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300"
                    )}>
                      {previews[photoKey] ? (
                        <>
                          <img src={previews[photoKey]} alt="Preview" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={(e) => { e.preventDefault(); removePhoto(photoKey); }}
                            className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-rose-500 text-white shadow-lg hover:bg-rose-600 transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      ) : (
                        <>
                          <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-slate-400">
                            <Camera size={24} />
                          </div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('common.actions')}</p>
                          <input
                            type="file"
                            name={photoKey}
                            onChange={handleFileChange}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            accept="image/*"
                          />
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* FOOTER ACTIONS */}
          <div className="mt-12 flex gap-4">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              className="flex-1 h-[58px] rounded-2xl text-sm font-black uppercase tracking-widest"
              disabled={saving}
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="flex-[2] h-[58px] rounded-2xl shadow-xl shadow-indigo-100 text-sm font-black uppercase tracking-widest"
              disabled={saving}
            >
              {saving ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {t('common.loading')}
                </div>
              ) : (
                editingVehicle ? t('vehicle.update') : t('vehicle.register')
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
