import assert from 'node:assert';
import {
  calculateEMI,
  calculateAmortizationSchedule,
  calculateFinanceSummary,
  calculateCropFinances,
  calculateDairyYield,
  calculateDairyRevenue,
  calculateDairyExpenses,
  isBillOverdue,
  clampGoalProgress,
  calculateNextGoalProgress,
  calculateBMI,
  calculateVehicleMileage,
  calculateBudgetUsage,
  calculateDaysRemaining
} from '../../client/src/utils/calculations.ts';

console.log('=== VYNORA GENUINE PRODUCTION CALCULATION & BUSINESS LOGIC TEST SUITE ===\n');

let passedTests = 0;
let totalTests = 0;

function test(name: string, fn: () => void) {
  totalTests++;
  try {
    fn();
    console.log(`  [PASS] ${name}`);
    passedTests++;
  } catch (err: any) {
    console.error(`  [FAIL] ${name}`);
    console.error(`         ${err.message}`);
  }
}

// ----------------------------------------------------
// 1. Finance Calculations (calculateFinanceSummary)
// ----------------------------------------------------
test('Finance: Standard income, expense, and balance calculation', () => {
  const transactions = [
    { type: 'income', amount: 50000, category: 'Salary' },
    { type: 'income', amount: 15000, category: 'Freelance' },
    { type: 'expense', amount: 12000, category: 'Rent' },
    { type: 'expense', amount: 4500.5, category: 'Food' },
    { type: 'expense', amount: 1500.25, category: 'Transport' }
  ];
  const summary = calculateFinanceSummary(transactions);
  assert.strictEqual(summary.totalIncome, 65000);
  assert.strictEqual(summary.totalExpense, 18000.75);
  assert.strictEqual(summary.balance, 46999.25);
  assert.strictEqual(summary.categoryBreakdown['Rent'], 12000);
  assert.strictEqual(summary.categoryBreakdown['Food'], 4500.5);
});

test('Finance: Handles empty, null, or undefined transactions array', () => {
  assert.deepStrictEqual(calculateFinanceSummary([]), { totalIncome: 0, totalExpense: 0, balance: 0, categoryBreakdown: {} });
  assert.deepStrictEqual(calculateFinanceSummary(null as any), { totalIncome: 0, totalExpense: 0, balance: 0, categoryBreakdown: {} });
  assert.deepStrictEqual(calculateFinanceSummary(undefined as any), { totalIncome: 0, totalExpense: 0, balance: 0, categoryBreakdown: {} });
});

test('Finance: Boundary - ignores zero, negative, and non-numeric amounts', () => {
  const transactions = [
    { type: 'income', amount: 1000, category: 'Bonus' },
    { type: 'income', amount: 0, category: 'Zero' },
    { type: 'income', amount: -500, category: 'Negative' },
    { type: 'expense', amount: 400, category: 'Food' },
    { type: 'expense', amount: 'invalid' as any, category: 'Invalid' },
    { type: 'expense', amount: -200, category: 'NegativeExpense' }
  ];
  const summary = calculateFinanceSummary(transactions);
  assert.strictEqual(summary.totalIncome, 1000);
  assert.strictEqual(summary.totalExpense, 400);
  assert.strictEqual(summary.balance, 600);
});

test('Finance: Extreme inputs (large currency numbers)', () => {
  const transactions = [
    { type: 'income', amount: 1000000000.55, category: 'Capital' },
    { type: 'expense', amount: 500000000.25, category: 'Investment' }
  ];
  const summary = calculateFinanceSummary(transactions);
  assert.strictEqual(summary.totalIncome, 1000000000.55);
  assert.strictEqual(summary.totalExpense, 500000000.25);
  assert.strictEqual(summary.balance, 500000000.3);
});

// ----------------------------------------------------
// 2. Loan EMI (calculateEMI)
// ----------------------------------------------------
test('Loan EMI: Standard banking formula (Principal=100,000, Rate=10%, Months=12)', () => {
  const emi = calculateEMI(100000, 10, 12);
  assert.strictEqual(emi, 8792);
});

