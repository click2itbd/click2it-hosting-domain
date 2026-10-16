import React, { useState } from 'react';
import { useSettings } from '../context/SettingsContext';

interface PageLoaderProps {
  message?: string;
}

export function PageLoader({ message = 'Loading...' }: PageLoaderProps) {
  let logoUrl = '/logo.png';
  let brandName = 'Click2IT';

  try {
    const { settings } = useSettings();
    if (settings?.logoUrl) logoUrl = settings.logoUrl;
    if (settings?.brandName) brandName = settings.brandName;
  } catch {
    // Fallback if rendered outside SettingsProvider
  }

  const [imgError, setImgError] = useState(false);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white relative overflow-hidden select-none">
      {/* Soft Ambient Background Glows */}
      <div className="absolute w-96 h-96 rounded-full bg-blue-500/5 blur-3xl -top-20 -left-20 pointer-events-none" />
      <div className="absolute w-96 h-96 rounded-full bg-indigo-500/5 blur-3xl -bottom-20 -right-20 pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(#f1f5f9_1px,transparent_1px)] [background-size:20px_20px] opacity-60 pointer-events-none" />

      <div className="relative text-center z-10 px-4 max-w-sm mx-auto">
        
        {/* Animated Central Logo Orb */}
        <div className="relative w-28 h-28 mx-auto mb-8 flex items-center justify-center">
          {/* Subtle Ambient Pulse */}
          <div className="absolute inset-0 rounded-full bg-blue-500/10 blur-xl animate-pulse" style={{ animationDuration: '2s' }} />

          {/* Outer Smooth Spin Ring */}
          <div 
            className="absolute inset-0 rounded-full border-2 border-transparent border-t-blue-600 border-r-blue-400/40 animate-spin"
            style={{ animationDuration: '1.2s' }}
          />

          {/* Counter Spin Accent Ring */}
          <div 
            className="absolute inset-2 rounded-full border-2 border-transparent border-t-indigo-500 border-l-indigo-300/30 animate-spin"
            style={{ animationDirection: 'reverse', animationDuration: '1.8s' }}
          />

          {/* Outer Ripple Ping */}
          <div 
            className="absolute -inset-2 rounded-full border border-blue-400/20 animate-ping" 
            style={{ animationDuration: '2.5s' }} 
          />

          {/* Core White Card with Website Logo */}
          <div className="absolute inset-3.5 rounded-full bg-white flex items-center justify-center shadow-lg shadow-blue-500/10 border border-gray-100/80 p-2.5 overflow-hidden group">
            {!imgError ? (
              <img
                src={logoUrl}
                alt={brandName}
                onError={() => setImgError(true)}
                className="w-full h-full object-contain animate-pulse"
                style={{ animationDuration: '2.5s' }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-blue-600 font-extrabold text-sm tracking-tight">
                {brandName.slice(0, 4).toUpperCase()}
              </div>
            )}
          </div>
        </div>

        {/* Message with Animated Dot Indicator */}
        <div className="flex items-center justify-center gap-2 mb-3">
          <span className="text-sm font-bold text-gray-800 tracking-tight">
            {message}
          </span>
          <span className="flex gap-1 items-center">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '300ms' }} />
          </span>
        </div>

        {/* Sleek Gradient Indeterminate Progress Line */}
        <div className="w-36 h-1 mx-auto mb-3.5 rounded-full bg-gray-100 overflow-hidden relative">
          <div
            className="h-full w-1/3 rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 animate-[modernloader_1.5s_ease-in-out_infinite]"
          />
        </div>

        <p className="text-[11px] text-gray-400 font-medium">
          Please wait a moment while we load everything
        </p>
      </div>

      {/* Scoped Keyframes for the modern loader line */}
      <style>{`
        @keyframes modernloader {
          0% { transform: translateX(-150%); }
          50% { transform: translateX(80%); }
          100% { transform: translateX(250%); }
        }
      `}</style>
    </div>
  );
}

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-5 w-5 border-2',
    md: 'h-8 w-8 border-2',
    lg: 'h-12 w-12 border-3',
  };

  return (
    <div className="relative inline-flex items-center justify-center">
      <div className={`${sizeClasses[size]} border-blue-600/20 border-t-blue-600 rounded-full animate-spin ${className}`} />
    </div>
  );
}

interface LoadingOverlayProps {
  message?: string;
}

export function LoadingOverlay({ message = 'Loading...' }: LoadingOverlayProps) {
  let logoUrl = '/logo.png';
  let brandName = 'Click2IT';

  try {
    const { settings } = useSettings();
    if (settings?.logoUrl) logoUrl = settings.logoUrl;
    if (settings?.brandName) brandName = settings.brandName;
  } catch {
    // Fallback
  }

  const [imgError, setImgError] = useState(false);

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 animate-[fadeIn_0.2s_ease-out]">
      <div className="bg-white rounded-3xl p-7 shadow-2xl flex flex-col items-center gap-4 max-w-xs mx-4 border border-gray-100 animate-[scaleIn_0.2s_ease-out] text-center">
        <div className="relative w-16 h-16 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-blue-600 border-r-blue-400/40 animate-spin" />
          <div className="w-11 h-11 rounded-full bg-white flex items-center justify-center p-1.5 shadow-sm border border-gray-100">
            {!imgError ? (
              <img src={logoUrl} alt={brandName} onError={() => setImgError(true)} className="w-full h-full object-contain" />
            ) : (
              <div className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-ping" />
            )}
          </div>
        </div>
        <p className="text-xs font-bold text-gray-800">{message}</p>
      </div>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
      `}</style>
    </div>
  );
}
