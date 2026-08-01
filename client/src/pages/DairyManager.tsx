import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Milk, FileDigit, Activity, Edit2, Trash2 } from 'lucide-react';
import { useContextEngineStore } from '../store/useContextEngineStore';

export default function DairyManager() {
  const { user } = useContextEngineStore();
  const [cows, setCows] = useState([]);
  const [showCowModal, setShowCowModal] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [activeCowId, setActiveCowId] = useState(null);
  const [editCowId, setEditCowId] = useState<string | null>(null);
  
  const [cowData, setCowData] = useState({ tagNumber: '', breed: '', dailyFoodCost: '' });
  const [logData, setLogData] = useState({ litersProduced: '', soldAmount: '' });

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      const res = await fetch(`http://localhost:5000/api/dairy?user=${user?.id || '1'}`);
      if (res.ok) setCows(await res.json());
    } catch (e) { console.error(e); }
  };

  const handleAddCow = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editCowId ? `http://localhost:5000/api/dairy/${editCowId}` : 'http://localhost:5000/api/dairy';
      const method = editCowId ? 'PUT' : 'POST';

      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...cowData, user: user?.id || '1', dailyFoodCost: Number(cowData.dailyFoodCost) })
      });
      setShowCowModal(false);
      setEditCowId(null);
      setCowData({ tagNumber: '', breed: '', dailyFoodCost: '' });
      fetchData();
    } catch (e) { console.error(e); }
  };

  const handleDeleteCow = async (id: string) => {
    try {
      await fetch(`http://localhost:5000/api/dairy/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (e) { console.error(e); }
  };

  const handleEditCow = (cow: any) => {
    setCowData({
      tagNumber: cow.tagNumber || '',
      breed: cow.breed || '',
      dailyFoodCost: cow.dailyFoodCost || ''
    });
    setEditCowId(cow._id);
    setShowCowModal(true);
  };

  const handleAddLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCowId) return;
    try {
      await fetch(`http://localhost:5000/api/dairy/${activeCowId}/logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ litersProduced: Number(logData.litersProduced), soldAmount: Number(logData.soldAmount) })
      });
      setShowLogModal(false);
      setLogData({ litersProduced: '', soldAmount: '' });
      fetchData();
    } catch (e) { console.error(e); }
  };

  const calculateTotalYield = (logs: any[]) => logs.reduce((acc, curr) => acc + curr.litersProduced, 0);
  const calculateTotalRevenue = (logs: any[]) => logs.reduce((acc, curr) => acc + curr.soldAmount, 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-wider mb-1">Dairy Management</h1>
          <p className="text-textMuted">Track cattle health, milk production, and revenue.</p>
        </div>
        <button onClick={() => { setEditCowId(null); setShowCowModal(true); }} className="bg-white text-black px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-gray-200 transition-colors shadow-neon-primary-sm font-medium">
          <Plus size={18} /> Add Cattle
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {cows.map((cow: any) => {
          const totalLiters = calculateTotalYield(cow.productionLogs);
          const totalRevenue = calculateTotalRevenue(cow.productionLogs);
          
          return (
            <motion.div key={cow._id} whileHover={{ y: -5 }} className="glass-panel p-6 flex flex-col justify-between border-t-4 border-t-white">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-surface border border-glass rounded-xl text-textMain"><Milk size={24} /></div>
                    <div>
                        <h3 className="text-xl font-bold text-textMain">Tag: #{cow.tagNumber}</h3>
                        <p className="text-sm text-textMuted">Breed: {cow.breed}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
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
                        <p className="text-xs text-textMuted mb-1">Total Milk Yield</p>
                        <p className="font-bold text-lg text-textMain">{totalLiters} Liters</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-textMuted mb-1">Total Revenue</p>
                        <p className="font-bold text-lg text-green-400">₹{totalRevenue.toFixed(2)}</p>
                    </div>
                </div>
              </div>

              <button 
                onClick={() => { setActiveCowId(cow._id); setShowLogModal(true); }}
                className="w-full py-2 bg-primary/20 text-primary border border-primary/30 rounded-xl hover:bg-primary/30 transition-colors text-sm font-medium flex items-center justify-center gap-2"
              >
                <FileDigit size={16} /> Log Today's Milk
              </button>
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
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowLogModal(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="glass-panel p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-xl font-bold mb-4 text-textMain">Log Milk Production</h2>
              <form onSubmit={handleAddLog} className="space-y-4">
                <input required type="number" placeholder="Liters Produced" value={logData.litersProduced} onChange={e => setLogData({...logData, litersProduced: e.target.value})} className="w-full bg-background border border-glass rounded-lg px-4 py-3 text-sm text-textMain" />
                <input required type="number" placeholder="Revenue from Sale (₹)" value={logData.soldAmount} onChange={e => setLogData({...logData, soldAmount: e.target.value})} className="w-full bg-background border border-glass rounded-lg px-4 py-3 text-sm text-textMain" />
                
                <div className="flex justify-end gap-3 mt-6">
                  <button type="button" onClick={() => setShowLogModal(false)} className="px-4 py-2 text-sm text-textMuted hover:text-textMain">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-primary text-background rounded-lg font-medium text-sm">Save Log</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
