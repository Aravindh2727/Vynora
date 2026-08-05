import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, Shield, Bell, Palette, Database, Key, 
  Smartphone, Monitor, Mail, Lock, Trash2, Download,
  Save, Camera, CheckCircle2
} from 'lucide-react';
import { useContextEngineStore } from '../store/useContextEngineStore';
import { subscribeToPush } from '../utils/push';

type TabId = 'profile' | 'security' | 'notifications' | 'appearance' | 'data';

export default function Settings() {
  const { user } = useContextEngineStore();
  const [activeTab, setActiveTab] = useState<TabId>('profile');
  const [isSaved, setIsSaved] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light' | 'system'>(
    (localStorage.getItem('theme') as any) || 'dark'
  );
  const [accentColor, setAccentColor] = useState(
    (localStorage.getItem('accentColor') as any) || '#00f2fe'
  );

  React.useEffect(() => {
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

  React.useEffect(() => {
    const root = window.document.documentElement;
    root.style.setProperty('--primary', accentColor);
    if (accentColor.length === 7) {
      root.style.setProperty('--shadow-neon-primary', `0 0 10px ${accentColor}80, 0 0 20px ${accentColor}4D`);
      root.style.setProperty('--shadow-neon-primary-sm', `0 0 5px ${accentColor}80, 0 0 10px ${accentColor}4D`);
    }
    localStorage.setItem('accentColor', accentColor);
  }, [accentColor]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'profile', label: 'Profile', icon: <User size={18} /> },
    { id: 'security', label: 'Security', icon: <Shield size={18} /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell size={18} /> },
    { id: 'appearance', label: 'Appearance', icon: <Palette size={18} /> },
    { id: 'data', label: 'Data & Privacy', icon: <Database size={18} /> },
  ];

  return (
    <div className="max-w-6xl mx-auto h-full flex flex-col">
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-400">
          Settings & Preferences
        </h1>
        <p className="text-textMuted mt-2">Manage your account, preferences, and security.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-8 flex-1 min-h-0">
        {/* Sidebar Navigation */}
        <div className="w-full md:w-64 shrink-0 overflow-x-auto md:overflow-visible">
          <nav className="flex md:flex-col gap-2 pb-4 md:pb-0">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-primary/10 text-primary border border-primary/30 shadow-[0_0_15px_rgba(0,242,254,0.15)]'
                    : 'text-textMuted hover:text-textMain hover:bg-surface border border-transparent'
                }`}
              >
                {tab.icon}
                <span className="font-medium">{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Content Area */}
        <div className="flex-1 glass-panel p-6 md:p-8 overflow-y-auto custom-scrollbar relative">
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
                          {user?.name?.charAt(0) || 'U'}
                        </div>
                        <button type="button" className="absolute bottom-0 right-0 p-2 bg-primary text-background rounded-full hover:scale-110 transition-transform">
                          <Camera size={16} />
                        </button>
                      </div>
                      <div>
                        <h3 className="text-lg font-medium">{user?.name || 'Guest User'}</h3>
                        <p className="text-textMuted text-sm">Update your photo and personal details here.</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-textMuted">Full Name</label>
                        <input type="text" defaultValue={user?.name || ''} className="w-full bg-surface border border-glass rounded-lg px-4 py-3 focus:outline-none focus:border-primary transition-colors text-textMain" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-textMuted">Email Address</label>
                        <input type="email" defaultValue={user?.email || ''} className="w-full bg-surface border border-glass rounded-lg px-4 py-3 focus:outline-none focus:border-primary transition-colors text-textMain" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-textMuted">Phone Number</label>
                        <input type="tel" placeholder="+1 (555) 000-0000" className="w-full bg-surface border border-glass rounded-lg px-4 py-3 focus:outline-none focus:border-primary transition-colors text-textMain" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-textMuted">Location</label>
                        <input type="text" placeholder="City, Country" className="w-full bg-surface border border-glass rounded-lg px-4 py-3 focus:outline-none focus:border-primary transition-colors text-textMain" />
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
                          <h3 className="font-medium flex items-center gap-2"><Key size={16} className="text-primary"/> Password</h3>
                          <p className="text-sm text-textMuted">Last changed 3 months ago</p>
                        </div>
                        <button type="button" className="px-4 py-2 border border-glass rounded-lg hover:bg-surface transition-colors whitespace-nowrap">
                          Change Password
                        </button>
                      </div>

                      <div className="p-4 border border-glass rounded-xl bg-surface/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <h3 className="font-medium flex items-center gap-2"><Smartphone size={16} className="text-primary"/> Two-Factor Authentication (2FA)</h3>
                          <p className="text-sm text-textMuted">Add an extra layer of security to your account</p>
                        </div>
                        <button type="button" className="px-4 py-2 bg-primary/10 text-primary border border-primary/30 rounded-lg hover:bg-primary/20 transition-colors whitespace-nowrap">
                          Enable 2FA
                        </button>
                      </div>

                      <div className="p-4 border border-glass rounded-xl bg-surface/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <h3 className="font-medium flex items-center gap-2"><Monitor size={16} className="text-primary"/> Active Sessions</h3>
                          <p className="text-sm text-textMuted">Manage devices logged into your account</p>
                        </div>
                        <button type="button" className="px-4 py-2 border border-glass rounded-lg hover:bg-surface transition-colors whitespace-nowrap">
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
                    
                    <div className="space-y-6">
                      {[
                        { title: 'Email Notifications', desc: 'Receive daily summaries and critical alerts via email', icon: <Mail size={20}/> },
                        { title: 'Push Notifications', desc: 'Get real-time updates on your device', icon: <Smartphone size={20}/>, action: () => subscribeToPush(user?.id || '1') },
                        { title: 'Security Alerts', desc: 'Get notified about unusual activity', icon: <Lock size={20}/>, defaultChecked: true },
                      ].map((item, i) => (
                        <div key={i} className="flex items-center justify-between p-4 border border-glass rounded-xl bg-surface/30">
                          <div className="flex items-center gap-4">
                            <div className="p-3 bg-surface rounded-lg text-primary">
                              {item.icon}
                            </div>
                            <div>
                              <h3 className="font-medium">{item.title}</h3>
                              <p className="text-sm text-textMuted">{item.desc}</p>
                            </div>
                          </div>
                          {item.action ? (
                            <button type="button" onClick={item.action} className="px-4 py-2 bg-primary text-background rounded-lg text-sm font-medium hover:bg-primary/90 shadow-neon-primary-sm">Enable</button>
                          ) : (
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input type="checkbox" className="sr-only peer" defaultChecked={item.defaultChecked} />
                              <div className="w-11 h-6 bg-surface peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)]"></div>
                            </label>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* APPEARANCE TAB */}
                {activeTab === 'appearance' && (
                  <div className="space-y-6">
                    <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                      <Palette className="text-primary" /> Appearance
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
                          Reset to Default
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
                          <p className="font-medium text-textMain">Custom Color Theme</p>
                          <p className="text-sm text-textMuted">Choose your personal accent color for the app interface.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* DATA TAB */}
                {activeTab === 'data' && (
                  <div className="space-y-6">
                    <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                      <Database className="text-primary" /> Data & Privacy
                    </h2>
                    
                    <div className="space-y-4">
                      <div className="p-5 border border-glass rounded-xl bg-surface/30">
                        <h3 className="font-medium mb-2 text-textMain">Export Your Data</h3>
                        <p className="text-sm text-textMuted mb-4">Download a complete copy of your Vynora data including finance, health, and tasks in JSON format.</p>
                        <button type="button" className="flex items-center gap-2 px-4 py-2 border border-glass rounded-lg hover:bg-surface transition-colors">
                          <Download size={16} /> Export Data
                        </button>
                      </div>

                      <div className="p-5 border border-red-500/30 rounded-xl bg-red-500/5">
                        <h3 className="font-medium mb-2 text-red-400">Delete Account</h3>
                        <p className="text-sm text-red-400/70 mb-4">Permanently delete your account and all associated data. This action cannot be undone.</p>
                        <button type="button" className="flex items-center gap-2 px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/50 rounded-lg hover:bg-red-500/30 transition-colors">
                          <Trash2 size={16} /> Delete Account
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* SAVE BUTTON */}
                <div className="pt-6 border-t border-glass flex items-center justify-end gap-4">
                  <AnimatePresence>
                    {isSaved && (
                      <motion.span 
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0 }}
                        className="text-green-400 flex items-center gap-2 text-sm"
                      >
                        <CheckCircle2 size={16} /> Preferences saved successfully
                      </motion.span>
                    )}
                  </AnimatePresence>
                  
                  <button 
                    type="submit"
                    className="flex items-center gap-2 px-6 py-2.5 bg-primary text-background font-medium rounded-lg hover:shadow-neon-primary transition-all active:scale-95"
                  >
                    <Save size={18} />
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
