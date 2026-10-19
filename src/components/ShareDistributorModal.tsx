import React, { useState, useEffect } from 'react';
import {
  X,
  Share2,
  Copy,
  Check,
  Send,
  Smartphone,
  ShieldCheck,
  Zap,
  QrCode,
  ExternalLink,
  UserCheck,
  Wifi,
  Lock,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

interface ShareDistributorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShareDistributorModal: React.FC<ShareDistributorModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    currentRole,
    setCurrentRole,
    adminPin,
    distributorPin,
    permissions,
    setShowDistributorWelcome,
  } = useApp();
  const [copied, setCopied] = useState(false);
  const [showQrExpanded, setShowQrExpanded] = useState(false);

  // Generate the full distributor URL with invite parameters
  const getDistributorUrl = () => {
    if (typeof window === 'undefined') return '';
    const origin = window.location.origin;
    return `${origin}/?role=distributor&invite=true`;
  };

  const distributorUrl = getDistributorUrl();

  const handleCopy = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(distributorUrl);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = distributorUrl;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleWhatsAppShare = () => {
    const text = `مرحباً بك في شبكة قعزان نت 🌐\n\nإليك رابط حسابك المخصص كموزع ميداني لإدارة كروت الإنترنت، توريد السندات للمحلات، وتحصيل المبالغ النقدية مباشرة:\n\n🔗 الرابط المباشر:\n${distributorUrl}\n\n🔑 رمز الدخول المبدئي المؤقت: ${distributorPin || '0000'}\n(عند فتح الرابط ستظهر لك شاشة ترحيب تطلب منك تعيين رمز PIN شخصي مكون من 4 أرقام خاص بك لحماية حسابك).\n\n📲 ملاحظة: بعد فتح الرابط، اضغط على زر "تثبيت التطبيق على الشاشة الرئيسية" ليصبح كأيقونة تطبيق أندرويد/آيفون على جوالك.`;
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    try {
      const a = document.createElement('a');
      a.href = whatsappUrl;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleSwitchToDistributor = () => {
    setCurrentRole('distributor');
    onClose();
  };

  const handlePreviewWelcome = () => {
    setShowDistributorWelcome(true);
    onClose();
  };

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative text-right overflow-hidden flex flex-col max-h-[90vh]"
        dir="rtl"
      >
        {/* Decorative Top Accent */}
        <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-amber-500" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shadow-inner">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-white">حساب ورابط الموزع الميداني</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  مشاركة فورية
                </span>
              </div>
              <p className="text-xs text-slate-400">
                أرسل هذا الرابط للموزع ليفتح التطبيق على هاتفه بوضعه المخصص
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="overflow-y-auto space-y-4 py-4 pr-1">
          {/* Main Link Box */}
          <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Share2 className="w-3.5 h-3.5 text-emerald-400" />
                رابط الموزع الميداني المباشر:
              </span>
              <span className="text-[10px] text-emerald-400 font-mono">
                ?role=distributor
              </span>
            </div>

            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl p-2.5">
              <input
                type="text"
                readOnly
                value={distributorUrl}
                className="flex-1 bg-transparent text-xs text-emerald-300 font-mono truncate focus:outline-hidden text-left"
                dir="ltr"
              />
              <button
                onClick={handleCopy}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shrink-0 ${
                  copied
                    ? 'bg-emerald-500 text-slate-950 font-black'
                    : 'bg-slate-800 hover:bg-slate-700 text-white'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>تم النسخ!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>نسخ</span>
                  </>
                )}
              </button>
            </div>

            {/* Quick Share Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={handleWhatsAppShare}
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>إرسال عبر واتساب</span>
              </button>

              <button
                onClick={() => setShowQrExpanded(!showQrExpanded)}
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition cursor-pointer"
              >
                <QrCode className="w-4 h-4 text-amber-400" />
                <span>{showQrExpanded ? 'إخفاء الباركود' : 'عرض رمز QR'}</span>
              </button>
            </div>
          </div>

          {/* QR Code Section (Expandable or Quick View) */}
          {showQrExpanded && (
            <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800 text-center animate-in fade-in duration-150">
              <p className="text-xs font-bold text-slate-300 mb-2">
                امسح الرمز بكاميرا هاتف الموزع لفتح الحساب مباشرة:
              </p>
              <div className="bg-white p-3 rounded-2xl inline-block shadow-lg mx-auto">
                {/* Visual QR Code Image generated via standard reliable SVG Data URI */}
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                    distributorUrl
                  )}&color=0f172a&bgcolor=ffffff`}
                  alt="QR Code رابط الموزع"
                  className="w-40 h-40 object-contain mx-auto"
                  onError={(e) => {
                    // Fallback visual if offline
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-2">
                يعمل على جميع هواتف أندرويد وآيفون عبر الكاميرا العادية
              </p>
            </div>
          )}

          {/* How It Works Steps */}
          <div className="bg-slate-950/60 rounded-2xl p-4 border border-slate-800/80 space-y-3">
            <h4 className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" />
              كيف يعمل حساب الموزع؟ (دليل سريع):
            </h4>

            <div className="space-y-2.5 text-xs text-slate-300">
              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-lg bg-emerald-500/20 text-emerald-400 font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                  1
                </div>
                <div>
                  <span className="font-bold text-white">دخول تلقائي وتعيين كلمة المرور:</span>
                  <p className="text-slate-400 text-[11px] mt-0.5">
                    بمجرد فتح الرابط المشفر، تظهر للموزع واجهة «الترحيب بالموزع» وتطلب منه تعيين رمز PIN شخصي مكون من 4 أرقام لأول مرة لحماية حسابه ونقدية عهدته. الرمز المبدئي المؤقت هو: <strong className="text-emerald-400 font-mono">{distributorPin || '0000'}</strong>.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-lg bg-amber-500/20 text-amber-400 font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                  2
                </div>
                <div>
                  <span className="font-bold text-white">حماية حساب المسؤول بالكامل:</span>
                  <p className="text-slate-400 text-[11px] mt-0.5">
                    الموزع محجوب تماماً عن شاشات طباعة الكروت وحذف السجلات وتغيير الصلاحيات. وإذا حاول التبديل لحساب المسؤول، يطلب التطبيق رمز PIN السري الخاص بك كمدير: <strong className="text-amber-400 font-mono">{adminPin}</strong>.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-lg bg-teal-500/20 text-teal-400 font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                  3
                </div>
                <div>
                  <span className="font-bold text-white">تثبيت التطبيق على الجوال (PWA):</span>
                  <p className="text-slate-400 text-[11px] mt-0.5">
                    في أعلى صفحة الموزع يوجد زر «تثبيت التطبيق 📲»، بنقرة واحدة يتم تثبيته كأيقونة على شاشة جواله ليعمل كتطبيق جوال أصيل بدون متجر.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-lg bg-purple-500/20 text-purple-400 font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                  4
                </div>
                <div>
                  <span className="font-bold text-white">مزامنة سحابية لحظية 🟢:</span>
                  <p className="text-slate-400 text-[11px] mt-0.5">
                    كلا الجهازين متصلان بنفس قاعدة البيانات السحابية (Firebase). عندما تصرف له كروت عهدة أو يورد سند لمحطة أو يسلمك نقدية، يتم التحديث في نفس اللحظة مع رنات صوتية وتنبيهات فورية.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePreviewWelcome}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-bold text-xs transition border border-emerald-500/30 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>معاينة شاشة ترحيب الموزع (Onboarding) 👁️</span>
            </button>

            <button
              onClick={handleSwitchToDistributor}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs transition border border-slate-700 cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
              <span>التبديل لواجهة الموزع</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs transition cursor-pointer"
          >
            تم وإغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
