import React, { useState } from 'react';
import {
  Sparkles,
  ShieldCheck,
  Smartphone,
  Key,
  CheckCircle,
  ArrowLeft,
  ArrowRight,
  Send,
  Layers,
  Store,
  Coins,
  Check,
  Download,
  AlertCircle,
  Eye,
  EyeOff,
  Wifi,
  Lock,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { soundService } from '../utils/sound';

interface DistributorWelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DistributorWelcomeModal: React.FC<DistributorWelcomeModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    distributorPin,
    setDistributorPin,
    setDistributorSetupDone,
    isCloudConnected,
    adminPin,
    setActiveTab,
  } = useApp();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPinText, setShowPinText] = useState(false);
  const [pinError, setPinError] = useState('');
  const [pinSaved, setPinSaved] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showInstallHint, setShowInstallHint] = useState(false);

  // Listen for beforeinstallprompt event if available
  React.useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!isOpen) return null;

  const handleSavePin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (newPin.length !== 4 || !/^\d+$/.test(newPin)) {
      setPinError('يجب أن يتكون رمز PIN من 4 أرقام بالضبط');
      soundService.playAlert();
      return;
    }
    if (newPin !== confirmPin) {
      setPinError('رمز PIN وتأكيده غير متطابقين، يرجى إعادة التأكد');
      soundService.playAlert();
      return;
    }

    setDistributorPin(newPin);
    setPinError('');
    setPinSaved(true);
    soundService.playSuccess();
    setTimeout(() => {
      setStep(3);
    }, 800);
  };

  const handleFinishOnboarding = () => {
    setDistributorSetupDone(true);
    soundService.playSuccess();
    onClose();
    setActiveTab('custody_cash');
  };

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
        soundService.playSuccess();
      }
      setDeferredPrompt(null);
    } else {
      setShowInstallHint((prev) => !prev);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200"
      dir="rtl"
    >
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-xl w-full p-5 sm:p-7 shadow-2xl relative text-right flex flex-col max-h-[92vh] overflow-hidden">
        {/* Top Decorative Gradient */}
        <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-500" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-slate-950 flex items-center justify-center shadow-lg shadow-emerald-500/20 font-black">
              <Sparkles className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-extrabold text-white">
                  مرحباً بك في شبكة قعزان نت
                </h2>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  الموزع الميداني
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                دليل البدء السريع وإعداد حسابك الميداني المؤمن
              </p>
            </div>
          </div>

          {/* Stepper Dots */}
          <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                  step === s
                    ? 'bg-emerald-400 w-6'
                    : step > s
                    ? 'bg-emerald-600'
                    : 'bg-slate-700'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="overflow-y-auto space-y-4 py-4 pr-1 flex-1">
          {/* STEP 1: Workflow Overview */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-200">
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                <h3 className="font-extrabold text-sm text-emerald-300 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  أهلاً بك في حسابك المخصص للعمل الميداني
                </h3>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  هذا الحساب تم إعداده خصيصاً لك لتقوم بإدارة كروت الإنترنت، توزيع الشيتات على المحلات، تحصيل النقدية، وقيد الديون مباشرة مع مزامنة سحابية فورية مع هاتف المسؤول.
                </p>
              </div>

              <h4 className="text-xs font-bold text-slate-300">
                خطوات عملك الميداني اليومي (4 محاور رئيسية):
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 font-black text-xs flex items-center justify-center">
                      1
                    </span>
                    <span className="font-bold text-xs text-white flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-amber-400" />
                      استلام عهدة الكروت
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed pr-8">
                    معاينة الشيتات المسلمة لك من المدير بفئاتها (200, 500, 1000, 3000, 5000 ر.ي) والتأكد من أرقام الشيتات ورصيدك بالكامل.
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-teal-500/20 text-teal-400 font-black text-xs flex items-center justify-center">
                      2
                    </span>
                    <span className="font-bold text-xs text-white flex items-center gap-1.5">
                      <Store className="w-3.5 h-3.5 text-teal-400" />
                      توريد الكروت للمنافذ (DEL)
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed pr-8">
                    تسليم الشيتات للبقالات والمحلات وإصدار سند توريد فوري يحدد المبلغ المقبوض كاش والمتبقي المقيد كدين على المنفذ.
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 font-black text-xs flex items-center justify-center">
                      3
                    </span>
                    <span className="font-bold text-xs text-white flex items-center gap-1.5">
                      <Coins className="w-3.5 h-3.5 text-emerald-400" />
                      تحصيل النقدية (PAY)
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed pr-8">
                    قبض مبالغ سداد الديون من أصحاب المحلات وتسجيل سند قبض فوري يخفض ديونهم ويضيف النقدية لعهدة يدك فوراً.
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-purple-500/20 text-purple-400 font-black text-xs flex items-center justify-center">
                      4
                    </span>
                    <span className="font-bold text-xs text-white flex items-center gap-1.5">
                      <Send className="w-3.5 h-3.5 text-purple-400" />
                      تسليم الكاش للمسؤول (CSH)
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed pr-8">
                    عند تسليم المبالغ المحصلة للمسؤول، تسجل طلب تسليم كاش ليقبله المسؤول وتتصفر عهدتك بأمان وشفافية تامة.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between text-xs text-slate-300">
                <span className="flex items-center gap-2 font-medium">
                  <Wifi className="w-4 h-4 text-emerald-400" />
                  حالة المزامنة السحابية اللحظية:
                </span>
                <span className="font-bold text-emerald-400">
                  {isCloudConnected ? 'متصل ومزامن مباشرة 🟢' : 'حفظ محلي آمن 🟡'}
                </span>
              </div>
            </div>
          )}

          {/* STEP 2: Setting Personal Password / PIN */}
          {step === 2 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-200">
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25">
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-amber-400 shrink-0" />
                  <h3 className="font-extrabold text-sm text-amber-300">
                    تعيين رمز PIN الشخصي الخاص بك (4 أرقام)
                  </h3>
                </div>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  لحماية حسابك على هاتفك ومنع أي شخص آخر من استخدام التطبيق أو التلاعب بنقدية عهدتك وسندات المحلات، عيّن رمز PIN شخصي خاص بك الآن.
                </p>
                <div className="mt-2 text-[11px] text-amber-400/90 font-medium">
                  • الرمز المبدئي الافتراضي الحالي هو: <span className="font-mono font-bold text-white bg-amber-500/20 px-2 py-0.5 rounded-md">{distributorPin || '0000'}</span>
                </div>
              </div>

              <form onSubmit={handleSavePin} className="space-y-4 max-w-md mx-auto pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-200 mb-1.5">
                      رمز PIN الجديد (4 أرقام):
                    </label>
                    <div className="relative">
                      <input
                        type={showPinText ? 'text' : 'password'}
                        maxLength={4}
                        pattern="\d{4}"
                        inputMode="numeric"
                        required
                        value={newPin}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                          setNewPin(val);
                          setPinError('');
                        }}
                        placeholder="••••"
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-center text-lg font-mono tracking-widest text-emerald-400 focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                        autoFocus
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-200 mb-1.5">
                      تأكيد الرمز مرة أخرى:
                    </label>
                    <div className="relative">
                      <input
                        type={showPinText ? 'text' : 'password'}
                        maxLength={4}
                        pattern="\d{4}"
                        inputMode="numeric"
                        required
                        value={confirmPin}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                          setConfirmPin(val);
                          setPinError('');
                        }}
                        placeholder="••••"
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-center text-lg font-mono tracking-widest text-emerald-400 focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between px-1">
                  <button
                    type="button"
                    onClick={() => setShowPinText(!showPinText)}
                    className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition cursor-pointer"
                  >
                    {showPinText ? (
                      <>
                        <EyeOff className="w-3.5 h-3.5" />
                        <span>إخفاء الأرقام</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5" />
                        <span>إظهار الأرقام</span>
                      </>
                    )}
                  </button>

                  <span className="text-[11px] text-slate-400">
                    أدخل 4 أرقام تحفظها جيداً
                  </span>
                </div>

                {pinError && (
                  <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold flex items-center gap-2 animate-in fade-in">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{pinError}</span>
                  </div>
                )}

                {pinSaved && (
                  <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2 animate-in fade-in">
                    <CheckCircle className="w-4 h-4 shrink-0" />
                    <span>تم حفظ رمز PIN الشخصي بنجاح! جاري الانتقال للخطوة التالية...</span>
                  </div>
                )}

                {/* Quick numeric keypad buttons for mobile convenience */}
                <div className="pt-1">
                  <div className="grid grid-cols-3 gap-1.5 max-w-xs mx-auto">
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                      <button
                        type="button"
                        key={digit}
                        onClick={() => {
                          if (newPin.length < 4) {
                            setNewPin((prev) => prev + digit);
                          } else if (confirmPin.length < 4) {
                            setConfirmPin((prev) => prev + digit);
                          }
                        }}
                        className="py-2 rounded-xl bg-slate-950 border border-slate-800 hover:bg-slate-800 text-sm font-mono font-bold text-white active:bg-emerald-500 active:text-slate-950 transition cursor-pointer"
                      >
                        {digit}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setNewPin('');
                        setConfirmPin('');
                      }}
                      className="py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold text-slate-400 hover:text-white transition cursor-pointer"
                    >
                      مسح
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (newPin.length < 4) {
                          setNewPin((prev) => prev + '0');
                        } else if (confirmPin.length < 4) {
                          setConfirmPin((prev) => prev + '0');
                        }
                      }}
                      className="py-2 rounded-xl bg-slate-950 border border-slate-800 hover:bg-slate-800 text-sm font-mono font-bold text-white active:bg-emerald-500 active:text-slate-950 transition cursor-pointer"
                    >
                      0
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirmPin.length > 0) {
                          setConfirmPin((prev) => prev.slice(0, -1));
                        } else if (newPin.length > 0) {
                          setNewPin((prev) => prev.slice(0, -1));
                        }
                      }}
                      className="py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                    >
                      تراجع ⌫
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* STEP 3: PWA Installation & Launch */}
          {step === 3 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-200">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/15 via-teal-500/10 to-slate-950 border border-emerald-500/25 text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
                  <Smartphone className="w-6 h-6" />
                </div>
                <h3 className="font-extrabold text-sm sm:text-base text-white">
                  تثبيت تطبيق قعزان نت على هاتفك 📲
                </h3>
                <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
                  يعمل النظام كتطبيق هاتف ذكي أصيل (PWA) بدون الحاجة لمتجر Google Play أو App Store. ثبته الآن ليظهر كأيقونة على شاشة جوالك ويعمل بسرعة فائقة.
                </p>

                <div className="pt-2">
                  <button
                    onClick={handleInstallClick}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs sm:text-sm shadow-lg shadow-emerald-500/25 transition cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>{isInstalled ? '✓ التطبيق مثبت بالفعل على جهازك' : 'تثبيت التطبيق على الشاشة الرئيسية الآن'}</span>
                  </button>
                </div>

                {showInstallHint && (
                  <div className="mt-3 p-3.5 bg-slate-900 border border-emerald-500/30 rounded-2xl text-xs text-slate-300 space-y-1.5 text-right animate-in fade-in">
                    <p className="font-bold text-emerald-400">طريقة تثبيت التطبيق على هاتفك:</p>
                    <p className="text-[11px] leading-relaxed">
                      • <strong className="text-white">أندرويد (Chrome):</strong> اضغط على قائمة المتصفح (⋮) ثم اختر <span className="text-amber-400">"إضافة إلى الشاشة الرئيسية"</span> أو <span className="text-amber-400">"تثبيت التطبيق"</span>.
                    </p>
                    <p className="text-[11px] leading-relaxed">
                      • <strong className="text-white">آيفون (Safari):</strong> اضغط على زر المشاركة (المربع بسهم لأعلى) ثم اختر <span className="text-amber-400">"إضافة إلى الشاشة الرئيسية"</span>.
                    </p>
                  </div>
                )}
              </div>

              {/* Security & Summary Box */}
              <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800 space-y-2.5">
                <h4 className="font-bold text-xs text-slate-200 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  ملخص بيانات دخولك الميداني:
                </h4>

                <div className="space-y-1.5 text-xs text-slate-300">
                  <div className="flex items-center justify-between py-1 border-b border-slate-900">
                    <span className="text-slate-400">حساب المستخدم:</span>
                    <span className="font-bold text-white">الموزع الميداني</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-slate-900">
                    <span className="text-slate-400">رمز PIN الشخصي المعين:</span>
                    <span className="font-mono font-bold text-emerald-400">
                      {newPin || distributorPin || '0000'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-slate-400">حماية حساب المسؤول:</span>
                    <span className="text-[11px] text-slate-400 font-medium">
                      محمي برمز PIN المسؤول (لا يمكن للموزع التبديل للمسؤول بدونه)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Actions */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((prev) => (prev - 1) as 1 | 2)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
            >
              <ArrowRight className="w-4 h-4" />
              <span>السابق</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setStep(2)}
              className="text-xs text-slate-400 hover:text-slate-300 transition"
            >
              تخطي المقدمة
            </button>
          )}

          <div className="flex items-center gap-2">
            {step === 1 && (
              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs shadow-md shadow-emerald-500/20 transition cursor-pointer"
              >
                <span>متابعة لتعيين كلمة المرور</span>
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}

            {step === 2 && (
              <button
                type="button"
                onClick={() => {
                  if (newPin && confirmPin) {
                    handleSavePin();
                  } else {
                    // Use existing/default PIN
                    setStep(3);
                  }
                }}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs shadow-md shadow-emerald-500/20 transition cursor-pointer"
              >
                <span>{newPin ? 'حفظ الرمز والمتابعة' : 'استخدام الرمز الافتراضي (0000)'}</span>
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}

            {step === 3 && (
              <button
                type="button"
                onClick={handleFinishOnboarding}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-emerald-500/25 transition cursor-pointer animate-pulse"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>باشر العمل الميداني الآن 🚀</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
