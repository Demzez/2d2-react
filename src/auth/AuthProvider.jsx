import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { clearSession, endpoints, getSession, saveSession } from '../lib/api';

const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [authenticated, setAuthenticated] = useState(() => Boolean(getSession()));
  const queryClient = useQueryClient();
  useEffect(() => {
    const onChange = () => {
      const present = Boolean(getSession());
      setAuthenticated(present);
      if (!present) queryClient.clear();
    };
    window.addEventListener('2d2-session-updated', onChange);
    return () => window.removeEventListener('2d2-session-updated', onChange);
  }, [queryClient]);
  const authorize = useCallback((tokens) => { saveSession(tokens); queryClient.clear(); }, [queryClient]);
  const login = useCallback(async (loginValue, password) => authorize(await endpoints.auth.login(loginValue, password)), [authorize]);
  const verifyOtp = useCallback(async (phone, code) => authorize(await endpoints.auth.verifyOtp(phone, code)), [authorize]);
  const register = useCallback(async (data) => authorize(await endpoints.auth.register(data)), [authorize]);
  const logout = useCallback(async () => {
    const refresh = getSession()?.refresh_token;
    try { if (refresh) await endpoints.auth.logout(refresh); }
    finally { clearSession(); queryClient.clear(); }
  }, [queryClient]);
  return <AuthContext.Provider value={{ authenticated, login, verifyOtp, register, logout }}>{children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);
