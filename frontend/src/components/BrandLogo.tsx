import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Line } from 'react-native-svg';
import { colors } from '../theme/colors';

interface BrandLogoProps {
  size?: number;
  showText?: boolean;
  subtitle?: string;
  variant?: 'light' | 'dark';
  showSun?: boolean;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 40,
  showText = false,
  subtitle,
  variant = 'light',
}) => {
  const isDark = variant === 'dark';
  const taskColor = isDark ? '#FFFFFF' : '#0F172A';
  const pilotColor = '#EAB308';
  const subtextColor = isDark ? '#94A3B8' : colors.textSecondary;

  return (
    <View style={styles.container}>
      {/* Official TaskAlert Origami Paper Plane Icon */}
      <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        {/* Top-rear yellow fold/wing */}
        <Path d="M 22 18 L 44 19 L 29 38 Z" fill="#F59E0B" />

        {/* Main top emerald green wing */}
        <Path d="M 12 40 L 92 18 L 30 48 Z" fill="#16A34A" />

        {/* Lower shaded forest green wing */}
        <Path d="M 30 48 L 92 18 L 45 84 L 23 70 Z" fill="#15803D" />

        {/* Underbelly deep shadow fold */}
        <Path d="M 23 70 L 30 48 L 38 78 Z" fill="#14532D" />

        {/* Center golden crease accent along the spine */}
        <Line
          x1="28"
          y1="49"
          x2="92"
          y2="18"
          stroke="#FACC15"
          strokeWidth="3.2"
          strokeLinecap="round"
        />
      </Svg>

      {showText && (
        <View style={styles.textContainer}>
          <Text style={styles.brandTitle}>
            <Text style={{ color: taskColor }}>Task</Text>
            <Text style={{ color: pilotColor }}>Pilot</Text>
          </Text>
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
    gap: 10,
  },
  textContainer: {
    justifyContent: 'center',
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.4,
    lineHeight: 26,
  },
  brandSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
    marginTop: 1,
  },
});

export default BrandLogo;
