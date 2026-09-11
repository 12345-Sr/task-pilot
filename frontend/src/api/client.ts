import axios from 'axios';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Dynamically discover host IP from Metro connection (e.g. 192.168.1.35)
const metroIp = Constants?.expoConfig?.hostUri?.split(':')[0] || '192.168.1.35';
const CLOUD_API_URL = 'https://task-pilot-wf3g.onrender.com/api';

// In local development (__DEV__), route to the active local backend on port 4000
// where newly added endpoints and Gmail SMTP OTP are running!
const localUrl = Platform.OS === 'web'
  ? 'http://localhost:4000/api'
  : `http://${metroIp}:4000/api`;

export const API_BASE_URL = __DEV__
  ? (process.env.EXPO_PUBLIC_API_URL && !process.env.EXPO_PUBLIC_API_URL.includes('onrender.com') ? process.env.EXPO_PUBLIC_API_URL : localUrl)
  : (process.env.EXPO_PUBLIC_API_URL || CLOUD_API_URL);

console.log(`[API CLIENT] Active backend URL: ${API_BASE_URL}`);

export const USE_MOCK_API = process.env.EXPO_PUBLIC_DATA_MODE === 'mock';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 35000,
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
      message = 'Server waking up or taking longer to respond. Please try again in a moment.';
    }

    const errorData = error.response?.data || {
      success: false,
      message: message || 'Kuch problem ho gayi. Please try again.',
      error: error.response?.data?.error || message,
    };
    return Promise.reject(errorData);
  }
);
