import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, getDocs, doc, updateDoc, deleteDoc, addDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { Camera, Briefcase, Monitor, Server, Shield, Home, Trash2, Plus, Edit2, Loader2, CheckCircle2, MessageSquare, Save, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useConfirm } from '../../context/ConfirmContext';

export const EcommerceProjects = () => {
  const { confirm } = useConfirm();
  const [activeTab, setActiveTab] = useState<'quotes' | 'showcase'>('quotes');
  const [quotes, setQuotes] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State for Showcase Projects
  const [isAdding, setIsAdding] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    client: '',
    description: '',
    image: '',
    features: '',
    iconName: 'Briefcase'
  });

  const availableIcons = ['Camera', 'Briefcase', 'Monitor', 'Server', 'Shield', 'Home'];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const qQuotes = query(collection(db, 'quote_requests'), orderBy('createdAt', 'desc'));
      const snapQuotes = await getDocs(qQuotes);
      setQuotes(snapQuotes.docs.map(d => ({ id: d.id, ...d.data() })));

      const qProjects = query(collection(db, 'showcase_projects'), orderBy('createdAt', 'desc'));
      const snapProjects = await getDocs(qProjects);
      setProjects(snapProjects.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error(err);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateQuoteStatus = async (id: string, status: string) => {
    try {
      await updateDoc(doc(db, 'quote_requests', id), { status });
      setQuotes(prev => prev.map(q => q.id === id ? { ...q, status } : q));
      toast.success('Status updated');
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  
  const handleSaveProject = async () => {
    try {
      const payload = {
        title: formData.title,
        category: formData.category,
        client: formData.client,
        description: formData.description,
        image: formData.image,
        iconName: formData.iconName,
        features: formData.features.split(',').map(s => s.trim()).filter(Boolean),
      };

      if (editId) {
        await updateDoc(doc(db, 'showcase_projects', editId), payload);
        toast.success('Project updated');
      } else {
        await addDoc(collection(db, 'showcase_projects'), {
          ...payload,
          createdAt: serverTimestamp()
        });
        toast.success('Project added');
      }
      setIsAdding(false);
      setEditId(null);
      setFormData({ title: '', category: '', client: '', description: '', image: '', features: '', iconName: 'Briefcase' });
      fetchData();
    } catch (err) {
      toast.error('Failed to save project');
    }
  };

  const handleDeleteProject = async (id: string) => {
    if (!await confirm({ title: 'Confirmation', message: 'Are you sure?', isDestructive: true })) return;
    try {
      await deleteDoc(doc(db, 'showcase_projects', id));
      setProjects(prev => prev.filter(p => p.id !== id));
      toast.success('Project deleted');
    } catch (err) {
      toast.error('Failed to delete project');
    }
  };

  const renderIcon = (name: string, props: any) => {
    const Icons = { Camera, Briefcase, Monitor, Server, Shield, Home };
    const Icon = (Icons as any)[name] || Briefcase;
    return <Icon {...props} />;
  };

  if (loading) {
    return <div className="flex items-center justify-center h-96"><Loader2 size={32} className="animate-spin text-blue-600" /></div>;
  }

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Projects & Quotes</h2>
          <p className="text-sm text-slate-500 mt-1">Manage quotation requests and showcase projects.</p>
        </div>
        <div className="flex bg-slate-200 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('quotes')}
            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'quotes' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Quote Requests
          </button>
          <button
            onClick={() => setActiveTab('showcase')}
            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'showcase' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Showcase Projects
          </button>
        </div>
      </div>

      {activeTab === 'quotes' && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wider font-bold">
                  <th className="p-4 border-b border-slate-200">Date</th>
                  <th className="p-4 border-b border-slate-200">Client Info</th>
                  <th className="p-4 border-b border-slate-200">Project Type</th>
                  <th className="p-4 border-b border-slate-200">Details</th>
                  <th className="p-4 border-b border-slate-200">Status</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-slate-100">
                {quotes.length === 0 && (
                  <tr><td colSpan={5} className="p-8 text-center text-slate-500">No quote requests yet.</td></tr>
                )}
                {quotes.map(q => (
                  <tr key={q.id} className="hover:bg-slate-50/50">
                    <td className="p-4 text-slate-600 whitespace-nowrap">
                      {q.createdAt?.toDate ? q.createdAt.toDate().toLocaleDateString() : 'Just now'}
                    </td>
                    <td className="p-4">
                      <p className="font-bold text-slate-900">{q.name}</p>
                      {q.company && <p className="text-xs text-slate-500">{q.company}</p>}
                      <p className="text-xs text-blue-600 mt-1">{q.phone}</p>
                      <p className="text-xs text-slate-500">{q.email}</p>
                    </td>
                    <td className="p-4 font-bold text-slate-700">{q.projectType}</td>
                    <td className="p-4 max-w-xs text-xs text-slate-600 line-clamp-3">{q.details}</td>
                    <td className="p-4">
                      <select 
                        value={q.status || 'pending'} 
                        onChange={(e) => handleUpdateQuoteStatus(q.id, e.target.value)}
                        className={`text-xs font-bold px-3 py-1.5 rounded-full border outline-none cursor-pointer ${
                          q.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          q.status === 'contacted' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        <option value="pending">Pending</option>
                        <option value="contacted">Contacted</option>
                        <option value="completed">Completed</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'showcase' && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button 
              onClick={() => {
                setIsAdding(true); setEditId(null);
                setFormData({ title: '', category: '', client: '', description: '', image: '', features: '', iconName: 'Briefcase' });
              }}
              className="flex items-center gap-2 bg-slate-900 hover:bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold transition-colors"
            >
              <Plus size={18} /> Add Project
            </button>
          </div>

          {isAdding && (
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 animate-in fade-in slide-in-from-top-4">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-black">{editId ? 'Edit Project' : 'New Project'}</h3>
                <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-red-500"><X size={20}/></button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-bold mb-1">Title</label>
                  <input type="text" className="w-full border rounded-xl px-3 py-2 text-sm" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">Category</label>
                  <input type="text" className="w-full border rounded-xl px-3 py-2 text-sm" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">Client Name</label>
                  <input type="text" className="w-full border rounded-xl px-3 py-2 text-sm" value={formData.client} onChange={e => setFormData({...formData, client: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">Image URL</label>
                  <input type="text" className="w-full border rounded-xl px-3 py-2 text-sm" value={formData.image} onChange={e => setFormData({...formData, image: e.target.value})} />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold mb-1">Icon</label>
                  <div className="flex gap-2">
                    {availableIcons.map(icon => (
                      <button 
                        key={icon} type="button" 
                        onClick={() => setFormData({...formData, iconName: icon})}
                        className={`p-3 rounded-xl border transition-colors ${formData.iconName === icon ? 'bg-blue-50 border-blue-500 text-blue-600' : 'text-slate-500 hover:bg-slate-50'}`}
                      >
                        {renderIcon(icon, { size: 20 })}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold mb-1">Features (comma separated)</label>
                  <input type="text" className="w-full border rounded-xl px-3 py-2 text-sm" value={formData.features} onChange={e => setFormData({...formData, features: e.target.value})} placeholder="Feature 1, Feature 2, ..." />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold mb-1">Description</label>
                  <textarea rows={3} className="w-full border rounded-xl px-3 py-2 text-sm resize-none" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}></textarea>
                </div>
              </div>
              <button onClick={handleSaveProject} className="bg-blue-600 text-white font-bold px-6 py-2.5 rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-2">
                <Save size={18} /> Save Project
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {projects.map(p => (
              <div key={p.id} className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm flex flex-col group">
                <div className="h-40 overflow-hidden relative">
                  <img src={p.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  <div className="absolute inset-0 bg-black/40" />
                  <div className="absolute top-4 left-4 bg-white/90 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5">
                    {renderIcon(p.iconName, { size: 14, className: "text-blue-600" })} {p.category}
                  </div>
                  <div className="absolute top-4 right-4 flex gap-1">
                    <button onClick={() => {
                      setFormData({
                        title: p.title, category: p.category, client: p.client, description: p.description, image: p.image, iconName: p.iconName || 'Briefcase', features: (p.features || []).join(', ')
                      });
                      setEditId(p.id);
                      setIsAdding(true);
                    }} className="w-8 h-8 bg-white/90 text-blue-600 rounded-full flex items-center justify-center hover:bg-white"><Edit2 size={14}/></button>
                    <button onClick={() => handleDeleteProject(p.id)} className="w-8 h-8 bg-white/90 text-red-600 rounded-full flex items-center justify-center hover:bg-white"><Trash2 size={14}/></button>
                  </div>
                </div>
                <div className="p-6">
                  <h4 className="font-black text-lg mb-1">{p.title}</h4>
                  <p className="text-xs font-bold text-slate-400 mb-4">{p.client}</p>
                  <p className="text-sm text-slate-600 line-clamp-3">{p.description}</p>
                </div>
              </div>
            ))}
            {projects.length === 0 && (
              <div className="col-span-full text-center py-12 text-slate-500 bg-slate-100 rounded-3xl border border-dashed border-slate-300">
                No projects added yet. Click "Add Project" to showcase your work.
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
