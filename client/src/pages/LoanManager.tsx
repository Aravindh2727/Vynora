import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Banknote, Edit2, Trash2, Calendar, DollarSign, CheckCircle2, 
  X, Search, Download, Landmark, AlertCircle, FileText, ChevronRight, Percent
} from 'lucide-react';
import { useContextEngineStore } from '../store/useContextEngineStore';
import { calculateEMI, calculateAmortizationSchedule } from '../utils/calculations';
import { LoanService, getActiveUserId } from '../services/firestoreService';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { FileUpload } from '../components/common/FileUpload';
import { EmptyState } from '../components/common/EmptyState';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { exportToCSV } from '../utils/csvExport';

const LOAN_TYPES = ['Home Loan', 'Vehicle Loan', 'Personal Loan', 'Education Loan', 'Gold Loan', 'Agriculture Loan', 'Business Loan'];

export default function LoanManager() {
  const { user } = useContextEngineStore();
  const activeUid = getActiveUserId(user?.id);

  const [loans, setLoans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('ALL');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [activeLoan, setActiveLoan] = useState<any | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string; title: string }>({
    isOpen: false,
    id: '',
    title: ''
  });

  // Form Data
  const [formData, setFormData] = useState({
    loanName: '',
    loanType: 'Home Loan',
    lenderName: '',
    accountNumber: '',
    principalAmount: '',
    disbursalDate: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 5)).toISOString().split('T')[0],
    interestRate: '8.5',
    monthlyPay: '',
    documentUrl: '',
    bankLogo: ''
  });

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await LoanService.getLoans(activeUid);
      setLoans(data);
    } catch (e) {
      console.error('Error fetching loans from Firestore:', e);
    } finally {
      setLoading(false);
    }
  };

  // Recalculate EMI when principal, tenure, or rate changes
  useEffect(() => {
    if (formData.principalAmount && formData.startDate && formData.endDate) {
      const p = Number(formData.principalAmount) || 0;
      const rAnnual = Number(formData.interestRate) || 0;
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);

      let months = (end.getFullYear() - start.getFullYear()) * 12;
      months -= start.getMonth();
      months += end.getMonth();
      months = months <= 0 ? 1 : months;

      const emi = calculateEMI(p, rAnnual, months);
      setFormData(prev => ({ ...prev, monthlyPay: String(emi) }));
    }
  }, [formData.principalAmount, formData.startDate, formData.endDate, formData.interestRate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        principalAmount: Number(formData.principalAmount) || 0,
        interestRate: Number(formData.interestRate) || 0,
        monthlyPay: Number(formData.monthlyPay) || 0
      };

      if (editId) {
        await LoanService.updateLoan(editId, payload);
      } else {
        await LoanService.addLoan(activeUid, payload);
      }
      setShowAddModal(false);
      setEditId(null);
      resetForm();
      fetchData();
    } catch (e) {
      console.error('Error saving loan:', e);
    }
  };

  const resetForm = () => {
    setFormData({
      loanName: '',
      loanType: 'Home Loan',
      lenderName: '',
      accountNumber: '',
      principalAmount: '',
      disbursalDate: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 5)).toISOString().split('T')[0],
      interestRate: '8.5',
      monthlyPay: '',
      documentUrl: '',
      bankLogo: ''
    });
  };

  const handleEdit = (e: React.MouseEvent, loan: any) => {
    e.stopPropagation();
    setFormData({
      loanName: loan.loanName || '',
      loanType: loan.loanType || 'Home Loan',
      lenderName: loan.lenderName || '',
      accountNumber: loan.accountNumber || '',
      principalAmount: loan.principalAmount?.toString() || '',
      disbursalDate: loan.disbursalDate ? new Date(loan.disbursalDate).toISOString().split('T')[0] : '',
      startDate: loan.startDate ? new Date(loan.startDate).toISOString().split('T')[0] : '',
      endDate: loan.endDate ? new Date(loan.endDate).toISOString().split('T')[0] : '',
      interestRate: loan.interestRate?.toString() || '8.5',
      monthlyPay: loan.monthlyPay?.toString() || '',
      documentUrl: loan.documentUrl || '',
      bankLogo: loan.bankLogo || ''
    });
    setEditId(loan._id || loan.id);
    setShowAddModal(true);
  };

  const confirmDeleteAction = async () => {
    try {
      await LoanService.deleteLoan(deleteModal.id);
      setDeleteModal({ isOpen: false, id: '', title: '' });
      fetchData();
    } catch (e) {
      console.error('Error deleting loan:', e);
    }
  };

  const togglePayment = async (monthString: string) => {
    if (!activeLoan) return;
    try {
      const updatedLoan = await LoanService.togglePayment(activeLoan._id || activeLoan.id, monthString);
      setActiveLoan(updatedLoan);
      setLoans(loans.map(l => (l._id || l.id) === updatedLoan._id ? updatedLoan : l));
    } catch (e) {
      console.error('Error toggling payment in Firestore:', e);
    }
  };

  const generateSchedule = (start: string, end: string, principal: number, rate: number, monthlyPay: number, disbursal?: string) => {
    return calculateAmortizationSchedule(start, end, principal, rate, monthlyPay, disbursal);
  };

  // Calculations & Filtering
  const totalPrincipalBorrowed = loans.reduce((sum, l) => sum + (Number(l.principalAmount) || 0), 0);
  const totalMonthlyCommitment = loans.reduce((sum, l) => sum + (Number(l.monthlyPay) || 0), 0);

  const filteredLoans = loans.filter(loan => {
    if (filterType !== 'ALL' && loan.loanType !== filterType) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = (loan.loanName || '').toLowerCase().includes(q);
      const matchLender = (loan.lenderName || '').toLowerCase().includes(q);
      const matchAcc = (loan.accountNumber || '').toLowerCase().includes(q);
      if (!matchName && !matchLender && !matchAcc) return false;
    }
    return true;
  });

  const handleExportCSV = () => {
    const data = filteredLoans.map(l => ({
      'Loan Name': l.loanName,
      Type: l.loanType || 'General',
      Lender: l.lenderName || '',
      'Account / Loan #': l.accountNumber || '',
      'Principal Amount (₹)': l.principalAmount,
      'Interest Rate (%)': l.interestRate,
      'Monthly EMI (₹)': l.monthlyPay,
      'Start Date': l.startDate || '',
      'Maturity Date': l.endDate || '',
      'Paid Installments': (l.paidMonths || []).length
    }));
    exportToCSV(data, 'vynora_loans_portfolio.csv');
  };

  const handleExportScheduleCSV = (loan: any) => {
    const schedule = generateSchedule(loan.startDate, loan.endDate, loan.principalAmount, loan.interestRate, loan.monthlyPay, loan.disbursalDate);
    const paidMonths = loan.paidMonths || [];
    const data = schedule.map(m => ({
      'Installment No': m.instNo,
      'Due Month': m.label,
      'Principal Component (₹)': m.principalAmount,
      'Interest Component (₹)': m.interestAmount,
      'Total Installment (₹)': m.totalInstallment,
      'Remaining Balance (₹)': m.outstandingBalance,
      Status: paidMonths.includes(m.monthString) ? 'Paid' : 'Unpaid'
    }));
    exportToCSV(data, `${loan.loanName.replace(/\s+/g, '_')}_amortization_schedule.csv`);
  };

  if (loading) {
    return <LoadingSpinner message="Calculating loan liabilities and amortization schedules..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-wider mb-1 flex items-center gap-3">
            <Landmark className="text-primary" size={32} /> Loan Management
          </h1>
          <p className="text-textMuted">
            Principal balances, banking EMI schedules, amortization breakdowns, and ledger sync.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleExportCSV}
            className="bg-surface border border-glass px-3.5 py-2 rounded-xl text-textMuted hover:text-textMain flex items-center gap-1.5 text-sm transition-colors"
          >
            <Download size={16} /> Export Portfolio
          </button>
          <button
            onClick={() => { resetForm(); setEditId(null); setShowAddModal(true); }}
            className="bg-primary text-background px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-primary/90 transition-colors shadow-neon-primary-sm font-bold text-sm"
          >
            <Plus size={16} /> Add Loan Account
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-panel p-5 border-l-4 border-l-primary flex flex-col justify-between">
          <p className="text-xs text-textMuted uppercase font-semibold">Total Borrowed Principal</p>
          <div className="mt-2 flex items-baseline justify-between">
            <h2 className="text-2xl font-bold text-textMain">₹{totalPrincipalBorrowed.toLocaleString()}</h2>
            <Landmark className="text-primary/70" size={24} />
          </div>
        </div>

        <div className="glass-panel p-5 border-l-4 border-l-red-500 flex flex-col justify-between">
          <p className="text-xs text-textMuted uppercase font-semibold">Monthly EMI Commitments</p>
          <div className="mt-2 flex items-baseline justify-between">
            <h2 className="text-2xl font-bold text-red-400">₹{totalMonthlyCommitment.toLocaleString()} / mo</h2>
            <Banknote className="text-red-500/70" size={24} />
          </div>
        </div>

        <div className="glass-panel p-5 border-l-4 border-l-green-500 flex flex-col justify-between">
          <p className="text-xs text-textMuted uppercase font-semibold">Active Loan Accounts</p>
          <div className="mt-2 flex items-baseline justify-between">
            <h2 className="text-2xl font-bold text-green-400">{loans.length}</h2>
            <CheckCircle2 className="text-green-500/70" size={24} />
          </div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-2.5 text-textMuted" size={14} />
          <input
            type="text"
            placeholder="Search loan, lender, acct..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-surface border border-glass rounded-xl pl-8 pr-3 py-1.5 text-xs text-textMain focus:outline-none focus:border-primary"
          />
        </div>
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          className="bg-surface border border-glass rounded-xl px-3 py-1.5 text-xs text-textMain focus:outline-none"
        >
          <option value="ALL">All Loan Types</option>
          {LOAN_TYPES.map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {/* Loans Grid */}
      {filteredLoans.length === 0 ? (
        <EmptyState
          icon={Landmark}
          title="No loan accounts registered"
          description="Track home mortgages, vehicle hypothecations, gold loans, personal loans, and agriculture financing."
          actionText="Add First Loan"
          onAction={() => { resetForm(); setShowAddModal(true); }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredLoans.map((loan: any) => {
            const schedule = generateSchedule(loan.startDate, loan.endDate, loan.principalAmount, loan.interestRate, loan.monthlyPay, loan.disbursalDate);
            const paidCount = (loan.paidMonths || []).length;
            const totalCount = schedule.length;
            const progress = totalCount > 0 ? Math.round((paidCount / totalCount) * 100) : 0;

            return (
              <motion.div
                key={loan._id || loan.id}
                whileHover={{ y: -4 }}
                onClick={() => { setActiveLoan(loan); setShowDetailModal(true); }}
                className="glass-panel p-6 flex flex-col justify-between border-t-4 border-t-primary cursor-pointer hover:border-primary transition-all group"
              >
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 w-12 h-12 bg-surface border border-glass rounded-xl text-primary flex items-center justify-center overflow-hidden">
                        {loan.bankLogo ? (
                          <img src={loan.bankLogo} alt={loan.loanName} className="w-full h-full object-contain" />
                        ) : (
                          <Landmark size={24} />
                        )}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-textMain group-hover:text-primary transition-colors">
                          {loan.loanName}
                        </h3>
                        <p className="text-xs text-textMuted">{loan.lenderName || loan.loanType || 'Loan Account'}</p>
                      </div>
                    </div>

                    <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={e => handleEdit(e, loan)}
                        className="p-1 rounded text-textMuted hover:text-blue-400"
                        title="Edit"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          setDeleteModal({ isOpen: true, id: loan._id || loan.id, title: loan.loanName });
                        }}
                        className="p-1 rounded text-textMuted hover:text-red-400"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="bg-surface/50 p-4 rounded-xl border border-glass mb-4 space-y-2.5 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-textMuted">Principal Borrowed:</span>
                      <span className="font-bold text-sm text-textMain">₹{(Number(loan.principalAmount) || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-textMuted">Interest Rate:</span>
                      <span className="font-semibold text-red-400">{loan.interestRate || 0}% p.a.</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-textMuted">Tenure:</span>
                      <span className="text-textMain">
                        {new Date(loan.startDate).toLocaleDateString()} - {new Date(loan.endDate).toLocaleDateString()}
                      </span>
                    </div>
                    {loan.accountNumber && (
                      <div className="flex justify-between items-center pt-1 border-t border-glass">
                        <span className="text-textMuted">Account #:</span>
                        <span className="font-mono text-textMain">{loan.accountNumber}</span>
                      </div>
                    )}
                  </div>

                  {/* Progress bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-[11px] text-textMuted mb-1">
                      <span>Repayment Progress</span>
                      <span>{paidCount} / {totalCount} EMIs ({progress}%)</span>
                    </div>
                    <div className="w-full bg-surface border border-glass rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-primary h-full rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="w-full py-2.5 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-between px-3 text-xs font-semibold">
                  <span className="text-primary">Monthly EMI</span>
                  <span className="text-sm font-bold text-primary">₹{(Number(loan.monthlyPay) || 0).toLocaleString()} / mo</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Loan Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowAddModal(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="glass-panel p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <h2 className="text-xl font-bold mb-4 text-textMain">{editId ? 'Edit Loan Account' : 'Add New Loan'}</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-textMuted mb-1 block">Loan Name *</label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. SBI Home Loan"
                      value={formData.loanName}
                      onChange={e => setFormData({ ...formData, loanName: e.target.value })}
                      className="w-full bg-background border border-glass rounded-lg px-3 py-2 text-sm text-textMain focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-textMuted mb-1 block">Loan Type</label>
                    <select
                      value={formData.loanType}
                      onChange={e => setFormData({ ...formData, loanType: e.target.value })}
                      className="w-full bg-background border border-glass rounded-lg px-3 py-2 text-sm text-textMain"
                    >
                      {LOAN_TYPES.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-textMuted mb-1 block">Lender / Bank Name</label>
                    <input
                      type="text"
                      placeholder="e.g. State Bank of India"
                      value={formData.lenderName}
                      onChange={e => setFormData({ ...formData, lenderName: e.target.value })}
                      className="w-full bg-background border border-glass rounded-lg px-3 py-2 text-sm text-textMain"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-textMuted mb-1 block">Loan / Account Number</label>
                    <input
                      type="text"
                      placeholder="Account #"
                      value={formData.accountNumber}
                      onChange={e => setFormData({ ...formData, accountNumber: e.target.value })}
                      className="w-full bg-background border border-glass rounded-lg px-3 py-2 text-sm text-textMain"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-textMuted mb-1 block">Principal Amount (₹) *</label>
                    <input
                      required
                      type="number"
                      placeholder="e.g. 2500000"
                      value={formData.principalAmount}
                      onChange={e => setFormData({ ...formData, principalAmount: e.target.value })}
                      className="w-full bg-background border border-glass rounded-lg px-3 py-2 text-sm text-textMain"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-textMuted mb-1 block">Annual Interest Rate (%) *</label>
                    <input
                      required
                      type="number"
                      step="0.05"
                      placeholder="e.g. 8.5"
                      value={formData.interestRate}
                      onChange={e => setFormData({ ...formData, interestRate: e.target.value })}
                      className="w-full bg-background border border-glass rounded-lg px-3 py-2 text-sm text-textMain"
                    />
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
                    <label className="text-xs text-textMuted mb-1 block">Maturity Date *</label>
                    <input
                      required
                      type="date"
                      value={formData.endDate}
                      onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                      className="w-full bg-background border border-glass rounded-lg px-3 py-2 text-sm text-textMain"
                    />
                  </div>
                </div>

                <div className="bg-surface/50 p-3 rounded-xl border border-glass flex justify-between items-center text-xs">
                  <span className="text-textMuted">Auto-Calculated Monthly EMI:</span>
                  <span className="font-bold text-base text-primary">₹{(Number(formData.monthlyPay) || 0).toLocaleString()}</span>
                </div>

                {/* Cloudinary Loan Document Upload */}
                <FileUpload
                  label="Loan Sanction Letter / Agreement PDF (Cloudinary)"
                  currentUrl={formData.documentUrl}
                  onUploadSuccess={(url: string) => setFormData({ ...formData, documentUrl: url })}
                  onRemove={() => setFormData({ ...formData, documentUrl: '' })}
                />

                <div className="flex justify-end gap-3 mt-6 pt-3 border-t border-glass">
                  <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 text-sm text-textMuted hover:text-textMain">Cancel</button>
                  <button type="submit" className="px-5 py-2 bg-primary text-background rounded-lg font-bold text-sm shadow-neon-primary-sm hover:opacity-95">
                    {editId ? 'Update Loan' : 'Save Loan'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Detailed Amortization Modal */}
      <AnimatePresence>
        {showDetailModal && activeLoan && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 overflow-y-auto custom-scrollbar p-2 md:p-6" onClick={() => setShowDetailModal(false)}>
            <div className="flex min-h-full justify-center items-start">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="glass-panel w-full max-w-4xl relative text-left my-4 overflow-hidden"
                onClick={e => e.stopPropagation()}
              >
                {(() => {
                  const schedule = generateSchedule(activeLoan.startDate, activeLoan.endDate, activeLoan.principalAmount, activeLoan.interestRate, activeLoan.monthlyPay, activeLoan.disbursalDate);
                  const totalMonths = schedule.length;
                  const paidMonths = activeLoan.paidMonths || [];

                  let trueTotalPayable = 0;
                  let trueInterest = 0;
                  let paidAmount = 0;

                  schedule.forEach(month => {
                    trueTotalPayable += month.totalInstallment;
                    trueInterest += month.interestAmount;
                    if (paidMonths.includes(month.monthString)) {
                      paidAmount += month.totalInstallment;
                    }
                  });

                  const unpaidAmount = trueTotalPayable - paidAmount;

                  return (
                    <div>
                      {/* Modal Header */}
                      <div className="p-6 border-b border-glass flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <Landmark size={26} className="text-primary" />
                            <h2 className="text-2xl font-bold text-textMain">{activeLoan.loanName}</h2>
                          </div>
                          <p className="text-xs text-textMuted">
                            {activeLoan.lenderName || activeLoan.loanType} • Click any row to mark installment paid/unpaid (instantly synced with Finance Tracker).
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleExportScheduleCSV(activeLoan)}
                            className="bg-surface border border-glass px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 text-textMuted hover:text-textMain"
                          >
                            <Download size={13} /> Export Schedule
                          </button>
                          <button
                            onClick={() => setShowDetailModal(false)}
                            className="p-1.5 rounded-lg text-textMuted hover:text-textMain"
                          >
                            <X size={20} />
                          </button>
                        </div>
                      </div>

                      {/* Statistics Row */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-6 bg-surface/30 border-b border-glass">
                        <div className="glass-panel p-3 text-center">
                          <p className="text-[10px] text-textMuted uppercase font-semibold">Principal</p>
                          <p className="text-lg font-bold text-textMain">₹{(Number(activeLoan.principalAmount) || 0).toLocaleString()}</p>
                        </div>
                        <div className="glass-panel p-3 text-center border-b-2 border-red-500">
                          <p className="text-[10px] text-textMuted uppercase font-semibold">Total Interest</p>
                          <p className="text-lg font-bold text-red-400">₹{Math.round(trueInterest).toLocaleString()}</p>
                        </div>
                        <div className="glass-panel p-3 text-center border-b-2 border-green-500">
                          <p className="text-[10px] text-textMuted uppercase font-semibold">Amount Paid</p>
                          <p className="text-lg font-bold text-green-400">₹{Math.round(paidAmount).toLocaleString()}</p>
                        </div>
                        <div className="glass-panel p-3 text-center border-b-2 border-amber-400">
                          <p className="text-[10px] text-textMuted uppercase font-semibold">Balance Due</p>
                          <p className="text-lg font-bold text-amber-400">₹{Math.round(unpaidAmount).toLocaleString()}</p>
                        </div>
                      </div>

                      {/* Amortization Table */}
                      <div className="p-6">
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="text-sm font-bold text-textMain">
                            Amortization Schedule ({paidMonths.length} / {totalMonths} EMIs Paid)
                          </h3>
                        </div>

                        <div className="overflow-x-auto max-h-[420px] custom-scrollbar border border-glass rounded-xl">
                          <table className="w-full text-left border-collapse whitespace-nowrap text-xs">
                            <thead className="sticky top-0 bg-background/90 backdrop-blur z-10 border-b border-glass">
                              <tr className="text-textMuted uppercase text-[10px] tracking-wider">
                                <th className="py-2.5 px-3 font-semibold">#</th>
                                <th className="py-2.5 px-3 font-semibold">Month</th>
                                <th className="py-2.5 px-3 font-semibold text-right">Principal (₹)</th>
                                <th className="py-2.5 px-3 font-semibold text-right">Interest (₹)</th>
                                <th className="py-2.5 px-3 font-semibold text-right">Installment (₹)</th>
                                <th className="py-2.5 px-3 font-semibold text-right">Balance (₹)</th>
                                <th className="py-2.5 px-3 font-semibold text-center">Paid</th>
                              </tr>
                            </thead>
                            <tbody>
                              {schedule.map(m => {
                                const isPaid = paidMonths.includes(m.monthString);
                                return (
                                  <tr
                                    key={m.monthString}
                                    onClick={() => togglePayment(m.monthString)}
                                    className={`cursor-pointer transition-colors border-b border-glass/40 hover:bg-surface/80 ${
                                      isPaid ? 'bg-green-500/10 text-green-400' : 'text-textMain'
                                    }`}
                                  >
                                    <td className="py-2 px-3 font-medium">{m.instNo}</td>
                                    <td className="py-2 px-3">{m.label}</td>
                                    <td className="py-2 px-3 text-right">{m.principalAmount.toLocaleString()}</td>
                                    <td className="py-2 px-3 text-right text-textMuted">{m.interestAmount.toLocaleString()}</td>
                                    <td className="py-2 px-3 text-right font-bold text-primary">{m.totalInstallment.toLocaleString()}</td>
                                    <td className="py-2 px-3 text-right text-textMuted">{m.outstandingBalance.toLocaleString()}</td>
                                    <td className="py-2 px-3 text-center">
                                      {isPaid ? (
                                        <CheckCircle2 size={16} className="text-green-400 inline" />
                                      ) : (
                                        <div className="w-4 h-4 rounded-full border border-glass inline-block" />
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title="Delete Loan Account"
        message={`Are you sure you want to permanently delete "${deleteModal.title}" and its payment ledger entries?`}
        confirmText="Delete Loan"
        isDestructive={true}
        onConfirm={confirmDeleteAction}
        onCancel={() => setDeleteModal({ isOpen: false, id: '', title: '' })}
      />
    </div>
  );
}
