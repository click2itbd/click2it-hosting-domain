import React from 'react';
import { RotateCcw, Sparkles, ClipboardList, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

interface BuilderHeaderProps {
  onReset: () => void;
}

export const BuilderHeader: React.FC<BuilderHeaderProps> = ({ onReset }) => {
  return (
    <div className="relative rounded-[2rem] overflow-hidden mb-8 bg-gradient-to-br from-violet-50 via-white to-cyan-50 border border-slate-200/80 shadow-[0_8px_40px_rgba(15,23,42,0.06)]">
      {/* Soft decorative blobs */}
      <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-violet-200/40 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 left-1/3 w-72 h-72 rounded-full bg-cyan-200/40 blur-3xl pointer-events-none" />

      <div className="relative grid md:grid-cols-5 items-center gap-8 p-8 md:p-12">
        <div className="md:col-span-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white text-violet-600 border border-violet-100 text-xs font-bold mb-5 shadow-sm">
            <Sparkles size={13} /> Smart PC Builder
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 mb-4 leading-[1.1]">
            Build your perfect PC,{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-cyan-600">step by step</span>
          </h1>
          <p className="text-base text-slate-500 max-w-lg mb-7">
            Pick each part one at a time. Our compatibility engine hides anything that won't fit, so every build just works.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => document.dispatchEvent(new CustomEvent('open-ai-assistant'))}
              className="flex items-center gap-2 px-5 py-3 text-sm font-bold bg-slate-900 text-white hover:bg-violet-600 rounded-2xl transition-colors shadow-lg shadow-slate-900/10"
            >
              <Sparkles size={16} /> Build for me (AI)
            </button>
            <button
              onClick={() => document.dispatchEvent(new CustomEvent('open-custom-build'))}
              className="flex items-center gap-2 px-5 py-3 text-sm font-bold bg-white text-slate-800 hover:bg-slate-50 border border-slate-200 rounded-2xl transition-colors"
            >
              <ClipboardList size={16} /> Request custom build
            </button>
            <Link
              to="/pc-build/community-builds"
              className="flex items-center gap-2 px-5 py-3 text-sm font-bold bg-white text-slate-800 hover:bg-slate-50 border border-slate-200 rounded-2xl transition-colors"
            >
              <Users size={16} /> Community
            </Link>
            <button
              onClick={onReset}
              title="Start over"
              className="h-11 w-11 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-colors"
            >
              <RotateCcw size={18} />
            </button>
          </div>
        </div>

        <div className="hidden md:block md:col-span-2">
          <div className="relative rounded-3xl overflow-hidden shadow-2xl shadow-violet-500/10 border-4 border-white rotate-2">
            <img
              src="https://images.unsplash.com/photo-1587202372634-32705e3bf49c?q=80&w=1200&auto=format&fit=crop"
              alt="PC Build Setup"
              className="w-full h-64 object-cover"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
