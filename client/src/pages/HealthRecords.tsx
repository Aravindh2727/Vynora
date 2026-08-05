import { API_BASE_URL } from '../config';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Activity, HeartPulse, Edit2, Trash2 } from 'lucide-react';
import { useContextEngineStore } from '../store/useContextEngineStore';

export default function HealthRecords() {
  const { user } = useContextEngineStore();
  const [records, setRecords] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ recordType: 'Blood Pressure', value: '', notes: '' });

  useEffect(() => { fetchData(); }, [user]);

  const fetchData = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/health?user=${user?.id || '1'}`);
      if (res.ok) setRecords(await res.json());
    } catch (e) { console.error(e); }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editId ? `${API_BASE_URL}/api/health/${editId}` : API_BASE_URL + '/api/health';
      const method = editId ? 'PUT' : 'POST';

      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, user: user?.id || '1' })
      });
      setShowModal(false);
      setEditId(null);
      setFormData({ recordType: 'Blood Pressure', value: '', notes: '' });
      fetchData();
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`${API_BASE_URL}/api/health/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (e) { console.error(e); }
  };

  const handleEdit = (record: any) => {
    setFormData({
      recordType: record.recordType || 'Blood Pressure',
      value: record.value || '',
      notes: record.notes || ''
    });
    setEditId(record._id);
    setShowModal(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-wider mb-1">Health Records</h1>
          <p className="text-textMuted">Monitor vitals and general health.</p>
        </div>
        <button onClick={() => { setEditId(null); setShowModal(true); }} className="bg-red-500 text-textMain px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-red-400 font-medium">
          <Plus size={18} /> Add Log
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {records.map((r: any) => (
          <motion.div key={r._id} whileHover={{ y: -5 }} className="glass-panel p-6 border-l-4 border-l-red-400">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-400/20 text-red-400 rounded-lg"><Activity size={20} /></div>
              <div className="flex-1">
                  <h3 className="font-bold text-textMain">{r.recordType}</h3>
                  <p className="text-xs text-textMuted">{new Date(r.date).toLocaleString()}</p>
              </div>
              <div className="flex gap-1 border-l border-glass pl-2 ml-2">
                  <button onClick={() => handleEdit(r)} className="text-textMuted hover:text-blue-400 p-1"><Edit2 size={16}/></button>
                  <button onClick={() => handleDelete(r._id)} className="text-textMuted hover:text-red-400 p-1"><Trash2 size={16}/></button>
              </div>
            </div>
            <div className="text-3xl font-bold text-textMain mb-2">{r.value}</div>
            {r.notes && <p className="text-sm text-textMuted bg-surface p-2 rounded border border-glass">{r.notes}</p>}
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => { setShowModal(false); setEditId(null); }}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-panel p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-xl font-bold mb-4 text-textMain">{editId ? 'Edit Log' : 'Log Vitals'}</h2>
              <form onSubmit={handleAdd} className="space-y-4">
                <select value={formData.recordType} onChange={e => setFormData({...formData, recordType: e.target.value})} className="w-full bg-background border border-glass rounded-lg px-4 py-3 text-textMain">
                  <option>Blood Pressure</option><option>Blood Sugar</option><option>Weight/BMI</option><option>General Note</option>
                </select>
                <input required type="text" placeholder="Value (e.g. 120/80, 95 mg/dL)" value={formData.value} onChange={e => setFormData({...formData, value: e.target.value})} className="w-full bg-background border border-glass rounded-lg px-4 py-3 text-textMain" />
                <input type="text" placeholder="Notes (Optional)" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full bg-background border border-glass rounded-lg px-4 py-3 text-textMain" />
                
                <div className="flex justify-end gap-3 mt-6">
                  <button type="button" onClick={() => { setShowModal(false); setEditId(null); }} className="px-4 py-2 text-textMuted">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-red-500 text-textMain rounded-lg font-medium">{editId ? 'Update Log' : 'Save Log'}</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
