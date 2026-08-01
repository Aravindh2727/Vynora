import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, Search, Plus, Trash2, ShieldCheck, Download, Folder, Edit2 } from 'lucide-react';
import { useContextEngineStore } from '../store/useContextEngineStore';

export default function DigitalLocker() {
  const { user } = useContextEngineStore();
  const [documents, setDocuments] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ title: '', category: 'Identity', fileUrl: '' });

  useEffect(() => {
    fetchDocs();
  }, [user]);

  const fetchDocs = async () => {
    const userId = user?.id || '1';
    try {
      const res = await fetch(`http://localhost:5000/api/documents?user=${userId}`);
      if (res.ok) setDocuments(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editId ? `http://localhost:5000/api/documents/${editId}` : 'http://localhost:5000/api/documents';
      const method = editId ? 'PUT' : 'POST';

      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, user: user?.id || '1' })
      });
      setShowModal(false);
      setEditId(null);
      setFormData({ title: '', category: 'Identity', fileUrl: '' });
      fetchDocs();
    } catch(e) { console.error(e); }
  };

  const handleEdit = (doc: any) => {
    setFormData({
      title: doc.title || '',
      category: doc.category || 'Identity',
      fileUrl: doc.fileUrl || ''
    });
    setEditId(doc._id);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;
    try {
      await fetch(`http://localhost:5000/api/documents/${id}`, { method: 'DELETE' });
      fetchDocs();
    } catch(e) { console.error(e); }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-wider mb-1">Digital Locker</h1>
          <p className="text-textMuted flex items-center gap-2"><ShieldCheck size={16} className="text-green-400" /> AES-256 Encrypted Cloud Storage</p>
        </div>
        <button onClick={() => { setEditId(null); setShowModal(true); }} className="bg-primary text-background px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-primary/90 transition-colors shadow-neon-primary-sm font-medium">
          <Upload size={18} /> Upload Document
        </button>
      </div>

      <div className="flex gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" size={18} />
          <input type="text" placeholder="Search documents by name or tag..." className="w-full bg-surface border border-glass rounded-xl py-3 pl-10 pr-4 text-sm text-textMain outline-none focus:border-primary transition-colors" />
        </div>
        <div className="glass-panel p-2 rounded-xl flex gap-2">
          <button className="px-4 py-1.5 bg-primary/20 text-primary rounded-lg text-sm font-medium">All</button>
          <button className="px-4 py-1.5 text-textMuted hover:text-textMain rounded-lg text-sm font-medium transition-colors">Identity</button>
          <button className="px-4 py-1.5 text-textMuted hover:text-textMain rounded-lg text-sm font-medium transition-colors">Property</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {documents.map((doc: any) => (
          <motion.div key={doc._id} whileHover={{ y: -5 }} className="glass-panel p-5 relative group flex flex-col h-[200px]">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-surface border border-glass rounded-xl text-primary">
                {doc.category === 'Identity' ? <FileText size={24} /> : <Folder size={24} />}
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleEdit(doc)} className="text-gray-500 hover:text-blue-400 transition-colors opacity-0 group-hover:opacity-100">
                  <Edit2 size={16} />
                </button>
                <button onClick={() => handleDelete(doc._id)} className="text-gray-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-textMain truncate">{doc.title}</h3>
              <p className="text-xs text-textMuted mt-1">{doc.category} • Added {new Date(doc.createdAt).toLocaleDateString()}</p>
            </div>
            <div className="pt-4 border-t border-glass flex gap-2">
              <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="flex-1 py-2 bg-surface text-center text-xs font-medium rounded hover:bg-surfaceLight transition-colors">Preview</a>
              <button className="flex-1 py-2 bg-primary/20 text-primary text-center text-xs font-medium rounded hover:bg-primary/30 transition-colors flex items-center justify-center gap-1">
                <Download size={14} /> DL
              </button>
            </div>
          </motion.div>
        ))}

        {documents.length === 0 && (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-gray-500 border-2 border-dashed border-glass rounded-2xl">
            <ShieldCheck size={48} className="mb-4 opacity-50" />
            <p>Your locker is empty.</p>
            <p className="text-sm">Upload encrypted files securely.</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => { setShowModal(false); setEditId(null); }}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="glass-panel p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-xl font-bold mb-4 text-textMain">{editId ? 'Edit Document' : 'Upload Document'}</h2>
              <form onSubmit={handleAdd} className="space-y-4">
                <input required type="text" placeholder="Document Name (e.g., Aadhaar Card)" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full bg-background border border-glass rounded-lg px-4 py-3 text-sm text-textMain outline-none focus:border-primary transition-colors" />
                
                <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full bg-background border border-glass rounded-lg px-4 py-3 text-sm text-textMain outline-none focus:border-primary transition-colors">
                  <option>Identity</option>
                  <option>Vehicle RC/Insurance</option>
                  <option>Property</option>
                  <option>Education Certificates</option>
                  <option>Medical Records</option>
                </select>

                <input required type="text" placeholder="File URL (Mocking Cloudinary for now)" value={formData.fileUrl} onChange={e => setFormData({...formData, fileUrl: e.target.value})} className="w-full bg-background border border-glass rounded-lg px-4 py-3 text-sm text-textMain outline-none focus:border-primary transition-colors" />
                
                <div className="flex justify-end gap-3 mt-6">
                  <button type="button" onClick={() => { setShowModal(false); setEditId(null); }} className="px-4 py-2 text-sm text-textMuted hover:text-textMain transition-colors">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-primary text-background rounded-lg font-medium text-sm shadow-neon-primary-sm hover:bg-primary/90 transition-colors">{editId ? 'Update' : 'Secure Upload'}</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
