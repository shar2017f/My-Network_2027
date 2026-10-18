import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import {
  Calendar,
  TrendingUp,
  Users,
  CreditCard,
  Layers,
  BarChart2,
  Activity,
  ArrowUpRight,
  Filter,
  Sparkles,
  Info,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { CARD_CATEGORIES_CONFIG } from '../constants/cardConfig';
import { CardCategory } from '../types';

type TimeFrame = 'daily' | 'weekly';
type MetricType = 'cards' | 'revenue';
type GroupByMode = 'distributor' | 'category';
type ChartType = 'bar' | 'area';

interface DistributorSalesChartProps {
  onNavigate?: (tab: any) => void;
}

// Preset color palette for distributors
const DISTRIBUTOR_COLORS: Record<string, string> = {
  'الموزع الميداني': '#10b981', // Emerald
  'المسؤول': '#f59e0b',          // Amber
  'موزع المنطقة الشرقية': '#3b82f6', // Blue
  'موزع المنطقة الغربية': '#a855f7', // Purple
  'موزع السوق المركزي': '#06b6d4',  // Cyan
};

const FALLBACK_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#a855f7', '#06b6d4', '#f43f5e', '#ec4899'];

// Arabic day names
const ARABIC_DAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

export const DistributorSalesChart: React.FC<DistributorSalesChartProps> = ({ onNavigate }) => {
  const { deliveries, directSales, currentRole } = useApp();

  const [timeFrame, setTimeFrame] = useState<TimeFrame>('daily');
  const [metric, setMetric] = useState<MetricType>('cards');
  const [groupBy, setGroupBy] = useState<GroupByMode>('distributor');
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [selectedDistributor, setSelectedDistributor] = useState<string>('all');
  const [showDemoIfEmpty, setShowDemoIfEmpty] = useState<boolean>(true);

  // Extract all unique distributors from deliveries and direct sales
  const allDistributors = useMemo(() => {
    const distSet = new Set<string>();
    deliveries.forEach((d) => {
      if (d.deliveredBy) distSet.add(d.deliveredBy);
    });
    directSales.forEach((s) => {
      if (s.soldBy) distSet.add(s.soldBy);
    });
    // Ensure default field distributor is included for clear role display
    if (distSet.size === 0) {
      distSet.add('الموزع الميداني');
    }
    return Array.from(distSet);
  }, [deliveries, directSales]);

  // Check if live data has any card sales
  const hasLiveData = deliveries.length > 0 || directSales.length > 0;

  // Generate realistic demo data if no live sales exist yet so admin/distributor can see the chart in action
  const demoSales = useMemo(() => {
    if (hasLiveData || !showDemoIfEmpty) return null;

    const demoDeliveries = [];
    const now = new Date();
    const categories: CardCategory[] = ['200', '500', '1000', '3000'];
    const outletsList = ['منفذ أبو شعيب', 'بقالة البركة', 'مركز الأمل', 'بقالة النور'];

    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];

      // Simulated sales pattern with weekend peaks
      const isPeak = i % 3 === 0;
      const cards1 = isPeak ? 180 : 120;
      const cards2 = isPeak ? 60 : 0;

      demoDeliveries.push({
        id: `demo-del-${i}-1`,
        date: dateStr,
        deliveredBy: 'الموزع الميداني',
        outletName: outletsList[i % outletsList.length],
        category: categories[i % categories.length],
        sheetsCount: cards1 / 60,
        cardsCount: cards1,
        totalAmount: (cards1 / 60) * (CARD_CATEGORIES_CONFIG[categories[i % categories.length]]?.defaultWholesaleSheetPrice || 25000),
      });

      if (cards2 > 0) {
        demoDeliveries.push({
          id: `demo-del-${i}-2`,
          date: dateStr,
          deliveredBy: 'الموزع الميداني',
          outletName: outletsList[(i + 1) % outletsList.length],
          category: '500' as CardCategory,
          sheetsCount: cards2 / 60,
          cardsCount: cards2,
          totalAmount: (cards2 / 60) * 25000,
        });
      }
    }
    return demoDeliveries;
  }, [hasLiveData, showDemoIfEmpty]);

  // Combine live sales or demo sales
  const effectiveDeliveries = hasLiveData ? deliveries : (demoSales || []);
  const effectiveDirectSales = hasLiveData ? directSales : [];

  // 1. Process Daily Data (Last 7 or 14 days)
  const dailyData = useMemo(() => {
    const daysCount = 7; // Last 7 days
    const result = [];
    const now = new Date();

    for (let i = daysCount - 1; i >= 0; i--) {
      const targetDate = new Date(now);
      targetDate.setDate(targetDate.getDate() - i);
      const dateStr = targetDate.toISOString().split('T')[0];
      const dayName = ARABIC_DAYS[targetDate.getDay()];
      const shortDate = `${targetDate.getDate()}/${targetDate.getMonth() + 1}`;

      // Filter deliveries & direct sales for this specific day
      let dayDeliveries = effectiveDeliveries.filter((d) => d.date === dateStr);
      let dayDirectSales = effectiveDirectSales.filter((s) => s.date === dateStr);

      if (selectedDistributor !== 'all') {
        dayDeliveries = dayDeliveries.filter((d) => d.deliveredBy === selectedDistributor);
        dayDirectSales = dayDirectSales.filter((s) => s.soldBy === selectedDistributor);
      }

      const row: Record<string, any> = {
        dateStr,
        label: `${dayName} (${shortDate})`,
        shortLabel: shortDate,
        totalCards: 0,
        totalRevenue: 0,
        outletCount: new Set(dayDeliveries.map((d) => d.outletName)).size,
      };

      // By Distributor totals
      allDistributors.forEach((dist) => {
        const distDeliveries = dayDeliveries.filter((d) => d.deliveredBy === dist);
        const distDirect = dayDirectSales.filter((s) => s.soldBy === dist);

        const distCards =
          distDeliveries.reduce((sum, d) => sum + (d.cardsCount || 0), 0) +
          distDirect.reduce((sum, s) => sum + (s.cardsCount || 0), 0);

        const distRevenue =
          distDeliveries.reduce((sum, d) => sum + (d.totalAmount || 0), 0) +
          distDirect.reduce((sum, s) => sum + (s.totalAmount || 0), 0);

        row[dist] = metric === 'cards' ? distCards : distRevenue;
        row[`${dist}_cards`] = distCards;
        row[`${dist}_revenue`] = distRevenue;
      });

      // By Category totals
      Object.keys(CARD_CATEGORIES_CONFIG).forEach((cat) => {
        const catDeliveries = dayDeliveries.filter((d) => d.category === cat);
        const catDirect = dayDirectSales.filter((s) => s.category === cat);

        const catCards =
          catDeliveries.reduce((sum, d) => sum + (d.cardsCount || 0), 0) +
          catDirect.reduce((sum, s) => sum + (s.cardsCount || 0), 0);

        const catRevenue =
          catDeliveries.reduce((sum, d) => sum + (d.totalAmount || 0), 0) +
          catDirect.reduce((sum, s) => sum + (s.totalAmount || 0), 0);

        row[`cat_${cat}`] = metric === 'cards' ? catCards : catRevenue;
        row[`cat_${cat}_cards`] = catCards;
        row[`cat_${cat}_revenue`] = catRevenue;
      });

      // Overall totals
      row.totalCards = dayDeliveries.reduce((sum, d) => sum + (d.cardsCount || 0), 0) +
        dayDirectSales.reduce((sum, s) => sum + (s.cardsCount || 0), 0);
      row.totalRevenue = dayDeliveries.reduce((sum, d) => sum + (d.totalAmount || 0), 0) +
        dayDirectSales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);

      row.displayValue = metric === 'cards' ? row.totalCards : row.totalRevenue;

      result.push(row);
    }

    return result;
  }, [effectiveDeliveries, effectiveDirectSales, selectedDistributor, metric, allDistributors]);

  // 2. Process Weekly Data (Last 4 Weeks)
  const weeklyData = useMemo(() => {
    const weeksCount = 4;
    const result = [];
    const now = new Date();

    for (let w = weeksCount - 1; w >= 0; w--) {
      // Calculate start and end of week (7-day buckets)
      const weekEnd = new Date(now);
      weekEnd.setDate(weekEnd.getDate() - w * 7);
      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekStart.getDate() - 6);

      const startStr = weekStart.toISOString().split('T')[0];
      const endStr = weekEnd.toISOString().split('T')[0];

      const weekLabel =
        w === 0
          ? 'الأسبوع الحالي'
          : w === 1
          ? 'الأسبوع الماضي'
          : `قبل ${w} أسابيع`;

      const dateRangeLabel = `${weekStart.getDate()}/${weekStart.getMonth() + 1} - ${weekEnd.getDate()}/${weekEnd.getMonth() + 1}`;

      // Filter deliveries & sales within this 7-day range
      let weekDeliveries = effectiveDeliveries.filter((d) => d.date >= startStr && d.date <= endStr);
      let weekDirectSales = effectiveDirectSales.filter((s) => s.date >= startStr && s.date <= endStr);

      if (selectedDistributor !== 'all') {
        weekDeliveries = weekDeliveries.filter((d) => d.deliveredBy === selectedDistributor);
        weekDirectSales = weekDirectSales.filter((s) => s.soldBy === selectedDistributor);
      }

      const row: Record<string, any> = {
        label: weekLabel,
        dateRange: dateRangeLabel,
        totalCards: 0,
        totalRevenue: 0,
        outletCount: new Set(weekDeliveries.map((d) => d.outletName)).size,
      };

      // By Distributor totals
      allDistributors.forEach((dist) => {
        const distDeliveries = weekDeliveries.filter((d) => d.deliveredBy === dist);
        const distDirect = weekDirectSales.filter((s) => s.soldBy === dist);

        const distCards =
          distDeliveries.reduce((sum, d) => sum + (d.cardsCount || 0), 0) +
          distDirect.reduce((sum, s) => sum + (s.cardsCount || 0), 0);

        const distRevenue =
          distDeliveries.reduce((sum, d) => sum + (d.totalAmount || 0), 0) +
          distDirect.reduce((sum, s) => sum + (s.totalAmount || 0), 0);

        row[dist] = metric === 'cards' ? distCards : distRevenue;
        row[`${dist}_cards`] = distCards;
        row[`${dist}_revenue`] = distRevenue;
      });

      // By Category totals
      Object.keys(CARD_CATEGORIES_CONFIG).forEach((cat) => {
        const catDeliveries = weekDeliveries.filter((d) => d.category === cat);
        const catDirect = weekDirectSales.filter((s) => s.category === cat);

        const catCards =
          catDeliveries.reduce((sum, d) => sum + (d.cardsCount || 0), 0) +
          catDirect.reduce((sum, s) => sum + (s.cardsCount || 0), 0);

        const catRevenue =
          catDeliveries.reduce((sum, d) => sum + (d.totalAmount || 0), 0) +
          catDirect.reduce((sum, s) => sum + (s.totalAmount || 0), 0);

        row[`cat_${cat}`] = metric === 'cards' ? catCards : catRevenue;
        row[`cat_${cat}_cards`] = catCards;
        row[`cat_${cat}_revenue`] = catRevenue;
      });

      row.totalCards = weekDeliveries.reduce((sum, d) => sum + (d.cardsCount || 0), 0) +
        weekDirectSales.reduce((sum, s) => sum + (s.cardsCount || 0), 0);
      row.totalRevenue = weekDeliveries.reduce((sum, d) => sum + (d.totalAmount || 0), 0) +
        weekDirectSales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);

      row.displayValue = metric === 'cards' ? row.totalCards : row.totalRevenue;

      result.push(row);
    }

    return result;
  }, [effectiveDeliveries, effectiveDirectSales, selectedDistributor, metric, allDistributors]);

  // Current active chart dataset
  const activeData = timeFrame === 'daily' ? dailyData : weeklyData;

  // KPI calculations for summary indicators
  const kpis = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const todayDeliveries = effectiveDeliveries.filter((d) => d.date === todayStr);
    const todayDirect = effectiveDirectSales.filter((s) => s.date === todayStr);

    const todayCards =
      todayDeliveries.reduce((sum, d) => sum + (d.cardsCount || 0), 0) +
      todayDirect.reduce((sum, s) => sum + (s.cardsCount || 0), 0);

    const todayRevenue =
      todayDeliveries.reduce((sum, d) => sum + (d.totalAmount || 0), 0) +
      todayDirect.reduce((sum, s) => sum + (s.totalAmount || 0), 0);

    // Current week totals (last item in weekly data)
    const currentWeekItem = weeklyData[weeklyData.length - 1] || { totalCards: 0, totalRevenue: 0 };

    // Total period sales in active dataset
    const totalPeriodCards = activeData.reduce((sum, r) => sum + (r.totalCards || 0), 0);
    const totalPeriodRevenue = activeData.reduce((sum, r) => sum + (r.totalRevenue || 0), 0);
    const averageCardsPerUnit = activeData.length > 0 ? Math.round(totalPeriodCards / activeData.length) : 0;

    // Find top selling distributor
    const distTotals: Record<string, number> = {};
    activeData.forEach((row) => {
      allDistributors.forEach((dist) => {
        distTotals[dist] = (distTotals[dist] || 0) + (row[`${dist}_cards`] || 0);
      });
    });

    let topDistributor = 'الموزع الميداني';
    let topDistributorCards = 0;
    Object.entries(distTotals).forEach(([name, count]) => {
      if (count > topDistributorCards) {
        topDistributorCards = count;
        topDistributor = name;
      }
    });

    return {
      todayCards,
      todayRevenue,
      weekCards: currentWeekItem.totalCards,
      weekRevenue: currentWeekItem.totalRevenue,
      totalPeriodCards,
      totalPeriodRevenue,
      averageCardsPerUnit,
      topDistributor,
      topDistributorCards,
    };
  }, [effectiveDeliveries, effectiveDirectSales, weeklyData, activeData, allDistributors]);

  // Custom Rich Tooltip for Recharts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    const dataRow = payload[0]?.payload;
    if (!dataRow) return null;

    return (
      <div className="bg-slate-950/95 border border-slate-700/80 p-3.5 rounded-xl shadow-2xl backdrop-blur-md min-w-[240px] text-right text-xs">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2.5">
          <span className="font-extrabold text-sm text-white flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-amber-400" />
            {dataRow.label}
          </span>
          {dataRow.dateRange && (
            <span className="text-[10px] text-slate-400 font-mono">{dataRow.dateRange}</span>
          )}
        </div>

        {/* Aggregate Totals */}
        <div className="grid grid-cols-2 gap-2 bg-slate-900/80 p-2 rounded-lg border border-slate-800/80 mb-2.5">
          <div>
            <span className="text-[10px] text-slate-400 block">إجمالي الكروت:</span>
            <span className="font-bold text-amber-400 text-sm">
              {Number(dataRow.totalCards || 0).toLocaleString()} <span className="text-[10px] text-slate-400">كرت</span>
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block">قيمة المبيعات:</span>
            <span className="font-bold text-emerald-400 text-sm">
              {Number(dataRow.totalRevenue || 0).toLocaleString()} <span className="text-[10px] text-slate-400">ر.ي</span>
            </span>
          </div>
        </div>

        {/* Series Breakdown */}
        <div className="space-y-1.5 pt-1">
          <span className="text-[10px] text-slate-400 font-semibold block mb-1">
            {groupBy === 'distributor' ? 'تفصيل الموزعين الميدانيين:' : 'تفصيل فئات الكروت:'}
          </span>

          {payload.map((entry: any, idx: number) => {
            const val = entry.value || 0;
            if (val === 0 && payload.length > 2) return null; // Skip zero items if many
            return (
              <div key={idx} className="flex items-center justify-between text-slate-300 py-0.5">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: entry.color || entry.fill }}
                  />
                  <span className="font-medium text-[11px] text-slate-200">{entry.name}:</span>
                </div>
                <span className="font-mono font-bold text-white text-[11px]">
                  {metric === 'cards'
                    ? `${Number(val).toLocaleString()} كرت`
                    : `${Number(val).toLocaleString()} ر.ي`}
                </span>
              </div>
            );
          })}
        </div>

        {dataRow.outletCount > 0 && (
          <div className="mt-2.5 pt-2 border-t border-slate-800/80 text-[10px] text-slate-400 flex items-center justify-between">
            <span>عدد المنافذ المخدمة:</span>
            <span className="font-bold text-blue-400">{dataRow.outletCount} منافذ</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-lg">
      {/* Header with Title and Mode Controls */}
      <div className="p-5 border-b border-slate-800/80 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500/20 to-amber-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-base text-white">
                    مبيعات الكروت اليومية والأسبوعية للموزعين الميدانيين
                  </h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                    رسم بياني تفاعلي Recharts
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  متابعة دقيقة لمعدل تصريف وشحن الكروت للمنافذ ومبيعات الميدان يوماً بيوم وأسبوعاً بأسبوع
                </p>
              </div>
            </div>
          </div>

          {/* Quick Toggle Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Timeframe Switcher */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setTimeFrame('daily')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  timeFrame === 'daily'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>يومي (7 أيام)</span>
              </button>
              <button
                onClick={() => setTimeFrame('weekly')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  timeFrame === 'weekly'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>أسبوعي (4 أسابيع)</span>
              </button>
            </div>

            {/* Metric Switcher (Cards vs Revenue) */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setMetric('cards')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  metric === 'cards'
                    ? 'bg-emerald-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="عرض بعدد الكروت المباعة"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>عدد الكروت</span>
              </button>
              <button
                onClick={() => setMetric('revenue')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  metric === 'revenue'
                    ? 'bg-emerald-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="عرض بقيمة المبيعات بالريال اليمني"
              >
                <span>المبيعات (ر.ي)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Secondary Filter Row: GroupBy, Distributor Filter, Chart Style */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            {/* Filter by Distributor */}
            <div className="flex items-center gap-1.5 bg-slate-950/80 px-2.5 py-1.5 rounded-xl border border-slate-800">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-400 text-[11px]">الموزع:</span>
              <select
                value={selectedDistributor}
                onChange={(e) => setSelectedDistributor(e.target.value)}
                className="bg-transparent text-white font-bold text-xs focus:outline-none cursor-pointer pr-1"
              >
                <option value="all" className="bg-slate-900 text-white">
                  جميع الموزعين الميدانيين
                </option>
                {allDistributors.map((dist) => (
                  <option key={dist} value={dist} className="bg-slate-900 text-white">
                    {dist}
                  </option>
                ))}
              </select>
            </div>

            {/* Group By Mode */}
            <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setGroupBy('distributor')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                  groupBy === 'distributor'
                    ? 'bg-slate-800 text-amber-400 border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                حسب الموزع
              </button>
              <button
                onClick={() => setGroupBy('category')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                  groupBy === 'category'
                    ? 'bg-slate-800 text-amber-400 border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                حسب فئة الكرت
              </button>
            </div>

            {/* Chart Style (Bar vs Area) */}
            <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setChartType('bar')}
                className={`p-1.5 rounded-lg transition cursor-pointer ${
                  chartType === 'bar' ? 'bg-slate-800 text-emerald-400' : 'text-slate-500 hover:text-slate-300'
                }`}
                title="مخطط أعمدة مكدس"
              >
                <BarChart2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setChartType('area')}
                className={`p-1.5 rounded-lg transition cursor-pointer ${
                  chartType === 'area' ? 'bg-slate-800 text-emerald-400' : 'text-slate-500 hover:text-slate-300'
                }`}
                title="مخطط انسيابي مساحي"
              >
                <TrendingUp className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Demo toggle when system is in zero-state */}
          {!hasLiveData && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-amber-300/80 flex items-center gap-1 bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/20">
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>عرض نموذج بياني توضيحي (Zero-State)</span>
              </span>
              <button
                onClick={() => setShowDemoIfEmpty(!showDemoIfEmpty)}
                className="text-[11px] text-slate-400 hover:text-white underline cursor-pointer"
              >
                {showDemoIfEmpty ? 'إخفاء التوضيح' : 'إظهار التوضيح'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-slate-950/50 border-b border-slate-800/80 text-xs">
        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-slate-400 block text-[11px]">مبيعات اليوم:</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-base sm:text-lg font-black text-amber-400">
              {kpis.todayCards.toLocaleString()}
            </span>
            <span className="text-[10px] text-slate-400">كرت</span>
            <span className="text-slate-500 text-[10px] mr-1">
              ({kpis.todayRevenue.toLocaleString()} ر.ي)
            </span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-slate-400 block text-[11px]">مبيعات الأسبوع الحالي:</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-base sm:text-lg font-black text-emerald-400">
              {kpis.weekCards.toLocaleString()}
            </span>
            <span className="text-[10px] text-slate-400">كرت</span>
            <span className="text-slate-500 text-[10px] mr-1">
              ({kpis.weekRevenue.toLocaleString()} ر.ي)
            </span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-slate-400 block text-[11px]">
            {timeFrame === 'daily' ? 'متوسط المبيعات اليومية:' : 'متوسط المبيعات الأسبوعية:'}
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-base sm:text-lg font-black text-blue-400">
              {kpis.averageCardsPerUnit.toLocaleString()}
            </span>
            <span className="text-[10px] text-slate-400">كرت / {timeFrame === 'daily' ? 'يوم' : 'أسبوع'}</span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-slate-400 block text-[11px]">أنشط موزع ميداني:</span>
          <div className="mt-1">
            <span className="text-sm font-bold text-purple-400 truncate block">
              {kpis.topDistributor}
            </span>
            <span className="text-[10px] text-slate-400">
              {kpis.topDistributorCards.toLocaleString()} كرت مسجل
            </span>
          </div>
        </div>
      </div>

      {/* Main Chart Canvas */}
      <div className="p-5">
        <div className="h-80 w-full">
          {activeData.some((r) => r.totalCards > 0 || r.totalRevenue > 0) ? (
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'bar' ? (
                <BarChart data={activeData} margin={{ top: 15, right: 10, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis
                    dataKey="label"
                    stroke="#64748b"
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    axisLine={{ stroke: '#334155' }}
                    tickLine={{ stroke: '#334155' }}
                  />
                  <YAxis
                    stroke="#64748b"
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    axisLine={{ stroke: '#334155' }}
                    tickLine={{ stroke: '#334155' }}
                    tickFormatter={(val) =>
                      val >= 1000 ? `${(val / 1000).toFixed(0)}k` : `${val}`
                    }
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    wrapperStyle={{ paddingTop: 10, fontSize: 12, direction: 'rtl' }}
                    iconType="circle"
                  />

                  {/* Render series depending on grouping */}
                  {groupBy === 'distributor' ? (
                    allDistributors.map((dist, idx) => (
                      <Bar
                        key={dist}
                        dataKey={dist}
                        name={dist}
                        fill={DISTRIBUTOR_COLORS[dist] || FALLBACK_COLORS[idx % FALLBACK_COLORS.length]}
                        stackId="sales"
                        radius={idx === allDistributors.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                        isAnimationActive={true}
                      />
                    ))
                  ) : (
                    Object.entries(CARD_CATEGORIES_CONFIG).map(([cat, config], idx) => {
                      const colors = ['#f59e0b', '#10b981', '#3b82f6', '#a855f7', '#f43f5e', '#06b6d4'];
                      return (
                        <Bar
                          key={cat}
                          dataKey={`cat_${cat}`}
                          name={`فئة ${cat} ريال`}
                          fill={colors[idx % colors.length]}
                          stackId="sales"
                          radius={idx === Object.keys(CARD_CATEGORIES_CONFIG).length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                          isAnimationActive={true}
                        />
                      );
                    })
                  )}
                </BarChart>
              ) : (
                <AreaChart data={activeData} margin={{ top: 15, right: 10, left: 10, bottom: 20 }}>
                  <defs>
                    <linearGradient id="colorSalesArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorRevenueArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis
                    dataKey="label"
                    stroke="#64748b"
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    axisLine={{ stroke: '#334155' }}
                  />
                  <YAxis
                    stroke="#64748b"
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    axisLine={{ stroke: '#334155' }}
                    tickFormatter={(val) =>
                      val >= 1000 ? `${(val / 1000).toFixed(0)}k` : `${val}`
                    }
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ paddingTop: 10, fontSize: 12, direction: 'rtl' }} />

                  {groupBy === 'distributor' ? (
                    allDistributors.map((dist, idx) => (
                      <Area
                        key={dist}
                        type="monotone"
                        dataKey={dist}
                        name={dist}
                        stroke={DISTRIBUTOR_COLORS[dist] || FALLBACK_COLORS[idx % FALLBACK_COLORS.length]}
                        fillOpacity={0.25}
                        fill={DISTRIBUTOR_COLORS[dist] || FALLBACK_COLORS[idx % FALLBACK_COLORS.length]}
                        strokeWidth={2}
                        isAnimationActive={true}
                      />
                    ))
                  ) : (
                    Object.entries(CARD_CATEGORIES_CONFIG).map(([cat, config], idx) => {
                      const colors = ['#f59e0b', '#10b981', '#3b82f6', '#a855f7', '#f43f5e', '#06b6d4'];
                      return (
                        <Area
                          key={cat}
                          type="monotone"
                          dataKey={`cat_${cat}`}
                          name={`فئة ${cat} ريال`}
                          stroke={colors[idx % colors.length]}
                          fillOpacity={0.2}
                          fill={colors[idx % colors.length]}
                          strokeWidth={2}
                          isAnimationActive={true}
                        />
                      );
                    })
                  )}
                </AreaChart>
              )}
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 border border-dashed border-slate-800 rounded-xl p-6 text-center">
              <CreditCard className="w-10 h-10 text-slate-500 mb-3" />
              <h4 className="font-bold text-sm text-slate-300">
                لا توجد مبيعات أو توريدات مسجلة في هذه الفترة
              </h4>
              <p className="text-xs text-slate-500 mt-1 max-w-md">
                قم بتسجيل أول عملية توريد كروت لمنفذ (DEL) أو مبيعات مباشرة لتظهر حركة المبيعات اليومية والأسبوعية تلقائياً وبشكل فوري هنا.
              </p>
              {onNavigate && (
                <button
                  onClick={() => onNavigate('outlets')}
                  className="mt-4 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition cursor-pointer"
                >
                  + تسجيل توريد لمنفذ الآن
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer Info / Guidance */}
      <div className="px-5 py-3 bg-slate-950/70 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-400">
        <div className="flex items-center gap-2">
          <Info className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>
            يتم تحديث الرسم البياني تلقائياً في الوقت الفعلي عند تسجيل أي سند توريد أو بيع مباشر عبر الموزع.
          </span>
        </div>
        {onNavigate && (
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => onNavigate('outlets')}
              className="text-emerald-400 hover:text-emerald-300 font-semibold cursor-pointer"
            >
              سندات التوريد ←
            </button>
            <button
              onClick={() => onNavigate('outlet_performance')}
              className="text-amber-400 hover:text-amber-300 font-semibold cursor-pointer"
            >
              أداء المنافذ ←
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
