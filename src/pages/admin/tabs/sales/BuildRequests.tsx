import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../../../firebase';
import { toast } from 'react-hot-toast';
import { CheckCircle, Clock, Trash2, Mail, Phone } from 'lucide-react';

export const BuildRequestsTab = () => {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'buildRequests'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snap) => {
      setRequests(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'buildRequests', id), { status: newStatus });
      toast.success('Status updated');
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this request?')) return;
    try {
      await deleteDoc(doc(db, 'buildRequests', id));
      toast.success('Request deleted');
    } catch (err) {
      toast.error('Failed to delete request');
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading requests...</div>;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-100 flex justify-between items-center">
        <h2 className="text-xl font-bold text-slate-800">Custom PC Build Requests</h2>
        <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-sm font-bold">
          Total: {requests.length}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 text-slate-600 text-sm">
            <tr>
              <th className="px-6 py-4 text-left font-bold">Date</th>
              <th className="px-6 py-4 text-left font-bold">Customer Info</th>
              <th className="px-6 py-4 text-left font-bold">Requirements</th>
              <th className="px-6 py-4 text-left font-bold">Status</th>
              <th className="px-6 py-4 text-right font-bold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {requests.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">No requests found.</td></tr>
            ) : (
              requests.map(req => (
                <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                    {new Date(req.createdAt).toLocaleDateString()}<br/>
                    <span className="text-xs text-slate-400">{new Date(req.createdAt).toLocaleTimeString()}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-900">{req.name}</div>
                    <div className="flex items-center gap-1 text-sm text-slate-500 mt-1">
                      <Phone size={12} /> {req.phone}
                    </div>
                  </td>
                  <td className="px-6 py-4 max-w-xs">
                    <p className="text-sm text-slate-600 whitespace-pre-wrap">{req.details}</p>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {req.status === 'pending' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-600">
                        <Clock size={12} /> Pending
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-green-50 text-green-600">
                        <CheckCircle size={12} /> Contacted
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-2">
                      {req.status === 'pending' ? (
                        <button onClick={() => handleStatusUpdate(req.id, 'contacted')} className="p-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors" title="Mark as Contacted">
                          <CheckCircle size={16} />
                        </button>
                      ) : (
                        <button onClick={() => handleStatusUpdate(req.id, 'pending')} className="p-2 text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors" title="Mark as Pending">
                          <Clock size={16} />
                        </button>
                      )}
                      <button onClick={() => handleDelete(req.id)} className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors" title="Delete">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
