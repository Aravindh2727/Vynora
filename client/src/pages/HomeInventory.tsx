import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Package, Calendar, Edit2, Trash2 } from 'lucide-react';
import { useContextEngineStore } from '../store/useContextEngineStore';

export default function HomeInventory() {
  const { user } = useContextEngineStore();
  const [items, setItems] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ itemName: '', category: 'Electronics', price: '', purchaseDate: '', warrantyExpiry: '' });

  useEffect(() => { fetchData(); }, [user]);

  const fetchData = async () => {
    try {
      const res = await fetch(`http://localhost:5000/api/inventory?user=${user?.id || '1'}`);
      if (res.ok) setItems(await res.json());
    } catch (e) { console.error(e); }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editId ? `http://localhost:5000/api/inventory/${editId}` : 'http://localhost:5000/api/inventory';
      const method = editId ? 'PUT' : 'POST';

      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, user: user?.id || '1', price: Number(formData.price) })
      });
      setShowModal(false);
      setEditId(null);
      setFormData({ itemName: '', category: 'Electronics', price: '', purchaseDate: '', warrantyExpiry: '' });
      fetchData();
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`http://localhost:5000/api/inventory/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (e) { console.error(e); }
  };

  const handleEdit = (item: any) => {
    setFormData({
      itemName: item.itemName || '',
      category: item.category || 'Electronics',
      price: item.price || '',
      purchaseDate: item.purchaseDate ? new Date(item.purchaseDate).toISOString().split('T')[0] : '',
      warrantyExpiry: item.warrantyExpiry ? new Date(item.warrantyExpiry).toISOString().split('T')[0] : ''
    });
    setEditId(item._id);
    setShowModal(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-wider mb-1">Home Inventory</h1>
          <p className="text-textMuted">Track high-value assets and warranties.</p>
        </div>
        <button onClick={() => { setEditId(null); setShowModal(true); }} className="bg-primary text-background px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-primary/90 font-medium">
          <Plus size={18} /> Add Item
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {items.map((item: any) => (
          <motion.div key={item._id} whileHover={{ y: -5 }} className="glass-panel p-5 relative group flex flex-col h-[200px] border-t-2 border-primary">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-surface border border-glass rounded-xl text-primary"><Package size={24} /></div>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => handleEdit(item)} className="text-gray-500 hover:text-blue-400"><Edit2 size={16}/></button>
                <button onClick={() => handleDelete(item._id)} className="text-gray-500 hover:text-red-400"><Trash2 size={16}/></button>
              </div>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-textMain truncate">{item.itemName}</h3>
              <p className="text-xs text-textMuted mt-1">{item.category} • ₹{item.price}</p>
            </div>
            <div className="pt-4 border-t border-glass flex flex-col gap-1 text-xs text-textMuted">
              <div className="flex justify-between"><span>Purchased:</span> <span className="text-textMain">{new Date(item.purchaseDate).toLocaleDateString()}</span></div>
              <div className="flex justify-between"><span>Warranty:</span> <span className="text-red-400">{new Date(item.warrantyExpiry).toLocaleDateString()}</span></div>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => { setShowModal(false); setEditId(null); }}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-panel p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-xl font-bold mb-4 text-textMain">{editId ? 'Edit Asset' : 'Add Asset'}</h2>
              <form onSubmit={handleAdd} className="space-y-4">
                <input required type="text" placeholder="Item Name (e.g. MacBook Pro)" value={formData.itemName} onChange={e => setFormData({...formData, itemName: e.target.value})} className="w-full bg-background border border-glass rounded-lg px-4 py-3 text-textMain" />
                <input required type="number" placeholder="Price (₹)" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="w-full bg-background border border-glass rounded-lg px-4 py-3 text-textMain" />
                
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs text-textMuted mb-1 block">Purchase Date</label>
                        <input required type="date" value={formData.purchaseDate} onChange={e => setFormData({...formData, purchaseDate: e.target.value})} className="w-full bg-background border border-glass rounded-lg px-4 py-2 text-textMain" />
                    </div>
                    <div>
                        <label className="text-xs text-textMuted mb-1 block">Warranty Expiry</label>
                        <input required type="date" value={formData.warrantyExpiry} onChange={e => setFormData({...formData, warrantyExpiry: e.target.value})} className="w-full bg-background border border-glass rounded-lg px-4 py-2 text-textMain" />
                    </div>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button type="button" onClick={() => { setShowModal(false); setEditId(null); }} className="px-4 py-2 text-textMuted">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-primary text-background rounded-lg font-medium">{editId ? 'Update' : 'Save'}</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
