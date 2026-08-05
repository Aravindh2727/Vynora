import { API_BASE_URL } from '../config';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Car, Fuel, Edit2, Trash2 } from 'lucide-react';
import { useContextEngineStore } from '../store/useContextEngineStore';

export default function VehicleManager() {
  const { user } = useContextEngineStore();
  const [vehicles, setVehicles] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [activeVid, setActiveVid] = useState(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', type: 'Car', licensePlate: '' });
  const [logData, setLogData] = useState({ type: 'Fuel', cost: '', notes: '' });

  useEffect(() => { fetchData(); }, [user]);

  const fetchData = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/vehicles?user=${user?.id || '1'}`);
      if (res.ok) setVehicles(await res.json());
    } catch (e) { console.error(e); }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editId ? `${API_BASE_URL}/api/vehicles/${editId}` : API_BASE_URL + '/api/vehicles';
      const method = editId ? 'PUT' : 'POST';

      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, user: user?.id || '1' })
      });
      setShowModal(false);
      setEditId(null);
      setFormData({ name: '', type: 'Car', licensePlate: '' });
      fetchData();
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`${API_BASE_URL}/api/vehicles/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (e) { console.error(e); }
  };

  const handleEdit = (v: any) => {
    setFormData({
      name: v.name || '',
      type: v.type || 'Car',
      licensePlate: v.licensePlate || ''
    });
    setEditId(v._id);
    setShowModal(true);
  };

  const handleLog = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch(`${API_BASE_URL}/api/vehicles/${activeVid}/logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...logData, cost: Number(logData.cost) })
      });
      setShowLogModal(false);
      fetchData();
    } catch (e) { console.error(e); }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-wider mb-1">Vehicle Manager</h1>
          <p className="text-textMuted">Track fuel, service, and repair logs.</p>
        </div>
        <button onClick={() => { setEditId(null); setShowModal(true); }} className="bg-primary text-background px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-primary/90 font-medium">
          <Plus size={18} /> Add Vehicle
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {vehicles.map((v: any) => {
          const totalSpent = v.logs?.reduce((acc: number, curr: any) => acc + curr.cost, 0) || 0;
          return (
            <motion.div key={v._id} whileHover={{ y: -5 }} className="glass-panel p-6 flex flex-col justify-between border-t-4 border-t-yellow-400">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-surface border border-glass rounded-xl text-yellow-400"><Car size={24} /></div>
                    <div>
                        <h3 className="text-xl font-bold text-textMain">{v.name}</h3>
                        <p className="text-sm text-textMuted">{v.type} • {v.licensePlate}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                      <button onClick={() => handleEdit(v)} className="text-gray-500 hover:text-blue-400 p-1"><Edit2 size={16}/></button>
                      <button onClick={() => handleDelete(v._id)} className="text-gray-500 hover:text-red-400 p-1"><Trash2 size={16}/></button>
                  </div>
                </div>
                <div className="bg-surface/50 p-4 rounded-xl border border-glass mb-4 flex justify-between items-center">
                    <p className="text-sm text-textMuted">Total Logged Expense</p>
                    <p className="font-bold text-lg text-red-400">₹{totalSpent.toFixed(2)}</p>
                </div>
              </div>

              <button onClick={() => { setActiveVid(v._id); setShowLogModal(true); }} className="w-full py-2 bg-yellow-400/20 text-yellow-400 border border-yellow-400/30 rounded-xl hover:bg-yellow-400/30 transition-colors text-sm font-medium flex items-center justify-center gap-2">
                <Fuel size={16} /> Add Log Entry
              </button>
            </motion.div>
          );
        })}
      </div>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => { setShowModal(false); setEditId(null); }}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-panel p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-xl font-bold mb-4 text-textMain">{editId ? 'Edit Vehicle' : 'Add Vehicle'}</h2>
              <form onSubmit={handleAdd} className="space-y-4">
                <input required type="text" placeholder="Vehicle Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-background border border-glass rounded-lg px-4 py-3 text-textMain" />
                <input required type="text" placeholder="License Plate" value={formData.licensePlate} onChange={e => setFormData({...formData, licensePlate: e.target.value})} className="w-full bg-background border border-glass rounded-lg px-4 py-3 text-textMain" />
                <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full bg-background border border-glass rounded-lg px-4 py-3 text-textMain">
                  <option>Car</option><option>Bike</option><option>Tractor</option>
                </select>
                <div className="flex justify-end gap-3 mt-6">
                  <button type="button" onClick={() => { setShowModal(false); setEditId(null); }} className="px-4 py-2 text-textMuted">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-primary text-background rounded-lg font-medium">{editId ? 'Update' : 'Add'}</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showLogModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowLogModal(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-panel p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-xl font-bold mb-4 text-textMain">New Log Entry</h2>
              <form onSubmit={handleLog} className="space-y-4">
                <select value={logData.type} onChange={e => setLogData({...logData, type: e.target.value})} className="w-full bg-background border border-glass rounded-lg px-4 py-3 text-textMain">
                  <option>Fuel</option><option>Service</option><option>Repair</option>
                </select>
                <input required type="number" placeholder="Cost (₹)" value={logData.cost} onChange={e => setLogData({...logData, cost: e.target.value})} className="w-full bg-background border border-glass rounded-lg px-4 py-3 text-textMain" />
                <input type="text" placeholder="Notes (e.g. Oil Change, 40L Petrol)" value={logData.notes} onChange={e => setLogData({...logData, notes: e.target.value})} className="w-full bg-background border border-glass rounded-lg px-4 py-3 text-textMain" />
                <div className="flex justify-end gap-3 mt-6">
                  <button type="button" onClick={() => setShowLogModal(false)} className="px-4 py-2 text-textMuted">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-primary text-background rounded-lg font-medium">Save Log</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
