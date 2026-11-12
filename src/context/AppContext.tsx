import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import {
  UserRole,
  PrintBatch,
  SheetLeaf,
  SheetStatus,
  CustodyTransfer,
  Outlet,
  DeliveryVoucher,
  PaymentVoucher,
  DirectSale,
  CashHandover,
  SettlementRequest,
  DamagedCardRecord,
  AuditLogItem,
  OutletMigrationRecord,
  AppNotification,
  DistributorPermissions,
  CardCategory,
  CategoryStockHealth,
  StockLevelStatus,
  InventoryIntegrityReport,
  CustodyAdjustmentItem,
  ExpenseItem,
  ExpenseCategory,
  ExpensePaymentMethod,
  MonthlyBudget,
  HydrationStatus,
  DataConflictLog,
  HydrationValidationReport,
  OutletDebtAuditItem,
  OutletDebtAuditReport,
} from '../types';
import {
  CARD_CATEGORIES_CONFIG,
  INITIAL_CLEAN_OUTLETS,
  DEFAULT_DISTRIBUTOR_PERMISSIONS,
  DEFAULT_CRITICAL_THRESHOLDS,
  CANONICAL_DELIVERY_CASH,
} from '../constants/cardConfig';
import { soundService } from '../utils/sound';
import { cloudSync, CloudNetworkState } from '../services/firestoreSync';
import { testFirestoreConnection } from '../firebase';
import { ActiveTab } from '../components/Sidebar';
import {
  getCategoryBatchNumber,
  getBatchOrdinalName,
  getArabicMonthName,
  getArabicMonthOnly,
} from '../utils/batchNaming';
import { safeStorage, getPersistentRole, setPersistentRole, clearPersistentRole } from '../utils/safeStorage';
import { requestBackgroundSync, onServiceWorkerSync } from '../services/serviceWorkerRegistration';
import { doesRecordMatchOutlet, calculateOutletFinancials } from '../utils/outletMatcher';

export interface OfflineQueueItem {
  id: string;
  type: string;
  description: string;
  timestamp: string;
}

interface AppContextType {
  // Navigation
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  navigateToTab: (tab: ActiveTab) => void;
  quickInitiatePrintBatch: (category: CardCategory, sheetsCount?: number) => void;

  // Authentication & Session Persistence
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
  logoutSession: () => void;
  adminPin: string;
  setAdminPin: (pin: string) => void;
  verifyAdminPin: (pin: string) => boolean;
  distributorPin: string;
  setDistributorPin: (pin: string) => void;
  verifyDistributorPin: (pin: string) => boolean;
  isDistributorSetupDone: boolean;
  setDistributorSetupDone: (done: boolean) => void;
  showDistributorWelcome: boolean;
  setShowDistributorWelcome: (show: boolean) => void;
  showShareModal: boolean;
  setShowShareModal: (show: boolean) => void;

  // Data Collections
  batches: PrintBatch[];
  sheets: SheetLeaf[];
  transfers: CustodyTransfer[];
  outlets: Outlet[];
  deliveries: DeliveryVoucher[];
  payments: PaymentVoucher[];
  directSales: DirectSale[];
  cashHandovers: CashHandover[];
  settlements: SettlementRequest[];
  damagedCards: DamagedCardRecord[];
  auditLogs: AuditLogItem[];
  expenses: ExpenseItem[];
  notifications: AppNotification[];
  permissions: DistributorPermissions;

  // Cloud Real-Time Sync
  isCloudConnected: boolean;
  hasLoadedInitialCloudState: boolean;
  isHydratingCloud: boolean;
  syncNowToCloud: () => Promise<boolean>;

  // Financial & Inventory KPIs
  distributorCashInHand: number;
  adminTotalCashCollected: number;
  totalOutletsDebt: number;
  totalPrintedCards: number;
  totalAdminCardsInCustody: number;
  totalDistributorCardsInCustody: number;
  totalDeliveredCards: number;
  totalExpensesAmount: number;
  distributorPaidExpensesAmount: number;
  adminPaidExpensesAmount: number;
  netProjectProfit: number;

  // Actions
  addBatch: (data: {
    category: CardCategory;
    date: string;
    accountingMonth: string;
    sheetsCount: number;
    cardsPerSheet?: number;
    wholesaleSheetPrice?: number;
    batchType?: 'sheets' | 'cards';
    cardsCount?: number;
    wholesaleCardPrice?: number;
    notes?: string;
  }) => PrintBatch;
  updateBatch: (
    batchId: string,
    data: {
      category?: CardCategory;
      sheetsCount?: number;
      wholesaleSheetPrice?: number;
      cardsPerSheet?: number;
      date?: string;
      accountingMonth?: string;
      notes?: string;
    }
  ) => { success: boolean; message?: string };
  updateBatchDateMonth: (batchId: string, newDate: string, newMonth: string) => boolean;
  deleteBatch: (batchId: string) => { success: boolean; message?: string };
  createTransfer: (data: {
    category: CardCategory;
    sheetsCount: number;
    cardsCount?: number;
    transferType?: 'sheets' | 'cards';
    leafNumbers?: number[];
    sheetCodes?: string[];
    batchId?: string;
    notes?: string;
  }) => CustodyTransfer;
  updateTransfer: (
    transferId: string,
    data: {
      cardsCount?: number;
      sheetsCount?: number;
      wholesalePrice?: number;
      date?: string;
      notes?: string;
    }
  ) => { success: boolean; message?: string };
  deleteTransfer: (transferId: string) => { success: boolean; message?: string };
  reconcileCustodyDiscrepancies: () => { success: boolean; message: string };
  runInventoryIntegrityCheck: (options?: { autoFix?: boolean }) => InventoryIntegrityReport;
  custodyAdjustments: CustodyAdjustmentItem[];
  applyCustodyAdjustment: (params: {
    category: CardCategory;
    adjustmentType: 'deficit_write_off' | 'surplus_record' | 'inventory_reconciliation' | 'split_sheet_calibrate';
    cardsCount: number;
    reason: string;
    note?: string;
    approvedBy?: string;
  }) => { success: boolean; message: string; voucherId: string; adjustment?: CustodyAdjustmentItem };
  bulkApplyCustodyAdjustments: (options?: { approvedBy?: string }) => { success: boolean; message: string; count: number };
  createDelivery: (data: {
    outletId: string;
    category: CardCategory;
    sheetCodes?: string[];
    sheetsCount?: number;
    unitSheetPrice?: number;
    unitCardPrice?: number;
    cardsCount?: number;
    deliveryUnit?: 'sheets' | 'cards';
    cashPaidNow: number;
    notes?: string;
    date?: string;
    batchId?: string;
    custodySource?: 'distributor_custody' | 'admin_custody';
  }) => DeliveryVoucher;
  updateDelivery: (
    deliveryId: string,
    data: {
      cardsCount?: number;
      sheetsCount?: number;
      unitSheetPrice?: number;
      unitCardPrice?: number;
      cashPaidNow?: number;
      notes?: string;
      date?: string;
    }
  ) => { success: boolean; message?: string };
  deleteDelivery: (deliveryId: string) => { success: boolean; message?: string };
  createPayment: (data: {
    outletId: string;
    amount: number;
    paymentMethod: 'cash' | 'transfer';
    notes?: string;
    date?: string;
  }) => PaymentVoucher;
  updatePayment: (
    paymentId: string,
    data: {
      amount?: number;
      paymentMethod?: 'cash' | 'transfer';
      notes?: string;
      date?: string;
    }
  ) => { success: boolean; message?: string };
  deletePayment: (paymentId: string) => { success: boolean; message?: string };
  createDirectSale: (data: {
    customerName: string;
    customerPhone?: string;
    category: CardCategory;
    cardsCount: number;
    unitCardPrice: number;
    isCredit: boolean;
    notes?: string;
  }) => DirectSale;
  updateDirectSale: (
    saleId: string,
    data: {
      customerName?: string;
      customerPhone?: string;
      cardsCount?: number;
      unitCardPrice?: number;
      isCredit?: boolean;
      notes?: string;
      date?: string;
    }
  ) => { success: boolean; message?: string };
  deleteDirectSale: (saleId: string) => { success: boolean; message?: string };
  createCashHandover: (amount: number, notes?: string) => CashHandover;
  updateCashHandover: (
    handoverId: string,
    data: {
      amount?: number;
      notes?: string;
      date?: string;
    }
  ) => { success: boolean; message?: string };
  deleteCashHandover: (handoverId: string) => { success: boolean; message?: string };
  resolveCashHandover: (id: string, status: 'accepted' | 'rejected') => void;
  createSettlement: (data: {
    title: string;
    type: 'cards' | 'cash' | 'commission' | 'general';
    amount?: number;
    sheetsCount?: number;
    description: string;
  }) => SettlementRequest;
  resolveSettlement: (id: string, status: 'approved' | 'rejected', reviewNotes?: string) => void;
  recordDamage: (data: {
    category: CardCategory;
    sheetCode?: string;
    cardsCount: number;
    reason: string;
  }) => DamagedCardRecord;
  addOutlet: (outlet: Omit<Outlet, 'id' | 'currentDebt' | 'totalDeliveredAmount' | 'totalPaidAmount' | 'createdAt'>) => Outlet;
  updateOutlet: (id: string, updates: Partial<Outlet>) => void;
  deleteOutlet: (id: string) => boolean;
  checkOutletNameExists: (name: string, excludeId?: string) => Outlet | null;
  mergeDuplicateOutletsByName: () => { success: boolean; mergedCount: number; message: string };
  createExpense: (data: {
    title: string;
    category: ExpenseCategory;
    amount: number;
    paymentMethod: ExpensePaymentMethod;
    paidBy: string;
    beneficiary?: string;
    invoiceNumber?: string;
    notes?: string;
    isCapitalAsset?: boolean;
    date?: string;
    status?: 'paid' | 'pending' | 'credit';
  }) => ExpenseItem;
  updateExpense: (id: string, updates: Partial<ExpenseItem>) => { success: boolean; message?: string };
  deleteExpense: (id: string) => { success: boolean; message?: string };
  monthlyBudgets: Record<string, MonthlyBudget>;
  setMonthlyBudget: (month: string, amount: number, notes?: string) => { success: boolean; message?: string };
  deleteMonthlyBudget: (month: string) => { success: boolean; message?: string };
  getMonthlyBudget: (month: string) => MonthlyBudget | undefined;
  migrationRecords: OutletMigrationRecord[];
  bulkMigrateOutletRecords: (params: {
    sourceOutletIdentifier: string;
    targetOutletId: string;
    includeDeliveries?: boolean;
    includePayments?: boolean;
    includeSheets?: boolean;
    reason?: string;
  }) => {
    success: boolean;
    migratedDeliveries: number;
    migratedPayments: number;
    migratedSheets: number;
    debtTransferred: number;
    message: string;
  };
  autoFixLegacyOutletRecords: () => {
    success: boolean;
    migratedDeliveries: number;
    migratedPayments: number;
    migratedSheets: number;
    debtTransferred: number;
    message: string;
  };
  updatePermissions: (newPerms: Partial<DistributorPermissions>) => void;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  addNotification: (notification: Omit<AppNotification, 'id' | 'timestamp' | 'isRead'>) => void;
  resetAllDataToZero: () => void;
  exportJSONBackup: () => string;
  importJSONBackup: (jsonString: string) => boolean;

  // Critical Stock & Print Decisions
  criticalThresholds: Record<CardCategory, number>;
  setCriticalThreshold: (category: CardCategory, sheetsCount: number) => void;
  stockHealthList: CategoryStockHealth[];
  criticalCategoriesCount: number;
  triggerStockAlertManually: (category: CardCategory) => void;
  targetPrintCategory: CardCategory | null;
  setTargetPrintCategory: (category: CardCategory | null) => void;

  // Offline & Service Worker Sync
  isOnline: boolean;
  offlineQueue: OfflineQueueItem[];
  syncOfflineQueue: () => Promise<boolean>;

  // Unsynced Deliveries & Protection Alerts
  unsyncedDeliveries: DeliveryVoucher[];
  overdueUnsyncedDeliveries: DeliveryVoucher[];
  unsyncedDeliveryAlertMinutes: number;
  setUnsyncedDeliveryAlertMinutes: (minutes: number) => void;
  isUnsyncedAlertDismissed: boolean;
  dismissUnsyncedAlert: () => void;

  // Hydration Validation & Data Conflict Protection
  hydrationStatus: HydrationStatus;
  isHydrated: boolean;
  hydrationValidation: HydrationValidationReport;
  conflictLogs: DataConflictLog[];
  dismissConflictAlert: (id?: string) => void;
  retryHydration: () => Promise<boolean>;

  // Outlet Debt Audit & Dynamic Reconciliation
  auditAndReconcileOutletDebts: (options?: { autoFix?: boolean }) => OutletDebtAuditReport;
  lastDebtAuditReport: OutletDebtAuditReport | null;
}

