import React from 'react';

export default function GlassPanel({ children, className = '' }) {
  return (
    <div className={`bg-white/5 border border-white/10 backdrop-blur-sm rounded-xl p-6 ${className}`}>
      {children}
    </div>
  );
}
