import React from 'react';
import { Sparkles } from 'lucide-react';

interface LoadingSpinnerProps {
  message?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ message = 'Loading data from Firestore...' }) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center text-textMuted space-y-3">
      <div className="relative">
        <div className="w-10 h-10 rounded-full border-2 border-primary/20 border-t-primary animate-spin"></div>
        <Sparkles size={16} className="text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
      </div>
      <p className="text-xs font-medium tracking-wider text-textMuted">{message}</p>
    </div>
  );
};
