import { API_BASE_URL } from '../config';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Banknote, Edit2, Trash2, Calendar, DollarSign, CheckCircle2, X } from 'lucide-react';
import { useContextEngineStore } from '../store/useContextEngineStore';

export default function LoanManager() {
  const { user } = useContextEngineStore();
  const [loans, setLoans] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  
  const [activeLoan, setActiveLoan] = useState<any | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const [formData, setFormData] = useState({
    loanName: '',
    principalAmount: '',
    disbursalDate: '',
    startDate: '',
    endDate: '',
    interestRate: '',
    monthlyPay: '',
    bankLogo: ''
  });

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 200;
          const MAX_HEIGHT = 200;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/webp', 0.6);
          resolve(dataUrl);
        };
      };
      reader.readAsDataURL(file);
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressedBase64 = await compressImage(file);
        setFormData(prev => ({ ...prev, bankLogo: compressedBase64 }));
      } catch (err) {
        console.error("Compression failed", err);
      }
    }
  };

  useEffect(() => {
    if (formData.principalAmount && formData.startDate && formData.endDate && formData.interestRate) {
      const p = Number(formData.principalAmount);
      const rAnnual = Number(formData.interestRate);
      
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      
      let months = (end.getFullYear() - start.getFullYear()) * 12;
      months -= start.getMonth();
      months += end.getMonth();
      months = months <= 0 ? 1 : months;

      if (rAnnual > 0 && months > 0 && p > 0) {
        const rMonthly = rAnnual / 12 / 100;
        const emi = (p * rMonthly * Math.pow(1 + rMonthly, months)) / (Math.pow(1 + rMonthly, months) - 1);
        setFormData(prev => ({ ...prev, monthlyPay: emi.toFixed(0) }));
      } else if (rAnnual === 0 && months > 0) {
        setFormData(prev => ({ ...prev, monthlyPay: (p / months).toFixed(0) }));
      }
    }
  }, [formData.principalAmount, formData.startDate, formData.endDate, formData.interestRate]);

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/loans?user=${user?.id || '1'}`);
      if (res.ok) setLoans(await res.json());
    } catch (e) { console.error(e); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editId ? `${API_BASE_URL}/api/loans/${editId}` : `${API_BASE_URL}/api/loans`;
      const method = editId ? 'PUT' : 'POST';

      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          user: user?.id || '1',
          principalAmount: Number(formData.principalAmount),
          disbursalDate: formData.disbursalDate || undefined,
          bankLogo: formData.bankLogo || undefined,
          interestRate: Number(formData.interestRate || 0),
          monthlyPay: Number(formData.monthlyPay)
        })
      });
      setShowAddModal(false);
      setEditId(null);
      setFormData({ loanName: '', principalAmount: '', disbursalDate: '', startDate: '', endDate: '', interestRate: '', monthlyPay: '', bankLogo: '' });
      fetchData();
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await fetch(`${API_BASE_URL}/api/loans/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (e) { console.error(e); }
  };

  const handleEdit = (e: React.MouseEvent, loan: any) => {
    e.stopPropagation();
    setFormData({
      loanName: loan.loanName,
      principalAmount: loan.principalAmount,
      disbursalDate: loan.disbursalDate ? new Date(loan.disbursalDate).toISOString().split('T')[0] : '',
      startDate: loan.startDate ? new Date(loan.startDate).toISOString().split('T')[0] : '',
      endDate: loan.endDate ? new Date(loan.endDate).toISOString().split('T')[0] : '',
      interestRate: loan.interestRate || '',
      monthlyPay: loan.monthlyPay,
      bankLogo: loan.bankLogo || ''
    });
    setEditId(loan._id);
    setShowAddModal(true);
  };

  const togglePayment = async (monthString: string) => {
    if (!activeLoan) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/loans/${activeLoan._id}/toggle-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monthString })
      });
      if (res.ok) {
        const updatedLoan = await res.json();
        setActiveLoan(updatedLoan);
        setLoans(loans.map(l => l._id === updatedLoan._id ? updatedLoan : l));
      }
    } catch (e) { console.error(e); }
  };

  const generateSchedule = (start: string, end: string, principal: number, rate: number, monthlyPay: number, disbursal?: string) => {
    const startDate = new Date(start);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(end);
    endDate.setHours(0, 0, 0, 0);
    
    const schedule = [];
    let current = new Date(startDate);
    
    let previousDate = new Date(startDate);
    if (disbursal) {
      previousDate = new Date(disbursal);
      previousDate.setHours(0, 0, 0, 0);
    } else {
      previousDate.setMonth(previousDate.getMonth() - 1);
    }
    
    let outstandingBalance = principal;
    let instNo = 1;

    const endYYYYMM = endDate.getFullYear() * 100 + endDate.getMonth();

    while (true) {
      const currentYYYYMM = current.getFullYear() * 100 + current.getMonth();
      if (currentYYYYMM > endYYYYMM && instNo > 1) break;

      const diffTime = Math.abs(current.getTime() - previousDate.getTime());
      const daysInPeriod = Math.round(diffTime / (1000 * 60 * 60 * 24));
      
      const monthString = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
      
      const dd = String(current.getDate()).padStart(2, '0');
      const mm = String(current.getMonth() + 1).padStart(2, '0');
      const yyyy = current.getFullYear();
      const label = `${dd}-${mm}-${yyyy}`;
      
      let interestAmount = Math.round(outstandingBalance * ((rate || 0) / 365 / 100) * daysInPeriod);
      let principalAmount = monthlyPay - interestAmount;
      
      const isLastMonth = (currentYYYYMM >= endYYYYMM);
      
      if (isLastMonth || outstandingBalance - principalAmount < 0) {
          principalAmount = outstandingBalance;
      }
      if (outstandingBalance <= 0) {
          interestAmount = 0;
          principalAmount = 0;
      }

      outstandingBalance -= principalAmount;
      if (outstandingBalance < 0) outstandingBalance = 0;

      schedule.push({
        instNo,
        monthString,
        label,
        principalAmount: Math.round(principalAmount),
        interestAmount,
        totalInstallment: Math.round(principalAmount + interestAmount),
        outstandingBalance: Math.round(outstandingBalance)
      });
      
      instNo++;
      previousDate = new Date(current);
      current.setMonth(current.getMonth() + 1);
    }
    return schedule;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-wider mb-1">Loan Management</h1>
          <p className="text-textMuted">Track your active loans, principal amounts, and monthly payments.</p>
        </div>
        <button 
          onClick={() => { setEditId(null); setShowAddModal(true); }} 
          className="bg-white text-black px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-gray-200 transition-colors shadow-neon-primary-sm font-medium"
        >
          <Plus size={18} /> Add Loan
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {loans.map((loan: any) => (
          <motion.div 
            key={loan._id} 
            whileHover={{ y: -5 }} 
            onClick={() => { setActiveLoan(loan); setShowDetailModal(true); }}
            className="glass-panel p-6 flex flex-col justify-between border-t-4 border-t-primary cursor-pointer hover:shadow-neon-primary-sm transition-all"
          >
            <div>
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 w-12 h-12 bg-surface border border-glass rounded-xl text-primary flex items-center justify-center overflow-hidden">
                    {loan.bankLogo ? (
                      <img src={loan.bankLogo} alt={loan.loanName} className="w-full h-full object-contain" />
                    ) : (
                      <Banknote size={24} />
                    )}
                  </div>
                  <div>
                      <h3 className="text-xl font-bold text-textMain">{loan.loanName}</h3>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={(e) => handleEdit(e, loan)} className="text-textMuted hover:text-blue-400 transition-colors" title="Edit">
                    <Edit2 size={18} />
                  </button>
                  {(() => {
                    const sched = generateSchedule(loan.startDate, loan.endDate, loan.principalAmount, loan.interestRate, loan.monthlyPay, loan.disbursalDate);
                    const isFullyPaid = (loan.paidMonths?.length || 0) >= sched.length;
                    
                    return (
                      <button 
                        disabled={!isFullyPaid}
                        onClick={(e) => handleDelete(e, loan._id)} 
                        className={`transition-colors ${isFullyPaid ? 'text-textMuted hover:text-red-400' : 'text-textMuted/30 cursor-not-allowed'}`} 
                        title={isFullyPaid ? "Delete Loan" : "Cannot delete until all installments are paid"}
                      >
                        <Trash2 size={18} />
                      </button>
                    );
                  })()}
                </div>
              </div>

              <div className="bg-surface/50 p-4 rounded-xl border border-glass mb-4 space-y-3">
                  <div className="flex justify-between items-center">
                      <span className="text-sm text-textMuted flex items-center gap-2"><DollarSign size={14}/> Principal Amount</span>
                      <span className="font-bold text-lg text-textMain">₹{loan.principalAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                      <span className="text-sm text-textMuted flex items-center gap-2"><Calendar size={14}/> Duration</span>
                      <span className="text-sm font-medium text-textMain">
                        {new Date(loan.startDate).toLocaleDateString()} - {new Date(loan.endDate).toLocaleDateString()}
                      </span>
                  </div>
                  <div className="flex justify-between items-center">
                      <span className="text-sm text-textMuted flex items-center gap-2"><Banknote size={14}/> Interest Rate</span>
                      <span className="text-sm font-bold text-red-400">{loan.interestRate || 0}%</span>
                  </div>
              </div>
            </div>

            <div className="w-full py-3 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-between px-4">
              <span className="text-sm text-primary font-medium">Monthly Pay</span>
              <span className="text-lg font-bold text-primary">₹{loan.monthlyPay.toLocaleString()} / mo</span>
            </div>
          </motion.div>
        ))}

        {loans.length === 0 && (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-gray-500 border-2 border-dashed border-glass rounded-2xl">
            <Banknote size={48} className="mb-4 opacity-50" />
            <p>No active loans found. Click "Add Loan" to get started.</p>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowAddModal(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="glass-panel p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-xl font-bold mb-4 text-textMain">{editId ? 'Edit Loan' : 'Add New Loan'}</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="relative shrink-0">
                    <div className="w-16 h-16 rounded-xl bg-background border border-glass flex items-center justify-center overflow-hidden cursor-pointer group hover:border-primary transition-all">
                      {formData.bankLogo ? (
                        <img src={formData.bankLogo} alt="Bank Logo" className="w-full h-full object-contain p-2" />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-textMuted group-hover:text-primary transition-colors">
                          <Banknote size={24} />
                          <span className="text-[9px] mt-1 uppercase font-bold tracking-wider">Logo</span>
                        </div>
                      )}
                      <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer" title="Upload Bank Logo" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-textMuted mb-1 block">Loan Name (e.g., Home Loan)</label>
                    <input required type="text" placeholder="Loan Name" value={formData.loanName} onChange={e => setFormData({...formData, loanName: e.target.value})} className="w-full bg-background border border-glass rounded-lg px-4 py-3 text-sm text-textMain" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-textMuted mb-1 block">Principal Amount (₹)</label>
                  <input required type="number" placeholder="Total Borrowed Amount" value={formData.principalAmount} onChange={e => setFormData({...formData, principalAmount: e.target.value})} className="w-full bg-background border border-glass rounded-lg px-4 py-3 text-sm text-textMain" />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs text-textMuted mb-1 block">Disbursal Date (Optional)</label>
                    <input type="date" value={formData.disbursalDate} onChange={e => setFormData({...formData, disbursalDate: e.target.value})} className="w-full bg-background border border-glass rounded-lg px-4 py-3 text-sm text-textMain" />
                  </div>
                  <div>
                    <label className="text-xs text-textMuted mb-1 block">First Installment Date</label>
                    <input required type="date" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} className="w-full bg-background border border-glass rounded-lg px-4 py-3 text-sm text-textMain" />
                  </div>
                  <div>
                    <label className="text-xs text-textMuted mb-1 block">End Date</label>
                    <input required type="date" value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} className="w-full bg-background border border-glass rounded-lg px-4 py-3 text-sm text-textMain" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-textMuted mb-1 block">Interest Rate (%)</label>
                    <input required type="number" step="0.1" placeholder="e.g. 8.5" value={formData.interestRate} onChange={e => setFormData({...formData, interestRate: e.target.value})} className="w-full bg-background border border-glass rounded-lg px-4 py-3 text-sm text-textMain" />
                  </div>
                  <div>
                    <label className="text-xs text-textMuted mb-1 block">Monthly Pay (Auto-Calculated, Editable)</label>
                    <input required type="number" placeholder="EMI" value={formData.monthlyPay} onChange={e => setFormData({...formData, monthlyPay: e.target.value})} className="w-full bg-background border border-glass rounded-lg px-4 py-3 text-sm text-textMain" />
                  </div>
                </div>
                
                <div className="flex justify-end gap-3 mt-6">
                  <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 text-sm text-textMuted hover:text-textMain">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-primary text-background rounded-lg font-medium text-sm">{editId ? 'Update Loan' : 'Add Loan'}</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Detailed Loan View Modal */}
      <AnimatePresence>
        {showDetailModal && activeLoan && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 overflow-y-auto custom-scrollbar" onClick={() => setShowDetailModal(false)}>
            <div className="flex min-h-full justify-center items-start p-2 md:p-4">
              <motion.div 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: 20 }} 
                className="glass-panel w-full max-w-4xl relative text-left my-4 md:my-8"
                onClick={(e) => e.stopPropagation()}
              >
              {(() => {
                const schedule = generateSchedule(activeLoan.startDate, activeLoan.endDate, activeLoan.principalAmount, activeLoan.interestRate, activeLoan.monthlyPay, activeLoan.disbursalDate);
                const totalMonths = schedule.length;
                const paidMonths = activeLoan.paidMonths || [];
                
                let trueTotalPayable = 0;
                let trueInterest = 0;
                let paidAmount = 0;

                schedule.forEach(month => {
                  trueTotalPayable += month.totalInstallment;
                  trueInterest += month.interestAmount;
                  if (paidMonths.includes(month.monthString)) {
                    paidAmount += month.totalInstallment;
                  }
                });

                const unpaidAmount = trueTotalPayable - paidAmount;

                return (
                  <div className="w-full">
                    <button onClick={() => setShowDetailModal(false)} className="absolute top-6 right-6 md:top-8 md:right-8 p-2 glass-panel rounded-full hover:bg-surface transition-colors text-textMuted hover:text-textMain z-10 shadow-lg">
                      <X size={20} />
                    </button>
                    
                    <div className="p-6 md:p-8 pr-20 border-b border-glass flex justify-between items-start shrink-0">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          {activeLoan.bankLogo ? (
                            <img src={activeLoan.bankLogo} alt="Logo" className="w-10 h-10 object-contain rounded-lg bg-surface p-1 border border-glass shrink-0" />
                          ) : (
                            <Banknote size={28} className="text-primary shrink-0" />
                          )}
                          <h2 className="text-3xl font-bold text-textMain">{activeLoan.loanName}</h2>
                        </div>
                        <p className="text-textMuted text-sm">Interactive payment schedule and tracking</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 md:p-8 bg-surface/30 shrink-0 border-b border-glass">
                      <div className="glass-panel p-4 text-center">
                        <p className="text-xs text-textMuted mb-1 uppercase tracking-wider">Principal</p>
                        <p className="text-xl font-bold text-textMain">₹{activeLoan.principalAmount.toLocaleString()}</p>
                      </div>
                      <div className="glass-panel p-4 text-center border-b-2 border-red-500/50">
                        <p className="text-xs text-textMuted mb-1 uppercase tracking-wider">Interest</p>
                        <p className="text-xl font-bold text-red-400">₹{trueInterest.toLocaleString()}</p>
                      </div>
                      <div className="glass-panel p-4 text-center border-b-2 border-green-500/50">
                        <p className="text-xs text-textMuted mb-1 uppercase tracking-wider">Paid Amount</p>
                        <p className="text-xl font-bold text-green-400">₹{paidAmount.toLocaleString()}</p>
                      </div>
                      <div className="glass-panel p-4 text-center border-b-2 border-yellow-500/50">
                        <p className="text-xs text-textMuted mb-1 uppercase tracking-wider">Unpaid Amount</p>
                        <p className="text-xl font-bold text-yellow-400">₹{unpaidAmount.toLocaleString()}</p>
                      </div>
                    </div>

                    <div className="p-0 bg-background/50">
                      <div className="p-6 md:p-8 pb-4">
                        <h3 className="text-lg font-bold flex items-center gap-2">
                          Amortization Schedule <span className="text-sm font-normal text-textMuted">({paidMonths.length} / {totalMonths} months paid)</span>
                        </h3>
                      </div>
                      
                      <div className="overflow-x-auto px-6 md:px-8 pb-8">
                        <table className="w-full text-left border-collapse whitespace-nowrap">
                          <thead>
                            <tr className="text-textMuted text-xs uppercase tracking-wider border-b border-glass">
                              <th className="pb-3 px-4 font-medium">Inst No.</th>
                              <th className="pb-3 px-4 font-medium">Due Date</th>
                              <th className="pb-3 px-4 font-medium text-right">Principal (₹)</th>
                              <th className="pb-3 px-4 font-medium text-right">Interest (₹)</th>
                              <th className="pb-3 px-4 font-medium text-right">Total (₹)</th>
                              <th className="pb-3 px-4 font-medium text-right">Balance (₹)</th>
                              <th className="pb-3 px-4 font-medium text-center">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {schedule.map((month) => {
                              const isPaid = paidMonths.includes(month.monthString);
                              return (
                                <tr 
                                  key={month.monthString}
                                  onClick={() => togglePayment(month.monthString)}
                                  className={`cursor-pointer transition-all border-b border-glass/50 last:border-0 ${
                                    isPaid 
                                      ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20' 
                                      : 'hover:bg-surface/50 text-textMain'
                                  }`}
                                >
                                  <td className="py-4 px-4">{month.instNo}</td>
                                  <td className="py-4 px-4">{month.label}</td>
                                  <td className="py-4 px-4 text-right font-medium">{month.principalAmount.toLocaleString()}</td>
                                  <td className="py-4 px-4 text-right">{month.interestAmount.toLocaleString()}</td>
                                  <td className="py-4 px-4 text-right font-bold text-primary">{month.totalInstallment.toLocaleString()}</td>
                                  <td className="py-4 px-4 text-right text-textMuted">{month.outstandingBalance.toLocaleString()}</td>
                                  <td className="py-4 px-4">
                                    <div className="flex justify-center">
                                      {isPaid ? <CheckCircle2 size={20} className="text-green-500" /> : <div className="w-5 h-5 rounded-full border-2 border-glass" />}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                );
              })()}
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
