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
    GoogleSignin.configure({
      scopes: ['email', 'profile'],
      offlineAccess: true,
      forceCodeForRefreshToken: false,
    });
    isConfigured = true;
  } catch (err) {
    console.warn('[GOOGLE SIGNIN] Configuration notice:', err);
  }
};

export const signInWithGoogle = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    if (!GoogleSignin) {
      return {
        success: false,
        error: 'Google Sign-In requires the installed TaskPilot APK (not supported in Expo Go).',
      };
    }

    configureGoogleSignIn();
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

    try {
      await GoogleSignin.signOut();
    } catch {}

    const response = await GoogleSignin.signIn();
    const user = (response as any)?.data?.user || (response as any)?.user || response;
    const idToken = (response as any)?.data?.idToken || (response as any)?.idToken;

    const email = user?.email;
    const name = user?.name || user?.givenName;
    const photoUrl = user?.photo;
    const googleId = user?.id;

    if (!email && !idToken) {
      return { success: false, error: 'Google account sign-in returned no email.' };
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
    if (statusCodes && error.code === statusCodes.SIGN_IN_CANCELLED) {
      return { success: false, error: 'Google sign-in cancelled' };
    } else if (statusCodes && error.code === statusCodes.IN_PROGRESS) {
      return { success: false, error: 'Google sign-in in progress' };
    } else if (statusCodes && error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      return { success: false, error: 'Google Play Services is not available on this device' };
    }
    console.warn('[GOOGLE SIGNIN ERROR]', error);
    return {
      success: false,
      error: error?.response?.data?.error || error?.message || 'Google sign-in failed. Please try again.',
    };
  }
};
