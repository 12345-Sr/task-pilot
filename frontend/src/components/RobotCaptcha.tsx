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
    const rot = `${(Math.random() * 20 - 10).toFixed(1)}deg`;
    const color = colorPalette[Math.floor(Math.random() * colorPalette.length)];
    displayChars.push({ char, rot, color });
  }

  return { code, displayChars };
}

export const RobotCaptcha: React.FC<RobotCaptchaProps> = ({ onVerify, language = 'hi' }) => {
  const [isVerified, setIsVerified] = useState(false);
  const [captchaData, setCaptchaData] = useState<{ code: string; displayChars: { char: string; rot: string; color: string }[] }>(() => generateRandomCaptcha());
  const [userInput, setUserInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isChecking, setIsChecking] = useState(false);

  const refreshCaptcha = () => {
    setCaptchaData(generateRandomCaptcha());
    setUserInput('');
    setErrorMsg('');
  };

  const handleVerify = () => {
    setErrorMsg('');
    if (!userInput.trim()) {
      setErrorMsg(language === 'hi' ? 'Upar ka code likhein' : 'Type code shown above');
      return;
    }

    setIsChecking(true);
    setTimeout(() => {
      setIsChecking(false);
      if (userInput.trim().toUpperCase() === captchaData.code.toUpperCase()) {
        setIsVerified(true);
        onVerify(true);
      } else {
        setErrorMsg(language === 'hi' ? 'Galat code! Naya try karein.' : 'Incorrect! Try new code.');
        refreshCaptcha();
      }
    }, 300);
  };

  if (isVerified) {
    return (
      <View style={styles.verifiedCard}>
        <View style={styles.verifiedLeft}>
          <View style={styles.verifiedCheckBadge}>
            <Text style={styles.verifiedCheckmark}>✓</Text>
          </View>
          <View>
            <Text style={styles.verifiedTitle}>
              {language === 'hi' ? '✓ Security Code Verified' : '✓ Security Verified'}
            </Text>
            <Text style={styles.verifiedSub}>
              {language === 'hi' ? 'Suraksha jaanch safal rahi' : 'Human verification complete'}
            </Text>
          </View>
        </View>
        <Text style={styles.shieldIcon}>🛡️</Text>
      </View>
    );
  }

  return (
    <View style={styles.compactContainer}>
      {/* Top compact row: Label on left, Visual Code Display + Refresh button on right */}
      <View style={styles.topRow}>
        <View style={styles.labelRow}>
          <Text style={styles.shieldIconSmall}>🛡️</Text>
          <Text style={styles.labelText}>
            {language === 'hi' ? 'Suraksha Verification Code' : 'Security Verification Code'}
          </Text>
        </View>

        {/* Visual Captcha Display Badge */}
        <View style={styles.captchaDisplayBadge}>
          <View style={styles.noiseLine} />
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
          <TouchableOpacity
            onPress={refreshCaptcha}
            style={styles.refreshIconBtn}
            hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
          >
            <Text style={styles.refreshIcon}>🔄</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Bottom compact row: Input Field + Verify Button */}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder={language === 'hi' ? 'Upar ka 5-akshar code likhein' : 'Type 5-letter code here'}
          placeholderTextColor="#94A3B8"
          value={userInput}
          onChangeText={(text) => {
            setUserInput(text);
            if (errorMsg) setErrorMsg('');
            // Instant auto-verify if typed 5 matching characters
            if (text.trim().length === 5 && text.trim().toUpperCase() === captchaData.code.toUpperCase()) {
              setIsVerified(true);
              onVerify(true);
            }
          }}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={5}
        />
        <TouchableOpacity
          style={styles.verifyBtn}
          onPress={handleVerify}
          disabled={isChecking}
          activeOpacity={0.82}
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
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  compactContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginVertical: 4,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
    marginRight: 6,
  },
  shieldIconSmall: {
    fontSize: 13,
  },
  labelText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#334155',
  },
  captchaDisplayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.2,
    borderColor: '#CBD5E1',
    borderRadius: 7,
    paddingHorizontal: 8,
    height: 28,
    position: 'relative',
    overflow: 'hidden',
    gap: 6,
    flexShrink: 0,
  },
  noiseLine: {
    position: 'absolute',
    top: 13,
    left: -10,
    right: -10,
    height: 1.5,
    backgroundColor: 'rgba(234, 88, 12, 0.25)',
    transform: [{ rotate: '-4deg' }],
  },
  captchaChar: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 2,
  },
  refreshIconBtn: {
    marginLeft: 3,
    padding: 2,
  },
  refreshIcon: {
    fontSize: 11,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    height: 38,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.2,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: 2,
  },
  verifyBtn: {
    backgroundColor: colors.primary,
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifyBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  errorText: {
    fontSize: 10.5,
    color: '#DC2626',
    fontWeight: '600',
    marginTop: 3,
  },
  verifiedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0FDF4',
    borderWidth: 1.2,
    borderColor: '#16A34A',
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 10,
    marginVertical: 4,
  },
  verifiedLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  verifiedCheckBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedCheckmark: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  verifiedTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#16A34A',
  },
  verifiedSub: {
    fontSize: 10,
    color: '#15803D',
  },
  shieldIcon: {
    fontSize: 16,
  },
});

export default RobotCaptcha;
