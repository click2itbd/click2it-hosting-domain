import { useEffect } from 'react';
import { useSettings } from '../context/SettingsContext';

const DEFAULT_PRIMARY = '#4F46E5';
const DEFAULT_SECONDARY = '#112233';

export function useBrandTokens() {
  const { settings } = useSettings();

  useEffect(() => {
    const root = document.documentElement;
    const primary = settings.primaryColor || DEFAULT_PRIMARY;
    const secondary = settings.secondaryColor || DEFAULT_SECONDARY;

    if (primary !== DEFAULT_PRIMARY) {
      root.style.setProperty('--c2i-red', primary);
    } else {
      root.style.removeProperty('--c2i-red');
    }

    if (secondary !== DEFAULT_SECONDARY) {
      root.style.setProperty('--c2i-ink', secondary);
    } else {
      root.style.removeProperty('--c2i-ink');
    }
  }, [settings.primaryColor, settings.secondaryColor]);
}
