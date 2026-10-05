import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { BrandLogo } from '../components/BrandLogo';
import { radius } from '../theme/radius';
import { SupportedLanguage } from '../types';
import { useAppStore } from '../store';
import { userRepository } from '../api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface LanguageItem {
  code: SupportedLanguage;
  native: string;
  english: string;
  greeting: string;
  tagline: string;
  icon: string;
  badge?: string;
}

const LANGUAGE_LIST: LanguageItem[] = [
  { code: 'en', native: 'English', english: '(English)', greeting: 'Hello', tagline: 'Plan tomorrow, achieve today', icon: '🌐', badge: 'Default' },
  { code: 'hi', native: 'हिंदी', english: '(Hindi)', greeting: 'Namaste', tagline: 'Kal ka kaam, aaj set karein', icon: '🇮🇳', badge: 'Popular' },
  { code: 'mr', native: 'मराठी', english: '(Marathi)', greeting: 'नमस्कार', tagline: 'उद्याचे नियोजन, आजच निश्चित करा', icon: '🚩' },
  { code: 'bn', native: 'বাংলা', english: '(Bengali)', greeting: 'নমস্কার', tagline: 'আগামীকালের কাজ, আজই ঠিক করুন', icon: '🌸' },
  { code: 'ta', native: 'தமிழ்', english: '(Tamil)', greeting: 'வணக்கம்', tagline: 'இன்றே திட்டமிடுங்கள்', icon: '🪔' },
  { code: 'te', native: 'తెలుగు', english: '(Telugu)', greeting: 'నమస్కారం', tagline: 'రేపటి పని, ఈరోజే ప్లాన్ చేయండి', icon: '✨' },
  { code: 'gu', native: 'ગુજરાતી', english: '(Gujarati)', greeting: 'નમસ્તે', tagline: 'કાલનું કામ, આજે જ નક્કી કરો', icon: '🦚' },
  { code: 'pa', native: 'ਪੰਜਾਬੀ', english: '(Punjabi)', greeting: 'ਸਤਿ ਸ਼੍ਰੀ ਅਕਾਲ', tagline: 'ਕੱਲ੍ਹ ਦਾ ਕੰਮ, ਅੱਜ ਹੀ ਤੈਅ ਕਰੋ', icon: '🌾' },
];

