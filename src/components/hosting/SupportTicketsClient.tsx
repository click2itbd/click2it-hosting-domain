import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, getDocs, doc, updateDoc, addDoc, onSnapshot, limit } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { MessageSquare, X, Send, AlertCircle, Clock, Plus, Tag } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { cn } from '../../lib/utils';

interface TicketMessage {
  id?: string;
  sender: 'customer' | 'admin';
  message: string;
  createdAt: string;
}

interface Ticket {
  id: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  subject: string;
  serviceId?: string;
  status: 'open' | 'answered' | 'customer-reply' | 'closed';
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  updatedAt: string;
}

export const SupportTicketsClient: React.FC = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [replyMessage, setReplyMessage] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  // New ticket form
  const [isCreating, setIsCreating] = useState(false);
  const [newTicket, setNewTicket] = useState({ subject: '', priority: 'medium' as 'low'|'medium'|'high', message: '' });

  useEffect(() => {
    if (!user) return;
    
    const q = query(collection(db, 'tickets'), where('userId', '==', user.uid), orderBy('updatedAt', 'desc'), limit(100));
    const unsubscribe = onSnapshot(q, (snap) => {
      setTickets(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Ticket[]);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleViewTicket = async (ticket: Ticket) => {
    setSelectedTicket(ticket);
    const messagesRef = collection(db, 'tickets', ticket.id, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'), limit(200));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as TicketMessage[]);
    });

    return () => unsubscribe();
  };

  const handleSendReply = async () => {
    if (!replyMessage.trim() || !selectedTicket || !user) return;
    setSendingReply(true);
    
    try {
      await addDoc(collection(db, 'tickets', selectedTicket.id, 'messages'), {
        sender: 'customer',
        message: replyMessage.trim(),
        createdAt: new Date().toISOString()
      });

      await updateDoc(doc(db, 'tickets', selectedTicket.id), {
        status: 'customer-reply',
        updatedAt: new Date().toISOString()
      });

      setReplyMessage('');
    } catch (error) {
      console.error('Error sending reply:', error);
      toast.error('Failed to send reply');
    } finally {
      setSendingReply(false);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicket.subject.trim() || !newTicket.message.trim() || !user) return;
    setSendingReply(true);

    try {
      const ticketData = {
        userId: user.uid,
        customerName: user.displayName || 'Customer',
        customerEmail: user.email || '',
        subject: newTicket.subject.trim(),
        status: 'open',
        priority: newTicket.priority,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, 'tickets'), ticketData);
      
      await addDoc(collection(db, 'tickets', docRef.id, 'messages'), {
        sender: 'customer',
        message: newTicket.message.trim(),
        createdAt: new Date().toISOString()
      });

      setIsCreating(false);
      setNewTicket({ subject: '', priority: 'medium', message: '' });
      toast.success('Support ticket created successfully');
    } catch (error) {
      console.error('Error creating ticket:', error);
      toast.error('Failed to create ticket');
    } finally {
      setSendingReply(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch(priority) {
      case 'high': return 'bg-red-100 text-red-800 border border-red-200';
      case 'medium': return 'bg-orange-100 text-orange-800 border border-orange-200';
      default: return 'bg-blue-100 text-blue-800 border border-blue-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'open': return 'bg-green-100 text-green-800 border border-green-200';
      case 'customer-reply': return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
      case 'answered': return 'bg-blue-100 text-blue-800 border border-blue-200';
      case 'closed': return 'bg-gray-100 text-gray-800 border border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500 animate-pulse">Loading tickets...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <MessageSquare className="text-[#EF4444]" size={24} />
          <h2 className="text-xl font-bold text-[#081621]">Support Tickets</h2>
        </div>
        <button 
          onClick={() => setIsCreating(true)}
          className="bg-[#081621] text-white px-4 py-2 rounded font-bold hover:bg-[#EF4444] transition-colors flex items-center gap-2 text-sm"
        >
          <Plus size={16} /> Open Ticket
        </button>
      </div>

      {tickets.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
          <MessageSquare className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">You don't have any support tickets.</p>
          <p className="text-sm text-gray-400 mt-1">If you need help, open a new ticket and our team will assist you.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-600 text-xs uppercase border-y border-gray-200">
              <tr>
                <th className="px-6 py-4 font-semibold">Subject</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Priority</th>
                <th className="px-6 py-4 font-semibold">Last Updated</th>
                <th className="px-6 py-4 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tickets.map(ticket => (
                <tr key={ticket.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-bold text-gray-800">{ticket.subject}</td>
                  <td className="px-6 py-4">
                    <span className={cn("px-2.5 py-1 text-[10px] uppercase font-bold rounded-full", getStatusColor(ticket.status))}>
                      {ticket.status.replace('-', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn("px-2.5 py-1 text-[10px] uppercase font-bold rounded-full", getPriorityColor(ticket.priority))}>
                      {ticket.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(ticket.updatedAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleViewTicket(ticket)}
                      className="px-4 py-1.5 bg-[#081621] text-white rounded text-xs font-bold hover:bg-[#EF4444] transition-colors"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Ticket Modal */}
      {isCreating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-[#081621] text-white">
              <h3 className="font-bold">Open New Ticket</h3>
              <button onClick={() => setIsCreating(false)} className="text-gray-300 hover:text-white transition">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateTicket} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Subject *</label>
                <input
                  required
                  type="text"
                  value={newTicket.subject}
                  onChange={e => setNewTicket({...newTicket, subject: e.target.value})}
                  className="w-full border border-gray-200 rounded p-2 focus:outline-none focus:border-[#EF4444]"
                  placeholder="e.g. Website is down"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Priority</label>
                <select
                  value={newTicket.priority}
                  onChange={e => setNewTicket({...newTicket, priority: e.target.value as any})}
                  className="w-full border border-gray-200 rounded p-2 focus:outline-none focus:border-[#EF4444]"
                >
                  <option value="low">Low - General Inquiry</option>
                  <option value="medium">Medium - Technical Issue</option>
                  <option value="high">High - Site Down / Urgent</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Message *</label>
                <textarea
                  required
                  rows={5}
                  value={newTicket.message}
                  onChange={e => setNewTicket({...newTicket, message: e.target.value})}
                  className="w-full border border-gray-200 rounded p-2 focus:outline-none focus:border-[#EF4444] resize-none"
                  placeholder="Describe your issue in detail..."
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setIsCreating(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded font-medium transition">
                  Cancel
                </button>
                <button type="submit" disabled={sendingReply} className="px-6 py-2 bg-[#EF4444] text-white rounded font-bold hover:bg-red-600 transition disabled:opacity-50">
                  {sendingReply ? 'Submitting...' : 'Submit Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View/Reply Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-[#081621] text-white">
              <div>
                <h3 className="font-bold flex items-center gap-2">
                  <Tag size={16} /> {selectedTicket.subject}
                </h3>
                <p className="text-xs text-gray-300 mt-1">Status: {selectedTicket.status.toUpperCase()}</p>
              </div>
              <button onClick={() => setSelectedTicket(null)} className="text-gray-300 hover:text-white transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-gray-50 space-y-4">
              {messages.map((msg, idx) => (
                <div key={idx} className={cn("flex", msg.sender === 'customer' ? "justify-end" : "justify-start")}>
                  <div className={cn("max-w-[80%] p-4 shadow-sm", msg.sender === 'customer' ? "bg-[#081621] text-white rounded-2xl rounded-tr-none" : "bg-white border border-gray-100 text-gray-800 rounded-2xl rounded-tl-none")}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-xs opacity-90">{msg.sender === 'customer' ? 'You' : 'Support Team'}</span>
                      <span className="text-[10px] opacity-70 ml-4">{new Date(msg.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.message}</p>
                  </div>
                </div>
              ))}
            </div>

            {selectedTicket.status !== 'closed' ? (
              <div className="p-4 bg-white border-t border-gray-100">
                <textarea
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  placeholder="Type your reply here..."
                  className="w-full border border-gray-200 rounded-lg p-3 text-sm focus:outline-none focus:border-[#EF4444] resize-none h-24 mb-3"
                />
                <div className="flex justify-end">
                  <button
                    onClick={handleSendReply}
                    disabled={sendingReply || !replyMessage.trim()}
                    className="bg-[#EF4444] hover:bg-red-600 text-white px-6 py-2 rounded font-bold flex items-center gap-2 disabled:opacity-50 transition"
                  >
                    {sendingReply ? <Clock className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Send Reply
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-gray-100 border-t border-gray-200 text-center text-sm font-medium text-gray-600 flex justify-center items-center gap-2">
                This ticket has been closed.
              </div>
            )}
            
          </div>
        </div>
      )}
    </div>
  );
};
