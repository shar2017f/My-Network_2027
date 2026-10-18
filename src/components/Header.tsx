import React, { useState } from 'react';
import {
  Wifi,
  Bell,
  Shield,
  UserCheck,
  Check,
  Menu,
  Coins,
  TrendingDown,
  Info,
  AlertTriangle,
  CheckCircle,
  Cloud,
  RefreshCw,
  Printer,
  Share2,
  Key,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { PWAInstallButton } from './PWAInstallButton';
import { PinModal } from './PinModal';
import { ShareDistributorModal } from './ShareDistributorModal';

interface HeaderProps {
  onToggleSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const {
    currentRole,
    setCurrentRole,
    adminPin,
    notifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    distributorCashInHand,
    totalOutletsDebt,
    isCloudConnected,
    syncNowToCloud,
    quickInitiatePrintBatch,
    showShareModal,
    setShowShareModal,
    setShowDistributorWelcome,
  } = useApp();

  const [showPinModal, setShowPinModal] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [isManualSyncing, setIsManualSyncing] = useState(false);

  const handleManualSync = async () => {
    setIsManualSyncing(true);
    await syncNowToCloud();
    setTimeout(() => setIsManualSyncing(false), 800);
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleRoleSwitch = (newRole: 'admin' | 'distributor') => {
    if (newRole === currentRole) return;
    if (newRole === 'admin') {
      setShowPinModal(true);
    } else {
      setCurrentRole('distributor');
    }
  };

  return (
    <>
      <header className="sticky top-0 z-30 h-16 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 flex items-center justify-between no-print">
        {/* Left (RTL Start): Logo & Mobile Toggle */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 md:hidden transition cursor-pointer"
            aria-label="القائمة الرئيسية"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center text-slate-950 shadow-md shadow-amber-500/20 font-black text-lg">
              <Wifi className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base tracking-wide text-white">قعزان نت</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  QAZAN-NET
                </span>
              </div>
              <p className="text-[10px] text-slate-400 hidden sm:block">
                نظام إدارة ومحاسبة شبكة الكروت (شخصان فقط)
              </p>
            </div>
          </div>
        </div>

        {/* Center / Right Quick Stats Chip */}
        <div className="hidden lg:flex items-center gap-3">
          {currentRole === 'distributor' ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Coins className="w-4 h-4" />
              <div className="text-right">
                <div className="text-[10px] text-emerald-300/80">النقدية بعهدتك الآن:</div>
                <div className="font-bold text-xs">{distributorCashInHand.toLocaleString()} ر.ي</div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/80 text-amber-400">
              <TrendingDown className="w-4 h-4 text-rose-400" />
              <div className="text-right">
                <div className="text-[10px] text-slate-400">إجمالي ديون المنافذ:</div>
                <div className="font-bold text-xs text-rose-300">{totalOutletsDebt.toLocaleString()} ر.ي</div>
              </div>
            </div>
          )}
        </div>

        {/* Right actions: Role switcher, Notifications, Install */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Cloud Sync Status Indicator */}
          <button
            onClick={handleManualSync}
            disabled={isManualSyncing}
            className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
              isCloudConnected
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
            }`}
            title="مزامنة سحابية مباشرة عبر Firebase Firestore - انقر للمزامنة الفورية وحفظ البيانات"
          >
            {isManualSyncing ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
            ) : (
              <Cloud className="w-3.5 h-3.5 text-emerald-400" />
            )}
            <span className="text-[11px] font-bold hidden xs:inline">
              {isManualSyncing ? 'جاري المزامنة...' : 'سحابي 🟢'}
            </span>
          </button>

          {/* Share Distributor Button or Distributor Guide Button */}
          {currentRole === 'admin' ? (
            <button
              onClick={() => setShowShareModal(true)}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition shadow-sm cursor-pointer"
              title="مشاركة رابط وحساب الموزع الميداني عبر واتساب أو رمز QR"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">مشاركة مع الموزع 📲</span>
              <span className="sm:hidden">مشاركة</span>
            </button>
          ) : (
            <button
              onClick={() => setShowDistributorWelcome(true)}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition shadow-sm cursor-pointer"
              title="فتح دليل البدء وتغيير رمز PIN الشخصي"
            >
              <Key className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">دليل الموزع وPIN 🔑</span>
              <span className="sm:hidden">دليل وPIN</span>
            </button>
          )}

          {/* Role Pill Switcher */}
          <div className="flex items-center p-1 rounded-xl bg-slate-950/80 border border-slate-800 text-xs">
            <button
              onClick={() => handleRoleSwitch('admin')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                currentRole === 'admin'
                  ? 'bg-amber-500 text-slate-950 shadow-sm shadow-amber-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">المسؤول</span>
            </button>
            <button
              onClick={() => handleRoleSwitch('distributor')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                currentRole === 'distributor'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm shadow-emerald-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">الموزع</span>
            </button>
          </div>

          {/* Notifications Center */}
          <div className="relative">
            <button
              onClick={() => setShowNotifMenu(!showNotifMenu)}
              className="relative p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              title="مركز الإشعارات"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-500 text-white font-bold text-[10px] flex items-center justify-center animate-pulse">
                  {unreadCount > 9 ? '+9' : unreadCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown */}
            {showNotifMenu && (
              <div className="absolute left-0 mt-2 w-80 sm:w-96 rounded-2xl bg-slate-900 border border-slate-700/80 shadow-2xl p-4 text-right z-50 animate-in fade-in duration-150">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-white">التنبيهات الفورية</span>
                    {unreadCount > 0 && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-bold">
                        {unreadCount} جديد
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllNotificationsAsRead}
                      className="text-xs text-amber-400 hover:text-amber-300 font-medium cursor-pointer"
                    >
                      تحديد الكل كمقروء
                    </button>
                  )}
                </div>

                <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                  {notifications.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-4">لا توجد إشعارات حالياً</p>
                  ) : (
                    notifications.slice(0, 15).map((n) => (
                      <div
                        key={n.id}
                        onClick={() => markNotificationAsRead(n.id)}
                        className={`p-2.5 rounded-xl text-xs transition cursor-pointer border ${
                          n.isRead
                            ? 'bg-slate-850/50 border-slate-800/80 text-slate-400'
                            : 'bg-slate-800/90 border-slate-700 text-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold flex items-center gap-1.5 text-white">
                            {n.type === 'alert' && <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
                            {n.type === 'success' && <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                            {n.type === 'warning' && <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                            {n.type === 'info' && <Info className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
                            {n.title}
                          </span>
                          {!n.isRead && (
                            <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                          )}
                        </div>
                        <p className="text-[11px] leading-relaxed text-slate-300">{n.message}</p>
                        
                        {n.actionType === 'print_decision' && n.actionCategory && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              markNotificationAsRead(n.id);
                              setShowNotifMenu(false);
                              quickInitiatePrintBatch(n.actionCategory!, n.recommendedSheets);
                            }}
                            className="mt-2 w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-[11px] shadow-sm transition cursor-pointer"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>اتخاذ قرار الطباعة الفوري ({n.recommendedSheets || 15} شيت)</span>
                          </button>
                        )}

                        <span className="text-[9px] text-slate-400 mt-1.5 block">
                          {new Date(n.timestamp).toLocaleTimeString('ar-YE', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* PWA Button */}
          <PWAInstallButton />
        </div>
      </header>

      {/* Admin PIN security modal */}
      <PinModal
        isOpen={showPinModal}
        onClose={() => setShowPinModal(false)}
        correctPin={adminPin}
        onSuccess={() => {
          setShowPinModal(false);
          setCurrentRole('admin');
        }}
      />

      {/* Share Distributor Modal */}
      <ShareDistributorModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
      />
    </>
  );
};
