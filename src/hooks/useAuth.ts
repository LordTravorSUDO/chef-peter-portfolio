/**
 * useAuth — React context + hook for Supabase Auth state.
 *
 * Provides session, user, profile and loading state to all admin components.
 */

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { getCurrentProfile, signOut as authSignOut } from '../lib/services/auth';
import type { Profile } from '../types/article';

// ---------------------------------------------------------------------------
// Context shape
// ---------------------------------------------------------------------------

export interface AuthContextValue {
  session:        Session | null;
  user:           User    | null;
  profile:        Profile | null;
  /** true while the initial session check is in progress */
  loading:        boolean;
  isAdmin:        boolean;
  signOut:        () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Context singleton
// ---------------------------------------------------------------------------

export const AuthContext = createContext<AuthContextValue>({
  session: null, user: null, profile: null,
  loading: true, isAdmin: false,
  signOut:        async () => {},
  refreshProfile: async () => {},
});

// ---------------------------------------------------------------------------
// useAuth — consume context in any component inside /admin
// ---------------------------------------------------------------------------

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}

// ---------------------------------------------------------------------------
// useAuthState — the actual state logic, used only in ProtectedRoute / AuthProvider
// ---------------------------------------------------------------------------

export function useAuthState(): AuthContextValue {
  const [session, setSession] = useState<Session | null>(null);
  const [user,    setUser]    = useState<User    | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (u: User | null) => {
    if (!u) { setProfile(null); return; }
    try {
      const p = await getCurrentProfile();
      setProfile(p);
    } catch {
      setProfile(null);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    const { data: { user: u } } = await supabase.auth.getUser();
    await loadProfile(u);
  }, [loadProfile]);

  useEffect(() => {
    let mounted = true;

    // 1. Restore from localStorage immediately (no network round-trip)
    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      if (!mounted) return;
      setSession(s);
      setUser(s?.user ?? null);
      await loadProfile(s?.user ?? null);
      if (mounted) setLoading(false);
    });

    // 2. Keep in sync with auth events (token refresh, sign-out from another tab)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, s) => {
        if (!mounted) return;
        setSession(s);
        setUser(s?.user ?? null);
        await loadProfile(s?.user ?? null);
        if (mounted) setLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signOut = useCallback(async () => {
    await authSignOut();
    setSession(null);
    setUser(null);
    setProfile(null);
  }, []);

  const isAdmin = profile?.role === 'admin' && profile.is_active === true;

  return { session, user, profile, loading, isAdmin, signOut, refreshProfile };
}
