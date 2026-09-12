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
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import { useAppStore } from '../store';
import { t } from '../i18n';
import BrandLogo from '../components/BrandLogo';
import { useRegister, useSendRegisterOtp } from '../hooks';
import RobotCaptcha from '../components/RobotCaptcha';

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

export const SignupScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { language, setLanguage } = useAppStore();
  const registerMutation = useRegister();
  const sendOtpMutation = useSendRegisterOtp();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
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
      setErrorMsg(language === 'hi' ? 'Kripya sahi Gmail/Email address darj karein' : 'Please enter a valid email address');
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
          setSuccessMsg(
            data?.devOtp
              ? (language === 'hi'
                  ? `OTP Code: ${data.devOtp} (In-App verify). Check inbox or submit directly!`
                  : `Verification code: ${data.devOtp}. Check email inbox or continue with code.`)
              : (data?.message ||
                  (language === 'hi'
                    ? '📧 6-digit OTP aapke Gmail par bhej diya gaya hai! Kripya apna inbox check karein aur code darj karein.'
                    : '📧 6-digit verification code sent to your Gmail inbox! Please check your email and enter code below.'))
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
          ? 'Kripya apne Gmail par aaya 6-digit OTP code darj karein'
          : 'Please enter the 6-digit OTP code sent to your Gmail'
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
                <Text style={styles.fieldLabel}>{language === 'hi' ? 'Gmail / Email ID' : 'Gmail / Email Address'}</Text>
                {otpSent && <Text style={styles.otpDispatchedBadge}>✓ OTP Bheja Gaya</Text>}
              </View>
              <View style={styles.emailWrapper}>
                <TextInput
                  style={styles.emailInput}
                  placeholder="you@gmail.com"
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

            {/* Gmail 6-Digit OTP Field */}
            {otpSent && (
              <View style={styles.otpSection}>
                <View style={styles.otpHeaderRow}>
                  <Text style={styles.fieldLabel}>
                    {language === 'hi' ? 'Gmail Par Aaya 6-Digit OTP' : '6-Digit Gmail Verification OTP'}
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
                    ? 'Aapke Gmail par bheja gaya 6-digit suraksha code darj karein'
                    : 'Enter 6-digit security code sent to your Gmail inbox'}
                </Text>
              </View>
            )}

            {/* Password Field */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>
                {language === 'hi' ? 'Password Banayein (Min 6 chars)' : 'Create Password (Min 6 chars)'}
              </Text>
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

            {/* Retype Password (Confirm) Field */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>
                {language === 'hi' ? 'Password Dobara Likhein (Retype Password)' : 'Retype Password (Confirm)'}
              </Text>
              <View style={styles.inputWrapper}>
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

            {/* Golden Primary CTA Button */}
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleSignup}
              disabled={registerMutation.isPending}
              activeOpacity={0.88}
            >
              {registerMutation.isPending ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  {language === 'hi' ? 'Naya Account Banayein' : 'Create Account'}
                </Text>
              )}
            </TouchableOpacity>
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
    backgroundColor: colors.inputBg,
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    overflow: 'hidden',
  },
  emailInput: {
    flex: 1,
    height: 48,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#0F172A',
  },
  sendOtpBtn: {
    backgroundColor: colors.primaryOrange,
    paddingHorizontal: 14,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendOtpBtnDisabled: {
    backgroundColor: '#94A3B8',
  },
  sendOtpBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  otpSection: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1.5,
    borderColor: '#FED7AA',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  otpHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  otpTimerText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryOrange,
  },
  resendLinkText: {
    fontSize: 12,
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
    height: 48,
  },
  otpInputIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  otpInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 8,
    color: '#0F172A',
  },
  otpDoneBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpDoneBadgeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  otpSubHint: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 6,
  },
  matchStatusRow: {
    marginTop: 6,
  },
  matchSuccessText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#16A34A',
  },
  matchErrorText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#DC2626',
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

export default SignupScreen;


