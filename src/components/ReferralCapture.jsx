'use client';

import { useEffect } from 'react';

/**
 * Captures a ?ref=CODE referral code from the URL on first load and stores
 * it in localStorage so it survives through to signup, where AuthContext
 * attaches it to the new user's raw_user_meta_data for the DB trigger to
 * resolve into profiles.referred_by.
 */
export default function ReferralCapture() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) {
      localStorage.setItem('sanddock_ref_code', ref.toUpperCase());
    }
  }, []);

  return null;
}
