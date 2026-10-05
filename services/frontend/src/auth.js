import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import apiClient, { TOKEN_KEY, LOGOUT_EVENT } from './services/apiService';

const AuthContext = createContext(null);
const RETURN_TO_KEY = 'postLoginPath';

// Only same-site absolute paths are allowed as post-login targets (no open redirects).
const safePath = (p) => (typeof p === 'string' && p.startsWith('/') && !p.startsWith('//') ? p : '/');

export const rememberReturnTo = (path) => {
  try { sessionStorage.setItem(RETURN_TO_KEY, safePath(path)); } catch (e) { /* storage unavailable */ }
};
export const takeReturnTo = () => {
  try {
    const p = sessionStorage.getItem(RETURN_TO_KEY);
    sessionStorage.removeItem(RETURN_TO_KEY);
    return safePath(p);
  } catch (e) { return '/'; }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!localStorage.getItem(TOKEN_KEY));

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  }, []);

  const loadUser = useCallback(async () => {
    const res = await apiClient.get('/auth/me');
    setUser(res.data.user);
  }, []);

  useEffect(() => {
    if (!localStorage.getItem(TOKEN_KEY)) return undefined;
    let cancelled = false;
    loadUser()
      .catch(() => { if (!cancelled) logout(); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [loadUser, logout]);

  useEffect(() => {
    window.addEventListener(LOGOUT_EVENT, logout);
    return () => window.removeEventListener(LOGOUT_EVENT, logout);
  }, [logout]);

  // Called by the OAuth callback page with the token GitHub sign-in produced.
  const completeLogin = useCallback(async (token) => {
    localStorage.setItem(TOKEN_KEY, token);
    try {
      await loadUser();
    } catch (e) {
      logout();
      throw e;
    }
  }, [loadUser, logout]);

  return (
    <AuthContext.Provider value={{ user, loading, completeLogin, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

export const RequireAuth = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return children;
};
