import React, { useState, useEffect, useRef } from 'react';
import api from '../api/client';
import { Search, Send, User, MessageSquare, Clock, Filter, CheckCheck, RefreshCw, ChevronLeft, LayoutPanelLeft } from 'lucide-react';
import { MainLayout } from '../layouts/MainLayout';
import { hasPermission } from '../utils/permissions';

const SMSInbox = () => {
    const [__forceUpdate, __setForceUpdate] = useState(0);
    useEffect(() => {
        const handleUpdate = () => __setForceUpdate(p => p + 1);
        window.addEventListener('permissionsUpdated', handleUpdate);
        return () => window.removeEventListener('permissionsUpdated', handleUpdate);
    }, []);

    const [conversations, setConversations] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [templates, setTemplates] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [chatLoading, setChatLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [showSidebar, setShowSidebar] = useState(true);
    const [activeTab, setActiveTab] = useState('ALL'); // ALL, TENANT, COWORKER, OWNER, RESIDENT
    
    const messagesEndRef = useRef(null);
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

    useEffect(() => {
        fetchConversations();
        fetchTemplates();
        const interval = setInterval(fetchConversations, 10000); // Poll for new threads
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (selectedUser) {
            fetchMessages(selectedUser.id);
            const interval = setInterval(() => fetchMessages(selectedUser.id, true), 5000); // Poll for new messages
            return () => clearInterval(interval);
        }
    }, [selectedUser]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const fetchConversations = async () => {
        try {
            const response = await api.get('/api/communication/conversations');
            // Sort by most recent message
            const sorted = (response.data || []).sort((a, b) => {
                const dateA = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt) : new Date(0);
                const dateB = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt) : new Date(0);
                return dateB - dateA;
            });
            setConversations(sorted);
        } catch (error) {
            console.error('Error fetching conversations:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchMessages = async (userId, silent = false) => {
        if (!silent) setChatLoading(true);
        try {
            const response = await api.get(`/api/communication/history/${userId}`);
            setMessages(response.data);
            
            // If there are unread messages, mark as read
            if (response.data.some(m => m.direction === 'INBOUND' && !m.isReadByAdmin)) {
                await api.post('/api/communication/mark-read', { senderId: typeof userId === 'string' ? parseInt(userId.replace('resident_', '')) : userId });
                fetchConversations(); // Update badge count in list
            }
        } catch (error) {
            console.error('Error fetching messages:', error);
        } finally {
            if (!silent) setChatLoading(false);
        }
    };

    const fetchTemplates = async () => {
        try {
            const response = await api.get('/api/communication/templates');
            setTemplates(response.data);
        } catch (e) { console.error(e); }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedUser) return;

        setSending(true);
        try {
            await api.post('/api/communication/send', {
                receiverId: selectedUser.id,
                content: newMessage
            });
            setNewMessage('');
            fetchMessages(selectedUser.id, true);
            fetchConversations();
        } catch (error) {
            console.error('Error sending message:', error);
        } finally {
            setSending(false);
        }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const applyTemplate = (template) => {
        // Basic placeholder replacement for preview (backend does the real thing)
        let content = template.content;
        content = content.replace(/\{\{first_name\}\}/g, selectedUser.name?.split(' ')[0] || 'Tenant');
        setNewMessage(content);
    };

    const filteredConversations = conversations.filter(c => {
        const matchesSearch = c.name?.toLowerCase().includes(searchTerm.toLowerCase()) || c.phone?.includes(searchTerm);
        if (!matchesSearch) return false;
        
        if (activeTab === 'ALL') return true;
        if (activeTab === 'TENANT') return c.role === 'TENANT';
        if (activeTab === 'RESIDENT') return c.role === 'RESIDENT';
        if (activeTab === 'COWORKER') return c.role === 'COWORKER';
        if (activeTab === 'OWNER') return c.role === 'OWNER';
        return true;
    });

    return (
        <MainLayout title="SMS Inbox">
            <div className="flex flex-col lg:flex-row h-[calc(100vh-120px)] bg-slate-50 overflow-hidden">
                
                {/* Conversations Sidebar */}
                <div className={`${!showSidebar && selectedUser ? 'hidden lg:flex' : 'flex'} w-full lg:w-96 flex-col bg-white border-r border-slate-200 z-30`}>
                    <div className="p-6 border-b border-slate-100 space-y-4">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Inbox</h2>
                            <button onClick={fetchConversations} className="p-2 hover:bg-slate-100 rounded-full transition-all active:rotate-180 duration-500">
                                <RefreshCw className="h-5 w-5 text-slate-400" />
                            </button>
                        </div>
                        <div className="relative">
                            <Search className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                            <input 
                                type="text"
                                placeholder="Search conversations..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                            />
                        </div>

                        {/* TAB FILTERS */}
                        <div className="flex gap-1 bg-slate-50 p-1 rounded-xl border border-slate-100 overflow-x-auto scrollbar-hide">
                            {[
                                { id: 'ALL', label: 'All' },
                                { id: 'TENANT', label: 'Tenants' },
                                { id: 'RESIDENT', label: 'Residents' },
                                { id: 'COWORKER', label: 'Team' },
                                { id: 'OWNER', label: 'Owners' }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg flex-1 whitespace-nowrap transition-all ${
                                        activeTab === tab.id 
                                        ? 'bg-white text-indigo-600 shadow-sm border border-slate-100' 
                                        : 'text-slate-400 hover:text-slate-600'
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {loading ? (
                            Array(5).fill(0).map((_, i) => (
                                <div key={i} className="p-6 border-b border-slate-50 animate-pulse flex gap-4">
                                    <div className="w-12 h-12 bg-slate-100 rounded-2xl"></div>
                                    <div className="flex-1 space-y-2">
                                        <div className="h-4 bg-slate-100 rounded w-2/3"></div>
                                        <div className="h-3 bg-slate-50 rounded w-full"></div>
                                    </div>
                                </div>
                            ))
                        ) : filteredConversations.length === 0 ? (
                            <div className="p-12 text-center text-slate-400">
                                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-10" />
                                <p className="text-sm font-bold uppercase tracking-widest">No {activeTab.toLowerCase()} found</p>
                            </div>
                        ) : (
                            filteredConversations.map(conv => {
                                const isSelected = selectedUser?.id === conv.id;
                                const unread = conv.unreadCount > 0;
                                return (
                                    <div 
                                        key={conv.id}
                                        onClick={() => {
                                            setSelectedUser(conv);
                                            setShowSidebar(false);
                                        }}
                                        className={`p-5 flex items-center gap-4 cursor-pointer border-b border-slate-50 transition-all ${isSelected ? 'bg-indigo-50/50 border-l-4 border-l-indigo-600' : 'hover:bg-slate-50 border-l-4 border-l-transparent'}`}
                                    >
                                        <div className="relative">
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg ${unread ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-slate-100 text-slate-500'}`}>
                                                {conv.name?.charAt(0) || 'T'}
                                            </div>
                                            {unread && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 border-2 border-white rounded-full"></span>}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start mb-0.5">
                                                <div className="flex items-center gap-2 truncate">
                                                    <h4 className={`text-sm font-bold truncate ${unread ? 'text-indigo-900' : 'text-slate-700'}`}>{conv.name}</h4>
                                                    <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md ${
                                                        conv.role === 'COWORKER' ? 'bg-emerald-100 text-emerald-600' :
                                                        conv.role === 'OWNER' ? 'bg-amber-100 text-amber-600' :
                                                        conv.role === 'RESIDENT' ? 'bg-purple-100 text-purple-600' :
                                                        'bg-gray-100 text-gray-500'
                                                    }`}>
                                                        {conv.role === 'COWORKER' ? 'TEAM' : conv.role}
                                                    </span>
                                                </div>
                                                <span className="text-[10px] text-slate-400 font-bold whitespace-nowrap">
                                                    {conv.lastMessage ? new Date(conv.lastMessage.createdAt).toLocaleDateString([], {hour: '2-digit', minute:'2-digit'}) : ''}
                                                </span>
                                            </div>
                                            <p className={`text-xs truncate ${unread ? 'text-indigo-600 font-bold' : 'text-slate-400'}`}>
                                                {conv.lastMessage?.content || 'No messages yet'}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Chat Window */}
                <div className={`${!selectedUser ? 'hidden lg:flex' : 'flex'} flex-1 min-w-0 flex-col bg-white relative`}>
                    {selectedUser ? (
                        <>
                            {/* Chat Header */}
                            <div className="h-20 px-8 border-b border-slate-100 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-20">
                                <div className="flex items-center gap-4">
                                    <button onClick={() => setShowSidebar(true)} className="lg:hidden p-2 hover:bg-slate-100 rounded-xl transition-colors">
                                        <ChevronLeft className="h-6 w-6 text-slate-600" />
                                    </button>
                                    <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">
                                        {selectedUser.name?.charAt(0)}
                                    </div>
                                    <div>
                                        <h3 className="font-black text-slate-800 uppercase tracking-tight">{selectedUser.name}</h3>
                                        <p className="text-[10px] text-emerald-500 font-black uppercase tracking-widest flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                                            {selectedUser.role} • {selectedUser.phone || 'No Phone'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    {/* Action buttons could go here */}
                                </div>
                            </div>

                            {/* Messages Area */}
                            <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-slate-50/30 custom-scrollbar">
                                {chatLoading ? (
                                    <div className="flex flex-col items-center justify-center h-full text-slate-300">
                                        <RefreshCw className="h-8 w-8 animate-spin mb-2" />
                                        <p className="text-xs font-bold uppercase tracking-widest">Loading messages...</p>
                                    </div>
                                ) : messages.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-slate-300 opacity-20">
                                        <MessageSquare className="h-24 w-24 mb-4" />
                                        <p className="text-xl font-black uppercase tracking-widest">Start of conversation</p>
                                    </div>
                                ) : (
                                    messages.map((msg, idx) => {
                                        const isOutbound = msg.direction === 'OUTBOUND';
                                        return (
                                            <div key={msg.id || idx} className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}>
                                                <div className={`max-w-[85%] md:max-w-[75%] lg:max-w-xl xl:max-w-2xl group`}>
                                                    <div className={`relative px-6 py-4 rounded-3xl text-sm leading-relaxed shadow-sm transition-all hover:shadow-md break-words whitespace-pre-wrap ${isOutbound ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700 border border-slate-100'}`}>
                                                        {msg.content}
                                                        <div className={`mt-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-tighter ${isOutbound ? 'text-indigo-200' : 'text-slate-400'}`}>
                                                            <span>{new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                                            {isOutbound && (
                                                                <span className="flex items-center gap-0.5">
                                                                     {msg.smsStatus === 'delivered' ? <CheckCheck className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                                                                     {msg.smsStatus}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Composer Area */}
                            <div className="p-6 bg-white border-t border-slate-100 space-y-4">
                                {/* Templates Bar */}
                                {templates.length > 0 && (
                                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                                        {templates.slice(0, 5).map(t => (
                                            <button 
                                                key={t.id}
                                                onClick={() => applyTemplate(t)}
                                                className="px-4 py-2 bg-slate-50 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 text-[10px] font-bold rounded-xl whitespace-nowrap border border-slate-100 transition-all active:scale-95"
                                            >
                                                📄 {t.name}
                                            </button>
                                        ))}
                                    </div>
                                )}
                                
                                <form onSubmit={handleSendMessage} className="flex gap-4">
                                    <div className="flex-1 relative">
                                        <textarea 
                                            value={newMessage}
                                            onChange={(e) => setNewMessage(e.target.value)}
                                            placeholder={hasPermission('Inbox', 'add') ? "Type a message or select a template..." : "You do not have permission to send messages."}
                                            disabled={!hasPermission('Inbox', 'add')}
                                            rows="1"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    handleSendMessage(e);
                                                }
                                            }}
                                            className={`w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-[2rem] text-sm focus:border-indigo-600 focus:ring-0 transition-all outline-none resize-none max-h-32 ${!hasPermission('Inbox', 'add') ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        />
                                    </div>
                                    {hasPermission('Inbox', 'add') && (
                                        <button 
                                            type="submit" 
                                            disabled={sending || !newMessage.trim()}
                                            className="w-14 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full flex items-center justify-center transition-all shadow-xl shadow-indigo-100 active:scale-90 disabled:opacity-50 disabled:shadow-none"
                                        >
                                            <Send className="h-6 w-6" />
                                        </button>
                                    )}
                                </form>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-300">
                             <div className="w-32 h-32 bg-slate-50 rounded-full flex items-center justify-center mb-8 relative">
                                <MessageSquare className="h-16 w-16 opacity-10" />
                                <div className="absolute inset-0 border-4 border-slate-200 border-dashed rounded-full animate-spin-slow"></div>
                             </div>
                             <h3 className="text-2xl font-black uppercase tracking-widest text-slate-200">Select a Conversation</h3>
                             <p className="text-xs font-bold text-slate-400 mt-2">Pick a tenant from the left to start messaging</p>
                        </div>
                    )}
                </div>
            </div>
        </MainLayout>
    );
};

export default SMSInbox;
