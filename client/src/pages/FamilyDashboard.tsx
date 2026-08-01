import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, MessageSquare, Megaphone, Trash2, Edit2 } from 'lucide-react';
import { useContextEngineStore } from '../store/useContextEngineStore';

export default function FamilyDashboard() {
  const { user } = useContextEngineStore();
  const [posts, setPosts] = useState([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ message: '', type: 'Announcement' });

  useEffect(() => { fetchData(); }, [user]);

  const fetchData = async () => {
    try {
      const res = await fetch(`http://localhost:5000/api/family?user=${user?.id || '1'}`);
      if (res.ok) setPosts(await res.json());
    } catch (e) { console.error(e); }
  };

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.message.trim()) return;
    try {
      const url = editId ? `http://localhost:5000/api/family/${editId}` : 'http://localhost:5000/api/family';
      const method = editId ? 'PUT' : 'POST';

      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, user: user?.id || '1', author: user?.name || 'Head of House' })
      });
      setFormData({ ...formData, message: '' });
      setEditId(null);
      fetchData();
    } catch (e) { console.error(e); }
  };

  const handleEdit = (post: any) => {
    setFormData({
      message: post.message || '',
      type: post.type || 'Announcement'
    });
    setEditId(post._id);
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`http://localhost:5000/api/family/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (e) { console.error(e); }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-wider mb-1">Family Dashboard</h1>
          <p className="text-textMuted">Shared announcements, chores, and events.</p>
        </div>
        <div className="p-3 bg-surface border border-glass rounded-xl text-primary"><Users size={24} /></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Post Form */}
        <div className="lg:col-span-1">
            <div className="glass-panel p-6">
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Megaphone size={18}/> Broadcast Message</h2>
                <form onSubmit={handlePost} className="space-y-4">
                    <textarea required placeholder="What's on your mind?" value={formData.message} onChange={e => setFormData({...formData, message: e.target.value})} className="w-full bg-background border border-glass rounded-lg px-4 py-3 text-sm text-textMain resize-none h-32 focus:border-primary outline-none" />
                    <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full bg-background border border-glass rounded-lg px-4 py-3 text-sm text-textMain outline-none">
                        <option>Announcement</option><option>Chore</option><option>Event</option>
                    </select>
                    <button type="submit" className="w-full py-2 bg-primary text-background rounded-lg font-medium shadow-neon-primary-sm hover:bg-primary/90 transition-colors flex items-center justify-center gap-2">
                        <MessageSquare size={16} /> {editId ? 'Update Post' : 'Post to Family Board'}
                    </button>
                </form>
            </div>
        </div>

        {/* Feed */}
        <div className="lg:col-span-2 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar pr-2">
            {posts.map((post: any) => (
                <motion.div key={post._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-5 relative group">
                    <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleEdit(post)} className="text-gray-500 hover:text-blue-400"><Edit2 size={16}/></button>
                        <button onClick={() => handleDelete(post._id)} className="text-gray-500 hover:text-red-400"><Trash2 size={16}/></button>
                    </div>
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary border border-primary/30">
                            {post.author.charAt(0)}
                        </div>
                        <div>
                            <h3 className="font-bold text-textMain text-sm">{post.author}</h3>
                            <p className="text-xs text-textMuted">{new Date(post.createdAt).toLocaleString()} • <span className="text-primary">{post.type}</span></p>
                        </div>
                    </div>
                    <p className="text-textMuted text-sm leading-relaxed bg-surface/30 p-4 rounded-xl border border-glass">
                        {post.message}
                    </p>
                </motion.div>
            ))}
            
            {posts.length === 0 && (
                <div className="py-20 flex flex-col items-center justify-center text-gray-500 border-2 border-dashed border-glass rounded-2xl">
                    <MessageSquare size={48} className="mb-4 opacity-50" />
                    <p>Board is quiet. Post something!</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
}
