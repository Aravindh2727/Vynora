import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, TrendingDown, PiggyBank, Target, Receipt, Pill, 
  CheckSquare, Car, AlertTriangle, FileDigit, Landmark, ChevronRight, Plus, 
  ArrowUpRight, ArrowDownRight, HeartPulse, Sprout, CreditCard, FileText,
  Tractor, GraduationCap, Box, Key, Users, BarChart, Banknote, ShieldCheck,
  Zap, Sparkles, Activity, Clock
} from 'lucide-react';
import { useContextEngineStore } from '../store/useContextEngineStore';
import { useNavigate } from 'react-router-dom';
import { DashboardService, FinanceService, getActiveUserId } from '../services/firestoreService';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

const Widget = ({ title, icon, value, subtext, color = "text-primary", onClick }: any) => (
  <motion.button
    type="button"
    whileHover={{ y: -2 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className="w-full text-left glass-panel p-2.5 sm:p-3.5 cursor-pointer hover:bg-surfaceLight transition-all relative overflow-hidden group border border-glass min-h-[38px] rounded-xl"
  >
    <div className={`absolute -right-3 -top-3 w-16 h-16 bg-current opacity-5 rounded-full group-hover:scale-150 transition-transform ${color}`} />
    <div className="flex items-start justify-between mb-1.5 relative z-10">
      <div className={`p-1.5 rounded-lg bg-surface border border-glass ${color} [&>svg]:w-4 [&>svg]:h-4`}>
        {icon}
      </div>
      <ChevronRight size={13} className="text-textMuted group-hover:text-primary transition-colors" />
    </div>
    <div className="relative z-10">
      <h3 className="text-textMuted text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider mb-0.5">{title}</h3>
      <div className="text-base sm:text-lg font-bold text-textMain tracking-wide">{value}</div>
      {subtext && (
        <p className={`text-[10px] sm:text-[11px] mt-0.5 font-medium ${
          subtext.includes('-') || subtext.includes('Due') || subtext.includes('Overdue') || subtext.includes('Over')
            ? 'text-red-400' 
            : 'text-green-400'
        }`}>
          {subtext}
        </p>
      )}
    </div>
  </motion.button>
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

  const { finance, actionRequired, domainSnapshots, aiSuggestions = [] } = data || DEFAULT_DASHBOARD_DATA;

  // All Application Modules for the All-Sections Grid (Unified Professional Styling)
  const allModules = [
    {
      id: 'ai',
      title: 'Vynora AI',
      path: '/ai',
      icon: <Sparkles size={18} />,
      color: 'text-primary'
    },
    {
      id: 'finance',
      title: 'Finance',
      path: '/finance',
      icon: <CreditCard size={18} />,
      color: 'text-primary'
    },
    {
      id: 'loans',
      title: 'Loans',
      path: '/loans',
      icon: <Banknote size={18} />,
      color: 'text-primary'
    },
    {
      id: 'digital-locker',
      title: 'Locker',
      path: '/digital-locker',
      icon: <FileText size={18} />,
      color: 'text-primary'
    },
    {
      id: 'tasks',
      title: 'Tasks',
      path: '/tasks',
      icon: <CheckSquare size={18} />,
      color: 'text-primary'
    },
    {
      id: 'medicine',
      title: 'Medicine',
      path: '/medicine',
      icon: <Pill size={18} />,
      color: 'text-primary'
    },
    {
      id: 'bills',
      title: 'Bills',
      path: '/bills',
      icon: <Receipt size={18} />,
      color: 'text-primary'
    },
    {
      id: 'emergency',
      title: 'Emergency',
      path: '/emergency',
      icon: <AlertTriangle size={18} />,
      color: 'text-primary'
    },
    {
      id: 'agriculture',
      title: 'Agriculture',
      path: '/agriculture',
      icon: <Tractor size={18} />,
      color: 'text-primary'
    },
    {
      id: 'dairy',
      title: 'Dairy',
      path: '/dairy',
      icon: <FileDigit size={18} />,
      color: 'text-primary'
    },
    {
      id: 'vehicles',
      title: 'Vehicles',
      path: '/vehicles',
      icon: <Car size={18} />,
      color: 'text-primary'
    },
    {
      id: 'student',
      title: 'Student',
      path: '/student',
      icon: <GraduationCap size={18} />,
      color: 'text-primary'
    },
    {
      id: 'home-inventory',
      title: 'Inventory',
      path: '/home-inventory',
      icon: <Box size={18} />,
      color: 'text-primary'
    },
    {
      id: 'password-vault',
      title: 'Vault',
      path: '/password-vault',
      icon: <Key size={18} />,
      color: 'text-primary'
    },
    {
      id: 'family',
      title: 'Family',
      path: '/family',
      icon: <Users size={18} />,
      color: 'text-primary'
    },
    {
      id: 'health',
      title: 'Health',
      path: '/health',
      icon: <HeartPulse size={18} />,
      color: 'text-primary'
    },
    {
      id: 'goals',
      title: 'Goals',
      path: '/goals',
      icon: <Target size={18} />,
      color: 'text-primary'
    },
    {
      id: 'reports',
      title: 'Reports',
      path: '/reports',
      icon: <BarChart size={18} />,
      color: 'text-primary'
    },
    {
      id: 'settings',
      title: 'Settings',
      path: '/settings',
      icon: <Sparkles size={18} />,
      color: 'text-primary'
    }
  ];

  if (loading) {
    return <LoadingSpinner message="Aggregating all 18 modules for your daily life dashboard..." />;
  }

  return (
    <div className="space-y-4 pb-10">
      {/* Greeting Header — Balanced slightly bigger */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-textMain">
          {getGreeting()}, {user?.name?.split(' ')[0] || 'Aravindh'}
        </h1>
      </div>

      {/* Summary Cards: Clean, responsive, comfortable sizing */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-textMuted flex items-center gap-1.5">
            <Activity size={13} className="text-primary" /> Live Daily Summary
          </h2>
          <span className="text-[11px] text-textMuted">Tap any card to view</span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
          <Widget 
            title="Total Balance" 
            icon={<PiggyBank size={20} />} 
            value={`₹${(finance.currentSavings || 0).toLocaleString()}`} 
            subtext="Available Net" 
            color="text-primary" 
            onClick={() => navigate('/finance')} 
          />
          <Widget 
            title="Today's Expense" 
            icon={<TrendingDown size={20} />} 
            value={`₹${(finance.todaysExpense || 0).toLocaleString()}`} 
            subtext="From active ledger" 
            color="text-red-400" 
            onClick={() => navigate('/finance')} 
          />
          <Widget 
            title="Monthly Income" 
            icon={<TrendingUp size={20} />} 
            value={`₹${(finance.monthlyIncome || 0).toLocaleString()}`} 
            subtext="This month" 
            color="text-green-400" 
            onClick={() => navigate('/finance')} 
          />
          <Widget 
            title="Budget Utilization" 
            icon={<Target size={20} />} 
            value={`${finance.budgetStatus || 0}%`} 
            subtext={(finance.budgetStatus || 0) > 85 ? "Over budget limit!" : "Within limits"} 
            color={(finance.budgetStatus || 0) > 85 ? "text-red-400" : "text-purple-400"} 
            onClick={() => navigate('/finance')} 
          />
        </div>
      </div>

      {/* High-Priority Action Reminders */}
      {(actionRequired.upcomingBill || actionRequired.medicine || actionRequired.vehicleAlert) && (
        <div className="glass-panel p-4 sm:p-5 border-l-4 border-l-amber-400 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-textMain flex items-center gap-2">
              <Zap size={16} className="text-yellow-400" /> Action Required & Reminders
            </h2>
            <span className="text-[10px] text-textMuted font-mono">Real-time alerts</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {/* Bill reminder */}
            {actionRequired.upcomingBill && (
              <button
                type="button"
                onClick={() => navigate('/bills')}
                className="w-full text-left p-3 rounded-xl bg-surface border border-glass hover:bg-surfaceLight transition-colors flex items-center justify-between gap-3 min-h-[44px]"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-2 rounded-lg bg-red-400/20 text-red-400 shrink-0">
                    <Receipt size={16} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-xs text-textMain truncate">{actionRequired.upcomingBill.title}</p>
                    <p className="text-[10px] text-red-400 font-bold">₹{actionRequired.upcomingBill.amount} Due Soon</p>
                  </div>
                </div>
                <ChevronRight size={14} className="text-textMuted shrink-0" />
              </button>
            )}

            {/* Medicine reminder */}
            {actionRequired.medicine && (
              <button
                type="button"
                onClick={() => navigate('/medicine')}
                className="w-full text-left p-3 rounded-xl bg-surface border border-glass hover:bg-surfaceLight transition-colors flex items-center justify-between gap-3 min-h-[44px]"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-2 rounded-lg bg-blue-400/20 text-blue-400 shrink-0">
                    <Pill size={16} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-xs text-textMain truncate">{actionRequired.medicine.name}</p>
                    <p className="text-[10px] text-blue-400 font-bold">{actionRequired.medicine.dosage} • Take Dose</p>
                  </div>
                </div>
                <ChevronRight size={14} className="text-textMuted shrink-0" />
              </button>
            )}

            {/* Vehicle Alert */}
            {actionRequired.vehicleAlert && (
              <button
                type="button"
                onClick={() => navigate('/vehicles')}
                className="w-full text-left p-3 rounded-xl bg-surface border border-glass hover:bg-surfaceLight transition-colors flex items-center justify-between gap-3 min-h-[44px]"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-2 rounded-lg bg-amber-400/20 text-amber-400 shrink-0">
                    <Car size={16} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-xs text-textMain truncate">Vehicle Expiry Alert</p>
                    <p className="text-[10px] text-amber-400 font-bold truncate">{actionRequired.vehicleAlert.message}</p>
                  </div>
                </div>
                <ChevronRight size={14} className="text-textMuted shrink-0" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* 
        ALL APPLICATION SECTIONS (4-COLUMN MOBILE APP GRID) — Minimal size
      */}
      <div>
        <div className="flex items-center justify-between mb-2 px-1">
          <h2 className="text-xs font-bold uppercase tracking-wider text-textMuted flex items-center gap-1.5">
            <Sparkles size={13} className="text-primary" /> Application Sections
          </h2>
          <span className="text-[11px] text-primary font-semibold">{allModules.length} Modules</span>
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-6 lg:grid-cols-8 gap-2 sm:gap-3">
          {allModules.map((module) => (
            <motion.button
              key={module.id}
              type="button"
              whileTap={{ scale: 0.92 }}
              onClick={() => navigate(module.path)}
              aria-label={`Open ${module.title}`}
              className="flex flex-col items-center justify-start p-1 rounded-xl hover:bg-surface/50 active:scale-95 transition-all group text-center min-h-[58px]"
            >
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-surface/90 border border-glass flex items-center justify-center shadow-glass text-primary group-hover:border-primary/60 group-hover:bg-primary/10 group-hover:scale-105 transition-all">
                {module.icon}
              </div>

              <h3 className="font-medium text-[10px] sm:text-[11px] text-textMain group-hover:text-primary transition-colors leading-tight mt-1 text-center truncate w-full px-0.5">
                {module.title}
              </h3>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Bottom Section: AI Assistant Pulse & Recent Activity — Minimal size */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-4">
        {/* Recent Ledger Activity */}
        <div className="lg:col-span-7 glass-panel p-3 sm:p-4">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-textMain flex items-center gap-1">
              <Activity size={12} className="text-primary" /> Recent Ledger Activity
            </h2>
            <button
              type="button"
              onClick={() => navigate('/finance')}
              className="text-[10px] text-primary hover:underline font-semibold flex items-center gap-0.5 min-h-[32px] -my-1"
            >
              View All <ChevronRight size={11} />
            </button>
          </div>

          {recentTransactions.length === 0 ? (
            <p className="text-[11px] text-textMuted text-center py-4">No transactions recorded yet.</p>
          ) : (
            <div className="divide-y divide-glass/40">
              {recentTransactions.map(tx => (
                <div key={tx._id || tx.id} className="py-2 flex items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`p-1.5 rounded-md border shrink-0 ${
                      tx.type === 'income' 
                        ? 'bg-green-500/10 border-green-500/20 text-green-400' 
                        : 'bg-red-500/10 border-red-500/20 text-red-400'
                    }`}>
                      {tx.type === 'income' ? <ArrowDownRight size={12} /> : <ArrowUpRight size={12} />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold text-textMain truncate">{tx.title || tx.category}</p>
                      <p className="text-[9px] text-textMuted">{tx.category} • {new Date(tx.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <span className={`text-[11px] font-bold shrink-0 ${tx.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                    {tx.type === 'income' ? '+' : '-'}₹{(Number(tx.amount) || 0).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* AI Engine Suggestions */}
        <div className="lg:col-span-5 glass-panel p-3 sm:p-4 flex flex-col justify-between">
          <div>
            <h2 className="text-[11px] font-bold uppercase tracking-wider mb-2 flex items-center gap-1 text-textMain">
              <Sparkles className="text-primary" size={12} /> Vynora Context Engine
            </h2>
            <div className="space-y-1.5">
              {aiSuggestions.map((suggestion: string, idx: number) => (
                <div key={idx} className="bg-surface/80 border border-glass p-2 rounded-lg text-[11px] text-textMuted leading-relaxed">
                  "{suggestion}"
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2 mt-2 border-t border-glass flex justify-between items-center text-[10px]">
            <span className="text-textMuted">AI Life Intelligence:</span>
            <span className="text-green-400 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400" /> Operational
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
