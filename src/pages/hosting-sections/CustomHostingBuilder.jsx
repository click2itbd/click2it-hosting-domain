import React from 'react';
import { CustomPackageBuilder } from '../../components/hosting/CustomPackageBuilder';

export default function CustomHostingBuilder({ initialType = 'cpanel' }) {
  return (
    <section
      id="custom-package"
      className="py-12 bg-gradient-to-b from-slate-50 via-white to-slate-50 border-t border-gray-200 scroll-mt-20"
    >
      <div className="container mx-auto px-2 sm:px-4 max-w-7xl">
        <CustomPackageBuilder initialType={initialType} />
      </div>
    </section>
  );
}


