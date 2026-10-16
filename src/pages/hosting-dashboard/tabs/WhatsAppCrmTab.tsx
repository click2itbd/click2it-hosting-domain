import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, Phone, User, Users, Search, Plus, Send, Check, CheckCheck, 
  Sparkles, Download, ExternalLink, Chrome, Shield, Clock, Star, Bell, 
  Settings, RefreshCw, FileText, Globe, Server, AlertCircle, Bookmark,
  ChevronDown, Filter, Zap, ArrowRight, Tag, HelpCircle, Laptop
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

interface WhatsAppMessage {
  id: string;
  sender: 'customer' | 'agent' | 'bot';
  senderName: string;
  agentId?: string;
  text: string;
  timestamp: string;
  status: 'sent' | 'delivered' | 'read';
  isInternalNote?: boolean;
}

interface WhatsAppConversation {
  id: string;
  contactName: string;
  phone: string;
  email?: string;
  avatarUrl?: string;
  leadStage: 'lead' | 'qualified' | 'in_discussion' | 'customer' | 'churned';
  tags: string[];
  assignedAgent: {
    id: string;
    name: string;
    avatar?: string;
  } | null;
  statusLabel: 'all' | 'unread' | 'starred' | 'snoozed' | 'follow_up' | 'closed' | 'auto';
  unreadCount: number;
  lastMessageSnippet: string;
  lastMessageTime: string;
  whmcsAccountId?: string;
  activeServices?: {
    domains: string[];
    packages: string[];
    unpaidInvoices: number;
  };
  notes: string[];
  messages: WhatsAppMessage[];
}

