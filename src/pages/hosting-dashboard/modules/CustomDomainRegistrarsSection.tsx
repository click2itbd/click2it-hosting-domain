import React, { useState, useEffect } from 'react';
import { 
  Plus, Trash2, Edit2, CheckCircle2, Eye, EyeOff, Save, Plug, Shield, RefreshCw, 
  ExternalLink, Copy, Check, Info, AlertTriangle, Wallet, Server, Globe, Sliders
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../../firebase';
import { apiPost } from '../../../services/apiClient';

export interface CustomRegistrarItem {
  id: string;
  name: string;
  driver: 'resellerclub' | 'namecheap' | 'connectreseller' | 'generic_rest' | 'whmcs';
  username: string;
  apiKey: string;
  baseUrl: string;
  isSandbox: boolean;
  enabled: boolean;
  isPrimary: boolean;
  assignedTlds: string;
}

const DEFAULT_CUSTOM_REGISTRARS: CustomRegistrarItem[] = [
  {
    id: 'reg_resellerclub',
    name: 'ResellerClub / LogicBoxes',
    driver: 'resellerclub',
    username: '',
    apiKey: '',
    baseUrl: 'https://httpapi.com/api',
    isSandbox: false,
    enabled: false,
    isPrimary: false,
    assignedTlds: '.com, .net, .org, .in, .biz'
  },
  {
    id: 'reg_namecheap',
    name: 'Namecheap API',
    driver: 'namecheap',
    username: '',
    apiKey: '',
    baseUrl: 'https://api.namecheap.com/xml.response',
    isSandbox: false,
    enabled: false,
    isPrimary: false,
    assignedTlds: '.com, .io, .co, .dev, .me'
  },
  {
    id: 'reg_connectreseller',
    name: 'ConnectReseller',
    driver: 'connectreseller',
    username: '',
    apiKey: '',
    baseUrl: 'https://api.connectreseller.com/api',
    isSandbox: false,
    enabled: false,
    isPrimary: false,
    assignedTlds: '.com, .net, .org, .info'
  },
  {
    id: 'reg_generic',
    name: 'Custom WHMCS / REST Webhook API',
    driver: 'generic_rest',
    username: '',
    apiKey: '',
    baseUrl: 'https://api.your-custom-registrar.com/v1',
    isSandbox: false,
    enabled: false,
    isPrimary: false,
    assignedTlds: '*'
  }
];

export function CustomDomainRegistrarsSection() {
  const [registrars, setRegistrars] = useState<CustomRegistrarItem[]>(DEFAULT_CUSTOM_REGISTRARS);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [testResults, setTestResults] = useState<Record<string, any>>({});

  // Form for adding a new registrar
  const [newName, setNewName] = useState('');
  const [newDriver, setNewDriver] = useState<'resellerclub' | 'namecheap' | 'connectreseller' | 'generic_rest' | 'whmcs'>('resellerclub');
  const [newUsername, setNewUsername] = useState('');
  const [newApiKey, setNewApiKey] = useState('');
  const [newBaseUrl, setNewBaseUrl] = useState('');
  const [newAssignedTlds, setNewAssignedTlds] = useState('*');

  useEffect(() => {
    loadCustomRegistrars();
  }, []);

  const loadCustomRegistrars = async () => {
    try {
      const docSnap = await getDoc(doc(db, 'hosting_config', 'custom_registrars'));
      if (docSnap.exists() && Array.isArray(docSnap.data().items)) {
        const loaded = docSnap.data().items;
        if (loaded.length > 0) {
          setRegistrars(loaded);
        }
      }
    } catch (e) {
      console.warn('Failed to load custom domain registrars:', e);
    } finally {
      setLoading(false);
    }
  };

  const saveAllRegistrars = async (updatedItems: CustomRegistrarItem[], successMsg: string = 'Settings saved!') => {
    try {
      await setDoc(doc(db, 'hosting_config', 'custom_registrars'), {
        items: updatedItems,
        updatedAt: new Date().toISOString()
      });
      toast.success(successMsg);
    } catch (err: any) {
      toast.error('Failed to save registrar configuration');
    }
  };

  const handleUpdate = (id: string, field: keyof CustomRegistrarItem, value: any) => {
    setRegistrars(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const handleSaveOne = async (id: string) => {
    setSavingId(id);
    await saveAllRegistrars(registrars, 'Registrar configuration saved successfully');
    setSavingId(null);
  };

  const handleTestConnection = async (item: CustomRegistrarItem) => {
    setTestingId(item.id);
    setTestResults(prev => ({ ...prev, [item.id]: null }));

    try {
      if (!item.username || !item.apiKey) {
        toast.error('Please enter Username / Reseller ID and API Key before testing');
        setTestingId(null);
        return;
      }

      const res: any = await apiPost('/api/admin/domain/test-connection', {
        provider: item.driver,
        config: {
          name: item.name,
          driver: item.driver,
          username: item.username,
          apiKey: item.apiKey,
          baseUrl: item.baseUrl,
          isSandbox: item.isSandbox
        }
      });

      setTestResults(prev => ({ ...prev, [item.id]: res }));
      if (res.success) {
        toast.success(res.message || `Connected to ${item.name} successfully!`);
      } else {
        toast.error(res.message || 'Connection test failed');
      }
    } catch (e: any) {
      const errRes = { success: false, message: e.message };
      setTestResults(prev => ({ ...prev, [item.id]: errRes }));
      toast.error(`Connection error: ${e.message}`);
    } finally {
      setTestingId(null);
    }
  };

  const handleRemoveRegistrar = async (id: string) => {
    if (!confirm('Are you sure you want to remove this domain registrar configuration?')) return;
    const updated = registrars.filter(r => r.id !== id);
    setRegistrars(updated);
    await saveAllRegistrars(updated, 'Registrar removed');
  };

  const handleAddNewRegistrarSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newItem: CustomRegistrarItem = {
      id: `reg_custom_${Date.now()}`,
      name: newName || 'New Registrar API',
      driver: newDriver,
      username: newUsername,
      apiKey: newApiKey,
      baseUrl: newBaseUrl || (newDriver === 'resellerclub' ? 'https://httpapi.com/api' : 'https://api.example-registrar.com/v1'),
      isSandbox: false,
      enabled: true,
      isPrimary: false,
      assignedTlds: newAssignedTlds || '*'
    };

    const updated = [...registrars, newItem];
    setRegistrars(updated);
    setShowAddModal(false);
    
    // Reset form
    setNewName('');
    setNewUsername('');
    setNewApiKey('');
    setNewBaseUrl('');
    setNewAssignedTlds('*');

    await saveAllRegistrars(updated, `🎉 Added ${newItem.name} API successfully!`);
  };

  return (
    <div className="space-y-6 pt-4 border-t border-slate-200">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-extrabold text-slate-800 flex items-center gap-2">
            <Plug className="text-indigo-600" size={22} />
            Additional & Custom Domain Registrar APIs
          </h3>
          <p className="text-slate-500 text-xs mt-1 max-w-2xl">
            Configure external domain registrar APIs (ResellerClub, Namecheap, ConnectReseller, or Generic REST/WHMCS Webhook) for automated TLD availability checks, registration, and renewal.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all shrink-0 cursor-pointer"
        >
          <Plus size={16} /> Add Custom Registrar API
        </button>
      </div>

      {/* List of Custom Registrar Cards */}
      <div className="space-y-6">
        {registrars.map((item) => {
          const showKey = showKeys[item.id] || false;
          const isSaving = savingId === item.id;
          const isTesting = testingId === item.id;
          const testRes = testResults[item.id];

          return (
            <div 
              key={item.id} 
              className={`border-2 rounded-2xl overflow-hidden transition-all bg-white ${
                item.enabled ? 'border-slate-200 shadow-sm' : 'border-slate-100 opacity-75'
              }`}
            >
              {/* Card Header */}
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm">
                    <Globe size={18} />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
                      {item.name}
                      <span className="text-[10px] uppercase font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                        {item.driver}
                      </span>
                    </h4>
                    <span className="text-xs text-slate-500 font-mono">
                      Assigned TLDs: {item.assignedTlds || '*'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={item.enabled}
                      onChange={(e) => handleUpdate(item.id, 'enabled', e.target.checked)}
                      className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                    />
                    <span className="text-xs font-bold text-slate-700">Enabled</span>
                  </label>

                  <button
                    onClick={() => handleRemoveRegistrar(item.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    title="Remove registrar"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-6 space-y-4 text-xs">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-slate-600 font-bold block mb-1">Registrar Display Name</label>
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => handleUpdate(item.id, 'name', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-slate-600 font-bold block mb-1">Provider Driver Type</label>
                    <select
                      value={item.driver}
                      onChange={(e) => handleUpdate(item.id, 'driver', e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="resellerclub">ResellerClub / LogicBoxes (HTTP API)</option>
                      <option value="namecheap">Namecheap (XML API)</option>
                      <option value="connectreseller">ConnectReseller (REST API)</option>
                      <option value="generic_rest">Generic REST / Custom Webhook API</option>
                      <option value="whmcs">WHMCS Registrar Module API</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-slate-600 font-bold block mb-1">Username / Reseller ID / API User</label>
                    <input
                      type="text"
                      value={item.username}
                      onChange={(e) => handleUpdate(item.id, 'username', e.target.value)}
                      placeholder="e.g. 123456 or api_user_click2it"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="relative">
                    <label className="text-slate-600 font-bold block mb-1">API Key / Secret Token / Password</label>
                    <input
                      type={showKey ? 'text' : 'password'}
                      value={item.apiKey}
                      onChange={(e) => handleUpdate(item.id, 'apiKey', e.target.value)}
                      placeholder="e.g. secret_api_token_..."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKeys(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                      className="absolute right-3 top-7 text-slate-400 hover:text-slate-600"
                    >
                      {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="text-slate-600 font-bold block mb-1">Base Endpoint URL</label>
                    <input
                      type="text"
                      value={item.baseUrl}
                      onChange={(e) => handleUpdate(item.id, 'baseUrl', e.target.value)}
                      placeholder="e.g. https://httpapi.com/api"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-slate-600 font-bold block mb-1">Assigned TLD Extensions</label>
                    <input
                      type="text"
                      value={item.assignedTlds}
                      onChange={(e) => handleUpdate(item.id, 'assignedTlds', e.target.value)}
                      placeholder=".com, .net or *"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Sandbox Toggle */}
                <div className="flex items-center gap-3 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={item.isSandbox}
                      onChange={(e) => handleUpdate(item.id, 'isSandbox', e.target.checked)}
                      className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                    />
                    <span className="text-xs font-bold text-slate-700">Sandbox / Testing Mode</span>
                  </label>
                </div>

                {/* Test Results Output */}
                {testRes && (
                  <div className={`p-3.5 rounded-xl border flex items-start gap-2.5 ${
                    testRes.success ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-red-50 border-red-200 text-red-900'
                  }`}>
                    {testRes.success ? (
                      <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle size={16} className="text-red-600 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 text-xs">
                      <p className="font-bold">{testRes.message}</p>
                      {testRes.balance !== undefined && (
                        <p className="mt-1 font-mono text-[11px] text-emerald-700">
                          Reseller Balance: {testRes.balance} {testRes.currency || 'USD'}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => handleSaveOne(item.id)}
                    disabled={isSaving}
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-60"
                  >
                    <Save size={15} /> {isSaving ? 'Saving...' : 'Save Configuration'}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTestConnection(item)}
                    disabled={isTesting}
                    className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center gap-1.5 transition-colors border border-slate-200 disabled:opacity-60"
                  >
                    {isTesting ? <RefreshCw size={15} className="animate-spin" /> : <Plug size={15} />}
                    Test Connection
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add New Registrar Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Plus size={20} className="text-indigo-600" />
                Add New Domain Registrar API
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>

            <form onSubmit={handleAddNewRegistrarSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Registrar Name</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. ResellerClub International"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Provider Driver</label>
                  <select
                    value={newDriver}
                    onChange={(e) => {
                      const d = e.target.value as any;
                      setNewDriver(d);
                      if (d === 'resellerclub') setNewBaseUrl('https://httpapi.com/api');
                      else if (d === 'namecheap') setNewBaseUrl('https://api.namecheap.com/xml.response');
                      else if (d === 'connectreseller') setNewBaseUrl('https://api.connectreseller.com/api');
                      else setNewBaseUrl('https://api.your-custom-registrar.com/v1');
                    }}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="resellerclub">ResellerClub / LogicBoxes</option>
                    <option value="namecheap">Namecheap XML API</option>
                    <option value="connectreseller">ConnectReseller REST API</option>
                    <option value="generic_rest">Generic REST / Custom Webhook</option>
                    <option value="whmcs">WHMCS Registrar Module API</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Assigned TLD Extensions</label>
                  <input
                    type="text"
                    value={newAssignedTlds}
                    onChange={(e) => setNewAssignedTlds(e.target.value)}
                    placeholder="e.g. .com, .net or *"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Username / Reseller ID / API User</label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="e.g. 123456 or api_user_click2it"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">API Key / Password / Secret Token</label>
                <input
                  type="password"
                  value={newApiKey}
                  onChange={(e) => setNewApiKey(e.target.value)}
                  placeholder="e.g. secret_api_key_or_password"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Base Endpoint URL</label>
                <input
                  type="text"
                  value={newBaseUrl}
                  onChange={(e) => setNewBaseUrl(e.target.value)}
                  placeholder="e.g. https://httpapi.com/api"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl shadow-md transition-colors"
                >
                  Add Registrar API
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
