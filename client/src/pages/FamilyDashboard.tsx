import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, MessageSquare, Megaphone, Trash2, Edit2, Plus, 
  Calendar, CheckSquare, IndianRupee, Heart, AlertCircle, Clock, 
  Search, Download, Check, ShieldCheck, UserCheck, Star
} from 'lucide-react';
import { useContextEngineStore } from '../store/useContextEngineStore';
import { FamilyService, getActiveUserId } from '../services/firestoreService';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { EmptyState } from '../components/common/EmptyState';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { exportToCSV } from '../utils/csvExport';
import { formatIsoDate, getTodayIso } from '../utils/dateUtils';
import { MobilePageHeader } from '../components/common/MobilePageHeader';

export default function FamilyDashboard() {
  const { user } = useContextEngineStore();
  const activeUid = getActiveUserId(user?.id);

  // Subsections / Tabs
  const [activeTab, setActiveTab] = useState<'board' | 'members' | 'chores' | 'events' | 'expenses'>('board');

  // Collections
  const [posts, setPosts] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [chores, setChores] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals & Edit IDs
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [showChoreModal, setShowChoreModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [editPostId, setEditPostId] = useState<string | null>(null);
  const [editMemberId, setEditMemberId] = useState<string | null>(null);
  const [editChoreId, setEditChoreId] = useState<string | null>(null);
  const [editEventId, setEditEventId] = useState<string | null>(null);
  const [editExpenseId, setEditExpenseId] = useState<string | null>(null);

  // Confirm delete modal
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    type: 'post' | 'member' | 'chore' | 'event' | 'expense';
    id: string;
    title: string;
  }>({ isOpen: false, type: 'post', id: '', title: '' });

  // Form states
  const [postForm, setPostForm] = useState({
    message: '',
    type: 'Announcement',
    author: 'Head of House'
  });

  const [memberForm, setMemberForm] = useState({
    name: '',
    relation: 'Spouse',
    phone: '',
    email: '',
    bloodGroup: 'O+',
    dateOfBirth: ''
  });

  const [choreForm, setChoreForm] = useState({
    title: '',
    assignedTo: 'Anyone',
    dueDate: getTodayIso(),
    isCompleted: false
  });

  const [eventForm, setEventForm] = useState({
    title: '',
    type: 'Birthday',
    date: getTodayIso(),
    person: ''
  });

  const [expenseForm, setExpenseForm] = useState({
    description: '',
    amount: '',
    paidBy: 'Head of House',
    category: 'Groceries',
    date: getTodayIso()
  });

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [postList, memberList, choreList, eventList, expenseList] = await Promise.all([
        FamilyService.getPosts(activeUid),
        FamilyService.getMembers(activeUid),
        FamilyService.getChores(activeUid),
        FamilyService.getFamilyEvents(activeUid),
        FamilyService.getSharedExpenses(activeUid)
      ]);
      setPosts(postList);
      setMembers(memberList);
      setChores(choreList);
      setEvents(eventList);
      setExpenses(expenseList);
    } catch (e) {
      console.error('Error fetching family data:', e);
    } finally {
      setLoading(false);
    }
  };

  // Broadcast Post CRUD
  const handleSavePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postForm.message.trim()) return;
    try {
      if (editPostId) {
        await FamilyService.updatePost(editPostId, postForm);
      } else {
        await FamilyService.addPost(activeUid, postForm);
      }
      setPostForm({ message: '', type: 'Announcement', author: 'Head of House' });
      setEditPostId(null);
      fetchData();
    } catch (e) {
      console.error('Error saving post:', e);
    }
  };

  // Member CRUD
  const handleEditMember = (member: any) => {
    setMemberForm({
      name: member.name || '',
      relation: member.relation || 'Spouse',
      phone: member.phone || '',
      email: member.email || '',
      bloodGroup: member.bloodGroup || 'O+',
      dateOfBirth: formatIsoDate(member.dateOfBirth)
    });
    setEditMemberId(member._id || member.id);
    setShowMemberModal(true);
  };

  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberForm.name.trim()) return;
    try {
      if (editMemberId) {
        await FamilyService.updateMember(editMemberId, memberForm);
      } else {
        await FamilyService.addMember(activeUid, memberForm);
      }
      setShowMemberModal(false);
      setEditMemberId(null);
      setMemberForm({ name: '', relation: 'Spouse', phone: '', email: '', bloodGroup: 'O+', dateOfBirth: '' });
      fetchData();
    } catch (e) {
      console.error('Error saving member:', e);
    }
  };

  // Chore CRUD
  const handleEditChore = (chore: any) => {
    setChoreForm({
      title: chore.title || '',
      assignedTo: chore.assignedTo || 'Anyone',
      dueDate: formatIsoDate(chore.dueDate) || getTodayIso(),
      isCompleted: Boolean(chore.isCompleted)
    });
    setEditChoreId(chore._id || chore.id);
    setShowChoreModal(true);
  };

  const handleSaveChore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!choreForm.title.trim()) return;
    try {
      if (editChoreId) {
        await FamilyService.updateChore(editChoreId, choreForm);
      } else {
        await FamilyService.addChore(activeUid, choreForm);
      }
      setShowChoreModal(false);
      setEditChoreId(null);
      setChoreForm({ title: '', assignedTo: 'Anyone', dueDate: getTodayIso(), isCompleted: false });
      fetchData();
    } catch (e) {
      console.error('Error saving chore:', e);
    }
  };

  const toggleChore = async (chore: any) => {
    try {
      await FamilyService.updateChore(chore._id || chore.id, {
        isCompleted: !chore.isCompleted
      });
      fetchData();
    } catch (e) {
      console.error('Error updating chore:', e);
    }
  };

  // Event CRUD
  const handleEditEvent = (ev: any) => {
    setEventForm({
      title: ev.title || '',
      type: ev.type || 'Birthday',
      date: formatIsoDate(ev.date) || getTodayIso(),
      person: ev.person || ''
    });
    setEditEventId(ev._id || ev.id);
    setShowEventModal(true);
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventForm.title.trim()) return;
    try {
      if (editEventId) {
        await FamilyService.updateFamilyEvent(editEventId, eventForm);
      } else {
        await FamilyService.addFamilyEvent(activeUid, eventForm);
      }
      setShowEventModal(false);
      setEditEventId(null);
      setEventForm({ title: '', type: 'Birthday', date: getTodayIso(), person: '' });
      fetchData();
    } catch (e) {
      console.error('Error saving event:', e);
    }
  };

  // Expense CRUD
  const handleEditExpense = (exp: any) => {
    setExpenseForm({
      description: exp.description || '',
      amount: String(exp.amount || ''),
      paidBy: exp.paidBy || 'Head of House',
      category: exp.category || 'Groceries',
      date: formatIsoDate(exp.date) || getTodayIso()
    });
    setEditExpenseId(exp._id || exp.id);
    setShowExpenseModal(true);
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseForm.description.trim()) return;
    try {
      const payload = {
        ...expenseForm,
        amount: Number(expenseForm.amount) || 0
      };
      if (editExpenseId) {
        await FamilyService.updateSharedExpense(editExpenseId, payload);
      } else {
        await FamilyService.addSharedExpense(activeUid, payload);
      }
      setShowExpenseModal(false);
      setEditExpenseId(null);
      setExpenseForm({ description: '', amount: '', paidBy: 'Head of House', category: 'Groceries', date: getTodayIso() });
      fetchData();
    } catch (e) {
      console.error('Error saving expense:', e);
    }
  };

  // Generic Deletion
  const confirmDeleteAction = async () => {
    try {
      if (deleteModal.type === 'post') await FamilyService.deletePost(deleteModal.id);
      else if (deleteModal.type === 'member') await FamilyService.deleteMember(deleteModal.id);
      else if (deleteModal.type === 'chore') await FamilyService.deleteChore(deleteModal.id);
      else if (deleteModal.type === 'event') await FamilyService.deleteFamilyEvent(deleteModal.id);
      else if (deleteModal.type === 'expense') await FamilyService.deleteSharedExpense(deleteModal.id);
      setDeleteModal({ isOpen: false, type: 'post', id: '', title: '' });
      fetchData();
    } catch (e) {
      console.error('Error deleting record:', e);
    }
  };

  // Calculations
  const totalSharedSpend = expenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
  const pendingChores = chores.filter(c => !c.isCompleted);

  // CSV Export
  const handleExportCSV = () => {
    if (activeTab === 'expenses') {
      const data = expenses.map(e => ({
        Description: e.description,
        Amount: e.amount,
        'Paid By': e.paidBy,
        Category: e.category,
        Date: e.date ? new Date(e.date).toLocaleDateString() : ''
      }));
      exportToCSV(data, 'vynora_family_expenses.csv');
    } else {
      const data = members.map(m => ({
        Name: m.name,
        Relation: m.relation,
        Phone: m.phone || '',
        Email: m.email || '',
        'Blood Group': m.bloodGroup || '',
        DOB: m.dateOfBirth || ''
      }));
      exportToCSV(data, 'vynora_family_roster.csv');
    }
  };

  if (loading) {
    return <LoadingSpinner message="Syncing Family Dashboard & Members..." />;
  }

  return (
    <div className="space-y-6">
      <MobilePageHeader
        title="Family Dashboard"
        parentLabel="Dashboard"
        fallbackPath="/"
        subtitle="Shared announcements, family chore assignments, important dates, and household expense splits."
        badges={[
          { label: `${members.length} Members`, variant: 'info' },
          { label: `${pendingChores.length} Chores`, variant: pendingChores.length > 0 ? 'warning' : 'success' },
          { label: `₹${totalSharedSpend.toLocaleString()}`, variant: 'default' }
        ]}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="min-h-[44px] bg-surface border border-glass px-3.5 py-2 rounded-xl text-textMuted hover:text-textMain flex items-center gap-1.5 text-xs sm:text-sm transition-colors touch-target"
            >
              <Download size={15} /> <span className="hidden sm:inline">Export</span> CSV
            </button>
            <button
              onClick={() => {
                setEditMemberId(null);
                setMemberForm({ name: '', relation: 'Spouse', phone: '', email: '', bloodGroup: 'O+', dateOfBirth: '' });
                setShowMemberModal(true);
              }}
              className="min-h-[44px] bg-primary text-background px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-primary/90 transition-colors shadow-neon-primary-sm font-bold text-xs sm:text-sm touch-target"
            >
              <Plus size={16} /> <span>Add Member</span>
            </button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="glass-panel p-4 border-l-4 border-l-primary flex justify-between items-center">
          <div>
            <p className="text-xs text-textMuted">Family Members</p>
            <h3 className="text-2xl font-bold text-textMain">{members.length}</h3>
          </div>
          <Users className="text-primary/70" size={24} />
        </div>
        <div className="glass-panel p-4 border-l-4 border-l-amber-400 flex justify-between items-center">
          <div>
            <p className="text-xs text-textMuted">Pending Chores</p>
            <h3 className="text-2xl font-bold text-amber-400">{pendingChores.length}</h3>
          </div>
          <CheckSquare className="text-amber-400/70" size={24} />
        </div>
        <div className="glass-panel p-4 border-l-4 border-l-blue-400 flex justify-between items-center">
          <div>
            <p className="text-xs text-textMuted">Important Dates</p>
            <h3 className="text-2xl font-bold text-blue-400">{events.length}</h3>
          </div>
          <Calendar className="text-blue-400/70" size={24} />
        </div>
        <div className="glass-panel p-4 border-l-4 border-l-green-500 flex justify-between items-center">
          <div>
            <p className="text-xs text-textMuted">Household Spend</p>
            <h3 className="text-2xl font-bold text-green-400">₹{totalSharedSpend.toLocaleString()}</h3>
          </div>
          <IndianRupee className="text-green-500/70" size={24} />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-glass gap-2 overflow-x-auto pb-1 scrollbar-none">
        {[
          { key: 'board', label: `Notice Board (${posts.length})`, icon: Megaphone },
          { key: 'members', label: `Family Roster (${members.length})`, icon: Users },
          { key: 'chores', label: `Chores & Tasks (${chores.length})`, icon: CheckSquare },
          { key: 'events', label: `Family Calendar (${events.length})`, icon: Calendar },
          { key: 'expenses', label: `Household Expenses (${expenses.length})`, icon: IndianRupee }
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-4 py-2.5 rounded-t-xl text-xs font-semibold flex items-center gap-2 whitespace-nowrap transition-all border-b-2 ${
                activeTab === tab.key
                  ? 'border-primary text-primary bg-primary/10 shadow-neon-primary-sm'
                  : 'border-transparent text-textMuted hover:text-textMain hover:bg-surface/50'
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: Notice Board */}
      {activeTab === 'board' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Post composer */}
          <div className="lg:col-span-5 glass-panel p-6">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-textMain">
              <Megaphone size={18} className="text-primary" /> {editPostId ? 'Edit Broadcast' : 'Broadcast to Family'}
            </h2>
            <form onSubmit={handleSavePost} className="space-y-4">
              <div>
                <label className="text-xs text-textMuted mb-1 block">Message *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Share groceries list, arrival time, emergency notice..."
                  value={postForm.message}
                  onChange={e => setPostForm({ ...postForm, message: e.target.value })}
                  className="w-full bg-background border border-glass rounded-lg px-3 py-2 text-sm text-textMain resize-none focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-textMuted mb-1 block">Notice Type</label>
                  <select
                    value={postForm.type}
                    onChange={e => setPostForm({ ...postForm, type: e.target.value })}
                    className="w-full bg-background border border-glass rounded-lg px-3 py-2 text-xs text-textMain"
                  >
                    <option value="Announcement">Announcement</option>
                    <option value="Urgent">Urgent Notice</option>
                    <option value="Chore Reminder">Chore Reminder</option>
                    <option value="Celebration">Celebration / Wish</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-textMuted mb-1 block">Author</label>
                  <select
                    value={postForm.author}
                    onChange={e => setPostForm({ ...postForm, author: e.target.value })}
                    className="w-full bg-background border border-glass rounded-lg px-3 py-2 text-xs text-textMain"
                  >
                    <option value="Head of House">Head of House</option>
                    {members.map(m => (
                      <option key={m._id || m.id} value={m.name}>{m.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-glass">
                {editPostId && (
                  <button
                    type="button"
                    onClick={() => { setEditPostId(null); setPostForm({ message: '', type: 'Announcement', author: 'Head of House' }); }}
                    className="px-3 py-1.5 text-xs text-textMuted hover:text-textMain"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  className="px-5 py-2 bg-primary text-background rounded-lg font-bold text-xs shadow-neon-primary-sm hover:opacity-95 flex items-center gap-1.5"
                >
                  <MessageSquare size={14} /> {editPostId ? 'Update Notice' : 'Post Notice'}
                </button>
              </div>
            </form>
          </div>

          {/* Posts Feed */}
          <div className="lg:col-span-7 space-y-3">
            {posts.length === 0 ? (
              <EmptyState
                icon={Megaphone}
                title="No announcements yet"
                description="Use the broadcast board to share household notices, daily reminders, or celebrations."
              />
            ) : (
              posts.map(post => {
                const isUrgent = post.type === 'Urgent';
                return (
                  <motion.div
                    key={post._id || post.id}
                    layoutId={post._id || post.id}
                    className={`glass-panel p-5 border-l-4 ${isUrgent ? 'border-l-red-500 bg-red-500/5' : 'border-l-primary'}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          isUrgent ? 'bg-red-500/20 text-red-400' : 'bg-primary/20 text-primary'
                        }`}>
                          {post.type}
                        </span>
                        <span className="text-xs font-semibold text-textMain">• {post.author}</span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setPostForm({
                              message: post.message,
                              type: post.type || 'Announcement',
                              author: post.author || 'Head of House'
                            });
                            setEditPostId(post._id || post.id);
                          }}
                          className="p-1 rounded text-textMuted hover:text-blue-400"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => setDeleteModal({
                            isOpen: true,
                            type: 'post',
                            id: post._id || post.id,
                            title: 'Family Announcement'
                          })}
                          className="p-1 rounded text-textMuted hover:text-red-400"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    <p className="text-sm text-textMain leading-relaxed">{post.message}</p>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Family Roster */}
      {activeTab === 'members' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-textMain flex items-center gap-2">
              <Users size={20} className="text-primary" /> Household Members ({members.length})
            </h2>
            <button
              onClick={() => {
                setEditMemberId(null);
                setMemberForm({ name: '', relation: 'Spouse', phone: '', email: '', bloodGroup: 'O+', dateOfBirth: '' });
                setShowMemberModal(true);
              }}
              className="bg-primary text-background px-3 py-1.5 rounded-lg text-xs font-bold shadow-neon-primary-sm hover:opacity-95 flex items-center gap-1"
            >
              <Plus size={14} /> Add Member
            </button>
          </div>

          {members.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No family members added"
              description="Add your spouse, children, parents, and siblings to assign chores and share calendars."
              actionText="Add Family Member"
              onAction={() => {
                setEditMemberId(null);
                setMemberForm({ name: '', relation: 'Spouse', phone: '', email: '', bloodGroup: 'O+', dateOfBirth: '' });
                setShowMemberModal(true);
              }}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {members.map(member => (
                <div key={member._id || member.id} className="glass-panel p-5 flex flex-col justify-between">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg text-white border shadow-md"
                        style={{ backgroundColor: member.avatarColor + '40', borderColor: member.avatarColor + '80', color: member.avatarColor }}
                      >
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-textMain">{member.name}</h3>
                        <p className="text-xs text-textMuted">{member.relation}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleEditMember(member)}
                        className="p-1 rounded text-textMuted hover:text-primary transition-colors"
                        title="Edit Member"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => setDeleteModal({
                          isOpen: true,
                          type: 'member',
                          id: member._id || member.id,
                          title: member.name
                        })}
                        className="p-1 rounded text-textMuted hover:text-red-400 transition-colors"
                        title="Delete Member"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="bg-surface/50 p-3 rounded-xl border border-glass space-y-1.5 text-xs text-textMuted">
                    {member.phone && <div className="flex justify-between"><span>Phone:</span><span className="text-textMain">{member.phone}</span></div>}
                    {member.email && <div className="flex justify-between"><span>Email:</span><span className="text-textMain">{member.email}</span></div>}
                    {member.bloodGroup && <div className="flex justify-between"><span>Blood Group:</span><span className="text-red-400 font-semibold">{member.bloodGroup}</span></div>}
                    {member.dateOfBirth && <div className="flex justify-between"><span>Birthday:</span><span className="text-textMain">{formatIsoDate(member.dateOfBirth)}</span></div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Chores & Tasks */}
      {activeTab === 'chores' && (
        <div className="glass-panel p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-textMain flex items-center gap-2">
              <CheckSquare size={20} className="text-amber-400" /> Household Chores
            </h2>
            <button
              onClick={() => {
                setEditChoreId(null);
                setChoreForm({ title: '', assignedTo: 'Anyone', dueDate: getTodayIso(), isCompleted: false });
                setShowChoreModal(true);
              }}
              className="bg-amber-500/20 text-amber-400 border border-amber-500/30 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 hover:bg-amber-500/30"
            >
              <Plus size={14} /> Assign Chore
            </button>
          </div>

          {chores.length === 0 ? (
            <EmptyState
              icon={CheckSquare}
              title="No chores assigned yet"
              description="Keep the house organized by assigning chores to family members with due dates."
              actionText="Assign First Chore"
              onAction={() => {
                setEditChoreId(null);
                setChoreForm({ title: '', assignedTo: 'Anyone', dueDate: getTodayIso(), isCompleted: false });
                setShowChoreModal(true);
              }}
            />
          ) : (
            <div className="space-y-2">
              {chores.map(chore => (
                <div
                  key={chore._id || chore.id}
                  className={`p-3 rounded-xl border transition-all flex items-center justify-between ${
                    chore.isCompleted
                      ? 'bg-surface/30 border-glass/40 text-textMuted'
                      : 'bg-surface/70 border-glass text-textMain'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggleChore(chore)}
                      className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                        chore.isCompleted
                          ? 'bg-green-500 border-green-500 text-background'
                          : 'border-glass hover:border-amber-400'
                      }`}
                    >
                      {chore.isCompleted && <Check size={14} />}
                    </button>
                    <div>
                      <h4 className={`text-sm font-semibold ${chore.isCompleted ? 'line-through text-textMuted' : 'text-textMain'}`}>
                        {chore.title}
                      </h4>
                      <p className="text-[11px] text-textMuted">
                        Assigned to: <strong className="text-primary">{chore.assignedTo || 'Anyone'}</strong> • Due: {formatIsoDate(chore.dueDate) || 'No date'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleEditChore(chore)}
                      className="p-1 rounded text-textMuted hover:text-primary transition-colors"
                      title="Edit Chore"
                    >
                      <Edit2 size={15} />
                    </button>
                    <button
                      onClick={() => setDeleteModal({
                        isOpen: true,
                        type: 'chore',
                        id: chore._id || chore.id,
                        title: chore.title
                      })}
                      className="text-textMuted hover:text-red-400 p-1 transition-colors"
                      title="Delete Chore"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: Events Calendar */}
      {activeTab === 'events' && (
        <div className="glass-panel p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-textMain flex items-center gap-2">
              <Calendar size={20} className="text-blue-400" /> Important Family Dates & Events
            </h2>
            <button
              onClick={() => {
                setEditEventId(null);
                setEventForm({ title: '', type: 'Birthday', date: getTodayIso(), person: '' });
                setShowEventModal(true);
              }}
              className="bg-blue-500/20 text-blue-400 border border-blue-500/30 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 hover:bg-blue-500/30"
            >
              <Plus size={14} /> Add Event
            </button>
          </div>

          {events.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title="No family dates saved"
              description="Never forget birthdays, wedding anniversaries, parent doctor checkups, or festival plans."
              actionText="Add Family Event"
              onAction={() => {
                setEditEventId(null);
                setEventForm({ title: '', type: 'Birthday', date: getTodayIso(), person: '' });
                setShowEventModal(true);
              }}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {events.map(ev => {
                const safeIso = formatIsoDate(ev.date);
                const eventDate = safeIso ? new Date(safeIso) : null;
                const diffDays = eventDate ? Math.ceil((eventDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;

                return (
                  <div key={ev._id || ev.id} className="glass-panel p-5 border-l-4 border-l-blue-400 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-400">
                          {ev.type}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleEditEvent(ev)}
                            className="p-1 rounded text-textMuted hover:text-primary transition-colors"
                            title="Edit Event"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            onClick={() => setDeleteModal({
                              isOpen: true,
                              type: 'event',
                              id: ev._id || ev.id,
                              title: ev.title
                            })}
                            className="p-1 rounded text-textMuted hover:text-red-400 transition-colors"
                            title="Delete Event"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>

                      <h3 className="text-base font-bold text-textMain mb-1">{ev.title}</h3>
                      {ev.person && <p className="text-xs text-textMuted mb-2">For: {ev.person}</p>}

                      <div className="flex justify-between items-center text-xs pt-2 border-t border-glass">
                        <span className="text-textMuted">{safeIso || 'No date'}</span>
                        <span className="font-bold text-blue-400">
                          {diffDays === null ? '' : diffDays === 0 ? 'Today!' : diffDays > 0 ? `In ${diffDays} days` : 'Past date'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: Household Expenses */}
      {activeTab === 'expenses' && (
        <div className="glass-panel p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-lg font-bold text-textMain flex items-center gap-2">
                <IndianRupee size={20} className="text-green-400" /> Shared Household Expenses
              </h2>
              <p className="text-xs text-textMuted mt-1">Total recorded spend: ₹{totalSharedSpend.toLocaleString()}</p>
            </div>
            <button
              onClick={() => {
                setEditExpenseId(null);
                setExpenseForm({ description: '', amount: '', paidBy: 'Head of House', category: 'Groceries', date: getTodayIso() });
                setShowExpenseModal(true);
              }}
              className="bg-green-500/20 text-green-400 border border-green-500/30 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 hover:bg-green-500/30"
            >
              <Plus size={14} /> Log Shared Expense
            </button>
          </div>

          {expenses.length === 0 ? (
            <EmptyState
              icon={IndianRupee}
              title="No shared expenses logged"
              description="Track common groceries, internet bills, domestic help salary, and maintenance splits."
              actionText="Log First Expense"
              onAction={() => {
                setEditExpenseId(null);
                setExpenseForm({ description: '', amount: '', paidBy: 'Head of House', category: 'Groceries', date: getTodayIso() });
                setShowExpenseModal(true);
              }}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse whitespace-nowrap text-sm">
                <thead>
                  <tr className="text-textMuted text-xs uppercase tracking-wider border-b border-glass">
                    <th className="pb-3 px-4 font-semibold">Date</th>
                    <th className="pb-3 px-4 font-semibold">Description</th>
                    <th className="pb-3 px-4 font-semibold">Category</th>
                    <th className="pb-3 px-4 font-semibold">Paid By</th>
                    <th className="pb-3 px-4 font-semibold text-right">Amount (₹)</th>
                    <th className="pb-3 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map(exp => (
                    <tr key={exp._id || exp.id} className="border-b border-glass/40 hover:bg-surface/50 transition-colors">
                      <td className="py-3 px-4">{formatIsoDate(exp.date)}</td>
                      <td className="py-3 px-4 font-medium text-textMain">{exp.description}</td>
                      <td className="py-3 px-4 text-xs text-textMuted">{exp.category}</td>
                      <td className="py-3 px-4 text-xs font-semibold text-primary">{exp.paidBy}</td>
                      <td className="py-3 px-4 text-right font-bold text-green-400">₹{(Number(exp.amount) || 0).toLocaleString()}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleEditExpense(exp)}
                            className="p-1 rounded text-textMuted hover:text-primary transition-colors"
                            title="Edit Expense"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            onClick={() => setDeleteModal({
                              isOpen: true,
                              type: 'expense',
                              id: exp._id || exp.id,
                              title: exp.description
                            })}
                            className="p-1 rounded text-textMuted hover:text-red-400 transition-colors"
                            title="Delete Expense"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: Add Family Member */}
      <AnimatePresence>
        {showMemberModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowMemberModal(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="glass-panel p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
              <h2 className="text-xl font-bold mb-4 text-textMain">{editMemberId ? 'Edit Family Member' : 'Add Family Member'}</h2>
              <form onSubmit={handleSaveMember} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-textMuted mb-1 block">Full Name *</label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. Priya Sharma"
                      value={memberForm.name}
                      onChange={e => setMemberForm({ ...memberForm, name: e.target.value })}
                      className="w-full bg-background border border-glass rounded-lg px-3 py-2 text-sm text-textMain"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-textMuted mb-1 block">Relation *</label>
                    <select
                      value={memberForm.relation}
                      onChange={e => setMemberForm({ ...memberForm, relation: e.target.value })}
                      className="w-full bg-background border border-glass rounded-lg px-3 py-2 text-sm text-textMain"
                    >
                      <option value="Spouse">Spouse</option>
                      <option value="Son">Son</option>
                      <option value="Daughter">Daughter</option>
                      <option value="Father">Father</option>
                      <option value="Mother">Mother</option>
                      <option value="Brother">Brother</option>
                      <option value="Sister">Sister</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-textMuted mb-1 block">Phone</label>
                    <input
                      type="tel"
                      placeholder="Phone #"
                      value={memberForm.phone}
                      onChange={e => setMemberForm({ ...memberForm, phone: e.target.value })}
                      className="w-full bg-background border border-glass rounded-lg px-3 py-2 text-sm text-textMain"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-textMuted mb-1 block">Blood Group</label>
                    <select
                      value={memberForm.bloodGroup}
                      onChange={e => setMemberForm({ ...memberForm, bloodGroup: e.target.value })}
                      className="w-full bg-background border border-glass rounded-lg px-3 py-2 text-sm text-textMain"
                    >
                      <option value="A+">A+</option><option value="A-">A-</option>
                      <option value="B+">B+</option><option value="B-">B-</option>
                      <option value="O+">O+</option><option value="O-">O-</option>
                      <option value="AB+">AB+</option><option value="AB-">AB-</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-textMuted mb-1 block">Date of Birth</label>
                  <input
                    type="date"
                    value={memberForm.dateOfBirth}
                    onChange={e => setMemberForm({ ...memberForm, dateOfBirth: e.target.value })}
                    className="w-full bg-background border border-glass rounded-lg px-3 py-2 text-sm text-textMain"
                  />
                </div>

                <div className="flex justify-end gap-3 mt-6 pt-3 border-t border-glass">
                  <button type="button" onClick={() => setShowMemberModal(false)} className="px-4 py-2 text-sm text-textMuted hover:text-textMain">Cancel</button>
                  <button type="submit" className="px-5 py-2 bg-primary text-background rounded-lg font-bold text-sm shadow-neon-primary-sm hover:opacity-95">
                    {editMemberId ? 'Update Member' : 'Save Member'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: Add Chore */}
      <AnimatePresence>
        {showChoreModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowChoreModal(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="glass-panel p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
              <h2 className="text-xl font-bold mb-4 text-textMain">{editChoreId ? 'Edit Family Chore' : 'Assign Family Chore'}</h2>
              <form onSubmit={handleSaveChore} className="space-y-4">
                <div>
                  <label className="text-xs text-textMuted mb-1 block">Chore Task *</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. Buy milk, water garden, pay electricity bill"
                    value={choreForm.title}
                    onChange={e => setChoreForm({ ...choreForm, title: e.target.value })}
                    className="w-full bg-background border border-glass rounded-lg px-3 py-2 text-sm text-textMain"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-textMuted mb-1 block">Assign To</label>
                    <select
                      value={choreForm.assignedTo}
                      onChange={e => setChoreForm({ ...choreForm, assignedTo: e.target.value })}
                      className="w-full bg-background border border-glass rounded-lg px-3 py-2 text-sm text-textMain"
                    >
                      <option value="Anyone">Anyone</option>
                      {members.map(m => (
                        <option key={m._id || m.id} value={m.name}>{m.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-textMuted mb-1 block">Due Date</label>
                    <input
                      type="date"
                      value={choreForm.dueDate}
                      onChange={e => setChoreForm({ ...choreForm, dueDate: e.target.value })}
                      className="w-full bg-background border border-glass rounded-lg px-3 py-2 text-sm text-textMain"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6 pt-3 border-t border-glass">
                  <button type="button" onClick={() => setShowChoreModal(false)} className="px-4 py-2 text-sm text-textMuted hover:text-textMain">Cancel</button>
                  <button type="submit" className="px-5 py-2 bg-amber-500 text-white rounded-lg font-bold text-sm shadow-md hover:bg-amber-600">
                    {editChoreId ? 'Update Chore' : 'Assign Chore'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 3: Add Event */}
      <AnimatePresence>
        {showEventModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowEventModal(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="glass-panel p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
              <h2 className="text-xl font-bold mb-4 text-textMain">{editEventId ? 'Edit Family Event / Date' : 'Add Family Event / Date'}</h2>
              <form onSubmit={handleSaveEvent} className="space-y-4">
                <div>
                  <label className="text-xs text-textMuted mb-1 block">Event Title *</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. Wedding Anniversary / Mom's Birthday"
                    value={eventForm.title}
                    onChange={e => setEventForm({ ...eventForm, title: e.target.value })}
                    className="w-full bg-background border border-glass rounded-lg px-3 py-2 text-sm text-textMain"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-textMuted mb-1 block">Event Type</label>
                    <select
                      value={eventForm.type}
                      onChange={e => setEventForm({ ...eventForm, type: e.target.value })}
                      className="w-full bg-background border border-glass rounded-lg px-3 py-2 text-sm text-textMain"
                    >
                      <option value="Birthday">Birthday</option>
                      <option value="Anniversary">Anniversary</option>
                      <option value="Doctor Visit">Doctor Visit</option>
                      <option value="Festival">Festival / Holiday</option>
                      <option value="Exam">School / College Exam</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-textMuted mb-1 block">Date *</label>
                    <input
                      required
                      type="date"
                      value={eventForm.date}
                      onChange={e => setEventForm({ ...eventForm, date: e.target.value })}
                      className="w-full bg-background border border-glass rounded-lg px-3 py-2 text-sm text-textMain"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-textMuted mb-1 block">Family Member / Person</label>
                  <input
                    type="text"
                    placeholder="e.g. Mom & Dad"
                    value={eventForm.person}
                    onChange={e => setEventForm({ ...eventForm, person: e.target.value })}
                    className="w-full bg-background border border-glass rounded-lg px-3 py-2 text-sm text-textMain"
                  />
                </div>

                <div className="flex justify-end gap-3 mt-6 pt-3 border-t border-glass">
                  <button type="button" onClick={() => setShowEventModal(false)} className="px-4 py-2 text-sm text-textMuted hover:text-textMain">Cancel</button>
                  <button type="submit" className="px-5 py-2 bg-blue-500 text-white rounded-lg font-bold text-sm shadow-md hover:bg-blue-600">
                    {editEventId ? 'Update Event' : 'Save Event'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 4: Add Shared Expense */}
      <AnimatePresence>
        {showExpenseModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowExpenseModal(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="glass-panel p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
              <h2 className="text-xl font-bold mb-4 text-textMain">{editExpenseId ? 'Edit Shared Household Expense' : 'Log Shared Household Expense'}</h2>
              <form onSubmit={handleSaveExpense} className="space-y-4">
                <div>
                  <label className="text-xs text-textMuted mb-1 block">Expense Description *</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. Monthly Supermarket Groceries"
                    value={expenseForm.description}
                    onChange={e => setExpenseForm({ ...expenseForm, description: e.target.value })}
                    className="w-full bg-background border border-glass rounded-lg px-3 py-2 text-sm text-textMain"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-textMuted mb-1 block">Amount (₹) *</label>
                    <input
                      required
                      type="number"
                      placeholder="₹ amount"
                      value={expenseForm.amount}
                      onChange={e => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                      className="w-full bg-background border border-glass rounded-lg px-3 py-2 text-sm text-textMain"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-textMuted mb-1 block">Paid By</label>
                    <select
                      value={expenseForm.paidBy}
                      onChange={e => setExpenseForm({ ...expenseForm, paidBy: e.target.value })}
                      className="w-full bg-background border border-glass rounded-lg px-3 py-2 text-sm text-textMain"
                    >
                      <option value="Head of House">Head of House</option>
                      {members.map(m => (
                        <option key={m._id || m.id} value={m.name}>{m.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-textMuted mb-1 block">Category</label>
                    <select
                      value={expenseForm.category}
                      onChange={e => setExpenseForm({ ...expenseForm, category: e.target.value })}
                      className="w-full bg-background border border-glass rounded-lg px-3 py-2 text-sm text-textMain"
                    >
                      <option value="Groceries">Groceries</option>
                      <option value="Utilities">Utilities</option>
                      <option value="Maintenance">Maintenance</option>
                      <option value="Domestic Help">Domestic Help</option>
                      <option value="Dining & Food">Dining & Food</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-textMuted mb-1 block">Date</label>
                    <input
                      type="date"
                      value={expenseForm.date}
                      onChange={e => setExpenseForm({ ...expenseForm, date: e.target.value })}
                      className="w-full bg-background border border-glass rounded-lg px-3 py-2 text-sm text-textMain"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6 pt-3 border-t border-glass">
                  <button type="button" onClick={() => setShowExpenseModal(false)} className="px-4 py-2 text-sm text-textMuted hover:text-textMain">Cancel</button>
                  <button type="submit" className="px-5 py-2 bg-green-500 text-white rounded-lg font-bold text-sm shadow-md hover:bg-green-600">
                    {editExpenseId ? 'Update Expense' : 'Save Expense'}
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
        title="Delete Record"
        message={`Are you sure you want to permanently delete "${deleteModal.title}"?`}
        confirmText="Delete Record"
        isDestructive={true}
        onConfirm={confirmDeleteAction}
        onCancel={() => setDeleteModal({ isOpen: false, type: 'post', id: '', title: '' })}
      />
    </div>
  );
}
