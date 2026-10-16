import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer, 
  Tooltip, XAxis, YAxis, CartesianGrid, Legend 
} from 'recharts';
import { useContextEngineStore } from '../store/useContextEngineStore';
import { 
  IndianRupee, PieChart as PieChartIcon, Activity, Banknote, Tractor, Milk, 
  Car, Download, Calendar, CheckSquare, Target, ShieldCheck, TrendingUp, TrendingDown
} from 'lucide-react';
import {
  FinanceService,
  LoanService,
  DairyService,
  AgricultureService,
  VehicleService,
  BillService,
  TaskService,
  GoalService,
  getActiveUserId
} from '../services/firestoreService';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { exportToCSV } from '../utils/csvExport';
import { MobilePageHeader } from '../components/common/MobilePageHeader';

const PIE_COLORS = ['#00f2fe', '#4facfe', '#667eea', '#764ba2', '#ff0844', '#ffb199', '#f6d365', '#4ade80', '#fbbf24', '#a78bfa'];

export default function GlobalReports() {
  const { user } = useContextEngineStore();
  const activeUid = getActiveUserId(user?.id);

  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'year' | 'all'>('30d');

  // Datasets
  const [financeSummary, setFinanceSummary] = useState({ totalIncome: 0, totalExpense: 0, balance: 0, categoryBreakdown: {} });
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loans, setLoans] = useState<any[]>([]);
  const [cows, setCows] = useState<any[]>([]);
  const [dairyLogs, setDairyLogs] = useState<any[]>([]);
  const [dairyFeed, setDairyFeed] = useState<any[]>([]);
  const [crops, setCrops] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [bills, setBills] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [goals, setGoals] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [
        sum, txList, loanList, cowList, dLogs, dFeed, cropList, vehList, billList, taskList, goalList
      ] = await Promise.all([
        FinanceService.getSummary(activeUid),
        FinanceService.getTransactions(activeUid),
        LoanService.getLoans(activeUid),
        DairyService.getCows(activeUid),
        DairyService.getLogs(activeUid),
        DairyService.getFeed(activeUid),
        AgricultureService.getCrops(activeUid),
        VehicleService.getVehicles(activeUid),
        BillService.getBills(activeUid),
        TaskService.getTasks(activeUid),
        GoalService.getGoals(activeUid)
      ]);

      setFinanceSummary(sum);
      setTransactions(txList);
      setLoans(loanList);
      setCows(cowList);
      setDairyLogs(dLogs);
      setDairyFeed(dFeed);
      setCrops(cropList);
      setVehicles(vehList);
      setBills(billList);
      setTasks(taskList);
      setGoals(goalList);
    } catch (e) {
      console.error('Error fetching global reports data:', e);
    } finally {
      setLoading(false);
    }
  };

  // Date filtering logic
  const now = new Date();
  const getStartDate = () => {
    const d = new Date();
    if (dateRange === '7d') d.setDate(d.getDate() - 7);
    else if (dateRange === '30d') d.setDate(d.getDate() - 30);
    else if (dateRange === '90d') d.setDate(d.getDate() - 90);
    else if (dateRange === 'year') d.setFullYear(d.getFullYear() - 1);
    else return new Date(0); // All time
    return d;
  };

  const startDate = getStartDate();

  // Filtered transactions for the selected range
  const filteredTransactions = transactions.filter(tx => new Date(tx.date || 0) >= startDate);

  const rangeIncome = filteredTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const rangeExpense = filteredTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const rangeNet = rangeIncome - rangeExpense;

  // 1. Expense Breakdown Pie Data
  const categoryMap: Record<string, number> = {};
  filteredTransactions
    .filter(t => t.type === 'expense')
    .forEach(t => {
      const cat = t.category || 'General';
      categoryMap[cat] = (categoryMap[cat] || 0) + (Number(t.amount) || 0);
    });

  const pieData = Object.entries(categoryMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // 2. Cashflow Trend (Days in selected range, grouped into reasonable buckets)
  const numDays = dateRange === '7d' ? 7 : dateRange === '30d' ? 14 : dateRange === '90d' ? 12 : 12;
  const trendDataMap: Record<string, { date: string; income: number; expense: number }> = {};

  for (let i = numDays - 1; i >= 0; i--) {
    const d = new Date();
    if (dateRange === '7d' || dateRange === '30d') {
      d.setDate(d.getDate() - i * (dateRange === '30d' ? 2 : 1));
    } else {
      d.setDate(d.getDate() - i * (dateRange === '90d' ? 7 : 30));
    }
    const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    trendDataMap[label] = { date: label, income: 0, expense: 0 };
  }

  filteredTransactions.forEach(tx => {
    const d = new Date(tx.date);
    const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    if (trendDataMap[label]) {
      if (tx.type === 'income') trendDataMap[label].income += Number(tx.amount) || 0;
      else if (tx.type === 'expense') trendDataMap[label].expense += Number(tx.amount) || 0;
    }
  });

  const trendData = Object.values(trendDataMap);

  // 3. Liabilities Overview Data
  const totalLoanPrincipal = loans.reduce((acc, curr) => acc + (Number(curr.principalAmount) || 0), 0);
  const totalMonthlyEMI = loans.reduce((acc, curr) => acc + (Number(curr.monthlyPay) || 0), 0);

  const loanBarData = loans.map(l => ({
    name: l.loanName,
    principal: Number(l.principalAmount) || 0,
    emi: Number(l.monthlyPay) || 0
  }));

  // 4. Domain Calculations
  // Agriculture
  const agriRevenue = crops.reduce((sum, c) => sum + (Number(c.harvestRevenue) || 0), 0);
  const agriCost = crops.reduce((sum, c) => sum + (Number(c.totalCost) || 0), 0);
  const agriProfit = agriRevenue - agriCost;

  // Dairy
  const dairyRevenue = dairyLogs.reduce((sum, l) => sum + (Number(l.soldAmount) || 0), 0);
  const dairyFeedExpense = dairyFeed.reduce((sum, f) => sum + (Number(f.amount) || 0), 0);
  const totalMilkYield = dairyLogs.reduce((sum, l) => sum + (Number(l.litersProduced) || 0), 0);

  // Tasks & Goals
  const completedTasksCount = tasks.filter(t => t.status === 'Done' || t.isCompleted).length;
  const taskCompletionRate = tasks.length > 0 ? Math.round((completedTasksCount / tasks.length) * 100) : 100;
  const completedGoalsCount = goals.filter(g => g.isCompleted).length;

  // Exports
  const handleExportConsolidatedCSV = () => {
    const data = [
      { Metric: 'Reporting Range', Value: dateRange.toUpperCase() },
      { Metric: 'Total Income (₹)', Value: rangeIncome },
      { Metric: 'Total Expense (₹)', Value: rangeExpense },
      { Metric: 'Net Balance (₹)', Value: rangeNet },
      { Metric: 'Loan Principal Liabilities (₹)', Value: totalLoanPrincipal },
      { Metric: 'Monthly EMI Liabilities (₹)', Value: totalMonthlyEMI },
      { Metric: 'Active Cattle Herd', Value: cows.length },
      { Metric: 'Total Milk Produced (L)', Value: totalMilkYield },
      { Metric: 'Milk Sales Revenue (₹)', Value: dairyRevenue },
      { Metric: 'Active Crop Cycles', Value: crops.length },
      { Metric: 'Crop Production Revenue (₹)', Value: agriRevenue },
      { Metric: 'Crop Production Cost (₹)', Value: agriCost },
      { Metric: 'Net Agri Profit (₹)', Value: agriProfit },
      { Metric: 'Vehicles in Fleet', Value: vehicles.length },
      { Metric: 'Task Completion Rate (%)', Value: `${taskCompletionRate}%` },
      { Metric: 'Goals Achieved', Value: `${completedGoalsCount} of ${goals.length}` },
      { Metric: 'Report Generated At', Value: new Date().toISOString() }
    ];
    exportToCSV(data, `vynora_consolidated_report_${dateRange}.csv`);
  };

  if (loading) {
    return <LoadingSpinner message="Consolidating intelligence across all 18 modules..." />;
  }

  return (
    <div className="space-y-6 min-w-0 max-w-full">
      <MobilePageHeader
        title="Global Analytics & Reports"
        parentLabel="Dashboard"
        fallbackPath="/"
        subtitle="Comprehensive multi-domain intelligence across finances, agriculture, livestock, liabilities, and goals."
        badges={[
          { label: `Range: ${dateRange.toUpperCase()}`, variant: 'info' },
          { label: `${vehicles.length} Vehicles`, variant: 'default' },
          { label: `${cows.length} Herd`, variant: 'default' }
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex bg-surface border border-glass rounded-xl p-0.5 text-xs font-semibold overflow-x-auto max-w-full scrollbar-none">
              {[
                { id: '7d', label: '7D' },
                { id: '30d', label: '30D' },
                { id: '90d', label: '90D' },
                { id: 'year', label: '1Y' },
                { id: 'all', label: 'All' }
              ].map(r => (
                <button
                  key={r.id}
                  onClick={() => setDateRange(r.id as any)}
                  className={`min-h-[38px] px-2.5 py-1 rounded-lg transition-colors touch-target ${
                    dateRange === r.id ? 'bg-primary text-background font-bold' : 'text-textMuted hover:text-textMain'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>

            <button
              onClick={handleExportConsolidatedCSV}
              className="min-h-[44px] bg-primary text-background px-3.5 py-2 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-neon-primary-sm hover:opacity-95 transition-opacity touch-target"
            >
              <Download size={15} /> <span>CSV</span>
            </button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 min-w-0">
        <div className="glass-panel p-5 border-l-4 border-l-primary flex flex-col justify-between">
          <p className="text-xs text-textMuted uppercase font-semibold">Period Net Cashflow</p>
          <div className="mt-2 flex items-baseline justify-between">
            <h2 className={`text-2xl font-bold ${rangeNet >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              ₹{rangeNet.toLocaleString()}
            </h2>
            <IndianRupee className="text-primary/70" size={24} />
          </div>
          <p className="text-[11px] text-textMuted mt-1">Income: ₹{rangeIncome.toLocaleString()} | Exp: ₹{rangeExpense.toLocaleString()}</p>
        </div>

        <div className="glass-panel p-5 border-l-4 border-l-red-500 flex flex-col justify-between">
          <p className="text-xs text-textMuted uppercase font-semibold">Total Liabilities</p>
          <div className="mt-2 flex items-baseline justify-between">
            <h2 className="text-2xl font-bold text-red-400">₹{totalLoanPrincipal.toLocaleString()}</h2>
            <Banknote className="text-red-500/70" size={24} />
          </div>
          <p className="text-[11px] text-textMuted mt-1">Monthly EMI: ₹{totalMonthlyEMI.toLocaleString()}</p>
        </div>

        <div className="glass-panel p-5 border-l-4 border-l-emerald-500 flex flex-col justify-between">
          <p className="text-xs text-textMuted uppercase font-semibold">Agriculture Profit</p>
          <div className="mt-2 flex items-baseline justify-between">
            <h2 className={`text-2xl font-bold ${agriProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              ₹{agriProfit.toLocaleString()}
            </h2>
            <Tractor className="text-emerald-500/70" size={24} />
          </div>
          <p className="text-[11px] text-textMuted mt-1">{crops.length} crop cycles recorded</p>
        </div>

        <div className="glass-panel p-5 border-l-4 border-l-cyan-500 flex flex-col justify-between">
          <p className="text-xs text-textMuted uppercase font-semibold">Dairy Milk Yield</p>
          <div className="mt-2 flex items-baseline justify-between">
            <h2 className="text-2xl font-bold text-cyan-400">{totalMilkYield.toFixed(1)} L</h2>
            <Milk className="text-cyan-500/70" size={24} />
          </div>
          <p className="text-[11px] text-textMuted mt-1">Revenue: ₹{dairyRevenue.toLocaleString()} ({cows.length} cattle)</p>
        </div>
      </div>

      {/* Row 2: Cashflow Trend and Expense Distribution Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-w-0">
        {/* Cashflow Trend Chart */}
        <div className="glass-panel p-6 h-[380px] flex flex-col min-w-0 overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className="text-primary" size={20} />
              <h2 className="text-base font-bold text-textMain">Income vs Expense Trend ({dateRange.toUpperCase()})</h2>
            </div>
            <span className="text-xs text-textMuted">Ledger transactions</span>
          </div>

          <div className="flex-1 w-full h-full min-w-0 overflow-hidden">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 5, right: 15, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                <XAxis dataKey="date" stroke="#888" fontSize={11} tickMargin={8} />
                <YAxis stroke="#888" fontSize={11} tickFormatter={val => `₹${val}`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '12px' }}
                  itemStyle={{ color: '#fff' }}
                  formatter={(val: any) => [`₹${Number(val).toLocaleString()}`, '']}
                />
                <Legend iconType="circle" />
                <Line type="monotone" dataKey="income" name="Income" stroke="#4ade80" strokeWidth={2.5} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="expense" name="Expense" stroke="#f87171" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expense Distribution Pie Chart */}
        <div className="glass-panel p-6 h-[380px] flex flex-col min-w-0 overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <PieChartIcon className="text-primary" size={20} />
              <h2 className="text-base font-bold text-textMain">Category Spending Distribution</h2>
            </div>
            <span className="text-xs text-textMuted">{pieData.length} categories</span>
          </div>

          <div className="flex-1 flex items-center justify-center min-w-0 overflow-hidden">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={105}
                    paddingAngle={4}
                    dataKey="value"
                    label={({ name, percent }: any) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                    labelLine={false}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '12px' }}
                    formatter={(val: any) => [`₹${Number(val).toLocaleString()}`, 'Spent']}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-textMuted text-xs text-center py-12">
                No expense records found in this date window.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Row 3: Liabilities Overview Bar Chart */}
      <div className="glass-panel p-6 h-[360px] flex flex-col min-w-0 overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Banknote className="text-red-400" size={20} />
            <h2 className="text-base font-bold text-textMain">Liabilities & EMI Amortization Schedule</h2>
          </div>
          <span className="text-xs text-textMuted">Active borrowing</span>
        </div>

        <div className="flex-1 w-full h-full min-w-0 overflow-hidden">
          {loanBarData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={loanBarData} margin={{ top: 15, right: 25, left: 15, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                <XAxis dataKey="name" stroke="#888" fontSize={11} tickMargin={8} />
                <YAxis yAxisId="left" orientation="left" stroke="#888" fontSize={11} tickFormatter={val => `₹${val}`} />
                <YAxis yAxisId="right" orientation="right" stroke="#888" fontSize={11} tickFormatter={val => `₹${val}`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '12px' }}
                  formatter={(val: any, name: any) => [`₹${Number(val).toLocaleString()}`, name === 'principal' ? 'Total Principal' : 'Monthly EMI']}
                />
                <Legend iconType="circle" />
                <Bar yAxisId="left" dataKey="principal" name="Total Principal" fill="#f87171" radius={[4, 4, 0, 0]} maxBarSize={50} />
                <Bar yAxisId="right" dataKey="emi" name="Monthly EMI" fill="#fbbf24" radius={[4, 4, 0, 0]} maxBarSize={50} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-textMuted text-xs">
              No active loans found.
            </div>
          )}
        </div>
      </div>

      {/* Row 4: Multi-Domain Health Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 min-w-0">
        {/* Vehicles */}
        <div className="glass-panel p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-textMain flex items-center gap-2">
              <Car className="text-blue-400" size={18} /> Vehicle Fleet Health
            </h3>
            <span className="text-xs text-textMuted">{vehicles.length} registered</span>
          </div>
          <div className="bg-surface/50 p-3 rounded-xl border border-glass space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-textMuted">Fleet Size:</span>
              <strong className="text-textMain">{vehicles.length} Vehicles</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-textMuted">Fitness & PUC Status:</span>
              <span className="text-green-400 font-semibold">Active Monitoring</span>
            </div>
          </div>
        </div>

        {/* Productivity & Tasks */}
        <div className="glass-panel p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-textMain flex items-center gap-2">
              <CheckSquare className="text-amber-400" size={18} /> Productivity & Tasks
            </h3>
            <span className="text-xs text-textMuted">{tasks.length} total tasks</span>
          </div>
          <div className="bg-surface/50 p-3 rounded-xl border border-glass space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-textMuted">Completion Rate:</span>
              <strong className="text-primary">{taskCompletionRate}%</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-textMuted">Completed Tasks:</span>
              <strong className="text-green-400">{completedTasksCount} / {tasks.length}</strong>
            </div>
          </div>
        </div>

        {/* Goal Trajectory */}
        <div className="glass-panel p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-textMain flex items-center gap-2">
              <Target className="text-purple-400" size={18} /> Life Goals Trajectory
            </h3>
            <span className="text-xs text-textMuted">{goals.length} goals</span>
          </div>
          <div className="bg-surface/50 p-3 rounded-xl border border-glass space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-textMuted">Achieved Goals:</span>
              <strong className="text-green-400">{completedGoalsCount} of {goals.length}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-textMuted">Active Trajectories:</span>
              <strong className="text-purple-400">{goals.length - completedGoalsCount} In Progress</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
