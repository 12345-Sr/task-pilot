import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppStore } from '../store';

const RNImage = Image as any;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const SplashScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { isAuthenticated, language } = useAppStore();

  // Animation drivers
  const bgScale = useRef(new Animated.Value(1)).current;
  const haloScale1 = useRef(new Animated.Value(0.4)).current;
  const haloScale2 = useRef(new Animated.Value(0.4)).current;
  const haloScale3 = useRef(new Animated.Value(0.4)).current;
  const haloOpacity1 = useRef(new Animated.Value(0.8)).current;
  const haloOpacity2 = useRef(new Animated.Value(0.6)).current;
  const haloOpacity3 = useRef(new Animated.Value(0.4)).current;

  const logoScale = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoRotate = useRef(new Animated.Value(0)).current;

  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(24)).current;

  const tagOpacity = useRef(new Animated.Value(0)).current;
  const tagScale = useRef(new Animated.Value(0.8)).current;

  const progressWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 1. Initial Logo & Halo pop in
    Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 5,
        tension: 50,
        useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      // Gentle logo wobble
      Animated.sequence([
        Animated.timing(logoRotate, { toValue: -6, duration: 250, useNativeDriver: true }),
        Animated.timing(logoRotate, { toValue: 6, duration: 250, useNativeDriver: true }),
        Animated.timing(logoRotate, { toValue: -3, duration: 200, useNativeDriver: true }),
        Animated.timing(logoRotate, { toValue: 3, duration: 200, useNativeDriver: true }),
        Animated.timing(logoRotate, { toValue: 0, duration: 150, useNativeDriver: true }),
      ]),
    ]).start();

    // 2. Continuous Background Halo Pulse
    const haloAnim = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(haloScale1, { toValue: 1.35, duration: 1400, easing: Easing.out(Easing.ease), useNativeDriver: true }),
          Animated.timing(haloScale1, { toValue: 0.95, duration: 1400, easing: Easing.in(Easing.ease), useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(haloScale2, { toValue: 1.6, duration: 1600, easing: Easing.out(Easing.ease), useNativeDriver: true }),
          Animated.timing(haloScale2, { toValue: 1.0, duration: 1600, easing: Easing.in(Easing.ease), useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(haloScale3, { toValue: 1.9, duration: 1800, easing: Easing.out(Easing.ease), useNativeDriver: true }),
          Animated.timing(haloScale3, { toValue: 1.1, duration: 1800, easing: Easing.in(Easing.ease), useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(haloOpacity1, { toValue: 0.25, duration: 1400, useNativeDriver: true }),
          Animated.timing(haloOpacity1, { toValue: 0.7, duration: 1400, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(haloOpacity2, { toValue: 0.15, duration: 1600, useNativeDriver: true }),
          Animated.timing(haloOpacity2, { toValue: 0.5, duration: 1600, useNativeDriver: true }),
        ]),
      ])
    );
    haloAnim.start();

    // 3. Text entrance after 400ms
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(textOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.spring(textTranslateY, { toValue: 0, friction: 6, tension: 50, useNativeDriver: true }),
      ]).start();
    }, 400);

    // 4. Tagline badge entrance after 800ms
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(tagOpacity, { toValue: 1, duration: 450, useNativeDriver: true }),
        Animated.spring(tagScale, { toValue: 1, friction: 5, tension: 60, useNativeDriver: true }),
      ]).start();
    }, 800);

    // 5. 3-Second Loading Bar Progress
    Animated.timing(progressWidth, {
      toValue: 1,
      duration: 2800,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      useNativeDriver: false,
    }).start();

    // 6. Complete 3-second splash duration and route
    const timer = setTimeout(() => {
      if (isAuthenticated) {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Main' }],
        });
      } else {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Language' }],
        });
      }
    }, 3000);

    return () => {
      clearTimeout(timer);
      haloAnim.stop();
    };
  }, [isAuthenticated, navigation]);

  const spin = logoRotate.interpolate({
    inputRange: [-10, 10],
    outputRange: ['-10deg', '10deg'],
  });

  const progressInterpolate = progressWidth.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      {/* Dynamic Animated Halo Circles in Background */}
      <View style={styles.haloCenterWrap}>
        <Animated.View
          style={[
            styles.haloRing,
            styles.halo3,
            {
              transform: [{ scale: haloScale3 }],
              opacity: haloOpacity3,
            },
          ]}
        />
        <Animated.View
          style={[
            styles.haloRing,
            styles.halo2,
            {
              transform: [{ scale: haloScale2 }],
              opacity: haloOpacity2,
            },
          ]}
        />
        <Animated.View
          style={[
            styles.haloRing,
            styles.halo1,
            {
              transform: [{ scale: haloScale1 }],
              opacity: haloOpacity1,
            },
          ]}
        />
      </View>

      {/* Center Brand Identity */}
      <View style={styles.centerContent}>
        {/* Animated App Icon */}
        <Animated.View
          style={[
            styles.logoWrapper,
            {
              opacity: logoOpacity,
              transform: [{ scale: logoScale }, { rotate: spin }],
            },
          ]}
        >
          <View style={styles.logoCircle}>
            <RNImage
              source={require('../../assets/icon.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
        </Animated.View>

        {/* Brand App Name */}
        <Animated.View
          style={[
            styles.brandTextWrap,
            {
              opacity: textOpacity,
              transform: [{ translateY: textTranslateY }],
            },
          ]}
        >
          <Text style={styles.brandTitle}>
            <Text style={styles.brandTitleTask}>Task</Text>
            <Text style={styles.brandTitleAlert}>Alert</Text>
          </Text>
          <Text style={styles.brandSubtitle}>SMART REMINDER & TASK COMPANION</Text>
        </Animated.View>

        {/* Tagline Pill */}
        <Animated.View
          style={[
            styles.taglinePill,
            {
              opacity: tagOpacity,
              transform: [{ scale: tagScale }],
            },
          ]}
        >
          <Text style={styles.taglineText}>✨ Kal ka kaam, aaj set karein</Text>
        </Animated.View>
      </View>

      {/* Bottom Loading Bar for 3-Second Feedback */}
      <View style={styles.bottomBar}>
        <View style={styles.progressBarTrack}>
          <Animated.View
            style={[
              styles.progressBarFill,
              { width: progressInterpolate },
            ]}
          />
        </View>
        <Text style={styles.versionText}>TaskAlert v1.0 • 100% On-Time Reminders</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#072A1A', // Deep Luxurious Forest Green Theme
    alignItems: 'center',
    justifyContent: 'center',
  },
  haloCenterWrap: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  haloRing: {
    position: 'absolute',
    borderRadius: 999,
  },
  halo1: {
    width: 200,
    height: 200,
    backgroundColor: 'rgba(13, 92, 58, 0.45)',
    borderWidth: 1.5,
    borderColor: 'rgba(52, 211, 153, 0.4)',
  },
  halo2: {
    width: 300,
    height: 300,
    backgroundColor: 'rgba(13, 92, 58, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(234, 179, 8, 0.25)',
  },
  halo3: {
    width: 420,
    height: 420,
    backgroundColor: 'rgba(13, 92, 58, 0.12)',
    borderWidth: 0.8,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  centerContent: {
    alignItems: 'center',
    zIndex: 10,
    paddingHorizontal: 24,
  },
  logoWrapper: {
    marginBottom: 22,
    shadowColor: '#EAB308',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
  },
  logoCircle: {
    width: 108,
    height: 108,
    borderRadius: 30,
    backgroundColor: '#0D5C3A',
    borderWidth: 2.5,
    borderColor: 'rgba(234, 179, 8, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  logoImage: {
    width: 78,
    height: 78,
  },
  brandTextWrap: {
    alignItems: 'center',
    marginBottom: 14,
  },
  brandTitle: {
    fontSize: 38,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  brandTitleTask: {
    color: '#FFFFFF',
  },
  brandTitleAlert: {
    color: '#EAB308',
  },
  brandSubtitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6EE7B7',
    letterSpacing: 1.8,
  },
  taglinePill: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(234, 179, 8, 0.35)',
    marginTop: 6,
  },
  taglineText: {
    color: '#FDE68A',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 52,
    width: '75%',
    alignItems: 'center',
    gap: 12,
  },
  progressBarTrack: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#EAB308',
    borderRadius: 2,
  },
  versionText: {
    color: '#A7F3D0',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});

export default SplashScreen;
