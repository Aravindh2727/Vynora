import { API_BASE_URL } from '../config';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Phone, AlertTriangle, HeartPulse, Edit2, Trash2 } from 'lucide-react';
import { useContextEngineStore } from '../store/useContextEngineStore';

export default function EmergencyContacts() {
  const { user } = useContextEngineStore();
  const [contacts, setContacts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', relation: '', phone: '', isEmergency: false });

  useEffect(() => { fetchData(); }, [user]);

  const fetchData = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/contacts?user=${user?.id || '1'}`);
      if (res.ok) setContacts(await res.json());
    } catch (e) { console.error(e); }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editId ? `${API_BASE_URL}/api/contacts/${editId}` : API_BASE_URL + '/api/contacts';
      const method = editId ? 'PUT' : 'POST';

      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, user: user?.id || '1' })
      });
      setShowModal(false);
      setEditId(null);
      setFormData({ name: '', relation: '', phone: '', isEmergency: false });
      fetchData();
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`${API_BASE_URL}/api/contacts/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (e) { console.error(e); }
  };

  const handleEdit = (contact: any) => {
    setFormData({
      name: contact.name || '',
      relation: contact.relation || '',
      phone: contact.phone || '',
      isEmergency: contact.isEmergency || false
    });
    setEditId(contact._id);
    setShowModal(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-wider mb-1">Emergency Center</h1>
          <p className="text-textMuted flex items-center gap-2"><HeartPulse size={16} className="text-red-400"/> Critical Contacts & Health Data</p>
        </div>
        <button onClick={() => { setEditId(null); setShowModal(true); }} className="bg-red-500 text-textMain px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-red-400 font-medium shadow-[0_0_15px_rgba(239,68,68,0.5)]">
          <Plus size={18} /> Add Contact
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {contacts.map((c: any) => (
          <motion.div key={c._id} whileHover={{ y: -5 }} className={`glass-panel p-6 flex flex-col justify-between border-t-4 ${c.isEmergency ? 'border-t-red-500 bg-red-900/10' : 'border-t-blue-500'}`}>
            <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl ${c.isEmergency ? 'bg-red-500/20 text-red-500' : 'bg-surface border border-glass text-blue-400'}`}>
                  {c.isEmergency ? <AlertTriangle size={24} /> : <Phone size={24} />}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(c)} className="text-textMuted hover:text-blue-400 transition-colors" title="Edit">
                    <Edit2 size={18} />
                  </button>
                  <button onClick={() => handleDelete(c._id)} className="text-textMuted hover:text-red-400 transition-colors" title="Delete">
                    <Trash2 size={18} />
                  </button>
                </div>
            </div>
            <div>
                <h3 className="text-xl font-bold text-textMain mb-1">{c.name}</h3>
                <p className="text-sm text-textMuted mb-4">{c.relation}</p>
                <div className="bg-background/50 p-3 rounded-lg border border-glass">
                    <p className="text-xl font-mono text-textMain tracking-wider">{c.phone}</p>
                </div>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => { setShowModal(false); setEditId(null); }}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-panel p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-xl font-bold mb-4 text-textMain">{editId ? 'Edit Emergency Contact' : 'Add Emergency Contact'}</h2>
              <form onSubmit={handleAdd} className="space-y-4">
                <input required type="text" placeholder="Full Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-background border border-glass rounded-lg px-4 py-3 text-textMain" />
                <input required type="text" placeholder="Relation (e.g. Brother, Family Doctor)" value={formData.relation} onChange={e => setFormData({...formData, relation: e.target.value})} className="w-full bg-background border border-glass rounded-lg px-4 py-3 text-textMain" />
                <input required type="tel" placeholder="Phone Number" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full bg-background border border-glass rounded-lg px-4 py-3 text-textMain" />
                
                <label className="flex items-center gap-3 text-textMain cursor-pointer bg-surface p-3 rounded-lg border border-glass">
                  <input type="checkbox" checked={formData.isEmergency} onChange={e => setFormData({...formData, isEmergency: e.target.checked})} className="w-5 h-5 accent-red-500" />
                  <span className="text-sm font-medium">Mark as CRITICAL / Red Alert</span>
                </label>

                <div className="flex justify-end gap-3 mt-6">
                  <button type="button" onClick={() => { setShowModal(false); setEditId(null); }} className="px-4 py-2 text-textMuted">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-red-500 text-textMain rounded-lg font-medium hover:bg-red-400 shadow-neon-primary-sm">{editId ? 'Update' : 'Save Contact'}</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
