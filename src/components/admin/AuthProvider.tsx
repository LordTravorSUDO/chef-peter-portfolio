/**
 * AuthProvider — wraps all /admin routes with auth context.
 *
 * Must be rendered outside ProtectedRoute so that AdminLoginPage can also
 * read auth state. Placed at the top of the /admin route subtree.
 */

import React from 'react';
import { AuthContext, useAuthState } from '../../hooks/useAuth';

interface Props { children: React.ReactNode; }

export default function AuthProvider({ children }: Props) {
  const authState = useAuthState();
  return (
    <AuthContext.Provider value={authState}>
      {children}
    </AuthContext.Provider>
  );
}
