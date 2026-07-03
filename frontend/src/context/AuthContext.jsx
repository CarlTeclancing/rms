import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { endpoints } from '../services/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem('rms_token'));
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('rms_user');
    return saved ? JSON.parse(saved) : null;
  });

  const login = async (credentials) => {
    const { data } = await endpoints.login(credentials);
    localStorage.setItem('rms_token', data.token);
    localStorage.setItem('rms_user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem('rms_token');
    localStorage.removeItem('rms_user');
    setToken(null);
    setUser(null);
  };

  useEffect(() => {
    window.addEventListener('rms:auth-expired', logout);
    return () => window.removeEventListener('rms:auth-expired', logout);
  }, []);

  const value = useMemo(() => ({ token, user, login, logout, isAuthenticated: Boolean(token) }), [token, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
