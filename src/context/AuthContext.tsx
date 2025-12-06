import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { User, AuthContextType } from '@/types';
import { authAPI } from '../services/api';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const fetchedRef = useRef(false);

  useEffect(() => {
    // Prevent double fetch in React StrictMode
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    
    fetchCurrentUser(); // na mount-u pokušaj dohvat korisnika iz cookie-based sesije
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const response = await authAPI.getUser();
      setUser(response?.user || null);
    } catch (error: any) {
      // 401 je očekivano kada korisnik nije ulogovan - nije prava greška
      if (error?.response?.status !== 401) {
        console.error('Error fetching user:', error);
      }
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<User | null> => {
    try {
      await authAPI.getCSRF();

      const userData = await authAPI.login(email, password);
      setUser(userData.user);
      
      return userData.user;
    } catch (error: any) {
      console.error('❌ Login error:', error);
      // Re-throw error so components can handle email_not_verified case
      throw error;
    }
  };

  const register = async (userData: Partial<User>, password: string): Promise<boolean> => {
    setLoading(true);
    try {
      await authAPI.getCSRF();

      await authAPI.register(userData, password);
      // NE dohvatamo usera - korisnik mora prvo verificirati email
      // await fetchCurrentUser();
      return true;
    } catch (error) {
      console.error('Registration error:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
    }
  };

  const updateUser = async (updates: Partial<User>): Promise<boolean> => {
    try {
      const { user: updated } = await authAPI.updateProfile(updates);
      setUser(updated);
      return true;
    } catch (error) {
      console.error('Update user error:', error);
      return false;
    }
  };

  const refreshUser = async (): Promise<void> => {
    try {
      const response = await authAPI.getUser();
      setUser(response?.user || null);
    } catch (error: any) {
      if (error?.response?.status !== 401) {
        console.error('Error refreshing user:', error);
      }
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading, updateUser, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
