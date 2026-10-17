import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { 
  Home, CreditCard, FileText, CheckSquare, Box, Settings, Search, Bell,
  User, Sparkles, LogOut, Pill, Receipt, AlertTriangle, Tractor, FileDigit,
  Car, GraduationCap, Key, Users, HeartPulse, Target, BarChart, Banknote,
  Sun, Moon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import { queryCache } from './services/queryCache';
import { useContextEngineStore } from './store/useContextEngineStore';
import { NavigationProvider } from './context/NavigationContext';
import Dashboard from './pages/Dashboard';
import FinanceTracker from './pages/FinanceTracker';
import DigitalLocker from './pages/DigitalLocker';
import MedicineReminder from './pages/MedicineReminder';
import BillReminder from './pages/BillReminder';
import TasksPlanner from './pages/TasksPlanner';
import AgricultureManager from './pages/AgricultureManager';
import DairyManager from './pages/DairyManager';
import VehicleManager from './pages/VehicleManager';
import HomeInventory from './pages/HomeInventory';
import PasswordVault from './pages/PasswordVault';
import EmergencyContacts from './pages/EmergencyContacts';
import StudentPlanner from './pages/StudentPlanner';
import HealthRecords from './pages/HealthRecords';
import GoalTracker from './pages/GoalTracker';
import FamilyDashboard from './pages/FamilyDashboard';
import GlobalReports from './pages/GlobalReports';
import SettingsPage from './pages/Settings';
import Login from './pages/Login';
import Register from './pages/Register';
import LoanManager from './pages/LoanManager';
import AIAssistant from './pages/AIAssistant';
import ProtectedRoute from './components/ProtectedRoute';
import { BottomNav } from './components/common/BottomNav';
import { VynoraLoader } from './components/common/VynoraLoader';
import LoaderPreview from './pages/LoaderPreview';

export function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const [cmdMenuOpen, setCmdMenuOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [isPinned, setIsPinned] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [currentTheme, setCurrentTheme] = useState(() => localStorage.getItem('theme') || 'dark');
  const [initialSplashDone, setInitialSplashDone] = useState(false);
  const { dispatchIntent, aiStatus, user, setUser, setAuthLoading, authLoading } = useContextEngineStore();

  useEffect(() => {
    // Prevent flickering during fast auth resolutions with a short minimum display duration
    const timer = setTimeout(() => {
      setInitialSplashDone(true);
    }, 650);
    return () => clearTimeout(timer);
  }, []);

  const isDesktopSidebarOpen = isPinned || isHovered;
  const isDashboard = location.pathname === '/';

  // Global Theme Initialization
  useEffect(() => {
    const theme = localStorage.getItem('theme') || 'dark';
    const accentColor = localStorage.getItem('accentColor') || '#00f2fe';
    const root = window.document.documentElement;
    
    root.classList.remove('light');
    if (theme === 'system') {
      if (window.matchMedia('(prefers-color-scheme: dark)').matches === false) {
        root.classList.add('light');
      }
    } else if (theme === 'light') {
      root.classList.add('light');
    }

    if (accentColor) {
      root.style.setProperty('--primary', accentColor);
      if (accentColor.length === 7) {
        root.style.setProperty('--shadow-neon-primary', `0 0 10px ${accentColor}80, 0 0 20px ${accentColor}4D`);
        root.style.setProperty('--shadow-neon-primary-sm', `0 0 5px ${accentColor}80, 0 0 10px ${accentColor}4D`);
      }
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = currentTheme === 'light' ? 'dark' : 'light';
    setCurrentTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);
    const root = window.document.documentElement;
    if (nextTheme === 'light') {
      root.classList.add('light');
    } else {
      root.classList.remove('light');
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser && firebaseUser.emailVerified) {
        setUser({ id: firebaseUser.uid, name: firebaseUser.displayName || 'User', email: firebaseUser.email || '' });
      } else {
        queryCache.clearAll();
        setUser(null);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, [setUser, setAuthLoading]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCmdMenuOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const navItems = [
    { path: '/', icon: <Home size={20} />, label: 'Dashboard' },
    { path: '/finance', icon: <CreditCard size={20} />, label: 'Finance' },
    { path: '/loans', icon: <Banknote size={20} />, label: 'Loan Management' },
    { path: '/digital-locker', icon: <FileText size={20} />, label: 'Digital Locker' },
    { path: '/tasks', icon: <CheckSquare size={20} />, label: 'Tasks & Planner' },
    { path: '/medicine', icon: <Pill size={20} />, label: 'Medicine Reminder' },
    { path: '/bills', icon: <Receipt size={20} />, label: 'Bill Reminder' },
    { path: '/emergency', icon: <AlertTriangle size={20} />, label: 'Emergency Center' },
    { path: '/agriculture', icon: <Tractor size={20} />, label: 'Agriculture' },
    { path: '/dairy', icon: <FileDigit size={20} />, label: 'Dairy Management' },
    { path: '/vehicles', icon: <Car size={20} />, label: 'Vehicle Manager' },
    { path: '/student', icon: <GraduationCap size={20} />, label: 'Student Planner' },
    { path: '/home-inventory', icon: <Box size={20} />, label: 'Home Inventory' },
    { path: '/password-vault', icon: <Key size={20} />, label: 'Password Vault' },
    { path: '/family', icon: <Users size={20} />, label: 'Family Dashboard' },
    { path: '/health', icon: <HeartPulse size={20} />, label: 'Health Records' },
    { path: '/goals', icon: <Target size={20} />, label: 'Goal Tracker' },
    { path: '/reports', icon: <BarChart size={20} />, label: 'Reports' },
  ];

  const handleAICommand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt) return;
    dispatchIntent(prompt);
    setPrompt('');
    setCmdMenuOpen(false);
  };

  const handleLogout = async () => {
    queryCache.clearAll();
    await auth.signOut();
    setUser(null);
    navigate('/login');
  };

  // Initial application loading splash (Firebase Auth initialization & anti-flicker delay)
  if (authLoading || !initialSplashDone) {
    return (
      <VynoraLoader
        fullscreen
        message="Loading your world..."
        submessage="Initializing Vynora Workspace..."
        timeoutMs={14000}
      />
    );
  }

  if (location.pathname === '/login' || location.pathname === '/register') {
    return (
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Routes>
      </AnimatePresence>
    );
  }

  const ModulePlaceholder = ({ title }: { title: string }) => (
    <div className="flex flex-col items-center justify-center h-full text-center text-textMuted p-6">
      <div className="w-16 h-16 rounded-full bg-surface border border-glass flex items-center justify-center mb-4">
        <Sparkles size={32} className="text-primary opacity-50" />
      </div>
      <h2 className="text-2xl font-bold text-textMain mb-2">{title}</h2>
      <p className="max-w-md">This module is scheduled for development in an upcoming update.</p>
    </div>
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden font-sans text-textMain">
      {/* 
        DESKTOP SIDEBAR ONLY (hidden on mobile, preserving full desktop navigation)
        Strict requirement: NO sidebar on mobile, NO hamburger menu drawer.
      */}
      <motion.aside 
        initial={{ width: 256 }}
        animate={{ width: isDesktopSidebarOpen ? 256 : 88 }}
        onMouseEnter={() => !isPinned && setIsHovered(true)}
        onMouseLeave={() => !isPinned && setIsHovered(false)}
        className="hidden md:flex glass-panel flex-col z-50 shrink-0 overflow-hidden transition-all duration-300
          relative top-0 bottom-0 left-0 m-4 h-[calc(100vh-32px)]"
      >
        <div className={`p-6 flex items-center shrink-0 border-b border-glass h-20 ${isDesktopSidebarOpen ? 'justify-between' : 'justify-center'}`}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full shadow-neon-primary shrink-0 overflow-hidden flex items-center justify-center border border-primary/30">
              <img src="/vynora_icon_circle.png" alt="Vynora Logo" className="w-full h-full object-cover" />
            </div>
            {isDesktopSidebarOpen && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="whitespace-nowrap"
              >
                <h1 className="text-xl font-bold tracking-wider text-textMain">Vynora</h1>
                <p className="text-[10px] text-primary/80 font-semibold tracking-wider mt-0.5">Your Life • Organized • Smarter</p>
              </motion.div>
            )}
          </div>
          {isDesktopSidebarOpen && (
            <button 
              onClick={() => setIsPinned(!isPinned)} 
              className="text-textMuted hover:text-textMain p-1 hover:bg-surface rounded transition-colors"
              title={isPinned ? "Unpin Sidebar" : "Pin Sidebar"}
            >
              <span className="text-xs font-mono">{isPinned ? '📌' : '📍'}</span>
            </button>
          )}
        </div>

        <nav className="flex-1 px-3 py-4 space-y-2 overflow-y-auto custom-scrollbar overflow-x-hidden">
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path) && (item.path !== '/' || location.pathname === '/');
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 rounded-xl transition-all duration-300 ${
                  isDesktopSidebarOpen ? 'px-4 py-3' : 'p-3 justify-center'
                } ${
                  isActive 
                    ? 'bg-surfaceLight text-primary shadow-[inset_4px_0_0_0_#00f2fe]' 
                    : 'text-textMuted hover:text-textMain hover:bg-surface'
                }`}
                title={!isDesktopSidebarOpen ? item.label : undefined}
              >
                <span className={`${isActive ? 'text-primary' : ''} shrink-0`}>
                  {item.icon}
                </span>
                {isDesktopSidebarOpen && (
                  <motion.span 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="font-medium text-sm whitespace-nowrap"
                  >
                    {item.label}
                  </motion.span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-glass space-y-2 shrink-0">
          <button 
            onClick={() => navigate('/settings')}
            className={`w-full flex items-center gap-3 text-textMuted hover:text-textMain hover:bg-surface rounded-xl transition-all ${
              isDesktopSidebarOpen ? 'px-4 py-3' : 'p-3 justify-center'
            }`}
            title={!isDesktopSidebarOpen ? "Settings" : undefined}
          >
            <Settings size={20} className="shrink-0" />
            {isDesktopSidebarOpen && <span className="font-medium text-sm whitespace-nowrap">Settings</span>}
          </button>
          <button 
            onClick={handleLogout} 
            className={`w-full flex items-center gap-3 text-red-400 hover:text-red-300 hover:bg-surface rounded-xl transition-all ${
              isDesktopSidebarOpen ? 'px-4 py-3' : 'p-3 justify-center'
            }`}
            title={!isDesktopSidebarOpen ? "Sign Out" : undefined}
          >
            <LogOut size={20} className="shrink-0" />
            {isDesktopSidebarOpen && <span className="font-medium text-sm whitespace-nowrap">Sign Out</span>}
          </button>
        </div>
      </motion.aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen relative w-full min-w-0 overflow-hidden">
        {/* 
          DESKTOP HEADER (always shown on md:)
          MOBILE HEADER (shown ONLY on Dashboard '/' to provide logo, greeting, theme toggle, notifications)
          Inner mobile pages display their dedicated MobilePageHeader with back navigation!
        */}
        <header className={`${isDashboard ? 'flex' : 'hidden md:flex'} h-16 md:h-20 px-3.5 sm:px-4 md:px-8 items-center justify-between shrink-0 gap-2 border-b border-glass/40 md:border-b-0`}>
          {/* Left Side: Brand on mobile, search on desktop */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Mobile Branding (Dashboard only) — Guaranteed no overlap */}
            <div className="flex items-center gap-2.5 md:hidden shrink-0">
              <div className="w-9 h-9 rounded-full shadow-neon-primary shrink-0 overflow-hidden border border-primary/40 bg-surface">
                <img src="/vynora_icon_circle.png" alt="Vynora" className="w-full h-full object-cover" />
              </div>
              <div className="shrink-0">
                <h1 className="text-base font-bold tracking-wide text-textMain leading-tight whitespace-nowrap">Vynora</h1>
                <p className="text-[10.5px] text-primary whitespace-nowrap font-medium">Smart Life OS</p>
              </div>
            </div>

            {/* Desktop Search */}
            <div 
              className="hidden md:flex items-center gap-2 px-4 py-2 glass-panel cursor-pointer text-textMuted hover:text-textMain transition-colors w-full max-w-[280px] sm:w-72 shadow-neon-primary rounded-lg"
              onClick={() => setCmdMenuOpen(true)}
            >
              <Search size={16} className="text-primary shrink-0" />
              <span className="text-sm font-medium">Search Vynora...</span>
              <span className="ml-auto text-xs border border-glass px-1.5 py-0.5 rounded bg-surface">⌘K</span>
            </div>
          </div>

          {/* Right Side: Theme toggle, notifications, profile — Crisp, consistent touch buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Theme Toggle Button */}
            <button 
              onClick={toggleTheme}
              aria-label="Toggle Theme"
              className="w-9 h-9 rounded-full glass-panel hover:text-primary transition-colors shrink-0 flex items-center justify-center text-textMuted active:scale-95"
              title={`Switch to ${currentTheme === 'light' ? 'Dark' : 'Light'} Mode`}
            >
              {currentTheme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            </button>

            {/* Notifications */}
            <button 
              aria-label="Notifications"
              className="w-9 h-9 rounded-full glass-panel hover:text-primary transition-colors relative shrink-0 flex items-center justify-center text-textMuted active:scale-95"
            >
              <Bell size={16} />
              {aiStatus === 'thinking' && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full animate-ping"></span>
              )}
            </button>

            {/* Profile Avatar / Settings Link */}
            <button
              onClick={() => navigate('/settings')}
              aria-label="User Account"
              className="h-9 px-2 rounded-full glass-panel border border-glass hover:border-primary/40 transition-colors shrink-0 flex items-center justify-center gap-1.5 active:scale-95"
            >
              <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                {user?.name?.[0]?.toUpperCase() || 'U'}
              </div>
              <span className="text-xs font-medium hidden sm:inline">{user?.name?.split(' ')[0] || 'User'}</span>
            </button>
          </div>
        </header>

        {/* Scrollable Main Views */}
        <div className="flex-1 p-3 sm:p-5 md:p-8 overflow-y-auto overflow-x-hidden custom-scrollbar relative pb-16 md:pb-8 min-w-0 max-w-full">
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              <Route element={<ProtectedRoute />}>
                <Route path="/" element={<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}><Dashboard /></motion.div>} />
                <Route path="/ai/*" element={<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}><AIAssistant /></motion.div>} />
                <Route path="/finance/*" element={<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}><FinanceTracker /></motion.div>} />
                <Route path="/loans/*" element={<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}><LoanManager /></motion.div>} />
                <Route path="/digital-locker/*" element={<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}><DigitalLocker /></motion.div>} />
                <Route path="/tasks/*" element={<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}><TasksPlanner /></motion.div>} />
                <Route path="/medicine/*" element={<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}><MedicineReminder /></motion.div>} />
                <Route path="/bills/*" element={<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}><BillReminder /></motion.div>} />
                <Route path="/agriculture/*" element={<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}><AgricultureManager /></motion.div>} />
                <Route path="/dairy/*" element={<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}><DairyManager /></motion.div>} />
                <Route path="/emergency/*" element={<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}><EmergencyContacts /></motion.div>} />
                <Route path="/vehicles/*" element={<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}><VehicleManager /></motion.div>} />
                <Route path="/home-inventory/*" element={<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}><HomeInventory /></motion.div>} />
                <Route path="/password-vault/*" element={<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}><PasswordVault /></motion.div>} />
                <Route path="/student/*" element={<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}><StudentPlanner /></motion.div>} />
                <Route path="/health/*" element={<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}><HealthRecords /></motion.div>} />
                <Route path="/goals/*" element={<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}><GoalTracker /></motion.div>} />
                <Route path="/family/*" element={<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}><FamilyDashboard /></motion.div>} />
                <Route path="/reports/*" element={<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}><GlobalReports /></motion.div>} />
                <Route path="/settings/*" element={<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}><SettingsPage /></motion.div>} />
                <Route path="/loader-preview/*" element={<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}><LoaderPreview /></motion.div>} />

                <Route path="*" element={<ModulePlaceholder title="404 - Module Not Found" />} />
              </Route>
            </Routes>
          </AnimatePresence>
        </div>

        {/* Mobile Bottom Navigation Bar (Home, Finance, Tasks, Settings) */}
        <BottomNav />

        {/* Command Menu */}
        {cmdMenuOpen && (
          <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-[15vh] p-4" onClick={() => setCmdMenuOpen(false)}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="w-full max-w-2xl glass-panel p-4 shadow-neon-primary"
              onClick={(e) => e.stopPropagation()}
            >
              <form onSubmit={handleAICommand} className="flex items-center gap-3 border-b border-glass pb-4 mb-4">
                <Search className="text-primary shrink-0" size={24} />
                <input 
                  autoFocus
                  type="text" 
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Search globally across expenses, crops, vehicles..." 
                  className="bg-transparent flex-1 outline-none text-base sm:text-lg placeholder-gray-500 min-w-0"
                />
                <button type="button" onClick={() => setCmdMenuOpen(false)} className="text-xs text-textMuted bg-surface px-2 py-1 rounded border border-glass hover:bg-surfaceLight transition-colors">ESC</button>
              </form>
              <div className="text-xs text-textMuted p-2">
                <p>Quick suggestions:</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="p-2 rounded bg-surface border border-glass flex items-center gap-2"><Pill size={14} className="text-blue-400"/> Medicine Dose</span>
                  <span className="p-2 rounded bg-surface border border-glass flex items-center gap-2"><Car size={14} className="text-yellow-400"/> Vehicle Service</span>
                  <span className="p-2 rounded bg-surface border border-glass flex items-center gap-2"><Tractor size={14} className="text-emerald-400"/> Farm Crops</span>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <NavigationProvider>
      <AppContent />
    </NavigationProvider>
  );
}
