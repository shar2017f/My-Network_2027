import React, { useState } from 'react';
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
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { analyzeNetworkWithGemini, NetworkAnalysisResult } from '../services/geminiService';

export const SmartAnalyticsView: React.FC = () => {
  const {
    batches,
    outlets,
    deliveries,
    payments,
    distributorCashInHand,
    totalOutletsDebt,
  } = useApp();

  const [isLoading, setIsLoading] = useState(false);
  const [analysis, setAnalysis] = useState<NetworkAnalysisResult | null>(null);

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
      });
      setAnalysis(res);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-l from-slate-900 via-slate-900 to-amber-950/30 p-6 rounded-2xl border border-amber-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
              <Sparkles className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-extrabold text-white">
              التحليل المالي الذكي لشبكة قعزان نت (Gemini AI)
            </h2>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-bold border border-amber-500/30">
              ذكاء اصطناعي
            </span>
          </div>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
            تحليل فوري لمبيعات الكروت، سرعة التحصيل، مؤشرات مخاطر الديون على المنافذ، وتوصيات تشغيلية مخصصة لشبكة قعزان نت.
          </p>
        </div>

        <button
          onClick={handleRunAnalysis}
          disabled={isLoading}
          className="px-5 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 flex items-center gap-2 transition active:scale-95 disabled:opacity-50 cursor-pointer shrink-0"
        >
          {isLoading ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Zap className="w-4 h-4 fill-slate-950" />
          )}
          <span>{isLoading ? 'جاري التحليل الذكي...' : 'تشغيل التحليل المالي الآن'}</span>
        </button>
      </div>

      {/* Analysis Results */}
      {analysis ? (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Health Score and Summary Card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Score Radial Box */}
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 flex flex-col items-center justify-center text-center">
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
            <div className="md:col-span-2 bg-slate-900 rounded-2xl border border-slate-800 p-6 flex flex-col justify-between">
              <div>
                <h3 className="font-extrabold text-sm text-white mb-2 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  الملخص التنفيذي لوضع الشبكة
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  {analysis.summary}
                </p>
              </div>

              <div className="pt-4 border-t border-slate-800 mt-4">
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
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 space-y-3">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                توصيات تشغيلية مقترحة
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
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 space-y-3">
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
        /* Empty Preview State */
        <div className="p-12 text-center bg-slate-900 rounded-2xl border border-slate-800">
          <Sparkles className="w-12 h-12 text-amber-400/50 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white mb-1">
            جاهز لتحليل الوضع المالي لشبكة قعزان نت
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto mb-5 leading-relaxed">
            انقر على زر "تشغيل التحليل المالي الآن" ليقوم نموذج Gemini بقراءة حركة الدفعات، ديون المنافذ، ونقدية الموزع وتقديم تقرير إداري شامل.
          </p>
          <button
            onClick={handleRunAnalysis}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs shadow-md transition cursor-pointer"
          >
            <Zap className="w-4 h-4" />
            بدء التحليل الفوري
          </button>
        </div>
      )}
    </div>
  );
};
