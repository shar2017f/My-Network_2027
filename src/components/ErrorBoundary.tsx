import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleClearAndReload = () => {
    try {
      // Clear local storage cache keys so fresh cloud data is downloaded
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('qnet_2026_')) {
          localStorage.removeItem(key);
        }
      });
    } catch {}
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4" dir="rtl">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl text-center">
            <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 text-rose-500">
              <AlertTriangle className="w-8 h-8" />
            </div>
            
            <h2 className="text-xl font-bold text-white mb-2">حدث خطأ غير متوقع في العرض</h2>
            <p className="text-sm text-slate-400 mb-6">
              تم حماية بياناتك المحفوظة بنجاح، يمكنك إعادة تحميل الواجهة أو العودة للعمل.
            </p>

            {this.state.error && (
              <div className="mb-6 p-3 bg-slate-950 border border-slate-800 rounded-xl text-right text-xs font-mono text-slate-400 overflow-x-auto max-h-32">
                {this.state.error.toString()}
              </div>
            )}

            <div className="flex flex-col gap-2.5">
              <div className="flex flex-col sm:flex-row gap-2.5">
                <button
                  onClick={this.handleReset}
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors text-sm cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>إعادة المحاولة</span>
                </button>
                
                <button
                  onClick={this.handleReload}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors text-sm cursor-pointer"
                >
                  <Home className="w-4 h-4" />
                  <span>تحديث الصفحة</span>
                </button>
              </div>

              <button
                onClick={this.handleClearAndReload}
                className="w-full bg-slate-950 hover:bg-slate-850 text-slate-400 hover:text-white border border-slate-800 py-2 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors text-xs cursor-pointer"
              >
                <span>تحديث مع إعادة مزامنة السحابة (مسح الكاش المؤقت)</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
