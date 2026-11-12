import React, { useState, useMemo } from 'react';
import {
  Store,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  Phone,
  MapPin,
  AlertTriangle,
  FileText,
  Share2,
  Printer,
  X,
  Search,
  MessageCircle,
  Coins,
  Receipt,
  CheckCircle,
  Calendar,
  Layers,
  CheckSquare,
  Square,
  Clock,
  Eye,
  CalendarDays,
  Sparkles,
  PackageCheck,
  TrendingUp,
  Filter,
  Check,
  Hash,
  Edit3,
  Trash2,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Outlet, DeliveryVoucher, PaymentVoucher, CardCategory, SheetLeaf } from '../types';
import { OutletStatementModal } from '../components/OutletStatementModal';
import { CARD_CATEGORIES_CONFIG } from '../constants/cardConfig';
import {
  formatSheetWithBatch,
  formatSheetBadge,
  formatSheetListGrouped,
  formatSheetCodeWithBatch,
  getBatchOrdinalName,
  getCategoryBatchNumber,
  ORDINAL_ARABIC,
} from '../utils/batchNaming';

// Helper to format Arabic date with day of week
const formatArabicDate = (dateStr: string) => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return new Intl.DateTimeFormat('ar-YE', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(d);
  } catch {
    return dateStr;
  }
};

