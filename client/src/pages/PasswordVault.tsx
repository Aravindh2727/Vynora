import { API_BASE_URL } from '../config';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, KeyRound, Copy, Eye, EyeOff, ShieldAlert, Edit2, Trash2 } from 'lucide-react';
import { useContextEngineStore } from '../store/useContextEngineStore';

export default function PasswordVault() {
  const { user } = useContextEngineStore();
  const [passwords, setPasswords] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [formData, setFormData] = useState({ platform: '', username: '', password: '' });

  useEffect(() => { fetchData(); }, [user]);

  const fetchData = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/passwords?user=${user?.id || '1'}`);
      if (res.ok) setPasswords(await res.json());
    } catch (e) { console.error(e); }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editId ? `${API_BASE_URL}/api/passwords/${editId}` : API_BASE_URL + '/api/passwords';
      const method = editId ? 'PUT' : 'POST';

      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, user: user?.id || '1' })
      });
      setShowModal(false);
      setEditId(null);
      setFormData({ platform: '', username: '', password: '' });
      fetchData();
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`${API_BASE_URL}/api/passwords/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (e) { console.error(e); }
  };

  const handleEdit = (p: any) => {
    setFormData({
      platform: p.platform || '',
      username: p.username || '',
      password: p.password || ''
    });
    setEditId(p._id);
    setShowModal(true);
  };

  const toggleReveal = (id: string) => setRevealed(prev => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-wider mb-1">Password Vault</h1>
          <p className="text-textMuted flex items-center gap-2"><ShieldAlert size={16} className="text-red-400"/> Encrypted Credential Storage</p>
        </div>
        <button onClick={() => { setEditId(null); setShowModal(true); }} className="bg-primary text-background px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-primary/90 font-medium">
          <Plus size={18} /> New Credential
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {passwords.map((p: any) => (
          <motion.div key={p._id} whileHover={{ y: -5 }} className="glass-panel p-6 flex flex-col justify-between border-l-4 border-l-red-500">
            <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-surface border border-glass rounded-xl text-red-400"><KeyRound size={24} /></div>
                <div className="flex gap-2">
                    <button onClick={() => handleEdit(p)} className="text-textMuted hover:text-blue-400 transition-colors p-1" title="Edit"><Edit2 size={16} /></button>
                    <button onClick={() => handleDelete(p._id)} className="text-textMuted hover:text-red-400 transition-colors p-1" title="Delete"><Trash2 size={16} /></button>
                </div>
            </div>
            <div>
                <h3 className="text-xl font-bold text-textMain mb-2">{p.platform}</h3>
                <div className="bg-surface/50 p-3 rounded-lg border border-glass mb-2">
                    <p className="text-xs text-gray-500 mb-1">Username</p>
                    <p className="text-sm text-textMuted font-mono">{p.username}</p>
                </div>
                <div className="bg-surface/50 p-3 rounded-lg border border-glass flex justify-between items-center">
                    <div>
                        <p className="text-xs text-gray-500 mb-1">Password</p>
                        <p className="text-sm text-textMuted font-mono tracking-widest">{revealed[p._id] ? p.password : '••••••••'}</p>
                    </div>
                    <button onClick={() => toggleReveal(p._id)} className="text-textMuted hover:text-textMain transition-colors">
                        {revealed[p._id] ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                </div>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => { setShowModal(false); setEditId(null); }}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-panel p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-xl font-bold mb-4 text-textMain">{editId ? 'Edit Credential' : 'Store Credential'}</h2>
              <form onSubmit={handleAdd} className="space-y-4">
                <input required type="text" placeholder="Platform (e.g. Netflix, Bank)" value={formData.platform} onChange={e => setFormData({...formData, platform: e.target.value})} className="w-full bg-background border border-glass rounded-lg px-4 py-3 text-textMain" />
                <input required type="text" placeholder="Username / Email" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className="w-full bg-background border border-glass rounded-lg px-4 py-3 text-textMain" />
                <input required type="password" placeholder="Password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full bg-background border border-glass rounded-lg px-4 py-3 text-textMain" />
                
                <div className="flex justify-end gap-3 mt-6">
                  <button type="button" onClick={() => { setShowModal(false); setEditId(null); }} className="px-4 py-2 text-textMuted">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-red-500 text-textMain rounded-lg font-medium shadow-neon-primary-sm hover:bg-red-400">{editId ? 'Update & Encrypt' : 'Encrypt & Save'}</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
