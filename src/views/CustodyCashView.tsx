import React, { useState } from 'react';
import {
  Coins,
  Shield,
  Layers,
  ArrowRight,
  TrendingDown,
  Plus,
  CheckCircle,
  XCircle,
  AlertTriangle,
  History,
  FileText,
  Calendar,
  X,
  UserCheck,
  Bell,
  Sliders,
  Volume2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { CARD_CATEGORIES_CONFIG } from '../constants/cardConfig';
import { CardCategory } from '../types';

export const CustodyCashView: React.FC = () => {
  const {
    currentRole,
    sheets,
    deliveries,
    payments,
    directSales,
    cashHandovers,
    damagedCards,
    distributorCashInHand,
    adminTotalCashCollected,
    createCashHandover,
    resolveCashHandover,
    recordDamage,
    criticalThresholds,
    setCriticalThreshold,
    triggerStockAlertManually,
    stockHealthList,
  } = useApp();

  const [isHandoverModalOpen, setIsHandoverModalOpen] = useState(false);
  const [isDamageModalOpen, setIsDamageModalOpen] = useState(false);
  const [isThresholdModalOpen, setIsThresholdModalOpen] = useState(false);

  // Handover form state
  const [handoverAmount, setHandoverAmount] = useState(distributorCashInHand || 0);
  const [handoverNotes, setHandoverNotes] = useState('');

  // Damage form state
  const [damageCategory, setDamageCategory] = useState<CardCategory>('200');
  const [damageCardsCount, setDamageCardsCount] = useState(60);
  const [damageSheetCode, setDamageSheetCode] = useState('');
  const [damageReason, setDamageReason] = useState('');

  // Detailed Cash Components
  const deliveryCash = deliveries.reduce((sum, d) => sum + (d.cashPaidNow || 0), 0);
  const paymentCash = payments.reduce(
    (sum, p) => (p.collectorName.includes('الموزع') ? sum + p.amount : sum),
    0
  );
  const directCash = directSales.reduce(
    (sum, s) => (s.soldBy.includes('الموزع') && !s.isCredit ? sum + s.totalAmount : sum),
    0
  );
  const acceptedHandoverCash = cashHandovers
    .filter((h) => h.status === 'accepted')
    .reduce((sum, h) => sum + h.amount, 0);

  const handleSubmitHandover = (e: React.FormEvent) => {
    e.preventDefault();
    if (handoverAmount <= 0) return;
    createCashHandover(Number(handoverAmount), handoverNotes);
    setIsHandoverModalOpen(false);
    setHandoverNotes('');
  };

  const handleSubmitDamage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!damageReason) return;
    recordDamage({
      category: damageCategory,
      cardsCount: Number(damageCardsCount),
      sheetCode: damageSheetCode || undefined,
      reason: damageReason,
    });
    setIsDamageModalOpen(false);
    setDamageReason('');
    setDamageSheetCode('');
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 p-5 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-extrabold text-white">
              تقرير العهد والمحاسبة النقدية والتالف
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
              جرد فوري
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            متابعة جرد الكروت بين المسؤول والموزع، وتوريد النقدية المحصلة، وإثبات التالف
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => {
              setHandoverAmount(distributorCashInHand);
              setIsHandoverModalOpen(true);
            }}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 transition cursor-pointer"
          >
            <Coins className="w-4 h-4" />
            <span>تسليم نقدية للمسؤول (CSH)</span>
          </button>

          <button
            onClick={() => setIsDamageModalOpen(true)}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-400 border border-slate-700 font-bold text-xs transition cursor-pointer"
          >
            <AlertTriangle className="w-4 h-4" />
            <span>تسجيل تالف / مرتجع</span>
          </button>
        </div>
      </div>

      {/* Cash In Hand Deep-Dive Breakdown Box */}
      <div className="bg-gradient-to-l from-slate-900 via-slate-900 to-slate-950 rounded-2xl border border-emerald-500/30 p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-emerald-400" />
              <h3 className="font-extrabold text-base text-white">
                حساب العهدة النقدية في يد الموزع الميداني
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              معادلة دقيقة: نقدية التوريدات + تحصيل الديون + المبيعات المباشرة - المسلم للمسؤول
            </p>
          </div>

          <div className="text-right sm:text-left bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-xl">
            <span className="text-[10px] text-emerald-400/90 block font-semibold">
              صافي الكاش بيد الموزع الآن:
            </span>
            <span className="text-xl font-black text-emerald-400">
              {distributorCashInHand.toLocaleString()} ر.ي
            </span>
          </div>
        </div>

        {/* 4 Formula Factors */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-slate-400 text-[10px] block">1. كاش التوريدات الفوري (+)</span>
            <span className="font-extrabold text-emerald-400 text-sm mt-0.5 block">
              +{deliveryCash.toLocaleString()} ر.ي
            </span>
            <span className="text-[10px] text-slate-500">من سندات DEL للمنافذ</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-slate-400 text-[10px] block">2. تحصيلات الديون (+)</span>
            <span className="font-extrabold text-emerald-400 text-sm mt-0.5 block">
              +{paymentCash.toLocaleString()} ر.ي
            </span>
            <span className="text-[10px] text-slate-500">من سندات PAY المقبوضة</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-slate-400 text-[10px] block">3. مبيعات الأفراد كاش (+)</span>
            <span className="font-extrabold text-emerald-400 text-sm mt-0.5 block">
              +{directCash.toLocaleString()} ر.ي
            </span>
            <span className="text-[10px] text-slate-500">من سندات DIR المباشرة</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-slate-400 text-[10px] block">4. المسلم للمسؤول (-)</span>
            <span className="font-extrabold text-rose-400 text-sm mt-0.5 block">
              -{acceptedHandoverCash.toLocaleString()} ر.ي
            </span>
            <span className="text-[10px] text-slate-500">سندات CSH المعتمدة</span>
          </div>
        </div>
      </div>

      {/* Immediate Inventory Table by Category */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-bold text-sm text-white">جرد عهد الكروت والشيتات حسب كل فئة</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              موقع الكروت الفعلي في الشبكة ومستوى الأمان ومراقبة الرصيد الحرج
            </p>
          </div>
          <div className="flex items-center gap-2">
            {currentRole === 'admin' && (
              <button
                onClick={() => setIsThresholdModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold transition cursor-pointer"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>ضبط حدود التنبيه الحرج</span>
              </button>
            )}
            <span className="text-xs text-slate-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
              {sheets.length} شيت إجمالي
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="p-3 font-bold">فئة الكرت</th>
                <th className="p-3 font-bold text-center">سعر الشيت بالجملة</th>
                <th className="p-3 font-bold text-center">عهدة المسؤول</th>
                <th className="p-3 font-bold text-center">عهدة الموزع (حالة المخزون)</th>
                <th className="p-3 font-bold text-center">مورد للمنافذ</th>
                <th className="p-3 font-bold text-center">تالف / مرتجع</th>
                <th className="p-3 font-bold text-center">الإجمالي الكلي</th>
                {currentRole === 'admin' && <th className="p-3 font-bold text-center">إجراء تنبيه</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {Object.keys(CARD_CATEGORIES_CONFIG).map((catKey) => {
                const cat = catKey as CardCategory;
                const config = CARD_CATEGORIES_CONFIG[cat];
                const catSheets = sheets.filter((s) => s.category === cat);
                const adminSheets = catSheets.filter((s) => s.status === 'admin_custody').length;
                const distSheets = catSheets.filter((s) => s.status === 'distributor_custody').length;
                const deliveredSheets = catSheets.filter((s) => s.status === 'delivered_outlet').length;
                const damagedSheets = catSheets.filter((s) => s.status === 'damaged').length;
                const threshold = criticalThresholds[cat] ?? 2;
                const isOutOfStock = distSheets === 0;
                const isCritical = distSheets > 0 && distSheets <= threshold;

                return (
                  <tr key={cat} className={`hover:bg-slate-850/40 transition ${isOutOfStock ? 'bg-rose-950/10' : isCritical ? 'bg-amber-950/10' : ''}`}>
                    <td className="p-3 font-bold text-white flex items-center gap-2">
                      <span className="w-7 h-7 rounded-lg bg-slate-800 text-amber-400 font-black flex items-center justify-center text-xs">
                        {cat}
                      </span>
                      <span>{config.name}</span>
                    </td>
                    <td className="p-3 text-center text-emerald-400 font-semibold">
                      {config.defaultWholesaleSheetPrice.toLocaleString()} ر.ي
                    </td>
                    <td className="p-3 text-center">
                      <span className="px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-400 font-bold border border-blue-500/20">
                        {adminSheets} شيت ({adminSheets * config.defaultCardsPerSheet} كرت)
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <div className="inline-flex flex-col items-center">
                        <span className={`px-2.5 py-1 rounded-lg font-bold border ${
                          isOutOfStock
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                            : isCritical
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        }`}>
                          {distSheets} شيت ({distSheets * config.defaultCardsPerSheet} كرت)
                        </span>

                        {isOutOfStock ? (
                          <span className="text-[10px] text-rose-400 font-bold mt-1 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> نفد بالكامل! 🚨
                          </span>
                        ) : isCritical ? (
                          <span className="text-[10px] text-amber-400 font-bold mt-1 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> رصيد حرج (حد: {threshold})
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500 mt-0.5">
                            آمن (حد التنبيه: {threshold})
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-center text-slate-300">
                      {deliveredSheets} شيت
                    </td>
                    <td className="p-3 text-center text-rose-400 font-bold">
                      {damagedSheets > 0 ? `${damagedSheets} شيت` : '0'}
                    </td>
                    <td className="p-3 text-center font-black text-white">
                      {catSheets.length} شيت
                    </td>
                    {currentRole === 'admin' && (
                      <td className="p-3 text-center">
                        <button
                          onClick={() => triggerStockAlertManually(cat)}
                          title={`تجربة إرسال تنبيه ونغمة لفئة ${cat}`}
                          className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 text-[11px] font-semibold border border-slate-700 transition inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Volume2 className="w-3 h-3" />
                          <span>فحص التنبيه</span>
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cash Handovers (CSH) History & Damaged Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cash Handovers to Admin */}
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-white">سندات تسليم الكاش للمسؤول (CSH)</h3>
              <p className="text-xs text-slate-400">تصفية المبالغ المحصلة وتسليمها للإدارة</p>
            </div>
            <span className="text-xs text-slate-400">{cashHandovers.length} سند</span>
          </div>

          <div className="space-y-2.5 max-h-72 overflow-y-auto">
            {cashHandovers.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">
                لا توجد سندات تسليم نقدية مسجلة بعد
              </p>
            ) : (
              cashHandovers.map((h) => (
                <div
                  key={h.id}
                  className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{h.id}</span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${
                          h.status === 'accepted'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : h.status === 'rejected'
                            ? 'bg-rose-500/20 text-rose-400'
                            : 'bg-amber-500/20 text-amber-400'
                        }`}
                      >
                        {h.status === 'accepted'
                          ? 'مستلم ومعتمد'
                          : h.status === 'rejected'
                          ? 'مرفوض'
                          : 'قيد الاعتماد'}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 mt-0.5 block">
                      {h.date} • {h.notes || 'تسليم نقدية محصلة'}
                    </span>
                  </div>

                  <div className="text-left flex items-center gap-3">
                    <span className="font-black text-sm text-emerald-400">
                      {h.amount.toLocaleString()} ر.ي
                    </span>

                    {/* Admin resolve actions */}
                    {currentRole === 'admin' && h.status === 'pending' && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => resolveCashHandover(h.id, 'accepted')}
                          className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition cursor-pointer"
                          title="تأكيد الاستلام"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => resolveCashHandover(h.id, 'rejected')}
                          className="p-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white transition cursor-pointer"
                          title="رفض"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Damaged and Returned Cards */}
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-white">سجل الكروت التالفة والمرتجعة (DMG)</h3>
              <p className="text-xs text-slate-400">توثيق أسباب التلف أو الإرجاع</p>
            </div>
            <span className="text-xs text-rose-400 font-bold">{damagedCards.length} حالات</span>
          </div>

          <div className="space-y-2.5 max-h-72 overflow-y-auto">
            {damagedCards.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">
                لا توجد كروت تالفة أو مرتجعة مسجلة (الوضع نظيف)
              </p>
            ) : (
              damagedCards.map((dmg) => (
                <div
                  key={dmg.id}
                  className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-rose-400">{dmg.id}</span>
                      <span className="text-white font-semibold">
                        فئة {dmg.category} ({dmg.cardsCount} كرت)
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 mt-0.5 block">
                      السبب: {dmg.reason}
                    </span>
                  </div>

                  <span className="text-[10px] text-slate-500">{dmg.date}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modal: Handover Cash to Admin */}
      {isHandoverModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-700 p-6 text-slate-100 shadow-2xl relative text-right">
            <button
              onClick={() => setIsHandoverModalOpen(false)}
              className="absolute left-4 top-4 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-extrabold text-white mb-2">
              تسليم نقدية محصلة للمسؤول (CSH)
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              سيتم إرسال السند للمسؤول وتأكيده لخصم المبلغ من عهدتك النقدية
            </p>

            <form onSubmit={handleSubmitHandover} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  المبلغ المسلّم (ر.ي)
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={handoverAmount || ''}
                  onChange={(e) => setHandoverAmount(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-emerald-400 focus:outline-hidden focus:border-emerald-500 font-black"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  ملاحظات التسليم
                </label>
                <input
                  type="text"
                  value={handoverNotes}
                  onChange={(e) => setHandoverNotes(e.target.value)}
                  placeholder="مثال: توريد نقدية الأسبوع، كاش نهاية اليوم..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsHandoverModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={handoverAmount <= 0}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs shadow-md transition"
                >
                  إرسال سند التسليم
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Damage Card Record */}
      {isDamageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-700 p-6 text-slate-100 shadow-2xl relative text-right">
            <button
              onClick={() => setIsDamageModalOpen(false)}
              className="absolute left-4 top-4 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-extrabold text-white mb-2">تسجيل كروت تالفة أو مرتجعة</h3>
            <p className="text-xs text-slate-400 mb-4">
              توثيق سبب التلف وخصم الكروت من العهدة التشغيلية
            </p>

            <form onSubmit={handleSubmitDamage} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">فئة الكرت</label>
                <select
                  value={damageCategory}
                  onChange={(e) => setDamageCategory(e.target.value as CardCategory)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-rose-500 font-bold"
                >
                  {Object.keys(CARD_CATEGORIES_CONFIG).map((c) => (
                    <option key={c} value={c}>
                      فئة {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">عدد الكروت</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={damageCardsCount}
                  onChange={(e) => setDamageCardsCount(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-rose-500 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  كود ورقة الشيت (اختياري)
                </label>
                <input
                  type="text"
                  placeholder="مثال: QZ-200-B1-S01"
                  value={damageSheetCode}
                  onChange={(e) => setDamageSheetCode(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-rose-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">سبب التلف أو الإرجاع</label>
                <textarea
                  required
                  rows={2}
                  placeholder="مثال: خطأ مطبعي في كود الشبكة، تلف الورقة بسبب المطر..."
                  value={damageReason}
                  onChange={(e) => setDamageReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-hidden focus:border-rose-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDamageModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs shadow-md transition"
                >
                  تأكيد التالف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Critical Stock Alert Thresholds Settings Modal */}
      {isThresholdModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-6 w-full max-w-lg shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-extrabold text-white">
                  ضبط حدود التنبيه الحرج للمخزون
                </h3>
              </div>
              <button
                onClick={() => setIsThresholdModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              يقوم النظام بإرسال إشعار فوري ونغمة تنبيه صوتية لجهاز المسؤول فور وصول رصيد الموزع الميداني من أي فئة إلى الحد الحرج الموضح أدناه (بالشيتات):
            </p>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {Object.keys(CARD_CATEGORIES_CONFIG).map((catKey) => {
                const cat = catKey as CardCategory;
                const config = CARD_CATEGORIES_CONFIG[cat];
                const currentVal = criticalThresholds[cat] ?? 2;
                const health = stockHealthList.find((h) => h.category === cat);

                return (
                  <div
                    key={cat}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-md bg-slate-800 text-amber-400 font-bold flex items-center justify-center text-xs">
                          {cat}
                        </span>
                        <span className="font-bold text-xs text-white">{config.name}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 block mt-1">
                        الرصيد الحالي لدى الموزع: {health?.distributorSheets ?? 0} شيت ({health?.statusLabel})
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setCriticalThreshold(cat, Math.max(1, currentVal - 1))}
                        className="w-7 h-7 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 font-bold text-sm flex items-center justify-center transition cursor-pointer"
                      >
                        -
                      </button>
                      <span className="w-12 text-center text-xs font-black text-amber-400 bg-slate-900 py-1.5 rounded-lg border border-slate-800">
                        {currentVal} شيت
                      </span>
                      <button
                        type="button"
                        onClick={() => setCriticalThreshold(cat, currentVal + 1)}
                        className="w-7 h-7 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 font-bold text-sm flex items-center justify-center transition cursor-pointer"
                      >
                        +
                      </button>
                      <button
                        type="button"
                        onClick={() => triggerStockAlertManually(cat)}
                        title="تجربة التنبيه الصوتي"
                        className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 transition cursor-pointer"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 border-t border-slate-800 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setIsThresholdModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition cursor-pointer"
              >
                إغلاق وحفظ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
