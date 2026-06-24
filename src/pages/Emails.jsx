import React, { useState, useEffect } from 'react';
import { MainLayout } from '../layouts/MainLayout';
import api from '../api/client';
import { Mail, CheckCircle, XCircle, Search, RefreshCw, Send, X, UserPlus, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../components/Button';

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_BUTTONS = 5;

export const Emails = () => {
    const [__forceUpdate, __setForceUpdate] = useState(0);
    useEffect(() => {
        const handleUpdate = () => __setForceUpdate(p => p + 1);
        window.addEventListener('permissionsUpdated', handleUpdate);
        return () => window.removeEventListener('permissionsUpdated', handleUpdate);
    }, []);

    const [emails, setEmails] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [limit] = useState(DEFAULT_PAGE_SIZE);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [deletingId, setDeletingId] = useState(null);

    const [composeOpen, setComposeOpen] = useState(false);
    const [composeRecipients, setComposeRecipients] = useState('');
    const [composeSubject, setComposeSubject] = useState('');
    const [composeBody, setComposeBody] = useState('');
    const [sending, setSending] = useState(false);
    const [sendError, setSendError] = useState('');
    const [sendSuccess, setSendSuccess] = useState('');
    const [pickerOpen, setPickerOpen] = useState(false);
    const [tenantsAndOwners, setTenantsAndOwners] = useState([]);
    const [pickerLoading, setPickerLoading] = useState(false);
    const [selectedEmails, setSelectedEmails] = useState(new Set());

    const fetchEmails = async (pageNum = 1) => {
        setLoading(true);
        try {
            const res = await api.get('/api/admin/communication/emails', {
                params: { page: pageNum, limit: DEFAULT_PAGE_SIZE }
            });
            const payload = res.data;
            const isPaginated = payload && typeof payload === 'object' && 'data' in payload;
            const data = isPaginated ? (payload.data || []) : (Array.isArray(payload) ? payload : []);
            const totalCount = isPaginated ? (payload.total ?? data.length) : data.length;
            const currentPage = isPaginated ? (payload.page || 1) : 1;
            const pagesTotal = isPaginated && payload.totalPages != null ? payload.totalPages : Math.ceil(totalCount / DEFAULT_PAGE_SIZE) || 1;
            setEmails(data);
            setTotal(totalCount);
            setPage(currentPage);
            setTotalPages(Math.max(1, pagesTotal));
        } catch (e) {
            console.error(e);
            setEmails([]);
            setTotal(0);
            setTotalPages(1);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEmails(1);
    }, []);

    const goToPage = (p) => {
        const targetPage = Math.max(1, Math.min(p, totalPages || 1));
        setPage(targetPage);
        fetchEmails(targetPage);
    };

    const getPageNumbers = () => {
        const total = totalPages || 1;
        if (total <= MAX_PAGE_BUTTONS) {
            return Array.from({ length: total }, (_, i) => i + 1);
        }
        const pages = new Set([1, total]);
        const half = Math.floor(MAX_PAGE_BUTTONS / 2);
        for (let i = Math.max(1, page - half); i <= Math.min(total, page + half); i++) {
            pages.add(i);
        }
        return Array.from(pages).sort((a, b) => a - b);
    };

    const handleDeleteLog = async (id) => {
        if (!window.confirm('Remove this email log entry? This cannot be undone.')) return;
        setDeletingId(id);
        try {
            await api.delete(`/api/admin/communication/emails/${id}`);
            await fetchEmails(emails.length === 1 && page > 1 ? page - 1 : page);
        } catch (e) {
            console.error(e);
            alert(e.response?.data?.message || 'Failed to delete log.');
        } finally {
            setDeletingId(null);
        }
    };

    const filteredEmails = emails.filter(e =>
        (e.recipient || '').toLowerCase().includes(search.toLowerCase()) ||
        (e.recipientEmail || '').toLowerCase().includes(search.toLowerCase()) ||
        (e.subject || '').toLowerCase().includes(search.toLowerCase()) ||
        (e.source || '').toLowerCase().includes(search.toLowerCase())
    );

    const openCompose = () => {
        setComposeOpen(true);
        setSendError('');
        setSendSuccess('');
    };

    const closeCompose = () => {
        setComposeOpen(false);
        setSendError('');
        setSendSuccess('');
        if (!sending) {
            setComposeRecipients('');
            setComposeSubject('');
            setComposeBody('');
        }
    };

    const fetchTenantsAndOwners = async () => {
        setPickerLoading(true);
        try {
            const [tenantsRes, ownersRes] = await Promise.all([
                api.get('/api/admin/tenants?limit=1000&status=Active').catch(() => ({ data: [] })),
                api.get('/api/admin/owners?limit=1000').catch(() => ({ data: [] }))
            ]);
            const tenants = Array.isArray(tenantsRes.data) ? tenantsRes.data : (tenantsRes.data?.data || []);
            const owners = Array.isArray(ownersRes.data) ? ownersRes.data : (ownersRes.data?.data || []);
            const combined = [
                ...tenants.map(t => ({ email: t.email, name: t.name || `${t.firstName || ''} ${t.lastName || ''}`.trim() || t.email, type: 'Tenant' })),
                ...owners.map(o => ({ email: o.email, name: o.name || o.email, type: 'Owner' }))
            ].filter(x => x.email);
            setTenantsAndOwners(combined);
            setPickerOpen(true);
            setSelectedEmails(new Set());
        } catch (e) {
            console.error(e);
        } finally {
            setPickerLoading(false);
        }
    };

    const togglePickerEmail = (email) => {
        setSelectedEmails(prev => {
            const next = new Set(prev);
            if (next.has(email)) next.delete(email);
            else next.add(email);
            return next;
        });
    };

    const addSelectedToRecipients = () => {
        const current = composeRecipients.split(/[\s,;]+/).filter(Boolean);
        const added = [...current, ...selectedEmails];
        setComposeRecipients(added.join(', '));
        setPickerOpen(false);
    };

    const handleSendCompose = async (e) => {
        e.preventDefault();
        setSendError('');
        setSendSuccess('');
        const recipients = (composeRecipients || '')
            .split(/[\s,;]+/)
            .map(s => s.trim())
            .filter(Boolean);
        if (!recipients.length) {
            setSendError('Please enter at least one recipient email.');
            return;
        }
        if (!composeSubject.trim()) {
            setSendError('Please enter a subject.');
            return;
        }
        setSending(true);
        try {
            const res = await api.post('/api/admin/communication/send-email', {
                recipients,
                subject: composeSubject.trim(),
                body: composeBody.trim()
            });
            if (res.data.success) {
                setSendSuccess(res.data.message || 'Email(s) sent successfully.');
                setTimeout(() => {
                    closeCompose();
                    fetchEmails(1);
                }, 1500);
            } else {
                setSendError(res.data.message || 'Failed to send.');
            }
        } catch (err) {
            const msg = err.response?.data?.message || err.message || 'Failed to send email. Please try again.';
            setSendError(msg);
        } finally {
            setSending(false);
        }
    };

    const pageNumbers = getPageNumbers();
    const tp = totalPages || 1;

    return (
        <MainLayout title="Email Logs">
            <div className="flex flex-col gap-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative flex items-center bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-w-[220px]">
                            <Search className="absolute left-3 w-4 h-4 text-slate-400 pointer-events-none" />
                            <input
                                type="text"
                                placeholder="Search by recipient, subject..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 text-sm bg-transparent border-0 outline-none text-slate-800 placeholder-slate-400"
                            />
                        </div>
                        <Button variant="secondary" onClick={() => fetchEmails(page)} disabled={loading} className="shrink-0">
                            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
                            Refresh
                        </Button>
                    </div>
                    <Button variant="primary" onClick={openCompose} className="shrink-0 w-full sm:w-auto">
                        <Send size={18} />
                        Compose Email
                    </Button>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[800px]">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="w-12 px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Delete</th>
                                    <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">Date</th>
                                    <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Recipient</th>
                                    <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Subject</th>
                                    <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Snippet</th>
                                    <th className="px-4 py-3 text-center text-[10px] font-bold text-slate-500 uppercase tracking-widest w-24">Source</th>
                                    <th className="px-4 py-3 text-center text-[10px] font-bold text-slate-500 uppercase tracking-widest w-24">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                                            <RefreshCw size={28} className="animate-spin mx-auto mb-2 text-slate-300" />
                                            <p className="text-sm">Loading email logs...</p>
                                        </td>
                                    </tr>
                                ) : filteredEmails.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                                            <Mail size={40} className="mx-auto mb-2 text-slate-300" />
                                            <p className="text-sm font-medium">No emails found</p>
                                            <p className="text-xs mt-1">Send an email or adjust your search.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredEmails.map((email) => (
                                        <tr key={email.id} className="hover:bg-slate-50/80 transition-colors group">
                                            <td className="px-4 py-3">
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteLog(email.id)}
                                                    disabled={deletingId === email.id}
                                                    className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                                                    title="Delete log"
                                                >
                                                    <Trash2 size={16} className={deletingId === email.id ? "animate-pulse" : ""} />
                                                </button>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-slate-600 font-medium whitespace-nowrap">{email.date}</td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-semibold text-slate-800">{email.recipient || '—'}</span>
                                                    <span className="text-xs text-slate-500">{email.recipientEmail || ''}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-sm font-medium text-indigo-600 max-w-[200px] truncate" title={email.subject}>{email.subject || '—'}</td>
                                            <td className="px-4 py-3 text-sm text-slate-500 max-w-[240px] truncate" title={email.message}>{email.message || '—'}</td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold ${email.source === 'Manual' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'}`}>
                                                    {email.source || 'System'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                {email.status === 'Sent' ? (
                                                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">
                                                        <CheckCircle size={12} /> Sent
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-100 px-2.5 py-1 rounded-full">
                                                        <XCircle size={12} /> Failed
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-4 py-4 bg-slate-50 border-t border-slate-200">
                        <p className="text-sm text-slate-600 order-2 sm:order-1">
                            {total === 0 ? 'No emails' : `Showing ${((page - 1) * DEFAULT_PAGE_SIZE) + 1}–${Math.min(page * DEFAULT_PAGE_SIZE, total)} of ${total}`}
                        </p>
                        <div className="flex items-center justify-center gap-1 order-1 sm:order-2">
                            <button
                                type="button"
                                onClick={() => goToPage(page - 1)}
                                disabled={page <= 1 || loading}
                                className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronLeft size={18} />
                            </button>
                            {pageNumbers.map((num, idx) => (
                                <React.Fragment key={num}>
                                    {idx > 0 && pageNumbers[idx - 1] !== num - 1 && (
                                        <span className="px-2 text-slate-400 text-sm">…</span>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => goToPage(num)}
                                        disabled={loading}
                                        className={`min-w-[36px] h-9 px-2 rounded-lg border text-sm font-medium transition-colors ${page === num
                                            ? 'bg-indigo-600 border-indigo-600 text-white'
                                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                                            } disabled:opacity-50`}
                                    >
                                        {num}
                                    </button>
                                </React.Fragment>
                            ))}
                            <button
                                type="button"
                                onClick={() => goToPage(page + 1)}
                                disabled={page >= tp || loading}
                                className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {composeOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between p-4 border-b border-slate-200">
                            <h3 className="text-lg font-bold text-slate-800">Compose Email</h3>
                            <button type="button" onClick={closeCompose} disabled={sending} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSendCompose} className="flex flex-col flex-1 overflow-hidden">
                            <div className="p-4 space-y-4 overflow-y-auto">
                                {sendError && (
                                    <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{sendError}</div>
                                )}
                                {sendSuccess && (
                                    <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">{sendSuccess}</div>
                                )}
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">To (email addresses, comma-separated)</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={composeRecipients}
                                            onChange={(e) => setComposeRecipients(e.target.value)}
                                            placeholder="e.g. user@example.com, other@example.com"
                                            className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm"
                                        />
                                        <Button type="button" variant="secondary" onClick={fetchTenantsAndOwners} disabled={pickerLoading}>
                                            <UserPlus size={16} /> {pickerLoading ? '...' : 'Choose'}
                                        </Button>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Subject</label>
                                    <input
                                        type="text"
                                        value={composeSubject}
                                        onChange={(e) => setComposeSubject(e.target.value)}
                                        placeholder="Email subject"
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Message</label>
                                    <textarea
                                        value={composeBody}
                                        onChange={(e) => setComposeBody(e.target.value)}
                                        placeholder="Write your message..."
                                        rows={6}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 p-4 border-t border-slate-200 bg-slate-50">
                                <Button type="button" variant="secondary" onClick={closeCompose} disabled={sending}>Cancel</Button>
                                <Button type="submit" variant="primary" disabled={sending}>
                                    {sending ? 'Sending...' : 'Send Email'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {pickerOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col">
                        <div className="p-4 border-b border-slate-200 flex justify-between items-center">
                            <h4 className="font-bold text-slate-800">Select recipients</h4>
                            <button type="button" onClick={() => setPickerOpen(false)} className="p-2 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {tenantsAndOwners.length === 0 ? (
                                <p className="text-sm text-center text-slate-500 py-4">No tenants or owners with email found.</p>
                            ) : (
                                <>
                                    {/* Owners Section */}
                                    {tenantsAndOwners.some(p => p.type === 'Owner') && (
                                        <div>
                                            <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 bg-slate-50 px-2 py-1 rounded">🏠 Owners</h5>
                                            <div className="space-y-1">
                                                {tenantsAndOwners.filter(p => p.type === 'Owner').map(person => (
                                                    <label key={person.email} className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedEmails.has(person.email)}
                                                            onChange={() => togglePickerEmail(person.email)}
                                                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                                        />
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-semibold text-slate-800">{person.name}</span>
                                                            <span className="text-[11px] text-slate-500">{person.email}</span>
                                                        </div>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Tenants Section */}
                                    {tenantsAndOwners.some(p => p.type === 'Tenant') && (
                                        <div>
                                            <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 bg-slate-50 px-2 py-1 rounded">👥 Tenants</h5>
                                            <div className="space-y-1">
                                                {tenantsAndOwners.filter(p => p.type === 'Tenant').map(person => (
                                                    <label key={person.email} className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedEmails.has(person.email)}
                                                            onChange={() => togglePickerEmail(person.email)}
                                                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                                        />
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-semibold text-slate-800">{person.name}</span>
                                                            <span className="text-[11px] text-slate-500">{person.email}</span>
                                                        </div>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                        <div className="p-4 border-t border-slate-200 flex justify-end gap-2 bg-slate-50">
                            <Button variant="secondary" onClick={() => setPickerOpen(false)}>Cancel</Button>
                            <Button variant="primary" onClick={addSelectedToRecipients} disabled={selectedEmails.size === 0}>
                                Add {selectedEmails.size > 0 ? `(${selectedEmails.size})` : ''} to To field
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </MainLayout>
    );
};