export const LanguageScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { language, setLanguage, isAuthenticated } = useAppStore();

  const [selectedCode, setSelectedCode] = useState<SupportedLanguage>(language || 'hi');
  const [tickerIndex, setTickerIndex] = useState(0);
  const [isManualPick, setIsManualPick] = useState(false);

  const splashFadeIn = useRef(new Animated.Value(0)).current;
  const splashSlideUp = useRef(new Animated.Value(30)).current;
  const haloPulse = useRef(new Animated.Value(1)).current;
  const flashOpacity = useRef(new Animated.Value(1)).current;
  const flashScale = useRef(new Animated.Value(1)).current;
  const cardScale = useRef(new Animated.Value(0.96)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(splashFadeIn, { toValue: 1, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.spring(splashSlideUp, { toValue: 0, friction: 8, tension: 45, useNativeDriver: true }),
      Animated.spring(cardScale, { toValue: 1, friction: 7, tension: 40, useNativeDriver: true }),
    ]).start();
  }, [splashFadeIn, splashSlideUp, cardScale]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(haloPulse, { toValue: 1.18, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(haloPulse, { toValue: 1.0, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [haloPulse]);

  useEffect(() => {
    if (isManualPick) return;
    const interval = setInterval(() => {
      Animated.parallel([
        Animated.timing(flashOpacity, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(flashScale, { toValue: 0.94, duration: 180, useNativeDriver: true }),
      ]).start(() => {
        setTickerIndex((prev) => (prev + 1) % LANGUAGE_LIST.length);
        Animated.parallel([
          Animated.timing(flashOpacity, { toValue: 1, duration: 280, useNativeDriver: true }),
          Animated.spring(flashScale, { toValue: 1, friction: 6, tension: 70, useNativeDriver: true }),
        ]).start();
      });
    }, 1800);
    return () => clearInterval(interval);
  }, [isManualPick, flashOpacity, flashScale]);

  const currentDisplayLang = isManualPick
    ? (LANGUAGE_LIST.find((l) => l.code === selectedCode) || LANGUAGE_LIST[0])
    : LANGUAGE_LIST[tickerIndex];

  const handleSelectLanguage = (code: SupportedLanguage) => {
    setIsManualPick(true);
    setSelectedCode(code);
    setLanguage(code);

    flashOpacity.setValue(0.6);
    flashScale.setValue(0.92);
    Animated.parallel([
      Animated.timing(flashOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.spring(flashScale, { toValue: 1, friction: 5, tension: 90, useNativeDriver: true }),
    ]).start();

    if (isAuthenticated) {
      userRepository.updateLanguage(code).catch(() => {});
    }

    // Auto-navigate after brief visual confirmation
    setTimeout(() => {
      if (navigation.canGoBack()) {
        navigation.goBack();
        return;
      }
      navigation.navigate('Welcome');
    }, 420);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {navigation.canGoBack() && (
        <View style={styles.topBackBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backIcon}>‹</Text>
            <Text style={styles.backLabel}>Back</Text>
          </TouchableOpacity>
        </View>
      )}

      <Animated.View style={[styles.mainWrapper, { opacity: splashFadeIn, transform: [{ translateY: splashSlideUp }] }]}>
        {/* Centered Splash Hero */}
        <View style={styles.splashHero}>
          <View style={styles.bellEmblemContainer}>
            <Animated.View style={[styles.bellHaloOuter, { transform: [{ scale: haloPulse }] }]} />
            <View style={styles.bellHaloMid} />
            <View style={styles.bellInnerCircle}>
              <BrandLogo size={42} showText={false} />
            </View>
          </View>

          <Text style={styles.brandTitle}>
            <Text style={{ color: '#0D5C3A' }}>Task</Text>
            <Text style={{ color: '#EAB308' }}>Alert</Text>
          </Text>

          <Animated.View style={[styles.greetingPill, { opacity: flashOpacity, transform: [{ scale: flashScale }] }]}>
            <Text style={styles.greetingEmoji}>{currentDisplayLang.icon}</Text>
            <Text style={styles.greetingWord}>{currentDisplayLang.greeting}</Text>
            <Text style={styles.greetingTagline}>— {currentDisplayLang.tagline}</Text>
          </Animated.View>

          <Text style={styles.screenHeading}>Choose Your Language</Text>
          <Text style={styles.screenSubheading}>Tap to select · Opens automatically</Text>
        </View>

        {/* Language Grid */}
        <Animated.View style={[styles.gridWrapper, { transform: [{ scale: cardScale }] }]}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            bounces={false}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 20) + 20 }]}
          >
            <View style={styles.languagesGrid}>
              {LANGUAGE_LIST.map((item) => {
                const isSelected = selectedCode === item.code;
                return (
                  <TouchableOpacity
                    key={item.code}
                    activeOpacity={0.82}
                    onPress={() => handleSelectLanguage(item.code)}
                    style={[styles.languageCard, isSelected ? styles.languageCardSelected : styles.languageCardDefault]}
                  >
                    <View style={[styles.iconCircle, isSelected && styles.iconCircleSelected]}>
                      <Text style={styles.iconEmoji}>{item.icon}</Text>
                    </View>

                    <View style={styles.textColumn}>
                      <Text style={[styles.nativeName, isSelected && styles.nativeNameSelected]} numberOfLines={1}>
                        {item.native}
                      </Text>
                      <Text style={styles.englishName} numberOfLines={1}>{item.english}</Text>
                    </View>

                    {isSelected ? (
                      <View style={styles.checkCircle}>
                        <Text style={styles.checkText}>✓</Text>
                      </View>
                    ) : item.badge ? (
                      <View style={styles.badgePill}>
                        <Text style={styles.badgeText}>{item.badge}</Text>
                      </View>
                    ) : (
                      <View style={styles.radioEmpty} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.bottomHint}>Your Tasks • Our Priority</Text>
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </SafeAreaView>
  );
};

export default LanguageScreen;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAF8' },
  topBackBar: { paddingHorizontal: 16, paddingVertical: 6, zIndex: 10 },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 2, alignSelf: 'flex-start', paddingVertical: 4, paddingHorizontal: 6 },
  backIcon: { fontSize: 28, color: '#0F172A', fontWeight: '400', lineHeight: 28 },
  backLabel: { fontSize: 14, fontWeight: '600', color: '#0F172A' },
  mainWrapper: { flex: 1 },

  // Splash Hero
  splashHero: { alignItems: 'center', paddingTop: 20, paddingBottom: 10, paddingHorizontal: 20 },
  bellEmblemContainer: { width: 90, height: 90, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  bellHaloOuter: { position: 'absolute', width: 90, height: 90, borderRadius: 45, backgroundColor: '#DCFCE7', opacity: 0.4 },
  bellHaloMid: { position: 'absolute', width: 70, height: 70, borderRadius: 35, backgroundColor: '#BBF7D0', opacity: 0.55 },
  bellInnerCircle: {
    width: 62, height: 62, borderRadius: 31, backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#0D5C3A', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 6,
    borderWidth: 2, borderColor: '#E8F5E9',
  },
  brandTitle: { fontSize: 26, fontWeight: '900', letterSpacing: -0.5, marginBottom: 8 },
  greetingPill: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF',
    borderRadius: radius.pill, paddingVertical: 6, paddingHorizontal: 14,
    borderWidth: 1.2, borderColor: '#E2E8F0', gap: 6,
    shadowColor: '#0D5C3A', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 3,
    marginBottom: 12, maxWidth: '95%',
  },
  greetingEmoji: { fontSize: 15 },
  greetingWord: { fontSize: 13.5, fontWeight: '800', color: '#0D5C3A', flexShrink: 0 },
  greetingTagline: { fontSize: 11.5, fontStyle: 'italic', color: '#64748B', fontWeight: '600', flexShrink: 1 },
  screenHeading: { fontSize: 19, fontWeight: '800', color: '#0F172A', letterSpacing: -0.3, marginBottom: 3, textAlign: 'center' },
  screenSubheading: { fontSize: 12, color: '#94A3B8', fontWeight: '500', textAlign: 'center' },

  // Grid
  gridWrapper: { flex: 1 },
  scrollContent: { paddingHorizontal: 16 },
  languagesGrid: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10, marginTop: 8 },
  languageCard: { width: (SCREEN_WIDTH - 42) / 2, flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 12, borderRadius: 16, minHeight: 60, borderWidth: 1.5 },
  languageCardDefault: { backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', shadowColor: '#0F172A', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  languageCardSelected: { backgroundColor: '#EBFBF3', borderColor: '#0D5C3A', shadowColor: '#0D5C3A', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.16, shadowRadius: 8, elevation: 4 },
  iconCircle: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E2E8F0', flexShrink: 0 },
  iconCircleSelected: { backgroundColor: '#DCFCE7', borderColor: '#86EFAC' },
  iconEmoji: { fontSize: 16 },
  textColumn: { flex: 1 },
  nativeName: { fontSize: 14, fontWeight: '800', color: '#0F172A', letterSpacing: -0.2 },
  nativeNameSelected: { color: '#0D5C3A' },
  englishName: { fontSize: 10.5, color: '#64748B', fontWeight: '500', marginTop: 1 },
  checkCircle: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#0D5C3A', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  checkText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900', lineHeight: 14 },
  badgePill: { backgroundColor: '#FEF3C7', borderWidth: 1, borderColor: '#FDE68A', borderRadius: 8, paddingHorizontal: 5, paddingVertical: 2, flexShrink: 0 },
  badgeText: { fontSize: 9, fontWeight: '800', color: '#B45309' },
  radioEmpty: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: '#CBD5E1', flexShrink: 0 },
  bottomHint: { textAlign: 'center', fontSize: 11, color: '#0D5C3A', fontWeight: '700', fontStyle: 'italic', marginTop: 18, marginBottom: 4 },
});
