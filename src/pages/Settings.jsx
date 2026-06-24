import { useState, useEffect } from 'react';
import { MainLayout } from '../layouts/MainLayout';
import GoogleTranslate from '../components/GoogleTranslate';
import api from '../api/client';

const Settings = () => {
  const [__forceUpdate, __setForceUpdate] = useState(0);
  useEffect(() => {
    const handleUpdate = () => __setForceUpdate(p => p + 1);
    window.addEventListener('permissionsUpdated', handleUpdate);
    return () => window.removeEventListener('permissionsUpdated', handleUpdate);
  }, []);

  const [settings, setSettings] = useState({
    notifications: true,
    autoInvoices: true,
    twoFactor: false,
    companyName: 'Masteko',
    currency: 'CAD ($)',
    paymentCycle: 'Monthly',
    lateFee: 5
  });

  const [stats, setStats] = useState({
    activeUsers: 0,
    systemStatus: 'Checking...',
    storageUsage: 'Checking...',
    lastBackup: 'Never'
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await api.get('/api/admin/settings');
      // Merge backend settings with defaults
      const backendSettings = res.data.settings || {};
      const parsedSettings = {};
      // Parse "true"/"false" strings to booleans
      Object.keys(backendSettings).forEach(k => {
        if (backendSettings[k] === 'true') parsedSettings[k] = true;
        else if (backendSettings[k] === 'false') parsedSettings[k] = false;
        else parsedSettings[k] = backendSettings[k];
      });

      setSettings(prev => ({ ...prev, ...parsedSettings }));
      setStats(res.data.stats);
    } catch (e) { console.error(e); }
  };

  const saveSetting = async (key, val) => {
    // Optimistic update
    setSettings(prev => ({ ...prev, [key]: val }));
    try {
      await api.post('/api/admin/settings', { [key]: val });
    } catch (e) { console.error(e); }
  };

  const toggle = (key) => {
    saveSetting(key, !settings[key]);
  };

  return (
    <MainLayout title="Application Settings">
      <div className="flex flex-col gap-6">

        {/* STATUS CARDS */}
        <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-5">
          <div className="bg-white p-5 rounded-xl shadow-[0_10px_25px_rgba(0,0,0,0.06)] animate-[fadeUp_0.6s_ease]">
            <h4 className="text-sm text-slate-500">System Status</h4>
            <p className="text-lg font-semibold mt-1.5 text-emerald-600">{stats.systemStatus}</p>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-[0_10px_25px_rgba(0,0,0,0.06)] animate-[fadeUp_0.6s_ease]">
            <h4 className="text-sm text-slate-500">Storage Usage</h4>
            <p className="text-lg font-semibold mt-1.5 text-slate-900">{stats.storageUsage}</p>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-[0_10px_25px_rgba(0,0,0,0.06)] animate-[fadeUp_0.6s_ease]">
            <h4 className="text-sm text-slate-500">Active Users</h4>
            <p className="text-lg font-semibold mt-1.5 text-slate-900">{stats.activeUsers} Users</p>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-[0_10px_25px_rgba(0,0,0,0.06)] animate-[fadeUp_0.6s_ease]">
            <h4 className="text-sm text-slate-500">Last Backup</h4>
            <p className="text-lg font-semibold mt-1.5 text-slate-900">{stats.lastBackup !== 'Never' ? new Date(stats.lastBackup).toLocaleDateString() + ' ' + new Date(stats.lastBackup).toLocaleTimeString() : 'Never'}</p>
          </div>
        </div>

        {/* SETTINGS SECTIONS */}
        <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-6">

          {/* LANGUAGE SETTINGS */}
          <div className="bg-white p-[22px] rounded-xl shadow-[0_10px_25px_rgba(0,0,0,0.06)]">
            <h3 className="mb-4 text-base font-semibold text-slate-800">Language Settings</h3>
            <div className="flex flex-col gap-1.5 text-[13px] mb-3.5 text-slate-700">
              <span className="mb-2">Select Application Language</span>
              <div className="relative z-10">
                <GoogleTranslate />
              </div>
            </div>
          </div>

          {/* GENERAL */}
          <div className="bg-white p-[22px] rounded-xl shadow-[0_10px_25px_rgba(0,0,0,0.06)]">
            <h3 className="mb-4 text-base font-semibold text-slate-800">General Settings</h3>
            <label className="flex flex-col gap-1.5 text-[13px] mb-3.5 text-slate-700">
              Company Name
              <input
                value={settings.companyName}
                onChange={(e) => saveSetting('companyName', e.target.value)}
                className="h-[38px] px-2.5 rounded-lg border border-slate-200 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-medium text-slate-900"
              />
            </label>

            <label className="flex flex-col gap-1.5 text-[13px] mb-3.5 text-slate-700">
              Company Address
              <textarea
                value={settings.companyAddress || ''}
                onChange={(e) => saveSetting('companyAddress', e.target.value)}
                placeholder="e.g. 123 Business Avenue, Suite 500&#10;Toronto, ON M5V 2N8"
                className="px-2.5 py-2 rounded-lg border border-slate-200 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-medium text-slate-900 min-h-[60px] resize-none"
              />
            </label>

            <label className="flex flex-col gap-1.5 text-[13px] mb-3.5 text-slate-700">
              Company Logo URL
              <input
                value={settings.companyLogo || ''}
                onChange={(e) => saveSetting('companyLogo', e.target.value)}
                placeholder="https://example.com/logo.png"
                className="h-[38px] px-2.5 rounded-lg border border-slate-200 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-medium text-slate-900"
              />
            </label>

            <label className="flex flex-col gap-1.5 text-[13px] mb-3.5 text-slate-700">
              Company Phone
              <input
                value={settings.companyPhone || ''}
                onChange={(e) => saveSetting('companyPhone', e.target.value)}
                placeholder="+1 555-000-0000"
                className="h-[38px] px-2.5 rounded-lg border border-slate-200 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-medium text-slate-900"
              />
            </label>

            <label className="flex flex-col gap-1.5 text-[13px] mb-3.5 text-slate-700">
              Global Email Signature (HTML)
              <textarea
                value={settings.GLOBAL_EMAIL_SIGNATURE || ''}
                onChange={(e) => saveSetting('GLOBAL_EMAIL_SIGNATURE', e.target.value)}
                placeholder="<p>Best regards,<br><b>Masteko Team</b></p>"
                className="px-2.5 py-2 rounded-lg border border-slate-200 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono text-xs text-slate-900 min-h-[100px] bg-slate-50"
              />
            </label>

            <label className="flex flex-col gap-1.5 text-[13px] mb-3.5 text-slate-700">
              Default Currency
              <select
                value={settings.currency}
                onChange={(e) => saveSetting('currency', e.target.value)}
                className="h-[38px] px-2.5 rounded-lg border border-slate-200 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all bg-white font-medium text-slate-900"
              >
                <option>CAD ($)</option>
                <option>INR (₹)</option>
                <option>USD ($)</option>
                <option>AED (د.إ)</option>
              </select>
            </label>
          </div>

          {/* NOTIFICATIONS */}
          <div className="bg-white p-[22px] rounded-xl shadow-[0_10px_25px_rgba(0,0,0,0.06)]">
            <h3 className="mb-4 text-base font-semibold text-slate-800">Notifications</h3>

            <div className="flex justify-between items-center mb-3.5">
              <span className="text-[13px] font-medium text-slate-700">Email Notifications</span>
              <button
                className={`w-11 h-[22px] rounded-full relative cursor-pointer border-none transition-colors ${settings.notifications ? 'bg-indigo-600' : 'bg-gray-200'}`}
                onClick={() => toggle('notifications')}
              >
                <span className={`block w-[18px] h-[18px] bg-white rounded-full absolute top-[2px] transition-all shadow-sm ${settings.notifications ? 'left-[24px]' : 'left-[2px]'}`} />
              </button>
            </div>

            <div className="flex justify-between items-center mb-3.5">
              <span className="text-[13px] font-medium text-slate-700">Auto Invoice Generation</span>
              <button
                className={`w-11 h-[22px] rounded-full relative cursor-pointer border-none transition-colors ${settings.autoInvoices ? 'bg-indigo-600' : 'bg-gray-200'}`}
                onClick={() => toggle('autoInvoices')}
              >
                <span className={`block w-[18px] h-[18px] bg-white rounded-full absolute top-[2px] transition-all shadow-sm ${settings.autoInvoices ? 'left-[24px]' : 'left-[2px]'}`} />
              </button>
            </div>
          </div>

          {/* SECURITY */}
          <div className="bg-white p-[22px] rounded-xl shadow-[0_10px_25px_rgba(0,0,0,0.06)]">
            <h3 className="mb-4 text-base font-semibold text-slate-800">Security</h3>

            <div className="flex justify-between items-center mb-3.5">
              <span className="text-[13px] font-medium text-slate-700">Two-Factor Authentication</span>
              <button
                className={`w-11 h-[22px] rounded-full relative cursor-pointer border-none transition-colors ${settings.twoFactor ? 'bg-indigo-600' : 'bg-gray-200'}`}
                onClick={() => toggle('twoFactor')}
              >
                <span className={`block w-[18px] h-[18px] bg-white rounded-full absolute top-[2px] transition-all shadow-sm ${settings.twoFactor ? 'left-[24px]' : 'left-[2px]'}`} />
              </button>
            </div>

            <button className="mt-2.5 w-full bg-red-50 text-red-700 border-none p-2.5 rounded-lg cursor-pointer hover:bg-red-100 transition-colors text-[13px] font-semibold">
              Force Logout All Users
            </button>
          </div>

          {/* FINANCE */}
          <div className="bg-white p-[22px] rounded-xl shadow-[0_10px_25px_rgba(0,0,0,0.06)]">
            <h3 className="mb-4 text-base font-semibold text-slate-800">Finance & Payments</h3>
            <label className="flex flex-col gap-1.5 text-[13px] mb-3.5 text-slate-700">
              Payment Cycle
              <select
                value={settings.paymentCycle}
                onChange={(e) => saveSetting('paymentCycle', e.target.value)}
                className="h-[38px] px-2.5 rounded-lg border border-slate-200 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all bg-white font-medium text-slate-900"
              >
                <option>Monthly</option>
                <option>Quarterly</option>
                <option>Yearly</option>
              </select>
            </label>

            <label className="flex flex-col gap-1.5 text-[13px] mb-3.5 text-slate-700">
              Late Fee (%)
              <input
                type="number"
                value={settings.lateFee}
                onChange={(e) => saveSetting('lateFee', e.target.value)}
                className="h-[38px] px-2.5 rounded-lg border border-slate-200 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-medium text-slate-900"
              />
            </label>
          </div>

        </div>

      </div>
    </MainLayout>
  );
};

export default Settings;
