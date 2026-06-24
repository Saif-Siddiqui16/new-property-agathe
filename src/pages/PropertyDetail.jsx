import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Table } from '../components/Table';
import { ArrowLeft, Home, FileText, Download, ExternalLink } from 'lucide-react';
import api from '../api/client';

export const PropertyDetail = () => {
    const { id } = useParams();
    const [property, setProperty] = useState(null);
    const [documents, setDocuments] = useState([]);

    useEffect(() => {
        const fetchDetails = async () => {
            try {
                const res = await api.get(`/api/admin/properties/${id}`);
                setProperty(res.data);
            } catch (e) { console.error(e); }
        };

        const fetchDocuments = async () => {
            try {
                const res = await api.get('/api/admin/documents');
                // Filter documents linked to this property
                const linkedDocs = res.data.filter(d => d.propertyId === parseInt(id));
                setDocuments(linkedDocs);
            } catch (e) {
                console.error('Failed to fetch documents', e);
            }
        };

        if (id) {
            fetchDetails();
            fetchDocuments();
        }
    }, [id]);

    if (!property) return <div>Loading...</div>;

    return (
        <DashboardLayout title="Property Details">
            <div className="mb-6">
                <Link to="/properties/buildings" className="inline-flex items-center gap-2 text-slate-500 no-underline text-sm mb-2 hover:text-blue-600 transition-colors">
                    <ArrowLeft size={16} /> Back to Properties
                </Link>
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold mt-2 text-slate-900">{property.name}</h2>
                    <Button size="sm">Edit Property</Button>
                </div>
            </div>

            <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4 mb-6">
                <Card className="p-4 text-center">
                    <div className="text-slate-500 text-sm">Total Units</div>
                    <div className="text-2xl font-bold text-slate-900">{property.totalUnits}</div>
                </Card>
                <Card className="p-4 text-center">
                    <div className="text-slate-500 text-sm">Occupancy</div>
                    <div className="text-2xl font-bold text-emerald-600">{property.occupancyRate}%</div>
                </Card>
                <Card className="p-4 text-center">
                    <div className="text-slate-500 text-sm">Revenue (YTD)</div>
                    <div className="text-2xl font-bold text-slate-900">$ {property.revenue.toLocaleString('en-CA')}</div>
                </Card>
            </div>

            {/* Documents Section */}
            <Card title={`Documents (${documents.length})`} className="mb-6">
                {documents.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="text-left border-b border-slate-100">
                                    <th className="pb-3 px-4 text-xs font-semibold text-slate-500 uppercase">Document Name</th>
                                    <th className="pb-3 px-4 text-xs font-semibold text-slate-500 uppercase">Type</th>
                                    <th className="pb-3 px-4 text-xs font-semibold text-slate-500 uppercase">Date</th>
                                    <th className="pb-3 px-4 text-xs font-semibold text-slate-500 uppercase text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {documents.map(doc => (
                                    <tr key={doc.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                                        <td className="py-3 px-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                                                    <FileText size={16} />
                                                </div>
                                                <span className="font-medium text-slate-700">{doc.name}</span>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className="px-2 py-1 rounded text-xs font-medium bg-slate-100 text-slate-600 uppercase">
                                                {doc.type}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-sm text-slate-500">
                                            {new Date(doc.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="py-3 px-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <a
                                                    href={`${api.defaults.baseURL}/api/admin/documents/${doc.id}/download`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                                    title="Download/View"
                                                >
                                                    <Download size={16} />
                                                </a>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="py-8 text-center text-slate-400 text-sm">
                        No documents linked to this property.
                    </div>
                )}
            </Card>

            <Card title="Units" className="mt-6">
                <Table
                    headers={['Unit', 'Type', 'Rental Mode', 'Status', 'Tenant', 'Actions']}
                    data={property.units}
                    renderRow={(unit) => (
                        <>
                            <td>
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-slate-500">
                                        <Home size={16} />
                                    </div>
                                    <span className="font-medium text-slate-900">{unit.name}</span>
                                </div>
                            </td>
                            <td className="text-slate-700">{unit.type}</td>
                            <td>
                                <span className={`px-2 py-0.5 rounded text-xs font-medium border ${unit.mode === 'Full Unit'
                                    ? 'bg-blue-50 border-blue-200 text-blue-700'
                                    : 'bg-purple-50 border-purple-200 text-purple-700'
                                    }`}>
                                    {unit.mode}
                                </span>
                            </td>
                            <td>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${unit.status === 'Occupied' ? 'bg-emerald-100 text-emerald-700' :
                                    unit.status === 'Vacant' ? 'bg-red-100 text-red-700' :
                                        'bg-amber-100 text-amber-700'
                                    }`}>
                                    {unit.status}
                                </span>
                            </td>
                            <td className="text-slate-700">{unit.tenant}</td>
                            <td>
                                <Link to={`/units/${unit.id}`}>
                                    <Button variant="outline" size="sm">Manage</Button>
                                </Link>
                            </td>
                        </>
                    )}
                />
            </Card>
        </DashboardLayout>
    );
};
