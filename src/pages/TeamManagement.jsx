import React, { useState, useEffect } from 'react';
import { MainLayout } from '../layouts/MainLayout';
import api from '../api/client';
import { useTranslation } from 'react-i18next';
import { 
  Users, 
  UserPlus, 
  Mail, 
  Phone, 
  Shield, 
  MoreVertical, 
  Check, 
  X, 
  RotateCcw, 
  UserMinus,
  Briefcase,
  ExternalLink,
  Trash2
} from 'lucide-react';

const getModuleDisplayName = (name, t) => {
  const map = {
    'Dashboard': t('sidebar.dashboard'),
    'Overview': `↳ ${t('sidebar.overview')}`,
    'Vacancy Dashboard': `↳ ${t('sidebar.vacancy')}`,
    'Revenue Dashboard': `↳ ${t('sidebar.revenue')}`,
    'Properties': t('sidebar.properties'),
    'Buildings': `↳ ${t('sidebar.buildings')}`,
    'Units': `↳ ${t('sidebar.units')}`,
    'Unit Readiness': `↳ ${t('sidebar.unit_readiness')}`,
    'Tenants': t('sidebar.tenants'),
    'Tenant List': `↳ ${t('sidebar.tenant_list')}`,
    'Vehicles': `↳ ${t('sidebar.vehicles')}`,
    'Insurance': `↳ ${t('sidebar.insurance')}`,
    'Leases': t('sidebar.leases'),
    'Rent Roll': t('sidebar.rent_roll'),
    'Documents': t('sidebar.documents'),
    'Payments': t('sidebar.payments'),
    'Invoices': `↳ ${t('sidebar.invoices')}`,
    'Payments Received': `↳ ${t('sidebar.received')}`,
    'Outstanding Dues': `↳ ${t('sidebar.outstanding')}`,
    'Refunds': `↳ ${t('sidebar.refunds')}`,
    'Accounting': t('sidebar.accounting'),
    'General Ledger': `↳ ${t('sidebar.ledger')}`,
    'QuickBooks Sync': `↳ ${t('sidebar.quickbooks')}`,
    'Chart of Accounts': `↳ ${t('sidebar.chart_of_accounts')}`,
    'Tax Settings': `↳ ${t('sidebar.tax_settings')}`,
    'Reports': t('sidebar.reports'),
    'Communication': t('sidebar.sms_hub'),
    'Inbox': `↳ ${t('sidebar.inbox')}`,
    'Campaign Manager': `↳ ${t('sidebar.campaigns')}`,
    'Templates': `↳ ${t('sidebar.templates')}`,
    'Email Hub': t('sidebar.email_hub'),
    'Send Email': `↳ ${t('sidebar.send_email')}`,
    'Email Templates': `↳ ${t('sidebar.email_templates')}`,
    'Sent Emails': `↳ ${t('sidebar.email_history')}`,
    'Shuttle': t('sidebar.shuttle'),
    'Maintenance': t('sidebar.maintenance'),
    'Tickets': t('sidebar.tickets'),
    'Inspections': t('sidebar.inspections'),
    'Inspection List': `↳ ${t('sidebar.inspection_list')}`,
    'Inspection Templates': `↳ ${t('sidebar.templates')}`,
    'Unit Preparation': t('sidebar.unit_prep'),
    'Move-Out': t('sidebar.move_out'),
    'Move-In': t('sidebar.move_in'),
    'Settings': t('sidebar.team')
  };
  return map[name] || name;
};

const MODULES = [
  'Dashboard', 'Overview', 'Vacancy Dashboard', 'Revenue Dashboard',
  'Properties', 'Buildings', 'Units', 'Unit Readiness',
  'Tenants', 'Tenant List', 'Vehicles', 'Insurance', 
  'Shuttle',
  'Leases',
  'Rent Roll',
  'Documents',
  'Payments', 'Invoices', 'Payments Received', 'Outstanding Dues', 'Refunds',
  'Accounting', 'General Ledger',
  'Reports',
  'Communication', 'Inbox', 'Campaign Manager', 'Templates',
  'Email Hub', 'Send Email', 'Email Templates', 'Sent Emails',
  'Maintenance',
  'Tickets',
  'Inspections', 'Inspection List', 'Inspection Templates',
  'Unit Preparation',
  'Move-Out',
  'Move-In',
  'Settings'
];

