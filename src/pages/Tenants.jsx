import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MainLayout } from '../layouts/MainLayout';
import { Button } from '../components/Button';
import { Plus, Search, User, Eye, Trash2, FileText, Shield, Download, Upload, ArrowLeft, Calendar, FileCheck, AlertCircle, Pencil, Mail, Smartphone, Send, CheckCircle, Building2 } from 'lucide-react';
import clsx from 'clsx';
import api from '../api/client';
import { AccessControl } from '../components/AccessControl';

const initialTenants = [];

export const Tenants = () => {
  const [__forceUpdate, __setForceUpdate] = useState(0);
  useEffect(() => {
    const handleUpdate = () => __setForceUpdate(p => p + 1);
    window.addEventListener('permissionsUpdated', handleUpdate);
    return () => window.removeEventListener('permissionsUpdated', handleUpdate);
  }, []);

  const { id } = useParams();
  const navigate = useNavigate();
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingTenant, setEditingTenant] = useState(null);
  const [viewingTenant, setViewingTenant] = useState(null);
  const [errorNotFound, setErrorNotFound] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [invitingTenant, setInvitingTenant] = useState(null);
  const [inviteMethods, setInviteMethods] = useState({ email: true, sms: true });
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [tenantBuildingFilter, setTenantBuildingFilter] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 0 });

  // Lists for Dropdowns
  const [properties, setProperties] = useState([]);
  const [allUnits, setAllUnits] = useState([]); // All units fetched
  const [availableUnits, setAvailableUnits] = useState([]); // Filtered by selected property
  const [allBedrooms, setAllBedrooms] = useState([]); // All vacant bedrooms
  const [availableBedrooms, setAvailableBedrooms] = useState([]); // Filtered by selected property

  // For Modal Form State
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [tenantType, setTenantType] = useState('Individual');
  const [residents, setResidents] = useState([]);
  const [companyContacts, setCompanyContacts] = useState([{ name: '', email: '', phone: '', role: '' }]);
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [selectedBedroomId, setSelectedBedroomId] = useState('');
  const [isBedroomWise, setIsBedroomWise] = useState(false);
  const [formStep, setFormStep] = useState(1); // 1: Type Selection, 2: Details
  const [billableTenants, setBillableTenants] = useState([]);
  const [selectedParentId, setSelectedParentId] = useState('');

  useEffect(() => {
    // Reset page to 1 when filters change
    setPagination(prev => ({ ...prev, page: 1 }));
  }, [search, tenantBuildingFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTenants(pagination.page);
    }, 400); // Debounce search/filter
    return () => clearTimeout(timer);
  }, [pagination.page, search, tenantBuildingFilter]);

  const fetchTenants = async (page = 1) => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
        search: search || '',
        propertyId: tenantBuildingFilter || ''
      });
      const res = await api.get(`/api/admin/tenants?${params.toString()}`);
      
      if (res.data?.data) {
        setTenants(res.data.data);
        if (res.data.meta) {
          setPagination(prev => ({
            ...prev,
            total: res.data.meta.total,
            totalPages: res.data.meta.totalPages,
            page: res.data.meta.page
          }));
        }
      } else {
        const dataArr = res.data || [];
        const currentLimit = pagination.limit || 25;
        const totalItems = dataArr.length;
        const totalPages = Math.ceil(totalItems / currentLimit) || 1;
        const currentPage = parseInt(page) || 1;
        
        // Manual slice for non-paginated backend fallback
        const startIndex = (currentPage - 1) * currentLimit;
        const slicedData = dataArr.slice(startIndex, startIndex + currentLimit);
        
        setTenants(slicedData);
        setPagination({
          page: currentPage,
          limit: currentLimit,
          total: totalItems,
          totalPages: totalPages
        });
      }
    } catch (e) {
      console.error("Failed to fetch tenants", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchDropdownData = async () => {
    try {
      const propsRes = await api.get('/api/admin/properties');
      const propsData = propsRes.data?.data || propsRes.data || [];
      setProperties(propsData);

      // Fetch all billable tenants for the "Responsible Party" dropdown
      const tenantsRes = await api.get('/api/admin/tenants?limit=1000');
      const allTenants = tenantsRes.data?.data || tenantsRes.data || [];
      const billable = allTenants.filter(t => t.type !== 'RESIDENT' && t.type !== 'Resident');
      setBillableTenants(billable);

      // Fetch all units for dropdowns
      const unitsRes = await api.get('/api/admin/units?limit=1000&showInactive=true');
      setAllUnits(unitsRes.data?.data || unitsRes.data || []);
    } catch (e) {
      console.error("Failed to fetch dropdown data", e);
      setProperties([]);
      setBillableTenants([]);
      setAllUnits([]);
    }
  };

  useEffect(() => {
    fetchDropdownData();
  }, []);
  // Fetch units when building selection changes
  useEffect(() => {
    const fetchUnitsForBuilding = async () => {
      if (selectedPropertyId) {
        try {
          const res = await api.get(`/api/admin/units?building_id=${selectedPropertyId}&limit=1000`);
          const allUnits = res.data?.data || res.data || [];

          // Filter units:
          // 1. If Individual/Company tenant: only show Vacant
          // 2. If Resident: show units with Active company leases + Vacant
          const units = allUnits.filter(u => {
            if (tenantType === 'Resident' || tenantType === 'RESIDENT') {
              return u.status !== 'Fully Booked' || u.activeLeaseCount > 0;
            }
            return u.status !== 'Fully Booked';
          });

          setAvailableUnits(units);

          // Edit Tenant Consistency: If editing, ensure the unit stays selected if found in result
          if (editingTenant && editingTenant.unitId) {
            const found = units.find(u => u.id === parseInt(editingTenant.unitId));
            if (found) {
              setSelectedUnitId(editingTenant.unitId.toString());
            }
          }
        } catch (e) {
          console.error("Failed to fetch units", e);
          setAvailableUnits([]);
        }
      } else {
        setAvailableUnits([]);
      }
    };
    fetchUnitsForBuilding();
  }, [selectedPropertyId, editingTenant]);

  // Handle building change: reset unit and bedroom
  const handleBuildingChange = (val) => {
    setSelectedPropertyId(val);
    setSelectedUnitId('');
    setSelectedBedroomId('');
  };

  // Handle unit selection to check if it's bedroom-wise
  useEffect(() => {
    if (selectedUnitId) {
      const unit = availableUnits.find(u => u.id === parseInt(selectedUnitId));
      setIsBedroomWise(unit?.rentalMode === 'BEDROOM_WISE');
    } else {
      setIsBedroomWise(false);
    }
  }, [selectedUnitId, availableUnits]);

  // Note: For existing bedroom logic, we'll keep the load-all approach for now 
  // unless explicitly told to change it, as it works with the filter below.
  // But we'll add a fetch for bedrooms if needed.
  useEffect(() => {
    const fetchBedrooms = async () => {
      if (selectedUnitId && (isBedroomWise || tenantType === 'Resident')) {
        try {
          // If editing, tell the backend to include the current bedroom even if it's "taken" by this user
          const includeId = editingTenant?.bedroomId ? `&includeId=${editingTenant.bedroomId}` : '';
          const res = await api.get(`/api/admin/units/bedrooms/vacant?unitId=${selectedUnitId}${includeId}`);
          setAvailableBedrooms(res.data || []);
        } catch (e) {
          console.error("Failed to fetch bedrooms", e);
        }
      } else {
        setAvailableBedrooms([]);
      }
    };
    fetchBedrooms();
  }, [selectedUnitId, isBedroomWise, tenantType, editingTenant]);

  /* 🔗 HANDLE URL PARAMS */
  useEffect(() => {
    if (id) {
      const tenantId = parseInt(id);
      const found = tenants.find(t => t.id === tenantId);
      if (found) {
        setViewingTenant(found);
        setErrorNotFound(false);
      } else {
        setViewingTenant(null);
        setErrorNotFound(true);
      }
    } else {
      setViewingTenant(null);
      setErrorNotFound(false);
    }
  }, [id, tenants]);



  /* 🔒 LOCK BACKGROUND SCROLL */
  useEffect(() => {
    if (showModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [showModal]);



  /* ➕ ADD/EDIT TENANT */
  const handleSaveTenant = async (e) => {
    e.preventDefault();
    console.log("handleSaveTenant called");
    const form = e.target;

    // Validate Phone Number (must be +1 followed by 10 digits) - E.164 format
    // Remove spaces, dashes, parentheses for the check
    const rawPhone = form.phone.value;
    let cleanPhone = rawPhone.replace(/[\s-()]/g, '');

    // Auto-format for Canadian/US numbers (10 digits -> +1, 11 digits starting with 1 -> +)
    if (cleanPhone.length === 10 && /^\d+$/.test(cleanPhone)) {
      cleanPhone = '+1' + cleanPhone;
    } else if (cleanPhone.length === 11 && cleanPhone.startsWith('1')) {
      cleanPhone = '+' + cleanPhone;
    }

    // Strict E.164 format check: +1XXXXXXXXXX
    const phoneRegex = /^\+1\d{10}$/;

    if (!phoneRegex.test(cleanPhone)) {
      alert("Invalid Phone Number.\n\nPlease enter a valid Canadian/US number.\nExample: 514-321-6767 or +15143216767");
      return;
    }

    const formData = new FormData(form);
    const getVal = (name) => formData.get(name) || '';

    const payload = {
      firstName: getVal('firstName'),
      lastName: getVal('lastName'),
      type: tenantType,
      email: getVal('email'),
      phone: cleanPhone,
      parentId: tenantType === 'Resident' ? selectedParentId : null,
      propertyId: selectedPropertyId || null,
      unitId: selectedUnitId || null,
      bedroomId: selectedBedroomId || null,
      companyName: (tenantType === 'Company' || tenantType === 'COMPANY') ? getVal('companyName') : null,
      companyDetails: (tenantType === 'Company' || tenantType === 'COMPANY') ? getVal('street2') : null,
      // Address saved for ALL tenant types (not just Company)
      street: getVal('street'),
      city: getVal('city'),
      state: getVal('state'),
      postalCode: getVal('postalCode'),
      country: getVal('country'),
      companyContacts: tenantType === 'Company' ? companyContacts : [],
      residents: residents
    };

    setSaving(true);
    setErrors({}); // Clear previous errors

    try {
      let res;
      if (editingTenant) {
        res = await api.put(`/api/admin/tenants/${editingTenant.id}`, payload);
      } else {
        res = await api.post('/api/admin/tenants', payload);
      }

      // Check SMS Status if response contains it
      if (res.data?.smsResult) {
        if (res.data.smsResult.skipped) {
          alert(tenantType === 'Resident' ? 'Resident added successfully!' : 'Tenant added successfully!');
        } else if (res.data.smsResult.success) {
          alert("Tenant added successfully! \nSMS Credentials sent.");
        } else {
          alert(`Tenant added, BUT SMS Failed. \nError: ${res.data.smsResult.error || "Unknown Error"}`);
        }
      } else if (!editingTenant) {
        // Fallback if no smsResult but valid tenant creation
        alert(tenantType === 'Resident' ? 'Resident added successfully!' : 'Tenant added successfully!');
      }

      await fetchTenants();
      await fetchDropdownData();
      setShowModal(false);
      setEditingTenant(null);
      resetForm();
    } catch (e) {
      console.error(e);
      const serverError = e.response?.data?.errors;
      const serverMessage = e.response?.data?.message;

      if (serverError && Object.keys(serverError).length > 0) {
        setErrors(serverError);
      } else {
        alert(serverMessage || (editingTenant ? 'Failed to update tenant' : 'Failed to create tenant'));
      }
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setSelectedPropertyId('');
    setSelectedUnitId('');
    setSelectedBedroomId('');
    setSelectedParentId('');
    setTenantType('Individual');
    setResidents([]);
    setCompanyContacts([{ name: '', email: '', phone: '', role: '' }]);
    setIsBedroomWise(false);
    setFormStep(1);
  };

  /* 🗑 DELETE TENANT */
  const deleteTenant = async (id) => {
    if (window.confirm('Are you sure you want to delete this tenant?')) {
      try {
        await api.delete(`/api/admin/tenants/${id}`);
        fetchTenants(pagination.page);
        fetchDropdownData();
      } catch (e) {
        alert('Failed to delete tenant');
      }
    }
  };

  const handleEditTenant = (tenant) => {
    setEditingTenant(tenant);
    if (tenant.propertyId) setSelectedPropertyId(tenant.propertyId.toString());
    if (tenant.unitId) setSelectedUnitId(tenant.unitId.toString());
    if (tenant.bedroomId) setSelectedBedroomId(tenant.bedroomId.toString());
    if (tenant.type) setTenantType(tenant.type === 'INDIVIDUAL' ? 'Individual' : tenant.type === 'COMPANY' ? 'Company' : tenant.type === 'RESIDENT' ? 'Resident' : tenant.type);
    if (tenant.parentId) setSelectedParentId(tenant.parentId.toString());
    setResidents(tenant.residents || []);
    setCompanyContacts(tenant.companyContacts?.length > 0 ? tenant.companyContacts : [{ name: '', email: '', phone: '', role: '' }]);
    setFormStep(2); // Skip Step 1 when editing
    setShowModal(true);
  };

  const handleSendInvite = (tenant) => {
    setInvitingTenant(tenant);
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

      const res = await api.post(`/api/admin/tenants/${invitingTenant.id}/send-invite`, { methods });

      let msg = 'Invitations processed successfully.';
      if (res.data.data?.results) {
        const { email, sms } = res.data.data.results;
        if (email.attempted) msg += `\nEmail: ${email.success ? 'Sent' : 'Failed (' + (email.error || 'Unknown error') + ')'}`;
        if (sms.attempted) msg += `\nSMS: ${sms.success ? 'Sent' : 'Failed (' + (sms.error || 'Unknown error') + ')'}`;
      }

      alert(msg);
      setShowInviteModal(false);
      setInvitingTenant(null);
      await fetchTenants();
    } catch (e) {
      console.error(e);
      alert(e.response?.data?.message || 'Failed to send invite');
    } finally {
      setIsSendingInvite(false);
    }
  };

  const handleViewDetails = (tenant) => {
    navigate(`/tenants/${tenant.id}`);
  };

  const handleBack = () => {
    navigate('/tenants');
  };

  if (errorNotFound) {
    return (
      <MainLayout title="Tenant Not Found">
        <div className="flex flex-col items-center justify-center p-20 bg-white rounded-3xl shadow-sm border border-slate-100 text-center space-y-6">
          <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center text-rose-500">
            <AlertCircle size={40} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Tenant Record Not Found</h2>
            <p className="text-slate-500 font-medium mt-2 max-w-sm">The tenant profile you are looking for might have been moved or deleted.</p>
          </div>
          <Button variant="secondary" onClick={handleBack} className="gap-2">
            <ArrowLeft size={18} />
            Back to Tenants
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <>
      {viewingTenant ? (
        <TenantDetail 
          tenant={viewingTenant} 
          onBack={handleBack} 
          onSendInvite={handleSendInvite} 
          onEdit={() => handleEditTenant(viewingTenant)}
          allUnits={allUnits}
        />
      ) : (
        <MainLayout title="Tenants">
          <div className="flex flex-col gap-6">

            {/* TOP BAR */}
            <section className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-xl shadow-[0_5px_15px_rgba(0,0,0,0.06)] gap-4">
              <div className="flex items-center gap-3 bg-slate-50 px-4 py-2.5 rounded-lg border border-slate-200 focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all w-full md:w-auto md:min-w-[320px]">
                <Search size={18} className="text-slate-400" />
                <input
                  type="text"
                  placeholder="Search tenants, email, building"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="bg-transparent border-none outline-none text-slate-700 placeholder:text-slate-400 w-full text-sm font-medium"
                />
              </div>

              <div className="flex items-center gap-2 bg-slate-50 py-2.5 px-3.5 rounded-lg border border-slate-200 w-full md:w-auto">
                <Building2 size={16} className="text-slate-400" />
                <select
                  value={tenantBuildingFilter}
                  onChange={(e) => setTenantBuildingFilter(e.target.value)}
                  className="bg-transparent border-none outline-none text-sm text-slate-700 font-medium cursor-pointer min-w-[150px]"
                >
                  <option value="">All Buildings</option>
                  {properties.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <AccessControl module="Tenant List" action="add">
                <Button variant="primary" onClick={() => { setEditingTenant(null); setShowModal(true); }}>
                  <Plus size={18} />
                  Add Tenant
                </Button>
              </AccessControl>
            </section>

            {/* TABLE */}
            <section className="bg-white rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.08)] overflow-hidden">
              {/* Desktop Table Header - Hidden on Mobile */}
              <div className="hidden md:grid grid-cols-[1.5fr_0.6fr_0.9fr_1.2fr_0.8fr_0.8fr] bg-slate-50 border-b border-slate-200 px-6 py-4">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tenant</span>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</span>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Company Name</span>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Property / Unit</span>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Lease Status</span>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Actions</span>
              </div>

              <div className="divide-y divide-slate-100">
                {tenants.map((tenant, index) => {
                  const hasInsuranceIssue = tenant.insurance?.some(policy => {
                    const end = new Date(policy.endDate);
                    const now = new Date();
                    const diffDays = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
                    return end < now || diffDays <= 30;
                  });

                  return (
                    <div key={tenant.id}>
                      {/* Desktop Table Row - Hidden on Mobile */}
                      <div
                        className="hidden md:grid grid-cols-[1.5fr_0.6fr_0.9fr_1.2fr_0.8fr_0.8fr] px-6 py-4 items-center hover:bg-slate-50/80 transition-all duration-200"
                        style={{ animationDelay: `${index * 0.05}s` }}
                      >
                        <span className="flex items-center gap-3 font-medium text-slate-700 overflow-hidden">
                          <div className="min-w-[32px] w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                            <User size={16} />
                          </div>
                          <button
                            onClick={() => handleViewDetails(tenant)}
                            className="hover:text-indigo-600 hover:underline transition-all text-left truncate flex flex-col"
                          >
                            <span className="font-semibold">{tenant.firstName && tenant.lastName ? `${tenant.firstName} ${tenant.lastName}` : tenant.name}</span>
                          </button>
                          {hasInsuranceIssue && (
                            <div className="text-amber-500 min-w-[14px]" title="Insurance Expired or Expiring Soon">
                              <AlertCircle size={14} />
                            </div>
                          )}
                        </span>

                        <span className="w-fit">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${tenant.type === 'Company' || tenant.type === 'COMPANY'
                            ? 'bg-purple-50 text-purple-700 border-purple-100'
                            : tenant.type === 'Resident' || tenant.type === 'RESIDENT'
                              ? 'bg-amber-50 text-amber-700 border-amber-100'
                              : 'bg-blue-50 text-blue-700 border-blue-100'
                            }`}>
                            {tenant.type === 'COMPANY' || tenant.type === 'Company' ? 'Company' :
                              tenant.type === 'RESIDENT' || tenant.type === 'Resident' ? 'Resident' :
                                'Individual'}
                          </span>
                        </span>

                        <span className="text-sm text-slate-600 truncate">
                          {(tenant.type === 'COMPANY' || tenant.type === 'Company') ? (tenant.companyName || '-') : '-'}
                        </span>

                        <span className="text-sm text-slate-600">
                          <div className="font-medium text-slate-800">{tenant.property}</div>
                          <div className="text-xs text-slate-500 mt-0.5">{tenant.unit}</div>
                        </span>

                        <span className="w-fit">
                          <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${tenant.leaseStatus === 'Active'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                            : tenant.leaseStatus === 'DRAFT'
                              ? 'bg-amber-50 text-amber-700 border-amber-100'
                              : 'bg-red-50 text-red-700 border-red-100'
                            }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${tenant.leaseStatus === 'Active' ? 'bg-emerald-500' :
                              tenant.leaseStatus === 'DRAFT' ? 'bg-amber-500' : 'bg-red-500'
                              }`}></span>
                            {tenant.leaseStatus === 'DRAFT' ? 'Draft' : tenant.leaseStatus}
                          </span>
                        </span>

                        <span className="flex justify-center gap-1">
                          <button
                            onClick={() => handleViewDetails(tenant)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all duration-200"
                            title="View Details"
                          >
                            <Eye size={16} />
                          </button>
                          
                          <AccessControl module="Tenant List" action="edit">
                            <button
                              onClick={() => handleEditTenant(tenant)}
                              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200"
                              title="Edit Tenant"
                            >
                              <Pencil size={16} />
                            </button>
                          </AccessControl>

                          <AccessControl module="Tenant List" action="edit">
                            <button
                              onClick={() => handleSendInvite(tenant)}
                              className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-200 ${tenant.isInviteSent ? 'text-green-600 hover:bg-green-50' : 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'}`}
                              title={tenant.isInviteSent ? "Resend Invite" : "Send Invite"}
                            >
                              {tenant.isInviteSent ? <CheckCircle size={16} /> : <Send size={16} />}
                            </button>
                          </AccessControl>

                          <AccessControl module="Tenant List" action="delete">
                            <button
                              onClick={() => deleteTenant(tenant.id)}
                              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all duration-200"
                              title="Delete Tenant"
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
                            <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                              <User size={18} />
                            </div>
                            <div>
                              <button
                                onClick={() => handleViewDetails(tenant)}
                                className="font-semibold text-slate-800 hover:text-indigo-600 text-left"
                              >
                                {tenant.firstName && tenant.lastName ? `${tenant.firstName} ${tenant.lastName}` : tenant.name}
                              </button>
                              <div className="flex items-center gap-2 mt-1">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${tenant.type === 'Company' || tenant.type === 'COMPANY'
                                  ? 'bg-purple-50 text-purple-700 border-purple-100'
                                  : tenant.type === 'Resident' || tenant.type === 'RESIDENT'
                                    ? 'bg-amber-50 text-amber-700 border-amber-100'
                                    : 'bg-blue-50 text-blue-700 border-blue-100'
                                  }`}>
                                  {tenant.type === 'COMPANY' || tenant.type === 'Company' ? 'Company' :
                                    tenant.type === 'RESIDENT' || tenant.type === 'Resident' ? 'Resident' :
                                      'Individual'}
                                </span>
                                {hasInsuranceIssue && (
                                  <AlertCircle size={12} className="text-amber-500" title="Insurance Issue" />
                                )}
                              </div>
                            </div>
                          </div>
                          <span className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold border ${tenant.leaseStatus === 'Active'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                            : tenant.leaseStatus === 'DRAFT'
                              ? 'bg-amber-50 text-amber-700 border-amber-100'
                              : 'bg-red-50 text-red-700 border-red-100'
                            }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${tenant.leaseStatus === 'Active' ? 'bg-emerald-500' :
                              tenant.leaseStatus === 'DRAFT' ? 'bg-amber-500' : 'bg-red-500'
                              }`}></span>
                            {tenant.leaseStatus === 'DRAFT' ? 'Draft' : tenant.leaseStatus}
                          </span>
                        </div>

                        <div className="space-y-1.5 mb-3 text-xs">
                          {(tenant.type === 'COMPANY' || tenant.type === 'Company') && tenant.companyName && (
                            <div className="flex items-center gap-2">
                              <Building2 size={12} className="text-slate-400" />
                              <span className="text-slate-600 font-medium">{tenant.companyName}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <Building2 size={12} className="text-slate-400" />
                            <span className="text-slate-600">
                              <span className="font-medium">{tenant.property}</span> • {tenant.unit}
                            </span>
                          </div>
                        </div>

                        <div className="flex gap-2 pt-3 border-t border-slate-100">
                          <button
                            onClick={() => handleViewDetails(tenant)}
                            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-all text-xs font-semibold"
                          >
                            <Eye size={14} />
                            View
                          </button>
                          
                          <AccessControl module="Tenant List" action="edit">
                            <button
                              onClick={() => handleEditTenant(tenant)}
                              className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-blue-600 bg-blue-50 hover:bg-blue-100 transition-all text-xs font-semibold"
                            >
                              <Pencil size={14} />
                              Edit
                            </button>
                          </AccessControl>

                          <AccessControl module="Tenant List" action="edit">
                            <button
                              onClick={() => handleSendInvite(tenant)}
                              className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg transition-all text-xs font-semibold ${tenant.isInviteSent ? 'text-green-600 bg-green-50 hover:bg-green-100' : 'text-amber-600 bg-amber-50 hover:bg-amber-100'}`}
                            >
                              {tenant.isInviteSent ? (
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

                          <AccessControl module="Tenant List" action="delete">
                            <button
                              onClick={() => deleteTenant(tenant.id)}
                              className="flex items-center justify-center px-3 py-2 rounded-lg text-red-600 bg-red-50 hover:bg-red-100 transition-all"
                            >
                              <Trash2 size={14} />
                            </button>
                          </AccessControl>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* PAGINATION FOOTER */}
              <div className="flex flex-col sm:flex-row justify-between items-center bg-slate-50 border-t border-slate-100 p-4 md:px-6 gap-4">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider order-2 sm:order-1">
                  Showing <span className="text-slate-800 font-bold">{(pagination.page - 1) * pagination.limit + 1}</span> to <span className="text-slate-800 font-bold">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> of <span className="text-slate-800 font-bold">{pagination.total}</span> tenants
                </div>

                {pagination.totalPages > 1 && (
                  <div className="flex items-center gap-2 order-1 sm:order-2">
                    <button
                      onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                      disabled={pagination.page === 1}
                      className="p-2 rounded-lg border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                      <ArrowLeft size={16} />
                    </button>

                    <div className="flex items-center gap-1">
                      {[...Array(pagination.totalPages)].map((_, i) => {
                        const pageNum = i + 1;
                        if (
                          pagination.totalPages <= 5 ||
                          pageNum === 1 ||
                          pageNum === pagination.totalPages ||
                          (pageNum >= pagination.page - 1 && pageNum <= pagination.page + 1)
                        ) {
                          return (
                            <button
                              key={pageNum}
                              onClick={() => setPagination(prev => ({ ...prev, page: pageNum }))}
                              className={`min-w-[32px] h-8 rounded-lg text-xs font-bold transition-all ${pagination.page === pageNum
                                ? 'bg-indigo-600 text-white shadow-md'
                                : 'text-slate-600 hover:bg-slate-50 hover:text-indigo-600 bg-white border border-slate-200'
                                }`}
                            >
                              {pageNum}
                            </button>
                          );
                        } else if (pageNum === pagination.page - 2 || pageNum === pagination.page + 2) {
                          return <span key={pageNum} className="text-slate-400 px-0.5 font-bold">...</span>;
                        }
                        return null;
                      })}
                    </div>

                    <button
                      onClick={() => setPagination(prev => ({ ...prev, page: Math.min(pagination.totalPages, prev.page + 1) }))}
                      disabled={pagination.page === pagination.totalPages}
                      className="p-2 rounded-lg border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                      <ArrowLeft size={16} className="rotate-180" />
                    </button>
                  </div>
                )}
              </div>
            </section>
          </div>
        </MainLayout>
      )}

      {/* ADD/EDIT TENANT MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 animate-in fade-in duration-300">
          <div className="bg-white rounded-[32px] w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-400 max-h-[90vh] overflow-hidden flex flex-col">
            {/* MODAL HEADER */}
            <div className="px-10 py-8 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
              <div>
                <h3 className="text-2xl font-black text-slate-800 tracking-tight">
                  {editingTenant ? 'Edit Profile' : formStep === 1 ? 'Select Tenant Type' :
                    tenantType === 'Individual' ? 'Individual Tenant Details' :
                      tenantType === 'Company' ? 'Company Tenant Details' :
                        tenantType === 'Resident' ? 'Resident Tenant Detail' :
                          'Tenant Details'}
                </h3>
                <p className="text-slate-500 font-medium text-sm mt-1">
                  {editingTenant ? `Updating ${editingTenant.name}` : formStep === 1 ? 'Step 1 of 2: Classification' : 'Step 2 of 2: Information'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => { setShowModal(false); setEditingTenant(null); resetForm(); }}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-all duration-300"
              >
                <Plus className="rotate-45" size={24} />
              </button>
            </div>

            {/* MODAL CONTENT */}
            <div className="flex-1 overflow-y-auto px-10 py-8 custom-scrollbar">
              {formStep === 1 && !editingTenant ? (
                /* STEP 1: TYPE SELECTION */
                <div className="grid grid-cols-1 gap-4">
                  <button
                    type="button"
                    onClick={() => { setTenantType('Individual'); setFormStep(2); }}
                    className="group p-6 rounded-2xl border-2 border-slate-100 hover:border-indigo-500 hover:bg-indigo-50/30 text-left transition-all duration-300 flex items-center gap-6"
                  >
                    <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
                      <User size={32} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-lg">Individual Tenant</h4>
                      <p className="text-slate-500 text-sm font-medium mt-1">Single legal leaseholder. Receives credentials via SMS.</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setTenantType('Company'); setFormStep(2); }}
                    className="group p-6 rounded-2xl border-2 border-slate-100 hover:border-purple-500 hover:bg-purple-50/30 text-left transition-all duration-300 flex items-center gap-6"
                  >
                    <div className="w-16 h-16 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
                      <Shield size={32} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-lg">Company Tenant</h4>
                      <p className="text-slate-500 text-sm font-medium mt-1">Corporate leaseholder with occupants. Billing via primary contact.</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setTenantType('Resident'); setFormStep(2); }}
                    className="group p-6 rounded-2xl border-2 border-slate-100 hover:border-amber-500 hover:bg-amber-50/30 text-left transition-all duration-300 flex items-center gap-6"
                  >
                    <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
                      <User size={32} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-lg">Resident (Occupant Only)</h4>
                      <p className="text-slate-500 text-sm font-medium mt-1">Physical occupant only. Non-billable. Linked to a billable tenant.</p>
                    </div>
                  </button>
                </div>
              ) : (
                /* STEP 2: FORM FIELDS */
                <form key={editingTenant?.id || 'new'} onSubmit={handleSaveTenant} className="space-y-8">
                  {/* Basic Info */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-indigo-600 mb-2">
                      <User size={18} />
                      <span className="text-xs font-black uppercase tracking-widest">Personal Identification</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-2">
                        <label className="text-sm font-semibold text-slate-700 ml-1">First Name</label>
                        <input
                          name="firstName"
                          placeholder="John"
                          defaultValue={editingTenant?.firstName || ''}
                          required
                          className={`px-5 py-3.5 rounded-2xl border ${errors.firstName ? 'border-red-500 bg-red-50' : 'border-slate-200 bg-slate-50/50'} outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium text-slate-800`}
                        />
                        {errors.firstName && <p className="text-red-500 text-xs mt-1 ml-1 font-medium">{errors.firstName}</p>}
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-sm font-semibold text-slate-700 ml-1">Last Name</label>
                        <input
                          name="lastName"
                          placeholder="Doe"
                          defaultValue={editingTenant?.lastName || ''}
                          required
                          className={`px-5 py-3.5 rounded-2xl border ${errors.lastName ? 'border-red-500 bg-red-50' : 'border-slate-200 bg-slate-50/50'} outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium text-slate-800`}
                        />
                        {errors.lastName && <p className="text-red-500 text-xs mt-1 ml-1 font-medium">{errors.lastName}</p>}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-2">
                        <label className="text-sm font-semibold text-slate-700 ml-1">Email Adddress</label>
                        <input
                          name="email"
                          type="email"
                          placeholder="john@example.com"
                          defaultValue={editingTenant?.email || ''}
                          required={tenantType !== 'Resident'}
                          className={`px-5 py-3.5 rounded-2xl border ${errors.email ? 'border-red-500 bg-red-50' : 'border-slate-200 bg-slate-50/50'} outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium text-slate-800`}
                        />
                        {errors.email && <p className="text-red-500 text-xs mt-1 ml-1 font-medium">{errors.email}</p>}
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-sm font-semibold text-slate-700 ml-1">Mobile Number</label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium select-none pointer-events-none">+1</span>
                          <input
                            name="phone"
                            type="tel"
                            placeholder="(555) 123-4567"
                            defaultValue={editingTenant?.phone?.replace(/^\+1|^\+/, '').trim() || ''}
                            required
                            className={`pl-10 pr-5 py-3.5 w-full rounded-2xl border ${errors.phone ? 'border-red-500 bg-red-50' : 'border-slate-200 bg-slate-50/50'} outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium text-slate-800`}
                          />
                        </div>
                        {errors.phone && <p className="text-red-500 text-xs mt-1 ml-1 font-medium">{errors.phone}</p>}
                        <p className="text-[10px] text-slate-500 font-medium ml-1 italic">Canadian/US format supported (e.g. 514-123-4567)</p>
                      </div>
                    </div>
                  </div>

                  {/* Resident Linking */}
                  {tenantType === 'Resident' && (
                    <div className="p-6 bg-amber-50/50 rounded-[24px] border border-amber-100 space-y-5">
                      <div className="flex items-center gap-2 text-amber-600 mb-2">
                        <AlertCircle size={18} />
                        <span className="text-xs font-black uppercase tracking-widest">Resident / Occupant Assignment</span>
                      </div>

                      {/* Responsible Tenant Selection */}
                      <div className="flex flex-col gap-2">
                        <label className="text-sm font-semibold text-slate-700 ml-1">Responsible Tenant (Billable)</label>
                        <select
                          value={selectedParentId}
                          onChange={(e) => setSelectedParentId(e.target.value)}
                          required={tenantType === 'Resident' || tenantType === 'RESIDENT'}
                          className={`px-5 py-3.5 rounded-2xl border ${errors.parentId ? 'border-red-500 bg-red-50' : 'border-slate-200 bg-white'} outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all font-medium text-slate-800 appearance-none`}
                        >
                          <option value="">Choose a billable tenant...</option>
                          {billableTenants.map(t => (
                            <option key={t.id} value={t.id}>{t.name} ({t.type === 'COMPANY' || t.type === 'Company' ? 'Company' : 'Individual'})</option>
                          ))}
                        </select>
                        {errors.parentId && <p className="text-red-500 text-xs mt-1 ml-1 font-medium">{errors.parentId}</p>}
                      </div>

                      <div className="h-px bg-amber-100 w-full" />

                      {/* Location Selection */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-2">
                          <label className="text-sm font-semibold text-slate-700 ml-1">Select Property / Building</label>
                          <select
                            value={selectedPropertyId}
                            onChange={(e) => handleBuildingChange(e.target.value)}
                            className="px-5 py-3.5 rounded-2xl border border-slate-200 bg-white outline-none focus:border-indigo-500 transition-all font-medium text-slate-800"
                          >
                            <option value="">Choose Property...</option>
                            {properties.map(p => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                        </div>

                        <div className="flex flex-col gap-2">
                          <label className="text-sm font-semibold text-slate-700 ml-1">Select Unit</label>
                          <select
                            value={selectedUnitId}
                            onChange={(e) => setSelectedUnitId(e.target.value)}
                            disabled={!selectedPropertyId}
                            className="px-5 py-3.5 rounded-2xl border border-slate-200 bg-white outline-none focus:border-indigo-500 transition-all font-medium text-slate-800 disabled:opacity-50 disabled:bg-slate-50"
                          >
                            <option value="">Select Unit...</option>
                            {availableUnits.map(u => (
                              <option key={u.id} value={u.id}>{u.unitNumber || u.name}</option>
                            ))}
                          </select>
                        </div>

                        {/* Bedroom Selection (Shows if unit is bedroom-wise OR for Residents to specify room) */}
                        {(isBedroomWise || tenantType === 'Resident') && selectedUnitId && (
                          <div className="flex flex-col gap-2 md:col-span-2">
                            <label className="text-sm font-semibold text-slate-700 ml-1">Select Assigned Bedroom</label>
                            <select
                              value={selectedBedroomId}
                              onChange={(e) => setSelectedBedroomId(e.target.value)}
                              className="px-5 py-3.5 rounded-2xl border border-slate-200 bg-white outline-none focus:border-indigo-500 transition-all font-medium text-slate-800"
                            >
                              <option value="">Select Bedroom (Optional)...</option>
                              {availableBedrooms.map(b => (
                                <option key={b.id} value={b.id}>{b.bedroomNumber || b.roomNumber}</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Company Details */}
                  {(tenantType === 'Company' || tenantType === 'COMPANY') && (
                    <div className="p-6 bg-purple-50/30 rounded-[24px] border border-purple-100 space-y-4">
                      <div className="flex items-center gap-2 text-purple-600 mb-2">
                        <Shield size={18} />
                        <span className="text-xs font-black uppercase tracking-widest">Company Information</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-2 col-span-2">
                          <label className="text-sm font-semibold text-slate-700 ml-1">Company legal Name</label>
                          <input
                            name="companyName"
                            placeholder="LLC / Inc / Corp"
                            defaultValue={editingTenant?.companyName || ''}
                            required
                            className={`px-5 py-3.5 rounded-2xl border ${errors.companyName ? 'border-red-500 bg-red-50' : 'border-slate-200 bg-white'} outline-none focus:border-purple-500 transition-all font-medium`}
                          />
                          {errors.companyName && <p className="text-red-500 text-xs mt-1 ml-1 font-medium">{errors.companyName}</p>}
                        </div>

                        <div className="flex flex-col gap-2 col-span-2">
                          <label className="text-sm font-semibold text-slate-700 ml-1">Street Address</label>
                          <input
                            name="street"
                            placeholder="123 Corporate Way"
                            defaultValue={editingTenant?.street || ''}
                            required
                            className="px-5 py-3.5 rounded-2xl border border-slate-200 bg-white outline-none focus:border-purple-500 transition-all font-medium"
                          />
                        </div>
                        <div className="flex flex-col gap-2 col-span-2">
                          <label className="text-sm font-semibold text-slate-700 ml-1">Address Line 2 (Optional)</label>
                          <input
                            name="street2"
                            placeholder="Building B, Suite 100"
                            defaultValue={editingTenant?.companyDetails || editingTenant?.street2 || ''}
                            className="px-5 py-3.5 rounded-2xl border border-slate-200 bg-white outline-none focus:border-purple-500 transition-all font-medium"
                          />
                        </div>
                        <div className="flex flex-col gap-2">
                          <label className="text-sm font-semibold text-slate-700 ml-1">City</label>
                          <input name="city" placeholder="Business City" defaultValue={editingTenant?.city || ''} required className="px-5 py-3.5 rounded-2xl border border-slate-200 bg-white transition-all font-medium" />
                        </div>
                        <div className="flex flex-col gap-2">
                          <label className="text-sm font-semibold text-slate-700 ml-1">State / Province</label>
                          <input name="state" placeholder="State" defaultValue={editingTenant?.state || ''} className="px-5 py-3.5 rounded-2xl border border-slate-200 bg-white transition-all font-medium" />
                        </div>
                        <div className="flex flex-col gap-2">
                          <label className="text-sm font-semibold text-slate-700 ml-1">Postal Code</label>
                          <input name="postalCode" placeholder="H4F 3G1" defaultValue={editingTenant?.postalCode || ''} required className="px-5 py-3.5 rounded-2xl border border-slate-200 bg-white transition-all font-medium" />
                        </div>
                        <div className="flex flex-col gap-2">
                          <label className="text-sm font-semibold text-slate-700 ml-1">Country</label>
                          <input name="country" placeholder="Canada" defaultValue={editingTenant?.country || ''} className="px-5 py-3.5 rounded-2xl border border-slate-200 bg-white transition-all font-medium" />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Footer Actions */}
                  <div className="flex justify-between items-center bg-slate-50 -mx-10 -mb-8 px-10 py-6 border-t border-slate-200 sticky bottom-0">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => editingTenant ? resetForm() : setFormStep(1)}
                    >
                      {editingTenant ? 'Reset' : 'Back to Selection'}
                    </Button>
                    <div className="flex gap-3">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => { setShowModal(false); setEditingTenant(null); resetForm(); }}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        isLoading={saving}
                      >
                        {editingTenant ? 'Save Changes' : 'Create Tenant'}
                      </Button>
                    </div>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* INVITE MODAL */}
      {showInviteModal && invitingTenant && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[60] animate-in fade-in duration-300">
          <div className="bg-white rounded-[32px] w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-400 overflow-hidden flex flex-col">
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white">
              <div>
                <h3 className="text-xl font-black text-slate-800 tracking-tight">Send Invite</h3>
                <p className="text-slate-500 font-medium text-xs mt-1">Select delivery methods for {invitingTenant.name}</p>
              </div>
              <button
                onClick={() => { setShowInviteModal(false); setInvitingTenant(null); }}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-all"
              >
                <Plus className="rotate-45" size={20} />
              </button>
            </div>

            <div className="p-8 space-y-4">
              {invitingTenant.type === 'RESIDENT' && (
                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 mb-4">
                  <div className="flex items-center gap-2 text-amber-700 font-bold text-xs uppercase tracking-wider mb-2">
                    <AlertCircle size={14} />
                    Resident Notice
                  </div>
                  <p className="text-xs text-amber-800 leading-relaxed font-medium">
                    This invite will be sent to the responsible party: <span className="font-bold underline">{invitingTenant.parentName || 'Assigned Tenant'}</span>.
                  </p>
                </div>
              )}

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
                    <p className="text-[10px] text-slate-500 font-medium">Send credentials to {invitingTenant.email || 'Email missing'}</p>
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
                    <p className="text-[10px] text-slate-500 font-medium">Send credentials to {invitingTenant.phone || 'Phone missing'}</p>
                  </div>
                  {inviteMethods.sms && <CheckCircle size={20} className="ml-auto text-indigo-600" />}
                </button>
              </div>
            </div>

            <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex gap-3">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => { setShowInviteModal(false); setInvitingTenant(null); }}
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
    </>
  );
};

/* =========================
   TENANT DETAIL COMPONENT
  ========================= */

/* =========================
   TENANT DETAIL COMPONENT
  ========================= */

const TenantDetail = ({ tenant, onBack, onSendInvite, onEdit, allUnits = [] }) => {
  const [activeTab, setActiveTab] = useState('Details');
  const [loading, setLoading] = useState(false);
  const [tenantData, setTenantData] = useState({
    ...tenant,
    email: tenant.email || `${tenant.name.toLowerCase().replace(' ', '.')}@example.com`,
    phone: tenant.phone || '+1 (555) 012-3456',
    leaseStatus: tenant.leaseStatus || 'Active'
  });
  const [documents, setDocuments] = useState(tenant.documents || []);
  const [policies, setPolicies] = useState(tenant.insurance || []);
  const [leases, setLeases] = useState([]);
  const [tickets, setTickets] = useState([]);

  const fetchTenantData = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/api/admin/tenants/${tenant.id}`);
      const data = res.data;
      setTenantData({
        ...data,
        name: data.name || `${data.firstName || ''} ${data.lastName || ''}`.trim(),
        leaseStatus: data.type === 'RESIDENT' ? 'Occupant' : (data.leases?.find(l => l.status === 'Active')?.status || data.leases?.find(l => l.status === 'DRAFT')?.status || 'Inactive'),
        property: data.leases?.find(l => l.status === 'Active')?.unit?.property?.name || data.assignedUnit?.property?.name || 'No Property',
        unit: data.leases?.find(l => l.status === 'Active')?.unit?.unitNumber || data.leases?.find(l => l.status === 'Active')?.unit?.name || data.assignedUnit?.unitNumber || data.assignedUnit?.name || 'No Unit'
      });
      setDocuments(data.documents || []);
      setPolicies(data.insurances || []);
      setLeases(data.leases || []);
    } catch (e) {
      console.error("Failed to fetch tenant data", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tenant?.id) {
      fetchTenantData();
      fetchTickets();
    }
  }, [tenant]);

  const fetchTickets = async () => {
    try {
      const res = await api.get(`/api/admin/tickets?userId=${tenant.id}`);
      // Map backend fields to frontend UI expectations if needed
      const mapped = res.data.map(t => ({
        id: t.id, // e.g. T-1001
        dbId: t.dbId,
        title: t.subject,
        category: t.category || 'General',
        priority: t.priority,
        status: t.status,
        date: t.date
      }));
      setTickets(mapped);
    } catch (e) {
      console.error("Failed to fetch tickets", e);
    }
  };

  // Modals state
  const [showAddInsurance, setShowAddInsurance] = useState(false);
  const [showAddDocument, setShowAddDocument] = useState(false);
  const [showAddTicket, setShowAddTicket] = useState(false);
  const [showAddLease, setShowAddLease] = useState(false);
  const [showContactTenant, setShowContactTenant] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState(null);
  const [viewingPolicy, setViewingPolicy] = useState(null);
  const [viewingDoc, setViewingDoc] = useState(null);
  const [showRentModal, setShowRentModal] = useState(false);
  const [editingLeaseRent, setEditingLeaseRent] = useState(null);
  const [rentInput, setRentInput] = useState('');
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    let url = null;
    const loadPreview = async () => {
      if (!viewingDoc) {
        setPreviewUrl(null);
        return;
      }

      try {
        setPreviewLoading(true);
        const response = await api.get(`/api/admin/documents/${viewingDoc.id}/download`, {
          responseType: 'blob'
        });
        url = URL.createObjectURL(response.data);
        setPreviewUrl(url);
      } catch (err) {
        console.error("Failed to load preview", err);
      } finally {
        setPreviewLoading(false);
      }
    };

    loadPreview();

    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [viewingDoc]);


  const deleteDoc = (id) => {
    if (confirm('Are you sure you want to delete this document?')) {
      setDocuments(documents.filter(d => d.id !== id));
    }
  };

  const deletePolicy = (id) => {
    if (confirm('Are you sure you want to delete this insurance policy?')) {
      setPolicies(policies.filter(p => p.id !== id));
    }
  };

  const getStatusBadge = (endDate) => {
    const end = new Date(endDate);
    const now = new Date();
    // Reset time for accurate day calculation
    end.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);
    const diffTime = end - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return {
        label: 'Expired',
        class: 'bg-red-50 text-red-700 border-red-100',
        dot: 'bg-red-500',
        helper: `Expired ${Math.abs(diffDays)} days ago`,
        icon: true
      };
    }
    if (diffDays <= 30) {
      return {
        label: 'Expiring Soon',
        class: 'bg-amber-50 text-amber-700 border-amber-100',
        dot: 'bg-amber-500',
        helper: `Expires in ${diffDays} days`,
        icon: true
      };
    }
    return {
      label: 'Active',
      class: 'bg-emerald-50 text-emerald-700 border-emerald-100',
      dot: 'bg-emerald-500',
      helper: `Expires in ${diffDays} days`,
      icon: false
    };
  };

  const handleSaveInsurance = (e) => {
    e.preventDefault();
    const form = e.target;
    const newPolicy = {
      id: editingPolicy ? editingPolicy.id : Date.now(),
      provider: form.provider.value,
      policyNumber: form.policyNumber.value,
      startDate: form.startDate.value,
      endDate: form.endDate.value,
      document: 'uploaded_policy.pdf' // Mock upload
    };

    if (editingPolicy) {
      setPolicies(policies.map(p => p.id === editingPolicy.id ? newPolicy : p));
    } else {
      setPolicies([...policies, newPolicy]);
    }

    setShowAddInsurance(false);
    setEditingPolicy(null);
  };

  const handleSaveDocument = (e) => {
    e.preventDefault();
    const form = e.target;
    const newDoc = {
      id: Date.now(),
      name: form.docName.value || 'New Document.pdf',
      type: form.docType.value,
      expiryDate: form.expiryDate.value,
      date: new Date().toISOString().split('T')[0]
    };
    setDocuments([...documents, newDoc]);
    setShowAddDocument(false);
  };

  const handleSaveTicket = async (e) => {
    e.preventDefault();
    const form = e.target;
    try {
      const payload = {
        tenantId: tenant.id,
        subject: form.title.value,
        category: form.category.value,
        priority: form.priority.value,
        description: `Created via Admin Portal for ${tenant.name}`,
        propertyId: tenant.propertyId,
        unitId: tenant.unitId
      };
      await api.post('/api/admin/tickets', payload);
      fetchTickets(); // Refresh list
      setShowAddTicket(false);
    } catch (e) {
      console.error("Failed to save ticket", e);
      alert("Error creating ticket");
    }
  };

  const handleSaveLease = async (e) => {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);

    try {
      const payload = {
        tenantId: tenantData.id,
        unitId: parseInt(formData.get('unitId')),
        startDate: formData.get('startDate'),
        endDate: formData.get('endDate'),
        monthlyRent: parseFloat(formData.get('rent')),
        type: formData.get('type')
      };

      await api.post('/api/admin/leases', payload);
      alert('Lease added successfully');
      setShowAddLease(false);
      fetchTenantData();
    } catch (e) {
      console.error("Failed to save lease", e);
      alert(e.response?.data?.message || "Error saving lease");
    }
  };

  const handleActivateLease = async (leaseId) => {
    if (window.confirm('Are you sure you want to activate this lease?')) {
      try {
        await api.post(`/api/admin/leases/${leaseId}/activate`);
        alert('Lease activated successfully');
        fetchTenantData();
      } catch (e) {
        console.error(e);
        alert('Failed to activate lease');
      }
    }
  };

  const latestLease = leases.length > 0 ? [...leases].sort((a, b) => b.id - a.id)[0] : null;
  const canActivate = latestLease && (latestLease.status === 'DRAFT' || latestLease.status?.toLowerCase() === 'expired');

  const handleSaveRent = async (e) => {
    e.preventDefault();
    if (!editingLeaseRent) return;
    try {
      await api.put(`/api/admin/leases/${editingLeaseRent.id}`, {
        monthlyRent: rentInput
      });
      alert('Rent updated successfully');
      setShowRentModal(false);
      fetchTenantData();
    } catch (e) {
      console.error(e);
      alert('Failed to update rent');
    }
  };


  return (
    <MainLayout title={`Tenant: ${tenantData?.name || 'Loading...'}`}>
      <div className="flex flex-col gap-6">

        {/* HEADER */}
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-2.5 rounded-xl bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-all border border-slate-100"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100 font-bold text-lg">
                {tenantData.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-800">{tenantData.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm text-slate-500 font-medium">{tenantData.property}</span>
                  <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                  <span className="text-sm text-slate-500 font-medium">{tenantData.unit}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-2 w-full md:w-auto">
            <Button variant="secondary" className="flex-1 md:flex-none" onClick={() => onSendInvite(tenantData)}>Send Invite</Button>
            <Button variant="secondary" className="flex-1 md:flex-none" onClick={onEdit}>Edit Tenant</Button>
          </div>
        </section>

        {/* TABS */}
        <div className="flex border-b border-slate-200 gap-8 px-2 overflow-x-auto no-scrollbar">
          {['Details', 'Leases', 'Documents', 'Insurance', 'Tickets'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={clsx(
                "pb-4 px-2 text-sm font-semibold transition-all relative whitespace-nowrap",
                activeTab === tab
                  ? "text-indigo-600"
                  : "text-slate-400 hover:text-slate-600"
              )}
            >
              {tab}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full animate-in fade-in slide-in-from-bottom-1 duration-300"></div>
              )}
            </button>
          ))}
        </div>

        {/* TAB CONTENT */}
        <div className="animate-in fade-in slide-in-from-top-2 duration-300">

          {activeTab === 'Details' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Status</h4>
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${tenantData.leaseStatus === 'Active' ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                  <span className="font-semibold text-slate-700">{tenantData.leaseStatus}</span>
                </div>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Type</h4>
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold border ${(tenantData.type === 'Company' || tenantData.type === 'COMPANY') ? 'bg-purple-50 text-purple-700 border-purple-100' : 'bg-blue-50 text-blue-700 border-blue-100'
                  }`}>
                  {tenantData.type}
                </span>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Tenant ID</h4>
                <p className="font-mono text-sm text-slate-600">TEN-{tenantData.id}</p>
              </div>

              <div className="md:col-span-2 space-y-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                  <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Contact Information</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-slate-400 font-medium">Primary Email</p>
                      <p className="text-sm font-bold text-slate-700">{tenantData.email}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-medium">Primary Phone</p>
                      <p className="text-sm font-bold text-slate-700">{tenantData.phone}</p>
                    </div>
                  </div>
                </div>

                {(tenantData.type === 'Company' || tenantData.type === 'COMPANY') && (
                  <>
                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                      <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Company Address</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                          <p className="text-xs text-slate-400 font-medium">Street Address</p>
                          <p className="text-sm font-semibold text-slate-700">{tenantData.street || 'N/A'}</p>
                          {(tenantData.companyDetails || tenantData.street2) && <p className="text-sm font-semibold text-slate-700">{tenantData.companyDetails || tenantData.street2}</p>}
                        </div>
                        <div>
                          <p className="text-xs text-slate-400 font-medium">City</p>
                          <p className="text-sm font-semibold text-slate-700">{tenantData.city || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400 font-medium">State / Province</p>
                          <p className="text-sm font-semibold text-slate-700">{tenantData.state || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400 font-medium">Postal Code</p>
                          <p className="text-sm font-semibold text-slate-700">{tenantData.postalCode || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400 font-medium">Country</p>
                          <p className="text-sm font-semibold text-slate-700">{tenantData.country || 'N/A'}</p>
                        </div>
                      </div>
                    </div>

                    {tenantData.companyContacts && tenantData.companyContacts.length > 0 && (
                      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                        <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Company Contacts</h4>
                        <div className="space-y-3">
                          {tenantData.companyContacts.map((contact, idx) => (
                            <div key={idx} className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center group">
                              <div className="flex gap-4 items-center">
                                <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 font-bold">
                                  {contact.name[0]}
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-slate-800">{contact.name}</p>
                                  <p className="text-xs text-slate-400 font-medium">{contact.role || 'No Role specified'}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-[11px] font-bold text-slate-700">{contact.email}</p>
                                <p className="text-[11px] text-slate-400">{contact.phone || 'No phone'}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {(tenantData.type === 'Resident' || tenantData.type === 'RESIDENT') && tenantData.parent && (
                  <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100 shadow-sm space-y-4">
                    <h4 className="text-sm font-bold text-amber-700 uppercase tracking-wider flex items-center gap-2">
                      <AlertCircle size={16} />
                      Resident Linking
                    </h4>
                    <div>
                      <p className="text-xs text-amber-600 font-bold uppercase tracking-wider mb-2">Responsible Tenant (Billable)</p>
                      <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-sm flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 font-bold border border-amber-200">
                          {tenantData.parent.name ? tenantData.parent.name[0] : (tenantData.parent.firstName ? tenantData.parent.firstName[0] : 'P')}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">{tenantData.parent.name || `${tenantData.parent.firstName} ${tenantData.parent.lastName}`}</p>
                          <span className="text-[10px] uppercase font-black text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{tenantData.parent.type || 'Tenant'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {tenantData.residents && tenantData.residents.length > 0 && (
                  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                    <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Linked Residents</h4>
                    <div className="space-y-3">
                      {tenantData.residents.map((res, idx) => (
                        <div key={idx} className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center">
                          <div className="flex gap-4 items-center">
                            <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-indigo-500 font-bold">
                              {res.firstName[0]}{res.lastName[0]}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-800">{res.firstName} {res.lastName}</p>
                              <span className="text-[10px] font-black uppercase text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded">Resident</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-[11px] font-bold text-slate-700">{res.email || 'No email'}</p>
                            <p className="text-[11px] text-slate-400">{res.phone || 'No phone'}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'Leases' && (
            <section className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h4 className="font-bold text-slate-800">Lease History</h4>
                <div className="flex gap-2">
                  {canActivate && (
                    <Button variant="primary" size="sm" onClick={() => handleActivateLease(latestLease.id)}>
                      Activate Lease
                    </Button>
                  )}
                  <Button variant="secondary" size="sm" onClick={() => setShowAddLease(true)}>Add Past Lease</Button>
                </div>
              </div>

              {leases.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50 border-b border-slate-100">
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Type</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Unit / Bedroom</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Period</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Rent</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {leases.map(lease => (
                        <tr key={lease.id} className="hover:bg-slate-50/50 transition-all font-medium">
                          <td className="px-6 py-4 text-sm text-slate-700">{lease.unit?.rentalMode || 'Full Unit'}</td>
                          <td className="px-6 py-4 text-sm text-slate-600">{lease.unit?.name || 'N/A'}</td>
                          <td className="px-6 py-4 text-sm text-slate-600">
                            {lease.startDate ? new Date(lease.startDate).toLocaleDateString() : 'TBD'} - {lease.endDate ? new Date(lease.endDate).toLocaleDateString() : 'TBD'}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-700 font-bold">
                            {(!lease.monthlyRent || parseFloat(lease.monthlyRent) === 0) ? (
                              <button
                                onClick={() => {
                                  setEditingLeaseRent(lease);
                                  setRentInput('');
                                  setShowRentModal(true);
                                }}
                                className="text-[10px] text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-2 py-1 rounded font-black uppercase"
                              >
                                [ Set Rent ]
                              </button>
                            ) : (
                              <div className="flex items-center gap-2 group">
                                <span>${lease.monthlyRent}</span>
                                <button
                                  onClick={() => {
                                    setEditingLeaseRent(lease);
                                    setRentInput(lease.monthlyRent.toString());
                                    setShowRentModal(true);
                                  }}
                                  className="text-slate-400 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                                >
                                  <Pencil size={14} />
                                </button>
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-tight ${lease.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                              lease.status === 'DRAFT' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                'bg-slate-50 text-slate-500 border-slate-100'
                              }`}>
                              {lease.status}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={async () => {
                                  try {
                                    const res = await api.get(`/api/admin/leases/${lease.id}/download?disposition=attachment`, { responseType: 'blob' });
                                    const url = window.URL.createObjectURL(res.data);
                                    const link = document.createElement('a');
                                    link.href = url;
                                    link.setAttribute('download', `lease-${lease.id}.pdf`);
                                    document.body.appendChild(link);
                                    link.click();
                                    link.remove();
                                  } catch (e) { alert('Download failed'); }
                                }}
                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                title="Download Lease PDF"
                              >
                                <Download size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-12 text-center">
                  <div className="max-w-xs mx-auto space-y-4">
                    <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center mx-auto text-slate-300">
                      <FileText size={32} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800">No Lease History</h4>
                      <p className="text-sm text-slate-500">The historical lease record for this tenant is currently being migrated.</p>
                    </div>
                  </div>
                </div>
              )}
            </section>
          )}

          {activeTab === 'Documents' && (
            <section className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h4 className="font-bold text-slate-800">Tenant Documents</h4>
                <Button variant="primary" size="sm" className="gap-2" onClick={() => setShowAddDocument(true)}>
                  <Upload size={16} />
                  Upload Document
                </Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100">
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Document Name</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Expiry</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {documents.map(doc => (
                      <tr key={doc.id} className="hover:bg-slate-50/50 transition-all">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100">
                              <FileText size={16} />
                            </div>
                            <span className="font-semibold text-slate-700">{doc.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                            {doc.type}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {doc.expiryDate ? (
                            <div>
                              <p className="text-sm font-medium text-slate-700">{doc.expiryDate}</p>
                              {(() => {
                                const diff = Math.ceil((new Date(doc.expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
                                return (
                                  <p className={clsx("text-[10px] font-bold uppercase tracking-wider mt-1",
                                    diff < 0 ? "text-rose-500" : diff <= 30 ? "text-amber-500" : "text-emerald-500")}>
                                    {diff < 0 ? `Expired ${Math.abs(diff)} days ago` : `Expires in ${diff} days`}
                                  </p>
                                );
                              })()}
                            </div>
                          ) : (
                            <span className="text-sm text-slate-400 italic">No Expiry</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {doc.expiryDate ? (
                            (() => {
                              const status = getStatusBadge(doc.expiryDate);
                              return (
                                <span className={clsx("flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-tight w-fit", status.class)}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`}></span>
                                  {status.label}
                                </span>
                              );
                            })()
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold border bg-slate-50 text-slate-400 uppercase tracking-tight">Permanent</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => {
                                const token = localStorage.getItem('accessToken');
                                const baseURL = api.defaults.baseURL || 'http://localhost:5000';
                                const normalizedBaseURL = baseURL.replace(/\/$/, "");
                                window.open(`${normalizedBaseURL}/api/admin/documents/${doc.id}/download?disposition=inline&token=${token}`, '_blank');
                              }}
                              className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                              title="View"
                            >
                              <Eye size={18} />
                            </button>
                            <button onClick={() => deleteDoc(doc.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all" title="Delete">
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {documents.length === 0 && (
                  <div className="py-12 text-center text-slate-400 italic">No documents uploaded yet.</div>
                )}
              </div>
            </section>
          )}

          {activeTab === 'Insurance' && (
            <div className="space-y-6">
              <section className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <h4 className="font-bold text-slate-800">Insurance Policies</h4>
                  <Button variant="primary" size="sm" onClick={() => {
                    setEditingPolicy(null);
                    setShowAddInsurance(true);
                  }}>
                    Add Insurance
                  </Button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50 border-b border-slate-100">
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Provider</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Policy Number</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Period</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {policies.map(policy => {
                        const status = getStatusBadge(policy.endDate);
                        return (
                          <tr key={policy.id} className="hover:bg-slate-50/50 transition-all">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-lg ${status.class.split(' ')[0]} flex items-center justify-center ${status.class.split(' ')[1]} border ${status.class.split(' ')[2]}`}>
                                  <Shield size={16} />
                                </div>
                                <span className="font-semibold text-slate-700">{policy.provider}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm font-mono text-slate-500">
                              {policy.policyNumber}
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-xs font-medium text-slate-600">
                                {policy.startDate} - {policy.endDate}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className={clsx("flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-tight w-fit", status.class)}>
                                <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`}></span>
                                {status.label}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => setViewingPolicy(policy)}
                                  className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                  title="View"
                                >
                                  <Eye size={18} />
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingPolicy(policy);
                                    setShowAddInsurance(true);
                                  }}
                                  className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                  title="Edit"
                                >
                                  <FileCheck size={18} />
                                </button>
                                <button
                                  onClick={() => deletePolicy(policy.id)}
                                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                  title="Delete"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {policies.length === 0 && (
                    <div className="py-12 text-center text-slate-400 italic">No insurance policies added.</div>
                  )}
                </div>
              </section>

              <div className="bg-amber-50 rounded-2xl p-6 border border-amber-100 flex items-start gap-4">
                <div className="p-2 rounded-xl bg-amber-100 text-amber-600">
                  <AlertCircle size={20} />
                </div>
                <div>
                  <h5 className="font-bold text-amber-900">Compliance Requirement</h5>
                  <p className="text-sm text-amber-800 mt-1 opacity-80">All tenants are required to maintain a valid Liability Insurance policy throughout their lease term. System will automatically notify the tenant 30 days before expiry.</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Tickets' && (
            <div className="space-y-6">
              <section className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <h4 className="font-bold text-slate-800">Maintenance Tickets</h4>
                  <Button variant="primary" size="sm" onClick={() => setShowAddTicket(true)}>
                    Create Ticket
                  </Button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50 border-b border-slate-100">
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Ticket</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Category</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {tickets.map(ticket => (
                        <tr key={ticket.id} className="hover:bg-slate-50/50 transition-all">
                          <td className="px-6 py-4">
                            <div>
                              <p className="font-semibold text-slate-700">{ticket.title}</p>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">#{ticket.id}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                              {ticket.category}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-tight w-fit ${ticket.status === 'Open' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                              ticket.status === 'In Progress' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                'bg-emerald-50 text-emerald-700 border-emerald-100'
                              }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${ticket.status === 'Open' ? 'bg-blue-500' :
                                ticket.status === 'In Progress' ? 'bg-amber-500' :
                                  'bg-emerald-500'
                                }`}></span>
                              {ticket.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-500 font-medium">
                            {ticket.date}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex justify-end gap-2">
                              <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all">
                                <Search size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {tickets.length === 0 && (
                    <div className="py-12 text-center text-slate-400 italic">No tickets found for this tenant.</div>
                  )}
                </div>
              </section>
            </div>
          )}

        </div>

        {/* ADD/EDIT INSURANCE MODAL */}
        {
          showAddInsurance && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] animate-in fade-in duration-200">
              <form onSubmit={handleSaveInsurance} className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-300">
                <h3 className="text-2xl font-bold text-slate-800 mb-6">{editingPolicy ? 'Edit' : 'Add'} Insurance Policy</h3>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Provider Name</label>
                    <input
                      name="provider"
                      defaultValue={editingPolicy?.provider || ''}
                      required
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-indigo-500 transition-all font-medium text-slate-700"
                      placeholder="e.g. State Farm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Policy Number</label>
                    <input
                      name="policyNumber"
                      defaultValue={editingPolicy?.policyNumber || ''}
                      required
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-indigo-500 transition-all font-medium text-slate-700 font-mono"
                      placeholder="e.g. POL-12345"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Start Date</label>
                      <div className="relative">
                        <Calendar size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          name="startDate"
                          type="date"
                          defaultValue={editingPolicy?.startDate || ''}
                          required
                          className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-indigo-500 transition-all text-sm font-medium text-slate-700"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">End Date</label>
                      <div className="relative">
                        <Calendar size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          name="endDate"
                          type="date"
                          defaultValue={editingPolicy?.endDate || ''}
                          required
                          className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-indigo-500 transition-all text-sm font-medium text-slate-700"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="p-6 border-2 border-dashed border-slate-100 rounded-2xl flex flex-col items-center justify-center gap-2 hover:border-indigo-200 transition-all group cursor-pointer relative">
                    <Upload size={24} className="text-slate-300 group-hover:text-indigo-400 transition-all" />
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Upload Policy Document</p>
                    <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" />
                  </div>
                </div>
                <div className="flex gap-3 mt-8">
                  <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowAddInsurance(false)}>Cancel</Button>
                  <Button type="submit" variant="primary" className="flex-1">Save Policy</Button>
                </div>
              </form>
            </div>
          )
        }

        {/* VIEW INSURANCE MODAL */}
        {
          viewingPolicy && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] animate-in fade-in duration-200" onClick={() => setViewingPolicy(null)}>
              <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-start mb-6">
                  <h3 className="text-2xl font-bold text-slate-800">Insurance Details</h3>
                  <button onClick={() => setViewingPolicy(null)} className="text-slate-400 hover:text-slate-600 transition-all">✕</button>
                </div>
                <div className="space-y-6">
                  <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                      <Shield size={24} />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Provider</p>
                      <p className="text-lg font-bold text-slate-800">{viewingPolicy.provider}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl border border-slate-100">
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Policy Number</p>
                      <p className="font-mono text-sm font-semibold text-slate-700">{viewingPolicy.policyNumber}</p>
                    </div>
                    <div className="p-4 rounded-2xl border border-slate-100">
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Status</p>
                      {(() => {
                        const status = getStatusBadge(viewingPolicy.endDate);
                        return (
                          <span className={clsx("flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-tight w-fit", status.class)}>
                            {status.label}
                          </span>
                        );
                      })()}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl border border-slate-100">
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Start Date</p>
                      <p className="text-sm font-semibold text-slate-700">{viewingPolicy.startDate}</p>
                    </div>
                    <div className="p-4 rounded-2xl border border-slate-100">
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">End Date</p>
                      <p className="text-sm font-semibold text-slate-700">{viewingPolicy.endDate}</p>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl border border-indigo-100 bg-indigo-50/30 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText size={18} className="text-indigo-600" />
                      <span className="text-sm font-medium text-indigo-900">{viewingPolicy.document}</span>
                    </div>
                    <button
                      onClick={async () => {
                        try {
                          const documentId = viewingPolicy.uploadedDocumentId;
                          if (!documentId) return alert('No document record found for this policy');

                           const endpoint = `/api/admin/documents/${documentId}/download?disposition=attachment`;
                           const res = await api.get(endpoint, { responseType: 'blob' });
                           const url = window.URL.createObjectURL(res.data);
                          const link = document.createElement('a');
                          link.href = url;
                          link.setAttribute('download', `insurance-${viewingPolicy.id}.pdf`);
                          document.body.appendChild(link);
                          link.click();
                          link.remove();
                        } catch (e) { alert('Download failed'); }
                      }}
                      className="text-indigo-600 hover:text-indigo-800 transition-all"
                    >
                      <Download size={18} />
                    </button>
                  </div>
                </div>
                <div className="mt-8">
                  <Button variant="secondary" className="w-full" onClick={() => setViewingPolicy(null)}>Close</Button>
                </div>
              </div>
            </div>
          )
        }

        {/* UPLOAD DOCUMENT MODAL */}
        {
          showAddDocument && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] animate-in fade-in duration-200">
              <form onSubmit={handleSaveDocument} className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-300">
                <h3 className="text-2xl font-bold text-slate-800 mb-6">Upload Document</h3>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Document Name</label>
                    <input
                      name="docName"
                      required
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-indigo-500 transition-all font-medium text-slate-700"
                      placeholder="e.g. ID Proof"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Document Type</label>
                    <div className="relative">
                      <select
                        name="docType"
                        required
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-indigo-500 transition-all appearance-none bg-white font-medium text-slate-700"
                      >
                        <option value="Agreement">Lease Agreement</option>
                        <option value="ID">Identity Proof</option>
                        <option value="Income">Income Proof</option>
                        <option value="Other">Other</option>
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">▼</div>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Expiry Date (Optional)</label>
                    <div className="relative">
                      <Calendar size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        name="expiryDate"
                        type="date"
                        className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-indigo-500 transition-all text-sm font-medium text-slate-700"
                      />
                    </div>
                  </div>
                  <div className="p-6 border-2 border-dashed border-slate-100 rounded-2xl flex flex-col items-center justify-center gap-2 hover:border-indigo-200 transition-all group cursor-pointer relative">
                    <Upload size={24} className="text-slate-300 group-hover:text-indigo-400 transition-all" />
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Choose File</p>
                    <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" />
                  </div>
                </div>
                <div className="flex gap-3 mt-8">
                  <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowAddDocument(false)}>Cancel</Button>
                  <Button type="submit" variant="primary" className="flex-1">Upload</Button>
                </div>
              </form>
            </div>
          )
        }

        {/* VIEW DOCUMENT MODAL */}
        {
          viewingDoc && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] animate-in fade-in duration-200" onClick={() => setViewingDoc(null)}>
              <div className={`bg-white rounded-2xl p-8 w-full ${previewLoading || previewUrl ? 'max-w-4xl' : 'max-w-md'} max-h-[90vh] shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col`} onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-2xl font-bold text-slate-800">{viewingDoc.name}</h3>
                    <p className="text-sm text-slate-500">{viewingDoc.type} • Uploaded on {viewingDoc.date}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="gap-2"
                      onClick={async () => {
                        try {
                          const endpoint = `/api/admin/documents/${viewingDoc.id}/download?disposition=attachment`;
                          const res = await api.get(endpoint, { responseType: 'blob' });
                          const url = window.URL.createObjectURL(res.data);
                          const link = document.createElement('a');
                          link.href = url;
                          link.setAttribute('download', `${viewingDoc.name}`);
                          document.body.appendChild(link);
                          link.click();
                          link.remove();
                          window.URL.revokeObjectURL(url);
                        } catch (e) { alert('Download failed'); }
                      }}
                    >
                      <Download size={16} />
                      Download
                    </Button>
                    <button onClick={() => setViewingDoc(null)} className="p-2 text-slate-400 hover:text-slate-600 transition-all">✕</button>
                  </div>
                </div>

                {(previewLoading || previewUrl) && (
                  <div className="flex-1 bg-slate-50 rounded-xl border border-slate-200 overflow-hidden relative min-h-[500px] flex flex-col">
                    {previewLoading ? (
                      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-slate-400">
                        <div className="w-12 h-12 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin" />
                        <p className="font-bold uppercase tracking-widest text-[10px]">Loading preview...</p>
                      </div>
                    ) : (
                      viewingDoc.name.toLowerCase().endsWith('.pdf') ? (
                        <iframe
                          src={`${previewUrl}#toolbar=0`}
                          className="w-full h-full border-none flex-1"
                          title="PDF Preview"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center p-8 flex-1">
                          <img
                            src={previewUrl}
                            className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                            alt="Document Preview"
                          />
                        </div>
                      )
                    )}
                  </div>
                )}
                <div className="mt-8">
                  <Button variant="secondary" className="w-full" onClick={() => setViewingDoc(null)}>Close Preview</Button>
                </div>
              </div>
            </div>
          )
        }

        {/* ADD TICKET MODAL */}
        {
          showAddTicket && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] animate-in fade-in duration-200">
              <form onSubmit={handleSaveTicket} className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-300">
                <h3 className="text-2xl font-bold text-slate-800 mb-6">Create Maintenance Ticket</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5 opacity-60">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Tenant</label>
                      <input disabled value={tenantData?.name || ''} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 font-medium" />
                    </div>
                    <div className="space-y-1.5 opacity-60">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Unit</label>
                      <input disabled value={tenantData?.unit || ''} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 font-medium" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Issue Title</label>
                    <input
                      name="title"
                      required
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-indigo-500 transition-all font-medium text-slate-700"
                      placeholder="e.g. Broken Light Fixture"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Category</label>
                    <div className="relative">
                      <select
                        name="category"
                        required
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-indigo-500 transition-all appearance-none bg-white font-medium text-slate-700"
                      >
                        <option value="Plumbing">Plumbing</option>
                        <option value="Electrical">Electrical</option>
                        <option value="HVAC">HVAC</option>
                        <option value="Appliance">Appliance</option>
                        <option value="Other">Other</option>
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">▼</div>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Priority</label>
                    <div className="flex gap-4">
                      {['Low', 'Medium', 'High'].map(p => (
                        <label key={p} className="flex-1">
                          <input type="radio" name="priority" value={p} defaultChecked={p === 'Medium'} className="sr-only peer" />
                          <div className="text-center py-2 rounded-xl border border-slate-200 peer-checked:border-indigo-500 peer-checked:bg-indigo-50 peer-checked:text-indigo-600 cursor-pointer transition-all text-sm font-bold opacity-60 peer-checked:opacity-100">
                            {p}
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 mt-8">
                  <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowAddTicket(false)}>Cancel</Button>
                  <Button type="submit" variant="primary" className="flex-1">Submit Ticket</Button>
                </div>
              </form>
            </div>
          )
        }

        {/* EDIT TENANT MODAL */}

        {/* CONTACT TENANT MODAL */}
        {
          showContactTenant && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] animate-in fade-in duration-200" onClick={() => setShowContactTenant(false)}>
              <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
                <h3 className="text-2xl font-bold text-slate-800 mb-6">Contact Tenant</h3>
                <div className="space-y-6">
                  <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Email Address</p>
                    <a href={`mailto:${tenantData.email}`} className="text-indigo-600 font-bold hover:underline break-all">{tenantData.email}</a>
                  </div>
                  <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Phone Number</p>
                    <a href={`tel:${tenantData.phone}`} className="text-indigo-600 font-bold hover:underline">{tenantData.phone}</a>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Quick Note</label>
                    <textarea placeholder="Type a message..." className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none transition-all text-sm h-24 resize-none" />
                  </div>
                </div>
                <div className="flex gap-3 mt-8">
                  <Button variant="secondary" className="w-full" onClick={() => setShowContactTenant(false)}>Close</Button>
                </div>
              </div>
            </div>
          )
        }

        {/* ADD PAST LEASE MODAL */}
        {
          showAddLease && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] animate-in fade-in duration-200">
              <form onSubmit={handleSaveLease} className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-300">
                <h3 className="text-2xl font-bold text-slate-800 mb-6">Add Historical Lease</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Lease Type</label>
                      <select name="type" required className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none transition-all appearance-none bg-white font-medium text-slate-700">
                        <option value="Full Unit">Full Unit</option>
                        <option value="Bedroom">Bedroom</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Unit / Room</label>
                      <select name="unitId" required className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none transition-all appearance-none bg-white font-medium text-slate-700">
                        <option value="">Select Unit</option>
                        {allUnits.map(u => (
                          <option key={u.id} value={u.id} selected={u.unitNumber === tenantData?.unit}>
                            {u.property?.name} - {u.unitNumber}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Start Date</label>
                      <input name="startDate" type="date" required className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none font-medium text-slate-700" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">End Date</label>
                      <input name="endDate" type="date" required className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none font-medium text-slate-700" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Monthly Rent</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                      <input name="rent" type="number" required placeholder="0.00" className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-slate-200 outline-none font-medium text-slate-700" />
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 mt-8">
                  <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowAddLease(false)}>Cancel</Button>
                  <Button type="submit" variant="primary" className="flex-1">Save Lease</Button>
                </div>
              </form>
            </div>
          )
        }

        {
          showRentModal && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[70] animate-in fade-in duration-200">
              <form onSubmit={handleSaveRent} className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-300">
                <h3 className="text-2xl font-bold text-slate-800 mb-6">Set Lease Rent</h3>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Monthly Rent Amount</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                      <input
                        type="number"
                        step="0.01"
                        required
                        min="0.01"
                        value={rentInput}
                        onChange={(e) => setRentInput(e.target.value)}
                        className="w-full pl-8 pr-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none transition-all font-bold text-slate-700 text-lg"
                        placeholder="0.00"
                        autoFocus
                      />
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 mt-8">
                  <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowRentModal(false)}>Cancel</Button>
                  <Button type="submit" variant="primary" className="flex-1">Save Rent</Button>
                </div>
              </form>
            </div>
          )
        }

      </div >
    </MainLayout >
  );
};
