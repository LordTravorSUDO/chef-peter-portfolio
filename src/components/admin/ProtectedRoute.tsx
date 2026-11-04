/**
 * ProtectedRoute — provides auth context and layout for all /admin/* routes.
 *
 * Renders an Outlet (child route) when a valid Supabase session is present.
 * Redirects to /admin/login otherwise, preserving the intended destination.
 */

import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import AuthProvider from './AuthProvider';
import AdminLayout from './AdminLayout';
import { AuthContext, useAuthState } from '../../hooks/useAuth';
import Spinner from './ui/Spinner';

/** Inner component — reads auth state from context */
function ProtectedContent() {
  const location = useLocation();
  const { session, loading, isAdmin, profile, signOut } = React.useContext(AuthContext);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F4F6F8] flex items-center justify-center">
        <div className="text-center space-y-3">
          <Spinner size="lg" />
          <p className="text-sm text-[#6B7A8D]">Verifying session…</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <Navigate
        to="/admin/login"
        state={{ from: location.pathname }}
        replace
      />
    );
  }

  // Signed in, but not an active admin: every write would be rejected by RLS,
  // so say so plainly instead of showing a CMS that silently fails.
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#F4F6F8] flex items-center justify-center px-4">
        <div className="max-w-md bg-white rounded-xl border border-[#DDE3EA] p-6 space-y-3 text-sm text-[#1A2B40]" role="alert">
          <h1 className="text-lg font-bold text-[#1B365D]">CMS access not enabled</h1>
          <p>
            You are signed in as <strong>{session.user.email}</strong>, but this account is not an active CMS admin
            {profile ? ` (role: ${profile.role}${profile.is_active ? '' : ', inactive'})` : ' (no profile found)'}.
          </p>
          <p className="text-[#6B7A8D]">
            An administrator must set this account's role to <code>admin</code> in the Supabase <code>profiles</code> table
            (see <code>supabase/seed/01_admin_setup.sql</code>).
          </p>
          <button type="button" onClick={() => { void signOut(); }} className="text-[#4A777A] font-medium hover:underline">
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <AdminLayout>
      <Outlet />
    </AdminLayout>
  );
}

/**
 * ProtectedRoute wraps protected content in AuthProvider so that
 * the useAuth hook is available everywhere inside /admin/*.
 */
export default function ProtectedRoute() {
  const authState = useAuthState();
  return (
    <AuthContext.Provider value={authState}>
      <ProtectedContent />
    </AuthContext.Provider>
  );
}
