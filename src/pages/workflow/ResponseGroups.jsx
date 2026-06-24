import React, { useState, useEffect } from 'react';
import { 
    Plus, 
    Trash2, 
    ChevronLeft, 
    Save, 
    Layout, 
    CheckCircle2, 
    AlertCircle,
    GripVertical,
    PlusCircle,
    Settings2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '../../layouts/MainLayout';
import api from '../../api/client';

const ResponseGroups = () => {
    const navigate = useNavigate();
    const [series, setSeries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(null); // ID of series being edited

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        responses: [
            { label: 'Good', color: 'green' },
            { label: 'Fair', color: 'orange' },
            { label: 'Poor', color: 'red' }
        ]
    });

    const colors = [
        'green', 'orange', 'red', 'blue', 'indigo', 'purple', 
        'pink', 'cyan', 'teal', 'emerald', 'amber', 'rose', 'slate', 'gray'
    ];

    useEffect(() => {
        fetchSeries();
    }, []);

    const fetchSeries = async () => {
        try {
            const res = await api.get('/api/admin/workflow/response-series');
            if (res.data.success) {
                setSeries(res.data.data);
            }
        } catch (error) {
            console.error('Fetch error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!formData.name) return alert('Please enter a group name');
        if (formData.responses.length === 0) return alert('Please add at least one response');
        
        setSaving(true);
        try {
            const res = isEditing
                ? await api.put(`/api/admin/workflow/response-series/${isEditing}`, formData)
                : await api.post('/api/admin/workflow/response-series', formData);

            if (res.data.success) {
                fetchSeries();
                resetForm();
            }
        } catch (error) {
            console.error('Save error:', error);
            alert('Failed to save response group');
        } finally {
            setSaving(false);
        }
    };

    const resetForm = () => {
        setIsEditing(null);
        setFormData({
            name: '',
            description: '',
            responses: [
                { label: 'Good', color: 'green' },
                { label: 'Fair', color: 'orange' },
                { label: 'Poor', color: 'red' }
            ]
        });
    };

    const editSeries = (s) => {
        setIsEditing(s.id);
        setFormData({
            name: s.name,
            description: s.description || '',
            responses: s.responses || []
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const deleteSeries = async (id) => {
        if (!window.confirm('Are you sure? This will affect templates using this group.')) return;
        try {
            const res = await api.delete(`/api/admin/workflow/response-series/${id}`);
            if (res.data.success) fetchSeries();
        } catch (error) {
            alert('Failed to delete');
        }
    };

    return (
        <MainLayout title="Response Groups">
            <div className="max-w-6xl mx-auto py-8 px-4">
                <div className="flex items-center justify-between mb-10">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate(-1)} className="p-3 hover:bg-white rounded-2xl transition-all shadow-sm border border-transparent hover:border-gray-100">
                            <ChevronLeft size={24} className="text-gray-400" />
                        </button>
                        <div>
                            <h1 className="text-4xl font-black text-gray-900 tracking-tighter">Response Groups</h1>
                            <p className="text-gray-500 text-sm font-medium uppercase tracking-widest mt-1">Configure Custom Button Series for Inspections</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Form Column */}
                    <div className="lg:col-span-5 space-y-6">
                        <div className="bg-white p-8 rounded-[40px] shadow-xl border border-gray-100 sticky top-8">
                            <div className="flex items-center gap-3 mb-8">
                                <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                                    <PlusCircle size={24} />
                                </div>
                                <h2 className="text-xl font-black text-gray-900 tracking-tight">
                                    {isEditing ? 'Edit Group' : 'Create New Group'}
                                </h2>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Group Name (e.g. Standard, Cleanliness Only)</label>
                                    <input 
                                        type="text" 
                                        value={formData.name}
                                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                                        placeholder="e.g., Quick Condition Check"
                                        className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
                                    />
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Group Buttons</label>
                                    <div className="space-y-3">
                                        {formData.responses.map((choice, idx) => (
                                            <div key={idx} className="flex items-center gap-3 bg-gray-50 p-3 rounded-2xl border border-gray-100 group/item">
                                                <div className={`w-10 h-10 rounded-xl bg-${choice.color}-500 flex items-center justify-center shadow-lg shadow-${choice.color}-100 shrink-0`}>
                                                    <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                                                </div>
                                                <input 
                                                    className="bg-transparent text-sm font-black outline-none flex-1 placeholder:text-gray-300"
                                                    value={choice.label}
                                                    placeholder="Label..."
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        const newRes = [...formData.responses];
                                                        newRes[idx].label = val;
                                                        
                                                        // Smart Color Detection
                                                        const lowerVal = val.toLowerCase();
                                                        const positiveKeywords = ['yes', 'oui', 'pass', 'good', 'clean', 'functional', 'ok'];
                                                        const negativeKeywords = ['no', 'non', 'fail', 'poor', 'damaged', 'dirty', 'broken', 'deficiency'];
                                                        
                                                        if (positiveKeywords.some(word => lowerVal.includes(word))) {
                                                            newRes[idx].color = 'green';
                                                        } else if (negativeKeywords.some(word => lowerVal.includes(word))) {
                                                            newRes[idx].color = 'red';
                                                        }

                                                        setFormData({ ...formData, responses: newRes });
                                                    }}
                                                />
                                                <select 
                                                    className="text-[10px] font-black bg-white rounded-xl border border-gray-100 p-2 outline-none uppercase tracking-widest"
                                                    value={choice.color}
                                                    onChange={(e) => {
                                                        const newRes = [...formData.responses];
                                                        newRes[idx].color = e.target.value;
                                                        setFormData({ ...formData, responses: newRes });
                                                    }}
                                                >
                                                    {colors.map(c => <option key={c} value={c}>{c}</option>)}
                                                </select>
                                                <button 
                                                    onClick={() => setFormData({ ...formData, responses: formData.responses.filter((_, i) => i !== idx) })}
                                                    className="p-2 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                    <button 
                                        onClick={() => setFormData({ ...formData, responses: [...formData.responses, { label: '', color: 'indigo' }] })}
                                        className="w-full py-4 border-2 border-dashed border-gray-200 rounded-2xl text-[11px] font-black text-gray-400 hover:text-indigo-600 hover:border-indigo-100 hover:bg-indigo-50/50 transition-all uppercase tracking-widest"
                                    >
                                        + Add Response Button
                                    </button>
                                </div>

                                <div className="flex gap-4 pt-4">
                                    {isEditing && (
                                        <button 
                                            onClick={resetForm}
                                            className="flex-1 py-4 bg-gray-50 text-gray-500 rounded-2xl text-xs font-black hover:bg-gray-100 transition-all uppercase tracking-widest"
                                        >
                                            Cancel
                                        </button>
                                    )}
                                    <button 
                                        onClick={handleSave}
                                        disabled={saving}
                                        className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl text-xs font-black hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all active:scale-95 flex items-center justify-center gap-2 uppercase tracking-widest"
                                    >
                                        {saving ? 'Saving...' : <><Save size={18} /> {isEditing ? 'Update Group' : 'Save Group'}</>}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* List Column */}
                    <div className="lg:col-span-7 space-y-6">
                        <div className="grid grid-cols-1 gap-4">
                            {loading ? (
                                <div className="p-20 text-center font-black text-gray-300 tracking-widest animate-pulse">LOADING GROUPS...</div>
                            ) : series.length === 0 ? (
                                <div className="p-20 bg-white rounded-[40px] border-2 border-dashed border-gray-100 text-center">
                                    <Settings2 size={48} className="mx-auto text-gray-200 mb-4" />
                                    <p className="text-gray-400 font-black uppercase tracking-widest text-xs">No custom groups created yet</p>
                                </div>
                            ) : series.map(s => (
                                <div key={s.id} className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
                                    <div className="flex items-start justify-between relative z-10">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <h3 className="text-xl font-black text-gray-900 tracking-tight">{s.name}</h3>
                                                {s.isActive && (
                                                    <span className="text-[8px] font-black text-green-600 bg-green-50 px-2 py-0.5 rounded uppercase tracking-widest border border-green-100">Active</span>
                                                )}
                                            </div>
                                            <div className="flex flex-wrap gap-2 mb-4">
                                                {s.responses?.map((r, idx) => (
                                                    <div key={idx} className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">
                                                        <div className={`w-2 h-2 rounded-full bg-${r.color}-500`} />
                                                        <span className="text-[10px] font-black text-gray-600 uppercase tracking-tighter">{r.label}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0">
                                            <button 
                                                onClick={() => editSeries(s)}
                                                className="p-3 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                                            >
                                                <Edit3 size={16} />
                                            </button>
                                            <button 
                                                onClick={() => deleteSeries(s.id)}
                                                className="p-3 bg-red-50 text-red-400 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-sm"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                    
                                    {/* Subtle decorative bg */}
                                    <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
                                        <Layout size={120} className="text-indigo-900" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </MainLayout>
    );
};

const Edit3 = ({ size, className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
    </svg>
);

export default ResponseGroups;
