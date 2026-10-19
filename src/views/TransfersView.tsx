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
  ORDINAL_ARABIC,
} from '../utils/batchNaming';

export const TransfersView: React.FC = () => {
  const { currentRole, sheets, batches, transfers, createTransfer } = useApp();

  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [selectedTransferForPrint, setSelectedTransferForPrint] = useState<CustodyTransfer | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Form State
  const [selectedCategory, setSelectedCategory] = useState<CardCategory>('200');
  const [selectedBatchId, setSelectedBatchId] = useState<string>('all');
  const [selectedSheetCodes, setSelectedSheetCodes] = useState<string[]>([]);
  const [selectedLeafNumbers, setSelectedLeafNumbers] = useState<number[]>([]);
  const [notes, setNotes] = useState('');

  // Batches available for the selected category that have sheets in admin custody
  const availableBatches = useMemo(() => {
    const adminSheets = sheets.filter(
      (s) => s.category === selectedCategory && s.status === 'admin_custody'
    );
    const map = new Map<string, { batchId: string; batchNumber: number; categoryBatchNumber: number; batchName: string; count: number; date: string }>();
    adminSheets.forEach((s) => {
      const b = batches.find((x) => x.id === s.batchId);
      const catBNum = s.categoryBatchNumber || (b ? getCategoryBatchNumber(b, batches) : 1);
      if (!map.has(s.batchId)) {
        map.set(s.batchId, {
          batchId: s.batchId,
          batchNumber: b?.batchNumber || s.batchNumber || 1,
          categoryBatchNumber: catBNum,
          batchName: getBatchOrdinalName(catBNum),
          count: 0,
          date: b?.date || s.timestamp?.split('T')[0] || '',
        });
      }
      map.get(s.batchId)!.count += 1;
    });
    return Array.from(map.values()).sort((a, b) => a.categoryBatchNumber - b.categoryBatchNumber);
  }, [sheets, batches, selectedCategory]);

  // Available sheets in Admin Custody for the selected category (optionally filtered by batch)
  const availableAdminSheets = useMemo(() => {
    return sheets.filter(
      (s) =>
        s.category === selectedCategory &&
        s.status === 'admin_custody' &&
        (selectedBatchId === 'all' || s.batchId === selectedBatchId)
    );
  }, [sheets, selectedCategory, selectedBatchId]);

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
  };

  const handleSubmitTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSheetCodes.length === 0) return;

    createTransfer({
      category: selectedCategory,
      batchId: selectedBatchId !== 'all' ? selectedBatchId : undefined,
      sheetsCount: selectedSheetCodes.length,
      sheetCodes: selectedSheetCodes,
      leafNumbers: selectedLeafNumbers,
      notes,
    });

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
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 transition cursor-pointer"
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

                  <button
                    onClick={() => setSelectedTransferForPrint(tr)}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white transition cursor-pointer"
                    title="طباعة السند"
                  >
                    <Printer className="w-4 h-4 text-emerald-400" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                  <div>
                    <span className="text-slate-400 text-[10px]">عدد الشيتات والكروت:</span>
                    <div className="font-bold text-white mt-0.5">
                      {tr.sheetsCount} شيت ({tr.totalCards} كرت)
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px]">القيمة الإجمالية للجملة:</span>
                    <div className="font-bold text-emerald-400 mt-0.5">
                      {tr.totalWholesaleValue.toLocaleString()} ر.ي
                    </div>
                  </div>
                </div>

                {/* Leaf numbers chips */}
                <div>
                  <span className="text-[10px] text-slate-400 block mb-1.5">
                    أرقام الأوراق المحولة:
                  </span>
                  <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
                    {tr.sheetCodes && tr.sheetCodes.length > 0 ? (
                      tr.sheetCodes.map((code) => {
                        const s = sheets.find((x) => x.sheetCode === code);
                        return (
                          <span
                            key={code}
                            className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-mono font-bold"
                            title={code}
                          >
                            {s ? formatSheetBadge(s, undefined, batches) : `شيت #${code.match(/S(\d+)/)?.[1] || '1'}`}
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
              {/* Category Picker */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">اختر فئة الكرت</label>
                <div className="grid grid-cols-3 gap-2">
                  {Object.keys(CARD_CATEGORIES_CONFIG).map((cat) => (
                    <button
                      type="button"
                      key={cat}
                      onClick={() => handleCategorySwitch(cat as CardCategory)}
                      className={`p-2.5 rounded-xl text-xs font-bold border transition text-center cursor-pointer ${
                        selectedCategory === cat
                          ? 'bg-emerald-500 text-slate-950 border-emerald-500 shadow-md'
                          : 'bg-slate-800 border-slate-700 text-slate-300'
                      }`}
                    >
                      فئة {cat}
                    </button>
                  ))}
                </div>
              </div>

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
                      كل دفعات فئة {selectedCategory} المتاحة ({sheets.filter((s) => s.category === selectedCategory && s.status === 'admin_custody').length} شيت)
                    </option>
                    {availableBatches.map((b) => (
                      <option key={b.batchId} value={b.batchId}>
                        {b.batchName} ({b.date}) - المتبقي: {b.count} شيت
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Available Leaves Selection */}
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
              </div>

              {/* Selected Summary */}
              {selectedSheetCodes.length > 0 && (
                <div className="p-3 rounded-xl bg-slate-950 border border-emerald-500/30 space-y-2 text-xs">
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
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={selectedSheetCodes.length === 0}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-extrabold text-xs shadow-md transition cursor-pointer"
                >
                  إصدار سند التحويل
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
                <span className="text-slate-500">عدد الشيتات:</span>
                <span className="font-bold">{selectedTransferForPrint.sheetsCount} شيت</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">إجمالي الكروت:</span>
                <span className="font-bold">{selectedTransferForPrint.totalCards} كرت</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2 text-sm font-extrabold text-slate-950">
                <span>القيمة الإجمالية:</span>
                <span>{selectedTransferForPrint.totalWholesaleValue.toLocaleString()} ر.ي</span>
              </div>
            </div>

            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-[11px] mb-5">
              <span className="font-bold block mb-1 text-slate-800">أرقام أوراق الشيتات المسلمة:</span>
              <p className="font-mono text-slate-700 font-bold leading-relaxed">
                {selectedTransferForPrint.sheetCodes && selectedTransferForPrint.sheetCodes.length > 0
                  ? selectedTransferForPrint.sheetCodes
                      .map((code) => {
                        const s = sheets.find((x) => x.sheetCode === code);
                        return s
                          ? formatSheetWithBatch(s, undefined, batches)
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
    </div>
  );
};
