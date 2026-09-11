import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Path, Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { colors } from '../theme/colors';

interface BrandLogoProps {
  size?: number;
  showText?: boolean;
  subtitle?: string;
  variant?: 'light' | 'dark';
  showSun?: boolean;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 44,
  showText = false,
  subtitle,
  variant = 'light',
}) => {
  const isDark = variant === 'dark';
  const textColor = isDark ? '#FFFFFF' : colors.textPrimary;
  const subtextColor = isDark ? '#94A3B8' : colors.textSecondary;

  return (
    <View style={styles.container}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          {/* Subtle Background Squircle Gradient */}
          <LinearGradient id="tpPlateGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#FFFDF7" />
            <Stop offset="100%" stopColor="#F5EFE6" />
          </LinearGradient>

          {/* Golden Dawn Prism Gradient */}
          <LinearGradient id="tpGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#E5C48D" />
            <Stop offset="50%" stopColor="#D5A65A" />
            <Stop offset="100%" stopColor="#C5A059" />
          </LinearGradient>

          {/* Deep Emerald / Teal Prism Gradient */}
          <LinearGradient id="tpTealGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#2DD4BF" />
            <Stop offset="50%" stopColor="#0D9488" />
            <Stop offset="100%" stopColor="#115E59" />
          </LinearGradient>

          {/* Upward Ascending Checkmark Highlight */}
          <LinearGradient id="tpCheckGrad" x1="0%" y1="100%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#C5A059" />
            <Stop offset="60%" stopColor="#26A69A" />
            <Stop offset="100%" stopColor="#2CC55E" />
          </LinearGradient>
        </Defs>

        {/* Squircle Emblem Base */}
        <Rect
          x="4"
          y="4"
          width="92"
          height="92"
          rx="24"
          fill="url(#tpPlateGrad)"
          stroke="#E5DECF"
          strokeWidth="1.5"
        />

        {/* Ambient Apex Star / Glow in top right */}
        <Circle cx="76" cy="24" r="3.5" fill="#C5A059" />
        <Circle cx="81" cy="30" r="1.5" fill="#A37B30" opacity={0.6} />

        {/* Fluid Prism 'Z' Checkmark:
            Top Horizontal Wing of 'Z' */}
        <Path
          d="M 24 30 C 24 26.5 27 24 31 24 L 68 24 C 73 24 75 28 72 32 L 60 45 C 57 48 53 48 49 46 L 31 37 C 26 35 24 33 24 30 Z"
          fill="url(#tpGoldGrad)"
        />

        {/* Fluid Prism 'Z' Checkmark:
            Diagonal Stem crossing down to the base */}
        <Path
          d="M 64 36 L 33 67 C 30 70 28 74 31 77 C 34 80 39 79 43 75 L 75 42 C 77 39 75 36 71 36 L 64 36 Z"
          fill="url(#tpTealGrad)"
          opacity={0.96}
        />

        {/* Fluid Prism 'Z' Checkmark:
            Base to Ascending Triumphant Check Wing */}
        <Path
          d="M 28 66 L 42 77 C 45 79 49 78 52 74 L 81 33 C 83 29 80 26 76 29 L 46 66 C 44 68 41 68 39 66 L 30 58 C 26 55 23 60 28 66 Z"
          fill="url(#tpCheckGrad)"
        />
      </Svg>

      {showText && (
        <View style={styles.textContainer}>
          <Text style={[styles.brandTitle, { color: textColor }]}>Task Pilot</Text>
          {Boolean(subtitle) && (
            <Text style={[styles.brandSubtitle, { color: subtextColor }]} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  textContainer: {
    justifyContent: 'center',
  },
  brandTitle: {
    fontSize: 21,
    fontWeight: '900',
    letterSpacing: 0.6,
    lineHeight: 25,
  },
  brandSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
    marginTop: 1,
  },
});

export default BrandLogo;
