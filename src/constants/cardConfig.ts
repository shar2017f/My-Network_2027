import { CardCategory, CardPricing, Outlet, DistributorPermissions } from '../types';

export const CARD_CATEGORIES_CONFIG: Record<CardCategory, CardPricing> = {
  '200': {
    category: '200',
    name: 'فئة 200 ريال',
    nominalValue: 200,
    defaultCardsPerSheet: 60,
    defaultWholesaleSheetPrice: 10000, // 10,000 للشيت
    color: 'amber',
    badgeBg: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  },
  '500': {
    category: '500',
    name: 'فئة 500 ريال',
    nominalValue: 500,
    defaultCardsPerSheet: 60,
    defaultWholesaleSheetPrice: 25000, // 25,000 للشيت
    color: 'emerald',
    badgeBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  },
  '1000': {
    category: '1000',
    name: 'فئة 1000 ريال',
    nominalValue: 1000,
    defaultCardsPerSheet: 60,
    defaultWholesaleSheetPrice: 50000, // 50,000 للشيت
    color: 'blue',
    badgeBg: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  },
  '3000': {
    category: '3000',
    name: 'فئة 3000 ريال',
    nominalValue: 3000,
    defaultCardsPerSheet: 60,
    defaultWholesaleSheetPrice: 150000, // 150,000 للشيت
    color: 'purple',
    badgeBg: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  },
  '5000': {
    category: '5000',
    name: 'فئة 5000 ريال',
    nominalValue: 5000,
    defaultCardsPerSheet: 60,
    defaultWholesaleSheetPrice: 250000,
    color: 'rose',
    badgeBg: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  },
  '10000': {
    category: '10000',
    name: 'فئة 10000 ريال',
    nominalValue: 10000,
    defaultCardsPerSheet: 60,
    defaultWholesaleSheetPrice: 500000,
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

// Initial clean outlets with ZERO previous debt (0 ر.ي)
export const INITIAL_CLEAN_OUTLETS: Outlet[] = [
  {
    id: 'OUT-001',
    name: 'منفذ أبو شعيب',
    ownerName: 'أبو شعيب',
    phone: '777123456',
    location: 'الشارع العام - بجوار مدرسة النجاح',
    creditLimit: 150000,
    currentDebt: 0,
    totalDeliveredAmount: 0,
    totalPaidAmount: 0,
    createdAt: '2026-10-01',
    notes: 'منفذ رئيسي معتمد',
  },
  {
    id: 'OUT-002',
    name: 'بقالة البركة',
    ownerName: 'عبدالرحمن قاسم',
    phone: '771987654',
    location: 'حي الأندلس - المربع الثالث',
    creditLimit: 100000,
    currentDebt: 0,
    totalDeliveredAmount: 0,
    totalPaidAmount: 0,
    createdAt: '2026-10-01',
    notes: 'سداد منتظم أسبوعي',
  },
  {
    id: 'OUT-003',
    name: 'مركز الأمل للاتصالات',
    ownerName: 'محمد سعيد',
    phone: '733456789',
    location: 'جولة السوق المركزي',
    creditLimit: 250000,
    currentDebt: 0,
    totalDeliveredAmount: 0,
    totalPaidAmount: 0,
    createdAt: '2026-10-01',
    notes: 'مركز توزيع فرعي وسحب عالي',
  },
  {
    id: 'OUT-004',
    name: 'بقالة النور',
    ownerName: 'صالح علي',
    phone: '775654321',
    location: 'حارة الروضة الشرقية',
    creditLimit: 80000,
    currentDebt: 0,
    totalDeliveredAmount: 0,
    totalPaidAmount: 0,
    createdAt: '2026-10-01',
  },
  {
    id: 'OUT-005',
    name: 'بوفية الشباب',
    ownerName: 'هشام طاهر',
    phone: '711223344',
    location: 'مفرق الجامعة',
    creditLimit: 50000,
    currentDebt: 0,
    totalDeliveredAmount: 0,
    totalPaidAmount: 0,
    createdAt: '2026-10-01',
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
