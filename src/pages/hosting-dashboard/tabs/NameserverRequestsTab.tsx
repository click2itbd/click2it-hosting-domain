import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, updateDoc, doc, query, orderBy } from 'firebase/firestore';
import { db } from '../../../firebase';
import { toast } from 'react-hot-toast';
import { Server, CheckCircle, Clock } from 'lucide-react';

export const NameserverRequestsTab: React.FC<{ state: any }> = ({ state }) => {
  const [requests, setRequests] = useState<any[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'nameserver_requests'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setRequests(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsubscribe();
  }, []);

  const handleApprove = async (req: any) => {
    try {
      // Mark request as approved
      await updateDoc(doc(db, 'nameserver_requests', req.id), { status: 'approved', updatedAt: new Date().toISOString() });
      // Update actual domain order
      if (req.domainId) {
        await updateDoc(doc(db, 'domainOrders', req.domainId), {
          nameservers: req.requestedNs,
          nsUpdatePending: false
        });
      }
      toast.success("Nameservers updated successfully in the system!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to approve request");
    }
  };

  if (state.activeTab !== 'ns-requests') return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Server className="text-blue-600" />
            .BD Nameserver Requests
          </h2>
          <p className="text-gray-500 text-sm mt-1">Manual updates required for BTCL domains</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="px-6 py-4">Domain</th>
              <th className="px-6 py-4">Requested NS</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {requests.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-8 text-gray-500">No requests found.</td></tr>
            ) : requests.map(req => (
              <tr key={req.id}>
                <td className="px-6 py-4 font-bold text-[#0E2A47]">{req.domainName}</td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {req.requestedNs?.map((ns: string, i: number) => <div key={i}>{ns}</div>)}
                </td>
                <td className="px-6 py-4">
                  {req.status === 'pending' ? (
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-bold">Pending BTCL</span>
                  ) : (
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-bold">Approved</span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {new Date(req.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-right">
                  {req.status === 'pending' && (
                    <button 
                      onClick={() => handleApprove(req)}
                      className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm font-bold hover:bg-blue-700 transition"
                    >
                      Approve & Sync
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
