import axios from 'axios';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Dynamically discover host IP from Metro connection (e.g. 192.168.1.35)
const metroIp = Constants?.expoConfig?.hostUri?.split(':')[0] || '192.168.1.35';
// Live production cloud API on paid VPS
const CLOUD_API_URL = 'https://api-task-pilot.deificglobal.tech/api';

// By default, connect to live production cloud backend.
// If EXPO_PUBLIC_API_URL is explicitly set, prioritize that.
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || CLOUD_API_URL;

console.log(`[API CLIENT] Active backend URL: ${API_BASE_URL}`);

export const USE_MOCK_API = process.env.EXPO_PUBLIC_DATA_MODE === 'mock';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000, // 60s to accommodate Render free-tier cold starts
  headers: {
    'Content-Type': 'application/json',
  },
});

let authToken: string | null = null;

export const setAuthHeader = (token: string | null) => {
  authToken = token;
  if (token) {
    apiClient.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete apiClient.defaults.headers.common.Authorization;
  }
};

apiClient.interceptors.request.use((config) => {
  if (authToken && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    // 401 Unauthorized: automatically log out invalid session
    if (error.response?.status === 401) {
      try {
        const { useAppStore } = require('../store');
        useAppStore.getState().logout();
      } catch (e) {
        // ignore
      }
    }

    // 402 Payment Required: triggers the subscription paywall immediately
    if (error.response?.status === 402) {
      try {
        const { useAppStore } = require('../store');
        useAppStore.getState().setPaywallVisible(true);
      } catch (e) {
        // ignore
      }
    }

    let message = error.message;
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      message = 'Server shuru ho raha hai (waking up). Kripya 5 second baad dobara tap karein. (Server is waking up, please retry in a few seconds.)';
    } else if (error.message?.includes('Network Error') || !error.response) {
      message = 'Server se connect hone me samasya aayi. Kripya apna internet check karein ya thodi der me dobara try karein.';
    }

    const errorData = error.response?.data || {
      success: false,
      message: message || 'Kuch problem ho gayi. Please try again.',
      error: error.response?.data?.error || message,
    };
    return Promise.reject(errorData);
  }
);
