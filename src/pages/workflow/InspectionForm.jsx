import React, { useState, useEffect, useRef } from 'react';
import {
    ChevronRight,
    ArrowLeft,
    CheckCircle2,
    Camera,
    AlertCircle,
    Clock,
    MoreVertical,
    Download,
    Save,
    Plus,
    X,
    MoreHorizontal,
    Edit3,
    Trash2,
    Loader2,
    ChevronLeft,
    MapPin,
    Calendar,
    User,
    Send,
    Info
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import SignatureCanvas from 'react-signature-canvas';
import { MainLayout } from '../../layouts/MainLayout';

import api from '../../api/client';
import PhotoAnnotationModal from '../../components/PhotoAnnotationModal';
import TicketCreationModal from '../../components/TicketCreationModal';

const InspectionForm = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const [inspection, setInspection] = useState(null);
    const [loading, setLoading] = useState(true);
    const [responses, setResponses] = useState({});
    const [tickets, setTickets] = useState([]);
    const [signature, setSignature] = useState('');
    const [inspectorSignature, setInspectorSignature] = useState('');
    const [noDeficiency, setNoDeficiency] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [saving, setSaving] = useState(false);
    const [ticketLoading, setTicketLoading] = useState({});

    // Modals state
    const [annotationModal, setAnnotationModal] = useState({ isOpen: false, questionId: null, photoUrl: '', photoIndex: null });
    const [ticketModal, setTicketModal] = useState({ isOpen: false, question: null, initialData: null });

    // Series/Groups state
    const [series, setSeries] = useState([]);
    const [activeSeries, setActiveSeries] = useState({}); // questionId -> seriesId

    // Signature Canvas
    const signatureCanvasRef = useRef(null);
    const isDrawing = useRef(false);
    const lastPos = useRef({ x: 0, y: 0 });

    // Refs for scrolling to sections
    const sectionRefs = useRef({});

    // Local Memory for photos (to avoid CORS/loading issues in Annotation tool)
    const localPhotoCache = useRef(new Map()); // url/base64 -> base64

    // Signature Canvas refs
    const tenantSigRef = useRef();
    const inspectorSigRef = useRef();

    useEffect(() => {
        fetchInspection();
        fetchSeries();
    }, [id]);

    const fetchSeries = async () => {
        try {
            const res = await api.get('/api/admin/workflow/response-series');
            if (res.data.success) {
                setSeries(res.data.data.filter(s => s.isActive));
            }
        } catch (error) {
            console.error('Fetch series error:', error);
        }
    };

    const fetchInspection = async () => {
        try {
            const res = await api.get(`/api/admin/workflow/inspections/${id}`);
            if (res.data.success) {
                const data = res.data.data;
                setInspection(data);
                setSignature(data.tenantSignature || '');
                setInspectorSignature(data.inspectorSignature || '');
                setNoDeficiency(data.noDeficiencyConfirmed || false);
                setIsEditMode(data.status === 'DRAFT');
                setTickets(data.tickets || []);

                const templateRooms = data.template?.structure?.rooms || [];

                // Initialize activeSeries from template structure
                const initialActiveSeries = {};
                templateRooms.forEach(room => {
                    room.questions?.forEach(q => {
                        if (q.type === 'SERIES' && q.seriesId) {
                            initialActiveSeries[q.id] = q.seriesId;
                        }
                    });
                });
                setActiveSeries(initialActiveSeries);

                // Pre-fill responses - Match by question text since DB doesn't store questionId
                const initialResponses = {};
                
                data.responses?.forEach(r => {
                    // Find the question ID from the template structure that matches this response's question text
                    let matchedQId = r.id; // Fallback
                    for (const room of templateRooms) {
                        const q = room.questions?.find(q => q.text === r.question);
                        if (q) {
                            matchedQId = q.id;
                            break;
                        }
                    }

                    initialResponses[matchedQId] = {
                        id: r.id,
                        status: r.response,
                        notes: r.notes,
                        annotation: r.annotation,
                        photo: r.photoUrl || r.media?.[0]?.url,
                        photos: r.media?.length > 0 ? r.media.map(m => m.url) : (r.photoUrl ? [r.photoUrl] : []),
                        annotatedPhoto: r.annotatedPhotoUrl,
                        ticketCreated: !!r.ticketId,
                        ticketId: r.ticketId
                    };
                });
                setResponses(initialResponses);
            }
        } catch (error) {
            console.error('Fetch error:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-20 text-center font-black text-gray-400 tracking-widest animate-pulse">LOADING INSPECTION DATA...</div>;
    if (!inspection) return <div className="p-20 text-center font-black text-red-400 tracking-widest">INSPECTION NOT FOUND</div>;

    const rooms = inspection.template?.structure?.rooms || [];

    const handleConditionChange = (questionId, status) => {
        setResponses(prev => ({
            ...prev,
            [questionId]: { ...prev[questionId], status }
        }));
    };

    const handleNoteChange = (questionId, notes) => {
        setResponses(prev => ({
            ...prev,
            [questionId]: { ...prev[questionId], notes }
        }));
    };

    const handleAnnotationChange = (questionId, annotation) => {
        setResponses(prev => ({
            ...prev,
            [questionId]: { ...prev[questionId], annotation }
        }));
    };

    const handleAnnotationSave = async (annotatedData) => {
        const { questionId, photoIndex } = annotationModal;
        
        try {
            // Instant Cloud Upload
            const res = await api.post('/api/admin/workflow/inspections/upload-media', { image: annotatedData });
            // Handle different potential response structures
            const cloudinaryUrl = res.data?.url || res.data?.data?.url || res.url;

            setResponses(prev => {
                const currentResponse = prev[questionId] || {};
                let currentPhotos = [...(currentResponse.photos || (currentResponse.photo ? [currentResponse.photo] : []))];
                
                // If cloud upload succeeded, use it. Otherwise, keep the annotated Base64 as a local fallback.
                const finalUrl = cloudinaryUrl || annotatedData;

                // Save to local cache for instant editing later
                if (finalUrl.startsWith('http')) {
                    localPhotoCache.current.set(finalUrl, annotatedData);
                }

                if (photoIndex !== null && photoIndex < currentPhotos.length) {
                    currentPhotos[photoIndex] = finalUrl;
                } else if (photoIndex !== null) {
                    currentPhotos.push(finalUrl);
                }

                return {
                    ...prev,
                    [questionId]: { 
                        ...currentResponse, 
                        photos: currentPhotos,
                        photo: currentPhotos[0] || null
                    }
                };
            });
            setAnnotationModal({ ...annotationModal, isOpen: false });
        } catch (err) {
            console.error('Annotation upload failed, falling back to local storage:', err);
            // Even if upload fails, we save the annotated image locally so it doesn't disappear
            setResponses(prev => {
                const currentResponse = prev[questionId] || {};
                let currentPhotos = [...(currentResponse.photos || (currentResponse.photo ? [currentResponse.photo] : []))];
                if (photoIndex !== null && photoIndex < currentPhotos.length) {
                    currentPhotos[photoIndex] = annotatedData;
                }
                return { ...prev, [questionId]: { ...currentResponse, photos: currentPhotos, photo: currentPhotos[0] } };
            });
            setAnnotationModal({ ...annotationModal, isOpen: false });
        }
    };

    const handlePhotoUpload = async (questionId, file) => {
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64 = reader.result;
            
            try {
                // Instant Cloud Upload
                const res = await api.post('/api/admin/workflow/inspections/upload-media', { image: base64 });
                const cloudinaryUrl = res.data?.url || res.data?.data?.url || res.url;

                setResponses(prev => {
                    const currentResponse = prev[questionId] || {};
                    let currentPhotos = [...(currentResponse.photos || (currentResponse.photo ? [currentResponse.photo] : []))];
                    currentPhotos = currentPhotos.filter(p => !!p);
                    
                    const finalUrl = cloudinaryUrl || base64;
                    const newPhotos = [...currentPhotos, finalUrl];

                    // Save to local cache
                    if (finalUrl.startsWith('http')) {
                        localPhotoCache.current.set(finalUrl, base64);
                    }
                    
                    return {
                        ...prev,
                        [questionId]: { 
                            ...currentResponse, 
                            photos: newPhotos,
                            photo: newPhotos[0] || finalUrl
                        }
                    };
                });
            } catch (err) {
                console.error('Photo upload failed, using local version:', err);
                setResponses(prev => {
                    const currentResponse = prev[questionId] || {};
                    let currentPhotos = [...(currentResponse.photos || (currentResponse.photo ? [currentResponse.photo] : []))];
                    const newPhotos = [...currentPhotos, base64];
                    return { ...prev, [questionId]: { ...currentResponse, photos: newPhotos, photo: newPhotos[0] } };
                });
            }
        };
        reader.readAsDataURL(file);
    };

    const removePhoto = (questionId, index) => {
        setResponses(prev => {
            const currentPhotos = [...(prev[questionId]?.photos || [])];
            currentPhotos.splice(index, 1);
            return {
                ...prev,
                [questionId]: { 
                    ...prev[questionId], 
                    photos: currentPhotos,
                    photo: currentPhotos[0] || null
                }
            };
        });
    };

    const handleCreateTicketClick = (question) => {
        if (!isEditMode && inspection.status !== 'DRAFT') return;
        const responseValue = responses[question.id]?.status || '';
        setTicketModal({
            isOpen: true,
            question,
            initialData: {
                title: responseValue ? `${question.text}: ${responseValue}` : question.text,
                description: responses[question.id]?.notes || '',
                response: responseValue,
                photos: responses[question.id]?.photos || []
            }
        });
    };

    const handleTicketSubmit = async (formData) => {
        const question = ticketModal.question;
        try {
            setTicketLoading(prev => ({ ...prev, [question.id]: true }));
            const res = await api.post(`/api/admin/workflow/inspections/${id}/tickets`, {
                questionId: question.id,
                questionText: question.text,
                response: responses[question.id]?.status || '',
                notes: responses[question.id]?.notes || '',
                photos: responses[question.id]?.photos || [],
                ...formData
            });
            if (res.data.success) {
                const newTicket = res.data.data;
                setResponses(prev => ({
                    ...prev,
                    [question.id]: { ...prev[question.id], ticketCreated: true, ticketId: newTicket.id }
                }));
                setTickets(prev => [...prev, newTicket]);
                setTicketModal({ isOpen: false, question: null, initialData: null });
            }
        } catch (error) {
            console.error('Ticket creation error:', error);
            alert('Failed to create ticket');
        } finally {
            setTicketLoading(prev => ({ ...prev, [question.id]: false }));
        }
    };

    const handleDeleteTicket = async (questionId, ticketId) => {
        if (!window.confirm('Are you sure you want to delete this ticket?')) return;
        try {
            const res = await api.delete(`/api/admin/workflow/inspections/${id}/tickets/${ticketId}`);
            if (res.data.success) {
                setResponses(prev => ({
                    ...prev,
                    [questionId]: { ...prev[questionId], ticketCreated: false, ticketId: null }
                }));
                setTickets(prev => prev.filter(t => t.id !== ticketId));
            }
        } catch (error) {
            console.error('Ticket deletion error:', error);
            alert('Failed to delete ticket.');
        }
    };

    const validateForm = () => {
        for (const room of rooms) {
            for (const q of room.questions) {
                if (!responses[q.id]?.status) {
                    alert(`Please review "${q.text}" in ${room.name}.`);
                    sectionRefs.current[room.id]?.scrollIntoView({ behavior: 'smooth' });
                    return false;
                }
            }
        }
        return true;
    };

    const handleFinalize = async () => {
        if (!validateForm()) return;

        try {
            setSaving(true);
            const formattedResponses = Object.keys(responses).map(qId => {
                const room = rooms.find(r => r.questions.some(q => q.id.toString() === qId));
                const question = room?.questions.find(q => q.id.toString() === qId);
                return {
                    id: responses[qId].id,
                    questionId: parseInt(qId),
                    question: question?.text || 'Unknown',
                    response: responses[qId].status,
                    notes: responses[qId].notes || '',
                    annotation: responses[qId].annotation || '',
                    photo: responses[qId].photo || null,
                    photos: responses[qId].photos || [],
                    annotatedPhoto: responses[qId].annotatedPhoto || null
                };
            });

            const payload = {
                responses: formattedResponses,
                signature,
                inspectorSignature,
                noDeficiencyConfirmed: noDeficiency
            };

            const endpoint = inspection.status === 'COMPLETED' 
                ? `/api/admin/workflow/inspections/${id}` 
                : `/api/admin/workflow/inspections/${id}/submit`;
            
            const method = inspection.status === 'COMPLETED' ? 'put' : 'post';

            const res = await api[method](endpoint, payload);

            if (res.data.success) {
                alert(inspection.status === 'COMPLETED' ? 'Changes saved with audit log.' : 'Inspection Finalized Successfully!');
                navigate('/admin/workflow/move-in');
            }
        } catch (error) {
            console.error('Finalize error:', error);
            alert('Error: ' + (error.response?.data?.message || error.message));
        } finally {
            setSaving(false);
        }
    };

    const scrollToSection = (roomId) => {
        sectionRefs.current[roomId]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    // ── Signature Canvas helpers ──────────────────────────────────

    const handleSignatureEnd = (type) => {
        if (type === 'tenant') {
            setSignature(tenantSigRef.current.toDataURL());
        } else {
            setInspectorSignature(inspectorSigRef.current.toDataURL());
        }
    };

    const clearSignature = (type) => {
        if (type === 'tenant') {
            tenantSigRef.current.clear();
            setSignature('');
        } else {
            inspectorSigRef.current.clear();
            setInspectorSignature('');
        }
    };

    return (
        <MainLayout title="Professional Inspection">
             <style dangerouslySetInnerHTML={{ __html: `
                @media (max-width: 1280px) {
                    .inspection-grid {
                        display: flex;
                        flex-direction: column;
                        gap: 2rem;
                    }
                    .inspection-card {
                        width: 100% !important;
                        max-width: 100% !important;
                    }
                    .sidebar-nav {
                        display: none !important;
                    }
                    .main-content-area {
                        padding: 1rem !important;
                    }
                    .header-area {
                        padding: 0 0.5rem;
                    }
                }
                .tablet-scroll-x {
                    overflow-x: auto;
                    -webkit-overflow-scrolling: touch;
                    scrollbar-width: none;
                }
                .tablet-scroll-x::-webkit-scrollbar {
                    display: none;
                }
                .question-card-tablet {
                    padding: 1.5rem;
                    background: white;
                    border-radius: 1.5rem;
                    border: 1px solid #f1f5f9;
                    margin-bottom: 1rem;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
                }
                .response-btn-active {
                    border-color: #4f46e5 !important;
                    background-color: #f5f3ff !important;
                    color: #4f46e5 !important;
                    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
                }
            `}} />

            <div className="flex bg-gray-50/50 min-h-screen">
                {/* Fixed Sidebar Navigation */}
                <div className="w-72 bg-white border-r border-gray-100 p-8 flex flex-col gap-8 sticky top-0 h-screen overflow-y-auto hidden lg:flex sidebar-nav">
                    <div>
                        <button onClick={() => navigate(-1)} className="text-indigo-600 font-black text-[10px] uppercase flex items-center gap-2 mb-6 hover:gap-3 transition-all">
                            <ArrowLeft size={14} /> Back to Dashboard
                        </button>
                        <h2 className="text-xl font-black text-gray-900 tracking-tighter mb-1">Navigation</h2>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Jump to Section</p>
                    </div>

                    <div className="flex flex-col gap-2">
                        {rooms.map((room, idx) => (
                            <button
                                key={room.id}
                                onClick={() => scrollToSection(room.id)}
                                className="flex items-center justify-between group p-3 rounded-2xl hover:bg-indigo-50 transition-all text-left border border-transparent hover:border-indigo-100"
                            >
                                <div className="flex flex-col">
                                    <span className="text-[9px] font-black text-gray-300 uppercase group-hover:text-indigo-400">Section {idx + 1}</span>
                                    <span className="text-sm font-black text-gray-600 group-hover:text-indigo-900 tracking-tight">{room.name}</span>
                                </div>
                                <ChevronRight size={16} className="text-gray-200 group-hover:text-indigo-300" />
                            </button>
                        ))}
                        <button
                            onClick={() => scrollToSection('finalize')}
                            className="flex items-center justify-between group p-3 rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-100 mt-4"
                        >
                            <span className="text-sm font-black tracking-tight">Finalize & Sign</span>
                            <CheckCircle2 size={16} />
                        </button>
                    </div>

                    <div className="mt-auto p-4 bg-gray-50 rounded-2xl border border-gray-100">
                        <div className="flex items-center gap-2 mb-2">
                            <AlertCircle size={14} className="text-orange-500" />
                            <span className="text-[10px] font-black text-gray-900 uppercase">Status</span>
                        </div>
                        <span className={`text-xs font-black uppercase tracking-widest ${inspection.status === 'COMPLETED' ? 'text-green-600' : 'text-indigo-600'}`}>
                            {inspection.status}
                        </span>
                    </div>
                </div>

                {/* Main Scrollable Content */}
                <div className="flex-1 p-4 lg:p-12 overflow-y-auto">
                    <div className="max-w-[1400px] mx-auto">
                        {/* Header Area - Optimized for Tablet */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 md:mb-12 gap-6 px-2">
                            <div>
                                <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tighter mb-2">Inspection Record</h1>
                                <div className="flex flex-wrap items-center gap-4 md:gap-6">
                                    <div className="flex flex-col">
                                        <span className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest">Type</span>
                                        <span className="text-xs md:text-sm font-black text-gray-700">{inspection.template?.type}</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest">Unit</span>
                                        <span className="text-xs md:text-sm font-black text-gray-700">{inspection.unit?.unitNumber}</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</span>
                                        <span className="text-xs md:text-sm font-black text-gray-700">{new Date(inspection.createdAt).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </div>
                            
                            {inspection.status === 'COMPLETED' && !isEditMode && (
                                <button 
                                    onClick={() => setIsEditMode(true)}
                                    className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-white border border-gray-100 rounded-2xl text-xs font-black text-gray-600 hover:bg-gray-50 transition-all shadow-sm"
                                >
                                    <Edit3 size={16} /> Enter Edit Mode
                                </button>
                            )}
                        </div>

                        {/* Horizontal Room Navigator for Tablets/Mobile - Always visible on small screens */}
                        <div className="lg:hidden sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-100 -mx-4 px-4 py-4 mb-8 tablet-scroll-x flex items-center gap-3 shadow-sm">
                            {rooms.map((room, idx) => (
                                <button
                                    key={room.id}
                                    onClick={() => scrollToSection(room.id)}
                                    className="whitespace-nowrap px-5 py-2.5 rounded-full bg-white text-[11px] font-black uppercase tracking-widest text-gray-500 hover:bg-indigo-50 hover:text-indigo-600 transition-all border border-gray-200 shadow-sm active:scale-95"
                                >
                                    {idx + 1}. {room.name}
                                </button>
                            ))}
                        </div>

                        {/* Long Scroll Form */}
                        <div className="flex flex-col gap-8 md:gap-12">
                            {rooms.map((room, idx) => (
                                <section 
                                    key={room.id} 
                                    ref={el => sectionRefs.current[room.id] = el}
                                    className="w-full max-w-[1400px] mx-auto bg-white rounded-[40px] shadow-2xl border border-gray-100 overflow-hidden mb-12 scroll-mt-8"
                                >
                                    <div className="p-8 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between">
                                        <div>
                                            <h2 className="text-2xl font-black text-gray-900 tracking-tight">{idx + 1}. {room.name}</h2>
                                            <p className="text-gray-500 text-sm font-medium">Detailed condition report for {room.name.toLowerCase()}.</p>
                                        </div>
                                        <div className="bg-white px-4 py-2 rounded-2xl border border-gray-100 text-xs font-black text-gray-400 uppercase tracking-widest">
                                            <span className="text-indigo-600">{room.questions?.length || 0}</span> Items
                                        </div>
                                    </div>

                                    {/* Responsive Items Container */}
                                    <div className="p-0">
                                        {/* Desktop Table View (lg and above) */}
                                        <div className="hidden xl:block overflow-x-auto">
                                            <table className="w-full text-left border-collapse min-w-full">
                                                <thead>
                                                    <tr className="bg-white border-b border-gray-100 text-[11px] font-black text-gray-400 uppercase tracking-widest">
                                                        <th className="px-8 py-5 min-w-[200px]">Item / Question</th>
                                                        <th className="px-8 py-5 min-w-[150px]">Condition</th>
                                                        <th className="px-8 py-5 min-w-[320px]">Photos & Annotation</th>
                                                        <th className="px-8 py-5 min-w-[220px]">Notes</th>
                                                        <th className="px-8 py-5 min-w-[120px] text-right">Ticket</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-50">
                                                    {room.questions?.map((q) => (
                                                        <QuestionRow 
                                                            key={q.id} 
                                                            q={q} 
                                                            responses={responses} 
                                                            isEditMode={isEditMode} 
                                                            inspection={inspection}
                                                            series={series}
                                                            activeSeries={activeSeries}
                                                            setActiveSeries={setActiveSeries}
                                                            handleConditionChange={handleConditionChange}
                                                            handlePhotoUpload={handlePhotoUpload}
                                                            removePhoto={removePhoto}
                                                            setAnnotationModal={setAnnotationModal}
                                                            localPhotoCache={localPhotoCache}
                                                            handleAnnotationChange={handleAnnotationChange}
                                                            handleNoteChange={handleNoteChange}
                                                            handleCreateTicketClick={handleCreateTicketClick}
                                                            handleDeleteTicket={handleDeleteTicket}
                                                            ticketLoading={ticketLoading}
                                                        />
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Tablet/Mobile Card View (Below xl) */}
                                        <div className="xl:hidden flex flex-col divide-y divide-gray-100">
                                            {room.questions?.map((q) => (
                                                <QuestionCard 
                                                    key={q.id} 
                                                    q={q} 
                                                    responses={responses} 
                                                    isEditMode={isEditMode} 
                                                    inspection={inspection}
                                                    series={series}
                                                    activeSeries={activeSeries}
                                                    setActiveSeries={setActiveSeries}
                                                    handleConditionChange={handleConditionChange}
                                                    handlePhotoUpload={handlePhotoUpload}
                                                    removePhoto={removePhoto}
                                                    setAnnotationModal={setAnnotationModal}
                                                    localPhotoCache={localPhotoCache}
                                                    handleAnnotationChange={handleAnnotationChange}
                                                    handleNoteChange={handleNoteChange}
                                                    handleCreateTicketClick={handleCreateTicketClick}
                                                    handleDeleteTicket={handleDeleteTicket}
                                                    ticketLoading={ticketLoading}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </section>
                            ))}

                            {/* Ticket Summary Section */}
                            {tickets.length > 0 && (
                                <section className="bg-orange-50/50 rounded-[40px] border border-orange-100 p-10 mt-12 mb-12">
                                    <div className="flex items-center justify-between mb-8">
                                        <h3 className="text-2xl font-black text-orange-900 tracking-tight flex items-center gap-3">
                                            <AlertCircle size={28} /> Deficiency Summary ({tickets.length})
                                        </h3>
                                        <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest bg-orange-100 px-3 py-1 rounded-lg">Tickets Created</span>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {tickets.map(t => (
                                            <div key={t.id} className="bg-white p-6 rounded-3xl border border-orange-100 shadow-sm flex flex-col gap-3 group/ticket hover:shadow-md transition-all">
                                                <div className="flex justify-between items-start">
                                                    <div className="flex flex-wrap gap-2">
                                                        <span className="text-[9px] font-black text-orange-600 uppercase tracking-widest bg-orange-50 px-2 py-0.5 rounded border border-orange-100">{t.category || 'MAINTENANCE'}</span>
                                                        <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">{t.source || 'INSPECTION'}</span>
                                                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${t.isRequired ? 'text-red-600 bg-red-50 border-red-100' : 'text-green-600 bg-green-50 border-green-100'}`}>
                                                            Required: {t.isRequired ? 'Yes (Blocks)' : 'No'}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-[9px] font-black text-gray-300 uppercase">#{t.id}</span>
                                                        {(isEditMode || inspection.status === 'DRAFT') && (
                                                            <button 
                                                                onClick={() => {
                                                                    const qId = Object.keys(responses).find(key => responses[key].ticketId === t.id);
                                                                    handleDeleteTicket(qId, t.id);
                                                                }}
                                                                className="text-red-300 hover:text-red-500 transition-colors"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                                <h4 className="font-black text-gray-900 tracking-tight text-lg">{t.subject}</h4>
                                                <p className="text-xs text-gray-500 leading-relaxed">{t.description}</p>
                                                <div className="mt-2 flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase">
                                                    <Clock size={12} />
                                                    Created {new Date(t.createdAt).toLocaleTimeString()}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            )}

                            {/* Finalize & Signature Section */}
                            <section 
                                ref={el => sectionRefs.current['finalize'] = el}
                                className="max-w-[1400px] mx-auto bg-white rounded-[40px] shadow-2xl border border-gray-100 overflow-hidden mb-20 scroll-mt-8"
                            >
                                <div className="p-10 text-center border-b border-gray-50">
                                    <h2 className="text-3xl font-black text-gray-900 tracking-tight mb-2">Final Confirmation</h2>
                                    <p className="text-gray-500 font-medium">By signing, you confirm the recorded condition is accurate and legally binding.</p>
                                </div>
                                
                                <div className="p-10 space-y-12 bg-gray-50/50">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                        {/* Tenant Signature */}
                                        <div className="space-y-6">
                                            <div className="flex items-center justify-between">
                                                <label className="text-xs font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                                                    <User size={18} className="text-indigo-600" />
                                                    Tenant Signature
                                                </label>
                                                <span className="text-[10px] font-black text-indigo-600 uppercase bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-100">
                                                    {inspection.lease?.tenant?.name || 'Tenant Signature Required'}
                                                </span>
                                            </div>
                                            <div className="relative group/sig">
                                                <div className="absolute inset-0 bg-white rounded-3xl border-2 border-dashed border-gray-200 group-hover:border-indigo-300 transition-colors" />
                                                <div className="relative bg-white border-2 border-indigo-100 rounded-3xl overflow-hidden shadow-sm h-48 flex items-center justify-center">
                                                    {(signature && !isEditMode && inspection.status === 'COMPLETED') ? (
                                                        <img 
                                                            src={signature} 
                                                            className="max-w-full max-h-full object-contain p-4" 
                                                            alt="Tenant Signature" 
                                                        />
                                                    ) : (
                                                        <>
                                                            <SignatureCanvas 
                                                                ref={tenantSigRef}
                                                                penColor='#1e1b4b'
                                                                onEnd={() => handleSignatureEnd('tenant')}
                                                                canvasProps={{
                                                                    className: 'w-full h-48 cursor-crosshair',
                                                                    style: { width: '100%', height: '192px' }
                                                                }}
                                                            />
                                                            <button 
                                                                onClick={() => clearSignature('tenant')}
                                                                className="absolute bottom-4 right-4 p-2.5 bg-gray-900/90 text-white rounded-xl shadow-lg active:scale-95 transition-all opacity-0 group-hover/sig:opacity-100"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Inspector Signature */}
                                        <div className="space-y-6">
                                            <div className="flex items-center justify-between">
                                                <label className="text-xs font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                                                    <CheckCircle2 size={18} className="text-indigo-600" />
                                                    Inspector Signature
                                                </label>
                                                <span className="text-[10px] font-black text-emerald-600 uppercase bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-100">
                                                    {inspection.inspector?.name || 'Inspector Signature'}
                                                </span>
                                            </div>
                                            <div className="relative group/sig-ins">
                                                <div className="absolute inset-0 bg-white rounded-3xl border-2 border-dashed border-gray-200 group-hover:border-indigo-300 transition-colors" />
                                                <div className="relative bg-white border-2 border-indigo-100 rounded-3xl overflow-hidden shadow-sm h-48 flex items-center justify-center">
                                                    {(inspectorSignature && !isEditMode && inspection.status === 'COMPLETED') ? (
                                                        <img 
                                                            src={inspectorSignature} 
                                                            className="max-w-full max-h-full object-contain p-4" 
                                                            alt="Inspector Signature" 
                                                        />
                                                    ) : (
                                                        <>
                                                            <SignatureCanvas 
                                                                ref={inspectorSigRef}
                                                                penColor='#1e1b4b'
                                                                onEnd={() => handleSignatureEnd('inspector')}
                                                                canvasProps={{
                                                                    className: 'w-full h-48 cursor-crosshair',
                                                                    style: { width: '100%', height: '192px' }
                                                                }}
                                                            />
                                                            <button 
                                                                onClick={() => clearSignature('inspector')}
                                                                className="absolute bottom-4 right-4 p-2.5 bg-gray-900/90 text-white rounded-xl shadow-lg active:scale-95 transition-all opacity-0 group-hover/sig-ins:opacity-100"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-8 bg-indigo-600 rounded-[32px] shadow-2xl shadow-indigo-200 flex flex-col md:flex-row items-center justify-between gap-8">
                                        <div className="flex items-center gap-6">
                                            <div className="w-16 h-16 bg-white/10 rounded-[24px] flex items-center justify-center border border-white/20 backdrop-blur-sm">
                                                <Save size={32} className="text-white" />
                                            </div>
                                            <div>
                                                <h4 className="text-xl font-black text-white tracking-tight">Finalize Evidence</h4>
                                                <p className="text-indigo-100 text-sm font-medium">Clicking finalize will lock all records and generate the report.</p>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={handleFinalize}
                                            disabled={saving || (!isEditMode && inspection.status === 'COMPLETED')}
                                            className={`px-12 py-5 rounded-[24px] font-black uppercase tracking-widest transition-all shadow-xl flex items-center justify-center gap-3
                                                ${(saving || (!isEditMode && inspection.status === 'COMPLETED')) ? 'bg-white/10 text-white/50 cursor-not-allowed shadow-none' : 'bg-white text-indigo-600 hover:bg-indigo-50 active:scale-95 shadow-indigo-900/20'}`}
                                        >
                                            {saving ? 'Processing...' : inspection.status === 'COMPLETED' ? 'Save Changes' : 'Finalize & Close'}
                                            <CheckCircle2 size={20} />
                                        </button>
                                    </div>
                                </div>
                            </section>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals */}
            <PhotoAnnotationModal 
                isOpen={annotationModal.isOpen}
                onClose={() => setAnnotationModal({ ...annotationModal, isOpen: false })}
                photoUrl={annotationModal.photoUrl}
                onSave={handleAnnotationSave}
            />

            <TicketCreationModal 
                isOpen={ticketModal.isOpen}
                onClose={() => setTicketModal({ ...ticketModal, isOpen: false })}
                onSubmit={handleTicketSubmit}
                initialData={ticketModal.initialData}
            />
        </MainLayout>
    );
};

const QuestionRow = ({ q, responses, isEditMode, inspection, series, activeSeries, setActiveSeries, handleConditionChange, handlePhotoUpload, removePhoto, setAnnotationModal, localPhotoCache, handleAnnotationChange, handleNoteChange, handleCreateTicketClick, handleDeleteTicket, ticketLoading }) => (
    <tr className="hover:bg-gray-50/30 transition-colors group">
        <td className="px-8 py-6 align-top">
            <h4 className="font-black text-gray-900 text-base mb-1">{q.text}</h4>
            <span className="text-[10px] font-black text-gray-300 uppercase tracking-tighter">Operational Check</span>
        </td>
        <td className="px-8 py-6 align-top">
            <ConditionSelector q={q} responses={responses} isEditMode={isEditMode} inspection={inspection} series={series} activeSeries={activeSeries} setActiveSeries={setActiveSeries} handleConditionChange={handleConditionChange} />
        </td>
        <td className="px-8 py-6 align-top">
            <PhotoSelector q={q} responses={responses} isEditMode={isEditMode} inspection={inspection} handlePhotoUpload={handlePhotoUpload} removePhoto={removePhoto} setAnnotationModal={setAnnotationModal} localPhotoCache={localPhotoCache} handleAnnotationChange={handleAnnotationChange} />
        </td>
        <td className="px-6 py-6 align-top min-w-[220px] w-[220px]">
            <textarea
                placeholder="Add detailed item notes..."
                value={responses[q.id]?.notes || ''}
                readOnly={!isEditMode && inspection.status !== 'DRAFT'}
                onChange={(e) => handleNoteChange(q.id, e.target.value)}
                rows={5}
                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all resize-y placeholder:text-gray-300 leading-relaxed"
            />
        </td>
        <td className="px-8 py-6 align-top text-right">
            <TicketStatus q={q} responses={responses} isEditMode={isEditMode} inspection={inspection} ticketLoading={ticketLoading} handleCreateTicketClick={handleCreateTicketClick} handleDeleteTicket={handleDeleteTicket} />
        </td>
    </tr>
);

const QuestionCard = ({ q, responses, isEditMode, inspection, series, activeSeries, setActiveSeries, handleConditionChange, handlePhotoUpload, removePhoto, setAnnotationModal, localPhotoCache, handleAnnotationChange, handleNoteChange, handleCreateTicketClick, handleDeleteTicket, ticketLoading }) => (
    <div className="p-5 md:p-8 flex flex-col gap-6 hover:bg-indigo-50/20 transition-all">
        <div className="flex justify-between items-start">
            <div>
                <h4 className="font-black text-gray-900 text-lg md:text-xl tracking-tight mb-1">{q.text}</h4>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Touch to record condition</span>
            </div>
            <TicketStatus q={q} responses={responses} isEditMode={isEditMode} inspection={inspection} ticketLoading={ticketLoading} handleCreateTicketClick={handleCreateTicketClick} handleDeleteTicket={handleDeleteTicket} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            <div className="flex flex-col gap-5 md:col-span-7">
                <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Condition</label>
                    <div className="bg-gray-50/50 p-2 rounded-2xl border border-gray-100/50">
                        <ConditionSelector q={q} responses={responses} isEditMode={isEditMode} inspection={inspection} series={series} activeSeries={activeSeries} setActiveSeries={setActiveSeries} handleConditionChange={handleConditionChange} />
                    </div>
                </div>
                
                <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Notes</label>
                    <textarea
                        placeholder="Add detailed item notes..."
                        value={responses[q.id]?.notes || ''}
                        readOnly={!isEditMode && inspection.status !== 'DRAFT'}
                        onChange={(e) => handleNoteChange(q.id, e.target.value)}
                        rows={3}
                        className="w-full p-4 bg-white border border-gray-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm"
                    />
                </div>
            </div>
            
            <div className="flex flex-col gap-2 md:col-span-5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Photo Evidence</label>
                <div className="h-full min-h-[140px] bg-gray-50/50 p-4 rounded-2xl border border-gray-100/50">
                    <PhotoSelector q={q} responses={responses} isEditMode={isEditMode} inspection={inspection} handlePhotoUpload={handlePhotoUpload} removePhoto={removePhoto} setAnnotationModal={setAnnotationModal} localPhotoCache={localPhotoCache} handleAnnotationChange={handleAnnotationChange} />
                </div>
            </div>
        </div>
    </div>
);

const ConditionSelector = ({ q, responses, isEditMode, inspection, series, activeSeries, setActiveSeries, handleConditionChange }) => (
    <div className="flex flex-col gap-2">
        {q.type === 'DROPDOWN' ? (
            <select
                value={responses[q.id]?.status || ''}
                disabled={!isEditMode && inspection.status !== 'DRAFT'}
                onChange={(e) => handleConditionChange(q.id, e.target.value)}
                className="w-full px-4 py-3 bg-white border border-gray-100 rounded-xl text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
            >
                <option value="">Select Option...</option>
                {(q.options || '').split(',').map(opt => (
                    <option key={opt.trim()} value={opt.trim()}>{opt.trim()}</option>
                ))}
            </select>
        ) : q.type === 'YES_NO' ? (
            <div className="grid grid-cols-2 gap-3">
                {['Yes', 'No'].map(choice => (
                    <ConditionToggle
                        key={choice}
                        label={choice}
                        active={responses[q.id]?.status === choice}
                        color={choice === 'Yes' ? 'text-green-600' : 'text-red-600'}
                        dot={choice === 'Yes' ? 'bg-green-500' : 'bg-red-500'}
                        onClick={() => (isEditMode || inspection.status === 'DRAFT') && handleConditionChange(q.id, choice)}
                        disabled={!isEditMode && inspection.status !== 'DRAFT'}
                    />
                ))}
            </div>
        ) : (
            <div className="flex flex-col gap-2">
                <div className="grid grid-cols-1 gap-2">
                    {(q.seriesId 
                        ? (series.find(s => s.id === q.seriesId)?.responses || [])
                        : (inspection.template?.structure?.responseChoices || [
                            { label: 'Good', color: 'green' },
                            { label: 'Fair', color: 'orange' },
                            { label: 'Poor', color: 'red' }
                        ]).filter(choice => !q.selectedChoices || q.selectedChoices.length === 0 || q.selectedChoices.includes(choice.label))
                    ).map(choice => (
                        <ConditionToggle
                            key={choice.label}
                            label={choice.label}
                            active={responses[q.id]?.status === choice.label}
                            color={`text-${choice.color}-600`}
                            dot={`bg-${choice.color}-500`}
                            onClick={() => (isEditMode || inspection.status === 'DRAFT') && handleConditionChange(q.id, choice.label)}
                            disabled={!isEditMode && inspection.status !== 'DRAFT'}
                        />
                    ))}
                </div>
            </div>
        )}
    </div>
);

const PhotoSelector = ({ q, responses, isEditMode, inspection, handlePhotoUpload, removePhoto, setAnnotationModal, localPhotoCache, handleAnnotationChange }) => {
    const response = responses[q.id] || {};
    // Ensure we have a valid array of photos
    const photos = (response.photos || (response.photo ? [response.photo] : [])).filter(p => !!p);
    
    return (
        <div className="flex flex-col gap-4">
            {/* Gallery View */}
            <div className="grid grid-cols-3 gap-3">
                {photos.map((p, idx) => (
                    <div key={`${idx}-${p?.substring(0, 20)}`} className="relative aspect-square rounded-2xl bg-gray-100 overflow-hidden border border-gray-100 group/photo shadow-md ring-1 ring-black/5 hover:ring-indigo-500/50 transition-all">
                        <img 
                            src={p} 
                            key={p}
                            className="w-full h-full object-cover" 
                            alt={`Evidence ${idx + 1}`}
                            onError={(e) => {
                                console.error('Image Load Error:', p);
                                // Fallback to a placeholder if it really fails
                                e.target.src = "https://via.placeholder.com/400x400?text=Image+Loading...";
                            }}
                        />
                        
                        {(isEditMode || inspection.status === 'DRAFT') && (
                            <div className="absolute inset-0 bg-black/10 transition-all flex flex-col items-center justify-center gap-2 z-[50]">
                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={() => {
                                            const source = localPhotoCache.current.get(p) || p;
                                            setAnnotationModal({ 
                                                isOpen: true, 
                                                questionId: q.id, 
                                                photoUrl: source, 
                                                photoIndex: idx 
                                            });
                                        }}
                                        className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-2xl active:scale-90 transition-transform flex items-center justify-center cursor-pointer pointer-events-auto"
                                        title="Edit / Mark Photo"
                                    >
                                        <Edit3 size={16} />
                                    </button>
                                    <button 
                                        onClick={() => removePhoto(q.id, idx)}
                                        className="p-2.5 bg-red-500 text-white rounded-xl shadow-xl active:scale-90 transition-transform flex items-center justify-center"
                                        title="Remove Photo"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        )}

                        {idx === 0 && (
                            <div className="absolute bottom-0 inset-x-0 bg-indigo-600/80 backdrop-blur-sm py-0.5 text-center">
                                <span className="text-[7px] font-black text-white uppercase tracking-widest">Primary</span>
                            </div>
                        )}
                    </div>
                ))}
                
                {/* Upload Button - Limited to 3 */}
                {(isEditMode || inspection.status === 'DRAFT') && photos.length < 3 && (
                    <div className="relative aspect-square rounded-xl bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center hover:border-indigo-300 hover:bg-indigo-50/30 transition-all cursor-pointer group/add">
                        <div className="flex flex-col items-center gap-1">
                            <Camera size={18} className="text-gray-300 group-hover/add:text-indigo-400" />
                            <span className="text-[7px] font-black text-gray-300 uppercase tracking-widest">{photos.length}/3</span>
                        </div>
                        <input 
                            type="file" 
                            accept="image/*"
                            capture="environment"
                            onClick={(e) => e.target.value = null}
                            onChange={(e) => handlePhotoUpload(q.id, e.target.files[0])}
                            className="absolute inset-0 opacity-0 cursor-pointer" 
                        />
                    </div>
                )}
            </div>

            {photos.length > 0 && (
                <div className="flex flex-col gap-2 mt-1">
                    <input 
                        type="text"
                        placeholder="Add photo text note..."
                        value={responses[q.id]?.annotation || ''}
                        readOnly={!isEditMode && inspection.status !== 'DRAFT'}
                        onChange={(e) => handleAnnotationChange(q.id, e.target.value)}
                        className="text-[10px] font-bold p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
                    />
                </div>
            )}
            {photos.length === 0 && (
                <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest text-center py-2">No photos captured</p>
            )}
        </div>
    );
};

const TicketStatus = ({ q, responses, isEditMode, inspection, ticketLoading, handleCreateTicketClick, handleDeleteTicket }) => (
    <div className="flex flex-col gap-1 items-end">
        {responses[q.id]?.ticketCreated ? (
            <div className="flex items-center justify-between gap-2 text-green-600 font-black text-[9px] uppercase bg-green-50 p-2 rounded-lg border border-green-100">
                <div className="flex items-center gap-2">
                    <CheckCircle2 size={12} /> Ticket OK
                </div>
                {(isEditMode || inspection.status === 'DRAFT') && (
                    <button onClick={() => handleDeleteTicket(q.id, responses[q.id].ticketId)} className="text-red-400 hover:text-red-600">
                        <Trash2 size={12} />
                    </button>
                )}
            </div>
        ) : (
            <button 
                onClick={() => handleCreateTicketClick(q)}
                disabled={ticketLoading[q.id] || (!isEditMode && inspection.status !== 'DRAFT')}
                className="px-3 py-2 bg-gray-50 rounded-lg text-[9px] font-black text-gray-500 uppercase hover:bg-white border border-transparent hover:border-gray-200 transition-all disabled:opacity-50"
            >
                {ticketLoading[q.id] ? '...' : '+ Create Ticket'}
            </button>
        )}
    </div>
);

const ConditionToggle = ({ label, active, color, dot, onClick, disabled }) => (
    <button 
        onClick={onClick} 
        disabled={disabled}
        className={`flex items-center gap-3 p-3 rounded-xl transition-all text-left w-full border ${active ? 'border-indigo-100 bg-white shadow-sm' : 'border-transparent hover:bg-white active:scale-95'} ${disabled ? 'cursor-default' : ''}`}
    >
        <div className={`w-6 h-6 rounded-full border-2 transition-all flex items-center justify-center shrink-0 ${active ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200'}`}>
            {active && <div className={`w-3 h-3 rounded-full ${dot}`} />}
        </div>
        <span className={`text-[12px] font-black tracking-tight uppercase transition-all ${active ? color : 'text-gray-400'}`}>{label}</span>
    </button>
);

export default InspectionForm;