test('Loan EMI: Zero interest loan (Principal=60,000, Rate=0%, Months=12)', () => {
  const emi = calculateEMI(60000, 0, 12);
  assert.strictEqual(emi, 5000);
});

test('Loan EMI: Boundary - Zero or negative principal returns 0', () => {
  assert.strictEqual(calculateEMI(0, 10, 12), 0);
  assert.strictEqual(calculateEMI(-50000, 10, 12), 0);
});

test('Loan EMI: Boundary - Zero or negative tenure returns 0', () => {
  assert.strictEqual(calculateEMI(100000, 10, 0), 0);
  assert.strictEqual(calculateEMI(100000, 10, -6), 0);
});

test('Loan EMI: Boundary - Negative interest rate returns 0', () => {
  assert.strictEqual(calculateEMI(100000, -5, 12), 0);
});

test('Loan EMI: Extreme values (Home loan: 10,000,000 at 8.5% for 240 months)', () => {
  const emi = calculateEMI(10000000, 8.5, 240);
  assert.strictEqual(emi, 86782);
});

test('Loan EMI: Malformed inputs (NaN, null, undefined) return 0', () => {
  assert.strictEqual(calculateEMI(NaN, 10, 12), 0);
  assert.strictEqual(calculateEMI(100000, NaN, 12), 0);
  assert.strictEqual(calculateEMI(null as any, 10, 12), 0);
  assert.strictEqual(calculateEMI(100000, 10, undefined as any), 0);
});

// ----------------------------------------------------
// 3. Amortization Schedule (calculateAmortizationSchedule)
// ----------------------------------------------------
test('Loan Amortization: Standard 12-month schedule generates correct installments', () => {
  const schedule = calculateAmortizationSchedule('2026-01-01', '2026-12-01', 100000, 10, 8792);
  assert.strictEqual(schedule.length, 12);
  assert.strictEqual(schedule[0].instNo, 1);
  assert.strictEqual(schedule[11].instNo, 12);
  assert.strictEqual(schedule[11].outstandingBalance, 0);
});

test('Loan Amortization: Month-end date rollover avoids month skipping (Jan 31 -> Feb 28 -> Mar 31)', () => {
  const schedule = calculateAmortizationSchedule('2026-01-31', '2026-04-30', 50000, 12, 13000);
  assert.strictEqual(schedule.length, 4);
  assert.strictEqual(schedule[0].label, '31-01-2026'); // Jan 31
  assert.strictEqual(schedule[1].label, '28-02-2026'); // Feb 28 (non-leap year)
  assert.strictEqual(schedule[2].label, '31-03-2026'); // Mar 31
  assert.strictEqual(schedule[3].label, '30-04-2026'); // Apr 30
});

test('Loan Amortization: Leap year February handling (2024)', () => {
  const schedule = calculateAmortizationSchedule('2024-01-31', '2024-03-31', 30000, 10, 10000);
  assert.strictEqual(schedule.length, 3);
  assert.strictEqual(schedule[0].label, '31-01-2024'); // Jan 31
  assert.strictEqual(schedule[1].label, '29-02-2024'); // Feb 29 (leap year 2024)
  assert.strictEqual(schedule[2].label, '31-03-2024'); // Mar 31
});

test('Loan Amortization: Invalid dates or negative principal return empty array', () => {
  assert.deepStrictEqual(calculateAmortizationSchedule('2026-12-01', '2026-01-01', 100000, 10, 8792), []);
  assert.deepStrictEqual(calculateAmortizationSchedule('invalid', '2026-12-01', 100000, 10, 8792), []);
  assert.deepStrictEqual(calculateAmortizationSchedule('2026-01-01', '2026-12-01', -5000, 10, 8792), []);
});

// ----------------------------------------------------
// 4. Crop Finances (calculateCropFinances)
// ----------------------------------------------------
test('Agriculture: Crop total cost, revenue, and profit with missing fields fallback', () => {
  const crop = {
    seedCost: 5000,
    fertilizerCost: 3500,
    waterCost: null,
    labourCost: undefined,
    machineCost: 2000,
    harvestQuantity: 100,
    sellingPricePerUnit: 250
  };
  const result = calculateCropFinances(crop);
  assert.strictEqual(result.totalCost, 10500);
  assert.strictEqual(result.totalRevenue, 25000);
  assert.strictEqual(result.profit, 14500);
});

