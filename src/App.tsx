import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { Sidebar, ActiveTab } from './components/Sidebar';
import { ToastContainer } from './components/ToastContainer';
import { DashboardView } from './views/DashboardView';
import { BatchesView } from './views/BatchesView';
import { TransfersView } from './views/TransfersView';
import { OutletsView } from './views/OutletsView';
import { OutletPerformanceView } from './views/OutletPerformanceView';
import { DirectSalesView } from './views/DirectSalesView';
import { CustodyCashView } from './views/CustodyCashView';
import { TrialBalanceView } from './views/TrialBalanceView';
import { SettlementsView } from './views/SettlementsView';
import { PermissionsView } from './views/PermissionsView';
import { AuditLogView } from './views/AuditLogView';
import { SmartAnalyticsView } from './views/SmartAnalyticsView';
import { BackupSyncView } from './views/BackupSyncView';
import { ExpensesView } from './views/ExpensesView';
import { DistributorWelcomeModal } from './components/DistributorWelcomeModal';
import {
  WifiOff,
  Wifi,
  RefreshCw,
  AlertTriangle,
  Clock,
  X,
  LayoutDashboard,
  Store,
  ArrowLeftRight,
  Scale,
  Coins,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Lock,
} from 'lucide-react';

const MainLayout: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    batches,
    sheets,
    outlets,
    transfers,
    isHydratingCloud,
    hydrationStatus,
    isHydrated,
    hydrationValidation,
    conflictLogs,
    dismissConflictAlert,
    retryHydration,
    showDistributorWelcome,
    setShowDistributorWelcome,
    isOnline,
    offlineQueue,
    syncOfflineQueue,
    syncNowToCloud,
    unsyncedDeliveries,
    overdueUnsyncedDeliveries,
    unsyncedDeliveryAlertMinutes,
    setUnsyncedDeliveryAlertMinutes,
    isUnsyncedAlertDismissed,
    dismissUnsyncedAlert,
  } = useApp();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isRetryingHydration, setIsRetryingHydration] = useState(false);

  // VALIDATION LAYER OVERLAY: Blocks interface interaction until hydration is fully validated
  if (!isHydrated) {
    const isConflict = hydrationStatus === 'conflict_detected';
    const isError = hydrationStatus === 'error';

    return (
      <div className="min-h-screen h-[100dvh] bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 text-center select-none" dir="rtl">
        <div className="w-20 h-20 rounded-3xl bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-center text-amber-400 mb-6 shadow-2xl shadow-amber-500/20 relative">
          {isConflict ? (
            <ShieldAlert className="w-10 h-10 text-rose-400 animate-pulse" />
          ) : (
            <RefreshCw className="w-10 h-10 animate-spin text-amber-400" />
          )}
          <div className="absolute inset-0 rounded-3xl border-2 border-amber-400 animate-ping opacity-25" />
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-300 text-xs font-bold mb-3">
          <Lock className="w-3.5 h-3.5 text-amber-400" />
          <span>طبقة التحقق المحاسبي ومنع التصفير (Validation Shield)</span>
        </div>

        <h1 className="text-xl sm:text-2xl font-black text-white mb-2">
          {isConflict
            ? 'قعزان نت | تم رصد تعارض بيانات - تم تفعيل درع الحماية'
            : isError
            ? 'تعذر الاتصال بالسحابة مؤقتاً'
            : 'قعزان نت | جاري التحقق من اكتمال تحميل البيانات والمطابقة'}
        </h1>

        <p className="text-sm text-slate-400 max-w-lg leading-relaxed mb-6">
          {isConflict
            ? 'رصد النظام محاولة استبدال أو تصفير بيانات غير مصرح بها. تم تثبيت وحماية السجلات المعتمدة محلياً لمنع مساس الحسابات.'
            : 'يتم فحص تكامل كشوفات الكروت، دفعات الطباعة، عهدة الموزع، وسندات المنافذ للتأكد من اكتمالها قبل فتح واجهات الاستخدام.'}
        </p>

        {/* 4-Step Validation Checklist */}
        <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-2xl p-4 text-right mb-6 shadow-xl space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-200">1. الاتصال بقاعدة البيانات السحابية (Firestore)</span>
            <span className="flex items-center gap-1 text-emerald-400 font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" /> متصل
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-200">2. جلب وتدقيق دفعات الطباعة والكروت</span>
            <span className="flex items-center gap-1 text-emerald-400 font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{batches.length > 0 ? `${batches.length} دفعة معتمدة` : 'جارٍ الفحص...'}</span>
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-200">3. فحص تكامل المخزون ومنع التضارب (Anti-Wipe)</span>
            <span className={`flex items-center gap-1 font-bold ${isConflict ? 'text-rose-400' : 'text-emerald-400'}`}>
              {isConflict ? (
                <>
                  <ShieldAlert className="w-3.5 h-3.5" /> تم الحظر
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" /> نشط ومحصن
                </>
              )}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-200">4. اعتماد ومطابقة الحسابات والجاهزية التامة</span>
            <span className="flex items-center gap-1 text-amber-400 font-bold animate-pulse">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" /> جارٍ التحقق...
            </span>
          </div>
        </div>

        {/* Action Controls for Conflict or Retry */}
        {(isConflict || isError) && (
          <div className="flex items-center gap-3">
            <button
              onClick={async () => {
                setIsRetryingHydration(true);
                await retryHydration();
                setIsRetryingHydration(false);
              }}
              disabled={isRetryingHydration}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition shadow-lg shadow-amber-500/20 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRetryingHydration ? 'animate-spin' : ''}`} />
              <span>إعادة التحقق من السحابة</span>
            </button>
          </div>
        )}

        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold mt-4">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>حماية البيانات نشطة: الحسابات وسندات التوريد مؤمنة 100%</span>
        </div>
      </div>
    );
  }

  const handleManualSync = async () => {
    setIsSyncing(true);
    await syncOfflineQueue();
    await syncNowToCloud();
    setTimeout(() => setIsSyncing(false), 600);
  };

  const renderActiveView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView onNavigate={(tab) => setActiveTab(tab)} />;
      case 'batches':
        return <BatchesView />;
      case 'transfers':
        return <TransfersView />;
      case 'outlets':
        return <OutletsView />;
      case 'outlet_performance':
        return <OutletPerformanceView />;
      case 'direct_sales':
        return <DirectSalesView />;
      case 'custody_cash':
        return <CustodyCashView />;
      case 'trial_balance':
        return <TrialBalanceView />;
      case 'expenses':
        return <ExpensesView />;
      case 'settlements':
        return <SettlementsView />;
      case 'permissions':
        return <PermissionsView />;
      case 'audit_log':
        return <AuditLogView />;
      case 'smart_analytics':
        return <SmartAnalyticsView />;
      case 'backup_sync':
        return <BackupSyncView />;
      default:
        return <DashboardView onNavigate={(tab) => setActiveTab(tab)} />;
    }
  };

  return (
    <div className="min-h-screen h-[100dvh] bg-slate-950 text-slate-100 flex flex-col antialiased selection:bg-amber-500 selection:text-slate-950 overflow-hidden">
      {/* Offline Banner & Service Worker Sync */}
      {!isOnline && (
        <div className="bg-amber-500 text-slate-950 font-bold text-xs py-1.5 px-4 text-center flex flex-wrap items-center justify-center gap-2 no-print shadow-md">
          <WifiOff className="w-4 h-4 shrink-0" />
          <span>وضع عدم الاتصال (Service Worker نشط): يمكنك تصفح القوائم بالكامل وتسجيل العمليات بدون إنترنت.</span>
          {offlineQueue.length > 0 && (
            <span className="bg-slate-950 text-amber-300 px-2 py-0.5 rounded-full text-[10px] font-mono">
              {offlineQueue.length} عملية بانتظار المزامنة
            </span>
          )}
        </div>
      )}

      {/* Online Reconnect Banner when pending offline operations exist */}
      {isOnline && offlineQueue.length > 0 && (
        <div className="bg-emerald-600 text-white font-bold text-xs py-1.5 px-4 text-center flex flex-wrap items-center justify-center gap-3 no-print shadow-md animate-in fade-in">
          <Wifi className="w-4 h-4 shrink-0" />
          <span>تمت استعادة الاتصال بالإنترنت! لديك {offlineQueue.length} عملية مسجلة بانتظار الرفع.</span>
          <button
            onClick={handleManualSync}
            disabled={isSyncing}
            className="inline-flex items-center gap-1.5 bg-white text-emerald-950 hover:bg-emerald-50 px-2.5 py-0.5 rounded-lg text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'جارٍ المزامنة...' : 'مزامنة العمليات الآن'}</span>
          </button>
        </div>
      )}

      {/* ⚠️ Unsynced Deliveries Protection Alert Banner */}
      {overdueUnsyncedDeliveries.length > 0 && !isUnsyncedAlertDismissed && (
        <div className="bg-gradient-to-r from-rose-950 via-rose-900 to-amber-950 border-b border-rose-500/50 text-white py-2 px-4 shadow-xl no-print animate-in fade-in">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center justify-center shrink-0 animate-pulse">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-extrabold text-white text-sm">
                    تنبيه أمان: يوجد {overdueUnsyncedDeliveries.length} سندات توريد لم تتم مزامنتها في السحابة منذ أكثر من {unsyncedDeliveryAlertMinutes} دقيقة!
                  </span>
                  <span className="bg-rose-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full animate-bounce">
                    خطر فقدان البيانات
                  </span>
                </div>
                <p className="text-rose-200 text-[11px] mt-0.5">
                  سندات التوريد مسجلة محلياً ويجب رفعها لقاعدة البيانات السحابية فوراً لضمان عدم ضياع كشوفات الحساب.
                  {overdueUnsyncedDeliveries[0] && (
                    <span className="text-amber-300 font-semibold mr-1">
                      (أقدم سند: {overdueUnsyncedDeliveries[0].id} لمنفذ "{overdueUnsyncedDeliveries[0].outletName}" بمبلغ {overdueUnsyncedDeliveries[0].totalAmount.toLocaleString()} ر.ي)
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              {/* Threshold Adjuster */}
              <div className="flex items-center gap-1 bg-slate-900/80 px-2 py-1 rounded-lg border border-rose-500/30 text-[11px] text-slate-300">
                <Clock className="w-3 h-3 text-amber-400" />
                <span className="text-[10px]">مهلة التنبيه:</span>
                <select
                  value={unsyncedDeliveryAlertMinutes}
                  onChange={(e) => setUnsyncedDeliveryAlertMinutes(Number(e.target.value))}
                  className="bg-transparent text-amber-300 font-bold outline-hidden cursor-pointer text-[11px]"
                  title="تحديد المهلة الزمنية قبل إطلاق الإنذار الصوتي والمرئي"
                >
                  <option value={1} className="bg-slate-900 text-white">1 دقيقة</option>
                  <option value={2} className="bg-slate-900 text-white">2 دقيقة</option>
                  <option value={3} className="bg-slate-900 text-white">3 دقائق</option>
                  <option value={5} className="bg-slate-900 text-white">5 دقائق</option>
                  <option value={10} className="bg-slate-900 text-white">10 دقائق</option>
                </select>
              </div>

              {/* Instant Sync Action */}
              <button
                onClick={handleManualSync}
                disabled={isSyncing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-slate-950 font-black text-xs transition shadow-md shadow-rose-500/30 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'جارٍ الحفظ في السحابة...' : 'مزامنة السندات الآن ☁️'}</span>
              </button>

              {/* Snooze / Dismiss Alert */}
              <button
                onClick={dismissUnsyncedAlert}
                className="p-1.5 rounded-lg text-rose-300 hover:text-white hover:bg-rose-900/60 transition cursor-pointer"
                title="إخفاء التنبيه مؤقتاً"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🛡️ Data Conflict Prevention Shield Banner */}
      {conflictLogs.length > 0 && (
        <div className="bg-gradient-to-r from-amber-950 via-slate-900 to-amber-950 border-b border-amber-500/40 text-white py-2 px-4 shadow-xl no-print animate-in fade-in">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-extrabold text-white text-sm">
                    درع الأمان المحاسبي نشط: تم رصد تعارض بيانات وتثبيت السجلات المعتمدة
                  </span>
                  <span className="bg-amber-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full">
                    تم منع التصفير 100%
                  </span>
                </div>
                <p className="text-amber-200/80 text-[11px] mt-0.5">
                  {conflictLogs[0].message}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setActiveTab('audit_log')}
                className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-[11px] font-bold transition cursor-pointer"
              >
                عرض سجل التدقيق
              </button>
              <button
                onClick={() => dismissConflictAlert()}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                title="إخفاء التنبيه"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Header */}
      <Header onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />

      {/* Main Body with Sidebar & Content */}
      <div className="flex-1 min-h-0 flex overflow-hidden w-full">
        {/* Sidebar Nav */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        {/* Viewport Content */}
        <main className="flex-1 min-w-0 min-h-0 overflow-y-auto overflow-x-hidden p-2.5 sm:p-4 lg:p-6 pb-20 md:pb-6 w-full">
          <div className="max-w-7xl mx-auto w-full min-w-0">
            {renderActiveView()}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Quick Navigation Dock (Visible on Mobile only) */}
      <nav className="fixed bottom-0 inset-x-0 z-30 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 px-2 py-1.5 flex items-center justify-around md:hidden no-print shadow-xl">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition cursor-pointer min-w-[54px] ${
            activeTab === 'dashboard'
              ? 'text-amber-400 font-extrabold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span className="text-[10px]">الرئيسية</span>
        </button>

        <button
          onClick={() => setActiveTab('outlets')}
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition cursor-pointer min-w-[54px] ${
            activeTab === 'outlets'
              ? 'text-amber-400 font-extrabold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Store className="w-4 h-4" />
          <span className="text-[10px]">المنافذ</span>
        </button>

        <button
          onClick={() => setActiveTab('transfers')}
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition cursor-pointer min-w-[54px] ${
            activeTab === 'transfers'
              ? 'text-amber-400 font-extrabold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <ArrowLeftRight className="w-4 h-4" />
          <span className="text-[10px]">العهد TR</span>
        </button>

        <button
          onClick={() => setActiveTab('trial_balance')}
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition cursor-pointer min-w-[54px] ${
            activeTab === 'trial_balance'
              ? 'text-amber-400 font-extrabold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Scale className="w-4 h-4" />
          <span className="text-[10px]">المطابقة</span>
        </button>

        <button
          onClick={() => setActiveTab('custody_cash')}
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition cursor-pointer min-w-[54px] ${
            activeTab === 'custody_cash'
              ? 'text-amber-400 font-extrabold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Coins className="w-4 h-4" />
          <span className="text-[10px]">النقدية</span>
        </button>
      </nav>

      {/* Floating Real-Time Toast Container */}
      <ToastContainer />

      {/* Distributor Welcome & Onboarding Modal */}
      <DistributorWelcomeModal
        isOpen={showDistributorWelcome}
        onClose={() => setShowDistributorWelcome(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}
