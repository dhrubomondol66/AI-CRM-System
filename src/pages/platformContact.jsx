import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';

const api = axios.create({
  baseURL: import.meta?.env?.VITE_API_BASE_URL || 'https://reservation-xynh.onrender.com',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = Cookies.get('access_token') || localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const DEFAULT_CONTACT = {
  contact_phone: '+1 (555) 123-4567',
  contact_email: 'support@reservenow.com',
  contact_address: '123 Business Ave, Suite 100\nNew York, NY 10001',
};

const PlatformContactContext = createContext({
  platformContact: DEFAULT_CONTACT,
  setPlatformContact: () => {},
  refreshPlatformContact: () => {},
});

export const PlatformContactProvider = ({ children }) => {
  const [platformContact, setPlatformContact] = useState(DEFAULT_CONTACT);

  const fetchPlatformContact = async () => {
    try {
      const res = await api.get('/api/v1/public/platform-contact');
      const data = res.data || {};
      setPlatformContact({
        contact_phone: data.contact_phone || DEFAULT_CONTACT.contact_phone,
        contact_email: data.contact_email || DEFAULT_CONTACT.contact_email,
        contact_address: data.contact_address || DEFAULT_CONTACT.contact_address,
      });
    } catch {
      // Fall back to defaults silently
    }
  };

  useEffect(() => {
    fetchPlatformContact();
  }, []);

  return (
    <PlatformContactContext.Provider value={{ platformContact, setPlatformContact, refreshPlatformContact: fetchPlatformContact }}>
      {children}
    </PlatformContactContext.Provider>
  );
};

export const usePlatform = () => useContext(PlatformContactContext);

export default PlatformContactContext;