test('Agriculture: Boundary - Zero harvest or zero price produces zero revenue and net loss', () => {
  const crop = {
    seedCost: 4000,
    fertilizerCost: 2000,
    harvestQuantity: 0,
    sellingPricePerUnit: 100
  };
  const result = calculateCropFinances(crop);
  assert.strictEqual(result.totalCost, 6000);
  assert.strictEqual(result.totalRevenue, 0);
  assert.strictEqual(result.profit, -6000);
});

test('Agriculture: Boundary - Handles negative inputs safely', () => {
  const crop = {
    seedCost: -500,
    fertilizerCost: 1000,
    harvestQuantity: -10,
    sellingPricePerUnit: 50
  };
  const result = calculateCropFinances(crop);
  // Math.max guards negative costs and quantities
  assert.strictEqual(result.totalCost, 500);
  assert.strictEqual(result.totalRevenue, 0);
  assert.strictEqual(result.profit, -500);
});

// ----------------------------------------------------
// 5. Dairy Calculations (calculateDairyYield, calculateDairyRevenue, calculateDairyExpenses)
// ----------------------------------------------------
test('Dairy: Total yield, revenue, and expense calculations', () => {
  const logs = [
    { session: 'Morning', litersProduced: 25.5, ratePerLiter: 45, soldAmount: 25.5 * 45 },
    { session: 'Evening', litersProduced: 20.0, ratePerLiter: 45, soldAmount: 20.0 * 45 }
  ];
  const feedExpenses = [
    { amount: 500 },
    { amount: 350.5 }
  ];
  assert.strictEqual(calculateDairyYield(logs), 45.5);
  assert.strictEqual(calculateDairyRevenue(logs), 2047.5);
  assert.strictEqual(calculateDairyExpenses(feedExpenses), 850.5);
});

test('Dairy: Auto-calculates revenue from liters and rate if soldAmount is absent', () => {
  const logs = [
    { litersProduced: 30, ratePerLiter: 40 },
    { litersProduced: 15, ratePerLiter: 42 }
  ];
  assert.strictEqual(calculateDairyRevenue(logs), 30 * 40 + 15 * 42); // 1830
});

test('Dairy: Handles empty, null, or malformed arrays safely', () => {
  assert.strictEqual(calculateDairyYield([]), 0);
  assert.strictEqual(calculateDairyYield(null as any), 0);
  assert.strictEqual(calculateDairyRevenue([]), 0);
  assert.strictEqual(calculateDairyExpenses([]), 0);
  assert.strictEqual(calculateDairyExpenses([{ amount: 'invalid' } as any]), 0);
});

// ----------------------------------------------------
// 6. Bill Overdue Boundary (isBillOverdue)
// ----------------------------------------------------
test('Bill: Due today is NOT marked overdue before end of day', () => {
  const now = new Date('2026-10-13T12:00:00Z');
  const todayStr = '2026-10-13';
  assert.strictEqual(isBillOverdue(todayStr, false, now), false);
});

test('Bill: Due yesterday IS marked overdue', () => {
  const now = new Date('2026-10-13T12:00:00Z');
  const yesterdayStr = '2026-10-12';
  assert.strictEqual(isBillOverdue(yesterdayStr, false, now), true);
});

test('Bill: Due tomorrow is NOT marked overdue', () => {
  const now = new Date('2026-10-13T12:00:00Z');
  const tomorrowStr = '2026-10-14';
  assert.strictEqual(isBillOverdue(tomorrowStr, false, now), false);
});

test('Bill: Paid bills are NEVER overdue regardless of date', () => {
  const now = new Date('2026-10-13T12:00:00Z');
  assert.strictEqual(isBillOverdue('2020-01-01', true, now), false);
});

test('Bill: Malformed or missing date strings return false', () => {
  assert.strictEqual(isBillOverdue('', false), false);
  assert.strictEqual(isBillOverdue('not-a-date', false), false);
  assert.strictEqual(isBillOverdue(null as any, false), false);
});

