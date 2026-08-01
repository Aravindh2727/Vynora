import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, BellRing, CheckCircle2, Circle, Clock, Pill, Edit2, Trash2 } from 'lucide-react';
import { useContextEngineStore } from '../store/useContextEngineStore';

export default function MedicineReminder() {
  const { user } = useContextEngineStore();
  const [medicines, setMedicines] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ 
    name: '', 
    dosage: '', 
    frequency: 'Daily', 
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    schedule: {
      morning: { selected: false, time: '' },
      afternoon: { selected: false, time: '' },
      evening: { selected: false, time: '' },
      night: { selected: false, time: '' }
    }
  });
  useEffect(() => {
    fetchData();
    // Request Notification permission
    if ('Notification' in window && Notification.permission !== 'granted') {
      Notification.requestPermission();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      const res = await fetch(`http://localhost:5000/api/medicine?user=${user?.id || '1'}`);
      if (res.ok) setMedicines(await res.json());
    } catch (e) { console.error(e); }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editId ? `http://localhost:5000/api/medicine/${editId}` : 'http://localhost:5000/api/medicine';
      const method = editId ? 'PUT' : 'POST';
      
      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, user: user?.id || '1' })
      });
      setShowModal(false);
      setEditId(null);
      setFormData({ 
        name: '', dosage: '', frequency: 'Daily', 
        startDate: new Date().toISOString().split('T')[0], endDate: '',
        schedule: {
          morning: { selected: false, time: '' }, afternoon: { selected: false, time: '' },
          evening: { selected: false, time: '' }, night: { selected: false, time: '' }
        }
      });
      fetchData();
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`http://localhost:5000/api/medicine/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (e) { console.error(e); }
  };

  const handleEdit = (med: any) => {
    setFormData({
      name: med.name,
      dosage: med.dosage,
      frequency: med.frequency || 'Daily',
      startDate: med.startDate ? new Date(med.startDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      endDate: med.endDate ? new Date(med.endDate).toISOString().split('T')[0] : '',
      schedule: med.schedule || {
        morning: { selected: false, time: '' }, afternoon: { selected: false, time: '' },
        evening: { selected: false, time: '' }, night: { selected: false, time: '' }
      }
    });
    setEditId(med._id);
    setShowModal(true);
  };

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      await fetch(`http://localhost:5000/api/medicine/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isCompleted: !currentStatus })
      });
      fetchData();
    } catch (e) { console.error(e); }
  };

  const simulateNotification = (name: string, dosage: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Medicine Reminder', {
        body: `Time to take your medication: ${name} (${dosage})`,
        icon: '/vite.svg'
      });
    } else {
      alert(`Time to take your medication: ${name} (${dosage})`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-wider mb-1">Medicine Reminder</h1>
          <p className="text-textMuted">Track and schedule your health routine.</p>
        </div>
        <button onClick={() => { setEditId(null); setShowModal(true); }} className="bg-primary text-background px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-primary/90 transition-colors shadow-neon-primary-sm font-medium">
          <Plus size={18} /> Add Medicine
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {medicines.map((med: any) => (
          <motion.div key={med._id} whileHover={{ y: -5 }} className="glass-panel p-6 relative overflow-hidden flex flex-col justify-between">
            <div className={`absolute top-0 left-0 w-1 h-full ${med.isCompleted ? 'bg-green-400' : 'bg-primary'}`}></div>
            <div>
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-surface border border-glass rounded-xl text-blue-400">
                  <Pill size={24} />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(med)} className="text-textMuted hover:text-blue-400 transition-colors" title="Edit">
                    <Edit2 size={18} />
                  </button>
                  <button onClick={() => handleDelete(med._id)} className="text-textMuted hover:text-red-400 transition-colors" title="Delete">
                    <Trash2 size={18} />
                  </button>
                  <button onClick={() => simulateNotification(med.name, med.dosage)} className="text-textMuted hover:text-textMain transition-colors ml-1" title="Test Notification">
                    <BellRing size={18} />
                  </button>
                </div>
              </div>
              <h3 className="text-xl font-bold text-textMain mb-1">{med.name}</h3>
              <p className="text-sm text-textMuted mb-4">{med.dosage} • {med.frequency}</p>
              
              <div className="flex flex-wrap gap-2 mb-6">
                {med.schedule ? (
                  Object.entries(med.schedule).map(([period, data]: any) => {
                    if (!data.selected) return null;
                    const icons: any = { morning: '🌅', afternoon: '☀️', evening: '🌆', night: '🌙' };
                    return (
                      <div key={period} className="flex items-center gap-1.5 text-xs font-medium bg-surface/80 px-2.5 py-1.5 rounded-lg border border-glass w-fit capitalize">
                        <span>{icons[period]}</span>
                        {period} {data.time && <span className="text-textMuted font-normal ml-1">{data.time}</span>}
                      </div>
                    );
                  })
                ) : (
                  <div className="flex items-center gap-2 text-sm font-medium bg-surface/50 p-2 rounded-lg border border-glass w-fit">
                    <Clock size={14} className="text-primary" /> {med.time}
                  </div>
                )}
              </div>
            </div>

            <button 
              onClick={() => toggleStatus(med._id, med.isCompleted)}
              className={`w-full py-2 rounded-xl flex items-center justify-center gap-2 font-medium transition-colors ${
                med.isCompleted ? 'bg-green-400/20 text-green-400 border border-green-400/50' : 'bg-surface border border-glass text-textMuted hover:text-textMain hover:bg-surfaceLight'
              }`}
            >
              {med.isCompleted ? <><CheckCircle2 size={18} /> Taken</> : <><Circle size={18} /> Mark as Taken</>}
            </button>
          </motion.div>
        ))}

        {medicines.length === 0 && (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-gray-500 border-2 border-dashed border-glass rounded-2xl">
            <Pill size={48} className="mb-4 opacity-50" />
            <p>No medicines scheduled.</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => { setShowModal(false); setEditId(null); }}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="glass-panel p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-xl font-bold mb-4 text-textMain">{editId ? 'Edit Medicine' : 'Add Medicine'}</h2>
              <form onSubmit={handleAdd} className="space-y-4">
                <input required type="text" placeholder="Medicine Name (e.g., Paracetamol)" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-background border border-glass rounded-lg px-4 py-3 text-sm text-textMain outline-none focus:border-primary transition-colors" />
                <input required type="text" placeholder="Dosage (e.g., 500mg or 1 Tablet)" value={formData.dosage} onChange={e => setFormData({...formData, dosage: e.target.value})} className="w-full bg-background border border-glass rounded-lg px-4 py-3 text-sm text-textMain outline-none focus:border-primary transition-colors" />
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="relative">
                    <label className="text-xs text-textMuted mb-1 block">Start Date</label>
                    <input required type="date" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} className="w-full bg-background border border-glass rounded-lg px-4 py-3 text-sm text-transparent [&::-webkit-datetime-edit]:text-transparent outline-none focus:border-primary transition-colors" />
                    <span className={`absolute left-4 top-[38px] pointer-events-none text-sm ${formData.startDate ? 'text-textMain' : 'text-textMuted'}`}>
                      {formData.startDate ? formData.startDate.split('-').reverse().join('/') : 'dd/mm/yyyy'}
                    </span>
                  </div>
                  <div className="relative">
                    <label className="text-xs text-textMuted mb-1 block">End Date (Optional)</label>
                    <input type="date" value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} className="w-full bg-background border border-glass rounded-lg px-4 py-3 text-sm text-transparent [&::-webkit-datetime-edit]:text-transparent outline-none focus:border-primary transition-colors" />
                    <span className={`absolute left-4 top-[38px] pointer-events-none text-sm ${formData.endDate ? 'text-textMain' : 'text-textMuted'}`}>
                      {formData.endDate ? formData.endDate.split('-').reverse().join('/') : 'dd/mm/yyyy'}
                    </span>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <label className="text-sm font-medium text-textMain block">Time of Day</label>
                  {['morning', 'afternoon', 'evening', 'night'].map((period) => (
                    <div key={period} className="flex items-center justify-between p-3 bg-background border border-glass rounded-lg">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={formData.schedule[period as keyof typeof formData.schedule].selected}
                          onChange={(e) => setFormData({
                            ...formData, 
                            schedule: {
                              ...formData.schedule,
                              [period]: { ...formData.schedule[period as keyof typeof formData.schedule], selected: e.target.checked }
                            }
                          })}
                          className="w-4 h-4 rounded border-glass text-primary focus:ring-primary bg-background"
                        />
                        <span className="text-sm capitalize">{period}</span>
                      </label>
                      {formData.schedule[period as keyof typeof formData.schedule].selected && (
                        <div className="flex items-center gap-2 bg-surface border border-glass rounded px-2 py-1 focus-within:border-primary transition-colors">
                          <Clock size={14} className="text-textMuted" />
                          <input 
                            type="time" 
                            value={formData.schedule[period as keyof typeof formData.schedule].time}
                            onChange={(e) => setFormData({
                              ...formData, 
                              schedule: {
                                ...formData.schedule,
                                [period]: { ...formData.schedule[period as keyof typeof formData.schedule], time: e.target.value }
                              }
                            })}
                            className="bg-transparent text-sm text-textMain outline-none"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <select value={formData.frequency} onChange={e => setFormData({...formData, frequency: e.target.value})} className="w-full bg-background border border-glass rounded-lg px-4 py-3 text-sm text-textMain outline-none focus:border-primary transition-colors">
                  <option>Daily</option>
                  <option>Weekly</option>
                  <option>As Needed</option>
                </select>
                
                <div className="flex justify-end gap-3 mt-6">
                  <button type="button" onClick={() => { setShowModal(false); setEditId(null); }} className="px-4 py-2 text-sm text-textMuted hover:text-textMain transition-colors">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-primary text-background rounded-lg font-medium text-sm shadow-neon-primary-sm hover:bg-primary/90 transition-colors">{editId ? 'Update' : 'Schedule'}</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
