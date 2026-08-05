import { API_BASE_URL } from '../config';
import React from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, TrendingDown, PiggyBank, Target, Receipt, Pill, 
  CheckSquare, Car, AlertTriangle, FileDigit, CloudRain, Activity, Zap, Sparkles 
} from 'lucide-react';
import { useContextEngineStore } from '../store/useContextEngineStore';
import { useNavigate } from 'react-router-dom';

const Widget = ({ title, icon, value, subtext, color = "text-primary", onClick }: any) => (
  <motion.div 
    whileHover={{ y: -5 }}
    onClick={onClick}
    className="glass-panel p-6 cursor-pointer hover:bg-surfaceLight transition-colors relative overflow-hidden group"
  >
    <div className={`absolute -right-4 -top-4 w-24 h-24 bg-current opacity-5 rounded-full group-hover:scale-150 transition-transform ${color}`}></div>
    <div className="flex items-start justify-between mb-4 relative z-10">
      <div className={`p-3 rounded-xl bg-surface border border-glass ${color}`}>
        {icon}
      </div>
    </div>
    <div className="relative z-10">
      <h3 className="text-textMuted text-sm font-medium mb-1">{title}</h3>
      <div className="text-2xl font-bold text-textMain tracking-wide">{value}</div>
      {subtext && <p className={`text-xs mt-2 font-medium ${subtext.includes('-') || subtext.includes('Due') || subtext.includes('Overdue') ? 'text-red-400' : 'text-green-400'}`}>{subtext}</p>}
    </div>
  </motion.div>
);

export default function Dashboard() {
  const { user } = useContextEngineStore();
  const navigate = useNavigate();
  const [data, setData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!user?.id) return;
    const fetchDashboard = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/dashboard?user=${user.id}`);
        if (res.ok) {
          setData(await res.json());
        }
      } catch (e) {
        console.error('Failed to fetch dashboard data:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, [user]);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-full text-textMuted flex-col gap-4">
        <Sparkles size={32} className="text-primary animate-pulse" />
        <p>Gathering your data...</p>
      </div>
    );
  }

  const { finance, actionRequired, domainSnapshots, aiSuggestions = [] } = data;

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-wider mb-1">Welcome back, {user?.name?.split(' ')[0] || 'Guest'}</h1>
          <p className="text-textMuted">Here's your comprehensive life overview today.</p>
        </div>
      </div>

      {/* Primary Financial Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Widget title="Today's Expense" icon={<TrendingDown size={24} />} value={`₹${finance.todaysExpense.toFixed(2)}`} subtext="Latest records" color="text-red-400" onClick={() => navigate('/finance')} />
        <Widget title="Monthly Income" icon={<TrendingUp size={24} />} value={`₹${finance.monthlyIncome.toFixed(2)}`} subtext="This month" color="text-green-400" onClick={() => navigate('/finance')} />
        <Widget title="Current Savings" icon={<PiggyBank size={24} />} value={`₹${finance.currentSavings.toFixed(2)}`} subtext="Total balance" color="text-primary" onClick={() => navigate('/finance')} />
        <Widget title="Budget Status" icon={<Target size={24} />} value={`${finance.budgetStatus}%`} subtext="Healthy" color="text-purple-400" onClick={() => navigate('/finance')} />
      </div>

      {/* Secondary Row: Alerts & Reminders */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="glass-panel p-6 lg:col-span-2 flex flex-col h-full">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Zap className="text-yellow-400" size={20} /> Action Required</h2>
          <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar pr-2">
            
            {actionRequired.upcomingBill ? (
              <div onClick={() => navigate('/bills')} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-surface border border-glass rounded-xl hover:bg-surfaceLight cursor-pointer transition-colors gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-400/20 text-red-400 rounded-lg"><Receipt size={18} /></div>
                  <div>
                    <p className="font-medium text-sm">{actionRequired.upcomingBill.title}</p>
                    <p className="text-xs text-textMuted">Amount: ₹{actionRequired.upcomingBill.amount}</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-red-400 bg-red-400/10 px-2 py-1 rounded w-fit">
                  {new Date(actionRequired.upcomingBill.dueDate).toLocaleDateString()}
                </span>
              </div>
            ) : (
              <div className="text-sm text-textMuted p-4 text-center border border-dashed border-glass rounded-xl">No upcoming bills</div>
            )}
            
            {actionRequired.medicine ? (
              <div onClick={() => navigate('/medicine')} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-surface border border-glass rounded-xl hover:bg-surfaceLight cursor-pointer transition-colors gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-400/20 text-blue-400 rounded-lg"><Pill size={18} /></div>
                  <div>
                    <p className="font-medium text-sm">{actionRequired.medicine.name}</p>
                    <p className="text-xs text-textMuted">{actionRequired.medicine.dosage}</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-blue-400 bg-blue-400/10 px-2 py-1 rounded w-fit">{actionRequired.medicine.time}</span>
              </div>
            ) : (
              <div className="text-sm text-textMuted p-4 text-center border border-dashed border-glass rounded-xl">No pending medication</div>
            )}

            {actionRequired.vehicleAlert && (
              <div onClick={() => navigate('/vehicles')} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-surface border border-glass rounded-xl hover:bg-surfaceLight cursor-pointer transition-colors gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-yellow-400/20 text-yellow-400 rounded-lg"><Car size={18} /></div>
                  <div>
                    <p className="font-medium text-sm">Vehicle Alert</p>
                    <p className="text-xs text-textMuted">{actionRequired.vehicleAlert.message}</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-yellow-400 bg-yellow-400/10 px-2 py-1 rounded w-fit">Review</span>
              </div>
            )}
          </div>
        </div>

        <div className="glass-panel p-6 relative overflow-hidden group flex flex-col h-full">
          <div className="absolute inset-0 bg-primary/5 blur-3xl rounded-full pointer-events-none"></div>
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2 relative z-10"><Sparkles className="text-primary" size={20} /> AI Suggestions</h2>
          <div className="space-y-4 relative z-10 flex-1 flex flex-col justify-between">
            <div className="space-y-4">
              {aiSuggestions.map((suggestion: string, idx: number) => (
                <div key={idx} className="bg-surface border border-glass p-3 rounded-xl">
                  <p className="text-sm text-textMuted leading-relaxed">"{suggestion}"</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tertiary Row: Domain Snapshots */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Widget title="Milk Production" icon={<FileDigit size={24} />} value={`${domainSnapshots.milkProduction} L`} subtext="Today's yield" color="text-textMain" onClick={() => navigate('/dairy')} />
        <Widget title="Active Crops" icon={<AlertTriangle size={24} />} value={`${domainSnapshots.activeCrops} Crops`} subtext="Currently growing" color="text-yellow-400" onClick={() => navigate('/agriculture')} />
        <Widget title="Pending Tasks" icon={<CheckSquare size={24} />} value={`${domainSnapshots.pendingTasks} Tasks`} subtext="Action needed" color="text-blue-400" onClick={() => navigate('/tasks')} />
        <Widget title="Recent Activity" icon={<Activity size={24} />} value={`${domainSnapshots.recentActivity} Actions`} subtext="Lifetime records" color="text-textMuted" onClick={() => navigate('/')} />
      </div>

    </div>
  );
}
