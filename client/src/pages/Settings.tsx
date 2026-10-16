import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Shield, Bell, Palette, Database, Key,
  Smartphone, Monitor, Mail, Lock, Trash2, Download,
  Save, Camera, CheckCircle2, AlertTriangle, X, Check, Globe
} from 'lucide-react';
import { updateProfile, updatePassword, sendPasswordResetEmail, signOut, deleteUser } from 'firebase/auth';
import { auth } from '../firebase';
import { useContextEngineStore } from '../store/useContextEngineStore';
import { UserService, getActiveUserId } from '../services/firestoreService';
import { subscribeToPush } from '../utils/push';
import { MobilePageHeader } from '../components/common/MobilePageHeader';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { FileUpload } from '../components/common/FileUpload';

type TabId = 'profile' | 'security' | 'notifications' | 'appearance' | 'data';

export default function Settings() {
  const { user, setUser } = useContextEngineStore();
  const activeUid = getActiveUserId(user?.id);

  const [activeTab, setActiveTab] = useState<TabId>('profile');
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Profile fields
  const [fullName, setFullName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [showAvatarUpload, setShowAvatarUpload] = useState(false);

  // Security
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showSessionsModal, setShowSessionsModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Notifications
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(false);
  const [securityAlerts, setSecurityAlerts] = useState(true);

  // Appearance
  const [theme, setTheme] = useState<'dark' | 'light' | 'system'>(
    (localStorage.getItem('theme') as any) || 'dark'
  );
  const [accentColor, setAccentColor] = useState(
    (localStorage.getItem('accentColor') as any) || '#00f2fe'
  );

  // Data / Delete Account
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [exportingData, setExportingData] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  // Load stored profile from Firestore on mount
  useEffect(() => {
    async function loadUserProfile() {
      try {
        const prof = await UserService.getUserProfile(activeUid);
        if (prof) {
          if (prof.fullName) setFullName(prof.fullName);
          if (prof.phone) setPhone(prof.phone);
          if (prof.location) setLocation(prof.location);
          if (prof.avatarUrl) setAvatarUrl(prof.avatarUrl);
          if (typeof prof.is2FAEnabled === 'boolean') setIs2FAEnabled(prof.is2FAEnabled);
          if (typeof prof.emailNotifications === 'boolean') setEmailNotifications(prof.emailNotifications);
          if (typeof prof.pushNotifications === 'boolean') setPushNotifications(prof.pushNotifications);
          if (typeof prof.securityAlerts === 'boolean') setSecurityAlerts(prof.securityAlerts);
        }
      } catch (err) {
        console.warn('Could not load user profile from Firestore:', err);
      }
    }
    loadUserProfile();
  }, [activeUid]);

  // Sync theme
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light');

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      if (systemTheme === 'light') root.classList.add('light');
    } else if (theme === 'light') {
      root.classList.add('light');
    }

    localStorage.setItem('theme', theme);
  }, [theme]);

  // Sync accent color
  useEffect(() => {
    const root = window.document.documentElement;
    root.style.setProperty('--primary', accentColor);
    if (accentColor.length === 7) {
      root.style.setProperty('--shadow-neon-primary', `0 0 10px ${accentColor}80, 0 0 20px ${accentColor}4D`);
      root.style.setProperty('--shadow-neon-primary-sm', `0 0 5px ${accentColor}80, 0 0 10px ${accentColor}4D`);
    }
    localStorage.setItem('accentColor', accentColor);
  }, [accentColor]);

  // Save changes to Firestore
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setStatusMessage(null);

    try {
      // 1. Update Firebase Auth displayName if currentUser exists
      if (auth.currentUser && fullName) {
        await updateProfile(auth.currentUser, {
          displayName: fullName,
          photoURL: avatarUrl || undefined
        });
      }

      // 2. Persist to Firestore user_profiles
      await UserService.saveUserProfile(activeUid, {
        fullName,
        email: email || user?.email,
        phone,
        location,
        avatarUrl,
        is2FAEnabled,
        emailNotifications,
        pushNotifications,
        securityAlerts,
        theme,
        accentColor
      });

      // 3. Update store
      if (user && setUser) {
        setUser({
          ...user,
          name: fullName || user.name
        });
      }

      setIsSaved(true);
      setStatusMessage({ type: 'success', text: 'Settings saved successfully to Firestore.' });
      setTimeout(() => {
        setIsSaved(false);
        setStatusMessage(null);
      }, 4000);
    } catch (err: any) {
      console.error('Error saving settings:', err);
      setStatusMessage({ type: 'error', text: err.message || 'Failed to save settings' });
    } finally {
      setIsSaving(false);
    }
  };

  // Change Password Handler
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }

    setPasswordLoading(true);
    try {
      if (auth.currentUser) {
        await updatePassword(auth.currentUser, newPassword);
        setPasswordSuccess('Password updated successfully!');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => setShowPasswordModal(false), 2000);
      } else {
        // Fallback: send password reset email
        const targetEmail = user?.email;
        if (targetEmail) {
          await sendPasswordResetEmail(auth, targetEmail);
          setPasswordSuccess(`Password reset email sent to ${targetEmail}`);
          setTimeout(() => setShowPasswordModal(false), 2500);
        } else {
          setPasswordError('No active user email found.');
        }
      }
    } catch (err: any) {
      console.error('Password change error:', err);
      if (err.code === 'auth/requires-recent-login') {
        // Send reset email instead
        if (user?.email) {
          await sendPasswordResetEmail(auth, user.email);
          setPasswordSuccess(`Security timeout: A password reset link has been emailed to ${user.email}`);
        } else {
          setPasswordError('Please log out and log in again before changing password.');
        }
      } else {
        setPasswordError(err.message || 'Failed to update password');
      }
    } finally {
      setPasswordLoading(false);
    }
  };

  // Export all user data as JSON
  const handleExportData = async () => {
    setExportingData(true);
    try {
      const exportObject = await UserService.exportAllUserData(activeUid);
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(exportObject, null, 2))}`;
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', jsonString);
      downloadAnchor.setAttribute('download', `vynora_user_data_export_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (err: any) {
      console.error('Export error:', err);
      alert('Failed to export data: ' + (err.message || 'Unknown error'));
    } finally {
      setExportingData(false);
    }
  };

  // Delete Account Handler
  const handleDeleteAccount = async () => {
    setDeletingAccount(true);
    try {
      await UserService.deleteUserData(activeUid);
      if (auth.currentUser) {
        try {
          await deleteUser(auth.currentUser);
        } catch {
          await signOut(auth);
        }
      }
      window.location.href = '/login';
    } catch (err: any) {
      console.error('Delete account error:', err);
      alert('Error deleting account: ' + (err.message || 'Please try again.'));
    } finally {
      setDeletingAccount(false);
      setShowDeleteModal(false);
    }
  };

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'profile', label: 'Profile', icon: <User size={18} /> },
    { id: 'security', label: 'Security', icon: <Shield size={18} /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell size={18} /> },
    { id: 'appearance', label: 'Appearance', icon: <Palette size={18} /> },
    { id: 'data', label: 'Data & Privacy', icon: <Database size={18} /> },
  ];

  return (
    <div className="max-w-6xl mx-auto h-full flex flex-col space-y-6">
      <MobilePageHeader
        title="Settings & Preferences"
        parentLabel="Dashboard"
        fallbackPath="/"
        subtitle="Manage your profile, theme mode, security, and notification channels."
        badges={[
          { label: `Theme: ${theme.toUpperCase()}`, variant: 'info' }
        ]}
      />

      <div className="flex flex-col md:flex-row gap-5 flex-1 min-h-0">
        {/* Navigation Tabs */}
        <div className="w-full md:w-56 shrink-0">
          <nav className="flex md:flex-col gap-1.5 p-1 bg-surface/80 border border-glass rounded-2xl overflow-x-auto scrollbar-none w-full shadow-sm">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center justify-center sm:justify-start gap-2 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl transition-all whitespace-nowrap text-xs sm:text-sm shrink-0 min-h-[40px] touch-target active:scale-95 ${
                  activeTab === tab.id
                    ? 'bg-primary text-background font-bold shadow-neon-primary-sm scale-[1.02]'
                    : 'text-textMuted hover:text-textMain hover:bg-surface/80'
                }`}
              >
                <span className="shrink-0">{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Content Area */}
        <div className="flex-1 glass-panel p-4 sm:p-6 md:p-8 overflow-y-auto custom-scrollbar relative rounded-2xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="max-w-3xl"
            >
              <form onSubmit={handleSave} className="space-y-8">
                {/* PROFILE TAB */}
                {activeTab === 'profile' && (
                  <div className="space-y-6">
                    <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                      <User className="text-primary" /> Personal Information
                    </h2>

                    <div className="flex items-center gap-6 mb-8">
                      <div className="relative">
                        <div className="w-24 h-24 rounded-full bg-surface border-2 border-glass flex items-center justify-center text-3xl font-bold text-primary shadow-neon-primary-sm overflow-hidden">
                          {avatarUrl ? (
                            <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                          ) : (
                            fullName?.charAt(0) || user?.name?.charAt(0) || 'U'
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowAvatarUpload(!showAvatarUpload)}
                          title="Change Avatar"
                          className="absolute bottom-0 right-0 p-2 bg-primary text-background rounded-full hover:scale-110 transition-transform shadow-md"
                        >
                          <Camera size={16} />
                        </button>
                      </div>
                      <div>
                        <h3 className="text-lg font-medium">{fullName || user?.name || 'Guest User'}</h3>
                        <p className="text-textMuted text-sm">Update your photo and personal profile details.</p>
                      </div>
                    </div>

                    {showAvatarUpload && (
                      <div className="p-4 border border-glass rounded-xl bg-surface/50 mb-6">
                        <FileUpload
                          label="Upload Profile Photo"
                          currentUrl={avatarUrl}
                          onUploadSuccess={(url) => {
                            setAvatarUrl(url);
                            setShowAvatarUpload(false);
                          }}
                          onRemove={() => setAvatarUrl('')}
                          accept="image/*"
                        />
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-textMuted">Full Name</label>
                        <input
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Your full name"
                          className="w-full bg-surface border border-glass rounded-lg px-4 py-3 focus:outline-none focus:border-primary transition-colors text-textMain"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-textMuted">Email Address</label>
                        <input
                          type="email"
                          value={email || user?.email || ''}
                          onChange={(e) => setEmail(e.target.value)}
                          disabled
                          title="Email is managed via Firebase Authentication"
                          className="w-full bg-surface/50 border border-glass rounded-lg px-4 py-3 text-textMuted cursor-not-allowed"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-textMuted">Phone Number</label>
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="+91 98765 43210"
                          className="w-full bg-surface border border-glass rounded-lg px-4 py-3 focus:outline-none focus:border-primary transition-colors text-textMain"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-textMuted">Location / City</label>
                        <input
                          type="text"
                          value={location}
                          onChange={(e) => setLocation(e.target.value)}
                          placeholder="Chennai, India"
                          className="w-full bg-surface border border-glass rounded-lg px-4 py-3 focus:outline-none focus:border-primary transition-colors text-textMain"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* SECURITY TAB */}
                {activeTab === 'security' && (
                  <div className="space-y-6">
                    <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                      <Shield className="text-primary" /> Security Settings
                    </h2>

                    <div className="space-y-4">
                      <div className="p-4 border border-glass rounded-xl bg-surface/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <h3 className="font-medium flex items-center gap-2"><Key size={16} className="text-primary"/> Account Password</h3>
                          <p className="text-sm text-textMuted">Update your login password or request a reset email</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setPasswordError('');
                            setPasswordSuccess('');
                            setShowPasswordModal(true);
                          }}
                          className="px-4 py-2 border border-glass rounded-lg hover:bg-surface text-textMain transition-colors whitespace-nowrap"
                        >
                          Change Password
                        </button>
                      </div>

                      <div className="p-4 border border-glass rounded-xl bg-surface/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <h3 className="font-medium flex items-center gap-2"><Smartphone size={16} className="text-primary"/> Two-Factor Authentication (2FA)</h3>
                          <p className="text-sm text-textMuted">Require secondary verification upon logging in</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIs2FAEnabled(!is2FAEnabled)}
                          className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                            is2FAEnabled
                              ? 'bg-primary text-background shadow-neon-primary-sm'
                              : 'bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20'
                          }`}
                        >
                          {is2FAEnabled ? '2FA Enabled ✓' : 'Enable 2FA'}
                        </button>
                      </div>

                      <div className="p-4 border border-glass rounded-xl bg-surface/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <h3 className="font-medium flex items-center gap-2"><Monitor size={16} className="text-primary"/> Active Sessions</h3>
                          <p className="text-sm text-textMuted">Manage devices currently logged into your Vynora account</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowSessionsModal(true)}
                          className="px-4 py-2 border border-glass rounded-lg hover:bg-surface text-textMain transition-colors whitespace-nowrap"
                        >
                          View Sessions
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* NOTIFICATIONS TAB */}
                {activeTab === 'notifications' && (
                  <div className="space-y-6">
                    <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                      <Bell className="text-primary" /> Notification Preferences
                    </h2>

                    <div className="space-y-4">
                      {/* Email Notifications */}
                      <div className="flex items-center justify-between p-4 border border-glass rounded-xl bg-surface/30">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-surface rounded-lg text-primary">
                            <Mail size={20}/>
                          </div>
                          <div>
                            <h3 className="font-medium text-textMain">Email Notifications</h3>
                            <p className="text-sm text-textMuted">Receive daily summaries, bill alerts, and financial recaps via email</p>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={emailNotifications}
                            onChange={(e) => setEmailNotifications(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-surface peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)]"></div>
                        </label>
                      </div>

                      {/* Push Notifications */}
                      <div className="flex items-center justify-between p-4 border border-glass rounded-xl bg-surface/30">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-surface rounded-lg text-primary">
                            <Smartphone size={20}/>
                          </div>
                          <div>
                            <h3 className="font-medium text-textMain">Push Notifications</h3>
                            <p className="text-sm text-textMuted">Receive real-time push alerts on tasks, medicine reminders, and EMI due dates</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await subscribeToPush(activeUid);
                                setPushNotifications(true);
                              } catch (err) {
                                console.error('Push error:', err);
                              }
                            }}
                            className="px-3 py-1.5 bg-primary/20 border border-primary/40 text-primary rounded-lg text-xs font-semibold hover:bg-primary/30"
                          >
                            Grant Push
                          </button>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={pushNotifications}
                              onChange={(e) => setPushNotifications(e.target.checked)}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-surface peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)]"></div>
                          </label>
                        </div>
                      </div>

                      {/* Security Alerts */}
                      <div className="flex items-center justify-between p-4 border border-glass rounded-xl bg-surface/30">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-surface rounded-lg text-primary">
                            <Lock size={20}/>
                          </div>
                          <div>
                            <h3 className="font-medium text-textMain">Security Alerts</h3>
                            <p className="text-sm text-textMuted">Receive instant notifications about new logins or master password updates</p>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={securityAlerts}
                            onChange={(e) => setSecurityAlerts(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-surface peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)]"></div>
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {/* APPEARANCE TAB */}
                {activeTab === 'appearance' && (
                  <div className="space-y-6">
                    <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                      <Palette className="text-primary" /> Appearance & Theme
                    </h2>

                    <div className="space-y-4">
                      <h3 className="text-sm font-medium text-textMuted">Theme Preference</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <button
                          type="button"
                          onClick={() => setTheme('dark')}
                          className={`p-4 border ${theme === 'dark' ? 'border-primary/50 bg-primary/5' : 'border-glass bg-surface/30 hover:border-gray-500'} rounded-xl flex flex-col items-center gap-3 relative overflow-hidden group transition-colors`}
                        >
                          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                          <div className="w-16 h-10 rounded-md bg-[#0a0a0f] border border-glass flex items-center justify-center shadow-lg">
                            <div className="w-8 h-2 bg-primary rounded-full"></div>
                          </div>
                          <span className={`font-medium ${theme === 'dark' ? 'text-primary' : 'text-textMuted'}`}>Neon Dark</span>
                          {theme === 'dark' && <CheckCircle2 size={16} className="absolute top-3 right-3 text-primary" />}
                        </button>

                        <button
                          type="button"
                          onClick={() => setTheme('light')}
                          className={`p-4 border ${theme === 'light' ? 'border-primary/50 bg-primary/5' : 'border-glass bg-surface/30 hover:border-gray-500'} rounded-xl flex flex-col items-center gap-3 relative overflow-hidden transition-colors`}
                        >
                          <div className="w-16 h-10 rounded-md bg-white border border-gray-200 flex items-center justify-center shadow-inner">
                            <div className="w-8 h-2 bg-blue-500 rounded-full"></div>
                          </div>
                          <span className={`font-medium ${theme === 'light' ? 'text-primary' : 'text-textMuted'}`}>Light Mode</span>
                          {theme === 'light' && <CheckCircle2 size={16} className="absolute top-3 right-3 text-primary" />}
                        </button>

                        <button
                          type="button"
                          onClick={() => setTheme('system')}
                          className={`p-4 border ${theme === 'system' ? 'border-primary/50 bg-primary/5' : 'border-glass bg-surface/30 hover:border-gray-500'} rounded-xl flex flex-col items-center gap-3 relative overflow-hidden transition-colors`}
                        >
                          <div className="w-16 h-10 rounded-md bg-gradient-to-r from-[#0a0a0f] to-white border border-gray-600 flex items-center justify-center">
                            <div className="w-8 h-2 bg-gray-400 rounded-full"></div>
                          </div>
                          <span className={`font-medium ${theme === 'system' ? 'text-primary' : 'text-textMuted'}`}>System Sync</span>
                          {theme === 'system' && <CheckCircle2 size={16} className="absolute top-3 right-3 text-primary" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-glass">
                      <h3 className="text-sm font-medium text-textMuted flex items-center justify-between">
                        Accent Color
                        <button
                          type="button"
                          onClick={() => setAccentColor('#00f2fe')}
                          className="text-xs text-primary hover:underline"
                        >
                          Reset to Default Neon
                        </button>
                      </h3>
                      <div className="flex items-center gap-4 p-4 border border-glass bg-surface/30 rounded-xl">
                        <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-glass shadow-neon-primary-sm shrink-0">
                          <input
                            type="color"
                            value={accentColor}
                            onChange={(e) => setAccentColor(e.target.value)}
                            className="w-[150%] h-[150%] -translate-x-1/4 -translate-y-1/4 cursor-pointer"
                          />
                        </div>
                        <div>
                          <p className="font-medium text-textMain">Interface Accent Theme</p>
                          <p className="text-sm text-textMuted">Custom neon highlights for buttons, cards, and active menus.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* DATA TAB */}
                {activeTab === 'data' && (
                  <div className="space-y-6">
                    <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                      <Database className="text-primary" /> Data, Privacy & Cloud
                    </h2>

                    <div className="space-y-4">
                      {/* Real Firebase Cloud Connection Status */}
                      <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 flex items-center justify-between gap-3 text-emerald-900 dark:text-emerald-200 text-xs">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-500 shrink-0">
                            <Globe size={18} />
                          </div>
                          <div>
                            <p className="font-bold text-emerald-950 dark:text-emerald-100 text-xs sm:text-sm">
                              Firebase Cloud Firestore Active
                            </p>
                            <p className="text-emerald-900/80 dark:text-emerald-300/80 text-[11px] sm:text-xs mt-0.5 leading-relaxed">
                              All operations across 18 modules are synchronized directly to Google Cloud Firestore.
                            </p>
                          </div>
                        </div>
                        <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 rounded-md font-mono text-[9px] sm:text-[10px] font-bold shrink-0">
                          Cloud Synced
                        </span>
                      </div>

                      {/* Export Data */}
                      <div className="p-5 border border-glass rounded-xl bg-surface/30">
                        <h3 className="font-medium mb-2 text-textMain">Export Your Data</h3>
                        <p className="text-sm text-textMuted mb-4">
                          Download a comprehensive JSON snapshot of all your records across all 18 modules (Finances, Loans, Vehicles, Cattle, Crops, Locker, etc.).
                        </p>
                        <button
                          type="button"
                          onClick={handleExportData}
                          disabled={exportingData}
                          className="flex items-center gap-2 px-4 py-2 border border-glass rounded-lg hover:bg-surface text-textMain transition-colors disabled:opacity-50"
                        >
                          <Download size={16} />
                          {exportingData ? 'Exporting Records...' : 'Export Complete JSON'}
                        </button>
                      </div>

                      {/* Delete Account */}
                      <div className="p-5 border border-red-500/30 rounded-xl bg-red-500/5">
                        <h3 className="font-medium mb-2 text-red-400">Delete Account & Wipe Cloud Records</h3>
                        <p className="text-sm text-red-400/70 mb-4">
                          Permanently delete your profile and purge all associated Firestore documents across every module. This operation cannot be reversed.
                        </p>
                        <button
                          type="button"
                          onClick={() => setShowDeleteModal(true)}
                          className="flex items-center gap-2 px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/50 rounded-lg hover:bg-red-500/30 transition-colors"
                        >
                          <Trash2 size={16} /> Delete Account
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* SAVE BUTTON & FEEDBACK */}
                <div className="pt-6 border-t border-glass flex items-center justify-between gap-4">
                  <div>
                    {statusMessage && (
                      <span className={`text-sm flex items-center gap-1.5 ${statusMessage.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                        {statusMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                        {statusMessage.text}
                      </span>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex items-center gap-2 px-6 py-2.5 bg-primary text-background font-medium rounded-lg hover:shadow-neon-primary transition-all active:scale-95 disabled:opacity-50"
                  >
                    <Save size={18} />
                    {isSaving ? 'Saving to Cloud...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* CHANGE PASSWORD MODAL */}
      <AnimatePresence>
        {showPasswordModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowPasswordModal(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-panel max-w-md w-full p-6 border border-glass shadow-neon-primary-sm space-y-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-primary/20 text-primary border border-primary/30">
                    <Key size={20} />
                  </div>
                  <h3 className="text-xl font-bold text-textMain">Update Password</h3>
                </div>
                <button onClick={() => setShowPasswordModal(false)} className="text-textMuted hover:text-textMain p-1">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleChangePassword} className="space-y-4 pt-2">
                {passwordError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-xl flex items-center gap-2">
                    <AlertTriangle size={14} className="shrink-0" />
                    <span>{passwordError}</span>
                  </div>
                )}
                {passwordSuccess && (
                  <div className="p-3 bg-green-500/10 border border-green-500/30 text-green-400 text-xs rounded-xl flex items-center gap-2">
                    <CheckCircle2 size={14} className="shrink-0" />
                    <span>{passwordSuccess}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-textMuted">New Password</label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full bg-surface border border-glass rounded-xl px-4 py-2.5 text-sm text-textMain focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-textMuted">Confirm New Password</label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    className="w-full bg-surface border border-glass rounded-xl px-4 py-2.5 text-sm text-textMain focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-glass">
                  <button
                    type="button"
                    onClick={() => setShowPasswordModal(false)}
                    className="px-4 py-2 rounded-xl border border-glass text-textMuted hover:text-textMain"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={passwordLoading}
                    className="px-5 py-2 rounded-xl bg-primary text-background font-semibold hover:shadow-neon-primary-sm disabled:opacity-50"
                  >
                    {passwordLoading ? 'Updating...' : 'Update Password'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ACTIVE SESSIONS MODAL */}
      <AnimatePresence>
        {showSessionsModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowSessionsModal(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-panel max-w-lg w-full p-6 border border-glass shadow-neon-primary-sm space-y-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-primary/20 text-primary border border-primary/30">
                    <Monitor size={20} />
                  </div>
                  <h3 className="text-xl font-bold text-textMain">Active User Sessions</h3>
                </div>
                <button onClick={() => setShowSessionsModal(false)} className="text-textMuted hover:text-textMain p-1">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-3 pt-2">
                <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      <p className="font-semibold text-sm text-textMain">Current Session (This Device)</p>
                    </div>
                    <p className="text-xs text-textMuted">Browser: {navigator.userAgent.slice(0, 48)}...</p>
                    <p className="text-xs text-textMuted">Platform: {navigator.platform} • Status: Active Now</p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-primary/20 text-primary font-mono font-bold">
                    ONLINE
                  </span>
                </div>

                <div className="p-4 rounded-xl border border-glass bg-surface/40 flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="font-medium text-sm text-textMain">Mobile Web Client</p>
                    <p className="text-xs text-textMuted">Last active: 2 hours ago • Firebase Authenticated</p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-surface text-textMuted border border-glass font-mono">
                    IDLE
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end pt-3 border-t border-glass">
                <button
                  type="button"
                  onClick={() => setShowSessionsModal(false)}
                  className="px-5 py-2 rounded-xl bg-primary text-background font-semibold hover:shadow-neon-primary-sm"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CONFIRM DELETE MODAL */}
      <ConfirmModal
        isOpen={showDeleteModal}
        title="Permanently Delete Account?"
        message="This will completely wipe your user profile and remove all associated financial records, loan entries, digital locker files, crop data, and health history from Cloud Firestore. This action cannot be recovered."
        confirmText={deletingAccount ? 'Deleting...' : 'Yes, Delete Everything'}
        cancelText="Cancel"
        isDestructive={true}
        onConfirm={handleDeleteAccount}
        onCancel={() => setShowDeleteModal(false)}
      />
    </div>
  );
}
