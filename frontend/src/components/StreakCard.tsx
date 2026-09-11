import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { radius } from '../theme/radius';
import { shadows } from '../theme/shadows';
import { useAppStore } from '../store';
import { t } from '../i18n';

interface StreakCardProps {
  streak?: number;
  streakCount?: number;
  isConsistentToday?: boolean;
}

export const StreakCard: React.FC<StreakCardProps> = ({ streak, streakCount, isConsistentToday }) => {
  const { language } = useAppStore();
  const currentStreak = streak ?? streakCount ?? 0;
  return (
    <View style={styles.card}>
      <View style={styles.flameCircle}>
        <Text style={styles.flameIcon}>🔥</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.number}>{currentStreak}</Text>
        <Text style={styles.label}>{t(language, 'streak_label')}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFBEB',
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 22,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#FDE68A',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  flameCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFF7ED',
    borderWidth: 3,
    borderColor: '#FED7AA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 18,
  },
  flameIcon: {
    fontSize: 30,
  },
  info: {
    justifyContent: 'center',
  },
  number: {
    fontSize: 34,
    fontWeight: '900',
    color: colors.primaryText,
    lineHeight: 38,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.secondaryText,
  },
});

export default StreakCard;
