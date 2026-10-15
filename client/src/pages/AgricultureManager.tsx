import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Leaf, Sprout, TrendingUp, TrendingDown, Tractor, Droplet,
  Edit2, Trash2, Calendar, FileText, Download, CheckCircle2, MapPin
} from 'lucide-react';
import { useContextEngineStore } from '../store/useContextEngineStore';
import { calculateCropFinances } from '../utils/calculations';
import { formatIsoDate } from '../utils/dateUtils';
import { AgricultureService, getActiveUserId } from '../services/firestoreService';
import { exportToCSV } from '../utils/csvExport';
import { FileUpload } from '../components/common/FileUpload';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { EmptyState } from '../components/common/EmptyState';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { MobilePageHeader } from '../components/common/MobilePageHeader';

const SEASONS = ['Kharif (Monsoon)', 'Rabi (Winter)', 'Zaid (Summer)', 'Year-round'];
const CROP_STATUSES = ['Planned', 'Sown / Growing', 'Flowering / Fruiting', 'Ready to Harvest', 'Harvested'];
const SOIL_TYPES = ['Alluvial', 'Black Cotton Soil', 'Red Soil', 'Clay Loam', 'Sandy Loam'];
const IRRIGATION_TYPES = ['Drip Irrigation', 'Sprinkler System', 'Canal Water', 'Borewell / Tube Well', 'Rainfed'];

