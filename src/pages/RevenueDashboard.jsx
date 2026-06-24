import React, { useState, useEffect } from 'react';
import { MainLayout } from '../layouts/MainLayout';
import { Card } from '../components/Card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LabelList
} from 'recharts';

import api from '../api/client';
import { OwnerSelector } from '../components/OwnerSelector';

export const RevenueDashboard = () => {
  const [__forceUpdate, __setForceUpdate] = useState(0);
  useEffect(() => {
    const handleUpdate = () => __setForceUpdate(p => p + 1);
    window.addEventListener('permissionsUpdated', handleUpdate);
    return () => window.removeEventListener('permissionsUpdated', handleUpdate);
  }, []);

  const [selectedOwnerId, setSelectedOwnerId] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    actualRevenue: 0,
    actualRent: 0,
    actualDeposit: 0,
    actualServiceFees: 0,
    projectedRevenue: 0,
    totalRevenue: 0,
    monthlyRevenue: [],
    revenueByProperty: [],
    recentActivity: []
  });

  const fetchStats = async (ownerId = '') => {
    try {
      setLoading(true);
      const ownerParam = ownerId ? `?ownerId=${ownerId}` : '';
      const [res, dashRes] = await Promise.all([
        api.get(`/api/admin/analytics/revenue${ownerParam}`),
        api.get(`/api/admin/dashboard/stats${ownerParam}`)
      ]);
      const data = res.data;

      // Ensure chronological sorting of monthlyRevenue (instead of alphabetical)
      const parseMonth = (s) => {
        if (!s || typeof s !== 'string') return 0;
        if (s.includes('-')) {
          const [y, m] = s.split('-');
          return new Date(y, parseInt(m, 10) - 1).getTime();
        }
        const [mName, y] = s.split(' ');
        const monthNames = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
        const shortMonthNames = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

        let mIdx = monthNames.indexOf(mName.toLowerCase());
        if (mIdx === -1) mIdx = shortMonthNames.indexOf(mName.toLowerCase());

        return new Date(y, mIdx !== -1 ? mIdx : 0).getTime();
      };

      if (data.monthlyRevenue) {
        data.monthlyRevenue.sort((a, b) => parseMonth(a.month) - parseMonth(b.month));
      }

      // Also sort monthly data inside each property
      if (data.revenueByProperty) {
        data.revenueByProperty.forEach(p => {
          if (p.monthly) {
            p.monthly.sort((a, b) => parseMonth(a.month) - parseMonth(b.month));
          }
        });
      }

      setStats({
        ...data,
        recentActivity: dashRes.data.recentActivity || []
      });
      setSelectedMonth('all'); // reset month filter on owner change
    } catch (e) {
      console.error('Revenue Fetch Error:', e);
      setStats({
        actualRevenue: 0,
        projectedRevenue: 0,
        totalRevenue: 0,
        monthlyRevenue: [],
        revenueByProperty: []
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats(selectedOwnerId);
  }, [selectedOwnerId]);

  // Format month label: "2025-03" → "Mar '25"
  // Format month label: "2025-03" -> "Mar '25" or "March 2026" -> "Mar '26"
  const formatMonth = (val) => {
    if (!val) return '';
    if (val.includes('-')) {
      const [year, mon] = val.split('-');
      const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${names[parseInt(mon, 10) - 1]} '${year.slice(2)}`;
    }
    // Handle "March 2026" format
    const parts = val.split(' ');
    if (parts.length === 2) {
      const longMonth = parts[0];
      const year = parts[1];
      return `${longMonth.slice(0, 3)} '${year.slice(2)}`;
    }
    return val;
  };

  // Available months for filter (from monthlyRevenue)
  const availableMonths = stats.monthlyRevenue.map(m => m.month);

  // Revenue by property — filtered by selected month if one is chosen
  const filteredRevenueByProperty = stats.revenueByProperty.map(p => {
    if (selectedMonth === 'all') {
      return p; // cumulative
    }
    // Find the month entry for this property
    const monthEntry = (p.monthly || []).find(m => m.month === selectedMonth);
    if (!monthEntry) return { ...p, amount: 0, rent: 0, deposit: 0, serviceFees: 0, _noData: true };
    return { ...p, amount: monthEntry.amount, rent: monthEntry.rent, deposit: monthEntry.deposit, serviceFees: monthEntry.serviceFees };
  });

  return (
    <MainLayout title="Revenue Dashboard">
      <div className="flex flex-col gap-8">

        {/* TOP BAR / FILTERS */}
        <section className="flex justify-end sticky top-0 z-10 py-2 bg-slate-50/80 backdrop-blur-sm -mx-4 px-4 gap-3">
          <OwnerSelector value={selectedOwnerId} onOwnerChange={(id) => setSelectedOwnerId(id)} />
        </section>

        {loading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : (
          <>
            {/* TOP STATS - Split into 3 Separate Boxes per Client Request */}
            <section className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-6">
              <Card className="rounded-[18px] bg-white shadow-[0_15px_35px_rgba(0,0,0,0.05)] transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_25px_50px_rgba(0,0,0,0.1)] border-l-[6px] border-blue-500">
                <span className="text-sm font-bold text-gray-400 uppercase tracking-widest">Total Rent</span>
                <h2 className="text-[1.85rem] font-black mt-2 leading-tight text-slate-800" title={`$${(stats.actualRent || 0).toLocaleString('en-CA')}`}>
                  ${(stats.actualRent || 0).toLocaleString('en-CA')}
                </h2>
                <p className="text-xs text-gray-400 mt-2 font-medium">Net rental income collected</p>
              </Card>

              <Card className="rounded-[18px] bg-white shadow-[0_15px_35px_rgba(0,0,0,0.05)] transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_25px_50px_rgba(0,0,0,0.1)] border-l-[6px] border-purple-500">
                <span className="text-sm font-bold text-gray-400 uppercase tracking-widest">Total Deposits</span>
                <h2 className="text-[1.85rem] font-black mt-2 leading-tight text-slate-800" title={`$${(stats.actualDeposit || 0).toLocaleString('en-CA')}`}>
                  ${(stats.actualDeposit || 0).toLocaleString('en-CA')}
                </h2>
                <p className="text-xs text-gray-400 mt-2 font-medium">Security deposits received</p>
              </Card>

              <Card className="rounded-[18px] bg-white shadow-[0_15px_35px_rgba(0,0,0,0.05)] transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_25px_50px_rgba(0,0,0,0.1)] border-l-[6px] border-orange-500">
                <span className="text-sm font-bold text-gray-400 uppercase tracking-widest">Total Fees</span>
                <h2 className="text-[1.85rem] font-black mt-2 leading-tight text-slate-800" title={`$${(stats.actualServiceFees || 0).toLocaleString('en-CA')}`}>
                  ${(stats.actualServiceFees || 0).toLocaleString('en-CA')}
                </h2>
                <p className="text-xs text-gray-400 mt-2 font-medium">Service and late fees collected</p>
              </Card>
            </section>

            {/* CHARTS & BREAKDOWN */}
            <section className="grid grid-cols-[repeat(auto-fit,minmax(360px,1fr))] gap-6">

              {/* Monthly Revenue Chart */}
              <Card title="Revenue Trends (Monthly)" className="p-6 rounded-[18px] bg-white shadow-[0_20px_45px_rgba(0,0,0,0.08)]">
                {stats.monthlyRevenue.length === 0 ? (
                  <p className="text-gray-400 italic text-sm mt-2">No revenue data available yet</p>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={stats.monthlyRevenue} margin={{ top: 24, right: 10, left: 0, bottom: 0 }}>
                      <XAxis
                        dataKey="month"
                        stroke="#94a3b8"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={formatMonth}
                      />
                      <YAxis
                        stroke="#94a3b8"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => `$${value >= 1000 ? (value / 1000).toFixed(0) + 'k' : value}`}
                      />
                      <Tooltip
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        cursor={{ fill: '#f1f5f9' }}
                        labelFormatter={formatMonth}
                        formatter={(value, name) => [`$${parseFloat(value).toLocaleString('en-CA')}`, name]}
                      />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                      <Bar dataKey="rent" name="Rent" stackId="a" fill="#3b82f6" barSize={32}>
                        <LabelList
                          dataKey="rent"
                          position="top"
                          style={{ fontSize: '9px', fill: '#64748b', fontWeight: '600' }}
                          formatter={(v) => v > 0 ? `$${parseFloat(v) >= 1000 ? (parseFloat(v) / 1000).toFixed(1) + 'k' : parseFloat(v).toFixed(0)}` : ''}
                        />
                      </Bar>
                      <Bar dataKey="deposit" name="Deposit" stackId="a" fill="#a855f7" />
                      <Bar dataKey="serviceFees" name="Service Fees" stackId="a" fill="#f97316" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Card>

              {/* Revenue by Property */}
              <Card title="Revenue by Property" className="p-6 rounded-[18px] bg-white shadow-[0_20px_45px_rgba(0,0,0,0.08)]">
                {/* Month Filter */}
                {availableMonths.length > 0 && (
                  <div className="mb-4">
                    <select
                      className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 text-gray-600 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                    >
                      <option value="all">📊 Year-to-Date (All Months)</option>
                      {availableMonths.map(m => (
                        <option key={m} value={m}>{formatMonth(m)}</option>
                      ))}
                    </select>
                  </div>
                )}
                <ul className="p-0 list-none">
                  {filteredRevenueByProperty.map((p, index) => (
                    <li key={index} className="flex flex-col py-3 border-b border-dashed border-gray-200 last:border-0">
                      <div className="flex justify-between font-bold mb-1">
                        <span>{p.name}</span>
                        <span className={p._noData ? 'text-gray-400' : ''}>${(p.amount || 0).toLocaleString('en-CA')}</span>
                      </div>
                      {p._noData ? (
                        <p className="text-xs text-gray-400 italic">No revenue for {formatMonth(selectedMonth)}</p>
                      ) : (
                        <div className="flex gap-4 text-xs text-gray-500">
                          <span>Rent: ${(p.rent || 0).toLocaleString('en-CA')}</span>
                          <span>Deposit: ${(p.deposit || 0).toLocaleString('en-CA')}</span>
                          <span>Fees: ${(p.serviceFees || 0).toLocaleString('en-CA')}</span>
                        </div>
                      )}
                    </li>
                  ))}
                  {stats.revenueByProperty.length === 0 && <li className="text-gray-400 italic">No revenue data for this owner</li>}
                </ul>
              </Card>

              {/* Recent Activity moved here from Overview as requested */}
              <Card title="Recent Activity" className="col-span-1 lg:col-span-2 p-6 rounded-[18px] bg-white shadow-[0_20px_45px_rgba(0,0,0,0.08)]">
                <ul className="pl-4 text-gray-700 space-y-2 list-disc marker:text-gray-400">
                  {stats.recentActivity && stats.recentActivity.map((activity, index) => (
                    <li key={index} className="text-sm font-medium">{activity}</li>
                  ))}
                  {(!stats.recentActivity || stats.recentActivity.length === 0) && (
                    <li className="list-none text-gray-400 italic">No recent activity found</li>
                  )}
                </ul>
              </Card>

            </section>
          </>
        )}

      </div>
    </MainLayout>
  );
};
