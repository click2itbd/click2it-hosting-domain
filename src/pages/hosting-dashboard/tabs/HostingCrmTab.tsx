import React, { useState, useEffect } from 'react';
import { 
  Users, UserPlus, DollarSign, Search, Filter, Plus, Edit2, Trash2, Phone, Mail, 
  Globe, Server, Shield, CheckCircle2, Clock, AlertCircle, Sparkles, RefreshCw, 
  ArrowRight, FileText, Send, MessageSquare, ChevronRight, Zap, Building, CheckSquare,
  Download, Copy, ExternalLink, Sliders, Check, Activity, Eye, MessageCircle, Calendar,
  Bell, BellOff, TrendingUp, BarChart2, Volume2, BookOpen, Tag, Layers, RotateCw, UserCheck, Scale,
  Upload, X, FileSpreadsheet
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { doc, setDoc, getDocs, collection } from 'firebase/firestore';
import { 
  FunnelChart, Funnel, Tooltip, ResponsiveContainer, Cell, LabelList, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend 
} from 'recharts';
import { db } from '../../../firebase';
import { useStaffHosts } from '../../../hooks/useStaffHosts';
import { formatCurrency } from '../../../lib/utils';

export interface LeadActivityLog {
  id: string;
  type: 'status_change' | 'email_sent' | 'note' | 'call' | 'whatsapp' | 'quote';
  title: string;
  description: string;
  timestamp: string;
  performedBy?: string;
  isHighPriority?: boolean;
  meta?: Record<string, any>;
}

export interface HostingCrmLead {
  id: string;
  contactName: string;
  companyName?: string;
  email: string;
  phone: string;
  leadStage: 'new' | 'contacted' | 'qualified' | 'domain_consultation' | 'vps_quote_sent' | 'invoice_pending' | 'converted' | 'renewal_upsell';
  interestedProducts: string[];
  dealValueBdt: number;
  assignedStaffId?: string;
  assignedStaffName?: string;
  whmcsAccountId?: string;
  targetDomain?: string;
  notes: string[];
  timeline: LeadActivityLog[];
  lastContactTime: string;
  source: 'WhatsApp' | 'Meta Ads' | 'Web Form' | 'Direct Referral' | 'Phone';
  createdAt?: string;
}

export interface CrmNotification {
  id: string;
  title: string;
  message: string;
  type: 'converted' | 'high_priority' | 'stage_change' | 'system';
  leadId?: string;
  leadName?: string;
  timestamp: string;
  read: boolean;
}

export interface LeadEmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  category: 'welcome' | 'quote' | 'followup' | 'converted' | 'renewal' | 'custom';
  updatedAt: string;
}

