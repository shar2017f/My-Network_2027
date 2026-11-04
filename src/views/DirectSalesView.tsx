import React, { useState, useMemo } from 'react';
import {
  UserCheck,
  Plus,
  Search,
  Phone,
  Calendar,
  Coins,
  CheckCircle,
  Printer,
  X,
  AlertTriangle,
  Edit2,
  Trash2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { CardCategory, DirectSale } from '../types';
import { CARD_CATEGORIES_CONFIG } from '../constants/cardConfig';

export const DirectSalesView: React.FC = () => {
  const { currentRole, directSales, createDirectSale, updateDirectSale, deleteDirectSale, sheets } = useApp();

  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [selectedSaleForPrint, setSelectedSaleForPrint] = useState<DirectSale | null>(null);
  const [editingSale, setEditingSale] = useState<DirectSale | null>(null);
  const [deletingSale, setDeletingSale] = useState<DirectSale | null>(null);

  // Edit Form State
  const [editCustomerName, setEditCustomerName] = useState('');
  const [editCustomerPhone, setEditCustomerPhone] = useState('');
  const [editCardsCount, setEditCardsCount] = useState(1);
  const [editUnitCardPrice, setEditUnitCardPrice] = useState(200);
  const [editIsCredit, setEditIsCredit] = useState(false);
  const [editNotes, setEditNotes] = useState('');

  const [searchQuery, setSearchQuery] = useState('');

  // Form State
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [category, setCategory] = useState<CardCategory>('200');
  const [cardsCount, setCardsCount] = useState(5);
  const [unitCardPrice, setUnitCardPrice] = useState(200);
  const [isCredit, setIsCredit] = useState(false);
  const [notes, setNotes] = useState('');
  const [saleError, setSaleError] = useState<string | null>(null);

  // Available cards in user custody for selected category
  const availableCardsInCustody = useMemo(() => {
    const config = CARD_CATEGORIES_CONFIG[category];
    const userSheets = sheets.filter(
      (s) =>
        s.category === category &&
        (currentRole === 'distributor'
          ? s.status === 'distributor_custody'
          : s.status === 'admin_custody' || s.status === 'distributor_custody')
    );
    return userSheets.length * config.defaultCardsPerSheet;
  }, [sheets, category, currentRole]);

  const handleCategoryChange = (cat: CardCategory) => {
    setCategory(cat);
    setUnitCardPrice(CARD_CATEGORIES_CONFIG[cat].nominalValue);
    setSaleError(null);
  };

  const handleSubmitSale = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName) return;

    if (availableCardsInCustody === 0) {
      setSaleError(
        `رصيد فئة ${category} ر.ي في عهدتك نفذ بالكامل (0 كرت متاح). لا يمكن بيع كروت غير موجودة بالعهدة.`
      );
      return;
    }

    const requestedCards = Number(cardsCount);
    if (requestedCards <= 0) {
      setSaleError('يرجى إدخال عدد كروت صحيح (كرت واحد على الأقل)');
      return;
    }

    if (requestedCards > availableCardsInCustody) {
      setSaleError(
        `الكمية المطلوبة (${requestedCards} كرت) تتجاوز الرصيد المتوفر في عهدتك (${availableCardsInCustody} كرت). يمنع النظام بيع كروت ليست في حوزتك.`
      );
      return;
    }

    setSaleError(null);

    createDirectSale({
      customerName,
      customerPhone,
      category,
      cardsCount: requestedCards,
      unitCardPrice: Number(unitCardPrice),
      isCredit,
      notes,
    });

    setIsNewModalOpen(false);
    setCustomerName('');
    setCustomerPhone('');
    setNotes('');
    setIsCredit(false);
  };

  const filteredSales = directSales.filter(
    (s) =>
      s.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.customerPhone && s.customerPhone.includes(searchQuery))
  );

  const totalDirectSalesAmount = directSales.reduce((sum, s) => sum + s.totalAmount, 0);
  const totalDirectCash = directSales
    .filter((s) => !s.isCredit)
    .reduce((sum, s) => sum + s.totalAmount, 0);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 p-5 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-extrabold text-white">
              مبيعات الكروت للأفراد والزبائن (DIR)
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-bold border border-amber-500/30">
              {directSales.length} مبيعات مباشرة
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            بيع كروت فردية مباشرة نقداً أو آجل للأفراد والزبائن الخاصة
          </p>
        </div>

        <button
          onClick={() => setIsNewModalOpen(true)}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 min-h-[44px] rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition cursor-pointer active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>تسجيل بيع فردي مباشر (DIR)</span>
        </button>
      </div>

      {/* Summary Chips */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-slate-400 text-[10px] block">إجمالي المبيعات المباشرة:</span>
          <span className="font-extrabold text-sm text-white mt-0.5 block">
            {totalDirectSalesAmount.toLocaleString()} ر.ي
          </span>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-slate-400 text-[10px] block">المحصل نقداً (كاش):</span>
          <span className="font-extrabold text-sm text-emerald-400 mt-0.5 block">
            {totalDirectCash.toLocaleString()} ر.ي
          </span>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-slate-400 text-[10px] block">الآجل غير المسدد:</span>
          <span className="font-extrabold text-sm text-rose-400 mt-0.5 block">
            {(totalDirectSalesAmount - totalDirectCash).toLocaleString()} ر.ي
          </span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="البحث باسم الزبون، الهاتف، أو كود السند..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-9 pl-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-amber-500"
          />
        </div>
      </div>

      {/* Sales List */}
      {filteredSales.length === 0 ? (
        <div className="p-12 text-center bg-slate-900 rounded-2xl border border-slate-800">
          <UserCheck className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white mb-1">لا توجد مبيعات مباشرة مسجلة</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto mb-5 leading-relaxed">
            السجل فارغ. يمكنك تسجيل بيع الكروت الفردية للزبائن مباشرة وتحديد إن كان الدفع نقداً أو آجل.
          </p>
          <button
            onClick={() => setIsNewModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            تسجيل أول عملية بيع مباشر
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSales.map((sale) => (
            <div
              key={sale.id}
              className="bg-slate-900 rounded-2xl border border-slate-800 p-5 space-y-3 hover:border-slate-700 transition"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm text-white">{sale.id}</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${
                        sale.isCredit
                          ? 'bg-rose-500/20 text-rose-400'
                          : 'bg-emerald-500/20 text-emerald-400'
                      }`}
                    >
                      {sale.isCredit ? 'آجل (دين)' : 'نقداً'}
                    </span>
                  </div>
                  <h4 className="font-bold text-sm text-slate-200 mt-1">{sale.customerName}</h4>
                  {sale.customerPhone && (
                    <span className="text-xs text-slate-400 font-mono" dir="ltr">
                      {sale.customerPhone}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setSelectedSaleForPrint(sale)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
                    title="طباعة إيصال"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                  {currentRole === 'admin' && (
                    <>
                      <button
                        onClick={() => {
                          setEditingSale(sale);
                          setEditCustomerName(sale.customerName);
                          setEditCustomerPhone(sale.customerPhone || '');
                          setEditCardsCount(sale.cardsCount);
                          setEditUnitCardPrice(sale.unitCardPrice);
                          setEditIsCredit(sale.isCredit);
                          setEditNotes(sale.notes || '');
                        }}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-amber-400 transition cursor-pointer"
                        title="تعديل فاتورة البيع المباشر"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeletingSale(sale)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition cursor-pointer"
                        title="حذف/إلغاء فاتورة البيع"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">الفئة والكمية:</span>
                  <span className="font-bold text-white">
                    {sale.cardsCount} كرت (فئة {sale.category})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">سعر الكرت:</span>
                  <span>{sale.unitCardPrice.toLocaleString()} ر.ي</span>
                </div>
                <div className="flex justify-between border-t border-slate-800/80 pt-1 font-extrabold text-emerald-400">
                  <span>المبلغ الإجمالي:</span>
                  <span>{sale.totalAmount.toLocaleString()} ر.ي</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-850 flex items-center justify-between text-[10px] text-slate-400">
                <span>البائع: {sale.soldBy}</span>
                <span>{sale.date}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: New Direct Sale */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700 p-6 text-slate-100 shadow-2xl relative text-right">
            <button
              onClick={() => setIsNewModalOpen(false)}
              className="absolute left-4 top-4 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-extrabold text-white mb-2">تسجيل بيع كروت مباشر لزبون</h3>

            {/* Custody Stock Indicator */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs mb-3">
              <span className="text-slate-400">الرصيد الفعلي المتاح بعهدتك:</span>
              <span
                className={`font-mono font-bold px-2 py-0.5 rounded-md ${
                  availableCardsInCustody > 0
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                }`}
              >
                {availableCardsInCustody.toLocaleString()} كرت (فئة {category} ر.ي)
              </span>
            </div>

            {availableCardsInCustody === 0 && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center gap-2 mb-3 animate-in fade-in">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>⚠️ رصيد هذه الفئة نفذ بالكامل من عهدتك. يمنع النظام بيع كروت ليست في حوزتك.</span>
              </div>
            )}

            {saleError && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center gap-2 mb-3 animate-in fade-in">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{saleError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitSale} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">اسم الزبون / المشتري</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: أحمد الوصابي، عبده صالح..."
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">رقم الهاتف (اختياري)</label>
                <input
                  type="text"
                  placeholder="77XXXXXXX"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-amber-500 font-mono"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">فئة الكرت</label>
                <div className="grid grid-cols-3 gap-2">
                  {Object.keys(CARD_CATEGORIES_CONFIG).map((cat) => (
                    <button
                      type="button"
                      key={cat}
                      onClick={() => handleCategoryChange(cat as CardCategory)}
                      className={`p-2 rounded-xl text-xs font-bold border transition ${
                        category === cat
                          ? 'bg-amber-500 text-slate-950 border-amber-500 font-extrabold'
                          : 'bg-slate-800 border-slate-700 text-slate-300'
                      }`}
                    >
                      فئة {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-300">عدد الكروت</label>
                    <span className="text-[10px] text-slate-400 font-mono">
                      (الحد الأقصى: {availableCardsInCustody})
                    </span>
                  </div>
                  <input
                    type="number"
                    min="1"
                    max={Math.max(1, availableCardsInCustody)}
                    required
                    value={cardsCount}
                    onChange={(e) => setCardsCount(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-amber-500 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">سعر الكرت (ر.ي)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={unitCardPrice}
                    onChange={(e) => setUnitCardPrice(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-amber-500 font-bold text-emerald-400"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400">المبلغ الإجمالي المستحق:</span>
                <span className="font-extrabold text-emerald-400 text-sm">
                  {(cardsCount * unitCardPrice).toLocaleString()} ر.ي
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">طريقة الدفع</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCredit(false)}
                    className={`py-2 rounded-xl text-xs font-bold border transition ${
                      !isCredit
                        ? 'bg-emerald-500 text-slate-950 border-emerald-500'
                        : 'bg-slate-800 border-slate-700 text-slate-300'
                    }`}
                  >
                    نقداً (كاش)
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCredit(true)}
                    className={`py-2 rounded-xl text-xs font-bold border transition ${
                      isCredit
                        ? 'bg-rose-500 text-white border-rose-500'
                        : 'bg-slate-800 border-slate-700 text-slate-300'
                    }`}
                  >
                    آجل (دين على الزبون)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">ملاحظات</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-amber-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="flex-1 min-h-[44px] py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition cursor-pointer active:scale-95"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={
                    availableCardsInCustody === 0 ||
                    cardsCount > availableCardsInCustody ||
                    cardsCount <= 0
                  }
                  className="flex-1 min-h-[44px] py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-extrabold text-xs shadow-md transition cursor-pointer active:scale-95"
                  title={
                    availableCardsInCustody === 0
                      ? 'رصيد الفئة نفذ بالكامل من عهدتك'
                      : cardsCount > availableCardsInCustody
                      ? 'الكمية المطلوبة تتجاوز رصيد الكروت المتاح'
                      : 'حفظ وتثبيت سند البيع المباشر'
                  }
                >
                  {availableCardsInCustody === 0 ? '⛔ الرصيد نفذ من العهدة' : 'حفظ السند وتثبيت البيع 🚀'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Receipt */}
      {selectedSaleForPrint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-white text-slate-900 p-6 shadow-2xl relative text-right">
            <button
              onClick={() => setSelectedSaleForPrint(null)}
              className="absolute left-4 top-4 p-1 rounded-lg text-slate-500 hover:text-black hover:bg-slate-100 no-print"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="border-b-2 border-dashed border-slate-300 pb-3 mb-3 text-center">
              <h2 className="text-lg font-black text-slate-900">شبكة قعزان نت</h2>
              <p className="text-xs text-slate-600">فاتورة بيع كروت إنترنت مباشرة</p>
              <div className="inline-block mt-1 px-3 py-0.5 bg-slate-100 rounded-full font-mono font-bold text-xs text-slate-800">
                {selectedSaleForPrint.id}
              </div>
            </div>

            <div className="space-y-1.5 text-xs text-slate-700 mb-4">
              <div className="flex justify-between">
                <span className="text-slate-500">العميل:</span>
                <span className="font-bold">{selectedSaleForPrint.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">التاريخ:</span>
                <span>{selectedSaleForPrint.date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">الفئة:</span>
                <span className="font-bold">فئة {selectedSaleForPrint.category}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">عدد الكروت:</span>
                <span>{selectedSaleForPrint.cardsCount} كرت</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-1 text-sm font-black text-slate-900">
                <span>الإجمالي:</span>
                <span>{selectedSaleForPrint.totalAmount.toLocaleString()} ر.ي</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">طريقة البيع:</span>
                <span className="font-bold">
                  {selectedSaleForPrint.isCredit ? 'آجل (دين)' : 'مسدد نقداً (كاش)'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 no-print">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs flex items-center justify-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة</span>
              </button>
              <button
                onClick={() => setSelectedSaleForPrint(null)}
                className="py-2 px-4 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Edit Direct Sale */}
      {editingSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700 p-6 text-slate-100 shadow-2xl relative text-right">
            <button
              onClick={() => setEditingSale(null)}
              className="absolute left-4 top-4 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-extrabold text-white mb-1">تعديل فاتورة بيع مباشر</h3>
            <p className="text-xs text-slate-400 mb-4">
              رقم الفاتورة: <span className="font-mono text-amber-400 font-bold">{editingSale.id}</span> • فئة {editingSale.category} ر.ي
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!editCustomerName || editCardsCount <= 0 || editUnitCardPrice <= 0) return;
                updateDirectSale(editingSale.id, {
                  customerName: editCustomerName,
                  customerPhone: editCustomerPhone,
                  cardsCount: Number(editCardsCount),
                  unitCardPrice: Number(editUnitCardPrice),
                  isCredit: editIsCredit,
                  notes: editNotes,
                });
                setEditingSale(null);
              }}
              className="space-y-4 text-xs"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">اسم العميل:</label>
                  <input
                    type="text"
                    value={editCustomerName}
                    onChange={(e) => setEditCustomerName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-hidden focus:border-amber-500 font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">رقم الهاتف:</label>
                  <input
                    type="text"
                    value={editCustomerPhone}
                    onChange={(e) => setEditCustomerPhone(e.target.value)}
                    dir="ltr"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-right focus:outline-hidden focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">عدد الكروت:</label>
                  <input
                    type="number"
                    min="1"
                    value={editCardsCount}
                    onChange={(e) => setEditCardsCount(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono font-bold focus:outline-hidden focus:border-amber-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">سعر الكرت (ر.ي):</label>
                  <input
                    type="number"
                    min="1"
                    value={editUnitCardPrice}
                    onChange={(e) => setEditUnitCardPrice(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono font-bold focus:outline-hidden focus:border-amber-500"
                    required
                  />
                </div>
              </div>

              {/* Live Calculation & Comparison */}
              {(() => {
                const newTotal = editCardsCount * editUnitCardPrice;
                const diffAmount = newTotal - editingSale.totalAmount;
                const diffCards = editCardsCount - editingSale.cardsCount;

                return (
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <div className="flex justify-between items-center text-slate-400">
                      <span>إجمالي الفاتورة الجديد:</span>
                      <span className="font-mono font-extrabold text-sm text-emerald-400">
                        {newTotal.toLocaleString()} ر.ي
                      </span>
                    </div>

                    <div className="pt-2 border-t border-slate-850 flex justify-between items-center text-[11px]">
                      <span className="text-slate-400">فارق المبلغ المالي:</span>
                      <span
                        className={`font-mono font-bold px-2 py-0.5 rounded ${
                          diffAmount === 0
                            ? 'text-slate-400'
                            : diffAmount > 0
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-rose-500/20 text-rose-300'
                        }`}
                      >
                        {diffAmount === 0
                          ? 'لا فارق مالي'
                          : diffAmount > 0
                          ? `+${diffAmount.toLocaleString()} ر.ي`
                          : `${diffAmount.toLocaleString()} ر.ي`}
                      </span>
                    </div>

                    {diffCards !== 0 && (
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-slate-400">أثر حركة الكروت في العهدة:</span>
                        <span
                          className={`font-mono font-bold px-2 py-0.5 rounded ${
                            diffCards > 0
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-blue-500/20 text-blue-300'
                          }`}
                        >
                          {diffCards > 0
                            ? `خصم ${diffCards} كرت إضافي من العهدة`
                            : `إعادة ${Math.abs(diffCards)} كرت إلى العهدة`}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })()}

              <div>
                <label className="flex items-center gap-2 cursor-pointer p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <input
                    type="checkbox"
                    checked={editIsCredit}
                    onChange={(e) => setEditIsCredit(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-500 focus:ring-0 focus:outline-hidden"
                  />
                  <span className="font-bold text-slate-200">
                    بيع آجل (دين على العميل غير محصل نقداً)
                  </span>
                </label>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">سبب التعديل / ملاحظات:</label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="سبب تعديل الفاتورة..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-hidden focus:border-amber-500"
                />
              </div>

              <div className="pt-2 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingSale(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-white font-bold transition cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition cursor-pointer"
                >
                  حفظ وتحديث السجلات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Delete Direct Sale */}
      {deletingSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-rose-500/30 p-6 text-slate-100 shadow-2xl relative text-right">
            <button
              onClick={() => setDeletingSale(null)}
              className="absolute left-4 top-4 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-3">
              <Trash2 className="w-5 h-5" />
            </div>

            <h3 className="text-base font-extrabold text-white mb-1">تأكيد حذف فاتورة بيع مباشر</h3>
            <p className="text-xs text-slate-400 mb-4">
              هل أنت متأكد من حذف فاتورة البيع المباشر رقم{' '}
              <span className="font-mono text-white font-bold">{deletingSale.id}</span> للعميل{' '}
              <span className="text-amber-400 font-bold">{deletingSale.customerName}</span>؟
            </p>

            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 space-y-1 mb-4">
              <div className="font-bold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>أثر إلغاء الفاتورة:</span>
              </div>
              <ul className="list-disc list-inside text-[11px] space-y-0.5 leading-relaxed">
                <li>
                  إعادة <span className="font-bold font-mono">{deletingSale.cardsCount} كرت</span> فئة{' '}
                  {deletingSale.category} ر.ي إلى عهدة البائع تلقائياً.
                </li>
                {!deletingSale.isCredit && (
                  <li>
                    خصم مبلغ <span className="font-bold font-mono">{deletingSale.totalAmount.toLocaleString()} ر.ي</span>{' '}
                    من رصيد الكاش المحصل لدى البائع.
                  </li>
                )}
                <li>تسجيل عملية الحذف والسبب في سجل التدقيق المالي (Audit Log).</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingSale(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition cursor-pointer"
              >
                تراجع
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteDirectSale(deletingSale.id);
                  setDeletingSale(null);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition cursor-pointer"
              >
                تأكيد الحذف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
