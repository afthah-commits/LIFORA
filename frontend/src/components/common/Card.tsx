import React, { HTMLAttributes } from 'react';
import { clsx } from 'clsx';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hoverEffect?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  hoverEffect = false,
  ...props
}) => {
  return (
    <div
      className={clsx(
        'bg-[#121215] border border-zinc-800/80 rounded-xl p-5 shadow-sm text-zinc-100',
        hoverEffect && 'transition-all duration-200 hover:border-zinc-700 hover:shadow-md hover:shadow-emerald-500/5',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<HTMLAttributes<HTMLDivElement>> = ({
  children,
  className,
  ...props
}) => (
  <div className={clsx('flex items-center justify-between pb-3 mb-3 border-b border-zinc-800/60', className)} {...props}>
    {children}
  </div>
);

export const CardTitle: React.FC<HTMLAttributes<HTMLHeadingElement>> = ({
  children,
  className,
  ...props
}) => (
  <h3 className={clsx('text-base font-semibold text-zinc-100 flex items-center gap-2', className)} {...props}>
    {children}
  </h3>
);