// ----------------------------------------------------
// 7. Goal Progress Clamping & Advancement
// ----------------------------------------------------
test('Goal: Progress bounds clamping between 0 and 100', () => {
  assert.strictEqual(clampGoalProgress(-25), 0);
  assert.strictEqual(clampGoalProgress(0), 0);
  assert.strictEqual(clampGoalProgress(50.6), 51);
  assert.strictEqual(clampGoalProgress(100), 100);
  assert.strictEqual(clampGoalProgress(250), 100);
  assert.strictEqual(clampGoalProgress('75'), 75);
  assert.strictEqual(clampGoalProgress(NaN), 0);
  assert.strictEqual(clampGoalProgress(undefined), 0);
});

test('Goal: calculateNextGoalProgress increments by 25 and wraps at 100', () => {
  const step1 = calculateNextGoalProgress(0);
  assert.strictEqual(step1.progress, 25);
  assert.strictEqual(step1.isCompleted, false);

  const step2 = calculateNextGoalProgress(25);
  assert.strictEqual(step2.progress, 50);
  assert.strictEqual(step2.isCompleted, false);

  const step3 = calculateNextGoalProgress(50);
  assert.strictEqual(step3.progress, 75);
  assert.strictEqual(step3.isCompleted, false);

  const step4 = calculateNextGoalProgress(75);
  assert.strictEqual(step4.progress, 100);
  assert.strictEqual(step4.isCompleted, true);

  // When already 100, wraps back to 0
  const step5 = calculateNextGoalProgress(100);
  assert.strictEqual(step5.progress, 0);
  assert.strictEqual(step5.isCompleted, false);

  // Near 100 clamps to 100
  const stepNear = calculateNextGoalProgress(90);
  assert.strictEqual(stepNear.progress, 100);
  assert.strictEqual(stepNear.isCompleted, true);
});

// ----------------------------------------------------
// 8. Inter-Account Transfer Isolation (Finance)
// ----------------------------------------------------
test('Finance: Inter-account transfers are strictly excluded from income and expense summaries', () => {
  const transactions = [
    { type: 'income', amount: 20000, category: 'Salary' },
    { type: 'expense', amount: 5000, category: 'Rent' },
    { type: 'transfer', amount: 10000, category: 'Transfer', title: 'Transfer to Savings Wallet' },
    { type: 'transfer', amount: 3000, category: 'Transfer', title: 'Transfer to Cash Wallet' }
  ];
  const summary = calculateFinanceSummary(transactions);
  assert.strictEqual(summary.totalIncome, 20000, 'Income must not include transfers');
  assert.strictEqual(summary.totalExpense, 5000, 'Expense must not include transfers');
  assert.strictEqual(summary.balance, 15000, 'Balance must be income minus expense');
  assert.strictEqual(summary.categoryBreakdown['Transfer'], undefined, 'Transfers must not pollute expense category breakdown');
});

// ----------------------------------------------------
// 9. Health Vitals: BMI Calculation & Classification
// ----------------------------------------------------
test('BMI: Correct calculation and classification for normal, underweight, overweight, and obese', () => {
  // Height = 175 cm, Weight = 70 kg -> BMI = 70 / (1.75^2) = 22.86 -> 22.9 (Normal weight)
  const normal = calculateBMI(175, 70);
  assert.strictEqual(normal.bmi, 22.9);
  assert.strictEqual(normal.category, 'Normal weight');

  // Underweight: Height = 180 cm, Weight = 50 kg -> BMI = 15.4
  const under = calculateBMI(180, 50);
  assert.strictEqual(under.bmi, 15.4);
  assert.strictEqual(under.category, 'Underweight');

  // Overweight: Height = 170 cm, Weight = 80 kg -> BMI = 27.7
  const over = calculateBMI(170, 80);
  assert.strictEqual(over.bmi, 27.7);
  assert.strictEqual(over.category, 'Overweight');

  // Obese: Height = 160 cm, Weight = 95 kg -> BMI = 37.1
  const obese = calculateBMI(160, 95);
  assert.strictEqual(obese.bmi, 37.1);
  assert.strictEqual(obese.category, 'Obese');
});

