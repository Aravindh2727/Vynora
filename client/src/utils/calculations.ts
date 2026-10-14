/**
 * Vynora Core Calculation & Business Logic Engine
 * Shared utility functions for financial, agricultural, dairy, and planning calculations.
 * Used by production UI components and verified by the automated test suite.
 */

export interface Installment {
  instNo: number;
  monthString: string;
  label: string;
  principalAmount: number;
  interestAmount: number;
  totalInstallment: number;
  outstandingBalance: number;
}

export interface FinanceTransaction {
  type?: 'income' | 'expense' | string;
  amount?: number | string;
  category?: string;
  date?: string | Date;
}

export interface FinanceSummary {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  categoryBreakdown: Record<string, number>;
}

export interface CropInput {
  seedCost?: number | string | null;
  fertilizerCost?: number | string | null;
  waterCost?: number | string | null;
  labourCost?: number | string | null;
  machineCost?: number | string | null;
  harvestQuantity?: number | string | null;
  sellingPricePerUnit?: number | string | null;
}

export interface CropFinances {
  totalCost: number;
  totalRevenue: number;
  profit: number;
}

export interface DairyLogInput {
  litersProduced?: number | string | null;
  ratePerLiter?: number | string | null;
  soldAmount?: number | string | null;
}

export interface ExpenseLogInput {
  amount?: number | string | null;
}

/**
 * 1. Standard Banking Equated Monthly Installment (EMI) Formula:
 *    EMI = [P * r * (1 + r)^n] / [(1 + r)^n - 1]
 *    where P = principal, r = monthly interest rate (annual / 12 / 100), n = tenure in months.
 *    For zero interest (r = 0): EMI = P / n.
 */
export function calculateEMI(principal: number, annualRate: number, tenureMonths: number): number {
  const p = Number(principal);
  const rAnnual = Number(annualRate);
  const months = Math.round(Number(tenureMonths));

  if (isNaN(p) || p <= 0 || isNaN(months) || months <= 0) return 0;
  if (isNaN(rAnnual) || rAnnual < 0) return 0;

  if (rAnnual === 0) {
    return Math.round(p / months);
  }

  const rMonthly = rAnnual / 12 / 100;
  const factor = Math.pow(1 + rMonthly, months);
  if (!isFinite(factor) || factor <= 1) {
    return Math.round(p / months);
  }

  const emi = (p * rMonthly * factor) / (factor - 1);
  return isFinite(emi) ? Math.round(emi) : 0;
}

/**
 * 2. Amortization Schedule Calculation
 *    Handles month-end dates (e.g. Jan 31 -> Feb 28/29 -> Mar 31) without date drift.
 */
export function calculateAmortizationSchedule(
  start: string,
  end: string,
  principal: number,
  annualRate: number,
  monthlyPay: number,
  disbursal?: string
): Installment[] {
  const p = Number(principal);
  if (!start || !end || p <= 0) return [];

  const startDate = new Date(start);
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(end);
  endDate.setHours(0, 0, 0, 0);

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return [];
  if (endDate < startDate) return [];

  const schedule: Installment[] = [];
  let current = new Date(startDate);
  let previousDate = disbursal ? new Date(disbursal) : new Date(startDate);
  previousDate.setHours(0, 0, 0, 0);
  if (isNaN(previousDate.getTime())) previousDate = new Date(startDate);

  let outstandingBalance = p;
  let instNo = 1;
  const endYYYYMM = endDate.getFullYear() * 100 + endDate.getMonth();
  const rate = Number(annualRate) || 0;
  const mPay = Number(monthlyPay) || 0;

  while (true) {
    const currentYYYYMM = current.getFullYear() * 100 + current.getMonth();
    if (currentYYYYMM > endYYYYMM && instNo > 1) break;
    if (instNo > 600) break; // Guard against runaways (50 years max)

    const diffTime = Math.abs(current.getTime() - previousDate.getTime());
    const daysInPeriod = Math.round(diffTime / (1000 * 60 * 60 * 24));

    const monthString = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
    const dd = String(current.getDate()).padStart(2, '0');
    const mm = String(current.getMonth() + 1).padStart(2, '0');
    const yyyy = current.getFullYear();
    const label = `${dd}-${mm}-${yyyy}`;

    let interestAmount = Math.round(outstandingBalance * (rate / 365 / 100) * daysInPeriod);
    let principalAmount = mPay - interestAmount;

    const isLastMonth = currentYYYYMM >= endYYYYMM;
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

    previousDate = new Date(current);
    const nextMonthTotal = startDate.getMonth() + instNo;
    const targetYear = startDate.getFullYear() + Math.floor(nextMonthTotal / 12);
    const targetMonth = nextMonthTotal % 12;
    const daysInTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
    const targetDay = Math.min(startDate.getDate(), daysInTargetMonth);
    current = new Date(targetYear, targetMonth, targetDay, 0, 0, 0, 0);
    instNo++;
  }

  return schedule;
}

