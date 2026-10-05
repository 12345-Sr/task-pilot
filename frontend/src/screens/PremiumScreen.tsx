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
          <Text style={styles.closeText}>‹</Text>
        </TouchableOpacity>
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
          <Text style={styles.heroTitle}>Go Premium</Text>
          <Text style={styles.heroSubtitle}>More Features. More Productivity.</Text>
        </View>

        {/* 3 Days Free Trial Banner Card */}
        <View style={styles.trialBannerCard}>
          <View style={styles.trialHeaderRow}>
            <Text style={{ fontSize: 24 }}>☀️</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.trialCardTitle}>3 Days Free Trial</Text>
              <Text style={styles.trialCardSub}>
                Explore all premium features without any charges.
              </Text>
            </View>
          </View>
        </View>

        {/* Features List matching Screen 10 */}
        <View style={styles.featuresCard}>
          {[
            'Unlimited Tasks',
            'Advanced Reminders',
            'Task History',
            'Priority Support',
            'Ad-free Experience',
          ].map((feat, idx) => (
            <View key={idx} style={styles.featureRow}>
              <View style={styles.featureCheckCircle}>
                <Text style={styles.featureCheckText}>✓</Text>
              </View>
              <Text style={styles.featureItemText}>{feat}</Text>
            </View>
          ))}
        </View>

        {/* Price Card matching Screen 10 */}
        <View style={styles.priceCardMain}>
          <Text style={styles.priceValueText}>₹399 <Text style={styles.pricePeriodText}>/ month</Text></Text>
          <Text style={styles.priceCancelAnytimeText}>Cancel anytime</Text>

          <TouchableOpacity
            style={styles.startTrialBtn}
            activeOpacity={0.88}
            onPress={handleSubscribe}
          >
            <Text style={styles.startTrialBtnText}>
              {isPremium ? 'View Pro Status' : 'Start Free Trial'}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.restoreBtn}
          onPress={() => {
            Alert.alert(
              'Restore Purchase',
              'Checking purchase history with App Store / Google Play...'
            );
          }}
        >
          <Text style={styles.restoreBtnText}>
            Already a premium member? <Text style={styles.restoreUnderline}>Restore Purchase</Text>
          </Text>
        </TouchableOpacity>
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
  trialBannerCard: {
    backgroundColor: '#083B25',
    borderRadius: 16,
    padding: 16,
    marginVertical: 10,
  },
  trialHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  trialCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FCD34D',
  },
  trialCardSub: {
    fontSize: 12.5,
    fontWeight: '500',
    color: '#A7F3D0',
    marginTop: 2,
  },
  featureCheckCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureCheckText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#15803D',
  },
  featureItemText: {
    fontSize: 14.5,
    fontWeight: '600',
    color: '#0F172A',
  },
  priceCardMain: {
    backgroundColor: '#083B25',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginTop: 14,
    gap: 6,
  },
  priceValueText: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  pricePeriodText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#A7F3D0',
  },
  priceCancelAnytimeText: {
    fontSize: 13,
    color: '#A7F3D0',
    marginBottom: 8,
  },
  startTrialBtn: {
    backgroundColor: '#FCD34D',
    borderRadius: 14,
    width: '100%',
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FCD34D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
  },
  startTrialBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#083B25',
  },
  restoreBtn: {
    alignItems: 'center',
    marginTop: 14,
    paddingVertical: 8,
  },
  restoreBtnText: {
    fontSize: 12.5,
    color: '#64748B',
  },
  restoreUnderline: {
    fontWeight: '700',
    color: '#0D5C3A',
    textDecorationLine: 'underline',
  },
});

export default PremiumScreen;
