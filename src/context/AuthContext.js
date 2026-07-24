'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

const AuthContext = createContext({
  user: null,
  profile: null,
  session: null,
  loading: true,
  isMock: false,
  signUpWithEmail: async (email, password, name) => {},
  signInWithEmail: async (email, password) => {},
  signInWithGoogle: async () => {},
  signOut: async () => {},
  resendVerification: async (email) => {},
  updateProfile: async (updates) => {},
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isMock, setIsMock] = useState(!isSupabaseConfigured);
  const router = useRouter();

  // ── Expiry check - runs on every app load instead of a cron ──────────────
  // Called after profile is loaded. If the user's paid subscription or free
  // trial has expired, silently calls the server-side expiry-check endpoint
  // which downgrades the plan in Supabase, then re-fetches the profile.
  const checkExpiry = async (uid, profileData) => {
    try {
      const now = Date.now();
      // Grandmaster is a lifetime plan - it never expires.
      const isExpiringPlan = ['pro', 'master'].includes(profileData?.plan);

      const paidExpired =
        isExpiringPlan &&
        profileData?.plan_ends_at &&
        new Date(profileData.plan_ends_at).getTime() < now;

      if (paidExpired) {
        console.log('[AuthContext] Paid plan expired - downgrading user and clearing Telegram alerts…');
        console.log(`[Telegram Bot] Evicting user ${uid} from paid ${profileData.plan} Telegram channel due to plan expiry.`);

        const updates = {
          plan: 'free',
          billing_cycle: null,
          plan_ends_at: null,
          telegram_chat_id: null,
          telegram_invite_link: null,
          telegram_invite_claimed: false
        };

        const { data: updated } = await supabase
          .from('profiles')
          .update(updates)
          .eq('id', uid)
          .select()
          .single();

        if (updated) {
          setProfile(updated);
          console.log('[AuthContext] Plan downgraded to free, Telegram connection cleared.');
        }
      }
    } catch (err) {
      // Non-fatal - silently ignore
      console.warn('[AuthContext] Expiry check failed (non-fatal):', err.message);
    }
  };

  // Helper to fetch/create profile in actual database
  const fetchProfile = async (uid, email, metadata = {}) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', uid)
        .single();
      if (data) {
        setProfile(data);
        // Run expiry check on every login/load - replaces cron
        await checkExpiry(uid, data);
      } else {
        const defaultProfile = {
          id: uid,
          email: email || '',
          name: metadata?.full_name || email?.split('@')[0] || '',
          plan: 'free',
          referral_code: uid.replace(/-/g, '').slice(0, 8).toUpperCase(),
          coins_selected: ['BTC'],
          alert_delivery: { web: true, telegram: false }
        };
        const { data: upsertedData } = await supabase
          .from('profiles')
          .upsert(defaultProfile)
          .select()
          .single();
        if (upsertedData) {
          setProfile(upsertedData);
        }
      }
    } catch (err) {
      console.error('Error fetching Supabase profile:', err);
    }
  };

  // Helper to fetch/create mock profile in local storage
  const fetchProfileMock = (uid, email, name = '') => {
    const key = `sanddock_mock_profile_${uid}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      setProfile(JSON.parse(stored));
    } else {
      const defaultProfile = {
        id: uid,
        email: email,
        name: name || email.split('@')[0],
        plan: 'free',
        billing_cycle: null,
        plan_ends_at: null,
        referral_code: uid.replace(/-/g, '').slice(0, 8).toUpperCase(),
        referred_by: null,
        experience_level: null,
        risk_style: null,
        primary_goal: null,
        coins_selected: ['BTC'],
        alert_delivery: { web: true, telegram: false },
        telegram_chat_id: null,
        telegram_verified_at: null,
        onboarding_completed_at: null,
      };
      setProfile(defaultProfile);
      localStorage.setItem(key, JSON.stringify(defaultProfile));
    }
  };

  useEffect(() => {
    if (isSupabaseConfigured) {
      supabase.auth.getSession().then(async ({ data: { session } }) => {
        setSession(session);
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        if (currentUser) {
          await fetchProfile(currentUser.id, currentUser.email, currentUser.user_metadata);
        }
        setLoading(false);
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
        setSession(session);
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        if (currentUser) {
          await fetchProfile(currentUser.id, currentUser.email, currentUser.user_metadata);
        } else {
          setProfile(null);
        }
        setLoading(false);
      });

      return () => {
        subscription.unsubscribe();
      };
    } else {
      // Local Mock Auth state recovery
      const storedUser = localStorage.getItem('sanddock_mock_user');
      if (storedUser) {
        const mockUserObj = JSON.parse(storedUser);
        setUser(mockUserObj);
        setSession({ user: mockUserObj, access_token: 'mock-jwt-token' });
        fetchProfileMock(mockUserObj.id, mockUserObj.email, mockUserObj.user_metadata?.full_name);
      }
      setLoading(false);
    }
  }, []);

  const signUpWithEmail = async (email, password, name) => {
    const referralCode = typeof window !== 'undefined'
      ? localStorage.getItem('sanddock_ref_code')
      : null;

    if (isSupabaseConfigured) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name, ...(referralCode ? { referral_code: referralCode } : {}) },
        },
      });
      if (error) throw error;
      return data;
    } else {
      // Mock Sign Up: simulate email pending state
      localStorage.setItem('sanddock_pending_verification', email);
      return { user: { email, name } };
    }
  };

  const signInWithEmail = async (email, password) => {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      return data;
    } else {
      // Mock Sign In
      const mockUserObj = { id: 'mock-user-123', email, user_metadata: { full_name: email.split('@')[0] } };
      setUser(mockUserObj);
      setSession({ user: mockUserObj, access_token: 'mock-jwt-token' });
      localStorage.setItem('sanddock_mock_user', JSON.stringify(mockUserObj));
      fetchProfileMock(mockUserObj.id, mockUserObj.email, mockUserObj.user_metadata?.full_name);
      return { user: mockUserObj };
    }
  };

  const signInWithGoogle = async () => {
    if (isSupabaseConfigured) {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
      });
      if (error) throw error;
    } else {
      // Mock Google Sign-In redirect simulation
      const mockUserObj = { id: 'mock-google-user', email: 'google-user@example.com', user_metadata: { full_name: 'Google Trader' } };
      setUser(mockUserObj);
      setSession({ user: mockUserObj, access_token: 'mock-google-token' });
      localStorage.setItem('sanddock_mock_user', JSON.stringify(mockUserObj));
      fetchProfileMock(mockUserObj.id, mockUserObj.email, mockUserObj.user_metadata?.full_name);
      router.push('/onboarding');
    }
  };

  const signOut = async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    } else {
      // Mock Logout
      if (user) {
        localStorage.removeItem(`sanddock_mock_profile_${user.id}`);
      }
      setUser(null);
      setProfile(null);
      setSession(null);
      localStorage.removeItem('sanddock_mock_user');
      localStorage.removeItem('sanddock_pending_verification');
    }
    router.push('/');
  };

  const resendVerification = async (email) => {
    if (isSupabaseConfigured) {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });
      if (error) throw error;
    } else {
      console.log('Mock: verification email resent to', email);
    }
  };

  const updateProfile = async (updates) => {
    if (!user) return null;
    if (isSupabaseConfigured) {
      // 1. Attempt to update first (safely uses update policy)
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();
      
      if (error) {
        // 2. If row does not exist, insert it (uses insert policy)
        if (error.code === 'PGRST116' || error.message?.includes('0 rows')) {
          const { data: insertedData, error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: user.id,
              email: user.email,
              name: user.user_metadata?.full_name || profile?.name || user.email.split('@')[0],
              ...updates
            })
            .select()
            .single();
          if (insertError) {
            console.error('Supabase profile insert error:', insertError);
            throw insertError;
          }
          if (insertedData) setProfile(insertedData);
          return insertedData;
        }
        console.error('Supabase profile update error:', error);
        throw error;
      }
      if (data) setProfile(data);
      return data;
    } else {
      const newProfile = { ...profile, ...updates };
      setProfile(newProfile);
      localStorage.setItem(`sanddock_mock_profile_${user.id}`, JSON.stringify(newProfile));
      return newProfile;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        loading,
        isMock,
        signUpWithEmail,
        signInWithEmail,
        signInWithGoogle,
        signOut,
        resendVerification,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
