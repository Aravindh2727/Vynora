import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, FileText, Search, Plus, Trash2, ShieldCheck, Download, 
  Folder, Edit2, ExternalLink, Calendar, AlertCircle, Eye, Tag,
  Clock, Shield, Landmark, BookOpen, HeartPulse, Sprout, Car, Lock
} from 'lucide-react';
import { useContextEngineStore } from '../store/useContextEngineStore';
import { DocumentService, getActiveUserId } from '../services/firestoreService';
import { formatIsoDate } from '../utils/dateUtils';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { FileUpload } from '../components/common/FileUpload';
import { EmptyState } from '../components/common/EmptyState';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { exportToCSV } from '../utils/csvExport';
import { MobilePageHeader } from '../components/common/MobilePageHeader';

const LOCKER_CATEGORIES = [
  { id: 'Identity', name: 'Identity & ID Cards', icon: Shield, color: 'text-primary' },
  { id: 'Vehicle', name: 'Vehicle & Driving Docs', icon: Car, color: 'text-blue-400' },
  { id: 'Insurance', name: 'Insurance Policies', icon: ShieldCheck, color: 'text-emerald-400' },
  { id: 'Property', name: 'Property & Land Deeds', icon: Landmark, color: 'text-purple-400' },
  { id: 'Education', name: 'Education & Degrees', icon: BookOpen, color: 'text-yellow-400' },
  { id: 'Financial', name: 'Financial & Tax Records', icon: Landmark, color: 'text-amber-400' },
  { id: 'Medical', name: 'Medical & Prescriptions', icon: HeartPulse, color: 'text-red-400' },
  { id: 'Agriculture', name: 'Agri & Soil Records', icon: Sprout, color: 'text-green-400' },
  { id: 'Other', name: 'Personal & Other', icon: Folder, color: 'text-gray-400' }
];

