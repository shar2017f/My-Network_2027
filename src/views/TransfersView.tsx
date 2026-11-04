import React, { useState, useMemo } from 'react';
import {
  ArrowLeftRight,
  Plus,
  Printer,
  Calendar,
  CheckCircle,
  X,
  Search,
  Layers,
  FileText,
  Shield,
  UserCheck,
  Check,
  Edit3,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { CardCategory, CustodyTransfer } from '../types';
import { CARD_CATEGORIES_CONFIG } from '../constants/cardConfig';
import {
  formatSheetWithBatch,
  formatSheetBadge,
  formatSheetListGrouped,
  getBatchOrdinalName,
  getCategoryBatchNumber,
  getBatchFullDisplayName,
  getArabicMonthName,
  ORDINAL_ARABIC,
} from '../utils/batchNaming';

export const TransfersView: React.FC = () => {
  const { currentRole, sheets, batches, transfers, createTransfer, updateTransfer, deleteTransfer } = useApp();

  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [selectedTransferForPrint, setSelectedTransferForPrint] = useState<CustodyTransfer | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Edit Transfer State
  const [editingTransfer, setEditingTransfer] = useState<CustodyTransfer | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editCardsCount, setEditCardsCount] = useState<number>(20);
  const [editSheetsCount, setEditSheetsCount] = useState<number>(1);
  const [editWholesalePrice, setEditWholesalePrice] = useState<number>(0);
  const [editDate, setEditDate] = useState<string>('');
  const [editNotes, setEditNotes] = useState<string>('');
  const [editError, setEditError] = useState<string>('');
  const [editSuccess, setEditSuccess] = useState<string>('');

  // Delete Transfer State
  const [deletingTransfer, setDeletingTransfer] = useState<CustodyTransfer | null>(null);
  const [deleteError, setDeleteError] = useState<string>('');

  const openEditTransfer = (tr: CustodyTransfer) => {
    const config = CARD_CATEGORIES_CONFIG[tr.category];
    const totalC = tr.cardsCount || tr.totalCards || Math.round((tr.sheetsCount || 0) * config.defaultCardsPerSheet);
    const cardPrice = config.defaultWholesaleCardPrice || Math.round(config.defaultWholesaleSheetPrice / config.defaultCardsPerSheet);
    
    setEditingTransfer(tr);
    setEditCardsCount(totalC);
    setEditSheetsCount(tr.sheetsCount || Number((totalC / config.defaultCardsPerSheet).toFixed(2)));
    setEditWholesalePrice(tr.transferType === 'cards' ? cardPrice : config.defaultWholesaleSheetPrice);
    setEditDate(tr.date || '');
    setEditNotes(tr.notes || '');
    setEditError('');
    setEditSuccess('');
    setIsEditModalOpen(true);
  };

  const handleUpdateTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTransfer) return;
    setEditError('');
    setEditSuccess('');

    const config = CARD_CATEGORIES_CONFIG[editingTransfer.category];
    const isCard = editingTransfer.transferType === 'cards' || (editingTransfer.cardsCount && editingTransfer.cardsCount > 0);

    const result = updateTransfer(editingTransfer.id, {
      cardsCount: isCard ? Number(editCardsCount) : undefined,
      sheetsCount: isCard ? Number((Number(editCardsCount) / config.defaultCardsPerSheet).toFixed(2)) : Number(editSheetsCount),
      wholesalePrice: Number(editWholesalePrice),
      date: editDate,
      notes: editNotes,
    });

    if (result.success) {
      setEditSuccess('تم تعديل سند العهدة والمطابقة المحاسبية بنجاح');
      setTimeout(() => {
        setIsEditModalOpen(false);
        setEditingTransfer(null);
      }, 1000);
    } else {
      setEditError(result.message || 'حدث خطأ أثناء تعديل السند');
    }
  };

  const handleDeleteTransferConfirm = () => {
    if (!deletingTransfer) return;
    setDeleteError('');
    const res = deleteTransfer(deletingTransfer.id);
    if (res.success) {
      setDeletingTransfer(null);
    } else {
      setDeleteError(res.message || 'تعذر حذف سند التحويل');
    }
  };

  // Form State
  const [selectedCategory, setSelectedCategory] = useState<CardCategory>('200');
  const [selectedBatchId, setSelectedBatchId] = useState<string>('all');
  const [selectedSheetCodes, setSelectedSheetCodes] = useState<string[]>([]);
  const [selectedLeafNumbers, setSelectedLeafNumbers] = useState<number[]>([]);
  const [notes, setNotes] = useState('');
  const [transferMode, setTransferMode] = useState<'sheets' | 'cards'>('sheets');
  const [transferCardsCount, setTransferCardsCount] = useState<number>(20);

  // Batches available for the selected category that have sheets in admin custody
  const availableBatches = useMemo(() => {
    const adminSheets = sheets.filter(
      (s) => {
        if (s.category !== selectedCategory || s.status !== 'admin_custody') return false;
        const leafNum = s.leafNumber || parseInt(s.sheetCode?.match(/S(\d+)/)?.[1] || '0', 10);
        if (s.batchId === 'BATCH-2026-005' && leafNum > 15) return false;
        if (s.sheetCode?.startsWith('QZ-500-B5-S') && (leafNum > 15 || parseInt(s.sheetCode.replace('QZ-500-B5-S', ''), 10) > 15)) return false;
        if (s.batchId === 'BATCH-2026-004' && leafNum > 10) return false;
        if (s.sheetCode?.startsWith('QZ-200-B4-S') && (leafNum > 10 || parseInt(s.sheetCode.replace('QZ-200-B4-S', ''), 10) > 10)) return false;
        const b = batches.find((x) => x.id === s.batchId);
        if (b && typeof b.sheetsCount === 'number' && leafNum > b.sheetsCount) return false;
        return true;
      }
    );
    const map = new Map<string, { batchId: string; batchNumber: number; categoryBatchNumber: number; batchName: string; count: number; cardsCount: number; date: string }>();
    const defCards = CARD_CATEGORIES_CONFIG[selectedCategory].defaultCardsPerSheet;
    adminSheets.forEach((s) => {
      const b = batches.find((x) => x.id === s.batchId);
      const catBNum = b ? getCategoryBatchNumber(b, batches) : (s.categoryBatchNumber || 1);
      const cCount = s.cardsCount || defCards;
      if (!map.has(s.batchId)) {
        map.set(s.batchId, {
          batchId: s.batchId,
          batchNumber: b?.batchNumber || s.batchNumber || 1,
          categoryBatchNumber: catBNum,
          batchName: b ? getBatchFullDisplayName(b, batches) : getBatchOrdinalName(catBNum),
          count: 0,
          cardsCount: 0,
          date: b?.date || s.timestamp?.split('T')[0] || '',
        });
      }
      const item = map.get(s.batchId)!;
      item.cardsCount += cCount;
      item.count = Number((item.cardsCount / defCards).toFixed(2));
    });
    return Array.from(map.values()).sort((a, b) => a.categoryBatchNumber - b.categoryBatchNumber);
  }, [sheets, batches, selectedCategory]);

  // Available sheets in Admin Custody for the selected category (optionally filtered by batch)
  const availableAdminSheets = useMemo(() => {
    return sheets.filter(
      (s) => {
        if (s.category !== selectedCategory || s.status !== 'admin_custody') return false;
        const leafNum = s.leafNumber || parseInt(s.sheetCode?.match(/S(\d+)/)?.[1] || '0', 10);
        if (s.batchId === 'BATCH-2026-005' && leafNum > 15) return false;
        if (s.sheetCode?.startsWith('QZ-500-B5-S') && (leafNum > 15 || parseInt(s.sheetCode.replace('QZ-500-B5-S', ''), 10) > 15)) return false;
        if (s.batchId === 'BATCH-2026-004' && leafNum > 10) return false;
        if (s.sheetCode?.startsWith('QZ-200-B4-S') && (leafNum > 10 || parseInt(s.sheetCode.replace('QZ-200-B4-S', ''), 10) > 10)) return false;
        const b = batches.find((x) => x.id === s.batchId);
        if (b && typeof b.sheetsCount === 'number' && leafNum > b.sheetsCount) return false;
        return selectedBatchId === 'all' || s.batchId === selectedBatchId;
      }
    );
  }, [sheets, batches, selectedCategory, selectedBatchId]);

  // Total available cards in admin custody for category
  const availableAdminCardsCount = useMemo(() => {
    return availableAdminSheets.reduce((sum, s) => sum + (s.cardsCount || CARD_CATEGORIES_CONFIG[selectedCategory].defaultCardsPerSheet), 0);
  }, [availableAdminSheets, selectedCategory]);

  // Detailed summary of all batches for the selected category (showing what is in admin custody vs transferred vs delivered)
  const categoryBatchesSummary = useMemo(() => {
    const catBatches = batches.filter((b) => b.category === selectedCategory);
    return catBatches
      .map((b) => {
        const catBNum = getCategoryBatchNumber(b, batches);
        const allBatchSheets = sheets.filter((s) => s.batchId === b.id);
        const inAdminCustody = allBatchSheets.filter((s) => s.status === 'admin_custody');
        const inDistributorCustody = allBatchSheets.filter((s) => s.status === 'distributor_custody');
        const deliveredToOutlets = allBatchSheets.filter((s) => s.status === 'delivered_outlet');
        
        const defaultPerSheet = CARD_CATEGORIES_CONFIG[selectedCategory].defaultCardsPerSheet;
        const adminCardsCount = inAdminCustody.reduce(
          (sum, s) => sum + (s.cardsCount || defaultPerSheet),
          0
        );
        const distributorCardsCount = inDistributorCustody.reduce(
          (sum, s) => sum + (s.cardsCount || defaultPerSheet),
          0
        );
        const deliveredCardsCount = deliveredToOutlets.reduce(
          (sum, s) => sum + (s.cardsCount || defaultPerSheet),
          0
        );
        
        const adminSheetsCount = Number((adminCardsCount / defaultPerSheet).toFixed(2));
        const distributorSheetsCount = Number((distributorCardsCount / defaultPerSheet).toFixed(2));
        const deliveredSheetsCount = Number((deliveredCardsCount / defaultPerSheet).toFixed(2));
        
        const isExhausted = adminCardsCount === 0;

        return {
          batchId: b.id,
          batchNumber: b.batchNumber,
          categoryBatchNumber: catBNum,
          batchName: getBatchFullDisplayName(b, batches),
          date: b.date,
          accountingMonth: b.accountingMonth,
          totalPrintedSheets: b.sheetsCount,
          totalPrintedCards: b.totalCards,
          adminSheetsCount,
          adminCardsCount,
          distributorSheetsCount,
          distributorCardsCount,
          deliveredSheetsCount,
          deliveredCardsCount,
          isExhausted,
          leavesInAdmin: inAdminCustody.map((s) => s.leafNumber).sort((a, b) => a - b),
        };
      })
      .sort((a, b) => a.categoryBatchNumber - b.categoryBatchNumber);
  }, [batches, sheets, selectedCategory]);

  const handleToggleSheet = (sheetCode: string, leafNum: number) => {
    if (selectedSheetCodes.includes(sheetCode)) {
      setSelectedSheetCodes(selectedSheetCodes.filter((c) => c !== sheetCode));
      setSelectedLeafNumbers(selectedLeafNumbers.filter((n) => n !== leafNum));
    } else {
      setSelectedSheetCodes([...selectedSheetCodes, sheetCode]);
      setSelectedLeafNumbers([...selectedLeafNumbers, leafNum]);
    }
  };

  const handleSelectAllAvailable = () => {
    if (selectedSheetCodes.length === availableAdminSheets.length) {
      setSelectedSheetCodes([]);
      setSelectedLeafNumbers([]);
    } else {
      setSelectedSheetCodes(availableAdminSheets.map((s) => s.sheetCode));
      setSelectedLeafNumbers(availableAdminSheets.map((s) => s.leafNumber));
    }
  };

  const handleCategorySwitch = (cat: CardCategory) => {
    setSelectedCategory(cat);
    setSelectedBatchId('all');
    setSelectedSheetCodes([]);
    setSelectedLeafNumbers([]);
    const config = CARD_CATEGORIES_CONFIG[cat];
    if (config.allowCardUnits) {
      setTransferMode('cards');
      setTransferCardsCount(20);
    } else {
      setTransferMode('sheets');
    }
  };

  const handleSubmitTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (availableAdminCardsCount === 0) return;
    const config = CARD_CATEGORIES_CONFIG[selectedCategory];

    if (transferMode === 'cards') {
      if (transferCardsCount <= 0 || transferCardsCount > availableAdminCardsCount) return;
      const effectiveSheets = Number((transferCardsCount / config.defaultCardsPerSheet).toFixed(2));
      createTransfer({
        category: selectedCategory,
        batchId: selectedBatchId !== 'all' ? selectedBatchId : undefined,
        sheetsCount: effectiveSheets,
        cardsCount: transferCardsCount,
        transferType: 'cards',
        notes,
      });
    } else {
      if (selectedSheetCodes.length === 0) return;
      createTransfer({
        category: selectedCategory,
        batchId: selectedBatchId !== 'all' ? selectedBatchId : undefined,
        sheetsCount: selectedSheetCodes.length,
        sheetCodes: selectedSheetCodes,
        leafNumbers: selectedLeafNumbers,
        transferType: 'sheets',
        notes,
      });
    }

    setIsNewModalOpen(false);
    setSelectedSheetCodes([]);
    setSelectedLeafNumbers([]);
    setSelectedBatchId('all');
    setNotes('');
  };

  const filteredTransfers = transfers.filter(
    (t) =>
      t.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.category.includes(searchQuery) ||
      t.notes?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 p-5 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-extrabold text-white">سندات تحويل العهد (TR)</h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
              {transfers.length} سندات تحويل
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            تحويل كروت الشيتات من عهدة المسؤول إلى عهدة الموزع الميداني وتتبع أرقام الأوراق
          </p>
        </div>

        {currentRole === 'admin' ? (
          <button
            onClick={() => setIsNewModalOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 transition cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>إنشاء سند تحويل عهدة (TR)</span>
          </button>
        ) : (
          <div className="text-xs text-slate-400 bg-slate-800/80 px-3 py-2 rounded-xl border border-slate-700">
            إنشاء سندات التحويل محصور بالمسؤول
          </div>
        )}
      </div>

      {/* Search Bar */}
      <div className="bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="البحث برقم السند (TR-2026-XXXX) أو الفئة أو الملاحظات..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-9 pl-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Empty State */}
      {filteredTransfers.length === 0 ? (
        <div className="p-12 text-center bg-slate-900 rounded-2xl border border-slate-800">
          <ArrowLeftRight className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white mb-1">لا توجد سندات تحويل سابقة</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto mb-5 leading-relaxed">
            سجل التحويلات فارغ تماماً. عندما يقوم المسؤول بطباعة كروت، يمكنه تحويل شيتات إلى الموزع هنا لتبدأ حركة التوزيع الميداني.
          </p>
          {currentRole === 'admin' && (
            <button
              onClick={() => setIsNewModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              إنشاء أول سند تحويل عهدة
            </button>
          )}
        </div>
      ) : (
        /* Transfers List */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTransfers.map((tr) => {
            const config = CARD_CATEGORIES_CONFIG[tr.category];

            return (
              <div
                key={tr.id}
                className="bg-slate-900 rounded-2xl border border-slate-800 p-5 space-y-4 hover:border-slate-700 transition"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                      <ArrowLeftRight className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-white">{tr.id}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-400 font-bold">
                          فئة {tr.category}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        <span>{tr.date}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {currentRole === 'admin' && (
                      <>
                        <button
                          onClick={() => openEditTransfer(tr)}
                          className="p-2 rounded-xl bg-amber-500/15 hover:bg-amber-500 text-amber-300 hover:text-slate-950 transition cursor-pointer border border-amber-500/30 flex items-center gap-1 text-xs font-bold"
                          title="تعديل سند العهدة ومطابقة الكميات"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">تعديل</span>
                        </button>
                        <button
                          onClick={() => {
                            setDeletingTransfer(tr);
                            setDeleteError('');
                          }}
                          className="p-2 rounded-xl bg-rose-500/15 hover:bg-rose-500 text-rose-300 hover:text-white transition cursor-pointer border border-rose-500/30 text-xs font-bold"
                          title="حذف سند العهدة وإرجاع الكروت للمسؤول"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => setSelectedTransferForPrint(tr)}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white transition cursor-pointer"
                      title="طباعة السند"
                    >
                      <Printer className="w-4 h-4 text-emerald-400" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                  <div>
                    <span className="text-slate-400 text-[10px]">الكمية المحولة:</span>
                    <div className="font-bold text-white mt-0.5 flex items-center gap-1.5">
                      {tr.transferType === 'cards' ? (
                        <>
                          <span className="text-amber-400 font-extrabold">{tr.cardsCount || tr.totalCards} كرت</span>
                          <span className="text-[10px] text-slate-400">({tr.sheetsCount} شيت)</span>
                        </>
                      ) : (
                        <>
                          <span>{tr.sheetsCount} شيت</span>
                          <span className="text-[10px] text-slate-400">({tr.totalCards} كرت)</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px]">القيمة الإجمالية للجملة:</span>
                    <div className="font-bold text-emerald-400 mt-0.5">
                      {tr.totalWholesaleValue.toLocaleString()} ر.ي
                    </div>
                  </div>
                </div>

                {/* Leaf / Card Slice chips */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] text-slate-400">
                      {tr.transferType === 'cards' ? 'الكروت والشرائح المحولة:' : 'أرقام الأوراق المحولة:'}
                    </span>
                    {tr.transferType === 'cards' && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30">
                        تحويل جزئي بالكرت
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
                    {tr.sheetCodes && tr.sheetCodes.length > 0 ? (
                      tr.sheetCodes.map((code) => {
                        const s = sheets.find((x) => x.sheetCode === code);
                        const isCardSlice = code.includes('-P') || code.includes('-C');
                        return (
                          <span
                            key={code}
                            className={`text-[10px] px-2 py-0.5 rounded-md font-mono font-bold ${
                              isCardSlice
                                ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                            title={code}
                          >
                            {isCardSlice
                              ? `شريحة ${code.split('-').pop()?.replace('P', 'كروت-') || 'كروت'}`
                              : s ? formatSheetBadge(s, undefined, batches) : `شيت #${code.match(/S(\d+)/)?.[1] || '1'}`}
                          </span>
                        );
                      })
                    ) : (
                      tr.leafNumbers.map((num) => (
                        <span
                          key={num}
                          className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-mono"
                        >
                          #{num}
                        </span>
                      ))
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                  <div className="flex items-center gap-1">
                    <Shield className="w-3 h-3 text-amber-400" />
                    <span>المسلّم: {tr.fromUser}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <UserCheck className="w-3 h-3 text-emerald-400" />
                    <span>المستلم: {tr.toUser}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Create Transfer */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-700 p-6 text-slate-100 shadow-2xl relative text-right flex flex-col max-h-[90vh]">
            <button
              onClick={() => setIsNewModalOpen(false)}
              className="absolute left-4 top-4 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-4 shrink-0">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                <ArrowLeftRight className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white">إنشاء سند تحويل عهدة (TR)</h3>
                <p className="text-xs text-slate-400">من المسؤول إلى الموزع الميداني</p>
              </div>
            </div>

            <form onSubmit={handleSubmitTransfer} className="space-y-4 overflow-y-auto pr-1 flex-1">
              {/* Category Picker with Custody Stock Badges */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">اختر فئة الكرت</label>
                <div className="grid grid-cols-3 gap-2">
                  {Object.keys(CARD_CATEGORIES_CONFIG).map((cat) => {
                    const inAdminSheets = sheets.filter(
                      (s) => s.category === cat && s.status === 'admin_custody'
                    );
                    const perSheet = CARD_CATEGORIES_CONFIG[cat as CardCategory].defaultCardsPerSheet;
                    const inAdminCards = inAdminSheets.reduce((sum, s) => sum + (s.cardsCount || perSheet), 0);
                    const inAdminSheetsCount = Number((inAdminCards / perSheet).toFixed(2));
                    const isExhausted = inAdminCards === 0;

                    return (
                      <button
                        type="button"
                        key={cat}
                        onClick={() => handleCategorySwitch(cat as CardCategory)}
                        className={`p-2.5 rounded-xl text-xs font-bold border transition text-center cursor-pointer ${
                          selectedCategory === cat
                            ? isExhausted
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500 shadow-md'
                              : 'bg-emerald-500 text-slate-950 border-emerald-500 shadow-md'
                            : isExhausted
                            ? 'bg-slate-900 border-slate-800 text-rose-400/80 hover:border-slate-700'
                            : 'bg-slate-800 border-slate-700 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-center gap-1">
                          <span>فئة {cat}</span>
                          {isExhausted && <span className="text-[10px] text-rose-400">🚨</span>}
                        </div>
                        <div className="text-[10px] mt-0.5 font-normal">
                          {isExhausted ? (
                            <span className="text-rose-400 font-bold">نافدة بحوزتك (0)</span>
                          ) : (
                            <span className="text-emerald-400 font-bold">بحوزتك: {inAdminSheetsCount} شيت ({inAdminCards} كرت)</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Batches & Leaves in Admin Custody Breakdown (كشف تفصيلي لما بحوزة المسؤول من كل دفعة) */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold text-slate-200 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-emerald-400" />
                    <span>موقف دفعات الطباعة بحوزتك (فئة {selectedCategory} ريال):</span>
                  </label>
                  <span className="text-[11px] font-bold text-slate-400">
                    إجمالي بحوزتي: <span className="text-emerald-400 font-bold">{Number((availableAdminCardsCount / CARD_CATEGORIES_CONFIG[selectedCategory].defaultCardsPerSheet).toFixed(2))} شيت ({availableAdminCardsCount} كرت)</span>
                  </span>
                </div>

                {categoryBatchesSummary.length === 0 ? (
                  <div className="p-3 text-center rounded-lg bg-slate-900 text-slate-400 text-xs">
                    لم يتم تسجيل أي دفعات مطبوعة لهذه الفئة بعد.
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {categoryBatchesSummary.map((b) => {
                      const isSelected = selectedBatchId === b.batchId;
                      return (
                        <div
                          key={b.batchId}
                          onClick={() => {
                            if (!b.isExhausted) {
                              setSelectedBatchId(selectedBatchId === b.batchId ? 'all' : b.batchId);
                              setSelectedSheetCodes([]);
                              setSelectedLeafNumbers([]);
                            }
                          }}
                          className={`p-2.5 rounded-xl border text-xs transition cursor-pointer ${
                            b.isExhausted
                              ? 'bg-rose-950/20 border-rose-500/25 text-slate-400 opacity-80'
                              : isSelected
                              ? 'bg-emerald-500/20 border-emerald-500/60 text-white shadow-sm'
                              : 'bg-slate-900/90 border-slate-800 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between font-bold mb-1">
                            <div className="flex items-center gap-1.5">
                              <span className={isSelected ? 'text-emerald-400' : 'text-white'}>
                                {b.batchName} ({b.batchId})
                              </span>
                              <span className="text-[10px] text-slate-400 font-normal">
                                • تاريخ {b.date}
                              </span>
                            </div>
                            <div>
                              {b.isExhausted ? (
                                <span className="text-[10px] px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30">
                                  نافدة بالكامل من بحوزتك 🚨 (0 متبقي)
                                </span>
                              ) : (
                                <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                                  بحوزتك: {b.adminSheetsCount} شيت ({b.adminCardsCount} كرت)
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
                            <span>إجمالي المطبوع: {b.totalPrintedSheets} شيت ({b.totalPrintedCards} كرت)</span>
                            <span>بعهدة الموزع: {b.distributorSheetsCount} شيت ({b.distributorCardsCount} كرت)</span>
                            <span>مورّدة للمنافذ: {b.deliveredSheetsCount} شيت ({b.deliveredCardsCount} كرت)</span>
                          </div>

                          {!b.isExhausted && b.leavesInAdmin.length > 0 && (
                            <div className="mt-1 text-[10px] text-slate-400 flex items-center gap-1 overflow-hidden">
                              <span className="shrink-0 text-slate-500">أوراق بحوزتك للتحويل:</span>
                              <span className="text-emerald-300 font-mono font-bold truncate">
                                {b.leavesInAdmin.map((n) => `#${n}`).join('، ')}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Red Warning Banner when Category stock in Admin Custody is completely exhausted */}
              {availableAdminCardsCount === 0 && (
                <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-200 text-xs space-y-1.5 animate-in fade-in">
                  <div className="flex items-center gap-2 font-bold text-rose-400 text-sm">
                    <span className="text-base">⛔</span>
                    <span>تنبيه: الكمية نافدة تماماً من بحوزتك!</span>
                  </div>
                  <p className="leading-relaxed">
                    لا يتوفر أي رصيد من فئة {selectedCategory} ريال في مخزن المسؤول (المتوفر: 0 شيت / 0 كرت).
                    لقد تم تحويل جميع الشيتات المطبوعة سابقاً إلى عهدة الموزع أو توريدها للمنافذ.
                  </p>
                  <p className="text-[11px] text-rose-300 font-extrabold">
                    ⚠️ النظام يمنع إنشاء سند تحويل عهدة لعدم توفر كمية. يرجى أولاً التوجه لشاشة "دفعات الطباعة" وطباعة دفعة جديدة.
                  </p>
                </div>
              )}

              {/* Unit Mode Selector (Especially for 3000, 5000, 10000) */}
              {CARD_CATEGORIES_CONFIG[selectedCategory].allowCardUnits && (
                <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-purple-300">
                      طريقة تحويل العهدة (فئة {selectedCategory} ريال):
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold">
                      ميزة التحويل بالكرت
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setTransferMode('cards')}
                      className={`p-2 rounded-xl text-xs font-bold border transition text-center cursor-pointer ${
                        transferMode === 'cards'
                          ? 'bg-purple-600 text-white border-purple-400 shadow-md'
                          : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-600'
                      }`}
                    >
                      بعدد الكروت (مثلاً 20 كرت) ⚡
                    </button>
                    <button
                      type="button"
                      onClick={() => setTransferMode('sheets')}
                      className={`p-2 rounded-xl text-xs font-bold border transition text-center cursor-pointer ${
                        transferMode === 'sheets'
                          ? 'bg-purple-600 text-white border-purple-400 shadow-md'
                          : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-600'
                      }`}
                    >
                      بالشيت الكامل (60 كرت) 📄
                    </button>
                  </div>
                </div>
              )}

              {/* Batch Filter (if multiple batches exist for category) */}
              {availableBatches.length > 1 && (
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    تصفية حسب دفعة الطباعة:
                  </label>
                  <select
                    value={selectedBatchId}
                    onChange={(e) => {
                      setSelectedBatchId(e.target.value);
                      setSelectedSheetCodes([]);
                      setSelectedLeafNumbers([]);
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-emerald-500 font-bold"
                  >
                    <option value="all">
                      كل دفعات فئة {selectedCategory} المتاحة ({availableAdminSheets.length} شيت - {availableAdminCardsCount} كرت)
                    </option>
                    {availableBatches.map((b) => (
                      <option key={b.batchId} value={b.batchId}>
                        {b.batchName} ({b.date}) - المتبقي: {b.count} شيت
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Transfer Mode: Cards vs Sheets */}
              {transferMode === 'cards' ? (
                <div className="space-y-3 p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-300">
                      حدد عدد الكروت المطلوب تحويلها للموزع:
                    </label>
                    <span className="text-[11px] text-slate-400">
                      رصيد المسؤول المتاح: <span className="font-bold text-emerald-400">{availableAdminCardsCount} كرت</span>
                    </span>
                  </div>

                  {/* Quick Card Count Presets */}
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { count: 15, label: '15 كرت (ربع شيت)' },
                      { count: 20, label: '20 كرت (ثلث شيت)' },
                      { count: 30, label: '30 كرت (نصف شيت)' },
                      { count: 60, label: '60 كرت (شيت كامل)' },
                    ].map((preset) => (
                      <button
                        type="button"
                        key={preset.count}
                        onClick={() => setTransferCardsCount(preset.count)}
                        className={`p-2 rounded-lg text-xs font-bold border text-center transition cursor-pointer ${
                          transferCardsCount === preset.count
                            ? 'bg-emerald-500 text-slate-950 border-emerald-500 shadow-sm'
                            : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-600'
                        }`}
                      >
                        <div className="text-[11px]">{preset.count} كرت</div>
                        <div className="text-[9px] opacity-80">{preset.label.split(' ')[1]}</div>
                      </button>
                    ))}
                  </div>

                  {/* Custom Input */}
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      أو أدخل عدد الكروت يدوياً:
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        max={availableAdminCardsCount > 0 ? availableAdminCardsCount : undefined}
                        value={transferCardsCount}
                        onChange={(e) => setTransferCardsCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono font-bold focus:outline-hidden focus:border-emerald-500"
                        placeholder="عدد الكروت..."
                      />
                      <span className="text-xs font-bold text-slate-300 shrink-0">كرت</span>
                    </div>
                  </div>

                  {/* Calculated summary for card mode */}
                  {(() => {
                    const cfg = CARD_CATEGORIES_CONFIG[selectedCategory];
                    const unitCardWholesale = cfg.defaultWholesaleCardPrice || Math.round(cfg.defaultWholesaleSheetPrice / cfg.defaultCardsPerSheet);
                    const totalCardWholesale = transferCardsCount * unitCardWholesale;
                    const effectiveSheets = Number((transferCardsCount / cfg.defaultCardsPerSheet).toFixed(2));
                    const isExceeding = availableAdminCardsCount > 0 && transferCardsCount > availableAdminCardsCount;

                    return (
                      <div className="p-3 rounded-xl bg-slate-900 border border-emerald-500/30 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 text-[11px]">الكمية المحولة:</span>
                          <span className="font-extrabold text-white">
                            {transferCardsCount} كرت ({effectiveSheets} شيت)
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 text-[11px]">سعر الكرت جملة:</span>
                          <span className="font-bold text-slate-200">
                            {unitCardWholesale.toLocaleString()} ر.ي / كرت
                          </span>
                        </div>
                        <div className="flex items-center justify-between border-t border-slate-800 pt-1.5">
                          <span className="text-slate-300 font-bold">إجمالي قيمة العهدة:</span>
                          <span className="font-extrabold text-emerald-400 text-sm">
                            {totalCardWholesale.toLocaleString()} ر.ي
                          </span>
                        </div>
                        {isExceeding && (
                          <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[11px] font-bold">
                            ⚠️ تنبيه: عدد الكروت المطلوب ({transferCardsCount}) يتجاوز رصيد مخزن المسؤول المتاح ({availableAdminCardsCount} كرت)!
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              ) : (
                /* Available Leaves Selection (Sheets Mode) */
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-slate-300">
                      الشيتات المتاحة بعهدة المسؤول ({availableAdminSheets.length})
                    </label>
                    {availableAdminSheets.length > 0 && (
                      <button
                        type="button"
                        onClick={handleSelectAllAvailable}
                        className="text-xs text-emerald-400 hover:text-emerald-300 font-bold cursor-pointer"
                      >
                        {selectedSheetCodes.length === availableAdminSheets.length && availableAdminSheets.length > 0
                          ? 'إلغاء تحديد الكل'
                          : 'تحديد الكل'}
                      </button>
                    )}
                  </div>

                  {availableAdminSheets.length === 0 ? (
                    <div className="p-6 text-center rounded-xl bg-slate-950 border border-slate-800 text-slate-400 text-xs">
                      لا توجد شيتات متوفرة في عهدة المسؤول من هذه الفئة. يرجى طباعة دفعة جديدة أولاً!
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-2 bg-slate-950 rounded-xl border border-slate-800">
                      {availableAdminSheets.map((sheet) => {
                        const isSelected = selectedSheetCodes.includes(sheet.sheetCode);
                        const batchInfo = batches.find((b) => b.id === sheet.batchId);
                        const catBNum = sheet.categoryBatchNumber || (batchInfo ? getCategoryBatchNumber(batchInfo, batches) : 1);
                        const ordinal = ORDINAL_ARABIC[catBNum] || `${catBNum}`;

                        return (
                          <button
                            type="button"
                            key={sheet.sheetCode}
                            onClick={() => handleToggleSheet(sheet.sheetCode, sheet.leafNumber)}
                            title={`${formatSheetWithBatch(sheet, batchInfo, batches)} (${sheet.sheetCode})`}
                            className={`p-2 rounded-lg text-xs font-mono font-bold flex items-center justify-between border transition cursor-pointer ${
                              isSelected
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                                : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:border-slate-600'
                            }`}
                          >
                            <div className="flex flex-col items-start">
                              <span>شيت #{sheet.leafNumber}</span>
                              <span className="text-[10px] text-slate-400 font-sans font-normal">
                                ({ordinal})
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-bold">
                              {isSelected ? '✓' : '+'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Selected Summary for Sheets */}
                  {selectedSheetCodes.length > 0 && (
                    <div className="p-3 mt-3 rounded-xl bg-slate-950 border border-emerald-500/30 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-slate-400 text-[10px] block">الشيتات المحددة للتحويل:</span>
                          <span className="font-extrabold text-white">
                            {selectedSheetCodes.length} شيت (
                            {selectedSheetCodes.length * CARD_CATEGORIES_CONFIG[selectedCategory].defaultCardsPerSheet} كرت)
                          </span>
                        </div>
                        <div className="text-left">
                          <span className="text-slate-400 text-[10px] block">إجمالي قيمة العهدة:</span>
                          <span className="font-extrabold text-emerald-400 text-sm">
                            {(
                              selectedSheetCodes.length *
                              CARD_CATEGORIES_CONFIG[selectedCategory].defaultWholesaleSheetPrice
                            ).toLocaleString()}{' '}
                            ر.ي
                          </span>
                        </div>
                      </div>
                      <div className="text-[11px] text-emerald-300/90 font-mono bg-emerald-950/40 p-2 rounded-lg border border-emerald-500/20">
                        {formatSheetListGrouped(selectedSheetCodes, sheets, batches)}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">ملاحظات التحويل</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="مثال: تسليم مباشر باليد، عهدة الأسبوع الأول..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="flex-1 min-h-[44px] py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold text-xs transition cursor-pointer active:scale-95"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={
                    availableAdminCardsCount === 0 ||
                    (transferMode === 'cards'
                      ? transferCardsCount <= 0 || transferCardsCount > availableAdminCardsCount
                      : selectedSheetCodes.length === 0)
                  }
                  className="flex-1 min-h-[44px] py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-extrabold text-xs shadow-md transition cursor-pointer active:scale-95"
                >
                  {availableAdminCardsCount === 0
                    ? '⛔ الرصيد نافد من بحوزتك (غير متاح)'
                    : 'إصدار سند التحويل'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Voucher Receipt Modal */}
      {selectedTransferForPrint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white text-slate-900 p-6 shadow-2xl relative text-right">
            <button
              onClick={() => setSelectedTransferForPrint(null)}
              className="absolute left-4 top-4 p-1 rounded-lg text-slate-500 hover:text-black hover:bg-slate-100 no-print"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Receipt Content */}
            <div className="border-b-2 border-dashed border-slate-300 pb-4 mb-4 text-center">
              <h2 className="text-xl font-black text-slate-900">شبكة قعزان نت</h2>
              <p className="text-xs text-slate-600">سند تحويل عهدة كروت إنترنت (رسمي)</p>
              <div className="inline-block mt-2 px-3 py-1 bg-slate-100 rounded-full font-mono font-bold text-sm text-slate-800">
                {selectedTransferForPrint.id}
              </div>
            </div>

            <div className="space-y-2 text-xs mb-4 text-slate-700">
              <div className="flex justify-between">
                <span className="text-slate-500">التاريخ:</span>
                <span className="font-bold">{selectedTransferForPrint.date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">فئة الكروت:</span>
                <span className="font-bold">فئة {selectedTransferForPrint.category} ريال</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">نوع السند:</span>
                <span className="font-bold">
                  {selectedTransferForPrint.transferType === 'cards' ? 'تحويل جزئي بالكرت' : 'تحويل شيتات كاملة'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">الكمية المسلمة:</span>
                <span className="font-bold">
                  {selectedTransferForPrint.transferType === 'cards'
                    ? `${selectedTransferForPrint.cardsCount || selectedTransferForPrint.totalCards} كرت (${selectedTransferForPrint.sheetsCount} شيت)`
                    : `${selectedTransferForPrint.sheetsCount} شيت (${selectedTransferForPrint.totalCards} كرت)`}
                </span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2 text-sm font-extrabold text-slate-950">
                <span>القيمة الإجمالية:</span>
                <span>{selectedTransferForPrint.totalWholesaleValue.toLocaleString()} ر.ي</span>
              </div>
            </div>

            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-[11px] mb-5">
              <span className="font-bold block mb-1 text-slate-800">
                {selectedTransferForPrint.transferType === 'cards' ? 'الكروت والشرائح المسلمة:' : 'أرقام أوراق الشيتات المسلمة:'}
              </span>
              <p className="font-mono text-slate-700 font-bold leading-relaxed">
                {selectedTransferForPrint.sheetCodes && selectedTransferForPrint.sheetCodes.length > 0
                  ? selectedTransferForPrint.sheetCodes
                      .map((code) => {
                        const s = sheets.find((x) => x.sheetCode === code);
                        return s
                          ? formatSheetWithBatch(s, undefined, batches)
                          : code.includes('-P') || code.includes('-C')
                          ? `شريحة ${code.split('-').pop()?.replace('P', 'كروت-') || 'كروت'}`
                          : `شيت #${code.match(/S(\d+)/)?.[1] || '1'}`;
                      })
                      .join(' ، ')
                  : selectedTransferForPrint.leafNumbers.map((n) => `#${n}`).join(' ، ')}
              </p>
            </div>

            {/* Signatures */}
            <div className="grid grid-cols-2 gap-4 border-t-2 border-slate-200 pt-4 text-xs mb-4">
              <div className="text-center">
                <p className="text-slate-500 mb-6">توقيع المسلّم (المسؤول)</p>
                <div className="border-t border-dotted border-slate-400 pt-1 font-bold">
                  {selectedTransferForPrint.fromUser}
                </div>
              </div>
              <div className="text-center">
                <p className="text-slate-500 mb-6">توقيع المستلم (الموزع)</p>
                <div className="border-t border-dotted border-slate-400 pt-1 font-bold">
                  {selectedTransferForPrint.toUser}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 no-print">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة السند</span>
              </button>
              <button
                onClick={() => setSelectedTransferForPrint(null)}
                className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal: Edit Transfer */}
      {isEditModalOpen && editingTransfer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-700 p-6 text-slate-100 shadow-2xl relative text-right flex flex-col max-h-[90vh]">
            <button
              onClick={() => {
                setIsEditModalOpen(false);
                setEditingTransfer(null);
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
                <h3 className="text-base font-extrabold text-white">تعديل سند تحويل العهدة ({editingTransfer.id})</h3>
                <p className="text-xs text-slate-400">
                  فئة {editingTransfer.category} ريال • تسوية تلقائية بين عهدة المسؤول والموزع
                </p>
              </div>
            </div>

            {editError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{editError}</span>
              </div>
            )}

            {editSuccess && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{editSuccess}</span>
              </div>
            )}

            <form onSubmit={handleUpdateTransferSubmit} className="space-y-4 overflow-y-auto pr-1 flex-1">
              {/* Context Summary */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1.5">
                <div className="flex items-center justify-between text-slate-400">
                  <span>الكمية الأصلية في السند:</span>
                  <span className="font-extrabold text-white">
                    {editingTransfer.cardsCount || editingTransfer.totalCards} كرت ({editingTransfer.sheetsCount} شيت)
                  </span>
                </div>
                {(() => {
                  const config = CARD_CATEGORIES_CONFIG[editingTransfer.category];
                  const deliveredCount = sheets
                    .filter((s) => s.transferId === editingTransfer.id && s.status === 'delivered_outlet')
                    .reduce((sum, s) => sum + (s.cardsCount || config.defaultCardsPerSheet), 0);
                  return (
                    <div className="flex items-center justify-between text-slate-400">
                      <span>الكروت الموردة للمنافذ من هذا السند:</span>
                      <span className={`font-bold ${deliveredCount > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                        {deliveredCount} كرت (الحد الأدنى المسموح للتقليص)
                      </span>
                    </div>
                  );
                })()}
              </div>

              {/* Quantity input */}
              {editingTransfer.transferType === 'cards' || (editingTransfer.cardsCount && editingTransfer.cardsCount > 0) ? (
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    عدد الكروت الجديد (فئة {editingTransfer.category} ريال)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={editCardsCount}
                    onChange={(e) => setEditCardsCount(Math.max(1, parseInt(e.target.value || '1', 10)))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono font-bold focus:outline-hidden focus:border-amber-500"
                    required
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    مثال: حولت 30 كرت بالخطأ والمطلوب 20؟ اكتب 20 وسيتم استرجاع الـ 10 كروت لمخزن المسؤول فوراً.
                  </span>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">عدد الشيتات</label>
                    <input
                      type="number"
                      min="1"
                      value={editSheetsCount}
                      onChange={(e) => {
                        const count = Math.max(1, parseInt(e.target.value || '1', 10));
                        setEditSheetsCount(count);
                        setEditCardsCount(count * CARD_CATEGORIES_CONFIG[editingTransfer.category].defaultCardsPerSheet);
                      }}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono font-bold focus:outline-hidden focus:border-amber-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">إجمالي الكروت</label>
                    <div className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2 text-sm text-amber-400 font-mono font-bold">
                      {editSheetsCount * CARD_CATEGORIES_CONFIG[editingTransfer.category].defaultCardsPerSheet} كرت
                    </div>
                  </div>
                </div>
              )}

              {/* Live Reconciliation Feedback */}
              {(() => {
                const isCard = editingTransfer.transferType === 'cards' || (editingTransfer.cardsCount && editingTransfer.cardsCount > 0);
                const currentC = editingTransfer.totalCards || (editingTransfer.sheetsCount * CARD_CATEGORIES_CONFIG[editingTransfer.category].defaultCardsPerSheet);
                const targetC = isCard ? editCardsCount : (editSheetsCount * CARD_CATEGORIES_CONFIG[editingTransfer.category].defaultCardsPerSheet);
                const diff = targetC - currentC;
                const cardUnitPrice = CARD_CATEGORIES_CONFIG[editingTransfer.category].defaultWholesaleCardPrice || Math.round(CARD_CATEGORIES_CONFIG[editingTransfer.category].defaultWholesaleSheetPrice / CARD_CATEGORIES_CONFIG[editingTransfer.category].defaultCardsPerSheet);
                const valueDiff = Math.abs(diff) * cardUnitPrice;

                return (
                  <div className={`p-3 rounded-xl border text-xs leading-relaxed ${
                    diff < 0
                      ? 'bg-amber-950/30 border-amber-500/40 text-amber-200'
                      : diff > 0
                      ? 'bg-blue-950/30 border-blue-500/40 text-blue-200'
                      : 'bg-slate-950 border-slate-800 text-slate-300'
                  }`}>
                    {diff < 0 && (
                      <div className="space-y-1">
                        <strong className="text-amber-400 font-black block">
                          📉 أثر التعديل (إنقاص العهدة بمقدار {Math.abs(diff)} كرت):
                        </strong>
                        <p>
                          سيتم سحب <strong>{Math.abs(diff)} كرت</strong> من عهدة الموزع وإعادتها فوراً إلى مخزن المسؤول، مع تخفيض قيمة السند بمقدار <strong>{valueDiff.toLocaleString()} ر.ي</strong> دون أي تأثير سلبي على حسابات المنافذ الأخرى.
                        </p>
                      </div>
                    )}
                    {diff > 0 && (
                      <div className="space-y-1">
                        <strong className="text-blue-400 font-black block">
                          📈 أثر التعديل (زيادة العهدة بمقدار {diff} كرت):
                        </strong>
                        <p>
                          سيتم سحب <strong>{diff} كرت</strong> إضافية من مخزن المسؤول وإضافتها لعهدة الموزع، مع زيادة قيمة السند بمقدار <strong>{valueDiff.toLocaleString()} ر.ي</strong>.
                        </p>
                      </div>
                    )}
                    {diff === 0 && (
                      <span className="text-slate-400">الكمية مطابقة ولا يوجد فارق كروت.</span>
                    )}
                  </div>
                );
              })()}

              {/* Wholesale Price */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  سعر الجملة (ر.ي)
                </label>
                <input
                  type="number"
                  min="0"
                  value={editWholesalePrice}
                  onChange={(e) => setEditWholesalePrice(Math.max(0, parseFloat(e.target.value || '0')))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-hidden focus:border-amber-500"
                />
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">تاريخ السند</label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-amber-500"
                  required
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">ملاحظات التعديل</label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="سبب التعديل (مثل: تصحيح خطأ إدخال الكمية من 30 إلى 20)..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition cursor-pointer shadow-md"
                >
                  حفظ التعديل والمطابقة الفورية
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingTransfer(null);
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

      {/* Modal: Delete Transfer Confirmation */}
      {deletingTransfer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-rose-500/40 p-6 text-slate-100 shadow-2xl relative text-right">
            <button
              onClick={() => setDeletingTransfer(null)}
              className="absolute left-4 top-4 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold mb-4 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="text-base font-extrabold text-white text-center mb-1">
              تأكيد حذف سند تحويل العهدة
            </h3>
            <p className="text-xs text-slate-400 text-center mb-4 font-mono font-bold">
              {deletingTransfer.id} (فئة {deletingTransfer.category} ريال)
            </p>

            {deleteError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs leading-relaxed text-slate-300 mb-5">
              <p>
                هل أنت متأكد من حذف هذا السند؟ سيتم فوراً إعادة كافة كروته (
                <strong className="text-emerald-400 font-bold">
                  {deletingTransfer.totalCards} كرت
                </strong>
                ) من عهدة الموزع إلى عهدة المسؤول، دون المساس بأي حسابات أو سندات أخرى.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDeleteTransferConfirm}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs transition cursor-pointer shadow-md"
              >
                نعم، تأكيد الحذف والإرجاع لمخزن المسؤول
              </button>
              <button
                type="button"
                onClick={() => setDeletingTransfer(null)}
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
