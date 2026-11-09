import React from 'react';

export const LoadingSkeleton: React.FC<{ rows?: number }> = ({ rows = 4 }) => {
  return (
    <div className="w-full space-y-4 animate-pulse">
      <div className="h-8 bg-slate-200/70 dark:bg-slate-800 rounded-lg w-1/4"></div>
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 space-y-4 shadow-sm">
        <div className="h-6 bg-slate-100 dark:bg-slate-800 rounded w-1/3"></div>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex gap-4 items-center">
            <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-1/6"></div>
            <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-1/3"></div>
            <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-1/4"></div>
            <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-1/6 ml-auto"></div>
          </div>
        ))}
      </div>
    </div>
  );
};
