import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, TrendingDown, PiggyBank, Target, Receipt, Pill, 
  CheckSquare, Car, AlertTriangle, FileDigit, CloudRain, Activity, 
  Zap, Sparkles, Clock, Landmark, ShieldCheck, ChevronRight, Plus, 
  ArrowUpRight, ArrowDownRight, Droplets, HeartPulse, Sprout
} from 'lucide-react';
import { useContextEngineStore } from '../store/useContextEngineStore';
import { useNavigate } from 'react-router-dom';
import { DashboardService, FinanceService, getActiveUserId } from '../services/firestoreService';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

const Widget = ({ title, icon, value, subtext, color = "text-primary", onClick }: any) => (
  <motion.div 
    whileHover={{ y: -4 }}
    onClick={onClick}
    className="glass-panel p-5 cursor-pointer hover:bg-surfaceLight transition-all relative overflow-hidden group border border-glass"
  >
    <div className={`absolute -right-4 -top-4 w-24 h-24 bg-current opacity-5 rounded-full group-hover:scale-150 transition-transform ${color}`} />
    <div className="flex items-start justify-between mb-3 relative z-10">
      <div className={`p-2.5 rounded-xl bg-surface border border-glass ${color}`}>
        {icon}
      </div>
      <ChevronRight size={16} className="text-textMuted group-hover:text-primary transition-colors" />
    </div>
    <div className="relative z-10">
      <h3 className="text-textMuted text-xs font-semibold uppercase tracking-wider mb-1">{title}</h3>
      <div className="text-2xl font-bold text-textMain tracking-wide">{value}</div>
      {subtext && (
        <p className={`text-xs mt-1.5 font-medium ${
          subtext.includes('-') || subtext.includes('Due') || subtext.includes('Overdue') 
            ? 'text-red-400' 
            : 'text-green-400'
        }`}>
          {subtext}
        </p>
      )}
    </div>
  </motion.div>
);

const DEFAULT_DASHBOARD_DATA = {
  finance: {
    todaysExpense: 0,
    monthlyIncome: 0,
    currentSavings: 0,
    budgetStatus: 0
  },
  actionRequired: {
    upcomingBill: null,
    medicine: null,
    vehicleAlert: null
  },
  domainSnapshots: {
    milkProduction: 0,
    activeCrops: 0,
    pendingTasks: 0,
    recentActivity: 0,
    totalLoanPrincipal: 0,
    totalMonthlyEMI: 0
  },
  aiSuggestions: [
    "Welcome to Vynora! Your personal operating system is synchronized with Cloud Firestore.",
    "Track finances, vehicle fitness, dairy yields, and tasks to see real-time proactive alerts."
  ]
};