export default function AgricultureManager() {
  const { user } = useContextEngineStore();
  const activeUid = getActiveUserId(user?.id);

  const [activeTab, setActiveTab] = useState<'crops' | 'farms' | 'activities'>('crops');
  const [loading, setLoading] = useState(true);

  // Crops & Farms State
  const [crops, setCrops] = useState<any[]>([]);
  const [farms, setFarms] = useState<any[]>([]);
  const [selectedCrop, setSelectedCrop] = useState<any | null>(null);
  const [cropActivities, setCropActivities] = useState<any[]>([]);

  // Modals
  const [showCropModal, setShowCropModal] = useState(false);
  const [editCropId, setEditCropId] = useState<string | null>(null);
  const [cropFormData, setCropFormData] = useState({
    name: '',
    variety: '',
    farmId: '',
    season: 'Kharif (Monsoon)',
    areaAcres: '',
    plantingDate: new Date().toISOString().split('T')[0],
    harvestDate: '',
    seedCost: '',
    fertilizerCost: '',
    waterCost: '',
    labourCost: '',
    machineCost: '',
    otherCost: '',
    harvestQuantity: '',
    sellingPricePerUnit: '',
    unit: 'Quintals',
    buyerName: '',
    status: 'Sown / Growing',
    receiptUrl: ''
  });

  // Farm Modal
  const [showFarmModal, setShowFarmModal] = useState(false);
  const [farmFormData, setFarmFormData] = useState({
    name: '',
    surveyNumber: '',
    location: '',
    acreage: '',
    soilType: 'Black Cotton Soil',
    irrigationType: 'Drip Irrigation',
    soilTestReportUrl: ''
  });

  // Activity Modal
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [activityFormData, setActivityFormData] = useState({
    activityType: 'Fertilizing',
    date: new Date().toISOString().split('T')[0],
    cost: '',
    notes: ''
  });

  // Delete Confirm
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; type: 'crop' | 'farm' | 'activity' } | null>(null);

  useEffect(() => {
    fetchData();
  }, [user]);

  useEffect(() => {
    if (selectedCrop) {
      fetchActivities(selectedCrop._id);
    }
  }, [selectedCrop]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [cropList, farmList] = await Promise.all([
        AgricultureService.getCrops(activeUid),
        AgricultureService.getFarms(activeUid)
      ]);
      setCrops(cropList);
      setFarms(farmList);
      if (cropList.length > 0 && !selectedCrop) {
        setSelectedCrop(cropList[0]);
      }
    } catch (e) {
      console.error('Error fetching agri data:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchActivities = async (cropId: string) => {
    try {
      const acts = await AgricultureService.getCropActivities(cropId);
      setCropActivities(acts);
    } catch (e) {
      console.error('Error fetching activities:', e);
    }
  };

  // Save Crop
  const handleSaveCrop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cropFormData.name.trim()) return;

    try {
      const payload = {
        ...cropFormData,
        areaAcres: Number(cropFormData.areaAcres) || 0,
        seedCost: Number(cropFormData.seedCost) || 0,
        fertilizerCost: Number(cropFormData.fertilizerCost) || 0,
        waterCost: Number(cropFormData.waterCost) || 0,
        labourCost: Number(cropFormData.labourCost) || 0,
        machineCost: Number(cropFormData.machineCost) || 0,
        otherCost: Number(cropFormData.otherCost) || 0,
        harvestQuantity: Number(cropFormData.harvestQuantity) || 0,
        sellingPricePerUnit: Number(cropFormData.sellingPricePerUnit) || 0
      };

      if (editCropId) {
        await AgricultureService.updateCrop(editCropId, payload, activeUid);
      } else {
        await AgricultureService.addCrop(activeUid, payload);
      }

      setShowCropModal(false);
      setEditCropId(null);
      resetCropForm();
      fetchData();
    } catch (e) {
      console.error('Error saving crop:', e);
    }
  };

  const resetCropForm = () => {
    setCropFormData({
      name: '', variety: '', farmId: '', season: 'Kharif (Monsoon)', areaAcres: '',
      plantingDate: new Date().toISOString().split('T')[0], harvestDate: '',
      seedCost: '', fertilizerCost: '', waterCost: '', labourCost: '', machineCost: '', otherCost: '',
      harvestQuantity: '', sellingPricePerUnit: '', unit: 'Quintals', buyerName: '', status: 'Sown / Growing', receiptUrl: ''
    });
  };

  const handleEditCrop = (crop: any) => {
    if (!crop) return;
    setCropFormData({
      name: crop.name || '',
      variety: crop.variety || '',
      farmId: crop.farmId || '',
      season: crop.season || 'Kharif (Monsoon)',
      areaAcres: String(crop.areaAcres || ''),
      plantingDate: formatIsoDate(crop.plantingDate),
      harvestDate: formatIsoDate(crop.harvestDate),
      seedCost: String(crop.seedCost || ''),
      fertilizerCost: String(crop.fertilizerCost || ''),
      waterCost: String(crop.waterCost || ''),
      labourCost: String(crop.labourCost || ''),
      machineCost: String(crop.machineCost || ''),
      otherCost: String(crop.otherCost || ''),
      harvestQuantity: String(crop.harvestQuantity || ''),
      sellingPricePerUnit: String(crop.sellingPricePerUnit || ''),
      unit: crop.unit || 'Quintals',
      buyerName: crop.buyerName || '',
      status: crop.status || 'Sown / Growing',
      receiptUrl: crop.receiptUrl || ''
    });
    setEditCropId(crop._id || crop.id);
    setShowCropModal(true);
  };

  // Save Farm
  const handleSaveFarm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!farmFormData.name.trim()) return;

    try {
      await AgricultureService.addFarm(activeUid, {
        ...farmFormData,
        acreage: Number(farmFormData.acreage) || 0
      });
      setShowFarmModal(false);
      setFarmFormData({ name: '', surveyNumber: '', location: '', acreage: '', soilType: 'Black Cotton Soil', irrigationType: 'Drip Irrigation', soilTestReportUrl: '' });
      fetchData();
    } catch (e) {
      console.error('Error saving farm:', e);
    }
  };

  // Save Activity
  const handleSaveActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCrop) return;

    try {
      await AgricultureService.addCropActivity(selectedCrop._id, {
        ...activityFormData,
        cost: Number(activityFormData.cost) || 0
      }, activeUid);
      setShowActivityModal(false);
      setActivityFormData({ activityType: 'Fertilizing', date: new Date().toISOString().split('T')[0], cost: '', notes: '' });
      fetchActivities(selectedCrop._id);
      fetchData();
    } catch (e) {
      console.error('Error saving activity:', e);
    }
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === 'crop') {
        await AgricultureService.deleteCrop(deleteTarget.id);
        if (selectedCrop?._id === deleteTarget.id) setSelectedCrop(null);
        fetchData();
      } else if (deleteTarget.type === 'farm') {
        await AgricultureService.deleteFarm(deleteTarget.id);
        fetchData();
      } else if (deleteTarget.type === 'activity') {
        await AgricultureService.deleteCropActivity(deleteTarget.id);
        if (selectedCrop) fetchActivities(selectedCrop._id);
      }
      setDeleteTarget(null);
    } catch (e) {
      console.error('Delete error:', e);
    }
  };

  // Overall Financial Aggregates
  const totalSeasonCost = crops.reduce((acc, c) => acc + calculateCropFinances(c).totalCost, 0);
  const totalSeasonRevenue = crops.reduce((acc, c) => acc + calculateCropFinances(c).totalRevenue, 0);
  const totalNetProfit = totalSeasonRevenue - totalSeasonCost;
  const totalAcreage = crops.reduce((acc, c) => acc + (Number(c.areaAcres) || 0), 0);

  return (
    <div className="space-y-6 pb-12">
      {/* Mobile Page Header with single-level back to Dashboard */}
      <MobilePageHeader
        title="Agriculture Manager"
        parentLabel="Dashboard"
        fallbackPath="/"
        icon={<Tractor className="text-green-400" size={24} />}
        subtitle="Farm parcels, crop cycles, input costs, harvest yields, and profit margins."
        actions={
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => exportToCSV(crops, 'Vynora_Crop_Cycles')}
              className="px-3 py-2 rounded-xl border border-glass bg-surface hover:bg-surfaceLight text-textMain text-xs font-medium flex items-center gap-1.5 min-h-[44px]"
            >
              <Download size={14} /> <span className="hidden sm:inline">Export</span>
            </button>
            <button
              type="button"
              onClick={() => setShowFarmModal(true)}
              className="px-3 py-2 rounded-xl border border-green-500/30 bg-green-500/10 text-green-400 text-xs font-semibold flex items-center gap-1.5 hover:bg-green-500/20 min-h-[44px]"
            >
              <MapPin size={14} /> Add Parcel
            </button>
            <button
              type="button"
              onClick={() => { setEditCropId(null); resetCropForm(); setShowCropModal(true); }}
              className="bg-green-500 text-background px-3.5 py-2 rounded-xl flex items-center gap-1.5 hover:bg-green-400 font-bold text-xs shadow-neon-primary-sm min-h-[44px] active:scale-95"
            >
              <Plus size={16} /> New Crop
            </button>
          </div>
        }
      />

      {/* KPI Row (Responsive grid) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="glass-panel p-3.5 sm:p-5 border-t-2 sm:border-t-4 border-t-green-400">
          <span className="text-[10px] sm:text-xs text-textMuted font-medium uppercase">Revenue</span>
          <div className="text-base sm:text-2xl font-bold text-green-400 mt-0.5">₹{totalSeasonRevenue.toLocaleString('en-IN')}</div>
          <p className="text-[10px] text-textMuted mt-0.5">Harvest sales</p>
        </div>

        <div className="glass-panel p-3.5 sm:p-5 border-t-2 sm:border-t-4 border-t-red-400">
          <span className="text-[10px] sm:text-xs text-textMuted font-medium uppercase">Investment</span>
          <div className="text-base sm:text-2xl font-bold text-red-400 mt-0.5">₹{totalSeasonCost.toLocaleString('en-IN')}</div>
          <p className="text-[10px] text-textMuted mt-0.5">Input costs</p>
        </div>

        <div className="glass-panel p-3.5 sm:p-5 border-t-2 sm:border-t-4 border-t-primary">
          <span className="text-[10px] sm:text-xs text-textMuted font-medium uppercase">Net Profit</span>
          <div className={`text-base sm:text-2xl font-bold mt-0.5 ${totalNetProfit >= 0 ? 'text-primary' : 'text-red-400'}`}>
            ₹{totalNetProfit.toLocaleString('en-IN')}
          </div>
          <p className="text-[10px] text-textMuted mt-0.5">Farm balance</p>
        </div>

        <div className="glass-panel p-3.5 sm:p-5 border-t-2 sm:border-t-4 border-t-yellow-400">
          <span className="text-[10px] sm:text-xs text-textMuted font-medium uppercase">Active Area</span>
          <div className="text-base sm:text-2xl font-bold text-yellow-400 mt-0.5">{totalAcreage.toFixed(1)} Acres</div>
          <p className="text-[10px] text-textMuted mt-0.5">{crops.length} active crop cycles</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-glass pb-1">
        <button
          onClick={() => setActiveTab('crops')}
          className={`px-4 py-2 font-medium text-sm rounded-t-xl transition-colors ${
            activeTab === 'crops' ? 'bg-surface text-green-400 border-t-2 border-green-400' : 'text-textMuted hover:text-textMain'
          }`}
        >
          Crop Cycles ({crops.length})
        </button>
        <button
          onClick={() => setActiveTab('farms')}
          className={`px-4 py-2 font-medium text-sm rounded-t-xl transition-colors ${
            activeTab === 'farms' ? 'bg-surface text-primary border-t-2 border-primary' : 'text-textMuted hover:text-textMain'
          }`}
        >
          Farms & Land Parcels ({farms.length})
        </button>
        <button
          onClick={() => setActiveTab('activities')}
          className={`px-4 py-2 font-medium text-sm rounded-t-xl transition-colors ${
            activeTab === 'activities' ? 'bg-surface text-yellow-400 border-t-2 border-yellow-400' : 'text-textMuted hover:text-textMain'
          }`}
        >
          Field Activity Logs {selectedCrop ? `(${selectedCrop.name})` : ''}
        </button>
      </div>

      {/* TAB 1: CROPS */}
      {activeTab === 'crops' && (
        <div className="space-y-6">
          {loading ? (
            <LoadingSpinner />
          ) : crops.length === 0 ? (
            <EmptyState
              icon={Sprout}
              title="No crop cycles active"
              description="Plan your next harvest cycle, seed inputs, water charges, and expected sales revenues."
              actionText="Create Crop Cycle"
              onAction={() => setShowCropModal(true)}
            />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {crops.map((crop: any) => {
                const { totalCost, totalRevenue, profit } = calculateCropFinances(crop);
                const isProfitable = profit >= 0;

                return (
                  <motion.div
                    key={crop._id}
                    whileHover={{ y: -4 }}
                    className="glass-panel p-6 border-t-4 border-t-green-400 flex flex-col justify-between hover:shadow-neon-primary-sm transition-all"
                  >
                    <div>
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="p-3 bg-surface border border-glass rounded-xl text-green-400">
                            <Leaf size={24} />
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-textMain">{crop.name}</h3>
                            <p className="text-xs text-textMuted">{crop.variety ? `${crop.variety} • ` : ''}{crop.season}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs px-2.5 py-1 rounded-full bg-surface border border-glass font-medium text-primary">
                            {crop.status || 'Growing'}
                          </span>
                          <button onClick={() => handleEditCrop(crop)} className="p-1.5 text-textMuted hover:text-primary">
                            <Edit2 size={16} />
                          </button>
                          <button onClick={() => setDeleteTarget({ id: crop._id, type: 'crop' })} className="p-1.5 text-textMuted hover:text-red-400">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      {/* Financial Metrics */}
                      <div className="grid grid-cols-3 gap-3 bg-surface/50 p-4 rounded-xl border border-glass mb-4">
                        <div>
                          <p className="text-[11px] text-textMuted mb-1">Total Cost</p>
                          <p className="text-base font-bold text-red-400">₹{totalCost.toLocaleString('en-IN')}</p>
                        </div>
                        <div>
                          <p className="text-[11px] text-textMuted mb-1">Harvest Revenue</p>
                          <p className="text-base font-bold text-green-400">₹{totalRevenue.toLocaleString('en-IN')}</p>
                        </div>
                        <div>
                          <p className="text-[11px] text-textMuted mb-1">Net Margin</p>
                          <p className={`text-base font-bold ${isProfitable ? 'text-primary' : 'text-red-400'}`}>
                            {isProfitable ? '+' : ''}₹{profit.toLocaleString('en-IN')}
                          </p>
                        </div>
                      </div>

                      {/* Cost Breakdown */}
                      <div className="space-y-1.5 text-xs text-textMuted border-t border-glass pt-3">
                        <div className="flex justify-between">
                          <span>Area Sown:</span>
                          <span className="text-textMain font-medium">{crop.areaAcres || '0'} Acres</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Seeds & Fertilizer:</span>
                          <span className="text-textMain font-medium">₹{(Number(crop.seedCost || 0) + Number(crop.fertilizerCost || 0)).toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Labor & Machinery:</span>
                          <span className="text-textMain font-medium">₹{(Number(crop.labourCost || 0) + Number(crop.machineCost || 0)).toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Harvest Output:</span>
                          <span className="text-textMain font-medium">{crop.harvestQuantity || 0} {crop.unit || 'Quintals'} @ ₹{crop.sellingPricePerUnit || 0}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 mt-4 border-t border-glass flex items-center justify-between text-xs">
                      <button
                        onClick={() => { setSelectedCrop(crop); setActiveTab('activities'); }}
                        className="text-primary hover:underline font-medium"
                      >
                        View Field Activity Logs →
                      </button>
                      {crop.receiptUrl && (
                        <a href={crop.receiptUrl} target="_blank" rel="noreferrer" className="text-textMuted hover:text-textMain">
                          Invoice / Doc ↗
                        </a>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: FARMS & LAND PARCELS */}
      {activeTab === 'farms' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-textMain">Farms & Land Parcels</h3>
            <button
              onClick={() => setShowFarmModal(true)}
              className="bg-primary text-background px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 hover:bg-primary/90 shadow-neon-primary-sm"
            >
              <Plus size={16} /> Add Farm Parcel
            </button>
          </div>

          {farms.length === 0 ? (
            <EmptyState
              icon={MapPin}
              title="No land parcels registered"
              description="Register your agricultural parcels, survey numbers, soil types, and drip/canal water sources."
              actionText="Register Land Parcel"
              onAction={() => setShowFarmModal(true)}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {farms.map((f: any) => (
                <div key={f._id} className="glass-panel p-6 border-l-4 border-l-primary flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-bold text-lg text-textMain">{f.name}</h4>
                        <p className="text-xs text-textMuted">{f.location || 'Rural Parcel'}</p>
                      </div>
                      <button onClick={() => setDeleteTarget({ id: f._id, type: 'farm' })} className="text-textMuted hover:text-red-400">
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className="space-y-2 text-xs divide-y divide-glass pt-2">
                      <div className="flex justify-between pt-1.5">
                        <span className="text-textMuted">Survey / Khasra #:</span>
                        <span className="font-mono text-textMain font-bold">{f.surveyNumber || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between pt-1.5">
                        <span className="text-textMuted">Total Acreage:</span>
                        <span className="text-primary font-bold">{f.acreage} Acres</span>
                      </div>
                      <div className="flex justify-between pt-1.5">
                        <span className="text-textMuted">Soil Profile:</span>
                        <span className="text-textMain">{f.soilType}</span>
                      </div>
                      <div className="flex justify-between pt-1.5">
                        <span className="text-textMuted">Irrigation:</span>
                        <span className="text-textMain">{f.irrigationType}</span>
                      </div>
                    </div>
                  </div>

                  {f.soilTestReportUrl && (
                    <div className="pt-3 mt-4 border-t border-glass text-xs">
                      <a href={f.soilTestReportUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline font-medium">
                        Soil Test Report ↗
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ACTIVITIES */}
      {activeTab === 'activities' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-textMain">Field Activity Logs</h3>
              <p className="text-xs text-textMuted">Tracking operational events for: <strong className="text-green-400">{selectedCrop?.name || 'Select a Crop'}</strong></p>
            </div>
            {selectedCrop && (
              <button
                onClick={() => setShowActivityModal(true)}
                className="bg-yellow-400 text-black px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 hover:bg-yellow-300 shadow-[0_0_15px_rgba(250,204,21,0.4)]"
              >
                <Plus size={16} /> Log Field Activity
              </button>
            )}
          </div>

          {!selectedCrop ? (
            <p className="text-sm text-textMuted">Please select a crop from the Crop Cycles tab to view activity logs.</p>
          ) : cropActivities.length === 0 ? (
            <EmptyState
              icon={Tractor}
              title="No activities recorded"
              description="Log sowing dates, spraying, weeding, fertilizer top-ups, and field laborer hours."
              actionText="Log First Activity"
              onAction={() => setShowActivityModal(true)}
            />
          ) : (
            <div className="glass-panel overflow-hidden border border-glass">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-glass bg-surface/50 text-xs text-textMuted uppercase">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Activity</th>
                    <th className="py-3 px-4">Notes & Observations</th>
                    <th className="py-3 px-4 text-right">Cost</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-glass">
                  {cropActivities.map((act: any) => (
                    <tr key={act._id} className="hover:bg-surface/30">
                      <td className="py-3 px-4 text-xs text-textMuted">{new Date(act.date).toLocaleDateString()}</td>
                      <td className="py-3 px-4 font-semibold text-textMain">{act.activityType}</td>
                      <td className="py-3 px-4 text-textMuted">{act.notes || '—'}</td>
                      <td className="py-3 px-4 text-right font-bold text-red-400">
                        {act.cost > 0 ? `₹${Number(act.cost).toLocaleString('en-IN')}` : '—'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button onClick={() => setDeleteTarget({ id: act._id, type: 'activity' })} className="text-textMuted hover:text-red-400">
                          <Trash2 size={15} />
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

      {/* CROP MODAL */}
      <AnimatePresence>
        {showCropModal && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowCropModal(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-panel max-w-2xl w-full p-6 border border-glass shadow-neon-primary-sm max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <h2 className="text-xl font-bold text-textMain mb-4">
                {editCropId ? 'Edit Crop Cycle' : 'Plan New Crop Cycle'}
              </h2>
              <form onSubmit={handleSaveCrop} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-textMuted mb-1">Crop Name *</label>
                    <input
                      type="text"
                      required
                      value={cropFormData.name}
                      onChange={(e) => setCropFormData({ ...cropFormData, name: e.target.value })}
                      placeholder="e.g. Wheat, Cotton, Sugarcane, Tomato"
                      className="w-full bg-surface border border-glass rounded-xl px-4 py-2 text-sm text-textMain"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-textMuted mb-1">Variety / Hybrid</label>
                    <input
                      type="text"
                      value={cropFormData.variety}
                      onChange={(e) => setCropFormData({ ...cropFormData, variety: e.target.value })}
                      placeholder="e.g. Sharbati, BT-Cotton, Hybrid 402"
                      className="w-full bg-surface border border-glass rounded-xl px-4 py-2 text-sm text-textMain"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-textMuted mb-1">Season</label>
                    <select
                      value={cropFormData.season}
                      onChange={(e) => setCropFormData({ ...cropFormData, season: e.target.value })}
                      className="w-full bg-surface border border-glass rounded-xl px-3 py-2 text-sm text-textMain"
                    >
                      {SEASONS.map(s => <option key={s} value={s} className="bg-surface">{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-textMuted mb-1">Area Sown (Acres)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={cropFormData.areaAcres}
                      onChange={(e) => setCropFormData({ ...cropFormData, areaAcres: e.target.value })}
                      placeholder="e.g. 5"
                      className="w-full bg-surface border border-glass rounded-xl px-3 py-2 text-sm text-textMain"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-textMuted mb-1">Cycle Status</label>
                    <select
                      value={cropFormData.status}
                      onChange={(e) => setCropFormData({ ...cropFormData, status: e.target.value })}
                      className="w-full bg-surface border border-glass rounded-xl px-3 py-2 text-sm text-textMain"
                    >
                      {CROP_STATUSES.map(s => <option key={s} value={s} className="bg-surface">{s}</option>)}
                    </select>
                  </div>
                </div>

                {/* Input Costs */}
                <div className="p-4 rounded-xl bg-surface/50 border border-glass space-y-3">
                  <h4 className="text-xs font-bold text-textMain uppercase tracking-wider">Input Costs (₹)</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] text-textMuted mb-1">Seed Cost</label>
                      <input
                        type="number"
                        value={cropFormData.seedCost}
                        onChange={(e) => setCropFormData({ ...cropFormData, seedCost: e.target.value })}
                        placeholder="0"
                        className="w-full bg-surface border border-glass rounded-lg px-3 py-1.5 text-xs text-textMain font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-textMuted mb-1">Fertilizer & Manure</label>
                      <input
                        type="number"
                        value={cropFormData.fertilizerCost}
                        onChange={(e) => setCropFormData({ ...cropFormData, fertilizerCost: e.target.value })}
                        placeholder="0"
                        className="w-full bg-surface border border-glass rounded-lg px-3 py-1.5 text-xs text-textMain font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-textMuted mb-1">Irrigation / Water</label>
                      <input
                        type="number"
                        value={cropFormData.waterCost}
                        onChange={(e) => setCropFormData({ ...cropFormData, waterCost: e.target.value })}
                        placeholder="0"
                        className="w-full bg-surface border border-glass rounded-lg px-3 py-1.5 text-xs text-textMain font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-textMuted mb-1">Labor / Wages</label>
                      <input
                        type="number"
                        value={cropFormData.labourCost}
                        onChange={(e) => setCropFormData({ ...cropFormData, labourCost: e.target.value })}
                        placeholder="0"
                        className="w-full bg-surface border border-glass rounded-lg px-3 py-1.5 text-xs text-textMain font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-textMuted mb-1">Machinery / Tractor</label>
                      <input
                        type="number"
                        value={cropFormData.machineCost}
                        onChange={(e) => setCropFormData({ ...cropFormData, machineCost: e.target.value })}
                        placeholder="0"
                        className="w-full bg-surface border border-glass rounded-lg px-3 py-1.5 text-xs text-textMain font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-textMuted mb-1">Other Chemical / Inputs</label>
                      <input
                        type="number"
                        value={cropFormData.otherCost}
                        onChange={(e) => setCropFormData({ ...cropFormData, otherCost: e.target.value })}
                        placeholder="0"
                        className="w-full bg-surface border border-glass rounded-lg px-3 py-1.5 text-xs text-textMain font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Harvest Sales */}
                <div className="p-4 rounded-xl bg-surface/50 border border-glass space-y-3">
                  <h4 className="text-xs font-bold text-textMain uppercase tracking-wider">Harvest Yield & Sales (₹)</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] text-textMuted mb-1">Harvest Quantity</label>
                      <input
                        type="number"
                        step="0.01"
                        value={cropFormData.harvestQuantity}
                        onChange={(e) => setCropFormData({ ...cropFormData, harvestQuantity: e.target.value })}
                        placeholder="e.g. 50"
                        className="w-full bg-surface border border-glass rounded-lg px-3 py-1.5 text-xs text-textMain font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-textMuted mb-1">Price / Unit (₹)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={cropFormData.sellingPricePerUnit}
                        onChange={(e) => setCropFormData({ ...cropFormData, sellingPricePerUnit: e.target.value })}
                        placeholder="e.g. 2400"
                        className="w-full bg-surface border border-glass rounded-lg px-3 py-1.5 text-xs text-textMain font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-textMuted mb-1">Unit Measure</label>
                      <input
                        type="text"
                        value={cropFormData.unit}
                        onChange={(e) => setCropFormData({ ...cropFormData, unit: e.target.value })}
                        placeholder="Quintals / Bags / Kg"
                        className="w-full bg-surface border border-glass rounded-lg px-3 py-1.5 text-xs text-textMain"
                      />
                    </div>
                  </div>
                </div>

                <FileUpload
                  label="Attach Crop Bill / Soil Analysis"
                  currentUrl={cropFormData.receiptUrl}
                  onUploadSuccess={(url) => setCropFormData({ ...cropFormData, receiptUrl: url })}
                  onRemove={() => setCropFormData({ ...cropFormData, receiptUrl: '' })}
                />

                <div className="flex justify-end gap-3 pt-3 border-t border-glass">
                  <button type="button" onClick={() => setShowCropModal(false)} className="px-4 py-2 rounded-xl border border-glass text-textMuted text-sm">Cancel</button>
                  <button type="submit" className="bg-green-500 text-background px-5 py-2 rounded-xl font-medium text-sm hover:bg-green-400 shadow-neon-primary-sm">
                    {editCropId ? 'Update Crop' : 'Save Crop Cycle'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FARM MODAL */}
      <AnimatePresence>
        {showFarmModal && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowFarmModal(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-panel max-w-md w-full p-6 border border-glass shadow-neon-primary-sm"
            >
              <h2 className="text-xl font-bold text-textMain mb-4">Register Land Parcel</h2>
              <form onSubmit={handleSaveFarm} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-textMuted mb-1">Parcel / Farm Name *</label>
                  <input
                    type="text"
                    required
                    value={farmFormData.name}
                    onChange={(e) => setFarmFormData({ ...farmFormData, name: e.target.value })}
                    placeholder="e.g. North Field, River Parcel"
                    className="w-full bg-surface border border-glass rounded-xl px-4 py-2 text-sm text-textMain"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-textMuted mb-1">Survey / Khasra #</label>
                    <input
                      type="text"
                      value={farmFormData.surveyNumber}
                      onChange={(e) => setFarmFormData({ ...farmFormData, surveyNumber: e.target.value })}
                      placeholder="e.g. 104/2B"
                      className="w-full bg-surface border border-glass rounded-xl px-3 py-2 text-sm text-textMain font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-textMuted mb-1">Acreage</label>
                    <input
                      type="number"
                      step="0.1"
                      value={farmFormData.acreage}
                      onChange={(e) => setFarmFormData({ ...farmFormData, acreage: e.target.value })}
                      placeholder="e.g. 12"
                      className="w-full bg-surface border border-glass rounded-xl px-3 py-2 text-sm text-textMain"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-textMuted mb-1">Soil Type</label>
                  <select
                    value={farmFormData.soilType}
                    onChange={(e) => setFarmFormData({ ...farmFormData, soilType: e.target.value })}
                    className="w-full bg-surface border border-glass rounded-xl px-3 py-2 text-sm text-textMain"
                  >
                    {SOIL_TYPES.map(s => <option key={s} value={s} className="bg-surface">{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-textMuted mb-1">Irrigation System</label>
                  <select
                    value={farmFormData.irrigationType}
                    onChange={(e) => setFarmFormData({ ...farmFormData, irrigationType: e.target.value })}
                    className="w-full bg-surface border border-glass rounded-xl px-3 py-2 text-sm text-textMain"
                  >
                    {IRRIGATION_TYPES.map(i => <option key={i} value={i} className="bg-surface">{i}</option>)}
                  </select>
                </div>
                <div className="flex justify-end gap-3 pt-3 border-t border-glass">
                  <button type="button" onClick={() => setShowFarmModal(false)} className="px-4 py-2 rounded-xl border border-glass text-textMuted text-sm">Cancel</button>
                  <button type="submit" className="bg-primary text-background px-5 py-2 rounded-xl font-medium text-sm hover:bg-primary/90 shadow-neon-primary-sm">Save Parcel</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ACTIVITY MODAL */}
      <AnimatePresence>
        {showActivityModal && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowActivityModal(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-panel max-w-md w-full p-6 border border-glass shadow-neon-primary-sm"
            >
              <h2 className="text-xl font-bold text-textMain mb-4">Log Field Activity</h2>
              <form onSubmit={handleSaveActivity} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-textMuted mb-1">Operation Type</label>
                  <select
                    value={activityFormData.activityType}
                    onChange={(e) => setActivityFormData({ ...activityFormData, activityType: e.target.value })}
                    className="w-full bg-surface border border-glass rounded-xl px-3 py-2 text-sm text-textMain"
                  >
                    {['Land Tilling', 'Sowing', 'Weeding', 'Fertilizing', 'Spraying', 'Irrigation', 'Harvesting', 'Other'].map(a => (
                      <option key={a} value={a} className="bg-surface">{a}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-textMuted mb-1">Date</label>
                    <input
                      type="date"
                      value={activityFormData.date}
                      onChange={(e) => setActivityFormData({ ...activityFormData, date: e.target.value })}
                      className="w-full bg-surface border border-glass rounded-xl px-3 py-2 text-sm text-textMain"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-textMuted mb-1">Cost (₹)</label>
                    <input
                      type="number"
                      value={activityFormData.cost}
                      onChange={(e) => setActivityFormData({ ...activityFormData, cost: e.target.value })}
                      placeholder="0"
                      className="w-full bg-surface border border-glass rounded-xl px-3 py-2 text-sm text-textMain font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-textMuted mb-1">Notes</label>
                  <textarea
                    rows={2}
                    value={activityFormData.notes}
                    onChange={(e) => setActivityFormData({ ...activityFormData, notes: e.target.value })}
                    placeholder="Details about laborers, chemical quantity used..."
                    className="w-full bg-surface border border-glass rounded-xl px-4 py-2 text-sm text-textMain"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-3 border-t border-glass">
                  <button type="button" onClick={() => setShowActivityModal(false)} className="px-4 py-2 rounded-xl border border-glass text-textMuted text-sm">Cancel</button>
                  <button type="submit" className="bg-yellow-400 text-black px-5 py-2 rounded-xl font-medium text-sm hover:bg-yellow-300">Save Activity</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CONFIRM DELETE MODAL */}
      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title={`Delete ${deleteTarget?.type === 'crop' ? 'Crop Cycle' : deleteTarget?.type === 'farm' ? 'Land Parcel' : 'Activity'}`}
        message="Are you sure you want to permanently delete this agricultural record? Financial entries will be updated accordingly."
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
