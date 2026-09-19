import React, { useState, useEffect } from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import { useAppStore } from '../store';
import { t } from '../i18n';
import BrandLogo from '../components/BrandLogo';
import { useRegister, useSendRegisterOtp } from '../hooks';
import RobotCaptcha from '../components/RobotCaptcha';
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

export const SignupScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { language, setLanguage } = useAppStore();
  const registerMutation = useRegister();
  const sendOtpMutation = useSendRegisterOtp();

  const [name, setName] = useState('');
  const [email, setEmail] = useState((route?.params?.email || route?.params?.prefillEmail || '').trim());
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isCaptchaVerified, setIsCaptchaVerified] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showLangModal, setShowLangModal] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [googleErrorMsg, setGoogleErrorMsg] = useState('');

  // OTP Countdown Timer
  useEffect(() => {
    let timer: any;
    if (otpCountdown > 0) {
      timer = setTimeout(() => {
        setOtpCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearTimeout(timer);
  }, [otpCountdown]);

  const currentLangObj = LANGUAGES.find((l) => l.code === language) || LANGUAGES[0];

  const handleSendOtp = () => {
    setErrorMsg('');
    setSuccessMsg('');
    if (!email.trim() || !email.includes('@')) {
      setErrorMsg(language === 'hi' ? 'Kripya sahi email address darj karein' : 'Please enter a valid email address');
      return;
    }

    sendOtpMutation.mutate(
      { email: email.trim().toLowerCase() },
      {
        onSuccess: (data: any) => {
          setOtpSent(true);
          setOtpCountdown(60);
          if (data?.devOtp) {
            setOtp(String(data.devOtp));
          }
          const defaultSuccess = language === 'hi'
            ? '📧 6-digit OTP aapke email par bhej diya gaya hai! Kripya apna inbox check karein aur code darj karein.'
            : '📧 6-digit verification code has been sent to your email! Please check your inbox and enter the code below.';

          // Sanitize any residual 'Gmail', 'Gmails', or 'emails' server string
          const rawMsg = data?.message
            ? String(data.message)
                .replace(/gmails?/gi, 'email')
                .replace(/\bemails\b/gi, 'email')
                .replace(/\bmail inbox\b/gi, 'inbox')
            : defaultSuccess;

          const displayMsg = (language === 'hi' && (!data?.message || data.message.includes('Verification code')))
            ? defaultSuccess
            : rawMsg;

          setSuccessMsg(
            data?.devOtp
              ? (language === 'hi'
                ? `OTP Code: ${data.devOtp} (In-App verify). Check inbox or submit directly!`
                : `Verification code: ${data.devOtp}. Check email inbox or continue with code.`)
              : displayMsg
          );
        },
        onError: (err: any) => {
          setErrorMsg(
            err?.error ||
            err?.response?.data?.error ||
            err?.message ||
            (language === 'hi' ? 'OTP bhejne mein samasya aayi. Kripya dobara prayas karein.' : 'Failed to send OTP. Please try again.')
          );
        },
      }
    );
  };

  const handleSignup = () => {
    setErrorMsg('');
    setSuccessMsg('');
    if (!name.trim()) {
      setErrorMsg(t(language, 'enter_name_error'));
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMsg(t(language, 'enter_email_error'));
      return;
    }
    if (!otp.trim() || otp.trim().length !== 6) {
      setErrorMsg(
        language === 'hi'
          ? 'Kripya apne email par aaya 6-digit OTP code darj karein'
          : 'Please enter the 6-digit OTP code sent to your email'
      );
      return;
    }
    if (password.length < 6) {
      setErrorMsg(t(language, 'password_length_error'));
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg(
        language === 'hi'
          ? 'Dono password ek jaise hone chahiye (Retype password does not match)'
          : 'Passwords do not match. Please retype password correctly.'
      );
      return;
    }
    if (!isCaptchaVerified) {
      setErrorMsg(
        language === 'hi'
          ? 'Kripya neeche suraksha code verify karein'
          : 'Please complete the security verification code below'
      );
      return;
    }

    registerMutation.mutate(
      {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        otp: otp.trim(),
      },
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
            t(language, 'registration_failed')
          );
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
          [{ text: 'OK' }]
        );
      }
    } catch (err: any) {
      const msg = err?.message || 'Google sign-in failed';
      setGoogleErrorMsg(msg);
      Alert.alert('Google Sign-In', msg, [{ text: 'OK' }]);
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
              {language === 'hi' ? 'Naya Account Banayein' : 'Create Account'}
            </Text>

            {errorMsg ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>⚠️ {errorMsg}</Text>
              </View>
            ) : null}

            {successMsg ? (
              <View style={styles.successBox}>
                <Text style={styles.successText}>{successMsg}</Text>
              </View>
            ) : null}

            {/* Name Field */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>{t(language, 'name_label')}</Text>
              <View style={styles.inputWrapper}>
                <Text style={styles.inputLeadingIcon}>👤</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Rohan Sharma"
                  placeholderTextColor="#94A3B8"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              </View>
            </View>

            {/* Email Field with Send OTP Button */}
            <View style={styles.fieldGroup}>
              <View style={styles.fieldLabelRow}>
                <Text style={styles.fieldLabel}>{language === 'hi' ? 'Email ID' : 'Email Address'}</Text>
                {otpSent && <Text style={styles.otpDispatchedBadge}>✓ OTP Bheja Gaya</Text>}
              </View>
              <View style={styles.emailWrapper}>
                <Text style={styles.inputLeadingIcon}>✉️</Text>
                <TextInput
                  style={styles.emailInput}
                  placeholder="name@example.com"
                  placeholderTextColor="#94A3B8"
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    if (otpSent) {
                      setOtpSent(false);
                      setOtp('');
                    }
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={[
                    styles.sendOtpBtn,
                    (sendOtpMutation.isPending || (otpSent && otpCountdown > 0)) && styles.sendOtpBtnDisabled,
                  ]}
                  onPress={handleSendOtp}
                  disabled={sendOtpMutation.isPending || (otpSent && otpCountdown > 0)}
                  activeOpacity={0.8}
                >
                  {sendOtpMutation.isPending ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.sendOtpBtnText}>
                      {otpSent
                        ? otpCountdown > 0
                          ? `${otpCountdown}s`
                          : (language === 'hi' ? 'Dobara Bhejo' : 'Resend')
                        : (language === 'hi' ? 'OTP Bhejo' : 'Send OTP')}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Email 6-Digit OTP Field */}
            {otpSent && (
              <View style={styles.otpSection}>
                <View style={styles.otpHeaderRow}>
                  <Text style={styles.fieldLabel}>
                    {language === 'hi' ? 'Email Par Aaya 6-Digit OTP' : '6-Digit Email Verification OTP'}
                  </Text>
                  {otpCountdown > 0 ? (
                    <Text style={styles.otpTimerText}>⏱️ {otpCountdown}s bache</Text>
                  ) : (
                    <TouchableOpacity onPress={handleSendOtp}>
                      <Text style={styles.resendLinkText}>
                        {language === 'hi' ? '🔄 OTP Dobara Bhejo' : '🔄 Resend OTP'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
                <View style={styles.otpInputWrapper}>
                  <Text style={styles.otpInputIcon}>🔑</Text>
                  <TextInput
                    style={styles.otpInput}
                    placeholder="• • • • • •"
                    placeholderTextColor="#94A3B8"
                    value={otp}
                    onChangeText={(t) => setOtp(t.replace(/[^0-9]/g, '').slice(0, 6))}
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                  {otp.length === 6 && (
                    <View style={styles.otpDoneBadge}>
                      <Text style={styles.otpDoneBadgeText}>✓</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.otpSubHint}>
                  {language === 'hi'
                    ? 'Aapke email inbox par bheja gaya 6-digit suraksha code darj karein'
                    : 'Enter 6-digit security code sent to your email inbox'}
                </Text>
              </View>
            )}

            {/* Password Field */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>
                {language === 'hi' ? 'Password Banayein (Min 6 chars)' : 'Create Password (Min 6 chars)'}
              </Text>
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

            {/* Retype Password (Confirm) Field */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>
                {language === 'hi' ? 'Password Dobara Likhein (Retype Password)' : 'Retype Password (Confirm)'}
              </Text>
              <View style={styles.inputWrapper}>
                <Text style={styles.inputLeadingIcon}>🛡️</Text>
                <TextInput
                  style={[styles.input, { paddingRight: 44 }]}
                  placeholder="••••••••"
                  placeholderTextColor="#94A3B8"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  <Text style={styles.eyeIcon}>{showConfirmPassword ? '👁️' : '🔒'}</Text>
                </TouchableOpacity>
              </View>

              {/* Real-time Match Feedback */}
              {confirmPassword.length > 0 && (
                <View style={styles.matchStatusRow}>
                  {password === confirmPassword ? (
                    <Text style={styles.matchSuccessText}>
                      ✓ {language === 'hi' ? 'Password match ho gaya' : 'Passwords match'}
                    </Text>
                  ) : (
                    <Text style={styles.matchErrorText}>
                      ⚠️ {language === 'hi' ? 'Dono password ek jaise nahi hain' : 'Passwords do not match'}
                    </Text>
                  )}
                </View>
              )}
            </View>

            {/* Security Verification Code Check */}
            <RobotCaptcha
              onVerify={(verified) => {
                setIsCaptchaVerified(verified);
                if (verified) setErrorMsg('');
              }}
              language={language}
            />

            {/* 3-Day Free Trial Trust Row */}
            <View style={styles.trustBadgeRow}>
              <Text style={styles.trustBadgeIcon}>🪙</Text>
              <Text style={styles.trustBadgeText}>
                {language === 'hi'
                  ? '3 din ka free trial · No credit card required'
                  : '3-day free trial · No credit card required'}
              </Text>
            </View>

            {/* Vibrant Purple-Blue Gradient Primary CTA Button */}
            <TouchableOpacity
              style={[styles.primaryButtonTouch, registerMutation.isPending && styles.buttonDisabled]}
              onPress={handleSignup}
              disabled={registerMutation.isPending}
              activeOpacity={0.88}
            >
              <LinearGradient
                colors={['#8B5CF6', '#3B82F6']}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.primaryButton}
              >
                {registerMutation.isPending ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryButtonText}>
                    {language === 'hi' ? 'Naya Account Banayein →' : 'Create Account →'}
                  </Text>
                )}
              </LinearGradient>
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
              text={language === 'hi' ? 'Google se Sign Up karein' : 'Sign up with Google'}
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
              {language === 'hi' ? 'Pehle se account hai? ' : 'Already have an account? '}
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.footerLink}>
                {language === 'hi' ? 'Login karein' : 'Sign in'}
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
    marginBottom: 8,
  },
  mainTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
    letterSpacing: -0.3,
  },
  subTitle: {
    fontSize: 12,
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
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  cardHeading: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
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
  successBox: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
  },
  successText: {
    fontSize: 13,
    color: '#16A34A',
    fontWeight: '600',
  },
  fieldLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  otpDispatchedBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#16A34A',
  },
  emailWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.4,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    height: 45,
    paddingLeft: 12,
    paddingRight: 5,
  },
  emailInput: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 4,
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  sendOtpBtn: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 35,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendOtpBtnDisabled: {
    backgroundColor: '#94A3B8',
  },
  sendOtpBtnText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '800',
  },
  otpSection: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1.5,
    borderColor: '#FED7AA',
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
  },
  otpHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  otpTimerText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.primaryOrange,
  },
  resendLinkText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.primaryOrange,
  },
  otpInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#FDBA74',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
  },
  otpInputIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  otpInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 6,
    color: '#0F172A',
  },
  otpDoneBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpDoneBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  otpSubHint: {
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 4,
  },
  matchStatusRow: {
    marginTop: 4,
  },
  matchSuccessText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#16A34A',
  },
  matchErrorText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#DC2626',
  },
  fieldGroup: {
    marginBottom: 6,
  },
  fieldLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 3,
  },
  inputLeadingIcon: {
    fontSize: 15,
    marginRight: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.4,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    height: 45,
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 4,
    fontSize: 14,
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
    marginTop: 2,
    marginBottom: 5,
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
  primaryButtonTouch: {
    height: 48,
    borderRadius: 13,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  primaryButton: {
    flex: 1,
    height: 48,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 5,
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
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
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

export default SignupScreen;


