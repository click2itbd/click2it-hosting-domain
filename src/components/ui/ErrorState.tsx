import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ message, onRetry, className }) => {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 text-center', className)}>
      <AlertTriangle className="mb-4 text-[var(--c2i-red)]" size={48} />
      <p className="text-gray-600 mb-4">Something went wrong.</p>
      <p className="text-sm text-gray-500 mb-6 max-w-md">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="bg-[var(--c2i-red)] text-white px-5 py-2.5 rounded-md font-bold hover:bg-[var(--c2i-red-deep)] transition-colors">
          Try Again
        </button>
      )}
    </div>
  );
};
