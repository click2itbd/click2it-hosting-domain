import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { FileText, Plus, Edit2, Trash2, Save, X, Search, Image as ImageIcon, Eye, Globe } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useConfirm } from '../../context/ConfirmContext';

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
  updatedAt: string;
}

export const EcommerceBlog: React.FC = () => {
  const { confirm } = useConfirm();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isEditing, setIsEditing] = useState(false);
  const [currentPost, setCurrentPost] = useState<Partial<BlogPost>>({
    title: '', slug: '', content: '', excerpt: '', imageUrl: '', author: 'Admin', tags: [], status: 'draft'
  });
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'ecommerce_blog'));
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as BlogPost));
      
      setPosts(data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch (error) {
      console.error('Error fetching blog posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPost.title || !currentPost.content) {
      return toast.error('Title and content are required');
    }
    
    // Auto generate slug if empty
    if (!currentPost.slug) {
      currentPost.slug = currentPost.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    }

    try {
      const id = currentPost.id || `post-${Date.now()}`;
      const timestamp = new Date().toISOString();
      const postData = {
        ...currentPost,
        createdAt: currentPost.id ? currentPost.createdAt : timestamp,
        updatedAt: timestamp
      };

      await setDoc(doc(db, 'ecommerce_blog', id), postData);
      
      toast.success(currentPost.id ? 'Post updated!' : 'Post published!');
      setIsEditing(false);
      fetchPosts();
    } catch (error) {
      console.error('Error saving post:', error);
      
      // Local fallback
      const timestamp = new Date().toISOString();
      if (currentPost.id) {
        setPosts(posts.map(p => p.id === currentPost.id ? { ...currentPost, updatedAt: timestamp } as BlogPost : p));
      } else {
        setPosts([{ ...currentPost, id: `post-${Date.now()}`, createdAt: timestamp, updatedAt: timestamp } as BlogPost, ...posts]);
      }
      toast.success('Saved locally!');
      setIsEditing(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!await confirm({ title: 'Confirmation', message: 'Are you sure you want to delete this post?', isDestructive: true })) return;
    try {
      await deleteDoc(doc(db, 'ecommerce_blog', id));
      setPosts(posts.filter(p => p.id !== id));
      toast.success('Post deleted');
    } catch (error) {
      console.error('Error deleting:', error);
      setPosts(posts.filter(p => p.id !== id));
      toast.success('Post deleted locally');
    }
  };

  const addTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      if (!currentPost.tags?.includes(tagInput.trim())) {
        setCurrentPost({ ...currentPost, tags: [...(currentPost.tags || []), tagInput.trim()] });
      }
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setCurrentPost({ ...currentPost, tags: currentPost.tags?.filter(t => t !== tagToRemove) });
  };

  const filteredPosts = posts.filter(p => p.title.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="space-y-6 animate-in fade-in duration-500 relative">
      {!isEditing ? (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Blog & Articles</h2>
              <p className="text-gray-500 text-sm mt-1">Manage your website's blog posts, announcements, and tech news.</p>
            </div>
            
            <button 
              onClick={() => {
                setCurrentPost({ title: '', slug: '', content: '', excerpt: '', imageUrl: '', author: 'Admin', tags: [], status: 'draft' });
                setIsEditing(true);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shrink-0 shadow-sm"
            >
              <Plus size={18} /> Write New Post
            </button>
          </div>

          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex gap-4 items-center">
            <div className="relative flex-1 w-full max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search posts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredPosts.map(post => (
                <div key={post.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden group hover:shadow-md transition-all">
                  <div className="h-48 bg-gray-100 relative overflow-hidden">
                    {post.imageUrl ? (
                      <img src={post.imageUrl} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300">
                        <ImageIcon size={48} />
                      </div>
                    )}
                    <div className="absolute top-3 right-3 flex gap-2">
                      <span className={`px-2.5 py-1 text-xs font-bold rounded-full shadow-sm backdrop-blur-md ${
                        post.status === 'published' ? 'bg-green-500/90 text-white' : 'bg-orange-500/90 text-white'
                      }`}>
                        {post.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  
                  <div className="p-5">
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                      <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                      <span>•</span>
                      <span>{post.author}</span>
                    </div>
                    
                    <h3 className="font-bold text-lg text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                      {post.title}
                    </h3>
                    
                    <p className="text-gray-500 text-sm line-clamp-2 mb-4">
                      {post.excerpt || post.content.replace(/<[^>]+>/g, '').substring(0, 100) + '...'}
                    </p>
                    
                    <div className="flex flex-wrap gap-1.5 mb-5">
                      {post.tags?.slice(0, 3).map((tag, i) => (
                        <span key={i} className="text-[10px] uppercase font-bold tracking-wider bg-gray-100 text-gray-600 px-2 py-1 rounded">
                          {tag}
                        </span>
                      ))}
                      {(post.tags?.length || 0) > 3 && (
                        <span className="text-[10px] font-bold bg-gray-100 text-gray-600 px-2 py-1 rounded">
                          +{(post.tags?.length || 0) - 3}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                      <button 
                        onClick={() => window.open(`/blog/${post.slug}`, '_blank')}
                        className="text-gray-400 hover:text-blue-600 flex items-center gap-1.5 text-sm font-medium transition-colors"
                        disabled={post.status === 'draft'}
                        title={post.status === 'draft' ? 'Publish to view' : 'View post'}
                      >
                        <Eye size={16} /> View
                      </button>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => { setCurrentPost(post); setIsEditing(true); }}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(post.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {filteredPosts.length === 0 && (
                <div className="col-span-full py-12 text-center text-gray-500 bg-white rounded-xl border border-dashed border-gray-300">
                  <FileText size={48} className="mx-auto text-gray-300 mb-3" />
                  <p>No posts found. Start writing your first blog post!</p>
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        /* Blog Editor */
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
            <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
              <Edit2 size={20} className="text-blue-600" />
              {currentPost.id ? 'Edit Post' : 'Write New Post'}
            </h3>
            <button onClick={() => setIsEditing(false)} className="text-gray-400 hover:text-gray-600 bg-white p-1.5 rounded-md border border-gray-200">
              <X size={20} />
            </button>
          </div>
          
          <form onSubmit={handleSave} className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              <div className="lg:col-span-2 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Post Title *</label>
                  <input 
                    type="text" 
                    required
                    value={currentPost.title}
                    onChange={e => setCurrentPost({...currentPost, title: e.target.value})}
                    className="w-full px-4 py-3 text-lg font-medium border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                    placeholder="Enter an engaging title..."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Content * (Supports Markdown / HTML)</label>
                  <textarea 
                    required
                    value={currentPost.content}
                    onChange={e => setCurrentPost({...currentPost, content: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm h-[400px]"
                    placeholder="Write your post content here..."
                  ></textarea>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Short Excerpt (Optional)</label>
                  <textarea 
                    value={currentPost.excerpt || ''}
                    onChange={e => setCurrentPost({...currentPost, excerpt: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 h-20 resize-none text-sm"
                    placeholder="A brief summary for the blog listing page..."
                  ></textarea>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
                  <h4 className="font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">Publishing Info</h4>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                      <select 
                        value={currentPost.status}
                        onChange={e => setCurrentPost({...currentPost, status: e.target.value as any})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="draft">Draft (Hidden)</option>
                        <option value="published">Published (Visible)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">URL Slug</label>
                      <input 
                        type="text" 
                        value={currentPost.slug}
                        onChange={e => setCurrentPost({...currentPost, slug: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                        placeholder="auto-generated"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Author</label>
                      <input 
                        type="text" 
                        value={currentPost.author}
                        onChange={e => setCurrentPost({...currentPost, author: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
                  <h4 className="font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">Media & Tags</h4>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Featured Image URL</label>
                      <input 
                        type="url" 
                        value={currentPost.imageUrl || ''}
                        onChange={e => setCurrentPost({...currentPost, imageUrl: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                        placeholder="https://..."
                      />
                      {currentPost.imageUrl && (
                        <div className="mt-2 rounded-lg overflow-hidden border border-gray-200 h-32 relative">
                          <img src={currentPost.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tags (Press Enter)</label>
                      <input 
                        type="text" 
                        value={tagInput}
                        onChange={e => setTagInput(e.target.value)}
                        onKeyDown={addTag}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                        placeholder="e.g. SEO, Gadgets"
                      />
                      
                      <div className="flex flex-wrap gap-2 mt-3">
                        {currentPost.tags?.map((tag, i) => (
                          <span key={i} className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-1 rounded-md">
                            {tag}
                            <button type="button" onClick={() => removeTag(tag)} className="hover:text-blue-900">
                              <X size={12} />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            <div className="mt-8 pt-5 border-t border-gray-200 flex justify-end gap-3">
              <button type="button" onClick={() => setIsEditing(false)} className="px-5 py-2.5 text-gray-700 font-medium hover:bg-gray-100 rounded-lg transition-colors border border-gray-200">
                Cancel
              </button>
              <button type="submit" className="px-6 py-2.5 bg-blue-600 text-white font-medium hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2 shadow-sm">
                <Globe size={18} /> {currentPost.status === 'published' ? 'Publish Post' : 'Save Draft'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
