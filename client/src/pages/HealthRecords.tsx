import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Activity, HeartPulse, Edit2, Trash2, Calendar, FileText,
  User, AlertCircle, TrendingUp, Sparkles, Stethoscope, Download
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useContextEngineStore } from '../store/useContextEngineStore';
import { HealthService, getActiveUserId } from '../services/firestoreService';
import { calculateBMI } from '../utils/calculations';
import { formatIsoDate, getTodayIso } from '../utils/dateUtils';
import { exportToCSV } from '../utils/csvExport';
import { FileUpload } from '../components/common/FileUpload';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { EmptyState } from '../components/common/EmptyState';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { MobilePageHeader } from '../components/common/MobilePageHeader';

const RECORD_TYPES = [
  'Blood Pressure', 'Blood Sugar', 'Weight & Height', 'Heart Rate / SpO2', 'Body Temperature', 'General Notes'
];

export default function HealthRecords() {
  const { user } = useContextEngineStore();
  const activeUid = getActiveUserId(user?.id);

  const [activeTab, setActiveTab] = useState<'vitals' | 'visits' | 'profile'>('vitals');
  const [loading, setLoading] = useState(true);

  // Vitals State
  const [records, setRecords] = useState<any[]>([]);
  const [showVitalsModal, setShowVitalsModal] = useState(false);
  const [editVitalId, setEditVitalId] = useState<string | null>(null);
  const [vitalFormData, setVitalFormData] = useState({
    recordType: 'Blood Pressure',
    date: new Date().toISOString().split('T')[0],
    // BP
    systolic: '',
    diastolic: '',
    pulse: '',
    // Sugar
    sugarValue: '',
    sugarContext: 'Fasting', // Fasting, Post-Prandial, Random
    // Weight / Height
    weightKg: '',
    heightCm: '',
    // General
    notes: '',
    reportUrl: ''
  });

  // Doctor Visits State
  const [visits, setVisits] = useState<any[]>([]);
  const [showVisitModal, setShowVisitModal] = useState(false);
  const [editVisitId, setEditVisitId] = useState<string | null>(null);
  const [visitFormData, setVisitFormData] = useState({
    doctorName: '',
    specialty: 'General Physician',
    clinic: '',
    visitDate: new Date().toISOString().split('T')[0],
    followUpDate: '',
    diagnosis: '',
    prescriptions: '',
    cost: '',
    reportUrl: ''
  });

  // Health Profile State
  const [profile, setProfile] = useState<any>({
    bloodGroup: 'O+',
    allergies: '',
    chronicConditions: '',
    emergencyContact: '',
    organDonor: false
  });
  const [profileSaving, setProfileSaving] = useState(false);

  // Delete Confirm
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; type: 'vital' | 'visit' } | null>(null);

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [recList, visitList, prof] = await Promise.all([
        HealthService.getRecords(activeUid),
        HealthService.getVisits(activeUid),
        HealthService.getProfile(activeUid)
      ]);
      setRecords(recList);
      setVisits(visitList);
      if (prof) setProfile(prof);
    } catch (e) {
      console.error('Error fetching health data:', e);
    } finally {
      setLoading(false);
    }
  };

  // Save Vitals
  const handleSaveVital = async (e: React.FormEvent) => {
    e.preventDefault();

    let displayValue = '';
    let extraMeta: any = {};

    if (vitalFormData.recordType === 'Blood Pressure') {
      displayValue = `${vitalFormData.systolic}/${vitalFormData.diastolic} mmHg`;
      extraMeta = { systolic: Number(vitalFormData.systolic), diastolic: Number(vitalFormData.diastolic), pulse: Number(vitalFormData.pulse) };
    } else if (vitalFormData.recordType === 'Blood Sugar') {
      displayValue = `${vitalFormData.sugarValue} mg/dL (${vitalFormData.sugarContext})`;
      extraMeta = { sugarValue: Number(vitalFormData.sugarValue), sugarContext: vitalFormData.sugarContext };
    } else if (vitalFormData.recordType === 'Weight & Height') {
      const bmiCalc = calculateBMI(vitalFormData.heightCm, vitalFormData.weightKg);
      displayValue = `${vitalFormData.weightKg} kg (BMI: ${bmiCalc.bmi} - ${bmiCalc.category})`;
      extraMeta = { weightKg: Number(vitalFormData.weightKg), heightCm: Number(vitalFormData.heightCm), bmi: bmiCalc.bmi, bmiCategory: bmiCalc.category };
    } else {
      displayValue = vitalFormData.notes || 'Recorded';
    }

    try {
      const payload = {
        ...vitalFormData,
        value: displayValue,
        extraMeta,
        date: formatIsoDate(vitalFormData.date) || getTodayIso()
      };

      if (editVitalId) {
        await HealthService.updateRecord(editVitalId, payload);
      } else {
        await HealthService.addRecord(activeUid, payload);
      }

      setShowVitalsModal(false);
      setEditVitalId(null);
      resetVitalForm();
      fetchData();
    } catch (e) {
      console.error('Error saving vital:', e);
    }
  };

  const resetVitalForm = () => {
    setVitalFormData({
      recordType: 'Blood Pressure',
      date: new Date().toISOString().split('T')[0],
      systolic: '', diastolic: '', pulse: '',
      sugarValue: '', sugarContext: 'Fasting',
      weightKg: '', heightCm: '',
      notes: '', reportUrl: ''
    });
  };

  const handleEditVital = (r: any) => {
    if (!r) return;
    setVitalFormData({
      recordType: r.recordType || 'Blood Pressure',
      date: formatIsoDate(r.date, getTodayIso()),
      systolic: r.extraMeta?.systolic ? String(r.extraMeta.systolic) : '',
      diastolic: r.extraMeta?.diastolic ? String(r.extraMeta.diastolic) : '',
      pulse: r.extraMeta?.pulse ? String(r.extraMeta.pulse) : '',
      sugarValue: r.extraMeta?.sugarValue ? String(r.extraMeta.sugarValue) : '',
      sugarContext: r.extraMeta?.sugarContext || 'Fasting',
      weightKg: r.extraMeta?.weightKg ? String(r.extraMeta.weightKg) : '',
      heightCm: r.extraMeta?.heightCm ? String(r.extraMeta.heightCm) : '',
      notes: r.notes || '',
      reportUrl: r.reportUrl || ''
    });
    setEditVitalId(r._id || r.id);
    setShowVitalsModal(true);
  };

  // Save Doctor Visit
  const handleSaveVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!visitFormData.doctorName.trim()) return;

    try {
      if (editVisitId) {
        await HealthService.updateVisit(editVisitId, {
          ...visitFormData,
          cost: Number(visitFormData.cost) || 0
        });
      } else {
        await HealthService.addVisit(activeUid, {
          ...visitFormData,
          cost: Number(visitFormData.cost) || 0
        });
      }
      setShowVisitModal(false);
      setEditVisitId(null);
      setVisitFormData({
        doctorName: '', specialty: 'General Physician', clinic: '',
        visitDate: new Date().toISOString().split('T')[0], followUpDate: '',
        diagnosis: '', prescriptions: '', cost: '', reportUrl: ''
      });
      fetchData();
    } catch (e) {
      console.error('Error saving doctor visit:', e);
    }
  };

  const handleEditVisit = (v: any) => {
    setEditVisitId(v._id || v.id);
    setVisitFormData({
      doctorName: v.doctorName || '',
      specialty: v.specialty || 'General Physician',
      clinic: v.clinic || '',
      visitDate: formatIsoDate(v.visitDate, getTodayIso()),
      followUpDate: formatIsoDate(v.followUpDate, ''),
      diagnosis: v.diagnosis || '',
      prescriptions: v.prescriptions || '',
      cost: v.cost ? String(v.cost) : '',
      reportUrl: v.reportUrl || ''
    });
    setShowVisitModal(true);
  };

  // Save Health Profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    try {
      await HealthService.saveProfile(activeUid, profile);
      alert('Health Profile updated successfully!');
    } catch (e) {
      console.error('Error saving profile:', e);
    } finally {
      setProfileSaving(false);
    }
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === 'vital') {
        await HealthService.deleteRecord(deleteTarget.id);
      } else if (deleteTarget.type === 'visit') {
        await HealthService.deleteVisit(deleteTarget.id);
      }
      setDeleteTarget(null);
      fetchData();
    } catch (e) {
      console.error('Delete error:', e);
    }
  };

  // Chart Data Preparation (BP over time)
  const bpChartData = records
    .filter(r => r.recordType === 'Blood Pressure' && r.extraMeta?.systolic)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map(r => ({
      date: new Date(r.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      systolic: r.extraMeta.systolic,
      diastolic: r.extraMeta.diastolic
    }));

  return (
    <div className="space-y-6">
      <MobilePageHeader
        title="Health Records"
        parentLabel="Dashboard"
        fallbackPath="/"
        subtitle="Monitor vital signs, doctor appointments, BMI, and medical test reports."
        badges={[
          { label: `${records.length} Vitals`, variant: 'info' },
          { label: `${visits.length} Visits`, variant: 'default' }
        ]}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => exportToCSV([...records, ...visits], 'Vynora_Health_Report')}
              className="min-h-[44px] px-3.5 py-2 rounded-xl border border-glass bg-surface hover:bg-surfaceLight text-textMain text-xs sm:text-sm font-medium flex items-center gap-1.5 touch-target"
            >
              <Download size={15} /> <span className="hidden sm:inline">Export</span>
            </button>
            <button
              onClick={() => setShowVisitModal(true)}
              className="min-h-[44px] px-3.5 py-2 rounded-xl border border-blue-400/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-xs sm:text-sm font-medium flex items-center gap-1.5 touch-target"
            >
              <Stethoscope size={15} /> <span className="hidden sm:inline">Log</span> Visit
            </button>
            <button
              onClick={() => { setEditVitalId(null); resetVitalForm(); setShowVitalsModal(true); }}
              className="min-h-[44px] bg-red-500 text-white px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-red-600 font-bold text-xs sm:text-sm shadow-[0_0_15px_rgba(239,68,68,0.4)] touch-target"
            >
              <Plus size={16} /> <span>Record Vital</span>
            </button>
          </div>
        }
      />

      {/* Medical Disclaimer Banner */}
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3.5 flex items-start gap-3 text-xs text-amber-300">
        <AlertCircle size={18} className="shrink-0 text-amber-400 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="font-semibold text-amber-200">Medical Notice:</strong> Vynora is a personal logging and tracking platform.
          Calculations such as BMI and blood pressure trends are for personal informational reference only and do NOT constitute medical diagnoses,
          prescriptions, or medical counsel. In an emergency, contact qualified healthcare practitioners or emergency trauma services immediately.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-glass pb-1">
        <button
          onClick={() => setActiveTab('vitals')}
          className={`px-4 py-2 font-medium text-sm rounded-t-xl transition-colors ${
            activeTab === 'vitals' ? 'bg-surface text-red-400 border-t-2 border-red-400' : 'text-textMuted hover:text-textMain'
          }`}
        >
          Vitals Log ({records.length})
        </button>
        <button
          onClick={() => setActiveTab('visits')}
          className={`px-4 py-2 font-medium text-sm rounded-t-xl transition-colors ${
            activeTab === 'visits' ? 'bg-surface text-blue-400 border-t-2 border-blue-400' : 'text-textMuted hover:text-textMain'
          }`}
        >
          Doctor Consultations ({visits.length})
        </button>
        <button
          onClick={() => setActiveTab('profile')}
          className={`px-4 py-2 font-medium text-sm rounded-t-xl transition-colors ${
            activeTab === 'profile' ? 'bg-surface text-primary border-t-2 border-primary' : 'text-textMuted hover:text-textMain'
          }`}
        >
          Emergency Medical Profile
        </button>
      </div>

      {/* TAB 1: VITALS */}
      {activeTab === 'vitals' && (
        <div className="space-y-6">
          {/* BP Progression Chart */}
          {bpChartData.length > 1 && (
            <div className="glass-panel p-6 h-[280px] flex flex-col border-t-2 border-red-400">
              <h3 className="text-sm font-bold text-textMain mb-2 flex items-center gap-2">
                <TrendingUp size={16} className="text-red-400" /> Blood Pressure Trend (Systolic & Diastolic)
              </h3>
              <div className="flex-1 w-full min-h-[190px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={bpChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2e39" />
                    <XAxis dataKey="date" stroke="#8892b0" fontSize={11} />
                    <YAxis domain={['auto', 'auto']} stroke="#8892b0" fontSize={11} />
                    <Tooltip contentStyle={{ backgroundColor: '#16192b', border: '1px solid #333' }} />
                    <Line type="monotone" dataKey="systolic" stroke="#ff0844" name="Systolic (mmHg)" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="diastolic" stroke="#00f2fe" name="Diastolic (mmHg)" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {loading ? (
            <LoadingSpinner />
          ) : records.length === 0 ? (
            <EmptyState
              icon={Activity}
              title="No vitals recorded"
              description="Track your daily blood pressure, blood glucose, weight, BMI, and temperature logs."
              actionText="Record First Vital"
              onAction={() => setShowVitalsModal(true)}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {records.map((r: any) => (
                <motion.div
                  key={r._id}
                  whileHover={{ y: -4 }}
                  className="glass-panel p-6 border-l-4 border-l-red-400 flex flex-col justify-between hover:shadow-neon-primary-sm transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-red-400/20 text-red-400 rounded-lg">
                          <Activity size={18} />
                        </div>
                        <div>
                          <h4 className="font-bold text-textMain">{r.recordType}</h4>
                          <span className="text-xs text-textMuted">{new Date(r.date).toLocaleDateString()}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleEditVital(r)}
                          className="p-1 text-textMuted hover:text-primary transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget({ id: r._id || r.id, type: 'vital' })}
                          className="p-1 text-textMuted hover:text-red-400 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>

                    <div className="text-2xl font-bold text-textMain mb-2 font-mono">
                      {r.value}
                    </div>

                    {r.notes && (
                      <p className="text-xs text-textMuted bg-surface/50 p-2.5 rounded-lg border border-glass my-2">
                        {r.notes}
                      </p>
                    )}
                  </div>

                  {r.reportUrl && (
                    <div className="pt-3 border-t border-glass flex items-center justify-between text-xs">
                      <span className="text-textMuted">Lab Scan / Report</span>
                      <a href={r.reportUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline font-medium">
                        View Attachment ↗
                      </a>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: DOCTOR VISITS */}
      {activeTab === 'visits' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-textMain">Medical Appointments & Consultations</h3>
            <button
              onClick={() => setShowVisitModal(true)}
              className="bg-blue-500 text-white px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 hover:bg-blue-600 shadow-[0_0_15px_rgba(59,130,246,0.4)]"
            >
              <Plus size={16} /> Add Consultation
            </button>
          </div>

          {visits.length === 0 ? (
            <EmptyState
              icon={Stethoscope}
              title="No doctor consultations logged"
              description="Keep records of clinic visits, specialist diagnoses, follow-up dates, and prescriptions."
              actionText="Log First Visit"
              onAction={() => setShowVisitModal(true)}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {visits.map((v: any) => (
                <div key={v._id} className="glass-panel p-6 border-l-4 border-l-blue-500 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-bold text-lg text-textMain">Dr. {v.doctorName}</h4>
                        <p className="text-xs text-textMuted">{v.specialty} • {v.clinic || 'Clinic'}</p>
                      </div>
                      <span className="text-xs font-mono font-bold text-textMain px-2.5 py-1 rounded bg-surface border border-glass">
                        {new Date(v.visitDate).toLocaleDateString()}
                      </span>
                    </div>

                    {v.diagnosis && (
                      <div className="mb-2">
                        <span className="text-[11px] text-textMuted uppercase font-semibold">Diagnosis / Summary:</span>
                        <p className="text-xs text-textMain bg-surface/50 p-2.5 rounded-lg border border-glass mt-1">
                          {v.diagnosis}
                        </p>
                      </div>
                    )}

                    {v.prescriptions && (
                      <div className="mb-2">
                        <span className="text-[11px] text-textMuted uppercase font-semibold">Prescriptions:</span>
                        <p className="text-xs text-textMain font-mono bg-surface/50 p-2 rounded-lg border border-glass mt-1">
                          {v.prescriptions}
                        </p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2 text-xs text-textMuted my-3">
                      <div>Consultation Fee: <strong className="text-textMain">₹{Number(v.cost || 0).toLocaleString()}</strong></div>
                      <div>Follow-up: <strong className="text-blue-400">{v.followUpDate ? new Date(v.followUpDate).toLocaleDateString() : 'None'}</strong></div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-glass flex items-center justify-between text-xs">
                    {v.reportUrl ? (
                      <a href={v.reportUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline font-medium">
                        Prescription / Lab Report ↗
                      </a>
                    ) : <span className="text-textMuted">No document</span>}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEditVisit(v)}
                        className="text-textMuted hover:text-primary p-1"
                        title="Edit Consultation"
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        onClick={() => setDeleteTarget({ id: v._id, type: 'visit' })}
                        className="text-textMuted hover:text-red-400 p-1"
                        title="Delete Consultation"
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

      {/* TAB 3: HEALTH PROFILE */}
      {activeTab === 'profile' && (
        <div className="glass-panel max-w-xl mx-auto p-8 border border-glass space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-glass">
            <div className="p-3 bg-red-500/20 text-red-400 rounded-xl">
              <User size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-textMain">Emergency Medical Profile</h3>
              <p className="text-xs text-textMuted">Stored securely in your private tenant for quick emergency lookup.</p>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-textMuted mb-1">Blood Group *</label>
                <select
                  value={profile.bloodGroup}
                  onChange={(e) => setProfile({ ...profile, bloodGroup: e.target.value })}
                  className="w-full bg-surface border border-glass rounded-xl px-4 py-2.5 text-sm font-bold text-red-400"
                >
                  {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                    <option key={bg} value={bg} className="bg-surface text-textMain">{bg}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-textMuted mb-1">Organ Donor</label>
                <div className="flex items-center gap-3 pt-2">
                  <input
                    type="checkbox"
                    id="organDonor"
                    checked={profile.organDonor}
                    onChange={(e) => setProfile({ ...profile, organDonor: e.target.checked })}
                    className="w-4 h-4 rounded text-primary"
                  />
                  <label htmlFor="organDonor" className="text-sm text-textMain cursor-pointer">Yes, registered donor</label>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-textMuted mb-1">Known Allergies</label>
              <input
                type="text"
                value={profile.allergies}
                onChange={(e) => setProfile({ ...profile, allergies: e.target.value })}
                placeholder="e.g. Penicillin, Peanuts, Sulfa drugs"
                className="w-full bg-surface border border-glass rounded-xl px-4 py-2 text-sm text-textMain"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-textMuted mb-1">Chronic Conditions / Ongoing Treatments</label>
              <textarea
                rows={2}
                value={profile.chronicConditions}
                onChange={(e) => setProfile({ ...profile, chronicConditions: e.target.value })}
                placeholder="e.g. Type-2 Diabetes, Hypertension, Asthma"
                className="w-full bg-surface border border-glass rounded-xl px-4 py-2 text-sm text-textMain"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-textMuted mb-1">Emergency Primary Phone Number</label>
              <input
                type="text"
                value={profile.emergencyContact}
                onChange={(e) => setProfile({ ...profile, emergencyContact: e.target.value })}
                placeholder="e.g. +91 98765 43210 (Spouse / Kin)"
                className="w-full bg-surface border border-glass rounded-xl px-4 py-2 text-sm font-mono text-textMain"
              />
            </div>

            <button
              type="submit"
              disabled={profileSaving}
              className="w-full py-2.5 bg-primary text-background font-semibold rounded-xl hover:bg-primary/90 transition-colors shadow-neon-primary-sm disabled:opacity-50"
            >
              {profileSaving ? 'Saving Profile...' : 'Save Emergency Medical Profile'}
            </button>
          </form>
        </div>
      )}

      {/* VITALS MODAL */}
      <AnimatePresence>
        {showVitalsModal && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowVitalsModal(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-panel max-w-md w-full p-6 border border-glass shadow-neon-primary-sm"
            >
              <h2 className="text-xl font-bold text-textMain mb-4 flex items-center gap-2">
                <HeartPulse className="text-red-400" size={22} /> Record Vital Signs
              </h2>

              <form onSubmit={handleSaveVital} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-textMuted mb-1">Vital Type</label>
                    <select
                      value={vitalFormData.recordType}
                      onChange={(e) => setVitalFormData({ ...vitalFormData, recordType: e.target.value })}
                      className="w-full bg-surface border border-glass rounded-xl px-3 py-2 text-sm text-textMain"
                    >
                      {RECORD_TYPES.map(t => <option key={t} value={t} className="bg-surface">{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-textMuted mb-1">Date</label>
                    <input
                      type="date"
                      value={vitalFormData.date}
                      onChange={(e) => setVitalFormData({ ...vitalFormData, date: e.target.value })}
                      className="w-full bg-surface border border-glass rounded-xl px-3 py-2 text-sm text-textMain"
                    />
                  </div>
                </div>

                {/* Conditional Fields based on vital type */}
                {vitalFormData.recordType === 'Blood Pressure' && (
                  <div className="grid grid-cols-3 gap-3 p-3 bg-surface/50 rounded-xl border border-glass">
                    <div>
                      <label className="block text-[11px] text-textMuted mb-1">Systolic</label>
                      <input
                        type="number"
                        required
                        value={vitalFormData.systolic}
                        onChange={(e) => setVitalFormData({ ...vitalFormData, systolic: e.target.value })}
                        placeholder="120"
                        className="w-full bg-surface border border-glass rounded-lg px-3 py-1.5 text-sm text-textMain font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-textMuted mb-1">Diastolic</label>
                      <input
                        type="number"
                        required
                        value={vitalFormData.diastolic}
                        onChange={(e) => setVitalFormData({ ...vitalFormData, diastolic: e.target.value })}
                        placeholder="80"
                        className="w-full bg-surface border border-glass rounded-lg px-3 py-1.5 text-sm text-textMain font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-textMuted mb-1">Pulse (bpm)</label>
                      <input
                        type="number"
                        value={vitalFormData.pulse}
                        onChange={(e) => setVitalFormData({ ...vitalFormData, pulse: e.target.value })}
                        placeholder="72"
                        className="w-full bg-surface border border-glass rounded-lg px-3 py-1.5 text-sm text-textMain font-mono"
                      />
                    </div>
                  </div>
                )}

                {vitalFormData.recordType === 'Blood Sugar' && (
                  <div className="grid grid-cols-2 gap-3 p-3 bg-surface/50 rounded-xl border border-glass">
                    <div>
                      <label className="block text-[11px] text-textMuted mb-1">Sugar (mg/dL) *</label>
                      <input
                        type="number"
                        required
                        value={vitalFormData.sugarValue}
                        onChange={(e) => setVitalFormData({ ...vitalFormData, sugarValue: e.target.value })}
                        placeholder="e.g. 95"
                        className="w-full bg-surface border border-glass rounded-lg px-3 py-1.5 text-sm text-textMain font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-textMuted mb-1">Context</label>
                      <select
                        value={vitalFormData.sugarContext}
                        onChange={(e) => setVitalFormData({ ...vitalFormData, sugarContext: e.target.value })}
                        className="w-full bg-surface border border-glass rounded-lg px-2 py-1.5 text-xs text-textMain"
                      >
                        <option value="Fasting">Fasting</option>
                        <option value="Post-Prandial (2h after meal)">Post-Prandial</option>
                        <option value="Random">Random</option>
                        <option value="Bedtime">Bedtime</option>
                      </select>
                    </div>
                  </div>
                )}

                {vitalFormData.recordType === 'Weight & Height' && (
                  <div className="grid grid-cols-2 gap-3 p-3 bg-surface/50 rounded-xl border border-glass">
                    <div>
                      <label className="block text-[11px] text-textMuted mb-1">Weight (kg) *</label>
                      <input
                        type="number"
                        step="0.1"
                        required
                        value={vitalFormData.weightKg}
                        onChange={(e) => setVitalFormData({ ...vitalFormData, weightKg: e.target.value })}
                        placeholder="70.5"
                        className="w-full bg-surface border border-glass rounded-lg px-3 py-1.5 text-sm text-textMain font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-textMuted mb-1">Height (cm) *</label>
                      <input
                        type="number"
                        required
                        value={vitalFormData.heightCm}
                        onChange={(e) => setVitalFormData({ ...vitalFormData, heightCm: e.target.value })}
                        placeholder="175"
                        className="w-full bg-surface border border-glass rounded-lg px-3 py-1.5 text-sm text-textMain font-mono"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-textMuted mb-1">Clinical Notes</label>
                  <input
                    type="text"
                    value={vitalFormData.notes}
                    onChange={(e) => setVitalFormData({ ...vitalFormData, notes: e.target.value })}
                    placeholder="e.g. Taken post morning walk, feeling well"
                    className="w-full bg-surface border border-glass rounded-xl px-4 py-2 text-sm text-textMain"
                  />
                </div>

                <FileUpload
                  label="Attach Medical Lab Report / Prescription"
                  currentUrl={vitalFormData.reportUrl}
                  onUploadSuccess={(url) => setVitalFormData({ ...vitalFormData, reportUrl: url })}
                  onRemove={() => setVitalFormData({ ...vitalFormData, reportUrl: '' })}
                />

                <div className="flex justify-end gap-3 pt-3 border-t border-glass">
                  <button type="button" onClick={() => setShowVitalsModal(false)} className="px-4 py-2 rounded-xl border border-glass text-textMuted text-sm">Cancel</button>
                  <button type="submit" className="bg-red-500 text-white px-5 py-2 rounded-xl font-medium text-sm hover:bg-red-600 shadow-[0_0_15px_rgba(239,68,68,0.4)]">
                    Save Vital Log
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DOCTOR VISIT MODAL */}
      <AnimatePresence>
        {showVisitModal && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowVisitModal(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-panel max-w-md w-full p-6 border border-glass shadow-neon-primary-sm max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <h2 className="text-xl font-bold text-textMain mb-4 flex items-center gap-2">
                <Stethoscope className="text-blue-400" size={22} /> Log Doctor Consultation
              </h2>

              <form onSubmit={handleSaveVisit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-textMuted mb-1">Doctor Name *</label>
                  <input
                    type="text"
                    required
                    value={visitFormData.doctorName}
                    onChange={(e) => setVisitFormData({ ...visitFormData, doctorName: e.target.value })}
                    placeholder="e.g. Dr. Ramesh Sharma"
                    className="w-full bg-surface border border-glass rounded-xl px-4 py-2 text-sm text-textMain"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-textMuted mb-1">Specialty</label>
                    <input
                      type="text"
                      value={visitFormData.specialty}
                      onChange={(e) => setVisitFormData({ ...visitFormData, specialty: e.target.value })}
                      placeholder="e.g. Cardiologist"
                      className="w-full bg-surface border border-glass rounded-xl px-3 py-2 text-sm text-textMain"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-textMuted mb-1">Clinic / Hospital</label>
                    <input
                      type="text"
                      value={visitFormData.clinic}
                      onChange={(e) => setVisitFormData({ ...visitFormData, clinic: e.target.value })}
                      placeholder="Apollo Hospital"
                      className="w-full bg-surface border border-glass rounded-xl px-3 py-2 text-sm text-textMain"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-textMuted mb-1">Visit Date *</label>
                    <input
                      type="date"
                      required
                      value={visitFormData.visitDate}
                      onChange={(e) => setVisitFormData({ ...visitFormData, visitDate: e.target.value })}
                      className="w-full bg-surface border border-glass rounded-xl px-3 py-2 text-sm text-textMain"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-textMuted mb-1">Follow-up Date</label>
                    <input
                      type="date"
                      value={visitFormData.followUpDate}
                      onChange={(e) => setVisitFormData({ ...visitFormData, followUpDate: e.target.value })}
                      className="w-full bg-surface border border-glass rounded-xl px-3 py-2 text-sm text-textMain"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-textMuted mb-1">Diagnosis / Doctor Advice</label>
                  <textarea
                    rows={2}
                    value={visitFormData.diagnosis}
                    onChange={(e) => setVisitFormData({ ...visitFormData, diagnosis: e.target.value })}
                    placeholder="Doctor observations and health advice..."
                    className="w-full bg-surface border border-glass rounded-xl px-4 py-2 text-sm text-textMain"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-textMuted mb-1">Prescriptions</label>
                    <input
                      type="text"
                      value={visitFormData.prescriptions}
                      onChange={(e) => setVisitFormData({ ...visitFormData, prescriptions: e.target.value })}
                      placeholder="e.g. Paracetamol 650mg"
                      className="w-full bg-surface border border-glass rounded-xl px-3 py-2 text-sm text-textMain"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-textMuted mb-1">Consultation Fee (₹)</label>
                    <input
                      type="number"
                      value={visitFormData.cost}
                      onChange={(e) => setVisitFormData({ ...visitFormData, cost: e.target.value })}
                      placeholder="500"
                      className="w-full bg-surface border border-glass rounded-xl px-3 py-2 text-sm text-textMain font-mono"
                    />
                  </div>
                </div>

                <FileUpload
                  label="Attach Prescription / Consultation Bill"
                  currentUrl={visitFormData.reportUrl}
                  onUploadSuccess={(url) => setVisitFormData({ ...visitFormData, reportUrl: url })}
                  onRemove={() => setVisitFormData({ ...visitFormData, reportUrl: '' })}
                />

                <div className="flex justify-end gap-3 pt-3 border-t border-glass">
                  <button type="button" onClick={() => { setShowVisitModal(false); setEditVisitId(null); }} className="px-4 py-2 rounded-xl border border-glass text-textMuted text-sm">Cancel</button>
                  <button type="submit" className="bg-blue-500 text-white px-5 py-2 rounded-xl font-medium text-sm hover:bg-blue-600 shadow-[0_0_15px_rgba(59,130,246,0.4)]">
                    {editVisitId ? 'Update Consultation' : 'Save Consultation'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CONFIRM DELETE MODAL */}
      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title={`Delete ${deleteTarget?.type === 'vital' ? 'Vital Record' : 'Doctor Consultation'}`}
        message="Are you sure you want to permanently delete this health record? This action cannot be undone."
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
