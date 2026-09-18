import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/colors';
import { radius } from '../theme/radius';
import { useAppStore } from '../store';
import { t } from '../i18n';

interface EmptyStateProps {
  title?: string;
  subtitle?: string;
  ctaText?: string;
  actionLabel?: string;
  onPress?: () => void;
  onActionPress?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  subtitle,
  ctaText,
  actionLabel,
  onPress,
  onActionPress,
}) => {
  const { language } = useAppStore();
  const emptyTitle = title || t(language, 'empty_title');
  const emptySubtitle = subtitle || t(language, 'empty_subtitle');
  const buttonLabel = actionLabel || ctaText || t(language, 'add_first_task');
  const handlePress = onActionPress || onPress;

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>🎯</Text>
      <Text style={styles.title}>{emptyTitle}</Text>
      <Text style={styles.subtitle}>{emptySubtitle}</Text>
      {handlePress ? (
        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.btnTouch}
          onPress={handlePress}
          accessibilityRole="button"
          accessibilityLabel={buttonLabel}
        >
          <LinearGradient
            colors={['#8B5CF6', '#3B82F6']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.btn}
          >
            <Text style={styles.btnText}>{buttonLabel}</Text>
          </LinearGradient>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 36,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 40,
    marginBottom: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.primaryText,
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: colors.secondaryText,
    textAlign: 'center',
    marginBottom: 16,
  },
  btnTouch: {
    borderRadius: radius.pill,
    overflow: 'hidden',
    shadowColor: colors.primaryPurple,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  btn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 13,
  },
});

export default EmptyState;
