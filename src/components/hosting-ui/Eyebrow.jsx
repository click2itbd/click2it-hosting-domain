import React from 'react';

export default function Eyebrow({ children, light = false }) {
  return (
    <span
      className={`inline-flex text-xs font-bold tracking-wide px-3 py-1 rounded-full ${
        light
          ? 'bg-white/10 text-white'
          : 'bg-[var(--c2i-red)]/10 text-[var(--c2i-red)]'
      }`}
    >
      {children}
    </span>
  );
}
