import { useState, useEffect } from 'react';
import { MainLayout } from '../layouts/MainLayout';
import api from '../api/client';

const Reports = () => {
  const [__forceUpdate, __setForceUpdate] = useState(0);
  useEffect(() => {
    const handleUpdate = () => __setForceUpdate(p => p + 1);
    window.addEventListener('permissionsUpdated', handleUpdate);
    return () => window.removeEventListener('permissionsUpdated', handleUpdate);
  }, []);

  const [data, setData] = useState({
    kpi: { totalRevenue: 0, occupancyRate: 0, activeLeases: 0, outstandingDues: 0 },
    monthlyRevenue: [],
    leaseDistribution: { fullUnit: 0, bedroom: 0 },
    topProperties: []
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get('/api/admin/reports');
        setData(res.data);
      } catch (e) { console.error(e); }
    };
    fetchData();
  }, []);

  const { kpi, topProperties, leaseDistribution, monthlyRevenue } = data;
  const totalLeases = (leaseDistribution?.fullUnit || 0) + (leaseDistribution?.bedroom || 0);
  const fullUnitPct = totalLeases > 0 ? Math.round(((leaseDistribution?.fullUnit || 0) / totalLeases) * 100) : 0;
  const bedroomPct = totalLeases > 0 ? Math.round(((leaseDistribution?.bedroom || 0) / totalLeases) * 100) : 0;

  return (
    <MainLayout title="Financial Reports & Analytics">
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center -mb-2">
            <p className="text-sm text-slate-500 font-medium italic">Detailed drill-down of portfolio performance and receivables</p>
        </div>

        {/* KPI CARDS */}
        <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-5">
          <div className="p-5 rounded-xl bg-white shadow-[0_10px_25px_rgba(0,0,0,0.06)] animate-in slide-in-from-bottom-4 duration-600 fade-in">
            <h4 className="text-sm text-slate-500">Total Revenue</h4>
            <p className="text-[26px] font-bold my-1.5 font-sans">$ {kpi.totalRevenue.toLocaleString('en-CA')}</p>
            <span className="text-xs text-emerald-600 font-medium">+12% this month</span>
          </div>

          <div className="p-5 rounded-xl bg-white shadow-[0_10px_25px_rgba(0,0,0,0.06)] animate-in slide-in-from-bottom-4 duration-600 fade-in delay-100">
            <h4 className="text-sm text-slate-500">Occupancy Rate</h4>
            <p className="text-[26px] font-bold my-1.5 font-sans">{kpi.occupancyRate}%</p>
            <span className="text-xs text-emerald-600 font-medium">Stable</span>
          </div>

          <div className="p-5 rounded-xl bg-white shadow-[0_10px_25px_rgba(0,0,0,0.06)] animate-in slide-in-from-bottom-4 duration-600 fade-in delay-200">
            <h4 className="text-sm text-slate-500">Active Leases</h4>
            <p className="text-[26px] font-bold my-1.5 font-sans">{kpi.activeLeases}</p>
            <span className="text-xs text-emerald-600 font-medium">+5 new</span>
          </div>

          <div className="p-5 rounded-xl bg-white shadow-[0_10px_25px_rgba(0,0,0,0.06)] animate-in slide-in-from-bottom-4 duration-600 fade-in delay-200 border-l-4 border-amber-500">
            <h4 className="text-sm text-slate-500">Outstanding Rent</h4>
            <p className="text-[26px] font-bold my-1.5 font-sans">$ {(kpi.outstandingRent || 0).toLocaleString('en-CA')}</p>
            <span className="text-xs text-amber-600 font-medium">Follow-up needed</span>
          </div>

          <div className="p-5 rounded-xl bg-white shadow-[0_10px_25px_rgba(0,0,0,0.06)] animate-in slide-in-from-bottom-4 duration-600 fade-in delay-300 border-l-4 border-orange-500">
            <h4 className="text-sm text-slate-500">Outstanding Deposits</h4>
            <p className="text-[26px] font-bold my-1.5 font-sans">$ {(kpi.outstandingDeposits || 0).toLocaleString('en-CA')}</p>
            <span className="text-xs text-orange-600 font-medium">Lease pending payment</span>
          </div>
        </div>

        {/* GRAPHS */}
        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
          <div className="bg-white p-5 rounded-xl shadow-[0_10px_25px_rgba(0,0,0,0.06)]">
            <h3 className="font-semibold text-slate-800">Monthly Revenue</h3>
            <div className="flex items-end gap-3 h-[180px] mt-5">
              {monthlyRevenue.length > 0 ? monthlyRevenue.map((d, i) => (
                <div
                  key={i}
                  className="w-[30px] rounded-md bg-gradient-to-t from-indigo-500 to-indigo-300 transition-all duration-1000 ease-out"
                  style={{ height: `${Math.min((d.amount / 15000) * 100, 100)}%` }} // Simple scaling
                  title={d.month}
                />
              )) : (
                <div className="w-full text-center text-slate-400">No revenue data yet</div>
              )}
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-[0_10px_25px_rgba(0,0,0,0.06)]">
            <h3 className="font-semibold text-slate-800">Lease Type Distribution</h3>
            <div className="flex flex-col gap-3 mt-5">
              <div className="p-3 rounded-lg font-semibold bg-indigo-50 text-indigo-800 text-sm">Full Unit {fullUnitPct}%</div>
              <div className="p-3 rounded-lg font-semibold bg-emerald-50 text-emerald-800 text-sm">Bedroom {bedroomPct}%</div>
            </div>
          </div>
        </div>

        {/* TABLE */}
        <div className="bg-white p-5 rounded-xl shadow-[0_10px_25px_rgba(0,0,0,0.06)] overflow-hidden">
          <h3 className="font-semibold text-slate-800 mb-3">Top Performing Properties</h3>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="p-3 text-left text-sm font-semibold text-slate-500 border-b border-slate-200">Property</th>
                  <th className="p-3 text-left text-sm font-semibold text-slate-500 border-b border-slate-200">Revenue</th>
                  <th className="p-3 text-left text-sm font-semibold text-slate-500 border-b border-slate-200">Occupancy</th>
                </tr>
              </thead>
              <tbody>
                {topProperties.length > 0 ? topProperties.map((p, i) => (
                  <tr key={i}>
                    <td className="p-3 text-sm text-slate-700 border-b border-slate-100">{p.name}</td>
                    <td className="p-3 text-sm text-slate-700 border-b border-slate-100">$ {p.revenue.toLocaleString('en-CA')}</td>
                    <td className="p-3 text-sm text-slate-700 border-b border-slate-100">{p.occupancy}%</td>
                  </tr>
                )) : (
                  <tr><td colSpan="3" className="p-3 text-center text-slate-500">No data available</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </MainLayout>
  );
};
export default Reports;
