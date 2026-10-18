import React from 'react';
import {
  Layers,
  ArrowLeftRight,
  Store,
  Coins,
  TrendingUp,
  AlertCircle,
  PlusCircle,
  CheckCircle,
  Users,
  Shield,
  Sparkles,
  Printer,
  Bell,
  Volume2,
  ArrowRight,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from 'recharts';
import { useApp } from '../context/AppContext';
import { ActiveTab } from '../components/Sidebar';
import { CARD_CATEGORIES_CONFIG } from '../constants/cardConfig';
import { DistributorSalesChart } from '../components/DistributorSalesChart';

interface DashboardViewProps {
  onNavigate: (tab: ActiveTab) => void;
}

const COLORS = ['#f59e0b', '#10b981', '#3b82f6', '#a855f7', '#f43f5e', '#06b6d4'];

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const {
    currentRole,
    batches,
    sheets,
    outlets,
    deliveries,
    payments,
    distributorCashInHand,
    adminTotalCashCollected,
    totalOutletsDebt,
    totalPrintedCards,
    totalAdminCardsInCustody,
    totalDistributorCardsInCustody,
    totalDeliveredCards,
    settlements,
    stockHealthList,
    criticalCategoriesCount,
    quickInitiatePrintBatch,
    triggerStockAlertManually,
  } = useApp();

  const isZeroState = batches.length === 0 && deliveries.length === 0;

  // Chart 1 Data: Sheets / Cards by category
  const categoriesData = Object.keys(CARD_CATEGORIES_CONFIG).map((cat) => {
    const config = CARD_CATEGORIES_CONFIG[cat as keyof typeof CARD_CATEGORIES_CONFIG];
    const catSheets = sheets.filter((s) => s.category === cat);
    return {
      category: `${cat} ر.ي`,
      adminCount: catSheets.filter((s) => s.status === 'admin_custody').length,
      distributorCount: catSheets.filter((s) => s.status === 'distributor_custody').length,
      deliveredCount: catSheets.filter((s) => s.status === 'delivered_outlet').length,
      totalCount: catSheets.length,
      color: config.color,
    };
  });

  // Chart 2 Data: Outlet Debts and Deliveries
  const outletsChartData = outlets.slice(0, 6).map((o) => ({
    name: o.name.replace('منفذ ', '').replace('بقالة ', ''),
    debt: o.currentDebt,
    delivered: o.totalDeliveredAmount,
    paid: o.totalPaidAmount,
  }));

  // Status Distribution Pie
  const custodyPieData = [
    { name: 'عهدة المسؤول', value: totalAdminCardsInCustody, color: '#f59e0b' },
    { name: 'عهدة الموزع', value: totalDistributorCardsInCustody, color: '#10b981' },
    { name: 'موردة للمنافذ', value: totalDeliveredCards, color: '#3b82f6' },
  ].filter((item) => item.value > 0);

  return (
    <div className="space-y-6">
      {/* Zero State Guide Banner */}
      {isZeroState && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-slate-800 to-slate-900 border border-amber-500/30 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-amber-400">
                النظام جاهز ومصفّر بالكامل (Zero-State) لشخصين فقط
              </h3>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                جميع السجلات المحاسبية والدفعات والديون تبدأ من الصفر (0 ر.ي). ابدأ الآن بتسجيل أول دفعة طباعة كروت من حساب المسؤول ثم قم بتحويل شيتات إلى عهدة الموزع لتوريدها للمنافذ.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {currentRole === 'admin' ? (
              <button
                onClick={() => onNavigate('batches')}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition cursor-pointer"
              >
                + تسجيل أول دفعة طباعة
              </button>
            ) : (
              <span className="text-xs text-amber-300 bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20">
                بانتظار قيام المسؤول بطباعة وتحويل الكروت
              </span>
            )}
          </div>
        </div>
      )}

      {/* Role Notice Card */}
      <div className="flex items-center justify-between bg-slate-900 p-4 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
              currentRole === 'admin'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
            }`}
          >
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-extrabold text-sm sm:text-base text-white">
                {currentRole === 'admin' ? 'مرحباً، المسؤول والمدير العام' : 'مرحباً، الموزع الميداني'}
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                {currentRole === 'admin' ? 'كامل الصلاحيات والإشراف' : 'توريد وتحصيل ميداني'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              شبكة قعزان نت (QAZAN-NET) • نظام محاسبي وإداري دقيق شيت بشيت
            </p>
          </div>
        </div>

        {/* Quick Quick Actions */}
        <div className="flex items-center gap-2">
          {currentRole === 'admin' ? (
            <button
              onClick={() => onNavigate('batches')}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-bold border border-slate-700 transition cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              طباعة دفعة
            </button>
          ) : (
            <button
              onClick={() => onNavigate('outlets')}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-bold border border-slate-700 transition cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              توريد لمنفذ
            </button>
          )}
        </div>
      </div>

      {/* Smart Stock Alerts & Print Decision Center */}
      {currentRole === 'admin' && (
        <div className="space-y-3">
          {criticalCategoriesCount > 0 ? (
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-l from-rose-950/40 via-amber-950/30 to-slate-900 border border-amber-500/30 shadow-xl text-white">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center shrink-0 animate-pulse">
                    <Bell className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-sm sm:text-base text-white">
                        نظام التنبيهات الذكي: فئات كروت وصلت للحد الحرج لدى الموزع
                      </h3>
                      <span className="px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 font-mono text-[11px] font-bold">
                        {criticalCategoriesCount} فئة حرجة
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-0.5">
                      قم باتخاذ قرار الطباعة القادم الآن لتزويد الموزع الميداني ومنع نفاد الكروت في المنافذ
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => onNavigate('custody_cash')}
                    className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 font-semibold cursor-pointer"
                  >
                    <span>ضبط حدود التنبيه</span>
                    <ArrowRight className="w-3.5 h-3.5 rotate-180" />
                  </button>
                </div>
              </div>

              {/* Grid of Critical Categories with Print Advice */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
                {stockHealthList
                  .filter((h) => h.status === 'critical' || h.status === 'out_of_stock')
                  .map((item) => (
                    <div
                      key={item.category}
                      className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-amber-500/40 transition flex flex-col justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-extrabold text-sm text-white flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full"
                              style={{ backgroundColor: CARD_CATEGORIES_CONFIG[item.category].color }}
                            />
                            فئة {item.category} ريال
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              item.status === 'out_of_stock'
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            }`}
                          >
                            {item.statusLabel}
                          </span>
                        </div>

                        {/* Balance Breakdown */}
                        <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-950/60 p-2 rounded-lg border border-slate-800/60 mb-2">
                          <div>
                            <span className="text-slate-400 block text-[10px]">عهدة الموزع:</span>
                            <span className="font-bold text-rose-400">
                              {item.distributorSheets} شيت ({item.distributorCards} كرت)
                            </span>
                            <span className="text-[9px] text-slate-500 block">حد التنبيه: {item.thresholdSheets} شيت</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px]">مخزن المسؤول:</span>
                            <span className={`font-bold ${item.adminSheets === 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                              {item.adminSheets} شيت ({item.adminCards} كرت)
                            </span>
                            <span className="text-[9px] text-slate-500 block">
                              {item.adminSheets === 0 ? 'المخزن فارغ' : 'جاهز للتحويل'}
                            </span>
                          </div>
                        </div>

                        {/* Print Recommendation */}
                        <div className="text-[11px] text-slate-300 leading-relaxed bg-amber-500/10 border border-amber-500/20 p-2 rounded-lg">
                          <span className="text-amber-400 font-bold block mb-0.5">💡 توصية قرار الطباعة:</span>
                          طباعة دفعة قادمة بـ <strong className="text-white">{item.recommendedPrintSheets} شيت</strong> ({item.recommendedPrintSheets * CARD_CATEGORIES_CONFIG[item.category].defaultCardsPerSheet} كرت) بقيمة جملة <strong className="text-amber-300">{item.recommendedPrintWholesaleValue.toLocaleString()} ر.ي</strong>.
                        </div>
                      </div>

                      {/* Action Button */}
                      <button
                        onClick={() => quickInitiatePrintBatch(item.category, item.recommendedPrintSheets)}
                        className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-md transition cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>طباعة الدفعة المقترحة فوراً ({item.recommendedPrintSheets} شيت)</span>
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-emerald-500/20 text-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0" />
                <span>
                  <strong className="text-white font-bold">مستويات المخزون مستقرة:</strong> جميع فئات الكروت لدى الموزع أعلى من حدود التنبيه الحرجة.
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => triggerStockAlertManually('500')}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 flex items-center gap-1.5 text-[11px] font-medium transition cursor-pointer"
                  title="تجربة صوت وإشعار التنبيه الذكي"
                >
                  <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                  <span>اختبار التنبيه الصوتي الذكي</span>
                </button>
                <button
                  onClick={() => onNavigate('custody_cash')}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 flex items-center gap-1 text-[11px] font-medium transition cursor-pointer"
                >
                  <span>حدود التنبيه</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
        {/* KPI 1: Printed Cards */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">إجمالي المطبوع</span>
            <Layers className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-lg sm:text-xl font-extrabold text-white">
            {totalPrintedCards.toLocaleString()}
            <span className="text-xs font-normal text-slate-400 mr-1">كرت</span>
          </div>
          <div className="text-[11px] text-amber-400/90 mt-1">
            {sheets.length} شيت في {batches.length} دفعة
          </div>
        </div>

        {/* KPI 2: Admin Custody */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">عهدة المسؤول</span>
            <Shield className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-lg sm:text-xl font-extrabold text-blue-400">
            {totalAdminCardsInCustody.toLocaleString()}
            <span className="text-xs font-normal text-slate-400 mr-1">كرت</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {sheets.filter((s) => s.status === 'admin_custody').length} شيت جاهز للتحويل
          </div>
        </div>

        {/* KPI 3: Distributor Custody */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">عهدة الموزع</span>
            <ArrowLeftRight className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-lg sm:text-xl font-extrabold text-emerald-400">
            {totalDistributorCardsInCustody.toLocaleString()}
            <span className="text-xs font-normal text-slate-400 mr-1">كرت</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {sheets.filter((s) => s.status === 'distributor_custody').length} شيت في الميدان
          </div>
        </div>

        {/* KPI 4: Delivered to Outlets */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">المورد للمنافذ</span>
            <Store className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-lg sm:text-xl font-extrabold text-purple-400">
            {totalDeliveredCards.toLocaleString()}
            <span className="text-xs font-normal text-slate-400 mr-1">كرت</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            عبر {deliveries.length} سند توريد
          </div>
        </div>

        {/* KPI 5: Outlets Total Debt */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">ديون المنافذ</span>
            <AlertCircle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-lg sm:text-xl font-extrabold text-rose-400">
            {totalOutletsDebt.toLocaleString()}
            <span className="text-xs font-normal text-slate-400 mr-1">ر.ي</span>
          </div>
          <div className="text-[11px] text-rose-300/80 mt-1">
            على {outlets.filter((o) => o.currentDebt > 0).length} منفذ نشط
          </div>
        </div>

        {/* KPI 6: Distributor Cash in Hand */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-emerald-500/30 bg-emerald-950/20 hover:border-emerald-500/50 transition shadow-sm">
          <div className="flex items-center justify-between text-emerald-400 mb-2">
            <span className="text-xs font-bold">كاش يد الموزع</span>
            <Coins className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-lg sm:text-xl font-extrabold text-emerald-400">
            {distributorCashInHand.toLocaleString()}
            <span className="text-xs font-normal text-emerald-300/80 mr-1">ر.ي</span>
          </div>
          <div className="text-[11px] text-emerald-300/80 mt-1">
            محصل وجاهز للتوريد
          </div>
        </div>
      </div>

      {/* Interactive Daily & Weekly Distributor Card Sales Chart (Recharts) */}
      <DistributorSalesChart onNavigate={onNavigate} />

      {/* Main Interactive Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left (2 cols): Outlets Debt vs Deliveries */}
        <div className="lg:col-span-2 bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-white">حركة توريد المنافذ والديون الحالية</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                مقارنة المبالغ الموردة والديون المتبقية لكل منفذ
              </p>
            </div>
            <button
              onClick={() => onNavigate('outlet_performance')}
              className="text-xs font-semibold text-amber-400 hover:text-amber-300 transition"
            >
              عرض تقرير الأداء ←
            </button>
          </div>

          <div className="h-72 w-full pt-2">
            {outlets.some((o) => o.totalDeliveredAmount > 0 || o.currentDebt > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={outletsChartData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '0.75rem',
                      direction: 'rtl',
                      color: '#f8fafc',
                    }}
                    formatter={(val: any) => [val != null ? `${Number(val).toLocaleString()} ر.ي` : '0 ر.ي']}
                  />
                  <Bar dataKey="delivered" name="إجمالي التوريدات" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="paid" name="المسدد" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="debt" name="الدين الحالي" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 border border-dashed border-slate-800 rounded-xl">
                <Store className="w-8 h-8 text-slate-400 mb-2" />
                <p className="text-xs font-semibold">لا توجد حركات توريد أو ديون مسجلة بعد</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  أرصدة جميع المنافذ حالياً مصفّرة (0 ر.ي)
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right (1 col): Card Custody Distribution */}
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-sm text-white">توزيع عهد الكروت</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              موقع الكروت الفعلي (المسؤول / الموزع / المنافذ)
            </p>
          </div>

          <div className="h-52 w-full flex items-center justify-center">
            {custodyPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={custodyPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {custodyPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '0.75rem',
                      direction: 'rtl',
                    }}
                    formatter={(val: any) => [val != null ? `${Number(val).toLocaleString()} كرت` : '0 كرت']}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-slate-400 py-6">
                <Layers className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-xs">لم يتم طباعة كروت بعد</p>
              </div>
            )}
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-800 text-xs">
            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                عهدة المسؤول:
              </span>
              <span className="font-bold">{totalAdminCardsInCustody.toLocaleString()} كرت</span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                عهدة الموزع:
              </span>
              <span className="font-bold">{totalDistributorCardsInCustody.toLocaleString()} كرت</span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                مورد للمنافذ:
              </span>
              <span className="font-bold">{totalDeliveredCards.toLocaleString()} كرت</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Launchpad Buttons */}
      <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800">
        <h3 className="font-bold text-sm text-white mb-4">إجراءات سريعة ومحاسبية</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <button
            onClick={() => onNavigate('batches')}
            className="p-3.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 text-right transition cursor-pointer hover:border-amber-500/50 group"
          >
            <Layers className="w-5 h-5 text-amber-400 mb-2 group-hover:scale-110 transition-transform" />
            <div className="font-bold text-xs text-white">طباعة دفعة كروت</div>
            <div className="text-[10px] text-slate-400 mt-0.5">تسجيل شيتات وفئات</div>
          </button>

          <button
            onClick={() => onNavigate('transfers')}
            className="p-3.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 text-right transition cursor-pointer hover:border-emerald-500/50 group"
          >
            <ArrowLeftRight className="w-5 h-5 text-emerald-400 mb-2 group-hover:scale-110 transition-transform" />
            <div className="font-bold text-xs text-white">تحويل عهدة (TR)</div>
            <div className="text-[10px] text-slate-400 mt-0.5">من المدير للموزع</div>
          </button>

          <button
            onClick={() => onNavigate('outlets')}
            className="p-3.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 text-right transition cursor-pointer hover:border-blue-500/50 group"
          >
            <Store className="w-5 h-5 text-blue-400 mb-2 group-hover:scale-110 transition-transform" />
            <div className="font-bold text-xs text-white">توريد لمنفذ (DEL)</div>
            <div className="text-[10px] text-slate-400 mt-0.5">تسجيل بيع ودين المنافذ</div>
          </button>

          <button
            onClick={() => onNavigate('outlets')}
            className="p-3.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 text-right transition cursor-pointer hover:border-purple-500/50 group"
          >
            <Coins className="w-5 h-5 text-purple-400 mb-2 group-hover:scale-110 transition-transform" />
            <div className="font-bold text-xs text-white">سند قبض (PAY)</div>
            <div className="text-[10px] text-slate-400 mt-0.5">تحصيل نقدية المنفذ</div>
          </button>

          <button
            onClick={() => onNavigate('custody_cash')}
            className="p-3.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 text-right transition cursor-pointer hover:border-rose-500/50 group"
          >
            <TrendingUp className="w-5 h-5 text-rose-400 mb-2 group-hover:scale-110 transition-transform" />
            <div className="font-bold text-xs text-white">تسليم كاش للمدير (CSH)</div>
            <div className="text-[10px] text-slate-400 mt-0.5">تصفية العهدة النقدية</div>
          </button>
        </div>
      </div>
    </div>
  );
};
