import React, { useState } from 'react';
import {
  LayoutDashboard,
  Layers,
  ArrowLeftRight,
  Store,
  LineChart,
  UserCheck,
  Coins,
  Scale,
  FileCheck,
  ShieldAlert,
  History,
  Sparkles,
  Database,
  X,
  Shield,
  Share2,
  Key,
  FolderKanban,
  Package,
  Calculator,
  Settings,
  Search,
  Receipt,
  LogOut,
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
  | 'trial_balance'
  | 'expenses'
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

interface NavItem {
  id: ActiveTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge: string | number | null;
  adminOnly: boolean;
}

interface NavSection {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: NavItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isOpen,
  onClose,
}) => {
  const {
    currentRole,
    logoutSession,
    settlements,
    permissions,
    setShowShareModal,
    setShowDistributorWelcome,
  } = useApp();

  const [searchNav, setSearchNav] = useState('');

  const pendingSettlementsCount = settlements.filter((s) => s.status === 'pending').length;

  const navSections: NavSection[] = [
    {
      title: 'العمليات اليومية والتوزيع',
      icon: FolderKanban,
      items: [
        {
          id: 'dashboard',
          label: 'لوحة التحكم والملخص',
          icon: LayoutDashboard,
          badge: null,
          adminOnly: false,
        },
        {
          id: 'outlets',
          label: 'المنافذ والديون (DEL / PAY)',
          icon: Store,
          badge: null,
          adminOnly: false,
        },
        {
          id: 'direct_sales',
          label: 'مبيعات الكروت للأفراد (DIR)',
          icon: UserCheck,
          badge: null,
          adminOnly: false,
        },
        {
          id: 'outlet_performance',
          label: 'أداء المنافذ والرسوم المصغرة',
          icon: LineChart,
          badge: null,
          adminOnly: false,
        },
      ],
    },
    {
      title: 'المخزون وحركة العهد',
      icon: Package,
      items: [
        {
          id: 'batches',
          label: 'دفعات الطباعة ومسار الكرت',
          icon: Layers,
          badge: null,
          adminOnly: false,
        },
        {
          id: 'transfers',
          label: 'العهد والتحويلات (TR)',
          icon: ArrowLeftRight,
          badge: null,
          adminOnly: false,
        },
        {
          id: 'custody_cash',
          label: 'العهد والنقدية والتالف (CSH/DMG)',
          icon: Coins,
          badge: null,
          adminOnly: false,
        },
      ],
    },
    {
      title: 'المطابقة والرقابة المالية',
      icon: Calculator,
      items: [
        {
          id: 'trial_balance',
          label: 'ميزان المراجعة والمطابقة',
          icon: Scale,
          badge: null,
          adminOnly: false,
        },
        {
          id: 'expenses',
          label: 'المصروفات والمشتريات (EXP)',
          icon: Receipt,
          badge: null,
          adminOnly: false,
        },
        {
          id: 'settlements',
          label: 'التسويات والتصفيات المعلقة',
          icon: FileCheck,
          badge: pendingSettlementsCount > 0 ? pendingSettlementsCount : null,
          adminOnly: false,
        },
        {
          id: 'audit_log',
          label: 'سجل التدقيق المالي',
          icon: History,
          badge: null,
          adminOnly: false,
        },
      ],
    },
    {
      title: 'إدارة النظام والأمان',
      icon: Settings,
      items: [
        {
          id: 'permissions',
          label: 'إدارة صلاحيات الموزع',
          icon: ShieldAlert,
          badge: null,
          adminOnly: true, // Only admin can access
        },
        {
          id: 'smart_analytics',
          label: 'التحليل الذكي للشبكة (AI)',
          icon: Sparkles,
          badge: 'Gemini',
          adminOnly: currentRole === 'distributor' && !permissions.canViewFullAnalytics,
        },
        {
          id: 'backup_sync',
          label: 'النسخ الاحتياطي والمزامنة',
          icon: Database,
          badge: null,
          adminOnly: false,
        },
      ],
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
        className={`fixed md:relative inset-y-0 right-0 z-50 md:z-20 h-full w-72 max-w-[85vw] md:w-64 md:max-w-none md:shrink-0 bg-slate-900 border-l border-slate-800 flex flex-col justify-between transition-transform duration-300 ease-in-out no-print shadow-2xl md:shadow-none ${
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
              className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 md:hidden transition cursor-pointer"
              aria-label="إغلاق القائمة"
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

          {/* Quick Nav Search (Filter tabs) */}
          <div className="px-3 py-2 border-b border-slate-800/60 bg-slate-950/30 shrink-0">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-2.5" />
              <input
                type="text"
                value={searchNav}
                onChange={(e) => setSearchNav(e.target.value)}
                placeholder="بحث سريع بالقوائم..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pr-8 pl-2 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500"
              />
              {searchNav && (
                <button
                  onClick={() => setSearchNav('')}
                  className="absolute left-2 top-2 text-slate-400 hover:text-white text-xs"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Grouped Navigation Links */}
          <nav className="flex-1 overflow-y-auto p-3 space-y-4">
            {navSections.map((section, sIdx) => {
              // Filter items by role and search
              const visibleItems = section.items.filter((item) => {
                if (item.adminOnly && currentRole !== 'admin') return false;
                if (!searchNav.trim()) return true;
                return item.label.toLowerCase().includes(searchNav.toLowerCase().trim());
              });

              if (visibleItems.length === 0) return null;

              const SectionIcon = section.icon;

              return (
                <div key={sIdx} className="space-y-1">
                  {/* Section Title Header */}
                  <div className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-black text-slate-400 tracking-wider">
                    <SectionIcon className="w-3.5 h-3.5 text-amber-500/80" />
                    <span>{section.title}</span>
                  </div>

                  {/* Section Items */}
                  <div className="space-y-1">
                    {visibleItems.map((item) => {
                      const isActive = activeTab === item.id;
                      const Icon = item.icon;

                      return (
                        <button
                          key={item.id}
                          onClick={() => handleSelectTab(item.id)}
                          className={`w-full flex items-center justify-between px-3 py-2.5 min-h-[42px] rounded-xl text-xs sm:text-sm font-bold transition-all text-right cursor-pointer group ${
                            isActive
                              ? 'bg-gradient-to-l from-amber-500 to-amber-600 text-slate-950 shadow-md shadow-amber-500/20 font-extrabold'
                              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <Icon
                              className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
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
                  </div>
                </div>
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
              className="w-full flex items-center justify-center gap-2 py-3 px-3 min-h-[46px] rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs sm:text-sm shadow-md shadow-emerald-600/20 transition cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
              <span>مشاركة حساب ورابط الموزع 📲</span>
            </button>
          ) : (
            <div className="space-y-2">
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

              <button
                onClick={() => {
                  if (window.confirm('هل أنت متأكد من تسجيل الخروج من جلسة الموزع؟ لن يتم الخروج إلا بهذا الزر اليدوي.')) {
                    logoutSession();
                    onClose();
                  }
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold text-xs transition cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>تسجيل الخروج من حساب الموزع 🚪</span>
              </button>
            </div>
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
