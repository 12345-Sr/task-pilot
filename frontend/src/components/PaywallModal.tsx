import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore, useUIStore } from '../store';
import { useSubscribe } from '../hooks';
import { t } from '../i18n';
import { colors } from '../theme/colors';
import { radius } from '../theme/radius';
import { shadows } from '../theme/shadows';
import { BrandLogo } from './BrandLogo';

interface PaywallModalProps {
  visible?: boolean;
  onClose?: () => void;
}

export const PaywallModal: React.FC<PaywallModalProps> = ({ visible, onClose }) => {
  const insets = useSafeAreaInsets();
  const { paywallVisible, setPaywallVisible } = useUIStore();
  const { language } = useAppStore();
  const subscribeMutation = useSubscribe();

  const isVisible = visible !== undefined ? visible : paywallVisible;
  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      setPaywallVisible(false);
    }
  };

  if (!isVisible) return null;

  const features = [
    t(language, 'paywall_feat_1'),
    t(language, 'paywall_feat_2'),
    t(language, 'paywall_feat_3'),
    t(language, 'paywall_feat_4'),
  ];

  const handleSubscribe = () => {
    subscribeMutation.mutate('yearly', {
      onSuccess: () => {
        handleClose();
      },
    });
  };

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: Math.max(insets.bottom, 24) + 40 },
          ]}
        >
          {/* Top Bar */}
          <View style={styles.topBar}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={handleClose}
              accessibilityRole="button"
              accessibilityLabel="Close premium modal"
            >
              <Text style={styles.backArrow}>←</Text>
            </TouchableOpacity>
            <BrandLogo size={28} showText subtitle="" />
            <Text style={styles.decoFlower}>👑</Text>
          </View>

          {/* Title & Subtitle */}
          <Text style={styles.heroTitle}>{t(language, 'paywall_hero_title')}</Text>
          <Text style={styles.heroSub}>{t(language, 'paywall_hero_sub')}</Text>

          {/* Main Pricing & Benefits Card */}
          <View style={styles.pricingCard}>
            {/* Most Popular Badge */}
            <View style={styles.popularBadgeWrapper}>
              <View style={styles.popularBadge}>
                <Text style={styles.popularBadgeText}>{t(language, 'most_popular')}</Text>
              </View>
            </View>

            {/* Price Row */}
            <View style={styles.priceRow}>
              <Text style={styles.priceAmount}>₹499</Text>
              <Text style={styles.pricePeriod}>{t(language, 'per_month')}</Text>
            </View>

            {/* Features List */}
            <View style={styles.featureList}>
              {features.map((feat, idx) => (
                <View key={idx} style={styles.featureItem}>
                  <View style={styles.checkCircle}>
                    <Text style={styles.checkIcon}>✓</Text>
                  </View>
                  <Text style={styles.featureText}>{feat}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Action CTA */}
          <TouchableOpacity
            style={styles.subscribeBtn}
            activeOpacity={0.85}
            onPress={handleSubscribe}
            accessibilityRole="button"
            accessibilityLabel={t(language, 'start_trial_btn')}
          >
            <Text style={styles.subscribeBtnText}>{t(language, 'start_trial_btn')}</Text>
          </TouchableOpacity>

          {/* Reassurance text */}
          <Text style={styles.reassuranceText}>{t(language, 'cancel_anytime')}</Text>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  backArrow: {
    fontSize: 22,
    color: colors.primaryText,
    fontWeight: '700',
  },
  decoFlower: {
    fontSize: 24,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.primaryText,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  heroSub: {
    fontSize: 14,
    color: colors.secondaryText,
    fontWeight: '500',
    marginBottom: 24,
  },
  pricingCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: 24,
    borderWidth: 1.5,
    borderColor: '#FED7AA',
    marginBottom: 28,
    position: 'relative',
    ...shadows.card,
  },
  popularBadgeWrapper: {
    position: 'absolute',
    top: -12,
    right: 20,
  },
  popularBadge: {
    backgroundColor: colors.mediumYellow,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
  },
  popularBadgeText: {
    color: '#78350F',
    fontSize: 11,
    fontWeight: '800',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 24,
  },
  priceAmount: {
    fontSize: 34,
    fontWeight: '900',
    color: colors.primaryText,
    marginRight: 6,
  },
  pricePeriod: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.secondaryText,
  },
  featureList: {
    gap: 14,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.softGreen,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkIcon: {
    color: colors.successGreen,
    fontSize: 11,
    fontWeight: '900',
  },
  featureText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primaryText,
  },
  subscribeBtn: {
    backgroundColor: colors.primaryOrange,
    borderRadius: radius.button,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    ...shadows.card,
  },
  subscribeBtnText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '800',
  },
  reassuranceText: {
    fontSize: 12,
    color: colors.secondaryText,
    textAlign: 'center',
    fontWeight: '500',
  },
});

export default PaywallModal;
