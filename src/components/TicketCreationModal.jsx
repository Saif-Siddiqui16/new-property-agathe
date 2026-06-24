import React, { useState, useEffect } from 'react';
import { X, AlertCircle, CheckCircle2, ShieldAlert, Clock, Info } from 'lucide-react';

const TicketCreationModal = ({ isOpen, onClose, onSubmit, initialData }) => {
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        priority: 'High',
        category: 'MAINTENANCE',
        type: 'REPAIR',
        blockingStatus: 'MOVE_IN',
        isRequired: true,
        photos: [],
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    });

    // Sync formData when initialData changes
    useEffect(() => {
        if (isOpen && initialData) {
            setFormData({
                title: initialData.title || '',
                description: initialData.description || '',
                priority: 'High',
                category: 'MAINTENANCE',
                type: 'REPAIR',
                blockingStatus: 'MOVE_IN',
                isRequired: true,
                photos: initialData.photos || [],
                dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            });
        }
    }, [isOpen, initialData]);

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/80 backdrop-blur-sm">
            <div className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-600">
                            <AlertCircle size={28} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Report Deficiency</h2>
                            <p className="text-gray-500 text-sm font-medium">Create a ticket to track and resolve this issue.</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-3 hover:bg-white rounded-2xl transition-all shadow-sm border border-transparent hover:border-gray-100">
                        <X size={24} className="text-gray-400" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto">
                    {/* Photos Preview */}
                    {formData.photos.length > 0 && (
                        <div className="space-y-2">
                            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Attached Evidence ({formData.photos.length})</label>
                            <div className="flex gap-2 overflow-x-auto pb-2">
                                {formData.photos.map((p, i) => (
                                    <div key={i} className="w-24 h-24 rounded-2xl border border-gray-100 overflow-hidden shrink-0">
                                        <img src={p} className="w-full h-full object-cover" alt="Evidence" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Subject / Title</label>
                        <input 
                            required
                            type="text" 
                            value={formData.title}
                            onChange={(e) => setFormData({...formData, title: e.target.value})}
                            className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-orange-500/10 transition-all"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Detailed Description</label>
                        <textarea 
                            required
                            rows={4}
                            value={formData.description}
                            onChange={(e) => setFormData({...formData, description: e.target.value})}
                            className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-orange-500/10 transition-all resize-none"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Priority Level</label>
                            <select 
                                value={formData.priority}
                                onChange={(e) => setFormData({...formData, priority: e.target.value})}
                                className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-orange-500/10 transition-all"
                            >
                                <option value="Low">Low</option>
                                <option value="Medium">Medium</option>
                                <option value="High">High</option>
                                <option value="Urgent">Urgent</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Future Blocking Status</label>
                            <select 
                                value={formData.blockingStatus}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setFormData({
                                        ...formData, 
                                        blockingStatus: val,
                                        isRequired: val !== 'NON_BLOCKING'
                                    });
                                }}
                                className={`w-full px-5 py-4 border rounded-2xl text-sm font-bold outline-none focus:ring-4 transition-all ${formData.blockingStatus !== 'NON_BLOCKING' ? 'bg-red-50 border-red-100 text-red-600 focus:ring-red-500/10' : 'bg-gray-50 border-gray-100 text-gray-700 focus:ring-orange-500/10'}`}
                            >
                                <option value="NON_BLOCKING">Non-Blocking (Minor Issue)</option>
                                <option value="MOVE_IN">Blocks Future Move-In</option>
                                <option value="MOVE_OUT">Blocks Move-Out (Handover)</option>
                                <option value="BOTH">Blocks Both</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 p-6 bg-gray-50 rounded-[32px] border border-gray-100">
                        <div className="flex items-center h-5">
                            <input
                                id="isRequired"
                                type="checkbox"
                                checked={formData.isRequired}
                                onChange={(e) => setFormData({ ...formData, isRequired: e.target.checked })}
                                className="w-6 h-6 text-orange-600 border-gray-300 rounded-lg focus:ring-orange-500 transition-all cursor-pointer"
                            />
                        </div>
                        <div className="ml-3">
                            <label htmlFor="isRequired" className="text-xs font-black text-gray-900 uppercase tracking-tight cursor-pointer">
                                Mark as Required Ticket
                            </label>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-0.5">
                                Required tickets {formData.isRequired ? 'WILL PREVENT' : 'WILL NOT PREVENT'} completion of the workflow.
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-4 pt-4">
                        <button type="button" onClick={onClose} className="flex-1 py-4 bg-gray-50 text-gray-600 rounded-2xl text-xs font-black hover:bg-gray-100 transition-all uppercase tracking-widest">
                            Cancel
                        </button>
                        <button type="submit" className="flex-[2] py-4 bg-orange-600 text-white rounded-2xl text-xs font-black hover:bg-orange-700 shadow-xl shadow-orange-100 transition-all active:scale-95 flex items-center justify-center gap-2 uppercase tracking-widest">
                            <CheckCircle2 size={18} /> Create Ticket
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default TicketCreationModal;