export function WhatsAppCrmTab({ state }: { state?: any }) {
  const [conversations, setConversations] = useState<WhatsAppConversation[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<string>('');
  const [activeFilterTab, setActiveFilterTab] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeRightTab, setActiveRightTab] = useState<'profile' | 'notes' | 'company' | 'hosting'>('profile');
  const [newMessageText, setNewMessageText] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [showExtensionModal, setShowExtensionModal] = useState(false);
  const [showSimulatorModal, setShowSimulatorModal] = useState(false);
  const [isDownloadingExtension, setIsDownloadingExtension] = useState(false);
  const [currentAgent, setCurrentAgent] = useState({
    id: 'agent_1',
    name: 'Alex M.',
    role: 'Support Admin'
  });

  const availableAgents = [
    { id: 'agent_1', name: 'Alex M.', role: 'Support Admin' },
    { id: 'agent_2', name: 'Sarah K.', role: 'Sales Lead' },
    { id: 'agent_3', name: 'Imran H.', role: 'Technical Support' },
    { id: 'agent_4', name: 'Kamal R.', role: 'Billing Specialist' }
  ];

  const cannedReplies = [
    { label: '👋 Welcome', text: 'Hello! Welcome to Click2IT Hosting. How can our technical support team assist you today?' },
    { label: '🌐 Nameservers', text: 'Our official nameservers are:\nns1.click2itbd.com\nns2.click2itbd.com\nPlease update them in your domain management panel.' },
    { label: '🎛️ cPanel URL', text: 'You can access your cPanel control panel at: https://cpanel.yourdomain.com:2083 or via our Client Area at https://click2itbd.com/client-area' },
    { label: '💳 Invoice Link', text: 'Here is your direct invoice payment link: https://click2itbd.com/client-area?tab=invoices. Instant service activation once payment completes!' },
    { label: '🚀 VPS Provisioned', text: 'Your Cloud NVMe VPS has been deployed successfully. Root credentials and dedicated IP have been sent to your email.' }
  ];

  // Fetch initial WhatsApp CRM state
  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      const res = await fetch('/api/whatsapp/conversations');
      const data = await res.json();
      if (data.success && data.conversations) {
        setConversations(data.conversations);
        if (data.conversations.length > 0 && !selectedConvId) {
          setSelectedConvId(data.conversations[0].id);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch WhatsApp conversations, using fallback', err);
    }
  };

  const selectedConv = conversations.find(c => c.id === selectedConvId) || conversations[0];

  const filteredConversations = conversations.filter(conv => {
    if (activeFilterTab !== 'all') {
      if (activeFilterTab === 'unread' && conv.unreadCount === 0 && conv.statusLabel !== 'unread') return false;
      if (activeFilterTab === 'starred' && conv.statusLabel !== 'starred') return false;
      if (activeFilterTab === 'follow_up' && conv.statusLabel !== 'follow_up') return false;
      if (activeFilterTab === 'closed' && conv.statusLabel !== 'closed') return false;
      if (activeFilterTab === 'auto' && conv.statusLabel !== 'auto') return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        conv.contactName.toLowerCase().includes(q) ||
        conv.phone.includes(q) ||
        conv.tags.some(t => t.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newMessageText.trim() || !selectedConv) return;

    const payload = {
      conversationId: selectedConv.id,
      text: newMessageText.trim(),
      agentId: currentAgent.id,
      agentName: `${currentAgent.name} (${currentAgent.role})`,
      isInternalNote: isInternalNote
    };

    const newMsg: WhatsAppMessage = {
      id: `msg_${Date.now()}`,
      sender: 'agent',
      senderName: payload.agentName,
      agentId: currentAgent.id,
      text: payload.text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'delivered',
      isInternalNote: isInternalNote
    };

    setConversations(prev => prev.map(c => {
      if (c.id === selectedConv.id) {
        return {
          ...c,
          messages: [...c.messages, newMsg],
          lastMessageSnippet: isInternalNote ? c.lastMessageSnippet : newMsg.text,
          lastMessageTime: 'Just now'
        };
      }
      return c;
    }));

    setNewMessageText('');
    setIsInternalNote(false);

    try {
      await fetch('/api/whatsapp/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (err) {
      console.error('Failed to post message to backend API', err);
    }
  };

  const handleSimulateIncomingQuery = async () => {
    const sampleQueries = [
      'Hi! I need help setting up custom DNS records for my domain.',
      'Can I upgrade my Cloud VPS from 4GB to 8GB RAM without downtime?',
      'I want to purchase a .BD domain and 1-year cPanel web hosting.',
      'My SSL certificate shows expiring in 3 days. Can you renew it?',
      'Can you send me the WHMCS invoice link for my pending service?'
    ];
    const randomQuery = sampleQueries[Math.floor(Math.random() * sampleQueries.length)];
    const randomPhone = `+880 17${Math.floor(10000000 + Math.random() * 90000000)}`;
    const randomName = ['Fahim Hasan', 'Shakil Ahmed', 'Rina Begum', 'Mahmudul Karim', 'Tasnim Noor'][Math.floor(Math.random() * 5)];

    try {
      const res = await fetch('/api/whatsapp/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: `conv_wa_${Date.now()}`,
          contactName: randomName,
          phone: randomPhone,
          text: randomQuery,
          isCustomerSimulation: true
        })
      });
      const data = await res.json();
      if (data.success && data.conversation) {
        setConversations(prev => [data.conversation, ...prev]);
        setSelectedConvId(data.conversation.id);
        toast.success(`📱 Incoming WhatsApp Query received from ${randomName}!`);
      }
    } catch (e) {
      toast.error('Simulation triggered locally');
    }
  };

  const handleAssignAgent = async (convId: string, agentId: string) => {
    const agent = availableAgents.find(a => a.id === agentId);
    setConversations(prev => prev.map(c => {
      if (c.id === convId) {
        return {
          ...c,
          assignedAgent: agent ? { id: agent.id, name: `${agent.name} (${agent.role})` } : null
        };
      }
      return c;
    }));

    toast.success(agent ? `Chat assigned to ${agent.name}` : 'Chat set to unassigned');

    try {
      await fetch('/api/whatsapp/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: convId, agentId })
      });
    } catch (e) {
      console.warn('Assign API error:', e);
    }
  };

  const handleAiSmartReply = () => {
    if (!selectedConv) return;
    const lastMsg = selectedConv.messages[selectedConv.messages.length - 1]?.text || '';
    let suggestion = 'Hello! Thank you for contacting Click2IT Support. I would be delighted to assist you with your hosting and domain account right away.';
    
    if (lastMsg.toLowerCase().includes('vps') || lastMsg.toLowerCase().includes('ram')) {
      suggestion = 'Certainly! Our Cloud NVMe VPS can be upgraded dynamically with zero downtime. Would you like me to prepare the invoice with our 40% promotional rate?';
    } else if (lastMsg.toLowerCase().includes('dns') || lastMsg.toLowerCase().includes('nameserver')) {
      suggestion = 'Our primary DNS nameservers are ns1.click2itbd.com and ns2.click2itbd.com. I can also configure your custom A and MX records directly from WHM for you.';
    } else if (lastMsg.toLowerCase().includes('invoice') || lastMsg.toLowerCase().includes('payment')) {
      suggestion = 'You can review and pay your invoice securely at https://click2itbd.com/client-area?tab=invoices via bKash, Nagad, or Credit Card with instant activation.';
    }

    setNewMessageText(suggestion);
    toast.success('✨ AI Smart Reply inserted into input!');
  };

  const handleDownloadExtensionZip = async () => {
    setIsDownloadingExtension(true);
    try {
      const zip = new JSZip();

      // Read extension files
      const manifestRes = await fetch('/waplus-extension/manifest.json');
      const manifestText = await manifestRes.text();
      zip.file('manifest.json', manifestText);

      const bgRes = await fetch('/waplus-extension/background.js');
      const bgText = await bgRes.text();
      zip.file('background.js', bgText);

      const contentRes = await fetch('/waplus-extension/content.js');
      const contentText = await contentRes.text();
      zip.file('content.js', contentText);

      const cssRes = await fetch('/waplus-extension/content.css');
      const cssText = await cssRes.text();
      zip.file('content.css', cssText);

      const popupHtmlRes = await fetch('/waplus-extension/popup.html');
      const popupHtmlText = await popupHtmlRes.text();
      zip.file('popup.html', popupHtmlText);

      const readmeRes = await fetch('/waplus-extension/README.md');
      const readmeText = await readmeRes.text();
      zip.file('README.md', readmeText);

      const blob = await zip.generateAsync({ type: 'blob' });
      saveAs(blob, 'waplus-hosting-crm-chrome-extension.zip');
      toast.success('📦 Chrome Extension ZIP downloaded successfully!');
    } catch (err: any) {
      console.error('Failed to create extension zip:', err);
      toast.error('Failed to download ZIP file. You can load from public/waplus-extension directory.');
    } finally {
      setIsDownloadingExtension(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Top Hero Section matching WAPlus attached screenshot */}
      <div className="relative rounded-3xl bg-gradient-to-r from-[#0B132B] via-[#1C2541] to-[#14213d] text-white p-6 sm:p-8 md:p-10 overflow-hidden shadow-2xl border border-white/10">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-4xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold uppercase tracking-wider mb-4">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            Official WhatsApp CRM & Webhook Integration
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight leading-tight">
            WAPlus: WhatsApp CRM for Sales and Customer Management
          </h1>

          <p className="mt-3 text-sm sm:text-base text-slate-300 font-normal leading-relaxed max-w-3xl">
            WAPlus is a multi-agent WhatsApp CRM built for hosting teams. Multiple agents can collaborate, receive, and answer customer queries in real-time, automate replies and follow-ups, and sync customer data with hosting accounts and WHMCS.
          </p>

          {/* Quick Action Buttons matching reference image */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowExtensionModal(true)}
              className="inline-flex items-center gap-2.5 px-6 py-3 rounded-xl bg-[#25D366] hover:bg-[#20ba59] active:scale-95 text-slate-950 font-black text-sm shadow-lg shadow-emerald-500/30 transition-all cursor-pointer"
            >
              <Chrome size={18} />
              Add WAPlus to Chrome
            </button>

            <button
              onClick={() => setShowSimulatorModal(true)}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white font-bold text-sm border border-white/20 transition-all cursor-pointer"
            >
              Explore WAPlus Workspace <ArrowRight size={16} />
            </button>

            <button
              onClick={handleSimulateIncomingQuery}
              className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md ml-auto"
              title="Test multi-agent queue with a simulated WhatsApp customer"
            >
              <Zap size={15} /> Simulate Incoming Customer Query
            </button>
          </div>

          {/* Active Agent Selector */}
          <div className="mt-6 pt-5 border-t border-white/10 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-300">
            <div className="flex items-center gap-3">
              <span className="font-semibold text-slate-400">Current Logged-in Agent:</span>
              <select
                value={currentAgent.id}
                onChange={(e) => {
                  const agent = availableAgents.find(a => a.id === e.target.value);
                  if (agent) {
                    setCurrentAgent(agent);
                    toast.success(`Switched active agent to ${agent.name}`);
                  }
                }}
                className="bg-black/40 border border-white/20 rounded-lg px-3 py-1.5 text-xs text-white font-bold outline-none cursor-pointer"
              >
                {availableAgents.map(a => (
                  <option key={a.id} value={a.id} className="bg-slate-900 text-white">
                    {a.name} — {a.role}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                <span className="text-slate-200 font-semibold">WhatsApp Cloud API: Active</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
                <span className="text-slate-200 font-semibold">4 Support Agents Online</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Workspace Tabs matching screenshot (All 350, Unread 110, Starred 89, etc.) */}
      <div className="bg-white rounded-2xl p-2 shadow-sm border border-slate-200 flex items-center justify-between overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-1">
          {[
            { id: 'all', label: 'All 350' },
            { id: 'unread', label: 'Unread 110' },
            { id: 'starred', label: 'Starred 89' },
            { id: 'snoozed', label: 'Snoozed 29' },
            { id: 'follow_up', label: 'Follow Up 18' },
            { id: 'closed', label: 'Closed 36' },
            { id: 'auto', label: 'Auto 52' }
          ].map(tab => {
            const isActive = activeFilterTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveFilterTab(tab.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/20'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <button 
          onClick={() => toast.success('Custom Workspace Label created!')}
          className="text-xs font-bold text-emerald-700 hover:text-emerald-800 px-3 py-1.5 rounded-lg border border-dashed border-emerald-300 hover:border-emerald-500 transition-colors whitespace-nowrap flex items-center gap-1.5 ml-2 shrink-0"
        >
          <Plus size={14} /> Add Label
        </button>
      </div>

      {/* Main 3-Column Workspace matching WAPlus Reference Design */}
      <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[720px]">
        
        {/* COLUMN 1: Contact Management (4 Cols) */}
        <div className="lg:col-span-4 border-r border-slate-200 flex flex-col bg-slate-50/50">
          
          {/* Header & Search */}
          <div className="p-4 border-b border-slate-200 bg-white space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-sm text-slate-800 tracking-tight flex items-center gap-2">
                <Users size={16} className="text-emerald-600" />
                Contact Management
              </h3>
              <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                {filteredConversations.length} Active Chats
              </span>
            </div>

            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search name, phone (+91/880), or tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 custom-scrollbar">
            {filteredConversations.map(conv => {
              const isSelected = conv.id === selectedConvId;
              return (
                <div
                  key={conv.id}
                  onClick={() => setSelectedConvId(conv.id)}
                  className={`p-3.5 sm:p-4 cursor-pointer transition-colors relative flex items-start gap-3 ${
                    isSelected ? 'bg-emerald-50/70 border-l-4 border-emerald-600' : 'hover:bg-white'
                  }`}
                >
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <img
                      src={conv.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'}
                      alt={conv.contactName}
                      className="w-11 h-11 rounded-full object-cover border border-slate-200 shadow-sm"
                    />
                    {conv.unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-600 text-white rounded-full text-[10px] font-black flex items-center justify-center border-2 border-white shadow-sm">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between mb-0.5">
                      <h4 className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                        {conv.contactName}
                      </h4>
                      <span className="text-[10px] text-slate-400 shrink-0 font-medium ml-2">
                        {conv.lastMessageTime}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500 font-medium mb-1">
                      {conv.phone}
                    </p>

                    <p className="text-xs text-slate-600 truncate font-normal">
                      {conv.lastMessageSnippet}
                    </p>

                    {/* Tags & Assigned Agent */}
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {conv.tags.slice(0, 2).map((tag, idx) => (
                        <span key={idx} className="text-[10px] font-semibold bg-slate-200/70 text-slate-700 px-2 py-0.5 rounded-md">
                          {tag}
                        </span>
                      ))}

                      {conv.assignedAgent ? (
                        <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200 ml-auto truncate max-w-[120px]">
                          👤 {conv.assignedAgent.name}
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 ml-auto">
                          Unassigned
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* COLUMN 2: Multi-Agent WhatsApp Chat Workspace (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col h-full bg-[#EFEAE2] relative">
          
          {/* Chat Header */}
          <div className="p-3.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shadow-sm shrink-0">
            <div className="flex items-center gap-3">
              <img
                src={selectedConv?.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'}
                alt=""
                className="w-10 h-10 rounded-full object-cover border border-slate-700"
              />
              <div>
                <h4 className="font-bold text-sm text-white flex items-center gap-2">
                  {selectedConv?.contactName}
                  <span className="w-2 h-2 rounded-full bg-emerald-400" title="Online" />
                </h4>
                <p className="text-xs text-slate-400 font-mono">
                  {selectedConv?.phone}
                </p>
              </div>
            </div>

            {/* Reassign Agent Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">Assigned:</span>
              <select
                value={selectedConv?.assignedAgent?.id || 'unassigned'}
                onChange={(e) => selectedConv && handleAssignAgent(selectedConv.id, e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-lg text-xs text-white px-2 py-1.5 font-bold outline-none cursor-pointer"
              >
                <option value="unassigned">Unassigned</option>
                {availableAgents.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.role})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Internal Team Collaboration Notice Bar */}
          <div className="bg-amber-100/90 border-b border-amber-200 px-4 py-2 flex items-center justify-between text-xs text-amber-900">
            <div className="flex items-center gap-2 font-medium">
              <AlertCircle size={14} className="text-amber-700 shrink-0" />
              <span>Multi-agent chat session. Internal notes are hidden from customer.</span>
            </div>
            <button
              onClick={() => setIsInternalNote(!isInternalNote)}
              className={`px-2 py-1 rounded text-[11px] font-bold transition-all ${
                isInternalNote ? 'bg-amber-600 text-white' : 'bg-amber-200 text-amber-900 hover:bg-amber-300'
              }`}
            >
              {isInternalNote ? 'Writing Internal Note' : '+ Note for Team'}
            </button>
          </div>

          {/* Chat Messages Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {selectedConv?.messages.map((msg, index) => {
              const isAgent = msg.sender === 'agent';
              const isInternal = msg.isInternalNote;

              if (isInternal) {
                return (
                  <div key={msg.id || index} className="p-3 bg-amber-50 border border-amber-300 rounded-2xl text-amber-950 text-xs shadow-sm max-w-[85%] mx-auto">
                    <div className="flex items-center justify-between font-bold text-amber-800 mb-1">
                      <span>🔒 Team Internal Note by {msg.senderName}</span>
                      <span className="text-[10px] text-amber-600">{msg.timestamp}</span>
                    </div>
                    <p className="whitespace-pre-line font-medium">{msg.text}</p>
                  </div>
                );
              }

              return (
                <div
                  key={msg.id || index}
                  className={`flex flex-col ${isAgent ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[82%] rounded-2xl p-3.5 shadow-sm text-xs relative ${
                      isAgent
                        ? 'bg-[#E7FCE8] text-slate-900 rounded-tr-none border border-emerald-200'
                        : 'bg-white text-slate-900 rounded-tl-none border border-slate-200'
                    }`}
                  >
                    {isAgent && (
                      <div className="text-[10px] font-bold text-emerald-800 mb-1">
                        {msg.senderName}
                      </div>
                    )}

                    <p className="whitespace-pre-line leading-relaxed font-normal text-slate-800">
                      {msg.text}
                    </p>

                    <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-slate-400">
                      <span>{msg.timestamp}</span>
                      {isAgent && <CheckCheck size={13} className="text-blue-500" />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Canned Replies Bar */}
          <div className="p-2 bg-slate-100 border-t border-slate-200 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            {cannedReplies.map((reply, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setNewMessageText(reply.text)}
                className="text-[11px] font-semibold bg-white hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 border border-slate-200 text-slate-700 px-2.5 py-1 rounded-lg shrink-0 transition-colors shadow-2xs"
              >
                {reply.label}
              </button>
            ))}

            {/* AI Translator / Smart Reply Button (matching screenshot purple button) */}
            <button
              type="button"
              onClick={handleAiSmartReply}
              className="text-[11px] font-black bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-3 py-1 rounded-lg shrink-0 shadow-sm flex items-center gap-1.5 ml-auto hover:opacity-95 active:scale-95 transition-all"
            >
              <Sparkles size={12} className="text-yellow-300" />
              AI Translator / Smart Reply
            </button>
          </div>

          {/* Chat Input Bar */}
          <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
            <textarea
              rows={1}
              value={newMessageText}
              onChange={(e) => setNewMessageText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder={isInternalNote ? "Write an internal team note (hidden from customer)..." : "Type a WhatsApp response (Enter to send)..."}
              className={`flex-1 px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none resize-none transition-colors ${
                isInternalNote
                  ? 'bg-amber-50 border-amber-300 text-amber-950 placeholder-amber-400'
                  : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-emerald-500'
              }`}
            />

            <button
              type="submit"
              disabled={!newMessageText.trim()}
              className={`p-2.5 rounded-xl text-white transition-all shadow-md shrink-0 disabled:opacity-50 ${
                isInternalNote ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              <Send size={16} />
            </button>
          </form>
        </div>

        {/* COLUMN 3: Contact Information & Hosting CRM Sync (3 Cols) matching reference screenshot */}
        <div className="lg:col-span-3 border-l border-slate-200 flex flex-col bg-white">
          
          {/* Header */}
          <div className="p-4 border-b border-slate-200">
            <h3 className="font-extrabold text-sm text-slate-800 tracking-tight">
              Contact Information
            </h3>
            <p className="text-[11px] text-slate-500">
              Synced with InHostBilling & WhatsApp CRM
            </p>
          </div>

          {/* Subtabs matching screenshot: Profile, Notes, Company Info, Hosting */}
          <div className="flex border-b border-slate-200 px-3 pt-2">
            {[
              { id: 'profile', label: 'Profile' },
              { id: 'notes', label: 'Notes' },
              { id: 'company', label: 'Company Info' },
              { id: 'hosting', label: 'Hosting' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveRightTab(tab.id as any)}
                className={`flex-1 py-2 text-xs font-bold border-b-2 text-center transition-colors cursor-pointer ${
                  activeRightTab === tab.id
                    ? 'border-emerald-600 text-emerald-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Right Panel Content */}
          <div className="p-4 flex-1 overflow-y-auto space-y-4 custom-scrollbar text-xs">
            
            {activeRightTab === 'profile' && (
              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase">Contact Name</label>
                  <p className="font-bold text-slate-900 mt-0.5">{selectedConv?.contactName || 'N/A'}</p>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase">Phone Number</label>
                  <p className="font-bold text-slate-900 mt-0.5">{selectedConv?.phone || 'N/A'}</p>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase">Email Address</label>
                  <p className="font-medium text-slate-700 mt-0.5">{selectedConv?.email || 'sales@customer.com'}</p>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase">Lead Stage</label>
                  <select
                    value={selectedConv?.leadStage || 'lead'}
                    onChange={(e) => toast.success(`Lead stage updated to ${e.target.value}`)}
                    className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-lg p-2 font-bold text-xs text-slate-800 outline-none"
                  >
                    <option value="lead">New Inbound Lead</option>
                    <option value="qualified">Qualified Prospect</option>
                    <option value="in_discussion">In Negotiation / Quote</option>
                    <option value="customer">Active Customer</option>
                    <option value="churned">Closed / Churned</option>
                  </select>
                </div>

                <div className="pt-2">
                  <label className="text-[11px] font-bold text-slate-500 uppercase">Assigned Tags</label>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {selectedConv?.tags.map((tag, idx) => (
                      <span key={idx} className="bg-emerald-50 text-emerald-800 font-semibold px-2 py-0.5 rounded border border-emerald-200 text-[11px]">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeRightTab === 'company' && (
              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase">Company Name</label>
                  <input
                    type="text"
                    defaultValue="Prime Tech Solutions Ltd"
                    className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium text-xs text-slate-800"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase">Position</label>
                  <input
                    type="text"
                    defaultValue="CTO / Tech Lead"
                    className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium text-xs text-slate-800"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase">Website</label>
                  <input
                    type="text"
                    defaultValue="https://primetechbd.com"
                    className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium text-xs text-slate-800"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase">Company Size</label>
                  <input
                    type="text"
                    defaultValue="25 - 50 Employees"
                    className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium text-xs text-slate-800"
                  />
                </div>
              </div>
            )}

            {activeRightTab === 'notes' && (
              <div className="space-y-3">
                <label className="text-[11px] font-bold text-slate-500 uppercase">Team Notes History</label>
                <div className="space-y-2">
                  {selectedConv?.notes.map((note, idx) => (
                    <div key={idx} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs">
                      {note}
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => toast.success('Note saved to CRM profile')}
                  className="w-full py-2 bg-slate-900 text-white rounded-lg font-bold text-xs hover:bg-black transition-colors"
                >
                  + Add New Note
                </button>
              </div>
            )}

            {activeRightTab === 'hosting' && (
              <div className="space-y-3">
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between font-bold text-blue-900">
                    <span>WHMCS Account</span>
                    <span className="font-mono text-[11px]">{selectedConv?.whmcsAccountId || 'CUST-10492'}</span>
                  </div>
                  <p className="text-xs text-blue-700">Account verified with 2 active services.</p>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase">Registered Domains</label>
                  <ul className="mt-1 space-y-1 text-xs text-slate-700 font-mono">
                    {selectedConv?.activeServices?.domains.map((dom, idx) => (
                      <li key={idx} className="flex items-center gap-1.5 p-1.5 bg-slate-50 rounded border border-slate-200">
                        <Globe size={13} className="text-blue-600" /> {dom}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase">Active Packages</label>
                  <ul className="mt-1 space-y-1 text-xs text-slate-700">
                    {selectedConv?.activeServices?.packages.map((pkg, idx) => (
                      <li key={idx} className="flex items-center gap-1.5 p-1.5 bg-slate-50 rounded border border-slate-200 font-semibold">
                        <Server size={13} className="text-emerald-600" /> {pkg}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <button
                    onClick={() => toast.success('WHMCS invoice link sent to WhatsApp chat!')}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs transition-colors flex items-center justify-center gap-2"
                  >
                    <FileText size={14} /> Send WHMCS Invoice on WhatsApp
                  </button>

                  <button
                    onClick={() => toast.success('cPanel login credentials dispatched')}
                    className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-bold text-xs transition-colors flex items-center justify-center gap-2"
                  >
                    <Server size={14} /> Send cPanel Login Credentials
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* CRM Sync Action Bar */}
          <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-2">
            <button
              onClick={() => toast.success('Contact synced with HubSpot / Salesforce / InHostBilling!')}
              className="w-full py-2.5 bg-[#0f172a] hover:bg-black text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 transition-transform active:scale-95"
            >
              <RefreshCw size={13} /> Sync to External CRM
            </button>
          </div>
        </div>
      </div>

      {/* Chrome Extension Modal */}
      {showExtensionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden p-6 sm:p-8 space-y-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#25D366] text-white flex items-center justify-center font-black text-xl shadow-lg shadow-emerald-500/30">
                  <Chrome size={26} />
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-slate-900">
                    WAPlus: WhatsApp CRM Chrome Extension
                  </h3>
                  <p className="text-xs text-slate-500">
                    Manifest V3 • Integrates directly with WhatsApp Web (`web.whatsapp.com`)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowExtensionModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-4">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">
                Installation in 3 Simple Steps:
              </h4>
              <ol className="list-decimal list-inside space-y-2.5 text-xs text-slate-700 font-medium">
                <li>
                  Click the button below to download the ready-to-load <strong>waplus-hosting-crm-chrome-extension.zip</strong> file and extract it.
                </li>
                <li>
                  Open your browser and navigate to <code className="bg-slate-200 px-1.5 py-0.5 rounded text-slate-900 font-bold">chrome://extensions/</code> in Chrome, Brave, or Edge.
                </li>
                <li>
                  Enable <strong>Developer mode</strong> (top-right toggle), click <strong>Load unpacked</strong>, and select the extracted folder.
                </li>
              </ol>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <button
                onClick={handleDownloadExtensionZip}
                disabled={isDownloadingExtension}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#25D366] hover:bg-[#20ba59] active:scale-95 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 transition-all"
              >
                {isDownloadingExtension ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" /> Packaging Extension ZIP...
                  </>
                ) : (
                  <>
                    <Download size={16} /> Download Extension ZIP (.zip)
                  </>
                )}
              </button>

              <button
                onClick={() => setShowExtensionModal(false)}
                className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Simulator Modal for Extension Demo */}
      {showSimulatorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-4xl bg-[#111827] text-white rounded-3xl shadow-2xl border border-white/10 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 bg-slate-900 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Laptop size={18} className="text-emerald-400" />
                <span className="font-bold text-sm">WAPlus Extension Overlay Simulator (WhatsApp Web Mode)</span>
              </div>
              <button onClick={() => setShowSimulatorModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto space-y-6">
              <div className="p-4 rounded-2xl bg-emerald-950/50 border border-emerald-500/30 text-emerald-200 text-xs">
                💡 <strong>Live Simulation:</strong> This shows how your support team experiences the WAPlus floating dock right inside <code>web.whatsapp.com</code> while responding to clients.
              </div>

              <div className="relative border border-slate-700 rounded-2xl bg-[#0B141A] p-6 min-h-[350px] flex items-center justify-center text-center">
                <div className="max-w-md space-y-3">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto text-2xl">
                    📱
                  </div>
                  <h4 className="text-lg font-bold text-white">WhatsApp Web Connected</h4>
                  <p className="text-xs text-slate-400">
                    The Chrome Extension automatically injects the CRM sidebar next to each customer conversation.
                  </p>
                  <button
                    onClick={() => {
                      setShowSimulatorModal(false);
                      toast.success('Dock active in browser!');
                    }}
                    className="px-5 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs"
                  >
                    Return to Multi-Agent CRM
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