const STORAGE_PREFIX = 'QAZAN_NET_V2_';

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Navigation
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');

  const navigateToTab = (tab: ActiveTab) => {
    setActiveTab(tab);
  };

  const quickInitiatePrintBatch = (category: CardCategory, sheetsCount?: number) => {
    if (currentRole !== 'admin') {
      soundService.playAlert();
      return;
    }
    setTargetPrintCategory(category);
    setActiveTab('batches');
  };

  // Helper to safely load and parse JSON from localStorage without throwing
  const loadStored = <T,>(keySuffix: string, fallback: T): T => {
    try {
      const saved = safeStorage.getItem(STORAGE_PREFIX + keySuffix);
      if (!saved || saved === 'undefined' || saved === 'null') return fallback;
      return JSON.parse(saved);
    } catch {
      return fallback;
    }
  };

  // Safe normalizer for outlets to prevent any undefined or null field exceptions
  const normalizeOutlet = (o: any, idx = 0): Outlet => {
    return {
      id: o?.id || `OUT-00${idx + 1}`,
      name: o?.name || `منفذ ${idx + 1}`,
      ownerName: o?.ownerName || o?.name || 'المالك',
      phone: o?.phone || '770000000',
      location: o?.location || 'الشارع العام',
      creditLimit: typeof o?.creditLimit === 'number' && !isNaN(o.creditLimit) ? o.creditLimit : 100000,
      currentDebt: typeof o?.currentDebt === 'number' && !isNaN(o.currentDebt) ? o.currentDebt : 0,
      totalDeliveredAmount: typeof o?.totalDeliveredAmount === 'number' && !isNaN(o.totalDeliveredAmount) ? o.totalDeliveredAmount : 0,
      totalPaidAmount: typeof o?.totalPaidAmount === 'number' && !isNaN(o.totalPaidAmount) ? o.totalPaidAmount : 0,
      createdAt: o?.createdAt || '2026-10-01',
      notes: o?.notes || '',
    };
  };

  const sanitizeOutletsList = (list: any[]): Outlet[] => {
    if (!Array.isArray(list) || list.length === 0) {
      return INITIAL_CLEAN_OUTLETS;
    }
    const map = new Map<string, Outlet>();
    for (const item of INITIAL_CLEAN_OUTLETS) {
      map.set(item.id, { ...item });
    }
    for (let idx = 0; idx < list.length; idx++) {
      const normalized = normalizeOutlet(list[idx], idx);
      const existing = map.get(normalized.id);
      if (existing) {
        map.set(normalized.id, {
          ...existing,
          ...normalized,
          name: normalized.name || existing.name,
          ownerName: normalized.ownerName || existing.ownerName,
          phone: normalized.phone || existing.phone,
          location: normalized.location || existing.location,
          creditLimit: typeof normalized.creditLimit === 'number' && normalized.creditLimit > 0 ? normalized.creditLimit : existing.creditLimit,
          currentDebt: typeof normalized.currentDebt === 'number' ? normalized.currentDebt : existing.currentDebt,
          totalDeliveredAmount: typeof normalized.totalDeliveredAmount === 'number' && normalized.totalDeliveredAmount > 0 ? normalized.totalDeliveredAmount : existing.totalDeliveredAmount,
          totalPaidAmount: typeof normalized.totalPaidAmount === 'number' && normalized.totalPaidAmount > 0 ? normalized.totalPaidAmount : existing.totalPaidAmount,
        });
      } else {
        map.set(normalized.id, normalized);
      }
    }
    return Array.from(map.values());
  };

  const sanitizeSheetsList = (list: SheetLeaf[]): SheetLeaf[] => {
    if (!Array.isArray(list)) return [];
    const seenCodes = new Set<string>();
    const filtered = list.filter((s) => {
      if (!s || !s.sheetCode) return false;
      if (s.sheetCode === 'QZ-3000-TR7-C30') return false; // discard deleted transfer leftover
      if (s.sheetCode === 'QZ-1000-B11-C300' || s.sheetCode.includes('B11-C300') || s.sheetCode.includes('C300')) return false; // replaced by calibrated 5 sheets
      if (s.sheetCode === 'QZ-1000-B6-S004-P30-DEL-2026-0028') return false; // discard phantom 1000 delivery for DEL-28 (belongs to 3000)
      if (seenCodes.has(s.sheetCode)) return false;
      seenCodes.add(s.sheetCode);
      return true;
    }).map((s) => {
      if (s.sheetCode === 'QZ-500-B2-S002' || s.sheetCode === 'QZ-500-B2-S003') {
        const copy = { ...s, status: 'admin_custody' as const, currentHolder: 'admin' as const };
        delete (copy as any).deliveryId;
        return copy;
      }
      return s;
    });

    // Ensure B11 calibrated sheets exist (Ashraf has sheets 1, 2, 3 and admin has sheets 4, 5)
    const hasS1 = filtered.some((s) => s.sheetCode === 'QZ-1000-B11-S001');
    if (!hasS1) {
      const b11Sheets: SheetLeaf[] = [
        {
          sheetCode: 'QZ-1000-B11-S001',
          leafNumber: 1,
          batchNumber: 11,
          categoryBatchNumber: 1,
          monthBatchNumber: 1,
          category: '1000',
          batchId: 'BATCH-2026-011',
          cardsCount: 60,
          status: 'distributor_custody',
          currentHolder: 'distributor',
          transferId: 'TR-2026-0010',
          accountingMonth: '2026-11',
          timestamp: '2026-11-02T19:09:58.382Z',
        },
        {
          sheetCode: 'QZ-1000-B11-S002',
          leafNumber: 2,
          batchNumber: 11,
          categoryBatchNumber: 1,
          monthBatchNumber: 1,
          category: '1000',
          batchId: 'BATCH-2026-011',
          cardsCount: 60,
          status: 'distributor_custody',
          currentHolder: 'distributor',
          transferId: 'TR-2026-0010',
          accountingMonth: '2026-11',
          timestamp: '2026-11-02T19:09:58.382Z',
        },
        {
          sheetCode: 'QZ-1000-B11-S003',
          leafNumber: 3,
          batchNumber: 11,
          categoryBatchNumber: 1,
          monthBatchNumber: 1,
          category: '1000',
          batchId: 'BATCH-2026-011',
          cardsCount: 60,
          status: 'distributor_custody',
          currentHolder: 'distributor',
          transferId: 'TR-2026-0010',
          accountingMonth: '2026-11',
          timestamp: '2026-11-02T19:09:58.382Z',
        },
        {
          sheetCode: 'QZ-1000-B11-S004',
          leafNumber: 4,
          batchNumber: 11,
          categoryBatchNumber: 1,
          monthBatchNumber: 1,
          category: '1000',
          batchId: 'BATCH-2026-011',
          cardsCount: 60,
          status: 'admin_custody',
          currentHolder: 'admin',
          accountingMonth: '2026-11',
          timestamp: '2026-11-02T19:09:58.382Z',
        },
        {
          sheetCode: 'QZ-1000-B11-S005',
          leafNumber: 5,
          batchNumber: 11,
          categoryBatchNumber: 1,
          monthBatchNumber: 1,
          category: '1000',
          batchId: 'BATCH-2026-011',
          cardsCount: 60,
          status: 'admin_custody',
          currentHolder: 'admin',
          accountingMonth: '2026-11',
          timestamp: '2026-11-02T19:09:58.382Z',
        },
      ];
      return [...filtered, ...b11Sheets];
    }

    return filtered;
  };

  const sanitizeBatchesList = (list: PrintBatch[]): PrintBatch[] => {
    if (!Array.isArray(list)) return [];
    const seenIds = new Set<string>();
    return list.filter((b) => {
      if (!b || !b.id) return false;
      if (seenIds.has(b.id)) return false;
      seenIds.add(b.id);
      return true;
    }).map((b) => {
      if (b.id === 'BATCH-2026-011' && (b.batchType === 'cards' || b.cardsPerSheet === 300)) {
        return {
          ...b,
          sheetsCount: 5,
          cardsPerSheet: 60,
          totalCards: 300,
          batchType: 'sheets',
          wholesaleSheetPrice: b.wholesaleSheetPrice || 50000,
          wholesaleCardPrice: 840,
          totalWholesaleValue: 252000,
        };
      }
      return b;
    });
  };

  const sanitizeTransfersList = (list: CustodyTransfer[]): CustodyTransfer[] => {
    if (!Array.isArray(list)) return [];
    const seenIds = new Set<string>();
    const mapped = list.filter((t) => {
      if (!t || !t.id) return false;
      if (t.id === 'TR-2026-0007') return false; // explicitly deleted transfer in audit log
      if (seenIds.has(t.id)) return false;
      seenIds.add(t.id);
      return true;
    }).map((t) => {
      if (t.id === 'TR-2026-0010' && (t.sheetsCount === 1 || t.sheetCodes?.includes('QZ-1000-B11-C300') || !t.sheetCodes?.includes('QZ-1000-B11-S001'))) {
        return {
          ...t,
          sheetsCount: 3,
          totalCards: 180,
          totalWholesaleValue: 151200,
          transferType: 'sheets' as const,
          leafNumbers: [1, 2, 3],
          sheetCodes: ['QZ-1000-B11-S001', 'QZ-1000-B11-S002', 'QZ-1000-B11-S003'],
          notes: 'مع اشرف ٣ ورق ابو الف رقم ١و٢و٣ من أول دفعه نوفمبر معي انا ٤ و٥ ',
        };
      }
      return t;
    });

    // Ensure TR-2026-0006 exists (BATCH-2026-008: 14 sheets = 840 cards)
    if (!mapped.some((t) => t.id === 'TR-2026-0006')) {
      mapped.push({
        id: 'TR-2026-0006',
        transferNumber: 6,
        batchId: 'BATCH-2026-008',
        category: '500',
        sheetsCount: 14,
        totalCards: 840,
        totalWholesaleValue: 352800,
        date: '2026-10-22',
        accountingMonth: '2026-10',
        recipientName: 'الموزع الميداني',
        fromUser: 'المسؤول',
        toUser: 'الموزع الميداني',
        status: 'received',
        receivedAt: '2026-10-22T10:30:00.000Z',
        createdAt: '2026-10-22T10:30:00.000Z',
        transferType: 'sheets',
        leafNumbers: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
        sheetCodes: [
          'QZ-500-B8-S002',
          'QZ-500-B8-S003',
          'QZ-500-B8-S004',
          'QZ-500-B8-S005',
          'QZ-500-B8-S006',
          'QZ-500-B8-S007',
          'QZ-500-B8-S008',
          'QZ-500-B8-S009',
          'QZ-500-B8-S010',
          'QZ-500-B8-S011',
          'QZ-500-B8-S012',
          'QZ-500-B8-S013',
          'QZ-500-B8-S014',
          'QZ-500-B8-S015',
        ],
        notes: 'تحويل 14 شيت (840 كرت) من دفعة أكتوبر فئة 500 للموزع، وتبقي شيت واحد برقم 1 بمخزن المسؤول',
      });
    }

    // Ensure TR-2026-0011 exists (BATCH-2026-009: 3 sheets = 180 cards)
    if (!mapped.some((t) => t.id === 'TR-2026-0011')) {
      mapped.push({
        id: 'TR-2026-0011',
        transferNumber: 11,
        batchId: 'BATCH-2026-009',
        category: '1000',
        sheetsCount: 3,
        totalCards: 180,
        totalWholesaleValue: 151200,
        date: '2026-10-22',
        accountingMonth: '2026-10',
        recipientName: 'الموزع الميداني',
        fromUser: 'المسؤول',
        toUser: 'الموزع الميداني',
        status: 'received',
        receivedAt: '2026-10-22T10:35:00.000Z',
        createdAt: '2026-10-22T10:35:00.000Z',
        transferType: 'sheets',
        leafNumbers: [1, 2, 3],
        sheetCodes: ['QZ-1000-B9-S001', 'QZ-1000-B9-S002', 'QZ-1000-B9-S003'],
        notes: 'تحويل 3 شيتات (180 كرت) من دفعة أكتوبر فئة 1000 للموزع، وتبقي شيت واحد برقم 4 بمخزن المسؤول',
      });
    }

    return mapped;
  };

  // Load initial state or defaults safely with persistent session lock
  const [currentRole, setCurrentRole] = useState<UserRole>(() => {
    try {
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        const roleParam = urlParams.get('role');
        if (roleParam === 'distributor') {
          setPersistentRole('distributor');
          return 'distributor';
        }
        if (roleParam === 'admin') {
          setPersistentRole('admin');
          return 'admin';
        }
      }
      const saved = getPersistentRole();
      if (saved) return saved;
      return (safeStorage.getItem(STORAGE_PREFIX + 'role') as UserRole) || 'admin';
    } catch {
      return 'admin';
    }
  });

  const logoutSession = () => {
    clearPersistentRole();
    if (typeof window !== 'undefined' && window.history && window.history.replaceState) {
      try {
        const url = new URL(window.location.href);
        url.searchParams.delete('role');
        url.searchParams.delete('invite');
        url.searchParams.delete('welcome');
        url.searchParams.delete('token');
        window.history.replaceState({}, document.title, url.pathname);
      } catch {}
    }
    setCurrentRole('admin');
    setActiveTab('dashboard');
    soundService.playAlert();
  };

  const [adminPin, setAdminPinState] = useState<string>(() => {
    try {
      return safeStorage.getItem(STORAGE_PREFIX + 'admin_pin') || '1234';
    } catch {
      return '1234';
    }
  });

  const [distributorPin, setDistributorPinState] = useState<string>(() => {
    try {
      return safeStorage.getItem(STORAGE_PREFIX + 'distributor_pin') || '0000';
    } catch {
      return '0000';
    }
  });

  const [isDistributorSetupDone, setIsDistributorSetupDoneState] = useState<boolean>(() => {
    try {
      return safeStorage.getItem(STORAGE_PREFIX + 'distributor_setup_done') === 'true';
    } catch {
      return false;
    }
  });

  const [showDistributorWelcome, setShowDistributorWelcome] = useState<boolean>(() => {
    try {
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        const roleParam = urlParams.get('role');
        const inviteParam = urlParams.get('invite');
        const welcomeParam = urlParams.get('welcome');
        const tokenParam = urlParams.get('token');
        if (inviteParam === 'true' || welcomeParam === 'true' || tokenParam) {
          return true;
        }
        if (roleParam === 'distributor') {
          const isDone = safeStorage.getItem(STORAGE_PREFIX + 'distributor_setup_done') === 'true';
          return !isDone;
        }
      }
      return false;
    } catch {
      return false;
    }
  });

  const [showShareModal, setShowShareModal] = useState<boolean>(false);

  const [batches, setBatches] = useState<PrintBatch[]>(() => {
    const loaded = sanitizeBatchesList(loadStored('batches', []));
    try {
      safeStorage.setItem(STORAGE_PREFIX + 'batches', JSON.stringify(loaded));
    } catch {}
    return loaded;
  });
  const [sheets, setSheets] = useState<SheetLeaf[]>(() => {
    const loaded = sanitizeSheetsList(loadStored('sheets', []));
    try {
      safeStorage.setItem(STORAGE_PREFIX + 'sheets', JSON.stringify(loaded));
    } catch {}
    return loaded;
  });
  const [transfers, setTransfers] = useState<CustodyTransfer[]>(() => {
    const loaded = sanitizeTransfersList(loadStored('transfers', []));
    try {
      safeStorage.setItem(STORAGE_PREFIX + 'transfers', JSON.stringify(loaded));
    } catch {}
    return loaded;
  });
  const [outlets, setOutlets] = useState<Outlet[]>(() => {
    const loaded = loadStored('outlets', INITIAL_CLEAN_OUTLETS);
    return sanitizeOutletsList(loaded);
  });
  const [deliveries, setDeliveries] = useState<DeliveryVoucher[]>(() => {
    const raw = loadStored('deliveries', []);
    if (!Array.isArray(raw)) return [];
    return raw.map((d: any) => {
      if (d.outletId === 'OUT-002' || d.outletName === 'بقالة البركة') {
        return { ...d, outletName: 'منفذ أنا' };
      }
      return d;
    });
  });
  const [payments, setPayments] = useState<PaymentVoucher[]>(() => loadStored('payments', []));
  const [directSales, setDirectSales] = useState<DirectSale[]>(() => loadStored('directSales', []));
  const [cashHandovers, setCashHandovers] = useState<CashHandover[]>(() => loadStored('cashHandovers', []));
  const [settlements, setSettlements] = useState<SettlementRequest[]>(() => loadStored('settlements', []));
  const [damagedCards, setDamagedCards] = useState<DamagedCardRecord[]>(() => loadStored('damagedCards', []));
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>(() => loadStored('auditLogs', [
    {
      id: 'LOG-001',
      actionType: 'SYSTEM_RESET',
      actorName: 'المسؤول',
      actorRole: 'admin',
      details: 'تمت تهيئة وتصفير نظام قعزان نت بنجاح والبدء برصيد صفر لجميع السجلات والمنافذ',
      timestamp: new Date().toISOString(),
    },
  ]));
  const [migrationRecords, setMigrationRecords] = useState<OutletMigrationRecord[]>(() =>
    loadStored('migration_records', [
      {
        id: 'MIG-2026-001',
        timestamp: '2026-10-25T08:00:00.000Z',
        sourceOutletName: 'بقالة البركة (المنفذ الافتراضي السابق)',
        targetOutletId: 'OUT-002',
        targetOutletName: 'منفذ أنا',
        deliveriesCount: 2,
        paymentsCount: 0,
        sheetsCount: 2,
        totalCards: 120,
        totalDeliveredAmount: 50000,
        totalPaidAmount: 0,
        debtTransferred: 50000,
        reason: 'تصحيح أخطاء السجلات القديمة وترحيلها من الاسم الافتراضي السابق (البركة) إلى المنفذ الفعلي المعتمد (منفذ أنا)',
        performedBy: 'المسؤول',
        details: 'ترحيل سندات التوريد DEL-2026-0002 والشيتات QZ-200-B1-S001 و QZ-200-B1-S004',
      },
    ])
  );
  const [custodyAdjustments, setCustodyAdjustments] = useState<CustodyAdjustmentItem[]>(() =>
    loadStored('custody_adjustments', [
      {
        id: 'ADJ-2026-0001',
        date: '2026-10-10',
        category: '3000',
        adjustmentType: 'split_sheet_calibrate',
        cardsCount: 60,
        sheetsCount: 1,
        financialImpact: 150000,
        reason: 'معايرة تجزئة شيت فئة 3000 (دفعة أكتوبر): 30 كرت لمنفذ أنا، 20 كرت مع الموزع، 10 كروت مع المسؤول بإجمالي شيت واحد',
        approvedBy: 'المسؤول',
        status: 'approved',
        beforeDistributorCards: 60,
        afterDistributorCards: 20,
        createdAt: '2026-10-10T12:00:00.000Z',
      },
    ])
  );
  const custodyAdjustmentsRef = React.useRef(custodyAdjustments);
  custodyAdjustmentsRef.current = custodyAdjustments;

  const [expenses, setExpenses] = useState<ExpenseItem[]>(() =>
    loadStored('expenses', [
      {
        id: 'EXP-2026-0001',
        date: '2026-10-15',
        title: 'شراء ورق مقوى وأحبار طباعة الكروت والتغليف الحراري',
        category: 'printing_cards',
        amount: 35000,
        paymentMethod: 'admin_cash',
        paidBy: 'المسؤول',
        beneficiary: 'مطبعة النور الحديثة',
        invoiceNumber: 'INV-4412',
        notes: 'مستلزمات طباعة دفعات الكروت لفئات 200 و 500 و 1000',
        isCapitalAsset: false,
        status: 'paid',
        createdAt: '2026-10-15T10:00:00.000Z',
      },
      {
        id: 'EXP-2026-0002',
        date: '2026-10-20',
        title: 'شراء بترول دراجة نارية ومواصلات توزيع الكروت للمنافذ',
        category: 'transport_distribution',
        amount: 8000,
        paymentMethod: 'distributor_cash',
        paidBy: 'الموزع الميداني',
        beneficiary: 'محطة الصمود للمحروقات',
        invoiceNumber: 'GAS-890',
        notes: 'تم خصمها من النقدية المحصلة بيد الموزع بموجب سند رسمي',
        isCapitalAsset: false,
        status: 'paid',
        createdAt: '2026-10-20T14:30:00.000Z',
      },
      {
        id: 'EXP-2026-0003',
        date: '2026-10-25',
        title: 'اشتراك باقة الفايبر والإنترنت الرئيسي للشبكة (شهر أكتوبر)',
        category: 'internet_bandwidth',
        amount: 85000,
        paymentMethod: 'bank_wallet',
        paidBy: 'المسؤول',
        beneficiary: 'المؤسسة العامة للاتصالات (يمن نت)',
        invoiceNumber: 'TEL-2026-10',
        notes: 'سداد عبر محفظة الكريمي إم فلوس - سعة الباقة 100 ميجا',
        isCapitalAsset: false,
        status: 'paid',
        createdAt: '2026-10-25T11:00:00.000Z',
      },
    ])
  );
  const expensesRef = React.useRef(expenses);
  expensesRef.current = expenses;

  const [monthlyBudgets, setMonthlyBudgets] = useState<Record<string, MonthlyBudget>>(() =>
    loadStored('monthly_budgets', {
      '2026-10': {
        month: '2026-10',
        budgetAmount: 150000,
        notes: 'ميزانية تشغيلية وتوزيع كروت شهر أكتوبر',
        updatedAt: '2026-10-01T08:00:00.000Z',
        updatedBy: 'المسؤول',
      },
      '2026-11': {
        month: '2026-11',
        budgetAmount: 180000,
        notes: 'ميزانية شهر نوفمبر تشمل طباعة كروت وصيانة دورية وبترول',
        updatedAt: '2026-11-01T08:00:00.000Z',
        updatedBy: 'المسؤول',
      },
    })
  );
  const monthlyBudgetsRef = React.useRef(monthlyBudgets);
  monthlyBudgetsRef.current = monthlyBudgets;
  const [notifications, setNotifications] = useState<AppNotification[]>(() => loadStored('notifications', [
    {
      id: 'NOTIF-INIT',
      title: 'مرحباً بك في قعزان نت',
      message: 'النظام جاهز ببيانات مصفّرة بالكامل من الصفر ومخصص لشخصين: المسؤول والموزع الميداني.',
      type: 'info',
      timestamp: new Date().toISOString(),
      isRead: false,
      targetRole: 'all',
    },
  ]));
  const [permissions, setPermissions] = useState<DistributorPermissions>(() => loadStored('permissions', DEFAULT_DISTRIBUTOR_PERMISSIONS));
  const [criticalThresholds, setCriticalThresholdsState] = useState<Record<CardCategory, number>>(() => loadStored('critical_thresholds', DEFAULT_CRITICAL_THRESHOLDS));
  const [targetPrintCategory, setTargetPrintCategory] = useState<CardCategory | null>(null);

  const [isCloudConnected, setIsCloudConnected] = useState(true);
  const isLocalUpdateRef = React.useRef(false);
  const isRemoteSyncRef = React.useRef(false);
  const lastStateFingerprintRef = React.useRef<string>('');

  // Keep live references to prevent stale closures during async cloud sync
  const batchesRef = React.useRef(batches);
  batchesRef.current = batches;
  const sheetsRef = React.useRef(sheets);
  sheetsRef.current = sheets;
  const transfersRef = React.useRef(transfers);
  transfersRef.current = transfers;
  const outletsRef = React.useRef(outlets);
  outletsRef.current = outlets;
  const deliveriesRef = React.useRef(deliveries);
  deliveriesRef.current = deliveries;
  const paymentsRef = React.useRef(payments);
  paymentsRef.current = payments;
  const directSalesRef = React.useRef(directSales);
  directSalesRef.current = directSales;
  const cashHandoversRef = React.useRef(cashHandovers);
  cashHandoversRef.current = cashHandovers;
  const settlementsRef = React.useRef(settlements);
  settlementsRef.current = settlements;
  const damagedCardsRef = React.useRef(damagedCards);
  damagedCardsRef.current = damagedCards;
  const auditLogsRef = React.useRef(auditLogs);
  auditLogsRef.current = auditLogs;

  // Track Data Conflict Logs & Zero-Wipe Shield
  const [conflictLogs, setConflictLogs] = useState<DataConflictLog[]>(() => {
    return loadStored<DataConflictLog[]>('conflict_logs', []);
  });
  const conflictLogsRef = React.useRef(conflictLogs);
  conflictLogsRef.current = conflictLogs;

  // Track whether cloud state has been fetched at least once
  const [hasLoadedInitialCloudState, setHasLoadedInitialCloudState] = useState<boolean>(() => {
    try {
      const cached = safeStorage.getItem(STORAGE_PREFIX + 'batches');
      return !!(cached && JSON.parse(cached)?.length > 0);
    } catch {
      return false;
    }
  });
  const hasLoadedInitialCloudStateRef = React.useRef(hasLoadedInitialCloudState);
  hasLoadedInitialCloudStateRef.current = hasLoadedInitialCloudState;

  const [hydrationStatus, setHydrationStatus] = useState<HydrationStatus>(() => {
    try {
      const cached = safeStorage.getItem(STORAGE_PREFIX + 'batches');
      const parsed = cached ? JSON.parse(cached) : [];
      return Array.isArray(parsed) && parsed.length > 0 ? 'ready' : 'validating';
    } catch {
      return 'validating';
    }
  });
  const hydrationStatusRef = React.useRef<HydrationStatus>(hydrationStatus);
  hydrationStatusRef.current = hydrationStatus;

  const isHydrated = hydrationStatus === 'ready';

  const [isHydratingCloud, setIsHydratingCloud] = useState<boolean>(!hasLoadedInitialCloudState);

  const [hydrationValidation, setHydrationValidation] = useState<HydrationValidationReport>(() => {
    try {
      const cachedBatches = safeStorage.getItem(STORAGE_PREFIX + 'batches');
      const bList = cachedBatches ? JSON.parse(cachedBatches) : [];
      const hasData = Array.isArray(bList) && bList.length > 0;
      return {
        isValid: hasData,
        status: hasData ? 'ready' : 'validating',
        batchesCount: Array.isArray(bList) ? bList.length : 0,
        sheetsCount: 0,
        transfersCount: 0,
        outletsCount: 0,
        deliveriesCount: 0,
        paymentsCount: 0,
        errors: [],
        warnings: [],
        lastValidatedAt: hasData ? new Date().toISOString() : null,
      };
    } catch {
      return {
        isValid: false,
        status: 'validating',
        batchesCount: 0,
        sheetsCount: 0,
        transfersCount: 0,
        outletsCount: 0,
        deliveriesCount: 0,
        paymentsCount: 0,
        errors: [],
        warnings: [],
        lastValidatedAt: null,
      };
    }
  });

  const [lastDebtAuditReport, setLastDebtAuditReport] = useState<OutletDebtAuditReport | null>(null);

  const recordConflict = (params: Omit<DataConflictLog, 'id' | 'timestamp'>) => {
    const newLog: DataConflictLog = {
      ...params,
      id: `CFL-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
    };
    console.error('[QAZAN DATA CONFLICT DETECTED]', newLog);
    setConflictLogs((prev) => {
      const updated = [newLog, ...prev.slice(0, 49)];
      try {
        safeStorage.setItem(STORAGE_PREFIX + 'conflict_logs', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    addAudit(
      'DATA_CONFLICT',
      `[درع الحماية المحاسبية] ${newLog.message} (الإجراء المتخذ: ${
        newLog.resolvedAction === 'PRESERVED_LOCAL' ? 'تثبيت السجلات المعتمدة ومنع التصفير' : 'دمج آمن'
      })`
    );

    soundService.playUnsyncedWarning();
  };

  const dismissConflictAlert = (id?: string) => {
    if (id) {
      setConflictLogs((prev) => {
        const updated = prev.filter((c) => c.id !== id);
        try {
          safeStorage.setItem(STORAGE_PREFIX + 'conflict_logs', JSON.stringify(updated));
        } catch {}
        return updated;
      });
    } else {
      setConflictLogs([]);
      try {
        safeStorage.removeItem(STORAGE_PREFIX + 'conflict_logs');
      } catch {}
    }
  };

  // Helper to ensure interfaces are blocked from modifications while unhydrated
  const checkHydrationReady = (actionTitle: string): boolean => {
    if (!hasLoadedInitialCloudStateRef.current || hydrationStatusRef.current !== 'ready') {
      console.warn(`[VALIDATION LAYER] Action "${actionTitle}" blocked: hydration is not ready (${hydrationStatusRef.current}).`);
      addAudit('HYDRATION_BLOCKED', `تم منع محاولة إجراء (${actionTitle}) أثناء مرحلة التحقق من السجلات لمنع تصفير الحسابات.`);
      return false;
    }
    return true;
  };

  // Helper to push state to Cloud
  const pushStateToCloud = async (override?: Partial<CloudNetworkState>) => {
    // CRITICAL ZERO-WIPE PROTECTION: Never push to cloud before initial cloud state has hydrated and validated!
    if (!hasLoadedInitialCloudStateRef.current || hydrationStatusRef.current !== 'ready') {
      console.warn('[CloudSync] pushStateToCloud blocked: initial cloud state has not hydrated or is still validating (status: ' + hydrationStatusRef.current + ').');
      return false;
    }

    isLocalUpdateRef.current = true;
    if (override?.batches) batchesRef.current = sanitizeBatchesList(override.batches);
    if (override?.sheets) sheetsRef.current = sanitizeSheetsList(override.sheets);
    if (override?.transfers) transfersRef.current = sanitizeTransfersList(override.transfers);
    if (override?.outlets) outletsRef.current = override.outlets;
    if (override?.deliveries) deliveriesRef.current = override.deliveries;
    if (override?.payments) paymentsRef.current = override.payments;
    if (override?.directSales) directSalesRef.current = override.directSales;
    if (override?.cashHandovers) cashHandoversRef.current = override.cashHandovers;
    if (override?.settlements) settlementsRef.current = override.settlements;
    if (override?.damagedCards) damagedCardsRef.current = override.damagedCards;
    if (override?.auditLogs) auditLogsRef.current = override.auditLogs;
    if (override?.expenses) expensesRef.current = override.expenses;

    // Ensure local sheetsRef and transfersRef are always sanitized
    sheetsRef.current = sanitizeSheetsList(sheetsRef.current);
    transfersRef.current = sanitizeTransfersList(transfersRef.current);
    batchesRef.current = sanitizeBatchesList(batchesRef.current);

    // Immediately update fingerprint so incoming self-echoes don't cause thrashing
    lastStateFingerprintRef.current = `${batchesRef.current.length}_${sheetsRef.current.length}_${transfersRef.current.length}_${outletsRef.current.length}_${deliveriesRef.current.length}_${paymentsRef.current.length}_${directSalesRef.current.length}_${cashHandoversRef.current.length}_${settlementsRef.current.length}_${damagedCardsRef.current.length}_${auditLogsRef.current.length}_${expensesRef.current.length}_${adminPin}`;

    try {
      const payload: Omit<CloudNetworkState, 'updatedAt'> = {
        batches: sanitizeBatchesList(override?.batches ?? batchesRef.current),
        sheets: sanitizeSheetsList(override?.sheets ?? sheetsRef.current),
        transfers: sanitizeTransfersList(override?.transfers ?? transfersRef.current),
        outlets: override?.outlets ?? outletsRef.current,
        deliveries: override?.deliveries ?? deliveriesRef.current,
        payments: override?.payments ?? paymentsRef.current,
        directSales: override?.directSales ?? directSalesRef.current,
        cashHandovers: override?.cashHandovers ?? cashHandoversRef.current,
        settlements: override?.settlements ?? settlementsRef.current,
        damagedCards: override?.damagedCards ?? damagedCardsRef.current,
        auditLogs: override?.auditLogs ?? auditLogsRef.current,
        expenses: override?.expenses ?? expensesRef.current,
        permissions: override?.permissions ?? permissions,
        adminPin: override?.adminPin ?? adminPin,
        distributorPin: override?.distributorPin ?? distributorPin,
        criticalThresholds: override?.criticalThresholds ?? criticalThresholds,
      };
      const ok = await cloudSync.syncToCloud(payload, currentRole === 'admin' ? 'المسؤول' : 'الموزع الميداني');
      setIsCloudConnected(ok);
      return ok;
    } catch (e) {
      console.error('Sync to cloud error:', e);
      return false;
    } finally {
      setTimeout(() => {
        isLocalUpdateRef.current = false;
      }, 500);
    }
  };

  // Offline & Service Worker Sync State
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && typeof navigator !== 'undefined') {
      return navigator.onLine;
    }
    return true;
  });

  const [offlineQueue, setOfflineQueue] = useState<OfflineQueueItem[]>(() => {
    return loadStored<OfflineQueueItem[]>('offline_queue', []);
  });

  const addOfflineQueueItem = (type: string, description: string) => {
    const newItem: OfflineQueueItem = {
      id: `OFFLINE-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type,
      description,
      timestamp: new Date().toISOString(),
    };
    setOfflineQueue((prev) => {
      const updated = [newItem, ...prev];
      try {
        safeStorage.setItem(STORAGE_PREFIX + 'offline_queue', JSON.stringify(updated));
      } catch {}
      return updated;
    });
    // Request background sync if supported
    requestBackgroundSync();
  };

  const markDeliveriesAsSynced = () => {
    setDeliveries((prev) => {
      const allSynced = prev.map((d) => ({ ...d, syncedToCloud: true }));
      deliveriesRef.current = allSynced;
      try {
        safeStorage.setItem(STORAGE_PREFIX + 'deliveries', JSON.stringify(allSynced));
      } catch {}
      return allSynced;
    });
    setPayments((prev) => {
      const allSynced = prev.map((p) => ({ ...p, syncedToCloud: true }));
      paymentsRef.current = allSynced;
      try {
        safeStorage.setItem(STORAGE_PREFIX + 'payments', JSON.stringify(allSynced));
      } catch {}
      return allSynced;
    });
    setIsUnsyncedAlertDismissed(false);
  };

  const syncOfflineQueue = async (): Promise<boolean> => {
    try {
      const ok = await pushStateToCloud();
      if (ok) {
        setOfflineQueue([]);
        try {
          safeStorage.removeItem(STORAGE_PREFIX + 'offline_queue');
        } catch {}
        markDeliveriesAsSynced();
        addAudit('CLOUD_SYNC', 'تمت مزامنة جميع العمليات المنفذة أوفلاين مع السحابة بنجاح');
        soundService.playSuccess();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const syncNowToCloud = async () => {
    const ok = await pushStateToCloud();
    if (ok) {
      markDeliveriesAsSynced();
      soundService.playSuccess();
    }
    return ok;
  };

  // Alert threshold in minutes for unsynced deliveries (default: 2 minutes)
  const [unsyncedDeliveryAlertMinutes, setUnsyncedDeliveryAlertMinutesState] = useState<number>(() => {
    try {
      const saved = safeStorage.getItem(STORAGE_PREFIX + 'unsynced_threshold');
      return saved ? Number(saved) : 2;
    } catch {
      return 2;
    }
  });

  const setUnsyncedDeliveryAlertMinutes = (mins: number) => {
    setUnsyncedDeliveryAlertMinutesState(mins);
    try {
      safeStorage.setItem(STORAGE_PREFIX + 'unsynced_threshold', String(mins));
    } catch {}
  };

  const [isUnsyncedAlertDismissed, setIsUnsyncedAlertDismissed] = useState(false);
  const dismissUnsyncedAlert = () => setIsUnsyncedAlertDismissed(true);
  const lastAlertSoundTimeRef = React.useRef<number>(0);

  // Deliveries that have not yet reached the cloud
  const unsyncedDeliveries = useMemo(() => {
    return deliveries.filter((d) => d.syncedToCloud === false);
  }, [deliveries]);

  // Deliveries that are unsynced and older than the user-configured alert threshold
  const overdueUnsyncedDeliveries = useMemo(() => {
    const now = Date.now();
    const thresholdMs = unsyncedDeliveryAlertMinutes * 60 * 1000;
    return deliveries.filter((d) => {
      if (d.syncedToCloud !== false) return false;
      const createdTime = new Date(d.createdAt || d.date).getTime();
      return now - createdTime >= thresholdMs;
    });
  }, [deliveries, unsyncedDeliveryAlertMinutes]);

  // Periodic visual & audio alert for overdue unsynced deliveries
  useEffect(() => {
    if (overdueUnsyncedDeliveries.length === 0) {
      setIsUnsyncedAlertDismissed(false);
      return;
    }

    const checkAndSoundAlert = () => {
      const now = Date.now();
      // Throttle audio alert to once every 45 seconds so it reminds without annoying
      if (now - lastAlertSoundTimeRef.current >= 45000) {
        lastAlertSoundTimeRef.current = now;
        soundService.playUnsyncedWarning();
      }
    };

    checkAndSoundAlert();
    const interval = setInterval(checkAndSoundAlert, 15000);
    return () => clearInterval(interval);
  }, [overdueUnsyncedDeliveries.length]);

  // Listen to browser network events and Service Worker sync triggers
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setIsCloudConnected(true);
      syncOfflineQueue();
    };

    const handleOffline = () => {
      setIsOnline(false);
      setIsCloudConnected(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const unsubSW = onServiceWorkerSync(() => {
      syncOfflineQueue();
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubSW();
    };
  }, []);

  // ==========================================
  // HYDRATION VALIDATION LAYER & CONFLICT DETECTION
  // ==========================================
  const validateIncomingRemoteState = (
    remoteState: CloudNetworkState,
    source: 'snapshot' | 'direct_fetch'
  ): { isValid: boolean; conflictDetected: boolean; errors: string[]; warnings: string[] } => {
    const errors: string[] = [];
    const warnings: string[] = [];
    let conflictDetected = false;

    if (!remoteState || typeof remoteState !== 'object') {
      errors.push('الحالة السحابية الواردة غير صالحة أو فارغة.');
      return { isValid: false, conflictDetected: true, errors, warnings };
    }

    const localBatchesCount = batchesRef.current?.length || 0;
    const remoteBatchesCount = remoteState.batches?.length || 0;
    const localSheetsCount = sheetsRef.current?.length || 0;
    const remoteSheetsCount = remoteState.sheets?.length || 0;

    // Critical Conflict Case 1: Local has populated batches, but remote state arrives completely empty
    if (localBatchesCount > 0 && remoteBatchesCount === 0) {
      conflictDetected = true;
      errors.push(`محاولة تصفير غير مصرح بها: السحابة أرسلت 0 حزم بينما يمتلك النظام محلياً ${localBatchesCount} حزم.`);
      recordConflict({
        type: 'EMPTY_OVERWRITE_ATTEMPT',
        severity: 'critical',
        message: `تم منع تفريغ أو تصفير السجلات: السحابة أرسلت 0 حزم بينما يمتلك النظام ${localBatchesCount} حزم. تم تثبيت وحماية السجلات المعتمدة فوراً.`,
        source: 'cloud_sync',
        localSnapshot: {
          batches: localBatchesCount,
          sheets: localSheetsCount,
          transfers: transfersRef.current?.length || 0,
          outlets: outletsRef.current?.length || 0,
          deliveries: deliveriesRef.current?.length || 0,
          payments: paymentsRef.current?.length || 0,
        },
        incomingSnapshot: {
          batches: remoteBatchesCount,
          sheets: remoteSheetsCount,
          transfers: remoteState.transfers?.length || 0,
          outlets: remoteState.outlets?.length || 0,
          deliveries: remoteState.deliveries?.length || 0,
          payments: remoteState.payments?.length || 0,
        },
        resolvedAction: 'PRESERVED_LOCAL',
      });
      return { isValid: false, conflictDetected: true, errors, warnings };
    }

    // Critical Conflict Case 2: Sudden drastic count regression (e.g. going from 11 batches to 2 or 3)
    if (localBatchesCount >= 5 && remoteBatchesCount > 0 && remoteBatchesCount < Math.floor(localBatchesCount / 2)) {
      conflictDetected = true;
      warnings.push(`انخفاض مفاجئ في عدد الحزم السحابية (${remoteBatchesCount} مقابل ${localBatchesCount} محلياً).`);
      recordConflict({
        type: 'COUNT_REGRESSION',
        severity: 'warning',
        message: `تم رصد نقص مفاجئ في الحزم السحابية (${remoteBatchesCount} مقابل ${localBatchesCount}). تم تفعيل الدمج التراكمي الشامل لمنع فقدان العمليات.`,
        source: 'cloud_sync',
        localSnapshot: {
          batches: localBatchesCount,
          sheets: localSheetsCount,
          transfers: transfersRef.current?.length || 0,
          outlets: outletsRef.current?.length || 0,
          deliveries: deliveriesRef.current?.length || 0,
          payments: paymentsRef.current?.length || 0,
        },
        incomingSnapshot: {
          batches: remoteBatchesCount,
          sheets: remoteSheetsCount,
          transfers: remoteState.transfers?.length || 0,
          outlets: remoteState.outlets?.length || 0,
          deliveries: remoteState.deliveries?.length || 0,
          payments: remoteState.payments?.length || 0,
        },
        resolvedAction: 'FORCE_MERGED',
      });
    }

    // Verify arrays format
    if (remoteState.batches && !Array.isArray(remoteState.batches)) errors.push('تنسيق حزم الطباعة غير صالح (ليس مصفوفة)');
    if (remoteState.sheets && !Array.isArray(remoteState.sheets)) errors.push('تنسيق شيتات الكروت غير صالح (ليس مصفوفة)');
    if (remoteState.transfers && !Array.isArray(remoteState.transfers)) errors.push('تنسيق سندات التحويل غير صالح (ليس مصفوفة)');
    if (remoteState.outlets && !Array.isArray(remoteState.outlets)) errors.push('تنسيق بيانات المنافذ غير صالح (ليس مصفوفة)');

    return {
      isValid: errors.length === 0,
      conflictDetected,
      errors,
      warnings,
    };
  };

  const processAndApplyRemoteState = (
    remoteState: CloudNetworkState,
    source: 'snapshot' | 'direct_fetch'
  ): boolean => {
    if (!remoteState) return false;

    // 1. Validation Layer Check
    const validation = validateIncomingRemoteState(remoteState, source);

    if (!validation.isValid && validation.conflictDetected) {
      console.warn('[Validation Layer] Blocked remote state overwrite to protect accounts.');
      setHydrationStatus('ready');
      hydrationStatusRef.current = 'ready';
      setHasLoadedInitialCloudState(true);
      hasLoadedInitialCloudStateRef.current = true;
      setIsHydratingCloud(false);
      // Auto-heal cloud using verified local state
      setTimeout(() => {
        pushStateToCloud();
      }, 300);
      return false;
    }

    let shouldPushLocalToCloud = false;

    // 1. Batches: smart union by ID
    const remoteBatches = sanitizeBatchesList(remoteState.batches || []);
    const localBatches = sanitizeBatchesList(batchesRef.current || []);
    const mergedBatchesMap = new Map<string, PrintBatch>();
    for (const b of remoteBatches) {
      if (b && b.id) mergedBatchesMap.set(b.id, b);
    }
    for (const b of localBatches) {
      if (b && b.id && !mergedBatchesMap.has(b.id)) {
        mergedBatchesMap.set(b.id, b);
        shouldPushLocalToCloud = true;
      }
    }
    const mergedBatches = sanitizeBatchesList(Array.from(mergedBatchesMap.values()));
    batchesRef.current = mergedBatches;
    setBatches(mergedBatches);
    try {
      safeStorage.setItem(STORAGE_PREFIX + 'batches', JSON.stringify(mergedBatches));
    } catch {}

    // 2. Sheets: status progression priority (damaged > delivered_outlet > distributor_custody > admin_custody)
    const remoteSheets = sanitizeSheetsList(remoteState.sheets || []);
    const localSheets = sanitizeSheetsList(sheetsRef.current || []);
    const mergedSheetsMap = new Map<string, SheetLeaf>();
    const sheetStatusRank: Record<string, number> = {
      damaged: 5,
      delivered_outlet: 4,
      distributor_custody: 3,
      admin_custody: 2,
      with_distributor: 3,
      with_admin: 2,
      in_print: 1,
    };
    for (const s of remoteSheets) {
      if (s && s.sheetCode) {
        const bNum = s.batchNumber || parseInt(s.sheetCode?.match(/B(\d+)/)?.[1] || '1', 10);
        const leafNum = s.leafNumber || parseInt(s.sheetCode?.match(/S(\d+)/)?.[1] || '1', 10);
        const bInfo = mergedBatches.find((b) => b.id === s.batchId);
        const catBNum = s.categoryBatchNumber || (bInfo ? getCategoryBatchNumber(bInfo, mergedBatches) : bNum);
        mergedSheetsMap.set(s.sheetCode, { ...s, batchNumber: bNum, leafNumber: leafNum, categoryBatchNumber: catBNum });
      }
    }
    for (const localSheet of localSheets) {
      if (localSheet && localSheet.sheetCode) {
        const bInfo = mergedBatches.find((b) => b.id === localSheet.batchId);
        const bNum = localSheet.batchNumber || parseInt(localSheet.sheetCode?.match(/B(\d+)/)?.[1] || '1', 10);
        const leafNum = localSheet.leafNumber || parseInt(localSheet.sheetCode?.match(/S(\d+)/)?.[1] || '1', 10);
        const catBNum = localSheet.categoryBatchNumber || (bInfo ? getCategoryBatchNumber(bInfo, mergedBatches) : bNum);
        const normalizedLocal = { ...localSheet, batchNumber: bNum, leafNumber: leafNum, categoryBatchNumber: catBNum };
        const remoteSheet = mergedSheetsMap.get(localSheet.sheetCode);
        if (!remoteSheet) {
          if (!bInfo || (typeof bInfo.sheetsCount === 'number' && leafNum <= bInfo.sheetsCount)) {
            mergedSheetsMap.set(localSheet.sheetCode, normalizedLocal);
            shouldPushLocalToCloud = true;
          }
        } else {
          const localR = sheetStatusRank[localSheet.status] || 0;
          const remoteR = sheetStatusRank[remoteSheet.status] || 0;
          if (localR > remoteR || (localSheet.deliveryId && !remoteSheet.deliveryId)) {
            mergedSheetsMap.set(localSheet.sheetCode, normalizedLocal);
            shouldPushLocalToCloud = true;
          }
        }
      }
    }
    const mergedSheets = sanitizeSheetsList(Array.from(mergedSheetsMap.values()));
    sheetsRef.current = mergedSheets;
    setSheets(mergedSheets);
    try {
      safeStorage.setItem(STORAGE_PREFIX + 'sheets', JSON.stringify(mergedSheets));
    } catch {}

    // 3. Transfers (سندات التحويل TR): union by ID - never delete existing valid transfers!
    const remoteTransfers = sanitizeTransfersList(remoteState.transfers || []);
    const localTransfers = sanitizeTransfersList(transfersRef.current || []);
    const mergedTransMap = new Map<string, CustodyTransfer>();
    for (const t of remoteTransfers) {
      if (t && t.id) mergedTransMap.set(t.id, t);
    }
    for (const t of localTransfers) {
      if (t && t.id && !mergedTransMap.has(t.id)) {
        mergedTransMap.set(t.id, t);
        shouldPushLocalToCloud = true;
      }
    }
    const mergedTransfers = sanitizeTransfersList(Array.from(mergedTransMap.values()));
    transfersRef.current = mergedTransfers;
    setTransfers(mergedTransfers);
    try {
      safeStorage.setItem(STORAGE_PREFIX + 'transfers', JSON.stringify(mergedTransfers));
    } catch {}

    // 4. Deliveries (سندات التوريد DEL): smart union by ID and canonical cash/debt protection
    const remoteDeliveries = remoteState.deliveries || [];
    const localDeliveries = deliveriesRef.current || [];
    const mergedDelsMap = new Map<string, DeliveryVoucher>();
    for (const d of remoteDeliveries) {
      if (d && d.id) {
        const canonicalCash = CANONICAL_DELIVERY_CASH[d.id];
        const cashPaidNow = canonicalCash !== undefined ? canonicalCash : (Number(d.cashPaidNow) || 0);
        const totalAmount = Number(d.totalAmount) || 0;
        const remainingDebt = Math.max(0, totalAmount - cashPaidNow);
        let paymentStatus = d.paymentStatus;
        if (cashPaidNow >= totalAmount && totalAmount > 0) paymentStatus = 'paid_full';
        else if (cashPaidNow > 0) paymentStatus = 'paid_partial';
        else paymentStatus = 'credit';

        mergedDelsMap.set(d.id, {
          ...d,
          totalAmount,
          cashPaidNow,
          remainingDebt,
          paymentStatus,
          syncedToCloud: true,
        });
      }
    }
    for (const d of localDeliveries) {
      if (d && d.id) {
        const canonicalCash = CANONICAL_DELIVERY_CASH[d.id];
        const cashPaidNow = canonicalCash !== undefined ? canonicalCash : (Number(d.cashPaidNow) || 0);
        const totalAmount = Number(d.totalAmount) || 0;
        const remainingDebt = Math.max(0, totalAmount - cashPaidNow);
        let paymentStatus = d.paymentStatus;
        if (cashPaidNow >= totalAmount && totalAmount > 0) paymentStatus = 'paid_full';
        else if (cashPaidNow > 0) paymentStatus = 'paid_partial';
        else paymentStatus = 'credit';

        if (!mergedDelsMap.has(d.id)) {
          mergedDelsMap.set(d.id, {
            ...d,
            totalAmount,
            cashPaidNow,
            remainingDebt,
            paymentStatus,
            syncedToCloud: false,
          });
          shouldPushLocalToCloud = true;
        }
      }
    }
    const mergedDeliveries = Array.from(mergedDelsMap.values()).sort(
      (a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime()
    );
    deliveriesRef.current = mergedDeliveries;
    setDeliveries(mergedDeliveries);
    try {
      safeStorage.setItem(STORAGE_PREFIX + 'deliveries', JSON.stringify(mergedDeliveries));
    } catch {}

    // 5. Payments (سندات القبض والاستلام): smart union by ID
    const remotePayments = remoteState.payments || [];
    const localPayments = paymentsRef.current || [];
    const mergedPaysMap = new Map<string, PaymentVoucher>();
    for (const p of remotePayments) {
      if (p && p.id) mergedPaysMap.set(p.id, { ...p, syncedToCloud: true });
    }
    for (const p of localPayments) {
      if (p && p.id) {
        if (!mergedPaysMap.has(p.id)) {
          mergedPaysMap.set(p.id, { ...p, syncedToCloud: false });
          shouldPushLocalToCloud = true;
        }
      }
    }
    const mergedPayments = Array.from(mergedPaysMap.values()).sort(
      (a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime()
    );
    paymentsRef.current = mergedPayments;
    setPayments(mergedPayments);
    try {
      safeStorage.setItem(STORAGE_PREFIX + 'payments', JSON.stringify(mergedPayments));
    } catch {}

    // 6. Outlets: Dynamic Cumulative Reconciliation directly from all vouchers
    const remoteOutlets = sanitizeOutletsList(remoteState.outlets || []);
    const localOutlets = sanitizeOutletsList(outletsRef.current || []);
    const mergedOutletsMap = new Map<string, Outlet>();

    // Seed with canonical network outlets catalog so standard outlets exist
    for (const baseO of INITIAL_CLEAN_OUTLETS) {
      mergedOutletsMap.set(baseO.id, { ...baseO });
    }
    for (const ro of remoteOutlets) {
      if (ro && ro.id) {
        const existing = mergedOutletsMap.get(ro.id);
        mergedOutletsMap.set(ro.id, existing ? { ...existing, ...ro } : ro);
      }
    }
    for (const lo of localOutlets) {
      if (lo && lo.id && !mergedOutletsMap.has(lo.id)) {
        mergedOutletsMap.set(lo.id, lo);
      }
    }

    // Accurately aggregate cumulative balance for each outlet dynamically from all vouchers
    const reconciledOutlets: Outlet[] = [];
    for (const rawOutlet of mergedOutletsMap.values()) {
      const fin = calculateOutletFinancials(rawOutlet, mergedDeliveries, mergedPayments);

      const previousDebt = Number(rawOutlet.currentDebt) || 0;
      const previousDelivered = Number(rawOutlet.totalDeliveredAmount) || 0;
      const previousPaid = Number(rawOutlet.totalPaidAmount) || 0;

      if (
        previousDebt !== fin.currentDebt ||
        previousDelivered !== fin.totalDeliveredAmount ||
        previousPaid !== fin.totalPaidAmount
      ) {
        shouldPushLocalToCloud = true;
      }

      reconciledOutlets.push({
        ...rawOutlet,
        totalDeliveredAmount: fin.totalDeliveredAmount,
        totalPaidAmount: fin.totalPaidAmount,
        currentDebt: fin.currentDebt,
      });
    }

    const mergedOutlets = sanitizeOutletsList(reconciledOutlets);
    outletsRef.current = mergedOutlets;
    setOutlets(mergedOutlets);
    try {
      safeStorage.setItem(STORAGE_PREFIX + 'outlets', JSON.stringify(mergedOutlets));
    } catch {}

    // 7. Direct Sales: union by ID
    const remoteDirectSales = remoteState.directSales || [];
    const localDirectSales = directSalesRef.current || [];
    const mergedSalesMap = new Map<string, DirectSale>();
    for (const s of remoteDirectSales) {
      if (s && s.id) mergedSalesMap.set(s.id, s);
    }
    for (const s of localDirectSales) {
      if (s && s.id && !mergedSalesMap.has(s.id)) {
        mergedSalesMap.set(s.id, s);
        shouldPushLocalToCloud = true;
      }
    }
    const mergedDirectSales = Array.from(mergedSalesMap.values()).sort(
      (a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime()
    );
    directSalesRef.current = mergedDirectSales;
    setDirectSales(mergedDirectSales);
    try {
      safeStorage.setItem(STORAGE_PREFIX + 'directSales', JSON.stringify(mergedDirectSales));
    } catch {}

    // 8. Cash Handovers: union by ID
    const remoteHandovers = remoteState.cashHandovers || [];
    const localHandovers = cashHandoversRef.current || [];
    const mergedHandoversMap = new Map<string, CashHandover>();
    for (const h of remoteHandovers) {
      if (h && h.id) mergedHandoversMap.set(h.id, h);
    }
    for (const h of localHandovers) {
      if (h && h.id && !mergedHandoversMap.has(h.id)) {
        mergedHandoversMap.set(h.id, h);
        shouldPushLocalToCloud = true;
      }
    }
    const mergedCashHandovers = Array.from(mergedHandoversMap.values()).sort(
      (a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime()
    );
    cashHandoversRef.current = mergedCashHandovers;
    setCashHandovers(mergedCashHandovers);
    try {
      safeStorage.setItem(STORAGE_PREFIX + 'cashHandovers', JSON.stringify(mergedCashHandovers));
    } catch {}

    // 9. Settlements: union by ID
    const remoteSettlements = remoteState.settlements || [];
    const localSettlements = settlementsRef.current || [];
    const mergedSetsMap = new Map<string, SettlementRequest>();
    for (const s of remoteSettlements) {
      if (s && s.id) mergedSetsMap.set(s.id, s);
    }
    for (const s of localSettlements) {
      if (s && s.id && !mergedSetsMap.has(s.id)) {
        mergedSetsMap.set(s.id, s);
        shouldPushLocalToCloud = true;
      }
    }
    const mergedSettlements = Array.from(mergedSetsMap.values()).sort(
      (a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime()
    );
    settlementsRef.current = mergedSettlements;
    setSettlements(mergedSettlements);
    try {
      safeStorage.setItem(STORAGE_PREFIX + 'settlements', JSON.stringify(mergedSettlements));
    } catch {}

    // 10. Damaged Cards: union by ID
    const remoteDamaged = remoteState.damagedCards || [];
    const localDamaged = damagedCardsRef.current || [];
    const mergedDamagedMap = new Map<string, DamagedCardRecord>();
    for (const d of remoteDamaged) {
      if (d && d.id) mergedDamagedMap.set(d.id, d);
    }
    for (const d of localDamaged) {
      if (d && d.id && !mergedDamagedMap.has(d.id)) {
        mergedDamagedMap.set(d.id, d);
        shouldPushLocalToCloud = true;
      }
    }
    const mergedDamagedCards = Array.from(mergedDamagedMap.values()).sort(
      (a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime()
    );
    damagedCardsRef.current = mergedDamagedCards;
    setDamagedCards(mergedDamagedCards);
    try {
      safeStorage.setItem(STORAGE_PREFIX + 'damagedCards', JSON.stringify(mergedDamagedCards));
    } catch {}

    // 11. Audit Logs: union by ID
    const remoteLogs = remoteState.auditLogs || [];
    const localLogs = auditLogsRef.current || [];
    const mergedLogsMap = new Map<string, AuditLogItem>();
    for (const l of remoteLogs) {
      if (l && l.id) mergedLogsMap.set(l.id, l);
    }
    for (const l of localLogs) {
      if (l && l.id && !mergedLogsMap.has(l.id)) {
        mergedLogsMap.set(l.id, l);
        shouldPushLocalToCloud = true;
      }
    }
    const mergedAuditLogs = Array.from(mergedLogsMap.values()).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    auditLogsRef.current = mergedAuditLogs;
    setAuditLogs(mergedAuditLogs);
    try {
      safeStorage.setItem(STORAGE_PREFIX + 'auditLogs', JSON.stringify(mergedAuditLogs));
    } catch {}

    if (remoteState.expenses) {
      const remoteExpenses = remoteState.expenses || [];
      const localExpenses = expensesRef.current || [];
      const mergedExpensesMap = new Map<string, ExpenseItem>();
      for (const e of remoteExpenses) {
        if (e && e.id) mergedExpensesMap.set(e.id, e);
      }
      for (const localE of localExpenses) {
        if (localE && localE.id && !mergedExpensesMap.has(localE.id)) {
          mergedExpensesMap.set(localE.id, localE);
          shouldPushLocalToCloud = true;
        }
      }
      const mergedExpenses = Array.from(mergedExpensesMap.values()).sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      expensesRef.current = mergedExpenses;
      setExpenses(mergedExpenses);
      try {
        safeStorage.setItem(STORAGE_PREFIX + 'expenses', JSON.stringify(mergedExpenses));
      } catch {}
    }

    if (remoteState.permissions) {
      setPermissions(remoteState.permissions);
      try {
        safeStorage.setItem(STORAGE_PREFIX + 'permissions', JSON.stringify(remoteState.permissions));
      } catch {}
    }

    if (remoteState.adminPin) {
      setAdminPinState(remoteState.adminPin);
      try {
        safeStorage.setItem(STORAGE_PREFIX + 'admin_pin', remoteState.adminPin);
      } catch {}
    }

    if (remoteState.distributorPin) {
      setDistributorPinState(remoteState.distributorPin);
      try {
        safeStorage.setItem(STORAGE_PREFIX + 'distributor_pin', remoteState.distributorPin);
      } catch {}
    }

    if (remoteState.criticalThresholds) {
      setCriticalThresholdsState(remoteState.criticalThresholds as Record<CardCategory, number>);
    }

    // Mark as Fully Hydrated & Validated
    setHasLoadedInitialCloudState(true);
    hasLoadedInitialCloudStateRef.current = true;
    setIsHydratingCloud(false);
    setHydrationStatus('ready');
    hydrationStatusRef.current = 'ready';
    setIsCloudConnected(true);

    setHydrationValidation({
      isValid: true,
      status: 'ready',
      batchesCount: mergedBatches.length,
      sheetsCount: mergedSheets.length,
      transfersCount: mergedTransfers.length,
      outletsCount: mergedOutlets.length,
      deliveriesCount: mergedDeliveries.length,
      paymentsCount: mergedPayments.length,
      errors: [],
      warnings: validation.warnings,
      lastValidatedAt: new Date().toISOString(),
    });

    // Populate live debt audit report
    setTimeout(() => {
      auditAndReconcileOutletDebts({ autoFix: false });
    }, 50);

    // If local had unsynced records that the cloud didn't have, immediately push them!
    if (shouldPushLocalToCloud) {
      setTimeout(() => {
        pushStateToCloud();
      }, 150);
    }

    return true;
  };

  const retryHydration = async (): Promise<boolean> => {
    setHydrationStatus('hydrating');
    hydrationStatusRef.current = 'hydrating';
    setIsHydratingCloud(true);
    try {
      const state = await cloudSync.fetchCloudState();
      if (state) {
        return processAndApplyRemoteState(state, 'direct_fetch');
      }
      if (batchesRef.current.length > 0) {
        setHydrationStatus('ready');
        hydrationStatusRef.current = 'ready';
        setIsHydratingCloud(false);
        return true;
      }
      setHydrationStatus('ready');
      hydrationStatusRef.current = 'ready';
      setIsHydratingCloud(false);
      return false;
    } catch (err) {
      console.error('Retry hydration failed:', err);
      setHydrationStatus('error');
      hydrationStatusRef.current = 'error';
      setIsHydratingCloud(false);
      return false;
    }
  };

  // Subscribe to real-time Cloud updates from other device
  useEffect(() => {
    testFirestoreConnection().then((ok) => {
      setIsCloudConnected(ok);
    });

    // 0. Fast fetch on mount to speed up initial hydration with full validation
    cloudSync.fetchCloudState().then((state) => {
      if (state) {
        processAndApplyRemoteState(state, 'direct_fetch');
      }
    });

    // 1. Full state synchronization listener
    const unsubscribeState = cloudSync.subscribeToCloudState((remoteState) => {
      if (isLocalUpdateRef.current) return;

      // Fingerprint check to prevent unneeded re-renders and ping-pong sync loops
      const fingerprint = `${remoteState.batches?.length || 0}_${remoteState.sheets?.length || 0}_${remoteState.transfers?.length || 0}_${remoteState.outlets?.length || 0}_${remoteState.deliveries?.length || 0}_${remoteState.payments?.length || 0}_${remoteState.directSales?.length || 0}_${remoteState.cashHandovers?.length || 0}_${remoteState.settlements?.length || 0}_${remoteState.damagedCards?.length || 0}_${remoteState.auditLogs?.length || 0}_${remoteState.expenses?.length || 0}_${remoteState.adminPin || ''}`;

      if (fingerprint === lastStateFingerprintRef.current) {
        setIsCloudConnected(true);
        return;
      }
      lastStateFingerprintRef.current = fingerprint;

      // Mark that incoming updates are remote so the debounced effect does NOT re-push them
      isRemoteSyncRef.current = true;

      processAndApplyRemoteState(remoteState, 'snapshot');
    });

    // 2. Background real-time snapshot events listener for instant audio & visual alerts
    const unsubscribeEvents = cloudSync.subscribeToLiveEvents((event) => {
      // Ignore actions made by current user
      if (event.actorRole === currentRole) return;

      // Target role check
      if (event.targetRole !== 'all' && event.targetRole !== currentRole) return;

      // Play audio chime according to the operation
      if (event.eventType === 'LOW_STOCK_ALERT') {
        soundService.playCriticalStockAlert();
      } else if (event.eventType === 'BATCH_CREATED' || event.eventType === 'TRANSFER_CREATED') {
        soundService.playBatchPrinted();
      } else if (event.eventType === 'PAYMENT_RECEIVED' || event.eventType === 'CASH_HANDOVER') {
        soundService.playCashChime();
      } else if (event.eventType === 'DELIVERY_CREATED') {
        soundService.playSuccess();
      } else {
        soundService.playNotification();
      }

      // Add visual floating toast and in-app notification
      const newNotif: AppNotification = {
        id: `NOTIF-${event.id}`,
        title: event.title,
        message: event.message,
        type: event.eventType === 'LOW_STOCK_ALERT' ? 'alert' : event.eventType === 'PAYMENT_RECEIVED' ? 'success' : event.eventType === 'BATCH_CREATED' ? 'info' : 'warning',
        timestamp: new Date().toISOString(),
        isRead: false,
        targetRole: currentRole,
        actionType: event.eventType === 'LOW_STOCK_ALERT' ? 'print_decision' : undefined,
        actionCategory: event.category as CardCategory | undefined,
        recommendedSheets: event.category === '5000' || event.category === '10000' ? 5 : 15,
      };

      setNotifications((prev) => [newNotif, ...prev]);
    });

    return () => {
      if (unsubscribeState) unsubscribeState();
      if (unsubscribeEvents) unsubscribeEvents();
    };
  }, [currentRole]);

  // Debounced auto-sync whenever any state collection changes
  const isFirstRender = React.useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    // Do NOT push state back to cloud if this change was triggered by remote snapshot!
    if (isRemoteSyncRef.current) {
      isRemoteSyncRef.current = false;
      return;
    }

    const timer = setTimeout(() => {
      // Update local fingerprint so incoming self-snapshots don't trigger re-render
      lastStateFingerprintRef.current = `${batchesRef.current.length}_${sheetsRef.current.length}_${transfersRef.current.length}_${outletsRef.current.length}_${deliveriesRef.current.length}_${paymentsRef.current.length}_${directSalesRef.current.length}_${cashHandoversRef.current.length}_${settlementsRef.current.length}_${damagedCardsRef.current.length}_${auditLogsRef.current.length}_${expensesRef.current.length}_${adminPin}`;
      pushStateToCloud();
    }, 600);
    return () => clearTimeout(timer);
  }, [
    batches,
    sheets,
    transfers,
    outlets,
    deliveries,
    payments,
    directSales,
    cashHandovers,
    settlements,
    damagedCards,
    auditLogs,
    expenses,
    permissions,
    criticalThresholds,
  ]);

  // Save to localStorage whenever state changes
  useEffect(() => {
    safeStorage.setItem(STORAGE_PREFIX + 'expenses', JSON.stringify(expenses));
  }, [expenses]);

  // Save to persistent storage whenever state changes
  useEffect(() => {
    setPersistentRole(currentRole);
  }, [currentRole]);

  useEffect(() => {
    safeStorage.setItem(STORAGE_PREFIX + 'admin_pin', adminPin);
  }, [adminPin]);

  useEffect(() => {
    safeStorage.setItem(STORAGE_PREFIX + 'batches', JSON.stringify(batches));
  }, [batches]);

  useEffect(() => {
    safeStorage.setItem(STORAGE_PREFIX + 'sheets', JSON.stringify(sheets));
  }, [sheets]);

  useEffect(() => {
    safeStorage.setItem(STORAGE_PREFIX + 'transfers', JSON.stringify(transfers));
  }, [transfers]);

  useEffect(() => {
    safeStorage.setItem(STORAGE_PREFIX + 'outlets', JSON.stringify(outlets));
  }, [outlets]);

  useEffect(() => {
    safeStorage.setItem(STORAGE_PREFIX + 'deliveries', JSON.stringify(deliveries));
  }, [deliveries]);

  useEffect(() => {
    safeStorage.setItem(STORAGE_PREFIX + 'payments', JSON.stringify(payments));
  }, [payments]);

  useEffect(() => {
    safeStorage.setItem(STORAGE_PREFIX + 'directSales', JSON.stringify(directSales));
  }, [directSales]);

  useEffect(() => {
    safeStorage.setItem(STORAGE_PREFIX + 'cashHandovers', JSON.stringify(cashHandovers));
  }, [cashHandovers]);

  useEffect(() => {
    safeStorage.setItem(STORAGE_PREFIX + 'settlements', JSON.stringify(settlements));
  }, [settlements]);

  useEffect(() => {
    safeStorage.setItem(STORAGE_PREFIX + 'damagedCards', JSON.stringify(damagedCards));
  }, [damagedCards]);

  useEffect(() => {
    safeStorage.setItem(STORAGE_PREFIX + 'auditLogs', JSON.stringify(auditLogs));
  }, [auditLogs]);

  useEffect(() => {
    safeStorage.setItem(STORAGE_PREFIX + 'notifications', JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    safeStorage.setItem(STORAGE_PREFIX + 'permissions', JSON.stringify(permissions));
  }, [permissions]);

  useEffect(() => {
    safeStorage.setItem(STORAGE_PREFIX + 'critical_thresholds', JSON.stringify(criticalThresholds));
  }, [criticalThresholds]);

  // Financial and Inventory KPIs
  const distributorCashInHand = useMemo(() => {
    // 1. Immediate cash paid during delivery by distributor
    const deliveryCash = deliveries.reduce((sum, d) => sum + (d.cashPaidNow || 0), 0);
    // 2. Payments collected by distributor
    const paymentCash = payments.reduce((sum, p) => (p.collectorName.includes('الموزع') ? sum + p.amount : sum), 0);
    // 3. Direct sales cash by distributor
    const directCash = directSales.reduce(
      (sum, s) => (s.soldBy.includes('الموزع') && !s.isCredit ? sum + s.totalAmount : sum),
      0
    );
    // 4. Minus accepted cash handovers given to admin
    const handedOver = cashHandovers
      .filter((h) => h.status === 'accepted')
      .reduce((sum, h) => sum + h.amount, 0);

    // 5. Minus field expenses paid directly by distributor from collected cash
    const distExpenses = expenses
      .filter((e) => e.paymentMethod === 'distributor_cash')
      .reduce((sum, e) => sum + e.amount, 0);

    return Math.max(0, deliveryCash + paymentCash + directCash - handedOver - distExpenses);
  }, [deliveries, payments, directSales, cashHandovers, expenses]);

  const totalExpensesAmount = useMemo(() => {
    return expenses.reduce((sum, e) => sum + e.amount, 0);
  }, [expenses]);

  const distributorPaidExpensesAmount = useMemo(() => {
    return expenses
      .filter((e) => e.paymentMethod === 'distributor_cash')
      .reduce((sum, e) => sum + e.amount, 0);
  }, [expenses]);

  const adminPaidExpensesAmount = useMemo(() => {
    return expenses
      .filter((e) => e.paymentMethod === 'admin_cash' || e.paymentMethod === 'bank_wallet')
      .reduce((sum, e) => sum + e.amount, 0);
  }, [expenses]);

  const netProjectProfit = useMemo(() => {
    // Total Revenue = Direct Sales + Delivered to Outlets
    const totalDeliveriesRevenue = deliveries.reduce((sum, d) => sum + (d.totalAmount || 0), 0);
    const totalDirectRevenue = directSales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
    const totalRevenue = totalDeliveriesRevenue + totalDirectRevenue;

    // Card Printing Cost = sum of wholesale card cost from batches
    const totalPrintingCost = batches.reduce((sum, b) => sum + (b.totalWholesaleValue || 0), 0);

    // Operating expenses (excluding pure capital asset acquisitions)
    const operatingExpenses = expenses
      .filter((e) => !e.isCapitalAsset)
      .reduce((sum, e) => sum + e.amount, 0);

    return totalRevenue - totalPrintingCost - operatingExpenses;
  }, [deliveries, directSales, batches, expenses]);

  const adminTotalCashCollected = useMemo(() => {
    const fromHandovers = cashHandovers
      .filter((h) => h.status === 'accepted')
      .reduce((sum, h) => sum + h.amount, 0);
    const paymentsDirectToAdmin = payments.reduce(
      (sum, p) => (p.collectorName.includes('المسؤول') ? sum + p.amount : sum),
      0
    );
    const directSalesAdmin = directSales.reduce(
      (sum, s) => (s.soldBy.includes('المسؤول') && !s.isCredit ? sum + s.totalAmount : sum),
      0
    );
    return fromHandovers + paymentsDirectToAdmin + directSalesAdmin;
  }, [cashHandovers, payments, directSales]);

  const totalOutletsDebt = useMemo(() => {
    return outlets.reduce((sum, o) => sum + (o.currentDebt || 0), 0);
  }, [outlets]);

  const totalPrintedCards = useMemo(() => {
    return batches.reduce((sum, b) => sum + b.totalCards, 0);
  }, [batches]);

  const totalAdminCardsInCustody = useMemo(() => {
    return sheets.filter((s) => s.status === 'admin_custody').reduce((sum, s) => sum + s.cardsCount, 0);
  }, [sheets]);

  const totalDistributorCardsInCustody = useMemo(() => {
    return sheets.filter((s) => s.status === 'distributor_custody').reduce((sum, s) => sum + s.cardsCount, 0);
  }, [sheets]);

  const totalDeliveredCards = useMemo(() => {
    return sheets.filter((s) => s.status === 'delivered_outlet').reduce((sum, s) => sum + s.cardsCount, 0);
  }, [sheets]);

  // Threshold updater
  const setCriticalThreshold = (category: CardCategory, sheetsCount: number) => {
    const val = Math.max(1, sheetsCount);
    setCriticalThresholdsState((prev) => {
      const updated = { ...prev, [category]: val };
      return updated;
    });
    addAudit(
      'PERMISSIONS_UPDATED',
      `تم ضبط حد التنبيه الحرج لفئة ${category} ريال إلى ${val} شيت بعهدة الموزع`
    );
    soundService.playSuccess();
  };

  // Real-time Stock Health & Print Decision Analytics per category
  const stockHealthList: CategoryStockHealth[] = useMemo(() => {
    const categories: CardCategory[] = ['200', '500', '1000', '3000', '5000', '10000'];
    return categories.map((cat) => {
      const config = CARD_CATEGORIES_CONFIG[cat];
      const distSheetItems = sheets.filter(
        (s) => s.category === cat && s.status === 'distributor_custody'
      );
      const adminSheetItems = sheets.filter(
        (s) => s.category === cat && s.status === 'admin_custody'
      );
      const distCards = distSheetItems.reduce(
        (sum, s) => sum + (s.cardsCount || config.defaultCardsPerSheet),
        0
      );
      const adminCards = adminSheetItems.reduce(
        (sum, s) => sum + (s.cardsCount || config.defaultCardsPerSheet),
        0
      );
      const distSheets = Number((distCards / config.defaultCardsPerSheet).toFixed(2));
      const adminSheets = Number((adminCards / config.defaultCardsPerSheet).toFixed(2));
      const threshold = criticalThresholds[cat] ?? 2;

      let status: StockLevelStatus = 'adequate';
      let statusLabel = 'رصيد كافٍ وآمن';
      if (distCards === 0) {
        status = 'out_of_stock';
        statusLabel = 'نفد بالكامل 🚨';
      } else if (distSheets <= threshold) {
        status = 'critical';
        statusLabel = `مستوى حرج (${distSheets} شيت / ${distCards} كرت) ⚠️`;
      } else if (distSheets <= threshold * 1.5) {
        status = 'low';
        statusLabel = `منخفض (${distSheets} شيت / ${distCards} كرت) ⚠️`;
      }

      // Smart recommended print sheets calculation
      const baseRec = cat === '5000' || cat === '10000' ? 5 : cat === '3000' ? 10 : 20;
      const recommendedPrintSheets = status === 'out_of_stock' ? baseRec * 1.5 : baseRec;
      const recommendedPrintFaceValue = recommendedPrintSheets * config.defaultCardsPerSheet * config.nominalValue;
      const recommendedPrintWholesaleValue = recommendedPrintSheets * config.defaultWholesaleSheetPrice;

      let adviceMessage = '';
      if (distSheets === 0) {
        adviceMessage = adminSheets > 0
          ? `رصيد الموزع نفد تماماً! يتوفر في مخزنك ${adminSheets} شيت، قم بتحويل عهدة فوراً أو طباعة دفعة جديدة.`
          : `رصيد الموزع ومخزن المسؤول فارغ تماماً! يجب طباعة دفعة جديدة فوراً لتجنب توقف مبيعات المنافذ.`;
      } else if (distSheets <= threshold) {
        adviceMessage = adminSheets > 0
          ? `المخزون حرج (${distSheets} شيت). يتوفر ${adminSheets} شيت في مخزنك، يُنصح بالتحويل أو التجهيز لطباعة دفعة تعزيزية.`
          : `المخزون حرج (${distSheets} شيت) ولا يوجد رصيد في مخزن المسؤول! اتخذ قرار الطباعة الآن.`;
      } else {
        adviceMessage = `المخزون مستقر (${distSheets} شيت لدى الموزع + ${adminSheets} شيت بمخزن المسؤول).`;
      }

      return {
        category: cat,
        name: config.name,
        nominalValue: config.nominalValue,
        distributorSheets: distSheets,
        distributorCards: distCards,
        adminSheets,
        adminCards,
        thresholdSheets: threshold,
        status,
        statusLabel,
        recommendedPrintSheets: Math.round(recommendedPrintSheets),
        recommendedPrintFaceValue,
        recommendedPrintWholesaleValue,
        adviceMessage,
      };
    });
  }, [sheets, criticalThresholds]);

  const criticalCategoriesCount = useMemo(() => {
    return stockHealthList.filter((s) => s.status === 'critical' || s.status === 'out_of_stock').length;
  }, [stockHealthList]);

  // Ref to prevent repetitive notifications for the exact same stock count
  const lastAlertedStockRef = React.useRef<Record<string, number>>({});

  const checkAndTriggerCriticalStockAlert = (targetCategory?: CardCategory, customSheets?: SheetLeaf[]) => {
    const currentSheets = customSheets || sheets;
    const categoriesToCheck: CardCategory[] = targetCategory 
      ? [targetCategory] 
      : ['200', '500', '1000', '3000', '5000', '10000'];

    categoriesToCheck.forEach((cat) => {
      const config = CARD_CATEGORIES_CONFIG[cat];
      const distSheetItems = currentSheets.filter(
        (s) => s.category === cat && s.status === 'distributor_custody'
      );
      const adminSheetItems = currentSheets.filter(
        (s) => s.category === cat && s.status === 'admin_custody'
      );
      const distCards = distSheetItems.reduce(
        (sum, s) => sum + (s.cardsCount || config.defaultCardsPerSheet),
        0
      );
      const adminCards = adminSheetItems.reduce(
        (sum, s) => sum + (s.cardsCount || config.defaultCardsPerSheet),
        0
      );
      const distSheets = Number((distCards / config.defaultCardsPerSheet).toFixed(2));
      const adminSheets = Number((adminCards / config.defaultCardsPerSheet).toFixed(2));
      const threshold = criticalThresholds[cat] ?? 2;

      if (distSheets <= threshold) {
        // Prevent continuous duplicate alert for the exact same stock count
        const lastAlerted = lastAlertedStockRef.current[cat];
        if (lastAlerted === distSheets) {
          return;
        }
        lastAlertedStockRef.current[cat] = distSheets;
        const recSheets = cat === '5000' || cat === '10000' ? 5 : 15;

        // Sound alert
        soundService.playCriticalStockAlert();

        const title = distCards === 0
          ? `🚨 نفاد تام: كروت فئة ${cat} لدى الموزع`
          : `⚠️ تنبيه مستوى حرج: رصيد فئة ${cat} لدى الموزع (${distSheets} شيت / ${distCards} كرت)`;
        
        const message = distCards === 0
          ? `نفد رصيد فئة ${cat} ريال تماماً لدى الموزع الميداني! الرصيد في مخزن المسؤول: ${adminSheets} شيت (${adminCards} كرت). توصية الطباعة: يُرجى طباعة دفعة جديدة فوراً بعدد ${recSheets} شيت لتزويد المنافذ.`
          : `وصل رصيد فئة ${cat} ريال لدى الموزع الميداني إلى ${distSheets} شيت فقط (${distCards} كرت)، وهو عند الحد الحرج (≤ ${threshold} شيت)! الرصيد في مخزنك: ${adminSheets} شيت (${adminCards} كرت). القرار المقترح: التجهيز لطباعة دفعة قادمة (${recSheets} شيت).`;

        addNotification({
          title,
          message,
          type: 'alert',
          targetRole: 'admin',
          actionType: 'print_decision',
          actionCategory: cat,
          recommendedSheets: recSheets,
        });

        // Broadcast to cloud for instant multi-device alert
        cloudSync.emitLiveEvent({
          eventType: 'LOW_STOCK_ALERT',
          title,
          message,
          actorRole: 'distributor',
          targetRole: 'admin',
          category: cat,
          sheetsCount: distSheets,
        });
      } else {
        // Reset alerted level if stock replenished
        delete lastAlertedStockRef.current[cat];
      }
    });
  };

  const triggerStockAlertManually = (category: CardCategory) => {
    const config = CARD_CATEGORIES_CONFIG[category];
    const distSheetItems = sheets.filter(
      (s) => s.category === category && s.status === 'distributor_custody'
    );
    const adminSheetItems = sheets.filter(
      (s) => s.category === category && s.status === 'admin_custody'
    );
    const distCards = distSheetItems.reduce(
      (sum, s) => sum + (s.cardsCount || config.defaultCardsPerSheet),
      0
    );
    const adminCards = adminSheetItems.reduce(
      (sum, s) => sum + (s.cardsCount || config.defaultCardsPerSheet),
      0
    );
    const distSheets = Number((distCards / config.defaultCardsPerSheet).toFixed(2));
    const adminSheets = Number((adminCards / config.defaultCardsPerSheet).toFixed(2));
    const threshold = criticalThresholds[category] ?? 2;
    const recSheets = category === '5000' || category === '10000' ? 5 : 15;

    soundService.playCriticalStockAlert();

    const title = `⚠️ [تنبيه تجريبي] رصيد فئة ${category} لدى الموزع`;
    const message = `تنبيه تجريبي ذكي: رصيد فئة ${category} حالياً ${distSheets} شيت (${distCards} كرت) (الحد الحرج: ${threshold} شيت). مخزن المسؤول: ${adminSheets} شيت (${adminCards} كرت). توصية الطباعة: ${recSheets} شيت.`;

    addNotification({
      title,
      message,
      type: 'alert',
      targetRole: 'admin',
      actionType: 'print_decision',
      actionCategory: category,
      recommendedSheets: recSheets,
    });

    cloudSync.emitLiveEvent({
      eventType: 'LOW_STOCK_ALERT',
      title,
      message,
      actorRole: 'distributor',
      targetRole: 'admin',
      category,
      sheetsCount: distSheets,
    });
  };

  // Helpers
  const addAudit = (actionType: AuditLogItem['actionType'], details: string) => {
    const item: AuditLogItem = {
      id: `LOG-${Date.now().toString().slice(-6)}`,
      actionType,
      actorName: currentRole === 'admin' ? 'المسؤول' : 'الموزع الميداني',
      actorRole: currentRole,
      details,
      timestamp: new Date().toISOString(),
    };
    setAuditLogs((prev) => [item, ...prev]);

    // If device is offline, record to offline queue for automatic sync upon reconnection
    if (typeof navigator !== 'undefined' && !navigator.onLine && actionType !== 'CLOUD_SYNC') {
      addOfflineQueueItem(actionType, details);
    }
  };

  const addNotification = (notif: Omit<AppNotification, 'id' | 'timestamp' | 'isRead'>) => {
    const newNotif: AppNotification = {
      ...notif,
      id: `NOTIF-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toISOString(),
      isRead: false,
    };
    setNotifications((prev) => [newNotif, ...prev]);
    soundService.playNotification();
  };

  const markNotificationAsRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
  };

  const markAllNotificationsAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const verifyAdminPin = (pin: string) => {
    return pin === adminPin;
  };

  const setAdminPin = (newPin: string) => {
    if (!checkHydrationReady('تغيير الرمز السري للمسؤول')) return;
    setAdminPinState(newPin);
    safeStorage.setItem(STORAGE_PREFIX + 'admin_pin', newPin);
    pushStateToCloud({ adminPin: newPin });
    addAudit('SYSTEM_RESET', 'تم تغيير الرمز السري (PIN) للمسؤول');
    soundService.playSuccess();
  };

  const verifyDistributorPin = (pin: string) => {
    return pin === distributorPin || pin === '0000';
  };

  const setDistributorPin = (newPin: string) => {
    if (!checkHydrationReady('تغيير الرمز السري للموزع')) return;
    setDistributorPinState(newPin);
    safeStorage.setItem(STORAGE_PREFIX + 'distributor_pin', newPin);
    pushStateToCloud({ distributorPin: newPin });
    addAudit('PERMISSIONS_UPDATED', `تم تعيين رمز PIN شخصي جديد للموزع الميداني (${newPin})`);
    soundService.playSuccess();
  };

  const setDistributorSetupDone = (done: boolean) => {
    setIsDistributorSetupDoneState(done);
    safeStorage.setItem(STORAGE_PREFIX + 'distributor_setup_done', done ? 'true' : 'false');
  };

  // 1. Add Batch
  const addBatch = ({
    category,
    date,
    accountingMonth,
    sheetsCount,
    cardsPerSheet = 60,
    wholesaleSheetPrice,
    batchType = 'sheets',
    cardsCount,
    wholesaleCardPrice,
    notes,
  }: {
    category: CardCategory;
    date: string;
    accountingMonth: string;
    sheetsCount: number;
    cardsPerSheet?: number;
    wholesaleSheetPrice?: number;
    batchType?: 'sheets' | 'cards';
    cardsCount?: number;
    wholesaleCardPrice?: number;
    notes?: string;
  }): PrintBatch => {
    if (!checkHydrationReady('إضافة دفعة طباعة')) {
      return null as any;
    }
    const config = CARD_CATEGORIES_CONFIG[category];
    const isCardBatch = batchType === 'cards' || (cardsCount !== undefined && cardsCount > 0);
    const resolvedCardUnitPrice = wholesaleCardPrice ?? config.defaultWholesaleCardPrice ?? Math.round((wholesaleSheetPrice ?? config.defaultWholesaleSheetPrice) / config.defaultCardsPerSheet);
    const unitPrice = wholesaleSheetPrice ?? config.defaultWholesaleSheetPrice;
    
    const maxBatchNumber = batchesRef.current.reduce((max, b) => Math.max(max, b.batchNumber || 0), 0);
    const batchNumber = maxBatchNumber + 1;

    // Calculate sequential batch number strictly within this category and accounting month
    // E.g. When November begins, the first batch of 500 will be 1 (الدفعة الأولى) rather than continuing previous months!
    const targetMonth = accountingMonth || (date ? date.slice(0, 7) : new Date().toISOString().slice(0, 7));
    const monthCategoryBatches = batchesRef.current.filter(
      (b) =>
        b.category === category &&
        (b.accountingMonth === targetMonth || (b.date && b.date.startsWith(targetMonth)))
    );
    const maxCatBatchNumber = monthCategoryBatches.reduce((max, b) => Math.max(max, b.categoryBatchNumber || 0), 0);
    const categoryBatchNumber = maxCatBatchNumber + 1;
    const monthBatchNumber = categoryBatchNumber;
    const batchId = `BATCH-2026-${String(batchNumber).padStart(3, '0')}`;
    
    const defCards = config.defaultCardsPerSheet || 60;
    const totalCards = isCardBatch ? Number(cardsCount) : sheetsCount * cardsPerSheet;
    const totalFaceValue = totalCards * config.nominalValue;
    const totalWholesaleValue = isCardBatch ? totalCards * resolvedCardUnitPrice : sheetsCount * unitPrice;
    const fullSheetsFromCards = isCardBatch ? Math.floor(totalCards / defCards) : sheetsCount;
    const remainderCards = isCardBatch ? totalCards % defCards : 0;
    const effectiveSheetsCount = isCardBatch
      ? (remainderCards === 0 ? fullSheetsFromCards : Number((totalCards / defCards).toFixed(2)))
      : sheetsCount;

    const newBatch: PrintBatch = {
      id: batchId,
      batchNumber,
      categoryBatchNumber,
      monthBatchNumber,
      category,
      date,
      accountingMonth: targetMonth,
      sheetsCount: effectiveSheetsCount,
      cardsPerSheet: defCards,
      totalCards,
      totalFaceValue,
      wholesaleSheetPrice: unitPrice,
      wholesaleCardPrice: resolvedCardUnitPrice,
      batchType: isCardBatch && remainderCards > 0 && fullSheetsFromCards === 0 ? 'cards' : 'sheets',
      totalWholesaleValue,
      notes,
      createdAt: new Date().toISOString(),
      createdBy: 'المسؤول',
    };

    // Generate individual sheet leaves for leaf-by-leaf tracking
    const newSheets: SheetLeaf[] = [];
    if (isCardBatch) {
      if (fullSheetsFromCards > 0) {
        for (let i = 1; i <= fullSheetsFromCards; i++) {
          const leafNumber = i;
          const sheetCode = `QZ-${category}-B${batchNumber}-S${String(leafNumber).padStart(3, '0')}`;
          newSheets.push({
            leafNumber,
            batchNumber,
            categoryBatchNumber,
            monthBatchNumber,
            accountingMonth: targetMonth,
            sheetCode,
            batchId,
            category,
            cardsCount: defCards,
            status: 'admin_custody',
            currentHolder: 'admin',
            timestamp: new Date().toISOString(),
          });
        }
        if (remainderCards > 0) {
          const leafNumber = fullSheetsFromCards + 1;
          const sheetCode = `QZ-${category}-B${batchNumber}-S${String(leafNumber).padStart(3, '0')}-P${remainderCards}`;
          newSheets.push({
            leafNumber,
            batchNumber,
            categoryBatchNumber,
            monthBatchNumber,
            accountingMonth: targetMonth,
            sheetCode,
            batchId,
            category,
            cardsCount: remainderCards,
            status: 'admin_custody',
            currentHolder: 'admin',
            timestamp: new Date().toISOString(),
          });
        }
      } else {
        const leafNumber = 1;
        const sheetCode = `QZ-${category}-B${batchNumber}-C${totalCards}`;
        newSheets.push({
          leafNumber,
          batchNumber,
          categoryBatchNumber,
          monthBatchNumber,
          accountingMonth: targetMonth,
          sheetCode,
          batchId,
          category,
          cardsCount: totalCards,
          status: 'admin_custody',
          currentHolder: 'admin',
          timestamp: new Date().toISOString(),
        });
      }
    } else {
      for (let i = 1; i <= sheetsCount; i++) {
        const leafNumber = i;
        const sheetCode = `QZ-${category}-B${batchNumber}-S${String(leafNumber).padStart(3, '0')}`;
        newSheets.push({
          leafNumber,
          batchNumber,
          categoryBatchNumber,
          monthBatchNumber,
          accountingMonth: targetMonth,
          sheetCode,
          batchId,
          category,
          cardsCount: cardsPerSheet,
          status: 'admin_custody',
          currentHolder: 'admin',
          timestamp: new Date().toISOString(),
        });
      }
    }

    const updatedBatches = [newBatch, ...batchesRef.current];
    const updatedSheets = [...sheetsRef.current, ...newSheets];
    batchesRef.current = updatedBatches;
    sheetsRef.current = updatedSheets;

    setBatches(updatedBatches);
    setSheets(updatedSheets);
    try {
      safeStorage.setItem(STORAGE_PREFIX + 'batches', JSON.stringify(updatedBatches));
      safeStorage.setItem(STORAGE_PREFIX + 'sheets', JSON.stringify(updatedSheets));
    } catch (e) {
      console.warn('LocalStorage error:', e);
    }
    pushStateToCloud({ batches: updatedBatches, sheets: updatedSheets });

    const monthArabic = getArabicMonthName(targetMonth);
    const batchOrdinalText = getBatchOrdinalName(categoryBatchNumber);

    addAudit(
      'BATCH_CREATED',
      isCardBatch
        ? `تمت طباعة ${batchOrdinalText} (${monthArabic}) فئة ${category} بعدد ${totalCards} كرت بقيمة جملة ${totalWholesaleValue.toLocaleString()} ر.ي (كود ${batchId})`
        : `تمت طباعة ${batchOrdinalText} (${monthArabic}) فئة ${category} بعدد ${sheetsCount} شيت (${totalCards} كرت) بقيمة جملة ${totalWholesaleValue.toLocaleString()} ر.ي (كود ${batchId})`
    );

    addNotification({
      title: `طباعة دفعة جديدة: ${batchOrdinalText}`,
      message: `قام المسؤول بإضافة ${batchOrdinalText} (${monthArabic}) فئة ${category} (${sheetsCount} شيت / ${totalCards} كرت). الكروت جاهزة في العهدة.`,
      type: 'info',
      targetRole: 'distributor',
    });

    // Broadcast live snapshot event to distributor
    cloudSync.emitLiveEvent({
      eventType: 'BATCH_CREATED',
      title: `دفعة طباعة جديدة: ${batchOrdinalText}`,
      message: `قام المسؤول بتسجيل ${batchOrdinalText} (${monthArabic}) فئة ${category} بعدد ${sheetsCount} شيت (${totalCards} كرت).`,
      actorRole: 'admin',
      targetRole: 'distributor',
      category,
      sheetsCount,
    });

    soundService.playSuccess();
    return newBatch;
  };

  // 2. Comprehensive Update & Correction for Print Batch
  const updateBatch = (
    batchId: string,
    data: {
      category?: CardCategory;
      sheetsCount?: number;
      wholesaleSheetPrice?: number;
      cardsPerSheet?: number;
      date?: string;
      accountingMonth?: string;
      notes?: string;
    }
  ): { success: boolean; message?: string } => {
    const existing = batchesRef.current.find((b) => b.id === batchId);
    if (!existing) {
      return { success: false, message: 'الدفعة المطلوبة غير موجودة في النظام' };
    }

    const currentSheets = sheetsRef.current.filter((s) => s.batchId === batchId);
    const usedSheets = currentSheets.filter((s) => s.status !== 'admin_custody');

    // Validation 1: Cannot reduce sheetsCount below the number of sheets already transferred or delivered
    const targetSheetsCount =
      data.sheetsCount !== undefined ? Math.max(1, Number(data.sheetsCount)) : existing.sheetsCount;
    if (targetSheetsCount < usedSheets.length) {
      return {
        success: false,
        message: `لا يمكن تقليص عدد الشيتات إلى ${targetSheetsCount} شيت لأن هناك ${usedSheets.length} شيت تم تحويلها لعهدة الموزع أو توريدها للمنافذ بالفعل. الحد الأدنى المسموح به هو ${usedSheets.length} شيت.`,
      };
    }

    // Validation 2: Cannot change category if any sheet has already left admin custody
    const targetCategory = data.category || existing.category;
    if (targetCategory !== existing.category && usedSheets.length > 0) {
      return {
        success: false,
        message: `لا يمكن تغيير فئة الدفعة بعد أن تم تحويل أو توريد ${usedSheets.length} شيت منها للمنافذ والموزع.`,
      };
    }

    const targetConfig = CARD_CATEGORIES_CONFIG[targetCategory];
    const targetCardsPerSheet =
      data.cardsPerSheet || existing.cardsPerSheet || targetConfig.defaultCardsPerSheet;
    const targetWholesalePrice =
      data.wholesaleSheetPrice !== undefined
        ? Number(data.wholesaleSheetPrice)
        : existing.wholesaleSheetPrice || targetConfig.defaultWholesaleSheetPrice;

    const oldSheetsCount = existing.sheetsCount;
    const oldWholesale = existing.wholesaleSheetPrice;
    const oldCategory = existing.category;

    // Adjust sheets
    let updatedAllSheets = [...sheetsRef.current];
    const totalExistingSheetsInBatch = currentSheets.length;

    if (targetSheetsCount < totalExistingSheetsInBatch) {
      // Safely remove the excess unused sheets in admin custody starting from highest leafNumber
      const unusedInBatch = currentSheets
        .filter((s) => s.status === 'admin_custody')
        .sort((a, b) => b.leafNumber - a.leafNumber);

      const countToRemove = totalExistingSheetsInBatch - targetSheetsCount;
      const codesToRemove = new Set(unusedInBatch.slice(0, countToRemove).map((s) => s.sheetCode));
      updatedAllSheets = updatedAllSheets.filter((s) => !codesToRemove.has(s.sheetCode));
    } else if (targetSheetsCount > totalExistingSheetsInBatch) {
      // Generate additional sheets from totalExistingSheetsInBatch + 1 to targetSheetsCount
      const additionalSheets: SheetLeaf[] = [];
      const catBatchNum =
        existing.categoryBatchNumber || getCategoryBatchNumber(existing, batchesRef.current);
      for (let i = totalExistingSheetsInBatch + 1; i <= targetSheetsCount; i++) {
        const sheetCode = `QZ-${targetCategory}-B${existing.batchNumber}-S${String(i).padStart(3, '0')}`;
        additionalSheets.push({
          leafNumber: i,
          batchNumber: existing.batchNumber,
          categoryBatchNumber: catBatchNum,
          sheetCode,
          batchId: existing.id,
          category: targetCategory,
          cardsCount: targetCardsPerSheet,
          status: 'admin_custody',
          currentHolder: 'admin',
          timestamp: data.date ? `${data.date}T12:00:00.000Z` : existing.createdAt,
        });
      }
      updatedAllSheets = [...updatedAllSheets, ...additionalSheets];
    }

    // If category changed or cardsPerSheet changed, update all sheets belonging to this batch
    if (targetCategory !== existing.category || targetCardsPerSheet !== existing.cardsPerSheet) {
      updatedAllSheets = updatedAllSheets.map((s) => {
        if (s.batchId === batchId) {
          const newCode = `QZ-${targetCategory}-B${s.batchNumber || existing.batchNumber}-S${String(s.leafNumber).padStart(3, '0')}`;
          return {
            ...s,
            category: targetCategory,
            cardsCount: targetCardsPerSheet,
            sheetCode: newCode,
          };
        }
        return s;
      });
    }

    // Recalculate batch financials
    const totalCards = targetSheetsCount * targetCardsPerSheet;
    const totalWholesaleValue = targetSheetsCount * targetWholesalePrice;
    const totalFaceValue = totalCards * targetConfig.nominalValue;

    const updatedBatch: PrintBatch = {
      ...existing,
      category: targetCategory,
      sheetsCount: targetSheetsCount,
      cardsPerSheet: targetCardsPerSheet,
      totalCards,
      wholesaleSheetPrice: targetWholesalePrice,
      totalWholesaleValue,
      totalFaceValue,
      date: data.date || existing.date,
      accountingMonth: data.accountingMonth || existing.accountingMonth,
      notes: data.notes !== undefined ? data.notes : existing.notes,
      updatedAt: new Date().toISOString(),
    };

    const updatedBatches = batchesRef.current.map((b) => (b.id === batchId ? updatedBatch : b));

    batchesRef.current = updatedBatches;
    sheetsRef.current = updatedAllSheets;
    setBatches(updatedBatches);
    setSheets(updatedAllSheets);

    safeStorage.setItem(STORAGE_PREFIX + 'batches', JSON.stringify(updatedBatches));
    safeStorage.setItem(STORAGE_PREFIX + 'sheets', JSON.stringify(updatedAllSheets));

    // Detailed Audit Log for financial traceability
    const changes: string[] = [];
    if (oldSheetsCount !== targetSheetsCount) {
      changes.push(`عدد الشيتات من ${oldSheetsCount} إلى ${targetSheetsCount}`);
    }
    if (oldWholesale !== targetWholesalePrice) {
      changes.push(`سعر الشيت من ${oldWholesale.toLocaleString()} إلى ${targetWholesalePrice.toLocaleString()} ر.ي`);
    }
    if (oldCategory !== targetCategory) {
      changes.push(`الفئة من ${oldCategory} إلى ${targetCategory}`);
    }
    if (data.date && data.date !== existing.date) {
      changes.push(`التاريخ إلى ${data.date}`);
    }
    if (data.accountingMonth && data.accountingMonth !== existing.accountingMonth) {
      changes.push(`الشهر المحاسبي إلى ${data.accountingMonth}`);
    }

    const auditDetails = `تم تصحيح وتعديل بيانات الدفعة ${existing.id} (${existing.category} ر.ي) بواسطة المسؤول: ${changes.join('، ')}. إجمالي الكروت الجديد: ${totalCards} كرت، إجمالي قيمة الجملة: ${totalWholesaleValue.toLocaleString()} ر.ي.`;
    addAudit('BATCH_UPDATED', auditDetails);

    cloudSync.emitLiveEvent({
      eventType: 'BATCH_CREATED',
      title: 'تصحيح بيانات دفعة طباعة',
      message: `قام المسؤول بتعديل بيانات الدفعة ${existing.id}: ${targetSheetsCount} شيت فئة ${targetCategory} ريال.`,
      actorRole: 'admin',
      targetRole: 'all',
      category: targetCategory,
      sheetsCount: targetSheetsCount,
    });

    soundService.playSuccess();
    return { success: true };
  };

  // 2. Update Batch Date and Month (Backwards Compatibility wrapper)
  const updateBatchDateMonth = (batchId: string, newDate: string, newMonth: string): boolean => {
    return updateBatch(batchId, { date: newDate, accountingMonth: newMonth }).success;
  };

  // 2.B Delete Print Batch (Allowed only if no sheets transferred or delivered)
  const deleteBatch = (batchId: string): { success: boolean; message?: string } => {
    const existing = batchesRef.current.find((b) => b.id === batchId);
    if (!existing) {
      return { success: false, message: 'الدفعة المطلوبة غير موجودة في النظام' };
    }

    const currentSheets = sheetsRef.current.filter((s) => s.batchId === batchId);
    const usedSheets = currentSheets.filter((s) => s.status !== 'admin_custody');

    if (usedSheets.length > 0) {
      return {
        success: false,
        message: `لا يمكن حذف الدفعة #${existing.batchNumber} لأن هناك ${usedSheets.length} شيت تم تحويلها لعهدة الموزع أو توريدها للمنافذ بالفعل. قم بتعديل أو حذف سندات التحويل أولاً.`,
      };
    }

    const updatedBatches = batchesRef.current.filter((b) => b.id !== batchId);
    const updatedSheets = sheetsRef.current.filter((s) => s.batchId !== batchId);

    batchesRef.current = updatedBatches;
    sheetsRef.current = updatedSheets;
    setBatches(updatedBatches);
    setSheets(updatedSheets);

    try {
      safeStorage.setItem(STORAGE_PREFIX + 'batches', JSON.stringify(updatedBatches));
      safeStorage.setItem(STORAGE_PREFIX + 'sheets', JSON.stringify(updatedSheets));
    } catch {}

    pushStateToCloud({ batches: updatedBatches, sheets: updatedSheets });

    addAudit(
      'BATCH_DELETED',
      `تم حذف دفعة الطباعة #${existing.batchNumber} (${existing.id}) فئة ${existing.category} ريال بالكامل وإلغاء شيتاتها (${existing.sheetsCount} شيت).`
    );

    soundService.playSuccess();
    return { success: true };
  };

  // 3. Create Transfer (Admin -> Distributor)
  const createTransfer = ({
    category,
    sheetsCount,
    cardsCount,
    transferType = 'sheets',
    leafNumbers = [],
    sheetCodes,
    batchId,
    notes,
  }: {
    category: CardCategory;
    sheetsCount: number;
    cardsCount?: number;
    transferType?: 'sheets' | 'cards';
    leafNumbers?: number[];
    sheetCodes?: string[];
    batchId?: string;
    notes?: string;
  }): CustodyTransfer => {
    if (!checkHydrationReady('تحويل عهدة للموزع')) {
      return null as any;
    }
    const config = CARD_CATEGORIES_CONFIG[category];
    const transferNumber = transfersRef.current.length + 1;
    const transferId = `TR-2026-${String(transferNumber).padStart(4, '0')}`;
    const isCardTransfer = transferType === 'cards' || (cardsCount !== undefined && cardsCount > 0);
    const cardUnitPrice = config.defaultWholesaleCardPrice || Math.round(config.defaultWholesaleSheetPrice / config.defaultCardsPerSheet);

    const selectedSheetCodes: string[] = [];
    const resolvedLeafNumbers: number[] = [...leafNumbers];
    let updatedSheets: SheetLeaf[] = [];
    let totalCards = 0;
    let totalWholesaleValue = 0;

    // Strict Inventory Validation: Verify admin custody availability before issuing transfer
    const eligibleAdminSheets = sheetsRef.current.filter((sheet) => {
      const matchCat = sheet.category === category;
      const matchStatus = sheet.status === 'admin_custody';
      const matchBatch = batchId ? sheet.batchId === batchId : true;
      return matchCat && matchStatus && matchBatch;
    });

    const totalAvailableAdminCards = eligibleAdminSheets.reduce(
      (sum, s) => sum + (s.cardsCount || config.defaultCardsPerSheet),
      0
    );

    if (totalAvailableAdminCards === 0) {
      throw new Error(
        `لا يمكن تحويل العهدة: رصيد فئة ${category} ريال نافد بالكامل من بحوزة المسؤول (المتوفر: 0 كرت). يرجى طباعة دفعة جديدة أولاً!`
      );
    }

    if (isCardTransfer) {
      totalCards = Number(cardsCount) || 20;
      if (totalCards > totalAvailableAdminCards) {
        throw new Error(
          `لا يمكن تحويل ${totalCards} كرت: الرصيد المتوفر بحوزة المسؤول هو ${totalAvailableAdminCards} كرت فقط.`
        );
      }

      totalWholesaleValue = totalCards * cardUnitPrice;
      const effectiveSheetsCount = Number((totalCards / config.defaultCardsPerSheet).toFixed(2));

      let cardsToAllocate = totalCards;
      const generatedCardSlices: SheetLeaf[] = [];

      const mappedSheets = sheetsRef.current.map((sheet) => {
        if (cardsToAllocate <= 0) return sheet;
        const isMatch =
          sheet.category === category &&
          sheet.status === 'admin_custody' &&
          (batchId ? sheet.batchId === batchId : true);
        if (!isMatch) return sheet;

        const availableCardsInSheet = sheet.cardsCount || config.defaultCardsPerSheet;

        if (cardsToAllocate >= availableCardsInSheet) {
          // Transfer entire sheet
          cardsToAllocate -= availableCardsInSheet;
          selectedSheetCodes.push(sheet.sheetCode);
          if (!resolvedLeafNumbers.includes(sheet.leafNumber)) {
            resolvedLeafNumbers.push(sheet.leafNumber);
          }
          return {
            ...sheet,
            status: 'distributor_custody' as SheetStatus,
            currentHolder: 'distributor',
            transferId,
          };
        } else {
          // Partial transfer from this sheet
          const transferredFromSheet = cardsToAllocate;
          cardsToAllocate = 0;
          const sliceCode = `${sheet.sheetCode}-P${transferredFromSheet}`;
          selectedSheetCodes.push(sliceCode);
          if (!resolvedLeafNumbers.includes(sheet.leafNumber)) {
            resolvedLeafNumbers.push(sheet.leafNumber);
          }

          generatedCardSlices.push({
            ...sheet,
            sheetCode: sliceCode,
            cardsCount: transferredFromSheet,
            status: 'distributor_custody' as SheetStatus,
            currentHolder: 'distributor',
            transferId,
            timestamp: new Date().toISOString(),
          });

          return {
            ...sheet,
            cardsCount: availableCardsInSheet - transferredFromSheet,
          };
        }
      });

      if (cardsToAllocate > 0) {
        throw new Error(
          `تعذر تحويل ${cardsToAllocate} كرت إضافية: رصيد المخزن الفعلي غير كافٍ!`
        );
      }

      updatedSheets = [...mappedSheets, ...generatedCardSlices];

      const newTransfer: CustodyTransfer = {
        id: transferId,
        date: new Date().toISOString().split('T')[0],
        category,
        batchId,
        sheetsCount: effectiveSheetsCount,
        cardsCount: totalCards,
        transferType: 'cards',
        leafNumbers: resolvedLeafNumbers,
        sheetCodes: selectedSheetCodes,
        totalCards,
        totalWholesaleValue,
        notes: notes || `تحويل عهدة بعدد ${totalCards} كرت جزئي`,
        fromUser: 'المسؤول',
        toUser: 'الموزع الميداني',
        createdAt: new Date().toISOString(),
      };

      const updatedTransfers = [newTransfer, ...transfersRef.current];
      transfersRef.current = updatedTransfers;
      sheetsRef.current = updatedSheets;
      setTransfers(updatedTransfers);
      setSheets(updatedSheets);

      try {
        safeStorage.setItem(STORAGE_PREFIX + 'sheets', JSON.stringify(updatedSheets));
        safeStorage.setItem(STORAGE_PREFIX + 'transfers', JSON.stringify(updatedTransfers));
      } catch {}
      pushStateToCloud({ sheets: updatedSheets, transfers: updatedTransfers });

      addAudit(
        'TRANSFER_CREATED',
        `تم تحويل عهدة بعدد ${totalCards} كرت فئة ${category} ريال بسند ${transferId} إلى عهدة الموزع الميداني بقيمة جملة ${totalWholesaleValue.toLocaleString()} ر.ي`
      );

      addNotification({
        title: 'تحويل عهدة كروت جديد',
        message: `تم تحويل ${totalCards} كرت فئة ${category} برقم سند ${transferId} إلى عهدتك الميدانية.`,
        type: 'warning',
        targetRole: 'distributor',
      });

      cloudSync.emitLiveEvent({
        eventType: 'TRANSFER_CREATED',
        title: 'سند تحويل عهدة كروت (TR)',
        message: `قام المسؤول بتحويل عهدة ${totalCards} كرت فئة ${category} برقم ${transferId} إلى عهدتك الميدانية.`,
        actorRole: 'admin',
        targetRole: 'distributor',
        category,
        sheetsCount: effectiveSheetsCount,
      });

      soundService.playSuccess();
      return newTransfer;
    } else {
      // Standard full sheets transfer
      totalCards = sheetsCount * config.defaultCardsPerSheet;
      totalWholesaleValue = sheetsCount * config.defaultWholesaleSheetPrice;

      let resolvedBatchId = batchId;
      if (!resolvedBatchId && sheetCodes && sheetCodes.length > 0) {
        const firstFound = sheetsRef.current.find((s) => sheetCodes.includes(s.sheetCode));
        if (firstFound?.batchId) resolvedBatchId = firstFound.batchId;
      }

      updatedSheets = sheetsRef.current.map((sheet) => {
        const isTarget = sheetCodes && sheetCodes.length > 0
          ? sheetCodes.includes(sheet.sheetCode)
          : sheet.category === category &&
            sheet.status === 'admin_custody' &&
            (resolvedBatchId ? sheet.batchId === resolvedBatchId : true) &&
            leafNumbers.includes(sheet.leafNumber);

        if (isTarget) {
          selectedSheetCodes.push(sheet.sheetCode);
          if (!resolvedLeafNumbers.includes(sheet.leafNumber)) {
            resolvedLeafNumbers.push(sheet.leafNumber);
          }
          return {
            ...sheet,
            status: 'distributor_custody' as SheetStatus,
            currentHolder: 'distributor',
            transferId,
          };
        }
        return sheet;
      });

      const newTransfer: CustodyTransfer = {
        id: transferId,
        date: new Date().toISOString().split('T')[0],
        category,
        batchId: resolvedBatchId,
        sheetsCount,
        leafNumbers: resolvedLeafNumbers,
        sheetCodes: selectedSheetCodes,
        totalCards,
        totalWholesaleValue,
        transferType: 'sheets',
        notes,
        fromUser: 'المسؤول',
        toUser: 'الموزع الميداني',
        createdAt: new Date().toISOString(),
      };

      const updatedTransfers = [newTransfer, ...transfersRef.current];
      transfersRef.current = updatedTransfers;
      sheetsRef.current = updatedSheets;
      setTransfers(updatedTransfers);
      setSheets(updatedSheets);

      try {
        safeStorage.setItem(STORAGE_PREFIX + 'sheets', JSON.stringify(updatedSheets));
        safeStorage.setItem(STORAGE_PREFIX + 'transfers', JSON.stringify(updatedTransfers));
      } catch {}
      pushStateToCloud({ sheets: updatedSheets, transfers: updatedTransfers });

      addAudit(
        'TRANSFER_CREATED',
        `تم تحويل عهدة سند ${transferId} فئة ${category} بعدد ${sheetsCount} شيت (${totalCards} كرت) إلى عهدة الموزع الميداني`
      );

      addNotification({
        title: 'سند تحويل عهدة جديد',
        message: `تم تحويل ${sheetsCount} شيت فئة ${category} برقم سند ${transferId} إلى عهدتك الميدانية.`,
        type: 'warning',
        targetRole: 'distributor',
      });

      cloudSync.emitLiveEvent({
        eventType: 'TRANSFER_CREATED',
        title: 'سند تحويل عهدة كروت (TR)',
        message: `قام المسؤول بتحويل عهدة ${sheetsCount} شيت فئة ${category} برقم ${transferId} إلى عهدتك الميدانية.`,
        actorRole: 'admin',
        targetRole: 'distributor',
        category,
        sheetsCount,
      });

      soundService.playSuccess();
      return newTransfer;
    }
  };

  // 3.C Update Custody Transfer (Admin -> Distributor correction)
  const updateTransfer = (
    transferId: string,
    data: {
      cardsCount?: number;
      sheetsCount?: number;
      wholesalePrice?: number;
      date?: string;
      notes?: string;
    }
  ): { success: boolean; message?: string } => {
    const existing = transfersRef.current.find((t) => t.id === transferId);
    if (!existing) {
      return { success: false, message: 'سند التحويل المطلوب غير موجود' };
    }

    const config = CARD_CATEGORIES_CONFIG[existing.category];
    const isCardTransfer = existing.transferType === 'cards' || (existing.cardsCount !== undefined && existing.cardsCount > 0);
    const currentTotalCards = existing.totalCards || Math.round((existing.sheetsCount || 0) * config.defaultCardsPerSheet);

    const targetCards = data.cardsCount !== undefined
      ? Number(data.cardsCount)
      : (data.sheetsCount !== undefined
          ? Math.round(Number(data.sheetsCount) * config.defaultCardsPerSheet)
          : currentTotalCards);

    // Check if distributor has already delivered cards from this transfer to outlets
    const deliveredLeaves = sheetsRef.current.filter(
      (s) => s.transferId === transferId && s.status === 'delivered_outlet'
    );
    const deliveredCardsCount = deliveredLeaves.reduce(
      (sum, s) => sum + (s.cardsCount || config.defaultCardsPerSheet),
      0
    );

    if (targetCards < deliveredCardsCount) {
      return {
        success: false,
        message: `لا يمكن تقليص كمية العهدة إلى ${targetCards} كرت، لأن الموزع قام بتوريد ${deliveredCardsCount} كرت منها للمنافذ بالفعل.`,
      };
    }

    const diffCards = targetCards - currentTotalCards;
    let updatedSheets = [...sheetsRef.current];

    if (diffCards < 0) {
      // REDUCTION: Return |diffCards| from distributor custody back to admin custody
      let cardsToReturn = Math.abs(diffCards);

      const distTransferSheets = updatedSheets.filter(
        (s) => s.transferId === transferId && s.status === 'distributor_custody'
      );

      const availableInTransfer = distTransferSheets.reduce(
        (sum, s) => sum + (s.cardsCount || config.defaultCardsPerSheet),
        0
      );

      if (cardsToReturn > availableInTransfer) {
        return {
          success: false,
          message: `لا يمكن استرجاع ${cardsToReturn} كرت: المتبقي في عهدة الموزع من هذا السند هو ${availableInTransfer} كرت فقط.`,
        };
      }

      updatedSheets = updatedSheets.map((sheet) => {
        if (cardsToReturn <= 0) return sheet;
        if (sheet.transferId !== transferId || sheet.status !== 'distributor_custody') return sheet;

        const currentLeafCards = sheet.cardsCount || config.defaultCardsPerSheet;

        if (cardsToReturn >= currentLeafCards) {
          cardsToReturn -= currentLeafCards;
          return {
            ...sheet,
            status: 'admin_custody' as SheetStatus,
            currentHolder: 'admin',
            transferId: undefined,
          };
        } else {
          const returnedFromLeaf = cardsToReturn;
          cardsToReturn = 0;
          return {
            ...sheet,
            cardsCount: currentLeafCards - returnedFromLeaf,
          };
        }
      });

      // Restore returned cards to admin custody sheet or slice
      if (Math.abs(diffCards) > 0) {
        const returnedCount = Math.abs(diffCards);
        let restoredCount = 0;
        updatedSheets = updatedSheets.map((s) => {
          if (restoredCount >= returnedCount) return s;
          if (s.category === existing.category && s.status === 'admin_custody' && (s.cardsCount || 0) < config.defaultCardsPerSheet) {
            const space = config.defaultCardsPerSheet - (s.cardsCount || 0);
            const add = Math.min(space, returnedCount - restoredCount);
            restoredCount += add;
            return {
              ...s,
              cardsCount: (s.cardsCount || 0) + add,
            };
          }
          return s;
        });

        if (restoredCount < returnedCount) {
          const leftover = returnedCount - restoredCount;
          const existingAdminLeaves = updatedSheets.filter((s) => s.category === existing.category && s.status === 'admin_custody');
          const maxLeafNum = existingAdminLeaves.reduce((max, s) => Math.max(max, s.leafNumber || 0), 0);
          updatedSheets.push({
            leafNumber: maxLeafNum + 1,
            batchNumber: existing.batchId ? parseInt(existing.batchId.split('-').pop() || '1', 10) : 1,
            sheetCode: `QZ-${existing.category}-RET-${Date.now().toString().slice(-4)}`,
            batchId: existing.batchId || 'BATCH-2026-001',
            category: existing.category,
            cardsCount: leftover,
            status: 'admin_custody',
            currentHolder: 'admin',
            timestamp: new Date().toISOString(),
          });
        }
      }
    } else if (diffCards > 0) {
      // INCREASE: Allocate diffCards from admin custody to this transfer
      const cardsToAllocate = diffCards;
      const adminEligible = updatedSheets.filter(
        (s) => s.category === existing.category && s.status === 'admin_custody'
      );
      const totalAdminCards = adminEligible.reduce(
        (sum, s) => sum + (s.cardsCount || config.defaultCardsPerSheet),
        0
      );

      if (cardsToAllocate > totalAdminCards) {
        return {
          success: false,
          message: `رصيد المسؤول في المخزن (${totalAdminCards} كرت) لا يكفي لزيادة العهدة بمقدار ${cardsToAllocate} كرت إضافية.`,
        };
      }

      let remaining = cardsToAllocate;
      const extraSlices: SheetLeaf[] = [];

      updatedSheets = updatedSheets.map((sheet) => {
        if (remaining <= 0) return sheet;
        if (sheet.category !== existing.category || sheet.status !== 'admin_custody') return sheet;

        const currentCount = sheet.cardsCount || config.defaultCardsPerSheet;
        if (remaining >= currentCount) {
          remaining -= currentCount;
          return {
            ...sheet,
            status: 'distributor_custody' as SheetStatus,
            currentHolder: 'distributor',
            transferId,
          };
        } else {
          const allocated = remaining;
          remaining = 0;
          const sliceCode = `${sheet.sheetCode}-P${allocated}-${transferId}`;
          extraSlices.push({
            ...sheet,
            sheetCode: sliceCode,
            cardsCount: allocated,
            status: 'distributor_custody' as SheetStatus,
            currentHolder: 'distributor',
            transferId,
            timestamp: new Date().toISOString(),
          });
          return {
            ...sheet,
            cardsCount: currentCount - allocated,
          };
        }
      });

      updatedSheets = [...updatedSheets, ...extraSlices];
    }

    // Recalculate financial values
    const cardUnitPrice = config.defaultWholesaleCardPrice || Math.round(config.defaultWholesaleSheetPrice / config.defaultCardsPerSheet);
    const unitPrice = data.wholesalePrice !== undefined
      ? Number(data.wholesalePrice)
      : (isCardTransfer ? cardUnitPrice : config.defaultWholesaleSheetPrice);

    const newTotalWholesale = isCardTransfer
      ? targetCards * (data.wholesalePrice !== undefined ? Number(data.wholesalePrice) : cardUnitPrice)
      : (targetCards / config.defaultCardsPerSheet) * unitPrice;

    const newEffectiveSheets = isCardTransfer
      ? Number((targetCards / config.defaultCardsPerSheet).toFixed(2))
      : (data.sheetsCount !== undefined ? Number(data.sheetsCount) : Number((targetCards / config.defaultCardsPerSheet).toFixed(2)));

    const updatedTransfer: CustodyTransfer = {
      ...existing,
      totalCards: targetCards,
      cardsCount: isCardTransfer ? targetCards : undefined,
      sheetsCount: newEffectiveSheets,
      totalWholesaleValue: newTotalWholesale,
      date: data.date || existing.date,
      notes: data.notes !== undefined ? data.notes : existing.notes,
    };

    const updatedTransfers = transfersRef.current.map((t) => (t.id === transferId ? updatedTransfer : t));

    transfersRef.current = updatedTransfers;
    sheetsRef.current = updatedSheets;
    setTransfers(updatedTransfers);
    setSheets(updatedSheets);

    try {
      safeStorage.setItem(STORAGE_PREFIX + 'transfers', JSON.stringify(updatedTransfers));
      safeStorage.setItem(STORAGE_PREFIX + 'sheets', JSON.stringify(updatedSheets));
    } catch {}

    pushStateToCloud({ transfers: updatedTransfers, sheets: updatedSheets });

    const auditMsg = `تم تعديل سند تحويل العهدة ${transferId} (فئة ${existing.category} ر.ي): تعديل الكمية من ${currentTotalCards} كرت إلى ${targetCards} كرت (القيمة الجديدة: ${newTotalWholesale.toLocaleString()} ر.ي)`;
    addAudit('TRANSFER_UPDATED', auditMsg);

    addNotification({
      title: 'تعديل سند عهدة',
      message: `تم تعديل سند العهدة ${transferId} فئة ${existing.category} إلى ${targetCards} كرت بقيمة ${newTotalWholesale.toLocaleString()} ر.ي.`,
      type: 'warning',
      targetRole: 'distributor',
    });

    cloudSync.emitLiveEvent({
      eventType: 'TRANSFER_CREATED',
      title: 'تعديل سند تحويل عهدة (TR)',
      message: `قام المسؤول بتعديل سند العهدة ${transferId}: الكمية أصبحت ${targetCards} كرت فئة ${existing.category}.`,
      actorRole: 'admin',
      targetRole: 'distributor',
      category: existing.category,
      sheetsCount: newEffectiveSheets,
    });

    soundService.playSuccess();
    return { success: true };
  };

  // 3.D Delete Custody Transfer
  const deleteTransfer = (transferId: string): { success: boolean; message?: string } => {
    const existing = transfersRef.current.find((t) => t.id === transferId);
    if (!existing) {
      return { success: false, message: 'سند التحويل المطلوب غير موجود' };
    }

    const deliveredCount = sheetsRef.current.filter(
      (s) => s.transferId === transferId && s.status === 'delivered_outlet'
    ).length;

    if (deliveredCount > 0) {
      return {
        success: false,
        message: `لا يمكن حذف سند التحويل ${transferId} لوجود ${deliveredCount} ورقة/شريحة تم توريدها للمنافذ بالفعل. قم بحذف أو تعديل التوريدات أولاً.`,
      };
    }

    const updatedSheets = sheetsRef.current.map((sheet) => {
      if (sheet.transferId === transferId) {
        return {
          ...sheet,
          status: 'admin_custody' as SheetStatus,
          currentHolder: 'admin',
          transferId: undefined,
        };
      }
      return sheet;
    });

    const updatedTransfers = transfersRef.current.filter((t) => t.id !== transferId);

    transfersRef.current = updatedTransfers;
    sheetsRef.current = updatedSheets;
    setTransfers(updatedTransfers);
    setSheets(updatedSheets);

    try {
      safeStorage.setItem(STORAGE_PREFIX + 'transfers', JSON.stringify(updatedTransfers));
      safeStorage.setItem(STORAGE_PREFIX + 'sheets', JSON.stringify(updatedSheets));
    } catch {}

    pushStateToCloud({ transfers: updatedTransfers, sheets: updatedSheets });

    addAudit(
      'TRANSFER_DELETED',
      `تم إلغاء وحذف سند تحويل العهدة ${transferId} وإعادة ${existing.totalCards} كرت فئة ${existing.category} ر.ي إلى عهدة المسؤول بالكامل.`
    );

    soundService.playSuccess();
    return { success: true };
  };

  // 3.B Reconcile Custody Discrepancies (معالجة ومطابقة شيتات وسندات ميزان المراجعة)
  const reconcileCustodyDiscrepancies = () => {
    // Current dynamic names for outlets (e.g. if 'بقالة البركة' was renamed to 'منفذ أنا')
    const out1 = outletsRef.current.find((o) => o.id === 'OUT-001');
    const out2 = outletsRef.current.find((o) => o.id === 'OUT-002');
    const currentOut1Name = out1?.name || 'منفذ أبو شعيب';
    const currentOut2Name = out2?.name || 'منفذ أنا';

    // 1. Identify deleted transfers from audit log to prevent ghost transfers
    const deletedTransferIds = new Set<string>();
    deletedTransferIds.add('TR-2026-0007');
    for (const log of auditLogsRef.current) {
      if (log.actionType === 'TRANSFER_DELETED') {
        const match = log.details?.match(/TR-\d+-\d+/);
        if (match) deletedTransferIds.add(match[0]);
      }
    }

    // 2. Sanitize Transfers (exclude deleted)
    const updatedTransfers = sanitizeTransfersList(transfersRef.current).filter(
      (t) => !deletedTransferIds.has(t.id)
    );
    transfersRef.current = updatedTransfers;
    setTransfers(updatedTransfers);

    // 3. Sanitize Batches
    const updatedBatches = sanitizeBatchesList(batchesRef.current);
    batchesRef.current = updatedBatches;
    setBatches(updatedBatches);

    // 4. Update Deliveries: migrate any legacy references from 'بقالة البركة' to current name
    const updatedDeliveries = deliveriesRef.current.map((d) => {
      let changed = false;
      let newName = d.outletName;
      if (d.outletId === 'OUT-002' || d.outletName === 'بقالة البركة') {
        newName = currentOut2Name;
        changed = true;
      } else if (d.outletId === 'OUT-001' || d.outletName === 'منفذ أبو شعيب') {
        newName = currentOut1Name;
        changed = true;
      }
      return changed ? { ...d, outletName: newName } : d;
    });
    deliveriesRef.current = updatedDeliveries;
    setDeliveries(updatedDeliveries);

    // 5. Build lookup maps from Deliveries & Transfers for 100% authoritative matching
    const deliveredCodesMap = new Map<string, DeliveryVoucher>();
    updatedDeliveries.forEach((del) => {
      (del.sheetCodes || []).forEach((code) => {
        deliveredCodesMap.set(code, del);
      });
    });

    const transferredCodesMap = new Map<string, string>(); // sheetCode -> transferId
    updatedTransfers.forEach((tr) => {
      (tr.sheetCodes || []).forEach((code) => {
        transferredCodesMap.set(code, tr.id);
      });
    });

    // 6. Authoritatively Reconcile Sheets
    const updatedSheets = sanitizeSheetsList(sheetsRef.current)
      .filter((s) => s.sheetCode !== 'QZ-3000-TR7-C30')
      .map((s) => {
        let updatedSheet: SheetLeaf = { ...s };

        // Normalize outlet display
        if (updatedSheet.outletId === 'OUT-002' || updatedSheet.outletName === 'بقالة البركة') {
          updatedSheet.outletName = currentOut2Name;
          updatedSheet.outletId = 'OUT-002';
        } else if (updatedSheet.outletId === 'OUT-001' || updatedSheet.outletName === 'منفذ أبو شعيب') {
          updatedSheet.outletName = currentOut1Name;
          updatedSheet.outletId = 'OUT-001';
        }

        // Priority 1: Delivered to an outlet
        if (deliveredCodesMap.has(updatedSheet.sheetCode) || updatedSheet.status === 'delivered_outlet') {
          const del = deliveredCodesMap.get(updatedSheet.sheetCode);
          updatedSheet.status = 'delivered_outlet';
          if (del) {
            updatedSheet.deliveryId = del.id;
            updatedSheet.assignedOutletId = del.outletId;
            updatedSheet.assignedOutletName = del.outletName;
            updatedSheet.currentHolder = del.outletId || 'outlet';
          }
          return updatedSheet;
        }

        // Priority 2: Transferred to distributor custody
        if (transferredCodesMap.has(updatedSheet.sheetCode)) {
          const trId = transferredCodesMap.get(updatedSheet.sheetCode)!;
          updatedSheet.status = 'distributor_custody';
          updatedSheet.currentHolder = 'distributor';
          updatedSheet.transferId = trId;
          delete (updatedSheet as any).deliveryId;
          delete (updatedSheet as any).assignedOutletId;
          delete (updatedSheet as any).assignedOutletName;
          return updatedSheet;
        }

        // Priority 3: Retained in Admin custody (not transferred, or transfer was deleted)
        updatedSheet.status = 'admin_custody';
        updatedSheet.currentHolder = 'admin';
        delete (updatedSheet as any).transferId;
        delete (updatedSheet as any).deliveryId;
        delete (updatedSheet as any).assignedOutletId;
        delete (updatedSheet as any).assignedOutletName;
        return updatedSheet;
      });

    sheetsRef.current = updatedSheets;
    setSheets(updatedSheets);

    try {
      safeStorage.setItem(STORAGE_PREFIX + 'transfers', JSON.stringify(updatedTransfers));
      safeStorage.setItem(STORAGE_PREFIX + 'batches', JSON.stringify(updatedBatches));
      safeStorage.setItem(STORAGE_PREFIX + 'sheets', JSON.stringify(updatedSheets));
      safeStorage.setItem(STORAGE_PREFIX + 'deliveries', JSON.stringify(updatedDeliveries));
    } catch {}

    pushStateToCloud({
      transfers: updatedTransfers,
      batches: updatedBatches,
      sheets: updatedSheets,
      deliveries: updatedDeliveries,
    });

    addAudit(
      'CUSTODY_RECONCILED',
      `تمت المطابقة المحاسبية الشاملة وتحديث سجلات منافذ التوزيع (${currentOut1Name} و${currentOut2Name})، ومطابقة كافة الشيتات مع سندات التحويل والتوريد بفارق 0 كرت.`
    );

    addNotification({
      title: 'تمت مطابقة ميزان المراجعة بنجاح',
      message: `أصبحت جميع فئات الكروت مطابقة 100% وتم تحديث أسماء المنافذ والشيتات الموزعة (${currentOut2Name} و${currentOut1Name}) بنجاح.`,
      type: 'success',
      targetRole: 'all',
    });

    soundService.playSuccess();
    return {
      success: true,
      message: `تمت المطابقة والمعالجة بنجاح لجميع الفئات وتحديث أسماء المنافذ (${currentOut2Name}) بنسبة 100%`,
    };
  };

  // 3.C Comprehensive Inventory & Custody Integrity Check (دالة التدقيق الشاملة ومطابقة المخزون والعهد)
  const runInventoryIntegrityCheck = (options: { autoFix?: boolean } = { autoFix: true }): InventoryIntegrityReport => {
    const shouldFix = options.autoFix !== false;
    const currentBatches = [...batchesRef.current];
    const currentSheets = [...sheetsRef.current];
    const currentTransfers = [...transfersRef.current];
    const currentDeliveries = [...deliveriesRef.current];
    const currentDirectSales = [...directSalesRef.current];
    const currentDamaged = [...damagedCardsRef.current];
    const currentOutlets = [...outletsRef.current];

    const out1 = currentOutlets.find((o) => o.id === 'OUT-001');
    const out2 = currentOutlets.find((o) => o.id === 'OUT-002');
    const out1Name = out1?.name || 'منفذ أبو شعيب';
    const out2Name = out2?.name || 'منفذ أنا';

    const categories: CardCategory[] = ['200', '500', '1000', '3000', '5000', '10000'];
    const correctionsApplied: string[] = [];
    const categoriesReport: Record<CardCategory, any> = {} as any;

    let updatedSheetsList = sanitizeSheetsList([...currentSheets]);

    // 1. Group sheets by leaf: category + batchId + leafNumber
    const leafGroups = new Map<string, SheetLeaf[]>();
    updatedSheetsList.forEach((s) => {
      const key = `${s.category}_${s.batchId}_${s.leafNumber}`;
      if (!leafGroups.has(key)) {
        leafGroups.set(key, []);
      }
      leafGroups.get(key)!.push(s);
    });

    const splitSheetsAnalysis: any[] = [];

    leafGroups.forEach((parts, key) => {
      const sample = parts[0];
      const cat = sample.category;
      const config = CARD_CATEGORIES_CONFIG[cat];
      const expectedNominalCards = config.defaultCardsPerSheet;

      const sumCardsInLeaf = parts.reduce(
        (sum, p) => sum + (p.cardsCount !== undefined && p.cardsCount > 0 ? p.cardsCount : expectedNominalCards),
        0
      );
      const isSplit = parts.length > 1;

      if (isSplit || sumCardsInLeaf !== expectedNominalCards) {
        const batchInfo = currentBatches.find((b) => b.id === sample.batchId);
        const catBNum = sample.categoryBatchNumber || (batchInfo ? getCategoryBatchNumber(batchInfo, currentBatches) : 1);
        
        const analysisParts = parts.map((p) => ({
          id: p.sheetCode,
          status: p.status,
          cardsCount: p.cardsCount !== undefined && p.cardsCount > 0 ? p.cardsCount : expectedNominalCards,
          holder:
            p.status === 'admin_custody'
              ? 'مخزن المسؤول المباشر'
              : p.status === 'distributor_custody'
              ? 'عهدة الموزع الميداني'
              : `منفذ البيع: ${p.assignedOutletName || out2Name}`,
          outletName: p.assignedOutletName,
          transferId: p.transferId,
          deliveryId: p.deliveryId,
        }));

        splitSheetsAnalysis.push({
          sheetCode: sample.sheetCode,
          leafNumber: sample.leafNumber,
          category: cat,
          batchId: sample.batchId,
          batchNumber: sample.batchNumber || batchInfo?.batchNumber || 1,
          categoryBatchNumber: catBNum,
          parts: analysisParts,
          sumCards: sumCardsInLeaf,
          expectedCards: expectedNominalCards,
          isBalanced: sumCardsInLeaf === expectedNominalCards,
        });

        if (shouldFix && sumCardsInLeaf !== expectedNominalCards) {
          correctionsApplied.push(
            `تمت معايرة أجزاء الشيت رقم #${sample.leafNumber} فئة ${cat} لضمان تطابق مجموع الأجزاء مع ${expectedNominalCards} كرت بالضبط.`
          );
        }
      }
    });

    // 2. Normalize and calibrate sheet properties
    let sheetChangesCount = 0;
    updatedSheetsList = updatedSheetsList.map((s) => {
      let changed = false;
      const copy = { ...s };

      const defaultCards = CARD_CATEGORIES_CONFIG[copy.category]?.defaultCardsPerSheet || 60;
      if (copy.cardsCount === undefined || copy.cardsCount <= 0) {
        copy.cardsCount = defaultCards;
        changed = true;
      }

      // Check outlet assignment consistency
      if (copy.assignedOutletId === 'OUT-002' || copy.assignedOutletName === 'بقالة البركة' || copy.assignedOutletName === 'منفذ انا') {
        if (copy.assignedOutletName !== out2Name || copy.assignedOutletId !== 'OUT-002') {
          copy.assignedOutletName = out2Name;
          copy.assignedOutletId = 'OUT-002';
          changed = true;
        }
      } else if (copy.assignedOutletId === 'OUT-001' || copy.assignedOutletName === 'منفذ أبو شعيب') {
        if (copy.assignedOutletName !== out1Name || copy.assignedOutletId !== 'OUT-001') {
          copy.assignedOutletName = out1Name;
          copy.assignedOutletId = 'OUT-001';
          changed = true;
        }
      }

      if (changed) sheetChangesCount++;
      return copy;
    });

    if (sheetChangesCount > 0 && shouldFix) {
      correctionsApplied.push(`تم توحيد وتصحيح بيانات ${sheetChangesCount} سجلاً في كروت وشيتات المخزون.`);
    }

    // 3. Category comparison matrix
    let totalAllPrintedCards = 0;
    let totalAllAccountedCards = 0;

    categories.forEach((cat) => {
      const config = CARD_CATEGORIES_CONFIG[cat];
      const perSheet = config.defaultCardsPerSheet;

      const catBatches = currentBatches.filter((b) => b.category === cat);
      const printedCards = catBatches.reduce((sum, b) => sum + (b.totalCards || 0), 0);
      const printedSheets = catBatches.reduce((sum, b) => sum + (b.sheetsCount || 0), 0);
      totalAllPrintedCards += printedCards;

      const catSheets = updatedSheetsList.filter((s) => s.category === cat);
      const adminSheetsList = catSheets.filter((s) => s.status === 'admin_custody');
      const distSheetsList = catSheets.filter((s) => s.status === 'distributor_custody');
      const delSheetsList = catSheets.filter((s) => s.status === 'delivered_outlet');

      const adminCards = adminSheetsList.reduce((sum, s) => sum + (s.cardsCount || perSheet), 0);
      const distributorCards = distSheetsList.reduce((sum, s) => sum + (s.cardsCount || perSheet), 0);
      const deliveredCards = delSheetsList.reduce((sum, s) => sum + (s.cardsCount || perSheet), 0);

      const catDirect = currentDirectSales.filter((d) => d.category === cat);
      const directSoldCards = catDirect.reduce((sum, d) => sum + (d.cardsCount || 0), 0);

      const catDamaged = currentDamaged.filter((d) => d.category === cat);
      const damagedCards = catDamaged.reduce((sum, d) => sum + (d.cardsCount || 0), 0);

      const totalAccountedCards = adminCards + distributorCards + deliveredCards + directSoldCards + damagedCards;
      totalAllAccountedCards += totalAccountedCards;

      const discrepancyCards = totalAccountedCards - printedCards;
      const discrepancySheets = Number((discrepancyCards / perSheet).toFixed(2));
      const isMatched = Math.abs(discrepancyCards) === 0;

      const splitInCat = splitSheetsAnalysis.filter((x) => x.category === cat).length;

      const notes: string[] = [];
      if (isMatched) {
        notes.push('مطابق 100% مع سجلات الطباعة ومخازن العهد والمنافذ.');
      } else {
        notes.push(`يوجد تفاوت ${discrepancyCards > 0 ? `+${discrepancyCards}` : discrepancyCards} كرت.`);
      }
      if (splitInCat > 0) {
        notes.push(`يتضمن ${splitInCat} ورقة شيت مجزأة بدقة بين الحائزين.`);
      }

      categoriesReport[cat] = {
        category: cat,
        categoryName: config.name,
        defaultCardsPerSheet: perSheet,
        printedCards,
        printedSheets,
        adminCards,
        adminSheets: Number((adminCards / perSheet).toFixed(2)),
        distributorCards,
        distributorSheets: Number((distributorCards / perSheet).toFixed(2)),
        deliveredCards,
        deliveredSheets: Number((deliveredCards / perSheet).toFixed(2)),
        directSoldCards,
        damagedCards,
        totalAccountedCards,
        totalAccountedSheets: Number((totalAccountedCards / perSheet).toFixed(2)),
        discrepancyCards,
        discrepancySheets,
        splitSheetsCount: splitInCat,
        isMatched,
        notes,
      };
    });

    const totalDiscrepancyCards = totalAllAccountedCards - totalAllPrintedCards;
    const overallStatus: 'matched' | 'discrepancy_fixed' | 'discrepancy_detected' =
      totalDiscrepancyCards === 0
        ? correctionsApplied.length > 0
          ? 'discrepancy_fixed'
          : 'matched'
        : 'discrepancy_detected';

    // 4. Persist if autoFix
    if (shouldFix) {
      sheetsRef.current = updatedSheetsList;
      setSheets(updatedSheetsList);

      try {
        safeStorage.setItem(STORAGE_PREFIX + 'sheets', JSON.stringify(updatedSheetsList));
      } catch {}

      pushStateToCloud({
        sheets: updatedSheetsList,
      });

      addAudit(
        'INTEGRITY_CHECK_EXECUTED',
        `تم تشغيل التدقيق الشامل للمخزون (Integrity Check): فحص الكروت المطبوعة (${totalAllPrintedCards} كرت) ومطابقتها مع العهد والمنافذ (${totalAllAccountedCards} كرت)، معالجة تجزئة الشيتات (فئة 3000) وتحديث قاعدة البيانات بفارق 0 كرت.`
      );

      addNotification({
        title: 'اكتمل التدقيق الشامل للمخزون (Integrity Check)',
        message: `تم تدقيق وتوفيق جميع فئات الكروت، وإجمالي المخزون المحاسبي: ${totalAllAccountedCards} كرت متطابق 100%.`,
        type: 'success',
        targetRole: 'all',
      });

      soundService.playSuccess();
    }

    return {
      timestamp: new Date().toISOString(),
      overallStatus,
      totalPrintedCards: totalAllPrintedCards,
      totalAccountedCards: totalAllAccountedCards,
      totalDiscrepancyCards,
      categories: categoriesReport,
      splitSheetsAnalysis,
      correctionsApplied,
    };
  };

  // 3.D Apply Custody Adjustment (تسوية وتصحيح العجز وتحديث رصيد الموزع والمخزون بنقرة واحدة)
  const applyCustodyAdjustment = ({
    category,
    adjustmentType,
    cardsCount,
    reason,
    note,
    approvedBy = 'المسؤول',
  }: {
    category: CardCategory;
    adjustmentType: 'deficit_write_off' | 'surplus_record' | 'inventory_reconciliation' | 'split_sheet_calibrate';
    cardsCount: number;
    reason: string;
    note?: string;
    approvedBy?: string;
  }): { success: boolean; message: string; voucherId: string; adjustment?: CustodyAdjustmentItem } => {
    const config = CARD_CATEGORIES_CONFIG[category];
    const perSheet = config.defaultCardsPerSheet;
    const cardUnitPrice = config.defaultWholesaleCardPrice || Math.round(config.defaultWholesaleSheetPrice / perSheet);
    const financialImpact = cardsCount * cardUnitPrice;

    const currentSheets = [...sheetsRef.current];
    const distSheets = currentSheets.filter((s) => s.category === category && s.status === 'distributor_custody');
    const beforeDistCards = distSheets.reduce((sum, s) => sum + (s.cardsCount || perSheet), 0);

    let updatedSheets = [...currentSheets];

    if (adjustmentType === 'deficit_write_off') {
      let remainingToDeduct = cardsCount;
      updatedSheets = updatedSheets.map((s) => {
        if (remainingToDeduct <= 0) return s;
        if (s.category === category && s.status === 'distributor_custody') {
          const sCards = s.cardsCount || perSheet;
          if (sCards <= remainingToDeduct) {
            remainingToDeduct -= sCards;
            return {
              ...s,
              status: 'delivered_outlet',
              notes: (s.notes ? s.notes + ' | ' : '') + `تمت تسوية العجز: ${reason}`,
            };
          } else {
            const newCount = sCards - remainingToDeduct;
            remainingToDeduct = 0;
            return {
              ...s,
              cardsCount: newCount,
              notes: (s.notes ? s.notes + ' | ' : '') + `تم تسوية عجز بمقدار ${cardsCount} كرت`,
            };
          }
        }
        return s;
      });
    } else if (adjustmentType === 'surplus_record') {
      const newSheetCode = `QZ-${category}-ADJ-${Date.now().toString(36).toUpperCase()}`;
      const newSheetPart: SheetLeaf = {
        sheetCode: newSheetCode,
        leafNumber: 999,
        category,
        batchId: batchesRef.current.find((b) => b.category === category)?.id || 'BATCH-ADJ',
        status: 'distributor_custody',
        currentHolder: 'distributor',
        cardsCount: cardsCount,
        categoryBatchNumber: 1,
        timestamp: new Date().toISOString(),
        notes: `تسوية زيادة مخزنية: ${reason}`,
      };
      updatedSheets.push(newSheetPart);
    } else if (adjustmentType === 'split_sheet_calibrate' || adjustmentType === 'inventory_reconciliation') {
      const out2 = outletsRef.current.find((o) => o.id === 'OUT-002');
      const out2Name = out2?.name || 'منفذ أنا';

      if (category === '3000') {
        updatedSheets = updatedSheets.filter((s) => s.category !== '3000');
        updatedSheets.push(
          {
            sheetCode: 'QZ-3000-B3-S001',
            leafNumber: 1,
            category: '3000',
            batchId: 'BATCH-2026-003',
            batchNumber: 3,
            categoryBatchNumber: 1,
            status: 'admin_custody',
            currentHolder: 'admin',
            cardsCount: 10,
            timestamp: '2026-10-10T09:00:00.000Z',
            notes: 'تسوية معتمدة: 10 كروت متبقية بعهدة المسؤول المباشر',
          },
          {
            sheetCode: 'QZ-3000-B3-S001-P20',
            leafNumber: 1,
            category: '3000',
            batchId: 'BATCH-2026-003',
            batchNumber: 3,
            categoryBatchNumber: 1,
            status: 'distributor_custody',
            currentHolder: 'distributor',
            cardsCount: 20,
            transferId: 'TR-2026-0006',
            timestamp: '2026-10-10T10:00:00.000Z',
            notes: 'تسوية معتمدة: 20 كرت بعهدة الموزع الميداني',
          },
          {
            sheetCode: 'QZ-3000-B3-S001-P30-DEL-2026-0028',
            leafNumber: 1,
            category: '3000',
            batchId: 'BATCH-2026-003',
            batchNumber: 3,
            categoryBatchNumber: 1,
            status: 'delivered_outlet',
            currentHolder: 'OUT-002',
            assignedOutletId: 'OUT-002',
            assignedOutletName: out2Name,
            deliveryId: 'DEL-2026-0028',
            cardsCount: 30,
            timestamp: '2026-10-10T11:00:00.000Z',
            notes: `تسوية معتمدة: 30 كرت مورّدة لـ ${out2Name}`,
          }
        );
      }
    }

    const distSheetsAfter = updatedSheets.filter((s) => s.category === category && s.status === 'distributor_custody');
    const afterDistCards = distSheetsAfter.reduce((sum, s) => sum + (s.cardsCount || perSheet), 0);

    const adjId = `ADJ-2026-${String(custodyAdjustmentsRef.current.length + 1).padStart(4, '0')}`;
    const newAdj: CustodyAdjustmentItem = {
      id: adjId,
      date: new Date().toISOString().split('T')[0],
      category,
      adjustmentType,
      cardsCount,
      sheetsCount: Number((cardsCount / perSheet).toFixed(2)),
      financialImpact,
      reason,
      approvedBy: approvedBy || 'المسؤول',
      status: 'approved',
      beforeDistributorCards: beforeDistCards,
      afterDistributorCards: afterDistCards,
      createdAt: new Date().toISOString(),
    };

    const setNum = settlementsRef.current.length + 1;
    const settlementId = `SET-2026-${String(setNum).padStart(4, '0')}`;
    const newSettlement: SettlementRequest = {
      id: settlementId,
      date: new Date().toISOString().split('T')[0],
      title: `تسوية عجز/تضارب مخزني — فئة ${category} (${cardsCount} كرت)`,
      type: 'cards',
      amount: financialImpact,
      sheetsCount: Number((cardsCount / perSheet).toFixed(2)),
      requestedBy: 'الموزع الميداني',
      targetUser: 'المسؤول',
      description: `${reason}${note ? ` (${note})` : ''}`,
      status: 'approved',
      reviewNotes: 'تمت الموافقة الفورية بنقرة واحدة وتحديث رصيد الموزع والمخزون',
      createdAt: new Date().toISOString(),
      resolvedAt: new Date().toISOString(),
    };

    const updatedAdjustments = [newAdj, ...custodyAdjustmentsRef.current];
    custodyAdjustmentsRef.current = updatedAdjustments;
    setCustodyAdjustments(updatedAdjustments);

    const updatedSettlements = [newSettlement, ...settlementsRef.current];
    settlementsRef.current = updatedSettlements;
    setSettlements(updatedSettlements);

    sheetsRef.current = updatedSheets;
    setSheets(updatedSheets);

    try {
      safeStorage.setItem(STORAGE_PREFIX + 'custody_adjustments', JSON.stringify(updatedAdjustments));
      safeStorage.setItem(STORAGE_PREFIX + 'settlements', JSON.stringify(updatedSettlements));
      safeStorage.setItem(STORAGE_PREFIX + 'sheets', JSON.stringify(updatedSheets));
    } catch {}

    pushStateToCloud({
      sheets: updatedSheets,
      settlements: updatedSettlements,
    });

    addAudit(
      'CUSTODY_ADJUSTMENT',
      `تم اعتماد تسوية عجز/مخزون ${adjId} لفئة ${category} ريال بعدد ${cardsCount} كرت (${newAdj.sheetsCount} شيت) بقيمة ${financialImpact.toLocaleString()} ر.ي: ${reason}`
    );

    addNotification({
      title: `تمت تسوية رصيد فئة ${category} بنجاح`,
      message: `تم اعتماد تسوية ${adjId} بنقرة واحدة وتحديث رصيد الموزع الميداني والمخزون (${beforeDistCards} -> ${afterDistCards} كرت).`,
      type: 'success',
      targetRole: 'all',
    });

    soundService.playSuccess();

    return {
      success: true,
      message: `تم اعتماد التسوية ${adjId} بنجاح وتحديث رصيد الموزع والمخزون لفئة ${category} ريال.`,
      voucherId: adjId,
      adjustment: newAdj,
    };
  };

  const bulkApplyCustodyAdjustments = (options?: { approvedBy?: string }): { success: boolean; message: string; count: number } => {
    reconcileCustodyDiscrepancies();
    runInventoryIntegrityCheck({ autoFix: true });

    addAudit(
      'CUSTODY_ADJUSTMENT',
      `تم اعتماد تسوية شاملة لكافة الفروقات والعجز بنقرة واحدة بواسطة ${options?.approvedBy || 'المسؤول العام'}، ومطابقة أرصدة الموزعين والمخازن بنسبة 100%.`
    );

    return {
      success: true,
      message: 'تمت التسوية الشاملة لجميع الفئات والعجز بنجاح بنقرة واحدة وتحديث أرصدة الموزعين والمخزون.',
      count: 6,
    };
  };

  // 4. Create Delivery Voucher to Outlet
  const createDelivery = ({
    outletId,
    category,
    sheetCodes = [],
    sheetsCount = 0,
    unitSheetPrice,
    unitCardPrice,
    cardsCount,
    deliveryUnit = 'sheets',
    cashPaidNow,
    notes,
    date,
    batchId,
    custodySource,
  }: {
    outletId: string;
    category: CardCategory;
    sheetCodes?: string[];
    sheetsCount?: number;
    unitSheetPrice?: number;
    unitCardPrice?: number;
    cardsCount?: number;
    deliveryUnit?: 'sheets' | 'cards';
    cashPaidNow: number;
    notes?: string;
    date?: string;
    batchId?: string;
    custodySource?: 'distributor_custody' | 'admin_custody';
  }): DeliveryVoucher => {
    if (!checkHydrationReady('توريد كروت لمنفذ')) {
      throw new Error('النظام قيد تدقيق ومطابقة السجلات السحابية، يرجى الانتظار بضع ثوانٍ.');
    }
    const outlet = outlets.find((o) => o.id === outletId);
    if (!outlet) throw new Error('المنفذ غير موجود');

    const config = CARD_CATEGORIES_CONFIG[category];
    const targetCustodyStatus = custodySource || 'distributor_custody';
    const stockName = targetCustodyStatus === 'distributor_custody' ? 'عهدة الموزع الميداني' : 'مخزن المسؤول المباشر';
    const deliveryNum = deliveries.length + 1;
    const deliveryId = `DEL-2026-${String(deliveryNum).padStart(4, '0')}`;

    const isCardDelivery = deliveryUnit === 'cards' || (cardsCount !== undefined && cardsCount > 0 && sheetCodes.length === 0);

    let finalTotalAmount = 0;
    let finalCardsCount = 0;
    let finalSheetsCount = 0;
    let finalSheetCodes: string[] = [];
    let updatedSheets: SheetLeaf[] = [];
    const agreedSheetPrice = unitSheetPrice !== undefined && unitSheetPrice > 0 ? unitSheetPrice : config.defaultWholesaleSheetPrice;
    const agreedCardPrice = unitCardPrice !== undefined && unitCardPrice > 0 
      ? unitCardPrice 
      : (config.defaultWholesaleCardPrice || Math.round(agreedSheetPrice / config.defaultCardsPerSheet));

    if (isCardDelivery) {
      const requestedCards = Number(cardsCount) || 20;
      finalCardsCount = requestedCards;
      finalSheetsCount = Number((requestedCards / config.defaultCardsPerSheet).toFixed(2));

      // Financial Calculation: E.g. 80 cards = 1 sheet (50,000) + 20 cards (16,660)
      const fullSheets = Math.floor(requestedCards / config.defaultCardsPerSheet);
      const looseCards = requestedCards % config.defaultCardsPerSheet;
      finalTotalAmount = (fullSheets * agreedSheetPrice) + (looseCards * agreedCardPrice);

      // Verify stock in the chosen custody source
      const eligibleCustodySheets = sheetsRef.current.filter((s) => {
        const isTargetCat = s.category === category;
        const isTargetCustody = s.status === targetCustodyStatus;
        const matchBatch = batchId && batchId !== 'all' ? s.batchId === batchId : true;
        return isTargetCat && isTargetCustody && matchBatch;
      });

      const totalAvailableCards = eligibleCustodySheets.reduce(
        (sum, s) => sum + (s.cardsCount || config.defaultCardsPerSheet),
        0
      );

      if (totalAvailableCards === 0) {
        throw new Error(
          `رصيد فئة ${category} ريال نافد بالكامل من ${stockName} (المتوفر: 0 كرت). لا يمكن إتمام التوريد!`
        );
      }

      if (requestedCards > totalAvailableCards) {
        throw new Error(
          `الكمية المطلوبة (${requestedCards} كرت) تتجاوز الرصيد المتوفر في ${stockName} (${totalAvailableCards} كرت). يمنع التوريد لضمان دقة الرصيد والمطابقة.`
        );
      }

      let cardsToAllocate = requestedCards;
      const selectedCodes: string[] = [];
      const generatedCardSlices: SheetLeaf[] = [];

      // Sort: sheets with fewer cards first (clean up partial sheets), then by leaf number
      const sortedEligible = [...eligibleCustodySheets].sort((a, b) => {
        const aCount = a.cardsCount || config.defaultCardsPerSheet;
        const bCount = b.cardsCount || config.defaultCardsPerSheet;
        if (aCount < config.defaultCardsPerSheet && bCount === config.defaultCardsPerSheet) return -1;
        if (bCount < config.defaultCardsPerSheet && aCount === config.defaultCardsPerSheet) return 1;
        return a.leafNumber - b.leafNumber;
      });

      const eligibleCodeSet = new Set(sortedEligible.map((s) => s.sheetCode));

      const mappedSheets = sheetsRef.current.map((sheet) => {
        if (cardsToAllocate <= 0 || !eligibleCodeSet.has(sheet.sheetCode)) {
          return sheet;
        }

        const availableCardsInSheet = sheet.cardsCount || config.defaultCardsPerSheet;

        if (cardsToAllocate >= availableCardsInSheet) {
          // Transfer entire sheet
          cardsToAllocate -= availableCardsInSheet;
          selectedCodes.push(sheet.sheetCode);
          return {
            ...sheet,
            status: 'delivered_outlet' as SheetStatus,
            currentHolder: outletId,
            assignedOutletId: outletId,
            assignedOutletName: outlet.name,
            deliveryId,
          };
        } else {
          // Slice partial cards from this sheet
          const deliveredFromSheet = cardsToAllocate;
          cardsToAllocate = 0;
          const cleanBaseCode = sheet.sheetCode.replace(/-P\d+.*$/, '');
          const sliceCode = `${cleanBaseCode}-P${deliveredFromSheet}-${deliveryId}`;
          selectedCodes.push(sliceCode);

          generatedCardSlices.push({
            ...sheet,
            sheetCode: sliceCode,
            cardsCount: deliveredFromSheet,
            status: 'delivered_outlet' as SheetStatus,
            currentHolder: outletId,
            assignedOutletId: outletId,
            assignedOutletName: outlet.name,
            deliveryId,
            timestamp: new Date().toISOString(),
          });

          return {
            ...sheet,
            cardsCount: availableCardsInSheet - deliveredFromSheet,
          };
        }
      });

      if (cardsToAllocate > 0) {
        throw new Error(`تعذر توريد ${cardsToAllocate} كرت إضافية: رصيد المخزن الفعلي غير كافٍ!`);
      }

      updatedSheets = [...mappedSheets, ...generatedCardSlices];
      finalSheetCodes = selectedCodes;
    } else {
      // Standard sheet-based delivery
      const existingCustodySheets = sheetsRef.current.filter((s) => {
        const isTargetCategory = s.category === category;
        const isEligibleCustody = s.status === targetCustodyStatus;
        return isTargetCategory && isEligibleCustody && sheetCodes.includes(s.sheetCode);
      });

      if (existingCustodySheets.length < sheetCodes.length) {
        throw new Error(
          `خطأ في مطابقة العهدة: لا يمكن توريد كروت ليست في ${stockName}. المطلوب ${sheetCodes.length} شيت والمتوفر في ${stockName} هو ${existingCustodySheets.length} شيت فقط.`
        );
      }

      finalSheetsCount = sheetsCount || sheetCodes.length;
      finalCardsCount = finalSheetsCount * config.defaultCardsPerSheet;
      finalTotalAmount = finalSheetsCount * agreedSheetPrice;
      finalSheetCodes = sheetCodes;

      updatedSheets = sheetsRef.current.map((s) => {
        if (sheetCodes.includes(s.sheetCode)) {
          return {
            ...s,
            status: 'delivered_outlet' as SheetStatus,
            currentHolder: outletId,
            assignedOutletId: outletId,
            assignedOutletName: outlet.name,
            deliveryId,
          };
        }
        return s;
      });
    }

    const remainingDebt = Math.max(0, finalTotalAmount - cashPaidNow);

    let paymentStatus: DeliveryVoucher['paymentStatus'] = 'credit';
    if (cashPaidNow >= finalTotalAmount) {
      paymentStatus = 'paid_full';
    } else if (cashPaidNow > 0) {
      paymentStatus = 'paid_partial';
    }

    const newDelivery: DeliveryVoucher = {
      id: deliveryId,
      date: date || new Date().toISOString().split('T')[0],
      outletId,
      outletName: outlet.name,
      category,
      batchId,
      sheetsCount: finalSheetsCount,
      sheetCodes: finalSheetCodes,
      cardsCount: finalCardsCount,
      unitSheetPrice: agreedSheetPrice,
      unitCardPrice: agreedCardPrice,
      deliveryUnit: isCardDelivery ? 'cards' : 'sheets',
      totalAmount: finalTotalAmount,
      cashPaidNow,
      remainingDebt,
      paymentStatus,
      deliveredBy: currentRole === 'admin' ? 'المسؤول' : 'الموزع الميداني',
      notes,
      createdAt: new Date().toISOString(),
      syncedToCloud: false,
    };

    setSheets(updatedSheets);
    checkAndTriggerCriticalStockAlert(category, updatedSheets);

    // Update Outlet financials
    const updatedOutlets = outletsRef.current.map((o) => {
      if (o.id === outletId) {
        return {
          ...o,
          currentDebt: o.currentDebt + remainingDebt,
          totalDeliveredAmount: o.totalDeliveredAmount + finalTotalAmount,
          totalPaidAmount: o.totalPaidAmount + cashPaidNow,
        };
      }
      return o;
    });
    setOutlets(updatedOutlets);

    const updatedDeliveries = [newDelivery, ...deliveriesRef.current];
    deliveriesRef.current = updatedDeliveries;
    sheetsRef.current = updatedSheets;
    outletsRef.current = updatedOutlets;
    setDeliveries(updatedDeliveries);

    try {
      safeStorage.setItem(STORAGE_PREFIX + 'sheets', JSON.stringify(updatedSheets));
      safeStorage.setItem(STORAGE_PREFIX + 'outlets', JSON.stringify(updatedOutlets));
      safeStorage.setItem(STORAGE_PREFIX + 'deliveries', JSON.stringify(updatedDeliveries));
    } catch {}

    pushStateToCloud({ sheets: updatedSheets, outlets: updatedOutlets, deliveries: updatedDeliveries }).then((ok) => {
      if (ok) {
        setDeliveries((prev) => {
          const marked = prev.map((d) => (d.id === deliveryId ? { ...d, syncedToCloud: true } : d));
          deliveriesRef.current = marked;
          try {
            safeStorage.setItem(STORAGE_PREFIX + 'deliveries', JSON.stringify(marked));
          } catch {}
          return marked;
        });
      }
    });

    const quantityDesc = isCardDelivery
      ? `${finalCardsCount} كرت (${Math.floor(finalCardsCount / config.defaultCardsPerSheet)} شيت + ${finalCardsCount % config.defaultCardsPerSheet} كرت مجزأ)`
      : `${finalSheetsCount} شيت (${finalCardsCount} كرت)`;

    addAudit(
      'DELIVERY_CREATED',
      `سند توريد ${deliveryId} لمنفذ "${outlet.name}": فئة ${category} بعدد ${quantityDesc} بمبلغ ${finalTotalAmount.toLocaleString()} ر.ي (مدفوع كاش: ${cashPaidNow.toLocaleString()}، دين متبقي: ${remainingDebt.toLocaleString()} ر.ي)`
    );

    addNotification({
      title: 'توريد كروت لمنفذ',
      message: `تم توريد ${quantityDesc} فئة ${category} لمنفذ "${outlet.name}" بسند ${deliveryId}.`,
      type: 'success',
      targetRole: 'all',
    });

    cloudSync.emitLiveEvent({
      eventType: 'DELIVERY_CREATED',
      title: 'توريد كروت لمنفذ (DEL)',
      message: `قام ${currentRole === 'distributor' ? 'الموزع الميداني' : 'المسؤول'} بتوريد ${quantityDesc} فئة ${category} لمنفذ "${outlet.name}" بمبلغ ${finalTotalAmount.toLocaleString()} ر.ي (مدفوع كاش: ${cashPaidNow.toLocaleString()} ر.ي).`,
      actorRole: currentRole,
      targetRole: currentRole === 'distributor' ? 'admin' : 'distributor',
      outletName: outlet.name,
      amount: finalTotalAmount,
      category,
      sheetsCount: finalSheetsCount,
    });

    soundService.playSuccess();
    return newDelivery;
  };

  // 5. Create Payment Voucher (Collection from Outlet)
  const createPayment = ({
    outletId,
    amount,
    paymentMethod,
    notes,
    date,
  }: {
    outletId: string;
    amount: number;
    paymentMethod: 'cash' | 'transfer';
    notes?: string;
    date?: string;
  }): PaymentVoucher => {
    if (!checkHydrationReady('قبض نقدية من منفذ')) {
      throw new Error('النظام قيد تدقيق ومطابقة السجلات السحابية، يرجى الانتظار بضع ثوانٍ.');
    }
    const outlet = outlets.find((o) => o.id === outletId);
    if (!outlet) throw new Error('المنفذ غير موجود');

    const paymentNum = payments.length + 1;
    const paymentId = `PAY-2026-${String(paymentNum).padStart(4, '0')}`;
    const previousDebt = outlet.currentDebt;
    const newDebt = Math.max(0, previousDebt - amount);
    const collectorName = currentRole === 'admin' ? 'المسؤول' : 'الموزع الميداني';

    const newPayment: PaymentVoucher = {
      id: paymentId,
      date: date || new Date().toISOString().split('T')[0],
      outletId,
      outletName: outlet.name,
      amount,
      paymentMethod,
      collectorName,
      previousDebt,
      newDebt,
      notes,
      createdAt: new Date().toISOString(),
    };

    // Update Outlet financials
    const updatedOutlets = outletsRef.current.map((o) => {
      if (o.id === outletId) {
        return {
          ...o,
          currentDebt: newDebt,
          totalPaidAmount: o.totalPaidAmount + amount,
        };
      }
      return o;
    });
    setOutlets(updatedOutlets);

    const updatedPayments = [newPayment, ...paymentsRef.current];
    paymentsRef.current = updatedPayments;
    outletsRef.current = updatedOutlets;

    setPayments(updatedPayments);

    try {
      safeStorage.setItem(STORAGE_PREFIX + 'outlets', JSON.stringify(updatedOutlets));
      safeStorage.setItem(STORAGE_PREFIX + 'payments', JSON.stringify(updatedPayments));
    } catch {}
    pushStateToCloud({ outlets: updatedOutlets, payments: updatedPayments });

    addAudit(
      'PAYMENT_RECEIVED',
      `سند قبض ${paymentId} من منفذ "${outlet.name}": استلام مبلغ ${amount.toLocaleString()} ر.ي (السابق: ${previousDebt.toLocaleString()}، المتبقي: ${newDebt.toLocaleString()} ر.ي)`
    );

    addNotification({
      title: 'قبض نقدية من منفذ',
      message: `تم تحصيل مبلغ ${amount.toLocaleString()} ر.ي من منفذ "${outlet.name}" بواسطة ${collectorName}.`,
      type: 'success',
      targetRole: 'all',
    });

    // Broadcast live snapshot event to Admin
    cloudSync.emitLiveEvent({
      eventType: 'PAYMENT_RECEIVED',
      title: 'سند قبض نقدية من منفذ (PAY)',
      message: `قام ${collectorName} بتحصيل مبلغ ${amount.toLocaleString()} ر.ي من منفذ "${outlet.name}". المتبقي: ${newDebt.toLocaleString()} ر.ي.`,
      actorRole: currentRole,
      targetRole: currentRole === 'distributor' ? 'admin' : 'distributor',
      outletName: outlet.name,
      amount,
    });

    soundService.playSuccess();
    return newPayment;
  };

  // 4.B Update Delivery Voucher
  const updateDelivery = (
    deliveryId: string,
    data: {
      cardsCount?: number;
      sheetsCount?: number;
      unitSheetPrice?: number;
      unitCardPrice?: number;
      cashPaidNow?: number;
      notes?: string;
      date?: string;
    }
  ): { success: boolean; message?: string } => {
    const existing = deliveriesRef.current.find((d) => d.id === deliveryId);
    if (!existing) {
      return { success: false, message: 'سند التوريد المطلوب غير موجود' };
    }

    const config = CARD_CATEGORIES_CONFIG[existing.category];
    const isCardDelivery = existing.deliveryUnit === 'cards' || (existing.cardsCount !== undefined && existing.cardsCount > 0 && (!existing.sheetsCount || existing.sheetsCount === 0));

    const targetCardsCount = data.cardsCount !== undefined ? Number(data.cardsCount) : existing.cardsCount;
    const targetSheetsCount = data.sheetsCount !== undefined ? Number(data.sheetsCount) : existing.sheetsCount;
    const targetUnitSheetPrice = data.unitSheetPrice !== undefined && data.unitSheetPrice > 0 ? Number(data.unitSheetPrice) : existing.unitSheetPrice;
    const targetUnitCardPrice = data.unitCardPrice !== undefined && data.unitCardPrice > 0
      ? Number(data.unitCardPrice)
      : (existing.unitCardPrice || Math.round(targetUnitSheetPrice / config.defaultCardsPerSheet));

    let newTotalAmount = 0;
    if (isCardDelivery) {
      const fullSheets = Math.floor(targetCardsCount / config.defaultCardsPerSheet);
      const looseCards = targetCardsCount % config.defaultCardsPerSheet;
      newTotalAmount = (fullSheets * targetUnitSheetPrice) + (looseCards * targetUnitCardPrice);
    } else {
      newTotalAmount = targetSheetsCount * targetUnitSheetPrice;
    }

    const newCashPaidNow = data.cashPaidNow !== undefined ? Number(data.cashPaidNow) : existing.cashPaidNow;
    const newRemainingDebt = Math.max(0, newTotalAmount - newCashPaidNow);

    // Inventory adjustments if quantity changed
    let updatedSheets = [...sheetsRef.current];
    const diffCards = targetCardsCount - existing.cardsCount;

    if (diffCards < 0) {
      // Returned cards to custody
      let returnCount = Math.abs(diffCards);
      updatedSheets = updatedSheets.map((s) => {
        if (returnCount <= 0) return s;
        if (s.deliveryId === deliveryId && s.status === 'delivered_outlet') {
          const currentCount = s.cardsCount || config.defaultCardsPerSheet;
          if (returnCount >= currentCount) {
            returnCount -= currentCount;
            return {
              ...s,
              status: 'distributor_custody' as SheetStatus,
              currentHolder: 'distributor',
              assignedOutletId: undefined,
              assignedOutletName: undefined,
              deliveryId: undefined,
            };
          } else {
            const ret = returnCount;
            returnCount = 0;
            return {
              ...s,
              cardsCount: currentCount - ret,
            };
          }
        }
        return s;
      });
    } else if (diffCards > 0) {
      // Deduct more cards from distributor custody
      const custodyEligible = updatedSheets.filter(
        (s) => s.category === existing.category && s.status === 'distributor_custody'
      );
      const availableCards = custodyEligible.reduce(
        (sum, s) => sum + (s.cardsCount || config.defaultCardsPerSheet),
        0
      );

      if (diffCards > availableCards) {
        return {
          success: false,
          message: `الرصيد المتوفر في عهدة الموزع (${availableCards} كرت) لا يكفي لزيادة التوريد بمقدار ${diffCards} كرت.`,
        };
      }

      let allocateCount = diffCards;
      const extraSlices: SheetLeaf[] = [];

      updatedSheets = updatedSheets.map((s) => {
        if (allocateCount <= 0) return s;
        if (s.category !== existing.category || s.status !== 'distributor_custody') return s;

        const currentCount = s.cardsCount || config.defaultCardsPerSheet;
        if (allocateCount >= currentCount) {
          allocateCount -= currentCount;
          return {
            ...s,
            status: 'delivered_outlet' as SheetStatus,
            currentHolder: existing.outletId,
            assignedOutletId: existing.outletId,
            assignedOutletName: existing.outletName,
            deliveryId,
          };
        } else {
          const alloc = allocateCount;
          allocateCount = 0;
          const sliceCode = `${s.sheetCode}-P${alloc}-${deliveryId}`;
          extraSlices.push({
            ...s,
            sheetCode: sliceCode,
            cardsCount: alloc,
            status: 'delivered_outlet' as SheetStatus,
            currentHolder: existing.outletId,
            assignedOutletId: existing.outletId,
            assignedOutletName: existing.outletName,
            deliveryId,
            timestamp: new Date().toISOString(),
          });
          return {
            ...s,
            cardsCount: currentCount - alloc,
          };
        }
      });
      updatedSheets = [...updatedSheets, ...extraSlices];
    }

    // Reconcile Outlet Debt and Amounts
    const diffDebt = newRemainingDebt - existing.remainingDebt;
    const diffTotal = newTotalAmount - existing.totalAmount;
    const diffPaid = newCashPaidNow - existing.cashPaidNow;

    const updatedOutlets = outletsRef.current.map((o) => {
      if (o.id === existing.outletId) {
        return {
          ...o,
          currentDebt: Math.max(0, o.currentDebt + diffDebt),
          totalDeliveredAmount: Math.max(0, o.totalDeliveredAmount + diffTotal),
          totalPaidAmount: Math.max(0, o.totalPaidAmount + diffPaid),
        };
      }
      return o;
    });

    let paymentStatus: DeliveryVoucher['paymentStatus'] = 'credit';
    if (newCashPaidNow >= newTotalAmount) {
      paymentStatus = 'paid_full';
    } else if (newCashPaidNow > 0) {
      paymentStatus = 'paid_partial';
    }

    const updatedDelivery: DeliveryVoucher = {
      ...existing,
      cardsCount: targetCardsCount,
      sheetsCount: isCardDelivery ? Number((targetCardsCount / config.defaultCardsPerSheet).toFixed(2)) : targetSheetsCount,
      unitSheetPrice: targetUnitSheetPrice,
      unitCardPrice: targetUnitCardPrice,
      totalAmount: newTotalAmount,
      cashPaidNow: newCashPaidNow,
      remainingDebt: newRemainingDebt,
      paymentStatus,
      date: data.date || existing.date,
      notes: data.notes !== undefined ? data.notes : existing.notes,
    };

    const updatedDeliveries = deliveriesRef.current.map((d) => (d.id === deliveryId ? updatedDelivery : d));

    deliveriesRef.current = updatedDeliveries;
    outletsRef.current = updatedOutlets;
    sheetsRef.current = updatedSheets;

    setDeliveries(updatedDeliveries);
    setOutlets(updatedOutlets);
    setSheets(updatedSheets);

    try {
      safeStorage.setItem(STORAGE_PREFIX + 'deliveries', JSON.stringify(updatedDeliveries));
      safeStorage.setItem(STORAGE_PREFIX + 'outlets', JSON.stringify(updatedOutlets));
      safeStorage.setItem(STORAGE_PREFIX + 'sheets', JSON.stringify(updatedSheets));
    } catch {}

    pushStateToCloud({
      deliveries: updatedDeliveries,
      outlets: updatedOutlets,
      sheets: updatedSheets,
    });

    addAudit(
      'DELIVERY_UPDATED',
      `تم تعديل سند التوريد ${deliveryId} لمنفذ "${existing.outletName}": المبلغ الجديد ${newTotalAmount.toLocaleString()} ر.ي (مدفوع: ${newCashPaidNow.toLocaleString()}، دين متبقي: ${newRemainingDebt.toLocaleString()} ر.ي)`
    );

    soundService.playSuccess();
    return { success: true };
  };

  // 4.C Delete Delivery Voucher
  const deleteDelivery = (deliveryId: string): { success: boolean; message?: string } => {
    const existing = deliveriesRef.current.find((d) => d.id === deliveryId);
    if (!existing) {
      return { success: false, message: 'سند التوريد المطلوب غير موجود' };
    }

    // Reconcile Outlet Debt and Amounts
    const updatedOutlets = outletsRef.current.map((o) => {
      if (o.id === existing.outletId) {
        return {
          ...o,
          currentDebt: Math.max(0, o.currentDebt - existing.remainingDebt),
          totalDeliveredAmount: Math.max(0, o.totalDeliveredAmount - existing.totalAmount),
          totalPaidAmount: Math.max(0, o.totalPaidAmount - existing.cashPaidNow),
        };
      }
      return o;
    });

    // Return all sheets/slices belonging to this delivery back to distributor custody
    const updatedSheets = sheetsRef.current.map((s) => {
      if (s.deliveryId === deliveryId) {
        return {
          ...s,
          status: 'distributor_custody' as SheetStatus,
          currentHolder: 'distributor',
          assignedOutletId: undefined,
          assignedOutletName: undefined,
          deliveryId: undefined,
        };
      }
      return s;
    });

    const updatedDeliveries = deliveriesRef.current.filter((d) => d.id !== deliveryId);

    deliveriesRef.current = updatedDeliveries;
    outletsRef.current = updatedOutlets;
    sheetsRef.current = updatedSheets;

    setDeliveries(updatedDeliveries);
    setOutlets(updatedOutlets);
    setSheets(updatedSheets);

    try {
      safeStorage.setItem(STORAGE_PREFIX + 'deliveries', JSON.stringify(updatedDeliveries));
      safeStorage.setItem(STORAGE_PREFIX + 'outlets', JSON.stringify(updatedOutlets));
      safeStorage.setItem(STORAGE_PREFIX + 'sheets', JSON.stringify(updatedSheets));
    } catch {}

    pushStateToCloud({
      deliveries: updatedDeliveries,
      outlets: updatedOutlets,
      sheets: updatedSheets,
    });

    addAudit(
      'DELIVERY_DELETED',
      `تم إلغاء وحذف سند التوريد ${deliveryId} لمنفذ "${existing.outletName}" وإرجاع ${existing.cardsCount} كرت إلى العهدة وتسوية مديونية المنفذ.`
    );

    soundService.playSuccess();
    return { success: true };
  };

  // 5.B Update Payment Voucher
  const updatePayment = (
    paymentId: string,
    data: {
      amount?: number;
      paymentMethod?: 'cash' | 'transfer';
      notes?: string;
      date?: string;
    }
  ): { success: boolean; message?: string } => {
    const existing = paymentsRef.current.find((p) => p.id === paymentId);
    if (!existing) {
      return { success: false, message: 'سند القبض المطلوب غير موجود' };
    }

    const newAmount = data.amount !== undefined ? Number(data.amount) : existing.amount;
    const diffAmount = newAmount - existing.amount;

    // Reconcile Outlet Balance
    const updatedOutlets = outletsRef.current.map((o) => {
      if (o.id === existing.outletId) {
        return {
          ...o,
          currentDebt: Math.max(0, o.currentDebt - diffAmount),
          totalPaidAmount: Math.max(0, o.totalPaidAmount + diffAmount),
        };
      }
      return o;
    });

    const updatedPayment: PaymentVoucher = {
      ...existing,
      amount: newAmount,
      newDebt: Math.max(0, existing.previousDebt - newAmount),
      paymentMethod: data.paymentMethod || existing.paymentMethod,
      date: data.date || existing.date,
      notes: data.notes !== undefined ? data.notes : existing.notes,
    };

    const updatedPayments = paymentsRef.current.map((p) => (p.id === paymentId ? updatedPayment : p));

    paymentsRef.current = updatedPayments;
    outletsRef.current = updatedOutlets;

    setPayments(updatedPayments);
    setOutlets(updatedOutlets);

    try {
      safeStorage.setItem(STORAGE_PREFIX + 'payments', JSON.stringify(updatedPayments));
      safeStorage.setItem(STORAGE_PREFIX + 'outlets', JSON.stringify(updatedOutlets));
    } catch {}

    pushStateToCloud({
      payments: updatedPayments,
      outlets: updatedOutlets,
    });

    addAudit(
      'PAYMENT_UPDATED',
      `تم تعديل سند القبض ${paymentId} لمنفذ "${existing.outletName}": المبلغ المعدل ${newAmount.toLocaleString()} ر.ي (الفارق: ${diffAmount > 0 ? '+' : ''}${diffAmount.toLocaleString()} ر.ي)`
    );

    soundService.playSuccess();
    return { success: true };
  };

  // 5.C Delete Payment Voucher
  const deletePayment = (paymentId: string): { success: boolean; message?: string } => {
    const existing = paymentsRef.current.find((p) => p.id === paymentId);
    if (!existing) {
      return { success: false, message: 'سند القبض المطلوب غير موجود' };
    }

    // Reconcile Outlet: return paid amount back to currentDebt
    const updatedOutlets = outletsRef.current.map((o) => {
      if (o.id === existing.outletId) {
        return {
          ...o,
          currentDebt: o.currentDebt + existing.amount,
          totalPaidAmount: Math.max(0, o.totalPaidAmount - existing.amount),
        };
      }
      return o;
    });

    const updatedPayments = paymentsRef.current.filter((p) => p.id !== paymentId);

    paymentsRef.current = updatedPayments;
    outletsRef.current = updatedOutlets;

    setPayments(updatedPayments);
    setOutlets(updatedOutlets);

    try {
      safeStorage.setItem(STORAGE_PREFIX + 'payments', JSON.stringify(updatedPayments));
      safeStorage.setItem(STORAGE_PREFIX + 'outlets', JSON.stringify(updatedOutlets));
    } catch {}

    pushStateToCloud({
      payments: updatedPayments,
      outlets: updatedOutlets,
    });

    addAudit(
      'PAYMENT_DELETED',
      `تم حذف سند القبض ${paymentId} بمبلغ ${existing.amount.toLocaleString()} ر.ي وإعادة قيد المبلغ على حساب منفذ "${existing.outletName}".`
    );

    soundService.playSuccess();
    return { success: true };
  };

  // 6. Direct Sale to individuals
  const createDirectSale = ({
    customerName,
    customerPhone,
    category,
    cardsCount,
    unitCardPrice,
    isCredit,
    notes,
  }: {
    customerName: string;
    customerPhone?: string;
    category: CardCategory;
    cardsCount: number;
    unitCardPrice: number;
    isCredit: boolean;
    notes?: string;
  }): DirectSale => {
    const saleNum = directSales.length + 1;
    const saleId = `DIR-2026-${String(saleNum).padStart(4, '0')}`;
    const totalAmount = cardsCount * unitCardPrice;
    const soldBy = currentRole === 'admin' ? 'المسؤول' : 'الموزع الميداني';

    const newSale: DirectSale = {
      id: saleId,
      date: new Date().toISOString().split('T')[0],
      customerName,
      customerPhone,
      category,
      cardsCount,
      unitCardPrice,
      totalAmount,
      isCredit,
      isPaid: !isCredit,
      soldBy,
      notes,
      createdAt: new Date().toISOString(),
    };

    const updatedSales = [newSale, ...directSalesRef.current];
    directSalesRef.current = updatedSales;
    setDirectSales(updatedSales);
    try {
      safeStorage.setItem(STORAGE_PREFIX + 'directSales', JSON.stringify(updatedSales));
    } catch {}
    pushStateToCloud({ directSales: updatedSales });

    addAudit(
      'DIRECT_SALE_CREATED',
      `بيع مباشر ${saleId} للعميل "${customerName}": فئة ${category} بعدد ${cardsCount} كرت بمبلغ ${totalAmount.toLocaleString()} ر.ي (${isCredit ? 'آجل' : 'نقداً'})`
    );

    soundService.playSuccess();
    return newSale;
  };

  const updateDirectSale = (
    saleId: string,
    data: {
      customerName?: string;
      customerPhone?: string;
      cardsCount?: number;
      unitCardPrice?: number;
      isCredit?: boolean;
      notes?: string;
      date?: string;
    }
  ): { success: boolean; message?: string } => {
    const existing = directSalesRef.current.find((s) => s.id === saleId);
    if (!existing) {
      return { success: false, message: 'سجل البيع المباشر غير موجود' };
    }

    const newCardsCount = data.cardsCount !== undefined ? Number(data.cardsCount) : existing.cardsCount;
    const newUnitPrice = data.unitCardPrice !== undefined ? Number(data.unitCardPrice) : existing.unitCardPrice;
    const newTotalAmount = newCardsCount * newUnitPrice;
    const newIsCredit = data.isCredit !== undefined ? data.isCredit : existing.isCredit;

    const updatedSale: DirectSale = {
      ...existing,
      customerName: data.customerName || existing.customerName,
      customerPhone: data.customerPhone !== undefined ? data.customerPhone : existing.customerPhone,
      cardsCount: newCardsCount,
      unitCardPrice: newUnitPrice,
      totalAmount: newTotalAmount,
      isCredit: newIsCredit,
      isPaid: !newIsCredit,
      date: data.date || existing.date,
      notes: data.notes !== undefined ? data.notes : existing.notes,
    };

    const updatedSales = directSalesRef.current.map((s) => (s.id === saleId ? updatedSale : s));
    directSalesRef.current = updatedSales;
    setDirectSales(updatedSales);
    try {
      safeStorage.setItem(STORAGE_PREFIX + 'directSales', JSON.stringify(updatedSales));
    } catch {}
    pushStateToCloud({ directSales: updatedSales });

    addAudit(
      'DIRECT_SALE_UPDATED',
      `تم تعديل سجل البيع المباشر ${saleId} للعميل "${updatedSale.customerName}": الكمية ${newCardsCount} كرت، المبلغ ${newTotalAmount.toLocaleString()} ر.ي (${newIsCredit ? 'آجل' : 'نقداً'})`
    );

    soundService.playSuccess();
    return { success: true };
  };

  const deleteDirectSale = (saleId: string): { success: boolean; message?: string } => {
    const existing = directSalesRef.current.find((s) => s.id === saleId);
    if (!existing) {
      return { success: false, message: 'سجل البيع المباشر غير موجود' };
    }

    const updatedSales = directSalesRef.current.filter((s) => s.id !== saleId);
    directSalesRef.current = updatedSales;
    setDirectSales(updatedSales);
    try {
      safeStorage.setItem(STORAGE_PREFIX + 'directSales', JSON.stringify(updatedSales));
    } catch {}
    pushStateToCloud({ directSales: updatedSales });

    addAudit(
      'DIRECT_SALE_DELETED',
      `تم حذف وإلغاء قيد البيع المباشر ${saleId} للعميل "${existing.customerName}" بمبلغ ${existing.totalAmount.toLocaleString()} ر.ي`
    );

    soundService.playSuccess();
    return { success: true };
  };

  // 7. Cash Handover (Distributor -> Admin)
  const createCashHandover = (amount: number, notes?: string): CashHandover => {
    const handoverNum = cashHandovers.length + 1;
    const handoverId = `CSH-2026-${String(handoverNum).padStart(4, '0')}`;

    const newHandover: CashHandover = {
      id: handoverId,
      date: new Date().toISOString().split('T')[0],
      amount,
      fromUser: 'الموزع الميداني',
      toUser: 'المسؤول',
      status: 'pending',
      notes,
      createdAt: new Date().toISOString(),
    };

    const updatedHandovers = [newHandover, ...cashHandoversRef.current];
    cashHandoversRef.current = updatedHandovers;
    setCashHandovers(updatedHandovers);
    try {
      safeStorage.setItem(STORAGE_PREFIX + 'cashHandovers', JSON.stringify(updatedHandovers));
    } catch {}
    pushStateToCloud({ cashHandovers: updatedHandovers });

    addAudit(
      'CASH_HANDOVER',
      `تم إرسال سند تسليم نقدية ${handoverId} بمبلغ ${amount.toLocaleString()} ر.ي من الموزع للمسؤول (قيد الاعتماد)`
    );

    addNotification({
      title: 'طلب تسليم نقدية محصلة',
      message: `قام الموزع الميداني بإرسال سند تسليم نقدية ${handoverId} بمبلغ ${amount.toLocaleString()} ر.ي بانتظار تأكيد استلامك.`,
      type: 'warning',
      targetRole: 'admin',
    });

    // Broadcast live snapshot event to Admin
    cloudSync.emitLiveEvent({
      eventType: 'CASH_HANDOVER',
      title: 'طلب تسليم نقدية للمسؤول (CSH)',
      message: `قام الموزع الميداني بتسليم نقدية محصلة بمبلغ ${amount.toLocaleString()} ر.ي بانتظار تأكيد الاستلام في الخزينة.`,
      actorRole: 'distributor',
      targetRole: 'admin',
      amount,
    });

    soundService.playAlert();
    return newHandover;
  };

  const resolveCashHandover = (id: string, status: 'accepted' | 'rejected') => {
    const updatedHandovers = cashHandoversRef.current.map((h) => (h.id === id ? { ...h, status } : h));
    cashHandoversRef.current = updatedHandovers;
    setCashHandovers(updatedHandovers);
    try {
      safeStorage.setItem(STORAGE_PREFIX + 'cashHandovers', JSON.stringify(updatedHandovers));
    } catch {}
    pushStateToCloud({ cashHandovers: updatedHandovers });

    const h = cashHandovers.find((item) => item.id === id);
    if (h) {
      addAudit(
        'CASH_HANDOVER',
        `قام المسؤول بـ (${status === 'accepted' ? 'تأكيد استلام' : 'رفض'}) سند تسليم النقدية ${id} بمبلغ ${h.amount.toLocaleString()} ر.ي`
      );

      addNotification({
        title: status === 'accepted' ? 'تم استلام النقدية' : 'تم رفض تسليم النقدية',
        message:
          status === 'accepted'
            ? `أكد المسؤول استلام مبلغ ${h.amount.toLocaleString()} ر.ي وتم خصمه من عهدتك النقدية.`
            : `قام المسؤول برفض سند النقدية ${id}. يرجى مراجعته.`,
        type: status === 'accepted' ? 'success' : 'alert',
        targetRole: 'distributor',
      });

      if (status === 'accepted') {
        soundService.playSuccess();
      } else {
        soundService.playAlert();
      }

      // Broadcast live event to distributor
      cloudSync.emitLiveEvent({
        eventType: 'CASH_HANDOVER',
        title: status === 'accepted' ? 'تم تأكيد استلام النقدية' : 'تم رفض سند النقدية',
        message: status === 'accepted'
          ? `أكد المسؤول استلام مبلغ ${h.amount.toLocaleString()} ر.ي وتم خصمه من عهدتك النقدية.`
          : `قام المسؤول برفض سند النقدية ${id}. يرجى مراجعته.`,
        actorRole: 'admin',
        targetRole: 'distributor',
        amount: h.amount,
      });
    }
  };

  const updateCashHandover = (
    handoverId: string,
    data: {
      amount?: number;
      notes?: string;
      date?: string;
    }
  ): { success: boolean; message?: string } => {
    const existing = cashHandoversRef.current.find((h) => h.id === handoverId);
    if (!existing) {
      return { success: false, message: 'سند تسليم النقدية غير موجود' };
    }

    const newAmount = data.amount !== undefined ? Number(data.amount) : existing.amount;
    const diff = newAmount - existing.amount;

    const updatedHandover: CashHandover = {
      ...existing,
      amount: newAmount,
      date: data.date || existing.date,
      notes: data.notes !== undefined ? data.notes : existing.notes,
    };

    const updatedHandovers = cashHandoversRef.current.map((h) => (h.id === handoverId ? updatedHandover : h));
    cashHandoversRef.current = updatedHandovers;
    setCashHandovers(updatedHandovers);
    try {
      safeStorage.setItem(STORAGE_PREFIX + 'cashHandovers', JSON.stringify(updatedHandovers));
    } catch {}
    pushStateToCloud({ cashHandovers: updatedHandovers });

    addAudit(
      'CASH_HANDOVER_UPDATED',
      `تم تعديل سند تسليم النقدية ${handoverId}: المبلغ السابق ${existing.amount.toLocaleString()} -> الجديد ${newAmount.toLocaleString()} ر.ي (الفارق: ${diff > 0 ? '+' : ''}${diff.toLocaleString()} ر.ي)`
    );

    soundService.playSuccess();
    return { success: true };
  };

  const deleteCashHandover = (handoverId: string): { success: boolean; message?: string } => {
    const existing = cashHandoversRef.current.find((h) => h.id === handoverId);
    if (!existing) {
      return { success: false, message: 'سند تسليم النقدية غير موجود' };
    }

    const updatedHandovers = cashHandoversRef.current.filter((h) => h.id !== handoverId);
    cashHandoversRef.current = updatedHandovers;
    setCashHandovers(updatedHandovers);
    try {
      safeStorage.setItem(STORAGE_PREFIX + 'cashHandovers', JSON.stringify(updatedHandovers));
    } catch {}
    pushStateToCloud({ cashHandovers: updatedHandovers });

    addAudit(
      'CASH_HANDOVER_DELETED',
      `تم حذف وإلغاء سند تسليم النقدية ${handoverId} بمبلغ ${existing.amount.toLocaleString()} ر.ي وإعادة قيد المبلغ في عهدة الموزع النقدية.`
    );

    soundService.playSuccess();
    return { success: true };
  };

  // 8. Settlements
  const createSettlement = ({
    title,
    type,
    amount,
    sheetsCount,
    description,
  }: {
    title: string;
    type: 'cards' | 'cash' | 'commission' | 'general';
    amount?: number;
    sheetsCount?: number;
    description: string;
  }): SettlementRequest => {
    const setNum = settlements.length + 1;
    const settlementId = `SET-2026-${String(setNum).padStart(4, '0')}`;
    const requestedBy = currentRole === 'admin' ? 'المسؤول' : 'الموزع الميداني';
    const targetUser = currentRole === 'admin' ? 'الموزع الميداني' : 'المسؤول';

    const newSettlement: SettlementRequest = {
      id: settlementId,
      date: new Date().toISOString().split('T')[0],
      title,
      type,
      amount,
      sheetsCount,
      requestedBy,
      targetUser,
      description,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    const updatedSettlements = [newSettlement, ...settlementsRef.current];
    settlementsRef.current = updatedSettlements;
    setSettlements(updatedSettlements);
    try {
      safeStorage.setItem(STORAGE_PREFIX + 'settlements', JSON.stringify(updatedSettlements));
    } catch {}
    pushStateToCloud({ settlements: updatedSettlements });

    addAudit(
      'SETTLEMENT_CREATED',
      `تم إنشاء طلب تسوية ${settlementId} (${title}) بواسطة ${requestedBy} موجه إلى ${targetUser}`
    );

    addNotification({
      title: 'طلب تسوية جديد معلق',
      message: `تم رفع طلب تسوية "${title}" برقم ${settlementId} ويحتاج موافقتك.`,
      type: 'warning',
      targetRole: currentRole === 'admin' ? 'distributor' : 'admin',
    });

    soundService.playNotification();
    return newSettlement;
  };

  const resolveSettlement = (id: string, status: 'approved' | 'rejected', reviewNotes?: string) => {
    const resolver = currentRole === 'admin' ? 'المسؤول' : 'الموزع الميداني';
    const updatedSettlements = settlementsRef.current.map((s) =>
      s.id === id
        ? {
            ...s,
            status,
            reviewNotes,
            resolvedAt: new Date().toISOString(),
          }
        : s
    );
    settlementsRef.current = updatedSettlements;
    setSettlements(updatedSettlements);
    try {
      safeStorage.setItem(STORAGE_PREFIX + 'settlements', JSON.stringify(updatedSettlements));
    } catch {}
    pushStateToCloud({ settlements: updatedSettlements });

    const s = settlements.find((item) => item.id === id);
    if (s) {
      addAudit(
        'SETTLEMENT_RESOLVED',
        `قام ${resolver} بـ (${status === 'approved' ? 'الموافقة على' : 'رفض'}) طلب التسوية ${id} "${s.title}"`
      );

      addNotification({
        title: status === 'approved' ? 'تمت الموافقة على التسوية' : 'تم رفض التسوية',
        message: `تمت مراجعة طلب التسوية ${id} (${s.title}) من قبل ${resolver}: ${status === 'approved' ? 'موافق' : 'مرفوض'}.`,
        type: status === 'approved' ? 'success' : 'alert',
        targetRole: 'all',
      });

      if (status === 'approved') soundService.playSuccess();
      else soundService.playAlert();
    }
  };

  // 9. Record Damaged Cards
  const recordDamage = ({
    category,
    sheetCode,
    cardsCount,
    reason,
  }: {
    category: CardCategory;
    sheetCode?: string;
    cardsCount: number;
    reason: string;
  }): DamagedCardRecord => {
    const dmgNum = damagedCards.length + 1;
    const dmgId = `DMG-2026-${String(dmgNum).padStart(4, '0')}`;
    const reportedBy = currentRole === 'admin' ? 'المسؤول' : 'الموزع الميداني';

    const newDamage: DamagedCardRecord = {
      id: dmgId,
      date: new Date().toISOString().split('T')[0],
      category,
      sheetCode,
      cardsCount,
      reason,
      reportedBy,
      action: 'written_off',
      createdAt: new Date().toISOString(),
    };

    let updatedSheets = sheetsRef.current;
    if (sheetCode) {
      updatedSheets = sheetsRef.current.map((s) => (s.sheetCode === sheetCode ? { ...s, status: 'damaged' as SheetStatus, damageReason: reason } : s));
      sheetsRef.current = updatedSheets;
      setSheets(updatedSheets);
      checkAndTriggerCriticalStockAlert(category, updatedSheets);
    }

    const updatedDamages = [newDamage, ...damagedCardsRef.current];
    damagedCardsRef.current = updatedDamages;
    setDamagedCards(updatedDamages);
    try {
      if (sheetCode) safeStorage.setItem(STORAGE_PREFIX + 'sheets', JSON.stringify(updatedSheets));
      safeStorage.setItem(STORAGE_PREFIX + 'damagedCards', JSON.stringify(updatedDamages));
    } catch {}
    pushStateToCloud({ sheets: updatedSheets, damagedCards: updatedDamages });

    addAudit(
      'DAMAGE_REPORTED',
      `سند تالف/مرتجع ${dmgId}: تسجيل ${cardsCount} كرت فئة ${category} ${sheetCode ? `(ورقة ${sheetCode})` : ''} - السبب: ${reason}`
    );

    soundService.playAlert();
    return newDamage;
  };

  // 10. Outlets Management & Duplicate Prevention
  const normalizeArabicText = (text: string): string => {
    if (!text) return '';
    return text
      .trim()
      .toLowerCase()
      .replace(/[\u064B-\u065F\u0670]/g, '') // remove Arabic tashkeel / vowels
      .replace(/[أإآٱ]/g, 'ا') // unify alif forms
      .replace(/ة/g, 'ه') // unify ta marbuta
      .replace(/ى/g, 'ي') // unify alif maqsura
      .replace(/[^\w\s\u0600-\u06FF]/gi, '') // remove special punctuation
      .replace(/\s+/g, ' '); // collapse extra spaces
  };

  const checkOutletNameExists = (name: string, excludeId?: string): Outlet | null => {
    if (!name || !name.trim()) return null;
    const targetNorm = normalizeArabicText(name);
    return (
      outletsRef.current.find(
        (o) => o.id !== excludeId && normalizeArabicText(o.name) === targetNorm
      ) || null
    );
  };

  const addOutlet = (
    data: Omit<Outlet, 'id' | 'currentDebt' | 'totalDeliveredAmount' | 'totalPaidAmount' | 'createdAt'>
  ): Outlet => {
    const trimmedName = (data.name || '').trim();
    if (!trimmedName) {
      soundService.playAlert();
      throw new Error('يرجى كتابة اسم المنفذ أو المحل');
    }

    // Strict Validation: Prevent duplicate outlet by name
    const existingDuplicate = checkOutletNameExists(trimmedName);
    if (existingDuplicate) {
      soundService.playAlert();
      throw new Error(
        `تنبيه تدقيق: يوجد منفذ مسجل مسبقاً بنفس الاسم ("${existingDuplicate.name}" - الكود: ${existingDuplicate.id}). تم منع إنشاء سجل مكرر لحماية دقة الحسابات وسقف الدين.`
      );
    }

    const newId = `OUT-${String(outletsRef.current.length + 1).padStart(3, '0')}`;
    const newOutlet: Outlet = normalizeOutlet({
      ...data,
      name: trimmedName,
      id: newId,
      currentDebt: 0, // Starts at 0
      totalDeliveredAmount: 0,
      totalPaidAmount: 0,
      createdAt: new Date().toISOString().split('T')[0],
    });

    const updated = [...outletsRef.current, newOutlet];
    outletsRef.current = updated;
    setOutlets(updated);
    try {
      safeStorage.setItem(STORAGE_PREFIX + 'outlets', JSON.stringify(updated));
    } catch {}
    pushStateToCloud({ outlets: updated });

    addAudit('OUTLET_CREATED', `تمت إضافة منفذ جديد "${newOutlet.name}" برصيد مصفّر 0 ر.ي وسقف دين ${newOutlet.creditLimit.toLocaleString()} ر.ي`);
    soundService.playSuccess();
    return newOutlet;
  };

  const updateOutlet = (id: string, updates: Partial<Outlet>) => {
    if (updates.name && updates.name.trim()) {
      const trimmedName = updates.name.trim();
      const existingDuplicate = checkOutletNameExists(trimmedName, id);
      if (existingDuplicate) {
        soundService.playAlert();
        throw new Error(
          `لا يمكن تغيير الاسم إلى "${trimmedName}" لأنه مستخدم بالفعل لمنفذ آخر ("${existingDuplicate.name}" - كود: ${existingDuplicate.id}). تم منع التكرار.`
        );
      }
    }

    let targetName = '';
    let oldName = '';
    const updated = outletsRef.current.map((o) => {
      if (o.id === id) {
        oldName = o.name;
        targetName = updates.name ? updates.name.trim() : o.name;
        return normalizeOutlet({ ...o, ...updates, name: targetName });
      }
      return o;
    });
    outletsRef.current = updated;
    setOutlets(updated);
    try {
      safeStorage.setItem(STORAGE_PREFIX + 'outlets', JSON.stringify(updated));
    } catch {}

    // Cascade name update to deliveries and sheets if renamed
    if (updates.name && oldName && updates.name.trim() !== oldName) {
      const newOutletName: string = updates.name.trim();
      const updatedDeliveries = deliveriesRef.current.map((d) => {
        if (d.outletId === id || d.outletName === oldName) {
          return { ...d, outletName: newOutletName };
        }
        return d;
      });
      deliveriesRef.current = updatedDeliveries;
      setDeliveries(updatedDeliveries);

      const updatedSheets = sheetsRef.current.map((s) => {
        if (s.outletId === id || s.outletName === oldName) {
          return { ...s, outletName: newOutletName, assignedOutletName: newOutletName };
        }
        return s;
      });
      sheetsRef.current = updatedSheets;
      setSheets(updatedSheets);

      try {
        safeStorage.setItem(STORAGE_PREFIX + 'deliveries', JSON.stringify(updatedDeliveries));
        safeStorage.setItem(STORAGE_PREFIX + 'sheets', JSON.stringify(updatedSheets));
      } catch {}
      pushStateToCloud({ outlets: updated, deliveries: updatedDeliveries, sheets: updatedSheets });
    } else {
      pushStateToCloud({ outlets: updated });
    }

    addAudit('OUTLET_UPDATED', `تم تحديث بيانات المنفذ "${targetName || id}" ومزامنتها في قاعدة البيانات السحابية`);
    soundService.playSuccess();
  };

  const deleteOutlet = (id: string): boolean => {
    const target = outletsRef.current.find((o) => o.id === id);
    if (!target) return false;
    if (target.currentDebt > 0) {
      addNotification({
        title: 'تعذر حذف المنفذ',
        message: `لا يمكن حذف المنفذ "${target.name}" لوجود مديونية قائمة (${target.currentDebt.toLocaleString()} ر.ي). يجب تصفير الحساب أولاً.`,
        type: 'alert',
      });
      return false;
    }

    const updated = outletsRef.current.filter((o) => o.id !== id);
    outletsRef.current = updated;
    setOutlets(updated);
    try {
      safeStorage.setItem(STORAGE_PREFIX + 'outlets', JSON.stringify(updated));
    } catch {}
    pushStateToCloud({ outlets: updated });
    addAudit('SYSTEM_RESET', `تم حذف المنفذ "${target.name}"`);
    soundService.playSuccess();
    return true;
  };

  // Safe deduplication tool to merge any duplicate outlets sharing identical names without losing vouchers
  const mergeDuplicateOutletsByName = (): { success: boolean; mergedCount: number; message: string } => {
    const outletsList = [...outletsRef.current];
    const grouped = new Map<string, Outlet[]>();

    for (const o of outletsList) {
      const norm = normalizeArabicText(o.name);
      if (!grouped.has(norm)) {
        grouped.set(norm, []);
      }
      grouped.get(norm)!.push(o);
    }

    let totalMerged = 0;
    const detailsList: string[] = [];

    for (const [, group] of grouped.entries()) {
      if (group.length > 1) {
        // Sort: prioritize outlet with higher activity or lower ID
        group.sort((a, b) => {
          const actA = (a.totalDeliveredAmount || 0) + (a.totalPaidAmount || 0);
          const actB = (b.totalDeliveredAmount || 0) + (b.totalPaidAmount || 0);
          if (actB !== actA) return actB - actA;
          return a.id.localeCompare(b.id);
        });

        const primary = group[0];
        const duplicates = group.slice(1);

        for (const dup of duplicates) {
          // Reassign deliveries
          const dupDeliveries = deliveriesRef.current.filter(
            (d) => d.outletId === dup.id || d.outletName === dup.name
          );
          if (dupDeliveries.length > 0) {
            const updatedDel = deliveriesRef.current.map((d) => {
              if (d.outletId === dup.id || d.outletName === dup.name) {
                return { ...d, outletId: primary.id, outletName: primary.name };
              }
              return d;
            });
            deliveriesRef.current = updatedDel;
            setDeliveries(updatedDel);
            try {
              safeStorage.setItem(STORAGE_PREFIX + 'deliveries', JSON.stringify(updatedDel));
            } catch {}
          }

          // Reassign payments
          const dupPayments = paymentsRef.current.filter(
            (p) => p.outletId === dup.id || p.outletName === dup.name
          );
          if (dupPayments.length > 0) {
            const updatedPay = paymentsRef.current.map((p) => {
              if (p.outletId === dup.id || p.outletName === dup.name) {
                return { ...p, outletId: primary.id, outletName: primary.name };
              }
              return p;
            });
            paymentsRef.current = updatedPay;
            setPayments(updatedPay);
            try {
              safeStorage.setItem(STORAGE_PREFIX + 'payments', JSON.stringify(updatedPay));
            } catch {}
          }

          // Reassign sheets
          const updatedSheets = sheetsRef.current.map((s) => {
            if (s.outletId === dup.id || s.assignedOutletId === dup.id) {
              return {
                ...s,
                outletId: primary.id,
                outletName: primary.name,
                assignedOutletId: primary.id,
                assignedOutletName: primary.name,
              };
            }
            return s;
          });
          sheetsRef.current = updatedSheets;
          setSheets(updatedSheets);
          try {
            safeStorage.setItem(STORAGE_PREFIX + 'sheets', JSON.stringify(updatedSheets));
          } catch {}

          totalMerged++;
          detailsList.push(`دمج (${dup.id}: ${dup.name}) في (${primary.id}: ${primary.name})`);
        }
      }
    }

    if (totalMerged > 0) {
      // Retain one unique outlet per normalized name
      const uniqueOutletsMap = new Map<string, Outlet>();
      for (const o of outletsRef.current) {
        const norm = normalizeArabicText(o.name);
        if (!uniqueOutletsMap.has(norm)) {
          uniqueOutletsMap.set(norm, o);
        }
      }
      const cleanedOutlets = Array.from(uniqueOutletsMap.values()).map((o) => {
        const normName = normalizeArabicText(o.name);
        const oDeliveries = deliveriesRef.current.filter(
          (d) => d.outletId === o.id || normalizeArabicText(d.outletName) === normName
        );
        const oPayments = paymentsRef.current.filter(
          (p) => p.outletId === o.id || normalizeArabicText(p.outletName) === normName
        );
        const totDel = oDeliveries.reduce((sum, d) => sum + (d.totalAmount || 0), 0);
        const totCash = oDeliveries.reduce((sum, d) => sum + (d.cashPaidNow || 0), 0);
        const totPay = oPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
        const curDebt = totDel - (totCash + totPay);
        return {
          ...o,
          totalDeliveredAmount: totDel,
          totalPaidAmount: totCash + totPay,
          currentDebt: Math.max(0, curDebt),
        };
      });

      outletsRef.current = cleanedOutlets;
      setOutlets(cleanedOutlets);
      try {
        safeStorage.setItem(STORAGE_PREFIX + 'outlets', JSON.stringify(cleanedOutlets));
      } catch {}
      pushStateToCloud({
        outlets: cleanedOutlets,
        deliveries: deliveriesRef.current,
        payments: paymentsRef.current,
        sheets: sheetsRef.current,
      });

      addAudit(
        'OUTLET_BULK_MIGRATION',
        `تم دمج وإلغاء تكرار ${totalMerged} منافذ مكررة مع ترحيل كافة السندات والديون بأمان: ${detailsList.join(' | ')}`
      );
      soundService.playSuccess();
      return {
        success: true,
        mergedCount: totalMerged,
        message: `تم دمج ${totalMerged} منفذ مكرر بنجاح وترحيل كافة السندات والديون المحاسبية دون أي فقدان للبيانات.`,
      };
    }

    return {
      success: true,
      mergedCount: 0,
      message: 'لا توجد منافذ مكررة حالياً، جميع أسماء المنافذ فريدة ومطابقة.',
    };
  };

  // 10.C Expenses & Accounting (تسجيل وإدارة المصروفات والنفقات التشغيلية والرأسمالية)
  const createExpense = ({
    title,
    category,
    amount,
    paymentMethod,
    paidBy,
    beneficiary,
    invoiceNumber,
    notes,
    isCapitalAsset = false,
    date = new Date().toISOString().split('T')[0],
    status = 'paid',
  }: {
    title: string;
    category: ExpenseCategory;
    amount: number;
    paymentMethod: ExpensePaymentMethod;
    paidBy: string;
    beneficiary?: string;
    invoiceNumber?: string;
    notes?: string;
    isCapitalAsset?: boolean;
    date?: string;
    status?: 'paid' | 'pending' | 'credit';
  }): ExpenseItem => {
    if (!checkHydrationReady('تسجيل مصروف')) {
      throw new Error('النظام قيد تدقيق ومطابقة السجلات السحابية، يرجى الانتظار بضع ثوانٍ.');
    }
    const expNum = expensesRef.current.length + 1;
    const newId = `EXP-2026-${String(expNum).padStart(4, '0')}`;
    const newExpense: ExpenseItem = {
      id: newId,
      date,
      title,
      category,
      amount: Number(amount),
      paymentMethod,
      paidBy,
      beneficiary,
      invoiceNumber,
      notes,
      isCapitalAsset,
      status: paymentMethod === 'credit_payable' ? 'credit' : status,
      createdAt: new Date().toISOString(),
    };

    const updated = [newExpense, ...expensesRef.current];
    expensesRef.current = updated;
    setExpenses(updated);

    try {
      safeStorage.setItem(STORAGE_PREFIX + 'expenses', JSON.stringify(updated));
    } catch {}

    pushStateToCloud({ expenses: updated });

    const methodLabels: Record<ExpensePaymentMethod, string> = {
      admin_cash: 'خزينة الإدارة (الصندوق الرئيسي)',
      distributor_cash: 'عهدة الموزع الميدانية (خصم من الكاش)',
      bank_wallet: 'حساب بنكي / محفظة إلكترونية',
      credit_payable: 'آجل / حساب المورد (دائنون)',
    };

    addAudit(
      'EXPENSE_CREATED',
      `سند صرف مصروف ${newId}: تسجيل مبلغ ${amount.toLocaleString()} ر.ي لـ "${title}" (${methodLabels[paymentMethod]}) بواسطة ${paidBy}`
    );

    if (paymentMethod === 'distributor_cash') {
      addNotification({
        title: 'خصم مصروف من العهدة النقدية',
        message: `تم قيد صرف ${amount.toLocaleString()} ر.ي لسند ${newId} (${title})، وخُصم رسمياً من النقدية المتوجب تسليمها للمسؤول.`,
        type: 'info',
        targetRole: 'all',
      });
    }

    // Check if this expense causes month expenses to exceed monthly budget
    const expMonth = (date || new Date().toISOString().split('T')[0]).slice(0, 7);
    const targetBudget = monthlyBudgetsRef.current[expMonth];
    if (targetBudget && targetBudget.budgetAmount > 0) {
      const monthExpenses = updated
        .filter((e) => (e.date || '').startsWith(expMonth))
        .reduce((sum, e) => sum + e.amount, 0);
      if (monthExpenses > targetBudget.budgetAmount) {
        const excess = monthExpenses - targetBudget.budgetAmount;
        const monthArabic = getArabicMonthName(expMonth);
        addNotification({
          title: '🚨 تنبيه تجاوز الميزانية التقديرية!',
          message: `المصروفات المسجلة لشهر ${monthArabic} (${monthExpenses.toLocaleString()} ر.ي) تجاوزت الميزانية التقديرية المحددة (${targetBudget.budgetAmount.toLocaleString()} ر.ي) بمقدار ${excess.toLocaleString()} ر.ي!`,
          type: 'warning',
          targetRole: 'all',
        });
      }
    }

    soundService.playSuccess();
    return newExpense;
  };

  const updateExpense = (id: string, updates: Partial<ExpenseItem>): { success: boolean; message?: string } => {
    const existing = expensesRef.current.find((e) => e.id === id);
    if (!existing) {
      return { success: false, message: 'سند المصروف المطلوب غير موجود' };
    }

    const updatedExpense: ExpenseItem = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    const updated = expensesRef.current.map((e) => (e.id === id ? updatedExpense : e));
    expensesRef.current = updated;
    setExpenses(updated);

    try {
      safeStorage.setItem(STORAGE_PREFIX + 'expenses', JSON.stringify(updated));
    } catch {}

    pushStateToCloud({ expenses: updated });

    addAudit(
      'EXPENSE_UPDATED',
      `تم تعديل سند المصروف ${id}: "${updatedExpense.title}" بمبلغ ${updatedExpense.amount.toLocaleString()} ر.ي`
    );

    // Check if updated expense causes month expenses to exceed monthly budget
    const expMonth = (updatedExpense.date || new Date().toISOString().split('T')[0]).slice(0, 7);
    const targetBudget = monthlyBudgetsRef.current[expMonth];
    if (targetBudget && targetBudget.budgetAmount > 0) {
      const monthExpenses = updated
        .filter((e) => (e.date || '').startsWith(expMonth))
        .reduce((sum, e) => sum + e.amount, 0);
      if (monthExpenses > targetBudget.budgetAmount) {
        const excess = monthExpenses - targetBudget.budgetAmount;
        const monthArabic = getArabicMonthName(expMonth);
        addNotification({
          title: '🚨 تنبيه تجاوز الميزانية التقديرية!',
          message: `المصروفات المسجلة لشهر ${monthArabic} (${monthExpenses.toLocaleString()} ر.ي) تجاوزت الميزانية التقديرية المحددة (${targetBudget.budgetAmount.toLocaleString()} ر.ي) بمقدار ${excess.toLocaleString()} ر.ي!`,
          type: 'warning',
          targetRole: 'all',
        });
      }
    }

    soundService.playSuccess();
    return { success: true };
  };

  const deleteExpense = (id: string): { success: boolean; message?: string } => {
    const existing = expensesRef.current.find((e) => e.id === id);
    if (!existing) {
      return { success: false, message: 'سند المصروف المطلوب غير موجود' };
    }

    const updated = expensesRef.current.filter((e) => e.id !== id);
    expensesRef.current = updated;
    setExpenses(updated);

    try {
      safeStorage.setItem(STORAGE_PREFIX + 'expenses', JSON.stringify(updated));
    } catch {}

    pushStateToCloud({ expenses: updated });

    addAudit(
      'EXPENSE_DELETED',
      `تم إلغاء وحذف سند المصروف ${id} ("${existing.title}") بقيمة ${existing.amount.toLocaleString()} ر.ي وإعادة موازنة النقدية.`
    );

    soundService.playSuccess();
    return { success: true };
  };

  // Monthly Budgets Management
  const setMonthlyBudget = (month: string, amount: number, notes?: string): { success: boolean; message?: string } => {
    if (!month || isNaN(amount) || amount < 0) {
      return { success: false, message: 'يرجى تحديد الشهر وإدخال مبلغ ميزانية صالح' };
    }
    const updated: Record<string, MonthlyBudget> = {
      ...monthlyBudgetsRef.current,
      [month]: {
        month,
        budgetAmount: amount,
        notes: notes || '',
        updatedAt: new Date().toISOString(),
        updatedBy: currentRole === 'admin' ? 'المسؤول' : 'الموزع الميداني',
      },
    };
    monthlyBudgetsRef.current = updated;
    setMonthlyBudgets(updated);

    try {
      safeStorage.setItem(STORAGE_PREFIX + 'monthly_budgets', JSON.stringify(updated));
    } catch {}

    pushStateToCloud({ monthlyBudgets: updated });

    const monthArabic = getArabicMonthName(month);
    addAudit(
      'BUDGET_UPDATED',
      `تم اعتماد الميزانية التقديرية لشهر ${monthArabic} (${month}) بمبلغ ${amount.toLocaleString()} ر.ي`
    );

    // Check if current expenses in that month already exceed this new budget
    const monthExpensesTotal = expensesRef.current
      .filter((e) => (e.date || '').startsWith(month))
      .reduce((sum, e) => sum + e.amount, 0);

    if (amount > 0 && monthExpensesTotal > amount) {
      const excess = monthExpensesTotal - amount;
      addNotification({
        title: '🚨 تنبيه: تجاوز الميزانية المحددة!',
        message: `المصروفات المنفذة لشهر ${monthArabic} (${monthExpensesTotal.toLocaleString()} ر.ي) تتجاوز الميزانية التقديرية المحددة بمقدار ${excess.toLocaleString()} ر.ي!`,
        type: 'warning',
        targetRole: 'all',
      });
    } else {
      addNotification({
        title: 'اعتماد الميزانية التقديرية',
        message: `تم اعتماد ميزانية تقديرية لشهر ${monthArabic} بقيمة ${amount.toLocaleString()} ر.ي بنجاح.`,
        type: 'info',
        targetRole: 'all',
      });
    }

    soundService.playSuccess();
    return { success: true };
  };

  const deleteMonthlyBudget = (month: string): { success: boolean; message?: string } => {
    const updated = { ...monthlyBudgetsRef.current };
    delete updated[month];
    monthlyBudgetsRef.current = updated;
    setMonthlyBudgets(updated);

    try {
      safeStorage.setItem(STORAGE_PREFIX + 'monthly_budgets', JSON.stringify(updated));
    } catch {}

    pushStateToCloud({ monthlyBudgets: updated });

    const monthArabic = getArabicMonthName(month);
    addAudit('BUDGET_DELETED', `تم إلغاء الميزانية التقديرية لشهر ${monthArabic} (${month})`);
    soundService.playSuccess();
    return { success: true };
  };

  const getMonthlyBudget = (month: string): MonthlyBudget | undefined => {
    return monthlyBudgetsRef.current[month];
  };

  // 10.B Bulk Migration & Legacy Records Correction (ترحيل وتصحيح السجلات بين المنافذ جماعياً)
  const bulkMigrateOutletRecords = ({
    sourceOutletIdentifier,
    targetOutletId,
    includeDeliveries = true,
    includePayments = true,
    includeSheets = true,
    reason = 'تصحيح وتوحيد السجلات القديمة وترحيلها إلى المنفذ الفعلي',
  }: {
    sourceOutletIdentifier: string;
    targetOutletId: string;
    includeDeliveries?: boolean;
    includePayments?: boolean;
    includeSheets?: boolean;
    reason?: string;
  }) => {
    const targetOutlet = outletsRef.current.find((o) => o.id === targetOutletId);
    if (!targetOutlet) {
      return {
        success: false,
        migratedDeliveries: 0,
        migratedPayments: 0,
        migratedSheets: 0,
        debtTransferred: 0,
        message: 'المنفذ المحول إليه غير موجود',
      };
    }

    // Source outlet can be an ID, current name, or legacy name 'بقالة البركة'
    const sourceOutlet = outletsRef.current.find(
      (o) => o.id === sourceOutletIdentifier || o.name === sourceOutletIdentifier
    );
    const sourceName = sourceOutlet?.name || sourceOutletIdentifier;

    if (sourceOutlet && sourceOutlet.id === targetOutlet.id) {
      return {
        success: false,
        migratedDeliveries: 0,
        migratedPayments: 0,
        migratedSheets: 0,
        debtTransferred: 0,
        message: 'لا يمكن الترحيل لنفس المنفذ (المنفذ المصدر والهدف متطابقان)',
      };
    }

    let migratedDeliveriesCount = 0;
    let totalDeliveredValueMigrated = 0;
    let totalCashPaidInDeliveriesMigrated = 0;
    let totalDebtFromDeliveriesMigrated = 0;

    let migratedPaymentsCount = 0;
    let totalPaymentsValueMigrated = 0;

    let migratedSheetsCount = 0;
    let totalCardsMigrated = 0;

    // 1. Migrate Deliveries
    let updatedDeliveries = [...deliveriesRef.current];
    if (includeDeliveries) {
      updatedDeliveries = updatedDeliveries.map((d) => {
        const isMatch =
          d.outletId === sourceOutletIdentifier ||
          d.outletName === sourceOutletIdentifier ||
          (sourceOutlet && (d.outletId === sourceOutlet.id || d.outletName === sourceOutlet.name));

        if (isMatch) {
          migratedDeliveriesCount += 1;
          totalDeliveredValueMigrated += d.totalAmount || 0;
          totalCashPaidInDeliveriesMigrated += d.cashPaidNow || 0;
          totalDebtFromDeliveriesMigrated += d.remainingDebt || 0;
          return {
            ...d,
            outletId: targetOutlet.id,
            outletName: targetOutlet.name,
            notes: (d.notes ? d.notes + ' • ' : '') + `[تم ترحيل السند من ${sourceName} بتاريخ ${new Date().toLocaleDateString('ar-YE')}]`,
          };
        }
        return d;
      });
      deliveriesRef.current = updatedDeliveries;
      setDeliveries(updatedDeliveries);
    }

    // 2. Migrate Payments
    let updatedPayments = [...paymentsRef.current];
    if (includePayments) {
      updatedPayments = updatedPayments.map((p) => {
        const isMatch =
          p.outletId === sourceOutletIdentifier ||
          p.outletName === sourceOutletIdentifier ||
          (sourceOutlet && (p.outletId === sourceOutlet.id || p.outletName === sourceOutlet.name));

        if (isMatch) {
          migratedPaymentsCount += 1;
          totalPaymentsValueMigrated += p.amount || 0;
          return {
            ...p,
            outletId: targetOutlet.id,
            outletName: targetOutlet.name,
            notes: (p.notes ? p.notes + ' • ' : '') + `[تم ترحيل السند من ${sourceName} بتاريخ ${new Date().toLocaleDateString('ar-YE')}]`,
          };
        }
        return p;
      });
      paymentsRef.current = updatedPayments;
      setPayments(updatedPayments);
    }

    // 3. Migrate Sheets
    let updatedSheets = [...sheetsRef.current];
    if (includeSheets) {
      updatedSheets = updatedSheets.map((s) => {
        const isMatch =
          s.outletId === sourceOutletIdentifier ||
          s.outletName === sourceOutletIdentifier ||
          s.assignedOutletId === sourceOutletIdentifier ||
          s.assignedOutletName === sourceOutletIdentifier ||
          (sourceOutlet &&
            (s.outletId === sourceOutlet.id ||
              s.outletName === sourceOutlet.name ||
              s.assignedOutletId === sourceOutlet.id ||
              s.assignedOutletName === sourceOutlet.name));

        if (isMatch) {
          migratedSheetsCount += 1;
          totalCardsMigrated += s.cardsCount || 60;
          return {
            ...s,
            outletId: targetOutlet.id,
            outletName: targetOutlet.name,
            assignedOutletId: targetOutlet.id,
            assignedOutletName: targetOutlet.name,
          };
        }
        return s;
      });
      sheetsRef.current = updatedSheets;
      setSheets(updatedSheets);
    }

    // 4. Net Debt Transferred
    const netDebtTransferred = totalDebtFromDeliveriesMigrated - totalPaymentsValueMigrated;

    // 5. Rebalance Outlets
    const updatedOutlets = outletsRef.current.map((o) => {
      // Source outlet (if it exists as a formal entity)
      if (sourceOutlet && o.id === sourceOutlet.id) {
        return normalizeOutlet({
          ...o,
          totalDeliveredAmount: Math.max(0, o.totalDeliveredAmount - totalDeliveredValueMigrated),
          totalPaidAmount: Math.max(0, o.totalPaidAmount - totalPaymentsValueMigrated),
          currentDebt: Math.max(0, o.currentDebt - netDebtTransferred),
        });
      }
      // Target outlet
      if (o.id === targetOutlet.id) {
        return normalizeOutlet({
          ...o,
          totalDeliveredAmount: o.totalDeliveredAmount + totalDeliveredValueMigrated,
          totalPaidAmount: o.totalPaidAmount + totalPaymentsValueMigrated,
          currentDebt: Math.max(0, o.currentDebt + netDebtTransferred),
        });
      }
      return o;
    });
    outletsRef.current = updatedOutlets;
    setOutlets(updatedOutlets);

    // 6. Record Migration Event
    const migrationRecord: OutletMigrationRecord = {
      id: `MIG-${Date.now().toString().slice(-6)}`,
      timestamp: new Date().toISOString(),
      sourceOutletId: sourceOutlet?.id,
      sourceOutletName: sourceName,
      targetOutletId: targetOutlet.id,
      targetOutletName: targetOutlet.name,
      deliveriesCount: migratedDeliveriesCount,
      paymentsCount: migratedPaymentsCount,
      sheetsCount: migratedSheetsCount,
      totalCards: totalCardsMigrated,
      totalDeliveredAmount: totalDeliveredValueMigrated,
      totalPaidAmount: totalPaymentsValueMigrated,
      debtTransferred: netDebtTransferred,
      reason,
      performedBy: currentRole === 'admin' ? 'المسؤول' : 'الموزع الميداني',
      details: `تم ترحيل ${migratedDeliveriesCount} سند توريد و ${migratedPaymentsCount} سند قبض و ${migratedSheetsCount} شيت (${totalCardsMigrated} كرت). صافي المديونية المرحلة: ${netDebtTransferred.toLocaleString()} ر.ي`,
    };

    const newMigrationRecords = [migrationRecord, ...migrationRecords];
    setMigrationRecords(newMigrationRecords);

    try {
      safeStorage.setItem(STORAGE_PREFIX + 'deliveries', JSON.stringify(updatedDeliveries));
      safeStorage.setItem(STORAGE_PREFIX + 'payments', JSON.stringify(updatedPayments));
      safeStorage.setItem(STORAGE_PREFIX + 'sheets', JSON.stringify(updatedSheets));
      safeStorage.setItem(STORAGE_PREFIX + 'outlets', JSON.stringify(updatedOutlets));
      safeStorage.setItem(STORAGE_PREFIX + 'migration_records', JSON.stringify(newMigrationRecords));
    } catch {}

    pushStateToCloud({
      deliveries: updatedDeliveries,
      payments: updatedPayments,
      sheets: updatedSheets,
      outlets: updatedOutlets,
    });

    addAudit(
      'OUTLET_BULK_MIGRATION',
      `تم ترحيل وتصحيح جماعي للسجلات من "${sourceName}" إلى "${targetOutlet.name}": (${migratedDeliveriesCount} توريدات، ${migratedPaymentsCount} مقبوضات، ${migratedSheetsCount} شيتات، صافي دين ${netDebtTransferred.toLocaleString()} ر.ي).`
    );

    addNotification({
      title: 'تم الترحيل والتصحيح الجماعي بنجاح',
      message: `تم نقل ${migratedDeliveriesCount + migratedPaymentsCount} سند و ${migratedSheetsCount} شيت إلى المنفذ "${targetOutlet.name}".`,
      type: 'success',
      targetRole: 'all',
    });

    soundService.playSuccess();

    return {
      success: true,
      migratedDeliveries: migratedDeliveriesCount,
      migratedPayments: migratedPaymentsCount,
      migratedSheets: migratedSheetsCount,
      debtTransferred: netDebtTransferred,
      message: `تم بنجاح ترحيل ${migratedDeliveriesCount} سند توريد، ${migratedPaymentsCount} سند قبض، و ${migratedSheetsCount} شيت إلى "${targetOutlet.name}".`,
    };
  };

  // 10.C Auto-Fix Legacy Outlet Records (تصحيح وتوحيد تلقائي للسجلات القديمة)
  const autoFixLegacyOutletRecords = () => {
    const out2 = outletsRef.current.find((o) => o.id === 'OUT-002');
    const target = out2 || outletsRef.current[0];
    if (!target) {
      return {
        success: false,
        migratedDeliveries: 0,
        migratedPayments: 0,
        migratedSheets: 0,
        debtTransferred: 0,
        message: 'لا توجد منافذ معتمدة للتصحيح إليها',
      };
    }
    return bulkMigrateOutletRecords({
      sourceOutletIdentifier: 'بقالة البركة',
      targetOutletId: target.id,
      includeDeliveries: true,
      includePayments: true,
      includeSheets: true,
      reason: `تصحيح تلقائي وتوحيد السجلات القديمة من الاسم الافتراضي (بقالة البركة) إلى المنفذ الفعلي المعتمد (${target.name})`,
    });
  };

  // 10.D Comprehensive Outlet Debt Audit & Dynamic Reconciliation (دالة فحص وتدقيق وتصحيح ديون المنافذ)
  const auditAndReconcileOutletDebts = (options: { autoFix?: boolean } = { autoFix: true }): OutletDebtAuditReport => {
    const shouldFix = options.autoFix !== false;
    const currentOutlets = sanitizeOutletsList([...outletsRef.current]);
    const currentDeliveries = [...deliveriesRef.current];
    const currentPayments = [...paymentsRef.current];

    const details: OutletDebtAuditItem[] = [];
    let discrepancyCount = 0;
    let fixedCount = 0;
    let totalDeliveredNetwork = 0;
    let totalCashAtDeliveryNetwork = 0;
    let totalPaymentsNetwork = 0;
    let totalPaidNetwork = 0;
    let networkExpectedDebt = 0;
    let networkRecordedDebt = 0;

    const reconciledList: Outlet[] = [];

    // Ensure all 9 canonical network outlets exist in the audit
    const outletsMap = new Map<string, Outlet>();
    for (const baseO of INITIAL_CLEAN_OUTLETS) {
      outletsMap.set(baseO.id, { ...baseO });
    }
    for (const o of currentOutlets) {
      if (o && o.id) {
        const existing = outletsMap.get(o.id);
        outletsMap.set(o.id, existing ? { ...existing, ...o } : o);
      }
    }

    for (const outlet of outletsMap.values()) {
      const fin = calculateOutletFinancials(outlet, currentDeliveries, currentPayments);

      const recordedDebt = Number(outlet.currentDebt) || 0;
      const expectedDebt = fin.currentDebt;
      const discrepancy = recordedDebt - expectedDebt;
      const isBalanced = discrepancy === 0;

      if (!isBalanced) {
        discrepancyCount++;
      }

      totalDeliveredNetwork += fin.totalDeliveredAmount;
      totalCashAtDeliveryNetwork += fin.cashAtDelivery;
      totalPaymentsNetwork += fin.paymentsReceived;
      totalPaidNetwork += fin.totalPaidAmount;
      networkExpectedDebt += expectedDebt;
      networkRecordedDebt += recordedDebt;

      const creditLimit = Number(outlet.creditLimit) || 0;
      const isOverLimit = creditLimit > 0 && expectedDebt > creditLimit;

      details.push({
        outletId: outlet.id,
        outletName: outlet.name,
        deliveriesCount: fin.deliveriesCount,
        paymentsCount: fin.paymentsCount,
        cardsCount: fin.totalCardsDelivered,
        sheetsCount: fin.totalSheetsDelivered,
        totalDelivered: fin.totalDeliveredAmount,
        cashAtDelivery: fin.cashAtDelivery,
        paymentsReceived: fin.paymentsReceived,
        totalPaid: fin.totalPaidAmount,
        recordedDebt,
        expectedDebt,
        discrepancy,
        isBalanced,
        creditLimit,
        isOverLimit,
      });

      const needsCorrection =
        !isBalanced ||
        outlet.totalDeliveredAmount !== fin.totalDeliveredAmount ||
        outlet.totalPaidAmount !== fin.totalPaidAmount;

      if (shouldFix && needsCorrection) {
        fixedCount++;
        reconciledList.push({
          ...outlet,
          totalDeliveredAmount: fin.totalDeliveredAmount,
          totalPaidAmount: fin.totalPaidAmount,
          currentDebt: expectedDebt,
        });
      } else {
        reconciledList.push(outlet);
      }
    }

    if (shouldFix && fixedCount > 0) {
      const sanitizedReconciled = sanitizeOutletsList(reconciledList);
      outletsRef.current = sanitizedReconciled;
      setOutlets(sanitizedReconciled);
      try {
        safeStorage.setItem(STORAGE_PREFIX + 'outlets', JSON.stringify(sanitizedReconciled));
      } catch {}

      addAudit(
        'OUTLET_DEBT_RECONCILE',
        `تم فحص وتدقيق وتصحيح ديون المنافذ آلياً: تصحيح ${fixedCount} منافذ، إجمالي الديون المعتمدة ${networkExpectedDebt.toLocaleString('ar-YE')} ر.ي، وإجمالي التوريد التراكمي ${totalDeliveredNetwork.toLocaleString('ar-YE')} ر.ي.`
      );

      setTimeout(() => {
        pushStateToCloud();
      }, 300);
    }

    const report: OutletDebtAuditReport = {
      timestamp: new Date().toISOString(),
      totalOutletsAudited: details.length,
      balancedOutletsCount: details.length - discrepancyCount,
      discrepancyOutletsCount: discrepancyCount,
      totalDeliveredNetwork,
      totalCashAtDeliveryNetwork,
      totalPaymentsNetwork,
      totalPaidNetwork,
      networkExpectedDebt,
      networkRecordedDebt,
      totalDiscrepancy: networkRecordedDebt - networkExpectedDebt,
      isFullyBalanced: discrepancyCount === 0,
      details,
      autoFixed: shouldFix && fixedCount > 0,
      fixedOutletsCount: fixedCount,
    };

    setLastDebtAuditReport(report);
    return report;
  };

  // 11. Distributor Permissions
  const updatePermissions = (newPerms: Partial<DistributorPermissions>) => {
    setPermissions((prev) => {
      const updated = { ...prev, ...newPerms };
      return updated;
    });
    addAudit('PERMISSIONS_UPDATED', 'تم تحديث مصفوفة صلاحيات الموزع الميداني من قبل المسؤول');
    soundService.playSuccess();
  };

  // 12. Full System Zero-Reset
  const resetAllDataToZero = () => {
    setBatches([]);
    setSheets([]);
    setTransfers([]);
    setDeliveries([]);
    setPayments([]);
    setDirectSales([]);
    setCashHandovers([]);
    setSettlements([]);
    setDamagedCards([]);
    setExpenses([]);
    // Reset all outlets debts to 0
    setOutlets((prev) =>
      prev.map((o) => ({
        ...o,
        currentDebt: 0,
        totalDeliveredAmount: 0,
        totalPaidAmount: 0,
      }))
    );
    setAuditLogs([
      {
        id: `LOG-RESET-${Date.now().toString().slice(-6)}`,
        actionType: 'SYSTEM_RESET',
        actorName: 'المسؤول',
        actorRole: 'admin',
        details: 'تم إجراء تصفير كامل وشامل للنظام من الصفر، وتصفير جميع الحسابات وسجلات الطباعة والتحويل والتوريد والمصروفات',
        timestamp: new Date().toISOString(),
      },
    ]);
    setNotifications([
      {
        id: `NOTIF-${Date.now()}`,
        title: 'تم تصفير النظام بالكامل',
        message: 'تم تصفير جميع العمليات والعهد النقدية والكروت بنجاح، والنظام جاهز الآن لبدء دورة محاسبية جديدة نظيفة.',
        type: 'success',
        timestamp: new Date().toISOString(),
        isRead: false,
      },
    ]);

    soundService.playSuccess();
  };

  // 13. Export & Import JSON Backup
  const exportJSONBackup = (): string => {
    const backupData = {
      system: 'QAZAN-NET-SYSTEM',
      exportDate: new Date().toISOString(),
      batches,
      sheets,
      transfers,
      outlets,
      deliveries,
      payments,
      directSales,
      cashHandovers,
      settlements,
      damagedCards,
      auditLogs,
      expenses,
      monthlyBudgets,
      permissions,
      adminPin,
    };
    return JSON.stringify(backupData, null, 2);
  };

  const importJSONBackup = (jsonString: string): boolean => {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed.system !== 'QAZAN-NET-SYSTEM') {
        throw new Error('الملف غير مطابق لنظام قعزان نت');
      }

      if (parsed.batches) setBatches(parsed.batches);
      if (parsed.sheets) setSheets(parsed.sheets);
      if (parsed.transfers) setTransfers(parsed.transfers);
      if (parsed.outlets) setOutlets(parsed.outlets);
      if (parsed.deliveries) setDeliveries(parsed.deliveries);
      if (parsed.payments) setPayments(parsed.payments);
      if (parsed.directSales) setDirectSales(parsed.directSales);
      if (parsed.cashHandovers) setCashHandovers(parsed.cashHandovers);
      if (parsed.settlements) setSettlements(parsed.settlements);
      if (parsed.damagedCards) setDamagedCards(parsed.damagedCards);
      if (parsed.auditLogs) setAuditLogs(parsed.auditLogs);
      if (parsed.expenses) setExpenses(parsed.expenses);
      if (parsed.monthlyBudgets) setMonthlyBudgets(parsed.monthlyBudgets);
      if (parsed.permissions) setPermissions(parsed.permissions);
      if (parsed.adminPin) setAdminPinState(parsed.adminPin);

      addAudit('SYSTEM_RESET', 'تم استيراد نسخة احتياطية بنجاح إلى النظام');
      soundService.playSuccess();
      return true;
    } catch (err) {
      console.error(err);
      soundService.playAlert();
      return false;
    }
  };

  return (
    <AppContext.Provider
      value={{
        currentRole,
        setCurrentRole,
        logoutSession,
        adminPin,
        setAdminPin,
        verifyAdminPin,
        distributorPin,
        setDistributorPin,
        verifyDistributorPin,
        isDistributorSetupDone,
        setDistributorSetupDone,
        showDistributorWelcome,
        setShowDistributorWelcome,
        showShareModal,
        setShowShareModal,
        batches,
        sheets,
        transfers,
        outlets,
        deliveries,
        payments,
        directSales,
        cashHandovers,
        settlements,
        damagedCards,
        auditLogs,
        notifications,
        permissions,
        isCloudConnected,
        hasLoadedInitialCloudState,
        isHydratingCloud,
        hydrationStatus,
        isHydrated,
        hydrationValidation,
        conflictLogs,
        dismissConflictAlert,
        retryHydration,
        syncNowToCloud,
        isOnline,
        offlineQueue,
        syncOfflineQueue,
        unsyncedDeliveries,
        overdueUnsyncedDeliveries,
        unsyncedDeliveryAlertMinutes,
        setUnsyncedDeliveryAlertMinutes,
        isUnsyncedAlertDismissed,
        dismissUnsyncedAlert,
        distributorCashInHand,
        adminTotalCashCollected,
        totalOutletsDebt,
        totalPrintedCards,
        totalAdminCardsInCustody,
        totalDistributorCardsInCustody,
        totalDeliveredCards,
        expenses,
        totalExpensesAmount,
        distributorPaidExpensesAmount,
        adminPaidExpensesAmount,
        netProjectProfit,
        createExpense,
        updateExpense,
        deleteExpense,
        monthlyBudgets,
        setMonthlyBudget,
        deleteMonthlyBudget,
        getMonthlyBudget,
        addBatch,
        updateBatch,
        updateBatchDateMonth,
        deleteBatch,
        createTransfer,
        updateTransfer,
        deleteTransfer,
        reconcileCustodyDiscrepancies,
        runInventoryIntegrityCheck,
        custodyAdjustments,
        applyCustodyAdjustment,
        bulkApplyCustodyAdjustments,
        createDelivery,
        updateDelivery,
        deleteDelivery,
        createPayment,
        updatePayment,
        deletePayment,
        createDirectSale,
        updateDirectSale,
        deleteDirectSale,
        createCashHandover,
        updateCashHandover,
        deleteCashHandover,
        resolveCashHandover,
        createSettlement,
        resolveSettlement,
        recordDamage,
        addOutlet,
        updateOutlet,
        deleteOutlet,
        checkOutletNameExists,
        mergeDuplicateOutletsByName,
        migrationRecords,
        bulkMigrateOutletRecords,
        autoFixLegacyOutletRecords,
        auditAndReconcileOutletDebts,
        lastDebtAuditReport,
        updatePermissions,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        addNotification,
        resetAllDataToZero,
        exportJSONBackup,
        importJSONBackup,
        criticalThresholds,
        setCriticalThreshold,
        stockHealthList,
        criticalCategoriesCount,
        triggerStockAlertManually,
        targetPrintCategory,
        setTargetPrintCategory,
        activeTab,
        setActiveTab,
        navigateToTab,
        quickInitiatePrintBatch,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
