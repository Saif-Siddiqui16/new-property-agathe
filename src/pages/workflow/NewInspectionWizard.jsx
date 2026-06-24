import React, { useState, useEffect } from 'react';
import {
    Calendar,
    ChevronRight,
    ArrowLeft,
    CheckCircle2,
    Search,
    Building2,
    Home,
    User,
    FileText,
    Layout,
    ArrowRight
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MainLayout } from '../../layouts/MainLayout';
import api from '../../api/client';

const NewInspectionWizard = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        type: 'MOVE_IN',
        templateId: '',
        unitId: '',
        leaseId: '',
        propertyId: '',
        inspectorId: '1',
        date: new Date().toISOString().split('T')[0],
        time: ''
    });
    const [loading, setLoading] = useState(false);
    const [units, setUnits] = useState([]);
    const [templates, setTemplates] = useState([]);
    const [properties, setProperties] = useState([]);
    const [inspectors, setInspectors] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [unitsRes, templatesRes, propertiesRes, coworkersRes] = await Promise.all([
                    api.get('/api/admin/workflow/units'),
                    api.get('/api/admin/workflow/templates'),
                    api.get('/api/admin/properties'),
                    api.get('/api/admin/coworkers')
                ]);

                const moveInUnits = unitsRes.data.success ? (unitsRes.data.data || unitsRes.data) : [];
                setUnits(moveInUnits);

                if (templatesRes.data.success) setTemplates(templatesRes.data.data || templatesRes.data);

                const propData = propertiesRes.data.data || propertiesRes.data;
                setProperties(Array.isArray(propData) ? propData : []);

                const staffData = coworkersRes.data.data || coworkersRes.data;
                setInspectors(Array.isArray(staffData) ? staffData : []);

                // Auto-fill from location state
                if (location.state?.moveInId || location.state?.moveOutId || location.state?.unitId) {
                    const target = moveInUnits.find(u =>
                        (location.state.moveInId && u.moveInId === parseInt(location.state.moveInId)) ||
                        (location.state.moveOutId && u.moveOutId === parseInt(location.state.moveOutId)) ||
                        (location.state.unitId && u.unitId === parseInt(location.state.unitId))
                    );

                    if (target) {
                        setFormData(prev => ({
                            ...prev,
                            type: location.state.type || (location.state.moveInId ? 'MOVE_IN' : 'MOVE_OUT'),
                            unitId: target.unitId.toString(),
                            propertyId: target.unit?.propertyId?.toString() || '',
                            leaseId: target.leaseId?.toString() || '',
                            date: location.state.type === 'VISUAL' ?
                                (location.state.visualDate ? String(location.state.visualDate).substring(0, 10) : prev.date) :
                                (location.state.finalDate ? String(location.state.finalDate).substring(0, 10) : prev.date),
                            time: location.state.type === 'VISUAL' ? (location.state.visualTime || '') : (location.state.finalTime || '')
                        }));
                    }
                }
            } catch (err) { console.error('Fetch error:', err); }
        };
        fetchData();
    }, [location.state]);

    // Handle dynamic date/time switching when type changes
    useEffect(() => {
        if (location.state?.visualDate || location.state?.finalDate) {
            setFormData(prev => {
                const isVisual = prev.type === 'VISUAL';
                const targetDate = isVisual ? location.state.visualDate : location.state.finalDate;
                const targetTime = isVisual ? location.state.visualTime : location.state.finalTime;

                return {
                    ...prev,
                    date: targetDate ? String(targetDate).substring(0, 10) : prev.date,
                    time: targetTime || ''
                };
            });
        }
    }, [formData.type, location.state]);

    const steps = [
        { id: 1, label: 'Basic Info', icon: FileText },
        { id: 2, label: 'Select Template', icon: Layout },
        { id: 3, label: 'Review & Create', icon: CheckCircle2 }
    ];

    const handleNext = () => {
        if (step === 1) {
            if (!formData.propertyId || !formData.unitId) {
                alert('Please select both Building and Unit before continuing.');
                return;
            }
            setStep(2);
        } else if (step === 2) {
            if (!formData.templateId) {
                alert('Please select an inspection template before continuing.');
                return;
            }
            setStep(3);
        } else if (step === 3) {
            handleCreateInspection();
        }
    };

    const handleCreateInspection = async () => {
        try {
            setLoading(true);
            const res = await api.post('/api/admin/workflow/inspections', {
                templateId: parseInt(formData.templateId),
                unitId: parseInt(formData.unitId),
                leaseId: formData.leaseId ? parseInt(formData.leaseId) : null,
                inspectorId: formData.inspectorId ? parseInt(formData.inspectorId) : null,
                date: formData.date,
                time: formData.time
            });

            if (res.data.success) {
                const targetDashboard = formData.type === 'MOVE_IN' ? 'move-in' : 'move-out';
                navigate(`/admin/workflow/${targetDashboard}`);
            }
        } catch (error) {
            alert('Failed to create inspection: ' + (error.response?.data?.message || error.message));
        } finally {
            setLoading(false);
        }
    };
    const handleBack = () => setStep(s => s - 1);

    return (
        <MainLayout title="Create New Inspection">
            <div className="p-0 bg-transparent min-h-screen">
                {/* Header */}
                <div className="w-full max-w-4xl mx-auto flex items-center justify-between mb-6 md:mb-10 px-4 md:px-0">
                    <div className="flex items-center gap-3 md:gap-4">
                        <button onClick={() => navigate(-1)} className="p-2 md:p-2.5 bg-white rounded-2xl border border-gray-100 text-gray-400 hover:text-gray-900 transition-colors shadow-sm">
                            <ArrowLeft size={18} />
                        </button>
                        <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tighter">New Inspection</h1>
                    </div>
                    <button onClick={() => navigate(-1)} className="px-4 md:px-6 py-2 md:py-2.5 bg-white text-gray-600 rounded-2xl text-xs md:sm font-black border border-gray-100 hover:bg-gray-50 transition-colors shadow-sm">
                        Cancel
                    </button>
                </div>

                {/* Stepper */}
                <div className="w-full max-w-4xl mx-auto mb-8 md:mb-12 px-2 md:px-0">
                    <div className="flex items-center justify-between px-4 md:px-10 overflow-x-auto pb-4 scrollbar-hide">
                        {steps.map((s, idx) => (
                            <React.Fragment key={s.id}>
                                <div className="flex flex-col items-center gap-2 group cursor-pointer min-w-[80px]" onClick={() => step > s.id && setStep(s.id)}>
                                    <div className={`w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center transition-all shadow-sm
                                    ${step === s.id ? 'bg-indigo-600 text-white scale-110 shadow-indigo-100' :
                                            step > s.id ? 'bg-green-100 text-green-600' : 'bg-white text-gray-400 border border-gray-100'}`}>
                                        <s.icon size={18} className="md:w-[22px] md:h-[22px]" />
                                    </div>
                                    <span className={`text-[9px] md:text-[11px] font-black uppercase tracking-widest text-center ${step === s.id ? 'text-indigo-600' : 'text-gray-400'}`}>
                                        {s.label}
                                    </span>
                                </div>
                                {idx < steps.length - 1 && (
                                    <div className="flex-1 h-0.5 mx-2 md:mx-6 bg-gray-200 mt-[-18px] md:mt-[-20px] min-w-[20px]">
                                        <div className={`h-full transition-all duration-500 ${step > s.id ? 'bg-green-500 w-full' : 'bg-gray-200 w-0'}`} />
                                    </div>
                                )}
                            </React.Fragment>
                        ))}
                    </div>
                </div>

                {/* Content Area */}
                <div className="w-full max-w-4xl mx-auto bg-white rounded-[32px] md:rounded-[40px] shadow-2xl shadow-indigo-500/5 border border-gray-100 p-6 md:p-10 mb-10">
                    {step === 1 && (
                        <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div>
                                <h2 className="text-xl font-black text-gray-900 mb-1">Basic Information</h2>
                                <p className="text-gray-500 text-sm">Provide the basic details for this inspection.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                                <InputGroup label="Inspection Type" required>
                                    <select
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
                                        value={formData.type}
                                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                    >
                                        <option value="MOVE_OUT">Move-Out</option>
                                        <option value="VISUAL">Visual Walkthrough</option>
                                        <option value="MOVE_IN">Move-In</option>
                                    </select>
                                </InputGroup>

                                <InputGroup label="Scheduled Date" required>
                                    <div className="relative">
                                        <input
                                            type="date"
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
                                            value={formData.date}
                                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                        />
                                        <Calendar size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                    </div>
                                </InputGroup>

                                <InputGroup label="Scheduled Time">
                                    <div className="relative">
                                        <input
                                            type="time"
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
                                            value={formData.time}
                                            onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                                        />
                                    </div>
                                </InputGroup>

                                <InputGroup label="Building" required>
                                    <select
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
                                        value={formData.propertyId}
                                        onChange={(e) => setFormData({ ...formData, propertyId: e.target.value, unitId: '' })}
                                    >
                                        <option value="">Select Building</option>
                                        {properties.map(p => (
                                            <option key={p.id} value={p.id.toString()}>{p.name}</option>
                                        ))}
                                    </select>
                                </InputGroup>

                                <InputGroup label="Unit / Bedroom" required>
                                    <select
                                        value={formData.unitId}
                                        onChange={(e) => {
                                            const unit = units.find(u => u.unitId === parseInt(e.target.value));
                                            setFormData({ ...formData, unitId: e.target.value, leaseId: unit?.leaseId || '' });
                                        }}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
                                    >
                                        <option value="">{formData.propertyId ? 'Select Unit' : 'Please select building first'}</option>
                                        {formData.propertyId && units
                                            .filter(u => u.unit?.propertyId?.toString() === formData.propertyId)
                                            .map(u => (
                                                <option key={u.id} value={u.unitId}>
                                                    {u.unitNumber}
                                                </option>
                                            ))
                                        }
                                    </select>
                                </InputGroup>

                                <InputGroup label="Inspector" required>
                                    <select
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
                                        value={formData.inspectorId}
                                        onChange={(e) => setFormData({ ...formData, inspectorId: e.target.value })}
                                    >
                                        <option value="">Select Inspector</option>
                                        {inspectors.map(i => (
                                            <option key={i.id} value={i.id.toString()}>
                                                {i.name || `${i.firstName || ''} ${i.lastName || ''}`.trim() || `Staff #${i.id}`}
                                            </option>
                                        ))}
                                        {inspectors.length === 0 && <option value="1">Admin User</option>}
                                    </select>
                                </InputGroup>

                                <InputGroup label="Tenant" required>
                                    <div className="w-full px-4 py-3 bg-gray-100 border border-gray-100 rounded-2xl text-sm font-bold text-gray-500 truncate">
                                        {(() => {
                                            const selectedUnit = units.find(u => u.unitId === parseInt(formData.unitId));
                                            if (!selectedUnit) return 'Select a unit first';
                                            return selectedUnit.tenantName ||
                                                selectedUnit.lease?.tenant?.name ||
                                                selectedUnit.unit?.reserved_by_user?.name ||
                                                'No tenant/prospect linked';
                                        })()}
                                    </div>
                                </InputGroup>
                            </div>

                            <InputGroup label="Notes (Optional)">
                                <textarea
                                    placeholder="Add any notes or special instructions for this inspection..."
                                    className="w-full px-4 py-4 bg-gray-50 border border-gray-100 rounded-[24px] text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all min-h-[120px] resize-none"
                                />
                            </InputGroup>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-right-4 duration-500">
                            <div>
                                <h2 className="text-xl font-black text-gray-900 mb-1">Select Template</h2>
                                <p className="text-gray-500 text-sm">Please select the template you want to use for this inspection.</p>
                            </div>

                            <div className="relative">
                                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search templates..."
                                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
                                />
                            </div>

                            <div className="flex flex-col gap-4">
                                {templates.map(t => {
                                    const roomCount = t.structure?.rooms?.length || 0;
                                    const itemCount = t.structure?.rooms?.reduce((acc, r) => acc + (r.questions?.length || 0), 0) || 0;

                                    return (
                                        <TemplateCard
                                            key={t.id}
                                            name={t.name}
                                            type={t.type}
                                            building="All Buildings"
                                            rooms={roomCount}
                                            items={itemCount}
                                            selected={formData.templateId === t.id.toString()}
                                            onClick={() => setFormData({ ...formData, templateId: t.id.toString() })}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Footer Actions */}
                    <div className="mt-12 pt-8 border-t border-gray-100 flex items-center justify-between">
                        <button
                            onClick={handleBack}
                            disabled={step === 1}
                            className={`px-8 py-3 rounded-2xl text-sm font-black transition-all ${step === 1 ? 'opacity-0' : 'bg-gray-50 text-gray-500 hover:bg-gray-100 border border-gray-100'}`}
                        >
                            Back
                        </button>
                        <div className="flex items-center gap-3">
                            <button className="px-8 py-3 bg-white text-gray-500 rounded-2xl text-sm font-black border border-gray-100 hover:bg-gray-50 transition-all">
                                Save as Draft
                            </button>
                            <button
                                onClick={handleNext}
                                className="px-10 py-3 bg-indigo-600 text-white rounded-2xl text-sm font-black shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 flex items-center gap-2"
                            >
                                {step === 3 ? 'Create & Start Inspection' : 'Next'}
                                <ArrowRight size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </MainLayout>
    );
};

const InputGroup = ({ label, required, children }) => (
    <div className="flex flex-col gap-2">
        <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest pl-1">
            {label} {required && <span className="text-red-500">*</span>}
        </label>
        {children}
    </div>
);

const TemplateCard = ({ name, type, building, rooms, items, selected, onClick }) => (
    <div
        onClick={onClick}
        className={`p-6 rounded-[28px] border-2 transition-all cursor-pointer flex items-center justify-between group
        ${selected ? 'border-indigo-600 bg-indigo-50/30' : 'border-gray-100 hover:border-indigo-200 bg-white'}`}
    >
        <div className="flex items-center gap-6">
            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all
                ${selected ? 'border-indigo-600' : 'border-gray-200 group-hover:border-indigo-300'}`}>
                {selected && <div className="w-3 h-3 bg-indigo-600 rounded-full" />}
            </div>
            <div>
                <h4 className="font-black text-gray-900 text-base mb-1">{name}</h4>
                <div className="flex items-center gap-3 text-xs font-bold text-gray-400 uppercase tracking-wider">
                    <span>{type}</span>
                    <span className="text-gray-200">•</span>
                    <span>{building}</span>
                </div>
            </div>
        </div>
        <div className="flex items-center gap-8 pr-4">
            <div className="flex flex-col items-center">
                <span className="text-base font-black text-gray-900 leading-none mb-1">{rooms}</span>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Rooms</span>
            </div>
            <div className="flex flex-col items-center">
                <span className="text-base font-black text-gray-900 leading-none mb-1">{items}</span>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Items</span>
            </div>
        </div>
    </div>
);

export default NewInspectionWizard;
