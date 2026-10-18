import React, { useState } from 'react';
import {
  History,
  Search,
  Filter,
  Download,
  Shield,
  UserCheck,
  Calendar,
  Layers,
  ArrowLeftRight,
  Store,
  Coins,
  AlertTriangle,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AuditLogItem } from '../types';

export const AuditLogView: React.FC = () => {
  const { auditLogs } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterAction, setFilterAction] = useState<string>('all');
  const [filterRole, setFilterRole] = useState<string>('all');

  const filteredLogs = auditLogs.filter((log) => {
    const matchesSearch =
      log.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.actorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesAction = filterAction === 'all' || log.actionType === filterAction;
    const matchesRole = filterRole === 'all' || log.actorRole === filterRole;

    return matchesSearch && matchesAction && matchesRole;
  });

  const getActionBadge = (type: AuditLogItem['actionType']) => {
    switch (type) {
      case 'BATCH_CREATED':
      case 'BATCH_UPDATED':
        return { label: 'طباعة / دفعات', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' };
      case 'TRANSFER_CREATED':
        return { label: 'تحويل عهدة (TR)', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' };
      case 'DELIVERY_CREATED':
        return { label: 'توريد لمنفذ (DEL)', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' };
      case 'PAYMENT_RECEIVED':
        return { label: 'قبض نقدية (PAY)', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' };
      case 'CASH_HANDOVER':
        return { label: 'تسليم كاش (CSH)', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' };
      case 'DAMAGE_REPORTED':
        return { label: 'تالف / مرتجع', color: 'bg-rose-500/20 text-rose-400 border-rose-500/30' };
      case 'SETTLEMENT_CREATED':
      case 'SETTLEMENT_RESOLVED':
        return { label: 'تسوية وتصفية', color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' };
      case 'SYSTEM_RESET':
        return { label: 'نظام وأمان', color: 'bg-slate-700 text-slate-300 border-slate-600' };
      default:
        return { label: 'عملية مالية', color: 'bg-slate-800 text-slate-400 border-slate-700' };
    }
  };

  const exportLogCSV = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      ['رقم الحركة,التاريخ والوقت,المستخدم,الدور,النوع,التفاصيل']
        .concat(
          filteredLogs.map(
            (l) =>
              `"${l.id}","${l.timestamp}","${l.actorName}","${l.actorRole}","${l.actionType}","${l.details.replace(/"/g, '""')}"`
          )
        )
        .join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `qazan_audit_log_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 p-5 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-extrabold text-white">سجل التدقيق المالي الآلي (Audit Log)</h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-bold border border-blue-500/30">
              {auditLogs.length} حركة مسجلة
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            توثيق شفاف وغير قابل للتلاعب لكل عملية وتحويل مالي ونقدي في شبكة قعزان نت
          </p>
        </div>

        <button
          onClick={exportLogCSV}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-white font-bold text-xs border border-slate-700 transition cursor-pointer"
        >
          <Download className="w-4 h-4 text-amber-400" />
          <span>تصدير السجل (CSV)</span>
        </button>
      </div>

      {/* Filters and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
        <div className="relative sm:col-span-1">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث بالتفاصيل أو اسم المستخدم..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-9 pl-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-amber-500"
          />
        </div>

        <div>
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-amber-500 font-bold"
          >
            <option value="all">جميع أنواع العمليات</option>
            <option value="BATCH_CREATED">طباعة الدفعات</option>
            <option value="BATCH_UPDATED">تعديل الدفعات</option>
            <option value="TRANSFER_CREATED">سندات تحويل العهد (TR)</option>
            <option value="DELIVERY_CREATED">سندات التوريد (DEL)</option>
            <option value="PAYMENT_RECEIVED">سندات القبض (PAY)</option>
            <option value="CASH_HANDOVER">تسليم النقدية (CSH)</option>
            <option value="SETTLEMENT_CREATED">التسويات والتصفيات</option>
            <option value="DAMAGE_REPORTED">التالف والمرتجع</option>
          </select>
        </div>

        <div>
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-amber-500 font-bold"
          >
            <option value="all">جميع المستخدمين</option>
            <option value="admin">المسؤول فقط</option>
            <option value="distributor">الموزع الميداني فقط</option>
          </select>
        </div>
      </div>

      {/* Log Entries List */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
        <div className="divide-y divide-slate-800">
          {filteredLogs.map((log) => {
            const badge = getActionBadge(log.actionType);

            return (
              <div
                key={log.id}
                className="p-4 hover:bg-slate-850/40 transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                      log.actorRole === 'admin'
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-emerald-500/20 text-emerald-400'
                    }`}
                  >
                    {log.actorRole === 'admin' ? (
                      <Shield className="w-4 h-4" />
                    ) : (
                      <UserCheck className="w-4 h-4" />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-mono text-slate-500 text-[11px]">{log.id}</span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${badge.color}`}
                      >
                        {badge.label}
                      </span>
                      <span className="font-bold text-white">{log.actorName}</span>
                    </div>

                    <p className="text-slate-200 leading-relaxed text-[11px] sm:text-xs">
                      {log.details}
                    </p>
                  </div>
                </div>

                <div className="text-left shrink-0 self-end sm:self-center">
                  <span className="text-[10px] text-slate-400 font-mono" dir="ltr">
                    {new Date(log.timestamp).toLocaleString('ar-YE', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
