import { API_BASE_URL } from '../config';
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, MessageSquare, Megaphone, Trash2, Edit2 } from 'lucide-react';
import { useContextEngineStore } from '../store/useContextEngineStore';

export default function FamilyDashboard() {
  const { user } = useContextEngineStore();
  const [posts, setPosts] = useState([]);
  const [members, setMembers] = useState([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ message: '', type: 'Announcement', author: 'Head of House' });
  
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [memberData, setMemberData] = useState({ name: '', email: '', relation: 'Spouse' });

  useEffect(() => { fetchData(); }, [user]);

  const fetchData = async () => {
    try {
      const [postRes, memberRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/family?user=${user?.id || '1'}`),
        fetch(`${API_BASE_URL}/api/family-members?user=${user?.id || '1'}`)
      ]);
      if (postRes.ok) setPosts(await postRes.json());
      if (memberRes.ok) setMembers(await memberRes.json());
    } catch (e) { console.error(e); }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberData.name.trim()) return;
    try {
      await fetch(`${API_BASE_URL}/api/family-members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...memberData, user: user?.id || '1' })
      });
      setMemberData({ name: '', email: '', relation: 'Spouse' });
      setShowMemberModal(false);
      fetchData();
    } catch (e) { console.error(e); }
  };

  const handleDeleteMember = async (id: string) => {
    try {
      await fetch(`${API_BASE_URL}/api/family-members/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (e) { console.error(e); }
  };

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.message.trim()) return;
    try {
      const url = editId ? `${API_BASE_URL}/api/family/${editId}` : API_BASE_URL + '/api/family';
      const method = editId ? 'PUT' : 'POST';

      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, user: user?.id || '1' })
      });
      setFormData({ ...formData, message: '' });
      setEditId(null);
      fetchData();
    } catch (e) { console.error(e); }
  };

  const handleEdit = (post: any) => {
    setFormData({
      message: post.message || '',
      type: post.type || 'Announcement',
      author: post.author || 'Head of House'
    });
    setEditId(post._id);
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`${API_BASE_URL}/api/family/${id}`, { method: 'DELETE' });
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
        <div className="flex items-center gap-3">
          <button onClick={() => setShowMemberModal(true)} className="px-4 py-2 bg-primary text-background rounded-lg font-medium text-sm shadow-neon-primary-sm hover:bg-primary/90 transition-colors">Add Family Member</button>
          <div className="p-3 bg-surface border border-glass rounded-xl text-primary"><Users size={24} /></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Family Roster */}
        <div className="lg:col-span-3 space-y-4">
          <div className="glass-panel p-6">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Users size={18}/> Family Roster</h2>
            <div className="space-y-3 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
              {members.map((member: any) => (
                <div key={member._id} className="flex items-center justify-between p-3 bg-surface border border-glass rounded-xl hover:bg-surfaceLight transition-colors group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white border" style={{ backgroundColor: member.avatarColor + '40', borderColor: member.avatarColor + '80', color: member.avatarColor }}>
                      {member.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm">{member.name}</h3>
                      <p className="text-xs text-textMuted">{member.relation}</p>
                    </div>
                  </div>
                  <button onClick={() => handleDeleteMember(member._id)} className="text-textMuted hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16} /></button>
                </div>
              ))}
              {members.length === 0 && (
                <p className="text-sm text-textMuted text-center py-4">No family members added yet.</p>
              )}
            </div>
          </div>
        </div>

        {/* Post Form */}
        <div className="lg:col-span-4">
            <div className="glass-panel p-6">
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Megaphone size={18}/> Broadcast Message</h2>
                <form onSubmit={handlePost} className="space-y-4">
                    <textarea required placeholder="What's on your mind?" value={formData.message} onChange={e => setFormData({...formData, message: e.target.value})} className="w-full bg-background border border-glass rounded-lg px-4 py-3 text-sm text-textMain resize-none h-32 focus:border-primary outline-none" />
                    <div className="grid grid-cols-2 gap-3">
                      <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full bg-background border border-glass rounded-lg px-4 py-3 text-sm text-textMain outline-none">
                          <option>Announcement</option><option>Chore</option><option>Event</option>
                      </select>
                      <select value={formData.author} onChange={e => setFormData({...formData, author: e.target.value})} className="w-full bg-background border border-glass rounded-lg px-4 py-3 text-sm text-textMain outline-none">
                          <option value="Head of House">Head of House</option>
                          {members.map((m: any) => <option key={m._id} value={m.name}>{m.name}</option>)}
                      </select>
                    </div>
                    <button type="submit" className="w-full py-2 bg-primary text-background rounded-lg font-medium shadow-neon-primary-sm hover:bg-primary/90 transition-colors flex items-center justify-center gap-2">
                        <MessageSquare size={16} /> {editId ? 'Update Post' : 'Post to Family Board'}
                    </button>
                </form>
            </div>
        </div>

        {/* Feed */}
        <div className="lg:col-span-5 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar pr-2">
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

      {/* Add Member Modal */}
      {showMemberModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowMemberModal(false)}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-panel p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4 text-textMain">Add Family Member</h2>
            <form onSubmit={handleAddMember} className="space-y-4">
              <input required type="text" placeholder="Name" value={memberData.name} onChange={e => setMemberData({...memberData, name: e.target.value})} className="w-full bg-background border border-glass rounded-lg px-4 py-3 text-sm text-textMain outline-none focus:border-primary transition-colors" />
              <input type="email" placeholder="Email Address (Optional)" value={memberData.email} onChange={e => setMemberData({...memberData, email: e.target.value})} className="w-full bg-background border border-glass rounded-lg px-4 py-3 text-sm text-textMain outline-none focus:border-primary transition-colors" />
              <select value={memberData.relation} onChange={e => setMemberData({...memberData, relation: e.target.value})} className="w-full bg-background border border-glass rounded-lg px-4 py-3 text-sm text-textMain outline-none focus:border-primary transition-colors">
                <option>Spouse</option><option>Child</option><option>Parent</option><option>Sibling</option><option>Other</option>
              </select>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowMemberModal(false)} className="px-4 py-2 text-sm text-textMuted hover:text-textMain">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-primary text-background rounded-lg font-medium text-sm shadow-neon-primary-sm">Add Member</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
