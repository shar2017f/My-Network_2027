import React, { useState } from 'react';
import {
  UserCheck,
  Plus,
  Search,
  Phone,
  Calendar,
  Coins,
  CheckCircle,
  Clock,
  Printer,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { CardCategory, DirectSale } from '../types';
import { CARD_CATEGORIES_CONFIG } from '../constants/cardConfig';

export const DirectSalesView: React.FC = () => {
  const { currentRole, directSales, createDirectSale } = useApp();

  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [selectedSaleForPrint, setSelectedSaleForPrint] = useState<DirectSale | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Form State
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [category, setCategory] = useState<CardCategory>('200');
  const [cardsCount, setCardsCount] = useState(5);
  const [unitCardPrice, setUnitCardPrice] = useState(200);
  const [isCredit, setIsCredit] = useState(false);
  const [notes, setNotes] = useState('');

  const handleCategoryChange = (cat: CardCategory) => {
    setCategory(cat);
    setUnitCardPrice(CARD_CATEGORIES_CONFIG[cat].nominalValue);
  };

  const handleSubmitSale = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName) return;

    createDirectSale({
      customerName,
      customerPhone,
      category,
      cardsCount: Number(cardsCount),
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
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition cursor-pointer"
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

                <button
                  onClick={() => setSelectedSaleForPrint(sale)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
                  title="طباعة إيصال"
                >
                  <Printer className="w-4 h-4" />
                </button>
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

            <h3 className="text-base font-extrabold text-white mb-4">تسجيل بيع كروت مباشر لزبون</h3>

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
                  <label className="block text-xs font-bold text-slate-300 mb-1">عدد الكروت</label>
                  <input
                    type="number"
                    min="1"
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
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs shadow-md transition"
                >
                  حفظ السند
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
                className="py-2 px-4 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs"
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
