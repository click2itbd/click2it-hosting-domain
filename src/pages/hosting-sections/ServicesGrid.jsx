import React from 'react';
import { Cloud, HardDrive, Server, Globe, Cpu, Share2 } from 'lucide-react';

const DEFAULT_SERVICES = [
  { id: 's1', title: 'Cloud hosting', icon: Cloud, description: 'Scale effortlessly with our cloud hosting solutions. Enjoy high availability, automatic backups, and seamless resource scaling.' },
  { id: 's2', title: 'Dedicated hosting', icon: HardDrive, description: 'Get a server all to yourself. Maximum performance, full root access, and complete control over your environment.' },
  { id: 's3', title: 'Shared hosting', icon: Share2, description: 'Perfect for beginners. Affordable and easy-to-manage hosting on a shared server with all the essential features.' },
  { id: 's4', title: 'Reseller Hosting', icon: Server, description: 'Start your own hosting business. Resell hosting under your own brand with our powerful reseller packages.' },
  { id: 's5', title: 'VPS Hosting', icon: Cpu, description: 'The power of a dedicated server at an affordable price. Full root access, guaranteed resources, and high performance.' },
  { id: 's6', title: 'Domain Registration', icon: Globe, description: 'Find and register the perfect domain name for your business. Search across hundreds of TLDs at competitive prices.' },
];

export default function ServicesGrid({ services = [], onNavigate, theme = 'dark' }) {
  const displayServices = services.length > 0 ? services : DEFAULT_SERVICES;
  const isLight = theme === 'light';

  return (
    <div className="container mx-auto py-16">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {displayServices.slice(0, 6).map((service, idx) => {
          const Icon = service.icon || Server;
          return (
            <div
              key={service.id || idx}
              className={`${
                isLight 
                  ? 'bg-white border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-200' 
                  : 'bg-[#0a1628] border border-gray-800 hover:border-blue-500 hover:shadow-[0_0_30px_rgba(59,130,246,0.15)]'
              } p-6 sm:p-8 rounded-2xl transition-all duration-300 group cursor-pointer flex flex-col justify-between`}
              onClick={() => {
                if (service.link) {
                  onNavigate(service.link);
                } else if (service.id && !service.id.startsWith('s')) {
                  onNavigate(`/hosting/${service.id}`);
                } else {
                  onNavigate('/pricing');
                }
              }}
            >
              <div>
                <div className={`w-14 h-14 mb-6 flex items-center justify-center rounded-2xl ${
                  isLight ? 'bg-blue-50 group-hover:bg-blue-600' : 'bg-blue-500/10 group-hover:bg-blue-500'
                } transition-colors duration-300`}>
                  <Icon size={28} strokeWidth={1.5} className={`${
                    isLight ? 'text-blue-600 group-hover:text-white' : 'text-blue-400 group-hover:text-white'
                  } transition-colors duration-300`} />
                </div>
                <h3 className={`text-xl font-bold mb-3 ${isLight ? 'text-gray-900 group-hover:text-blue-600' : 'text-white'} transition-colors`}>
                  {service.title}
                </h3>
                <p className={`text-sm leading-relaxed ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                  {service.description}
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between text-xs font-bold text-blue-600">
                <span>Learn More & Pricing</span>
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
