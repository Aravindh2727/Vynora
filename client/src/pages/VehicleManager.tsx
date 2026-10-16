import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Plus, Car, Fuel, Wrench, FileText, AlertTriangle, ShieldCheck,
  Calendar, Gauge, IndianRupee, Edit2, Trash2, CheckCircle2,
  Download, Clock, ChevronRight, Droplet, Battery, Shield, Landmark,
  FolderOpen, BarChart3, ArrowLeft, ExternalLink, Sparkles
} from 'lucide-react';
import { useContextEngineStore } from '../store/useContextEngineStore';
import { VehicleService, getActiveUserId } from '../services/firestoreService';
import { calculateVehicleMileage, calculateDaysRemaining } from '../utils/calculations';
import { exportToCSV } from '../utils/csvExport';
import { FileUpload } from '../components/common/FileUpload';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { EmptyState } from '../components/common/EmptyState';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { MobilePageHeader } from '../components/common/MobilePageHeader';

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
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Multi-level route states
  const selectedVehicleId = searchParams.get('vehicleId');
  const activeSubsection = searchParams.get('sub');

  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
    drivingLicenceNo: '',
    drivingLicenceDocUrl: '',
    lastServiceOdo: '',
    nextServiceOdo: '',
    nextServiceDate: '',
    financier: '',
    loanAccountNo: '',
    engineOilType: '5W-30 Synthetic',
    lastOilChangeOdo: '',
    batteryMake: '',
    batteryInstallDate: '',
    tyreBrand: '',
    tyrePressureFront: '32',
    tyrePressureRear: '34'
  });

  // Fuel Modal
  const [showFuelModal, setShowFuelModal] = useState(false);
  const [editingFuelLogId, setEditingFuelLogId] = useState<string | null>(null);
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
  const [editingServiceLogId, setEditingServiceLogId] = useState<string | null>(null);
  const [serviceFormData, setServiceFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    serviceType: 'General Service',
    odometer: '',
    cost: '',
    garage: '',
    notes: '',
    receiptUrl: ''
  });

  // Subsection Quick Edit Modal
  const [subEditType, setSubEditType] = useState<string | null>(null);
  const [subEditData, setSubEditData] = useState<any>({});
  const [subEditSaving, setSubEditSaving] = useState(false);

  // Delete Confirm
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; type: 'vehicle' | 'fuel' | 'service' } | null>(null);

  // Fetch Vehicles
  useEffect(() => {
    fetchVehicles();
  }, [user]);

  // Safe Date Formatter to avoid RangeError: Invalid time value
  const formatIsoDate = (val: any): string => {
    if (!val) return '';
    if (typeof val === 'string') {
      if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
      const d = new Date(val);
      return isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0];
    }
    if (typeof val?.toDate === 'function') {
      const d = val.toDate();
      return isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0];
    }
    if (val instanceof Date) {
      return isNaN(val.getTime()) ? '' : val.toISOString().split('T')[0];
    }
    return '';
  };

  // Selected vehicle object from URL state
  const selectedVehicle = useMemo(() => {
    if (!selectedVehicleId) return null;
    return vehicles.find(v => (v._id && v._id === selectedVehicleId) || (v.id && v.id === selectedVehicleId)) || null;
  }, [vehicles, selectedVehicleId]);

  // Fetch sub-logs when a vehicle is active
  useEffect(() => {
    if (selectedVehicleId) {
      fetchVehicleLogs(selectedVehicleId);
    }
  }, [selectedVehicleId]);

  const fetchVehicles = async () => {
    setLoading(true);
    try {
      const data = await VehicleService.getVehicles(activeUid);
      setVehicles(data);
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

  // Navigation Helpers (Step-by-step history pushes)
  const openVehicle = (v: any) => {
    setSearchParams({ vehicleId: v._id || v.id });
  };

  const openSubsection = (sub: string) => {
    if (!selectedVehicleId) return;
    setSearchParams({ vehicleId: selectedVehicleId, sub });
  };

  const backToVehicleOverview = () => {
    if (!selectedVehicleId) return;
    setSearchParams({ vehicleId: selectedVehicleId });
  };

  const backToFleet = () => {
    setSearchParams({});
  };

  // Save Vehicle
  const handleSaveVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleFormData.name.trim() || !vehicleFormData.licensePlate.trim()) {
      alert("Vehicle name and registration number are required.");
      return;
    }

    try {
      const payload: Record<string, any> = {
        name: vehicleFormData.name.trim(),
        type: vehicleFormData.type,
        licensePlate: vehicleFormData.licensePlate.trim().toUpperCase(),
        make: vehicleFormData.make || '',
        model: vehicleFormData.model || '',
        year: vehicleFormData.year ? Number(vehicleFormData.year) || null : null,
        color: vehicleFormData.color || '',
        rcNumber: vehicleFormData.rcNumber || '',
        rcExpiry: vehicleFormData.rcExpiry || '',
        rcDocUrl: vehicleFormData.rcDocUrl || '',
        insuranceProvider: vehicleFormData.insuranceProvider || '',
        insurancePolicyNumber: vehicleFormData.insurancePolicyNumber || '',
        insuranceExpiry: vehicleFormData.insuranceExpiry || '',
        insurancePremium: Number(vehicleFormData.insurancePremium) || 0,
        insuranceDocUrl: vehicleFormData.insuranceDocUrl || '',
        pucNumber: vehicleFormData.pucNumber || '',
        pucExpiry: vehicleFormData.pucExpiry || '',
        pucDocUrl: vehicleFormData.pucDocUrl || '',
        drivingLicenceNo: vehicleFormData.drivingLicenceNo || '',
        drivingLicenceDocUrl: vehicleFormData.drivingLicenceDocUrl || '',
        lastServiceOdo: Number(vehicleFormData.lastServiceOdo) || 0,
        nextServiceOdo: Number(vehicleFormData.nextServiceOdo) || 0,
        nextServiceDate: vehicleFormData.nextServiceDate || '',
        financier: vehicleFormData.financier || '',
        loanAccountNo: vehicleFormData.loanAccountNo || '',
        engineOilType: vehicleFormData.engineOilType || '5W-30 Synthetic',
        lastOilChangeOdo: Number(vehicleFormData.lastOilChangeOdo) || 0,
        batteryMake: vehicleFormData.batteryMake || '',
        batteryInstallDate: vehicleFormData.batteryInstallDate || '',
        tyreBrand: vehicleFormData.tyreBrand || '',
        tyrePressureFront: vehicleFormData.tyrePressureFront || '32',
        tyrePressureRear: vehicleFormData.tyrePressureRear || '34'
      };

      const cleanData: any = {};
      Object.keys(payload).forEach(k => {
        if (payload[k] !== undefined) cleanData[k] = payload[k];
      });

      if (editVehicleId) {
        await VehicleService.updateVehicle(editVehicleId, cleanData);
      } else {
        await VehicleService.addVehicle(activeUid, cleanData);
      }

      setShowVehicleModal(false);
      setEditVehicleId(null);
      resetVehicleForm();
      await fetchVehicles();
      if (selectedVehicleId) {
        fetchVehicleLogs(selectedVehicleId);
      }
    } catch (e: any) {
      console.error('Error saving vehicle:', e);
      alert('Failed to save vehicle: ' + (e.message || e));
    }
  };

  const resetVehicleForm = () => {
    setVehicleFormData({
      name: '', type: 'Car', licensePlate: '', make: '', model: '', year: '', color: '',
      rcNumber: '', rcExpiry: '', rcDocUrl: '',
      insuranceProvider: '', insurancePolicyNumber: '', insuranceExpiry: '', insurancePremium: '', insuranceDocUrl: '',
      pucNumber: '', pucExpiry: '', pucDocUrl: '', drivingLicenceNo: '', drivingLicenceDocUrl: '',
      lastServiceOdo: '', nextServiceOdo: '', nextServiceDate: '', financier: '', loanAccountNo: '',
      engineOilType: '5W-30 Synthetic', lastOilChangeOdo: '', batteryMake: '', batteryInstallDate: '',
      tyreBrand: '', tyrePressureFront: '32', tyrePressureRear: '34'
    });
  };

  const handleEditVehicle = (v: any) => {
    if (!v) return;
    setVehicleFormData({
      name: v.name || '',
      type: v.type || 'Car',
      licensePlate: v.licensePlate || '',
      make: v.make || '',
      model: v.model || '',
      year: v.year ? String(v.year) : '',
      color: v.color || '',
      rcNumber: v.rcNumber || '',
      rcExpiry: formatIsoDate(v.rcExpiry),
      rcDocUrl: v.rcDocUrl || '',
      insuranceProvider: v.insuranceProvider || '',
      insurancePolicyNumber: v.insurancePolicyNumber || '',
      insuranceExpiry: formatIsoDate(v.insuranceExpiry),
      insurancePremium: v.insurancePremium ? String(v.insurancePremium) : '',
      insuranceDocUrl: v.insuranceDocUrl || '',
      pucNumber: v.pucNumber || '',
      pucExpiry: formatIsoDate(v.pucExpiry),
      pucDocUrl: v.pucDocUrl || '',
      drivingLicenceNo: v.drivingLicenceNo || '',
      drivingLicenceDocUrl: v.drivingLicenceDocUrl || '',
      lastServiceOdo: v.lastServiceOdo ? String(v.lastServiceOdo) : '',
      nextServiceOdo: v.nextServiceOdo ? String(v.nextServiceOdo) : '',
      nextServiceDate: formatIsoDate(v.nextServiceDate),
      financier: v.financier || '',
      loanAccountNo: v.loanAccountNo || '',
      engineOilType: v.engineOilType || '5W-30 Synthetic',
      lastOilChangeOdo: v.lastOilChangeOdo ? String(v.lastOilChangeOdo) : '',
      batteryMake: v.batteryMake || '',
      batteryInstallDate: formatIsoDate(v.batteryInstallDate),
      tyreBrand: v.tyreBrand || '',
      tyrePressureFront: String(v.tyrePressureFront || '32'),
      tyrePressureRear: String(v.tyrePressureRear || '34')
    });
    setEditVehicleId(v._id || v.id);
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

    const prevLog = fuelLogs.length > 0 ? fuelLogs[0] : null;
    let mileage = 0;

    if (prevLog && prevLog.odometer) {
      const calc = calculateVehicleMileage(odo, prevLog.odometer, ltr);
      if (calc.isValid) {
        mileage = calc.mileage;
      }
    }

    const vId = selectedVehicle._id || selectedVehicle.id;

    try {
      if (editingFuelLogId) {
        await VehicleService.updateFuelLog(vId, editingFuelLogId, {
          ...fuelFormData,
          vehicleName: selectedVehicle.name,
          odometer: odo,
          liters: ltr,
          pricePerLiter: price,
          cost: computedCost,
          mileage
        });
      } else {
        await VehicleService.addFuelLog(vId, {
          ...fuelFormData,
          vehicleName: selectedVehicle.name,
          odometer: odo,
          liters: ltr,
          pricePerLiter: price,
          cost: computedCost,
          mileage
        }, activeUid);
      }

      setShowFuelModal(false);
      setEditingFuelLogId(null);
      setFuelFormData({
        date: new Date().toISOString().split('T')[0],
        fuelType: 'Petrol', odometer: '', liters: '', pricePerLiter: '', cost: '',
        isFullTank: true, station: '', receiptUrl: ''
      });
      fetchVehicleLogs(vId);
    } catch (e: any) {
      console.error('Error saving fuel log:', e);
      alert('Failed to save fuel log: ' + (e.message || e));
    }
  };

  const handleEditFuel = (log: any) => {
    setEditingFuelLogId(log._id || log.id);
    setFuelFormData({
      date: formatIsoDate(log.date),
      fuelType: log.fuelType || 'Petrol',
      odometer: log.odometer ? String(log.odometer) : '',
      liters: log.liters ? String(log.liters) : '',
      pricePerLiter: log.pricePerLiter ? String(log.pricePerLiter) : '',
      cost: log.cost ? String(log.cost) : '',
      isFullTank: typeof log.isFullTank === 'boolean' ? log.isFullTank : true,
      station: log.station || '',
      receiptUrl: log.receiptUrl || ''
    });
    setShowFuelModal(true);
  };

  // Save Service Log
  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicle) return;
    const vId = selectedVehicle._id || selectedVehicle.id;

    try {
      if (editingServiceLogId) {
        await VehicleService.updateServiceLog(vId, editingServiceLogId, {
          ...serviceFormData,
          vehicleName: selectedVehicle.name,
          odometer: Number(serviceFormData.odometer) || 0,
          cost: Number(serviceFormData.cost) || 0
        });
      } else {
        await VehicleService.addServiceLog(vId, {
          ...serviceFormData,
          vehicleName: selectedVehicle.name,
          odometer: Number(serviceFormData.odometer) || 0,
          cost: Number(serviceFormData.cost) || 0
        }, activeUid);
      }

      await VehicleService.updateVehicle(vId, {
        lastServiceOdo: Number(serviceFormData.odometer) || selectedVehicle.lastServiceOdo
      });

      setShowServiceModal(false);
      setEditingServiceLogId(null);
      setServiceFormData({
        date: new Date().toISOString().split('T')[0],
        serviceType: 'General Service', odometer: '', cost: '', garage: '', notes: '', receiptUrl: ''
      });
      fetchVehicleLogs(vId);
      fetchVehicles();
    } catch (e: any) {
      console.error('Error saving service log:', e);
      alert('Failed to save service log: ' + (e.message || e));
    }
  };

  const handleEditService = (log: any) => {
    setEditingServiceLogId(log._id || log.id);
    setServiceFormData({
      date: formatIsoDate(log.date),
      serviceType: log.serviceType || 'General Service',
      odometer: log.odometer ? String(log.odometer) : '',
      cost: log.cost ? String(log.cost) : '',
      garage: log.garage || '',
      notes: log.notes || '',
      receiptUrl: log.receiptUrl || ''
    });
    setShowServiceModal(true);
  };

  // Open Subsection Quick Edit Modal
  const openSubEdit = (type: string) => {
    if (!selectedVehicle) return;
    setSubEditType(type);
    if (type === 'rc') {
      setSubEditData({
        rcNumber: selectedVehicle.rcNumber || '',
        rcExpiry: formatIsoDate(selectedVehicle.rcExpiry),
        rcDocUrl: selectedVehicle.rcDocUrl || ''
      });
    } else if (type === 'insurance') {
      setSubEditData({
        insuranceProvider: selectedVehicle.insuranceProvider || '',
        insurancePolicyNumber: selectedVehicle.insurancePolicyNumber || '',
        insurancePremium: selectedVehicle.insurancePremium ? String(selectedVehicle.insurancePremium) : '',
        insuranceExpiry: formatIsoDate(selectedVehicle.insuranceExpiry),
        insuranceDocUrl: selectedVehicle.insuranceDocUrl || ''
      });
    } else if (type === 'puc') {
      setSubEditData({
        pucNumber: selectedVehicle.pucNumber || '',
        pucExpiry: formatIsoDate(selectedVehicle.pucExpiry),
        pucDocUrl: selectedVehicle.pucDocUrl || ''
      });
    } else if (type === 'license') {
      setSubEditData({
        drivingLicenceNo: selectedVehicle.drivingLicenceNo || '',
        drivingLicenceDocUrl: selectedVehicle.drivingLicenceDocUrl || ''
      });
    } else if (type === 'loan') {
      setSubEditData({
        financier: selectedVehicle.financier || '',
        loanAccountNo: selectedVehicle.loanAccountNo || ''
      });
    } else if (type === 'oil') {
      setSubEditData({
        engineOilType: selectedVehicle.engineOilType || '5W-30 Synthetic',
        lastOilChangeOdo: selectedVehicle.lastOilChangeOdo ? String(selectedVehicle.lastOilChangeOdo) : ''
      });
    } else if (type === 'tyre-battery') {
      setSubEditData({
        tyrePressureFront: String(selectedVehicle.tyrePressureFront || '32'),
        tyrePressureRear: String(selectedVehicle.tyrePressureRear || '34'),
        tyreBrand: selectedVehicle.tyreBrand || '',
        batteryMake: selectedVehicle.batteryMake || ''
      });
    } else if (type === 'reminders') {
      setSubEditData({
        nextServiceOdo: selectedVehicle.nextServiceOdo ? String(selectedVehicle.nextServiceOdo) : '',
        nextServiceDate: formatIsoDate(selectedVehicle.nextServiceDate)
      });
    }
  };

  const handleSaveSubEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicle) return;
    const vId = selectedVehicle._id || selectedVehicle.id;
    setSubEditSaving(true);
    try {
      const payload: any = { ...subEditData };
      if (payload.insurancePremium !== undefined) payload.insurancePremium = Number(payload.insurancePremium) || 0;
      if (payload.lastOilChangeOdo !== undefined) payload.lastOilChangeOdo = Number(payload.lastOilChangeOdo) || 0;
      if (payload.nextServiceOdo !== undefined) payload.nextServiceOdo = Number(payload.nextServiceOdo) || 0;
      await VehicleService.updateVehicle(vId, payload);
      setSubEditType(null);
      await fetchVehicles();
      if (vId) fetchVehicleLogs(vId);
    } catch (err: any) {
      console.error('Error updating subsection:', err);
      alert('Failed to update: ' + (err.message || err));
    } finally {
      setSubEditSaving(false);
    }
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === 'vehicle') {
        await VehicleService.deleteVehicle(deleteTarget.id);
        if (selectedVehicleId === deleteTarget.id) backToFleet();
        fetchVehicles();
      } else if (deleteTarget.type === 'fuel') {
        await VehicleService.deleteFuelLog(deleteTarget.id);
        if (selectedVehicleId) fetchVehicleLogs(selectedVehicleId);
      } else if (deleteTarget.type === 'service') {
        await VehicleService.deleteServiceLog(deleteTarget.id);
        if (selectedVehicleId) fetchVehicleLogs(selectedVehicleId);
      }
      setDeleteTarget(null);
    } catch (e) {
      console.error('Delete error:', e);
    }
  };

  // Stats calculations
  const totalFuelCost = fuelLogs.reduce((acc, curr) => acc + (Number(curr.cost) || 0), 0);
  const totalServiceCost = serviceLogs.reduce((acc, curr) => acc + (Number(curr.cost) || 0), 0);
  const totalVehicleExpense = totalFuelCost + totalServiceCost + (Number(selectedVehicle?.insurancePremium) || 0);

  const validMileageLogs = fuelLogs.filter(l => Number(l.mileage) > 0);
  const avgMileage = validMileageLogs.length > 0
    ? (validMileageLogs.reduce((acc, curr) => acc + Number(curr.mileage), 0) / validMileageLogs.length).toFixed(1)
    : 'N/A';

  // 14 Comprehensive Subsections for Vehicle Overview
  const vehicleSubsections = [
    {
      id: 'details',
      title: 'Vehicle Details & Specs',
      icon: <Car size={20} className="text-yellow-400" />,
      badge: selectedVehicle?.type || 'Specs',
      summary: `${selectedVehicle?.make || ''} ${selectedVehicle?.model || ''} (${selectedVehicle?.year || 'N/A'})`
    },
    {
      id: 'rc',
      title: 'RC Book (Registration)',
      icon: <FileText size={20} className="text-primary" />,
      badge: selectedVehicle?.rcNumber ? 'Active' : 'Missing',
      summary: selectedVehicle?.rcNumber || 'No RC registered'
    },
    {
      id: 'insurance',
      title: 'Insurance Policy',
      icon: <ShieldCheck size={20} className="text-green-400" />,
      badge: selectedVehicle?.insuranceExpiry ? `${calculateDaysRemaining(selectedVehicle.insuranceExpiry).daysRemaining}d left` : 'No Policy',
      summary: selectedVehicle?.insuranceProvider ? `${selectedVehicle.insuranceProvider} • ₹${selectedVehicle.insurancePremium || 0}` : 'Configure policy'
    },
    {
      id: 'puc',
      title: 'PUC Certificate',
      icon: <Droplet size={20} className="text-emerald-400" />,
      badge: selectedVehicle?.pucExpiry ? `${calculateDaysRemaining(selectedVehicle.pucExpiry).daysRemaining}d left` : 'No PUC',
      summary: selectedVehicle?.pucNumber || 'Pollution under control doc'
    },
    {
      id: 'license',
      title: 'Driving Licence & Docs',
      icon: <Shield size={20} className="text-blue-400" />,
      badge: selectedVehicle?.drivingLicenceNo ? 'Saved' : 'Add',
      summary: selectedVehicle?.drivingLicenceNo || 'Driver permit and documents'
    },
    {
      id: 'loan',
      title: 'Loan & Hypothecation',
      icon: <Landmark size={20} className="text-amber-400" />,
      badge: selectedVehicle?.financier ? 'Financed' : 'Owned',
      summary: selectedVehicle?.financier ? `${selectedVehicle.financier} • Acc: ${selectedVehicle.loanAccountNo || '—'}` : 'Self-owned vehicle'
    },
    {
      id: 'service',
      title: 'Service & Maintenance',
      icon: <Wrench size={20} className="text-yellow-400" />,
      badge: `${serviceLogs.length} Records`,
      summary: `Total Spent: ₹${totalServiceCost.toLocaleString('en-IN')}`
    },
    {
      id: 'oil',
      title: 'Engine Oil & Filter History',
      icon: <Droplet size={20} className="text-purple-400" />,
      badge: selectedVehicle?.engineOilType || '5W-30',
      summary: `Last changed at ${selectedVehicle?.lastOilChangeOdo || selectedVehicle?.lastServiceOdo || 0} km`
    },
    {
      id: 'fuel',
      title: 'Fuel Log & Mileage',
      icon: <Fuel size={20} className="text-primary" />,
      badge: `${avgMileage} km/L`,
      summary: `${fuelLogs.length} fill-ups • ₹${totalFuelCost.toLocaleString('en-IN')}`
    },
    {
      id: 'tyre-battery',
      title: 'Tyre & Battery Maintenance',
      icon: <Battery size={20} className="text-teal-400" />,
      badge: `${selectedVehicle?.tyrePressureFront || 32}/${selectedVehicle?.tyrePressureRear || 34} PSI`,
      summary: `Battery: ${selectedVehicle?.batteryMake || 'Standard'} • Tyres: ${selectedVehicle?.tyreBrand || 'Stock'}`
    },
    {
      id: 'repairs',
      title: 'Repairs & Spare Parts',
      icon: <Wrench size={20} className="text-red-400" />,
      badge: `${serviceLogs.filter(s => s.serviceType.includes('Repair') || s.serviceType.includes('Brake') || s.serviceType.includes('Clutch')).length} Jobs`,
      summary: 'Breakdowns, part swaps & invoices'
    },
    {
      id: 'expenses',
      title: 'Vehicle Expenses Breakdown',
      icon: <IndianRupee size={20} className="text-green-400" />,
      badge: `₹${totalVehicleExpense.toLocaleString('en-IN')}`,
      summary: 'Aggregated fuel, repairs & insurance'
    },
    {
      id: 'documents',
      title: 'Uploaded Documents Gallery',
      icon: <FolderOpen size={20} className="text-cyan-400" />,
      badge: `${[selectedVehicle?.rcDocUrl, selectedVehicle?.insuranceDocUrl, selectedVehicle?.pucDocUrl, selectedVehicle?.drivingLicenceDocUrl].filter(Boolean).length} Cloud Docs`,
      summary: 'Secure cloud certificates & invoices'
    },
    {
      id: 'reminders',
      title: 'Renewal & Service Reminders',
      icon: <Clock size={20} className="text-orange-400" />,
      badge: 'Alerts',
      summary: `Target Service: ${selectedVehicle?.nextServiceOdo || '—'} km`
    },
    {
      id: 'reports',
      title: 'Vehicle Reports & Export',
      icon: <BarChart3 size={20} className="text-primary" />,
      badge: 'CSV',
      summary: 'Download maintenance & fuel logs'
    }
  ];

  if (loading && !selectedVehicle && vehicles.length === 0) {
    return <LoadingSpinner message="Loading vehicle fleet records..." />;
  }

  // =========================================================================
  // LEVEL 3: DEDICATED SUBSECTION VIEW
  // =========================================================================
  if (selectedVehicle && activeSubsection) {
    const activeSubObj = vehicleSubsections.find(s => s.id === activeSubsection) || {
      id: activeSubsection,
      title: activeSubsection.toUpperCase(),
      icon: <Car size={20} className="text-yellow-400" />
    };

    return (
      <div className="space-y-6 pb-12">
        {/* Strict single-level back: returns to Vehicle Overview (?vehicleId=...) */}
        <MobilePageHeader
          title={activeSubObj.title}
          parentLabel={selectedVehicle.name}
          fallbackPath={`/vehicles?vehicleId=${selectedVehicle._id}`}
          onBack={backToVehicleOverview}
          icon={activeSubObj.icon}
          subtitle={`${selectedVehicle.name} (${selectedVehicle.licensePlate})`}
          actions={
            activeSubsection === 'fuel' ? (
              <button
                type="button"
                onClick={() => setShowFuelModal(true)}
                className="bg-primary text-background px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-neon-primary-sm min-h-[44px] active:scale-95"
              >
                <Plus size={16} /> Log Fuel
              </button>
            ) : activeSubsection === 'service' || activeSubsection === 'repairs' ? (
              <button
                type="button"
                onClick={() => setShowServiceModal(true)}
                className="bg-yellow-400 text-black px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md min-h-[44px] active:scale-95"
              >
                <Plus size={16} /> Log Service
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleEditVehicle(selectedVehicle)}
                className="px-3 py-2 bg-surface border border-glass rounded-xl text-xs font-semibold text-textMain flex items-center gap-1.5 hover:bg-surfaceLight min-h-[44px] active:scale-95"
              >
                <Edit2 size={14} className="text-primary" /> Edit Specs
              </button>
            )
          }
        />

        {/* SUBSECTION 1: DETAILS & SPECS */}
        {activeSubsection === 'details' && (
          <div className="glass-panel p-5 space-y-4">
            <h3 className="text-base font-bold text-textMain flex items-center gap-2">
              <Car size={18} className="text-yellow-400" /> Technical & Registration Specs
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 rounded-xl bg-surface border border-glass">
                <span className="text-textMuted block mb-1">Vehicle Name</span>
                <strong className="text-textMain text-sm">{selectedVehicle.name}</strong>
              </div>
              <div className="p-3 rounded-xl bg-surface border border-glass">
                <span className="text-textMuted block mb-1">License Plate</span>
                <strong className="font-mono text-primary text-sm font-bold">{selectedVehicle.licensePlate}</strong>
              </div>
              <div className="p-3 rounded-xl bg-surface border border-glass">
                <span className="text-textMuted block mb-1">Category & Type</span>
                <strong className="text-textMain text-sm">{selectedVehicle.type}</strong>
              </div>
              <div className="p-3 rounded-xl bg-surface border border-glass">
                <span className="text-textMuted block mb-1">Make / Model / Year</span>
                <strong className="text-textMain text-sm">{selectedVehicle.make || '—'} {selectedVehicle.model} ({selectedVehicle.year || 'N/A'})</strong>
              </div>
              <div className="p-3 rounded-xl bg-surface border border-glass">
                <span className="text-textMuted block mb-1">Color</span>
                <strong className="text-textMain text-sm">{selectedVehicle.color || 'Not specified'}</strong>
              </div>
              <div className="p-3 rounded-xl bg-surface border border-glass">
                <span className="text-textMuted block mb-1">Current Odometer</span>
                <strong className="font-mono text-yellow-400 text-sm">{Number(selectedVehicle.lastServiceOdo || 0).toLocaleString()} km</strong>
              </div>
            </div>
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => handleEditVehicle(selectedVehicle)}
                className="px-4 py-2.5 bg-primary text-background rounded-xl text-xs font-semibold flex items-center gap-2 shadow-neon-primary-sm min-h-[44px]"
              >
                <Edit2 size={15} /> Update Specifications
              </button>
            </div>
          </div>
        )}

        {/* SUBSECTION 2: RC BOOK */}
        {activeSubsection === 'rc' && (
          <div className="glass-panel p-5 space-y-4 border-t-4 border-t-primary">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-textMain">Registration Certificate (RC Book)</h3>
                <p className="text-xs text-textMuted">Official motor vehicle registration record</p>
              </div>
              <span className="font-mono text-primary font-bold text-xs bg-primary/10 px-2.5 py-1 rounded-lg border border-primary/20">
                {selectedVehicle.rcNumber || 'Pending'}
              </span>
            </div>

            <div className="space-y-3 text-xs divide-y divide-glass">
              <div className="flex justify-between pt-2">
                <span className="text-textMuted">RC Number:</span>
                <strong className="font-mono text-textMain">{selectedVehicle.rcNumber || 'Not recorded'}</strong>
              </div>
              <div className="flex justify-between pt-2">
                <span className="text-textMuted">Validity / Expiry:</span>
                <strong className="text-textMain">{selectedVehicle.rcExpiry ? new Date(selectedVehicle.rcExpiry).toLocaleDateString() : 'N/A'}</strong>
              </div>
            </div>

            <div className="pt-3 border-t border-glass flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => openSubEdit('rc')}
                className="flex-1 py-3 bg-primary text-background rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-neon-primary-sm min-h-[44px]"
              >
                <Edit2 size={15} /> Update RC Details
              </button>
              {selectedVehicle.rcDocUrl && (
                <a
                  href={selectedVehicle.rcDocUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="py-3 px-4 bg-primary/20 text-primary rounded-xl text-xs font-semibold flex items-center justify-center gap-2 hover:bg-primary/30 min-h-[44px]"
                >
                  <ExternalLink size={16} /> View Cloud RC ↗
                </a>
              )}
            </div>
          </div>
        )}

        {/* SUBSECTION 3: INSURANCE POLICY */}
        {activeSubsection === 'insurance' && (
          <div className="glass-panel p-5 space-y-4 border-t-4 border-t-green-400">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-textMain">Comprehensive Insurance Policy</h3>
                <p className="text-xs text-textMuted">Vehicle protection & liability coverage</p>
              </div>
              {selectedVehicle.insuranceExpiry && (() => {
                const ins = calculateDaysRemaining(selectedVehicle.insuranceExpiry);
                return (
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${
                    ins.isOverdue ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                    ins.daysRemaining <= 30 ? 'bg-yellow-500/10 text-yellow-300 border-yellow-500/20' :
                    'bg-green-500/10 text-green-400 border-green-500/20'
                  }`}>
                    {ins.isOverdue ? 'EXPIRED' : `${ins.daysRemaining} days left`}
                  </span>
                );
              })()}
            </div>

            <div className="space-y-3 text-xs divide-y divide-glass">
              <div className="flex justify-between pt-2">
                <span className="text-textMuted">Provider:</span>
                <strong className="text-textMain">{selectedVehicle.insuranceProvider || '—'}</strong>
              </div>
              <div className="flex justify-between pt-2">
                <span className="text-textMuted">Policy Number:</span>
                <strong className="font-mono text-textMain">{selectedVehicle.insurancePolicyNumber || '—'}</strong>
              </div>
              <div className="flex justify-between pt-2">
                <span className="text-textMuted">Annual Premium:</span>
                <strong className="text-green-400 font-bold">₹{Number(selectedVehicle.insurancePremium || 0).toLocaleString('en-IN')}</strong>
              </div>
              <div className="flex justify-between pt-2">
                <span className="text-textMuted">Expiry Date:</span>
                <strong className="text-textMain">{selectedVehicle.insuranceExpiry ? new Date(selectedVehicle.insuranceExpiry).toLocaleDateString() : 'Not Set'}</strong>
              </div>
            </div>

            <div className="pt-3 border-t border-glass flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => openSubEdit('insurance')}
                className="flex-1 py-3 bg-green-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-md min-h-[44px]"
              >
                <Edit2 size={15} /> Update Policy Details
              </button>
              {selectedVehicle.insuranceDocUrl && (
                <a
                  href={selectedVehicle.insuranceDocUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="py-3 px-4 bg-green-500/20 text-green-400 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 hover:bg-green-500/30 min-h-[44px]"
                >
                  <ExternalLink size={16} /> View Policy PDF ↗
                </a>
              )}
            </div>
          </div>
        )}

        {/* SUBSECTION 4: PUC CERTIFICATE */}
        {activeSubsection === 'puc' && (
          <div className="glass-panel p-5 space-y-4 border-t-4 border-t-emerald-400">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-textMain">Pollution Under Control (PUC)</h3>
                <p className="text-xs text-textMuted">Emission test certificate</p>
              </div>
              {selectedVehicle.pucExpiry && (() => {
                const puc = calculateDaysRemaining(selectedVehicle.pucExpiry);
                return (
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${
                    puc.isOverdue ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                    puc.daysRemaining <= 30 ? 'bg-yellow-500/10 text-yellow-300 border-yellow-500/20' :
                    'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  }`}>
                    {puc.isOverdue ? 'EXPIRED' : `${puc.daysRemaining} days left`}
                  </span>
                );
              })()}
            </div>

            <div className="space-y-3 text-xs divide-y divide-glass">
              <div className="flex justify-between pt-2">
                <span className="text-textMuted">PUC Number:</span>
                <strong className="font-mono text-textMain">{selectedVehicle.pucNumber || '—'}</strong>
              </div>
              <div className="flex justify-between pt-2">
                <span className="text-textMuted">Expiry Date:</span>
                <strong className="text-textMain">{selectedVehicle.pucExpiry ? new Date(selectedVehicle.pucExpiry).toLocaleDateString() : 'Not Set'}</strong>
              </div>
            </div>

            <div className="pt-3 border-t border-glass flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => openSubEdit('puc')}
                className="flex-1 py-3 bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-md min-h-[44px]"
              >
                <Edit2 size={15} /> Update PUC Certificate
              </button>
              {selectedVehicle.pucDocUrl && (
                <a
                  href={selectedVehicle.pucDocUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="py-3 px-4 bg-emerald-500/20 text-emerald-400 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 min-h-[44px]"
                >
                  <ExternalLink size={16} /> View PUC Certificate ↗
                </a>
              )}
            </div>
          </div>
        )}

        {/* SUBSECTION 5: DRIVING LICENCE & PERMITS */}
        {activeSubsection === 'license' && (
          <div className="glass-panel p-5 space-y-4 border-t-4 border-t-blue-400">
            <h3 className="text-base font-bold text-textMain">Driving Licence & Permits</h3>
            <div className="space-y-3 text-xs divide-y divide-glass">
              <div className="flex justify-between pt-2">
                <span className="text-textMuted">Primary Licence No:</span>
                <strong className="font-mono text-textMain">{selectedVehicle.drivingLicenceNo || 'Not entered'}</strong>
              </div>
              <div className="flex justify-between pt-2">
                <span className="text-textMuted">Linked Operator:</span>
                <strong className="text-textMain">{user?.name || 'Owner'}</strong>
              </div>
            </div>
            <div className="pt-3 border-t border-glass flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => openSubEdit('license')}
                className="flex-1 py-3 bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-md min-h-[44px]"
              >
                <Edit2 size={15} /> Update Driving Licence
              </button>
              {selectedVehicle.drivingLicenceDocUrl && (
                <a
                  href={selectedVehicle.drivingLicenceDocUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="py-3 px-4 bg-blue-500/20 text-blue-400 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 min-h-[44px]"
                >
                  <ExternalLink size={16} /> View Licence Doc ↗
                </a>
              )}
            </div>
          </div>
        )}

        {/* SUBSECTION 6: LOAN & HYPOTHECATION */}
        {activeSubsection === 'loan' && (
          <div className="glass-panel p-5 space-y-4 border-t-4 border-t-amber-400">
            <h3 className="text-base font-bold text-textMain">Loan & Hypothecation Details</h3>
            <div className="space-y-3 text-xs divide-y divide-glass">
              <div className="flex justify-between pt-2">
                <span className="text-textMuted">Financier / Bank:</span>
                <strong className="text-textMain">{selectedVehicle.financier || 'None (Self-owned)'}</strong>
              </div>
              <div className="flex justify-between pt-2">
                <span className="text-textMuted">Loan Account Number:</span>
                <strong className="font-mono text-textMain">{selectedVehicle.loanAccountNo || '—'}</strong>
              </div>
            </div>
            <div className="pt-2 flex justify-between gap-3">
              <button
                type="button"
                onClick={() => navigate('/loans')}
                className="flex-1 py-2.5 bg-surface border border-glass rounded-xl text-xs font-semibold text-primary hover:bg-surfaceLight min-h-[44px]"
              >
                Open Loan Manager ↗
              </button>
              <button
                type="button"
                onClick={() => openSubEdit('loan')}
                className="px-4 py-2.5 bg-primary text-background rounded-xl text-xs font-semibold min-h-[44px]"
              >
                <Edit2 size={14} className="inline mr-1" /> Edit Loan Specs
              </button>
            </div>
          </div>
        )}

        {/* SUBSECTION 7 & 11: SERVICE, MAINTENANCE & REPAIRS */}
        {(activeSubsection === 'service' || activeSubsection === 'repairs') && (
          <div className="space-y-4">
            {serviceLogs.length === 0 ? (
              <EmptyState
                icon={Wrench}
                title="No service records logged"
                description="Keep tabs on oil changes, tyre rotations, brake pad repairs, and garage invoices."
                actionText="Log First Service"
                onAction={() => setShowServiceModal(true)}
              />
            ) : (
              <div className="space-y-3">
                {serviceLogs.map((log: any) => (
                  <div key={log._id} className="glass-panel p-4 border-l-4 border-l-yellow-400 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-sm text-textMain">{log.serviceType}</h4>
                        <p className="text-[11px] text-textMuted">{new Date(log.date).toLocaleDateString()} • {log.garage || 'Workshop'}</p>
                      </div>
                      <span className="text-sm font-bold text-yellow-400">₹{Number(log.cost).toLocaleString('en-IN')}</span>
                    </div>

                    {log.notes && (
                      <p className="text-xs text-textMuted bg-surface/60 p-2.5 rounded-lg border border-glass">
                        {log.notes}
                      </p>
                    )}

                    <div className="flex items-center justify-between text-xs pt-2 border-t border-glass text-textMuted">
                      <span>Odometer: <strong className="text-textMain">{Number(log.odometer || 0).toLocaleString()} km</strong></span>
                      <div className="flex items-center gap-2">
                        {log.receiptUrl && (
                          <a href={log.receiptUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline font-medium min-h-[36px] flex items-center">
                            Invoice ↗
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => handleEditService(log)}
                          className="text-textMuted hover:text-yellow-400 p-1 min-h-[44px] min-w-[44px] flex items-center justify-center"
                          aria-label="Edit service log"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget({ id: log._id, type: 'service' })}
                          className="text-red-400 hover:text-red-300 p-1 min-h-[44px] min-w-[44px] flex items-center justify-center"
                          aria-label="Delete service log"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SUBSECTION 8: ENGINE OIL & FILTER */}
        {activeSubsection === 'oil' && (
          <div className="glass-panel p-5 space-y-4 border-t-4 border-t-purple-400">
            <h3 className="text-base font-bold text-textMain">Engine Oil & Filter Specifications</h3>
            <div className="space-y-3 text-xs divide-y divide-glass">
              <div className="flex justify-between pt-2">
                <span className="text-textMuted">Recommended Oil Grade:</span>
                <strong className="text-textMain">{selectedVehicle.engineOilType || '5W-30 Full Synthetic'}</strong>
              </div>
              <div className="flex justify-between pt-2">
                <span className="text-textMuted">Last Change Odometer:</span>
                <strong className="font-mono text-purple-400 font-bold">{Number(selectedVehicle.lastOilChangeOdo || selectedVehicle.lastServiceOdo || 0).toLocaleString()} km</strong>
              </div>
              <div className="flex justify-between pt-2">
                <span className="text-textMuted">Interval Recommendation:</span>
                <strong className="text-textMain">Every 10,000 km or 12 months</strong>
              </div>
            </div>
            <div className="pt-3 border-t border-glass flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => openSubEdit('oil')}
                className="flex-1 py-3 bg-purple-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 min-h-[44px]"
              >
                <Edit2 size={15} /> Update Oil Specifications
              </button>
              <button
                type="button"
                onClick={() => setShowServiceModal(true)}
                className="py-3 px-4 bg-primary text-background rounded-xl text-xs font-semibold shadow-neon-primary-sm min-h-[44px]"
              >
                Record Service
              </button>
            </div>
          </div>
        )}

        {/* SUBSECTION 9: FUEL LOG & MILEAGE */}
        {activeSubsection === 'fuel' && (
          <div className="space-y-4">
            {fuelLogs.length === 0 ? (
              <EmptyState
                icon={Fuel}
                title="No fuel entries recorded"
                description="Add fuel fill-up logs to automatically calculate vehicle mileage in km/L."
                actionText="Record Fill-up"
                onAction={() => setShowFuelModal(true)}
              />
            ) : (
              <div className="space-y-3">
                {fuelLogs.map((log: any) => (
                  <div key={log._id} className="glass-panel p-4 border-l-4 border-l-primary space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-textMain">{log.liters} L {log.fuelType}</span>
                          {Number(log.mileage) > 0 && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/20 text-primary font-bold">
                              {log.mileage} km/L
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-textMuted">{new Date(log.date).toLocaleDateString()} • {log.station || 'Fuel Station'}</p>
                      </div>
                      <span className="text-sm font-bold text-green-400">₹{Number(log.cost).toLocaleString('en-IN')}</span>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-2 border-t border-glass text-textMuted">
                      <span>Odo: <strong className="text-textMain">{Number(log.odometer).toLocaleString()} km</strong> (₹{log.pricePerLiter}/L)</span>
                      <div className="flex items-center gap-2">
                        {log.receiptUrl && (
                          <a href={log.receiptUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline text-xs min-h-[36px] flex items-center">
                            Receipt ↗
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => handleEditFuel(log)}
                          className="text-textMuted hover:text-primary p-1 min-h-[44px] min-w-[44px] flex items-center justify-center"
                          aria-label="Edit fuel log"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget({ id: log._id, type: 'fuel' })}
                          className="text-red-400 hover:text-red-300 p-1 min-h-[44px] min-w-[44px] flex items-center justify-center"
                          aria-label="Delete fuel log"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SUBSECTION 10: TYRE & BATTERY */}
        {activeSubsection === 'tyre-battery' && (
          <div className="glass-panel p-5 space-y-4 border-t-4 border-t-teal-400">
            <h3 className="text-base font-bold text-textMain">Tyre Pressures & Battery Health</h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-surface rounded-xl border border-glass">
                <span className="text-textMuted block mb-1">Front Tyre Pressure</span>
                <strong className="text-teal-400 text-sm font-bold">{selectedVehicle.tyrePressureFront || '32'} PSI</strong>
              </div>
              <div className="p-3 bg-surface rounded-xl border border-glass">
                <span className="text-textMuted block mb-1">Rear Tyre Pressure</span>
                <strong className="text-teal-400 text-sm font-bold">{selectedVehicle.tyrePressureRear || '34'} PSI</strong>
              </div>
              <div className="p-3 bg-surface rounded-xl border border-glass">
                <span className="text-textMuted block mb-1">Tyre Brand</span>
                <strong className="text-textMain text-sm">{selectedVehicle.tyreBrand || 'OEM / Standard'}</strong>
              </div>
              <div className="p-3 bg-surface rounded-xl border border-glass">
                <span className="text-textMuted block mb-1">Battery Make</span>
                <strong className="text-textMain text-sm">{selectedVehicle.batteryMake || 'Exide / Amaron'}</strong>
              </div>
            </div>
            <div className="pt-3 border-t border-glass">
              <button
                type="button"
                onClick={() => openSubEdit('tyre-battery')}
                className="w-full py-3 bg-teal-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 min-h-[44px]"
              >
                <Edit2 size={15} /> Update Tyre Pressures & Battery Specs
              </button>
            </div>
          </div>
        )}

        {/* SUBSECTION 12: EXPENSES BREAKDOWN */}
        {activeSubsection === 'expenses' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="glass-panel p-4 border-t-4 border-t-green-400">
                <span className="text-xs text-textMuted">Fuel Total</span>
                <div className="text-xl font-bold text-green-400 mt-1">₹{totalFuelCost.toLocaleString('en-IN')}</div>
              </div>
              <div className="glass-panel p-4 border-t-4 border-t-yellow-400">
                <span className="text-xs text-textMuted">Maintenance Total</span>
                <div className="text-xl font-bold text-yellow-400 mt-1">₹{totalServiceCost.toLocaleString('en-IN')}</div>
              </div>
              <div className="glass-panel p-4 border-t-4 border-t-primary">
                <span className="text-xs text-textMuted">Insurance Premium</span>
                <div className="text-xl font-bold text-primary mt-1">₹{Number(selectedVehicle.insurancePremium || 0).toLocaleString('en-IN')}</div>
              </div>
            </div>

            <div className="glass-panel p-5">
              <h3 className="text-sm font-bold text-textMain mb-2">Lifetime Vehicle Cost</h3>
              <div className="text-3xl font-bold text-textMain">₹{totalVehicleExpense.toLocaleString('en-IN')}</div>
              <p className="text-xs text-textMuted mt-1">Cumulative expenditure logged across all services and fuel.</p>
            </div>
          </div>
        )}

        {/* SUBSECTION 13: UPLOADED DOCUMENTS */}
        {activeSubsection === 'documents' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { title: 'RC Certificate', url: selectedVehicle.rcDocUrl, type: 'RC' },
              { title: 'Insurance Policy', url: selectedVehicle.insuranceDocUrl, type: 'Insurance' },
              { title: 'PUC Certificate', url: selectedVehicle.pucDocUrl, type: 'PUC' },
              { title: 'Driving Licence', url: selectedVehicle.drivingLicenceDocUrl, type: 'DL' }
            ].map(doc => (
              <div key={doc.type} className="glass-panel p-4 flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-xs text-textMain mb-1">{doc.title}</h4>
                  <p className="text-[10px] text-textMuted">{doc.url ? 'Available in Cloud Storage' : 'Not uploaded'}</p>
                </div>
                <div className="pt-3 mt-3 border-t border-glass">
                  {doc.url ? (
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full py-2 bg-primary/20 text-primary rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 min-h-[44px]"
                    >
                      <ExternalLink size={14} /> Open Document ↗
                    </a>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleEditVehicle(selectedVehicle)}
                      className="w-full py-2 bg-surface border border-glass rounded-xl text-xs font-medium text-textMuted hover:text-textMain min-h-[44px]"
                    >
                      Upload Now
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* SUBSECTION 14: RENEWALS & REMINDERS */}
        {activeSubsection === 'reminders' && (
          <div className="glass-panel p-5 space-y-4">
            <h3 className="text-base font-bold text-textMain flex items-center gap-2">
              <Clock size={18} className="text-yellow-400" /> Upcoming Deadlines & Maintenance
            </h3>
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-surface border border-glass flex items-center justify-between">
                <div>
                  <p className="font-semibold text-xs text-textMain">Next Scheduled Service</p>
                  <p className="text-[11px] text-textMuted">Odo Target: {selectedVehicle.nextServiceOdo || '—'} km</p>
                </div>
                <span className="text-xs font-bold text-primary font-mono">{selectedVehicle.nextServiceDate ? new Date(selectedVehicle.nextServiceDate).toLocaleDateString() : 'Pending'}</span>
              </div>
              <div className="p-3 rounded-xl bg-surface border border-glass flex items-center justify-between">
                <div>
                  <p className="font-semibold text-xs text-textMain">Insurance Expiry</p>
                  <p className="text-[11px] text-textMuted">Provider: {selectedVehicle.insuranceProvider || '—'}</p>
                </div>
                <span className="text-xs font-bold text-green-400 font-mono">{selectedVehicle.insuranceExpiry ? new Date(selectedVehicle.insuranceExpiry).toLocaleDateString() : 'No date'}</span>
              </div>
              <div className="p-3 rounded-xl bg-surface border border-glass flex items-center justify-between">
                <div>
                  <p className="font-semibold text-xs text-textMain">PUC Renewal</p>
                  <p className="text-[11px] text-textMuted">Emission check</p>
                </div>
                <span className="text-xs font-bold text-emerald-400 font-mono">{selectedVehicle.pucExpiry ? new Date(selectedVehicle.pucExpiry).toLocaleDateString() : 'No date'}</span>
              </div>
            </div>
            <div className="pt-3 border-t border-glass">
              <button
                type="button"
                onClick={() => openSubEdit('reminders')}
                className="w-full py-3 bg-orange-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 min-h-[44px]"
              >
                <Edit2 size={15} /> Configure Service Reminders
              </button>
            </div>
          </div>
        )}

        {/* SUBSECTION 15: REPORTS & EXPORT */}
        {activeSubsection === 'reports' && (
          <div className="glass-panel p-5 space-y-4">
            <h3 className="text-base font-bold text-textMain flex items-center gap-2">
              <BarChart3 size={18} className="text-primary" /> Vehicle Audit & Data Export
            </h3>
            <p className="text-xs text-textMuted leading-relaxed">
              Export all verified fuel logs, service workshop records, and maintenance expenses for {selectedVehicle.name} to CSV format.
            </p>
            <button
              type="button"
              onClick={() => exportToCSV([...fuelLogs, ...serviceLogs], `${selectedVehicle.name}_Logs`)}
              className="px-4 py-3 bg-primary text-background rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-neon-primary-sm min-h-[44px]"
            >
              <Download size={16} /> Export All Logs to CSV
            </button>
          </div>
        )}

        {renderModals()}
      </div>
    );
  }

  // =========================================================================
  // LEVEL 2: DEDICATED VEHICLE OVERVIEW (Selected Vehicle)
  // =========================================================================
  if (selectedVehicle) {
    return (
      <div className="space-y-6 pb-12">
        {/* Strict single-level back: returns to Vehicle Fleet (/vehicles) */}
        <MobilePageHeader
          title={selectedVehicle.name}
          parentLabel="Vehicle Fleet"
          fallbackPath="/vehicles"
          onBack={backToFleet}
          icon={<Car className="text-yellow-400" size={24} />}
          badge={selectedVehicle.licensePlate}
          subtitle={`${selectedVehicle.type} • ${selectedVehicle.make || ''} ${selectedVehicle.model || ''}`}
          actions={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleEditVehicle(selectedVehicle)}
                className="p-2.5 rounded-xl bg-surface border border-glass text-textMuted hover:text-textMain min-h-[44px] min-w-[44px] flex items-center justify-center"
                title="Edit Vehicle"
              >
                <Edit2 size={16} />
              </button>
              <button
                type="button"
                onClick={() => setDeleteTarget({ id: selectedVehicle._id, type: 'vehicle' })}
                className="p-2.5 rounded-xl bg-surface border border-glass text-textMuted hover:text-red-400 min-h-[44px] min-w-[44px] flex items-center justify-center"
                title="Delete Vehicle"
              >
                <Trash2 size={16} />
              </button>
            </div>
          }
        />

        {/* Hero KPI Summary Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="glass-panel p-3.5 border-t-2 border-t-yellow-400">
            <span className="text-[10px] text-textMuted font-medium uppercase">Total Cost</span>
            <div className="text-base sm:text-xl font-bold text-textMain mt-0.5">₹{totalVehicleExpense.toLocaleString('en-IN')}</div>
            <p className="text-[10px] text-textMuted mt-0.5">Fuel + Service + Policy</p>
          </div>
          <div className="glass-panel p-3.5 border-t-2 border-t-primary">
            <span className="text-[10px] text-textMuted font-medium uppercase">Mileage</span>
            <div className="text-base sm:text-xl font-bold text-primary mt-0.5">{avgMileage} km/L</div>
            <p className="text-[10px] text-textMuted mt-0.5">{validMileageLogs.length} verified fill-ups</p>
          </div>
          <div className="glass-panel p-3.5 border-t-2 border-t-green-400">
            <span className="text-[10px] text-textMuted font-medium uppercase">Fuel Spent</span>
            <div className="text-base sm:text-xl font-bold text-green-400 mt-0.5">₹{totalFuelCost.toLocaleString('en-IN')}</div>
            <p className="text-[10px] text-textMuted mt-0.5">{fuelLogs.length} logs</p>
          </div>
          <div className="glass-panel p-3.5 border-t-2 border-t-red-400">
            <span className="text-[10px] text-textMuted font-medium uppercase">Maintenance</span>
            <div className="text-base sm:text-xl font-bold text-red-400 mt-0.5">₹{totalServiceCost.toLocaleString('en-IN')}</div>
            <p className="text-[10px] text-textMuted mt-0.5">{serviceLogs.length} visits</p>
          </div>
        </div>

        {/* 
          14 SUBSECTION NAVIGATION GRID
          Displays all subsections as tappable cards.
          Tapping pushes ?vehicleId=...&sub=... to router history.
        */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-textMuted flex items-center gap-1.5">
              <Sparkles size={14} className="text-primary" /> Vehicle Subsections & Records
            </h2>
            <span className="text-[11px] text-textMuted">Tap to open detail</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {vehicleSubsections.map((sub) => (
              <motion.button
                key={sub.id}
                type="button"
                whileTap={{ scale: 0.98 }}
                onClick={() => openSubsection(sub.id)}
                className="w-full text-left glass-panel p-4 border border-glass hover:border-primary/40 hover:bg-surfaceLight transition-all active:scale-95 flex items-center justify-between gap-3 min-h-[64px] group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2.5 rounded-xl bg-surface border border-glass group-hover:scale-105 transition-transform shrink-0">
                    {sub.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-xs sm:text-sm text-textMain group-hover:text-primary transition-colors truncate">
                        {sub.title}
                      </h3>
                      {sub.badge && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-surface border border-glass text-textMuted group-hover:text-textMain shrink-0">
                          {sub.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-textMuted truncate mt-0.5">
                      {sub.summary}
                    </p>
                  </div>
                </div>

                <ChevronRight size={16} className="text-textMuted group-hover:text-primary transition-colors shrink-0" />
              </motion.button>
            ))}
          </div>
        </div>

        {renderModals()}
      </div>
    );
  }

  // =========================================================================
  // LEVEL 1: FLEET OVERVIEW (Vehicle Manager Fleet Page)
  // =========================================================================
  return (
    <div className="space-y-6 pb-12">
      {/* Strict single-level back: returns to Dashboard (/) */}
      <MobilePageHeader
        title="Vehicle Manager"
        parentLabel="Dashboard"
        fallbackPath="/"
        icon={<Car className="text-yellow-400" size={24} />}
        subtitle="Manage fleet, RC books, insurance, PUC, fuel logs, and service reminders."
        actions={
          <button
            type="button"
            onClick={() => { setEditVehicleId(null); resetVehicleForm(); setShowVehicleModal(true); }}
            className="bg-primary text-background px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-neon-primary-sm min-h-[44px] active:scale-95"
          >
            <Plus size={16} /> Add Vehicle
          </button>
        }
      />

      {vehicles.length === 0 ? (
        <EmptyState
          icon={Car}
          title="No vehicles in registry"
          description="Register your cars, bikes, scooters, or tractors to track insurance renewals, fuel logs, and service history."
          actionText="Register Vehicle"
          onAction={() => { setEditVehicleId(null); resetVehicleForm(); setShowVehicleModal(true); }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vehicles.map((v: any) => {
            const insDays = calculateDaysRemaining(v.insuranceExpiry);
            const pucDays = calculateDaysRemaining(v.pucExpiry);

            return (
              <motion.div
                key={v._id}
                whileTap={{ scale: 0.98 }}
                onClick={() => openVehicle(v)}
                className="glass-panel p-5 cursor-pointer border-t-4 border-t-yellow-400 hover:shadow-neon-primary-sm transition-all flex flex-col justify-between group active:scale-95"
              >
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2.5 bg-surface border border-glass rounded-xl text-yellow-400 shrink-0 group-hover:scale-105 transition-transform">
                        <Car size={22} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-base font-bold text-textMain group-hover:text-primary transition-colors truncate">{v.name}</h3>
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-background/60 border border-glass text-primary font-bold">
                          {v.licensePlate}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => handleEditVehicle(v)}
                        className="p-2 text-textMuted hover:text-primary transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                        aria-label="Edit vehicle"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget({ id: v._id, type: 'vehicle' })}
                        className="p-2 text-textMuted hover:text-red-400 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                        aria-label="Delete vehicle"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 py-2.5 border-y border-glass text-xs">
                    <div className="flex justify-between">
                      <span className="text-textMuted">Type:</span>
                      <span className="font-medium text-textMain">{v.type} {v.make ? `• ${v.make}` : ''}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-textMuted">Insurance:</span>
                      <span className={`font-semibold ${insDays.isOverdue ? 'text-red-400' : insDays.daysRemaining <= 30 ? 'text-yellow-400' : 'text-textMain'}`}>
                        {v.insuranceExpiry ? `${insDays.daysRemaining}d left` : 'Not set'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-textMuted">PUC Expiry:</span>
                      <span className={`font-semibold ${pucDays.isOverdue ? 'text-red-400' : pucDays.daysRemaining <= 30 ? 'text-yellow-400' : 'text-textMain'}`}>
                        {v.pucExpiry ? `${pucDays.daysRemaining}d left` : 'Not set'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-2 flex items-center justify-between text-xs text-primary font-semibold">
                  <span>Open Vehicle Overview</span>
                  <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {renderModals()}
    </div>
  );

  function renderModals() {
    return (
      <>
        {/* MODAL: ADD / EDIT VEHICLE (Mobile optimized single column with touch inputs) */}
        <AnimatePresence>
        {showVehicleModal && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto" onClick={() => setShowVehicleModal(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-lg glass-panel p-5 sm:p-6 my-8 max-h-[90vh] overflow-y-auto custom-scrollbar"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4 border-b border-glass pb-3">
                <h2 className="text-lg font-bold text-textMain">
                  {editVehicleId ? 'Edit Vehicle Specifications' : 'Register New Vehicle'}
                </h2>
                <button
                  type="button"
                  onClick={() => setShowVehicleModal(false)}
                  className="p-2 text-textMuted hover:text-textMain min-h-[44px] min-w-[44px] flex items-center justify-center -mr-2"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveVehicle} className="space-y-4 text-xs">
                <div>
                  <label className="block text-textMuted font-semibold mb-1">Vehicle Name *</label>
                  <input
                    type="text"
                    required
                    value={vehicleFormData.name}
                    onChange={(e) => setVehicleFormData({ ...vehicleFormData, name: e.target.value })}
                    placeholder="e.g. My Royal Enfield / Honda City"
                    className="w-full p-3 rounded-xl bg-surface border border-glass text-textMain outline-none focus:border-primary min-h-[44px]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-textMuted font-semibold mb-1">Type</label>
                    <select
                      value={vehicleFormData.type}
                      onChange={(e) => setVehicleFormData({ ...vehicleFormData, type: e.target.value })}
                      className="w-full p-3 rounded-xl bg-surface border border-glass text-textMain outline-none min-h-[44px]"
                    >
                      {VEHICLE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-textMuted font-semibold mb-1">License Plate *</label>
                    <input
                      type="text"
                      required
                      value={vehicleFormData.licensePlate}
                      onChange={(e) => setVehicleFormData({ ...vehicleFormData, licensePlate: e.target.value.toUpperCase() })}
                      placeholder="e.g. TN 01 AB 1234"
                      className="w-full p-3 rounded-xl bg-surface border border-glass font-mono font-bold text-primary outline-none min-h-[44px]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-textMuted font-semibold mb-1">Make</label>
                    <input
                      type="text"
                      value={vehicleFormData.make}
                      onChange={(e) => setVehicleFormData({ ...vehicleFormData, make: e.target.value })}
                      placeholder="Honda"
                      className="w-full p-2.5 rounded-xl bg-surface border border-glass text-textMain min-h-[44px]"
                    />
                  </div>
                  <div>
                    <label className="block text-textMuted font-semibold mb-1">Model</label>
                    <input
                      type="text"
                      value={vehicleFormData.model}
                      onChange={(e) => setVehicleFormData({ ...vehicleFormData, model: e.target.value })}
                      placeholder="City"
                      className="w-full p-2.5 rounded-xl bg-surface border border-glass text-textMain min-h-[44px]"
                    />
                  </div>
                  <div>
                    <label className="block text-textMuted font-semibold mb-1">Year</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={vehicleFormData.year}
                      onChange={(e) => setVehicleFormData({ ...vehicleFormData, year: e.target.value })}
                      placeholder="2023"
                      className="w-full p-2.5 rounded-xl bg-surface border border-glass text-textMain min-h-[44px]"
                    />
                  </div>
                </div>

                <div className="p-3 bg-surface/50 rounded-xl border border-glass space-y-3">
                  <h4 className="font-bold text-textMain flex items-center gap-1.5">
                    <ShieldCheck size={14} className="text-green-400" /> Insurance & RC Expiries
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-textMuted mb-1">Insurance Expiry</label>
                      <input
                        type="date"
                        value={vehicleFormData.insuranceExpiry}
                        onChange={(e) => setVehicleFormData({ ...vehicleFormData, insuranceExpiry: e.target.value })}
                        className="w-full p-2.5 rounded-xl bg-surface border border-glass text-textMain min-h-[44px]"
                      />
                    </div>
                    <div>
                      <label className="block text-textMuted mb-1">PUC Expiry</label>
                      <input
                        type="date"
                        value={vehicleFormData.pucExpiry}
                        onChange={(e) => setVehicleFormData({ ...vehicleFormData, pucExpiry: e.target.value })}
                        className="w-full p-2.5 rounded-xl bg-surface border border-glass text-textMain min-h-[44px]"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-glass">
                  <button
                    type="button"
                    onClick={() => setShowVehicleModal(false)}
                    className="px-4 py-2.5 rounded-xl bg-surface border border-glass text-textMuted hover:text-textMain min-h-[44px]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-primary text-background font-bold shadow-neon-primary-sm min-h-[44px]"
                  >
                    {editVehicleId ? 'Update Vehicle' : 'Register Vehicle'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: FUEL FILL-UP */}
      <AnimatePresence>
        {showFuelModal && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 overflow-y-auto" onClick={() => setShowFuelModal(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md glass-panel p-5 my-8"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-base font-bold text-textMain mb-3 flex items-center gap-2">
                <Fuel size={18} className="text-primary" /> Record Fuel Fill-up
              </h2>
              <form onSubmit={handleSaveFuel} className="space-y-3 text-xs">
                <div>
                  <label className="block text-textMuted font-semibold mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={fuelFormData.date}
                    onChange={(e) => setFuelFormData({ ...fuelFormData, date: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-surface border border-glass text-textMain min-h-[44px]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-textMuted font-semibold mb-1">Odometer (km) *</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      required
                      value={fuelFormData.odometer}
                      onChange={(e) => setFuelFormData({ ...fuelFormData, odometer: e.target.value })}
                      placeholder="e.g. 15420"
                      className="w-full p-2.5 rounded-xl bg-surface border border-glass text-textMain min-h-[44px]"
                    />
                  </div>
                  <div>
                    <label className="block text-textMuted font-semibold mb-1">Quantity (Liters) *</label>
                    <input
                      type="number"
                      step="any"
                      inputMode="decimal"
                      required
                      value={fuelFormData.liters}
                      onChange={(e) => setFuelFormData({ ...fuelFormData, liters: e.target.value })}
                      placeholder="e.g. 10.5"
                      className="w-full p-2.5 rounded-xl bg-surface border border-glass text-textMain min-h-[44px]"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-textMuted font-semibold mb-1">Rate (₹/Liter)</label>
                    <input
                      type="number"
                      step="any"
                      inputMode="decimal"
                      value={fuelFormData.pricePerLiter}
                      onChange={(e) => setFuelFormData({ ...fuelFormData, pricePerLiter: e.target.value })}
                      placeholder="102"
                      className="w-full p-2.5 rounded-xl bg-surface border border-glass text-textMain min-h-[44px]"
                    />
                  </div>
                  <div>
                    <label className="block text-textMuted font-semibold mb-1">Total Cost (₹) *</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      required
                      value={fuelFormData.cost || (Number(fuelFormData.liters) * Number(fuelFormData.pricePerLiter) || '')}
                      onChange={(e) => setFuelFormData({ ...fuelFormData, cost: e.target.value })}
                      placeholder="Computed auto"
                      className="w-full p-2.5 rounded-xl bg-surface border border-glass text-green-400 font-bold min-h-[44px]"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2 border-t border-glass">
                  <button type="button" onClick={() => { setShowFuelModal(false); setEditingFuelLogId(null); }} className="px-4 py-2 bg-surface text-textMuted rounded-xl min-h-[44px]">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-primary text-background font-bold rounded-xl min-h-[44px]">
                    {editingFuelLogId ? 'Update Fill-up' : 'Save Fill-up'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: SERVICE LOG */}
      <AnimatePresence>
        {showServiceModal && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 overflow-y-auto" onClick={() => setShowServiceModal(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md glass-panel p-5 my-8"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-base font-bold text-textMain mb-3 flex items-center gap-2">
                <Wrench size={18} className="text-yellow-400" /> Log Maintenance & Repairs
              </h2>
              <form onSubmit={handleSaveService} className="space-y-3 text-xs">
                <div>
                  <label className="block text-textMuted font-semibold mb-1">Service Type *</label>
                  <select
                    value={serviceFormData.serviceType}
                    onChange={(e) => setServiceFormData({ ...serviceFormData, serviceType: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-surface border border-glass text-textMain min-h-[44px]"
                  >
                    {SERVICE_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-textMuted font-semibold mb-1">Odometer (km)</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={serviceFormData.odometer}
                      onChange={(e) => setServiceFormData({ ...serviceFormData, odometer: e.target.value })}
                      placeholder="15000"
                      className="w-full p-2.5 rounded-xl bg-surface border border-glass text-textMain min-h-[44px]"
                    />
                  </div>
                  <div>
                    <label className="block text-textMuted font-semibold mb-1">Cost (₹) *</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      required
                      value={serviceFormData.cost}
                      onChange={(e) => setServiceFormData({ ...serviceFormData, cost: e.target.value })}
                      placeholder="2500"
                      className="w-full p-2.5 rounded-xl bg-surface border border-glass text-yellow-400 font-bold min-h-[44px]"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-textMuted font-semibold mb-1">Garage / Workshop Name</label>
                  <input
                    type="text"
                    value={serviceFormData.garage}
                    onChange={(e) => setServiceFormData({ ...serviceFormData, garage: e.target.value })}
                    placeholder="Authorized Service Center"
                    className="w-full p-2.5 rounded-xl bg-surface border border-glass text-textMain min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block text-textMuted font-semibold mb-1">Notes / Replaced Parts</label>
                  <textarea
                    rows={2}
                    value={serviceFormData.notes}
                    onChange={(e) => setServiceFormData({ ...serviceFormData, notes: e.target.value })}
                    placeholder="Oil filter swapped, chain tightened"
                    className="w-full p-2.5 rounded-xl bg-surface border border-glass text-textMain min-h-[44px]"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2 border-t border-glass">
                  <button type="button" onClick={() => { setShowServiceModal(false); setEditingServiceLogId(null); }} className="px-4 py-2 bg-surface text-textMuted rounded-xl min-h-[44px]">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-yellow-400 text-black font-bold rounded-xl min-h-[44px]">
                    {editingServiceLogId ? 'Update Service' : 'Save Service'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: SUBSECTION QUICK EDIT */}
      <AnimatePresence>
        {subEditType && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 overflow-y-auto" onClick={() => setSubEditType(null)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md glass-panel p-5 my-8"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-base font-bold text-textMain capitalize">
                  {subEditType === 'rc' ? 'Update RC Registration Book' :
                   subEditType === 'insurance' ? 'Update Insurance Policy' :
                   subEditType === 'puc' ? 'Update PUC Certificate' :
                   subEditType === 'license' ? 'Update Driving Licence' :
                   subEditType === 'loan' ? 'Update Loan & Hypothecation' :
                   subEditType === 'oil' ? 'Update Engine Oil Specifications' :
                   subEditType === 'tyre-battery' ? 'Update Tyre & Battery Specs' :
                   'Configure Service Reminders'}
                </h2>
                <button onClick={() => setSubEditType(null)} className="text-textMuted hover:text-textMain p-1">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveSubEdit} className="space-y-3 text-xs">
                {subEditType === 'rc' && (
                  <>
                    <div>
                      <label className="block text-textMuted font-semibold mb-1">RC Number *</label>
                      <input
                        type="text"
                        required
                        value={subEditData.rcNumber || ''}
                        onChange={(e) => setSubEditData({ ...subEditData, rcNumber: e.target.value })}
                        placeholder="e.g. TN01AB1234"
                        className="w-full p-2.5 rounded-xl bg-surface border border-glass text-textMain font-mono min-h-[44px]"
                      />
                    </div>
                    <div>
                      <label className="block text-textMuted font-semibold mb-1">RC Expiry Date</label>
                      <input
                        type="date"
                        value={subEditData.rcExpiry || ''}
                        onChange={(e) => setSubEditData({ ...subEditData, rcExpiry: e.target.value })}
                        className="w-full p-2.5 rounded-xl bg-surface border border-glass text-textMain min-h-[44px]"
                      />
                    </div>
                    <FileUpload
                      label="Upload RC Book (Photo or PDF)"
                      currentUrl={subEditData.rcDocUrl}
                      onUploadSuccess={(url) => setSubEditData({ ...subEditData, rcDocUrl: url })}
                      onRemove={() => setSubEditData({ ...subEditData, rcDocUrl: '' })}
                    />
                  </>
                )}

                {subEditType === 'insurance' && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-textMuted font-semibold mb-1">Insurance Provider</label>
                        <input
                          type="text"
                          value={subEditData.insuranceProvider || ''}
                          onChange={(e) => setSubEditData({ ...subEditData, insuranceProvider: e.target.value })}
                          placeholder="e.g. HDFC ERGO, ICICI Lombard"
                          className="w-full p-2.5 rounded-xl bg-surface border border-glass text-textMain min-h-[44px]"
                        />
                      </div>
                      <div>
                        <label className="block text-textMuted font-semibold mb-1">Policy Number</label>
                        <input
                          type="text"
                          value={subEditData.insurancePolicyNumber || ''}
                          onChange={(e) => setSubEditData({ ...subEditData, insurancePolicyNumber: e.target.value })}
                          placeholder="POL1234567"
                          className="w-full p-2.5 rounded-xl bg-surface border border-glass text-textMain font-mono min-h-[44px]"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-textMuted font-semibold mb-1">Annual Premium (₹)</label>
                        <input
                          type="number"
                          value={subEditData.insurancePremium || ''}
                          onChange={(e) => setSubEditData({ ...subEditData, insurancePremium: e.target.value })}
                          placeholder="e.g. 8500"
                          className="w-full p-2.5 rounded-xl bg-surface border border-glass text-textMain min-h-[44px]"
                        />
                      </div>
                      <div>
                        <label className="block text-textMuted font-semibold mb-1">Expiry Date</label>
                        <input
                          type="date"
                          value={subEditData.insuranceExpiry || ''}
                          onChange={(e) => setSubEditData({ ...subEditData, insuranceExpiry: e.target.value })}
                          className="w-full p-2.5 rounded-xl bg-surface border border-glass text-textMain min-h-[44px]"
                        />
                      </div>
                    </div>
                    <FileUpload
                      label="Upload Insurance Certificate"
                      currentUrl={subEditData.insuranceDocUrl}
                      onUploadSuccess={(url) => setSubEditData({ ...subEditData, insuranceDocUrl: url })}
                      onRemove={() => setSubEditData({ ...subEditData, insuranceDocUrl: '' })}
                    />
                  </>
                )}

                {subEditType === 'puc' && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-textMuted font-semibold mb-1">PUC Number</label>
                        <input
                          type="text"
                          value={subEditData.pucNumber || ''}
                          onChange={(e) => setSubEditData({ ...subEditData, pucNumber: e.target.value })}
                          placeholder="e.g. PUC987654"
                          className="w-full p-2.5 rounded-xl bg-surface border border-glass text-textMain font-mono min-h-[44px]"
                        />
                      </div>
                      <div>
                        <label className="block text-textMuted font-semibold mb-1">PUC Expiry Date</label>
                        <input
                          type="date"
                          value={subEditData.pucExpiry || ''}
                          onChange={(e) => setSubEditData({ ...subEditData, pucExpiry: e.target.value })}
                          className="w-full p-2.5 rounded-xl bg-surface border border-glass text-textMain min-h-[44px]"
                        />
                      </div>
                    </div>
                    <FileUpload
                      label="Upload PUC Document"
                      currentUrl={subEditData.pucDocUrl}
                      onUploadSuccess={(url) => setSubEditData({ ...subEditData, pucDocUrl: url })}
                      onRemove={() => setSubEditData({ ...subEditData, pucDocUrl: '' })}
                    />
                  </>
                )}

                {subEditType === 'license' && (
                  <>
                    <div>
                      <label className="block text-textMuted font-semibold mb-1">Driving Licence Number</label>
                      <input
                        type="text"
                        value={subEditData.drivingLicenceNo || ''}
                        onChange={(e) => setSubEditData({ ...subEditData, drivingLicenceNo: e.target.value })}
                        placeholder="e.g. DL-0420110012345"
                        className="w-full p-2.5 rounded-xl bg-surface border border-glass text-textMain font-mono min-h-[44px]"
                      />
                    </div>
                    <FileUpload
                      label="Upload Driving Licence Document"
                      currentUrl={subEditData.drivingLicenceDocUrl}
                      onUploadSuccess={(url) => setSubEditData({ ...subEditData, drivingLicenceDocUrl: url })}
                      onRemove={() => setSubEditData({ ...subEditData, drivingLicenceDocUrl: '' })}
                    />
                  </>
                )}

                {subEditType === 'loan' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-textMuted font-semibold mb-1">Financier / Bank Name</label>
                      <input
                        type="text"
                        value={subEditData.financier || ''}
                        onChange={(e) => setSubEditData({ ...subEditData, financier: e.target.value })}
                        placeholder="e.g. State Bank of India, HDFC"
                        className="w-full p-2.5 rounded-xl bg-surface border border-glass text-textMain min-h-[44px]"
                      />
                    </div>
                    <div>
                      <label className="block text-textMuted font-semibold mb-1">Loan Account Number</label>
                      <input
                        type="text"
                        value={subEditData.loanAccountNo || ''}
                        onChange={(e) => setSubEditData({ ...subEditData, loanAccountNo: e.target.value })}
                        placeholder="e.g. LA-992384729"
                        className="w-full p-2.5 rounded-xl bg-surface border border-glass text-textMain font-mono min-h-[44px]"
                      />
                    </div>
                  </div>
                )}

                {subEditType === 'oil' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-textMuted font-semibold mb-1">Engine Oil Grade / Specification</label>
                      <input
                        type="text"
                        value={subEditData.engineOilType || ''}
                        onChange={(e) => setSubEditData({ ...subEditData, engineOilType: e.target.value })}
                        placeholder="e.g. 5W-30 Full Synthetic, 10W-40"
                        className="w-full p-2.5 rounded-xl bg-surface border border-glass text-textMain min-h-[44px]"
                      />
                    </div>
                    <div>
                      <label className="block text-textMuted font-semibold mb-1">Last Oil Change Odometer (km)</label>
                      <input
                        type="number"
                        value={subEditData.lastOilChangeOdo || ''}
                        onChange={(e) => setSubEditData({ ...subEditData, lastOilChangeOdo: e.target.value })}
                        placeholder="12000"
                        className="w-full p-2.5 rounded-xl bg-surface border border-glass text-textMain min-h-[44px]"
                      />
                    </div>
                  </div>
                )}

                {subEditType === 'tyre-battery' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-textMuted font-semibold mb-1">Front Tyre PSI</label>
                        <input
                          type="number"
                          value={subEditData.tyrePressureFront || ''}
                          onChange={(e) => setSubEditData({ ...subEditData, tyrePressureFront: e.target.value })}
                          placeholder="32"
                          className="w-full p-2.5 rounded-xl bg-surface border border-glass text-textMain min-h-[44px]"
                        />
                      </div>
                      <div>
                        <label className="block text-textMuted font-semibold mb-1">Rear Tyre PSI</label>
                        <input
                          type="number"
                          value={subEditData.tyrePressureRear || ''}
                          onChange={(e) => setSubEditData({ ...subEditData, tyrePressureRear: e.target.value })}
                          placeholder="34"
                          className="w-full p-2.5 rounded-xl bg-surface border border-glass text-textMain min-h-[44px]"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-textMuted font-semibold mb-1">Tyre Brand</label>
                        <input
                          type="text"
                          value={subEditData.tyreBrand || ''}
                          onChange={(e) => setSubEditData({ ...subEditData, tyreBrand: e.target.value })}
                          placeholder="MRF, Michelin, Apollo"
                          className="w-full p-2.5 rounded-xl bg-surface border border-glass text-textMain min-h-[44px]"
                        />
                      </div>
                      <div>
                        <label className="block text-textMuted font-semibold mb-1">Battery Make</label>
                        <input
                          type="text"
                          value={subEditData.batteryMake || ''}
                          onChange={(e) => setSubEditData({ ...subEditData, batteryMake: e.target.value })}
                          placeholder="Amaron, Exide"
                          className="w-full p-2.5 rounded-xl bg-surface border border-glass text-textMain min-h-[44px]"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {subEditType === 'reminders' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-textMuted font-semibold mb-1">Next Service Target Odometer (km)</label>
                      <input
                        type="number"
                        value={subEditData.nextServiceOdo || ''}
                        onChange={(e) => setSubEditData({ ...subEditData, nextServiceOdo: e.target.value })}
                        placeholder="20000"
                        className="w-full p-2.5 rounded-xl bg-surface border border-glass text-textMain min-h-[44px]"
                      />
                    </div>
                    <div>
                      <label className="block text-textMuted font-semibold mb-1">Next Service Target Date</label>
                      <input
                        type="date"
                        value={subEditData.nextServiceDate || ''}
                        onChange={(e) => setSubEditData({ ...subEditData, nextServiceDate: e.target.value })}
                        className="w-full p-2.5 rounded-xl bg-surface border border-glass text-textMain min-h-[44px]"
                      />
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-3 border-t border-glass">
                  <button type="button" onClick={() => setSubEditType(null)} className="px-4 py-2 bg-surface text-textMuted rounded-xl min-h-[44px]">Cancel</button>
                  <button type="submit" disabled={subEditSaving} className="px-5 py-2 bg-primary text-background font-bold rounded-xl min-h-[44px] shadow-neon-primary-sm disabled:opacity-50">
                    {subEditSaving ? 'Saving...' : 'Save Updates'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CONFIRM DELETE MODAL */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        title={`Delete ${deleteTarget?.type === 'vehicle' ? 'Vehicle' : deleteTarget?.type === 'fuel' ? 'Fuel Log' : 'Service Record'}`}
        message="Are you sure? This action will permanently remove this record from Firestore."
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
}
