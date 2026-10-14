import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, CheckSquare, Clock, CheckCircle2, Circle, Trash2, Edit2, 
  Search, Download, Calendar, ExternalLink, AlertCircle, List, 
  Kanban, Tag, Check, Paperclip, ChevronRight, Flag
} from 'lucide-react';
import { useContextEngineStore } from '../store/useContextEngineStore';
import { TaskService, getActiveUserId } from '../services/firestoreService';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { FileUpload } from '../components/common/FileUpload';
import { EmptyState } from '../components/common/EmptyState';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { exportToCSV } from '../utils/csvExport';

const TASK_CATEGORIES = ['Work', 'Personal', 'Finance', 'Health', 'Farm', 'Study', 'Home'];
const PRIORITIES = [
  { id: 'Low', label: 'Low', color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' },
  { id: 'Medium', label: 'Medium', color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' },
  { id: 'High', label: 'High', color: 'text-orange-400 bg-orange-500/10 border-orange-500/20' },
  { id: 'Urgent', label: 'Urgent', color: 'text-red-400 bg-red-500/10 border-red-500/20' }
];

export default function TasksPlanner() {
  const { user } = useContextEngineStore();
  const activeUid = getActiveUserId(user?.id);

  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // View & Filters
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [filterPriority, setFilterPriority] = useState('ALL');

  // Modals
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string; title: string }>({
    isOpen: false,
    id: '',
    title: ''
  });

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'Todo',
    priority: 'Medium',
    category: 'Work',
    dueDate: new Date().toISOString().split('T')[0],
    recurrence: 'None',
    attachmentUrl: '',
    subtasks: [] as { id: string; text: string; done: boolean }[]
  });

  // Subtask temporary input
  const [newSubtaskText, setNewSubtaskText] = useState('');

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await TaskService.getTasks(activeUid);
      setTasks(data);
    } catch (e) {
      console.error('Error fetching tasks:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        isCompleted: formData.status === 'Done'
      };

      if (editId) {
        await TaskService.updateTask(editId, payload);
      } else {
        await TaskService.addTask(activeUid, payload);
      }
      setShowModal(false);
      setEditId(null);
      resetForm();
      fetchData();
    } catch (e) {
      console.error('Error saving task:', e);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      status: 'Todo',
      priority: 'Medium',
      category: 'Work',
      dueDate: new Date().toISOString().split('T')[0],
      recurrence: 'None',
      attachmentUrl: '',
      subtasks: []
    });
    setNewSubtaskText('');
  };

  const handleEdit = (task: any) => {
    setFormData({
      title: task.title || '',
      description: task.description || '',
      status: task.status || 'Todo',
      priority: task.priority || 'Medium',
      category: task.category || 'Work',
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
      recurrence: task.recurrence || 'None',
      attachmentUrl: task.attachmentUrl || '',
      subtasks: Array.isArray(task.subtasks) ? task.subtasks : []
    });
    setEditId(task._id || task.id);
    setShowModal(true);
  };

  const updateStatus = async (task: any, newStatus: string) => {
    try {
      await TaskService.updateTask(task._id || task.id, {
        status: newStatus,
        isCompleted: newStatus === 'Done'
      });
      fetchData();
    } catch (e) {
      console.error('Error updating task status:', e);
    }
  };

  const toggleSubtaskDone = async (task: any, subtaskId: string) => {
    const updatedSubtasks = (task.subtasks || []).map((st: any) =>
      st.id === subtaskId ? { ...st, done: !st.done } : st
    );
    const allDone = updatedSubtasks.length > 0 && updatedSubtasks.every((st: any) => st.done);

    try {
      await TaskService.updateTask(task._id || task.id, {
        subtasks: updatedSubtasks,
        status: allDone ? 'Done' : task.status === 'Done' ? 'InProgress' : task.status,
        isCompleted: allDone
      });
      fetchData();
    } catch (e) {
      console.error('Error toggling subtask:', e);
    }
  };

  const confirmDeleteAction = async () => {
    try {
      await TaskService.deleteTask(deleteModal.id);
      setDeleteModal({ isOpen: false, id: '', title: '' });
      fetchData();
    } catch (e) {
      console.error('Error deleting task:', e);
    }
  };

  // Add subtask in modal
  const handleAddSubtask = () => {
    if (!newSubtaskText.trim()) return;
    setFormData(prev => ({
      ...prev,
      subtasks: [
        ...prev.subtasks,
        { id: Date.now().toString(), text: newSubtaskText.trim(), done: false }
      ]
    }));
    setNewSubtaskText('');
  };

  const handleRemoveSubtask = (id: string) => {
    setFormData(prev => ({
      ...prev,
      subtasks: prev.subtasks.filter(st => st.id !== id)
    }));
  };

  // Filtering
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const filteredTasks = tasks.filter(task => {
    if (filterCategory !== 'ALL' && task.category !== filterCategory) return false;
    if (filterPriority !== 'ALL' && task.priority !== filterPriority) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = (task.title || '').toLowerCase().includes(q);
      const matchDesc = (task.description || '').toLowerCase().includes(q);
      const matchCat = (task.category || '').toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchCat) return false;
    }
    return true;
  });

  const todoTasks = filteredTasks.filter(t => t.status === 'Todo' || !t.status);
  const inProgressTasks = filteredTasks.filter(t => t.status === 'InProgress');
  const reviewTasks = filteredTasks.filter(t => t.status === 'Review');
  const doneTasks = filteredTasks.filter(t => t.status === 'Done');

  const overdueCount = tasks.filter(t => t.status !== 'Done' && t.dueDate && new Date(t.dueDate) < now).length;

  const handleExportCSV = () => {
    const data = filteredTasks.map(t => {
      const completedSubtasks = (t.subtasks || []).filter((st: any) => st.done).length;
      const totalSubtasks = (t.subtasks || []).length;
      return {
        Title: t.title,
        Category: t.category || 'General',
        Priority: t.priority || 'Medium',
        Status: t.status || 'Todo',
        'Due Date': t.dueDate ? new Date(t.dueDate).toLocaleDateString() : '',
        'Subtasks Progress': totalSubtasks > 0 ? `${completedSubtasks}/${totalSubtasks}` : 'N/A',
        Recurrence: t.recurrence || 'None'
      };
    });
    exportToCSV(data, 'vynora_tasks_planner.csv');
  };

  if (loading) {
    return <LoadingSpinner message="Loading your task boards and planner..." />;
  }

  const renderTaskCard = (task: any) => {
    const isOverdue = task.status !== 'Done' && task.dueDate && new Date(task.dueDate) < now;
    const prio = PRIORITIES.find(p => p.id === task.priority) || PRIORITIES[1];
    const totalSub = (task.subtasks || []).length;
    const doneSub = (task.subtasks || []).filter((st: any) => st.done).length;
    const progressPct = totalSub > 0 ? Math.round((doneSub / totalSub) * 100) : 0;

    return (
      <motion.div
        key={task._id || task.id}
        layoutId={task._id || task.id}
        className="bg-surface border border-glass p-4 rounded-xl shadow-glass hover:border-primary/50 transition-all flex flex-col justify-between"
      >
        <div>
          {/* Header Row */}
          <div className="flex justify-between items-start gap-2 mb-2">
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${prio.color}`}>
              {prio.label}
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-textMuted bg-surfaceLight px-2 py-0.5 rounded">
                {task.category || 'Work'}
              </span>
              <button
                onClick={() => handleEdit(task)}
                className="text-textMuted hover:text-blue-400 p-0.5 transition-colors"
                title="Edit"
              >
                <Edit2 size={13} />
              </button>
              <button
                onClick={() => setDeleteModal({ isOpen: true, id: task._id || task.id, title: task.title })}
                className="text-textMuted hover:text-red-400 p-0.5 transition-colors"
                title="Delete"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>

          <h3 className={`font-semibold text-sm mb-1 ${task.status === 'Done' ? 'line-through text-textMuted' : 'text-textMain'}`}>
            {task.title}
          </h3>

          {task.description && (
            <p className="text-xs text-textMuted mb-3 line-clamp-2">{task.description}</p>
          )}

          {/* Subtasks Progress */}
          {totalSub > 0 && (
            <div className="mb-3 space-y-1">
              <div className="flex justify-between text-[11px] text-textMuted">
                <span>Subtasks ({doneSub}/{totalSub})</span>
                <span>{progressPct}%</span>
              </div>
              <div className="w-full bg-background rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-primary h-full rounded-full transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>

              {/* Subtasks checklist items */}
              <div className="pt-1.5 space-y-1">
                {task.subtasks.map((st: any) => (
                  <button
                    key={st.id}
                    onClick={() => toggleSubtaskDone(task, st.id)}
                    className="flex items-center gap-2 text-left w-full text-[11px] hover:text-textMain text-textMuted transition-colors"
                  >
                    <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${st.done ? 'bg-primary border-primary text-background' : 'border-glass'}`}>
                      {st.done && <Check size={10} />}
                    </span>
                    <span className={st.done ? 'line-through opacity-70' : ''}>{st.text}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Due Date & Move Action */}
        <div className="pt-2 border-t border-glass flex items-center justify-between text-xs mt-2">
          {task.dueDate ? (
            <span className={`flex items-center gap-1 text-[11px] font-medium ${isOverdue ? 'text-red-400' : 'text-textMuted'}`}>
              <Clock size={12} /> {new Date(task.dueDate).toLocaleDateString()}
            </span>
          ) : (
            <span className="text-[11px] text-textMuted">No due date</span>
          )}

          <select
            value={task.status || 'Todo'}
            onChange={e => updateStatus(task, e.target.value)}
            className="bg-surfaceLight border border-glass rounded px-2 py-0.5 text-[11px] text-textMain focus:outline-none"
          >
            <option value="Todo">To Do</option>
            <option value="InProgress">In Progress</option>
            <option value="Review">Review</option>
            <option value="Done">Done</option>
          </select>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-wider mb-1 flex items-center gap-3">
            <CheckSquare className="text-primary" size={32} /> Tasks & Planner
          </h1>
          <p className="text-textMuted">
            Kanban workflow, subtask checklists, priority tiers, and scheduled productivity reminders.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="flex bg-surface border border-glass rounded-xl p-0.5">
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
                viewMode === 'kanban' ? 'bg-primary text-background' : 'text-textMuted hover:text-textMain'
              }`}
            >
              <Kanban size={14} /> Kanban
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
                viewMode === 'list' ? 'bg-primary text-background' : 'text-textMuted hover:text-textMain'
              }`}
            >
              <List size={14} /> List
            </button>
          </div>
          <button
            onClick={handleExportCSV}
            className="bg-surface border border-glass px-3 py-1.5 rounded-xl text-textMuted hover:text-textMain flex items-center gap-1.5 text-xs transition-colors"
          >
            <Download size={14} /> Export CSV
          </button>
          <button
            onClick={() => { resetForm(); setEditId(null); setShowModal(true); }}
            className="bg-primary text-background px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-primary/90 transition-colors shadow-neon-primary-sm font-bold text-sm"
          >
            <Plus size={16} /> New Task
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="glass-panel p-4 border-l-4 border-l-primary flex justify-between items-center">
          <div>
            <p className="text-xs text-textMuted">To Do</p>
            <h3 className="text-2xl font-bold text-textMain">{todoTasks.length}</h3>
          </div>
          <Circle className="text-primary/60" size={24} />
        </div>
        <div className="glass-panel p-4 border-l-4 border-l-amber-400 flex justify-between items-center">
          <div>
            <p className="text-xs text-textMuted">In Progress</p>
            <h3 className="text-2xl font-bold text-amber-400">{inProgressTasks.length}</h3>
          </div>
          <Clock className="text-amber-400/60" size={24} />
        </div>
        <div className="glass-panel p-4 border-l-4 border-l-red-500 flex justify-between items-center">
          <div>
            <p className="text-xs text-textMuted">Overdue</p>
            <h3 className="text-2xl font-bold text-red-400">{overdueCount}</h3>
          </div>
          <AlertCircle className="text-red-500/60" size={24} />
        </div>
        <div className="glass-panel p-4 border-l-4 border-l-green-500 flex justify-between items-center">
          <div>
            <p className="text-xs text-textMuted">Completed</p>
            <h3 className="text-2xl font-bold text-green-400">{doneTasks.length}</h3>
          </div>
          <CheckCircle2 className="text-green-500/60" size={24} />
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-2.5 text-textMuted" size={14} />
          <input
            type="text"
            placeholder="Search tasks, categories..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-surface border border-glass rounded-xl pl-8 pr-3 py-1.5 text-xs text-textMain focus:outline-none focus:border-primary"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className="bg-surface border border-glass rounded-xl px-3 py-1.5 text-xs text-textMain focus:outline-none"
          >
            <option value="ALL">All Categories</option>
            {TASK_CATEGORIES.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select
            value={filterPriority}
            onChange={e => setFilterPriority(e.target.value)}
            className="bg-surface border border-glass rounded-xl px-3 py-1.5 text-xs text-textMain focus:outline-none"
          >
            <option value="ALL">All Priorities</option>
            {PRIORITIES.map(p => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Kanban Board Mode */}
      {viewMode === 'kanban' ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
          {[
            { id: 'Todo', title: 'To Do', items: todoTasks, color: 'text-textMuted border-t-textMuted' },
            { id: 'InProgress', title: 'In Progress', items: inProgressTasks, color: 'text-amber-400 border-t-amber-400' },
            { id: 'Review', title: 'Under Review', items: reviewTasks, color: 'text-blue-400 border-t-blue-400' },
            { id: 'Done', title: 'Completed', items: doneTasks, color: 'text-green-400 border-t-green-400' }
          ].map(col => (
            <div key={col.id} className={`glass-panel p-4 flex flex-col gap-3 border-t-4 ${col.color} min-h-[400px]`}>
              <div className="flex justify-between items-center mb-1">
                <h2 className="font-bold text-sm text-textMain">{col.title}</h2>
                <span className="bg-surfaceLight px-2 py-0.5 rounded-full text-xs font-bold text-textMuted">
                  {col.items.length}
                </span>
              </div>

              <div className="space-y-3">
                {col.items.map(task => renderTaskCard(task))}
                {col.items.length === 0 && (
                  <p className="text-center text-xs text-textMuted/60 py-10 border border-dashed border-glass rounded-xl">
                    No tasks here
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* List Mode */
        <div className="glass-panel p-6">
          {filteredTasks.length === 0 ? (
            <EmptyState
              icon={CheckSquare}
              title="No tasks found"
              description="Create a task with subtasks, due dates, priority tiers, and category assignments."
              actionText="Create New Task"
              onAction={() => { resetForm(); setShowModal(true); }}
            />
          ) : (
            <div className="divide-y divide-glass/50">
              {filteredTasks.map(task => {
                const prio = PRIORITIES.find(p => p.id === task.priority) || PRIORITIES[1];
                const totalSub = (task.subtasks || []).length;
                const doneSub = (task.subtasks || []).filter((st: any) => st.done).length;

                return (
                  <div key={task._id || task.id} className="py-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => updateStatus(task, task.status === 'Done' ? 'Todo' : 'Done')}
                        className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                          task.status === 'Done' ? 'bg-green-500 border-green-500 text-background' : 'border-glass hover:border-primary'
                        }`}
                      >
                        {task.status === 'Done' && <Check size={14} />}
                      </button>
                      <div>
                        <h4 className={`text-sm font-semibold ${task.status === 'Done' ? 'line-through text-textMuted' : 'text-textMain'}`}>
                          {task.title}
                        </h4>
                        <div className="flex items-center gap-2 text-[11px] text-textMuted mt-0.5">
                          <span>{task.category || 'General'}</span>
                          <span>•</span>
                          <span className={prio.color}>{prio.label}</span>
                          {task.dueDate && (
                            <>
                              <span>•</span>
                              <span>Due {new Date(task.dueDate).toLocaleDateString()}</span>
                            </>
                          )}
                          {totalSub > 0 && (
                            <>
                              <span>•</span>
                              <span>{doneSub}/{totalSub} subtasks</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(task)}
                        className="p-1.5 rounded-lg text-textMuted hover:text-blue-400 transition-colors"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => setDeleteModal({ isOpen: true, id: task._id || task.id, title: task.title })}
                        className="p-1.5 rounded-lg text-textMuted hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Add / Edit Task Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="glass-panel p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <h2 className="text-xl font-bold mb-4 text-textMain">
                {editId ? 'Edit Task' : 'Create New Task'}
              </h2>
              <form onSubmit={handleSaveTask} className="space-y-4">
                <div>
                  <label className="text-xs text-textMuted mb-1 block">Task Title *</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. Prepare soil test report"
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    className="w-full bg-background border border-glass rounded-lg px-3 py-2 text-sm text-textMain focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="text-xs text-textMuted mb-1 block">Description</label>
                  <textarea
                    rows={2}
                    placeholder="Task details and instructions..."
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    className="w-full bg-background border border-glass rounded-lg px-3 py-2 text-sm text-textMain focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-textMuted mb-1 block">Status</label>
                    <select
                      value={formData.status}
                      onChange={e => setFormData({ ...formData, status: e.target.value })}
                      className="w-full bg-background border border-glass rounded-lg px-3 py-2 text-sm text-textMain"
                    >
                      <option value="Todo">To Do</option>
                      <option value="InProgress">In Progress</option>
                      <option value="Review">Under Review</option>
                      <option value="Done">Done</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-textMuted mb-1 block">Priority</label>
                    <select
                      value={formData.priority}
                      onChange={e => setFormData({ ...formData, priority: e.target.value })}
                      className="w-full bg-background border border-glass rounded-lg px-3 py-2 text-sm text-textMain"
                    >
                      {PRIORITIES.map(p => (
                        <option key={p.id} value={p.id}>{p.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-textMuted mb-1 block">Category</label>
                    <select
                      value={formData.category}
                      onChange={e => setFormData({ ...formData, category: e.target.value })}
                      className="w-full bg-background border border-glass rounded-lg px-3 py-2 text-sm text-textMain"
                    >
                      {TASK_CATEGORIES.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-textMuted mb-1 block">Due Date</label>
                    <input
                      type="date"
                      value={formData.dueDate}
                      onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
                      className="w-full bg-background border border-glass rounded-lg px-3 py-2 text-sm text-textMain"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-textMuted mb-1 block">Recurrence</label>
                    <select
                      value={formData.recurrence}
                      onChange={e => setFormData({ ...formData, recurrence: e.target.value })}
                      className="w-full bg-background border border-glass rounded-lg px-3 py-2 text-sm text-textMain"
                    >
                      <option value="None">None</option>
                      <option value="Daily">Daily</option>
                      <option value="Weekly">Weekly</option>
                      <option value="Monthly">Monthly</option>
                    </select>
                  </div>
                </div>

                {/* Subtask Builder */}
                <div className="space-y-2 pt-2 border-t border-glass">
                  <label className="text-xs font-semibold text-textMain block">Subtask Checklist</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Add subtask step..."
                      value={newSubtaskText}
                      onChange={e => setNewSubtaskText(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddSubtask(); } }}
                      className="flex-1 bg-background border border-glass rounded-lg px-3 py-1.5 text-xs text-textMain"
                    />
                    <button
                      type="button"
                      onClick={handleAddSubtask}
                      className="px-3 py-1.5 bg-surface border border-glass text-textMain rounded-lg text-xs font-semibold hover:bg-surfaceLight"
                    >
                      Add
                    </button>
                  </div>

                  {formData.subtasks.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      {formData.subtasks.map(st => (
                        <div key={st.id} className="flex items-center justify-between bg-surface/50 p-2 rounded-lg text-xs">
                          <span className="text-textMain">{st.text}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveSubtask(st.id)}
                            className="text-textMuted hover:text-red-400"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Cloudinary Attachment */}
                <FileUpload
                  label="Attach Document / Photo (Optional)"
                  currentUrl={formData.attachmentUrl}
                  onUploadSuccess={(url: string) => setFormData({ ...formData, attachmentUrl: url })}
                  onRemove={() => setFormData({ ...formData, attachmentUrl: '' })}
                />

                <div className="flex justify-end gap-3 mt-6 pt-3 border-t border-glass">
                  <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-textMuted hover:text-textMain">Cancel</button>
                  <button type="submit" className="px-5 py-2 bg-primary text-background rounded-lg font-bold text-sm shadow-neon-primary-sm hover:opacity-95">
                    {editId ? 'Update Task' : 'Create Task'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title="Delete Task"
        message={`Are you sure you want to permanently delete "${deleteModal.title}" and its subtasks?`}
        confirmText="Delete Task"
        isDestructive={true}
        onConfirm={confirmDeleteAction}
        onCancel={() => setDeleteModal({ isOpen: false, id: '', title: '' })}
      />
    </div>
  );
}
