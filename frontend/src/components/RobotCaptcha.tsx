import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { colors } from '../theme';

interface RobotCaptchaProps {
  onVerify: (isVerified: boolean) => void;
  language?: string;
}

const CHAR_SET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateRandomCaptcha(): { code: string; displayChars: { char: string; rot: string; color: string }[] } {
  let code = '';
  const displayChars = [];
  const colorPalette = ['#EA580C', '#2563EB', '#16A34A', '#D97706', '#9333EA', '#DC2626'];

  for (let i = 0; i < 5; i++) {
    const char = CHAR_SET.charAt(Math.floor(Math.random() * CHAR_SET.length));
    code += char;
    const rot = `${(Math.random() * 26 - 13).toFixed(1)}deg`;
    const color = colorPalette[Math.floor(Math.random() * colorPalette.length)];
    displayChars.push({ char, rot, color });
  }

  return { code, displayChars };
}

export const RobotCaptcha: React.FC<RobotCaptchaProps> = ({ onVerify, language = 'hi' }) => {
  const [isVerified, setIsVerified] = useState(false);
  const [showChallenge, setShowChallenge] = useState(false);
  const [captchaData, setCaptchaData] = useState<{ code: string; displayChars: { char: string; rot: string; color: string }[] }>(() => generateRandomCaptcha());
  const [userInput, setUserInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isChecking, setIsChecking] = useState(false);

  const refreshCaptcha = () => {
    setCaptchaData(generateRandomCaptcha());
    setUserInput('');
    setErrorMsg('');
  };

  const handleCheckboxPress = () => {
    if (isVerified) return;
    setShowChallenge(true);
    setErrorMsg('');
  };

  const handleVerify = () => {
    setErrorMsg('');
    if (!userInput.trim()) {
      setErrorMsg(language === 'hi' ? 'Kripya upar dikhaya gaya code likhein' : 'Please enter the code shown above');
      return;
    }

    setIsChecking(true);
    setTimeout(() => {
      setIsChecking(false);
      if (userInput.trim().toUpperCase() === captchaData.code.toUpperCase()) {
        setIsVerified(true);
        setShowChallenge(false);
        onVerify(true);
      } else {
        setErrorMsg(language === 'hi' ? 'Galat code! Naya code try karein.' : 'Incorrect code! Please try again.');
        refreshCaptcha();
      }
    }, 400);
  };

  return (
    <View style={styles.container}>
      {/* Checkbox Card */}
      <TouchableOpacity
        style={[
          styles.card,
          isVerified ? styles.cardVerified : showChallenge ? styles.cardActive : null,
        ]}
        onPress={handleCheckboxPress}
        activeOpacity={0.8}
      >
        <View style={styles.leftRow}>
          <View
            style={[
              styles.checkbox,
              isVerified ? styles.checkboxVerified : showChallenge ? styles.checkboxActive : null,
            ]}
          >
            {isVerified ? (
              <Text style={styles.checkmark}>✓</Text>
            ) : isChecking ? (
              <ActivityIndicator size="small" color={colors.primaryOrange} />
            ) : null}
          </View>
          <View>
            <Text style={styles.label}>
              {language === 'hi' ? 'Main robot nahi hoon' : "I'm not a robot"}
            </Text>
            <Text style={styles.subLabel}>
              {isVerified
                ? (language === 'hi' ? '✓ Human Verified' : '✓ Verified Human')
                : (language === 'hi' ? 'Suraksha Jaanch (Security Check)' : 'Security reCAPTCHA Check')}
            </Text>
          </View>
        </View>

        <View style={styles.badgeContainer}>
          <Text style={styles.badgeIcon}>🤖</Text>
          <Text style={styles.badgeText}>reCAPTCHA</Text>
        </View>
      </TouchableOpacity>

      {/* Expandable Challenge Area */}
      {showChallenge && !isVerified && (
        <View style={styles.challengeBox}>
          <View style={styles.challengeHeader}>
            <Text style={styles.challengeTitle}>
              {language === 'hi' ? 'Robot Suraksha Code Daalein' : 'Enter Security Verification Code'}
            </Text>
            <TouchableOpacity
              onPress={refreshCaptcha}
              style={styles.refreshBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.refreshText}>🔄 Naya Code</Text>
            </TouchableOpacity>
          </View>

          {/* Visual Captcha Canvas Simulation */}
          <View style={styles.captchaDisplay}>
            {/* Background noise lines */}
            <View style={styles.noiseLine1} />
            <View style={styles.noiseLine2} />
            <View style={styles.noiseLine3} />

            {captchaData.displayChars.map((item, idx) => (
              <Text
                key={idx}
                style={[
                  styles.captchaChar,
                  {
                    color: item.color,
                    transform: [{ rotate: item.rot }],
                  },
                ]}
              >
                {item.char}
              </Text>
            ))}
          </View>

          {/* Input Field */}
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder={language === 'hi' ? 'Upar ka 5-akshar code likhein' : 'Type 5-letter code here'}
              placeholderTextColor="#94A3B8"
              value={userInput}
              onChangeText={(text) => {
                setUserInput(text);
                if (errorMsg) setErrorMsg('');
              }}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={6}
            />
            <TouchableOpacity
              style={styles.verifyBtn}
              onPress={handleVerify}
              disabled={isChecking}
              activeOpacity={0.8}
            >
              {isChecking ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.verifyBtnText}>
                  {language === 'hi' ? 'Jaanchen' : 'Verify'}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {errorMsg ? (
            <Text style={styles.errorText}>⚠️ {errorMsg}</Text>
          ) : (
            <Text style={styles.helperText}>
              {language === 'hi'
                ? 'Bot aur spam rokne ke liye yeh code verify karein'
                : 'Enter code to verify you are a human'}
            </Text>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  cardActive: {
    borderColor: colors.primaryOrange,
    backgroundColor: '#FFFBF5',
  },
  cardVerified: {
    borderColor: '#16A34A',
    backgroundColor: '#F0FDF4',
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#94A3B8',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    borderColor: colors.primaryOrange,
  },
  checkboxVerified: {
    borderColor: '#16A34A',
    backgroundColor: '#16A34A',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  subLabel: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  badgeContainer: {
    alignItems: 'center',
    opacity: 0.8,
  },
  badgeIcon: {
    fontSize: 18,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 2,
  },
  challengeBox: {
    marginTop: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#FED7AA',
    padding: 14,
  },
  challengeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  challengeTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  refreshBtn: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
  },
  refreshText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryOrange,
  },
  captchaDisplay: {
    height: 54,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    position: 'relative',
    overflow: 'hidden',
    marginBottom: 12,
  },
  noiseLine1: {
    position: 'absolute',
    top: 14,
    left: -20,
    right: -20,
    height: 2,
    backgroundColor: 'rgba(234, 88, 12, 0.25)',
    transform: [{ rotate: '-6deg' }],
  },
  noiseLine2: {
    position: 'absolute',
    bottom: 16,
    left: -20,
    right: -20,
    height: 1.5,
    backgroundColor: 'rgba(37, 99, 235, 0.25)',
    transform: [{ rotate: '4deg' }],
  },
  noiseLine3: {
    position: 'absolute',
    top: 26,
    left: -20,
    right: -20,
    height: 1,
    backgroundColor: 'rgba(22, 163, 74, 0.25)',
    transform: [{ rotate: '-2deg' }],
  },
  captchaChar: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 4,
    textShadowColor: 'rgba(0,0,0,0.12)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    flex: 1,
    height: 44,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
    letterSpacing: 2,
  },
  verifyBtn: {
    backgroundColor: colors.primaryOrange,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifyBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  helperText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 8,
  },
  errorText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '600',
    marginTop: 8,
  },
});

export default RobotCaptcha;
