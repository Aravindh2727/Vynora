import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, KeyRound, Copy, Eye, EyeOff, ShieldAlert, Edit2, Trash2,
  Lock, Unlock, RefreshCw, ExternalLink, Check, AlertCircle, ShieldCheck
} from 'lucide-react';
import { useContextEngineStore } from '../store/useContextEngineStore';
import { PasswordService, getActiveUserId } from '../services/firestoreService';
import {
  deriveVaultKey,
  encryptVaultItem,
  decryptVaultItem,
  generateSecurePassword,
  copyToClipboardSecure
} from '../utils/vaultCrypto';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { SearchFilterBar } from '../components/common/SearchFilterBar';
import { EmptyState } from '../components/common/EmptyState';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

import { MobilePageHeader } from '../components/common/MobilePageHeader';

const VAULT_CATEGORIES = ['All', 'Personal', 'Financial', 'Work', 'Social Media', 'Shopping', 'Other'];

export default function PasswordVault() {
  const { user } = useContextEngineStore();
  const activeUid = getActiveUserId(user?.id);

  // Vault Lock / Key State
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [masterPasswordInput, setMasterPasswordInput] = useState('');
  const [vaultKey, setVaultKey] = useState<CryptoKey | null>(null);
  const [keyError, setKeyError] = useState<string | null>(null);

  // Auto-lock timer (5 minutes inactivity)
  const autoLockTimer = useRef<any>(null);

  // Records
  const [passwords, setPasswords] = useState<any[]>([]);
  const [decryptedPasswords, setDecryptedPasswords] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    platform: '',
    username: '',
    password: '',
    url: '',
    category: 'Personal',
    notes: ''
  });

  // Delete Confirm
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const resetAutoLock = () => {
    if (autoLockTimer.current) clearTimeout(autoLockTimer.current);
    if (isUnlocked) {
      autoLockTimer.current = setTimeout(() => {
        handleLockVault();
      }, 5 * 60 * 1000); // 5 mins
    }
  };

  useEffect(() => {
    const handleActivity = () => resetAutoLock();
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      if (autoLockTimer.current) clearTimeout(autoLockTimer.current);
    };
  }, [isUnlocked]);

  const handleUnlockVault = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!masterPasswordInput) return;
    setKeyError(null);

    try {
      // Derive 256-bit AES-GCM key with PBKDF2 using activeUid as salt
      const key = await deriveVaultKey(masterPasswordInput, `vynora_salt_${activeUid}`);
      setVaultKey(key);
      setIsUnlocked(true);
      setMasterPasswordInput('');
      fetchEncryptedRecords(key);
      resetAutoLock();
    } catch (err: any) {
      setKeyError(err.message || 'Key derivation failed');
    }
  };

  const handleLockVault = () => {
    setIsUnlocked(false);
    setVaultKey(null);
    setDecryptedPasswords({});
    setRevealed({});
    if (autoLockTimer.current) clearTimeout(autoLockTimer.current);
  };

  const fetchEncryptedRecords = async (key: CryptoKey) => {
    setLoading(true);
    try {
      const data = await PasswordService.getPasswords(activeUid);
      setPasswords(data);

      // Decrypt passwords client-side in memory
      const decMap: Record<string, string> = {};
      for (const item of data) {
        if (item.password) {
          const itemId = item._id || item.id;
          decMap[itemId] = await decryptVaultItem(item.password, key);
        }
      }
      setDecryptedPasswords(decMap);
    } catch (e) {
      console.error('Error fetching vault items:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.platform.trim() || !formData.password || !vaultKey) return;

    try {
      // Encrypt password using AES-GCM 256-bit before saving to Firestore
      const encryptedPassword = await encryptVaultItem(formData.password, vaultKey);

      const payload = {
        platform: formData.platform,
        username: formData.username,
        password: encryptedPassword,
        url: formData.url,
        category: formData.category,
        notes: formData.notes
      };

      if (editId) {
        await PasswordService.updatePassword(editId, payload);
      } else {
        await PasswordService.addPassword(activeUid, payload);
      }

      setShowModal(false);
      setEditId(null);
      setFormData({ platform: '', username: '', password: '', url: '', category: 'Personal', notes: '' });
      fetchEncryptedRecords(vaultKey);
    } catch (e) {
      console.error('Error saving encrypted credential:', e);
    }
  };

  const handleEdit = (p: any) => {
    const itemId = p._id || p.id;
    setFormData({
      platform: p.platform || '',
      username: p.username || '',
      password: decryptedPasswords[itemId] || '',
      url: p.url || '',
      category: p.category || 'Personal',
      notes: p.notes || ''
    });
    setEditId(itemId);
    setShowModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteId) return;
    try {
      await PasswordService.deletePassword(deleteId);
      setDeleteId(null);
      if (vaultKey) fetchEncryptedRecords(vaultKey);
    } catch (e) {
      console.error('Error deleting credential:', e);
    }
  };

  const handleCopyPassword = async (id: string, text: string) => {
    await copyToClipboardSecure(text, 30);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleGeneratePassword = () => {
    const pwd = generateSecurePassword({ length: 18, includeNumbers: true, includeSymbols: true });
    setFormData(prev => ({ ...prev, password: pwd }));
  };

  const toggleReveal = (id: string) => {
    setRevealed(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Filter items
  const filteredPasswords = passwords.filter((p: any) => {
    const matchesSearch = !searchQuery ||
      p.platform?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.url?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      <MobilePageHeader
        title="Password Vault"
        parentLabel="Dashboard"
        fallbackPath="/"
        subtitle="Client-Side AES-GCM (256-bit) Encrypted Storage with PBKDF2 Key Derivation"
        badges={[
          { label: isUnlocked ? 'Vault Unlocked' : 'Locked', variant: isUnlocked ? 'success' : 'warning' },
          ...(isUnlocked ? [{ label: `${filteredPasswords.length} items`, variant: 'info' as const }] : [])
        ]}
        actions={
          isUnlocked ? (
            <div className="flex items-center gap-2">
              <button
                onClick={handleLockVault}
                className="min-h-[44px] px-3.5 py-2 rounded-xl border border-glass bg-surface hover:bg-surfaceLight text-textMain text-sm font-medium flex items-center gap-2 touch-target"
              >
                <Lock size={16} /> <span className="hidden sm:inline">Lock Vault</span>
              </button>
              <button
                onClick={() => { setEditId(null); setFormData({ platform: '', username: '', password: '', url: '', category: 'Personal', notes: '' }); setShowModal(true); }}
                className="min-h-[44px] bg-primary text-background px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-primary/90 font-bold text-sm shadow-neon-primary-sm touch-target"
              >
                <Plus size={18} /> <span>New</span>
              </button>
            </div>
          ) : undefined
        }
      />

      {/* LOCKED VIEW: Master Password Challenge */}
      {!isUnlocked ? (
        <div className="glass-panel max-w-md mx-auto p-8 border border-glass my-12 text-center space-y-6">
          <div className="p-4 rounded-2xl bg-surface border border-glass w-fit mx-auto text-primary shadow-glass">
            <Lock size={36} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-textMain mb-2">Vault is Locked</h2>
            <p className="text-xs text-textMuted leading-relaxed">
              Enter your Master Vault Password to derive the AES-GCM encryption key.
              Your master key is never sent to Firestore or stored on any server.
            </p>
          </div>

          <form onSubmit={handleUnlockVault} className="space-y-4">
            <div>
              <input
                type="password"
                required
                autoFocus
                value={masterPasswordInput}
                onChange={(e) => setMasterPasswordInput(e.target.value)}
                placeholder="Enter Master Vault Password"
                className="w-full bg-background/60 border border-glass rounded-xl px-4 py-2.5 text-sm text-textMain text-center focus:outline-none focus:border-primary"
              />
            </div>

            {keyError && (
              <div className="flex items-center justify-center gap-2 text-xs text-red-400 bg-red-500/10 p-2 rounded-lg">
                <AlertCircle size={14} />
                <span>{keyError}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-2.5 bg-primary text-background font-semibold rounded-xl hover:bg-primary/90 transition-colors shadow-neon-primary-sm flex items-center justify-center gap-2"
            >
              <Unlock size={18} /> Unlock Password Vault
            </button>
          </form>

          <p className="text-[11px] text-textMuted">
            First time using the vault? Enter any strong master password to establish your encrypted tenant space.
          </p>
        </div>
      ) : (
        /* UNLOCKED VIEW: Credential Registry */
        <div className="space-y-6">
          {/* Active Security Notice Banner */}
          <div className="bg-primary/10 border border-primary/20 rounded-xl p-3.5 flex items-center justify-between text-xs text-primary">
            <span className="flex items-center gap-2 font-medium">
              <ShieldCheck size={16} /> Vault is unlocked in memory. Clipboard copies auto-clear after 30 seconds.
            </span>
            <span className="text-[11px] text-textMuted font-mono">Auto-locks after 5 min inactivity</span>
          </div>

          {/* Search & Filter Bar */}
          <SearchFilterBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Search platforms, usernames, or URLs..."
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            categories={VAULT_CATEGORIES.map(c => ({ label: c, value: c }))}
            totalCount={filteredPasswords.length}
          />

          {loading ? (
            <LoadingSpinner message="Decrypting vault credentials with AES-GCM..." />
          ) : filteredPasswords.length === 0 ? (
            <EmptyState
              icon={KeyRound}
              title="No credentials stored"
              description="Store passwords for your bank accounts, email, websites, and cloud tools with end-to-end encryption."
              actionText="Add First Credential"
              onAction={() => setShowModal(true)}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPasswords.map((p: any) => {
                const itemId = p._id || p.id;
                const plainPassword = decryptedPasswords[itemId] || '';
                const isRevealed = Boolean(revealed[itemId]);

                return (
                  <motion.div
                    key={itemId}
                    whileHover={{ y: -4 }}
                    className="glass-panel p-6 flex flex-col justify-between border-l-4 border-l-red-400 hover:shadow-neon-primary-sm transition-all"
                  >
                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <div className="p-3 bg-surface border border-glass rounded-xl text-red-400">
                            <KeyRound size={22} />
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-textMain">{p.platform}</h3>
                            <span className="text-xs text-textMuted">{p.category || 'Personal'}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleEdit(p)}
                            className="p-1.5 text-textMuted hover:text-primary transition-colors"
                            title="Edit"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            onClick={() => setDeleteId(itemId)}
                            className="p-1.5 text-textMuted hover:text-red-400 transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>

                      {/* Username */}
                      <div className="bg-surface/50 p-3 rounded-lg border border-glass mb-2">
                        <p className="text-[11px] text-textMuted mb-0.5">Username / Email</p>
                        <p className="text-sm text-textMain font-mono truncate">{p.username}</p>
                      </div>

                      {/* Password with Reveal & Copy */}
                      <div className="bg-surface/50 p-3 rounded-lg border border-glass mb-3 flex items-center justify-between">
                        <div className="overflow-hidden mr-2">
                          <p className="text-[11px] text-textMuted mb-0.5">Password</p>
                          <p className="text-sm font-mono tracking-wider text-textMain truncate">
                            {isRevealed ? plainPassword : '••••••••••••'}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => toggleReveal(itemId)}
                            className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-surface text-textMuted hover:text-textMain transition-colors touch-target"
                            title={isRevealed ? 'Hide' : 'Reveal'}
                            aria-label={isRevealed ? 'Hide password' : 'Reveal password'}
                          >
                            {isRevealed ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                          <button
                            onClick={() => handleCopyPassword(itemId, plainPassword)}
                            className={`w-10 h-10 flex items-center justify-center rounded-lg transition-colors touch-target ${
                              copiedId === itemId ? 'text-green-400 bg-green-500/20' : 'text-textMuted hover:text-primary hover:bg-surface'
                            }`}
                            title="Copy to clipboard (30s auto-clear)"
                            aria-label="Copy password to clipboard"
                          >
                            {copiedId === itemId ? <Check size={18} /> : <Copy size={18} />}
                          </button>
                        </div>
                      </div>

                      {/* Website Link */}
                      {p.url && (
                        <div className="flex items-center justify-between text-xs text-textMuted pt-2 border-t border-glass">
                          <span className="truncate max-w-[200px]">{p.url}</span>
                          <a
                            href={p.url.startsWith('http') ? p.url : `https://${p.url}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary hover:underline flex items-center gap-1"
                          >
                            Open <ExternalLink size={12} />
                          </a>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* CREDENTIAL MODAL */}
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
              <h2 className="text-xl font-bold text-textMain mb-4">
                {editId ? 'Edit Credential' : 'Add New Credential'}
              </h2>

              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-textMuted mb-1">Platform / Service Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.platform}
                    onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                    placeholder="e.g. Google, GitHub, HDFC NetBanking"
                    className="w-full bg-surface border border-glass rounded-xl px-4 py-2 text-sm text-textMain focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-textMuted mb-1">Category</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full bg-surface border border-glass rounded-xl px-3 py-2 text-sm text-textMain"
                    >
                      {VAULT_CATEGORIES.filter(c => c !== 'All').map(c => <option key={c} value={c} className="bg-surface">{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-textMuted mb-1">Login URL</label>
                    <input
                      type="text"
                      value={formData.url}
                      onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                      placeholder="e.g. https://github.com"
                      className="w-full bg-surface border border-glass rounded-xl px-3 py-2 text-sm text-textMain"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-textMuted mb-1">Username / Email *</label>
                  <input
                    type="text"
                    required
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="e.g. user@example.com"
                    className="w-full bg-surface border border-glass rounded-xl px-4 py-2 text-sm font-mono text-textMain focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-medium text-textMuted">Password *</label>
                    <button
                      type="button"
                      onClick={handleGeneratePassword}
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      <RefreshCw size={12} /> Generate Strong
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Password"
                    className="w-full bg-surface border border-glass rounded-xl px-4 py-2 text-sm font-mono text-textMain focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-textMuted mb-1">Notes (Optional)</label>
                  <textarea
                    rows={2}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Security questions, PINs, or recovery codes..."
                    className="w-full bg-surface border border-glass rounded-xl px-4 py-2 text-sm text-textMain focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-glass">
                  <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 rounded-xl border border-glass text-textMuted text-sm">Cancel</button>
                  <button type="submit" className="bg-primary text-background px-5 py-2 rounded-xl font-medium text-sm hover:bg-primary/90 shadow-neon-primary-sm">
                    {editId ? 'Update & Encrypt' : 'Encrypt & Save'}
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
        title="Delete Credential"
        message="Are you sure you want to permanently delete this credential from your vault? This cannot be recovered."
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
