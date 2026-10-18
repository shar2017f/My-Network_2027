import React, { useState } from 'react';
import {
  LineChart,
  Store,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  AlertTriangle,
  Search,
  Filter,
  BarChart2,
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, Tooltip } from 'recharts';
import { useApp } from '../context/AppContext';

export const OutletPerformanceView: React.FC = () => {
  const { outlets, deliveries, payments } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'debt' | 'delivered' | 'paid' | 'rate'>('debt');

  // Compute performance data for each outlet
  const performanceData = outlets.map((outlet) => {
    const outletDeliveries = deliveries.filter((d) => d.outletId === outlet.id);
    const outletPayments = payments.filter((p) => p.outletId === outlet.id);

    const totalDelivered = outlet.totalDeliveredAmount;
    const totalPaid = outlet.totalPaidAmount;
    const currentDebt = outlet.currentDebt;
    const paymentRate =
      totalDelivered > 0 ? Math.min(100, Math.round((totalPaid / totalDelivered) * 100)) : 100;

    // Mini chart data sequence (simulating timeline of events or deliveries)
    const timelineData = [
      { step: '1', balance: 0 },
      ...outletDeliveries.slice(-4).map((d, idx) => ({
        step: `ت${idx + 1}`,
        balance: d.totalAmount,
      })),
      ...outletPayments.slice(-4).map((p, idx) => ({
        step: `ق${idx + 1}`,
        balance: p.amount,
      })),
    ];

    // Status rating
    let statusLabel = 'ممتاز (سداد كامل)';
    let statusColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';

    if (currentDebt > outlet.creditLimit && outlet.creditLimit > 0) {
      statusLabel = 'حرج (تجاوز السقف)';
      statusColor = 'text-rose-400 bg-rose-500/10 border-rose-500/20';
    } else if (currentDebt > outlet.creditLimit * 0.7 && outlet.creditLimit > 0) {
      statusLabel = 'تنبيه (دين مرتفع)';
      statusColor = 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    } else if (currentDebt > 0) {
      statusLabel = 'نشط (سداد منتظم)';
      statusColor = 'text-blue-400 bg-blue-500/10 border-blue-500/20';
    }

    return {
      outlet,
      totalDelivered,
      totalPaid,
      currentDebt,
      paymentRate,
      timelineData,
      statusLabel,
      statusColor,
      deliveriesCount: outletDeliveries.length,
      paymentsCount: outletPayments.length,
    };
  });

  // Sort
  const sortedData = [...performanceData].sort((a, b) => {
    if (sortBy === 'debt') return b.currentDebt - a.currentDebt;
    if (sortBy === 'delivered') return b.totalDelivered - a.totalDelivered;
    if (sortBy === 'paid') return b.totalPaid - a.totalPaid;
    if (sortBy === 'rate') return a.paymentRate - b.paymentRate;
    return 0;
  });

  const filteredData = sortedData.filter((item) =>
    item.outlet.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 p-5 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-extrabold text-white">
              تقرير أداء المنافذ والرسوم البيانية المصغرة
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
              Mini Charts
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            مؤشرات المسحوبات، التسديدات، صافي المديونية، ورسم بياني تفاعلي مصغر لكل منفذ
          </p>
        </div>

        {/* Sort Controls */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-slate-400 shrink-0">ترتيب حسب:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-amber-500 font-bold"
          >
            <option value="debt">الأعلى مديونية</option>
            <option value="delivered">الأعلى مسحوبات</option>
            <option value="paid">الأعلى سداداً</option>
            <option value="rate">نسبة السداد الأقل</option>
          </select>
        </div>
      </div>

      {/* Search Input */}
      <div className="bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="البحث باسم المنفذ..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-9 pl-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Outlets Performance Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredData.map(
          ({
            outlet,
            totalDelivered,
            totalPaid,
            currentDebt,
            paymentRate,
            timelineData,
            statusLabel,
            statusColor,
            deliveriesCount,
            paymentsCount,
          }) => (
            <div
              key={outlet.id}
              className="bg-slate-900 rounded-2xl border border-slate-800 p-5 space-y-4 hover:border-slate-700 transition flex flex-col justify-between"
            >
              <div>
                {/* Top Info */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center font-bold text-amber-400 border border-slate-700">
                      <Store className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-white">{outlet.name}</h3>
                      <p className="text-[11px] text-slate-400">{outlet.location}</p>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] px-2.5 py-1 rounded-full font-bold border ${statusColor}`}
                  >
                    {statusLabel}
                  </span>
                </div>

                {/* Financial KPI Numbers */}
                <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-slate-950 border border-slate-800 text-center mb-3">
                  <div>
                    <span className="text-[10px] text-slate-400 block">إجمالي المسحوبات</span>
                    <span className="font-bold text-xs text-blue-400 mt-0.5 block">
                      {totalDelivered.toLocaleString()}
                    </span>
                    <span className="text-[9px] text-slate-500">{deliveriesCount} توريد</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">إجمالي التسديدات</span>
                    <span className="font-bold text-xs text-emerald-400 mt-0.5 block">
                      {totalPaid.toLocaleString()}
                    </span>
                    <span className="text-[9px] text-slate-500">{paymentsCount} سند قبض</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">صافي الدين</span>
                    <span
                      className={`font-black text-xs mt-0.5 block ${
                        currentDebt > 0 ? 'text-rose-400' : 'text-slate-400'
                      }`}
                    >
                      {currentDebt.toLocaleString()}
                    </span>
                    <span className="text-[9px] text-slate-500">ر.ي</span>
                  </div>
                </div>

                {/* Payment Ratio Progress */}
                <div className="space-y-1 mb-4">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-400">نسبة الالتزام بالسداد:</span>
                    <span className="font-bold text-white">{paymentRate}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                    <div
                      style={{ width: `${paymentRate}%` }}
                      className={`h-full ${
                        paymentRate >= 80
                          ? 'bg-emerald-500'
                          : paymentRate >= 50
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                      }`}
                    />
                  </div>
                </div>

                {/* Mini Sparkline Chart */}
                <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                    <span className="flex items-center gap-1 font-semibold">
                      <BarChart2 className="w-3 h-3 text-emerald-400" />
                      الرسم البياني المصغر (Mini Chart)
                    </span>
                    <span>تتبع النشاط</span>
                  </div>

                  <div className="h-20 w-full">
                    {timelineData.length > 1 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={timelineData}>
                          <defs>
                            <linearGradient
                              id={`colorGrad-${outlet.id}`}
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#0f172a',
                              borderColor: '#334155',
                              fontSize: '10px',
                              borderRadius: '0.5rem',
                              color: '#fff',
                            }}
                            formatter={(val: any) => [val != null ? `${Number(val).toLocaleString()} ر.ي` : '0 ر.ي']}
                          />
                          <Area
                            type="monotone"
                            dataKey="balance"
                            stroke="#10b981"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill={`url(#colorGrad-${outlet.id})`}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-[10px] text-slate-500">
                        الرصيد مصفّر 0 ر.ي (لا توجد حركات سابقة)
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom limit note */}
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
                <span>سقف الائتمان: {outlet.creditLimit.toLocaleString()} ر.ي</span>
                <span dir="ltr" className="font-mono text-slate-400">
                  {outlet.phone}
                </span>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
};
