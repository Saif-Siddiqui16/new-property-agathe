import React, { useState, useEffect } from 'react';
import { MainLayout } from '../layouts/MainLayout';
import { Eye, CreditCard, X, Search, Filter } from 'lucide-react';
import { Button } from '../components/Button';
import api from '../api/client';
import { hasPermission } from '../utils/permissions';

const OutstandingDues = () => {
  const [__forceUpdate, __setForceUpdate] = useState(0);
  useEffect(() => {
    const handleUpdate = () => __setForceUpdate(p => p + 1);
    window.addEventListener('permissionsUpdated', handleUpdate);
    return () => window.removeEventListener('permissionsUpdated', handleUpdate);
  }, []);

  const [dues, setDues] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBuilding, setSelectedBuilding] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  if (!hasPermission('Outstanding Dues', 'view')) return null;

  useEffect(() => {
    fetchDues();
    fetchBuildings();
  }, []);

  const fetchBuildings = async () => {
    try {
      const res = await api.get('/api/admin/properties');
      setBuildings(res.data?.data || res.data || []);
    } catch (error) {
      console.error('Error fetching buildings:', error);
    }
  };

  const fetchDues = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/admin/outstanding-dues');
      setDues(response.data?.data || response.data || []);
    } catch (error) {
      console.error('Error fetching outstanding dues:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter Logic
  const filteredDues = dues.filter(d => {
    const matchesSearch = (d.tenant?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || 
                          (d.unit?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                          (d.invoice?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    
    const matchesBuilding = !selectedBuilding || d.propertyId?.toString() === selectedBuilding.toString();
    
    return matchesSearch && matchesBuilding;
  });

  // Pagination Logic
  const totalPages = Math.ceil(filteredDues.length / itemsPerPage);
  const currentDues = filteredDues.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ amount: '', paymentMethod: 'Cash' });

  const handleRecordPayment = async () => {
    if (!selectedInvoice || !paymentForm.amount) {
      alert('Please enter a valid amount');
      return;
    }

    try {
      await api.post('/api/admin/payments', {
        invoiceId: selectedInvoice.id,
        amount: paymentForm.amount,
        paymentMethod: paymentForm.paymentMethod
      });
      alert('Payment recorded successfully');
      setShowPaymentModal(false);
      setSelectedInvoice(null);
      setPaymentForm({ amount: '', paymentMethod: 'Cash' });
      fetchDues();

    } catch (error) {
      console.error('Error recording payment:', error);
      alert('Failed to record payment');
    }
  };

  return (
    <MainLayout title="Outstanding Dues">
      <div className="p-0">

        {/* SEARCH & FILTER BAR */}
        <div className="mb-6 flex flex-wrap items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
          <div className="relative flex-1 min-w-[280px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text"
              placeholder="Search Tenant, Unit or Invoice..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-primary-500/10 focus:border-primary-500 outline-none transition-all"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            />
          </div>

          <div className="flex items-center gap-2 min-w-[200px]">
            <Filter size={16} className="text-slate-400" />
            <select 
              className="flex-1 p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500/10"
              value={selectedBuilding}
              onChange={(e) => { setSelectedBuilding(e.target.value); setCurrentPage(1); }}
            >
              <option value="">All Buildings</option>
              {buildings.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          {searchTerm && (
            <button 
              onClick={() => { setSearchTerm(''); setCurrentPage(1); }}
              className="text-xs font-bold text-rose-500 hover:text-rose-700 underline"
            >
              Clear
            </button>
          )}
        </div>

        {/* TABLE */}
        <div className="bg-white rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.06)] overflow-hidden border border-gray-100">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="p-4 bg-slate-50 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-gray-100 whitespace-nowrap">Invoice</th>
                  <th className="p-4 bg-slate-50 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-gray-100 whitespace-nowrap">Tenant</th>
                  <th className="p-4 bg-slate-50 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-gray-100 whitespace-nowrap">Unit</th>
                  <th className="p-4 bg-slate-50 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-gray-100 whitespace-nowrap">Type</th>
                  <th className="p-4 bg-slate-50 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-gray-100 whitespace-nowrap">Lease Type</th>
                  <th className="p-4 bg-slate-50 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-gray-100 whitespace-nowrap">Amount</th>
                  <th className="p-4 bg-slate-50 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-gray-100 whitespace-nowrap">Due Date</th>
                  <th className="p-4 bg-slate-50 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-gray-100 whitespace-nowrap">Status</th>
                  <th className="p-4 bg-slate-50 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-gray-100 whitespace-nowrap">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-50">
                {currentDues.length > 0 ? (
                  currentDues.map((d) => (
                    <tr key={d.invoice} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 text-sm text-slate-700 font-mono font-medium whitespace-nowrap">{d.invoice}</td>
                      <td className="p-4 text-sm text-slate-700 whitespace-nowrap">{d.tenant}</td>
                      <td className="p-4 text-sm text-slate-700 whitespace-nowrap">{d.unit}</td>
                      <td className="p-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                          d.category === 'DEPOSIT' || d.category === 'SECURITY_DEPOSIT'
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : d.category === 'SERVICE'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                        }`}>
                          { (d.category === 'DEPOSIT' || d.category === 'SECURITY_DEPOSIT') ? 'Deposit' : d.category === 'SERVICE' ? 'Service' : 'Rent'}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-slate-500 whitespace-nowrap">{d.leaseType}</td>
                      <td className="p-4 text-sm font-bold font-mono text-slate-900 whitespace-nowrap italic">$ {d.amount.toLocaleString('en-CA')}</td>
                      <td className="p-4 text-sm text-slate-600 whitespace-nowrap">{d.dueDate}</td>
                      <td className="p-4 text-sm">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border whitespace-nowrap ${d.status === 'Overdue'
                          ? 'bg-rose-50 text-rose-700 border-rose-100'
                          : d.status === 'Partial'
                            ? 'bg-amber-50 text-amber-700 border-amber-100'
                            : 'bg-orange-50 text-orange-700 border-orange-100'
                          }`}>
                          {d.status}
                          {d.daysOverdue > 0 && d.status !== 'Partial' && ` (${d.daysOverdue} days)`}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <button onClick={() => setSelectedInvoice(d)} className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-slate-100 rounded-lg transition-all">
                            <Eye size={16} />
                          </button>
                          {hasPermission('Outstanding Dues', 'add') && (
                            <button
                              onClick={() => {
                                setSelectedInvoice(d);
                                setPaymentForm({ amount: d.amount.toString(), paymentMethod: 'Cash' });
                                setShowPaymentModal(true);
                              }}
                              title="Record Payment"
                              className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-slate-100 rounded-lg transition-all"
                            >
                              <CreditCard size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="p-12 text-center">
                      <div className="flex flex-col items-center gap-2 opacity-40">
                        <Search size={48} />
                        <p className="text-lg font-bold">No outstanding dues found</p>
                        <p className="text-sm">Try adjusting your search or filters</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* PAGINATION UI (1 2 3 format) */}
        {totalPages > 1 && (
          <div className="mt-8 flex justify-center items-center gap-2 pb-10">
            {[...Array(totalPages)].map((_, idx) => (
              <button
                key={idx + 1}
                onClick={() => {
                  setCurrentPage(idx + 1);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`w-10 h-10 rounded-xl text-sm font-black transition-all border ${
                  currentPage === idx + 1 
                  ? 'bg-primary-600 text-white border-primary-600 shadow-lg shadow-primary-100' 
                  : 'bg-white text-slate-500 border-slate-100 hover:border-primary-300 hover:text-primary-600'
                }`}
              >
                {idx + 1}
              </button>
            ))}
          </div>
        )}

        {/* VIEW INVOICE MODAL */}
        {selectedInvoice && (
          <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-[100] backdrop-blur-md animate-in fade-in px-4">
            <div className="bg-white p-8 rounded-3xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 border border-slate-200">
              <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100">
                <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tight">Invoice Details</h3>
                <button onClick={() => setSelectedInvoice(null)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400">
                  <X size={20} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-6 mb-8">
                <div className="flex flex-col"><label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Invoice No</label><span className="text-sm font-bold text-slate-800 font-mono">{selectedInvoice.invoice}</span></div>
                <div className="flex flex-col"><label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Tenant</label><span className="text-sm font-bold text-slate-800">{selectedInvoice.tenant}</span></div>
                <div className="flex flex-col"><label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Unit</label><span className="text-sm font-bold text-slate-800">{selectedInvoice.unit}</span></div>
                <div className="flex flex-col"><label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Due Date</label><span className="text-sm font-bold text-rose-600 underline underline-offset-4 decoration-2">{selectedInvoice.dueDate}</span></div>
                
                <div className="col-span-2 p-6 rounded-2xl bg-rose-50 border border-rose-100 text-center shadow-inner">
                  <p className="text-[10px] font-black uppercase tracking-widest text-rose-400 mb-1">Balance Remaining</p>
                  <p className="text-3xl font-black text-rose-700 font-mono italic">$ {selectedInvoice.amount.toLocaleString('en-CA')}</p>
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="secondary" className="flex-1 rounded-2xl" onClick={() => setSelectedInvoice(null)}>
                  Close
                </Button>
                {hasPermission('Outstanding Dues', 'add') && (
                  <Button className="flex-[2] rounded-2xl shadow-xl shadow-primary-100" onClick={() => {
                    setPaymentForm({ amount: selectedInvoice.amount.toString(), paymentMethod: 'Cash' });
                    setShowPaymentModal(true);
                  }}>
                    Record Payment
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* RECORD PAYMENT MODAL */}
        {showPaymentModal && selectedInvoice && (
          <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-[110] backdrop-blur-md animate-in fade-in px-4">
            <div className="bg-white p-8 rounded-3xl w-full max-w-md shadow-2xl animate-in zoom-in-95 border border-slate-200">
              <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100">
                <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tight">Collect Payment</h3>
                <button onClick={() => setShowPaymentModal(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-6 mb-8">
                <label className="flex flex-col gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Payment Amount ($)</span>
                  <input
                    type="number"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                    placeholder="0.00"
                    className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-lg font-black font-mono focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none transition-all"
                  />
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Method</span>
                  <select
                    value={paymentForm.paymentMethod}
                    onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                    className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-sm font-bold focus:ring-4 focus:ring-primary-500/10 outline-none transition-all"
                  >
                    <option>Cash</option>
                    <option>Check</option>
                    <option>Bank Transfer</option>
                    <option>Credit Card</option>
                    <option>Debit Card</option>
                  </select>
                </label>
              </div>

              <div className="flex gap-3">
                <Button variant="secondary" className="flex-1 rounded-2xl" onClick={() => setShowPaymentModal(false)}>
                  Cancel
                </Button>
                <Button className="flex-[2] rounded-2xl shadow-xl shadow-primary-100" onClick={handleRecordPayment}>
                  Confirm Payment
                </Button>
              </div>
            </div>
          </div>
        )}

      </div>
    </MainLayout>
  );
};

export default OutstandingDues;
