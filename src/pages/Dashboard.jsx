import React, { useState, useEffect } from 'react';
import { MainLayout } from '../layouts/MainLayout';
import { Card } from '../components/Card';
import api from '../api/client';
import { hasPermission } from '../utils/permissions';
import { 
  BarChart, 

  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from 'recharts';
import { 
  Building2, 
  Home, 
  Users, 
  TrendingUp, 
  Wallet, 
  BadgeDollarSign, 
  ShieldAlert, 
  FileText, 
  Car, 
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  ChevronLeft,
  ChevronRight,
  Calendar,
  UserPlus
} from 'lucide-react';

import { OwnerSelector } from '../components/OwnerSelector';

export const Dashboard = () => {
    const [__forceUpdate, __setForceUpdate] = useState(0);

    // Track whether permissions have been confirmed by the first sync event.
    // Before the first 'permissionsUpdated' event, we show a spinner instead of
    // Access Denied — this prevents the false 'restricted' flash on property switch.
    const [permissionsSynced, setPermissionsSynced] = useState(() => {
        try {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            return user.role === 'ADMIN'; // ADMIN always synced immediately
        } catch { return false; }
    });

    useEffect(() => {
        const handleUpdate = () => {
            __setForceUpdate(p => p + 1);
            setPermissionsSynced(true); // permissions are now confirmed
        };
        window.addEventListener('permissionsUpdated', handleUpdate);
        return () => window.removeEventListener('permissionsUpdated', handleUpdate);
    }, []);

    // All hooks must be declared before any early return (React rules of hooks)
    const [stats, setStats] = useState(null);
    const [revenueStats, setRevenueStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedOwnerId, setSelectedOwnerId] = useState('');
    const [leaseAlertPage, setLeaseAlertPage] = useState(1);
    const [reservedUnitPage, setReservedUnitPage] = useState(1);
    const leaseAlertsPerPage = 5;
    const reservedUnitsPerPage = 5;

    const fetchStats = async (ownerId = '') => {
        try {
            setLoading(true);
            const ownerParam = ownerId ? `?ownerId=${ownerId}` : '';
            const [dashRes, revRes] = await Promise.all([
                api.get(`/api/admin/dashboard/stats${ownerParam}`),
                api.get(`/api/admin/analytics/revenue${ownerParam}`)
            ]);
            setStats(dashRes.data);
            setRevenueStats(revRes.data);
        } catch (error) {
            console.error('Failed to fetch dashboard stats', error);
            setStats(null);
            setRevenueStats(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats(selectedOwnerId);
    }, [selectedOwnerId]);

    const canViewAnyDashboard = hasPermission('Dashboard', 'view') || 
                               hasPermission('Overview', 'view') || 
                               hasPermission('Vacancy Dashboard', 'view') || 
                               hasPermission('Revenue Dashboard', 'view');


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
        reason: 'Refund process cancelled via Dashboard Alert'
      });
      alert('Refund process cancelled successfully.');
      fetchStats(selectedOwnerId);
    } catch (error) {
      console.error('Failed to cancel refund process', error);
      alert('Failed to cancel refund process');
    }
  };

  // Fallback to initial structure if API fails or returns partial
  const data = stats || {
    totalProperties: 0,
    totalUnits: 0,
    occupancy: { occupied: 0, vacant: 0 },
    projectedRevenue: 0,
    actualRevenue: 0,
    insuranceAlerts: { expired: 0, expiringSoon: 0 },
    leaseAlerts: { expired: 0, expiringSoon: 0 },
    leaseAlertList: [],
    recentActivity: []
  };

  const { totalProperties, totalUnits, occupancy, projectedRevenue, actualRevenue, outstandingRent, outstandingDeposits, insuranceAlerts, leaseAlerts, leaseAlertList, recentActivity, vehicleStats, pendingRefunds, reservedUnits } = data;

  const sortedLeaseAlertList = leaseAlertList ? [...leaseAlertList].sort((a, b) => a.daysLeft - b.daysLeft) : [];
  const totalLeaseAlertPages = Math.ceil(sortedLeaseAlertList.length / leaseAlertsPerPage);
  const paginatedLeaseAlerts = sortedLeaseAlertList.slice(
    (leaseAlertPage - 1) * leaseAlertsPerPage,
    leaseAlertPage * leaseAlertsPerPage
  );

  const paginatedReservedUnits = reservedUnits ? reservedUnits.slice(
    (reservedUnitPage - 1) * reservedUnitsPerPage,
    reservedUnitPage * reservedUnitsPerPage
  ) : [];
  const totalReservedUnitPages = Math.ceil((reservedUnits?.length || 0) / reservedUnitsPerPage);

  // Build revenue chart from real monthly data (sorted chronologically)
  const revenueData = [...(revenueStats?.monthlyRevenue || [])]
    .sort((a, b) => {
      const parse = (s) => {
        if (!s) return 0;
        if (typeof s !== 'string') return 0;
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
      return parse(a.month) - parse(b.month);
    })
    .map(m => ({
      month: m.month,          // e.g. "2025-03"
      revenue: m.amount,
      rent: m.rent,
      deposit: m.deposit,
      serviceFees: m.serviceFees,
    }));

  // Format month label: "2025-03" -> "Mar '25" or "March 2026" -> "Mar '26"
  const formatMonth = (val) => {
    if (!val) return '';
    if (val.toString().includes('-')) {
      const [year, mon] = val.split('-');
      const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${names[parseInt(mon, 10) - 1]} '${year.slice(2)}`;
    }
    // Handle "March 2025" format
    const parts = val.toString().split(' ');
    if (parts.length === 2) {
      const longMonth = parts[0];
      const year = parts[1];
      return `${longMonth.substring(0, 3)} '${year.slice(2)}`;
    }
    return val;
  };

  // NEW: Fix for the "One-Day Backup" bug (Ignores timezone shifting)
  const formatTableDate = (dateString) => {
    if (!dateString) return 'N/A';
    // dateString looks like "2026-04-30T00:00:00.000Z"
    // We only care about the part BEFORE the 'T'
    const [year, month, day] = dateString.split('T')[0].split('-');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[parseInt(month, 10) - 1]} ${parseInt(day, 10)}, ${year}`;
  };

  return (
    <MainLayout title={canViewAnyDashboard ? "Dashboard Overview" : "Dashboard"}>
      {/* Show spinner until permissions are confirmed — never show Access Denied prematurely */}
      {!permissionsSynced ? (
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
            <p className="text-sm text-slate-400 font-medium tracking-wide">Loading dashboard...</p>
          </div>
        </div>
      ) : !canViewAnyDashboard ? (
        <div className="flex flex-col items-center justify-center min-h-[400px] bg-white rounded-[32px] border border-slate-100 shadow-2xl p-16 text-center">
          <div className="w-20 h-20 bg-rose-50 rounded-3xl flex items-center justify-center text-rose-500 mb-6 shadow-xl shadow-rose-100/50">
            <ShieldAlert size={40} />
          </div>
          <h2 className="text-3xl font-black text-slate-800 mb-3 tracking-tight uppercase italic">Access Restricted</h2>
          <p className="text-slate-500 max-w-sm mx-auto font-medium leading-relaxed">
            You do not have the necessary permissions to view the unified Dashboard. Please contact your property administrator.
          </p>
        </div>
      ) : (
      <div className="flex flex-col gap-8">

        {/* TOP BAR / FILTERS */}
        <section className="flex justify-end sticky top-0 z-10 py-2 bg-slate-50/80 backdrop-blur-sm -mx-4 px-4">
          <OwnerSelector value={selectedOwnerId} onOwnerChange={(id) => setSelectedOwnerId(id)} />
        </section>

        {loading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : (
          <>
            {/* TOP SUMMARY CARDS */}
            <section className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-6">

              <Card
                className="rounded-[18px] bg-white shadow-[0_20px_45px_rgba(0,0,0,0.08)] transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_40px_80px_rgba(0,0,0,0.15)] hover:rotate-1 border-l-[6px] border-red-500 cursor-pointer group"
                onClick={() => window.location.href = '/insurance-alerts'}
              >
                <span className="text-sm text-gray-500 tracking-wide font-black uppercase italic flex items-center gap-2">
                  <ShieldAlert size={16} className="text-red-500" />
                  Insurance Alerts
                </span>
                <div className="mt-2 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-rose-600 uppercase tracking-tight">Missing Setup</span>
                    <span className="text-sm font-black text-rose-700">{insuranceAlerts.missing || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-red-600 uppercase tracking-tight">Expired</span>
                    <span className="text-sm font-black text-red-700">{insuranceAlerts.expired || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-amber-600 uppercase tracking-tight">Expiring Soon</span>
                    <span className="text-sm font-black text-amber-700">{insuranceAlerts.expiringSoon || 0}</span>
                  </div>
                </div>
              </Card>

              <Card
                className="rounded-[18px] bg-white shadow-[0_20px_45px_rgba(0,0,0,0.08)] transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_40px_80px_rgba(0,0,0,0.15)] hover:rotate-1 border-l-[6px] border-orange-500 cursor-pointer group"
                onClick={() => window.location.href = '/leases'}
              >
                <span className="text-sm text-gray-500 tracking-wide font-black uppercase italic flex items-center gap-2">
                  <FileText size={16} className="text-orange-500" />
                  Lease Alerts
                </span>
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-orange-600 uppercase tracking-tight">Expired</span>
                    <span className="text-lg font-black text-orange-700">{leaseAlerts?.expired || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-yellow-600 uppercase tracking-tight">Expiring Soon</span>
                    <span className="text-lg font-black text-yellow-700">{leaseAlerts?.expiringSoon || 0}</span>
                  </div>
                </div>
              </Card>

              <Card
                className="rounded-[18px] bg-white shadow-[0_20px_45px_rgba(0,0,0,0.08)] transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_40px_80px_rgba(0,0,0,0.15)] hover:rotate-1 border-l-[6px] border-rose-600 cursor-pointer group"
                onClick={() => window.location.href = '/tenants/vehicles?filter=unauthorized'}
              >
                <span className="text-sm text-gray-500 tracking-wide font-black uppercase italic flex items-center gap-2">
                  <Car size={16} className="text-rose-600" />
                  Parking Alerts
                </span>
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-rose-600 uppercase tracking-tight">Unauthorized</span>
                    <span className="text-2xl font-black text-rose-700">{vehicleStats?.unauthorized || 0}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-50 pt-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Total Registered</span>
                    <span className="text-sm font-black text-slate-500">{vehicleStats?.total || 0}</span>
                  </div>
                </div>
              </Card>
            </section>

            {/* LEASE EXPIRATION ALERTS TABLE (Detailed List) */}
            <section className="mt-8 mb-6">
              <Card className="p-8 rounded-[24px] bg-white shadow-[0_22px_50px_rgba(0,0,0,0.08)] overflow-hidden">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-xl font-black text-gray-800 tracking-tight">Lease Expiration Alerts</h3>
                    <p className="text-sm text-gray-400 font-medium mt-1">Clients criteria: 45 days for short-term, 4 months for long-term leases</p>
                  </div>
                  <div className="px-4 py-2 bg-orange-50 rounded-full border border-orange-100">
                    <span className="text-xs font-bold text-orange-600 uppercase tracking-widest">
                      {leaseAlertList?.length || 0} Alerts Found
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="pb-4 text-xs font-bold text-gray-400 uppercase tracking-widest pl-2">Lease Holder</th>
                        <th className="pb-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Unit / Building</th>
                        <th className="pb-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-center">Expiry Date</th>
                        <th className="pb-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-center">Remaining</th>
                        <th className="pb-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-right pr-2">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {paginatedLeaseAlerts?.map((alert) => (
                        <tr key={alert.id} className="group transition-colors hover:bg-gray-50/50">
                          <td className="py-5 pl-2">
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-gray-800">{alert.tenant}</span>
                              <span className="text-[10px] text-gray-400 uppercase font-black tracking-tighter">{alert.type}</span>
                            </div>
                          </td>
                          <td className="py-5">
                            <span className="text-sm font-semibold text-gray-600">{alert.unit}</span>
                          </td>
                          <td className="py-5 text-center">
                            <span className="text-sm font-medium text-gray-500">
                              {formatTableDate(alert.expiryDate)}
                            </span>
                          </td>
                          <td className="py-5 text-center">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${alert.status === 'Expired'
                              ? 'bg-red-50 text-red-600'
                              : alert.daysLeft <= 30 ? 'bg-orange-50 text-orange-600' : 'bg-yellow-50 text-yellow-600'
                              }`}>
                              {alert.status === 'Expired' ? 'PAST DUE' : `${alert.daysLeft} Days Left`}
                            </span>
                          </td>
                          <td className="py-5 text-right pr-2">
                            <button
                              onClick={() => window.location.href = `/leases`}
                              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 underline uppercase tracking-widest transition-colors"
                            >
                              Manage
                            </button>
                          </td>
                        </tr>
                      ))}
                      {(!leaseAlertList || leaseAlertList.length === 0) && (
                        <tr>
                          <td colSpan="5" className="py-12 text-center text-gray-400 italic text-sm font-medium">
                            No urgent lease expirations based on current criteria
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                
                {totalLeaseAlertPages > 1 && (
                  <div className="flex items-center justify-between mt-6 pt-6 border-t border-slate-50">
                    <button
                      onClick={() => setLeaseAlertPage(p => Math.max(1, p - 1))}
                      disabled={leaseAlertPage === 1}
                      className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-400 hover:text-indigo-600 disabled:opacity-30 disabled:hover:text-slate-400 transition-all uppercase tracking-widest cursor-pointer"
                    >
                      <ChevronLeft size={16} /> Previous
                    </button>
                    <div className="flex items-center gap-2">
                       <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Page</span>
                       <span className="w-8 h-8 flex items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 text-xs font-black ring-1 ring-indigo-100 italic">{leaseAlertPage}</span>
                       <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">of {totalLeaseAlertPages}</span>
                    </div>
                    <button
                      onClick={() => setLeaseAlertPage(p => Math.min(totalLeaseAlertPages, p + 1))}
                      disabled={leaseAlertPage === totalLeaseAlertPages}
                      className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-400 hover:text-indigo-600 disabled:opacity-30 disabled:hover:text-slate-400 transition-all uppercase tracking-widest cursor-pointer"
                    >
                      Next <ChevronRight size={16} />
                    </button>
                  </div>
                )}
              </Card>
            </section>

            {/* RESERVED UNITS TABLE */}
            <section className="mt-8 mb-12">
              <Card className="p-8 rounded-[24px] bg-white shadow-[0_22px_50px_rgba(0,0,0,0.08)] border-t-[4px] border-indigo-500 overflow-hidden">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                       <UserPlus size={20} className="text-indigo-500" /> Reserved Units
                    </h3>
                    <p className="text-sm text-gray-400 font-medium mt-1">Confirmed reservations waiting for lease creation and move-in.</p>
                  </div>
                  <div className="px-4 py-2 bg-indigo-50 rounded-full border border-indigo-100">
                    <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">
                      {reservedUnits?.length || 0} Future Residents
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="pb-4 text-xs font-bold text-gray-400 uppercase tracking-widest pl-2">Tenant Name</th>
                        <th className="pb-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Property / Unit</th>
                        <th className="pb-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-center">Tentative Move-In</th>
                        <th className="pb-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-right pr-2">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {paginatedReservedUnits?.map((item) => (
                        <tr key={item.id} className="group transition-colors hover:bg-gray-50/50">
                          <td className="py-5 pl-2">
                            <span className="text-sm font-bold text-gray-800">{item.tenantName}</span>
                          </td>
                          <td className="py-5">
                            <span className="text-sm font-semibold text-gray-600">{item.building} / {item.unitNumber}</span>
                          </td>
                          <td className="py-5 text-center">
                            <div className="flex flex-col items-center">
                                <span className="text-sm font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100 italic">
                                {formatTableDate(item.moveInDate)}
                                </span>
                            </div>
                          </td>
                          <td className="py-5 text-right pr-2">
                            {item.isNewConstruction ? (
                              <button
                                onClick={() => window.location.href = `/unit-readiness`}
                                className="px-4 py-2 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-lg shadow-slate-200"
                              >
                                View Readiness
                              </button>
                            ) : (
                              <span className="text-[10px] text-gray-300 font-bold uppercase italic mr-4">Existing Unit</span>
                            )}
                          </td>
                        </tr>
                      ))}
                      {(!reservedUnits || reservedUnits.length === 0) && (
                        <tr>
                          <td colSpan="5" className="py-12 text-center text-gray-400 italic text-sm font-medium">
                            <Calendar size={24} className="mx-auto mb-2 text-slate-300" />
                            No active reservations at the moment.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {totalReservedUnitPages > 1 && (
                  <div className="flex items-center justify-between mt-6 pt-6 border-t border-slate-50 px-2">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                       Showing page {reservedUnitPage} of {totalReservedUnitPages}
                    </div>
                    <div className="flex items-center gap-1.5 font-sans">
                        <button
                          onClick={() => setReservedUnitPage(p => Math.max(1, p - 1))}
                          disabled={reservedUnitPage === 1}
                          className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-100 text-slate-400 hover:bg-slate-50 disabled:opacity-30 transition-all cursor-pointer"
                        >
                          <ChevronLeft size={14} />
                        </button>

                        {[...Array(totalReservedUnitPages)].map((_, i) => {
                          const p = i + 1;
                           // Only show first, last, and pages around current
                           if (p === 1 || p === totalReservedUnitPages || (p >= reservedUnitPage - 1 && p <= reservedUnitPage + 1)) {
                             return (
                              <button
                                key={p}
                                onClick={() => setReservedUnitPage(p)}
                                className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-black transition-all cursor-pointer ${
                                  reservedUnitPage === p
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100'
                                    : 'text-slate-500 hover:bg-slate-50 border border-transparent'
                                }`}
                              >
                                {p}
                              </button>
                             );
                           }
                           if (p === reservedUnitPage - 2 || p === reservedUnitPage + 2) {
                            return <span key={p} className="text-slate-300 text-[10px] px-0.5">...</span>;
                           }
                           return null;
                        })}

                        <button
                          onClick={() => setReservedUnitPage(p => Math.min(totalReservedUnitPages, p + 1))}
                          disabled={reservedUnitPage === totalReservedUnitPages}
                          className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-100 text-slate-400 hover:bg-slate-50 disabled:opacity-30 transition-all cursor-pointer"
                        >
                          <ChevronRight size={14} />
                        </button>
                    </div>
                  </div>
                )}
              </Card>
            </section>


          </>
        )}

      </div>
      )}
    </MainLayout>
  );
};
