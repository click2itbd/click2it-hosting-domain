import React, { useState, useEffect } from 'react';
import { Tag, RefreshCw, Trash2, Plus, Save } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../../firebase';
import { apiPost } from '../../../services/apiClient';

export function DomainPricingModule() {
  const [pricing, setPricing] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [newTld, setNewTld] = useState({ tld: '', registerPrice: '', renewPrice: '', transferPrice: '' });

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'domainPricing'), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setPricing(data);
      setLoading(false);
    }, () => {
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSync = async () => {
    if (pricing.length === 0) return toast.error('Add some TLDs first to sync.');
    setSyncing(true);
    try {
      const tlds = pricing.map(p => p.tld);
      const res: any = await apiPost('/api/domains/sync-pricing', { tlds });
      if (res.success) {
        toast.success(`Successfully synced ${res.synced.length} TLDs from Openprovider!`);
      } else {
        toast.error(res.error || 'Failed to sync');
      }
    } catch (e: any) {
      toast.error(e.message || 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const handleAdd = async () => {
    if (!newTld.tld) return toast.error('TLD is required');
    try {
      let formattedTld = newTld.tld.startsWith('.') ? newTld.tld : '.' + newTld.tld;
      const id = formattedTld.replace('.', '');
      await setDoc(doc(db, 'domainPricing', id), {
        tld: formattedTld,
        registerPrice: Number(newTld.registerPrice) || 0,
        renewPrice: Number(newTld.renewPrice) || 0,
        transferPrice: Number(newTld.transferPrice) || 0,
        currency: 'BDT',
        isActive: true,
        updatedAt: new Date().toISOString()
      });
      setNewTld({ tld: '', registerPrice: '', renewPrice: '', transferPrice: '' });
      toast.success('TLD Added');
    } catch (e: any) {
      toast.error('Failed to add TLD');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure?')) {
      await deleteDoc(doc(db, 'domainPricing', id));
      toast.success('Deleted');
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200">
      <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
            <Tag size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Domain Pricing</h2>
            <p className="text-sm text-slate-500">Manage TLD pricing & sync with provider.</p>
          </div>
        </div>
        <button 
          onClick={handleSync} 
          disabled={syncing}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition disabled:opacity-70"
        >
          <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
          {syncing ? 'Syncing...' : 'Sync Prices via API'}
        </button>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-5 gap-4 mb-6">
          <input type="text" placeholder=".com" value={newTld.tld} onChange={e => setNewTld({...newTld, tld: e.target.value})} className="border p-2 rounded" />
          <input type="number" placeholder="Register Price" value={newTld.registerPrice} onChange={e => setNewTld({...newTld, registerPrice: e.target.value})} className="border p-2 rounded" />
          <input type="number" placeholder="Renew Price" value={newTld.renewPrice} onChange={e => setNewTld({...newTld, renewPrice: e.target.value})} className="border p-2 rounded" />
          <input type="number" placeholder="Transfer Price" value={newTld.transferPrice} onChange={e => setNewTld({...newTld, transferPrice: e.target.value})} className="border p-2 rounded" />
          <button onClick={handleAdd} className="bg-blue-600 text-white rounded p-2 flex justify-center items-center gap-2 hover:bg-blue-700"><Plus size={18} /> Add TLD</button>
        </div>

        <table className="w-full text-left">
          <thead className="bg-slate-50 text-slate-600 text-sm">
            <tr>
              <th className="p-3">TLD</th>
              <th className="p-3">Register</th>
              <th className="p-3">Renew</th>
              <th className="p-3">Transfer</th>
              <th className="p-3">Base Cost (USD)</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pricing.map((p, i) => (
              <tr key={i} className="border-t border-slate-100">
                <td className="p-3 font-bold text-slate-700">{p.tld}</td>
                <td className="p-3">{p.registerPrice} {p.currency}</td>
                <td className="p-3">{p.renewPrice} {p.currency}</td>
                <td className="p-3">{p.transferPrice} {p.currency}</td>
                <td className="p-3 text-slate-500">{p.supplierPriceUsd ? '$' + p.supplierPriceUsd : '-'}</td>
                <td className="p-3">
                  <button onClick={() => handleDelete(p.id)} className="text-red-500 hover:bg-red-50 p-2 rounded"><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
            {pricing.length === 0 && (
              <tr><td colSpan={6} className="p-6 text-center text-slate-500">No TLD pricing configured.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
