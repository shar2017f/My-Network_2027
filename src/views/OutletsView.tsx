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
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Outlet, DeliveryVoucher, PaymentVoucher, CardCategory, SheetLeaf } from '../types';
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
    createDelivery,
    createPayment,
    permissions,
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

  // Delivery Form State
  const [deliveryTargetOutletId, setDeliveryTargetOutletId] = useState('');
  const [deliveryDate, setDeliveryDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [deliveryCategory, setDeliveryCategory] = useState<CardCategory>('200');
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

  // Available batches for selected deliveryCategory in current custody
  const availableBatchesForCategory = useMemo(() => {
    const custodySheets = sheets.filter(
      (s) =>
        s.category === deliveryCategory &&
        (currentRole === 'distributor'
          ? s.status === 'distributor_custody'
          : s.status === 'admin_custody' || s.status === 'distributor_custody')
    );
    const batchMap = new Map<
      string,
      { batchId: string; batchNumber: number; categoryBatchNumber: number; batchName: string; count: number; date: string }
    >();
    custodySheets.forEach((s) => {
      const bInfo = batches.find((b) => b.id === s.batchId);
      const catBNum = s.categoryBatchNumber || (bInfo ? getCategoryBatchNumber(bInfo, batches) : 1);
      if (!batchMap.has(s.batchId)) {
        batchMap.set(s.batchId, {
          batchId: s.batchId,
          batchNumber: bInfo?.batchNumber || 1,
          categoryBatchNumber: catBNum,
          batchName: getBatchOrdinalName(catBNum),
          count: 0,
          date: bInfo?.date || s.timestamp?.split('T')[0] || '',
        });
      }
      batchMap.get(s.batchId)!.count += 1;
    });
    return Array.from(batchMap.values()).sort((a, b) => a.categoryBatchNumber - b.categoryBatchNumber);
  }, [sheets, batches, deliveryCategory, currentRole]);

  // Available sheets in custody, sorted strictly by batch sequence (categoryBatchNumber) then sheet number (1..sheetsCount)
  const availableSheetsForDelivery = useMemo(() => {
    return sheets
      .filter((s) => {
        const matchCat = s.category === deliveryCategory;
        const matchStatus =
          currentRole === 'distributor'
            ? s.status === 'distributor_custody'
            : s.status === 'admin_custody' || s.status === 'distributor_custody';
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
  }, [sheets, batches, deliveryCategory, currentRole, selectedBatchId]);

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

  // Open delivery modal with smart defaults
  const openDeliveryModal = (targetOutletId?: string) => {
    const defaultOutlet = targetOutletId || outlets[0]?.id || '';
    setDeliveryTargetOutletId(defaultOutlet);
    const today = new Date().toISOString().split('T')[0];
    setDeliveryDate(today);
    setDeliveryCategory('200');
    setSelectedBatchId('all');
    setRangeBatchId('all');
    setRangeFrom('');
    setRangeTo('');
    setDeliveryError('');
    setDeliveryUnitPrice(CARD_CATEGORIES_CONFIG['200'].defaultWholesaleSheetPrice);

    const avSheets = sheets.filter(
      (s) =>
        s.category === '200' &&
        (currentRole === 'distributor'
          ? s.status === 'distributor_custody'
          : s.status === 'admin_custody' || s.status === 'distributor_custody')
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
    setDeliveryUnitPrice(CARD_CATEGORIES_CONFIG[cat].defaultWholesaleSheetPrice);
    const avSheets = sheets.filter(
      (s) =>
        s.category === cat &&
        (currentRole === 'distributor'
          ? s.status === 'distributor_custody'
          : s.status === 'admin_custody' || s.status === 'distributor_custody')
    );
    const initialSelected = avSheets.slice(0, 1).map((s) => s.sheetCode);
    setSelectedSheetCodes(initialSelected);
    setDeliverySheetsCount(initialSelected.length > 0 ? initialSelected.length : 1);
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

  // Submit New Outlet
  const handleAddOutletSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addOutlet({
      name: newOutletData.name,
      ownerName: newOutletData.ownerName,
      phone: newOutletData.phone,
      location: newOutletData.location,
      creditLimit: Number(newOutletData.creditLimit),
      notes: newOutletData.notes,
    });
    setIsAddOutletOpen(false);
    setNewOutletData({
      name: '',
      ownerName: '',
      phone: '',
      location: '',
      creditLimit: 100000,
      notes: '',
    });
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

    setEditOutletError('');
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
    if (!deliveryTargetOutletId) return;

    let finalCodes = selectedSheetCodes;
    if (finalCodes.length === 0) {
      finalCodes = availableSheetsForDelivery.slice(0, Number(deliverySheetsCount)).map((s) => s.sheetCode);
    }
    if (finalCodes.length === 0) {
      setDeliveryError('يرجى تحديد شيت واحد على الأقل من القائمة لتوريده للمنفذ');
      return;
    }
    setDeliveryError('');

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
    });

    setIsDeliveryModalOpen(false);
    setSelectedVoucherForPrint({ type: 'DEL', data: voucher });
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

    const text =
      `*سند توريد كروت إنترنت رسمي - شبكة قعزان نت*\n` +
      `━━━━━━━━━━━━━━━━━━━\n` +
      `رقم السند: ${voucher.id}\n` +
      `📅 تاريخ التوريد: ${voucher.date} (${formatArabicDate(voucher.date)})\n` +
      `المنفذ المستلم: ${voucher.outletName}\n` +
      `الفئة: كروت ${voucher.category} ريال\n` +
      `الكمية: ${voucher.sheetsCount} شيت (${voucher.cardsCount} كرت)\n` +
      (sheetLeafNumbers ? `🔢 أرقام الشيتات الموزعة من الدفعة: ${sheetLeafNumbers}\n` : '') +
      `سعر الشيت بالجملة: ${voucher.unitSheetPrice.toLocaleString()} ر.ي\n` +
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

              // Find last delivery for this outlet
              const outletDeliveries = deliveries.filter((d) => d.outletId === outlet.id);
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

                  {/* Financial Totals */}
                  <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px]">
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
                        <span className="text-[10px] text-slate-500 mt-1 block">
                          الكمية: {delivery.sheetsCount} شيت ({delivery.cardsCount} كرت) • سعر الشيت:{' '}
                          {delivery.unitSheetPrice.toLocaleString()} ر.ي
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
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold transition text-[11px] cursor-pointer"
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
                  onChange={(e) => setNewOutletData({ ...newOutletData, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-blue-500"
                />
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

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-emerald-400">
                ✓ سيتم بدء حساب المنفذ برصيد مصفّر تماماً 0 ر.ي وجاهز للتوريد.
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddOutletOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs shadow-md transition"
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

              {/* 3. Category Picker */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">فئة الكرت المورد:</label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {Object.keys(CARD_CATEGORIES_CONFIG).map((cat) => {
                    const avCount = sheets.filter(
                      (s) =>
                        s.category === cat &&
                        (currentRole === 'distributor'
                          ? s.status === 'distributor_custody'
                          : s.status === 'admin_custody' || s.status === 'distributor_custody')
                    ).length;

                    return (
                      <button
                        type="button"
                        key={cat}
                        onClick={() => handleDeliveryCatChange(cat as CardCategory)}
                        className={`p-2 rounded-xl text-xs font-bold border transition text-center cursor-pointer ${
                          deliveryCategory === cat
                            ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/25'
                            : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <div className="font-extrabold">فئة {cat}</div>
                        <div
                          className={`text-[10px] mt-0.5 ${
                            deliveryCategory === cat ? 'text-blue-200' : 'text-slate-400'
                          }`}
                        >
                          عهدة: {avCount}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {deliveryError && (
                <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{deliveryError}</span>
                </div>
              )}

              {/* 4. BATCH & SHEET NUMBERS SELECTOR (خيار رقم الشيت الموزع له من الدفعة) */}
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

              {/* 5. Sheets Count & Agreed Wholesale Unit Price */}
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

              {/* 6. Total Calculation & Instant Cash Payment */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-850">
                  <span className="text-slate-400">إجمالي قيمة التوريد بالجملة:</span>
                  <span className="font-extrabold text-white text-base">
                    {(deliverySheetsCount * deliveryUnitPrice).toLocaleString()} ر.ي
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
                        onClick={() => setDeliveryCashPaid(deliverySheetsCount * deliveryUnitPrice)}
                        className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 text-[10px] font-bold transition cursor-pointer"
                      >
                        100% كاش
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setDeliveryCashPaid(Math.round((deliverySheetsCount * deliveryUnitPrice) / 2))
                        }
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
                    max={deliverySheetsCount * deliveryUnitPrice}
                    value={deliveryCashPaid}
                    onChange={(e) => setDeliveryCashPaid(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-750 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-emerald-500 font-bold text-emerald-300 font-mono text-lg"
                  />
                </div>

                <div className="flex justify-between text-xs pt-1 text-rose-300 font-bold border-t border-slate-850">
                  <span>المبلغ المقيد كدين على المنفذ:</span>
                  <span className="text-sm font-black">
                    {Math.max(0, deliverySheetsCount * deliveryUnitPrice - deliveryCashPaid).toLocaleString()}{' '}
                    ر.ي
                  </span>
                </div>

                {/* Outlet Debt Balance Impact */}
                {(() => {
                  const targetOutlet = outlets.find((o) => o.id === deliveryTargetOutletId);
                  if (!targetOutlet) return null;
                  const addedDebt = Math.max(0, deliverySheetsCount * deliveryUnitPrice - deliveryCashPaid);
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
                  disabled={availableSheetsForDelivery.length === 0 || selectedSheetCodes.length === 0}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-xs shadow-lg shadow-blue-600/25 transition cursor-pointer"
                >
                  إصدار سند التوريد وتثبيت العملية 🚀
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

      {/* 4. Statement of Account Modal */}
      {selectedOutletForStatement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-2xl max-h-[85vh] rounded-2xl bg-slate-900 border border-slate-700 p-6 text-slate-100 shadow-2xl relative text-right flex flex-col">
            <button
              onClick={() => setSelectedOutletForStatement(null)}
              className="absolute left-4 top-4 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800 shrink-0">
              <div>
                <h3 className="text-base font-extrabold text-white">
                  كشف حساب: {selectedOutletForStatement.name}
                </h3>
                <p className="text-xs text-slate-400">
                  المالك: {selectedOutletForStatement.ownerName} • هاتف: {selectedOutletForStatement.phone}
                </p>
              </div>
              <div className="text-left">
                <span className="text-[10px] text-slate-400 block">صافي الرصيد الحالي:</span>
                <span className="text-base font-black text-rose-400">
                  {selectedOutletForStatement.currentDebt.toLocaleString()} ر.ي
                </span>
              </div>
            </div>

            {/* Statement Transactions List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {deliveries.filter((d) => d.outletId === selectedOutletForStatement.id).length === 0 &&
              payments.filter((p) => p.outletId === selectedOutletForStatement.id).length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  لا توجد حركات مسجلة لهذا المنفذ بعد (رصيد مصفّر 0 ر.ي).
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Combine deliveries and payments sorted by date */}
                  {[
                    ...deliveries
                      .filter((d) => d.outletId === selectedOutletForStatement.id)
                      .map((d) => ({
                        type: 'DEL',
                        id: d.id,
                        date: d.date,
                        title: `توريد ${d.sheetsCount} شيت فئة ${d.category}`,
                        amount: d.totalAmount,
                        paid: d.cashPaidNow,
                        debtAdded: d.remainingDebt,
                        actor: d.deliveredBy,
                      })),
                    ...payments
                      .filter((p) => p.outletId === selectedOutletForStatement.id)
                      .map((p) => ({
                        type: 'PAY',
                        id: p.id,
                        date: p.date,
                        title: `سند قبض نقدية (${p.paymentMethod === 'cash' ? 'كاش' : 'حوالة'})`,
                        amount: p.amount,
                        paid: p.amount,
                        debtAdded: -p.amount,
                        actor: p.collectorName,
                      })),
                  ]
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map((item) => (
                      <div
                        key={item.id}
                        className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                              item.type === 'DEL'
                                ? 'bg-blue-500/20 text-blue-400'
                                : 'bg-emerald-500/20 text-emerald-400'
                            }`}
                          >
                            {item.type}
                          </div>
                          <div>
                            <div className="font-bold text-white flex items-center gap-2">
                              <span>{item.id}</span>
                              <span className="text-slate-400 font-normal">{item.title}</span>
                            </div>
                            <span className="text-[10px] text-slate-500">
                              {item.date} • بواسطة: {item.actor}
                            </span>
                          </div>
                        </div>

                        <div className="text-left">
                          <span
                            className={`font-black ${
                              item.type === 'DEL' ? 'text-rose-400' : 'text-emerald-400'
                            }`}
                          >
                            {item.type === 'DEL'
                              ? `+${item.amount.toLocaleString()}`
                              : `-${item.amount.toLocaleString()}`}{' '}
                            ر.ي
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-800 mt-3 shrink-0 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                إجمالي التوريدات: {selectedOutletForStatement.totalDeliveredAmount.toLocaleString()} ر.ي •
                المسدد: {selectedOutletForStatement.totalPaidAmount.toLocaleString()} ر.ي
              </span>
              <button
                onClick={() => setSelectedOutletForStatement(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

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
                        <span>{d.sheetsCount} شيت ({d.cardsCount} كرت)</span>
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
    </div>
  );
};
