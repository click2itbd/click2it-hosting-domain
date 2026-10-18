import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { SiteSettings } from '../types';

interface SettingsContextType {
  settings: SiteSettings;
  updateSettings: (newSettings: Partial<SiteSettings>) => Promise<void>;
  loading: boolean;
}

const defaultSettings: SiteSettings = {
  id: 'default',
  brandName: 'CLICK2IT BD',
  brandShortName: 'CLICK2IT',
  primaryDomain: 'click2it.bd',
  hostingDomain: 'click2it.bd',
  website: 'https://click2it.bd',
  nameserver1: 'ns1.click2itbd.com',
  nameserver2: 'ns2.click2itbd.com',
  nameserver3: 'ns3.click2itbd.com',
  nameserver4: 'ns4.click2itbd.com',
  cpanelUrl: 'https://cpanel.click2it.bd',
  webmailUrl: 'https://webmail.click2it.bd',
  clientAreaUrl: '/client-area',
  primaryColor: '#4F46E5',
  secondaryColor: '#112233',
  accentColor: '#8B5CF6',
  contactEmail: 'info@click2it.bd',
  contactPhone: '+880 123456789',
  address: 'Dhaka, Bangladesh',
  footerText: '© 2026 CLICK2IT BD. All rights reserved.',
  popupEnabled: false,
  popupTitle: 'Welcome to CLICK2IT BD!',
  popupMessage: 'Check out our latest deals and new arrivals.',
  popupDelay: 3,
  apiSettings: {
    domainApiType: 'manual',
    domainApiKey: '',
    cloudLinuxApiType: 'manual',
    cloudLinuxApiKey: '',
    vpsApiType: 'manual',
    vpsApiKey: ''
  },
  updatedAt: new Date().toISOString(),
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<SiteSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribe = () => {};
    try {
      const settingsRef = doc(db, 'settings', 'site');
      
      unsubscribe = onSnapshot(settingsRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as SiteSettings;
          let needsUpdate = false;
          const updated: SiteSettings = {
            ...defaultSettings,
            ...data,
          };

          if (data.brandName === 'STAR TECH' || data.brandName === 'Star Tech') {
            updated.brandName = 'CLICK2IT BD';
            updated.brandShortName = 'CLICK2IT';
            needsUpdate = true;
          }

          if (!updated.primaryDomain) {
            updated.primaryDomain = 'click2it.bd';
            updated.hostingDomain = 'click2it.bd';
            needsUpdate = true;
          }
          if (!updated.nameserver1) {
            updated.nameserver1 = 'ns1.click2itbd.com';
            updated.nameserver2 = 'ns2.click2itbd.com';
            needsUpdate = true;
          }

          if (needsUpdate) {
            setDoc(settingsRef, updated, { merge: true }).catch((err) => {
              console.warn('[SettingsContext] setDoc merge skipped:', err);
            });
          }
          setSettings(updated);
        } else {
          setDoc(settingsRef, defaultSettings).catch((err) => {
            console.warn('[SettingsContext] setDoc default skipped:', err);
          });
          setSettings(defaultSettings);
        }
        setLoading(false);
      }, (err) => {
        console.warn('[SettingsContext] Firestore settings snapshot failed, using defaults:', err);
        setSettings(defaultSettings);
        setLoading(false);
      });
    } catch (err) {
      console.warn('[SettingsContext] Init failed, falling back to defaults:', err);
      setSettings(defaultSettings);
      setLoading(false);
    }

    return () => {
      try {
        unsubscribe();
      } catch {
        // ignore
      }
    };
  }, []);

  const updateSettings = async (newSettings: Partial<SiteSettings>) => {
    try {
      const settingsRef = doc(db, 'settings', 'site');
      const updatedData = {
        ...settings,
        ...newSettings,
        updatedAt: new Date().toISOString(),
      };
      await setDoc(settingsRef, updatedData, { merge: true });
      setSettings(updatedData);
    } catch (err) {
      console.error('[SettingsContext] updateSettings failed:', err);
      throw err;
    }
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, loading }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useSettings must be used within a SettingsProvider');
  return context;
};
