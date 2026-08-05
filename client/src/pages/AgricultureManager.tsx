import { API_BASE_URL } from '../config';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Leaf, Sprout, TrendingUp, TrendingDown, Tractor, Droplet, Edit2, Trash2 } from 'lucide-react';
import { useContextEngineStore } from '../store/useContextEngineStore';

export default function AgricultureManager() {
  const { user } = useContextEngineStore();
  const [crops, setCrops] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '', season: 'Kharif', seedCost: '', fertilizerCost: '', waterCost: '', labourCost: '', machineCost: '', harvestQuantity: '', sellingPricePerUnit: '', status: 'Planted'
  });

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/agriculture?user=${user?.id || '1'}`);
      if (res.ok) setCrops(await res.json());
    } catch (e) { console.error(e); }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
        ...formData,
        user: user?.id || '1',
        seedCost: Number(formData.seedCost || 0),
        fertilizerCost: Number(formData.fertilizerCost || 0),
        waterCost: Number(formData.waterCost || 0),
        labourCost: Number(formData.labourCost || 0),
        machineCost: Number(formData.machineCost || 0),
        harvestQuantity: Number(formData.harvestQuantity || 0),
        sellingPricePerUnit: Number(formData.sellingPricePerUnit || 0),
    };
    try {
      const url = editId ? `${API_BASE_URL}/api/agriculture/${editId}` : API_BASE_URL + '/api/agriculture';
      const method = editId ? 'PUT' : 'POST';
      
      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      setShowModal(false);
      setEditId(null);
      setFormData({
        name: '', season: 'Kharif', seedCost: '', fertilizerCost: '', waterCost: '', labourCost: '', machineCost: '', harvestQuantity: '', sellingPricePerUnit: '', status: 'Planted'
      });
      fetchData();
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`${API_BASE_URL}/api/agriculture/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (e) { console.error(e); }
  };

  const handleEdit = (crop: any) => {
    setFormData({
      name: crop.name || '',
      season: crop.season || 'Kharif',
      seedCost: crop.seedCost || '',
      fertilizerCost: crop.fertilizerCost || '',
      waterCost: crop.waterCost || '',
      labourCost: crop.labourCost || '',
      machineCost: crop.machineCost || '',
      harvestQuantity: crop.harvestQuantity || '',
      sellingPricePerUnit: crop.sellingPricePerUnit || '',
      status: crop.status || 'Planted'
    });
    setEditId(crop._id);
    setShowModal(true);
  };

  const calculateFinances = (crop: any) => {
    const totalCost = crop.seedCost + crop.fertilizerCost + crop.waterCost + crop.labourCost + crop.machineCost;
    const totalRevenue = crop.harvestQuantity * crop.sellingPricePerUnit;
    const profit = totalRevenue - totalCost;
    return { totalCost, totalRevenue, profit };
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-wider mb-1">Agriculture Manager</h1>
          <p className="text-textMuted">Track crop expenses, harvest, and profit margins.</p>
        </div>
        <button onClick={() => { setEditId(null); setShowModal(true); }} className="bg-green-500 text-background px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-green-400 transition-colors shadow-neon-primary-sm font-medium">
          <Plus size={18} /> New Crop Cycle
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {crops.map((crop: any) => {
          const { totalCost, totalRevenue, profit } = calculateFinances(crop);
          return (
            <motion.div key={crop._id} whileHover={{ y: -5 }} className="glass-panel p-6 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-surface border border-glass rounded-xl text-green-400"><Leaf size={24} /></div>
                    <div>
                        <h3 className="text-xl font-bold text-textMain">{crop.name}</h3>
                        <p className="text-sm text-textMuted">{crop.season} Season • Status: <span className="text-primary font-medium">{crop.status}</span></p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleEdit(crop)} className="text-textMuted hover:text-blue-400 transition-colors" title="Edit">
                      <Edit2 size={18} />
                    </button>
                    <button onClick={() => handleDelete(crop._id)} className="text-textMuted hover:text-red-400 transition-colors" title="Delete">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4 mt-6">
                  <div className="bg-surface/50 p-3 rounded-lg border border-glass">
                    <p className="text-xs text-textMuted flex items-center gap-1 mb-1"><Tractor size={12}/> Total Expenses</p>
                    <p className="font-bold text-red-400">₹{totalCost.toFixed(2)}</p>
                  </div>
                  <div className="bg-surface/50 p-3 rounded-lg border border-glass">
                    <p className="text-xs text-textMuted flex items-center gap-1 mb-1"><Sprout size={12}/> Expected/Realized Rev.</p>
                    <p className="font-bold text-blue-400">₹{totalRevenue.toFixed(2)}</p>
                  </div>
                </div>
              </div>

              <div className={`p-4 rounded-xl border flex items-center justify-between ${profit >= 0 ? 'bg-green-400/10 border-green-400/30' : 'bg-red-400/10 border-red-400/30'}`}>
                <div className="flex items-center gap-2 font-bold">
                    {profit >= 0 ? <TrendingUp className="text-green-400" /> : <TrendingDown className="text-red-400" />}
                    <span className={profit >= 0 ? 'text-green-400' : 'text-red-400'}>Net Profit/Loss</span>
                </div>
                <div className={`text-xl font-bold ${profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    ₹{profit.toFixed(2)}
                </div>
              </div>
            </motion.div>
          );
        })}

        {crops.length === 0 && (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-gray-500 border-2 border-dashed border-glass rounded-2xl">
            <Leaf size={48} className="mb-4 opacity-50" />
            <p>No active crops.</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => { setShowModal(false); setEditId(null); }}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="glass-panel p-6 w-full max-w-2xl h-[80vh] overflow-y-auto custom-scrollbar" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-xl font-bold mb-4 text-textMain">{editId ? 'Edit Crop Cycle' : 'Log New Crop Cycle'}</h2>
              <form onSubmit={handleAdd} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                      <label className="text-xs text-textMuted mb-1 block">Crop Name</label>
                      <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-background border border-glass rounded-lg px-4 py-2 text-sm text-textMain outline-none focus:border-green-400" />
                  </div>
                  <div>
                      <label className="text-xs text-textMuted mb-1 block">Season</label>
                      <select value={formData.season} onChange={e => setFormData({...formData, season: e.target.value})} className="w-full bg-background border border-glass rounded-lg px-4 py-2 text-sm text-textMain outline-none focus:border-green-400">
                        <option>Kharif</option><option>Rabi</option><option>Zaid</option>
                      </select>
                  </div>
                </div>
                
                <h3 className="text-sm font-bold text-green-400 mt-6 border-b border-glass pb-2">Expenses (₹)</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <input type="number" placeholder="Seeds" value={formData.seedCost} onChange={e => setFormData({...formData, seedCost: e.target.value})} className="w-full bg-background border border-glass rounded-lg px-4 py-2 text-sm text-textMain" />
                    <input type="number" placeholder="Fertilizer" value={formData.fertilizerCost} onChange={e => setFormData({...formData, fertilizerCost: e.target.value})} className="w-full bg-background border border-glass rounded-lg px-4 py-2 text-sm text-textMain" />
                    <input type="number" placeholder="Water" value={formData.waterCost} onChange={e => setFormData({...formData, waterCost: e.target.value})} className="w-full bg-background border border-glass rounded-lg px-4 py-2 text-sm text-textMain" />
                    <input type="number" placeholder="Labour" value={formData.labourCost} onChange={e => setFormData({...formData, labourCost: e.target.value})} className="w-full bg-background border border-glass rounded-lg px-4 py-2 text-sm text-textMain" />
                    <input type="number" placeholder="Machine/Tractor" value={formData.machineCost} onChange={e => setFormData({...formData, machineCost: e.target.value})} className="w-full bg-background border border-glass rounded-lg px-4 py-2 text-sm text-textMain" />
                </div>

                <h3 className="text-sm font-bold text-blue-400 mt-6 border-b border-glass pb-2">Harvest & Revenue</h3>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs text-textMuted mb-1 block">Harvest Quantity (Kg)</label>
                        <input type="number" value={formData.harvestQuantity} onChange={e => setFormData({...formData, harvestQuantity: e.target.value})} className="w-full bg-background border border-glass rounded-lg px-4 py-2 text-sm text-textMain" />
                    </div>
                    <div>
                        <label className="text-xs text-textMuted mb-1 block">Selling Price per Kg (₹)</label>
                        <input type="number" value={formData.sellingPricePerUnit} onChange={e => setFormData({...formData, sellingPricePerUnit: e.target.value})} className="w-full bg-background border border-glass rounded-lg px-4 py-2 text-sm text-textMain" />
                    </div>
                </div>
                
                <div className="flex justify-end gap-3 mt-8">
                  <button type="button" onClick={() => { setShowModal(false); setEditId(null); }} className="px-4 py-2 text-sm text-textMuted hover:text-textMain">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-green-500 text-background rounded-lg font-medium text-sm hover:bg-green-400">{editId ? 'Update Crop Cycle' : 'Save Crop Cycle'}</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