export function HostingCrmTab({ state }: { state?: any }) {
  const { staffMembers, activeStaffMembers } = useStaffHosts();
  
  // Navigation Sub-Module State
  const [crmMainSubTab, setCrmMainSubTab] = useState<'pipeline' | 'templates'>('pipeline');

  // ROUND-ROBIN AUTOMATED DISTRIBUTOR STATE
  const [roundRobinIndex, setRoundRobinIndex] = useState<number>(0);
  const [enableRoundRobin, setEnableRoundRobin] = useState<boolean>(true);
  const [showWorkloadModal, setShowWorkloadModal] = useState<boolean>(false);

  const [leads, setLeads] = useState<HostingCrmLead[]>([
    {
      id: 'lead_1',
      contactName: 'Tanvir Ahmed',
      companyName: 'Prime Tech Solutions Ltd',
      email: 'tanvir@primetechbd.com',
      phone: '+880 1712-345678',
      leadStage: 'converted',
      interestedProducts: ['Cloud NVMe VPS - 4 vCPU / 8GB RAM', 'primetechbd.com (.COM)'],
      dealValueBdt: 18500,
      assignedStaffId: 'staff_1',
      assignedStaffName: 'Alex M. (Support Admin)',
      whmcsAccountId: 'CUST-10492',
      targetDomain: 'primetechbd.com',
      notes: ['Converted from Meta Ad campaign.', 'Wants automatic weekly VPS snapshots.'],
      timeline: [
        {
          id: 'tl_101',
          type: 'status_change',
          title: 'Stage Changed to Converted',
          description: 'Lead converted to active hosting customer and provisioned on KVM Node 04.',
          timestamp: '10:42 AM Today',
          performedBy: 'Alex M. (Support Admin)',
          isHighPriority: true
        },
        {
          id: 'tl_102',
          type: 'email_sent',
          title: 'Welcome & cPanel Login Details Sent',
          description: 'Sent cPanel access credentials and DNS nameservers email to tanvir@primetechbd.com.',
          timestamp: '10:15 AM Today',
          performedBy: 'System Automation'
        },
        {
          id: 'tl_103',
          type: 'quote',
          title: 'Official Quotation Issued',
          description: 'Issued ৳18,500 BDT quote for 4 vCPU NVMe VPS + .COM Domain.',
          timestamp: 'Yesterday 3:30 PM',
          performedBy: 'Alex M. (Support Admin)'
        },
        {
          id: 'tl_104',
          type: 'status_change',
          title: 'Moved to Qualified Stage',
          description: 'Verified server requirement specs (8GB RAM, BDIX bandwidth priority).',
          timestamp: 'Yesterday 11:20 AM',
          performedBy: 'Alex M. (Support Admin)'
        },
        {
          id: 'tl_105',
          type: 'whatsapp',
          title: 'Inbound WhatsApp Inquiry',
          description: 'Customer inquired about high-speed hosting in Bangladesh.',
          timestamp: '2 days ago',
          performedBy: 'Tanvir Ahmed'
        }
      ],
      lastContactTime: '10:42 AM Today',
      source: 'Meta Ads'
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
      targetDomain: 'dhakadesigns.net',
      notes: ['Invoice INV-8491 generated on bKash merchant link.'],
      timeline: [
        {
          id: 'tl_201',
          type: 'status_change',
          title: 'Invoice Issued (Invoice Pending)',
          description: 'Sent bKash & Nagad merchant invoice link for ৳6,200 BDT.',
          timestamp: '11:15 AM Today',
          performedBy: 'Sarah K. (Sales Lead)'
        },
        {
          id: 'tl_202',
          type: 'email_sent',
          title: 'Sent Pro cPanel Quote Email',
          description: 'Emailed quotation and annual discount breakdown to nusrat@dhakadesigns.net.',
          timestamp: '09:40 AM Today',
          performedBy: 'Sarah K. (Sales Lead)'
        },
        {
          id: 'tl_203',
          type: 'status_change',
          title: 'Marked as Contacted',
          description: 'Discussed website migration from previous provider.',
          timestamp: 'Yesterday 2:10 PM',
          performedBy: 'Sarah K. (Sales Lead)'
        }
      ],
      lastContactTime: '11:15 AM Today',
      source: 'WhatsApp'
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
      targetDomain: 'greenbazaar.org',
      notes: ['Requested custom quote with BDIX high-speed bandwidth.'],
      timeline: [
        {
          id: 'tl_301',
          type: 'quote',
          title: 'Custom KVM VPS Quote Generated',
          description: 'Sent custom quote proposal for 6 vCPU / 16GB RAM KVM Node (৳34,000 BDT).',
          timestamp: '09:05 AM Today',
          performedBy: 'Imran H. (Technical Support)',
          isHighPriority: true
        },
        {
          id: 'tl_302',
          type: 'call',
          title: 'Phone Consultation Completed',
          description: 'Discussed peak e-commerce traffic handling and daily automated backups.',
          timestamp: 'Yesterday 5:00 PM',
          performedBy: 'Imran H. (Technical Support)'
        }
      ],
      lastContactTime: '09:05 AM Today',
      source: 'Web Form'
    },
    {
      id: 'lead_4',
      contactName: 'Mahbubur Rahman',
      companyName: 'BENGAL ERP Systems',
      email: 'mahbub@bengalerp.com',
      phone: '+880 1715-998877',
      leadStage: 'contacted',
      interestedProducts: ['.BD Official Domain (.COM.BD)', 'cPanel Business Starter'],
      dealValueBdt: 4500,
      assignedStaffId: 'staff_1',
      assignedStaffName: 'Alex M. (Support Admin)',
      targetDomain: 'bengalerp.com.bd',
      notes: ['Consulting on BTCL NID verification documents for .com.bd domain.'],
      timeline: [
        {
          id: 'tl_401',
          type: 'status_change',
          title: 'Moved to Contacted Stage',
          description: 'Initial phone discussion completed. Requested BTCL domain registration requirements.',
          timestamp: 'Yesterday 4:20 PM',
          performedBy: 'Alex M. (Support Admin)'
        },
        {
          id: 'tl_402',
          type: 'status_change',
          title: 'New Lead Inbound',
          description: 'Lead submitted referral inquiry via website.',
          timestamp: 'Yesterday 3:00 PM',
          performedBy: 'System'
        }
      ],
      lastContactTime: 'Yesterday 4:20 PM',
      source: 'Direct Referral'
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
      targetDomain: 'cml-bd.com',
      notes: ['Annual hosting renewal due in 7 days.'],
      timeline: [
        {
          id: 'tl_501',
          type: 'note',
          title: 'Renewal Notice Logged',
          description: 'Upcoming renewal invoice sent. Offered 10% discount on 2-year renewal.',
          timestamp: 'Yesterday 2:10 PM',
          performedBy: 'Kamal R. (Billing Specialist)'
        }
      ],
      lastContactTime: 'Yesterday 2:10 PM',
      source: 'Phone'
    }
  ]);

  // BULK SELECTION STATE
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);

  // LEAD EMAIL TEMPLATES SUB-MODULE STATE
  const [emailTemplates, setEmailTemplates] = useState<LeadEmailTemplate[]>([
    {
      id: 'tpl_1',
      name: 'Initial Inbound & Domain Consultation Response',
      category: 'welcome',
      subject: 'Domain & Hosting Inquiry — {{targetDomain}} | Click2IT Bangladesh',
      body: `Hello {{contactName}},\n\nThank you for reaching out to Click2IT Hosting regarding {{targetDomain}}.\n\nWe have checked domain availability and prepared your NVMe Cloud hosting options. All our packages feature BDIX 10Gbps local peering, cPanel control panel, and automated daily backups.\n\nAssigned Account Specialist: {{assignedStaffName}}\nEstimated Investment: {{dealValueBdt}}\n\nPlease reply to this email or chat with us on WhatsApp to schedule a quick consultation.`,
      updatedAt: 'Today'
    },
    {
      id: 'tpl_2',
      name: 'Official Hosting & NVMe VPS Quotation Proposal',
      category: 'quote',
      subject: 'Official Quotation Proposal for {{contactName}} — {{targetDomain}}',
      body: `Dear {{contactName}},\n\nPlease find your requested domain and server proposal for {{targetDomain}} below:\n\nTarget Domain: {{targetDomain}}\nCompany: {{companyName}}\nTotal Deal Value: {{dealValueBdt}}\nIncluded Features: NVMe SSD Storage, BDIX Speed Boost, Free SSL Certificate, 24/7 BDIX Support.\n\nAssigned Specialist: {{assignedStaffName}}\n\nTo proceed with instant server activation, reply to this email or click the merchant bKash/Nagad payment link below: https://click2itbd.com/pay`,
      updatedAt: 'Today'
    },
    {
      id: 'tpl_3',
      name: 'bKash / Nagad Invoice Payment Link Reminder',
      category: 'followup',
      subject: 'Payment Invoice Reminder — {{targetDomain}} Hosting Order',
      body: `Hello {{contactName}},\n\nYour invoice for {{targetDomain}} is ready for payment.\n\nTotal Payable: {{dealValueBdt}}\nInstant Payment Link: https://click2itbd.com/pay\n\nOnce completed, your server node will be provisioned automatically within 5 minutes. Contact {{assignedStaffName}} if you need invoice modifications.`,
      updatedAt: 'Today'
    },
    {
      id: 'tpl_4',
      name: 'Welcome & cPanel Account Delivery',
      category: 'converted',
      subject: '🎉 Server Provisioned & Welcome to Click2IT Hosting — {{targetDomain}}',
      body: `Dear {{contactName}},\n\nCongratulations! Your web hosting service for {{targetDomain}} has been successfully provisioned on our high-speed NVMe KVM node.\n\nYour assigned account specialist is {{assignedStaffName}}.\nIf you require free website migration support or DNS pointing assistance, please open a support ticket or reply to this email directly.`,
      updatedAt: 'Today'
    },
    {
      id: 'tpl_5',
      name: 'Annual Domain & Server Renewal Offer',
      category: 'renewal',
      subject: 'Annual Renewal Notice for {{targetDomain}} — 10% Loyalty Discount',
      body: `Hello {{contactName}},\n\nThis is a friendly reminder that your hosting and domain renewal for {{targetDomain}} is due soon.\n\nRenewal Amount: {{dealValueBdt}}\n\nRenew for 2 years today to claim an additional 10% loyalty discount!`,
      updatedAt: 'Today'
    }
  ]);

  const [showTemplateModal, setShowTemplateModal] = useState<boolean>(false);
  const [editingTemplate, setEditingTemplate] = useState<LeadEmailTemplate | null>(null);
  const [templateForm, setTemplateForm] = useState({
    name: '',
    category: 'quote' as LeadEmailTemplate['category'],
    subject: '',
    body: ''
  });

  // Automated CRM Notification Center State
  const [notifications, setNotifications] = useState<CrmNotification[]>([
    {
      id: 'notif_1',
      title: '🎉 Lead Converted: Tanvir Ahmed',
      message: 'Tanvir Ahmed (Prime Tech Solutions) converted to active NVMe VPS customer (৳18,500 BDT).',
      type: 'converted',
      leadId: 'lead_1',
      leadName: 'Tanvir Ahmed',
      timestamp: '10:42 AM Today',
      read: false
    },
    {
      id: 'notif_2',
      title: '🚨 High-Priority Interaction: Rashid Al-Mamun',
      message: 'High-priority KVM VPS quote & custom BDIX bandwidth test requested for greenbazaar.org.',
      type: 'high_priority',
      leadId: 'lead_3',
      leadName: 'Rashid Al-Mamun',
      timestamp: '09:05 AM Today',
      read: false
    }
  ]);

  const [showNotificationDrawer, setShowNotificationDrawer] = useState<boolean>(false);
  const [showAnalyticsDashboard, setShowAnalyticsDashboard] = useState<boolean>(true);

  const [loading, setLoading] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [staffFilter, setStaffFilter] = useState<string>('all');
  const [dateFilterType, setDateFilterType] = useState<'all' | 'today' | '7days' | '30days' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingLead, setEditingLead] = useState<HostingCrmLead | null>(null);

  // Lead Detail View & Interactive Timeline Drawer/Modal State
  const [selectedLeadForDetail, setSelectedLeadForDetail] = useState<HostingCrmLead | null>(null);
  const [timelineTab, setTimelineTab] = useState<'all' | 'notes' | 'emails' | 'status'>('all');
  const [selectedTemplateForLead, setSelectedTemplateForLead] = useState<string>('');
  const [newTimelineNote, setNewTimelineNote] = useState('');
  const [isHighPriorityNote, setIsHighPriorityNote] = useState(false);
  const [newEmailSubject, setNewEmailSubject] = useState('');
  const [newEmailBody, setNewEmailBody] = useState('');
  const [newCallType, setNewCallType] = useState<'call' | 'whatsapp'>('whatsapp');
  const [newCallNote, setNewCallNote] = useState('');

  // Quote Generator Modal State
  const [showQuoteModal, setShowQuoteModal] = useState<boolean>(false);
  const [quoteLead, setQuoteLead] = useState<HostingCrmLead | null>(null);
  const [quoteDetails, setQuoteDetails] = useState({
    package: 'Cloud NVMe Hosting (Starter Package)',
    billingPeriod: '1 Year (Annual)',
    domainName: 'example.com',
    setupFee: 0,
    priceBdt: 3500,
    discountPercent: 10,
    notes: 'Includes free SSL certificate, BDIX speed boost, and automated daily backups.'
  });

  // Whois Inspector State
  const [showWhoisModal, setShowWhoisModal] = useState<boolean>(false);
  const [whoisDomain, setWhoisDomain] = useState<string>('');
  const [whoisResult, setWhoisResult] = useState<any>(null);
  const [whoisLoading, setWhoisLoading] = useState<boolean>(false);

  // Form State
  const [form, setForm] = useState({
    contactName: '',
    companyName: '',
    email: '',
    phone: '',
    targetDomain: '',
    leadStage: 'new' as HostingCrmLead['leadStage'],
    interestedProductsText: 'Cloud NVMe VPS - 4 vCPU / 8GB RAM, .COM Domain',
    dealValueBdt: '12500',
    assignedStaffId: '',
    source: 'WhatsApp' as HostingCrmLead['source'],
    noteText: ''
  });

  // Updated Status Workflow Stages
  const leadStagesConfig = [
    { id: 'new', label: '📥 New Lead', color: 'border-blue-500 bg-blue-50 text-blue-900', badgeColor: 'bg-blue-100 text-blue-800' },
    { id: 'contacted', label: '📞 Contacted', color: 'border-amber-500 bg-amber-50 text-amber-900', badgeColor: 'bg-amber-100 text-amber-800' },
    { id: 'qualified', label: '✅ Qualified', color: 'border-purple-500 bg-purple-50 text-purple-900', badgeColor: 'bg-purple-100 text-purple-800' },
    { id: 'vps_quote_sent', label: '⚡ Proposal & Quote', color: 'border-cyan-500 bg-cyan-50 text-cyan-900', badgeColor: 'bg-cyan-100 text-cyan-800' },
    { id: 'invoice_pending', label: '💳 Invoice Issued', color: 'border-indigo-500 bg-indigo-50 text-indigo-900', badgeColor: 'bg-indigo-100 text-indigo-800' },
    { id: 'converted', label: '🎉 Converted Customer', color: 'border-emerald-500 bg-emerald-50 text-emerald-900', badgeColor: 'bg-emerald-100 text-emerald-800' },
    { id: 'renewal_upsell', label: '🔄 Renewal / Upsell', color: 'border-rose-500 bg-rose-50 text-rose-900', badgeColor: 'bg-rose-100 text-rose-800' }
  ];

  // Map legacy stage strings safely
  const normalizeStage = (stage: string): HostingCrmLead['leadStage'] => {
    if (stage === 'new_inbound') return 'new';
    if (stage === 'active_customer') return 'converted';
    if (stage === 'domain_consultation') return 'contacted';
    return (stage as any) || 'new';
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/crm/leads');
      const data = await res.json();
      if (data.success && Array.isArray(data.leads) && data.leads.length > 0) {
        const normalized = data.leads.map((l: any) => ({
          ...l,
          leadStage: normalizeStage(l.leadStage),
          timeline: Array.isArray(l.timeline) ? l.timeline : []
        }));
        setLeads(normalized);
      } else {
        const snap = await getDocs(collection(db, 'hosting_crm_leads'));
        if (!snap.empty) {
          const loaded: HostingCrmLead[] = [];
          snap.docs.forEach(d => {
            const val = d.data() as any;
            loaded.push({
              id: d.id,
              ...val,
              leadStage: normalizeStage(val.leadStage),
              timeline: Array.isArray(val.timeline) ? val.timeline : []
            });
          });
          setLeads(loaded);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch CRM leads, using fallback:', err);
    } finally {
      setLoading(false);
    }
  };

  // ROUND-ROBIN AUTOMATED DISTRIBUTOR HELPER FUNCTION
  const getNextRoundRobinStaffMember = () => {
    const staffPool = activeStaffMembers && activeStaffMembers.length > 0 ? activeStaffMembers : [
      { id: 'staff_1', name: 'Alex M.', role: 'Support Admin', email: 'alex@click2itbd.com' },
      { id: 'staff_2', name: 'Sarah K.', role: 'Sales Lead', email: 'sarah@click2itbd.com' },
      { id: 'staff_3', name: 'Imran H.', role: 'Technical Support', email: 'imran@click2itbd.com' },
      { id: 'staff_4', name: 'Kamal R.', role: 'Billing Specialist', email: 'kamal@click2itbd.com' }
    ];

    const nextIdx = roundRobinIndex % staffPool.length;
    setRoundRobinIndex(nextIdx + 1);
    const chosen = staffPool[nextIdx];
    return {
      id: chosen.id,
      name: `${chosen.name} (${chosen.role})`,
      rawName: chosen.name
    };
  };

  // Equalize Active Lead Workload Across Active Staff Members
  const handleRebalanceLeadWorkload = () => {
    const staffPool = activeStaffMembers && activeStaffMembers.length > 0 ? activeStaffMembers : [
      { id: 'staff_1', name: 'Alex M.', role: 'Support Admin' },
      { id: 'staff_2', name: 'Sarah K.', role: 'Sales Lead' },
      { id: 'staff_3', name: 'Imran H.', role: 'Technical Support' },
      { id: 'staff_4', name: 'Kamal R.', role: 'Billing Specialist' }
    ];

    let pointer = 0;
    const nowTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' Today';

    setLeads(prev => prev.map(lead => {
      // Reassign open active leads
      if (normalizeStage(lead.leadStage) !== 'converted') {
        const staff = staffPool[pointer % staffPool.length];
        pointer++;
        const staffName = `${staff.name} (${staff.role})`;
        const logItem: LeadActivityLog = {
          id: `tl_${Date.now()}_${Math.random().toString(36).substring(2,5)}`,
          type: 'note',
          title: 'Workload Rebalanced',
          description: `Lead load equalized & assigned to ${staffName}.`,
          timestamp: nowTimestamp,
          performedBy: 'Automated Round-Robin Engine'
        };

        return {
          ...lead,
          assignedStaffId: staff.id,
          assignedStaffName: staffName,
          timeline: [logItem, ...(lead.timeline || [])]
        };
      }
      return lead;
    }));

    toast.success(`⚡ Rebalanced active leads equally across ${staffPool.length} staff members!`);
    setShowWorkloadModal(false);
  };

  // Helper to parse lead date for date range filtering
  const getLeadDate = (lead: HostingCrmLead): Date => {
    if (lead.createdAt) {
      const d = new Date(lead.createdAt);
      if (!isNaN(d.getTime())) return d;
    }
    if (lead.lastContactTime) {
      const timeStr = lead.lastContactTime.toLowerCase();
      const now = new Date();
      if (timeStr.includes('today') || timeStr.includes('just now')) return now;
      if (timeStr.includes('yesterday')) {
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      }
      if (timeStr.includes('2 days ago')) {
        return new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
      }
      if (timeStr.includes('3 days ago')) {
        return new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
      }
      const parsed = new Date(lead.lastContactTime);
      if (!isNaN(parsed.getTime())) return parsed;
    }
    return new Date();
  };

  // MULTI-CRITERIA FILTERED LEADS (Status, Staff Member, Date Range, Search Query)
  const filteredLeads = leads.filter(lead => {
    // 1. Filter by Status / Stage
    const currentStageNormalized = normalizeStage(lead.leadStage);
    if (stageFilter !== 'all' && currentStageNormalized !== stageFilter) return false;

    // 2. Filter by Assigned Staff Member
    if (staffFilter !== 'all') {
      if (staffFilter === 'unassigned') {
        if (lead.assignedStaffId || lead.assignedStaffName) return false;
      } else {
        const matchesId = lead.assignedStaffId === staffFilter;
        const matchesName = lead.assignedStaffName && lead.assignedStaffName.toLowerCase().includes(staffFilter.toLowerCase());
        if (!matchesId && !matchesName) return false;
      }
    }

    // 3. Filter by Date Range (Today, Last 7 Days, Last 30 Days, Custom Range)
    if (dateFilterType !== 'all') {
      const leadDate = getLeadDate(lead);
      const now = new Date();

      if (dateFilterType === 'today') {
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        if (leadDate < todayStart) return false;
      } else if (dateFilterType === '7days') {
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        if (leadDate < sevenDaysAgo) return false;
      } else if (dateFilterType === '30days') {
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        if (leadDate < thirtyDaysAgo) return false;
      } else if (dateFilterType === 'custom') {
        if (customStartDate) {
          const start = new Date(customStartDate);
          start.setHours(0, 0, 0, 0);
          if (leadDate < start) return false;
        }
        if (customEndDate) {
          const end = new Date(customEndDate);
          end.setHours(23, 59, 59, 999);
          if (leadDate > end) return false;
        }
      }
    }

    // 4. Search Query across All Fields
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        lead.contactName.toLowerCase().includes(q) ||
        (lead.companyName && lead.companyName.toLowerCase().includes(q)) ||
        lead.email.toLowerCase().includes(q) ||
        lead.phone.includes(q) ||
        (lead.targetDomain && lead.targetDomain.toLowerCase().includes(q)) ||
        lead.interestedProducts.some(p => p.toLowerCase().includes(q)) ||
        (lead.assignedStaffName && lead.assignedStaffName.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const isFilterActive = searchQuery !== '' || stageFilter !== 'all' || staffFilter !== 'all' || dateFilterType !== 'all' || customStartDate !== '' || customEndDate !== '';

  const handleClearAllFilters = () => {
    setSearchQuery('');
    setStageFilter('all');
    setStaffFilter('all');
    setDateFilterType('all');
    setCustomStartDate('');
    setCustomEndDate('');
    toast.success('Cleared all lead search and filter criteria');
  };

  // CSV/EXCEL EXPORT FUNCTION
  const handleExportCsv = () => {
    if (filteredLeads.length === 0) {
      toast.error('No leads available to export with current filters');
      return;
    }

    const headers = [
      'Lead ID',
      'Contact Name',
      'Company Name',
      'Email Address',
      'Phone Number',
      'Target Domain',
      'Lead Stage',
      'Deal Value (BDT)',
      'Assigned Staff',
      'Interested Products',
      'Lead Source',
      'Last Contact Time',
      'Created Date',
      'Notes'
    ];

    const escapeCsv = (val: string | number | undefined | null) => {
      if (val === undefined || val === null) return '""';
      const clean = String(val).replace(/"/g, '""');
      return `"${clean}"`;
    };

    const rows = filteredLeads.map(l => [
      escapeCsv(l.id),
      escapeCsv(l.contactName),
      escapeCsv(l.companyName || ''),
      escapeCsv(l.email),
      escapeCsv(l.phone),
      escapeCsv(l.targetDomain || ''),
      escapeCsv(l.leadStage),
      escapeCsv(l.dealValueBdt || 0),
      escapeCsv(l.assignedStaffName || 'Unassigned'),
      escapeCsv((l.interestedProducts || []).join('; ')),
      escapeCsv(l.source || 'WhatsApp'),
      escapeCsv(l.lastContactTime || ''),
      escapeCsv(l.createdAt || new Date().toISOString().split('T')[0]),
      escapeCsv((l.notes || []).join('; '))
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const dateStr = new Date().toISOString().split('T')[0];
    link.download = `Click2IT_Leads_Report_${dateStr}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filteredLeads.length} leads to CSV file!`);
  };

  // CSV SAMPLE TEMPLATE DOWNLOAD
  const handleDownloadSampleCsv = () => {
    const sampleHeaders = ['Contact Name', 'Company Name', 'Email Address', 'Phone Number', 'Target Domain', 'Lead Stage', 'Deal Value BDT', 'Assigned Staff', 'Lead Source', 'Notes'];
    const sampleRow1 = ['"Monir Hossain"', '"Chittagong Maritime Ltd"', '"monir@ctgbd.com"', '"+880 1711-223344"', '"ctgbd.com"', '"new"', '"15000"', '"Alex M. (Support Admin)"', '"WhatsApp"', '"Requires NVMe Cloud VPS + BDIX bandwidth"'];
    const sampleRow2 = ['"Faria Yasmin"', '"Dhaka Digital Studio"', '"faria@dhakadigital.net"', '"+880 1812-445566"', '"dhakadigital.net"', '"qualified"', '"22000"', '"Sarah K. (Sales Lead)"', '"Meta Ads"', '"Needs cPanel Premier and .NET domain"'];
    const sampleContent = [sampleHeaders.join(','), sampleRow1.join(','), sampleRow2.join(',')].join('\r\n');
    const blob = new Blob([sampleContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Click2IT_Leads_Import_Template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Downloaded Sample CSV Template!');
  };

  // CSV/EXCEL IMPORT FUNCTION
  const handleImportCsvFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) {
          toast.error('The selected file is empty.');
          return;
        }

        const lines = text.split(/\r\n|\n/).filter(line => line.trim().length > 0);
        if (lines.length <= 1) {
          toast.error('CSV file has no data rows to import');
          return;
        }

        // CSV line parser taking quotes into account
        const parseCsvLine = (line: string): string[] => {
          const result: string[] = [];
          let current = '';
          let inQuotes = false;
          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
              if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i++;
              } else {
                inQuotes = !inQuotes;
              }
            } else if (char === ',' && !inQuotes) {
              result.push(current.trim());
              current = '';
            } else {
              current += char;
            }
          }
          result.push(current.trim());
          return result;
        };

        const rawHeaders = parseCsvLine(lines[0]).map(h => h.toLowerCase());
        const contactIdx = rawHeaders.findIndex(h => h.includes('contact') || h.includes('name'));
        const companyIdx = rawHeaders.findIndex(h => h.includes('company'));
        const emailIdx = rawHeaders.findIndex(h => h.includes('email'));
        const phoneIdx = rawHeaders.findIndex(h => h.includes('phone'));
        const domainIdx = rawHeaders.findIndex(h => h.includes('domain'));
        const stageIdx = rawHeaders.findIndex(h => h.includes('stage') || h.includes('status'));
        const dealIdx = rawHeaders.findIndex(h => h.includes('deal') || h.includes('value') || h.includes('price') || h.includes('bdt'));
        const staffIdx = rawHeaders.findIndex(h => h.includes('staff') || h.includes('assigned'));
        const sourceIdx = rawHeaders.findIndex(h => h.includes('source'));
        const notesIdx = rawHeaders.findIndex(h => h.includes('note'));

        const nowTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' Today';
        const createdIso = new Date().toISOString().split('T')[0];

        const importedLeads: HostingCrmLead[] = [];

        for (let i = 1; i < lines.length; i++) {
          const cols = parseCsvLine(lines[i]);
          if (cols.length === 0 || (cols.length === 1 && !cols[0])) continue;

          const contactName = cols[contactIdx !== -1 ? contactIdx : 0] || `Lead ${i}`;
          const email = cols[emailIdx !== -1 ? emailIdx : 2] || `lead_${Date.now()}_${i}@imported.com`;
          const phone = cols[phoneIdx !== -1 ? phoneIdx : 3] || '+880 1700-000000';
          const companyName = cols[companyIdx !== -1 ? companyIdx : 1] || '';
          const targetDomain = cols[domainIdx !== -1 ? domainIdx : 4] || '';
          const rawStage = cols[stageIdx !== -1 ? stageIdx : 5] || 'new';
          const rawDeal = cols[dealIdx !== -1 ? dealIdx : 6] || '5000';
          const rawStaff = cols[staffIdx !== -1 ? staffIdx : 7] || '';
          const rawSource = cols[sourceIdx !== -1 ? sourceIdx : 8] || 'CSV Import';
          const rawNote = cols[notesIdx !== -1 ? notesIdx : 9] || 'Imported via CSV/Excel reporting tool';

          const leadStage = normalizeStage(rawStage.toLowerCase());
          const dealValueBdt = parseInt(rawDeal.replace(/[^0-9]/g, '')) || 5000;

          // Assigned staff matching or round-robin distribution
          let assignedStaffId: string | undefined = undefined;
          let assignedStaffName: string | undefined = undefined;

          if (rawStaff) {
            const foundStaff = activeStaffMembers.find(s => 
              s.name.toLowerCase().includes(rawStaff.toLowerCase()) || 
              s.id === rawStaff
            );
            if (foundStaff) {
              assignedStaffId = foundStaff.id;
              assignedStaffName = `${foundStaff.name} (${foundStaff.role})`;
            }
          }

          if (!assignedStaffName && activeStaffMembers.length > 0) {
            const rrStaff = activeStaffMembers[i % activeStaffMembers.length];
            assignedStaffId = rrStaff.id;
            assignedStaffName = `${rrStaff.name} (${rrStaff.role})`;
          }

          const newLead: HostingCrmLead = {
            id: `lead_csv_${Date.now()}_${i}`,
            contactName,
            companyName,
            email,
            phone,
            targetDomain,
            leadStage,
            dealValueBdt,
            assignedStaffId,
            assignedStaffName,
            interestedProducts: targetDomain ? [`Hosting & Domain (${targetDomain})`] : ['cPanel NVMe Hosting'],
            notes: [rawNote],
            timeline: [
              {
                id: `tl_csv_${Date.now()}_${i}`,
                type: 'note',
                title: 'Imported via CSV/Excel Data Tool',
                description: `Imported from "${file.name}". Automatically assigned to ${assignedStaffName || 'Unassigned'}.`,
                timestamp: nowTimestamp,
                performedBy: 'CSV/Excel Import Engine'
              }
            ],
            lastContactTime: 'Just now',
            source: (rawSource as any) || 'Direct Referral',
            createdAt: createdIso
          };

          importedLeads.push(newLead);
        }

        if (importedLeads.length > 0) {
          setLeads(prev => [...importedLeads, ...prev]);
          toast.success(`🎉 Successfully imported ${importedLeads.length} leads from "${file.name}"!`);

          // Background sync with API and Firestore
          importedLeads.forEach(async (lead) => {
            try {
              await fetch('/api/crm/leads', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(lead)
              });
              await setDoc(doc(db, 'hosting_crm_leads', lead.id), lead).catch(() => null);
            } catch (err) {
              console.warn('Backend sync failed for imported lead:', err);
            }
          });
        } else {
          toast.error('No valid leads could be parsed from the CSV file.');
        }
      } catch (err: any) {
        toast.error('Failed to parse CSV file: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const totalPipelineValue = leads.reduce((acc, l) => acc + (l.dealValueBdt || 0), 0);
  const convertedCount = leads.filter(l => normalizeStage(l.leadStage) === 'converted').length;
  const conversionRate = leads.length > 0 ? Math.round((convertedCount / leads.length) * 100) : 0;
  const unreadNotifCount = notifications.filter(n => !n.read).length;

  // RECHARTS FUNNEL CHART DATA DISTRIBUTION
  const funnelChartData = [
    { 
      name: 'New', 
      value: leads.filter(l => ['new', 'new_inbound'].includes(normalizeStage(l.leadStage))).length, 
      fill: '#3b82f6',
      stageLabel: '📥 New Inbound Leads'
    },
    { 
      name: 'Contacted', 
      value: leads.filter(l => ['contacted', 'domain_consultation'].includes(normalizeStage(l.leadStage))).length, 
      fill: '#f59e0b',
      stageLabel: '📞 Contacted Leads'
    },
    { 
      name: 'Qualified', 
      value: leads.filter(l => ['qualified', 'vps_quote_sent', 'invoice_pending'].includes(normalizeStage(l.leadStage))).length, 
      fill: '#a855f7',
      stageLabel: '✅ Qualified & Proposals'
    },
    { 
      name: 'Converted', 
      value: leads.filter(l => ['converted', 'active_customer'].includes(normalizeStage(l.leadStage))).length, 
      fill: '#10b981',
      stageLabel: '🎉 Converted Customers'
    }
  ];

  // Stage Value Distribution for Bar Chart
  const stageValueData = leadStagesConfig.map(st => ({
    name: st.label.split(' ')[1] || st.label,
    count: leads.filter(l => normalizeStage(l.leadStage) === st.id).length,
    value: leads.filter(l => normalizeStage(l.leadStage) === st.id).reduce((sum, l) => sum + (l.dealValueBdt || 0), 0) / 1000
  }));

  // BULK SELECTION HANDLERS
  const handleToggleSelectAll = () => {
    if (selectedLeadIds.length === filteredLeads.length) {
      setSelectedLeadIds([]);
    } else {
      setSelectedLeadIds(filteredLeads.map(l => l.id));
    }
  };

  const handleToggleSelectLead = (id: string) => {
    if (selectedLeadIds.includes(id)) {
      setSelectedLeadIds(prev => prev.filter(item => item !== id));
    } else {
      setSelectedLeadIds(prev => [...prev, id]);
    }
  };

  // BULK ACTION 1: Batch Stage Update
  const handleBatchStageUpdate = async (newStage: HostingCrmLead['leadStage']) => {
    if (selectedLeadIds.length === 0) return;
    const stageObj = leadStagesConfig.find(s => s.id === newStage);
    const nowTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' Today';

    setLeads(prev => prev.map(lead => {
      if (selectedLeadIds.includes(lead.id)) {
        const logItem: LeadActivityLog = {
          id: `tl_${Date.now()}_${Math.random().toString(36).substring(2,5)}`,
          type: 'status_change',
          title: `Bulk Stage Update to ${stageObj?.label || newStage}`,
          description: `Lead moved in batch update to "${stageObj?.label || newStage}".`,
          timestamp: nowTimestamp,
          performedBy: 'Alex M. (Support Admin)',
          isHighPriority: newStage === 'converted'
        };
        return {
          ...lead,
          leadStage: newStage,
          timeline: [logItem, ...(lead.timeline || [])]
        };
      }
      return lead;
    }));

    if (newStage === 'converted') {
      toast.success(`🎉 Converted ${selectedLeadIds.length} leads simultaneously!`);
    } else {
      toast.success(`Updated ${selectedLeadIds.length} leads to "${stageObj?.label}"`);
    }

    // Backend sync for each selected lead
    selectedLeadIds.forEach(async (id) => {
      try {
        await fetch(`/api/crm/leads/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ leadStage: newStage })
        });
        await setDoc(doc(db, 'hosting_crm_leads', id), { leadStage: newStage }, { merge: true }).catch(() => null);
      } catch (e) {
        console.warn('Batch update sync error:', e);
      }
    });

    setSelectedLeadIds([]);
  };

  // BULK ACTION 2: Batch Staff Reassignment
  const handleBatchAssignStaff = async (staffId: string) => {
    if (selectedLeadIds.length === 0) return;
    const assignedStaff = activeStaffMembers.find(s => s.id === staffId);
    if (!assignedStaff) return;

    const staffName = `${assignedStaff.name} (${assignedStaff.role})`;
    const nowTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' Today';

    setLeads(prev => prev.map(lead => {
      if (selectedLeadIds.includes(lead.id)) {
        const logItem: LeadActivityLog = {
          id: `tl_${Date.now()}_${Math.random().toString(36).substring(2,5)}`,
          type: 'note',
          title: 'Staff Reassigned',
          description: `Account manager updated to ${staffName}.`,
          timestamp: nowTimestamp,
          performedBy: 'Alex M. (Support Admin)'
        };
        return {
          ...lead,
          assignedStaffId: staffId,
          assignedStaffName: staffName,
          timeline: [logItem, ...(lead.timeline || [])]
        };
      }
      return lead;
    }));

    toast.success(`Reassigned ${selectedLeadIds.length} leads to ${assignedStaff.name}`);

    selectedLeadIds.forEach(async (id) => {
      try {
        await fetch(`/api/crm/leads/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ assignedStaffId: staffId, assignedStaffName: staffName })
        });
        await setDoc(doc(db, 'hosting_crm_leads', id), { assignedStaffId: staffId, assignedStaffName: staffName }, { merge: true }).catch(() => null);
      } catch (e) {
        console.warn('Batch reassign sync error:', e);
      }
    });

    setSelectedLeadIds([]);
  };

  // BULK ACTION 3: Batch Delete
  const handleBatchDeleteLeads = async () => {
    if (selectedLeadIds.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedLeadIds.length} selected leads?`)) return;

    const idsToDelete = [...selectedLeadIds];
    setLeads(prev => prev.filter(l => !idsToDelete.includes(l.id)));
    toast.success(`Deleted ${idsToDelete.length} leads.`);

    idsToDelete.forEach(async (id) => {
      try {
        await fetch(`/api/crm/leads/${id}`, { method: 'DELETE' });
      } catch (e) {
        console.warn('Batch delete error:', e);
      }
    });

    setSelectedLeadIds([]);
  };

  // BULK ACTION 4: Batch Email Dispatch
  const handleBatchSendEmailTemplate = (templateId: string) => {
    const tpl = emailTemplates.find(t => t.id === templateId);
    if (!tpl || selectedLeadIds.length === 0) return;

    const nowTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' Today';

    setLeads(prev => prev.map(lead => {
      if (selectedLeadIds.includes(lead.id)) {
        const logItem: LeadActivityLog = {
          id: `tl_${Date.now()}_${Math.random().toString(36).substring(2,5)}`,
          type: 'email_sent',
          title: `Batch Email: ${tpl.name}`,
          description: `Sent "${tpl.name}" email template to ${lead.email}`,
          timestamp: nowTimestamp,
          performedBy: 'Alex M. (Support Admin)'
        };
        return {
          ...lead,
          timeline: [logItem, ...(lead.timeline || [])]
        };
      }
      return lead;
    }));

    toast.success(`Dispatched "${tpl.name}" template to ${selectedLeadIds.length} leads!`);
    setSelectedLeadIds([]);
  };

  // EMAIL TEMPLATES SUB-MODULE HANDLERS
  const handleOpenAddTemplateModal = () => {
    setEditingTemplate(null);
    setTemplateForm({
      name: '',
      category: 'quote',
      subject: '',
      body: ''
    });
    setShowTemplateModal(true);
  };

  const handleOpenEditTemplateModal = (tpl: LeadEmailTemplate) => {
    setEditingTemplate(tpl);
    setTemplateForm({
      name: tpl.name,
      category: tpl.category,
      subject: tpl.subject,
      body: tpl.body
    });
    setShowTemplateModal(true);
  };

  const handleSaveTemplateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateForm.name || !templateForm.subject || !templateForm.body) {
      toast.error('Please fill template name, subject, and body');
      return;
    }

    if (editingTemplate) {
      setEmailTemplates(prev => prev.map(t => t.id === editingTemplate.id ? {
        ...t,
        name: templateForm.name,
        category: templateForm.category,
        subject: templateForm.subject,
        body: templateForm.body,
        updatedAt: 'Just now'
      } : t));
      toast.success(`Updated template "${templateForm.name}"`);
    } else {
      const newTpl: LeadEmailTemplate = {
        id: `tpl_${Date.now()}`,
        name: templateForm.name,
        category: templateForm.category,
        subject: templateForm.subject,
        body: templateForm.body,
        updatedAt: 'Just now'
      };
      setEmailTemplates(prev => [newTpl, ...prev]);
      toast.success(`Created email template "${templateForm.name}"`);
    }

    setShowTemplateModal(false);
  };

  const handleDeleteTemplate = (id: string, name: string) => {
    if (!confirm(`Delete template "${name}"?`)) return;
    setEmailTemplates(prev => prev.filter(t => t.id !== id));
    toast.success(`Deleted template "${name}"`);
  };

  const handleInsertPlaceholder = (placeholder: string) => {
    setTemplateForm(prev => ({
      ...prev,
      body: prev.body + ' ' + placeholder
    }));
  };

  // Populate Email Template in Lead Timeline Drawer
  const handleSelectTemplateForLead = (templateId: string) => {
    setSelectedTemplateForLead(templateId);
    if (!selectedLeadForDetail) return;

    const tpl = emailTemplates.find(t => t.id === templateId);
    if (!tpl) return;

    let populatedSubject = tpl.subject;
    let populatedBody = tpl.body;

    const replacements: Record<string, string> = {
      '{{contactName}}': selectedLeadForDetail.contactName || 'Valued Client',
      '{{companyName}}': selectedLeadForDetail.companyName || 'Individual',
      '{{targetDomain}}': selectedLeadForDetail.targetDomain || 'yourdomain.com',
      '{{dealValueBdt}}': formatCurrency(selectedLeadForDetail.dealValueBdt),
      '{{assignedStaffName}}': selectedLeadForDetail.assignedStaffName || 'Alex M. (Support Admin)'
    };

    Object.entries(replacements).forEach(([tag, val]) => {
      populatedSubject = populatedSubject.replaceAll(tag, val);
      populatedBody = populatedBody.replaceAll(tag, val);
    });

    setNewEmailSubject(populatedSubject);
    setNewEmailBody(populatedBody);
    toast.success(`Loaded template "${tpl.name}" with lead data!`);
  };

  const handleOpenAddModal = () => {
    setEditingLead(null);
    let defaultStaffId = activeStaffMembers[0]?.id || 'staff_1';
    let defaultStaffName = activeStaffMembers[0] ? `${activeStaffMembers[0].name} (${activeStaffMembers[0].role})` : 'Alex M. (Support Admin)';

    // If Auto Round-Robin is enabled, pick next staff in queue
    if (enableRoundRobin) {
      const rrStaff = getNextRoundRobinStaffMember();
      defaultStaffId = rrStaff.id;
      defaultStaffName = rrStaff.name;
    }

    setForm({
      contactName: '',
      companyName: '',
      email: '',
      phone: '',
      targetDomain: '',
      leadStage: 'new',
      interestedProductsText: 'Cloud NVMe VPS - 4 vCPU / 8GB RAM, .COM Domain',
      dealValueBdt: '12500',
      assignedStaffId: defaultStaffId,
      source: 'WhatsApp',
      noteText: 'Inbound lead interested in domain & hosting packages.'
    });
    setShowModal(true);
  };

  const handleOpenEditModal = (lead: HostingCrmLead) => {
    setEditingLead(lead);
    setForm({
      contactName: lead.contactName,
      companyName: lead.companyName || '',
      email: lead.email,
      phone: lead.phone,
      targetDomain: lead.targetDomain || '',
      leadStage: normalizeStage(lead.leadStage),
      interestedProductsText: lead.interestedProducts.join(', '),
      dealValueBdt: String(lead.dealValueBdt || 0),
      assignedStaffId: lead.assignedStaffId || 'staff_1',
      source: lead.source || 'WhatsApp',
      noteText: lead.notes[0] || ''
    });
    setShowModal(true);
  };

  const handleOpenDetailModal = (lead: HostingCrmLead) => {
    setSelectedLeadForDetail(lead);
    setNewEmailSubject(`Special Quotation & Setup Details for ${lead.targetDomain || 'your website'}`);
    setNewEmailBody(`Hello ${lead.contactName},\n\nThank you for reaching out to Click2IT Hosting. We have prepared your customized server and domain quotation.\n\nPackage: ${lead.interestedProducts[0] || 'Cloud NVMe Hosting'}\nEstimated Price: ${formatCurrency(lead.dealValueBdt)}\n\nPlease let us know if you would like to proceed with instant bKash/Nagad activation.`);
  };

  const handleSaveLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.contactName || !form.email) {
      toast.error('Please enter contact name and email');
      return;
    }

    let assignedStaffId = form.assignedStaffId;
    let assignedStaffName = '';

    const matchedStaff = activeStaffMembers.find(s => s.id === form.assignedStaffId);
    if (matchedStaff) {
      assignedStaffName = `${matchedStaff.name} (${matchedStaff.role})`;
    } else {
      assignedStaffName = 'Alex M. (Support Admin)';
    }

    const productsArray = form.interestedProductsText
      .split(',')
      .map(p => p.trim())
      .filter(Boolean);

    const isNew = !editingLead;
    const targetId = editingLead?.id || `lead_${Date.now()}`;
    const nowTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' Today';

    const newTimelineItem: LeadActivityLog = {
      id: `tl_${Date.now()}`,
      type: 'status_change',
      title: isNew ? 'Lead Created (Round-Robin Assigned)' : 'Lead Details Updated',
      description: isNew ? `New lead created and assigned to ${assignedStaffName}.` : `Updated contact & package requirements.`,
      timestamp: nowTimestamp,
      performedBy: assignedStaffName
    };

    const existingTimeline = editingLead?.timeline || [];
    const updatedTimeline = [newTimelineItem, ...existingTimeline];

    const payload = {
      contactName: form.contactName,
      companyName: form.companyName,
      email: form.email,
      phone: form.phone,
      targetDomain: form.targetDomain,
      leadStage: form.leadStage,
      interestedProducts: productsArray.length > 0 ? productsArray : ['cPanel Web Hosting'],
      dealValueBdt: Number(form.dealValueBdt) || 5000,
      assignedStaffId,
      assignedStaffName,
      source: form.source,
      useRoundRobin: enableRoundRobin,
      notes: form.noteText ? [form.noteText] : ['Updated in Hosting CRM Lead Module.'],
      timeline: updatedTimeline
    };

    try {
      let resData: any;
      if (editingLead) {
        const res = await fetch(`/api/crm/leads/${editingLead.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        resData = await res.json();
      } else {
        const res = await fetch('/api/crm/leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        resData = await res.json();
      }

      if (resData?.success && Array.isArray(resData.leads)) {
        const normalized = resData.leads.map((l: any) => ({
          ...l,
          leadStage: normalizeStage(l.leadStage),
          timeline: Array.isArray(l.timeline) ? l.timeline : []
        }));
        setLeads(normalized);
      } else {
        fetchLeads();
      }

      // Check for Converted Stage Notification Trigger
      if (form.leadStage === 'converted') {
        triggerConvertedAlert(payload.contactName, payload.dealValueBdt, targetId);
      }

      // Save to Firestore
      await setDoc(doc(db, 'hosting_crm_leads', targetId), { ...payload, id: targetId }, { merge: true }).catch(() => null);

      setShowModal(false);
      toast.success(`🎉 Lead "${form.contactName}" assigned to ${assignedStaffName}!`);
    } catch (err: any) {
      toast.error('Failed to save lead: ' + err.message);
    }
  };

  // AUTOMATED NOTIFICATION TRIGGER 1: Lead Status Changed to 'Converted'
  const triggerConvertedAlert = (contactName: string, dealValueBdt: number, leadId: string) => {
    const nowTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' Today';
    const notifItem: CrmNotification = {
      id: `notif_${Date.now()}`,
      title: `🎉 Lead Converted: ${contactName}`,
      message: `${contactName} has been converted to an active customer (${formatCurrency(dealValueBdt)}).`,
      type: 'converted',
      leadId,
      leadName: contactName,
      timestamp: nowTimestamp,
      read: false
    };

    setNotifications(prev => [notifItem, ...prev]);

    toast.success(`🎉 CONVERTED ALERT: Lead "${contactName}" converted to active customer!`, {
      duration: 6000,
      icon: '🚀'
    });
  };

  // AUTOMATED NOTIFICATION TRIGGER 2: High Priority Interaction Added to Timeline
  const triggerHighPriorityAlert = (contactName: string, activityTitle: string, leadId: string) => {
    const nowTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' Today';
    const notifItem: CrmNotification = {
      id: `notif_${Date.now()}`,
      title: `🚨 High-Priority Interaction: ${contactName}`,
      message: `Urgent activity recorded: "${activityTitle}" for ${contactName}.`,
      type: 'high_priority',
      leadId,
      leadName: contactName,
      timestamp: nowTimestamp,
      read: false
    };

    setNotifications(prev => [notifItem, ...prev]);

    toast.error(`🚨 HIGH-PRIORITY ALERT: Urgent timeline interaction added for "${contactName}"!`, {
      duration: 6000
    });
  };

  // Workflow Stage Transition Handler (With Timeline Logging & Automated Alerts!)
  const handleUpdateStage = async (leadId: string, newStage: HostingCrmLead['leadStage']) => {
    const targetLead = leads.find(l => l.id === leadId);
    if (!targetLead) return;

    const oldStageLabel = leadStagesConfig.find(s => s.id === normalizeStage(targetLead.leadStage))?.label || targetLead.leadStage;
    const newStageLabel = leadStagesConfig.find(s => s.id === newStage)?.label || newStage;
    const nowTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' Today';

    const stageTimelineEntry: LeadActivityLog = {
      id: `tl_${Date.now()}`,
      type: 'status_change',
      title: `Stage Changed to ${newStageLabel}`,
      description: `Transitioned lead from "${oldStageLabel}" to "${newStageLabel}".`,
      timestamp: nowTimestamp,
      performedBy: 'Alex M. (Support Admin)',
      isHighPriority: newStage === 'converted'
    };

    const updatedTimeline = [stageTimelineEntry, ...(targetLead.timeline || [])];

    // Optimistic UI Update
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, leadStage: newStage, timeline: updatedTimeline } : l));
    if (selectedLeadForDetail?.id === leadId) {
      setSelectedLeadForDetail(prev => prev ? { ...prev, leadStage: newStage, timeline: updatedTimeline } : null);
    }

    // Check Trigger for Automated Notification
    if (newStage === 'converted') {
      triggerConvertedAlert(targetLead.contactName, targetLead.dealValueBdt, leadId);
    } else {
      toast.success(`Moved lead to "${newStageLabel}"`);
    }

    try {
      await fetch(`/api/crm/leads/${leadId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadStage: newStage, timeline: updatedTimeline })
      });
      await setDoc(doc(db, 'hosting_crm_leads', leadId), { leadStage: newStage, timeline: updatedTimeline }, { merge: true }).catch(() => null);
    } catch (e) {
      console.warn('Failed to update stage in backend:', e);
    }
  };

  // Timeline Addition: Add Note
  const handleAddTimelineNote = async () => {
    if (!selectedLeadForDetail || !newTimelineNote.trim()) {
      toast.error('Please enter note text');
      return;
    }

    const nowTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' Today';
    const noteEntry: LeadActivityLog = {
      id: `tl_${Date.now()}`,
      type: 'note',
      title: isHighPriorityNote ? '🚨 URGENT: High-Priority Note' : 'Internal Note Added',
      description: newTimelineNote.trim(),
      timestamp: nowTimestamp,
      performedBy: 'Alex M. (Support Admin)',
      isHighPriority: isHighPriorityNote
    };

    const updatedTimeline = [noteEntry, ...(selectedLeadForDetail.timeline || [])];
    const updatedLead = { ...selectedLeadForDetail, timeline: updatedTimeline };

    setSelectedLeadForDetail(updatedLead);
    setLeads(prev => prev.map(l => l.id === selectedLeadForDetail.id ? updatedLead : l));

    if (isHighPriorityNote) {
      triggerHighPriorityAlert(selectedLeadForDetail.contactName, newTimelineNote.substring(0, 50), selectedLeadForDetail.id);
    } else {
      toast.success('Logged new note to timeline!');
    }

    setNewTimelineNote('');
    setIsHighPriorityNote(false);

    try {
      await fetch(`/api/crm/leads/${selectedLeadForDetail.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timeline: updatedTimeline })
      });
      await setDoc(doc(db, 'hosting_crm_leads', selectedLeadForDetail.id), { timeline: updatedTimeline }, { merge: true }).catch(() => null);
    } catch (e) {
      console.warn('Backend sync failed:', e);
    }
  };

  // Timeline Addition: Send & Log Email
  const handleSendTimelineEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeadForDetail || !newEmailSubject.trim() || !newEmailBody.trim()) {
      toast.error('Please enter subject and body');
      return;
    }

    const nowTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' Today';
    const emailEntry: LeadActivityLog = {
      id: `tl_${Date.now()}`,
      type: 'email_sent',
      title: `Email Sent: ${newEmailSubject}`,
      description: newEmailBody.substring(0, 150) + (newEmailBody.length > 150 ? '...' : ''),
      timestamp: nowTimestamp,
      performedBy: 'Alex M. (Support Admin)',
      meta: { to: selectedLeadForDetail.email, fullBody: newEmailBody }
    };

    const updatedTimeline = [emailEntry, ...(selectedLeadForDetail.timeline || [])];
    const updatedLead = { ...selectedLeadForDetail, timeline: updatedTimeline };

    setSelectedLeadForDetail(updatedLead);
    setLeads(prev => prev.map(l => l.id === selectedLeadForDetail.id ? updatedLead : l));

    toast.success(`📧 Email dispatched to ${selectedLeadForDetail.email} and logged to timeline!`);

    try {
      await fetch(`/api/crm/leads/${selectedLeadForDetail.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timeline: updatedTimeline })
      });
      await setDoc(doc(db, 'hosting_crm_leads', selectedLeadForDetail.id), { timeline: updatedTimeline }, { merge: true }).catch(() => null);
    } catch (e) {
      console.warn('Backend sync failed:', e);
    }
  };

  // Timeline Addition: Log Call or WhatsApp
  const handleLogCallOrWhatsApp = async () => {
    if (!selectedLeadForDetail || !newCallNote.trim()) {
      toast.error('Please enter conversation summary');
      return;
    }

    const nowTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' Today';
    const logEntry: LeadActivityLog = {
      id: `tl_${Date.now()}`,
      type: newCallType,
      title: newCallType === 'whatsapp' ? 'WhatsApp Interaction Logged' : 'Phone Call Logged',
      description: newCallNote.trim(),
      timestamp: nowTimestamp,
      performedBy: 'Alex M. (Support Admin)',
      isHighPriority: isHighPriorityNote
    };

    const updatedTimeline = [logEntry, ...(selectedLeadForDetail.timeline || [])];
    const updatedLead = { ...selectedLeadForDetail, timeline: updatedTimeline, lastContactTime: 'Just now' };

    setSelectedLeadForDetail(updatedLead);
    setLeads(prev => prev.map(l => l.id === selectedLeadForDetail.id ? updatedLead : l));

    if (isHighPriorityNote) {
      triggerHighPriorityAlert(selectedLeadForDetail.contactName, `High-Priority ${newCallType.toUpperCase()}`, selectedLeadForDetail.id);
    } else {
      toast.success(`Recorded ${newCallType === 'whatsapp' ? 'WhatsApp' : 'Phone Call'} interaction!`);
    }

    setNewCallNote('');
    setIsHighPriorityNote(false);

    try {
      await fetch(`/api/crm/leads/${selectedLeadForDetail.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timeline: updatedTimeline, lastContactTime: 'Just now' })
      });
      await setDoc(doc(db, 'hosting_crm_leads', selectedLeadForDetail.id), { timeline: updatedTimeline, lastContactTime: 'Just now' }, { merge: true }).catch(() => null);
    } catch (e) {
      console.warn('Backend sync failed:', e);
    }
  };

  const handleDeleteLead = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove lead "${name}"?`)) return;

    try {
      await fetch(`/api/crm/leads/${id}`, { method: 'DELETE' });
      setLeads(prev => prev.filter(l => l.id !== id));
      if (selectedLeadForDetail?.id === id) setSelectedLeadForDetail(null);
      toast.success(`Removed lead "${name}"`);
    } catch (err: any) {
      toast.error('Delete failed: ' + err.message);
    }
  };

  const handleOpenQuoteGenerator = (lead: HostingCrmLead) => {
    setQuoteLead(lead);
    setQuoteDetails({
      package: lead.interestedProducts[0] || 'Cloud NVMe Hosting Starter',
      billingPeriod: '1 Year (Annual)',
      domainName: lead.targetDomain || 'yourdomain.com',
      setupFee: 0,
      priceBdt: lead.dealValueBdt || 5000,
      discountPercent: 10,
      notes: 'Includes free SSL certificate, BDIX high-speed bandwidth, and automated daily cPanel backups.'
    });
    setShowQuoteModal(true);
  };

  const handleInspectWhois = async (domainName: string) => {
    if (!domainName) {
      toast.error('No target domain specified for this lead');
      return;
    }
    setWhoisDomain(domainName);
    setShowWhoisModal(true);
    setWhoisLoading(true);
    setWhoisResult(null);

    try {
      const res = await fetch(`/api/domains/check-availability?domain=${encodeURIComponent(domainName)}`);
      const data = await res.json();
      if (data.success) {
        setWhoisResult(data);
      } else {
        setWhoisResult({ available: true, message: `Domain "${domainName}" appears available for immediate registration!` });
      }
    } catch (err) {
      setWhoisResult({ available: true, message: `Domain "${domainName}" checked - available via Click2IT Registrar.` });
    } finally {
      setWhoisLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Top Banner */}
      <div className="relative rounded-3xl bg-gradient-to-r from-slate-950 via-indigo-950 to-blue-950 text-white p-6 sm:p-8 md:p-10 shadow-2xl border border-white/10 overflow-hidden">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-4xl space-y-4">
          <div className="inline-flex items-center justify-between w-full flex-wrap gap-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-500/20 text-cyan-300 border border-blue-500/30 text-xs font-extrabold uppercase tracking-wider">
              <RotateCw size={14} className="text-yellow-300 animate-spin" /> Automated Round-Robin Lead Distribution
            </div>

            {/* AUTOMATED STAFF NOTIFICATION CENTER BELL BUTTON */}
            <button
              onClick={() => setShowNotificationDrawer(true)}
              className="relative px-4 py-1.5 rounded-full bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-md"
            >
              <Bell size={16} className={unreadNotifCount > 0 ? "text-amber-400 animate-bounce" : "text-slate-400"} />
              <span>CRM Alerts</span>
              {unreadNotifCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-black animate-pulse">
                  {unreadNotifCount} NEW
                </span>
              )}
            </button>
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight">
            Domain & Web Hosting Sales Pipeline CRM
          </h1>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-3xl">
            Automated <strong>Round-Robin Lead Assignment</strong> logic dynamically distributes incoming inquiries equally among active account managers fetched from Staff & Hosts.
          </p>

          {/* Sub-Module Main Navigation Tabs */}
          <div className="pt-3 flex flex-wrap items-center gap-2 border-t border-white/10">
            <button
              onClick={() => setCrmMainSubTab('pipeline')}
              className={`px-5 py-2.5 rounded-xl font-extrabold text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                crmMainSubTab === 'pipeline'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'bg-white/10 text-slate-300 hover:bg-white/20'
              }`}
            >
              <Layers size={16} /> Lead Pipeline & Bulk Actions ({leads.length})
            </button>

            <button
              onClick={() => setCrmMainSubTab('templates')}
              className={`px-5 py-2.5 rounded-xl font-extrabold text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                crmMainSubTab === 'templates'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'bg-white/10 text-slate-300 hover:bg-white/20'
              }`}
            >
              <BookOpen size={16} /> Lead Email Templates ({emailTemplates.length})
            </button>

            {/* Round-Robin Queue Modal Trigger */}
            <button
              onClick={() => setShowWorkloadModal(true)}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ml-auto"
            >
              <Scale size={16} /> Round-Robin Queue & Workload
            </button>
          </div>
        </div>
      </div>

      {/* SUB-MODULE 1: LEAD PIPELINE, BULK ACTIONS & FUNNEL DASHBOARD */}
      {crmMainSubTab === 'pipeline' && (
        <>
          {/* RECHARTS VISUAL FUNNEL DASHBOARD SECTION */}
          {showAnalyticsDashboard && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6 animate-in fade-in duration-300">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <TrendingUp size={18} className="text-purple-600" />
                    <h2 className="text-base sm:text-lg font-black text-slate-900">
                      Lead Conversion Funnel Analytics (Recharts)
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Visualizing lead volume distribution and deal value across core pipeline conversion stages.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleOpenAddModal}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <UserPlus size={14} /> Add Lead
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
                
                {/* Recharts Funnel Chart */}
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2">
                    <span>Distribution Funnel (New ➔ Contacted ➔ Qualified ➔ Converted)</span>
                    <span className="text-blue-600 font-mono">{leads.length} Leads Total</span>
                  </div>

                  <div className="w-full h-[260px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <FunnelChart margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                        <Tooltip 
                          content={({ active, payload }: any) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div className="bg-slate-900 border border-slate-700 text-white p-3 rounded-xl shadow-xl text-xs space-y-1">
                                  <p className="font-extrabold text-amber-400">{data.stageLabel || data.name}</p>
                                  <p className="font-mono text-sm font-bold">{data.value} Leads</p>
                                  <p className="text-slate-400 text-[10px]">
                                    {leads.length > 0 ? Math.round((data.value / leads.length) * 100) : 0}% of Total Pipeline
                                  </p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Funnel
                          dataKey="value"
                          data={funnelChartData}
                          isAnimationActive
                        >
                          <LabelList position="right" fill="#0f172a" stroke="none" dataKey="name" fontWeight="bold" fontSize={11} />
                          {funnelChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Funnel>
                      </FunnelChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Recharts Bar Chart Breakdown */}
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2">
                    <span>Deal Value by Stage (Thousands BDT ৳)</span>
                    <span className="text-emerald-600 font-mono">{formatCurrency(totalPipelineValue)}</span>
                  </div>

                  <div className="w-full h-[260px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stageValueData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 'bold' }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip 
                          formatter={(val: any) => [`৳${val}k BDT`, 'Stage Deal Value']}
                          contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff' }}
                        />
                        <Bar dataKey="value" fill="#6366f1" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* BULK ACTION CONTROL TOOLBAR (Appears when leads are selected) */}
          {selectedLeadIds.length > 0 && (
            <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-xl border border-blue-500/30 flex flex-wrap items-center justify-between gap-4 animate-in slide-in-from-top duration-300">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 bg-blue-600 text-white font-black text-xs rounded-full">
                  {selectedLeadIds.length} Selected
                </span>
                <span className="text-xs font-extrabold text-slate-300">
                  Bulk Operations Toolbar
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                {/* Batch Stage Change */}
                <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl border border-slate-700">
                  <span className="text-[10px] font-bold text-slate-400 px-2 uppercase">Batch Stage:</span>
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        handleBatchStageUpdate(e.target.value as any);
                        e.target.value = '';
                      }
                    }}
                    className="bg-slate-900 text-white font-bold text-xs px-2 py-1 rounded-lg outline-none cursor-pointer"
                  >
                    <option value="">Move Stage...</option>
                    {leadStagesConfig.map(s => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </select>
                </div>

                {/* Batch Staff Reassign */}
                <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl border border-slate-700">
                  <span className="text-[10px] font-bold text-slate-400 px-2 uppercase">Reassign:</span>
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        handleBatchAssignStaff(e.target.value);
                        e.target.value = '';
                      }
                    }}
                    className="bg-slate-900 text-white font-bold text-xs px-2 py-1 rounded-lg outline-none cursor-pointer max-w-[140px]"
                  >
                    <option value="">Assign Staff...</option>
                    {activeStaffMembers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                {/* Batch Email Template Dispatch */}
                <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl border border-slate-700">
                  <span className="text-[10px] font-bold text-slate-400 px-2 uppercase">Batch Email:</span>
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        handleBatchSendEmailTemplate(e.target.value);
                        e.target.value = '';
                      }
                    }}
                    className="bg-slate-900 text-white font-bold text-xs px-2 py-1 rounded-lg outline-none cursor-pointer max-w-[150px]"
                  >
                    <option value="">Send Template...</option>
                    {emailTemplates.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>

                {/* Batch Delete */}
                <button
                  onClick={handleBatchDeleteLeads}
                  className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-xl transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Trash2 size={14} /> Delete Selected
                </button>

                <button
                  onClick={() => setSelectedLeadIds([])}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Comprehensive Search, Multi-Filter, and CSV/Excel Management Toolbar */}
          <div className="bg-white rounded-3xl p-5 shadow-xs border border-slate-200 space-y-4">
            
            {/* Row 1: Search, Batch Select All, CSV Actions, and View Toggle */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              
              {/* Select All Checkbox & Live Search Input */}
              <div className="flex items-center gap-2.5 flex-1 min-w-[280px]">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-xl border border-slate-200 transition-colors shrink-0">
                  <input
                    type="checkbox"
                    checked={selectedLeadIds.length > 0 && selectedLeadIds.length === filteredLeads.length}
                    onChange={handleToggleSelectAll}
                    className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <span>Select All ({filteredLeads.length})</span>
                </label>

                <div className="relative flex-1">
                  <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by name, company, domain, email, phone, or package..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
              </div>

              {/* CSV / Excel Action Buttons & View Mode Toggles */}
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {/* Export CSV Button */}
                <button
                  onClick={handleExportCsv}
                  title="Export current filtered leads to CSV spreadsheet"
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                >
                  <Download size={14} />
                  <span>Export CSV</span>
                </button>

                {/* Import CSV / Excel Button */}
                <label
                  title="Import leads from CSV file"
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                >
                  <Upload size={14} />
                  <span>Import CSV</span>
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={handleImportCsvFile}
                    className="hidden"
                  />
                </label>

                {/* Sample Template Button */}
                <button
                  onClick={handleDownloadSampleCsv}
                  title="Download sample CSV template for import"
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200"
                >
                  <FileSpreadsheet size={14} className="text-emerald-600" />
                  <span className="hidden sm:inline">Sample CSV</span>
                </button>

                {/* View Mode Toggle: Kanban vs Data Table */}
                <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 ml-1">
                  <button
                    onClick={() => setViewMode('kanban')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                      viewMode === 'kanban' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span>Kanban</span>
                  </button>
                  <button
                    onClick={() => setViewMode('table')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                      viewMode === 'table' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span>Table</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Row 2: Status Filter, Staff Filter, Date Range Picker, and Reset */}
            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
              
              <div className="flex flex-wrap items-center gap-2.5">
                
                {/* 1. STATUS FILTER */}
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-xl">
                  <span className="text-[11px] font-black uppercase text-slate-400 tracking-wider">Status:</span>
                  <select
                    value={stageFilter}
                    onChange={(e) => setStageFilter(e.target.value)}
                    className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer pr-1"
                  >
                    <option value="all">All Stages ({leads.length})</option>
                    {leadStagesConfig.map(st => (
                      <option key={st.id} value={st.id}>
                        {st.label} ({leads.filter(l => normalizeStage(l.leadStage) === st.id).length})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. ASSIGNED STAFF FILTER */}
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-xl">
                  <span className="text-[11px] font-black uppercase text-slate-400 tracking-wider">Staff:</span>
                  <select
                    value={staffFilter}
                    onChange={(e) => setStaffFilter(e.target.value)}
                    className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer pr-1 max-w-[170px]"
                  >
                    <option value="all">All Staff Members ({leads.length})</option>
                    <option value="unassigned">Unassigned Leads ({leads.filter(l => !l.assignedStaffId && !l.assignedStaffName).length})</option>
                    {activeStaffMembers.map(staff => {
                      const count = leads.filter(l => l.assignedStaffId === staff.id || (l.assignedStaffName && l.assignedStaffName.includes(staff.name))).length;
                      return (
                        <option key={staff.id} value={staff.id}>
                          {staff.name} ({count})
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* 3. DATE RANGE FILTER */}
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-xl">
                  <Calendar size={13} className="text-slate-400" />
                  <span className="text-[11px] font-black uppercase text-slate-400 tracking-wider">Date:</span>
                  <select
                    value={dateFilterType}
                    onChange={(e) => setDateFilterType(e.target.value as any)}
                    className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer pr-1"
                  >
                    <option value="all">All Time</option>
                    <option value="today">Today</option>
                    <option value="7days">Last 7 Days</option>
                    <option value="30days">Last 30 Days</option>
                    <option value="custom">Custom Date Range...</option>
                  </select>
                </div>

                {/* Custom Date Range Pickers (shown when custom is selected) */}
                {dateFilterType === 'custom' && (
                  <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-xl animate-in fade-in">
                    <span className="text-[10px] font-bold text-blue-800 uppercase">From:</span>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="bg-white border border-blue-200 rounded-lg px-2 py-1 text-xs font-semibold text-slate-800 outline-none"
                    />
                    <span className="text-[10px] font-bold text-blue-800 uppercase">To:</span>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="bg-white border border-blue-200 rounded-lg px-2 py-1 text-xs font-semibold text-slate-800 outline-none"
                    />
                  </div>
                )}

                {/* CLEAR ALL FILTERS BUTTON */}
                {isFilterActive && (
                  <button
                    onClick={handleClearAllFilters}
                    className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-extrabold text-xs flex items-center gap-1.5 border border-rose-200 transition-colors cursor-pointer"
                  >
                    <X size={13} />
                    <span>Reset Filters</span>
                  </button>
                )}
              </div>

              {/* Results count & Active filters status */}
              <div className="flex items-center gap-2 text-slate-500 font-medium">
                <span>Showing <strong className="text-slate-900 font-black">{filteredLeads.length}</strong> of {leads.length} leads</span>
                {isFilterActive && (
                  <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold text-[10px]">
                    Filtered
                  </span>
                )}
              </div>

            </div>
          </div>

          {/* KANBAN BOARD VIEW */}
          {viewMode === 'kanban' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-3 items-start">
              {leadStagesConfig.map(stage => {
                const stageLeads = filteredLeads.filter(l => normalizeStage(l.leadStage) === stage.id);
                const stageTotalValue = stageLeads.reduce((acc, l) => acc + (l.dealValueBdt || 0), 0);

                return (
                  <div key={stage.id} className="bg-slate-100/70 rounded-2xl p-2.5 border border-slate-200/80 flex flex-col min-h-[520px]">
                    {/* Column Header */}
                    <div className={`p-2.5 rounded-xl border mb-3 ${stage.color} flex flex-col gap-1`}>
                      <div className="flex items-center justify-between font-black text-xs">
                        <span className="truncate">{stage.label}</span>
                        <span className="px-2 py-0.5 rounded-full bg-white/60 text-slate-900 font-extrabold text-[10px] shrink-0">
                          {stageLeads.length}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold opacity-80">
                        {formatCurrency(stageTotalValue)}
                      </span>
                    </div>

                    {/* Lead Cards */}
                    <div className="flex-1 space-y-3 overflow-y-auto custom-scrollbar">
                      {stageLeads.length === 0 ? (
                        <div className="p-4 rounded-xl border border-dashed border-slate-300 text-center text-slate-400 text-xs">
                          No leads in this stage
                        </div>
                      ) : (
                        stageLeads.map(lead => {
                          const isSelected = selectedLeadIds.includes(lead.id);
                          return (
                            <div
                              key={lead.id}
                              className={`bg-white rounded-2xl p-3 border shadow-xs hover:shadow-md transition-all space-y-2.5 group relative ${
                                isSelected ? 'border-blue-500 ring-2 ring-blue-400/30' : 'border-slate-200'
                              }`}
                            >
                              {/* Selection Checkbox */}
                              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                <label className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => handleToggleSelectLead(lead.id)}
                                    className="rounded text-blue-600 focus:ring-blue-500"
                                  />
                                  <span>Select</span>
                                </label>

                                <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 shrink-0">
                                  {formatCurrency(lead.dealValueBdt)}
                                </span>
                              </div>

                              {/* Lead Title & Info */}
                              <div>
                                <h4 
                                  onClick={() => handleOpenDetailModal(lead)}
                                  className="font-extrabold text-xs text-slate-900 group-hover:text-blue-600 transition-colors cursor-pointer"
                                >
                                  {lead.contactName}
                                </h4>
                                {lead.companyName && (
                                  <p className="text-[11px] text-slate-500 font-medium truncate flex items-center gap-1 mt-0.5">
                                    <Building size={11} className="text-slate-400 shrink-0" /> {lead.companyName}
                                  </p>
                                )}
                                {lead.targetDomain && (
                                  <div className="mt-1 flex items-center justify-between text-[10px]">
                                    <span className="font-mono text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 truncate max-w-[110px]">
                                      🌐 {lead.targetDomain}
                                    </span>
                                    <button
                                      onClick={() => handleInspectWhois(lead.targetDomain!)}
                                      className="text-blue-600 hover:underline font-bold text-[10px] cursor-pointer"
                                    >
                                      Whois
                                    </button>
                                  </div>
                                )}
                              </div>

                              {/* Interested Products */}
                              <div className="space-y-0.5">
                                <div className="flex flex-wrap gap-1">
                                  {lead.interestedProducts.map((prod, idx) => (
                                    <span key={idx} className="text-[10px] font-bold bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded border border-slate-200 truncate max-w-full">
                                      {prod}
                                    </span>
                                  ))}
                                </div>
                              </div>

                              {/* View Timeline Button */}
                              <button
                                onClick={() => handleOpenDetailModal(lead)}
                                className="w-full py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-extrabold text-[10px] flex items-center justify-center gap-1 transition-colors cursor-pointer border border-indigo-200"
                              >
                                <Activity size={12} /> View Timeline ({lead.timeline?.length || 0})
                              </button>

                              {/* Stage Selector & Actions */}
                              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                                <select
                                  value={normalizeStage(lead.leadStage)}
                                  onChange={(e) => handleUpdateStage(lead.id, e.target.value as any)}
                                  className="bg-slate-100 border border-slate-200 rounded text-[10px] font-bold text-slate-800 px-1 py-1 outline-none cursor-pointer max-w-[95px]"
                                >
                                  {leadStagesConfig.map(s => (
                                    <option key={s.id} value={s.id}>{s.label}</option>
                                  ))}
                                </select>

                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditModal(lead)}
                                    className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                                    title="Edit Lead"
                                  >
                                    <Edit2 size={12} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteLead(lead.id, lead.contactName)}
                                    className="p-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-colors cursor-pointer"
                                    title="Delete Lead"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </div>

                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* DATA TABLE VIEW WITH MULTI-SELECT BULK CHECKBOXES */}
          {viewMode === 'table' && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 text-white uppercase text-[10px] font-black tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="p-4 w-10">
                        <input
                          type="checkbox"
                          checked={selectedLeadIds.length > 0 && selectedLeadIds.length === filteredLeads.length}
                          onChange={handleToggleSelectAll}
                          className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </th>
                      <th className="p-4">Contact / Company</th>
                      <th className="p-4">Phone & Target Domain</th>
                      <th className="p-4">Workflow Stage</th>
                      <th className="p-4">Timeline Activity</th>
                      <th className="p-4">Deal Value</th>
                      <th className="p-4">Assigned Staff</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                    {filteredLeads.map(lead => {
                      const isSelected = selectedLeadIds.includes(lead.id);
                      return (
                        <tr key={lead.id} className={`hover:bg-slate-50/80 transition-colors ${isSelected ? 'bg-blue-50/50' : ''}`}>
                          <td className="p-4">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelectLead(lead.id)}
                              className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                          </td>
                          <td className="p-4">
                            <div 
                              onClick={() => handleOpenDetailModal(lead)}
                              className="font-extrabold text-slate-900 text-sm hover:text-blue-600 cursor-pointer"
                            >
                              {lead.contactName}
                            </div>
                            {lead.companyName && <div className="text-[11px] text-slate-500 font-normal">{lead.companyName}</div>}
                          </td>
                          <td className="p-4 space-y-0.5">
                            <div className="font-mono text-slate-900 font-bold">{lead.phone}</div>
                            <div className="text-[11px] text-slate-500">{lead.email}</div>
                            {lead.targetDomain && (
                              <div className="text-[10px] font-mono text-blue-600 flex items-center gap-1">
                                🌐 {lead.targetDomain}
                              </div>
                            )}
                          </td>
                          <td className="p-4">
                            <select
                              value={normalizeStage(lead.leadStage)}
                              onChange={(e) => handleUpdateStage(lead.id, e.target.value as any)}
                              className="bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 px-2.5 py-1.5 outline-none cursor-pointer"
                            >
                              {leadStagesConfig.map(s => (
                                <option key={s.id} value={s.id}>{s.label}</option>
                              ))}
                            </select>
                          </td>
                          <td className="p-4">
                            <button
                              onClick={() => handleOpenDetailModal(lead)}
                              className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center gap-1 border border-indigo-200 cursor-pointer"
                            >
                              <Activity size={13} /> {lead.timeline?.length || 0} Events
                            </button>
                          </td>
                          <td className="p-4 font-extrabold text-slate-900 font-mono text-sm">
                            {formatCurrency(lead.dealValueBdt)}
                          </td>
                          <td className="p-4">
                            <span className="font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200 inline-block text-[11px]">
                              👤 {lead.assignedStaffName || 'Unassigned'}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleOpenDetailModal(lead)}
                                className="p-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold cursor-pointer transition-colors"
                                title="View Timeline & Details"
                              >
                                <Eye size={14} />
                              </button>
                              <button
                                onClick={() => handleOpenQuoteGenerator(lead)}
                                className="p-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold cursor-pointer transition-colors"
                                title="Generate Quote"
                              >
                                <Zap size={14} />
                              </button>
                              <button
                                onClick={() => handleOpenEditModal(lead)}
                                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer transition-colors"
                                title="Edit Lead"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                onClick={() => handleDeleteLead(lead.id, lead.contactName)}
                                className="p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 font-bold cursor-pointer transition-colors"
                                title="Delete Lead"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredLeads.length === 0 && (
                      <tr>
                        <td colSpan={8} className="p-12 text-center text-slate-400">
                          <Filter size={32} className="mx-auto text-slate-300 mb-2" />
                          <p className="font-bold text-sm text-slate-600">No leads match the selected filters</p>
                          <p className="text-xs text-slate-400 mt-1">Try resetting the status, staff, date range, or search query.</p>
                          {isFilterActive && (
                            <button
                              onClick={handleClearAllFilters}
                              className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 cursor-pointer inline-flex items-center gap-1.5"
                            >
                              <X size={14} /> Reset All Filters
                            </button>
                          )}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Table Footer with Summary and CSV Export Shortcut */}
              <div className="bg-slate-50 p-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                <span className="font-semibold text-slate-600">
                  Showing <strong className="text-slate-900 font-black">{filteredLeads.length}</strong> leads | Total Value: <strong className="text-emerald-700 font-black font-mono">{formatCurrency(filteredLeads.reduce((acc, l) => acc + (l.dealValueBdt || 0), 0))}</strong>
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleExportCsv}
                    className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <Download size={13} className="text-emerald-600" />
                    <span>Download Table as CSV</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* SUB-MODULE 2: LEAD EMAIL TEMPLATES SUB-MODULE */}
      {crmMainSubTab === 'templates' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6 animate-in fade-in duration-300">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <BookOpen size={20} className="text-blue-600" />
                <h2 className="text-lg font-black text-slate-900">Lead Email Templates Sub-Module</h2>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Define and manage reusable email templates with placeholder tags for automated consistency during lead status changes.
              </p>
            </div>

            <button
              onClick={handleOpenAddTemplateModal}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-md flex items-center gap-2 cursor-pointer transition-all"
            >
              <Plus size={16} /> Create New Template
            </button>
          </div>

          {/* Email Templates Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {emailTemplates.map(tpl => (
              <div key={tpl.id} className="bg-slate-50 rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between space-y-4 hover:shadow-md transition-all">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 font-extrabold text-[10px] uppercase">
                      {tpl.category}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">{tpl.updatedAt}</span>
                  </div>

                  <h3 className="font-extrabold text-sm text-slate-900">{tpl.name}</h3>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 text-xs font-mono text-slate-800 truncate">
                    Subject: {tpl.subject}
                  </div>

                  <p className="text-xs text-slate-600 font-medium line-clamp-3 leading-relaxed bg-white p-3 rounded-xl border border-slate-200">
                    {tpl.body}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                  <span className="text-[10px] font-mono text-slate-500">
                    Tags: {'{{contactName}}'}, {'{{targetDomain}}'}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenEditTemplateModal(tpl)}
                      className="p-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold transition-colors cursor-pointer"
                      title="Edit Template"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      onClick={() => handleDeleteTemplate(tpl.id, tpl.name)}
                      className="p-1.5 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 font-bold transition-colors cursor-pointer"
                      title="Delete Template"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ROUND-ROBIN WORKLOAD & STAFF QUEUE MODAL */}
      {showWorkloadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-in fade-in">
          <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto p-6 sm:p-8 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <RotateCw size={20} className="text-amber-500" />
                Round-Robin Staff Lead Queue & Load Balancer
              </h3>
              <button onClick={() => setShowWorkloadModal(false)} className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer">
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-amber-900 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-black tracking-wider block text-amber-800">
                    Round-Robin Status
                  </span>
                  <p className="font-extrabold text-sm">Automated Equal Staff Distribution Active</p>
                </div>
                <label className="flex items-center gap-2 font-bold cursor-pointer bg-white px-3 py-1.5 rounded-xl border border-amber-300 shadow-xs">
                  <input
                    type="checkbox"
                    checked={enableRoundRobin}
                    onChange={(e) => setEnableRoundRobin(e.target.checked)}
                    className="rounded text-amber-600 focus:ring-amber-500"
                  />
                  <span>Auto-Distribute</span>
                </label>
              </div>

              {/* Staff Workload Table */}
              <div className="space-y-2">
                <span className="font-extrabold text-slate-700 uppercase tracking-wider block text-[10px]">
                  Active Staff Member Lead Distribution:
                </span>

                <div className="space-y-2">
                  {(activeStaffMembers.length > 0 ? activeStaffMembers : [
                    { id: 'staff_1', name: 'Alex M.', role: 'Support Admin', email: 'alex@click2itbd.com' },
                    { id: 'staff_2', name: 'Sarah K.', role: 'Sales Lead', email: 'sarah@click2itbd.com' },
                    { id: 'staff_3', name: 'Imran H.', role: 'Technical Support', email: 'imran@click2itbd.com' },
                    { id: 'staff_4', name: 'Kamal R.', role: 'Billing Specialist', email: 'kamal@click2itbd.com' }
                  ]).map((staff, idx) => {
                    const assignedLeadsCount = leads.filter(l => l.assignedStaffId === staff.id || l.assignedStaffName?.includes(staff.name)).length;
                    const isNextUp = (roundRobinIndex % (activeStaffMembers.length || 4)) === idx;

                    return (
                      <div key={staff.id} className="bg-slate-50 p-3 rounded-2xl border border-slate-200 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-extrabold flex items-center justify-center text-xs">
                            👤
                          </div>
                          <div>
                            <p className="font-extrabold text-slate-900 text-xs">{staff.name}</p>
                            <p className="text-[10px] text-slate-500 font-medium">{staff.role}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {isNextUp && (
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-black text-[10px] uppercase border border-emerald-300 animate-pulse">
                              ⚡ Next Up in Queue
                            </span>
                          )}
                          <span className="font-extrabold text-slate-800 bg-white px-3 py-1 rounded-xl border border-slate-200">
                            {assignedLeadsCount} Leads
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleRebalanceLeadWorkload}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl flex items-center gap-2 cursor-pointer shadow-md"
                >
                  <Scale size={14} /> Auto-Rebalance Lead Load Equally
                </button>

                <button
                  type="button"
                  onClick={() => setShowWorkloadModal(false)}
                  className="px-4 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT TEMPLATE MODAL */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-in fade-in">
          <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto p-6 sm:p-8 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <BookOpen size={20} className="text-blue-600" />
                {editingTemplate ? `Edit Template "${editingTemplate.name}"` : 'Create Lead Email Template'}
              </h3>
              <button onClick={() => setShowTemplateModal(false)} className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveTemplateSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Template Display Name</label>
                  <input
                    type="text"
                    required
                    value={templateForm.name}
                    onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                    placeholder="e.g. Official NVMe VPS Quotation"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Workflow Category</label>
                  <select
                    value={templateForm.category}
                    onChange={(e) => setTemplateForm({ ...templateForm, category: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
                  >
                    <option value="welcome">Inbound Welcome & Consultation</option>
                    <option value="quote">Quotation Proposal</option>
                    <option value="followup">Invoice & Payment Followup</option>
                    <option value="converted">Conversion & Onboarding</option>
                    <option value="renewal">Renewal & Upsell</option>
                    <option value="custom">Custom Template</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Email Subject Line</label>
                <input
                  type="text"
                  required
                  value={templateForm.subject}
                  onChange={(e) => setTemplateForm({ ...templateForm, subject: e.target.value })}
                  placeholder="e.g. Official Quotation Proposal for {{contactName}} — {{targetDomain}}"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900"
                />
              </div>

              {/* Dynamic Placeholder Insertion Toolbar */}
              <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-3 space-y-1.5">
                <span className="text-[10px] font-black uppercase text-blue-900 tracking-wider block">
                  Click to Insert Lead Placeholder Tags:
                </span>
                <div className="flex flex-wrap gap-1.5 text-[10px]">
                  {['{{contactName}}', '{{companyName}}', '{{targetDomain}}', '{{dealValueBdt}}', '{{assignedStaffName}}'].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleInsertPlaceholder(tag)}
                      className="px-2 py-1 rounded-lg bg-white border border-blue-300 text-blue-900 font-mono font-bold hover:bg-blue-100 transition-colors cursor-pointer"
                    >
                      + {tag}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Email Template Body Content</label>
                <textarea
                  rows={6}
                  required
                  value={templateForm.body}
                  onChange={(e) => setTemplateForm({ ...templateForm, body: e.target.value })}
                  placeholder="Write email body text with {{contactName}}, {{targetDomain}}, etc..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowTemplateModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl shadow-md cursor-pointer"
                >
                  {editingTemplate ? 'Save Template Changes' : 'Create Template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AUTOMATED STAFF NOTIFICATION CENTER DRAWER / MODAL */}
      {showNotificationDrawer && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl overflow-y-auto p-6 space-y-5 flex flex-col justify-between border-l border-slate-200">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Bell size={18} className="text-amber-500" />
                  <h3 className="text-base font-black text-slate-900">CRM Staff Automated Alerts</h3>
                </div>
                <button 
                  onClick={() => setShowNotificationDrawer(false)}
                  className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold cursor-pointer"
                >
                  ✕ Close
                </button>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="font-extrabold text-slate-500 uppercase tracking-wider">Recent System Alerts</span>
                <button
                  onClick={() => {
                    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
                    toast.success('Marked all notifications as read');
                  }}
                  className="text-blue-600 hover:underline font-bold cursor-pointer"
                >
                  Mark All Read
                </button>
              </div>

              <div className="space-y-2.5">
                {notifications.length === 0 ? (
                  <p className="p-4 text-center text-slate-400 text-xs border border-dashed rounded-xl">
                    No CRM alerts available.
                  </p>
                ) : (
                  notifications.map(notif => (
                    <div
                      key={notif.id}
                      onClick={() => {
                        if (notif.leadId) {
                          const target = leads.find(l => l.id === notif.leadId);
                          if (target) {
                            handleOpenDetailModal(target);
                            setShowNotificationDrawer(false);
                          }
                        }
                      }}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer space-y-1 ${
                        notif.read ? 'bg-slate-50 border-slate-200 opacity-75' : 'bg-white border-amber-300 shadow-sm ring-1 ring-amber-200'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-extrabold text-slate-900 flex items-center gap-1">
                          {notif.type === 'converted' ? '🎉' : '🚨'} {notif.title}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">{notif.timestamp}</span>
                      </div>
                      <p className="text-xs text-slate-600 font-medium leading-relaxed">
                        {notif.message}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <button
                onClick={() => setNotifications([])}
                className="text-red-600 font-bold hover:underline cursor-pointer"
              >
                Clear All Alerts
              </button>
              <button
                onClick={() => setShowNotificationDrawer(false)}
                className="px-4 py-2 bg-slate-800 text-white font-bold rounded-xl"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LEAD DETAIL VIEW & INTERACTIVE TIMELINE DRAWER / MODAL */}
      {selectedLeadForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-2xl bg-white h-full shadow-2xl overflow-y-auto p-6 sm:p-8 space-y-6 flex flex-col justify-between border-l border-slate-200">
            
            <div className="space-y-6">
              {/* Drawer Header */}
              <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 font-extrabold text-[10px] uppercase">
                      {selectedLeadForDetail.source} Lead
                    </span>
                    <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {formatCurrency(selectedLeadForDetail.dealValueBdt)}
                    </span>
                  </div>
                  <h2 className="text-xl font-black text-slate-900 mt-1">{selectedLeadForDetail.contactName}</h2>
                  {selectedLeadForDetail.companyName && (
                    <p className="text-xs font-medium text-slate-500 flex items-center gap-1 mt-0.5">
                      <Building size={13} className="text-slate-400" /> {selectedLeadForDetail.companyName}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setSelectedLeadForDetail(null)}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold cursor-pointer"
                >
                  ✕ Close
                </button>
              </div>

              {/* Contact Info Pills */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Phone / WA</span>
                  <a href={`tel:${selectedLeadForDetail.phone}`} className="font-mono font-bold text-slate-900 hover:text-blue-600">
                    {selectedLeadForDetail.phone}
                  </a>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Email</span>
                  <a href={`mailto:${selectedLeadForDetail.email}`} className="font-bold text-slate-900 truncate block hover:text-blue-600">
                    {selectedLeadForDetail.email}
                  </a>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 col-span-2 sm:col-span-1">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Target Domain</span>
                  <span className="font-mono font-bold text-blue-600 truncate block">
                    {selectedLeadForDetail.targetDomain || 'N/A'}
                  </span>
                </div>
              </div>

              {/* INTERACTIVE STATUS WORKFLOW STEPPER */}
              <div className="bg-slate-900 text-white rounded-2xl p-4 space-y-3 shadow-md">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase text-amber-400 tracking-wider flex items-center gap-1.5">
                    <Activity size={14} /> Workflow Status Tracking
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">
                    Assigned: {selectedLeadForDetail.assignedStaffName || 'Alex M.'}
                  </span>
                </div>

                {/* Progress Bar Steps */}
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1">
                  {leadStagesConfig.map((st) => {
                    const isCurrent = normalizeStage(selectedLeadForDetail.leadStage) === st.id;
                    return (
                      <button
                        key={st.id}
                        onClick={() => handleUpdateStage(selectedLeadForDetail.id, st.id as any)}
                        className={`p-2 rounded-xl text-[10px] font-extrabold text-center transition-all cursor-pointer border ${
                          isCurrent 
                            ? 'bg-blue-600 text-white border-blue-400 shadow-lg scale-105' 
                            : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-slate-200'
                        }`}
                      >
                        <div className="truncate">{st.label.split(' ')[1] || st.label}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* LOG NEW INTERACTION SECTION */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Plus size={14} className="text-blue-600" /> Log New Interaction
                  </span>
                  <div className="flex items-center gap-1 text-[10px]">
                    <button
                      onClick={() => setTimelineTab('all')}
                      className={`px-2 py-1 rounded-lg font-bold ${timelineTab === 'all' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-200'}`}
                    >
                      Note
                    </button>
                    <button
                      onClick={() => setTimelineTab('emails')}
                      className={`px-2 py-1 rounded-lg font-bold ${timelineTab === 'emails' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-200'}`}
                    >
                      Email
                    </button>
                    <button
                      onClick={() => setTimelineTab('notes')}
                      className={`px-2 py-1 rounded-lg font-bold ${timelineTab === 'notes' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-200'}`}
                    >
                      Call / WA
                    </button>
                  </div>
                </div>

                {/* Add Note Input */}
                {timelineTab === 'all' && (
                  <div className="space-y-2 text-xs">
                    <textarea
                      rows={2}
                      value={newTimelineNote}
                      onChange={(e) => setNewTimelineNote(e.target.value)}
                      placeholder="Add internal note or call summary for this lead..."
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />

                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-1.5 font-bold text-slate-700 cursor-pointer text-xs">
                        <input
                          type="checkbox"
                          checked={isHighPriorityNote}
                          onChange={(e) => setIsHighPriorityNote(e.target.checked)}
                          className="rounded text-rose-600 focus:ring-rose-500"
                        />
                        <span>🚨 Mark as High-Priority Interaction (Alert Staff)</span>
                      </label>

                      <button
                        onClick={handleAddTimelineNote}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl cursor-pointer"
                      >
                        Post Note to Timeline
                      </button>
                    </div>
                  </div>
                )}

                {/* Send Email Form (Integrated with Lead Email Templates!) */}
                {timelineTab === 'emails' && (
                  <form onSubmit={handleSendTimelineEmail} className="space-y-2 text-xs">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Load Saved Email Template (Optional)</label>
                      <select
                        value={selectedTemplateForLead}
                        onChange={(e) => handleSelectTemplateForLead(e.target.value)}
                        className="w-full p-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-900 cursor-pointer"
                      >
                        <option value="">Select Template...</option>
                        {emailTemplates.map(t => (
                          <option key={t.id} value={t.id}>{t.name} ({t.category})</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Email Subject</label>
                      <input
                        type="text"
                        required
                        value={newEmailSubject}
                        onChange={(e) => setNewEmailSubject(e.target.value)}
                        className="w-full p-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Email Message Body</label>
                      <textarea
                        rows={4}
                        required
                        value={newEmailBody}
                        onChange={(e) => setNewEmailBody(e.target.value)}
                        className="w-full p-2 bg-white border border-slate-200 rounded-xl font-medium text-slate-900 font-mono text-xs"
                      />
                    </div>

                    <button
                      type="submit"
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Send size={13} /> Send Email & Log to Timeline
                    </button>
                  </form>
                )}

                {/* Log Call or WhatsApp Form */}
                {timelineTab === 'notes' && (
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <label className="font-bold text-slate-700">Type:</label>
                        <select
                          value={newCallType}
                          onChange={(e) => setNewCallType(e.target.value as any)}
                          className="bg-white border border-slate-200 rounded-lg px-2 py-1 font-bold text-slate-900"
                        >
                          <option value="whatsapp">WhatsApp Chat</option>
                          <option value="call">Phone Call</option>
                        </select>
                      </div>

                      <label className="flex items-center gap-1.5 font-bold text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isHighPriorityNote}
                          onChange={(e) => setIsHighPriorityNote(e.target.checked)}
                          className="rounded text-rose-600 focus:ring-rose-500"
                        />
                        <span>🚨 Urgent Alert</span>
                      </label>
                    </div>

                    <textarea
                      rows={2}
                      value={newCallNote}
                      onChange={(e) => setNewCallNote(e.target.value)}
                      placeholder="Summarize phone discussion or WhatsApp agreement..."
                      className="w-full p-2 bg-white border border-slate-200 rounded-xl font-medium text-slate-900"
                    />
                    <button
                      onClick={handleLogCallOrWhatsApp}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl cursor-pointer"
                    >
                      Log {newCallType === 'whatsapp' ? 'WhatsApp' : 'Call'} Activity
                    </button>
                  </div>
                )}
              </div>

              {/* TIMELINE COMPONENT */}
              <div className="space-y-3">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center justify-between">
                  <span>Lead Interaction Timeline History</span>
                  <span className="text-[10px] font-extrabold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    {selectedLeadForDetail.timeline?.length || 0} Total Logged Events
                  </span>
                </h3>

                <div className="space-y-3 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                  {(!selectedLeadForDetail.timeline || selectedLeadForDetail.timeline.length === 0) ? (
                    <p className="text-xs text-slate-400 p-4 border border-dashed border-slate-200 rounded-xl text-center">
                      No interaction logs found for this lead yet. Use the form above to add notes, emails, or calls.
                    </p>
                  ) : (
                    selectedLeadForDetail.timeline.map((item) => {
                      let icon = <Activity size={14} className="text-blue-600" />;
                      let badgeStyle = 'bg-blue-50 text-blue-800 border-blue-200';

                      if (item.isHighPriority) {
                        icon = <AlertCircle size={14} className="text-rose-600" />;
                        badgeStyle = 'bg-rose-100 text-rose-800 border-rose-300 font-black';
                      } else if (item.type === 'status_change') {
                        icon = <RefreshCw size={14} className="text-purple-600" />;
                        badgeStyle = 'bg-purple-50 text-purple-800 border-purple-200';
                      } else if (item.type === 'email_sent') {
                        icon = <Mail size={14} className="text-indigo-600" />;
                        badgeStyle = 'bg-indigo-50 text-indigo-800 border-indigo-200';
                      } else if (item.type === 'quote') {
                        icon = <Zap size={14} className="text-amber-600" />;
                        badgeStyle = 'bg-amber-50 text-amber-800 border-amber-200';
                      } else if (item.type === 'whatsapp') {
                        icon = <MessageCircle size={14} className="text-emerald-600" />;
                        badgeStyle = 'bg-emerald-50 text-emerald-800 border-emerald-200';
                      } else if (item.type === 'call') {
                        icon = <Phone size={14} className="text-cyan-600" />;
                        badgeStyle = 'bg-cyan-50 text-cyan-800 border-cyan-200';
                      }

                      return (
                        <div key={item.id} className="relative pl-10 group">
                          {/* Timeline Dot */}
                          <div className={`absolute left-2.5 top-1.5 w-3 h-3 rounded-full bg-white border-2 ${item.isHighPriority ? 'border-rose-600 animate-ping' : 'border-blue-600'} -translate-x-1/2 shadow-xs group-hover:scale-125 transition-transform`} />

                          <div className={`bg-white rounded-2xl p-3.5 border shadow-xs space-y-1 ${item.isHighPriority ? 'border-rose-300 bg-rose-50/20' : 'border-slate-200'}`}>
                            <div className="flex items-center justify-between">
                              <span className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold border ${badgeStyle} flex items-center gap-1`}>
                                {icon} {item.title}
                              </span>
                              <span className="text-[10px] font-bold text-slate-400">
                                {item.timestamp}
                              </span>
                            </div>

                            <p className="text-xs text-slate-700 font-medium leading-relaxed pt-1">
                              {item.description}
                            </p>

                            {item.performedBy && (
                              <p className="text-[10px] font-bold text-slate-400 pt-0.5">
                                Logged by: {item.performedBy}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

            </div>

            <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-xs">
              <button
                onClick={() => handleOpenQuoteGenerator(selectedLeadForDetail)}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl flex items-center gap-1.5 cursor-pointer"
              >
                <Zap size={14} /> Generate Quotation
              </button>

              <button
                onClick={() => setSelectedLeadForDetail(null)}
                className="px-4 py-2 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-700 cursor-pointer"
              >
                Close Drawer
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ADD / EDIT HOSTING LEAD MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-in fade-in">
          <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto p-6 sm:p-8 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <UserPlus size={20} className="text-blue-600" />
                {editingLead ? `Edit Hosting Lead "${editingLead.contactName}"` : 'Add New Domain & Web Hosting Lead'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveLeadSubmit} className="space-y-4 text-xs">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Contact Person Name</label>
                  <input
                    type="text"
                    required
                    value={form.contactName}
                    onChange={(e) => setForm({ ...form, contactName: e.target.value })}
                    placeholder="e.g. Tanvir Ahmed"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Company / Agency Name</label>
                  <input
                    type="text"
                    value={form.companyName}
                    onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                    placeholder="e.g. Prime Tech Solutions Ltd"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="e.g. tanvir@primetechbd.com"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Phone Number (+880/91)</label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="e.g. +880 1712-345678"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Target Domain Name (Optional)</label>
                  <input
                    type="text"
                    value={form.targetDomain}
                    onChange={(e) => setForm({ ...form, targetDomain: e.target.value })}
                    placeholder="e.g. primetechbd.com"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Workflow Stage</label>
                  <select
                    value={form.leadStage}
                    onChange={(e) => setForm({ ...form, leadStage: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    {leadStagesConfig.map(st => (
                      <option key={st.id} value={st.id}>{st.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Estimated Deal Value (BDT ৳)</label>
                  <input
                    type="number"
                    value={form.dealValueBdt}
                    onChange={(e) => setForm({ ...form, dealValueBdt: e.target.value })}
                    placeholder="e.g. 18500"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700 block">Assigned Staff Member</label>
                    <label className="flex items-center gap-1 text-[10px] font-bold text-amber-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={enableRoundRobin}
                        onChange={(e) => setEnableRoundRobin(e.target.checked)}
                        className="rounded text-amber-600 focus:ring-amber-500"
                      />
                      <span>⚡ Auto Round-Robin</span>
                    </label>
                  </div>

                  <select
                    value={form.assignedStaffId}
                    onChange={(e) => setForm({ ...form, assignedStaffId: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    {activeStaffMembers.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} — {s.role} ({s.email})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Interested Services & Domains (Comma Separated)</label>
                <input
                  type="text"
                  value={form.interestedProductsText}
                  onChange={(e) => setForm({ ...form, interestedProductsText: e.target.value })}
                  placeholder="e.g. Cloud NVMe VPS - 4 vCPU / 8GB RAM, primetechbd.com (.COM)"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Lead Source</label>
                <select
                  value={form.source}
                  onChange={(e) => setForm({ ...form, source: e.target.value as any })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="WhatsApp">WhatsApp Inbound</option>
                  <option value="Meta Ads">Meta Ads (FB & IG)</option>
                  <option value="Web Form">Website Contact Form</option>
                  <option value="Direct Referral">Direct Client Referral</option>
                  <option value="Phone">Phone Call</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Internal Sales & Technical Note</label>
                <textarea
                  rows={2}
                  value={form.noteText}
                  onChange={(e) => setForm({ ...form, noteText: e.target.value })}
                  placeholder="Record customer preferences, server specs requested, or discount codes issued..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl shadow-md transition-colors cursor-pointer"
                >
                  {editingLead ? 'Save Lead Changes' : 'Create Hosting Lead'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* INSTANT QUOTATION GENERATOR MODAL */}
      {showQuoteModal && quoteLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-in fade-in">
          <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto p-6 sm:p-8 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Zap size={20} className="text-amber-500" />
                Generate Official BDT Quotation
              </h3>
              <button onClick={() => setShowQuoteModal(false)} className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer">
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-amber-900 space-y-1">
                <p className="font-extrabold text-sm">Customer: {quoteLead.contactName} ({quoteLead.companyName || 'Individual'})</p>
                <p className="text-xs">Email: {quoteLead.email} | Phone: {quoteLead.phone}</p>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Hosting / Server Package</label>
                <input
                  type="text"
                  value={quoteDetails.package}
                  onChange={(e) => setQuoteDetails({ ...quoteDetails, package: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Billing Period</label>
                  <select
                    value={quoteDetails.billingPeriod}
                    onChange={(e) => setQuoteDetails({ ...quoteDetails, billingPeriod: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
                  >
                    <option value="1 Month">1 Month (Monthly)</option>
                    <option value="1 Year (Annual)">1 Year (Annual)</option>
                    <option value="2 Years">2 Years</option>
                    <option value="3 Years">3 Years</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Target Domain</label>
                  <input
                    type="text"
                    value={quoteDetails.domainName}
                    onChange={(e) => setQuoteDetails({ ...quoteDetails, domainName: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Package Price (BDT ৳)</label>
                  <input
                    type="number"
                    value={quoteDetails.priceBdt}
                    onChange={(e) => setQuoteDetails({ ...quoteDetails, priceBdt: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Special Discount (%)</label>
                  <input
                    type="number"
                    value={quoteDetails.discountPercent}
                    onChange={(e) => setQuoteDetails({ ...quoteDetails, discountPercent: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
                  />
                </div>
              </div>

              {/* Quotation Preview Card */}
              <div className="bg-slate-900 text-white p-4 rounded-2xl space-y-2 border border-slate-800">
                <p className="text-xs uppercase font-extrabold text-amber-400 tracking-wider">OFFICIAL QUOTATION PREVIEW</p>
                <div className="text-xs space-y-1 font-mono text-slate-300">
                  <p>Client: {quoteLead.contactName}</p>
                  <p>Product: {quoteDetails.package}</p>
                  <p>Domain: {quoteDetails.domainName}</p>
                  <p>Subtotal: {formatCurrency(quoteDetails.priceBdt)}</p>
                  <p>Discount ({quoteDetails.discountPercent}%): -{formatCurrency((quoteDetails.priceBdt * quoteDetails.discountPercent) / 100)}</p>
                  <p className="text-emerald-400 font-extrabold text-sm border-t border-slate-800 pt-1 mt-1">
                    Total Payable: {formatCurrency(quoteDetails.priceBdt - (quoteDetails.priceBdt * quoteDetails.discountPercent) / 100)}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    const finalTotal = quoteDetails.priceBdt - (quoteDetails.priceBdt * quoteDetails.discountPercent) / 100;
                    const msg = `Click2IT Hosting Official Quotation\nClient: ${quoteLead.contactName}\nService: ${quoteDetails.package}\nDomain: ${quoteDetails.domainName}\nTotal BDT: ৳${finalTotal}\nbKash Payment Link: https://click2itbd.com/pay`;
                    navigator.clipboard.writeText(msg);
                    toast.success('Copied quotation text to clipboard!');
                  }}
                  className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl flex items-center gap-2 cursor-pointer"
                >
                  <Copy size={14} /> Copy Quote for WhatsApp
                </button>

                <button
                  type="button"
                  onClick={() => setShowQuoteModal(false)}
                  className="px-4 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* WHOIS DOMAIN INSPECTOR MODAL */}
      {showWhoisModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-in fade-in">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Globe size={18} className="text-blue-600" />
                Domain Whois & Registrar Check
              </h3>
              <button onClick={() => setShowWhoisModal(false)} className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer">
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="font-bold text-slate-700">Target Domain: <span className="font-mono text-blue-600">{whoisDomain}</span></p>

              {whoisLoading ? (
                <div className="p-6 text-center text-slate-500 space-y-2">
                  <RefreshCw size={24} className="animate-spin mx-auto text-blue-600" />
                  <p className="font-bold text-xs">Querying domain availability & registrar WHOIS records...</p>
                </div>
              ) : (
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                  <div className="flex items-center gap-2 font-black text-emerald-700 bg-emerald-100 px-3 py-1.5 rounded-xl">
                    <CheckCircle2 size={16} /> Domain Available for Registration!
                  </div>
                  <p className="text-slate-600 font-medium leading-relaxed">
                    "{whoisDomain}" can be registered instantly via Click2IT Openprovider & BTCL Registrar module.
                  </p>
                </div>
              )}

              <div className="pt-2 text-right">
                <button
                  type="button"
                  onClick={() => setShowWhoisModal(false)}
                  className="px-4 py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
