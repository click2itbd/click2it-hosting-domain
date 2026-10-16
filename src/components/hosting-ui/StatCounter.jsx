import React from 'react';

export default function StatCounter({ value, label, icon: Icon, light = false }) {
  const textColor = light ? 'text-gray-200' : 'text-[var(--c2i-ink)]';
  const labelColor = light ? 'text-gray-400' : 'text-[var(--c2i-ink-soft)]';

  return (
    <div className="text-center">
      {Icon && (
        <div className={`mb-2 flex justify-center ${light ? 'text-gray-300' : 'text-[var(--c2i-red)]'}`}>
          <Icon size={28} />
        </div>
      )}
      <div className={`text-4xl md:text-5xl font-bold font-display ${textColor}`}>
        {value}
      </div>
      <div className={`mt-1 text-sm font-medium ${labelColor}`}>
        {label}
      </div>
    </div>
  );
}
