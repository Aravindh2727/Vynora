import React, { useState } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { 
  Home, CreditCard, FileText, CheckSquare, Box, Settings, Search, Bell,
  User, Sparkles, LogOut, Pill, Receipt, AlertTriangle, Tractor, FileDigit,
  Car, GraduationCap, Key, Users, HeartPulse, Target, BarChart, Menu
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import { useContextEngineStore } from './store/useContextEngineStore';
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
import SettingsPage from './pages/Settings';
import Login from './pages/Login';
import Register from './pages/Register';
import ProtectedRoute from './components/ProtectedRoute';
import AIChatWidget from './components/AIChatWidget';

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [cmdMenuOpen, setCmdMenuOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [isPinned, setIsPinned] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { dispatchIntent, aiStatus, user, setUser, authLoading, setAuthLoading } = useContextEngineStore();

  const isSidebarOpen = isMobile ? true : (isPinned || isHovered);

  // Global Theme Initialization
  React.useEffect(() => {
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

  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser && firebaseUser.emailVerified) {
        setUser({ id: firebaseUser.uid, name: firebaseUser.displayName || 'User', email: firebaseUser.email || '' });
      } else {
        setUser(null);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, [setUser, setAuthLoading]);

  React.useEffect(() => {
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
    await auth.signOut();
    setUser(null);
    navigate('/login');
  };

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

  // Temporary component to satisfy router until Sprints catch up
  const ModulePlaceholder = ({ title }: { title: string }) => (
    <div className="flex flex-col items-center justify-center h-full text-center text-textMuted">
      <div className="w-16 h-16 rounded-full bg-surface border border-glass flex items-center justify-center mb-4">
        <Sparkles size={32} className="text-primary opacity-50" />
      </div>
      <h2 className="text-2xl font-bold text-textMain mb-2">{title}</h2>
      <p className="max-w-md">This module is scheduled for development in an upcoming Sprint. The UI and MongoDB integration will replace this screen shortly.</p>
    </div>
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden font-sans text-textMain">
      {/* Mobile Backdrop */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Smart Sidebar - Collapsible */}
      <motion.aside 
        initial={{ width: 256 }}
        animate={{ width: isSidebarOpen ? 256 : 88 }}
        onMouseEnter={() => !isMobile && !isPinned && setIsHovered(true)}
        onMouseLeave={() => !isMobile && !isPinned && setIsHovered(false)}
        className={`glass-panel flex flex-col z-50 shrink-0 overflow-hidden transition-transform duration-300
          fixed md:relative top-4 bottom-4 left-4 md:top-0 md:bottom-0 md:left-0 md:m-4
          h-[calc(100vh-32px)] 
          ${isMobile ? (isMobileOpen ? 'translate-x-0' : '-translate-x-[120%]') : 'translate-x-0'}
        `}
      >
        <div className={`p-6 flex items-center shrink-0 border-b border-glass h-20 ${isSidebarOpen ? 'justify-between' : 'justify-center'}`}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full shadow-neon-primary shrink-0 overflow-hidden flex items-center justify-center border border-primary/20">
              <img src="/vynora_logo.png" alt="Vynora Logo" className="w-full h-full object-cover" />
            </div>
            {isSidebarOpen && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="whitespace-nowrap"
              >
                <h1 className="text-xl font-bold tracking-wider text-textMain">Vynora</h1>
                <p className="text-[10px] text-primary/80 font-semibold tracking-wider mt-0.5">One Platform. Every Part of Life.</p>
              </motion.div>
            )}
          </div>
          {isSidebarOpen && (
            <button 
              onClick={() => setIsPinned(!isPinned)} 
              className="text-textMuted hover:text-textMain p-1 hover:bg-surface rounded transition-colors"
              title={isPinned ? "Unpin Sidebar" : "Pin Sidebar"}
            >
              <Menu size={20} />
            </button>
          )}
        </div>

        <nav className="flex-1 px-3 py-4 space-y-2 overflow-y-auto custom-scrollbar overflow-x-hidden">
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path) && (item.path !== '/' || location.pathname === '/');
            return (
              <button
                key={item.path}
                onClick={() => {
                  navigate(item.path);
                  if (isMobile) setIsMobileOpen(false);
                }}
                className={`w-full flex items-center gap-3 rounded-xl transition-all duration-300 ${
                  isSidebarOpen ? 'px-4 py-3' : 'p-3 justify-center'
                } ${
                  isActive 
                    ? 'bg-surfaceLight text-primary shadow-[inset_4px_0_0_0_#00f2fe]' 
                    : 'text-textMuted hover:text-textMain hover:bg-surface'
                }`}
                title={!isSidebarOpen ? item.label : undefined}
              >
                <span className={`${isActive ? 'text-primary' : ''} shrink-0`}>
                  {item.icon}
                </span>
                {isSidebarOpen && (
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
            onClick={() => {
              navigate('/settings');
              if (isMobile) setIsMobileOpen(false);
            }}
            className={`w-full flex items-center gap-3 text-textMuted hover:text-textMain hover:bg-surface rounded-xl transition-all ${
              isSidebarOpen ? 'px-4 py-3' : 'p-3 justify-center'
            }`}
            title={!isSidebarOpen ? "Settings" : undefined}
          >
            <Settings size={20} className="shrink-0" />
            {isSidebarOpen && <span className="font-medium text-sm whitespace-nowrap">Settings</span>}
          </button>
          <button 
            onClick={handleLogout} 
            className={`w-full flex items-center gap-3 text-red-400 hover:text-red-300 hover:bg-surface rounded-xl transition-all ${
              isSidebarOpen ? 'px-4 py-3' : 'p-3 justify-center'
            }`}
            title={!isSidebarOpen ? "Sign Out" : undefined}
          >
            <LogOut size={20} className="shrink-0" />
            {isSidebarOpen && <span className="font-medium text-sm whitespace-nowrap">Sign Out</span>}
          </button>
        </div>
      </motion.aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen relative w-full overflow-hidden">
        <header className="h-16 md:h-20 px-4 md:px-8 flex items-center justify-between shrink-0 gap-4">
          <div className="flex items-center gap-2 md:gap-4 flex-1">
            <button 
              className="md:hidden p-2 glass-panel rounded-lg text-textMuted hover:text-textMain"
              onClick={() => setIsMobileOpen(true)}
            >
              <Menu size={20} />
            </button>
            <div 
              className="flex items-center gap-2 px-3 md:px-4 py-2 glass-panel cursor-pointer text-textMuted hover:text-textMain transition-colors w-full max-w-[280px] sm:w-72 shadow-neon-primary-sm rounded-lg"
              onClick={() => setCmdMenuOpen(true)}
            >
              <Search size={16} className="text-primary shrink-0" />
              <span className="text-sm font-medium hidden sm:inline">Search Vynora...</span>
              <span className="text-sm font-medium sm:hidden">Search</span>
              <span className="ml-auto text-xs border border-glass px-1.5 py-0.5 rounded bg-surface hidden md:inline">⌘K</span>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4 shrink-0">
            <button className="p-2 rounded-full glass-panel hover:text-primary transition-colors relative">
              <Bell size={18} className="md:w-5 md:h-5" />
              {aiStatus === 'thinking' && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full animate-ping"></span>
              )}
            </button>
            <div className="flex items-center gap-2 glass-panel px-2 md:px-3 py-1.5 rounded-full border border-glass">
              <User size={16} className="text-primary shrink-0" />
              <span className="text-sm font-medium hidden sm:inline">{user?.name || 'Guest'}</span>
            </div>
          </div>
        </header>

        <div className="flex-1 p-4 md:p-8 overflow-y-auto custom-scrollbar relative">
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              <Route element={<ProtectedRoute />}>
                <Route path="/" element={<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}><Dashboard /></motion.div>} />
                <Route path="/finance" element={<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}><FinanceTracker /></motion.div>} />
                <Route path="/digital-locker" element={<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}><DigitalLocker /></motion.div>} />
                
                <Route path="/tasks" element={<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}><TasksPlanner /></motion.div>} />
                <Route path="/medicine" element={<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}><MedicineReminder /></motion.div>} />
                <Route path="/bills" element={<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}><BillReminder /></motion.div>} />
                <Route path="/agriculture/*" element={<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}><AgricultureManager /></motion.div>} />
                <Route path="/dairy/*" element={<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}><DairyManager /></motion.div>} />
                <Route path="/emergency" element={<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}><EmergencyContacts /></motion.div>} />
                <Route path="/vehicles/*" element={<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}><VehicleManager /></motion.div>} />
                <Route path="/home-inventory/*" element={<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}><HomeInventory /></motion.div>} />
                <Route path="/password-vault" element={<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}><PasswordVault /></motion.div>} />
                <Route path="/student" element={<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}><StudentPlanner /></motion.div>} />
                <Route path="/health" element={<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}><HealthRecords /></motion.div>} />
                <Route path="/goals" element={<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}><GoalTracker /></motion.div>} />
                <Route path="/family" element={<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}><FamilyDashboard /></motion.div>} />
                
                {/* ModulePlaceholder mapping complete. */}
                <Route path="/reports" element={<ModulePlaceholder title="Global Reports" />} />
                <Route path="/settings" element={<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}><SettingsPage /></motion.div>} />

                <Route path="*" element={<ModulePlaceholder title="404 - Module Not Found" />} />
              </Route>
            </Routes>
          </AnimatePresence>
        </div>

        {/* Floating AI Chat Widget */}
        <AIChatWidget />

        {cmdMenuOpen && (
          <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-[15vh]" onClick={() => setCmdMenuOpen(false)}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="w-[90%] max-w-2xl glass-panel p-4 shadow-neon-primary"
              onClick={(e) => e.stopPropagation()}
            >
              <form onSubmit={handleAICommand} className="flex items-center gap-3 border-b border-glass pb-4 mb-4">
                <Search className="text-primary" size={24} />
                <input 
                  autoFocus
                  type="text" 
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Search globally across expenses, crops, vehicles..." 
                  className="bg-transparent flex-1 outline-none text-lg placeholder-gray-500"
                />
                <button type="button" onClick={() => setCmdMenuOpen(false)} className="text-xs text-textMuted bg-surface px-2 py-1 rounded border border-glass hover:bg-surfaceLight transition-colors">ESC</button>
              </form>
              <div className="text-sm text-textMuted p-2">
                <p>Global Search (Coming in Sprint 7):</p>
                <ul className="mt-2 space-y-2">
                  <li className="p-2 rounded flex items-center gap-2 opacity-50"><Pill size={14}/> <span>Paracetamol (Medicine)</span></li>
                  <li className="p-2 rounded flex items-center gap-2 opacity-50"><FileText size={14}/> <span>Aadhaar Card (Digital Locker)</span></li>
                  <li className="p-2 rounded flex items-center gap-2 opacity-50"><Tractor size={14}/> <span>Wheat Seeds (Agriculture)</span></li>
                </ul>
              </div>
            </motion.div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
