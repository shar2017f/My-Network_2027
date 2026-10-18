import React, { useState } from 'react';
import { Lock, X, ShieldCheck, AlertCircle } from 'lucide-react';
import { soundService } from '../utils/sound';

interface PinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  title?: string;
  correctPin: string;
}

export const PinModal: React.FC<PinModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  title = 'تأكيد الرمز السري للمسؤول',
  correctPin,
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  if (!isOpen) return null;

  const handleDigit = (digit: string) => {
    if (pin.length < 4) {
      const nextPin = pin + digit;
      setPin(nextPin);
      setError(false);

      if (nextPin.length === 4) {
        if (nextPin === correctPin) {
          soundService.playSuccess();
          setTimeout(() => {
            setPin('');
            onSuccess();
          }, 150);
        } else {
          soundService.playAlert();
          setError(true);
          setTimeout(() => setPin(''), 500);
        }
      }
    }
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
    setError(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-xs rounded-2xl bg-slate-900 border border-slate-700/80 p-6 text-slate-100 shadow-2xl relative text-center">
        <button
          onClick={onClose}
          className="absolute left-4 top-4 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto mb-3">
          <Lock className="w-6 h-6" />
        </div>

        <h3 className="text-base font-bold text-white mb-1">{title}</h3>
        <p className="text-xs text-slate-400 mb-5">
          أدخل رمز PIN المكون من 4 أرقام للدخول بصلاحية المسؤول (الافتراضي: 1234)
        </p>

        {/* PIN Indicators */}
        <div className="flex justify-center items-center gap-3 mb-6">
          {[0, 1, 2, 3].map((idx) => {
            const isFilled = pin.length > idx;
            return (
              <div
                key={idx}
                className={`w-4 h-4 rounded-full transition-all duration-200 ${
                  error
                    ? 'bg-rose-500 scale-110 animate-bounce'
                    : isFilled
                    ? 'bg-amber-400 scale-110 shadow-sm shadow-amber-400/50'
                    : 'bg-slate-700'
                }`}
              />
            );
          })}
        </div>

        {error && (
          <div className="flex items-center justify-center gap-1.5 text-xs text-rose-400 font-medium mb-4 animate-shake">
            <AlertCircle className="w-4 h-4" />
            <span>الرمز غير صحيح، حاول مجدداً</span>
          </div>
        )}

        {/* Numeric Keypad */}
        <div className="grid grid-cols-3 gap-2.5 mb-2">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
            <button
              key={num}
              onClick={() => handleDigit(num)}
              className="py-3 text-lg font-bold rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-amber-500 active:text-slate-950 text-white transition active:scale-95 cursor-pointer border border-slate-700/50"
            >
              {num}
            </button>
          ))}
          <button
            onClick={() => setPin('')}
            className="py-3 text-xs font-semibold rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-400 transition"
          >
            مسح
          </button>
          <button
            onClick={() => handleDigit('0')}
            className="py-3 text-lg font-bold rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-amber-500 active:text-slate-950 text-white transition active:scale-95 cursor-pointer border border-slate-700/50"
          >
            0
          </button>
          <button
            onClick={handleDelete}
            className="py-3 text-xs font-semibold rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-400 transition"
          >
            حذف
          </button>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-800 text-center">
          <span className="text-[11px] text-slate-400 inline-flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            حماية آمنة لنظام قعزان نت
          </span>
        </div>
      </div>
    </div>
  );
};
