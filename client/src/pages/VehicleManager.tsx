import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Car, Fuel, Wrench, FileText, AlertTriangle, ShieldCheck,
  Calendar, Gauge, IndianRupee, ArrowLeft, Edit2, Trash2, CheckCircle2,
  Download, Clock, ChevronRight
} from 'lucide-react';
import { useContextEngineStore } from '../store/useContextEngineStore';
import { VehicleService, getActiveUserId } from '../services/firestoreService';
import { calculateVehicleMileage, calculateDaysRemaining } from '../utils/calculations';
import { exportToCSV } from '../utils/csvExport';
import { FileUpload } from '../components/common/FileUpload';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { EmptyState } from '../components/common/EmptyState';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

const VEHICLE_TYPES = ['Car', 'Bike', 'Scooter', 'Tractor', 'Truck / Commercial', 'Other'];
const SERVICE_TYPES = [
  'General Service', 'Engine Oil & Filter', 'Brake Pads & Discs',
  'Tyre Rotation / Replacement', 'Battery Service', 'Wheel Alignment',
  'Air Filter / AC', 'Transmission / Clutch', 'Body & Paint', 'Repair / Breakdown'
];
const FUEL_TYPES = ['Petrol', 'Diesel', 'CNG', 'Electric (kWh)'];

