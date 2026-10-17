import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, KeyRound, Copy, Eye, EyeOff, ShieldAlert, Edit2, Trash2,
  Lock, Unlock, RefreshCw, ExternalLink, Check, AlertCircle, ShieldCheck,
  RotateCcw, Shield
} from 'lucide-react';
import { useContextEngineStore } from '../store/useContextEngineStore';
import { PasswordService, UserService, getActiveUserId } from '../services/firestoreService';
import {
  deriveVaultKey,
  encryptVaultItem,
  decryptVaultItem,
  createVaultVerificationToken,
  verifyVaultKey,
  testDecryptRecord,
  hashVaultPassword,
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

  // Vault Configuration & Lock State
  const [isVaultConfigured, setIsVaultConfigured] = useState<boolean | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [masterPasswordInput, setMasterPasswordInput] = useState('');
  const [showUnlockPassword, setShowUnlockPassword] = useState(false);
  const [vaultKey, setVaultKey] = useState<CryptoKey | null>(null);
  const [keyError, setKeyError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // First-time Setup State
  const [setupPassword, setSetupPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showSetupPassword, setShowSetupPassword] = useState(false);

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

  // Delete & Reset Confirmations
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showResetModal, setShowResetModal] = useState(false);

  // Check if vault is already configured for this user
  useEffect(() => {
    let isMounted = true;

    async function checkVaultConfiguration() {
      if (!activeUid) return;
      try {
        // 1. Check user profile in Firestore
        const profile = await UserService.getUserProfile(activeUid);
        if (profile?.vaultVerificationToken || profile?.vaultPasswordHash) {
          if (isMounted) setIsVaultConfigured(true);
          return;
        }

        // 2. Check local fallback
        const localMeta = localStorage.getItem(`vynora_vault_meta_${activeUid}`);
        if (localMeta) {
          try {
            const parsed = JSON.parse(localMeta);
            if (parsed.token || parsed.hash) {
              if (isMounted) setIsVaultConfigured(true);
              return;
            }
          } catch {}
        }

        // 3. Check if user already has saved password records
        const existing = await PasswordService.getPasswords(activeUid);
        if (existing && existing.length > 0) {
          if (isMounted) setIsVaultConfigured(true);
          return;
        }

        if (isMounted) setIsVaultConfigured(false);
      } catch (err) {
        console.warn('Error checking vault configuration status:', err);
        if (isMounted) setIsVaultConfigured(false);
      }
    }

    checkVaultConfiguration();

    return () => {
      isMounted = false;
    };
  }, [activeUid]);

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

  // Handle Initial Master Password Setup
  const handleSetupMasterPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setKeyError(null);

    if (setupPassword.length < 6) {
      setKeyError('Master password must be at least 6 characters long.');
      return;
    }
    if (setupPassword !== confirmPassword) {
      setKeyError('Passwords do not match. Please re-enter.');
      return;
    }

    setIsVerifying(true);
    try {
      const salt = `vynora_salt_${activeUid}`;
      const key = await deriveVaultKey(setupPassword, salt);
      const verificationToken = await createVaultVerificationToken(key);
      const passwordHash = await hashVaultPassword(setupPassword, salt);

      // Persist to user profile and localStorage
      await UserService.saveUserProfile(activeUid, {
        vaultConfigured: true,
        vaultVerificationToken: verificationToken,
        vaultPasswordHash: passwordHash
      });

      localStorage.setItem(`vynora_vault_meta_${activeUid}`, JSON.stringify({
        token: verificationToken,
        hash: passwordHash
      }));

      setVaultKey(key);
      setIsUnlocked(true);
      setIsVaultConfigured(true);
      setSetupPassword('');
      setConfirmPassword('');
      fetchEncryptedRecords(key);
      resetAutoLock();
    } catch (err: any) {
      setKeyError(err.message || 'Failed to initialize master password');
    } finally {
      setIsVerifying(false);
    }
  };

  // Handle Unlocking with Verification Check
  const handleUnlockVault = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!masterPasswordInput) return;
    setKeyError(null);
    setIsVerifying(true);

    try {
      const salt = `vynora_salt_${activeUid}`;
      const key = await deriveVaultKey(masterPasswordInput, salt);

      // Retrieve verification credentials
      let profile = await UserService.getUserProfile(activeUid);
      let token = profile?.vaultVerificationToken;
      let hash = profile?.vaultPasswordHash;

      if (!token || !hash) {
        const localMeta = localStorage.getItem(`vynora_vault_meta_${activeUid}`);
        if (localMeta) {
          try {
            const parsed = JSON.parse(localMeta);
            token = token || parsed.token;
            hash = hash || parsed.hash;
          } catch {}
        }
      }

      let isPasswordValid = false;

      if (token) {
        // Direct cryptographic verification of the token
        isPasswordValid = await verifyVaultKey(token, key);
      } else if (hash) {
        const testHash = await hashVaultPassword(masterPasswordInput, salt);
        isPasswordValid = testHash === hash;
      } else {
        // Backwards compatibility for existing records:
        const existing = await PasswordService.getPasswords(activeUid);
        if (existing.length === 0) {
          isPasswordValid = true;
        } else {
          const testRecord = existing.find(p => p.password && p.password.length > 20);
          if (testRecord) {
            isPasswordValid = await testDecryptRecord(testRecord.password, key);
          } else {
            isPasswordValid = true;
          }
        }
      }

      // STRICT CHECK: Reject incorrect password entry!
      if (!isPasswordValid) {
        setKeyError('Incorrect master password. Access denied.');
        setIsVerifying(false);
        return;
      }

      // If token wasn't cached yet, persist it for future fast unlocks
      if (!token) {
        const newToken = await createVaultVerificationToken(key);
        const newHash = await hashVaultPassword(masterPasswordInput, salt);
        UserService.saveUserProfile(activeUid, {
          vaultConfigured: true,
          vaultVerificationToken: newToken,
          vaultPasswordHash: newHash
        }).catch(console.error);
        localStorage.setItem(`vynora_vault_meta_${activeUid}`, JSON.stringify({
          token: newToken,
          hash: newHash
        }));
      }

      setVaultKey(key);
      setIsUnlocked(true);
      setMasterPasswordInput('');
      fetchEncryptedRecords(key);
      resetAutoLock();
    } catch (err: any) {
      setKeyError(err.message || 'Key derivation failed');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleLockVault = () => {
    setIsUnlocked(false);
    setVaultKey(null);
    setDecryptedPasswords({});
    setRevealed({});
    setKeyError(null);
    setMasterPasswordInput('');
    if (autoLockTimer.current) clearTimeout(autoLockTimer.current);
  };

  // Secure Vault Reset if forgotten
  const handleResetVault = async () => {
    try {
      setLoading(true);
      const existing = await PasswordService.getPasswords(activeUid);
      for (const p of existing) {
        const id = p._id || p.id;
        if (id) await PasswordService.deletePassword(id);
      }

      await UserService.saveUserProfile(activeUid, {
        vaultConfigured: false,
        vaultVerificationToken: null,
        vaultPasswordHash: null
      });
      localStorage.removeItem(`vynora_vault_meta_${activeUid}`);

      setIsUnlocked(false);
      setVaultKey(null);
      setIsVaultConfigured(false);
      setShowResetModal(false);
      setKeyError(null);
      setPasswords([]);
      setDecryptedPasswords({});
    } catch (err) {
      console.error('Vault reset error:', err);
    } finally {
      setLoading(false);
    }
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

      fetchEncryptedRecords(vaultKey);
      setShowModal(false);
      setEditId(null);
      setFormData({ platform: '', username: '', password: '', url: '', category: 'Personal', notes: '' });
      resetAutoLock();
    } catch (e) {
      console.error('Save error:', e);
    }
  };

  const handleEdit = (p: any) => {
    const itemId = p._id || p.id;
    setEditId(itemId);
    setFormData({
      platform: p.platform || '',
      username: p.username || '',
      password: decryptedPasswords[itemId] || '',
      url: p.url || '',
      category: p.category || 'Personal',
      notes: p.notes || ''
    });
    setShowModal(true);
    resetAutoLock();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await PasswordService.deletePassword(deleteId);
      setDeleteId(null);
      if (vaultKey) fetchEncryptedRecords(vaultKey);
      resetAutoLock();
    } catch (e) {
      console.error('Delete error:', e);
    }
  };

  const toggleReveal = (id: string) => {
    setRevealed((prev) => ({ ...prev, [id]: !prev[id] }));
    resetAutoLock();
  };

  const handleCopy = async (id: string, text: string) => {
    await copyToClipboardSecure(text, 30);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    resetAutoLock();
  };

  const handleGeneratePassword = () => {
    const newPwd = generateSecurePassword({ length: 18, includeSymbols: true, includeNumbers: true });
    setFormData((prev) => ({ ...prev, password: newPwd }));
  };

  // Filter passwords
  const filteredPasswords = passwords.filter((p) => {
    const matchesSearch =
      (p.platform && p.platform.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.username && p.username.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.url && p.url.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCat = selectedCategory === 'All' || p.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="space-y-6">
      <MobilePageHeader
        title="Password Vault"
        parentLabel="Dashboard"
        fallbackPath="/"
        subtitle="Zero-Knowledge Client-Side AES-GCM (256-bit) Encrypted Storage"
        badges={[
          {
            label: isUnlocked ? 'Vault Unlocked' : isVaultConfigured === false ? 'Setup Required' : 'Locked',
            variant: isUnlocked ? 'success' : isVaultConfigured === false ? 'info' : 'warning'
          },
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
                onClick={() => {
                  setEditId(null);
                  setFormData({ platform: '', username: '', password: '', url: '', category: 'Personal', notes: '' });
                  setShowModal(true);
                }}
                className="min-h-[44px] bg-primary text-background px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-primary/90 font-bold text-sm shadow-neon-primary-sm touch-target"
              >
                <Plus size={18} /> <span>New</span>
              </button>
            </div>
          ) : undefined
        }
      />

      {/* STATE 0: Checking Vault Status */}
      {isVaultConfigured === null ? (
        <div className="py-16">
          <LoadingSpinner message="Checking vault security status..." />
        </div>
      ) : !isUnlocked ? (
        /* STATE 1: First-time Master Password Setup */
        isVaultConfigured === false ? (
          <div className="glass-panel max-w-md mx-auto p-8 border border-glass my-8 text-center space-y-6">
            <div className="p-4 rounded-2xl bg-surface border border-glass w-fit mx-auto text-primary shadow-glass">
              <ShieldCheck size={38} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-textMain mb-2">Set Up Master Password</h2>
              <p className="text-xs text-textMuted leading-relaxed">
                Your Master Password is used to derive an AES-GCM 256-bit encryption key on this device.
                It is never stored on any server. If you lose it, your passwords cannot be recovered.
              </p>
            </div>

            <form onSubmit={handleSetupMasterPassword} className="space-y-4 text-left">
              <div>
                <label className="text-xs font-semibold text-textMuted mb-1 block">New Master Password</label>
                <div className="relative">
                  <input
                    type={showSetupPassword ? 'text' : 'password'}
                    required
                    autoFocus
                    value={setupPassword}
                    onChange={(e) => setSetupPassword(e.target.value)}
                    placeholder="Enter at least 6 characters"
                    className="w-full bg-background/60 border border-glass rounded-xl px-4 py-2.5 pr-10 text-sm text-textMain focus:outline-none focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSetupPassword(!showSetupPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-textMuted hover:text-textMain"
                  >
                    {showSetupPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-textMuted mb-1 block">Confirm Master Password</label>
                <input
                  type={showSetupPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your master password"
                  className="w-full bg-background/60 border border-glass rounded-xl px-4 py-2.5 text-sm text-textMain focus:outline-none focus:border-primary"
                />
              </div>

              {keyError && (
                <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 p-2.5 rounded-lg border border-red-500/20">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{keyError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isVerifying}
                className="w-full py-2.5 bg-primary text-background font-semibold rounded-xl hover:bg-primary/90 transition-colors shadow-neon-primary-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isVerifying ? (
                  <span>Deriving 256-bit Key...</span>
                ) : (
                  <>
                    <Shield size={18} /> Initialize & Protect Vault
                  </>
                )}
              </button>
            </form>
          </div>
        ) : (
          /* STATE 2: Vault is Locked (Challenge with Strict Verification) */
          <div className="glass-panel max-w-md mx-auto p-8 border border-glass my-8 text-center space-y-6">
            <div className="p-4 rounded-2xl bg-surface border border-glass w-fit mx-auto text-primary shadow-glass">
              <Lock size={36} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-textMain mb-2">Vault is Locked</h2>
              <p className="text-xs text-textMuted leading-relaxed">
                Enter your Master Vault Password to unlock and decrypt your credentials.
                The key is verified client-side using authenticated AES-GCM tags.
              </p>
            </div>

            <form onSubmit={handleUnlockVault} className="space-y-4">
              <div className="relative">
                <input
                  type={showUnlockPassword ? 'text' : 'password'}
                  required
                  autoFocus
                  value={masterPasswordInput}
                  onChange={(e) => setMasterPasswordInput(e.target.value)}
                  placeholder="Enter Master Vault Password"
                  className="w-full bg-background/60 border border-glass rounded-xl px-4 py-2.5 pr-10 text-sm text-textMain text-center focus:outline-none focus:border-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowUnlockPassword(!showUnlockPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-textMuted hover:text-textMain"
                  tabIndex={-1}
                >
                  {showUnlockPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {keyError && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-center gap-2 text-xs text-red-400 bg-red-500/10 p-2.5 rounded-lg border border-red-500/30"
                >
                  <AlertCircle size={15} className="shrink-0" />
                  <span className="font-medium">{keyError}</span>
                </motion.div>
              )}

              <button
                type="submit"
                disabled={isVerifying}
                className="w-full py-2.5 bg-primary text-background font-semibold rounded-xl hover:bg-primary/90 transition-colors shadow-neon-primary-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isVerifying ? (
                  <span>Verifying Master Password...</span>
                ) : (
                  <>
                    <Unlock size={18} /> Unlock Password Vault
                  </>
                )}
              </button>
            </form>

            <div className="pt-2 border-t border-glass">
              <button
                type="button"
                onClick={() => setShowResetModal(true)}
                className="text-xs text-textMuted hover:text-red-400 transition-colors underline"
              >
                Forgot Master Password?
              </button>
            </div>
          </div>
        )
      ) : (
        /* STATE 3: Unlocked View with Credentials */
        <div className="space-y-6">
          <div className="bg-primary/10 border border-primary/20 rounded-xl p-3.5 flex items-center justify-between text-xs text-primary">
            <span className="flex items-center gap-2 font-medium">
              <ShieldCheck size={16} /> Vault is unlocked in memory. Clipboard copies auto-clear after 30 seconds.
            </span>
            <span className="text-[11px] text-textMuted font-mono">Auto-locks after 5 min inactivity</span>
          </div>

          <SearchFilterBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Search platforms, usernames, or URLs..."
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            categories={VAULT_CATEGORIES.map((c) => ({ label: c, value: c }))}
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

                      <div className="space-y-3 bg-surface/50 p-3.5 rounded-xl border border-glass mb-4">
                        {p.username && (
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-textMuted">Username:</span>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-textMain font-medium">{p.username}</span>
                              <button
                                onClick={() => handleCopy(`user_${itemId}`, p.username)}
                                className="text-textMuted hover:text-primary"
                                title="Copy Username"
                              >
                                {copiedId === `user_${itemId}` ? (
                                  <Check size={13} className="text-emerald-400" />
                                ) : (
                                  <Copy size={13} />
                                )}
                              </button>
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-between text-xs">
                          <span className="text-textMuted">Password:</span>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-textMain font-bold">
                              {isRevealed ? plainPassword : '••••••••••••'}
                            </span>
                            <button
                              onClick={() => toggleReveal(itemId)}
                              className="text-textMuted hover:text-primary"
                              title={isRevealed ? 'Hide Password' : 'Show Password'}
                            >
                              {isRevealed ? <EyeOff size={13} /> : <Eye size={13} />}
                            </button>
                            <button
                              onClick={() => handleCopy(`pwd_${itemId}`, plainPassword)}
                              className="text-textMuted hover:text-primary"
                              title="Copy Password"
                            >
                              {copiedId === `pwd_${itemId}` ? (
                                <Check size={13} className="text-emerald-400" />
                              ) : (
                                <Copy size={13} />
                              )}
                            </button>
                          </div>
                        </div>

                        {p.url && (
                          <div className="flex items-center justify-between text-xs pt-1 border-t border-glass">
                            <span className="text-textMuted">Website:</span>
                            <a
                              href={p.url.startsWith('http') ? p.url : `https://${p.url}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-primary hover:underline flex items-center gap-1 font-mono text-[11px] truncate max-w-[150px]"
                            >
                              {p.url.replace(/^https?:\/\//, '')} <ExternalLink size={11} />
                            </a>
                          </div>
                        )}
                      </div>

                      {p.notes && (
                        <p className="text-xs text-textMuted line-clamp-2 italic px-1">
                          "{p.notes}"
                        </p>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL: Add / Edit Credential */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="glass-panel w-full max-w-lg p-6 border border-glass space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center border-b border-glass pb-3">
              <h2 className="text-lg font-bold text-textMain">
                {editId ? 'Edit Credential' : 'Add New Credential'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-textMuted hover:text-textMain text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-textMuted block mb-1">Platform / Service Name *</label>
                <input
                  type="text"
                  required
                  value={formData.platform}
                  onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                  placeholder="e.g. Google, GitHub, Chase Bank"
                  className="w-full bg-background/60 border border-glass rounded-xl px-4 py-2 text-sm text-textMain focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-textMuted block mb-1">Username / Email</label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="user@example.com"
                    className="w-full bg-background/60 border border-glass rounded-xl px-4 py-2 text-sm text-textMain focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-textMuted block mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-background/60 border border-glass rounded-xl px-4 py-2 text-sm text-textMain focus:outline-none focus:border-primary"
                  >
                    {VAULT_CATEGORIES.filter((c) => c !== 'All').map((c) => (
                      <option key={c} value={c} className="bg-surface text-textMain">
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-semibold text-textMuted">Password *</label>
                  <button
                    type="button"
                    onClick={handleGeneratePassword}
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    <RefreshCw size={12} /> Generate Secure
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Enter or generate password"
                  className="w-full font-mono bg-background/60 border border-glass rounded-xl px-4 py-2 text-sm text-textMain focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-textMuted block mb-1">Website URL</label>
                <input
                  type="text"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  placeholder="https://..."
                  className="w-full bg-background/60 border border-glass rounded-xl px-4 py-2 text-sm text-textMain focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-textMuted block mb-1">Notes / Security Answers</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Optional notes or security reminders..."
                  className="w-full bg-background/60 border border-glass rounded-xl px-4 py-2 text-sm text-textMain focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-glass">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl border border-glass text-textMuted hover:bg-surface text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-primary text-background font-semibold rounded-xl hover:bg-primary/90 text-sm shadow-neon-primary-sm"
                >
                  {editId ? 'Save Changes' : 'Encrypt & Store'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* CONFIRM: Delete Credential */}
      <ConfirmModal
        isOpen={Boolean(deleteId)}
        title="Delete Credential"
        message="Are you sure you want to delete this encrypted credential from your vault? This cannot be undone."
        confirmText="Delete"
        confirmVariant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />

      {/* CONFIRM: Reset Vault if Forgotten */}
      <ConfirmModal
        isOpen={showResetModal}
        title="Reset Password Vault"
        message="Because Vynora uses zero-knowledge client-side encryption, lost master passwords cannot be recovered by anyone. Resetting the vault will clear your master password and any existing credentials so you can start fresh. Are you sure you want to proceed?"
        confirmText="Reset Vault"
        confirmVariant="danger"
        onConfirm={handleResetVault}
        onCancel={() => setShowResetModal(false)}
      />
    </div>
  );
}
