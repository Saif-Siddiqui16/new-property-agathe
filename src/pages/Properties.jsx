import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { Button } from '../components/Button';
import { Table } from '../components/Table';
import { Plus, MoreHorizontal, Building2 } from 'lucide-react';
import api from '../api/client';

export const Properties = () => {
    const [properties, setProperties] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProperties = async () => {
            try {
                const res = await api.get('/api/admin/properties');
                setProperties(res.data?.data || res.data || []);
            } catch (error) {
                console.error('Failed to fetch properties', error);
            } finally {
                setLoading(false);
            }
        };

        fetchProperties();
    }, []);

    if (loading) {
        return <DashboardLayout title="Properties"><div className="p-8">Loading properties...</div></DashboardLayout>;
    }

    return (
        <DashboardLayout title="Properties">
            <div className="flex justify-between items-center mb-6">
                <p className="text-slate-500 text-sm">Manage your real estate portfolio, units, and listings.</p>
                <Button size="md" icon={Plus}>Add Property</Button>
            </div>

            <Table
                headers={['Property Name', 'Owner(s)', 'Units', 'Occupancy', 'Status', 'Actions']}
                data={properties}
                renderRow={(property) => (
                    <>
                        <td>
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-slate-100 rounded-md text-slate-600 flex items-center justify-center">
                                    <Building2 size={18} />
                                </div>
                                <div>
                                    <div className="flex flex-col">
                                        <Link to={`/properties/${property.id}`} className="font-medium text-slate-900 hover:text-blue-600 transition-colors">
                                            {property.name}
                                        </Link>
                                        <div className="text-slate-500 text-xs mt-0.5">{property.address}</div>
                                    </div>
                                </div>
                            </div>
                        </td>
                        <td className="pr-4">
                            <div className="flex flex-wrap gap-1">
                                {property.ownerNames ? (
                                    property.ownerNames.split(', ').map((owner, oIdx) => (
                                        <span key={oIdx} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md text-[10px] font-bold border border-indigo-100 whitespace-nowrap">
                                            {owner}
                                        </span>
                                    ))
                                ) : (
                                    <span className="text-slate-400 text-xs italic">No Owner</span>
                                )}
                            </div>
                        </td>
                        <td className="text-slate-700">{property.units} Units</td>
                        <td>
                            <span className={`font-medium ${parseInt(property.occupancy) >= 90 ? 'text-green-600' : 'text-amber-600'}`}>
                                {property.occupancy}
                            </span>
                        </td>
                        <td>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${property.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                                }`}>
                                {property.status}
                            </span>
                        </td>
                        <td>
                            <Button variant="ghost" size="sm" className="text-slate-400 p-1 h-auto hover:text-slate-900">
                                <MoreHorizontal size={16} />
                            </Button>
                        </td>
                    </>
                )}
            />
        </DashboardLayout>
    );
};
