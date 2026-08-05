import { API_BASE_URL } from '../config';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, GraduationCap, BookOpen, Calendar, CheckCircle2, Circle, Edit2, Trash2 } from 'lucide-react';
import { useContextEngineStore } from '../store/useContextEngineStore';

export default function StudentPlanner() {
  const { user } = useContextEngineStore();
  const [tasks, setTasks] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ title: '', subject: '', type: 'Assignment', dueDate: '' });

  useEffect(() => { fetchData(); }, [user]);

  const fetchData = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/student?user=${user?.id || '1'}`);
      if (res.ok) setTasks(await res.json());
    } catch (e) { console.error(e); }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editId ? `${API_BASE_URL}/api/student/${editId}` : API_BASE_URL + '/api/student';
      const method = editId ? 'PUT' : 'POST';

      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, user: user?.id || '1' })
      });
      setShowModal(false);
      setEditId(null);
      setFormData({ title: '', subject: '', type: 'Assignment', dueDate: '' });
      fetchData();
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`${API_BASE_URL}/api/student/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (e) { console.error(e); }
  };

  const handleEdit = (task: any) => {
    setFormData({
      title: task.title || '',
      subject: task.subject || '',
      type: task.type || 'Assignment',
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : ''
    });
    setEditId(task._id);
    setShowModal(true);
  };

  const toggleStatus = async (id: string, status: string) => {
    try {
      await fetch(`${API_BASE_URL}/api/student/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: status === 'Pending' ? 'Completed' : 'Pending' })
      });
      fetchData();
    } catch (e) { console.error(e); }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-wider mb-1">Student Planner</h1>
          <p className="text-textMuted">Track exams, assignments, and projects.</p>
        </div>
        <button onClick={() => { setEditId(null); setShowModal(true); }} className="bg-primary text-background px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-primary/90 font-medium">
          <Plus size={18} /> Add Task
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tasks.map((t: any) => (
          <motion.div key={t._id} whileHover={{ y: -5 }} className={`glass-panel p-6 flex flex-col justify-between border-t-4 ${t.status === 'Completed' ? 'border-t-green-400 opacity-70' : 'border-t-primary'}`}>
            <div className="flex justify-between items-start mb-4">
                <div className={`p-3 bg-surface border border-glass rounded-xl ${t.type === 'Exam' ? 'text-red-400' : 'text-primary'}`}>
                    {t.type === 'Exam' ? <GraduationCap size={24} /> : <BookOpen size={24} />}
                </div>
                <div className="flex flex-col items-end gap-2">
                    <div className="flex gap-2">
                        <button onClick={() => handleEdit(t)} className="text-textMuted hover:text-blue-400 p-1"><Edit2 size={16}/></button>
                        <button onClick={() => handleDelete(t._id)} className="text-textMuted hover:text-red-400 p-1"><Trash2 size={16}/></button>
                    </div>
                    <span className={`text-xs font-bold px-2 py-1 rounded ${t.type === 'Exam' ? 'bg-red-400/20 text-red-400' : 'bg-primary/20 text-primary'}`}>{t.type}</span>
                </div>
            </div>
            <div>
                <h3 className="text-xl font-bold text-textMain mb-1">{t.title}</h3>
                <p className="text-sm text-textMuted mb-4">{t.subject}</p>
                <div className="flex items-center gap-2 text-sm font-medium bg-surface/50 p-2 rounded-lg border border-glass w-fit mb-6">
                    <Calendar size={14} className="text-textMuted" /> Due {new Date(t.dueDate).toLocaleDateString()}
                </div>
            </div>
            
            <button onClick={() => toggleStatus(t._id, t.status)} className={`w-full py-2 rounded-xl flex items-center justify-center gap-2 font-medium transition-colors ${t.status === 'Completed' ? 'bg-green-400/20 text-green-400 border border-green-400/50' : 'bg-surface border border-glass text-textMuted hover:text-textMain'}`}>
                {t.status === 'Completed' ? <><CheckCircle2 size={18} /> Completed</> : <><Circle size={18} /> Mark Complete</>}
            </button>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => { setShowModal(false); setEditId(null); }}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-panel p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-xl font-bold mb-4 text-textMain">{editId ? 'Edit Study Task' : 'Add Study Task'}</h2>
              <form onSubmit={handleAdd} className="space-y-4">
                <input required type="text" placeholder="Task Title" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full bg-background border border-glass rounded-lg px-4 py-3 text-textMain" />
                <input required type="text" placeholder="Subject" value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value})} className="w-full bg-background border border-glass rounded-lg px-4 py-3 text-textMain" />
                <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full bg-background border border-glass rounded-lg px-4 py-3 text-textMain">
                  <option>Assignment</option><option>Exam</option><option>Project</option>
                </select>
                <input required type="date" value={formData.dueDate} onChange={e => setFormData({...formData, dueDate: e.target.value})} className="w-full bg-background border border-glass rounded-lg px-4 py-3 text-textMain" />
                
                <div className="flex justify-end gap-3 mt-6">
                  <button type="button" onClick={() => { setShowModal(false); setEditId(null); }} className="px-4 py-2 text-textMuted">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-primary text-background rounded-lg font-medium">{editId ? 'Update' : 'Add'}</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
