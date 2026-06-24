import React, { useState, useEffect } from 'react';
import { MainLayout } from '../layouts/MainLayout';
import { Link } from 'react-router-dom';
import { Button } from '../components/Button';
import { Plus, Search, Filter, Eye, Edit2, Trash2, X, ChevronDown, Loader2, CheckCircle, AlertCircle, Settings, User, Shield } from 'lucide-react';
import api from '../api/client';
import { hasPermission } from '../utils/permissions';

export const Units = () => {
  const [__forceUpdate, __setForceUpdate] = useState(0);
  useEffect(() => {
    const handleUpdate = () => __setForceUpdate(p => p + 1);
    window.addEventListener('permissionsUpdated', handleUpdate);
    return () => window.removeEventListener('permissionsUpdated', handleUpdate);
  }, []);

  const [units, setUnits] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editUnit, setEditUnit] = useState(null);
  const [viewUnit, setViewUnit] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [showInactive, setShowInactive] = useState(localStorage.getItem('showUnitsInConstruction') === 'true');
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [unitTypes, setUnitTypes] = useState([]);
  const [showTypesModal, setShowTypesModal] = useState(false);

  const [formData, setFormData] = useState({
    propertyId: '',
    unitNumber: '',
    unitType: '',
    floor: '',
    rentalMode: 'FULL_UNIT',
    bedrooms: '1',
    status: 'Vacant',
    bedroomIdentifiers: ['Unit-1'],
    // readiness fields
    unit_status: 'INACTIVE',
    gc_delivered_target_date: '',
    reserved_flag: false,
    reserved_by_id: '',
    reserve_firstName: '',
    reserve_lastName: '',
    reserve_email: '',
    reserve_phone: '',
    tentative_move_in_date: '',
    classification: 'New Construction'
  });
  const [tenants, setTenants] = useState([]);
  const [showQuickAddTenant, setShowQuickAddTenant] = useState(false);
  const [quickAddTenantType, setQuickAddTenantType] = useState('Individual');
  const [quickAddFormStep, setQuickAddFormStep] = useState(1);
  const [quickAddErrors, setQuickAddErrors] = useState({});
  const [isSavingQuickAdd, setIsSavingQuickAdd] = useState(false);
  
  const [billableTenants, setBillableTenants] = useState([]);
  const [selectedParentId, setSelectedParentId] = useState('');

  const [typeFilter, setTypeFilter] = useState('');
  const [buildingFilter, setBuildingFilter] = useState('');

  useEffect(() => {
    // Reset page to 1 when filters change
    setPagination(prev => ({ ...prev, page: 1 }));
  }, [typeFilter, buildingFilter, search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData(pagination.page);
    }, 400); // Debounce search/filter
    return () => clearTimeout(timer);
  }, [pagination.page, typeFilter, buildingFilter, search, showInactive]);

  useEffect(() => {
    if (showModal || viewUnit || editUnit || deleteConfirm) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [showModal, viewUnit, editUnit, deleteConfirm]);

  // Auto-hide toast after 3 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  const fetchUnitTypes = async () => {
    try {
      const res = await api.get('/api/admin/unit-types');
      setUnitTypes(res.data || []);
    } catch (error) {
      console.error('Error fetching unit types:', error);
    }
  };

  const fetchData = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
        search: search || '',
        unitType: typeFilter || '',
        propertyId: buildingFilter || '',
        showInactive: showInactive ? 'true' : 'false'
      });

      const [unitsRes, buildingsRes] = await Promise.all([
        api.get(`/api/admin/units?${params.toString()}`),
        api.get('/api/admin/properties'),
        fetchUnitTypes() // Fetch unit types too
      ]);

      try {
        const tenantsRes = await api.get('/api/admin/tenants?limit=1000');
        const allTenants = tenantsRes.data?.data || tenantsRes.data || [];
        setTenants(allTenants);
        setBillableTenants(allTenants.filter(t => t.type !== 'RESIDENT' && t.type !== 'Resident'));
      } catch (tenantError) {
        console.warn("User lacks Tenant List permissions, skipping tenant load for dropdowns.");
        setTenants([]);
        setBillableTenants([]);
      }

      if (buildingsRes.data && buildingsRes.data.length > 0 && !formData.propertyId) {
        setFormData(prev => ({ ...prev, propertyId: buildingsRes.data[0].id.toString() }));
      }

      if (unitsRes.data) {
        setUnits(unitsRes.data.data || []);
        setPagination(prev => ({
          ...prev,
          total: unitsRes.data.pagination?.total || 0,
          totalPages: unitsRes.data.pagination?.totalPages || 0,
          page: unitsRes.data.pagination?.page || 1
        }));
      }
      if (buildingsRes.data) {
        setBuildings(buildingsRes.data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      showToast('Error loading data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      propertyId: '',
      unitNumber: '',
      unitType: '',
      floor: '',
      rentalMode: 'FULL_UNIT',
      bedrooms: '1',
      status: 'Vacant',
      bedroomIdentifiers: ['Unit-1'],
      unit_status: 'INACTIVE',
      gc_delivered_target_date: '',
      reserved_flag: false,
      reserved_by_id: '',
      reserve_firstName: '',
      reserve_lastName: '',
      reserve_email: '',
      reserve_phone: '',
      tentative_move_in_date: '',
      classification: 'New Construction'
    });
  };

  const openAddModal = async () => {
    resetForm();
    if (buildings.length > 0) {
      setFormData(prev => ({ 
        ...prev, 
        propertyId: buildings[0].id.toString() 
      }));
    }
    setEditUnit(null);
    setShowModal(true);
    // Refresh buildings when opening modal to ensure new buildings appear
    try {
      const res = await api.get('/api/admin/properties');
      setBuildings(res.data);
    } catch (error) {
      console.error('Error refreshing buildings:', error);
    }
  };

  const openEditModal = async (unit) => {
    try {
      // Fetch full details to get bedrooms
      const res = await api.get(`/api/admin/units/${unit.id}`);
      const fullUnit = res.data;

      const activeLease = fullUnit.leases?.[0]; // Get latest lease
      const reservedUser = fullUnit.reserved_by_user;

      setFormData({
        propertyId: fullUnit.propertyId?.toString() || '',
        unitNumber: fullUnit.unitNumber || '',
        unitType: fullUnit.unitType || '',
        floor: fullUnit.floor?.toString() || '',
        rentalMode: fullUnit.rentalMode || 'FULL_UNIT',
        bedrooms: fullUnit.bedrooms?.toString() || '1',
        status: fullUnit.status || 'Vacant',
        bedroomIdentifiers: fullUnit.bedroomsList?.map(b => b.bedroomNumber) || [],
        unit_status: fullUnit.unit_status || 'INACTIVE',
        gc_delivered_target_date: fullUnit.gc_delivered_target_date ? new Date(fullUnit.gc_delivered_target_date).toISOString().split('T')[0] : '',
        reserved_flag: fullUnit.reserved_flag || !!activeLease,
        reserved_by_id: reservedUser?.id?.toString() || activeLease?.tenantId?.toString() || '',
        reserve_firstName: reservedUser?.firstName || activeLease?.tenant?.firstName || activeLease?.tenant?.name?.split(' ')[0] || '',
        reserve_lastName: reservedUser?.lastName || activeLease?.tenant?.lastName || activeLease?.tenant?.name?.split(' ').slice(1).join(' ') || '',
        reserve_email: reservedUser?.email || activeLease?.tenant?.email || '',
        reserve_phone: reservedUser?.phone || activeLease?.tenant?.phone || '',
        tentative_move_in_date: (fullUnit.tentative_move_in_date || activeLease?.startDate) ? new Date(fullUnit.tentative_move_in_date || activeLease?.startDate).toISOString().split('T')[0] : '',
        classification: fullUnit.unit_status === 'INACTIVE' ? 'New Construction' : (fullUnit.classification || 'Completed')
      });
      setEditUnit(fullUnit);
      setShowModal(true);
    } catch (error) {
      console.error(error);
      showToast('Error loading unit details', 'error');
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditUnit(null);
    resetForm();
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const newData = { ...prev, [name]: value };

      // Auto-generate bedroom identifiers logic
      if (name === 'bedrooms' || name === 'unitNumber') {
        const count = parseInt(name === 'bedrooms' ? value : prev.bedrooms) || 0;
        const unitNum = name === 'unitNumber' ? value : prev.unitNumber;

        let currentIds = [...(prev.bedroomIdentifiers || [])];

        // Resize array
        if (currentIds.length < count) {
          // Add new
          for (let i = currentIds.length; i < count; i++) {
            currentIds.push(`${unitNum || 'Unit'}-${i + 1}`);
          }
        } else if (currentIds.length > count) {
          // Trim
          currentIds = currentIds.slice(0, count);
        }

        // Auto-refresh identifiers logic: Sync if empty, default, or matching the previous unit pattern
        currentIds = currentIds.map((id, i) => {
          const defaultPattern = `Unit-${i + 1}`;
          const prevPattern = `${prev.unitNumber || 'Unit'}-${i + 1}`;

          if (!id || id === defaultPattern || id === prevPattern) {
            return `${unitNum || 'Unit'}-${i + 1}`;
          }
          return id;
        });

        newData.bedroomIdentifiers = currentIds;
      }
      return newData;
    });
  };

  const handleBedroomChange = (index, value) => {
    const newIds = [...formData.bedroomIdentifiers];
    newIds[index] = value;
    setFormData(prev => ({ ...prev, bedroomIdentifiers: newIds }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const selectedProperty = buildings.find(b => b.id === parseInt(formData.propertyId));

      const payload = {
        unitNumber: formData.unitNumber,
        unit: formData.unitNumber, // Map to backend expected field
        unitType: formData.unitType || null,
        floor: formData.floor ? parseInt(formData.floor) : null,
        bedrooms: parseInt(formData.bedrooms) || 1,
        propertyId: formData.propertyId,
        building: selectedProperty ? selectedProperty.name : 'Unknown',
        rentalMode: formData.rentalMode,
        status: formData.status,
        bedroomIdentifiers: formData.bedroomIdentifiers,
        // readiness fields
        unit_status: formData.unit_status,
        gc_delivered_target_date: formData.gc_delivered_target_date || null,
        reserved_flag: formData.reserved_flag,
        reserved_by_id: formData.reserved_by_id || null,
        reserve_firstName: formData.reserve_firstName,
        reserve_lastName: formData.reserve_lastName,
        reserve_email: formData.reserve_email,
        reserve_phone: formData.reserve_phone,
        tentative_move_in_date: formData.tentative_move_in_date || null,
        classification: formData.classification
      };

      console.log('SENDING UNIT PAYLOAD:', payload);

      if (editUnit) {
        // Update existing unit
        await api.put(`/api/admin/units/${editUnit.id}`, payload);
        showToast('Unit updated successfully');
      } else {
        // Create new unit
        await api.post('/api/admin/units', payload);
        showToast('Unit created successfully');
      }

      // Refresh data so new unit appears properly with all calculated fields
      await fetchData(pagination.page);

      closeModal();
    } catch (error) {
      console.error('Error saving unit:', error);
      showToast(error.response?.data?.message || 'Error saving unit', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (unit) => {
    setSubmitting(true);
    try {
      await api.delete(`/api/admin/units/${unit.id}`);
      setDeleteConfirm(null);
      showToast('Unit deleted successfully');
      await fetchData(pagination.page);
    } catch (error) {
      console.error('Error deleting unit:', error);
      showToast(error.response?.data?.message || 'Error deleting unit', 'error');
    } finally {
      setSubmitting(false);
    }
  };
  const filteredUnits = units;

  const getPageNumbers = () => {
    const total = Math.max(1, pagination.totalPages || 1);
    const current = pagination.page;
    const delta = 1; // Range around current page
    const range = [];
    const rangeWithDots = [];

    for (let i = 1; i <= total; i++) {
      if (i === 1 || i === total || (i >= current - delta && i <= current + delta)) {
        range.push(i);
      }
    }

    let l;
    for (let i of range) {
      if (l) {
        if (i - l === 2) {
          rangeWithDots.push(l + 1);
        } else if (i - l !== 1) {
          rangeWithDots.push('...');
        }
      }
      rangeWithDots.push(i);
      l = i;
    }

    return rangeWithDots;
  };

  return (
    <MainLayout title="Units">
      <div className="flex flex-col gap-6">

        {/* Toast Notification */}
        {toast && (
          <div className={`fixed top-4 right-4 z-[10000] flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg transition-all duration-300 ${toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
            }`}>
            {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
            <span className="text-sm font-medium">{toast.message}</span>
          </div>
        )}

        {/* TOP CONTROLS */}
        <section className="flex justify-between items-center">
          <div className="flex gap-4">
            <div className="flex items-center gap-2 bg-white py-2.5 px-3.5 rounded-xl shadow-sm border border-slate-200">
              <Filter size={16} className="text-slate-400" />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="border-none outline-none text-sm bg-transparent text-slate-700 min-w-[120px] font-medium cursor-pointer"
              >
                <option value="">All Types</option>
                {unitTypes.map(t => (
                  <option key={t.typeName} value={t.typeName}>{t.typeName}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 bg-white py-2.5 px-3.5 rounded-xl shadow-sm border border-slate-200">
              <Filter size={16} className="text-slate-400" />
              <select
                value={buildingFilter}
                onChange={(e) => setBuildingFilter(e.target.value)}
                className="border-none outline-none text-sm bg-transparent text-slate-700 min-w-[120px] font-medium cursor-pointer"
              >
                <option value="">All Buildings</option>
                {buildings.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 bg-white py-2.5 px-3.5 rounded-xl shadow-sm border border-slate-200">
              <Search size={18} className="text-slate-400" />
              <input
                type="text"
                placeholder="Search by unit or building"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="border-none outline-none text-sm w-48 text-slate-700 placeholder:text-slate-400"
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer group">
               <div className="relative">
                 <input 
                    type="checkbox" 
                    className="sr-only" 
                    checked={showInactive}
                    onChange={() => {
                      const newValue = !showInactive;
                      setShowInactive(newValue);
                      localStorage.setItem('showUnitsInConstruction', newValue.toString());
                    }} 
                 />
                 <div className={`w-10 h-6 rounded-full transition-colors ${showInactive ? 'bg-indigo-600' : 'bg-slate-200'}`}></div>
                 <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${showInactive ? 'translate-x-4' : ''}`}></div>
               </div>
               <span className="text-xs font-bold text-slate-500 uppercase tracking-tight">Show units in construction</span>
            </label>
          </div>

          <div className="flex gap-2">
            {hasPermission('Units', 'edit') && (
              <Button variant="secondary" onClick={() => setShowTypesModal(true)}>
                <Settings size={18} />
                Manage Types
              </Button>
            )}
            {hasPermission('Units', 'add') && (
              <Button variant="primary" onClick={openAddModal}>
                <Plus size={18} />
                Add Unit
              </Button>
            )}
          </div>
        </section>

        {/* TABLE */}
        <section className="bg-white rounded-2xl shadow-[0_15px_30px_rgba(0,0,0,0.08)] overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={32} className="animate-spin text-indigo-500" />
              <span className="ml-3 text-slate-500">Loading units...</span>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <div className="grid grid-cols-7 min-w-[800px] p-3.5 px-5 font-semibold bg-slate-50 text-slate-500 text-sm border-b border-slate-100 uppercase tracking-wide">
                  <span>Unit Identifier</span>
                  <span>Building Name</span>
                  <span>Unit Type</span>
                  <span>Floor</span>
                  <span>Bedrooms</span>
                  <span>Status</span>
                  <span>Actions</span>
                </div>

                {filteredUnits.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    No units found. Click "Add Unit" to create one.
                  </div>
                ) : (
                  filteredUnits.map((unit) => (
                    <div key={unit.id} className="grid grid-cols-7 min-w-[800px] p-3.5 px-5 transition-all duration-300 hover:bg-slate-50 bg-white border-b border-slate-50 last:border-0 text-sm items-center">
                      <Link to={`/units/${unit.id}`} className="font-medium text-indigo-600 hover:text-indigo-800 hover:underline transition-all">
                        {unit.unitNumber}
                      </Link>
                      <span className="font-bold text-indigo-600">{unit.buildingName || unit.civicNumber}</span>
                      <span className="text-slate-600">{unit.unitType || '-'}</span>
                      <span className="text-slate-600">{unit.floor || '-'}</span>
                      <span className="text-slate-600">{unit.bedrooms || '-'}</span>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold w-fit ${
                        unit.unit_status === 'INACTIVE' ? (unit.reserved_flag ? 'bg-blue-100 text-blue-700 border border-blue-200 uppercase tracking-tighter' : 'bg-amber-100 text-amber-700 border border-amber-200 uppercase tracking-tighter') :
                        unit.status === 'Occupied' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                        unit.status === 'Fully Booked' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' :
                        'bg-emerald-50 text-emerald-700 border border-emerald-100'
                      }`}>
                        {unit.unit_status === 'INACTIVE' 
                          ? (unit.reserved_flag ? 'Reserved - Not Ready' : 'In Construction') 
                          : (unit.reserved_flag ? 'Reserved - Ready for Move-In' : unit.status)
                        }
                      </span>
                      <div className="flex items-center gap-2">
                        <Link to={`/units/${unit.id}`}>
                          <Eye
                            size={16}
                            className="text-slate-400 hover:text-indigo-600 transition-colors"
                          />
                        </Link>
                        {hasPermission('Units', 'edit') && (
                          <Edit2
                            size={16}
                            className="cursor-pointer text-slate-400 hover:text-blue-600 transition-colors"
                            onClick={() => openEditModal(unit)}
                          />
                        )}
                        {hasPermission('Units', 'delete') && (
                          <Trash2
                            size={16}
                            className="cursor-pointer text-slate-400 hover:text-red-600 transition-colors"
                            onClick={() => setDeleteConfirm(unit)}
                          />
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* PAGINATION */}
              <div className="flex flex-col sm:flex-row items-center justify-between p-4 bg-slate-50 border-t border-slate-100 gap-4">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Showing {filteredUnits.length} of {pagination.total} units
                </span>

                <div className="flex items-center gap-1.5 flex-wrap justify-center">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={pagination.page <= 1}
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                    className="!px-2"
                  >
                    Prev
                  </Button>

                  {getPageNumbers().map((pageNum, idx) => (
                    pageNum === '...' ? (
                      <span key={`dots-${idx}`} className="px-2 text-slate-400 text-sm">...</span>
                    ) : (
                      <button
                        key={pageNum}
                        onClick={() => setPagination(prev => ({ ...prev, page: pageNum }))}
                        className={`min-w-[32px] h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-all ${pagination.page === pageNum
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-indigo-600 hover:border-indigo-200'
                          }`}
                      >
                        {pageNum}
                      </button>
                    )
                  ))}

                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={pagination.page >= (pagination.totalPages || 1)}
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                    className="!px-2"
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </section>

        {/* ADD/EDIT UNIT MODAL - FULL SCREEN */}
        {
          showModal && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[95vh] flex flex-col animate-in fade-in zoom-in duration-200">
                {/* Modal Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 flex-shrink-0 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-t-2xl">
                  <h3 className="text-xl font-bold text-white">
                    {editUnit ? 'Edit Unit' : 'Add New Unit'}
                  </h3>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="text-white/80 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-lg"
                  >
                    <X size={22} />
                  </button>
                </div>

                {/* Modal Body - Scrollable */}
                <div className="overflow-y-auto flex-1 p-6">
                  <form id="unitForm" onSubmit={handleSubmit} className="space-y-5">
                    {/* Building Name Dropdown */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Building Name <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <select
                          name="propertyId"
                          value={formData.propertyId}
                          onChange={handleInputChange}
                          required
                          className="w-full p-3.5 rounded-xl border-2 border-slate-200 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 bg-white text-sm appearance-none pr-10 transition-all"
                        >
                          <option value="" disabled>Select Building</option>
                          {buildings
                            .filter(b => b.status === 'Active')
                            .map(b => (
                              <option key={b.id} value={b.id}>
                                {b.name} - {b.civicNumber}
                              </option>
                            ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                          <ChevronDown size={18} className="text-slate-400" />
                        </div>
                      </div>
                    </div>

                    {/* Unit Identifier */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Unit Identifier <span className="text-red-500">*</span>
                      </label>
                      <input
                        name="unitNumber"
                        value={formData.unitNumber}
                        onChange={handleInputChange}
                        placeholder="e.g., 82-101"
                        required
                        className="w-full p-3.5 rounded-xl border-2 border-slate-200 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 text-sm transition-all"
                      />
                    </div>

                    {/* Unit Type & Floor Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                          Unit Type
                        </label>
                        <div className="relative">
                          <select
                            name="unitType"
                            value={formData.unitType}
                            onChange={handleInputChange}
                            className="w-full p-3.5 rounded-xl border-2 border-slate-200 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 bg-white text-sm appearance-none pr-10 transition-all font-medium"
                          >
                            <option value="">Select Type</option>
                            {unitTypes.map((type) => (
                              <option key={type.typeName} value={type.typeName}>
                                {type.typeName}
                              </option>
                            ))}
                          </select>
                          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                            <ChevronDown size={18} className="text-slate-400" />
                          </div>
                        </div>

                        {/* Rate visualizer below select */}
                        {formData.unitType && (() => {
                          const matchedType = unitTypes.find(t => t.typeName === formData.unitType);
                          if (!matchedType) return null;
                          return (
                            <p className="text-[11px] font-black text-indigo-500 mt-1.5 pl-1 animate-in slide-in-from-left-1">
                               💡 Standard Rates: Full ${parseFloat(matchedType.fullUnitRate).toLocaleString()} | Single Bed ${parseFloat(matchedType.singleBedroomRate).toLocaleString()}
                            </p>
                          );
                        })()}
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                          Floor
                        </label>
                        <input
                          name="floor"
                          type="number"
                          value={formData.floor}
                          onChange={handleInputChange}
                          placeholder="e.g., 1"
                          min="1"
                          className="w-full p-3.5 rounded-xl border-2 border-slate-200 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 text-sm transition-all"
                        />
                      </div>
                    </div>

                    {/* Bedrooms */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Number of Bedrooms
                      </label>
                      <input
                        name="bedrooms"
                        type="number"
                        value={formData.bedrooms}
                        onChange={handleInputChange}
                        placeholder="e.g., 3"
                        min="0"
                        className="w-full p-3.5 rounded-xl border-2 border-slate-200 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 text-sm transition-all"
                      />

                      {/* Dynamic Bedroom Inputs */}
                      {parseInt(formData.bedrooms) > 0 && (
                        <div className="mt-4 space-y-3 pl-4 border-l-2 border-slate-100">
                          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Bedroom Identifiers</h4>
                          {Array.from({ length: parseInt(formData.bedrooms) }).map((_, i) => (
                            <div key={i} className="flex flex-col gap-1">
                              <label className="text-xs text-slate-500">Bedroom {i + 1}</label>
                              <input
                                value={formData.bedroomIdentifiers[i] || ''}
                                onChange={(e) => handleBedroomChange(i, e.target.value)}
                                placeholder={`e.g., ${formData.unitNumber || '82-101'}-${i + 1}`}
                                className="w-full p-2.5 rounded-lg border border-slate-200 text-sm focus:border-indigo-500 outline-none"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Status (only for edit) */}
                    {editUnit && (
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                          Status
                        </label>
                        <div className="relative">
                          <select
                            name="status"
                            value={formData.status}
                            onChange={handleInputChange}
                            className="w-full p-3.5 rounded-xl border-2 border-slate-200 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 bg-white text-sm appearance-none pr-10 transition-all font-medium"
                          >
                            <option value="Vacant">Vacant</option>
                            <option value="Occupied">Occupied</option>
                          </select>
                          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                            <ChevronDown size={18} className="text-slate-400" />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 9.2 Activation Control */}
                    <div className="pt-4 border-t border-slate-100">
                      <div className="flex items-center justify-between mb-4">
                         <h4 className="text-sm font-bold text-indigo-600 uppercase tracking-widest flex items-center gap-2">
                           <CheckCircle size={16} /> Activation Control
                         </h4>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                           <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Unit Classification</label>
                           <select 
                              name="classification"
                              value={formData.classification}
                              onChange={handleInputChange}
                              className="w-full p-3 rounded-xl border border-slate-200 text-sm focus:border-indigo-500 outline-none bg-white font-bold"
                           >
                              <option value="Completed">Completed Unit</option>
                              <option value="New Construction">New Construction</option>
                           </select>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                          <div className="flex items-center justify-between">
                             <div>
                                <p className="text-sm font-bold text-slate-800">Unit Status</p>
                                <p className="text-[10px] text-slate-500">Currently: {formData.unit_status || 'INACTIVE'}</p>
                             </div>
                             <span className={`px-3 py-1 rounded-full text-xs font-black border ${
                                formData.unit_status === 'ACTIVE' 
                                  ? 'bg-emerald-100 text-emerald-700 border-emerald-200' 
                                  : 'bg-amber-100 text-amber-700 border-amber-200'
                             }`}>
                               {formData.unit_status || 'INACTIVE'}
                             </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 9.3 Construction Workflow Setup */}
                    <div className="pt-4 border-t border-slate-100">
                       <h4 className="text-sm font-bold text-indigo-600 uppercase tracking-widest flex items-center gap-2 mb-4">
                         <Settings size={16} /> Construction Setup
                       </h4>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                             <label className="block text-xs font-bold text-slate-500 uppercase mb-2">GC Delivered Date</label>
                             <input 
                                type="date"
                                name="gc_delivered_target_date"
                                value={formData.gc_delivered_target_date}
                                onChange={handleInputChange}
                                className="w-full p-3 rounded-xl border border-slate-200 text-sm focus:border-indigo-500 outline-none"
                             />
                          </div>
                          <div className="flex items-end pb-3">
                             <p className="text-[10px] text-slate-400 font-medium italic">
                               💡 Once entered, future dates will auto-calculate based on PMS settings.
                             </p>
                          </div>
                       </div>
                    </div>

                    {/* 9.5 Reservation */}
                    <div className="pt-4 border-t border-slate-100">
                      <div className="flex items-center justify-between mb-4">
                         <h4 className="text-sm font-bold text-indigo-600 uppercase tracking-widest flex items-center gap-2">
                           <AlertCircle size={16} /> Unit Reservation
                         </h4>
                         <label className={`flex items-center gap-2 ${editUnit?.activeLease ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                            <span className="text-xs font-bold text-slate-500 uppercase">
                              {editUnit?.activeLease ? 'Unit Occupied (Locked)' : 'Reserve Unit'}
                            </span>
                            <div className="relative">
                               <input 
                                  type="checkbox" 
                                  className="sr-only" 
                                  disabled={!!editUnit?.activeLease}
                                  checked={formData.reserved_flag}
                                  onChange={() => setFormData(p => ({ ...p, reserved_flag: !p.reserved_flag }))}
                               />
                               <div className={`w-8 h-5 rounded-full transition-colors ${formData.reserved_flag ? 'bg-blue-600' : 'bg-slate-200'}`}></div>
                               <div className={`absolute left-0.5 top-0.5 bg-white w-4 h-4 rounded-full transition-transform ${formData.reserved_flag ? 'translate-x-3' : ''}`}></div>
                            </div>
                         </label>
                      </div>

                      {editUnit?.activeLease && (
                        <p className="text-[10px] text-amber-600 font-bold bg-amber-50 p-2 rounded-lg border border-amber-100 flex items-center gap-2 mb-2">
                           <AlertCircle size={14} /> Unit is leased to {editUnit.activeLease.tenantName}. Reservation is disabled.
                        </p>
                      )}

                      {formData.reserved_flag && (
                        <div className="space-y-4 p-4 bg-blue-50/30 rounded-2xl border border-blue-100 animate-in fade-in slide-in-from-top-2">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="col-span-full">
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Reserved Prospect (Quick Entry)</label>
                              <div className="grid grid-cols-2 gap-3 mb-3">
                                <input 
                                  name="reserve_firstName"
                                  value={formData.reserve_firstName}
                                  onChange={handleInputChange}
                                  placeholder="First Name"
                                  className="w-full p-2.5 rounded-xl border border-slate-200 text-sm focus:border-indigo-500 outline-none bg-white"
                                />
                                <input 
                                  name="reserve_lastName"
                                  value={formData.reserve_lastName}
                                  onChange={handleInputChange}
                                  placeholder="Last Name"
                                  className="w-full p-2.5 rounded-xl border border-slate-200 text-sm focus:border-indigo-500 outline-none bg-white"
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <input 
                                  name="reserve_email"
                                  value={formData.reserve_email}
                                  onChange={handleInputChange}
                                  placeholder="Email Address"
                                  className="w-full p-2.5 rounded-xl border border-slate-200 text-sm focus:border-indigo-500 outline-none bg-white"
                                />
                                <div className="relative">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">+1</span>
                                  <input 
                                    name="reserve_phone"
                                    value={formData.reserve_phone}
                                    onChange={handleInputChange}
                                    placeholder="Phone"
                                    className="w-full pl-8 p-2.5 rounded-xl border border-slate-200 text-sm focus:border-indigo-500 outline-none bg-white"
                                  />
                                </div>
                              </div>
                            </div>
                            <div>
                               <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Tentative Move-In</label>
                               <input 
                                  type="date"
                                  name="tentative_move_in_date"
                                  value={formData.tentative_move_in_date}
                                  onChange={handleInputChange}
                                  className="w-full p-3 rounded-xl border border-slate-200 text-sm focus:border-indigo-500 outline-none"
                               />
                            </div>
                          </div>
                          <p className="text-[10px] text-blue-500 font-bold bg-blue-50 p-2 rounded-lg border border-blue-100">
                             ⚠️ HARD LOCK ENABLED: This unit will be blocked from other lease assignments until the reservation is cleared.
                          </p>
                        </div>
                      )}
                    </div>
                  </form>
                </div>

                {/* Modal Footer */}
                <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 flex-shrink-0 bg-slate-50 rounded-b-2xl">
                  <Button type="button" variant="secondary" onClick={closeModal} disabled={submitting}>
                    Cancel
                  </Button>
                  <Button type="submit" form="unitForm" variant="primary" disabled={submitting}>
                    {submitting ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        {editUnit ? 'Updating...' : 'Saving...'}
                      </>
                    ) : (
                      editUnit ? 'Update Unit' : 'Save Unit'
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )
        }

        {/* VIEW UNIT MODAL */}
        {
          viewUnit && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
              <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] flex flex-col">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 flex-shrink-0">
                  <h3 className="text-lg font-bold text-slate-900">Unit Details</h3>
                  <button
                    onClick={() => setViewUnit(null)}
                    className="text-slate-400 hover:text-slate-600 transition-colors p-1 hover:bg-slate-100 rounded-lg"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="overflow-y-auto flex-1 p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Unit Identifier</p>
                      <p className="text-sm font-medium text-slate-900">{viewUnit.unitNumber}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Unit Type</p>
                      <p className="text-sm font-medium text-slate-900">{viewUnit.unitType || '-'}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Building Name</p>
                      <p className="text-sm font-bold text-indigo-600">{viewUnit.building || viewUnit.civicNumber}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Floor</p>
                      <p className="text-sm font-medium text-slate-900">{viewUnit.floor || '-'}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Bedrooms</p>
                      <p className="text-sm font-medium text-slate-900">{viewUnit.bedrooms || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Status</p>
                      <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${viewUnit.status === 'Occupied' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                        {viewUnit.status}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-200 flex-shrink-0 bg-slate-50 rounded-b-2xl">
                  <Button variant="secondary" onClick={() => setViewUnit(null)}>
                    Close
                  </Button>
                  <Button variant="primary" onClick={() => { setViewUnit(null); openEditModal(viewUnit); }}>
                    <Edit2 size={16} />
                    Edit
                  </Button>
                </div>
              </div>
            </div>
          )
        }

        {/* DELETE CONFIRMATION MODAL */}
        {
          deleteConfirm && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
              <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6">
                <div className="text-center">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Trash2 size={24} className="text-red-600" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">Delete Unit</h3>
                  <p className="text-slate-500 text-sm mb-6">
                    Are you sure you want to delete unit <strong>{deleteConfirm.unitNumber}</strong>? This action cannot be undone.
                  </p>
                  <div className="flex gap-3 justify-center">
                    <Button variant="secondary" onClick={() => setDeleteConfirm(null)} disabled={submitting}>
                      Cancel
                    </Button>
                    <button
                      onClick={() => handleDelete(deleteConfirm)}
                      disabled={submitting}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      {submitting ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        'Delete'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )
        }


        {showTypesModal && (
          <ManageTypesModal
            types={unitTypes}
            onClose={() => setShowTypesModal(false)}
            onRefresh={fetchUnitTypes}
          />
        )}
      </div >
      {/* QUICK ADD TENANT MODAL (PHASE 2) */}
      {showQuickAddTenant && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[10000] animate-in fade-in duration-300">
          <div className="bg-white rounded-[32px] w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-400 max-h-[90vh] overflow-hidden flex flex-col mx-4">
            {/* MODAL HEADER */}
            <div className="px-10 py-8 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
              <div>
                <h3 className="text-2xl font-black text-slate-800 tracking-tight">
                  {quickAddFormStep === 1 ? 'Select Tenant Type' : 
                   quickAddTenantType === 'Individual' ? 'Individual Tenant' : 
                   quickAddTenantType === 'Company' ? 'Company Tenant' : 'Resident Participant'}
                </h3>
                <p className="text-slate-500 font-medium text-sm mt-1">
                  {quickAddFormStep === 1 ? 'Step 1 of 2: Classification' : 'Step 2 of 2: Information'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowQuickAddTenant(false)}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-all duration-300"
              >
                <Plus className="rotate-45" size={24} />
              </button>
            </div>

            {/* MODAL CONTENT */}
            <div className="flex-1 overflow-y-auto px-10 py-8 custom-scrollbar">
              {quickAddFormStep === 1 ? (
                /* STEP 1: TYPE SELECTION */
                <div className="grid grid-cols-1 gap-4">
                  <button
                    type="button"
                    onClick={() => { setQuickAddTenantType('Individual'); setQuickAddFormStep(2); }}
                    className="group p-6 rounded-2xl border-2 border-slate-100 hover:border-indigo-500 hover:bg-indigo-50/30 text-left transition-all duration-300 flex items-center gap-6"
                  >
                    <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
                      <User size={32} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-lg">Individual Tenant</h4>
                      <p className="text-slate-500 text-sm font-medium mt-1">Single legal leaseholder.</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setQuickAddTenantType('Company'); setQuickAddFormStep(2); }}
                    className="group p-6 rounded-2xl border-2 border-slate-100 hover:border-purple-500 hover:bg-purple-50/30 text-left transition-all duration-300 flex items-center gap-6"
                  >
                    <div className="w-16 h-16 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
                      <Shield size={32} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-lg">Company Tenant</h4>
                      <p className="text-slate-500 text-sm font-medium mt-1">Corporate leaseholder / Business Entity.</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setQuickAddTenantType('Resident'); setQuickAddFormStep(2); }}
                    className="group p-6 rounded-2xl border-2 border-slate-100 hover:border-amber-500 hover:bg-amber-50/30 text-left transition-all duration-300 flex items-center gap-6"
                  >
                    <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
                      <User size={32} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-lg">Resident (Occupant Only)</h4>
                      <p className="text-slate-500 text-sm font-medium mt-1">Non-billable occupant linked to a primary tenant.</p>
                    </div>
                  </button>
                </div>
              ) : (
                /* STEP 2: FORM FIELDS */
                <form id="quickAddTenantForm" className="space-y-8" onSubmit={async (e) => {
                  e.preventDefault();
                  setIsSavingQuickAdd(true);
                  setQuickAddErrors({});
                  
                  const fData = new FormData(e.target);
                  const getVal = (n) => fData.get(n) || '';

                  // Phone Formatting
                  const rawPhone = getVal('phone');
                  let cleanPhone = rawPhone.replace(/[\s-()]/g, '');
                  if (cleanPhone.length === 10 && /^\d+$/.test(cleanPhone)) cleanPhone = '+1' + cleanPhone;
                  else if (cleanPhone.length === 11 && cleanPhone.startsWith('1')) cleanPhone = '+' + cleanPhone;

                  const payload = {
                    firstName: getVal('firstName'),
                    lastName: getVal('lastName'),
                    type: quickAddTenantType,
                    email: getVal('email'),
                    phone: cleanPhone,
                    companyName: quickAddTenantType === 'Company' ? getVal('companyName') : null,
                    parentId: quickAddTenantType === 'Resident' ? selectedParentId : null,
                    // Auto-link to THIS property if available
                    propertyId: formData.propertyId || null
                  };

                  try {
                    const res = await api.post('/api/admin/tenants', payload);
                    const newTenant = res.data?.data || res.data;
                    
                    // Show success
                    alert(`${quickAddTenantType} created successfully!`);
                    
                    // 1. Update tenants list so it appears in dropdown
                    const updatedTenants = await api.get('/api/admin/tenants?limit=1000');
                    const allTenants = updatedTenants.data?.data || updatedTenants.data || [];
                    setTenants(allTenants);
                    
                    // 2. Auto-Select this new tenant in the Unit Form
                    setFormData(prev => ({ 
                      ...prev, 
                      reserved_by_id: (newTenant.id || newTenant).toString() 
                    }));
                    
                    // 3. Close modal
                    setShowQuickAddTenant(false);
                  } catch (error) {
                    console.error("Quick Add Failed:", error);
                    const sErrors = error.response?.data?.errors;
                    if (sErrors) setQuickAddErrors(sErrors);
                    else alert(error.response?.data?.message || "Failed to create tenant");
                  } finally {
                    setIsSavingQuickAdd(false);
                  }
                }}>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-2">
                        <label className="text-sm font-semibold text-slate-700 ml-1">First Name</label>
                        <input name="firstName" required className="px-5 py-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 outline-none focus:bg-white focus:border-indigo-500 transition-all" placeholder="John" />
                        {quickAddErrors.firstName && <p className="text-red-500 text-xs ml-1">{quickAddErrors.firstName}</p>}
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-sm font-semibold text-slate-700 ml-1">Last Name</label>
                        <input name="lastName" required className="px-5 py-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 outline-none focus:bg-white focus:border-indigo-500 transition-all" placeholder="Doe" />
                        {quickAddErrors.lastName && <p className="text-red-500 text-xs ml-1">{quickAddErrors.lastName}</p>}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-2">
                        <label className="text-sm font-semibold text-slate-700 ml-1">Email Address</label>
                        <input name="email" type="email" required={quickAddTenantType !== 'Resident'} className="px-5 py-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 outline-none focus:bg-white focus:border-indigo-500 transition-all" placeholder="email@example.com" />
                         {quickAddErrors.email && <p className="text-red-500 text-xs ml-1">{quickAddErrors.email}</p>}
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-sm font-semibold text-slate-700 ml-1">Mobile Number</label>
                        <div className="relative">
                           <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">+1</span>
                           <input name="phone" required className="pl-10 pr-5 py-3.5 w-full rounded-2xl border border-slate-200 bg-slate-50/50 outline-none focus:bg-white focus:border-indigo-500 transition-all" placeholder="514-123-4567" />
                        </div>
                        {quickAddErrors.phone && <p className="text-red-500 text-xs ml-1">{quickAddErrors.phone}</p>}
                      </div>
                    </div>

                    {quickAddTenantType === 'Company' && (
                      <div className="flex flex-col gap-2 p-6 bg-purple-50 rounded-2xl border border-purple-100">
                        <label className="text-sm font-bold text-purple-700">Company Legal Name</label>
                        <input name="companyName" required className="px-4 py-3 rounded-xl border border-purple-200 bg-white" placeholder="Corp / LLC" />
                         {quickAddErrors.companyName && <p className="text-red-500 text-xs ml-1">{quickAddErrors.companyName}</p>}
                      </div>
                    )}

                    {quickAddTenantType === 'Resident' && (
                      <div className="flex flex-col gap-2 p-6 bg-amber-50 rounded-2xl border border-amber-100">
                        <label className="text-sm font-bold text-amber-700">Responsible Tenant</label>
                        <select 
                          value={selectedParentId} 
                          onChange={(e) => setSelectedParentId(e.target.value)}
                          required 
                          className="px-4 py-3 rounded-xl border border-amber-200 bg-white"
                        >
                          <option value="">Select Primary Tenant...</option>
                          {billableTenants.map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                          ))}
                        </select>
                         {quickAddErrors.parentId && <p className="text-red-500 text-xs ml-1">{quickAddErrors.parentId}</p>}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center bg-slate-50 -mx-10 -mb-8 px-10 py-6 border-t border-slate-200 shrink-0">
                    <Button type="button" variant="secondary" onClick={() => setQuickAddFormStep(1)}>Back</Button>
                    <div className="flex gap-3">
                      <Button type="button" variant="secondary" onClick={() => setShowQuickAddTenant(false)}>Cancel</Button>
                      <Button type="submit" isLoading={isSavingQuickAdd}>Create & Select</Button>
                    </div>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </MainLayout >
  );
};

/* MANAGE TYPES MODAL COMPONENT */
const ManageTypesModal = ({ types, onClose, onRefresh }) => {
  const [newType, setNewType] = useState({ typeName: '', fullUnitRate: '', singleBedroomRate: '' });
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newType.typeName.trim()) return;

    setLoading(true);
    try {
      const payload = {
        typeName: newType.typeName.trim(),
        fullUnitRate: parseFloat(newType.fullUnitRate) || 0,
        singleBedroomRate: parseFloat(newType.singleBedroomRate) || 0
      };

      if (editingId) {
        await api.put(`/api/admin/unit-types/${editingId}`, payload);
      } else {
        await api.post('/api/admin/unit-types', payload);
      }

      await onRefresh();
      setNewType({ typeName: '', fullUnitRate: '', singleBedroomRate: '' });
      setEditingId(null);
    } catch (error) {
      alert(error.response?.data?.message || 'Error saving type');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this unit type?')) return;

    setLoading(true);
    try {
      await api.delete(`/api/admin/unit-types/${id}`);
      await onRefresh();
      if (editingId === id) {
        setNewType({ typeName: '', fullUnitRate: '', singleBedroomRate: '' });
        setEditingId(null);
      }
    } catch (error) {
      alert('Error deleting type');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (type) => {
    setNewType({
      typeName: type.typeName,
      fullUnitRate: type.fullUnitRate || '',
      singleBedroomRate: type.singleBedroomRate || ''
    });
    setEditingId(type.id);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <Settings size={20} className="text-indigo-600" />
            <h3 className="text-lg font-bold text-slate-800">Manage Unit Type Rates</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          <form onSubmit={handleAdd} className="flex flex-col gap-3 mb-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                {editingId ? '✏️ Edit Preset' : '➕ Add New Preset'}
              </span>
              {editingId && (
                <button 
                  type="button" 
                  onClick={() => { setEditingId(null); setNewType({ typeName: '', fullUnitRate: '', singleBedroomRate: '' }); }}
                  className="text-xs text-rose-500 hover:underline"
                >Cancel</button>
              )}
            </div>
            <input
              value={newType.typeName}
              onChange={(e) => setNewType({ ...newType, typeName: e.target.value })}
              placeholder="Type Name (e.g. Makenzie)"
              className="px-4 py-2 rounded-lg border border-slate-200 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 text-sm font-bold"
              autoFocus
            />
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Full Unit $</label>
                <input
                  type="number"
                  placeholder="0"
                  value={newType.fullUnitRate}
                  onChange={(e) => setNewType({ ...newType, fullUnitRate: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="flex-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Single Bed $</label>
                <input
                  type="number"
                  placeholder="0"
                  value={newType.singleBedroomRate}
                  onChange={(e) => setNewType({ ...newType, singleBedroomRate: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
            <Button variant="primary" disabled={loading || !newType.typeName.trim()} className="mt-1 shadow-sm">
              {editingId ? 'Update Preset Rule' : 'Add Preset Rates'}
            </Button>
          </form>

          <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
            {types.length === 0 ? (
              <p className="text-center text-slate-400 py-4 text-xs">No unit types found.</p>
            ) : (
              types.map((type) => (
                <div key={type.id} className={`flex justify-between items-center bg-white p-3 rounded-xl border ${editingId === type.id ? 'border-indigo-500 bg-indigo-50/20' : 'border-slate-100'} hover:shadow-md hover:border-indigo-100 transition-all`}>
                  <div>
                    <p className="font-bold text-slate-800 text-sm">{type.typeName}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Full: <span className="font-bold text-slate-700">${parseFloat(type.fullUnitRate || 0).toLocaleString()}</span> | 
                      Bed: <span className="font-bold text-slate-700">${parseFloat(type.singleBedroomRate || 0).toLocaleString()}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleEdit(type)}
                      disabled={loading}
                      className="p-1.5 rounded-lg hover:bg-slate-50 text-slate-400 hover:text-indigo-600 transition-colors"
                      title="Edit Type"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(type.id)}
                      disabled={loading}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                      title="Delete Type"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
