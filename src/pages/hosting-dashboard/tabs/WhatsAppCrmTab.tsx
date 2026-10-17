import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, Phone, User, Users, Search, Plus, Send, Check, CheckCheck, 
  Sparkles, Download, ExternalLink, Chrome, Shield, Clock, Star, Bell, 
  Settings, RefreshCw, FileText, Globe, Server, AlertCircle, Bookmark,
  ChevronDown, Filter, Zap, ArrowRight, Tag, HelpCircle, Laptop, Edit3, Trash2, Sliders, CheckSquare
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { collection, getDocs, query, where, doc, setDoc } from 'firebase/firestore';
import { db } from '../../../firebase';
import { useAuth } from '../../../context/AuthContext';
import { useStaffHosts } from '../../../hooks/useStaffHosts';

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

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  status?: string;
  avatar?: string;
}

export interface WhatsAppChannel {
  id: string;
  name: string;
  phoneNumber: string;
  wabaId?: string;
  accessToken?: string;
  webhookSecret?: string;
  enabled: boolean;
  defaultAssignedStaffId?: string;
  assignedStaffIds: string[];
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

  // INSTANT CHAT WITH INPUT NUMBER STATE (Sales & Customer Management)
  const [showInstantChatModal, setShowInstantChatModal] = useState(false);
  const [instantPhone, setInstantPhone] = useState('');
  const [instantContactName, setInstantContactName] = useState('');
  const [instantInitialMessage, setInstantInitialMessage] = useState('');
  const [instantLeadStage, setInstantLeadStage] = useState<'lead' | 'qualified' | 'in_discussion' | 'customer'>('lead');
  const [instantOpenExternal, setInstantOpenExternal] = useState(true);
  const [isStartingInstantChat, setIsStartingInstantChat] = useState(false);

  // Custom Data-Fetching Hook for Staff & Hosts Database Collection
  const { staffMembers: hookStaffMembers, activeStaffMembers, refetch: refetchStaffHosts } = useStaffHosts();

  // Dynamic Staff & Hosts State
  const [staffList, setStaffList] = useState<StaffMember[]>([]);

  useEffect(() => {
    if (hookStaffMembers && hookStaffMembers.length > 0) {
      setStaffList(hookStaffMembers);
    }
  }, [hookStaffMembers]);

  const { user, profile } = useAuth();

  const [currentAgent, setCurrentAgent] = useState<StaffMember>({
    id: 'staff_1',
    name: 'Alex M.',
    email: 'alex@click2it.bd',
    role: 'Support Admin'
  });

  // Automatically match currentAgent with authenticated Firebase Auth user profile
  useEffect(() => {
    if (user && profile) {
      const userEmail = user.email?.toLowerCase();
      const matched = staffList.find(s => s.email?.toLowerCase() === userEmail);
      if (matched) {
        setCurrentAgent(matched);
      } else if (profile.role === 'admin' || profile.role === 'staff' || profile.role === 'manager') {
        setCurrentAgent({
          id: user.uid,
          name: profile.displayName || user.displayName || user.email?.split('@')[0] || 'Support Agent',
          email: user.email || '',
          role: profile.role === 'admin' ? 'Support Admin' : (profile.role === 'manager' ? 'Sales Lead' : 'Technical Support')
        });
      }
    }
  }, [user, profile, staffList]);

  // Settings & Channels Modal State
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'channels' | 'staff'>('channels');
  const [channels, setChannels] = useState<WhatsAppChannel[]>([
    {
      id: 'chan_1',
      name: 'Official Sales & Support Line',
      phoneNumber: '+880 1700-000000',
      wabaId: 'waba_90412849102',
      enabled: true,
      defaultAssignedStaffId: 'staff_1',
      assignedStaffIds: ['staff_1', 'staff_2', 'staff_3']
    },
    {
      id: 'chan_2',
      name: 'VIP Enterprise Cloud VPS Line',
      phoneNumber: '+880 1800-000000',
      wabaId: 'waba_90412849103',
      enabled: true,
      defaultAssignedStaffId: 'staff_2',
      assignedStaffIds: ['staff_2', 'staff_4']
    }
  ]);

  // Channel Creation / Modification Form State
  const [editingChannel, setEditingChannel] = useState<WhatsAppChannel | null>(null);
  const [channelForm, setChannelForm] = useState({
    name: '',
    phoneNumber: '',
    wabaId: '',
    accessToken: '',
    defaultAssignedStaffId: '',
    assignedStaffIds: [] as string[]
  });