export const OutletsView: React.FC = () => {
  const {
    currentRole,
    outlets,
    sheets,
    batches,
    deliveries,
    payments,
    addOutlet,
    updateOutlet,
    deleteOutlet,
    checkOutletNameExists,
    mergeDuplicateOutletsByName,
    createDelivery,
    updateDelivery,
    deleteDelivery,
    createPayment,
    updatePayment,
    deletePayment,
    permissions,
    auditAndReconcileOutletDebts,
    lastDebtAuditReport,
  } = useApp();

  const [activeOutletsTab, setActiveOutletsTab] = useState<'outlets' | 'deliveries' | 'payments'>('outlets');
  const [searchQuery, setSearchQuery] = useState('');
  const [outletFilter, setOutletFilter] = useState<'all' | 'debt' | 'zero' | 'overlimit'>('all');
  const [deliveryFilterCategory, setDeliveryFilterCategory] = useState<'all' | CardCategory>('all');
  const [deliveryFilterOutlet, setDeliveryFilterOutlet] = useState<'all' | string>('all');

  const [selectedOutletForStatement, setSelectedOutletForStatement] = useState<Outlet | null>(null);

  // Modals state
  const [isAddOutletOpen, setIsAddOutletOpen] = useState(false);
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedVoucherForPrint, setSelectedVoucherForPrint] = useState<{
    type: 'DEL' | 'PAY';
    data: DeliveryVoucher | PaymentVoucher;
  } | null>(null);

  // New Outlet Form State
  const [newOutletData, setNewOutletData] = useState({
    name: '',
    ownerName: '',
    phone: '',
    location: '',
    creditLimit: 100000,
    notes: '',
  });

  // Edit Outlet Form State
  const [isEditOutletOpen, setIsEditOutletOpen] = useState(false);
  const [editingOutlet, setEditingOutlet] = useState<Outlet | null>(null);
  const [editOutletData, setEditOutletData] = useState({
    name: '',
    ownerName: '',
    phone: '',
    location: '',
    creditLimit: 100000,
    notes: '',
  });
  const [editOutletError, setEditOutletError] = useState('');
  const [editOutletSuccess, setEditOutletSuccess] = useState(false);
  const [addOutletError, setAddOutletError] = useState('');
  const [dedupSuccessMsg, setDedupSuccessMsg] = useState<string | null>(null);
  const [isMergingDuplicates, setIsMergingDuplicates] = useState(false);
  const [isAuditingDebts, setIsAuditingDebts] = useState(false);
  const [auditFeedbackMsg, setAuditFeedbackMsg] = useState<string | null>(null);

  const handleAuditOutletsDebts = () => {
    setIsAuditingDebts(true);
    setTimeout(() => {
      try {
        const rep = auditAndReconcileOutletDebts({ autoFix: true });
        setAuditFeedbackMsg(
          `تم تدقيق ديون المنافذ بنجاح: إجمالي الديون المعتمدة ${rep.networkExpectedDebt.toLocaleString('ar-YE')} ر.ي، وجميع الحسابات متطابقة 100% مع السندات بفارق 0 ر.ي.`
        );
        setTimeout(() => setAuditFeedbackMsg(null), 6000);
      } finally {
        setIsAuditingDebts(false);
      }
    }, 250);
  };

  // Identify any outlets sharing identical normalized names
  const duplicateOutletGroups = useMemo(() => {
    const map = new Map<string, Outlet[]>();
    for (const o of outlets) {
      const norm = o.name
        .trim()
        .toLowerCase()
        .replace(/[\u064B-\u065F\u0670]/g, '')
        .replace(/[أإآٱ]/g, 'ا')
        .replace(/ة/g, 'ه')
        .replace(/ى/g, 'ي')
        .replace(/[^\w\s\u0600-\u06FF]/gi, '')
        .replace(/\s+/g, ' ');
      if (!map.has(norm)) map.set(norm, []);
      map.get(norm)!.push(o);
    }
    return Array.from(map.values()).filter((group) => group.length > 1);
  }, [outlets]);

  // Edit & Delete Delivery Form State
  const [editingDelivery, setEditingDelivery] = useState<DeliveryVoucher | null>(null);
  const [isEditDeliveryOpen, setIsEditDeliveryOpen] = useState(false);
  const [editDeliveryCards, setEditDeliveryCards] = useState<number>(0);
  const [editDeliverySheets, setEditDeliverySheets] = useState<number>(0);
  const [editDeliveryUnitPrice, setEditDeliveryUnitPrice] = useState<number>(0);
  const [editDeliveryCashPaid, setEditDeliveryCashPaid] = useState<number>(0);
  const [editDeliveryDate, setEditDeliveryDate] = useState<string>('');
  const [editDeliveryNotes, setEditDeliveryNotes] = useState<string>('');
  const [editDeliveryError, setEditDeliveryError] = useState<string>('');
  const [editDeliverySuccess, setEditDeliverySuccess] = useState<string>('');
  const [deletingDelivery, setDeletingDelivery] = useState<DeliveryVoucher | null>(null);
  const [deleteDeliveryError, setDeleteDeliveryError] = useState<string>('');

  // Edit & Delete Payment Form State
  const [editingPayment, setEditingPayment] = useState<PaymentVoucher | null>(null);
  const [isEditPaymentOpen, setIsEditPaymentOpen] = useState(false);
  const [editPaymentAmount, setEditPaymentAmount] = useState<number>(0);
  const [editPaymentMethod, setEditPaymentMethod] = useState<'cash' | 'transfer'>('cash');
  const [editPaymentDate, setEditPaymentDate] = useState<string>('');
  const [editPaymentNotes, setEditPaymentNotes] = useState<string>('');
  const [editPaymentError, setEditPaymentError] = useState<string>('');
  const [editPaymentSuccess, setEditPaymentSuccess] = useState<string>('');
  const [deletingPayment, setDeletingPayment] = useState<PaymentVoucher | null>(null);
  const [deletePaymentError, setDeletePaymentError] = useState<string>('');

  const openEditDelivery = (del: DeliveryVoucher) => {
    setEditingDelivery(del);
    setEditDeliveryCards(del.cardsCount || 0);
    setEditDeliverySheets(del.sheetsCount || 0);
    setEditDeliveryUnitPrice(del.deliveryUnit === 'cards' ? (del.unitCardPrice || 0) : del.unitSheetPrice);
    setEditDeliveryCashPaid(del.cashPaidNow || 0);
    setEditDeliveryDate(del.date || '');
    setEditDeliveryNotes(del.notes || '');
    setEditDeliveryError('');
    setEditDeliverySuccess('');
    setIsEditDeliveryOpen(true);
  };

  const handleEditDeliverySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDelivery) return;
    setEditDeliveryError('');
    setEditDeliverySuccess('');

    const isCard = editingDelivery.deliveryUnit === 'cards' || (editingDelivery.cardsCount && editingDelivery.cardsCount > 0 && !editingDelivery.sheetsCount);
    const config = CARD_CATEGORIES_CONFIG[editingDelivery.category];

    const res = updateDelivery(editingDelivery.id, {
      cardsCount: isCard ? Number(editDeliveryCards) : undefined,
      sheetsCount: isCard ? Number((Number(editDeliveryCards) / config.defaultCardsPerSheet).toFixed(2)) : Number(editDeliverySheets),
      unitCardPrice: isCard ? Number(editDeliveryUnitPrice) : undefined,
      unitSheetPrice: !isCard ? Number(editDeliveryUnitPrice) : undefined,
      cashPaidNow: Number(editDeliveryCashPaid),
      date: editDeliveryDate,
      notes: editDeliveryNotes,
    });

    if (res.success) {
      setEditDeliverySuccess('تم تعديل سند التوريد ومطابقة حساب المنفذ بنجاح');
      setTimeout(() => {
        setIsEditDeliveryOpen(false);
        setEditingDelivery(null);
      }, 1000);
    } else {
      setEditDeliveryError(res.message || 'حدث خطأ أثناء تعديل سند التوريد');
    }
  };

  const handleDeleteDeliveryConfirm = () => {
    if (!deletingDelivery) return;
    setDeleteDeliveryError('');
    const res = deleteDelivery(deletingDelivery.id);
    if (res.success) {
      setDeletingDelivery(null);
    } else {
      setDeleteDeliveryError(res.message || 'تعذر حذف سند التوريد');
    }
  };

  const openEditPayment = (p: PaymentVoucher) => {
    setEditingPayment(p);
    setEditPaymentAmount(p.amount);
    setEditPaymentMethod(p.paymentMethod);
    setEditPaymentDate(p.date);
    setEditPaymentNotes(p.notes || '');
    setEditPaymentError('');
    setEditPaymentSuccess('');
    setIsEditPaymentOpen(true);
  };

  const handleEditPaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPayment) return;
    setEditPaymentError('');
    setEditPaymentSuccess('');

    const res = updatePayment(editingPayment.id, {
      amount: Number(editPaymentAmount),
      paymentMethod: editPaymentMethod,
      date: editPaymentDate,
      notes: editPaymentNotes,
    });

    if (res.success) {
      setEditPaymentSuccess('تم تعديل سند القبض وتسوية رصيد المنفذ بنجاح');
      setTimeout(() => {
        setIsEditPaymentOpen(false);
        setEditingPayment(null);
      }, 1000);
    } else {
      setEditPaymentError(res.message || 'حدث خطأ أثناء تعديل سند القبض');
    }
  };

  const handleDeletePaymentConfirm = () => {
    if (!deletingPayment) return;
    setDeletePaymentError('');
    const res = deletePayment(deletingPayment.id);
    if (res.success) {
      setDeletingPayment(null);
    } else {
      setDeletePaymentError(res.message || 'تعذر حذف سند القبض');
    }
  };

  // Delivery Form State
  const [deliveryTargetOutletId, setDeliveryTargetOutletId] = useState('');
  const [deliveryDate, setDeliveryDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [deliveryCategory, setDeliveryCategory] = useState<CardCategory>('200');
  const [deliveryCustodySource, setDeliveryCustodySource] = useState<'distributor_custody' | 'admin_custody'>('distributor_custody');
  const [deliveryUnitMode, setDeliveryUnitMode] = useState<'sheets' | 'cards'>('sheets');
  const [deliveryCustomCardsCount, setDeliveryCustomCardsCount] = useState<number>(80);
  const [deliveryCardUnitPrice, setDeliveryCardUnitPrice] = useState<number>(
    CARD_CATEGORIES_CONFIG['1000'].defaultWholesaleCardPrice || 833
  );
  const [selectedBatchId, setSelectedBatchId] = useState<string>('all');
  const [rangeBatchId, setRangeBatchId] = useState<string>('all');
  const [deliverySheetsCount, setDeliverySheetsCount] = useState(1);
  const [selectedSheetCodes, setSelectedSheetCodes] = useState<string[]>([]);
  const [rangeFrom, setRangeFrom] = useState<number | ''>('');
  const [rangeTo, setRangeTo] = useState<number | ''>('');
  const [deliveryUnitPrice, setDeliveryUnitPrice] = useState(
    CARD_CATEGORIES_CONFIG['200'].defaultWholesaleSheetPrice
  );
  const [deliveryCashPaid, setDeliveryCashPaid] = useState(0);
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [deliveryError, setDeliveryError] = useState('');

  // Payment Form State
  const [paymentTargetOutletId, setPaymentTargetOutletId] = useState('');
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer'>('cash');
  const [paymentNotes, setPaymentNotes] = useState('');

  // Active custody stock breakdown per category (distributor custody vs admin custody)
  const custodyStockByCategory = useMemo(() => {
    const categories: CardCategory[] = ['200', '500', '1000', '3000', '5000', '10000'];
    const map: Record<CardCategory, { distributorSheets: number; distributorCards: number; adminSheets: number; adminCards: number; activeStockSheets: number; activeStockCards: number }> = {} as any;
    
    categories.forEach((cat) => {
      const perSheet = CARD_CATEGORIES_CONFIG[cat].defaultCardsPerSheet;
      const distSheetsList = sheets.filter((s) => s.category === cat && s.status === 'distributor_custody');
      const adminSheetsList = sheets.filter((s) => s.category === cat && s.status === 'admin_custody');
      const distCards = distSheetsList.reduce((sum, s) => sum + (s.cardsCount || perSheet), 0);
      const adminCards = adminSheetsList.reduce((sum, s) => sum + (s.cardsCount || perSheet), 0);
      const distSheets = Number((distCards / perSheet).toFixed(2));
      const adminSheets = Number((adminCards / perSheet).toFixed(2));
      const activeStockSheets = deliveryCustodySource === 'distributor_custody' ? distSheets : adminSheets;
      const activeStockCards = deliveryCustodySource === 'distributor_custody' ? distCards : adminCards;
      map[cat] = { distributorSheets: distSheets, distributorCards: distCards, adminSheets, adminCards, activeStockSheets, activeStockCards };
    });
    return map;
  }, [sheets, deliveryCustodySource]);

  // Available batches for selected deliveryCategory in the chosen custody source ONLY
  const availableBatchesForCategory = useMemo(() => {
    const custodySheets = sheets.filter(
      (s) => s.category === deliveryCategory && s.status === deliveryCustodySource
    );
    const defCards = CARD_CATEGORIES_CONFIG[deliveryCategory].defaultCardsPerSheet;
    const batchMap = new Map<
      string,
      { batchId: string; batchNumber: number; categoryBatchNumber: number; batchName: string; count: number; cardsCount: number; date: string }
    >();
    custodySheets.forEach((s) => {
      const bInfo = batches.find((b) => b.id === s.batchId);
      const catBNum = s.categoryBatchNumber || (bInfo ? getCategoryBatchNumber(bInfo, batches) : 1);
      const cCount = s.cardsCount || defCards;
      if (!batchMap.has(s.batchId)) {
        batchMap.set(s.batchId, {
          batchId: s.batchId,
          batchNumber: bInfo?.batchNumber || 1,
          categoryBatchNumber: catBNum,
          batchName: getBatchOrdinalName(catBNum),
          count: 0,
          cardsCount: 0,
          date: bInfo?.date || s.timestamp?.split('T')[0] || '',
        });
      }
      const item = batchMap.get(s.batchId)!;
      item.cardsCount += cCount;
      item.count = Number((item.cardsCount / defCards).toFixed(2));
    });
    return Array.from(batchMap.values()).sort((a, b) => a.categoryBatchNumber - b.categoryBatchNumber);
  }, [sheets, batches, deliveryCategory, deliveryCustodySource]);

  // Available sheets in the chosen custody source, sorted strictly by batch sequence then sheet number
  const availableSheetsForDelivery = useMemo(() => {
    return sheets
      .filter((s) => {
        if (!s || !s.sheetCode) return false;
        const leafNum = s.leafNumber || parseInt(s.sheetCode?.match(/S(\d+)/)?.[1] || '0', 10);
        if (s.batchId === 'BATCH-2026-005' && leafNum > 15) return false;
        if (s.sheetCode?.startsWith('QZ-500-B5-S') && (leafNum > 15 || parseInt(s.sheetCode.replace('QZ-500-B5-S', ''), 10) > 15)) return false;
        const b = batches.find((x) => x.id === s.batchId);
        if (b && typeof b.sheetsCount === 'number' && leafNum > b.sheetsCount) return false;

        const matchCat = s.category === deliveryCategory;
        const matchStatus = s.status === deliveryCustodySource;
        const matchBatch = selectedBatchId === 'all' || s.batchId === selectedBatchId;
        return matchCat && matchStatus && matchBatch;
      })
      .sort((a, b) => {
        const bInfoA = batches.find((x) => x.id === a.batchId);
        const bInfoB = batches.find((x) => x.id === b.batchId);
        const catBNumA = a.categoryBatchNumber || (bInfoA ? getCategoryBatchNumber(bInfoA, batches) : (a.batchNumber || 1));
        const catBNumB = b.categoryBatchNumber || (bInfoB ? getCategoryBatchNumber(bInfoB, batches) : (b.batchNumber || 1));
        if (catBNumA !== catBNumB) return catBNumA - catBNumB;
        return a.leafNumber - b.leafNumber;
      });
  }, [sheets, batches, deliveryCategory, deliveryCustodySource, selectedBatchId]);

  // Sheets grouped by printing batch for crystal-clear visual separation (الدفعة الأولى vs الدفعة الثانية)
  const groupedSheetsForDelivery = useMemo(() => {
    const map = new Map<
      string,
      { batchId: string; batchName: string; categoryBatchNumber: number; count: number; date: string; sheets: SheetLeaf[] }
    >();

    availableSheetsForDelivery.forEach((s) => {
      if (!map.has(s.batchId)) {
        const bInfo = batches.find((b) => b.id === s.batchId);
        const catBNum = s.categoryBatchNumber || (bInfo ? getCategoryBatchNumber(bInfo, batches) : 1);
        map.set(s.batchId, {
          batchId: s.batchId,
          batchName: getBatchOrdinalName(catBNum),
          categoryBatchNumber: catBNum,
          count: 0,
          date: bInfo?.date || s.timestamp?.split('T')[0] || '',
          sheets: [],
        });
      }
      const entry = map.get(s.batchId)!;
      entry.sheets.push(s);
      entry.count += 1;
    });

    const groups = Array.from(map.values()).sort((a, b) => a.categoryBatchNumber - b.categoryBatchNumber);
    groups.forEach((g) => g.sheets.sort((a, b) => a.leafNumber - b.leafNumber));
    return groups;
  }, [availableSheetsForDelivery, batches]);

  // Total available cards in chosen custody for selected delivery category
  const totalAvailableCardsForDelivery = useMemo(() => {
    const config = CARD_CATEGORIES_CONFIG[deliveryCategory];
    return availableSheetsForDelivery.reduce(
      (sum, s) => sum + (s.cardsCount || config.defaultCardsPerSheet),
      0
    );
  }, [availableSheetsForDelivery, deliveryCategory]);

  // Computed total price for delivery considering sheets or direct cards
  const computedDeliveryTotal = useMemo(() => {
    if (deliveryUnitMode === 'cards') {
      const config = CARD_CATEGORIES_CONFIG[deliveryCategory];
      const fullSheets = Math.floor(deliveryCustomCardsCount / config.defaultCardsPerSheet);
      const looseCards = deliveryCustomCardsCount % config.defaultCardsPerSheet;
      return (fullSheets * deliveryUnitPrice) + (looseCards * deliveryCardUnitPrice);
    }
    return deliverySheetsCount * deliveryUnitPrice;
  }, [
    deliveryUnitMode,
    deliveryCustomCardsCount,
    deliveryCategory,
    deliveryUnitPrice,
    deliveryCardUnitPrice,
    deliverySheetsCount,
  ]);

  // Open delivery modal with smart defaults
  const openDeliveryModal = (targetOutletId?: string) => {
    const defaultOutlet = targetOutletId || outlets[0]?.id || '';
    setDeliveryTargetOutletId(defaultOutlet);
    const today = new Date().toISOString().split('T')[0];
    setDeliveryDate(today);
    setDeliveryCategory('1000');
    setDeliveryUnitMode('sheets');
    setDeliveryCustomCardsCount(80);
    setSelectedBatchId('all');
    setRangeBatchId('all');
    setRangeFrom('');
    setRangeTo('');
    setDeliveryError('');
    setDeliveryUnitPrice(CARD_CATEGORIES_CONFIG['1000'].defaultWholesaleSheetPrice);
    setDeliveryCardUnitPrice(CARD_CATEGORIES_CONFIG['1000'].defaultWholesaleCardPrice || 833);

    const avSheets = sheets.filter(
      (s) => s.category === '1000' && s.status === deliveryCustodySource
    );
    const initialSelected = avSheets.slice(0, 1).map((s) => s.sheetCode);
    setSelectedSheetCodes(initialSelected);
    setDeliverySheetsCount(initialSelected.length > 0 ? initialSelected.length : 1);
    setDeliveryCashPaid(0);
    setDeliveryNotes('');
    setIsDeliveryModalOpen(true);
  };

  // Open payment modal with smart defaults
  const openPaymentModal = (targetOutletId?: string) => {
    setPaymentTargetOutletId(targetOutletId || outlets[0]?.id || '');
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setPaymentAmount(0);
    setPaymentMethod('cash');
    setPaymentNotes('');
    setIsPaymentModalOpen(true);
  };

  // Handle category switch in delivery form
  const handleDeliveryCatChange = (cat: CardCategory) => {
    setDeliveryCategory(cat);
    setSelectedBatchId('all');
    setRangeBatchId('all');
    setRangeFrom('');
    setRangeTo('');
    const config = CARD_CATEGORIES_CONFIG[cat];
    setDeliveryUnitPrice(config.defaultWholesaleSheetPrice);
    setDeliveryCardUnitPrice(
      config.defaultWholesaleCardPrice || Math.round(config.defaultWholesaleSheetPrice / config.defaultCardsPerSheet)
    );
    const avSheets = sheets.filter(
      (s) => s.category === cat && s.status === deliveryCustodySource
    );
    const initialSelected = avSheets.slice(0, 1).map((s) => s.sheetCode);
    setSelectedSheetCodes(initialSelected);
    setDeliverySheetsCount(initialSelected.length > 0 ? initialSelected.length : 1);
    if (!config.allowCardUnits && deliveryUnitMode === 'cards') {
      setDeliveryUnitMode('sheets');
    }
  };

  // Toggle individual sheet code selection
  const toggleSheetCode = (code: string) => {
    setSelectedSheetCodes((prev) => {
      let next: string[];
      if (prev.includes(code)) {
        next = prev.filter((c) => c !== code);
      } else {
        next = [...prev, code];
      }
      setDeliverySheetsCount(Math.max(1, next.length));
      return next;
    });
  };

  // Select all sheets in current available batch view
  const selectAllAvailableSheets = () => {
    const allCodes = availableSheetsForDelivery.map((s) => s.sheetCode);
    setSelectedSheetCodes(allCodes);
    setDeliverySheetsCount(allCodes.length);
  };

  // Clear sheet selections
  const clearSelectedSheets = () => {
    setSelectedSheetCodes([]);
    setDeliverySheetsCount(0);
  };

  // Apply sequential range selection (من شيت # إلى شيت #) with batch targeting
  const applySequentialRange = () => {
    if (rangeFrom === '' || rangeTo === '') return;
    const from = Math.min(Number(rangeFrom), Number(rangeTo));
    const to = Math.max(Number(rangeFrom), Number(rangeTo));

    const targetPool = availableSheetsForDelivery.filter((s) => {
      if (rangeBatchId !== 'all' && s.batchId !== rangeBatchId) return false;
      return s.leafNumber >= from && s.leafNumber <= to;
    });

    const matchedCodes = targetPool.map((s) => s.sheetCode);
    if (matchedCodes.length > 0) {
      setSelectedSheetCodes(matchedCodes);
      setDeliverySheetsCount(matchedCodes.length);
    }
  };

  // Direct numeric input for sheets count
  const handleSheetsCountInputChange = (count: number) => {
    const validCount = Math.max(0, Math.min(count, availableSheetsForDelivery.length));
    setDeliverySheetsCount(validCount);
    setSelectedSheetCodes(availableSheetsForDelivery.slice(0, validCount).map((s) => s.sheetCode));
  };

  // Submit New Outlet with real-time duplicate validation
  const handleAddOutletSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = newOutletData.name.trim();
    if (!trimmedName) {
      setAddOutletError('يرجى إدخال اسم المنفذ أو المحل');
      return;
    }

    const duplicate = checkOutletNameExists(trimmedName);
    if (duplicate) {
      setAddOutletError(`⚠️ يوجد منفذ مسجل مسبقاً بنفس الاسم ("${duplicate.name}" - الكود: ${duplicate.id}). تم منع إنشاء سجل مكرر لحماية دقة الحسابات وسقف الدين.`);
      return;
    }

    try {
      addOutlet({
        name: trimmedName,
        ownerName: newOutletData.ownerName.trim() || trimmedName,
        phone: newOutletData.phone.trim(),
        location: newOutletData.location.trim(),
        creditLimit: Number(newOutletData.creditLimit) || 100000,
        notes: newOutletData.notes,
      });
      setIsAddOutletOpen(false);
      setAddOutletError('');
      setNewOutletData({
        name: '',
        ownerName: '',
        phone: '',
        location: '',
        creditLimit: 100000,
        notes: '',
      });
    } catch (err: any) {
      setAddOutletError(err.message || 'حدث خطأ أثناء إضافة المنفذ');
    }
  };

  // Open Edit Outlet Modal with existing data populated
  const openEditModal = (outlet: Outlet) => {
    setEditingOutlet(outlet);
    setEditOutletData({
      name: outlet.name || '',
      ownerName: outlet.ownerName || outlet.name || '',
      phone: outlet.phone || '',
      location: outlet.location || '',
      creditLimit: typeof outlet.creditLimit === 'number' ? outlet.creditLimit : 100000,
      notes: outlet.notes || '',
    });
    setEditOutletError('');
    setEditOutletSuccess(false);
    setIsEditOutletOpen(true);
  };

  // Submit Edit Outlet with active validation
  const handleEditOutletSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOutlet) return;

    const trimmedName = editOutletData.name.trim();
    const trimmedPhone = editOutletData.phone.trim();
    const trimmedLocation = editOutletData.location.trim();

    if (!trimmedName) {
      setEditOutletError('يرجى إدخال اسم المنفذ أو المحل');
      return;
    }
    if (!trimmedPhone) {
      setEditOutletError('يرجى إدخال رقم الهاتف للتواصل');
      return;
    }
    if (!trimmedLocation) {
      setEditOutletError('يرجى تحديد موقع وعنوان المنفذ');
      return;
    }

    const duplicate = checkOutletNameExists(trimmedName, editingOutlet.id);
    if (duplicate) {
      setEditOutletError(`لا يمكن تغيير الاسم إلى "${trimmedName}" لأنه مستخدم بالفعل لمنفذ آخر ("${duplicate.name}" - كود: ${duplicate.id}). تم منع التكرار.`);
      return;
    }

    setEditOutletError('');
    try {
      updateOutlet(editingOutlet.id, {
        name: trimmedName,
        ownerName: editOutletData.ownerName.trim() || trimmedName,
        phone: trimmedPhone,
        location: trimmedLocation,
        creditLimit: Math.max(0, Number(editOutletData.creditLimit) || 0),
        notes: editOutletData.notes.trim(),
      });

      setEditOutletSuccess(true);
      setTimeout(() => {
        setIsEditOutletOpen(false);
        setEditingOutlet(null);
        setEditOutletSuccess(false);
      }, 400);
    } catch (err: any) {
      setEditOutletError(err.message || 'حدث خطأ أثناء تحديث بيانات المنفذ');
    }
  };

  // Delete outlet with zero debt confirmation
  const handleDeleteOutlet = (outlet: Outlet) => {
    if ((outlet.currentDebt || 0) > 0) {
      setEditOutletError(`لا يمكن حذف المنفذ لوجود مديونية قائمة قدرها ${outlet.currentDebt.toLocaleString()} ر.ي. يرجى تصفير الحساب أولاً.`);
      return;
    }
    deleteOutlet(outlet.id);
    setIsEditOutletOpen(false);
    setEditingOutlet(null);
  };

  // Submit Delivery (DEL)
  const handleDeliverySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deliveryTargetOutletId) {
      setDeliveryError('يرجى اختيار المنفذ المستلم أولاً');
      return;
    }

    if (deliveryUnitMode === 'cards') {
      const requestedCards = Number(deliveryCustomCardsCount);
      if (requestedCards <= 0) {
        setDeliveryError('يرجى إدخال عدد كروت صحيح (أكبر من 0)');
        return;
      }
      if (totalAvailableCardsForDelivery === 0) {
        setDeliveryError(
          `رصيدك المتبقي من فئة ${deliveryCategory} ر.ي نفذ بالكامل (0 كرت متاح بعهدتك). يمنع النظام إتمام توريد كروت غير متوفرة لضمان دقة المخزون.`
        );
        return;
      }
      if (requestedCards > totalAvailableCardsForDelivery) {
        setDeliveryError(
          `الكمية المطلوبة (${requestedCards} كرت) تتجاوز الرصيد المتبقي بعهدتك (${totalAvailableCardsForDelivery} كرت). يمنع النظام التوريد لضمان دقة الرصيد والمطابقة المحاسبية.`
        );
        return;
      }

      setDeliveryError('');

      try {
        const voucher = createDelivery({
          outletId: deliveryTargetOutletId,
          category: deliveryCategory,
          cardsCount: requestedCards,
          deliveryUnit: 'cards',
          unitSheetPrice: Number(deliveryUnitPrice),
          unitCardPrice: Number(deliveryCardUnitPrice),
          cashPaidNow: Number(deliveryCashPaid),
          notes: deliveryNotes,
          date: deliveryDate || new Date().toISOString().split('T')[0],
          batchId: selectedBatchId !== 'all' ? selectedBatchId : undefined,
          custodySource: deliveryCustodySource,
        });

        setIsDeliveryModalOpen(false);
        setSelectedVoucherForPrint({ type: 'DEL', data: voucher });
      } catch (err: any) {
        setDeliveryError(err?.message || 'حدث خطأ أثناء إصدار سند التوريد');
      }
      return;
    }

    const requestedCount = Number(deliverySheetsCount);

    if (availableSheetsForDelivery.length === 0) {
      setDeliveryError(
        `رصيدك المتبقي من فئة ${deliveryCategory} ر.ي نفذ بالكامل (0 شيت متاح بعهدتك). يمنع النظام إتمام توريد كروت غير متوفرة لضمان دقة المخزون.`
      );
      return;
    }

    if (requestedCount <= 0) {
      setDeliveryError('يرجى تحديد عدد شيتات صحيح (شيت واحد على الأقل)');
      return;
    }

    if (requestedCount > availableSheetsForDelivery.length) {
      setDeliveryError(
        `الكمية المطلوبة (${requestedCount} شيت) تتجاوز الرصيد المتبقي في عهدتك (${availableSheetsForDelivery.length} شيت). يمنع النظام التوريد لضمان دقة المخزون والمطابقة المحاسبية.`
      );
      return;
    }

    let finalCodes = selectedSheetCodes;
    if (finalCodes.length === 0) {
      finalCodes = availableSheetsForDelivery.slice(0, requestedCount).map((s) => s.sheetCode);
    }

    if (finalCodes.length === 0) {
      setDeliveryError('يرجى تحديد شيت واحد على الأقل من القائمة لتوريده للمنفذ');
      return;
    }

    if (finalCodes.length < requestedCount) {
      setDeliveryError(
        `عدد الشيتات المحددة (${finalCodes.length} شيت) أقل من الكمية المطلوبة (${requestedCount} شيت). يرجى تحديد باقي الشيتات من القائمة.`
      );
      return;
    }

    // Verify all selected sheets actually exist in availableSheetsForDelivery
    const availableSet = new Set(availableSheetsForDelivery.map((s) => s.sheetCode));
    const invalidCodes = finalCodes.filter((code) => !availableSet.has(code));
    if (invalidCodes.length > 0) {
      setDeliveryError(
        `الشيتات التالية ليست في عهدتك الحالية أو تم توريدها مسبقاً: ${invalidCodes.join(', ')}`
      );
      return;
    }

    setDeliveryError('');

    try {
      const voucher = createDelivery({
        outletId: deliveryTargetOutletId,
        category: deliveryCategory,
        sheetCodes: finalCodes,
        sheetsCount: finalCodes.length,
        unitSheetPrice: Number(deliveryUnitPrice),
        cashPaidNow: Number(deliveryCashPaid),
        notes: deliveryNotes,
        date: deliveryDate || new Date().toISOString().split('T')[0],
        batchId: selectedBatchId !== 'all' ? selectedBatchId : undefined,
        custodySource: deliveryCustodySource,
      });

      setIsDeliveryModalOpen(false);
      setSelectedVoucherForPrint({ type: 'DEL', data: voucher });
    } catch (err: any) {
      setDeliveryError(err?.message || 'حدث خطأ أثناء إصدار سند التوريد');
    }
  };

  // Submit Payment (PAY)
  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentTargetOutletId || paymentAmount <= 0) return;

    const voucher = createPayment({
      outletId: paymentTargetOutletId,
      amount: Number(paymentAmount),
      paymentMethod,
      notes: paymentNotes,
      date: paymentDate || new Date().toISOString().split('T')[0],
    });

    setIsPaymentModalOpen(false);
    setSelectedVoucherForPrint({ type: 'PAY', data: voucher });
  };

  // WhatsApp Message Generator for DEL
  const generateDeliveryWhatsAppLink = (voucher: DeliveryVoucher) => {
    const outlet = outlets.find((o) => o.id === voucher.outletId);
    const phone = outlet?.phone?.replace(/\D/g, '') || '';
    const cleanPhone = phone.startsWith('967') ? phone : `967${phone}`;

    // Find the sheet leaf numbers for the delivered sheet codes
    const sheetLeafNumbers = sheets
      .filter((s) => voucher.sheetCodes.includes(s.sheetCode))
      .map((s) => formatSheetWithBatch(s, undefined, batches))
      .join('، ');

    const config = CARD_CATEGORIES_CONFIG[voucher.category];
    const fullSheets = Math.floor(voucher.cardsCount / (config.defaultCardsPerSheet || 60));
    const looseCards = voucher.cardsCount % (config.defaultCardsPerSheet || 60);

    const quantityLine = voucher.deliveryUnit === 'cards'
      ? `الكمية الموردة: ${voucher.cardsCount} كرت (${fullSheets > 0 ? `${fullSheets} شيت كامل + ` : ''}${looseCards} كرت مجزأ)\n`
      : `الكمية: ${voucher.sheetsCount} شيت (${voucher.cardsCount} كرت)\n`;

    const priceLine = voucher.deliveryUnit === 'cards'
      ? `سعر الكرت: ${(voucher.unitCardPrice || config.defaultWholesaleCardPrice || 833).toLocaleString()} ر.ي • سعر الشيت: ${voucher.unitSheetPrice.toLocaleString()} ر.ي\n`
      : `سعر الشيت بالجملة: ${voucher.unitSheetPrice.toLocaleString()} ر.ي\n`;

    const text =
      `*سند توريد كروت إنترنت رسمي - شبكة قعزان نت*\n` +
      `━━━━━━━━━━━━━━━━━━━\n` +
      `رقم السند: ${voucher.id}\n` +
      `📅 تاريخ التوريد: ${voucher.date} (${formatArabicDate(voucher.date)})\n` +
      `المنفذ المستلم: ${voucher.outletName}\n` +
      `الفئة: كروت ${voucher.category} ريال\n` +
      quantityLine +
      (sheetLeafNumbers ? `🔢 أرقام الشيتات الموزعة من الدفعة: ${sheetLeafNumbers}\n` : '') +
      priceLine +
      `إجمالي القيمة: ${voucher.totalAmount.toLocaleString()} ر.ي\n` +
      `💵 المدفوع كاش فوراً: ${voucher.cashPaidNow.toLocaleString()} ر.ي\n` +
      `*الدين المقيد على المنفذ:* ${voucher.remainingDebt.toLocaleString()} ر.ي\n` +
      `رصيد الدين الإجمالي الحالي للمحل: ${outlet ? outlet.currentDebt.toLocaleString() : ''} ر.ي\n` +
      `المسلّم: ${voucher.deliveredBy}\n` +
      `━━━━━━━━━━━━━━━━━━━\n` +
      `شكراً لتعاملكم مع شبكة قعزان نت!`;

    return `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(text)}`;
  };

  // WhatsApp Message Generator for PAY
  const generateWhatsAppLink = (voucher: PaymentVoucher) => {
    const outlet = outlets.find((o) => o.id === voucher.outletId);
    const phone = outlet?.phone?.replace(/\D/g, '') || '';
    const cleanPhone = phone.startsWith('967') ? phone : `967${phone}`;

    const text =
      `*سند قبض رسمي - شبكة قعزان نت*\n` +
      `━━━━━━━━━━━━━━━━━━━\n` +
      `رقم السند: ${voucher.id}\n` +
      `📅 التاريخ: ${voucher.date} (${formatArabicDate(voucher.date)})\n` +
      `المنفذ: ${voucher.outletName}\n` +
      `المبلغ المستلم: ${voucher.amount.toLocaleString()} ر.ي\n` +
      `طريقة القبض: ${voucher.paymentMethod === 'cash' ? 'نقداً (كاش)' : 'حوالة بنكية'}\n` +
      `الدين السابق: ${voucher.previousDebt.toLocaleString()} ر.ي\n` +
      `*الرصيد المتبقي حالياً:* ${voucher.newDebt.toLocaleString()} ر.ي\n` +
      `المستلم: ${voucher.collectorName}\n` +
      `━━━━━━━━━━━━━━━━━━━\n` +
      `شكراً لتعاملكم مع شبكة قعزان نت!`;

    return `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(text)}`;
  };

  // Filtered outlets with total null safety
  const filteredOutlets = (outlets || []).map((o, idx) => ({
    id: o?.id || `OUT-${idx + 1}`,
    name: o?.name || `منفذ ${idx + 1}`,
    ownerName: o?.ownerName || o?.name || 'المالك',
    phone: o?.phone || '',
    location: o?.location || 'غير محدد',
    creditLimit: typeof o?.creditLimit === 'number' && !isNaN(o.creditLimit) ? o.creditLimit : 100000,
    currentDebt: typeof o?.currentDebt === 'number' && !isNaN(o.currentDebt) ? o.currentDebt : 0,
    totalDeliveredAmount: typeof o?.totalDeliveredAmount === 'number' && !isNaN(o.totalDeliveredAmount) ? o.totalDeliveredAmount : 0,
    totalPaidAmount: typeof o?.totalPaidAmount === 'number' && !isNaN(o.totalPaidAmount) ? o.totalPaidAmount : 0,
    createdAt: o?.createdAt || '2026-10-01',
    notes: o?.notes || '',
  })).filter((o) => {
    const q = (searchQuery || '').toLowerCase().trim();
    const nameMatch = (o.name || '').toLowerCase().includes(q);
    const ownerMatch = (o.ownerName || '').toLowerCase().includes(q);
    const phoneMatch = (o.phone || '').includes(q);
    const locMatch = (o.location || '').toLowerCase().includes(q);
    const matchesSearch = !q || nameMatch || ownerMatch || phoneMatch || locMatch;

    if (!matchesSearch) return false;

    if (outletFilter === 'debt') return (o.currentDebt || 0) > 0;
    if (outletFilter === 'zero') return (o.currentDebt || 0) === 0;
    if (outletFilter === 'overlimit') return (o.creditLimit || 0) > 0 && (o.currentDebt || 0) >= (o.creditLimit || 0);
    return true;
  });

  // Filtered deliveries list
  const filteredDeliveries = deliveries.filter((d) => {
    const matchesCategory = deliveryFilterCategory === 'all' || d.category === deliveryFilterCategory;
    const matchesOutlet = deliveryFilterOutlet === 'all' || d.outletId === deliveryFilterOutlet;
    const matchesSearch =
      !searchQuery ||
      d.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.outletName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.date.includes(searchQuery);

    return matchesCategory && matchesOutlet && matchesSearch;
  });

  // Financial KPIs
  const totalOutletsDebt = useMemo(() => {
    return outlets.reduce((acc, o) => acc + (o.currentDebt || 0), 0);
  }, [outlets]);

  const totalDeliveredValue = useMemo(() => {
    return deliveries.reduce((acc, d) => acc + (d.totalAmount || 0), 0);
  }, [deliveries]);

  const totalInstantCashFromDeliveries = useMemo(() => {
    return deliveries.reduce((acc, d) => acc + (d.cashPaidNow || 0), 0);
  }, [deliveries]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 p-5 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-extrabold text-white">إدارة المنافذ وسندات التوريد والتحصيل</h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-bold border border-blue-500/30">
              {outlets.length} منافذ معتمدة
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            تسجيل وتوثيق التوريدات بتواريخها الدقيقة وأرقام شيتات الدفعة، قبض النقدية، ومتابعة الأرصدة
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => openDeliveryModal()}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs shadow-md shadow-blue-600/20 transition cursor-pointer"
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>تسجيل توريد كروت (DEL)</span>
          </button>

          <button
            onClick={() => openPaymentModal()}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs shadow-md shadow-emerald-500/20 transition cursor-pointer"
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>سند قبض نقدية (PAY)</span>
          </button>

          <button
            onClick={() => {
              if (outlets.length > 0) openEditModal(outlets[0]);
            }}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500 text-amber-400 hover:text-slate-950 font-extrabold text-xs border border-amber-500/30 transition cursor-pointer"
            title="تعديل بيانات المنافذ الافتراضية بما يناسب الواقع"
          >
            <Edit3 className="w-4 h-4" />
            <span>تعديل المنافذ</span>
          </button>

          <button
            onClick={handleAuditOutletsDebts}
            disabled={isAuditingDebts}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-blue-500/15 hover:bg-blue-600 hover:text-white text-blue-400 font-extrabold text-xs border border-blue-500/30 transition cursor-pointer"
            title="فحص وتدقيق ديون المنافذ ومطابقتها تراكمياً مع كافة سندات التوريد والقبض"
          >
            <RefreshCw className={`w-4 h-4 ${isAuditingDebts ? 'animate-spin' : ''}`} />
            <span>تدقيق الديون آلياً</span>
          </button>

          {(currentRole === 'admin' || permissions.canCreateOutlets) && (
            <button
              onClick={() => setIsAddOutletOpen(true)}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 transition cursor-pointer text-xs font-bold"
              title="إضافة منفذ جديد"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">إضافة منفذ</span>
            </button>
          )}
        </div>
      </div>

      {/* Audit Feedback Banner */}
      {auditFeedbackMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs sm:text-sm font-bold flex items-center gap-2.5 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{auditFeedbackMsg}</span>
        </div>
      )}

      {/* KPI Stats Highlights */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 block">إجمالي ديون المنافذ</span>
            <span className="text-lg font-black text-rose-400">
              {totalOutletsDebt.toLocaleString()} <span className="text-xs font-normal">ر.ي</span>
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center border border-rose-500/20">
            <Coins className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 block">إجمالي مسحوبات التوريد</span>
            <span className="text-lg font-black text-blue-400">
              {totalDeliveredValue.toLocaleString()} <span className="text-xs font-normal">ر.ي</span>
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 block">عدد سندات التوريد</span>
            <span className="text-lg font-black text-emerald-400">
              {deliveries.length} <span className="text-xs font-normal">سند</span>
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
            <PackageCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 block">كاش التوريدات الفوري</span>
            <span className="text-lg font-black text-amber-400">
              {totalInstantCashFromDeliveries.toLocaleString()} <span className="text-xs font-normal">ر.ي</span>
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
            <Receipt className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveOutletsTab('outlets')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition cursor-pointer shrink-0 ${
            activeOutletsTab === 'outlets'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-850 border border-slate-800'
          }`}
        >
          <Store className="w-4 h-4" />
          <span>المنافذ والمحلات</span>
          <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-black/30 font-mono">
            {outlets.length}
          </span>
        </button>

        <button
          onClick={() => setActiveOutletsTab('deliveries')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition cursor-pointer shrink-0 ${
            activeOutletsTab === 'deliveries'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-850 border border-slate-800'
          }`}
        >
          <ArrowUpRight className="w-4 h-4" />
          <span>سجل سندات التوريد والتسليم (DEL)</span>
          <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-black/30 font-mono">
            {deliveries.length}
          </span>
        </button>

        <button
          onClick={() => setActiveOutletsTab('payments')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition cursor-pointer shrink-0 ${
            activeOutletsTab === 'payments'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25'
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-850 border border-slate-800'
          }`}
        >
          <Coins className="w-4 h-4" />
          <span>سجل سندات القبض والتحصيل (PAY)</span>
          <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-black/30 font-mono">
            {payments.length}
          </span>
        </button>
      </div>

      {/* TAB 1: OUTLETS DIRECTORY */}
      {activeOutletsTab === 'outlets' && (
        <div className="space-y-4">
          {/* Customization Banner for Default Outlets */}
          <div className="bg-gradient-to-r from-amber-500/15 via-slate-900 to-slate-900 border border-amber-500/30 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
                <Edit3 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-black text-amber-300">
                  تعديل بيانات المنافذ الافتراضية بما يناسب الواقع
                </h4>
                <p className="text-xs text-slate-300 mt-0.5">
                  جميع المنافذ الافتراضية قابلة للتعديل! يمكنك تعديل الاسم ورقم الهاتف والموقع لأي منفذ ليتوافق مع الواقع، أو حذف أي منفذ رصيده صفر.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
              <button
                onClick={() => {
                  if (outlets.length > 0) openEditModal(outlets[0]);
                }}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Edit3 className="w-4 h-4" />
                <span>تعديل منفذ الآن</span>
              </button>
            </div>
          </div>

          {/* Duplicate Outlets Detected Alert Banner */}
          {duplicateOutletGroups.length > 0 && (
            <div className="bg-gradient-to-r from-rose-950/60 via-amber-950/40 to-slate-900 border-2 border-amber-500/50 p-4 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl animate-in fade-in">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/40 mt-0.5">
                  <AlertTriangle className="w-5 h-5 text-amber-400 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm font-black text-white">
                      تنبيه تدقيق: تم رصد {duplicateOutletGroups.length} منافذ مكررة بالاسم
                    </h4>
                    <span className="bg-amber-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full">
                      تشتت محتمل للحسابات
                    </span>
                  </div>
                  <p className="text-xs text-amber-200/90 mt-1">
                    يوجد منافذ مسجلة بنفس الاسم (مثل: {duplicateOutletGroups.map((g) => `«${g[0].name}»`).join('، ')}). يمكنك بنقرة واحدة دمجها وترحيل كافة السندات والديون المحاسبية دون أي فقدان للبيانات.
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setIsMergingDuplicates(true);
                  try {
                    const res = mergeDuplicateOutletsByName();
                    if (res.success) {
                      setDedupSuccessMsg(res.message);
                      setTimeout(() => setDedupSuccessMsg(null), 6000);
                    }
                  } finally {
                    setIsMergingDuplicates(false);
                  }
                }}
                disabled={isMergingDuplicates}
                className="w-full md:w-auto px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md transition cursor-pointer flex items-center justify-center gap-2 shrink-0 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isMergingDuplicates ? 'animate-spin' : ''}`} />
                <span>دمج المنافذ المكررة وترحيل السندات بأمان 🛡️</span>
              </button>
            </div>
          )}

          {/* Feedback Toast if Deduplication was run */}
          {dedupSuccessMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs font-bold flex items-center justify-between gap-2 shadow-lg animate-in fade-in">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{dedupSuccessMsg}</span>
              </div>
              <button onClick={() => setDedupSuccessMsg(null)} className="p-1 text-emerald-400 hover:text-white cursor-pointer">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Search & Filter Bar */}
          <div className="bg-slate-900/60 p-3 rounded-2xl border border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="البحث باسم المنفذ، المالك، الهاتف، أو الموقع..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-9 pl-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-blue-500"
              />
            </div>

            {/* Filter pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto text-xs shrink-0">
              <button
                onClick={() => setOutletFilter('all')}
                className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                  outletFilter === 'all'
                    ? 'bg-slate-700 text-white'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                الكل ({outlets.length})
              </button>
              <button
                onClick={() => setOutletFilter('debt')}
                className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                  outletFilter === 'debt'
                    ? 'bg-rose-500 text-white'
                    : 'bg-slate-950 text-rose-400 hover:bg-rose-500/10 border border-slate-800'
                }`}
              >
                عليهم ديون ({outlets.filter((o) => (o.currentDebt || 0) > 0).length})
              </button>
              <button
                onClick={() => setOutletFilter('zero')}
                className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                  outletFilter === 'zero'
                    ? 'bg-emerald-500 text-slate-950'
                    : 'bg-slate-950 text-emerald-400 hover:bg-emerald-500/10 border border-slate-800'
                }`}
              >
                رصيد مصفّر ({outlets.filter((o) => (o.currentDebt || 0) === 0).length})
              </button>
              <button
                onClick={() => setOutletFilter('overlimit')}
                className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                  outletFilter === 'overlimit'
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-slate-950 text-amber-400 hover:bg-amber-500/10 border border-slate-800'
                }`}
              >
                متجاوز السقف ({outlets.filter((o) => (o.creditLimit || 0) > 0 && (o.currentDebt || 0) >= (o.creditLimit || 0)).length})
              </button>
            </div>
          </div>

          {/* Outlets Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredOutlets.map((outlet) => {
              const currentDebt = outlet.currentDebt || 0;
              const creditLimit = outlet.creditLimit || 100000;
              const isOverLimit = creditLimit > 0 && currentDebt >= creditLimit;
              const isNearLimit =
                creditLimit > 0 && currentDebt >= creditLimit * 0.8 && !isOverLimit;

              // Find deliveries & payments for this outlet matching by ID or Name
              const outletDeliveries = deliveries.filter(
                (d) => d.outletId === outlet.id || d.outletName === outlet.name
              );
              const outletPayments = payments.filter(
                (p) => p.outletId === outlet.id || p.outletName === outlet.name
              );
              const totalCardsDelivered = outletDeliveries.reduce((sum, d) => sum + (d.cardsCount || 0), 0);
              const totalSheetsDelivered = outletDeliveries.reduce((sum, d) => sum + (Number(d.sheetsCount) || 0), 0);
              const lastDelivery = outletDeliveries[0];

              return (
                <div
                  key={outlet.id}
                  className={`rounded-2xl border p-5 space-y-4 transition bg-slate-900 ${
                    isOverLimit
                      ? 'border-rose-500/50 shadow-md shadow-rose-500/10'
                      : isNearLimit
                      ? 'border-amber-500/40'
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center font-bold text-blue-400 border border-slate-700 shrink-0">
                        <Store className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-extrabold text-sm text-white truncate">{outlet.name}</h3>
                          <button
                            type="button"
                            onClick={() => openEditModal(outlet)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/15 hover:bg-amber-500 text-amber-400 hover:text-slate-950 font-bold text-[11px] transition border border-amber-500/30 cursor-pointer"
                            title="تعديل بيانات المنفذ في Firestore"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>تعديل</span>
                          </button>
                        </div>
                        <p className="text-xs text-slate-400 truncate">{outlet.ownerName || outlet.name}</p>
                      </div>
                    </div>

                    <div className="text-left shrink-0">
                      <span className="text-[10px] text-slate-400 block">الدين الحالي:</span>
                      <span
                        className={`font-black text-sm ${
                          currentDebt > 0 ? 'text-rose-400' : 'text-emerald-400'
                        }`}
                      >
                        {currentDebt.toLocaleString()} ر.ي
                      </span>
                    </div>
                  </div>

                  {/* Debt & Credit Limit Progress */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>سقف الدين الائتماني:</span>
                      <span className="font-bold text-slate-300">
                        {creditLimit.toLocaleString()} ر.ي
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                      <div
                        style={{
                          width: `${Math.min(
                            100,
                            (currentDebt / (creditLimit || 1)) * 100
                          )}%`,
                        }}
                        className={`h-full ${
                          isOverLimit ? 'bg-rose-500' : isNearLimit ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                      />
                    </div>
                    {isOverLimit && (
                      <div className="flex items-center gap-1 text-[10px] text-rose-400 pt-0.5">
                        <AlertTriangle className="w-3 h-3" />
                        <span>تم تجاوز سقف الدين الائتماني!</span>
                      </div>
                    )}
                  </div>

                  {/* Details, Contact & Last Delivery */}
                  <div className="space-y-1.5 text-xs text-slate-300 pt-2 border-t border-slate-800">
                    <div className="flex items-center justify-between text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-500" />
                        <span dir="ltr" className="font-mono text-slate-300">
                          {outlet.phone || 'بدون هاتف'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                        <Calendar className="w-3 h-3 text-blue-400" />
                        <span>
                          {lastDelivery ? `آخر توريد: ${lastDelivery.date}` : 'لم يتم التوريد بعد'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-slate-400">
                      <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="truncate">{outlet.location || 'غير محدد'}</span>
                    </div>
                  </div>

                  {/* Financial & Cards Distributed Totals */}
                  <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px]">
                    <div>
                      <span className="text-slate-500 block">الكروت المسلّمة:</span>
                      <span className="font-bold text-amber-400">
                        {totalCardsDelivered.toLocaleString()} كرت
                        {totalSheetsDelivered > 0 && <span className="text-[10px] text-slate-400 block font-normal">({totalSheetsDelivered} شيت)</span>}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">إجمالي المسحوبات:</span>
                      <span className="font-bold text-white">
                        {(outlet.totalDeliveredAmount || 0).toLocaleString()} ر.ي
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">إجمالي التسديدات:</span>
                      <span className="font-bold text-emerald-400">
                        {(outlet.totalPaidAmount || 0).toLocaleString()} ر.ي
                      </span>
                    </div>
                  </div>

                  {/* Quick Edit Outlet Button */}
                  <button
                    onClick={() => openEditModal(outlet)}
                    className="w-full py-2.5 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500 text-amber-300 hover:text-slate-950 font-black text-xs border border-amber-500/30 transition cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                    title="تعديل اسم المنفذ ورقم الهاتف والموقع في قاعدة البيانات"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>تعديل بيانات المنفذ (الاسم، الرقم، الموقع)</span>
                  </button>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-3 gap-2 pt-0.5">
                    <button
                      onClick={() => openDeliveryModal(outlet.id)}
                      className="py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white font-bold text-xs transition border border-blue-600/30 text-center cursor-pointer"
                    >
                      توريد كروت
                    </button>
                    <button
                      onClick={() => openPaymentModal(outlet.id)}
                      className="py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500 text-emerald-400 hover:text-slate-950 font-bold text-xs transition border border-emerald-500/30 text-center cursor-pointer"
                    >
                      قبض نقدية
                    </button>
                    <button
                      onClick={() => setSelectedOutletForStatement(outlet)}
                      className="py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs transition border border-slate-700 text-center cursor-pointer"
                    >
                      كشف حساب
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: DELIVERIES HISTORY LOG (سجل سندات التوريد والتسليم) */}
      {activeOutletsTab === 'deliveries' && (
        <div className="space-y-4">
          {/* Delivery Filters Bar */}
          <div className="bg-slate-900/60 p-3.5 rounded-2xl border border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="البحث برقم السند (DEL-xxxx)، اسم المنفذ، أو التاريخ..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-9 pl-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Category Filter */}
              <select
                value={deliveryFilterCategory}
                onChange={(e) => setDeliveryFilterCategory(e.target.value as any)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 font-bold focus:outline-hidden focus:border-blue-500"
              >
                <option value="all">جميع الفئات</option>
                {Object.keys(CARD_CATEGORIES_CONFIG).map((cat) => (
                  <option key={cat} value={cat}>
                    فئة {cat} ريال
                  </option>
                ))}
              </select>

              {/* Outlet Filter */}
              <select
                value={deliveryFilterOutlet}
                onChange={(e) => setDeliveryFilterOutlet(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 font-bold focus:outline-hidden focus:border-blue-500"
              >
                <option value="all">جميع المنافذ ({outlets.length})</option>
                {outlets.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>

              <button
                onClick={() => openDeliveryModal()}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>تسجيل توريد جديد</span>
              </button>
            </div>
          </div>

          {/* Deliveries Table / Cards */}
          {filteredDeliveries.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <PackageCheck className="w-12 h-12 text-slate-600 mx-auto stroke-1" />
              <h3 className="text-sm font-extrabold text-white">لا توجد سندات توريد مسجلة تطابق البحث</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                قم بتسجيل أول عملية توريد كروت لمنفذ لتظهر كافة تفاصيل التاريخ، وأرقام شيتات الدفعة، ومبالغ الكاش والدين هنا.
              </p>
              <button
                onClick={() => openDeliveryModal()}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition cursor-pointer"
              >
                + تسجيل أول توريد الآن
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredDeliveries.map((delivery) => {
                // Find leaf numbers for this delivery
                const sheetLeafNumbers = sheets
                  .filter((s) => delivery.sheetCodes.includes(s.sheetCode))
                  .map((s) => formatSheetWithBatch(s, undefined, batches))
                  .join('، ');

                return (
                  <div
                    key={delivery.id}
                    className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-800">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center font-bold text-xs border border-blue-500/25">
                          DEL
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-white text-sm">{delivery.id}</span>
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                              فئة {delivery.category} ر.ي
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                delivery.paymentStatus === 'paid_full'
                                  ? 'bg-emerald-500/20 text-emerald-400'
                                  : delivery.paymentStatus === 'paid_partial'
                                  ? 'bg-amber-500/20 text-amber-400'
                                  : 'bg-rose-500/20 text-rose-400'
                              }`}
                            >
                              {delivery.paymentStatus === 'paid_full'
                                ? 'خالص كاش'
                                : delivery.paymentStatus === 'paid_partial'
                                ? 'سداد جزئي'
                                : 'آجل بالكامل'}
                            </span>
                          </div>
                          <span className="text-xs text-slate-300 font-bold">
                            المنفذ المستلم: {delivery.outletName}
                          </span>
                        </div>
                      </div>

                      {/* Prominent Date Badge with Day Name */}
                      <div className="flex items-center gap-2 text-right">
                        <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                          <div className="flex items-center gap-1.5 text-blue-400 font-bold">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>{delivery.date}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 block font-normal">
                            {formatArabicDate(delivery.date)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Middle details: Sheet Numbers & Batch Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs bg-slate-950 p-3 rounded-xl border border-slate-800">
                      <div>
                        <span className="text-slate-400 block text-[11px] font-bold mb-1">
                          🔢 أرقام الشيتات الموزعة من الدفعة:
                        </span>
                        <div className="font-mono text-emerald-400 font-bold text-xs flex flex-wrap gap-1">
                          {sheetLeafNumbers ? (
                            <span>{sheetLeafNumbers}</span>
                          ) : delivery.sheetCodes && delivery.sheetCodes.length > 0 ? (
                            delivery.sheetCodes.map((code) => (
                              <span key={code} className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800">
                                {code}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-500">غير محدد</span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 mt-1 block">
                          {delivery.deliveryUnit === 'cards' ? (
                            <>
                              الكمية:{' '}
                              <strong className="text-emerald-400 font-extrabold">{delivery.cardsCount} كرت</strong>{' '}
                              ({Math.floor(delivery.cardsCount / (CARD_CATEGORIES_CONFIG[delivery.category]?.defaultCardsPerSheet || 60))} شيت{' '}
                              {delivery.cardsCount % (CARD_CATEGORIES_CONFIG[delivery.category]?.defaultCardsPerSheet || 60) > 0
                                ? `+ ${delivery.cardsCount % (CARD_CATEGORIES_CONFIG[delivery.category]?.defaultCardsPerSheet || 60)} كرت مجزأ`
                                : 'كامل'}
                              ) • سعر الكرت:{' '}
                              <strong className="text-white font-mono">
                                {(delivery.unitCardPrice || CARD_CATEGORIES_CONFIG[delivery.category]?.defaultWholesaleCardPrice || Math.round(delivery.unitSheetPrice / 60)).toLocaleString()}
                              </strong>{' '}
                              ر.ي
                            </>
                          ) : (
                            <>
                              الكمية: {delivery.sheetsCount} شيت ({delivery.cardsCount} كرت) • سعر الشيت:{' '}
                              {delivery.unitSheetPrice.toLocaleString()} ر.ي
                            </>
                          )}
                        </span>
                      </div>

                      {/* Financial amounts */}
                      <div className="grid grid-cols-3 gap-2 text-center border-t md:border-t-0 md:border-r border-slate-800 pt-2 md:pt-0 pr-0 md:pr-3">
                        <div className="bg-slate-900 p-2 rounded-lg">
                          <span className="text-[10px] text-slate-400 block">إجمالي السند</span>
                          <span className="font-black text-white">{delivery.totalAmount.toLocaleString()}</span>
                          <span className="text-[9px] text-slate-500 block">ر.ي</span>
                        </div>
                        <div className="bg-slate-900 p-2 rounded-lg">
                          <span className="text-[10px] text-emerald-400 block">كاش مدفوع</span>
                          <span className="font-black text-emerald-400">
                            {delivery.cashPaidNow.toLocaleString()}
                          </span>
                          <span className="text-[9px] text-slate-500 block">ر.ي</span>
                        </div>
                        <div className="bg-slate-900 p-2 rounded-lg">
                          <span className="text-[10px] text-rose-400 block">دين مقيد</span>
                          <span className="font-black text-rose-400">
                            {delivery.remainingDebt.toLocaleString()}
                          </span>
                          <span className="text-[9px] text-slate-500 block">ر.ي</span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Actions */}
                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="text-slate-400 text-[11px]">
                        المسلّم: <strong className="text-slate-300">{delivery.deliveredBy}</strong>
                        {delivery.notes && (
                          <span className="mr-2 text-slate-500">({delivery.notes})</span>
                        )}
                      </span>

                      <div className="flex items-center gap-2">
                        {currentRole === 'admin' && (
                          <>
                            <button
                              onClick={() => openEditDelivery(delivery)}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500 text-amber-300 hover:text-slate-950 font-bold transition text-[11px] cursor-pointer border border-amber-500/30"
                              title="تعديل سند التوريد ومطابقة الحساب"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>تعديل</span>
                            </button>
                            <button
                              onClick={() => {
                                setDeletingDelivery(delivery);
                                setDeleteDeliveryError('');
                              }}
                              className="p-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500 text-rose-300 hover:text-white font-bold transition text-[11px] cursor-pointer border border-rose-500/30"
                              title="حذف وإلغاء سند التوريد"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}

                        <a
                          href={generateDeliveryWhatsAppLink(delivery)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white font-bold transition text-[11px] cursor-pointer"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>إرسال واتساب</span>
                        </a>

                        <button
                          onClick={() => setSelectedVoucherForPrint({ type: 'DEL', data: delivery })}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white font-bold transition text-[11px] cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>طباعة السند</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: PAYMENTS HISTORY LOG (سجل سندات القبض) */}
      {activeOutletsTab === 'payments' && (
        <div className="space-y-4">
          <div className="bg-slate-900/60 p-3.5 rounded-2xl border border-slate-800 flex items-center justify-between gap-3">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="البحث برقم سند القبض (PAY-xxxx)، اسم المنفذ..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-9 pl-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-emerald-500"
              />
            </div>
            <button
              onClick={() => openPaymentModal()}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs shadow-md transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>إصدار سند قبض جديد</span>
            </button>
          </div>

          {payments.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <Coins className="w-12 h-12 text-slate-600 mx-auto stroke-1" />
              <h3 className="text-sm font-extrabold text-white">لا توجد سندات قبض نقدية مسجلة بعد</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                عند تحصيل أي مبلغ نقدي أو حوالة من منفذ، قم بإصدار سند قبض لخصمه من رصيد دينه فوراً.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {payments
                .filter(
                  (p) =>
                    !searchQuery ||
                    p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    p.outletName.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map((payment) => (
                  <div
                    key={payment.id}
                    className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                        PAY
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-white">{payment.id}</span>
                          <span className="text-slate-400 font-bold">{payment.outletName}</span>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-800 text-slate-300">
                            {payment.paymentMethod === 'cash' ? 'نقداً (كاش)' : 'حوالة بنكية'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                          <Calendar className="w-3 h-3 text-emerald-400" />
                          <span>{payment.date}</span>
                          <span>• المحصل: {payment.collectorName}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4">
                      <div className="text-left">
                        <span className="text-[10px] text-slate-400 block">المبلغ المقبوض:</span>
                        <span className="text-base font-black text-emerald-400">
                          {payment.amount.toLocaleString()} ر.ي
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {currentRole === 'admin' && (
                          <>
                            <button
                              onClick={() => openEditPayment(payment)}
                              className="p-2 rounded-xl bg-amber-500/15 text-amber-300 hover:bg-amber-500 hover:text-slate-950 transition cursor-pointer border border-amber-500/30"
                              title="تعديل سند القبض وتسوية حساب المنفذ"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setDeletingPayment(payment);
                                setDeletePaymentError('');
                              }}
                              className="p-2 rounded-xl bg-rose-500/15 text-rose-300 hover:bg-rose-500 hover:text-white transition cursor-pointer border border-rose-500/30"
                              title="حذف سند القبض وإعادة قيد المبلغ على المنفذ"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}

                        <a
                          href={generateWhatsAppLink(payment)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-xl bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white transition cursor-pointer"
                          title="إرسال سند القبض عبر واتساب"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </a>
                        <button
                          onClick={() => setSelectedVoucherForPrint({ type: 'PAY', data: payment })}
                          className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white transition cursor-pointer"
                          title="طباعة سند القبض"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* 1. Modal: Add Outlet */}
      {isAddOutletOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700 p-6 text-slate-100 shadow-2xl relative text-right">
            <button
              onClick={() => setIsAddOutletOpen(false)}
              className="absolute left-4 top-4 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-extrabold text-white mb-4">إضافة منفذ جديد معتمد</h3>

            <form onSubmit={handleAddOutletSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">اسم المنفذ / المحل</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: بقالة السعادة، كشك النصر..."
                  value={newOutletData.name}
                  onChange={(e) => {
                    setNewOutletData({ ...newOutletData, name: e.target.value });
                    if (addOutletError) setAddOutletError('');
                  }}
                  className={`w-full bg-slate-950 border rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden ${
                    checkOutletNameExists(newOutletData.name)
                      ? 'border-amber-500 focus:border-amber-400'
                      : 'border-slate-800 focus:border-blue-500'
                  }`}
                />
                {newOutletData.name.trim() && checkOutletNameExists(newOutletData.name) && (
                  <div className="mt-1.5 p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] flex items-start gap-1.5 animate-in fade-in">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">يوجد منفذ مسجل مسبقاً بنفس هذا الاسم!</span>
                      <p className="text-[10px] text-amber-200/80 mt-0.5">
                        المنفذ المسجل: «{checkOutletNameExists(newOutletData.name)?.name}» (كود: {checkOutletNameExists(newOutletData.name)?.id}). تم منع التكرار لضمان دقة الحسابات.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">اسم المالك / المسؤول</label>
                <input
                  type="text"
                  required
                  placeholder="اسم الشخص المسؤول عن المحل"
                  value={newOutletData.ownerName}
                  onChange={(e) => setNewOutletData({ ...newOutletData, ownerName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">رقم الهاتف (واتساب)</label>
                  <input
                    type="text"
                    required
                    placeholder="77XXXXXXX"
                    value={newOutletData.phone}
                    onChange={(e) => setNewOutletData({ ...newOutletData, phone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-blue-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">سقف الدين (ر.ي)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={newOutletData.creditLimit}
                    onChange={(e) =>
                      setNewOutletData({ ...newOutletData, creditLimit: Number(e.target.value) })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-blue-500 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">الموقع / العنوان</label>
                <input
                  type="text"
                  required
                  placeholder="الشارع، الحارة، أو المعلم المجاور"
                  value={newOutletData.location}
                  onChange={(e) => setNewOutletData({ ...newOutletData, location: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">ملاحظات (اختياري)</label>
                <input
                  type="text"
                  value={newOutletData.notes}
                  onChange={(e) => setNewOutletData({ ...newOutletData, notes: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-blue-500"
                />
              </div>

              {addOutletError && (
                <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{addOutletError}</span>
                </div>
              )}

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-emerald-400">
                ✓ سيتم بدء حساب المنفذ برصيد مصفّر تماماً 0 ر.ي وجاهز للتوريد.
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddOutletOpen(false);
                    setAddOutletError('');
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={!newOutletData.name.trim() || !!checkOutletNameExists(newOutletData.name)}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-extrabold text-xs shadow-md transition cursor-pointer"
                >
                  حفظ المنفذ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 1.1 Modal: Edit Outlet */}
      {isEditOutletOpen && editingOutlet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-amber-500/30 p-6 text-slate-100 shadow-2xl relative text-right">
            <button
              onClick={() => {
                setIsEditOutletOpen(false);
                setEditingOutlet(null);
              }}
              className="absolute left-4 top-4 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-3 pb-3 border-b border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold shrink-0">
                <Edit3 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white">تعديل بيانات المنفذ بما يناسب الواقع</h3>
                <p className="text-xs text-slate-400">
                  تغيير الاسم ورقم الهاتف والموقع الحقيقي ومزامنتها في السحابة فوراً
                </p>
              </div>
            </div>

            <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                <strong>تخصيص المنفذ:</strong> يمكنك استبدال البيانات الافتراضية بالاسم الحقيقي للمحل ورقم هاتفه وموقعه الفعلي في منطقتك.
              </span>
            </div>

            {editOutletError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{editOutletError}</span>
              </div>
            )}

            {editOutletSuccess && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>تم حفظ التعديلات بنجاح ومزامنتها في السحابة!</span>
              </div>
            )}

            <form onSubmit={handleEditOutletSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  اسم المنفذ / المحل <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: بقالة السعادة، كشك النصر..."
                  value={editOutletData.name}
                  onChange={(e) => setEditOutletData({ ...editOutletData, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-amber-500 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">اسم المالك / المسؤول</label>
                <input
                  type="text"
                  placeholder="اسم الشخص المسؤول عن المحل"
                  value={editOutletData.ownerName}
                  onChange={(e) => setEditOutletData({ ...editOutletData, ownerName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    رقم الهاتف (واتساب) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="77XXXXXXX"
                    value={editOutletData.phone}
                    onChange={(e) => setEditOutletData({ ...editOutletData, phone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-amber-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">سقف الدين الائتماني (ر.ي)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editOutletData.creditLimit}
                    onChange={(e) =>
                      setEditOutletData({ ...editOutletData, creditLimit: Number(e.target.value) })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-amber-500 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  الموقع / العنوان الحالي <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="الشارع، الحارة، أو المعلم المجاور"
                  value={editOutletData.location}
                  onChange={(e) => setEditOutletData({ ...editOutletData, location: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">ملاحظات إضافية (اختياري)</label>
                <input
                  type="text"
                  placeholder="أي تفاصيل خاصة بالمنفذ أو آلية السداد..."
                  value={editOutletData.notes}
                  onChange={(e) => setEditOutletData({ ...editOutletData, notes: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-amber-500"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 space-y-1">
                <div className="flex justify-between">
                  <span>الدين الحالي المسجل:</span>
                  <span className="font-bold text-white">{(editingOutlet.currentDebt || 0).toLocaleString()} ر.ي</span>
                </div>
                <div className="flex justify-between text-[10px] text-amber-400/80">
                  <span>المزامنة السحابية:</span>
                  <span>تحديث فوري ومباشر في Firestore</span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditOutletOpen(false);
                    setEditingOutlet(null);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer"
                >
                  إلغاء
                </button>
                {(editingOutlet.currentDebt || 0) === 0 && (
                  <button
                    type="button"
                    onClick={() => handleDeleteOutlet(editingOutlet)}
                    className="px-3 py-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500 text-rose-400 hover:text-white font-bold text-xs border border-rose-500/30 transition cursor-pointer flex items-center justify-center gap-1"
                    title="حذف هذا المنفذ نهائياً من قاعدة البيانات"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>حذف المنفذ</span>
                  </button>
                )}
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>حفظ التعديلات في السحابة</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Modal: Delivery Voucher (DEL) */}
      {isDeliveryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-xl rounded-2xl bg-slate-900 border border-slate-700 p-6 text-slate-100 shadow-2xl relative text-right flex flex-col max-h-[92vh]">
            <button
              onClick={() => setIsDeliveryModalOpen(false)}
              className="absolute left-4 top-4 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-4 shrink-0 pb-3 border-b border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold shadow-inner">
                <ArrowUpRight className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white">سند توريد كروت لمنفذ (DEL)</h3>
                <p className="text-xs text-slate-400">
                  تحديد تاريخ التوريد، اختيار أرقام الشيتات من الدفعة، واحتساب الكاش والدين
                </p>
              </div>
            </div>

            <form onSubmit={handleDeliverySubmit} className="space-y-4 overflow-y-auto pr-1 flex-1">
              {deliveryError && (
                <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center gap-2 animate-in fade-in">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{deliveryError}</span>
                </div>
              )}
              {/* 1. DATE SECTION - Added with high prominence */}
              <div className="bg-slate-950 p-3.5 rounded-2xl border border-blue-500/30 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold text-blue-400 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    <span>تاريخ التوريد المعتمد للعملية:</span>
                  </label>

                  {/* Quick Date Shortcuts */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setDeliveryDate(new Date().toISOString().split('T')[0])}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${
                        deliveryDate === new Date().toISOString().split('T')[0]
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-800 text-slate-300 hover:text-white'
                      }`}
                    >
                      اليوم
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date();
                        d.setDate(d.getDate() - 1);
                        setDeliveryDate(d.toISOString().split('T')[0]);
                      }}
                      className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-slate-300 hover:text-white transition cursor-pointer"
                    >
                      أمس
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date();
                        d.setDate(d.getDate() - 2);
                        setDeliveryDate(d.toISOString().split('T')[0]);
                      }}
                      className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-slate-300 hover:text-white transition cursor-pointer"
                    >
                      أول أمس
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="date"
                    required
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-hidden focus:border-blue-500"
                  />
                  <div className="flex items-center px-3 py-2 bg-slate-900/80 rounded-xl border border-slate-800 text-xs font-bold text-slate-300">
                    <CalendarDays className="w-3.5 h-3.5 text-blue-400 ml-1.5 shrink-0" />
                    <span className="truncate">{formatArabicDate(deliveryDate)}</span>
                  </div>
                </div>
              </div>

              {/* 2. Outlet Selector & Details Preview */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-300">المنفذ المستلم:</label>
                <select
                  required
                  value={deliveryTargetOutletId}
                  onChange={(e) => setDeliveryTargetOutletId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-hidden focus:border-blue-500 font-bold"
                >
                  {outlets.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name} — (المالك: {o.ownerName} • الدين: {o.currentDebt.toLocaleString()} ر.ي)
                    </option>
                  ))}
                </select>

                {/* Selected Outlet Quick Card */}
                {(() => {
                  const targetOutlet = outlets.find((o) => o.id === deliveryTargetOutletId);
                  if (!targetOutlet) return null;
                  return (
                    <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 block">مالك المحل والهاتف:</span>
                        <span className="font-bold text-slate-200">
                          {targetOutlet.ownerName} {targetOutlet.phone ? `(${targetOutlet.phone})` : ''}
                        </span>
                      </div>
                      <div className="text-left">
                        <span className="text-[10px] text-slate-400 block">الدين الحالي للمحل:</span>
                        <span className="font-extrabold text-rose-400">
                          {targetOutlet.currentDebt.toLocaleString()} ر.ي
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* 2.5 Custody Source Selector (المخزون المسحوب منه التوريد للمنفذ) */}
              {currentRole === 'admin' ? (
                <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-extrabold text-slate-300 flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-blue-400" />
                      <span>المخزون المسحوب منه التوريد للمنفذ:</span>
                    </label>
                    <span className="text-[10px] text-slate-400 font-bold">
                      حدد العهدة التي ستخرج منها الشيتات
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setDeliveryCustodySource('distributor_custody');
                        setSelectedSheetCodes([]);
                        setDeliverySheetsCount(0);
                      }}
                      className={`p-2.5 rounded-xl text-xs font-bold border transition text-center cursor-pointer ${
                        deliveryCustodySource === 'distributor_custody'
                          ? 'bg-blue-600 text-white border-blue-500 shadow-md'
                          : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      🚚 من عهدة الموزع الميداني (المعتاد)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDeliveryCustodySource('admin_custody');
                        setSelectedSheetCodes([]);
                        setDeliverySheetsCount(0);
                      }}
                      className={`p-2.5 rounded-xl text-xs font-bold border transition text-center cursor-pointer ${
                        deliveryCustodySource === 'admin_custody'
                          ? 'bg-blue-600 text-white border-blue-500 shadow-md'
                          : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      🏢 من مخزن المسؤول المباشر
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[11px] text-blue-300 flex items-center justify-between font-bold">
                  <span>المخزون المتاح للتوزيع:</span>
                  <span className="text-white">عهدة الموزع الميدانية الخاصة بك</span>
                </div>
              )}

              {/* 3. Category Picker with Accurate Live Stock Status */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-300">فئة الكرت المورد:</label>
                  <span className="text-[11px] font-bold text-slate-400">
                    المتاح للتوزيع في {deliveryCustodySource === 'distributor_custody' ? 'عهدة الموزع' : 'مخزن المسؤول'}:{' '}
                    <span className="text-emerald-400 font-extrabold">
                      {custodyStockByCategory[deliveryCategory]?.activeStockSheets || 0} شيت ({totalAvailableCardsForDelivery} كرت)
                    </span>
                  </span>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {Object.keys(CARD_CATEGORIES_CONFIG).map((catKey) => {
                    const cat = catKey as CardCategory;
                    const stock = custodyStockByCategory[cat];
                    const activeStock = stock?.activeStockSheets || 0;
                    const activeCards = stock?.activeStockCards || 0;
                    const isExhausted = activeCards === 0;

                    return (
                      <button
                        type="button"
                        key={cat}
                        onClick={() => handleDeliveryCatChange(cat)}
                        className={`p-2 rounded-xl text-xs font-bold border transition text-center cursor-pointer ${
                          deliveryCategory === cat
                            ? isExhausted
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500 shadow-md'
                              : 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/25'
                            : isExhausted
                            ? 'bg-slate-950 border-rose-500/30 text-rose-400/90 hover:border-rose-500/50'
                            : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-center gap-1 font-extrabold">
                          <span>فئة {cat}</span>
                          {isExhausted && <span className="text-[9px] text-rose-400">🚨</span>}
                        </div>
                        <div
                          className={`text-[10px] mt-0.5 ${
                            isExhausted
                              ? 'text-rose-400 font-bold'
                              : deliveryCategory === cat
                              ? 'text-blue-200 font-bold'
                              : 'text-slate-400'
                          }`}
                        >
                          {isExhausted ? 'نافدة (0)' : `${activeStock} ش (${activeCards} ك)`}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Stock distribution hint bar */}
                <div className="flex items-center justify-between text-[11px] text-slate-400 bg-slate-950 px-3 py-2 rounded-xl border border-slate-800 mt-2">
                  <span>
                    بعهدة الموزع الميداني:{' '}
                    <strong className="text-emerald-400">
                      {custodyStockByCategory[deliveryCategory]?.distributorSheets || 0} شيت ({custodyStockByCategory[deliveryCategory]?.distributorCards || 0} كرت)
                    </strong>
                  </span>
                  <span>
                    بمخزن المسؤول المباشر:{' '}
                    <strong className="text-amber-400">
                      {custodyStockByCategory[deliveryCategory]?.adminSheets || 0} شيت ({custodyStockByCategory[deliveryCategory]?.adminCards || 0} كرت)
                    </strong>
                  </span>
                </div>
              </div>

              {/* Red Warning Banner when Category is Exhausted in the Selected Custody */}
              {totalAvailableCardsForDelivery === 0 && (
                <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-200 text-xs space-y-2 animate-in fade-in">
                  <div className="flex items-center gap-2 font-bold text-rose-400 text-sm">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>⛔ لا يمكن التوريد: الكمية نافدة من المخزون المتاح للتوزيع!</span>
                  </div>
                  <p className="leading-relaxed">
                    لا توجد أي شيتات فئة {deliveryCategory} ريال متوفرة حالياً في{' '}
                    <strong>{deliveryCustodySource === 'distributor_custody' ? 'عهدة الموزع الميداني' : 'مخزن المسؤول المباشر'}</strong>.
                  </p>
                  {deliveryCustodySource === 'distributor_custody' &&
                    (custodyStockByCategory[deliveryCategory]?.adminCards || 0) > 0 && (
                      <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] font-bold">
                        💡 ملاحظة: يتوفر {custodyStockByCategory[deliveryCategory]?.adminSheets} شيت ({custodyStockByCategory[deliveryCategory]?.adminCards} كرت) في مخزن المسؤول لم يتم تحويلها بعد. يجب أولاً إصدار سند تحويل عهدة (TR) للموزع لكي يستطيع توزيعها للمنافذ!
                      </div>
                    )}
                  {deliveryCustodySource === 'admin_custody' &&
                    (custodyStockByCategory[deliveryCategory]?.distributorCards || 0) > 0 && (
                      <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-300 text-[11px] font-bold">
                        💡 ملاحظة: الشيتات ({custodyStockByCategory[deliveryCategory]?.distributorSheets} شيت / {custodyStockByCategory[deliveryCategory]?.distributorCards} كرت) قد تم تحويلها بالفعل إلى عهدة الموزع الميداني، ولا تتوفر في مخزن المسؤول المباشر. يمكنك التبديل بالأعلى إلى "من عهدة الموزع الميداني".
                      </div>
                    )}
                  <p className="text-[11px] text-rose-300 font-extrabold">
                    يمنع النظام التوريد لضمان دقة الرصيد والمطابقة المحاسبية ومنع العجز الوهمي.
                  </p>
                </div>
              )}

              {deliveryError && (
                <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{deliveryError}</span>
                </div>
              )}

              {/* 3.5 Delivery Unit Mode Toggle (when category supports card units like 1000, 3000, 5000, 10000) */}
              {CARD_CATEGORIES_CONFIG[deliveryCategory]?.allowCardUnits && (
                <div className="bg-slate-950 p-3 rounded-2xl border border-blue-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-extrabold text-blue-400 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <span>طريقة التوريد للمنفذ (فئة {deliveryCategory} ريال):</span>
                    </label>
                    <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                      متاح التوريد بالشيت أو بالكروت
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setDeliveryUnitMode('sheets')}
                      className={`p-2.5 rounded-xl text-xs font-bold border transition text-center cursor-pointer ${
                        deliveryUnitMode === 'sheets'
                          ? 'bg-blue-600 text-white border-blue-500 shadow-md'
                          : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      📄 بالشيت الكامل (60 كرت / شيت)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDeliveryUnitMode('cards');
                        if (!deliveryCustomCardsCount || deliveryCustomCardsCount <= 0) {
                          setDeliveryCustomCardsCount(80);
                        }
                      }}
                      className={`p-2.5 rounded-xl text-xs font-bold border transition text-center cursor-pointer ${
                        deliveryUnitMode === 'cards'
                          ? 'bg-emerald-600 text-white border-emerald-500 shadow-md'
                          : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      🎴 بعدد الكروت المباشر (80 كرت، 20 كرت...)
                    </button>
                  </div>
                </div>
              )}

              {/* 4. SELECTION SECTION: EITHER DIRECT CARDS OR FULL SHEETS */}
              {deliveryUnitMode === 'cards' ? (
                /* CARD UNIT MODE: Direct count, presets (80, 20), and auto-slicing decomposition */
                <div className="bg-slate-950 p-4 rounded-2xl border border-emerald-500/40 space-y-3.5 animate-in fade-in">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-2 border-b border-slate-800">
                    <label className="text-xs font-extrabold text-emerald-400 flex items-center gap-1.5">
                      <Layers className="w-4 h-4" />
                      <span>توريد كروت فئة {deliveryCategory} ريال بالعدد المباشر:</span>
                    </label>
                    <span className="text-[11px] font-bold text-slate-300">
                      المتوفر بعهدتك: <strong className="text-emerald-400">{totalAvailableCardsForDelivery} كرت</strong>{' '}
                      ({Math.floor(totalAvailableCardsForDelivery / CARD_CATEGORIES_CONFIG[deliveryCategory].defaultCardsPerSheet)} شيت و{' '}
                      {totalAvailableCardsForDelivery % CARD_CATEGORIES_CONFIG[deliveryCategory].defaultCardsPerSheet} كرت)
                    </span>
                  </div>

                  {/* Quick Card Presets: 20, 30, 40, 60, 80, 100, 120 */}
                  <div>
                    <span className="text-[11px] text-slate-400 font-bold block mb-1.5">
                      اختيار سريع لعدد الكروت الأكثر طلباً:
                    </span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {[20, 30, 40, 60, 80, 100, 120].map((count) => {
                        const isSelected = deliveryCustomCardsCount === count;
                        const full = Math.floor(count / 60);
                        const loose = count % 60;
                        const label = full > 0 && loose > 0 ? `${count} كرت (${full}ش+${loose}ك)` : `${count} كرت`;
                        return (
                          <button
                            key={count}
                            type="button"
                            onClick={() => setDeliveryCustomCardsCount(count)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                              isSelected
                                ? 'bg-emerald-600 text-white border-emerald-500 shadow-md font-black'
                                : 'bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800'
                            }`}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Direct Numeric Input */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        عدد الكروت المطلوب توريدها للمنفذ:
                      </label>
                      <input
                        type="number"
                        min="1"
                        max={Math.max(1, totalAvailableCardsForDelivery)}
                        required
                        value={deliveryCustomCardsCount}
                        onChange={(e) => setDeliveryCustomCardsCount(Math.max(1, Number(e.target.value)))}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-hidden focus:border-emerald-500 font-black font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        سعر الكرت بالجملة (ر.ي):
                      </label>
                      <input
                        type="number"
                        min="0"
                        required
                        value={deliveryCardUnitPrice}
                        onChange={(e) => setDeliveryCardUnitPrice(Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-emerald-400 focus:outline-hidden focus:border-emerald-500 font-bold font-mono"
                      />
                    </div>
                  </div>

                  {/* Mathematical Decomposition and Breakdown Banner */}
                  {(() => {
                    const cardsPerSheet = CARD_CATEGORIES_CONFIG[deliveryCategory].defaultCardsPerSheet || 60;
                    const fullSheets = Math.floor(deliveryCustomCardsCount / cardsPerSheet);
                    const looseCards = deliveryCustomCardsCount % cardsPerSheet;
                    const fullSheetsPrice = fullSheets * deliveryUnitPrice;
                    const looseCardsPrice = looseCards * deliveryCardUnitPrice;
                    const remainderInCustody = looseCards > 0 ? cardsPerSheet - looseCards : 0;

                    return (
                      <div className="p-3.5 rounded-xl bg-slate-900 border border-emerald-500/30 text-xs space-y-2">
                        <div className="flex items-center justify-between font-bold">
                          <span className="text-emerald-400 flex items-center gap-1.5">
                            <CheckCircle className="w-4 h-4 text-emerald-400" />
                            <span>تفصيل تركيبة الكمية الموردة:</span>
                          </span>
                          <span className="text-white font-extrabold text-sm font-mono">
                            {deliveryCustomCardsCount} كرت = {fullSheets > 0 ? `${fullSheets} شيت كامل ` : ''}
                            {looseCards > 0 ? (fullSheets > 0 ? `+ ${looseCards} كرت مجزأ` : `${looseCards} كرت مجزأ من شيت`) : ''}
                          </span>
                        </div>

                        <div className="text-[11px] text-slate-300 flex items-center justify-between bg-slate-950 p-2 rounded-lg border border-slate-800">
                          <span>احتساب القيمة المالية الدقيقة:</span>
                          <span className="font-mono text-emerald-300 font-bold">
                            {fullSheets > 0 && `${fullSheets} شيت × ${deliveryUnitPrice.toLocaleString()} (${fullSheetsPrice.toLocaleString()} ر.ي) + `}
                            {looseCards > 0 && `${looseCards} كرت × ${deliveryCardUnitPrice.toLocaleString()} (${looseCardsPrice.toLocaleString()} ر.ي) = `}
                            <strong className="text-white text-xs">{computedDeliveryTotal.toLocaleString()} ر.ي</strong>
                          </span>
                        </div>

                        {looseCards > 0 ? (
                          <div className="text-[10px] text-amber-300 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20 leading-relaxed font-bold">
                            ✂️ آلية حركة المخزون: {fullSheets > 0 ? `سيتم تسليم ${fullSheets} شيت كامل، وقص شريحة ${looseCards} كرت من شيت آخر.` : `سيتم قص شريحة ${looseCards} كرت من شيت متاح بعهدتك.`} يتبقى في الشيت المفتوح بعهدتك <strong>{remainderInCustody} كرت</strong> جاهزة للتوزيع لاحقاً.
                          </div>
                        ) : (
                          <div className="text-[10px] text-emerald-300 bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20 font-bold">
                            📦 سيتم تسليم {fullSheets} شيت كامل مباشرة دون تجزئة.
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              ) : (
                /* SHEET UNIT MODE: Batch Selector, Range, and Sheet Badges */
                <div className="bg-slate-950 p-3.5 rounded-2xl border border-emerald-500/30 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <label className="text-xs font-extrabold text-emerald-400 flex items-center gap-1.5">
                      <Layers className="w-4 h-4" />
                      <span>خيار أرقام الشيتات الموزعة من الدفعة:</span>
                    </label>
                    <span className="text-[11px] font-bold text-emerald-300 bg-emerald-500/10 px-2.5 py-0.5 rounded-md border border-emerald-500/20">
                      محدد: {selectedSheetCodes.length} شيت من {availableSheetsForDelivery.length} متاح
                    </span>
                  </div>

                  {/* Batch Selector Dropdown */}
                  {availableBatchesForCategory.length > 1 && (
                    <div className="flex items-center gap-2 bg-slate-900 p-2 rounded-xl border border-slate-800 text-xs">
                      <span className="text-slate-400 shrink-0 font-bold">تحديد الدفعة:</span>
                      <select
                        value={selectedBatchId}
                        onChange={(e) => {
                          setSelectedBatchId(e.target.value);
                          setSelectedSheetCodes([]);
                          setDeliverySheetsCount(0);
                        }}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-hidden font-bold"
                      >
                        <option value="all">
                          جميع الدفعات المتاحة ({availableBatchesForCategory.reduce((a, b) => a + b.count, 0)} شيت)
                        </option>
                        {availableBatchesForCategory.map((b) => (
                          <option key={b.batchId} value={b.batchId}>
                            {b.batchName} ({b.date}) — متوفر: {b.count} شيت
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {availableSheetsForDelivery.length === 0 ? (
                    <div className="p-3 text-center rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-400 text-xs font-bold">
                      ⚠️ لا توجد شيتات فئة {deliveryCategory} في عهدتك حالياً. يرجى طلب تحويل عهدة من المسؤول أولاً.
                    </div>
                  ) : (
                    <>
                      {/* Quick Selection Presets */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={selectAllAvailableSheets}
                          className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[10px] font-bold text-slate-300 hover:text-white transition cursor-pointer"
                        >
                          تحديد الكل ({availableSheetsForDelivery.length})
                        </button>
                        {[1, 2, 3, 5, 10].map(
                          (num) =>
                            availableSheetsForDelivery.length >= num && (
                              <button
                                key={num}
                                type="button"
                                onClick={() => {
                                  const codes = availableSheetsForDelivery
                                    .slice(0, num)
                                    .map((s) => s.sheetCode);
                                  setSelectedSheetCodes(codes);
                                  setDeliverySheetsCount(codes.length);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[10px] font-bold text-slate-300 hover:text-white transition cursor-pointer"
                              >
                                {num} شيت
                              </button>
                            )
                        )}
                        <button
                          type="button"
                          onClick={clearSelectedSheets}
                          className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[10px] font-bold text-rose-400 hover:text-rose-300 transition cursor-pointer"
                        >
                          مسح التحديد
                        </button>
                      </div>

                      {/* Sequential Range Selection (من شيت # إلى شيت #) */}
                      <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center gap-2 text-xs">
                        <span className="text-slate-400 font-bold shrink-0">تحديد بالمدى:</span>
                        <div className="flex items-center gap-1.5 flex-1">
                          <span className="text-[10px] text-slate-500">من شيت #</span>
                          <input
                            type="number"
                            placeholder="مثال: 1"
                            value={rangeFrom}
                            onChange={(e) => setRangeFrom(e.target.value === '' ? '' : Number(e.target.value))}
                            className="w-16 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-center font-bold text-white text-xs font-mono"
                          />
                          <span className="text-[10px] text-slate-500">إلى #</span>
                          <input
                            type="number"
                            placeholder="مثال: 5"
                            value={rangeTo}
                            onChange={(e) => setRangeTo(e.target.value === '' ? '' : Number(e.target.value))}
                            className="w-16 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-center font-bold text-white text-xs font-mono"
                          />
                          <button
                            type="button"
                            onClick={applySequentialRange}
                            className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] transition cursor-pointer"
                          >
                            تطبيق المدى
                          </button>
                        </div>
                      </div>

                      {/* Sheet Badges Clickable Grid */}
                      <div className="max-h-40 overflow-y-auto p-2 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-wrap gap-1.5">
                        {availableSheetsForDelivery.map((sheet) => {
                          const isSelected = selectedSheetCodes.includes(sheet.sheetCode);
                          const batchInfo = batches.find((b) => b.id === sheet.batchId);

                          const catBNum = sheet.categoryBatchNumber || (batchInfo ? getCategoryBatchNumber(batchInfo, batches) : 1);
                          const ordinalBadge = ORDINAL_ARABIC[catBNum] || `د.${catBNum}`;

                          return (
                            <button
                              type="button"
                              key={sheet.sheetCode}
                              onClick={() => toggleSheetCode(sheet.sheetCode)}
                              title={`${formatSheetWithBatch(sheet, batchInfo, batches)} (${sheet.sheetCode})`}
                              className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition cursor-pointer border ${
                                isSelected
                                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                                  : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                              }`}
                            >
                              {isSelected ? (
                                <CheckCircle className="w-3.5 h-3.5 text-white" />
                              ) : (
                                <div className="w-3.5 h-3.5 rounded-full border border-slate-600" />
                              )}
                              <span>شيت #{sheet.leafNumber}</span>
                              <span className="text-[10px] opacity-85 font-sans font-normal">
                                ({ordinalBadge})
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Selected Numbers Summary Banner */}
                      <div className="text-[11px] text-slate-300 bg-emerald-950/30 p-2.5 rounded-xl border border-emerald-500/20 flex flex-col gap-1">
                        <div className="flex items-center justify-between font-bold">
                          <span className="text-emerald-300 flex items-center gap-1">
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span>أرقام الشيتات المختارة للتوريد:</span>
                          </span>
                          <span className="text-emerald-400 font-extrabold">
                            {selectedSheetCodes.length} شيت (
                            {selectedSheetCodes.length *
                              CARD_CATEGORIES_CONFIG[deliveryCategory].defaultCardsPerSheet}{' '}
                            كرت)
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-300 font-mono">
                          {selectedSheetCodes.length === 0 ? (
                            <span className="text-amber-400">
                              لم يتم اختيار أي شيت بعد، انقر على أرقام الشيتات بالأعلى لتحديدها
                            </span>
                          ) : (
                            sheets
                              .filter((s) => selectedSheetCodes.includes(s.sheetCode))
                              .map((s) => formatSheetWithBatch(s, undefined, batches))
                              .join('، ')
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* 5. Sheets Count & Agreed Wholesale Unit Price (only in sheet mode) */}
              {deliveryUnitMode === 'sheets' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      عدد الشيتات المعتمد:
                    </label>
                    <input
                      type="number"
                      min="1"
                      max={Math.max(1, availableSheetsForDelivery.length)}
                      required
                      value={deliverySheetsCount}
                      onChange={(e) => handleSheetsCountInputChange(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-blue-500 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      سعر الشيت بالجملة:
                    </label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={deliveryUnitPrice}
                      onChange={(e) => setDeliveryUnitPrice(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-blue-500 font-bold text-emerald-400 font-mono"
                    />
                  </div>
                </div>
              )}

              {/* 6. Total Calculation & Instant Cash Payment */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-850">
                  <span className="text-slate-400">إجمالي قيمة التوريد بالجملة:</span>
                  <span className="font-extrabold text-white text-base font-mono">
                    {computedDeliveryTotal.toLocaleString()} ر.ي
                  </span>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-emerald-400">
                      المبلغ المسدد فوراً نقداً (كاش للموزع):
                    </label>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setDeliveryCashPaid(computedDeliveryTotal)}
                        className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 text-[10px] font-bold transition cursor-pointer"
                      >
                        100% كاش
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeliveryCashPaid(Math.round(computedDeliveryTotal / 2))}
                        className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 hover:text-white text-[10px] font-bold transition cursor-pointer"
                      >
                        50% نصف
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeliveryCashPaid(0)}
                        className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 text-[10px] font-bold transition cursor-pointer"
                      >
                        0% آجل
                      </button>
                    </div>
                  </div>

                  <input
                    type="number"
                    min="0"
                    max={computedDeliveryTotal}
                    value={deliveryCashPaid}
                    onChange={(e) => setDeliveryCashPaid(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-750 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-emerald-500 font-bold text-emerald-300 font-mono text-lg"
                  />
                </div>

                <div className="flex justify-between text-xs pt-1 text-rose-300 font-bold border-t border-slate-850">
                  <span>المبلغ المقيد كدين على المنفذ:</span>
                  <span className="text-sm font-black font-mono">
                    {Math.max(0, computedDeliveryTotal - deliveryCashPaid).toLocaleString()} ر.ي
                  </span>
                </div>

                {/* Outlet Debt Balance Impact */}
                {(() => {
                  const targetOutlet = outlets.find((o) => o.id === deliveryTargetOutletId);
                  if (!targetOutlet) return null;
                  const addedDebt = Math.max(0, computedDeliveryTotal - deliveryCashPaid);
                  const newTotalDebt = targetOutlet.currentDebt + addedDebt;
                  const isExceeding =
                    targetOutlet.creditLimit > 0 && newTotalDebt > targetOutlet.creditLimit;

                  return (
                    <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-[11px] space-y-1">
                      <div className="flex justify-between text-slate-400">
                        <span>الدين السابق: {targetOutlet.currentDebt.toLocaleString()} ر.ي</span>
                        <span>+ المضاف: {addedDebt.toLocaleString()} ر.ي</span>
                      </div>
                      <div className="flex justify-between font-bold pt-1 border-t border-slate-800">
                        <span className="text-slate-300">رصيد المنفذ الجديد بعد التوريد:</span>
                        <span
                          className={`font-black ${isExceeding ? 'text-rose-400' : 'text-amber-400'}`}
                        >
                          {newTotalDebt.toLocaleString()} ر.ي
                        </span>
                      </div>
                      {isExceeding && (
                        <div className="text-[10px] text-rose-400 font-bold pt-0.5">
                          ⚠️ تنبيه: الرصيد سيتجاوز سقف الدين الائتماني للمحل (
                          {targetOutlet.creditLimit.toLocaleString()} ر.ي)!
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* 7. Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  ملاحظات التوريد (اختياري)
                </label>
                <input
                  type="text"
                  value={deliveryNotes}
                  onChange={(e) => setDeliveryNotes(e.target.value)}
                  placeholder="ملاحظات أو أسماء المستلمين..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDeliveryModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={
                    deliveryUnitMode === 'cards'
                      ? totalAvailableCardsForDelivery === 0 ||
                        deliveryCustomCardsCount <= 0 ||
                        deliveryCustomCardsCount > totalAvailableCardsForDelivery
                      : availableSheetsForDelivery.length === 0 ||
                        Number(deliverySheetsCount) > availableSheetsForDelivery.length ||
                        selectedSheetCodes.length === 0 ||
                        selectedSheetCodes.length < Number(deliverySheetsCount)
                  }
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-xs shadow-lg shadow-blue-600/25 transition cursor-pointer"
                  title={
                    deliveryUnitMode === 'cards'
                      ? totalAvailableCardsForDelivery === 0
                        ? 'رصيد الكروت المتاح نفذ بالكامل (0 كرت) - التوريد معطل'
                        : deliveryCustomCardsCount > totalAvailableCardsForDelivery
                        ? 'الكمية المطلوبة تتجاوز رصيد الكروت المتاح'
                        : 'إصدار سند توريد الكروت وتثبيت العملية'
                      : availableSheetsForDelivery.length === 0
                      ? 'رصيد المخزون المتاح للتوزيع نفذ بالكامل (0 شيت) - التوريد معطل'
                      : Number(deliverySheetsCount) > availableSheetsForDelivery.length
                      ? 'الكمية المطلوبة تتجاوز رصيد العهدة المتاح'
                      : 'إصدار سند التوريد وتثبيت العملية'
                  }
                >
                  {deliveryUnitMode === 'cards'
                    ? totalAvailableCardsForDelivery === 0
                      ? '⛔ رصيد الكروت نافد'
                      : `إصدار سند توريد (${deliveryCustomCardsCount} كرت) 🚀`
                    : availableSheetsForDelivery.length === 0
                    ? '⛔ الرصيد نفذ من المخزون'
                    : 'إصدار سند التوريد وتثبيت العملية 🚀'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Modal: Payment Voucher (PAY) */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700 p-6 text-slate-100 shadow-2xl relative text-right">
            <button
              onClick={() => setIsPaymentModalOpen(false)}
              className="absolute left-4 top-4 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                <Coins className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white">سند قبض وتسديد نقدية (PAY)</h3>
                <p className="text-xs text-slate-400">تحصيل نقدية من المنفذ وخصمها من حسابه</p>
              </div>
            </div>

            <form onSubmit={handlePaymentSubmit} className="space-y-3.5">
              {/* Payment Date */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                  تاريخ القبض:
                </label>
                <input
                  type="date"
                  required
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-750 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">المنفذ المسدد:</label>
                <select
                  required
                  value={paymentTargetOutletId}
                  onChange={(e) => setPaymentTargetOutletId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-emerald-500 font-bold"
                >
                  {outlets.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name} — (الدين الحالي: {o.currentDebt.toLocaleString()} ر.ي)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-emerald-400">
                    المبلغ المقبوض (ر.ي):
                  </label>
                  {(() => {
                    const targetOutlet = outlets.find((o) => o.id === paymentTargetOutletId);
                    if (!targetOutlet || targetOutlet.currentDebt <= 0) return null;
                    return (
                      <button
                        type="button"
                        onClick={() => setPaymentAmount(targetOutlet.currentDebt)}
                        className="text-[10px] text-emerald-400 underline hover:text-emerald-300 cursor-pointer"
                      >
                        تسديد كامل الدين ({targetOutlet.currentDebt.toLocaleString()} ر.ي)
                      </button>
                    );
                  })()}
                </div>
                <input
                  type="number"
                  min="1"
                  required
                  value={paymentAmount || ''}
                  onChange={(e) => setPaymentAmount(Number(e.target.value))}
                  placeholder="المبلغ نقداً..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-base text-emerald-400 focus:outline-hidden focus:border-emerald-500 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">طريقة القبض</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cash')}
                    className={`py-2 rounded-xl text-xs font-bold border transition ${
                      paymentMethod === 'cash'
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-slate-950 text-slate-400 border-slate-800'
                    }`}
                  >
                    نقداً (كاش)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('transfer')}
                    className={`py-2 rounded-xl text-xs font-bold border transition ${
                      paymentMethod === 'transfer'
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-slate-950 text-slate-400 border-slate-800'
                    }`}
                  >
                    حوالة بنكية / صراف
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">ملاحظات (اختياري)</label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="مثال: دفعة من حساب الأسبوع، تحصيل يدوي..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={paymentAmount <= 0}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs shadow-md transition"
                >
                  إصدار سند القبض
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Rich Statement of Account Modal with WhatsApp & Print */}
      <OutletStatementModal
        outlet={selectedOutletForStatement}
        isOpen={Boolean(selectedOutletForStatement)}
        onClose={() => setSelectedOutletForStatement(null)}
        deliveries={deliveries}
        payments={payments}
      />

      {/* 5. Modal: Voucher Print & Details (DEL or PAY) */}
      {selectedVoucherForPrint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-white border border-slate-300 p-6 text-slate-900 shadow-2xl relative text-right">
            <button
              onClick={() => setSelectedVoucherForPrint(null)}
              className="absolute left-4 top-4 p-1 rounded-lg text-slate-400 hover:text-slate-800 transition no-print"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Receipt Content */}
            <div className="border-b-2 border-dashed border-slate-300 pb-3 mb-3 text-center">
              <h2 className="text-lg font-black text-slate-900">شبكة قعزان نت</h2>
              <p className="text-xs text-slate-600">
                {selectedVoucherForPrint.type === 'DEL' ? 'سند توريد كروت إنترنت' : 'سند قبض نقدية رسمي'}
              </p>
              <div className="inline-block mt-1 px-3 py-0.5 bg-slate-100 rounded-full font-mono font-bold text-xs text-slate-800">
                {selectedVoucherForPrint.data.id}
              </div>
            </div>

            {selectedVoucherForPrint.type === 'DEL' ? (
              // DEL Voucher Details
              <div className="space-y-1.5 text-xs text-slate-700 mb-4">
                {(() => {
                  const d = selectedVoucherForPrint.data as DeliveryVoucher;
                  const sheetLeafNumbers = sheets
                    .filter((s) => d.sheetCodes.includes(s.sheetCode))
                    .map((s) => formatSheetWithBatch(s, undefined, batches))
                    .join('، ');

                  return (
                    <>
                      <div className="flex justify-between">
                        <span className="text-slate-500">المنفذ:</span>
                        <span className="font-bold">{d.outletName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">التاريخ:</span>
                        <span className="font-bold">{d.date} ({formatArabicDate(d.date)})</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">الفئة:</span>
                        <span className="font-bold">فئة {d.category} ريال</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">الكمية:</span>
                        <span className="font-bold">
                          {d.deliveryUnit === 'cards'
                            ? `${d.cardsCount} كرت (${Math.floor(d.cardsCount / (CARD_CATEGORIES_CONFIG[d.category]?.defaultCardsPerSheet || 60))} شيت ${d.cardsCount % (CARD_CATEGORIES_CONFIG[d.category]?.defaultCardsPerSheet || 60) > 0 ? `+ ${d.cardsCount % (CARD_CATEGORIES_CONFIG[d.category]?.defaultCardsPerSheet || 60)} كرت مجزأ` : 'كامل'})`
                            : `${d.sheetsCount} شيت (${d.cardsCount} كرت)`}
                        </span>
                      </div>
                      <div className="flex justify-between border-t border-slate-100 pt-1 text-[11px]">
                        <span className="text-slate-500">أرقام الشيتات من الدفعة:</span>
                        <span className="font-bold text-blue-700 font-mono">
                          {sheetLeafNumbers || (d.sheetCodes && d.sheetCodes.join(', ')) || 'محدد بالكمية'}
                        </span>
                      </div>
                      <div className="flex justify-between border-t border-slate-200 pt-1 font-bold text-slate-900">
                        <span>إجمالي القيمة:</span>
                        <span>{d.totalAmount.toLocaleString()} ر.ي</span>
                      </div>
                      <div className="flex justify-between text-emerald-700">
                        <span>المدفوع كاش:</span>
                        <span>{d.cashPaidNow.toLocaleString()} ر.ي</span>
                      </div>
                      <div className="flex justify-between text-rose-700 font-extrabold text-sm border-t border-slate-200 pt-1">
                        <span>الدين المقيد:</span>
                        <span>{d.remainingDebt.toLocaleString()} ر.ي</span>
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-500 pt-1">
                        <span>المسلّم:</span>
                        <span>{d.deliveredBy}</span>
                      </div>
                    </>
                  );
                })()}
              </div>
            ) : (
              // PAY Voucher Details
              <div className="space-y-1.5 text-xs text-slate-700 mb-4">
                {(() => {
                  const p = selectedVoucherForPrint.data as PaymentVoucher;
                  return (
                    <>
                      <div className="flex justify-between">
                        <span className="text-slate-500">المنفذ:</span>
                        <span className="font-bold">{p.outletName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">التاريخ:</span>
                        <span className="font-bold">{p.date} ({formatArabicDate(p.date)})</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">طريقة الدفع:</span>
                        <span>{p.paymentMethod === 'cash' ? 'نقداً (كاش)' : 'حوالة'}</span>
                      </div>
                      <div className="flex justify-between border-t border-slate-200 pt-1 text-base font-black text-emerald-700">
                        <span>المبلغ المستلم:</span>
                        <span>{p.amount.toLocaleString()} ر.ي</span>
                      </div>
                      <div className="flex justify-between text-slate-500 pt-1">
                        <span>الدين السابق:</span>
                        <span>{p.previousDebt.toLocaleString()} ر.ي</span>
                      </div>
                      <div className="flex justify-between font-bold text-slate-900">
                        <span>المتبقي حالياً:</span>
                        <span>{p.newDebt.toLocaleString()} ر.ي</span>
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-500 pt-1">
                        <span>المحصّل:</span>
                        <span>{p.collectorName}</span>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}

            {/* Actions: Print and WhatsApp */}
            <div className="space-y-2 no-print">
              {selectedVoucherForPrint.type === 'DEL' && (
                <a
                  href={generateDeliveryWhatsAppLink(selectedVoucherForPrint.data as DeliveryVoucher)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>مشاركة سند التوريد عبر واتساب 📲</span>
                </a>
              )}

              {selectedVoucherForPrint.type === 'PAY' && (
                <a
                  href={generateWhatsAppLink(selectedVoucherForPrint.data as PaymentVoucher)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>مشاركة سند القبض عبر واتساب 📲</span>
                </a>
              )}

              <button
                onClick={() => window.print()}
                className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة إيصال السند 🖨️</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal: Edit Delivery Voucher */}
      {isEditDeliveryOpen && editingDelivery && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-700 p-6 text-slate-100 shadow-2xl relative text-right flex flex-col max-h-[90vh]">
            <button
              onClick={() => {
                setIsEditDeliveryOpen(false);
                setEditingDelivery(null);
              }}
              className="absolute left-4 top-4 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-4 shrink-0">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                <Edit3 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white">
                  تعديل سند التوريد ({editingDelivery.id})
                </h3>
                <p className="text-xs text-slate-400">
                  منفذ: {editingDelivery.outletName} • فئة {editingDelivery.category} ريال
                </p>
              </div>
            </div>

            {editDeliveryError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{editDeliveryError}</span>
              </div>
            )}

            {editDeliverySuccess && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{editDeliverySuccess}</span>
              </div>
            )}

            <form onSubmit={handleEditDeliverySubmit} className="space-y-4 overflow-y-auto pr-1 flex-1">
              {/* Context Summary */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1">
                <div className="flex justify-between text-slate-400">
                  <span>المبلغ السابق بالسند:</span>
                  <span className="font-bold text-white">{editingDelivery.totalAmount.toLocaleString()} ر.ي</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>المدفوع كاش سابقاً:</span>
                  <span className="font-bold text-emerald-400">{editingDelivery.cashPaidNow.toLocaleString()} ر.ي</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>الدين المقيد سابقاً:</span>
                  <span className="font-bold text-rose-400">{editingDelivery.remainingDebt.toLocaleString()} ر.ي</span>
                </div>
              </div>

              {/* Quantity */}
              {editingDelivery.deliveryUnit === 'cards' || (editingDelivery.cardsCount && editingDelivery.cardsCount > 0 && !editingDelivery.sheetsCount) ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">عدد الكروت</label>
                    <input
                      type="number"
                      min="1"
                      value={editDeliveryCards}
                      onChange={(e) => setEditDeliveryCards(Math.max(1, parseInt(e.target.value || '1', 10)))}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono font-bold focus:outline-hidden focus:border-amber-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">سعر الكرت (ر.ي)</label>
                    <input
                      type="number"
                      min="1"
                      value={editDeliveryUnitPrice}
                      onChange={(e) => setEditDeliveryUnitPrice(Math.max(0, parseFloat(e.target.value || '0')))}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-hidden focus:border-amber-500"
                      required
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">عدد الشيتات</label>
                    <input
                      type="number"
                      min="1"
                      value={editDeliverySheets}
                      onChange={(e) => setEditDeliverySheets(Math.max(1, parseInt(e.target.value || '1', 10)))}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono font-bold focus:outline-hidden focus:border-amber-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">سعر الشيت (ر.ي)</label>
                    <input
                      type="number"
                      min="1"
                      value={editDeliveryUnitPrice}
                      onChange={(e) => setEditDeliveryUnitPrice(Math.max(0, parseFloat(e.target.value || '0')))}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-hidden focus:border-amber-500"
                      required
                    />
                  </div>
                </div>
              )}

              {/* Cash Paid */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">المبلغ المدفوع كاش نقداً (ر.ي)</label>
                <input
                  type="number"
                  min="0"
                  value={editDeliveryCashPaid}
                  onChange={(e) => setEditDeliveryCashPaid(Math.max(0, parseFloat(e.target.value || '0')))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-emerald-400 font-mono font-bold focus:outline-hidden focus:border-amber-500"
                />
              </div>

              {/* Live Financial Calculation */}
              {(() => {
                const isCard = editingDelivery.deliveryUnit === 'cards' || (editingDelivery.cardsCount && editingDelivery.cardsCount > 0 && !editingDelivery.sheetsCount);
                const config = CARD_CATEGORIES_CONFIG[editingDelivery.category];
                let calcTotal = 0;
                if (isCard) {
                  const full = Math.floor(editDeliveryCards / config.defaultCardsPerSheet);
                  const loose = editDeliveryCards % config.defaultCardsPerSheet;
                  const sheetP = config.defaultWholesaleSheetPrice;
                  calcTotal = full * sheetP + loose * editDeliveryUnitPrice;
                } else {
                  calcTotal = editDeliverySheets * editDeliveryUnitPrice;
                }
                const calcDebt = Math.max(0, calcTotal - editDeliveryCashPaid);
                const diffDebt = calcDebt - editingDelivery.remainingDebt;

                return (
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1.5">
                    <div className="flex justify-between font-bold">
                      <span className="text-slate-300">إجمالي السند بعد التعديل:</span>
                      <span className="text-white font-mono font-black">{calcTotal.toLocaleString()} ر.ي</span>
                    </div>
                    <div className="flex justify-between font-bold">
                      <span className="text-slate-300">الدين الجديد على المنفذ:</span>
                      <span className="text-rose-400 font-mono font-black">{calcDebt.toLocaleString()} ر.ي</span>
                    </div>
                    <div className="pt-1 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                      <span>الفارق في دين المنفذ:</span>
                      <span className={`font-mono font-bold ${diffDebt > 0 ? 'text-rose-400' : diffDebt < 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
                        {diffDebt > 0 ? `+${diffDebt.toLocaleString()}` : diffDebt.toLocaleString()} ر.ي
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Date */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">تاريخ السند</label>
                <input
                  type="date"
                  value={editDeliveryDate}
                  onChange={(e) => setEditDeliveryDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-amber-500"
                  required
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">ملاحظات التعديل</label>
                <input
                  type="text"
                  value={editDeliveryNotes}
                  onChange={(e) => setEditDeliveryNotes(e.target.value)}
                  placeholder="ملاحظات توضيحية..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition cursor-pointer shadow-md"
                >
                  حفظ تعديل التوريد وتسوية الحساب
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditDeliveryOpen(false);
                    setEditingDelivery(null);
                  }}
                  className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer transition"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Delete Delivery Voucher Confirmation */}
      {deletingDelivery && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-rose-500/40 p-6 text-slate-100 shadow-2xl relative text-right">
            <button
              onClick={() => setDeletingDelivery(null)}
              className="absolute left-4 top-4 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold mb-4 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="text-base font-extrabold text-white text-center mb-1">
              تأكيد حذف وإلغاء سند التوريد
            </h3>
            <p className="text-xs text-slate-400 text-center mb-4 font-mono font-bold">
              {deletingDelivery.id} • منفذ: {deletingDelivery.outletName}
            </p>

            {deleteDeliveryError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{deleteDeliveryError}</span>
              </div>
            )}

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs leading-relaxed text-slate-300 mb-5 space-y-1.5">
              <p>
                عند تأكيد الحذف سيقوم النظام بالتسويات التالية تلقائياً:
              </p>
              <ul className="list-disc list-inside text-slate-400 space-y-1">
                <li>خصم الدين المقيد (<strong className="text-rose-400">{deletingDelivery.remainingDebt.toLocaleString()} ر.ي</strong>) من حساب المنفذ.</li>
                <li>خصم المبلغ المسدد (<strong className="text-emerald-400">{deletingDelivery.cashPaidNow.toLocaleString()} ر.ي</strong>) من إجمالي تحصيلات المنفذ.</li>
                <li>إعادة الكروت الموردة (<strong className="text-amber-400">{deletingDelivery.cardsCount} كرت</strong>) إلى عهدة الموزع.</li>
              </ul>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDeleteDeliveryConfirm}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs transition cursor-pointer shadow-md"
              >
                تأكيد حذف السند وتسوية الحساب
              </button>
              <button
                type="button"
                onClick={() => setDeletingDelivery(null)}
                className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer transition"
              >
                تراجع
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Edit Payment Voucher */}
      {isEditPaymentOpen && editingPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700 p-6 text-slate-100 shadow-2xl relative text-right flex flex-col max-h-[90vh]">
            <button
              onClick={() => {
                setIsEditPaymentOpen(false);
                setEditingPayment(null);
              }}
              className="absolute left-4 top-4 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-4 shrink-0">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                <Edit3 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white">
                  تعديل سند القبض ({editingPayment.id})
                </h3>
                <p className="text-xs text-slate-400">
                  منفذ: {editingPayment.outletName}
                </p>
              </div>
            </div>

            {editPaymentError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{editPaymentError}</span>
              </div>
            )}

            {editPaymentSuccess && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{editPaymentSuccess}</span>
              </div>
            )}

            <form onSubmit={handleEditPaymentSubmit} className="space-y-4 overflow-y-auto pr-1 flex-1">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1">
                <div className="flex justify-between text-slate-400">
                  <span>المبلغ المسجل سابقاً:</span>
                  <span className="font-extrabold text-emerald-400">{editingPayment.amount.toLocaleString()} ر.ي</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">المبلغ الجديد المقبوض (ر.ي)</label>
                <input
                  type="number"
                  min="1"
                  value={editPaymentAmount}
                  onChange={(e) => setEditPaymentAmount(Math.max(1, parseFloat(e.target.value || '1')))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-emerald-400 font-mono font-bold focus:outline-hidden focus:border-amber-500"
                  required
                />
              </div>

              {/* Live difference box */}
              {(() => {
                const diff = editPaymentAmount - editingPayment.amount;
                return (
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                    <span className="text-slate-400 block mb-1">الأثر على رصيد دين المنفذ:</span>
                    <span className="font-bold text-white">
                      {diff > 0
                        ? `زيادة التحصيل بمقدار ${diff.toLocaleString()} ر.ي سيتم خصمها من دين المنفذ.`
                        : diff < 0
                        ? `تقليص التحصيل بمقدار ${Math.abs(diff).toLocaleString()} ر.ي سيتم إضافتها إلى دين المنفذ.`
                        : 'المبلغ مطابق للسند الأصلي.'}
                    </span>
                  </div>
                );
              })()}

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">طريقة الدفع</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditPaymentMethod('cash')}
                    className={`py-2 rounded-xl text-xs font-bold border transition ${
                      editPaymentMethod === 'cash'
                        ? 'bg-emerald-500 text-slate-950 border-emerald-500'
                        : 'bg-slate-800 text-slate-300 border-slate-700'
                    }`}
                  >
                    نقداً (كاش)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditPaymentMethod('transfer')}
                    className={`py-2 rounded-xl text-xs font-bold border transition ${
                      editPaymentMethod === 'transfer'
                        ? 'bg-emerald-500 text-slate-950 border-emerald-500'
                        : 'bg-slate-800 text-slate-300 border-slate-700'
                    }`}
                  >
                    حوالة بنكية
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">تاريخ السند</label>
                <input
                  type="date"
                  value={editPaymentDate}
                  onChange={(e) => setEditPaymentDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">ملاحظات</label>
                <input
                  type="text"
                  value={editPaymentNotes}
                  onChange={(e) => setEditPaymentNotes(e.target.value)}
                  placeholder="ملاحظات التعديل..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition cursor-pointer shadow-md"
                >
                  حفظ تعديل سند القبض
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditPaymentOpen(false);
                    setEditingPayment(null);
                  }}
                  className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer transition"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Delete Payment Confirmation */}
      {deletingPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-rose-500/40 p-6 text-slate-100 shadow-2xl relative text-right">
            <button
              onClick={() => setDeletingPayment(null)}
              className="absolute left-4 top-4 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold mb-4 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="text-base font-extrabold text-white text-center mb-1">
              تأكيد حذف سند القبض
            </h3>
            <p className="text-xs text-slate-400 text-center mb-4 font-mono font-bold">
              {deletingPayment.id} • منفذ: {deletingPayment.outletName}
            </p>

            {deletePaymentError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{deletePaymentError}</span>
              </div>
            )}

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs leading-relaxed text-slate-300 mb-5">
              <p>
                هل أنت متأكد من حذف هذا السند؟ سيتم فوراً إعادة قيد مبلغ (
                <strong className="text-rose-400 font-bold">
                  {deletingPayment.amount.toLocaleString()} ر.ي
                </strong>
                ) على حساب دين منفذ &quot;{deletingPayment.outletName}&quot; وخصمه من إجمالي مبالغ السداد.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDeletePaymentConfirm}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs transition cursor-pointer shadow-md"
              >
                تأكيد حذف السند وإعادة الدين
              </button>
              <button
                type="button"
                onClick={() => setDeletingPayment(null)}
                className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer transition"
              >
                تراجع
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
