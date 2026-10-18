import React from 'react';
import {
  LayoutDashboard,
  Layers,
  ArrowLeftRight,
  Store,
  LineChart,
  UserCheck,
  Coins,
  Scale,
  ShieldAlert,
  History,
  Sparkles,
  Database,
  X,
  Shield,
  Share2,
  Key,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export type ActiveTab =
  | 'dashboard'
  | 'batches'
  | 'transfers'
  | 'outlets'
  | 'outlet_performance'
  | 'direct_sales'
  | 'custody_cash'
  | 'settlements'
  | 'permissions'
  | 'audit_log'
  | 'smart_analytics'
  | 'backup_sync';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isOpen,
  onClose,
}) => {
  const {
    currentRole,
    settlements,
    permissions,
    setShowShareModal,
    setShowDistributorWelcome,
  } = useApp();

  const pendingSettlementsCount = settlements.filter((s) => s.status === 'pending').length;

  const navItems = [
    {
      id: 'dashboard' as ActiveTab,
      label: 'لوحة التحكم والملخص',
      icon: LayoutDashboard,
      badge: null,
      adminOnly: false,
    },
    {
      id: 'batches' as ActiveTab,
      label: 'دفعات الطباعة ومسار الكرت',
      icon: Layers,
      badge: null,
      adminOnly: false,
    },
    {
      id: 'transfers' as ActiveTab,
      label: 'العهد والتحويلات (TR)',
      icon: ArrowLeftRight,
      badge: null,
      adminOnly: false,
    },
    {
      id: 'outlets' as ActiveTab,
      label: 'المنافذ والديون (DEL / PAY)',
      icon: Store,
      badge: null,
      adminOnly: false,
    },
    {
      id: 'outlet_performance' as ActiveTab,
      label: 'أداء المنافذ والرسوم المصغرة',
      icon: LineChart,
      badge: null,
      adminOnly: false,
    },
    {
      id: 'direct_sales' as ActiveTab,
      label: 'مبيعات الكروت للأفراد (DIR)',
      icon: UserCheck,
      badge: null,
      adminOnly: false,
    },
    {
      id: 'custody_cash' as ActiveTab,
      label: 'العهد والنقدية والتالف (CSH/DMG)',
      icon: Coins,
      badge: null,
      adminOnly: false,
    },
    {
      id: 'settlements' as ActiveTab,
      label: 'التسويات والتصفيات المعلقة',
      icon: Scale,
      badge: pendingSettlementsCount > 0 ? pendingSettlementsCount : null,
      adminOnly: false,
    },
    {
      id: 'permissions' as ActiveTab,
      label: 'إدارة صلاحيات الموزع',
      icon: ShieldAlert,
      badge: null,
      adminOnly: true, // Only admin can access
    },
    {
      id: 'audit_log' as ActiveTab,
      label: 'سجل التدقيق المالي',
      icon: History,
      badge: null,
      adminOnly: false,
    },
    {
      id: 'smart_analytics' as ActiveTab,
      label: 'التحليل الذكي للشبكة (AI)',
      icon: Sparkles,
      badge: 'Gemini',
      adminOnly: currentRole === 'distributor' && !permissions.canViewFullAnalytics,
    },
    {
      id: 'backup_sync' as ActiveTab,
      label: 'النسخ الاحتياطي والمزامنة',
      icon: Database,
      badge: null,
      adminOnly: false,
    },
  ];

  const handleSelectTab = (tab: ActiveTab) => {
    setActiveTab(tab);
    onClose();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed md:sticky top-0 right-0 z-40 h-screen w-64 bg-slate-900 border-l border-slate-800 flex flex-col justify-between transition-transform duration-300 ease-in-out no-print ${
          isOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'
        }`}
      >
        <div className="flex flex-col h-full overflow-hidden">
          {/* Top Brand Bar */}
          <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-sm font-bold text-white">نظام قعزان نت v2.0</span>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white md:hidden"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* User Badge Info */}
          <div className="px-4 py-3 bg-slate-950/50 border-b border-slate-800/80 shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">الحساب الحالي:</span>
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                  currentRole === 'admin'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                }`}
              >
                <Shield className="w-3 h-3" />
                {currentRole === 'admin' ? 'المسؤول (المدير)' : 'الموزع الميداني'}
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 overflow-y-auto p-3 space-y-1">
            {navItems.map((item) => {
              // Hide admin-only items if distributor
              if (item.adminOnly && currentRole !== 'admin') {
                return null;
              }

              const isActive = activeTab === item.id;
              const Icon = item.icon;

              return (
                <button
                  key={item.id}
                  onClick={() => handleSelectTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-right cursor-pointer group ${
                    isActive
                      ? 'bg-gradient-to-l from-amber-500 to-amber-600 text-slate-950 shadow-md shadow-amber-500/20 font-extrabold'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon
                      className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                        isActive ? 'text-slate-950 stroke-[2.5]' : 'text-slate-400'
                      }`}
                    />
                    <span>{item.label}</span>
                  </div>

                  {item.badge && (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        isActive
                          ? 'bg-slate-950 text-amber-400'
                          : typeof item.badge === 'number'
                          ? 'bg-rose-500 text-white'
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Action Button for Sharing or Guide */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/60 shrink-0">
          {currentRole === 'admin' ? (
            <button
              onClick={() => {
                setShowShareModal(true);
                onClose();
              }}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs shadow-md shadow-emerald-600/20 transition cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
              <span>مشاركة حساب ورابط الموزع 📲</span>
            </button>
          ) : (
            <button
              onClick={() => {
                setShowDistributorWelcome(true);
                onClose();
              }}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold text-xs transition cursor-pointer"
            >
              <Key className="w-4 h-4" />
              <span>دليل البدء ورمز PIN الشخصي 🔑</span>
            </button>
          )}
        </div>

        {/* Bottom Footer Info */}
        <div className="p-3 border-t border-slate-800 text-center shrink-0 bg-slate-950/40">
          <p className="text-[10px] text-slate-400">شبكة قعزان نت © 2026</p>
          <p className="text-[9px] text-slate-400">إدارة ومحاسبة كروت الإنترنت</p>
        </div>
      </aside>
    </>
  );
};
