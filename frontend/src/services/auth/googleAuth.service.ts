import { apiClient } from '../../api/client';
import { useAppStore } from '../../store';

let GoogleSignin: any = null;
let statusCodes: any = {};

try {
  const gSignModule = require('@react-native-google-signin/google-signin');
  GoogleSignin = gSignModule.GoogleSignin;
  statusCodes = gSignModule.statusCodes || {};
} catch (e) {
  console.log('[GOOGLE SIGNIN] Native module not present in this environment (e.g. Expo Go).');
}

let isConfigured = false;

export const configureGoogleSignIn = () => {
  if (isConfigured || !GoogleSignin) return;
  try {
    const webClientId =
      (process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '').trim() ||
      '451260814957-ij9r529r75q3vv1safphprvnghhkrth1.apps.googleusercontent.com';
    const config: any = {
      scopes: ['email', 'profile'],
      webClientId,
      offlineAccess: false,
    };
    GoogleSignin.configure(config);
    isConfigured = true;
    console.log('[GOOGLE SIGNIN] Configured with webClientId (offlineAccess=false):', webClientId);
  } catch (err) {
    console.warn('[GOOGLE SIGNIN] Configuration notice:', err);
  }
};

export const signInWithGoogle = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    if (!GoogleSignin) {
      return {
        success: false,
        error: 'Google Sign-In requires the installed TaskPilot APK (not supported inside Expo Go).',
      };
    }

    configureGoogleSignIn();
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

    const response = await GoogleSignin.signIn();

    // Check v16 response types
    if (response?.type === 'cancelled') {
      return { success: false, error: 'Google sign-in was cancelled.' };
    }
    if (response?.type === 'noSavedCredentialFound') {
      return { success: false, error: 'No saved Google credentials found on this device.' };
    }

    const data = (response as any)?.data || response;
    const user = data?.user || data;
    const idToken = data?.idToken;

    const email = user?.email;
    const name = user?.name || user?.givenName;
    const photoUrl = user?.photo;
    const googleId = user?.id;

    if (!email && !idToken) {
      return {
        success: false,
        error:
          'Could not retrieve Google account details. Please ensure Google Play Services is active or sign in with Email & Password.',
      };
    }

    // Call backend API
    const res: any = await apiClient.post('/auth/google', {
      idToken,
      email,
      name,
      photoUrl,
      googleId,
    });

    const { token, user: appUser, isPremium, subscription } = res?.data || res;
    if (token) {
      const store = useAppStore.getState();
      store.setToken(token);
      store.setUser(appUser);
      store.setIsPremium(Boolean(isPremium || subscription?.status === 'active' || appUser?.isPremium));
      if (appUser?.language) {
        store.setLanguage(appUser.language);
      }
      return { success: true };
    }

    return { success: false, error: 'Could not obtain session from server.' };
  } catch (error: any) {
    console.warn('[GOOGLE SIGNIN ERROR]', error);

    const errCode = String(error?.code || '');
    const errMsg = String(error?.message || '');

    // Google Play Services Developer Error (code 10): missing SHA-1 or Web Client ID in Firebase
    if (errCode === '10' || errMsg.includes('DEVELOPER_ERROR') || errMsg.includes('10')) {
      return {
        success: false,
        error:
          'Firebase Google Sign-In setup required: Release SHA-1 (4A:72:CC:30:F9:8E:AA:EC:48:21:C3:C1:AD:7E:E8:9A:5C:68:C7:C0) must be added in Firebase Console for package com.taskpilot.app. Please use Email & Password to sign in now.',
      };
    }

    if (statusCodes && (error.code === statusCodes.SIGN_IN_CANCELLED || errCode === '12501')) {
      return { success: false, error: 'Google sign-in was cancelled.' };
    } else if (statusCodes && error.code === statusCodes.IN_PROGRESS) {
      return { success: false, error: 'Google sign-in is in progress.' };
    } else if (statusCodes && error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      return { success: false, error: 'Google Play Services is not available on this device.' };
    }

    return {
      success: false,
      error:
        error?.response?.data?.error ||
        error?.message ||
        'Google sign-in failed. Please try again or use Email & Password.',
    };
  }
};
