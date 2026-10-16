import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, doc, updateDoc, addDoc, onSnapshot, limit, deleteDoc } from 'firebase/firestore';
import { db } from '../../../../firebase';
import { useAuth } from '../../../../context/AuthContext';
import { MessageSquare, X, Send, AlertCircle, Clock, CheckCircle, Search, Ticket as TicketIcon, User, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { cn } from '../../../../lib/utils';
import { Pagination } from '../../../../components/common/Pagination';

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

export default function SupportTickets() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [replyMessage, setReplyMessage] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      const q = query(collection(db, 'tickets'), orderBy('updatedAt', 'desc'));
      const snap = await getDocs(q);
      setTickets(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Ticket[]);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      if (!import.meta.env.DEV) {
        toast.error('Failed to load tickets');
      }
    } finally {
      setLoading(false);
    }
  };

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
    if (!replyMessage.trim() || !selectedTicket) return;
    setSendingReply(true);
    
    try {
      await addDoc(collection(db, 'tickets', selectedTicket.id, 'messages'), {
        sender: 'admin',
        message: replyMessage.trim(),
        createdAt: new Date().toISOString()
      });

      await updateDoc(doc(db, 'tickets', selectedTicket.id), {
        status: 'answered',
        updatedAt: new Date().toISOString()
      });

      setReplyMessage('');
      fetchTickets();
      toast.success('Reply sent successfully');
    } catch (error) {
      console.error('Error sending reply:', error);
      toast.error('Failed to send reply');
    } finally {
      setSendingReply(false);
    }
  };

  const handleCloseTicket = async () => {
    if (!selectedTicket) return;
    try {
      await updateDoc(doc(db, 'tickets', selectedTicket.id), {
        status: 'closed',
        updatedAt: new Date().toISOString()
      });
      setSelectedTicket(null);
      fetchTickets();
      toast.success('Ticket closed');
    } catch (error) {
      console.error('Error closing ticket:', error);
      toast.error('Failed to close ticket');
    }
  };

  const handleDeleteTicket = async (e: React.MouseEvent, ticketId: string) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to completely delete this ticket?')) return;
    
    try {
      await deleteDoc(doc(db, 'tickets', ticketId));
      
      // Try to delete messages subcollection (this may fail on client side due to lack of recursive delete, but we can try to get them first)
      const messagesRef = collection(db, 'tickets', ticketId, 'messages');
      const msgs = await getDocs(messagesRef);
      for (const msgDoc of msgs.docs) {
        await deleteDoc(doc(db, 'tickets', ticketId, 'messages', msgDoc.id));
      }
      
      if (selectedTicket?.id === ticketId) setSelectedTicket(null);
      fetchTickets();
      toast.success('Ticket deleted successfully');
    } catch (error) {
      console.error('Error deleting ticket:', error);
      toast.error('Failed to delete ticket');
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch(priority) {
      case 'high': return <span className="px-3 py-1 bg-red-50 text-red-700 rounded-lg text-xs font-black uppercase tracking-wider border border-red-100 shadow-sm">Critical</span>;
      case 'medium': return <span className="px-3 py-1 bg-orange-50 text-orange-700 rounded-lg text-xs font-black uppercase tracking-wider border border-orange-100 shadow-sm">Medium</span>;
      default: return <span className="px-3 py-1 bg-sky-50 text-sky-700 rounded-lg text-xs font-black uppercase tracking-wider border border-sky-100 shadow-sm">Low</span>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'open': return <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-black uppercase tracking-wider border border-emerald-100 shadow-sm flex items-center gap-1.5 w-fit"><AlertCircle size={12}/> Open</span>;
      case 'customer-reply': return <span className="px-3 py-1 bg-amber-50 text-amber-700 rounded-lg text-xs font-black uppercase tracking-wider border border-amber-100 shadow-sm flex items-center gap-1.5 w-fit"><MessageSquare size={12}/> Customer Reply</span>;
      case 'answered': return <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-black uppercase tracking-wider border border-indigo-100 shadow-sm flex items-center gap-1.5 w-fit"><CheckCircle size={12}/> Answered</span>;
      case 'closed': return <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-black uppercase tracking-wider border border-slate-200 shadow-sm flex items-center gap-1.5 w-fit"><X size={12}/> Closed</span>;
      default: return <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-black uppercase tracking-wider border border-slate-200 shadow-sm flex items-center gap-1.5 w-fit">{status}</span>;
    }
  };

  const filteredTickets = tickets.filter(t => 
    t.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.customerEmail.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.subject.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="grid grid-cols-1 gap-4"><div className="h-64 bg-slate-100 rounded-3xl animate-pulse"></div></div>;
  }

  return (
    <div className="bg-white/40 backdrop-blur-xl rounded-3xl shadow-sm border border-slate-200/60 p-6 md:p-8 animate-in fade-in duration-300">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg shadow-indigo-200">
              <TicketIcon className="text-white" size={24} />
            </div>
            Support Hub
          </h2>
          <p className="text-slate-500 text-sm mt-1 ml-14">Manage and resolve customer support inquiries efficiently</p>
        </div>
        <div className="flex items-center w-full md:w-auto">
          <div className="relative w-full md:w-72">
            <input 
              type="text" 
              placeholder="Search by name, email, or subject..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm"
            />
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {filteredTickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-slate-50/50">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100 mb-6">
              <MessageSquare size={32} className="text-slate-300" />
            </div>
            <h3 className="text-xl font-bold text-slate-700 mb-2">No Tickets Found</h3>
            <p className="text-slate-500 max-w-sm mx-auto">There are no support tickets matching your search criteria right now.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-bold">
                  <th className="p-5">Customer</th>
                  <th className="p-5">Subject</th>
                  <th className="p-5">Priority</th>
                  <th className="p-5">Status</th>
                  <th className="p-5">Last Updated</th>
                  <th className="p-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTickets.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(ticket => (
                  <tr key={ticket.id} className="hover:bg-indigo-50/30 transition-colors group">
                    <td className="p-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm shrink-0">
                          {ticket.customerName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">{ticket.customerName}</p>
                          <p className="text-xs text-slate-500">{ticket.customerEmail}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-5 font-bold text-slate-700 truncate max-w-[200px]">{ticket.subject}</td>
                    <td className="p-5">{getPriorityBadge(ticket.priority)}</td>
                    <td className="p-5">{getStatusBadge(ticket.status)}</td>
                    <td className="p-5 text-sm font-medium text-slate-600">
                      {new Date(ticket.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="p-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleViewTicket(ticket)}
                          className="px-5 py-2 bg-white border-2 border-indigo-100 text-indigo-600 rounded-xl text-sm font-bold hover:bg-indigo-600 hover:text-white hover:border-indigo-600 hover:shadow-lg hover:shadow-indigo-200 transition-all duration-300"
                        >
                          Respond
                        </button>
                        <button
                          onClick={(e) => handleDeleteTicket(e, ticket.id)}
                          className="p-2.5 bg-white border-2 border-rose-100 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white hover:border-rose-500 hover:shadow-lg hover:shadow-rose-200 transition-all duration-300"
                          title="Delete Ticket"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <Pagination
            currentPage={currentPage}
            totalItems={filteredTickets.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
          />
        </div>
      </div>

      {/* Ticket View Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl border border-white/20 overflow-hidden scale-in-95">
            
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/80 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-black shadow-md">
                  {selectedTicket.customerName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800">{selectedTicket.subject}</h3>
                  <p className="text-xs font-bold text-slate-500 mt-0.5 flex items-center gap-1.5"><User size={12} /> {selectedTicket.customerName} ({selectedTicket.customerEmail})</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {selectedTicket.status !== 'closed' && (
                  <button onClick={handleCloseTicket} className="px-4 py-2 bg-rose-50 text-rose-600 text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-rose-100 hover:text-rose-700 transition">
                    Mark Closed
                  </button>
                )}
                <button onClick={() => setSelectedTicket(null)} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:bg-slate-200 hover:text-slate-700 rounded-full transition">
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Chat History */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 space-y-6">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                  <MessageSquare size={48} className="mb-4 opacity-50" />
                  <p className="font-medium text-sm">No conversation history yet.</p>
                </div>
              ) : (
                messages.map((msg, idx) => (
                  <div key={idx} className={cn("flex flex-col", msg.sender === 'admin' ? "items-end" : "items-start")}>
                    <div className="flex items-end gap-2 mb-1">
                      {msg.sender !== 'admin' && <span className="text-[10px] font-bold text-slate-400 ml-2">{selectedTicket.customerName}</span>}
                      {msg.sender === 'admin' && <span className="text-[10px] font-bold text-slate-400 mr-2">Support Agent</span>}
                    </div>
                    <div className={cn(
                      "max-w-[85%] rounded-3xl px-5 py-3.5 shadow-sm", 
                      msg.sender === 'admin' 
                        ? "bg-gradient-to-r from-indigo-600 to-indigo-500 text-white rounded-br-sm shadow-indigo-200" 
                        : "bg-white border border-slate-200 text-slate-700 rounded-bl-sm"
                    )}>
                      <p className="text-sm whitespace-pre-wrap leading-relaxed font-medium">{msg.message}</p>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 mt-1.5 mx-2">
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Reply Box */}
            {selectedTicket.status !== 'closed' ? (
              <div className="p-4 bg-white border-t border-slate-100">
                <div className="relative">
                  <textarea
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    placeholder="Type your response to the customer..."
                    className="w-full border-2 border-slate-100 bg-slate-50 rounded-2xl p-4 pr-16 text-sm font-medium focus:outline-none focus:ring-0 focus:border-indigo-400 focus:bg-white resize-none h-28 transition-all"
                  />
                  <div className="absolute right-3 bottom-3">
                    <button
                      onClick={handleSendReply}
                      disabled={sendingReply || !replyMessage.trim()}
                      className="w-10 h-10 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:shadow-none transition-all"
                    >
                      {sendingReply ? <Clock size={18} className="animate-spin" /> : <Send size={18} className="ml-1" />}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-5 bg-slate-100 border-t border-slate-200 text-center text-sm font-bold text-slate-500 flex justify-center items-center gap-2">
                <CheckCircle size={16} className="text-emerald-500" />
                This ticket has been marked as resolved and closed.
              </div>
            )}
            
          </div>
        </div>
      )}
    </div>
  );
}