const PARENTS = ['Dashboard', 'Properties', 'Tenants', 'Payments', 'Accounting', 'Communication', 'Email Hub', 'Inspections'];

const sortPermissions = (perms) => {
    return [...(perms || [])].sort((a, b) => {
        const indexA = MODULES.indexOf(a.moduleName);
        const indexB = MODULES.indexOf(b.moduleName);
        return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
    });
};

export const TeamManagement = () => {
  const { t } = useTranslation();
  const [coworkers, setCoworkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '+1',
    title: '',
    preferredLanguage: 'English',
    permissions: MODULES.map(m => ({
        moduleName: m,
        canView: false,
        canAdd: false,
        canEdit: false,
        canDelete: false
    }))
  });

  const [invitationTemplates, setInvitationTemplates] = useState([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [memberToInvite, setMemberToInvite] = useState(null);

  useEffect(() => {
    fetchCoworkers();
    fetchInvitationTemplates();
  }, []);

  const fetchInvitationTemplates = async () => {
    try {
      const res = await api.get('/api/admin/email/templates');
      // Only show templates marked as INVITATION type
      const inviteOnly = res.data.filter(t => t.type === 'INVITATION');
      setInvitationTemplates(inviteOnly);
    } catch (err) {
      console.error('Error fetching invitation templates:', err);
    }
  };

  const fetchCoworkers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/admin/coworkers');
      setCoworkers(res.data);
    } catch (error) {
      console.error('Error fetching coworkers:', error);
      alert('Failed to load team members');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEditing) {
        await api.put(`/api/admin/coworkers/${selectedMember.id}`, formData);
        alert('Member updated successfully');
      } else {
        await api.post('/api/admin/coworkers', formData);
        alert('Team member created with selected permissions');
      }
      setShowModal(false);
      resetForm();
      fetchCoworkers();
    } catch (error) {
      console.error('Error saving coworker:', error);
      alert(error.response?.data?.message || 'Error saving member');
    }
  };

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '+1',
      title: '',
      preferredLanguage: 'English',
      permissions: MODULES.map(m => ({
        moduleName: m,
        canView: false,
        canAdd: false,
        canEdit: false,
        canDelete: false
      }))
    });
    setIsEditing(false);
    setSelectedMember(null);
  };

  const handleEdit = (member) => {
    setSelectedMember(member);
    setFormData({
      firstName: member.firstName || '',
      lastName: member.lastName || '',
      email: member.email || '',
      phone: member.phone || '',
      title: member.title || '',
      preferredLanguage: member.preferredLanguage || 'English',
      permissions: MODULES.map(m => {
        const existing = member.permissions?.find(p => p.moduleName === m);
        return existing || {
          moduleName: m,
          canView: false,
          canAdd: false,
          canEdit: false,
          canDelete: false
        };
      })
    });
    setIsEditing(true);
    setShowModal(true);
  };

  const handleModalPermissionChange = (moduleName, field, value) => {
    setFormData(prev => ({
        ...prev,
        permissions: prev.permissions.map(p => 
            p.moduleName === moduleName ? { ...p, [field]: value } : p
        )
    }));
  };

  const handlePermissionChange = async (permissionId, field, value) => {
    try {
        // Find member and update locally for snappy UI
        const updatedCoworkers = coworkers.map(c => {
            if (c.id === selectedMember.id) {
                let permissionExists = c.permissions.some(p => p.id === permissionId || p.moduleName === p.moduleName);
                let newPermissions = [];
                
                if (c.permissions.some(p => p.id === permissionId)) {
                    // Update existing
                    newPermissions = c.permissions.map(p => 
                        p.id === permissionId ? { ...p, [field]: value } : p
                    );
                } else {
                    // Find module name from permissionId if it's temp-
                    const moduleName = permissionId.startsWith('temp-') ? permissionId.replace('temp-', '') : null;
                    if (moduleName) {
                        // Create and add
                        newPermissions = [...c.permissions, {
                            id: permissionId,
                            moduleName,
                            canView: field === 'canView' ? value : false,
                            canAdd: field === 'canAdd' ? value : false,
                            canEdit: field === 'canEdit' ? value : false,
                            canDelete: field === 'canDelete' ? value : false
                        }];
                    } else {
                        newPermissions = c.permissions;
                    }
                }

                return { ...c, permissions: newPermissions };
            }
            return c;
        });
        setCoworkers(updatedCoworkers);

        // Find the full permission object to get the moduleName
        const member = updatedCoworkers.find(c => c.id === selectedMember.id);
        const permObj = member.permissions.find(p => p.id === permissionId);
        setSelectedMember(member);

        // Sync with backend - include moduleName for new permissions (temp- IDs)
        await api.put(`/api/admin/coworkers/${selectedMember.id}/permissions`, {
            permissions: [{ 
                id: permissionId, 
                moduleName: permObj.moduleName,
                [field]: value 
            }]
        });
    } catch (error) {
        console.error('Error updating permission:', error);
        alert('Failed to update permission');
        fetchCoworkers(); // Revert to server state
    }
  };

  const sendInvitation = async (id, templateId = null) => {
    try {
      const res = await api.post(`/api/admin/coworkers/${id}/send-invite`, { templateId });
      alert(res.data.message || 'Invitation email sent successfully');
      setShowInviteModal(false);
      fetchCoworkers();
    } catch (error) {
      console.error('Send invite error:', error);
      alert(error.response?.data?.message || 'Failed to send invitation');
    }
  };

  const toggleStatus = async (member) => {
    try {
      if (!member?.id) return alert('Member ID is missing');
      
      const res = await api.put(`/api/admin/coworkers/${member.id}`, { isActive: !member.isActive });
      const newState = res.data.isActive;
      
      alert(`Member ${newState ? 'enabled' : 'disabled'} successfully`);
      
      // Update local state to show change immediately
      setCoworkers(prev => prev.map(c => c.id === member.id ? { ...c, isActive: newState } : c));
      if (selectedMember?.id === member.id) {
        setSelectedMember(prev => ({ ...prev, isActive: newState }));
      }
    } catch (error) {
      console.error('Toggle status error:', error);
      alert('Failed to update status');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to permanently delete this team member? This cannot be undone.')) {
        try {
            await api.delete(`/api/admin/coworkers/${id}`);
            alert('Member deleted permanently');
            setSelectedMember(null);
            fetchCoworkers();
        } catch (error) {
            alert('Failed to delete member');
        }
    }
  };

  return (
    <MainLayout title={t('sidebar.team')}>
      <div className="flex flex-col gap-8">
        
        {/* HEADER SECTION */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-slate-800">{t('sidebar.team')}</h2>
            <p className="text-slate-500 font-medium">{t('dashboard.portfolio_update')}</p> 
          </div>
          <button 
            onClick={() => { resetForm(); setShowModal(true); }}
            className="flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-2xl font-bold shadow-xl shadow-primary-100 hover:bg-primary-700 transition-all group"
          >
            <UserPlus size={20} className="group-hover:scale-110 transition-transform" />
            {t('team.new_member')}
          </button>
        </div>

        {/* TEAM LIST SECTION */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT: MEMBER LIST (4 COLUMNS) */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="font-bold text-slate-800">{t('sidebar.team')}</h3>
                    <span className="bg-slate-100 text-slate-500 text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-widest">{coworkers.length} {t('common.total')}</span>
                </div>

                {loading ? (
                    <div className="p-8 text-center text-slate-400 font-medium italic">Loading coworkers...</div>
                ) : coworkers.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 font-medium italic">No coworkers found.</div>
                ) : (
                    <div className="flex flex-col gap-3">
                        {coworkers.map(member => (
                            <div 
                                key={member.id}
                                onClick={() => setSelectedMember(member)}
                                className={`group p-4 rounded-2xl border transition-all cursor-pointer ${
                                    selectedMember?.id === member.id 
                                    ? 'bg-primary-50 border-primary-100 ring-2 ring-primary-50/50' 
                                    : 'bg-white border-slate-50 hover:border-slate-200'
                                }`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-sm uppercase ${
                                         selectedMember?.id === member.id ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-500'
                                     }`}>
                                         {(member.firstName && member.firstName !== 'undefined') ? member.firstName[0] : (member.name?.[0] || member.email?.[0] || 'U')}
                                         {(member.lastName && member.lastName !== 'undefined') ? member.lastName[0] : ''}
                                     </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                             <h4 className="font-bold text-slate-800 truncate">
                                                 {(member.firstName && member.firstName !== 'undefined') ? `${member.firstName} ${member.lastName && member.lastName !== 'undefined' ? member.lastName : ''}` : member.name || member.email || 'Unknown Staff'}
                                             </h4>
                                             {!member.isActive && <span className="w-1.5 h-1.5 rounded-full bg-red-400" title="Disabled"></span>}
                                         </div>
                                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide truncate">{member.title || 'No Title Set'}</p>
                                    </div>
                                    {!member.isInvited && <div className="bg-amber-50 p-1.5 rounded-lg" title="Not Invited"><Mail size={14} className="text-amber-500" /></div>}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
          </div>

          {/* RIGHT: DETAILS & PERMISSIONS (8 COLUMNS) */}
          <div className="lg:col-span-8">
            {selectedMember ? (
                <div className="flex flex-col gap-6 animate-[fadeUp_0.4s_ease]">
                    
                    {/* PROFILE SUMMARY CARD */}
                    <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden group">
                        {/* Decorative Background Element */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary-50 rounded-full -mr-16 -mt-16 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>

                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
                            <div className="flex items-center gap-6">
                                <div className="w-16 h-16 rounded-3xl bg-slate-900 text-white flex items-center justify-center text-xl font-black shadow-2xl shadow-slate-200 uppercase flex-shrink-0">
                                    {(selectedMember.firstName && selectedMember.firstName !== 'undefined') ? selectedMember.firstName[0] : (selectedMember.name?.[0] || selectedMember.email?.[0] || 'U')}
                                    {(selectedMember.lastName && selectedMember.lastName !== 'undefined') ? selectedMember.lastName[0] : ''}
                                </div>
                                <div>
                                    <div className="flex flex-wrap items-center gap-3">
                                         <h3 className="text-2xl font-black text-slate-800">
                                             {(selectedMember.firstName && selectedMember.firstName !== 'undefined') ? `${selectedMember.firstName} ${selectedMember.lastName && selectedMember.lastName !== 'undefined' ? selectedMember.lastName : ''}` : selectedMember.name || selectedMember.email || 'Team Member'}
                                         </h3>
                                         <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                            selectedMember.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                                        }`}>
                                            {selectedMember.isActive ? t('common.status_active') : t('common.status_disabled')}
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-4 mt-2 text-slate-400">
                                        <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                                            <Shield size={14} className="text-primary-600" />
                                            <span className="text-[11px] font-bold uppercase tracking-tight text-slate-600">{selectedMember.title || 'COWORKER'}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <Mail size={14} />
                                            <span className="text-xs font-medium truncate max-w-[200px]">{selectedMember.email}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center justify-end gap-3 mt-4 lg:mt-0">
                                <button 
                                    onClick={() => handleEdit(selectedMember)}
                                    className="p-3 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-all"
                                    title="Edit Profile"
                                >
                                    <UserPlus size={20} />
                                </button>
                                <button 
                                    onClick={() => {
                                        setMemberToInvite(selectedMember);
                                        setShowInviteModal(true);
                                    }}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                                        selectedMember.isInvited 
                                        ? 'bg-slate-50 text-slate-400 border border-slate-100' 
                                        : 'bg-amber-600 text-white shadow-lg shadow-amber-100 hover:bg-amber-700'
                                    }`}
                                >
                                    <RotateCcw size={14} />
                                    {selectedMember.isInvited ? 'Resend Invite' : 'Send Invite'}
                                </button>
                                <button 
                                    onClick={() => toggleStatus(selectedMember)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                                        selectedMember.isActive 
                                        ? 'bg-red-50 text-red-600 hover:bg-red-100' 
                                        : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                                    }`}
                                >
                                    {selectedMember.isActive ? <UserMinus size={14} /> : <Check size={14} />}
                                    {selectedMember.isActive ? 'Revoke Access' : 'Restore Access'}
                                </button>
                                <button 
                                    onClick={() => handleDelete(selectedMember.id)}
                                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest bg-red-600 text-white shadow-lg shadow-red-200 hover:bg-red-700 transition-all ml-2"
                                    title="Permanent Delete"
                                >
                                    <Trash2 size={14} />
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* PERMISSION TABLE */}
                    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                        <div className="p-8 border-b border-slate-50">
                            <h3 className="text-lg font-black text-slate-800">{t('team.section_access')}</h3>
                            <p className="text-sm text-slate-500 font-medium">{t('team.identification_note')}</p>
                        </div>
                        
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-slate-50/80">
                                    <tr>
                                        <th className="px-8 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">{t('team.section')}</th>
                                        <th className="px-6 py-4 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">{t('team.v')}</th>
                                        <th className="px-6 py-4 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">{t('team.a')}</th>
                                        <th className="px-6 py-4 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">{t('team.e')}</th>
                                        <th className="px-6 py-4 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">{t('team.d')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {selectedMember.permissions && sortPermissions(
                                        MODULES.map(m => {
                                            const existing = selectedMember.permissions.find(p => p.moduleName === m);
                                            return existing || { moduleName: m, canView: false, canAdd: false, canEdit: false, canDelete: false, id: `temp-${m}` };
                                        })
                                    )
                                        .filter(p => MODULES.includes(p.moduleName) && !['Settings', 'Team Access Control'].includes(p.moduleName) && !(localStorage.getItem('selectedProperty') === 'stagathe' && p.moduleName === 'Shuttle'))
                                        .map(perm => {
                                        const isParent = PARENTS.includes(perm.moduleName);
                                        return (
                                        <tr key={perm.id} className={`transition-colors ${isParent ? 'bg-slate-50/30' : 'hover:bg-slate-50/50'}`}>
                                            <td className="px-8 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isParent ? 'bg-primary-50 border border-primary-100' : 'bg-slate-50 border border-slate-100'}`}>
                                                        <ExternalLink size={14} className={isParent ? 'text-primary-600' : 'text-slate-400'} />
                                                    </div>
                                                    <span className={`font-bold ${isParent ? 'text-slate-900' : 'text-slate-700'}`}>{getModuleDisplayName(perm.moduleName, t)}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {!isParent && (
                                                    <PermissionCheckbox 
                                                        checked={perm.canView} 
                                                        onChange={(val) => handlePermissionChange(perm.id, 'canView', val)} 
                                                    />
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {!isParent && (
                                                    <PermissionCheckbox 
                                                        checked={perm.canAdd} 
                                                        onChange={(val) => handlePermissionChange(perm.id, 'canAdd', val)} 
                                                    />
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {!isParent && (
                                                    <PermissionCheckbox 
                                                        checked={perm.canEdit} 
                                                        onChange={(val) => handlePermissionChange(perm.id, 'canEdit', val)} 
                                                    />
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {!isParent && (
                                                    <PermissionCheckbox 
                                                        checked={perm.canDelete} 
                                                        onChange={(val) => handlePermissionChange(perm.id, 'canDelete', val)} 
                                                    />
                                                )}
                                            </td>
                                        </tr>
                                    );})}
                                </tbody>
                            </table>
                        </div>
                        <div className="p-6 bg-slate-50/50 text-center">
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                                All changes are saved automatically.
                            </p>
                        </div>
                    </div>

                </div>
            ) : (
                <div className="h-full min-h-[400px] flex flex-col items-center justify-center bg-white rounded-[2rem] border border-dashed border-slate-200 p-8 text-center text-slate-400">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                        <Users size={40} className="text-slate-200" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-300">Select a team member to manage access</h3>
                    <p className="max-w-xs mt-2 text-sm">Choose a person from the left list to view their profile details and granular permissions.</p>
                </div>
            )}
          </div>

        </div>

        {/* ADD/EDIT MODAL */}
        {showModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowModal(false)}></div>
                <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl relative z-10 flex flex-col max-h-[95vh] overflow-hidden animate-[scale_0.3s_ease]">
                    <div className="p-8 pb-4 flex items-center justify-between border-b border-slate-50">
                        <h3 className="text-xl font-black text-slate-800">{isEditing ? t('team.edit_profile') : t('team.new_member')}</h3>
                        <button onClick={() => setShowModal(false)} className="p-2 text-slate-400 hover:text-slate-600 transition-all"><X size={24} /></button>
                    </div>
                    
                    <form onSubmit={handleSubmit} className="p-8 pt-4 flex flex-col gap-4 overflow-y-auto">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col gap-2">
                                <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 px-1">{t('team.first_name')}</label>
                                <input 
                                    name="firstName" 
                                    value={formData.firstName} 
                                    onChange={handleInputChange} 
                                    required 
                                    className="px-4 py-3 rounded-2xl border border-slate-100 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-primary-100 outline-none font-bold transition-all"
                                    placeholder="e.g. John"
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 px-1">{t('team.last_name')}</label>
                                <input 
                                    name="lastName" 
                                    value={formData.lastName} 
                                    onChange={handleInputChange} 
                                    required 
                                    className="px-4 py-3 rounded-2xl border border-slate-100 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-primary-100 outline-none font-bold transition-all"
                                    placeholder="e.g. Doe"
                                />
                            </div>
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 px-1">{t('team.email')}</label>
                            <input 
                                name="email" 
                                type="email"
                                value={formData.email} 
                                onChange={handleInputChange} 
                                required 
                                className="px-4 py-3 rounded-2xl border border-slate-100 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-primary-100 outline-none font-bold transition-all"
                                placeholder="john.doe@masteko.com"
                            />
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 px-1">{t('team.phone')}</label>
                            <div className="relative group/phone">
                                <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 transition-colors group-focus-within/phone:text-primary-500 z-10" />
                                <div className="w-full flex items-center bg-slate-50/50 rounded-2xl border border-slate-100 focus-within:bg-white focus-within:ring-2 focus-within:ring-primary-100 focus-within:border-transparent transition-all overflow-hidden pl-12">
                                    <span className="text-slate-400 font-bold select-none pr-1">+1</span>
                                    <input 
                                        name="phone" 
                                        value={formData.phone?.replace('+1', '') || ''} 
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/[^\d]/g, '').slice(0, 10);
                                            setFormData({ ...formData, phone: '+1' + val });
                                        }} 
                                        className="flex-1 py-3 pr-4 bg-transparent outline-none font-bold text-slate-700 tracking-wide"
                                        placeholder="(555) 000-0000"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 px-1">{t('team.title')}</label>
                            <div className="relative">
                                <Briefcase size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                                <input 
                                    name="title" 
                                    value={formData.title} 
                                    onChange={handleInputChange} 
                                    className="w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-100 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-primary-100 outline-none font-bold transition-all"
                                    placeholder="e.g. Property Manager"
                                />
                            </div>
                            <p className="text-[10px] text-slate-400 italic px-1 font-medium">* This title is for identification only and does not control access level.</p>
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 px-1">Email Invitation Language</label>
                            <select 
                                name="preferredLanguage" 
                                value={formData.preferredLanguage} 
                                onChange={handleInputChange} 
                                className="w-full px-5 py-3 rounded-2xl border border-slate-100 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-primary-100 outline-none font-bold transition-all"
                            >
                                <option value="English">English</option>
                                <option value="French">French</option>
                            </select>
                            <p className="text-[10px] text-slate-400 italic px-1 font-medium">* The invitation email will be sent in this language if a corresponding template exists.</p>
                        </div>

                        {/* MODAL PERMISSIONS SECTION */}
                        <div className="flex flex-col gap-4 mt-2">
                            <div className="flex items-center justify-between px-1">
                                <label className="text-[11px] font-black uppercase tracking-widest text-slate-400">{t('team.section_access')}</label>
                                <span className="text-[9px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold">CONFIGURABLE</span>
                            </div>
                            
                            <div className="border border-slate-100 rounded-3xl overflow-hidden max-h-[220px] overflow-y-auto bg-slate-50/30 shadow-inner">
                                <table className="w-full text-left border-collapse">
                                    <thead className="sticky top-0 bg-white border-b border-slate-100 z-10">
                                        <tr>
                                            <th className="p-3 text-[9px] font-black text-slate-400 uppercase tracking-tighter">{t('team.section')}</th>
                                            <th className="p-3 text-center text-[9px] font-black text-slate-400 uppercase tracking-tighter">V</th>
                                            <th className="p-3 text-center text-[9px] font-black text-slate-400 uppercase tracking-tighter">A</th>
                                            <th className="p-3 text-center text-[9px] font-black text-slate-400 uppercase tracking-tighter">E</th>
                                            <th className="p-3 text-center text-[9px] font-black text-slate-400 uppercase tracking-tighter">D</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50/50">
                                        {sortPermissions(formData.permissions)
                                            .filter(p => !['Settings', 'Team Access Control'].includes(p.moduleName) && !(localStorage.getItem('selectedProperty') === 'stagathe' && p.moduleName === 'Shuttle'))
                                            .map(perm => {
                                            const isParent = PARENTS.includes(perm.moduleName);
                                            return (
                                            <tr key={perm.moduleName} className={`transition-colors ${isParent ? 'bg-white/50' : 'hover:bg-white'}`}>
                                                <td className="p-3">
                                                    <span className={`text-xs font-bold tracking-tight ${isParent ? 'text-slate-900' : 'text-slate-600'}`}>{getModuleDisplayName(perm.moduleName, t)}</span>
                                                </td>
                                                <td className="p-3 text-center">
                                                    {!isParent && (
                                                        <PermissionCheckboxSmall 
                                                            checked={perm.canView} 
                                                            onChange={(val) => handleModalPermissionChange(perm.moduleName, 'canView', val)} 
                                                        />
                                                    )}
                                                </td>
                                                <td className="p-3 text-center">
                                                    {!isParent && (
                                                        <PermissionCheckboxSmall 
                                                            checked={perm.canAdd} 
                                                            onChange={(val) => handleModalPermissionChange(perm.moduleName, 'canAdd', val)} 
                                                        />
                                                    )}
                                                </td>
                                                <td className="p-3 text-center">
                                                    {!isParent && (
                                                        <PermissionCheckboxSmall 
                                                            checked={perm.canEdit} 
                                                            onChange={(val) => handleModalPermissionChange(perm.moduleName, 'canEdit', val)} 
                                                        />
                                                    )}
                                                </td>
                                                <td className="p-3 text-center">
                                                    {!isParent && (
                                                        <PermissionCheckboxSmall 
                                                            checked={perm.canDelete} 
                                                            onChange={(val) => handleModalPermissionChange(perm.moduleName, 'canDelete', val)} 
                                                        />
                                                    )}
                                                </td>
                                            </tr>
                                        );})}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="mt-4 flex gap-3">
                            <button 
                                type="button" 
                                onClick={() => setShowModal(false)}
                                className="flex-1 py-4 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl transition-all"
                            >
                                {t('common.cancel')}
                            </button>
                            <button 
                                type="submit"
                                className="flex-3 py-4 bg-primary-600 text-white font-black rounded-2xl shadow-xl shadow-primary-200 hover:bg-primary-700 transition-all uppercase tracking-tighter"
                            >
                                {isEditing ? t('team.update_profile') : t('team.create_profile')}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )}

        {/* INVITATION TEMPLATE SELECT MODAL */}
        {showInviteModal && memberToInvite && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" onClick={() => setShowInviteModal(false)}></div>
                <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl relative z-10 p-8 flex flex-col gap-6 animate-[bounceIn_0.4s_ease]">
                    <div>
                        <h3 className="text-xl font-black text-slate-800">Choose Invitation Template</h3>
                        <p className="text-sm text-slate-500 font-medium mt-1">
                            Sending to: <span className="text-primary-600 font-bold">{memberToInvite.name || memberToInvite.email}</span>
                        </p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2 italic">Language: {memberToInvite.preferredLanguage || 'English'}</p>
                    </div>

                    <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto pr-1">
                        {invitationTemplates
                            .filter(t => {
                                // Filter templates by coworker language code
                                const targetLang = memberToInvite.preferredLanguage?.toLowerCase().includes('french') ? 'fr' : 'en';
                                return t.language === targetLang;
                            })
                            .map(template => (
                                <button 
                                    key={template.id}
                                    onClick={() => sendInvitation(memberToInvite.id, template.id)}
                                    className="p-4 rounded-2xl border border-slate-100 bg-slate-50 hover:bg-white hover:border-primary-500 hover:shadow-lg transition-all text-left flex items-center justify-between group"
                                >
                                    <div className="flex-1 min-w-0 pr-4">
                                        <h4 className="font-bold text-slate-800 group-hover:text-primary-600 transition-colors truncate">{template.name}</h4>
                                        <p className="text-[10px] text-slate-400 font-medium truncate uppercase italic">{template.subject}</p>
                                    </div>
                                    <div className="w-8 h-8 rounded-full bg-white border border-slate-100 flex items-center justify-center group-hover:bg-primary-600 group-hover:text-white group-hover:border-primary-600 transition-all">
                                        <Mail size={14} />
                                    </div>
                                </button>
                            ))}

                        {invitationTemplates.filter(t => {
                                const targetLang = memberToInvite.preferredLanguage?.toLowerCase().includes('french') ? 'fr' : 'en';
                                return t.language === targetLang;
                            }).length === 0 && (
                            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                <p className="text-xs text-slate-400 font-bold italic mb-3">No custom template found for this language.</p>
                                <button 
                                    onClick={() => sendInvitation(memberToInvite.id, null)}
                                    className="px-4 py-2 bg-slate-800 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-900 transition-all"
                                >
                                    Use System Default
                                </button>
                            </div>
                        )}
                    </div>

                    <button 
                        onClick={() => setShowInviteModal(false)}
                        className="w-full py-4 text-slate-400 font-bold hover:bg-slate-50 rounded-2xl transition-all border border-slate-50"
                    >
                        {t('common.cancel')}
                    </button>
                </div>
            </div>
        )}

      </div>
    </MainLayout>
  );
};

/* CUSTOM CHECKBOX COMPONENT */
const PermissionCheckbox = ({ checked, onChange }) => {
    return (
        <button 
            type="button"
            onClick={() => onChange(!checked)}
            className={`w-6 h-6 mx-auto rounded-lg flex items-center justify-center transition-all ${
                checked 
                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-100' 
                : 'bg-slate-100 text-transparent border border-slate-200 hover:border-slate-300'
            }`}
        >
            <Check size={14} className={checked ? 'scale-100' : 'scale-0'} />
        </button>
    );
};

const PermissionCheckboxSmall = ({ checked, onChange }) => {
    return (
        <button 
            type="button"
            onClick={() => onChange(!checked)}
            className={`w-4 h-4 mx-auto rounded-md flex items-center justify-center transition-all ${
                checked 
                ? 'bg-emerald-500 text-white' 
                : 'bg-slate-100 text-transparent border border-slate-200 hover:border-slate-300'
            }`}
        >
            <Check size={10} className={checked ? 'scale-100' : 'scale-0'} />
        </button>
    );
};
