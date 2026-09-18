import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  StyleProp,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export interface GradientButtonProps {
  onPress: () => void;
  title?: string;
  children?: React.ReactNode;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  colors?: readonly [string, string, ...string[]];
  activeOpacity?: number;
  icon?: React.ReactNode;
  accessibilityLabel?: string;
}

export const BUTTON_GRADIENT = ['#8B5CF6', '#3B82F6'] as const;
export const BUTTON_GRADIENT_ALT = ['#7C3AED', '#2563EB'] as const;

export const GradientButton: React.FC<GradientButtonProps> = ({
  onPress,
  title,
  children,
  disabled = false,
  loading = false,
  style,
  contentStyle,
  textStyle,
  colors = BUTTON_GRADIENT,
  activeOpacity = 0.85,
  icon,
  accessibilityLabel,
}) => {
  return (
    <TouchableOpacity
      activeOpacity={activeOpacity}
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      style={[styles.touchable, disabled && styles.disabled, style]}
    >
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={[styles.gradient, contentStyle]}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : children ? (
          children
        ) : (
          <View style={styles.innerRow}>
            {icon}
            <Text style={[styles.text, textStyle]}>{title}</Text>
          </View>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  touchable: {
    borderRadius: 14,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.32,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  gradient: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  innerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  disabled: {
    opacity: 0.65,
    shadowOpacity: 0.1,
    elevation: 1,
  },
});

export default GradientButton;
