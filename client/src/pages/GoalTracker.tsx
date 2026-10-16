import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Target, Award, Edit2, Trash2, Search, Download, 
  Calendar, CheckCircle2, Circle, TrendingUp, IndianRupee, 
  BookOpen, Briefcase, Heart, Sprout, Check, ChevronRight, AlertCircle, FileText
} from 'lucide-react';
import { useContextEngineStore } from '../store/useContextEngineStore';
import { clampGoalProgress } from '../utils/calculations';
import { formatIsoDate } from '../utils/dateUtils';
import { GoalService, getActiveUserId } from '../services/firestoreService';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { FileUpload } from '../components/common/FileUpload';
import { EmptyState } from '../components/common/EmptyState';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { exportToCSV } from '../utils/csvExport';
import { MobilePageHeader } from '../components/common/MobilePageHeader';

const GOAL_CATEGORIES = [
  { id: 'Financial', label: 'Financial & Savings', icon: IndianRupee, color: 'text-green-400' },
  { id: 'Career', label: 'Career & Professional', icon: Briefcase, color: 'text-blue-400' },
  { id: 'Education', label: 'Education & Learning', icon: BookOpen, color: 'text-yellow-400' },
  { id: 'Health', label: 'Health & Fitness', icon: Heart, color: 'text-red-400' },
  { id: 'Agriculture', label: 'Agriculture & Farm', icon: Sprout, color: 'text-emerald-400' },
  { id: 'Personal', label: 'Personal & Habits', icon: Target, color: 'text-purple-400' }
];

