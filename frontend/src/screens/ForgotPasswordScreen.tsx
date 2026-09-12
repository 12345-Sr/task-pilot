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
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import { useAppStore } from '../store';
import { t } from '../i18n';
import BrandLogo from '../components/BrandLogo';
import { useForgotPassword, useVerifyResetOtp, useResetPassword } from '../hooks';

export const ForgotPasswordScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { language } = useAppStore();

  const forgotMutation = useForgotPassword();
  const verifyMutation = useVerifyResetOtp();
  const resetMutation = useResetPassword();

  // Screen flow steps:
  // 1 = Enter Email
  // 2 = Enter & Verify OTP
  // 3 = Enter New Password & Confirm Password
  // 4 = Success Confirmation
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [email, setEmail] = useState(route.params?.email || '');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successInfo, setSuccessInfo] = useState('');

  const handleSendCode = () => {
    setErrorMsg('');
    if (!email.trim() || !email.includes('@')) {
      setErrorMsg(t(language, 'enter_email_error'));
      return;
    }

    forgotMutation.mutate(
      { email: email.trim().toLowerCase() },
      {
        onSuccess: (data: any) => {
          if (data?.devOtp) {
            setOtp(String(data.devOtp));
          }
          setSuccessInfo(
            data?.devOtp
              ? `Verification code: ${data.devOtp}. Enter code below to verify.`
              : (data?.message || 'Verification code sent to your email.')
          );
          setStep(2);
        },
        onError: (err: any) => {
          setErrorMsg(
            err?.error ||
            err?.message ||
            err?.response?.data?.error ||
            err?.response?.data?.message ||
            'Failed to send reset code. Please check your email and try again.'
          );
        },
      }
    );
  };

  const handleVerifyCode = () => {
    setErrorMsg('');
    if (!otp.trim() || otp.trim().length < 4) {
      setErrorMsg(t(language, 'enter_otp_error'));
      return;
    }

    verifyMutation.mutate(
      {
        email: email.trim().toLowerCase(),
        otp: otp.trim(),
      },
      {
        onSuccess: () => {
          setErrorMsg('');
          setSuccessInfo(
            language === 'hi'
              ? 'Code safalta se verify ho gaya! Ab apna naya password banayein.'
              : 'Code verified successfully! Now create your new password.'
          );
          setStep(3);
        },
        onError: (err: any) => {
          setErrorMsg(
            err?.error ||
            err?.message ||
            err?.response?.data?.error ||
            err?.response?.data?.message ||
            'Invalid verification code. Please check and try again.'
          );
        },
      }
    );
  };

  const handleResetPassword = () => {
    setErrorMsg('');
    if (newPassword.length < 6) {
      setErrorMsg(t(language, 'password_length_error'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg(t(language, 'passwords_dont_match'));
      return;
    }

    resetMutation.mutate(
      {
        email: email.trim().toLowerCase(),
        otp: otp.trim(),
        newPassword,
      },
      {
        onSuccess: () => {
          setStep(4);
        },
        onError: (err: any) => {
          setErrorMsg(
            err?.error ||
            err?.message ||
            err?.response?.data?.error ||
            err?.response?.data?.message ||
            'Failed to reset password. Please verify the code and try again.'
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
            { paddingBottom: Math.max(insets.bottom, 24) + 30 },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          {/* Top navigation row with back button and single Task Pilot logo */}
          <View style={styles.topNavRow}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => {
                if (step === 3) {
                  setStep(2);
                  setErrorMsg('');
                } else if (step === 2) {
                  setStep(1);
                  setErrorMsg('');
                } else {
                  navigation.goBack();
                }
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.backButtonText}>← {language === 'hi' ? 'Wapas' : 'Back'}</Text>
            </TouchableOpacity>

            <View style={styles.topBrandRow}>
              <BrandLogo size={28} showText={false} showSun={true} />
              <Text style={styles.brandTitle}>
                <Text style={{ color: '#0F172A' }}>Task</Text>
                <Text style={{ color: '#EAB308' }}>Pilot</Text>
              </Text>
            </View>
          </View>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.mainTitle}>{t(language, 'reset_password_title')}</Text>
            <Text style={styles.subTitle}>
              {step === 1
                ? t(language, 'reset_password_subtitle')
                : step === 2
                ? (language === 'hi' ? `Humne ${email} par 6-digit code bheja hai` : `Enter the code sent to ${email}`)
                : step === 3
                ? (language === 'hi' ? 'Apna naya password darj karein aur confirm karein.' : 'Enter your new password and confirm it.')
                : t(language, 'password_reset_success')}
            </Text>

            {/* Step Progress Pill */}
            {step !== 4 && (
              <View style={styles.stepBadge}>
                <View style={[styles.stepDot, step >= 1 && styles.stepDotActive]} />
                <View style={[styles.stepLine, step >= 2 && styles.stepLineActive]} />
                <View style={[styles.stepDot, step >= 2 && styles.stepDotActive]} />
                <View style={[styles.stepLine, step >= 3 && styles.stepLineActive]} />
                <View style={[styles.stepDot, step >= 3 && styles.stepDotActive]} />
                <Text style={styles.stepBadgeText}>
                  {step === 1
                    ? (language === 'hi' ? 'Kadam 1/3: Email darj karein' : 'Step 1 of 3: Find Account')
                    : step === 2
                    ? (language === 'hi' ? 'Kadam 2/3: OTP verify karein' : 'Step 2 of 3: Verify Code')
                    : (language === 'hi' ? 'Kadam 3/3: Naya password' : 'Step 3 of 3: New Password')}
                </Text>
              </View>
            )}
          </View>

          {/* Error Message */}
          {errorMsg ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠️ {errorMsg}</Text>
            </View>
          ) : null}

          {/* Success Info Banner */}
          {successInfo && (step === 2 || step === 3) ? (
            <View style={styles.successAlertBox}>
              <Text style={styles.successAlertText}>✉️ {successInfo}</Text>
            </View>
          ) : null}

          {/* Floating White Card */}
          <View style={styles.card}>
            {/* STEP 1: Enter Email */}
            {step === 1 && (
              <View style={styles.form}>
                <Text style={styles.cardHeading}>
                  {language === 'hi' ? 'Apna Email Darj Karein' : 'Find Your Account'}
                </Text>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>{t(language, 'email_label')}</Text>
                  <View style={styles.inputWrapper}>
                    <Text style={styles.inputIcon}>✉️</Text>
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

                {/* Info Note */}
                <View style={styles.infoNoteBox}>
                  <Text style={styles.infoNoteText}>
                    💡 {language === 'hi'
                      ? 'Hum aapke email par password badalne ke liye 6-digit verification code bhejenge.'
                      : "We'll send a 6-digit verification code to reset your password securely."}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.primaryButton, forgotMutation.isPending && styles.buttonDisabled]}
                  activeOpacity={0.88}
                  onPress={handleSendCode}
                  disabled={forgotMutation.isPending}
                >
                  {forgotMutation.isPending ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.primaryButtonText}>{t(language, 'send_code_btn')}</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* STEP 2: Enter & Verify OTP */}
            {step === 2 && (
              <View style={styles.form}>
                <View style={styles.stepHeaderRow}>
                  <Text style={styles.cardHeading}>
                    {language === 'hi' ? 'Verification Code Darj Karein' : 'Enter Verification Code'}
                  </Text>
                  <TouchableOpacity onPress={() => setStep(1)} activeOpacity={0.7}>
                    <Text style={styles.changeEmailText}>
                      {language === 'hi' ? 'Email badlein' : 'Change email'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* OTP Field */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>{t(language, 'enter_otp_label')}</Text>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={[styles.input, styles.otpInput]}
                      placeholder="• • • • • •"
                      placeholderTextColor="#CBD5E1"
                      value={otp}
                      onChangeText={setOtp}
                      keyboardType="number-pad"
                      maxLength={6}
                    />
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.primaryButton, verifyMutation.isPending && styles.buttonDisabled]}
                  activeOpacity={0.88}
                  onPress={handleVerifyCode}
                  disabled={verifyMutation.isPending}
                >
                  {verifyMutation.isPending ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.primaryButtonText}>
                      {language === 'hi' ? 'Code Verify Karein' : 'Verify Code'}
                    </Text>
                  )}
                </TouchableOpacity>

                <View style={styles.resendRow}>
                  <TouchableOpacity
                    onPress={handleSendCode}
                    disabled={forgotMutation.isPending}
                  >
                    <Text style={styles.resendText}>
                      {language === 'hi' ? 'Code dobara bhejein' : 'Resend code'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* STEP 3: Enter New Password & Confirm Password */}
            {step === 3 && (
              <View style={styles.form}>
                <View style={styles.stepHeaderRow}>
                  <Text style={styles.cardHeading}>
                    {language === 'hi' ? 'Naya Password Banayein' : 'Create New Password'}
                  </Text>
                  <TouchableOpacity onPress={() => setStep(2)} activeOpacity={0.7}>
                    <Text style={styles.changeEmailText}>
                      {language === 'hi' ? 'Wapas OTP' : 'Back to OTP'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* New Password Field */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>{t(language, 'new_password_label')}</Text>
                  <View style={styles.inputWrapper}>
                    <Text style={styles.inputIcon}>🔒</Text>
                    <TextInput
                      style={[styles.input, { paddingRight: 44 }]}
                      placeholder="••••••••"
                      placeholderTextColor="#94A3B8"
                      value={newPassword}
                      onChangeText={setNewPassword}
                      secureTextEntry={!showNewPassword}
                    />
                    <TouchableOpacity
                      style={styles.eyeBtn}
                      onPress={() => setShowNewPassword(!showNewPassword)}
                    >
                      <Text style={styles.eyeIcon}>{showNewPassword ? '👁️' : '🔒'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Confirm Password Field */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>{t(language, 'confirm_password_label')}</Text>
                  <View style={styles.inputWrapper}>
                    <Text style={styles.inputIcon}>🔒</Text>
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
                </View>

                <TouchableOpacity
                  style={[styles.primaryButton, resetMutation.isPending && styles.buttonDisabled]}
                  activeOpacity={0.88}
                  onPress={handleResetPassword}
                  disabled={resetMutation.isPending}
                >
                  {resetMutation.isPending ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.primaryButtonText}>{t(language, 'submit_reset_btn')}</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* STEP 4: Success Screen */}
            {step === 4 && (
              <View style={styles.successContainer}>
                <View style={styles.successIconBox}>
                  <Text style={styles.successCheckIcon}>✓</Text>
                </View>
                <Text style={styles.successTitle}>
                  {language === 'hi' ? 'Password Safalta Se Badal Gaya!' : 'Password Reset Complete!'}
                </Text>
                <Text style={styles.successDesc}>
                  {t(language, 'password_reset_success')}
                </Text>
                <TouchableOpacity
                  style={styles.primaryButton}
                  activeOpacity={0.88}
                  onPress={() => navigation.navigate('Login')}
                >
                  <Text style={styles.primaryButtonText}>{t(language, 'login_button')}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Footer Link */}
          {step !== 4 && (
            <View style={styles.footerRow}>
              <Text style={styles.footerText}>
                {language === 'hi' ? 'Password yaad aa gaya?' : 'Remember your password?'}{' '}
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.footerLink}>{t(language, 'login_button')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
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
  topNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backButton: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  backButtonText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '700',
  },
  topBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
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
    letterSpacing: -0.4,
  },
  subTitle: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
    marginBottom: 12,
  },
  stepBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  stepDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#CBD5E1',
  },
  stepDotActive: {
    backgroundColor: colors.primary,
  },
  stepLine: {
    width: 14,
    height: 2,
    backgroundColor: '#CBD5E1',
    borderRadius: 1,
  },
  stepLineActive: {
    backgroundColor: colors.primary,
  },
  stepBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginLeft: 2,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 4,
  },
  stepHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardHeading: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 16,
  },
  changeEmailText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 16,
  },
  form: {
    gap: 4,
  },
  errorBox: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 13,
    color: '#B91C1C',
    fontWeight: '600',
    textAlign: 'center',
  },
  successAlertBox: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
    borderWidth: 1,
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  successAlertText: {
    fontSize: 13,
    color: '#15803D',
    fontWeight: '600',
    textAlign: 'center',
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
    borderRadius: 14,
    position: 'relative',
  },
  inputIcon: {
    paddingLeft: 14,
    fontSize: 14,
  },
  input: {
    flex: 1,
    height: 50,
    paddingHorizontal: 12,
    fontSize: 15,
    color: '#0F172A',
  },
  otpInput: {
    letterSpacing: 8,
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    paddingHorizontal: 14,
  },
  eyeBtn: {
    position: 'absolute',
    right: 14,
    padding: 4,
  },
  eyeIcon: {
    fontSize: 16,
  },
  infoNoteBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  infoNoteText: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 4,
    marginTop: 4,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  resendRow: {
    alignItems: 'center',
    marginTop: 14,
  },
  resendText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '700',
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  successIconBox: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  successCheckIcon: {
    fontSize: 34,
    color: '#2CC55E',
    fontWeight: '900',
  },
  successTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },
  successDesc: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 8,
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
});

export default ForgotPasswordScreen;

