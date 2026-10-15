import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Receipt, CheckCircle2, Circle, AlertCircle, Edit2, Trash2, 
  Search, Download, Calendar, ExternalLink, IndianRupee, Clock, Zap, Droplets,
  Wifi, Home, Shield, Landmark, Sprout, Tag
} from 'lucide-react';
import { useContextEngineStore } from '../store/useContextEngineStore';
import { isBillOverdue } from '../utils/calculations';
import { formatIsoDate } from '../utils/dateUtils';
import { BillService, getActiveUserId } from '../services/firestoreService';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { FileUpload } from '../components/common/FileUpload';
import { EmptyState } from '../components/common/EmptyState';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { exportToCSV } from '../utils/csvExport';
import { MobilePageHeader } from '../components/common/MobilePageHeader';

const BILL_CATEGORIES = [
  { id: 'Electricity', name: 'Electricity', icon: Zap, color: 'text-amber-400' },
  { id: 'Water', name: 'Water & Sewage', icon: Droplets, color: 'text-cyan-400' },
  { id: 'Internet & Mobile', name: 'Internet & Mobile', icon: Wifi, color: 'text-blue-400' },
  { id: 'Rent & Maintenance', name: 'Rent & Maintenance', icon: Home, color: 'text-purple-400' },
  { id: 'Subscriptions', name: 'Subscriptions', icon: Tag, color: 'text-pink-400' },
  { id: 'Insurance', name: 'Insurance Premium', icon: Shield, color: 'text-emerald-400' },
  { id: 'Loan EMI', name: 'Loan EMI', icon: Landmark, color: 'text-yellow-400' },
  { id: 'Agriculture & Livestock', name: 'Agri & Livestock Bills', icon: Sprout, color: 'text-green-400' },
  { id: 'Other', name: 'Other Recurring', icon: Receipt, color: 'text-gray-400' }
];

