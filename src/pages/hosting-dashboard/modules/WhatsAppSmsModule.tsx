import React, { useState, useEffect } from 'react';
import { MessageCircle, Smartphone, Eye, EyeOff, Save, Bell, CheckCircle2, Loader2 } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { toast } from 'react-hot-toast';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../../firebase';

const DOC_PATH = { col: 'notification_config', id: 'whatsapp_sms' };

const EMPTY_CONFIG = {
  whatsapp: { enabled: false, apiKey: '', phoneNumberId: '', businessAccountId: '', webhookToken: '' },
  sms: { enabled: false, provider: 'twilio', apiKey: '', apiSecret: '', senderId: '' },
  notifyOn: {
    newOrder: true,
    paymentReceived: true,
    domainExpiry: true,
    hostingExpiry: true,
    ticketReply: true,
  },
};

const NOTIFY_LABELS = {
  newOrder:        { label: 'New Order Placed',          icon: '🛒' },
  paymentReceived: { label: 'Payment Received',          icon: '💳' },
  domainExpiry:    { label: 'Domain Expiry Reminder',    icon: '🌐' },
  hostingExpiry:   { label: 'Hosting Expiry Reminder',   icon: '🖥️' },
  ticketReply:     { label: 'Support Ticket Reply',      icon: '🎫' },
};

const SMS_PROVIDERS = ['twilio', 'nexmo', 'africastalking', 'infobip', 'other'];

