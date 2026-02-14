import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [sessionId, setSessionId] = useState(localStorage.getItem('sessionId'));
  const [loading, setLoading] = useState(true);

  const API_URL = 'http://localhost:5000/api/auth';

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('sessionId');
    localStorage.removeItem('expiresAt');
    setToken(null);
    setSessionId(null);
    setUser(null);
    toast.success('Logged out successfully');
  }, []);

  const fetchUserProfile = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await axios.get(`${API_URL}/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setUser(response.data.user);
    } catch (error) {
      console.error('Error fetching profile:', error);
      logout();
    } finally {
      setLoading(false);
    }
  }, [token, logout, API_URL]);

  useEffect(() => {
    fetchUserProfile();
  }, [fetchUserProfile]);

  const register = async (username, email, password) => {
    try {
      const response = await axios.post(`${API_URL}/register`, {
        username,
        email,
        password,
      });
      
      const { token: newToken, user: newUser, sessionId: newSessionId, expiresAt } = response.data;
      localStorage.setItem('token', newToken);
      localStorage.setItem('sessionId', newSessionId);
      localStorage.setItem('expiresAt', expiresAt);
      setToken(newToken);
      setSessionId(newSessionId);
      setUser(newUser);
      toast.success('Registration successful!');
      return { success: true };
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Registration failed';
      toast.error(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  const login = async (email, password) => {
    try {
      const response = await axios.post(`${API_URL}/login`, {
        email,
        password,
      });
      
      const { token: newToken, user: newUser, sessionId: newSessionId, expiresAt } = response.data;
      localStorage.setItem('token', newToken);
      localStorage.setItem('sessionId', newSessionId);
      localStorage.setItem('expiresAt', expiresAt);
      setToken(newToken);
      setSessionId(newSessionId);
      setUser(newUser);
      toast.success('Login successful!');
      return { success: true };
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Login failed';
      toast.error(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  const value = {
    user,
    token,
    sessionId,
    loading,
    register,
    login,
    logout,
    isAuthenticated: !!token && !!user,
  };
  

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
