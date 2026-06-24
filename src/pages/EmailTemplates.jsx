import React, { useState, useEffect } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import api from '../api/client';
import { Mail, Edit2, Trash2, Plus, X, Search, FileText, Paperclip, Check } from 'lucide-react';
import { MainLayout } from '../layouts/MainLayout';
import { hasPermission } from '../utils/permissions';

const EmailTemplates = () => {
    const [__forceUpdate, __setForceUpdate] = useState(0);
    useEffect(() => {
        const handleUpdate = () => __setForceUpdate(p => p + 1);
        window.addEventListener('permissionsUpdated', handleUpdate);
        return () => window.removeEventListener('permissionsUpdated', handleUpdate);
    }, []);

    if (!hasPermission('Email Templates', 'view')) {
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

    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentTemplate, setCurrentTemplate] = useState({ name: '', subject: '', body: '', language: 'en', type: '', documentIds: [] });
    const [availableDocs, setAvailableDocs] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');

    const PLACEHOLDERS = [
        { label: 'Recipient Name', code: '{{name}}' },
        { label: 'Portal Link', code: '{{link}}' },
        { label: 'Building', code: '{{buildingName}}' },
        { label: 'Unit #', code: '{{unitNumber}}' },
        { label: 'Rent $', code: '{{rentAmount}}' },
        { label: 'Balance Due $', code: '{{outstandingBalance}}' },
        { label: 'Lease End', code: '{{leaseEndDate}}' },
        { label: 'Insurance End', code: '{{insuranceExpiryDate}}' },
        { label: 'Date - Month', code: '{{month}}' },
        { label: 'Date - Year', code: '{{year}}' },
    ];

    const insertPlaceholder = (fieldName, placeholder) => {
        const field = currentTemplate[fieldName] || '';
        // Try to find the element in DOM to respect cursor position
        const input = document.getElementById(`editor-${fieldName}`);
        
        if (!input) {
            setCurrentTemplate({ ...currentTemplate, [fieldName]: field + placeholder });
            return;
        }

        const start = input.selectionStart;
        const end = input.selectionEnd;
        const text = input.value;
        const before = text.substring(0, start);
        const after = text.substring(end, text.length);

        const newValue = before + placeholder + after;
        setCurrentTemplate({ ...currentTemplate, [fieldName]: newValue });

        // Restore focus and move cursor after the placeholder
        setTimeout(() => {
            input.focus();
            input.setSelectionRange(start + placeholder.length, start + placeholder.length);
        }, 0);
    };

    useEffect(() => {
        fetchTemplates();
        fetchDocuments();
    }, []);

    const fetchTemplates = async () => {
        setLoading(true);
        try {
            const response = await api.get('/api/admin/email/templates');
            setTemplates(response.data);
        } catch (error) {
            console.error('Error fetching templates:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchDocuments = async () => {
        try {
            const response = await api.get('/api/admin/documents?limit=1000');
            const docs = Array.isArray(response.data) ? response.data : (response.data?.data || []);
            setAvailableDocs(docs);
        } catch (error) {
            console.error('Error fetching documents:', error);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            if (currentTemplate.id) {
                await api.put(`/api/admin/email/templates/${currentTemplate.id}`, currentTemplate);
            } else {
                await api.post('/api/admin/email/templates', currentTemplate);
            }
            setIsModalOpen(false);
            fetchTemplates();
        } catch (error) {
            console.error('Error saving template:', error);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this template?')) return;
        try {
            await api.delete(`/api/admin/email/templates/${id}`);
            fetchTemplates();
        } catch (error) {
            console.error('Error deleting template:', error);
        }
    };

    const openModal = (template = { name: '', subject: '', body: '', language: 'en', type: '', documentIds: [] }) => {
        // Convert old plain text newlines to HTML for the new Rich Text Editor
        let formattedBody = template.body || '';
        if (formattedBody && !formattedBody.includes('<p>') && !formattedBody.includes('<div>')) {
            formattedBody = formattedBody
                .split('\n')
                .map(line => line.trim() === '' ? '<p><br></p>' : `<p>${line}</p>`)
                .join('');
        }

        setCurrentTemplate({
            ...template,
            body: formattedBody,
            language: template.language || 'en',
            type: template.type || '',
            documentIds: template.documents?.map(d => d.id) || []
        });
        setIsModalOpen(true);
    };

    const toggleDocument = (docId) => {
        const ids = [...currentTemplate.documentIds];
        const index = ids.indexOf(docId);
        if (index > -1) ids.splice(index, 1);
        else ids.push(docId);
        setCurrentTemplate({ ...currentTemplate, documentIds: ids });
    };

    const filteredTemplates = templates.filter(t => 
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        t.subject.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <MainLayout title="Email Templates">
            <style>
                {`
                    .ql-container {
                        height: calc(100% - 42px) !important;
                        font-size: 14px;
                    }
                    .ql-editor {
                        min-height: 100%;
                        padding-bottom: 20px !important;
                    }
                `}
            </style>
            <div className="space-y-6 text-slate-800">
                <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Mail className="h-6 w-6 text-indigo-600" />
                        Email Templates
                    </h1>
                    <p className="text-gray-500 mt-1">Manage reusable professional communication templates.</p>
                </div>
                {hasPermission('Email Templates', 'add') && (
                    <button 
                        onClick={() => openModal()}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-md hover:shadow-indigo-100 active:scale-95"
                    >
                        <Plus className="h-5 w-5" />
                        New Template
                    </button>
                )}
            </div>

            {/* Search Bar */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input 
                    type="text" 
                    placeholder="Search templates..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all outline-none bg-white font-medium"
                />
            </div>

            {/* Templates Grid */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Array(3).fill(0).map((_, i) => (
                        <div key={i} className="bg-white border border-gray-100 h-64 rounded-2xl animate-pulse"></div>
                    ))}
                </div>
            ) : filteredTemplates.length === 0 ? (
                <div className="bg-white p-20 text-center rounded-2xl border border-dashed border-gray-200">
                    <Mail className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-600">No templates found</h3>
                    <p className="text-gray-400 mt-2">Create your first template to get started.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredTemplates.map(template => (
                        <div key={template.id} className="bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-lg transition-all group overflow-hidden flex flex-col">
                            <div className="p-6 flex-grow">
                                <div className="flex items-start justify-between mb-2">
                                    <div className="bg-indigo-50 p-2.5 rounded-xl">
                                        <FileText className="h-6 w-6 text-indigo-600" />
                                    </div>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {hasPermission('Email Templates', 'edit') && (
                                            <button onClick={() => openModal(template)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600">
                                                <Edit2 className="h-4 w-4" />
                                            </button>
                                        )}
                                        {hasPermission('Email Templates', 'delete') && (
                                            <button onClick={() => handleDelete(template.id)} className="p-2 hover:bg-red-50 rounded-lg transition-colors text-red-500">
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{template.name}</h3>
                                <p className="text-sm text-gray-500 font-medium mt-1">Subject: {template.subject}</p>
                                <div className="mt-4 text-xs text-gray-400 line-clamp-3">
                                    {template.body.replace(/<[^>]*>?/gm, '').substring(0, 150)}...
                                </div>
                                <div className="mt-4 flex gap-2">
                                    <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px] font-bold uppercase">{template.language}</span>
                                    {template.type && (
                                        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[10px] font-bold uppercase">{template.type}</span>
                                    )}
                                </div>
                            </div>
                            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                                <span className="text-xs text-gray-500 flex items-center gap-1.5 font-semibold uppercase tracking-wider">
                                    <Paperclip className="h-3.5 w-3.5" />
                                    {template.documents?.length || 0} Attachments
                                </span>
                                <span className="text-[10px] text-gray-400 font-medium italic">
                                    Last updated: {new Date(template.updatedAt).toLocaleDateString()}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal - Simplified Create/Edit */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
                        <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
                            <h2 className="text-2xl font-bold text-gray-900">{currentTemplate.id ? 'Edit Template' : 'New Template'}</h2>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                <X className="h-6 w-6 text-gray-400" />
                            </button>
                        </div>
                        
                        <form onSubmit={handleSave} className="overflow-y-auto p-8 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Language</label>
                                    <select 
                                        value={currentTemplate.language}
                                        onChange={(e) => setCurrentTemplate({...currentTemplate, language: e.target.value})}
                                        className="w-full px-5 py-3 border-2 border-gray-100 rounded-2xl focus:border-indigo-500 focus:ring-0 transition-all outline-none bg-gray-50/50"
                                    >
                                        <option value="en">English (EN)</option>
                                        <option value="fr">French (FR)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">System Type (Optional)</label>
                                    <select 
                                        value={currentTemplate.type || ''}
                                        onChange={(e) => setCurrentTemplate({...currentTemplate, type: e.target.value})}
                                        className="w-full px-5 py-3 border-2 border-gray-100 rounded-2xl focus:border-indigo-500 focus:ring-0 transition-all outline-none bg-gray-50/50"
                                    >
                                        <option value="">None</option>
                                        <option value="INVITATION">INVITATION</option>
                                    </select>
                                    <p className="mt-1 text-[10px] text-gray-400 italic px-1">* Set to "INVITATION" for system-automated emails.</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Template Name</label>
                                    <input 
                                        type="text" 
                                        required
                                        value={currentTemplate.name}
                                        onChange={(e) => setCurrentTemplate({...currentTemplate, name: e.target.value})}
                                        className="w-full px-5 py-3 border-2 border-gray-100 rounded-2xl focus:border-indigo-500 focus:ring-0 transition-all outline-none bg-gray-50/50"
                                        placeholder="e.g. Rent Reminder"
                                    />
                                </div>
                                 <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="text-sm font-bold text-gray-700">Subject Line</label>
                                        <div className="flex gap-1">
                                            {PLACEHOLDERS.slice(0, 3).map(p => (
                                                <button 
                                                    key={p.code}
                                                    type="button" 
                                                    onClick={() => insertPlaceholder('subject', p.code)}
                                                    className="px-2 py-0.5 text-[9px] font-black uppercase tracking-tighter bg-indigo-50 text-indigo-600 rounded-md hover:bg-indigo-100 transition-colors"
                                                >
                                                    +{p.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <input 
                                        id="editor-subject"
                                        type="text" 
                                        required
                                        value={currentTemplate.subject}
                                        onChange={(e) => setCurrentTemplate({...currentTemplate, subject: e.target.value})}
                                        className="w-full px-5 py-3 border-2 border-gray-100 rounded-2xl focus:border-indigo-500 focus:ring-0 transition-all outline-none bg-gray-50/50"
                                        placeholder="Dynamic fields like {{name}} supported"
                                    />
                                </div>
                            </div>

                            <div className="flex flex-col h-[500px]">
                                <div className="flex justify-between items-center bg-gray-100 px-4 py-1.5 rounded-t-xl border-x-2 border-t-2 border-gray-100">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                                        Email Body Content
                                    </label>
                                    <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                                        <span className="text-[9px] text-gray-400 font-bold uppercase italic mr-1">Placeholders:</span>
                                        {PLACEHOLDERS.map(p => (
                                            <button 
                                                key={p.code}
                                                type="button" 
                                                onClick={() => setCurrentTemplate({...currentTemplate, body: currentTemplate.body + p.code})}
                                                className="px-2.5 py-1 text-[10px] font-black uppercase bg-white border border-gray-200 text-indigo-600 rounded-lg hover:border-indigo-500 hover:shadow-sm transition-all whitespace-nowrap active:scale-95"
                                            >
                                                {p.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex-1 rounded-b-2xl overflow-hidden border-2 border-gray-100">
                                    <ReactQuill 
                                        theme="snow" 
                                        value={currentTemplate.body}
                                        onChange={(content) => setCurrentTemplate({...currentTemplate, body: content})}
                                        className="h-full bg-white"
                                        modules={{
                                            toolbar: [
                                                [{ 'header': [1, 2, false] }],
                                                ['bold', 'italic', 'underline', 'strike', 'blockquote'],
                                                [{'list': 'ordered'}, {'list': 'bullet'}],
                                                ['link'],
                                                ['clean']
                                            ],
                                        }}
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
                                <button 
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-6 py-3 border-2 border-gray-100 text-gray-600 font-bold rounded-2xl hover:bg-gray-50 transition-all"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl transition-all shadow-lg hover:shadow-indigo-100"
                                >
                                    {currentTemplate.id ? 'Update Template' : 'Create Template'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
        </MainLayout>
    );
};

export default EmailTemplates;
