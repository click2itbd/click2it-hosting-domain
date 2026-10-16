import React, { useState, useEffect } from 'react';
import {
  Server, Plus, Trash2, Edit2, HardDrive, Network, Link as LinkIcon, Cpu, Activity, Copy, Check, Search, PlusCircle, AlertCircle
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { toast } from 'react-hot-toast';
import {
  collection, getDocs, addDoc, updateDoc, deleteDoc, doc,
  serverTimestamp, query, orderBy
} from 'firebase/firestore';
import { db } from '../../../firebase';
import { Modal } from '../components/SharedUI';

export function ServersModule() {
  const [servers, setServers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', hostname: '', ip: '', type: 'shared', whmUrl: '', status: 'active' });
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchServers = async () => {
    try {
      const snap = await getDocs(query(collection(db, 'servers'), orderBy('createdAt', 'desc')));
      setServers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch {
      toast.error('Failed to load servers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServers();
  }, []);

  const openAdd = () => {
    setEditing(null);
    setForm({ name: '', hostname: '', ip: '', type: 'shared', whmUrl: '', status: 'active' });
    setShowModal(true);
  };

  const openEdit = (svr) => {
    setEditing(svr.id);
    setForm({
      name: svr.name || '',
      hostname: svr.hostname || '',
      ip: svr.ip || '',
      type: svr.type || 'shared',
      whmUrl: svr.whmUrl || '',
      status: svr.status || 'active'
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await updateDoc(doc(db, 'servers', editing), form);
        toast.success('Server updated');
      } else {
        await addDoc(collection(db, 'servers'), { ...form, createdAt: serverTimestamp() });
        toast.success('Server added');
      }
      setShowModal(false);
      fetchServers();
    } catch {
      toast.error('Failed to save server');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this server? This action cannot be undone.')) return;
    try {
      await deleteDoc(doc(db, 'servers', id));
      toast.success('Server deleted');
      setServers(s => s.filter(x => x.id !== id));
    } catch {
      toast.error('Failed to delete server');
    }
  };

  const copyToClipboard = (text, id) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(''), 2000);
    toast.success('Copied to clipboard');
  };

  const getStatusColor = (status) => {
    if (status === 'active') return 'bg-emerald-500 shadow-emerald-500/30';
    if (status === 'maintenance') return 'bg-amber-500 shadow-amber-500/30';
    return 'bg-rose-500 shadow-rose-500/30';
  };

  const getTypeIcon = (type) => {
    if (type === 'vps') return <Cpu size={20} className="text-indigo-500" />;
    if (type === 'dedicated') return <HardDrive size={20} className="text-rose-500" />;
    return <Server size={20} className="text-sky-500" />;
  };

  const filteredServers = servers.filter(s => 
    (s.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (s.hostname || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.ip || '').includes(searchTerm)
  );

  return (
    <div className="bg-white/40 backdrop-blur-xl rounded-3xl shadow-sm border border-slate-200/60 p-6 md:p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-sky-500 rounded-xl shadow-lg shadow-indigo-200">
              <Server className="text-white" size={24} />
            </div>
            Server Configurations
          </h2>
          <p className="text-slate-500 text-sm mt-1 ml-14">Manage and monitor your hosting infrastructure</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <input 
              type="text" 
              placeholder="Search servers..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          </div>
          <button onClick={openAdd} className="bg-slate-900 hover:bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all duration-300 shadow-md hover:shadow-xl hover:shadow-indigo-200 hover:-translate-y-0.5 whitespace-nowrap">
            <Plus size={18} /> Add New
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-64 bg-slate-100 rounded-2xl animate-pulse"></div>
          ))}
        </div>
      ) : servers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 px-4 text-center bg-slate-50/50 rounded-3xl border border-dashed border-slate-300">
          <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100 mb-6">
            <Server size={40} className="text-slate-300" />
          </div>
          <h3 className="text-xl font-bold text-slate-700 mb-2">No Servers Configured</h3>
          <p className="text-slate-500 max-w-md mx-auto mb-8">You haven't configured any servers yet. Add your first server to start provisioning hosting accounts to your customers.</p>
          <button onClick={openAdd} className="bg-white text-indigo-600 border-2 border-indigo-100 hover:border-indigo-600 hover:bg-indigo-50 px-6 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2">
            <PlusCircle size={18} /> Configure First Server
          </button>
        </div>
      ) : filteredServers.length === 0 ? (
        <div className="text-center py-16 bg-slate-50/50 rounded-2xl border border-slate-100">
          <AlertCircle size={32} className="mx-auto text-slate-400 mb-3" />
          <p className="text-slate-500 font-medium">No servers found matching "{searchTerm}"</p>
          <button onClick={() => setSearchTerm('')} className="mt-3 text-indigo-600 hover:text-indigo-800 font-semibold text-sm">Clear search</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredServers.map(svr => (
            <div key={svr.id} className="group bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 hover:border-indigo-200 transition-all duration-300 overflow-hidden flex flex-col relative">
              
              {/* Colored top border depending on status */}
              <div className={cn("h-1 w-full", svr.status === 'active' ? 'bg-emerald-500' : svr.status === 'maintenance' ? 'bg-amber-500' : 'bg-rose-500')}></div>
              
              <div className="p-5 border-b border-slate-100 flex justify-between items-start bg-slate-50/30">
                <div className="flex items-start gap-3.5">
                  <div className="mt-0.5 p-2 bg-white rounded-lg border border-slate-100 shadow-sm">{getTypeIcon(svr.type)}</div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-lg leading-tight">{svr.name}</h4>
                    <span className="inline-flex items-center gap-1.5 mt-1.5 px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      <span className={cn('w-1.5 h-1.5 rounded-full shadow-sm', getStatusColor(svr.status))}></span>
                      {svr.status}
                    </span>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(svr)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                    <Edit2 size={16} />
                  </button>
                  <button onClick={() => handleDelete(svr.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              
              <div className="p-5 flex-1 space-y-4">
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5"><Network size={13} /> Hostname</p>
                  <div className="flex items-center justify-between bg-slate-50/80 rounded-lg p-2.5 border border-slate-100 group/item hover:border-slate-300 transition-colors">
                    <span className="text-sm font-semibold text-slate-700 font-mono truncate">{svr.hostname || 'Not configured'}</span>
                    <button onClick={() => copyToClipboard(svr.hostname, svr.id + 'host')} className="text-slate-400 hover:text-indigo-600 opacity-0 group-hover/item:opacity-100 transition-opacity">
                      {copied === svr.id + 'host' ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
                
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5"><Activity size={13} /> IPv4 Address</p>
                  <div className="flex items-center justify-between bg-slate-50/80 rounded-lg p-2.5 border border-slate-100 group/item hover:border-slate-300 transition-colors">
                    <span className="text-sm font-semibold text-slate-700 font-mono">{svr.ip || 'Not configured'}</span>
                    <button onClick={() => copyToClipboard(svr.ip, svr.id + 'ip')} className="text-slate-400 hover:text-indigo-600 opacity-0 group-hover/item:opacity-100 transition-opacity">
                      {copied === svr.id + 'ip' ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="p-4 bg-slate-50/80 border-t border-slate-100 flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-200/50 px-2.5 py-1 rounded-md">{svr.type}</span>
                {svr.whmUrl ? (
                  <a href={svr.whmUrl} target="_blank" rel="noreferrer" className="text-xs font-bold text-indigo-600 flex items-center gap-1 hover:text-indigo-800 transition-colors bg-indigo-50 px-3 py-1.5 rounded-lg">
                    Open Panel <LinkIcon size={12} />
                  </a>
                ) : (
                  <span className="text-[11px] text-slate-400 font-medium">No Control Panel</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Server Configuration' : 'Configure New Server'} maxWidth="max-w-2xl">
        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* General Settings */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Server Name <span className="text-rose-500">*</span></label>
                <input required type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-medium transition-all outline-none" placeholder="e.g. US-East Node 1" />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Hostname</label>
                <input type="text" value={form.hostname} onChange={e => setForm(f => ({ ...f, hostname: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-medium transition-all outline-none" placeholder="e.g. node1.yourdomain.com" />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">IP Address</label>
                <input type="text" value={form.ip} onChange={e => setForm(f => ({ ...f, ip: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-medium transition-all outline-none" placeholder="192.168.1.1" />
              </div>
            </div>

            {/* Config & Panel */}
            <div className="space-y-4 md:border-l border-slate-100 md:pl-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Server Type</label>
                <div className="relative">
                  <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-medium transition-all appearance-none outline-none">
                    <option value="shared">Shared Hosting Node</option>
                    <option value="vps">VPS Hypervisor</option>
                    <option value="dedicated">Dedicated Server</option>
                  </select>
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    {form.type === 'vps' ? <Cpu size={16} /> : form.type === 'dedicated' ? <HardDrive size={16} /> : <Server size={16} />}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Control Panel URL</label>
                <input type="url" value={form.whmUrl} onChange={e => setForm(f => ({ ...f, whmUrl: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-medium transition-all outline-none" placeholder="https://yourserver:2087" />
                <p className="text-[10px] font-semibold text-slate-400 mt-1.5 uppercase">Used for quick access to WHM / cPanel</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Status</label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-medium transition-all outline-none">
                  <option value="active">🟢 Active (Accepting New Accounts)</option>
                  <option value="maintenance">🟡 Maintenance</option>
                  <option value="offline">🔴 Offline</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
            <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors rounded-xl font-bold">Cancel</button>
            <button type="submit" disabled={saving} className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:shadow-indigo-300 hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:hover:translate-y-0">
              {saving ? 'Saving...' : editing ? 'Update Server' : 'Add Server'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
