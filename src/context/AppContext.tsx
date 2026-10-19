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
  AppNotification,
  DistributorPermissions,
  CardCategory,
  CategoryStockHealth,
  StockLevelStatus,
} from '../types';
import {
  CARD_CATEGORIES_CONFIG,
  INITIAL_CLEAN_OUTLETS,
  DEFAULT_DISTRIBUTOR_PERMISSIONS,
  DEFAULT_CRITICAL_THRESHOLDS,
} from '../constants/cardConfig';
import { soundService } from '../utils/sound';
import { cloudSync, CloudNetworkState } from '../services/firestoreSync';
import { testFirestoreConnection } from '../firebase';
import { ActiveTab } from '../components/Sidebar';
import { onServiceWorkerSync, requestBackgroundSync } from '../services/serviceWorkerRegistration';
import { getCategoryBatchNumber } from '../utils/batchNaming';
import { safeStorage } from '../utils/safeStorage';

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

  // Authentication & Role
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
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
  notifications: AppNotification[];
  permissions: DistributorPermissions;

  // Cloud Real-Time Sync
  isCloudConnected: boolean;
  syncNowToCloud: () => Promise<boolean>;

  // Financial & Inventory KPIs
  distributorCashInHand: number;
  adminTotalCashCollected: number;
  totalOutletsDebt: number;
  totalPrintedCards: number;
  totalAdminCardsInCustody: number;
  totalDistributorCardsInCustody: number;
  totalDeliveredCards: number;

  // Actions
  addBatch: (data: {
    category: CardCategory;
    date: string;
    accountingMonth: string;
    sheetsCount: number;
    cardsPerSheet?: number;
    wholesaleSheetPrice?: number;
    notes?: string;
  }) => PrintBatch;
  updateBatchDateMonth: (batchId: string, newDate: string, newMonth: string) => boolean;
  createTransfer: (data: {
    category: CardCategory;
    sheetsCount: number;
    leafNumbers?: number[];
    sheetCodes?: string[];
    batchId?: string;
    notes?: string;
  }) => CustodyTransfer;
  createDelivery: (data: {
    outletId: string;
    category: CardCategory;
    sheetCodes: string[];
    sheetsCount: number;
    unitSheetPrice: number;
    cashPaidNow: number;
    notes?: string;
    date?: string;
    batchId?: string;
  }) => DeliveryVoucher;
  createPayment: (data: {
    outletId: string;
    amount: number;
    paymentMethod: 'cash' | 'transfer';
    notes?: string;
    date?: string;
  }) => PaymentVoucher;
  createDirectSale: (data: {
    customerName: string;
    customerPhone?: string;
    category: CardCategory;
    cardsCount: number;
    unitCardPrice: number;
    isCredit: boolean;
    notes?: string;
  }) => DirectSale;
  createCashHandover: (amount: number, notes?: string) => CashHandover;
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
      setCurrentRole('admin');
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
    return list.map((item, idx) => normalizeOutlet(item, idx));
  };

  // Load initial state or defaults safely
  const [currentRole, setCurrentRole] = useState<UserRole>(() => {
    try {
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        const roleParam = urlParams.get('role');
        if (roleParam === 'distributor') {
          safeStorage.setItem(STORAGE_PREFIX + 'role', 'distributor');
          return 'distributor';
        }
        if (roleParam === 'admin') {
          safeStorage.setItem(STORAGE_PREFIX + 'role', 'admin');
          return 'admin';
        }
      }
      return (safeStorage.getItem(STORAGE_PREFIX + 'role') as UserRole) || 'admin';
    } catch {
      return 'admin';
    }
  });

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

  const [batches, setBatches] = useState<PrintBatch[]>(() => loadStored('batches', []));
  const [sheets, setSheets] = useState<SheetLeaf[]>(() => loadStored('sheets', []));
  const [transfers, setTransfers] = useState<CustodyTransfer[]>(() => loadStored('transfers', []));
  const [outlets, setOutlets] = useState<Outlet[]>(() => {
    const loaded = loadStored('outlets', INITIAL_CLEAN_OUTLETS);
    return sanitizeOutletsList(loaded);
  });
  const [deliveries, setDeliveries] = useState<DeliveryVoucher[]>(() => loadStored('deliveries', []));
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

  // Helper to push state to Cloud
  const pushStateToCloud = async (override?: Partial<CloudNetworkState>) => {
    isLocalUpdateRef.current = true;
    if (override?.batches) batchesRef.current = override.batches;
    if (override?.sheets) sheetsRef.current = override.sheets;
    if (override?.transfers) transfersRef.current = override.transfers;
    if (override?.outlets) outletsRef.current = override.outlets;
    if (override?.deliveries) deliveriesRef.current = override.deliveries;
    if (override?.payments) paymentsRef.current = override.payments;
    if (override?.directSales) directSalesRef.current = override.directSales;
    if (override?.cashHandovers) cashHandoversRef.current = override.cashHandovers;
    if (override?.settlements) settlementsRef.current = override.settlements;
    if (override?.damagedCards) damagedCardsRef.current = override.damagedCards;
    if (override?.auditLogs) auditLogsRef.current = override.auditLogs;

    // Immediately update fingerprint so incoming self-echoes don't cause thrashing
    lastStateFingerprintRef.current = `${batchesRef.current.length}_${sheetsRef.current.length}_${transfersRef.current.length}_${outletsRef.current.length}_${deliveriesRef.current.length}_${paymentsRef.current.length}_${directSalesRef.current.length}_${cashHandoversRef.current.length}_${settlementsRef.current.length}_${damagedCardsRef.current.length}_${auditLogsRef.current.length}_${adminPin}`;

    try {
      const payload: Omit<CloudNetworkState, 'updatedAt'> = {
        batches: override?.batches ?? batchesRef.current,
        sheets: override?.sheets ?? sheetsRef.current,
        transfers: override?.transfers ?? transfersRef.current,
        outlets: override?.outlets ?? outletsRef.current,
        deliveries: override?.deliveries ?? deliveriesRef.current,
        payments: override?.payments ?? paymentsRef.current,
        directSales: override?.directSales ?? directSalesRef.current,
        cashHandovers: override?.cashHandovers ?? cashHandoversRef.current,
        settlements: override?.settlements ?? settlementsRef.current,
        damagedCards: override?.damagedCards ?? damagedCardsRef.current,
        auditLogs: override?.auditLogs ?? auditLogsRef.current,
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

  // Subscribe to real-time Cloud updates from other device
  useEffect(() => {
    testFirestoreConnection().then((ok) => {
      setIsCloudConnected(ok);
    });

    // 1. Full state synchronization listener
    const unsubscribeState = cloudSync.subscribeToCloudState((remoteState) => {
      if (isLocalUpdateRef.current) return;

      // Fingerprint check to prevent unneeded re-renders and ping-pong sync loops
      const fingerprint = `${remoteState.batches?.length || 0}_${remoteState.sheets?.length || 0}_${remoteState.transfers?.length || 0}_${remoteState.outlets?.length || 0}_${remoteState.deliveries?.length || 0}_${remoteState.payments?.length || 0}_${remoteState.directSales?.length || 0}_${remoteState.cashHandovers?.length || 0}_${remoteState.settlements?.length || 0}_${remoteState.damagedCards?.length || 0}_${remoteState.auditLogs?.length || 0}_${remoteState.adminPin || ''}`;

      if (fingerprint === lastStateFingerprintRef.current) {
        setIsCloudConnected(true);
        return;
      }
      lastStateFingerprintRef.current = fingerprint;

      // Mark that incoming updates are remote so the debounced effect does NOT re-push them
      isRemoteSyncRef.current = true;

      let shouldPushLocalToCloud = false;

      // 1. Batches: smart union by ID
      const remoteBatches = remoteState.batches || [];
      const localBatches = batchesRef.current || [];
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
      const mergedBatches = Array.from(mergedBatchesMap.values());
      batchesRef.current = mergedBatches;
      setBatches(mergedBatches);
      try {
        safeStorage.setItem(STORAGE_PREFIX + 'batches', JSON.stringify(mergedBatches));
      } catch {}

      // 2. Outlets: smart union & financial activity preservation
      const remoteOutlets = sanitizeOutletsList(remoteState.outlets || []);
      const localOutlets = sanitizeOutletsList(outletsRef.current || []);
      const mergedOutletsMap = new Map<string, Outlet>();
      for (const o of remoteOutlets) {
        if (o && o.id) mergedOutletsMap.set(o.id, o);
      }
      for (const localO of localOutlets) {
        if (localO && localO.id) {
          const remoteO = mergedOutletsMap.get(localO.id);
          if (!remoteO) {
            mergedOutletsMap.set(localO.id, localO);
            shouldPushLocalToCloud = true;
          } else {
            // Compare recorded financial activity
            const localActivity = (localO.totalDeliveredAmount || 0) + (localO.totalPaidAmount || 0);
            const remoteActivity = (remoteO.totalDeliveredAmount || 0) + (remoteO.totalPaidAmount || 0);
            if (localActivity > remoteActivity) {
              mergedOutletsMap.set(localO.id, {
                ...remoteO,
                ...localO,
                currentDebt: localO.currentDebt,
                totalDeliveredAmount: localO.totalDeliveredAmount,
                totalPaidAmount: localO.totalPaidAmount,
              });
              shouldPushLocalToCloud = true;
            } else {
              // Preserve edited real names/phone/location if remote still had generic defaults
              mergedOutletsMap.set(localO.id, {
                ...remoteO,
                name: localO.name && localO.name !== 'بقالة الوفاء' && remoteO.name === 'بقالة الوفاء' ? localO.name : remoteO.name,
                phone: localO.phone || remoteO.phone,
                location: localO.location || remoteO.location,
                ownerName: localO.ownerName || remoteO.ownerName,
              });
            }
          }
        }
      }
      const mergedOutlets = sanitizeOutletsList(Array.from(mergedOutletsMap.values()));
      outletsRef.current = mergedOutlets;
      setOutlets(mergedOutlets);
      try {
        safeStorage.setItem(STORAGE_PREFIX + 'outlets', JSON.stringify(mergedOutlets));
      } catch {}

      // 3. Sheets: status progression priority (delivered_outlet > with_distributor > with_admin > in_print)
      const remoteSheets = remoteState.sheets || [];
      const localSheets = sheetsRef.current || [];
      const mergedSheetsMap = new Map<string, SheetLeaf>();
      const sheetStatusRank: Record<string, number> = {
        delivered_outlet: 4,
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
          const bNum = localSheet.batchNumber || parseInt(localSheet.sheetCode?.match(/B(\d+)/)?.[1] || '1', 10);
          const leafNum = localSheet.leafNumber || parseInt(localSheet.sheetCode?.match(/S(\d+)/)?.[1] || '1', 10);
          const bInfo = mergedBatches.find((b) => b.id === localSheet.batchId);
          const catBNum = localSheet.categoryBatchNumber || (bInfo ? getCategoryBatchNumber(bInfo, mergedBatches) : bNum);
          const normalizedLocal = { ...localSheet, batchNumber: bNum, leafNumber: leafNum, categoryBatchNumber: catBNum };
          const remoteSheet = mergedSheetsMap.get(localSheet.sheetCode);
          if (!remoteSheet) {
            mergedSheetsMap.set(localSheet.sheetCode, normalizedLocal);
            shouldPushLocalToCloud = true;
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
      const mergedSheets = Array.from(mergedSheetsMap.values());
      sheetsRef.current = mergedSheets;
      setSheets(mergedSheets);
      try {
        safeStorage.setItem(STORAGE_PREFIX + 'sheets', JSON.stringify(mergedSheets));
      } catch {}

      // 4. Transfers: union by ID
      const remoteTransfers = remoteState.transfers || [];
      const localTransfers = transfersRef.current || [];
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
      const mergedTransfers = Array.from(mergedTransMap.values());
      transfersRef.current = mergedTransfers;
      setTransfers(mergedTransfers);
      try {
        safeStorage.setItem(STORAGE_PREFIX + 'transfers', JSON.stringify(mergedTransfers));
      } catch {}

      // 5. Deliveries (سندات التوريد والتسليم): union by ID - never delete local deliveries!
      const remoteDeliveries = remoteState.deliveries || [];
      const localDeliveries = deliveriesRef.current || [];
      const mergedDelsMap = new Map<string, DeliveryVoucher>();
      for (const d of remoteDeliveries) {
        if (d && d.id) mergedDelsMap.set(d.id, { ...d, syncedToCloud: true });
      }
      for (const d of localDeliveries) {
        if (d && d.id) {
          if (!mergedDelsMap.has(d.id)) {
            mergedDelsMap.set(d.id, { ...d, syncedToCloud: false });
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

      // 6. Payments (سندات القبض والاستلام): union by ID - never delete local payments!
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
      const mergedSettlementsMap = new Map<string, SettlementRequest>();
      for (const s of remoteSettlements) {
        if (s && s.id) mergedSettlementsMap.set(s.id, s);
      }
      for (const s of localSettlements) {
        if (s && s.id && !mergedSettlementsMap.has(s.id)) {
          mergedSettlementsMap.set(s.id, s);
          shouldPushLocalToCloud = true;
        }
      }
      const mergedSettlements = Array.from(mergedSettlementsMap.values()).sort(
        (a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime()
      );
      settlementsRef.current = mergedSettlements;
      setSettlements(mergedSettlements);
      try {
        safeStorage.setItem(STORAGE_PREFIX + 'settlements', JSON.stringify(mergedSettlements));
      } catch {}

      // 10. Damaged Cards: union by ID
      const remoteDamages = remoteState.damagedCards || [];
      const localDamages = damagedCardsRef.current || [];
      const mergedDamagesMap = new Map<string, DamagedCardRecord>();
      for (const d of remoteDamages) {
        if (d && d.id) mergedDamagesMap.set(d.id, d);
      }
      for (const d of localDamages) {
        if (d && d.id && !mergedDamagesMap.has(d.id)) {
          mergedDamagesMap.set(d.id, d);
          shouldPushLocalToCloud = true;
        }
      }
      const mergedDamagedCards = Array.from(mergedDamagesMap.values()).sort(
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

      setIsCloudConnected(true);

      // If local had unsynced records that the cloud didn't have, immediately push them!
      if (shouldPushLocalToCloud) {
        setTimeout(() => {
          pushStateToCloud();
        }, 150);
      }
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
      lastStateFingerprintRef.current = `${batchesRef.current.length}_${sheetsRef.current.length}_${transfersRef.current.length}_${outletsRef.current.length}_${deliveriesRef.current.length}_${paymentsRef.current.length}_${directSalesRef.current.length}_${cashHandoversRef.current.length}_${settlementsRef.current.length}_${damagedCardsRef.current.length}_${auditLogsRef.current.length}_${adminPin}`;
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
    permissions,
    criticalThresholds,
  ]);

  // Save to localStorage whenever state changes
  useEffect(() => {
    safeStorage.setItem(STORAGE_PREFIX + 'role', currentRole);
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

    return Math.max(0, deliveryCash + paymentCash + directCash - handedOver);
  }, [deliveries, payments, directSales, cashHandovers]);

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
      const distSheets = sheets.filter(
        (s) => s.category === cat && s.status === 'distributor_custody'
      ).length;
      const adminSheets = sheets.filter(
        (s) => s.category === cat && s.status === 'admin_custody'
      ).length;
      const threshold = criticalThresholds[cat] ?? 2;
      const distCards = distSheets * config.defaultCardsPerSheet;
      const adminCards = adminSheets * config.defaultCardsPerSheet;

      let status: StockLevelStatus = 'adequate';
      let statusLabel = 'رصيد كافٍ وآمن';
      if (distSheets === 0) {
        status = 'out_of_stock';
        statusLabel = 'نفد بالكامل 🚨';
      } else if (distSheets <= threshold) {
        status = 'critical';
        statusLabel = `مستوى حرج (${distSheets} شيت) ⚠️`;
      } else if (distSheets <= threshold * 1.5) {
        status = 'low';
        statusLabel = `منخفض (${distSheets} شيت) ⚠️`;
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
      const distSheets = currentSheets.filter(
        (s) => s.category === cat && s.status === 'distributor_custody'
      ).length;
      const threshold = criticalThresholds[cat] ?? 2;

      if (distSheets <= threshold) {
        // Prevent continuous duplicate alert for the exact same stock count
        const lastAlerted = lastAlertedStockRef.current[cat];
        if (lastAlerted === distSheets) {
          return;
        }
        lastAlertedStockRef.current[cat] = distSheets;

        const adminSheets = currentSheets.filter(
          (s) => s.category === cat && s.status === 'admin_custody'
        ).length;
        const distCards = distSheets * config.defaultCardsPerSheet;
        const recSheets = cat === '5000' || cat === '10000' ? 5 : 15;

        // Sound alert
        soundService.playCriticalStockAlert();

        const title = distSheets === 0
          ? `🚨 نفاد تام: كروت فئة ${cat} لدى الموزع`
          : `⚠️ تنبيه مستوى حرج: رصيد فئة ${cat} لدى الموزع (${distSheets} شيت)`;
        
        const message = distSheets === 0
          ? `نفد رصيد فئة ${cat} ريال تماماً لدى الموزع الميداني! الرصيد في مخزن المسؤول: ${adminSheets} شيت. توصية الطباعة: يُرجى طباعة دفعة جديدة فوراً بعدد ${recSheets} شيت لتزويد المنافذ.`
          : `وصل رصيد فئة ${cat} ريال لدى الموزع الميداني إلى ${distSheets} شيت فقط (${distCards} كرت)، وهو عند الحد الحرج (≤ ${threshold} شيت)! الرصيد في مخزنك: ${adminSheets} شيت. القرار المقترح: التجهيز لطباعة دفعة قادمة (${recSheets} شيت).`;

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
    const distSheets = sheets.filter(
      (s) => s.category === category && s.status === 'distributor_custody'
    ).length;
    const adminSheets = sheets.filter(
      (s) => s.category === category && s.status === 'admin_custody'
    ).length;
    const threshold = criticalThresholds[category] ?? 2;
    const recSheets = category === '5000' || category === '10000' ? 5 : 15;

    soundService.playCriticalStockAlert();

    const title = `⚠️ [تنبيه تجريبي] رصيد فئة ${category} لدى الموزع`;
    const message = `تنبيه تجريبي ذكي: رصيد فئة ${category} حالياً ${distSheets} شيت (الحد الحرج: ${threshold} شيت). مخزن المسؤول: ${adminSheets} شيت. توصية الطباعة: ${recSheets} شيت.`;

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
    notes,
  }: {
    category: CardCategory;
    date: string;
    accountingMonth: string;
    sheetsCount: number;
    cardsPerSheet?: number;
    wholesaleSheetPrice?: number;
    notes?: string;
  }): PrintBatch => {
    const config = CARD_CATEGORIES_CONFIG[category];
    const unitPrice = wholesaleSheetPrice ?? config.defaultWholesaleSheetPrice;
    const maxBatchNumber = batchesRef.current.reduce((max, b) => Math.max(max, b.batchNumber || 0), 0);
    const batchNumber = maxBatchNumber + 1;
    // Calculate sequential batch number within this category (e.g. 1st batch of 500, 2nd batch of 500)
    const categoryBatches = batchesRef.current.filter((b) => b.category === category);
    const maxCatBatchNumber = categoryBatches.reduce((max, b) => Math.max(max, b.categoryBatchNumber || 0), 0);
    const categoryBatchNumber = maxCatBatchNumber + 1;
    const batchId = `BATCH-2026-${String(batchNumber).padStart(3, '0')}`;
    const totalCards = sheetsCount * cardsPerSheet;
    const totalFaceValue = totalCards * config.nominalValue;
    const totalWholesaleValue = sheetsCount * unitPrice;

    const newBatch: PrintBatch = {
      id: batchId,
      batchNumber,
      categoryBatchNumber,
      category,
      date,
      accountingMonth,
      sheetsCount,
      cardsPerSheet,
      totalCards,
      totalFaceValue,
      wholesaleSheetPrice: unitPrice,
      totalWholesaleValue,
      notes,
      createdAt: new Date().toISOString(),
      createdBy: 'المسؤول',
    };

    // Generate individual sheet leaves for leaf-by-leaf tracking (independent 1..sheetsCount for this batch)
    const newSheets: SheetLeaf[] = [];
    for (let i = 1; i <= sheetsCount; i++) {
      const leafNumber = i;
      const sheetCode = `QZ-${category}-B${batchNumber}-S${String(leafNumber).padStart(3, '0')}`;
      newSheets.push({
        leafNumber,
        batchNumber,
        categoryBatchNumber,
        sheetCode,
        batchId,
        category,
        cardsCount: cardsPerSheet,
        status: 'admin_custody',
        currentHolder: 'admin',
        timestamp: new Date().toISOString(),
      });
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

    addAudit(
      'BATCH_CREATED',
      `تمت طباعة دفعة جديدة #${batchNumber} فئة ${category} بعدد ${sheetsCount} شيت (${totalCards} كرت) بقيمة جملة ${totalWholesaleValue.toLocaleString()} ر.ي لشهر ${accountingMonth}`
    );

    addNotification({
      title: 'دفعة طباعة جديدة',
      message: `قام المسؤول بإضافة الدفعة #${batchNumber} فئة ${category} (${sheetsCount} شيت). الكروت جاهزة في العهدة.`,
      type: 'info',
      targetRole: 'distributor',
    });

    // Broadcast live snapshot event to distributor
    cloudSync.emitLiveEvent({
      eventType: 'BATCH_CREATED',
      title: 'دفعة طباعة كروت جديدة',
      message: `قام المسؤول بتسجيل دفعة طباعة كروت جديدة #${batchNumber} فئة ${category} بعدد ${sheetsCount} شيت (${totalCards} كرت).`,
      actorRole: 'admin',
      targetRole: 'distributor',
      category,
      sheetsCount,
    });

    soundService.playSuccess();
    return newBatch;
  };

  // 2. Update Batch Date and Month
  const updateBatchDateMonth = (batchId: string, newDate: string, newMonth: string): boolean => {
    const existing = batches.find((b) => b.id === batchId);
    if (!existing) return false;

    setBatches((prev) =>
      prev.map((b) =>
        b.id === batchId
          ? {
              ...b,
              date: newDate,
              accountingMonth: newMonth,
              updatedAt: new Date().toISOString(),
            }
          : b
      )
    );

    addAudit(
      'BATCH_UPDATED',
      `تم تعديل تاريخ الدفعة ${existing.id} إلى ${newDate} والشهر المحاسبي إلى ${newMonth}`
    );

    soundService.playSuccess();
    return true;
  };

  // 3. Create Transfer (Admin -> Distributor)
  const createTransfer = ({
    category,
    sheetsCount,
    leafNumbers = [],
    sheetCodes,
    batchId,
    notes,
  }: {
    category: CardCategory;
    sheetsCount: number;
    leafNumbers?: number[];
    sheetCodes?: string[];
    batchId?: string;
    notes?: string;
  }): CustodyTransfer => {
    const config = CARD_CATEGORIES_CONFIG[category];
    const transferNumber = transfers.length + 1;
    const transferId = `TR-2026-${String(transferNumber).padStart(4, '0')}`;
    const totalCards = sheetsCount * config.defaultCardsPerSheet;
    const totalWholesaleValue = sheetsCount * config.defaultWholesaleSheetPrice;

    // Find and update sheets status
    const selectedSheetCodes: string[] = [];
    const resolvedLeafNumbers: number[] = [...leafNumbers];

    const updatedSheets = sheetsRef.current.map((sheet) => {
      const isTarget = sheetCodes && sheetCodes.length > 0
        ? sheetCodes.includes(sheet.sheetCode)
        : sheet.category === category &&
          sheet.status === 'admin_custody' &&
          (batchId ? sheet.batchId === batchId : true) &&
          leafNumbers.includes(sheet.leafNumber);

      if (isTarget && sheet.status === 'admin_custody') {
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
    setSheets(updatedSheets);

    const newTransfer: CustodyTransfer = {
      id: transferId,
      date: new Date().toISOString().split('T')[0],
      category,
      batchId,
      sheetsCount,
      leafNumbers: resolvedLeafNumbers,
      sheetCodes: selectedSheetCodes,
      totalCards,
      totalWholesaleValue,
      notes,
      fromUser: 'المسؤول',
      toUser: 'الموزع الميداني',
      createdAt: new Date().toISOString(),
    };

    const updatedTransfers = [newTransfer, ...transfersRef.current];
    transfersRef.current = updatedTransfers;
    sheetsRef.current = updatedSheets;

    setTransfers(updatedTransfers);
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

    // Broadcast live snapshot event to distributor
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
  };

  // 4. Create Delivery Voucher to Outlet
  const createDelivery = ({
    outletId,
    category,
    sheetCodes,
    sheetsCount,
    unitSheetPrice,
    cashPaidNow,
    notes,
    date,
    batchId,
  }: {
    outletId: string;
    category: CardCategory;
    sheetCodes: string[];
    sheetsCount: number;
    unitSheetPrice: number;
    cashPaidNow: number;
    notes?: string;
    date?: string;
    batchId?: string;
  }): DeliveryVoucher => {
    const outlet = outlets.find((o) => o.id === outletId);
    if (!outlet) throw new Error('المنفذ غير موجود');

    const config = CARD_CATEGORIES_CONFIG[category];
    const deliveryNum = deliveries.length + 1;
    const deliveryId = `DEL-2026-${String(deliveryNum).padStart(4, '0')}`;
    const cardsCount = sheetsCount * config.defaultCardsPerSheet;
    const totalAmount = sheetsCount * unitSheetPrice;
    const remainingDebt = Math.max(0, totalAmount - cashPaidNow);

    let paymentStatus: DeliveryVoucher['paymentStatus'] = 'credit';
    if (cashPaidNow >= totalAmount) {
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
      sheetsCount,
      sheetCodes,
      cardsCount,
      unitSheetPrice,
      totalAmount,
      cashPaidNow,
      remainingDebt,
      paymentStatus,
      deliveredBy: currentRole === 'admin' ? 'المسؤول' : 'الموزع الميداني',
      notes,
      createdAt: new Date().toISOString(),
      syncedToCloud: false,
    };

    // Update sheets status to delivered_outlet
    const updatedSheets = sheetsRef.current.map((s) => {
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
    setSheets(updatedSheets);
    checkAndTriggerCriticalStockAlert(category, updatedSheets);

    // Update Outlet financials
    const updatedOutlets = outletsRef.current.map((o) => {
      if (o.id === outletId) {
        return {
          ...o,
          currentDebt: o.currentDebt + remainingDebt,
          totalDeliveredAmount: o.totalDeliveredAmount + totalAmount,
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

    addAudit(
      'DELIVERY_CREATED',
      `سند توريد ${deliveryId} لمنفذ "${outlet.name}": فئة ${category} بعدد ${sheetsCount} شيت بمبلغ ${totalAmount.toLocaleString()} ر.ي (مدفوع كاش: ${cashPaidNow.toLocaleString()}، دين متبقي: ${remainingDebt.toLocaleString()} ر.ي)`
    );

    addNotification({
      title: 'توريد كروت لمنفذ',
      message: `تم توريد ${sheetsCount} شيت فئة ${category} لمنفذ "${outlet.name}" بسند ${deliveryId}.`,
      type: 'success',
      targetRole: 'all',
    });

    // Broadcast live snapshot event to Admin
    cloudSync.emitLiveEvent({
      eventType: 'DELIVERY_CREATED',
      title: 'توريد كروت لمنفذ (DEL)',
      message: `قام ${currentRole === 'distributor' ? 'الموزع الميداني' : 'المسؤول'} بتوريد ${sheetsCount} شيت فئة ${category} لمنفذ "${outlet.name}" بمبلغ ${totalAmount.toLocaleString()} ر.ي (مدفوع كاش: ${cashPaidNow.toLocaleString()} ر.ي).`,
      actorRole: currentRole,
      targetRole: currentRole === 'distributor' ? 'admin' : 'distributor',
      outletName: outlet.name,
      amount: totalAmount,
      category,
      sheetsCount,
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

  // 10. Outlets Management
  const addOutlet = (
    data: Omit<Outlet, 'id' | 'currentDebt' | 'totalDeliveredAmount' | 'totalPaidAmount' | 'createdAt'>
  ): Outlet => {
    const newId = `OUT-${String(outletsRef.current.length + 1).padStart(3, '0')}`;
    const newOutlet: Outlet = normalizeOutlet({
      ...data,
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
    let targetName = '';
    const updated = outletsRef.current.map((o) => {
      if (o.id === id) {
        targetName = updates.name || o.name;
        return normalizeOutlet({ ...o, ...updates });
      }
      return o;
    });
    outletsRef.current = updated;
    setOutlets(updated);
    try {
      safeStorage.setItem(STORAGE_PREFIX + 'outlets', JSON.stringify(updated));
    } catch {}
    pushStateToCloud({ outlets: updated });
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
        details: 'تم إجراء تصفير كامل وشامل للنظام من الصفر، وتصفير جميع الحسابات وسجلات الطباعة والتحويل والتوريد',
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
        addBatch,
        updateBatchDateMonth,
        createTransfer,
        createDelivery,
        createPayment,
        createDirectSale,
        createCashHandover,
        resolveCashHandover,
        createSettlement,
        resolveSettlement,
        recordDamage,
        addOutlet,
        updateOutlet,
        deleteOutlet,
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
