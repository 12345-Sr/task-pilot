import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore } from '../store';
import { apiClient } from '../api/client';
import { colors } from '../theme/colors';
import { radius } from '../theme/radius';
import { shadows } from '../theme/shadows';
import { BrandLogo } from './BrandLogo';
import { NotificationService } from '../services/notifications/notification.service';

const RNImage = Image as any;

type PaymentTab = 'all' | 'upi' | 'qr';

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
  upiUrl: string;
  qrImageUrl: string;
  merchantVpa: string;
  planTitle: string;
  validity: string;
}

export const PaywallModal: React.FC<PaywallModalProps> = ({ visible, onClose }) => {
  const insets = useSafeAreaInsets();
  const { paywallVisible, setPaywallVisible, language, setIsPremium } = useAppStore();
  const isHinglish = language === 'hi';

  const isVisible = visible !== undefined ? visible : paywallVisible;

  const [activeTab, setActiveTab] = useState<PaymentTab>('all');
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
    if (isVisible) {
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
  }, [isVisible]);

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
      console.log('[PAYWALL] Backend order note:', err?.message || err);
      const mockOrderId = `order_${Date.now()}`;
      const upiUrl = `upi://pay?pa=taskpilot.rzp@icici&pn=Task%20Pilot&tr=${mockOrderId}&am=399.00&cu=INR&tn=Task%20Pilot%20Pro%20Plan`;
      setOrderData({
        orderId: mockOrderId,
        keyId: 'rzp_test_TZW0dzD6BHG8kK',
        amount: 399,
        amountPaise: 39900,
        currency: 'INR',
        checkoutUrl: `https://task-pilot-api.onrender.com/api/subscription/checkout?order_id=${mockOrderId}`,
        upiUrl,
        qrImageUrl: `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(upiUrl)}&margin=10`,
        merchantVpa: 'taskpilot.rzp@icici',
        planTitle: 'Task Pilot Pro Plan',
        validity: '30 Days',
      });
    } finally {
      setLoadingOrder(false);
    }
  };

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
    }, 3000);
  };

  const handleOpenRazorpayCheckout = async () => {
    setLaunchingGateway(true);
    const fallbackUrl = `https://task-pilot-api.onrender.com/api/subscription/checkout${orderData?.orderId ? `?order_id=${orderData.orderId}` : ''}`;
    const url = orderData?.checkoutUrl || fallbackUrl;
    try {
      await Linking.openURL(url);
    } catch (err) {
      Alert.alert(
        isHinglish ? 'Checkout Nahi Khula' : 'Could Not Open Checkout',
        isHinglish
          ? 'Kripya apna browser check karein ya neeche diye gaye UPI option se pay karein.'
          : 'Please check your browser or use the UPI payment option below.'
      );
    } finally {
      setTimeout(() => setLaunchingGateway(false), 1200);
    }
  };

  const handleOpenSpecificUpiApp = async (scheme: string, appName: string) => {
    if (!orderData?.upiUrl) return;
    try {
      const query = orderData.upiUrl.replace(/^upi:\/\/pay\?/, '');
      let appUrl = orderData.upiUrl;
      if (scheme === 'phonepe') {
        appUrl = `phonepe://pay?${query}`;
      } else if (scheme === 'gpay') {
        appUrl = `tez://upi/pay?${query}`;
      } else if (scheme === 'paytm') {
        appUrl = `paytmmp://pay?${query}`;
      }

      const supported = await Linking.canOpenURL(appUrl);
      if (supported) {
        await Linking.openURL(appUrl);
      } else {
        await Linking.openURL(orderData.upiUrl);
      }
    } catch (err) {
      // If direct deep link isn't supported, fall back to general UPI or Razorpay
      try {
        await Linking.openURL(orderData.upiUrl);
      } catch (e) {
        Alert.alert(
          `${appName} ${isHinglish ? 'Nahi Mila' : 'Not Found'}`,
          isHinglish
            ? `Aapke phone me ${appName} app nahi mila. Kripya Razorpay Gateway ya QR Code ka upyog karein.`
            : `${appName} could not be opened. Please use the Razorpay Gateway or Scan QR option.`
        );
      }
    }
  };

  const handleVerifyPayment = async () => {
    if (!orderData) return;
    setVerifying(true);
    try {
      const res: any = await apiClient.post('/subscription/verify-payment', {
        order_id: orderData.orderId,
        razorpay_order_id: orderData.orderId,
        razorpay_payment_id: `pay_${Date.now()}`,
      });

      if (res?.ok || res?.isPremium) {
        handlePaymentSuccess();
      } else {
        throw new Error(res?.error || 'Verification failed');
      }
    } catch (err: any) {
      // Check current live status from server
      try {
        const statusRes: any = await apiClient.get('/subscription/status');
        if (statusRes?.isPremium || statusRes?.status === 'active') {
          handlePaymentSuccess();
          return;
        }
      } catch (e) {}

      Alert.alert(
        isHinglish ? 'Payment Status Check' : 'Payment Status',
        isHinglish
          ? 'Agar aapne payment poora kar diya hai, toh kripya 5 second intezaar karke dobara tap karein. Bank confirmation milte hi Pro automatically unlock ho jayega.'
          : 'If you have completed the payment, please wait a few seconds and tap verify again. Pro features will unlock automatically upon confirmation.'
      );
    } finally {
      setVerifying(false);
    }
  };

  const handlePaymentSuccess = () => {
    setIsPremium(true);

    NotificationService.sendLocalNotification(
      isHinglish ? '🎉 Pro Plan Active Ho Gaya!' : '🎉 Pro Plan Activated!',
      isHinglish
        ? 'Welcome to Task Pilot Pro! Unlimited reminders aur sabhi features ab unlock hain.'
        : 'Welcome to Task Pilot Pro! Unlimited reminders and all pro features are now active.',
      1
    );

    Alert.alert(
      isHinglish ? '🎉 Pro Plan Activate Ho Gaya!' : '🎉 Pro Plan Activated!',
      isHinglish
        ? 'Aapka Task Pilot Pro subscription successfully activate ho gaya hai. Ab aap bina kisi limit ke tasks bana sakte hain!'
        : 'Your Task Pilot Pro subscription is now active! Enjoy unlimited reminders and full productivity tools.',
      [{ text: isHinglish ? 'Shuru Karein 🚀' : 'Get Started 🚀', onPress: handleClose }]
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
          >
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
          <View style={styles.headerBrand}>
            <BrandLogo size={26} showText={false} />
            <Text style={styles.headerBrandTitle}>
              <Text style={{ color: '#0F172A' }}>Task</Text>
              <Text style={{ color: '#EAB308' }}>Pilot</Text>
              <Text style={{ color: colors.primary, fontWeight: '900' }}> PRO</Text>
            </Text>
          </View>
          <View style={styles.shieldPill}>
            <Text style={styles.shieldPillText}>🛡️ Razorpay</Text>
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom, 24) + 40 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Banner */}
          <View style={styles.heroCard}>
            <View style={styles.crownBadge}>
              <Text style={styles.crownEmoji}>👑</Text>
            </View>
            <Text style={styles.heroHeading}>
              {isHinglish ? 'Task Pilot Pro Unlock Karein' : 'Unlock Task Pilot Pro'}
            </Text>
            <Text style={styles.heroSub}>
              {isHinglish
                ? 'Unlimited task reminders, proactive advance alerts aur poora power paayein.'
                : 'Unlimited task reminders, proactive sound alerts, and full productivity power.'}
            </Text>

            {/* Price Tag */}
            <View style={styles.priceContainer}>
              <View style={styles.priceRow}>
                <Text style={styles.currencySymbol}>₹</Text>
                <Text style={styles.priceNumber}>399</Text>
                <Text style={styles.pricePeriod}>{isHinglish ? ' / mahina' : ' / month'}</Text>
              </View>
              <View style={styles.offerBadge}>
                <Text style={styles.offerBadgeText}>
                  {isHinglish ? '🔥 50% LIMITED DISCOUNT' : '🔥 50% LIMITED DISCOUNT'}
                </Text>
              </View>
            </View>
          </View>

          {/* Interactive Payment Method Tabs */}
          <View style={styles.tabBarContainer}>
            <TouchableOpacity
              style={[styles.tabItem, activeTab === 'all' && styles.tabItemActive]}
              onPress={() => setActiveTab('all')}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabItemText, activeTab === 'all' && styles.tabItemTextActive]}>
                💳 {isHinglish ? 'All Methods' : 'All Methods'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabItem, activeTab === 'upi' && styles.tabItemActive]}
              onPress={() => setActiveTab('upi')}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabItemText, activeTab === 'upi' && styles.tabItemTextActive]}>
                📱 {isHinglish ? 'UPI Apps' : 'UPI Apps'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabItem, activeTab === 'qr' && styles.tabItemActive]}
              onPress={() => setActiveTab('qr')}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabItemText, activeTab === 'qr' && styles.tabItemTextActive]}>
                ⚡ {isHinglish ? 'Scan QR' : 'Scan QR'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* TAB 1: ALL METHODS (Official Razorpay Gateway) */}
          {activeTab === 'all' && (
            <View style={styles.rzpGatewayCard}>
              <View style={styles.rzpCardHeader}>
                <View style={styles.rzpBadge}>
                  <Text style={styles.rzpBadgeText}>🛡️ OFFICIAL RAZORPAY GATEWAY</Text>
                </View>
                <Text style={styles.rzpCardTitle}>
                  {isHinglish ? 'Sabhi Payment Tarike Accepted' : 'All Payment Methods Accepted'}
                </Text>
                <Text style={styles.rzpCardSub}>
                  {isHinglish
                    ? 'Debit/Credit Card, UPI, Net Banking ya Wallets se turant pay karein.'
                    : 'Pay securely using any Card, UPI App, Net Banking, or Wallet.'}
                </Text>
              </View>

              {/* Methods Grid */}
              <View style={styles.methodsGrid}>
                <View style={styles.methodGridItem}>
                  <Text style={styles.methodGridIcon}>💳</Text>
                  <View style={styles.methodGridTextWrap}>
                    <Text style={styles.methodGridTitle}>Cards</Text>
                    <Text style={styles.methodGridDesc}>Visa, RuPay, Master</Text>
                  </View>
                </View>

                <View style={styles.methodGridItem}>
                  <Text style={styles.methodGridIcon}>📱</Text>
                  <View style={styles.methodGridTextWrap}>
                    <Text style={styles.methodGridTitle}>UPI</Text>
                    <Text style={styles.methodGridDesc}>GPay, PhonePe, Any UPI</Text>
                  </View>
                </View>

                <View style={styles.methodGridItem}>
                  <Text style={styles.methodGridIcon}>🏦</Text>
                  <View style={styles.methodGridTextWrap}>
                    <Text style={styles.methodGridTitle}>Net Banking</Text>
                    <Text style={styles.methodGridDesc}>50+ Indian Banks</Text>
                  </View>
                </View>

                <View style={styles.methodGridItem}>
                  <Text style={styles.methodGridIcon}>👛</Text>
                  <View style={styles.methodGridTextWrap}>
                    <Text style={styles.methodGridTitle}>Wallets</Text>
                    <Text style={styles.methodGridDesc}>Paytm, PayLater</Text>
                  </View>
                </View>
              </View>

              {/* Primary CTA Button */}
              <TouchableOpacity
                style={[styles.payRazorpayBtn, launchingGateway && styles.btnDisabled]}
                activeOpacity={0.88}
                onPress={handleOpenRazorpayCheckout}
                disabled={launchingGateway}
              >
                {launchingGateway ? (
                  <ActivityIndicator color="#0F172A" size="small" />
                ) : (
                  <>
                    <Text style={styles.payRazorpayBtnText}>
                      💳 {isHinglish ? 'Pay ₹399 with Razorpay' : 'Pay ₹399 with Razorpay'}
                    </Text>
                    <Text style={styles.payRazorpayBtnSubText}>
                      {isHinglish
                        ? '⚡ Cards · UPI · Net Banking · Wallets'
                        : '⚡ Open secure gateway with all payment options'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* TAB 2: DIRECT UPI APPS */}
          {activeTab === 'upi' && (
            <View style={styles.upiAppsCard}>
              <Text style={styles.upiAppsTitle}>
                {isHinglish ? 'Direct Apne UPI App Se Pay Karein' : 'Pay Directly via Installed UPI App'}
              </Text>
              <Text style={styles.upiAppsSub}>
                {isHinglish
                  ? 'Neeche diye gaye kisi bhi app par tap karein aur turant payment poora karein:'
                  : 'Tap any app below to pay ₹399 directly:'}
              </Text>

              {/* UPI App Buttons Grid */}
              <View style={styles.upiBtnGrid}>
                {/* PhonePe */}
                <TouchableOpacity
                  style={[styles.upiAppBtn, { borderColor: '#7C3AED' }]}
                  activeOpacity={0.8}
                  onPress={() => handleOpenSpecificUpiApp('phonepe', 'PhonePe')}
                >
                  <Text style={styles.upiAppIcon}>🟣</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.upiAppName}>PhonePe</Text>
                    <Text style={styles.upiAppDesc}>{isHinglish ? 'Direct Pay Karein' : 'Instant Pay'}</Text>
                  </View>
                  <Text style={styles.upiAppArrow}>→</Text>
                </TouchableOpacity>

                {/* Google Pay */}
                <TouchableOpacity
                  style={[styles.upiAppBtn, { borderColor: '#2563EB' }]}
                  activeOpacity={0.8}
                  onPress={() => handleOpenSpecificUpiApp('gpay', 'Google Pay')}
                >
                  <Text style={styles.upiAppIcon}>🔵</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.upiAppName}>Google Pay</Text>
                    <Text style={styles.upiAppDesc}>{isHinglish ? 'GPay Me Kholein' : 'Open in GPay'}</Text>
                  </View>
                  <Text style={styles.upiAppArrow}>→</Text>
                </TouchableOpacity>

                {/* Paytm */}
                <TouchableOpacity
                  style={[styles.upiAppBtn, { borderColor: '#0284C7' }]}
                  activeOpacity={0.8}
                  onPress={() => handleOpenSpecificUpiApp('paytm', 'Paytm')}
                >
                  <Text style={styles.upiAppIcon}>🔷</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.upiAppName}>Paytm UPI</Text>
                    <Text style={styles.upiAppDesc}>{isHinglish ? 'Paytm Me Kholein' : 'Open in Paytm'}</Text>
                  </View>
                  <Text style={styles.upiAppArrow}>→</Text>
                </TouchableOpacity>

                {/* BHIM / Other */}
                <TouchableOpacity
                  style={[styles.upiAppBtn, { borderColor: '#EA580C' }]}
                  activeOpacity={0.8}
                  onPress={() => handleOpenSpecificUpiApp('upi', 'UPI App')}
                >
                  <Text style={styles.upiAppIcon}>🟠</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.upiAppName}>{isHinglish ? 'Any UPI / BHIM' : 'Any UPI App'}</Text>
                    <Text style={styles.upiAppDesc}>{isHinglish ? 'App Selector Kholein' : 'Choose Installed App'}</Text>
                  </View>
                  <Text style={styles.upiAppArrow}>→</Text>
                </TouchableOpacity>
              </View>

              {/* Merchant Details Box */}
              <View style={styles.merchantDetailBox}>
                <Text style={styles.merchantDetailLabel}>
                  {isHinglish ? 'Merchant:' : 'Merchant:'}{' '}
                  <Text style={styles.merchantDetailValue}>Task Pilot Pro</Text>
                </Text>
                <Text style={styles.merchantDetailLabel}>
                  {isHinglish ? 'UPI ID:' : 'UPI ID:'}{' '}
                  <Text style={styles.merchantDetailValue}>
                    {orderData?.merchantVpa || 'taskpilot.rzp@icici'}
                  </Text>
                </Text>
                <Text style={styles.merchantDetailLabel}>
                  {isHinglish ? 'Rakam:' : 'Amount:'}{' '}
                  <Text style={[styles.merchantDetailValue, { color: '#C5A059' }]}>₹399.00</Text>
                </Text>
              </View>
            </View>
          )}

          {/* TAB 3: SCAN QR CODE */}
          {activeTab === 'qr' && (
            <View style={styles.qrSectionCard}>
              <View style={styles.qrHeaderRow}>
                <View style={styles.qrTitleWrap}>
                  <Text style={styles.qrMainTitle}>
                    {isHinglish ? '📱 Scan & Pay via Any UPI' : '📱 Scan & Pay via Any UPI'}
                  </Text>
                  <Text style={styles.qrSubTitle}>
                    Google Pay • PhonePe • Paytm • BHIM • Cred
                  </Text>
                </View>
                <View style={styles.livePulseBadge}>
                  <View style={styles.pulseDot} />
                  <Text style={styles.pulseText}>LIVE QR</Text>
                </View>
              </View>

              {/* QR Image Container */}
              <View style={styles.qrFrame}>
                {loadingOrder ? (
                  <View style={styles.qrLoadingBox}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.qrLoadingText}>
                      {isHinglish ? 'Secure QR load ho raha hai...' : 'Loading Secure QR...'}
                    </Text>
                  </View>
                ) : orderData?.qrImageUrl ? (
                  <View style={styles.qrImageWrapper}>
                    <RNImage
                      source={{ uri: orderData.qrImageUrl }}
                      style={styles.qrImage}
                      resizeMode="contain"
                    />
                    <View style={styles.qrCenterLogoOverlay}>
                      <Text style={{ fontSize: 16 }}>⚡</Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.qrLoadingBox}>
                    <ActivityIndicator size="large" color={colors.primary} />
                  </View>
                )}

                {/* Amount Pill */}
                <View style={styles.amountPill}>
                  <Text style={styles.amountPillText}>Total Amount: ₹399.00</Text>
                </View>
              </View>

              {/* Direct Mobile UPI App Button */}
              <TouchableOpacity
                style={styles.payAppBtn}
                activeOpacity={0.85}
                onPress={() => handleOpenSpecificUpiApp('upi', 'UPI App')}
              >
                <Text style={styles.payAppBtnIcon}>📱</Text>
                <Text style={styles.payAppBtnText}>
                  {isHinglish ? 'Direct PhonePe / GPay Me Kholein' : 'Open in PhonePe / GPay'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Real-time Status Radar & Manual Verify Button */}
          <View style={styles.verificationSection}>
            <View style={styles.liveRadarRow}>
              <View style={styles.radarPulseRing}>
                <View style={styles.radarCenterDot} />
              </View>
              <Text style={styles.liveRadarText}>
                {isHinglish
                  ? 'Auto-Detection Active: Payment detect hote hi Pro turant unlock ho jayega.'
                  : 'Auto-Detection Active: Pro unlocks automatically once payment is detected.'}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.verifyBtn, verifying && styles.verifyBtnDisabled]}
              activeOpacity={0.85}
              onPress={handleVerifyPayment}
              disabled={verifying}
            >
              {verifying ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.verifyBtnText}>
                  {isHinglish ? '🔄 Payment Status Check Karein (Verify)' : '🔄 Check Payment Status (Verify)'}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Pro Benefits List */}
          <View style={styles.benefitsCard}>
            <Text style={styles.benefitsHeading}>
              {isHinglish ? 'Pro Subscription Ke Fayde' : 'What You Get With Pro'}
            </Text>

            <View style={styles.benefitRow}>
              <View style={styles.benefitIconWrap}>
                <Text style={styles.benefitIcon}>🚀</Text>
              </View>
              <View style={styles.benefitTextWrap}>
                <Text style={styles.benefitTitle}>
                  {isHinglish ? 'Unlimited Daily Tasks' : 'Unlimited Daily Tasks'}
                </Text>
                <Text style={styles.benefitDesc}>
                  {isHinglish
                    ? 'Bina kisi 3-task limit ke har roz naye kaam banayein aur schedule karein.'
                    : 'Create and schedule unlimited tasks daily without any limits.'}
                </Text>
              </View>
            </View>

            <View style={styles.benefitRow}>
              <View style={styles.benefitIconWrap}>
                <Text style={styles.benefitIcon}>🔔</Text>
              </View>
              <View style={styles.benefitTextWrap}>
                <Text style={styles.benefitTitle}>
                  {isHinglish ? '2 Proactive Advance Audio Alerts' : '2 Proactive Advance Audio Alerts'}
                </Text>
                <Text style={styles.benefitDesc}>
                  {isHinglish
                    ? 'Har kaam ke 2 alerts: 10 minute pehle warning aur exact samay par notification.'
                    : '2 audio alerts for every task: 10 minutes prior warning and at deadline.'}
                </Text>
              </View>
            </View>

            <View style={styles.benefitRow}>
              <View style={styles.benefitIconWrap}>
                <Text style={styles.benefitIcon}>🔁</Text>
              </View>
              <View style={styles.benefitTextWrap}>
                <Text style={styles.benefitTitle}>
                  {isHinglish ? 'Repeat Tasks For Whole Month' : 'Repeat Tasks For Whole Month'}
                </Text>
                <Text style={styles.benefitDesc}>
                  {isHinglish
                    ? 'Ek tap me pure 30 dino ke liye recurring tasks schedule karein.'
                    : 'Schedule tasks once to automatically repeat daily for all 30 days.'}
                </Text>
              </View>
            </View>

            <View style={styles.benefitRow}>
              <View style={styles.benefitIconWrap}>
                <Text style={styles.benefitIcon}>📊</Text>
              </View>
              <View style={styles.benefitTextWrap}>
                <Text style={styles.benefitTitle}>
                  {isHinglish ? 'Daily Streak & Analytics' : 'Daily Streak & Analytics'}
                </Text>
                <Text style={styles.benefitDesc}>
                  {isHinglish
                    ? 'Apna daily discipline banayein aur progress track karein.'
                    : 'Build consistent habits and track your completion streaks.'}
                </Text>
              </View>
            </View>
          </View>

          {/* Trust & Guarantee Banner */}
          <View style={styles.trustBanner}>
            <Text style={styles.trustIcon}>🔒</Text>
            <Text style={styles.trustText}>
              {isHinglish
                ? 'Razorpay Certified 256-Bit SSL Secured Payment. Kisi bhi samay cancel karein.'
                : 'Razorpay Certified 256-Bit SSL Secured Payment. Cancel anytime.'}
            </Text>
          </View>
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
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: colors.surface,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#64748B',
  },
  headerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerBrandTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  shieldPill: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F59E0B',
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
    paddingHorizontal: 18,
    paddingTop: 16,
  },
  heroCard: {
    backgroundColor: colors.headerWarm,
    borderRadius: radius.xl || 20,
    padding: 22,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FDE68A',
    marginBottom: 16,
    ...shadows.card,
  },
  crownBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FEF3C7',
    borderWidth: 2,
    borderColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  crownEmoji: {
    fontSize: 28,
  },
  heroHeading: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.textPrimary,
    textAlign: 'center',
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  heroSub: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 16,
    paddingHorizontal: 10,
  },
  priceContainer: {
    alignItems: 'center',
    gap: 8,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.primary,
  },
  priceNumber: {
    fontSize: 40,
    fontWeight: '900',
    color: colors.textPrimary,
    letterSpacing: -1,
  },
  pricePeriod: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  offerBadge: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  offerBadgeText: {
    fontSize: 11,
    color: '#DC2626',
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  tabBarContainer: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    padding: 4,
    borderRadius: 14,
    marginBottom: 16,
    gap: 4,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  tabItemActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  tabItemText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#64748B',
  },
  tabItemTextActive: {
    color: '#0F172A',
    fontWeight: '900',
  },
  rzpGatewayCard: {
    backgroundColor: '#0F172A',
    borderRadius: radius.xl || 20,
    padding: 20,
    borderWidth: 1.5,
    borderColor: '#C5A059',
    marginBottom: 16,
    ...shadows.card,
  },
  rzpCardHeader: {
    marginBottom: 16,
  },
  rzpBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(197, 160, 89, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C5A059',
    marginBottom: 8,
  },
  rzpBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#EAB308',
    letterSpacing: 0.5,
  },
  rzpCardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  rzpCardSub: {
    fontSize: 12.5,
    color: '#94A3B8',
    lineHeight: 18,
  },
  methodsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 18,
  },
  methodGridItem: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1E293B',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  methodGridIcon: {
    fontSize: 20,
  },
  methodGridTextWrap: {
    flex: 1,
  },
  methodGridTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  methodGridDesc: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 1,
  },
  payRazorpayBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  payRazorpayBtnText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 0.2,
  },
  payRazorpayBtnSubText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
    marginTop: 2,
    textAlign: 'center',
  },
  upiAppsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.xl || 20,
    padding: 18,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    marginBottom: 16,
    ...shadows.card,
  },
  upiAppsTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  upiAppsSub: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 17,
    marginBottom: 14,
  },
  upiBtnGrid: {
    gap: 10,
    marginBottom: 14,
  },
  upiAppBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  upiAppIcon: {
    fontSize: 22,
  },
  upiAppName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  upiAppDesc: {
    fontSize: 11,
    color: '#64748B',
  },
  upiAppArrow: {
    fontSize: 18,
    fontWeight: '800',
    color: '#94A3B8',
  },
  merchantDetailBox: {
    backgroundColor: '#F1F5F9',
    padding: 10,
    borderRadius: 10,
    gap: 4,
  },
  merchantDetailLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  merchantDetailValue: {
    color: '#0F172A',
    fontWeight: '800',
  },
  qrSectionCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl || 20,
    padding: 20,
    borderWidth: 1.5,
    borderColor: '#FEF08A',
    marginBottom: 16,
    alignItems: 'center',
    ...shadows.card,
  },
  qrHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 16,
  },
  qrTitleWrap: {
    flex: 1,
  },
  qrMainTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  qrSubTitle: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  livePulseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#DC2626',
  },
  pulseText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#DC2626',
    letterSpacing: 0.5,
  },
  qrFrame: {
    width: 220,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    marginBottom: 16,
    ...shadows.card,
  },
  qrLoadingBox: {
    width: 196,
    height: 196,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  qrLoadingText: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  qrImageWrapper: {
    width: 196,
    height: 196,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrImage: {
    width: '100%',
    height: '100%',
  },
  qrCenterLogoOverlay: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  amountPill: {
    marginTop: 8,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  amountPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#B45309',
  },
  payAppBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    backgroundColor: '#4F46E5',
    paddingVertical: 12,
    borderRadius: 12,
  },
  payAppBtnIcon: {
    fontSize: 16,
  },
  payAppBtnText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  verificationSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.xl || 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
    gap: 12,
    ...shadows.card,
  },
  liveRadarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F0FDF4',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  radarPulseRing: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radarCenterDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#16A34A',
  },
  liveRadarText: {
    flex: 1,
    fontSize: 11.5,
    fontWeight: '600',
    color: '#166534',
    lineHeight: 16,
  },
  verifyBtn: {
    backgroundColor: '#10B981',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  verifyBtnDisabled: {
    opacity: 0.6,
  },
  verifyBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  benefitsCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl || 20,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
    ...shadows.card,
  },
  benefitsHeading: {
    fontSize: 15.5,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 16,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    marginBottom: 14,
  },
  benefitIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF9F0',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  benefitIcon: {
    fontSize: 18,
  },
  benefitTextWrap: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  benefitDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
  },
  trustBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  trustIcon: {
    fontSize: 16,
  },
  trustText: {
    fontSize: 11.5,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
  },
});

export default PaywallModal;
