import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, ArrowUpRight, ArrowDownRight, IndianRupee, Filter, Download,
  Edit2, Trash2, Wallet, ArrowRightLeft, CreditCard, Banknote, Target,
  Receipt, Calendar, ShieldCheck, CheckCircle2
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useContextEngineStore } from '../store/useContextEngineStore';
import { FinanceService, getActiveUserId } from '../services/firestoreService';
import { exportToCSV } from '../utils/csvExport';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { SearchFilterBar } from '../components/common/SearchFilterBar';
import { FileUpload } from '../components/common/FileUpload';
import { EmptyState } from '../components/common/EmptyState';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

const CATEGORIES = [
  'Food & Dining', 'Housing & Rent', 'Utilities & Bills', 'Transportation',
  'Healthcare', 'Education', 'Shopping', 'Entertainment', 'Agriculture',
  'Dairy & Livestock', 'Investments', 'Salary / Wages', 'Business', 'Other'
];

const ACCOUNT_TYPES = [
  { label: 'Bank Account', value: 'Bank' },
  { label: 'Cash in Hand', value: 'Cash' },
  { label: 'Digital Wallet (UPI/Paytm)', value: 'Wallet' },
  { label: 'Credit Card', value: 'CreditCard' },
  { label: 'Savings & Emergency Fund', value: 'Savings' }
];

