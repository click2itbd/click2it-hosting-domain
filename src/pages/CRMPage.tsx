import React, { useState, useEffect, useRef } from 'react';
import { collection, getDocs, query, orderBy, addDoc, updateDoc, deleteDoc, doc, limit } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Audience, Lead } from '../types';
import { Users, Bot, MessageCircle, Share2, Search, Zap, Plus, X, Pencil, Trash2, UserCheck, Sparkles, Download, Upload, Calendar, Phone, Mail, Settings, Send, LayoutDashboard, Target, Workflow, Megaphone, ListFilter, QrCode } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { getApiUrl } from '../services/apiClient';
import Papa from 'papaparse';
import { saveAs } from 'file-saver';
import QRCode from 'react-qr-code';
import DOMPurify from 'dompurify';

const WISH_TEMPLATES = [
  { id: 'happy_birthday', name: 'Happy Birthday', content: 'Happy Birthday {name}! Wishing you a fantastic day and a wonderful year ahead.' },
  { id: 'happy_anniversary', name: 'Happy Anniversary', content: 'Happy Anniversary {name}! Congratulations on this special day.' },
  { id: 'warm_wishes', name: 'Warm Wishes', content: 'Dear {name}, sending you warm wishes on this special occasion.' }
];

// Simplified helper for this context
const handleFirestoreError = (error: any, operationType: string, path: string) => {
  console.error(`Firestore Error [${operationType}] at ${path}:`, error);
  toast.error(`Permission denied: Unable to ${operationType} leads.`);
  throw error;
};

