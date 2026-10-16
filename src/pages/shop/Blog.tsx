import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { Link } from 'react-router-dom';
import { Calendar, User, ArrowRight, BookOpen } from 'lucide-react';
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

export default function Blog() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const q = query(collection(db, 'ecommerce_blog'), where('status', '==', 'published'));
        const snap = await getDocs(q);
        const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as BlogPost));
        
        // Sort by date descending (since it's ISO string)
        data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setPosts(data);
      } catch (error) {
        console.error('Error fetching blogs:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
  }, []);

  return (
    <div className="bg-gray-50 min-h-screen py-12">
      <SEO
        title="Tech News, Guides & Insights Blog | CLICK2IT"
        description="Read the latest tech news, PC building tips, hardware reviews, and buying guides from the experts at CLICK2IT."
        keywords="tech blog bd, pc hardware reviews, computer news bangladesh, pc building tips"
        canonical="https://click2itbd.com/blog"
      />

      <div className="container mx-auto px-2 sm:px-4 max-w-7xl">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Our Blog</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Stay updated with the latest tech news, guides, and announcements from our team.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="w-12 h-12 border-4 border-[#F97316] border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center bg-white p-16 rounded-2xl shadow-sm border border-gray-100">
            <BookOpen size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">No posts yet</h3>
            <p className="text-gray-500">Check back later for exciting new content!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {posts.map(post => (
              <article key={post.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 group flex flex-col">
                <Link to={`/blog/${post.slug}`} className="block relative h-60 overflow-hidden bg-gray-100">
                  {post.imageUrl ? (
                    <img 
                      src={post.imageUrl} 
                      alt={post.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                      <BookOpen size={48} />
                    </div>
                  )}
                  <div className="absolute top-4 left-4 flex gap-2">
                    {post.tags?.slice(0, 2).map((tag, i) => (
                      <span key={i} className="bg-black/60 backdrop-blur-md text-white text-xs font-bold px-3 py-1 rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                </Link>
                
                <div className="p-6 flex flex-col flex-1">
                  <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                    <span className="flex items-center gap-1.5"><Calendar size={16} className="text-[#F97316]" /> {new Date(post.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    <span className="flex items-center gap-1.5"><User size={16} className="text-[#F97316]" /> {post.author}</span>
                  </div>
                  
                  <Link to={`/blog/${post.slug}`} className="block mb-3">
                    <h2 className="text-xl font-bold text-gray-900 group-hover:text-[#F97316] transition-colors line-clamp-2">
                      {post.title}
                    </h2>
                  </Link>
                  
                  <p className="text-gray-600 mb-6 line-clamp-3 text-sm leading-relaxed flex-1">
                    {post.excerpt || post.content.replace(/<[^>]+>/g, '').substring(0, 150) + '...'}
                  </p>
                  
                  <Link to={`/blog/${post.slug}`} className="inline-flex items-center gap-2 text-[#F97316] font-bold text-sm hover:gap-3 transition-all">
                    Read More <ArrowRight size={16} />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
