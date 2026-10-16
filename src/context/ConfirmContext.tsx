import React, { createContext, useContext, useState, ReactNode } from 'react';
import { AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';

interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  confirmColor?: string;
  isDestructive?: boolean;
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export const ConfirmProvider = ({ children }: { children: ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [resolver, setResolver] = useState<((value: boolean) => void) | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  const confirmAction = (opts: ConfirmOptions) => {
    setOptions(opts);
    setIsOpen(true);
    return new Promise<boolean>((resolve) => {
      setResolver(() => resolve);
    });
  };

  const handleConfirm = async () => {
    setIsConfirming(true);
    if (resolver) resolver(true);
    setIsOpen(false);
    setIsConfirming(false);
  };

  const handleCancel = () => {
    if (resolver) resolver(false);
    setIsOpen(false);
  };

  const isRed = options?.isDestructive || options?.confirmColor?.includes('red');
  const isBlue = !isRed;

  return (
    <ConfirmContext.Provider value={{ confirm: confirmAction }}>
      {children}
      {isOpen && options && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 text-center pt-8">
              <div className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-4 ${isRed ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                {isRed ? <AlertTriangle size={32} strokeWidth={1.5} /> : <CheckCircle size={32} strokeWidth={1.5} />}
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">{options.title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed mb-6">{options.message}</p>
              
              <div className="flex gap-3 w-full">
                <button
                  onClick={handleCancel}
                  disabled={isConfirming}
                  className="flex-1 py-2.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl font-bold transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={isConfirming}
                  className={`flex-1 py-2.5 text-white rounded-xl font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2 ${options.confirmColor || (isRed ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700')}`}
                >
                  {isConfirming ? <Loader2 size={18} className="animate-spin" /> : (options.confirmText || 'Confirm')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
};

export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) throw new Error('useConfirm must be used within ConfirmProvider');
  return context;
};
