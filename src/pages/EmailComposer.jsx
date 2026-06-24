import React, { useState, useEffect } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import api from '../api/client';
import { 
    Users, Layout, Edit3, Paperclip, Send, ChevronRight, ChevronLeft, 
    Building, Search, Filter, CheckCircle2, AlertCircle, X, PlusCircle, FileText
} from 'lucide-react';
import { MainLayout } from '../layouts/MainLayout';
import { hasPermission } from '../utils/permissions';

const EmailComposer = () => {
    const [__forceUpdate, __setForceUpdate] = useState(0);
    useEffect(() => {
        const handleUpdate = () => __setForceUpdate(p => p + 1);
        window.addEventListener('permissionsUpdated', handleUpdate);
        return () => window.removeEventListener('permissionsUpdated', handleUpdate);
    }, []);

    if (!hasPermission('Send Email', 'view')) {
        return (
            <MainLayout title="Permission Denied">
                <div className="p-12 text-center bg-white rounded-[2rem] border border-slate-100 shadow-sm mt-8">
                    <h3 className="text-xl font-black text-slate-800">Access Restricted</h3>
                    <p className="max-w-md mx-auto mt-2 text-slate-500 font-medium italic">
                        You do not have permission to view this section. Please contact your administrator.
                    </p>
                </div>
            </MainLayout>
        );
    }

    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState(null); // { type: 'success'|'error', message: '' }

    // Data for selectors
    const [buildings, setBuildings] = useState([]);
    const [manualAttachments, setManualAttachments] = useState([]);
    const fileInputRef = React.useRef(null);
    const [tenants, setTenants] = useState([]);
    const [coworkers, setCoworkers] = useState([]); // New state for team
    const [templates, setTemplates] = useState([]);
    const [documents, setDocuments] = useState([]);
    const [filteredCoworkersList, setFilteredCoworkersList] = useState([]); // Search for team
    
    // Pagination & Search for Tenants
    const [tenantPage, setTenantPage] = useState(1);
    const [tenantSearchTerm, setTenantSearchTerm] = useState('');
    const tenantsPerPage = 6; 
    
    // Pagination & Search for Residents
    const [residentPage, setResidentPage] = useState(1);
    const [residentSearchTerm, setResidentSearchTerm] = useState('');
    const residentsPerPage = 6;

    // Pagination & Search for Buildings
    const [buildingPage, setBuildingPage] = useState(1);
    const [buildingSearchTerm, setBuildingSearchTerm] = useState('');
    const buildingsPerPage = 4; // Buildings are larger, let's show fewer per page

    // Draft State
    const [selection, setSelection] = useState({
        buildingIds: [],
        tenantIds: [],
        coworkerIds: [], // New state for granular team selection
        excludedTenantIds: [], // New state for granular deselects
        filterType: 'all' // all, outstanding, expiring_insurance, upcoming_moveout
    });
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [emailDraft, setEmailDraft] = useState({
        subject: '',
        body: '',
        manualAttachments: []
    });
    const [signature, setSignature] = useState('');

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        try {
            setLoading(true);
            const tryFetch = async (url, fallback = []) => {
                try {
                    const res = await api.get(url);
                    return Array.isArray(res.data) ? res.data : (res.data?.data || res.data || fallback);
                } catch (e) {
                    console.warn(`Partial fetch failed for ${url}:`, e.message);
                    return fallback;
                }
            };

            const [buildingsData, tenantsData, coworkersData, templatesData, documentsData, signatureData] = await Promise.all([
                tryFetch('/api/admin/properties'),
                tryFetch('/api/admin/tenants?limit=1000&status=Active'), 
                tryFetch('/api/admin/coworkers'), // Fetch team members
                tryFetch('/api/admin/email/templates'),
                tryFetch('/api/admin/documents?limit=1000'),
                tryFetch('/api/admin/email/signature', { signature: '' })
            ]);
            
            setBuildings(buildingsData);
            setTenants(tenantsData);
            setCoworkers(coworkersData);
            setTemplates(templatesData);
            setDocuments(documentsData);
            setSignature(signatureData?.signature || '');

            return { templates: templatesData, tenants: tenantsData, coworkers: coworkersData };
        } catch (error) {
            console.error('Critical error in fetchInitialData:', error);
            return null;
        } finally {
            setLoading(false);
        }
    };

    const handleTemplateSelect = (template) => {
        setSelectedTemplate(template);
        
        // Convert plain text newlines to HTML paragraphs for ReactQuill
        // This fixes the "messy" formatting where templates appear on a single line.
        let formattedBody = template.body;
        if (!template.body.includes('<p>') && !template.body.includes('<div>')) {
            formattedBody = template.body
                .split('\n')
                .map(line => line.trim() === '' ? '<p><br></p>' : `<p>${line}</p>`)
                .join('');
        }

        setEmailDraft({
            ...emailDraft,
            subject: template.subject,
            body: formattedBody
        });
        setStep(3);
    };

    const toggleTenantExclusion = (id) => {
        setSelection(prev => ({
            ...prev,
            excludedTenantIds: prev.excludedTenantIds.includes(id)
                ? prev.excludedTenantIds.filter(tid => tid !== id)
                : [...prev.excludedTenantIds, id]
        }));
    };

    const toggleIndividualTenant = (id) => {
        setSelection(prev => ({
            ...prev,
            // If already explicitly selected, remove. Otherwise add.
            tenantIds: prev.tenantIds.includes(id)
                ? prev.tenantIds.filter(tid => tid !== id)
                : [...prev.tenantIds, id],
            // Also ensure it's not in exclusions if we are explicitly adding it
            excludedTenantIds: prev.excludedTenantIds.filter(tid => tid !== id)
        }));
    };

    const toggleBuilding = (id) => {
        const ids = selection.buildingIds.includes(id) 
            ? selection.buildingIds.filter(bid => bid !== id)
            : [...selection.buildingIds, id];
        setSelection({ ...selection, buildingIds: ids });
    };

    const toggleCoworker = (id) => {
        setSelection(prev => ({
            ...prev,
            coworkerIds: prev.coworkerIds.includes(id)
                ? prev.coworkerIds.filter(cid => cid !== id)
                : [...prev.coworkerIds, id]
        }));
    };

    const getFilteredRecipients = () => {
        const selectedRecipientsMap = new Map(); // Map to store tenants and avoid duplicates within the SAME building context
        
        // 1. Process Buildings
        if (selection.buildingIds.length > 0) {
            selection.buildingIds.forEach(bId => {
                const selectedId = String(bId);
                tenants.forEach(t => {
                    if (selection.excludedTenantIds.includes(t.id)) return; // Skip if explicitly excluded

                    // Check direct link or leases for THIS building
                    const hasLink = String(t.buildingId) === selectedId || 
                                  String(t.propertyId) === selectedId ||
                                  t.leases?.some(l => 
                                      (String(l.unit?.propertyId) === selectedId || 
                                      String(l.unit?.property?.id) === selectedId ||
                                      String(l.propertyId) === selectedId) &&
                                      l.status === 'Active' &&
                                      (!l.endDate || new Date(l.endDate) >= new Date())
                                  );
                    
                    if (hasLink) {
                        // Create a compound key: TenantId-BuildingId
                        const compoundKey = `${t.id}-${bId}`;
                        selectedRecipientsMap.set(compoundKey, { ...t, targetPropertyId: bId });
                    }
                });
            });
        }

        // 2. Process Individual Selections (Fallback to their default building/lease)
        selection.tenantIds.forEach(tId => {
            if (selection.excludedTenantIds.includes(tId)) return; // Skip if explicitly excluded

            const tenant = tenants.find(t => t.id === tId);
            if (tenant) {
                const defaultPropertyId = tenant.buildingId || tenant.propertyId || (tenant.leases && tenant.leases[0]?.unit?.propertyId);
                const compoundKey = `${tId}-${defaultPropertyId}`;
                if (!selectedRecipientsMap.has(compoundKey)) {
                    selectedRecipientsMap.set(compoundKey, { ...tenant, targetPropertyId: defaultPropertyId });
                }
            }
        });

        // 3. Process Individual Coworkers (New)
        selection.coworkerIds.forEach(cId => {
            const coworker = coworkers.find(c => c.id === cId);
            if (coworker) {
                const compoundKey = `coworker-${cId}`;
                if (!selectedRecipientsMap.has(compoundKey)) {
                    selectedRecipientsMap.set(compoundKey, { ...coworker, targetPropertyId: null });
                }
            }
        });

        let results = Array.from(selectedRecipientsMap.values());

        // 3. Filtering by Status (Existing logic)
        if (selection.filterType === 'outstanding') {
            // Check if tenant has any unpaid amount (simplified client-side check)
            results = results.filter(t => (t.rentAmount > 0)); // Future: check real balance
        } else if (selection.filterType === 'expiring_insurance') {
            const thirtyDaysFromNow = new Date();
            thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
            
            results = results.filter(t => t.insurance?.some(i => {
                const end = new Date(i.endDate);
                return end <= thirtyDaysFromNow;
            }));
        }
        
        return results;
    };

    const handleManualUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setLoading(true);
        setStatus({ type: 'info', message: 'Uploading to Cloudinary...' });

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('type', 'Communication');
            formData.append('name', file.name);

            const response = await api.post('/api/admin/documents/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setManualAttachments([...manualAttachments, response.data]);
            setStatus({ type: 'success', message: 'Attachment uploaded successfully!' });
        } catch (err) {
            console.error('Upload error:', err);
            setStatus({ type: 'error', message: 'Failed to upload attachment' });
        } finally {
            setLoading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const removeManualAttachment = (id) => {
        setManualAttachments(manualAttachments.filter(a => a.id !== id));
    };

    const handleSend = async () => {
        setLoading(true);
        setStatus(null);
        try {
            const recipients = getFilteredRecipients().map(r => ({
                id: r.id,
                propertyId: r.targetPropertyId
            }));
            const payload = {
                recipients,
                templateId: selectedTemplate?.id,
                customSubject: emailDraft.subject,
                customBody: emailDraft.body,
                manualAttachmentIds: manualAttachments.map(d => d.id)
            };

            const response = await api.post('/api/admin/email/send-bulk', payload);
            setStatus({ type: 'success', message: `Successfully sent to ${response.data.results.success} recipients!` });
            setStep(5);
        } catch (error) {
            console.error('Send error:', error);
            setStatus({ type: 'error', message: error.response?.data?.error || 'Failed to send emails.' });
        } finally {
            setLoading(false);
        }
    };

    const insertPlaceholder = (ph) => {
        const phTag = `{{${ph}}}`;
        // This is a simple append, but Quill allows precise insertion if needed
        setEmailDraft({ ...emailDraft, body: emailDraft.body + phTag });
    };

    const placeholders = [
        'tenantFirstName', 'tenantLastName', 'tenantFullName', 
        'buildingName', 'unitNumber', 'bedroomNumber', 
        'leaseEndDate', 'rentAmount', 'outstandingBalance', 
        'depositBalance', 'moveOutDate', 'insuranceExpiryDate',
        'month', 'year'
    ];

    const steps = [
        { id: 1, label: 'Select Recipients', icon: Users },
        { id: 2, label: 'Choose Template', icon: Layout },
        { id: 3, label: 'Compose & Edit', icon: Edit3 },
        { id: 4, label: 'Review & Send', icon: Send }
    ];

    return (
        <MainLayout title="Professional Email Broadcasting">
            <style>
                {`
                    .ql-container {
                        height: calc(100% - 42px) !important;
                        font-size: 14px;
                    }
                    .ql-editor {
                        min-height: 100%;
                        padding-bottom: 30px !important;
                    }
                `}
            </style>
            <div className="text-slate-800">
                {/* Multi-step Header */}
                <div className="mb-10">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h1 className="text-3xl font-extrabold text-gray-900">Communication Center</h1>
                            <p className="text-gray-500 font-medium">Step {step}: {steps.find(s => s.id === step)?.label}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 bg-white p-4 rounded-3xl shadow-sm border border-gray-100 overflow-x-auto">
                        {steps.map((s, idx) => (
                            <React.Fragment key={s.id}>
                                <div className={`flex items-center gap-3 transition-all shrink-0 ${step >= s.id ? 'text-indigo-600' : 'text-gray-400'}`}>
                                    <div className={`h-10 w-10 rounded-2xl flex items-center justify-center font-bold transition-all border-2 ${
                                        step === s.id ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100 scale-110' : 
                                        step > s.id ? 'bg-indigo-50 border-indigo-100 text-indigo-600' : 'bg-gray-50 border-gray-50'
                                    }`}>
                                        {s.id}
                                    </div>
                                    <span className={`text-sm font-bold ${step === s.id ? 'text-gray-900' : ''}`}>{s.label}</span>
                                </div>
                                {idx < steps.length - 1 && <div className="flex-1 min-w-[20px] h-0.5 bg-gray-100" />}
                            </React.Fragment>
                        ))}
                    </div>
                </div>

                {/* STEP 1: RECIPIENT SELECTION */}
                {step === 1 && (
                    <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100 animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                            {/* Left Column: Team, Buildings & Individual Search */}
                            <div className="space-y-6">
                                {/* management & team selection */}
                                <div className="space-y-6 pb-10 border-b border-gray-100 mb-10">
                                    <h3 className="text-xl font-bold text-gray-900 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Users className="h-5 w-5 text-indigo-600" />
                                            Management & Team
                                        </div>
                                        <div className="relative">
                                            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <input 
                                                type="text" 
                                                placeholder="Search team..." 
                                                className="pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 placeholder:text-gray-400"
                                                onChange={(e) => {
                                                    const term = e.target.value.toLowerCase();
                                                    setFilteredCoworkersList(coworkers.filter(c => c.name.toLowerCase().includes(term) || c.email.toLowerCase().includes(term)));
                                                }}
                                            />
                                        </div>
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        {(filteredCoworkersList.length > 0 ? filteredCoworkersList : coworkers).map(c => (
                                            <button
                                                key={c.id}
                                                onClick={() => toggleCoworker(c.id)}
                                                className={`p-4 rounded-2xl border-2 text-left transition-all ${
                                                    selection.coworkerIds.includes(c.id) 
                                                    ? 'border-indigo-600 bg-indigo-50/50 ring-4 ring-indigo-50' 
                                                    : 'border-gray-50 bg-gray-50 hover:border-gray-200'
                                                }`}
                                            >
                                                <div className="text-sm font-bold text-gray-800 line-clamp-1">{c.name}</div>
                                                <div className="text-[11px] text-indigo-400 font-bold uppercase tracking-tight line-clamp-1">{c.title || 'Team Member'}</div>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <h3 className="text-xl font-bold text-gray-900 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Building className="h-5 w-5 text-indigo-600" />
                                        Target Buildings
                                    </div>
                                    <div className="relative">
                                        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input 
                                            type="text" 
                                            placeholder="Search building..." 
                                            className="pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 placeholder:text-gray-400"
                                            value={buildingSearchTerm}
                                            onChange={(e) => {
                                                setBuildingSearchTerm(e.target.value);
                                                setBuildingPage(1);
                                            }}
                                        />
                                    </div>
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    {(() => {
                                        const filtered = buildings.filter(b => 
                                            b.name.toLowerCase().includes(buildingSearchTerm.toLowerCase()) || 
                                            b.address.toLowerCase().includes(buildingSearchTerm.toLowerCase())
                                        );
                                        const paginated = filtered.slice((buildingPage - 1) * buildingsPerPage, buildingPage * buildingsPerPage);
                                        const totalPages = Math.ceil(filtered.length / buildingsPerPage);
                                        
                                        return (
                                            <>
                                                {paginated.map(b => (
                                                    <button
                                                        key={b.id}
                                                        onClick={() => toggleBuilding(b.id)}
                                                        className={`p-4 rounded-2xl border-2 text-left transition-all ${
                                                            selection.buildingIds.includes(b.id) 
                                                            ? 'border-indigo-600 bg-indigo-50/50 ring-4 ring-indigo-50' 
                                                            : 'border-gray-50 bg-gray-50 hover:border-gray-200'
                                                        }`}
                                                    >
                                                        <div className={`text-sm font-bold uppercase tracking-tight line-clamp-1 ${selection.buildingIds.includes(b.id) ? 'text-indigo-700' : 'text-gray-600'}`}>
                                                            {b.name}
                                                        </div>
                                                        <div className="text-[10px] text-gray-400 mt-1 line-clamp-1">{b.address}</div>
                                                    </button>
                                                ))}
                                                
                                                {filtered.length > buildingsPerPage && (
                                                    <div className="col-span-2 flex items-center justify-between mt-2 px-2">
                                                        <div className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">
                                                            Page {buildingPage} of {totalPages}
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <button 
                                                                onClick={() => setBuildingPage(p => Math.max(1, p - 1))}
                                                                disabled={buildingPage === 1}
                                                                className="p-1.5 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                                            >
                                                                <ChevronLeft className="h-4 w-4 text-gray-600" />
                                                            </button>
                                                            <button 
                                                                onClick={() => setBuildingPage(p => Math.min(totalPages, p + 1))}
                                                                disabled={buildingPage === totalPages}
                                                                className="p-1.5 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                                            >
                                                                <ChevronRight className="h-4 w-4 text-gray-600" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </>
                                        );
                                    })()}
                                </div>

                                <div className="space-y-6 pt-10 border-t border-gray-100 mt-10">
                                    <h3 className="text-xl font-bold text-gray-900 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Users className="h-5 w-5 text-indigo-600" />
                                            Individual Tenants
                                        </div>
                                        <div className="relative">
                                            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <input 
                                                type="text" 
                                                placeholder="Search by name..." 
                                                className="pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 placeholder:text-gray-400"
                                                value={tenantSearchTerm}
                                                onChange={(e) => {
                                                    setTenantSearchTerm(e.target.value);
                                                    setTenantPage(1);
                                                }}
                                            />
                                        </div>
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        {tenants.filter(t => t.type !== 'RESIDENT').length === 0 && (
                                            <div className="col-span-2 text-center py-10 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-100 text-gray-400">
                                                No tenants were found in the database.
                                            </div>
                                        )}
                                        {(() => {
                                            const filtered = tenants
                                                .filter(t => t.type !== 'RESIDENT')
                                                .filter(t => 
                                                    t.name.toLowerCase().includes(tenantSearchTerm.toLowerCase()) || 
                                                    t.email.toLowerCase().includes(tenantSearchTerm.toLowerCase())
                                                );
                                            const paginated = filtered.slice((tenantPage - 1) * tenantsPerPage, tenantPage * tenantsPerPage);
                                            const totalPages = Math.ceil(filtered.length / tenantsPerPage);
                                            
                                            return (
                                                <>
                                                    {paginated.map(t => (
                                                        <button
                                                            key={t.id}
                                                            onClick={() => toggleIndividualTenant(t.id)}
                                                            className={`p-4 rounded-2xl border-2 text-left transition-all ${
                                                                selection.tenantIds.includes(t.id) 
                                                                ? 'border-indigo-600 bg-indigo-50/50 ring-4 ring-indigo-50' 
                                                                : 'border-gray-50 bg-gray-50 hover:border-gray-200'
                                                            }`}
                                                        >
                                                            <div className="text-sm font-bold text-gray-800 line-clamp-1">{t.name}</div>
                                                            <div className="text-[11px] text-gray-400 line-clamp-1">{t.email}</div>
                                                        </button>
                                                    ))}
                                                    
                                                    {filtered.length > tenantsPerPage && (
                                                        <div className="col-span-2 flex items-center justify-between mt-2 px-2">
                                                            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">
                                                                Page {tenantPage} of {totalPages}
                                                            </div>
                                                            <div className="flex gap-2">
                                                                <button 
                                                                    onClick={() => setTenantPage(p => Math.max(1, p - 1))}
                                                                    disabled={tenantPage === 1}
                                                                    className="p-1.5 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                                                >
                                                                    <ChevronLeft className="h-4 w-4 text-gray-600" />
                                                                </button>
                                                                <button 
                                                                    onClick={() => setTenantPage(p => Math.min(totalPages, p + 1))}
                                                                    disabled={tenantPage === totalPages}
                                                                    className="p-1.5 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                                                >
                                                                    <ChevronRight className="h-4 w-4 text-gray-600" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </>
                                            );
                                        })()}
                                    </div>
                                </div>

                                <div className="space-y-6 pt-10 border-t border-gray-100 mt-10">
                                    <h3 className="text-xl font-bold text-gray-900 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Users className="h-5 w-5 text-indigo-600" />
                                            Individual Residents
                                        </div>
                                        <div className="relative">
                                            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <input 
                                                type="text" 
                                                placeholder="Search by name..." 
                                                className="pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 placeholder:text-gray-400"
                                                value={residentSearchTerm}
                                                onChange={(e) => {
                                                    setResidentSearchTerm(e.target.value);
                                                    setResidentPage(1);
                                                }}
                                            />
                                        </div>
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        {tenants.filter(t => t.type === 'RESIDENT').length === 0 && (
                                            <div className="col-span-2 text-center py-10 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-100 text-gray-400">
                                                No residents were found in the database.
                                            </div>
                                        )}
                                        {(() => {
                                            const filtered = tenants
                                                .filter(t => t.type === 'RESIDENT')
                                                .filter(t => 
                                                    t.name.toLowerCase().includes(residentSearchTerm.toLowerCase()) || 
                                                    t.email.toLowerCase().includes(residentSearchTerm.toLowerCase())
                                                );
                                            const paginated = filtered.slice((residentPage - 1) * residentsPerPage, residentPage * residentsPerPage);
                                            const totalPages = Math.ceil(filtered.length / residentsPerPage);
                                            
                                            return (
                                                <>
                                                    {paginated.map(t => (
                                                        <button
                                                            key={t.id}
                                                            onClick={() => toggleIndividualTenant(t.id)}
                                                            className={`p-4 rounded-2xl border-2 text-left transition-all ${
                                                                selection.tenantIds.includes(t.id) 
                                                                ? 'border-indigo-600 bg-indigo-50/50 ring-4 ring-indigo-50' 
                                                                : 'border-gray-50 bg-gray-50 hover:border-gray-200'
                                                            }`}
                                                        >
                                                            <div className="text-sm font-bold text-gray-800 line-clamp-1">{t.name}</div>
                                                            <div className="text-[11px] text-gray-400 line-clamp-1">{t.email}</div>
                                                        </button>
                                                    ))}
                                                    
                                                    {filtered.length > residentsPerPage && (
                                                        <div className="col-span-2 flex items-center justify-between mt-2 px-2">
                                                            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">
                                                                Page {residentPage} of {totalPages}
                                                            </div>
                                                            <div className="flex gap-2">
                                                                <button 
                                                                    onClick={() => setResidentPage(p => Math.max(1, p - 1))}
                                                                    disabled={residentPage === 1}
                                                                    className="p-1.5 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                                                >
                                                                    <ChevronLeft className="h-4 w-4 text-gray-600" />
                                                                </button>
                                                                <button 
                                                                    onClick={() => setResidentPage(p => Math.min(totalPages, p + 1))}
                                                                    disabled={residentPage === totalPages}
                                                                    className="p-1.5 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                                                >
                                                                    <ChevronRight className="h-4 w-4 text-gray-600" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </>
                                            );
                                        })()}
                                    </div>
                                </div>
                            </div>

                            {/* Right Column: Population Summary */}
                            <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 relative group/summary">
                                <h3 className="text-xl font-bold text-gray-900 mb-4 flex justify-between items-center">
                                    Population Summary
                                    <div className="flex items-center gap-2">
                                        {(selection.excludedTenantIds.length > 0 || selection.tenantIds.length > 0) && (
                                            <button 
                                                onClick={() => setSelection({ ...selection, excludedTenantIds: [], tenantIds: [], buildingIds: [] })}
                                                className="text-[10px] font-bold text-red-500 hover:underline uppercase"
                                            >
                                                Reset All
                                            </button>
                                        )}
                                        <span className="text-xs bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full uppercase">
                                            {getFilteredRecipients().length} Recipients
                                        </span>
                                    </div>
                                </h3>
                                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                                    {getFilteredRecipients().map(r => (
                                        <div key={r.id} className="bg-white p-3 rounded-xl border border-gray-100 flex justify-between items-center group/item hover:border-red-100 transition-all">
                                            <div>
                                                <div className="text-sm font-bold text-gray-800">{r.name}</div>
                                                <div className="text-[11px] text-gray-400">{r.email}</div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="flex flex-col items-end">
                                                     <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded">
                                                         {r.type || r.role}
                                                     </span>
                                                    <span className="text-[8px] text-gray-400 uppercase mt-0.5">
                                                        {buildings.find(b => String(b.id) === String(r.targetPropertyId))?.name || 'Main Residence'}
                                                    </span>
                                                </div>
                                                <button 
                                                    onClick={() => toggleTenantExclusion(r.id)}
                                                    className="p-1 hover:bg-red-50 text-gray-300 hover:text-red-500 rounded-md transition-all opacity-0 group-hover/item:opacity-100"
                                                    title="Exclude from this broadcast"
                                                >
                                                    <X className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    {getFilteredRecipients().length === 0 && (
                                        <div className="py-10 text-center text-gray-400 animate-pulse">
                                            Select buildings or tenants to begin...
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* STEP 2: TEMPLATE SELECTION */}
                {step === 2 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <button 
                            onClick={() => setStep(3)}
                            className="bg-white border-2 border-dashed border-gray-200 p-8 rounded-3xl flex flex-col items-center justify-center text-gray-400 hover:border-indigo-300 hover:text-indigo-500 transition-all group"
                        >
                            <PlusCircle className="h-12 w-12 mb-3 group-hover:scale-110 transition-all" />
                            <span className="font-bold text-lg">Start from Blank</span>
                        </button>
                        {templates.map(t => (
                            <button
                                key={t.id}
                                onClick={() => handleTemplateSelect(t)}
                                className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 text-left hover:border-indigo-600 transition-all hover:shadow-xl group"
                            >
                                <div className="bg-indigo-50 p-3 rounded-2xl w-fit mb-4 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                    <Layout className="h-6 w-6" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900">{t.name}</h3>
                                <p className="text-sm text-gray-500 mt-1 line-clamp-2">{t.subject}</p>
                                <div className="mt-4 flex items-center justify-between">
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                                        <Paperclip className="h-3 w-3" /> {t.documents?.length || 0} Files
                                    </span>
                                    <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-indigo-600 transition-all" />
                                </div>
                            </button>
                        ))}
                    </div>
                )}

                {/* STEP 3: EDITOR */}
                {step === 3 && (
                    <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-2 space-y-6">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Subject Line</label>
                                    <input 
                                        type="text" 
                                        value={emailDraft.subject}
                                        onChange={(e) => setEmailDraft({...emailDraft, subject: e.target.value})}
                                        className="w-full px-6 py-4 border-2 border-gray-100 rounded-2xl focus:border-indigo-600 focus:ring-0 transition-all outline-none bg-gray-50/50 text-lg font-bold text-gray-900"
                                        placeholder="Add subject..."
                                    />
                                </div>
                                <div className="flex flex-col h-[500px]">
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Email Body</label>
                                    <div className="flex-1 rounded-2xl overflow-hidden border-2 border-gray-100">
                                        <ReactQuill 
                                            theme="snow" 
                                            value={emailDraft.body}
                                            onChange={(content) => setEmailDraft({...emailDraft, body: content})}
                                            className="h-full bg-white"
                                            modules={{
                                                toolbar: [
                                                    [{ 'header': [1, 2, false] }],
                                                    ['bold', 'italic', 'underline', 'strike', 'blockquote'],
                                                    [{'list': 'ordered'}, {'list': 'bullet'}, {'indent': '-1'}, {'indent': '+1'}],
                                                    ['link', 'image'],
                                                    ['clean']
                                                ],
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-6">
                                <div className="bg-gray-900 text-white p-6 rounded-3xl">
                                    <h4 className="text-md font-bold mb-4 flex items-center gap-2">
                                        <Edit3 className="h-5 w-5 text-indigo-400" />
                                        Dynamic Placeholders
                                    </h4>
                                    <p className="text-xs text-gray-400 mb-6 italic font-medium">Click to insert at current position.</p>
                                    <div className="flex flex-wrap gap-2">
                                        {placeholders.map(ph => (
                                            <button 
                                                key={ph}
                                                onClick={() => insertPlaceholder(ph)}
                                                className="bg-gray-800 hover:bg-indigo-600 text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all active:scale-95"
                                            >
                                                { ph.split(/(?=[A-Z])/).join(' ') }
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="bg-white p-6 rounded-3xl border-2 border-gray-100">
                                    <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2 underline decoration-indigo-200">
                                        Corporate Signature
                                    </h4>
                                    <div 
                                        className="p-4 border border-dashed border-gray-200 rounded-xl bg-gray-50/50 text-[11px] text-gray-500 overflow-hidden" 
                                        dangerouslySetInnerHTML={{ __html: signature || '<p class="italic text-gray-400">No signature configured</p>' }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* STEP 4: REVIEW & ATTACHMENTS */}
                {step === 4 && (
                    <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <div className="bg-indigo-900 rounded-3xl p-8 text-white relative overflow-hidden">
                            <div className="relative z-10">
                                <h2 className="text-3xl font-black mb-2 flex items-center gap-3">
                                    <CheckCircle2 className="h-8 w-8 text-indigo-400" />
                                    Final Review
                                </h2>
                                <p className="text-indigo-200 font-medium">Ready to communicate with {getFilteredRecipients().length} tenants.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div>
                                <h3 className="text-lg font-extrabold text-gray-900 mb-4">Attachments</h3>
                                <div className="space-y-3">
                                    {/* Template Linked */}
                                    {selectedTemplate?.documents?.map(doc => (
                                        <div key={doc.id} className="p-4 bg-gray-50 rounded-2xl flex items-center justify-between border border-gray-100">
                                            <div className="flex items-center gap-3">
                                                <FileText className="h-6 w-6 text-gray-400" />
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-gray-700">{doc.name}</span>
                                                    <span className="text-[10px] text-gray-400 italic">Linked to template</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    {/* Manual Uploads */}
                                    {manualAttachments.map(doc => (
                                        <div key={doc.id} className="p-4 bg-indigo-50/50 rounded-2xl flex items-center justify-between border border-indigo-100 animate-in zoom-in-95 duration-200">
                                            <div className="flex items-center gap-3">
                                                <FileText className="h-6 w-6 text-indigo-500" />
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-gray-700">{doc.name}</span>
                                                    <span className="text-[10px] text-indigo-400 italic">Direct Cloudinary Upload</span>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => removeManualAttachment(doc.id)}
                                                className="p-2 hover:bg-white rounded-full text-red-500 transition-colors"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        </div>
                                    ))}
                                    
                                    <input 
                                        type="file" 
                                        ref={fileInputRef} 
                                        className="hidden" 
                                        onChange={handleManualUpload}
                                    />
                                    
                                    <button 
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={loading}
                                        className="w-full p-6 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50/20 transition-all font-bold flex flex-col items-center justify-center gap-2 group"
                                    >
                                        <PlusCircle className="h-8 w-8 group-hover:scale-110 transition-transform" />
                                        <span>{loading ? 'Processing...' : 'Add Manual Attachment'}</span>
                                    </button>
                                </div>
                            </div>
                            <div className="bg-gray-900 rounded-3xl p-8 text-white relative overflow-hidden group">
                                <h3 className="text-lg font-bold mb-4 opacity-50">Email Preview (Raw)</h3>
                                <div className="p-6 bg-white/5 rounded-2xl border border-white/10 space-y-4 relative z-10">
                                    <div>
                                        <span className="text-[10px] font-black text-indigo-400 block uppercase mb-1">Subject</span>
                                        <p className="text-lg font-bold">{emailDraft.subject}</p>
                                    </div>
                                    <div className="h-px bg-white/10" />
                                    <div>
                                        <span className="text-[10px] font-black text-indigo-400 block uppercase mb-1">Body Snippet</span>
                                        <div 
                                            className="text-sm opacity-80 max-h-[150px] overflow-hidden" 
                                            dangerouslySetInnerHTML={{ __html: emailDraft.body }}
                                        />
                                        <div className="text-[10px] italic mt-2 text-indigo-200">Plus corporate signature...</div>
                                    </div>
                                </div>
                                <div className="absolute right-[-20px] bottom-[-20px] text-white/5 opacity-20 group-hover:scale-110 transition-transform">
                                    <Send className="h-48 w-48" />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* STEP 5: SUCCESS & SUMMARY */}
                {step === 5 && (
                    <div className="bg-white rounded-3xl p-12 shadow-xl border border-gray-100 flex flex-col items-center text-center animate-in zoom-in-95 duration-500">
                        <div className="h-24 w-24 bg-green-100/50 text-green-600 rounded-full flex items-center justify-center mb-6">
                            <CheckCircle2 className="h-12 w-12" />
                        </div>
                        <div className="space-y-2 mb-10">
                            <h2 className="text-4xl font-black text-gray-900">Transmission Complete!</h2>
                            <p className="text-xl text-gray-500 max-w-lg mx-auto font-medium">
                                Your bulk email broadcast has been successfully processed. {getFilteredRecipients().length} recipients have been notified.
                            </p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-md">
                            <button 
                                onClick={() => window.location.reload()}
                                className="p-4 bg-gray-100 text-gray-700 font-bold rounded-2xl hover:bg-gray-200 transition-all active:scale-95"
                            >
                                Start New Broadcast
                            </button>
                            <button 
                                onClick={() => window.location.href = '/admin/email/history'}
                                className="p-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 active:scale-95"
                            >
                                View Mail History
                            </button>
                        </div>
                    </div>
                )}

                {/* NAVIGATION BAR */}
                {step < 5 && (
                    <div className="mt-8 flex justify-between items-center bg-white p-6 rounded-3xl shadow-xl border border-gray-100 sticky bottom-6 z-20">
                        <button 
                            onClick={() => setStep(step - 1)}
                            disabled={step === 1 || loading}
                            className="px-8 py-3 bg-gray-100 text-gray-600 font-bold rounded-2xl hover:bg-gray-200 transition-all flex items-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed group"
                        >
                            <ChevronLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
                            Back
                        </button>

                        <div className="flex gap-4">
                            {step < 4 ? (
                                hasPermission('Send Email', 'add') && (
                                    <button 
                                        onClick={() => setStep(step + 1)}
                                        className="bg-gray-900 text-white px-10 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-black transition-all hover:shadow-xl active:scale-95 group"
                                    >
                                        Continue
                                        <ChevronRight className="h-5 w-5 group-translate-x-1 transition-transform" />
                                    </button>
                                )
                            ) : (
                                hasPermission('Send Email', 'add') && (
                                    <button 
                                        onClick={handleSend}
                                        disabled={loading || getFilteredRecipients().length === 0}
                                        className="bg-indigo-600 text-white px-12 py-3 rounded-2xl font-black text-lg flex items-center gap-3 hover:bg-indigo-700 transition-all hover:scale-105 shadow-2xl shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed group"
                                    >
                                        {loading ? (
                                            <>
                                                <div className="h-5 w-5 border-4 border-white border-t-transparent rounded-full animate-spin" />
                                                Sending...
                                            </>
                                        ) : (
                                            <>
                                                <Send className="h-6 w-6 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                                SEND EMAILS NOW
                                            </>
                                        )}
                                    </button>
                                )
                            )}
                        </div>
                    </div>
                )}

                {/* STATUS NOTIFICATION */}
                {status && (
                    <div className={`fixed bottom-10 right-10 p-6 rounded-3xl shadow-2xl flex items-center gap-4 animate-in slide-in-from-right-10 duration-500 z-50 ${
                        status.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 
                        status.type === 'info' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' :
                        'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                        {status.type === 'success' ? <CheckCircle2 className="h-8 w-8" /> : <AlertCircle className="h-8 w-8" />}
                        <div>
                            <span className="font-black text-lg">
                                {status.type === 'success' ? 'Broadcast Successful!' : 
                                 status.type === 'info' ? 'System Message' : 'Transmission Failed'}
                            </span>
                            <p className="text-sm font-medium opacity-80">{status.message}</p>
                        </div>
                        <button onClick={() => setStatus(null)} className="p-2 hover:bg-black/5 rounded-full">
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                )}
            </div>
        </MainLayout>
    );
};

export default EmailComposer;
