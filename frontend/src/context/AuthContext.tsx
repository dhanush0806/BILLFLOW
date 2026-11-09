import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Business } from '../types';
import { BusinessAPI } from '../services/endpoints';

interface AuthContextType {
  user: User | null;
  business: Business | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, user: User, business: Business) => void;
  logout: () => void;
  updateBusiness: (updated: Partial<Business>) => void;
  refreshBusinessProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('billflow_token');
    const savedUser = localStorage.getItem('billflow_user');
    const savedBusiness = localStorage.getItem('billflow_business');

    if (savedToken && savedUser && savedBusiness) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
        setBusiness(JSON.parse(savedBusiness));
      } catch (e) {
        localStorage.clear();
      }
    }
    setIsLoading(false);
  }, []);

  const login = (newToken: string, newUser: User, newBusiness: Business) => {
    localStorage.setItem('billflow_token', newToken);
    localStorage.setItem('billflow_user', JSON.stringify(newUser));
    localStorage.setItem('billflow_business', JSON.stringify(newBusiness));
    setToken(newToken);
    setUser(newUser);
    setBusiness(newBusiness);
  };

  const logout = () => {
    localStorage.removeItem('billflow_token');
    localStorage.removeItem('billflow_user');
    localStorage.removeItem('billflow_business');
    setToken(null);
    setUser(null);
    setBusiness(null);
  };

  const updateBusiness = (updated: Partial<Business>) => {
    if (business) {
      const merged = { ...business, ...updated };
      setBusiness(merged);
      localStorage.setItem('billflow_business', JSON.stringify(merged));
    }
  };

  const refreshBusinessProfile = async () => {
    if (token && user?.role === 'admin') {
      try {
        const res = await BusinessAPI.getProfile();
        if (res.data?.data?.business) {
          setBusiness(res.data.data.business);
          localStorage.setItem('billflow_business', JSON.stringify(res.data.data.business));
        }
      } catch (err) {
        console.error('Failed to refresh business profile', err);
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        business,
        token,
        isLoading,
        login,
        logout,
        updateBusiness,
        refreshBusinessProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
