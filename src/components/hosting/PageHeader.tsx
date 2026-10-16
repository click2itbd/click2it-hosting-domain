import React from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle }) => {
  return (
    <div 
      className="pt-20 pb-16 px-4 text-center border-b border-blue-900/50 relative overflow-hidden"
      style={{
        background: 'linear-gradient(160deg, #020b2e 0%, #050f3a 55%, #0b1a5c 100%)',
      }}
    >
      {/* Ambient glow */}
      <div style={{
        position: 'absolute', top: 0, left: '25%',
        width: 600, height: 400, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at center, rgba(56,100,240,0.18) 0%, transparent 70%)',
        filter: 'blur(40px)',
      }} />
      <div className="max-w-4xl mx-auto relative z-10">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>{title}</h1>
        {subtitle && (
          <p className="text-xl text-blue-100 max-w-2xl mx-auto opacity-90 leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
};
