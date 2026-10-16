import { Router, Response } from 'express';
import { requireFirebaseAuth } from '../middleware/firebaseAuth.js';

const campaignRouter = Router();

// In-memory persistent stores with rich initial datasets (synced across sessions)
interface MetaCampaign {
  id: string;
  name: string;
  objective: 'whatsapp_leads' | 'domain_offers' | 'vps_promo' | 'hosting_sales' | 'retargeting';
  platforms: ('facebook' | 'instagram')[];
  status: 'active' | 'paused' | 'completed' | 'draft';
  budget: {
    amount: number;
    currency: string;
    type: 'daily' | 'lifetime';
  };
  metrics: {
    spend: number;
    impressions: number;
    clicks: number;
    leads: number; // WhatsApp chats or form leads
    cpl: number; // Cost per lead
    ctr: number; // Click through rate %
    roas: number; // Return on ad spend
  };
  creative: {
    headline: string;
    primaryText: string;
    description: string;
    callToAction: string;
    whatsappMessage: string;
    mediaUrl: string;
    displayLink: string;
  };
  targeting: {
    countries: string[];
    ageRange: string;
    interests: string[];
  };
  createdAt: string;
  updatedAt: string;
}

interface WhatsAppMessage {
  id: string;
  sender: 'customer' | 'agent' | 'bot';
  senderName: string;
  agentId?: string;
  text: string;
  timestamp: string;
  status: 'sent' | 'delivered' | 'read';
  mediaUrl?: string;
  mediaType?: 'image' | 'document' | 'audio';
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

let metaCampaigns: MetaCampaign[] = [
  {
    id: 'camp_meta_1',
    name: '🔥 High-Speed NVMe VPS 40% OFF - WhatsApp Lead Ad',
    objective: 'whatsapp_leads',
    platforms: ['facebook', 'instagram'],
    status: 'active',
    budget: { amount: 25, currency: 'USD', type: 'daily' },
    metrics: {
      spend: 480,
      impressions: 168400,
      clicks: 5240,
      leads: 312,
      cpl: 1.53,
      ctr: 3.11,
      roas: 5.2,
    },
    creative: {
      headline: '🚀 Deploy Pure NVMe VPS in 60s - Root Access & 2Tbps Anti-DDoS',
      primaryText: 'Need enterprise-grade performance for your web apps and WordPress? Get pure NVMe SSDs, dedicated vCPUs, and instant setup. Chat with our server engineers on WhatsApp now for an exclusive 40% discount coupon!',
      description: 'Instant Setup • 99.9% Uptime SLA • Official cPanel Support',
      callToAction: 'Send WhatsApp Message',
      whatsappMessage: 'Hi Click2IT! I saw your Meta ad for Cloud VPS with 40% OFF. I need pricing and server specifications.',
      mediaUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&auto=format&fit=crop&q=80',
      displayLink: 'click2itbd.com/vps'
    },
    targeting: {
      countries: ['Bangladesh', 'India', 'United States', 'United Kingdom'],
      ageRange: '20-55',
      interests: ['Web Hosting', 'WordPress', 'Linux Server', 'Software Engineering', 'E-commerce']
    },
    createdAt: '2026-09-15T10:00:00Z',
    updatedAt: '2026-10-16T08:30:00Z'
  },
  {
    id: 'camp_meta_2',
    name: '🌐 .COM & .BD Domain Registration Flash Sale (From $1.99)',
    objective: 'domain_offers',
    platforms: ['facebook', 'instagram'],
    status: 'active',
    budget: { amount: 18, currency: 'USD', type: 'daily' },
    metrics: {
      spend: 320,
      impressions: 112000,
      clicks: 4190,
      leads: 245,
      cpl: 1.30,
      ctr: 3.74,
      roas: 4.6,
    },
    creative: {
      headline: 'Claim Your Dream Domain Name Today - Free DNS & Privacy Lock',
      primaryText: 'Start your brand right with an official .COM or .BD domain. Instant registration, 24/7 technical assistance, and free domain forwarding. Chat on WhatsApp to verify availability in real-time!',
      description: 'Search & Register with Click2IT • Lowest Renewal Rates Guaranteed',
      callToAction: 'Send WhatsApp Message',
      whatsappMessage: 'Hello! I want to check domain availability and register a new domain name.',
      mediaUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&auto=format&fit=crop&q=80',
      displayLink: 'click2itbd.com/domain'
    },
    targeting: {
      countries: ['Bangladesh', 'Global'],
      ageRange: '18-60',
      interests: ['Startup Company', 'Small Business', 'Digital Marketing', 'Domain Name Registry']
    },
    createdAt: '2026-09-20T12:00:00Z',
    updatedAt: '2026-10-16T09:15:00Z'
  },
  {
    id: 'camp_meta_3',
    name: '📦 cPanel Ultra Web Hosting 50% Bundle Promo',
    objective: 'hosting_sales',
    platforms: ['facebook', 'instagram'],
    status: 'paused',
    budget: { amount: 15, currency: 'USD', type: 'daily' },
    metrics: {
      spend: 210,
      impressions: 74200,
      clicks: 2890,
      leads: 180,
      cpl: 1.16,
      ctr: 3.89,
      roas: 4.1,
    },
    creative: {
      headline: 'Lightning-Fast cPanel Hosting with Free SSL & Unlimited Bandwidth',
      primaryText: 'Host your personal or business website with 99.9% uptime and 1-click WordPress installer. Get free migration from any host!',
      description: 'Free Daily Backups • LiteSpeed Web Server • 24/7 WhatsApp Support',
      callToAction: 'Send WhatsApp Message',
      whatsappMessage: 'Hi, I need to migrate my website to your cPanel hosting. Please give me details.',
      mediaUrl: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=800&auto=format&fit=crop&q=80',
      displayLink: 'click2itbd.com/hosting'
    },
    targeting: {
      countries: ['Bangladesh'],
      ageRange: '22-50',
      interests: ['Blogging', 'Web Design', 'Freelance Work']
    },
    createdAt: '2026-10-01T08:00:00Z',
    updatedAt: '2026-10-14T14:20:00Z'
  }
];

let whatsAppConversations: WhatsAppConversation[] = [
  {
    id: 'conv_wa_1',
    contactName: 'Tanvir Ahmed',
    phone: '+880 1712-345678',
    email: 'tanvir@primetechbd.com',
    avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    leadStage: 'customer',
    tags: ['VPS Lead', 'Meta Ad Lead', 'High Priority'],
    assignedAgent: { id: 'agent_1', name: 'Alex M. (Support Admin)' },
    statusLabel: 'all',
    unreadCount: 0,
    lastMessageSnippet: 'Thanks for provisioning the AlmaLinux VPS! All DNS entries are resolving properly now.',
    lastMessageTime: '10:42 AM',
    whmcsAccountId: 'CUST-10492',
    activeServices: {
      domains: ['primetechbd.com', 'primecloud.xyz'],
      packages: ['Cloud NVMe VPS - 4 vCPU / 8GB RAM'],
      unpaidInvoices: 0
    },
    notes: [
      'Customer came from Facebook Click-to-WhatsApp VPS ad.',
      'Granted 15% annual billing promo code: VPSVIP15.'
    ],
    messages: [
      {
        id: 'msg_1',
        sender: 'customer',
        senderName: 'Tanvir Ahmed',
        text: 'Hi Click2IT! I saw your Meta ad for Cloud VPS with 40% OFF. I need pricing and server specifications for high-traffic Node.js.',
        timestamp: '10:15 AM',
        status: 'read'
      },
      {
        id: 'msg_2',
        sender: 'agent',
        senderName: 'Alex M.',
        agentId: 'agent_1',
        text: 'Hello Tanvir! Welcome to Click2IT Hosting. We have pure NVMe VPS with root access, 1 Gbps port, and DDoS shield. For Node.js, our 4 Core / 8GB RAM package is ideal.',
        timestamp: '10:18 AM',
        status: 'read'
      },
      {
        id: 'msg_3',
        sender: 'customer',
        senderName: 'Tanvir Ahmed',
        text: 'Can you send the invoice and cPanel/Root credentials here?',
        timestamp: '10:25 AM',
        status: 'read'
      },
      {
        id: 'msg_4',
        sender: 'agent',
        senderName: 'Alex M.',
        agentId: 'agent_1',
        text: 'Here is your direct activation link and WHMCS invoice: https://click2itbd.com/client-area?invoice=INV-8491. Your server is being deployed.',
        timestamp: '10:30 AM',
        status: 'read'
      },
      {
        id: 'msg_5',
        sender: 'customer',
        senderName: 'Tanvir Ahmed',
        text: 'Thanks for provisioning the AlmaLinux VPS! All DNS entries are resolving properly now.',
        timestamp: '10:42 AM',
        status: 'read'
      }
    ]
  },
  {
    id: 'conv_wa_2',
    contactName: 'Nusrat Jahan',
    phone: '+880 1891-987654',
    email: 'nusrat.jahan@dhakadesigns.net',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    leadStage: 'in_discussion',
    tags: ['cPanel Hosting', 'Domain Pending'],
    assignedAgent: { id: 'agent_2', name: 'Sarah K. (Sales Lead)' },
    statusLabel: 'unread',
    unreadCount: 2,
    lastMessageSnippet: 'Can I bundle a .COM domain with Pro cPanel hosting for 1 year?',
    lastMessageTime: '11:15 AM',
    whmcsAccountId: 'CUST-10811',
    activeServices: {
      domains: ['dhakadesigns.com'],
      packages: ['Starter cPanel Web Hosting (Renewal Due)'],
      unpaidInvoices: 1
    },
    notes: ['Interested in upgrading from Starter to Pro Hosting bundle with new domain.'],
    messages: [
      {
        id: 'msg_201',
        sender: 'customer',
        senderName: 'Nusrat Jahan',
        text: 'Hi, I registered my domain dhakadesigns.com on your portal. I saw the hosting offer modal!',
        timestamp: '11:10 AM',
        status: 'read'
      },
      {
        id: 'msg_202',
        sender: 'customer',
        senderName: 'Nusrat Jahan',
        text: 'Can I bundle a .COM domain with Pro cPanel hosting for 1 year? Will SSL be configured automatically?',
        timestamp: '11:15 AM',
        status: 'delivered'
      }
    ]
  },
  {
    id: 'conv_wa_3',
    contactName: 'Rashid Al-Mamun',
    phone: '+880 1622-114477',
    email: 'rashid@greenbazaar.org',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    leadStage: 'qualified',
    tags: ['Custom VPS', 'WooCommerce'],
    assignedAgent: null,
    statusLabel: 'follow_up',
    unreadCount: 1,
    lastMessageSnippet: 'Need quote for customized 6 vCPU, 16GB RAM VPS with daily backup.',
    lastMessageTime: '09:05 AM',
    whmcsAccountId: 'CUST-10994',
    activeServices: {
      domains: ['greenbazaar.org'],
      packages: [],
      unpaidInvoices: 0
    },
    notes: ['Requires custom package pricing calculation.'],
    messages: [
      {
        id: 'msg_301',
        sender: 'customer',
        senderName: 'Rashid Al-Mamun',
        text: 'Need quote for customized 6 vCPU, 16GB RAM VPS with daily backup. We run high peak traffic on WooCommerce.',
        timestamp: '09:05 AM',
        status: 'delivered'
      }
    ]
  },
  {
    id: 'conv_wa_4',
    contactName: 'Priya Sharma',
    phone: '+91 852 731 9900',
    email: 'priya@cloudcraft.io',
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    leadStage: 'customer',
    tags: ['Chrome Extension Sync', 'VIP Agency'],
    assignedAgent: { id: 'agent_3', name: 'Imran H. (Technical Support)' },
    statusLabel: 'starred',
    unreadCount: 0,
    lastMessageSnippet: 'Whitelisted the new registrar IP on the server firewall. Everything is running green.',
    lastMessageTime: 'Yesterday',
    whmcsAccountId: 'CUST-10214',
    activeServices: {
      domains: ['cloudcraft.io', 'cloudagency.in'],
      packages: ['Enterprise Cloud VPS 8 Core', 'cPanel Premier 100 Accounts'],
      unpaidInvoices: 0
    },
    notes: ['Contact synced directly via WAPlus Chrome Extension on WhatsApp Web.'],
    messages: [
      {
        id: 'msg_401',
        sender: 'customer',
        senderName: 'Priya Sharma',
        text: 'Hello Imran, we needed our nameserver IP re-delegation updated for our secondary WHM.',
        timestamp: 'Yesterday 3:30 PM',
        status: 'read'
      },
      {
        id: 'msg_402',
        sender: 'agent',
        senderName: 'Imran H.',
        agentId: 'agent_3',
        text: 'Whitelisted the new registrar IP on the server firewall. Everything is running green.',
        timestamp: 'Yesterday 3:45 PM',
        status: 'read'
      }
    ]
  }
];

const availableAgents = [
  { id: 'agent_1', name: 'Alex M.', role: 'Support Admin', status: 'online', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80' },
  { id: 'agent_2', name: 'Sarah K.', role: 'Sales Lead', status: 'online', avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&auto=format&fit=crop&q=80' },
  { id: 'agent_3', name: 'Imran H.', role: 'Technical Support', status: 'online', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80' },
  { id: 'agent_4', name: 'Kamal R.', role: 'Billing Specialist', status: 'busy', avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=100&auto=format&fit=crop&q=80' }
];

// --- META CAMPAIGNS ENDPOINTS ---
campaignRouter.get('/campaigns/meta', async (req: any, res: Response) => {
  try {
    res.json({
      success: true,
      campaigns: metaCampaigns,
      summary: {
        totalSpend: metaCampaigns.reduce((acc, c) => acc + c.metrics.spend, 0),
        totalImpressions: metaCampaigns.reduce((acc, c) => acc + c.metrics.impressions, 0),
        totalClicks: metaCampaigns.reduce((acc, c) => acc + c.metrics.clicks, 0),
        totalLeads: metaCampaigns.reduce((acc, c) => acc + c.metrics.leads, 0),
        avgCpl: 1.39,
        avgRoas: 4.8
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

campaignRouter.post('/campaigns/meta', async (req: any, res: Response) => {
  try {
    const payload = req.body;
    const newId = payload.id || `camp_meta_${Date.now()}`;
    const newCampaign: MetaCampaign = {
      id: newId,
      name: payload.name || 'New Meta Campaign',
      objective: payload.objective || 'whatsapp_leads',
      platforms: payload.platforms || ['facebook', 'instagram'],
      status: payload.status || 'active',
      budget: payload.budget || { amount: 20, currency: 'USD', type: 'daily' },
      metrics: payload.metrics || {
        spend: 0,
        impressions: 0,
        clicks: 0,
        leads: 0,
        cpl: 0,
        ctr: 0,
        roas: 0
      },
      creative: payload.creative || {
        headline: 'Exclusive Hosting & Domain Offers',
        primaryText: 'Connect with our team directly on WhatsApp!',
        description: 'Instant Support & Live Setup',
        callToAction: 'Send WhatsApp Message',
        whatsappMessage: 'Hello Click2IT! I would like to get more information about your hosting deals.',
        mediaUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&auto=format&fit=crop&q=80',
        displayLink: 'click2itbd.com'
      },
      targeting: payload.targeting || {
        countries: ['Bangladesh', 'Global'],
        ageRange: '18-65',
        interests: ['Web Hosting', 'Domains', 'WordPress']
      },
      createdAt: payload.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const existingIndex = metaCampaigns.findIndex(c => c.id === newId);
    if (existingIndex >= 0) {
      metaCampaigns[existingIndex] = { ...metaCampaigns[existingIndex], ...newCampaign };
    } else {
      metaCampaigns.unshift(newCampaign);
    }

    res.json({ success: true, campaign: newCampaign });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

campaignRouter.delete('/campaigns/meta/:id', async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    metaCampaigns = metaCampaigns.filter(c => c.id !== id);
    res.json({ success: true, message: 'Campaign removed' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- WHATSAPP CRM MULTI-AGENT ENDPOINTS ---
campaignRouter.get('/whatsapp/conversations', async (req: any, res: Response) => {
  try {
    res.json({
      success: true,
      conversations: whatsAppConversations,
      agents: availableAgents
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

campaignRouter.post('/whatsapp/messages', async (req: any, res: Response) => {
  try {
    const { conversationId, text, agentId, agentName, isInternalNote, isCustomerSimulation } = req.body;
    
    let conv = whatsAppConversations.find(c => c.id === conversationId);
    if (!conv) {
      // Create new conversation on the fly
      conv = {
        id: conversationId || `conv_wa_${Date.now()}`,
        contactName: req.body.contactName || 'New WhatsApp Lead',
        phone: req.body.phone || '+880 1700-000000',
        email: req.body.email || '',
        leadStage: 'lead',
        tags: ['New Lead', 'Inbound WhatsApp'],
        assignedAgent: null,
        statusLabel: 'unread',
        unreadCount: 1,
        lastMessageSnippet: text,
        lastMessageTime: 'Just now',
        notes: [],
        messages: []
      };
      whatsAppConversations.unshift(conv);
    }

    const newMessage: WhatsAppMessage = {
      id: `msg_${Date.now()}`,
      sender: isCustomerSimulation ? 'customer' : (isInternalNote ? 'agent' : 'agent'),
      senderName: isCustomerSimulation ? conv.contactName : (agentName || 'Support Agent'),
      agentId: agentId || 'agent_1',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'delivered',
      isInternalNote: !!isInternalNote
    };

    conv.messages.push(newMessage);
    if (!isInternalNote) {
      conv.lastMessageSnippet = text;
      conv.lastMessageTime = 'Just now';
      if (isCustomerSimulation) {
        conv.unreadCount += 1;
      }
    }

    res.json({ success: true, message: newMessage, conversation: conv });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Reassign conversation to another staff/agent
campaignRouter.post('/whatsapp/assign', async (req: any, res: Response) => {
  try {
    const { conversationId, agentId } = req.body;
    const conv = whatsAppConversations.find(c => c.id === conversationId);
    if (!conv) {
      return res.status(404).json({ success: false, error: 'Conversation not found' });
    }

    if (!agentId || agentId === 'unassigned') {
      conv.assignedAgent = null;
    } else {
      const agent = availableAgents.find(a => a.id === agentId);
      if (agent) {
        conv.assignedAgent = { id: agent.id, name: `${agent.name} (${agent.role})`, avatar: agent.avatar };
      }
    }

    res.json({ success: true, conversation: conv });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Sync contacts from WhatsApp Web Chrome extension
campaignRouter.post('/whatsapp/sync', async (req: any, res: Response) => {
  try {
    const { contact } = req.body;
    if (!contact || !contact.phone) {
      return res.status(400).json({ success: false, error: 'Invalid contact payload' });
    }

    let existing = whatsAppConversations.find(c => c.phone.replace(/\D/g, '') === contact.phone.replace(/\D/g, ''));
    if (existing) {
      existing.contactName = contact.name || existing.contactName;
      if (contact.email) existing.email = contact.email;
      if (contact.notes && !existing.notes.includes(contact.notes)) {
        existing.notes.push(contact.notes);
      }
    } else {
      existing = {
        id: `conv_wa_${Date.now()}`,
        contactName: contact.name || 'WhatsApp Contact',
        phone: contact.phone,
        email: contact.email || '',
        leadStage: 'lead',
        tags: ['Chrome Extension Sync', 'Lead'],
        assignedAgent: null,
        statusLabel: 'all',
        unreadCount: 0,
        lastMessageSnippet: 'Synced from WhatsApp Web via Chrome Extension',
        lastMessageTime: 'Just now',
        notes: contact.notes ? [contact.notes] : ['Imported via WAPlus Chrome extension on WhatsApp Web.'],
        messages: [
          {
            id: `msg_sync_${Date.now()}`,
            sender: 'bot',
            senderName: 'Chrome Extension',
            text: 'Contact profile synced from WhatsApp Web.',
            timestamp: 'Just now',
            status: 'read'
          }
        ]
      };
      whatsAppConversations.unshift(existing);
    }

    res.json({ success: true, conversation: existing });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update conversation metadata (tags, lead stage, contact information)
campaignRouter.put('/whatsapp/conversations/:id', async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const conv = whatsAppConversations.find(c => c.id === id);
    if (!conv) {
      return res.status(404).json({ success: false, error: 'Conversation not found' });
    }

    const { contactName, email, leadStage, tags, notes, statusLabel } = req.body;
    if (contactName !== undefined) conv.contactName = contactName;
    if (email !== undefined) conv.email = email;
    if (leadStage !== undefined) conv.leadStage = leadStage;
    if (tags !== undefined) conv.tags = tags;
    if (notes !== undefined) conv.notes = notes;
    if (statusLabel !== undefined) conv.statusLabel = statusLabel;

    res.json({ success: true, conversation: conv });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- ORIGINAL SMS & WHATSAPP BROADCAST ENDPOINTS ---
campaignRouter.post('/send-sms-campaign', requireFirebaseAuth, async (req: any, res: Response) => {
  const { leads, message } = req.body;
  const smsApiKey = process.env.SMS_API_KEY;

  if (!smsApiKey) {
    return res.status(500).json({ success: false, error: 'SMS API is not configured in environment.' });
  }

  try {
    let successCount = 0;
    let failCount = 0;

    for (const lead of leads) {
      if (!lead.phone) continue;
      try {
        const response = await fetch('https://api.sms-gateway.example/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            api_key: smsApiKey,
            number: lead.phone,
            message: message
          })
        });
        const data: any = await response.json();
        if (data?.success) successCount++;
        else failCount++;
      } catch (err) {
        failCount++;
      }
    }

    res.status(200).json({ success: true, sentCount: successCount, failCount });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to send SMS campaign' });
  }
});

campaignRouter.post('/send-whatsapp-campaign', requireFirebaseAuth, async (req: any, res: Response) => {
  const { leads, message } = req.body;
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;

  if (!token || !phoneId) {
    return res.status(500).json({ success: false, error: 'WhatsApp API (Token/Phone ID) not configured.' });
  }

  try {
    let successCount = 0;
    let failCount = 0;

    for (const lead of leads) {
      if (!lead.phone) continue;
      
      let waNumber = lead.phone.replace(/\D/g, '');
      if (waNumber.startsWith('01')) waNumber = '88' + waNumber;

      try {
        const response = await fetch(`https://graph.facebook.com/v17.0/${phoneId}/messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: waNumber,
            type: 'text',
            text: { body: message }
          })
        });
        const data: any = await response.json();
        if (data?.messages) successCount++;
        else failCount++;
      } catch (err: any) {
        console.error(`WhatsApp send failed to ${waNumber}:`, err.message);
        failCount++;
      }
    }

    res.status(200).json({ success: true, sentCount: successCount, failCount });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to send WhatsApp campaign' });
  }
});

export default campaignRouter;