export default function DigitalLocker() {
  const { user } = useContextEngineStore();
  const activeUid = getActiveUserId(user?.id);

  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Tabs
  const [activeTab, setActiveTab] = useState<'all' | 'expiring' | 'categories'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showModal, setShowModal] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<any | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string; title: string }>({
    isOpen: false,
    id: '',
    title: ''
  });

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    category: 'Identity',
    docNumber: '',
    issueDate: '',
    expiryDate: '',
    tags: '',
    description: '',
    fileUrl: ''
  });

  useEffect(() => {
    fetchDocs();
  }, [user]);

  const fetchDocs = async () => {
    setLoading(true);
    try {
      const docs = await DocumentService.getDocuments(activeUid);
      setDocuments(docs);
    } catch (e) {
      console.error('Error fetching documents from Firestore:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fileUrl) {
      alert('Please upload a document before saving.');
      return;
    }

    try {
      const payload = {
        ...formData,
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim().toLowerCase()) : []
      };

      if (editId) {
        await DocumentService.updateDocument(editId, payload);
      } else {
        await DocumentService.addDocument(activeUid, payload);
      }
      setShowModal(false);
      setEditId(null);
      resetForm();
      fetchDocs();
    } catch (e) {
      console.error('Error saving document:', e);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      category: 'Identity',
      docNumber: '',
      issueDate: '',
      expiryDate: '',
      tags: '',
      description: '',
      fileUrl: ''
    });
  };

  const handleEdit = (doc: any) => {
    if (!doc) return;
    setFormData({
      title: doc.title || '',
      category: doc.category || 'Identity',
      docNumber: doc.docNumber || '',
      issueDate: formatIsoDate(doc.issueDate),
      expiryDate: formatIsoDate(doc.expiryDate),
      tags: Array.isArray(doc.tags) ? doc.tags.join(', ') : '',
      description: doc.description || '',
      fileUrl: doc.fileUrl || ''
    });
    setEditId(doc._id || doc.id);
    setShowModal(true);
  };

  const confirmDeleteAction = async () => {
    try {
      await DocumentService.deleteDocument(deleteModal.id);
      setDeleteModal({ isOpen: false, id: '', title: '' });
      fetchDocs();
    } catch (e) {
      console.error('Error deleting document:', e);
    }
  };

  // Expiry Calculations
  const now = new Date();
  const getExpiryStatus = (expiryDate?: string) => {
    if (!expiryDate) return null;
    const exp = new Date(expiryDate);
    const diffDays = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return { label: 'Expired', color: 'text-red-400 bg-red-500/20 border-red-500/30' };
    if (diffDays <= 30) return { label: `Expires in ${diffDays}d`, color: 'text-amber-400 bg-amber-500/20 border-amber-500/30' };
    return { label: `Valid (${diffDays}d)`, color: 'text-green-400 bg-green-500/20 border-green-500/30' };
  };

  const expiringDocs = documents.filter(doc => {
    if (!doc.expiryDate) return false;
    const exp = new Date(doc.expiryDate);
    const diffDays = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 45; // Expiring soon or expired
  });

  const filteredDocuments = documents.filter(doc => {
    if (activeTab === 'expiring') {
      if (!doc.expiryDate) return false;
      const diffDays = Math.ceil((new Date(doc.expiryDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays > 45) return false;
    }

    if (selectedCategory !== 'ALL' && doc.category !== selectedCategory) {
      return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = (doc.title || '').toLowerCase().includes(q);
      const matchCat = (doc.category || '').toLowerCase().includes(q);
      const matchDocNo = (doc.docNumber || '').toLowerCase().includes(q);
      const matchTags = Array.isArray(doc.tags) && doc.tags.some((t: string) => t.includes(q));
      if (!matchTitle && !matchCat && !matchDocNo && !matchTags) return false;
    }

    return true;
  });

  const handleExportCSV = () => {
    const data = filteredDocuments.map(d => ({
      Title: d.title,
      Category: d.category,
      'Document Number': d.docNumber || '',
      'Issue Date': d.issueDate || '',
      'Expiry Date': d.expiryDate || '',
      Tags: Array.isArray(d.tags) ? d.tags.join(', ') : '',
      'File Link': d.fileUrl || ''
    }));
    exportToCSV(data, 'vynora_digital_locker_index.csv');
  };

  if (loading) {
    return <LoadingSpinner message="Decrypting and loading your Digital Locker vault..." />;
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Mobile Page Header with single-level back to Dashboard */}
      <MobilePageHeader
        title="Digital Locker"
        parentLabel="Dashboard"
        fallbackPath="/"
        icon={<Lock className="text-primary" size={24} />}
        subtitle="Encrypted cloud storage for Aadhaar, property deeds, vehicle RC, policies & certificates."
        actions={
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={handleExportCSV}
              className="bg-surface border border-glass px-3 py-2 rounded-xl text-textMuted hover:text-textMain flex items-center gap-1.5 text-xs transition-colors min-h-[44px]"
            >
              <Download size={14} /> <span className="hidden sm:inline">Export</span>
            </button>
            <button
              type="button"
              onClick={() => { resetForm(); setEditId(null); setShowModal(true); }}
              className="bg-primary text-background px-3.5 py-2 rounded-xl flex items-center gap-1.5 hover:bg-primary/90 transition-colors shadow-neon-primary-sm font-bold text-xs min-h-[44px] active:scale-95"
            >
              <Upload size={16} /> Upload Doc
            </button>
          </div>
        }
      />

      {/* KPI Cards (Responsive grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="glass-panel p-4 border-l-4 border-l-primary flex flex-col justify-between">
          <p className="text-[10px] sm:text-xs text-textMuted uppercase font-semibold">Total Documents</p>
          <div className="mt-1 flex items-baseline justify-between">
            <h2 className="text-xl sm:text-2xl font-bold text-textMain">{documents.length} Files</h2>
            <Folder className="text-primary/70" size={20} />
          </div>
        </div>

        <div className="glass-panel p-4 border-l-4 border-l-amber-400 flex flex-col justify-between">
          <p className="text-[10px] sm:text-xs text-textMuted uppercase font-semibold">Renewal Alerts (≤ 45d)</p>
          <div className="mt-1 flex items-baseline justify-between">
            <h2 className={`text-xl sm:text-2xl font-bold ${expiringDocs.length > 0 ? 'text-amber-400' : 'text-textMain'}`}>
              {expiringDocs.length}
            </h2>
            <AlertCircle className="text-amber-400/70" size={20} />
          </div>
        </div>

        <div className="glass-panel p-4 border-l-4 border-l-green-500 flex flex-col justify-between">
          <p className="text-[10px] sm:text-xs text-textMuted uppercase font-semibold">Categories In Use</p>
          <div className="mt-1 flex items-baseline justify-between">
            <h2 className="text-xl sm:text-2xl font-bold text-green-400">
              {new Set(documents.map(d => d.category)).size} Folders
            </h2>
            <ShieldCheck className="text-green-500/70" size={20} />
          </div>
        </div>
      </div>

      {/* Subsections & Tabs */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex border-b border-glass gap-2 overflow-x-auto pb-1 w-full md:w-auto scrollbar-none">
          {[
            { key: 'all', label: `All Documents (${documents.length})` },
            { key: 'expiring', label: `Renewals & Expiring (${expiringDocs.length})` }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-4 py-2 rounded-t-xl text-xs font-semibold whitespace-nowrap transition-all border-b-2 ${
                activeTab === tab.key
                  ? 'border-primary text-primary bg-primary/10 shadow-neon-primary-sm'
                  : 'border-transparent text-textMuted hover:text-textMain hover:bg-surface/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-60">
            <Search className="absolute left-3 top-2.5 text-textMuted" size={14} />
            <input
              type="text"
              placeholder="Search by title, category, tags..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-surface border border-glass rounded-xl pl-8 pr-3 py-1.5 text-xs text-textMain focus:outline-none focus:border-primary"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="bg-surface border border-glass rounded-xl px-3 py-1.5 text-xs text-textMain focus:outline-none"
          >
            <option value="ALL">All Categories</option>
            {LOCKER_CATEGORIES.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Documents Grid */}
      {filteredDocuments.length === 0 ? (
        <EmptyState
          icon={Folder}
          title="No documents found"
          description={
            activeTab === 'expiring'
              ? "All your document renewals, vehicle certificates, and insurance policies are up to date."
              : "Store your passports, aadhaar cards, degrees, property deeds, and medical certificates securely."
          }
          actionText={activeTab === 'all' ? "Upload First Document" : undefined}
          onAction={activeTab === 'all' ? () => { resetForm(); setShowModal(true); } : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDocuments.map((doc: any) => {
            const catMeta = LOCKER_CATEGORIES.find(c => c.id === doc.category) || LOCKER_CATEGORIES[8];
            const CatIcon = catMeta.icon;
            const expiry = getExpiryStatus(doc.expiryDate);

            return (
              <motion.div
                key={doc._id || doc.id}
                whileHover={{ y: -4 }}
                className="glass-panel p-5 relative overflow-hidden flex flex-col justify-between border-t-4 border-t-primary"
              >
                <div>
                  {/* Top Row */}
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 bg-surface border border-glass rounded-xl ${catMeta.color}`}>
                        <CatIcon size={22} />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-textMain leading-tight">{doc.title}</h3>
                        <p className="text-xs text-textMuted">{catMeta.name}</p>
                      </div>
                    </div>

                    <div className="flex gap-1">
                      <button
                        onClick={() => handleEdit(doc)}
                        className="p-1 rounded-lg text-textMuted hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                        title="Edit Metadata"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => setDeleteModal({
                          isOpen: true,
                          id: doc._id || doc.id,
                          title: doc.title
                        })}
                        className="p-1 rounded-lg text-textMuted hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Delete Document"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Metadata fields */}
                  <div className="bg-surface/50 p-3 rounded-xl border border-glass space-y-2 text-xs mb-4">
                    {doc.docNumber && (
                      <div className="flex justify-between text-textMuted">
                        <span>Doc / Ref #:</span>
                        <span className="font-mono text-textMain font-semibold">{doc.docNumber}</span>
                      </div>
                    )}
                    {doc.issueDate && (
                      <div className="flex justify-between text-textMuted">
                        <span>Issue Date:</span>
                        <span className="text-textMain">{new Date(doc.issueDate).toLocaleDateString()}</span>
                      </div>
                    )}
                    {doc.expiryDate && (
                      <div className="flex justify-between items-center text-textMuted">
                        <span>Expiry Date:</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-textMain">{new Date(doc.expiryDate).toLocaleDateString()}</span>
                          {expiry && (
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${expiry.color}`}>
                              {expiry.label}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                    {doc.description && (
                      <p className="text-textMuted italic pt-1 border-t border-glass">"{doc.description}"</p>
                    )}
                  </div>

                  {/* Tags */}
                  {Array.isArray(doc.tags) && doc.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {doc.tags.map((t: string, idx: number) => (
                        <span key={idx} className="bg-surface border border-glass px-2 py-0.5 rounded-md text-[10px] text-textMuted flex items-center gap-1">
                          <Tag size={10} /> {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Bottom Actions: Preview and Download */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-glass">
                  <button
                    onClick={() => setPreviewDoc(doc)}
                    className="py-2 px-3 bg-surface border border-glass rounded-xl hover:bg-surfaceLight text-xs font-semibold flex items-center justify-center gap-1.5 text-textMain transition-colors"
                  >
                    <Eye size={14} className="text-primary" /> Preview
                  </button>
                  <a
                    href={doc.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    download
                    className="py-2 px-3 bg-primary/20 text-primary border border-primary/30 rounded-xl hover:bg-primary/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Download size={14} /> Open File
                  </a>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Upload / Edit Document Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="glass-panel p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <h2 className="text-xl font-bold mb-4 text-textMain">
                {editId ? 'Edit Document Metadata' : 'Upload Document to Vault'}
              </h2>
              <form onSubmit={handleSaveDoc} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-textMuted mb-1 block">Document Title *</label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. Passport / Degree Certificate"
                      value={formData.title}
                      onChange={e => setFormData({ ...formData, title: e.target.value })}
                      className="w-full bg-background border border-glass rounded-lg px-3 py-2 text-sm text-textMain focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-textMuted mb-1 block">Category *</label>
                    <select
                      value={formData.category}
                      onChange={e => setFormData({ ...formData, category: e.target.value })}
                      className="w-full bg-background border border-glass rounded-lg px-3 py-2 text-sm text-textMain focus:outline-none"
                    >
                      {LOCKER_CATEGORIES.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-textMuted mb-1 block">Document / Reference #</label>
                    <input
                      type="text"
                      placeholder="e.g. A12345678"
                      value={formData.docNumber}
                      onChange={e => setFormData({ ...formData, docNumber: e.target.value })}
                      className="w-full bg-background border border-glass rounded-lg px-3 py-2 text-sm text-textMain focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-textMuted mb-1 block">Tags (comma-separated)</label>
                    <input
                      type="text"
                      placeholder="e.g. travel, id, urgent"
                      value={formData.tags}
                      onChange={e => setFormData({ ...formData, tags: e.target.value })}
                      className="w-full bg-background border border-glass rounded-lg px-3 py-2 text-sm text-textMain focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-textMuted mb-1 block">Issue Date</label>
                    <input
                      type="date"
                      value={formData.issueDate}
                      onChange={e => setFormData({ ...formData, issueDate: e.target.value })}
                      className="w-full bg-background border border-glass rounded-lg px-3 py-2 text-sm text-textMain focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-textMuted mb-1 block">Expiry / Renewal Date</label>
                    <input
                      type="date"
                      value={formData.expiryDate}
                      onChange={e => setFormData({ ...formData, expiryDate: e.target.value })}
                      className="w-full bg-background border border-glass rounded-lg px-3 py-2 text-sm text-textMain focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-textMuted mb-1 block">Description / Notes</label>
                  <textarea
                    rows={2}
                    placeholder="Brief notes about this document..."
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    className="w-full bg-background border border-glass rounded-lg px-3 py-2 text-sm text-textMain focus:outline-none"
                  />
                </div>

                {/* Cloudinary Document Upload */}
                <FileUpload
                  label="Upload File (PDF, PNG, JPG, WebP) *"
                  currentUrl={formData.fileUrl}
                  onUploadSuccess={(url: string) => setFormData({ ...formData, fileUrl: url })}
                  onRemove={() => setFormData({ ...formData, fileUrl: '' })}
                />

                <div className="flex justify-end gap-3 mt-6 pt-3 border-t border-glass">
                  <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-textMuted hover:text-textMain">Cancel</button>
                  <button type="submit" className="px-5 py-2 bg-primary text-background rounded-lg font-bold text-sm shadow-neon-primary-sm hover:opacity-95">
                    {editId ? 'Update Document' : 'Save to Vault'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Document Preview Modal */}
      <AnimatePresence>
        {previewDoc && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={() => setPreviewDoc(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="glass-panel p-6 w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-lg font-bold text-textMain">{previewDoc.title}</h3>
                  <p className="text-xs text-textMuted">{previewDoc.category} • {previewDoc.docNumber || 'No reference'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={previewDoc.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    download
                    className="px-3 py-1.5 bg-primary text-background rounded-lg text-xs font-bold flex items-center gap-1 shadow-neon-primary-sm"
                  >
                    <Download size={14} /> Download
                  </a>
                  <button
                    onClick={() => setPreviewDoc(null)}
                    className="px-3 py-1.5 bg-surface border border-glass rounded-lg text-xs text-textMuted hover:text-textMain"
                  >
                    Close
                  </button>
                </div>
              </div>

              <div className="flex-1 min-h-[400px] bg-background/50 rounded-xl border border-glass overflow-hidden flex items-center justify-center p-2">
                {previewDoc.fileUrl.endsWith('.pdf') ? (
                  <iframe src={previewDoc.fileUrl} title={previewDoc.title} className="w-full h-full min-h-[450px] rounded-lg" />
                ) : (
                  <img src={previewDoc.fileUrl} alt={previewDoc.title} className="max-h-[500px] object-contain rounded-lg" />
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title="Delete Document"
        message={`Are you sure you want to permanently delete "${deleteModal.title}" from your Digital Locker?`}
        confirmText="Delete Document"
        isDestructive={true}
        onConfirm={confirmDeleteAction}
        onCancel={() => setDeleteModal({ isOpen: false, id: '', title: '' })}
      />
    </div>
  );
}
