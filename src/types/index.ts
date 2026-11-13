// Types and models for QAZAN-NET Internet Voucher Management & Accounting System

export type UserRole = 'admin' | 'distributor';

export type CardCategory = '200' | '500' | '1000' | '3000' | '5000' | '10000';

export interface CardPricing {
  category: CardCategory;
  name: string;
  nominalValue: number; // Face value e.g. 200, 500, 1000...
  defaultCardsPerSheet: number; // 60 cards
  defaultWholesaleSheetPrice: number; // e.g. 10000 for 200, 25000 for 500, 50000 for 1000, 150000 for 3000
  defaultWholesaleCardPrice?: number; // سعر الكرت بالجملة
  allowCardUnits?: boolean; // يتيح خيار الطباعة والتحويل بعدد الكروت مباشرة
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
  categoryBatchNumber?: number; // رقم الدفعة داخل الفئة للشهر (1 = الدفعة الأولى، 2 = الدفعة الثانية)
  monthBatchNumber?: number;
  accountingMonth?: string;
  sheetCode: string; // e.g. QZ-200-B1-S001
  batchId: string;
  category: CardCategory;
  cardsCount: number;
  status: SheetStatus;
  currentHolder: 'admin' | 'distributor' | string; // outletId if delivered
  assignedOutletId?: string;
  assignedOutletName?: string;
  outletId?: string;
  outletName?: string;
  transferId?: string;
  deliveryId?: string;
  damageReason?: string;
  notes?: string;
  timestamp: string;
}

export interface PrintBatch {
  id: string; // e.g. BATCH-2026-001
  batchNumber: number;
  categoryBatchNumber?: number; // رقم الدفعة داخل الفئة للشهر (1 = الدفعة الأولى، 2 = الدفعة الثانية)
  monthBatchNumber?: number;
  category: CardCategory;
  date: string; // YYYY-MM-DD
  accountingMonth: string; // YYYY-MM (e.g. 2026-11)
  sheetsCount: number;
  cardsPerSheet: number;
  totalCards: number;
  totalFaceValue: number;
  wholesaleSheetPrice: number;
  totalWholesaleValue: number;
  batchType?: 'sheets' | 'cards'; // نوع الدفعة: بالشيتات أو بعدد الكروت
  wholesaleCardPrice?: number;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
  createdBy: string;
}

export interface CustodyTransfer {
  id: string; // TR-2026-XXXX
  transferNumber?: number;
  date: string;
  accountingMonth?: string;
  category: CardCategory;
  batchId?: string;
  sheetsCount: number;
  cardsCount?: number; // عدد الكروت المحولة مباشرة
  leafNumbers: number[];
  sheetCodes: string[];
  totalCards: number;
  totalWholesaleValue: number;
  transferType?: 'sheets' | 'cards'; // نوع التحويل: بالشيتات أو بعدد الكروت مباشرة
  notes?: string;
  fromUser: string;
  toUser: string;
  recipientName?: string;
  status?: string;
  receivedAt?: string;
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
  creditBalance?: number; // رصيد دائن (فائض مدفوع لصالح المنفذ)
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
  unitCardPrice?: number;
  deliveryUnit?: 'sheets' | 'cards'; // نوع التوريد: بالشيت أو بعدد الكروت
  custodySource?: 'distributor_custody' | 'admin_custody'; // مصدر العهدة المورد منها
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
    | 'BATCH_DELETED'
    | 'TRANSFER_CREATED'
    | 'TRANSFER_UPDATED'
    | 'TRANSFER_DELETED'
    | 'DELIVERY_CREATED'
    | 'DELIVERY_UPDATED'
    | 'DELIVERY_DELETED'
    | 'PAYMENT_RECEIVED'
    | 'PAYMENT_UPDATED'
    | 'PAYMENT_DELETED'
    | 'DIRECT_SALE_CREATED'
    | 'DIRECT_SALE_UPDATED'
    | 'DIRECT_SALE_DELETED'
    | 'CASH_HANDOVER'
    | 'CASH_HANDOVER_UPDATED'
    | 'CASH_HANDOVER_DELETED'
    | 'SETTLEMENT_CREATED'
    | 'SETTLEMENT_RESOLVED'
    | 'DAMAGE_REPORTED'
    | 'OUTLET_CREATED'
    | 'OUTLET_UPDATED'
    | 'OUTLET_BULK_MIGRATION'
    | 'OUTLET_RECORDS_CORRECTED'
    | 'PERMISSIONS_UPDATED'
    | 'CLOUD_SYNC'
    | 'CUSTODY_RECONCILED'
    | 'INTEGRITY_CHECK_EXECUTED'
    | 'CUSTODY_ADJUSTMENT'
    | 'EXPENSE_CREATED'
    | 'EXPENSE_UPDATED'
    | 'EXPENSE_DELETED'
    | 'BUDGET_UPDATED'
    | 'BUDGET_DELETED'
    | 'SYSTEM_RESET'
    | 'DATA_CONFLICT'
    | 'HYDRATION_VERIFIED'
    | 'HYDRATION_BLOCKED'
    | 'ZERO_WIPE_PREVENTED'
    | 'OUTLET_DEBT_RECONCILE';
  actorName: string;
  actorRole: UserRole;
  details: string;
  timestamp: string;
}

