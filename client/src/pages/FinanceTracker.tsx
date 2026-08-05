import { API_BASE_URL } from '../config';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, ArrowUpRight, ArrowDownRight, IndianRupee, Filter, Download, Edit2, Trash2 } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useContextEngineStore } from '../store/useContextEngineStore';

export default function FinanceTracker() {
  const { user } = useContextEngineStore();
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({ totalIncome: 0, totalExpense: 0, balance: 0, categoryBreakdown: {} });
  
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ title: '', amount: '', type: 'expense', category: 'Food' });

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    // We default to '1' as mock user ID since Firebase isn't fully integrated on frontend yet
    const userId = user?.id || '1'; 
    try {
      const [txRes, sumRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/finance?user=${userId}`),
        fetch(`${API_BASE_URL}/api/finance/summary?user=${userId}`)
      ]);
      if (txRes.ok) setTransactions(await txRes.json());
      if (sumRes.ok) setSummary(await sumRes.json());
    } catch (e) {
      console.error(e);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editId ? `${API_BASE_URL}/api/finance/${editId}` : API_BASE_URL + '/api/finance';
      const method = editId ? 'PUT' : 'POST';

      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, user: user?.id || '1', amount: Number(formData.amount) })
      });
      setShowModal(false);
      setEditId(null);
      setFormData({ title: '', amount: '', type: 'expense', category: 'Food' });
      fetchData();
    } catch(e) { console.error(e); }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`${API_BASE_URL}/api/finance/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (e) { console.error(e); }
  };

  const handleEdit = (tx: any) => {
    setFormData({
      title: tx.title || '',
      amount: tx.amount || '',
      type: tx.type || 'expense',
      category: tx.category || 'Food'
    });
    setEditId(tx._id);
    setShowModal(true);
  };

  const COLORS = ['#00f2fe', '#4facfe', '#667eea', '#764ba2', '#ff0844'];
  const pieData = Object.entries(summary.categoryBreakdown || {}).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-wider mb-1">Finance Tracker</h1>
          <p className="text-textMuted">Manage your income, expenses, and budget.</p>
        </div>
        <button onClick={() => { setEditId(null); setShowModal(true); }} className="bg-primary text-background px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-primary/90 transition-colors shadow-neon-primary-sm font-medium">
          <Plus size={18} /> Add Transaction
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-panel p-6">
          <div className="flex items-center gap-3 mb-2"><IndianRupee className="text-primary" /> <h3 className="text-textMuted font-medium">Current Balance</h3></div>
          <div className="text-3xl font-bold text-textMain">₹{summary.balance.toFixed(2)}</div>
        </div>
        <div className="glass-panel p-6">
          <div className="flex items-center gap-3 mb-2"><ArrowUpRight className="text-green-400" /> <h3 className="text-textMuted font-medium">Total Income</h3></div>
          <div className="text-3xl font-bold text-textMain">₹{summary.totalIncome.toFixed(2)}</div>
        </div>
        <div className="glass-panel p-6">
          <div className="flex items-center gap-3 mb-2"><ArrowDownRight className="text-red-400" /> <h3 className="text-textMuted font-medium">Total Expense</h3></div>
          <div className="text-3xl font-bold text-textMain">₹{summary.totalExpense.toFixed(2)}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-panel p-6 h-[350px] flex flex-col">
          <h2 className="text-lg font-bold mb-4">Expense by Category</h2>
          <div className="flex-1">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                    {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#1a1a2e', borderColor: '#333' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">No data available</div>
            )}
          </div>
        </div>
        
        <div className="glass-panel p-6 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold">Recent Transactions</h2>
            <div className="flex gap-2">
              <button className="p-2 bg-surface border border-glass rounded-lg hover:text-primary transition-colors"><Filter size={16} /></button>
              <button className="p-2 bg-surface border border-glass rounded-lg hover:text-primary transition-colors"><Download size={16} /></button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3">
            {transactions.length === 0 ? <p className="text-gray-500 text-center py-4">No transactions found.</p> : null}
            {transactions.map((tx: any) => (
              <div key={tx._id} className="flex justify-between items-center p-3 bg-surface border border-glass rounded-xl hover:bg-surfaceLight transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${tx.type === 'income' ? 'bg-green-400/20 text-green-400' : 'bg-red-400/20 text-red-400'}`}>
                    {tx.type === 'income' ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{tx.title}</p>
                    <p className="text-xs text-textMuted">{tx.category} • {new Date(tx.date).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className={`font-bold text-sm flex items-center gap-3 ${tx.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                  {tx.type === 'income' ? '+' : '-'}₹{tx.amount.toFixed(2)}
                  <div className="flex gap-1 ml-2 border-l border-glass pl-2">
                    <button onClick={() => handleEdit(tx)} className="text-textMuted hover:text-blue-400 transition-colors p-1"><Edit2 size={14}/></button>
                    <button onClick={() => handleDelete(tx._id)} className="text-textMuted hover:text-red-400 transition-colors p-1"><Trash2 size={14}/></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Add Transaction Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="glass-panel p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-xl font-bold mb-4 text-textMain">{editId ? 'Edit Transaction' : 'Add Transaction'}</h2>
              <form onSubmit={handleAdd} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <button type="button" onClick={() => setFormData({...formData, type: 'expense'})} className={`py-2 rounded-lg border text-sm font-medium transition-colors ${formData.type === 'expense' ? 'bg-red-400/20 border-red-400 text-red-400' : 'border-glass text-textMuted hover:bg-surface'}`}>Expense</button>
                  <button type="button" onClick={() => setFormData({...formData, type: 'income'})} className={`py-2 rounded-lg border text-sm font-medium transition-colors ${formData.type === 'income' ? 'bg-green-400/20 border-green-400 text-green-400' : 'border-glass text-textMuted hover:bg-surface'}`}>Income</button>
                </div>
                
                <input required type="text" placeholder="Title (e.g., Grocery Shopping)" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full bg-background border border-glass rounded-lg px-4 py-3 text-sm text-textMain outline-none focus:border-primary transition-colors" />
                <input required type="number" step="0.01" placeholder="Amount (₹)" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} className="w-full bg-background border border-glass rounded-lg px-4 py-3 text-sm text-textMain outline-none focus:border-primary transition-colors" />
                
                <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full bg-background border border-glass rounded-lg px-4 py-3 text-sm text-textMain outline-none focus:border-primary transition-colors">
                  {formData.type === 'expense' ? (
                    <>
                      <option>Food & Dining</option><option>Transport</option><option>Shopping</option><option>Bills & Utilities</option><option>Entertainment</option><option>Other</option>
                    </>
                  ) : (
                    <>
                      <option>Salary</option><option>Freelance</option><option>Investments</option><option>Business</option><option>Other</option>
                    </>
                  )}
                </select>
                
                <div className="flex justify-end gap-3 mt-6">
                  <button type="button" onClick={() => { setShowModal(false); setEditId(null); }} className="px-4 py-2 text-sm text-textMuted hover:text-textMain transition-colors">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-primary text-background rounded-lg font-medium text-sm shadow-neon-primary-sm hover:bg-primary/90 transition-colors">{editId ? 'Update Transaction' : 'Save Transaction'}</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