  // New Staff & Hosts Creation Form State
  const [newStaffForm, setNewStaffForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'staff'
  });
  const [isSavingStaff, setIsSavingStaff] = useState(false);

  const cannedReplies = [
    { label: '👋 Welcome', text: 'Hello! Welcome to Click2IT Hosting. How can our technical support team assist you today?' },
    { label: '🌐 Nameservers', text: 'Our official nameservers are:\nns1.click2itbd.com\nns2.click2itbd.com\nPlease update them in your domain management panel.' },
    { label: '🎛️ cPanel URL', text: 'You can access your cPanel control panel at: https://cpanel.yourdomain.com:2083 or via our Client Area at https://click2it.bd/client-area' },
    { label: '💳 Invoice Link', text: 'Here is your direct invoice payment link: https://click2it.bd/client-area?tab=invoices. Instant service activation once payment completes!' },
    { label: '🚀 VPS Provisioned', text: 'Your Cloud NVMe VPS has been deployed successfully. Root credentials and dedicated IP have been sent to your email.' }
  ];

  // Fetch initial conversations, dynamic staff members, and channels
  useEffect(() => {
    fetchConversations();
    fetchStaffAndChannels();
  }, []);

  const fetchStaffAndChannels = async () => {
    let loadedStaff: StaffMember[] = [];

    // 1. Fetch Staff from /api/staff-hosts (Single Source of Truth)
    try {
      const res = await fetch('/api/staff-hosts');
      const data = await res.json();
      if (data.success && Array.isArray(data.staffHosts) && data.staffHosts.length > 0) {
        loadedStaff = data.staffHosts.map((s: any) => ({
          id: s.id,
          name: s.name,
          email: s.email,
          phone: s.phone || '',
          role: s.role || 'Technical Support',
          status: s.status || 'active',
          avatar: s.avatar || `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80`
        }));
      }
    } catch (err) {
      console.warn('Failed to load staff from /api/staff-hosts:', err);
    }

    // 2. Fetch Staff from Firestore staff_hosts collection
    if (loadedStaff.length === 0) {
      try {
        const snap = await getDocs(collection(db, 'staff_hosts'));
        if (!snap.empty) {
          snap.docs.forEach(d => {
            const data = d.data();
            if (data && data.name) {
              loadedStaff.push({
                id: d.id,
                name: data.name,
                email: data.email || '',
                phone: data.phone || '',
                role: data.role || 'Technical Support',
                status: data.status || 'active',
                avatar: data.avatar || `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80`
              });
            }
          });
        }
      } catch (err) {
        console.warn('Could not load staff_hosts from Firestore:', err);
      }
    }

    // 3. Fetch Staff from Firestore users collection
    if (loadedStaff.length === 0) {
      try {
        const q = query(collection(db, 'users'));
        const snap = await getDocs(q);
        if (!snap.empty) {
          snap.docs.forEach(d => {
            const data = d.data();
            if (data && (data.role === 'admin' || data.role === 'staff' || data.role === 'manager')) {
              loadedStaff.push({
                id: d.id,
                name: data.displayName || data.name || data.email?.split('@')[0] || 'Staff Member',
                email: data.email || '',
                phone: data.phone || '',
                role: data.role === 'admin' ? 'Support Admin' : (data.role === 'manager' ? 'Sales Lead' : 'Technical Support'),
                status: data.status || 'active',
                avatar: data.avatar || `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80`
              });
            }
          });
        }
      } catch (err) {
        console.warn('Could not load staff list from Firestore users:', err);
      }
    }

    if (loadedStaff.length > 0) {
      setStaffList(loadedStaff);
      setCurrentAgent(loadedStaff[0]);
    }

    // 4. Fetch Channels & Staff from /api/whatsapp/channels
    try {
      const res = await fetch('/api/whatsapp/channels');
      const data = await res.json();
      if (data.success) {
        if (Array.isArray(data.channels) && data.channels.length > 0) {
          setChannels(data.channels);
        }
        if (loadedStaff.length === 0 && Array.isArray(data.staff) && data.staff.length > 0) {
          setStaffList(data.staff);
          setCurrentAgent(data.staff[0]);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch WhatsApp channels from API:', err);
    }
  };

  const fetchConversations = async () => {
    try {
      const res = await fetch('/api/whatsapp/conversations');
      const data = await res.json();
      if (data.success && data.conversations) {
        let combined = [...data.conversations];
        try {
          const snap = await getDocs(collection(db, 'whatsapp_conversations'));
          if (!snap.empty) {
            snap.docs.forEach(d => {
              const fsConv = d.data() as WhatsAppConversation;
              if (fsConv && fsConv.id && !combined.some(c => c.id === fsConv.id)) {
                combined.unshift(fsConv);
              }
            });
          }
        } catch (fsErr) {
          console.warn('Firestore load warning:', fsErr);
        }

        setConversations(combined);
        if (combined.length > 0 && !selectedConvId) {
          setSelectedConvId(combined[0].id);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch WhatsApp conversations, using fallback', err);
    }
  };

  // Instant Chat with Input Number Handler (Records in Chat History)
  const handleStartInstantChat = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanDigits = instantPhone.replace(/\D/g, '');
    if (cleanDigits.length < 6) {
      toast.error('Please enter a valid phone number (minimum 6 digits with country or area code)');
      return;
    }

    setIsStartingInstantChat(true);

    try {
      const payload = {
        phone: instantPhone.trim(),
        contactName: instantContactName.trim() || undefined,
        initialMessage: instantInitialMessage.trim() || undefined,
        agentId: currentAgent.id,
        agentName: `${currentAgent.name} (${currentAgent.role})`,
        leadStage: instantLeadStage,
        tags: ['Instant Chat', 'Sales & Customer Mgmt']
      };

      const res = await fetch('/api/whatsapp/instant-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.success && data.conversation) {
        const returnedConv: WhatsAppConversation = data.conversation;

        setConversations(prev => {
          const exists = prev.some(c => c.id === returnedConv.id);
          if (exists) {
            return prev.map(c => c.id === returnedConv.id ? returnedConv : c);
          } else {
            return [returnedConv, ...prev];
          }
        });

        setSelectedConvId(returnedConv.id);

        // Persist to Firestore
        try {
          await setDoc(doc(db, 'whatsapp_conversations', returnedConv.id), returnedConv, { merge: true });
        } catch (fsErr) {
          console.warn('Firestore instant chat save warning:', fsErr);
        }

        toast.success(
          data.isExisting 
            ? `Existing chat with ${returnedConv.contactName} loaded in history!`
            : `⚡ New instant chat with ${returnedConv.contactName} (${returnedConv.phone}) added to chat history!`
        );

        if (instantOpenExternal) {
          const directMsg = encodeURIComponent(instantInitialMessage.trim() || 'Hello! Thank you for contacting Click2IT Hosting.');
          const waUrl = `https://wa.me/${cleanDigits}?text=${directMsg}`;
          window.open(waUrl, '_blank', 'noopener,noreferrer');
        }

        setInstantPhone('');
        setInstantContactName('');
        setInstantInitialMessage('');
        setShowInstantChatModal(false);
      } else {
        toast.error(data.error || 'Failed to start instant chat');
      }
    } catch (err: any) {
      toast.error('Error starting instant chat: ' + err.message);
    } finally {
      setIsStartingInstantChat(false);
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
    const agent = staffList.find(a => a.id === agentId);
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
      suggestion = 'You can review and pay your invoice securely at https://click2it.bd/client-area?tab=invoices via bKash, Nagad, or Credit Card with instant activation.';
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
      saveAs(blob, 'wa-hosting-crm-chrome-extension.zip');
      toast.success('📦 Chrome Extension ZIP downloaded successfully!');
    } catch (err: any) {
      console.error('Failed to create extension zip:', err);
      toast.error('Failed to download ZIP file. You can load from extension directory.');
    } finally {
      setIsDownloadingExtension(false);
    }
  };

  // Channel Creation & Modification Submit
  const handleSaveChannelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!channelForm.name || !channelForm.phoneNumber) {
      toast.error('Please enter channel name and phone number');
      return;
    }

    const payload = {
      name: channelForm.name,
      phoneNumber: channelForm.phoneNumber,
      wabaId: channelForm.wabaId,
      accessToken: channelForm.accessToken,
      defaultAssignedStaffId: channelForm.defaultAssignedStaffId || (staffList[0]?.id || ''),
      assignedStaffIds: channelForm.assignedStaffIds.length > 0 ? channelForm.assignedStaffIds : [staffList[0]?.id || '']
    };

    try {
      if (editingChannel) {
        // Update existing channel
        const res = await fetch(`/api/whatsapp/channels/${editingChannel.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, enabled: editingChannel.enabled })
        });
        const data = await res.json();
        if (data.success && data.channels) {
          setChannels(data.channels);
          toast.success(`WhatsApp Channel "${payload.name}" modified successfully!`);
        }
      } else {
        // Create new channel
        const res = await fetch('/api/whatsapp/channels', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success && data.channels) {
          setChannels(data.channels);
          toast.success(`New WhatsApp Channel "${payload.name}" added successfully!`);
        }
      }

      setEditingChannel(null);
      setChannelForm({
        name: '',
        phoneNumber: '',
        wabaId: '',
        accessToken: '',
        defaultAssignedStaffId: '',
        assignedStaffIds: []
      });
    } catch (err: any) {
      toast.error('Failed to save channel: ' + err.message);
    }
  };

  // Add Team Member to Staff & Hosts Submit
  const handleAddStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffForm.name || !newStaffForm.email) {
      toast.error('Please enter name and email');
      return;
    }

    setIsSavingStaff(true);
    try {
      // 1. Post to /api/staff-hosts
      const payload = {
        name: newStaffForm.name,
        email: newStaffForm.email,
        phone: newStaffForm.phone || '',
        role: newStaffForm.role === 'admin' ? 'Support Admin' : (newStaffForm.role === 'manager' ? 'Sales Lead' : 'Technical Support Specialist'),
        status: 'active'
      };

      await fetch('/api/staff-hosts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).catch(() => null);

      // 2. Add to Firestore users and staff_hosts collections
      const newUid = `staff_${Date.now()}`;
      await setDoc(doc(db, 'staff_hosts', newUid), { ...payload, id: newUid }).catch(() => null);
      await setDoc(doc(db, 'users', newUid), {
        uid: newUid,
        displayName: newStaffForm.name,
        name: newStaffForm.name,
        email: newStaffForm.email,
        phone: newStaffForm.phone || '',
        role: newStaffForm.role,
        status: 'active',
        createdAt: new Date().toISOString()
      }).catch(() => null);

      // 3. Refetch hook
      await refetchStaffHosts();

      toast.success(`🎉 Added ${newStaffForm.name} to Staff & Hosts system!`);
      setNewStaffForm({ name: '', email: '', phone: '', role: 'staff' });
    } catch (err: any) {
      toast.error('Failed to add staff member: ' + err.message);
    } finally {
      setIsSavingStaff(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Top Hero Section matching WA screenshot */}
      <div className="relative rounded-3xl bg-gradient-to-r from-[#0B132B] via-[#1C2541] to-[#14213d] text-white p-6 sm:p-8 md:p-10 overflow-hidden shadow-2xl border border-white/10">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-4xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold uppercase tracking-wider mb-4">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            Official WA WhatsApp CRM & Webhook Integration
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight leading-tight">
            WA: WhatsApp CRM for Sales and Customer Management
          </h1>

          <p className="mt-3 text-sm sm:text-base text-slate-300 font-normal leading-relaxed max-w-3xl">
            WA is a multi-agent WhatsApp CRM built for hosting teams. Multiple agents from the Staff & Hosts list can collaborate, receive, and answer customer queries in real-time, automate replies and follow-ups, and sync customer data with hosting accounts and WHMCS.
          </p>

          {/* Quick Action Buttons matching reference image */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            {/* INSTANT CHAT WITH NUMBER INPUT BUTTON */}
            <button
              onClick={() => setShowInstantChatModal(true)}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 active:scale-95 text-slate-950 font-black text-sm shadow-lg shadow-emerald-500/30 transition-all cursor-pointer"
            >
              <Zap size={18} className="fill-slate-950" />
              ⚡ Instant Chat (Number Input)
            </button>

            <button
              onClick={() => setShowExtensionModal(true)}
              className="inline-flex items-center gap-2.5 px-6 py-3 rounded-xl bg-[#25D366] hover:bg-[#20ba59] active:scale-95 text-slate-950 font-black text-sm shadow-lg shadow-emerald-500/30 transition-all cursor-pointer"
            >
              <Chrome size={18} />
              Add WA to Chrome
            </button>

            <button
              onClick={() => setShowSettingsModal(true)}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-extrabold text-sm shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
            >
              <Settings size={18} /> ⚙️ Settings & Channels
            </button>

            <button
              onClick={() => setShowSimulatorModal(true)}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white font-bold text-sm border border-white/20 transition-all cursor-pointer"
            >
              Explore WA Workspace <ArrowRight size={16} />
            </button>

            <button
              onClick={handleSimulateIncomingQuery}
              className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md ml-auto cursor-pointer"
              title="Test multi-agent queue with a simulated WhatsApp customer"
            >
              <Zap size={15} /> Simulate Incoming Customer Query
            </button>
          </div>

          {/* Active Agent Selector - Dynamically Connected to Staff & Hosts */}
          <div className="mt-6 pt-5 border-t border-white/10 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-300">
            <div className="flex items-center gap-3">
              <span className="font-semibold text-slate-400">Active Staff Member (Staff & Hosts):</span>
              <select
                value={currentAgent.id}
                onChange={(e) => {
                  const agent = staffList.find(a => a.id === e.target.value);
                  if (agent) {
                    setCurrentAgent(agent);
                    toast.success(`Switched active staff to ${agent.name}`);
                  }
                }}
                className="bg-black/40 border border-white/20 rounded-lg px-3 py-1.5 text-xs text-white font-bold outline-none cursor-pointer"
              >
                {staffList.map(a => (
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
                <span className="text-slate-200 font-semibold">{staffList.length} Active Staff Connected</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Workspace Tabs matching screenshot */}
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
          className="text-xs font-bold text-emerald-700 hover:text-emerald-800 px-3 py-1.5 rounded-lg border border-dashed border-emerald-300 hover:border-emerald-500 transition-colors whitespace-nowrap flex items-center gap-1.5 ml-2 shrink-0 cursor-pointer"
        >
          <Plus size={14} /> Add Label
        </button>
      </div>

      {/* Main 3-Column Workspace matching WA Reference Design */}
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
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setShowInstantChatModal(true)}
                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs flex items-center gap-1 shadow-xs cursor-pointer transition-colors"
                  title="Start instant chat with a phone number"
                >
                  <Plus size={13} /> Instant Chat
                </button>
                <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                  {filteredConversations.length}
                </span>
              </div>
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

                    {/* Tags & Assigned Staff Member */}
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

            {/* Reassign Agent Dropdown - Dynamically populated from Staff & Hosts */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">Assigned Staff:</span>
              <select
                value={selectedConv?.assignedAgent?.id || 'unassigned'}
                onChange={(e) => selectedConv && handleAssignAgent(selectedConv.id, e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-lg text-xs text-white px-2 py-1.5 font-bold outline-none cursor-pointer"
              >
                <option value="unassigned">Unassigned</option>
                {staffList.map(a => (
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
                className="text-[11px] font-semibold bg-white hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 border border-slate-200 text-slate-700 px-2.5 py-1 rounded-lg shrink-0 transition-colors shadow-2xs cursor-pointer"
              >
                {reply.label}
              </button>
            ))}

            <button
              type="button"
              onClick={handleAiSmartReply}
              className="text-[11px] font-black bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-3 py-1 rounded-lg shrink-0 shadow-sm flex items-center gap-1.5 ml-auto hover:opacity-95 active:scale-95 transition-all cursor-pointer"
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
              className={`p-2.5 rounded-xl text-white transition-all shadow-md shrink-0 disabled:opacity-50 cursor-pointer ${
                isInternalNote ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              <Send size={16} />
            </button>
          </form>
        </div>

        {/* COLUMN 3: Contact Information & Hosting CRM Sync */}
        <div className="lg:col-span-3 border-l border-slate-200 flex flex-col bg-white">
          
          <div className="p-4 border-b border-slate-200">
            <h3 className="font-extrabold text-sm text-slate-800 tracking-tight">
              Contact Information
            </h3>
            <p className="text-[11px] text-slate-500">
              Synced with InHostBilling & WA CRM
            </p>
          </div>

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
                  className="w-full py-2 bg-slate-900 text-white rounded-lg font-bold text-xs hover:bg-black transition-colors cursor-pointer"
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
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <FileText size={14} /> Send WHMCS Invoice on WhatsApp
                  </button>

                  <button
                    onClick={() => toast.success('cPanel login credentials dispatched')}
                    className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Server size={14} /> Send cPanel Login Credentials
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-2">
            <button
              onClick={() => toast.success('Contact synced with HubSpot / Salesforce / InHostBilling!')}
              className="w-full py-2.5 bg-[#0f172a] hover:bg-black text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 transition-transform active:scale-95 cursor-pointer"
            >
              <RefreshCw size={13} /> Sync to External CRM
            </button>
          </div>
        </div>
      </div>

      {/* WHATSAPP SETTINGS & CHANNELS MODAL */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-in fade-in">
          <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[92vh]">
            
            {/* Modal Header */}
            <div className="p-5 sm:p-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
              <div>
                <h3 className="text-lg sm:text-xl font-extrabold text-white flex items-center gap-2">
                  <Settings size={20} className="text-cyan-400" />
                  WA WhatsApp Channel & Team Settings Manager
                </h3>
                <p className="text-xs text-slate-400">
                  Configure WhatsApp Cloud API channels and map staff members directly from the Staff & Hosts section.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowSettingsModal(false);
                  setEditingChannel(null);
                }}
                className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-white/10"
              >
                ✕
              </button>
            </div>

            {/* Modal Subtabs */}
            <div className="flex border-b border-slate-200 bg-slate-100 px-6 pt-3 shrink-0">
              <button
                onClick={() => setSettingsTab('channels')}
                className={`px-5 py-2.5 text-xs font-black rounded-t-xl border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
                  settingsTab === 'channels'
                    ? 'bg-white border-indigo-600 text-indigo-700 shadow-xs'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <Phone size={15} /> Add & Modify WhatsApp Channels ({channels.length})
              </button>

              <button
                onClick={() => setSettingsTab('staff')}
                className={`px-5 py-2.5 text-xs font-black rounded-t-xl border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
                  settingsTab === 'staff'
                    ? 'bg-white border-indigo-600 text-indigo-700 shadow-xs'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <Users size={15} /> Staff & Hosts Team Members ({staffList.length})
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6 bg-slate-50/50 text-xs">
              
              {/* TAB 1: WHATSAPP CHANNELS MANAGEMENT */}
              {settingsTab === 'channels' && (
                <div className="space-y-6">
                  
                  {/* Channels List */}
                  <div className="space-y-3">
                    <h4 className="font-extrabold text-slate-800 uppercase tracking-wider text-[11px]">
                      Configured WhatsApp Channels
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {channels.map((chan) => {
                        const defaultStaff = staffList.find(s => s.id === chan.defaultAssignedStaffId);
                        return (
                          <div key={chan.id} className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
                            <div className="flex items-start justify-between">
                              <div>
                                <h5 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                                  {chan.name}
                                  <span className={`w-2 h-2 rounded-full ${chan.enabled ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                                </h5>
                                <p className="font-mono text-xs text-slate-500 font-bold mt-0.5">
                                  {chan.phoneNumber}
                                </p>
                              </div>

                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingChannel(chan);
                                    setChannelForm({
                                      name: chan.name,
                                      phoneNumber: chan.phoneNumber,
                                      wabaId: chan.wabaId || '',
                                      accessToken: chan.accessToken || '',
                                      defaultAssignedStaffId: chan.defaultAssignedStaffId || '',
                                      assignedStaffIds: chan.assignedStaffIds || []
                                    });
                                  }}
                                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                                  title="Modify Channel"
                                >
                                  <Edit3 size={14} />
                                </button>
                              </div>
                            </div>

                            <div className="pt-2 border-t border-slate-100 space-y-1.5 text-[11px] text-slate-600">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-slate-500">Default Assigned Staff:</span>
                                <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                                  👤 {defaultStaff?.name || 'First Available Staff'}
                                </span>
                              </div>

                              <div className="flex items-center justify-between">
                                <span className="font-bold text-slate-500">WABA Account ID:</span>
                                <span className="font-mono">{chan.wabaId || 'waba_default'}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* ADD / MODIFY CHANNEL FORM */}
                  <form onSubmit={handleSaveChannelSubmit} className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
                    <h4 className="font-black text-slate-900 text-sm flex items-center gap-2">
                      <Plus size={16} className="text-indigo-600" />
                      {editingChannel ? `Modify WhatsApp Channel "${editingChannel.name}"` : 'Add New WhatsApp Channel'}
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Channel Display Name</label>
                        <input
                          type="text"
                          required
                          value={channelForm.name}
                          onChange={(e) => setChannelForm({ ...channelForm, name: e.target.value })}
                          placeholder="e.g. Official Technical Support Line"
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="font-bold text-slate-700 block mb-1">WhatsApp Phone Number</label>
                        <input
                          type="text"
                          required
                          value={channelForm.phoneNumber}
                          onChange={(e) => setChannelForm({ ...channelForm, phoneNumber: e.target.value })}
                          placeholder="e.g. +880 1700-000000"
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">
                          Default Assigned Staff Member (From Staff & Hosts)
                        </label>
                        <select
                          value={channelForm.defaultAssignedStaffId}
                          onChange={(e) => setChannelForm({ ...channelForm, defaultAssignedStaffId: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                        >
                          <option value="">Select Staff Member...</option>
                          {staffList.map(s => (
                            <option key={s.id} value={s.id}>
                              {s.name} — {s.role} ({s.email})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="font-bold text-slate-700 block mb-1">WhatsApp Business Account ID (WABA ID)</label>
                        <input
                          type="text"
                          value={channelForm.wabaId}
                          onChange={(e) => setChannelForm({ ...channelForm, wabaId: e.target.value })}
                          placeholder="e.g. waba_90412849102"
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">WhatsApp Meta Access Token</label>
                      <input
                        type="password"
                        value={channelForm.accessToken}
                        onChange={(e) => setChannelForm({ ...channelForm, accessToken: e.target.value })}
                        placeholder="EAAB..."
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-2">
                      {editingChannel && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingChannel(null);
                            setChannelForm({ name: '', phoneNumber: '', wabaId: '', accessToken: '', defaultAssignedStaffId: '', assignedStaffIds: [] });
                          }}
                          className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                        >
                          Cancel Editing
                        </button>
                      )}

                      <button
                        type="submit"
                        className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl shadow-md transition-colors cursor-pointer"
                      >
                        {editingChannel ? 'Save Modified Channel' : 'Add WhatsApp Channel'}
                      </button>
                    </div>
                  </form>

                </div>
              )}

              {/* TAB 2: STAFF & HOSTS TEAM MEMBERS */}
              {settingsTab === 'staff' && (
                <div className="space-y-6">
                  
                  {/* Current Active Staff Members */}
                  <div>
                    <h4 className="font-extrabold text-slate-800 uppercase tracking-wider text-[11px] mb-3">
                      Connected Staff Members (Loaded from Staff & Hosts Module)
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {staffList.map((member) => (
                        <div key={member.id} className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <img
                              src={member.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'}
                              alt=""
                              className="w-10 h-10 rounded-full object-cover border border-slate-200"
                            />
                            <div>
                              <h5 className="font-bold text-slate-900 text-xs">{member.name}</h5>
                              <p className="text-[11px] text-slate-500 font-medium">{member.email}</p>
                            </div>
                          </div>

                          <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 shrink-0">
                            {member.role}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Add New Team Member into Staff & Hosts Form */}
                  <form onSubmit={handleAddStaffSubmit} className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
                    <h4 className="font-black text-slate-900 text-sm flex items-center gap-2">
                      <Plus size={16} className="text-indigo-600" />
                      Add New Team Member to Staff & Hosts System
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Staff Member Full Name</label>
                        <input
                          type="text"
                          required
                          value={newStaffForm.name}
                          onChange={(e) => setNewStaffForm({ ...newStaffForm, name: e.target.value })}
                          placeholder="e.g. Mahmudul Hasan"
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Official Email Address</label>
                        <input
                          type="email"
                          required
                          value={newStaffForm.email}
                          onChange={(e) => setNewStaffForm({ ...newStaffForm, email: e.target.value })}
                          placeholder="e.g. mahmudul@click2it.bd"
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Phone Number</label>
                        <input
                          type="text"
                          value={newStaffForm.phone}
                          onChange={(e) => setNewStaffForm({ ...newStaffForm, phone: e.target.value })}
                          placeholder="e.g. +880 1712-345678"
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Staff Role</label>
                        <select
                          value={newStaffForm.role}
                          onChange={(e) => setNewStaffForm({ ...newStaffForm, role: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                        >
                          <option value="staff">Technical Support Staff</option>
                          <option value="manager">Sales & Operations Lead</option>
                          <option value="admin">Support Admin</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center justify-end pt-2">
                      <button
                        type="submit"
                        disabled={isSavingStaff}
                        className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl shadow-md transition-colors cursor-pointer"
                      >
                        {isSavingStaff ? 'Saving to Staff & Hosts...' : 'Add Team Member'}
                      </button>
                    </div>
                  </form>

                </div>
              )}

            </div>

          </div>
        </div>
      )}

      {/* INSTANT WHATSAPP CHAT WITH INPUT NUMBER MODAL (Sales & Customer Management) */}
      {showInstantChatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden p-6 sm:p-8 space-y-6">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-green-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30">
                  <MessageSquare size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-slate-900">
                      Instant WhatsApp Chat
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider">
                      Sales & CRM
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Input any phone number to start an instant WhatsApp chat session and log it directly into chat history.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowInstantChatModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleStartInstantChat} className="space-y-4">
              
              {/* Phone Number Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700">
                  Phone Number <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. +880 1712-345678 or 01712345678"
                    value={instantPhone}
                    onChange={(e) => setInstantPhone(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all font-mono"
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                  <span>Enter with country code (+880, +1, +44, +91) or BD local 01X number</span>
                  <button
                    type="button"
                    onClick={() => setInstantPhone('+880 1712-')}
                    className="text-emerald-700 hover:underline font-bold cursor-pointer"
                  >
                    +880 Prefix
                  </button>
                </div>
              </div>

              {/* Contact Name & Pipeline Stage */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700">
                    Contact / Lead Name <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <div className="relative">
                    <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="e.g. Rafiqul Islam"
                      value={instantContactName}
                      onChange={(e) => setInstantContactName(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700">
                    Lead Stage
                  </label>
                  <select
                    value={instantLeadStage}
                    onChange={(e) => setInstantLeadStage(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none cursor-pointer focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="lead">New Inbound Lead</option>
                    <option value="qualified">Qualified Opportunity</option>
                    <option value="in_discussion">In Active Discussion</option>
                    <option value="customer">Existing Hosting Customer</option>
                  </select>
                </div>
              </div>

              {/* Quick Template Selector */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-700">
                    Initial Message <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <span className="text-[11px] text-emerald-600 font-bold">Quick Templates:</span>
                </div>
                
                <div className="flex flex-wrap gap-1.5 mb-1.5">
                  {[
                    { label: '👋 Welcome', text: 'Hello! Welcome to Click2IT Hosting. How can our sales and technical support team assist you today?' },
                    { label: '🚀 VPS 40% OFF', text: 'Hi! We have an exclusive 40% discount on pure Cloud NVMe VPS with root access and 1 Gbps bandwidth. Would you like a custom quote?' },
                    { label: '🌐 Domain Inquiry', text: 'Hello! I noticed you are inquiring about domain registration (.BD / .COM). How may we help reserve your digital identity?' },
                    { label: '💳 Invoice Payment', text: 'Hello! Here is your secure invoice link for Click2IT Hosting: https://click2it.bd/client-area?tab=invoices. Instant service activation!' }
                  ].map((tpl, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setInstantInitialMessage(tpl.text)}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 text-[11px] font-bold text-slate-600 transition-colors border border-slate-200 cursor-pointer"
                    >
                      {tpl.label}
                    </button>
                  ))}
                </div>

                <textarea
                  rows={3}
                  placeholder="Type an opening message or greeting to start the conversation..."
                  value={instantInitialMessage}
                  onChange={(e) => setInstantInitialMessage(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white resize-none"
                />
              </div>

              {/* Assigned Agent & Options */}
              <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200 space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 font-bold">Assigned Staff Member:</span>
                  <span className="text-blue-700 font-extrabold bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                    👤 {currentAgent.name} ({currentAgent.role})
                  </span>
                </div>

                <label className="flex items-center gap-2 cursor-pointer select-none text-slate-700 font-medium">
                  <input
                    type="checkbox"
                    checked={instantOpenExternal}
                    onChange={(e) => setInstantOpenExternal(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 accent-emerald-600 focus:ring-0"
                  />
                  <span>Also open in official WhatsApp Web (<code>wa.me</code>) in a new tab</span>
                </label>

                <div className="text-[11px] text-slate-500 flex items-start gap-1.5 pt-1 border-t border-slate-200/60">
                  <Sparkles size={13} className="text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    This conversation will be permanently included in your WhatsApp CRM chat history and visible to authorized staff.
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowInstantChatModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isStartingInstantChat || !instantPhone.trim()}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 active:scale-95 disabled:opacity-50 text-white font-extrabold text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-emerald-600/25 transition-all cursor-pointer"
                >
                  {isStartingInstantChat ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" /> Starting Instant Chat...
                    </>
                  ) : (
                    <>
                      <Send size={14} /> Start Instant Chat & Add to History
                    </>
                  )}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

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
                    WA: WhatsApp CRM Chrome Extension
                  </h3>
                  <p className="text-xs text-slate-500">
                    Manifest V3 • Integrates directly with WhatsApp Web (`web.whatsapp.com`)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowExtensionModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-4 text-xs">
              <h4 className="font-black uppercase tracking-wider text-slate-700">
                Installation in 3 Simple Steps:
              </h4>
              <ol className="list-decimal list-inside space-y-2.5 text-slate-700 font-medium">
                <li>
                  Click the button below to download the ready-to-load <strong>wa-hosting-crm-chrome-extension.zip</strong> file and extract it.
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
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#25D366] hover:bg-[#20ba59] active:scale-95 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 transition-all cursor-pointer"
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
                className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
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
                <span className="font-bold text-sm">WA Extension Overlay Simulator (WhatsApp Web Mode)</span>
              </div>
              <button onClick={() => setShowSimulatorModal(false)} className="text-slate-400 hover:text-white cursor-pointer">✕</button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto space-y-6">
              <div className="p-4 rounded-2xl bg-emerald-950/50 border border-emerald-500/30 text-emerald-200 text-xs">
                💡 <strong>Live Simulation:</strong> This shows how your support team experiences the WA floating dock right inside <code>web.whatsapp.com</code> while responding to clients.
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
                    className="px-5 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs cursor-pointer"
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
