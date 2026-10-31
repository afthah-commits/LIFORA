import React from 'react';
import { Button } from './Button';

export interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 sm:p-12 border border-dashed border-zinc-800 rounded-xl bg-[#121215]/50">
      <div className="w-12 h-12 rounded-xl bg-zinc-800/80 text-emerald-400 flex items-center justify-center mb-4">
        {icon}
      </div>
      <h4 className="text-base font-semibold text-zinc-200">{title}</h4>
      <p className="text-xs sm:text-sm text-zinc-400 max-w-sm mt-1 mb-6 leading-relaxed">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button onClick={onAction} size="sm">
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
