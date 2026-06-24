import React, { useState, useEffect, useRef } from 'react';
import { MainLayout } from '../layouts/MainLayout';
import { communicationService } from '../services/communicationService';
import { Search, Send, User, MoreVertical, RefreshCw, Filter, Clock, MessageCircle, ArrowLeft } from 'lucide-react';
import api from '../api/client';
import { hasPermission } from '../utils/permissions';

const Communication = () => {
  const [__forceUpdate, __setForceUpdate] = useState(0);
  useEffect(() => {
    const handleUpdate = () => __setForceUpdate(p => p + 1);
    window.addEventListener('permissionsUpdated', handleUpdate);
    return () => window.removeEventListener('permissionsUpdated', handleUpdate);
  }, []);

  const [currentUser, setCurrentUser] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'OWNER' | 'TENANT' | 'AUDIT'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkRecipient, setBulkRecipient] = useState('all tenants');
  const [bulkMessage, setBulkMessage] = useState('');
  const [selectedRecipients, setSelectedRecipients] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [selectedBuilding, setSelectedBuilding] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedLogs, setSelectedLogs] = useState([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [showSidebar, setShowSidebar] = useState(true);

  const messagesEndRef = useRef(null);
  const chatIntervalRef = useRef(null);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      setCurrentUser(JSON.parse(userStr));
    }
    fetchConversations();

    // Fetch buildings
    const loadBuildings = async () => {
      try {
        const res = await api.get('/api/admin/properties');
        setBuildings(res.data?.data || res.data || []);
      } catch (e) { console.error(e); }
    };
    loadBuildings();
  }, []);

  const fetchConversations = async () => {
    try {
      setRefreshing(true);
      const users = await communicationService.getConversations();
      setConversations(users || []);
    } catch (error) {
      console.error(error);
    } finally {
      setRefreshing(false);
    }
  };

  const fetchAuditLogs = async (page = 1) => {
    setLoading(true);
    try {
      const res = await api.get(`/api/admin/communication?page=${page}&limit=20`);
      setAuditLogs(res.data.logs || []);
      setTotalPages(res.data.pagination?.totalPages || 1);
      setTotalLogs(res.data.pagination?.total || 0);
      setCurrentPage(page);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (activeTab === 'AUDIT') {
      fetchAuditLogs();
      setSelectedUser(null);
    }
  }, [activeTab]);

  // Auto-refresh conversations every 10 seconds
  useEffect(() => {
    const conversationInterval = setInterval(() => {
      fetchConversations();
    }, 10000); // 10 seconds

    return () => clearInterval(conversationInterval);
  }, []);

  // Auto-refresh messages when a user is selected (every 5 seconds)
  useEffect(() => {
    // Clear any existing interval
    if (chatIntervalRef.current) {
      clearInterval(chatIntervalRef.current);
    }

    // If a user is selected, start polling for new messages
    if (selectedUser && activeTab !== 'AUDIT') {
      chatIntervalRef.current = setInterval(() => {
        fetchHistory(selectedUser.id, true); // Silent refresh (no loading spinner)
      }, 5000); // 5 seconds
    }

    // Cleanup on unmount or when selectedUser changes
    return () => {
      if (chatIntervalRef.current) {
        clearInterval(chatIntervalRef.current);
      }
    };
  }, [selectedUser, activeTab]);

  const getFilteredConversations = () => {
    if (activeTab === 'AUDIT') return [];
    let filtered = conversations;
    if (activeTab !== 'ALL') {
      if (activeTab === 'RESIDENT') {
        filtered = filtered.filter(u => u.role === 'RESIDENT' || u.isResident);
      } else {
        filtered = filtered.filter(u => u.role === activeTab && !u.isResident);
      }
    }
    if (searchTerm) {
      filtered = filtered.filter(u =>
        u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    return filtered;
  };

  const displayedUsers = getFilteredConversations();
  const usersWithNewMessages = displayedUsers.filter(u => (u.unreadCount || 0) > 0);
  const newMessageFromNames = usersWithNewMessages.map(u => u.name || u.email || 'Someone').join(', ');

  const handleSelectUser = async (user) => {
    setSelectedUser(user);
    setNewMessage('');
    setMessages([]);
    const numericId = typeof user.id === 'string' && user.id.startsWith('resident_') ? parseInt(user.id.replace('resident_', ''), 10) : user.id;
    if (!isNaN(numericId)) {
      try {
        await communicationService.markAsRead(numericId);
        await fetchConversations();
      } catch (_) { }
    }
    await fetchHistory(user.id); // fetchHistory handles loading state internally
  };

  const fetchHistory = async (userId, silent = false) => {
    try {
      if (!silent) {
        // Only show loading spinner on manual refresh
        setLoading(true);
      }
      const history = await communicationService.getHistory(userId);
      setMessages(history);
      scrollToBottom();
    } catch (error) {
      console.error(error);
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUser) return;
    setSending(true);
    try {
      await communicationService.sendMessage(selectedUser.id, newMessage);
      setNewMessage('');
      fetchHistory(selectedUser.id);
    } catch (error) { console.error(error); }
    finally { setSending(false); }
  };

  const handleSendBulkSMS = async () => {
    if (!bulkMessage.trim()) return;

    // Determine recipient based on mode
    let recipient = bulkRecipient;
    if (bulkRecipient === 'custom' && selectedRecipients.length > 0) {
      recipient = selectedRecipients; // Send array of IDs
    } else if (bulkRecipient === 'custom') {
      alert('Please select at least one recipient');
      return;
    }

    setSending(true);
    try {
      await api.post('/api/admin/communication', {
        recipient: recipient,
        subject: 'Bulk SMS',
        message: bulkMessage,
        type: 'SMS',
        buildingId: selectedBuilding || undefined
      });
      alert(`Bulk SMS sent successfully!`);
      setBulkMessage('');
      setSelectedRecipients([]);
      setShowBulkModal(false);
    } catch (error) {
      console.error('Bulk SMS error:', error);
      alert('Failed to send bulk SMS. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  return (
    <MainLayout title="SMS Communications">
      <div className="flex flex-col md:flex-row h-[calc(100vh-140px)] bg-white rounded-xl shadow-[0_10px_25px_rgba(0,0,0,0.06)] overflow-hidden">

        {/* LEFT: SIDEBAR */}
        <div className={`${selectedUser && !showSidebar ? 'hidden md:flex' : 'flex'} w-full md:w-[340px] border-r border-slate-100 flex-col bg-slate-50/50`}>
          <div className="p-4 bg-white border-b border-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-slate-800">History</h2>
              <div className="flex items-center gap-2">
                {hasPermission('Communication', 'add') && (
                  <button
                    onClick={() => setShowBulkModal(true)}
                    className="px-3 py-1.5 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    📱 Bulk SMS
                  </button>
                )}
                <button onClick={fetchConversations} className={`p-2 rounded-full hover:bg-slate-100 ${refreshing ? 'animate-spin' : ''}`}>
                  <RefreshCw size={16} />
                </button>
              </div>
            </div>

            <div className="flex p-1 bg-slate-100 rounded-lg overflow-x-auto scrollbar-hide">
              {['ALL', 'TENANT', 'OWNER', 'RESIDENT', 'AUDIT'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 min-w-[60px] py-1.5 text-[10px] font-black uppercase tracking-widest rounded-md transition-all ${activeTab === tab ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                >
                  {tab === 'AUDIT' ? 'Audit Trail' : tab}
                </button>
              ))}
            </div>

            {activeTab !== 'AUDIT' && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Search contact..."
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            )}

            {activeTab !== 'AUDIT' && usersWithNewMessages.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200">
                <MessageCircle className="flex-shrink-0 text-amber-600" size={18} />
                <p className="text-xs font-semibold text-amber-800">
                  New message{usersWithNewMessages.length > 1 ? 's' : ''} from: <span className="font-bold">{newMessageFromNames}</span>
                </p>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {activeTab === 'AUDIT' ? (
              <div className="p-4 text-center text-slate-400 space-y-2 mt-10 px-8">
                <Clock size={32} className="mx-auto opacity-20" />
                <p className="text-sm font-bold">Audit Trail Mode</p>
                <p className="text-[11px]">Monitoring all outgoing automated system notifications.</p>
              </div>
            ) : displayedUsers.map(user => {
              const hasNew = (user.unreadCount || 0) > 0;
              return (
                <div
                  key={user.id}
                  onClick={() => {
                    handleSelectUser(user);
                    setShowSidebar(false); // Hide sidebar on mobile when user is selected
                  }}
                  className={`p-4 flex items-center gap-3 cursor-pointer border-b border-slate-50 hover:bg-white group ${selectedUser?.id === user.id ? 'bg-white border-l-4 border-l-indigo-600' : 'border-l-4 border-l-transparent'} ${hasNew ? 'bg-amber-50/70' : ''}`}
                >
                  <div className="relative flex-shrink-0">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${hasNew ? 'bg-amber-100 text-amber-700 ring-2 ring-amber-300' : 'bg-indigo-50 text-indigo-600'}`}>
                      {user.name?.charAt(0) || 'U'}
                    </div>
                    {hasNew && (
                      <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-black text-white px-1">
                        {user.unreadCount > 99 ? '99+' : user.unreadCount}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className={`text-sm font-semibold truncate ${hasNew ? 'text-amber-900' : 'text-slate-700'}`}>
                      {user.name || user.email}
                      {hasNew && <span className="ml-1 text-[10px] font-black text-amber-600 uppercase">(new)</span>}
                    </h4>
                    <p className="text-[10px] text-slate-400 uppercase font-black">{user.role}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT: CONTENT */}
        <div className={`${!selectedUser && !showSidebar ? 'hidden md:flex' : 'flex'} flex-1 flex-col bg-slate-50 relative overflow-hidden`}>
          {activeTab === 'AUDIT' ? (
            <div className="flex-1 overflow-y-auto p-8">
              <div className="max-w-5xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-black text-slate-800 tracking-tight">Outgoing Communication Audit</h3>
                  {selectedLogs.length > 0 && hasPermission('Communication', 'delete') && (
                    <button
                      onClick={async () => {
                        if (confirm(`Delete ${selectedLogs.length} selected logs?`)) {
                          try {
                            await api.post('/api/admin/communication/bulk-delete', { ids: selectedLogs });
                            setSelectedLogs([]);
                            fetchAuditLogs(currentPage);
                          } catch (e) {
                            alert('Failed to delete logs');
                          }
                        }
                      }}
                      className="px-4 py-2 bg-red-600 text-white text-sm font-bold rounded-lg hover:bg-red-700"
                    >
                      Delete Selected ({selectedLogs.length})
                    </button>
                  )}
                </div>
                {loading ? <div className="p-20 text-center"><RefreshCw className="animate-spin mx-auto text-slate-200" size={48} /></div> : (
                  <>
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-100">
                          <tr>
                            <th className="p-4 w-12">
                              <input
                                type="checkbox"
                                checked={selectedLogs.length === auditLogs.length && auditLogs.length > 0}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedLogs(auditLogs.map(log => log.id));
                                  } else {
                                    setSelectedLogs([]);
                                  }
                                }}
                                className="w-4 h-4 text-indigo-600 rounded"
                              />
                            </th>
                            <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Time</th>
                            <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Recipient</th>
                            <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Event</th>
                            <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {auditLogs.map(log => (
                            <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="p-4">
                                <input
                                  type="checkbox"
                                  checked={selectedLogs.includes(log.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedLogs([...selectedLogs, log.id]);
                                    } else {
                                      setSelectedLogs(selectedLogs.filter(id => id !== log.id));
                                    }
                                  }}
                                  className="w-4 h-4 text-indigo-600 rounded"
                                />
                              </td>
                              <td className="p-4 text-xs font-medium text-slate-500">{log.date}</td>
                              <td className="p-4 text-sm font-bold text-slate-700">{log.recipient}</td>
                              <td className="p-4">
                                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[9px] font-black uppercase tracking-widest">
                                  {log.eventType}
                                </span>
                              </td>
                              <td className="p-4 text-right">
                                {hasPermission('Communication', 'delete') && (
                                  <button
                                    onClick={async () => {
                                      if (confirm('Delete this log?')) {
                                        try {
                                          await api.delete(`/api/admin/communication/${log.id}`);
                                          fetchAuditLogs(currentPage);
                                        } catch (e) {
                                          alert('Failed to delete log');
                                        }
                                      }
                                    }}
                                    className="px-3 py-1 bg-red-50 text-red-600 text-xs font-bold rounded hover:bg-red-100"
                                  >
                                    Delete
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination */}
                    <div className="flex items-center justify-between px-4 py-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                        Showing {auditLogs.length > 0 ? ((currentPage - 1) * 20) + 1 : 0} to {Math.min(currentPage * 20, totalLogs)} of {totalLogs} records
                      </div>

                      {totalPages > 1 && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => fetchAuditLogs(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="px-4 py-2 bg-slate-50 text-slate-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                          >
                            Previous
                          </button>

                          <div className="flex items-center gap-1">
                            {(() => {
                              const pages = [];
                              const maxShown = 5;
                              let start = Math.max(1, currentPage - 2);
                              let end = Math.min(totalPages, start + maxShown - 1);
                              if (end === totalPages) start = Math.max(1, end - maxShown + 1);
                              for (let i = start; i <= end; i++) pages.push(i);
                              return (
                                <>
                                  {start > 1 && (
                                    <>
                                      <button onClick={() => fetchAuditLogs(1)} className="w-8 h-8 rounded-lg text-xs font-black text-slate-400 hover:bg-slate-50">1</button>
                                      {start > 2 && <span className="text-slate-300 px-1 text-xs">...</span>}
                                    </>
                                  )}
                                  {pages.map(p => (
                                    <button
                                      key={p}
                                      onClick={() => fetchAuditLogs(p)}
                                      className={`w-8 h-8 rounded-lg text-xs font-black transition-all ${currentPage === p ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'text-slate-400 hover:bg-slate-50'}`}
                                    >
                                      {p}
                                    </button>
                                  ))}
                                  {end < totalPages && (
                                    <>
                                      {end < totalPages - 1 && <span className="text-slate-300 px-1 text-xs">...</span>}
                                      <button onClick={() => fetchAuditLogs(totalPages)} className="w-8 h-8 rounded-lg text-xs font-black text-slate-400 hover:bg-slate-50">{totalPages}</button>
                                    </>
                                  )}
                                </>
                              );
                            })()}
                          </div>

                          <button
                            onClick={() => fetchAuditLogs(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className="px-4 py-2 bg-slate-50 text-slate-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                          >
                            Next
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : !selectedUser ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
              <User size={64} className="opacity-10 mb-4" />
              <p className="font-bold">Select a user to chat</p>
            </div>
          ) : (
            <>
              <div className="h-[73px] px-6 bg-white border-b border-slate-100 flex items-center justify-between shadow-sm z-20">
                <div className="flex items-center gap-4">
                  {/* Mobile Back Button */}
                  <button
                    onClick={() => {
                      setSelectedUser(null);
                      setShowSidebar(true);
                    }}
                    className="md:hidden p-2 -ml-2 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <ArrowLeft size={20} className="text-slate-600" />
                  </button>

                  <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">
                    {selectedUser.name?.charAt(0) || 'U'}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">{selectedUser.name || selectedUser.email}</h3>
                    <p className="text-[10px] text-purple-600 font-black uppercase tracking-widest">📱 SMS Only</p>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {messages.map((msg, index) => {
                  const isMe = msg.senderId === currentUser?.id;

                  return (
                    <div key={msg.id || index} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] space-y-1`}>
                        <div className={`px-5 py-3 rounded-2xl text-sm ${isMe ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700 shadow-sm border border-slate-100'}`}>
                          {msg.content}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              <div className="p-4 bg-white border-t border-slate-100">
                <form onSubmit={handleSendMessage} className="flex gap-3">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={hasPermission('Communication', 'add') ? "Type a message..." : "No permission to Chat"}
                    disabled={!hasPermission('Communication', 'add')}
                    className={`flex-1 h-12 px-5 bg-slate-50 border border-slate-200 rounded-xl text-sm ${!hasPermission('Communication', 'add') ? 'opacity-50 cursor-not-allowed' : ''}`}
                  />
                  {hasPermission('Communication', 'add') && (
                    <button type="submit" disabled={sending} className="h-12 w-12 bg-indigo-600 text-white rounded-xl flex items-center justify-center">
                      <Send size={20} />
                    </button>
                  )}
                </form>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Bulk SMS Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black text-slate-800">📱 Send Bulk SMS</h3>
              <button onClick={() => {
                setShowBulkModal(false);
                setSelectedRecipients([]);
                setBulkRecipient('all tenants');
              }} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase tracking-widest mb-1.5 block">Building</label>
                <select
                  value={selectedBuilding}
                  onChange={(e) => setSelectedBuilding(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm mb-3"
                >
                  <option value="">All Buildings</option>
                  {buildings.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>

                <label className="text-xs font-bold text-slate-600 uppercase tracking-widest mb-1.5 block">Recipients</label>
                <select
                  value={bulkRecipient}
                  onChange={(e) => {
                    setBulkRecipient(e.target.value);
                    setSelectedRecipients([]);
                  }}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm"
                >
                  <option value="all tenants">All Tenants</option>
                  <option value="all residents">All Residents</option>
                  <option value="all owners">All Owners</option>
                  <option value="custom">Select Specific People</option>
                </select>
              </div>

              {/* Custom Selection Mode */}
              {bulkRecipient === 'custom' && (
                <div className="border border-slate-200 rounded-lg p-4 max-h-64 overflow-y-auto">
                  <p className="text-xs font-bold text-slate-600 uppercase tracking-widest mb-3">
                    Select Recipients ({selectedRecipients.length} selected)
                  </p>
                  <div className="space-y-2">
                    {displayedUsers
                      .filter(user => !selectedBuilding || user.buildingIds?.includes(parseInt(selectedBuilding)))
                      .map(user => (
                      <label key={user.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedRecipients.includes(user.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedRecipients([...selectedRecipients, user.id]);
                            } else {
                              setSelectedRecipients(selectedRecipients.filter(id => id !== user.id));
                            }
                          }}
                          className="w-4 h-4 text-indigo-600 rounded"
                        />
                        <div className="flex-1">
                          <div className="text-sm font-bold text-slate-700">{user.name || user.email}</div>
                          <div className="text-[10px] text-slate-400 uppercase font-black">{user.role}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-slate-600 uppercase tracking-widest mb-2 block">Message</label>
                <textarea
                  value={bulkMessage}
                  onChange={(e) => setBulkMessage(e.target.value)}
                  placeholder="Type your message here..."
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm resize-none"
                  rows={5}
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowBulkModal(false);
                  setSelectedRecipients([]);
                  setBulkRecipient('all tenants');
                }}
                className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSendBulkSMS}
                disabled={sending || !bulkMessage.trim()}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending ? 'Sending...' : `Send SMS ${bulkRecipient === 'custom' ? `(${selectedRecipients.length})` : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
};

export default Communication;