/**
 * 3. Finance Summary Calculations
 */
export function calculateFinanceSummary(transactions: FinanceTransaction[]): FinanceSummary {
  if (!Array.isArray(transactions) || transactions.length === 0) {
    return { totalIncome: 0, totalExpense: 0, balance: 0, categoryBreakdown: {} };
  }

  let totalIncome = 0;
  let totalExpense = 0;
  const categoryBreakdown: Record<string, number> = {};

  for (const t of transactions) {
    // Inter-account transfers must NOT be counted as income or expense
    if (t.type === 'transfer' || (t as any).isTransfer) continue;

    const amount = Number(t.amount) || 0;
    if (amount <= 0) continue;

    if (t.type === 'income') {
      totalIncome += amount;
    } else if (t.type === 'expense') {
      totalExpense += amount;
      const cat = t.category || 'Other';
      categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + amount;
    }
  }

  return {
    totalIncome: Number(totalIncome.toFixed(2)),
    totalExpense: Number(totalExpense.toFixed(2)),
    balance: Number((totalIncome - totalExpense).toFixed(2)),
    categoryBreakdown
  };
}

/**
 * 4. Agriculture Crop Finance Calculations
 */
export function calculateCropFinances(crop: CropInput): CropFinances {
  const seedCost = Number(crop?.seedCost) || 0;
  const fertilizerCost = Number(crop?.fertilizerCost) || 0;
  const waterCost = Number(crop?.waterCost) || 0;
  const labourCost = Number(crop?.labourCost) || 0;
  const machineCost = Number(crop?.machineCost) || 0;

  const totalCost = Math.max(0, seedCost + fertilizerCost + waterCost + labourCost + machineCost);
  const harvestQty = Math.max(0, Number(crop?.harvestQuantity) || 0);
  const pricePerUnit = Math.max(0, Number(crop?.sellingPricePerUnit) || 0);
  const totalRevenue = harvestQty * pricePerUnit;
  const profit = totalRevenue - totalCost;

  return {
    totalCost: Number(totalCost.toFixed(2)),
    totalRevenue: Number(totalRevenue.toFixed(2)),
    profit: Number(profit.toFixed(2))
  };
}

/**
 * 5. Dairy Calculations
 */
export function calculateDairyYield(logs: DairyLogInput[]): number {
  if (!Array.isArray(logs)) return 0;
  return Number(logs.reduce((acc, curr) => acc + (Number(curr?.litersProduced) || 0), 0).toFixed(1));
}

export function calculateDairyRevenue(logs: DairyLogInput[]): number {
  if (!Array.isArray(logs)) return 0;
  return Number(logs.reduce((acc, curr) => {
    if (curr?.soldAmount !== undefined && curr?.soldAmount !== null) {
      return acc + (Number(curr.soldAmount) || 0);
    }
    const liters = Number(curr?.litersProduced) || 0;
    const rate = Number(curr?.ratePerLiter) || 0;
    return acc + (liters * rate);
  }, 0).toFixed(2));
}

export function calculateDairyExpenses(expenses: ExpenseLogInput[]): number {
  if (!Array.isArray(expenses)) return 0;
  return Number(expenses.reduce((acc, curr) => acc + (Number(curr?.amount) || 0), 0).toFixed(2));
}

/**
 * 6. Bill Overdue Boundary Calculation
 *    A bill due today is NOT overdue until tomorrow starts (23:59:59 boundary).
 */
export function isBillOverdue(dueDateString: string, isPaid: boolean, referenceDate: Date = new Date()): boolean {
  if (isPaid || !dueDateString) return false;
  const due = new Date(dueDateString);
  if (isNaN(due.getTime())) return false;
  due.setHours(23, 59, 59, 999);
  return due.getTime() < referenceDate.getTime();
}

