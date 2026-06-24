import { useState, useEffect } from 'react';
import { MainLayout } from '../layouts/MainLayout';
import { FiPlus, FiEdit, FiX, FiTrash2 } from 'react-icons/fi';
import api from '../api/client';
import { hasPermission } from '../utils/permissions';
import { AccessControl } from '../components/AccessControl';

export const ChartOfAccounts = () => {
  const [__forceUpdate, __setForceUpdate] = useState(0);
  useEffect(() => {
    const handleUpdate = () => __setForceUpdate(p => p + 1);
    window.addEventListener('permissionsUpdated', handleUpdate);
    return () => window.removeEventListener('permissionsUpdated', handleUpdate);
  }, []);

  if (!hasPermission('Chart of Accounts', 'view')) {
    return (
        <MainLayout title="Permission Denied">
            <div className="p-12 text-center bg-white rounded-[2rem] border border-slate-100 shadow-sm mt-8">
                <h3 className="text-xl font-black text-slate-800">Access Restricted</h3>
                <p className="max-w-md mx-auto mt-2 text-slate-500 font-medium italic">
                    You do not have permission to view this section. Please contact your administrator.
                </p>
            </div>
        </MainLayout>
    );
  }

  const [filter, setFilter] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [editIndex, setEditIndex] = useState(null);

  const [form, setForm] = useState({
    name: '',
    type: 'Asset',
    balance: '',
  });

  const [accounts, setAccounts] = useState([]);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const res = await api.get('/api/admin/accounts');
      setAccounts(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const openAddModal = () => {
    setEditIndex(null);
    setForm({ name: '', type: 'Asset', balance: '' });
    setShowModal(true);
  };

  const openEditModal = (acc, index) => {
    setEditIndex(index);
    setForm(acc);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.balance) {
      alert('Please fill all fields');
      return;
    }

    try {
      const payload = {
        accountName: form.name,
        assetType: form.type,
        openingBalance: form.balance
      };

      if (editIndex !== null) {
        const accountId = accounts[editIndex].id;
        await api.patch(`/api/admin/accounts/${accountId}`, payload);
      } else {
        await api.post('/api/admin/accounts', payload);
      }

      fetchAccounts();
      setShowModal(false);
    } catch (e) {
      alert('Error saving account');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this account?')) return;
    try {
      await api.delete(`/api/admin/accounts/${id}`);
      fetchAccounts();
    } catch (e) {
      alert('Error deleting account');
    }
  };

  const filteredAccounts =
    filter === 'All'
      ? accounts
      : accounts.filter((a) => a.assetType === filter);

  return (
    <MainLayout title="Company Chart of Accounts">
      <div className="p-6 animate-[fadeIn_0.4s_ease-in-out]">

        {/* HEADER */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex gap-2.5">
            {['All', 'Asset', 'Income', 'Expense'].map((t) => (
              <button
                key={t}
                className={`py-2 px-3.5 rounded-lg border text-sm cursor-pointer transition-all duration-250 ${filter === t
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-700'
                  }`}
                onClick={() => setFilter(t)}
              >
                {t}
              </button>
            ))}
          </div>

          {hasPermission('Chart of Accounts', 'add') && (
              <button
                className="flex items-center gap-1.5 bg-green-600 text-white py-2.5 px-3.5 rounded-lg text-sm cursor-pointer border-none transition-all duration-250 hover:bg-green-700 hover:-translate-y-px"
                onClick={openAddModal}
              >
                <FiPlus /> Add New Account
              </button>
          )}
        </div>

        {/* ACCOUNT CARDS */}
        <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4.5">
          {filteredAccounts.map((acc, index) => (
            <div
              key={index}
              className={`rounded-xl p-4.5 bg-white shadow-[0_6px_20px_rgba(0,0,0,0.06)] relative transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_14px_32px_rgba(0,0,0,0.08)] border-l-[5px] ${acc.type === 'Asset' ? 'border-l-blue-600' :
                acc.type === 'Income' ? 'border-l-green-600' : 'border-l-red-600'
                }`}
            >
              <div className="flex justify-between items-center">
                <h3 className="text-base font-semibold text-slate-900">{acc.accountName}</h3>
                <div className="flex gap-1.5 items-center">
                  {hasPermission('Chart of Accounts', 'edit') && (
                      <button
                        className="bg-none border-none cursor-pointer text-slate-500 text-base transition-colors duration-200 hover:text-indigo-600"
                        onClick={() => openEditModal({
                          name: acc.accountName,
                          type: acc.assetType,
                          balance: acc.openingBalance
                        }, index)}
                      >
                        <FiEdit />
                      </button>
                  )}
                  {hasPermission('Chart of Accounts', 'delete') && (
                      <button
                        className="bg-none border-none cursor-pointer text-slate-500 text-base transition-colors duration-200 hover:text-red-600"
                        onClick={() => handleDelete(acc.id)}
                      >
                        <FiTrash2 />
                      </button>
                  )}
                </div>
              </div>

              <p className="text-[13px] text-slate-500 mt-1.5">{acc.assetType}</p>
              <h2 className="text-[22px] font-bold my-2.5 text-slate-900">$ {Number(acc.openingBalance).toLocaleString('en-CA')}</h2>

              {/* MINI TREND BAR */}
              <div className="flex gap-1 items-end h-[30px]">
                <span className="w-1.5 bg-gradient-to-b from-indigo-600 to-indigo-400 rounded h-[10px] animate-[grow_1.2s_ease_infinite_alternate]" />
                <span className="w-1.5 bg-gradient-to-b from-indigo-600 to-indigo-400 rounded h-[18px] animate-[grow_1.2s_ease_infinite_alternate_0.2s]" />
                <span className="w-1.5 bg-gradient-to-b from-indigo-600 to-indigo-400 rounded h-[24px] animate-[grow_1.2s_ease_infinite_alternate_0.4s]" />
                <span className="w-1.5 bg-gradient-to-b from-indigo-600 to-indigo-400 rounded h-[14px] animate-[grow_1.2s_ease_infinite_alternate_0.6s]" />
              </div>
            </div>
          ))}
        </div>

        {/* MODAL */}
        {showModal && (
          <div className="fixed inset-0 bg-black/45 flex items-center justify-center z-[999] animate-[fadeIn_0.2s_ease]">
            <div className="bg-white w-[420px] rounded-xl shadow-2xl animate-[scaleIn_0.25s_ease]">
              <div className="p-4 border-b border-slate-200 flex justify-between items-center">
                <h3 className="text-base font-semibold text-slate-900">{editIndex !== null ? 'Edit Account' : 'Add Account'}</h3>
                <button onClick={() => setShowModal(false)} className="bg-none border-none cursor-pointer text-lg text-slate-500 hover:text-slate-800">
                  <FiX />
                </button>
              </div>

              <div className="p-5 flex flex-col gap-3.5">
                <input
                  placeholder="Account Name"
                  value={form.name}
                  onChange={(e) =>
                    setForm({ ...form, name: e.target.value })
                  }
                  className="p-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />

                <select
                  value={form.type}
                  onChange={(e) =>
                    setForm({ ...form, type: e.target.value })
                  }
                  className="p-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white"
                >
                  <option>Asset</option>
                  <option>Income</option>
                  <option>Expense</option>
                </select>

                <input
                  type="number"
                  placeholder="Opening Balance"
                  value={form.balance}
                  onChange={(e) =>
                    setForm({ ...form, balance: e.target.value })
                  }
                  className="p-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="p-4 flex justify-end gap-2.5">
                <button onClick={() => setShowModal(false)} className="py-2 px-3.5 rounded-lg border-none cursor-pointer bg-slate-100 text-slate-700 hover:bg-slate-200 font-medium text-sm">Cancel</button>
                <button className="py-2 px-3.5 rounded-lg border-none cursor-pointer bg-indigo-600 text-white hover:bg-indigo-700 font-medium text-sm" onClick={handleSave}>
                  Save Account
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};
















