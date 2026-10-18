import React from 'react';
import { Footer } from './Footer';
import { Toaster } from 'react-hot-toast';
import { HostingNavbar } from './navbars/HostingNavbar';
import { FirebaseValidationBanner } from './FirebaseValidationBanner';

interface LayoutProps {
  children: React.ReactNode;
  fullWidth?: boolean;
  bgClassName?: string;
  mainClassName?: string;
}

export const Layout: React.FC<LayoutProps> = ({ 
  children, 
  fullWidth = false,
  bgClassName = 'bg-white',
  mainClassName = ''
}) => {
  return (
    <div className={`min-h-screen flex flex-col ${bgClassName}`}>
      {import.meta.env.DEV && <FirebaseValidationBanner />}
      <HostingNavbar />
      <main className={`flex-grow overflow-x-hidden ${fullWidth ? '' : 'w-full max-w-[1440px] mx-auto px-2 sm:px-4 md:px-[50px] py-8'} ${mainClassName}`}>
        {children}
      </main>
      <Footer />
      <Toaster position="bottom-right" />
    </div>
  );
};

