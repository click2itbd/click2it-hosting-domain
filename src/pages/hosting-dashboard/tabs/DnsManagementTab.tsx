import React, { useState, useEffect } from 'react';
import { Globe, Database, Plus, RefreshCw, Edit2, Trash2 } from 'lucide-react';
import { apiGet } from '../../../services/apiClient';
import { toast } from 'react-hot-toast';

export function DnsManagementTab({ state }) {
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (state.activeTab === 'dns-management') {
      fetchZones();
    }
  }, [state.activeTab]);

  const fetchZones = async () => {
    setLoading(true);
    try {
      const res: any = await apiGet('/api/dns/zones');
      if (res.success) {
        setZones(Array.isArray(res.data) ? res.data : []);
      } else {
        toast.error(res.error || 'Failed to fetch DNS zones');
      }
    } catch (e: any) {
      toast.error('API Error: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  if (state.activeTab !== 'dns-management') return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shrink-0">
              <Globe size={32} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Advanced DNS Management</h1>
              <p className="text-slate-500 mt-1">Manage DNS Zones, A, CNAME, TXT, and MX records via Openprovider.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={fetchZones} disabled={loading} className="p-3 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-600 transition-colors">
              <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
            <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-colors">
              <Plus size={20} /> Add DNS Zone
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 min-h-[400px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <RefreshCw size={32} className="animate-spin mb-4" />
            <p>Fetching DNS Zones...</p>
          </div>
        ) : zones.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Database size={64} className="text-slate-200 mb-6" />
            <h3 className="text-xl font-bold text-slate-700">No DNS Zones Found</h3>
            <p className="text-slate-500 max-w-md mt-3 mb-6">
              You do not have any DNS zones managed through Openprovider yet. Click "Add DNS Zone" to create one.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-600 text-sm">
                <tr>
                  <th className="p-4 rounded-tl-xl">Domain Name</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Records Count</th>
                  <th className="p-4 rounded-tr-xl">Actions</th>
                </tr>
              </thead>
              <tbody>
                {zones.map((zone: any) => (
                  <tr key={zone.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="p-4 font-bold text-slate-700">{zone.name}</td>
                    <td className="p-4">
                      <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded">
                        {zone.status || 'ACT'}
                      </span>
                    </td>
                    <td className="p-4 text-slate-600">{zone.records || 0} Records</td>
                    <td className="p-4 flex gap-2">
                      <button className="p-2 bg-blue-50 text-blue-600 rounded hover:bg-blue-100" title="Manage Records">
                        <Edit2 size={16} />
                      </button>
                      <button className="p-2 bg-red-50 text-red-600 rounded hover:bg-red-100" title="Delete Zone">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

