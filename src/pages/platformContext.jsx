import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';

const api = axios.create({
  baseURL: import.meta?.env?.VITE_API_BASE_URL || '/',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = Cookies.get('access_token') || localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const PlatformContext = createContext({
  platformName: 'AI Reservation & CRM System',
  setPlatformName: () => {},
});

export const PlatformProvider = ({ children }) => {
  const [platformName, setPlatformName] = useState('AI Reservation & CRM System');

  useEffect(() => {
    const fetchPlatformName = async () => {
      try {
        const res = await api.get('/api/v1/public/platform-name');
        const name =
          res.data?.platform_name ??
          res.data?.name ??
          res.data?.data?.platform_name;
        if (name) setPlatformName(name);
      } catch {
        // Silently fall back to default if fetch fails
      }
    };
    fetchPlatformName();
  }, []);

  return (
    <PlatformContext.Provider value={{ platformName, setPlatformName }}>
      {children}
    </PlatformContext.Provider>
  );
};

export const usePlatform = () => useContext(PlatformContext);

export default PlatformContext;