import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { colors } from '../theme/colors';

interface BrandLogoProps {
  size?: number;
  showText?: boolean;
  subtitle?: string;
  variant?: 'light' | 'dark';
  showSun?: boolean;
}

const RNImage = Image as any;

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 40,
  showText = false,
  subtitle,
  variant = 'light',
}) => {
  const isDark = variant === 'dark';
  const taskColor = isDark ? '#FFFFFF' : '#0F172A';
  const alertColor = '#EAB308';
  const subtextColor = isDark ? '#94A3B8' : colors.textSecondary;

  return (
    <View style={styles.container}>
      {/* Official TaskAlert Bell Icon */}
      <RNImage
        source={require('../../assets/icon.png')}
        style={{ width: size, height: size }}
        resizeMode="contain"
      />

      {showText && (
        <View style={styles.textContainer}>
          <Text style={styles.brandTitle}>
            <Text style={{ color: taskColor }}>Task</Text>
            <Text style={{ color: alertColor }}>Alert</Text>
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
