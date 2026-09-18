import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { BrandLogo } from '../components/BrandLogo';
import { colors } from '../theme/colors';
import { radius } from '../theme/radius';
import { shadows } from '../theme/shadows';
import { SupportedLanguage } from '../types';
import { useAppStore } from '../store';
import { userRepository } from '../api';

interface LanguageItem {
  code: SupportedLanguage;
  native: string;
  english: string;
  greeting: string;
  greetingScript: string;
  region: string;
  tagline: string;
  ctaText: string;
  icon: string;
  badge?: string;
}

const LANGUAGE_LIST: LanguageItem[] = [
  {
    code: 'hi',
    native: 'Hinglish',
    english: 'Hinglish',
    greeting: 'Namaste',
    greetingScript: 'Namaste',
    region: 'India • Hinglish',
    tagline: 'Kal ka kaam, aaj set karein',
    ctaText: 'Hinglish mein shuru karein →',
    icon: '🇮🇳',
    badge: 'Popular',
  },
  {
    code: 'en',
    native: 'English',
    english: 'English',
    greeting: 'Hello',
    greetingScript: 'Hello',
    region: 'Global',
    tagline: 'Plan tomorrow, achieve today',
    ctaText: 'Continue in English →',
    icon: '🌐',
    badge: 'Default',
  },
  {
    code: 'mr',
    native: 'मराठी',
    english: 'Marathi',
    greeting: 'नमस्कार',
    greetingScript: 'नमस्कार',
    region: 'महाराष्ट्र',
    tagline: 'उद्याचे नियोजन, आजच निश्चित करा',
    ctaText: 'मराठीत सुरू करा →',
    icon: '🚩',
  },
  {
    code: 'bn',
    native: 'বাংলা',
    english: 'Bengali',
    greeting: 'নমস্কার',
    greetingScript: 'নমস্কার',
    region: 'পশ্চিমবঙ্গ',
    tagline: 'আগামীকালের কাজ, আজই ঠিক করুন',
    ctaText: 'বাংলায় শুরু করুন →',
    icon: '🌸',
  },
  {
    code: 'ta',
    native: 'தமிழ்',
    english: 'Tamil',
    greeting: 'வணக்கம்',
    greetingScript: 'வணக்கம்',
    region: 'தமிழ்நாடு',
    tagline: 'நாளைய திட்டமிடல், இன்றே தொடங்குங்கள்',
    ctaText: 'தமிழில் தொடரவும் →',
    icon: '🪔',
  },
  {
    code: 'te',
    native: 'తెలుగు',
    english: 'Telugu',
    greeting: 'నమస్కారం',
    greetingScript: 'నమస్కారం',
    region: 'ఆంధ్ర & తెలంగాణ',
    tagline: 'రేపటి పని, ఈరోజే ప్లాన్ చేయండి',
    ctaText: 'తెలుగులో ప్రారంభించండి →',
    icon: '✨',
  },
  {
    code: 'gu',
    native: 'ગુજરાતી',
    english: 'Gujarati',
    greeting: 'નમસ્તે',
    greetingScript: 'નમસ્તે',
    region: 'ગુજરાત',
    tagline: 'કાલનું કામ, આજે જ નક્કી કરો',
    ctaText: 'ગુજરાતીમાં શરૂ કરો →',
    icon: '🦚',
  },
  {
    code: 'pa',
    native: 'ਪੰਜਾਬੀ',
    english: 'Punjabi',
    greeting: 'ਸਤਿ ਸ਼੍ਰੀ ਅਕਾਲ',
    greetingScript: 'ਸਤਿ ਸ਼੍ਰੀ ਅਕਾਲ',
    region: 'ਪੰਜਾਬ',
    tagline: 'ਕੱਲ੍ਹ ਦਾ ਕੰਮ, ਅੱਜ ਹੀ ਤੈਅ ਕਰੋ',
    ctaText: 'ਪੰਜਾਬੀ ਵਿੱਚ ਸ਼ੁਰੂ ਕਰੋ →',
    icon: '🌾',
  },
];

