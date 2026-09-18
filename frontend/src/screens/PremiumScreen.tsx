import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppStore } from '../store';
import { t } from '../i18n';
import { useUpgradeSubscription } from '../hooks';
import { PaywallModal } from '../components/PaywallModal';
import { PremiumStatusModal } from '../components/PremiumStatusModal';

export const PremiumScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { language, isPremium, setPaywallVisible, setPremiumStatusVisible } = useAppStore();
  const upgradeMutation = useUpgradeSubscription();

  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly');

  const handleSubscribe = () => {
    if (isPremium) {
      setPremiumStatusVisible(true);
    } else {
      setPaywallVisible(true);
    }
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.topBarTitle} numberOfLines={1}>
          {t(language, 'appName')} Premium
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingBottom: Math.max(insets.bottom, 24) + 40 },
        ]}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.crownCircle}>
            <Text style={styles.crownIcon}>👑</Text>
          </View>
          <Text style={styles.heroTitle}>{t(language, 'premium_modal_title')}</Text>
          <Text style={styles.heroSubtitle}>{t(language, 'premium_modal_subtitle')}</Text>
        </View>

        {/* Feature Comparison */}
        <View style={styles.featuresCard}>
          <View style={styles.featureRow}>
            <Text style={styles.checkIcon}>✓</Text>
            <View style={styles.featureTextWrapper}>
              <Text style={styles.featureTitle}>{t(language, 'feat_unlimited')}</Text>
              <Text style={styles.featureDesc}>{t(language, 'free_plan_tag')}</Text>
            </View>
          </View>

          <View style={styles.featureRow}>
            <Text style={styles.checkIcon}>✓</Text>
            <View style={styles.featureTextWrapper}>
              <Text style={styles.featureTitle}>{t(language, 'feat_smart_reminders')}</Text>
              <Text style={styles.featureDesc}>{t(language, 'timeline_2h')} + {t(language, 'timeline_1h')}</Text>
            </View>
          </View>

          <View style={styles.featureRow}>
            <Text style={styles.checkIcon}>✓</Text>
            <View style={styles.featureTextWrapper}>
              <Text style={styles.featureTitle}>{t(language, 'feat_streak')}</Text>
              <Text style={styles.featureDesc}>{t(language, 'progress_subtitle')}</Text>
            </View>
          </View>

          <View style={styles.featureRow}>
            <Text style={styles.checkIcon}>✓</Text>
            <View style={styles.featureTextWrapper}>
              <Text style={styles.featureTitle}>{t(language, 'repeat_monthly_title')}</Text>
              <Text style={styles.featureDesc}>{t(language, 'repeat_monthly_sub')}</Text>
            </View>
          </View>

          <View style={styles.featureRow}>
            <Text style={styles.checkIcon}>✓</Text>
            <View style={styles.featureTextWrapper}>
              <Text style={styles.featureTitle}>{t(language, 'feat_privacy')}</Text>
              <Text style={styles.featureDesc}>100% Privacy</Text>
            </View>
          </View>
        </View>

        {/* Plan Selectors */}
        <Text style={styles.choosePlanTitle}>{t(language, 'choose_plan')}</Text>

        <View style={styles.plansContainer}>
          {/* Yearly Plan */}
          <TouchableOpacity
            style={[
              styles.planCard,
              selectedPlan === 'yearly' && styles.planCardSelected,
            ]}
            activeOpacity={0.8}
            onPress={() => setSelectedPlan('yearly')}
          >
            <View style={styles.popularBadge}>
              <Text style={styles.popularBadgeText}>{t(language, 'most_popular')}</Text>
            </View>

            <View style={styles.planCardBody}>
              <View>
                <Text style={styles.planName}>{t(language, 'yearly_plan')}</Text>
                <Text style={styles.planSub}>₹333 / mo</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.planPrice}>₹3,999</Text>
                <Text style={styles.planDuration}>{t(language, 'per_year')}</Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* Monthly Plan */}
          <TouchableOpacity
            style={[
              styles.planCard,
              selectedPlan === 'monthly' && styles.planCardSelected,
            ]}
            activeOpacity={0.8}
            onPress={() => setSelectedPlan('monthly')}
          >
            <View style={styles.planCardBody}>
              <View>
                <Text style={styles.planName}>{t(language, 'monthly_plan')}</Text>
                <Text style={styles.planSub}>Flexible</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.planPrice}>₹399</Text>
                <Text style={styles.planDuration}>{t(language, 'per_month')}</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* UPI & Payment trust row */}
        <View style={styles.trustBox}>
          <Text style={styles.trustText}>
            {t(language, 'payment_secure_note')}
          </Text>
        </View>

        {/* Upgrade CTA / View Pro Details CTA */}
        <TouchableOpacity
          style={[styles.upgradeBtn, upgradeMutation.isPending && styles.btnDisabled]}
          activeOpacity={0.85}
          onPress={handleSubscribe}
          disabled={upgradeMutation.isPending}
        >
          <LinearGradient
            colors={['#8B5CF6', '#3B82F6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.upgradeBtnGradient}
          >
            {upgradeMutation.isPending ? (
              <ActivityIndicator color={colors.surface} />
            ) : (
              <Text style={styles.upgradeBtnText}>
                {isPremium
                  ? (language === 'hi' ? '👑 Pro Status & Details Dekhein' : '👑 View Pro Details & Status')
                  : (language === 'hi' ? '3 Din Free Try Karein' : t(language, 'unlock_pro'))}
              </Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <Text style={styles.cancelAnytimeText}>
          {isPremium
            ? (language === 'hi' ? 'Aapka TaskAlert Pro plan active hai.' : 'Your TaskAlert Pro plan is currently active.')
            : (language === 'hi' ? 'Kabhi bhi cancel kar sakte hain.' : 'Cancel anytime with 1 tap.')}
        </Text>
      </ScrollView>

      {/* Razorpay Payment Wall & UPI QR Modal */}
      <PaywallModal />

      {/* Pro Details & Status Modal */}
      <PremiumStatusModal />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  closeBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    fontSize: 20,
    color: colors.textSecondary,
    fontWeight: 'bold',
  },
  topBarTitle: {
    ...typography.h3,
    flex: 1,
    minWidth: 0,
    textAlign: 'center',
    color: colors.textPrimary,
  },
  container: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  hero: {
    alignItems: 'center',
    marginVertical: spacing.sm,
  },
  crownCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.softYellow,
    borderWidth: 2,
    borderColor: colors.mediumYellow,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  crownIcon: {
    fontSize: 32,
  },
  heroTitle: {
    ...typography.h1,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  heroSubtitle: {
    ...typography.bodySecondary,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  featuresCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  featureRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  checkIcon: {
    fontSize: 16,
    color: colors.successGreen,
    fontWeight: 'bold',
    marginTop: 2,
  },
  featureTextWrapper: {
    flex: 1,
  },
  featureTitle: {
    ...typography.bodyPrimary,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  featureDesc: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  choosePlanTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginTop: spacing.xs,
  },
  plansContainer: {
    gap: spacing.sm,
  },
  planCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  planCardSelected: {
    borderColor: colors.primaryOrange,
    backgroundColor: '#FFFBF5',
  },
  popularBadge: {
    backgroundColor: colors.primaryOrange,
    paddingVertical: 4,
    alignItems: 'center',
  },
  popularBadgeText: {
    ...typography.caption,
    color: colors.surface,
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  planCardBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
  },
  planName: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  planSub: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  planPrice: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.primaryOrange,
  },
  planDuration: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  trustBox: {
    backgroundColor: '#F5F7FB',
    borderRadius: radius.md,
    padding: spacing.md,
  },
  trustText: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  upgradeBtn: {
    borderRadius: radius.md,
    overflow: 'hidden',
    marginTop: spacing.sm,
    shadowColor: colors.primaryPurple,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  upgradeBtnGradient: {
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
  btnDisabled: {
    opacity: 0.7,
  },
  upgradeBtnText: {
    ...typography.button,
    color: colors.surface,
    fontWeight: '800',
  },
  cancelAnytimeText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '600',
  },
});

export default PremiumScreen;
