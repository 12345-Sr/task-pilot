import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  BackHandler,
  AppState,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import { useAppStore } from '../store';
import { apiClient } from '../api/client';
import { BrandLogo } from '../components/BrandLogo';
import { NotificationService } from '../services/notifications/notification.service';

type PaymentScreenState = 'loading_order' | 'checkout' | 'verifying' | 'success' | 'failed' | 'cancelled';

interface RouteParams {
  orderData?: {
    orderId: string;
    keyId: string;
    amount: number;
    amountPaise: number;
    currency: string;
    planTitle?: string;
  };
  planPrice?: number;
  planTitle?: string;
}

export const PaymentCheckoutScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const {
    language,
    user,
    isAuthenticated,
    isGuest,
    setIsPremium,
    setSubscriptionInfo,
    setPremiumStatusVisible,
  } = useAppStore();
  const isHinglish = language === 'hi';

  const params: RouteParams = route.params || {};
  const [screenState, setScreenState] = useState<PaymentScreenState>('loading_order');
  const [order, setOrder] = useState<any>(params.orderData || null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [paymentSuccessDetails, setPaymentSuccessDetails] = useState<{
    paymentId: string;
    orderId: string;
  } | null>(null);

  const webViewRef = useRef<WebView>(null);
  const verifyTimerRef = useRef<any>(null);

  useEffect(() => {
    const backAction = () => {
      if (screenState === 'verifying') {
        Alert.alert(
          isHinglish ? 'Payment Verify Ho Raha Hai' : 'Payment Being Verified',
          isHinglish
            ? 'Kripya thoda intezar karein, aapka payment verify ho raha hai.'
            : 'Please wait a moment while your payment is being verified.'
        );
        return true;
      }
      handleCancelOrClose();
      return true;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => {
      backHandler.remove();
      if (verifyTimerRef.current) clearTimeout(verifyTimerRef.current);
    };
  }, [screenState]);

  useEffect(() => {
    if (!isAuthenticated || isGuest) {
      Alert.alert(
        isHinglish ? 'Account Zaroori Hai' : 'Account Required',
        isHinglish
          ? 'Pro subscription ke liye kripya pehle apna account banayein ya login karein.'
          : 'Please sign in or create an account first to upgrade to Pro.',
        [
          { text: isHinglish ? 'Baad Mein' : 'Cancel', onPress: () => navigation.goBack() },
          {
            text: isHinglish ? 'Login / Signup' : 'Sign In',
            onPress: () => {
              navigation.goBack();
              navigation.navigate('Login');
            },
          },
        ]
      );
      return;
    }

    if (order && order.orderId && order.keyId) {
      setScreenState('checkout');
    } else {
      initializeOrder();
    }
  }, []);

  // Listen for app returning to foreground when user returns from GPay, PhonePe, or other UPI apps
  useEffect(() => {
    const handleAppStateChange = async (nextState: string) => {
      if (nextState === 'active' && order?.orderId && screenState !== 'success') {
        try {
          const statusRes: any = await apiClient.get('/subscription/status');
          if (statusRes?.isPremium || statusRes?.status === 'active') {
            onActivationSuccess('upi_auto_detected', order.orderId);
            return;
          }
          const verifyRes: any = await apiClient.post('/subscription/verify-payment', {
            order_id: order.orderId,
            razorpay_order_id: order.orderId,
          });
          if (verifyRes?.ok || verifyRes?.isPremium) {
            onActivationSuccess(verifyRes?.subscription?.provider_customer_id || 'upi_verified', order.orderId);
          }
        } catch (e) {
          // Silently wait for manual verify or polling
        }
      }
    };

    const sub = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      sub.remove();
    };
  }, [order, screenState]);

  const initializeOrder = async () => {
    setScreenState('loading_order');
    setErrorMessage('');
    try {
      const res: any = await apiClient.post('/subscription/create-order');
      if (res?.ok && res?.orderId && res?.keyId) {
        setOrder(res);
        setScreenState('checkout');
      } else {
        throw new Error(res?.error || 'Failed to create payment order');
      }
    } catch (err: any) {
      console.error('[INAPP_PAYMENT] Failed to create order:', err);
      setErrorMessage(
        err?.message || (isHinglish ? 'Server se order create nahi ho saka.' : 'Could not initialize payment order.')
      );
      setScreenState('failed');
    }
  };

  const handleCancelOrClose = () => {
    if (screenState === 'success') {
      navigation.goBack();
      return;
    }

    if (screenState === 'checkout') {
      Alert.alert(
        isHinglish ? 'Payment Cancel Karein?' : 'Leave Checkout?',
        isHinglish
          ? 'Kya aap sach mein payment cancel karna chahte hain?'
          : 'Are you sure you want to exit without completing the payment?',
        [
          { text: isHinglish ? 'Nahi, Pay Karein' : 'Continue Payment', style: 'cancel' },
          {
            text: isHinglish ? 'Haan, Bahar Jayein' : 'Yes, Exit',
            style: 'destructive',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } else {
      navigation.goBack();
    }
  };

  const handleWebViewMessage = async (event: any) => {
    try {
      const payload = JSON.parse(event.nativeEvent.data);
      console.log('[INAPP_PAYMENT] Received message from checkout WebView:', payload.event);

      if (payload.event === 'SUCCESS') {
        const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = payload.data || {};
        verifyAndActivatePayment(razorpay_payment_id, razorpay_order_id || order?.orderId, razorpay_signature);
      } else if (payload.event === 'DISMISSED') {
        setScreenState('cancelled');
      } else if (payload.event === 'FAILED') {
        const desc =
          payload?.error?.description ||
          payload?.error?.message ||
          (isHinglish ? 'Payment fail ho gaya.' : 'Payment failed.');
        console.warn('[INAPP_PAYMENT] Payment failed payload:', JSON.stringify(payload));
        setErrorMessage(desc);
        setScreenState('failed');
      }
    } catch (e) {
      console.warn('[INAPP_PAYMENT] Error parsing message:', e);
    }
  };

  const verifyAndActivatePayment = async (
    paymentId: string,
    orderId: string,
    signature?: string,
    attempt: number = 1
  ) => {
    setScreenState('verifying');
    setPaymentSuccessDetails({ paymentId, orderId });

    try {
      const res: any = await apiClient.post('/subscription/verify-payment', {
        razorpay_payment_id: paymentId,
        razorpay_order_id: orderId,
        razorpay_signature: signature,
        order_id: orderId,
      });

      if (res?.ok || res?.isPremium) {
        onActivationSuccess(paymentId, orderId);
      } else {
        throw new Error(res?.error || 'Verification failed');
      }
    } catch (err: any) {
      console.warn(`[INAPP_PAYMENT] Verify attempt ${attempt} error:`, err?.message || err);
      if (attempt < 3) {
        verifyTimerRef.current = setTimeout(() => {
          verifyAndActivatePayment(paymentId, orderId, signature, attempt + 1);
        }, 2000);
      } else {
        // Fallback: Check subscription status directly
        try {
          const statusRes: any = await apiClient.get('/subscription/status');
          if (statusRes?.isPremium || statusRes?.status === 'active') {
            onActivationSuccess(paymentId, orderId);
            return;
          }
        } catch (subErr) { }

        setErrorMessage(
          isHinglish
            ? `Payment (${paymentId}) receive ho gaya hai par activate hone me der lag rahi hai. "Verify Karein" button dabayein.`
            : `Payment (${paymentId}) received but activation pending. Please tap "Verify Payment".`
        );
        setScreenState('failed');
      }
    }
  };

  const onActivationSuccess = (paymentId: string, orderId: string) => {
    setIsPremium(true);
    setPaymentSuccessDetails({ paymentId, orderId });
    setScreenState('success');

    // Fetch fresh subscription details from backend
    apiClient
      .get('/subscription/status')
      .then((res: any) => {
        if (res) {
          setSubscriptionInfo({
            status: res.status || 'active',
            currentPeriodEnd: res.currentPeriodEnd || null,
            planPrice: res.planPrice || 399,
          });
        }
      })
      .catch(() => { });

    NotificationService.sendLocalNotification(
      isHinglish ? '🎉 Pro Plan Active Ho Gaya!' : '🎉 Pro Plan Activated!',
      isHinglish
        ? 'Welcome to TaskAlert Pro! Unlimited reminders aur sabhi premium features ab unlock hain.'
        : 'Welcome to TaskAlert Pro! Unlimited reminders and all pro features are now active.',
      1
    );
  };

  const triggerRetryCheckout = () => {
    if (webViewRef.current) {
      setScreenState('checkout');
      webViewRef.current.injectJavaScript(`
        if (typeof openRazorpay === 'function') {
          openRazorpay();
        }
        true;
      `);
    } else {
      initializeOrder();
    }
  };

  const renderCheckoutHtml = () => {
    if (!order) return '<html><body></body></html>';

    const cleanKeyId = order.keyId || '';
    const cleanOrderId = order.orderId || '';
    const amountPaise = order.amountPaise || 39900;
    const currency = order.currency || 'INR';
    const userName = (user?.name || '').replace(/"/g, '');
    const userEmail = (user?.email || '').replace(/"/g, '');
    const userPhone = ((user as any)?.phone || '').replace(/"/g, '');

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>TaskAlert Pro Checkout</title>
  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #080D1A;
      color: #F8FAFC;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px;
      text-align: center;
    }
    .card {
      background: #0F172A;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 20px;
      padding: 32px 24px;
      max-width: 380px;
      width: 100%;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);
    }
    .spinner {
      width: 48px;
      height: 48px;
      border: 4px solid rgba(16, 185, 129, 0.2);
      border-radius: 50%;
      border-top-color: #10B981;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 20px auto;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .title {
      font-size: 20px;
      font-weight: 800;
      color: #FFFFFF;
      margin-bottom: 8px;
      letter-spacing: -0.3px;
    }
    .subtitle {
      font-size: 13.5px;
      color: #94A3B8;
      line-height: 1.5;
      margin-bottom: 24px;
    }
    .price-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(16, 185, 129, 0.12);
      border: 1px solid rgba(16, 185, 129, 0.3);
      padding: 8px 16px;
      border-radius: 99px;
      color: #34D399;
      font-weight: 700;
      font-size: 15px;
      margin-bottom: 24px;
    }
    .pay-btn {
      width: 100%;
      background: linear-gradient(135deg, #0D5C3A 0%, #15803D 100%);
      color: #FFFFFF;
      border: none;
      padding: 16px 20px;
      border-radius: 14px;
      font-size: 16px;
      font-weight: 800;
      cursor: pointer;
      box-shadow: 0 4px 15px rgba(13, 92, 58, 0.4);
      display: inline-block;
      transition: transform 0.1s ease;
    }
    .pay-btn:active {
      transform: scale(0.98);
    }
    .secure-note {
      font-size: 11.5px;
      color: #64748B;
      margin-top: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="spinner" id="loader"></div>
    <div class="price-pill">₹${Math.round(amountPaise / 100)} / Month</div>
    <h1 class="title" id="titleText">Opening Razorpay…</h1>
    <p class="subtitle" id="subText">Please complete your payment in the secure Razorpay screen below.</p>
    <button class="pay-btn" id="payBtn" onclick="openRazorpay()" style="display: none;">Pay with Razorpay 💳</button>
    <div class="secure-note">🔒 100% Safe Checkout • UPI, Cards & NetBanking</div>
  </div>

  <script>
    var options = {
      key: "${cleanKeyId}",
      name: "TaskAlert Pro",
      description: "TaskAlert Pro Subscription",
      order_id: "${cleanOrderId}",
      prefill: {
        name: "${userName}",
        email: "${userEmail}",
        contact: "${userPhone}"
      },
      theme: {
        color: "#0D5C3A"
      },
      retry: {
        enabled: true,
        max_count: 3
      },
      handler: function(response) {
        document.getElementById('loader').style.display = 'block';
        document.getElementById('payBtn').style.display = 'none';
        document.getElementById('titleText').innerText = 'Activating Pro Plan…';
        document.getElementById('subText').innerText = 'Payment received. Finalizing your Pro activation…';

        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            event: 'SUCCESS',
            data: {
              razorpay_payment_id: response.razorpay_payment_id || '',
              razorpay_order_id: response.razorpay_order_id || "${cleanOrderId}",
              razorpay_signature: response.razorpay_signature || ''
            }
          }));
        }
      },
      modal: {
        ondismiss: function() {
          document.getElementById('loader').style.display = 'none';
          document.getElementById('payBtn').style.display = 'block';
          document.getElementById('titleText').innerText = 'Payment Not Completed';
          document.getElementById('subText').innerText = 'The payment window was closed. Tap below to try again anytime.';

          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              event: 'DISMISSED'
            }));
          }
        }
      }
    };

    function openRazorpay() {
      if (typeof Razorpay === 'undefined') {
        setTimeout(openRazorpay, 350);
        return;
      }
      document.getElementById('loader').style.display = 'block';
      document.getElementById('payBtn').style.display = 'none';
      document.getElementById('titleText').innerText = 'Opening Razorpay…';
      document.getElementById('subText').innerText = 'Please complete your payment securely.';

      try {
        var rzp = new Razorpay(options);
        rzp.on('payment.failed', function(resp) {
          document.getElementById('loader').style.display = 'none';
          document.getElementById('payBtn').style.display = 'block';
          document.getElementById('titleText').innerText = 'Payment Failed';
          document.getElementById('subText').innerText = (resp && resp.error && resp.error.description) || 'Payment was declined or cancelled.';

          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              event: 'FAILED',
              error: resp && resp.error
            }));
          }
        });
        rzp.open();
      } catch (err) {
        document.getElementById('loader').style.display = 'none';
        document.getElementById('payBtn').style.display = 'block';
        document.getElementById('titleText').innerText = 'Could Not Open Checkout';
        document.getElementById('subText').innerText = err.message || 'Please tap below to retry.';
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            event: 'FAILED',
            error: { description: err.message || 'Could not open checkout' }
          }));
        }
      }
    }

    // Automatically trigger checkout once DOM is ready
    window.addEventListener('load', function() {
      setTimeout(openRazorpay, 250);
    });
  </script>
