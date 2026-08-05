import { API_BASE_URL } from '../config';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Target, Award, Edit2, Trash2 } from 'lucide-react';
import { useContextEngineStore } from '../store/useContextEngineStore';

export default function GoalTracker() {
  const { user } = useContextEngineStore();
  const [goals, setGoals] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ title: '', category: 'Personal', targetDate: '' });

  useEffect(() => { fetchData(); }, [user]);

  const fetchData = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/goals?user=${user?.id || '1'}`);
      if (res.ok) setGoals(await res.json());
    } catch (e) { console.error(e); }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editId ? `${API_BASE_URL}/api/goals/${editId}` : API_BASE_URL + '/api/goals';
      const method = editId ? 'PUT' : 'POST';

      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, user: user?.id || '1' })
      });
      setShowModal(false);
      setEditId(null);
      setFormData({ title: '', category: 'Personal', targetDate: '' });
      fetchData();
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`${API_BASE_URL}/api/goals/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (e) { console.error(e); }
  };

  const handleEdit = (goal: any) => {
    setFormData({
      title: goal.title || '',
      category: goal.category || 'Personal',
      targetDate: goal.targetDate ? new Date(goal.targetDate).toISOString().split('T')[0] : ''
    });
    setEditId(goal._id);
    setShowModal(true);
  };

  const updateProgress = async (id: string, current: number) => {
    const newProgress = current >= 100 ? 0 : current + 25;
    try {
      await fetch(`${API_BASE_URL}/api/goals/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ progress: newProgress, isCompleted: newProgress >= 100 })
      });
      fetchData();
    } catch (e) { console.error(e); }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-wider mb-1">Goal Tracker</h1>
          <p className="text-textMuted">Set milestones and track progress.</p>
        </div>
        <button onClick={() => { setEditId(null); setShowModal(true); }} className="bg-primary text-background px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-primary/90 font-medium">
          <Plus size={18} /> Add Goal
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {goals.map((g: any) => (
          <motion.div key={g._id} whileHover={{ y: -5 }} className="glass-panel p-6">
            <div className="flex justify-between items-start mb-6">
                <div className="flex-1 pr-4">
                    <h3 className="text-xl font-bold text-textMain mb-1 flex items-center gap-2">{g.isCompleted && <Award className="text-yellow-400" size={20} />} {g.title}</h3>
                    <p className="text-sm text-textMuted">{g.category} • Target: {new Date(g.targetDate).toLocaleDateString()}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                    <div className="flex gap-2">
                        <button onClick={() => handleEdit(g)} className="text-textMuted hover:text-blue-400 transition-colors p-1"><Edit2 size={16}/></button>
                        <button onClick={() => handleDelete(g._id)} className="text-textMuted hover:text-red-400 transition-colors p-1"><Trash2 size={16}/></button>
                    </div>
                    <span className="text-2xl font-bold text-primary">{g.progress}%</span>
                </div>
            </div>
            
            <div className="w-full bg-surface border border-glass rounded-full h-4 mb-4 overflow-hidden">
                <motion.div 
                    initial={{ width: 0 }} 
                    animate={{ width: `${g.progress}%` }} 
                    className={`h-full ${g.isCompleted ? 'bg-yellow-400' : 'bg-primary'}`} 
                />
            </div>

            <button onClick={() => updateProgress(g._id, g.progress)} className="w-full py-2 rounded border border-glass bg-surface/50 text-xs font-medium hover:bg-surfaceLight transition-colors">
                Advance Progress (+25%)
            </button>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => { setShowModal(false); setEditId(null); }}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-panel p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-xl font-bold mb-4 text-textMain">{editId ? 'Edit Goal' : 'New Goal'}</h2>
              <form onSubmit={handleAdd} className="space-y-4">
                <input required type="text" placeholder="Goal Title" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full bg-background border border-glass rounded-lg px-4 py-3 text-textMain" />
                <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full bg-background border border-glass rounded-lg px-4 py-3 text-textMain">
                  <option>Personal</option><option>Career</option><option>Financial</option><option>Health</option>
                </select>
                <input required type="date" value={formData.targetDate} onChange={e => setFormData({...formData, targetDate: e.target.value})} className="w-full bg-background border border-glass rounded-lg px-4 py-3 text-textMain" />
                
                <div className="flex justify-end gap-3 mt-6">
                  <button type="button" onClick={() => { setShowModal(false); setEditId(null); }} className="px-4 py-2 text-textMuted">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-primary text-background rounded-lg font-medium">{editId ? 'Update' : 'Create'}</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
