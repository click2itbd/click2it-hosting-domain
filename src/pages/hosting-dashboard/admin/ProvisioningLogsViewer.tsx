import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { db } from '../../../firebase';
import { toast } from 'react-hot-toast';
import { Search, ChevronDown, ChevronRight, CheckCircle, XCircle, Server, Plug } from 'lucide-react';

interface ProvisioningLog {
  id: string;
  targetType: 'domain' | 'hosting';
  targetId: string;
  action: string;
  provider: string;
  requestPayload?: any;
  responsePayload?: any;
  success: boolean;
  errorMessage?: string;
  createdAt: string;
}

export const ProvisioningLogsViewer: React.FC = () => {
  const [logs, setLogs] = useState<ProvisioningLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [targetFilter, setTargetFilter] = useState<string>('all');

  useEffect(() => {
    const q = query(collection(db, 'provisioningLogs'), orderBy('createdAt', 'desc'), limit(200));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as ProvisioningLog));
      setLogs(data);
      setLoading(false);
    }, (err) => {
      console.error('Error loading provisioning logs:', err);
      toast.error('Failed to load provisioning logs');
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.targetId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.provider.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTarget = targetFilter === 'all' || log.targetType === targetFilter;
    return matchesSearch && matchesTarget;
  });

  const formatJson = (obj: any) => {
    try {
      return JSON.stringify(obj, null, 2);
    } catch {
      return String(obj);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 border-4 border-[#EF4444] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by target ID, action, or provider..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-md text-sm focus:ring-2 focus:ring-[#7B61FF] focus:border-[#7B61FF]"
            />
          </div>
          <div className="flex items-center gap-2">
            <select
              value={targetFilter}
              onChange={(e) => setTargetFilter(e.target.value)}
              className="border border-gray-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-[#7B61FF] focus:border-[#7B61FF]"
            >
              <option value="all">All Types</option>
              <option value="domain">Domain</option>
              <option value="hosting">Hosting</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[#081621] text-white text-xs uppercase">
              <tr>
                <th className="px-6 py-4 w-10"></th>
                <th className="px-6 py-4">Timestamp</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Target ID</th>
                <th className="px-6 py-4">Action</th>
                <th className="px-6 py-4">Provider</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredLogs.map((log) => {
                const isExpanded = expandedRows.has(log.id);
                return (
                  <React.Fragment key={log.id}>
                    <tr className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => toggleRow(log.id)}>
                      <td className="px-6 py-4">
                        {isExpanded ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold ${
                          log.targetType === 'domain' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                        }`}>
                          {log.targetType === 'domain' ? <Plug size={12} /> : <Server size={12} />}
                          {log.targetType}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-mono text-gray-600">{log.targetId}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{log.action}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{log.provider}</td>
                      <td className="px-6 py-4">
                        {log.success ? (
                          <span className="inline-flex items-center gap-1 text-green-600">
                            <CheckCircle size={16} /> Success
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-red-600">
                            <XCircle size={16} /> Failed
                          </span>
                        )}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-gray-50">
                        <td colSpan={7} className="px-6 py-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <div className="text-xs font-bold text-gray-500 uppercase mb-2">Request Payload</div>
                              <pre className="bg-[#081621] text-green-400 p-4 rounded-lg text-xs overflow-x-auto max-h-96 overflow-y-auto">
                                {log.requestPayload ? formatJson(log.requestPayload) : 'No payload'}
                              </pre>
                            </div>
                            <div>
                              <div className="text-xs font-bold text-gray-500 uppercase mb-2">Response Payload</div>
                              <pre className="bg-[#081621] text-green-400 p-4 rounded-lg text-xs overflow-x-auto max-h-96 overflow-y-auto">
                                {log.responsePayload ? formatJson(log.responsePayload) : 'No response'}
                              </pre>
                            </div>
                          </div>
                          {log.errorMessage && (
                            <div className="mt-4">
                              <div className="text-xs font-bold text-red-500 uppercase mb-2">Error Message</div>
                              <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm">
                                {log.errorMessage}
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-400 italic">
                    No provisioning logs found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
