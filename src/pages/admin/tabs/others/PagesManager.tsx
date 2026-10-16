import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { db } from '../../../../firebase';
import { toast } from 'react-hot-toast';
import { Save, FileText, Loader2 } from 'lucide-react';

const PAGE_TEMPLATES = [
  { id: 'privacy-policy', name: 'Privacy Policy' },
  { id: 'warranty-policy', name: 'Warranty Policy' },
  { id: 'refund-policy', name: 'Refund & Return Policy' },
  { id: 'emi-terms', name: 'EMI Terms' },
  { id: 'online-delivery', name: 'Online Delivery' },
  { id: 'star-point-policy', name: 'Star Point Policy' },
  { id: 'about-us', name: 'About Us' },
];

export const PagesManager: React.FC = () => {
  const [activePage, setActivePage] = useState(PAGE_TEMPLATES[0].id);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPageContent(activePage);
  }, [activePage]);

  const fetchPageContent = async (pageId: string) => {
    setLoading(true);
    try {
      // Find the page in Firestore
      const snap = await getDocs(collection(db, 'pages'));
      const pageDoc = snap.docs.find(d => d.id === pageId);
      if (pageDoc) {
        setContent(pageDoc.data().content || '');
      } else {
        setContent(''); // Empty if not exists
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to load page content');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'pages', activePage), {
        title: PAGE_TEMPLATES.find(p => p.id === activePage)?.name || activePage,
        content: content,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      toast.success('Page updated successfully!');
    } catch (error) {
      console.error(error);
      toast.error('Failed to save page');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
          <FileText size={20} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Pages & Policies Manager</h2>
          <p className="text-sm text-gray-500">Edit the content of your static pages (HTML supported).</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar */}
        <div className="w-full md:w-64 space-y-2">
          {PAGE_TEMPLATES.map(page => (
            <button
              key={page.id}
              onClick={() => setActivePage(page.id)}
              className={`w-full text-left px-4 py-3 rounded-xl font-medium transition-colors ${
                activePage === page.id 
                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' 
                  : 'text-gray-600 hover:bg-gray-50 border border-transparent'
              }`}
            >
              {page.name}
            </button>
          ))}
        </div>

        {/* Editor */}
        <div className="flex-1 flex flex-col min-h-[500px]">
          {loading ? (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <Loader2 className="animate-spin" size={24} />
            </div>
          ) : (
            <>
              <div className="bg-gray-50 p-4 border border-gray-200 rounded-t-xl border-b-0 flex justify-between items-center">
                <h3 className="font-bold text-gray-800">{PAGE_TEMPLATES.find(p => p.id === activePage)?.name} Content</h3>
                <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded shadow-sm border border-gray-100">HTML Supported</span>
              </div>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="flex-1 w-full p-4 border border-gray-200 rounded-b-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm resize-none"
                placeholder={`<h1>Welcome to ${PAGE_TEMPLATES.find(p => p.id === activePage)?.name}</h1>\n\nWrite your HTML content here...`}
              />
              <div className="mt-4 flex justify-end">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                  Save Page
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
