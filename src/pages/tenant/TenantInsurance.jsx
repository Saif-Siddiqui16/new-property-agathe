import React, { useState, useEffect, useRef } from 'react';
import { TenantLayout } from '../../layouts/TenantLayout';
import { ShieldCheck, AlertTriangle, Calendar, Info, Eye, X, FileText, Upload, Download, Clock } from 'lucide-react';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import api from '../../api/client';

export const TenantInsurance = () => {
    const [insurance, setInsurance] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showPreview, setShowPreview] = useState(false);
    const [showUploadModal, setShowUploadModal] = useState(false);

    const [isUploading, setIsUploading] = useState(false);
    const [formData, setFormData] = useState({
        provider: '',
        policyNumber: '',
        coverageType: '',
        startDate: '',
        endDate: ''
    });
    const fileInputRef = useRef(null);
    const [selectedFile, setSelectedFile] = useState(null);

    const fetchInsurance = async () => {
        try {
            setIsLoading(true);
            const res = await api.get('/api/tenant/insurance');
            setInsurance(res.data);
            if (res.data) {
                setFormData({
                    provider: res.data.provider,
                    policyNumber: res.data.policyNumber,
                    coverageType: res.data.coverageType || '',
                    startDate: res.data.startDate,
                    endDate: res.data.endDate
                });
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchInsurance();
    }, []);

    const handleFileSelect = (e) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        const data = new FormData();
        data.append('provider', formData.provider);
        data.append('policyNumber', formData.policyNumber);
        data.append('coverageType', formData.coverageType);
        data.append('startDate', formData.startDate);
        data.append('endDate', formData.endDate);
        if (selectedFile) {
            data.append('file', selectedFile);
        } else {
            alert('Please select an insurance document file');
            return;
        }

        try {
            setIsUploading(true);
            await api.post('/api/tenant/insurance', data, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setShowUploadModal(false);
            fetchInsurance();
        } catch (error) {
            console.error(error);
            alert('Upload failed');
        } finally {
            setIsUploading(false);
        }
    };

    if (isLoading) return <div className="p-10 text-center">Loading insurance details...</div>;

    // Status Styling Logic
    const getStatusConfig = (status) => {
        switch (status) {
            case 'ACTIVE': return { bg: 'emerald-50', text: 'emerald-600', border: 'emerald-100', icon: ShieldCheck, label: 'Approved & Active' };
            case 'PENDING_APPROVAL': return { bg: 'amber-50', text: 'amber-600', border: 'amber-100', icon: Info, label: 'Pending Admin Review' };
            case 'REJECTED': return { bg: 'red-50', text: 'red-600', border: 'red-100', icon: X, label: 'Policy Rejected' };
            case 'EXPIRED': return { bg: 'red-50', text: 'red-600', border: 'red-100', icon: AlertTriangle, label: 'Policy Expired' };
            case 'EXPIRING_SOON': return { bg: 'amber-50', text: 'amber-600', border: 'amber-100', icon: Clock, label: 'Expiring Soon' };
            default: return { bg: 'slate-50', text: 'slate-600', border: 'slate-100', icon: Info, label: status };
        }
    };

    const statusConfig = getStatusConfig(insurance?.status || 'N/A');
    const canEdit = false; // Uploads are strictly managed by Admin at this stage

    return (
        <TenantLayout title="Insurance Compliance">
            <div className="max-w-4xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* STATUS BAR */}
                {insurance && (
                    <div className={`p-6 rounded-3xl border ${statusConfig.bg} ${statusConfig.border} flex items-center justify-between`}>
                        <div className="flex items-center gap-4">
                            {(() => {
                                const StatusIcon = statusConfig.icon;
                                return (
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg bg-${statusConfig.text.split('-')[0]}-500`}>
                                        <StatusIcon size={24} />
                                    </div>
                                );
                            })()}
                            <div>
                                <h3 className={`font-black tracking-tight text-${statusConfig.text.split('-')[0]}-900`}>{statusConfig.label}</h3>
                                <p className={`text-sm font-medium text-${statusConfig.text.split('-')[0]}-700/80`}>
                                    {insurance.status === 'REJECTED' ? `Reason: ${insurance.rejectionReason}` :
                                        insurance.status === 'PENDING_APPROVAL' ? "We'll notify you once admin reviews your document." :
                                            `Valid until ${new Date(insurance.endDate).toLocaleDateString()}`}
                                </p>
                            </div>
                        </div>
                        {canEdit && (
                            <Button size="sm" onClick={() => setShowUploadModal(true)}>Update Policy</Button>
                        )}
                    </div>
                )}

                {!insurance ? (
                    <section className="bg-white rounded-[40px] border-4 border-dashed border-slate-100 p-16 flex flex-col items-center text-center space-y-8">
                        <div className="w-24 h-24 bg-slate-50 rounded-[32px] flex items-center justify-center text-slate-300 shadow-inner">
                            <ShieldCheck size={48} />
                        </div>
                        <div className="max-w-md space-y-3">
                            <h2 className="text-3xl font-black text-slate-800 tracking-tight">Protect Your Home</h2>
                            <p className="text-slate-500 font-medium leading-relaxed">
                                Renters insurance is mandatory for all tenants to protect your personal property and liability.
                                Please provide your policy documents to your Property Administrator to comply.
                            </p>
                        </div>
                    </section>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 space-y-8">
                            <Card className="p-8 rounded-[32px] shadow-xl shadow-slate-100/50 border-0 bg-white">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 pb-10 border-b border-slate-50">
                                    <div className="flex items-center gap-5">
                                        <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center italic font-black text-2xl border border-indigo-100 shadow-sm">
                                            {insurance.provider.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-black text-slate-800 tracking-tight">{insurance.provider}</h3>
                                            <p className="text-sm font-black text-slate-400 uppercase tracking-widest leading-none mt-1">{insurance.coverageType || 'General Liability'}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Policy Number</p>
                                        <p className="text-lg font-mono font-black text-slate-700 tracking-tighter">{insurance.policyNumber}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-8">
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 text-slate-400">
                                            <Calendar size={16} />
                                            <span className="text-xs font-black uppercase tracking-widest">Effective Date</span>
                                        </div>
                                        <p className="text-lg font-black text-slate-700">{new Date(insurance.startDate).toLocaleDateString()}</p>
                                    </div>
                                    <div className="space-y-4 text-right">
                                        <div className="flex items-center gap-2 text-slate-400 justify-end">
                                            <Calendar size={16} />
                                            <span className="text-xs font-black uppercase tracking-widest">Expiration Date</span>
                                        </div>
                                        <p className={`text-lg font-black ${insurance.status === 'EXPIRED' ? 'text-red-600' : 'text-slate-800'}`}>
                                            {new Date(insurance.endDate).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-10 pt-10 border-t border-slate-50 flex gap-4">
                                    <Button variant="secondary" className="flex-1 h-14 rounded-2xl" onClick={() => setShowPreview(true)}>
                                        <Eye size={18} className="mr-2" />
                                        View Certificate
                                    </Button>
                                    {canEdit && (
                                        <Button variant="outline" className="flex-1 h-14 rounded-2xl" onClick={() => setShowUploadModal(true)}>
                                            <Upload size={18} className="mr-2" />
                                            Update Policy
                                        </Button>
                                    )}
                                </div>
                            </Card>

                            <section className="bg-slate-900 rounded-[32px] p-8 text-white flex items-center justify-between relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-500"></div>
                                <div className="space-y-2 relative z-10">
                                    <h4 className="text-xl font-black tracking-tight italic">Switch & Save?</h4>
                                    <p className="text-slate-400 text-sm font-medium max-w-xs">Compare renters insurance quotes directly from our portfolio partners.</p>
                                </div>
                                <button className="bg-white text-slate-900 px-6 py-3 rounded-xl font-black text-sm hover:scale-105 transition-all relative z-10">
                                    Get Quotes
                                </button>
                            </section>
                        </div>

                        <div className="space-y-8">
                            <Card className="p-8 rounded-[32px] bg-indigo-600 text-white border-0 shadow-xl shadow-indigo-100">
                                <Info size={32} className="mb-6 opacity-80" />
                                <h4 className="text-xl font-black mb-3 italic tracking-tight uppercase">Why Insurance?</h4>
                                <p className="text-indigo-100 text-sm font-medium leading-relaxed opacity-90">
                                    Did you know your landlord's insurance doesn't cover your belongings? Renter's insurance protects everything inside your home from theft, fire, or water damage.
                                </p>
                            </Card>
                        </div>
                    </div>
                )}
            </div>

            {/* UPLOAD MODAL */}
            {showUploadModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[32px] w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
                        <div className="p-8 border-b border-slate-50 flex items-center justify-between shrink-0 bg-white">
                            <h3 className="text-2xl font-black text-slate-800 tracking-tight">Upload Policy</h3>
                            <button onClick={() => setShowUploadModal(false)} className="p-2.5 text-slate-400 hover:bg-slate-50 rounded-2xl transition-all">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleUpload} className="p-8 space-y-5 overflow-y-auto custom-scrollbar flex-1">
                            <div className="space-y-1.5 px-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Insurance Provider</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.provider}
                                    onChange={e => setFormData({ ...formData, provider: e.target.value })}
                                    className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 outline-none focus:border-indigo-500 font-bold text-slate-700 bg-slate-50 focus:bg-white transition-all shadow-sm"
                                    placeholder="e.g. State Farm, Geico"
                                />
                            </div>
                            <div className="space-y-1.5 px-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Policy Number</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.policyNumber}
                                    onChange={e => setFormData({ ...formData, policyNumber: e.target.value })}
                                    className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 outline-none focus:border-indigo-500 font-bold text-slate-700 bg-slate-50 focus:bg-white transition-all shadow-sm"
                                    placeholder="e.g. SF-9001-X"
                                />
                            </div>
                            <div className="space-y-1.5 px-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Coverage Type</label>
                                <select
                                    value={formData.coverageType}
                                    onChange={e => setFormData({ ...formData, coverageType: e.target.value })}
                                    className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 outline-none focus:border-indigo-500 font-bold text-slate-700 bg-slate-50 focus:bg-white transition-all shadow-sm appearance-none"
                                >
                                    <option value="">Select Type</option>
                                    <option value="General Liability">General Liability</option>
                                    <option value="Full Comprehensive">Full Comprehensive</option>
                                    <option value="Theft & Liability">Theft & Liability</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5 px-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Start Date</label>
                                    <input
                                        type="date"
                                        required
                                        value={formData.startDate.substring(0, 10)}
                                        onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                                        className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 outline-none focus:border-indigo-500 font-bold text-slate-700 bg-slate-50 focus:bg-white transition-all shadow-sm"
                                    />
                                </div>
                                <div className="space-y-1.5 px-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">End Date</label>
                                    <input
                                        type="date"
                                        required
                                        value={formData.endDate.substring(0, 10)}
                                        onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                                        className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 outline-none focus:border-indigo-500 font-bold text-slate-700 bg-slate-50 focus:bg-white transition-all shadow-sm"
                                    />
                                </div>
                            </div>
                            <div className="pt-2">
                                <div
                                    onClick={() => fileInputRef.current.click()}
                                    className={`w-full p-8 border-2 border-dashed rounded-3xl flex flex-col items-center gap-3 cursor-pointer transition-all ${selectedFile ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30'}`}
                                >
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${selectedFile ? 'bg-emerald-500 text-white' : 'bg-white shadow-sm text-slate-400'}`}>
                                        <Upload size={24} />
                                    </div>
                                    <p className="text-sm font-black text-slate-600 tracking-tight">{selectedFile ? selectedFile.name : 'Select Policy Document (PDF)'}</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Max file size: 10MB</p>
                                </div>
                                <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileSelect} accept=".pdf,image/*" />
                            </div>
                            <div className="pt-4 flex gap-4 sticky bottom-0 bg-white pb-2">
                                <Button type="button" variant="secondary" className="flex-1 h-16 rounded-2xl" onClick={() => setShowUploadModal(false)}>Cancel</Button>
                                <Button type="submit" variant="primary" className="flex-1 h-16 rounded-2xl shadow-xl shadow-indigo-100" disabled={isUploading}>
                                    {isUploading ? 'Finalizing...' : 'Submit Policy'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* DOCUMENT PREVIEW MODAL */}
            {showPreview && insurance?.documentUrl && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[32px] w-full max-w-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
                        <div className="p-4 border-b border-slate-50 flex items-center justify-between bg-white shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-indigo-500 text-white rounded-lg flex items-center justify-center shadow-lg">
                                    <FileText size={16} />
                                </div>
                                <div>
                                    <h3 className="text-base font-black text-slate-800 tracking-tight">Policy Document</h3>
                                    <p className="text-[8px] font-black text-indigo-500 uppercase tracking-widest leading-none mt-1">Certificate of Insurance</p>
                                </div>
                            </div>
                            <button onClick={() => setShowPreview(false)} className="p-2 text-slate-400 hover:bg-slate-50 rounded-lg transition-all">
                                <X size={18} />
                            </button>
                        </div>
                        
                        <div className="p-6 space-y-6">
                            <div className="text-center space-y-4">
                                <div className="w-20 h-20 bg-indigo-50 text-indigo-500 rounded-3xl flex items-center justify-center mx-auto shadow-sm">
                                    <FileText size={32} />
                                </div>
                                <div className="space-y-1">
                                    <h4 className="text-lg font-bold text-slate-800">Ready to Review</h4>
                                    <p className="text-slate-500 font-medium text-sm px-4">Your insurance policy document is securely stored and ready for download.</p>
                                </div>
                            </div>

                            <Button
                                variant="primary"
                                className="w-full h-14 rounded-2xl text-base font-bold shadow-xl shadow-primary-100"
                                onClick={async () => {
                                    try {
                                        const downloadUrl = (insurance.uploadedDocumentId)
                                            ? `/api/tenant/documents/${insurance.uploadedDocumentId}/download`
                                            : (insurance.documentUrl.startsWith('http') ? insurance.documentUrl : `${api.defaults.baseURL.replace(/\/+$/, '')}/${insurance.documentUrl.replace(/^\/+/, '')}`);

                                        let finalUrl = downloadUrl;
                                        if (insurance.uploadedDocumentId) {
                                            const token = localStorage.getItem('accessToken');
                                            // Ensure we hit the full backend URL instead of relative path
                                            const baseUrl = api.defaults.baseURL.replace(/\/+$/, '');
                                            finalUrl = `${baseUrl}${downloadUrl}?token=${token}`;
                                        }

                                        window.location.href = finalUrl;
                                    } catch (e) {
                                        console.error('Download failed', e);
                                        alert('Could not download certificate');
                                    }
                                }}
                            >
                                <Download size={18} className="mr-2" />
                                Download Secure PDF
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </TenantLayout>
    );
};
