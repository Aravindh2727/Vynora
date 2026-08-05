import { API_BASE_URL } from '../config';
import React, { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { useContextEngineStore } from '../store/useContextEngineStore';
import { IndianRupee, PieChart as PieChartIcon, Activity, Banknote, Tractor, Milk } from 'lucide-react';

export default function GlobalReports() {
  const { user } = useContextEngineStore();
  const [loading, setLoading] = useState(true);
  const [financeSummary, setFinanceSummary] = useState({ totalIncome: 0, totalExpense: 0, balance: 0, categoryBreakdown: {} });
  const [transactions, setTransactions] = useState([]);
  const [loans, setLoans] = useState([]);
  const [cows, setCows] = useState([]);
  const [crops, setCrops] = useState([]);

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    const userId = user?.id || '1'; 
    try {
      const [sumRes, txRes, loanRes, cowRes, cropRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/finance/summary?user=${userId}`),
        fetch(`${API_BASE_URL}/api/finance?user=${userId}`),
        fetch(`${API_BASE_URL}/api/loans?user=${userId}`),
        fetch(`${API_BASE_URL}/api/dairy?user=${userId}`),
        fetch(`${API_BASE_URL}/api/agriculture?user=${userId}`)
      ]);
      
      if (sumRes.ok) setFinanceSummary(await sumRes.json());
      if (txRes.ok) setTransactions(await txRes.json());
      if (loanRes.ok) setLoans(await loanRes.json());
      if (cowRes.ok) setCows(await cowRes.json());
      if (cropRes.ok) setCrops(await cropRes.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // --- Aggregate Data for Charts ---

  // 1. Expense Breakdown (Pie Chart)
  const COLORS = ['#00f2fe', '#4facfe', '#667eea', '#764ba2', '#ff0844', '#ffb199', '#f6d365', '#fda085'];
  const pieData = Object.entries(financeSummary.categoryBreakdown || {})
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => Number(b.value) - Number(a.value)); // Sort by largest expense

  // 2. Income vs Expense Trend (Line Chart - Last 14 Days)
  const trendDataMap: Record<string, { date: string, income: number, expense: number }> = {};
  
  for(let i=13; i>=0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      trendDataMap[dateStr] = { date: dateStr, income: 0, expense: 0 };
  }

  transactions.forEach((tx: any) => {
      const dateStr = new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (trendDataMap[dateStr]) {
          if (tx.type === 'income') trendDataMap[dateStr].income += tx.amount;
          else if (tx.type === 'expense') trendDataMap[dateStr].expense += tx.amount;
      }
  });

  const trendData = Object.values(trendDataMap);

  // 3. Loans / Liabilities (Bar Chart)
  const totalLoanPrincipal = loans.reduce((acc, curr: any) => acc + (Number(curr.principalAmount) || 0), 0);
  const totalMonthlyEMI = loans.reduce((acc, curr: any) => acc + (Number(curr.monthlyPay) || 0), 0);
  
  const loanBarData = loans.map((loan: any) => ({
      name: loan.loanName,
      principal: Number(loan.principalAmount) || 0,
      emi: Number(loan.monthlyPay) || 0
  }));

  if (loading) {
      return <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-wider mb-1 flex items-center gap-3">
             <PieChartIcon className="text-primary" size={28} /> Global Reports
          </h1>
          <p className="text-textMuted">A comprehensive overview of your life, farm, and finances.</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="glass-panel p-6 border-l-4 border-l-primary flex items-center justify-between">
          <div>
            <p className="text-sm text-textMuted mb-1">Total Net Worth</p>
            <h2 className={`text-2xl font-bold ${financeSummary.balance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                ₹{financeSummary.balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h2>
          </div>
          <div className="p-3 bg-primary/20 text-primary rounded-xl"><IndianRupee size={24} /></div>
        </div>

        <div className="glass-panel p-6 border-l-4 border-l-red-500 flex items-center justify-between">
          <div>
            <p className="text-sm text-textMuted mb-1">Total Liabilities</p>
            <h2 className="text-2xl font-bold text-red-400">₹{totalLoanPrincipal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h2>
            <p className="text-xs text-textMuted mt-1">₹{totalMonthlyEMI.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / month</p>
          </div>
          <div className="p-3 bg-red-500/20 text-red-400 rounded-xl"><Banknote size={24} /></div>
        </div>

        <div className="glass-panel p-6 border-l-4 border-l-green-500 flex items-center justify-between">
          <div>
            <p className="text-sm text-textMuted mb-1">Livestock Assets</p>
            <h2 className="text-2xl font-bold text-green-400">{cows.length} <span className="text-sm font-normal text-textMuted">Cattle</span></h2>
          </div>
          <div className="p-3 bg-green-500/20 text-green-400 rounded-xl"><Milk size={24} /></div>
        </div>

        <div className="glass-panel p-6 border-l-4 border-l-orange-500 flex items-center justify-between">
          <div>
            <p className="text-sm text-textMuted mb-1">Active Crops</p>
            <h2 className="text-2xl font-bold text-orange-400">{crops.length} <span className="text-sm font-normal text-textMuted">Fields</span></h2>
          </div>
          <div className="p-3 bg-orange-500/20 text-orange-400 rounded-xl"><Tractor size={24} /></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cashflow Trend */}
        <div className="glass-panel p-6 h-[400px] flex flex-col">
          <div className="flex items-center gap-2 mb-6">
            <Activity className="text-primary" size={20} />
            <h2 className="text-lg font-bold">Cashflow Trend (14 Days)</h2>
          </div>
          <div className="flex-1 w-full h-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                <XAxis dataKey="date" stroke="#888" fontSize={12} tickMargin={10} />
                <YAxis stroke="#888" fontSize={12} tickFormatter={(val) => `₹${val}`} />
                <Tooltip 
                    contentStyle={{ backgroundColor: '#1a1a2e', borderColor: '#333', borderRadius: '8px' }}
                    itemStyle={{ color: '#fff' }}
                />
                <Legend iconType="circle" />
                <Line type="monotone" dataKey="income" name="Income" stroke="#4ade80" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="expense" name="Expense" stroke="#f87171" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expense Breakdown Pie */}
        <div className="glass-panel p-6 h-[400px] flex flex-col">
          <div className="flex items-center gap-2 mb-6">
            <PieChartIcon className="text-primary" size={20} />
            <h2 className="text-lg font-bold">Expense Distribution</h2>
          </div>
          <div className="flex-1 flex items-center justify-center">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={70} outerRadius={120} paddingAngle={5} dataKey="value" label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#1a1a2e', borderColor: '#333', borderRadius: '8px' }} formatter={(val: number) => `₹${val.toFixed(2)}`} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-gray-500">No expenses recorded yet.</div>
            )}
          </div>
        </div>
      </div>
      
      {/* Liabilities Overview */}
      <div className="glass-panel p-6 h-[400px] flex flex-col">
          <div className="flex items-center gap-2 mb-6">
            <Banknote className="text-red-400" size={20} />
            <h2 className="text-lg font-bold">Liabilities Overview</h2>
          </div>
          <div className="flex-1 w-full h-full">
            {loanBarData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                <BarChart data={loanBarData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                    <XAxis dataKey="name" stroke="#888" fontSize={12} tickMargin={10} />
                    <YAxis yAxisId="left" orientation="left" stroke="#888" fontSize={12} tickFormatter={(val) => `₹${val}`} />
                    <YAxis yAxisId="right" orientation="right" stroke="#888" fontSize={12} tickFormatter={(val) => `₹${val}`} />
                    <Tooltip 
                        contentStyle={{ backgroundColor: '#1a1a2e', borderColor: '#333', borderRadius: '8px' }}
                        formatter={(val: number, name: string) => [`₹${val.toFixed(2)}`, name === 'principal' ? 'Total Principal' : 'Monthly EMI']}
                    />
                    <Legend iconType="circle" />
                    <Bar yAxisId="left" dataKey="principal" name="Total Principal" fill="#f87171" radius={[4, 4, 0, 0]} maxBarSize={60} />
                    <Bar yAxisId="right" dataKey="emi" name="Monthly EMI" fill="#fbbf24" radius={[4, 4, 0, 0]} maxBarSize={60} />
                </BarChart>
                </ResponsiveContainer>
            ) : (
                <div className="flex items-center justify-center h-full text-gray-500">No active loans found.</div>
            )}
          </div>
      </div>

    </div>
  );
}
