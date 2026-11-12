import { CardCategory, CardPricing, Outlet, DistributorPermissions } from '../types';

export const CARD_CATEGORIES_CONFIG: Record<CardCategory, CardPricing> = {
  '200': {
    category: '200',
    name: 'فئة 200 ريال',
    nominalValue: 200,
    defaultCardsPerSheet: 60,
    defaultWholesaleSheetPrice: 10000, // 10,000 للشيت
    defaultWholesaleCardPrice: 167, // 167 للكرت الواحد
    color: 'amber',
    badgeBg: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  },
  '500': {
    category: '500',
    name: 'فئة 500 ريال',
    nominalValue: 500,
    defaultCardsPerSheet: 60,
    defaultWholesaleSheetPrice: 25000, // 25,000 للشيت
    defaultWholesaleCardPrice: 417, // 417 للكرت الواحد
    color: 'emerald',
    badgeBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  },
  '1000': {
    category: '1000',
    name: 'فئة 1000 ريال',
    nominalValue: 1000,
    defaultCardsPerSheet: 60,
    defaultWholesaleSheetPrice: 50000, // 50,000 للشيت
    defaultWholesaleCardPrice: 833, // 833 للكرت الواحد
    allowCardUnits: true,
    color: 'blue',
    badgeBg: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  },
  '3000': {
    category: '3000',
    name: 'فئة 3000 ريال',
    nominalValue: 3000,
    defaultCardsPerSheet: 60,
    defaultWholesaleSheetPrice: 150000, // 150,000 للشيت
    defaultWholesaleCardPrice: 2500, // 2,500 للكرت الواحد
    allowCardUnits: true,
    color: 'purple',
    badgeBg: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  },
  '5000': {
    category: '5000',
    name: 'فئة 5000 ريال',
    nominalValue: 5000,
    defaultCardsPerSheet: 60,
    defaultWholesaleSheetPrice: 250000,
    defaultWholesaleCardPrice: 4200, // 4,200 للكرت الواحد
    allowCardUnits: true,
    color: 'rose',
    badgeBg: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  },
  '10000': {
    category: '10000',
    name: 'فئة 10000 ريال',
    nominalValue: 10000,
    defaultCardsPerSheet: 60,
    defaultWholesaleSheetPrice: 500000,
    defaultWholesaleCardPrice: 8400, // 8,400 للكرت الواحد
    allowCardUnits: true,
    color: 'cyan',
    badgeBg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  },
};

// Default critical stock threshold (in sheets) per card category for distributor custody alerts
export const DEFAULT_CRITICAL_THRESHOLDS: Record<CardCategory, number> = {
  '200': 2,   // 2 sheets (120 cards)
  '500': 2,   // 2 sheets (120 cards)
  '1000': 2,  // 2 sheets (120 cards)
  '3000': 2,  // 2 sheets (120 cards)
  '5000': 1,  // 1 sheet (60 cards)
  '10000': 1, // 1 sheet (60 cards)
};

