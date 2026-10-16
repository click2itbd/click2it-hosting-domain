import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

export function ReferralTracker() {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) {
      // Store referral code in localStorage for 30 days
      const expiry = new Date().getTime() + 30 * 24 * 60 * 60 * 1000;
      localStorage.setItem('affiliate_ref', JSON.stringify({
        code: ref,
        expiry
      }));
    }
  }, [searchParams]);

  return null;
}
