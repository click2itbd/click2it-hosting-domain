import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { Loader2, Server, Terminal, AlertTriangle, CheckCircle, Info } from 'lucide-react';

export const ApiLogsTab = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'apiLogs'), orderBy('timestamp', 'desc'), limit(50));
      const snap = await getDocs(q);
      const fetchedLogs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLogs(fetchedLogs);
    } catch (error) {
      console.error('Error fetching API logs:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
        <div className="flex items-center gap-3">
          <Terminal className="text-gray-600" size={24} />
          <div>
            <h3 className="text-lg font-bold text-gray-800">API Logs</h3>
            <p className="text-sm text-gray-500">Monitor Openprovider API activity and errors</p>
          </div>
        </div>
        <button 
          onClick={fetchLogs}
          className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 flex items-center gap-2"
        >
          <Server size={16} /> Refresh
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-600 border-b border-gray-100">
            <tr>
              <th className="px-6 py-4 font-semibold">Time</th>
              <th className="px-6 py-4 font-semibold">Action</th>
              <th className="px-6 py-4 font-semibold">Domain</th>
              <th className="px-6 py-4 font-semibold">Environment</th>
              <th className="px-6 py-4 font-semibold">Status / Response</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                  No API logs found.
                </td>
              </tr>
            ) : (
              logs.map(log => {
                const response = log.response || {};
                const isSuccess = JSON.stringify(response).toLowerCase().includes('success');
                const isError = JSON.stringify(response).toLowerCase().includes('error');
                
                return (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                      {log.timestamp ? new Date(log.timestamp.seconds * 1000).toLocaleString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-medium text-gray-800 bg-gray-100 px-2 py-1 rounded">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {log.domain || '-'}
                    </td>
                    <td className="px-6 py-4">
                      {log.isSandbox ? (
                        <span className="text-xs font-bold text-yellow-700 bg-yellow-100 px-2 py-1 rounded-full">Sandbox</span>
                      ) : (
                        <span className="text-xs font-bold text-green-700 bg-green-100 px-2 py-1 rounded-full">Live</span>
                      )}
                    </td>
                    <td className="px-6 py-4 max-w-md">
                      <div className="flex items-start gap-2">
                        {isError ? (
                          <AlertTriangle size={16} className="text-red-500 mt-0.5 shrink-0" />
                        ) : isSuccess ? (
                          <CheckCircle size={16} className="text-green-500 mt-0.5 shrink-0" />
                        ) : (
                          <Info size={16} className="text-blue-500 mt-0.5 shrink-0" />
                        )}
                        <pre className="text-[10px] text-gray-600 bg-gray-100 p-2 rounded overflow-x-auto whitespace-pre-wrap max-h-32">
                          {JSON.stringify(response, null, 2)}
                        </pre>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
