import React from 'react';
import { MainLayout } from '../layouts/MainLayout';
import { Card } from '../components/Card';

import { useState, useEffect } from 'react';
import api from '../api/client';

import { OwnerSelector } from '../components/OwnerSelector';

export const VacancyDashboard = () => {
  const [__forceUpdate, __setForceUpdate] = useState(0);
  useEffect(() => {
    const handleUpdate = () => __setForceUpdate(p => p + 1);
    window.addEventListener('permissionsUpdated', handleUpdate);
    return () => window.removeEventListener('permissionsUpdated', handleUpdate);
  }, []);

  const [selectedOwnerId, setSelectedOwnerId] = useState('');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    vacant: 0,
    occupied: 0,
    totalVacantBedrooms: 0,
    fullUnitCount: 0,
    bedroomWiseCount: 0,
    vacancyByBuilding: []
  });

  const fetchStats = async (ownerId = '') => {
    try {
      setLoading(true);
      const url = ownerId ? `/api/admin/analytics/vacancy?ownerId=${ownerId}` : '/api/admin/analytics/vacancy';
      const res = await api.get(url);
      setStats(res.data);
    } catch (e) {
      console.error('Vacancy Fetch Error:', e);
      setStats({
        total: 0,
        vacant: 0,
        occupied: 0,
        totalVacantBedrooms: 0,
        fullUnitCount: 0,
        bedroomWiseCount: 0,
        vacancyByBuilding: []
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats(selectedOwnerId);
  }, [selectedOwnerId]);

  return (
    <MainLayout title="Vacancy Dashboard">
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
            {/* TOP STATS */}
            <section className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-6">
              <Card className="rounded-[18px] bg-white shadow-[0_20px_45px_rgba(0,0,0,0.08)] transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_40px_80px_rgba(0,0,0,0.15)] hover:rotate-1">
                <span className="text-sm text-gray-500">Total Units</span>
                <h2 className="text-[2rem] font-bold mt-2 leading-tight">{stats.total}</h2>
                <p className="mt-2 text-gray-700 text-sm">Across all buildings</p>
              </Card>

              <Card className="rounded-[18px] bg-white shadow-[0_20px_45px_rgba(0,0,0,0.08)] transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_40px_80px_rgba(0,0,0,0.15)] hover:rotate-1 border-l-[6px] border-red-500">
                <span className="text-sm text-gray-500">Vacant Units</span>
                <h2 className="text-[2rem] font-bold mt-2 leading-tight">{stats.vacant}</h2>
                <p className="mt-2 text-gray-700 text-sm">Needs attention</p>
              </Card>

              <Card className="rounded-[18px] bg-white shadow-[0_20px_45px_rgba(0,0,0,0.08)] transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_40px_80px_rgba(0,0,0,0.15)] hover:rotate-1 border-l-[6px] border-emerald-500">
                <span className="text-sm text-gray-500">Occupied Units</span>
                <h2 className="text-[2rem] font-bold mt-2 leading-tight">{stats.occupied}</h2>
                <p className="mt-2 text-gray-700 text-sm">Generating revenue</p>
              </Card>

              {stats.totalVacantBedrooms > 0 && (
                <Card className="rounded-[18px] bg-white shadow-[0_20px_45px_rgba(0,0,0,0.08)] transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_40px_80px_rgba(0,0,0,0.15)] hover:rotate-1 border-l-[6px] border-amber-500">
                  <span className="text-sm text-gray-500">Vacant Bedrooms</span>
                  <h2 className="text-[2rem] font-bold mt-2 leading-tight">{stats.totalVacantBedrooms}</h2>
                  <p className="mt-2 text-gray-700 text-sm">Available rooms (bedroom-wise units)</p>
                </Card>
              )}
            </section>

            {/* DETAILS */}
            <section className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-6">

              {/* Vacancy by Building */}
              <Card title="Vacancy by Building" className="p-6 rounded-[18px] bg-white shadow-[0_20px_45px_rgba(0,0,0,0.08)]">
                <ul className="p-0 list-none">
                  {stats.vacancyByBuilding.map((b, index) => (
                    <li key={index} className="flex flex-col py-3 border-b border-dashed border-gray-200 last:border-0">
                      <div className="flex justify-between items-start">
                        <span className="font-medium text-gray-800">{b.name}</span>
                        <div className="flex flex-col items-end gap-1">
                          {/* Full-unit vacancy badge */}
                          {b.vacant > 0 ? (
                            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                              {b.vacant} Unit{b.vacant > 1 ? 's' : ''} Vacant
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                              All Units Occupied
                            </span>
                          )}
                          {/* Bedroom vacancy badge for BEDROOM_WISE buildings */}
                          {b.hasBedroomWise && b.vacantBedrooms > 0 && (
                            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                              {b.vacantBedrooms} Bedroom{b.vacantBedrooms > 1 ? 's' : ''} Vacant
                            </span>
                          )}
                          {b.hasBedroomWise && b.vacantBedrooms === 0 && b.vacant === 0 && (
                            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                              All Bedrooms Occupied
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-3 mt-1 text-xs text-gray-500">
                        <span>Total: {b.total} units</span>
                        <span>·</span>
                        <span>Occupied: {b.occupied}</span>
                        {b.hasBedroomWise && <><span>·</span><span className="text-blue-600">Bedroom-wise rental</span></>}
                      </div>
                    </li>
                  ))}
                  {stats.vacancyByBuilding.length === 0 && <li className="text-gray-400 italic">No buildings found for this owner</li>}
                </ul>
              </Card>

              {/* Unit vs Bedroom Rental Mode */}
              <Card title="Unit vs Bedroom Rental Mode" className="p-6 rounded-[18px] bg-white shadow-[0_20px_45px_rgba(0,0,0,0.08)]">
                <p className="text-xs text-gray-500 mb-4">How units across all buildings are configured for rental</p>
                <div className="flex gap-4 mt-2">
                  <div className="flex-1 p-5 rounded-xl text-center transition-transform duration-300 hover:scale-105 bg-blue-50">
                    <h4 className="font-semibold text-slate-900 text-sm">Full Unit Rental</h4>
                    <p className="text-[1.8rem] font-bold text-blue-700 mt-1">{stats.fullUnitCount ?? 0}</p>
                    <p className="text-xs text-slate-500 mt-1">Entire unit rented to one tenant</p>
                  </div>
                  <div className="flex-1 p-5 rounded-xl text-center transition-transform duration-300 hover:scale-105 bg-violet-50">
                    <h4 className="font-semibold text-slate-900 text-sm">Bedroom-Wise Rental</h4>
                    <p className="text-[1.8rem] font-bold text-violet-700 mt-1">{stats.bedroomWiseCount ?? 0}</p>
                    <p className="text-xs text-slate-500 mt-1">Rooms rented individually</p>
                  </div>
                </div>
                {(stats.bedroomWiseCount ?? 0) > 0 && (
                  <div className="mt-4 p-3 bg-amber-50 rounded-lg text-xs text-amber-800 font-medium">
                    ⚠️ {stats.totalVacantBedrooms ?? 0} bedroom{(stats.totalVacantBedrooms ?? 0) !== 1 ? 's' : ''} available for rent across bedroom-wise units
                  </div>
                )}
              </Card>

            </section>
          </>
        )}

      </div>
    </MainLayout>
  );
};
