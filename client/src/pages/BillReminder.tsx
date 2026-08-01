import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Receipt, CheckCircle2, Circle, AlertCircle, Edit2, Trash2 } from 'lucide-react';
import { useContextEngineStore } from '../store/useContextEngineStore';

export default function BillReminder() {
  const { user } = useContextEngineStore();
  const [bills, setBills] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', category: 'Electricity', amount: '', dueDate: '' });

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      const res = await fetch(`http://localhost:5000/api/bills?user=${user?.id || '1'}`);
      if (res.ok) setBills(await res.json());
    } catch (e) { console.error(e); }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editId ? `http://localhost:5000/api/bills/${editId}` : 'http://localhost:5000/api/bills';
      const method = editId ? 'PUT' : 'POST';

      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, user: user?.id || '1', amount: Number(formData.amount) })
      });
      setShowModal(false);
      setEditId(null);
      setFormData({ name: '', category: 'Electricity', amount: '', dueDate: '' });
      fetchData();
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`http://localhost:5000/api/bills/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (e) { console.error(e); }
  };

  const handleEdit = (bill: any) => {
    setFormData({
      name: bill.name || '',
      category: bill.category || 'Electricity',
      amount: bill.amount || '',
      dueDate: bill.dueDate ? new Date(bill.dueDate).toISOString().split('T')[0] : ''
    });
    setEditId(bill._id);
    setShowModal(true);
  };

  const togglePaid = async (id: string, currentStatus: boolean) => {
    try {
      await fetch(`http://localhost:5000/api/bills/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPaid: !currentStatus })
      });
      fetchData();
    } catch (e) { console.error(e); }
  };

  const isOverdue = (dateString: string, isPaid: boolean) => {
    if (isPaid) return false;
    return new Date(dateString) < new Date();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-wider mb-1">Bill Reminder</h1>
          <p className="text-textMuted">Never miss a payment again.</p>
        </div>
        <button onClick={() => { setEditId(null); setShowModal(true); }} className="bg-primary text-background px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-primary/90 transition-colors shadow-neon-primary-sm font-medium">
          <Plus size={18} /> Add Bill
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {bills.map((bill: any) => {
          const overdue = isOverdue(bill.dueDate, bill.isPaid);
          return (
            <motion.div key={bill._id} whileHover={{ y: -5 }} className={`glass-panel p-6 relative overflow-hidden flex flex-col justify-between border ${overdue ? 'border-red-500/50' : 'border-glass'}`}>
              <div className={`absolute top-0 right-0 w-16 h-16 bg-current opacity-5 rounded-bl-full ${bill.isPaid ? 'text-green-400' : overdue ? 'text-red-400' : 'text-primary'}`}></div>
              <div>
                <div className="flex justify-between items-start mb-4 relative z-10">
                  <div className={`p-3 bg-surface border border-glass rounded-xl ${bill.isPaid ? 'text-green-400' : overdue ? 'text-red-400' : 'text-primary'}`}>
                    <Receipt size={24} />
                  </div>
                  <div className="flex-1 flex justify-end gap-2 pr-2">
                    <button onClick={() => handleEdit(bill)} className="text-textMuted hover:text-blue-400 transition-colors" title="Edit">
                      <Edit2 size={18} />
                    </button>
                    <button onClick={() => handleDelete(bill._id)} className="text-textMuted hover:text-red-400 transition-colors" title="Delete">
                      <Trash2 size={18} />
                    </button>
                  </div>
                  <div className="text-right">
                    <h3 className="text-2xl font-bold text-textMain">₹{bill.amount.toFixed(2)}</h3>
                    {overdue && <span className="text-xs font-bold text-red-400 flex items-center gap-1 justify-end"><AlertCircle size={12}/> Overdue</span>}
                  </div>
                </div>
                <h3 className="text-lg font-bold text-textMain mb-1">{bill.name}</h3>
                <p className="text-sm text-textMuted mb-6">{bill.category} • Due {new Date(bill.dueDate).toLocaleDateString()}</p>
              </div>

              <button 
                onClick={() => togglePaid(bill._id, bill.isPaid)}
                className={`w-full py-2 rounded-xl flex items-center justify-center gap-2 font-medium transition-colors relative z-10 ${
                  bill.isPaid ? 'bg-green-400/20 text-green-400 border border-green-400/50' : 'bg-surface border border-glass text-textMuted hover:text-textMain hover:bg-surfaceLight'
                }`}
              >
                {bill.isPaid ? <><CheckCircle2 size={18} /> Paid</> : <><Circle size={18} /> Mark as Paid</>}
              </button>
            </motion.div>
          );
        })}

        {bills.length === 0 && (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-gray-500 border-2 border-dashed border-glass rounded-2xl">
            <Receipt size={48} className="mb-4 opacity-50" />
            <p>No upcoming bills.</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => { setShowModal(false); setEditId(null); }}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="glass-panel p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-xl font-bold mb-4 text-textMain">{editId ? 'Edit Bill' : 'Add Bill'}</h2>
              <form onSubmit={handleAdd} className="space-y-4">
                <input required type="text" placeholder="Bill Name (e.g., Internet)" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-background border border-glass rounded-lg px-4 py-3 text-sm text-textMain outline-none focus:border-primary transition-colors" />
                <input required type="number" step="0.01" placeholder="Amount (₹)" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} className="w-full bg-background border border-glass rounded-lg px-4 py-3 text-sm text-textMain outline-none focus:border-primary transition-colors" />
                
                <div className="grid grid-cols-2 gap-4">
                  <input required type="date" value={formData.dueDate} onChange={e => setFormData({...formData, dueDate: e.target.value})} className="w-full bg-background border border-glass rounded-lg px-4 py-3 text-sm text-textMain outline-none focus:border-primary transition-colors" />
                  <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full bg-background border border-glass rounded-lg px-4 py-3 text-sm text-textMain outline-none focus:border-primary transition-colors">
                    <option>Electricity</option>
                    <option>Water</option>
                    <option>Internet</option>
                    <option>Mobile</option>
                    <option>Credit Card</option>
                    <option>Rent</option>
                  </select>
                </div>
                
                <div className="flex justify-end gap-3 mt-6">
                  <button type="button" onClick={() => { setShowModal(false); setEditId(null); }} className="px-4 py-2 text-sm text-textMuted hover:text-textMain transition-colors">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-primary text-background rounded-lg font-medium text-sm shadow-neon-primary-sm hover:bg-primary/90 transition-colors">{editId ? 'Update' : 'Save'}</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
