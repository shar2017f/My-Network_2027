import React, { useState } from 'react';
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
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { CardCategory, PrintBatch, SheetLeaf } from '../types';
import { CARD_CATEGORIES_CONFIG } from '../constants/cardConfig';
import {
  getBatchOrdinalName,
  getCategoryBatchNumber,
  formatSheetWithBatch,
  ORDINAL_ARABIC,
} from '../utils/batchNaming';

export const BatchesView: React.FC = () => {
  const {
    currentRole,
    batches,
    sheets,
    addBatch,
    updateBatchDateMonth,
    stockHealthList,
    targetPrintCategory,
    setTargetPrintCategory,
  } = useApp();

  // Display mode: 'grid' | 'table'
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState<PrintBatch | null>(null);
  const [viewingLeafBatch, setViewingLeafBatch] = useState<PrintBatch | null>(null);

  // Add Batch Form State
  const [formData, setFormData] = useState<{
    category: CardCategory;
    date: string;
    accountingMonth: string;
    sheetsCount: number;
    cardsPerSheet: number;
    wholesaleSheetPrice: number;
    notes: string;
  }>({
    category: '200',
    date: new Date().toISOString().split('T')[0],
    accountingMonth: new Date().toISOString().slice(0, 7),
    sheetsCount: 10,
    cardsPerSheet: 60,
    wholesaleSheetPrice: CARD_CATEGORIES_CONFIG['200'].defaultWholesaleSheetPrice,
    notes: '',
  });

  // Edit Date / Month Modal State
  const [editDate, setEditDate] = useState('');
  const [editMonth, setEditMonth] = useState('');

  // Handle category change in Add Form
  const handleCategoryChange = (cat: CardCategory) => {
    const config = CARD_CATEGORIES_CONFIG[cat];
    setFormData((prev) => ({
      ...prev,
      category: cat,
      wholesaleSheetPrice: config.defaultWholesaleSheetPrice,
      cardsPerSheet: config.defaultCardsPerSheet,
    }));
  };

  // Quick Print of recommended sheets based on intelligent stock alert
  const handlePrintRecommended = (category: CardCategory, sheetsCount: number) => {
    const config = CARD_CATEGORIES_CONFIG[category];
    setFormData({
      category,
      date: new Date().toISOString().split('T')[0],
      accountingMonth: new Date().toISOString().slice(0, 7),
      sheetsCount,
      cardsPerSheet: config.defaultCardsPerSheet,
      wholesaleSheetPrice: config.defaultWholesaleSheetPrice,
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
    addBatch({
      category: formData.category,
      date: formData.date,
      accountingMonth: formData.accountingMonth,
      sheetsCount: Number(formData.sheetsCount),
      cardsPerSheet: Number(formData.cardsPerSheet),
      wholesaleSheetPrice: Number(formData.wholesaleSheetPrice),
      notes: formData.notes,
    });
    setIsAddModalOpen(false);
  };

  const handleOpenEdit = (batch: PrintBatch) => {
    setEditingBatch(batch);
    setEditDate(batch.date);
    setEditMonth(batch.accountingMonth);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBatch) return;
    updateBatchDateMonth(editingBatch.id, editDate, editMonth);
    setEditingBatch(null);
  };

  // Filtered batches
  const filteredBatches = batches.filter((b) => {
    const matchesSearch =
      b.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.notes?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.category.includes(searchQuery);
    const matchesCat =
      selectedCategoryFilter === 'all' || b.category === selectedCategoryFilter;
    return matchesSearch && matchesCat;
  });

  // Sheet status badge helper
  const renderSheetStatusBadge = (status: SheetLeaf['status'], outletName?: string) => {
    switch (status) {
      case 'admin_custody':
        return (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">
            عهدة المسؤول
          </span>
        );
      case 'distributor_custody':
        return (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
            عهدة الموزع
          </span>
        );
      case 'delivered_outlet':
        return (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 font-medium">
            مورد: {outletName || 'منفذ'}
          </span>
        );
      case 'damaged':
        return (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 font-medium">
            تالف / مرتجع
          </span>
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
          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-slate-400">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition cursor-pointer ${
                viewMode === 'grid' ? 'bg-slate-800 text-white' : 'hover:text-white'
              }`}
              title="عرض البطاقات"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition cursor-pointer ${
                viewMode === 'table' ? 'bg-slate-800 text-white' : 'hover:text-white'
              }`}
              title="عرض الجدول"
            >
              <List className="w-4 h-4" />
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
            const batchSheets = sheets.filter((s) => s.batchId === batch.id);
            const inAdminCustody = batchSheets.filter((s) => s.status === 'admin_custody').length;
            const inDistributorCustody = batchSheets.filter((s) => s.status === 'distributor_custody').length;
            const delivered = batchSheets.filter((s) => s.status === 'delivered_outlet').length;

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
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-white">{batch.id}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-400 font-bold">
                          {config.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-500" />
                          {batch.date}
                        </span>
                        <span>•</span>
                        <span className="text-amber-400/90 font-medium">شهر {batch.accountingMonth}</span>
                      </div>
                    </div>
                  </div>

                  {currentRole === 'admin' && (
                    <button
                      onClick={() => handleOpenEdit(batch)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition cursor-pointer"
                      title="تعديل تاريخ وشهر الدفعة"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
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
                    <span>موقف أوراق الشيتات ({batchSheets.length}):</span>
                    <span>{delivered} مورد من {batch.sheetsCount}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-800 flex overflow-hidden">
                    <div
                      style={{ width: `${(delivered / (batch.sheetsCount || 1)) * 100}%` }}
                      className="bg-purple-500 h-full"
                      title={`مورد للمنافذ: ${delivered}`}
                    />
                    <div
                      style={{ width: `${(inDistributorCustody / (batch.sheetsCount || 1)) * 100}%` }}
                      className="bg-emerald-500 h-full"
                      title={`في عهدة الموزع: ${inDistributorCustody}`}
                    />
                    <div
                      style={{ width: `${(inAdminCustody / (batch.sheetsCount || 1)) * 100}%` }}
                      className="bg-blue-500 h-full"
                      title={`في عهدة المسؤول: ${inAdminCustody}`}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                    <span className="text-blue-400">عهدة المسؤول: {inAdminCustody}</span>
                    <span className="text-emerald-400">عهدة الموزع: {inDistributorCustody}</span>
                    <span className="text-purple-400">مورد: {delivered}</span>
                  </div>
                </div>

                {batch.notes && (
                  <p className="text-[11px] text-slate-400 bg-slate-850 p-2 rounded-lg border border-slate-800/80">
                    {batch.notes}
                  </p>
                )}

                {/* Action to view leaves */}
                <button
                  onClick={() => setViewingLeafBatch(batch)}
                  className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white font-bold text-xs flex items-center justify-center gap-1.5 transition border border-slate-700/60 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5 text-amber-400" />
                  <span>تتبع أوراق الشيتات ورقة بورقة ({batchSheets.length})</span>
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="p-3.5 font-bold">كود الدفعة</th>
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
                {filteredBatches.map((batch) => (
                  <tr key={batch.id} className="hover:bg-slate-850/50 transition">
                    <td className="p-3.5 font-bold text-white">{batch.id}</td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-400 font-bold text-[11px]">
                        فئة {batch.category}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-300">{batch.date}</td>
                    <td className="p-3.5 text-amber-400 font-semibold">{batch.accountingMonth}</td>
                    <td className="p-3.5 font-bold text-white">{batch.sheetsCount} شيت</td>
                    <td className="p-3.5 text-slate-300">{batch.totalCards} كرت</td>
                    <td className="p-3.5 font-bold text-emerald-400">
                      {batch.totalWholesaleValue.toLocaleString()} ر.ي
                    </td>
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setViewingLeafBatch(batch)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                          title="تتبع الشيتات"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {currentRole === 'admin' && (
                          <button
                            onClick={() => handleOpenEdit(batch)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-300 transition"
                            title="تعديل التاريخ والشهر"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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

              {/* Date & Accounting Month */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">تاريخ الطباعة</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">الشهر المحاسبي</label>
                  <input
                    type="month"
                    required
                    value={formData.accountingMonth}
                    onChange={(e) => setFormData({ ...formData, accountingMonth: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Sheets count & Cards per sheet */}
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

              {/* Wholesale sheet price */}
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

              {/* Total Summary Preview */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px]">إجمالي الكروت الناتجة:</span>
                  <span className="font-extrabold text-white">
                    {(formData.sheetsCount * formData.cardsPerSheet).toLocaleString()} كرت
                  </span>
                </div>
                <div className="text-left">
                  <span className="text-slate-400 block text-[10px]">القيمة الإجمالية بالجملة:</span>
                  <span className="font-extrabold text-emerald-400 text-sm">
                    {(formData.sheetsCount * formData.wholesaleSheetPrice).toLocaleString()} ر.ي
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

      {/* 2. Modal: Edit Batch Date & Accounting Month */}
      {editingBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-700 p-6 text-slate-100 shadow-2xl relative text-right">
            <button
              onClick={() => setEditingBatch(null)}
              className="absolute left-4 top-4 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                <Edit2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-white">تعديل تاريخ وشهر الدفعة</h3>
                <span className="text-xs text-amber-400">{editingBatch.id}</span>
              </div>
            </div>

            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              سيتم توثيق هذا التعديل آلياً في سجل التدقيق المالي لضمان الشفافية.
            </p>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">تاريخ الدفعة الجديد</label>
                <input
                  type="date"
                  required
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">الشهر المحاسبي الجديد</label>
                <input
                  type="month"
                  required
                  value={editMonth}
                  onChange={(e) => setEditMonth(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-amber-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingBatch(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs shadow-md transition cursor-pointer"
                >
                  تأكيد التعديل
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Modal: Leaf-by-leaf tracking */}
      {viewingLeafBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-2xl max-h-[85vh] rounded-2xl bg-slate-900 border border-slate-700 p-6 text-slate-100 shadow-2xl relative text-right flex flex-col">
            <button
              onClick={() => setViewingLeafBatch(null)}
              className="absolute left-4 top-4 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
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
                    تتبع أوراق الشيتات - {viewingLeafBatch.id}
                  </h3>
                  <span className="text-xs px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-400 font-bold">
                    فئة {viewingLeafBatch.category}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  مسار كل ورقة شيت من لحظة الطباعة وحتى التسليم للمنفذ أو البيع
                </p>
              </div>
            </div>

            {/* Leaves Grid List */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {sheets
                  .filter((s) => s.batchId === viewingLeafBatch.id)
                  .map((sheet) => (
                    <div
                      key={sheet.sheetCode}
                      className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 transition flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-lg bg-blue-500/15 text-blue-300 border border-blue-500/25 font-bold text-xs flex items-center justify-center">
                            شيت #{sheet.leafNumber}
                          </span>
                          <span className="font-mono font-bold text-xs text-white">
                            {sheet.sheetCode}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 mt-1 block">
                          الدفعة #{sheet.batchNumber || viewingLeafBatch.batchNumber} • {sheet.cardsCount} كرت
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

            <div className="pt-4 border-t border-slate-800 mt-4 shrink-0 flex items-center justify-between text-xs text-slate-400">
              <span>إجمالي شيتات هذه الدفعة: {viewingLeafBatch.sheetsCount} ورقة</span>
              <button
                onClick={() => setViewingLeafBatch(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition cursor-pointer"
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
