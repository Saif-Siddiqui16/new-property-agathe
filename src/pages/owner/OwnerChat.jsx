import React, { useState, useEffect, useRef } from 'react';
import { OwnerLayout } from '../../layouts/owner/OwnerLayout';
import { communicationService } from '../../services/communicationService';
import { Send, RefreshCw, User, MessageSquare } from 'lucide-react';

export const OwnerChat = () => {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [adminUser, setAdminUser] = useState(null);
    const [currentOwnerId, setCurrentOwnerId] = useState(null);
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef(null);
    const intervalRef = useRef(null);

    useEffect(() => {
        const id = localStorage.getItem('ownerId');
        if (id) setCurrentOwnerId(parseInt(id));
        fetchAdmins();
        return () => clearInterval(intervalRef.current);
    }, []);

    const fetchAdmins = async () => {
        try {
            // "Conversations" for non-admin returns Admin list
            const admins = await communicationService.getConversations();
            if (admins.length > 0) {
                setAdminUser(admins[0]); // Auto-select first admin
            }
        } catch (error) {
            console.error(error);
        }
    };

    // Poll for messages once admin is identified
    useEffect(() => {
        if (adminUser) {
            fetchHistory(); // Initial fetch
            intervalRef.current = setInterval(fetchHistory, 3000);
        }
    }, [adminUser]);

    const fetchHistory = async () => {
        if (!adminUser) return;
        try {
            const history = await communicationService.getHistory(adminUser.id);
            setMessages(history);
        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !adminUser) return;

        setSending(true);
        try {
            await communicationService.sendMessage(adminUser.id, newMessage);
            setNewMessage('');
            fetchHistory();
        } catch (error) {
            console.error(error);
        } finally {
            setSending(false);
        }
    };

    return (
        <OwnerLayout title="Messages">
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden h-[calc(100vh-160px)] md:h-[calc(100vh-140px)] flex flex-col">

                {/* Header */}
                <div className="p-4 border-b border-slate-50 bg-slate-50/50 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600">
                        <MessageSquare size={20} />
                    </div>
                    <div>
                        <h2 className="font-bold text-slate-800">Priority Support</h2>
                        <p className="text-xs font-medium text-slate-500">
                            {adminUser ? `Connected with ${adminUser.name}` : 'Connecting...'}
                        </p>
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-white relative">
                    {!adminUser && (
                        <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm">
                            Connecting to support...
                        </div>
                    )}

                    {messages.map((msg, index) => {
                        const isMe = msg.senderId === currentOwnerId;
                        return (
                            <div key={index} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[90%] md:max-w-[80%] px-4 py-2.5 md:px-5 md:py-3 rounded-2xl text-sm font-medium shadow-sm ${isMe
                                        ? 'bg-indigo-600 text-white rounded-br-none'
                                        : 'bg-slate-100 text-slate-700 rounded-bl-none'
                                    }`}>
                                    {msg.content}
                                    <div className={`text-[10px] mt-1 text-right opacity-70`}>
                                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="p-4 bg-slate-50 border-t border-slate-100">
                    <form onSubmit={handleSendMessage} className="flex gap-3">
                        <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Type a message..."
                            className="flex-1 h-12 px-4 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 outline-none transition-all font-medium text-slate-700"
                        />
                        <button
                            type="submit"
                            disabled={sending || !newMessage}
                            className="h-12 w-12 bg-indigo-600 text-white rounded-xl flex items-center justify-center hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {sending ? <RefreshCw className="animate-spin" size={20} /> : <Send size={20} />}
                        </button>
                    </form>
                </div>
            </div>
        </OwnerLayout>
    );
};