export const LanguageScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { language, setLanguage, isAuthenticated } = useAppStore();

  const [selectedCode, setSelectedCode] = useState<SupportedLanguage>(language || 'hi');
  const [tickerIndex, setTickerIndex] = useState(0);
  const [isManualPick, setIsManualPick] = useState(false);

  // Animation values
  const flashOpacity = useRef(new Animated.Value(1)).current;
  const flashScale = useRef(new Animated.Value(1)).current;
  const haloPulse = useRef(new Animated.Value(1)).current;

  // Pulse halo animation loop
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(haloPulse, {
          toValue: 1.15,
          duration: 1600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(haloPulse, {
          toValue: 1.0,
          duration: 1600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [haloPulse]);

  // Flash / cycle through language greetings automatically until user selects one
  useEffect(() => {
    if (isManualPick) return;

    const interval = setInterval(() => {
      // Fade out
      Animated.parallel([
        Animated.timing(flashOpacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(flashScale, {
          toValue: 0.94,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setTickerIndex((prev) => (prev + 1) % LANGUAGE_LIST.length);
        // Fade in
        Animated.parallel([
          Animated.timing(flashOpacity, {
            toValue: 1,
            duration: 350,
            useNativeDriver: true,
          }),
          Animated.timing(flashScale, {
            toValue: 1,
            duration: 350,
            easing: Easing.out(Easing.back(1.5)),
            useNativeDriver: true,
          }),
        ]).start();
      });
    }, 1400);

    return () => clearInterval(interval);
  }, [isManualPick, flashOpacity, flashScale]);

  const currentDisplayLang = isManualPick
    ? (LANGUAGE_LIST.find((l) => l.code === selectedCode) || LANGUAGE_LIST[0])
    : LANGUAGE_LIST[tickerIndex];

  const selectedItem =
    LANGUAGE_LIST.find((l) => l.code === selectedCode) || LANGUAGE_LIST[0];

  const handleSelectLanguage = (code: SupportedLanguage) => {
    setIsManualPick(true);
    setSelectedCode(code);
    setLanguage(code);

    // Bounce greeting animation
    flashOpacity.setValue(0.7);
    flashScale.setValue(0.92);
    Animated.parallel([
      Animated.timing(flashOpacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.spring(flashScale, {
        toValue: 1,
        friction: 6,
        tension: 80,
        useNativeDriver: true,
      }),
    ]).start();

    if (isAuthenticated) {
      userRepository.updateLanguage(code).catch(() => {});
    }
  };

  const handleContinue = () => {
    setLanguage(selectedCode);
    if (isAuthenticated) {
      userRepository.updateLanguage(selectedCode).catch(() => {});
    }
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    if (isAuthenticated) {
      navigation.navigate('Main');
    } else {
      navigation.navigate('Welcome');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Bar with optional Back navigation */}
      <View style={styles.topHeader}>
        {navigation.canGoBack() ? (
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Text style={styles.backIcon}>←</Text>
            <Text style={styles.backLabel}>Back</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.starterPill}>
            <Text style={styles.starterPillText}>✨ STARTER • LANGUAGE</Text>
          </View>
        )}

        <TouchableOpacity
          onPress={handleContinue}
          style={styles.skipBtn}
          accessibilityRole="button"
          accessibilityLabel="Skip to starter screen"
        >
          <Text style={styles.skipBtnText}>Skip →</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContainer,
          {
            paddingTop: 4,
            paddingBottom: Math.max(insets.bottom, 16) + 8,
          },
        ]}
      >
        {/* Compact Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.brandRow}>
            <BrandLogo size={34} showText={false} />
            <Text style={styles.brandTitle}>
              <Text style={{ color: '#0F172A' }}>Task</Text>
              <Text style={{ color: '#EAB308' }}>Alert</Text>
            </Text>
          </View>

          <Text style={styles.screenHeading}>Choose Your Language</Text>
          <Text style={styles.screenSubheading}>
            Apni pasandida bhasha chunein • Select language
          </Text>

          {/* Compact Flash Greeting Pill */}
          <Animated.View
            style={[
              styles.flashBanner,
              {
                opacity: flashOpacity,
                transform: [{ scale: flashScale }],
              },
            ]}
          >
            <Text style={styles.flashGreeting}>
              {currentDisplayLang.greeting}!
            </Text>
            <Text style={styles.flashTagline} numberOfLines={1}>
              "{currentDisplayLang.tagline}"
            </Text>
          </Animated.View>
        </View>

        {/* 8 Regional Language Options in a Sleek 2-Column Grid */}
        <View style={styles.languagesGrid}>
          {LANGUAGE_LIST.map((item) => {
            const isSelected = selectedCode === item.code;
            return (
              <TouchableOpacity
                key={item.code}
                activeOpacity={0.82}
                onPress={() => handleSelectLanguage(item.code)}
                style={[
                  styles.languageTile,
                  isSelected && styles.languageTileActive,
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
              >
                <View style={styles.tileHeader}>
                  <Text style={styles.tileEmoji}>{item.icon}</Text>
                  {isSelected ? (
                    <View style={styles.checkBadge}>
                      <Text style={styles.checkBadgeText}>✓</Text>
                    </View>
                  ) : item.badge ? (
                    <View style={styles.microBadge}>
                      <Text style={styles.microBadgeText}>{item.badge}</Text>
                    </View>
                  ) : null}
                </View>

                <Text
                  style={[
                    styles.tileNative,
                    isSelected && styles.tileNativeActive,
                  ]}
                  numberOfLines={1}
                >
                  {item.native}
                </Text>
                <Text style={styles.tileSublabel} numberOfLines={1}>
                  {item.english}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Dynamic CTA Continue Button */}
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.continueBtn}
            activeOpacity={0.88}
            onPress={handleContinue}
            accessibilityRole="button"
            accessibilityLabel={selectedItem.ctaText}
          >
            <Text style={styles.continueBtnText}>
              {selectedItem.ctaText}
            </Text>
          </TouchableOpacity>
          <Text style={styles.bottomHint}>
            Settings se kisi bhi samay badal sakte hain
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default LanguageScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 4,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  backIcon: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
  },
  backLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  starterPill: {
    backgroundColor: '#FDF7EC',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: '#EBD8B3',
  },
  starterPillText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#9B7426',
    letterSpacing: 0.5,
  },
  skipBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...shadows.card,
  },
  skipBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#64748B',
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 16,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 6,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  screenHeading: {
    fontSize: 19,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
    marginBottom: 3,
    textAlign: 'center',
  },
  screenSubheading: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 8,
  },
  flashBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: radius.pill,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderWidth: 1.2,
    borderColor: '#EFE6D5',
    gap: 8,
    shadowColor: '#C5A059',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 2,
    marginBottom: 4,
  },
  flashGreeting: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  flashTagline: {
    fontSize: 11.5,
    fontStyle: 'italic',
    color: '#9B7426',
    fontWeight: '600',
  },
  languagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
    marginVertical: 6,
  },
  languageTile: {
    width: '48.5%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 13,
    paddingHorizontal: 13,
    minHeight: 74,
    borderWidth: 1.5,
    borderColor: '#EEF2F6',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    justifyContent: 'center',
  },
  languageTileActive: {
    backgroundColor: '#FDF9F0',
    borderColor: '#C5A059',
    shadowColor: '#C5A059',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  tileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  tileEmoji: {
    fontSize: 24,
  },
  checkBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#C5A059',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  microBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: radius.pill,
  },
  microBadgeText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#64748B',
  },
  tileNative: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  tileNativeActive: {
    color: '#825B15',
  },
  tileSublabel: {
    fontSize: 11.5,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 2,
  },
  bottomBar: {
    marginTop: 8,
    gap: 6,
  },
  continueBtn: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 15,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  continueBtnText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  bottomHint: {
    textAlign: 'center',
    fontSize: 10.5,
    color: '#94A3B8',
    fontWeight: '500',
  },
});