export const CRMPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'leads' | 'pipeline' | 'audiences' | 'whatsapp'>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [audiences, setAudiences] = useState<Audience[]>([]);
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState(() => {
    const saved = localStorage.getItem('wish_templates');
    return saved ? JSON.parse(saved) : WISH_TEMPLATES;
  });
  const [campaignTemplates, setCampaignTemplates] = useState(() => {
    const saved = localStorage.getItem('campaign_templates');
    return saved ? JSON.parse(saved) : [{ id: 'promo_1', name: 'Summer Promo', content: '<html><body><h1>Summer Special!</h1><p>Dear {name}, enjoy 50% off.</p></body></html>' }];
  });
  const [upcomingView, setUpcomingView] = useState<'list' | 'settings'>('list');
  const [isAddingAudience, setIsAddingAudience] = useState(false);
  const [newAudience, setNewAudience] = useState<Partial<Audience>>({
    name: '',
    description: '',
    filterCriteria: { source: '', status: '', keyword: '' }
  });
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [isAddingLead, setIsAddingLead] = useState(false);
  const [showUpcoming, setShowUpcoming] = useState(false);
  const [showCampaign, setShowCampaign] = useState(false);
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [showQRCode, setShowQRCode] = useState(false);
  const [qrValue, setQrValue] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState(templates[0]?.id || '');
  const [selectedCampaignTemplateId, setSelectedCampaignTemplateId] = useState(campaignTemplates[0]?.id || '');
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [newLeadFormData, setNewLeadFormData] = useState<Partial<Lead>>({ 
    leadOwner: '', title: '', firstName: '', lastName: '', company: '', email: '', secondaryEmail: '', phone: '', mobile: '', 
    fax: '', website: '', industry: '', noOfEmployees: '', rating: '', skypeId: '', twitter: '', annualRevenue: 0, 
    emailOptOut: false, address: {}, dob: '', anniversary: '', source: 'manual', status: 'new', aiSummary: '', description: '' 
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [leadFormData, setLeadFormData] = useState<Partial<Lead>>({ 
    leadOwner: '', title: '', firstName: '', lastName: '', company: '', email: '', secondaryEmail: '', phone: '', mobile: '', 
    fax: '', website: '', industry: '', noOfEmployees: '', rating: '', skypeId: '', twitter: '', annualRevenue: 0, 
    emailOptOut: false, address: {}, dob: '', anniversary: '', source: 'manual', status: 'new', aiSummary: '', description: '' 
  });
  
    const socialLeadsCount = leads.filter(l => ['social', 'facebook', 'instagram', 'twitter', 'linkedin'].includes(l.source?.toLowerCase() || '')).length;
  const whatsappLeadsCount = leads.filter(l => l.source?.toLowerCase().includes('whatsapp')).length;
  const webLeadsCount = leads.filter(l => ['web', 'web_form', 'floating live_chat', 'web chat'].includes(l.source?.toLowerCase() || '')).length;
  const googleAdsLeadsCount = leads.filter(l => l.source?.toLowerCase().includes('google')).length;

  const filteredLeads = leads.filter(l => 
      l.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
      l.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.phone?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const exportLeads = () => {
    const csv = Papa.unparse(leads.map(({ id, aiSummary, ...rest }) => rest));
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, 'leads.csv');
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          for (const data of results.data as any[]) {
             await addDoc(collection(db, 'leads'), {
               ...data,
               createdAt: new Date().toISOString(),
             });
          }
          toast.success('Leads imported successfully');
          fetchLeads();
        } catch (e) {
          toast.error('Error importing leads');
        }
      }
    });
  };

  const downloadExample = () => {
    const exampleLeads = [{ firstName: 'John', lastName: 'Doe', company: 'Acme', email: 'john@acme.com', phone: '1234567890', mobile: '1234567890', industry: 'tech', source: 'manual', status: 'new' }];
    const csv = Papa.unparse(exampleLeads);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, 'example_leads.csv');
  };

  useEffect(() => {
    fetchLeads();
    fetchAudiences();
  }, []);

  const fetchAudiences = async () => {
    try {
      const q = query(collection(db, 'audiences'), orderBy('createdAt', 'desc'), limit(200));
      const snapshot = await getDocs(q);
      setAudiences(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Audience)));
    } catch (e) {
      console.error(e);
    }
  };

  const fetchLeads = async () => {
    try {
      const q = query(collection(db, 'leads'), orderBy('createdAt', 'desc'), limit(200));
      const snapshot = await getDocs(q);
      setLeads(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lead)));
    } catch (e) {
      handleFirestoreError(e, 'read', 'leads');
    } finally {
      setLoading(false);
    }
  };

  const handleAddLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeadFormData.email || !newLeadFormData.mobile) {
      toast.error('Email and Mobile are required.');
      return;
    }
    const isDuplicate = leads.some(lead => lead.email === newLeadFormData.email || lead.mobile === newLeadFormData.mobile);
    if (isDuplicate) {
      toast.error('A lead with this email or mobile already exists.');
      return;
    }
    try {
      await addDoc(collection(db, 'leads'), {
        ...newLeadFormData,
        createdAt: new Date().toISOString(),
      });
      toast.success('Lead added successfully');
      setIsAddingLead(false);
      setNewLeadFormData({ firstName: '', lastName: '', company: '', email: '', phone: '', mobile: '', industry: '', source: 'manual', status: 'new', aiSummary: '', description: '' });
      fetchLeads();
    } catch (e) {
      handleFirestoreError(e, 'write', 'leads');
    }
  };

  const handleAddAudience = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAudience.name) return;
    try {
      await addDoc(collection(db, 'audiences'), {
        ...newAudience,
        createdAt: new Date().toISOString(),
      });
      toast.success('Audience created successfully');
      setIsAddingAudience(false);
      setNewAudience({ name: '', description: '', filterCriteria: { source: '', status: '', keyword: '' } });
      fetchAudiences();
    } catch (e) {
      toast.error('Failed to create audience');
    }
  };

  const handleDeleteAudience = async (id: string) => {
    if (!window.confirm('Delete audience?')) return;
    try {
      await deleteDoc(doc(db, 'audiences', id));
      fetchAudiences();
    } catch (e) {
      toast.error('Failed to delete audience');
    }
  };

  const handleUpdateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLead) return;
    try {
      await updateDoc(doc(db, 'leads', editingLead.id), {
        ...leadFormData
      });
      toast.success('Lead updated successfully');
      setEditingLead(null);
      fetchLeads();
    } catch (e) {
      handleFirestoreError(e, 'update', `leads/${editingLead.id}`);
    }
  };

  const handleDeleteLead = async (id: string) => {
    if (!confirm('Are you sure you want to delete this lead?')) return;
    try {
      await deleteDoc(doc(db, 'leads', id));
      toast.success('Lead deleted successfully');
      fetchLeads();
    } catch (e) {
      handleFirestoreError(e, 'delete', `leads/${id}`);
    }
  };

  const handleConvertLeadToCustomer = async (lead: Lead) => {
    if (!confirm(`Convert ${lead.firstName} ${lead.lastName} to a customer?`)) return;
    try {
      await addDoc(collection(db, 'customers'), {
        name: `${lead.firstName} ${lead.lastName}`,
        email: lead.email,
        phone: lead.phone,
        address: '',
        createdAt: new Date().toISOString(),
      });
      await deleteDoc(doc(db, 'leads', lead.id));
      toast.success('Lead converted to customer successfully');
      fetchLeads();
    } catch (e) {
      handleFirestoreError(e, 'convert', `leads/${lead.id}`);
    }
  };

  const analyzeLead = async (lead: Lead) => {
      const prompt = `Analyze this lead and provide a brief summary and potential insights for sales:
      Name: ${lead.firstName} ${lead.lastName}
      Company: ${lead.company}
      Source: ${lead.source}
      Industry: ${lead.industry}
      Description: ${lead.description}

      Keep the summary under 50 words.`;
      
      try {
          const response = await fetch(getApiUrl('/api/ai/chat'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: prompt }),
          });
          const data = await response.json();
          if (!response.ok) {
            throw new Error(data.error || 'AI service error');
          }
          
          await updateDoc(doc(db, 'leads', lead.id), {
              aiSummary: data.reply
          });
          toast.success('Lead analyzed!');
          fetchLeads();
      } catch (e) {
          console.error(e);
          toast.error('AI Analysis failed');
      }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Zap className="text-amber-500" /> Customer Relationship Management
        </h2>
        <div className="flex gap-2">
          <input type="file" ref={fileInputRef} className="hidden" onChange={handleImport} accept=".csv" />
          <button onClick={downloadExample} className="text-gray-600 px-4 py-2 rounded font-bold text-sm flex items-center gap-2 border">Example CSV</button>
          <button onClick={() => setShowUpcoming(true)} className="text-gray-600 px-4 py-2 rounded font-bold text-sm flex items-center gap-2 border">
            <Calendar size={16} /> Upcoming
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="text-gray-600 px-4 py-2 rounded font-bold text-sm flex items-center gap-2 border">
            <Upload size={16} /> Import
          </button>
          <button onClick={exportLeads} className="text-gray-600 px-4 py-2 rounded font-bold text-sm flex items-center gap-2 border">
            <Download size={16} /> Export
          </button>
          <button onClick={() => toast("Browser Scraper integration coming soon!")} className="bg-indigo-600 text-white px-4 py-2 rounded font-bold text-sm flex items-center gap-2">
            <Bot size={16} /> Browser Scraper
          </button>
          <button onClick={() => setIsAddingLead(true)} className="bg-[#081621] text-white px-4 py-2 rounded font-bold text-sm flex items-center gap-2 hover:bg-[#EF4444] transition-all">
            <Plus size={16} /> Add New Lead
          </button>
        </div>
      </div>
      
      {/* Lead Add Modal */}
      {isAddingLead && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
             <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">Add New Lead</h3>
              <button onClick={() => setIsAddingLead(false)}><X size={20} /></button>
             </div>
              <form onSubmit={handleAddLead} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase">Lead Owner</label>
                    <input type="text" value={newLeadFormData.leadOwner} onChange={e => setNewLeadFormData({...newLeadFormData, leadOwner: e.target.value})} className="w-full border-gray-200 rounded text-sm p-2" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase">Title</label>
                    <input type="text" value={newLeadFormData.title} onChange={e => setNewLeadFormData({...newLeadFormData, title: e.target.value})} className="w-full border-gray-200 rounded text-sm p-2" />
                  </div>
                </div>
               <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase">First Name</label>
                    <input type="text" required value={newLeadFormData.firstName} onChange={e => setNewLeadFormData({...newLeadFormData, firstName: e.target.value})} className="w-full border-gray-200 rounded text-sm p-2" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase">Last Name</label>
                    <input type="text" required value={newLeadFormData.lastName} onChange={e => setNewLeadFormData({...newLeadFormData, lastName: e.target.value})} className="w-full border-gray-200 rounded text-sm p-2" />
                  </div>
               </div>
               <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase">Company</label>
                  <input type="text" value={newLeadFormData.company} onChange={e => setNewLeadFormData({...newLeadFormData, company: e.target.value})} className="w-full border-gray-200 rounded text-sm p-2" />
                </div>
               <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase">Email</label>
                    <input type="email" required value={newLeadFormData.email} onChange={e => setNewLeadFormData({...newLeadFormData, email: e.target.value})} className="w-full border-gray-200 rounded text-sm p-2" />
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase">Secondary Email</label>
                    <input type="email" value={newLeadFormData.secondaryEmail} onChange={e => setNewLeadFormData({...newLeadFormData, secondaryEmail: e.target.value})} className="w-full border-gray-200 rounded text-sm p-2" />
                 </div>
               </div>
               <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase">Phone</label>
                    <input type="text" value={newLeadFormData.phone} onChange={e => setNewLeadFormData({...newLeadFormData, phone: e.target.value})} className="w-full border-gray-200 rounded text-sm p-2" />
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase">Mobile</label>
                    <input type="text" required value={newLeadFormData.mobile} onChange={e => setNewLeadFormData({...newLeadFormData, mobile: e.target.value})} className="w-full border-gray-200 rounded text-sm p-2" />
                 </div>
               </div>
               <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase">Fax</label>
                    <input type="text" value={newLeadFormData.fax} onChange={e => setNewLeadFormData({...newLeadFormData, fax: e.target.value})} className="w-full border-gray-200 rounded text-sm p-2" />
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase">Website</label>
                    <input type="text" value={newLeadFormData.website} onChange={e => setNewLeadFormData({...newLeadFormData, website: e.target.value})} className="w-full border-gray-200 rounded text-sm p-2" />
                 </div>
               </div>
               <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase">Industry</label>
                    <input type="text" value={newLeadFormData.industry} onChange={e => setNewLeadFormData({...newLeadFormData, industry: e.target.value})} className="w-full border-gray-200 rounded text-sm p-2" />
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase">No. of Employees</label>
                    <input type="text" value={newLeadFormData.noOfEmployees} onChange={e => setNewLeadFormData({...newLeadFormData, noOfEmployees: e.target.value})} className="w-full border-gray-200 rounded text-sm p-2" />
                 </div>
               </div>
               <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase">Rating</label>
                    <input type="text" value={newLeadFormData.rating} onChange={e => setNewLeadFormData({...newLeadFormData, rating: e.target.value})} className="w-full border-gray-200 rounded text-sm p-2" />
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase">Annual Revenue</label>
                    <input type="number" value={newLeadFormData.annualRevenue} onChange={e => setNewLeadFormData({...newLeadFormData, annualRevenue: parseInt(e.target.value)})} className="w-full border-gray-200 rounded text-sm p-2" />
                 </div>
               </div>
               <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase">Facebook ID</label>
                    <input type="text" value={newLeadFormData.skypeId} onChange={e => setNewLeadFormData({...newLeadFormData, skypeId: e.target.value})} className="w-full border-gray-200 rounded text-sm p-2" />
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase">LinkedIn</label>
                    <input type="text" value={newLeadFormData.twitter} onChange={e => setNewLeadFormData({...newLeadFormData, twitter: e.target.value})} className="w-full border-gray-200 rounded text-sm p-2" />
                 </div>
               </div>
               <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase">Date of Birth</label>
                    <input type="date" value={newLeadFormData.dob} onChange={e => setNewLeadFormData({...newLeadFormData, dob: e.target.value})} className="w-full border-gray-200 rounded text-sm p-2" />
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase">Anniversary</label>
                    <input type="date" value={newLeadFormData.anniversary} onChange={e => setNewLeadFormData({...newLeadFormData, anniversary: e.target.value})} className="w-full border-gray-200 rounded text-sm p-2" />
                 </div>
               </div>
               <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={newLeadFormData.emailOptOut} onChange={e => setNewLeadFormData({...newLeadFormData, emailOptOut: e.target.checked})} />
                    <span className="text-sm font-bold text-gray-500 uppercase">Email Opt Out</span>
                  </label>
               </div>
               <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase">Source</label>
                  <select value={newLeadFormData.source} onChange={e => setNewLeadFormData({...newLeadFormData, source: e.target.value as any})} className="w-full border-gray-200 rounded text-sm p-2">
                    <option value="manual">Manual</option>
                    <option value="web_form">Web Form</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="social">Social</option>
                    <option value="google_ads">Google Ads</option>
                  </select>
               </div>
               <button type="submit" className="w-full bg-[#081621] text-white py-2 rounded font-bold text-sm">Save Lead</button>
             </form>
          </div>
        </div>
      )}

      {/* Campaign Modal */}
      {showCampaign && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
             <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">Send Campaign</h3>
              <button onClick={() => setShowCampaign(false)}><X size={20} /></button>
             </div>
             <div className="mb-4">
                <label className="block text-xs font-bold text-gray-500 uppercase">Select Campaign Template</label>
                <select value={selectedCampaignTemplateId} onChange={e => setSelectedCampaignTemplateId(e.target.value)} className="w-full border-gray-200 rounded text-sm p-2">
                    {campaignTemplates.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
             </div>
              <div className="bg-gray-50 p-4 rounded mb-4 max-h-64 overflow-y-auto text-sm" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(campaignTemplates.find((t:any) => t.id === selectedCampaignTemplateId)?.content || '') }} />
             <button onClick={() => {
                 const template = campaignTemplates.find((t:any) => t.id === selectedCampaignTemplateId);
                 if (template) {
                     const selectedLeadObjs = leads.filter(l => selectedLeads.has(l.id));
                     selectedLeadObjs.forEach(lead => {
                         const message = template.content.replace(/{name}/g, `${lead.firstName} ${lead.lastName}`);
                         
                     });
                     toast.success(`Campaign sent to ${selectedLeads.size} leads.`);
                     setShowCampaign(false);
                     setSelectedLeads(new Set());
                 }
             }} className="w-full bg-indigo-600 text-white py-2 rounded font-bold text-sm">Send Campaign</button>
          </div>
        </div>
      )}

      {/* Broadcast Modal */}
      {showBroadcast && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
             <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg flex items-center gap-2"><MessageCircle size={20} className="text-emerald-500" /> WhatsApp Broadcast</h3>
              <button onClick={() => setShowBroadcast(false)}><X size={20} /></button>
             </div>
             <p className="text-sm text-gray-500 mb-4">
               WhatsApp broadcast feature allows you to send the same message to multiple contacts simultaneously. Selected recipients ({selectedLeads.size}).
             </p>
             <div className="mb-4">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Message</label>
                <textarea 
                  value={broadcastMessage} 
                  onChange={e => setBroadcastMessage(e.target.value)} 
                  className="w-full border border-gray-300 rounded-md text-sm p-3 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  rows={6}
                  placeholder="Type your broadcast message here..."
                />
             </div>
             <button onClick={() => {
                 if (!broadcastMessage.trim()) {
                     toast.error("Please enter a message to broadcast.");
                     return;
                 }
                 if (selectedLeads.size === 0) {
                     toast.error("Please select at least one contact to broadcast.");
                     return;
                 }
                 const selectedLeadObjs = leads.filter(l => selectedLeads.has(l.id));
                 selectedLeadObjs.forEach(lead => {
                     
                 });
                 toast.success(`Broadcast message sent to ${selectedLeads.size} contacts.`);
                 setShowBroadcast(false);
                 setBroadcastMessage("");
                 setSelectedLeads(new Set());
             }} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-md font-bold text-sm transition-colors flex justify-center items-center gap-2">
               <Send size={16} /> Send Broadcast
             </button>
          </div>
        </div>
      )}

      {/* Upcoming Modal */}
      {showUpcoming && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
             <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">
                {upcomingView === 'list' ? 'Upcoming Birthdays & Anniversaries' : 'Template Settings'}
              </h3>
              <div className="flex gap-2">
                <button onClick={() => {
                   
                   setUpcomingView(upcomingView === 'list' ? 'settings' : 'list')
                }}>
                   {upcomingView === 'list' ? <Settings size={20} /> : <X size={20} />}
                </button>
                {upcomingView === 'list' && <button onClick={() => setShowUpcoming(false)}><X size={20} /></button>}
              </div>
             </div>

             {upcomingView === 'settings' ? (
                <div className="space-y-4">
                   {templates.map((t: any) => (
                      <div key={t.id} className="p-3 border rounded">
                        {editingTemplate?.id === t.id ? (
                           <div className="space-y-2">
                              <input value={editingTemplate.name} onChange={e => setEditingTemplate({...editingTemplate, name: e.target.value})} className="w-full border p-1 rounded text-sm"/>
                              <textarea value={editingTemplate.content} onChange={e => setEditingTemplate({...editingTemplate, content: e.target.value})} className="w-full border p-1 rounded text-sm" rows={3}/>
                              <div className="flex gap-2">
                                <button onClick={() => {
                                   const newTemplates = templates.map((tm: any) => tm.id === t.id ? editingTemplate : tm);
                                   setTemplates(newTemplates);
                                   localStorage.setItem('wish_templates', JSON.stringify(newTemplates));                
                                   setEditingTemplate(null);
                                   toast.success('Template updated');
                                }} className="bg-green-600 text-white px-2 py-1 rounded text-xs">Save</button>
                                <button onClick={() => setEditingTemplate(null)} className="bg-gray-200 px-2 py-1 rounded text-xs">Cancel</button>
                              </div>
                           </div>
                        ) : (
                           <div className="flex justify-between items-center">
                             <div>
                               <div className="font-bold text-sm">{t.name}</div>
                               <div className="text-xs text-gray-500 truncate">{t.content}</div>
                             </div>
                             <button onClick={() => setEditingTemplate(t)} className="text-blue-600">Edit</button>
                           </div>
                        )}
                      </div>
                   ))}
                </div>
             ) : (
             <>
             <div className="mb-4">
                <label className="block text-xs font-bold text-gray-500 uppercase">Select Template</label>
                <select value={selectedTemplateId} onChange={e => setSelectedTemplateId(e.target.value)} className="w-full border-gray-200 rounded text-sm p-2">
                    {templates.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
             </div>
             <div className="space-y-4 max-h-96 overflow-y-auto">
                <div>
                   <h4 className="font-bold text-sm mb-2">Upcoming Birthdays (This Month)</h4>
                   {leads.filter(l => l.dob && new Date(l.dob).getMonth() === new Date().getMonth()).length === 0 ? (
                      <p className="text-xs text-gray-500">No upcoming birthdays.</p>
                   ) : (
                      leads.filter(l => l.dob && new Date(l.dob).getMonth() === new Date().getMonth()).map(lead => (
                        <div key={lead.id} className="p-3 border rounded flex justify-between items-center">
                          <div>
                            <div className="font-bold">{lead.firstName} {lead.lastName}</div>
                            <div className="text-xs text-gray-500">DOB: {lead.dob}</div>
                          </div>
                          <button 
                            onClick={() => {
                              const template = templates.find((t: any) => t.id === selectedTemplateId);
                              if (template) {
                                const message = template.content.replace('{name}', `${lead.firstName} ${lead.lastName}`);
                                toast.success(`Wish sent to ${lead.firstName}: "${message}"`);
                              }
                            }}
                            className="text-xs bg-gray-100 px-2 py-1 rounded"
                          >
                            Send Wish
                          </button>
                        </div>
                      ))
                   )}
                </div>
                <div>
                   <h4 className="font-bold text-sm mb-2">Upcoming Anniversaries (This Month)</h4>
                   {leads.filter(l => l.anniversary && new Date(l.anniversary).getMonth() === new Date().getMonth()).length === 0 ? (
                      <p className="text-xs text-gray-500">No upcoming anniversaries.</p>
                   ) : (
                      leads.filter(l => l.anniversary && new Date(l.anniversary).getMonth() === new Date().getMonth()).map(lead => (
                        <div key={lead.id} className="p-3 border rounded flex justify-between items-center">
                          <div>
                            <div className="font-bold">{lead.firstName} {lead.lastName}</div>
                            <div className="text-xs text-gray-500">Anniv: {lead.anniversary}</div>
                          </div>
                          <button 
                            onClick={() => {
                              const template = templates.find((t: any) => t.id === selectedTemplateId);
                              if (template) {
                                const message = template.content.replace('{name}', `${lead.firstName} ${lead.lastName}`);
                                toast.success(`Wish sent to ${lead.firstName}: "${message}"`);
                              }
                            }}
                            className="text-xs bg-gray-100 px-2 py-1 rounded"
                          >
                            Send Wish
                          </button>
                        </div>
                      ))
                   )}
                </div>
             </div>
             </>
             )}
          </div>
        </div>
      )}

      <div className="flex border-b border-gray-200 mb-6 font-bold text-sm overflow-x-auto whitespace-nowrap">
          <button onClick={() => setActiveTab('overview')} className={`px-4 py-2 ${activeTab === 'overview' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500'}`}>Overview</button>
          <button onClick={() => setActiveTab('leads')} className={`px-4 py-2 ${activeTab === 'leads' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500'}`}>Lead Management</button>
          <button onClick={() => setActiveTab('pipeline')} className={`px-4 py-2 flex items-center gap-2 ${activeTab === 'pipeline' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500'}`}><LayoutDashboard size={16} /> Pipeline View</button>
          <button onClick={() => setActiveTab('audiences')} className={`px-4 py-2 flex items-center gap-2 ${activeTab === 'audiences' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500'}`}><ListFilter size={16} /> Audiences</button>
          <button onClick={() => setActiveTab('whatsapp')} className={`px-4 py-2 flex items-center gap-2 ${activeTab === 'whatsapp' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500'}`}><MessageCircle size={16} className="text-emerald-500"/> WhatsApp Marketing CRM</button>
      </div>

      {activeTab === 'overview' && (
      <>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded border border-blue-100 flex items-center gap-3">
            <Share2 className="text-blue-500" />
            <div>
                <div className="text-blue-800 text-xs font-bold uppercase">Social</div>
                <div className="text-xl font-bold">{socialLeadsCount} Active</div>
              </div>
          </div>
          <div className="bg-emerald-50 p-4 rounded border border-emerald-100 flex items-center gap-3">              <MessageCircle className="text-emerald-500" />              <div>                  <div className="text-emerald-800 text-xs font-bold uppercase">WhatsApp</div>
                  <div className="text-xl font-bold">{whatsappLeadsCount} msgs</div>
              </div>
          </div>
          <div className="bg-amber-50 p-4 rounded border border-amber-100 flex items-center gap-3">              <Zap className="text-amber-500" />              <div>                  <div className="text-amber-800 text-xs font-bold uppercase">Web Leads</div>
                  <div className="text-xl font-bold">{webLeadsCount} New</div>
              </div>
          </div>
          <div className="bg-purple-50 p-4 rounded border border-purple-100 flex items-center gap-3">              <Search className="text-purple-500" />              <div>                  <div className="text-purple-800 text-xs font-bold uppercase">Google Ads</div>
                  <div className="text-xl font-bold">{googleAdsLeadsCount} click</div>
            </div>
        </div>
         <div className="bg-rose-50 p-4 rounded border border-rose-100 flex items-center gap-3">
            <Bot className="text-rose-500" />
            <div>
                <div className="text-rose-800 text-xs font-bold uppercase">AI Scraper</div>
                <div className="text-xl font-bold">Running</div>
            </div>
        </div>
      </div>

       <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100 font-bold text-gray-700 flex justify-between items-center">
            Recent Leads
            {selectedLeads.size > 0 && (
                <div className="flex items-center gap-2">
                       <button 
                           onClick={() => {
                               if (selectedLeads.size !== 1) {
                                   toast.error('Please select exactly 1 lead to generate a WhatsApp QR code.');
                                   return;
                               }
                               const leadId = Array.from(selectedLeads)[0];
                               const lead = leads.find(l => l.id === leadId);
                               if (lead && lead.phone) {
                                   setQrValue(`https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent("Hi " + lead.firstName + "!")}`);
                                   setShowQRCode(true);
                               } else {
                                   toast.error('Selected lead does not have a valid phone number.');
                               }
                           }}
                           className="bg-emerald-100 hover:bg-emerald-200 text-emerald-700 px-3 py-1.5 rounded text-sm flex items-center gap-2 transition-colors border border-emerald-200"
                       >
                           <QrCode size={14} /> WhatsApp QR
                       </button>
                  <button 
                    onClick={() => setShowBroadcast(true)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded text-sm flex items-center gap-2 transition-colors"
                  >
                      <MessageCircle size={14} /> WhatsApp Broadcast ({selectedLeads.size})
                  </button>
                  <button 
                    onClick={() => setShowCampaign(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded text-sm flex items-center gap-2 transition-colors"
                  >
                      <Send size={14} /> Send Campaign
                  </button>
                </div>
            )}
        </div>
        <table className="w-full text-left">
          <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase">
            <tr>
              <th className="px-6 py-4">
                  <input type="checkbox" onChange={(e) => {
                      if(e.target.checked) setSelectedLeads(new Set(leads.map(l => l.id)));
                      else setSelectedLeads(new Set());
                  }} />
              </th>
              <th className="px-6 py-4">Name/Contact</th>
              <th className="px-6 py-4">Source</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">AI Insight</th>
              <th className="px-6 py-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {leads.map(lead => (
              <tr key={lead.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <input type="checkbox" checked={selectedLeads.has(lead.id)} onChange={e => {
                      const newSelected = new Set(selectedLeads);
                      if (e.target.checked) newSelected.add(lead.id);
                      else newSelected.delete(lead.id);
                      setSelectedLeads(newSelected);
                  }} />
                </td>
                <td className="px-6 py-4">
                  <div className="font-bold text-sm">{lead.firstName} {lead.lastName}</div>
                  <div className="text-xs text-gray-500">{lead.company}</div>
                  <div className="text-xs text-gray-500 flex flex-wrap gap-2 items-center mt-1">
                    <a href={`mailto:${lead.email}`} className="flex items-center gap-1 hover:text-blue-600">
                        <Mail size={12} /> {lead.email}
                    </a>
                    {lead.phone && (
                        <div className="flex items-center gap-2">
                            <a href={`tel:${lead.phone}`} className="flex items-center gap-1 hover:text-blue-600">
                                <Phone size={12} /> {lead.phone}
                            </a>
                            <a href={`https://wa.me/${lead.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-emerald-500 hover:text-emerald-700">
                                <MessageCircle size={14} />
                            </a>
                        </div>
                    )}
                     {lead.mobile && lead.mobile !== lead.phone && (
                        <div className="flex items-center gap-2">
                            <a href={`tel:${lead.mobile}`} className="flex items-center gap-1 hover:text-blue-600">
                                <Phone size={12} /> {lead.mobile}
                            </a>
                            <a href={`https://wa.me/${lead.mobile.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-emerald-500 hover:text-emerald-700">
                                <MessageCircle size={14} />
                            </a>
                        </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-xs capitalize">{lead.source.replace('_', ' ')}</td>
                <td className="px-6 py-4 text-xs">{lead.status}</td>
                <td className="px-6 py-4 text-xs italic">{lead.aiSummary || 'No AI analysis yet'}</td>
                <td className="px-6 py-4 text-xs flex gap-2">
                    <button onClick={() => analyzeLead(lead)} className="text-purple-600 hover:text-purple-800"><Sparkles size={16} /></button>
                    <button onClick={() => handleConvertLeadToCustomer(lead)} className="text-emerald-600 hover:text-emerald-800"><UserCheck size={16} /></button>
                    <button onClick={() => { setEditingLead(lead); setLeadFormData(lead); }} className="text-blue-600 hover:text-blue-800"><Pencil size={16} /></button>
                    <button onClick={() => handleDeleteLead(lead.id)} className="text-red-600 hover:text-red-800"><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </>
      )}

      {activeTab === 'leads' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                <input 
                    placeholder="Search by Name, Company, Email, or Phone" 
                    value={searchQuery} 
                    onChange={e => setSearchQuery(e.target.value)}
                    className="border rounded px-4 py-2 text-sm w-80"
                />
                 {selectedLeads.size > 0 && (
                    <div className="flex items-center gap-2">
                       <button 
                           onClick={() => {
                               if (selectedLeads.size !== 1) {
                                   toast.error('Please select exactly 1 lead to generate a WhatsApp QR code.');
                                   return;
                               }
                               const leadId = Array.from(selectedLeads)[0];
                               const lead = leads.find(l => l.id === leadId);
                               if (lead && lead.phone) {
                                   setQrValue(`https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent("Hi " + lead.firstName + "!")}`);
                                   setShowQRCode(true);
                               } else {
                                   toast.error('Selected lead does not have a valid phone number.');
                               }
                           }}
                           className="bg-emerald-100 hover:bg-emerald-200 text-emerald-700 px-3 py-1.5 rounded text-sm flex items-center gap-2 transition-colors border border-emerald-200"
                       >
                           <QrCode size={14} /> WhatsApp QR
                       </button>
                       <button 
                       onClick={() => setShowBroadcast(true)}
                       className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded text-sm flex items-center gap-2 transition-colors"
                       >
                           <MessageCircle size={14} /> WhatsApp Broadcast ({selectedLeads.size})
                       </button>
                       <button 
                       onClick={() => setShowCampaign(true)}
                       className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded text-sm flex items-center gap-2 transition-colors"
                       >
                           <Send size={14} /> Send Campaign
                       </button>
                    </div>
                )}
            </div>
            <table className="w-full text-left">
                <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase">
                    <tr>
                    <th className="px-6 py-4"><input type="checkbox" onChange={(e) => {
                        if(e.target.checked) setSelectedLeads(new Set(filteredLeads.map(l => l.id)));
                        else setSelectedLeads(new Set());
                    }} /></th>
                    <th className="px-6 py-4">Name</th>
                    <th className="px-6 py-4">Company</th>
                    <th className="px-6 py-4">Email</th>
                    <th className="px-6 py-4">Phone</th>
                    <th className="px-6 py-4">Source</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Date Created</th>
                    <th className="px-6 py-4">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {filteredLeads.map(lead => (
                    <tr key={lead.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4"><input type="checkbox" checked={selectedLeads.has(lead.id)} onChange={e => {
                            const newSelected = new Set(selectedLeads);
                            if (e.target.checked) newSelected.add(lead.id);
                            else newSelected.delete(lead.id);
                            setSelectedLeads(newSelected);
                        }} /></td>
                        <td className="px-6 py-4 font-bold text-sm">{lead.firstName} {lead.lastName}</td>
                        <td className="px-6 py-4 text-sm">{lead.company}</td>
                        <td className="px-6 py-4 text-sm">{lead.email}</td>
                        <td className="px-6 py-4 text-sm">{lead.phone}</td>
                        <td className="px-6 py-4 text-xs capitalize">{lead.source}</td>
                        <td className="px-6 py-4 text-xs">{lead.status}</td>
                        <td className="px-6 py-4 text-xs">{new Date(lead.createdAt).toLocaleDateString()}</td>
                        <td className="px-6 py-4 text-xs flex gap-2">
                            <button onClick={() => { setEditingLead(lead); setLeadFormData(lead); }} className="text-blue-600"><Pencil size={16} /></button>
                            <button onClick={() => handleDeleteLead(lead.id)} className="text-red-600"><Trash2 size={16} /></button>
                        </td>
                    </tr>
                    ))}
                </tbody>
            </table>
        </div>
      )}

      {activeTab === 'pipeline' && (
        <div className="flex gap-4 overflow-x-auto pb-4 h-[calc(100vh-200px)]">
          {['new', 'contacted', 'qualified', 'lost'].map(status => (
            <div key={status} className="bg-gray-50 flex-none w-80 rounded-lg p-4 flex flex-col border border-gray-200">
              <div className="font-bold text-gray-700 capitalize mb-4 flex justify-between items-center">
                  {status} 
                  <span className="bg-white px-2 py-1 rounded-full text-xs border">{leads.filter(l => l.status === status).length}</span>
              </div>
              <div className="space-y-3 overflow-y-auto flex-1">
                {leads.filter(l => l.status === status).map(lead => (
                  <div key={lead.id} className="bg-white p-3 rounded shadow-sm border border-gray-200 cursor-pointer hover:border-indigo-300 transition-colors group">
                    <div className="font-bold text-sm">{lead.firstName} {lead.lastName}</div>
                    <div className="text-xs text-gray-500 mb-2">{lead.company} • <span className="capitalize">{lead.source.replace('_', ' ')}</span></div>
                    <div className="flex items-center gap-2">
                       <select 
                           value={lead.status} 
                           onChange={async (e) => {
                               try {
                                   await updateDoc(doc(db, 'leads', lead.id), { status: e.target.value });
                                   fetchLeads();
                                   toast.success('Lead moved successfully');
                               } catch (err) { toast.error('Failed to move lead'); }
                           }}
                           className="text-xs border rounded p-1 w-full bg-gray-50 hover:bg-white transition-colors"
                       >
                           <option value="new">New</option>
                           <option value="contacted">Contacted</option>
                           <option value="qualified">Qualified</option>
                           <option value="lost">Lost</option>
                       </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'audiences' && (
        <div className="space-y-6">
           <div className="flex justify-between items-center mb-4">
             <h3 className="font-bold text-gray-800 text-lg">Marketing Audiences</h3>
             <button onClick={() => setIsAddingAudience(true)} className="bg-indigo-600 text-white px-4 py-2 rounded font-bold text-sm flex items-center gap-2">
                <Plus size={16} /> Create Audience
             </button>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               {audiences.map(aud => {
                  const matchCount = leads.filter(l => 
                      (!aud.filterCriteria.source || l.source === aud.filterCriteria.source) &&
                      (!aud.filterCriteria.status || l.status === aud.filterCriteria.status)
                  ).length;

                  return (
                   <div key={aud.id} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex flex-col justify-between">
                       <div>
                           <div className="flex justify-between items-start mb-2">
                               <h4 className="font-bold text-lg text-gray-800">{aud.name}</h4>
                               <button onClick={() => handleDeleteAudience(aud.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={16}/></button>
                           </div>
                           <p className="text-sm text-gray-500 mb-4">{aud.description}</p>
                           
                           <div className="flex flex-wrap gap-2 mb-4">
                               {aud.filterCriteria.source && <span className="bg-blue-50 text-blue-600 px-2 py-1 rounded text-xs font-bold border border-blue-100">Source: {aud.filterCriteria.source}</span>}
                               {aud.filterCriteria.status && <span className="bg-amber-50 text-amber-600 px-2 py-1 rounded text-xs font-bold border border-amber-100">Status: {aud.filterCriteria.status}</span>}
                               {!aud.filterCriteria.source && !aud.filterCriteria.status && <span className="bg-gray-50 text-gray-600 px-2 py-1 rounded text-xs font-bold border border-gray-200">All Leads</span>}
                           </div>
                       </div>
                       
                       <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
                           <div className="text-sm text-gray-500 font-bold"><Users size={14} className="inline mr-1" /> {matchCount} Leads</div>
                           <div className="flex items-center gap-2">
                             <button 
                               onClick={() => {
                                   const matchedLeads = leads.filter(l => 
                                       (!aud.filterCriteria.source || l.source === aud.filterCriteria.source) &&
                                       (!aud.filterCriteria.status || l.status === aud.filterCriteria.status)
                                   );
                                   setSelectedLeads(new Set(matchedLeads.map(l => l.id)));
                                   setShowBroadcast(true);
                               }}
                               className="text-emerald-600 font-bold text-sm bg-emerald-50 px-3 py-1.5 rounded hover:bg-emerald-100 transition-colors"
                             >
                                Broadcast
                             </button>
                             <button 
                               onClick={() => {
                                   const matchedLeads = leads.filter(l => 
                                       (!aud.filterCriteria.source || l.source === aud.filterCriteria.source) &&
                                       (!aud.filterCriteria.status || l.status === aud.filterCriteria.status)
                                   );
                                   setSelectedLeads(new Set(matchedLeads.map(l => l.id)));
                                   setShowCampaign(true);
                               }}
                               className="text-indigo-600 font-bold text-sm bg-indigo-50 px-3 py-1.5 rounded hover:bg-indigo-100 transition-colors"
                             >
                                Campaign
                             </button>
                           </div>
                       </div>
                   </div>
                  )
               })}
               {audiences.length === 0 && (
                   <div className="col-span-3 text-center py-12 bg-white rounded-lg border border-dashed border-gray-300">
                       <ListFilter className="mx-auto text-gray-300 mb-2" size={48} />
                       <h3 className="font-bold text-gray-500">No Audiences Created</h3>
                       <p className="text-sm text-gray-400 mb-4">Create an audience to segment your leads for targeted mass messaging.</p>
                   </div>
               )}
           </div>
        </div>
      )}

      {activeTab === 'whatsapp' && (
        <div className="space-y-6">
           <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-lg p-6 text-white shadow-sm flex justify-between items-center">
               <div>
                   <h3 className="text-xl font-bold flex items-center gap-2"><MessageCircle /> WhatsApp CRM for Marketing</h3>
                   <p className="opacity-90 max-w-xl text-sm mt-1">Enhance your marketing strategies and engage with clients effectively. Capture leads, launch campaigns, and automate funnels.</p>
               </div>
               <button onClick={() => setShowCampaign(true)} className="bg-white text-emerald-600 px-4 py-2 rounded font-bold text-sm shadow flex items-center gap-2 hover:bg-emerald-50 transition-colors">
                   <Target size={16} /> New Mass Campaign
               </button>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                   <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center mb-4"><Zap size={20}/></div>
                   <h4 className="font-bold mb-2">Capture Leads Instantly</h4>
                   <p className="text-sm text-gray-500 mb-4">Generate specialized WhatsApp click-to-chat links or QR codes for your ads and website to capture inbound leads immediately.</p>
                   <button 
                       onClick={() => {
                           setQrValue(`https://wa.me/1234567890?text=${encodeURIComponent("Hi! I'm interested in your services.")}`);
                           setShowQRCode(true);
                       }} 
                       className="text-blue-600 font-bold text-sm hover:underline"
                    >
                       Generate Link & QR &rarr;
                    </button>
               </div>
               <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                   <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center mb-4"><Users size={20}/></div>
                   <h4 className="font-bold mb-2">Audience Segmentation</h4>
                   <p className="text-sm text-gray-500 mb-4">Create targeted audiences from your centralized lead pool based on interests, tags, and behavior to increase campaign ROI.</p>
                   <button className="text-purple-600 font-bold text-sm hover:underline" onClick={() => setActiveTab('leads')}>View Audiences &rarr;</button>
               </div>
               <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                   <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center mb-4"><Bot size={20}/></div>
                   <h4 className="font-bold mb-2">Automated Chatbot Funnel</h4>
                   <p className="text-sm text-gray-500 mb-4">Set up an automated WhatsApp bot to qualify leads 24/7, answer common questions, and route hot prospects to sales agents.</p>
                   <button 
                       onClick={() => {
                           toast.success('Your Webhook URL is accessible at /api/webhook/whatsapp', { style: { minWidth: '400px' } });
                           
                       }}
                       className="text-emerald-600 font-bold text-sm hover:underline"
                   >
                       Configure Bot Webhooks &rarr;
                   </button>
               </div>
           </div>

           <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
               <div className="p-4 border-b border-gray-100 font-bold flex items-center gap-2">
                   <Megaphone className="text-gray-400" size={18}/> Active Marketing & Broadcasts
               </div>
               <div className="p-6 text-center text-gray-500 py-12">
                   <Workflow size={48} className="mx-auto text-gray-300 mb-4" />
                   <h4 className="font-bold text-gray-700 mb-1">No Active Campaigns or Broadcasts</h4>
                   <p className="text-sm max-w-sm mx-auto mb-4">Select leads from your Lead Management or Pipeline views to launch a personalized bulk WhatsApp campaign or send a broadcast message.</p>
                   <button onClick={() => { setActiveTab('leads'); }} className="bg-white border-2 border-emerald-500 text-emerald-600 px-4 py-2 rounded font-bold text-sm hover:bg-emerald-50 transition-colors">Select Leads</button>
               </div>
           </div>
        </div>
      )}


       {/* Lead Edit Modal */}
       {editingLead && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
             <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">Edit Lead</h3>
              <button onClick={() => setEditingLead(null)}><X size={20} /></button>
             </div>
             <form onSubmit={handleUpdateLead} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase">Lead Owner</label>
                    <input type="text" value={leadFormData.leadOwner} onChange={e => setLeadFormData({...leadFormData, leadOwner: e.target.value})} className="w-full border-gray-200 rounded text-sm p-2" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase">Title</label>
                    <input type="text" value={leadFormData.title} onChange={e => setLeadFormData({...leadFormData, title: e.target.value})} className="w-full border-gray-200 rounded text-sm p-2" />
                  </div>
                </div>
               <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase">First Name</label>
                    <input type="text" required value={leadFormData.firstName} onChange={e => setLeadFormData({...leadFormData, firstName: e.target.value})} className="w-full border-gray-200 rounded text-sm p-2" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase">Last Name</label>
                    <input type="text" required value={leadFormData.lastName} onChange={e => setLeadFormData({...leadFormData, lastName: e.target.value})} className="w-full border-gray-200 rounded text-sm p-2" />
                  </div>
               </div>
               <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase">Company</label>
                  <input type="text" value={leadFormData.company} onChange={e => setLeadFormData({...leadFormData, company: e.target.value})} className="w-full border-gray-200 rounded text-sm p-2" />
                </div>
               <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase">Email</label>
                    <input type="email" required value={leadFormData.email} onChange={e => setLeadFormData({...leadFormData, email: e.target.value})} className="w-full border-gray-200 rounded text-sm p-2" />
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase">Secondary Email</label>
                    <input type="email" value={leadFormData.secondaryEmail} onChange={e => setLeadFormData({...leadFormData, secondaryEmail: e.target.value})} className="w-full border-gray-200 rounded text-sm p-2" />
                 </div>
               </div>
               <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase">Phone</label>
                    <input type="text" value={leadFormData.phone} onChange={e => setLeadFormData({...leadFormData, phone: e.target.value})} className="w-full border-gray-200 rounded text-sm p-2" />
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase">Mobile</label>
                    <input type="text" value={leadFormData.mobile} onChange={e => setLeadFormData({...leadFormData, mobile: e.target.value})} className="w-full border-gray-200 rounded text-sm p-2" />
                 </div>
               </div>
               <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase">Fax</label>
                    <input type="text" value={leadFormData.fax} onChange={e => setLeadFormData({...leadFormData, fax: e.target.value})} className="w-full border-gray-200 rounded text-sm p-2" />
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase">Website</label>
                    <input type="text" value={leadFormData.website} onChange={e => setLeadFormData({...leadFormData, website: e.target.value})} className="w-full border-gray-200 rounded text-sm p-2" />
                 </div>
               </div>
               <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase">Industry</label>
                    <input type="text" value={leadFormData.industry} onChange={e => setLeadFormData({...leadFormData, industry: e.target.value})} className="w-full border-gray-200 rounded text-sm p-2" />
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase">No. of Employees</label>
                    <input type="text" value={leadFormData.noOfEmployees} onChange={e => setLeadFormData({...leadFormData, noOfEmployees: e.target.value})} className="w-full border-gray-200 rounded text-sm p-2" />
                 </div>
               </div>
               <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase">Rating</label>
                    <input type="text" value={leadFormData.rating} onChange={e => setLeadFormData({...leadFormData, rating: e.target.value})} className="w-full border-gray-200 rounded text-sm p-2" />
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase">Annual Revenue</label>
                    <input type="number" value={leadFormData.annualRevenue} onChange={e => setLeadFormData({...leadFormData, annualRevenue: parseInt(e.target.value)})} className="w-full border-gray-200 rounded text-sm p-2" />
                 </div>
               </div>
               <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase">Facebook ID</label>
                    <input type="text" value={leadFormData.skypeId} onChange={e => setLeadFormData({...leadFormData, skypeId: e.target.value})} className="w-full border-gray-200 rounded text-sm p-2" />
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase">LinkedIn</label>
                    <input type="text" value={leadFormData.twitter} onChange={e => setLeadFormData({...leadFormData, twitter: e.target.value})} className="w-full border-gray-200 rounded text-sm p-2" />
                 </div>
               </div>
               <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase">Date of Birth</label>
                    <input type="date" value={leadFormData.dob} onChange={e => setLeadFormData({...leadFormData, dob: e.target.value})} className="w-full border-gray-200 rounded text-sm p-2" />
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase">Anniversary</label>
                    <input type="date" value={leadFormData.anniversary} onChange={e => setLeadFormData({...leadFormData, anniversary: e.target.value})} className="w-full border-gray-200 rounded text-sm p-2" />
                 </div>
               </div>
               <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={leadFormData.emailOptOut} onChange={e => setLeadFormData({...leadFormData, emailOptOut: e.target.checked})} />
                    <span className="text-sm font-bold text-gray-500 uppercase">Email Opt Out</span>
                  </label>
               </div>
               <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase">Source</label>
                  <select value={leadFormData.source} onChange={e => setLeadFormData({...leadFormData, source: e.target.value as any})} className="w-full border-gray-200 rounded text-sm p-2">
                    <option value="manual">Manual</option>
                    <option value="web_form">Web Form</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="social">Social</option>
                    <option value="google_ads">Google Ads</option>
                  </select>
               </div>
               <button type="submit" className="w-full bg-[#081621] text-white py-2 rounded font-bold text-sm">Update Lead</button>
             </form>
          </div>
        </div>
      )}

       {showQRCode && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6 text-center">
             <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">Scan to Chat</h3>
              <button onClick={() => setShowQRCode(false)}><X size={20} /></button>
             </div>
             <div className="bg-gray-50 p-6 rounded-lg inline-block border border-gray-200 mb-4">
                 <QRCode value={qrValue} size={200} />
             </div>
             <p className="text-sm text-gray-500 mb-4">Point your camera at this code to start a WhatsApp conversation.</p>
             <div className="bg-blue-50 border border-blue-100 p-3 rounded text-left">
                 <div className="text-xs font-bold text-blue-700 uppercase mb-1">Direct Link</div>
                 <div className="text-sm text-blue-600 truncate">{qrValue}</div>
             </div>
          </div>
        </div>
      )}
       {isAddingAudience && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
             <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">Create Audience</h3>
              <button onClick={() => setIsAddingAudience(false)}><X size={20} /></button>
             </div>
             <form onSubmit={handleAddAudience} className="space-y-4">
                <div>
                   <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Audience Name</label>
                   <input required type="text" value={newAudience.name} onChange={e => setNewAudience({...newAudience, name: e.target.value})} className="w-full border-gray-200 rounded text-sm p-2" placeholder="e.g. Qualified WhatsApp Leads" />
                </div>
                <div>
                   <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Description</label>
                   <textarea value={newAudience.description} onChange={e => setNewAudience({...newAudience, description: e.target.value})} className="w-full border-gray-200 rounded text-sm p-2" placeholder="Describe the purpose of this audience..." rows={2}></textarea>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-3">
                    <h4 className="font-bold text-sm text-gray-700">Filter Criteria</h4>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Lead Source</label>
                        <select value={newAudience.filterCriteria?.source || ''} onChange={e => setNewAudience({...newAudience, filterCriteria: {...newAudience.filterCriteria, source: e.target.value}})} className="w-full border-gray-200 rounded text-sm p-2">
                            <option value="">Any Source</option>
                            <option value="manual">Manual</option>
                            <option value="web_form">Web Form</option>
                            <option value="whatsapp">WhatsApp</option>
                            <option value="social">Social</option>
                            <option value="google_ads">Google Ads</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Pipeline Status</label>
                        <select value={newAudience.filterCriteria?.status || ''} onChange={e => setNewAudience({...newAudience, filterCriteria: {...newAudience.filterCriteria, status: e.target.value}})} className="w-full border-gray-200 rounded text-sm p-2">
                            <option value="">Any Status</option>
                            <option value="new">New</option>
                            <option value="contacted">Contacted</option>
                            <option value="qualified">Qualified</option>
                            <option value="lost">Lost</option>
                        </select>
                    </div>
                </div>
                <button type="submit" className="w-full bg-indigo-600 text-white py-2 rounded font-bold text-sm hover:bg-indigo-700 transition">Save Audience</button>
             </form>
          </div>
        </div>
      )}

    </div>
  );
};





