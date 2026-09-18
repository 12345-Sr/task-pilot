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
  Alert,
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
  { code: 'en', native: 'English', label: 'English' },
  { code: 'hi', native: 'Hinglish', label: 'Hinglish' },
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
  const [googleErrorMsg, setGoogleErrorMsg] = useState('');

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
          const rawErr =
            err?.error ||
            err?.message ||
            err?.response?.data?.error ||
            err?.response?.data?.message ||
            t(language, 'login_failed');
          setErrorMsg(rawErr);
          if (rawErr.toLowerCase().includes('invalid email or password') || rawErr.toLowerCase().includes('not found')) {
            Alert.alert(
              language === 'hi' ? 'Account Nahi Mila' : 'Account Not Found',
              language === 'hi'
                ? `Is email (${email.trim()}) se account nahi mila ya password galat hai. Kya aap Naya Account banana chahte hain?`
                : `No account found for ${email.trim()} or password incorrect. Would you like to create a new account?`,
              [
                { text: language === 'hi' ? 'Dobara Check Karein' : 'Try Again', style: 'cancel' },
                {
                  text: language === 'hi' ? 'Naya Account Banayein' : 'Sign Up Now',
                  onPress: () => navigation.navigate('Signup', { email: email.trim() }),
                },
              ]
            );
          }
        },
      }
    );
  };

  const handleGoogleLogin = async () => {
    setErrorMsg('');
    setGoogleErrorMsg('');
    setIsGoogleLoading(true);
    try {
      const res = await signInWithGoogle();
      if (res.success) {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Main' }],
        });
      } else {
        const msg = res.error || 'Google sign-in could not be completed.';
        setGoogleErrorMsg(msg);
        Alert.alert(
          language === 'hi' ? 'Google Sign-In Soochna' : 'Google Sign-In Notice',
          msg,
          [
            { text: 'OK', style: 'cancel' },
            {
              text: language === 'hi' ? 'Email se Sign Up karein' : 'Sign Up with Email',
              onPress: () => navigation.navigate('Signup'),
            },
          ]
        );
      }
    } catch (err: any) {
      const msg = err?.message || 'Google sign-in failed';
      setGoogleErrorMsg(msg);
      Alert.alert(
        'Google Sign-In',
        msg,
        [
          { text: 'OK', style: 'cancel' },
          {
            text: language === 'hi' ? 'Email se Sign Up karein' : 'Sign Up with Email',
            onPress: () => navigation.navigate('Signup'),
          },
        ]
      );
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
          {/* Top Brand & Language Row */}
          <View style={styles.topBrandRow}>
            <View style={styles.brandTitleWrap}>
              <BrandLogo size={28} showSun={true} />
              <Text style={styles.brandTitle}>
                <Text style={{ color: '#0F172A' }}>Task</Text>
                <Text style={{ color: '#EAB308' }}>Alert</Text>
              </Text>
            </View>

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

          {/* Compact Header */}
          <View style={styles.header}>
            <Text style={styles.mainTitle}>
              {language === 'hi' ? 'Aapka Reminder Saathi' : 'Your Reminder Companion'}
            </Text>
            <Text style={styles.subTitle}>
              {language === 'hi' ? 'Kal ka kaam, aaj set karein.' : 'Set tomorrow\'s tasks today.'}
            </Text>
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
                <Text style={styles.inputLeadingIcon}>✉️</Text>
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
                <Text style={styles.fieldLabel} numberOfLines={1}>
                  {t(language, 'password_label')}
                </Text>
                <TouchableOpacity
                  style={styles.forgotBtn}
                  onPress={() =>
                    navigation.navigate('ForgotPassword', { email: email.trim() })
                  }
                >
                  <Text style={styles.forgotLink} numberOfLines={1}>
                    {t(language, 'forgot_password')}
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={styles.inputWrapper}>
                <Text style={styles.inputLeadingIcon}>🔒</Text>
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

            {googleErrorMsg ? (
              <View style={styles.googleErrorBox}>
                <Text style={styles.googleErrorText}>⚠️ {googleErrorMsg}</Text>
              </View>
            ) : null}
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
    paddingHorizontal: 16,
    paddingTop: 4,
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  topBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  brandTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  header: {
    marginBottom: 10,
  },
  mainTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
    letterSpacing: -0.3,
  },
  subTitle: {
    fontSize: 12.5,
    color: '#64748B',
    marginBottom: 0,
  },
  langPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: radius.pill,
    paddingVertical: 5,
    paddingHorizontal: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  langPillIcon: {
    fontSize: 13,
    marginRight: 4,
  },
  langPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
    marginRight: 4,
  },
  langPillArrow: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  cardHeading: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 10,
  },
  errorBox: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 8,
    padding: 8,
    marginBottom: 10,
  },
  errorText: {
    fontSize: 12,
    color: '#B91C1C',
    fontWeight: '500',
  },
  fieldGroup: {
    marginBottom: 10,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 4,
    flex: 1,
  },
  passwordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  forgotBtn: {
    flexShrink: 0,
  },
  forgotLink: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.primary,
  },
  inputLeadingIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.4,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    height: 48,
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 4,
    fontSize: 14.5,
    fontWeight: '600',
    color: '#0F172A',
  },
  eyeBtn: {
    position: 'absolute',
    right: 10,
    padding: 6,
  },
  eyeIcon: {
    fontSize: 16,
  },
  trustBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 10,
  },
  trustBadgeIcon: {
    fontSize: 13,
    marginRight: 5,
  },
  trustBadgeText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  primaryButton: {
    backgroundColor: colors.primary,
    height: 48,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.24,
    shadowRadius: 6,
    elevation: 3,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    paddingHorizontal: 10,
    fontSize: 11.5,
    color: '#94A3B8',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  footerText: {
    fontSize: 13,
    color: '#64748B',
  },
  footerLink: {
    fontSize: 13,
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
  googleErrorBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
  },
  googleErrorText: {
    color: '#DC2626',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
});

export default LoginScreen;