export default function VehicleManager() {
  const { user } = useContextEngineStore();
  const activeUid = getActiveUserId(user?.id);

  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Active Vehicle Detail View
  const [selectedVehicle, setSelectedVehicle] = useState<any | null>(null);
  const [detailTab, setDetailTab] = useState<'overview' | 'fuel' | 'service' | 'documents'>('overview');

  // Logs for selected vehicle
  const [fuelLogs, setFuelLogs] = useState<any[]>([]);
  const [serviceLogs, setServiceLogs] = useState<any[]>([]);

  // Modals
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [editVehicleId, setEditVehicleId] = useState<string | null>(null);
  const [vehicleFormData, setVehicleFormData] = useState({
    name: '',
    type: 'Car',
    licensePlate: '',
    make: '',
    model: '',
    year: '',
    color: '',
    rcNumber: '',
    rcExpiry: '',
    rcDocUrl: '',
    insuranceProvider: '',
    insurancePolicyNumber: '',
    insuranceExpiry: '',
    insurancePremium: '',
    insuranceDocUrl: '',
    pucNumber: '',
    pucExpiry: '',
    pucDocUrl: '',
    lastServiceOdo: '',
    nextServiceOdo: '',
    nextServiceDate: '',
    financier: '',
    loanAccountNo: ''
  });

  // Fuel Modal
  const [showFuelModal, setShowFuelModal] = useState(false);
  const [fuelFormData, setFuelFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    fuelType: 'Petrol',
    odometer: '',
    liters: '',
    pricePerLiter: '',
    cost: '',
    isFullTank: true,
    station: '',
    receiptUrl: ''
  });

  // Service Modal
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [serviceFormData, setServiceFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    serviceType: 'General Service',
    odometer: '',
    cost: '',
    garage: '',
    notes: '',
    receiptUrl: ''
  });

  // Delete Confirm
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; type: 'vehicle' | 'fuel' | 'service' } | null>(null);

  useEffect(() => {
    fetchVehicles();
  }, [user]);

  useEffect(() => {
    if (selectedVehicle) {
      fetchVehicleLogs(selectedVehicle._id);
    }
  }, [selectedVehicle]);

  const fetchVehicles = async () => {
    setLoading(true);
    try {
      const data = await VehicleService.getVehicles(activeUid);
      setVehicles(data);
      if (selectedVehicle) {
        const updated = data.find(v => v._id === selectedVehicle._id);
        if (updated) setSelectedVehicle(updated);
      }
    } catch (e) {
      console.error('Error fetching vehicles:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchVehicleLogs = async (vId: string) => {
    try {
      const [fLogs, sLogs] = await Promise.all([
        VehicleService.getFuelLogs(vId),
        VehicleService.getServiceLogs(vId)
      ]);
      setFuelLogs(fLogs);
      setServiceLogs(sLogs);
    } catch (e) {
      console.error('Error fetching vehicle sub-logs:', e);
    }
  };

  // Save Vehicle
  const handleSaveVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleFormData.name.trim() || !vehicleFormData.licensePlate.trim()) return;

    try {
      const payload = {
        ...vehicleFormData,
        year: Number(vehicleFormData.year) || undefined,
        insurancePremium: Number(vehicleFormData.insurancePremium) || 0,
        lastServiceOdo: Number(vehicleFormData.lastServiceOdo) || 0,
        nextServiceOdo: Number(vehicleFormData.nextServiceOdo) || 0
      };

      if (editVehicleId) {
        await VehicleService.updateVehicle(editVehicleId, payload);
      } else {
        await VehicleService.addVehicle(activeUid, payload);
      }

      setShowVehicleModal(false);
      setEditVehicleId(null);
      resetVehicleForm();
      fetchVehicles();
    } catch (e) {
      console.error('Error saving vehicle:', e);
    }
  };

  const resetVehicleForm = () => {
    setVehicleFormData({
      name: '', type: 'Car', licensePlate: '', make: '', model: '', year: '', color: '',
      rcNumber: '', rcExpiry: '', rcDocUrl: '',
      insuranceProvider: '', insurancePolicyNumber: '', insuranceExpiry: '', insurancePremium: '', insuranceDocUrl: '',
      pucNumber: '', pucExpiry: '', pucDocUrl: '',
      lastServiceOdo: '', nextServiceOdo: '', nextServiceDate: '', financier: '', loanAccountNo: ''
    });
  };

  const handleEditVehicle = (v: any) => {
    setVehicleFormData({
      name: v.name || '',
      type: v.type || 'Car',
      licensePlate: v.licensePlate || '',
      make: v.make || '',
      model: v.model || '',
      year: String(v.year || ''),
      color: v.color || '',
      rcNumber: v.rcNumber || '',
      rcExpiry: v.rcExpiry ? new Date(v.rcExpiry).toISOString().split('T')[0] : '',
      rcDocUrl: v.rcDocUrl || '',
      insuranceProvider: v.insuranceProvider || '',
      insurancePolicyNumber: v.insurancePolicyNumber || '',
      insuranceExpiry: v.insuranceExpiry ? new Date(v.insuranceExpiry).toISOString().split('T')[0] : '',
      insurancePremium: String(v.insurancePremium || ''),
      insuranceDocUrl: v.insuranceDocUrl || '',
      pucNumber: v.pucNumber || '',
      pucExpiry: v.pucExpiry ? new Date(v.pucExpiry).toISOString().split('T')[0] : '',
      pucDocUrl: v.pucDocUrl || '',
      lastServiceOdo: String(v.lastServiceOdo || ''),
      nextServiceOdo: String(v.nextServiceOdo || ''),
      nextServiceDate: v.nextServiceDate ? new Date(v.nextServiceDate).toISOString().split('T')[0] : '',
      financier: v.financier || '',
      loanAccountNo: v.loanAccountNo || ''
    });
    setEditVehicleId(v._id);
    setShowVehicleModal(true);
  };

  // Save Fuel Log
  const handleSaveFuel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicle) return;

    const odo = Number(fuelFormData.odometer) || 0;
    const ltr = Number(fuelFormData.liters) || 0;
    const price = Number(fuelFormData.pricePerLiter) || 0;
    const computedCost = Number(fuelFormData.cost) || (ltr * price);

    // Mileage validation against latest log
    const prevLog = fuelLogs.length > 0 ? fuelLogs[0] : null;
    let mileage = 0;

    if (prevLog && prevLog.odometer) {
      const calc = calculateVehicleMileage(odo, prevLog.odometer, ltr);
      if (!calc.isValid) {
        if (!confirm(`${calc.error}. Are you recording an odometer reset or correction? Click OK to save anyway.`)) {
          return;
        }
      } else {
        mileage = calc.mileage;
      }
    }

    try {
      await VehicleService.addFuelLog(selectedVehicle._id, {
        ...fuelFormData,
        vehicleName: selectedVehicle.name,
        odometer: odo,
        liters: ltr,
        pricePerLiter: price,
        cost: computedCost,
        mileage
      }, activeUid);

      setShowFuelModal(false);
      setFuelFormData({
        date: new Date().toISOString().split('T')[0],
        fuelType: 'Petrol', odometer: '', liters: '', pricePerLiter: '', cost: '',
        isFullTank: true, station: '', receiptUrl: ''
      });
      fetchVehicleLogs(selectedVehicle._id);
    } catch (e) {
      console.error('Error saving fuel log:', e);
    }
  };

  // Save Service Log
  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicle) return;

    try {
      await VehicleService.addServiceLog(selectedVehicle._id, {
        ...serviceFormData,
        vehicleName: selectedVehicle.name,
        odometer: Number(serviceFormData.odometer) || 0,
        cost: Number(serviceFormData.cost) || 0
      }, activeUid);

      // Update vehicle's last service odometer
      await VehicleService.updateVehicle(selectedVehicle._id, {
        lastServiceOdo: Number(serviceFormData.odometer) || selectedVehicle.lastServiceOdo
      });

      setShowServiceModal(false);
      setServiceFormData({
        date: new Date().toISOString().split('T')[0],
        serviceType: 'General Service', odometer: '', cost: '', garage: '', notes: '', receiptUrl: ''
      });
      fetchVehicleLogs(selectedVehicle._id);
      fetchVehicles();
    } catch (e) {
      console.error('Error saving service log:', e);
    }
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === 'vehicle') {
        await VehicleService.deleteVehicle(deleteTarget.id);
        if (selectedVehicle?._id === deleteTarget.id) setSelectedVehicle(null);
        fetchVehicles();
      } else if (deleteTarget.type === 'fuel') {
        await VehicleService.deleteFuelLog(deleteTarget.id);
        if (selectedVehicle) fetchVehicleLogs(selectedVehicle._id);
      } else if (deleteTarget.type === 'service') {
        await VehicleService.deleteServiceLog(deleteTarget.id);
        if (selectedVehicle) fetchVehicleLogs(selectedVehicle._id);
      }
      setDeleteTarget(null);
    } catch (e) {
      console.error('Delete error:', e);
    }
  };

  // Financial Stats for Selected Vehicle
  const totalFuelCost = fuelLogs.reduce((acc, curr) => acc + (Number(curr.cost) || 0), 0);
  const totalServiceCost = serviceLogs.reduce((acc, curr) => acc + (Number(curr.cost) || 0), 0);
  const totalVehicleExpense = totalFuelCost + totalServiceCost + (Number(selectedVehicle?.insurancePremium) || 0);

  // Average Mileage
  const validMileageLogs = fuelLogs.filter(l => Number(l.mileage) > 0);
  const avgMileage = validMileageLogs.length > 0
    ? (validMileageLogs.reduce((acc, curr) => acc + Number(curr.mileage), 0) / validMileageLogs.length).toFixed(1)
    : 'N/A';

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            {selectedVehicle && (
              <button
                onClick={() => setSelectedVehicle(null)}
                className="p-1.5 rounded-lg bg-surface border border-glass text-textMuted hover:text-textMain transition-colors"
                title="Back to Vehicle Fleet"
              >
                <ArrowLeft size={18} />
              </button>
            )}
            <h1 className="text-3xl font-bold tracking-wider mb-1 flex items-center gap-3">
              <Car className="text-yellow-400" size={28} />
              {selectedVehicle ? selectedVehicle.name : 'Vehicle Manager'}
            </h1>
          </div>
          <p className="text-textMuted">
            {selectedVehicle
              ? `${selectedVehicle.type} • ${selectedVehicle.licensePlate} • Complete maintenance, fuel & document records`
              : 'Fleet management, RC books, insurance, PUC, service reminders, and mileage tracking.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {selectedVehicle ? (
            <>
              <button
                onClick={() => exportToCSV([...fuelLogs, ...serviceLogs], `${selectedVehicle.name}_Logs`)}
                className="px-3.5 py-2 rounded-xl border border-glass bg-surface hover:bg-surfaceLight text-textMain text-sm font-medium flex items-center gap-2"
              >
                <Download size={16} /> Export Logs
              </button>
              <button
                onClick={() => setShowFuelModal(true)}
                className="px-3.5 py-2 rounded-xl bg-primary text-background font-medium text-sm flex items-center gap-2 hover:bg-primary/90 shadow-neon-primary-sm"
              >
                <Fuel size={16} /> Log Fuel
              </button>
              <button
                onClick={() => setShowServiceModal(true)}
                className="px-3.5 py-2 rounded-xl bg-yellow-400 text-black font-medium text-sm flex items-center gap-2 hover:bg-yellow-300 shadow-[0_0_15px_rgba(250,204,21,0.4)]"
              >
                <Wrench size={16} /> Log Service
              </button>
            </>
          ) : (
            <button
              onClick={() => { setEditVehicleId(null); resetVehicleForm(); setShowVehicleModal(true); }}
              className="bg-primary text-background px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-primary/90 font-medium text-sm shadow-neon-primary-sm"
            >
              <Plus size={18} /> Add Vehicle
            </button>
          )}
        </div>
      </div>

      {/* VIEW 1: FLEET OVERVIEW (when no vehicle selected) */}
      {!selectedVehicle ? (
        loading ? (
          <LoadingSpinner />
        ) : vehicles.length === 0 ? (
          <EmptyState
            icon={Car}
            title="No vehicles in registry"
            description="Register your cars, bikes, scooters, or tractors to track insurance renewals, fuel logs, and service history."
            actionText="Register Vehicle"
            onAction={() => { setEditVehicleId(null); resetVehicleForm(); setShowVehicleModal(true); }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {vehicles.map((v: any) => {
              const insDays = calculateDaysRemaining(v.insuranceExpiry);
              const pucDays = calculateDaysRemaining(v.pucExpiry);

              return (
                <motion.div
                  key={v._id}
                  whileHover={{ y: -4 }}
                  onClick={() => setSelectedVehicle(v)}
                  className="glass-panel p-6 cursor-pointer border-t-4 border-t-yellow-400 hover:shadow-neon-primary-sm transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-surface border border-glass rounded-xl text-yellow-400">
                          <Car size={24} />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-textMain">{v.name}</h3>
                          <span className="text-xs font-mono px-2 py-0.5 rounded bg-background/60 border border-glass text-primary font-bold">
                            {v.licensePlate}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleEditVehicle(v)}
                          className="p-1.5 text-textMuted hover:text-primary transition-colors"
                          title="Edit Vehicle"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget({ id: v._id, type: 'vehicle' })}
                          className="p-1.5 text-textMuted hover:text-red-400 transition-colors"
                          title="Delete Vehicle"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2 py-3 border-y border-glass text-xs">
                      <div className="flex justify-between">
                        <span className="text-textMuted">Type / Make:</span>
                        <span className="font-medium text-textMain">{v.type} {v.make ? `• ${v.make}` : ''}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-textMuted">Insurance Expiry:</span>
                        <span className={`font-semibold ${insDays.isOverdue ? 'text-red-400' : insDays.daysRemaining <= 30 ? 'text-yellow-400' : 'text-textMain'}`}>
                          {v.insuranceExpiry ? `${new Date(v.insuranceExpiry).toLocaleDateString()} (${insDays.daysRemaining}d)` : 'Not set'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-textMuted">PUC Expiry:</span>
                        <span className={`font-semibold ${pucDays.isOverdue ? 'text-red-400' : pucDays.daysRemaining <= 30 ? 'text-yellow-400' : 'text-textMain'}`}>
                          {v.pucExpiry ? `${new Date(v.pucExpiry).toLocaleDateString()} (${pucDays.daysRemaining}d)` : 'Not set'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-2 flex items-center justify-between text-xs text-primary font-medium">
                    <span>View Logs & Dashboard</span>
                    <ChevronRight size={16} />
                  </div>
                </motion.div>
              );
            })}
          </div>
        )
      ) : (
        /* VIEW 2: DEDICATED VEHICLE DETAILS DASHBOARD */
        <div className="space-y-6">
          {/* KPI Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="glass-panel p-5 border-t-4 border-t-yellow-400">
              <span className="text-xs text-textMuted font-medium">Total Vehicle Cost</span>
              <div className="text-2xl font-bold text-textMain mt-1">₹{totalVehicleExpense.toLocaleString('en-IN')}</div>
              <p className="text-[11px] text-textMuted mt-1">Fuel + Service + Insurance</p>
            </div>
            <div className="glass-panel p-5 border-t-4 border-t-primary">
              <span className="text-xs text-textMuted font-medium">Average Mileage</span>
              <div className="text-2xl font-bold text-primary mt-1">{avgMileage} km/L</div>
              <p className="text-[11px] text-textMuted mt-1">From {validMileageLogs.length} verified fill-ups</p>
            </div>
            <div className="glass-panel p-5 border-t-4 border-t-green-400">
              <span className="text-xs text-textMuted font-medium">Fuel Expenses</span>
              <div className="text-2xl font-bold text-green-400 mt-1">₹{totalFuelCost.toLocaleString('en-IN')}</div>
              <p className="text-[11px] text-textMuted mt-1">{fuelLogs.length} total fuel logs</p>
            </div>
            <div className="glass-panel p-5 border-t-4 border-t-red-400">
              <span className="text-xs text-textMuted font-medium">Maintenance & Repairs</span>
              <div className="text-2xl font-bold text-red-400 mt-1">₹{totalServiceCost.toLocaleString('en-IN')}</div>
              <p className="text-[11px] text-textMuted mt-1">{serviceLogs.length} workshop visits</p>
            </div>
          </div>

          {/* Sub-tabs */}
          <div className="flex items-center gap-2 border-b border-glass pb-1">
            <button
              onClick={() => setDetailTab('overview')}
              className={`px-4 py-2 font-medium text-sm rounded-t-xl transition-colors ${
                detailTab === 'overview' ? 'bg-surface text-primary border-t-2 border-primary' : 'text-textMuted hover:text-textMain'
              }`}
            >
              Vehicle Overview & Reminders
            </button>
            <button
              onClick={() => setDetailTab('fuel')}
              className={`px-4 py-2 font-medium text-sm rounded-t-xl transition-colors ${
                detailTab === 'fuel' ? 'bg-surface text-primary border-t-2 border-primary' : 'text-textMuted hover:text-textMain'
              }`}
            >
              Fuel Log & Mileage ({fuelLogs.length})
            </button>
            <button
              onClick={() => setDetailTab('service')}
              className={`px-4 py-2 font-medium text-sm rounded-t-xl transition-colors ${
                detailTab === 'service' ? 'bg-surface text-primary border-t-2 border-primary' : 'text-textMuted hover:text-textMain'
              }`}
            >
              Service & Repairs ({serviceLogs.length})
            </button>
            <button
              onClick={() => setDetailTab('documents')}
              className={`px-4 py-2 font-medium text-sm rounded-t-xl transition-colors ${
                detailTab === 'documents' ? 'bg-surface text-primary border-t-2 border-primary' : 'text-textMuted hover:text-textMain'
              }`}
            >
              RC, Insurance & PUC Docs
            </button>
          </div>

          {/* SUBTAB 1: OVERVIEW & REMINDERS */}
          {detailTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="glass-panel p-6 space-y-4">
                <h3 className="text-lg font-bold text-textMain flex items-center gap-2">
                  <ShieldCheck className="text-primary" size={20} /> Registration & Policy Specs
                </h3>
                <div className="space-y-3 text-sm divide-y divide-glass">
                  <div className="flex justify-between pt-2">
                    <span className="text-textMuted">License Plate:</span>
                    <span className="font-mono font-bold text-textMain">{selectedVehicle.licensePlate}</span>
                  </div>
                  <div className="flex justify-between pt-2">
                    <span className="text-textMuted">Type / Category:</span>
                    <span className="text-textMain font-medium">{selectedVehicle.type}</span>
                  </div>
                  <div className="flex justify-between pt-2">
                    <span className="text-textMuted">Make / Model / Year:</span>
                    <span className="text-textMain font-medium">{selectedVehicle.make || '—'} {selectedVehicle.model} ({selectedVehicle.year || 'N/A'})</span>
                  </div>
                  <div className="flex justify-between pt-2">
                    <span className="text-textMuted">RC Number:</span>
                    <span className="font-mono text-textMain">{selectedVehicle.rcNumber || '—'}</span>
                  </div>
                  <div className="flex justify-between pt-2">
                    <span className="text-textMuted">Insurance Provider:</span>
                    <span className="text-textMain font-medium">{selectedVehicle.insuranceProvider || '—'} ({selectedVehicle.insurancePolicyNumber || 'No Policy #'})</span>
                  </div>
                  <div className="flex justify-between pt-2">
                    <span className="text-textMuted">PUC Number:</span>
                    <span className="font-mono text-textMain">{selectedVehicle.pucNumber || '—'}</span>
                  </div>
                  <div className="flex justify-between pt-2">
                    <span className="text-textMuted">Hypothecation / Financier:</span>
                    <span className="text-textMain font-medium">{selectedVehicle.financier || 'None (Self-owned)'}</span>
                  </div>
                </div>
              </div>

              {/* Renewal Alerts & Service Schedule */}
              <div className="glass-panel p-6 space-y-4">
                <h3 className="text-lg font-bold text-textMain flex items-center gap-2">
                  <Clock className="text-yellow-400" size={20} /> Expiry & Service Reminders
                </h3>
                <div className="space-y-3">
                  {/* Insurance Alert */}
                  {selectedVehicle.insuranceExpiry && (() => {
                    const ins = calculateDaysRemaining(selectedVehicle.insuranceExpiry);
                    return (
                      <div className={`p-4 rounded-xl border flex items-center justify-between ${
                        ins.isOverdue ? 'bg-red-500/10 border-red-500/30 text-red-400' :
                        ins.daysRemaining <= 30 ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300' :
                        'bg-surface border-glass text-textMain'
                      }`}>
                        <div>
                          <p className="font-bold text-sm">Insurance Policy Expiry</p>
                          <p className="text-xs text-textMuted">Due on {new Date(selectedVehicle.insuranceExpiry).toLocaleDateString()}</p>
                        </div>
                        <span className="text-xs font-bold font-mono px-2.5 py-1 rounded-full bg-background/50 border border-current">
                          {ins.isOverdue ? 'EXPIRED' : `${ins.daysRemaining} days left`}
                        </span>
                      </div>
                    );
                  })()}

                  {/* PUC Alert */}
                  {selectedVehicle.pucExpiry && (() => {
                    const puc = calculateDaysRemaining(selectedVehicle.pucExpiry);
                    return (
                      <div className={`p-4 rounded-xl border flex items-center justify-between ${
                        puc.isOverdue ? 'bg-red-500/10 border-red-500/30 text-red-400' :
                        puc.daysRemaining <= 30 ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300' :
                        'bg-surface border-glass text-textMain'
                      }`}>
                        <div>
                          <p className="font-bold text-sm">PUC Certificate Expiry</p>
                          <p className="text-xs text-textMuted">Due on {new Date(selectedVehicle.pucExpiry).toLocaleDateString()}</p>
                        </div>
                        <span className="text-xs font-bold font-mono px-2.5 py-1 rounded-full bg-background/50 border border-current">
                          {puc.isOverdue ? 'EXPIRED' : `${puc.daysRemaining} days left`}
                        </span>
                      </div>
                    );
                  })()}

                  {/* Next Service Due */}
                  <div className="p-4 rounded-xl bg-surface border border-glass flex items-center justify-between text-textMain">
                    <div>
                      <p className="font-bold text-sm">Next Scheduled Service</p>
                      <p className="text-xs text-textMuted">
                        Target: {selectedVehicle.nextServiceOdo ? `${Number(selectedVehicle.nextServiceOdo).toLocaleString()} km` : 'Not set'}
                        {selectedVehicle.nextServiceDate ? ` • ${new Date(selectedVehicle.nextServiceDate).toLocaleDateString()}` : ''}
                      </p>
                    </div>
                    <span className="text-xs font-mono text-primary font-bold">
                      Last: {selectedVehicle.lastServiceOdo ? `${Number(selectedVehicle.lastServiceOdo).toLocaleString()} km` : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SUBTAB 2: FUEL LOGS */}
          {detailTab === 'fuel' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-textMain">Fuel Fill-up History & Mileage</h3>
                <button
                  onClick={() => setShowFuelModal(true)}
                  className="bg-primary text-background px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 hover:bg-primary/90 shadow-neon-primary-sm"
                >
                  <Plus size={16} /> Add Fill-up
                </button>
              </div>

              {fuelLogs.length === 0 ? (
                <EmptyState
                  icon={Fuel}
                  title="No fuel logs recorded"
                  description="Record fuel fill-ups with odometer readings to calculate exact km/L mileage automatically."
                  actionText="Add First Fill-up"
                  onAction={() => setShowFuelModal(true)}
                />
              ) : (
                <div className="glass-panel overflow-hidden border border-glass">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-glass bg-surface/50 text-xs font-semibold text-textMuted uppercase">
                          <th className="py-3 px-4">Date</th>
                          <th className="py-3 px-4">Odometer</th>
                          <th className="py-3 px-4">Quantity</th>
                          <th className="py-3 px-4">Rate / Unit</th>
                          <th className="py-3 px-4 text-right">Cost</th>
                          <th className="py-3 px-4 text-center">Mileage</th>
                          <th className="py-3 px-4 text-center">Receipt</th>
                          <th className="py-3 px-4 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-glass">
                        {fuelLogs.map((log: any) => (
                          <tr key={log._id} className="hover:bg-surface/30">
                            <td className="py-3 px-4 text-xs text-textMuted">{new Date(log.date).toLocaleDateString()}</td>
                            <td className="py-3 px-4 font-mono font-medium text-textMain">{Number(log.odometer).toLocaleString()} km</td>
                            <td className="py-3 px-4 text-textMain">{log.liters} L ({log.fuelType})</td>
                            <td className="py-3 px-4 text-textMuted">₹{log.pricePerLiter}</td>
                            <td className="py-3 px-4 text-right font-bold text-green-400">₹{Number(log.cost).toLocaleString('en-IN')}</td>
                            <td className="py-3 px-4 text-center">
                              {Number(log.mileage) > 0 ? (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary font-bold">
                                  {log.mileage} km/L
                                </span>
                              ) : (
                                <span className="text-xs text-textMuted">—</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center">
                              {log.receiptUrl ? (
                                <a href={log.receiptUrl} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">View ↗</a>
                              ) : '—'}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button
                                onClick={() => setDeleteTarget({ id: log._id, type: 'fuel' })}
                                className="p-1.5 text-textMuted hover:text-red-400"
                              >
                                <Trash2 size={15} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SUBTAB 3: SERVICE LOGS */}
          {detailTab === 'service' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-textMain">Service, Maintenance & Part Replacements</h3>
                <button
                  onClick={() => setShowServiceModal(true)}
                  className="bg-yellow-400 text-black px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 hover:bg-yellow-300 shadow-[0_0_15px_rgba(250,204,21,0.4)]"
                >
                  <Plus size={16} /> Log Service
                </button>
              </div>

              {serviceLogs.length === 0 ? (
                <EmptyState
                  icon={Wrench}
                  title="No maintenance records"
                  description="Log oil changes, tyre rotations, brake pad replacements, and garage invoices."
                  actionText="Log Maintenance"
                  onAction={() => setShowServiceModal(true)}
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {serviceLogs.map((log: any) => (
                    <div key={log._id} className="glass-panel p-5 border-l-4 border-l-yellow-400 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-bold text-textMain">{log.serviceType}</h4>
                            <p className="text-xs text-textMuted">{new Date(log.date).toLocaleDateString()} • {log.garage || 'Independent Workshop'}</p>
                          </div>
                          <span className="text-base font-bold text-yellow-400">₹{Number(log.cost).toLocaleString('en-IN')}</span>
                        </div>
                        {log.notes && <p className="text-xs text-textMuted bg-surface/50 p-2.5 rounded-lg border border-glass my-2">{log.notes}</p>}
                        <div className="flex items-center justify-between text-xs text-textMuted pt-2">
                          <span>Odometer: <strong className="text-textMain">{Number(log.odometer || 0).toLocaleString()} km</strong></span>
                          {log.receiptUrl && <a href={log.receiptUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline font-medium">Invoice ↗</a>}
                        </div>
                      </div>
                      <div className="pt-3 border-t border-glass flex justify-end">
                        <button onClick={() => setDeleteTarget({ id: log._id, type: 'service' })} className="text-textMuted hover:text-red-400 text-xs flex items-center gap-1">
                          <Trash2 size={13} /> Remove Log
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SUBTAB 4: DOCUMENTS */}
          {detailTab === 'documents' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* RC Doc */}
              <div className="glass-panel p-6 flex flex-col justify-between border-t-2 border-primary">
                <div>
                  <div className="p-3 bg-surface border border-glass text-primary rounded-xl w-fit mb-3">
                    <FileText size={22} />
                  </div>
                  <h4 className="font-bold text-textMain">Registration Certificate (RC)</h4>
                  <p className="text-xs text-textMuted mt-1">Number: {selectedVehicle.rcNumber || 'Not entered'}</p>
                  <p className="text-xs text-textMuted">Expiry: {selectedVehicle.rcExpiry ? new Date(selectedVehicle.rcExpiry).toLocaleDateString() : 'N/A'}</p>
                </div>
                <div className="mt-4 pt-3 border-t border-glass">
                  {selectedVehicle.rcDocUrl ? (
                    <a href={selectedVehicle.rcDocUrl} target="_blank" rel="noreferrer" className="w-full py-2 bg-primary/20 text-primary rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-primary/30">
                      View RC Book ↗
                    </a>
                  ) : (
                    <button onClick={() => handleEditVehicle(selectedVehicle)} className="w-full py-2 bg-surface text-textMuted hover:text-textMain rounded-xl text-xs font-medium border border-glass">
                      Upload Document
                    </button>
                  )}
                </div>
              </div>

              {/* Insurance Doc */}
              <div className="glass-panel p-6 flex flex-col justify-between border-t-2 border-green-400">
                <div>
                  <div className="p-3 bg-surface border border-glass text-green-400 rounded-xl w-fit mb-3">
                    <ShieldCheck size={22} />
                  </div>
                  <h4 className="font-bold text-textMain">Insurance Policy</h4>
                  <p className="text-xs text-textMuted mt-1">Provider: {selectedVehicle.insuranceProvider || '—'}</p>
                  <p className="text-xs text-textMuted">Policy: {selectedVehicle.insurancePolicyNumber || '—'}</p>
                  <p className="text-xs text-textMuted">Expiry: {selectedVehicle.insuranceExpiry ? new Date(selectedVehicle.insuranceExpiry).toLocaleDateString() : 'N/A'}</p>
                </div>
                <div className="mt-4 pt-3 border-t border-glass">
                  {selectedVehicle.insuranceDocUrl ? (
                    <a href={selectedVehicle.insuranceDocUrl} target="_blank" rel="noreferrer" className="w-full py-2 bg-green-500/20 text-green-400 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-green-500/30">
                      View Policy ↗
                    </a>
                  ) : (
                    <button onClick={() => handleEditVehicle(selectedVehicle)} className="w-full py-2 bg-surface text-textMuted hover:text-textMain rounded-xl text-xs font-medium border border-glass">
                      Upload Document
                    </button>
                  )}
                </div>
              </div>

              {/* PUC Doc */}
              <div className="glass-panel p-6 flex flex-col justify-between border-t-2 border-yellow-400">
                <div>
                  <div className="p-3 bg-surface border border-glass text-yellow-400 rounded-xl w-fit mb-3">
                    <Gauge size={22} />
                  </div>
                  <h4 className="font-bold text-textMain">PUC Certificate</h4>
                  <p className="text-xs text-textMuted mt-1">Cert #: {selectedVehicle.pucNumber || '—'}</p>
                  <p className="text-xs text-textMuted">Expiry: {selectedVehicle.pucExpiry ? new Date(selectedVehicle.pucExpiry).toLocaleDateString() : 'N/A'}</p>
                </div>
                <div className="mt-4 pt-3 border-t border-glass">
                  {selectedVehicle.pucDocUrl ? (
                    <a href={selectedVehicle.pucDocUrl} target="_blank" rel="noreferrer" className="w-full py-2 bg-yellow-400/20 text-yellow-400 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-yellow-400/30">
                      View PUC ↗
                    </a>
                  ) : (
                    <button onClick={() => handleEditVehicle(selectedVehicle)} className="w-full py-2 bg-surface text-textMuted hover:text-textMain rounded-xl text-xs font-medium border border-glass">
                      Upload Document
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VEHICLE REGISTRATION MODAL */}
      <AnimatePresence>
        {showVehicleModal && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowVehicleModal(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-panel max-w-2xl w-full p-6 border border-glass shadow-neon-primary-sm max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <h2 className="text-xl font-bold text-textMain mb-4">
                {editVehicleId ? 'Edit Vehicle Profile' : 'Register New Vehicle'}
              </h2>
              <form onSubmit={handleSaveVehicle} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-textMuted mb-1">Vehicle Name / Nickname *</label>
                    <input
                      type="text"
                      required
                      value={vehicleFormData.name}
                      onChange={(e) => setVehicleFormData({ ...vehicleFormData, name: e.target.value })}
                      placeholder="e.g. My Honda City, Farm Tractor"
                      className="w-full bg-surface border border-glass rounded-xl px-4 py-2 text-sm text-textMain focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-textMuted mb-1">License Plate Number *</label>
                    <input
                      type="text"
                      required
                      value={vehicleFormData.licensePlate}
                      onChange={(e) => setVehicleFormData({ ...vehicleFormData, licensePlate: e.target.value.toUpperCase() })}
                      placeholder="e.g. MH 12 AB 1234"
                      className="w-full bg-surface border border-glass rounded-xl px-4 py-2 text-sm font-mono text-textMain focus:outline-none focus:border-primary uppercase"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-textMuted mb-1">Vehicle Type</label>
                    <select
                      value={vehicleFormData.type}
                      onChange={(e) => setVehicleFormData({ ...vehicleFormData, type: e.target.value })}
                      className="w-full bg-surface border border-glass rounded-xl px-4 py-2 text-sm text-textMain focus:outline-none focus:border-primary"
                    >
                      {VEHICLE_TYPES.map(t => <option key={t} value={t} className="bg-surface">{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-textMuted mb-1">Make / Brand</label>
                    <input
                      type="text"
                      value={vehicleFormData.make}
                      onChange={(e) => setVehicleFormData({ ...vehicleFormData, make: e.target.value })}
                      placeholder="e.g. Honda, Hyundai, Mahindra"
                      className="w-full bg-surface border border-glass rounded-xl px-4 py-2 text-sm text-textMain focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-textMuted mb-1">Model & Year</label>
                    <input
                      type="text"
                      value={vehicleFormData.model}
                      onChange={(e) => setVehicleFormData({ ...vehicleFormData, model: e.target.value })}
                      placeholder="e.g. City ZX (2022)"
                      className="w-full bg-surface border border-glass rounded-xl px-4 py-2 text-sm text-textMain focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                {/* Insurance Specs */}
                <div className="p-4 rounded-xl bg-surface/50 border border-glass space-y-3">
                  <h4 className="text-xs font-bold text-textMain uppercase tracking-wider">Insurance Details</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] text-textMuted mb-1">Provider</label>
                      <input
                        type="text"
                        value={vehicleFormData.insuranceProvider}
                        onChange={(e) => setVehicleFormData({ ...vehicleFormData, insuranceProvider: e.target.value })}
                        placeholder="e.g. ICICI Lombard"
                        className="w-full bg-surface border border-glass rounded-lg px-3 py-1.5 text-xs text-textMain"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-textMuted mb-1">Policy Number</label>
                      <input
                        type="text"
                        value={vehicleFormData.insurancePolicyNumber}
                        onChange={(e) => setVehicleFormData({ ...vehicleFormData, insurancePolicyNumber: e.target.value })}
                        placeholder="Policy #"
                        className="w-full bg-surface border border-glass rounded-lg px-3 py-1.5 text-xs text-textMain font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-textMuted mb-1">Insurance Expiry Date</label>
                      <input
                        type="date"
                        value={vehicleFormData.insuranceExpiry}
                        onChange={(e) => setVehicleFormData({ ...vehicleFormData, insuranceExpiry: e.target.value })}
                        className="w-full bg-surface border border-glass rounded-lg px-3 py-1.5 text-xs text-textMain"
                      />
                    </div>
                  </div>
                  <FileUpload
                    label="Upload Insurance Policy Document"
                    currentUrl={vehicleFormData.insuranceDocUrl}
                    onUploadSuccess={(url) => setVehicleFormData({ ...vehicleFormData, insuranceDocUrl: url })}
                    onRemove={() => setVehicleFormData({ ...vehicleFormData, insuranceDocUrl: '' })}
                  />
                </div>

                {/* PUC & RC Specs */}
                <div className="p-4 rounded-xl bg-surface/50 border border-glass space-y-3">
                  <h4 className="text-xs font-bold text-textMain uppercase tracking-wider">RC & PUC Details</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-textMuted mb-1">RC Expiry Date</label>
                      <input
                        type="date"
                        value={vehicleFormData.rcExpiry}
                        onChange={(e) => setVehicleFormData({ ...vehicleFormData, rcExpiry: e.target.value })}
                        className="w-full bg-surface border border-glass rounded-lg px-3 py-1.5 text-xs text-textMain"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-textMuted mb-1">PUC Expiry Date</label>
                      <input
                        type="date"
                        value={vehicleFormData.pucExpiry}
                        onChange={(e) => setVehicleFormData({ ...vehicleFormData, pucExpiry: e.target.value })}
                        className="w-full bg-surface border border-glass rounded-lg px-3 py-1.5 text-xs text-textMain"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <FileUpload
                      label="Upload RC Book"
                      currentUrl={vehicleFormData.rcDocUrl}
                      onUploadSuccess={(url) => setVehicleFormData({ ...vehicleFormData, rcDocUrl: url })}
                      onRemove={() => setVehicleFormData({ ...vehicleFormData, rcDocUrl: '' })}
                    />
                    <FileUpload
                      label="Upload PUC Certificate"
                      currentUrl={vehicleFormData.pucDocUrl}
                      onUploadSuccess={(url) => setVehicleFormData({ ...vehicleFormData, pucDocUrl: url })}
                      onRemove={() => setVehicleFormData({ ...vehicleFormData, pucDocUrl: '' })}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-glass">
                  <button type="button" onClick={() => setShowVehicleModal(false)} className="px-4 py-2 rounded-xl border border-glass text-textMuted text-sm">Cancel</button>
                  <button type="submit" className="bg-primary text-background px-5 py-2 rounded-xl font-medium text-sm hover:bg-primary/90 shadow-neon-primary-sm">
                    {editVehicleId ? 'Update Vehicle' : 'Register Vehicle'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FUEL MODAL */}
      <AnimatePresence>
        {showFuelModal && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowFuelModal(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-panel max-w-md w-full p-6 border border-glass shadow-neon-primary-sm"
            >
              <h2 className="text-xl font-bold text-textMain mb-4 flex items-center gap-2">
                <Fuel className="text-primary" size={22} /> Log Fuel Fill-up
              </h2>
              <form onSubmit={handleSaveFuel} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-textMuted mb-1">Date *</label>
                    <input
                      type="date"
                      required
                      value={fuelFormData.date}
                      onChange={(e) => setFuelFormData({ ...fuelFormData, date: e.target.value })}
                      className="w-full bg-surface border border-glass rounded-xl px-3 py-2 text-sm text-textMain"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-textMuted mb-1">Fuel Type</label>
                    <select
                      value={fuelFormData.fuelType}
                      onChange={(e) => setFuelFormData({ ...fuelFormData, fuelType: e.target.value })}
                      className="w-full bg-surface border border-glass rounded-xl px-3 py-2 text-sm text-textMain"
                    >
                      {FUEL_TYPES.map(f => <option key={f} value={f} className="bg-surface">{f}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-textMuted mb-1">Current Odometer (km) *</label>
                  <input
                    type="number"
                    required
                    value={fuelFormData.odometer}
                    onChange={(e) => setFuelFormData({ ...fuelFormData, odometer: e.target.value })}
                    placeholder="e.g. 45200"
                    className="w-full bg-surface border border-glass rounded-xl px-4 py-2 text-sm font-mono text-textMain"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-textMuted mb-1">Quantity (Liters) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={fuelFormData.liters}
                      onChange={(e) => setFuelFormData({ ...fuelFormData, liters: e.target.value })}
                      placeholder="e.g. 35.5"
                      className="w-full bg-surface border border-glass rounded-xl px-3 py-2 text-sm text-textMain"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-textMuted mb-1">Price / Liter (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={fuelFormData.pricePerLiter}
                      onChange={(e) => setFuelFormData({ ...fuelFormData, pricePerLiter: e.target.value })}
                      placeholder="e.g. 104.50"
                      className="w-full bg-surface border border-glass rounded-xl px-3 py-2 text-sm text-textMain"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-textMuted mb-1">Total Cost (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={fuelFormData.cost}
                    onChange={(e) => setFuelFormData({ ...fuelFormData, cost: e.target.value })}
                    placeholder={fuelFormData.liters && fuelFormData.pricePerLiter ? String(Number(fuelFormData.liters) * Number(fuelFormData.pricePerLiter)) : '0.00'}
                    className="w-full bg-surface border border-glass rounded-xl px-4 py-2 text-sm text-textMain font-bold"
                  />
                </div>

                <FileUpload
                  label="Attach Fuel Receipt"
                  currentUrl={fuelFormData.receiptUrl}
                  onUploadSuccess={(url) => setFuelFormData({ ...fuelFormData, receiptUrl: url })}
                  onRemove={() => setFuelFormData({ ...fuelFormData, receiptUrl: '' })}
                />

                <div className="flex justify-end gap-3 pt-3 border-t border-glass">
                  <button type="button" onClick={() => setShowFuelModal(false)} className="px-4 py-2 rounded-xl border border-glass text-textMuted text-sm">Cancel</button>
                  <button type="submit" className="bg-primary text-background px-5 py-2 rounded-xl font-medium text-sm hover:bg-primary/90 shadow-neon-primary-sm">Record Fuel</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SERVICE MODAL */}
      <AnimatePresence>
        {showServiceModal && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowServiceModal(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-panel max-w-md w-full p-6 border border-glass shadow-neon-primary-sm"
            >
              <h2 className="text-xl font-bold text-textMain mb-4 flex items-center gap-2">
                <Wrench className="text-yellow-400" size={22} /> Log Service / Maintenance
              </h2>
              <form onSubmit={handleSaveService} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-textMuted mb-1">Date *</label>
                    <input
                      type="date"
                      required
                      value={serviceFormData.date}
                      onChange={(e) => setServiceFormData({ ...serviceFormData, date: e.target.value })}
                      className="w-full bg-surface border border-glass rounded-xl px-3 py-2 text-sm text-textMain"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-textMuted mb-1">Service Type</label>
                    <select
                      value={serviceFormData.serviceType}
                      onChange={(e) => setServiceFormData({ ...serviceFormData, serviceType: e.target.value })}
                      className="w-full bg-surface border border-glass rounded-xl px-3 py-2 text-sm text-textMain"
                    >
                      {SERVICE_TYPES.map(s => <option key={s} value={s} className="bg-surface">{s}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-textMuted mb-1">Odometer (km)</label>
                    <input
                      type="number"
                      value={serviceFormData.odometer}
                      onChange={(e) => setServiceFormData({ ...serviceFormData, odometer: e.target.value })}
                      placeholder="e.g. 50000"
                      className="w-full bg-surface border border-glass rounded-xl px-3 py-2 text-sm text-textMain"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-textMuted mb-1">Total Bill (₹) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={serviceFormData.cost}
                      onChange={(e) => setServiceFormData({ ...serviceFormData, cost: e.target.value })}
                      placeholder="0.00"
                      className="w-full bg-surface border border-glass rounded-xl px-3 py-2 text-sm text-textMain font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-textMuted mb-1">Garage / Authorized Service Center</label>
                  <input
                    type="text"
                    value={serviceFormData.garage}
                    onChange={(e) => setServiceFormData({ ...serviceFormData, garage: e.target.value })}
                    placeholder="e.g. Honda Authorized, Bosch Car Service"
                    className="w-full bg-surface border border-glass rounded-xl px-4 py-2 text-sm text-textMain"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-textMuted mb-1">Work Description / Replaced Parts</label>
                  <textarea
                    rows={2}
                    value={serviceFormData.notes}
                    onChange={(e) => setServiceFormData({ ...serviceFormData, notes: e.target.value })}
                    placeholder="e.g. Replaced synthetic engine oil (0W-20), oil filter, front brake pads..."
                    className="w-full bg-surface border border-glass rounded-xl px-4 py-2 text-sm text-textMain"
                  />
                </div>

                <FileUpload
                  label="Attach Service Invoice / Bill"
                  currentUrl={serviceFormData.receiptUrl}
                  onUploadSuccess={(url) => setServiceFormData({ ...serviceFormData, receiptUrl: url })}
                  onRemove={() => setServiceFormData({ ...serviceFormData, receiptUrl: '' })}
                />

                <div className="flex justify-end gap-3 pt-3 border-t border-glass">
                  <button type="button" onClick={() => setShowServiceModal(false)} className="px-4 py-2 rounded-xl border border-glass text-textMuted text-sm">Cancel</button>
                  <button type="submit" className="bg-yellow-400 text-black px-5 py-2 rounded-xl font-medium text-sm hover:bg-yellow-300 shadow-[0_0_15px_rgba(250,204,21,0.4)]">Save Service Log</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CONFIRM DELETE MODAL */}
      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title={`Delete ${deleteTarget?.type === 'vehicle' ? 'Vehicle' : deleteTarget?.type === 'fuel' ? 'Fuel Log' : 'Service Log'}`}
        message="Are you sure you want to permanently delete this record? This action cannot be undone."
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
