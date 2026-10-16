import React from 'react';
import { Link } from 'react-router-dom';
import { Home, Search, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F2F4F8] relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-[#7B61FF]/5" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-[#EF4444]/5" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border border-gray-200/50" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full border border-gray-200/30" />
      </div>

      <div className="relative z-10 text-center px-4 max-w-2xl mx-auto">
        {/* 404 Number with gradient */}
        <div className="mb-8">
          <h1 className="text-[120px] md:text-[180px] font-black leading-none tracking-tighter mb-4"
            style={{
              fontFamily: 'var(--font-display)',
              background: 'linear-gradient(135deg, #7B61FF 0%, #EF4444 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
            404
          </h1>
          <div className="h-1 w-24 mx-auto bg-gradient-to-r from-[#7B61FF] to-[#EF4444] rounded-full" />
        </div>

        {/* Message */}
        <div className="mb-10">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
            Oops! Page Not Found
          </h2>
          <p className="text-gray-500 max-w-md mx-auto leading-relaxed">
            The page you're looking for seems to have wandered off into the digital void. 
            Let's get you back on track.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link
            to="/"
            className="inline-flex items-center gap-2 bg-[#7B61FF] text-white px-8 py-3.5 rounded-xl font-bold hover:bg-[#6a51e6] transition-all duration-300 shadow-lg shadow-[#7B61FF]/25 hover:shadow-xl hover:shadow-[#7B61FF]/30 hover:-translate-y-0.5"
          >
            <Home size={18} />
            Back to Home
          </Link>
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-2 bg-white text-gray-700 px-8 py-3.5 rounded-xl font-bold hover:bg-gray-50 transition-all duration-300 border border-gray-200 hover:border-gray-300"
          >
            <ArrowLeft size={18} />
            Go Back
          </button>
        </div>

        {/* Help text */}
        <p className="mt-10 text-sm text-gray-400">
          If you think this is an error, please contact our support team.
        </p>
      </div>
    </div>
  );
}
