import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Phone, AlertTriangle, HeartPulse, Edit2, Trash2,
  ShieldAlert, Star, MapPin, User, Stethoscope, Flame, Siren, Wrench, Download
} from 'lucide-react';
import { useContextEngineStore } from '../store/useContextEngineStore';
import { ContactService, getActiveUserId } from '../services/firestoreService';
import { exportToCSV } from '../utils/csvExport';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { SearchFilterBar } from '../components/common/SearchFilterBar';
import { EmptyState } from '../components/common/EmptyState';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { MobilePageHeader } from '../components/common/MobilePageHeader';

const CONTACT_CATEGORIES = [
  'Family & Kin', 'Doctor & Clinic', 'Hospital & Ambulance',
  'Police & Fire', 'Local Utility / Roadside', 'Other'
];

export default function EmergencyContacts() {
  const { user } = useContextEngineStore();
  const activeUid = getActiveUserId(user?.id);

  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    relation: '',
    category: 'Family & Kin',
    priority: 'Primary', // Primary, Secondary, General
    phone: '',
    altPhone: '',
    address: '',
    bloodGroup: '',
    medicalNotes: '',
    isEmergency: true
  });

  // Delete Confirm
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    fetchContacts();
  }, [user]);

  const fetchContacts = async () => {
    setLoading(true);
    try {
      const data = await ContactService.getContacts(activeUid);
      setContacts(data);
    } catch (e) {
      console.error('Error fetching contacts:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim()) return;

    try {
      const payload = {
        ...formData,
        isEmergency: formData.priority === 'Primary' || Boolean(formData.isEmergency)
      };

      if (editId) {
        await ContactService.updateContact(editId, payload);
      } else {
        await ContactService.addContact(activeUid, payload);
      }

      setShowModal(false);
      setEditId(null);
      resetForm();
      fetchContacts();
    } catch (e) {
      console.error('Error saving contact:', e);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '', relation: '', category: 'Family & Kin', priority: 'Primary',
      phone: '', altPhone: '', address: '', bloodGroup: '', medicalNotes: '', isEmergency: true
    });
  };

  const handleEdit = (c: any) => {
    setFormData({
      name: c.name || '',
      relation: c.relation || '',
      category: c.category || 'Family & Kin',
      priority: c.priority || (c.isEmergency ? 'Primary' : 'General'),
      phone: c.phone || '',
      altPhone: c.altPhone || '',
      address: c.address || '',
      bloodGroup: c.bloodGroup || '',
      medicalNotes: c.medicalNotes || '',
      isEmergency: Boolean(c.isEmergency)
    });
    setEditId(c._id);
    setShowModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteId) return;
    try {
      await ContactService.deleteContact(deleteId);
      setDeleteId(null);
      fetchContacts();
    } catch (e) {
      console.error('Delete error:', e);
    }
  };

  // Filter & Priority Sort
  const filteredContacts = contacts
    .filter(c => {
      const matchesSearch = !searchQuery ||
        c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.relation?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.phone?.includes(searchQuery);
      const matchesCat = categoryFilter === 'All' || c.category === categoryFilter;
      return matchesSearch && matchesCat;
    })
    .sort((a, b) => {
      const priorityWeight: Record<string, number> = { Primary: 3, Secondary: 2, General: 1 };
      const weightA = priorityWeight[a.priority] || (a.isEmergency ? 3 : 1);
      const weightB = priorityWeight[b.priority] || (b.isEmergency ? 3 : 1);
      return weightB - weightA;
    });

  return (
    <div className="space-y-6 pb-12">
      {/* Mobile Page Header with single-level back to Dashboard */}
      <MobilePageHeader
        title="Emergency Center"
        parentLabel="Dashboard"
        fallbackPath="/"
        icon={<AlertTriangle className="text-red-500" size={24} />}
        subtitle="Priority directory for critical medical contacts, ambulance, police, and kin."
        actions={
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => exportToCSV(contacts, 'Vynora_Emergency_Contacts')}
              className="px-3 py-2 rounded-xl border border-glass bg-surface hover:bg-surfaceLight text-textMain text-xs font-medium flex items-center gap-1.5 min-h-[44px]"
            >
              <Download size={14} /> <span className="hidden sm:inline">Export</span>
            </button>
            <button
              type="button"
              onClick={() => { setEditId(null); resetForm(); setShowModal(true); }}
              className="bg-red-500 text-white px-3.5 py-2 rounded-xl flex items-center gap-1.5 hover:bg-red-600 font-bold text-xs shadow-[0_0_15px_rgba(239,68,68,0.5)] min-h-[44px] active:scale-95"
            >
              <Plus size={16} /> Add Contact
            </button>
          </div>
        }
      />

      {/* Safety Notice Banner */}
      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3.5 flex items-start gap-3 text-xs text-red-300">
        <ShieldAlert size={18} className="shrink-0 text-red-400 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="font-semibold text-red-200">Emergency Protocol Notice:</strong> Clicking any contact dials their phone number directly
          via your device carrier. This application does not automatically dispatch police, ambulances, or emergency response personnel. In a life-threatening crisis,
          dial your national emergency number (e.g. 112 / 108 / 911) immediately.
        </p>
      </div>

      {/* National Quick Hotlines Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <a href="tel:112" className="glass-panel p-3.5 flex items-center gap-3 hover:border-red-500 transition-colors">
          <div className="p-2 bg-red-500/20 text-red-400 rounded-lg"><Siren size={20} /></div>
          <div>
            <p className="text-xs text-textMuted">National Emergency</p>
            <p className="text-lg font-bold font-mono text-red-400">112</p>
          </div>
        </a>
        <a href="tel:108" className="glass-panel p-3.5 flex items-center gap-3 hover:border-blue-400 transition-colors">
          <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg"><HeartPulse size={20} /></div>
          <div>
            <p className="text-xs text-textMuted">Ambulance / Trauma</p>
            <p className="text-lg font-bold font-mono text-blue-400">108</p>
          </div>
        </a>
        <a href="tel:100" className="glass-panel p-3.5 flex items-center gap-3 hover:border-yellow-400 transition-colors">
          <div className="p-2 bg-yellow-400/20 text-yellow-400 rounded-lg"><ShieldAlert size={20} /></div>
          <div>
            <p className="text-xs text-textMuted">Police Control</p>
            <p className="text-lg font-bold font-mono text-yellow-400">100</p>
          </div>
        </a>
        <a href="tel:101" className="glass-panel p-3.5 flex items-center gap-3 hover:border-orange-500 transition-colors">
          <div className="p-2 bg-orange-500/20 text-orange-400 rounded-lg"><Flame size={20} /></div>
          <div>
            <p className="text-xs text-textMuted">Fire Brigade</p>
            <p className="text-lg font-bold font-mono text-orange-400">101</p>
          </div>
        </a>
      </div>

      {/* Search & Filter Bar */}
      <SearchFilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search contact by name, relation, or phone..."
        selectedCategory={categoryFilter}
        onCategoryChange={setCategoryFilter}
        categories={[{ label: 'All Categories', value: 'All' }, ...CONTACT_CATEGORIES.map(c => ({ label: c, value: c }))]}
        totalCount={filteredContacts.length}
      />

      {/* Contact Cards Grid */}
      {loading ? (
        <LoadingSpinner />
      ) : filteredContacts.length === 0 ? (
        <EmptyState
          icon={Phone}
          title="No emergency contacts saved"
          description="Add your family members, personal physicians, and 24x7 local services."
          actionText="Add Emergency Contact"
          onAction={() => setShowModal(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredContacts.map((c: any) => {
            const isPrimary = c.priority === 'Primary' || c.isEmergency;
            return (
              <motion.div
                key={c._id}
                whileHover={{ y: -4 }}
                className={`glass-panel p-6 flex flex-col justify-between border-t-4 transition-all ${
                  isPrimary ? 'border-t-red-500 bg-red-950/10 hover:shadow-[0_0_20px_rgba(239,68,68,0.2)]' : 'border-t-blue-500 hover:shadow-neon-primary-sm'
                }`}
              >
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-xl ${isPrimary ? 'bg-red-500/20 text-red-500' : 'bg-surface border border-glass text-blue-400'}`}>
                        {isPrimary ? <AlertTriangle size={22} /> : <Phone size={22} />}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-textMain flex items-center gap-1.5">
                          {c.name}
                          {isPrimary && <Star size={14} className="text-red-400 fill-red-400 shrink-0" />}
                        </h3>
                        <p className="text-xs text-textMuted">{c.relation || c.category}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button onClick={() => handleEdit(c)} className="p-1.5 text-textMuted hover:text-primary">
                        <Edit2 size={15} />
                      </button>
                      <button onClick={() => setDeleteId(c._id)} className="p-1.5 text-textMuted hover:text-red-400">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Dial Action */}
                  <div className="my-3 space-y-2">
                    <a
                      href={`tel:${c.phone}`}
                      className="w-full py-2.5 px-3.5 bg-background/60 hover:bg-green-500/10 border border-glass hover:border-green-500/40 rounded-xl flex items-center justify-between text-textMain hover:text-green-400 transition-colors group"
                    >
                      <div className="flex items-center gap-2 font-mono text-base font-semibold">
                        <Phone size={16} className="text-green-400 group-hover:animate-bounce" />
                        <span>{c.phone}</span>
                      </div>
                      <span className="text-xs font-sans px-2 py-0.5 rounded bg-surface border border-glass text-textMuted">
                        Call Now
                      </span>
                    </a>

                    {c.altPhone && (
                      <a
                        href={`tel:${c.altPhone}`}
                        className="w-full py-1.5 px-3 bg-surface/40 hover:bg-surface border border-glass rounded-lg flex items-center justify-between text-xs text-textMuted hover:text-textMain transition-colors"
                      >
                        <span className="font-mono">Alt: {c.altPhone}</span>
                        <span>Dial</span>
                      </a>
                    )}
                  </div>

                  {/* Notes & Address */}
                  {(c.address || c.medicalNotes || c.bloodGroup) && (
                    <div className="pt-2 border-t border-glass space-y-1 text-xs text-textMuted">
                      {c.bloodGroup && (
                        <div className="flex justify-between">
                          <span>Blood Group:</span>
                          <span className="font-bold text-red-400">{c.bloodGroup}</span>
                        </div>
                      )}
                      {c.address && (
                        <div className="flex items-start gap-1.5 truncate">
                          <MapPin size={13} className="shrink-0 text-textMuted mt-0.5" />
                          <span className="truncate">{c.address}</span>
                        </div>
                      )}
                      {c.medicalNotes && (
                        <p className="bg-surface/60 p-2 rounded border border-glass text-[11px] text-textMain mt-1">
                          {c.medicalNotes}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="pt-3 mt-3 border-t border-glass flex items-center justify-between text-[11px] text-textMuted">
                  <span>Category: {c.category || 'Family & Kin'}</span>
                  <span className={`font-semibold ${isPrimary ? 'text-red-400' : 'text-blue-400'}`}>
                    {c.priority || 'Primary'} Priority
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* CONTACT MODAL */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-panel max-w-md w-full p-6 border border-glass shadow-neon-primary-sm"
            >
              <h2 className="text-xl font-bold text-textMain mb-4 flex items-center gap-2">
                <HeartPulse className="text-red-400" size={22} />
                {editId ? 'Edit Emergency Contact' : 'Add Emergency Contact'}
              </h2>

              <form onSubmit={handleSaveContact} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-textMuted mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. John Doe, Dr. Sharma, City Trauma"
                    className="w-full bg-surface border border-glass rounded-xl px-4 py-2 text-sm text-textMain"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-textMuted mb-1">Relationship</label>
                    <input
                      type="text"
                      value={formData.relation}
                      onChange={(e) => setFormData({ ...formData, relation: e.target.value })}
                      placeholder="e.g. Spouse, Physician"
                      className="w-full bg-surface border border-glass rounded-xl px-3 py-2 text-sm text-textMain"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-textMuted mb-1">Priority</label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                      className="w-full bg-surface border border-glass rounded-xl px-3 py-2 text-sm text-textMain font-semibold"
                    >
                      <option value="Primary">Primary (Urgent SOS)</option>
                      <option value="Secondary">Secondary</option>
                      <option value="General">General Contact</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-textMuted mb-1">Primary Phone *</label>
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+91 98765 43210"
                      className="w-full bg-surface border border-glass rounded-xl px-3 py-2 text-sm font-mono text-textMain"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-textMuted mb-1">Alternate Phone</label>
                    <input
                      type="tel"
                      value={formData.altPhone}
                      onChange={(e) => setFormData({ ...formData, altPhone: e.target.value })}
                      placeholder="Landline / Mobile"
                      className="w-full bg-surface border border-glass rounded-xl px-3 py-2 text-sm font-mono text-textMain"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-textMuted mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-surface border border-glass rounded-xl px-4 py-2 text-sm text-textMain"
                  >
                    {CONTACT_CATEGORIES.map(c => <option key={c} value={c} className="bg-surface">{c}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-textMuted mb-1">Blood Group</label>
                    <select
                      value={formData.bloodGroup}
                      onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                      className="w-full bg-surface border border-glass rounded-xl px-3 py-2 text-sm text-red-400 font-bold"
                    >
                      <option value="">Unknown</option>
                      {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                        <option key={bg} value={bg} className="bg-surface text-textMain">{bg}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-textMuted mb-1">Address / Landmark</label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="Home / Clinic address"
                      className="w-full bg-surface border border-glass rounded-xl px-3 py-2 text-sm text-textMain"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-textMuted mb-1">Medical or Access Instructions</label>
                  <textarea
                    rows={2}
                    value={formData.medicalNotes}
                    onChange={(e) => setFormData({ ...formData, medicalNotes: e.target.value })}
                    placeholder="Key allergies, spare keys location, or gate access notes..."
                    className="w-full bg-surface border border-glass rounded-xl px-4 py-2 text-sm text-textMain"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-glass">
                  <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 rounded-xl border border-glass text-textMuted text-sm">Cancel</button>
                  <button type="submit" className="bg-red-500 text-white px-5 py-2 rounded-xl font-medium text-sm hover:bg-red-600 shadow-[0_0_15px_rgba(239,68,68,0.5)]">
                    Save Contact
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CONFIRM DELETE MODAL */}
      <ConfirmModal
        isOpen={Boolean(deleteId)}
        title="Delete Emergency Contact"
        message="Are you sure you want to delete this emergency contact? Ensure you have alternative critical contacts saved."
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
