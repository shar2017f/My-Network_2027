import React, { useState } from 'react';
import {
  Database,
  Download,
  Upload,
  RotateCcw,
  ShieldCheck,
  Cloud,
  CheckCircle,
  AlertTriangle,
  FileCode,
  HardDrive,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const BackupSyncView: React.FC = () => {
  const {
    currentRole,
    exportJSONBackup,
    importJSONBackup,
    resetAllDataToZero,
    batches,
    sheets,
    deliveries,
    payments,
    outlets,
    syncNowToCloud,
  } = useApp();

  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  // Download JSON backup
  const handleDownloadBackup = () => {
    const json = exportJSONBackup();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `qazan_net_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Upload JSON backup
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const success = importJSONBackup(content);
      if (success) {
        setImportStatus('تم استيراد النسخة الاحتياطية بنجاح وتحديث قاعدة البيانات المحلية!');
      } else {
        setImportStatus('خطأ: الملف غير صالح أو لا يطابق بنية بيانات قعزان نت.');
      }
      setTimeout(() => setImportStatus(null), 4000);
    };
    reader.readAsText(file);
  };

  const handleExecuteZeroReset = () => {
    resetAllDataToZero();
    setShowResetConfirm(false);
    setResetSuccess(true);
    setTimeout(() => setResetSuccess(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-extrabold text-white">النسخ الاحتياطي والمزامنة السحابية</h2>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-bold border border-blue-500/30">
            أمان البيانات
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          تصدير واستيراد قواعد بيانات قعزان نت محلياً وسحابياً وإمكانية التصفير التام
        </p>
      </div>

      {importStatus && (
        <div
          className={`p-4 rounded-xl text-xs font-bold flex items-center gap-2 border ${
            importStatus.includes('خطأ')
              ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
          }`}
        >
          {importStatus.includes('خطأ') ? (
            <AlertTriangle className="w-4 h-4 shrink-0" />
          ) : (
            <CheckCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{importStatus}</span>
        </div>
      )}

      {resetSuccess && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          <span>تم تصفير جميع البيانات بنجاح والبدء برصيد صفر لجميع السجلات!</span>
        </div>
      )}

      {/* Backup Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Export Card */}
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 space-y-4 flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center mb-3">
              <Download className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-white">تصدير نسخة احتياطية كاملة (JSON)</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              تحميل ملف يحتوي على كافة الدفعات، الشيتات، سندات التحويل والتوريد، والديون وسجل التدقيق لحفظها بأمان على جهازك أو إرسالها للمسؤول.
            </p>

            <div className="mt-4 p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1 text-slate-300">
              <div className="flex justify-between">
                <span>الدفعات المسجلة:</span>
                <span className="font-bold text-white">{batches.length}</span>
              </div>
              <div className="flex justify-between">
                <span>سندات التوريد والقبض:</span>
                <span className="font-bold text-white">{deliveries.length + payments.length}</span>
              </div>
              <div className="flex justify-between">
                <span>أوراق الشيتات المتتبعة:</span>
                <span className="font-bold text-white">{sheets.length}</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleDownloadBackup}
            className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-2 shadow-md shadow-amber-500/20 transition cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>تحميل ملف النسخة الاحتياطية (.json)</span>
          </button>
        </div>

        {/* Import Card */}
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 space-y-4 flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center mb-3">
              <Upload className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-white">استيراد واستعادة نسخة سابقة (JSON)</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              استعادة كاملة لقاعدة البيانات من ملف نسخة احتياطية سبق تصديره من قعزان نت. سيتم فحص ومطابقة البيانات تلقائياً.
            </p>

            <div className="mt-4 p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400">
              <div className="flex items-center gap-2 text-blue-400 mb-1 font-bold">
                <ShieldCheck className="w-4 h-4" />
                <span>التحقق الأمني الذاتي</span>
              </div>
              <span>يتم فحص توقيع النظام وتحديث المتصفح فوراً دون فقدان أي سند.</span>
            </div>
          </div>

          <label className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-white font-extrabold text-xs flex items-center justify-center gap-2 border border-slate-700 transition cursor-pointer">
            <Upload className="w-4 h-4 text-blue-400" />
            <span>اختر ملف النسخة الاحتياطية (.json)</span>
            <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>
      </div>

      {/* Cloud Firebase Sync Banner */}
      <div className="bg-slate-900 rounded-2xl border border-emerald-500/30 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-white">قاعدة البيانات والمزامنة السحابية الفورية</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                  Firebase Firestore
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                مزامنة فورية حية بين هاتف المسؤول وهاتف الموزع الميداني لحظة بلحظة
              </p>
            </div>
          </div>

          <button
            onClick={async () => {
              const ok = await syncNowToCloud();
              if (ok) {
                setImportStatus('تمت مزامنة جميع البيانات مع السحابة وهاتف الموزع بنجاح!');
                setTimeout(() => setImportStatus(null), 3000);
              }
            }}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 transition cursor-pointer shrink-0"
          >
            <Cloud className="w-4 h-4" />
            <span>مزامنة سحابية الآن (Sync)</span>
          </button>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-2 text-slate-300">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">حالة قاعدة البيانات:</span>
            <span className="font-bold text-emerald-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              متصلة بالسحابة وتزامن تلقائياً (Live Real-Time)
            </span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            كل حركة تسجلها (طبعة جديدة، سند تحويل، توريد لمنفذ، أو سند قبض وتسديد نقدية) تُرسل فوراً إلى هاتف الطرف الآخر وتظهر أمامه في نفس اللحظة.
          </p>
        </div>
      </div>

      {/* Danger Zone: Full Zero Reset */}
      {currentRole === 'admin' && (
        <div className="bg-slate-900 rounded-2xl border border-rose-500/30 p-6 space-y-4">
          <div className="flex items-center gap-2.5 text-rose-400">
            <AlertTriangle className="w-5 h-5" />
            <h3 className="font-extrabold text-sm text-white">تصفير النظام بالكامل من الصفر (Zero Reset)</h3>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">
            إجراء تصفير شامل لجميع دفعات الطباعة، سندات التحويل (TR)، سندات التوريد (DEL)، سندات القبض (PAY)، ومبيعات الأفراد، وتصفير جميع ديون المنافذ إلى 0 ر.ي لبدء دورة جديدة تماماً.
          </p>

          {!showResetConfirm ? (
            <button
              onClick={() => setShowResetConfirm(true)}
              className="py-2.5 px-4 rounded-xl bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white font-bold text-xs border border-rose-600/40 transition cursor-pointer"
            >
              تصفير جميع البيانات والبدء من الصفر
            </button>
          ) : (
            <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/50 space-y-3">
              <p className="text-xs font-bold text-rose-300">
                هل أنت متأكد تماماً من تصفير النظام بالكامل؟ لا يمكن التراجع عن هذا الإجراء بعد تنفيذه.
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExecuteZeroReset}
                  className="py-2 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs shadow-md transition cursor-pointer"
                >
                  نعم، صفّر النظام بالكامل الآن
                </button>
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer"
                >
                  إلغاء التصفير
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
