/**
 * Authentication service.
 *
 * All Supabase Auth interactions go through here.
 * Components never import supabase.auth directly.
 *
 * Security:
 *   - Only email + password sign-in is enabled (no public sign-up).
 *   - Admin accounts are created via the Supabase dashboard or the
 *     service-role seed script — never via this client code.
 *   - PKCE flow is used (configured in supabase.ts).
 */

import { supabase } from '../supabase';
import type { Session, User } from '@supabase/supabase-js';
import type { Profile } from '../../types/article';

export interface AuthState {
  session: Session | null;
  user:    User    | null;
  profile: Profile | null;
  loading: boolean;
}

/** Sign in with email and password. Returns the session or throws. */
export async function signIn(email: string, password: string): Promise<Session> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  if (!data.session) throw new Error('Sign-in succeeded but no session was returned.');
  return data.session;
}

/** Sign out the current user. */
export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
}

/** Get the current session synchronously from storage. */
export async function getSession(): Promise<Session | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

/** Get the currently authenticated user. */
export async function getCurrentUser(): Promise<User | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

/** Fetch a profile row by user id (includes role). No auth network round-trip. */
export async function getProfileById(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw new Error(`getProfileById: ${error.message}`);
  return data as Profile | null;
}

/** Fetch the profile row for the current user (includes role). */
export async function getCurrentProfile(): Promise<Profile | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  return getProfileById(user.id);
}

/** Subscribe to auth state changes. Returns the unsubscribe function. */
export function onAuthStateChange(
  callback: (session: Session | null) => void
): () => void {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (_event, session) => callback(session)
  );
  return () => subscription.unsubscribe();
}

/** Returns true if the current session belongs to an active admin. */
export async function isCurrentUserAdmin(): Promise<boolean> {
  const profile = await getCurrentProfile();
  return profile?.role === 'admin' && profile.is_active === true;
}
