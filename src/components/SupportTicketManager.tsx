import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { SupportTicket } from '../types';
import { toast } from 'react-hot-toast';
import { Plus, Trash2, LifeBuoy } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const SupportTicketManager: React.FC = () => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newTicket, setNewTicket] = useState<Partial<SupportTicket>>({
    title: '',
    description: '',
    type: 'technical',
    status: 'open',
    customerName: '',
    customerEmail: '',
  });
  const { user } = useAuth();

  useEffect(() => {
    fetchTickets();
  }, [user]);

  const fetchTickets = async () => {
    try {
      const q = query(collection(db, 'support_tickets'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const fetchedTickets = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SupportTicket[];
      setTickets(fetchedTickets);
    } catch (error) {
      console.error('Error fetching support tickets:', error);
      toast.error('Failed to load support tickets');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicket.title) return;

    try {
      const ticketData = {
        ...newTicket,
        userId: user?.uid || null,
        createdAt: new Date().toISOString(),
      };
      const docRef = await addDoc(collection(db, 'support_tickets'), ticketData);
      setTickets([{ id: docRef.id, ...ticketData } as SupportTicket, ...tickets]);
      setIsAdding(false);
      setNewTicket({
        title: '',
        description: '',
        type: 'technical',
        status: 'open',
        customerName: '',
        customerEmail: '',
      });
      toast.success('Ticket added successfully');
    } catch (error) {
      console.error('Error adding ticket:', error);
      toast.error('Failed to add ticket');
    }
  };

  const handleDeleteTicket = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this ticket?')) return;
    try {
      await deleteDoc(doc(db, 'support_tickets', id));
      setTickets(tickets.filter(t => t.id !== id));
      toast.success('Ticket deleted successfully');
    } catch (error) {
      console.error('Error deleting ticket:', error);
      toast.error('Failed to delete ticket');
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'support_tickets', id), { status: newStatus });
      setTickets(tickets.map(t => t.id === id ? { ...t, status: newStatus as any } : t));
      toast.success('Ticket status updated');
    } catch (error) {
      console.error('Error updating ticket:', error);
      toast.error('Failed to update ticket status');
    }
  };

  const getTypeBadgeColor = (type: string) => {
    switch(type) {
      case 'maintenance': return 'bg-amber-100 text-amber-800';
      case 'technical': return 'bg-blue-100 text-blue-800';
      case 'bill': return 'bg-emerald-100 text-emerald-800';
      case 'sales': return 'bg-purple-100 text-purple-800';
      case 'complaints': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-6 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <LifeBuoy className="text-indigo-600" /> Support Tickets
        </h2>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-md font-bold text-sm flex items-center gap-2 hover:bg-indigo-700 transition"
        >
          <Plus size={16} /> New Ticket
        </button>
      </div>

      {isAdding && (
        <div className="p-6 bg-gray-50 border-b border-gray-200">
          <form onSubmit={handleAddTicket} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="col-span-full">
                <label className="block text-sm font-medium text-gray-700 mb-1">Title / Subject</label>
                <input
                  type="text"
                  required
                  className="w-full border border-gray-300 rounded-md p-2"
                  value={newTicket.title}
                  onChange={e => setNewTicket({ ...newTicket, title: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category / Type</label>
                <select
                  className="w-full border border-gray-300 rounded-md p-2"
                  value={newTicket.type}
                  onChange={e => setNewTicket({ ...newTicket, type: e.target.value as any })}
                >
                  <option value="technical">Technical</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="bill">Bill / Invoice</option>
                  <option value="sales">Sales</option>
                  <option value="complaints">Complaints</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Initial Status</label>
                <select
                  className="w-full border border-gray-300 rounded-md p-2"
                  value={newTicket.status}
                  onChange={e => setNewTicket({ ...newTicket, status: e.target.value as any })}
                >
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>
              <div className="col-span-full">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  className="w-full border border-gray-300 rounded-md p-2"
                  rows={4}
                  required
                  value={newTicket.description}
                  onChange={e => setNewTicket({ ...newTicket, description: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name (Optional)</label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-md p-2"
                  value={newTicket.customerName}
                  onChange={e => setNewTicket({ ...newTicket, customerName: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer Email (Optional)</label>
                <input
                  type="email"
                  className="w-full border border-gray-300 rounded-md p-2"
                  value={newTicket.customerEmail}
                  onChange={e => setNewTicket({ ...newTicket, customerEmail: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-600 hover:bg-gray-50 bg-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-indigo-600 text-white px-4 py-2 rounded-md font-bold hover:bg-indigo-700"
              >
                Create Ticket
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="p-0 overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading tickets...</div>
        ) : tickets.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No support tickets found.</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider text-nowrap">Ticket ID</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject & Info</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider text-nowrap">Type</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider text-nowrap">Status</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider text-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tickets.map((ticket) => (
                <tr key={ticket.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                    #{ticket.id.slice(0, 6).toUpperCase()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-bold text-gray-900">{ticket.title}</div>
                    <div className="text-xs text-gray-500 mt-1 line-clamp-2">{ticket.description}</div>
                    {ticket.customerName && (
                      <div className="text-xs text-gray-400 mt-1">From: {ticket.customerName} {ticket.customerEmail ? `(${ticket.customerEmail})` : ''}</div>
                    )}
                    <div className="text-xs text-gray-400 mt-1">{new Date(ticket.createdAt).toLocaleString()}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full capitalize ${getTypeBadgeColor(ticket.type)}`}>
                      {ticket.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      className={`text-xs font-bold rounded-full px-2 py-1 border-0 ${
                        ticket.status === 'resolved' ? 'bg-green-100 text-green-800' :
                        ticket.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}
                      value={ticket.status}
                      onChange={(e) => handleStatusChange(ticket.id, e.target.value)}
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleDeleteTicket(ticket.id)}
                      className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 p-2 rounded-md transition"
                      title="Delete Ticket"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
