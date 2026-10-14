import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Package, Calendar, Edit2, Trash2, ShieldAlert, ShieldCheck,
  Tag, MapPin, IndianRupee, Download, FileText, CheckCircle2, Clock
} from 'lucide-react';
import { useContextEngineStore } from '../store/useContextEngineStore';
import { InventoryService, getActiveUserId } from '../services/firestoreService';
import { calculateDaysRemaining } from '../utils/calculations';
import { exportToCSV } from '../utils/csvExport';
import { FileUpload } from '../components/common/FileUpload';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { SearchFilterBar } from '../components/common/SearchFilterBar';
import { EmptyState } from '../components/common/EmptyState';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

const INVENTORY_CATEGORIES = [
  'Electronics & Gadgets', 'Home Appliances', 'Furniture', 'Tools & Hardware',
  'Kitchenware', 'Valuables & Jewelry', 'Vehicles & Outdoor', 'Other'
];

const ROOMS = ['Living Room', 'Master Bedroom', 'Kitchen', 'Home Office', 'Garage', 'Balcony / Yard', 'Attic / Storage'];
const CONDITIONS = ['Brand New / Mint', 'Good', 'Fair / Aged', 'Needs Repair'];

export default function HomeInventory() {
  const { user } = useContextEngineStore();
  const activeUid = getActiveUserId(user?.id);

  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  // Modals
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    itemName: '',
    category: 'Electronics & Gadgets',
    room: 'Living Room',
    price: '',
    estimatedValue: '',
    brand: '',
    model: '',
    serialNumber: '',
    condition: 'Good',
    purchaseDate: new Date().toISOString().split('T')[0],
    warrantyExpiry: '',
    receiptUrl: '',
    notes: ''
  });

  // Delete Confirm
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    fetchInventory();
  }, [user]);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const data = await InventoryService.getInventory(activeUid);
      setItems(data);
    } catch (e) {
      console.error('Error fetching inventory:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.itemName.trim()) return;

    try {
      const payload = {
        ...formData,
        price: Number(formData.price) || 0,
        estimatedValue: Number(formData.estimatedValue || formData.price) || 0
      };

      if (editId) {
        await InventoryService.updateInventory(editId, payload);
      } else {
        await InventoryService.addInventory(activeUid, payload);
      }

      setShowModal(false);
      setEditId(null);
      resetForm();
      fetchInventory();
    } catch (e) {
      console.error('Error saving item:', e);
    }
  };

  const resetForm = () => {
    setFormData({
      itemName: '', category: 'Electronics & Gadgets', room: 'Living Room',
      price: '', estimatedValue: '', brand: '', model: '', serialNumber: '', condition: 'Good',
      purchaseDate: new Date().toISOString().split('T')[0], warrantyExpiry: '', receiptUrl: '', notes: ''
    });
  };

  const handleEdit = (item: any) => {
    setFormData({
      itemName: item.itemName || '',
      category: item.category || 'Electronics & Gadgets',
      room: item.room || 'Living Room',
      price: String(item.price || ''),
      estimatedValue: String(item.estimatedValue || item.price || ''),
      brand: item.brand || '',
      model: item.model || '',
      serialNumber: item.serialNumber || '',
      condition: item.condition || 'Good',
      purchaseDate: item.purchaseDate ? new Date(item.purchaseDate).toISOString().split('T')[0] : '',
      warrantyExpiry: item.warrantyExpiry ? new Date(item.warrantyExpiry).toISOString().split('T')[0] : '',
      receiptUrl: item.receiptUrl || '',
      notes: item.notes || ''
    });
    setEditId(item._id);
    setShowModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteId) return;
    try {
      await InventoryService.deleteInventory(deleteId);
      setDeleteId(null);
      fetchInventory();
    } catch (e) {
      console.error('Delete error:', e);
    }
  };

  // Filter Items
  const filteredItems = items.filter(item => {
    const matchesSearch = !searchQuery ||
      item.itemName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.room?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.serialNumber?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'All' || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const totalAssetValue = items.reduce((acc, curr) => acc + (Number(curr.estimatedValue || curr.price) || 0), 0);
  const activeWarranties = items.filter(i => {
    if (!i.warrantyExpiry) return false;
    return new Date(i.warrantyExpiry) >= new Date();
  }).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-wider mb-1 flex items-center gap-3">
            <Package className="text-primary" size={28} /> Home Inventory
          </h1>
          <p className="text-textMuted">Household asset tracking, warranty alerts, serial numbers, and valuation.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => exportToCSV(items, 'Vynora_Home_Inventory')}
            className="px-3.5 py-2 rounded-xl border border-glass bg-surface hover:bg-surfaceLight text-textMain text-sm font-medium flex items-center gap-2"
          >
            <Download size={16} /> Export CSV
          </button>
          <button
            onClick={() => { setEditId(null); resetForm(); setShowModal(true); }}
            className="bg-primary text-background px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-primary/90 font-medium text-sm shadow-neon-primary-sm"
          >
            <Plus size={18} /> Add Asset
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="glass-panel p-5 border-t-4 border-t-primary">
          <span className="text-xs text-textMuted font-medium">Total Assets Value</span>
          <div className="text-2xl font-bold text-textMain mt-1">₹{totalAssetValue.toLocaleString('en-IN')}</div>
          <p className="text-[11px] text-textMuted mt-1">Across all registered assets</p>
        </div>
        <div className="glass-panel p-5 border-t-4 border-t-green-400">
          <span className="text-xs text-textMuted font-medium">Active Warranties</span>
          <div className="text-2xl font-bold text-green-400 mt-1">{activeWarranties} Covered</div>
          <p className="text-[11px] text-textMuted mt-1">Under manufacturer warranty</p>
        </div>
        <div className="glass-panel p-5 border-t-4 border-t-purple-400">
          <span className="text-xs text-textMuted font-medium">Total Items</span>
          <div className="text-2xl font-bold text-purple-400 mt-1">{items.length} Items</div>
          <p className="text-[11px] text-textMuted mt-1">Cataloged in inventory</p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <SearchFilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search asset name, brand, model, or room..."
        selectedCategory={categoryFilter}
        onCategoryChange={setCategoryFilter}
        categories={[{ label: 'All Categories', value: 'All' }, ...INVENTORY_CATEGORIES.map(c => ({ label: c, value: c }))]}
        totalCount={filteredItems.length}
      />

      {/* Items Grid */}
      {loading ? (
        <LoadingSpinner />
      ) : filteredItems.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No household items in inventory"
          description="Log appliances, electronics, furniture, and tools to preserve warranties and track household net worth."
          actionText="Add Household Asset"
          onAction={() => setShowModal(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item: any) => {
            const warranty = item.warrantyExpiry ? calculateDaysRemaining(item.warrantyExpiry) : null;
            return (
              <motion.div
                key={item._id}
                whileHover={{ y: -4 }}
                className="glass-panel p-6 flex flex-col justify-between border-t-4 border-t-primary hover:shadow-neon-primary-sm transition-all"
              >
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-surface border border-glass rounded-xl text-primary">
                        <Package size={22} />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-textMain">{item.itemName}</h3>
                        <p className="text-xs text-textMuted">{item.brand ? `${item.brand} • ` : ''}{item.category}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button onClick={() => handleEdit(item)} className="p-1.5 text-textMuted hover:text-primary">
                        <Edit2 size={15} />
                      </button>
                      <button onClick={() => setDeleteId(item._id)} className="p-1.5 text-textMuted hover:text-red-400">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 py-3 border-y border-glass text-xs divide-y divide-glass">
                    <div className="flex justify-between pt-1.5">
                      <span className="text-textMuted">Room / Location:</span>
                      <span className="font-medium text-textMain">{item.room || 'Living Room'}</span>
                    </div>
                    <div className="flex justify-between pt-1.5">
                      <span className="text-textMuted">Estimated Value:</span>
                      <span className="font-bold text-textMain font-mono">₹{Number(item.estimatedValue || item.price || 0).toLocaleString('en-IN')}</span>
                    </div>
                    {item.serialNumber && (
                      <div className="flex justify-between pt-1.5">
                        <span className="text-textMuted">Serial Number:</span>
                        <span className="font-mono text-textMuted">{item.serialNumber}</span>
                      </div>
                    )}
                    <div className="flex justify-between pt-1.5">
                      <span className="text-textMuted">Condition:</span>
                      <span className="text-textMain">{item.condition || 'Good'}</span>
                    </div>
                  </div>

                  {/* Warranty Badge */}
                  {warranty && (
                    <div className="mt-3 flex items-center justify-between text-xs">
                      <span className="text-textMuted flex items-center gap-1">
                        <Clock size={13} /> Warranty Expiry:
                      </span>
                      <span className={`font-bold font-mono px-2 py-0.5 rounded text-[11px] ${
                        warranty.isOverdue ? 'bg-red-500/20 text-red-400' :
                        warranty.daysRemaining <= 30 ? 'bg-yellow-400/20 text-yellow-300' : 'bg-green-500/20 text-green-400'
                      }`}>
                        {warranty.isOverdue ? 'EXPIRED' : `${warranty.daysRemaining} days left`}
                      </span>
                    </div>
                  )}
                </div>

                {item.receiptUrl && (
                  <div className="pt-3 mt-3 border-t border-glass text-xs">
                    <a href={item.receiptUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline font-medium flex items-center gap-1">
                      <FileText size={13} /> View Invoice / Manual ↗
                    </a>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ITEM MODAL */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-panel max-w-lg w-full p-6 border border-glass shadow-neon-primary-sm max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <h2 className="text-xl font-bold text-textMain mb-4">
                {editId ? 'Edit Household Asset' : 'Catalog New Household Asset'}
              </h2>

              <form onSubmit={handleSaveItem} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-textMuted mb-1">Item / Asset Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.itemName}
                    onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
                    placeholder="e.g. Samsung 55' OLED TV, LG Refrigerator"
                    className="w-full bg-surface border border-glass rounded-xl px-4 py-2 text-sm text-textMain"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-textMuted mb-1">Category</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full bg-surface border border-glass rounded-xl px-3 py-2 text-sm text-textMain"
                    >
                      {INVENTORY_CATEGORIES.map(c => <option key={c} value={c} className="bg-surface">{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-textMuted mb-1">Room / Location</label>
                    <select
                      value={formData.room}
                      onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                      className="w-full bg-surface border border-glass rounded-xl px-3 py-2 text-sm text-textMain"
                    >
                      {ROOMS.map(r => <option key={r} value={r} className="bg-surface">{r}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-textMuted mb-1">Purchase Price (₹)</label>
                    <input
                      type="number"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      placeholder="0.00"
                      className="w-full bg-surface border border-glass rounded-xl px-3 py-2 text-sm text-textMain font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-textMuted mb-1">Current Estimated Value (₹)</label>
                    <input
                      type="number"
                      value={formData.estimatedValue}
                      onChange={(e) => setFormData({ ...formData, estimatedValue: e.target.value })}
                      placeholder="0.00"
                      className="w-full bg-surface border border-glass rounded-xl px-3 py-2 text-sm text-textMain font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-textMuted mb-1">Brand / Maker</label>
                    <input
                      type="text"
                      value={formData.brand}
                      onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                      placeholder="e.g. Sony"
                      className="w-full bg-surface border border-glass rounded-xl px-3 py-2 text-sm text-textMain"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-textMuted mb-1">Model #</label>
                    <input
                      type="text"
                      value={formData.model}
                      onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                      placeholder="Model"
                      className="w-full bg-surface border border-glass rounded-xl px-3 py-2 text-sm text-textMain"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-textMuted mb-1">Condition</label>
                    <select
                      value={formData.condition}
                      onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                      className="w-full bg-surface border border-glass rounded-xl px-2 py-2 text-xs text-textMain"
                    >
                      {CONDITIONS.map(c => <option key={c} value={c} className="bg-surface">{c}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-textMuted mb-1">Serial Number</label>
                    <input
                      type="text"
                      value={formData.serialNumber}
                      onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                      placeholder="SN / IMEI"
                      className="w-full bg-surface border border-glass rounded-xl px-3 py-2 text-sm font-mono text-textMain"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-textMuted mb-1">Warranty Expiry Date</label>
                    <input
                      type="date"
                      value={formData.warrantyExpiry}
                      onChange={(e) => setFormData({ ...formData, warrantyExpiry: e.target.value })}
                      className="w-full bg-surface border border-glass rounded-xl px-3 py-2 text-sm text-textMain"
                    />
                  </div>
                </div>

                <FileUpload
                  label="Attach Purchase Invoice / Operation Manual"
                  currentUrl={formData.receiptUrl}
                  onUploadSuccess={(url) => setFormData({ ...formData, receiptUrl: url })}
                  onRemove={() => setFormData({ ...formData, receiptUrl: '' })}
                />

                <div className="flex justify-end gap-3 pt-3 border-t border-glass">
                  <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 rounded-xl border border-glass text-textMuted text-sm">Cancel</button>
                  <button type="submit" className="bg-primary text-background px-5 py-2 rounded-xl font-medium text-sm hover:bg-primary/90 shadow-neon-primary-sm">
                    {editId ? 'Update Asset' : 'Save Asset'}
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
        title="Delete Asset"
        message="Are you sure you want to permanently delete this asset from home inventory?"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