export default function BillReminder() {
  const { user } = useContextEngineStore();
  const activeUid = getActiveUserId(user?.id);

  const [bills, setBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Tabs
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'overdue' | 'paid'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string; title: string }>({
    isOpen: false,
    id: '',
    title: ''
  });

  // Form Data
  const [formData, setFormData] = useState({
    name: '',
    billerProvider: '',
    accountNumber: '',
    category: 'Electricity',
    amount: '',
    dueDate: new Date().toISOString().split('T')[0],
    frequency: 'Monthly',
    autoDebit: false,
    notes: '',
    receiptUrl: ''
  });

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await BillService.getBills(activeUid);
      setBills(data);
    } catch (e) {
      console.error('Error fetching bills:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBill = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        amount: Number(formData.amount) || 0
      };

      if (editId) {
        await BillService.updateBill(editId, payload);
      } else {
        await BillService.addBill(activeUid, {
          ...payload,
          isPaid: false
        });
      }
      setShowModal(false);
      setEditId(null);
      resetForm();
      fetchData();
    } catch (e) {
      console.error('Error saving bill:', e);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      billerProvider: '',
      accountNumber: '',
      category: 'Electricity',
      amount: '',
      dueDate: new Date().toISOString().split('T')[0],
      frequency: 'Monthly',
      autoDebit: false,
      notes: '',
      receiptUrl: ''
    });
  };

  const handleEdit = (bill: any) => {
    if (!bill) return;
    setFormData({
      name: bill.name || '',
      billerProvider: bill.billerProvider || '',
      accountNumber: bill.accountNumber || '',
      category: bill.category || 'Electricity',
      amount: bill.amount?.toString() || '',
      dueDate: formatIsoDate(bill.dueDate),
      frequency: bill.frequency || 'Monthly',
      autoDebit: Boolean(bill.autoDebit),
      notes: bill.notes || '',
      receiptUrl: bill.receiptUrl || ''
    });
    setEditId(bill._id || bill.id);
    setShowModal(true);
  };

  const confirmDeleteAction = async () => {
    try {
      await BillService.deleteBill(deleteModal.id);
      setDeleteModal({ isOpen: false, id: '', title: '' });
      fetchData();
    } catch (e) {
      console.error('Error deleting bill:', e);
    }
  };

  const togglePaid = async (bill: any) => {
    try {
      await BillService.togglePaid(bill._id || bill.id, Boolean(bill.isPaid), {
        ...bill,
        userId: activeUid
      });
      fetchData();
    } catch (e) {
      console.error('Error toggling paid state:', e);
    }
  };

  // Calculations & Filtering
  const totalBillsAmount = bills.reduce((sum, b) => sum + (Number(b.amount) || 0), 0);
  const pendingBills = bills.filter(b => !b.isPaid);
  const pendingAmount = pendingBills.reduce((sum, b) => sum + (Number(b.amount) || 0), 0);
  
  const overdueBills = bills.filter(b => isBillOverdue(b.dueDate, b.isPaid));
  const overdueAmount = overdueBills.reduce((sum, b) => sum + (Number(b.amount) || 0), 0);

  const paidBills = bills.filter(b => b.isPaid);
  const paidAmount = paidBills.reduce((sum, b) => sum + (Number(b.amount) || 0), 0);

  const filteredBills = bills.filter(bill => {
    const isOverdue = isBillOverdue(bill.dueDate, bill.isPaid);
    
    // Tab filter
    if (activeTab === 'pending' && bill.isPaid) return false;
    if (activeTab === 'overdue' && !isOverdue) return false;
    if (activeTab === 'paid' && !bill.isPaid) return false;

    // Category filter
    if (selectedCategory !== 'ALL' && bill.category !== selectedCategory) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = (bill.name || '').toLowerCase().includes(q);
      const matchProvider = (bill.billerProvider || '').toLowerCase().includes(q);
      const matchCategory = (bill.category || '').toLowerCase().includes(q);
      const matchAcc = (bill.accountNumber || '').toLowerCase().includes(q);
      if (!matchName && !matchProvider && !matchCategory && !matchAcc) return false;
    }

    return true;
  });

  const handleExportCSV = () => {
    const exportData = filteredBills.map(b => ({
      'Bill Name': b.name,
      Category: b.category,
      Provider: b.billerProvider || '',
      'Consumer / Acc #': b.accountNumber || '',
      'Amount (₹)': b.amount,
      'Due Date': b.dueDate ? new Date(b.dueDate).toLocaleDateString() : '',
      Status: b.isPaid ? 'Paid' : isBillOverdue(b.dueDate, b.isPaid) ? 'Overdue' : 'Pending',
      Frequency: b.frequency || 'Monthly',
      'Auto-Debit': b.autoDebit ? 'Yes' : 'No'
    }));
    exportToCSV(exportData, 'vynora_bills_reminder.csv');
  };

  if (loading) {
    return <LoadingSpinner message="Loading your bills and recurring schedules..." />;
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Mobile Page Header with single-level back to Dashboard */}
      <MobilePageHeader
        title="Bill Reminder"
        parentLabel="Dashboard"
        fallbackPath="/"
        icon={<Receipt className="text-amber-400" size={24} />}
        subtitle="Automated recurring reminders, due-date alerts, Cloudinary receipts, and instant Finance ledger sync."
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
              <Plus size={16} /> Add Bill
            </button>
          </div>
        }
      />

      {/* KPI Cards (Responsive grid) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="glass-panel p-3.5 sm:p-5 border-l-4 border-l-primary flex flex-col justify-between">
          <p className="text-[10px] sm:text-xs text-textMuted uppercase font-semibold">Total Commitments</p>
          <div className="mt-1 flex items-baseline justify-between">
            <h2 className="text-base sm:text-2xl font-bold text-textMain">₹{totalBillsAmount.toLocaleString()}</h2>
            <span className="text-[10px] text-textMuted">{bills.length} bills</span>
          </div>
        </div>

        <div className="glass-panel p-3.5 sm:p-5 border-l-4 border-l-amber-400 flex flex-col justify-between">
          <p className="text-[10px] sm:text-xs text-textMuted uppercase font-semibold">Pending Due</p>
          <div className="mt-1 flex items-baseline justify-between">
            <h2 className="text-base sm:text-2xl font-bold text-amber-400">₹{pendingAmount.toLocaleString()}</h2>
            <span className="text-[10px] text-amber-400/80">{pendingBills.length} unpaid</span>
          </div>
        </div>

        <div className="glass-panel p-3.5 sm:p-5 border-l-4 border-l-red-500 flex flex-col justify-between">
          <p className="text-[10px] sm:text-xs text-textMuted uppercase font-semibold">Overdue Urgencies</p>
          <div className="mt-1 flex items-baseline justify-between">
            <h2 className="text-base sm:text-2xl font-bold text-red-400">₹{overdueAmount.toLocaleString()}</h2>
            <span className="text-[10px] text-red-400/80 flex items-center gap-0.5">
              <AlertCircle size={10} /> {overdueBills.length}
            </span>
          </div>
        </div>

        <div className="glass-panel p-3.5 sm:p-5 border-l-4 border-l-green-500 flex flex-col justify-between">
          <p className="text-[10px] sm:text-xs text-textMuted uppercase font-semibold">Settled / Paid</p>
          <div className="mt-1 flex items-baseline justify-between">
            <h2 className="text-base sm:text-2xl font-bold text-green-400">₹{paidAmount.toLocaleString()}</h2>
            <span className="text-[10px] text-green-400/80">{paidBills.length} paid</span>
          </div>
        </div>
      </div>

      {/* Tabs & Filters */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        {/* Sub-status tabs */}
        <div className="flex border-b border-glass gap-2 overflow-x-auto pb-1 w-full md:w-auto">
          {[
            { key: 'all', label: `All Bills (${bills.length})` },
            { key: 'pending', label: `Pending Due (${pendingBills.length})` },
            { key: 'overdue', label: `Overdue (${overdueBills.length})` },
            { key: 'paid', label: `Settled / Paid (${paidBills.length})` }
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

        {/* Search & Category Filter */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-60">
            <Search className="absolute left-3 top-2.5 text-textMuted" size={14} />
            <input
              type="text"
              placeholder="Search bill, provider, acct..."
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
            {BILL_CATEGORIES.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Bill Grid */}
      {filteredBills.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No bills found"
          description={
            activeTab === 'overdue'
              ? "Great job! You have zero overdue bills."
              : "Track your electricity, internet, rent, insurance, and recurring subscriptions seamlessly."
          }
          actionText={activeTab === 'all' ? "Add First Bill" : undefined}
          onAction={activeTab === 'all' ? () => { resetForm(); setShowModal(true); } : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBills.map((bill: any) => {
            const overdue = isBillOverdue(bill.dueDate, bill.isPaid);
            const categoryMeta = BILL_CATEGORIES.find(c => c.id === bill.category) || BILL_CATEGORIES[8];
            const CatIcon = categoryMeta.icon;

            return (
              <motion.div
                key={bill._id || bill.id}
                whileHover={{ y: -4 }}
                className={`glass-panel p-5 relative overflow-hidden flex flex-col justify-between border-t-4 ${
                  bill.isPaid 
                    ? 'border-t-green-500 opacity-80' 
                    : overdue 
                      ? 'border-t-red-500' 
                      : 'border-t-primary'
                }`}
              >
                <div>
                  {/* Top Row */}
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 bg-surface border border-glass rounded-xl ${categoryMeta.color}`}>
                        <CatIcon size={22} />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-textMain leading-tight">{bill.name}</h3>
                        <p className="text-xs text-textMuted">{bill.billerProvider || bill.category}</p>
                      </div>
                    </div>

                    <div className="flex gap-1">
                      <button
                        onClick={() => handleEdit(bill)}
                        className="p-1 rounded-lg text-textMuted hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                        title="Edit Bill"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => setDeleteModal({
                          isOpen: true,
                          id: bill._id || bill.id,
                          title: bill.name
                        })}
                        className="p-1 rounded-lg text-textMuted hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Delete Bill"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Amount & Status Badge */}
                  <div className="bg-surface/50 p-3 rounded-xl border border-glass mb-4 flex justify-between items-center">
                    <div>
                      <p className="text-xs text-textMuted">Amount Payable</p>
                      <h4 className="text-xl font-bold text-textMain">₹{(Number(bill.amount) || 0).toLocaleString()}</h4>
                    </div>
                    <div>
                      {bill.isPaid ? (
                        <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-green-500/20 text-green-400 border border-green-500/30 flex items-center gap-1">
                          <CheckCircle2 size={13} /> Paid
                        </span>
                      ) : overdue ? (
                        <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/30 flex items-center gap-1">
                          <AlertCircle size={13} /> Overdue
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                          <Clock size={13} /> Pending
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Metadata fields */}
                  <div className="space-y-1.5 text-xs mb-4">
                    <div className="flex justify-between text-textMuted">
                      <span>Due Date:</span>
                      <span className={`font-semibold ${overdue && !bill.isPaid ? 'text-red-400 font-bold' : 'text-textMain'}`}>
                        {new Date(bill.dueDate).toLocaleDateString()}
                      </span>
                    </div>
                    {bill.accountNumber && (
                      <div className="flex justify-between text-textMuted">
                        <span>Account / Consumer #:</span>
                        <span className="font-mono text-textMain">{bill.accountNumber}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-textMuted">
                      <span>Frequency:</span>
                      <span className="text-textMain">{bill.frequency || 'Monthly'}</span>
                    </div>
                    {bill.receiptUrl && (
                      <div className="flex justify-between items-center pt-1 border-t border-glass">
                        <span className="text-textMuted">Receipt:</span>
                        <a 
                          href={bill.receiptUrl} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="text-primary hover:underline flex items-center gap-1 font-medium"
                        >
                          <ExternalLink size={12} /> View Document
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Mark as Paid / Unpaid Button */}
                <button
                  onClick={() => togglePaid(bill)}
                  className={`w-full py-2.5 rounded-xl flex items-center justify-center gap-2 font-semibold text-xs transition-colors ${
                    bill.isPaid
                      ? 'bg-green-500/20 text-green-400 border border-green-500/40 hover:bg-green-500/30'
                      : 'bg-primary text-background shadow-neon-primary-sm hover:opacity-95'
                  }`}
                >
                  {bill.isPaid ? (
                    <>
                      <CheckCircle2 size={16} /> Paid & Ledger Synced (Click to Undo)
                    </>
                  ) : (
                    <>
                      <Circle size={16} /> Mark as Paid & Record Expense
                    </>
                  )}
                </button>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Bill Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="glass-panel p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <h2 className="text-xl font-bold mb-4 text-textMain">
                {editId ? 'Edit Bill Reminder' : 'Register New Bill'}
              </h2>
              <form onSubmit={handleSaveBill} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-textMuted mb-1 block">Bill Name *</label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. Home Electricity"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-background border border-glass rounded-lg px-3 py-2 text-sm text-textMain focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-textMuted mb-1 block">Category *</label>
                    <select
                      value={formData.category}
                      onChange={e => setFormData({ ...formData, category: e.target.value })}
                      className="w-full bg-background border border-glass rounded-lg px-3 py-2 text-sm text-textMain focus:outline-none"
                    >
                      {BILL_CATEGORIES.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-textMuted mb-1 block">Provider / Biller</label>
                    <input
                      type="text"
                      placeholder="e.g. BESCOM / Jio / Tata Play"
                      value={formData.billerProvider}
                      onChange={e => setFormData({ ...formData, billerProvider: e.target.value })}
                      className="w-full bg-background border border-glass rounded-lg px-3 py-2 text-sm text-textMain focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-textMuted mb-1 block">Consumer / Account #</label>
                    <input
                      type="text"
                      placeholder="e.g. 1029384756"
                      value={formData.accountNumber}
                      onChange={e => setFormData({ ...formData, accountNumber: e.target.value })}
                      className="w-full bg-background border border-glass rounded-lg px-3 py-2 text-sm text-textMain focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-textMuted mb-1 block">Bill Amount (₹) *</label>
                    <input
                      required
                      type="number"
                      placeholder="₹ amount"
                      value={formData.amount}
                      onChange={e => setFormData({ ...formData, amount: e.target.value })}
                      className="w-full bg-background border border-glass rounded-lg px-3 py-2 text-sm text-textMain focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-textMuted mb-1 block">Due Date *</label>
                    <input
                      required
                      type="date"
                      value={formData.dueDate}
                      onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
                      className="w-full bg-background border border-glass rounded-lg px-3 py-2 text-sm text-textMain focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-textMuted mb-1 block">Recurrence Frequency</label>
                    <select
                      value={formData.frequency}
                      onChange={e => setFormData({ ...formData, frequency: e.target.value })}
                      className="w-full bg-background border border-glass rounded-lg px-3 py-2 text-sm text-textMain"
                    >
                      <option value="One-time">One-time</option>
                      <option value="Monthly">Monthly</option>
                      <option value="Quarterly">Quarterly</option>
                      <option value="Annually">Annually</option>
                    </select>
                  </div>
                  <div className="flex items-center pt-6">
                    <label className="flex items-center gap-2 text-xs text-textMain cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.autoDebit}
                        onChange={e => setFormData({ ...formData, autoDebit: e.target.checked })}
                        className="rounded border-glass"
                      />
                      Auto-Debit Enabled via Bank
                    </label>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-textMuted mb-1 block">Notes / Payment Details</label>
                  <input
                    type="text"
                    placeholder="e.g. Paid via HDFC netbanking, plan details..."
                    value={formData.notes}
                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full bg-background border border-glass rounded-lg px-3 py-2 text-sm text-textMain"
                  />
                </div>

                {/* Cloudinary Receipt Upload */}
                <FileUpload
                  label="Attach Bill PDF / Payment Receipt (Cloudinary)"
                  currentUrl={formData.receiptUrl}
                  onUploadSuccess={(url: string) => setFormData({ ...formData, receiptUrl: url })}
                  onRemove={() => setFormData({ ...formData, receiptUrl: '' })}
                />

                <div className="flex justify-end gap-3 mt-6 pt-3 border-t border-glass">
                  <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-textMuted hover:text-textMain">Cancel</button>
                  <button type="submit" className="px-5 py-2 bg-primary text-background rounded-lg font-bold text-sm shadow-neon-primary-sm hover:opacity-95">
                    {editId ? 'Update Bill' : 'Save Bill'}
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
        title="Delete Bill"
        message={`Are you sure you want to permanently delete "${deleteModal.title}"? Any linked transaction entries in Finance will also be removed.`}
        confirmText="Delete Bill"
        isDestructive={true}
        onConfirm={confirmDeleteAction}
        onCancel={() => setDeleteModal({ isOpen: false, id: '', title: '' })}
      />
    </div>
  );
}
