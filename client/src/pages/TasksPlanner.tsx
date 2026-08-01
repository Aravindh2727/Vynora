import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, CheckSquare, Clock, CheckCircle2, Circle, Trash2, Edit2 } from 'lucide-react';
import { useContextEngineStore } from '../store/useContextEngineStore';

export default function TasksPlanner() {
  const { user } = useContextEngineStore();
  const [tasks, setTasks] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ title: '', description: '', status: 'Todo' });

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      const res = await fetch(`http://localhost:5000/api/tasks?user=${user?.id || '1'}`);
      if (res.ok) setTasks(await res.json());
    } catch (e) { console.error(e); }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editId ? `http://localhost:5000/api/tasks/${editId}` : 'http://localhost:5000/api/tasks';
      const method = editId ? 'PUT' : 'POST';

      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, user: user?.id || '1' })
      });
      setShowModal(false);
      setEditId(null);
      setFormData({ title: '', description: '', status: 'Todo' });
      fetchData();
    } catch (e) { console.error(e); }
  };

  const handleEdit = (task: any) => {
    setFormData({
      title: task.title || '',
      description: task.description || '',
      status: task.status || 'Todo'
    });
    setEditId(task._id);
    setShowModal(true);
  };

  const updateStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'Todo' ? 'InProgress' : currentStatus === 'InProgress' ? 'Done' : 'Todo';
    try {
      await fetch(`http://localhost:5000/api/tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      fetchData();
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`http://localhost:5000/api/tasks/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (e) { console.error(e); }
  };

  const renderColumn = (title: string, statusFilter: string, icon: any, colorClass: string) => {
    const columnTasks = tasks.filter((t: any) => t.status === statusFilter);
    return (
      <div className="flex flex-col h-full bg-surface/30 rounded-2xl border border-glass overflow-hidden">
        <div className={`p-4 border-b border-glass flex items-center justify-between ${colorClass}`}>
          <h2 className="font-bold tracking-wide flex items-center gap-2">{icon} {title}</h2>
          <span className="bg-background/50 px-2 py-0.5 rounded-full text-xs font-bold">{columnTasks.length}</span>
        </div>
        <div className="p-4 space-y-4 flex-1 overflow-y-auto custom-scrollbar">
          {columnTasks.map((task: any) => (
            <motion.div key={task._id} layoutId={task._id} className="bg-surface border border-glass p-4 rounded-xl shadow-glass group cursor-pointer hover:border-primary/50 transition-colors">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-medium text-textMain">{task.title}</h3>
                <div className="flex gap-2">
                    <button onClick={() => handleEdit(task)} className="text-gray-500 hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-all"><Edit2 size={14}/></button>
                    <button onClick={() => handleDelete(task._id)} className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={14}/></button>
                </div>
              </div>
              {task.description && <p className="text-xs text-textMuted mb-4">{task.description}</p>}
              <button 
                onClick={() => updateStatus(task._id, task.status)}
                className="w-full py-1.5 rounded bg-background border border-glass text-xs font-medium hover:bg-surfaceLight transition-colors"
              >
                Move to {statusFilter === 'Todo' ? 'In Progress' : statusFilter === 'InProgress' ? 'Done' : 'Todo'}
              </button>
            </motion.div>
          ))}
          {columnTasks.length === 0 && <p className="text-center text-xs text-gray-500 py-4">No tasks</p>}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 h-full flex flex-col pb-8">
      <div className="flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-wider mb-1">Tasks & Planner</h1>
          <p className="text-textMuted">Kanban board for daily goals.</p>
        </div>
        <button onClick={() => { setEditId(null); setShowModal(true); }} className="bg-primary text-background px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-primary/90 transition-colors shadow-neon-primary-sm font-medium">
          <Plus size={18} /> New Task
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 min-h-0">
        {renderColumn('To Do', 'Todo', <Circle size={16}/>, 'text-textMuted')}
        {renderColumn('In Progress', 'InProgress', <Clock size={16}/>, 'text-primary')}
        {renderColumn('Done', 'Done', <CheckCircle2 size={16}/>, 'text-green-400')}
      </div>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => { setShowModal(false); setEditId(null); }}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="glass-panel p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-xl font-bold mb-4 text-textMain">{editId ? 'Edit Task' : 'Create Task'}</h2>
              <form onSubmit={handleAdd} className="space-y-4">
                <input required type="text" placeholder="Task Title" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full bg-background border border-glass rounded-lg px-4 py-3 text-sm text-textMain outline-none focus:border-primary transition-colors" />
                <textarea placeholder="Description (Optional)" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full bg-background border border-glass rounded-lg px-4 py-3 text-sm text-textMain outline-none focus:border-primary transition-colors resize-none h-24" />
                <div className="flex justify-end gap-3 mt-6">
                  <button type="button" onClick={() => { setShowModal(false); setEditId(null); }} className="px-4 py-2 text-sm text-textMuted hover:text-textMain transition-colors">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-primary text-background rounded-lg font-medium text-sm shadow-neon-primary-sm hover:bg-primary/90 transition-colors">{editId ? 'Update' : 'Create'}</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
