import { API_BASE_URL } from '../config';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Milk, FileDigit, Activity, Edit2, Trash2, IndianRupee } from 'lucide-react';
import { useContextEngineStore } from '../store/useContextEngineStore';

export default function DairyManager() {
  const { user } = useContextEngineStore();
  const [cows, setCows] = useState([]);
  const [farmLogs, setFarmLogs] = useState([]);
  const [farmFeedLogs, setFarmFeedLogs] = useState([]);
  const [showCowModal, setShowCowModal] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [showFeedModal, setShowFeedModal] = useState(false);
  const [showSellModal, setShowSellModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [activeCowId, setActiveCowId] = useState(null);
  const [editCowId, setEditCowId] = useState<string | null>(null);
  const [editFarmLogId, setEditFarmLogId] = useState<string | null>(null);
  
  const [cowData, setCowData] = useState({ tagNumber: '', breed: '', dailyFoodCost: '', purchasePrice: '', purchaseDate: '' });
  const [logData, setLogData] = useState({ session: 'Morning', litersProduced: '', ratePerLiter: '' });
  const [feedData, setFeedData] = useState({ description: '', amount: '', date: '' });
  const [sellData, setSellData] = useState({ salePrice: '', saleDate: '' });
  const [expenseData, setExpenseData] = useState({ type: 'Treatment', description: '', amount: '', date: '' });

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      const resCows = await fetch(`${API_BASE_URL}/api/dairy?user=${user?.id || '1'}`);
      if (resCows.ok) setCows(await resCows.json());
      const resLogs = await fetch(`${API_BASE_URL}/api/dairy/logs?user=${user?.id || '1'}`);
      if (resLogs.ok) setFarmLogs(await resLogs.json());
      const resFeed = await fetch(`${API_BASE_URL}/api/dairy/feed?user=${user?.id || '1'}`);
      if (resFeed.ok) setFarmFeedLogs(await resFeed.json());
    } catch (e) { console.error(e); }
  };

  const handleAddCow = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editCowId ? `${API_BASE_URL}/api/dairy/${editCowId}` : API_BASE_URL + '/api/dairy';
      const method = editCowId ? 'PUT' : 'POST';

      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...cowData, user: user?.id || '1', dailyFoodCost: Number(cowData.dailyFoodCost) })
      });
      setShowCowModal(false);
      setEditCowId(null);
      setCowData({ tagNumber: '', breed: '', dailyFoodCost: '', purchasePrice: '', purchaseDate: '' });
      fetchData();
    } catch (e) { console.error(e); }
  };

  const handleDeleteCow = async (id: string) => {
    try {
      await fetch(`${API_BASE_URL}/api/dairy/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (e) { console.error(e); }
  };

  const handleEditCow = (cow: any) => {
    setCowData({
      tagNumber: cow.tagNumber || '',
      breed: cow.breed || '',
      dailyFoodCost: cow.dailyFoodCost || '',
      purchasePrice: cow.purchasePrice || '',
      purchaseDate: cow.purchaseDate ? new Date(cow.purchaseDate).toISOString().split('T')[0] : ''
    });
    setEditCowId(cow._id);
    setShowCowModal(true);
  };

  const handleSellCow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCowId) return;
    try {
      await fetch(`${API_BASE_URL}/api/dairy/${activeCowId}/sell`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sellData)
      });
      setShowSellModal(false);
      setSellData({ salePrice: '', saleDate: '' });
      fetchData();
    } catch (e) { console.error(e); }
  };

  const handleAddLog = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editFarmLogId ? `${API_BASE_URL}/api/dairy/logs/${editFarmLogId}` : `${API_BASE_URL}/api/dairy/logs`;
      const method = editFarmLogId ? 'PUT' : 'POST';

      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...logData, user: user?.id || '1' })
      });
      setShowLogModal(false);
      setEditFarmLogId(null);
      setLogData({ session: 'Morning', litersProduced: '', ratePerLiter: '' });
      fetchData();
    } catch (e) { console.error(e); }
  };

  const handleEditFarmLog = (log: any) => {
    setLogData({
      session: log.session || 'Morning',
      litersProduced: log.litersProduced || '',
      ratePerLiter: log.ratePerLiter || ''
    });
    setEditFarmLogId(log._id);
    setShowLogModal(true);
  };

  const handleDeleteFarmLog = async (id: string) => {
    try {
      await fetch(`${API_BASE_URL}/api/dairy/logs/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (e) { console.error(e); }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCowId) return;
    try {
      await fetch(`${API_BASE_URL}/api/dairy/${activeCowId}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expenseData)
      });
      setShowExpenseModal(false);
      setExpenseData({ type: 'Treatment', description: '', amount: '', date: '' });
      fetchData();
    } catch (e) { console.error(e); }
  };

  const handleAddFeed = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch(`${API_BASE_URL}/api/dairy/feed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...feedData, user: user?.id || '1' })
      });
      setShowFeedModal(false);
      setFeedData({ description: '', amount: '', date: '' });
      fetchData();
    } catch (e) { console.error(e); }
  };

  const calculateTotalYield = (logs: any[]) => (logs || []).reduce((acc, curr) => acc + (curr.litersProduced || 0), 0);
  const calculateTotalRevenue = (logs: any[]) => (logs || []).reduce((acc, curr) => acc + (curr.soldAmount || 0), 0);
  const calculateTotalExpenses = (expenses: any[]) => (expenses || []).reduce((acc, curr) => acc + (curr.amount || 0), 0);

  const overallLiters = calculateTotalYield(farmLogs);
  const overallRevenue = calculateTotalRevenue(farmLogs);
  const overallFeedExpenses = calculateTotalExpenses(farmFeedLogs);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-wider mb-1">Dairy Management</h1>
          <p className="text-textMuted">Track cattle health, milk production, and revenue.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setShowFeedModal(true)} className="bg-orange-500/20 text-orange-400 border border-orange-500/30 px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-orange-500/30 transition-colors shadow-neon-primary-sm font-medium">
            <Plus size={18} /> Log Feed Expense
          </button>
          <button onClick={() => setShowLogModal(true)} className="bg-primary/20 text-primary border border-primary/30 px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-primary/30 transition-colors shadow-neon-primary-sm font-medium">
            <FileDigit size={18} /> Log Farm Milk
          </button>
          <button onClick={() => { setEditCowId(null); setShowCowModal(true); }} className="bg-white text-black px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-gray-200 transition-colors shadow-neon-primary-sm font-medium">
            <Plus size={18} /> Add Cattle
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="glass-panel p-6 border-l-4 border-l-primary flex items-center justify-between">
          <div>
            <p className="text-sm text-textMuted mb-1">Overall Milk Produced</p>
            <h2 className="text-3xl font-bold text-textMain">{overallLiters.toFixed(1)} <span className="text-lg text-textMuted font-normal">Liters</span></h2>
          </div>
          <div className="p-4 bg-primary/20 text-primary rounded-xl"><Milk size={32} /></div>
        </div>
        <div className="glass-panel p-6 border-l-4 border-l-green-500 flex items-center justify-between">
          <div>
            <p className="text-sm text-textMuted mb-1">Overall Milk Revenue</p>
            <h2 className="text-3xl font-bold text-green-400">₹{overallRevenue.toFixed(2)}</h2>
          </div>
          <div className="p-4 bg-green-500/20 text-green-400 rounded-xl"><IndianRupee size={32} /></div>
        </div>
        <div className="glass-panel p-6 border-l-4 border-l-orange-500 flex items-center justify-between">
          <div>
            <p className="text-sm text-textMuted mb-1">Overall Feed Expenses</p>
            <h2 className="text-3xl font-bold text-orange-400">₹{overallFeedExpenses.toFixed(2)}</h2>
          </div>
          <div className="p-4 bg-orange-500/20 text-orange-400 rounded-xl"><Plus size={32} /></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {cows.map((cow: any) => {
          const isSold = cow.status === 'sold';
          return (
            <motion.div key={cow._id} whileHover={{ y: -5 }} className={`glass-panel p-6 flex flex-col justify-between border-t-4 ${isSold ? 'border-t-gray-500 opacity-75' : 'border-t-white'}`}>
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-surface border border-glass rounded-xl text-textMain"><Milk size={24} /></div>
                    <div>
                        <h3 className="text-xl font-bold text-textMain">
                          {cow.tagNumber}
                          {isSold && <span className="ml-2 text-xs bg-gray-500 text-white px-2 py-1 rounded-full">Sold</span>}
                        </h3>
                        <p className="text-sm text-textMuted">Breed: {cow.breed}</p>
                        {cow.purchasePrice > 0 && <p className="text-xs text-textMuted">Purchased: ₹{cow.purchasePrice}</p>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {!isSold && (
                      <button onClick={() => { setActiveCowId(cow._id); setShowSellModal(true); }} className="text-textMuted hover:text-green-400 transition-colors" title="Sell Cattle">
                        <IndianRupee size={18} />
                      </button>
                    )}
                    <button onClick={() => handleEditCow(cow)} className="text-textMuted hover:text-blue-400 transition-colors" title="Edit">
                      <Edit2 size={18} />
                    </button>
                    <button onClick={() => handleDeleteCow(cow._id)} className="text-textMuted hover:text-red-400 transition-colors" title="Delete">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                <div className="bg-surface/50 p-4 rounded-xl border border-glass mb-4 flex justify-between items-center">
                    <div>
                        <p className="text-xs text-textMuted mb-1">Total Medical Expenses</p>
                        <p className="font-bold text-lg text-red-400">₹{calculateTotalExpenses(cow.expenseLogs).toFixed(2)}</p>
                    </div>
                </div>
              </div>

              {!isSold && (
                <button 
                  onClick={() => { setActiveCowId(cow._id); setShowExpenseModal(true); }}
                  className="w-full py-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl hover:bg-red-500/30 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                >
                  <Plus size={16} /> Log Medical Treatment
                </button>
              )}

              {isSold && (
                <div className="w-full py-2 bg-gray-500/20 text-gray-400 border border-gray-500/30 rounded-xl text-center text-sm font-medium mt-4">
                  Sold on {new Date(cow.saleDate).toLocaleDateString()} for ₹{cow.salePrice}
                </div>
              )}
            </motion.div>
          );
        })}

        {cows.length === 0 && (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-gray-500 border-2 border-dashed border-glass rounded-2xl">
            <Milk size={48} className="mb-4 opacity-50" />
            <p>No cattle records found.</p>
          </div>
        )}
      </div>

      <div className="glass-panel p-6 mt-6">
        <h2 className="text-xl font-bold mb-6 text-textMain flex items-center gap-2">
          <Activity className="text-primary" size={24} /> Recent Farm Logs
        </h2>
        
        {farmLogs.length === 0 ? (
          <div className="py-8 flex flex-col items-center justify-center text-gray-500">
            <FileDigit size={40} className="mb-3 opacity-50" />
            <p>No global milk logs found for the farm yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="text-textMuted text-xs uppercase tracking-wider border-b border-glass">
                  <th className="pb-3 px-4 font-medium">Date</th>
                  <th className="pb-3 px-4 font-medium">Session</th>
                  <th className="pb-3 px-4 font-medium text-right">Liters Produced</th>
                  <th className="pb-3 px-4 font-medium text-right">Rate/L (₹)</th>
                  <th className="pb-3 px-4 font-medium text-right">Total Revenue (₹)</th>
                  <th className="pb-3 px-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {farmLogs.map((log: any) => (
                  <tr key={log._id} className="border-b border-glass/50 hover:bg-surface/50 transition-colors">
                    <td className="py-4 px-4">{new Date(log.date).toLocaleDateString()}</td>
                    <td className="py-4 px-4 text-primary font-medium">{log.session}</td>
                    <td className="py-4 px-4 text-right">{log.litersProduced} L</td>
                    <td className="py-4 px-4 text-right text-textMuted">₹{log.ratePerLiter}</td>
                    <td className="py-4 px-4 text-right font-bold text-green-400">₹{log.soldAmount.toLocaleString()}</td>
                    <td className="py-4 px-4 text-right">
                      <button onClick={() => handleEditFarmLog(log)} className="text-textMuted hover:text-blue-400 transition-colors mr-3"><Edit2 size={16}/></button>
                      <button onClick={() => handleDeleteFarmLog(log._id)} className="text-textMuted hover:text-red-400 transition-colors"><Trash2 size={16}/></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Cow Modal */}
      <AnimatePresence>
        {showCowModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => { setShowCowModal(false); setEditCowId(null); }}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="glass-panel p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-xl font-bold mb-4 text-textMain">{editCowId ? 'Edit Cattle' : 'Register Cattle'}</h2>
              <form onSubmit={handleAddCow} className="space-y-4">
                <input required type="text" placeholder="Tag Number (e.g., T-102)" value={cowData.tagNumber} onChange={e => setCowData({...cowData, tagNumber: e.target.value})} className="w-full bg-background border border-glass rounded-lg px-4 py-3 text-sm text-textMain" />
                <input required type="text" placeholder="Breed (e.g., Holstein, Jersey)" value={cowData.breed} onChange={e => setCowData({...cowData, breed: e.target.value})} className="w-full bg-background border border-glass rounded-lg px-4 py-3 text-sm text-textMain" />
                <input type="number" placeholder="Estimated Daily Food Cost (₹)" value={cowData.dailyFoodCost} onChange={e => setCowData({...cowData, dailyFoodCost: e.target.value})} className="w-full bg-background border border-glass rounded-lg px-4 py-3 text-sm text-textMain" />
                {!editCowId && (
                  <>
                    <input type="number" placeholder="Purchase Price (₹) (Optional)" value={cowData.purchasePrice} onChange={e => setCowData({...cowData, purchasePrice: e.target.value})} className="w-full bg-background border border-glass rounded-lg px-4 py-3 text-sm text-textMain" />
                    <input type="date" value={cowData.purchaseDate} onChange={e => setCowData({...cowData, purchaseDate: e.target.value})} className="w-full bg-background border border-glass rounded-lg px-4 py-3 text-sm text-textMain" />
                  </>
                )}
                
                <div className="flex justify-end gap-3 mt-6">
                  <button type="button" onClick={() => { setShowCowModal(false); setEditCowId(null); }} className="px-4 py-2 text-sm text-textMuted hover:text-textMain">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-white text-black rounded-lg font-medium text-sm">{editCowId ? 'Update' : 'Register'}</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Log Modal */}
      <AnimatePresence>
        {showLogModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => { setShowLogModal(false); setEditFarmLogId(null); }}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="glass-panel p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-xl font-bold mb-4 text-textMain">{editFarmLogId ? 'Edit Milk Sale' : 'Log Milk Sale'}</h2>
              <form onSubmit={handleAddLog} className="space-y-4">
                <select value={logData.session} onChange={e => setLogData({...logData, session: e.target.value})} className="w-full bg-background border border-glass rounded-lg px-4 py-3 text-sm text-textMain">
                  <option value="Morning">Morning Session</option>
                  <option value="Evening">Evening Session</option>
                </select>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-textMuted mb-1 block">Liters Produced</label>
                    <input required type="number" step="0.1" placeholder="Liters" value={logData.litersProduced} onChange={e => setLogData({...logData, litersProduced: e.target.value})} className="w-full bg-background border border-glass rounded-lg px-4 py-3 text-sm text-textMain" />
                  </div>
                  <div>
                    <label className="text-xs text-textMuted mb-1 block">Rate per Liter (₹)</label>
                    <input required type="number" step="0.5" placeholder="Rate (₹)" value={logData.ratePerLiter} onChange={e => setLogData({...logData, ratePerLiter: e.target.value})} className="w-full bg-background border border-glass rounded-lg px-4 py-3 text-sm text-textMain" />
                  </div>
                </div>

                <div className="bg-surface/50 p-4 rounded-xl border border-glass mt-2 flex justify-between items-center">
                  <span className="text-textMuted text-sm">Total Sale Value:</span>
                  <span className="font-bold text-lg text-green-400">
                    ₹{ (Number(logData.litersProduced || 0) * Number(logData.ratePerLiter || 0)).toFixed(2) }
                  </span>
                </div>
                
                <div className="flex justify-end gap-3 mt-6">
                  <button type="button" onClick={() => { setShowLogModal(false); setEditFarmLogId(null); }} className="px-4 py-2 text-sm text-textMuted hover:text-textMain">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-primary text-background rounded-lg font-medium text-sm">{editFarmLogId ? 'Update Log' : 'Save Log'}</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Sell Cow Modal */}
      <AnimatePresence>
        {showSellModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowSellModal(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="glass-panel p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-xl font-bold mb-4 text-textMain">Sell Cattle</h2>
              <form onSubmit={handleSellCow} className="space-y-4">
                <input required type="number" placeholder="Sale Price (₹)" value={sellData.salePrice} onChange={e => setSellData({...sellData, salePrice: e.target.value})} className="w-full bg-background border border-glass rounded-lg px-4 py-3 text-sm text-textMain" />
                <input required type="date" value={sellData.saleDate} onChange={e => setSellData({...sellData, saleDate: e.target.value})} className="w-full bg-background border border-glass rounded-lg px-4 py-3 text-sm text-textMain" />
                
                <div className="flex justify-end gap-3 mt-6">
                  <button type="button" onClick={() => setShowSellModal(false)} className="px-4 py-2 text-sm text-textMuted hover:text-textMain">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-green-500 text-white rounded-lg font-medium text-sm">Confirm Sale</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Log Feed Modal */}
      <AnimatePresence>
        {showFeedModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowFeedModal(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="glass-panel p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-xl font-bold mb-4 text-textMain">Log Farm Feed Expense</h2>
              <form onSubmit={handleAddFeed} className="space-y-4">
                <div>
                  <label className="text-xs text-textMuted mb-1 block">Description (e.g., Bulk Corn Silage)</label>
                  <input required type="text" placeholder="Description" value={feedData.description} onChange={e => setFeedData({...feedData, description: e.target.value})} className="w-full bg-background border border-glass rounded-lg px-4 py-3 text-sm text-textMain" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-textMuted mb-1 block">Cost (₹)</label>
                    <input required type="number" placeholder="Cost" value={feedData.amount} onChange={e => setFeedData({...feedData, amount: e.target.value})} className="w-full bg-background border border-glass rounded-lg px-4 py-3 text-sm text-textMain" />
                  </div>
                  <div>
                    <label className="text-xs text-textMuted mb-1 block">Date</label>
                    <input required type="date" value={feedData.date} onChange={e => setFeedData({...feedData, date: e.target.value})} className="w-full bg-background border border-glass rounded-lg px-4 py-3 text-sm text-textMain" />
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button type="button" onClick={() => setShowFeedModal(false)} className="px-4 py-2 text-sm text-textMuted hover:text-textMain">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-orange-500 text-white rounded-lg font-medium text-sm">Save Feed Expense</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Log Expense Modal (Per Cow) */}
      <AnimatePresence>
        {showExpenseModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowExpenseModal(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="glass-panel p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-xl font-bold mb-4 text-textMain">Log Medical Treatment</h2>
              <form onSubmit={handleAddExpense} className="space-y-4">
                <div>
                  <label className="text-xs text-textMuted mb-1 block">Description (e.g., Vet Visit, Vaccination)</label>
                  <input required type="text" placeholder="Description" value={expenseData.description} onChange={e => setExpenseData({...expenseData, description: e.target.value})} className="w-full bg-background border border-glass rounded-lg px-4 py-3 text-sm text-textMain" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-textMuted mb-1 block">Cost (₹)</label>
                    <input required type="number" placeholder="Cost" value={expenseData.amount} onChange={e => setExpenseData({...expenseData, amount: e.target.value})} className="w-full bg-background border border-glass rounded-lg px-4 py-3 text-sm text-textMain" />
                  </div>
                  <div>
                    <label className="text-xs text-textMuted mb-1 block">Date</label>
                    <input required type="date" value={expenseData.date} onChange={e => setExpenseData({...expenseData, date: e.target.value})} className="w-full bg-background border border-glass rounded-lg px-4 py-3 text-sm text-textMain" />
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button type="button" onClick={() => setShowExpenseModal(false)} className="px-4 py-2 text-sm text-textMuted hover:text-textMain">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-red-500 text-white rounded-lg font-medium text-sm">Save Expense</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