function PasswordInput({ value, onChange, placeholder, className = '' }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={cn('w-full pr-10 px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-slate-800 transition-all outline-none', className)}
      />
      <button
        type="button"
        onClick={() => setShow(s => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors"
      >
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}

function SectionCard({ icon, title, subtitle, enabled, onToggle, accentColor, children }) {
  return (
    <div className={cn(
      'rounded-2xl border overflow-hidden transition-all duration-300',
      enabled ? 'border-slate-200 shadow-md bg-white' : 'border-slate-100 bg-slate-50/70'
    )}>
      {/* Card header */}
      <div className={cn(
        'flex items-center justify-between px-6 py-4 border-b',
        enabled ? 'border-slate-100' : 'border-transparent'
      )}>
        <div className="flex items-center gap-3">
          <div className={cn('p-2 rounded-xl text-white shadow-md', accentColor)}>
            {icon}
          </div>
          <div>
            <p className="font-bold text-slate-800">{title}</p>
            <p className="text-xs text-slate-500">{subtitle}</p>
          </div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input type="checkbox" className="sr-only peer" checked={enabled} onChange={onToggle} />
          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500" />
        </label>
      </div>
      {enabled && <div className="p-6 space-y-4">{children}</div>}
      {!enabled && (
        <div className="px-6 py-5 text-center text-slate-400 text-sm font-medium">
          Enable to configure credentials
        </div>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-sm font-bold text-slate-700 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

export function WhatsAppSmsModule() {
  const [config, setConfig] = useState(EMPTY_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDoc(doc(db, DOC_PATH.col, DOC_PATH.id));
        if (snap.exists()) {
          // Deep merge to ensure all keys present
          const data = snap.data();
          setConfig({
            whatsapp: { ...EMPTY_CONFIG.whatsapp, ...(data.whatsapp || {}) },
            sms:      { ...EMPTY_CONFIG.sms,      ...(data.sms || {}) },
            notifyOn: { ...EMPTY_CONFIG.notifyOn,  ...(data.notifyOn || {}) },
          });
        }
      } catch {
        toast.error('Failed to load notification settings');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const setWA = (key, val) => setConfig(c => ({ ...c, whatsapp: { ...c.whatsapp, [key]: val } }));
  const setSMS = (key, val) => setConfig(c => ({ ...c, sms: { ...c.sms, [key]: val } }));
  const setNotify = (key, val) => setConfig(c => ({ ...c, notifyOn: { ...c.notifyOn, [key]: val } }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, DOC_PATH.col, DOC_PATH.id), config);
      toast.success('Notification settings saved!');
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white/40 backdrop-blur-xl rounded-3xl shadow-sm border border-slate-200/60 p-8 flex items-center justify-center min-h-[300px]">
        <Loader2 className="animate-spin text-indigo-500" size={36} />
      </div>
    );
  }

  return (
    <div className="bg-white/40 backdrop-blur-xl rounded-3xl shadow-sm border border-slate-200/60 p-6 md:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg shadow-green-200">
              <MessageCircle className="text-white" size={24} />
            </div>
            WhatsApp / SMS Alerts
          </h2>
          <p className="text-slate-500 text-sm mt-1 ml-14">Configure messaging channels for automated customer notifications</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => toast.success('Test notification sent! (demo)')}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-violet-700 bg-violet-50 border border-violet-200 rounded-xl hover:bg-violet-100 transition-colors"
          >
            <Bell size={15} /> Test Notification
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md hover:bg-indigo-600 hover:shadow-indigo-200 hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:hover:translate-y-0"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? 'Saving...' : 'Save All'}
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {/* WhatsApp Business API */}
        <SectionCard
          icon={<MessageCircle size={20} />}
          title="WhatsApp Business API"
          subtitle="Meta Cloud API / On-premise API"
          enabled={config.whatsapp.enabled}
          onToggle={e => setWA('enabled', e.target.checked)}
          accentColor="bg-gradient-to-br from-green-500 to-emerald-600"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="API Key / Access Token">
              <PasswordInput
                value={config.whatsapp.apiKey}
                onChange={e => setWA('apiKey', e.target.value)}
                placeholder="EAAxxxxxxxx..."
              />
            </Field>
            <Field label="Phone Number ID">
              <input
                type="text"
                value={config.whatsapp.phoneNumberId}
                onChange={e => setWA('phoneNumberId', e.target.value)}
                placeholder="1234567890"
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-slate-800 transition-all outline-none"
              />
            </Field>
            <Field label="Business Account ID">
              <input
                type="text"
                value={config.whatsapp.businessAccountId}
                onChange={e => setWA('businessAccountId', e.target.value)}
                placeholder="Business Account ID"
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-slate-800 transition-all outline-none"
              />
            </Field>
            <Field label="Webhook Verify Token">
              <PasswordInput
                value={config.whatsapp.webhookToken}
                onChange={e => setWA('webhookToken', e.target.value)}
                placeholder="your_webhook_secret"
              />
            </Field>
          </div>
        </SectionCard>

        {/* SMS Provider */}
        <SectionCard
          icon={<Smartphone size={20} />}
          title="SMS Provider"
          subtitle="Twilio, Nexmo, Africa's Talking & more"
          enabled={config.sms.enabled}
          onToggle={e => setSMS('enabled', e.target.checked)}
          accentColor="bg-gradient-to-br from-blue-500 to-indigo-600"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="SMS Provider">
              <select
                value={config.sms.provider}
                onChange={e => setSMS('provider', e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-slate-800 transition-all outline-none capitalize"
              >
                {SMS_PROVIDERS.map(p => (
                  <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                ))}
              </select>
            </Field>
            <Field label="Sender ID / From Number">
              <input
                type="text"
                value={config.sms.senderId}
                onChange={e => setSMS('senderId', e.target.value)}
                placeholder="+880xxxxxxxxxx or BrandName"
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-slate-800 transition-all outline-none"
              />
            </Field>
            <Field label="API Key / Account SID">
              <PasswordInput
                value={config.sms.apiKey}
                onChange={e => setSMS('apiKey', e.target.value)}
                placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              />
            </Field>
            <Field label="API Secret / Auth Token">
              <PasswordInput
                value={config.sms.apiSecret}
                onChange={e => setSMS('apiSecret', e.target.value)}
                placeholder="Auth token or secret..."
              />
            </Field>
          </div>
        </SectionCard>

        {/* Notification Triggers */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-md overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100">
            <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-md">
              <Bell size={20} />
            </div>
            <div>
              <p className="font-bold text-slate-800">Notification Triggers</p>
              <p className="text-xs text-slate-500">Select which events trigger WhatsApp / SMS alerts</p>
            </div>
          </div>
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(NOTIFY_LABELS).map(([key, { label, icon }]) => (
              <label
                key={key}
                className={cn(
                  'flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all select-none',
                  config.notifyOn[key]
                    ? 'bg-indigo-50 border-indigo-200 shadow-sm'
                    : 'bg-slate-50 border-slate-100 hover:border-slate-200'
                )}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={config.notifyOn[key]}
                  onChange={e => setNotify(key, e.target.checked)}
                />
                <div className={cn(
                  'w-5 h-5 rounded-md flex items-center justify-center border-2 flex-shrink-0 transition-all',
                  config.notifyOn[key] ? 'bg-indigo-500 border-indigo-500' : 'bg-white border-slate-300'
                )}>
                  {config.notifyOn[key] && <CheckCircle2 size={13} className="text-white" />}
                </div>
                <span className="text-xl flex-shrink-0">{icon}</span>
                <span className={cn('text-sm font-semibold', config.notifyOn[key] ? 'text-indigo-700' : 'text-slate-600')}>
                  {label}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Bottom Save Button */}
        <div className="flex justify-end pt-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-slate-900 text-white px-8 py-3 rounded-xl text-sm font-bold shadow-lg hover:bg-indigo-600 hover:shadow-indigo-200 hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:hover:translate-y-0"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? 'Saving...' : 'Save All Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
