import React from 'react';
import { ToastMessage } from '../types';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        let icon = <Info className="w-4 h-4 text-[#36d9ff]" />;
        let borderClass = 'border-[#36d9ff]/30 bg-[#0d1424]/95 text-white shadow-[0_4px_16px_rgba(54,217,255,0.2)]';

        if (toast.type === 'success') {
          icon = <CheckCircle2 className="w-4 h-4 text-[#4ade80]" />;
          borderClass = 'border-[#4ade80]/40 bg-[#0d1424]/95 text-white shadow-[0_4px_16px_rgba(74,222,128,0.2)]';
        } else if (toast.type === 'danger') {
          icon = <XCircle className="w-4 h-4 text-[#ff5f73]" />;
          borderClass = 'border-[#ff5f73]/40 bg-[#0d1424]/95 text-white shadow-[0_4px_16px_rgba(255,95,115,0.25)]';
        } else if (toast.type === 'warn') {
          icon = <AlertTriangle className="w-4 h-4 text-[#facc15]" />;
          borderClass = 'border-[#facc15]/40 bg-[#0d1424]/95 text-white shadow-[0_4px_16px_rgba(250,204,21,0.2)]';
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto p-3.5 rounded-xl border backdrop-blur-xl flex items-start gap-2.5 text-xs font-medium transition-all duration-300 animate-in fade-in slide-in-from-bottom-2 ${borderClass}`}
          >
            <div className="shrink-0 mt-0.5">{icon}</div>
            <div className="flex-1 leading-snug">{toast.text}</div>
            <button
              onClick={() => onDismiss(toast.id)}
              className="text-[#8190aa] hover:text-white transition p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
