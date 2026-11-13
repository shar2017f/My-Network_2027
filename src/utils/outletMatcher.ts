import { Outlet, DeliveryVoucher, PaymentVoucher } from '../types';
import { CANONICAL_DELIVERY_CASH } from '../constants/cardConfig';

/**
 * Normalizes Arabic strings by removing diacritics, unifying alifs, taa marbuta, etc.
 */
export const normalizeArabicName = (name?: string): string => {
  if (!name) return '';
  return name
    .trim()
    .toLowerCase()
    .replace(/[ًٌٍَُِّْـ]/g, '') // Harakat & Tatweel
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/[ىي]/g, 'ي')
    .replace(/\s+/g, ' ');
};

/**
 * Checks if a delivery or payment record belongs to a specific outlet
 * by matching outlet ID or canonical normalized outlet name.
 */
export const doesRecordMatchOutlet = (
  recordOutletId?: string,
  recordOutletName?: string,
  targetOutlet?: Outlet
): boolean => {
  if (!targetOutlet) return false;

  // Direct ID match (highest priority)
  if (recordOutletId && targetOutlet.id && recordOutletId === targetOutlet.id) {
    return true;
  }

  // Name match with Arabic normalization
  if (recordOutletName && targetOutlet.name) {
    const normRecord = normalizeArabicName(recordOutletName);
    const normTarget = normalizeArabicName(targetOutlet.name);

    if (normRecord.length >= 5 && normTarget.length >= 5) {
      if (normRecord === normTarget) return true;
    }

    // Strict matching for established outlets (never cross-match different stores!)
    if (normRecord.includes('ابوشعيب') && normTarget.includes('ابوشعيب')) return true;
    if (normRecord.includes('حندوج') && normTarget.includes('حندوج')) return true;
    if (normRecord.includes('القيري') && normTarget.includes('القيري')) return true;
    if (normRecord.includes('ابو عادل') && normTarget.includes('ابو عادل')) return true;
    if (
      (normRecord.includes('يحيي ناحي') || normRecord.includes('ناحي')) &&
      (normTarget.includes('يحيي ناحي') || normTarget.includes('ناحي'))
    ) {
      return true;
    }
    if (
      (normRecord.includes('ياسر جعبل') || normRecord.includes('جعبل')) &&
      (normTarget.includes('ياسر جعبل') || normTarget.includes('جعبل'))
    ) {
      return true;
    }
    if (normRecord.includes('مسعد الشاجع') && normTarget.includes('مسعد الشاجع')) return true;
    if (normRecord.includes('خالد علي قاسم') && normTarget.includes('خالد علي قاسم')) return true;
    if (normRecord.includes('اكرم محسن') && normTarget.includes('اكرم محسن')) return true;
    if (
      (normRecord === 'منفذ انا' || normRecord === 'انا') &&
      (normTarget === 'منفذ انا' || normTarget === 'انا')
    ) {
      return true;
    }
  }

  return false;
};

/**
 * Computes net balance, current debt, and credit balance (overpayment) consistently.
 */
export const computeOutletBalance = (
  totalDeliveredAmount: number,
  totalPaidAmount: number
): {
  netBalance: number;
  currentDebt: number;
  creditBalance: number;
} => {
  const netBalance = totalDeliveredAmount - totalPaidAmount;
  const currentDebt = Math.max(0, netBalance);
  const creditBalance = netBalance < 0 ? Math.abs(netBalance) : 0;
  return { netBalance, currentDebt, creditBalance };
};

/**
 * Accurately aggregates the financial balance of an outlet directly from
 * its complete list of delivery and payment vouchers.
 */
export const calculateOutletFinancials = (
  outlet: Outlet,
  allDeliveries: DeliveryVoucher[],
  allPayments: PaymentVoucher[]
): {
  deliveriesCount: number;
  paymentsCount: number;
  totalCardsDelivered: number;
  totalSheetsDelivered: number;
  totalDeliveredAmount: number;
  cashAtDelivery: number;
  paymentsReceived: number;
  totalPaidAmount: number;
  netBalance: number;
  currentDebt: number;
  creditBalance: number;
} => {
  const outletDeliveries = allDeliveries.filter((d) =>
    doesRecordMatchOutlet(d.outletId, d.outletName, outlet)
  );
  const outletPayments = allPayments.filter((p) =>
    doesRecordMatchOutlet(p.outletId, p.outletName, outlet)
  );

  let totalDeliveredAmount = 0;
  let cashAtDelivery = 0;
  let totalCardsDelivered = 0;
  let totalSheetsDelivered = 0;

  for (const d of outletDeliveries) {
    totalDeliveredAmount += Number(d.totalAmount) || 0;
    const cash =
      CANONICAL_DELIVERY_CASH[d.id] !== undefined
        ? CANONICAL_DELIVERY_CASH[d.id]
        : Number(d.cashPaidNow) || 0;
    cashAtDelivery += cash;
    totalCardsDelivered += Number(d.cardsCount) || 0;
    totalSheetsDelivered += Number(d.sheetsCount) || 0;
  }

  let paymentsReceived = 0;
  for (const p of outletPayments) {
    paymentsReceived += Number(p.amount) || 0;
  }

  const totalPaidAmount = cashAtDelivery + paymentsReceived;
  const { netBalance, currentDebt, creditBalance } = computeOutletBalance(
    totalDeliveredAmount,
    totalPaidAmount
  );

  return {
    deliveriesCount: outletDeliveries.length,
    paymentsCount: outletPayments.length,
    totalCardsDelivered,
    totalSheetsDelivered: Number(totalSheetsDelivered.toFixed(2)),
    totalDeliveredAmount,
    cashAtDelivery,
    paymentsReceived,
    totalPaidAmount,
    netBalance,
    currentDebt,
    creditBalance,
  };
};
