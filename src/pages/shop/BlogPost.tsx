import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { Calendar, User, ArrowLeft, Tag, Share2, Facebook, Twitter, Linkedin } from 'lucide-react';
import DOMPurify from 'dompurify';
import { SEO } from '../../components/SEO';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  imageUrl?: string;
  author: string;
  tags: string[];
  status: 'draft' | 'published';
  createdAt: string;
}

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const q = query(collection(db, 'ecommerce_blog'), where('slug', '==', slug));
        const snap = await getDocs(q);
        
        if (!snap.empty) {
          setPost({ id: snap.docs[0].id, ...snap.docs[0].data() } as BlogPost);
        } else {
          setPost(null);
        }
      } catch (error) {
        console.error('Error fetching blog post:', error);
      } finally {
        setLoading(false);
      }
    };
    
    if (slug) fetchPost();
  }, [slug]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="w-12 h-12 border-4 border-[#F97316] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center bg-gray-50 px-4">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Post Not Found</h1>
        <p className="text-gray-600 mb-8">The article you are looking for does not exist or has been removed.</p>
        <button onClick={() => navigate('/blog')} className="px-6 py-3 bg-[#F97316] text-white font-bold rounded-lg hover:bg-[#ea580c] transition-colors">
          Back to Blog
        </button>
      </div>
    );
  }

  // Handle line breaks in content
  const renderContent = () => {
    // Basic formatting: handle paragraphs
    const paragraphs = post.content.split('\n').filter(p => p.trim() !== '');
    return paragraphs.map((p, idx) => (
      <p key={idx} className="mb-6 leading-relaxed">{p}</p>
    ));
  };

  const postUrl = `https://click2itbd.com/blog/${post.slug}`;
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt || post.title,
    image: post.imageUrl ? [post.imageUrl] : ['https://click2itbd.com/logo.png'],
    datePublished: post.createdAt,
    dateModified: post.createdAt,
    author: {
      '@type': 'Person',
      name: post.author || 'CLICK2IT Team'
    },
    publisher: {
      '@type': 'Organization',
      name: 'CLICK2IT',
      logo: {
        '@type': 'ImageObject',
        url: 'https://click2itbd.com/logo.png'
      }
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': postUrl
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen py-10">
      <SEO
        title={`${post.title} | CLICK2IT Blog`}
        description={post.excerpt || `Read ${post.title} on CLICK2IT blog.`}
        image={post.imageUrl || 'https://click2itbd.com/logo.png'}
        url={postUrl}
        canonical={postUrl}
        type="article"
        schema={[articleSchema]}
      />

      <div className="container mx-auto px-2 sm:px-4 max-w-4xl">
        <Link to="/blog" className="inline-flex items-center gap-2 text-gray-500 hover:text-[#F97316] font-medium mb-8 transition-colors">
          <ArrowLeft size={20} /> Back to all articles
        </Link>
        
        <article className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          {post.imageUrl && (
            <div className="w-full h-[300px] md:h-[450px] relative">
              <img src={post.imageUrl} alt={post.title} className="w-full h-full object-cover" />
            </div>
          )}
          
          <div className="p-6 md:p-12">
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-6 pb-6 border-b border-gray-100">
              <span className="flex items-center gap-1.5"><Calendar size={18} className="text-[#F97316]" /> {new Date(post.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
              <span className="flex items-center gap-1.5"><User size={18} className="text-[#F97316]" /> By <span className="font-bold text-gray-900">{post.author}</span></span>
            </div>
            
            <h1 className="text-3xl md:text-5xl font-extrabold text-gray-900 mb-8 leading-tight tracking-tight">
              {post.title}
            </h1>
            
            <div className="prose prose-lg max-w-none text-gray-700">
              {/* For simple text content with line breaks. For actual HTML content, we'd use dangerouslySetInnerHTML */}
              {post.content.includes('<') && post.content.includes('>') ? (
                <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.content) }} />
              ) : (
                renderContent()
              )}
            </div>
            
            {(post.tags?.length ?? 0) > 0 && (
              <div className="mt-12 pt-8 border-t border-gray-100 flex flex-wrap items-center gap-3">
                <Tag size={20} className="text-gray-400" />
                {post.tags.map((tag, i) => (
                  <span key={i} className="bg-gray-100 text-gray-700 hover:bg-[#F97316] hover:text-white transition-colors text-sm font-semibold px-4 py-1.5 rounded-full cursor-pointer">
                    {tag}
                  </span>
                ))}
              </div>
            )}
            
            {/* Share Buttons */}
            <div className="mt-12 p-6 bg-gray-50 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 border border-gray-100">
              <span className="font-bold text-gray-900 flex items-center gap-2"><Share2 size={20} className="text-[#F97316]" /> Share this article</span>
              <div className="flex items-center gap-3">
                <button className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition-colors shadow-sm"><Facebook size={18} /></button>
                <button className="w-10 h-10 rounded-full bg-sky-500 text-white flex items-center justify-center hover:bg-sky-600 transition-colors shadow-sm"><Twitter size={18} /></button>
                <button className="w-10 h-10 rounded-full bg-blue-800 text-white flex items-center justify-center hover:bg-blue-900 transition-colors shadow-sm"><Linkedin size={18} /></button>
              </div>
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}
