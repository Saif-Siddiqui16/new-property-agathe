import React, { useState, useEffect, useMemo } from "react";
import { MainLayout } from "../layouts/MainLayout";
import {
    FileText,
    Search,
    Download,
    Trash2,
    Filter,
    ExternalLink,
    Building,
    User,
    Clock,
    Shield,
    FileMinus,
    Plus,
    X,
    Upload,
    CheckCircle2,
    RefreshCw,
    ChevronLeft,
    ChevronRight,
    Edit
} from "lucide-react";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import api from "../api/client";
import { hasPermission } from "../utils/permissions";

export const DocumentLibrary = () => {
    const [__forceUpdate, __setForceUpdate] = useState(0);
    useEffect(() => {
        const handleUpdate = () => __setForceUpdate(p => p + 1);
        window.addEventListener('permissionsUpdated', handleUpdate);
        return () => window.removeEventListener('permissionsUpdated', handleUpdate);
    }, []);

    const [typeFilter, setTypeFilter] = useState("All");
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [loading, setLoading] = useState(true);
    const [documents, setDocuments] = useState([]);
    const [search, setSearch] = useState("");
    const [expiryFilter, setExpiryFilter] = useState("All");
    const [currentPage, setCurrentPage] = useState(1);
    const docsPerPage = 10;
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState(null);

    // Form State
    const [uploadFile, setUploadFile] = useState(null);
    const [uploadType, setUploadType] = useState("Other");
    const [uploadName, setUploadName] = useState("");
    const [expiryDate, setExpiryDate] = useState("");
    const [selectedLinks, setSelectedLinks] = useState([]); // [{entityType, entityId, label}]

    // Dropdown Data
    const [dropdownData, setDropdownData] = useState({
        tenants: [],
        properties: [],
        units: [],
        leases: []
    });
    const [linkSearch, setLinkSearch] = useState("");
    const [linkType, setLinkType] = useState("USER");

    const fetchDocuments = async () => {
        try {
            setLoading(true);
            const res = await api.get("/api/admin/documents");
            setDocuments(res.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this document? This action cannot be undone.")) return;
        try {
            await api.delete(`/api/admin/documents/${id}`);
            fetchDocuments();
        } catch (error) {
            alert("Delete failed");
        }
    };

    const fetchDropdownData = async () => {
        try {
            const [tenants, props, units, leases] = await Promise.all([
                api.get("/api/admin/tenants?limit=1000"),
                api.get("/api/admin/properties"),
                api.get("/api/admin/units?limit=1000"),
                api.get("/api/admin/leases")
            ]);
            setDropdownData({
                tenants: tenants.data.data || (Array.isArray(tenants.data) ? tenants.data : []),
                properties: props.data.data || (Array.isArray(props.data) ? props.data : []),
                units: units.data.data || (Array.isArray(units.data) ? units.data : []),
                leases: Array.isArray(leases.data) ? leases.data : []
            });
        } catch (e) { console.error(e); }
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        
        if (isEditing) return handleUpdate(e);
        if (!uploadFile) return alert("Please select a file");

        try {
            setUploading(true);
            const formData = new FormData();
            formData.append("file", uploadFile);
            formData.append("type", uploadType);
            formData.append("name", uploadName);
            formData.append("expiryDate", expiryDate);
            formData.append("links", JSON.stringify(selectedLinks.map(l => ({
                entityType: l.entityType,
                entityId: l.entityId
            }))));

            await api.post("/api/admin/documents/upload", formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });

            alert("Document uploaded successfully");
            setShowUploadModal(false);
            resetUploadForm();
            fetchDocuments();
        } catch (error) {
            console.error(error);
            alert("Upload failed");
        } finally {
            setUploading(false);
        }
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        try {
            setUploading(true);
            await api.put(`/api/admin/documents/${editingId}`, {
                type: uploadType,
                name: uploadName,
                expiryDate,
                links: selectedLinks.map(l => ({ entityType: l.entityType, entityId: l.entityId }))
            });

            alert("Document updated successfully");
            setShowUploadModal(false);
            resetUploadForm();
            fetchDocuments();
        } catch (error) {
            console.error(error);
            alert("Update failed");
        } finally {
            setUploading(false);
        }
    };

    const openEditModal = (doc) => {
        setIsEditing(true);
        setEditingId(doc.id);
        setUploadName(doc.name);
        setUploadType(doc.type);
        setExpiryDate(doc.expiryDate ? new Date(doc.expiryDate).toISOString().split('T')[0] : "");
        
        // Map backend links to label-inclusive state
        const links = (doc.links || []).map(l => {
            let label = `ID: ${l.entityId}`;
            if (l.entityType === 'USER' && doc.user) label = doc.user.firstName + ' ' + doc.user.lastName;
            else if (l.entityType === 'PROPERTY' && doc.property) label = doc.property.name;
            else if (l.entityType === 'UNIT' && doc.unit) label = doc.unit.unitNumber || doc.unit.name;
            else if (l.entityType === 'LEASE') label = `Lease #${l.entityId}`;
            return { entityType: l.entityType, entityId: l.entityId, label };
        });
        setSelectedLinks(links);
        setShowUploadModal(true);
    };

    const resetUploadForm = () => {
        setIsEditing(false);
        setEditingId(null);
        setUploadFile(null);
        setUploadType("Other");
        setUploadName("");
        setExpiryDate("");
        setSelectedLinks([]);
    };

    useEffect(() => {
        fetchDocuments();
        fetchDropdownData();
    }, []);

    const filteredDocuments = documents.filter(doc => {
        const matchesSearch = doc.name.toLowerCase().includes(search.toLowerCase()) ||
            doc.user?.firstName?.toLowerCase().includes(search.toLowerCase()) ||
            doc.user?.lastName?.toLowerCase().includes(search.toLowerCase());
        const matchesType = typeFilter === "All" || doc.type === typeFilter;
        
        const today = new Date().setHours(0,0,0,0);
        const isExpired = doc.expiryDate && new Date(doc.expiryDate) < today;
        let matchesExpiry = true;
        if (expiryFilter === "Expired") matchesExpiry = isExpired;
        else if (expiryFilter === "Active") matchesExpiry = !isExpired && doc.expiryDate;
        else if (expiryFilter === "No Expiry") matchesExpiry = !doc.expiryDate;

        return matchesSearch && matchesType && matchesExpiry;
    });

    const sortedDocuments = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return [...filteredDocuments].sort((a, b) => {
            const aExpired = a.expiryDate && new Date(a.expiryDate) < today;
            const bExpired = b.expiryDate && new Date(b.expiryDate) < today;
            if (aExpired && !bExpired) return -1;
            if (!aExpired && bExpired) return 1;
            if (a.expiryDate && b.expiryDate) return new Date(a.expiryDate) - new Date(b.expiryDate);
            return 0;
        });
    }, [filteredDocuments]);

    const getIcon = (type) => {
        switch (type) {
            case 'Insurance': return <Shield className="text-emerald-500" size={20} />;
            case 'Lease': return <FileText className="text-indigo-500" size={20} />;
            case 'Invoice': return <FileText className="text-amber-500" size={20} />;
            default: return <FileText className="text-slate-400" size={20} />;
        }
    };

    return (
        <MainLayout title="Document Library">
            <div className="space-y-8 animate-in fade-in duration-500">

                {/* STATS / HEADER */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-1">
                        <p className="text-slate-500 font-medium">Access and manage all system-wide documents and tenant uploads.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        {hasPermission('Documents', 'add') && (
                            <Button variant="primary" className="h-12 px-6 rounded-2xl shadow-lg shadow-indigo-100" onClick={() => setShowUploadModal(true)}>
                                <Plus size={20} className="mr-2" />
                                Upload Document
                            </Button>
                        )}
                        <div className="px-5 py-3 bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
                            <FileText className="text-indigo-600" size={20} />
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Total Files</p>
                                <p className="text-lg font-black text-slate-800 leading-none">{documents.length}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* FILTERS */}
                <Card className="p-6 rounded-[24px] border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4 items-center">
                    <div className="flex-1 relative w-full">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search by filename or tenant..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-12 pr-5 py-3.5 rounded-[18px] border border-slate-200 outline-none focus:border-indigo-500 font-medium text-slate-700 bg-slate-50 focus:bg-white transition-all shadow-inner"
                        />
                    </div>
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className="flex items-center gap-2 px-4 py-3.5 rounded-[18px] border border-slate-200 bg-white font-bold text-slate-600 text-sm">
                            <Filter size={16} className="text-slate-400" />
                            <select
                                value={typeFilter}
                                onChange={(e) => setTypeFilter(e.target.value)}
                                className="outline-none bg-transparent cursor-pointer"
                            >
                                <option value="All">All Types</option>
                                <option value="Lease">Leases</option>
                                <option value="Insurance">Insurance</option>
                                <option value="Refund Proof">Refund Proof</option>
                            </select>
                        </div>
                        <div className="flex items-center gap-2 px-4 py-3.5 rounded-[18px] border border-slate-200 bg-white font-bold text-slate-600 text-sm">
                            <Clock size={16} className="text-slate-400" />
                            <select
                                value={expiryFilter}
                                onChange={(e) => { setExpiryFilter(e.target.value); setCurrentPage(1); }}
                                className="outline-none bg-transparent cursor-pointer"
                            >
                                <option value="All">All Expiry States</option>
                                <option value="Active">Active (Has Date)</option>
                                <option value="Expired">Expired</option>
                                <option value="No Expiry">No Expiry Date</option>
                            </select>
                        </div>
                        <Button
                            variant="secondary"
                            className="h-14 px-6 rounded-[18px]"
                            onClick={() => { setSearch(""); setTypeFilter("All"); setExpiryFilter("All"); setCurrentPage(1); }}
                        >
                            Reset
                        </Button>
                    </div>
                </Card>

                {/* TABLE VIEW */}
                <Card className="bg-white rounded-2xl shadow-sm overflow-hidden border border-slate-100">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Name</th>
                                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Type</th>
                                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Linked Entity</th>
                                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Expiry Date</th>
                                    <th className="px-6 py-4 text-right text-xs font-black text-slate-400 uppercase tracking-widest">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {loading ? (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-12 text-center">
                                            <div className="flex items-center justify-center">
                                                <RefreshCw className="animate-spin text-slate-400" size={24} />
                                            </div>
                                        </td>
                                    </tr>
                                ) : sortedDocuments.length > 0 ? (
                                    sortedDocuments
                                        .slice((currentPage - 1) * docsPerPage, currentPage * docsPerPage)
                                        .map(doc => {
                                        const isExpired = doc.expiryDate && new Date(doc.expiryDate) < new Date().setHours(0,0,0,0);
                                        // Determine linked entity display
                                        let linkedEntity = '-';
                                        if (doc.user) {
                                            linkedEntity = `Tenant: ${doc.user.firstName || ''} ${doc.user.lastName || ''}`.trim();
                                        } else if (doc.property) {
                                            linkedEntity = `Building: ${doc.property.name}${doc.property.civicNumber ? ` - ${doc.property.civicNumber}` : ''}`;
                                        } else if (doc.unit) {
                                            linkedEntity = `Unit: ${doc.unit.name || doc.unit.unitNumber || 'N/A'}`;
                                        } else if (doc.lease) {
                                            linkedEntity = doc.lease.tenant
                                                ? `Lease: ${doc.lease.tenant.name || `${doc.lease.tenant.firstName} ${doc.lease.tenant.lastName}`}`
                                                : `Lease #${doc.lease.id}`;
                                        } else if (doc.invoice) {
                                            linkedEntity = `Invoice: ${doc.invoice.invoiceNo || doc.invoice.id}`;
                                        }

                                        return (
                                            <tr key={doc.id} className="hover:bg-slate-50/50 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center shrink-0">
                                                            {getIcon(doc.type)}
                                                        </div>
                                                        <span className="font-bold text-slate-800">{doc.name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="px-2 py-1 bg-slate-100 rounded-md text-xs font-bold text-slate-600 uppercase tracking-wider">
                                                        {doc.type}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-sm font-medium text-slate-600">{linkedEntity}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {doc.expiryDate ? (
                                                        <span className={`text-sm font-black ${isExpired ? 'text-rose-600' : 'text-slate-700'}`}>
                                                            {new Date(doc.expiryDate).toLocaleDateString()}
                                                            {isExpired && <span className="ml-2 px-1.5 py-0.5 bg-rose-50 text-[8px] rounded uppercase tracking-tighter">Expired</span>}
                                                        </span>
                                                    ) : (
                                                        <span className="text-sm text-slate-400">-</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        {hasPermission('Documents', 'edit') && (
                                                            <button
                                                                onClick={() => openEditModal(doc)}
                                                                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                                                                title="Edit Details"
                                                            >
                                                                <Edit size={16} />
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={async () => {
                                                                if (!doc.fileUrl) return alert("File URL missing");
                                                                const token = localStorage.getItem('accessToken');
                                                                const base = api.defaults.baseURL.replace(/\/$/, '');
                                                                const baseUrl = doc.fileUrl.includes('?') ? doc.fileUrl.split('?')[0] : doc.fileUrl;
                                                                const cleanPath = baseUrl.startsWith('/') ? baseUrl : `/${baseUrl}`;
                                                                const downloadUrl = `${base}${cleanPath}?disposition=attachment&token=${token}`;
                                                                window.open(downloadUrl, '_blank');
                                                            }}
                                                            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all"
                                                            title="Download"
                                                        >
                                                            <Download size={16} />
                                                        </button>
                                                        {hasPermission('Documents', 'delete') && (
                                                            <button
                                                                onClick={() => handleDelete(doc.id)}
                                                                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all"
                                                                title="Delete"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-20 text-center">
                                            <div className="space-y-4">
                                                <div className="w-20 h-20 bg-slate-50 rounded-[24px] flex items-center justify-center mx-auto text-slate-200">
                                                    <FileMinus size={48} />
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-slate-400 font-bold text-xl">No documents found matching your filters.</p>
                                                    <p className="text-slate-400/60 font-medium">Try resetting filters or searching for something else.</p>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>

                {/* PAGINATION */}
                {sortedDocuments.length > docsPerPage && (
                    <div className="flex items-center justify-between bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                            Showing <span className="text-slate-800">{Math.min(sortedDocuments.length, (currentPage - 1) * docsPerPage + 1)}</span> to <span className="text-slate-800">{Math.min(sortedDocuments.length, currentPage * docsPerPage)}</span> of <span className="text-slate-800">{sortedDocuments.length}</span> Results
                        </p>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                                className="w-10 h-10 flex items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                            >
                                <ChevronLeft size={18} />
                            </button>
                            {Array.from({ length: Math.ceil(sortedDocuments.length / docsPerPage) }).map((_, i) => (
                                <button
                                    key={i}
                                    type="button"
                                    onClick={() => setCurrentPage(i + 1)}
                                    className={`w-10 h-10 flex items-center justify-center rounded-xl text-xs font-black transition-all ${currentPage === i + 1 ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                                >
                                    {i + 1}
                                </button>
                            ))}
                            <button
                                type="button"
                                onClick={() => setCurrentPage(prev => Math.min(Math.ceil(sortedDocuments.length / docsPerPage), prev + 1))}
                                disabled={currentPage === Math.ceil(sortedDocuments.length / docsPerPage)}
                                className="w-10 h-10 flex items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                            >
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    </div>
                )}

                {/* UPLOAD MODAL */}
                {
                    showUploadModal && (
                        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in">
                            <div className="bg-white rounded-[40px] w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95">
                                <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                                    <div>
                                        <h3 className="text-2xl font-black text-slate-800 tracking-tight">{isEditing ? 'Update Document' : 'Upload Document'}</h3>
                                        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">{isEditing ? 'Modify existing document metadata' : 'Add a new file and link it to entities'}</p>
                                    </div>
                                    <button onClick={() => { setShowUploadModal(false); resetUploadForm(); }} className="p-2 text-slate-400 hover:text-slate-800 rounded-2xl bg-white shadow-sm border border-slate-100">
                                        <X size={20} />
                                    </button>
                                </div>

                                <form onSubmit={handleUpload} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Document Type</label>
                                            <select
                                                value={uploadType}
                                                onChange={(e) => setUploadType(e.target.value)}
                                                className="w-full px-4 py-3 rounded-2xl border border-slate-200 outline-none focus:border-indigo-500 font-bold text-slate-700 bg-slate-50"
                                                required
                                            >
                                                <option value="Lease">Lease Agreement</option>
                                                <option value="Insurance">Insurance Policy</option>
                                                <option value="Refund Proof">Refund Proof</option>
                                                <option value="ID">Identification</option>
                                                <option value="Other">Other</option>
                                            </select>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Display Name (Optional)</label>
                                            <input
                                                type="text"
                                                placeholder="Standard naming applied if blank"
                                                value={uploadName}
                                                onChange={(e) => setUploadName(e.target.value)}
                                                className="w-full px-4 py-3 rounded-2xl border border-slate-200 outline-none focus:border-indigo-500 font-bold text-slate-700 bg-slate-50"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Expiry Date (Optional)</label>
                                            <input
                                                type="date"
                                                value={expiryDate}
                                                onChange={(e) => setExpiryDate(e.target.value)}
                                                className="w-full px-4 py-3 rounded-2xl border border-slate-200 outline-none focus:border-indigo-500 font-bold text-slate-700 bg-slate-50"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{isEditing ? "File (Read Only)" : "Select File"}</label>
                                            <div className="relative">
                                                <input
                                                    type="file"
                                                    onChange={(e) => setUploadFile(e.target.files[0])}
                                                    className={`absolute inset-0 opacity-0 ${isEditing ? 'cursor-not-allowed' : 'cursor-pointer'} z-10`}
                                                    required={!isEditing}
                                                    disabled={isEditing}
                                                />
                                                <div className="w-full px-4 py-3 rounded-2xl border border-slate-200 border-dashed bg-slate-50 flex items-center gap-3 text-slate-500 font-bold text-sm">
                                                    <Upload size={18} className="text-indigo-500" />
                                                    {isEditing ? "File cannot be changed here" : (uploadFile ? uploadFile.name : "Choose PDF or Image...")}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* MULTI-LINKING SECTION */}
                                    <div className="p-6 bg-indigo-50/50 rounded-[32px] border border-indigo-100/50 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-[11px] font-black text-indigo-500 uppercase tracking-widest">Multi-Entity Linking</h4>
                                            <span className="text-[10px] bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full font-bold">{selectedLinks.length} Linked</span>
                                        </div>

                                        <div className="flex gap-2">
                                            <select
                                                value={linkType}
                                                onChange={(e) => setLinkType(e.target.value)}
                                                className="px-3 py-2 rounded-xl bg-white border border-indigo-100 text-xs font-bold outline-none"
                                            >
                                                <option value="USER">Tenant</option>
                                                <option value="PROPERTY">Property</option>
                                                <option value="UNIT">Unit</option>
                                                <option value="LEASE">Lease</option>
                                            </select>
                                            <div className="flex-1 relative">
                                                <select
                                                    onChange={(e) => {
                                                        const id = e.target.value;
                                                        if (!id) return;
                                                        const label = e.target.options[e.target.selectedIndex].text;
                                                        if (!selectedLinks.find(l => l.entityId === id && l.entityType === linkType)) {
                                                            setSelectedLinks([...selectedLinks, { entityType: linkType, entityId: id, label }]);
                                                        }
                                                    }}
                                                    className="w-full px-3 py-2 rounded-xl bg-white border border-indigo-100 text-xs font-bold outline-none"
                                                >
                                                    <option value="">Search & Add...</option>
                                                    {linkType === 'USER' && (dropdownData.tenants || []).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                                    {linkType === 'PROPERTY' && (dropdownData.properties || []).map(p => <option key={p.id} value={p.id}>{p.name} - {p.civicNumber}</option>)}
                                                    {linkType === 'UNIT' && (dropdownData.units || []).map(u => <option key={u.id} value={u.id}>{u.unitNumber}</option>)}
                                                    {linkType === 'LEASE' && (dropdownData.leases || []).map(l => <option key={l.id} value={l.id}>{l.tenant}</option>)}
                                                </select>
                                            </div>
                                        </div>

                                        {selectedLinks.length > 0 && (
                                            <div className="flex flex-wrap gap-2 pt-2">
                                                {selectedLinks.map((link, idx) => (
                                                    <div key={idx} className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-full border border-indigo-100 text-[10px] font-bold text-slate-600 shadow-sm animate-in zoom-in-90">
                                                        <span className="text-[8px] bg-indigo-50 text-indigo-500 px-1.5 py-0.5 rounded-md uppercase">{link.entityType}</span>
                                                        {link.label}
                                                        <button type="button" onClick={() => setSelectedLinks(selectedLinks.filter((_, i) => i !== idx))} className="text-slate-300 hover:text-red-500">
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div className="pt-4 flex gap-4">
                                        <Button
                                            variant="secondary"
                                            className="flex-1 h-14 rounded-2xl"
                                            type="button"
                                            onClick={() => { setShowUploadModal(false); resetUploadForm(); }}
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            variant="primary"
                                            className="flex-1 h-14 rounded-2xl shadow-xl shadow-indigo-100"
                                            type="submit"
                                            disabled={uploading}
                                        >
                                            {uploading ? (isEditing ? "Updating..." : "Uploading...") : (isEditing ? "Save Changes" : "Finish Upload")}
                                        </Button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )
                }
            </div >
        </MainLayout >
    );
};
