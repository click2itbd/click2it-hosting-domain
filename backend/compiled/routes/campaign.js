import { Router } from 'express';
import { requireFirebaseAuth } from '../middleware/firebaseAuth.js';
import { getAdminDb } from '../firebase/admin.js';
const campaignRouter = Router();
let metaCampaigns = [
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
            displayLink: 'click2it.bd/vps'
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
            displayLink: 'click2it.bd/domain'
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
            displayLink: 'click2it.bd/hosting'
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
let whatsAppConversations = [
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
                text: 'Here is your direct activation link and WHMCS invoice: https://click2it.bd/client-area?invoice=INV-8491. Your server is being deployed.',
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
campaignRouter.get('/campaigns/meta', async (req, res) => {
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
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
campaignRouter.post('/campaigns/meta', async (req, res) => {
    try {
        const payload = req.body;
        const newId = payload.id || `camp_meta_${Date.now()}`;
        const newCampaign = {
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
                displayLink: 'click2it.bd'
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
        }
        else {
            metaCampaigns.unshift(newCampaign);
        }
        res.json({ success: true, campaign: newCampaign });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
campaignRouter.delete('/campaigns/meta/:id', async (req, res) => {
    try {
        const { id } = req.params;
        metaCampaigns = metaCampaigns.filter(c => c.id !== id);
        res.json({ success: true, message: 'Campaign removed' });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
// --- WHATSAPP CRM MULTI-AGENT ENDPOINTS ---
campaignRouter.get('/whatsapp/conversations', async (req, res) => {
    try {
        res.json({
            success: true,
            conversations: whatsAppConversations,
            agents: staffHostsList
        });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
campaignRouter.post('/whatsapp/messages', async (req, res) => {
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
        const newMessage = {
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
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
// Reassign conversation to another staff/agent
campaignRouter.post('/whatsapp/assign', async (req, res) => {
    try {
        const { conversationId, agentId } = req.body;
        const conv = whatsAppConversations.find(c => c.id === conversationId);
        if (!conv) {
            return res.status(404).json({ success: false, error: 'Conversation not found' });
        }
        if (!agentId || agentId === 'unassigned') {
            conv.assignedAgent = null;
        }
        else {
            const agent = staffHostsList.find(a => a.id === agentId) || availableAgents.find(a => a.id === agentId);
            if (agent) {
                conv.assignedAgent = { id: agent.id, name: `${agent.name} (${agent.role})`, avatar: agent.avatar };
            }
        }
        res.json({ success: true, conversation: conv });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
// Instant WhatsApp Chat with an input number (Sales & Customer Management)
// Automatically includes and records chat in the CRM chat history
campaignRouter.post('/whatsapp/instant-chat', async (req, res) => {
    try {
        const { phone, contactName, initialMessage, agentId, agentName, tags, leadStage, whmcsAccountId } = req.body;
        if (!phone) {
            return res.status(400).json({ success: false, error: 'Phone number is required for instant chat' });
        }
        const cleanDigits = String(phone).replace(/\D/g, '');
        if (cleanDigits.length < 6) {
            return res.status(400).json({ success: false, error: 'Please enter a valid phone number with country/area code' });
        }
        // Standardize phone display
        let formattedPhone = phone.trim();
        if (!formattedPhone.startsWith('+')) {
            if (formattedPhone.startsWith('01') && cleanDigits.length === 11) {
                // Bangladesh local number: 017XXXXXXXX -> +880 17XXXXXXXX
                formattedPhone = `+880 ${formattedPhone.slice(0, 4)}-${formattedPhone.slice(4)}`;
            }
            else if (cleanDigits.startsWith('880') && cleanDigits.length === 13) {
                formattedPhone = `+880 ${cleanDigits.slice(3, 7)}-${cleanDigits.slice(7)}`;
            }
            else {
                formattedPhone = `+${cleanDigits}`;
            }
        }
        // Check if this conversation already exists in chat history
        let existing = whatsAppConversations.find(c => {
            const existingDigits = c.phone.replace(/\D/g, '');
            return existingDigits === cleanDigits || existingDigits.endsWith(cleanDigits) || cleanDigits.endsWith(existingDigits);
        });
        const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const assignedAgentObj = agentId ? {
            id: agentId,
            name: agentName || 'Sales & Support Agent'
        } : {
            id: 'staff_1',
            name: agentName || 'Alex M. (Support Admin)'
        };
        if (existing) {
            // Update existing conversation
            if (contactName && existing.contactName.startsWith('WhatsApp Lead') && !contactName.startsWith('WhatsApp Lead')) {
                existing.contactName = contactName;
            }
            if (whmcsAccountId) {
                existing.whmcsAccountId = whmcsAccountId;
            }
            if (initialMessage && initialMessage.trim()) {
                const msgText = initialMessage.trim();
                const newMsg = {
                    id: `msg_${Date.now()}`,
                    sender: 'agent',
                    senderName: assignedAgentObj.name,
                    agentId: assignedAgentObj.id,
                    text: msgText,
                    timestamp: nowTime,
                    status: 'delivered'
                };
                existing.messages.push(newMsg);
                existing.lastMessageSnippet = msgText;
                existing.lastMessageTime = 'Just now';
            }
            if (!existing.notes.some(n => n.includes('Instant chat session'))) {
                existing.notes.push(`Instant chat accessed by ${assignedAgentObj.name} on ${new Date().toLocaleString()}`);
            }
            return res.json({
                success: true,
                isExisting: true,
                conversation: existing,
                message: `Existing chat with ${existing.contactName} (${existing.phone}) located and updated in history.`
            });
        }
        // Create brand-new conversation and include in chat history
        const newConvId = `conv_wa_${Date.now()}`;
        const initialText = initialMessage && initialMessage.trim() ? initialMessage.trim() : 'Instant chat session initiated';
        const messagesList = [
            {
                id: `msg_sys_${Date.now()}`,
                sender: 'bot',
                senderName: 'WA CRM System',
                text: `Instant WhatsApp chat session opened with ${formattedPhone} by ${assignedAgentObj.name}.`,
                timestamp: nowTime,
                status: 'read'
            }
        ];
        if (initialMessage && initialMessage.trim()) {
            messagesList.push({
                id: `msg_${Date.now() + 1}`,
                sender: 'agent',
                senderName: assignedAgentObj.name,
                agentId: assignedAgentObj.id,
                text: initialMessage.trim(),
                timestamp: nowTime,
                status: 'delivered'
            });
        }
        const newConversation = {
            id: newConvId,
            contactName: (contactName && contactName.trim()) ? contactName.trim() : `WhatsApp Lead (${formattedPhone})`,
            phone: formattedPhone,
            email: '',
            avatarUrl: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80`,
            leadStage: leadStage || 'lead',
            tags: Array.isArray(tags) && tags.length > 0 ? tags : ['Instant Chat', 'Sales Lead', 'Direct Inbound'],
            assignedAgent: assignedAgentObj,
            statusLabel: 'all',
            unreadCount: 0,
            lastMessageSnippet: initialText,
            lastMessageTime: 'Just now',
            whmcsAccountId: whmcsAccountId || undefined,
            activeServices: {
                domains: [],
                packages: ['Cloud NVMe Inquirer'],
                unpaidInvoices: 0
            },
            notes: [
                `Instant WhatsApp chat opened with ${formattedPhone} on ${new Date().toLocaleString()} by ${assignedAgentObj.name}.`
            ],
            messages: messagesList
        };
        whatsAppConversations.unshift(newConversation);
        res.json({
            success: true,
            isExisting: false,
            conversation: newConversation,
            message: `New instant chat with ${newConversation.contactName} (${newConversation.phone}) added to chat history.`
        });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
// Sync contacts from WhatsApp Web Chrome extension
campaignRouter.post('/whatsapp/sync', async (req, res) => {
    try {
        const { contact } = req.body;
        if (!contact || !contact.phone) {
            return res.status(400).json({ success: false, error: 'Invalid contact payload' });
        }
        let existing = whatsAppConversations.find(c => c.phone.replace(/\D/g, '') === contact.phone.replace(/\D/g, ''));
        if (existing) {
            existing.contactName = contact.name || existing.contactName;
            if (contact.email)
                existing.email = contact.email;
            if (contact.notes && !existing.notes.includes(contact.notes)) {
                existing.notes.push(contact.notes);
            }
        }
        else {
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
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
// Update conversation metadata (tags, lead stage, contact information)
campaignRouter.put('/whatsapp/conversations/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const conv = whatsAppConversations.find(c => c.id === id);
        if (!conv) {
            return res.status(404).json({ success: false, error: 'Conversation not found' });
        }
        const { contactName, email, leadStage, tags, notes, statusLabel } = req.body;
        if (contactName !== undefined)
            conv.contactName = contactName;
        if (email !== undefined)
            conv.email = email;
        if (leadStage !== undefined)
            conv.leadStage = leadStage;
        if (tags !== undefined)
            conv.tags = tags;
        if (notes !== undefined)
            conv.notes = notes;
        if (statusLabel !== undefined)
            conv.statusLabel = statusLabel;
        res.json({ success: true, conversation: conv });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
// --- ORIGINAL SMS & WHATSAPP BROADCAST ENDPOINTS ---
campaignRouter.post('/send-sms-campaign', requireFirebaseAuth, async (req, res) => {
    const { leads, message } = req.body;
    const smsApiKey = process.env.SMS_API_KEY;
    if (!smsApiKey) {
        return res.status(500).json({ success: false, error: 'SMS API is not configured in environment.' });
    }
    try {
        let successCount = 0;
        let failCount = 0;
        for (const lead of leads) {
            if (!lead.phone)
                continue;
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
                const data = await response.json();
                if (data?.success)
                    successCount++;
                else
                    failCount++;
            }
            catch (err) {
                failCount++;
            }
        }
        res.status(200).json({ success: true, sentCount: successCount, failCount });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to send SMS campaign' });
    }
});
campaignRouter.post('/send-whatsapp-campaign', requireFirebaseAuth, async (req, res) => {
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
            if (!lead.phone)
                continue;
            let waNumber = lead.phone.replace(/\D/g, '');
            if (waNumber.startsWith('01'))
                waNumber = '88' + waNumber;
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
                const data = await response.json();
                if (data?.messages)
                    successCount++;
                else
                    failCount++;
            }
            catch (err) {
                console.error(`WhatsApp send failed to ${waNumber}:`, err.message);
                failCount++;
            }
        }
        res.status(200).json({ success: true, sentCount: successCount, failCount });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to send WhatsApp campaign' });
    }
});
let staffHostsList = [
    {
        id: 'staff_1',
        name: 'Alex M.',
        email: 'alex@click2it.bd',
        phone: '+880 1711-000111',
        role: 'Support Admin',
        status: 'active',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
        assignedHosts: ['Server Host BDIX #1 (Dhaka)', 'cPanel USA NVMe #2 (Dallas)', 'KVM VPS Node #1'],
        assignedChannels: ['chan_main', 'chan_vip'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    },
    {
        id: 'staff_2',
        name: 'Sarah K.',
        email: 'sarah@click2it.bd',
        phone: '+880 1711-000222',
        role: 'Sales & Operations Lead',
        status: 'active',
        avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&auto=format&fit=crop&q=80',
        assignedHosts: ['cPanel USA NVMe #2 (Dallas)', 'Enterprise WordPress Cloud'],
        assignedChannels: ['chan_main', 'chan_vip'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    },
    {
        id: 'staff_3',
        name: 'Imran H.',
        email: 'imran@click2it.bd',
        phone: '+880 1711-000333',
        role: 'Technical Support Specialist',
        status: 'active',
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80',
        assignedHosts: ['Server Host BDIX #1 (Dhaka)', 'KVM VPS Node #1 (Germany)'],
        assignedChannels: ['chan_main'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    },
    {
        id: 'staff_4',
        name: 'Kamal R.',
        email: 'kamal@click2it.bd',
        phone: '+880 1711-000444',
        role: 'Billing & Accounting Specialist',
        status: 'active',
        avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=100&auto=format&fit=crop&q=80',
        assignedHosts: ['WHMCS Billing Node #1'],
        assignedChannels: ['chan_vip'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    }
];
campaignRouter.get('/staff-hosts', async (req, res) => {
    try {
        try {
            const db = getAdminDb();
            if (db && typeof db.collection === 'function') {
                const snap = await db.collection('staff_hosts').get();
                if (!snap.empty) {
                    const loaded = [];
                    snap.docs.forEach((d) => {
                        loaded.push({ id: d.id, ...d.data() });
                    });
                    if (loaded.length > 0) {
                        staffHostsList = loaded;
                    }
                }
            }
        }
        catch (fsErr) {
            // Fallback
        }
        res.json({
            success: true,
            staffHosts: staffHostsList,
            hostsSummary: [
                { id: 'host_bdix_1', name: 'Server Host BDIX #1 (Dhaka)', provider: 'cPanel BDIX DataCenter', status: 'healthy', assignedStaffCount: 2 },
                { id: 'host_usa_2', name: 'cPanel USA NVMe #2 (Dallas)', provider: 'CloudLinux NVMe Node', status: 'healthy', assignedStaffCount: 2 },
                { id: 'host_kvm_1', name: 'KVM VPS Node #1 (Germany)', provider: 'Proxmox VE Cluster', status: 'healthy', assignedStaffCount: 2 },
                { id: 'host_whmcs_1', name: 'WHMCS Billing Node #1', provider: 'InHostBilling Hub', status: 'healthy', assignedStaffCount: 1 }
            ]
        });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
campaignRouter.post('/staff-hosts', async (req, res) => {
    try {
        const { name, email, phone, role, status, assignedHosts, assignedChannels, avatar } = req.body;
        if (!name || !email) {
            return res.status(400).json({ success: false, error: 'Name and email are required' });
        }
        const id = `staff_${Date.now()}`;
        const newMember = {
            id,
            name,
            email,
            phone: phone || '',
            role: role || 'Technical Support Specialist',
            status: status || 'active',
            avatar: avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
            assignedHosts: Array.isArray(assignedHosts) ? assignedHosts : [],
            assignedChannels: Array.isArray(assignedChannels) ? assignedChannels : ['chan_main'],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        staffHostsList.push(newMember);
        // Sync into Firestore 'staff_hosts' and 'users' collection
        try {
            const db = getAdminDb();
            if (db && typeof db.collection === 'function') {
                await db.collection('staff_hosts').doc(id).set(newMember);
                await db.collection('users').doc(id).set({
                    uid: id,
                    displayName: name,
                    name,
                    email,
                    phone: phone || '',
                    role: role?.toLowerCase().includes('admin') ? 'admin' : (role?.toLowerCase().includes('lead') ? 'manager' : 'staff'),
                    status: status || 'active',
                    createdAt: new Date().toISOString()
                }, { merge: true });
            }
        }
        catch (fsErr) {
            console.warn('[StaffHosts] Firestore sync error:', fsErr);
        }
        res.json({ success: true, member: newMember, staffHosts: staffHostsList });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
campaignRouter.put('/staff-hosts/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const member = staffHostsList.find(s => s.id === id);
        if (!member) {
            return res.status(404).json({ success: false, error: 'Staff member not found' });
        }
        const { name, email, phone, role, status, assignedHosts, assignedChannels, avatar } = req.body;
        if (name !== undefined)
            member.name = name;
        if (email !== undefined)
            member.email = email;
        if (phone !== undefined)
            member.phone = phone;
        if (role !== undefined)
            member.role = role;
        if (status !== undefined)
            member.status = status;
        if (avatar !== undefined)
            member.avatar = avatar;
        if (assignedHosts !== undefined)
            member.assignedHosts = Array.isArray(assignedHosts) ? assignedHosts : [];
        if (assignedChannels !== undefined)
            member.assignedChannels = Array.isArray(assignedChannels) ? assignedChannels : [];
        member.updatedAt = new Date().toISOString();
        // Sync into Firestore
        try {
            const db = getAdminDb();
            if (db && typeof db.collection === 'function') {
                await db.collection('staff_hosts').doc(id).set(member, { merge: true });
                await db.collection('users').doc(id).set({
                    displayName: member.name,
                    name: member.name,
                    email: member.email,
                    phone: member.phone,
                    role: member.role?.toLowerCase().includes('admin') ? 'admin' : (member.role?.toLowerCase().includes('lead') ? 'manager' : 'staff'),
                    status: member.status
                }, { merge: true });
            }
        }
        catch (fsErr) {
            console.warn('[StaffHosts] Firestore sync error on update:', fsErr);
        }
        res.json({ success: true, member, staffHosts: staffHostsList });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
let hostingCrmLeads = [
    {
        id: 'lead_1',
        contactName: 'Tanvir Ahmed',
        companyName: 'Prime Tech Solutions Ltd',
        email: 'tanvir@primetechbd.com',
        phone: '+880 1712-345678',
        leadStage: 'active_customer',
        interestedProducts: ['Cloud NVMe VPS - 4 vCPU / 8GB RAM', 'primetechbd.com (.COM)'],
        dealValueBdt: 18500,
        assignedStaffId: 'staff_1',
        assignedStaffName: 'Alex M. (Support Admin)',
        whmcsAccountId: 'CUST-10492',
        notes: ['Converted from Meta Ad campaign.', 'Wants automatic weekly VPS snapshots.'],
        lastContactTime: '10:42 AM Today',
        source: 'Meta Ads',
        createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
        updatedAt: new Date().toISOString()
    },
    {
        id: 'lead_2',
        contactName: 'Nusrat Jahan',
        companyName: 'Dhaka Designs Studio',
        email: 'nusrat@dhakadesigns.net',
        phone: '+880 1891-987654',
        leadStage: 'invoice_pending',
        interestedProducts: ['Pro cPanel Web Hosting (Annual)', 'dhakadesigns.net (.NET)'],
        dealValueBdt: 6200,
        assignedStaffId: 'staff_2',
        assignedStaffName: 'Sarah K. (Sales Lead)',
        whmcsAccountId: 'CUST-10811',
        notes: ['Invoice INV-8491 generated on bKash merchant link.'],
        lastContactTime: '11:15 AM Today',
        source: 'WhatsApp',
        createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        updatedAt: new Date().toISOString()
    },
    {
        id: 'lead_3',
        contactName: 'Rashid Al-Mamun',
        companyName: 'Green Bazaar E-Commerce',
        email: 'rashid@greenbazaar.org',
        phone: '+880 1622-114477',
        leadStage: 'vps_quote_sent',
        interestedProducts: ['Custom Enterprise KVM Node - 6 vCPU / 16GB RAM', 'greenbazaar.org (.ORG)'],
        dealValueBdt: 34000,
        assignedStaffId: 'staff_3',
        assignedStaffName: 'Imran H. (Technical Support)',
        whmcsAccountId: 'CUST-10994',
        notes: ['Requested custom quote with BDIX high-speed bandwidth.'],
        lastContactTime: '09:05 AM Today',
        source: 'Web Form',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        updatedAt: new Date().toISOString()
    },
    {
        id: 'lead_4',
        contactName: 'Mahbubur Rahman',
        companyName: 'BENGAL ERP Systems',
        email: 'mahbub@bengalerp.com',
        phone: '+880 1715-998877',
        leadStage: 'domain_consultation',
        interestedProducts: ['.BD Official Domain (.COM.BD)', 'cPanel Business Starter'],
        dealValueBdt: 4500,
        assignedStaffId: 'staff_1',
        assignedStaffName: 'Alex M. (Support Admin)',
        notes: ['Consulting on BTCL NID verification documents for .com.bd domain.'],
        lastContactTime: 'Yesterday 4:20 PM',
        source: 'Direct Referral',
        createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
        updatedAt: new Date().toISOString()
    },
    {
        id: 'lead_5',
        contactName: 'Sultana Parveen',
        companyName: 'Chittagong Maritime Logistics',
        email: 'sultana@cml-bd.com',
        phone: '+880 1819-223344',
        leadStage: 'renewal_upsell',
        interestedProducts: ['Renewal: cPanel Premier Hosting + .COM', 'SSL Certificate Upgrade'],
        dealValueBdt: 12800,
        assignedStaffId: 'staff_4',
        assignedStaffName: 'Kamal R. (Billing Specialist)',
        whmcsAccountId: 'CUST-10112',
        notes: ['Annual hosting renewal due in 7 days.'],
        lastContactTime: 'Yesterday 2:10 PM',
        source: 'Phone',
        createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
        updatedAt: new Date().toISOString()
    }
];
campaignRouter.get('/crm/leads', async (req, res) => {
    try {
        try {
            const db = getAdminDb();
            if (db && typeof db.collection === 'function') {
                const snap = await db.collection('hosting_crm_leads').get();
                if (!snap.empty) {
                    const loaded = [];
                    snap.docs.forEach((d) => {
                        loaded.push({ id: d.id, ...d.data() });
                    });
                    if (loaded.length > 0) {
                        hostingCrmLeads = loaded;
                    }
                }
            }
        }
        catch (fsErr) {
            // Fallback
        }
        const totalPipelineValue = hostingCrmLeads.reduce((acc, l) => acc + (l.dealValueBdt || 0), 0);
        const convertedLeads = hostingCrmLeads.filter(l => l.leadStage === 'active_customer').length;
        const conversionRatePercent = hostingCrmLeads.length > 0 ? Math.round((convertedLeads / hostingCrmLeads.length) * 100) : 0;
        res.json({
            success: true,
            leads: hostingCrmLeads,
            summary: {
                totalLeadsCount: hostingCrmLeads.length,
                totalPipelineValue,
                conversionRatePercent,
                stageCounts: {
                    new_inbound: hostingCrmLeads.filter(l => l.leadStage === 'new_inbound').length,
                    domain_consultation: hostingCrmLeads.filter(l => l.leadStage === 'domain_consultation').length,
                    vps_quote_sent: hostingCrmLeads.filter(l => l.leadStage === 'vps_quote_sent').length,
                    invoice_pending: hostingCrmLeads.filter(l => l.leadStage === 'invoice_pending').length,
                    active_customer: hostingCrmLeads.filter(l => l.leadStage === 'active_customer').length,
                    renewal_upsell: hostingCrmLeads.filter(l => l.leadStage === 'renewal_upsell').length
                }
            }
        });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
let lastAssignedStaffIndex = 0;
async function getNextRoundRobinStaff() {
    const fallbackStaff = [
        { id: 'staff_1', name: 'Alex M. (Support Admin)', email: 'alex@click2it.bd' },
        { id: 'staff_2', name: 'Sarah K. (Sales Lead)', email: 'sarah@click2it.bd' },
        { id: 'staff_3', name: 'Imran H. (Technical Support)', email: 'imran@click2it.bd' },
        { id: 'staff_4', name: 'Kamal R. (Billing Specialist)', email: 'kamal@click2it.bd' }
    ];
    try {
        const db = getAdminDb();
        if (db && typeof db.collection === 'function') {
            const snap = await db.collection('users').get();
            if (!snap.empty) {
                const activeStaffList = [];
                snap.docs.forEach((d) => {
                    const data = d.data();
                    if (data.role === 'admin' || data.role === 'staff' || data.role === 'manager') {
                        activeStaffList.push({
                            id: d.id,
                            name: `${data.displayName || data.name || data.email?.split('@')[0] || 'Support Agent'} (${data.role === 'admin' ? 'Support Admin' : 'Sales Lead'})`,
                            email: data.email || ''
                        });
                    }
                });
                if (activeStaffList.length > 0) {
                    lastAssignedStaffIndex = (lastAssignedStaffIndex + 1) % activeStaffList.length;
                    return activeStaffList[lastAssignedStaffIndex];
                }
            }
        }
    }
    catch (err) {
        console.warn('[RoundRobin] Error querying staff, using fallback:', err);
    }
    lastAssignedStaffIndex = (lastAssignedStaffIndex + 1) % fallbackStaff.length;
    return fallbackStaff[lastAssignedStaffIndex];
}
campaignRouter.post('/crm/leads', async (req, res) => {
    try {
        const { contactName, companyName, email, phone, targetDomain, leadStage, interestedProducts, dealValueBdt, assignedStaffId, assignedStaffName, notes, timeline, source, useRoundRobin } = req.body;
        if (!contactName || !email) {
            return res.status(400).json({ success: false, error: 'Contact name and email are required' });
        }
        let finalStaffId = assignedStaffId;
        let finalStaffName = assignedStaffName;
        if (!finalStaffId || useRoundRobin) {
            const roundRobinStaff = await getNextRoundRobinStaff();
            finalStaffId = roundRobinStaff.id;
            finalStaffName = roundRobinStaff.name;
        }
        const newLead = {
            id: `lead_${Date.now()}`,
            contactName,
            companyName: companyName || '',
            email,
            phone: phone || '',
            targetDomain: targetDomain || '',
            leadStage: leadStage || 'new_inbound',
            interestedProducts: Array.isArray(interestedProducts) ? interestedProducts : ['cPanel Hosting + Domain'],
            dealValueBdt: Number(dealValueBdt) || 5000,
            assignedStaffId: finalStaffId,
            assignedStaffName: finalStaffName,
            notes: Array.isArray(notes) ? notes : ['New lead added from Domain & Hosting CRM.'],
            timeline: Array.isArray(timeline) ? timeline : [{
                    id: `tl_${Date.now()}`,
                    type: 'status_change',
                    title: 'Lead Created (Round-Robin Assigned)',
                    description: `Lead created and automatically assigned to ${finalStaffName} via Round-Robin queue.`,
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' Today',
                    performedBy: 'Automated Round-Robin Engine'
                }],
            lastContactTime: 'Just now',
            source: source || 'Web Form',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        hostingCrmLeads.unshift(newLead);
        try {
            const db = getAdminDb();
            if (db && typeof db.collection === 'function') {
                await db.collection('hosting_crm_leads').doc(newLead.id).set(newLead);
            }
        }
        catch (fsErr) {
            console.warn('[HostingCRM] Firestore sync error:', fsErr);
        }
        res.json({ success: true, lead: newLead, leads: hostingCrmLeads });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
campaignRouter.put('/crm/leads/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const lead = hostingCrmLeads.find(l => l.id === id);
        if (!lead) {
            return res.status(404).json({ success: false, error: 'CRM Lead not found' });
        }
        const { contactName, companyName, email, phone, targetDomain, leadStage, interestedProducts, dealValueBdt, assignedStaffId, assignedStaffName, notes, timeline, source, whmcsAccountId } = req.body;
        if (contactName !== undefined)
            lead.contactName = contactName;
        if (companyName !== undefined)
            lead.companyName = companyName;
        if (email !== undefined)
            lead.email = email;
        if (phone !== undefined)
            lead.phone = phone;
        if (targetDomain !== undefined)
            lead.targetDomain = targetDomain;
        if (leadStage !== undefined)
            lead.leadStage = leadStage;
        if (interestedProducts !== undefined)
            lead.interestedProducts = Array.isArray(interestedProducts) ? interestedProducts : [];
        if (dealValueBdt !== undefined)
            lead.dealValueBdt = Number(dealValueBdt);
        if (assignedStaffId !== undefined)
            lead.assignedStaffId = assignedStaffId;
        if (assignedStaffName !== undefined)
            lead.assignedStaffName = assignedStaffName;
        if (notes !== undefined)
            lead.notes = Array.isArray(notes) ? notes : [notes];
        if (timeline !== undefined)
            lead.timeline = Array.isArray(timeline) ? timeline : lead.timeline || [];
        if (source !== undefined)
            lead.source = source;
        if (whmcsAccountId !== undefined)
            lead.whmcsAccountId = whmcsAccountId;
        lead.lastContactTime = 'Just now';
        lead.updatedAt = new Date().toISOString();
        try {
            const db = getAdminDb();
            if (db && typeof db.collection === 'function') {
                await db.collection('hosting_crm_leads').doc(id).set(lead, { merge: true });
            }
        }
        catch (fsErr) {
            console.warn('[HostingCRM] Firestore update error:', fsErr);
        }
        res.json({ success: true, lead, leads: hostingCrmLeads });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
campaignRouter.delete('/crm/leads/:id', async (req, res) => {
    try {
        const { id } = req.params;
        hostingCrmLeads = hostingCrmLeads.filter(l => l.id !== id);
        try {
            const db = getAdminDb();
            if (db && typeof db.collection === 'function') {
                await db.collection('hosting_crm_leads').doc(id).delete();
            }
        }
        catch (fsErr) {
            console.warn('[HostingCRM] Firestore delete error:', fsErr);
        }
        res.json({ success: true, leads: hostingCrmLeads });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
export default campaignRouter;
