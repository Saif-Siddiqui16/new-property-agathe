import React, { useState } from 'react';
import { TenantLayout } from '../../layouts/TenantLayout';
import { Wrench, Plus, X, CheckCircle2, Clock, MessageSquare, AlertCircle } from 'lucide-react';
import { Button } from '../../components/Button';
import api from '../../api/client';

const initialTickets = [
    { id: 'T-1025', subject: 'Leaking Kitchen Sink', status: 'In Progress', priority: 'High', date: '2026-01-05', desc: 'Water is dripping from the main pipe under the sink.' },
    { id: 'T-1024', subject: 'AC Filter Replacement', status: 'Resolved', priority: 'Low', date: '2026-01-02', desc: 'Regular maintenance.' },
];

export const TenantTickets = () => {
    const [tickets, setTickets] = useState([]);
    const [showNew, setShowNew] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [attachments, setAttachments] = useState({});

    React.useEffect(() => {
        fetchTickets();
    }, []);

    const fetchTickets = async () => {
        try {
            const res = await api.get('/api/tenant/tickets');
            setTickets(res.data);
        } catch (e) {
            console.error(e);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        const form = e.target;

        try {
            const formData = new FormData();
            formData.append('subject', form.subject.value);
            formData.append('description', form.description.value);
            formData.append('priority', form.priority.value);

            // Handle Attachments
            const imageFiles = Array.from(form.images.files);
            imageFiles.forEach(file => {
                formData.append('images', file);
            });

            const videoFile = form.video.files[0];
            if (videoFile) {
                formData.append('video', videoFile);
            }

            const res = await api.post('/api/tenant/tickets', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            const newTicket = res.data;

            setTickets([newTicket, ...tickets]);
            setShowNew(false);
            form.reset();
        } catch (e) {
            console.error('Upload Error:', e);
            alert('Failed to create ticket');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <TenantLayout title="Maintenance Tickets">
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                    <div className="space-y-1">
                        <h2 className="text-xl font-black text-slate-800 tracking-tight">Support Requests</h2>
                        <p className="text-sm text-slate-500 font-medium">Need something fixed? We're here to help.</p>
                    </div>
                    <Button variant="primary" className="rounded-xl flex items-center gap-2 font-bold py-3 shadow-lg shadow-primary-50 active:scale-95" onClick={() => setShowNew(true)}>
                        <Plus size={18} />
                        Raise New Ticket
                    </Button>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    {tickets.map((ticket) => (
                        <div key={ticket.id} onClick={() => setSelectedTicket(ticket)} className="bg-white rounded-3xl border border-slate-100 p-6 flex flex-col md:flex-row gap-6 items-start md:items-center hover:shadow-md transition-all group cursor-pointer">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${ticket.status === 'Resolved' ? 'bg-emerald-50 text-emerald-600' : 'bg-primary-50 text-primary-600'
                                }`}>
                                <Wrench size={24} />
                            </div>

                            <div className="flex-1 space-y-1">
                                <div className="flex items-center gap-3">
                                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{ticket.id}</span>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tight border ${ticket.priority === 'High' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-slate-50 text-slate-500 border-slate-100'
                                        }`}>
                                        {ticket.priority} Priority
                                    </span>
                                </div>
                                <h4 className="text-lg font-bold text-slate-800 group-hover:text-primary-600 transition-colors">{ticket.subject}</h4>
                                <p className="text-sm text-slate-500 font-medium line-clamp-1">{ticket.desc}</p>
                            </div>

                            <div className="flex flex-row md:flex-col items-center md:items-end gap-4 md:gap-1 shrink-0 w-full md:w-auto pt-4 md:pt-0 border-t md:border-t-0 border-slate-50">
                                <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-tight border ${ticket.status === 'Resolved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'
                                    }`}>
                                    {ticket.status === 'Resolved' ? <CheckCircle2 size={14} /> : <Clock size={14} />}
                                    {ticket.status}
                                </div>
                                <span className="text-xs font-bold text-slate-400">{ticket.date}</span>
                            </div>
                        </div>
                    ))}
                    {tickets.length === 0 && (
                        <div className="p-20 text-center space-y-4">
                            <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto text-slate-200">
                                <MessageSquare size={40} />
                            </div>
                            <p className="text-slate-400 font-bold">No tickets found.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* NEW TICKET MODAL */}
            {showNew && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                            <h3 className="text-xl font-black text-slate-800">Raise New Ticket</h3>
                            <button onClick={() => setShowNew(false)} className="p-2 text-slate-400 hover:bg-slate-50 rounded-xl transition-all">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-8 space-y-6">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Subject</label>
                                <input name="subject" required className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:border-primary-500 outline-none font-medium text-slate-700" placeholder="e.g. Broken Light Fixture" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Priority</label>
                                <div className="grid grid-cols-3 gap-3">
                                    {['Low', 'Medium', 'High'].map((p) => (
                                        <label key={p} className="cursor-pointer group">
                                            <input type="radio" name="priority" value={p} defaultChecked={p === 'Medium'} className="peer sr-only" />
                                            <div className="text-center py-2.5 rounded-xl border-2 border-slate-100 peer-checked:border-primary-600 peer-checked:bg-primary-50 text-xs font-black uppercase text-slate-400 peer-checked:text-primary-600 transition-all">
                                                {p}
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Description</label>
                                <textarea name="description" required className="w-full h-32 p-4 rounded-xl border border-slate-200 focus:border-primary-500 outline-none font-medium text-slate-700 resize-none" placeholder="Provide more details..." />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-50">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Images</label>
                                    <input type="file" name="images" multiple accept=".jpg,.png,.jpeg" className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-primary-50 file:text-primary-600 cursor-pointer" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Video</label>
                                    <input type="file" name="video" accept=".mp4,.mov" className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-primary-50 file:text-primary-600 cursor-pointer" />
                                </div>
                            </div>

                            <Button variant="primary" className="w-full h-14 rounded-2xl font-black text-lg" disabled={isSubmitting}>
                                {isSubmitting ? 'Submitting...' : 'Send Request'}
                            </Button>
                        </form>
                    </div>
                </div>
            )}

            {/* TICKET DETAIL MODAL */}
            {selectedTicket && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-300 overflow-y-auto max-h-[90vh]">
                        <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                            <h3 className="text-xl font-black text-slate-800">{selectedTicket.id} Detail</h3>
                            <button onClick={() => setSelectedTicket(null)} className="p-2 text-slate-400 hover:bg-slate-50 rounded-xl transition-all">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="p-8 space-y-6">
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Subject</label>
                                <p className="text-lg font-bold text-slate-800 mt-1">{selectedTicket.subject}</p>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Description</label>
                                <p className="text-slate-600 font-medium mt-1">{selectedTicket.desc}</p>
                            </div>

                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Attachments</label>
                            {selectedTicket.attachments && selectedTicket.attachments.length > 0 ? (
                                <div className="space-y-4">
                                    {selectedTicket.attachments.some(a => a.type === 'image') && (
                                        <div className="grid grid-cols-3 gap-2">
                                            {selectedTicket.attachments.filter(a => a.type === 'image').map((img, i) => (
                                                <div key={i} className="aspect-square rounded-2xl overflow-hidden border border-slate-100 bg-slate-50 cursor-pointer hover:opacity-90 transition-opacity">
                                                    <img src={img.url} alt="" className="w-full h-full object-cover" onClick={() => window.open(img.url, '_blank')} />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {selectedTicket.attachments.find(a => a.type === 'video') && (
                                        <div className="rounded-2xl overflow-hidden border border-slate-100 bg-slate-900 aspect-video relative group">
                                            <video src={selectedTicket.attachments.find(a => a.type === 'video').url} className="w-full h-full object-cover" controls />
                                            <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors pointer-events-none group-data-[playing=true]:hidden">
                                                <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white ring-4 ring-white/10">
                                                    <Clock size={24} />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <p className="text-sm text-slate-400 italic">No attachments provided</p>
                            )}

                            <Button variant="primary" className="w-full h-14 rounded-2xl font-black text-lg" onClick={() => setSelectedTicket(null)}>
                                Close
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </TenantLayout>
    );
};
