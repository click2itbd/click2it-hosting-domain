import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, getDocs, doc, updateDoc, addDoc, onSnapshot, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { MessageSquare, Plus, X, Send, AlertCircle, Clock, CheckCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

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
  status: 'open' | 'answered' | 'customer-reply' | 'closed';
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  updatedAt: string;
}

export const CustomerTicketsTab = ({ currentUser }: { currentUser: any }) => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [replyMessage, setReplyMessage] = useState('');
  
  // New ticket state
  const [isCreating, setIsCreating] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [newMessage, setNewMessage] = useState('');

  useEffect(() => {
    if (currentUser?.uid) {
      fetchTickets();
    }
  }, [currentUser]);

  useEffect(() => {
    if (selectedTicket) {
      const messagesRef = collection(db, 'tickets', selectedTicket.id, 'messages');
      const q = query(messagesRef, orderBy('createdAt', 'asc'), limit(200));
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as TicketMessage[]);
      });

      return () => unsubscribe();
    }
  }, [selectedTicket]);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const q = query(
        collection(db, 'tickets'), 
        where('userId', '==', currentUser.uid),
        limit(100)
      );
      
      const snap = await getDocs(q);
      let fetched = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Ticket[];
      
      // Sort client side (descending)
      fetched.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      
      setTickets(fetched);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      toast.error('Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject.trim() || !newMessage.trim()) return;

    try {
      const now = new Date().toISOString();
      const ticketData = {
        userId: currentUser.uid,
        customerName: currentUser.displayName || currentUser.name || 'Customer',
        customerEmail: currentUser.email || '',
        subject: newSubject,
        status: 'open',
        priority: newPriority,
        createdAt: now,
        updatedAt: now
      };

      const docRef = await addDoc(collection(db, 'tickets'), ticketData);
      
      // Add first message
      await addDoc(collection(db, 'tickets', docRef.id, 'messages'), {
        sender: 'customer',
        message: newMessage,
        createdAt: now
      });

      toast.success('Ticket created successfully!');
      setIsCreating(false);
      setNewSubject('');
      setNewMessage('');
      setNewPriority('medium');
      fetchTickets();
    } catch (error) {
      console.error('Error creating ticket:', error);
      toast.error('Failed to create ticket');
    }
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyMessage.trim() || !selectedTicket) return;

    try {
      const now = new Date().toISOString();
      
      // Add message
      await addDoc(collection(db, 'tickets', selectedTicket.id, 'messages'), {
        sender: 'customer',
        message: replyMessage,
        createdAt: now
      });

      // Update ticket status
      await updateDoc(doc(db, 'tickets', selectedTicket.id), {
        status: 'customer-reply',
        updatedAt: now
      });

      setReplyMessage('');
      fetchTickets(); // Refresh list to update status
    } catch (error) {
      console.error('Error sending reply:', error);
      toast.error('Failed to send reply');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-blue-100 text-blue-700';
      case 'customer-reply': return 'bg-yellow-100 text-yellow-700';
      case 'answered': return 'bg-green-100 text-green-700';
      case 'closed': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500 animate-pulse">Loading tickets...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Support Tickets</h2>
          <p className="text-gray-500 text-sm mt-1">Need help? Open a ticket to reach our support team.</p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <Plus size={18} /> New Ticket
        </button>
      </div>

      {isCreating && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6 animate-in slide-in-from-top-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-900">Create New Ticket</h3>
            <button onClick={() => setIsCreating(false)} className="text-gray-400 hover:text-gray-600">
              <X size={20} />
            </button>
          </div>
          <form onSubmit={handleCreateTicket} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
              <input
                type="text"
                required
                value={newSubject}
                onChange={e => setNewSubject(e.target.value)}
                className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Briefly describe your issue..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select
                value={newPriority}
                onChange={e => setNewPriority(e.target.value as any)}
                className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High (Urgent)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
              <textarea
                required
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                rows={4}
                className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Explain the problem in detail..."
              ></textarea>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition"
              >
                Submit Ticket
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Ticket View Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95">
            {/* Header */}
            <div className="p-6 border-b border-gray-100 flex justify-between items-start bg-gray-50/50">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className={`px-2 py-1 text-xs font-bold uppercase rounded-full ${getStatusColor(selectedTicket.status)}`}>
                    {selectedTicket.status.replace('-', ' ')}
                  </span>
                  <span className="text-xs text-gray-500 font-medium flex items-center gap-1">
                    <Clock size={12} /> {new Date(selectedTicket.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-gray-900">{selectedTicket.subject}</h3>
              </div>
              <button onClick={() => setSelectedTicket(null)} className="p-2 text-gray-400 hover:bg-gray-200 rounded-full transition">
                <X size={20} />
              </button>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/30">
              {messages.map(msg => (
                <div key={msg.id} className={`flex flex-col ${msg.sender === 'customer' ? 'items-end' : 'items-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl p-4 shadow-sm ${
                    msg.sender === 'customer' 
                      ? 'bg-blue-600 text-white rounded-tr-none' 
                      : 'bg-white border border-gray-100 text-gray-800 rounded-tl-none'
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      {msg.sender === 'admin' ? (
                        <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                          <MessageSquare size={12} />
                        </div>
                      ) : null}
                      <span className="font-bold text-sm opacity-90">
                        {msg.sender === 'customer' ? 'You' : 'Support Team'}
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.message}</p>
                    <div className="text-[10px] mt-2 opacity-70 text-right">
                      {new Date(msg.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Reply Area */}
            {selectedTicket.status !== 'closed' ? (
              <form onSubmit={handleReply} className="p-4 bg-white border-t border-gray-100 flex gap-2">
                <input
                  type="text"
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  placeholder="Type your reply..."
                  className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
                <button
                  type="submit"
                  disabled={!replyMessage.trim()}
                  className="bg-blue-600 text-white p-3 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <Send size={20} />
                </button>
              </form>
            ) : (
              <div className="p-4 bg-gray-50 border-t border-gray-200 text-center text-gray-500 text-sm flex items-center justify-center gap-2">
                <CheckCircle size={16} /> This ticket has been closed.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tickets List */}
      {tickets.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageSquare size={32} />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">No Tickets Yet</h3>
          <p className="text-gray-500 text-sm">You haven't opened any support tickets.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {tickets.map(ticket => (
            <div 
              key={ticket.id}
              onClick={() => setSelectedTicket(ticket)}
              className="p-6 border-b border-gray-50 hover:bg-gray-50/80 cursor-pointer transition flex items-center justify-between group"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <h4 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{ticket.subject}</h4>
                  <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full ${getStatusColor(ticket.status)}`}>
                    {ticket.status.replace('-', ' ')}
                  </span>
                </div>
                <p className="text-sm text-gray-500 flex items-center gap-2">
                  <Clock size={14} /> Last updated: {new Date(ticket.updatedAt).toLocaleDateString()}
                </p>
              </div>
              <div className="text-gray-400 group-hover:text-blue-500 transition-colors">
                <MessageSquare size={20} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
