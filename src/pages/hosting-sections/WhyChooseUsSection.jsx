import React from 'react';
import { FastForward, Shield, HeadphonesIcon } from 'lucide-react';

export default function WhyChooseUsSection() {
  const features = [
    {
      title: 'Fast server',
      description: 'Experience blazing fast load times with our optimized server infrastructure designed for speed and reliability.',
      icon: <FastForward size={32} className="text-[var(--c2i-blue-light)]" />
    },
    {
      title: 'Data Security',
      description: 'Your data is safe with us. We employ top-tier security protocols to ensure your information remains protected at all times.',
      icon: <Shield size={32} className="text-[var(--c2i-blue-light)]" />
    },
    {
      title: '24/7 Support',
      description: 'Our expert support team is available around the clock to assist you with any questions or issues you may have.',
      icon: <HeadphonesIcon size={32} className="text-[var(--c2i-blue-light)]" />
    }
  ];

  return (
    <section className="py-20 bg-gray-50">
      <div className="container mx-auto px-2 sm:px-4">
        <div className="text-center mb-12">
          <p className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-2">FIND OUT</p>
          <h2 className="text-3xl md:text-4xl font-extrabold text-[var(--c2i-blue-dark)] uppercase">WHY CHOOSE US?</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {features.map((feature, idx) => (
            <div key={idx} className="bg-white p-6 sm:p-8 rounded-2xl shadow-[0_4px_20px_-10px_rgba(0,0,0,0.1)] text-center transition-transform hover:-translate-y-2 duration-300">
              <div className="w-16 h-16 mx-auto mb-6 bg-[var(--c2i-blue-dark)]/5 rounded-full flex items-center justify-center">
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold text-[var(--c2i-blue-dark)] mb-4">{feature.title}</h3>
              <p className="text-gray-600 leading-relaxed text-sm">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
