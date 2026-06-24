import React, { useState } from 'react';
import { TenantLayout } from '../../layouts/TenantLayout';
import { Files, Download, Eye, Upload, X, FileText, CheckCircle2 } from 'lucide-react';
import { Button } from '../../components/Button';
import api from '../../api/client';

const initialDocs = [
    { id: 1, name: 'Lease_Agreement_2025.pdf', type: 'Agreement', date: '2025-01-01' },
    { id: 2, name: 'Move_In_Inspection.pdf', type: 'Inspection', date: '2025-01-02' },
    { id: 3, name: 'ID_Proof_John_Smith.jpg', type: 'ID Proof', date: '2025-01-01' },
];

export const TenantDocuments = () => {
    const [docs, setDocs] = useState([]);
    const [showUpload, setShowUpload] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    // Add file input ref
    const fileInputRef = React.useRef(null);
    const [selectedFile, setSelectedFile] = useState(null);

    React.useEffect(() => {
        fetchDocs();
    }, []);

    const fetchDocs = async () => {
        try {
            const res = await api.get('/api/tenant/documents');
            if (res.data.length > 0) {
                setDocs(res.data);
            } else {
                setDocs([]);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleFileSelect = (e) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        setIsUploading(true);
        const form = e.target;

        if (!selectedFile) {
            alert("Please select a file");
            setIsUploading(false);
            return;
        }

        try {
            const formData = new FormData();
            formData.append('name', form.docName.value || selectedFile.name);
            formData.append('type', form.docType.value);
            formData.append('file', selectedFile);

            const res = await api.post('/api/tenant/documents', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            setDocs([res.data, ...docs]);
            setShowUpload(false);
            setSelectedFile(null);
        } catch (e) {
            console.error(e);
            alert('Upload failed');
        } finally {
            setIsUploading(false);
        }
    };

    const handleView = (url) => {
        let fileUrl = url;
        if (!fileUrl.startsWith('http')) {
            const base = api.defaults.baseURL.replace(/\/$/, '');
            const path = fileUrl.startsWith('/') ? fileUrl : `/${fileUrl}`;
            fileUrl = `${base}${path}`;
        }
        window.open(fileUrl, '_blank');
    };

    const handleDownload = (docId, url) => {
        const token = localStorage.getItem('accessToken');
        const base = api.defaults.baseURL.replace(/\/$/, '');
        const baseUrl = url.includes('?') ? url.split('?')[0] : url;
        const cleanPath = baseUrl.startsWith('/') ? baseUrl : `/${baseUrl}`;
        const finalUrl = `${base}${cleanPath}?disposition=attachment&token=${token}`;
        window.open(finalUrl, '_blank');
    };

    return (
        <TenantLayout title="My Documents">
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                    <div className="space-y-1">
                        <h2 className="text-xl font-black text-slate-800 tracking-tight">Personal Document Vault</h2>
                        <p className="text-sm text-slate-500 font-medium">Safe storage for your lease and ID documents.</p>
                    </div>
                    <Button variant="primary" className="rounded-xl flex items-center gap-2 font-bold py-3 shadow-lg shadow-primary-50 active:scale-95" onClick={() => setShowUpload(true)}>
                        <Upload size={18} />
                        Upload Document
                    </Button>
                </div>

                <section className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50/50">
                                <tr className="border-b border-slate-50">
                                    <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Document Name</th>
                                    <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">File Type</th>
                                    <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Upload Date</th>
                                    <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Expiry Date</th>
                                    <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {docs.map((doc) => (
                                    <tr key={doc.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center shrink-0 border border-primary-100">
                                                    <FileText size={20} />
                                                </div>
                                                <span className="font-bold text-slate-700 tracking-tight">{doc.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <span className="text-sm font-bold text-slate-500">{doc.type}</span>
                                        </td>
                                        <td className="px-8 py-5">
                                            <span className="text-sm font-medium text-slate-400">{doc.date}</span>
                                        </td>
                                        <td className="px-8 py-5">
                                            {doc.expiryDate ? (
                                                <span className="text-sm font-medium text-slate-600">
                                                    {new Date(doc.expiryDate).toLocaleDateString()}
                                                </span>
                                            ) : (
                                                <span className="text-sm text-slate-300">-</span>
                                            )}
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {doc.fileUrl && (
                                                    <>
                                                        <button
                                                            onClick={() => handleView(doc.fileUrl)}
                                                            className="p-2.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-all"
                                                            title="View Document"
                                                        >
                                                            <Eye size={20} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDownload(doc.id, doc.fileUrl)}
                                                            className="p-2.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                                                            title="Download PDF"
                                                        >
                                                            <Download size={20} />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {docs.length === 0 && (
                            <div className="p-20 text-center space-y-4">
                                <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto text-slate-200">
                                    <Files size={40} />
                                </div>
                                <p className="text-slate-400 font-bold">No documents uploaded yet.</p>
                            </div>
                        )}
                    </div>
                </section>
            </div>

            {/* UPLOAD MODAL */}
            {showUpload && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                            <h3 className="text-xl font-black text-slate-800">Upload New Document</h3>
                            <button onClick={() => setShowUpload(false)} className="p-2 text-slate-400 hover:bg-slate-50 rounded-xl transition-all">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleUpload} className="p-8 space-y-6">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Friendly Name</label>
                                <input name="docName" className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:border-primary-500 outline-none font-medium text-slate-700" placeholder="e.g. Utility Bill Jan" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Document Type</label>
                                <select name="docType" className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:border-primary-500 outline-none bg-white font-medium text-slate-700 appearance-none">
                                    <option value="ID Proof">ID Proof</option>
                                    <option value="Agreement">Lease Related</option>
                                    <option value="Utility">Utility Bill</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>

                            <input
                                type="file"
                                className="hidden"
                                ref={fileInputRef}
                                onChange={handleFileSelect}
                                accept="application/pdf,image/*"
                            />

                            <div
                                className={`border-2 border-dashed rounded-2xl p-8 text-center space-y-4 hover:border-primary-300 transition-colors cursor-pointer group ${selectedFile ? 'border-primary-500 bg-primary-50/10' : 'border-slate-200'}`}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center mx-auto text-slate-400 group-hover:text-primary-500 group-hover:bg-primary-50 transition-colors">
                                    {selectedFile ? <CheckCircle2 size={24} className="text-emerald-500" /> : <Upload size={24} />}
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-slate-700">
                                        {selectedFile ? selectedFile.name : 'Click to select file'}
                                    </p>
                                    <p className="text-xs text-slate-400 font-medium mt-1">
                                        {selectedFile ? `${Math.round(selectedFile.size / 1024)} KB` : 'PDF, JPG, PNG (Max 10MB)'}
                                    </p>
                                </div>
                            </div>

                            <Button variant="primary" className="w-full h-14 rounded-2xl font-black text-lg" disabled={isUploading || !selectedFile}>
                                {isUploading ? 'Uploading...' : 'Confirm Upload'}
                            </Button>
                        </form>
                    </div>
                </div>
            )}
        </TenantLayout>
    );
};