export interface CustodyAdjustmentItem {
  id: string; // ADJ-2026-XXXX
  date: string;
  category: CardCategory;
  adjustmentType: 'deficit_write_off' | 'surplus_record' | 'inventory_reconciliation' | 'split_sheet_calibrate';
  cardsCount: number;
  sheetsCount: number;
  financialImpact: number;
  reason: string;
  approvedBy: string;
  status: 'approved' | 'pending';
  beforeDistributorCards: number;
  afterDistributorCards: number;
  createdAt: string;
}

export interface CategoryIntegrityItem {
  category: CardCategory;
  categoryName: string;
  defaultCardsPerSheet: number;
  printedCards: number;
  printedSheets: number;
  adminCards: number;
  adminSheets: number;
  distributorCards: number;
  distributorSheets: number;
  deliveredCards: number;
  deliveredSheets: number;
  directSoldCards: number;
  damagedCards: number;
  totalAccountedCards: number;
  totalAccountedSheets: number;
  discrepancyCards: number;
  discrepancySheets: number;
  splitSheetsCount: number;
  isMatched: boolean;
  notes: string[];
}

export interface SplitSheetAnalysisPart {
  id: string;
  status: SheetStatus;
  cardsCount: number;
  holder: string;
  outletName?: string;
  transferId?: string;
  deliveryId?: string;
}

export interface SplitSheetAnalysisItem {
  sheetCode: string;
  leafNumber: number;
  category: CardCategory;
  batchId: string;
  batchNumber: number;
  categoryBatchNumber: number;
  parts: SplitSheetAnalysisPart[];
  sumCards: number;
  expectedCards: number;
  isBalanced: boolean;
}

export interface InventoryIntegrityReport {
  timestamp: string;
  overallStatus: 'matched' | 'discrepancy_fixed' | 'discrepancy_detected';
  totalPrintedCards: number;
  totalAccountedCards: number;
  totalDiscrepancyCards: number;
  categories: Record<CardCategory, CategoryIntegrityItem>;
  splitSheetsAnalysis: SplitSheetAnalysisItem[];
  correctionsApplied: string[];
}