// Canonical outlets of the network with true restored debts (un-merged and strictly separated)
export const INITIAL_CLEAN_OUTLETS: Outlet[] = [
  {
    id: 'OUT-001',
    name: 'بقالة ابوشعيب',
    ownerName: 'أبو شعيب',
    phone: '734536662',
    location: 'مرحب',
    creditLimit: 200000,
    currentDebt: 260000,
    totalDeliveredAmount: 520000,
    totalPaidAmount: 260000,
    createdAt: '2026-10-01',
    notes: 'منفذ رئيسي معتمد',
  },
  {
    id: 'OUT-002',
    name: 'منفذ أنا',
    ownerName: 'شرف',
    phone: '771940311',
    location: 'الحبله',
    creditLimit: 200000,
    currentDebt: 89990,
    totalDeliveredAmount: 294980,
    totalPaidAmount: 204990,
    createdAt: '2026-10-01',
    notes: 'الكروت التي ابيعها انا (المشرف المباشر)',
  },
  {
    id: 'OUT-003',
    name: 'بقاله حندوج وبن الفانوس',
    ownerName: 'محمد ذيه',
    phone: '737534221',
    location: 'محاول',
    creditLimit: 250000,
    currentDebt: 149990,
    totalDeliveredAmount: 294990,
    totalPaidAmount: 145000,
    createdAt: '2026-10-01',
    notes: 'مركز توزيع فرعي وسحب عالي',
  },
  {
    id: 'OUT-004',
    name: 'بقاله عبدالله احمد ابو عادل',
    ownerName: 'جعبل',
    phone: '730334003',
    location: 'مرحب /المشراجه',
    creditLimit: 200000,
    currentDebt: 180000,
    totalDeliveredAmount: 230000,
    totalPaidAmount: 50000,
    createdAt: '2026-10-01',
    notes: 'منفذ معتمد',
  },
  {
    id: 'OUT-005',
    name: 'بقاله صالح حسين القيري',
    ownerName: 'عبدالله احمد',
    phone: '734618583',
    location: 'مرحب /اللكمه',
    creditLimit: 200000,
    currentDebt: 140000,
    totalDeliveredAmount: 200000,
    totalPaidAmount: 60000,
    createdAt: '2026-10-01',
    notes: 'منفذ معتمد',
  },
  {
    id: 'OUT-006',
    name: 'منفذ ياسر جعبل',
    ownerName: 'ياسر جعبل',
    phone: '774556677',
    location: 'المثلث / مرحب',
    creditLimit: 150000,
    currentDebt: 50000,
    totalDeliveredAmount: 100000,
    totalPaidAmount: 50000,
    createdAt: '2026-10-14',
    notes: 'منفذ معتمد منفصل',
  },
  {
    id: 'OUT-007',
    name: 'مسعد الشاجع',
    ownerName: 'مسعد الشاجع',
    phone: '733999226',
    location: 'هراب',
    creditLimit: 150000,
    currentDebt: 0,
    totalDeliveredAmount: 49990,
    totalPaidAmount: 49990,
    createdAt: '2026-10-01',
    notes: 'منفذ معتمد (سداد فوري كاش)',
  },
  {
    id: 'OUT-008',
    name: 'بقالة يحيى ناحي',
    ownerName: 'يحيى ناحي',
    phone: '735112233',
    location: 'محاول / مرحب',
    creditLimit: 150000,
    currentDebt: 40000,
    totalDeliveredAmount: 40000,
    totalPaidAmount: 0,
    createdAt: '2026-10-16',
    notes: 'منفذ معتمد منفصل',
  },
  {
    id: 'OUT-009',
    name: 'خالد علي قاسم',
    ownerName: 'احمد خالد',
    phone: '782681476',
    location: 'محاول',
    creditLimit: 180000,
    currentDebt: 20000,
    totalDeliveredAmount: 70000,
    totalPaidAmount: 50000,
    createdAt: '2026-10-20',
    notes: 'مديونية قائمة فئة 200 ريال',
  },
  {
    id: 'OUT-010',
    name: 'بقاله اكرم محسن',
    ownerName: 'محمد اكرم',
    phone: '738534478',
    location: 'محاول',
    creditLimit: 200000,
    currentDebt: 0,
    totalDeliveredAmount: 70000,
    totalPaidAmount: 70000,
    createdAt: '2026-10-21',
    notes: 'منفذ معتمد (سداد فوري كاش)',
  },
];

export const DEFAULT_DISTRIBUTOR_PERMISSIONS: DistributorPermissions = {
  canEditDeliveries: true,
  canDeleteRecords: false, // Default false: distributor cannot delete records
  canViewProfitMargins: false, // Default false: profit margins reserved for admin
  canCreateOutlets: true,
  canMakeDirectSales: true,
  canViewFullAnalytics: false,
  canChangeCardPrices: false,
};

// Canonical mapping of cash payments made at the time of delivery voucher creation
// (derived from tamper-proof system creation audit logs to protect debts against accidental resets)
export const CANONICAL_DELIVERY_CASH: Record<string, number> = {
  'DEL-2026-0001': 20000,
  'DEL-2026-0002': 20000,
  'DEL-2026-0003': 50000,
  'DEL-2026-0004': 0,
  'DEL-2026-0005': 0,
  'DEL-2026-0006': 0,
  'DEL-2026-0007': 0,
  'DEL-2026-0008': 0,
  'DEL-2026-0009': 0,
  'DEL-2026-0010': 0,
  'DEL-2026-0011': 0,
  'DEL-2026-0012': 0,
  'DEL-2026-0013': 0,
  'DEL-2026-0014': 50000,
  'DEL-2026-0015': 0,
  'DEL-2026-0016': 50000,
  'DEL-2026-0017': 0,
  'DEL-2026-0018': 0,
  'DEL-2026-0019': 50000,
  'DEL-2026-0020': 20000,
  'DEL-2026-0021': 75000,
  'DEL-2026-0022': 20000,
  'DEL-2026-0023': 0,
  'DEL-2026-0024': 50000,
  'DEL-2026-0025': 50000,
  'DEL-2026-0026': 0,
  'DEL-2026-0027': 20000,
  'DEL-2026-0028': 0,
  'DEL-2026-0029': 50000,
  'DEL-2026-0030': 20000,
  'DEL-2026-0031': 25000,
  'DEL-2026-0032': 24990,
  'DEL-2026-0033': 0,
  'DEL-2026-0034': 50000,
  'DEL-2026-0035': 24990,
  'DEL-2026-0036': 0,
  'DEL-2026-0037': 0,
  'DEL-2026-0038': 0,
  'DEL-2026-0039': 0,
  'DEL-2026-0040': 0,
  'DEL-2026-0041': 0,
  'DEL-2026-0042': 0,
};

