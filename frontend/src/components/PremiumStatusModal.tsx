import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore } from '../store';
import { apiClient } from '../api/client';
import { colors } from '../theme/colors';
import { radius } from '../theme/radius';
import { shadows } from '../theme/shadows';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';
import { BrandLogo } from './BrandLogo';

interface PremiumStatusModalProps {
  visible?: boolean;
  onClose?: () => void;
}

export const PremiumStatusModal: React.FC<PremiumStatusModalProps> = ({
  visible,
  onClose,
}) => {
  const insets = useSafeAreaInsets();
  const {
    premiumStatusVisible,
    setPremiumStatusVisible,
    subscriptionInfo,
    setSubscriptionInfo,
    setIsPremium,
    isPremium,
    setPaywallVisible,
    language,
  } = useAppStore();
  const isHinglish = language === 'hi';

  const isVisible = visible !== undefined ? visible : premiumStatusVisible;
  const [refreshing, setRefreshing] = useState(false);

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      setPremiumStatusVisible(false);
    }
  };

  const handleOpenUpgrade = () => {
    handleClose();
    setTimeout(() => {
      setPaywallVisible(true);
    }, 150);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const res: any = await apiClient.get('/subscription/status');
      if (res) {
        const isPro = res.status === 'active' || res.isPremium === true;
        setIsPremium(isPro);
        setSubscriptionInfo({
          status: res.status || (isPro ? 'active' : 'free'),
          currentPeriodEnd: res.currentPeriodEnd || null,
          planPrice: res.planPrice || 399,
        });
        if (!isPro) {
          Alert.alert(
            isHinglish ? 'Status Check' : 'Status Check',
            isHinglish
              ? 'Aapka account abhi Free tier par hai. Upgrade option available hai.'
              : 'Your account is currently on the Free tier. Upgrade options are available.'
          );
        }
      }
    } catch (e) {
      // ignore
    } finally {
      setTimeout(() => setRefreshing(false), 500);
    }
  };

  if (!isVisible) return null;

  // Calculate validity & remaining days
  const currentPeriodEnd = subscriptionInfo?.currentPeriodEnd;
  let formattedEndDate = isHinglish ? '30 Din Ke Liye Active' : 'Active for 30 Days';
  let daysRemaining = 30;

  if (currentPeriodEnd) {
    const end = new Date(currentPeriodEnd);
    if (!isNaN(end.getTime())) {
      formattedEndDate = end.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
      const diffMs = end.getTime() - Date.now();
      daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    }
  }

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.safeArea}>
        {/* Top Header Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={handleClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>

          <View style={styles.headerBrand}>
            <BrandLogo size={24} showText={false} />
            <Text style={styles.headerBrandTitle}>
              <Text style={{ color: colors.textPrimary }}>Task</Text>
              <Text style={{ color: colors.warning }}>Alert</Text>
              <Text style={{ color: colors.primary, fontWeight: '900' }}> PRO</Text>
            </Text>
          </View>

          <View style={[styles.verifiedBadge, !isPremium && styles.freeBadge]}>
            <Text style={[styles.verifiedText, !isPremium && styles.freeBadgeText]}>
              {isPremium ? '✓ Pro Verified' : 'Free Plan'}
            </Text>
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom, 24) + 30 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Card */}
          <View style={styles.heroCard}>
            <View style={[styles.crownCircle, !isPremium && styles.crownCircleFree]}>
              <Text style={styles.crownIcon}>{isPremium ? '👑' : '⭐'}</Text>
            </View>

            {isPremium ? (
              <View style={styles.activeStatusPill}>
                <View style={styles.greenDot} />
                <Text style={styles.activeStatusPillText}>
                  {isHinglish ? 'PRO PLAN ACTIVE' : 'PRO PLAN ACTIVE'}
                </Text>
              </View>
            ) : (
              <View style={styles.freeStatusPill}>
                <View style={styles.amberDot} />
                <Text style={styles.freeStatusPillText}>
                  {isHinglish ? 'FREE TIER (LIMIT: 3 TASKS)' : 'FREE TIER (LIMIT: 3 TASKS)'}
                </Text>
              </View>
            )}

            <Text style={styles.heroTitle}>
              {isPremium
                ? 'TaskAlert Pro Member'
                : (isHinglish ? 'TaskAlert Free Tier' : 'TaskAlert Free Tier')}
            </Text>
            <Text style={styles.heroSubtitle}>
              {isPremium
                ? (isHinglish
                    ? 'Aapke pass sabhi premium productivity features ka unlimited access hai.'
                    : 'You have unlimited access to all productivity features.')
                : (isHinglish
                    ? 'Aap abhi Free tier par hain. Unlimited daily reminders aur advance audio alerts ke liye Pro upgrade karein.'
                    : 'You are on the Free tier. Upgrade to Pro for unlimited reminders and advance sound alerts.')}
            </Text>

            {/* Validity Box */}
            <View style={styles.validityCard}>
              <View style={styles.validityRow}>
                <View>
                  <Text style={styles.validityLabel}>
                    {isPremium
                      ? (isHinglish ? 'Plan Validity' : 'Plan Validity')
                      : (isHinglish ? 'Current Status' : 'Current Status')}
                  </Text>
                  <Text style={styles.validityDate}>
                    {isPremium ? formattedEndDate : (isHinglish ? 'Free Tier Active' : 'Free Tier Active')}
                  </Text>
                </View>
                <View style={[styles.daysLeftPill, !isPremium && styles.daysLeftPillFree]}>
                  <Text style={[styles.daysLeftText, !isPremium && styles.daysLeftTextFree]}>
                    {isPremium
                      ? `⏳ ${daysRemaining} ${isHinglish ? 'Din Baaki' : 'Days Left'}`
                      : '⚡ Upgrade Ready'}
                  </Text>
                </View>
              </View>

              <View style={styles.validityDivider} />

              <View style={styles.planInfoRow}>
                <Text style={styles.planInfoLabel}>
                  {isHinglish ? 'Plan Ka Naam' : 'Plan Name'}
                </Text>
                <Text style={styles.planInfoVal}>
                  {isPremium ? 'TaskAlert Pro (₹399/mo)' : 'TaskAlert Free Tier'}
                </Text>
              </View>
              <View style={styles.planInfoRow}>
                <Text style={styles.planInfoLabel}>
                  {isHinglish ? 'Billing Status' : 'Billing Status'}
                </Text>
                <Text style={isPremium ? styles.planInfoValSuccess : styles.planInfoValPending}>
                  {isPremium
                    ? (isHinglish ? 'Paid (Successful ✓)' : 'Paid (Successful ✓)')
                    : (isHinglish ? 'Free (Upgrade Available)' : 'Free (Upgrade Available)')}
                </Text>
              </View>
            </View>
          </View>

          {/* Features List */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>
              {isPremium
                ? (isHinglish ? 'Unlocked Premium Features' : 'Unlocked Premium Features')
                : (isHinglish ? 'Pro Plan Features (Upgrade Par Milega)' : 'Pro Plan Features')}
            </Text>

            <View style={styles.featureItem}>
              <View style={styles.featureIconWrap}>
                <Text style={styles.featureEmoji}>⚡</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.featureHeading}>
                  {isHinglish ? 'Unlimited Task Creation' : 'Unlimited Task Creation'}
                </Text>
                <Text style={styles.featureDesc}>
                  {isHinglish
                    ? 'Free plan ki 3-task limit hat jaati hai. Jitne chahein daily reminders banayein.'
                    : 'The 3-task free tier limit is removed. Create as many reminders as you need.'}
                </Text>
              </View>
            </View>

            <View style={styles.featureItem}>
              <View style={styles.featureIconWrap}>
                <Text style={styles.featureEmoji}>🔊</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.featureHeading}>
                  {isHinglish ? 'Advance Audio Alerts' : 'Advance Audio Alerts'}
                </Text>
                <Text style={styles.featureDesc}>
                  {isHinglish
                    ? 'Task ke 2 ghante aur 1 ghante pehle proactive voice sound reminders.'
                    : 'Proactive voice audio reminders 2 hours and 1 hour before scheduled time.'}
                </Text>
              </View>
            </View>

            <View style={styles.featureItem}>
              <View style={styles.featureIconWrap}>
                <Text style={styles.featureEmoji}>🔄</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.featureHeading}>
                  {isHinglish ? '30-Day Recurring Tasks' : '30-Day Recurring Tasks'}
                </Text>
                <Text style={styles.featureDesc}>
                  {isHinglish
                    ? 'Daily, weekly aur monthly recurring schedules bina ruke chalte rahenge.'
                    : 'Daily, weekly and monthly schedules run automatically without interruption.'}
                </Text>
              </View>
            </View>

            <View style={styles.featureItem}>
              <View style={styles.featureIconWrap}>
                <Text style={styles.featureEmoji}>📊</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.featureHeading}>
                  {isHinglish ? 'Streak & Best Performance' : 'Streak & Performance'}
                </Text>
                <Text style={styles.featureDesc}>
                  {isHinglish
                    ? 'Progress graph aur daily completion rate insights unlock hain.'
                    : 'Progress graphs and completion rate insights are fully unlocked.'}
                </Text>
              </View>
            </View>
          </View>

          {/* Expiry / Upgrade Notice Card */}
          <View style={[styles.infoCard, !isPremium && styles.infoCardFree]}>
            <Text style={[styles.infoTitle, !isPremium && styles.infoTitleFree]}>
              ℹ️ {isPremium
                ? (isHinglish ? 'Plan Expiry Jankari' : 'Plan Expiry Notice')
                : (isHinglish ? 'Pro Membership Kaise Kaam Karta Hai?' : 'How Pro Membership Works?')}
            </Text>
            <Text style={[styles.infoText, !isPremium && styles.infoTextFree]}>
              {isPremium
                ? (isHinglish
                    ? `Yeh plan ${daysRemaining} din tak poori tarah active rahega. Jab validity date (${formattedEndDate}) complete hogi, tab app wapas free plan par shift ho jayegi aur screen par 'Upgrade' ka option dobara dikhne lagega, jisse aap asani se renew kar sakenge.`
                    : `Your Pro plan is active for ${daysRemaining} more days. Once this period expires on ${formattedEndDate}, the app will switch back to the free plan and the 'Upgrade' option will reappear so you can renew anytime.`)
                : (isHinglish
                    ? 'Payment poora hone par Pro plan turant activate ho jaata hai aur sabhi upgrade buttons hat kar yeh Status Page show hota hai. Plan period khatam hone par upgrade option wapas aa jaata hai.'
                    : 'Upon successful payment, Pro plan activates immediately and upgrade buttons are replaced by this Status Page. When the period ends, upgrade options reappear.')}
            </Text>
          </View>

          {/* Actions */}
          <View style={styles.actionsWrap}>
            {!isPremium && (
              <TouchableOpacity
                style={styles.upgradeCtaBtn}
                activeOpacity={0.88}
                onPress={handleOpenUpgrade}
              >
                <Text style={styles.upgradeCtaBtnText}>
                  👑 {isHinglish ? 'Pro Upgrade Karein (₹399/mahina)' : 'Upgrade to Pro (₹399/month)'}
                </Text>
              </TouchableOpacity>
            )}

            {isPremium && (
              <TouchableOpacity
                style={styles.refreshBtn}
                activeOpacity={0.8}
                onPress={handleRefresh}
                disabled={refreshing}
              >
                {refreshing ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Text style={styles.refreshBtnText}>
                    🔄 {isHinglish ? 'Status Refresh Karein' : 'Refresh Status'}
                  </Text>
                )}
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.doneBtn}
              activeOpacity={0.85}
              onPress={handleClose}
            >
              <Text style={styles.doneBtnText}>
                {isHinglish ? 'Theek Hai (Close)' : 'Done'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '700',
  },
  headerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerBrandTitle: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  verifiedBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    gap: spacing.md,
  },
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...shadows.soft,
  },
  crownCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FEF3C7',
    borderWidth: 2,
    borderColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  crownIcon: {
    fontSize: 30,
  },
  activeStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: radius.full,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  greenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#16A34A',
  },
  activeStatusPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#15803D',
    letterSpacing: 0.5,
  },
  heroTitle: {
    ...typography.h2,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  heroSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  validityCard: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  validityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  validityLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  validityDate: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 2,
  },
  daysLeftPill: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  daysLeftText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  validityDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: spacing.sm,
  },
  planInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
  },
  planInfoLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  planInfoVal: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  planInfoValSuccess: {
    fontSize: 13,
    fontWeight: '700',
    color: '#16A34A',
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: spacing.sm,
    ...shadows.soft,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 6,
  },
  featureIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureEmoji: {
    fontSize: 16,
  },
  featureHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  featureDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  infoCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E40AF',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 12,
    color: '#1E3A8A',
    lineHeight: 17,
  },
  actionsWrap: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  refreshBtn: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: radius.md,
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  doneBtn: {
    backgroundColor: '#0F172A',
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  upgradeCtaBtn: {
    backgroundColor: '#EA580C',
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#EA580C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  upgradeCtaBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  freeBadge: {
    backgroundColor: '#F1F5F9',
    borderColor: '#CBD5E1',
  },
  freeBadgeText: {
    color: '#64748B',
  },
  crownCircleFree: {
    backgroundColor: '#F1F5F9',
    borderColor: '#CBD5E1',
  },
  freeStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: radius.full,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  amberDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D97706',
  },
  freeStatusPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#B45309',
    letterSpacing: 0.5,
  },
  daysLeftPillFree: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FDBA74',
  },
  daysLeftTextFree: {
    color: '#C2410C',
  },
  planInfoValPending: {
    fontSize: 13,
    fontWeight: '700',
    color: '#EA580C',
  },
  infoCardFree: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  infoTitleFree: {
    color: '#92400E',
  },
  infoTextFree: {
    color: '#78350F',
  },
});

export default PremiumStatusModal;
