import React, { useState, useEffect } from 'react';
import { Layout } from './Layout';
import { SEO } from './SEO';
import { useSettings } from '../context/SettingsContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Loader2 } from 'lucide-react';
import DOMPurify from 'dompurify';

export const DynamicPolicyPage: React.FC<{ pageId: string, defaultTitle: string, defaultContent: string }> = ({ pageId, defaultTitle, defaultContent }) => {
  const { settings } = useSettings();
  const brandName = settings?.brandName || 'Click2IT BD';
  const [content, setContent] = useState(defaultContent);
  const [title, setTitle] = useState(defaultTitle);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPage = async () => {
      try {
        const pageDoc = await getDoc(doc(db, 'pages', pageId));
        if (pageDoc.exists()) {
          const data = pageDoc.data();
          if (data.content) setContent(data.content);
          if (data.title) setTitle(data.title);
        }
      } catch (error) {
        console.error("Failed to load policy page:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchPage();
  }, [pageId]);

  return (
    <Layout fullWidth>
      <SEO title={`${title} - ${brandName}`} description={`${title} for ${brandName}.`} />
      <div className="bg-gray-50 py-16 min-h-screen">
        <div className="container mx-auto px-2 sm:px-4 sm:px-6 lg:px-8 max-w-4xl">
          <div className="bg-white p-8 md:p-12 rounded-3xl shadow-sm border border-gray-100">
            {loading ? (
               <div className="flex justify-center items-center h-64 text-gray-400">
                 <Loader2 className="animate-spin w-10 h-10" />
               </div>
            ) : (
               <>
                 <h1 className="text-4xl font-bold text-gray-900 mb-6">{title}</h1>
                 <div className="prose prose-blue max-w-none text-gray-700 space-y-6" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content.replace(/{brandName}/g, brandName)) }} />
               </>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};
