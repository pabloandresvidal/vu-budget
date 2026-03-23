import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('vu_user');
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('vu_token');
    if (token) {
      api.getMe()
        .then(u => {
          setUser(u);
          localStorage.setItem('vu_user', JSON.stringify(u));
        })
        .catch(() => {
          localStorage.removeItem('vu_token');
          localStorage.removeItem('vu_user');
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (username, password) => {
    const data = await api.login(username, password);
    localStorage.setItem('vu_token', data.token);
    localStorage.setItem('vu_user', JSON.stringify(data.user));
    setUser(data.user);
    return data;
  };

  const register = async (username, password, displayName) => {
    const data = await api.register(username, password, displayName);
    localStorage.setItem('vu_token', data.token);
    localStorage.setItem('vu_user', JSON.stringify(data.user));
    setUser(data.user);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('vu_token');
    localStorage.removeItem('vu_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
