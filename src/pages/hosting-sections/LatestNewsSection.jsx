import React from 'react';

const NEWS = [
  { id: 1, category: 'Cloud', title: 'New cloud infrastructure deployed across 5 regions for faster access', image: '/assets/cloud_server.jpg', date: 'Aug 15, 2026' },
  { id: 2, category: 'Security', title: 'Advanced DDoS protection now included in all hosting plans', image: '/assets/hero_server.jpg', date: 'Aug 12, 2026' },
  { id: 3, category: 'Domain', title: 'New TLDs available: .ai, .io, .tech at special prices', image: '/assets/secure_domain.jpg', date: 'Aug 10, 2026' },
  { id: 4, category: 'Hosting', title: 'NVMe SSD upgrades completed across all shared servers', image: '/assets/cloud_server.jpg', date: 'Aug 8, 2026' },
];

export default function LatestNewsSection() {
  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-2 sm:px-4">
        <div className="text-center mb-12">
          <p className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-2">BLOG & UPDATES</p>
          <h2 className="text-3xl md:text-4xl font-extrabold text-[var(--c2i-blue-dark)] uppercase">OUR LATEST NEWS</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {NEWS.map((item) => (
            <div key={item.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-xl transition-all duration-300 group cursor-pointer">
              <div className="relative h-40 overflow-hidden">
                <img src={item.image} alt={item.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
              </div>
              <div className="p-5 bg-[var(--c2i-blue-dark)]">
                <span className="inline-block bg-[var(--c2i-orange)] text-white text-xs font-bold px-3 py-1 rounded-full mb-3 uppercase tracking-wide">
                  {item.category}
                </span>
                <h3 className="text-white font-bold text-sm leading-snug line-clamp-2">{item.title}</h3>
                <p className="text-gray-400 text-xs mt-2">{item.date}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
