import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Coins,
  Shield,
  Layers,
  ArrowRight,
  Zap,
  BarChart3,
  PieChart as PieIcon,
  Calendar,
  Wallet,
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  DollarSign,
  TrendingDown,
  Building2,
  Truck,
  Wifi,
  Wrench,
  Users,
  Briefcase,
  FileText,
  Table as TableIcon,
  Sliders,
  ChevronDown,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  Bar,
  Line,
  Area,
  AreaChart,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  Legend,
} from 'recharts';
import { useApp } from '../context/AppContext';
import { analyzeNetworkWithGemini, NetworkAnalysisResult } from '../services/geminiService';
import { ExpenseCategory, ExpenseItem } from '../types';

const ARABIC_MONTHS: Record<string, string> = {
  '01': 'يناير',
  '02': 'فبراير',
  '03': 'مارس',
  '04': 'أبريل',
  '05': 'مايو',
  '06': 'يونيو',
  '07': 'يوليو',
  '08': 'أغسطس',
  '09': 'سبتمبر',
  '10': 'أكتوبر',
  '11': 'نوفمبر',
  '12': 'ديسمبر',
};

export const CATEGORY_META: Record<ExpenseCategory, { label: string; color: string; fill: string }> = {
  printing_cards: { label: 'طباعة كروت وتغليف', color: '#f59e0b', fill: '#f59e0b' },
  internet_bandwidth: { label: 'اشتراك إنترنت وفايبر', color: '#06b6d4', fill: '#06b6d4' },
  power_energy: { label: 'طاقة ومحروقات وكهرباء', color: '#eab308', fill: '#eab308' },
  maintenance_hardware: { label: 'صيانة راوترات ومعدات', color: '#f43f5e', fill: '#f43f5e' },
  transport_distribution: { label: 'مواصلات ونقل ميداني', color: '#10b981', fill: '#10b981' },
  site_rentals: { label: 'إيجارات مواقع وأبراج', color: '#a855f7', fill: '#a855f7' },
  salaries_commissions: { label: 'رواتب وعمولات', color: '#3b82f6', fill: '#3b82f6' },
  capital_assets: { label: 'أصول وتجهيزات رأسمالية', color: '#6366f1', fill: '#6366f1' },
  hospitality_misc: { label: 'نثريات وضيافة', color: '#f97316', fill: '#f97316' },
  other: { label: 'مصروفات أخرى', color: '#94a3b8', fill: '#94a3b8' },
};

type ChartDisplayMode = 'stacked_type' | 'category_breakdown' | 'funding_source';

