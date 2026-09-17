import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import { useAppStore } from '../store';
import { t } from '../i18n';
import BrandLogo from '../components/BrandLogo';
import { useLogin } from '../hooks';
import { GoogleSignInButton } from '../components/GoogleSignInButton';
import { signInWithGoogle } from '../services/auth/googleAuth.service';

const LANGUAGES = [
  { code: 'hi', native: 'Hinglish', label: 'Hinglish' },
  { code: 'en', native: 'English', label: 'English' },
  { code: 'mr', native: 'मराठी', label: 'Marathi' },
  { code: 'bn', native: 'বাংলা', label: 'Bengali' },
  { code: 'ta', native: 'தமிழ்', label: 'Tamil' },
  { code: 'te', native: 'తెలుగు', label: 'Telugu' },
  { code: 'gu', native: 'ગુજરાતી', label: 'Gujarati' },
  { code: 'pa', native: 'ਪੰਜਾਬੀ', label: 'Punjabi' },
];

export const LoginScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { language, setLanguage } = useAppStore();
  const loginMutation = useLogin();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showLangModal, setShowLangModal] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const currentLangObj = LANGUAGES.find((l) => l.code === language) || LANGUAGES[0];

  const handleLogin = () => {
    setErrorMsg('');
    if (!email.trim() || !email.includes('@')) {
      setErrorMsg(t(language, 'enter_email_error'));
      return;
    }
    if (!password) {
      setErrorMsg(t(language, 'enter_password_error'));
      return;
    }

    loginMutation.mutate(
      { email: email.trim(), password },
      {
        onSuccess: () => {
          navigation.reset({
            index: 0,
            routes: [{ name: 'Main' }],
          });
        },
        onError: (err: any) => {
          setErrorMsg(
            err?.error ||
              err?.message ||
              err?.response?.data?.error ||
              err?.response?.data?.message ||
              t(language, 'login_failed')
          );
        },
      }
    );
  };

  const handleGoogleLogin = async () => {
    setErrorMsg('');
    setIsGoogleLoading(true);
    try {
      const res = await signInWithGoogle();
      if (res.success) {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Main' }],
        });
      } else if (res.error && !res.error.toLowerCase().includes('cancel')) {
        setErrorMsg(res.error);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Google sign-in failed');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={[
            styles.container,
            { paddingBottom: Math.max(insets.bottom, 24) + 20 },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          {/* Top Brand Banner matching Panel 6 */}
          <View style={styles.topBrandRow}>
            <BrandLogo size={32} showSun={true} />
            <Text style={styles.brandTitle}>
              <Text style={{ color: '#0F172A' }}>Task</Text>
              <Text style={{ color: '#EAB308' }}>Pilot</Text>
            </Text>
          </View>

          {/* Big Header */}
          <View style={styles.header}>
            <Text style={styles.mainTitle}>
              {language === 'hi' ? 'Aapka Reminder Saathi' : 'Your Reminder Companion'}
            </Text>
            <Text style={styles.subTitle}>
              {language === 'hi' ? 'Kal ka kaam, aaj set karein.' : 'Set tomorrow\'s tasks today.'}
            </Text>

            {/* Language Selector Pill */}
            <TouchableOpacity
              style={styles.langPill}
              onPress={() => setShowLangModal(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.langPillIcon}>🌐</Text>
              <Text style={styles.langPillText}>{currentLangObj.native}</Text>
              <Text style={styles.langPillArrow}>⌵</Text>
            </TouchableOpacity>
          </View>

          {/* Floating White Card */}
          <View style={styles.card}>
            <Text style={styles.cardHeading}>
              {language === 'hi' ? 'Login Karein' : 'Sign In'}
            </Text>

            {errorMsg ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>⚠️ {errorMsg}</Text>
              </View>
            ) : null}

            {/* Email Field */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>{t(language, 'email_label')}</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="you@example.com"
                  placeholderTextColor="#94A3B8"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Password Field */}
            <View style={styles.fieldGroup}>
              <View style={styles.passwordHeader}>
                <Text style={styles.fieldLabel}>{t(language, 'password_label')}</Text>
                <TouchableOpacity
                  onPress={() =>
                    navigation.navigate('ForgotPassword', { email: email.trim() })
                  }
                >
                  <Text style={styles.forgotLink}>{t(language, 'forgot_password')}</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={[styles.input, { paddingRight: 44 }]}
                  placeholder="••••••••"
                  placeholderTextColor="#94A3B8"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Text style={styles.eyeIcon}>{showPassword ? '👁️' : '🔒'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 3-Day Free Trial Trust Row */}
            <View style={styles.trustBadgeRow}>
              <Text style={styles.trustBadgeIcon}>🪙</Text>
              <Text style={styles.trustBadgeText}>
                {language === 'hi'
                  ? '3 din ka free trial · No credit card required'
                  : '3-day free trial · No credit card required'}
              </Text>
            </View>

            {/* Golden Primary CTA Button */}
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleLogin}
              disabled={loginMutation.isPending}
              activeOpacity={0.88}
            >
              {loginMutation.isPending ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  {language === 'hi' ? 'Login Karein' : 'Sign In'}
                </Text>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>{language === 'hi' ? 'ya' : 'or'}</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Google Sign In Button */}
            <GoogleSignInButton
              onPress={handleGoogleLogin}
              loading={isGoogleLoading}
              text={language === 'hi' ? 'Google se Sign In karein' : 'Continue with Google'}
            />
          </View>

          {/* Bottom Switcher */}
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>
              {language === 'hi' ? 'Naya account banayein? ' : "Don't have an account? "}
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
              <Text style={styles.footerLink}>
                {language === 'hi' ? 'Sign up' : 'Sign up'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Language Selection Modal */}
      <Modal visible={showLangModal} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowLangModal(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {language === 'hi' ? 'Bhasha Chunein' : 'Select Language'}
              </Text>
              <TouchableOpacity onPress={() => setShowLangModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            {LANGUAGES.map((item) => {
              const selected = language === item.code;
              return (
                <TouchableOpacity
                  key={item.code}
                  style={[styles.langModalItem, selected && styles.langModalItemSelected]}
                  onPress={() => {
                    setLanguage(item.code as any);
                    setShowLangModal(false);
                  }}
                >
                  <View style={styles.langModalItemLeft}>
                    <Text style={styles.langItemNative}>{item.native}</Text>
                    <Text style={styles.langItemLabel}>{item.label}</Text>
                  </View>
                  <View style={[styles.radioCircle, selected && styles.radioCircleActive]}>
                    {selected && <View style={styles.radioInner} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#EDF2F4',
  },
  container: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  topBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginLeft: 8,
    letterSpacing: 0.5,
  },
  header: {
    marginBottom: 20,
  },
  mainTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  subTitle: {
    fontSize: 15,
    color: '#64748B',
    marginBottom: 14,
  },
  langPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    paddingVertical: 7,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  langPillIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  langPillText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    marginRight: 6,
  },
  langPillArrow: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 22,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 18,
    elevation: 3,
  },
  cardHeading: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 18,
  },
  errorBox: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
  },
  errorText: {
    fontSize: 13,
    color: '#B91C1C',
    fontWeight: '500',
  },
  fieldGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  passwordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  forgotLink: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    borderRadius: 12,
  },
  input: {
    flex: 1,
    height: 48,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#0F172A',
  },
  eyeBtn: {
    position: 'absolute',
    right: 12,
    padding: 6,
  },
  eyeIcon: {
    fontSize: 16,
  },
  trustBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 20,
  },
  trustBadgeIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  trustBadgeText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  primaryButton: {
    backgroundColor: colors.primary,
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 4,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    paddingHorizontal: 12,
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 22,
  },
  footerText: {
    fontSize: 14,
    color: '#64748B',
  },
  footerLink: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalClose: {
    fontSize: 18,
    color: '#94A3B8',
    fontWeight: '600',
    padding: 4,
  },
  langModalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginVertical: 2,
  },
  langModalItemSelected: {
    backgroundColor: '#FFFBEB',
  },
  langModalItemLeft: {
    flexDirection: 'column',
  },
  langItemNative: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  langItemLabel: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleActive: {
    borderColor: colors.primary,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
});

export default LoginScreen;


