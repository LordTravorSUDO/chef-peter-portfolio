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
  const { session, loading } = React.useContext(AuthContext);

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
