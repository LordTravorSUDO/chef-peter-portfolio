/**
 * useAuth — React context + hook for Supabase Auth state.
 *
 * Provides session, user, profile and loading state to all admin components.
 */

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { getProfileById, signOut as authSignOut } from '../lib/services/auth';
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
  /** Set when the profile could not be loaded (network/timeout) — not the same as "not an admin" */
  profileError:   string | null;
  signOut:        () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Context singleton
// ---------------------------------------------------------------------------

export const AuthContext = createContext<AuthContextValue>({
  session: null, user: null, profile: null,
  loading: true, isAdmin: false, profileError: null,
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
  const [session,        setSession]        = useState<Session | null>(null);
  const [profile,        setProfile]        = useState<Profile | null>(null);
  const [sessionLoaded,  setSessionLoaded]  = useState(false);
  const [profileUserId,  setProfileUserId]  = useState<string | null>(null);
  const [profileError,   setProfileError]   = useState<string | null>(null);

  const user   = session?.user ?? null;
  const userId = user?.id ?? null;

  const loadProfile = useCallback(async (uid: string | null) => {
    if (!uid) { setProfile(null); setProfileUserId(null); return; }
    try {
      setProfile(await getProfileById(uid));
      setProfileError(null);
    } catch (e) {
      setProfile(null);
      setProfileError(e instanceof Error ? e.message : 'Could not load your account.');
    } finally {
      setProfileUserId(uid);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    await loadProfile(userId);
  }, [loadProfile, userId]);

  // 1. Session tracking.
  //
  // IMPORTANT: the onAuthStateChange callback must stay synchronous and must
  // not call other Supabase methods. supabase-js holds its auth lock while the
  // callback runs, so awaiting a Supabase call inside it can deadlock every
  // later request (the cause of the endless "Verifying session…" spinner and
  // of saves that never finish). The callback only stores the session; the
  // profile is fetched by the effect below.
  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (!mounted) return;
      setSession(s);
      setSessionLoaded(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      if (!mounted) return;
      setSession(s);
      setSessionLoaded(true);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // 2. Profile — loaded once per signed-in user (token refreshes keep the same
  // user id, so they do not trigger another profile request).
  useEffect(() => {
    if (!sessionLoaded) return;
    loadProfile(userId);
  }, [sessionLoaded, userId, loadProfile]);

  const signOut = useCallback(async () => {
    await authSignOut();
    setSession(null);
    setProfile(null);
    setProfileUserId(null);
  }, []);

  const loading = !sessionLoaded || (userId !== null && profileUserId !== userId);
  const isAdmin = profile?.role === 'admin' && profile.is_active === true;

  return { session, user, profile, loading, isAdmin, profileError, signOut, refreshProfile };
}
