import React, { useState, useMemo } from 'react';
import {
  Layers,
  Plus,
  Calendar,
  Eye,
  Edit2,
  Grid,
  List,
  Search,
  CheckCircle,
  Clock,
  Store,
  Shield,
  ArrowRight,
  X,
  FileText,
  AlertTriangle,
  Sparkles,
  Table,
  Filter,
  Package,
  PackageCheck,
  CheckCircle2,
  Printer,
  Download,
  Trash2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { CardCategory, PrintBatch, SheetLeaf } from '../types';
import { CARD_CATEGORIES_CONFIG } from '../constants/cardConfig';
import {
  getBatchOrdinalName,
  getCategoryBatchNumber,
  getArabicMonthName,
  getArabicMonthOnly,
  formatSheetWithBatch,
  formatSheetBadge,
  formatSheetListGrouped,
  ORDINAL_ARABIC,
} from '../utils/batchNaming';

// Helper to format Arabic dates
const formatArabicDate = (dateStr: string) => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('ar-YE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

export const BatchesView: React.FC = () => {
  const {
    currentRole,
    batches,
    sheets,
    addBatch,
    updateBatch,
    updateBatchDateMonth,
    deleteBatch,
    stockHealthList,
    targetPrintCategory,
    setTargetPrintCategory,
  } = useApp();

  // Display mode: 'grid' | 'table' | 'sheets_table'
  const [viewMode, setViewMode] = useState<'grid' | 'table' | 'sheets_table'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<string>('all');

  // Detailed Sheets Table State
  const [selectedBatchForSheets, setSelectedBatchForSheets] = useState<string>('all');
  const [sheetStatusFilter, setSheetStatusFilter] = useState<
    'all' | 'delivered_outlet' | 'distributor_custody' | 'admin_custody' | 'damaged'
  >('all');
  const [sheetCategoryFilter, setSheetCategoryFilter] = useState<string>('all');
  const [sheetSearchQuery, setSheetSearchQuery] = useState('');

  // Inside Modal: leaf view mode and filter
  const [leafModalViewMode, setLeafModalViewMode] = useState<'grid' | 'table'>('table');
  const [leafModalStatusFilter, setLeafModalStatusFilter] = useState<string>('all');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState<PrintBatch | null>(null);
  const [viewingLeafBatch, setViewingLeafBatch] = useState<PrintBatch | null>(null);
  const [deletingBatch, setDeletingBatch] = useState<PrintBatch | null>(null);
  const [deleteBatchError, setDeleteBatchError] = useState<string>('');

  // Add Batch Form State
  const [formData, setFormData] = useState<{
    category: CardCategory;
    date: string;
    accountingMonth: string;
    sheetsCount: number;
    cardsPerSheet: number;
    wholesaleSheetPrice: number;
    batchPrintMode: 'sheets' | 'cards';
    cardsCount: number;
    wholesaleCardPrice: number;
    notes: string;
  }>({
    category: '200',
    date: new Date().toISOString().split('T')[0],
    accountingMonth: new Date().toISOString().slice(0, 7),
    sheetsCount: 10,
    cardsPerSheet: 60,
    wholesaleSheetPrice: CARD_CATEGORIES_CONFIG['200'].defaultWholesaleSheetPrice,
    batchPrintMode: 'sheets',
    cardsCount: 20,
    wholesaleCardPrice: 170,
    notes: '',
  });

  // Edit Date / Month Modal State
  // Comprehensive Edit Batch State
  const [editDate, setEditDate] = useState('');
  const [editMonth, setEditMonth] = useState('');
  const [editCategory, setEditCategory] = useState<CardCategory>('200');
  const [editSheetsCount, setEditSheetsCount] = useState<number>(1);
  const [editWholesaleSheetPrice, setEditWholesaleSheetPrice] = useState<number>(0);
  const [editCardsPerSheet, setEditCardsPerSheet] = useState<number>(60);
  const [editNotes, setEditNotes] = useState('');
  const [editError, setEditError] = useState<string | null>(null);

  // Handle category change in Add Form
  const handleCategoryChange = (cat: CardCategory) => {
    const config = CARD_CATEGORIES_CONFIG[cat];
    const cardPrice = config.defaultWholesaleCardPrice || Math.round(config.defaultWholesaleSheetPrice / config.defaultCardsPerSheet);
    setFormData((prev) => ({
      ...prev,
      category: cat,
      wholesaleSheetPrice: config.defaultWholesaleSheetPrice,
      cardsPerSheet: config.defaultCardsPerSheet,
      batchPrintMode: 'sheets',
      cardsCount: prev.cardsCount || config.defaultCardsPerSheet,
      wholesaleCardPrice: cardPrice,
    }));
  };

  // Handle category change in Edit Form
  const handleEditCategoryChange = (cat: CardCategory) => {
    setEditCategory(cat);
    const config = CARD_CATEGORIES_CONFIG[cat];
    setEditWholesaleSheetPrice(config.defaultWholesaleSheetPrice);
    setEditCardsPerSheet(config.defaultCardsPerSheet);
  };

  // Quick Print of recommended sheets based on intelligent stock alert
  const handlePrintRecommended = (category: CardCategory, sheetsCount: number) => {
    const config = CARD_CATEGORIES_CONFIG[category];
    const cardPrice = config.defaultWholesaleCardPrice || Math.round(config.defaultWholesaleSheetPrice / config.defaultCardsPerSheet);
    setFormData({
      category,
      date: new Date().toISOString().split('T')[0],
      accountingMonth: new Date().toISOString().slice(0, 7),
      sheetsCount,
      cardsPerSheet: config.defaultCardsPerSheet,
      wholesaleSheetPrice: config.defaultWholesaleSheetPrice,
      batchPrintMode: 'sheets',
      cardsCount: sheetsCount * config.defaultCardsPerSheet,
      wholesaleCardPrice: cardPrice,
      notes: `دفعة تعزيزية سريعة استجابة لتنبيه انخفاض رصيد فئة ${category}`,
    });
    setIsAddModalOpen(true);
    setTargetPrintCategory(null);
  };

  React.useEffect(() => {
    if (targetPrintCategory) {
      const health = stockHealthList.find((h) => h.category === targetPrintCategory);
      const rec = health?.recommendedPrintSheets || 10;
      handlePrintRecommended(targetPrintCategory, rec);
    }
  }, [targetPrintCategory]);

  const handleCreateBatch = (e: React.FormEvent) => {
    e.preventDefault();
    const config = CARD_CATEGORIES_CONFIG[formData.category];
    const isCardMode = config.allowCardUnits && formData.batchPrintMode === 'cards';

    addBatch({
      category: formData.category,
      date: formData.date,
      accountingMonth: formData.accountingMonth,
      sheetsCount: isCardMode
        ? Number((formData.cardsCount / config.defaultCardsPerSheet).toFixed(2))
        : Number(formData.sheetsCount),
      cardsPerSheet: config.defaultCardsPerSheet,
      wholesaleSheetPrice: Number(formData.wholesaleSheetPrice),
      batchType: isCardMode ? 'cards' : 'sheets',
      cardsCount: isCardMode ? Number(formData.cardsCount) : undefined,
      wholesaleCardPrice: isCardMode ? Number(formData.wholesaleCardPrice) : undefined,
      notes: formData.notes,
    });
    setIsAddModalOpen(false);
  };

  const handleOpenEdit = (batch: PrintBatch) => {
    setEditingBatch(batch);
    setEditDate(batch.date);
    setEditMonth(batch.accountingMonth);
    setEditCategory(batch.category);
    setEditSheetsCount(batch.sheetsCount);
    const catCfg = CARD_CATEGORIES_CONFIG[batch.category];
    setEditWholesaleSheetPrice(
      batch.wholesaleSheetPrice !== undefined
        ? batch.wholesaleSheetPrice
        : catCfg.defaultWholesaleSheetPrice
    );
    setEditCardsPerSheet(batch.cardsPerSheet || catCfg.defaultCardsPerSheet);
    setEditNotes(batch.notes || '');
    setEditError(null);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBatch) return;
    setEditError(null);
    const result = updateBatch(editingBatch.id, {
      category: editCategory,
      sheetsCount: Number(editSheetsCount),
      wholesaleSheetPrice: Number(editWholesaleSheetPrice),
      cardsPerSheet: Number(editCardsPerSheet),
      date: editDate,
      accountingMonth: editMonth,
      notes: editNotes,
    });
    if (!result.success) {
      setEditError(result.message || 'حدث خطأ أثناء تعديل بيانات الدفعة');
      return;
    }
    setEditingBatch(null);
  };

  const handleDeleteBatchConfirm = () => {
    if (!deletingBatch) return;
    setDeleteBatchError('');
    const res = deleteBatch(deletingBatch.id);
    if (res.success) {
      setDeletingBatch(null);
      if (editingBatch?.id === deletingBatch.id) {
        setEditingBatch(null);
      }
    } else {
      setDeleteBatchError(res.message || 'تعذر حذف الدفعة');
    }
  };

  // Months represented in batches for filtering
  const availableBatchMonths = useMemo(() => {
    const mSet = new Set<string>();
    batches.forEach((b) => {
      const m = b.accountingMonth || (b.date ? b.date.slice(0, 7) : '');
      if (m) mSet.add(m);
    });
    // Ensure current month (2026-11) is present
    const currentMonth = new Date().toISOString().slice(0, 7);
    mSet.add(currentMonth);
    return Array.from(mSet).sort().reverse();
  }, [batches]);

  // Expected batch ordinal within the selected accounting month for live preview in the Add modal
  const expectedBatchNumber = useMemo(() => {
    return getCategoryBatchNumber(
      {
        category: formData.category,
        accountingMonth: formData.accountingMonth,
        date: formData.date,
      },
      batches
    );
  }, [formData.category, formData.accountingMonth, formData.date, batches]);

  // Filtered batches with both Category, Search, and Accounting Month support
  const filteredBatches = batches.filter((b) => {
    const matchesSearch =
      b.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.notes?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.category.includes(searchQuery);
    const matchesCat =
      selectedCategoryFilter === 'all' || b.category === selectedCategoryFilter;
    const bMonth = b.accountingMonth || (b.date ? b.date.slice(0, 7) : '');
    const matchesMonth =
      selectedMonthFilter === 'all' || bMonth === selectedMonthFilter;
    return matchesSearch && matchesCat && matchesMonth;
  });

  // Defensive check: Exclude any sheets exceeding the batch's declared sheetsCount or BATCH-2026-005 leaves > 15 / BATCH-2026-004 leaves > 10
  const isValidBatchSheet = (s: SheetLeaf, bInfo?: PrintBatch) => {
    if (!s || !s.sheetCode) return false;
    const leafNum = s.leafNumber || parseInt(s.sheetCode.match(/S(\d+)/)?.[1] || '0', 10);
    // Batch 5 (500 category Batch 2): exactly 15 sheets (leaves 1..15)
    if (s.batchId === 'BATCH-2026-005' && leafNum > 15) return false;
    if (s.sheetCode.startsWith('QZ-500-B5-S') && (leafNum > 15 || parseInt(s.sheetCode.replace('QZ-500-B5-S', ''), 10) > 15)) return false;
    // Batch 4 (200 category Batch 2): exactly 10 sheets (leaves 1..10)
    if (s.batchId === 'BATCH-2026-004' && leafNum > 10) return false;
    if (s.sheetCode.startsWith('QZ-200-B4-S') && (leafNum > 10 || parseInt(s.sheetCode.replace('QZ-200-B4-S', ''), 10) > 10)) return false;
    const b = bInfo || batches.find((x) => x.id === s.batchId);
    if (b && typeof b.sheetsCount === 'number' && leafNum > b.sheetsCount) return false;
    return true;
  };

  // Scope summary statistics for the detailed sheets table (handling both full sheets and fractional card splits)
  const sheetsStats = useMemo(() => {
    const scoped = sheets.filter((s) => {
      if (!isValidBatchSheet(s)) return false;
      if (selectedBatchForSheets !== 'all' && s.batchId !== selectedBatchForSheets) return false;
      if (sheetCategoryFilter !== 'all' && s.category !== sheetCategoryFilter) return false;
      return true;
    });

    const totalCards = scoped.reduce(
      (sum, s) => sum + (s.cardsCount !== undefined ? s.cardsCount : (CARD_CATEGORIES_CONFIG[s.category]?.defaultCardsPerSheet || 60)),
      0
    );
    const deliveredCards = scoped
      .filter((s) => s.status === 'delivered_outlet')
      .reduce((sum, s) => sum + (s.cardsCount !== undefined ? s.cardsCount : (CARD_CATEGORIES_CONFIG[s.category]?.defaultCardsPerSheet || 60)), 0);
    const distributorCards = scoped
      .filter((s) => s.status === 'distributor_custody')
      .reduce((sum, s) => sum + (s.cardsCount !== undefined ? s.cardsCount : (CARD_CATEGORIES_CONFIG[s.category]?.defaultCardsPerSheet || 60)), 0);
    const adminCards = scoped
      .filter((s) => s.status === 'admin_custody')
      .reduce((sum, s) => sum + (s.cardsCount !== undefined ? s.cardsCount : (CARD_CATEGORIES_CONFIG[s.category]?.defaultCardsPerSheet || 60)), 0);
    const damagedCards = scoped
      .filter((s) => s.status === 'damaged' || s.status === 'returned')
      .reduce((sum, s) => sum + (s.cardsCount !== undefined ? s.cardsCount : (CARD_CATEGORIES_CONFIG[s.category]?.defaultCardsPerSheet || 60)), 0);

    // Sum of fractions (e.g. 30/60 = 0.5 sheet)
    const totalSheetsFraction = scoped.reduce((sum, s) => {
      const perSheet = CARD_CATEGORIES_CONFIG[s.category]?.defaultCardsPerSheet || 60;
      return sum + (s.cardsCount !== undefined ? s.cardsCount : perSheet) / perSheet;
    }, 0);
    const deliveredSheetsFraction = scoped.filter((s) => s.status === 'delivered_outlet').reduce((sum, s) => {
      const perSheet = CARD_CATEGORIES_CONFIG[s.category]?.defaultCardsPerSheet || 60;
      return sum + (s.cardsCount !== undefined ? s.cardsCount : perSheet) / perSheet;
    }, 0);
    const distributorSheetsFraction = scoped.filter((s) => s.status === 'distributor_custody').reduce((sum, s) => {
      const perSheet = CARD_CATEGORIES_CONFIG[s.category]?.defaultCardsPerSheet || 60;
      return sum + (s.cardsCount !== undefined ? s.cardsCount : perSheet) / perSheet;
    }, 0);
    const adminSheetsFraction = scoped.filter((s) => s.status === 'admin_custody').reduce((sum, s) => {
      const perSheet = CARD_CATEGORIES_CONFIG[s.category]?.defaultCardsPerSheet || 60;
      return sum + (s.cardsCount !== undefined ? s.cardsCount : perSheet) / perSheet;
    }, 0);
    const damagedSheetsFraction = scoped.filter((s) => s.status === 'damaged' || s.status === 'returned').reduce((sum, s) => {
      const perSheet = CARD_CATEGORIES_CONFIG[s.category]?.defaultCardsPerSheet || 60;
      return sum + (s.cardsCount !== undefined ? s.cardsCount : perSheet) / perSheet;
    }, 0);

    return {
      total: Number(totalSheetsFraction.toFixed(2)),
      totalCards,
      delivered: Number(deliveredSheetsFraction.toFixed(2)),
      deliveredCards,
      distributor: Number(distributorSheetsFraction.toFixed(2)),
      distributorCards,
      admin: Number(adminSheetsFraction.toFixed(2)),
      adminCards,
      damaged: Number(damagedSheetsFraction.toFixed(2)),
      damagedCards,
      recordsCount: scoped.length,
    };
  }, [sheets, selectedBatchForSheets, sheetCategoryFilter]);

  // Comprehensive detailed sheet-by-sheet list with independent batch numbering
  const detailedSheetsList = useMemo(() => {
    return sheets
      .map((s) => {
        const batchInfo = batches.find((b) => b.id === s.batchId);
        const catBNum =
          s.categoryBatchNumber || (batchInfo ? getCategoryBatchNumber(batchInfo, batches) : 1);
        const batchOrdinalName = getBatchOrdinalName(catBNum);
        return {
          ...s,
          batchInfo,
          catBNum,
          batchOrdinalName,
        };
      })
      .filter((s) => {
        if (!isValidBatchSheet(s, s.batchInfo)) return false;
        // Filter by Batch
        if (selectedBatchForSheets !== 'all' && s.batchId !== selectedBatchForSheets) {
          return false;
        }
        // Filter by Category
        if (sheetCategoryFilter !== 'all' && s.category !== sheetCategoryFilter) {
          return false;
        }
        // Filter by Status (موزع، متبقي، تالف)
        if (sheetStatusFilter === 'delivered_outlet' && s.status !== 'delivered_outlet') {
          return false;
        }
        if (sheetStatusFilter === 'distributor_custody' && s.status !== 'distributor_custody') {
          return false;
        }
        if (sheetStatusFilter === 'admin_custody' && s.status !== 'admin_custody') {
          return false;
        }
        if (sheetStatusFilter === 'damaged' && s.status !== 'damaged' && s.status !== 'returned') {
          return false;
        }

        // Search Query
        if (sheetSearchQuery.trim()) {
          const q = sheetSearchQuery.trim().toLowerCase();
          const matchCode = s.sheetCode.toLowerCase().includes(q);
          const matchLeaf =
            String(s.leafNumber) === q ||
            `شيت ${s.leafNumber}`.includes(q) ||
            `#${s.leafNumber}`.includes(q);
          const matchBatchId = s.batchId.toLowerCase().includes(q);
          const matchBatchName = s.batchOrdinalName.toLowerCase().includes(q);
          const matchOutlet = s.assignedOutletName?.toLowerCase().includes(q) || false;
          const matchDelivery = s.deliveryId?.toLowerCase().includes(q) || false;
          const matchTransfer = s.transferId?.toLowerCase().includes(q) || false;
          const matchCategory = s.category.includes(q);

          if (
            !matchCode &&
            !matchLeaf &&
            !matchBatchId &&
            !matchBatchName &&
            !matchOutlet &&
            !matchDelivery &&
            !matchTransfer &&
            !matchCategory
          ) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (a.catBNum !== b.catBNum) return a.catBNum - b.catBNum;
        return a.leafNumber - b.leafNumber;
      });
  }, [sheets, batches, selectedBatchForSheets, sheetCategoryFilter, sheetStatusFilter, sheetSearchQuery]);

  // Export sheets table to CSV / Excel
  const exportDetailedSheetsCSV = () => {
    const headers = [
      'رقم الشيت بالدفعة',
      'كود الشيت التسلسلي',
      'اسم الدفعة',
      'كود الدفعة',
      'فئة الكرت',
      'عدد الكروت',
      'قيمة الجملة',
      'الحالة الحالية',
      'الحائز الحالي / المنفذ',
      'رقم السند',
      'تاريخ الحركة',
    ];

    const rows = detailedSheetsList.map((s) => {
      const config = CARD_CATEGORIES_CONFIG[s.category];
      const wholesalePrice = s.batchInfo?.wholesaleSheetPrice || config.defaultWholesaleSheetPrice;
      const statusLabel =
        s.status === 'delivered_outlet'
          ? `موزع لمنفذ (${s.assignedOutletName || 'منفذ معتمد'})`
          : s.status === 'distributor_custody'
          ? 'بعهدة الموزع الميداني'
          : s.status === 'admin_custody'
          ? 'متبقي بمخزن المسؤول'
          : 'تالف / مرتجع';
      const holder =
        s.status === 'delivered_outlet'
          ? s.assignedOutletName || 'منفذ معتمد'
          : s.status === 'distributor_custody'
          ? 'الموزع الميداني'
          : s.status === 'admin_custody'
          ? 'المسؤول'
          : 'مستبعد';
      const voucher = s.deliveryId || s.transferId || '-';
      const date = s.timestamp ? s.timestamp.split('T')[0] : s.batchInfo?.date || '';

      return [
        `شيت ${s.leafNumber}`,
        s.sheetCode,
        s.batchOrdinalName,
        s.batchId,
        s.category,
        s.cardsCount,
        wholesalePrice,
        statusLabel,
        holder,
        voucher,
        date,
      ];
    });

    const csvContent =
      '\uFEFF' +
      [
        headers.join(','),
        ...rows.map((row) =>
          row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
        ),
      ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `كشف_شيتات_دفعات_الطباعة_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrintSheetsTable = () => {
    window.print();
  };

  // Sheet status badge helper with rich info
  const renderSheetStatusBadge = (
    status: SheetLeaf['status'],
    outletName?: string,
    deliveryId?: string,
    transferId?: string
  ) => {
    switch (status) {
      case 'admin_custody':
        return (
          <div className="inline-flex flex-col items-start gap-0.5">
            <span className="text-[11px] px-2.5 py-1 rounded-lg bg-blue-500/15 text-blue-300 border border-blue-500/30 font-bold inline-flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span>متبقي بمخزن المسؤول</span>
            </span>
            <span className="text-[10px] text-blue-400/80 font-medium">جاهز للتحويل للموزع</span>
          </div>
        );
      case 'distributor_custody':
        return (
          <div className="inline-flex flex-col items-start gap-0.5">
            <span className="text-[11px] px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold inline-flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>بعهدة الموزع الميداني</span>
            </span>
            {transferId && (
              <span className="text-[10px] text-emerald-400/80 font-mono font-medium">
                سند التحويل: {transferId}
              </span>
            )}
          </div>
        );
      case 'delivered_outlet':
        return (
          <div className="inline-flex flex-col items-start gap-0.5">
            <span className="text-[11px] px-2.5 py-1 rounded-lg bg-purple-500/15 text-purple-300 border border-purple-500/30 font-bold inline-flex items-center gap-1.5">
              <Store className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              <span>موزع لمنفذ: {outletName || 'منفذ معتمد'}</span>
            </span>
            {deliveryId && (
              <span className="text-[10px] text-purple-400/80 font-mono font-medium">
                سند التوريد: {deliveryId}
              </span>
            )}
          </div>
        );
      case 'damaged':
      case 'returned':
        return (
          <div className="inline-flex flex-col items-start gap-0.5">
            <span className="text-[11px] px-2.5 py-1 rounded-lg bg-rose-500/15 text-rose-300 border border-rose-500/30 font-bold inline-flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span>تالف / مرتجع</span>
            </span>
            <span className="text-[10px] text-rose-400/80 font-medium">مستبعد من التداول</span>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 p-5 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-extrabold text-white">دفعات طباعة الكروت ومسار الشيتات</h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-bold border border-amber-500/30">
              {batches.length} دفعات مسجلة
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            ترقيم وتسجيل الشيتات مع تتبع تفصيلي ورقة بورقة (Leaf-by-leaf tracking)
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          {/* View Mode Toggle: Grid, Table, or Detailed Sheets Table */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition font-bold cursor-pointer ${
                viewMode === 'grid' ? 'bg-slate-800 text-amber-400 shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
              title="عرض بطاقات الدفعات"
            >
              <Grid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">بطاقات الدفعات</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition font-bold cursor-pointer ${
                viewMode === 'table' ? 'bg-slate-800 text-amber-400 shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
              title="ملخص الدفعات"
            >
              <List className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">ملخص الدفعات</span>
            </button>
            <button
              onClick={() => setViewMode('sheets_table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition font-bold cursor-pointer ${
                viewMode === 'sheets_table' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
              title="جدول تفصيلي لحالة كل شيت"
            >
              <Table className="w-3.5 h-3.5" />
              <span>جدول الشيتات التفصيلي</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                  viewMode === 'sheets_table' ? 'bg-slate-950 text-amber-300' : 'bg-slate-800 text-slate-300'
                }`}
              >
                {sheets.length}
              </span>
            </button>
          </div>

          {currentRole === 'admin' ? (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>تسجيل طبعة جديدة</span>
            </button>
          ) : (
            <div className="text-[11px] text-slate-400 bg-slate-800/80 px-3 py-2 rounded-xl border border-slate-700">
              تسجيل الطبعات محصور بالمسؤول
            </div>
          )}
        </div>
      </div>

      {/* Smart Print Advisor: Real-time decision assistant for low stock */}
      {currentRole === 'admin' && stockHealthList.some((h) => h.status === 'critical' || h.status === 'out_of_stock') && (
        <div className="bg-gradient-to-l from-amber-950/40 via-slate-900 to-slate-900 border border-amber-500/40 rounded-2xl p-4 sm:p-5 space-y-3 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
              <h3 className="text-sm font-extrabold text-white">
                مستشار الطباعة الذكي (Smart Print Advisor)
              </h3>
              <span className="text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded-full font-bold">
                تنبيهات فورية للمخزون
              </span>
            </div>
            <span className="text-[11px] text-amber-400 font-medium">
              توصية طباعة فورية للمساعدة في اتخاذ القرار
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {stockHealthList
              .filter((h) => h.status === 'critical' || h.status === 'out_of_stock')
              .map((health) => (
                <div
                  key={health.category}
                  className={`p-3 rounded-xl border flex flex-col justify-between gap-3 ${
                    health.status === 'out_of_stock'
                      ? 'bg-rose-950/30 border-rose-500/30'
                      : 'bg-amber-950/20 border-amber-500/30'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-extrabold text-xs text-white flex items-center gap-1.5">
                        <AlertTriangle className={`w-3.5 h-3.5 shrink-0 ${health.status === 'out_of_stock' ? 'text-rose-400' : 'text-amber-400'}`} />
                        فئة {health.category} ريال ({health.name})
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        health.status === 'out_of_stock' ? 'bg-rose-500/20 text-rose-300' : 'bg-amber-500/20 text-amber-300'
                      }`}>
                        {health.statusLabel}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-300 leading-relaxed mt-1">
                      {health.adviceMessage}
                    </p>

                    <div className="mt-2 text-[10px] text-slate-400 flex items-center justify-between border-t border-slate-800/80 pt-1.5">
                      <span>بعهدة الموزع: <strong className="text-white">{health.distributorSheets}</strong> شيت</span>
                      <span>بمخزنك: <strong className="text-white">{health.adminSheets}</strong> شيت</span>
                      <span>الحد: <strong className="text-amber-400">{health.thresholdSheets}</strong> شيت</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handlePrintRecommended(health.category, health.recommendedPrintSheets)}
                    className="w-full py-2 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>طباعة مقترحة ({health.recommendedPrintSheets} شيت)</span>
                  </button>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Filters and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="البحث برقم الدفعة أو الفئة أو الملاحظات..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-9 pl-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setSelectedCategoryFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
              selectedCategoryFilter === 'all'
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'bg-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            جميع الفئات
          </button>
          {Object.keys(CARD_CATEGORIES_CONFIG).map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                selectedCategoryFilter === cat
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'bg-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              فئة {cat}
            </button>
          ))}
        </div>

        {/* Accounting Month Filter */}
        <div className="flex items-center gap-2 shrink-0 self-stretch sm:self-auto">
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1 text-xs">
            <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <select
              value={selectedMonthFilter}
              onChange={(e) => setSelectedMonthFilter(e.target.value)}
              className="bg-transparent border-0 text-xs text-white font-bold focus:outline-hidden cursor-pointer"
            >
              <option value="all" className="bg-slate-950 text-white">
                جميع الشهور
              </option>
              {availableBatchMonths.map((m) => (
                <option key={m} value={m} className="bg-slate-950 text-white">
                  {getArabicMonthName(m)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Zero State if empty */}
      {filteredBatches.length === 0 ? (
        <div className="p-12 text-center bg-slate-900 rounded-2xl border border-slate-800">
          <Layers className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white mb-1">لا توجد دفعات طباعة حالياً</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto mb-5 leading-relaxed">
            سجل دفعات الطباعة مصفّر بالكامل. قم بتسجيل أول دفعة طباعة كروت لتبدأ بإصدار الشيتات ونقلها للموزع.
          </p>
          {currentRole === 'admin' && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              إضافة دفعة طباعة كروت
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid Cards View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBatches.map((batch) => {
            const config = CARD_CATEGORIES_CONFIG[batch.category];
            const catBNum = getCategoryBatchNumber(batch, batches);
            const batchOrdinalTitle = getBatchOrdinalName(catBNum);
            const monthArabic = getArabicMonthName(batch.accountingMonth || batch.date?.slice(0, 7));
            const batchSheets = sheets.filter((s) => s.batchId === batch.id && isValidBatchSheet(s, batch));
            const cardsPerSheet = batch.cardsPerSheet || config.defaultCardsPerSheet || 60;
            const adminCards = batchSheets.filter((s) => s.status === 'admin_custody').reduce((sum, s) => sum + (s.cardsCount !== undefined ? s.cardsCount : cardsPerSheet), 0);
            const distributorCards = batchSheets.filter((s) => s.status === 'distributor_custody').reduce((sum, s) => sum + (s.cardsCount !== undefined ? s.cardsCount : cardsPerSheet), 0);
            const deliveredCards = batchSheets.filter((s) => s.status === 'delivered_outlet').reduce((sum, s) => sum + (s.cardsCount !== undefined ? s.cardsCount : cardsPerSheet), 0);
            const damagedCards = batchSheets.filter((s) => s.status === 'damaged' || s.status === 'returned').reduce((sum, s) => sum + (s.cardsCount !== undefined ? s.cardsCount : cardsPerSheet), 0);

            const inAdminCustodySheets = Number((adminCards / cardsPerSheet).toFixed(2));
            const inDistributorCustodySheets = Number((distributorCards / cardsPerSheet).toFixed(2));
            const deliveredSheets = Number((deliveredCards / cardsPerSheet).toFixed(2));
            const damagedSheets = Number((damagedCards / cardsPerSheet).toFixed(2));
            const inAdminCustody = inAdminCustodySheets;
            const inDistributorCustody = inDistributorCustodySheets;
            const delivered = deliveredSheets;
            const damaged = damagedSheets;

            return (
              <div
                key={batch.id}
                className="bg-slate-900 rounded-2xl border border-slate-800 p-5 space-y-4 hover:border-slate-700 transition"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center font-black text-amber-400 border border-slate-700">
                      {batch.category}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-sm text-white">{batchOrdinalTitle}</span>
                        {monthArabic && (
                          <span className="text-[11px] px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-400 border border-amber-500/30 font-bold">
                            {monthArabic}
                          </span>
                        )}
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-bold">
                          {config.name}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">({batch.id})</span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-500" />
                          {batch.date}
                        </span>
                        <span>•</span>
                        <span className="text-slate-400 font-medium">الشهر المحاسبي: {batch.accountingMonth}</span>
                      </div>
                    </div>
                  </div>

                  {currentRole === 'admin' && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(batch)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition cursor-pointer"
                        title="تعديل وتصحيح بيانات الدفعة وعدد الشيتات (صلاحيات المسؤول)"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {inAdminCustody === batch.sheetsCount && (
                        <button
                          onClick={() => {
                            setDeletingBatch(batch);
                            setDeleteBatchError('');
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition cursor-pointer"
                          title="حذف دفعة الطباعة وإلغاء شيتاتها"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Financial & Quantities Summary */}
                <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs">
                  <div>
                    <span className="text-slate-400 text-[10px]">عدد الشيتات والكروت:</span>
                    <div className="font-bold text-white mt-0.5">
                      {batch.sheetsCount} شيت ({batch.totalCards} كرت)
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px]">قيمة الجملة:</span>
                    <div className="font-bold text-emerald-400 mt-0.5">
                      {batch.totalWholesaleValue.toLocaleString()} ر.ي
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px]">سعر الشيت بالجملة:</span>
                    <div className="font-bold text-slate-300 mt-0.5">
                      {batch.wholesaleSheetPrice.toLocaleString()} ر.ي
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px]">القيمة الاسمية للكروت:</span>
                    <div className="font-bold text-slate-300 mt-0.5">
                      {batch.totalFaceValue.toLocaleString()} ر.ي
                    </div>
                  </div>
                </div>

                {/* Leaf status breakdown progress */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>موقف أوراق الشيتات ({batch.sheetsCount} شيت — {batch.totalCards} كرت):</span>
                    <span>{deliveredCards} كرت مورد ({deliveredSheets} شيت) من {batch.totalCards}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-800 flex overflow-hidden">
                    <div
                      style={{ width: `${(deliveredCards / (batch.totalCards || 1)) * 100}%` }}
                      className="bg-purple-500 h-full"
                      title={`مورد للمنافذ: ${deliveredCards} كرت (${deliveredSheets} شيت)`}
                    />
                    <div
                      style={{ width: `${(distributorCards / (batch.totalCards || 1)) * 100}%` }}
                      className="bg-emerald-500 h-full"
                      title={`في عهدة الموزع: ${distributorCards} كرت (${inDistributorCustodySheets} شيت)`}
                    />
                    <div
                      style={{ width: `${(adminCards / (batch.totalCards || 1)) * 100}%` }}
                      className="bg-blue-500 h-full"
                      title={`في عهدة المسؤول: ${adminCards} كرت (${inAdminCustodySheets} شيت)`}
                    />
                    {damagedCards > 0 && (
                      <div
                        style={{ width: `${(damagedCards / (batch.totalCards || 1)) * 100}%` }}
                        className="bg-rose-500 h-full"
                        title={`تالف / مرتجع: ${damagedCards} كرت (${damagedSheets} شيت)`}
                      />
                    )}
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                    <span className="text-blue-400 font-bold">
                      عهدة المسؤول: {adminCards} كرت {inAdminCustodySheets > 0 ? `(${inAdminCustodySheets} شيت)` : ''}
                    </span>
                    <span className="text-emerald-400 font-bold">
                      عهدة الموزع: {distributorCards} كرت {inDistributorCustodySheets > 0 ? `(${inDistributorCustodySheets} شيت)` : ''}
                    </span>
                    <span className="text-purple-400 font-bold">
                      مورد: {deliveredCards} كرت {deliveredSheets > 0 ? `(${deliveredSheets} شيت)` : ''}
                    </span>
                  </div>
                </div>

                {batch.notes && (
                  <p className="text-[11px] text-slate-400 bg-slate-850 p-2 rounded-lg border border-slate-800/80">
                    {batch.notes}
                  </p>
                )}

                {/* Actions: Detailed Table & Leaf Tracking */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={() => {
                      setSelectedBatchForSheets(batch.id);
                      setViewMode('sheets_table');
                    }}
                    className="py-2.5 px-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 font-bold text-xs flex items-center justify-center gap-1.5 transition border border-amber-500/30 cursor-pointer"
                    title="عرض جدول تفصيلي يوضح حالة كل شيت داخل هذه الدفعة"
                  >
                    <Table className="w-3.5 h-3.5 shrink-0" />
                    <span>الجدول التفصيلي</span>
                  </button>
                  <button
                    onClick={() => setViewingLeafBatch(batch)}
                    className="py-2.5 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white font-bold text-xs flex items-center justify-center gap-1.5 transition border border-slate-700/60 cursor-pointer"
                    title="معاينة وتتبع أوراق الشيتات"
                  >
                    <Eye className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>معاينة وتتبع</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : viewMode === 'table' ? (
        /* Table View */
        <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
          <div className="table-scroll-container overflow-x-auto">
            <table className="w-full text-right text-xs min-w-[760px]">
              <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="p-3.5 font-bold">الدفعة والكود</th>
                  <th className="p-3.5 font-bold">الفئة</th>
                  <th className="p-3.5 font-bold">التاريخ</th>
                  <th className="p-3.5 font-bold">الشهر المحاسبي</th>
                  <th className="p-3.5 font-bold">عدد الشيتات</th>
                  <th className="p-3.5 font-bold">إجمالي الكروت</th>
                  <th className="p-3.5 font-bold">قيمة الجملة</th>
                  <th className="p-3.5 font-bold text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredBatches.map((batch) => {
                  const catBNum = getCategoryBatchNumber(batch, batches);
                  const batchOrdinalTitle = getBatchOrdinalName(catBNum);
                  const monthArabic = getArabicMonthName(batch.accountingMonth || batch.date?.slice(0, 7));
                  const bSheets = sheets.filter((s) => s.batchId === batch.id && isValidBatchSheet(s, batch));

                  return (
                    <tr key={batch.id} className="hover:bg-slate-850/50 transition">
                      <td className="p-3.5">
                        <div className="font-extrabold text-white text-xs">{batchOrdinalTitle}</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">{batch.id}</div>
                      </td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-400 font-bold text-[11px]">
                          فئة {batch.category}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-300">{batch.date}</td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-amber-400 font-bold text-[11px] border border-slate-700/60 inline-block">
                          {monthArabic}
                        </span>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">{batch.accountingMonth}</div>
                      </td>
                      <td className="p-3.5 font-bold text-white">{batch.sheetsCount} شيت</td>
                      <td className="p-3.5 text-slate-300">{batch.totalCards} كرت</td>
                      <td className="p-3.5 font-bold text-emerald-400">
                        {batch.totalWholesaleValue.toLocaleString()} ر.ي
                      </td>
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedBatchForSheets(batch.id);
                              setViewMode('sheets_table');
                            }}
                            className="min-w-[38px] min-h-[38px] p-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 transition cursor-pointer flex items-center justify-center active:scale-95"
                            title="عرض جدول تفصيلي لشيتات هذه الدفعة"
                          >
                            <Table className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setViewingLeafBatch(batch)}
                            className="min-w-[38px] min-h-[38px] p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer flex items-center justify-center active:scale-95"
                            title="تتبع الشيتات ورقة بورقة"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {currentRole === 'admin' && (
                            <button
                              onClick={() => handleOpenEdit(batch)}
                              className="min-w-[38px] min-h-[38px] p-2 rounded-xl bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-300 transition cursor-pointer flex items-center justify-center active:scale-95"
                              title="تعديل وتصحيح بيانات الدفعة وعدد الشيتات (صلاحيات المسؤول)"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Detailed Sheets Table View (جدول تفصيلي لحالة كل شيت داخل كل دفعة) */
        <div className="space-y-4">
          {/* 1. Header & Summary Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <div className="bg-slate-900 p-3.5 rounded-2xl border border-slate-800 space-y-1">
              <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-amber-400" />
                <span>إجمالي الشيتات</span>
              </span>
              <div className="text-xl font-black text-white">
                {sheetsStats.total} <span className="text-xs font-normal text-slate-400">شيت ({sheetsStats.totalCards} كرت)</span>
              </div>
              <span className="text-[10px] text-slate-500 block">
                في النطاق المحدد حالياً
              </span>
            </div>

            <div className="bg-purple-950/20 p-3.5 rounded-2xl border border-purple-500/30 space-y-1">
              <span className="text-[11px] font-bold text-purple-300 flex items-center gap-1.5">
                <Store className="w-3.5 h-3.5 text-purple-400" />
                <span>موزع للمنافذ</span>
              </span>
              <div className="text-xl font-black text-purple-300">
                {sheetsStats.delivered} <span className="text-xs font-normal text-purple-400/80">شيت ({sheetsStats.deliveredCards} كرت)</span>
              </div>
              <span className="text-[10px] text-purple-400/90 font-bold block">
                نسبة الإنجاز: {Math.round((sheetsStats.deliveredCards / (sheetsStats.totalCards || 1)) * 100)}%
              </span>
            </div>

            <div className="bg-emerald-950/20 p-3.5 rounded-2xl border border-emerald-500/30 space-y-1">
              <span className="text-[11px] font-bold text-emerald-300 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                <span>بعهدة الموزع</span>
              </span>
              <div className="text-xl font-black text-emerald-300">
                {sheetsStats.distributor} <span className="text-xs font-normal text-emerald-400/80">شيت ({sheetsStats.distributorCards} كرت)</span>
              </div>
              <span className="text-[10px] text-emerald-400/90 font-bold block">
                قيد التوزيع الميداني
              </span>
            </div>

            <div className="bg-blue-950/20 p-3.5 rounded-2xl border border-blue-500/30 space-y-1">
              <span className="text-[11px] font-bold text-blue-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-400" />
                <span>متبقي بمخزن المسؤول</span>
              </span>
              <div className="text-xl font-black text-blue-300">
                {sheetsStats.admin} <span className="text-xs font-normal text-blue-400/80">شيت ({sheetsStats.adminCards} كرت)</span>
              </div>
              <span className="text-[10px] text-blue-400/90 font-bold block">
                جاهز للتحويل أو الصرف
              </span>
            </div>

            <div className="bg-rose-950/20 p-3.5 rounded-2xl border border-rose-500/30 space-y-1">
              <span className="text-[11px] font-bold text-rose-300 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                <span>تالف / مرتجع</span>
              </span>
              <div className="text-xl font-black text-rose-300">
                {sheetsStats.damaged} <span className="text-xs font-normal text-rose-400/80">شيت ({sheetsStats.damagedCards} كرت)</span>
              </div>
              <span className="text-[10px] text-rose-400/90 font-bold block">
                مستبعد من التداول
              </span>
            </div>
          </div>

          {/* 2. Filters & Batch Selector Toolbar */}
          <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
              {/* Batch Selector Dropdown */}
              <div className="flex items-center gap-2 flex-1">
                <span className="text-xs font-bold text-slate-400 shrink-0 flex items-center gap-1">
                  <Package className="w-4 h-4 text-amber-400" />
                  <span>عرض الدفعة:</span>
                </span>
                <select
                  value={selectedBatchForSheets}
                  onChange={(e) => setSelectedBatchForSheets(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-amber-500 font-bold"
                >
                  <option value="all">
                    جميع دفعات الطباعة ({batches.length} دفعات — {batches.reduce((sum, b) => sum + (b.sheetsCount || 0), 0)} شيت إجمالي)
                  </option>
                  {batches.map((b) => {
                    const catBNum = b.categoryBatchNumber || getCategoryBatchNumber(b, batches);
                    const name = getBatchOrdinalName(catBNum);
                    return (
                      <option key={b.id} value={b.id}>
                        {name} ({b.id}) — فئة {b.category} ريال ({b.sheetsCount} شيت — {b.totalCards} كرت)
                      </option>
                    );
                  })}
                </select>
                {selectedBatchForSheets !== 'all' && (
                  <button
                    onClick={() => setSelectedBatchForSheets('all')}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-amber-400 font-bold transition shrink-0 cursor-pointer"
                  >
                    عرض كل الدفعات
                  </button>
                )}
              </div>

              {/* Live Search Input & Export / Print Actions */}
              <div className="flex items-center gap-2 w-full lg:w-auto">
                <div className="relative flex-1 lg:w-72">
                  <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                  <input
                    type="text"
                    value={sheetSearchQuery}
                    onChange={(e) => setSheetSearchQuery(e.target.value)}
                    placeholder="بحث برقم الشيت (1..15) أو الكود أو المنفذ..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-9 pl-8 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500 font-medium"
                  />
                  {sheetSearchQuery && (
                    <button
                      onClick={() => setSheetSearchQuery('')}
                      className="absolute left-2.5 top-2.5 text-slate-400 hover:text-white cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <button
                  onClick={exportDetailedSheetsCSV}
                  disabled={detailedSheetsList.length === 0}
                  className="min-h-[40px] px-3 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0 active:scale-95"
                  title="تصدير جدول الشيتات إلى ملف Excel / CSV"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden sm:inline">تصدير CSV</span>
                </button>
                <button
                  onClick={handlePrintSheetsTable}
                  disabled={detailedSheetsList.length === 0}
                  className="min-h-[40px] px-3 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0 active:scale-95"
                  title="طباعة جدول الشيتات"
                >
                  <Printer className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">طباعة</span>
                </button>
              </div>
            </div>

            {/* Status Filter Buttons */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-1 border-t border-slate-800">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-400 ml-1">حالة الشيت:</span>
                <button
                  onClick={() => setSheetStatusFilter('all')}
                  className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer active:scale-95 ${
                    sheetStatusFilter === 'all'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'bg-slate-950 text-slate-300 hover:text-white border border-slate-800'
                  }`}
                >
                  الكل ({sheetsStats.total} شيت / {sheetsStats.totalCards} كرت)
                </button>
                <button
                  onClick={() => setSheetStatusFilter('delivered_outlet')}
                  className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer active:scale-95 ${
                    sheetStatusFilter === 'delivered_outlet'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'bg-slate-950 text-purple-300 hover:text-white border border-purple-500/30'
                  }`}
                >
                  <Store className="w-3 h-3" />
                  <span>موزع للمنافذ ({sheetsStats.delivered} شيت / {sheetsStats.deliveredCards} كرت)</span>
                </button>
                <button
                  onClick={() => setSheetStatusFilter('distributor_custody')}
                  className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer active:scale-95 ${
                    sheetStatusFilter === 'distributor_custody'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-950 text-emerald-300 hover:text-white border border-emerald-500/30'
                  }`}
                >
                  <Shield className="w-3 h-3" />
                  <span>بعهدة الموزع ({sheetsStats.distributor} شيت / {sheetsStats.distributorCards} كرت)</span>
                </button>
                <button
                  onClick={() => setSheetStatusFilter('admin_custody')}
                  className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer active:scale-95 ${
                    sheetStatusFilter === 'admin_custody'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-950 text-blue-300 hover:text-white border border-blue-500/30'
                  }`}
                >
                  <Clock className="w-3 h-3" />
                  <span>متبقي بالمخزن ({sheetsStats.admin} شيت / {sheetsStats.adminCards} كرت)</span>
                </button>
                <button
                  onClick={() => setSheetStatusFilter('damaged')}
                  className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer active:scale-95 ${
                    sheetStatusFilter === 'damaged'
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'bg-slate-950 text-rose-300 hover:text-white border border-rose-500/30'
                  }`}
                >
                  <AlertTriangle className="w-3 h-3" />
                  <span>تالف / مرتجع ({sheetsStats.damaged} شيت / {sheetsStats.damagedCards} كرت)</span>
                </button>
              </div>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-1 overflow-x-auto table-scroll-container pb-1 sm:pb-0">
                <span className="text-[11px] font-bold text-slate-400 ml-1">الفئة:</span>
                <button
                  onClick={() => setSheetCategoryFilter('all')}
                  className={`min-h-[34px] px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer shrink-0 active:scale-95 ${
                    sheetCategoryFilter === 'all'
                      ? 'bg-amber-400 text-slate-950'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  الكل
                </button>
                {Object.keys(CARD_CATEGORIES_CONFIG).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSheetCategoryFilter(cat)}
                    className={`min-h-[34px] px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer shrink-0 active:scale-95 ${
                      sheetCategoryFilter === cat
                        ? 'bg-amber-400 text-slate-950'
                        : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 3. The Detailed Sheet-by-Sheet Table */}
          {detailedSheetsList.length === 0 ? (
            <div className="p-12 text-center bg-slate-900 rounded-2xl border border-slate-800">
              <Table className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-bold text-white mb-1">لا توجد شيتات تطابق خيارات البحث</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto mb-4 leading-relaxed">
                لم يتم العثور على أي شيت بالمعايير المحددة. جرب تغيير فلترة الحالة أو الفئة أو مسح نص البحث.
              </p>
              <button
                onClick={() => {
                  setSelectedBatchForSheets('all');
                  setSheetStatusFilter('all');
                  setSheetCategoryFilter('all');
                  setSheetSearchQuery('');
                }}
                className="min-h-[40px] px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs transition cursor-pointer"
              >
                إعادة ضبط الفلاتر
              </button>
            </div>
          ) : (
            <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
              <div className="table-scroll-container overflow-x-auto">
                <table className="w-full text-right text-xs min-w-[850px]">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="p-3.5 font-bold"># رقم الشيت بالدفعة</th>
                      <th className="p-3.5 font-bold">كود الشيت التسلسلي</th>
                      <th className="p-3.5 font-bold">الدفعة التابع لها</th>
                      <th className="p-3.5 font-bold">الكروت والقيم المالية</th>
                      <th className="p-3.5 font-bold">حالة الشيت (موزع، متبقي، تالف)</th>
                      <th className="p-3.5 font-bold">الحائز الحالي / المنفذ</th>
                      <th className="p-3.5 font-bold">تاريخ وسند الحركة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {detailedSheetsList.map((sheet) => {
                      const config = CARD_CATEGORIES_CONFIG[sheet.category];
                      const perSheet = config.defaultCardsPerSheet || 60;
                      const isPartial = sheet.cardsCount < perSheet;
                      const wholesalePrice = (sheet.cardsCount / perSheet) * (sheet.batchInfo?.wholesaleSheetPrice || config.defaultWholesaleSheetPrice);
                      const faceValue = sheet.cardsCount * config.nominalValue;

                      return (
                        <tr
                          key={sheet.sheetCode}
                          className="hover:bg-slate-850/60 transition group"
                        >
                          {/* 1. Leaf Number per batch */}
                          <td className="p-3.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="px-2.5 py-1 rounded-xl bg-amber-500/15 text-amber-300 border border-amber-500/30 font-black font-mono text-xs flex items-center justify-center">
                                شيت #{sheet.leafNumber}
                              </span>
                              {isPartial && (
                                <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold">
                                  مجزأ ({sheet.cardsCount} كرت)
                                </span>
                              )}
                              <span className="text-[11px] text-slate-400 font-bold">
                                من {sheet.batchInfo?.sheetsCount || 1}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-500 mt-1 block font-medium">
                              {sheet.batchOrdinalName}
                            </span>
                          </td>

                          {/* 2. Sheet Code */}
                          <td className="p-3.5">
                            <span className="font-mono font-bold text-xs text-white bg-slate-950 px-2 py-1 rounded-lg border border-slate-800 inline-block">
                              {sheet.sheetCode}
                            </span>
                          </td>

                          {/* 3. Batch info */}
                          <td className="p-3.5">
                            <div className="flex items-center gap-1.5">
                              <span className="font-extrabold text-white text-xs">
                                {sheet.batchOrdinalName}
                              </span>
                              <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-amber-500/20 text-amber-400 font-bold">
                                {sheet.category} ر.ي
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                              {sheet.batchId} • {sheet.batchInfo?.date}
                            </span>
                          </td>

                          {/* 4. Financials */}
                          <td className="p-3.5">
                            <div className="font-bold text-white text-xs">
                              {sheet.cardsCount} كرت {isPartial ? `(من ${perSheet})` : ''}
                            </div>
                            <div className="text-[10px] text-emerald-400 font-bold mt-0.5">
                              جملة: {Math.round(wholesalePrice).toLocaleString()} ر.ي
                            </div>
                            <div className="text-[10px] text-slate-400">
                              اسمية: {faceValue.toLocaleString()} ر.ي
                            </div>
                          </td>

                          {/* 5. Sheet Status (موزع، متبقي، تالف) */}
                          <td className="p-3.5">
                            {renderSheetStatusBadge(
                              sheet.status,
                              sheet.assignedOutletName,
                              sheet.deliveryId,
                              sheet.transferId
                            )}
                          </td>

                          {/* 6. Current Holder / Outlet */}
                          <td className="p-3.5">
                            {sheet.status === 'delivered_outlet' ? (
                              <div className="flex items-center gap-1.5">
                                <Store className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                                <span className="font-bold text-white">
                                  {sheet.assignedOutletName || 'منفذ معتمد'}
                                </span>
                              </div>
                            ) : sheet.status === 'distributor_custody' ? (
                              <div className="flex items-center gap-1.5 text-emerald-300 font-bold">
                                <Shield className="w-3.5 h-3.5 shrink-0" />
                                <span>الموزع الميداني</span>
                              </div>
                            ) : sheet.status === 'admin_custody' ? (
                              <div className="flex items-center gap-1.5 text-blue-300 font-bold">
                                <Clock className="w-3.5 h-3.5 shrink-0" />
                                <span>المسؤول (المخزن الرئيسي)</span>
                              </div>
                            ) : (
                              <span className="text-rose-400 font-bold">مستبعد</span>
                            )}
                          </td>

                          {/* 7. Voucher & Date */}
                          <td className="p-3.5 text-slate-300">
                            {sheet.deliveryId ? (
                              <span className="font-mono text-[11px] font-bold text-purple-300 block">
                                {sheet.deliveryId}
                              </span>
                            ) : sheet.transferId ? (
                              <span className="font-mono text-[11px] font-bold text-emerald-300 block">
                                {sheet.transferId}
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-500 block">-</span>
                            )}
                            <span className="text-[10px] text-slate-500 mt-0.5 block">
                              {sheet.timestamp
                                ? formatArabicDate(sheet.timestamp.split('T')[0])
                                : sheet.batchInfo?.date}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="p-3.5 bg-slate-950/80 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400">
                <span>
                  إجمالي الشيتات المعروضة في الجدول: <strong className="text-white">{detailedSheetsList.length}</strong> شيت
                </span>
                <span className="font-mono text-[11px] text-amber-400">
                  شبكة قعزان نت — تتبع الشيتات ورقة بورقة
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 1. Modal: Add New Print Batch */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-700 p-6 text-slate-100 shadow-2xl relative text-right">
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="absolute left-4 top-4 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                <Layers className="w-4 h-4" />
              </div>
              <h3 className="text-base font-extrabold text-white">تسجيل دفعة طباعة كروت جديدة</h3>
            </div>

            <form onSubmit={handleCreateBatch} className="space-y-4">
              {/* Category Picker */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">فئة الكرت</label>
                <div className="grid grid-cols-3 gap-2">
                  {Object.keys(CARD_CATEGORIES_CONFIG).map((cat) => (
                    <button
                      type="button"
                      key={cat}
                      onClick={() => handleCategoryChange(cat as CardCategory)}
                      className={`p-2.5 rounded-xl text-xs font-bold border transition text-center cursor-pointer ${
                        formData.category === cat
                          ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-md shadow-amber-500/20'
                          : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600'
                      }`}
                    >
                      فئة {cat} ر.ي
                    </button>
                  ))}
                </div>
              </div>

              {/* Live Monthly Batch Sequence Preview */}
              <div className="p-3 rounded-xl bg-gradient-to-r from-amber-500/20 via-slate-800 to-slate-900 border border-amber-500/40 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] text-amber-300 block font-semibold">ترقيم الدفعة المحاسبي للشهر:</span>
                    <span className="font-black text-white text-sm">
                      {getBatchOrdinalName(expectedBatchNumber)} ({getArabicMonthName(formData.accountingMonth)})
                    </span>
                  </div>
                </div>
                <div className="text-left shrink-0">
                  <span className="px-2.5 py-1 rounded-lg bg-amber-500 text-slate-950 font-black text-xs block">
                    فئة {formData.category} ر.ي
                  </span>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    {expectedBatchNumber === 1 ? 'بداية دورة شهرية جديدة' : `الدفعة رقم ${expectedBatchNumber} هذا الشهر`}
                  </span>
                </div>
              </div>

              {/* Date & Accounting Month */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">تاريخ الطباعة</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => {
                      const newDate = e.target.value;
                      const newMonth = newDate ? newDate.slice(0, 7) : formData.accountingMonth;
                      setFormData({ ...formData, date: newDate, accountingMonth: newMonth });
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-amber-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    الشهر المحاسبي ({getArabicMonthOnly(formData.accountingMonth)})
                  </label>
                  <input
                    type="month"
                    required
                    value={formData.accountingMonth}
                    onChange={(e) => setFormData({ ...formData, accountingMonth: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              {/* High Denomination Flexibility: Option to print by Card Count (Fractional sheets) or Full Sheets */}
              {CARD_CATEGORIES_CONFIG[formData.category].allowCardUnits && (
                <div className="p-3 rounded-xl bg-slate-950 border border-amber-500/30 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-amber-300">خيار تحديد كمية الطباعة لفئة {formData.category} ر.ي:</label>
                    <span className="text-[10px] text-slate-400">مرونة طباعة أجزاء الشيت</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, batchPrintMode: 'cards' })}
                      className={`py-2 px-3 rounded-lg text-xs font-bold transition cursor-pointer text-center ${
                        formData.batchPrintMode === 'cards'
                          ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                          : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                      }`}
                    >
                      بعدد الكروت (نصف / ربع شيت أو مخصص)
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, batchPrintMode: 'sheets' })}
                      className={`py-2 px-3 rounded-lg text-xs font-bold transition cursor-pointer text-center ${
                        formData.batchPrintMode === 'sheets'
                          ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                          : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                      }`}
                    >
                      بالشيت الكامل (60 كرت)
                    </button>
                  </div>

                  {formData.batchPrintMode === 'cards' && (
                    <div className="space-y-2 pt-1 border-t border-slate-800">
                      <span className="text-[11px] font-bold text-slate-400 block">أجزاء الشيت السريعة:</span>
                      <div className="grid grid-cols-4 gap-1.5">
                        {[
                          { count: 15, label: 'ربع شيت (15)' },
                          { count: 20, label: 'ثلث شيت (20)' },
                          { count: 30, label: 'نصف شيت (30)' },
                          { count: 60, label: 'شيت كامل (60)' },
                        ].map((btn) => (
                          <button
                            key={btn.count}
                            type="button"
                            onClick={() => setFormData({ ...formData, cardsCount: btn.count })}
                            className={`py-1.5 px-1 rounded-lg text-[10px] font-bold border transition cursor-pointer text-center ${
                              formData.cardsCount === btn.count
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/60 shadow-sm'
                                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                            }`}
                          >
                            {btn.label}
                          </button>
                        ))}
                      </div>

                      <div className="grid grid-cols-2 gap-3 pt-1">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-300 mb-1">
                            عدد الكروت المراد طباعتها
                          </label>
                          <input
                            type="number"
                            min="1"
                            required
                            value={formData.cardsCount}
                            onChange={(e) => setFormData({ ...formData, cardsCount: Number(e.target.value) })}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-amber-500 font-bold font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-300 mb-1">
                            سعر الكرت الواحد بالجملة (ر.ي)
                          </label>
                          <input
                            type="number"
                            min="0"
                            required
                            value={formData.wholesaleCardPrice}
                            onChange={(e) => setFormData({ ...formData, wholesaleCardPrice: Number(e.target.value) })}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-emerald-400 focus:outline-hidden focus:border-amber-500 font-bold font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Sheets count & Cards per sheet (For standard sheet printing) */}
              {(!CARD_CATEGORIES_CONFIG[formData.category].allowCardUnits || formData.batchPrintMode === 'sheets') && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">عدد الشيتات (الأوراق)</label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={formData.sheetsCount}
                        onChange={(e) => setFormData({ ...formData, sheetsCount: Number(e.target.value) })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-amber-500 font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">كروت في كل شيت</label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={formData.cardsPerSheet}
                        onChange={(e) => setFormData({ ...formData, cardsPerSheet: Number(e.target.value) })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      سعر الشيت بالجملة (ر.ي)
                    </label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={formData.wholesaleSheetPrice}
                      onChange={(e) => setFormData({ ...formData, wholesaleSheetPrice: Number(e.target.value) })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-amber-500 font-bold text-emerald-400"
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      الافتراضي: 10,000 لفئة 200 • 25,000 لفئة 500 • 50,000 لفئة 1000 • 150,000 لفئة 3000
                    </span>
                  </div>
                </>
              )}

              {/* Total Summary Preview */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px]">إجمالي الكروت الناتجة:</span>
                  <span className="font-extrabold text-white">
                    {CARD_CATEGORIES_CONFIG[formData.category].allowCardUnits && formData.batchPrintMode === 'cards'
                      ? `${formData.cardsCount.toLocaleString()} كرت (جزئي)`
                      : `${(formData.sheetsCount * formData.cardsPerSheet).toLocaleString()} كرت`}
                  </span>
                </div>
                <div className="text-left">
                  <span className="text-slate-400 block text-[10px]">القيمة الإجمالية بالجملة:</span>
                  <span className="font-extrabold text-emerald-400 text-sm">
                    {CARD_CATEGORIES_CONFIG[formData.category].allowCardUnits && formData.batchPrintMode === 'cards'
                      ? `${(formData.cardsCount * formData.wholesaleCardPrice).toLocaleString()} ر.ي`
                      : `${(formData.sheetsCount * formData.wholesaleSheetPrice).toLocaleString()} ر.ي`}
                  </span>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">ملاحظات (اختياري)</label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="مثال: طبعة بداية الشهر، مطبعة الجزيرة..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-amber-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs shadow-md shadow-amber-500/20 transition cursor-pointer"
                >
                  حفظ وتوليد الشيتات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Modal: Edit Batch Full Data & Sheet Correction */}
      {editingBatch && (() => {
        const batchSheets = sheets.filter((s) => s.batchId === editingBatch.id);
        const usedSheets = batchSheets.filter((s) => s.status !== 'admin_custody');
        const usedSheetsCount = usedSheets.length;
        const canChangeCategory = usedSheetsCount === 0;
        const minAllowedSheets = Math.max(1, usedSheetsCount);
        const currentDiff = Number(editSheetsCount) - editingBatch.sheetsCount;
        const newTotalCards = Number(editSheetsCount) * Number(editCardsPerSheet);
        const newTotalWholesale = Number(editSheetsCount) * Number(editWholesaleSheetPrice);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in overflow-y-auto">
            <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-700 p-6 text-slate-100 shadow-2xl relative text-right my-8 max-h-[90vh] overflow-y-auto">
              <button
                onClick={() => setEditingBatch(null)}
                className="absolute left-4 top-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                title="إغلاق"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">تعديل وتصحيح بيانات دفعة الطباعة</h3>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-amber-400 font-mono font-bold">{editingBatch.id}</span>
                    <span className="text-slate-500">•</span>
                    <span className="text-slate-400">دفعة فئة {editingBatch.category} ر.ي</span>
                  </div>
                </div>
              </div>

              {/* Status & Custody Notice */}
              {usedSheetsCount > 0 ? (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs space-y-1 mb-4">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>تنبيه قيود العهدة: تم تحويل/توريد {usedSheetsCount} شيت من هذه الدفعة مسبقاً.</span>
                  </div>
                  <p className="text-[11px] text-amber-200/80 leading-relaxed pr-5">
                    الحد الأدنى لعدد الشيتات هو <span className="font-bold text-white font-mono">{minAllowedSheets} شيت</span>. لا يمكن خفض العدد لما دونه لحماية مطابقة العهدة، ولا يمكن تعديل فئة الكرت بعد بدء التوزيع.
                  </p>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs space-y-1 mb-4">
                  <div className="font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>جاهز للتعديل الكامل: جميع شيتات هذه الدفعة ({editingBatch.sheetsCount} شيت) ما زالت في عهدة المسؤول.</span>
                  </div>
                  <p className="text-[11px] text-emerald-200/80 leading-relaxed pr-5">
                    إذا أخطأت وسجلت عدد شيتات أكثر أو فئة خاطئة، يمكنك تصحيحها الآن بحرية كاملة وسيتكفل النظام بضبط المخزون وسجلات التدقيق آلياً.
                  </p>
                </div>
              )}

              {/* Error Banner */}
              {editError && (
                <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/60 text-rose-200 text-xs font-bold flex items-center gap-2 mb-4 animate-in fade-in">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{editError}</span>
                </div>
              )}

              <form onSubmit={handleSaveEdit} className="space-y-4">
                {/* 1. Category */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-300">فئة الكرت</label>
                    {!canChangeCategory && (
                      <span className="text-[10px] text-slate-500">مقفلة لبدء توزيع شيتات منها</span>
                    )}
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                    {Object.keys(CARD_CATEGORIES_CONFIG).map((cat) => (
                      <button
                        type="button"
                        key={cat}
                        disabled={!canChangeCategory}
                        onClick={() => handleEditCategoryChange(cat as CardCategory)}
                        className={`p-2 rounded-xl text-xs font-bold border transition text-center ${
                          editCategory === cat
                            ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-xs'
                            : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                        } ${!canChangeCategory ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Number of Sheets Correction */}
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                      <Layers className="w-4 h-4" />
                      <span>عدد الشيتات الفعلي المصحح:</span>
                    </label>
                    <span className="text-[11px] font-mono text-slate-400">
                      العدد السابق: <span className="text-white font-bold">{editingBatch.sheetsCount}</span>
                    </span>
                  </div>
                  <input
                    type="number"
                    min={minAllowedSheets}
                    required
                    value={editSheetsCount}
                    onChange={(e) => setEditSheetsCount(Math.max(1, Number(e.target.value)))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-hidden focus:border-amber-500 font-mono font-bold"
                  />
                  <div className="flex items-center justify-between text-[11px] pt-1">
                    <span className="text-slate-400">
                      الحد الأدنى المسموح به: <span className="font-mono font-bold text-amber-300">{minAllowedSheets} شيت</span>
                    </span>
                    {currentDiff !== 0 && (
                      <span
                        className={`font-mono font-bold ${
                          currentDiff > 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {currentDiff > 0 ? `+${currentDiff} شيت سيتم توليدها` : `${currentDiff} شيت زائدة ستُحذف`}
                      </span>
                    )}
                  </div>
                </div>

                {/* 3. Wholesale Price & Cards Per Sheet */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      سعر الشيت بالجملة (ر.ي)
                    </label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={editWholesaleSheetPrice}
                      onChange={(e) => setEditWholesaleSheetPrice(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-amber-500 font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      عدد الكروت بالشيت
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={editCardsPerSheet}
                      onChange={(e) => setEditCardsPerSheet(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-amber-500 font-mono font-bold"
                    />
                  </div>
                </div>

                {/* 4. Date & Accounting Month */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">تاريخ الدفعة</label>
                    <input
                      type="date"
                      required
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">الشهر المحاسبي</label>
                    <input
                      type="month"
                      required
                      value={editMonth}
                      onChange={(e) => setEditMonth(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* 5. Notes / Reason for correction */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    ملاحظات / سبب التعديل والتصحيح (توثق بسجل التدقيق)
                  </label>
                  <input
                    type="text"
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder="مثال: تصحيح خطأ إدخال عدد الشيتات من 20 إلى 15 شيت..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-amber-500"
                  />
                </div>

                {/* 6. Live Financial Recalculation Summary Box */}
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 text-xs">
                  <span className="text-[11px] font-bold text-slate-400 block border-b border-slate-900 pb-1">
                    المطابقة الحسابية بعد تطبيق التعديل:
                  </span>
                  <div className="flex justify-between items-center text-slate-300">
                    <span>إجمالي الكروت المحسوبة:</span>
                    <span className="font-mono font-bold text-white">{newTotalCards.toLocaleString()} كرت</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-300">
                    <span>إجمالي قيمة الدفعة بالجملة:</span>
                    <span className="font-mono font-black text-amber-400">{newTotalWholesale.toLocaleString()} ر.ي</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingBatch(null)}
                    className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20 transition cursor-pointer"
                  >
                    حفظ وتثبيت التصحيح في سجل التدقيق ✍️
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* 3. Modal: Leaf-by-leaf tracking */}
      {viewingLeafBatch && (() => {
        const catBNum =
          viewingLeafBatch.categoryBatchNumber || getCategoryBatchNumber(viewingLeafBatch, batches);
        const batchOrdinalTitle = getBatchOrdinalName(catBNum);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in">
            <div className="w-full max-w-2xl max-h-[85vh] rounded-2xl bg-slate-900 border border-slate-700 p-6 text-slate-100 shadow-2xl relative text-right flex flex-col">
              <button
                onClick={() => setViewingLeafBatch(null)}
                className="absolute left-4 top-4 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 mb-4 shrink-0">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-extrabold text-white">
                      تتبع أوراق الشيتات — {batchOrdinalTitle}
                    </h3>
                    <span className="text-xs px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-400 font-bold">
                      فئة {viewingLeafBatch.category} ريال
                    </span>
                    <span className="text-xs text-slate-400 font-mono">({viewingLeafBatch.id})</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    ترقيم أوراق الشيتات ورقياً ورقمياً من 1 إلى {viewingLeafBatch.sheetsCount} وتتبع مسارها
                  </p>
                </div>
              </div>

              {/* Leaves Grid List */}
              <div className="flex-1 overflow-y-auto pr-1 space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {sheets
                    .filter((s) => s.batchId === viewingLeafBatch.id && isValidBatchSheet(s, viewingLeafBatch))
                    .map((sheet) => (
                      <div
                        key={sheet.sheetCode}
                        className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 transition flex items-center justify-between"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/25 font-bold font-mono text-xs flex items-center justify-center">
                              شيت #{sheet.leafNumber}
                            </span>
                            <span className="font-mono font-bold text-xs text-white">
                              {sheet.sheetCode}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 mt-1 block">
                            {batchOrdinalTitle} • {sheet.cardsCount} كرت
                          </span>
                        </div>

                        <div className="text-left">
                          {renderSheetStatusBadge(sheet.status, sheet.assignedOutletName)}
                          {sheet.deliveryId && (
                            <span className="text-[9px] text-purple-400/80 block mt-0.5 font-mono">
                              {sheet.deliveryId}
                            </span>
                          )}
                          {sheet.transferId && !sheet.deliveryId && (
                            <span className="text-[9px] text-emerald-400/80 block mt-0.5 font-mono">
                              {sheet.transferId}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 mt-4 shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
                <span>إجمالي شيتات هذه الدفعة: {viewingLeafBatch.sheetsCount} ورقة</span>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => {
                      setSelectedBatchForSheets(viewingLeafBatch.id);
                      setViewingLeafBatch(null);
                      setViewMode('sheets_table');
                    }}
                    className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 font-bold border border-amber-500/30 transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Table className="w-3.5 h-3.5" />
                    <span>عرض بالجدول التفصيلي</span>
                  </button>
                  <button
                    onClick={() => setViewingLeafBatch(null)}
                    className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition cursor-pointer"
                  >
                    إغلاق
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
      {/* Modal: Delete Batch Confirmation */}
      {deletingBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-rose-500/40 p-6 text-slate-100 shadow-2xl relative text-right">
            <button
              onClick={() => setDeletingBatch(null)}
              className="absolute left-4 top-4 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold mb-4 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="text-base font-extrabold text-white text-center mb-1">
              تأكيد حذف دفعة الطباعة
            </h3>
            <p className="text-xs text-slate-400 text-center mb-4 font-mono font-bold">
              {deletingBatch.id} • فئة {deletingBatch.category} ريال • دفعة #{deletingBatch.batchNumber}
            </p>

            {deleteBatchError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{deleteBatchError}</span>
              </div>
            )}

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs leading-relaxed text-slate-300 mb-5">
              <p>
                هل أنت متأكد من حذف دفعة الطباعة هذه بالكامل؟ سيتم إلغاء جميع شيتاتها ({deletingBatch.sheetsCount} شيت) من مخزن المسؤول.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDeleteBatchConfirm}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs transition cursor-pointer shadow-md"
              >
                تأكيد حذف الدفعة وإلغاء شيتاتها
              </button>
              <button
                type="button"
                onClick={() => setDeletingBatch(null)}
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
