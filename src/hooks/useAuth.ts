/**
 * useAuth — React context + hook for Supabase Auth state.
 *
 * Provides session, user, profile and loading state to all admin components.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * AUTH LIFECYCLE — WHY THE onAuthStateChange CALLBACK IS SYNCHRONOUS
 * ─────────────────────────────────────────────────────────────────────────────
 * Supabase Auth (auth-js) invokes onAuthStateChange callbacks for SIGNED_IN
 * (fired when the tab becomes visible again) and TOKEN_REFRESHED while it is
 * still holding its internal session lock, and it awaits the callback before
 * releasing that lock. Any Supabase call that needs the session — getUser(),
 * getSession(), and every PostgREST / Storage request made through supabase-js
 * — queues behind the same lock. Awaiting such a call inside the callback
 * therefore deadlocks the client: from that moment every database request
 * waits forever (saves never leave the browser, spinners never stop).
 *
 * The lifecycle used here:
 *   1. The callback ONLY records the session in React state. It never awaits
 *      and never calls Supabase. INITIAL_SESSION (always emitted once per
 *      subscriber) restores a stored session, so no separate getSession()
 *      call is needed.
 *   2. The profile is loaded by a separate effect keyed on the user ID, using
 *      the ID from the session (no getUser() round-trip). Token refreshes
 *      keep the same user ID, so they do not trigger repeated profile
 *      requests.
 *   3. Every profile request carries a generation number. A response is only
 *      applied if it is still the latest request AND belongs to the user who
 *      is currently signed in, so a slow response can never overwrite state
 *      after logout or an account switch.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react';
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
  /** true while the initial session check (and the signed-in user's profile load) is in progress */
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

interface ProfileState {
  /** The user ID this profile result belongs to (null = nothing loaded) */
  userId:  string | null;
  profile: Profile | null;
}

const EMPTY_PROFILE: ProfileState = { userId: null, profile: null };

export function useAuthState(): AuthContextValue {
  const [session,         setSession]         = useState<Session | null>(null);
  const [sessionResolved, setSessionResolved] = useState(false);
  const [profileState,    setProfileState]    = useState<ProfileState>(EMPTY_PROFILE);

  const user   = session?.user ?? null;
  const userId = user?.id ?? null;

  // Latest signed-in user ID, readable from async continuations.
  const currentUserIdRef = useRef<string | null>(null);
  currentUserIdRef.current = userId;

  // Incremented for every profile request, on sign-out and on unmount.
  // Only the response of the latest generation may update state.
  const profileGenerationRef = useRef(0);

  // ── 1. Session tracking — synchronous callback, no Supabase calls ─────────
  useEffect(() => {
    let active = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      // DO NOT await or call Supabase here — see the lifecycle notes above.
      if (!active) return;
      setSession(nextSession);
      setSessionResolved(true);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  // ── 2. Profile loading — outside the auth callback, guarded against staleness
  const loadProfile = useCallback(async (forUserId: string): Promise<void> => {
    const generation = ++profileGenerationRef.current;
    let result: Profile | null = null;
    try {
      result = await getProfileById(forUserId);
    } catch (err) {
      console.error('[auth] Failed to load profile:', err);
      result = null;
    }
    const isLatest    = generation === profileGenerationRef.current;
    const sameAccount = currentUserIdRef.current === forUserId;
    if (isLatest && sameAccount) {
      setProfileState({ userId: forUserId, profile: result });
    }
  }, []);

  useEffect(() => {
    if (!sessionResolved) return;

    if (!userId) {
      // Signed out: invalidate any in-flight request and clear the profile.
      profileGenerationRef.current++;
      setProfileState(EMPTY_PROFILE);
      return;
    }

    void loadProfile(userId);

    return () => {
      // User changed or component unmounted: ignore the pending response.
      profileGenerationRef.current++;
    };
  }, [sessionResolved, userId, loadProfile]);

  // ── Public actions ────────────────────────────────────────────────────────
  const refreshProfile = useCallback(async () => {
    const uid = currentUserIdRef.current;
    if (!uid) {
      setProfileState(EMPTY_PROFILE);
      return;
    }
    await loadProfile(uid);
  }, [loadProfile]);

  const signOut = useCallback(async () => {
    await authSignOut();
    // The SIGNED_OUT event also clears the session; clearing here as well
    // makes the UI update immediately.
    profileGenerationRef.current++;
    setSession(null);
    setProfileState(EMPTY_PROFILE);
  }, []);

  // ── Derived state ─────────────────────────────────────────────────────────
  const profile = profileState.userId !== null && profileState.userId === userId
    ? profileState.profile
    : null;

  const loading = !sessionResolved || (userId !== null && profileState.userId !== userId);

  const isAdmin = profile?.role === 'admin' && profile.is_active === true;

  return useMemo(
    () => ({ session, user, profile, loading, isAdmin, signOut, refreshProfile }),
    [session, user, profile, loading, isAdmin, signOut, refreshProfile],
  );
}