export const SmartAnalyticsView: React.FC = () => {
  const {
    batches,
    outlets,
    deliveries,
    payments,
    distributorCashInHand,
    totalOutletsDebt,
    expenses,
    totalExpensesAmount,
    netProjectProfit,
  } = useApp();

  const [isLoading, setIsLoading] = useState(false);
  const [analysis, setAnalysis] = useState<NetworkAnalysisResult | null>(null);
  const [activeTab, setActiveTab] = useState<'expenses_charts' | 'ai_insights' | 'all'>('expenses_charts');
  const [chartMode, setChartMode] = useState<ChartDisplayMode>('stacked_type');
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<string>('all');
  const [selectedYearFilter, setSelectedYearFilter] = useState<string>('all');

  const handleRunAnalysis = async () => {
    setIsLoading(true);
    try {
      const res = await analyzeNetworkWithGemini({
        batches,
        outlets,
        deliveries,
        payments,
        distributorCash: distributorCashInHand,
        totalDebt: totalOutletsDebt,
        expenses,
      });
      setAnalysis(res);
      // Automatically show AI tab on completion if on charts tab
      if (activeTab === 'expenses_charts') {
        setActiveTab('all');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to get Year-Month key
  const getYearMonth = (dateStr?: string) => {
    if (!dateStr) return '2026-10';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) {
        return dateStr.slice(0, 7);
      }
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      return `${y}-${m}`;
    } catch {
      return dateStr.slice(0, 7) || '2026-10';
    }
  };

  const formatArabicMonth = (yearMonth: string) => {
    const parts = yearMonth.split('-');
    if (parts.length < 2) return yearMonth;
    const [y, m] = parts;
    const monthName = ARABIC_MONTHS[m] || m;
    return `${monthName} ${y}`;
  };

  // All distinct months in expenses (and recent 5 months baseline)
  const distinctMonths = useMemo(() => {
    const monthSet = new Set<string>();
    expenses.forEach((e) => {
      monthSet.add(getYearMonth(e.date));
    });
    // Ensure recent months exist for trend visualization
    ['2026-07', '2026-08', '2026-09', '2026-10', '2026-11'].forEach((m) => monthSet.add(m));
    return Array.from(monthSet).sort();
  }, [expenses]);

  // Distinct years
  const distinctYears = useMemo(() => {
    const yearSet = new Set<string>();
    distinctMonths.forEach((m) => yearSet.add(m.split('-')[0]));
    return Array.from(yearSet).sort();
  }, [distinctMonths]);

  // Filtered expenses based on year filter
  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const ym = getYearMonth(e.date);
      const [y] = ym.split('-');
      if (selectedYearFilter !== 'all' && y !== selectedYearFilter) return false;
      return true;
    });
  }, [expenses, selectedYearFilter]);

  // Monthly Aggregated Data for Charts
  const monthlyData = useMemo(() => {
    const targetMonths =
      selectedYearFilter === 'all'
        ? distinctMonths
        : distinctMonths.filter((m) => m.startsWith(selectedYearFilter));

    return targetMonths.map((ym) => {
      const monthExpenses = filteredExpenses.filter((e) => getYearMonth(e.date) === ym);

      const totalAmount = monthExpenses.reduce((s, e) => s + e.amount, 0);
      const operationalAmount = monthExpenses
        .filter((e) => !e.isCapitalAsset)
        .reduce((s, e) => s + e.amount, 0);
      const capitalAmount = monthExpenses
        .filter((e) => e.isCapitalAsset)
        .reduce((s, e) => s + e.amount, 0);

      const distributorCash = monthExpenses
        .filter((e) => e.paymentMethod === 'distributor_cash')
        .reduce((s, e) => s + e.amount, 0);
      const adminCash = monthExpenses
        .filter((e) => e.paymentMethod === 'admin_cash')
        .reduce((s, e) => s + e.amount, 0);
      const bankWallet = monthExpenses
        .filter((e) => e.paymentMethod === 'bank_wallet')
        .reduce((s, e) => s + e.amount, 0);
      const creditPayable = monthExpenses
        .filter((e) => e.paymentMethod === 'credit_payable')
        .reduce((s, e) => s + e.amount, 0);

      // Category breakdown
      const printing_cards = monthExpenses
        .filter((e) => e.category === 'printing_cards')
        .reduce((s, e) => s + e.amount, 0);
      const internet_bandwidth = monthExpenses
        .filter((e) => e.category === 'internet_bandwidth')
        .reduce((s, e) => s + e.amount, 0);
      const power_energy = monthExpenses
        .filter((e) => e.category === 'power_energy')
        .reduce((s, e) => s + e.amount, 0);
      const maintenance_hardware = monthExpenses
        .filter((e) => e.category === 'maintenance_hardware')
        .reduce((s, e) => s + e.amount, 0);
      const transport_distribution = monthExpenses
        .filter((e) => e.category === 'transport_distribution')
        .reduce((s, e) => s + e.amount, 0);
      const site_rentals = monthExpenses
        .filter((e) => e.category === 'site_rentals')
        .reduce((s, e) => s + e.amount, 0);
      const salaries_commissions = monthExpenses
        .filter((e) => e.category === 'salaries_commissions')
        .reduce((s, e) => s + e.amount, 0);
      const capital_assets = monthExpenses
        .filter((e) => e.category === 'capital_assets')
        .reduce((s, e) => s + e.amount, 0);
      const hospitality_misc = monthExpenses
        .filter((e) => e.category === 'hospitality_misc')
        .reduce((s, e) => s + e.amount, 0);
      const other = monthExpenses
        .filter((e) => e.category === 'other')
        .reduce((s, e) => s + e.amount, 0);

      return {
        monthKey: ym,
        monthLabel: formatArabicMonth(ym),
        totalAmount,
        operationalAmount,
        capitalAmount,
        distributorCash,
        adminCash,
        bankWallet,
        creditPayable,
        printing_cards,
        internet_bandwidth,
        power_energy,
        maintenance_hardware,
        transport_distribution,
        site_rentals,
        salaries_commissions,
        capital_assets,
        hospitality_misc,
        other,
        vouchersCount: monthExpenses.length,
      };
    });
  }, [distinctMonths, filteredExpenses, selectedYearFilter]);

  // Overall & Selected Month Category Distribution (for Donut / Pie chart)
  const categoryDistributionData = useMemo(() => {
    const sourceExpenses =
      selectedMonthFilter === 'all'
        ? filteredExpenses
        : filteredExpenses.filter((e) => getYearMonth(e.date) === selectedMonthFilter);

    const totalSum = sourceExpenses.reduce((s, e) => s + e.amount, 0) || 1;

    const data = (Object.keys(CATEGORY_META) as ExpenseCategory[])
      .map((cat) => {
        const catExpenses = sourceExpenses.filter((e) => e.category === cat);
        const amount = catExpenses.reduce((s, e) => s + e.amount, 0);
        const percentage = Number(((amount / totalSum) * 100).toFixed(1));
        return {
          category: cat,
          label: CATEGORY_META[cat].label,
          amount,
          percentage,
          count: catExpenses.length,
          color: CATEGORY_META[cat].color,
        };
      })
      .filter((item) => item.amount > 0)
      .sort((a, b) => b.amount - a.amount);

    return data;
  }, [filteredExpenses, selectedMonthFilter]);

  // Funding Source Breakdown Data (for Source Pie/Bar)
  const fundingSourceData = useMemo(() => {
    const sourceExpenses =
      selectedMonthFilter === 'all'
        ? filteredExpenses
        : filteredExpenses.filter((e) => getYearMonth(e.date) === selectedMonthFilter);

    const distCash = sourceExpenses
      .filter((e) => e.paymentMethod === 'distributor_cash')
      .reduce((s, e) => s + e.amount, 0);
    const adminCash = sourceExpenses
      .filter((e) => e.paymentMethod === 'admin_cash')
      .reduce((s, e) => s + e.amount, 0);
    const bankWallet = sourceExpenses
      .filter((e) => e.paymentMethod === 'bank_wallet')
      .reduce((s, e) => s + e.amount, 0);
    const credit = sourceExpenses
      .filter((e) => e.paymentMethod === 'credit_payable')
      .reduce((s, e) => s + e.amount, 0);

    return [
      { name: 'عهدة الموزع (خصم من الكاش)', amount: distCash, color: '#f59e0b' },
      { name: 'خزينة الإدارة (نقداً)', amount: adminCash, color: '#10b981' },
      { name: 'بنك ومحافظ إلكترونية', amount: bankWallet, color: '#06b6d4' },
      { name: 'آجل ومستحقات موردين', amount: credit, color: '#f43f5e' },
    ].filter((item) => item.amount > 0);
  }, [filteredExpenses, selectedMonthFilter]);

  // High-level KPI Stats
  const kpiStats = useMemo(() => {
    const totalExp = filteredExpenses.reduce((s, e) => s + e.amount, 0);
    const monthsWithSpend = monthlyData.filter((m) => m.totalAmount > 0);
    const averageMonthly = monthsWithSpend.length > 0 ? Math.round(totalExp / monthsWithSpend.length) : 0;

    // Current month (e.g. 2026-10)
    const currentMonthKey = '2026-10';
    const currentMonthObj = monthlyData.find((m) => m.monthKey === currentMonthKey);
    const currentMonthTotal = currentMonthObj?.totalAmount || 0;

    // Top Category Overall
    const topCategory = categoryDistributionData[0];

    // Field Expenses Paid by Distributor
    const totalDistributorExp = filteredExpenses
      .filter((e) => e.paymentMethod === 'distributor_cash')
      .reduce((s, e) => s + e.amount, 0);

    const distSharePercent = totalExp > 0 ? ((totalDistributorExp / totalExp) * 100).toFixed(1) : '0';

    return {
      totalExp,
      averageMonthly,
      currentMonthTotal,
      topCategory,
      totalDistributorExp,
      distSharePercent,
      activeMonthsCount: monthsWithSpend.length,
    };
  }, [filteredExpenses, monthlyData, categoryDistributionData]);

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="bg-gradient-to-l from-slate-900 via-indigo-950/40 to-slate-900 p-5 sm:p-6 rounded-2xl border border-indigo-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-extrabold text-white">
                  تحليل وتوزيع المصروفات شهرياً والذكاء المالي
                </h2>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30 font-mono">
                  Cost Analytics
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                رسوم بيانية حية لتطور النفقات شهرياً، وتوزيع بنود التكلفة (فايبر، طباعة، محروقات، صيانة)، ومصادر السداد مع تدقيق الذكاء الاصطناعي (Gemini AI).
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <button
            onClick={handleRunAnalysis}
            disabled={isLoading}
            className="flex-1 md:flex-initial px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 fill-slate-950" />
            )}
            <span>{isLoading ? 'جاري التحليل...' : 'تحليل Gemini الذكي للتكاليف'}</span>
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs & View Toggles */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/80 p-2 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button
            onClick={() => setActiveTab('expenses_charts')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
              activeTab === 'expenses_charts'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>رسوم توزيع المصروفات الشهرية</span>
          </button>

          <button
            onClick={() => setActiveTab('ai_insights')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
              activeTab === 'ai_insights'
                ? 'bg-amber-500 text-slate-950 font-extrabold shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>تقرير الذكاء المالي والمخاطر (AI)</span>
            {analysis && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
          </button>

          <button
            onClick={() => setActiveTab('all')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
              activeTab === 'all'
                ? 'bg-slate-800 text-white border border-slate-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>عرض كل التحليلات معاً</span>
          </button>
        </div>

        {/* Global Year Filter */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] text-slate-400 hidden sm:inline">السنة:</span>
          <select
            value={selectedYearFilter}
            onChange={(e) => setSelectedYearFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white font-bold focus:outline-hidden focus:border-indigo-500"
          >
            <option value="all">جميع السنوات</option>
            {distinctYears.map((y) => (
              <option key={y} value={y}>
                عام {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* KPI 1: Current Month Spend */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-indigo-500/30 bg-indigo-950/10 hover:border-indigo-500/50 transition shadow-sm">
          <div className="flex items-center justify-between text-indigo-400 mb-2">
            <span className="text-xs font-bold">مصروفات الشهر الحالي</span>
            <Receipt className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-lg sm:text-xl font-extrabold text-white">
            {kpiStats.currentMonthTotal.toLocaleString()}
            <span className="text-xs font-normal text-slate-400 mr-1">ر.ي</span>
          </div>
          <div className="text-[11px] text-indigo-300/80 mt-1">
            شهر أكتوبر 2026
          </div>
        </div>

        {/* KPI 2: Monthly Average */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">متوسط المصروف الشهري</span>
            <Calendar className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-lg sm:text-xl font-extrabold text-cyan-400">
            {kpiStats.averageMonthly.toLocaleString()}
            <span className="text-xs font-normal text-slate-400 mr-1">ر.ي / شهر</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            بناءً على {kpiStats.activeMonthsCount} أشهر تشغيل
          </div>
        </div>

        {/* KPI 3: Top Cost Category */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">أعلى بند تكلفة استهلاكاً</span>
            <TrendingUp className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-sm sm:text-base font-extrabold text-white truncate" title={kpiStats.topCategory?.label || 'لا يوجد'}>
            {kpiStats.topCategory?.label || 'لم تحدد بعد'}
          </div>
          <div className="text-[11px] text-rose-400/90 mt-1">
            {kpiStats.topCategory ? `${kpiStats.topCategory.amount.toLocaleString()} ر.ي (${kpiStats.topCategory.percentage}%)` : '0 ر.ي'}
          </div>
        </div>

        {/* KPI 4: Distributor Field Spending */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-amber-500/30 bg-amber-950/10 hover:border-amber-500/50 transition shadow-sm">
          <div className="flex items-center justify-between text-amber-400 mb-2">
            <span className="text-xs font-bold">مسدد من عهدة الموزع</span>
            <Coins className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-lg sm:text-xl font-extrabold text-amber-400">
            {kpiStats.totalDistributorExp.toLocaleString()}
            <span className="text-xs font-normal text-amber-300/80 mr-1">ر.ي</span>
          </div>
          <div className="text-[11px] text-amber-300/80 mt-1">
            يمثل {kpiStats.distSharePercent}% من إجمالي التكاليف
          </div>
        </div>
      </div>

      {/* Main Expenses Charts Section (Visible when activeTab is 'expenses_charts' or 'all') */}
      {(activeTab === 'expenses_charts' || activeTab === 'all') && (
        <div className="space-y-6">
          {/* Main Trend Chart Card */}
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 sm:p-6 space-y-4 shadow-lg">
            {/* Chart Header & Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-indigo-400" />
                  <h3 className="font-extrabold text-base text-white">
                    تطور وتوزيع المصروفات الشهرية عبر الأشهر
                  </h3>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  تتبع نمو التكاليف التشغيلية والأصول الرأسمالية ومقارنة التمويل شهرياً
                </p>
              </div>

              {/* Chart Mode Toggle */}
              <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 self-start sm:self-auto">
                <button
                  onClick={() => setChartMode('stacked_type')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    chartMode === 'stacked_type'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  تشغيلي مقابل رأسمالي
                </button>
                <button
                  onClick={() => setChartMode('category_breakdown')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    chartMode === 'category_breakdown'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  حسب بنود التكلفة
                </button>
                <button
                  onClick={() => setChartMode('funding_source')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    chartMode === 'funding_source'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  حسب جهة السداد
                </button>
              </div>
            </div>

            {/* Recharts Area / Bar Canvas */}
            <div className="h-80 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                {chartMode === 'stacked_type' ? (
                  <ComposedChart data={monthlyData} margin={{ top: 15, right: 10, left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="monthLabel" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                    <YAxis
                      stroke="#94a3b8"
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '12px',
                        color: '#f8fafc',
                        fontSize: '12px',
                        direction: 'rtl',
                      }}
                      formatter={(val: any, name: any) => [
                        `${Number(val).toLocaleString()} ر.ي`,
                        name === 'operationalAmount'
                          ? 'مصروف تشغيلي مباشر'
                          : name === 'capitalAmount'
                          ? 'أصول رأسمالية وتجهيزات'
                          : name === 'distributorCash'
                          ? 'مسدد من عهدة الموزع'
                          : name === 'totalAmount'
                          ? 'الإجمالي الشهري'
                          : name,
                      ]}
                    />
                    <Legend
                      verticalAlign="top"
                      height={36}
                      formatter={(value) => {
                        if (value === 'operationalAmount') return 'مصروف تشغيلي مباشر';
                        if (value === 'capitalAmount') return 'أصول رأسمالية';
                        if (value === 'distributorCash') return 'مسدد من عهدة الموزع';
                        if (value === 'totalAmount') return 'إجمالي المصروفات';
                        return value;
                      }}
                    />
                    <Bar
                      dataKey="operationalAmount"
                      name="operationalAmount"
                      stackId="a"
                      fill="#06b6d4"
                      radius={[0, 0, 0, 0]}
                    />
                    <Bar
                      dataKey="capitalAmount"
                      name="capitalAmount"
                      stackId="a"
                      fill="#6366f1"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="distributorCash"
                      name="distributorCash"
                      fill="#f59e0b"
                      radius={[4, 4, 0, 0]}
                    />
                    <Line
                      type="monotone"
                      dataKey="totalAmount"
                      name="totalAmount"
                      stroke="#10b981"
                      strokeWidth={3}
                      dot={{ r: 4, fill: '#10b981' }}
                    />
                  </ComposedChart>
                ) : chartMode === 'category_breakdown' ? (
                  <BarChart data={monthlyData} margin={{ top: 15, right: 10, left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="monthLabel" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                    <YAxis
                      stroke="#94a3b8"
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '12px',
                        color: '#f8fafc',
                        fontSize: '12px',
                        direction: 'rtl',
                      }}
                      formatter={(val: any, name: any) => [
                        `${Number(val).toLocaleString()} ر.ي`,
                        CATEGORY_META[name as ExpenseCategory]?.label || name,
                      ]}
                    />
                    <Legend
                      verticalAlign="top"
                      height={36}
                      formatter={(val) => CATEGORY_META[val as ExpenseCategory]?.label || val}
                    />
                    <Bar dataKey="internet_bandwidth" stackId="cat" fill="#06b6d4" />
                    <Bar dataKey="printing_cards" stackId="cat" fill="#f59e0b" />
                    <Bar dataKey="power_energy" stackId="cat" fill="#eab308" />
                    <Bar dataKey="maintenance_hardware" stackId="cat" fill="#f43f5e" />
                    <Bar dataKey="transport_distribution" stackId="cat" fill="#10b981" />
                    <Bar dataKey="capital_assets" stackId="cat" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                ) : (
                  <BarChart data={monthlyData} margin={{ top: 15, right: 10, left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="monthLabel" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                    <YAxis
                      stroke="#94a3b8"
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '12px',
                        color: '#f8fafc',
                        fontSize: '12px',
                        direction: 'rtl',
                      }}
                      formatter={(val: any, name: any) => [
                        `${Number(val).toLocaleString()} ر.ي`,
                        name === 'distributorCash'
                          ? 'عهدة الموزع'
                          : name === 'adminCash'
                          ? 'خزينة الإدارة'
                          : name === 'bankWallet'
                          ? 'بنك ومحافظ'
                          : 'آجل موردين',
                      ]}
                    />
                    <Legend
                      verticalAlign="top"
                      height={36}
                      formatter={(val) => {
                        if (val === 'distributorCash') return 'عهدة الموزع';
                        if (val === 'adminCash') return 'خزينة الإدارة';
                        if (val === 'bankWallet') return 'بنك ومحافظ';
                        if (val === 'creditPayable') return 'آجل موردين';
                        return val;
                      }}
                    />
                    <Bar dataKey="distributorCash" stackId="fund" fill="#f59e0b" />
                    <Bar dataKey="adminCash" stackId="fund" fill="#10b981" />
                    <Bar dataKey="bankWallet" stackId="fund" fill="#06b6d4" />
                    <Bar dataKey="creditPayable" stackId="fund" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>

          {/* Two-Column Grid: Donut Category Share & Funding Source Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Box 1: Category Distribution Donut */}
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 sm:p-6 space-y-4 shadow-md flex flex-col justify-between">
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <PieIcon className="w-5 h-5 text-amber-400" />
                    <h3 className="font-extrabold text-sm sm:text-base text-white">
                      التوزيع النسبي لبنود التكاليف
                    </h3>
                  </div>

                  {/* Filter by Month for Donut */}
                  <select
                    value={selectedMonthFilter}
                    onChange={(e) => setSelectedMonthFilter(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1 text-xs text-white font-bold focus:outline-hidden focus:border-indigo-500"
                  >
                    <option value="all">جميع الأشهر مجتمعة</option>
                    {distinctMonths.map((m) => (
                      <option key={m} value={m}>
                        {formatArabicMonth(m)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-4 mt-4">
                  {/* Donut Chart */}
                  <div className="h-56 w-full flex items-center justify-center">
                    {categoryDistributionData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={categoryDistributionData}
                            dataKey="amount"
                            nameKey="label"
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={80}
                            paddingAngle={3}
                          >
                            {categoryDistributionData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#0f172a',
                              borderColor: '#334155',
                              borderRadius: '12px',
                              color: '#f8fafc',
                              fontSize: '11px',
                              direction: 'rtl',
                            }}
                            formatter={(val: any) => [`${Number(val).toLocaleString()} ر.ي`, 'المبلغ']}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="text-center text-xs text-slate-500">
                        لا توجد مصروفات مسجلة في هذه الفترة
                      </div>
                    )}
                  </div>

                  {/* Category Legend & Percentages List */}
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {categoryDistributionData.map((item) => (
                      <div
                        key={item.category}
                        className="p-2 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="text-slate-200 font-medium truncate">{item.label}</span>
                        </div>
                        <div className="text-left shrink-0 mr-2">
                          <span className="font-mono font-bold text-white block">
                            {item.amount.toLocaleString()} ر.ي
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {item.percentage}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-indigo-950/20 border border-indigo-500/20 text-xs text-indigo-300 flex items-center justify-between mt-2">
                <span>إجمالي المصروف في الفترة:</span>
                <span className="font-extrabold text-white font-mono">
                  {categoryDistributionData.reduce((s, i) => s + i.amount, 0).toLocaleString()} ر.ي
                </span>
              </div>
            </div>

            {/* Box 2: Funding Source Breakdown & Distributor Cash Control */}
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 sm:p-6 space-y-4 shadow-md flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-emerald-400" />
                    <h3 className="font-extrabold text-sm sm:text-base text-white">
                      توزيع مصادر السداد والتمويل
                    </h3>
                  </div>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold border border-emerald-500/30">
                    مراقبة السيولة
                  </span>
                </div>

                <div className="space-y-3 mt-4">
                  {fundingSourceData.map((source) => {
                    const totalSum = fundingSourceData.reduce((s, i) => s + i.amount, 0) || 1;
                    const percent = ((source.amount / totalSum) * 100).toFixed(1);
                    return (
                      <div key={source.name} className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-3 h-3 rounded-md shrink-0"
                              style={{ backgroundColor: source.color }}
                            />
                            <span className="font-bold text-white">{source.name}</span>
                          </div>
                          <div className="text-left font-mono">
                            <span className="font-bold text-slate-200">
                              {source.amount.toLocaleString()} ر.ي
                            </span>
                            <span className="text-[10px] text-slate-400 mr-2">({percent}%)</span>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${percent}%`,
                              backgroundColor: source.color,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Informative Guidance */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-amber-500/30 text-xs text-amber-300/90 leading-relaxed mt-2 flex items-start gap-2.5">
                <Coins className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <p>
                  أي مصروف يتم تسجيله بطريقة <strong>"عهدة الموزع"</strong> يُخصم مباشرة من الكاش المحصل الميداني المتوفر بيد الموزع ولا يدخل ضمن المبالغ المطلوبة منه تسليمها للإدارة.
                </p>
              </div>
            </div>
          </div>

          {/* Monthly Detailed Cost Breakdown Table */}
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 space-y-4 shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <TableIcon className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-sm sm:text-base text-white">
                  جدول الملخص الشهري للتكاليف والنفقات
                </h3>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                {monthlyData.length} شهور مسجلة
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-3 font-bold">الشهر</th>
                    <th className="p-3 font-bold text-center">إجمالي المصروفات</th>
                    <th className="p-3 font-bold text-center">مصروفات تشغيلية</th>
                    <th className="p-3 font-bold text-center">أصول رأسمالية</th>
                    <th className="p-3 font-bold text-center">مسدد من الموزع</th>
                    <th className="p-3 font-bold text-center">مسدد من الإدارة/البنك</th>
                    <th className="p-3 font-bold text-center">عدد السندات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {monthlyData.map((row) => (
                    <tr
                      key={row.monthKey}
                      className="hover:bg-slate-800/40 transition"
                    >
                      <td className="p-3 font-sans font-bold text-white flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        <span>{row.monthLabel}</span>
                      </td>
                      <td className="p-3 text-center font-bold text-white">
                        {row.totalAmount > 0 ? (
                          <span className="text-rose-400">{row.totalAmount.toLocaleString()} ر.ي</span>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>
                      <td className="p-3 text-center text-cyan-400">
                        {row.operationalAmount > 0 ? `${row.operationalAmount.toLocaleString()} ر.ي` : '-'}
                      </td>
                      <td className="p-3 text-center text-indigo-400">
                        {row.capitalAmount > 0 ? `${row.capitalAmount.toLocaleString()} ر.ي` : '-'}
                      </td>
                      <td className="p-3 text-center text-amber-400">
                        {row.distributorCash > 0 ? `${row.distributorCash.toLocaleString()} ر.ي` : '-'}
                      </td>
                      <td className="p-3 text-center text-emerald-400">
                        {row.adminCash + row.bankWallet > 0
                          ? `${(row.adminCash + row.bankWallet).toLocaleString()} ر.ي`
                          : '-'}
                      </td>
                      <td className="p-3 text-center text-slate-300">
                        {row.vouchersCount > 0 ? (
                          <span className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-[11px]">
                            {row.vouchersCount} سند
                          </span>
                        ) : (
                          <span className="text-slate-600">0</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* AI Insights & Gemini Report Section (Visible when activeTab is 'ai_insights' or 'all') */}
      {(activeTab === 'ai_insights' || activeTab === 'all') && (
        <div className="space-y-6 pt-2">
          {analysis ? (
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* Health Score and Summary Card */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Score Radial Box */}
                <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 flex flex-col items-center justify-center text-center shadow-lg">
                  <span className="text-xs text-slate-400 font-bold mb-3">مؤشر الصحة المالية للشبكة</span>
                  <div className="relative w-28 h-28 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                      <path
                        className="text-slate-800"
                        strokeWidth="3.5"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path
                        className={
                          analysis.financialHealthScore >= 80
                            ? 'text-emerald-500'
                            : analysis.financialHealthScore >= 60
                            ? 'text-amber-500'
                            : 'text-rose-500'
                        }
                        strokeDasharray={`${analysis.financialHealthScore}, 100`}
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                    <div className="absolute flex flex-col items-center">
                      <span className="text-2xl font-black text-white">{analysis.financialHealthScore}</span>
                      <span className="text-[10px] text-slate-400">من 100</span>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-emerald-400 mt-3">
                    {analysis.financialHealthScore >= 80
                      ? 'أداء مالي مستقر وممتاز'
                      : 'يحتاج متابعة وتصفية ديون'}
                  </span>
                </div>

                {/* Executive Summary */}
                <div className="md:col-span-2 bg-slate-900 rounded-2xl border border-slate-800 p-6 flex flex-col justify-between shadow-lg">
                  <div>
                    <h3 className="font-extrabold text-sm text-white mb-2 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                      الملخص التنفيذي لوضع الشبكة
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                      {analysis.summary}
                    </p>
                  </div>

                  {/* AI Cost Structure Notes */}
                  {analysis.costAnalysisNotes && (
                    <div className="pt-3 border-t border-slate-800 mt-3">
                      <span className="text-xs font-bold text-indigo-400 block mb-1">
                        تقييم الذكاء الاصطناعي لهيكل المصروفات والتكاليف:
                      </span>
                      <p className="text-xs text-slate-300 leading-relaxed bg-indigo-950/20 p-2.5 rounded-xl border border-indigo-500/20">
                        {analysis.costAnalysisNotes}
                      </p>
                    </div>
                  )}

                  <div className="pt-3 border-t border-slate-800 mt-3">
                    <span className="text-xs font-bold text-amber-400 block mb-1">
                      ملاحظات حركة وأداء الموزع الميداني:
                    </span>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {analysis.distributorPerformanceNotes}
                    </p>
                  </div>
                </div>
              </div>

              {/* Actionable Recommendations & Risk Analysis */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Recommendations */}
                <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 space-y-3 shadow-md">
                  <h3 className="font-bold text-sm text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    توصيات تشغيلية وضبط التكاليف
                  </h3>
                  <div className="space-y-2">
                    {analysis.actionableRecommendations.map((rec, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-2.5 text-xs text-slate-200"
                      >
                        <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center shrink-0 text-[10px] mt-0.5">
                          {idx + 1}
                        </span>
                        <p className="leading-relaxed">{rec}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Debt Risk Analysis */}
                <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 space-y-3 shadow-md">
                  <h3 className="font-bold text-sm text-white flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                    تحليل مخاطر الديون والمنافذ
                  </h3>
                  <div className="space-y-2">
                    {analysis.debtRiskAnalysis.length === 0 ? (
                      <div className="p-4 rounded-xl bg-slate-950 text-xs text-slate-400 text-center">
                        لا توجد مخاطر ديون حالية، جميع المنافذ ضمن سقف الائتمان المسموح.
                      </div>
                    ) : (
                      analysis.debtRiskAnalysis.map((risk, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-xl bg-slate-950 border border-rose-500/30 flex items-start gap-2.5 text-xs text-rose-300"
                        >
                          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                          <p className="leading-relaxed">{risk}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Prompt to run AI analysis */
            <div className="p-8 text-center bg-slate-900 rounded-2xl border border-slate-800 shadow-md">
              <Sparkles className="w-10 h-10 text-amber-400/60 mx-auto mb-2" />
              <h3 className="text-base font-bold text-white mb-1">
                تشغيل التدقيق المالي الذكي لشبكة قعزان نت
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto mb-4 leading-relaxed">
                انقر على الزر ليقوم نموذج Gemini بقراءة حركة المصروفات الشهرية، ديون المنافذ، ونقدية الموزع وتقديم توصيات مخصصة للحد من التكاليف.
              </p>
              <button
                onClick={handleRunAnalysis}
                disabled={isLoading}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs shadow-md transition cursor-pointer"
              >
                <Zap className="w-4 h-4 fill-slate-950" />
                <span>{isLoading ? 'جاري التحليل...' : 'تشغيل تحليل Gemini الآن'}</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