export interface OutletMigrationRecord {
  id: string; // MIG-XXXX
  timestamp: string;
  sourceOutletId?: string;
  sourceOutletName: string;
  targetOutletId: string;
  targetOutletName: string;
  deliveriesCount: number;
  paymentsCount: number;
  sheetsCount: number;
  totalCards: number;
  totalDeliveredAmount: number;
  totalPaidAmount: number;
  debtTransferred: number;
  reason?: string;
  performedBy: string;
  details?: string;
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

// ==========================================
// Expenses & Capital Accounting (المصروفات والنفقات)
// ==========================================

export type ExpenseCategory =
  | 'printing_cards'       // طباعة كروت وورق وتغليف وحبر
  | 'internet_bandwidth'   // اشتراكات الإنترنت الرئيسي (خطوط فايبر / باقات 4G / ميكروتيك)
  | 'power_energy'         // طاقة شمسية وكهرباء ومحروقات مولدات (ديزل/بترول)
  | 'maintenance_hardware' // صيانة معدات وأنتينات وكابلات ورواتر وسيكتورات
  | 'site_rentals'         // إيجارات أبراج ومواقع وأسطح محطات البث
  | 'transport_distribution'// مواصلات وتوزيع ميداني وبترول دراجة/سيارة
  | 'salaries_commissions' // رواتب وبدلات وعمولات الموزعين والمساعدين
  | 'capital_assets'       // أصول رأسمالية جديدة للمشروع (بطاريات، ألواح، راوترات)
  | 'hospitality_misc'     // ضيافة ونثريات ومصروفات إدارية
  | 'other';               // مصروفات أخرى متنوعة

export type ExpensePaymentMethod =
  | 'admin_cash'          // خزينة الإدارة / الصندوق الرئيسي
  | 'distributor_cash'    // عهدة الموزع الميدانية (يخصم من النقدية المحصلة)
  | 'bank_wallet'         // حساب بنكي / محفظة إلكترونية (الكريمي / ون كاش / جايبي)
  | 'credit_payable';     // آجل / حساب المورد والدائنين (دفع لاحق)

export interface ExpenseItem {
  id: string; // EXP-2026-XXXX
  date: string; // YYYY-MM-DD
  title: string; // بيان وعنوان المصروف
  category: ExpenseCategory;
  amount: number; // المبلغ بالريال اليمني
  paymentMethod: ExpensePaymentMethod;
  paidBy: string; // اسم من قام بالصرف (المسؤول / الموزع الميداني)
  beneficiary?: string; // المستفيد أو المورد أو الجهة
  invoiceNumber?: string; // رقم الفاتورة الورقية أو السند
  notes?: string; // تفاصيل إضافية
  isCapitalAsset?: boolean; // هل هو أصل رأسمالي للمشروع (معدات)
  status: 'paid' | 'pending' | 'credit'; // مسدد نقداً / معلق / آجل
  createdAt: string;
  updatedAt?: string;
}

export interface MonthlyBudget {
  month: string; // YYYY-MM (e.g. "2026-11")
  budgetAmount: number; // المبلغ التقديري المعتمد للشهر بالريال اليمني
  notes?: string;
  updatedAt?: string;
  updatedBy?: string;
}

// ==========================================
// Hydration Validation & Data Conflict Types
// ==========================================

export type HydrationStatus =
  | 'unhydrated'
  | 'hydrating'
  | 'validating'
  | 'ready'
  | 'conflict_detected'
  | 'error';

export interface DataConflictLog {
  id: string; // CFL-XXXX
  timestamp: string;
  type:
    | 'EMPTY_OVERWRITE_ATTEMPT'
    | 'COUNT_REGRESSION'
    | 'CORRUPTED_PAYLOAD'
    | 'SHEET_STATUS_CONFLICT'
    | 'UNAUTHORIZED_WIPE';
  severity: 'critical' | 'warning' | 'info';
  message: string;
  source: 'cloud_sync' | 'local_mutation' | 'hydration_check';
  localSnapshot: {
    batches: number;
    sheets: number;
    transfers: number;
    outlets: number;
    deliveries: number;
    payments: number;
  };
  incomingSnapshot?: {
    batches?: number;
    sheets?: number;
    transfers?: number;
    outlets?: number;
    deliveries?: number;
    payments?: number;
  };
  resolvedAction: 'BLOCKED' | 'PRESERVED_LOCAL' | 'FORCE_MERGED';
}

export interface HydrationValidationReport {
  isValid: boolean;
  status: HydrationStatus;
  batchesCount: number;
  sheetsCount: number;
  transfersCount: number;
  outletsCount: number;
  deliveriesCount: number;
  paymentsCount: number;
  errors: string[];
  warnings: string[];
  lastValidatedAt: string | null;
}

// ==========================================
// Outlet Debt Audit & Reconciliation Types
// ==========================================

export interface OutletDebtAuditItem {
  outletId: string;
  outletName: string;
  deliveriesCount: number;
  paymentsCount: number;
  cardsCount: number;
  sheetsCount: number;
  totalDelivered: number;
  cashAtDelivery: number;
  paymentsReceived: number;
  totalPaid: number;
  recordedDebt: number;
  expectedDebt: number;
  creditBalance?: number;
  discrepancy: number;
  isBalanced: boolean;
  creditLimit: number;
  isOverLimit: boolean;
}

export interface OutletDebtAuditReport {
  timestamp: string;
  totalOutletsAudited: number;
  balancedOutletsCount: number;
  discrepancyOutletsCount: number;
  totalDeliveredNetwork: number;
  totalCashAtDeliveryNetwork: number;
  totalPaymentsNetwork: number;
  totalPaidNetwork: number;
  networkExpectedDebt: number;
  networkRecordedDebt: number;
  totalDiscrepancy: number;
  isFullyBalanced: boolean;
  details: OutletDebtAuditItem[];
  autoFixed: boolean;
  fixedOutletsCount: number;
}

