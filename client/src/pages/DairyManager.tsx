import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Milk, FileDigit, Activity, Edit2, Trash2, IndianRupee, 
  Calendar, ShieldAlert, HeartPulse, Download, Search, CheckCircle, Clock, AlertTriangle
} from 'lucide-react';
import { useContextEngineStore } from '../store/useContextEngineStore';
import { calculateDairyYield, calculateDairyRevenue, calculateDairyExpenses } from '../utils/calculations';
import { formatIsoDate } from '../utils/dateUtils';
import { DairyService } from '../services/firestoreService';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { FileUpload } from '../components/common/FileUpload';
import { EmptyState } from '../components/common/EmptyState';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { exportToCSV } from '../utils/csvExport';
import { MobilePageHeader } from '../components/common/MobilePageHeader';

export default function DairyManager() {
  const { user } = useContextEngineStore();
  const userId = user?.id || 'guest';

  // Subsections / Tabs
  const [activeTab, setActiveTab] = useState<'cattle' | 'production' | 'feed' | 'vet' | 'breeding'>('cattle');

  // State collections
  const [cows, setCows] = useState<any[]>([]);
  const [farmLogs, setFarmLogs] = useState<any[]>([]);
  const [farmFeedLogs, setFarmFeedLogs] = useState<any[]>([]);
  const [vetRecords, setVetRecords] = useState<any[]>([]);
  const [breedingRecords, setBreedingRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBreed, setFilterBreed] = useState('ALL');

  // Modals
  const [showCowModal, setShowCowModal] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [showFeedModal, setShowFeedModal] = useState(false);
  const [showSellModal, setShowSellModal] = useState(false);
  const [showVetModal, setShowVetModal] = useState(false);
  const [showBreedingModal, setShowBreedingModal] = useState(false);

  // Active / Edit IDs
  const [activeCow, setActiveCow] = useState<any>(null);
  const [editCowId, setEditCowId] = useState<string | null>(null);
  const [editFarmLogId, setEditFarmLogId] = useState<string | null>(null);
  const [editFeedId, setEditFeedId] = useState<string | null>(null);
  const [editVetId, setEditVetId] = useState<string | null>(null);
  const [editBreedingId, setEditBreedingId] = useState<string | null>(null);

  // Confirm Delete Modal
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    type: 'cow' | 'log' | 'feed' | 'vet' | 'breeding';
    id: string;
    title: string;
  }>({ isOpen: false, type: 'cow', id: '', title: '' });

  // Form states
  const [cowData, setCowData] = useState({
    tagNumber: '',
    name: '',
    breed: 'Jersey',
    dailyFoodCost: '',
    purchasePrice: '',
    purchaseDate: '',
    dateOfBirth: '',
    lactationStatus: 'Lactating',
    imageUrl: ''
  });

  const [logData, setLogData] = useState({
    session: 'Morning',
    litersProduced: '',
    ratePerLiter: '40',
    date: new Date().toISOString().split('T')[0],
    fatPercentage: '4.2',
    buyer: 'Dairy Cooperative'
  });

  const [feedData, setFeedData] = useState({
    feedType: 'Concentrates',
    description: '',
    quantityKg: '',
    amount: '',
    date: new Date().toISOString().split('T')[0]
  });

  const [sellData, setSellData] = useState({
    salePrice: '',
    saleDate: new Date().toISOString().split('T')[0],
    buyerName: ''
  });

  const [vetData, setVetData] = useState({
    cowId: '',
    treatment: 'Foot & Mouth Vaccination',
    vetName: 'Dr. Sharma',
    cost: '',
    date: new Date().toISOString().split('T')[0],
    nextBoosterDate: '',
    notes: '',
    documentUrl: ''
  });

  const [breedingData, setBreedingData] = useState({
    cowId: '',
    inseminationDate: new Date().toISOString().split('T')[0],
    sireId: 'Bull Straw #A-402',
    pregnancyStatus: 'Inseminated',
    notes: ''
  });

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [cList, lList, fList, vList, bList] = await Promise.all([
        DairyService.getCows(userId),
        DairyService.getLogs(userId),
        DairyService.getFeed(userId),
        DairyService.getAllVetRecords(userId),
        DairyService.getAllBreedingRecords(userId)
      ]);
      setCows(cList);
      setFarmLogs(lList);
      setFarmFeedLogs(fList);
      setVetRecords(vList);
      setBreedingRecords(bList);
    } catch (e) {
      console.error('Error fetching dairy data from Firestore:', e);
    } finally {
      setLoading(false);
    }
  };

  // Cow CRUD
  const handleSaveCow = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...cowData,
        dailyFoodCost: Number(cowData.dailyFoodCost) || 0,
        purchasePrice: Number(cowData.purchasePrice) || 0
      };
      if (editCowId) {
        await DairyService.updateCow(editCowId, payload);
      } else {
        await DairyService.addCow(userId, payload);
      }
      setShowCowModal(false);
      setEditCowId(null);
      resetCowForm();
      fetchData();
    } catch (e) {
      console.error('Error saving cow:', e);
    }
  };

  const resetCowForm = () => {
    setCowData({
      tagNumber: '',
      name: '',
      breed: 'Jersey',
      dailyFoodCost: '',
      purchasePrice: '',
      purchaseDate: '',
      dateOfBirth: '',
      lactationStatus: 'Lactating',
      imageUrl: ''
    });
  };

  const handleEditCow = (cow: any) => {
    if (!cow) return;
    setCowData({
      tagNumber: cow.tagNumber || '',
      name: cow.name || '',
      breed: cow.breed || 'Jersey',
      dailyFoodCost: cow.dailyFoodCost?.toString() || '',
      purchasePrice: cow.purchasePrice?.toString() || '',
      purchaseDate: formatIsoDate(cow.purchaseDate),
      dateOfBirth: formatIsoDate(cow.dateOfBirth),
      lactationStatus: cow.lactationStatus || 'Lactating',
      imageUrl: cow.imageUrl || ''
    });
    setEditCowId(cow._id || cow.id);
    setShowCowModal(true);
  };

  const handleSellCow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCow) return;
    try {
      await DairyService.sellCow(activeCow._id || activeCow.id, sellData);
      setShowSellModal(false);
      setActiveCow(null);
      setSellData({ salePrice: '', saleDate: new Date().toISOString().split('T')[0], buyerName: '' });
      fetchData();
    } catch (e) {
      console.error('Error selling cow:', e);
    }
  };

  // Milk Production Log CRUD
  const handleSaveMilkLog = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...logData,
        litersProduced: Number(logData.litersProduced) || 0,
        ratePerLiter: Number(logData.ratePerLiter) || 0,
        fatPercentage: Number(logData.fatPercentage) || 0
      };
      if (editFarmLogId) {
        await DairyService.updateLog(editFarmLogId, payload);
      } else {
        await DairyService.addLog(userId, payload);
      }
      setShowLogModal(false);
      setEditFarmLogId(null);
      setLogData({
        session: 'Morning',
        litersProduced: '',
        ratePerLiter: '40',
        date: new Date().toISOString().split('T')[0],
        fatPercentage: '4.2',
        buyer: 'Dairy Cooperative'
      });
      fetchData();
    } catch (e) {
      console.error('Error saving milk log:', e);
    }
  };

  // Feed Log CRUD
  const handleSaveFeed = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editFeedId) {
        await DairyService.updateFeed(editFeedId, {
          ...feedData,
          amount: Number(feedData.amount) || 0,
          quantityKg: Number(feedData.quantityKg) || 0
        });
      } else {
        await DairyService.addFeed(userId, {
          ...feedData,
          amount: Number(feedData.amount) || 0,
          quantityKg: Number(feedData.quantityKg) || 0
        });
      }
      setShowFeedModal(false);
      setEditFeedId(null);
      setFeedData({
        feedType: 'Concentrates',
        description: '',
        quantityKg: '',
        amount: '',
        date: new Date().toISOString().split('T')[0]
      });
      fetchData();
    } catch (e) {
      console.error('Error saving feed expense:', e);
    }
  };

  const handleEditFeed = (feed: any) => {
    setEditFeedId(feed._id || feed.id);
    setFeedData({
      feedType: feed.feedType || 'Concentrates',
      description: feed.description || '',
      quantityKg: feed.quantityKg ? String(feed.quantityKg) : '',
      amount: feed.amount ? String(feed.amount) : '',
      date: feed.date ? new Date(feed.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
    });
    setShowFeedModal(true);
  };

  // Vet Record CRUD
  const handleSaveVetRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vetData.cowId) return;
    const selectedCow = cows.find(c => (c._id || c.id) === vetData.cowId);
    try {
      if (editVetId) {
        await DairyService.updateVetRecord(editVetId, {
          ...vetData,
          tagNumber: selectedCow?.tagNumber || 'Unknown',
          cost: Number(vetData.cost) || 0
        });
      } else {
        await DairyService.addVetRecord(vetData.cowId, {
          ...vetData,
          tagNumber: selectedCow?.tagNumber || 'Unknown',
          cost: Number(vetData.cost) || 0
        }, userId);
      }
      setShowVetModal(false);
      setEditVetId(null);
      setVetData({
        cowId: '',
        treatment: 'Foot & Mouth Vaccination',
        vetName: 'Dr. Sharma',
        cost: '',
        date: new Date().toISOString().split('T')[0],
        nextBoosterDate: '',
        notes: '',
        documentUrl: ''
      });
      fetchData();
    } catch (e) {
      console.error('Error saving vet record:', e);
    }
  };

  const handleEditVet = (vet: any) => {
    setEditVetId(vet._id || vet.id);
    setVetData({
      cowId: vet.cowId || (cows.length > 0 ? (cows[0]._id || cows[0].id) : ''),
      treatment: vet.treatment || '',
      vetName: vet.vetName || '',
      cost: vet.cost ? String(vet.cost) : '',
      date: vet.date ? new Date(vet.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      nextBoosterDate: vet.nextBoosterDate ? new Date(vet.nextBoosterDate).toISOString().split('T')[0] : '',
      notes: vet.notes || '',
      documentUrl: vet.documentUrl || ''
    });
    setShowVetModal(true);
  };

  // Breeding Record CRUD
  const handleSaveBreeding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!breedingData.cowId) return;
    const selectedCow = cows.find(c => (c._id || c.id) === breedingData.cowId);
    
    // Calculate expected calving date (+283 days gestation for bovine)
    const insemDate = new Date(breedingData.inseminationDate);
    const expectedCalving = new Date(insemDate.getTime() + 283 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    try {
      if (editBreedingId) {
        await DairyService.updateBreedingRecord(editBreedingId, {
          ...breedingData,
          tagNumber: selectedCow?.tagNumber || 'Unknown',
          expectedCalvingDate: expectedCalving
        });
      } else {
        await DairyService.addBreedingRecord(breedingData.cowId, {
          ...breedingData,
          tagNumber: selectedCow?.tagNumber || 'Unknown',
          expectedCalvingDate: expectedCalving
        }, userId);
      }
      setShowBreedingModal(false);
      setEditBreedingId(null);
      setBreedingData({
        cowId: '',
        inseminationDate: new Date().toISOString().split('T')[0],
        sireId: 'Bull Straw #A-402',
        pregnancyStatus: 'Inseminated',
        notes: ''
      });
      fetchData();
    } catch (e) {
      console.error('Error saving breeding record:', e);
    }
  };

  const handleEditBreeding = (br: any) => {
    setEditBreedingId(br._id || br.id);
    setBreedingData({
      cowId: br.cowId || (cows.length > 0 ? (cows[0]._id || cows[0].id) : ''),
      inseminationDate: br.inseminationDate ? new Date(br.inseminationDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      sireId: br.sireId || '',
      pregnancyStatus: br.pregnancyStatus || 'Inseminated',
      notes: br.notes || ''
    });
    setShowBreedingModal(true);
  };

  // Generic Deletion Executor
  const confirmDeleteAction = async () => {
    try {
      if (deleteModal.type === 'cow') {
        await DairyService.deleteCow(deleteModal.id);
      } else if (deleteModal.type === 'log') {
        await DairyService.deleteLog(deleteModal.id);
      } else if (deleteModal.type === 'feed') {
        await DairyService.deleteFeed(deleteModal.id);
      } else if (deleteModal.type === 'vet') {
        await DairyService.deleteVetRecord(deleteModal.id);
      } else if (deleteModal.type === 'breeding') {
        await DairyService.deleteBreedingRecord(deleteModal.id);
      }
      setDeleteModal({ isOpen: false, type: 'cow', id: '', title: '' });
      fetchData();
    } catch (e) {
      console.error('Error during deletion:', e);
    }
  };

  // Aggregated Financial Metrics
  const overallLiters = calculateDairyYield(farmLogs);
  const overallRevenue = calculateDairyRevenue(farmLogs);
  const overallFeedExpenses = calculateDairyExpenses(farmFeedLogs);
  const overallVetExpenses = vetRecords.reduce((sum, v) => sum + (Number(v.cost) || 0), 0);
  const overallNetProfit = overallRevenue - (overallFeedExpenses + overallVetExpenses);

  // Filtering Cattle
  const filteredCows = cows.filter(cow => {
    const matchesSearch = (cow.tagNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (cow.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (cow.breed || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesBreed = filterBreed === 'ALL' || cow.breed === filterBreed;
    return matchesSearch && matchesBreed;
  });

  // Export CSV
  const handleExportCSV = () => {
    if (activeTab === 'production') {
      const data = farmLogs.map(l => ({
        Date: new Date(l.date).toLocaleDateString(),
        Session: l.session,
        'Liters Produced': l.litersProduced,
        'Rate/L (₹)': l.ratePerLiter,
        'Fat %': l.fatPercentage || '',
        'Total Revenue (₹)': l.soldAmount,
        Buyer: l.buyer || 'Cooperative'
      }));
      exportToCSV(data, 'vynora_dairy_milk_production.csv');
    } else {
      const data = cows.map(c => ({
        'Tag Number': c.tagNumber,
        Name: c.name || '',
        Breed: c.breed,
        Status: c.status || 'active',
        'Lactation Status': c.lactationStatus || '',
        'Daily Food Cost (₹)': c.dailyFoodCost,
        'Purchase Price (₹)': c.purchasePrice || 0,
        'Purchase Date': c.purchaseDate || ''
      }));
      exportToCSV(data, 'vynora_dairy_cattle_registry.csv');
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading Dairy Management & Cattle Records..." />;
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Mobile Page Header with single-level back to Dashboard */}
      <MobilePageHeader
        title="Dairy Management"
        parentLabel="Dashboard"
        fallbackPath="/"
        icon={<Milk className="text-primary" size={24} />}
        subtitle="Cattle registry, daily milk yields, feed inventory, veterinary treatments, and breeding cycles."
        actions={
          <div className="flex items-center gap-1.5 flex-wrap">
            <button 
              type="button"
              onClick={handleExportCSV}
              className="bg-surface border border-glass px-3 py-2 rounded-xl text-textMuted hover:text-textMain flex items-center gap-1 text-xs transition-colors min-h-[44px]"
            >
              <Download size={14} /> <span className="hidden sm:inline">Export</span>
            </button>
            <button 
              type="button"
              onClick={() => { setEditFarmLogId(null); setShowLogModal(true); }} 
              className="bg-primary/20 text-primary border border-primary/30 px-3 py-2 rounded-xl flex items-center gap-1 hover:bg-primary/30 transition-colors text-xs font-semibold min-h-[44px]"
            >
              <FileDigit size={14} /> Log Milk
            </button>
            <button 
              type="button"
              onClick={() => { resetCowForm(); setEditCowId(null); setShowCowModal(true); }} 
              className="bg-primary text-background px-3.5 py-2 rounded-xl flex items-center gap-1.5 hover:bg-primary/90 transition-colors text-xs font-bold shadow-neon-primary-sm min-h-[44px] active:scale-95"
            >
              <Plus size={16} /> Add Cattle
            </button>
          </div>
        }
      />

      {/* KPI Stats Cards (Responsive grid) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="glass-panel p-3.5 sm:p-4 border-l-4 border-l-primary flex flex-col justify-between">
          <p className="text-[10px] sm:text-xs text-textMuted uppercase font-semibold">Milk Yield</p>
          <div className="mt-1 flex items-baseline justify-between">
            <h2 className="text-base sm:text-xl font-bold text-textMain">{overallLiters.toFixed(1)} <span className="text-[10px] text-textMuted">L</span></h2>
            <Milk className="text-primary/70" size={18} />
          </div>
        </div>

        <div className="glass-panel p-3.5 sm:p-4 border-l-4 border-l-green-500 flex flex-col justify-between">
          <p className="text-[10px] sm:text-xs text-textMuted uppercase font-semibold">Milk Revenue</p>
          <div className="mt-1 flex items-baseline justify-between">
            <h2 className="text-base sm:text-xl font-bold text-green-400">₹{overallRevenue.toLocaleString()}</h2>
            <IndianRupee className="text-green-500/70" size={18} />
          </div>
        </div>

        <div className="glass-panel p-3.5 sm:p-4 border-l-4 border-l-orange-500 flex flex-col justify-between">
          <p className="text-[10px] sm:text-xs text-textMuted uppercase font-semibold">Feed Expenses</p>
          <div className="mt-1 flex items-baseline justify-between">
            <h2 className="text-base sm:text-xl font-bold text-orange-400">₹{overallFeedExpenses.toLocaleString()}</h2>
            <Plus className="text-orange-500/70" size={18} />
          </div>
        </div>

        <div className="glass-panel p-3.5 sm:p-4 border-l-4 border-l-red-500 flex flex-col justify-between">
          <p className="text-[10px] sm:text-xs text-textMuted uppercase font-semibold">Vet Costs</p>
          <div className="mt-1 flex items-baseline justify-between">
            <h2 className="text-base sm:text-xl font-bold text-red-400">₹{overallVetExpenses.toLocaleString()}</h2>
            <HeartPulse className="text-red-500/70" size={18} />
          </div>
        </div>

        <div className="glass-panel p-3.5 sm:p-4 border-l-4 border-l-blue-500 flex flex-col justify-between col-span-2 sm:col-span-1">
          <p className="text-[10px] sm:text-xs text-textMuted uppercase font-semibold">Net Profit</p>
          <div className="mt-1 flex items-baseline justify-between">
            <h2 className={`text-base sm:text-xl font-bold ${overallNetProfit >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
              ₹{overallNetProfit.toLocaleString()}
            </h2>
            <Activity className="text-blue-500/70" size={18} />
          </div>
        </div>
      </div>

      {/* Navigation Subsections / Tabs */}
      <div className="flex border-b border-glass gap-2 overflow-x-auto pb-1 scrollbar-none">
        {[
          { key: 'cattle', label: `Cattle Registry (${cows.length})`, icon: Milk },
          { key: 'production', label: `Milk Yield & Sales (${farmLogs.length})`, icon: FileDigit },
          { key: 'feed', label: `Feed & Fodder (${farmFeedLogs.length})`, icon: Plus },
          { key: 'vet', label: `Veterinary & Health (${vetRecords.length})`, icon: HeartPulse },
          { key: 'breeding', label: `Breeding & Calving (${breedingRecords.length})`, icon: Activity }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-4 py-2.5 rounded-t-xl text-sm font-semibold flex items-center gap-2 transition-all whitespace-nowrap border-b-2 ${
                isActive 
                  ? 'border-primary text-primary bg-primary/10 shadow-neon-primary-sm' 
                  : 'border-transparent text-textMuted hover:text-textMain hover:bg-surface/50'
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab 1: Cattle Registry */}
      {activeTab === 'cattle' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-3 text-textMuted" size={16} />
              <input
                type="text"
                placeholder="Search tag, name, breed..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-surface border border-glass rounded-xl pl-9 pr-3 py-2 text-sm text-textMain focus:outline-none focus:border-primary"
              />
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <select
                value={filterBreed}
                onChange={e => setFilterBreed(e.target.value)}
                className="bg-surface border border-glass rounded-xl px-3 py-2 text-sm text-textMain focus:outline-none"
              >
                <option value="ALL">All Breeds</option>
                <option value="Jersey">Jersey</option>
                <option value="Holstein Friesian">Holstein Friesian</option>
                <option value="Gir">Gir</option>
                <option value="Sahiwal">Sahiwal</option>
                <option value="Murrah Buffalo">Murrah Buffalo</option>
              </select>
            </div>
          </div>

          {filteredCows.length === 0 ? (
            <EmptyState
              icon={Milk}
              title="No cattle registered yet"
              description="Register your dairy herd with tag numbers, breeds, milk status, and purchase details."
              actionText="Register First Cattle"
              onAction={() => { resetCowForm(); setShowCowModal(true); }}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCows.map(cow => {
                const isSold = cow.status === 'sold';
                const cowVetCosts = vetRecords
                  .filter(v => v.cowId === (cow._id || cow.id))
                  .reduce((sum, v) => sum + (Number(v.cost) || 0), 0);

                return (
                  <motion.div
                    key={cow._id || cow.id}
                    whileHover={{ y: -4 }}
                    className={`glass-panel p-5 flex flex-col justify-between border-t-4 ${
                      isSold ? 'border-t-gray-500 opacity-70' : 'border-t-primary'
                    }`}
                  >
                    <div>
                      {/* Top row */}
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3">
                          {cow.imageUrl ? (
                            <img 
                              src={cow.imageUrl} 
                              alt={cow.tagNumber} 
                              className="w-14 h-14 rounded-xl object-cover border border-glass shadow-md" 
                            />
                          ) : (
                            <div className="w-14 h-14 rounded-xl bg-surface border border-glass flex items-center justify-center text-primary">
                              <Milk size={26} />
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-lg font-bold text-textMain">#{cow.tagNumber}</h3>
                              {cow.name && <span className="text-xs text-textMuted font-medium">({cow.name})</span>}
                            </div>
                            <p className="text-xs text-textMuted">{cow.breed}</p>
                            <span className={`inline-block px-2 py-0.5 mt-1 rounded text-xs font-semibold ${
                              isSold 
                                ? 'bg-gray-500/20 text-gray-400' 
                                : cow.lactationStatus === 'Lactating' 
                                  ? 'bg-green-500/20 text-green-400' 
                                  : 'bg-yellow-500/20 text-yellow-400'
                            }`}>
                              {isSold ? 'Sold' : cow.lactationStatus || 'Active'}
                            </span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-1.5">
                          {!isSold && (
                            <button
                              onClick={() => { setActiveCow(cow); setShowSellModal(true); }}
                              className="p-1.5 rounded-lg text-textMuted hover:text-green-400 hover:bg-green-500/10 transition-colors"
                              title="Sell Cattle"
                            >
                              <IndianRupee size={16} />
                            </button>
                          )}
                          <button
                            onClick={() => handleEditCow(cow)}
                            className="p-1.5 rounded-lg text-textMuted hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                            title="Edit"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => setDeleteModal({
                              isOpen: true,
                              type: 'cow',
                              id: cow._id || cow.id,
                              title: `Cattle #${cow.tagNumber}`
                            })}
                            className="p-1.5 rounded-lg text-textMuted hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      {/* Details Box */}
                      <div className="bg-surface/50 p-3 rounded-xl border border-glass space-y-2 text-xs mb-4">
                        <div className="flex justify-between">
                          <span className="text-textMuted">Daily Feed Cost:</span>
                          <span className="font-semibold text-textMain">₹{cow.dailyFoodCost || 0} / day</span>
                        </div>
                        {cow.purchasePrice > 0 && (
                          <div className="flex justify-between">
                            <span className="text-textMuted">Purchased:</span>
                            <span className="font-semibold text-textMain">₹{cow.purchasePrice} ({cow.purchaseDate ? new Date(cow.purchaseDate).toLocaleDateString() : 'N/A'})</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-textMuted">Medical Expenses:</span>
                          <span className="font-semibold text-red-400">₹{cowVetCosts.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Quick Button */}
                    {!isSold ? (
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <button
                          onClick={() => {
                            setVetData(prev => ({ ...prev, cowId: cow._id || cow.id }));
                            setShowVetModal(true);
                          }}
                          className="py-1.5 px-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500/20 text-xs font-semibold flex items-center justify-center gap-1"
                        >
                          <HeartPulse size={14} /> Medical Log
                        </button>
                        <button
                          onClick={() => {
                            setBreedingData(prev => ({ ...prev, cowId: cow._id || cow.id }));
                            setShowBreedingModal(true);
                          }}
                          className="py-1.5 px-2 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg hover:bg-blue-500/20 text-xs font-semibold flex items-center justify-center gap-1"
                        >
                          <Activity size={14} /> Inseminate
                        </button>
                      </div>
                    ) : (
                      <div className="p-2 bg-gray-500/10 text-gray-400 text-center rounded-lg text-xs font-medium border border-gray-500/20">
                        Sold on {new Date(cow.saleDate).toLocaleDateString()} for ₹{cow.salePrice}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Daily Milk Production & Sales */}
      {activeTab === 'production' && (
        <div className="glass-panel p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-textMain flex items-center gap-2">
              <FileDigit className="text-primary" size={22} /> Milk Production & Sales History
            </h2>
            <button
              onClick={() => { setEditFarmLogId(null); setShowLogModal(true); }}
              className="bg-primary/20 text-primary border border-primary/30 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 hover:bg-primary/30 transition-colors"
            >
              <Plus size={14} /> Add Milk Entry
            </button>
          </div>

          {farmLogs.length === 0 ? (
            <EmptyState
              icon={FileDigit}
              title="No milk production logs yet"
              description="Record daily morning and evening yields to calculate dairy income and synchronize with Finance."
              actionText="Log Today's Milk"
              onAction={() => setShowLogModal(true)}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse whitespace-nowrap text-sm">
                <thead>
                  <tr className="text-textMuted text-xs uppercase tracking-wider border-b border-glass">
                    <th className="pb-3 px-4 font-semibold">Date</th>
                    <th className="pb-3 px-4 font-semibold">Session</th>
                    <th className="pb-3 px-4 font-semibold text-right">Liters</th>
                    <th className="pb-3 px-4 font-semibold text-right">Fat %</th>
                    <th className="pb-3 px-4 font-semibold text-right">Rate / L (₹)</th>
                    <th className="pb-3 px-4 font-semibold text-right">Total Revenue (₹)</th>
                    <th className="pb-3 px-4 font-semibold">Buyer / Destination</th>
                    <th className="pb-3 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {farmLogs.map(log => (
                    <tr key={log._id || log.id} className="border-b border-glass/40 hover:bg-surface/50 transition-colors">
                      <td className="py-3 px-4">{new Date(log.date).toLocaleDateString()}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                          log.session === 'Morning' ? 'bg-amber-500/20 text-amber-400' : 'bg-indigo-500/20 text-indigo-400'
                        }`}>
                          {log.session}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-medium">{log.litersProduced} L</td>
                      <td className="py-3 px-4 text-right text-textMuted">{log.fatPercentage ? `${log.fatPercentage}%` : '-'}</td>
                      <td className="py-3 px-4 text-right text-textMuted">₹{log.ratePerLiter}</td>
                      <td className="py-3 px-4 text-right font-bold text-green-400">₹{log.soldAmount?.toLocaleString()}</td>
                      <td className="py-3 px-4 text-textMuted text-xs">{log.buyer || 'Dairy Booth'}</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => {
                            setLogData({
                              session: log.session || 'Morning',
                              litersProduced: log.litersProduced?.toString() || '',
                              ratePerLiter: log.ratePerLiter?.toString() || '40',
                              date: formatIsoDate(log.date),
                              fatPercentage: log.fatPercentage?.toString() || '4.2',
                              buyer: log.buyer || 'Dairy Cooperative'
                            });
                            setEditFarmLogId(log._id || log.id);
                            setShowLogModal(true);
                          }}
                          className="text-textMuted hover:text-blue-400 transition-colors mr-3"
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => setDeleteModal({
                            isOpen: true,
                            type: 'log',
                            id: log._id || log.id,
                            title: `Milk Log (${log.session} - ${log.litersProduced}L)`
                          })}
                          className="text-textMuted hover:text-red-400 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Feed & Fodder */}
      {activeTab === 'feed' && (
        <div className="glass-panel p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-textMain flex items-center gap-2">
              <Plus className="text-orange-400" size={22} /> Feed & Fodder Expenses
            </h2>
            <button
              onClick={() => setShowFeedModal(true)}
              className="bg-orange-500/20 text-orange-400 border border-orange-500/30 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 hover:bg-orange-500/30 transition-colors"
            >
              <Plus size={14} /> Add Feed Purchase
            </button>
          </div>

          {farmFeedLogs.length === 0 ? (
            <EmptyState
              icon={Plus}
              title="No feed logs found"
              description="Track cattle feed expenses like dry fodder, silage, and mineral mixtures."
              actionText="Log First Feed Purchase"
              onAction={() => setShowFeedModal(true)}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse whitespace-nowrap text-sm">
                <thead>
                  <tr className="text-textMuted text-xs uppercase tracking-wider border-b border-glass">
                    <th className="pb-3 px-4 font-semibold">Date</th>
                    <th className="pb-3 px-4 font-semibold">Feed Type</th>
                    <th className="pb-3 px-4 font-semibold">Description</th>
                    <th className="pb-3 px-4 font-semibold text-right">Quantity</th>
                    <th className="pb-3 px-4 font-semibold text-right">Total Cost (₹)</th>
                    <th className="pb-3 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {farmFeedLogs.map(feed => (
                    <tr key={feed._id || feed.id} className="border-b border-glass/40 hover:bg-surface/50 transition-colors">
                      <td className="py-3 px-4">{new Date(feed.date).toLocaleDateString()}</td>
                      <td className="py-3 px-4 font-medium text-textMain">{feed.feedType || 'Feed'}</td>
                      <td className="py-3 px-4 text-textMuted">{feed.description}</td>
                      <td className="py-3 px-4 text-right text-textMuted">{feed.quantityKg ? `${feed.quantityKg} kg` : '-'}</td>
                      <td className="py-3 px-4 text-right font-bold text-orange-400">₹{feed.amount?.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEditFeed(feed)}
                            className="text-textMuted hover:text-orange-400 transition-colors"
                            title="Edit Feed Purchase"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => setDeleteModal({
                              isOpen: true,
                              type: 'feed',
                              id: feed._id || feed.id,
                              title: `Feed Log (${feed.description || feed.feedType})`
                            })}
                            className="text-textMuted hover:text-red-400 transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Veterinary & Health */}
      {activeTab === 'vet' && (
        <div className="glass-panel p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-textMain flex items-center gap-2">
              <HeartPulse className="text-red-400" size={22} /> Veterinary & Vaccination History
            </h2>
            <button
              onClick={() => {
                if (cows.length === 0) return alert('Please register a cattle first.');
                setVetData(prev => ({ ...prev, cowId: cows[0]._id || cows[0].id }));
                setShowVetModal(true);
              }}
              className="bg-red-500/20 text-red-400 border border-red-500/30 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 hover:bg-red-500/30 transition-colors"
            >
              <Plus size={14} /> Log Vet Treatment
            </button>
          </div>

          {vetRecords.length === 0 ? (
            <EmptyState
              icon={HeartPulse}
              title="No veterinary treatments recorded"
              description="Keep records of doctor visits, vaccinations, deworming, and treatment expenses."
              actionText="Add Health Treatment"
              onAction={() => {
                if (cows.length > 0) {
                  setVetData(prev => ({ ...prev, cowId: cows[0]._id || cows[0].id }));
                  setShowVetModal(true);
                }
              }}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse whitespace-nowrap text-sm">
                <thead>
                  <tr className="text-textMuted text-xs uppercase tracking-wider border-b border-glass">
                    <th className="pb-3 px-4 font-semibold">Date</th>
                    <th className="pb-3 px-4 font-semibold">Cattle Tag</th>
                    <th className="pb-3 px-4 font-semibold">Treatment / Vaccine</th>
                    <th className="pb-3 px-4 font-semibold">Doctor / Clinic</th>
                    <th className="pb-3 px-4 font-semibold text-right">Cost (₹)</th>
                    <th className="pb-3 px-4 font-semibold">Next Booster</th>
                    <th className="pb-3 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {vetRecords.map(vet => (
                    <tr key={vet._id || vet.id} className="border-b border-glass/40 hover:bg-surface/50 transition-colors">
                      <td className="py-3 px-4">{new Date(vet.date).toLocaleDateString()}</td>
                      <td className="py-3 px-4 font-bold text-primary">#{vet.tagNumber}</td>
                      <td className="py-3 px-4 font-medium text-textMain">{vet.treatment}</td>
                      <td className="py-3 px-4 text-textMuted">{vet.vetName || 'Veterinarian'}</td>
                      <td className="py-3 px-4 text-right font-bold text-red-400">₹{vet.cost?.toLocaleString()}</td>
                      <td className="py-3 px-4 text-xs">
                        {vet.nextBoosterDate ? (
                          <span className="flex items-center gap-1 text-yellow-400 font-medium">
                            <Clock size={12} /> {new Date(vet.nextBoosterDate).toLocaleDateString()}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEditVet(vet)}
                            className="text-textMuted hover:text-red-400 transition-colors"
                            title="Edit Vet Record"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => setDeleteModal({
                              isOpen: true,
                              type: 'vet',
                              id: vet._id || vet.id,
                              title: `Treatment for #${vet.tagNumber}`
                            })}
                            className="text-textMuted hover:text-red-400 transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 5: Breeding & Calving */}
      {activeTab === 'breeding' && (
        <div className="glass-panel p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-bold text-textMain flex items-center gap-2">
                <Activity className="text-blue-400" size={22} /> Breeding & Calving Lifecycle
              </h2>
              <p className="text-xs text-textMuted mt-1">
                Gestation period automatically computed at 283 days with calving countdowns.
              </p>
            </div>
            <button
              onClick={() => {
                if (cows.length === 0) return alert('Please register a cattle first.');
                setBreedingData(prev => ({ ...prev, cowId: cows[0]._id || cows[0].id }));
                setShowBreedingModal(true);
              }}
              className="bg-blue-500/20 text-blue-400 border border-blue-500/30 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 hover:bg-blue-500/30 transition-colors"
            >
              <Plus size={14} /> Log Insemination
            </button>
          </div>

          {breedingRecords.length === 0 ? (
            <EmptyState
              icon={Activity}
              title="No breeding records logged"
              description="Track artificial inseminations, pregnancy diagnosis, and expected delivery dates."
              actionText="Record Insemination"
              onAction={() => {
                if (cows.length > 0) {
                  setBreedingData(prev => ({ ...prev, cowId: cows[0]._id || cows[0].id }));
                  setShowBreedingModal(true);
                }
              }}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {breedingRecords.map(br => {
                const daysUntilCalving = Math.ceil(
                  (new Date(br.expectedCalvingDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                );

                return (
                  <div key={br._id || br.id} className="glass-panel p-5 border-l-4 border-l-blue-400 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="text-lg font-bold text-textMain">Cattle #{br.tagNumber}</h3>
                          <p className="text-xs text-textMuted">Sire: {br.sireId || 'Bull Straw'}</p>
                        </div>
                        <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                          {br.pregnancyStatus}
                        </span>
                      </div>

                      <div className="bg-surface/50 p-3 rounded-xl border border-glass space-y-2 text-xs mb-4">
                        <div className="flex justify-between">
                          <span className="text-textMuted">Insemination Date:</span>
                          <span className="font-semibold text-textMain">{new Date(br.inseminationDate).toLocaleDateString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-textMuted">Expected Calving Date:</span>
                          <span className="font-semibold text-textMain">{new Date(br.expectedCalvingDate).toLocaleDateString()}</span>
                        </div>
                        <div className="flex justify-between items-center pt-1 border-t border-glass">
                          <span className="text-textMuted">Days Remaining:</span>
                          <span className={`font-bold ${daysUntilCalving <= 15 ? 'text-amber-400' : 'text-blue-400'}`}>
                            {daysUntilCalving > 0 ? `${daysUntilCalving} Days` : 'Due / Calved'}
                          </span>
                        </div>
                      </div>

                      {br.notes && <p className="text-xs text-textMuted italic mb-3">"{br.notes}"</p>}
                    </div>

                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleEditBreeding(br)}
                        className="text-textMuted hover:text-blue-400 text-xs flex items-center gap-1 transition-colors"
                      >
                        <Edit2 size={14} /> Edit
                      </button>
                      <button
                        onClick={() => setDeleteModal({
                          isOpen: true,
                          type: 'breeding',
                          id: br._id || br.id,
                          title: `Breeding record for #${br.tagNumber}`
                        })}
                        className="text-textMuted hover:text-red-400 text-xs flex items-center gap-1 transition-colors"
                      >
                        <Trash2 size={14} /> Remove
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: Register / Edit Cattle */}
      <AnimatePresence>
        {showCowModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowCowModal(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="glass-panel p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <h2 className="text-xl font-bold mb-4 text-textMain">{editCowId ? 'Edit Cattle Details' : 'Register New Cattle'}</h2>
              <form onSubmit={handleSaveCow} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-textMuted mb-1 block">Tag Number *</label>
                    <input required type="text" placeholder="e.g. T-104" value={cowData.tagNumber} onChange={e => setCowData({ ...cowData, tagNumber: e.target.value })} className="w-full bg-background border border-glass rounded-lg px-3 py-2 text-sm text-textMain focus:outline-none focus:border-primary" />
                  </div>
                  <div>
                    <label className="text-xs text-textMuted mb-1 block">Nickname (Optional)</label>
                    <input type="text" placeholder="e.g. Ganga" value={cowData.name} onChange={e => setCowData({ ...cowData, name: e.target.value })} className="w-full bg-background border border-glass rounded-lg px-3 py-2 text-sm text-textMain focus:outline-none" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-textMuted mb-1 block">Breed</label>
                    <select value={cowData.breed} onChange={e => setCowData({ ...cowData, breed: e.target.value })} className="w-full bg-background border border-glass rounded-lg px-3 py-2 text-sm text-textMain">
                      <option value="Jersey">Jersey</option>
                      <option value="Holstein Friesian">Holstein Friesian</option>
                      <option value="Gir">Gir</option>
                      <option value="Sahiwal">Sahiwal</option>
                      <option value="Murrah Buffalo">Murrah Buffalo</option>
                      <option value="Crossbred">Crossbred</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-textMuted mb-1 block">Lactation Status</label>
                    <select value={cowData.lactationStatus} onChange={e => setCowData({ ...cowData, lactationStatus: e.target.value })} className="w-full bg-background border border-glass rounded-lg px-3 py-2 text-sm text-textMain">
                      <option value="Lactating">Lactating</option>
                      <option value="Dry">Dry</option>
                      <option value="Pregnant">Pregnant</option>
                      <option value="Heifer">Heifer</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-textMuted mb-1 block">Est. Daily Feed Cost (₹)</label>
                    <input type="number" placeholder="₹ per day" value={cowData.dailyFoodCost} onChange={e => setCowData({ ...cowData, dailyFoodCost: e.target.value })} className="w-full bg-background border border-glass rounded-lg px-3 py-2 text-sm text-textMain" />
                  </div>
                  <div>
                    <label className="text-xs text-textMuted mb-1 block">Date of Birth</label>
                    <input type="date" value={cowData.dateOfBirth} onChange={e => setCowData({ ...cowData, dateOfBirth: e.target.value })} className="w-full bg-background border border-glass rounded-lg px-3 py-2 text-sm text-textMain" />
                  </div>
                </div>

                {!editCowId && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-textMuted mb-1 block">Purchase Price (₹)</label>
                      <input type="number" placeholder="₹ cost" value={cowData.purchasePrice} onChange={e => setCowData({ ...cowData, purchasePrice: e.target.value })} className="w-full bg-background border border-glass rounded-lg px-3 py-2 text-sm text-textMain" />
                    </div>
                    <div>
                      <label className="text-xs text-textMuted mb-1 block">Purchase Date</label>
                      <input type="date" value={cowData.purchaseDate} onChange={e => setCowData({ ...cowData, purchaseDate: e.target.value })} className="w-full bg-background border border-glass rounded-lg px-3 py-2 text-sm text-textMain" />
                    </div>
                  </div>
                )}

                {/* Cloudinary Cow Photo Upload */}
                <FileUpload
                  label="Cattle Photograph (Optional)"
                  currentUrl={cowData.imageUrl}
                  onUploadSuccess={(url: string) => setCowData({ ...cowData, imageUrl: url })}
                  onRemove={() => setCowData({ ...cowData, imageUrl: '' })}
                />

                <div className="flex justify-end gap-3 mt-6 pt-3 border-t border-glass">
                  <button type="button" onClick={() => setShowCowModal(false)} className="px-4 py-2 text-sm text-textMuted hover:text-textMain">Cancel</button>
                  <button type="submit" className="px-5 py-2 bg-white text-black rounded-lg font-bold text-sm shadow-md hover:bg-gray-200 transition-colors">
                    {editCowId ? 'Update Cattle' : 'Register Cattle'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: Log Milk Yield & Sale */}
      <AnimatePresence>
        {showLogModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowLogModal(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="glass-panel p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
              <h2 className="text-xl font-bold mb-4 text-textMain">{editFarmLogId ? 'Edit Milk Production Log' : 'Log Daily Milk Yield & Sale'}</h2>
              <form onSubmit={handleSaveMilkLog} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-textMuted mb-1 block">Session *</label>
                    <select value={logData.session} onChange={e => setLogData({ ...logData, session: e.target.value })} className="w-full bg-background border border-glass rounded-lg px-3 py-2 text-sm text-textMain">
                      <option value="Morning">Morning</option>
                      <option value="Evening">Evening</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-textMuted mb-1 block">Date *</label>
                    <input required type="date" value={logData.date} onChange={e => setLogData({ ...logData, date: e.target.value })} className="w-full bg-background border border-glass rounded-lg px-3 py-2 text-sm text-textMain" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-textMuted mb-1 block">Liters Produced *</label>
                    <input required type="number" step="0.1" placeholder="e.g. 45.5" value={logData.litersProduced} onChange={e => setLogData({ ...logData, litersProduced: e.target.value })} className="w-full bg-background border border-glass rounded-lg px-3 py-2 text-sm text-textMain focus:outline-none focus:border-primary" />
                  </div>
                  <div>
                    <label className="text-xs text-textMuted mb-1 block">Rate / Liter (₹) *</label>
                    <input required type="number" step="0.5" placeholder="₹40" value={logData.ratePerLiter} onChange={e => setLogData({ ...logData, ratePerLiter: e.target.value })} className="w-full bg-background border border-glass rounded-lg px-3 py-2 text-sm text-textMain focus:outline-none focus:border-primary" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-textMuted mb-1 block">Fat Content %</label>
                    <input type="number" step="0.1" placeholder="4.2%" value={logData.fatPercentage} onChange={e => setLogData({ ...logData, fatPercentage: e.target.value })} className="w-full bg-background border border-glass rounded-lg px-3 py-2 text-sm text-textMain" />
                  </div>
                  <div>
                    <label className="text-xs text-textMuted mb-1 block">Buyer / Dairy Booth</label>
                    <input type="text" placeholder="Cooperative / Local" value={logData.buyer} onChange={e => setLogData({ ...logData, buyer: e.target.value })} className="w-full bg-background border border-glass rounded-lg px-3 py-2 text-sm text-textMain" />
                  </div>
                </div>

                <div className="bg-surface/50 p-3 rounded-xl border border-glass flex justify-between items-center text-sm">
                  <span className="text-textMuted">Estimated Total Revenue:</span>
                  <span className="font-bold text-lg text-green-400">
                    ₹{(Number(logData.litersProduced || 0) * Number(logData.ratePerLiter || 0)).toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-end gap-3 mt-6 pt-3 border-t border-glass">
                  <button type="button" onClick={() => setShowLogModal(false)} className="px-4 py-2 text-sm text-textMuted hover:text-textMain">Cancel</button>
                  <button type="submit" className="px-5 py-2 bg-primary text-background rounded-lg font-bold text-sm shadow-neon-primary-sm hover:opacity-90">
                    {editFarmLogId ? 'Update Log' : 'Save Milk Log'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 3: Log Feed Expense */}
      <AnimatePresence>
        {showFeedModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowFeedModal(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="glass-panel p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
              <h2 className="text-xl font-bold mb-4 text-textMain">{editFeedId ? 'Edit Feed & Fodder Purchase' : 'Log Feed & Fodder Expense'}</h2>
              <form onSubmit={handleSaveFeed} className="space-y-4">
                <div>
                  <label className="text-xs text-textMuted mb-1 block">Feed Type</label>
                  <select value={feedData.feedType} onChange={e => setFeedData({ ...feedData, feedType: e.target.value })} className="w-full bg-background border border-glass rounded-lg px-3 py-2 text-sm text-textMain">
                    <option value="Concentrates">Concentrates / Cattle Feed</option>
                    <option value="Green Fodder">Green Fodder / Grass</option>
                    <option value="Dry Fodder">Dry Fodder / Wheat Straw</option>
                    <option value="Silage">Corn Silage</option>
                    <option value="Mineral Mixture">Mineral Mixture & Salts</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-textMuted mb-1 block">Description *</label>
                  <input required type="text" placeholder="e.g. 5 bags Kapila cattle feed" value={feedData.description} onChange={e => setFeedData({ ...feedData, description: e.target.value })} className="w-full bg-background border border-glass rounded-lg px-3 py-2 text-sm text-textMain" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-textMuted mb-1 block">Quantity (kg/bags)</label>
                    <input type="number" placeholder="Quantity" value={feedData.quantityKg} onChange={e => setFeedData({ ...feedData, quantityKg: e.target.value })} className="w-full bg-background border border-glass rounded-lg px-3 py-2 text-sm text-textMain" />
                  </div>
                  <div>
                    <label className="text-xs text-textMuted mb-1 block">Total Cost (₹) *</label>
                    <input required type="number" placeholder="Cost in ₹" value={feedData.amount} onChange={e => setFeedData({ ...feedData, amount: e.target.value })} className="w-full bg-background border border-glass rounded-lg px-3 py-2 text-sm text-textMain" />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-textMuted mb-1 block">Purchase Date *</label>
                  <input required type="date" value={feedData.date} onChange={e => setFeedData({ ...feedData, date: e.target.value })} className="w-full bg-background border border-glass rounded-lg px-3 py-2 text-sm text-textMain" />
                </div>

                <div className="flex justify-end gap-3 mt-6 pt-3 border-t border-glass">
                  <button type="button" onClick={() => { setShowFeedModal(false); setEditFeedId(null); }} className="px-4 py-2 text-sm text-textMuted hover:text-textMain">Cancel</button>
                  <button type="submit" className="px-5 py-2 bg-orange-500 text-white rounded-lg font-bold text-sm shadow-md hover:bg-orange-600 transition-colors">
                    {editFeedId ? 'Update Feed Purchase' : 'Save Feed Purchase'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 4: Log Veterinary Treatment */}
      <AnimatePresence>
        {showVetModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowVetModal(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="glass-panel p-6 w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <h2 className="text-xl font-bold mb-4 text-textMain">{editVetId ? 'Edit Veterinary Treatment' : 'Log Veterinary / Medical Treatment'}</h2>
              <form onSubmit={handleSaveVetRecord} className="space-y-4">
                <div>
                  <label className="text-xs text-textMuted mb-1 block">Select Cattle *</label>
                  <select required value={vetData.cowId} onChange={e => setVetData({ ...vetData, cowId: e.target.value })} className="w-full bg-background border border-glass rounded-lg px-3 py-2 text-sm text-textMain">
                    <option value="">Select cattle...</option>
                    {cows.filter(c => c.status !== 'sold').map(c => (
                      <option key={c._id || c.id} value={c._id || c.id}>#{c.tagNumber} ({c.breed})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-textMuted mb-1 block">Treatment / Vaccine *</label>
                  <input required type="text" placeholder="e.g. Foot & Mouth Disease (FMD)" value={vetData.treatment} onChange={e => setVetData({ ...vetData, treatment: e.target.value })} className="w-full bg-background border border-glass rounded-lg px-3 py-2 text-sm text-textMain" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-textMuted mb-1 block">Doctor / Clinic</label>
                    <input type="text" placeholder="Dr. Name" value={vetData.vetName} onChange={e => setVetData({ ...vetData, vetName: e.target.value })} className="w-full bg-background border border-glass rounded-lg px-3 py-2 text-sm text-textMain" />
                  </div>
                  <div>
                    <label className="text-xs text-textMuted mb-1 block">Treatment Cost (₹)</label>
                    <input type="number" placeholder="Cost" value={vetData.cost} onChange={e => setVetData({ ...vetData, cost: e.target.value })} className="w-full bg-background border border-glass rounded-lg px-3 py-2 text-sm text-textMain" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-textMuted mb-1 block">Date of Treatment *</label>
                    <input required type="date" value={vetData.date} onChange={e => setVetData({ ...vetData, date: e.target.value })} className="w-full bg-background border border-glass rounded-lg px-3 py-2 text-sm text-textMain" />
                  </div>
                  <div>
                    <label className="text-xs text-textMuted mb-1 block">Next Booster Due</label>
                    <input type="date" value={vetData.nextBoosterDate} onChange={e => setVetData({ ...vetData, nextBoosterDate: e.target.value })} className="w-full bg-background border border-glass rounded-lg px-3 py-2 text-sm text-textMain" />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-textMuted mb-1 block">Clinical Notes & Prescriptions</label>
                  <textarea rows={2} placeholder="Medications, dosage..." value={vetData.notes} onChange={e => setVetData({ ...vetData, notes: e.target.value })} className="w-full bg-background border border-glass rounded-lg px-3 py-2 text-sm text-textMain" />
                </div>

                <FileUpload
                  label="Prescription / Health Certificate (Optional)"
                  currentUrl={vetData.documentUrl}
                  onUploadSuccess={(url: string) => setVetData({ ...vetData, documentUrl: url })}
                  onRemove={() => setVetData({ ...vetData, documentUrl: '' })}
                />

                <div className="flex justify-end gap-3 mt-6 pt-3 border-t border-glass">
                  <button type="button" onClick={() => { setShowVetModal(false); setEditVetId(null); }} className="px-4 py-2 text-sm text-textMuted hover:text-textMain">Cancel</button>
                  <button type="submit" className="px-5 py-2 bg-red-500 text-white rounded-lg font-bold text-sm shadow-md hover:bg-red-600 transition-colors">
                    {editVetId ? 'Update Treatment' : 'Save Treatment'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 5: Log Insemination / Breeding */}
      <AnimatePresence>
        {showBreedingModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowBreedingModal(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="glass-panel p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
              <h2 className="text-xl font-bold mb-4 text-textMain">{editBreedingId ? 'Edit Breeding Record' : 'Record Insemination / Breeding'}</h2>
              <form onSubmit={handleSaveBreeding} className="space-y-4">
                <div>
                  <label className="text-xs text-textMuted mb-1 block">Select Cattle *</label>
                  <select required value={breedingData.cowId} onChange={e => setBreedingData({ ...breedingData, cowId: e.target.value })} className="w-full bg-background border border-glass rounded-lg px-3 py-2 text-sm text-textMain">
                    <option value="">Select cattle...</option>
                    {cows.filter(c => c.status !== 'sold').map(c => (
                      <option key={c._id || c.id} value={c._id || c.id}>#{c.tagNumber} ({c.breed})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-textMuted mb-1 block">Insemination Date *</label>
                    <input required type="date" value={breedingData.inseminationDate} onChange={e => setBreedingData({ ...breedingData, inseminationDate: e.target.value })} className="w-full bg-background border border-glass rounded-lg px-3 py-2 text-sm text-textMain" />
                  </div>
                  <div>
                    <label className="text-xs text-textMuted mb-1 block">Bull / Semen Straw ID</label>
                    <input type="text" placeholder="e.g. Straw #A-402" value={breedingData.sireId} onChange={e => setBreedingData({ ...breedingData, sireId: e.target.value })} className="w-full bg-background border border-glass rounded-lg px-3 py-2 text-sm text-textMain" />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-textMuted mb-1 block">Pregnancy Status</label>
                  <select value={breedingData.pregnancyStatus} onChange={e => setBreedingData({ ...breedingData, pregnancyStatus: e.target.value })} className="w-full bg-background border border-glass rounded-lg px-3 py-2 text-sm text-textMain">
                    <option value="Inseminated">Inseminated (Pending Check)</option>
                    <option value="Confirmed Pregnant">Confirmed Pregnant</option>
                    <option value="Calved">Calved</option>
                    <option value="Open / Repeat">Open / Repeat Heat</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-textMuted mb-1 block">Notes (Optional)</label>
                  <input type="text" placeholder="Inseminator name, observations..." value={breedingData.notes} onChange={e => setBreedingData({ ...breedingData, notes: e.target.value })} className="w-full bg-background border border-glass rounded-lg px-3 py-2 text-sm text-textMain" />
                </div>

                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs text-blue-300">
                  Expected delivery date will be calculated automatically based on 283-day bovine gestation period.
                </div>

                <div className="flex justify-end gap-3 mt-6 pt-3 border-t border-glass">
                  <button type="button" onClick={() => { setShowBreedingModal(false); setEditBreedingId(null); }} className="px-4 py-2 text-sm text-textMuted hover:text-textMain">Cancel</button>
                  <button type="submit" className="px-5 py-2 bg-blue-500 text-white rounded-lg font-bold text-sm shadow-md hover:bg-blue-600 transition-colors">
                    {editBreedingId ? 'Update Breeding Record' : 'Save Breeding Record'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 6: Sell Cow */}
      <AnimatePresence>
        {showSellModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowSellModal(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="glass-panel p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
              <h2 className="text-xl font-bold mb-4 text-textMain">Sell Cattle #{activeCow?.tagNumber}</h2>
              <form onSubmit={handleSellCow} className="space-y-4">
                <div>
                  <label className="text-xs text-textMuted mb-1 block">Sale Price (₹) *</label>
                  <input required type="number" placeholder="Sale Amount" value={sellData.salePrice} onChange={e => setSellData({ ...sellData, salePrice: e.target.value })} className="w-full bg-background border border-glass rounded-lg px-3 py-2 text-sm text-textMain focus:outline-none focus:border-green-400" />
                </div>
                <div>
                  <label className="text-xs text-textMuted mb-1 block">Sale Date *</label>
                  <input required type="date" value={sellData.saleDate} onChange={e => setSellData({ ...sellData, saleDate: e.target.value })} className="w-full bg-background border border-glass rounded-lg px-3 py-2 text-sm text-textMain" />
                </div>
                <div>
                  <label className="text-xs text-textMuted mb-1 block">Buyer Details</label>
                  <input type="text" placeholder="Buyer name, contact..." value={sellData.buyerName} onChange={e => setSellData({ ...sellData, buyerName: e.target.value })} className="w-full bg-background border border-glass rounded-lg px-3 py-2 text-sm text-textMain" />
                </div>

                <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-xs text-green-300">
                  This sale will automatically register an income entry in Finance Tracker under the Dairy category.
                </div>

                <div className="flex justify-end gap-3 mt-6 pt-3 border-t border-glass">
                  <button type="button" onClick={() => setShowSellModal(false)} className="px-4 py-2 text-sm text-textMuted hover:text-textMain">Cancel</button>
                  <button type="submit" className="px-5 py-2 bg-green-500 text-white rounded-lg font-bold text-sm shadow-md hover:bg-green-600 transition-colors">
                    Confirm Sale
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title="Confirm Deletion"
        message={`Are you sure you want to permanently delete "${deleteModal.title}"? Any linked ledger transactions will be cleaned up.`}
        confirmText="Delete Record"
        isDestructive={true}
        onConfirm={confirmDeleteAction}
        onCancel={() => setDeleteModal({ isOpen: false, type: 'cow', id: '', title: '' })}
      />
    </div>
  );
}
