/**
 * Vynora Cloud Firestore Service Engine
 * Complete, unified client-side database service replacing MongoDB.
 * Implements CRUD, query filtering, cross-module financial synchronization,
 * non-destructive historical data management, and real-time dashboard aggregation.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import {
  calculateFinanceSummary,
  calculateCropFinances,
  calculateDairyYield,
  calculateDairyRevenue,
  calculateDairyExpenses,
  isBillOverdue
} from '../utils/calculations';
import { queryCache, CACHE_TTL } from './queryCache';

// Helper to resolve the authenticated user ID
export function getActiveUserId(fallback?: string): string {
  return auth.currentUser?.uid || fallback || 'guest_user';
}

// Invalidate cache for a specific user domain, plus optional related domains (e.g. dashboard, reports, finance)
export function invalidateDomain(userId: string, domain: string, extras: string[] = []) {
  const uid = userId || getActiveUserId();
  queryCache.invalidate(`${uid}:${domain}`);
  for (const extra of extras) {
    queryCache.invalidate(`${uid}:${extra}`);
  }
}

// Convert Firestore document snapshot to typed object with _id for backwards compatibility
function snapToData<T = any>(snap: any): T & { _id: string; id: string } {
  const d = snap.data();
  // Format timestamps to ISO strings or numbers
  const formatted: any = { ...d, _id: snap.id, id: snap.id };
  if (formatted.createdAt instanceof Timestamp) {
    formatted.createdAt = formatted.createdAt.toDate().toISOString();
  }
  if (formatted.updatedAt instanceof Timestamp) {
    formatted.updatedAt = formatted.updatedAt.toDate().toISOString();
  }
  if (formatted.date instanceof Timestamp) {
    formatted.date = formatted.date.toDate().toISOString();
  }
  return formatted;
}

// Clean undefined fields to avoid Firestore unsupported field value errors
export function cleanPayload<T extends Record<string, any>>(obj: T): Partial<T> {
  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}

// Safely convert any date value (Timestamp, string, Date) to ISO string without RangeError
export function safeIsoDate(val: any, fallback = new Date().toISOString()): string {
  if (!val) return fallback;
  if (val instanceof Timestamp) return val.toDate().toISOString();
  if (typeof val === 'object' && val.seconds !== undefined) {
    return new Date(val.seconds * 1000).toISOString();
  }
  try {
    const d = new Date(val);
    return isNaN(d.getTime()) ? fallback : d.toISOString();
  } catch {
    return fallback;
  }
}

// ==========================================
// 1. FINANCE / TRANSACTIONS
// ==========================================
export const FinanceService = {
  async getTransactions(userId: string, forceRefresh = false) {
    const key = queryCache.makeKey(userId, 'finance', 'transactions');
    return queryCache.fetch(key, async () => {
      try {
        const q = query(
          collection(db, 'transactions'),
          where('userId', '==', userId),
          orderBy('date', 'desc')
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(snapToData);
      } catch {
        // Fallback query if composite index is pending
        const q = query(collection(db, 'transactions'), where('userId', '==', userId));
        const snapshot = await getDocs(q);
        const items = snapshot.docs.map(snapToData);
        return items.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
      }
    }, CACHE_TTL.TRANSACTIONS, forceRefresh);
  },

  async addTransaction(userId: string, data: any) {
    const docRef = await addDoc(collection(db, 'transactions'), {
      ...data,
      userId,
      amount: Number(data.amount) || 0,
      date: safeIsoDate(data.date),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    const created = { ...data, _id: docRef.id, id: docRef.id, userId, amount: Number(data.amount) || 0 };
    queryCache.addItemToDomain(userId, 'finance', created);
    invalidateDomain(userId, 'finance', ['dashboard', 'reports']);
    return created;
  },

  async updateTransaction(id: string, data: any, userId?: string) {
    const docRef = doc(db, 'transactions', id);
    const updateData: any = { ...data, updatedAt: serverTimestamp() };
    if (data.amount !== undefined) {
      updateData.amount = Number(data.amount) || 0;
    }
    await updateDoc(docRef, cleanPayload(updateData));
    const uid = userId || getActiveUserId();
    queryCache.updateItemInDomain(uid, 'finance', id, data);
    invalidateDomain(uid, 'finance', ['dashboard', 'reports']);
    return { ...data, _id: id, id };
  },

  async deleteTransaction(id: string, userId?: string) {
    await deleteDoc(doc(db, 'transactions', id));
    const uid = userId || getActiveUserId();
    queryCache.removeItemFromDomain(uid, 'finance', id);
    invalidateDomain(uid, 'finance', ['dashboard', 'reports']);
    return { message: 'Deleted' };
  },

  async getSummary(userId: string, forceRefresh = false) {
    const transactions = await this.getTransactions(userId, forceRefresh);
    return calculateFinanceSummary(transactions);
  },

  // Accounts & Wallets
  async getAccounts(userId: string, forceRefresh = false) {
    const key = queryCache.makeKey(userId, 'finance', 'accounts');
    return queryCache.fetch(key, async () => {
      const q = query(collection(db, 'accounts'), where('userId', '==', userId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(snapToData);
    }, CACHE_TTL.TRANSACTIONS, forceRefresh);
  },

  async addAccount(userId: string, data: any) {
    const docRef = await addDoc(collection(db, 'accounts'), {
      ...data,
      userId,
      balance: Number(data.balance) || 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    invalidateDomain(userId, 'finance', ['dashboard', 'reports']);
    return { ...data, _id: docRef.id, id: docRef.id };
  },

  async updateAccount(id: string, data: any, userId?: string) {
    const docRef = doc(db, 'accounts', id);
    const updateData: any = { ...data, updatedAt: serverTimestamp() };
    if (data.balance !== undefined) {
      updateData.balance = Number(data.balance) || 0;
    }
    await updateDoc(docRef, cleanPayload(updateData));
    const uid = userId || getActiveUserId();
    invalidateDomain(uid, 'finance', ['dashboard', 'reports']);
    return { ...data, _id: id, id };
  },

  async deleteAccount(id: string, userId?: string) {
    await deleteDoc(doc(db, 'accounts', id));
    const uid = userId || getActiveUserId();
    invalidateDomain(uid, 'finance', ['dashboard', 'reports']);
    return { message: 'Deleted' };
  },

  // Inter-account transfer (does not affect net income or expense totals)
  async transferBetweenAccounts(userId: string, data: {
    fromAccountId: string;
    toAccountId: string;
    fromAccountName: string;
    toAccountName: string;
    amount: number;
    date?: string;
    notes?: string;
  }) {
    const amt = Number(data.amount) || 0;
    if (amt <= 0) throw new Error('Transfer amount must be greater than zero');

    // 1. Record transfer transaction in transactions ledger
    const txRef = await addDoc(collection(db, 'transactions'), {
      userId,
      type: 'transfer',
      isTransfer: true,
      amount: amt,
      category: 'Transfer',
      title: `Transfer: ${data.fromAccountName} ➔ ${data.toAccountName}`,
      notes: data.notes || '',
      fromAccountId: data.fromAccountId,
      toAccountId: data.toAccountId,
      date: safeIsoDate(data.date),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    // 2. Adjust account balances
    if (data.fromAccountId) {
      const fromDoc = doc(db, 'accounts', data.fromAccountId);
      const fromSnap = await getDoc(fromDoc);
      if (fromSnap.exists()) {
        const currentBal = Number(fromSnap.data().balance) || 0;
        await updateDoc(fromDoc, { balance: currentBal - amt, updatedAt: serverTimestamp() });
      }
    }

    if (data.toAccountId) {
      const toDoc = doc(db, 'accounts', data.toAccountId);
      const toSnap = await getDoc(toDoc);
      if (toSnap.exists()) {
        const currentBal = Number(toSnap.data().balance) || 0;
        await updateDoc(toDoc, { balance: currentBal + amt, updatedAt: serverTimestamp() });
      }
    }

    invalidateDomain(userId, 'finance', ['dashboard', 'reports']);
    return { _id: txRef.id, id: txRef.id, ...data };
  },

  // Budgets
  async getBudgets(userId: string, forceRefresh = false) {
    const key = queryCache.makeKey(userId, 'finance', 'budgets');
    return queryCache.fetch(key, async () => {
      const q = query(collection(db, 'budgets'), where('userId', '==', userId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(snapToData);
    }, CACHE_TTL.TRANSACTIONS, forceRefresh);
  },

  async setBudget(userId: string, category: string, amount: number) {
    const q = query(collection(db, 'budgets'), where('userId', '==', userId), where('category', '==', category));
    const snapshot = await getDocs(q);
    const amt = Number(amount) || 0;

    let res: any;
    if (!snapshot.empty) {
      const docRef = doc(db, 'budgets', snapshot.docs[0].id);
      await updateDoc(docRef, { amount: amt, updatedAt: serverTimestamp() });
      res = { id: snapshot.docs[0].id, userId, category, amount: amt };
    } else {
      const docRef = await addDoc(collection(db, 'budgets'), {
        userId,
        category,
        amount: amt,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      res = { id: docRef.id, userId, category, amount: amt };
    }
    invalidateDomain(userId, 'finance', ['dashboard', 'reports']);
    return res;
  }
};

// ==========================================
// 2. LOANS
// ==========================================
export const LoanService = {
  async getLoans(userId: string, forceRefresh = false) {
    const key = queryCache.makeKey(userId, 'loans', 'all');
    return queryCache.fetch(key, async () => {
      const q = query(collection(db, 'loans'), where('userId', '==', userId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(snapToData);
    }, CACHE_TTL.LOANS, forceRefresh);
  },

  async addLoan(userId: string, data: any) {
    const docRef = await addDoc(collection(db, 'loans'), {
      ...data,
      userId,
      principalAmount: Number(data.principalAmount) || 0,
      interestRate: Number(data.interestRate) || 0,
      monthlyPay: Number(data.monthlyPay) || 0,
      paidMonths: data.paidMonths || [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    const created = { ...data, _id: docRef.id, id: docRef.id, userId };
    queryCache.addItemToDomain(userId, 'loans', created);
    invalidateDomain(userId, 'loans', ['dashboard', 'reports']);
    return created;
  },

  async updateLoan(id: string, data: any, userId?: string) {
    const docRef = doc(db, 'loans', id);
    await updateDoc(docRef, cleanPayload({ ...data, updatedAt: serverTimestamp() }));
    const uid = userId || getActiveUserId();
    queryCache.updateItemInDomain(uid, 'loans', id, data);
    invalidateDomain(uid, 'loans', ['dashboard', 'reports']);
    return { ...data, _id: id, id };
  },

  async deleteLoan(id: string, userId?: string) {
    await deleteDoc(doc(db, 'loans', id));
    // Cascade delete linked loan transactions
    const q = query(collection(db, 'transactions'), where('referenceId', '>=', id), where('referenceId', '<=', `${id}\uf8ff`));
    const snaps = await getDocs(q);
    const batch = writeBatch(db);
    snaps.forEach(d => batch.delete(d.ref));
    await batch.commit();
    const uid = userId || getActiveUserId();
    queryCache.removeItemFromDomain(uid, 'loans', id);
    invalidateDomain(uid, 'loans', ['finance', 'dashboard', 'reports']);
    return { message: 'Deleted' };
  },

  async togglePayment(id: string, monthString: string) {
    const docRef = doc(db, 'loans', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error('Loan not found');
    const loan = snap.data();
    const paidMonths: string[] = loan.paidMonths || [];
    const isPaid = paidMonths.includes(monthString);
    const refId = `${id}-${monthString}`;

    if (isPaid) {
      const updatedMonths = paidMonths.filter(m => m !== monthString);
      await updateDoc(docRef, { paidMonths: updatedMonths, updatedAt: serverTimestamp() });
      // Delete associated transaction
      const q = query(collection(db, 'transactions'), where('referenceId', '==', refId));
      const snaps = await getDocs(q);
      const batch = writeBatch(db);
      snaps.forEach(d => batch.delete(d.ref));
      await batch.commit();
      invalidateDomain(loan.userId, 'loans', ['finance', 'dashboard', 'reports']);
      return { ...loan, paidMonths: updatedMonths, _id: id };
    } else {
      const updatedMonths = [...paidMonths, monthString];
      await updateDoc(docRef, { paidMonths: updatedMonths, updatedAt: serverTimestamp() });
      // Record finance expense
      await addDoc(collection(db, 'transactions'), {
        userId: loan.userId,
        type: 'expense',
        amount: Number(loan.monthlyPay) || 0,
        category: 'Loan EMI',
        title: `EMI Payment - ${loan.loanName} (${monthString})`,
        referenceId: refId,
        date: new Date().toISOString(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      invalidateDomain(loan.userId, 'loans', ['finance', 'dashboard', 'reports']);
      return { ...loan, paidMonths: updatedMonths, _id: id };
    }
  }
};

// ==========================================
// 3. AGRICULTURE (CROPS)
// ==========================================
export const AgricultureService = {
  async getCrops(userId: string, forceRefresh = false) {
    const key = queryCache.makeKey(userId, 'agriculture', 'crops');
    return queryCache.fetch(key, async () => {
      const q = query(collection(db, 'crops'), where('userId', '==', userId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(snapToData);
    }, CACHE_TTL.AGRICULTURE, forceRefresh);
  },

  async syncCropFinance(userId: string, cropId: string, crop: any) {
    // Clean old transactions for this crop
    const q = query(collection(db, 'transactions'), where('referenceId', '==', cropId));
    const snaps = await getDocs(q);
    const batch = writeBatch(db);
    snaps.forEach(d => batch.delete(d.ref));
    await batch.commit();

    const { totalCost, totalRevenue } = calculateCropFinances(crop);

    if (totalCost > 0) {
      await addDoc(collection(db, 'transactions'), {
        userId,
        type: 'expense',
        amount: totalCost,
        category: 'Agriculture',
        title: `Crop Expense - ${crop.name} (${crop.season})`,
        referenceId: cropId,
        date: new Date().toISOString(),
        createdAt: serverTimestamp()
      });
    }

    if (totalRevenue > 0) {
      await addDoc(collection(db, 'transactions'), {
        userId,
        type: 'income',
        amount: totalRevenue,
        category: 'Agriculture',
        title: `Crop Revenue - ${crop.name} (${crop.season})`,
        referenceId: cropId,
        date: new Date().toISOString(),
        createdAt: serverTimestamp()
      });
    }
  },

  async addCrop(userId: string, data: any) {
    const docRef = await addDoc(collection(db, 'crops'), {
      ...data,
      userId,
      seedCost: Number(data.seedCost) || 0,
      fertilizerCost: Number(data.fertilizerCost) || 0,
      waterCost: Number(data.waterCost) || 0,
      labourCost: Number(data.labourCost) || 0,
      machineCost: Number(data.machineCost) || 0,
      harvestQuantity: Number(data.harvestQuantity) || 0,
      sellingPricePerUnit: Number(data.sellingPricePerUnit) || 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    await this.syncCropFinance(userId, docRef.id, data);
    invalidateDomain(userId, 'agriculture', ['finance', 'dashboard', 'reports']);
    return { ...data, _id: docRef.id, id: docRef.id };
  },

  async updateCrop(id: string, data: any, userId: string) {
    const docRef = doc(db, 'crops', id);
    await updateDoc(docRef, cleanPayload({ ...data, updatedAt: serverTimestamp() }));
    await this.syncCropFinance(userId, id, data);
    invalidateDomain(userId, 'agriculture', ['finance', 'dashboard', 'reports']);
    return { ...data, _id: id, id };
  },

  async deleteCrop(id: string, userId?: string) {
    await deleteDoc(doc(db, 'crops', id));
    const q = query(collection(db, 'transactions'), where('referenceId', '==', id));
    const snaps = await getDocs(q);
    const batch = writeBatch(db);
    snaps.forEach(d => batch.delete(d.ref));
    await batch.commit();
    const uid = userId || getActiveUserId();
    invalidateDomain(uid, 'agriculture', ['finance', 'dashboard', 'reports']);
    return { message: 'Deleted' };
  },

  // Farms and Land Parcels
  async getFarms(userId: string, forceRefresh = false) {
    const key = queryCache.makeKey(userId, 'agriculture', 'farms');
    return queryCache.fetch(key, async () => {
      const q = query(collection(db, 'farms'), where('userId', '==', userId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(snapToData);
    }, CACHE_TTL.AGRICULTURE, forceRefresh);
  },

  async addFarm(userId: string, data: any) {
    const docRef = await addDoc(collection(db, 'farms'), {
      ...data,
      userId,
      acreage: Number(data.acreage) || 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    invalidateDomain(userId, 'agriculture', ['dashboard']);
    return { ...data, _id: docRef.id, id: docRef.id };
  },

  async updateFarm(id: string, data: any, userId?: string) {
    const docRef = doc(db, 'farms', id);
    const updateData: any = { ...data, updatedAt: serverTimestamp() };
    if (data.acreage !== undefined) {
      updateData.acreage = Number(data.acreage) || 0;
    }
    await updateDoc(docRef, cleanPayload(updateData));
    const uid = userId || getActiveUserId();
    invalidateDomain(uid, 'agriculture', ['dashboard']);
    return { ...data, _id: id, id };
  },

  async deleteFarm(id: string, userId?: string) {
    await deleteDoc(doc(db, 'farms', id));
    const uid = userId || getActiveUserId();
    invalidateDomain(uid, 'agriculture', ['dashboard']);
    return { message: 'Deleted' };
  },

  // Field & Crop Activities
  async getCropActivities(cropId: string, userId?: string, forceRefresh = false) {
    const uid = userId || getActiveUserId();
    const key = queryCache.makeKey(uid, 'agriculture', `activities_${cropId}`);
    return queryCache.fetch(key, async () => {
      const constraints: any[] = [where('cropId', '==', cropId)];
      if (uid && uid !== 'guest_user') {
        constraints.unshift(where('userId', '==', uid));
      }
      const q = query(collection(db, 'crop_activities'), ...constraints);
      const snapshot = await getDocs(q);
      const items = snapshot.docs.map(snapToData);
      return items.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
    }, CACHE_TTL.AGRICULTURE, forceRefresh);
  },

  async addCropActivity(cropId: string, data: any, userId: string) {
    const cost = Number(data.cost) || 0;
    const docRef = await addDoc(collection(db, 'crop_activities'), {
      ...data,
      cropId,
      userId,
      cost,
      date: safeIsoDate(data.date),
      createdAt: serverTimestamp()
    });

    if (cost > 0) {
      await addDoc(collection(db, 'transactions'), {
        userId,
        type: 'expense',
        amount: cost,
        category: 'Agriculture',
        title: `Crop Activity - ${data.activityType || 'Field Work'} (${data.notes || ''})`,
        referenceId: cropId,
        date: safeIsoDate(data.date),
        createdAt: serverTimestamp()
      });
    }

    invalidateDomain(userId, 'agriculture', ['finance', 'dashboard', 'reports']);
    return { ...data, _id: docRef.id, id: docRef.id };
  },

  async updateCropActivity(id: string, data: any, userId?: string) {
    const docRef = doc(db, 'crop_activities', id);
    const cost = Number(data.cost) || 0;
    await updateDoc(docRef, cleanPayload({
      ...data,
      cost,
      date: safeIsoDate(data.date),
      updatedAt: serverTimestamp()
    }));
    const uid = userId || getActiveUserId();
    invalidateDomain(uid, 'agriculture', ['finance', 'dashboard', 'reports']);
    return { ...data, cost, _id: id, id };
  },

  async deleteCropActivity(id: string, userId?: string) {
    await deleteDoc(doc(db, 'crop_activities', id));
    const uid = userId || getActiveUserId();
    invalidateDomain(uid, 'agriculture', ['finance', 'dashboard', 'reports']);
    return { message: 'Deleted' };
  }
};

// ==========================================
// 4. DAIRY MANAGEMENT
// ==========================================
export const DairyService = {
  async getCows(userId: string, forceRefresh = false) {
    const key = queryCache.makeKey(userId, 'dairy', 'cows');
    return queryCache.fetch(key, async () => {
      const q = query(collection(db, 'cows'), where('userId', '==', userId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(snapToData);
    }, CACHE_TTL.DAIRY, forceRefresh);
  },

  async addCow(userId: string, data: any) {
    const purchasePrice = Number(data.purchasePrice) || 0;
    const docRef = await addDoc(collection(db, 'cows'), {
      ...data,
      userId,
      dailyFoodCost: Number(data.dailyFoodCost) || 0,
      purchasePrice,
      status: 'active',
      productionLogs: [],
      expenseLogs: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    if (purchasePrice > 0) {
      await addDoc(collection(db, 'transactions'), {
        userId,
        type: 'expense',
        amount: purchasePrice,
        category: 'Dairy',
        title: `Bought Cattle #${data.tagNumber}`,
        referenceId: docRef.id,
        date: data.purchaseDate || new Date().toISOString(),
        createdAt: serverTimestamp()
      });
    }

    invalidateDomain(userId, 'dairy', ['finance', 'dashboard', 'reports']);
    return { ...data, _id: docRef.id, id: docRef.id };
  },

  async updateCow(id: string, data: any, userId?: string) {
    const docRef = doc(db, 'cows', id);
    await updateDoc(docRef, cleanPayload({ ...data, updatedAt: serverTimestamp() }));
    const uid = userId || getActiveUserId();
    invalidateDomain(uid, 'dairy', ['dashboard', 'reports']);
    return { ...data, _id: id, id };
  },

  async deleteCow(id: string, userId?: string) {
    await deleteDoc(doc(db, 'cows', id));
    const uid = userId || getActiveUserId();
    invalidateDomain(uid, 'dairy', ['dashboard', 'reports']);
    return { message: 'Deleted' };
  },

  async addCowExpense(id: string, data: any) {
    const docRef = doc(db, 'cows', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error('Cow not found');
    const cow = snap.data();
    const amount = Number(data.amount) || 0;
    const expenseEntry = {
      date: data.date || new Date().toISOString(),
      type: data.type || 'Treatment',
      description: data.description || 'Expense',
      amount
    };
    const expenseLogs = [...(cow.expenseLogs || []), expenseEntry];
    await updateDoc(docRef, { expenseLogs, updatedAt: serverTimestamp() });

    if (amount > 0) {
      await addDoc(collection(db, 'transactions'), {
        userId: cow.userId,
        type: 'expense',
        amount,
        category: 'Dairy',
        title: `${expenseEntry.type} - Cattle #${cow.tagNumber} (${expenseEntry.description})`,
        referenceId: id,
        date: expenseEntry.date,
        createdAt: serverTimestamp()
      });
    }
    invalidateDomain(cow.userId, 'dairy', ['finance', 'dashboard', 'reports']);
    return { ...cow, expenseLogs, _id: id };
  },

  async sellCow(id: string, data: any) {
    const docRef = doc(db, 'cows', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error('Cow not found');
    const cow = snap.data();
    const salePrice = Number(data.salePrice) || 0;
    const saleDate = data.saleDate || new Date().toISOString();

    await updateDoc(docRef, { status: 'sold', salePrice, saleDate, updatedAt: serverTimestamp() });

    if (salePrice > 0) {
      await addDoc(collection(db, 'transactions'), {
        userId: cow.userId,
        type: 'income',
        amount: salePrice,
        category: 'Dairy',
        title: `Sold Cattle #${cow.tagNumber}`,
        referenceId: id,
        date: saleDate,
        createdAt: serverTimestamp()
      });
    }
    invalidateDomain(cow.userId, 'dairy', ['finance', 'dashboard', 'reports']);
    return { ...cow, status: 'sold', salePrice, saleDate, _id: id };
  },

  async getLogs(userId: string, forceRefresh = false) {
    const key = queryCache.makeKey(userId, 'dairy', 'logs');
    return queryCache.fetch(key, async () => {
      const q = query(collection(db, 'dairy_logs'), where('userId', '==', userId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(snapToData).sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
    }, CACHE_TTL.DAIRY, forceRefresh);
  },

  async addLog(userId: string, data: any) {
    const litersProduced = Number(data.litersProduced) || 0;
    const ratePerLiter = Number(data.ratePerLiter) || 0;
    const soldAmount = litersProduced * ratePerLiter;
    const date = data.date || new Date().toISOString();

    const docRef = await addDoc(collection(db, 'dairy_logs'), {
      ...data,
      userId,
      litersProduced,
      ratePerLiter,
      soldAmount,
      date,
      createdAt: serverTimestamp()
    });

    if (soldAmount > 0) {
      await addDoc(collection(db, 'transactions'), {
        userId,
        type: 'income',
        amount: soldAmount,
        category: 'Dairy',
        title: `Farm Milk Sale - ${data.session || 'Morning'} (${litersProduced}L @ ₹${ratePerLiter})`,
        referenceId: docRef.id,
        date,
        createdAt: serverTimestamp()
      });
    }

    invalidateDomain(userId, 'dairy', ['finance', 'dashboard', 'reports']);
    return { ...data, soldAmount, _id: docRef.id, id: docRef.id };
  },

  async updateLog(id: string, data: any, userId?: string) {
    const docRef = doc(db, 'dairy_logs', id);
    const litersProduced = Number(data.litersProduced) || 0;
    const ratePerLiter = Number(data.ratePerLiter) || 0;
    const soldAmount = litersProduced * ratePerLiter;
    await updateDoc(docRef, { ...data, litersProduced, ratePerLiter, soldAmount, updatedAt: serverTimestamp() });
    
    const q = query(collection(db, 'transactions'), where('referenceId', '==', id));
    const snaps = await getDocs(q);
    const batch = writeBatch(db);
    snaps.forEach(d => {
      batch.update(d.ref, {
        amount: soldAmount,
        title: `Farm Milk Sale - ${data.session || 'Morning'} (${litersProduced}L @ ₹${ratePerLiter})`,
        date: data.date || new Date().toISOString()
      });
    });
    await batch.commit();
    const uid = userId || getActiveUserId();
    invalidateDomain(uid, 'dairy', ['finance', 'dashboard', 'reports']);
    return { ...data, litersProduced, ratePerLiter, soldAmount, _id: id, id };
  },

  async deleteLog(id: string, userId?: string) {
    await deleteDoc(doc(db, 'dairy_logs', id));
    const q = query(collection(db, 'transactions'), where('referenceId', '==', id));
    const snaps = await getDocs(q);
    const batch = writeBatch(db);
    snaps.forEach(d => batch.delete(d.ref));
    await batch.commit();
    const uid = userId || getActiveUserId();
    invalidateDomain(uid, 'dairy', ['finance', 'dashboard', 'reports']);
    return { message: 'Deleted' };
  },

  async getFeed(userId: string, forceRefresh = false) {
    const key = queryCache.makeKey(userId, 'dairy', 'feed');
    return queryCache.fetch(key, async () => {
      const q = query(collection(db, 'farm_feed'), where('userId', '==', userId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(snapToData);
    }, CACHE_TTL.DAIRY, forceRefresh);
  },

  async addFeed(userId: string, data: any) {
    const amount = Number(data.amount) || 0;
    const date = data.date || new Date().toISOString();

    const docRef = await addDoc(collection(db, 'farm_feed'), {
      ...data,
      userId,
      amount,
      date,
      createdAt: serverTimestamp()
    });

    if (amount > 0) {
      await addDoc(collection(db, 'transactions'), {
        userId,
        type: 'expense',
        amount,
        category: 'Dairy',
        title: `Farm Feed Expense - ${data.description || 'Feed'}`,
        referenceId: docRef.id,
        date,
        createdAt: serverTimestamp()
      });
    }

    invalidateDomain(userId, 'dairy', ['finance', 'dashboard', 'reports']);
    return { ...data, _id: docRef.id, id: docRef.id };
  },

  async updateFeed(id: string, data: any, userId?: string) {
    const docRef = doc(db, 'farm_feed', id);
    const amount = Number(data.amount) || 0;
    await updateDoc(docRef, cleanPayload({
      ...data,
      amount,
      date: safeIsoDate(data.date),
      updatedAt: serverTimestamp()
    }));
    const uid = userId || getActiveUserId();
    invalidateDomain(uid, 'dairy', ['finance', 'dashboard', 'reports']);
    return { ...data, amount, _id: id, id };
  },

  async deleteFeed(id: string, userId?: string) {
    await deleteDoc(doc(db, 'farm_feed', id));
    const q = query(collection(db, 'transactions'), where('referenceId', '==', id));
    const snaps = await getDocs(q);
    const batch = writeBatch(db);
    snaps.forEach(d => batch.delete(d.ref));
    await batch.commit();
    const uid = userId || getActiveUserId();
    invalidateDomain(uid, 'dairy', ['finance', 'dashboard', 'reports']);
    return { message: 'Deleted' };
  },

  // Veterinary, Vaccination & Medical Logs
  async getVetRecords(cowId: string, userId?: string, forceRefresh = false) {
    const uid = userId || getActiveUserId();
    const key = queryCache.makeKey(uid, 'dairy', `vet_${cowId}`);
    return queryCache.fetch(key, async () => {
      const constraints: any[] = [where('cowId', '==', cowId)];
      if (uid && uid !== 'guest_user') {
        constraints.unshift(where('userId', '==', uid));
      }
      const q = query(collection(db, 'dairy_vet_records'), ...constraints);
      const snapshot = await getDocs(q);
      const items = snapshot.docs.map(snapToData);
      return items.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
    }, CACHE_TTL.DAIRY, forceRefresh);
  },

  async getAllVetRecords(userId: string, forceRefresh = false) {
    const key = queryCache.makeKey(userId, 'dairy', 'all_vet');
    return queryCache.fetch(key, async () => {
      const q = query(collection(db, 'dairy_vet_records'), where('userId', '==', userId));
      const snapshot = await getDocs(q);
      const items = snapshot.docs.map(snapToData);
      return items.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
    }, CACHE_TTL.DAIRY, forceRefresh);
  },

  async addVetRecord(cowId: string, data: any, userId: string) {
    const cost = Number(data.cost) || 0;
    const docRef = await addDoc(collection(db, 'dairy_vet_records'), {
      ...data,
      cowId,
      userId,
      cost,
      date: safeIsoDate(data.date),
      createdAt: serverTimestamp()
    });

    if (cost > 0) {
      await addDoc(collection(db, 'transactions'), {
        userId,
        type: 'expense',
        amount: cost,
        category: 'Dairy',
        title: `Veterinary / Treatment - #${data.tagNumber || cowId} (${data.treatment || 'Medical'})`,
        referenceId: docRef.id,
        date: safeIsoDate(data.date),
        createdAt: serverTimestamp()
      });
    }

    invalidateDomain(userId, 'dairy', ['finance', 'dashboard', 'reports']);
    return { ...data, _id: docRef.id, id: docRef.id };
  },

  async updateVetRecord(id: string, data: any, userId?: string) {
    const docRef = doc(db, 'dairy_vet_records', id);
    const cost = Number(data.cost) || 0;
    await updateDoc(docRef, cleanPayload({
      ...data,
      cost,
      date: safeIsoDate(data.date),
      updatedAt: serverTimestamp()
    }));
    const uid = userId || getActiveUserId();
    invalidateDomain(uid, 'dairy', ['finance', 'dashboard', 'reports']);
    return { ...data, cost, _id: id, id };
  },

  async deleteVetRecord(id: string, userId?: string) {
    await deleteDoc(doc(db, 'dairy_vet_records', id));
    const q = query(collection(db, 'transactions'), where('referenceId', '==', id));
    const snaps = await getDocs(q);
    const batch = writeBatch(db);
    snaps.forEach(d => batch.delete(d.ref));
    await batch.commit();
    const uid = userId || getActiveUserId();
    invalidateDomain(uid, 'dairy', ['finance', 'dashboard', 'reports']);
    return { message: 'Deleted' };
  },

  // Breeding & Calving Records
  async getBreedingRecords(cowId: string, userId?: string, forceRefresh = false) {
    const uid = userId || getActiveUserId();
    const key = queryCache.makeKey(uid, 'dairy', `breeding_${cowId}`);
    return queryCache.fetch(key, async () => {
      const constraints: any[] = [where('cowId', '==', cowId)];
      if (uid && uid !== 'guest_user') {
        constraints.unshift(where('userId', '==', uid));
      }
      const q = query(collection(db, 'dairy_breeding'), ...constraints);
      const snapshot = await getDocs(q);
      const items = snapshot.docs.map(snapToData);
      return items.sort((a, b) => new Date(b.inseminationDate || 0).getTime() - new Date(a.inseminationDate || 0).getTime());
    }, CACHE_TTL.DAIRY, forceRefresh);
  },

  async getAllBreedingRecords(userId: string, forceRefresh = false) {
    const key = queryCache.makeKey(userId, 'dairy', 'all_breeding');
    return queryCache.fetch(key, async () => {
      const q = query(collection(db, 'dairy_breeding'), where('userId', '==', userId));
      const snapshot = await getDocs(q);
      const items = snapshot.docs.map(snapToData);
      return items.sort((a, b) => new Date(b.inseminationDate || 0).getTime() - new Date(a.inseminationDate || 0).getTime());
    }, CACHE_TTL.DAIRY, forceRefresh);
  },

  async addBreedingRecord(cowId: string, data: any, userId: string) {
    const docRef = await addDoc(collection(db, 'dairy_breeding'), {
      ...data,
      cowId,
      userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    invalidateDomain(userId, 'dairy');
    return { ...data, _id: docRef.id, id: docRef.id };
  },

  async updateBreedingRecord(id: string, data: any, userId?: string) {
    const docRef = doc(db, 'dairy_breeding', id);
    await updateDoc(docRef, cleanPayload({
      ...data,
      updatedAt: serverTimestamp()
    }));
    const uid = userId || getActiveUserId();
    invalidateDomain(uid, 'dairy');
    return { ...data, _id: id, id };
  },

  async deleteBreedingRecord(id: string, userId?: string) {
    await deleteDoc(doc(db, 'dairy_breeding', id));
    const uid = userId || getActiveUserId();
    invalidateDomain(uid, 'dairy');
    return { message: 'Deleted' };
  }
};

// ==========================================
// 5. MEDICINES
// ==========================================
export const MedicineService = {
  async getMedicines(userId: string, forceRefresh = false) {
    const key = queryCache.makeKey(userId, 'medicine', 'all');
    return queryCache.fetch(key, async () => {
      const q = query(collection(db, 'medicines'), where('userId', '==', userId));
      const snapshot = await getDocs(q);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const medicines = snapshot.docs.map(snapToData);
      // Non-destructively advance expired courses without deleting
      for (const med of medicines) {
        if (med.endDate && new Date(med.endDate) < today && !med.isCompleted) {
          await updateDoc(doc(db, 'medicines', med._id), { isCompleted: true, updatedAt: serverTimestamp() });
          med.isCompleted = true;
        }
      }
      return medicines;
    }, CACHE_TTL.HEALTH, forceRefresh);
  },

  async addMedicine(userId: string, data: any) {
    const docRef = await addDoc(collection(db, 'medicines'), {
      ...data,
      userId,
      isCompleted: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    const created = { ...data, _id: docRef.id, id: docRef.id, userId, isCompleted: false };
    queryCache.addItemToDomain(userId, 'medicine', created);
    invalidateDomain(userId, 'medicine', ['dashboard']);
    return created;
  },

  async updateMedicine(id: string, data: any, userId?: string) {
    const docRef = doc(db, 'medicines', id);
    await updateDoc(docRef, cleanPayload({ ...data, updatedAt: serverTimestamp() }));
    const uid = userId || getActiveUserId();
    queryCache.updateItemInDomain(uid, 'medicine', id, data);
    invalidateDomain(uid, 'medicine', ['dashboard']);
    return { ...data, _id: id, id };
  },

  async deleteMedicine(id: string, userId?: string) {
    await deleteDoc(doc(db, 'medicines', id));
    const uid = userId || getActiveUserId();
    queryCache.removeItemFromDomain(uid, 'medicine', id);
    invalidateDomain(uid, 'medicine', ['dashboard']);
    return { message: 'Deleted' };
  },

  async logDose(id: string, status: 'taken' | 'skipped', timeSlot: string, userId?: string) {
    const docRef = doc(db, 'medicines', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error('Medicine not found');
    const med = snap.data();
    const entry = {
      timestamp: new Date().toISOString(),
      status,
      timeSlot
    };
    const doseLogs = [...(med.doseLogs || []), entry];
    let newStock = med.stock;
    if (status === 'taken' && typeof newStock === 'number' && newStock > 0) {
      newStock -= 1;
    }
    await updateDoc(docRef, { doseLogs, stock: newStock, updatedAt: serverTimestamp() });
    const uid = userId || med.userId || getActiveUserId();
    invalidateDomain(uid, 'medicine', ['dashboard']);
    return { ...med, doseLogs, stock: newStock, _id: id, id };
  },

  async refillStock(id: string, count: number, userId?: string) {
    const docRef = doc(db, 'medicines', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error('Medicine not found');
    const med = snap.data();
    const currentStock = Number(med.stock) || 0;
    const newStock = currentStock + count;
    await updateDoc(docRef, { stock: newStock, updatedAt: serverTimestamp() });
    const uid = userId || med.userId || getActiveUserId();
    invalidateDomain(uid, 'medicine', ['dashboard']);
    return { ...med, stock: newStock, _id: id, id };
  }
};

// ==========================================
// 6. BILLS & UTILITIES
// ==========================================
export const BillService = {
  async getBills(userId: string, forceRefresh = false) {
    const key = queryCache.makeKey(userId, 'bills', 'all');
    return queryCache.fetch(key, async () => {
      const q = query(collection(db, 'bills'), where('userId', '==', userId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(snapToData).sort((a, b) => new Date(a.dueDate || 0).getTime() - new Date(b.dueDate || 0).getTime());
    }, CACHE_TTL.BILLS, forceRefresh);
  },

  async addBill(userId: string, data: any) {
    const docRef = await addDoc(collection(db, 'bills'), {
      ...data,
      userId,
      amount: Number(data.amount) || 0,
      isPaid: Boolean(data.isPaid),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    const created = { ...data, _id: docRef.id, id: docRef.id, userId, amount: Number(data.amount) || 0, isPaid: Boolean(data.isPaid) };
    queryCache.addItemToDomain(userId, 'bills', created);
    invalidateDomain(userId, 'bills', ['dashboard', 'reports']);
    return created;
  },

  async updateBill(id: string, data: any, userId?: string) {
    const docRef = doc(db, 'bills', id);
    await updateDoc(docRef, cleanPayload({ ...data, updatedAt: serverTimestamp() }));
    const uid = userId || getActiveUserId();
    queryCache.updateItemInDomain(uid, 'bills', id, data);
    invalidateDomain(uid, 'bills', ['dashboard', 'reports']);
    return { ...data, _id: id, id };
  },

  async deleteBill(id: string, userId?: string) {
    await deleteDoc(doc(db, 'bills', id));
    const q = query(collection(db, 'transactions'), where('referenceId', '==', id));
    const snaps = await getDocs(q);
    const batch = writeBatch(db);
    snaps.forEach(d => batch.delete(d.ref));
    await batch.commit();
    const uid = userId || getActiveUserId();
    queryCache.removeItemFromDomain(uid, 'bills', id);
    invalidateDomain(uid, 'bills', ['finance', 'dashboard', 'reports']);
    return { message: 'Deleted' };
  },

  async togglePaid(id: string, currentStatus: boolean, billData: any) {
    const isPaid = !currentStatus;
    const docRef = doc(db, 'bills', id);
    await updateDoc(docRef, { isPaid, updatedAt: serverTimestamp() });

    if (isPaid) {
      await addDoc(collection(db, 'transactions'), {
        userId: billData.userId,
        type: 'expense',
        amount: Number(billData.amount) || 0,
        category: 'Bills & Utilities',
        title: `Bill Paid - ${billData.name}`,
        referenceId: id,
        date: new Date().toISOString(),
        createdAt: serverTimestamp()
      });
    } else {
      const q = query(collection(db, 'transactions'), where('referenceId', '==', id));
      const snaps = await getDocs(q);
      const batch = writeBatch(db);
      snaps.forEach(d => batch.delete(d.ref));
      await batch.commit();
    }
    invalidateDomain(billData.userId, 'bills', ['finance', 'dashboard', 'reports']);
  }
};

// ==========================================
// 7. DIGITAL LOCKER (DOCUMENTS)
// ==========================================
export const DocumentService = {
  async getDocuments(userId: string, forceRefresh = false) {
    const key = queryCache.makeKey(userId, 'documents', 'all');
    return queryCache.fetch(key, async () => {
      const q = query(collection(db, 'documents'), where('userId', '==', userId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(snapToData);
    }, CACHE_TTL.DOCUMENTS, forceRefresh);
  },

  async addDocument(userId: string, data: any) {
    const docRef = await addDoc(collection(db, 'documents'), {
      ...data,
      userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    invalidateDomain(userId, 'documents');
    return { ...data, _id: docRef.id, id: docRef.id };
  },

  async updateDocument(id: string, data: any, userId?: string) {
    const docRef = doc(db, 'documents', id);
    await updateDoc(docRef, cleanPayload({ ...data, updatedAt: serverTimestamp() }));
    const uid = userId || getActiveUserId();
    invalidateDomain(uid, 'documents');
    return { ...data, _id: id, id };
  },

  async deleteDocument(id: string, userId?: string) {
    await deleteDoc(doc(db, 'documents', id));
    const uid = userId || getActiveUserId();
    invalidateDomain(uid, 'documents');
    return { message: 'Deleted' };
  }
};

// ==========================================
// 8. EMERGENCY CONTACTS
// ==========================================
export const ContactService = {
  async getContacts(userId: string, forceRefresh = false) {
    const key = queryCache.makeKey(userId, 'contacts', 'all');
    return queryCache.fetch(key, async () => {
      const q = query(collection(db, 'contacts'), where('userId', '==', userId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(snapToData).sort((a, b) => (b.isEmergency ? 1 : 0) - (a.isEmergency ? 1 : 0));
    }, CACHE_TTL.CONTACTS, forceRefresh);
  },

  async addContact(userId: string, data: any) {
    const docRef = await addDoc(collection(db, 'contacts'), {
      ...data,
      userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    invalidateDomain(userId, 'contacts');
    return { ...data, _id: docRef.id, id: docRef.id };
  },

  async updateContact(id: string, data: any, userId?: string) {
    const docRef = doc(db, 'contacts', id);
    await updateDoc(docRef, cleanPayload({ ...data, updatedAt: serverTimestamp() }));
    const uid = userId || getActiveUserId();
    invalidateDomain(uid, 'contacts');
    return { ...data, _id: id, id };
  },

  async deleteContact(id: string, userId?: string) {
    await deleteDoc(doc(db, 'contacts', id));
    const uid = userId || getActiveUserId();
    invalidateDomain(uid, 'contacts');
    return { message: 'Deleted' };
  }
};

// ==========================================
// 9. TASKS & PLANNER
// ==========================================
export const TaskService = {
  async getTasks(userId: string, forceRefresh = false) {
    const key = queryCache.makeKey(userId, 'tasks', 'all');
    return queryCache.fetch(key, async () => {
      const q = query(collection(db, 'tasks'), where('userId', '==', userId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(snapToData);
    }, CACHE_TTL.TASKS, forceRefresh);
  },

  async addTask(userId: string, data: any) {
    const docRef = await addDoc(collection(db, 'tasks'), {
      ...data,
      userId,
      isCompleted: Boolean(data.isCompleted),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    const created = { ...data, _id: docRef.id, id: docRef.id, userId, isCompleted: Boolean(data.isCompleted) };
    queryCache.addItemToDomain(userId, 'tasks', created);
    invalidateDomain(userId, 'tasks', ['dashboard', 'reports']);
    return created;
  },

  async updateTask(id: string, data: any, userId?: string) {
    const docRef = doc(db, 'tasks', id);
    await updateDoc(docRef, cleanPayload({ ...data, updatedAt: serverTimestamp() }));
    const uid = userId || getActiveUserId();
    queryCache.updateItemInDomain(uid, 'tasks', id, data);
    invalidateDomain(uid, 'tasks', ['dashboard', 'reports']);
    return { ...data, _id: id, id };
  },

  async deleteTask(id: string, userId?: string) {
    await deleteDoc(doc(db, 'tasks', id));
    const uid = userId || getActiveUserId();
    queryCache.removeItemFromDomain(uid, 'tasks', id);
    invalidateDomain(uid, 'tasks', ['dashboard', 'reports']);
    return { message: 'Deleted' };
  }
};

// ==========================================
// 10. VEHICLES
// ==========================================
export const VehicleService = {
  async getVehicles(userId: string, forceRefresh = false) {
    const key = queryCache.makeKey(userId, 'vehicles', 'all');
    return queryCache.fetch(key, async () => {
      const q = query(collection(db, 'vehicles'), where('userId', '==', userId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(snapToData);
    }, CACHE_TTL.VEHICLES, forceRefresh);
  },

  async addVehicle(userId: string, data: any) {
    const docRef = await addDoc(collection(db, 'vehicles'), {
      ...data,
      userId,
      logs: data.logs || [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    const created = { ...data, _id: docRef.id, id: docRef.id, userId, logs: data.logs || [] };
    queryCache.addItemToDomain(userId, 'vehicles', created);
    invalidateDomain(userId, 'vehicles', ['dashboard', 'reports']);
    return created;
  },

  async updateVehicle(id: string, data: any, userId?: string) {
    const docRef = doc(db, 'vehicles', id);
    await updateDoc(docRef, cleanPayload({ ...data, updatedAt: serverTimestamp() }));
    const uid = userId || getActiveUserId();
    queryCache.updateItemInDomain(uid, 'vehicles', id, data);
    invalidateDomain(uid, 'vehicles', ['dashboard', 'reports']);
    return { ...data, _id: id, id };
  },

  async deleteVehicle(id: string, userId?: string) {
    await deleteDoc(doc(db, 'vehicles', id));
    const q = query(collection(db, 'transactions'), where('referenceId', '==', id));
    const snaps = await getDocs(q);
    const batch = writeBatch(db);
    snaps.forEach(d => batch.delete(d.ref));
    await batch.commit();
    const uid = userId || getActiveUserId();
    queryCache.removeItemFromDomain(uid, 'vehicles', id);
    invalidateDomain(uid, 'vehicles', ['finance', 'dashboard', 'reports']);
    return { message: 'Deleted' };
  },

  // Legacy log support
  async addLog(id: string, logData: any) {
    const docRef = doc(db, 'vehicles', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error('Vehicle not found');
    const vehicle = snap.data();
    const cost = Number(logData.cost) || 0;
    const entry = {
      date: logData.date || new Date().toISOString(),
      type: logData.type || 'Service',
      cost,
      notes: logData.notes || ''
    };
    const logs = [...(vehicle.logs || []), entry];
    await updateDoc(docRef, { logs, updatedAt: serverTimestamp() });

    if (cost > 0) {
      await addDoc(collection(db, 'transactions'), {
        userId: vehicle.userId,
        type: 'expense',
        amount: cost,
        category: 'Transport',
        title: `${entry.type} - ${vehicle.name} (${entry.notes || 'Service Log'})`,
        referenceId: id,
        date: entry.date,
        createdAt: serverTimestamp()
      });
    }
    invalidateDomain(vehicle.userId, 'vehicles', ['finance', 'dashboard', 'reports']);
    return { ...vehicle, logs, _id: id };
  },

  // Dedicated Fuel Logs with Mileage Tracking
  async getFuelLogs(vehicleId: string, userId?: string, forceRefresh = false) {
    const uid = userId || getActiveUserId();
    const key = queryCache.makeKey(uid, 'vehicles', `fuel_${vehicleId}`);
    return queryCache.fetch(key, async () => {
      const constraints: any[] = [where('vehicleId', '==', vehicleId)];
      if (uid && uid !== 'guest_user') {
        constraints.unshift(where('userId', '==', uid));
      }
      const q = query(collection(db, 'vehicle_fuel_logs'), ...constraints);
      const snapshot = await getDocs(q);
      const items = snapshot.docs.map(snapToData);
      return items.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
    }, CACHE_TTL.VEHICLES, forceRefresh);
  },

  async addFuelLog(vehicleId: string, data: any, userId: string) {
    const cost = Number(data.cost) || 0;
    const docRef = await addDoc(collection(db, 'vehicle_fuel_logs'), {
      ...data,
      vehicleId,
      userId,
      odometer: Number(data.odometer) || 0,
      liters: Number(data.liters) || 0,
      pricePerLiter: Number(data.pricePerLiter) || 0,
      cost,
      date: safeIsoDate(data.date),
      createdAt: serverTimestamp()
    });

    if (cost > 0) {
      await addDoc(collection(db, 'transactions'), {
        userId,
        type: 'expense',
        amount: cost,
        category: 'Transport',
        title: `Vehicle Fuel - ${data.vehicleName || 'Vehicle'} (${data.liters || 0}L)`,
        referenceId: docRef.id,
        date: safeIsoDate(data.date),
        createdAt: serverTimestamp()
      });
    }

    invalidateDomain(userId, 'vehicles', ['finance', 'dashboard', 'reports']);
    return { ...data, _id: docRef.id, id: docRef.id };
  },

  async updateFuelLog(id: string, data: any, userId?: string) {
    const docRef = doc(db, 'vehicle_fuel_logs', id);
    const cost = Number(data.cost) || 0;
    await updateDoc(docRef, cleanPayload({
      ...data,
      odometer: Number(data.odometer) || 0,
      liters: Number(data.liters) || 0,
      pricePerLiter: Number(data.pricePerLiter) || 0,
      cost,
      date: safeIsoDate(data.date),
      updatedAt: serverTimestamp()
    }));

    const q = query(collection(db, 'transactions'), where('referenceId', '==', id));
    const snaps = await getDocs(q);
    const batch = writeBatch(db);
    snaps.forEach(d => {
      batch.update(d.ref, {
        amount: cost,
        title: `Vehicle Fuel - ${data.vehicleName || 'Vehicle'} (${data.liters || 0}L)`,
        date: safeIsoDate(data.date)
      });
    });
    await batch.commit();

    const uid = userId || getActiveUserId();
    invalidateDomain(uid, 'vehicles', ['finance', 'dashboard', 'reports']);
    return { ...data, cost, _id: id, id };
  },

  async deleteFuelLog(id: string, userId?: string) {
    await deleteDoc(doc(db, 'vehicle_fuel_logs', id));
    const q = query(collection(db, 'transactions'), where('referenceId', '==', id));
    const snaps = await getDocs(q);
    const batch = writeBatch(db);
    snaps.forEach(d => batch.delete(d.ref));
    await batch.commit();
    const uid = userId || getActiveUserId();
    invalidateDomain(uid, 'vehicles', ['finance', 'dashboard', 'reports']);
    return { message: 'Deleted' };
  },

  // Dedicated Maintenance & Service Logs
  async getServiceLogs(vehicleId: string, userId?: string, forceRefresh = false) {
    const uid = userId || getActiveUserId();
    const key = queryCache.makeKey(uid, 'vehicles', `service_${vehicleId}`);
    return queryCache.fetch(key, async () => {
      const constraints: any[] = [where('vehicleId', '==', vehicleId)];
      if (uid && uid !== 'guest_user') {
        constraints.unshift(where('userId', '==', uid));
      }
      const q = query(collection(db, 'vehicle_service_logs'), ...constraints);
      const snapshot = await getDocs(q);
      const items = snapshot.docs.map(snapToData);
      return items.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
    }, CACHE_TTL.VEHICLES, forceRefresh);
  },

  async addServiceLog(vehicleId: string, data: any, userId: string) {
    const cost = Number(data.cost) || 0;
    const docRef = await addDoc(collection(db, 'vehicle_service_logs'), {
      ...data,
      vehicleId,
      userId,
      cost,
      odometer: Number(data.odometer) || 0,
      date: safeIsoDate(data.date),
      createdAt: serverTimestamp()
    });

    if (cost > 0) {
      await addDoc(collection(db, 'transactions'), {
        userId,
        type: 'expense',
        amount: cost,
        category: 'Transport',
        title: `Vehicle Service - ${data.vehicleName || 'Vehicle'} (${data.serviceType || 'Maintenance'})`,
        referenceId: docRef.id,
        date: safeIsoDate(data.date),
        createdAt: serverTimestamp()
      });
    }

    invalidateDomain(userId, 'vehicles', ['finance', 'dashboard', 'reports']);
    return { ...data, _id: docRef.id, id: docRef.id };
  },

  async updateServiceLog(id: string, data: any, userId?: string) {
    const docRef = doc(db, 'vehicle_service_logs', id);
    const cost = Number(data.cost) || 0;
    await updateDoc(docRef, cleanPayload({
      ...data,
      cost,
      odometer: Number(data.odometer) || 0,
      date: safeIsoDate(data.date),
      updatedAt: serverTimestamp()
    }));

    const q = query(collection(db, 'transactions'), where('referenceId', '==', id));
    const snaps = await getDocs(q);
    const batch = writeBatch(db);
    snaps.forEach(d => {
      batch.update(d.ref, {
        amount: cost,
        title: `Vehicle Service - ${data.vehicleName || 'Vehicle'} (${data.serviceType || 'Maintenance'})`,
        date: safeIsoDate(data.date)
      });
    });
    await batch.commit();

    const uid = userId || getActiveUserId();
    invalidateDomain(uid, 'vehicles', ['finance', 'dashboard', 'reports']);
    return { ...data, cost, _id: id, id };
  },

  async deleteServiceLog(id: string, userId?: string) {
    await deleteDoc(doc(db, 'vehicle_service_logs', id));
    const q = query(collection(db, 'transactions'), where('referenceId', '==', id));
    const snaps = await getDocs(q);
    const batch = writeBatch(db);
    snaps.forEach(d => batch.delete(d.ref));
    await batch.commit();
    const uid = userId || getActiveUserId();
    invalidateDomain(uid, 'vehicles', ['finance', 'dashboard', 'reports']);
    return { message: 'Deleted' };
  },

  // Dedicated Vehicle Repairs & Spare Parts
  async getVehicleRepairs(vehicleId: string, userId?: string, forceRefresh = false) {
    const uid = userId || getActiveUserId();
    const key = queryCache.makeKey(uid, 'vehicles', `repair_${vehicleId}`);
    return queryCache.fetch(key, async () => {
      const constraints: any[] = [where('vehicleId', '==', vehicleId)];
      if (uid && uid !== 'guest_user') {
        constraints.unshift(where('userId', '==', uid));
      }
      const q = query(collection(db, 'vehicle_repairs'), ...constraints);
      const snapshot = await getDocs(q);
      const items = snapshot.docs.map(snapToData);
      return items.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
    }, CACHE_TTL.VEHICLES, forceRefresh);
  },

  async addVehicleRepair(vehicleId: string, data: any, userId: string) {
    const cost = Number(data.cost) || 0;
    const docRef = await addDoc(collection(db, 'vehicle_repairs'), {
      ...data,
      vehicleId,
      userId,
      cost,
      date: safeIsoDate(data.date),
      createdAt: serverTimestamp()
    });

    if (cost > 0) {
      await addDoc(collection(db, 'transactions'), {
        userId,
        type: 'expense',
        amount: cost,
        category: 'Transport',
        title: `Vehicle Repair - ${data.vehicleName || 'Vehicle'} (${data.partName || 'Repairs'})`,
        referenceId: docRef.id,
        date: safeIsoDate(data.date),
        createdAt: serverTimestamp()
      });
    }

    invalidateDomain(userId, 'vehicles', ['finance', 'dashboard', 'reports']);
    return { ...data, _id: docRef.id, id: docRef.id };
  },

  async updateVehicleRepair(id: string, data: any, userId?: string) {
    const docRef = doc(db, 'vehicle_repairs', id);
    const cost = Number(data.cost) || 0;
    await updateDoc(docRef, cleanPayload({
      ...data,
      cost,
      date: safeIsoDate(data.date),
      updatedAt: serverTimestamp()
    }));

    const q = query(collection(db, 'transactions'), where('referenceId', '==', id));
    const snaps = await getDocs(q);
    const batch = writeBatch(db);
    snaps.forEach(d => {
      batch.update(d.ref, {
        amount: cost,
        title: `Vehicle Repair - ${data.vehicleName || 'Vehicle'} (${data.partName || 'Repairs'})`,
        date: safeIsoDate(data.date)
      });
    });
    await batch.commit();

    const uid = userId || getActiveUserId();
    invalidateDomain(uid, 'vehicles', ['finance', 'dashboard', 'reports']);
    return { ...data, cost, _id: id, id };
  },

  async deleteVehicleRepair(id: string, userId?: string) {
    await deleteDoc(doc(db, 'vehicle_repairs', id));
    const q = query(collection(db, 'transactions'), where('referenceId', '==', id));
    const snaps = await getDocs(q);
    const batch = writeBatch(db);
    snaps.forEach(d => batch.delete(d.ref));
    await batch.commit();
    const uid = userId || getActiveUserId();
    invalidateDomain(uid, 'vehicles', ['finance', 'dashboard', 'reports']);
    return { message: 'Deleted' };
  },

  // Dedicated Vehicle Expenses (Toll, Fastag, Parking, Fines, Washing)
  async getVehicleExpenses(vehicleId: string, userId?: string, forceRefresh = false) {
    const uid = userId || getActiveUserId();
    const key = queryCache.makeKey(uid, 'vehicles', `expense_${vehicleId}`);
    return queryCache.fetch(key, async () => {
      const constraints: any[] = [where('vehicleId', '==', vehicleId)];
      if (uid && uid !== 'guest_user') {
        constraints.unshift(where('userId', '==', uid));
      }
      const q = query(collection(db, 'vehicle_expenses'), ...constraints);
      const snapshot = await getDocs(q);
      const items = snapshot.docs.map(snapToData);
      return items.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
    }, CACHE_TTL.VEHICLES, forceRefresh);
  },

  async addVehicleExpense(vehicleId: string, data: any, userId: string) {
    const amount = Number(data.amount) || 0;
    const docRef = await addDoc(collection(db, 'vehicle_expenses'), {
      ...data,
      vehicleId,
      userId,
      amount,
      date: safeIsoDate(data.date),
      createdAt: serverTimestamp()
    });

    if (amount > 0) {
      await addDoc(collection(db, 'transactions'), {
        userId,
        type: 'expense',
        amount,
        category: 'Transport',
        title: `Vehicle Expense - ${data.vehicleName || 'Vehicle'} (${data.expenseType || 'Misc'})`,
        referenceId: docRef.id,
        date: safeIsoDate(data.date),
        createdAt: serverTimestamp()
      });
    }

    invalidateDomain(userId, 'vehicles', ['finance', 'dashboard', 'reports']);
    return { ...data, _id: docRef.id, id: docRef.id };
  },

  async updateVehicleExpense(id: string, data: any, userId?: string) {
    const docRef = doc(db, 'vehicle_expenses', id);
    const amount = Number(data.amount) || 0;
    await updateDoc(docRef, cleanPayload({
      ...data,
      amount,
      date: safeIsoDate(data.date),
      updatedAt: serverTimestamp()
    }));

    const q = query(collection(db, 'transactions'), where('referenceId', '==', id));
    const snaps = await getDocs(q);
    const batch = writeBatch(db);
    snaps.forEach(d => {
      batch.update(d.ref, {
        amount,
        title: `Vehicle Expense - ${data.vehicleName || 'Vehicle'} (${data.expenseType || 'Misc'})`,
        date: safeIsoDate(data.date)
      });
    });
    await batch.commit();

    const uid = userId || getActiveUserId();
    invalidateDomain(uid, 'vehicles', ['finance', 'dashboard', 'reports']);
    return { ...data, amount, _id: id, id };
  },

  async deleteVehicleExpense(id: string, userId?: string) {
    await deleteDoc(doc(db, 'vehicle_expenses', id));
    const q = query(collection(db, 'transactions'), where('referenceId', '==', id));
    const snaps = await getDocs(q);
    const batch = writeBatch(db);
    snaps.forEach(d => batch.delete(d.ref));
    await batch.commit();
    const uid = userId || getActiveUserId();
    invalidateDomain(uid, 'vehicles', ['finance', 'dashboard', 'reports']);
    return { message: 'Deleted' };
  },

  // Dedicated Vehicle Maintenance Reminders
  async getVehicleReminders(vehicleId: string, userId?: string, forceRefresh = false) {
    const uid = userId || getActiveUserId();
    const key = queryCache.makeKey(uid, 'vehicles', `reminder_${vehicleId}`);
    return queryCache.fetch(key, async () => {
      const constraints: any[] = [where('vehicleId', '==', vehicleId)];
      if (uid && uid !== 'guest_user') {
        constraints.unshift(where('userId', '==', uid));
      }
      const q = query(collection(db, 'vehicle_reminders'), ...constraints);
      const snapshot = await getDocs(q);
      const items = snapshot.docs.map(snapToData);
      return items.sort((a, b) => new Date(a.dueDate || 0).getTime() - new Date(b.dueDate || 0).getTime());
    }, CACHE_TTL.VEHICLES, forceRefresh);
  },

  async addVehicleReminder(vehicleId: string, data: any, userId: string) {
    const docRef = await addDoc(collection(db, 'vehicle_reminders'), {
      ...data,
      vehicleId,
      userId,
      isCompleted: false,
      createdAt: serverTimestamp()
    });
    invalidateDomain(userId, 'vehicles');
    return { ...data, _id: docRef.id, id: docRef.id };
  },

  async updateVehicleReminder(id: string, data: any, userId?: string) {
    const docRef = doc(db, 'vehicle_reminders', id);
    await updateDoc(docRef, cleanPayload({
      ...data,
      updatedAt: serverTimestamp()
    }));
    const uid = userId || getActiveUserId();
    invalidateDomain(uid, 'vehicles');
    return { ...data, _id: id, id };
  },

  async deleteVehicleReminder(id: string, userId?: string) {
    await deleteDoc(doc(db, 'vehicle_reminders', id));
    const uid = userId || getActiveUserId();
    invalidateDomain(uid, 'vehicles');
    return { message: 'Deleted' };
  }
};

// ==========================================
// 11. STUDENT PLANNER
// ==========================================
export const StudentService = {
  async getItems(userId: string, forceRefresh = false) {
    const key = queryCache.makeKey(userId, 'student', 'items');
    return queryCache.fetch(key, async () => {
      const q = query(collection(db, 'student_items'), where('userId', '==', userId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(snapToData);
    }, CACHE_TTL.STUDENT, forceRefresh);
  },

  async addItem(userId: string, data: any) {
    const docRef = await addDoc(collection(db, 'student_items'), {
      ...data,
      userId,
      isCompleted: Boolean(data.isCompleted),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    invalidateDomain(userId, 'student');
    return { ...data, _id: docRef.id, id: docRef.id };
  },

  async updateItem(id: string, data: any, userId?: string) {
    const docRef = doc(db, 'student_items', id);
    await updateDoc(docRef, cleanPayload({ ...data, updatedAt: serverTimestamp() }));
    const uid = userId || getActiveUserId();
    invalidateDomain(uid, 'student');
    return { ...data, _id: id, id };
  },

  async deleteItem(id: string, userId?: string) {
    await deleteDoc(doc(db, 'student_items', id));
    const uid = userId || getActiveUserId();
    invalidateDomain(uid, 'student');
    return { message: 'Deleted' };
  },

  // Courses / Subjects
  async getCourses(userId: string, forceRefresh = false) {
    const key = queryCache.makeKey(userId, 'student', 'courses');
    return queryCache.fetch(key, async () => {
      const q = query(collection(db, 'student_courses'), where('userId', '==', userId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(snapToData);
    }, CACHE_TTL.STUDENT, forceRefresh);
  },

  async addCourse(userId: string, data: any) {
    const docRef = await addDoc(collection(db, 'student_courses'), {
      ...data,
      userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    invalidateDomain(userId, 'student');
    return { ...data, _id: docRef.id, id: docRef.id };
  },

  async updateCourse(id: string, data: any, userId?: string) {
    const docRef = doc(db, 'student_courses', id);
    await updateDoc(docRef, cleanPayload({ ...data, updatedAt: serverTimestamp() }));
    const uid = userId || getActiveUserId();
    invalidateDomain(uid, 'student');
    return { ...data, _id: id, id };
  },

  async deleteCourse(id: string, userId?: string) {
    await deleteDoc(doc(db, 'student_courses', id));
    const uid = userId || getActiveUserId();
    invalidateDomain(uid, 'student');
    return { message: 'Deleted' };
  },

  // Timetable
  async getTimetable(userId: string, forceRefresh = false) {
    const key = queryCache.makeKey(userId, 'student', 'timetable');
    return queryCache.fetch(key, async () => {
      const q = query(collection(db, 'student_timetable'), where('userId', '==', userId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(snapToData);
    }, CACHE_TTL.STUDENT, forceRefresh);
  },

  async addTimetableSlot(userId: string, data: any) {
    const docRef = await addDoc(collection(db, 'student_timetable'), {
      ...data,
      userId,
      createdAt: serverTimestamp()
    });
    invalidateDomain(userId, 'student');
    return { ...data, _id: docRef.id, id: docRef.id };
  },

  async updateTimetableSlot(id: string, data: any, userId?: string) {
    const docRef = doc(db, 'student_timetable', id);
    await updateDoc(docRef, cleanPayload({ ...data, updatedAt: serverTimestamp() }));
    const uid = userId || getActiveUserId();
    invalidateDomain(uid, 'student');
    return { ...data, _id: id, id };
  },

  async deleteTimetableSlot(id: string, userId?: string) {
    await deleteDoc(doc(db, 'student_timetable', id));
    const uid = userId || getActiveUserId();
    invalidateDomain(uid, 'student');
    return { message: 'Deleted' };
  }
};

// ==========================================
// 12. HOME INVENTORY
// ==========================================
export const InventoryService = {
  async getInventory(userId: string, forceRefresh = false) {
    const key = queryCache.makeKey(userId, 'inventory', 'all');
    return queryCache.fetch(key, async () => {
      const q = query(collection(db, 'inventory'), where('userId', '==', userId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(snapToData);
    }, CACHE_TTL.INVENTORY, forceRefresh);
  },

  async addInventory(userId: string, data: any) {
    const docRef = await addDoc(collection(db, 'inventory'), {
      ...data,
      userId,
      price: Number(data.price) || 0,
      estimatedValue: Number(data.estimatedValue || data.price) || 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    invalidateDomain(userId, 'inventory');
    return { ...data, _id: docRef.id, id: docRef.id };
  },

  async updateInventory(id: string, data: any, userId?: string) {
    const docRef = doc(db, 'inventory', id);
    const updateData: any = { ...data, updatedAt: serverTimestamp() };
    if (data.price !== undefined) updateData.price = Number(data.price) || 0;
    if (data.estimatedValue !== undefined) updateData.estimatedValue = Number(data.estimatedValue) || 0;
    await updateDoc(docRef, cleanPayload(updateData));
    const uid = userId || getActiveUserId();
    invalidateDomain(uid, 'inventory');
    return { ...data, _id: id, id };
  },

  async deleteInventory(id: string, userId?: string) {
    await deleteDoc(doc(db, 'inventory', id));
    const uid = userId || getActiveUserId();
    invalidateDomain(uid, 'inventory');
    return { message: 'Deleted' };
  }
};

// ==========================================
// 13. PASSWORD VAULT (Direct Encrypted Reads - No Plaintext Caching)
// ==========================================
export const PasswordService = {
  async getPasswords(userId: string) {
    const q = query(collection(db, 'passwords'), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(snapToData);
  },

  async addPassword(userId: string, data: any) {
    const docRef = await addDoc(collection(db, 'passwords'), {
      ...data,
      userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return { ...data, _id: docRef.id, id: docRef.id };
  },

  async updatePassword(id: string, data: any) {
    const docRef = doc(db, 'passwords', id);
    await updateDoc(docRef, cleanPayload({ ...data, updatedAt: serverTimestamp() }));
    return { ...data, _id: id, id };
  },

  async deletePassword(id: string) {
    await deleteDoc(doc(db, 'passwords', id));
    return { message: 'Deleted' };
  }
};

// ==========================================
// 14. FAMILY DASHBOARD
// ==========================================
export const FamilyService = {
  async getPosts(userId: string, forceRefresh = false) {
    const key = queryCache.makeKey(userId, 'family', 'posts');
    return queryCache.fetch(key, async () => {
      const q = query(collection(db, 'family_posts'), where('userId', '==', userId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(snapToData);
    }, CACHE_TTL.FAMILY, forceRefresh);
  },

  async addPost(userId: string, data: any) {
    const docRef = await addDoc(collection(db, 'family_posts'), {
      ...data,
      userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    invalidateDomain(userId, 'family');
    return { ...data, _id: docRef.id, id: docRef.id };
  },

  async updatePost(id: string, data: any, userId?: string) {
    const docRef = doc(db, 'family_posts', id);
    await updateDoc(docRef, cleanPayload({ ...data, updatedAt: serverTimestamp() }));
    const uid = userId || getActiveUserId();
    invalidateDomain(uid, 'family');
    return { ...data, _id: id, id };
  },

  async deletePost(id: string, userId?: string) {
    await deleteDoc(doc(db, 'family_posts', id));
    const uid = userId || getActiveUserId();
    invalidateDomain(uid, 'family');
    return { message: 'Deleted' };
  },

  async getMembers(userId: string, forceRefresh = false) {
    const key = queryCache.makeKey(userId, 'family', 'members');
    return queryCache.fetch(key, async () => {
      const q = query(collection(db, 'family_members'), where('userId', '==', userId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(snapToData);
    }, CACHE_TTL.FAMILY, forceRefresh);
  },

  async addMember(userId: string, data: any) {
    const colors = ['#00f2fe', '#4facfe', '#667eea', '#764ba2', '#ff0844', '#f6d365', '#fda085', '#4ade80', '#fbbf24'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const docRef = await addDoc(collection(db, 'family_members'), {
      ...data,
      userId,
      avatarColor: data.avatarColor || randomColor,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    invalidateDomain(userId, 'family');
    return { ...data, _id: docRef.id, id: docRef.id };
  },

  async updateMember(id: string, data: any, userId?: string) {
    const docRef = doc(db, 'family_members', id);
    await updateDoc(docRef, cleanPayload({ ...data, updatedAt: serverTimestamp() }));
    const uid = userId || getActiveUserId();
    invalidateDomain(uid, 'family');
    return { ...data, _id: id, id };
  },

  async deleteMember(id: string, userId?: string) {
    await deleteDoc(doc(db, 'family_members', id));
    const uid = userId || getActiveUserId();
    invalidateDomain(uid, 'family');
    return { message: 'Deleted' };
  },

  // Chores
  async getChores(userId: string, forceRefresh = false) {
    const key = queryCache.makeKey(userId, 'family', 'chores');
    return queryCache.fetch(key, async () => {
      const q = query(collection(db, 'family_chores'), where('userId', '==', userId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(snapToData);
    }, CACHE_TTL.FAMILY, forceRefresh);
  },

  async addChore(userId: string, data: any) {
    const docRef = await addDoc(collection(db, 'family_chores'), {
      ...data,
      userId,
      isCompleted: Boolean(data.isCompleted),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    invalidateDomain(userId, 'family');
    return { ...data, _id: docRef.id, id: docRef.id };
  },

  async updateChore(id: string, data: any, userId?: string) {
    const docRef = doc(db, 'family_chores', id);
    await updateDoc(docRef, cleanPayload({ ...data, updatedAt: serverTimestamp() }));
    const uid = userId || getActiveUserId();
    invalidateDomain(uid, 'family');
    return { ...data, _id: id, id };
  },

  async deleteChore(id: string, userId?: string) {
    await deleteDoc(doc(db, 'family_chores', id));
    const uid = userId || getActiveUserId();
    invalidateDomain(uid, 'family');
    return { message: 'Deleted' };
  },

  // Events / Important Dates
  async getFamilyEvents(userId: string, forceRefresh = false) {
    const key = queryCache.makeKey(userId, 'family', 'events');
    return queryCache.fetch(key, async () => {
      const q = query(collection(db, 'family_events'), where('userId', '==', userId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(snapToData);
    }, CACHE_TTL.FAMILY, forceRefresh);
  },

  async addFamilyEvent(userId: string, data: any) {
    const docRef = await addDoc(collection(db, 'family_events'), {
      ...data,
      userId,
      createdAt: serverTimestamp()
    });
    invalidateDomain(userId, 'family');
    return { ...data, _id: docRef.id, id: docRef.id };
  },

  async updateFamilyEvent(id: string, data: any, userId?: string) {
    const docRef = doc(db, 'family_events', id);
    await updateDoc(docRef, cleanPayload({ ...data, updatedAt: serverTimestamp() }));
    const uid = userId || getActiveUserId();
    invalidateDomain(uid, 'family');
    return { ...data, _id: id, id };
  },

  async deleteFamilyEvent(id: string, userId?: string) {
    await deleteDoc(doc(db, 'family_events', id));
    const uid = userId || getActiveUserId();
    invalidateDomain(uid, 'family');
    return { message: 'Deleted' };
  },

  // Shared Expenses
  async getSharedExpenses(userId: string, forceRefresh = false) {
    const key = queryCache.makeKey(userId, 'family', 'expenses');
    return queryCache.fetch(key, async () => {
      const q = query(collection(db, 'family_expenses'), where('userId', '==', userId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(snapToData);
    }, CACHE_TTL.FAMILY, forceRefresh);
  },

  async addSharedExpense(userId: string, data: any) {
    const amount = Number(data.amount) || 0;
    const docRef = await addDoc(collection(db, 'family_expenses'), {
      ...data,
      userId,
      amount,
      date: data.date || new Date().toISOString(),
      createdAt: serverTimestamp()
    });
    invalidateDomain(userId, 'family');
    return { ...data, _id: docRef.id, id: docRef.id };
  },

  async updateSharedExpense(id: string, data: any, userId?: string) {
    const docRef = doc(db, 'family_expenses', id);
    const amount = Number(data.amount) || 0;
    await updateDoc(docRef, cleanPayload({ ...data, amount, updatedAt: serverTimestamp() }));
    const uid = userId || getActiveUserId();
    invalidateDomain(uid, 'family');
    return { ...data, _id: id, id };
  },

  async deleteSharedExpense(id: string, userId?: string) {
    await deleteDoc(doc(db, 'family_expenses', id));
    const uid = userId || getActiveUserId();
    invalidateDomain(uid, 'family');
    return { message: 'Deleted' };
  }
};

// ==========================================
// 15. HEALTH RECORDS
// ==========================================
export const HealthService = {
  async getRecords(userId: string, forceRefresh = false) {
    const key = queryCache.makeKey(userId, 'health', 'records');
    return queryCache.fetch(key, async () => {
      const q = query(collection(db, 'health_records'), where('userId', '==', userId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(snapToData);
    }, CACHE_TTL.HEALTH, forceRefresh);
  },

  async addRecord(userId: string, data: any) {
    const docRef = await addDoc(collection(db, 'health_records'), {
      ...data,
      userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    invalidateDomain(userId, 'health');
    return { ...data, _id: docRef.id, id: docRef.id };
  },

  async updateRecord(id: string, data: any, userId?: string) {
    const docRef = doc(db, 'health_records', id);
    await updateDoc(docRef, cleanPayload({ ...data, updatedAt: serverTimestamp() }));
    const uid = userId || getActiveUserId();
    invalidateDomain(uid, 'health');
    return { ...data, _id: id, id };
  },

  async deleteRecord(id: string, userId?: string) {
    await deleteDoc(doc(db, 'health_records', id));
    const uid = userId || getActiveUserId();
    invalidateDomain(uid, 'health');
    return { message: 'Deleted' };
  },

  // Health Profile
  async getProfile(userId: string, forceRefresh = false) {
    const key = queryCache.makeKey(userId, 'health', 'profile');
    return queryCache.fetch(key, async () => {
      const docRef = doc(db, 'health_profile', userId);
      const snap = await getDoc(docRef);
      if (!snap.exists()) return null;
      return snapToData(snap);
    }, CACHE_TTL.HEALTH, forceRefresh);
  },

  async saveProfile(userId: string, data: any) {
    const docRef = doc(db, 'health_profile', userId);
    await setDoc(docRef, {
      ...data,
      userId,
      updatedAt: serverTimestamp()
    }, { merge: true });
    invalidateDomain(userId, 'health');
    return { ...data, userId };
  },

  // Doctor Consultations & Visits
  async getVisits(userId: string, forceRefresh = false) {
    const key = queryCache.makeKey(userId, 'health', 'visits');
    return queryCache.fetch(key, async () => {
      const q = query(collection(db, 'health_visits'), where('userId', '==', userId));
      const snapshot = await getDocs(q);
      const items = snapshot.docs.map(snapToData);
      return items.sort((a, b) => new Date(b.visitDate || 0).getTime() - new Date(a.visitDate || 0).getTime());
    }, CACHE_TTL.HEALTH, forceRefresh);
  },

  async addVisit(userId: string, data: any) {
    const docRef = await addDoc(collection(db, 'health_visits'), {
      ...data,
      userId,
      cost: Number(data.cost) || 0,
      createdAt: serverTimestamp()
    });
    invalidateDomain(userId, 'health');
    return { ...data, _id: docRef.id, id: docRef.id };
  },

  async updateVisit(id: string, data: any, userId?: string) {
    const docRef = doc(db, 'health_visits', id);
    const updateData = cleanPayload({
      ...data,
      cost: Number(data.cost) || 0,
      updatedAt: serverTimestamp()
    });
    await updateDoc(docRef, updateData);
    const uid = userId || getActiveUserId();
    invalidateDomain(uid, 'health');
    return { ...data, _id: id, id };
  },

  async deleteVisit(id: string, userId?: string) {
    await deleteDoc(doc(db, 'health_visits', id));
    const uid = userId || getActiveUserId();
    invalidateDomain(uid, 'health');
    return { message: 'Deleted' };
  }
};

// ==========================================
// 16. GOAL TRACKER
// ==========================================
export const GoalService = {
  async getGoals(userId: string, forceRefresh = false) {
    const key = queryCache.makeKey(userId, 'goals', 'all');
    return queryCache.fetch(key, async () => {
      const q = query(collection(db, 'goals'), where('userId', '==', userId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(snapToData);
    }, CACHE_TTL.GOALS, forceRefresh);
  },

  async addGoal(userId: string, data: any) {
    const docRef = await addDoc(collection(db, 'goals'), {
      ...data,
      userId,
      currentValue: Number(data.currentValue) || 0,
      targetValue: Number(data.targetValue) || 100,
      progress: Number(data.progress) || 0,
      isCompleted: Boolean(data.isCompleted),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    invalidateDomain(userId, 'goals', ['reports']);
    return { ...data, _id: docRef.id, id: docRef.id };
  },

  async updateGoal(id: string, data: any, userId?: string) {
    const docRef = doc(db, 'goals', id);
    await updateDoc(docRef, cleanPayload({ ...data, updatedAt: serverTimestamp() }));
    const uid = userId || getActiveUserId();
    invalidateDomain(uid, 'goals', ['reports']);
    return { ...data, _id: id, id };
  },

  async deleteGoal(id: string, userId?: string) {
    await deleteDoc(doc(db, 'goals', id));
    const uid = userId || getActiveUserId();
    invalidateDomain(uid, 'goals', ['reports']);
    return { message: 'Deleted' };
  },

  // Milestones
  async getMilestones(goalId: string, userId?: string, forceRefresh = false) {
    const uid = userId || getActiveUserId();
    const key = queryCache.makeKey(uid, 'goals', `milestones_${goalId}`);
    return queryCache.fetch(key, async () => {
      const constraints: any[] = [where('goalId', '==', goalId)];
      if (uid && uid !== 'guest_user') {
        constraints.unshift(where('userId', '==', uid));
      }
      const q = query(collection(db, 'goal_milestones'), ...constraints);
      const snapshot = await getDocs(q);
      return snapshot.docs.map(snapToData);
    }, CACHE_TTL.GOALS, forceRefresh);
  },

  async addMilestone(goalId: string, data: any, userId: string) {
    const docRef = await addDoc(collection(db, 'goal_milestones'), {
      ...data,
      goalId,
      userId,
      isCompleted: false,
      createdAt: serverTimestamp()
    });
    invalidateDomain(userId, 'goals');
    return { ...data, _id: docRef.id, id: docRef.id };
  },

  async toggleMilestone(id: string, isCompleted: boolean, userId?: string) {
    const docRef = doc(db, 'goal_milestones', id);
    await updateDoc(docRef, { isCompleted, updatedAt: serverTimestamp() });
    const uid = userId || getActiveUserId();
    invalidateDomain(uid, 'goals');
    return { id, isCompleted };
  },

  async deleteMilestone(id: string, userId?: string) {
    await deleteDoc(doc(db, 'goal_milestones', id));
    const uid = userId || getActiveUserId();
    invalidateDomain(uid, 'goals');
    return { message: 'Deleted' };
  }
};

// ==========================================
// 17. DASHBOARD AGGREGATION ENGINE
// ==========================================
export const DashboardService = {
  async getOverview(userId: string, forceRefresh = false) {
    const key = queryCache.makeKey(userId, 'dashboard', 'overview');
    return queryCache.fetch(key, async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

      // Fetch collections concurrently (in-flight promise deduplication will share active queries)
      const [transactions, bills, medicines, tasks, cows, crops, vehicles, loans] = await Promise.all([
        FinanceService.getTransactions(userId, forceRefresh),
        BillService.getBills(userId, forceRefresh),
        MedicineService.getMedicines(userId, forceRefresh),
        TaskService.getTasks(userId, forceRefresh),
        DairyService.getCows(userId, forceRefresh),
        AgricultureService.getCrops(userId, forceRefresh),
        VehicleService.getVehicles(userId, forceRefresh),
        LoanService.getLoans(userId, forceRefresh)
      ]);

      // Financial calculations
      const todaysExpense = transactions
        .filter(t => t.type === 'expense' && new Date(t.date) >= today)
        .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

      const monthlyIncome = transactions
        .filter(t => t.type === 'income' && new Date(t.date) >= startOfMonth)
        .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

      const monthlyExpense = transactions
        .filter(t => t.type === 'expense' && new Date(t.date) >= startOfMonth)
        .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

      const totalIncome = transactions
        .filter(t => t.type === 'income')
        .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

      const totalExpense = transactions
        .filter(t => t.type === 'expense')
        .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

      const currentSavings = totalIncome - totalExpense;
      const budgetStatus = monthlyIncome > 0 ? Math.round((monthlyExpense / monthlyIncome) * 100) : 0;

      // Upcoming Bill
      const unpaidBills = bills.filter(b => !b.isPaid);
      const upcomingBill = unpaidBills.length > 0 ? unpaidBills[0] : null;

      // Medicine Reminder
      const pendingMedicine = medicines.find(m => !m.isCompleted);

      // Vehicle Alert (insurance/PUC/service within 30 days)
      let vehicleAlert: { message: string } | null = null;
      const nowTime = today.getTime();
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

      for (const v of vehicles) {
        if (v.insuranceExpiry) {
          const insTime = new Date(v.insuranceExpiry).getTime();
          if (insTime - nowTime <= thirtyDaysMs && insTime - nowTime >= 0) {
            vehicleAlert = { message: `${v.name}: Insurance renewal due on ${new Date(v.insuranceExpiry).toLocaleDateString()}` };
            break;
          } else if (insTime < nowTime) {
            vehicleAlert = { message: `${v.name}: Insurance is OVERDUE!` };
            break;
          }
        }
        if (v.pucExpiry) {
          const pucTime = new Date(v.pucExpiry).getTime();
          if (pucTime - nowTime <= thirtyDaysMs) {
            vehicleAlert = { message: `${v.name}: PUC certificate renewal due` };
            break;
          }
        }
      }

      // Pending Tasks
      const pendingTasksCount = tasks.filter(t => !t.isCompleted).length;

      // Daily Milk Production
      let todaysMilk = 0;
      cows.forEach(cow => {
        (cow.productionLogs || []).forEach((log: any) => {
          if (new Date(log.date) >= today) {
            todaysMilk += Number(log.litersProduced) || 0;
          }
        });
      });

      // Active Crops
      const activeCropsCount = crops.filter(c => c.status === 'Planted' || c.status === 'Growing' || c.status === 'Sown').length;

      // Active Loans
      const totalLoanPrincipal = loans.reduce((acc, curr: any) => acc + (Number(curr.principalAmount) || 0), 0);
      const totalMonthlyEMI = loans.reduce((acc, curr: any) => acc + (Number(curr.monthlyPay) || 0), 0);

      // AI Suggestions
      const aiSuggestions: string[] = [];
      if (monthlyExpense > monthlyIncome && monthlyIncome > 0) {
        aiSuggestions.push("You've exceeded your monthly income in expenses. Review recent spending in Finance.");
      } else if (monthlyIncome > 0 && monthlyExpense > monthlyIncome * 0.8) {
        aiSuggestions.push("You're nearing your monthly income limit. Keep an eye on non-essential expenditures.");
      } else if (monthlyIncome > 0 && monthlyExpense < monthlyIncome * 0.4) {
        aiSuggestions.push("Great job managing expenses this month! You are saving a healthy portion of your income.");
      }

      if (upcomingBill) {
        aiSuggestions.push(`Don't forget to pay your upcoming bill: ${upcomingBill.name} for ₹${upcomingBill.amount}.`);
      }

      if (vehicleAlert) {
        aiSuggestions.push(`Vehicle notice: ${vehicleAlert.message}.`);
      }

      if (pendingTasksCount > 0) {
        aiSuggestions.push(`You have ${pendingTasksCount} pending task${pendingTasksCount > 1 ? 's' : ''} to complete today.`);
      }

      if (activeCropsCount > 0) {
        aiSuggestions.push(`You have ${activeCropsCount} active crop fields. Verify watering and fertilizer schedules.`);
      }

      if (aiSuggestions.length === 0) {
        aiSuggestions.push("All systems optimal! Your finances, tasks, and routines are in sync with Vynora.");
      }

      return {
        isOfflineFallback: false,
        databaseConnected: true,
        finance: {
          todaysExpense,
          monthlyIncome,
          currentSavings,
          budgetStatus
        },
        actionRequired: {
          upcomingBill: upcomingBill ? { title: upcomingBill.name, amount: upcomingBill.amount, dueDate: upcomingBill.dueDate } : null,
          medicine: pendingMedicine ? { name: pendingMedicine.name, dosage: pendingMedicine.dosage, time: pendingMedicine.time } : null,
          vehicleAlert
        },
        domainSnapshots: {
          milkProduction: todaysMilk,
          activeCrops: activeCropsCount,
          pendingTasks: pendingTasksCount,
          recentActivity: transactions.length + tasks.length,
          totalLoanPrincipal,
          totalMonthlyEMI
        },
        aiSuggestions
      };
    }, CACHE_TTL.DASHBOARD, forceRefresh);
  }
};

// ==========================================
// 19. USER PROFILE & ACCOUNT MANAGEMENT
// ==========================================
export const UserService = {
  async getUserProfile(userId: string, forceRefresh = false) {
    const key = queryCache.makeKey(userId, 'user', 'profile');
    return queryCache.fetch(key, async () => {
      const docRef = doc(db, 'user_profiles', userId);
      const snap = await getDoc(docRef);
      if (!snap.exists()) return null;
      return snapToData(snap);
    }, CACHE_TTL.PROFILE, forceRefresh);
  },

  async saveUserProfile(userId: string, data: any) {
    const docRef = doc(db, 'user_profiles', userId);
    const payload = cleanPayload({
      ...data,
      userId,
      updatedAt: serverTimestamp()
    });
    await setDoc(docRef, payload, { merge: true });
    invalidateDomain(userId, 'user');
    return { ...data, userId };
  },

  async exportAllUserData(userId: string) {
    const collectionsToExport = [
      'transactions', 'accounts', 'budgets', 'loans',
      'documents', 'tasks', 'medicines', 'bills',
      'contacts', 'crops', 'farms', 'crop_activities',
      'cows', 'dairy_logs', 'farm_feed', 'dairy_vet_records', 'dairy_breeding',
      'vehicles', 'vehicle_fuel_logs', 'vehicle_service_logs', 'vehicle_repairs',
      'vehicle_expenses', 'vehicle_reminders',
      'student_items', 'student_courses', 'student_timetable',
      'inventory', 'passwords',
      'family_posts', 'family_members', 'family_chores', 'family_events', 'family_expenses',
      'health_records', 'health_visits',
      'goals', 'goal_milestones'
    ];

    const exportData: Record<string, any[]> = {};

    await Promise.all(
      collectionsToExport.map(async (colName) => {
        try {
          const q = query(collection(db, colName), where('userId', '==', userId));
          const snap = await getDocs(q);
          exportData[colName] = snap.docs.map(snapToData);
        } catch {
          exportData[colName] = [];
        }
      })
    );

    try {
      const uSnap = await getDoc(doc(db, 'user_profiles', userId));
      if (uSnap.exists()) exportData['user_profile'] = [snapToData(uSnap)];
      const hSnap = await getDoc(doc(db, 'health_profile', userId));
      if (hSnap.exists()) exportData['health_profile'] = [snapToData(hSnap)];
    } catch {
      // Ignore if not present
    }

    return {
      appName: 'Vynora',
      version: '2.0.0',
      exportedAt: new Date().toISOString(),
      userId,
      data: exportData
    };
  },

  async deleteUserData(userId: string) {
    const collectionsToClean = [
      'transactions', 'accounts', 'budgets', 'loans',
      'documents', 'tasks', 'medicines', 'bills',
      'contacts', 'crops', 'farms', 'crop_activities',
      'cows', 'dairy_logs', 'farm_feed', 'dairy_vet_records', 'dairy_breeding',
      'vehicles', 'vehicle_fuel_logs', 'vehicle_service_logs', 'vehicle_repairs',
      'vehicle_expenses', 'vehicle_reminders',
      'student_items', 'student_courses', 'student_timetable',
      'inventory', 'passwords',
      'family_posts', 'family_members', 'family_chores', 'family_events', 'family_expenses',
      'health_records', 'health_visits',
      'goals', 'goal_milestones'
    ];

    for (const colName of collectionsToClean) {
      try {
        const q = query(collection(db, colName), where('userId', '==', userId));
        const snap = await getDocs(q);
        const batch = writeBatch(db);
        snap.docs.forEach(docSnap => batch.delete(docSnap.ref));
        await batch.commit();
      } catch (err) {
        console.warn(`Could not clean collection ${colName}:`, err);
      }
    }

    try {
      await deleteDoc(doc(db, 'user_profiles', userId));
      await deleteDoc(doc(db, 'health_profile', userId));
    } catch {
      // Ignore if document didn't exist
    }

    queryCache.clearUser(userId);
    return { success: true };
  }
};

// ==========================================
// 21. GLOBAL SEARCH ENGINE PREWARMER
// ==========================================
export const GlobalSearchService = {
  /**
   * Pre-fetches primary user datasets in parallel into queryCache.
   * Enables instantaneous global search across all personal records.
   */
  async prewarmUserDatasets(userId?: string): Promise<void> {
    const uid = userId || getActiveUserId();
    if (!uid || uid === 'guest_user') return;

    try {
      await Promise.allSettled([
        VehicleService.getVehicles(uid),
        FinanceService.getTransactions(uid),
        TaskService.getTasks(uid),
        MedicineService.getMedicines(uid),
        BillService.getBills(uid),
        LoanService.getLoans(uid),
        AgricultureService.getCrops(uid),
        DairyService.getCows(uid),
        ContactService.getContacts(uid),
        DocumentService.getDocuments(uid),
        InventoryService.getInventory(uid),
        StudentService.getItems(uid)
      ]);
    } catch {
      // Background prewarm errors are silent to avoid UI disruption
    }
  }
};

