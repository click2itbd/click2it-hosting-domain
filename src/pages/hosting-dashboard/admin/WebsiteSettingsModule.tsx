import React, { useState, useEffect } from 'react';
import { 
  Globe, Phone, Mail, MapPin, Facebook, Instagram, Youtube, Linkedin, Twitter, 
  MessageSquare, Save, CheckCircle2, AlertCircle, RefreshCw, Sparkles, Building
} from 'lucide-react';
import { useSettings } from '../../../context/SettingsContext';
import { toast } from 'react-hot-toast';
import { apiPost } from '../../../services/apiClient';

export function WebsiteSettingsModule() {
  const { settings, updateSettings } = useSettings();

  const [formData, setFormData] = useState({
    brandName: '',
    brandShortName: '',
    website: '',
    address: '',
    contactPhone: '',
    whatsappNumber: '',
    contactEmail: '',
    billingEmail: '',
    facebookUrl: '',
    instagramUrl: '',
    youtubeUrl: '',
    linkedinUrl: '',
    twitterUrl: '',
    footerText: '',
  });

  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (settings) {
      setFormData({
        brandName: settings.brandName || 'CLICK2IT BD',
        brandShortName: settings.brandShortName || 'CLICK2IT',
        website: settings.website || 'https://click2it.bd',
        address: settings.address || 'Dhaka, Bangladesh',
        contactPhone: settings.contactPhone || '+880 1886-920755',
        whatsappNumber: (settings as any).whatsappNumber || settings.contactPhone || '+880 1886-920755',
        contactEmail: settings.contactEmail || 'support@click2it.bd',
        billingEmail: (settings as any).billingEmail || 'billing@click2it.bd',
        facebookUrl: settings.facebookUrl || 'https://web.facebook.com/CLICK2ITBD',
        instagramUrl: settings.instagramUrl || '',
        youtubeUrl: settings.youtubeUrl || '',
        linkedinUrl: (settings as any).linkedinUrl || '',
        twitterUrl: (settings as any).twitterUrl || '',
        footerText: settings.footerText || `© ${new Date().getFullYear()} CLICK2IT BD. All rights reserved.`,
      });
      setHasChanges(false);
    }
  }, [settings]);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      // 1. Update global settings context and Firestore directly
      await updateSettings(formData);

      // 2. Also save via backend admin endpoint for persistence guarantee
      try {
        await apiPost('/api/admin/site-settings', formData);
      } catch (backendErr) {
        console.warn('Backend admin sync note:', backendErr);
      }

      setHasChanges(false);
      toast.success('Website & Social settings saved successfully!');
    } catch (err: any) {
      console.error('Failed to save website settings:', err);
      toast.error(err?.message || 'Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-2">
              <Sparkles size={13} />
              Website Customization
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
              <Globe className="text-blue-400" size={26} />
              Website, Contact &amp; Social Settings
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl">
              এখানে আপনার ওয়েবসাইটের সাপোর্ট ফোন নাম্বার, ইমেইল, অফিস অ্যাড্রেস এবং ফেসবুক ও সোশ্যাল মিডিয়া লিংকগুলো পরিবর্তন করুন। সেভ করলেই ওয়েবসাইটে তাৎক্ষণিক পরিবর্তন দৃশ্যমান হবে।
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => handleSave()}
              disabled={saving || !hasChanges}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm shadow-lg transition-all active:scale-95 ${
                hasChanges 
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-500/25 ring-2 ring-blue-400/30'
                  : 'bg-slate-800 text-slate-400 cursor-not-allowed'
              }`}
            >
              {saving ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={16} />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {hasChanges && (
        <div className="flex items-center justify-between p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs font-medium">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-amber-400 shrink-0" />
            <span>আপনার পরিবর্তনগুলো এখনো সেভ করা হয়নি। পরিবর্তন কার্যকর করতে ওপরের <strong>Save Changes</strong> বাটনে ক্লিক করুন।</span>
          </div>
          <button 
            onClick={() => handleSave()}
            disabled={saving}
            className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition-all"
          >
            Save Now
          </button>
        </div>
      )}

      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Contact Details */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Phone size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">যোগাযোগ ও কাস্টমার সাপোর্ট</h2>
              <p className="text-xs text-slate-500">ওয়েবসাইটের হেডার, ফুটার এবং কনট্যাক্ট পেজে প্রদর্শিত হবে</p>
            </div>
          </div>

          <div className="space-y-3.5 pt-1">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Phone size={13} className="text-blue-500" />
                Support Hotline / Phone Number *
              </label>
              <input
                type="text"
                value={formData.contactPhone}
                onChange={e => handleChange('contactPhone', e.target.value)}
                placeholder="+880 1886-920755"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm font-medium text-slate-800 transition-all"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">ওয়েবসাইটের ওপরে টপ-বার এবং ফুটারে এই নাম্বারটি শো করবে।</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <MessageSquare size={13} className="text-emerald-500" />
                WhatsApp Number
              </label>
              <input
                type="text"
                value={formData.whatsappNumber}
                onChange={e => handleChange('whatsappNumber', e.target.value)}
                placeholder="+880 1886-920755"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none text-sm font-medium text-slate-800 transition-all"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">কাস্টমার সরাসরি ক্লিক করে হোয়াটসঅ্যাপে চ্যাট শুরু করতে পারবে।</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Mail size={13} className="text-blue-500" />
                  Support Email *
                </label>
                <input
                  type="email"
                  value={formData.contactEmail}
                  onChange={e => handleChange('contactEmail', e.target.value)}
                  placeholder="support@click2it.bd"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm font-medium text-slate-800 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Mail size={13} className="text-indigo-500" />
                  Billing Email
                </label>
                <input
                  type="email"
                  value={formData.billingEmail}
                  onChange={e => handleChange('billingEmail', e.target.value)}
                  placeholder="billing@click2it.bd"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-sm font-medium text-slate-800 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <MapPin size={13} className="text-rose-500" />
                Office Address / Store Location
              </label>
              <textarea
                rows={2}
                value={formData.address}
                onChange={e => handleChange('address', e.target.value)}
                placeholder="House 12, Road 4, Dhanmondi, Dhaka, Bangladesh"
                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-100 outline-none text-sm font-medium text-slate-800 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Card 2: Social Media Links */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <Facebook size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">সোশ্যাল মিডিয়া লিংক</h2>
              <p className="text-xs text-slate-500">ওয়েবসাইটের ফুটারে থাকা সোশ্যাল আইকনগুলোতে এই লিংকগুলো কাজ করবে</p>
            </div>
          </div>

          <div className="space-y-3.5 pt-1">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Facebook size={13} className="text-blue-600" />
                Facebook Page URL
              </label>
              <input
                type="url"
                value={formData.facebookUrl}
                onChange={e => handleChange('facebookUrl', e.target.value)}
                placeholder="https://web.facebook.com/CLICK2ITBD"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none text-sm font-medium text-slate-800 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Instagram size={13} className="text-pink-600" />
                Instagram Profile URL
              </label>
              <input
                type="url"
                value={formData.instagramUrl}
                onChange={e => handleChange('instagramUrl', e.target.value)}
                placeholder="https://instagram.com/click2itbd"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-pink-500 focus:ring-2 focus:ring-pink-100 outline-none text-sm font-medium text-slate-800 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Youtube size={13} className="text-red-600" />
                YouTube Channel URL
              </label>
              <input
                type="url"
                value={formData.youtubeUrl}
                onChange={e => handleChange('youtubeUrl', e.target.value)}
                placeholder="https://youtube.com/@click2itbd"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none text-sm font-medium text-slate-800 transition-all"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Linkedin size={13} className="text-sky-600" />
                  LinkedIn Page URL
                </label>
                <input
                  type="url"
                  value={formData.linkedinUrl}
                  onChange={e => handleChange('linkedinUrl', e.target.value)}
                  placeholder="https://linkedin.com/company/click2itbd"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 outline-none text-sm font-medium text-slate-800 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Twitter size={13} className="text-slate-800" />
                  X / Twitter URL
                </label>
                <input
                  type="url"
                  value={formData.twitterUrl}
                  onChange={e => handleChange('twitterUrl', e.target.value)}
                  placeholder="https://twitter.com/click2itbd"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-slate-500 focus:ring-2 focus:ring-slate-100 outline-none text-sm font-medium text-slate-800 transition-all"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Brand & General Details */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <Building size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">ব্র্যান্ড ও কোম্পানি পরিচয়</h2>
              <p className="text-xs text-slate-500">ওয়েবসাইটের নাম ও প্রাথমিক ডোমেইন সংক্রান্ত তথ্য</p>
            </div>
          </div>

          <div className="space-y-3.5 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Brand Name *
                </label>
                <input
                  type="text"
                  value={formData.brandName}
                  onChange={e => handleChange('brandName', e.target.value)}
                  placeholder="CLICK2IT BD"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none text-sm font-medium text-slate-800 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Short Name
                </label>
                <input
                  type="text"
                  value={formData.brandShortName}
                  onChange={e => handleChange('brandShortName', e.target.value)}
                  placeholder="CLICK2IT"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none text-sm font-medium text-slate-800 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Globe size={13} className="text-emerald-500" />
                Website URL
              </label>
              <input
                type="url"
                value={formData.website}
                onChange={e => handleChange('website', e.target.value)}
                placeholder="https://click2it.bd"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none text-sm font-medium text-slate-800 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Card 4: Footer Copyright Text */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <Globe size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">ফুটার ও কপিরাইট টেক্সট</h2>
              <p className="text-xs text-slate-500">ওয়েবসাইটের নিচে কপিরাইট নোটিশ</p>
            </div>
          </div>

          <div className="space-y-3.5 pt-1">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Footer Copyright Text
              </label>
              <textarea
                rows={3}
                value={formData.footerText}
                onChange={e => handleChange('footerText', e.target.value)}
                placeholder="© 2026 CLICK2IT BD. All rights reserved."
                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none text-sm font-medium text-slate-800 transition-all"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">ওয়েবসাইটের সবচেয়ে নিচের অংশে এই লেখাটি দেখা যাবে।</span>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={saving || !hasChanges}
                className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
                  hasChanges
                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/25'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
              >
                {saving ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    Saving Changes...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    Save All Settings
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