export default function FinanceTracker() {
  const { user } = useContextEngineStore();
  const activeUid = getActiveUserId(user?.id);

  const [activeTab, setActiveTab] = useState<'transactions' | 'accounts' | 'budgets'>('transactions');
  const [loading, setLoading] = useState(true);

  // Transactions State
  const [transactions, setTransactions] = useState<any[]>([]);
  const [summary, setSummary] = useState({ totalIncome: 0, totalExpense: 0, balance: 0, categoryBreakdown: {} });
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');

  // Accounts State
  const [accounts, setAccounts] = useState<any[]>([]);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [accountFormData, setAccountFormData] = useState({ name: '', type: 'Bank', balance: '' });

  // Transfer State
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferFormData, setTransferFormData] = useState({
    fromAccountId: '',
    toAccountId: '',
    amount: '',
    notes: '',
    date: new Date().toISOString().split('T')[0]
  });

  // Budgets State
  const [budgets, setBudgets] = useState<any[]>([]);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [budgetFormData, setBudgetFormData] = useState({ category: 'Food & Dining', amount: '' });

  // Transaction Modal State
  const [showTxModal, setShowTxModal] = useState(false);
  const [editTxId, setEditTxId] = useState<string | null>(null);
  const [txFormData, setTxFormData] = useState({
    title: '',
    amount: '',
    type: 'expense',
    category: 'Food & Dining',
    accountId: '',
    paymentMode: 'UPI / Online',
    date: new Date().toISOString().split('T')[0],
    notes: '',
    receiptUrl: ''
  });

  // Delete Confirm
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; type: 'tx' | 'account' } | null>(null);

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [txList, sum, accList, budgetList] = await Promise.all([
        FinanceService.getTransactions(activeUid),
        FinanceService.getSummary(activeUid),
        FinanceService.getAccounts(activeUid),
        FinanceService.getBudgets(activeUid)
      ]);
      setTransactions(txList);
      setSummary(sum);
      setAccounts(accList);
      setBudgets(budgetList);
    } catch (e) {
      console.error('Error fetching finance data:', e);
    } finally {
      setLoading(false);
    }
  };

  // Transaction Submit
  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!txFormData.title.trim() || Number(txFormData.amount) <= 0) return;

    try {
      const payload = {
        ...txFormData,
        amount: Number(txFormData.amount) || 0
      };

      if (editTxId) {
        await FinanceService.updateTransaction(editTxId, payload);
      } else {
        await FinanceService.addTransaction(activeUid, payload);
      }

      setShowTxModal(false);
      setEditTxId(null);
      setTxFormData({
        title: '', amount: '', type: 'expense', category: 'Food & Dining',
        accountId: '', paymentMode: 'UPI / Online',
        date: new Date().toISOString().split('T')[0], notes: '', receiptUrl: ''
      });
      fetchData();
    } catch (e) {
      console.error('Error saving transaction:', e);
    }
  };

  // Account Submit
  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountFormData.name.trim()) return;

    try {
      await FinanceService.addAccount(activeUid, {
        name: accountFormData.name,
        type: accountFormData.type,
        balance: Number(accountFormData.balance) || 0
      });
      setShowAccountModal(false);
      setAccountFormData({ name: '', type: 'Bank', balance: '' });
      fetchData();
    } catch (e) {
      console.error('Error saving account:', e);
    }
  };

  // Transfer Submit
  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(transferFormData.amount) || 0;
    if (amt <= 0 || !transferFormData.fromAccountId || !transferFormData.toAccountId) {
      alert('Please select valid accounts and transfer amount.');
      return;
    }
    if (transferFormData.fromAccountId === transferFormData.toAccountId) {
      alert('Source and destination accounts must be different.');
      return;
    }

    const fromAcc = accounts.find(a => a._id === transferFormData.fromAccountId);
    const toAcc = accounts.find(a => a._id === transferFormData.toAccountId);

    try {
      await FinanceService.transferBetweenAccounts(activeUid, {
        fromAccountId: transferFormData.fromAccountId,
        toAccountId: transferFormData.toAccountId,
        fromAccountName: fromAcc?.name || 'Account',
        toAccountName: toAcc?.name || 'Account',
        amount: amt,
        date: transferFormData.date,
        notes: transferFormData.notes
      });
      setShowTransferModal(false);
      setTransferFormData({ fromAccountId: '', toAccountId: '', amount: '', notes: '', date: new Date().toISOString().split('T')[0] });
      fetchData();
    } catch (e: any) {
      alert(e.message || 'Transfer failed');
    }
  };

  // Budget Submit
  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(budgetFormData.amount) || 0;
    if (amt <= 0) return;

    try {
      await FinanceService.setBudget(activeUid, budgetFormData.category, amt);
      setShowBudgetModal(false);
      setBudgetFormData({ category: 'Food & Dining', amount: '' });
      fetchData();
    } catch (e) {
      console.error('Error saving budget:', e);
    }
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === 'tx') {
        await FinanceService.deleteTransaction(deleteTarget.id);
      } else if (deleteTarget.type === 'account') {
        await FinanceService.deleteAccount(deleteTarget.id);
      }
      setDeleteTarget(null);
      fetchData();
    } catch (e) {
      console.error('Delete error:', e);
    }
  };

  // Edit Transaction Click
  const handleEditTx = (tx: any) => {
    setTxFormData({
      title: tx.title || '',
      amount: String(tx.amount || ''),
      type: tx.type || 'expense',
      category: tx.category || 'Food & Dining',
      accountId: tx.accountId || '',
      paymentMode: tx.paymentMode || 'UPI / Online',
      date: tx.date ? new Date(tx.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      notes: tx.notes || '',
      receiptUrl: tx.receiptUrl || ''
    });
    setEditTxId(tx._id);
    setShowTxModal(true);
  };

  // Filtered Transactions
  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = !searchQuery ||
      t.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.notes?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'All' || t.type === typeFilter;
    const matchesCategory = categoryFilter === 'All' || t.category === categoryFilter;
    return matchesSearch && matchesType && matchesCategory;
  });

  const COLORS = ['#00f2fe', '#4facfe', '#667eea', '#764ba2', '#ff0844', '#f6d365', '#fda085', '#4ade80', '#fbbf24'];
  const pieData = Object.entries(summary.categoryBreakdown || {}).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-wider mb-1 flex items-center gap-3">
            <IndianRupee className="text-primary" size={28} /> Finance Tracker
          </h1>
          <p className="text-textMuted">Complete personal ledger, accounts, budgets, and transfer engine.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => exportToCSV(transactions, `Vynora_Finance_Ledger_${new Date().toISOString().split('T')[0]}`)}
            className="px-3.5 py-2 rounded-xl border border-glass bg-surface hover:bg-surfaceLight text-textMain text-sm font-medium flex items-center gap-2 transition-colors"
          >
            <Download size={16} /> Export CSV
          </button>
          <button
            onClick={() => setShowTransferModal(true)}
            className="px-3.5 py-2 rounded-xl border border-primary/30 bg-primary/10 hover:bg-primary/20 text-primary text-sm font-medium flex items-center gap-2 transition-colors"
          >
            <ArrowRightLeft size={16} /> Transfer
          </button>
          <button
            onClick={() => { setEditTxId(null); setShowTxModal(true); }}
            className="bg-primary text-background px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-primary/90 transition-colors shadow-neon-primary-sm font-medium text-sm"
          >
            <Plus size={18} /> Add Record
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="glass-panel p-5 border-t-4 border-t-primary">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-textMuted font-medium">Net Balance</span>
            <div className="p-2 bg-primary/20 text-primary rounded-lg"><Wallet size={18} /></div>
          </div>
          <div className="text-2xl font-bold text-textMain">₹{summary.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          <p className="text-[11px] text-textMuted mt-1">Total across active accounts</p>
        </div>

        <div className="glass-panel p-5 border-t-4 border-t-green-400">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-textMuted font-medium">Total Income</span>
            <div className="p-2 bg-green-400/20 text-green-400 rounded-lg"><ArrowUpRight size={18} /></div>
          </div>
          <div className="text-2xl font-bold text-green-400">₹{summary.totalIncome.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          <p className="text-[11px] text-textMuted mt-1">Earnings & farm sales</p>
        </div>

        <div className="glass-panel p-5 border-t-4 border-t-red-400">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-textMuted font-medium">Total Expenses</span>
            <div className="p-2 bg-red-400/20 text-red-400 rounded-lg"><ArrowDownRight size={18} /></div>
          </div>
          <div className="text-2xl font-bold text-red-400">₹{summary.totalExpense.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          <p className="text-[11px] text-textMuted mt-1">Bills, lifestyle & inputs</p>
        </div>

        <div className="glass-panel p-5 border-t-4 border-t-purple-400">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-textMuted font-medium">Accounts & Wallets</span>
            <div className="p-2 bg-purple-400/20 text-purple-400 rounded-lg"><CreditCard size={18} /></div>
          </div>
          <div className="text-2xl font-bold text-purple-400">{accounts.length} Active</div>
          <p className="text-[11px] text-textMuted mt-1">Banks, Cash & UPI</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-glass pb-1">
        <button
          onClick={() => setActiveTab('transactions')}
          className={`px-4 py-2 font-medium text-sm rounded-t-xl transition-colors ${
            activeTab === 'transactions'
              ? 'bg-surface text-primary border-t-2 border-primary'
              : 'text-textMuted hover:text-textMain'
          }`}
        >
          Transactions Ledger
        </button>
        <button
          onClick={() => setActiveTab('accounts')}
          className={`px-4 py-2 font-medium text-sm rounded-t-xl transition-colors ${
            activeTab === 'accounts'
              ? 'bg-surface text-primary border-t-2 border-primary'
              : 'text-textMuted hover:text-textMain'
          }`}
        >
          Accounts & Wallets ({accounts.length})
        </button>
        <button
          onClick={() => setActiveTab('budgets')}
          className={`px-4 py-2 font-medium text-sm rounded-t-xl transition-colors ${
            activeTab === 'budgets'
              ? 'bg-surface text-primary border-t-2 border-primary'
              : 'text-textMuted hover:text-textMain'
          }`}
        >
          Budgets & Limits ({budgets.length})
        </button>
      </div>

      {/* TAB 1: TRANSACTIONS */}
      {activeTab === 'transactions' && (
        <div className="space-y-6">
          {/* Charts Row */}
          {pieData.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="glass-panel p-6 h-[320px] flex flex-col">
                <h3 className="text-base font-bold text-textMain mb-2">Expense Category Breakdown</h3>
                <div className="flex-1 w-full min-h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={4} dataKey="value">
                        {pieData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: any) => `₹${Number(value).toLocaleString('en-IN')}`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="glass-panel p-6 h-[320px] flex flex-col justify-between">
                <h3 className="text-base font-bold text-textMain mb-3">Top Spending Categories</h3>
                <div className="space-y-3 overflow-y-auto custom-scrollbar pr-2 flex-1">
                  {pieData.map((item, idx) => {
                    const pct = summary.totalExpense > 0 ? ((Number(item.value) / summary.totalExpense) * 100).toFixed(1) : '0';
                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-xs font-medium">
                          <span className="text-textMain">{item.name}</span>
                          <span className="text-textMuted">₹{Number(item.value).toLocaleString('en-IN')} ({pct}%)</span>
                        </div>
                        <div className="w-full bg-surface h-2 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: COLORS[idx % COLORS.length]
                            }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <SearchFilterBar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              searchPlaceholder="Search description, category, or notes..."
              selectedCategory={categoryFilter}
              onCategoryChange={setCategoryFilter}
              categories={[{ label: 'All Categories', value: 'All' }, ...CATEGORIES.map(c => ({ label: c, value: c }))]}
              totalCount={filteredTransactions.length}
            />
            {/* Type Toggle Pills */}
            <div className="flex items-center gap-1.5 p-1 bg-surface border border-glass rounded-xl self-start sm:self-auto shrink-0">
              {['All', 'income', 'expense', 'transfer'].map(t => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                    typeFilter === t
                      ? 'bg-primary text-background font-semibold shadow-neon-primary-sm'
                      : 'text-textMuted hover:text-textMain'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Transactions Table / List */}
          {loading ? (
            <LoadingSpinner />
          ) : filteredTransactions.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No transactions found"
              description="Start tracking your expenses and earnings or adjust your active search and category filters."
              actionText="Add Transaction"
              onAction={() => { setEditTxId(null); setShowTxModal(true); }}
            />
          ) : (
            <div className="glass-panel overflow-hidden border border-glass">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-glass bg-surface/50 text-xs font-semibold text-textMuted uppercase tracking-wider">
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Title / Purpose</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Payment Mode</th>
                      <th className="py-3 px-4 text-right">Amount</th>
                      <th className="py-3 px-4 text-center">Receipt</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-glass text-sm">
                    {filteredTransactions.map((tx: any) => {
                      const isInc = tx.type === 'income';
                      const isTrf = tx.type === 'transfer' || tx.isTransfer;
                      return (
                        <tr key={tx._id} className="hover:bg-surface/30 transition-colors">
                          <td className="py-3 px-4 whitespace-nowrap text-xs text-textMuted">
                            {tx.date ? new Date(tx.date).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="py-3 px-4 font-medium text-textMain max-w-[220px] truncate">
                            {tx.title}
                            {tx.notes && <span className="block text-[11px] text-textMuted truncate">{tx.notes}</span>}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="text-xs px-2.5 py-1 rounded-full bg-surface border border-glass font-medium text-textMuted">
                              {tx.category || 'General'}
                            </span>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap text-xs text-textMuted">
                            {tx.paymentMode || 'Online'}
                          </td>
                          <td className={`py-3 px-4 text-right font-bold whitespace-nowrap ${
                            isTrf ? 'text-blue-400' : isInc ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {isTrf ? '⇄' : isInc ? '+' : '-'} ₹{Number(tx.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            {tx.receiptUrl ? (
                              <a
                                href={tx.receiptUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs text-primary hover:underline font-medium"
                              >
                                View ↗
                              </a>
                            ) : (
                              <span className="text-xs text-textMuted">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleEditTx(tx)}
                                className="p-1.5 text-textMuted hover:text-primary transition-colors rounded-lg hover:bg-surface"
                                title="Edit"
                              >
                                <Edit2 size={15} />
                              </button>
                              <button
                                onClick={() => setDeleteTarget({ id: tx._id, type: 'tx' })}
                                className="p-1.5 text-textMuted hover:text-red-400 transition-colors rounded-lg hover:bg-surface"
                                title="Delete"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ACCOUNTS & WALLETS */}
      {activeTab === 'accounts' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-textMain">Accounts & Wallets</h2>
              <p className="text-sm text-textMuted">Manage checking, savings, cash, and digital payment accounts.</p>
            </div>
            <button
              onClick={() => setShowAccountModal(true)}
              className="bg-primary text-background px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-primary/90 font-medium text-sm shadow-neon-primary-sm"
            >
              <Plus size={16} /> Add Account
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {accounts.map(acc => (
              <div key={acc._id} className="glass-panel p-6 flex flex-col justify-between border-t-4 border-t-purple-400">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-surface border border-glass rounded-xl text-purple-400">
                      {acc.type === 'Cash' ? <Banknote size={22} /> : acc.type === 'CreditCard' ? <CreditCard size={22} /> : <Wallet size={22} />}
                    </div>
                    <div>
                      <h3 className="font-bold text-textMain">{acc.name}</h3>
                      <p className="text-xs text-textMuted capitalize">{acc.type} Account</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setDeleteTarget({ id: acc._id, type: 'account' })}
                    className="text-textMuted hover:text-red-400 p-1"
                    title="Delete Account"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="pt-4 border-t border-glass flex items-center justify-between">
                  <span className="text-xs text-textMuted">Current Balance</span>
                  <span className="text-xl font-bold text-textMain">₹{Number(acc.balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: BUDGETS & SPENDING LIMITS */}
      {activeTab === 'budgets' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-textMain">Monthly Budgets & Category Limits</h2>
              <p className="text-sm text-textMuted">Set monthly spending thresholds to prevent overspending.</p>
            </div>
            <button
              onClick={() => setShowBudgetModal(true)}
              className="bg-primary text-background px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-primary/90 font-medium text-sm shadow-neon-primary-sm"
            >
              <Plus size={16} /> Set Category Budget
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {budgets.map(b => {
              const spent = Number((summary.categoryBreakdown as any)?.[b.category] || 0);
              const budgetLimit = Number(b.amount || 0);
              const pct = budgetLimit > 0 ? Math.min(100, Math.round((spent / budgetLimit) * 100)) : 0;
              const isOver = spent > budgetLimit;

              return (
                <div key={b._id || b.id} className={`glass-panel p-6 border-l-4 ${isOver ? 'border-l-red-500' : 'border-l-primary'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-textMain flex items-center gap-2">
                      <Target size={18} className="text-primary" /> {b.category}
                    </h3>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      isOver ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'
                    }`}>
                      {pct}% Used
                    </span>
                  </div>

                  <div className="space-y-1 mb-4">
                    <div className="flex justify-between text-xs text-textMuted">
                      <span>Spent: ₹{spent.toLocaleString('en-IN')}</span>
                      <span>Limit: ₹{budgetLimit.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="w-full bg-surface h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${isOver ? 'bg-red-500' : 'bg-primary'}`}
                        style={{ width: `${pct}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="text-xs text-textMuted flex justify-between items-center pt-3 border-t border-glass">
                    <span>Remaining:</span>
                    <span className={`font-bold ${isOver ? 'text-red-400' : 'text-textMain'}`}>
                      {isOver ? `Over by ₹${(spent - budgetLimit).toLocaleString('en-IN')}` : `₹${(budgetLimit - spent).toLocaleString('en-IN')}`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TRANSACTION MODAL */}
      <AnimatePresence>
        {showTxModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowTxModal(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-panel max-w-lg w-full p-6 border border-glass shadow-neon-primary-sm max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <h2 className="text-xl font-bold text-textMain mb-4">
                {editTxId ? 'Edit Transaction' : 'Record Transaction'}
              </h2>

              <form onSubmit={handleSaveTransaction} className="space-y-4">
                {/* Type toggle */}
                <div className="grid grid-cols-2 gap-3 p-1 bg-surface rounded-xl border border-glass">
                  <button
                    type="button"
                    onClick={() => setTxFormData({ ...txFormData, type: 'expense' })}
                    className={`py-2 text-sm font-semibold rounded-lg transition-colors ${
                      txFormData.type === 'expense' ? 'bg-red-500 text-white shadow-md' : 'text-textMuted'
                    }`}
                  >
                    Expense
                  </button>
                  <button
                    type="button"
                    onClick={() => setTxFormData({ ...txFormData, type: 'income' })}
                    className={`py-2 text-sm font-semibold rounded-lg transition-colors ${
                      txFormData.type === 'income' ? 'bg-green-500 text-white shadow-md' : 'text-textMuted'
                    }`}
                  >
                    Income
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-medium text-textMuted mb-1">Title / Description *</label>
                  <input
                    type="text"
                    required
                    value={txFormData.title}
                    onChange={(e) => setTxFormData({ ...txFormData, title: e.target.value })}
                    placeholder="e.g. Grocery Shopping, Client Invoice"
                    className="w-full bg-surface border border-glass rounded-xl px-4 py-2 text-sm text-textMain focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-textMuted mb-1">Amount (₹) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={txFormData.amount}
                      onChange={(e) => setTxFormData({ ...txFormData, amount: e.target.value })}
                      placeholder="0.00"
                      className="w-full bg-surface border border-glass rounded-xl px-4 py-2 text-sm text-textMain focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-textMuted mb-1">Date *</label>
                    <input
                      type="date"
                      required
                      value={txFormData.date}
                      onChange={(e) => setTxFormData({ ...txFormData, date: e.target.value })}
                      className="w-full bg-surface border border-glass rounded-xl px-4 py-2 text-sm text-textMain focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-textMuted mb-1">Category</label>
                    <select
                      value={txFormData.category}
                      onChange={(e) => setTxFormData({ ...txFormData, category: e.target.value })}
                      className="w-full bg-surface border border-glass rounded-xl px-4 py-2 text-sm text-textMain focus:outline-none focus:border-primary"
                    >
                      {CATEGORIES.map(c => <option key={c} value={c} className="bg-surface">{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-textMuted mb-1">Payment Mode</label>
                    <select
                      value={txFormData.paymentMode}
                      onChange={(e) => setTxFormData({ ...txFormData, paymentMode: e.target.value })}
                      className="w-full bg-surface border border-glass rounded-xl px-4 py-2 text-sm text-textMain focus:outline-none focus:border-primary"
                    >
                      <option value="UPI / Online">UPI / Online</option>
                      <option value="Cash">Cash</option>
                      <option value="Credit Card">Credit Card</option>
                      <option value="Debit Card">Debit Card</option>
                      <option value="Net Banking">Net Banking</option>
                      <option value="Cheque">Cheque</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-textMuted mb-1">Account</label>
                  <select
                    value={txFormData.accountId}
                    onChange={(e) => setTxFormData({ ...txFormData, accountId: e.target.value })}
                    className="w-full bg-surface border border-glass rounded-xl px-4 py-2 text-sm text-textMain focus:outline-none focus:border-primary"
                  >
                    <option value="">Default / General</option>
                    {accounts.map(a => <option key={a._id} value={a._id} className="bg-surface">{a.name} (₹{a.balance})</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-textMuted mb-1">Notes (Optional)</label>
                  <textarea
                    rows={2}
                    value={txFormData.notes}
                    onChange={(e) => setTxFormData({ ...txFormData, notes: e.target.value })}
                    placeholder="Additional details..."
                    className="w-full bg-surface border border-glass rounded-xl px-4 py-2 text-sm text-textMain focus:outline-none focus:border-primary"
                  />
                </div>

                {/* Receipt Upload */}
                <FileUpload
                  label="Attach Receipt / Invoice (Cloudinary)"
                  currentUrl={txFormData.receiptUrl}
                  onUploadSuccess={(url) => setTxFormData({ ...txFormData, receiptUrl: url })}
                  onRemove={() => setTxFormData({ ...txFormData, receiptUrl: '' })}
                />

                <div className="flex justify-end gap-3 pt-3 border-t border-glass">
                  <button
                    type="button"
                    onClick={() => setShowTxModal(false)}
                    className="px-4 py-2 rounded-xl border border-glass text-textMuted hover:text-textMain text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-primary text-background px-5 py-2 rounded-xl font-medium text-sm hover:bg-primary/90 shadow-neon-primary-sm"
                  >
                    {editTxId ? 'Update Record' : 'Save Record'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ACCOUNT MODAL */}
      <AnimatePresence>
        {showAccountModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowAccountModal(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-panel max-w-md w-full p-6 border border-glass shadow-neon-primary-sm"
            >
              <h2 className="text-xl font-bold text-textMain mb-4">Add Account or Wallet</h2>
              <form onSubmit={handleSaveAccount} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-textMuted mb-1">Account Name *</label>
                  <input
                    type="text"
                    required
                    value={accountFormData.name}
                    onChange={(e) => setAccountFormData({ ...accountFormData, name: e.target.value })}
                    placeholder="e.g. HDFC Salary, Wallet, Petty Cash"
                    className="w-full bg-surface border border-glass rounded-xl px-4 py-2 text-sm text-textMain focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-textMuted mb-1">Account Type</label>
                  <select
                    value={accountFormData.type}
                    onChange={(e) => setAccountFormData({ ...accountFormData, type: e.target.value })}
                    className="w-full bg-surface border border-glass rounded-xl px-4 py-2 text-sm text-textMain focus:outline-none focus:border-primary"
                  >
                    {ACCOUNT_TYPES.map(t => <option key={t.value} value={t.value} className="bg-surface">{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-textMuted mb-1">Opening Balance (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={accountFormData.balance}
                    onChange={(e) => setAccountFormData({ ...accountFormData, balance: e.target.value })}
                    placeholder="0.00"
                    className="w-full bg-surface border border-glass rounded-xl px-4 py-2 text-sm text-textMain focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-3 border-t border-glass">
                  <button type="button" onClick={() => setShowAccountModal(false)} className="px-4 py-2 rounded-xl border border-glass text-textMuted text-sm">Cancel</button>
                  <button type="submit" className="bg-primary text-background px-5 py-2 rounded-xl font-medium text-sm hover:bg-primary/90 shadow-neon-primary-sm">Create Account</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* TRANSFER MODAL */}
      <AnimatePresence>
        {showTransferModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowTransferModal(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-panel max-w-md w-full p-6 border border-glass shadow-neon-primary-sm"
            >
              <h2 className="text-xl font-bold text-textMain mb-2 flex items-center gap-2">
                <ArrowRightLeft className="text-primary" size={22} /> Inter-Account Transfer
              </h2>
              <p className="text-xs text-textMuted mb-4">Transfers move money between your accounts without counting as income or expense.</p>

              <form onSubmit={handleTransfer} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-textMuted mb-1">From Account *</label>
                  <select
                    required
                    value={transferFormData.fromAccountId}
                    onChange={(e) => setTransferFormData({ ...transferFormData, fromAccountId: e.target.value })}
                    className="w-full bg-surface border border-glass rounded-xl px-4 py-2 text-sm text-textMain focus:outline-none focus:border-primary"
                  >
                    <option value="">Select Source Account</option>
                    {accounts.map(a => <option key={a._id} value={a._id} className="bg-surface">{a.name} (Balance: ₹{a.balance})</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-textMuted mb-1">To Account *</label>
                  <select
                    required
                    value={transferFormData.toAccountId}
                    onChange={(e) => setTransferFormData({ ...transferFormData, toAccountId: e.target.value })}
                    className="w-full bg-surface border border-glass rounded-xl px-4 py-2 text-sm text-textMain focus:outline-none focus:border-primary"
                  >
                    <option value="">Select Destination Account</option>
                    {accounts.map(a => <option key={a._id} value={a._id} className="bg-surface">{a.name} (Balance: ₹{a.balance})</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-textMuted mb-1">Amount (₹) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={transferFormData.amount}
                      onChange={(e) => setTransferFormData({ ...transferFormData, amount: e.target.value })}
                      placeholder="0.00"
                      className="w-full bg-surface border border-glass rounded-xl px-4 py-2 text-sm text-textMain focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-textMuted mb-1">Date</label>
                    <input
                      type="date"
                      value={transferFormData.date}
                      onChange={(e) => setTransferFormData({ ...transferFormData, date: e.target.value })}
                      className="w-full bg-surface border border-glass rounded-xl px-4 py-2 text-sm text-textMain focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-textMuted mb-1">Notes</label>
                  <input
                    type="text"
                    value={transferFormData.notes}
                    onChange={(e) => setTransferFormData({ ...transferFormData, notes: e.target.value })}
                    placeholder="e.g. ATM withdrawal, UPI funding"
                    className="w-full bg-surface border border-glass rounded-xl px-4 py-2 text-sm text-textMain focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-glass">
                  <button type="button" onClick={() => setShowTransferModal(false)} className="px-4 py-2 rounded-xl border border-glass text-textMuted text-sm">Cancel</button>
                  <button type="submit" className="bg-primary text-background px-5 py-2 rounded-xl font-medium text-sm hover:bg-primary/90 shadow-neon-primary-sm">Execute Transfer</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* BUDGET MODAL */}
      <AnimatePresence>
        {showBudgetModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowBudgetModal(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-panel max-w-md w-full p-6 border border-glass shadow-neon-primary-sm"
            >
              <h2 className="text-xl font-bold text-textMain mb-4">Set Category Monthly Budget</h2>
              <form onSubmit={handleSaveBudget} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-textMuted mb-1">Category</label>
                  <select
                    value={budgetFormData.category}
                    onChange={(e) => setBudgetFormData({ ...budgetFormData, category: e.target.value })}
                    className="w-full bg-surface border border-glass rounded-xl px-4 py-2 text-sm text-textMain focus:outline-none focus:border-primary"
                  >
                    {CATEGORIES.map(c => <option key={c} value={c} className="bg-surface">{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-textMuted mb-1">Monthly Limit (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={budgetFormData.amount}
                    onChange={(e) => setBudgetFormData({ ...budgetFormData, amount: e.target.value })}
                    placeholder="e.g. 15000"
                    className="w-full bg-surface border border-glass rounded-xl px-4 py-2 text-sm text-textMain focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-3 border-t border-glass">
                  <button type="button" onClick={() => setShowBudgetModal(false)} className="px-4 py-2 rounded-xl border border-glass text-textMuted text-sm">Cancel</button>
                  <button type="submit" className="bg-primary text-background px-5 py-2 rounded-xl font-medium text-sm hover:bg-primary/90 shadow-neon-primary-sm">Save Budget</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CONFIRM DELETE MODAL */}
      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title={deleteTarget?.type === 'tx' ? 'Delete Transaction' : 'Delete Account'}
        message="Are you sure you want to permanently delete this item? This action cannot be undone."
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
