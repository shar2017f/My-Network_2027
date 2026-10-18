// Types and models for QAZAN-NET Internet Voucher Management & Accounting System

export type UserRole = 'admin' | 'distributor';

export type CardCategory = '200' | '500' | '1000' | '3000' | '5000' | '10000';

export interface CardPricing {
  category: CardCategory;
  name: string;
  nominalValue: number; // Face value e.g. 200, 500, 1000...
  defaultCardsPerSheet: number; // 60 cards
  defaultWholesaleSheetPrice: number; // e.g. 10000 for 200, 25000 for 500, 50000 for 1000, 150000 for 3000
  color: string;
  badgeBg: string;
}

export type SheetStatus = 
  | 'admin_custody'      // في عهدة المسؤول (مطبوع)
  | 'distributor_custody'// تم تحويله لعهدة الموزع
  | 'delivered_outlet'   // تم توريده لمنفذ
  | 'sold_direct'        // تم بيعه لزبون مباشر
  | 'damaged'            // تالف
  | 'returned';          // مرتجع

export interface SheetLeaf {
  leafNumber: number; // رقم الورقة داخل الدفعة (من 1 إلى عدد أوراق الدفعة)
  batchNumber?: number; // رقم الدفعة العام (1، 2، ...)
  categoryBatchNumber?: number; // رقم الدفعة داخل الفئة (1 = الدفعة الأولى، 2 = الدفعة الثانية)
  sheetCode: string; // e.g. QZ-200-B1-S001
  batchId: string;
  category: CardCategory;
  cardsCount: number;
  status: SheetStatus;
  currentHolder: 'admin' | 'distributor' | string; // outletId if delivered
  assignedOutletId?: string;
  assignedOutletName?: string;
  transferId?: string;
  deliveryId?: string;
  damageReason?: string;
  timestamp: string;
}

export interface PrintBatch {
  id: string; // e.g. BATCH-2026-001
  batchNumber: number;
  categoryBatchNumber?: number; // رقم الدفعة داخل الفئة (1 = الدفعة الأولى، 2 = الدفعة الثانية)
  category: CardCategory;
  date: string; // YYYY-MM-DD
  accountingMonth: string; // YYYY-MM
  sheetsCount: number;
  cardsPerSheet: number;
  totalCards: number;
  totalFaceValue: number;
  wholesaleSheetPrice: number;
  totalWholesaleValue: number;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
  createdBy: string;
}

export interface CustodyTransfer {
  id: string; // TR-2026-XXXX
  date: string;
  category: CardCategory;
  batchId?: string;
  sheetsCount: number;
  leafNumbers: number[];
  sheetCodes: string[];
  totalCards: number;
  totalWholesaleValue: number;
  notes?: string;
  fromUser: string;
  toUser: string;
  createdAt: string;
}

export interface Outlet {
  id: string;
  name: string;
  ownerName: string;
  phone: string;
  location: string;
  creditLimit: number; // سقف الدين الائتماني
  currentDebt: number; // الرصيد الحالي (مصفّر عند البداية)
  totalDeliveredAmount: number; // إجمالي قيمة التوريدات
  totalPaidAmount: number; // إجمالي التسديدات
  createdAt: string;
  notes?: string;
}

export interface DeliveryVoucher {
  id: string; // DEL-2026-XXXX
  date: string;
  outletId: string;
  outletName: string;
  category: CardCategory;
  batchId?: string;
  sheetsCount: number;
  sheetCodes: string[];
  cardsCount: number;
  unitSheetPrice: number;
  totalAmount: number;
  cashPaidNow: number; // المبلغ المسدد فوراً (يضاف لكاش الموزع)
  remainingDebt: number; // المبلغ المقيد كدين على المنفذ
  paymentStatus: 'paid_full' | 'paid_partial' | 'credit';
  deliveredBy: string; // اسم الموزع
  notes?: string;
  createdAt: string;
  syncedToCloud?: boolean;
}

export interface PaymentVoucher {
  id: string; // PAY-2026-XXXX
  date: string;
  outletId: string;
  outletName: string;
  amount: number;
  paymentMethod: 'cash' | 'transfer';
  collectorName: string; // الموزع أو المسؤول
  previousDebt: number;
  newDebt: number;
  notes?: string;
  createdAt: string;
  syncedToCloud?: boolean;
}

export interface DirectSale {
  id: string; // DIR-2026-XXXX
  date: string;
  customerName: string;
  customerPhone?: string;
  category: CardCategory;
  cardsCount: number;
  unitCardPrice: number;
  totalAmount: number;
  isCredit: boolean;
  isPaid: boolean;
  soldBy: string;
  notes?: string;
  createdAt: string;
}

export interface CashHandover {
  id: string; // CSH-2026-XXXX
  date: string;
  amount: number;
  fromUser: string; // الموزع
  toUser: string;   // المسؤول
  status: 'pending' | 'accepted' | 'rejected';
  notes?: string;
  createdAt: string;
}

export interface SettlementRequest {
  id: string; // SET-2026-XXXX
  date: string;
  title: string;
  type: 'cards' | 'cash' | 'commission' | 'general';
  amount?: number;
  sheetsCount?: number;
  requestedBy: string;
  targetUser: string;
  description: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewNotes?: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface DamagedCardRecord {
  id: string; // DMG-2026-XXXX
  date: string;
  category: CardCategory;
  sheetCode?: string;
  cardsCount: number;
  reason: string;
  reportedBy: string;
  action: 'replaced' | 'written_off';
  createdAt: string;
}

export interface AuditLogItem {
  id: string;
  actionType: 
    | 'BATCH_CREATED'
    | 'BATCH_UPDATED'
    | 'TRANSFER_CREATED'
    | 'DELIVERY_CREATED'
    | 'PAYMENT_RECEIVED'
    | 'DIRECT_SALE_CREATED'
    | 'CASH_HANDOVER'
    | 'SETTLEMENT_CREATED'
    | 'SETTLEMENT_RESOLVED'
    | 'DAMAGE_REPORTED'
    | 'OUTLET_CREATED'
    | 'OUTLET_UPDATED'
    | 'PERMISSIONS_UPDATED'
    | 'CLOUD_SYNC'
    | 'SYSTEM_RESET';
  actorName: string;
  actorRole: UserRole;
  details: string;
  timestamp: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'alert';
  timestamp: string;
  isRead: boolean;
  targetRole?: UserRole | 'all';
  actionType?: 'print_decision';
  actionCategory?: CardCategory;
  recommendedSheets?: number;
}

export interface DistributorPermissions {
  canEditDeliveries: boolean;
  canDeleteRecords: boolean;
  canViewProfitMargins: boolean;
  canCreateOutlets: boolean;
  canMakeDirectSales: boolean;
  canViewFullAnalytics: boolean;
  canChangeCardPrices: boolean;
}

export type StockLevelStatus = 'out_of_stock' | 'critical' | 'low' | 'adequate';

export interface CategoryStockHealth {
  category: CardCategory;
  name: string;
  nominalValue: number;
  distributorSheets: number;
  distributorCards: number;
  adminSheets: number;
  adminCards: number;
  thresholdSheets: number;
  status: StockLevelStatus;
  statusLabel: string;
  recommendedPrintSheets: number;
  recommendedPrintFaceValue: number;
  recommendedPrintWholesaleValue: number;
  adviceMessage: string;
}