/**
 * 7. Goal Progress Clamping & Advancement
 */
export function clampGoalProgress(progress: any): number {
  const val = Number(progress);
  if (isNaN(val) || val <= 0) return 0;
  if (val >= 100) return 100;
  return Math.round(val);
}

export function calculateNextGoalProgress(current: any): { progress: number; isCompleted: boolean } {
  const curr = clampGoalProgress(current);
  const next = curr >= 100 ? 0 : Math.min(100, curr + 25);
  return {
    progress: next,
    isCompleted: next >= 100
  };
}

/**
 * 8. Health Vitals: BMI Calculation & Classification
 *    BMI = weight (kg) / [height (m)]^2
 */
export function calculateBMI(heightCm: number | string, weightKg: number | string): { bmi: number; category: string } {
  const h = Number(heightCm);
  const w = Number(weightKg);

  if (isNaN(h) || h <= 0 || isNaN(w) || w <= 0) {
    return { bmi: 0, category: 'Invalid Input' };
  }

  const heightInMeters = h / 100;
  const rawBmi = w / (heightInMeters * heightInMeters);
  const bmi = Number(rawBmi.toFixed(1));

  let category = 'Normal weight';
  if (bmi < 18.5) {
    category = 'Underweight';
  } else if (bmi < 25) {
    category = 'Normal weight';
  } else if (bmi < 30) {
    category = 'Overweight';
  } else {
    category = 'Obese';
  }

  return { bmi, category };
}

/**
 * 9. Vehicle Fuel & Mileage Calculation
 *    Distance = currentOdometer - previousOdometer
 *    Mileage = distance / fuelLiters
 *    Ensures monotonic increasing odometer validation.
 */
export function calculateVehicleMileage(
  currentOdo: number | string,
  prevOdo: number | string,
  fuelLiters: number | string
): { mileage: number; distance: number; isValid: boolean; error?: string } {
  const curr = Number(currentOdo);
  const prev = Number(prevOdo);
  const liters = Number(fuelLiters);

  if (isNaN(curr) || isNaN(prev) || isNaN(liters)) {
    return { mileage: 0, distance: 0, isValid: false, error: 'Odometer and liters must be valid numbers' };
  }

  if (curr < 0 || prev < 0 || liters <= 0) {
    return { mileage: 0, distance: 0, isValid: false, error: 'Odometer cannot be negative and liters must be positive' };
  }

  if (curr < prev) {
    return {
      mileage: 0,
      distance: 0,
      isValid: false,
      error: 'Current odometer cannot be less than previous odometer reading without reset flag'
    };
  }

  const distance = curr - prev;
  const mileage = Number((distance / liters).toFixed(2));

  return { mileage, distance, isValid: true };
}

/**
 * 10. Budget Usage Calculation
 */
export function calculateBudgetUsage(
  budgetAmount: number | string,
  spentAmount: number | string
): { percentUsed: number; remaining: number; isOverBudget: boolean } {
  const budget = Number(budgetAmount) || 0;
  const spent = Number(spentAmount) || 0;

  if (budget <= 0) {
    return { percentUsed: 0, remaining: 0, isOverBudget: spent > 0 };
  }

  const percentUsed = Math.round((spent / budget) * 100);
  const remaining = Number((budget - spent).toFixed(2));

  return {
    percentUsed,
    remaining,
    isOverBudget: spent > budget
  };
}

/**
 * 11. Days Remaining Calculation for Reminders & Deadlines
 */
export function calculateDaysRemaining(
  targetDateString: string,
  referenceDate: Date = new Date()
): { daysRemaining: number; isOverdue: boolean } {
  if (!targetDateString) return { daysRemaining: 0, isOverdue: false };
  const target = new Date(targetDateString);
  if (isNaN(target.getTime())) return { daysRemaining: 0, isOverdue: false };

  // Strip time components to compare pure calendar dates
  const targetUtc = Date.UTC(target.getFullYear(), target.getMonth(), target.getDate());
  const ref = new Date(referenceDate);
  const refUtc = Date.UTC(ref.getFullYear(), ref.getMonth(), ref.getDate());

  const diffDays = Math.round((targetUtc - refUtc) / (1000 * 60 * 60 * 24));

  return {
    daysRemaining: diffDays,
    isOverdue: diffDays < 0
  };
}