export default function GoalTracker() {
  const { user } = useContextEngineStore();
  const activeUid = getActiveUserId(user?.id);

  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Tabs
  const [activeTab, setActiveTab] = useState<'active' | 'completed' | 'all'>('active');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showModal, setShowModal] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [activeGoal, setActiveGoal] = useState<any | null>(null);
  const [progressInput, setProgressInput] = useState('');
  const [editId, setEditId] = useState<string | null>(null);

  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string; title: string }>({
    isOpen: false,
    id: '',
    title: ''
  });

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    category: 'Financial',
    unitType: 'Currency', // 'Currency' | 'Numeric' | 'Percentage'
    targetValue: '100000',
    currentValue: '0',
    unitName: '₹',
    targetDate: new Date(new Date().setMonth(new Date().getMonth() + 6)).toISOString().split('T')[0],
    milestones: [] as { id: string; title: string; done: boolean }[],
    notes: '',
    attachmentUrl: ''
  });

  const [newMilestoneTitle, setNewMilestoneTitle] = useState('');

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await GoalService.getGoals(activeUid);
      setGoals(data);
    } catch (e) {
      console.error('Error fetching goals:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const targetNum = Number(formData.targetValue) || 100;
      const currentNum = Number(formData.currentValue) || 0;
      const computedProgress = targetNum > 0 ? clampGoalProgress(Math.round((currentNum / targetNum) * 100)) : 0;
      const isCompleted = computedProgress >= 100;

      const payload = {
        ...formData,
        targetValue: targetNum,
        currentValue: currentNum,
        progress: computedProgress,
        isCompleted
      };

      if (editId) {
        await GoalService.updateGoal(editId, payload);
      } else {
        await GoalService.addGoal(activeUid, payload);
      }

      setShowModal(false);
      setEditId(null);
      resetForm();
      fetchData();
    } catch (e) {
      console.error('Error saving goal:', e);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      category: 'Financial',
      unitType: 'Currency',
      targetValue: '100000',
      currentValue: '0',
      unitName: '₹',
      targetDate: new Date(new Date().setMonth(new Date().getMonth() + 6)).toISOString().split('T')[0],
      milestones: [],
      notes: '',
      attachmentUrl: ''
    });
    setNewMilestoneTitle('');
  };

  const handleEdit = (goal: any) => {
    if (!goal) return;
    setFormData({
      title: goal.title || '',
      category: goal.category || 'Financial',
      unitType: goal.unitType || 'Currency',
      targetValue: goal.targetValue?.toString() || '100000',
      currentValue: goal.currentValue?.toString() || '0',
      unitName: goal.unitName || '₹',
      targetDate: formatIsoDate(goal.targetDate),
      milestones: Array.isArray(goal.milestones) ? goal.milestones : [],
      notes: goal.notes || '',
      attachmentUrl: goal.attachmentUrl || ''
    });
    setEditId(goal._id || goal.id);
    setShowModal(true);
  };

  // Milestone check toggling
  const toggleMilestone = async (goal: any, milestoneId: string) => {
    const updated = (goal.milestones || []).map((m: any) =>
      m.id === milestoneId ? { ...m, done: !m.done } : m
    );

    const total = updated.length;
    const completed = updated.filter((m: any) => m.done).length;
    const progress = total > 0 ? clampGoalProgress(Math.round((completed / total) * 100)) : goal.progress;
    const isCompleted = progress >= 100;

    try {
      await GoalService.updateGoal(goal._id || goal.id, {
        milestones: updated,
        progress,
        isCompleted
      });
      fetchData();
    } catch (e) {
      console.error('Error toggling milestone:', e);
    }
  };

  // Advance Progress Modal Submit
  const handleAdvanceProgress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeGoal) return;

    const addVal = Number(progressInput) || 0;
    const newCurrent = (Number(activeGoal.currentValue) || 0) + addVal;
    const target = Number(activeGoal.targetValue) || 100;
    const newProgress = target > 0 ? clampGoalProgress(Math.round((newCurrent / target) * 100)) : 100;
    const isCompleted = newProgress >= 100;

    try {
      await GoalService.updateGoal(activeGoal._id || activeGoal.id, {
        currentValue: newCurrent,
        progress: newProgress,
        isCompleted
      });
      setShowProgressModal(false);
      setActiveGoal(null);
      setProgressInput('');
      fetchData();
    } catch (e) {
      console.error('Error updating progress:', e);
    }
  };

  const confirmDeleteAction = async () => {
    try {
      await GoalService.deleteGoal(deleteModal.id);
      setDeleteModal({ isOpen: false, id: '', title: '' });
      fetchData();
    } catch (e) {
      console.error('Error deleting goal:', e);
    }
  };

  const handleAddMilestoneToForm = () => {
    if (!newMilestoneTitle.trim()) return;
    setFormData(prev => ({
      ...prev,
      milestones: [
        ...prev.milestones,
        { id: Date.now().toString(), title: newMilestoneTitle.trim(), done: false }
      ]
    }));
    setNewMilestoneTitle('');
  };

  const handleRemoveMilestoneFromForm = (id: string) => {
    setFormData(prev => ({
      ...prev,
      milestones: prev.milestones.filter(m => m.id !== id)
    }));
  };

  // Filtering
  const activeGoals = goals.filter(g => !g.isCompleted);
  const completedGoals = goals.filter(g => g.isCompleted);

  const filteredGoals = goals.filter(goal => {
    if (activeTab === 'active' && goal.isCompleted) return false;
    if (activeTab === 'completed' && !goal.isCompleted) return false;

    if (selectedCategory !== 'ALL' && goal.category !== selectedCategory) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = (goal.title || '').toLowerCase().includes(q);
      const matchCat = (goal.category || '').toLowerCase().includes(q);
      if (!matchTitle && !matchCat) return false;
    }
    return true;
  });

  const handleExportCSV = () => {
    const data = filteredGoals.map(g => ({
      Title: g.title,
      Category: g.category,
      Progress: `${g.progress || 0}%`,
      Current: `${g.currentValue || 0} ${g.unitName || ''}`,
      Target: `${g.targetValue || 0} ${g.unitName || ''}`,
      'Target Date': g.targetDate ? new Date(g.targetDate).toLocaleDateString() : '',
      Status: g.isCompleted ? 'Achieved' : 'In Progress'
    }));
    exportToCSV(data, 'vynora_goals_tracker.csv');
  };

  if (loading) {
    return <LoadingSpinner message="Calculating your goal milestones and trajectories..." />;
  }

  return (
    <div className="space-y-6">
      <MobilePageHeader
        title="Goal Tracker"
        parentLabel="Dashboard"
        fallbackPath="/"
        subtitle="Financial savings targets, career milestones, health achievements, and agriculture objectives."
        badges={[
          { label: `${activeGoals.length} In Progress`, variant: 'info' },
          { label: `${completedGoals.length} Achieved`, variant: 'success' }
        ]}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="min-h-[44px] bg-surface border border-glass px-3.5 py-2 rounded-xl text-textMuted hover:text-textMain flex items-center gap-1.5 text-xs sm:text-sm transition-colors touch-target"
            >
              <Download size={15} /> <span className="hidden sm:inline">Export</span>
            </button>
            <button
              onClick={() => { resetForm(); setEditId(null); setShowModal(true); }}
              className="min-h-[44px] bg-primary text-background px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-primary/90 transition-colors shadow-neon-primary-sm font-bold text-xs sm:text-sm touch-target"
            >
              <Plus size={16} /> <span>Set Goal</span>
            </button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-panel p-5 border-l-4 border-l-primary flex justify-between items-center">
          <div>
            <p className="text-xs text-textMuted uppercase font-semibold">In Progress</p>
            <h2 className="text-2xl font-bold text-textMain mt-1">{activeGoals.length}</h2>
          </div>
          <TrendingUp className="text-primary/70" size={28} />
        </div>

        <div className="glass-panel p-5 border-l-4 border-l-green-500 flex justify-between items-center">
          <div>
            <p className="text-xs text-textMuted uppercase font-semibold">Goals Achieved</p>
            <h2 className="text-2xl font-bold text-green-400 mt-1">{completedGoals.length}</h2>
          </div>
          <Award className="text-green-500/70" size={28} />
        </div>

        <div className="glass-panel p-5 border-l-4 border-l-blue-500 flex justify-between items-center">
          <div>
            <p className="text-xs text-textMuted uppercase font-semibold">Average Completion</p>
            <h2 className="text-2xl font-bold text-blue-400 mt-1">
              {goals.length > 0
                ? Math.round(goals.reduce((sum, g) => sum + (Number(g.progress) || 0), 0) / goals.length)
                : 0}%
            </h2>
          </div>
          <Target className="text-blue-500/70" size={28} />
        </div>
      </div>

      {/* Subsections & Tabs */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex border-b border-glass gap-2 overflow-x-auto pb-1 w-full sm:w-auto scrollbar-none">
          {[
            { key: 'active', label: `Active Goals (${activeGoals.length})` },
            { key: 'completed', label: `Achieved (${completedGoals.length})` },
            { key: 'all', label: `All Goals (${goals.length})` }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-4 py-2 rounded-t-xl text-xs font-semibold whitespace-nowrap transition-all border-b-2 ${
                activeTab === tab.key
                  ? 'border-primary text-primary bg-primary/10 shadow-neon-primary-sm'
                  : 'border-transparent text-textMuted hover:text-textMain hover:bg-surface/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-60">
            <Search className="absolute left-3 top-2.5 text-textMuted" size={14} />
            <input
              type="text"
              placeholder="Search goals..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-surface border border-glass rounded-xl pl-8 pr-3 py-1.5 text-xs text-textMain focus:outline-none focus:border-primary"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="bg-surface border border-glass rounded-xl px-3 py-1.5 text-xs text-textMain focus:outline-none"
          >
            <option value="ALL">All Categories</option>
            {GOAL_CATEGORIES.map(c => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Goals Grid */}
      {filteredGoals.length === 0 ? (
        <EmptyState
          icon={Target}
          title="No goals found"
          description={
            activeTab === 'completed'
              ? "Achieved goals with their certificates and celebration dates will appear here."
              : "Set measurable targets for emergency savings, home purchase, education, health, or farm profits."
          }
          actionText={activeTab === 'active' ? "Set First Goal" : undefined}
          onAction={activeTab === 'active' ? () => { resetForm(); setShowModal(true); } : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredGoals.map((goal: any) => {
            const progressVal = clampGoalProgress(goal.progress);
            const catMeta = GOAL_CATEGORIES.find(c => c.id === goal.category) || GOAL_CATEGORIES[0];
            const CatIcon = catMeta.icon;
            const milestones = Array.isArray(goal.milestones) ? goal.milestones : [];

            return (
              <motion.div
                key={goal._id || goal.id}
                whileHover={{ y: -4 }}
                className={`glass-panel p-6 flex flex-col justify-between border-t-4 ${
                  goal.isCompleted ? 'border-t-green-400 bg-green-500/5' : 'border-t-primary'
                }`}
              >
                <div>
                  {/* Top Row */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 bg-surface border border-glass rounded-xl ${catMeta.color}`}>
                        <CatIcon size={22} />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-textMain flex items-center gap-2">
                          {goal.title}
                          {goal.isCompleted && <Award className="text-yellow-400 shrink-0" size={18} />}
                        </h3>
                        <p className="text-xs text-textMuted">
                          {catMeta.label} • Target: {new Date(goal.targetDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleEdit(goal)}
                        className="p-1 rounded-lg text-textMuted hover:text-blue-400 transition-colors"
                        title="Edit Goal"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => setDeleteModal({
                          isOpen: true,
                          id: goal._id || goal.id,
                          title: goal.title
                        })}
                        className="p-1 rounded-lg text-textMuted hover:text-red-400 transition-colors"
                        title="Delete Goal"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Measurable Trajectory Numbers */}
                  <div className="flex justify-between items-baseline mb-2">
                    <span className="text-xs text-textMuted">
                      Current: <strong className="text-textMain">{goal.currentValue || 0} {goal.unitName || ''}</strong>
                    </span>
                    <span className="text-xs text-textMuted">
                      Target: <strong className="text-primary">{goal.targetValue || 100} {goal.unitName || ''}</strong>
                    </span>
                    <span className={`text-base font-bold ${goal.isCompleted ? 'text-green-400' : 'text-primary'}`}>
                      {progressVal}%
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-surface border border-glass rounded-full h-3 mb-4 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progressVal}%` }}
                      transition={{ duration: 0.6 }}
                      className={`h-full ${goal.isCompleted ? 'bg-green-400 shadow-neon-primary-sm' : 'bg-primary'}`}
                    />
                  </div>

                  {/* Milestones Checkpoints */}
                  {milestones.length > 0 && (
                    <div className="mb-4 bg-surface/40 p-3 rounded-xl border border-glass space-y-1.5">
                      <p className="text-[11px] uppercase tracking-wider text-textMuted font-semibold mb-1">
                        Key Milestones ({milestones.filter((m: any) => m.done).length}/{milestones.length})
                      </p>
                      {milestones.map((m: any) => (
                        <button
                          key={m.id}
                          onClick={() => toggleMilestone(goal, m.id)}
                          className="flex items-center gap-2 text-left w-full text-xs hover:text-textMain text-textMuted transition-colors"
                        >
                          <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                            m.done ? 'bg-primary border-primary text-background' : 'border-glass'
                          }`}>
                            {m.done && <Check size={11} />}
                          </span>
                          <span className={m.done ? 'line-through text-textMuted' : 'text-textMain'}>
                            {m.title}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {goal.notes && (
                    <p className="text-xs text-textMuted italic mb-3">"{goal.notes}"</p>
                  )}
                </div>

                {/* Bottom Actions */}
                <div className="pt-3 border-t border-glass flex gap-2">
                  <button
                    onClick={() => {
                      setActiveGoal(goal);
                      setProgressInput('');
                      setShowProgressModal(true);
                    }}
                    className="flex-1 py-2 bg-primary/20 text-primary border border-primary/30 rounded-xl hover:bg-primary/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Plus size={14} /> Contribute / Advance Progress
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Set / Edit Goal Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="glass-panel p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <h2 className="text-xl font-bold mb-4 text-textMain">{editId ? 'Edit Goal Target' : 'Set New Measurable Goal'}</h2>
              <form onSubmit={handleSaveGoal} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-textMuted mb-1 block">Goal Title *</label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. Emergency Fund ₹5,00,000"
                      value={formData.title}
                      onChange={e => setFormData({ ...formData, title: e.target.value })}
                      className="w-full bg-background border border-glass rounded-lg px-3 py-2 text-sm text-textMain focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-textMuted mb-1 block">Category *</label>
                    <select
                      value={formData.category}
                      onChange={e => setFormData({ ...formData, category: e.target.value })}
                      className="w-full bg-background border border-glass rounded-lg px-3 py-2 text-sm text-textMain"
                    >
                      {GOAL_CATEGORIES.map(c => (
                        <option key={c.id} value={c.id}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-textMuted mb-1 block">Measurement Type</label>
                    <select
                      value={formData.unitType}
                      onChange={e => {
                        const ut = e.target.value;
                        setFormData({
                          ...formData,
                          unitType: ut,
                          unitName: ut === 'Currency' ? '₹' : ut === 'Percentage' ? '%' : 'Units'
                        });
                      }}
                      className="w-full bg-background border border-glass rounded-lg px-3 py-2 text-sm text-textMain"
                    >
                      <option value="Currency">Currency (₹)</option>
                      <option value="Numeric">Numeric Count</option>
                      <option value="Percentage">Percentage (%)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-textMuted mb-1 block">Target Value *</label>
                    <input
                      required
                      type="number"
                      placeholder="100000"
                      value={formData.targetValue}
                      onChange={e => setFormData({ ...formData, targetValue: e.target.value })}
                      className="w-full bg-background border border-glass rounded-lg px-3 py-2 text-sm text-textMain"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-textMuted mb-1 block">Current Saved / Achieved</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={formData.currentValue}
                      onChange={e => setFormData({ ...formData, currentValue: e.target.value })}
                      className="w-full bg-background border border-glass rounded-lg px-3 py-2 text-sm text-textMain"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-textMuted mb-1 block">Target Deadline Date *</label>
                  <input
                    required
                    type="date"
                    value={formData.targetDate}
                    onChange={e => setFormData({ ...formData, targetDate: e.target.value })}
                    className="w-full bg-background border border-glass rounded-lg px-3 py-2 text-sm text-textMain"
                  />
                </div>

                {/* Milestones Builder */}
                <div className="space-y-2 pt-2 border-t border-glass">
                  <label className="text-xs font-semibold text-textMain block">Key Milestones (Checkpoints)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. Save first ₹1,00,000 / Finish Module 1"
                      value={newMilestoneTitle}
                      onChange={e => setNewMilestoneTitle(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddMilestoneToForm(); } }}
                      className="flex-1 bg-background border border-glass rounded-lg px-3 py-1.5 text-xs text-textMain"
                    />
                    <button
                      type="button"
                      onClick={handleAddMilestoneToForm}
                      className="px-3 py-1.5 bg-surface border border-glass text-textMain rounded-lg text-xs font-semibold hover:bg-surfaceLight"
                    >
                      Add
                    </button>
                  </div>

                  {formData.milestones.length > 0 && (
                    <div className="space-y-1 pt-1">
                      {formData.milestones.map(m => (
                        <div key={m.id} className="flex items-center justify-between bg-surface/50 p-2 rounded-lg text-xs">
                          <span className="text-textMain">{m.title}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveMilestoneFromForm(m.id)}
                            className="text-textMuted hover:text-red-400"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-xs text-textMuted mb-1 block">Notes & Motivation</label>
                  <textarea
                    rows={2}
                    placeholder="Why this goal matters..."
                    value={formData.notes}
                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full bg-background border border-glass rounded-lg px-3 py-2 text-sm text-textMain"
                  />
                </div>

                <div className="flex justify-end gap-3 mt-6 pt-3 border-t border-glass">
                  <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-textMuted hover:text-textMain">Cancel</button>
                  <button type="submit" className="px-5 py-2 bg-primary text-background rounded-lg font-bold text-sm shadow-neon-primary-sm hover:opacity-95">
                    {editId ? 'Update Goal' : 'Save Goal'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Advance Progress Modal */}
      <AnimatePresence>
        {showProgressModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowProgressModal(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="glass-panel p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
              <h2 className="text-lg font-bold mb-3 text-textMain">Contribute to: {activeGoal?.title}</h2>
              <form onSubmit={handleAdvanceProgress} className="space-y-4">
                <div>
                  <label className="text-xs text-textMuted mb-1 block">
                    Add Progress Amount ({activeGoal?.unitName || 'Units'})
                  </label>
                  <input
                    required
                    type="number"
                    step="any"
                    placeholder="e.g. 5000"
                    value={progressInput}
                    onChange={e => setProgressInput(e.target.value)}
                    className="w-full bg-background border border-glass rounded-lg px-3 py-2 text-sm text-textMain focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="text-xs text-textMuted">
                  Current: <strong className="text-textMain">{activeGoal?.currentValue || 0}</strong> / Target: <strong className="text-primary">{activeGoal?.targetValue}</strong> {activeGoal?.unitName}
                </div>
                <div className="flex justify-end gap-2 pt-3 border-t border-glass">
                  <button type="button" onClick={() => setShowProgressModal(false)} className="px-3 py-1.5 text-xs text-textMuted">Cancel</button>
                  <button type="submit" className="px-4 py-1.5 bg-primary text-background font-bold text-xs rounded-lg shadow-neon-primary-sm">
                    Record Progress
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
        title="Delete Goal"
        message={`Are you sure you want to permanently delete "${deleteModal.title}" and all associated milestones?`}
        confirmText="Delete Goal"
        isDestructive={true}
        onConfirm={confirmDeleteAction}
        onCancel={() => setDeleteModal({ isOpen: false, id: '', title: '' })}
      />
    </div>
  );
}