</body>
</html>
    `;
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={styles.safeArea}>
      {/* Top Header */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={handleCancelOrClose}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityLabel="Back"
        >
          <Text style={styles.backBtnText}>✕</Text>
        </TouchableOpacity>

        <View style={styles.headerTitleWrap}>
          <BrandLogo size={20} showText={false} />
          <Text style={styles.headerTitleText}>
            <Text style={{ color: '#0F172A' }}>Task</Text>
            <Text style={{ color: '#EAB308' }}>Alert</Text>
            <Text style={{ color: '#0D5C3A', fontWeight: '900' }}> PRO</Text>
          </Text>
        </View>

        <View style={styles.shieldBadge}>
          <Text style={styles.shieldBadgeText}>🔒 Secure</Text>
        </View>
      </View>

      {/* Plan Summary Bar */}
      <View style={styles.summaryBar}>
        <View style={{ flex: 1 }}>
          <Text style={styles.summaryPlanTitle}>
            {order?.planTitle || 'TaskAlert Pro Monthly'}
          </Text>
          <Text style={styles.summarySub}>
            {isHinglish ? 'Unlimited reminders & ad-free' : 'Unlimited reminders & full features'}
          </Text>
        </View>
        <View style={styles.summaryPriceBadge}>
          <Text style={styles.summaryPriceText}>₹{order?.amount || 399}</Text>
          <Text style={styles.summaryPeriodText}>/mo</Text>
        </View>
      </View>

      {/* Main Body Switch */}
      <View style={styles.contentContainer}>
        {screenState === 'loading_order' && (
          <View style={styles.centerStateView}>
            <ActivityIndicator size="large" color="#0D5C3A" />
            <Text style={styles.loadingStateTitle}>
              {isHinglish ? 'Secure Payment Order Ban Raha Hai…' : 'Initializing Secure Payment…'}
            </Text>
            <Text style={styles.loadingStateSub}>
              {isHinglish
                ? 'Razorpay gateway se connect ho raha hai, kripya intezar karein…'
                : 'Connecting to Razorpay gateway, please wait…'}
            </Text>
          </View>
        )}

        {screenState === 'verifying' && (
          <View style={styles.centerStateView}>
            <ActivityIndicator size="large" color="#15803D" />
            <Text style={styles.loadingStateTitle}>
              {isHinglish ? 'Payment Confirm Ho Raha Hai…' : 'Activating Your Pro Plan…'}
            </Text>
            <Text style={styles.loadingStateSub}>
              {isHinglish
                ? 'Aapka payment receive ho gaya hai. Aapke account par Pro features unlock kiye ja rahe hain…'
                : 'Payment received! Verifying and unlocking all Pro features on your account…'}
            </Text>
            {paymentSuccessDetails?.paymentId && (
              <View style={styles.idPill}>
                <Text style={styles.idPillText}>ID: {paymentSuccessDetails.paymentId}</Text>
              </View>
            )}
          </View>
        )}

        {screenState === 'success' && (
          <View style={styles.successStateView}>
            <View style={styles.successIconCircle}>
              <Text style={styles.successCheckmark}>✓</Text>
            </View>

            <Text style={styles.successTitle}>
              {isHinglish ? '🎉 Pro Plan Active Ho Gaya!' : '🎉 Pro Plan Activated!'}
            </Text>
            <Text style={styles.successSub}>
              {isHinglish
                ? 'Congratulations! Aapka subscription safalta-poorvak activate ho gaya hai. Ab aap bina kisi limit ke reminders bana sakte hain.'
                : 'Congratulations! Your Pro membership is now live. Enjoy unlimited tasks, audio alerts, and complete productivity.'}
            </Text>

            <View style={styles.successDetailsCard}>
              <View style={styles.successDetailRow}>
                <Text style={styles.successDetailLabel}>Status</Text>
                <Text style={styles.successDetailValActive}>Active 👑</Text>
              </View>
              <View style={styles.successDetailRow}>
                <Text style={styles.successDetailLabel}>Plan</Text>
                <Text style={styles.successDetailVal}>TaskAlert Pro (30 Days)</Text>
              </View>
              {paymentSuccessDetails?.paymentId && (
                <View style={styles.successDetailRow}>
                  <Text style={styles.successDetailLabel}>Payment ID</Text>
                  <Text style={styles.successDetailValMono}>{paymentSuccessDetails.paymentId}</Text>
                </View>
              )}
            </View>

            <TouchableOpacity
              style={styles.primaryActionButton}
              activeOpacity={0.88}
              onPress={() => {
                navigation.goBack();
              }}
            >
              <LinearGradient
                colors={['#0D5C3A', '#15803D']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.actionBtnGradient}
              >
                <Text style={styles.primaryActionBtnText}>
                  {isHinglish ? 'App Ka Upyog Shuru Karein 🚀' : 'Start Using Pro 🚀'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryTextBtn}
              onPress={() => {
                navigation.goBack();
                setPremiumStatusVisible(true);
              }}
            >
              <Text style={styles.secondaryTextBtnLabel}>
                {isHinglish ? 'Pro Details & Expiry Dekhein ›' : 'View Pro Details & Expiry ›'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {screenState === 'cancelled' && (
          <View style={styles.centerStateView}>
            <View style={styles.cancelledCircle}>
              <Text style={styles.cancelledIcon}>⚠️</Text>
            </View>
            <Text style={styles.loadingStateTitle}>
              {isHinglish ? 'Payment Poora Nahi Hua' : 'Payment Incomplete'}
            </Text>
            <Text style={styles.loadingStateSub}>
              {isHinglish
                ? 'Aapne payment window band kar di hai. Aapka koi paisa nahi kata hai.'
                : 'The payment window was closed before completing. Your account was not charged.'}
            </Text>

            <TouchableOpacity
              style={[styles.primaryActionButton, { width: '88%', marginTop: 20 }]}
              activeOpacity={0.88}
              onPress={triggerRetryCheckout}
            >
              <LinearGradient
                colors={['#0D5C3A', '#15803D']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.actionBtnGradient}
              >
                <Text style={styles.primaryActionBtnText}>
                  {isHinglish ? '🔄 Dobara Try Karein' : '🔄 Try Payment Again'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryTextBtn}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.secondaryTextBtnLabel}>
                {isHinglish ? 'Abhi Ke Liye Cancel Karein' : 'Cancel for Now'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {screenState === 'failed' && (
          <View style={styles.centerStateView}>
            <View style={styles.failedCircle}>
              <Text style={styles.failedIcon}>✕</Text>
            </View>
            <Text style={styles.loadingStateTitle}>
              {isHinglish ? 'Payment Me Dikkat Aayi' : 'Payment Issue'}
            </Text>
            <Text style={styles.loadingStateSub}>
              {errorMessage ||
                (isHinglish
                  ? 'Payment process nahi ho saka. Kripya apna internet connection ya bank balance check karein.'
                  : 'Payment could not be processed. Please check your bank or payment method.')}
            </Text>

            <TouchableOpacity
              style={[styles.primaryActionButton, { width: '88%', marginTop: 20 }]}
              activeOpacity={0.88}
              onPress={triggerRetryCheckout}
            >
              <LinearGradient
                colors={['#0D5C3A', '#15803D']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.actionBtnGradient}
              >
                <Text style={styles.primaryActionBtnText}>
                  {isHinglish ? '🔄 Dobara Pay Karein' : '🔄 Retry Payment'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            {order?.orderId && (
              <TouchableOpacity
                style={[styles.secondaryTextBtn, { marginTop: 12 }]}
                onPress={() => verifyAndActivatePayment('', order.orderId)}
              >
                <Text style={styles.secondaryTextBtnLabel}>
                  {isHinglish ? 'Payment Ho Chuka Hai? Verify Karein ›' : 'Already Paid? Verify Status ›'}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.secondaryTextBtn, { marginTop: 6 }]}
              onPress={() => navigation.goBack()}
            >
              <Text style={[styles.secondaryTextBtnLabel, { color: '#64748B' }]}>
                {isHinglish ? 'Peeche Jayein' : 'Go Back'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {screenState === 'checkout' && order && (
          <WebView
            ref={webViewRef}
            source={{ html: renderCheckoutHtml(), baseUrl: 'https://api.razorpay.com' }}
            originWhitelist={['*']}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            allowsInlineMediaPlayback={true}
            mixedContentMode="always"
            javaScriptCanOpenWindowsAutomatically={true}
            setSupportMultipleWindows={false}
            onError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              // Ignore ERR_UNKNOWN_URL_SCHEME since Linking already handles external UPI apps
              if (nativeEvent.description && nativeEvent.description.includes('net::ERR_UNKNOWN_URL_SCHEME')) {
                return;
              }
              console.warn('[INAPP_PAYMENT] WebView error:', nativeEvent);
            }}
            onShouldStartLoadWithRequest={(request) => {
              const url = request.url;
              // Allow standard HTTPS / HTTP inside the in-app webview
              if (
                url.startsWith('http://') ||
                url.startsWith('https://') ||
                url.startsWith('about:') ||
                url.startsWith('data:')
              ) {
                return true;
              }

              // ANY custom scheme is a native app deep link (gpay://, upi://, phonepe://, paytmmp://, intent://, etc.)
              let targetDeepLink = url;
              if (url.startsWith('intent://')) {
                const upiMatch = url.match(/#Intent;scheme=([^;]+);/);
                if (upiMatch && upiMatch[1]) {
                  const scheme = upiMatch[1];
                  const pathAndQuery = url.replace(/^intent:\/\//, '').split('#Intent')[0];
                  targetDeepLink = `${scheme}://${pathAndQuery}`;
                }
              }

              Linking.canOpenURL(targetDeepLink)
                .then((supported) => {
                  if (supported) {
                    return Linking.openURL(targetDeepLink);
                  }
                  // Fallback: If specific scheme like gpay:// isn't directly registered, try generic upi://
                  if (targetDeepLink.includes('://upi/pay') || targetDeepLink.includes('pay?')) {
                    const genericUpi = targetDeepLink.replace(/^[a-zA-Z0-9_-]+:\/\//, 'upi://');
                    return Linking.openURL(genericUpi);
                  }
                })
                .catch(() => {
                  const genericUpi = targetDeepLink.replace(/^[a-zA-Z0-9_-]+:\/\//, 'upi://');
                  Linking.openURL(genericUpi).catch(() => {});
                });

              // CRITICAL: Always return false for non-http URLs so WebView NEVER throws ERR_UNKNOWN_URL_SCHEME!
              return false;
            }}
            onMessage={handleWebViewMessage}
            style={styles.webView}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#E2E8F0',
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  headerTitleText: {
    ...typography.h3,
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  shieldBadge: {
    backgroundColor: '#083B25',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  shieldBadgeText: {
    fontSize: 11,
    color: '#34D399',
    fontWeight: '800',
  },
  summaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E293B',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  summaryPlanTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  summarySub: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  summaryPriceBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: '#0F172A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  summaryPriceText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#34D399',
  },
  summaryPeriodText: {
    fontSize: 12,
    color: '#94A3B8',
    marginLeft: 2,
    fontWeight: '600',
  },
  contentContainer: {
    flex: 1,
    backgroundColor: '#080D1A',
  },
  webView: {
    flex: 1,
    backgroundColor: '#080D1A',
  },
  centerStateView: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  loadingStateTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 18,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  loadingStateSub: {
    fontSize: 13.5,
    color: '#94A3B8',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 320,
  },
  idPill: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  idPillText: {
    fontSize: 12,
    color: '#34D399',
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  successStateView: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  successIconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#083B25',
    borderWidth: 3,
    borderColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  successCheckmark: {
    fontSize: 38,
    color: '#34D399',
    fontWeight: '900',
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  successSub: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
    maxWidth: 320,
  },
  successDetailsCard: {
    width: '100%',
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 16,
    marginVertical: 24,
    borderWidth: 1,
    borderColor: '#1E293B',
    gap: 12,
  },
  successDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  successDetailLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  successDetailVal: {
    fontSize: 13.5,
    color: '#F8FAFC',
    fontWeight: '700',
  },
  successDetailValActive: {
    fontSize: 13.5,
    color: '#34D399',
    fontWeight: '800',
  },
  successDetailValMono: {
    fontSize: 12,
    color: '#94A3B8',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: '600',
  },
  primaryActionButton: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#0D5C3A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  actionBtnGradient: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryActionBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  secondaryTextBtn: {
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  secondaryTextBtnLabel: {
    fontSize: 13.5,
    color: '#34D399',
    fontWeight: '700',
  },
  cancelledCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#2A1F0D',
    borderWidth: 2,
    borderColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  cancelledIcon: {
    fontSize: 28,
  },
  failedCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#2A1010',
    borderWidth: 2,
    borderColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  failedIcon: {
    fontSize: 28,
    color: '#EF4444',
    fontWeight: '900',
  },
});

export default PaymentCheckoutScreen;
