import React from 'react';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showWordmark?: boolean;
  subtitle?: string;
  badge?: string;
  className?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  showWordmark = true,
  subtitle,
  badge,
  className = '',
}) => {
  const sizeMap = {
    sm: {
      icon: 'w-7 h-7',
      text: 'text-base',
      sub: 'text-[9px]',
      svgSize: 28,
    },
    md: {
      icon: 'w-10 h-10',
      text: 'text-xl',
      sub: 'text-[11px]',
      svgSize: 40,
    },
    lg: {
      icon: 'w-12 h-12',
      text: 'text-2xl',
      sub: 'text-xs',
      svgSize: 48,
    },
    xl: {
      icon: 'w-16 h-16',
      text: 'text-3xl',
      sub: 'text-sm',
      svgSize: 64,
    },
  };

  const currentSize = sizeMap[size];

  return (
    <div className={`inline-flex items-center gap-3 select-none group ${className}`}>
      {/* Creative Vector Icon */}
      <div
        className={`relative ${currentSize.icon} rounded-2xl p-0.5 shrink-0 transition-transform duration-300 group-hover:scale-105 group-hover:rotate-1`}
        style={{
          background: 'linear-gradient(135deg, #0284c7 0%, #06b6d4 50%, #6366f1 100%)',
          boxShadow: '0 8px 20px -4px rgba(2, 132, 199, 0.35)',
        }}
      >
        {/* Inner glow surface */}
        <div className="w-full h-full rounded-[14px] bg-slate-950 flex items-center justify-center overflow-hidden relative">
          {/* Background subtle radial glow */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(6,182,212,0.4),transparent_70%)]" />

          {/* Creative Logo Glyph: Invoice sheet intersecting with dynamic Flow Wave */}
          <svg
            viewBox="0 0 40 40"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-4/5 h-4/5 relative z-10"
          >
            <defs>
              <linearGradient id="bf-grad-1" x1="6" y1="8" x2="34" y2="34" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="50%" stopColor="#06b6d4" />
                <stop offset="100%" stopColor="#818cf8" />
              </linearGradient>
              <linearGradient id="bf-grad-wave" x1="10" y1="18" x2="30" y2="28" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="100%" stopColor="#a5f3fc" />
              </linearGradient>
              <filter id="bf-glow" x="0" y="0" width="40" height="40" filterUnits="userSpaceOnUse">
                <feGaussianBlur stdDeviation="1.5" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Document / Invoice Base Plate (Subtle Angled Glass) */}
            <path
              d="M10 8C10 6.89543 10.8954 6 12 6H24L30 12V32C30 33.1046 29.1046 34 28 34H12C10.8954 34 10 33.1046 10 32V8Z"
              fill="rgba(255, 255, 255, 0.08)"
              stroke="url(#bf-grad-1)"
              strokeWidth="1.5"
            />

            {/* Document Corner Fold */}
            <path
              d="M24 6V11C24 11.5523 24.4477 12 25 12H30"
              stroke="#38bdf8"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="rgba(56, 189, 248, 0.25)"
            />

            {/* Invoice Line 1 */}
            <line x1="14" y1="14" x2="20" y2="14" stroke="#7dd3fc" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />

            {/* Dynamic "Flow Wave" (Curving B + F infinity ribbon) */}
            <path
              d="M8 24C12 17 18 19 22 23C26 27 30 24 33 19"
              stroke="url(#bf-grad-wave)"
              strokeWidth="2.5"
              strokeLinecap="round"
              filter="url(#bf-glow)"
            />

            {/* Flow Pulse Accent Dot */}
            <circle cx="33" cy="19" r="2.2" fill="#38bdf8" />
            <circle cx="33" cy="19" r="3.5" fill="#38bdf8" opacity="0.3" />

            {/* Currency / Value Sparkle */}
            <path
              d="M19 28L20 26L21 28L23 29L21 30L20 32L19 30L17 29L19 28Z"
              fill="#fbbf24"
            />
          </svg>
        </div>
      </div>

      {/* Brand Typography & Subtitle */}
      {showWordmark && (
        <div className="flex flex-col justify-center text-left">
          <div className="flex items-center gap-1.5 leading-none">
            <span className={`font-black tracking-tight text-slate-900 dark:text-white ${currentSize.text}`}>
              Bill
              <span className="bg-gradient-to-r from-brand-600 via-cyan-500 to-indigo-600 dark:from-brand-400 dark:via-cyan-300 dark:to-indigo-400 bg-clip-text text-transparent ml-0.5">
                Flow
              </span>
            </span>

            {badge && (
              <span className="text-[10px] uppercase font-extrabold tracking-wider px-1.5 py-0.5 rounded bg-brand-500/10 text-brand-600 dark:bg-brand-500/20 dark:text-brand-300 border border-brand-500/30 ml-1">
                {badge}
              </span>
            )}
          </div>

          {subtitle && (
            <p className={`text-slate-500 dark:text-slate-400 truncate max-w-[170px] mt-1 font-medium ${currentSize.sub}`}>
              {subtitle}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
