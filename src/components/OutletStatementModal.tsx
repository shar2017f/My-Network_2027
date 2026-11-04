import React, { useState, useMemo } from 'react';
import {
  X,
  Printer,
  MessageCircle,
  Copy,
  Check,
  TrendingDown,
  TrendingUp,
  Receipt,
  Phone,
  MapPin,
  Calendar,
  Layers,
  Coins,
  ShieldCheck,
  ArrowUpRight,
  ArrowDownLeft,
  Filter,
} from 'lucide-react';
import { Outlet, DeliveryVoucher, PaymentVoucher } from '../types';
import { CARD_CATEGORIES_CONFIG } from '../constants/cardConfig';

interface OutletStatementModalProps {
  outlet: Outlet | null;
  isOpen: boolean;
  onClose: () => void;
  deliveries: DeliveryVoucher[];
  payments: PaymentVoucher[];
}

interface StatementEntry {
  id: string;
  date: string;
  type: 'DEL' | 'PAY';
  title: string;
  category?: string;
  quantityStr?: string;
  debit: number; // دين على المنفذ (توريد)
  credit: number; // مسدد من المنفذ (قبض)
  runningBalance: number; // الرصيد التراكمي بعد الحركة
  notes?: string;
  actor: string;
}

export const OutletStatementModal: React.FC<OutletStatementModalProps> = ({
  outlet,
  isOpen,
  onClose,
  deliveries,
  payments,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'DEL' | 'PAY'>('all');
  const [copiedSuccess, setCopiedSuccess] = useState(false);

  // Calculate chronological entries with running balance
  const { ledgerEntries, totalDebits, totalCredits, netBalance } = useMemo(() => {
    if (!outlet) {
      return { ledgerEntries: [], totalDebits: 0, totalCredits: 0, netBalance: 0 };
    }

    const outletDeliveries = deliveries.filter((d) => d.outletId === outlet.id);
    const outletPayments = payments.filter((p) => p.outletId === outlet.id);

    // Raw items
    const rawItems: Array<{
      id: string;
      date: string;
      timestamp: number;
      type: 'DEL' | 'PAY';
      title: string;
      category?: string;
      quantityStr?: string;
      debit: number;
      credit: number;
      notes?: string;
      actor: string;
    }> = [];

    outletDeliveries.forEach((d) => {
      const cfg = CARD_CATEGORIES_CONFIG[d.category];
      const quantityStr =
        d.deliveryUnit === 'cards'
          ? `${d.cardsCount} كرت`
          : `${d.sheetsCount} شيت (${d.cardsCount} كرت)`;

      rawItems.push({
        id: d.id,
        date: d.date,
        timestamp: new Date(d.date).getTime() || 0,
        type: 'DEL',
        title: `توريد كروت فئة ${d.category} ر.ي`,
        category: d.category,
        quantityStr,
        debit: d.totalAmount, // القيمة الإجمالية للتوريد
        credit: d.cashPaidNow || 0, // ما سدده المنفذ كاش فوراً بالسند
        notes: d.notes,
        actor: d.deliveredBy,
      });
    });

    outletPayments.forEach((p) => {
      rawItems.push({
        id: p.id,
        date: p.date,
        timestamp: new Date(p.date).getTime() || 0,
        type: 'PAY',
        title: `سند قبض نقدية (${p.paymentMethod === 'cash' ? 'كاش' : 'حوالة بنكية'})`,
        debit: 0,
        credit: p.amount,
        notes: p.notes,
        actor: p.collectorName,
      });
    });

    // Sort chronologically ascending (oldest first) to compute running balance correctly
    rawItems.sort((a, b) => {
      if (a.date !== b.date) {
        return a.date.localeCompare(b.date);
      }
      return a.id.localeCompare(b.id);
    });

    let currentBalance = 0;
    let sumDebits = 0;
    let sumCredits = 0;

    const computed: StatementEntry[] = rawItems.map((item) => {
      sumDebits += item.debit;
      sumCredits += item.credit;
      // Net change for this operation = debit - credit
      currentBalance += item.debit - item.credit;

      return {
        id: item.id,
        date: item.date,
        type: item.type,
        title: item.title,
        category: item.category,
        quantityStr: item.quantityStr,
        debit: item.debit,
        credit: item.credit,
        runningBalance: currentBalance,
        notes: item.notes,
        actor: item.actor,
      };
    });

    // For display, reverse so latest appears on top, while preserving correct runningBalance
    return {
      ledgerEntries: computed.reverse(),
      totalDebits: sumDebits,
      totalCredits: sumCredits,
      netBalance: currentBalance,
    };
  }, [outlet, deliveries, payments]);

  if (!isOpen || !outlet) return null;

  const currentDebt = outlet.currentDebt || 0;
  const creditLimit = outlet.creditLimit || 100000;
  const isOverLimit = creditLimit > 0 && currentDebt >= creditLimit;

  // Filtered entries
  const displayedEntries = ledgerEntries.filter((e) => {
    if (filterType === 'all') return true;
    return e.type === filterType;
  });

  // Generate WhatsApp formatted statement text
  const generateWhatsAppText = () => {
    const today = new Date().toISOString().split('T')[0];
    const topRecent = ledgerEntries.slice(0, 5);

    let text =
      `*📄 كشف حساب رسمي - شبكة قعزان نت*\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `👤 *المنفذ:* ${outlet.name}\n` +
      `👤 *المالك:* ${outlet.ownerName || outlet.name}\n` +
      `📍 *الموقع:* ${outlet.location || 'غير محدد'}\n` +
      `📅 *تاريخ الكشف:* ${today}\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `📊 *الموقف المالي العام:*\n` +
      `• إجمالي التوريدات (مدين): ${totalDebits.toLocaleString()} ر.ي\n` +
      `• إجمالي المسدد (دائن): ${totalCredits.toLocaleString()} ر.ي\n` +
      `• *🔴 صافي الرصيد المستحق حالياً:* ${currentDebt.toLocaleString()} ر.ي\n` +
      `• سقف الدين المعتمد: ${creditLimit.toLocaleString()} ر.ي\n` +
      `━━━━━━━━━━━━━━━━━━━━\n`;

    if (topRecent.length > 0) {
      text += `📝 *آخر الحركات المسجلة:*\n`;
      topRecent.forEach((e) => {
        const sign = e.type === 'DEL' ? '➕ توريد' : '➖ سداد';
        const amt = e.type === 'DEL' ? e.debit : e.credit;
        text += `• ${e.date} | ${e.id} | ${sign}: ${amt.toLocaleString()} ر.ي (الرصيد: ${e.runningBalance.toLocaleString()} ر.ي)\n`;
      });
      text += `━━━━━━━━━━━━━━━━━━━━\n`;
    }

    text +=
      `يرجى مطابقة الحساب والمبادرة بالتسديد.\n` +
      `مع تحيات إدارة شبكة قعزان نت 🌐\n` +
      `هاتف الإدارة: 775086300`;

    return text;
  };

  const handleOpenWhatsApp = () => {
    const phone = outlet.phone?.replace(/\D/g, '') || '';
    const cleanPhone = phone.startsWith('967') ? phone : `967${phone}`;
    const text = generateWhatsAppText();
    const url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleCopyStatement = () => {
    const text = generateWhatsAppText();
    navigator.clipboard.writeText(text).then(() => {
      setCopiedSuccess(true);
      setTimeout(() => setCopiedSuccess(false), 2500);
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-2 sm:p-4 animate-in fade-in">
      <div className="w-full max-w-4xl max-h-[92vh] rounded-2xl bg-slate-900 border border-slate-700 text-slate-100 shadow-2xl relative text-right flex flex-col overflow-hidden">
        
        {/* Printable Header (Visible only during window.print()) */}
        <div className="hidden print:block p-6 text-slate-950 bg-white border-b-2 border-slate-900">
          <div className="flex items-center justify-between pb-4 border-b border-slate-300">
            <div>
              <h1 className="text-2xl font-black">شبكة قعزان نت لخدمات الإنترنت</h1>
              <p className="text-sm text-slate-600">إدارة ومحاسبة وتوزيع كروت الإنترنت والعهد</p>
            </div>
            <div className="text-left font-mono text-xs">
              <p className="font-bold">كشف حساب عميل معتمد</p>
              <p>تاريخ الطباعة: {new Date().toLocaleDateString('ar-YE')}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 pt-4 text-xs">
            <div>
              <span className="font-bold">اسم المنفذ:</span> {outlet.name}
            </div>
            <div>
              <span className="font-bold">المالك:</span> {outlet.ownerName}
            </div>
            <div>
              <span className="font-bold">الهاتف:</span> {outlet.phone || '—'}
            </div>
          </div>
        </div>

        {/* Modal Top Bar (Screen View) */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between shrink-0 no-print">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold border border-blue-500/30">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white">
                  كشف حساب المنفذ: {outlet.name}
                </h3>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-blue-500/10 text-blue-300 border border-blue-500/20">
                  {outlet.id}
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-3 mt-0.5">
                <span>المالك: {outlet.ownerName || outlet.name}</span>
                {outlet.phone && (
                  <span className="flex items-center gap-1 font-mono" dir="ltr">
                    <Phone className="w-3 h-3 text-slate-500" />
                    {outlet.phone}
                  </span>
                )}
                {outlet.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-500" />
                    {outlet.location}
                  </span>
                )}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Financial KPI Summary Cards */}
        <div className="p-4 sm:p-5 grid grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-950/40 border-b border-slate-800 shrink-0">
          {/* 1. Total Delivered */}
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>إجمالي المسحوبات (مدين):</span>
              <ArrowUpRight className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-sm sm:text-base font-black text-white font-mono">
              {totalDebits.toLocaleString()} <span className="text-xs font-normal text-slate-400">ر.ي</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              {deliveries.filter((d) => d.outletId === outlet.id).length} سندات توريد
            </div>
          </div>

          {/* 2. Total Paid */}
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>إجمالي المسدد (دائن):</span>
              <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-sm sm:text-base font-black text-emerald-400 font-mono">
              {totalCredits.toLocaleString()} <span className="text-xs font-normal text-emerald-500/70">ر.ي</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              شاملاً كاش التوريد وسندات القبض
            </div>
          </div>

          {/* 3. Outstanding Current Debt */}
          <div className={`p-3 rounded-xl border ${
            currentDebt > 0
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
          }`}>
            <div className="flex items-center justify-between text-xs mb-1 opacity-90">
              <span className="font-bold">الرصيد المتبقي المستحق:</span>
              <Coins className="w-4 h-4" />
            </div>
            <div className="text-base sm:text-lg font-black font-mono">
              {currentDebt.toLocaleString()} <span className="text-xs font-normal">ر.ي</span>
            </div>
            <div className="text-[10px] mt-0.5 font-bold">
              {currentDebt > 0 ? 'مستحق الدفع على المنفذ' : 'الحساب مصفّر تماماً ✓'}
            </div>
          </div>

          {/* 4. Credit Limit & Ratio */}
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>سقف الائتمان:</span>
              <ShieldCheck className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-sm sm:text-base font-black text-slate-200 font-mono">
              {creditLimit.toLocaleString()} <span className="text-xs font-normal text-slate-400">ر.ي</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              نسبة الاستهلاك:{' '}
              <span className={`font-bold ${isOverLimit ? 'text-rose-400' : 'text-amber-400'}`}>
                {creditLimit > 0 ? Math.round((currentDebt / creditLimit) * 100) : 0}%
              </span>
            </div>
          </div>
        </div>

        {/* Toolbar: Share, WhatsApp, Print, Filter (Screen View) */}
        <div className="p-3 sm:px-5 border-b border-slate-800 bg-slate-950/60 flex flex-wrap items-center justify-between gap-2.5 no-print">
          {/* Quick Filter buttons */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-400 text-[11px] ml-1">عرض:</span>
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer text-xs ${
                filterType === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              جميع الحركات ({ledgerEntries.length})
            </button>
            <button
              onClick={() => setFilterType('DEL')}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer text-xs ${
                filterType === 'DEL'
                  ? 'bg-blue-500 text-white'
                  : 'bg-slate-800 text-blue-400 hover:text-white'
              }`}
            >
              التوريدات فقط ({ledgerEntries.filter((e) => e.type === 'DEL').length})
            </button>
            <button
              onClick={() => setFilterType('PAY')}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer text-xs ${
                filterType === 'PAY'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-800 text-emerald-400 hover:text-white'
              }`}
            >
              السدادات فقط ({ledgerEntries.filter((e) => e.type === 'PAY').length})
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyStatement}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-slate-700"
              title="نسخ ملخص كشف الحساب للحافظة"
            >
              {copiedSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">تم النسخ بنجاح!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span>نسخ الكشف</span>
                </>
              )}
            </button>

            <button
              onClick={handleOpenWhatsApp}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-600/20"
              title="إرسال كشف الحساب مباشرة للعميل عبر واتساب"
            >
              <MessageCircle className="w-4 h-4" />
              <span>مشاركة عبر واتساب 📲</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-slate-700"
              title="طباعة كشف الحساب بصيغة A4 أو إيصال"
            >
              <Printer className="w-4 h-4 text-slate-400" />
              <span>طباعة 🖨️</span>
            </button>
          </div>
        </div>

        {/* Ledger Entries Table */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5">
          {displayedEntries.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs">
              لا توجد حركات مسجلة تطابق التصفية المختارة.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/90 text-slate-400 font-bold">
                    <th className="p-3">التاريخ</th>
                    <th className="p-3">رقم السند</th>
                    <th className="p-3">البيان والتفاصيل</th>
                    <th className="p-3 text-blue-400">مدين (سحب)</th>
                    <th className="p-3 text-emerald-400">دائن (سداد)</th>
                    <th className="p-3 text-amber-400">الرصيد التراكمي</th>
                    <th className="p-3 text-slate-400">القائم بالعملية</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {displayedEntries.map((entry) => (
                    <tr
                      key={entry.id}
                      className="hover:bg-slate-900/60 transition"
                    >
                      <td className="p-3 text-slate-300 whitespace-nowrap">{entry.date}</td>
                      <td className="p-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-md font-bold text-[11px] ${
                            entry.type === 'DEL'
                              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                              : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          }`}
                        >
                          {entry.id}
                        </span>
                      </td>
                      <td className="p-3 text-slate-200 font-sans min-w-[180px]">
                        <div>{entry.title}</div>
                        {entry.quantityStr && (
                          <div className="text-[11px] text-slate-400 font-mono">{entry.quantityStr}</div>
                        )}
                        {entry.notes && (
                          <div className="text-[10px] text-slate-400 italic font-sans">{entry.notes}</div>
                        )}
                      </td>
                      <td className="p-3 text-blue-300 font-black whitespace-nowrap">
                        {entry.debit > 0 ? `${entry.debit.toLocaleString()} ر.ي` : '—'}
                      </td>
                      <td className="p-3 text-emerald-400 font-black whitespace-nowrap">
                        {entry.credit > 0 ? `${entry.credit.toLocaleString()} ر.ي` : '—'}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <span
                          className={`font-black ${
                            entry.runningBalance > 0
                              ? 'text-rose-400'
                              : entry.runningBalance < 0
                              ? 'text-emerald-400'
                              : 'text-slate-400'
                          }`}
                        >
                          {entry.runningBalance.toLocaleString()} ر.ي
                        </span>
                      </td>
                      <td className="p-3 text-slate-400 font-sans text-[11px] whitespace-nowrap">
                        {entry.actor}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Printable Signature Section (Visible only when printing) */}
          <div className="hidden print:grid grid-cols-2 gap-8 pt-12 text-slate-950 text-xs mt-8 border-t border-slate-300">
            <div className="text-center space-y-8">
              <p className="font-bold">توقيع وختم صاحب المنفذ (المستلم):</p>
              <div className="border-b border-dashed border-slate-400 w-48 mx-auto" />
            </div>
            <div className="text-center space-y-8">
              <p className="font-bold">توقيع إدارة شبكة قعزان نت:</p>
              <div className="border-b border-dashed border-slate-400 w-48 mx-auto" />
            </div>
          </div>
        </div>

        {/* Modal Footer (Screen View) */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between shrink-0 no-print">
          <div className="text-xs text-slate-400">
            شبكة قعزان نت • جميع القيود المالية مشفرة ومدققة تلقائياً
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition cursor-pointer"
          >
            إغلاق الكشف
          </button>
        </div>

      </div>
    </div>
  );
};
