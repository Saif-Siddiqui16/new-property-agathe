import React, { useState, useEffect } from 'react';
import { MainLayout } from '../layouts/MainLayout';
import {
  Plus, AlertCircle, Calendar, DollarSign, User, Building,
  Trash2, Edit2, History, ChevronRight, ChevronLeft, Eye, ShieldCheck,
  ArrowRight, FileText, Search, Filter, X,
  ArrowUpRight, ArrowDownRight, Info, PieChart, Receipt,
  FileCheck, Loader2, Clock, Download, CheckCircle2, Upload
} from 'lucide-react';
import { Button } from '../components/Button';
import api from '../api/client';
import { useLocation } from 'react-router-dom';
import { hasPermission } from '../utils/permissions';

const RefundsAdjustments = () => {
  const [__forceUpdate, __setForceUpdate] = useState(0);
  useEffect(() => {
    const handleUpdate = () => __setForceUpdate(p => p + 1);
    window.addEventListener('permissionsUpdated', handleUpdate);
    return () => window.removeEventListener('permissionsUpdated', handleUpdate);
  }, []);

  const [records, setRecords] = useState([]);
  if (!hasPermission('Refunds', 'view')) return null;

  const [tenants, setTenants] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [selected, setSelected] = useState(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  const [calcData, setCalcData] = useState(null);
  const [loadingCalc, setLoadingCalc] = useState(false);
  const [amountValue, setAmountValue] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [pendingRefunds, setPendingRefunds] = useState([]);
  const [loadingPending, setLoadingPending] = useState(false);
  const [success, setSuccess] = useState(false);

  const location = useLocation();

  // Auto-selection state
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [selectedUnitId, setSelectedUnitId] = useState('');

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const urlTenantId = queryParams.get('tenantId');
    const urlUnitId = queryParams.get('unitId');
    if (urlTenantId) setSelectedTenantId(urlTenantId);
    if (urlUnitId) setSelectedUnitId(urlUnitId);
    if (urlTenantId) setShowModal(true);

    fetchInitialData();
  }, [location.search]);

  const fetchInitialData = async () => {
    setLoading(true);
    await Promise.all([
      fetchRecords(currentPage), 
      fetchTenants(), 
      fetchUnits(),
      fetchPendingRefunds()
    ]);
    setLoading(false);
  };

  const fetchPendingRefunds = async () => {
    setLoadingPending(true);
    try {
      const res = await api.get('/api/admin/dashboard/stats');
      setPendingRefunds(res.data.pendingRefunds || []);
    } catch (e) {
      console.error('Error fetching pending refunds:', e);
    } finally {
      setLoadingPending(false);
    }
  };

  const handleCancelRefund = async (tenantId, unitId) => {
    if (!window.confirm('Are you sure you want to cancel the refund process for this tenant?')) return;
    try {
      await api.post('/api/admin/refunds', {
        tenantId: parseInt(tenantId),
        unitId: parseInt(unitId),
        type: 'Security Deposit',
        status: 'Cancelled',
        outcomeReason: 'Cancelled – lease renewed',
        amount: 0,
        reason: 'Refund process cancelled via Refunds Page Action'
      });
      alert('Refund process cancelled successfully.');
      fetchPendingRefunds();
      fetchRecords(currentPage);
    } catch (error) {
      console.error('Failed to cancel refund process', error);
    }
  };

  const formatTableDate = (dateString) => {
    if (!dateString) return 'N/A';
    const [year, month, day] = dateString.split('T')[0].split('-');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[parseInt(month, 10) - 1]} ${parseInt(day, 10)}, ${year}`;
  };

  useEffect(() => {
    if (selectedTenantId) {
      fetchCalculation(selectedTenantId, selectedUnitId);
    } else {
      setCalcData(null);
    }
  }, [selectedTenantId, selectedUnitId]);

  const fetchCalculation = async (tid, uid) => {
    setLoadingCalc(true);
    try {
      const url = uid ? `/api/admin/refunds/calculate/${tid}?unitId=${uid}` : `/api/admin/refunds/calculate/${tid}`;
      const res = await api.get(url);
      setCalcData(res.data);
      if (res.data?.finalRefundAmount != null) {
        setAmountValue(res.data.finalRefundAmount.toString());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingCalc(false);
    }
  };

  const fetchRecords = async (page = 1) => {
    try {
      const response = await api.get(`/api/admin/refunds?page=${page}&limit=${itemsPerPage}`);
      setRecords(response.data.data || []);
      setTotalPages(response.data.totalPages || 1);
      setTotalItems(response.data.total || 0);
      setCurrentPage(response.data.page || 1);
    } catch (error) { console.error('Error fetching refunds:', error); }
  };

  const fetchTenants = async () => {
    try {
      const res = await api.get('/api/admin/tenants?limit=1000');
      setTenants(res.data?.data || res.data || []);
    } catch (e) { console.error(e); }
  };

  const fetchUnits = async () => {
    try {
      const res = await api.get('/api/admin/units?limit=1000');
      setUnits(res.data.data || res.data);
    } catch (e) { console.error(e); }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());

    try {
      setSaving(true);
      let proofUrl = editingRecord?.proofUrl || '';

      // 1. If there's a file, upload it to Cloudinary first
      if (file) {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('type', 'Refund Proof');
        fd.append('tenantId', selectedTenantId);

        // Add links meta to document vault
        const links = [];
        if (selectedTenantId) links.push({ entityType: 'USER', entityId: selectedTenantId });
        if (selectedUnitId) links.push({ entityType: 'UNIT', entityId: selectedUnitId });

        fd.append('links', JSON.stringify(links));

        const uploadRes = await api.post('/api/admin/documents/upload', fd, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        proofUrl = uploadRes.data.fileUrl || (uploadRes.data.document?.fileUrl);
      }

      const formData = new FormData(e.target);
      const payload = Object.fromEntries(formData.entries());

      // 2. Handle Deductions calculation
      if (payload.type === 'Deduction (Income)') {
        payload.amount = -Math.abs(parseFloat(payload.amount));
      } else {
        payload.amount = parseFloat(payload.amount);
      }

      // Add the final proof URL to payload
      payload.proofUrl = proofUrl;

      const isEdit = !!editingRecord;
      
      // Include proposed allocations if they exist
      const finalAllocations = calcData?.proposedAllocations || [];
      if (finalAllocations.length > 0) {
        payload.allocations = finalAllocations;
      }

      if (isEdit) {
        await api.put(`/api/admin/refunds/${editingRecord.id}`, payload);
      } else {
        await api.post('/api/admin/refunds', payload);
      }

      setSuccess(isEdit ? 'updated' : 'created');
      setTimeout(() => setSuccess(false), 5000);
      setShowModal(false);
      setEditingRecord(null);
      setFile(null);
      setCalcData(null); // Clear calculation data after save
      await fetchPendingRefunds();
      await fetchRecords(currentPage);
    } catch (e) {
      const msg = e.response?.data?.message || 'Error saving refund';
      alert(msg);
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this record?')) return;
    try {
      await api.delete(`/api/admin/refunds/${id}`);
      fetchRecords(currentPage);
    } catch (e) { console.error(e); }
  };

  return (
    <MainLayout title="Refunds & Adjustments">
      <div className="flex flex-col gap-6">

        {success && (
          <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 p-4 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
            <CheckCircle2 className="text-emerald-500" />
            <span className="font-bold">Refund record {success} successfully!</span>
          </div>
        )}

        {/* DEPOSITS PENDING REFUND TASK LIST */}
        <div className="bg-white rounded-2xl shadow-[0_15px_40px_rgba(0,0,0,0.06)] border-t-[4px] border-amber-500 overflow-hidden mb-4">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <div>
                <h3 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
                    <Clock size={18} className="text-amber-500" /> Deposits Pending Refund
                </h3>
                <p className="text-xs text-gray-400 font-medium mt-0.5 italic">Tasks: Leases that have ended and require security deposit processing.</p>
                </div>
                <div className="px-3 py-1 bg-amber-50 rounded-full border border-amber-100">
                <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">
                    {pendingRefunds.length} Active Tasks
                </span>
                </div>
            </div>
            
            <div className="overflow-x-auto overflow-y-auto max-h-[350px]">
                <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-white z-10 shadow-sm">
                    <tr className="border-b border-gray-100">
                    <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Tenant Name</th>
                    <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Building / Unit</th>
                    <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Paid Deposit</th>
                    <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Move Out</th>
                    <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Action</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                    {pendingRefunds.map((item) => (
                    <tr key={item.id} className="group hover:bg-slate-50 transition-colors">
                        <td className="p-4 text-sm font-bold text-slate-700">{item.tenantName}</td>
                        <td className="p-4 text-xs font-semibold text-slate-500">{item.building} / {item.unitNumber}</td>
                        <td className="p-4 text-center">
                        <span className="text-sm font-black text-emerald-600">$ {item.depositAmount.toLocaleString('en-CA')}</span>
                        </td>
                        <td className="p-4 text-center">
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{formatTableDate(item.leaseExpiryDate)}</span>
                        </td>
                        <td className="p-4 text-right flex items-center justify-end gap-2">
                        <button
                            onClick={() => {
                                setSelectedTenantId(item.tenantId);
                                setSelectedUnitId(item.unitId);
                                setShowModal(true);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100"
                        >
                            Process
                        </button>
                        <button
                            onClick={() => handleCancelRefund(item.tenantId, item.unitId)}
                            className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-400 text-[10px] font-black uppercase tracking-widest hover:bg-rose-50 hover:text-rose-500 transition-all"
                        >
                            Dismiss
                        </button>
                        </td>
                    </tr>
                    ))}
                    {pendingRefunds.length === 0 && !loadingPending && (
                    <tr>
                        <td colSpan="5" className="py-12 text-center">
                        <div className="flex flex-col items-center gap-2">
                            <CheckCircle2 size={32} className="text-emerald-100" />
                            <span className="text-sm font-bold text-slate-300 italic tracking-tight">Zero pending deposit tasks! All caught up.</span>
                        </div>
                        </td>
                    </tr>
                    )}
                </tbody>
                </table>
            </div>
        </div>

        <div className="flex justify-end pt-2">
          {hasPermission('Refunds', 'add') && (
            <Button variant="primary" onClick={() => {
              setEditingRecord(null);
              setSelectedTenantId('');
              setSelectedUnitId('');
              setCalcData(null);
              setAmountValue('');
              setShowModal(true);
            }}>
              + Create Refund
            </Button>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.06)] overflow-hidden border border-gray-100">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="p-4 bg-slate-50 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-gray-100 whitespace-nowrap">ID</th>
                  <th className="p-4 bg-slate-50 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-gray-100 whitespace-nowrap">Type</th>
                  <th className="p-4 bg-slate-50 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-gray-100 whitespace-nowrap">Tenant</th>
                  <th className="p-4 bg-slate-50 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-gray-100 whitespace-nowrap">Unit</th>
                  <th className="p-4 bg-slate-50 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-gray-100 whitespace-nowrap">Amount</th>
                  <th className="p-4 bg-slate-50 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-gray-100 whitespace-nowrap">Req. Date</th>
                  <th className="p-4 bg-slate-50 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-gray-100 whitespace-nowrap">Issue Date</th>
                  <th className="p-4 bg-slate-50 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-gray-100 whitespace-nowrap">Status</th>
                  <th className="p-4 bg-slate-50 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-gray-100 whitespace-nowrap">Action</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="9" className="p-12 text-center text-slate-400">
                      <Loader2 className="animate-spin mx-auto mb-2" />
                      Loading records...
                    </td>
                  </tr>
                ) : records.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 border-b border-gray-100 text-sm text-slate-700 font-mono whitespace-nowrap">{r.id}</td>
                    <td className="p-4 border-b border-gray-100 text-sm">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border whitespace-nowrap ${(r.type || '').toLowerCase().includes('refund')
                        ? 'bg-cyan-50 text-cyan-700 border-cyan-100'
                        : 'bg-yellow-50 text-yellow-700 border-yellow-100'
                        }`}>
                        {r.type}
                      </span>
                    </td>
                    <td className="p-4 border-b border-gray-100 text-sm text-slate-700 whitespace-nowrap">{r.tenant}</td>
                    <td className="p-4 border-b border-gray-100 text-sm text-slate-700 whitespace-nowrap">{r.unit}</td>
                    <td className={`p-4 border-b border-gray-100 text-sm font-medium font-mono whitespace-nowrap ${r.amount < 0 ? 'text-amber-700' : 'text-slate-700'}`}>
                      ${Math.abs(r.amount || 0).toLocaleString('en-CA')}
                    </td>
                    <td className="p-4 border-b border-gray-100 text-sm text-slate-700 whitespace-nowrap">{r.date}</td>
                    <td className="p-4 border-b border-gray-100 text-sm text-slate-700 whitespace-nowrap font-medium text-indigo-600">{r.issuedDate || '—'}</td>
                    <td className="p-4 border-b border-gray-100 text-sm">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border whitespace-nowrap ${r.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                        r.status === 'Applied' ? 'bg-yellow-50 text-yellow-700 border-yellow-100' :
                          'bg-orange-50 text-orange-700 border-orange-100' // Pending
                        }`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="p-4 border-b border-gray-100 text-sm text-right flex justify-end gap-2 text-nowrap whitespace-nowrap">
                      <button onClick={() => setSelected(r)} className="p-1.5 text-slate-500 hover:text-primary-600 hover:bg-slate-100 rounded-md transition-colors" title="View Details">
                        <Eye size={16} />
                      </button>
                      {hasPermission('Refunds', 'edit') && (
                        <button onClick={() => {
                          setEditingRecord(r);
                          setAmountValue(Math.abs(r.amount).toString());
                          setSelectedTenantId(r.tenantId);
                          setSelectedUnitId(r.unitId);
                          fetchCalculation(r.tenantId, r.unitId); // Fetch fresh calculations for this tenant
                          setShowModal(true);
                        }} className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-md transition-colors" title="Edit Refund">
                          <FileCheck size={16} />
                        </button>
                      )}
                      {hasPermission('Refunds', 'delete') && (
                        <button onClick={() => handleDelete(r.id)} className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-slate-100 rounded-md transition-colors" title="Delete Refund">
                          <Trash2 size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {!loading && records.length === 0 && (
                  <tr>
                    <td colSpan="9" className="p-8 text-center text-slate-400 italic">No refund records found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* PAGINATION CONTROLS */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="text-sm text-slate-500 font-medium">
              Showing <span className="font-bold text-slate-700">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
              <span className="font-bold text-slate-700">{Math.min(currentPage * itemsPerPage, totalItems)}</span> of{' '}
              <span className="font-bold text-slate-700">{totalItems}</span> records
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchRecords(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent transition-all cursor-pointer"
              >
                <ChevronLeft size={18} className="text-slate-600" />
              </button>
              
              <div className="flex items-center gap-1">
                {[...Array(totalPages)].map((_, i) => {
                  const p = i + 1;
                  // Only show first, last, and pages around current
                  if (p === 1 || p === totalPages || (p >= currentPage - 1 && p <= currentPage + 1)) {
                    return (
                      <button
                        key={p}
                        onClick={() => fetchRecords(p)}
                        className={`w-9 h-9 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          currentPage === p
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100'
                            : 'text-slate-500 hover:bg-slate-100 border border-transparent'
                        }`}
                      >
                        {p}
                      </button>
                    );
                  }
                  if (p === currentPage - 2 || p === currentPage + 2) {
                    return <span key={p} className="text-slate-300 px-1">...</span>;
                  }
                  return null;
                })}
              </div>

              <button
                onClick={() => fetchRecords(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent transition-all cursor-pointer"
              >
                <ChevronRight size={18} className="text-slate-600" />
              </button>
            </div>
          </div>
        )}

        {/* CREATE/EDIT MODAL */}
        {showModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[95vh] sm:max-h-[90vh]">
              <form onSubmit={handleSave} className="flex flex-col flex-1 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
                  <h3 className="text-xl font-bold text-slate-800">{editingRecord ? 'Edit Refund' : 'Create Refund/Adjustment'}</h3>
                  <button type="button" onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
                </div>

                <div className="p-6 space-y-4 flex-1 overflow-y-auto custom-scrollbar">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase">Type</label>
                      <select name="type" defaultValue={editingRecord?.type || 'Security Deposit'} className="px-4 py-2 rounded-lg border border-slate-200 outline-none focus:border-indigo-500 font-medium bg-white">
                        <option value="Security Deposit">Security Deposit</option>
                        <option value="Deduction (Income)">Deduction (Income)</option>
                        <option value="Rent Refund">Rent Refund</option>
                        <option value="Adjustment">Adjustment</option>
                        <option value="Overcharge">Overcharge</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase">Status</label>
                      <select name="status" defaultValue={editingRecord?.status || 'Pending'} className="px-4 py-2 rounded-lg border border-slate-200 outline-none focus:border-indigo-500 font-medium bg-white">
                        <option value="Pending">Pending</option>
                        <option value="Completed">Completed</option>
                        <option value="Issued">Issued</option>
                        <option value="Received">Received</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase">Issued Date</label>
                      <input name="issuedDate" type="date" defaultValue={editingRecord?.issuedDate || ''} className="px-4 py-2 rounded-lg border border-slate-200 outline-none focus:border-indigo-500 font-medium" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase">Method</label>
                      <select name="method" defaultValue={editingRecord?.method || ''} className="px-4 py-2 rounded-lg border border-slate-200 outline-none focus:border-indigo-500 font-medium bg-white">
                        <option value="">Select Method</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                        <option value="Cash">Cash</option>
                        <option value="Cheque">Cheque</option>
                        <option value="Credit Adjust">Credit Adjust</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase">Reference #</label>
                      <input name="referenceNumber" placeholder="e.g. TXN-9876" defaultValue={editingRecord?.referenceNumber || ''} className="px-4 py-2 rounded-lg border border-slate-200 outline-none focus:border-indigo-500 font-medium" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase">Proof (Cloudinary URL - Auto Set)</label>
                      <div className="flex gap-2">
                        <input readOnly name="proofUrl" placeholder="Upload file below..." value={file ? "Document Attached (Ready to Upload)" : (editingRecord?.proofUrl || '')} className="flex-1 px-4 py-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-400 outline-none font-medium text-[10px] truncate" />
                        {editingRecord?.proofUrl && !file && (
                            <button 
                              type="button"
                              onClick={() => {
                                const token = localStorage.getItem('accessToken');
                                const base = (api.defaults.baseURL || '').replace(/\/$/, '');
                                const viewUrl = `${base}/api/admin/documents/download-proof?url=${encodeURIComponent(editingRecord.proofUrl)}&token=${token}&disposition=inline`;
                                window.open(viewUrl, '_blank');
                              }}
                              className="px-3 py-2 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-100 flex items-center gap-1 border-none cursor-pointer"
                            >
                              <Eye size={14} /> View
                            </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">Upload Proof Document</label>
                    <div className={`border-2 border-dashed rounded-xl p-4 transition-all text-center cursor-pointer relative bg-slate-50/50 hover:bg-white hover:border-indigo-300 ${file ? 'border-indigo-500 bg-indigo-50/20' : 'border-slate-200'}`}>
                      <input
                        type="file"
                        onChange={(e) => setFile(e.target.files[0])}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                      <div className="flex flex-col items-center gap-1.5">
                        {file ? (
                          <>
                            <FileCheck size={28} className="text-indigo-600" />
                            <div className="text-[11px] font-bold text-indigo-700 truncate max-w-full px-2">{file.name}</div>
                            <button onClick={(e) => { e.stopPropagation(); setFile(null); }} className="text-[10px] text-rose-500 hover:underline font-black uppercase tracking-widest">Remove File</button>
                          </>
                        ) : editingRecord?.proofUrl ? (
                          <>
                            <CheckCircle2 size={28} className="text-emerald-500" />
                            <div className="text-[11px] font-bold text-emerald-700">Proof Already Attached</div>
                            <p className="text-[9px] text-slate-400 font-black uppercase tracking-[0.2em]">Select New to Replace</p>
                          </>
                        ) : (
                          <>
                            <Upload size={24} className="text-slate-300 mx-auto" />
                            <p className="text-[11px] text-slate-500 font-bold">PDF, JPG, PNG up to 10MB</p>
                            <p className="text-[9px] text-slate-300 font-black uppercase tracking-[0.2em]">Click to Select Proof</p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase">Tenant</label>
                      <select
                        name="tenantId"
                        required
                        value={selectedTenantId}
                        onChange={(e) => {
                          const tid = e.target.value;
                          setSelectedTenantId(tid);
                          const tenant = tenants.find(t => t.id === parseInt(tid));
                          const unitIdToUse = tenant?.unitId || tenant?.bedroomLease?.unitId || '';
                          setSelectedUnitId(unitIdToUse);
                        }}
                        className={`px-4 py-2 rounded-lg border outline-none focus:border-indigo-500 font-medium bg-white ${editingRecord ? 'bg-slate-50 text-slate-500 border-slate-100' : 'border-slate-200'}`}
                        disabled={!!editingRecord}
                      >
                        <option value="">Select Tenant</option>
                        {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                      {editingRecord && <input type="hidden" name="tenantId" value={selectedTenantId} />}
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase">Unit</label>
                      <div className="relative">
                        <select
                          name="unitId"
                          required
                          value={selectedUnitId}
                          onChange={(e) => setSelectedUnitId(e.target.value)}
                          className={`w-full px-4 py-2 rounded-lg border outline-none focus:border-indigo-500 font-medium bg-white ${editingRecord ? 'bg-slate-50 text-slate-500 border-slate-100' : 'border-slate-200'}`}
                          disabled={!!editingRecord}
                        >
                          <option value="">Select Unit</option>
                          {units.map(u => (
                            <option key={u.id} value={u.id}>{u.unitNumber || u.name}</option>
                          ))}
                        </select>
                        {editingRecord && <input type="hidden" name="unitId" value={selectedUnitId} />}
                      </div>
                    </div>
                  </div>

                  {loadingCalc && <div className="text-center text-xs text-slate-400 font-bold animate-pulse">Calculating refund recommendations...</div>}

                  {calcData && (
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 animate-in fade-in duration-300">
                      <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest mb-3 border-b border-slate-200 pb-1 flex items-center gap-1">
                        <Clock size={14} className="text-slate-500" /> System Calculation (Prioritized)
                      </h4>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-xs font-bold text-slate-600">
                          <span>Security Deposit Held:</span>
                          <span className="text-emerald-600 font-mono tracking-tight">$ {calcData.availableDeposit?.toLocaleString('en-CA')}</span>
                        </div>

                        {calcData.proposedAllocations && calcData.proposedAllocations.length > 0 && (
                          <div className="pt-2 border-t border-slate-100">
                            <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Deductions Table</label>
                            {calcData.proposedAllocations.map(alloc => (
                              <div key={alloc.invoiceId} className="flex justify-between items-center text-[11px] font-medium text-slate-500 mb-1">
                                <span className="flex items-center gap-1">
                                  <Receipt size={10} /> {alloc.invoiceNo} ({alloc.category})
                                </span>
                                <span className="text-rose-500 font-mono">-$ {alloc.amount?.toLocaleString('en-CA')}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="border-t border-dashed border-slate-200 pt-2 flex justify-between items-center font-black text-slate-800">
                          <span className="text-xs uppercase">Payable Refund:</span>
                          <span className="text-sm font-black text-indigo-600 font-mono">
                            $ {calcData.finalRefundAmount?.toLocaleString('en-CA')}
                          </span>
                        </div>
                      </div>
                      <div className="mt-2 text-[10px] text-slate-400 font-semibold italic">Priority: 1. Service Fees, 2. Rent, 3. Refund.</div>
                    </div>
                  )}

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">Amount</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                      <input
                        name="amount"
                        type="number"
                        step="0.01"
                        value={amountValue}
                        onChange={(e) => setAmountValue(e.target.value)}
                        required
                        className="w-full pl-8 pr-4 py-2 rounded-lg border border-slate-200 outline-none focus:border-indigo-500 font-medium"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">Refund Outcome / Reason</label>
                    <select
                      name="outcomeReason"
                      defaultValue={editingRecord?.outcomeReason || 'Pending review'}
                      className="px-4 py-2 rounded-lg border border-slate-200 outline-none focus:border-indigo-500 font-medium bg-white"
                    >
                      <option value="Pending review">Pending review</option>
                      <option value="Full refund">Full refund</option>
                      <option value="Partial refund after service charges">Partial refund after service charges</option>
                      <option value="No refund – charges exceeded deposit">No refund – charges exceeded deposit</option>
                      <option value="Cancelled – lease renewed">Cancelled – lease renewed</option>
                      <option value="Cancelled – deposit transferred to new lease">Cancelled – deposit transferred to new lease</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">Notes / Description</label>
                    <textarea name="reason" rows="3" defaultValue={editingRecord?.reason || ''} required className="px-4 py-2 rounded-lg border border-slate-200 outline-none focus:border-indigo-500 font-medium resize-none" placeholder="Add custom notes here..."></textarea>
                  </div>
                </div>

                <div className="p-6 bg-slate-50 flex justify-end gap-3 shrink-0 border-t border-slate-100">
                  <button className="px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 font-bold transition-all disabled:opacity-50" type="button" onClick={() => setShowModal(false)} disabled={saving}>Cancel</button>
                  <Button variant="primary" type="submit" disabled={saving}>
                    {saving ? 'Processing...' : 'Save Changes'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* VIEW MODAL (Enhanced) */}
        {selected && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white p-6 rounded-xl w-[520px] shadow-2xl animate-in zoom-in-95">
              <div className="flex items-center justify-between mb-6 pb-3 border-b border-slate-100">
                <h3 className="text-lg font-bold text-slate-800">{selected.type} Details</h3>
                <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
              </div>

              <div className="grid grid-cols-2 gap-y-4 gap-x-8 mb-6">
                <div className="flex flex-col"><label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Request ID</label><span className="text-md font-mono font-medium text-slate-900">{selected.id}</span></div>
                <div className="flex flex-col"><label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Status</label><span className="w-fit mt-1"><span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${['Completed', 'Issued', 'Received'].includes(selected.status) ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-orange-50 text-orange-700 border-orange-100'}`}>{selected.status}</span></span></div>
                <div className="flex flex-col"><label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Tenant</label><span className="text-sm font-medium text-slate-900">{selected.tenant}</span></div>
                <div className="flex flex-col"><label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Unit</label><span className="text-sm font-medium text-slate-900">{selected.unit}</span></div>
                <div className="flex flex-col"><label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Outcome / Reason</label><span className="text-sm font-semibold text-indigo-600 mt-1">{selected.outcomeReason}</span></div>
                <div className="flex flex-col"><label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Request Date</label><span className="text-sm font-medium text-slate-900">{selected.date}</span></div>

                <div className="flex flex-col border-t border-slate-100 pt-3"><label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Issued Date</label><span className="text-sm font-medium text-slate-900">{selected.issuedDate || '—'}</span></div>
                <div className="flex flex-col border-t border-slate-100 pt-3"><label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Method</label><span className="text-sm font-medium text-slate-900">{selected.method || '—'}</span></div>
                <div className="flex flex-col"><label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Reference #</label><span className="text-sm font-medium text-slate-900">{selected.referenceNumber || '—'}</span></div>
                <div className="flex flex-col">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Proof Link</label>
                  {selected.proofUrl ? (
                    <button
                      onClick={() => {
                        const token = localStorage.getItem('accessToken');
                        const base = (api.defaults.baseURL || '').replace(/\/$/, '');
                        const downloadUrl = `${base}/api/admin/documents/download-proof?url=${encodeURIComponent(selected.proofUrl)}&token=${token}&disposition=inline`;
                        window.open(downloadUrl, '_blank');
                      }}
                      className="text-xs text-indigo-600 font-bold hover:underline underline-offset-4 truncate mt-1 text-left flex items-center gap-1.5 bg-transparent border-none cursor-pointer p-0 group"
                    >
                      <Download size={14} className="group-hover:-translate-y-0.5 transition-transform" /> 
                      Click to Download / View
                    </button>
                  ) : (
                    <span className="text-sm text-slate-400 font-medium">— No proof attached</span>
                  )}
                </div>

                <div className="flex flex-col col-span-2 border-t border-slate-100 pt-3"><label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Notes / Description</label><span className="text-sm text-slate-700 mt-1">{selected.reason || '—'}</span></div>

                <div className={`col-span-2 mt-2 p-4 rounded-xl text-center text-2xl font-black border ${selected.amount < 0 ? 'bg-amber-50 text-amber-800 border-amber-100' : 'bg-cyan-50 text-cyan-800 border-cyan-100'}`}>
                  ${Math.abs(selected.amount || 0).toLocaleString('en-CA')}
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button variant="secondary" onClick={() => setSelected(null)}>Close</Button>
              </div>
            </div>
          </div>
        )}

      </div>
    </MainLayout>
  );
};

export default RefundsAdjustments;
