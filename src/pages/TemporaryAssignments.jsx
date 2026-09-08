import React, { useState, useEffect } from 'react';
import { MainLayout } from '../layouts/MainLayout';
import { Button } from '../components/Button';
import { Search, Home, Building2, Calendar, User, Clock, CheckCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/client';

export const TemporaryAssignments = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState([]);
  const [filterStatus, setFilterStatus] = useState('Active'); // Active, Completed
  const [search, setSearch] = useState('');

  const [__forceUpdate, __setForceUpdate] = useState(0);
  useEffect(() => {
    const handleUpdate = () => __setForceUpdate(p => p + 1);
    window.addEventListener('permissionsUpdated', handleUpdate);
    return () => window.removeEventListener('permissionsUpdated', handleUpdate);
  }, []);

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/admin/temporary-assignments');
      setAssignments(res.data.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filtered = assignments.filter(a => {
    if (filterStatus === 'Active' && a.status === 'Completed') return false;
    if (filterStatus === 'Completed' && a.status !== 'Completed') return false;
    
    if (search) {
      const q = search.toLowerCase();
      const tenantName = a.tenant?.name?.toLowerCase() || '';
      const unitName = a.unit?.name?.toLowerCase() || '';
      const tempUnitName = a.temp_unit?.name?.toLowerCase() || '';
      if (!tenantName.includes(q) && !unitName.includes(q) && !tempUnitName.includes(q)) {
        return false;
      }
    }
    return true;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Active':
        return <span className="shrink-0 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full text-xs font-bold uppercase tracking-wider">Active</span>;
      case 'Ending Soon':
        return <span className="shrink-0 px-3 py-1 bg-amber-50 text-amber-700 border border-amber-100 rounded-full text-xs font-bold uppercase tracking-wider">Ending Soon</span>;
      case 'Overdue':
        return <span className="shrink-0 px-3 py-1 bg-red-50 text-red-700 border border-red-100 rounded-full text-xs font-bold uppercase tracking-wider">Overdue</span>;
      case 'Completed':
        return <span className="shrink-0 px-3 py-1 bg-slate-50 text-slate-600 border border-slate-200 rounded-full text-xs font-bold uppercase tracking-wider">Completed</span>;
      default:
        return null;
    }
  };

  return (
    <MainLayout title="Temporary Assignments">
      <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full pb-12 animate-in fade-in duration-300">
        
        {/* Header & Controls */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 bg-slate-100/50 p-1 rounded-xl w-full md:w-auto overflow-x-auto">
            <button 
              onClick={() => setFilterStatus('Active')}
              className={`px-4 py-2 text-sm font-bold rounded-lg transition-all whitespace-nowrap ${filterStatus === 'Active' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
            >
              Active Assignments
            </button>
            <button 
              onClick={() => setFilterStatus('Completed')}
              className={`px-4 py-2 text-sm font-bold rounded-lg transition-all whitespace-nowrap ${filterStatus === 'Completed' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
            >
              Completed
            </button>
          </div>

          <div className="relative w-full md:w-72 shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search tenant or unit..." 
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 transition-colors text-sm font-medium"
            />
          </div>
        </div>

        {/* Dashboard Cards/Table */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-100 shadow-sm flex flex-col items-center">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="text-slate-400" size={32} />
            </div>
            <h3 className="text-lg font-bold text-slate-700 mb-2">No Assignments Found</h3>
            <p className="text-slate-500 text-sm max-w-sm">
              {filterStatus === 'Active' 
                ? "There are currently no active temporary unit assignments." 
                : "There are no completed temporary unit assignments matching your search."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filtered.map(assignment => (
              <div 
                key={assignment.id} 
                onClick={() => navigate(`/tenants/${assignment.tenantId}`)}
                className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all cursor-pointer group flex flex-col gap-5"
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center font-bold shrink-0">
                      <User size={20} />
                    </div>
                    <div className="truncate">
                      <h4 className="font-bold text-slate-800 group-hover:text-indigo-600 transition-colors truncate">{assignment.tenant?.name}</h4>
                      <p className="text-xs text-slate-500 truncate">{assignment.tenant?.email}</p>
                    </div>
                  </div>
                  {getStatusBadge(assignment.status)}
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-50">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Contracted Unit</p>
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                      <Building2 size={14} className="text-slate-400 shrink-0" />
                      <span className="truncate">{assignment.unit?.name || `Unit ${assignment.unitId}`}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-1">Temporary Unit</p>
                    <div className="flex items-center gap-2 text-sm font-bold text-indigo-700">
                      <Home size={14} className="text-indigo-400 shrink-0" />
                      <span className="truncate">{assignment.temp_unit?.name || `Unit ${assignment.temp_unit_id}`}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-xl p-4 flex justify-between items-center mt-auto">
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-slate-400 shrink-0" />
                    <span className="text-xs font-bold text-slate-600">
                      {assignment.startDate 
                        ? (!isNaN(new Date(assignment.startDate).getTime()) 
                            ? new Date(assignment.startDate).toLocaleDateString() 
                            : assignment.startDate)
                        : 'N/A'}
                    </span>
                  </div>
                  <div className="text-slate-300">→</div>
                  <div className="flex items-center gap-2">
                    <Clock size={14} className={assignment.status === 'Overdue' ? 'text-red-400 shrink-0' : 'text-slate-400 shrink-0'} />
                    <span className={`text-xs font-bold ${assignment.status === 'Overdue' ? 'text-red-600' : 'text-slate-600'}`}>
                      {assignment.expectedEndDate 
                        ? (!isNaN(new Date(assignment.expectedEndDate).getTime())
                            ? new Date(assignment.expectedEndDate).toLocaleDateString()
                            : assignment.expectedEndDate)
                        : 'TBD'}
                    </span>
                  </div>
                </div>

                {assignment.temp_reason && (
                  <p className="text-xs text-slate-500 italic text-center w-full truncate">
                    "{assignment.temp_reason}"
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

      </div>
    </MainLayout>
  );
};
