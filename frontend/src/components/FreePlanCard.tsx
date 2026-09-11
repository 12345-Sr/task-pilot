import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '../theme/colors';
import { radius } from '../theme/radius';
import { shadows } from '../theme/shadows';
import { useAppStore } from '../store';
import { t } from '../i18n';

interface FreePlanCardProps {
  used?: number;
  total?: number;
  taskCount?: number;
  maxTasks?: number;
  onUpgrade?: () => void;
  onUpgradePress?: () => void;
}

export const FreePlanCard: React.FC<FreePlanCardProps> = ({
  used,
  total,
  taskCount,
  maxTasks,
  onUpgrade,
  onUpgradePress,
}) => {
  const { language } = useAppStore();
  const currentUsed = taskCount !== undefined ? taskCount : (used !== undefined ? used : 2);
  const currentTotal = maxTasks !== undefined ? maxTasks : (total !== undefined ? total : 3);
  const handleUpgrade = onUpgradePress || onUpgrade;
  const percent = Math.min(Math.round((currentUsed / currentTotal) * 100), 100);

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View>
          <Text style={styles.tag}>{t(language, 'free_plan_badge')}</Text>
          <Text style={styles.usageText}>
            {currentUsed} / {currentTotal} {language === 'hi' ? 'use hua' : 'used'} • {Math.max(0, currentTotal - currentUsed)} {language === 'hi' ? 'bache hain free use ke liye' : 'left for free use'}
          </Text>
        </View>
        {handleUpgrade ? (
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.upgradeBtn}
            onPress={handleUpgrade}
            accessibilityRole="button"
            accessibilityLabel="Upgrade to premium"
          >
            <Text style={styles.upgradeBtnText}>{t(language, 'upgrade_btn')}</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.progressRow}>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${percent}%` }]} />
        </View>
        <Text style={styles.percentText}>{percent}%</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  tag: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primaryOrange,
    letterSpacing: 1,
    marginBottom: 2,
  },
  usageText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primaryText,
  },
  upgradeBtn: {
    backgroundColor: colors.primaryOrange,
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
  },
  upgradeBtnText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  track: {
    flex: 1,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.surfaceSecondary,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: colors.primaryOrange,
    borderRadius: 4,
  },
  percentText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.secondaryText,
    width: 32,
    textAlign: 'right',
  },
});

export default FreePlanCard;
