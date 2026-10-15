import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, GraduationCap, BookOpen, Calendar, CheckCircle2, Circle, Edit2, Trash2,
  Clock, FileText, CheckSquare, Award, Download, ChevronRight, AlertCircle
} from 'lucide-react';
import { useContextEngineStore } from '../store/useContextEngineStore';
import { StudentService, getActiveUserId } from '../services/firestoreService';
import { formatIsoDate } from '../utils/dateUtils';
import { calculateDaysRemaining } from '../utils/calculations';
import { exportToCSV } from '../utils/csvExport';
import { FileUpload } from '../components/common/FileUpload';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { SearchFilterBar } from '../components/common/SearchFilterBar';
import { EmptyState } from '../components/common/EmptyState';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { MobilePageHeader } from '../components/common/MobilePageHeader';

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function StudentPlanner() {
  const { user } = useContextEngineStore();
  const activeUid = getActiveUserId(user?.id);

  const [activeTab, setActiveTab] = useState<'assignments' | 'courses' | 'timetable'>('assignments');
  const [loading, setLoading] = useState(true);

  // Assignments / Exams State
  const [items, setItems] = useState<any[]>([]);
  const [showItemModal, setShowItemModal] = useState(false);
  const [editItemId, setEditItemId] = useState<string | null>(null);
  const [itemFormData, setItemFormData] = useState({
    title: '',
    subject: '',
    type: 'Assignment', // Assignment, Exam, Project, Quiz
    priority: 'High', // Urgent, High, Medium, Low
    dueDate: new Date().toISOString().split('T')[0],
    description: '',
    status: 'Pending',
    attachmentUrl: ''
  });

  // Courses State
  const [courses, setCourses] = useState<any[]>([]);
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [courseFormData, setCourseFormData] = useState({
    courseName: '',
    courseCode: '',
    instructor: '',
    credits: '3',
    room: ''
  });

  // Timetable State
  const [timetable, setTimetable] = useState<any[]>([]);
  const [showTimetableModal, setShowTimetableModal] = useState(false);
  const [timetableFormData, setTimetableFormData] = useState({
    day: 'Monday',
    startTime: '09:00',
    endTime: '10:00',
    subject: '',
    room: ''
  });

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');

  // Delete Confirm
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; type: 'item' | 'course' | 'timetable' } | null>(null);

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [itemList, courseList, timeList] = await Promise.all([
        StudentService.getItems(activeUid),
        StudentService.getCourses(activeUid),
        StudentService.getTimetable(activeUid)
      ]);
      setItems(itemList);
      setCourses(courseList);
      setTimetable(timeList);
    } catch (e) {
      console.error('Error fetching student planner data:', e);
    } finally {
      setLoading(false);
    }
  };

  // Save Assignment / Exam Item
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemFormData.title.trim() || !itemFormData.subject.trim()) return;

    try {
      const payload = {
        ...itemFormData,
        isCompleted: itemFormData.status === 'Completed'
      };

      if (editItemId) {
        await StudentService.updateItem(editItemId, payload);
      } else {
        await StudentService.addItem(activeUid, payload);
      }

      setShowItemModal(false);
      setEditItemId(null);
      setItemFormData({
        title: '', subject: '', type: 'Assignment', priority: 'High',
        dueDate: new Date().toISOString().split('T')[0], description: '', status: 'Pending', attachmentUrl: ''
      });
      fetchData();
    } catch (e) {
      console.error('Error saving assignment/exam:', e);
    }
  };

  // Save Course
  const handleSaveCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseFormData.courseName.trim()) return;

    try {
      await StudentService.addCourse(activeUid, courseFormData);
      setShowCourseModal(false);
      setCourseFormData({ courseName: '', courseCode: '', instructor: '', credits: '3', room: '' });
      fetchData();
    } catch (e) {
      console.error('Error saving course:', e);
    }
  };

  // Save Timetable Slot
  const handleSaveTimetable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!timetableFormData.subject.trim()) return;

    try {
      await StudentService.addTimetableSlot(activeUid, timetableFormData);
      setShowTimetableModal(false);
      setTimetableFormData({ day: 'Monday', startTime: '09:00', endTime: '10:00', subject: '', room: '' });
      fetchData();
    } catch (e) {
      console.error('Error saving timetable slot:', e);
    }
  };

  // Toggle Completion
  const toggleItemStatus = async (item: any) => {
    const nextStatus = item.status === 'Completed' ? 'Pending' : 'Completed';
    try {
      await StudentService.updateItem(item._id, {
        status: nextStatus,
        isCompleted: nextStatus === 'Completed'
      });
      fetchData();
    } catch (e) {
      console.error('Error updating status:', e);
    }
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === 'item') {
        await StudentService.deleteItem(deleteTarget.id);
      } else if (deleteTarget.type === 'course') {
        await StudentService.deleteCourse(deleteTarget.id);
      } else if (deleteTarget.type === 'timetable') {
        await StudentService.deleteTimetableSlot(deleteTarget.id);
      }
      setDeleteTarget(null);
      fetchData();
    } catch (e) {
      console.error('Delete error:', e);
    }
  };

  const handleEditItem = (item: any) => {
    if (!item) return;
    setItemFormData({
      title: item.title || '',
      subject: item.subject || '',
      type: item.type || 'Assignment',
      priority: item.priority || 'High',
      dueDate: formatIsoDate(item.dueDate),
      description: item.description || '',
      status: item.status || 'Pending',
      attachmentUrl: item.attachmentUrl || ''
    });
    setEditItemId(item._id || item.id);
    setShowItemModal(true);
  };

  // Filter items
  const filteredItems = items.filter(i => {
    const matchesSearch = !searchQuery ||
      i.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'All' || i.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const pendingCount = items.filter(i => i.status !== 'Completed').length;
  const completedCount = items.filter(i => i.status === 'Completed').length;

  return (
    <div className="space-y-6 pb-12">
      {/* Mobile Page Header with single-level back to Dashboard */}
      <MobilePageHeader
        title="Student Planner"
        parentLabel="Dashboard"
        fallbackPath="/"
        icon={<GraduationCap className="text-indigo-400" size={24} />}
        subtitle="Track exams, assignments, project deliverables, and weekly class timetables."
        actions={
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => exportToCSV(items, 'Vynora_Academic_Schedule')}
              className="px-3 py-2 rounded-xl border border-glass bg-surface hover:bg-surfaceLight text-textMain text-xs font-medium flex items-center gap-1.5 min-h-[44px]"
            >
              <Download size={14} /> <span className="hidden sm:inline">Export</span>
            </button>
            <button
              type="button"
              onClick={() => setShowCourseModal(true)}
              className="px-3 py-2 rounded-xl border border-primary/30 bg-primary/10 text-primary text-xs font-semibold flex items-center gap-1.5 hover:bg-primary/20 min-h-[44px]"
            >
              <BookOpen size={14} /> Add Subject
            </button>
            <button
              type="button"
              onClick={() => { setEditItemId(null); setItemFormData({ title: '', subject: '', type: 'Assignment', priority: 'High', dueDate: new Date().toISOString().split('T')[0], description: '', status: 'Pending', attachmentUrl: '' }); setShowItemModal(true); }}
              className="bg-primary text-background px-3.5 py-2 rounded-xl flex items-center gap-1.5 hover:bg-primary/90 font-bold text-xs shadow-neon-primary-sm min-h-[44px] active:scale-95"
            >
              <Plus size={16} /> Add Task
            </button>
          </div>
        }
      />

      {/* KPI Row (Responsive grid) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="glass-panel p-3.5 sm:p-5 border-t-2 sm:border-t-4 border-t-primary">
          <span className="text-[10px] sm:text-xs text-textMuted font-medium uppercase">Courses</span>
          <div className="text-base sm:text-2xl font-bold text-textMain mt-0.5">{courses.length} Subjects</div>
          <p className="text-[10px] text-textMuted mt-0.5">Active load</p>
        </div>
        <div className="glass-panel p-3.5 sm:p-5 border-t-2 sm:border-t-4 border-t-yellow-400">
          <span className="text-[10px] sm:text-xs text-textMuted font-medium uppercase">Pending Items</span>
          <div className="text-base sm:text-2xl font-bold text-yellow-400 mt-0.5">{pendingCount} Due</div>
          <p className="text-[10px] text-textMuted mt-0.5">Exams & tasks</p>
        </div>
        <div className="glass-panel p-3.5 sm:p-5 border-t-2 sm:border-t-4 border-t-green-400">
          <span className="text-[10px] sm:text-xs text-textMuted font-medium uppercase">Completed</span>
          <div className="text-base sm:text-2xl font-bold text-green-400 mt-0.5">{completedCount} Done</div>
          <p className="text-[10px] text-textMuted mt-0.5">Cleared exams</p>
        </div>
        <div className="glass-panel p-3.5 sm:p-5 border-t-2 sm:border-t-4 border-t-purple-400">
          <span className="text-[10px] sm:text-xs text-textMuted font-medium uppercase">Classes</span>
          <div className="text-base sm:text-2xl font-bold text-purple-400 mt-0.5">{timetable.length} Sessions</div>
          <p className="text-[10px] text-textMuted mt-0.5">Weekly timetable</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-glass pb-1">
        <button
          onClick={() => setActiveTab('assignments')}
          className={`px-4 py-2 font-medium text-sm rounded-t-xl transition-colors ${
            activeTab === 'assignments' ? 'bg-surface text-primary border-t-2 border-primary' : 'text-textMuted hover:text-textMain'
          }`}
        >
          Assignments & Exams ({items.length})
        </button>
        <button
          onClick={() => setActiveTab('courses')}
          className={`px-4 py-2 font-medium text-sm rounded-t-xl transition-colors ${
            activeTab === 'courses' ? 'bg-surface text-primary border-t-2 border-primary' : 'text-textMuted hover:text-textMain'
          }`}
        >
          Courses & Subjects ({courses.length})
        </button>
        <button
          onClick={() => setActiveTab('timetable')}
          className={`px-4 py-2 font-medium text-sm rounded-t-xl transition-colors ${
            activeTab === 'timetable' ? 'bg-surface text-primary border-t-2 border-primary' : 'text-textMuted hover:text-textMain'
          }`}
        >
          Weekly Timetable ({timetable.length})
        </button>
      </div>

      {/* TAB 1: ASSIGNMENTS & EXAMS */}
      {activeTab === 'assignments' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <SearchFilterBar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              searchPlaceholder="Search task title, subject, or notes..."
              totalCount={filteredItems.length}
            />
            <div className="flex items-center gap-1.5 p-1 bg-surface border border-glass rounded-xl self-start sm:self-auto shrink-0">
              {['All', 'Assignment', 'Exam', 'Project', 'Quiz'].map(t => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    typeFilter === t ? 'bg-primary text-background font-semibold shadow-neon-primary-sm' : 'text-textMuted hover:text-textMain'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <LoadingSpinner />
          ) : filteredItems.length === 0 ? (
            <EmptyState
              icon={GraduationCap}
              title="No student tasks or exams"
              description="Keep on top of semester milestones, project deadlines, and test schedules."
              actionText="Add Academic Task"
              onAction={() => setShowItemModal(true)}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredItems.map((item: any) => {
                const days = calculateDaysRemaining(item.dueDate);
                const isDone = item.status === 'Completed';

                return (
                  <motion.div
                    key={item._id}
                    whileHover={{ y: -4 }}
                    className={`glass-panel p-6 flex flex-col justify-between border-t-4 transition-all ${
                      isDone ? 'border-t-green-400 opacity-70' :
                      item.type === 'Exam' ? 'border-t-red-500 hover:shadow-[0_0_15px_rgba(239,68,68,0.3)]' :
                      'border-t-primary hover:shadow-neon-primary-sm'
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => toggleItemStatus(item)}
                            className="p-1 rounded text-textMuted hover:text-green-400 transition-colors"
                            title={isDone ? 'Mark as Pending' : 'Mark as Completed'}
                          >
                            {isDone ? <CheckCircle2 size={22} className="text-green-400" /> : <Circle size={22} />}
                          </button>
                          <div>
                            <h3 className={`font-bold text-lg text-textMain ${isDone ? 'line-through text-textMuted' : ''}`}>
                              {item.title}
                            </h3>
                            <span className="text-xs text-textMuted">{item.subject} • {item.type}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button onClick={() => handleEditItem(item)} className="p-1 text-textMuted hover:text-primary">
                            <Edit2 size={15} />
                          </button>
                          <button onClick={() => setDeleteTarget({ id: item._id, type: 'item' })} className="p-1 text-textMuted hover:text-red-400">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>

                      {item.description && (
                        <p className="text-xs text-textMuted bg-surface/50 p-2.5 rounded-lg border border-glass my-3">
                          {item.description}
                        </p>
                      )}

                      <div className="flex items-center justify-between text-xs pt-2 border-t border-glass">
                        <span className="text-textMuted flex items-center gap-1.5">
                          <Calendar size={13} /> {item.dueDate ? new Date(item.dueDate).toLocaleDateString() : 'No Due Date'}
                        </span>
                        {!isDone && (
                          <span className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                            days.isOverdue ? 'bg-red-500/20 text-red-400' :
                            days.daysRemaining <= 2 ? 'bg-yellow-400/20 text-yellow-300' : 'text-textMuted'
                          }`}>
                            {days.isOverdue ? 'OVERDUE' : `${days.daysRemaining} days left`}
                          </span>
                        )}
                      </div>
                    </div>

                    {item.attachmentUrl && (
                      <div className="pt-3 mt-3 border-t border-glass text-xs">
                        <a href={item.attachmentUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline font-medium">
                          Assignment Syllabus / Doc ↗
                        </a>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: COURSES */}
      {activeTab === 'courses' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-textMain">Active Courses & Faculty</h3>
            <button
              onClick={() => setShowCourseModal(true)}
              className="bg-primary text-background px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 hover:bg-primary/90 shadow-neon-primary-sm"
            >
              <Plus size={16} /> Add Course
            </button>
          </div>

          {courses.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="No subjects registered"
              description="Add your enrolled subjects, course codes, professors, and credit weights."
              actionText="Register Course"
              onAction={() => setShowCourseModal(true)}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {courses.map((c: any) => (
                <div key={c._id} className="glass-panel p-6 border-l-4 border-l-primary flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <span className="text-xs font-mono font-bold text-primary px-2 py-0.5 rounded bg-primary/10 border border-primary/20">
                          {c.courseCode || 'SUB101'}
                        </span>
                        <h4 className="font-bold text-lg text-textMain mt-1.5">{c.courseName}</h4>
                      </div>
                      <button onClick={() => setDeleteTarget({ id: c._id, type: 'course' })} className="text-textMuted hover:text-red-400">
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className="space-y-1.5 text-xs text-textMuted pt-2 border-t border-glass">
                      <div className="flex justify-between">
                        <span>Instructor:</span>
                        <span className="text-textMain font-medium">{c.instructor || 'Staff'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Credits / Classroom:</span>
                        <span className="text-textMain font-medium">{c.credits} Credits {c.room ? `• ${c.room}` : ''}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: TIMETABLE */}
      {activeTab === 'timetable' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-textMain">Weekly Class Schedule</h3>
            <button
              onClick={() => setShowTimetableModal(true)}
              className="bg-primary text-background px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 hover:bg-primary/90 shadow-neon-primary-sm"
            >
              <Plus size={16} /> Add Schedule Slot
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-3">
            {DAYS_OF_WEEK.map(day => {
              const daySlots = timetable
                .filter(t => t.day === day)
                .sort((a, b) => a.startTime?.localeCompare(b.startTime));

              return (
                <div key={day} className="glass-panel p-3 border border-glass flex flex-col min-h-[220px]">
                  <h4 className="text-xs font-bold text-textMain border-b border-glass pb-2 mb-2 text-center uppercase tracking-wider text-primary">
                    {day.slice(0, 3)}
                  </h4>

                  <div className="space-y-2 flex-1">
                    {daySlots.length === 0 ? (
                      <p className="text-[10px] text-textMuted text-center mt-6">No lectures</p>
                    ) : (
                      daySlots.map((slot: any) => (
                        <div key={slot._id} className="p-2 rounded-lg bg-surface border border-glass text-xs relative group">
                          <div className="flex justify-between items-start">
                            <span className="font-bold text-textMain truncate">{slot.subject}</span>
                            <button
                              onClick={() => setDeleteTarget({ id: slot._id, type: 'timetable' })}
                              className="text-textMuted hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                          <p className="text-[10px] text-primary font-mono mt-0.5">{slot.startTime} - {slot.endTime}</p>
                          {slot.room && <p className="text-[10px] text-textMuted mt-0.5">{slot.room}</p>}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ITEM MODAL */}
      <AnimatePresence>
        {showItemModal && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowItemModal(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-panel max-w-md w-full p-6 border border-glass shadow-neon-primary-sm max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <h2 className="text-xl font-bold text-textMain mb-4">
                {editItemId ? 'Edit Academic Task' : 'Add Academic Task / Exam'}
              </h2>

              <form onSubmit={handleSaveItem} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-textMuted mb-1">Task Title *</label>
                  <input
                    type="text"
                    required
                    value={itemFormData.title}
                    onChange={(e) => setItemFormData({ ...itemFormData, title: e.target.value })}
                    placeholder="e.g. Midterm Exam, Physics Problem Set"
                    className="w-full bg-surface border border-glass rounded-xl px-4 py-2 text-sm text-textMain"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-textMuted mb-1">Subject / Course *</label>
                    <input
                      type="text"
                      required
                      value={itemFormData.subject}
                      onChange={(e) => setItemFormData({ ...itemFormData, subject: e.target.value })}
                      placeholder="e.g. Mathematics, History"
                      className="w-full bg-surface border border-glass rounded-xl px-3 py-2 text-sm text-textMain"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-textMuted mb-1">Type</label>
                    <select
                      value={itemFormData.type}
                      onChange={(e) => setItemFormData({ ...itemFormData, type: e.target.value })}
                      className="w-full bg-surface border border-glass rounded-xl px-3 py-2 text-sm text-textMain"
                    >
                      <option value="Assignment">Assignment</option>
                      <option value="Exam">Exam / Test</option>
                      <option value="Project">Project</option>
                      <option value="Quiz">Quiz</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-textMuted mb-1">Due Date *</label>
                    <input
                      type="date"
                      required
                      value={itemFormData.dueDate}
                      onChange={(e) => setItemFormData({ ...itemFormData, dueDate: e.target.value })}
                      className="w-full bg-surface border border-glass rounded-xl px-3 py-2 text-sm text-textMain"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-textMuted mb-1">Priority</label>
                    <select
                      value={itemFormData.priority}
                      onChange={(e) => setItemFormData({ ...itemFormData, priority: e.target.value })}
                      className="w-full bg-surface border border-glass rounded-xl px-3 py-2 text-sm text-textMain"
                    >
                      <option value="Urgent">Urgent</option>
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-textMuted mb-1">Description / Syllabus</label>
                  <textarea
                    rows={2}
                    value={itemFormData.description}
                    onChange={(e) => setItemFormData({ ...itemFormData, description: e.target.value })}
                    placeholder="Chapters covered, submission portal links..."
                    className="w-full bg-surface border border-glass rounded-xl px-4 py-2 text-sm text-textMain"
                  />
                </div>

                <FileUpload
                  label="Attach Study Notes / Assignment Brief"
                  currentUrl={itemFormData.attachmentUrl}
                  onUploadSuccess={(url) => setItemFormData({ ...itemFormData, attachmentUrl: url })}
                  onRemove={() => setItemFormData({ ...itemFormData, attachmentUrl: '' })}
                />

                <div className="flex justify-end gap-3 pt-3 border-t border-glass">
                  <button type="button" onClick={() => setShowItemModal(false)} className="px-4 py-2 rounded-xl border border-glass text-textMuted text-sm">Cancel</button>
                  <button type="submit" className="bg-primary text-background px-5 py-2 rounded-xl font-medium text-sm hover:bg-primary/90 shadow-neon-primary-sm">
                    {editItemId ? 'Update Task' : 'Save Task'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* COURSE MODAL */}
      <AnimatePresence>
        {showCourseModal && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowCourseModal(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-panel max-w-md w-full p-6 border border-glass shadow-neon-primary-sm"
            >
              <h2 className="text-xl font-bold text-textMain mb-4">Enroll New Course</h2>
              <form onSubmit={handleSaveCourse} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-textMuted mb-1">Course Name *</label>
                  <input
                    type="text"
                    required
                    value={courseFormData.courseName}
                    onChange={(e) => setCourseFormData({ ...courseFormData, courseName: e.target.value })}
                    placeholder="e.g. Data Structures & Algorithms"
                    className="w-full bg-surface border border-glass rounded-xl px-4 py-2 text-sm text-textMain"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-textMuted mb-1">Course Code</label>
                    <input
                      type="text"
                      value={courseFormData.courseCode}
                      onChange={(e) => setCourseFormData({ ...courseFormData, courseCode: e.target.value })}
                      placeholder="e.g. CS201"
                      className="w-full bg-surface border border-glass rounded-xl px-3 py-2 text-sm text-textMain font-mono uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-textMuted mb-1">Credits</label>
                    <input
                      type="number"
                      value={courseFormData.credits}
                      onChange={(e) => setCourseFormData({ ...courseFormData, credits: e.target.value })}
                      className="w-full bg-surface border border-glass rounded-xl px-3 py-2 text-sm text-textMain"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-textMuted mb-1">Instructor / Professor</label>
                  <input
                    type="text"
                    value={courseFormData.instructor}
                    onChange={(e) => setCourseFormData({ ...courseFormData, instructor: e.target.value })}
                    placeholder="e.g. Prof. Alan Turing"
                    className="w-full bg-surface border border-glass rounded-xl px-4 py-2 text-sm text-textMain"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-3 border-t border-glass">
                  <button type="button" onClick={() => setShowCourseModal(false)} className="px-4 py-2 rounded-xl border border-glass text-textMuted text-sm">Cancel</button>
                  <button type="submit" className="bg-primary text-background px-5 py-2 rounded-xl font-medium text-sm hover:bg-primary/90 shadow-neon-primary-sm">Save Course</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* TIMETABLE MODAL */}
      <AnimatePresence>
        {showTimetableModal && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowTimetableModal(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-panel max-w-md w-full p-6 border border-glass shadow-neon-primary-sm"
            >
              <h2 className="text-xl font-bold text-textMain mb-4">Add Timetable Slot</h2>
              <form onSubmit={handleSaveTimetable} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-textMuted mb-1">Day of Week</label>
                  <select
                    value={timetableFormData.day}
                    onChange={(e) => setTimetableFormData({ ...timetableFormData, day: e.target.value })}
                    className="w-full bg-surface border border-glass rounded-xl px-4 py-2 text-sm text-textMain"
                  >
                    {DAYS_OF_WEEK.map(d => <option key={d} value={d} className="bg-surface">{d}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-textMuted mb-1">Start Time</label>
                    <input
                      type="time"
                      value={timetableFormData.startTime}
                      onChange={(e) => setTimetableFormData({ ...timetableFormData, startTime: e.target.value })}
                      className="w-full bg-surface border border-glass rounded-xl px-3 py-2 text-sm text-textMain font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-textMuted mb-1">End Time</label>
                    <input
                      type="time"
                      value={timetableFormData.endTime}
                      onChange={(e) => setTimetableFormData({ ...timetableFormData, endTime: e.target.value })}
                      className="w-full bg-surface border border-glass rounded-xl px-3 py-2 text-sm text-textMain font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-textMuted mb-1">Subject / Class Name *</label>
                  <input
                    type="text"
                    required
                    value={timetableFormData.subject}
                    onChange={(e) => setTimetableFormData({ ...timetableFormData, subject: e.target.value })}
                    placeholder="e.g. Physics Lab, English Literature"
                    className="w-full bg-surface border border-glass rounded-xl px-4 py-2 text-sm text-textMain"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-textMuted mb-1">Room / Zoom Link</label>
                  <input
                    type="text"
                    value={timetableFormData.room}
                    onChange={(e) => setTimetableFormData({ ...timetableFormData, room: e.target.value })}
                    placeholder="e.g. Hall 4B or Zoom Link"
                    className="w-full bg-surface border border-glass rounded-xl px-4 py-2 text-sm text-textMain"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-glass">
                  <button type="button" onClick={() => setShowTimetableModal(false)} className="px-4 py-2 rounded-xl border border-glass text-textMuted text-sm">Cancel</button>
                  <button type="submit" className="bg-primary text-background px-5 py-2 rounded-xl font-medium text-sm hover:bg-primary/90 shadow-neon-primary-sm">Add Slot</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CONFIRM DELETE MODAL */}
      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title={`Delete ${deleteTarget?.type === 'item' ? 'Task' : deleteTarget?.type === 'course' ? 'Course' : 'Timetable Slot'}`}
        message="Are you sure you want to permanently delete this academic record?"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
