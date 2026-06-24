import React, { useState, useEffect } from 'react';
import { MainLayout } from '../layouts/MainLayout';
import api from '../api/client';
import { 
  CheckCircle, 
  AlertTriangle, 
  Search,
  Settings as SettingsIcon,
  Download,
  Calendar,
  Building2,
  ChevronRight,
  Filter
} from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

// Timezone-safe date parser: extracts YYYY-MM-DD and parses at local noon.
// This prevents UTC midnight dates from shifting back 1 day in Canadian timezones (UTC-3:30 to UTC-8).
const safeDate = (dateStr) => {
  if (!dateStr) return null;
  const datePart = String(dateStr).substring(0, 10); // e.g. "2026-04-01"
  return new Date(datePart + 'T12:00:00');           // local noon = same day in all of Canada
};

const UnitReadiness = () => {
  const navigate = useNavigate();
  const [units, setUnits] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [stats, setStats] = useState({ totalUnits: 0, readyForLeasing: 0, reservedUnits: 0, overdueUnits: 0 });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [propertyFilter, setPropertyFilter] = useState('');
  const [showLeasedUnits, setShowLeasedUnits] = useState(false);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [showHolidays, setShowHolidays] = useState(false);
  const [holidays, setHolidays] = useState([]);
  const [showReserveModal, setShowReserveModal] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [newHoliday, setNewHoliday] = useState({ name: '', date: '' });
  const [timelineSettings, setTimelineSettings] = useState([]);
  const [recalculateAll, setRecalculateAll] = useState(false);
  const limit = 15;

  useEffect(() => {
    fetchData();
    fetchSettings();
  }, [searchTerm, statusFilter, page, propertyFilter, showLeasedUnits]);

  useEffect(() => {
    fetchBuildings();
  }, []);

  const fetchBuildings = async () => {
    try {
      const res = await api.get('/api/admin/readiness/buildings');
      setBuildings(res.data);
    } catch (err) { console.error('Error fetching buildings', err); }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      // 1. Fetch Summary Stats - Dedicated Readiness Stats
      const statsRes = await api.get('/api/admin/readiness/stats', {
        params: { propertyId: propertyFilter, showLeased: showLeasedUnits }
      });
      setStats({
        totalUnits: statsRes.data.totalUnits,
        readyForLeasing: statsRes.data.readyForLeasing,
        reservedUnits: statsRes.data.reservedUnits,
        overdueUnits: statsRes.data.overdueUnits
      });

      // 2. Fetch Dashboard Units
      const response = await api.get(`/api/admin/readiness/dashboard`, {
        params: { 
          search: searchTerm, 
          status: statusFilter, 
          propertyId: propertyFilter,
          showLeased: showLeasedUnits,
          page, 
          limit 
        }
      });
      setUnits(response.data.units || []);
      setTotalCount(response.data.total || 0);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const resp = await api.get('/api/admin/readiness/settings');
      setTimelineSettings(resp.data);
      const hResp = await api.get('/api/admin/readiness/holidays');
      setHolidays(hResp.data);
    } catch (err) { console.error(err); }
  };

  const handleAddHoliday = async () => {
    if (!newHoliday.name || !newHoliday.date) return;
    try {
      await api.post('/api/admin/readiness/holidays', newHoliday);
      setNewHoliday({ name: '', date: '' });
      fetchSettings();
    } catch (err) { alert('Error adding holiday'); }
  };

  const handleDeleteHoliday = async (id) => {
    try {
      await api.delete(`/api/admin/readiness/holidays/${id}`);
      fetchSettings();
    } catch (err) { alert('Error deleting holiday'); }
  };

  const saveSettings = async () => {
    try {
      if (recalculateAll && !window.confirm("This will recalculate target dates for all units currently in construction. Existing manual dates won't be changed unless you haven't marked them. Proceed?")) {
          return;
      }
      await api.put('/api/admin/readiness/settings', { 
          settings: timelineSettings,
          triggerRecalculate: recalculateAll
      });
      setShowSettings(false);
      fetchData();
    } catch (err) { alert('Error saving settings'); }
  };

  const handleUpdateStep = async (unitId, stepKey, completed, recalculate = false, force = false, targetDate = null) => {
    try {
      const payload = {
        stepKey,
        completed,
        recalculate,
        targetDate,
        isManual: !!targetDate
      };
      if (force) payload.force = true;

      await api.put(`/api/admin/readiness/update-step/${unitId}`, payload);
      fetchData(); // Refresh UI
    } catch (err) {
      if (err.response?.status === 409) {
          // Manual Override Prompt
          if (window.confirm(`${err.response.data.message}\n\nExisting: ${err.response.data.current ? format(safeDate(err.response.data.current), 'MMM d') : 'None'}\nProposed: ${format(safeDate(err.response.data.proposed), 'MMM d')}\n\nDo you want to OVERWRITE this manual entry?`)) {
              handleUpdateStep(unitId, stepKey, completed, recalculate, true);
          }
      } else {
          const msg = err.response?.data?.message || 'Error updating step';
          alert(msg);
      }
    }
  };

  const getStepStatus = (unit, stepKey, idx) => {
    const isCompleted = unit.completion?.[stepKey];
    // Always get the target date if it exists, regardless of completion status
    const targetDateValue = unit.targetDates && unit.targetDates[stepKey] ? new Date(unit.targetDates[stepKey]) : null;
    
    // Strict Overdue Logic: Not completed AND the target date is strictly in the past (ignoring today)
    const today = new Date();
    today.setHours(0,0,0,0);
    const isOverdue = !isCompleted && targetDateValue && targetDateValue < today;
    
    // Logic for Locked: Purely visual now, we still show the date
    const stepsKeys = ['gc_delivered', 'gc_deficiencies', 'gc_cleaned', 'ffe_installed', 'final_cleaning', 'ose_installed', 'unit_ready'];
    const prevSteps = stepsKeys.slice(0, stepsKeys.indexOf(stepKey));
    const filteredPrev = prevSteps.filter(k => k !== 'gc_deficiencies');
    const isLocked = filteredPrev.some(key => !unit.completion?.[key]);

    if (isCompleted) return { icon: "🟢", label: "Completed", date: unit.targetDates?.[stepKey] };
    if (isOverdue) return { icon: "🔴", label: "Overdue", date: unit.targetDates?.[stepKey] };
    
    // Default fallback is "Gray" for ALL uncompleted steps (Not Started / Upcoming)
    // The client specifically asked to "stay in the gray" during this phase.
    return { icon: "⚪", label: "Upcoming", date: unit.targetDates?.[stepKey] || null, isLocked };
  };

  const handleExport = () => {
     // Helper for CSV export
  };

  return (
    <MainLayout title="Unit Readiness Dashboard">
      <div className="bg-slate-50 min-h-screen font-sans -ml-4 lg:-ml-8 -mt-4 lg:-mt-8">
        <div className="w-full space-y-4">
          
          {/* Settings Modal */}
          {showSettings && (
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-indigo-600 text-white">
                  <h2 className="text-xl font-bold">Timeline Engine Settings</h2>
                  <button onClick={() => setShowSettings(false)} className="hover:rotate-90 transition-all">✕</button>
                </div>
                <div className="p-6 space-y-4">
                  {timelineSettings.map((s, idx) => {
                    const labelMap = {
                      'gc_to_deficiencies': 'GC Delivered to Deficiencies',
                      'deficiencies_to_cleaned': 'Deficiencies to GC Complete',
                      'cleaned_to_ffe': 'GC Complete to FF&E Installed',
                      'ffe_to_final': 'FF&E to Final Cleaning',
                      'final_to_ose': 'Final Cleaning to OS&E',
                      'ose_to_ready': 'OS&E to Unit Ready'
                    };
                    return (
                      <div key={s.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="flex flex-col">
                          <span className="text-xs font-black text-slate-400 uppercase tracking-tighter">Timeline Offset</span>
                          <span className="text-sm font-bold text-slate-700">{labelMap[s.key] || s.key.replace(/_/g, ' ')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input 
                            type="number" 
                            className="w-16 px-2 py-1 bg-white border border-slate-200 rounded-lg text-center font-black text-indigo-600 outline-none focus:ring-2 focus:ring-indigo-500"
                            value={s.days}
                            onChange={(e) => {
                              const newSets = [...timelineSettings];
                              newSets[idx].days = e.target.value;
                              setTimelineSettings(newSets);
                            }}
                          />
                          <span className="text-[10px] text-slate-400 font-bold uppercase">days</span>
                        </div>
                      </div>
                    );
                  })}

                  <label className="flex items-center justify-between p-3 bg-indigo-50 border border-indigo-100 rounded-xl cursor-pointer">
                    <span className="text-xs font-bold text-indigo-700 uppercase">Apply to all active units?</span>
                    <input 
                      type="checkbox" 
                      className="w-5 h-5 rounded text-indigo-600"
                      checked={recalculateAll}
                      onChange={(e) => setRecalculateAll(e.target.checked)}
                    />
                  </label>
                </div>
                <div className="p-6 bg-slate-50 flex gap-3">
                  <button onClick={() => setShowSettings(false)} className="flex-1 py-3 bg-white border border-slate-200 rounded-xl text-slate-600 font-bold hover:bg-slate-100 transition-all">Cancel</button>
                  <button onClick={saveSettings} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all">Save Changes</button>
                </div>
              </div>
            </div>
          )}

          {/* Holiday Modal */}
          {showHolidays && (
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-indigo-600 text-white">
                  <h2 className="text-xl font-bold">Canadian Holiday Calendar</h2>
                  <button onClick={() => setShowHolidays(false)} className="hover:rotate-90 transition-all">✕</button>
                </div>
                <div className="p-6 space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar">
                  <div className="flex gap-2 mb-4">
                     <input 
                       type="text" 
                       placeholder="Holiday Name"
                       className="flex-1 px-3 py-2 border rounded-lg text-sm font-bold"
                       value={newHoliday.name}
                       onChange={e => setNewHoliday({...newHoliday, name: e.target.value})}
                     />
                     <input 
                       type="date" 
                       className="px-3 py-2 border rounded-lg text-sm font-bold"
                       value={newHoliday.date}
                       onChange={e => setNewHoliday({...newHoliday, date: e.target.value})}
                     />
                     <button onClick={handleAddHoliday} className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100">Add</button>
                  </div>
                  {holidays.map((h) => (
                    <div key={h.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <div>
                        <p className="text-sm font-bold text-slate-700">{h.name}</p>
                        <p className="text-xs text-slate-400 font-bold">{format(safeDate(h.date), 'MMMM do, yyyy')}</p>
                      </div>
                      <button onClick={() => handleDeleteHoliday(h.id)} className="text-red-400 hover:text-red-600 text-xs font-bold px-2 py-1">Delete</button>
                    </div>
                  ))}
                  {holidays.length === 0 && <p className="text-center text-slate-400 text-xs py-4">No holidays added yet.</p>}
                </div>
                <div className="p-6 bg-slate-50">
                  <button onClick={() => setShowHolidays(false)} className="w-full py-3 bg-white border border-slate-200 rounded-xl text-slate-600 font-bold hover:bg-slate-100 transition-all">Close</button>
                </div>
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-0 border border-slate-300 rounded-lg overflow-hidden shadow-md">
            <div className="bg-[#D9E9FF] p-4 text-center border-r border-slate-300">
                <p className="text-xs font-bold text-slate-700 mb-1">Total Units</p>
                <p className="text-2xl font-black text-slate-900">{stats.totalUnits}</p>
            </div>
            <div className="bg-[#E2F0D9] p-4 text-center border-r border-slate-300">
                <p className="text-xs font-bold text-slate-700 mb-1">Ready for Leasing</p>
                <p className="text-2xl font-black text-slate-900">{stats.readyForLeasing}</p>
            </div>
            <div className="bg-[#FFF2CC] p-4 text-center border-r border-slate-300">
                <p className="text-xs font-bold text-slate-700 mb-1">Reserved</p>
                <p className="text-2xl font-black text-slate-900">{stats.reservedUnits}</p>
            </div>
            <div className="bg-[#FCE4D6] p-4 text-center">
                <p className="text-xs font-bold text-slate-700 mb-1">Overdue</p>
                <p className="text-2xl font-black text-slate-900">{stats.overdueUnits}</p>
            </div>
          </div>

          {/* Toolbar Section (Matching Units Page Design) */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
                {/* Building Filter */}
                <div className="relative min-w-[180px]">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <Building2 size={16} />
                  </div>
                  <select 
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 appearance-none cursor-pointer hover:bg-white transition-all"
                    value={propertyFilter}
                    onChange={(e) => { setPropertyFilter(e.target.value); setPage(1); }}
                  >
                    <option value="">All Buildings</option>
                    {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>

                {/* Status Filter */}
                <div className="relative min-w-[150px]">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <Filter size={16} />
                  </div>
                  <select 
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 appearance-none cursor-pointer hover:bg-white transition-all"
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                >
                  <option value="">All Statuses</option>
                  <option value="Occupied">Occupied</option>
                  <option value="Available">Available</option>
                  <option value="Reserved">Reserved</option>
                  <option value="INACTIVE">Inactive (Hold)</option>
                  <option value="ACTIVE">Active (In Construction)</option>
                </select>
                </div>

                {/* Search Bar */}
                <div className="relative min-w-[280px]">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <Search size={16} />
                  </div>
                  <input 
                    type="text"
                    placeholder="Search by unit or building..."
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 hover:bg-white transition-all"
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                  />
                </div>
            </div>

            <div className="flex items-center gap-4">
               {/* Show Leased Toggle (Rule 5) */}
               <label className="flex items-center gap-2 cursor-pointer bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
                  <span className="text-xs font-bold text-slate-500">Show Leased Units</span>
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                    checked={showLeasedUnits}
                    onChange={(e) => setShowLeasedUnits(e.target.checked)}
                  />
               </label>
              <button 
                  onClick={() => setShowHolidays(!showHolidays)}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
              >
                  <Calendar size={16} />
                  <span>Holidays</span>
              </button>
              <button 
                  onClick={() => setShowSettings(!showSettings)}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
              >
                  <SettingsIcon size={16} />
                  <span>Settings</span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-xl overflow-hidden border border-slate-200">
            {/* The Master Table (Fixed Scroll Fix) */}
            <div className="overflow-x-auto overflow-y-hidden custom-scrollbar">
              <table className="min-w-[1200px] w-full text-left border-collapse border border-slate-400">
                <thead>
                  {/* Category Header */}
                  <tr className="text-[11px] font-bold text-slate-800 text-center uppercase tracking-wider">
                    <th colSpan="3" className="bg-[#E2F0D9] border-b border-r border-slate-400 sticky left-0 z-30"></th>
                    <th colSpan="3" className="bg-[#D9D9D9] px-2 py-2 border-b border-r border-slate-400 tracking-widest font-black">GC</th>
                    <th colSpan="4" className="bg-[#DDEBF7] px-2 py-2 border-b border-r border-slate-400 tracking-widest font-black">Operations</th>
                    <th colSpan="5" className="bg-[#FCE4D6] px-2 py-2 border-b border-slate-400 tracking-widest font-black">Leasing / Summary</th>
                  </tr>
                  {/* Column Header */}
                  <tr className="text-[10px] font-black uppercase text-slate-700 text-center leading-tight">
                    <th className="bg-[#E2F0D9] px-1 py-3 border border-slate-400 sticky left-0 z-30 min-w-[60px]">Bldg</th>
                    <th className="bg-[#E2F0D9] px-1 py-3 border border-slate-400 sticky left-[60px] z-30 min-w-[60px]">Unit</th>
                    <th className="bg-[#E2F0D9] px-1 py-3 border border-slate-400 sticky left-[120px] z-30 min-w-[60px]">Type</th>
                    
                    {/* GC */}
                    <th className="bg-[#D9D9D9] px-1 py-3 border border-slate-400 w-16">GC Delivered</th>
                    <th className="bg-[#D9D9D9] px-1 py-3 border border-slate-400 w-16 font-black">GC Deficiencies</th>
                    <th className="bg-[#D9D9D9] px-1 py-3 border border-slate-400 w-16">GC Complete</th>
                    
                    {/* Ops (Rule 2 Sequence) */}
                    <th className="bg-[#DDEBF7] px-1 py-3 border border-slate-400 w-16">FF&E Installed</th>
                    <th className="bg-[#DDEBF7] px-1 py-3 border border-slate-400 w-16">Final Cleaning</th>
                    <th className="bg-[#DDEBF7] px-1 py-3 border border-slate-400 w-16">OS&E Installed</th>
                    <th className="bg-[#DDEBF7] px-1 py-3 border border-slate-400 w-16">Unit Ready</th>
                    
                    {/* Summary */}
                    <th className="bg-[#FCE4D6] px-1 py-3 border border-slate-400 tracking-tighter w-16">Days Late</th>
                    <th className="bg-[#FCE4D6] px-1 py-3 border border-slate-400 tracking-tighter w-40">Reserved</th>
                    <th className="bg-[#FCE4D6] px-1 py-3 border border-slate-400 tracking-tighter w-20">Move-In</th>
                    <th className="bg-[#FCE4D6] px-2 py-3 border border-slate-400 w-32">Status Note</th>
                    <th className="bg-[#FCE4D6] px-1 py-3 border border-slate-400 tracking-tighter w-16">Days on Market</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {units.map(unit => {
                    const allDone = Object.values(unit.completion || {}).filter(v => v).length === 7;
                    let statusNote = "";
 
                    if (unit.isPriority) {
                      statusNote = unit.stage || "Priority Blocked";
                    } else if (unit.reserved) {
                      statusNote = allDone ? "Reserved – Ready" : "Reserved – Not Ready";
                    } else if (allDone) {
                      statusNote = unit.isActive ? "Unit Ready" : "Ready – Pending Activation";
                    } else {
                      statusNote = unit.daysLate > 0 ? "Action Required" : "On Schedule";
                    }
 
                    // Rule 3.3: GC Deficiencies Warning
                    const showDeficiencyWarning = !unit.completion?.gc_deficiencies;
                    const isPhysicallyReady = unit.completion?.unit_ready;
                    
                    return (
                      <tr key={unit.id} className="hover:bg-indigo-50/30 transition-colors group">
                        <td className="px-2 py-4 font-bold text-slate-800 border-r border-slate-100 sticky left-0 bg-white group-hover:bg-indigo-50/30 z-20 min-w-[60px] text-xs truncate" title={unit.building}>
                           {unit.building}
                        </td>
                        <td className="px-2 py-4 border-r border-slate-100 sticky left-[60px] bg-white group-hover:bg-indigo-50/30 z-20 min-w-[60px]">
                          <button 
                            onClick={() => navigate(`/units/${unit.id}`)}
                            className="flex items-center gap-1 group/link"
                          >
                             <span className="font-black text-indigo-600 group-hover/link:underline cursor-pointer tracking-tighter text-sm">
                               {unit.unitNumber}
                             </span>
                             {unit.isPriority && (
                               <span className="ml-2 px-1.5 py-0.5 bg-red-600 text-white text-[8px] font-black rounded-sm animate-pulse uppercase tracking-widest">
                                 Priority
                               </span>
                             )}
                             <ChevronRight size={10} className="text-slate-300 group-hover/link:text-indigo-600 group-hover/link:translate-x-1 transition-all" />
                          </button>
                        </td>
                        <td className="px-2 py-4 border-r border-slate-100 sticky left-[120px] bg-white group-hover:bg-indigo-50/30 z-20 min-w-[60px] text-[10px] font-black text-slate-500 uppercase tracking-tighter">
                           {unit.unitType}
                        </td>
                        
                        {/* Milestone Icons (GC) */}
                        {['gc_delivered', 'gc_deficiencies', 'gc_cleaned'].map(k => {
                          const status = getStepStatus(unit, k);
                          const isCompleted = unit.completion?.[k];
                          
                          return (
                            <td key={k} className={`px-2 py-4 text-center ${k === 'gc_cleaned' ? 'border-r border-slate-100' : ''}`}>
                                <div className="flex flex-col items-center">
                                    <button 
                                      disabled={status.isLocked || loading}
                                      onClick={() => handleUpdateStep(unit.id, k, !isCompleted, k === 'gc_delivered')} 
                                      className={`text-2xl p-1 transition-all rounded-full ${status.isLocked ? 'cursor-not-allowed opacity-30 grayscale' : 'hover:scale-125 hover:bg-white cursor-pointer active:scale-95'}`}
                                      title={status.isLocked ? "Complete previous steps first" : `Mark ${k.replace(/_/g, ' ')}`}
                                    >
                                      <span className={loading ? 'animate-pulse' : ''}>{status.icon}</span>
                                    </button>
                                    <span className={`text-[10px] font-black mt-1 uppercase ${status.icon === "🔴" ? 'text-red-500' : 'text-slate-400'}`}>
                                        {status.date ? format(safeDate(status.date), 'MMM d') : '-'}
                                    </span>
                                </div>
                            </td>
                          );
                        })}

                        {/* Milestone Icons (Ops - Rule 2 Sequence) */}
                        {['ffe_installed', 'final_cleaning', 'ose_installed', 'unit_ready'].map(k => {
                          const status = getStepStatus(unit, k);
                          const isCompleted = unit.completion?.[k];

                          return (
                            <td key={k} className={`px-2 py-4 text-center ${k === 'unit_ready' ? 'border-r border-slate-100' : ''}`}>
                                <div className="flex flex-col items-center">
                                    <button 
                                      disabled={status.isLocked || loading}
                                      onClick={() => handleUpdateStep(unit.id, k, !isCompleted)}
                                      className={`text-2xl p-1 transition-all rounded-full ${status.isLocked ? 'cursor-not-allowed opacity-30 grayscale' : 'hover:scale-125 hover:bg-white cursor-pointer active:scale-95'}`}
                                      title={status.isLocked ? "Complete previous steps first" : `Mark ${k.replace(/_/g, ' ')}`}
                                    >
                                      <span className={loading ? 'animate-pulse' : ''}>{status.icon}</span>
                                    </button>
                                    <span className={`text-[10px] font-black mt-1 uppercase ${status.icon === "🔴" ? 'text-red-500' : 'text-slate-400'}`}>
                                        {status.date ? format(safeDate(status.date), 'MMM d') : '-'}
                                    </span>
                                </div>
                            </td>
                          );
                        })}

                        <td className="px-1 py-4 text-center">
                          <span className={`font-black ${unit.daysLate > 0 ? 'text-red-600' : 'text-slate-400 text-sm'}`}>
                            {unit.daysLate}
                          </span>
                        </td>
                        <td className="px-1 py-4 text-center">
                          <div className="flex flex-col items-center gap-1">
                            {unit.reserved ? (
                              <>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black border bg-blue-50 text-blue-700 border-blue-200">
                                  Reserved
                                </span>
                                {unit.reservedBy && (
                                  <span className="text-[11px] font-black text-blue-700 block px-1 leading-tight uppercase whitespace-normal break-words max-w-[120px]" title={unit.reservedBy}>
                                    {unit.reservedBy}
                                  </span>
                                )}
                              </>
                            ) : (
                              <button 
                                onClick={() => { setSelectedUnit(unit); setShowReserveModal(true); }}
                                className="px-3 py-1 bg-white border border-indigo-200 text-indigo-600 rounded-lg text-[10px] font-black uppercase hover:bg-indigo-50 transition-all shadow-sm"
                              >
                                Reserve
                              </button>
                            )}
                            {unit.isPriority && unit.moveInDate && (
                              <div className="mt-1 flex flex-col items-center">
                                <span className="text-[9px] font-black text-red-600 uppercase">Urgent Move-In</span>
                                <span className="text-[8px] font-bold text-slate-400">
                                  {Math.ceil((new Date(unit.moveInDate) - new Date()) / (1000 * 60 * 60 * 24))} Days Left
                                </span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-1 py-4 text-[10px] font-bold text-slate-600 text-center">
                           {unit.moveInDate ? format(safeDate(unit.moveInDate), 'MMM d') : '-'}
                        </td>
                        <td className="px-2 py-4 flex flex-col items-center gap-1">
                           <span className={`text-[10px] font-black px-2 py-1 rounded inline-block min-w-[90px] text-center ${
                             statusNote === 'Unit Ready' || statusNote === 'Reserved – Ready' ? 'bg-emerald-100 text-emerald-800' : 
                             (statusNote.includes('Pending') || statusNote === 'Reserved – Not Ready' ? 'bg-blue-100 text-blue-800' : 
                             (statusNote.includes('Required') || statusNote.includes('Blocked') ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-500'))
                           }`}>
                             {statusNote}
                           </span>
                           {isPhysicallyReady && showDeficiencyWarning && (
                             <span className="text-[9px] font-black text-amber-600 flex items-center gap-1 whitespace-nowrap">
                               <AlertTriangle size={10} /> Deficiencies open
                             </span>
                           )}
                        </td>
                        <td className="px-1 py-4 text-center">
                          <span className={`font-black ${unit.marketAge > 0 ? 'text-indigo-600' : 'text-slate-300'} text-sm`}>
                            {unit.marketAge || (isPhysicallyReady ? '0' : '-')}
                          </span>
                          <p className="text-[8px] font-black text-slate-400 uppercase mt-0.5">{unit.marketAgeLabel}</p>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            {/* Pagination Controls */}
            <div className="px-6 py-4 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-4">
              <div className="text-sm text-slate-500 font-bold">
                Showing <span className="text-slate-900">{Math.min((page - 1) * limit + 1, totalCount)}</span> to <span className="text-slate-900">{Math.min(page * limit, totalCount)}</span> of <span className="text-slate-900">{totalCount}</span> units
              </div>
              <div className="flex items-center gap-2">
                <button 
                  disabled={page === 1 || loading}
                  onClick={() => setPage(page - 1)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Previous
                </button>
                <div className="flex gap-1">
                   {[...Array(Math.ceil(totalCount / limit))].map((_, i) => {
                     const p = i + 1;
                     // Only show first, last, and current +/- 1
                     if (p === 1 || p === Math.ceil(totalCount / limit) || Math.abs(p - page) <= 1) {
                        return (
                          <button
                            key={p}
                            onClick={() => setPage(p)}
                            className={`w-9 h-9 rounded-lg text-sm font-bold transition-all ${page === p ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white border border-slate-200 text-slate-600 hover:border-indigo-600'}`}
                          >
                            {p}
                          </button>
                        );
                     }
                     if (p === 2 || p === Math.ceil(totalCount / limit) - 1) return <span key={p} className="text-slate-300">...</span>;
                     return null;
                   })}
                </div>
                <button 
                  disabled={page * limit >= totalCount || loading}
                  onClick={() => setPage(page + 1)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Next
                </button>
              </div>
            </div>

            {/* Legend (Exact as legend in photo) */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex gap-6 items-center justify-center text-[10px] font-black uppercase tracking-widest text-slate-500">
                <div className="flex items-center gap-1"><span>🟢</span> Completed</div>
                <div className="flex items-center gap-1"><span>🔴</span> Overdue / Late</div>
                <div className="flex items-center gap-1"><span>⚪</span> Not Started / Upcoming</div>
            </div>
          </div>
        </div>
      </div>

      {showReserveModal && selectedUnit && (
        <ReserveModal 
          unit={selectedUnit}
          onClose={() => setShowReserveModal(false)}
          onReserved={fetchData}
        />
      )}
    </MainLayout>
  );
};

const ReserveModal = ({ unit, onClose, onReserved }) => {
  const [formData, setFormData] = useState({
    reserve_firstName: '',
    reserve_lastName: '',
    reserve_email: '',
    reserve_phone: '+1 ',
    tentative_move_in_date: '',
    reserved_flag: true
  });
  const [loading, setLoading] = useState(false);

  const handlePhoneChange = (val) => {
    if (!val.startsWith('+1 ')) {
      setFormData({ ...formData, reserve_phone: '+1 ' });
    } else {
      setFormData({ ...formData, reserve_phone: val });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.put(`/api/admin/units/${unit.id}`, formData);
      onReserved();
      onClose();
    } catch (err) {
      alert(err.response?.data?.message || 'Error creating reservation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-indigo-600 text-white">
          <div>
            <h3 className="text-2xl font-black tracking-tight">Reserve Unit {unit.unitNumber}</h3>
            <p className="text-indigo-100 text-sm font-medium mt-1">Direct Prospect Entry</p>
          </div>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors text-2xl font-light">×</button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-1">First Name</label>
              <input 
                required
                className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-indigo-500 outline-none transition-all font-medium text-slate-700" 
                value={formData.reserve_firstName}
                onChange={e => setFormData({...formData, reserve_firstName: e.target.value})}
                placeholder="John"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Last Name</label>
              <input 
                required
                className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-indigo-500 outline-none transition-all font-medium text-slate-700" 
                value={formData.reserve_lastName}
                onChange={e => setFormData({...formData, reserve_lastName: e.target.value})}
                placeholder="Doe"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Email Address</label>
            <input 
              required
              type="email"
              className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-indigo-500 outline-none transition-all font-medium text-slate-700" 
              value={formData.reserve_email}
              onChange={e => setFormData({...formData, reserve_email: e.target.value})}
              placeholder="prospect@example.com"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Phone Number</label>
              <div className="relative">
                <input 
                  className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-indigo-500 outline-none transition-all font-medium text-slate-700" 
                  value={formData.reserve_phone}
                  onChange={e => handlePhoneChange(e.target.value)}
                  placeholder="+1 514-000-0000"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Tentative Move-In</label>
              <input 
                type="date"
                className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-indigo-500 outline-none transition-all font-medium text-slate-700" 
                value={formData.tentative_move_in_date}
                onChange={e => setFormData({...formData, tentative_move_in_date: e.target.value})}
              />
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-colors">Cancel</button>
            <button 
              type="submit" 
              disabled={loading}
              className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all active:scale-95 disabled:opacity-50"
            >
              {loading ? 'Reserving...' : 'Confirm Reservation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UnitReadiness;
