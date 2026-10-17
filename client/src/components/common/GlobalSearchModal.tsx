import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  X,
  ArrowRight,
  Home,
  CreditCard,
  Banknote,
  FileText,
  CheckSquare,
  Pill,
  Receipt,
  AlertTriangle,
  Tractor,
  FileDigit,
  Car,
  GraduationCap,
  Box,
  Key,
  Users,
  HeartPulse,
  Target,
  BarChart,
  Settings,
  Sun,
  Moon,
  PlusCircle,
  Database,
  Compass,
  Zap,
  CornerDownLeft
} from 'lucide-react';
import { queryCache } from '../../services/queryCache';
import { getActiveUserId, GlobalSearchService } from '../../services/firestoreService';

export interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  user?: any;
  currentTheme?: string;
  onToggleTheme?: () => void;
}

interface SearchItem {
  id: string;
  type: 'module' | 'action' | 'record';
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  route?: string;
  badge?: string;
  action?: () => void;
  keywords?: string[];
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  user,
  currentTheme = 'dark',
  onToggleTheme
}) => {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | 'module' | 'action' | 'record'>('all');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [cacheVersion, setCacheVersion] = useState(0);

  // Focus input automatically on open & pre-warm user records into queryCache
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setActiveCategory('all');
      setTimeout(() => inputRef.current?.focus(), 50);

      const activeUid = getActiveUserId(user?.id || user?.uid);
      GlobalSearchService.prewarmUserDatasets(activeUid).then(() => {
        setCacheVersion((v) => v + 1);
      });
    }
  }, [isOpen, user]);

  // Real-time synchronization: Immediately update search results when any record is edited/added/deleted
  useEffect(() => {
    const unsubscribe = queryCache.subscribe(() => {
      setCacheVersion((v) => v + 1);
    });
    return unsubscribe;
  }, []);

  // Vynora Modules Registry with rich keyword matching
  const modules: SearchItem[] = useMemo(() => [
    {
      id: 'mod-dashboard',
      type: 'module',
      title: 'Dashboard',
      subtitle: 'Smart life hub, quick stats & daily overview',
      icon: <Home className="text-primary" size={18} />,
      route: '/',
      badge: 'Hub',
      keywords: ['dashboard', 'home', 'overview', 'summary', 'stats', 'widgets', 'main']
    },
    {
      id: 'mod-finance',
      type: 'module',
      title: 'Finance & Expense Tracker',
      subtitle: 'Income, daily expenses, monthly budgets & accounts',
      icon: <CreditCard className="text-emerald-400" size={18} />,
      route: '/finance',
      badge: 'Finance',
      keywords: ['finance', 'expenses', 'expense', 'money', 'budget', 'income', 'transactions', 'spending', 'cash', 'bank', 'wallet', 'salary']
    },
    {
      id: 'mod-loans',
      type: 'module',
      title: 'Loan Manager',
      subtitle: 'Borrowed & lent amounts, interest calculation & EMI schedules',
      icon: <Banknote className="text-amber-400" size={18} />,
      route: '/loans',
      badge: 'Finance',
      keywords: ['loans', 'loan', 'debt', 'borrowed', 'lent', 'emi', 'interest', 'principal', 'repayment', 'creditor', 'debtor']
    },
    {
      id: 'mod-digital-locker',
      type: 'module',
      title: 'Digital Locker',
      subtitle: 'Secure document storage for Aadhaar, PAN, certificates & IDs',
      icon: <FileText className="text-cyan-400" size={18} />,
      route: '/digital-locker',
      badge: 'Docs',
      keywords: ['digital locker', 'locker', 'documents', 'docs', 'aadhar', 'pan', 'passport', 'certificates', 'files', 'pdf', 'upload']
    },
    {
      id: 'mod-tasks',
      type: 'module',
      title: 'Tasks & Planner',
      subtitle: 'Todo lists, smart reminders & productivity schedule',
      icon: <CheckSquare className="text-purple-400" size={18} />,
      route: '/tasks',
      badge: 'Planner',
      keywords: ['tasks', 'task', 'todo', 'todos', 'planner', 'checklist', 'reminder', 'reminders', 'schedule', 'deadlines']
    },
    {
      id: 'mod-medicine',
      type: 'module',
      title: 'Medicine Reminder',
      subtitle: 'Prescriptions, pill timings, dosage tracking & refills',
      icon: <Pill className="text-rose-400" size={18} />,
      route: '/medicine',
      badge: 'Health',
      keywords: ['medicine', 'medicines', 'pill', 'pills', 'dose', 'dosage', 'prescription', 'doctor', 'tablets', 'medical', 'drugs']
    },
    {
      id: 'mod-bills',
      type: 'module',
      title: 'Bill Reminder',
      subtitle: 'Utilities, subscriptions, rent, electricity & recharge alerts',
      icon: <Receipt className="text-orange-400" size={18} />,
      route: '/bills',
      badge: 'Utilities',
      keywords: ['bills', 'bill', 'utilities', 'electricity', 'water', 'rent', 'wifi', 'recharge', 'subscriptions', 'due date', 'invoices']
    },
    {
      id: 'mod-emergency',
      type: 'module',
      title: 'Emergency Center',
      subtitle: '1-tap SOS, ambulance, police, hospitals & ICE contacts',
      icon: <AlertTriangle className="text-red-500" size={18} />,
      route: '/emergency',
      badge: 'SOS',
      keywords: ['emergency', 'sos', 'ambulance', 'police', 'hospital', 'doctor', 'blood', 'ice', 'urgent', 'contacts', 'fire']
    },
    {
      id: 'mod-agriculture',
      type: 'module',
      title: 'Agriculture & Crops',
      subtitle: 'Crop cultivation cycles, fertilizer logs, yield & farm expenses',
      icon: <Tractor className="text-emerald-500" size={18} />,
      route: '/agriculture',
      badge: 'Farm',
      keywords: ['agriculture', 'farm', 'crops', 'crop', 'harvest', 'yield', 'seeds', 'fertilizer', 'tractor', 'irrigation', 'farming', 'soil']
    },
    {
      id: 'mod-dairy',
      type: 'module',
      title: 'Dairy Management',
      subtitle: 'Cattle herd records, daily milk logs, feed & vet visits',
      icon: <FileDigit className="text-blue-400" size={18} />,
      route: '/dairy',
      badge: 'Livestock',
      keywords: ['dairy', 'cows', 'cow', 'cattle', 'milk', 'yield', 'livestock', 'lactation', 'feed', 'vet', 'breeding', 'animals']
    },
    {
      id: 'mod-vehicles',
      type: 'module',
      title: 'Vehicle Manager',
      subtitle: 'Fuel efficiency, service history, insurance & maintenance',
      icon: <Car className="text-amber-500" size={18} />,
      route: '/vehicles',
      badge: 'Vehicles',
      keywords: ['vehicles', 'vehicle', 'car', 'bike', 'motorcycle', 'scooter', 'fuel', 'mileage', 'service', 'repair', 'maintenance', 'insurance', 'rc']
    },
    {
      id: 'mod-student',
      type: 'module',
      title: 'Student Planner',
      subtitle: 'Class timetables, exams, syllabus progress & assignment tracking',
      icon: <GraduationCap className="text-indigo-400" size={18} />,
      route: '/student',
      badge: 'Education',
      keywords: ['student', 'school', 'college', 'exam', 'exams', 'syllabus', 'timetable', 'study', 'study planner', 'courses', 'homework', 'grades']
    },
    {
      id: 'mod-home-inventory',
      type: 'module',
      title: 'Home Inventory',
      subtitle: 'Appliances, warranty cards, serial numbers & household assets',
      icon: <Box className="text-teal-400" size={18} />,
      route: '/home-inventory',
      badge: 'Assets',
      keywords: ['home inventory', 'inventory', 'appliances', 'assets', 'furniture', 'electronics', 'warranty', 'serial number', 'gadgets']
    },
    {
      id: 'mod-password-vault',
      type: 'module',
      title: 'Password Vault',
      subtitle: 'AES-256 encrypted master password safe for credentials & logins',
      icon: <Key className="text-yellow-400" size={18} />,
      route: '/password-vault',
      badge: 'Security',
      keywords: ['password vault', 'password', 'passwords', 'vault', 'credentials', 'keys', 'secrets', 'pins', 'logins', 'crypto']
    },
    {
      id: 'mod-family',
      type: 'module',
      title: 'Family Dashboard',
      subtitle: 'Family members, shared contacts, events & household records',
      icon: <Users className="text-pink-400" size={18} />,
      route: '/family',
      badge: 'Family',
      keywords: ['family', 'relatives', 'members', 'household', 'children', 'parents', 'tree', 'shared']
    },
    {
      id: 'mod-health',
      type: 'module',
      title: 'Health Records',
      subtitle: 'Vitals tracking, medical history, lab reports & allergies',
      icon: <HeartPulse className="text-red-400" size={18} />,
      route: '/health',
      badge: 'Health',
      keywords: ['health', 'vitals', 'blood test', 'lab', 'records', 'bp', 'sugar', 'allergies', 'reports', 'medical']
    },
    {
      id: 'mod-goals',
      type: 'module',
      title: 'Goal Tracker',
      subtitle: 'Personal milestones, savings targets & life ambitions',
      icon: <Target className="text-emerald-400" size={18} />,
      route: '/goals',
      badge: 'Growth',
      keywords: ['goals', 'goal', 'targets', 'milestones', 'ambition', 'achievements', 'savings goals', 'progress']
    },
    {
      id: 'mod-reports',
      type: 'module',
      title: 'Global Reports & Analytics',
      subtitle: 'Comprehensive financial, agricultural & lifestyle charts',
      icon: <BarChart className="text-violet-400" size={18} />,
      route: '/reports',
      badge: 'Analytics',
      keywords: ['reports', 'report', 'analytics', 'charts', 'summary', 'statistics', 'export', 'insights', 'trends']
    },
    {
      id: 'mod-settings',
      type: 'module',
      title: 'Settings & Preferences',
      subtitle: 'Profile customization, appearance, themes & security',
      icon: <Settings className="text-slate-400" size={18} />,
      route: '/settings',
      badge: 'Config',
      keywords: ['settings', 'preferences', 'profile', 'theme', 'dark mode', 'light mode', 'account', 'security']
    }
  ], []);

  // Quick Instant Actions
  const actions: SearchItem[] = useMemo(() => [
    {
      id: 'act-theme-toggle',
      type: 'action',
      title: currentTheme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode',
      subtitle: 'Toggle system theme / Torch light switch',
      icon: currentTheme === 'light' ? <Moon className="text-amber-400" size={18} /> : <Sun className="text-primary" size={18} />,
      badge: 'Instant',
      action: () => {
        if (onToggleTheme) onToggleTheme();
      },
      keywords: ['theme', 'dark mode', 'light mode', 'torch', 'switch theme', 'colors', 'night mode']
    },
    {
      id: 'act-add-expense',
      type: 'action',
      title: 'Add New Transaction / Expense',
      subtitle: 'Record an expense or income in Finance Tracker',
      icon: <PlusCircle className="text-emerald-400" size={18} />,
      route: '/finance',
      badge: 'Finance',
      keywords: ['add expense', 'new expense', 'add transaction', 'add money', 'record spending', 'income']
    },
    {
      id: 'act-add-task',
      type: 'action',
      title: 'Create New Task',
      subtitle: 'Add a new checklist or reminder item',
      icon: <CheckSquare className="text-purple-400" size={18} />,
      route: '/tasks',
      badge: 'Planner',
      keywords: ['new task', 'add task', 'create task', 'new todo', 'add reminder']
    },
    {
      id: 'act-add-medicine',
      type: 'action',
      title: 'Add Medicine Reminder',
      subtitle: 'Schedule a new tablet, dosage or prescription alarm',
      icon: <Pill className="text-rose-400" size={18} />,
      route: '/medicine',
      badge: 'Health',
      keywords: ['add medicine', 'new medicine', 'pill reminder', 'new prescription', 'dose reminder']
    },
    {
      id: 'act-add-vehicle',
      type: 'action',
      title: 'Add Vehicle Log',
      subtitle: 'Record fuel fill-up or vehicle maintenance log',
      icon: <Car className="text-amber-400" size={18} />,
      route: '/vehicles',
      badge: 'Vehicles',
      keywords: ['add vehicle', 'fuel log', 'vehicle service', 'car service', 'bike service']
    },
    {
      id: 'act-emergency-sos',
      type: 'action',
      title: 'Emergency SOS Contacts',
      subtitle: 'Access emergency numbers & medical contact directory',
      icon: <AlertTriangle className="text-red-500" size={18} />,
      route: '/emergency',
      badge: 'Emergency',
      keywords: ['sos', 'emergency contact', 'police', 'ambulance', 'hospital', 'doctor phone']
    },
    {
      id: 'act-open-vault',
      type: 'action',
      title: 'Unlock Password Vault',
      subtitle: 'Securely manage saved logins & encrypted keys',
      icon: <Key className="text-yellow-400" size={18} />,
      route: '/password-vault',
      badge: 'Security',
      keywords: ['unlock vault', 'passwords', 'saved credentials', 'keys']
    }
  ], [currentTheme, onToggleTheme]);

  // Domain-specific icon resolver
  const getDomainIcon = (domain: string) => {
    switch (domain) {
      case 'vehicles':
        return <Car className="text-amber-400 shrink-0" size={16} />;
      case 'finance':
        return <CreditCard className="text-emerald-400 shrink-0" size={16} />;
      case 'medicine':
        return <Pill className="text-rose-400 shrink-0" size={16} />;
      case 'tasks':
        return <CheckSquare className="text-purple-400 shrink-0" size={16} />;
      case 'bills':
        return <Receipt className="text-orange-400 shrink-0" size={16} />;
      case 'loans':
        return <Banknote className="text-yellow-400 shrink-0" size={16} />;
      case 'agriculture':
        return <Tractor className="text-emerald-500 shrink-0" size={16} />;
      case 'dairy':
        return <FileDigit className="text-blue-400 shrink-0" size={16} />;
      case 'documents':
        return <FileText className="text-cyan-400 shrink-0" size={16} />;
      case 'contacts':
        return <AlertTriangle className="text-red-400 shrink-0" size={16} />;
      case 'inventory':
        return <Box className="text-teal-400 shrink-0" size={16} />;
      case 'student':
        return <GraduationCap className="text-indigo-400 shrink-0" size={16} />;
      default:
        return <Database className="text-primary shrink-0" size={16} />;
    }
  };

  // Dynamic Cached User Data Querying
  const cachedRecords: SearchItem[] = useMemo(() => {
    if (!query || query.trim().length < 2) return [];
    try {
      const activeUid = getActiveUserId(user?.id || user?.uid);
      const records = queryCache.searchCachedData(query, activeUid);
      return records.map((rec) => ({
        id: `rec-${rec.id}`,
        type: 'record' as const,
        title: rec.title,
        subtitle: rec.subtitle,
        icon: getDomainIcon(rec.domain),
        route: rec.route,
        badge: rec.domain.toUpperCase()
      }));
    } catch {
      return [];
    }
  }, [query, user?.id, user?.uid, cacheVersion]);

  // Aggregate and filter results
  const filteredResults: SearchItem[] = useMemo(() => {
    const cleanQuery = query.toLowerCase().trim();
    const normQuery = cleanQuery.replace(/[^a-z0-9]/g, '');

    const matchesQuery = (item: SearchItem) => {
      if (!cleanQuery) return true;
      if (item.title.toLowerCase().includes(cleanQuery)) return true;
      if (item.subtitle.toLowerCase().includes(cleanQuery)) return true;
      if (item.badge?.toLowerCase().includes(cleanQuery)) return true;
      if (item.keywords?.some((k) => k.toLowerCase().includes(cleanQuery))) return true;

      // Normalized alphanumeric matching (e.g. spaces/punctuation differences)
      if (normQuery.length >= 2) {
        if (item.title.toLowerCase().replace(/[^a-z0-9]/g, '').includes(normQuery)) return true;
        if (item.keywords?.some((k) => k.toLowerCase().replace(/[^a-z0-9]/g, '').includes(normQuery))) return true;
      }
      return false;
    };

    let allItems: SearchItem[] = [];

    if (cleanQuery) {
      // Prioritize personal user records so plate numbers (e.g. "tn 87e 3902") appear first
      const matchedModules = modules.filter(matchesQuery);
      const matchedActions = actions.filter(matchesQuery);
      allItems = [...cachedRecords, ...matchedModules, ...matchedActions];
    } else {
      // Default view: Top most common modules & instant actions
      allItems = [
        ...actions.slice(0, 3),
        ...modules.slice(0, 9)
      ];
    }

    if (activeCategory === 'all') return allItems;
    return allItems.filter((i) => i.type === activeCategory);
  }, [query, activeCategory, modules, actions, cachedRecords]);

  // Keep selectedIndex within bounds
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredResults.length, activeCategory]);

  const handleSelectItem = (item: SearchItem) => {
    onClose();
    if (item.action) {
      item.action();
    } else if (item.route) {
      navigate(item.route);
    }
  };

  // Keyboard navigation inside command palette
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (filteredResults.length || 1));
      scrollActiveIntoView((selectedIndex + 1) % (filteredResults.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + (filteredResults.length || 1)) % (filteredResults.length || 1));
      scrollActiveIntoView((selectedIndex - 1 + (filteredResults.length || 1)) % (filteredResults.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredResults.length > 0 && selectedIndex < filteredResults.length) {
        handleSelectItem(filteredResults[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  const scrollActiveIntoView = (index: number) => {
    const list = listRef.current;
    if (!list) return;
    const elements = list.querySelectorAll<HTMLElement>('[data-search-item]');
    const activeEl = elements[index];
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  };

  // Quick chip suggestion click handler
  const handleChipClick = (suggestion: string) => {
    setQuery(suggestion);
    inputRef.current?.focus();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-start justify-center pt-8 sm:pt-[12vh] px-3 sm:px-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: -16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -16 }}
          transition={{ duration: 0.16, ease: 'easeOut' }}
          className="w-full max-w-2xl bg-surface/95 border border-glass shadow-neon-primary rounded-2xl overflow-hidden flex flex-col max-h-[85vh] backdrop-blur-xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Search Input Box */}
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-glass/60 bg-surfaceLight/20">
            <Search className="text-primary shrink-0 animate-pulse" size={20} />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search across all 19 modules, transactions, tasks, crops..."
              className="bg-transparent flex-1 outline-none text-base sm:text-lg text-textMain placeholder:text-textMuted/70 min-w-0"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="p-1 rounded-md text-textMuted hover:text-textMain hover:bg-surface transition-colors"
                title="Clear query"
              >
                <X size={16} />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="text-[11px] font-mono text-textMuted bg-surface px-2 py-1 rounded border border-glass hover:bg-surfaceLight transition-colors"
            >
              ESC
            </button>
          </div>

          {/* Category Filter Tabs */}
          <div className="flex items-center gap-1.5 px-4 py-2 border-b border-glass/40 bg-surface/40 overflow-x-auto custom-scrollbar shrink-0">
            {[
              { id: 'all', label: 'All Results' },
              { id: 'module', label: 'Modules (19)' },
              { id: 'action', label: 'Quick Actions' },
              { id: 'record', label: 'Your Records' }
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id as any)}
                className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all whitespace-nowrap ${
                  activeCategory === cat.id
                    ? 'bg-primary text-white shadow-neon-primary-sm'
                    : 'text-textMuted hover:text-textMain hover:bg-surface'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Quick Clickable Suggestions (Shown on empty query or helper) */}
          {!query && (
            <div className="px-4 py-2.5 bg-surface/30 border-b border-glass/30 shrink-0">
              <div className="flex items-center gap-1.5 text-[11px] text-textMuted font-medium mb-1.5">
                <Zap size={13} className="text-primary" />
                <span>Quick Shortcuts & Common Searches:</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: 'Finance & Expenses', q: 'finance', icon: <CreditCard size={12} className="text-emerald-400" /> },
                  { label: 'Medicine Dose', q: 'medicine', icon: <Pill size={12} className="text-rose-400" /> },
                  { label: 'Vehicle Service', q: 'vehicle', icon: <Car size={12} className="text-amber-400" /> },
                  { label: 'Farm Crops', q: 'crops', icon: <Tractor size={12} className="text-emerald-400" /> },
                  { label: 'Password Vault', q: 'vault', icon: <Key size={12} className="text-yellow-400" /> },
                  { label: 'Emergency SOS', q: 'emergency', icon: <AlertTriangle size={12} className="text-red-400" /> }
                ].map((sugg) => (
                  <button
                    key={sugg.q}
                    type="button"
                    onClick={() => handleChipClick(sugg.q)}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg bg-surface border border-glass hover:border-primary/40 text-textMuted hover:text-textMain transition-all active:scale-95"
                  >
                    {sugg.icon}
                    <span>{sugg.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Scrollable Results List */}
          <div
            ref={listRef}
            className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1 divide-y divide-glass/20"
          >
            {filteredResults.length > 0 ? (
              filteredResults.map((item, idx) => {
                const isSelected = idx === selectedIndex;
                return (
                  <div
                    key={item.id}
                    data-search-item
                    onClick={() => handleSelectItem(item)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`flex items-center justify-between gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-primary/15 border border-primary/30 text-textMain shadow-neon-primary-sm'
                        : 'hover:bg-surface/80 text-textMuted hover:text-textMain border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                          isSelected
                            ? 'bg-primary/20 text-primary border border-primary/40'
                            : 'bg-surface border border-glass text-textMuted'
                        }`}
                      >
                        {item.icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-textMain truncate leading-snug">
                            {item.title}
                          </p>
                          {item.badge && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface border border-glass text-textMuted shrink-0">
                              {item.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-textMuted truncate mt-0.5">
                          {item.subtitle}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isSelected ? (
                        <div className="flex items-center gap-1 text-xs text-primary font-medium bg-primary/10 px-2 py-1 rounded-md border border-primary/20">
                          <span>Select</span>
                          <CornerDownLeft size={12} />
                        </div>
                      ) : (
                        <ArrowRight size={14} className="text-textMuted/40 group-hover:text-textMuted" />
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-12 px-4 text-center">
                <Compass className="mx-auto text-textMuted/40 mb-3" size={36} />
                <p className="text-base font-semibold text-textMain">No matching results found</p>
                <p className="text-xs text-textMuted mt-1 max-w-sm mx-auto">
                  We couldn't find anything matching &quot;{query}&quot;. Try searching for finance, medicine, tasks, crops, or vehicles.
                </p>
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="mt-4 px-3.5 py-1.5 rounded-lg bg-surface border border-glass text-xs font-medium text-textMain hover:border-primary transition-colors"
                >
                  View All Modules
                </button>
              </div>
            )}
          </div>

          {/* Footer Guide / Keyboard navigation shortcuts */}
          <div className="px-4 py-2.5 bg-surfaceLight/30 border-t border-glass/40 flex items-center justify-between text-[11px] text-textMuted shrink-0">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-surface border border-glass text-[10px] font-mono">↑</kbd>
                <kbd className="px-1.5 py-0.5 rounded bg-surface border border-glass text-[10px] font-mono">↓</kbd>
                <span className="ml-0.5">to navigate</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-surface border border-glass text-[10px] font-mono">↵</kbd>
                <span className="ml-0.5">to select</span>
              </span>
              <span className="hidden sm:flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-surface border border-glass text-[10px] font-mono">ESC</kbd>
                <span className="ml-0.5">to close</span>
              </span>
            </div>
            <div className="text-[11px] text-textMuted/70 font-mono">
              Vynora Global Search
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
