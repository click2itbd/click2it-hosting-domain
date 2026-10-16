import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import {
  collection, getDocs, addDoc, updateDoc, deleteDoc, doc,
  serverTimestamp, query, orderBy
} from 'firebase/firestore';
import { db } from '../../../firebase';
import { Modal, StatusBadge, EmptyState, slugify } from '../components/SharedUI';
import { FileEdit, Plus, Edit2, Trash2, Eye, LayoutTemplate, Settings2, Code, Globe } from 'lucide-react';
import DOMPurify from 'dompurify';

export function PagesEditorModule() {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  
  const defaultForm = { 
    title: '', slug: '', content: '', status: 'draft', 
    metaTitle: '', metaDescription: '' 
  };
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('editor'); // editor, preview, seo

  const fetchPages = async () => {
    try {
      const snap = await getDocs(query(collection(db, 'pages'), orderBy('createdAt', 'desc')));
      setPages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      toast.error('Failed to load pages');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPages(); }, []);

  const openAdd = () => {
    setEditing(null);
    setForm(defaultForm);
    setActiveTab('editor');
    setShowModal(true);
  };

  const openEdit = (page) => {
    setEditing(page);
    setForm({ 
      title: page.title, slug: page.slug, content: page.content || '', 
      status: page.status, metaTitle: page.metaTitle || '', metaDescription: page.metaDescription || '' 
    });
    setActiveTab('editor');
    setShowModal(true);
  };

  const handleTitleChange = (e) => {
    const title = e.target.value;
    setForm(f => ({ ...f, title, slug: editing ? f.slug : slugify(title) }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { toast.error('Title is required'); return; }
    setSaving(true);
    try {
      const payload = {
        title: form.title, slug: form.slug, content: form.content, status: form.status,
        metaTitle: form.metaTitle, metaDescription: form.metaDescription,
        updatedAt: new Date().toISOString()
      };
      
      if (editing) {
        await updateDoc(doc(db, 'pages', editing.id), payload);
        toast.success('Page updated successfully');
      } else {
        await addDoc(collection(db, 'pages'), {
          ...payload,
          createdAt: serverTimestamp(),
        });
        toast.success('New page published');
      }
      setShowModal(false);
      fetchPages();
    } catch (err) {
      toast.error('Failed to save page');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this page? This action cannot be reversed.')) return;
    try {
      await deleteDoc(doc(db, 'pages', id));
      toast.success('Page deleted');
      setPages(p => p.filter(x => x.id !== id));
    } catch (err) {
      toast.error('Failed to delete page');
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
      <div className="flex justify-between items-center p-6 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
            <FileEdit className="text-indigo-600" size={20} />
          </div>
          <div>
            <h3 className="text-lg font-extrabold text-slate-800 tracking-tight">Pages Editor</h3>
            <p className="text-xs font-medium text-slate-500 mt-0.5">Manage your dynamic frontend pages</p>
          </div>
        </div>
        <button onClick={openAdd} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl shadow-sm hover:shadow-md text-sm font-bold flex items-center gap-2 transition-all hover:-translate-y-0.5">
          <Plus size={18} /> Create Page
        </button>
      </div>

      <div className="p-6">
        {loading ? (
          <div className="text-center py-12 text-slate-500 animate-pulse">Loading pages structure...</div>
        ) : pages.length === 0 ? (
          <EmptyState message="No pages found. Create your first page to get started!" />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {pages.map(page => (
              <div key={page.id} className="group bg-white border border-slate-200 rounded-2xl p-5 hover:border-indigo-300 hover:shadow-lg transition-all duration-300 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                  <button onClick={() => openEdit(page)} className="w-8 h-8 bg-white shadow-sm border border-slate-200 rounded-full flex items-center justify-center text-blue-600 hover:bg-blue-50 transition-colors">
                    <Edit2 size={14} />
                  </button>
                  <button onClick={() => handleDelete(page.id)} className="w-8 h-8 bg-white shadow-sm border border-slate-200 rounded-full flex items-center justify-center text-rose-500 hover:bg-rose-50 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
                
                <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center mb-4">
                  <LayoutTemplate className="text-slate-400" size={24} />
                </div>
                <h4 className="font-bold text-slate-800 text-lg mb-1 pr-16 truncate">{page.title}</h4>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-4 font-mono bg-slate-50 px-2 py-1 rounded inline-flex">
                  <Globe size={12} className="text-slate-400" /> /{page.slug}
                </div>
                
                <div className="flex justify-between items-end mt-4 pt-4 border-t border-slate-100">
                  <StatusBadge status={page.status} />
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {page.updatedAt ? new Date(page.updatedAt).toLocaleDateString() : 'New'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Page details' : 'Create New Page'} maxWidth="max-w-4xl">
        <form onSubmit={handleSave} className="flex flex-col h-[70vh] max-h-[600px]">
          {/* Tab Navigation */}
          <div className="flex gap-2 border-b border-slate-200 mb-5 px-1 shrink-0">
            {[
              { id: 'editor', label: 'Editor', icon: Code },
              { id: 'preview', label: 'Preview', icon: Eye },
              { id: 'seo', label: 'SEO Settings', icon: Settings2 },
            ].map(tab => (
              <button
                key={tab.id} type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold border-b-2 transition-colors ${activeTab === tab.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}>
                <tab.icon size={16} /> {tab.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {activeTab === 'editor' && (
              <div className="space-y-5 animate-in fade-in duration-200">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-2">Page Title</label>
                    <input required type="text" value={form.title} onChange={handleTitleChange}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 text-sm font-semibold transition-all outline-none" placeholder="e.g. Terms of Service" />
                  </div>
                  <div>
                    <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-2">URL Slug</label>
                    <input required type="text" value={form.slug} onChange={e => setForm(f => ({ ...f, slug: slugify(e.target.value) }))}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 text-sm font-mono text-slate-600 transition-all outline-none" placeholder="terms-of-service" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-2 flex justify-between">
                    HTML Content
                    <span className="text-indigo-500 normal-case tracking-normal font-medium">Supports Tailwind Classes</span>
                  </label>
                  <textarea required rows={12} value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                    className="w-full px-4 py-3 bg-[#0F172A] text-[#38BDF8] border border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm font-mono transition-all outline-none resize-none leading-relaxed" 
                    placeholder="<div className='container mx-auto py-10'>\n  <h1 className='text-3xl font-bold'>Hello World</h1>\n</div>" />
                </div>
              </div>
            )}

            {activeTab === 'preview' && (
              <div className="animate-in fade-in duration-200 border-2 border-dashed border-slate-200 rounded-xl p-4 min-h-[300px] bg-white">
                {form.content ? (
                  <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(form.content) }} />
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400 text-sm font-medium">
                    Nothing to preview yet. Add some HTML content.
                  </div>
                )}
              </div>
            )}

            {activeTab === 'seo' && (
              <div className="space-y-5 animate-in fade-in duration-200">
                <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 mb-6">
                  <h4 className="text-sm font-bold text-indigo-900 mb-1">Search Engine Optimization</h4>
                  <p className="text-xs text-indigo-700">Improve your page ranking by providing accurate meta tags.</p>
                </div>
                <div>
                  <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-2">Meta Title</label>
                  <input type="text" value={form.metaTitle} onChange={e => setForm(f => ({ ...f, metaTitle: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 text-sm font-semibold transition-all outline-none" placeholder="Primary keyword rich title (Max 60 chars)" />
                </div>
                <div>
                  <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-2">Meta Description</label>
                  <textarea rows={4} value={form.metaDescription} onChange={e => setForm(f => ({ ...f, metaDescription: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 text-sm font-semibold transition-all outline-none resize-none" placeholder="Brief summary of the page for search results (Max 160 chars)" />
                </div>
                <div>
                  <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-2">Publish Status</label>
                  <div className="flex gap-4">
                    <label className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 cursor-pointer transition-all ${form.status === 'published' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                      <input type="radio" name="status" value="published" checked={form.status === 'published'} onChange={() => setForm(f => ({ ...f, status: 'published' }))} className="hidden" />
                      <div className={`w-3 h-3 rounded-full ${form.status === 'published' ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                      <span className="font-bold text-sm">Published</span>
                    </label>
                    <label className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 cursor-pointer transition-all ${form.status === 'draft' ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                      <input type="radio" name="status" value="draft" checked={form.status === 'draft'} onChange={() => setForm(f => ({ ...f, status: 'draft' }))} className="hidden" />
                      <div className={`w-3 h-3 rounded-full ${form.status === 'draft' ? 'bg-amber-500' : 'bg-slate-300'}`}></div>
                      <span className="font-bold text-sm">Draft</span>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-between items-center pt-5 mt-auto border-t border-slate-100 shrink-0">
            <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 transition-colors rounded-xl font-bold text-sm">Cancel</button>
            <button type="submit" disabled={saving} className="bg-indigo-600 text-white px-8 py-2.5 rounded-xl font-bold text-sm shadow-md hover:shadow-lg hover:bg-indigo-700 hover:-translate-y-0.5 transition-all disabled:opacity-70 flex items-center gap-2">
              {saving ? 'Saving...' : 'Save Page'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
