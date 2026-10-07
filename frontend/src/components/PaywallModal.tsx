import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Linking,
  AppState,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore } from '../store';
import { apiClient } from '../api/client';
import { colors } from '../theme/colors';
import { radius } from '../theme/radius';
import { shadows } from '../theme/shadows';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { BrandLogo } from './BrandLogo';
import { NotificationService } from '../services/notifications/notification.service';

interface PaywallModalProps {
  visible?: boolean;
  onClose?: () => void;
}

interface OrderData {
  orderId: string;
  keyId: string;
  amount: number;
  amountPaise: number;
  currency: string;
  checkoutUrl?: string;
  paymentLinkUrl?: string;
  planTitle: string;
  validity: string;
}

export const PaywallModal: React.FC<PaywallModalProps> = ({ visible, onClose }) => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const {
    paywallVisible,
    setPaywallVisible,
    language,
    setIsPremium,
    isPremium,
    setPremiumStatusVisible,
    user,
    isAuthenticated,
    isGuest,
  } = useAppStore();
  const isHinglish = language === 'hi';

  const isVisible = visible !== undefined ? visible : paywallVisible;

  const [loadingOrder, setLoadingOrder] = useState(false);
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [launchingGateway, setLaunchingGateway] = useState(false);
  const pollTimerRef = useRef<any>(null);

  const handleClose = () => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    if (onClose) {
      onClose();
    } else {
      setPaywallVisible(false);
    }
  };

  useEffect(() => {
    if (isVisible && isPremium) {
      handleClose();
      setPremiumStatusVisible(true);
      return;
    }
    if (isVisible) {
      if (!isAuthenticated || isGuest) {
        setLoadingOrder(false);
        return;
      }
      createPaymentOrder();
    } else {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    }
    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [isVisible, isPremium]);

  const createPaymentOrder = async () => {
    setLoadingOrder(true);
    try {
      const res: any = await apiClient.post('/subscription/create-order');
      if (res?.ok && res?.orderId) {
        setOrderData(res);
        startPaymentPolling(res.orderId);
      } else {
        throw new Error(res?.error || 'Failed to initialize payment');
      }
    } catch (err: any) {
      console.log('[PAYWALL] Backend order attempt 1 failed, retrying in 1.5s:', err?.message || err);
      // Automatic retry
      try {
        await new Promise((r) => setTimeout(r, 1500));
        const retryRes: any = await apiClient.post('/subscription/create-order');
        if (retryRes?.ok && retryRes?.orderId) {
          setOrderData(retryRes);
          startPaymentPolling(retryRes.orderId);
          return;
        }
      } catch (retryErr: any) {
        console.warn('[PAYWALL] Backend order retry also failed:', retryErr?.message || retryErr);
      }

      // Do NOT fabricate an order here. A client-made order_id (e.g. `order_${Date.now()}`)
      // and a hardcoded test key were never real Razorpay orders, so the "Pay" button looked
      // active but Razorpay checkout would always fail when it actually opened, since it never
      // matches a real order created server-side against the live key. Surface the real failure
      // instead so the user (and you, in logs) can see the backend order creation is broken.
      setOrderData(null);
      Alert.alert(
        isHinglish ? 'Payment Shuru Nahi Ho Saka' : 'Could Not Start Payment',
        isHinglish
          ? 'Server se payment order banane me dikkat aa rahi hai. Kripya thodi der baad dobara try karein.'
          : 'We could not create a payment order right now. Please try again in a moment.'
      );
    } finally {
      setLoadingOrder(false);
    }
  };

  // Listen for app returning to foreground from Chrome or deep link callback
  useEffect(() => {
    if (!isVisible) return;

    const checkSubscription = async () => {
      try {
        const statusRes: any = await apiClient.get('/subscription/status');
        if (statusRes?.isPremium || statusRes?.status === 'active') {
          handlePaymentSuccess();
        }
      } catch (e) { }
    };

    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        checkSubscription();
      }
    });

    const urlSub = Linking.addEventListener('url', (event) => {
      if (event?.url && event.url.includes('payment-success')) {
        checkSubscription();
      }
    });

    return () => {
      sub.remove();
      urlSub.remove();
    };
  }, [isVisible]);

  const startPaymentPolling = (_orderId: string) => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    pollTimerRef.current = setInterval(async () => {
      try {
        const statusRes: any = await apiClient.get('/subscription/status');
        if (statusRes?.isPremium || statusRes?.status === 'active') {
          clearInterval(pollTimerRef.current);
          pollTimerRef.current = null;
          handlePaymentSuccess();
        }
      } catch (e) {
        // Silently continue polling
      }
    }, 2500);
  };

  const handleOpenRazorpayCheckout = async () => {
    // 1. If not authenticated or in guest mode, prompt user to login/signup so their Pro subscription is linked
    if (!isAuthenticated || isGuest) {
      Alert.alert(
        isHinglish ? 'Account Zaroori Hai' : 'Account Required',
        isHinglish
          ? 'Pro subscription khareedne ke liye kripya pehle apna account banayein ya login karein, taaki aapka Pro subscription hamesha surakshit rahe.'
          : 'Please sign in or create an account first to upgrade to Pro, so your subscription is safely linked to your account.',
        [
          { text: isHinglish ? 'Baad Mein' : 'Cancel', style: 'cancel' },
          {
            text: isHinglish ? 'Login / Signup Karein' : 'Sign In / Sign Up',
            onPress: () => {
              handleClose();
              navigation.navigate('Login');
            },
          },
        ]
      );
      return;
    }

    setLaunchingGateway(true);

    const userId = user?.id || '';
    // Strictly open the clean checkout page link (never exposing key_id, order_id, email, or credentials in URL)
    const targetUrl = userId
      ? `https://taskalert.in/checkout.html?user_id=${encodeURIComponent(userId)}`
      : 'https://taskalert.in/checkout.html';



    startPaymentPolling('web_checkout');
    try {
      await Linking.openURL(targetUrl);
    } catch (err) {
      Alert.alert(
        isHinglish ? 'Browser Nahi Khula' : 'Could Not Open Browser',
        isHinglish
          ? 'Kripya apna browser (Chrome) check karein.'
          : 'Please verify that Chrome or your default browser is available.'
      );
    } finally {
      setTimeout(() => setLaunchingGateway(false), 1200);
    }
  };

  const handleVerifyPayment = async () => {
    if (!orderData) return;
    setVerifying(true);
    try {
      // 1. First check if subscription is already active (polling or callback)
      const statusRes: any = await apiClient.get('/subscription/status');
      if (statusRes?.isPremium || statusRes?.status === 'active') {
        handlePaymentSuccess();
        return;
      }

      // 2. Ask backend to check order status directly with Razorpay
      const res: any = await apiClient.post('/subscription/verify-payment', {
        order_id: orderData.orderId,
        razorpay_order_id: orderData.orderId,
      });

      if (res?.ok || res?.isPremium) {
        handlePaymentSuccess();
      } else {
        throw new Error(res?.error || 'Verification failed');
      }
    } catch (err: any) {
      Alert.alert(
        'Payment Status',
        isHinglish
          ? 'Payment abhi confirm nahi hua hai. Agar aapne Chrome me payment poora kar diya hai toh 5-10 sec wait karke dobara check karein.'
          : 'Payment not detected yet. If you completed payment in Chrome, wait 5-10 seconds and check again.',
        [
          {
            text: isHinglish ? '🔄 Dobara Check Karein' : '🔄 Check Again',
            onPress: () => handleVerifyPayment(),
          },
          {
            text: isHinglish ? 'Theek Hai' : 'OK',
            style: 'cancel',
          },
        ]
      );
    } finally {
      setVerifying(false);
    }
  };

  const handlePaymentSuccess = () => {
    setIsPremium(true);
    handleClose();

    // Fetch fresh subscription details from backend
    apiClient.get('/subscription/status').then((res: any) => {
      if (res) {
        useAppStore.getState().setSubscriptionInfo({
          status: res.status || 'active',
          currentPeriodEnd: res.currentPeriodEnd || null,
          planPrice: res.planPrice || 399,
        });
      }
    }).catch(() => { });

    NotificationService.sendLocalNotification(
      isHinglish ? '🎉 Pro Plan Active Ho Gaya!' : '🎉 Pro Plan Activated!',
      isHinglish
        ? 'Welcome to TaskAlert Pro! Unlimited reminders aur sabhi features ab unlock hain.'
        : 'Welcome to TaskAlert Pro! Unlimited reminders and all pro features are now active.',
      1
    );

    Alert.alert(
      isHinglish ? '🎉 Pro Plan Activate Ho Gaya!' : '🎉 Pro Plan Activated!',
      isHinglish
        ? 'Aapka TaskAlert Pro subscription successfully activate ho gaya hai. Ab aap bina kisi limit ke tasks bana sakte hain!'
        : 'Your TaskAlert Pro subscription is now active! Enjoy unlimited reminders and full productivity tools.',
      [
        {
          text: isHinglish ? 'Details & Status Dekhein 👑' : 'View Pro Details 👑',
          onPress: () => {
            setPremiumStatusVisible(true);
          },
        },
        {
          text: isHinglish ? 'Shuru Karein 🚀' : 'Get Started 🚀',
          style: 'cancel',
        },
      ]
    );
  };

  if (!isVisible) return null;

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
            accessibilityLabel="Close"
          >
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
          <View style={styles.headerBrand}>
            <BrandLogo size={22} showText={false} />
            <Text style={styles.headerBrandTitle}>
              <Text style={{ color: '#0F172A' }}>Task</Text>
              <Text style={{ color: '#EAB308' }}>Alert</Text>
              <Text style={{ color: '#0D5C3A', fontWeight: '900' }}> PRO</Text>
            </Text>
          </View>
          <View style={styles.shieldPill}>
            <Text style={styles.shieldPillText}>🔒 Secure</Text>
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
          {/* Clean Hero matching Screen 10 */}
          <View style={styles.heroSection}>
            <View style={styles.crownCircle}>
              <Text style={styles.crownEmoji}>👑</Text>
            </View>
            <Text style={styles.heroTitle}>Go Premium</Text>
            <Text style={styles.heroSubtitle}>
              {isHinglish
                ? 'Behtar Focus. Har Kaam Time Par.'
                : 'More Features. More Productivity.'}
            </Text>
          </View>

          {/* Features Card matching Screen 10 */}
          <View style={styles.featuresCard}>
            {[
              isHinglish ? 'Unlimited Tasks aur Daily Reminders' : 'Unlimited Tasks & Daily Reminders',
              isHinglish ? 'Advance Audio Alerts aur Voice Alarms' : 'Advanced Audio Alerts & Ringing Alarms',
              isHinglish ? 'Poora Task History aur Safe Records' : 'Complete Task History & Archive Records',
              isHinglish ? '30 Din Ka Monthly Task Repeat' : '30-Day Monthly Task Recurring',
              isHinglish ? 'Priority Support aur Ad-Free Experience' : 'Priority 24/7 Support & Ad-Free',
            ].map((feat, idx) => (
              <View key={idx} style={styles.featureRow}>
                <View style={styles.featureCheckCircle}>
                  <Text style={styles.featureCheckText}>✓</Text>
                </View>
                <Text style={styles.featureItemText}>{feat}</Text>
              </View>
            ))}
          </View>

          {/* Price & Checkout Card matching Screen 10 */}
          <View style={styles.priceCardMain}>
            <View style={styles.priceHeaderRow}>
              <View>
                <View style={styles.priceValueRow}>
                  <Text style={styles.priceCurrency}>₹</Text>
                  <Text style={styles.priceNumber}>399</Text>
                  <Text style={styles.pricePeriodText}>{isHinglish ? ' / mahina' : ' / month'}</Text>
                </View>
                <Text style={styles.priceCancelAnytimeText}>
                  {isHinglish ? 'Cancel anytime • Turant unlock' : 'Cancel anytime • Instant unlock'}
                </Text>
              </View>
            </View>

            {/* Direct Razorpay Checkout Action */}
            <TouchableOpacity
              style={[styles.primaryPayBtn, (launchingGateway || loadingOrder) && styles.btnDisabled]}
              activeOpacity={0.88}
              onPress={handleOpenRazorpayCheckout}
              disabled={launchingGateway || loadingOrder}
            >
              <LinearGradient
                colors={['#0D5C3A', '#15803D']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.primaryPayBtnGradient}
              >
                {launchingGateway || loadingOrder ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <ActivityIndicator color="#FFFFFF" size="small" />
                    <Text style={styles.primaryPayBtnText}>
                      {isHinglish ? 'Razorpay Khul Raha Hai...' : 'Opening Checkout...'}
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.primaryPayBtnText}>
                    {isHinglish ? '💳 Pay ₹399 with Razorpay' : '💳 Pay ₹399 with Razorpay'}
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <Text style={styles.secureGatewayNote}>
              🔒 100% Safe Checkout via Razorpay • UPI, Cards & NetBanking
            </Text>
          </View>

          {/* Verification Footnote if user paid in browser */}
          <TouchableOpacity
            style={styles.verifyLinkBtn}
            onPress={handleVerifyPayment}
            activeOpacity={0.7}
            disabled={verifying}
          >
            {verifying ? (
              <ActivityIndicator color="#0D5C3A" size="small" />
            ) : (
              <Text style={styles.verifyLinkText}>
                {isHinglish
                  ? 'Payment kar diya hai? Status verify karne ke liye yahan tap karein ›'
                  : 'Already paid? Tap here to verify payment status ›'}
              </Text>
            )}
          </TouchableOpacity>
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  headerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  headerBrandTitle: {
    ...typography.h3,
    letterSpacing: -0.3,
  },
  shieldPill: {
    backgroundColor: colors.softYellow,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.mediumYellow,
  },
  shieldPillText: {
    fontSize: 11,
    color: '#B45309',
    fontWeight: '800',
  },
  scrollView: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  crownCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#DCFCE7',
    borderWidth: 2,
    borderColor: '#86EFAC',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  crownEmoji: {
    fontSize: 32,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 4,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 13.5,
    color: '#64748B',
    fontWeight: '500',
    textAlign: 'center',
  },
  featuresCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 18,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
    fontSize: 12,
    fontWeight: '800',
    color: '#15803D',
  },
  featureItemText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    flex: 1,
  },
  priceCardMain: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1.5,
    borderColor: '#DCFCE7',
    marginBottom: 14,
    shadowColor: '#0D5C3A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  priceHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  priceValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  priceCurrency: {
    fontSize: 22,
    fontWeight: '800',
    color: '#EAB308',
  },
  priceNumber: {
    fontSize: 34,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.5,
    marginLeft: 2,
  },
  pricePeriodText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    marginLeft: 4,
  },
  priceCancelAnytimeText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  discountBadge: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECDD3',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  discountBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#DC2626',
    letterSpacing: 0.4,
  },
  primaryPayBtn: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#0D5C3A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryPayBtnGradient: {
    paddingVertical: 15,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryPayBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  btnDisabled: {
    opacity: 0.65,
  },
  secureGatewayNote: {
    fontSize: 11.5,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 10,
    fontWeight: '500',
  },
  verifyLinkBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  verifyLinkText: {
    fontSize: 12.5,
    color: '#0D5C3A',
    fontWeight: '700',
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
});

export default PaywallModal;