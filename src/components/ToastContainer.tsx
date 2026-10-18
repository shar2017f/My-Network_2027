import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertTriangle, Info, X, Printer } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AppNotification } from '../types';

export const ToastContainer: React.FC = () => {
  const { notifications, markNotificationAsRead, quickInitiatePrintBatch } = useApp();
  const [activeToast, setActiveToast] = useState<AppNotification | null>(null);

  useEffect(() => {
    // Show the latest unread notification
    const unread = notifications.filter((n) => !n.isRead);
    if (unread.length > 0) {
      const latest = unread[0];
      setActiveToast(latest);

      const timer = setTimeout(() => {
        markNotificationAsRead(latest.id);
        setActiveToast(null);
      }, 5000);

      return () => clearTimeout(timer);
    } else {
      setActiveToast(null);
    }
  }, [notifications]);

  if (!activeToast) return null;

  const getIcon = () => {
    switch (activeToast.type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />;
      case 'alert':
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />;
      default:
        return <Info className="w-5 h-5 text-blue-400 shrink-0" />;
    }
  };

  const getBorderColor = () => {
    switch (activeToast.type) {
      case 'success':
        return 'border-emerald-500/50 shadow-emerald-500/10';
      case 'alert':
      case 'warning':
        return 'border-amber-500/50 shadow-amber-500/10';
      default:
        return 'border-blue-500/50 shadow-blue-500/10';
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 max-w-sm w-full no-print animate-in slide-in-from-bottom-5 duration-200">
      <div className={`p-4 rounded-2xl bg-slate-900/98 border shadow-2xl backdrop-blur-md text-right text-slate-100 flex items-start justify-between gap-3 ${getBorderColor()}`}>
        <div className="flex items-start gap-3">
          <div className="mt-0.5">
            {getIcon()}
          </div>
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
              <h4 className="font-extrabold text-xs text-white">{activeToast.title}</h4>
              <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-slate-800 text-slate-400 font-mono">
                مباشر
              </span>
            </div>
            <p className="text-[11px] text-slate-200 leading-relaxed">{activeToast.message}</p>
            
            {activeToast.actionType === 'print_decision' && activeToast.actionCategory && (
              <button
                type="button"
                onClick={() => {
                  const cat = activeToast.actionCategory!;
                  const sheets = activeToast.recommendedSheets;
                  markNotificationAsRead(activeToast.id);
                  setActiveToast(null);
                  quickInitiatePrintBatch(cat, sheets);
                }}
                className="mt-2.5 w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-[11px] shadow-sm transition cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>اتخاذ قرار الطباعة الآن ({activeToast.recommendedSheets || 15} شيت)</span>
              </button>
            )}
          </div>
        </div>

        <button
          onClick={() => {
            markNotificationAsRead(activeToast.id);
            setActiveToast(null);
          }}
          className="p-1 rounded-lg text-slate-400 hover:text-white transition shrink-0 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
