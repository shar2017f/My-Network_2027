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
import { SettlementsView } from './views/SettlementsView';
import { PermissionsView } from './views/PermissionsView';
import { AuditLogView } from './views/AuditLogView';
import { SmartAnalyticsView } from './views/SmartAnalyticsView';
import { BackupSyncView } from './views/BackupSyncView';
import { DistributorWelcomeModal } from './components/DistributorWelcomeModal';
import { WifiOff, Wifi, RefreshCw, AlertTriangle, Clock, X } from 'lucide-react';

const MainLayout: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased selection:bg-amber-500 selection:text-slate-950">
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

      {/* Main Header */}
      <Header onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />

      {/* Main Body with Sidebar & Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Nav */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        {/* Viewport Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {renderActiveView()}
          </div>
        </main>
      </div>

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
