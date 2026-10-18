import React, { useState } from 'react';
import {
  ShieldAlert,
  Lock,
  CheckCircle,
  XCircle,
  Key,
  ShieldCheck,
  AlertTriangle,
  Save,
  Share2,
  UserCheck,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { DistributorPermissions } from '../types';

export const PermissionsView: React.FC = () => {
  const {
    currentRole,
    permissions,
    updatePermissions,
    adminPin,
    setAdminPin,
    distributorPin,
    setDistributorPin,
    setShowShareModal,
    setShowDistributorWelcome,
  } = useApp();

  const [localPerms, setLocalPerms] = useState<DistributorPermissions>(permissions);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinSuccess, setPinSuccess] = useState(false);
  const [pinError, setPinError] = useState('');
  const [permsSaved, setPermsSaved] = useState(false);

  const handleToggle = (key: keyof DistributorPermissions) => {
    setLocalPerms((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSavePerms = () => {
    updatePermissions(localPerms);
    setPermsSaved(true);
    setTimeout(() => setPermsSaved(false), 2500);
  };

  const handleUpdatePin = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPin.length !== 4 || !/^\d+$/.test(newPin)) {
      setPinError('يجب أن يتكون رمز PIN من 4 أرقام');
      return;
    }
    if (newPin !== confirmPin) {
      setPinError('رمز PIN وتأكيده غير متطابقين');
      return;
    }

    setAdminPin(newPin);
    setPinSuccess(true);
    setPinError('');
    setNewPin('');
    setConfirmPin('');
    setTimeout(() => setPinSuccess(false), 3000);
  };

  const [distNewPin, setDistNewPin] = useState('');
  const [distPinSuccess, setDistPinSuccess] = useState(false);
  const [distPinError, setDistPinError] = useState('');

  const handleUpdateDistPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (distNewPin.length !== 4 || !/^\d+$/.test(distNewPin)) {
      setDistPinError('يجب أن يتكون رمز PIN للموزع من 4 أرقام');
      return;
    }
    setDistributorPin(distNewPin);
    setDistPinSuccess(true);
    setDistPinError('');
    setDistNewPin('');
    setTimeout(() => setDistPinSuccess(false), 3000);
  };

  const permissionItems: {
    key: keyof DistributorPermissions;
    title: string;
    desc: string;
    danger?: boolean;
  }[] = [
    {
      key: 'canEditDeliveries',
      title: 'السماح بتعديل سندات التوريد للمنافذ',
      desc: 'تمكين الموزع من تعديل الكميات أو المبالغ بعد إصدار سند التوريد',
    },
    {
      key: 'canDeleteRecords',
      title: 'السماح بحذف السجلات والعمليات',
      desc: 'تحذير: مسح السجلات يؤثر على مطابقة الأرصدة والتدقيق المالي (موصى بتركه معطلاً)',
      danger: true,
    },
    {
      key: 'canViewProfitMargins',
      title: 'السماح برؤية هوامش وأرباح الشبكة',
      desc: 'إظهار صافي أرباح كروت الشبكة وهوامش الربح للموزع',
    },
    {
      key: 'canCreateOutlets',
      title: 'السماح بإضافة منافذ ومحلات جديدة',
      desc: 'تمكين الموزع الميداني من فتح حسابات لمنافذ جديدة وتحديد سقف الدين',
    },
    {
      key: 'canMakeDirectSales',
      title: 'السماح ببيع كروت مباشرة للأفراد (DIR)',
      desc: 'تمكين الموزع من تسجيل مبيعات كروت قطاعي باليد نقداً أو بالدين',
    },
    {
      key: 'canViewFullAnalytics',
      title: 'السماح بالوصول للتحليلات الإحصائية و Gemini AI',
      desc: 'إتاحة رؤية التقارير الاستراتيجية والتحليل الذكي للشبكة للموزع',
    },
    {
      key: 'canChangeCardPrices',
      title: 'السماح بتعديل أسعار الكروت عن السعر المعتمد',
      desc: 'إعطاء الموزع مرونة في تغيير سعر الشيت أو الكرت عند التوريد',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 p-5 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-extrabold text-white">
              إدارة صلاحيات الموزع الميداني والأمان
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-bold border border-amber-500/30">
              خاص بالمسؤول فقط
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            التحكم الكامل في حدود وصول وإجراءات الموزع الميداني في تطبيق قعزان نت
          </p>
        </div>

        <button
          onClick={handleSavePerms}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs shadow-md shadow-amber-500/20 transition cursor-pointer"
        >
          <Save className="w-4 h-4" />
          <span>حفظ تعديلات الصلاحيات</span>
        </button>
      </div>

      {permsSaved && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle className="w-4 h-4" />
          <span>تم حفظ الصلاحيات بنجاح وتحديث مصفوفة أذونات الموزع!</span>
        </div>
      )}

      {/* Permissions Matrix */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 space-y-4">
        <h3 className="font-bold text-sm text-white">مصفوفة الصلاحيات المتاحة للموزع</h3>

        <div className="divide-y divide-slate-800">
          {permissionItems.map((item) => {
            const isEnabled = localPerms[item.key];

            return (
              <div
                key={item.key}
                className="py-4 flex items-center justify-between gap-4 first:pt-2 last:pb-2"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-xs sm:text-sm text-white">{item.title}</h4>
                    {item.danger && (
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-400 font-bold border border-rose-500/30">
                        حساس للغاية
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-1 max-w-xl">{item.desc}</p>
                </div>

                {/* Switch Toggle */}
                <button
                  type="button"
                  onClick={() => handleToggle(item.key)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                    isEnabled ? 'bg-amber-500' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-slate-950 shadow-md ring-0 transition duration-200 ease-in-out ${
                      isEnabled ? '-translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Admin PIN Settings */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
            <Key className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-white">تغيير رمز PIN السري للمسؤول</h3>
            <p className="text-xs text-slate-400">
              الرمز الحالي: <span className="font-mono text-amber-400 font-bold">{adminPin}</span>
            </p>
          </div>
        </div>

        <form onSubmit={handleUpdatePin} className="max-w-md space-y-3 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">الرمز الجديد (4 أرقام)</label>
              <input
                type="password"
                maxLength={4}
                required
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                placeholder="****"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-center text-sm font-mono tracking-widest text-white focus:outline-hidden focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">تأكيد الرمز</label>
              <input
                type="password"
                maxLength={4}
                required
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)}
                placeholder="****"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-center text-sm font-mono tracking-widest text-white focus:outline-hidden focus:border-amber-500"
              />
            </div>
          </div>

          {pinError && <p className="text-xs text-rose-400 font-bold">{pinError}</p>}
          {pinSuccess && (
            <p className="text-xs text-emerald-400 font-bold">
              ✓ تم تحديث رمز PIN بنجاح!
            </p>
          )}

          <button
            type="submit"
            className="py-2.5 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition border border-slate-700 cursor-pointer"
          >
            تحديث رمز PIN المسؤول
          </button>
        </form>
      </div>

      {/* Distributor PIN & Account Sharing Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Distributor PIN Settings */}
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">رمز PIN السري للموزع الميداني</h3>
              <p className="text-xs text-slate-400">
                الرمز المعين حالياً: <span className="font-mono text-emerald-400 font-bold bg-slate-950 px-2 py-0.5 rounded-md">{distributorPin || '0000'}</span> (الافتراضي: 0000)
              </p>
            </div>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            يمكنك هنا إعادة تعيين رمز PIN الخاص بالموزع في حال نسيه الموزع، أو تعيين رمز مؤقت قبل تسليمه الحساب.
          </p>

          <form onSubmit={handleUpdateDistPin} className="space-y-3 pt-1">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                تعيين رمز PIN جديد للموزع (4 أرقام):
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  maxLength={4}
                  pattern="\d{4}"
                  inputMode="numeric"
                  required
                  value={distNewPin}
                  onChange={(e) => setDistNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="0000"
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-center text-sm font-mono tracking-widest text-emerald-400 focus:outline-hidden focus:border-emerald-500 w-32"
                />
                <button
                  type="submit"
                  className="py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition cursor-pointer"
                >
                  تعيين الرمز للموزع
                </button>
              </div>
            </div>

            {distPinError && <p className="text-xs text-rose-400 font-bold">{distPinError}</p>}
            {distPinSuccess && (
              <p className="text-xs text-emerald-400 font-bold">
                ✓ تم تحديث رمز PIN الخاص بالموزع بنجاح!
              </p>
            )}
          </form>
        </div>

        {/* Distributor Link & Quick Actions */}
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center">
                <Share2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">مشاركة حساب الموزع والرابط المشفر</h3>
                <p className="text-xs text-slate-400">
                  إرسال الحساب للموزع ليباشر عمله الميداني فوراً
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed pt-1">
              أرسل الرابط للموزع عبر واتساب أو رمز QR. عند فتح الرابط ستظهر له شاشة الترحيب وتشرح له خطوات العمل وتطلب منه تعيين كلمة مروره.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowShareModal(true)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
              <span>مشاركة الحساب عبر واتساب / QR 📲</span>
            </button>

            <button
              type="button"
              onClick={() => setShowDistributorWelcome(true)}
              className="flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>معاينة شاشة الترحيب 👁️</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
