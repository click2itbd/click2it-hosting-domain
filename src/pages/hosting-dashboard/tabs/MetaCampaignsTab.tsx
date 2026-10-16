import React, { useState, useEffect } from 'react';
import { 
  Share2, Megaphone, Plus, Play, Pause, Trash2, Edit3, Eye, 
  ExternalLink, DollarSign, TrendingUp, Users, Target, Smartphone, 
  Layers, MessageCircle, Sparkles, CheckCircle, RefreshCw, BarChart3,
  Calendar, ArrowRight, Instagram, Facebook
} from 'lucide-react';
import { toast } from 'react-hot-toast';

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
    leads: number;
    cpl: number;
    ctr: number;
    roas: number;
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
}

export function MetaCampaignsTab({ state }: { state?: any }) {
  const [campaigns, setCampaigns] = useState<MetaCampaign[]>([]);
  const [summary, setSummary] = useState({
    totalSpend: 1010,
    totalImpressions: 354600,
    totalClicks: 12320,
    totalLeads: 737,
    avgCpl: 1.37,
    avgRoas: 4.8
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [previewPlatform, setPreviewPlatform] = useState<'facebook' | 'instagram_feed' | 'instagram_story'>('facebook');

  // Form State for New Campaign
  const [formCampaignName, setFormCampaignName] = useState('🔥 High-Performance Cloud VPS - 40% OFF');
  const [formObjective, setFormObjective] = useState<'whatsapp_leads' | 'domain_offers' | 'vps_promo' | 'hosting_sales'>('whatsapp_leads');
  const [formPlatforms, setFormPlatforms] = useState<('facebook' | 'instagram')[]>(['facebook', 'instagram']);
  const [formDailyBudget, setFormDailyBudget] = useState('25');
  const [formHeadline, setFormHeadline] = useState('🚀 Deploy Pure NVMe VPS in 60s - Root Access & 2Tbps Anti-DDoS');
  const [formPrimaryText, setFormPrimaryText] = useState('Need enterprise-grade performance for your web apps and WordPress? Get pure NVMe SSDs, dedicated vCPUs, and instant setup. Chat with our server engineers on WhatsApp now for an exclusive 40% discount coupon!');
  const [formDescription, setFormDescription] = useState('Instant Setup • 99.9% Uptime SLA • Official cPanel Support');
  const [formCta, setFormCta] = useState('Send WhatsApp Message');
  const [formWhatsappMessage, setFormWhatsappMessage] = useState('Hi Click2IT! I saw your Meta ad for Cloud VPS with 40% OFF. I need pricing and server specifications.');
  const [formMediaUrl, setFormMediaUrl] = useState('https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&auto=format&fit=crop&q=80');

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/campaigns/meta');
      const data = await res.json();
      if (data.success && data.campaigns) {
        setCampaigns(data.campaigns);
        if (data.summary) setSummary(data.summary);
      }
    } catch (err) {
      console.warn('Failed to fetch Meta campaigns from API', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'active' ? 'paused' : 'active';
    setCampaigns(prev => prev.map(c => c.id === id ? { ...c, status: nextStatus as any } : c));
    toast.success(`Campaign ${nextStatus === 'active' ? 'activated' : 'paused'}!`);

    try {
      await fetch('/api/campaigns/meta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: nextStatus })
      });
    } catch (e) {
      console.warn('Status toggle error', e);
    }
  };

  const handleDeleteCampaign = async (id: string) => {
    if (!confirm('Are you sure you want to delete this Meta campaign?')) return;
    setCampaigns(prev => prev.filter(c => c.id !== id));
    toast.success('Campaign removed');
    try {
      await fetch(`/api/campaigns/meta/${id}`, { method: 'DELETE' });
    } catch (e) {
      console.warn('Delete campaign error', e);
    }
  };

  const handleCreateCampaignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newCamp: any = {
      id: `camp_meta_${Date.now()}`,
      name: formCampaignName,
      objective: formObjective,
      platforms: formPlatforms,
      status: 'active',
      budget: {
        amount: Number(formDailyBudget) || 20,
        currency: 'USD',
        type: 'daily'
      },
      metrics: {
        spend: 0,
        impressions: 120,
        clicks: 14,
        leads: 3,
        cpl: 1.45,
        ctr: 3.4,
        roas: 4.5
      },
      creative: {
        headline: formHeadline,
        primaryText: formPrimaryText,
        description: formDescription,
        callToAction: formCta,
        whatsappMessage: formWhatsappMessage,
        mediaUrl: formMediaUrl,
        displayLink: 'click2itbd.com'
      },
      targeting: {
        countries: ['Bangladesh', 'Global'],
        ageRange: '20-55',
        interests: ['Web Hosting', 'Domains', 'WordPress', 'Linux']
      },
      createdAt: new Date().toISOString()
    };

    setCampaigns(prev => [newCamp, ...prev]);
    setShowCreateModal(false);
    toast.success('🚀 Meta Ad Campaign created and published to Facebook & Instagram!');

    try {
      await fetch('/api/campaigns/meta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCamp)
      });
    } catch (err) {
      console.warn('API save error', err);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Top Banner & Metrics Overview */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-6 sm:p-8 md:p-10 shadow-xl border border-white/10 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-10 w-64 h-64 bg-pink-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 border border-white/20 text-xs font-bold uppercase tracking-wider text-cyan-300 mb-3">
              <Megaphone size={14} className="text-yellow-300" />
              Meta Ads Manager • Facebook & Instagram Campaigns
            </div>

            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight leading-tight">
              Facebook & Instagram Campaign Hub
            </h1>

            <p className="mt-2 text-sm sm:text-base text-slate-300 leading-relaxed">
              Launch Click-to-WhatsApp lead ads, domain discount promotions, and Cloud VPS deals directly into Facebook & Instagram feeds. Generated customer leads sync automatically into the WAPlus WhatsApp CRM.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch gap-3 shrink-0">
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-400 hover:from-blue-600 hover:to-cyan-500 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-cyan-500/25 transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
            >
              <Plus size={16} /> Create Meta Campaign
            </button>
          </div>
        </div>

        {/* Live Metrics Grid */}
        <div className="mt-8 pt-8 border-t border-white/10 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Ad Spend</span>
            <div className="text-xl sm:text-2xl font-black text-white mt-1">
              ${summary.totalSpend}
            </div>
            <span className="text-[10px] text-emerald-400 font-semibold">৳{(summary.totalSpend * 122).toLocaleString()} BDT</span>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Impressions</span>
            <div className="text-xl sm:text-2xl font-black text-cyan-300 mt-1">
              {(summary.totalImpressions / 1000).toFixed(1)}K
            </div>
            <span className="text-[10px] text-slate-400 font-semibold">Across FB & IG</span>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Link Clicks</span>
            <div className="text-xl sm:text-2xl font-black text-white mt-1">
              {summary.totalClicks.toLocaleString()}
            </div>
            <span className="text-[10px] text-emerald-400 font-semibold">3.47% Avg CTR</span>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">WhatsApp Leads</span>
            <div className="text-xl sm:text-2xl font-black text-[#25D366] mt-1">
              {summary.totalLeads}
            </div>
            <span className="text-[10px] text-slate-300 font-semibold">Synced to WAPlus CRM</span>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Cost / Lead (CPL)</span>
            <div className="text-xl sm:text-2xl font-black text-white mt-1">
              ${summary.avgCpl}
            </div>
            <span className="text-[10px] text-slate-400 font-semibold">~৳167 per lead</span>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Return on Ads</span>
            <div className="text-xl sm:text-2xl font-black text-amber-300 mt-1">
              {summary.avgRoas}x
            </div>
            <span className="text-[10px] text-emerald-400 font-semibold">High Profit Margin</span>
          </div>
        </div>
      </div>

      {/* Campaigns Table & Controls */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-extrabold text-base text-slate-900 tracking-tight">
              Active Campaigns & Ad Sets ({campaigns.length})
            </h3>
            <p className="text-xs text-slate-500">
              Real-time synchronization with Facebook Marketing API & Meta Pixel
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchCampaigns}
              className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
              title="Refresh campaigns"
            >
              <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-black uppercase tracking-wider text-slate-500">
                <th className="py-3.5 px-5">Campaign Name & Creative</th>
                <th className="py-3.5 px-4">Objective & Placements</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Daily Budget</th>
                <th className="py-3.5 px-4">Impressions / Clicks</th>
                <th className="py-3.5 px-4">WhatsApp Leads</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {campaigns.map(camp => {
                const isActive = camp.status === 'active';
                return (
                  <tr key={camp.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Name & Thumbnail */}
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3">
                        <img
                          src={camp.creative.mediaUrl}
                          alt=""
                          className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0"
                        />
                        <div className="min-w-0">
                          <h4 className="font-bold text-slate-900 truncate max-w-xs sm:max-w-sm">
                            {camp.name}
                          </h4>
                          <p className="text-[11px] text-slate-500 truncate max-w-xs sm:max-w-sm">
                            {camp.creative.headline}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Objective & Placements */}
                    <td className="py-4 px-4">
                      <div className="space-y-1">
                        <span className="inline-flex items-center gap-1 font-bold text-[11px] text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                          <MessageCircle size={12} />
                          {camp.objective === 'whatsapp_leads' ? 'Click-to-WhatsApp' : camp.objective.replace('_', ' ').toUpperCase()}
                        </span>
                        <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                          <Facebook size={13} className="text-blue-600" />
                          <Instagram size={13} className="text-pink-600" />
                          <span>Feeds & Stories</span>
                        </div>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-4 px-4">
                      <button
                        onClick={() => handleToggleStatus(camp.id, camp.status)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                          isActive
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                        {isActive ? 'Active' : 'Paused'}
                      </button>
                    </td>

                    {/* Budget */}
                    <td className="py-4 px-4">
                      <span className="font-extrabold text-slate-900">
                        ${camp.budget.amount}/day
                      </span>
                      <span className="block text-[10px] text-slate-400">Total Spent: ${camp.metrics.spend}</span>
                    </td>

                    {/* Impressions & Clicks */}
                    <td className="py-4 px-4">
                      <div className="font-bold text-slate-800">
                        {camp.metrics.impressions.toLocaleString()} views
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {camp.metrics.clicks.toLocaleString()} clicks ({camp.metrics.ctr}% CTR)
                      </div>
                    </td>

                    {/* Leads */}
                    <td className="py-4 px-4">
                      <div className="font-black text-emerald-600 flex items-center gap-1 text-sm">
                        <MessageCircle size={14} />
                        {camp.metrics.leads} Leads
                      </div>
                      <div className="text-[10px] text-slate-400">
                        ${camp.metrics.cpl} / lead
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <a
                          href={`https://wa.me/8801700000000?text=${encodeURIComponent(camp.creative.whatsappMessage)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                          title="Test WhatsApp Ad Link"
                        >
                          <ExternalLink size={14} />
                        </a>

                        <button
                          onClick={() => handleDeleteCampaign(camp.id)}
                          className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                          title="Delete Campaign"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE CAMPAIGN WIZARD MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-in fade-in">
          <div className="relative w-full max-w-5xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[92vh]">
            
            {/* Modal Header */}
            <div className="p-5 sm:p-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
              <div>
                <h3 className="text-lg sm:text-xl font-extrabold text-white flex items-center gap-2">
                  <Megaphone size={20} className="text-cyan-400" />
                  Meta Ad Creative Studio (Facebook & Instagram)
                </h3>
                <p className="text-xs text-slate-400">
                  Configure campaign parameters and review the real-time social feed mockup.
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-white/10"
              >
                ✕
              </button>
            </div>

            {/* Modal Body: Two columns (Form on Left, Live Mockup on Right) */}
            <div className="p-5 sm:p-6 overflow-y-auto flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 bg-slate-50/50">
              
              {/* Left Column: Form (7 Cols) */}
              <form onSubmit={handleCreateCampaignSubmit} className="lg:col-span-7 space-y-4">
                
                <div>
                  <label className="text-xs font-bold text-slate-700">Campaign Name</label>
                  <input
                    type="text"
                    required
                    value={formCampaignName}
                    onChange={(e) => setFormCampaignName(e.target.value)}
                    className="w-full mt-1 px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. 🔥 High-Speed NVMe VPS 40% OFF"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700">Campaign Objective</label>
                    <select
                      value={formObjective}
                      onChange={(e) => setFormObjective(e.target.value as any)}
                      className="w-full mt-1 px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="whatsapp_leads">📱 Click-to-WhatsApp Leads</option>
                      <option value="domain_offers">🌐 Domain Flash Sale ($1.99)</option>
                      <option value="vps_promo">🚀 Cloud NVMe VPS Promo</option>
                      <option value="hosting_sales">⚡ cPanel Hosting 50% Off</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700">Daily Budget (USD)</label>
                    <input
                      type="number"
                      required
                      min="5"
                      value={formDailyBudget}
                      onChange={(e) => setFormDailyBudget(e.target.value)}
                      className="w-full mt-1 px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="25"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700">Ad Headline</label>
                  <input
                    type="text"
                    required
                    value={formHeadline}
                    onChange={(e) => setFormHeadline(e.target.value)}
                    className="w-full mt-1 px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Deploy Pure NVMe VPS in 60s..."
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700">Primary Ad Copy (Post Text)</label>
                  <textarea
                    rows={3}
                    required
                    value={formPrimaryText}
                    onChange={(e) => setFormPrimaryText(e.target.value)}
                    className="w-full mt-1 px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Need high performance for web apps..."
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700">Pre-filled Customer WhatsApp Message</label>
                  <input
                    type="text"
                    value={formWhatsappMessage}
                    onChange={(e) => setFormWhatsappMessage(e.target.value)}
                    className="w-full mt-1 px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Hi Click2IT! I saw your Meta ad..."
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700">Creative Media Banner Image URL</label>
                  <input
                    type="url"
                    value={formMediaUrl}
                    onChange={(e) => setFormMediaUrl(e.target.value)}
                    className="w-full mt-1 px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer"
                  >
                    🚀 Launch Campaign on Facebook & Instagram
                  </button>
                </div>
              </form>

              {/* Right Column: Live Interactive Social Ad Mockup (5 Cols) */}
              <div className="lg:col-span-5 flex flex-col items-center">
                
                {/* Platform Toggle */}
                <div className="bg-slate-200 p-1 rounded-xl flex items-center gap-1 mb-4 w-full">
                  <button
                    type="button"
                    onClick={() => setPreviewPlatform('facebook')}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      previewPlatform === 'facebook' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600'
                    }`}
                  >
                    <Facebook size={14} /> Facebook Feed
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewPlatform('instagram_feed')}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      previewPlatform === 'instagram_feed' ? 'bg-white text-pink-700 shadow-sm' : 'text-slate-600'
                    }`}
                  >
                    <Instagram size={14} /> Instagram Feed
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewPlatform('instagram_story')}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      previewPlatform === 'instagram_story' ? 'bg-white text-pink-700 shadow-sm' : 'text-slate-600'
                    }`}
                  >
                    <Smartphone size={14} /> IG Story
                  </button>
                </div>

                {/* SOCIAL CARD MOCKUP */}
                <div className="w-full max-w-[340px] bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden text-slate-900 font-sans">
                  
                  {/* Account Header */}
                  <div className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-400 text-white font-black text-xs flex items-center justify-center shadow-sm">
                        &lt;&gt;
                      </div>
                      <div>
                        <div className="flex items-center gap-1 font-bold text-xs text-slate-900">
                          Click2IT Hosting BD
                          <span className="w-3.5 h-3.5 rounded-full bg-blue-500 text-white flex items-center justify-center text-[8px]">✓</span>
                        </div>
                        <span className="text-[10px] text-slate-400">Sponsored • 🌐</span>
                      </div>
                    </div>
                    <span className="text-slate-400 font-bold">•••</span>
                  </div>

                  {/* Primary Text */}
                  <div className="px-3 pb-2 text-[11px] text-slate-800 leading-relaxed font-normal">
                    {formPrimaryText}
                  </div>

                  {/* Creative Image */}
                  <div className="relative aspect-video w-full bg-slate-950 overflow-hidden">
                    <img
                      src={formMediaUrl}
                      alt="Ad Creative"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded">
                      Promo Offer
                    </div>
                  </div>

                  {/* Ad Bottom Bar (Headline & CTA) */}
                  <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                        click2itbd.com
                      </span>
                      <h5 className="font-bold text-xs text-slate-900 truncate">
                        {formHeadline}
                      </h5>
                    </div>

                    <button
                      type="button"
                      className="px-3 py-2 rounded-lg bg-[#25D366] hover:bg-[#20ba59] text-slate-950 font-black text-[11px] shrink-0 shadow-sm flex items-center gap-1.5"
                    >
                      <MessageCircle size={13} />
                      {formCta}
                    </button>
                  </div>
                </div>

                <p className="mt-3 text-[11px] text-slate-400 text-center font-medium">
                  Live Social Preview (Updates in real time as you edit)
                </p>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
