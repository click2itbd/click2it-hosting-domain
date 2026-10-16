import React, { useState, useEffect } from 'react';
import { Mail, Plus, Eye, ToggleLeft, ToggleRight, Send, Braces, CheckCircle2 } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { toast } from 'react-hot-toast';
import {
  collection, getDocs, setDoc, doc, serverTimestamp, query, orderBy
} from 'firebase/firestore';
import { db } from '../../../firebase';
import { Modal } from '../components/SharedUI';

const TYPE_META = {
  activation:        { label: 'Activation',        color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  renewal:           { label: 'Renewal',            color: 'bg-blue-100 text-blue-700 border-blue-200' },
  payment_reminder:  { label: 'Payment Reminder',   color: 'bg-amber-100 text-amber-700 border-amber-200' },
  welcome:           { label: 'Welcome',            color: 'bg-violet-100 text-violet-700 border-violet-200' },
  suspension:        { label: 'Suspension',         color: 'bg-rose-100 text-rose-700 border-rose-200' },
};

const VARIABLES = ['{{customer_name}}', '{{domain}}', '{{amount}}', '{{due_date}}'];

const DEFAULT_TEMPLATES = {
  welcome: {
    subject: 'Welcome to Click2IT – Your account is ready! 🎉',
    body: `Dear {{customer_name}},\n\nWelcome! Your account has been created successfully.\n\nYour domain: {{domain}}\n\nFeel free to reach out to our support team anytime.\n\nBest regards,\nThe Click2IT Team`,
  },
  activation: {
    subject: 'Your hosting account for {{domain}} is now active ✅',
    body: `Dear {{customer_name}},\n\nGreat news! Your hosting service for {{domain}} has been activated.\n\nYou can now access your control panel and start building your website.\n\nBest regards,\nThe Click2IT Team`,
  },
  renewal: {
    subject: 'Service Renewal Notice for {{domain}}',
    body: `Dear {{customer_name}},\n\nThis is a reminder that your service for {{domain}} is due for renewal.\n\nAmount Due: {{amount}}\nDue Date: {{due_date}}\n\nPlease renew before the due date to avoid interruption.\n\nBest regards,\nThe Click2IT Team`,
  },
  payment_reminder: {
    subject: 'Payment Reminder – Invoice Due on {{due_date}}',
    body: `Dear {{customer_name}},\n\nThis is a friendly reminder that your payment of {{amount}} is due on {{due_date}}.\n\nPlease complete the payment to keep your services running without interruption.\n\nBest regards,\nThe Click2IT Team`,
  },
  suspension: {
    subject: 'Service Suspended – Immediate Action Required for {{domain}}',
    body: `Dear {{customer_name}},\n\nYour service for {{domain}} has been suspended due to an unpaid balance of {{amount}}.\n\nTo restore your service, please make the payment immediately.\n\nBest regards,\nThe Click2IT Team`,
  },
};

export function EmailTemplatesModule() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ subject: '', body: '', isActive: true });
  const [saving, setSaving] = useState(false);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'emailTemplates'));
      const fetched = {};
      snap.docs.forEach(d => { fetched[d.id] = { id: d.id, ...d.data() }; });

      // Merge with defaults: all 5 types always present
      const merged = Object.keys(DEFAULT_TEMPLATES).map(type => {
        if (fetched[type]) return fetched[type];
        return {
          id: type,
          type,
          name: TYPE_META[type].label,
          subject: DEFAULT_TEMPLATES[type].subject,
          body: DEFAULT_TEMPLATES[type].body,
          isActive: true,
          createdAt: null,
        };
      });
      setTemplates(merged);
    } catch {
      toast.error('Failed to load email templates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTemplates(); }, []);

  const openEdit = (tpl) => {
    setSelected(tpl);
    setForm({ subject: tpl.subject || '', body: tpl.body || '', isActive: tpl.isActive !== false });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.subject.trim()) { toast.error('Subject is required'); return; }
    setSaving(true);
    try {
      const data = {
        type: selected.type,
        name: TYPE_META[selected.type].label,
        subject: form.subject.trim(),
        body: form.body.trim(),
        isActive: form.isActive,
        updatedAt: new Date().toISOString(),
        ...(selected.createdAt ? {} : { createdAt: new Date().toISOString() }),
      };
      await setDoc(doc(db, 'emailTemplates', selected.id), data, { merge: true });
      toast.success('Template saved successfully');
      setShowModal(false);
      fetchTemplates();
    } catch {
      toast.error('Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (tpl) => {
    try {
      await setDoc(doc(db, 'emailTemplates', tpl.id), {
        type: tpl.type,
        name: tpl.name,
        subject: tpl.subject,
        body: tpl.body,
        isActive: !tpl.isActive,
        createdAt: tpl.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      setTemplates(ts => ts.map(t => t.id === tpl.id ? { ...t, isActive: !t.isActive } : t));
      toast.success(tpl.isActive ? 'Template disabled' : 'Template enabled');
    } catch {
      toast.error('Failed to update status');
    }
  };

  const insertVariable = (v) => {
    setForm(f => ({ ...f, body: f.body + v }));
  };

  return (
    <div className="bg-white/40 backdrop-blur-xl rounded-3xl shadow-sm border border-slate-200/60 p-6 md:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl shadow-lg shadow-indigo-200">
              <Mail className="text-white" size={24} />
            </div>
            Email Templates
          </h2>
          <p className="text-slate-500 text-sm mt-1 ml-14">Manage automated email notifications sent to customers</p>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-44 bg-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map(tpl => {
            const meta = TYPE_META[tpl.type] || TYPE_META.welcome;
            return (
              <div
                key={tpl.id}
                className={cn(
                  'relative flex flex-col rounded-2xl border overflow-hidden transition-all duration-300 bg-white hover:-translate-y-1 hover:shadow-xl',
                  tpl.isActive ? 'border-slate-200 shadow-md' : 'border-slate-100 opacity-70 shadow-sm'
                )}
              >
                {/* Top accent bar */}
                <div className={cn('h-1.5 w-full', {
                  'bg-emerald-400': tpl.type === 'activation',
                  'bg-blue-400':    tpl.type === 'renewal',
                  'bg-amber-400':   tpl.type === 'payment_reminder',
                  'bg-violet-400':  tpl.type === 'welcome',
                  'bg-rose-400':    tpl.type === 'suspension',
                })} />

                <div className="p-5 flex flex-col gap-3 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <span className={cn('text-[11px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border', meta.color)}>
                      {meta.label}
                    </span>
                    {/* Active toggle */}
                    <button
                      onClick={() => toggleActive(tpl)}
                      title={tpl.isActive ? 'Disable template' : 'Enable template'}
                      className="text-slate-400 hover:text-indigo-600 transition-colors"
                    >
                      {tpl.isActive
                        ? <ToggleRight size={26} className="text-emerald-500" />
                        : <ToggleLeft size={26} />}
                    </button>
                  </div>

                  <div>
                    <p className="font-bold text-slate-800 text-sm">{tpl.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{tpl.subject}</p>
                  </div>

                  <div className="mt-auto pt-3 border-t border-slate-100">
                    <button
                      onClick={() => openEdit(tpl)}
                      className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors"
                    >
                      <Eye size={15} /> Edit Template
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={`Edit: ${selected ? TYPE_META[selected.type]?.label : ''} Template`} maxWidth="max-w-2xl">
        {selected && (
          <form onSubmit={handleSave} className="space-y-5">
            {/* Variables Helper */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Braces size={16} className="text-indigo-500" />
                <span className="text-sm font-bold text-slate-700">Available Variables</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {VARIABLES.map(v => (
                  <button
                    type="button"
                    key={v}
                    onClick={() => insertVariable(v)}
                    className="font-mono text-xs bg-white border border-indigo-200 text-indigo-600 px-2.5 py-1 rounded-lg hover:bg-indigo-50 hover:border-indigo-400 transition-colors"
                    title="Click to insert"
                  >
                    {v}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-400 mt-2">Click a variable to insert it at the end of the body, or paste manually.</p>
            </div>

            {/* Subject */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">
                Subject <span className="text-red-500">*</span>
              </label>
              <input
                required
                type="text"
                value={form.subject}
                onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-slate-800 transition-all outline-none"
                placeholder="Email subject line..."
              />
            </div>

            {/* Body */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Body</label>
              <textarea
                rows={12}
                value={form.body}
                onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-slate-800 transition-all outline-none font-mono resize-y"
                placeholder="Email body content..."
              />
            </div>

            {/* Active Toggle */}
            <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-xl">
              <div>
                <p className="font-bold text-slate-800 text-sm">Template Active</p>
                <p className="text-xs text-slate-500">Deactivate to stop sending this email type</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500" />
              </label>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100 gap-3">
              <button
                type="button"
                onClick={() => toast.success('Test email sent (demo)')}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-violet-700 bg-violet-50 border border-violet-200 rounded-xl hover:bg-violet-100 transition-colors"
              >
                <Send size={15} /> Send Test Email
              </button>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-bold transition-colors outline-none">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="bg-slate-900 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg hover:bg-indigo-600 hover:shadow-indigo-200 hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:hover:translate-y-0 flex items-center gap-2 outline-none">
                  {saving ? 'Saving...' : <><CheckCircle2 size={16} /> Save Template</>}
                </button>
              </div>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
