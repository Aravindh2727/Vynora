/**
 * Crash-Proof Date Utilities for Vynora
 * Safely parses Firestore Timestamps, ISO strings, Date objects, and invalid inputs
 * without ever throwing "RangeError: Invalid time value".
 */

export function formatIsoDate(val: any, fallback = ''): string {
  if (!val) return fallback;

  // Already a valid YYYY-MM-DD string
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
    return val;
  }

  // Firestore Timestamp with toDate()
  if (typeof val?.toDate === 'function') {
    try {
      const d = val.toDate();
      return isNaN(d.getTime()) ? fallback : d.toISOString().split('T')[0];
    } catch {
      return fallback;
    }
  }

  // Firestore Timestamp object { seconds, nanoseconds }
  if (typeof val?.seconds === 'number') {
    try {
      const d = new Date(val.seconds * 1000);
      return isNaN(d.getTime()) ? fallback : d.toISOString().split('T')[0];
    } catch {
      return fallback;
    }
  }

  // Native Date instance
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? fallback : val.toISOString().split('T')[0];
  }

  // String or number timestamp
  try {
    const d = new Date(val);
    return isNaN(d.getTime()) ? fallback : d.toISOString().split('T')[0];
  } catch {
    return fallback;
  }
}

export function getTodayIso(): string {
  return new Date().toISOString().split('T')[0];
}