test('BMI: Handles boundary and invalid inputs safely', () => {
  assert.deepStrictEqual(calculateBMI(0, 70), { bmi: 0, category: 'Invalid Input' });
  assert.deepStrictEqual(calculateBMI(175, 0), { bmi: 0, category: 'Invalid Input' });
  assert.deepStrictEqual(calculateBMI(-175, 70), { bmi: 0, category: 'Invalid Input' });
  assert.deepStrictEqual(calculateBMI('abc', 'xyz'), { bmi: 0, category: 'Invalid Input' });
});

// ----------------------------------------------------
// 10. Vehicle Fuel & Mileage Calculation
// ----------------------------------------------------
test('Vehicle Mileage: Correct mileage calculation for valid odometer readings', () => {
  // Current: 50,450 km, Previous: 50,000 km, Liters: 30 L -> Distance: 450 km -> Mileage: 15.00 km/L
  const result = calculateVehicleMileage(50450, 50000, 30);
  assert.strictEqual(result.isValid, true);
  assert.strictEqual(result.distance, 450);
  assert.strictEqual(result.mileage, 15);
});

test('Vehicle Mileage: Decreasing odometer reading is flagged as invalid to prevent corruption', () => {
  // Current: 40,000 km, Previous: 42,000 km (Decreased!)
  const result = calculateVehicleMileage(40000, 42000, 25);
  assert.strictEqual(result.isValid, false);
  assert.ok(result.error?.includes('less than previous odometer'));
});

test('Vehicle Mileage: Negative or zero liters handled safely', () => {
  const resultZero = calculateVehicleMileage(1000, 500, 0);
  assert.strictEqual(resultZero.isValid, false);

  const resultNegative = calculateVehicleMileage(1000, 500, -10);
  assert.strictEqual(resultNegative.isValid, false);
});

// ----------------------------------------------------
// 11. Budget Usage Calculation
// ----------------------------------------------------
test('Budget Usage: Calculates percent used, remaining balance, and over-budget flag', () => {
  // Budget = 20,000, Spent = 15,000 -> 75% used, 5,000 remaining, not over budget
  const normal = calculateBudgetUsage(20000, 15000);
  assert.strictEqual(normal.percentUsed, 75);
  assert.strictEqual(normal.remaining, 5000);
  assert.strictEqual(normal.isOverBudget, false);

  // Over budget: Budget = 10,000, Spent = 12,500 -> 125% used, -2,500 remaining, isOverBudget = true
  const over = calculateBudgetUsage(10000, 12500);
  assert.strictEqual(over.percentUsed, 125);
  assert.strictEqual(over.remaining, -2500);
  assert.strictEqual(over.isOverBudget, true);

  // Zero budget
  const zero = calculateBudgetUsage(0, 500);
  assert.strictEqual(zero.isOverBudget, true);
});

// ----------------------------------------------------
// 12. Days Remaining & Deadline Calculation
// ----------------------------------------------------
test('Days Remaining: Accurately computes countdown and overdue status', () => {
  const refDate = new Date('2026-10-14T00:00:00Z');

  // Due in 5 days (2026-10-19)
  const future = calculateDaysRemaining('2026-10-19', refDate);
  assert.strictEqual(future.daysRemaining, 5);
  assert.strictEqual(future.isOverdue, false);

  // Due today (2026-10-14)
  const today = calculateDaysRemaining('2026-10-14', refDate);
  assert.strictEqual(today.daysRemaining, 0);
  assert.strictEqual(today.isOverdue, false);

  // Overdue by 3 days (2026-10-11)
  const overdue = calculateDaysRemaining('2026-10-11', refDate);
  assert.strictEqual(overdue.daysRemaining, -3);
  assert.strictEqual(overdue.isOverdue, true);
});

console.log(`\n==============================================`);
console.log(`Tests run: ${totalTests} | Passed: ${passedTests} | Failed: ${totalTests - passedTests}`);
console.log(`==============================================\n`);

if (passedTests !== totalTests) {
  process.exit(1);
}
