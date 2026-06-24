import { useState, useEffect } from 'react';
import { MainLayout } from '../layouts/MainLayout';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { RefreshCw, Link as LinkIcon, CheckCircle } from 'lucide-react';
import api from '../api/client';
import { hasPermission } from '../utils/permissions';

export const QuickBooksSettings = () => {
  const [__forceUpdate, __setForceUpdate] = useState(0);
  useEffect(() => {
    const handleUpdate = () => __setForceUpdate(p => p + 1);
    window.addEventListener('permissionsUpdated', handleUpdate);
    return () => window.removeEventListener('permissionsUpdated', handleUpdate);
  }, []);

  if (!hasPermission('QuickBooks Sync', 'view')) {
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

  const [connected, setConnected] = useState(false);
  const [autoSync, setAutoSync] = useState(false);
  const [frequency, setFrequency] = useState('realtime');
  const [owners, setOwners] = useState([]);
  const [selectedOwnerId, setSelectedOwnerId] = useState('');
  const [accounts, setAccounts] = useState({
    fullUnitRent: '',
    bedroomRent: '',
    securityDeposit: '',
    lateFees: '',
  });

  useEffect(() => {
    fetchOwners();
  }, []);

  useEffect(() => {
    if (selectedOwnerId) {
      fetchSettings(selectedOwnerId);
    }
  }, [selectedOwnerId]);

  const fetchOwners = async () => {
    try {
      const res = await api.get('/api/admin/owners');
      setOwners(res.data);
      if (res.data.length > 0) {
        setSelectedOwnerId(res.data[0].id); // Auto-select first owner
      }
    } catch (e) { console.error(e); }
  };

  const fetchSettings = async (ownerId) => {
    try {
      // Pass userId query param
      const res = await api.get(`/api/admin/settings?userId=${ownerId}`);
      const s = res.data.settings || {};
      setConnected(s.qb_connected === 'true');
      setAutoSync(s.qb_autoSync === 'true');
      if (s.qb_frequency) setFrequency(s.qb_frequency);
      setAccounts({
        fullUnitRent: s.qb_account_fullUnitRent || '',
        bedroomRent: s.qb_account_bedroomRent || '',
        securityDeposit: s.qb_account_securityDeposit || '',
        lateFees: s.qb_account_lateFees || ''
      });
    } catch (e) { console.error(e); }
  };

  const handleSave = async () => {
    try {
      await api.post('/api/admin/settings', {
        userId: selectedOwnerId, // Pass selected user
        qb_connected: String(connected),
        qb_autoSync: String(autoSync),
        qb_frequency: frequency,
        qb_account_fullUnitRent: accounts.fullUnitRent,
        qb_account_bedroomRent: accounts.bedroomRent,
        qb_account_securityDeposit: accounts.securityDeposit,
        qb_account_lateFees: accounts.lateFees
      });
      alert('Settings Saved');
    } catch (e) { alert('Error saving settings'); }
  };

  const isSaveDisabled =
    !connected ||
    !accounts.fullUnitRent ||
    !accounts.bedroomRent ||
    !accounts.securityDeposit ||
    !accounts.lateFees;

  return (
    <MainLayout title="QuickBooks Integration">
      <div className="flex flex-col gap-6">

        {/* OWNER SELECTOR */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Select Owner</h3>
            <p className="text-xs text-slate-500">Configure QBO for specific owner</p>
          </div>
          <select
            className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium outline-none focus:border-indigo-500"
            value={selectedOwnerId}
            onChange={(e) => setSelectedOwnerId(e.target.value)}
          >
            {owners.map(owner => (
              <option key={owner.id} value={owner.id}>{owner.name} ({owner.companyName || 'No Company'})</option>
            ))}
          </select>
        </div>

        {/* CONNECTION STATUS */}
        <Card title="Connection Status">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`flex items-center justify-center w-12 h-12 rounded-xl text-lg font-bold transition-all ${connected ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-400'}`}>QB</div>
              <div>
                <div className="font-semibold text-slate-800">
                  QuickBooks Online
                </div>
                <div className="text-sm text-slate-500">
                  {connected ? 'Connected' : 'Not Connected'}
                </div>
              </div>
            </div>

            {hasPermission('QuickBooks Sync', 'edit') && (
                <Button
                  variant={connected ? 'outline' : 'primary'}
                  icon={LinkIcon}
                  onClick={() => setConnected(!connected)}
                >
                  {connected ? 'Disconnect' : 'Connect'}
                </Button>
            )}
          </div>
        </Card>

        {/* SYNC CONFIGURATION */}
        <Card title="Sync Configuration">
          <div className="flex items-center justify-between py-2">
            <div className="flex-1">
              <label className="font-medium text-slate-800 block mb-1">
                Enable Automatic Sync
              </label>
              <p className="text-sm text-slate-500">
                Automatically push invoices and payments to QuickBooks.
              </p>
            </div>

            <div
              className={`w-11 h-[22px] rounded-full relative cursor-pointer transition-colors ${autoSync ? 'bg-indigo-600' : 'bg-gray-200'}`}
              onClick={() => setAutoSync(!autoSync)}
            >
              <span className={`block w-[18px] h-[18px] bg-white rounded-full absolute top-[2px] transition-all shadow-sm ${autoSync ? 'left-[24px]' : 'left-[2px]'}`} />
            </div>
          </div>

          <hr className="my-5 border-slate-100" />

          <div className="flex items-center justify-between py-2">
            <div className="flex-1">
              <label className="font-medium text-slate-800">
                Sync Frequency
              </label>
            </div>

            <select
              className="w-48 h-10 px-3 rounded-lg border border-slate-200 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-400 transition-all font-medium text-slate-900"
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              disabled={!autoSync}
            >
              <option value="realtime">Real-time</option>
              <option value="hourly">Hourly</option>
              <option value="daily">Daily</option>
            </select>
          </div>
        </Card>

        {/* ACCOUNT MAPPING */}
        <Card title="Chart of Accounts Mapping">
          <p className="text-sm text-slate-500 mb-6 font-medium">
            Map your property management transactions to QuickBooks accounts.
          </p>

          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4 pb-2 border-b border-slate-100 text-xs font-semibold uppercase text-slate-400 tracking-wide">
              <span>Transaction Type</span>
              <span>QuickBooks Account</span>
            </div>

            <MappingRow
              label="Full Unit Rent"
              value={accounts.fullUnitRent}
              onChange={(v) =>
                setAccounts({ ...accounts, fullUnitRent: v })
              }
            />

            <MappingRow
              label="Bedroom Rent"
              value={accounts.bedroomRent}
              onChange={(v) =>
                setAccounts({ ...accounts, bedroomRent: v })
              }
            />

            <MappingRow
              label="Security Deposits"
              value={accounts.securityDeposit}
              onChange={(v) =>
                setAccounts({ ...accounts, securityDeposit: v })
              }
            />

            <MappingRow
              label="Late Fees"
              value={accounts.lateFees}
              onChange={(v) =>
                setAccounts({ ...accounts, lateFees: v })
              }
            />
          </div>
        </Card>

        {/* ACTIONS */}
        <div className="flex justify-end gap-3">
          <Button variant="ghost">Cancel</Button>
          {hasPermission('QuickBooks Sync', 'edit') && (
              <Button
                variant="primary"
                icon={CheckCircle}
                disabled={isSaveDisabled}
                onClick={handleSave}
              >
                Save Settings
              </Button>
          )}
        </div>

      </div>
    </MainLayout>
  );
};

/* SMALL HELPER COMPONENT */
const MappingRow = ({ label, value, onChange }) => (
  <div className="grid grid-cols-2 gap-4 items-center p-2 rounded-lg hover:bg-slate-50 transition-colors">
    <div className="text-sm font-medium text-slate-700">{label}</div>
    <select
      className="h-10 px-3 rounded-lg border border-slate-200 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white w-full transition-all text-slate-900"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">Select account…</option>
      <option value="income">Income Account</option>
      <option value="liability">Liability Account</option>
      <option value="other">Other Account</option>
    </select>
  </div>
);
