import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, BellRing, CheckCircle2, Circle, Clock, Pill, Edit2, Trash2, 
  Search, Download, AlertTriangle, ExternalLink, RefreshCw, Calendar, 
  Check, X, FileText, ShieldAlert, Sparkles
} from 'lucide-react';
import { useContextEngineStore } from '../store/useContextEngineStore';
import { MedicineService, getActiveUserId } from '../services/firestoreService';
import { formatIsoDate } from '../utils/dateUtils';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { FileUpload } from '../components/common/FileUpload';
import { EmptyState } from '../components/common/EmptyState';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { exportToCSV } from '../utils/csvExport';
import { MobilePageHeader } from '../components/common/MobilePageHeader';

export default function MedicineReminder() {
  const { user } = useContextEngineStore();
  const activeUid = getActiveUserId(user?.id);

  const [medicines, setMedicines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Tabs & Search
  const [activeTab, setActiveTab] = useState<'active' | 'completed' | 'low_stock'>('active');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showModal, setShowModal] = useState(false);
  const [showRefillModal, setShowRefillModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedMed, setSelectedMed] = useState<any>(null);
  const [refillCount, setRefillCount] = useState('30');
  const [editId, setEditId] = useState<string | null>(null);

  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string; title: string }>({
    isOpen: false,
    id: '',
    title: ''
  });

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    form: 'Tablet',
    dosage: '500 mg',
    instruction: 'After Food',
    frequency: 'Daily',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    stock: '30',
    schedule: {
      morning: { selected: true, time: '08:00' },
      afternoon: { selected: false, time: '13:00' },
      evening: { selected: false, time: '18:00' },
      night: { selected: true, time: '21:00' }
    },
    doctorName: '',
    prescriptionUrl: '',
    notes: ''
  });

  useEffect(() => {
    fetchData();
    if ('Notification' in window && Notification.permission !== 'granted') {
      Notification.requestPermission();
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await MedicineService.getMedicines(activeUid);
      setMedicines(data);
    } catch (e) {
      console.error('Error fetching medicines:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveMedicine = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        stock: Number(formData.stock) || 0
      };

      if (editId) {
        await MedicineService.updateMedicine(editId, payload);
      } else {
        await MedicineService.addMedicine(activeUid, payload);
      }
      setShowModal(false);
      setEditId(null);
      resetForm();
      fetchData();
    } catch (e) {
      console.error('Error saving medicine:', e);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      form: 'Tablet',
      dosage: '500 mg',
      instruction: 'After Food',
      frequency: 'Daily',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      stock: '30',
      schedule: {
        morning: { selected: true, time: '08:00' },
        afternoon: { selected: false, time: '13:00' },
        evening: { selected: false, time: '18:00' },
        night: { selected: true, time: '21:00' }
      },
      doctorName: '',
      prescriptionUrl: '',
      notes: ''
    });
  };

  const handleEdit = (med: any) => {
    if (!med) return;
    setFormData({
      name: med.name || '',
      form: med.form || 'Tablet',
      dosage: med.dosage || '',
      instruction: med.instruction || 'After Food',
      frequency: med.frequency || 'Daily',
      startDate: formatIsoDate(med.startDate),
      endDate: formatIsoDate(med.endDate),
      stock: med.stock !== undefined ? med.stock.toString() : '30',
      schedule: med.schedule || {
        morning: { selected: true, time: '08:00' },
        afternoon: { selected: false, time: '13:00' },
        evening: { selected: false, time: '18:00' },
        night: { selected: true, time: '21:00' }
      },
      doctorName: med.doctorName || '',
      prescriptionUrl: med.prescriptionUrl || '',
      notes: med.notes || ''
    });
    setEditId(med._id || med.id);
    setShowModal(true);
  };

  const confirmDeleteAction = async () => {
    try {
      await MedicineService.deleteMedicine(deleteModal.id);
      setDeleteModal({ isOpen: false, id: '', title: '' });
      fetchData();
    } catch (e) {
      console.error('Error deleting medicine:', e);
    }
  };

  // Dose logging: take or skip
  const handleLogDose = async (med: any, status: 'taken' | 'skipped', timeSlot: string) => {
    try {
      await MedicineService.logDose(med._id || med.id, status, timeSlot);
      fetchData();
    } catch (e) {
      console.error('Error logging dose:', e);
    }
  };

  // Refill stock
  const handleRefill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMed) return;
    try {
      await MedicineService.refillStock(selectedMed._id || selectedMed.id, Number(refillCount) || 0);
      setShowRefillModal(false);
      setSelectedMed(null);
      fetchData();
    } catch (e) {
      console.error('Error refilling stock:', e);
    }
  };

  // Toggle active / completed course manually
  const toggleCourseStatus = async (med: any) => {
    try {
      await MedicineService.updateMedicine(med._id || med.id, {
        isCompleted: !med.isCompleted
      });
      fetchData();
    } catch (e) {
      console.error('Error updating course status:', e);
    }
  };

  // Filtering
  const activeMedicines = medicines.filter(m => !m.isCompleted);
  const completedMedicines = medicines.filter(m => m.isCompleted);
  const lowStockMedicines = medicines.filter(m => !m.isCompleted && (Number(m.stock) || 0) <= 5);

  const displayedMedicines = medicines.filter(med => {
    if (activeTab === 'active' && med.isCompleted) return false;
    if (activeTab === 'completed' && !med.isCompleted) return false;
    if (activeTab === 'low_stock' && (med.isCompleted || (Number(med.stock) || 0) > 5)) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = (med.name || '').toLowerCase().includes(q);
      const matchDoc = (med.doctorName || '').toLowerCase().includes(q);
      const matchForm = (med.form || '').toLowerCase().includes(q);
      if (!matchName && !matchDoc && !matchForm) return false;
    }
    return true;
  });

  const handleExportCSV = () => {
    const exportData = medicines.map(m => ({
      'Medicine Name': m.name,
      Form: m.form || 'Tablet',
      Dosage: m.dosage,
      Instructions: m.instruction || '',
      Frequency: m.frequency,
      'Start Date': m.startDate || '',
      'End Date': m.endDate || '',
      'Stock Remaining': m.stock !== undefined ? m.stock : 'N/A',
      Status: m.isCompleted ? 'Completed' : 'Active',
      Doctor: m.doctorName || ''
    }));
    exportToCSV(exportData, 'vynora_medicine_schedule.csv');
  };

  if (loading) {
    return <LoadingSpinner message="Loading your prescriptions and medication schedules..." />;
  }

  return (
    <div className="space-y-6">
      {/* Medical Disclaimer Alert Banner */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-start gap-3 text-amber-300 text-xs leading-relaxed">
        <ShieldAlert size={20} className="shrink-0 text-amber-400 mt-0.5" />
        <div>
          <strong className="font-semibold block text-amber-200 mb-0.5">Important Medical Disclaimer</strong>
          Vynora is a personal schedule and reminder assistant. It does not provide medical diagnoses or treatment recommendations, and does not replace consultation with certified healthcare professionals.
        </div>
      </div>

      {/* Mobile Page Header with single-level back to Dashboard */}
      <MobilePageHeader
        title="Medicine Reminder"
        parentLabel="Dashboard"
        fallbackPath="/"
        icon={<Pill className="text-red-400" size={24} />}
        subtitle="Active courses, dosage timing, prescription records, pill inventory, and confirmed dose tracking."
        actions={
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={handleExportCSV}
              className="bg-surface border border-glass px-3 py-2 rounded-xl text-textMuted hover:text-textMain flex items-center gap-1.5 text-xs transition-colors min-h-[44px]"
            >
              <Download size={14} /> <span className="hidden sm:inline">Export</span>
            </button>
            <button
              type="button"
              onClick={() => { resetForm(); setEditId(null); setShowModal(true); }}
              className="bg-primary text-background px-3.5 py-2 rounded-xl flex items-center gap-1.5 hover:bg-primary/90 transition-colors shadow-neon-primary-sm font-bold text-xs min-h-[44px] active:scale-95"
            >
              <Plus size={16} /> Add Med
            </button>
          </div>
        }
      />

      {/* KPI Cards (Responsive grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="glass-panel p-4 border-l-4 border-l-primary flex flex-col justify-between">
          <p className="text-[10px] sm:text-xs text-textMuted uppercase font-semibold">Active Courses</p>
          <div className="mt-1 flex items-baseline justify-between">
            <h2 className="text-xl sm:text-2xl font-bold text-textMain">{activeMedicines.length} Courses</h2>
            <Pill className="text-primary/70" size={20} />
          </div>
        </div>

        <div className="glass-panel p-4 border-l-4 border-l-amber-400 flex flex-col justify-between">
          <p className="text-[10px] sm:text-xs text-textMuted uppercase font-semibold">Refill Alerts (Stock ≤ 5)</p>
          <div className="mt-1 flex items-baseline justify-between">
            <h2 className={`text-xl sm:text-2xl font-bold ${lowStockMedicines.length > 0 ? 'text-amber-400' : 'text-textMain'}`}>
              {lowStockMedicines.length} Alert{lowStockMedicines.length === 1 ? '' : 's'}
            </h2>
            <RefreshCw className="text-amber-400/70" size={20} />
          </div>
        </div>

        <div className="glass-panel p-4 border-l-4 border-l-green-500 flex flex-col justify-between">
          <p className="text-[10px] sm:text-xs text-textMuted uppercase font-semibold">Completed Courses</p>
          <div className="mt-1 flex items-baseline justify-between">
            <h2 className="text-xl sm:text-2xl font-bold text-green-400">{completedMedicines.length}</h2>
            <CheckCircle2 className="text-green-500/70" size={20} />
          </div>
        </div>
      </div>

      {/* Subsections & Tabs */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex border-b border-glass gap-2 overflow-x-auto pb-1 w-full sm:w-auto">
          {[
            { key: 'active', label: `Active Routine (${activeMedicines.length})` },
            { key: 'low_stock', label: `Low Stock (${lowStockMedicines.length})` },
            { key: 'completed', label: `Course History (${completedMedicines.length})` }
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

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 text-textMuted" size={14} />
          <input
            type="text"
            placeholder="Search medicine, doctor..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-surface border border-glass rounded-xl pl-8 pr-3 py-1.5 text-xs text-textMain focus:outline-none focus:border-primary"
          />
        </div>
      </div>

      {/* Medicine Grid */}
      {displayedMedicines.length === 0 ? (
        <EmptyState
          icon={Pill}
          title="No medications found"
          description={
            activeTab === 'completed'
              ? "Completed courses and prescribed medicine histories will be preserved here."
              : "Set up daily dosages, morning/evening schedules, prescription documents, and stock alerts."
          }
          actionText={activeTab === 'active' ? "Add Medication" : undefined}
          onAction={activeTab === 'active' ? () => { resetForm(); setShowModal(true); } : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedMedicines.map((med: any) => {
            const isLowStock = !med.isCompleted && (Number(med.stock) || 0) <= 5;
            const sched = med.schedule || {};

            return (
              <motion.div
                key={med._id || med.id}
                whileHover={{ y: -4 }}
                className={`glass-panel p-5 relative overflow-hidden flex flex-col justify-between border-t-4 ${
                  med.isCompleted 
                    ? 'border-t-gray-500 opacity-70' 
                    : isLowStock 
                      ? 'border-t-amber-400' 
                      : 'border-t-primary'
                }`}
              >
                <div>
                  {/* Top Row */}
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-surface border border-glass rounded-xl text-primary">
                        <Pill size={22} />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-textMain leading-tight">{med.name}</h3>
                        <p className="text-xs text-textMuted">{med.dosage} • {med.form || 'Tablet'}</p>
                      </div>
                    </div>

                    <div className="flex gap-1">
                      <button
                        onClick={() => handleEdit(med)}
                        className="p-1 rounded-lg text-textMuted hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                        title="Edit"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => setDeleteModal({
                          isOpen: true,
                          id: med._id || med.id,
                          title: med.name
                        })}
                        className="p-1 rounded-lg text-textMuted hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Stock & Instructions Banner */}
                  <div className="bg-surface/50 p-3 rounded-xl border border-glass space-y-2 text-xs mb-4">
                    <div className="flex justify-between items-center">
                      <span className="text-textMuted">Instruction:</span>
                      <span className="font-semibold text-primary">{med.instruction || 'After Food'}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-textMuted">Stock Remaining:</span>
                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${isLowStock ? 'text-amber-400' : 'text-textMain'}`}>
                          {med.stock !== undefined ? `${med.stock} pills` : 'N/A'}
                        </span>
                        {!med.isCompleted && (
                          <button
                            onClick={() => { setSelectedMed(med); setShowRefillModal(true); }}
                            className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded hover:bg-primary/30 font-semibold transition-colors"
                            title="Refill stock"
                          >
                            + Refill
                          </button>
                        )}
                      </div>
                    </div>

                    {med.doctorName && (
                      <div className="flex justify-between text-textMuted">
                        <span>Prescribed by:</span>
                        <span className="text-textMain">{med.doctorName}</span>
                      </div>
                    )}

                    {med.prescriptionUrl && (
                      <div className="flex justify-between items-center pt-1 border-t border-glass">
                        <span className="text-textMuted">Prescription:</span>
                        <a 
                          href={med.prescriptionUrl} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="text-primary hover:underline flex items-center gap-1 font-medium"
                        >
                          <ExternalLink size={12} /> View File
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Daily Schedule Slots */}
                  <div className="mb-4">
                    <p className="text-[11px] uppercase tracking-wider text-textMuted font-semibold mb-2">Daily Dosage Schedule</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {[
                        { key: 'morning', label: 'Morning', icon: '🌅' },
                        { key: 'afternoon', label: 'Afternoon', icon: '☀️' },
                        { key: 'evening', label: 'Evening', icon: '🌇' },
                        { key: 'night', label: 'Night', icon: '🌙' }
                      ].map(slot => {
                        const s = sched[slot.key];
                        if (!s || !s.selected) return null;
                        return (
                          <div key={slot.key} className="bg-surface/70 border border-glass/60 p-2 rounded-lg flex items-center justify-between">
                            <span className="flex items-center gap-1 text-textMuted font-medium">
                              <span>{slot.icon}</span> {slot.label}
                            </span>
                            <span className="text-primary font-mono text-xs">{s.time || 'Routine'}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Bottom Actions: Log Doses & Course Toggle */}
                <div className="space-y-2 pt-2 border-t border-glass">
                  {!med.isCompleted ? (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleLogDose(med, 'taken', 'Scheduled Dose')}
                        className="py-1.5 px-2 bg-green-500/20 text-green-400 border border-green-500/30 rounded-lg hover:bg-green-500/30 text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                        title="Confirm Taken (decrements stock by 1)"
                      >
                        <Check size={14} /> Take Dose
                      </button>
                      <button
                        onClick={() => handleLogDose(med, 'skipped', 'Skipped')}
                        className="py-1.5 px-2 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg hover:bg-amber-500/20 text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                        title="Record Skipped"
                      >
                        <X size={14} /> Skip
                      </button>
                    </div>
                  ) : (
                    <div className="p-2 bg-gray-500/10 text-gray-400 rounded-lg text-center text-xs font-medium">
                      Course Completed
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-1 text-[11px]">
                    <button
                      onClick={() => { setSelectedMed(med); setShowHistoryModal(true); }}
                      className="text-textMuted hover:text-textMain underline"
                    >
                      Dose Logs ({med.doseLogs?.length || 0})
                    </button>
                    <button
                      onClick={() => toggleCourseStatus(med)}
                      className="text-primary hover:underline font-medium"
                    >
                      {med.isCompleted ? 'Reactivate Course' : 'Mark Course Complete'}
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Medicine Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="glass-panel p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <h2 className="text-xl font-bold mb-4 text-textMain">
                {editId ? 'Edit Medicine Schedule' : 'Prescribe New Medication'}
              </h2>
              <form onSubmit={handleSaveMedicine} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-textMuted mb-1 block">Medicine Name *</label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. Paracetamol / Amoxicillin"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-background border border-glass rounded-lg px-3 py-2 text-sm text-textMain focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-textMuted mb-1 block">Form</label>
                    <select
                      value={formData.form}
                      onChange={e => setFormData({ ...formData, form: e.target.value })}
                      className="w-full bg-background border border-glass rounded-lg px-3 py-2 text-sm text-textMain"
                    >
                      <option value="Tablet">Tablet</option>
                      <option value="Capsule">Capsule</option>
                      <option value="Syrup">Syrup</option>
                      <option value="Injection">Injection</option>
                      <option value="Drops">Eye/Ear Drops</option>
                      <option value="Ointment">Ointment / Cream</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-textMuted mb-1 block">Dosage *</label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. 500 mg / 10 ml"
                      value={formData.dosage}
                      onChange={e => setFormData({ ...formData, dosage: e.target.value })}
                      className="w-full bg-background border border-glass rounded-lg px-3 py-2 text-sm text-textMain"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-textMuted mb-1 block">Instruction</label>
                    <select
                      value={formData.instruction}
                      onChange={e => setFormData({ ...formData, instruction: e.target.value })}
                      className="w-full bg-background border border-glass rounded-lg px-3 py-2 text-sm text-textMain"
                    >
                      <option value="After Food">After Food</option>
                      <option value="Before Food">Before Food</option>
                      <option value="With Food">With Food</option>
                      <option value="Empty Stomach">Empty Stomach</option>
                      <option value="Bedtime">Before Sleep</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-textMuted mb-1 block">Start Date *</label>
                    <input
                      required
                      type="date"
                      value={formData.startDate}
                      onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                      className="w-full bg-background border border-glass rounded-lg px-3 py-2 text-sm text-textMain"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-textMuted mb-1 block">End Date (Optional)</label>
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                      className="w-full bg-background border border-glass rounded-lg px-3 py-2 text-sm text-textMain"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-textMuted mb-1 block">Initial Pill Stock Count</label>
                    <input
                      type="number"
                      placeholder="30"
                      value={formData.stock}
                      onChange={e => setFormData({ ...formData, stock: e.target.value })}
                      className="w-full bg-background border border-glass rounded-lg px-3 py-2 text-sm text-textMain"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-textMuted mb-1 block">Prescribing Doctor</label>
                    <input
                      type="text"
                      placeholder="e.g. Dr. Verma"
                      value={formData.doctorName}
                      onChange={e => setFormData({ ...formData, doctorName: e.target.value })}
                      className="w-full bg-background border border-glass rounded-lg px-3 py-2 text-sm text-textMain"
                    />
                  </div>
                </div>

                {/* Schedule Checkboxes & Times */}
                <div className="space-y-2 pt-2 border-t border-glass">
                  <label className="text-xs font-semibold text-textMain block">Daily Timing Slots</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { key: 'morning', label: 'Morning' },
                      { key: 'afternoon', label: 'Afternoon' },
                      { key: 'evening', label: 'Evening' },
                      { key: 'night', label: 'Night' }
                    ].map(slot => {
                      const cur = (formData.schedule as any)[slot.key];
                      return (
                        <div key={slot.key} className="bg-surface/50 p-2.5 rounded-xl border border-glass flex items-center justify-between gap-2">
                          <label className="flex items-center gap-1.5 text-xs text-textMain cursor-pointer">
                            <input
                              type="checkbox"
                              checked={cur.selected}
                              onChange={e => setFormData({
                                ...formData,
                                schedule: {
                                  ...formData.schedule,
                                  [slot.key]: { ...cur, selected: e.target.checked }
                                }
                              })}
                            />
                            {slot.label}
                          </label>
                          {cur.selected && (
                            <input
                              type="time"
                              value={cur.time}
                              onChange={e => setFormData({
                                ...formData,
                                schedule: {
                                  ...formData.schedule,
                                  [slot.key]: { ...cur, time: e.target.value }
                                }
                              })}
                              className="bg-background border border-glass rounded px-1.5 py-0.5 text-xs text-textMain"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Cloudinary Prescription Upload */}
                <FileUpload
                  label="Attach Doctor's Prescription PDF / Photo"
                  currentUrl={formData.prescriptionUrl}
                  onUploadSuccess={(url: string) => setFormData({ ...formData, prescriptionUrl: url })}
                  onRemove={() => setFormData({ ...formData, prescriptionUrl: '' })}
                />

                <div className="flex justify-end gap-3 mt-6 pt-3 border-t border-glass">
                  <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-textMuted hover:text-textMain">Cancel</button>
                  <button type="submit" className="px-5 py-2 bg-primary text-background rounded-lg font-bold text-sm shadow-neon-primary-sm hover:opacity-95">
                    {editId ? 'Update Medication' : 'Save Medication'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Refill Stock Modal */}
      <AnimatePresence>
        {showRefillModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowRefillModal(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="glass-panel p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
              <h2 className="text-lg font-bold mb-3 text-textMain">Refill {selectedMed?.name}</h2>
              <form onSubmit={handleRefill} className="space-y-4">
                <div>
                  <label className="text-xs text-textMuted mb-1 block">Number of Pills / Units to Add</label>
                  <input
                    required
                    type="number"
                    min="1"
                    value={refillCount}
                    onChange={e => setRefillCount(e.target.value)}
                    className="w-full bg-background border border-glass rounded-lg px-3 py-2 text-sm text-textMain"
                  />
                </div>
                <div className="text-xs text-textMuted">
                  Current Stock: <strong className="text-textMain">{selectedMed?.stock || 0}</strong> → New Stock: <strong className="text-primary">{(Number(selectedMed?.stock) || 0) + (Number(refillCount) || 0)}</strong>
                </div>
                <div className="flex justify-end gap-2 pt-3 border-t border-glass">
                  <button type="button" onClick={() => setShowRefillModal(false)} className="px-3 py-1.5 text-xs text-textMuted">Cancel</button>
                  <button type="submit" className="px-4 py-1.5 bg-primary text-background font-bold text-xs rounded-lg shadow-neon-primary-sm">
                    Confirm Refill
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Dose Logs History Modal */}
      <AnimatePresence>
        {showHistoryModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowHistoryModal(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="glass-panel p-6 w-full max-w-md max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <h2 className="text-lg font-bold mb-3 text-textMain">Dose History: {selectedMed?.name}</h2>
              {(!selectedMed?.doseLogs || selectedMed.doseLogs.length === 0) ? (
                <p className="text-xs text-textMuted py-6 text-center">No doses logged for this course yet.</p>
              ) : (
                <div className="space-y-2">
                  {selectedMed.doseLogs.slice().reverse().map((entry: any, idx: number) => (
                    <div key={idx} className="bg-surface/50 border border-glass p-2.5 rounded-lg flex items-center justify-between text-xs">
                      <div>
                        <span className={`font-semibold ${entry.status === 'taken' ? 'text-green-400' : 'text-amber-400'}`}>
                          {entry.status === 'taken' ? '✓ Dose Taken' : '✕ Dose Skipped'}
                        </span>
                        <p className="text-[10px] text-textMuted">{entry.timeSlot || 'Routine'}</p>
                      </div>
                      <span className="text-textMuted text-[10px]">
                        {new Date(entry.timestamp).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex justify-end mt-4 pt-3 border-t border-glass">
                <button type="button" onClick={() => setShowHistoryModal(false)} className="px-4 py-1.5 text-xs bg-surface border border-glass rounded-lg text-textMain">
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title="Delete Medication"
        message={`Are you sure you want to permanently delete "${deleteModal.title}" and all its dose tracking records?`}
        confirmText="Delete Record"
        isDestructive={true}
        onConfirm={confirmDeleteAction}
        onCancel={() => setDeleteModal({ isOpen: false, id: '', title: '' })}
      />
    </div>
  );
}
