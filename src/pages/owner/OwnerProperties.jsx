import React, { useState } from 'react';
import { OwnerLayout } from '../../layouts/owner/OwnerLayout';
import {
    Building2,
    ArrowRight,
    Users,
    MapPin,
    Layers,
    TrendingUp,
    Eye,
    X,
    Calendar
} from 'lucide-react';
import { Button } from '../../components/Button';
import api from '../../api/client';
import clsx from 'clsx';

export const OwnerProperties = () => {
    const [viewingProperty, setViewingProperty] = useState(null);

    const [ownerProperties, setOwnerProperties] = useState([]);

    React.useEffect(() => {
        const fetchProperties = async () => {
            try {
                const res = await api.get('/api/owner/properties');
                // Map to UI model
                const mapped = res.data.map(p => ({
                    id: p.id,
                    name: p.name,
                    address: p.address,
                    units: p.units,
                    occupancy: parseInt(p.occupancy),
                    revenue: p.revenue || 0,
                    // New Dynamic Fields
                    projectedAnnual: p.projectedAnnual || 0,
                    nextPaymentDate: p.nextPaymentDate || 'N/A',
                    residentialCount: p.residentialCount || 0,
                    commercialCount: p.commercialCount || 0,
                    activeTenants: p.residentCount || 0, // Dynamic
                    ownershipPercentage: p.ownershipPercentage || 100,
                    occupiedUnits: p.occupiedUnits || 0,
                    vacantUnits: p.vacantUnits || 0,
                    occupiedBedrooms: p.occupiedBedrooms || 0,
                    vacantBedrooms: p.vacantBedrooms || 0,
                    image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400&h=250&fit=crop'
                }));
                setOwnerProperties(mapped);
            } catch (e) {
                console.error(e);
            }
        };
        fetchProperties();
    }, []);

    // ... (rendering code)


    return (
        <OwnerLayout title="Property Portfolio">
            <div className="space-y-8 pb-12">
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                    <div>
                        <h3 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">Managed Assets</h3>
                        <p className="text-slate-500 font-medium mt-1 text-sm md:text-base">Detailed breakdown of your property holdings and their performance.</p>
                    </div>
                </div>

                {/* Property Grid */}
                {ownerProperties.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                        {ownerProperties.map((prop) => (
                            <div
                                key={prop.id}
                                className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-indigo-100/50 hover:-translate-y-2 transition-all duration-500 overflow-hidden group"
                            >
                                {/* Card Image */}
                                <div className="h-56 relative overflow-hidden group-hover:scale-95 group-hover:m-2 group-hover:rounded-[2rem] transition-all duration-700">
                                    <img src={prop.image} alt={prop.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent"></div>
                                    <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end">
                                        <div className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/30 text-white text-xs font-black uppercase tracking-widest">
                                            {prop.units} Units
                                        </div>
                                        <div className="text-right">
                                            {/* Removed Monthly Revenue as per request */}
                                        </div>
                                    </div>
                                </div>

                                {/* Card Content */}
                                <div className="p-8 space-y-6">
                                    <div>
                                        <div className="flex justify-between items-start mb-2 text-slate-400">
                                            <div className="flex items-center gap-1">
                                                <MapPin size={12} className="text-indigo-400" />
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{prop.address}</span>
                                            </div>
                                            {/* Occupancy badge removed as requested */}
                                        </div>
                                        <h4 className="text-xl font-bold text-slate-900 tracking-tight group-hover:text-indigo-600 transition-colors uppercase">{prop.name}</h4>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 pb-6 border-b border-slate-50">
                                        <div className="bg-slate-50 rounded-2xl p-4 transition-colors group-hover:bg-indigo-50/50">
                                            <Layers size={18} className="text-indigo-600 mb-2" />
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ownership</p>
                                            <p className="text-sm font-bold text-slate-700">Primary ({prop.ownershipPercentage}%)</p>
                                        </div>
                                        <div className="bg-slate-50 rounded-2xl p-4 transition-colors group-hover:bg-emerald-50/50">
                                            <Users size={18} className="text-emerald-600 mb-2" />
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tenants</p>
                                            <p className="text-sm font-bold text-slate-700">{prop.activeTenants} Active</p>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => setViewingProperty(prop)}
                                        className="w-full h-14 rounded-2xl bg-slate-900 hover:bg-indigo-600 text-white font-black text-sm tracking-widest uppercase transition-all flex items-center justify-center gap-3 active:scale-95 shadow-lg shadow-slate-200"
                                    >
                                        View Summary
                                        <ArrowRight size={18} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center p-12 bg-slate-50 rounded-[2.5rem] border border-slate-100 border-dashed text-center">
                        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-slate-400 mb-4 shadow-sm border border-slate-100">
                            <Building2 size={32} />
                        </div>
                        <h4 className="text-lg font-black text-slate-800 tracking-tight italic uppercase">No Properties Found</h4>
                        <p className="text-slate-500 text-sm mt-1 max-w-md mx-auto">
                            There are currently no properties assigned to your portfolio. Contact your administrator if this is an error.
                        </p>
                    </div>
                )}
            </div>

            {/* Read-Only Modal */}
            {viewingProperty && (
                <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-[100] backdrop-blur-md animate-in fade-in duration-300 p-4">
                    <div className="bg-white rounded-[2rem] md:rounded-[3rem] w-full max-w-2xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh] overflow-hidden border border-slate-200">
                        {/* Modal Header */}
                        <div className="p-6 md:p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h2 className="text-lg md:text-2xl font-black text-slate-800 tracking-tight italic uppercase">{viewingProperty.name}</h2>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1 italic">Read-Only Asset Summary</p>
                            </div>
                            <button
                                onClick={() => setViewingProperty(null)}
                                className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-white border border-slate-100 text-slate-400 hover:text-rose-500 hover:border-rose-100 transition-all flex items-center justify-center shadow-sm"
                            >
                                <X size={24} className="scale-75 md:scale-100" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="overflow-y-auto p-6 md:p-10 space-y-8 md:space-y-10">
                            {/* Summary Cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="p-6 rounded-[2rem] bg-indigo-50/50 border border-indigo-100 flex items-center gap-5">
                                    <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-100">
                                        <TrendingUp size={24} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1 font-sans not-italic">Projected Annual</p>
                                        <p className="text-xl font-black text-slate-800 italic">${viewingProperty.projectedAnnual?.toLocaleString('en-CA')} <span className="text-xs text-slate-400 not-italic font-bold">Est.</span></p>
                                    </div>
                                </div>
                                <div className="p-6 rounded-[2rem] bg-emerald-50/50 border border-emerald-100 flex items-center gap-5">
                                    <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm border border-emerald-100">
                                        <Calendar size={24} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1 font-sans not-italic">Next Payment</p>
                                        <p className="text-xl font-black text-slate-800 italic">{viewingProperty.nextPaymentDate} <span className="text-xs text-slate-400 not-italic font-bold">Due</span></p>
                                    </div>
                                </div>
                            </div>

                            {/* Placeholder Data */}
                            <div className="space-y-6">
                                <h5 className="text-xs font-black text-slate-400 uppercase tracking-widest">Asset Composition (Internal Registry)</h5>
                                <div className="space-y-4">
                                    {[
                                        { label: 'Total Units', value: viewingProperty.units, desc: 'Registered Units' },
                                        { label: 'Occupied Units', value: viewingProperty.occupiedUnits, desc: `Complete Units Leased` },
                                        { label: 'Vacant Units', value: viewingProperty.vacantUnits, desc: 'Ready for Lease' },
                                        // Only show bedroom data if there are bedrooms to show (to avoid clutter if property only has full units)
                                        ...(viewingProperty.occupiedBedrooms > 0 || viewingProperty.vacantBedrooms > 0 ? [
                                            { label: 'Occupied Bedrooms', value: viewingProperty.occupiedBedrooms, desc: 'Individual Room Leases' },
                                            { label: 'Vacant Bedrooms', value: viewingProperty.vacantBedrooms, desc: 'Rooms Ready for Lease' }
                                        ] : [])
                                    ].map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-center p-4 rounded-2xl border border-slate-50 hover:bg-slate-50/50 transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-indigo-600">
                                                    <Layers size={18} />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-slate-800 italic">{item.label}</p>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.desc}</p>
                                                </div>
                                            </div>
                                            <span className="text-lg font-black text-slate-800 italic">{item.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-8 bg-slate-50 border-t border-slate-100 mt-auto">
                            <p className="text-[10px] text-center text-slate-400 font-bold uppercase tracking-widest italic decoration-indigo-200">
                                This property is managed by PropManage Admin. Full records are audit-locked.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </OwnerLayout>
    );
};
