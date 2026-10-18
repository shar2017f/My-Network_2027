import React, { useState } from 'react';
import {
  Scale,
  Plus,
  CheckCircle,
  XCircle,
  Clock,
  Check,
  X,
  FileText,
  AlertCircle,
  Shield,
  UserCheck,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SettlementRequest } from '../types';

export const SettlementsView: React.FC = () => {
  const { currentRole, settlements, createSettlement, resolveSettlement } = useApp();

  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [type, setType] = useState<SettlementRequest['type']>('cash');
  const [amount, setAmount] = useState<number>(0);
  const [description, setDescription] = useState('');

  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState('');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description) return;

    createSettlement({
      title,
      type,
      amount: amount > 0 ? Number(amount) : undefined,
      description,
    });

    setIsNewModalOpen(false);
    setTitle('');
    setDescription('');
    setAmount(0);
  };

  const handleResolveAction = (id: string, status: 'approved' | 'rejected') => {
    resolveSettlement(id, status, reviewNote);
    setResolvingId(null);
    setReviewNote('');
  };

  const pendingSettlements = settlements.filter((s) => s.status === 'pending');
  const resolvedSettlements = settlements.filter((s) => s.status !== 'pending');

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 p-5 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-extrabold text-white">التسويات والتصفيات المالية والمعلقة</h2>
            {pendingSettlements.length > 0 && (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 font-bold border border-rose-500/30">
                {pendingSettlements.length} طلبات قيد الانتظار
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            تسوية العهد النقدية وعمولات التوزيع وخصم مصاريف المواصلات بين المسؤول والموزع
          </p>
        </div>

        <button
          onClick={() => setIsNewModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>إنشاء طلب تسوية جديد</span>
        </button>
      </div>

      {/* Pending Settlements Section */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            الطلبات المعلقة بانتظار الاعتماد والموافقة ({pendingSettlements.length})
          </h3>
        </div>

        {pendingSettlements.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            لا توجد طلبات تسوية معلقة حالياً (جميع الحسابات متوافقة ومصفّرة).
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingSettlements.map((s) => {
              const canResolve =
                (currentRole === 'admin' && s.targetUser === 'المسؤول') ||
                (currentRole === 'distributor' && s.targetUser === 'الموزع الميداني') ||
                currentRole === 'admin'; // Admin has overall oversight

              return (
                <div
                  key={s.id}
                  className="p-4 rounded-xl bg-slate-950 border border-amber-500/30 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-white">{s.id}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-bold">
                          {s.type === 'commission'
                            ? 'عمولة توزيع'
                            : s.type === 'cash'
                            ? 'تصفية نقدية'
                            : s.type === 'cards'
                            ? 'تسوية عهدة كروت'
                            : 'تسوية عامة'}
                        </span>
                      </div>
                      <h4 className="font-bold text-sm text-slate-200 mt-1">{s.title}</h4>
                    </div>

                    {s.amount && (
                      <span className="font-black text-sm text-emerald-400">
                        {s.amount.toLocaleString()} ر.ي
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-300 bg-slate-900 p-2.5 rounded-lg border border-slate-800 leading-relaxed">
                    {s.description}
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                    <span>مقدم الطلب: {s.requestedBy}</span>
                    <span>الموجه إليه: {s.targetUser}</span>
                  </div>

                  {/* Actions */}
                  {canResolve && (
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-850">
                      <button
                        onClick={() => handleResolveAction(s.id, 'approved')}
                        className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>موافقة واعتماد</span>
                      </button>
                      <button
                        onClick={() => handleResolveAction(s.id, 'rejected')}
                        className="flex-1 py-2 rounded-xl bg-rose-600/80 hover:bg-rose-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>رفض</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Resolved Settlements History */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 space-y-4">
        <h3 className="font-bold text-sm text-white">سجل التسويات السابقة المكتملة</h3>

        {resolvedSettlements.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-4">
            لا توجد تسويات مكتملة سابقة (السجل نظيف ومصفّر)
          </p>
        ) : (
          <div className="space-y-2">
            {resolvedSettlements.map((s) => (
              <div
                key={s.id}
                className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">{s.id}</span>
                    <span className="text-slate-300 font-semibold">{s.title}</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        s.status === 'approved'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-rose-500/20 text-rose-400'
                      }`}
                    >
                      {s.status === 'approved' ? 'تمت الموافقة' : 'مرفوض'}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    {s.date} • مقدم بواسطة: {s.requestedBy}
                  </span>
                </div>

                <div className="text-left">
                  {s.amount && (
                    <span className="font-black text-sm text-white">
                      {s.amount.toLocaleString()} ر.ي
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: New Settlement */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700 p-6 text-slate-100 shadow-2xl relative text-right">
            <button
              onClick={() => setIsNewModalOpen(false)}
              className="absolute left-4 top-4 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-extrabold text-white mb-4">إنشاء طلب تسوية أو تصفية</h3>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">عنوان التسوية</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: خصم بدل مواصلات وتوزيع، تسوية عهدة كروت الأسبوع..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">نوع التسوية</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'cash', label: 'تصفية نقدية' },
                    { id: 'commission', label: 'عمولة توزيع' },
                    { id: 'cards', label: 'عهدة كروت' },
                    { id: 'general', label: 'أخرى / عامة' },
                  ].map((t) => (
                    <button
                      type="button"
                      key={t.id}
                      onClick={() => setType(t.id as any)}
                      className={`py-2 rounded-xl text-xs font-bold border transition ${
                        type === t.id
                          ? 'bg-amber-500 text-slate-950 border-amber-500'
                          : 'bg-slate-800 border-slate-700 text-slate-300'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  المبلغ المالي المعني (ر.ي) - إن وجد
                </label>
                <input
                  type="number"
                  min="0"
                  value={amount || ''}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  placeholder="0"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-amber-500 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  تفاصيل وشرح التسوية
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="شرح سبب التسوية أو التصفية ليتمكن الطرف الآخر من مراجعته والموافقة عليه..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-hidden focus:border-amber-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs shadow-md transition"
                >
                  إرسال الطلب
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