export default function Dashboard() {
  const { user } = useContextEngineStore();
  const navigate = useNavigate();
  const activeUid = getActiveUserId(user?.id);

  const [data, setData] = useState<any>(DEFAULT_DASHBOARD_DATA);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);

  // Time-aware greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  useEffect(() => {
    let isMounted = true;
    const fetchDashboard = async () => {
      try {
        const [overview, txs] = await Promise.all([
          DashboardService.getOverview(activeUid),
          FinanceService.getTransactions(activeUid)
        ]);
        if (isMounted) {
          setData(overview);
          setRecentTransactions(txs.slice(0, 4));
          setIsOffline(false);
        }
      } catch (e) {
        console.warn('Dashboard Firestore fetch error, using default overview data:', e);
        if (isMounted) {
          setData(DEFAULT_DASHBOARD_DATA);
          setIsOffline(true);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchDashboard();
    return () => { isMounted = false; };
  }, [user]);

  if (loading) {
    return <LoadingSpinner message="Aggregating all 18 modules for your daily life dashboard..." />;
  }

  const { finance, actionRequired, domainSnapshots, aiSuggestions = [] } = data || DEFAULT_DASHBOARD_DATA;

  return (
    <div className="space-y-8 pb-10">
      {/* Personalized Greeting Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-3xl font-bold tracking-wider text-textMain">
              {getGreeting()}, {user?.name?.split(' ')[0] || 'Aravindh'}
            </h1>
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-500/10 text-green-400 border border-green-500/20">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" /> Live Cloud Sync
            </span>
          </div>
          <p className="text-textMuted text-sm">
            Here is your live daily pulse across finance, health, vehicles, farm, and home.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => navigate('/finance')}
            className="px-3 py-1.5 bg-surface border border-glass hover:bg-surfaceLight rounded-xl text-xs font-semibold text-textMain flex items-center gap-1.5 transition-colors"
          >
            <Plus size={14} className="text-primary" /> Record Expense
          </button>
          <button
            onClick={() => navigate('/tasks')}
            className="px-3 py-1.5 bg-surface border border-glass hover:bg-surfaceLight rounded-xl text-xs font-semibold text-textMain flex items-center gap-1.5 transition-colors"
          >
            <CheckSquare size={14} className="text-amber-400" /> New Task
          </button>
          <button
            onClick={() => navigate('/locker')}
            className="px-3 py-1.5 bg-surface border border-glass hover:bg-surfaceLight rounded-xl text-xs font-semibold text-textMain flex items-center gap-1.5 transition-colors"
          >
            <ShieldCheck size={14} className="text-blue-400" /> Vault Doc
          </button>
        </div>
      </div>

      {isOffline && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-center justify-between gap-4 text-amber-300 text-xs">
          <div className="flex items-center gap-3">
            <AlertTriangle size={18} className="text-amber-400 shrink-0" />
            <span>Database offline: Displaying localized snapshot data until cloud reconnects.</span>
          </div>
          <span className="px-2 py-0.5 bg-amber-500/20 rounded font-mono">Offline Fallback</span>
        </div>
      )}

      {/* Row 1: Primary Finance Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Widget 
          title="Today's Expense" 
          icon={<TrendingDown size={22} />} 
          value={`₹${(finance.todaysExpense || 0).toLocaleString()}`} 
          subtext="From active ledger" 
          color="text-red-400" 
          onClick={() => navigate('/finance')} 
        />
        <Widget 
          title="Monthly Income" 
          icon={<TrendingUp size={22} />} 
          value={`₹${(finance.monthlyIncome || 0).toLocaleString()}`} 
          subtext="This month" 
          color="text-green-400" 
          onClick={() => navigate('/finance')} 
        />
        <Widget 
          title="Net Savings Balance" 
          icon={<PiggyBank size={22} />} 
          value={`₹${(finance.currentSavings || 0).toLocaleString()}`} 
          subtext="All accounts" 
          color="text-primary" 
          onClick={() => navigate('/finance')} 
        />
        <Widget 
          title="Budget Utilization" 
          icon={<Target size={22} />} 
          value={`${finance.budgetStatus || 0}%`} 
          subtext={(finance.budgetStatus || 0) > 85 ? "Over budget limit!" : "Within limits"} 
          color={(finance.budgetStatus || 0) > 85 ? "text-red-400" : "text-purple-400"} 
          onClick={() => navigate('/finance')} 
        />
      </div>

      {/* Row 2: Action Required Alerts & AI Contextual Engine */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Action Required Box */}
        <div className="glass-panel p-6 lg:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-base font-bold flex items-center gap-2 text-textMain">
                <Zap className="text-yellow-400" size={18} /> Priority Actions & Upcoming Reminders
              </h2>
              <span className="text-xs text-textMuted">Proactive checks</span>
            </div>

            <div className="space-y-3">
              {/* Bill reminder */}
              {actionRequired.upcomingBill ? (
                <div 
                  onClick={() => navigate('/bills')} 
                  className="flex items-center justify-between p-3.5 bg-surface border border-glass rounded-xl hover:bg-surfaceLight cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-red-400/20 text-red-400 rounded-lg">
                      <Receipt size={18} />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-textMain">{actionRequired.upcomingBill.title}</p>
                      <p className="text-xs text-textMuted">Amount Payable: ₹{actionRequired.upcomingBill.amount}</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-red-400 bg-red-400/10 px-2.5 py-1 rounded-lg border border-red-400/20">
                    Due {new Date(actionRequired.upcomingBill.dueDate).toLocaleDateString()}
                  </span>
                </div>
              ) : (
                <div className="text-xs text-textMuted p-3 text-center border border-dashed border-glass rounded-xl">
                  No upcoming bills due this week.
                </div>
              )}

              {/* Medicine reminder */}
              {actionRequired.medicine ? (
                <div 
                  onClick={() => navigate('/medicine')} 
                  className="flex items-center justify-between p-3.5 bg-surface border border-glass rounded-xl hover:bg-surfaceLight cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-400/20 text-blue-400 rounded-lg">
                      <Pill size={18} />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-textMain">{actionRequired.medicine.name}</p>
                      <p className="text-xs text-textMuted">{actionRequired.medicine.dosage} • Daily Routine</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-blue-400 bg-blue-400/10 px-2.5 py-1 rounded-lg border border-blue-400/20">
                    Take Dose
                  </span>
                </div>
              ) : (
                <div className="text-xs text-textMuted p-3 text-center border border-dashed border-glass rounded-xl">
                  No active medicine courses scheduled.
                </div>
              )}

              {/* Vehicle Alert */}
              {actionRequired.vehicleAlert ? (
                <div 
                  onClick={() => navigate('/vehicles')} 
                  className="flex items-center justify-between p-3.5 bg-surface border border-glass rounded-xl hover:bg-surfaceLight cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-amber-400/20 text-amber-400 rounded-lg">
                      <Car size={18} />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-textMain">Vehicle Certificate Expiry</p>
                      <p className="text-xs text-textMuted">{actionRequired.vehicleAlert.message}</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded-lg border border-amber-400/20">
                    Renew Now
                  </span>
                </div>
              ) : null}
            </div>
          </div>

          {/* Quick Domain summary bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-4 mt-4 border-t border-glass text-xs">
            <div onClick={() => navigate('/loans')} className="cursor-pointer hover:bg-surface p-2 rounded-lg transition-colors">
              <span className="text-textMuted block">Active EMI</span>
              <strong className="text-primary">₹{(domainSnapshots.totalMonthlyEMI || 0).toLocaleString()}</strong>
            </div>
            <div onClick={() => navigate('/tasks')} className="cursor-pointer hover:bg-surface p-2 rounded-lg transition-colors">
              <span className="text-textMuted block">Pending Tasks</span>
              <strong className="text-amber-400">{domainSnapshots.pendingTasks || 0} tasks</strong>
            </div>
            <div onClick={() => navigate('/dairy')} className="cursor-pointer hover:bg-surface p-2 rounded-lg transition-colors">
              <span className="text-textMuted block">Dairy Herd</span>
              <strong className="text-green-400">{domainSnapshots.milkProduction || 0} L today</strong>
            </div>
            <div onClick={() => navigate('/agriculture')} className="cursor-pointer hover:bg-surface p-2 rounded-lg transition-colors">
              <span className="text-textMuted block">Active Crops</span>
              <strong className="text-blue-400">{domainSnapshots.activeCrops || 0} fields</strong>
            </div>
          </div>
        </div>

        {/* AI Contextual Engine Card */}
        <div className="glass-panel p-6 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute inset-0 bg-primary/5 blur-3xl rounded-full pointer-events-none" />
          <div>
            <h2 className="text-base font-bold mb-4 flex items-center gap-2 text-textMain relative z-10">
              <Sparkles className="text-primary" size={18} /> Vynora Context Engine
            </h2>
            <div className="space-y-3 relative z-10">
              {aiSuggestions.map((suggestion: string, idx: number) => (
                <div key={idx} className="bg-surface/80 border border-glass p-3 rounded-xl text-xs text-textMuted leading-relaxed">
                  "{suggestion}"
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-glass relative z-10 flex justify-between items-center text-xs">
            <span className="text-textMuted">Intelligence Server:</span>
            <span className="text-green-400 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400" /> Operational
            </span>
          </div>
        </div>
      </div>

      {/* Row 3: Domain Snapshots & Recent Ledger Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recent Transactions Mini-Ledger */}
        <div className="lg:col-span-7 glass-panel p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-base font-bold text-textMain flex items-center gap-2">
              <Activity size={18} className="text-primary" /> Recent Ledger Activity
            </h2>
            <button
              onClick={() => navigate('/finance')}
              className="text-xs text-primary hover:underline font-semibold flex items-center gap-1"
            >
              View All <ChevronRight size={14} />
            </button>
          </div>

          {recentTransactions.length === 0 ? (
            <p className="text-xs text-textMuted text-center py-8">No transactions recorded yet.</p>
          ) : (
            <div className="divide-y divide-glass/40">
              {recentTransactions.map(tx => (
                <div key={tx._id || tx.id} className="py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg border ${
                      tx.type === 'income' 
                        ? 'bg-green-500/10 border-green-500/20 text-green-400' 
                        : 'bg-red-500/10 border-red-500/20 text-red-400'
                    }`}>
                      {tx.type === 'income' ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-textMain">{tx.title || tx.category}</p>
                      <p className="text-[10px] text-textMuted">{tx.category} • {new Date(tx.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <span className={`text-xs font-bold ${tx.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                    {tx.type === 'income' ? '+' : '-'}₹{(Number(tx.amount) || 0).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Domain Snapshots Grid */}
        <div className="lg:col-span-5 grid grid-cols-2 gap-4">
          <Widget 
            title="Farm Parcels" 
            icon={<Sprout size={20} />} 
            value={`${domainSnapshots.activeCrops || 0}`} 
            subtext="Crops planted" 
            color="text-emerald-400" 
            onClick={() => navigate('/agriculture')} 
          />
          <Widget 
            title="Cattle Fleet" 
            icon={<FileDigit size={20} />} 
            value={`${domainSnapshots.milkProduction || 0} L`} 
            subtext="Daily milk log" 
            color="text-primary" 
            onClick={() => navigate('/dairy')} 
          />
          <Widget 
            title="Loan Debts" 
            icon={<Landmark size={20} />} 
            value={`₹${(domainSnapshots.totalLoanPrincipal || 0).toLocaleString()}`} 
            subtext="Total principal" 
            color="text-yellow-400" 
            onClick={() => navigate('/loans')} 
          />
          <Widget 
            title="Tasks Tracker" 
            icon={<CheckSquare size={20} />} 
            value={`${domainSnapshots.pendingTasks || 0}`} 
            subtext="Action pending" 
            color="text-blue-400" 
            onClick={() => navigate('/tasks')} 
          />
        </div>
      </div>
    </div>
  );
}
