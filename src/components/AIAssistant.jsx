import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Minus, Send, Bot, User, Table, Download, Loader2 } from 'lucide-react';
import api from '../api/client';
import clsx from 'clsx';

export const AIAssistant = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState(() => {
        const saved = sessionStorage.getItem('pms_ai_messages');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.error("Failed to parse saved AI messages");
            }
        }
        return [
            { role: 'ai', content: 'Hello! I am your PMS AI Assistant. You can ask me anything about properties, tenants, leases, or maintenance.', isTable: false }
        ];
    });
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);

    // Scroll to bottom whenever messages change
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
        // Save to session storage so history survives route changes
        sessionStorage.setItem('pms_ai_messages', JSON.stringify(messages));
    }, [messages, isOpen]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMessage = { role: 'user', content: input, isTable: false };
        setMessages((prev) => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const selectedPropertyId = localStorage.getItem('selectedProperty') || 'masteko';
            
            // Format history for the AI, keeping the last 10 messages to maintain context
            const chatHistory = messages
                .filter(m => m.role === 'user' || m.role === 'ai')
                .map(m => ({
                    role: m.role === 'ai' ? 'assistant' : 'user', // OpenAI uses 'assistant' instead of 'ai'
                    content: m.isTable ? 'I provided a table of data here.' : m.content
                }))
                .slice(-10);

            const response = await api.post('/api/ai/query', {
                question: userMessage.content,
                history: chatHistory,
                selectedPropertyId: selectedPropertyId
            });

            if (response.data.success) {
                if (response.data.isDocumentAnswer) {
                    setMessages((prev) => [...prev, {
                        role: 'ai',
                        content: response.data.data[0].answer,
                        isTable: false
                    }]);
                } else if (response.data.data && Array.isArray(response.data.data) && response.data.data.length > 0) {
                    const rows = response.data.data;
                    const keys = Object.keys(rows[0]);
                    
                    // If the result is just a single number or string (like a COUNT), render as text instead of a table
                    if (rows.length === 1 && keys.length === 1) {
                        let singleValue = rows[0][keys[0]];
                        
                        // Format large floating point numbers nicely (e.g. 591772.3799999 -> 591,772.38)
                        if (!isNaN(singleValue) && singleValue !== null && singleValue !== '') {
                            const num = Number(singleValue);
                            // If it's a decimal, fix to 2 places. If integer, just add commas.
                            singleValue = !Number.isInteger(num) 
                                ? num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                : num.toLocaleString();
                        }

                        setMessages((prev) => [...prev, {
                            role: 'ai',
                            content: `The answer is: **${singleValue}**`,
                            isTable: false
                        }]);
                    } else {
                        setMessages((prev) => [...prev, {
                            role: 'ai',
                            content: 'Here is the data you requested:',
                            isTable: true,
                            tableData: rows
                        }]);
                    }
                } else {
                    setMessages((prev) => [...prev, {
                        role: 'ai',
                        content: 'The query executed successfully, but no data was found.',
                        isTable: false
                    }]);
                }
            } else {
                setMessages((prev) => [...prev, {
                    role: 'ai',
                    content: 'Sorry, I could not process your request.',
                    isTable: false
                }]);
            }
        } catch (error) {
            console.error('AI Query Error:', error);
            setMessages((prev) => [...prev, {
                role: 'ai',
                content: error.response?.data?.error || 'An error occurred while reaching the AI.',
                isTable: false
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const downloadCSV = (data) => {
        if (!data || data.length === 0) return;
        const headers = Object.keys(data[0]).join(',');
        const rows = data.map(obj => 
            Object.values(obj).map(val => 
                typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val
            ).join(',')
        ).join('\n');
        
        const csvContent = "data:text/csv;charset=utf-8," + headers + "\n" + rows;
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "ai_export.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <>
            {/* Topbar Icon Button */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="relative p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all"
                    title="Ask AI Assistant"
                >
                    <Bot size={20} />
                </button>
            )}

            {/* Chat Window */}
            {isOpen && (
                <div className="fixed bottom-6 right-6 w-[400px] max-w-[calc(100vw-3rem)] h-[600px] max-h-[calc(100vh-6rem)] bg-white rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden border border-slate-200">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-primary-600 to-primary-800 p-4 flex items-center justify-between text-white shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                                <Bot size={24} />
                            </div>
                            <div>
                                <h3 className="font-bold text-base leading-tight">PMS AI Assistant</h3>
                                <p className="text-primary-100 text-xs">Always here to help</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            <button 
                                onClick={() => setIsOpen(false)}
                                title="Minimize"
                                className="p-2 hover:bg-white/20 rounded-full transition-colors"
                            >
                                <Minus size={20} />
                            </button>
                            <button 
                                onClick={() => {
                                    setIsOpen(false);
                                    setMessages([{ role: 'ai', content: 'Hello! I am your PMS AI Assistant. You can ask me anything about properties, tenants, leases, or maintenance.', isTable: false }]);
                                    sessionStorage.removeItem('pms_ai_messages');
                                }}
                                title="Close and clear chat"
                                className="p-2 hover:bg-white/20 rounded-full transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Chat Area */}
                    <div className="flex-1 overflow-y-auto p-4 bg-slate-50 flex flex-col gap-4">
                        {messages.map((msg, idx) => (
                            <div key={idx} className={clsx("flex gap-3", msg.role === 'user' ? "flex-row-reverse" : "flex-row")}>
                                <div className={clsx("w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm", msg.role === 'user' ? "bg-slate-200 text-slate-600" : "bg-primary-100 text-primary-600")}>
                                    {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                                </div>
                                <div className={clsx("flex flex-col gap-1 max-w-[80%]", msg.role === 'user' ? "items-end" : "items-start")}>
                                    <div className={clsx(
                                        "px-4 py-2.5 rounded-2xl text-sm shadow-sm",
                                        msg.role === 'user' 
                                            ? "bg-primary-600 text-white rounded-tr-sm" 
                                            : "bg-white border border-slate-200 text-slate-700 rounded-tl-sm"
                                    )}>
                                        {msg.content}
                                    </div>
                                    
                                    {/* Render Table if response has data */}
                                    {msg.isTable && msg.tableData && (
                                        <div className="w-full mt-2 bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                                            <div className="flex items-center justify-between p-2 border-b border-slate-100 bg-slate-50">
                                                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                                                    <Table size={14} /> Data Result
                                                </div>
                                                <button 
                                                    onClick={() => downloadCSV(msg.tableData)}
                                                    className="flex items-center gap-1.5 text-xs text-primary-600 hover:text-primary-700 font-medium px-2 py-1 hover:bg-primary-50 rounded transition-colors"
                                                >
                                                    <Download size={14} /> Export CSV
                                                </button>
                                            </div>
                                            <div className="overflow-auto max-w-full max-h-[300px] scrollbar-thin scrollbar-thumb-slate-300">
                                                <table className="w-full text-left text-xs text-slate-600">
                                                    <thead className="bg-slate-50 border-b border-slate-200">
                                                        <tr>
                                                            {Object.keys(msg.tableData[0]).map((key) => (
                                                                <th key={key} className="px-3 py-2 font-semibold capitalize whitespace-nowrap">{key}</th>
                                                            ))}
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100">
                                                        {msg.tableData.map((row, i) => (
                                                            <tr key={i} className="hover:bg-slate-50 transition-colors">
                                                                {Object.values(row).map((val, j) => (
                                                                    <td key={j} className="px-3 py-2 max-w-[150px] truncate" title={String(val)}>
                                                                        {String(val)}
                                                                    </td>
                                                                ))}
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex gap-3 flex-row">
                                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-primary-100 text-primary-600 shadow-sm">
                                    <Bot size={16} />
                                </div>
                                <div className="px-4 py-3 bg-white border border-slate-200 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-2">
                                    <Loader2 size={16} className="animate-spin text-primary-600" />
                                    <span className="text-xs text-slate-500 font-medium">Thinking...</span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <form onSubmit={handleSend} className="p-3 bg-white border-t border-slate-200 flex gap-2 items-end shrink-0">
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSend(e);
                                }
                            }}
                            placeholder="Ask a question..."
                            className="flex-1 max-h-32 min-h-[44px] resize-none bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all"
                            rows={1}
                        />
                        <button
                            type="submit"
                            disabled={!input.trim() || isLoading}
                            className="w-11 h-11 shrink-0 bg-primary-600 hover:bg-primary-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl flex items-center justify-center transition-colors shadow-sm"
                        >
                            <Send size={18} className={input.trim() ? "translate-x-0.5" : ""} />
                        </button>
                    </form>
                </div>
            )}
        </>
    );
};
