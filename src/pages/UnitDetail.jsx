import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MainLayout } from '../layouts/MainLayout';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { ArrowLeft, Edit2, Loader2, FileText, Download, AlertCircle, ArrowRight } from 'lucide-react';
import api from '../api/client';

export const UnitDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [unit, setUnit] = useState(null);
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('general');

    const steps = [
        { key: 'gc_delivered', label: 'GC Delivered' },
        { key: 'gc_deficiencies', label: 'GC Deficiencies' },
        { key: 'gc_cleaned', label: 'GC Complete' },
        { key: 'ffe_installed', label: 'FF&E Installed' },
        { key: 'final_cleaning', label: 'Final Cleaning' },
        { key: 'ose_installed', label: 'OS&E Installed' },
        { key: 'unit_ready', label: 'Unit Ready' },
    ];

    useEffect(() => {
        if (id) fetchUnitDetails();
    }, [id]);

    const fetchUnitDetails = async () => {
        try {
            const response = await api.get(`/api/admin/units/${id}`);
            setUnit(response.data);

            // Fetch linked documents ONLY if user has permissions
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            const permissions = JSON.parse(localStorage.getItem('permissions') || '[]');
            const canViewDocs = user.role === 'ADMIN' || permissions.find(p => p.moduleName === 'Documents')?.canView;

            if (canViewDocs) {
                const docsRes = await api.get('/api/admin/documents');
                const linkedDocs = docsRes.data.filter(d => d.unitId === parseInt(id));
                setDocuments(linkedDocs);
            }
        } catch (error) {
            console.error('Error fetching unit:', error);
            setError('Failed to load unit details');
        } finally {
            setLoading(false);
        }
    };

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const permissions = JSON.parse(localStorage.getItem('permissions') || '[]');
    const canViewDocs = user.role === 'ADMIN' || permissions.find(p => p.moduleName === 'Documents')?.canView;

    if (loading) {
        return (
            <MainLayout title="Unit Details">
                <div className="flex items-center justify-center py-20">
                    <Loader2 size={32} className="animate-spin text-indigo-500" />
                    <span className="ml-3 text-slate-500">Loading unit details...</span>
                </div>
            </MainLayout>
        );
    }

    if (error || !unit) {
        return (
            <MainLayout title="Unit Details">
                <div className="flex flex-col items-center justify-center py-20">
                    <p className="text-red-500 mb-4">{error || 'Unit not found'}</p>
                    <Button variant="secondary" onClick={() => navigate('/units')}>
                        <ArrowLeft size={16} />
                        Back to Units
                    </Button>
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout title={`Unit ${unit.unitNumber}`}>
            <div className="flex flex-col gap-6">
                {/* Back Button */}
                <div>
                <div className="flex gap-3">
                    <Button variant="secondary" onClick={() => navigate('/units')}>
                        <ArrowLeft size={16} />
                        Back to Units
                    </Button>
                    <Button variant="secondary" onClick={() => navigate('/unit-readiness')}>
                        <ArrowLeft size={16} />
                        Back to Unit Readiness
                    </Button>
                </div>
                </div>

                {/* Tab Navigation */}
                <div className="flex gap-4 border-b border-slate-200">
                    <button 
                        onClick={() => setActiveTab('general')}
                        className={`pb-4 px-2 text-sm font-bold transition-all ${activeTab === 'general' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        General Overview
                    </button>
                    <button 
                        onClick={() => setActiveTab('construction')}
                        className={`pb-4 px-2 text-sm font-bold transition-all ${activeTab === 'construction' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        Construction Workflow
                    </button>
                </div>

                {activeTab === 'general' ? (
                    <>
                        {/* Top Info Section - Excel Fields */}
                        <section className="grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-3">
                            <Card className="p-3 flex flex-col gap-1">
                                <div className="text-[10px] text-slate-500 uppercase font-bold">Unit Number</div>
                                <div className="text-base font-bold text-slate-800">{unit.unitNumber}</div>
                            </Card>
                            <Card className="p-3 flex flex-col gap-1">
                                <div className="text-[10px] text-slate-500 uppercase font-bold">Unit Type</div>
                                <div className="text-base font-bold text-slate-800">{unit.unitType || '-'}</div>
                            </Card>
                            <Card className="p-3 flex flex-col gap-1">
                                <div className="text-[10px] text-slate-500 uppercase font-bold">Civic Number</div>
                                <div className="text-base font-bold text-indigo-600">{unit.civicNumber || unit.building}</div>
                            </Card>
                            <Card className="p-3 flex flex-col gap-1">
                                <div className="text-[10px] text-slate-500 uppercase font-bold">Floor</div>
                                <div className="text-base font-bold text-slate-800">{unit.floor || '-'}</div>
                            </Card>
                            <Card className="p-3 flex flex-col gap-1">
                                <div className="text-[10px] text-slate-500 uppercase font-bold">Bedrooms</div>
                                <div className="text-base font-bold text-slate-800">{unit.bedrooms || 1}</div>
                            </Card>
                            <Card className="p-3 flex flex-col gap-1">
                                <div className="text-[10px] text-slate-500 uppercase font-bold">Status</div>
                                <div className={`text-base font-bold ${unit.status === 'Occupied' ? 'text-green-600' : 'text-red-600'}`}>
                                    {unit.status || 'Vacant'}
                                </div>
                            </Card>
                        </section>

                        {/* Actions */}
                        <section className="flex gap-4 items-center py-4 border-b border-dashed border-slate-200">
                            <Button variant="primary" onClick={() => navigate(`/units`)}>
                                <Edit2 size={16} />
                                Edit Unit
                            </Button>
                        </section>
                    </>
                ) : (
                    <div className="space-y-6">
                        <section className="grid grid-cols-1 md:grid-cols-5 gap-3">
                             <Card className="p-3 flex flex-col gap-0.5 border-emerald-100 bg-emerald-50/20">
                                <div className="text-[9px] text-emerald-600 uppercase font-bold tracking-wider">Unit Activation</div>
                                <div className="text-base font-black text-slate-800">{unit.unit_status || 'INACTIVE'}</div>
                            </Card>
                            <Card className="p-3 flex flex-col gap-0.5 border-blue-100 bg-blue-50/20">
                                <div className="text-[9px] text-blue-600 uppercase font-bold tracking-wider">Availability</div>
                                <div className="text-base font-black text-slate-800">{unit.availability_status || 'Unavailable'}</div>
                            </Card>
                            <Card className="p-3 flex flex-col gap-0.5 border-amber-100 bg-amber-50/20">
                                <div className="text-[9px] text-amber-600 uppercase font-bold tracking-wider">Market Age</div>
                                <div className="text-base font-black text-slate-800">{unit.marketAge || 0} days</div>
                                <p className="text-[8px] font-black text-slate-400 uppercase">{unit.marketAgeLabel || 'Days on Market'}</p>
                            </Card>
                            <Card className="p-3 flex flex-col gap-0.5 border-amber-100 bg-amber-50/20">
                                <div className="text-[9px] text-amber-600 uppercase font-bold tracking-wider">Current Owner</div>
                                <div className="text-base font-black text-slate-800">{unit.current_owner || 'GC'}</div>
                            </Card>
                            <Card className={`p-3 flex flex-col gap-0.5 border-blue-100 ${unit.reserved_flag ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-slate-50'}`}>
                                <div className={`text-[9px] uppercase font-bold tracking-wider ${unit.reserved_flag ? 'text-blue-100' : 'text-slate-400'}`}>Reservation Status</div>
                                <div className="flex items-center justify-between">
                                    <span className="text-base font-black">{unit.reserved_flag ? 'RESERVED' : 'NONE'}</span>
                                    {unit.reserved_flag && <AlertCircle size={14} className="text-blue-200" />}
                                </div>
                                {unit.reserved_flag && (
                                    <p className="text-[9px] font-bold text-blue-100 mt-0.5">
                                        For: {unit.reserved_by_user?.name || 'Prospect'}
                                    </p>
                                )}
                            </Card>
                        </section>

                        <section>
                            <Card title="Construction Tracking" className="p-1">
                                <div className={`mb-3 p-3 rounded-xl flex justify-between items-center shadow-lg transition-all ${
                                    steps.slice(0, 6).every(s => unit[`${s.key}_completed`]) 
                                    ? 'bg-indigo-600 shadow-indigo-100' 
                                    : 'bg-slate-300 shadow-none opacity-60 grayscale'
                                }`}>
                                    <div className="flex flex-col">
                                        <span className="text-white font-black uppercase text-xs tracking-widest">Final Property Activation</span>
                                        <span className="text-indigo-100 text-[10px]">
                                            {steps.slice(0, 6).every(s => unit[`${s.key}_completed`]) 
                                                ? "Ready to enable leasing and vacancy tracking" 
                                                : "Locked: Complete all construction steps first"}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3 bg-white/10 p-2 rounded-xl border border-white/20">
                                        <input 
                                            type="checkbox" 
                                            disabled={!steps.slice(0, 6).every(s => unit[`${s.key}_completed`])}
                                            className={`w-6 h-6 ${steps.slice(0, 6).every(s => unit[`${s.key}_completed`]) ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                                            checked={unit.ready_for_leasing || false}
                                            onChange={async (e) => {
                                                try {
                                                    await api.put(`/api/admin/readiness/activate/${unit.id}`, { ready: e.target.checked });
                                                    fetchUnitDetails();
                                                } catch (err) { alert('Error activating unit'); }
                                            }}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    {steps.map((step, idx) => {
                                        const isCompleted = unit[`${step.key}_completed`];
                                        const targetDate = unit[`${step.key}_target_date`] ? new Date(unit[`${step.key}_target_date`]) : null;
                                        const isOverdue = !isCompleted && targetDate && targetDate < new Date().setHours(0,0,0,0);
                                        const prevStepKey = idx > 0 ? steps[idx - 1].key : null;
                                        
                                        // Logic Enhancement (Rule 3): GC Deficiencies is NO LONGER a blocking step
                                        let isLocked = false;
                                        if (idx > 0) {
                                            const stepsUpToThis = steps.slice(0, idx);
                                            const blockingSteps = stepsUpToThis.filter(s => s.key !== 'gc_deficiencies');
                                            isLocked = blockingSteps.some(s => !unit[`${s.key}_completed`]);
                                        }

                                        let colorClass = "bg-slate-50 text-slate-400"; // Default Grey
                                        let borderClass = "border-slate-100";
                                        let badgeColor = "bg-slate-200 text-slate-500";

                                        if (isCompleted) {
                                            colorClass = "bg-emerald-50 text-emerald-900";
                                            borderClass = "border-emerald-200";
                                            badgeColor = "bg-emerald-500 text-white";
                                        } else if (isOverdue) {
                                            colorClass = "bg-red-50 text-red-900";
                                            borderClass = "border-red-200";
                                            badgeColor = "bg-red-600 text-white";
                                        } else {
                                            // Future/Upcoming is Gray ('Stay in the gray')
                                            colorClass = "bg-slate-50 text-slate-400";
                                            borderClass = "border-slate-100";
                                            badgeColor = "bg-slate-200 text-slate-400";
                                        }

                                        return (
                                            <div key={step.key} className={`flex items-center justify-between p-2.5 border-b ${borderClass} ${colorClass} transition-all rounded-lg mb-1`}>
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] ${badgeColor} shadow-sm`}>
                                                        {idx + 1}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <p className={`text-xs font-bold leading-none ${isLocked ? 'text-slate-400' : ''}`}>{step.label}</p>
                                                            {step.key === 'gc_deficiencies' && !isCompleted && (
                                                                <span className="text-[9px] font-black text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded flex items-center gap-1 animate-pulse">
                                                                    ⚠ Pending
                                                                </span>
                                                            )}
                                                            {step.key === 'unit_ready' && !unit.gc_deficiencies_completed && (
                                                                <span className="text-[9px] font-black text-red-600 bg-red-100 px-1.5 py-0.5 rounded flex items-center gap-1">
                                                                     ⚠ Deficiencies still open
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-1 mt-0.5">
                                                            <span className="text-[9px] uppercase font-bold opacity-60">Target:</span>
                                                            <input 
                                                                type="date"
                                                                disabled={isLocked && idx !== 0}
                                                                className={`text-[10px] bg-white/50 border-0 p-0.5 rounded focus:ring-1 focus:ring-indigo-500 outline-none font-medium ${isLocked ? 'opacity-50' : ''}`}
                                                                value={unit[`${step.key}_target_date`] ? new Date(unit[`${step.key}_target_date`]).toISOString().split('T')[0] : ''}
                                                                onChange={(e) => {
                                                                  api.put(`/api/admin/readiness/update-step/${unit.id}`, { 
                                                                      stepKey: step.key, 
                                                                      targetDate: e.target.value,
                                                                      isManual: true, // This fixes the 409 conflict error
                                                                      completed: unit[`${step.key}_completed`]
                                                                  })
                                                                    .then(() => fetchUnitDetails())
                                                                    .catch(err => alert('Error updating target date'));
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    {isCompleted ? (
                                                        <div className="flex flex-col items-end">
                                                            <span className="text-[10px] font-black uppercase text-emerald-700 bg-white/50 px-3 py-1 rounded-full border border-emerald-200">✔ Completed</span>
                                                            <span className="text-[9px] opacity-70 mt-1">{new Date(unit[`${step.key}_completed_date`]).toLocaleDateString()}</span>
                                                            {step.key === 'gc_delivered' && (
                                                                <button 
                                                                    onClick={() => {
                                                                        const confirmed = window.confirm("Do you want to recalculate future target dates based on this completion?");
                                                                        if (confirmed) {
                                                                            api.put(`/api/admin/readiness/update-step/${unit.id}`, { stepKey: 'gc_delivered', completed: true, recalculate: true })
                                                                            .then(() => fetchUnitDetails())
                                                                            .catch(err => alert(err.response?.data?.message || 'Error updating step'));
                                                                        }
                                                                    }}
                                                                    className="text-[9px] text-indigo-700 font-bold hover:underline mt-1"
                                                                >
                                                                    ↻ Recalculate Timeline
                                                                </button>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <Button 
                                                            variant={isOverdue ? "danger" : "secondary"} 
                                                            size="sm"
                                                            disabled={isLocked}
                                                            onClick={() => {
                                                                const recalculate = step.key === 'gc_delivered' && window.confirm("Recalculate future target dates based on today?");
                                                                api.put(`/api/admin/readiness/update-step/${unit.id}`, { stepKey: step.key, completed: true, recalculate })
                                                                .then(() => fetchUnitDetails())
                                                                .catch(err => alert(err.response?.data?.message || 'Error updating step'));
                                                            }}
                                                        >
                                                            {isLocked ? "Locked" : "Mark Done"}
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </Card>
                        </section>
                    </div>
                )}

                {/* Lease Information Section */}
                <section>
                    <Card title="Lease Information" className="border-indigo-100 shadow-sm">
                        {unit.activeLease ? (
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100">
                                        <div className="text-xl font-bold">{unit.activeLease?.tenantName?.[0] || 'T'}</div>
                                    </div>
                                    <div className="flex flex-col">
                                        <div className="text-xs text-slate-400 uppercase font-black tracking-widest mb-1">Current Lease Holder</div>
                                        <div className="text-xl font-black text-slate-800 tracking-tight">{unit.activeLease?.tenantName || 'N/A'}</div>
                                        <div className="text-sm text-slate-500 font-medium">
                                            {new Date(unit.activeLease.startDate).toLocaleDateString()} — {new Date(unit.activeLease.endDate).toLocaleDateString()}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end bg-slate-50 p-4 rounded-2xl border border-slate-100 min-w-[200px]">
                                    <div className="text-[10px] text-slate-400 uppercase font-bold mb-1">Monthly Billing</div>
                                    <div className="text-2xl font-black text-indigo-600">
                                        ${unit.activeLease?.amount ? parseFloat(unit.activeLease.amount).toLocaleString() : '0'}
                                    </div>
                                    <div className="text-[10px] text-slate-400 font-medium">Charged to Tenant account</div>
                                </div>
                            </div>
                        ) : (
                            <div className="py-6 text-center">
                                <p className="text-slate-400 italic">No active lease found for this unit.</p>
                            </div>
                        )}
                    </Card>
                </section>

                {/* Detail Sections */}
                <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Occupants section */}
                    <Card title={`Occupants (${unit.occupants?.length || 0})`} className="min-h-[400px]">
                        <p className="text-slate-500 text-sm mb-6 -mt-2">
                            List of residents and co-applicants assigned to this unit.
                        </p>
                        {unit.occupants && unit.occupants.length > 0 ? (
                            <div className="space-y-4">
                                {unit.occupants.map(occ => (
                                    <div key={occ.id} className="flex items-center justify-between p-4 border border-slate-100 rounded-2xl bg-slate-50/50">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold border border-indigo-200">
                                                {occ.name ? occ.name[0] : (occ.firstName ? occ.firstName[0] : 'U')}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-slate-800">{occ.name || `${occ.firstName} ${occ.lastName}`}</span>
                                                <span className="text-[11px] text-slate-500 font-medium">
                                                    {occ.email || 'No Email'} • {occ.phone || 'No Phone'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className="text-[10px] font-black uppercase text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full">Resident</span>
                                            {occ.bedroomId && <span className="text-[9px] text-slate-400 mt-1">Bedroom: {unit.bedroomsList?.find(b => b.id === occ.bedroomId)?.bedroomNumber || 'Assigned'}</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 text-slate-300">
                                    <Edit2 size={32} />
                                </div>
                                <p className="text-slate-400 italic">No occupants currently assigned to this unit.</p>
                                <p className="text-slate-300 text-xs mt-1">Assign residents via the Tenants module.</p>
                            </div>
                        )}
                    </Card>

                    {/* Documents section - CONDITIONALLY RENDERED */}
                    {canViewDocs && (
                        <Card title={`Linked Documents (${documents.length})`} className="min-h-[300px]">
                            <p className="text-slate-500 text-sm mb-6 -mt-2">
                                Access all files and documents linked specifically to this unit.
                            </p>
                            {documents.length > 0 ? (
                                <div className="grid grid-cols-1 gap-4">
                                    {documents.map(doc => (
                                        <div key={doc.id} className="flex items-center justify-between p-4 border border-slate-100 rounded-2xl bg-white hover:bg-slate-50 transition-all hover:shadow-md group">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-xl bg-slate-50 shadow-sm flex items-center justify-center text-indigo-600 border border-slate-100">
                                                    <FileText size={20} />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-slate-800">{doc.name}</span>
                                                    <span className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">
                                                        {doc.type} • {new Date(doc.createdAt).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            </div>
                                            <a
                                                href={`${api.defaults.baseURL}/api/admin/documents/${doc.id}/download`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-white rounded-xl transition-all border border-transparent hover:border-indigo-100 shadow-none hover:shadow-sm"
                                                title="Download"
                                            >
                                                <Download size={18} />
                                            </a>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 text-slate-300">
                                        <FileText size={32} />
                                    </div>
                                    <p className="text-slate-400 italic">No documents currently linked to this unit.</p>
                                    <p className="text-slate-300 text-xs mt-1">Upload documents via the Document Library to see them here.</p>
                                </div>
                            )}
                        </Card>
                    )}
                </section>

            </div>
        </MainLayout>
    );
};
