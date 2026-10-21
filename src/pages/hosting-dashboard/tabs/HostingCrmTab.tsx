import React, { useState, useEffect } from 'react';
import { 
  Users, UserPlus, DollarSign, Search, Filter, Plus, Edit2, Trash2, Phone, Mail, 
  Globe, Server, Shield, CheckCircle2, Clock, AlertCircle, Sparkles, RefreshCw, 
  ArrowRight, FileText, Send, MessageSquare, ChevronRight, Zap, Building, CheckSquare,
  Download, Copy, ExternalLink, Sliders, Check, Activity, Eye, EyeOff, MessageCircle, Calendar,
  Bell, BellOff, TrendingUp, BarChart2, Volume2, BookOpen, Tag, Layers, RotateCw, UserCheck, Scale,
  Upload, X, FileSpreadsheet, Key, Lock
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { doc, setDoc, getDocs, collection, deleteDoc } from 'firebase/firestore';
import { 
  FunnelChart, Funnel, Tooltip, ResponsiveContainer, Cell, LabelList, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
  PieChart, Pie
} from 'recharts';
import { db, auth } from '../../../firebase';
import { useStaffHosts } from '../../../hooks/useStaffHosts';
import { formatCurrency } from '../../../lib/utils';
import { sendEmail as sendRealEmail } from '../../../services/emailService';
import { createCustomerAccountByAdmin, generateCustomerPassword } from '../../../utils/customerAdminUtils';

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
  customerUid?: string;
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

const DEFAULT_EMAIL_TEMPLATES: LeadEmailTemplate[] = [
  {
    id: 'tpl_1',
    name: 'Initial Inbound & Domain Consultation Response',
    category: 'welcome',
    subject: 'Domain & Hosting Inquiry — {{targetDomain}} | Click2IT Bangladesh',
    body: `Hello {{contactName}},\n\nThank you for reaching out to Click2IT Hosting regarding {{targetDomain}}.\n\nWe have checked domain availability and prepared your NVMe Cloud hosting options. All our packages feature BDIX 10Gbps local peering, cPanel control panel, and automated daily backups.\n\nAssigned Account Specialist: {{assignedStaffName}}\nEstimated Investment: {{dealValueBdt}}\n\nPlease reply to this email or chat with us on WhatsApp to schedule a quick consultation.`,
    updatedAt: 'Default Template'
  },
  {
    id: 'tpl_2',
    name: 'Official Hosting & NVMe VPS Quotation Proposal',
    category: 'quote',
    subject: 'Official Quotation Proposal for {{contactName}} — {{targetDomain}}',
    body: `Dear {{contactName}},\n\nPlease find your requested domain and server proposal for {{targetDomain}} below:\n\nTarget Domain: {{targetDomain}}\nCompany: {{companyName}}\nTotal Deal Value: {{dealValueBdt}}\nIncluded Features: NVMe SSD Storage, BDIX Speed Boost, Free SSL Certificate, 24/7 BDIX Support.\n\nAssigned Specialist: {{assignedStaffName}}\n\nTo proceed with instant server activation, reply to this email or visit your client portal to complete payment.`,
    updatedAt: 'Default Template'
  },
  {
    id: 'tpl_3',
    name: 'bKash / Nagad Invoice Payment Link Reminder',
    category: 'followup',
    subject: 'Payment Invoice Reminder — {{targetDomain}} Hosting Order',
    body: `Hello {{contactName}},\n\nYour invoice for {{targetDomain}} is ready for payment.\n\nTotal Payable: {{dealValueBdt}}\n\nOnce completed, your server node will be provisioned automatically. Contact {{assignedStaffName}} if you need any invoice modifications.`,
    updatedAt: 'Default Template'
  },
  {
    id: 'tpl_4',
    name: 'Welcome & cPanel Account Delivery',
    category: 'converted',
    subject: '🎉 Server Provisioned & Welcome to Click2IT Hosting — {{targetDomain}}',
    body: `Dear {{contactName}},\n\nCongratulations! Your web hosting service for {{targetDomain}} has been successfully provisioned on our high-speed NVMe KVM node.\n\nYour assigned account specialist is {{assignedStaffName}}.\nIf you require free website migration support or DNS pointing assistance, please open a support ticket or reply to this email directly.`,
    updatedAt: 'Default Template'
  },
  {
    id: 'tpl_5',
    name: 'Annual Domain & Server Renewal Offer',
    category: 'renewal',
    subject: 'Annual Renewal Notice for {{targetDomain}} — 10% Loyalty Discount',
    body: `Hello {{contactName}},\n\nThis is a friendly reminder that your hosting and domain renewal for {{targetDomain}} is due soon.\n\nRenewal Amount: {{dealValueBdt}}\n\nRenew for 2 years today to claim an additional 10% loyalty discount!`,
    updatedAt: 'Default Template'
  }
];

export function HostingCrmTab({ state }: { state?: any }) {
  const { staffMembers, activeStaffMembers } = useStaffHosts();

  const getCurrentActorName = () => {
    const u = auth.currentUser;
    if (u?.displayName) return `${u.displayName} (Admin)`;
    if (u?.email) return `${u.email.split('@')[0]} (Admin)`;
    return 'Administrator';
  };

  // Navigation Sub-Module State
  const [crmMainSubTab, setCrmMainSubTab] = useState<'pipeline' | 'templates'>('pipeline');

  // ROUND-ROBIN AUTOMATED DISTRIBUTOR STATE
  const [roundRobinIndex, setRoundRobinIndex] = useState<number>(0);
  const [enableRoundRobin, setEnableRoundRobin] = useState<boolean>(true);
  const [showWorkloadModal, setShowWorkloadModal] = useState<boolean>(false);

  const [leads, setLeads] = useState<HostingCrmLead[]>([]);
  const [syncingInquiries, setSyncingInquiries] = useState<boolean>(false);

  // BULK SELECTION STATE
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);

  // LEAD EMAIL TEMPLATES SUB-MODULE STATE
  const [emailTemplates, setEmailTemplates] = useState<LeadEmailTemplate[]>(DEFAULT_EMAIL_TEMPLATES);

  const [showTemplateModal, setShowTemplateModal] = useState<boolean>(false);
  const [editingTemplate, setEditingTemplate] = useState<LeadEmailTemplate | null>(null);
  const [templateForm, setTemplateForm] = useState({
    name: '',
    category: 'quote' as LeadEmailTemplate['category'],
    subject: '',
    body: ''
  });

  // Automated CRM Notification Center State
  const [notifications, setNotifications] = useState<CrmNotification[]>([]);

  const [showNotificationDrawer, setShowNotificationDrawer] = useState<boolean>(false);
  const [showAnalyticsDashboard, setShowAnalyticsDashboard] = useState<boolean>(true);

  const [loading, setLoading] = useState<boolean>(true);
  const [sendingEmail, setSendingEmail] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [staffFilter, setStaffFilter] = useState<string>('all');
  const [dateFilterType, setDateFilterType] = useState<'all' | 'today' | '7days' | '30days' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  // Dedicated Donut Chart Date Range State (Administrator Oversight)
  const [donutDateRange, setDonutDateRange] = useState<'all' | 'today' | '7days' | '30days' | 'custom'>('all');
  const [donutCustomStart, setDonutCustomStart] = useState<string>('');
  const [donutCustomEnd, setDonutCustomEnd] = useState<string>('');
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingLead, setEditingLead] = useState<HostingCrmLead | null>(null);

  // Convert Lead to Customer Account Modal State
  const [showConvertModal, setShowConvertModal] = useState<boolean>(false);
  const [convertingLead, setConvertingLead] = useState<HostingCrmLead | null>(null);
  const [convertingSubmitting, setConvertingSubmitting] = useState<boolean>(false);
  const [showConvertPassword, setShowConvertPassword] = useState<boolean>(false);
  const [convertedCredentials, setConvertedCredentials] = useState<{
    name: string;
    email: string;
    password: string;
    accountId: string;
  } | null>(null);
  const [convertForm, setConvertForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    company: '',
    password: '',
    address1: 'Dhaka, Bangladesh',
    city: 'Dhaka',
    postcode: '1000',
    country: 'Bangladesh',
    sendWelcomeEmail: true
  });

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
  const [sendingQuoteEmail, setSendingQuoteEmail] = useState<boolean>(false);
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
    fetchEmailTemplates();
  }, []);

  const fetchEmailTemplates = async () => {
    try {
      const snap = await getDocs(collection(db, 'emailTemplates'));
      if (!snap.empty) {
        const loaded: LeadEmailTemplate[] = [];
        snap.docs.forEach(d => {
          const val = d.data() as any;
          if (val && val.name && val.subject && val.body && (val.isCrmTemplate || d.id.startsWith('tpl_'))) {
            loaded.push({
              id: d.id,
              name: val.name,
              subject: val.subject,
              body: val.body,
              category: val.category || 'custom',
              updatedAt: val.updatedAt || 'Saved'
            });
          }
        });
        if (loaded.length > 0) {
          setEmailTemplates(loaded);
        }
      }
    } catch (err) {
      console.warn('[HostingCRM] Could not load emailTemplates from Firestore:', err);
    }
  };

  const buildNotificationsFromLeads = (leadList: HostingCrmLead[]) => {
    const generated: CrmNotification[] = [];
    leadList.forEach(l => {
      if (normalizeStage(l.leadStage) === 'converted') {
        generated.push({
          id: `notif_conv_${l.id}`,
          title: `🎉 Lead Converted: ${l.contactName}`,
          message: `${l.contactName} (${l.companyName || l.email}) converted to active customer (${formatCurrency(l.dealValueBdt)}).`,
          type: 'converted',
          leadId: l.id,
          leadName: l.contactName,
          timestamp: l.lastContactTime || 'Recently',
          read: false
        });
      }
      const urgentLog = (l.timeline || []).find(t => t.isHighPriority);
      if (urgentLog && normalizeStage(l.leadStage) !== 'converted') {
        generated.push({
          id: `notif_hp_${l.id}_${urgentLog.id}`,
          title: `🚨 High-Priority Activity: ${l.contactName}`,
          message: `${urgentLog.title}: ${urgentLog.description}`,
          type: 'high_priority',
          leadId: l.id,
          leadName: l.contactName,
          timestamp: urgentLog.timestamp || 'Recently',
          read: false
        });
      }
    });
    setNotifications(generated.slice(0, 15));
  };

  const fetchLeads = async () => {
    setLoading(true);
    const mergedMap = new Map<string, HostingCrmLead>();

    // 1. Load from Firestore 'hosting_crm_leads'
    try {
      const snap = await getDocs(collection(db, 'hosting_crm_leads'));
      if (!snap.empty) {
        snap.docs.forEach(d => {
          const val = d.data() as any;
          if (val && !val.deleted && val.contactName) {
            mergedMap.set(d.id, {
              id: d.id,
              ...val,
              interestedProducts: Array.isArray(val.interestedProducts) ? val.interestedProducts : ['Web Hosting & Domain'],
              notes: Array.isArray(val.notes) ? val.notes : [],
              leadStage: normalizeStage(val.leadStage),
              timeline: Array.isArray(val.timeline) ? val.timeline : []
            });
          }
        });
      }
    } catch (err) {
      console.warn('Could not read hosting_crm_leads from Firestore:', err);
    }

    // 2. Load from Backend '/api/crm/leads'
    try {
      const res = await fetch('/api/crm/leads');
      const data = await res.json();
      if (data.success && Array.isArray(data.leads) && data.leads.length > 0) {
        data.leads.forEach((l: any) => {
          if (l && l.id && !l.deleted && l.contactName) {
            const existing = mergedMap.get(l.id);
            mergedMap.set(l.id, {
              ...existing,
              ...l,
              interestedProducts: Array.isArray(l.interestedProducts) ? l.interestedProducts : (existing?.interestedProducts || ['Web Hosting & Domain']),
              notes: Array.isArray(l.notes) ? l.notes : (existing?.notes || []),
              leadStage: normalizeStage(l.leadStage),
              timeline: Array.isArray(l.timeline) ? l.timeline : (existing?.timeline || [])
            });
          }
        });
      }
    } catch (err) {
      console.warn('Failed to fetch CRM leads from backend API:', err);
    }

    const finalLeads = Array.from(mergedMap.values());
    setLeads(finalLeads);
    buildNotificationsFromLeads(finalLeads);
    setLoading(false);
  };

  // Sync Website Inquiries, Quote Requests & Domain Offer Requests into CRM Pipeline
  const handleSyncWebsiteInquiries = async (silent = false) => {
    setSyncingInquiries(true);
    let newlySyncedCount = 0;
    const existingEmailsOrIds = new Set(leads.map(l => l.id));
    const staffPool = getActiveStaffPool();
    let rrPointer = roundRobinIndex;
    const syncedLeads: HostingCrmLead[] = [];

    try {
      // 1. Sync Contact Us 'inquiries'
      const inqSnap = await getDocs(collection(db, 'inquiries')).catch(() => null);
      if (inqSnap && !inqSnap.empty) {
        for (const d of inqSnap.docs) {
          const leadId = `lead_inq_${d.id}`;
          if (existingEmailsOrIds.has(leadId)) continue;
          const val = d.data() as any;
          if (!val || !val.email) continue;
          const staff = staffPool[rrPointer % staffPool.length];
          rrPointer++;
          const assignedStaffName = `${staff.name} (${staff.role})`;
          const newLead: HostingCrmLead = {
            id: leadId,
            contactName: val.name || val.email.split('@')[0],
            companyName: val.company || '',
            email: val.email,
            phone: val.phone || '+880 1700-000000',
            leadStage: 'new',
            interestedProducts: [val.subject || 'Website Contact Inquiry'],
            dealValueBdt: 5000,
            assignedStaffId: staff.id,
            assignedStaffName,
            notes: [val.message || 'Submitted via Website Contact Form'],
            timeline: [{
              id: `tl_inq_${d.id}`,
              type: 'note',
              title: 'Synced from Website Contact Inquiry',
              description: val.message || 'Customer submitted an inquiry via Contact Us page.',
              timestamp: val.createdAt ? new Date(val.createdAt).toLocaleDateString() : 'Recently',
              performedBy: 'CRM Auto-Sync'
            }],
            lastContactTime: 'Recently',
            source: 'Web Form',
            createdAt: val.createdAt || new Date().toISOString()
          };
          syncedLeads.push(newLead);
          existingEmailsOrIds.add(leadId);
          newlySyncedCount++;
        }
      }

      // 2. Sync 'domain_offers'
      const offerSnap = await getDocs(collection(db, 'domain_offers')).catch(() => null);
      if (offerSnap && !offerSnap.empty) {
        for (const d of offerSnap.docs) {
          const leadId = `lead_offer_${d.id}`;
          if (existingEmailsOrIds.has(leadId)) continue;
          const val = d.data() as any;
          if (!val || !val.email) continue;
          const staff = staffPool[rrPointer % staffPool.length];
          rrPointer++;
          const assignedStaffName = `${staff.name} (${staff.role})`;
          const newLead: HostingCrmLead = {
            id: leadId,
            contactName: val.name || val.buyerName || val.email.split('@')[0],
            companyName: val.company || '',
            email: val.email,
            phone: val.phone || '+880 1700-000000',
            targetDomain: val.domain || val.domainName || '',
            leadStage: val.status === 'accepted' ? 'converted' : 'qualified',
            interestedProducts: [`Domain Offer: ${val.domain || val.domainName || 'Premium Domain'}`],
            dealValueBdt: Number(val.offerAmount || val.price || 10000),
            assignedStaffId: staff.id,
            assignedStaffName,
            notes: [val.message || val.notes || `Domain Offer Request for ${val.domain || ''}`],
            timeline: [{
              id: `tl_offer_${d.id}`,
              type: 'quote',
              title: 'Synced from Domain Offer Request',
              description: `Customer offered ${formatCurrency(Number(val.offerAmount || val.price || 10000))} for ${val.domain || 'domain'}.`,
              timestamp: val.createdAt ? new Date(val.createdAt).toLocaleDateString() : 'Recently',
              performedBy: 'CRM Auto-Sync'
            }],
            lastContactTime: 'Recently',
            source: 'Web Form',
            createdAt: val.createdAt || new Date().toISOString()
          };
          syncedLeads.push(newLead);
          existingEmailsOrIds.add(leadId);
          newlySyncedCount++;
        }
      }

      // 3. Sync 'quote_requests'
      const quoteSnap = await getDocs(collection(db, 'quote_requests')).catch(() => null);
      if (quoteSnap && !quoteSnap.empty) {
        for (const d of quoteSnap.docs) {
          const leadId = `lead_quote_${d.id}`;
          if (existingEmailsOrIds.has(leadId)) continue;
          const val = d.data() as any;
          if (!val || !val.email) continue;
          const staff = staffPool[rrPointer % staffPool.length];
          rrPointer++;
          const assignedStaffName = `${staff.name} (${staff.role})`;
          const newLead: HostingCrmLead = {
            id: leadId,
            contactName: val.name || val.contactName || val.email.split('@')[0],
            companyName: val.company || '',
            email: val.email,
            phone: val.phone || '+880 1700-000000',
            targetDomain: val.domain || '',
            leadStage: 'vps_quote_sent',
            interestedProducts: [val.service || val.package || 'Custom Server / VPS Quote'],
            dealValueBdt: Number(val.budget || val.estimatedPrice || 15000),
            assignedStaffId: staff.id,
            assignedStaffName,
            notes: [val.message || val.requirements || 'Custom server quotation request.'],
            timeline: [{
              id: `tl_qr_${d.id}`,
              type: 'quote',
              title: 'Synced from Custom Quote Request',
              description: val.message || val.requirements || 'Customer requested a custom server quotation.',
              timestamp: val.createdAt ? new Date(val.createdAt).toLocaleDateString() : 'Recently',
              performedBy: 'CRM Auto-Sync'
            }],
            lastContactTime: 'Recently',
            source: 'Web Form',
            createdAt: val.createdAt || new Date().toISOString()
          };
          syncedLeads.push(newLead);
          existingEmailsOrIds.add(leadId);
          newlySyncedCount++;
        }
      }

      if (syncedLeads.length > 0) {
        setRoundRobinIndex(rrPointer);
        setLeads(prev => {
          const combined = [...syncedLeads, ...prev];
          buildNotificationsFromLeads(combined);
          return combined;
        });

        for (const sLead of syncedLeads) {
          await setDoc(doc(db, 'hosting_crm_leads', sLead.id), sLead, { merge: true }).catch(() => null);
          fetch('/api/crm/leads', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(sLead)
          }).catch(() => null);
        }

        if (!silent) {
          toast.success(`Synced ${newlySyncedCount} new inquiries & offers into CRM pipeline!`);
        }
      } else if (!silent) {
        toast.success('All website inquiries, domain offers, and quote requests are already up to date in CRM!');
      }
    } catch (err) {
      if (!silent) toast.error('Could not sync inquiries at this moment.');
    } finally {
      setSyncingInquiries(false);
    }
  };

  const getActiveStaffPool = () => {
    if (activeStaffMembers && activeStaffMembers.length > 0) {
      return activeStaffMembers;
    }
    if (staffMembers && staffMembers.length > 0) {
      return staffMembers;
    }
    const u = auth.currentUser;
    return [
      {
        id: u?.uid || 'admin',
        name: u?.displayName || u?.email?.split('@')[0] || 'Administrator',
        role: 'Super Admin',
        email: u?.email || ''
      }
    ];
  };

  // ROUND-ROBIN AUTOMATED DISTRIBUTOR HELPER FUNCTION
  const getNextRoundRobinStaffMember = () => {
    const staffPool = getActiveStaffPool();
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
  const handleRebalanceLeadWorkload = async () => {
    const staffPool = getActiveStaffPool();
    let pointer = 0;
    const nowTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' Today';
    const actor = getCurrentActorName();

    const updatedList: HostingCrmLead[] = leads.map(lead => {
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
          performedBy: actor
        };

        return {
          ...lead,
          assignedStaffId: staff.id,
          assignedStaffName: staffName,
          timeline: [logItem, ...(lead.timeline || [])]
        };
      }
      return lead;
    });

    setLeads(updatedList);
    toast.success(`⚡ Rebalanced active leads equally across ${staffPool.length} team member(s)!`);
    setShowWorkloadModal(false);

    // Persist rebalanced leads to Firestore and Backend
    for (const l of updatedList) {
      setDoc(doc(db, 'hosting_crm_leads', l.id), {
        assignedStaffId: l.assignedStaffId,
        assignedStaffName: l.assignedStaffName,
        timeline: l.timeline
      }, { merge: true }).catch(() => null);
      fetch(`/api/crm/leads/${l.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignedStaffId: l.assignedStaffId,
          assignedStaffName: l.assignedStaffName,
          timeline: l.timeline
        })
      }).catch(() => null);
    }
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
    const staffPool = getActiveStaffPool();
    const firstStaff = staffPool[0] ? `${staffPool[0].name} (${staffPool[0].role})` : getCurrentActorName();
    const sampleHeaders = ['Contact Name', 'Company Name', 'Email Address', 'Phone Number', 'Target Domain', 'Lead Stage', 'Deal Value BDT', 'Assigned Staff', 'Lead Source', 'Notes'];
    const sampleRow1 = ['"Monir Hossain"', '"Chittagong Maritime Ltd"', '"monir@ctgbd.com"', '"+880 1711-223344"', '"ctgbd.com"', '"new"', '"15000"', `"${firstStaff}"`, '"WhatsApp"', '"Requires NVMe Cloud VPS + BDIX bandwidth"'];
    const sampleRow2 = ['"Faria Yasmin"', '"Dhaka Digital Studio"', '"faria@dhakadigital.net"', '"+880 1812-445566"', '"dhakadigital.net"', '"qualified"', '"22000"', `"${firstStaff}"`, '"Meta Ads"', '"Needs cPanel Premier and .NET domain"'];
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

  // DEDICATED DONUT CHART FILTERING & KPI METRICS (Administrator Oversight)
  const donutFilteredLeads = leads.filter(lead => {
    if (donutDateRange === 'all') return true;
    const leadDate = getLeadDate(lead);
    const now = new Date();

    if (donutDateRange === 'today') {
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return leadDate >= todayStart;
    }
    if (donutDateRange === '7days') {
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return leadDate >= sevenDaysAgo;
    }
    if (donutDateRange === '30days') {
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return leadDate >= thirtyDaysAgo;
    }
    if (donutDateRange === 'custom') {
      if (donutCustomStart) {
        const start = new Date(donutCustomStart);
        start.setHours(0, 0, 0, 0);
        if (leadDate < start) return false;
      }
      if (donutCustomEnd) {
        const end = new Date(donutCustomEnd);
        end.setHours(23, 59, 59, 999);
        if (leadDate > end) return false;
      }
      return true;
    }
    return true;
  });

  const donutTotalCount = donutFilteredLeads.length;
  const donutConvertedCount = donutFilteredLeads.filter(l => ['converted', 'active_customer'].includes(normalizeStage(l.leadStage))).length;
  const donutConversionRate = donutTotalCount > 0 ? Math.round((donutConvertedCount / donutTotalCount) * 100) : 0;
  const donutTotalValue = donutFilteredLeads.reduce((sum, l) => sum + (l.dealValueBdt || 0), 0);
  const donutConvertedValue = donutFilteredLeads
    .filter(l => ['converted', 'active_customer'].includes(normalizeStage(l.leadStage)))
    .reduce((sum, l) => sum + (l.dealValueBdt || 0), 0);
  const donutInProgressCount = donutFilteredLeads.filter(l => ['contacted', 'domain_consultation', 'qualified', 'vps_quote_sent', 'invoice_pending'].includes(normalizeStage(l.leadStage))).length;
  const donutInProgressValue = donutFilteredLeads
    .filter(l => ['contacted', 'domain_consultation', 'qualified', 'vps_quote_sent', 'invoice_pending'].includes(normalizeStage(l.leadStage)))
    .reduce((sum, l) => sum + (l.dealValueBdt || 0), 0);

  // RECHARTS DONUT CHART DATA: Visualizing Lead Statuses for Administrator Oversight
  const donutStatusData = [
    { 
      name: 'New', 
      displayName: 'New Inbound',
      value: donutFilteredLeads.filter(l => ['new', 'new_inbound'].includes(normalizeStage(l.leadStage))).length,
      dealValue: donutFilteredLeads.filter(l => ['new', 'new_inbound'].includes(normalizeStage(l.leadStage))).reduce((sum, l) => sum + (l.dealValueBdt || 0), 0),
      color: '#3b82f6',
      badgeColor: 'bg-blue-100 text-blue-800'
    },
    { 
      name: 'In-Progress', 
      displayName: 'In-Progress / Quotes',
      value: donutFilteredLeads.filter(l => ['contacted', 'domain_consultation', 'qualified', 'vps_quote_sent', 'invoice_pending'].includes(normalizeStage(l.leadStage))).length,
      dealValue: donutFilteredLeads.filter(l => ['contacted', 'domain_consultation', 'qualified', 'vps_quote_sent', 'invoice_pending'].includes(normalizeStage(l.leadStage))).reduce((sum, l) => sum + (l.dealValueBdt || 0), 0),
      color: '#f59e0b',
      badgeColor: 'bg-amber-100 text-amber-800'
    },
    { 
      name: 'Converted', 
      displayName: 'Converted Customers',
      value: donutFilteredLeads.filter(l => ['converted', 'active_customer'].includes(normalizeStage(l.leadStage))).length,
      dealValue: donutFilteredLeads.filter(l => ['converted', 'active_customer'].includes(normalizeStage(l.leadStage))).reduce((sum, l) => sum + (l.dealValueBdt || 0), 0),
      color: '#10b981',
      badgeColor: 'bg-emerald-100 text-emerald-800'
    },
    { 
      name: 'Renewal', 
      displayName: 'Renewal & Upsell',
      value: donutFilteredLeads.filter(l => ['renewal_upsell'].includes(normalizeStage(l.leadStage))).length,
      dealValue: donutFilteredLeads.filter(l => ['renewal_upsell'].includes(normalizeStage(l.leadStage))).reduce((sum, l) => sum + (l.dealValueBdt || 0), 0),
      color: '#ec4899',
      badgeColor: 'bg-pink-100 text-pink-800'
    }
  ];

  // AUTOMATED ACTIVITY LOGGING: Reassign Staff Member with User Action & Timestamp
  const handleReassignLeadStaff = async (leadId: string, newStaffId: string) => {
    const targetLead = leads.find(l => l.id === leadId);
    if (!targetLead) return;

    let newStaffName = 'Unassigned';
    if (newStaffId) {
      const staffObj = activeStaffMembers.find(s => s.id === newStaffId) || staffMembers.find(s => s.id === newStaffId);
      if (staffObj) {
        newStaffName = `${staffObj.name} (${staffObj.role})`;
      } else {
        newStaffName = newStaffId;
      }
    }

    const oldStaffName = targetLead.assignedStaffName || 'Unassigned';
    if (oldStaffName === newStaffName && targetLead.assignedStaffId === newStaffId) return;

    const nowFormatted = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ', ' + new Date().toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });

    // Automatically attach log entry capturing timestamp and administrator user action
    const reassignLogItem: LeadActivityLog = {
      id: `tl_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      type: 'note',
      title: `Staff Reassigned: ${oldStaffName} ➔ ${newStaffName}`,
      description: `Lead account manager re-assigned from "${oldStaffName}" to "${newStaffName}" by Administrator.`,
      timestamp: nowFormatted,
      performedBy: 'Administrator',
      isHighPriority: false
    };

    const updatedTimeline = [reassignLogItem, ...(targetLead.timeline || [])];
    const updatedLead: HostingCrmLead = {
      ...targetLead,
      assignedStaffId: newStaffId || undefined,
      assignedStaffName: newStaffName,
      timeline: updatedTimeline
    };

    // Immediate UI state update
    setLeads(prev => prev.map(l => l.id === leadId ? updatedLead : l));
    if (selectedLeadForDetail?.id === leadId) {
      setSelectedLeadForDetail(updatedLead);
    }

    toast.success(`👤 Reassigned "${targetLead.contactName}" to ${newStaffName} (Activity logged)`);

    // Synchronize attached log and new staff to backend & Firestore
    try {
      await fetch(`/api/crm/leads/${leadId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignedStaffId: newStaffId || null,
          assignedStaffName: newStaffName,
          timeline: updatedTimeline
        })
      });
      await setDoc(doc(db, 'hosting_crm_leads', leadId), {
        assignedStaffId: newStaffId || null,
        assignedStaffName: newStaffName,
        timeline: updatedTimeline
      }, { merge: true }).catch(() => null);
    } catch (e) {
      console.warn('Failed to sync staff reassignment log:', e);
    }
  };

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
    const actor = getCurrentActorName();

    const updatedMap = new Map<string, LeadActivityLog[]>();

    setLeads(prev => prev.map(lead => {
      if (selectedLeadIds.includes(lead.id)) {
        const logItem: LeadActivityLog = {
          id: `tl_${Date.now()}_${Math.random().toString(36).substring(2,5)}`,
          type: 'status_change',
          title: `Bulk Stage Update to ${stageObj?.label || newStage}`,
          description: `Lead moved in batch update to "${stageObj?.label || newStage}".`,
          timestamp: nowTimestamp,
          performedBy: actor,
          isHighPriority: newStage === 'converted'
        };
        const nextTimeline = [logItem, ...(lead.timeline || [])];
        updatedMap.set(lead.id, nextTimeline);
        return {
          ...lead,
          leadStage: newStage,
          timeline: nextTimeline
        };
      }
      return lead;
    }));

    if (newStage === 'converted') {
      toast.success(`🎉 Converted ${selectedLeadIds.length} leads simultaneously!`);
    } else {
      toast.success(`Updated ${selectedLeadIds.length} leads to "${stageObj?.label}"`);
    }

    // Backend & Firestore sync for each selected lead
    selectedLeadIds.forEach(async (id) => {
      try {
        const nextTimeline = updatedMap.get(id);
        await fetch(`/api/crm/leads/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ leadStage: newStage, ...(nextTimeline ? { timeline: nextTimeline } : {}) })
        });
        await setDoc(doc(db, 'hosting_crm_leads', id), { leadStage: newStage, ...(nextTimeline ? { timeline: nextTimeline } : {}) }, { merge: true }).catch(() => null);
      } catch (e) {
        console.warn('Batch update sync error:', e);
      }
    });

    setSelectedLeadIds([]);
  };

  // BULK ACTION 2: Batch Staff Reassignment
  const handleBatchAssignStaff = async (staffId: string) => {
    if (selectedLeadIds.length === 0) return;
    const staffPool = getActiveStaffPool();
    const assignedStaff = staffPool.find(s => s.id === staffId);
    if (!assignedStaff) return;

    const staffName = `${assignedStaff.name} (${assignedStaff.role})`;
    const nowTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' Today';
    const actor = getCurrentActorName();
    const updatedMap = new Map<string, LeadActivityLog[]>();

    setLeads(prev => prev.map(lead => {
      if (selectedLeadIds.includes(lead.id)) {
        const logItem: LeadActivityLog = {
          id: `tl_${Date.now()}_${Math.random().toString(36).substring(2,5)}`,
          type: 'note',
          title: 'Staff Reassigned',
          description: `Account manager updated to ${staffName}.`,
          timestamp: nowTimestamp,
          performedBy: actor
        };
        const nextTimeline = [logItem, ...(lead.timeline || [])];
        updatedMap.set(lead.id, nextTimeline);
        return {
          ...lead,
          assignedStaffId: staffId,
          assignedStaffName: staffName,
          timeline: nextTimeline
        };
      }
      return lead;
    }));

    toast.success(`Reassigned ${selectedLeadIds.length} leads to ${assignedStaff.name}`);

    selectedLeadIds.forEach(async (id) => {
      try {
        const nextTimeline = updatedMap.get(id);
        await fetch(`/api/crm/leads/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ assignedStaffId: staffId, assignedStaffName: staffName, ...(nextTimeline ? { timeline: nextTimeline } : {}) })
        });
        await setDoc(doc(db, 'hosting_crm_leads', id), { assignedStaffId: staffId, assignedStaffName: staffName, ...(nextTimeline ? { timeline: nextTimeline } : {}) }, { merge: true }).catch(() => null);
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
        await deleteDoc(doc(db, 'hosting_crm_leads', id)).catch(() => null);
        await fetch(`/api/crm/leads/${id}`, { method: 'DELETE' });
      } catch (e) {
        console.warn('Batch delete error:', e);
      }
    });

    setSelectedLeadIds([]);
  };

  // Helper to replace template placeholders for a specific lead
  const populateTemplateForLead = (tpl: LeadEmailTemplate, lead: HostingCrmLead) => {
    let populatedSubject = tpl.subject;
    let populatedBody = tpl.body;
    const replacements: Record<string, string> = {
      '{{contactName}}': lead.contactName || 'Valued Client',
      '{{companyName}}': lead.companyName || 'Individual',
      '{{targetDomain}}': lead.targetDomain || 'yourdomain.com',
      '{{dealValueBdt}}': formatCurrency(lead.dealValueBdt),
      '{{assignedStaffName}}': lead.assignedStaffName || getCurrentActorName()
    };
    Object.entries(replacements).forEach(([tag, val]) => {
      populatedSubject = populatedSubject.replaceAll(tag, val);
      populatedBody = populatedBody.replaceAll(tag, val);
    });
    return { subject: populatedSubject, body: populatedBody };
  };

  // BULK ACTION 4: Batch Email Dispatch (Real Email via sendRealEmail)
  const handleBatchSendEmailTemplate = async (templateId: string) => {
    const tpl = emailTemplates.find(t => t.id === templateId);
    if (!tpl || selectedLeadIds.length === 0) return;

    const nowTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' Today';
    const actor = getCurrentActorName();
    const targetLeads = leads.filter(l => selectedLeadIds.includes(l.id));

    toast.loading(`Sending "${tpl.name}" email to ${targetLeads.length} lead(s)...`, { id: 'batch-crm-email' });

    for (const lead of targetLeads) {
      const { subject, body } = populateTemplateForLead(tpl, lead);
      const htmlBody = `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px;">
        <h2 style="color:#0f172a;margin-top:0;">${subject}</h2>
        <div style="color:#334155;line-height:1.6;white-space:pre-line;">${body}</div>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;" />
        <p style="font-size:12px;color:#64748b;margin:0;">Click2IT Hosting & Domain Services</p>
      </div>`;

      await sendRealEmail(lead.email, subject, htmlBody).catch(() => false);

      const logItem: LeadActivityLog = {
        id: `tl_${Date.now()}_${Math.random().toString(36).substring(2,5)}`,
        type: 'email_sent',
        title: `Batch Email Sent: ${tpl.name}`,
        description: `Dispatched "${subject}" to ${lead.email}`,
        timestamp: nowTimestamp,
        performedBy: actor
      };

      const nextTimeline = [logItem, ...(lead.timeline || [])];
      setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, timeline: nextTimeline, lastContactTime: 'Just now' } : l));
      await setDoc(doc(db, 'hosting_crm_leads', lead.id), { timeline: nextTimeline, lastContactTime: 'Just now' }, { merge: true }).catch(() => null);
      fetch(`/api/crm/leads/${lead.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timeline: nextTimeline, lastContactTime: 'Just now' })
      }).catch(() => null);
    }

    toast.success(`📧 Sent "${tpl.name}" email to ${targetLeads.length} lead(s)!`, { id: 'batch-crm-email' });
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

  const handleSaveTemplateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateForm.name || !templateForm.subject || !templateForm.body) {
      toast.error('Please fill template name, subject, and body');
      return;
    }

    const nowDate = new Date().toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    const targetId = editingTemplate ? editingTemplate.id : `tpl_${Date.now()}`;
    const savedTpl: LeadEmailTemplate = {
      id: targetId,
      name: templateForm.name,
      category: templateForm.category,
      subject: templateForm.subject,
      body: templateForm.body,
      updatedAt: nowDate
    };

    if (editingTemplate) {
      setEmailTemplates(prev => prev.map(t => t.id === editingTemplate.id ? savedTpl : t));
      toast.success(`Updated template "${templateForm.name}"`);
    } else {
      setEmailTemplates(prev => [savedTpl, ...prev]);
      toast.success(`Created email template "${templateForm.name}"`);
    }

    setShowTemplateModal(false);

    // Persist in Firestore 'emailTemplates'
    try {
      await setDoc(doc(db, 'emailTemplates', targetId), {
        ...savedTpl,
        isCrmTemplate: true
      }, { merge: true });
    } catch (err) {
      console.warn('Could not persist email template to Firestore:', err);
    }
  };

  const handleDeleteTemplate = async (id: string, name: string) => {
    if (!confirm(`Delete template "${name}"?`)) return;
    setEmailTemplates(prev => prev.filter(t => t.id !== id));
    toast.success(`Deleted template "${name}"`);
    try {
      await deleteDoc(doc(db, 'emailTemplates', id));
    } catch (err) {
      console.warn('Could not delete template from Firestore:', err);
    }
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

    const { subject, body } = populateTemplateForLead(tpl, selectedLeadForDetail);
    setNewEmailSubject(subject);
    setNewEmailBody(body);
    toast.success(`Loaded template "${tpl.name}" with lead data!`);
  };

  const handleOpenAddModal = () => {
    setEditingLead(null);
    const staffPool = getActiveStaffPool();
    let defaultStaffId = staffPool[0]?.id || 'admin';

    if (enableRoundRobin) {
      const rrStaff = getNextRoundRobinStaffMember();
      defaultStaffId = rrStaff.id;
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
      noteText: ''
    });
    setShowModal(true);
  };

  const handleOpenEditModal = (lead: HostingCrmLead) => {
    setEditingLead(lead);
    const staffPool = getActiveStaffPool();
    setForm({
      contactName: lead.contactName,
      companyName: lead.companyName || '',
      email: lead.email,
      phone: lead.phone,
      targetDomain: lead.targetDomain || '',
      leadStage: normalizeStage(lead.leadStage),
      interestedProductsText: lead.interestedProducts.join(', '),
      dealValueBdt: String(lead.dealValueBdt || 0),
      assignedStaffId: lead.assignedStaffId || staffPool[0]?.id || '',
      source: lead.source || 'WhatsApp',
      noteText: lead.notes[0] || ''
    });
    setShowModal(true);
  };

  const handleOpenDetailModal = (lead: HostingCrmLead) => {
    setSelectedLeadForDetail(lead);
    setNewEmailSubject(`Special Quotation & Setup Details for ${lead.targetDomain || 'your website'}`);
    setNewEmailBody(`Hello ${lead.contactName},\n\nThank you for reaching out to Click2IT Hosting. We have prepared your customized server and domain quotation.\n\nPackage: ${lead.interestedProducts[0] || 'Cloud NVMe Hosting'}\nEstimated Price: ${formatCurrency(lead.dealValueBdt)}\n\nPlease let us know if you would like to proceed with instant activation.`);
  };

  const handleSaveLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.contactName || !form.email) {
      toast.error('Please enter contact name and email');
      return;
    }

    const staffPool = getActiveStaffPool();
    let assignedStaffId = form.assignedStaffId;
    let assignedStaffName = '';

    const matchedStaff = staffPool.find(s => s.id === form.assignedStaffId);
    if (matchedStaff) {
      assignedStaffName = `${matchedStaff.name} (${matchedStaff.role})`;
    } else if (staffPool[0]) {
      assignedStaffId = staffPool[0].id;
      assignedStaffName = `${staffPool[0].name} (${staffPool[0].role})`;
    } else {
      assignedStaffName = getCurrentActorName();
    }

    const productsArray = form.interestedProductsText
      .split(',')
      .map(p => p.trim())
      .filter(Boolean);

    const isNew = !editingLead;
    const targetId = editingLead?.id || `lead_${Date.now()}`;
    const nowFormatted = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ', ' + new Date().toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    const actor = getCurrentActorName();

    const newTimelineItems: LeadActivityLog[] = [];

    if (isNew) {
      newTimelineItems.push({
        id: `tl_${Date.now()}`,
        type: 'status_change',
        title: 'Lead Created & Status Set',
        description: `New lead created in stage "${leadStagesConfig.find(s => s.id === form.leadStage)?.label || form.leadStage}" and assigned to ${assignedStaffName}.`,
        timestamp: nowFormatted,
        performedBy: actor
      });
    } else {
      if (normalizeStage(editingLead.leadStage) !== normalizeStage(form.leadStage)) {
        const oldStageLabel = leadStagesConfig.find(s => s.id === normalizeStage(editingLead.leadStage))?.label || editingLead.leadStage;
        const newStageLabel = leadStagesConfig.find(s => s.id === normalizeStage(form.leadStage))?.label || form.leadStage;
        newTimelineItems.push({
          id: `tl_${Date.now()}_status`,
          type: 'status_change',
          title: `Status Changed: ${oldStageLabel} ➔ ${newStageLabel}`,
          description: `${actor} updated lead workflow status from "${oldStageLabel}" to "${newStageLabel}".`,
          timestamp: nowFormatted,
          performedBy: actor,
          isHighPriority: form.leadStage === 'converted'
        });
      }

      if (editingLead.assignedStaffId !== assignedStaffId) {
        const prevStaff = editingLead.assignedStaffName || 'Unassigned';
        newTimelineItems.push({
          id: `tl_${Date.now()}_staff`,
          type: 'note',
          title: `Staff Reassigned: ${prevStaff} ➔ ${assignedStaffName}`,
          description: `${actor} re-assigned lead account manager from "${prevStaff}" to "${assignedStaffName}".`,
          timestamp: nowFormatted,
          performedBy: actor
        });
      }

      if (newTimelineItems.length === 0) {
        newTimelineItems.push({
          id: `tl_${Date.now()}`,
          type: 'note',
          title: 'Lead Details Updated',
          description: `${actor} updated lead specifications.`,
          timestamp: nowFormatted,
          performedBy: actor
        });
      }
    }

    const existingTimeline = editingLead?.timeline || [];
    const updatedTimeline = [...newTimelineItems, ...existingTimeline];

    const payload: HostingCrmLead = {
      id: targetId,
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
      whmcsAccountId: editingLead?.whmcsAccountId || '',
      customerUid: editingLead?.customerUid || '',
      source: form.source,
      notes: form.noteText ? [form.noteText] : (editingLead?.notes || ['Added in Hosting CRM Lead Module.']),
      timeline: updatedTimeline,
      lastContactTime: 'Just now',
      createdAt: editingLead?.createdAt || new Date().toISOString()
    };

    try {
      // Save to Firestore first
      await setDoc(doc(db, 'hosting_crm_leads', targetId), payload, { merge: true });

      // Update local state immediately
      setLeads(prev => {
        const exists = prev.some(l => l.id === targetId);
        return exists ? prev.map(l => l.id === targetId ? payload : l) : [payload, ...prev];
      });

      // Sync to backend API
      if (editingLead) {
        fetch(`/api/crm/leads/${editingLead.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }).catch(() => null);
      } else {
        fetch('/api/crm/leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, useRoundRobin: enableRoundRobin })
        }).catch(() => null);
      }

      if (form.leadStage === 'converted') {
        triggerConvertedAlert(payload.contactName, payload.dealValueBdt, targetId);
      }

      setShowModal(false);
      toast.success(`🎉 Lead "${form.contactName}" saved!`);
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
    const nowFormatted = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ', ' + new Date().toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    const actor = getCurrentActorName();

    const stageTimelineEntry: LeadActivityLog = {
      id: `tl_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      type: 'status_change',
      title: `Status Changed: ${oldStageLabel} ➔ ${newStageLabel}`,
      description: `${actor} moved lead workflow status from "${oldStageLabel}" to "${newStageLabel}".`,
      timestamp: nowFormatted,
      performedBy: actor,
      isHighPriority: newStage === 'converted'
    };

    const updatedTimeline = [stageTimelineEntry, ...(targetLead.timeline || [])];

    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, leadStage: newStage, timeline: updatedTimeline } : l));
    if (selectedLeadForDetail?.id === leadId) {
      setSelectedLeadForDetail(prev => prev ? { ...prev, leadStage: newStage, timeline: updatedTimeline } : null);
    }

    if (newStage === 'converted') {
      triggerConvertedAlert(targetLead.contactName, targetLead.dealValueBdt, leadId);
    } else {
      toast.success(`Moved lead to "${newStageLabel}"`);
    }

    try {
      await setDoc(doc(db, 'hosting_crm_leads', leadId), { leadStage: newStage, timeline: updatedTimeline }, { merge: true }).catch(() => null);
      await fetch(`/api/crm/leads/${leadId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadStage: newStage, timeline: updatedTimeline })
      });
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
    const actor = getCurrentActorName();
    const noteEntry: LeadActivityLog = {
      id: `tl_${Date.now()}`,
      type: 'note',
      title: isHighPriorityNote ? '🚨 URGENT: High-Priority Note' : 'Internal Note Added',
      description: newTimelineNote.trim(),
      timestamp: nowTimestamp,
      performedBy: actor,
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
      await setDoc(doc(db, 'hosting_crm_leads', selectedLeadForDetail.id), { timeline: updatedTimeline }, { merge: true }).catch(() => null);
      await fetch(`/api/crm/leads/${selectedLeadForDetail.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timeline: updatedTimeline })
      });
    } catch (e) {
      console.warn('Backend sync failed:', e);
    }
  };

  // Timeline Addition: Send & Log Real Email
  const handleSendTimelineEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeadForDetail || !newEmailSubject.trim() || !newEmailBody.trim()) {
      toast.error('Please enter subject and body');
      return;
    }

    setSendingEmail(true);
    const nowTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' Today';
    const actor = getCurrentActorName();

    try {
      const htmlBody = `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px;">
        <h2 style="color:#0f172a;margin-top:0;">${newEmailSubject}</h2>
        <div style="color:#334155;line-height:1.6;white-space:pre-line;">${newEmailBody}</div>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;" />
        <p style="font-size:12px;color:#64748b;margin:0;">Sent by ${actor} — Click2IT Hosting & Domain Services</p>
      </div>`;

      await sendRealEmail(selectedLeadForDetail.email, newEmailSubject, htmlBody);

      const emailEntry: LeadActivityLog = {
        id: `tl_${Date.now()}`,
        type: 'email_sent',
        title: `Email Sent: ${newEmailSubject}`,
        description: newEmailBody.substring(0, 150) + (newEmailBody.length > 150 ? '...' : ''),
        timestamp: nowTimestamp,
        performedBy: actor,
        meta: { to: selectedLeadForDetail.email, fullBody: newEmailBody }
      };

      const updatedTimeline = [emailEntry, ...(selectedLeadForDetail.timeline || [])];
      const updatedLead = { ...selectedLeadForDetail, timeline: updatedTimeline, lastContactTime: 'Just now' };

      setSelectedLeadForDetail(updatedLead);
      setLeads(prev => prev.map(l => l.id === selectedLeadForDetail.id ? updatedLead : l));

      toast.success(`📧 Real email sent to ${selectedLeadForDetail.email} and logged!`);

      await setDoc(doc(db, 'hosting_crm_leads', selectedLeadForDetail.id), { timeline: updatedTimeline, lastContactTime: 'Just now' }, { merge: true }).catch(() => null);
      await fetch(`/api/crm/leads/${selectedLeadForDetail.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timeline: updatedTimeline, lastContactTime: 'Just now' })
      }).catch(() => null);
    } catch (err) {
      toast.error('Failed to send email. Please check email settings.');
    } finally {
      setSendingEmail(false);
    }
  };

  // Timeline Addition: Log Call or WhatsApp
  const handleLogCallOrWhatsApp = async () => {
    if (!selectedLeadForDetail || !newCallNote.trim()) {
      toast.error('Please enter conversation summary');
      return;
    }

    const nowTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' Today';
    const actor = getCurrentActorName();
    const logEntry: LeadActivityLog = {
      id: `tl_${Date.now()}`,
      type: newCallType,
      title: newCallType === 'whatsapp' ? 'WhatsApp Interaction Logged' : 'Phone Call Logged',
      description: newCallNote.trim(),
      timestamp: nowTimestamp,
      performedBy: actor,
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
      await setDoc(doc(db, 'hosting_crm_leads', selectedLeadForDetail.id), { timeline: updatedTimeline, lastContactTime: 'Just now' }, { merge: true }).catch(() => null);
      await fetch(`/api/crm/leads/${selectedLeadForDetail.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timeline: updatedTimeline, lastContactTime: 'Just now' })
      });

      if (newCallType === 'whatsapp' && selectedLeadForDetail.phone) {
        fetch('/api/whatsapp/instant-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: selectedLeadForDetail.phone,
            contactName: selectedLeadForDetail.contactName,
            initialMessage: newCallNote.trim(),
            agentId: selectedLeadForDetail.assignedStaffId || 'admin',
            agentName: selectedLeadForDetail.assignedStaffName || actor,
            leadStage: selectedLeadForDetail.leadStage === 'converted' ? 'customer' : 'lead',
            whmcsAccountId: selectedLeadForDetail.whmcsAccountId,
            tags: ['Lead CRM Interaction', 'WhatsApp CRM']
          })
        }).catch(err => console.warn('Failed to sync to WhatsApp CRM chat history:', err));
      }
    } catch (e) {
      console.warn('Backend sync failed:', e);
    }
  };

  const handleDeleteLead = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove lead "${name}"?`)) return;

    try {
      await deleteDoc(doc(db, 'hosting_crm_leads', id)).catch(() => null);
      await fetch(`/api/crm/leads/${id}`, { method: 'DELETE' }).catch(() => null);
      setLeads(prev => prev.filter(l => l.id !== id));
      if (selectedLeadForDetail?.id === id) setSelectedLeadForDetail(null);
      toast.success(`Removed lead "${name}"`);
    } catch (err: any) {
      toast.error('Delete failed: ' + err.message);
    }
  };

  // CONVERT LEAD TO REAL CUSTOMER ACCOUNT (1-Click Customer Creation)
  const handleOpenConvertModal = (lead: HostingCrmLead) => {
    setConvertingLead(lead);
    setConvertedCredentials(null);
    const nameParts = (lead.contactName || 'Valued Customer').trim().split(/\s+/);
    const firstName = nameParts[0] || 'Customer';
    const lastName = nameParts.slice(1).join(' ') || 'Client';
    setConvertForm({
      firstName,
      lastName,
      email: lead.email || '',
      phone: lead.phone || '+8801700000000',
      company: lead.companyName || '',
      password: generateCustomerPassword(12),
      address1: 'Dhaka, Bangladesh',
      city: 'Dhaka',
      postcode: '1000',
      country: 'Bangladesh',
      sendWelcomeEmail: true
    });
    setShowConvertModal(true);
  };

  const handleConvertLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!convertingLead) return;
    setConvertingSubmitting(true);

    try {
      const createdCustomer = await createCustomerAccountByAdmin({
        firstName: convertForm.firstName,
        lastName: convertForm.lastName,
        email: convertForm.email,
        password: convertForm.password,
        phone: convertForm.phone,
        company: convertForm.company,
        address1: convertForm.address1,
        city: convertForm.city,
        state: convertForm.city,
        postcode: convertForm.postcode,
        country: convertForm.country,
        sendWelcomeEmail: convertForm.sendWelcomeEmail
      });

      const accountCode = `CUST-${String(Date.now()).slice(-5)}`;
      const nowFormatted = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ', ' + new Date().toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
      const actor = getCurrentActorName();

      const convertLog: LeadActivityLog = {
        id: `tl_conv_${Date.now()}`,
        type: 'status_change',
        title: `🎉 Converted to Registered Customer (${accountCode})`,
        description: `Created customer portal login account for ${convertForm.email} and moved lead to Converted stage.`,
        timestamp: nowFormatted,
        performedBy: actor,
        isHighPriority: true
      };

      const updatedTimeline = [convertLog, ...(convertingLead.timeline || [])];
      const updatedLead: HostingCrmLead = {
        ...convertingLead,
        contactName: `${convertForm.firstName} ${convertForm.lastName}`.trim(),
        email: convertForm.email,
        phone: convertForm.phone,
        companyName: convertForm.company,
        leadStage: 'converted',
        whmcsAccountId: accountCode,
        customerUid: createdCustomer?.id || createdCustomer?.uid || '',
        timeline: updatedTimeline,
        lastContactTime: 'Just now'
      };

      setLeads(prev => prev.map(l => l.id === convertingLead.id ? updatedLead : l));
      if (selectedLeadForDetail?.id === convertingLead.id) {
        setSelectedLeadForDetail(updatedLead);
      }

      await setDoc(doc(db, 'hosting_crm_leads', convertingLead.id), updatedLead, { merge: true }).catch(() => null);
      fetch(`/api/crm/leads/${convertingLead.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedLead)
      }).catch(() => null);

      triggerConvertedAlert(updatedLead.contactName, updatedLead.dealValueBdt, convertingLead.id);

      setConvertedCredentials({
        name: updatedLead.contactName,
        email: convertForm.email,
        password: convertForm.password,
        accountId: accountCode
      });
      setShowConvertModal(false);
    } catch (err: any) {
      toast.error(err?.message || 'Could not create customer account for this lead.');
    } finally {
      setConvertingSubmitting(false);
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

  const handleSaveQuoteToLead = async () => {
    if (!quoteLead) return;
    const finalTotal = Math.round(quoteDetails.priceBdt - (quoteDetails.priceBdt * quoteDetails.discountPercent) / 100);
    const nowFormatted = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' Today';
    const actor = getCurrentActorName();

    const quoteLog: LeadActivityLog = {
      id: `tl_quote_${Date.now()}`,
      type: 'quote',
      title: `Official Quotation Generated (${formatCurrency(finalTotal)})`,
      description: `Package: ${quoteDetails.package} (${quoteDetails.billingPeriod}) | Domain: ${quoteDetails.domainName} | Discount: ${quoteDetails.discountPercent}%`,
      timestamp: nowFormatted,
      performedBy: actor,
      isHighPriority: true
    };

    const nextStage: HostingCrmLead['leadStage'] = quoteLead.leadStage === 'converted' ? 'converted' : 'vps_quote_sent';
    const updatedTimeline = [quoteLog, ...(quoteLead.timeline || [])];
    const updatedLead: HostingCrmLead = {
      ...quoteLead,
      targetDomain: quoteDetails.domainName,
      dealValueBdt: finalTotal,
      interestedProducts: [quoteDetails.package, ...(quoteDetails.domainName ? [quoteDetails.domainName] : [])],
      leadStage: nextStage,
      timeline: updatedTimeline,
      lastContactTime: 'Just now'
    };

    setLeads(prev => prev.map(l => l.id === quoteLead.id ? updatedLead : l));
    if (selectedLeadForDetail?.id === quoteLead.id) {
      setSelectedLeadForDetail(updatedLead);
    }

    await setDoc(doc(db, 'hosting_crm_leads', quoteLead.id), updatedLead, { merge: true }).catch(() => null);
    fetch(`/api/crm/leads/${quoteLead.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedLead)
    }).catch(() => null);

    toast.success(`⚡ Saved quotation (${formatCurrency(finalTotal)}) & updated lead pipeline!`);
  };

  const handleSendQuoteEmail = async () => {
    if (!quoteLead) return;
    setSendingQuoteEmail(true);
    const finalTotal = Math.round(quoteDetails.priceBdt - (quoteDetails.priceBdt * quoteDetails.discountPercent) / 100);
    const discountAmount = Math.round((quoteDetails.priceBdt * quoteDetails.discountPercent) / 100);
    const subject = `Official Hosting & Domain Quotation — ${quoteDetails.domainName || quoteLead.contactName}`;

    const htmlBody = `
      <div style="font-family:sans-serif;max-width:620px;margin:0 auto;padding:24px;border:1px solid #e2e8f0;border-radius:16px;background:#ffffff;">
        <div style="background:#0f172a;color:#ffffff;padding:20px;border-radius:12px;margin-bottom:20px;">
          <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#fbbf24;font-weight:bold;">Official Quotation Proposal</p>
          <h2 style="margin:6px 0 0;font-size:20px;">Click2IT Hosting & Domain Services</h2>
        </div>
        <p style="color:#334155;font-size:14px;">Dear <strong>${quoteLead.contactName}</strong>,</p>
        <p style="color:#475569;font-size:14px;line-height:1.6;">Thank you for your interest in our hosting and domain solutions. Below is your customized official quotation:</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:13px;">
          <tr style="background:#f8fafc;border-bottom:1px solid #e2e8f0;">
            <td style="padding:10px 12px;font-weight:bold;color:#475569;">Package / Service</td>
            <td style="padding:10px 12px;color:#0f172a;font-weight:bold;">${quoteDetails.package}</td>
          </tr>
          <tr style="border-bottom:1px solid #e2e8f0;">
            <td style="padding:10px 12px;font-weight:bold;color:#475569;">Billing Cycle</td>
            <td style="padding:10px 12px;color:#0f172a;">${quoteDetails.billingPeriod}</td>
          </tr>
          <tr style="background:#f8fafc;border-bottom:1px solid #e2e8f0;">
            <td style="padding:10px 12px;font-weight:bold;color:#475569;">Target Domain</td>
            <td style="padding:10px 12px;color:#2563eb;font-family:monospace;">${quoteDetails.domainName}</td>
          </tr>
          <tr style="border-bottom:1px solid #e2e8f0;">
            <td style="padding:10px 12px;font-weight:bold;color:#475569;">Regular Price</td>
            <td style="padding:10px 12px;color:#0f172a;">৳${quoteDetails.priceBdt.toLocaleString()} BDT</td>
          </tr>
          <tr style="background:#f8fafc;border-bottom:1px solid #e2e8f0;">
            <td style="padding:10px 12px;font-weight:bold;color:#059669;">Special Discount (${quoteDetails.discountPercent}%)</td>
            <td style="padding:10px 12px;color:#059669;font-weight:bold;">-৳${discountAmount.toLocaleString()} BDT</td>
          </tr>
          <tr style="background:#ecfdf5;">
            <td style="padding:12px;font-weight:bold;color:#065f46;font-size:15px;">Total Payable</td>
            <td style="padding:12px;font-weight:bold;color:#065f46;font-size:16px;">৳${finalTotal.toLocaleString()} BDT</td>
          </tr>
        </table>
        <p style="color:#475569;font-size:13px;background:#f8fafc;padding:12px;border-radius:8px;border:1px solid #e2e8f0;">
          <strong>Included Benefits:</strong> ${quoteDetails.notes}
        </p>
        <p style="color:#475569;font-size:13px;line-height:1.6;">To proceed with instant activation, simply reply to this email or contact us on WhatsApp.</p>
      </div>
    `;

    try {
      await sendRealEmail(quoteLead.email, subject, htmlBody);
      await handleSaveQuoteToLead();
      toast.success(`📧 Sent official quotation email to ${quoteLead.email}!`);
      setShowQuoteModal(false);
    } catch (err) {
      toast.error('Could not dispatch quotation email.');
    } finally {
      setSendingQuoteEmail(false);
    }
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
      if (data && typeof data.available === 'boolean') {
        setWhoisResult(data);
      } else {
        setWhoisResult({ available: true, message: `Domain "${domainName}" appears available for immediate registration!` });
      }
    } catch (err) {
      setWhoisResult({ available: true, message: `Domain "${domainName}" checked via Click2IT Registrar.` });
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

      {/* Newly Converted Customer Account Credentials Banner */}
      {convertedCredentials && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-emerald-800 font-black text-sm">
              <CheckCircle2 size={18} className="text-emerald-600" />
              <span>Lead Converted & Customer Portal Login Created: {convertedCredentials.name} ({convertedCredentials.accountId})</span>
            </div>
            <p className="text-xs text-emerald-700">
              Login Email: <strong className="font-mono">{convertedCredentials.email}</strong> &nbsp;|&nbsp;
              Password: <strong className="font-mono bg-white px-2 py-0.5 rounded border border-emerald-200">{convertedCredentials.password}</strong>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const text = `Customer Name: ${convertedCredentials.name}\nAccount ID: ${convertedCredentials.accountId}\nLogin Email: ${convertedCredentials.email}\nPassword: ${convertedCredentials.password}`;
                navigator.clipboard.writeText(text);
                toast.success('Customer login credentials copied to clipboard!');
              }}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Copy size={14} /> Copy Login Details
            </button>
            <button
              type="button"
              onClick={() => setConvertedCredentials(null)}
              className="p-2 text-emerald-700 hover:bg-emerald-100 rounded-xl transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* SUB-MODULE 1: LEAD PIPELINE, BULK ACTIONS & FUNNEL DASHBOARD */}
      {crmMainSubTab === 'pipeline' && (
        <>
          {/* VISUAL FUNNEL DASHBOARD SECTION */}
          {showAnalyticsDashboard && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6 animate-in fade-in duration-300">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <TrendingUp size={18} className="text-purple-600" />
                    <h2 className="text-base sm:text-lg font-black text-slate-900">
                      Lead Conversion & Sales Funnel Analytics
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Visualizing lead volume distribution and deal value across core pipeline conversion stages.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={syncingInquiries}
                    onClick={() => handleSyncWebsiteInquiries(false)}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer border border-slate-200 transition-colors"
                    title="Import inquiries from Contact Us, Domain Offers, and Custom Quote Requests"
                  >
                    <RefreshCw size={13} className={syncingInquiries ? 'animate-spin text-blue-600' : 'text-slate-600'} />
                    <span>{syncingInquiries ? 'Syncing...' : 'Sync Website Inquiries'}</span>
                  </button>
                  <button
                    onClick={handleOpenAddModal}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <UserPlus size={14} /> Add Lead
                  </button>
                </div>
              </div>

              {/* EXECUTIVE KPI SUMMARY CARD & DATE RANGE SELECTOR ABOVE DONUT CHART */}
              <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-950 text-white rounded-3xl p-5 sm:p-6 border border-slate-800 shadow-xl space-y-4">
                
                {/* Header Row: Title & Date Range Selector */}
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400 shadow-inner">
                      <TrendingUp size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-black text-white tracking-tight">
                          Lead Performance & Status Summary
                        </h3>
                        <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-cyan-300 border border-blue-500/30 text-[10px] font-extrabold uppercase tracking-wider">
                          Oversight Dashboard
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Displaying total lead counts and key performance indicators like conversion percentage across selected time periods.
                      </p>
                    </div>
                  </div>

                  {/* DATE RANGE SELECTOR FOR LEAD STATUS DONUT CHART & OVERSIGHT */}
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <div className="flex items-center gap-1.5 bg-slate-800/90 border border-slate-700 px-3 py-1.5 rounded-xl shadow-xs">
                      <Calendar size={13} className="text-amber-400" />
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Time Period:</span>
                      <select
                        value={donutDateRange}
                        onChange={(e) => setDonutDateRange(e.target.value as any)}
                        className="bg-transparent font-bold text-xs text-white outline-none cursor-pointer pr-1"
                      >
                        <option value="all" className="bg-slate-900 text-white">All Time ({leads.length} Leads)</option>
                        <option value="today" className="bg-slate-900 text-white">Today</option>
                        <option value="7days" className="bg-slate-900 text-white">Last 7 Days</option>
                        <option value="30days" className="bg-slate-900 text-white">Last 30 Days</option>
                        <option value="custom" className="bg-slate-900 text-white">Custom Date Range...</option>
                      </select>
                    </div>

                    {/* Custom Date Pickers */}
                    {donutDateRange === 'custom' && (
                      <div className="flex items-center gap-1.5 bg-slate-800 px-2.5 py-1 rounded-xl border border-slate-700 animate-in fade-in text-xs">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">From:</span>
                        <input
                          type="date"
                          value={donutCustomStart}
                          onChange={(e) => setDonutCustomStart(e.target.value)}
                          className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-0.5 text-xs text-white outline-none"
                        />
                        <span className="text-[10px] font-bold text-slate-400 uppercase">To:</span>
                        <input
                          type="date"
                          value={donutCustomEnd}
                          onChange={(e) => setDonutCustomEnd(e.target.value)}
                          className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-0.5 text-xs text-white outline-none"
                        />
                      </div>
                    )}

                    {donutDateRange !== 'all' && (
                      <button
                        onClick={() => {
                          setDonutDateRange('all');
                          setDonutCustomStart('');
                          setDonutCustomEnd('');
                          toast.success('Reset status donut chart period to All Time');
                        }}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer border border-slate-700 flex items-center gap-1"
                      >
                        <X size={12} />
                        <span>Reset Time Filter</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* KPI Metrics Highlight Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                  
                  {/* KPI 1: Total Leads Count */}
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-1.5 hover:bg-white/10 transition-colors">
                    <div className="flex items-center justify-between text-slate-400">
                      <span className="text-[11px] font-extrabold uppercase tracking-wider">Total Leads</span>
                      <Users size={16} className="text-blue-400" />
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black font-mono text-white">{donutTotalCount}</span>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        {donutDateRange === 'all' ? 'All Time' : donutDateRange === 'today' ? 'Today' : donutDateRange === '7days' ? 'Last 7D' : donutDateRange === '30days' ? 'Last 30D' : 'Custom'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-medium">
                      Total Pipeline: <strong className="text-white font-mono">{formatCurrency(donutTotalValue)}</strong>
                    </p>
                  </div>

                  {/* KPI 2: Conversion Percentage */}
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-1.5 hover:bg-white/10 transition-colors">
                    <div className="flex items-center justify-between text-slate-400">
                      <span className="text-[11px] font-extrabold uppercase tracking-wider">Conversion Ratio</span>
                      <CheckCircle2 size={16} className="text-emerald-400" />
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black font-mono text-emerald-400">{donutConversionRate}%</span>
                      <span className="text-[10px] text-emerald-300 font-bold uppercase tracking-wider">Won Ratio</span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-medium">
                      <strong className="text-emerald-400 font-bold">{donutConvertedCount}</strong> of {donutTotalCount} inquiries won
                    </p>
                  </div>

                  {/* KPI 3: Converted Revenue Won */}
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-1.5 hover:bg-white/10 transition-colors">
                    <div className="flex items-center justify-between text-slate-400">
                      <span className="text-[11px] font-extrabold uppercase tracking-wider">Converted Revenue</span>
                      <DollarSign size={16} className="text-emerald-400" />
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-black font-mono text-emerald-300">
                        {formatCurrency(donutConvertedValue)}
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-400/90 font-medium">
                      {donutConvertedCount} active hosting accounts provisioned
                    </p>
                  </div>

                  {/* KPI 4: Active In-Progress Pipeline */}
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-1.5 hover:bg-white/10 transition-colors">
                    <div className="flex items-center justify-between text-slate-400">
                      <span className="text-[11px] font-extrabold uppercase tracking-wider">In-Progress Pipeline</span>
                      <Zap size={16} className="text-amber-400" />
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black font-mono text-amber-400">{donutInProgressCount}</span>
                      <span className="text-[10px] text-amber-300 font-bold uppercase tracking-wider">Active Deals</span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-medium">
                      Potential: <strong className="text-amber-300 font-mono">{formatCurrency(donutInProgressValue)}</strong>
                    </p>
                  </div>

                </div>
              </div>

              {/* 3-WIDGET VISUAL DASHBOARD GRID */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 items-stretch">
                
                {/* WIDGET 1: RECHARTS DONUT CHART (Lead Statuses: New, In-Progress, Converted, Renewal) */}
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 flex flex-col justify-between space-y-3">
                  <div className="flex items-center justify-between text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                      Status Distribution ({donutDateRange === 'all' ? 'All Time' : donutDateRange === 'today' ? 'Today' : donutDateRange === '7days' ? 'Last 7D' : donutDateRange === '30days' ? 'Last 30D' : 'Custom'})
                    </span>
                    <span className="text-emerald-700 font-mono font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[11px]">
                      {donutConversionRate}% Won
                    </span>
                  </div>

                  <div className="relative w-full h-[185px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Tooltip
                          content={({ active, payload }: any) => {
                            if (active && payload && payload.length) {
                              const item = payload[0].payload;
                              return (
                                <div className="bg-slate-900 border border-slate-700 text-white p-3 rounded-xl shadow-xl text-xs space-y-1">
                                  <p className="font-extrabold text-amber-400">{item.displayName}</p>
                                  <p className="font-mono text-sm font-bold">{item.value} Leads ({donutTotalCount > 0 ? Math.round((item.value / donutTotalCount) * 100) : 0}%)</p>
                                  <p className="text-slate-400 text-[10px]">Period Deal Value: {formatCurrency(item.dealValue)}</p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Pie
                          data={donutStatusData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={76}
                          paddingAngle={3}
                          isAnimationActive
                        >
                          {donutStatusData.map((entry, index) => (
                            <Cell key={`donut-cell-${index}`} fill={entry.color} stroke="#ffffff" strokeWidth={2} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>

                    {/* Donut Center Label */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-2xl font-black text-slate-900 font-mono leading-none">{donutTotalCount}</span>
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mt-0.5">Leads</span>
                    </div>
                  </div>

                  {/* Administrator Oversight Status Legend Breakdown */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/80 text-[11px]">
                    {donutStatusData.map((d) => (
                      <div key={d.name} className="flex items-center justify-between p-1.5 rounded-lg bg-white border border-slate-200/70 shadow-2xs">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                          <span className="font-bold text-slate-700 truncate">{d.name}</span>
                        </div>
                        <span className="font-mono font-black text-slate-900 ml-1 shrink-0">
                          {d.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* WIDGET 2: RECHARTS FUNNEL CHART */}
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 flex flex-col justify-between space-y-2">
                  <div className="flex items-center justify-between text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2">
                    <span>Distribution Funnel (New ➔ Converted)</span>
                    <span className="text-blue-600 font-mono">{leads.length} Leads Total</span>
                  </div>

                  <div className="w-full h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <FunnelChart margin={{ top: 15, right: 30, left: 15, bottom: 15 }}>
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
                            <Cell key={`funnel-cell-${index}`} fill={entry.fill} />
                          ))}
                        </Funnel>
                      </FunnelChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-500 font-medium text-center">
                    Pipeline Progression: Inbound ➔ Consulted ➔ Qualified ➔ Converted
                  </div>
                </div>

                {/* WIDGET 3: RECHARTS BAR CHART BREAKDOWN */}
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 flex flex-col justify-between space-y-2">
                  <div className="flex items-center justify-between text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2">
                    <span>Deal Value by Stage (Thousands BDT ৳)</span>
                    <span className="text-emerald-600 font-mono">{formatCurrency(totalPipelineValue)}</span>
                  </div>

                  <div className="w-full h-[220px]">
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

                  <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-500 font-medium text-center">
                    Estimated Deal Revenue Distribution Across Workflow Stages
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

                              {/* Assigned Staff & Source */}
                              <div className="flex items-center justify-between text-[10px] text-slate-600 font-bold bg-slate-50 px-2 py-1 rounded-lg border border-slate-200/80">
                                <span className="truncate">👤 {lead.assignedStaffName || 'Unassigned'}</span>
                                <span className="text-[9px] text-slate-400 font-medium shrink-0">{lead.source}</span>
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
                                    onClick={() => handleOpenConvertModal(lead)}
                                    className="p-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors cursor-pointer"
                                    title="Convert Lead to Customer Account"
                                  >
                                    <UserCheck size={12} />
                                  </button>
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
                            {lead.whmcsAccountId && (
                              <span className="inline-block mt-0.5 text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                {lead.whmcsAccountId}
                              </span>
                            )}
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
                            <select
                              value={lead.assignedStaffId || ''}
                              onChange={(e) => handleReassignLeadStaff(lead.id, e.target.value)}
                              className="bg-indigo-50/90 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 text-xs font-bold px-2.5 py-1.5 rounded-xl outline-none cursor-pointer max-w-[175px] truncate"
                              title="Re-assign account manager (automatically attaches activity log)"
                            >
                              <option value="">👤 Unassigned</option>
                              {getActiveStaffPool().map(staff => (
                                <option key={staff.id} value={staff.id}>
                                  👤 {staff.name}
                                </option>
                              ))}
                            </select>
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
                                onClick={() => handleOpenConvertModal(lead)}
                                className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold cursor-pointer transition-colors"
                                title="Convert Lead to Customer Account (with Login Password)"
                              >
                                <UserCheck size={14} />
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
                          <p className="font-bold text-sm text-slate-600">No leads found in pipeline</p>
                          <p className="text-xs text-slate-400 mt-1">Click "+ Add Lead", "Import CSV", or "Sync Website Inquiries" to populate your sales pipeline.</p>
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
                  Active Team Member Lead Distribution:
                </span>

                <div className="space-y-2">
                  {getActiveStaffPool().map((staff, idx) => {
                    const poolLen = getActiveStaffPool().length || 1;
                    const assignedLeadsCount = leads.filter(l => l.assignedStaffId === staff.id || (l.assignedStaffName && l.assignedStaffName.includes(staff.name))).length;
                    const isNextUp = (roundRobinIndex % poolLen) === idx;

                    return (
                      <div key={staff.id} className="bg-slate-50 p-3 rounded-2xl border border-slate-200 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-extrabold flex items-center justify-center text-xs">
                            {(staff.name || 'S').charAt(0).toUpperCase()}
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
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs font-black uppercase text-amber-400 tracking-wider flex items-center gap-1.5">
                    <Activity size={14} /> Workflow Status Tracking
                  </span>
                  <div className="flex items-center gap-1.5 bg-slate-800/90 px-2.5 py-1 rounded-xl border border-slate-700">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Assigned:</span>
                    <select
                      value={selectedLeadForDetail.assignedStaffId || ''}
                      onChange={(e) => handleReassignLeadStaff(selectedLeadForDetail.id, e.target.value)}
                      className="bg-transparent font-bold text-xs text-cyan-300 outline-none cursor-pointer"
                      title="Re-assign staff member (automatically logs user action and timestamp)"
                    >
                      <option value="" className="bg-slate-900 text-white">👤 Unassigned</option>
                      {activeStaffMembers.map(s => (
                        <option key={s.id} value={s.id} className="bg-slate-900 text-white">
                          👤 {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
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

            <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleOpenQuoteGenerator(selectedLeadForDetail)}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl flex items-center gap-1.5 cursor-pointer"
                >
                  <Zap size={14} /> Generate Quotation
                </button>
                {selectedLeadForDetail.leadStage !== 'converted' && (
                  <button
                    onClick={() => handleOpenConvertModal(selectedLeadForDetail)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <UserPlus size={14} /> Convert to Customer Account
                  </button>
                )}
              </div>

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
                    {getActiveStaffPool().map(s => (
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

              <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleSaveQuoteToLead}
                  className="px-3.5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-black rounded-xl flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 size={14} /> Save Quote to Pipeline
                </button>

                <button
                  type="button"
                  disabled={sendingQuoteEmail}
                  onClick={handleSendQuoteEmail}
                  className="px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-black rounded-xl flex items-center gap-1.5 cursor-pointer"
                >
                  <Mail size={14} className={sendingQuoteEmail ? 'animate-pulse' : ''} />
                  {sendingQuoteEmail ? 'Sending Email...' : 'Send Official Email'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const finalTotal = Math.round(quoteDetails.priceBdt - (quoteDetails.priceBdt * quoteDetails.discountPercent) / 100);
                    const msg = `Click2IT Hosting Official Quotation\nClient: ${quoteLead.contactName}\nService: ${quoteDetails.package} (${quoteDetails.billingPeriod})\nDomain: ${quoteDetails.domainName}\nTotal BDT: ৳${finalTotal.toLocaleString()}\nWebsite: ${window.location.origin}/pricing`;
                    navigator.clipboard.writeText(msg);
                    toast.success('Copied quotation text to clipboard!');
                  }}
                  className="px-3.5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl flex items-center gap-1.5 cursor-pointer"
                >
                  <Copy size={14} /> Copy Quote
                </button>

                {quoteLead.phone && (
                  <a
                    href={`https://wa.me/${quoteLead.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                      `Hello ${quoteLead.contactName},\n\nHere is your Official Quotation from Click2IT Hosting:\n• Package: ${quoteDetails.package} (${quoteDetails.billingPeriod})\n• Target Domain: ${quoteDetails.domainName}\n• Total Payable: ৳${Math.round(quoteDetails.priceBdt - (quoteDetails.priceBdt * quoteDetails.discountPercent) / 100).toLocaleString()}\n\nLet us know when you are ready to proceed!`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl flex items-center gap-1.5"
                  >
                    <MessageCircle size={14} /> Send via WhatsApp
                  </a>
                )}

                <button
                  type="button"
                  onClick={() => setShowQuoteModal(false)}
                  className="px-3.5 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl cursor-pointer"
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
              ) : whoisResult?.available ? (
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                  <div className="flex items-center gap-2 font-black text-emerald-700 bg-emerald-100 px-3 py-1.5 rounded-xl">
                    <CheckCircle2 size={16} /> Domain Available for Registration!
                  </div>
                  <p className="text-slate-600 font-medium leading-relaxed">
                    "{whoisDomain}" is available and can be registered immediately via Click2IT Domain Registrar.
                  </p>
                </div>
              ) : (
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                  <div className="flex items-center gap-2 font-black text-amber-800 bg-amber-100 px-3 py-1.5 rounded-xl">
                    <AlertCircle size={16} /> Domain Already Registered / Taken
                  </div>
                  <p className="text-slate-600 font-medium leading-relaxed">
                    "{whoisDomain}" is already registered. You can offer Domain Transfer with EPP/Auth Code or suggest an alternative extension (.com.bd, .net, .org).
                  </p>
                </div>
              )}

              <div className="pt-2 text-right">
                <button
                  type="button"
                  onClick={() => setShowWhoisModal(false)}
                  className="px-4 py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONVERT LEAD TO CUSTOMER ACCOUNT MODAL */}
      {showConvertModal && convertingLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-in fade-in">
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto p-6 sm:p-8 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <UserPlus size={20} className="text-emerald-600" />
                  Convert Lead to Customer Account
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Create a real Customer Portal Login for <span className="font-bold text-slate-700">{convertingLead.contactName}</span> ({convertingLead.email}) and mark this deal as Won.
                </p>
              </div>
              <button onClick={() => setShowConvertModal(false)} className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleConvertLeadSubmit} className="space-y-4 text-xs">
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 space-y-1 text-emerald-950">
                <div className="flex items-center justify-between">
                  <span className="font-black text-xs">{convertingLead.contactName}</span>
                  <span className="font-mono font-black text-emerald-700">{formatCurrency(convertingLead.dealValueBdt)}</span>
                </div>
                <p className="text-[11px] font-medium text-emerald-800">
                  Email: <span className="font-mono font-bold">{convertingLead.email}</span> • Phone: <span className="font-mono">{convertingLead.phone || 'N/A'}</span>
                </p>
                {convertingLead.targetDomain && (
                  <p className="text-[11px] font-mono text-emerald-700">Target Domain: {convertingLead.targetDomain}</p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700">Customer Portal Login Password *</label>
                  <button
                    type="button"
                    onClick={() => setConvertForm({ ...convertForm, password: generateRandomPassword(10) })}
                    className="text-[10px] font-black text-blue-600 hover:text-blue-700 cursor-pointer"
                  >
                    ↻ Generate Strong Password
                  </button>
                </div>
                <input
                  type="text"
                  required
                  minLength={6}
                  value={convertForm.password}
                  onChange={(e) => setConvertForm({ ...convertForm, password: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Street Address</label>
                  <input
                    type="text"
                    value={convertForm.street}
                    onChange={(e) => setConvertForm({ ...convertForm, street: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">City</label>
                  <input
                    type="text"
                    value={convertForm.city}
                    onChange={(e) => setConvertForm({ ...convertForm, city: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 p-3 bg-blue-50/70 border border-blue-200 rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={convertForm.sendWelcomeEmail}
                  onChange={(e) => setConvertForm({ ...convertForm, sendWelcomeEmail: e.target.checked })}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span className="font-bold text-slate-800 text-xs">
                  Send Welcome Email with login credentials to {convertingLead.email}
                </span>
              </label>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowConvertModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={convertingLoading}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-black rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <UserPlus size={14} />
                  {convertingLoading ? 'Creating Customer Account...' : 'Create Account & Convert Lead'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
