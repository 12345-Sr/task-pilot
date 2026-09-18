import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { BrandLogo } from '../components/BrandLogo';
import { colors } from '../theme/colors';
import { radius } from '../theme/radius';
import { shadows } from '../theme/shadows';
import { useAppStore } from '../store';
import { t, LANGUAGES } from '../i18n';
import { SupportedLanguage } from '../types';

interface FeaturePillar {
  icon: string;
  badge: string;
  badgeColor: string;
  badgeBg: string;
  title: string;
  desc: string;
}

const FEATURE_DATA: Record<
  SupportedLanguage,
  {
    pillarsTitle: string;
    trialBadge: string;
    trialSubtitle: string;
    pillars: FeaturePillar[];
  }
> = {
  hi: {
    pillarsTitle: 'TaskAlert Kaise Kaam Karta Hai?',
    trialBadge: '🎉 3 Din Ka Free Trial Shaamil Hai',
    trialSubtitle: 'Bina kisi credit card ke turant shuru karein',
    pillars: [
      {
        icon: '🌅',
        badge: '7:00 AM',
        badgeColor: '#B45309',
        badgeBg: '#FEF3C7',
        title: 'Subah Ki Briefing',
        desc: 'Din shuru hote hi aapke saare zaroori kaamon ka saaf blueprint aur roadmap.',
      },
      {
        icon: '🔔',
        badge: 'Alerts',
        badgeColor: '#0284C7',
        badgeBg: '#E0F2FE',
        title: 'Time Se Pehle Smart Alert',
        desc: 'Har zaroori deadline se pehle timely reminders taaki koi bhi kaam na chhoote.',
      },
      {
        icon: '🌙',
        badge: '8:00 PM',
        badgeColor: '#15803D',
        badgeBg: '#DCFCE7',
        title: 'Shaam Ka Confirmation',
        desc: 'Kaam mark karein (✓/✗), daily consistency banayein aur apna streak badhayein.',
      },
    ],
  },
  en: {
    pillarsTitle: 'How TaskAlert Works',
    trialBadge: '🎉 3-Day Free Trial Included',
    trialSubtitle: 'Get started instantly • No credit card required',
    pillars: [
      {
        icon: '🌅',
        badge: '7:00 AM',
        badgeColor: '#B45309',
        badgeBg: '#FEF3C7',
        title: 'Morning Briefing',
        desc: 'Clear blueprint and organized roadmap of your essential tasks every morning.',
      },
      {
        icon: '🔔',
        badge: 'Alerts',
        badgeColor: '#0284C7',
        badgeBg: '#E0F2FE',
        title: 'Proactive Timely Alerts',
        desc: 'Smart notifications ahead of every deadline so you stay fully in control.',
      },
      {
        icon: '🌙',
        badge: '8:00 PM',
        badgeColor: '#15803D',
        badgeBg: '#DCFCE7',
        title: 'Evening Review & Streak',
        desc: 'Confirm completed tasks (✓/✗) and build an unbroken daily productivity streak.',
      },
    ],
  },
  mr: {
    pillarsTitle: 'TaskAlert कसे काम करते?',
    trialBadge: '🎉 ३ दिवसांचा मोफत ट्रायल समाविष्ट',
    trialSubtitle: 'क्रेडिट कार्डची आवश्यकता नाही',
    pillars: [
      {
        icon: '🌅',
        badge: 'सकाळी ७:००',
        badgeColor: '#B45309',
        badgeBg: '#FEF3C7',
        title: 'सकाळची ब्रीफिंग',
        desc: 'दिवस सुरू होताच महत्त्वाच्या कामांची स्पष्ट रूपरेषा आणि वेळापत्रक.',
      },
      {
        icon: '🔔',
        badge: 'अलर्ट',
        badgeColor: '#0284C7',
        badgeBg: '#E0F2FE',
        title: 'वेळेपूर्वी स्मार्ट अलर्ट',
        desc: 'डेडलाइनपूर्वी वेळेवर स्मरणपत्रे जेणेकरून कोणतेही काम सुटणार नाही.',
      },
      {
        icon: '🌙',
        badge: 'संध्याकाळी ८:००',
        badgeColor: '#15803D',
        badgeBg: '#DCFCE7',
        title: 'संध्याकाळ पुष्टीकरण व स्ट्रीक',
        desc: 'कामे पूर्ण नोंदवा (✓/✗) आणि तुमची दररोजची स्ट्रीक वाढवा.',
      },
    ],
  },
  bn: {
    pillarsTitle: 'TaskAlert কীভাবে কাজ করে?',
    trialBadge: '🎉 ৩ দিনের ফ্রি ট্রায়াল অন্তর্ভুক্ত',
    trialSubtitle: 'ক্রেডিট কার্ডের প্রয়োজন নেই',
    pillars: [
      {
        icon: '🌅',
        badge: 'সকাল ৭:০০',
        badgeColor: '#B45309',
        badgeBg: '#FEF3C7',
        title: 'সকালের ব্রিফিং',
        desc: 'দিন শুরু হতেই গুরুত্বপূর্ণ কাজের স্পষ্ট নীলনকশা ও তালিকা।',
      },
      {
        icon: '🔔',
        badge: 'অ্যালার্ট',
        badgeColor: '#0284C7',
        badgeBg: '#E0F2FE',
        title: 'সময়ের আগে স্মার্ট অ্যালার্ট',
        desc: 'ডেডলাইনের আগে সময়মতো রিমাইন্ডার যাতে কাজ বাদ না পড়ে।',
      },
      {
        icon: '🌙',
        badge: 'সন্ধ্যা ৮:০০',
        badgeColor: '#15803D',
        badgeBg: '#DCFCE7',
        title: 'সন্ধ্যার নিশ্চিতকরণ ও স্ট্রিক',
        desc: 'কাজ সম্পন্ন চিহ্নিত করুন (✓/✗) এবং ধারাবাহিক স্ট্রিক গড়ে তুলুন।',
      },
    ],
  },
  ta: {
    pillarsTitle: 'TaskAlert எவ்வாறு செயல்படுகிறது?',
    trialBadge: '🎉 3 நாள் இலவச சோதனை',
    trialSubtitle: 'கிரெடிட் கார்டு தேவையில்லை',
    pillars: [
      {
        icon: '🌅',
        badge: 'காலை 7:00',
        badgeColor: '#B45309',
        badgeBg: '#FEF3C7',
        title: 'காலை சுருக்கம்',
        desc: 'அன்றைய முக்கிய பணிகளுக்கான தெளிவான அட்டவணை மற்றும் திட்டமிடல்.',
      },
      {
        icon: '🔔',
        badge: 'அலர்ட்',
        badgeColor: '#0284C7',
        badgeBg: '#E0F2FE',
        title: 'நேரத்திற்கு முன் அலர்ட்',
        desc: 'பணிகளை முடிக்க சரியான நேரத்தில் நினைவூட்டல்கள் கிடைக்கும்.',
      },
      {
        icon: '🌙',
        badge: 'மாலை 8:00',
        badgeColor: '#15803D',
        badgeBg: '#DCFCE7',
        title: 'மாலை உறுதிப்படுத்தல்',
        desc: 'முடிந்த பணிகளை குறித்து (✓/✗) உங்கள் தினசரி ஸ்ட்ரீக்கை உயர்த்துங்கள்.',
      },
    ],
  },
  te: {
    pillarsTitle: 'TaskAlert ఎలా పనిచేస్తుంది?',
    trialBadge: '🎉 3 రోజుల ఉచిత ట్రయల్ చేర్చబడింది',
    trialSubtitle: 'క్రెడిట్ కార్డ్ అవసరం లేదు',
    pillars: [
      {
        icon: '🌅',
        badge: 'ఉదయం 7:00',
        badgeColor: '#B45309',
        badgeBg: '#FEF3C7',
        title: 'ఉదయం బ్రీఫింగ్',
        desc: 'రోజు ప్రారంభంలోనే ముఖ్యమైన పనుల స్పష్టమైన కార్యాచరణ ప్రణాళిక.',
      },
      {
        icon: '🔔',
        badge: 'హెచ్చరికలు',
        badgeColor: '#0284C7',
        badgeBg: '#E0F2FE',
        title: 'సమయానికి ముందే అలర్ట్‌లు',
        desc: 'డెడ్‌లైన్‌కు ముందే రిమైండర్‌లు అందుకోవచ్చు.',
      },
      {
        icon: '🌙',
        badge: 'రాత్రి 8:00',
        badgeColor: '#15803D',
        badgeBg: '#DCFCE7',
        title: 'సాయంత్రం సమీక్ష & స్ట్రీక్',
        desc: 'పనులను నిర్ధారించండి (✓/✗) మరియు స్థిరమైన స్ట్రీక్‌ను నిర్మించండి.',
      },
    ],
  },
  gu: {
    pillarsTitle: 'TaskAlert કેવી રીતે કામ કરે છે?',
    trialBadge: '🎉 3 દિવસનો મફત ટ્રાયલ શામેલ છે',
    trialSubtitle: 'ક્રેડિટ કાર્ડ વિના તુરંત શરૂ કરો',
    pillars: [
      {
        icon: '🌅',
        badge: 'સવારે 7:00',
        badgeColor: '#B45309',
        badgeBg: '#FEF3C7',
        title: 'સવારની બ્રીફિંગ',
        desc: 'દિવસ શરૂ થતાં જ જરૂરી કાર્યોનું સ્પષ્ટ શેડ્યૂલ અને બ્લૂપ્રિન્ટ.',
      },
      {
        icon: '🔔',
        badge: 'એલર્ટ',
        badgeColor: '#0284C7',
        badgeBg: '#E0F2FE',
        title: 'સમય પહેલાં સ્માર્ટ એલર્ટ',
        desc: 'ડેડલાઇન પહેલાં સમયસર રિમાઇન્ડર જેથી કોઈ કામ ચૂકી ન જવાય.',
      },
      {
        icon: '🌙',
        badge: 'સાંજે 8:00',
        badgeColor: '#15803D',
        badgeBg: '#DCFCE7',
        title: 'સાંજે કન્ફર્મેશન અને સ્ટ્રીક',
        desc: 'કામ પૂર્ણ માર્ક કરો (✓/✗) અને રોજની સ્ટ્રીક વધારો.',
      },
    ],
  },
  pa: {
    pillarsTitle: 'TaskAlert ਕਿਵੇਂ ਕੰਮ ਕਰਦਾ ਹੈ?',
    trialBadge: '🎉 3 ਦਿਨਾਂ ਦਾ ਮੁਫ਼ਤ ਟਰਾਇਲ ਸ਼ਾਮਲ ਹੈ',
    trialSubtitle: 'ਬਿਨਾਂ ਕ੍ਰੈਡਿਟ ਕਾਰਡ ਦੇ ਤੁਰੰਤ ਸ਼ੁਰੂ ਕਰੋ',
    pillars: [
      {
        icon: '🌅',
        badge: 'ਸਵੇਰੇ 7:00',
        badgeColor: '#B45309',
        badgeBg: '#FEF3C7',
        title: 'ਸਵੇਰ ਦੀ ਬ੍ਰੀਫਿੰਗ',
        desc: 'ਦਿਨ ਸ਼ੁਰੂ ਹੁੰਦੇ ਹੀ ਜ਼ਰੂਰੀ ਕੰਮਾਂ ਦੀ ਸਪਸ਼ਟ ਰੂਪ-ਰੇਖਾ ਅਤੇ ਸ਼ਡਿਊਲ।',
      },
      {
        icon: '🔔',
        badge: 'ਅਲਰਟ',
        badgeColor: '#0284C7',
        badgeBg: '#E0F2FE',
        title: 'ਸਮੇਂ ਤੋਂ ਪਹਿਲਾਂ ਸਮਾਰਟ ਅਲਰਟ',
        desc: 'ਡੈੱਡਲਾਈਨ ਤੋਂ ਪਹਿਲਾਂ ਸਮੇਂ ਸਿਰ ਰੀਮਾਈਂਡਰ ਤਾਂ ਜੋ ਕੰਮ ਨਾ ਛੁੱਟੇ।',
      },
      {
        icon: '🌙',
        badge: 'ਸ਼ਾਮ 8:00',
        badgeColor: '#15803D',
        badgeBg: '#DCFCE7',
        title: 'ਸ਼ਾਮ ਦੀ ਪੁਸ਼ਟੀ ਅਤੇ ਸਟ੍ਰੀਕ',
        desc: 'ਕੰਮ ਪੂਰੇ ਮਾਰਕ ਕਰੋ (✓/✗) ਅਤੇ ਆਪਣੀ ਸਟ੍ਰੀਕ ਵਧਾਓ।',
      },
    ],
  },
};

export default function WelcomeScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { language } = useAppStore();

  const currentLangMeta =
    LANGUAGES.find((l) => l.code === language) || LANGUAGES[0];
  const featureContent = FEATURE_DATA[language] || FEATURE_DATA.hi;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContainer,
          {
            paddingTop: Math.max(insets.top, 10),
            paddingBottom: Math.max(insets.bottom, 24) + 12,
          },
        ]}
      >
        {/* Top Header & Brand Unit */}
        <View style={styles.topSection}>
          <View style={styles.topBar}>
            <TouchableOpacity
              style={styles.langPickerButton}
              onPress={() => navigation.navigate('Language')}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Change Language"
            >
              <Text style={styles.langGlobe}>🌐</Text>
              <Text style={styles.langLabel}>
                {currentLangMeta.native} ({language.toUpperCase()})
              </Text>
              <Text style={styles.langChevron}>▾</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.brandContainer}>
            <View style={styles.logoOuterHalo}>
              <View style={styles.logoShadowWrap}>
                <BrandLogo size={50} showText={false} />
              </View>
            </View>
            <Text style={styles.brandTitle}>
              <Text style={{ color: '#0F172A' }}>Task</Text>
              <Text style={{ color: '#EAB308' }}>Alert</Text>
            </Text>
            <View style={styles.taglineBadge}>
              <Text style={styles.brandTagline}>"{t(language, 'tagline')}"</Text>
            </View>
            <Text style={styles.brandSubTagline}>{t(language, 'subTagline')}</Text>
          </View>
        </View>

        {/* Center Workflow & Trial Section - Unified Container */}
        <View style={styles.centerSection}>
          <View style={styles.pillarsContainer}>
            <View style={styles.pillarsHeaderRow}>
              <View style={styles.pillarsHeaderBadge}>
                <Text style={styles.pillarsHeaderBadgeText}>✨ WORKFLOW</Text>
              </View>
              <Text style={styles.pillarsHeading}>{featureContent.pillarsTitle}</Text>
            </View>

            <View style={styles.pillarCardsList}>
              {featureContent.pillars.map((pillar, index) => (
                <View key={index} style={styles.pillarRow}>
                  <View style={styles.pillarIconContainer}>
                    <Text style={styles.pillarIcon}>{pillar.icon}</Text>
                  </View>

                  <View style={styles.pillarContent}>
                    <View style={styles.pillarTitleRow}>
                      <Text style={styles.pillarTitle} numberOfLines={1}>
                        {pillar.title}
                      </Text>
                      <View
                        style={[
                          styles.pillarBadge,
                          {
                            backgroundColor: pillar.badgeBg,
                            borderColor: pillar.badgeColor + '30',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.pillarBadgeText,
                            { color: pillar.badgeColor },
                          ]}
                        >
                          {pillar.badge}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.pillarDesc} numberOfLines={2}>
                      {pillar.desc}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Trial Highlight Badge - Seamlessly Docked */}
          <View style={styles.trialHighlightCard}>
            <View style={styles.trialIconCircle}>
              <Text style={styles.trialSparkle}>👑</Text>
            </View>
            <View style={styles.trialTextWrap}>
              <Text style={styles.trialHighlightTitle} numberOfLines={1}>
                {featureContent.trialBadge}
              </Text>
              <Text style={styles.trialHighlightSub} numberOfLines={1}>
                {featureContent.trialSubtitle}
              </Text>
            </View>
          </View>
        </View>

        {/* Bottom CTA Block */}
        <View style={styles.bottomBlock}>
          <TouchableOpacity
            style={styles.primaryBtn}
            activeOpacity={0.88}
            onPress={() => navigation.navigate('Signup')}
            accessibilityRole="button"
            accessibilityLabel={t(language, 'welcome_start')}
          >
            <Text style={styles.primaryBtnText}>
              {t(language, 'welcome_start')}
            </Text>
            <View style={styles.arrowCircle}>
              <Text style={styles.arrowText}>→</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('Login')}
            accessibilityRole="button"
            accessibilityLabel={t(language, 'login_button')}
          >
            <Text style={styles.secondaryBtnText}>
              {t(language, 'already_have_account')}{' '}
              <Text style={styles.secondaryBtnHighlight}>
                {t(language, 'login_button')}
              </Text>
            </Text>
          </TouchableOpacity>

          <Text style={styles.footerNote}>
            {t(language, 'welcome_sub_motto')}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 16,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    width: '100%',
    marginBottom: 8,
  },
  langPickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
    ...shadows.card,
  },
  langGlobe: {
    fontSize: 14,
  },
  langLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  langChevron: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '700',
  },
  brandContainer: {
    alignItems: 'center',
    marginVertical: 2,
  },
  logoOuterHalo: {
    padding: 4,
    borderRadius: 20,
    backgroundColor: 'rgba(197, 160, 89, 0.08)',
    marginBottom: 4,
  },
  logoShadowWrap: {
    shadowColor: '#C5A059',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 6,
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  taglineBadge: {
    backgroundColor: '#FDF7EC',
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: '#EBD8B3',
    marginBottom: 3,
  },
  brandTagline: {
    fontSize: 12,
    fontWeight: '800',
    color: '#9B7426',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  brandSubTagline: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 15,
    paddingHorizontal: 12,
  },
  pillarsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1.2,
    borderColor: '#EFE6D5',
    marginVertical: 6,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  pillarsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  pillarsHeaderBadge: {
    backgroundColor: '#FDF7EC',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: '#EBD8B3',
  },
  pillarsHeaderBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#9B7426',
    letterSpacing: 0.4,
  },
  pillarsHeading: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 0.2,
    flex: 1,
    flexShrink: 1,
  },
  pillarCardsList: {
    gap: 6,
  },
  pillarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFBFD',
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#EEF2F6',
    gap: 8,
  },
  pillarIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexShrink: 0,
  },
  pillarIcon: {
    fontSize: 16,
  },
  pillarContent: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  pillarTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
  },
  pillarBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  pillarBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  pillarTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.1,
    flex: 1,
  },
  pillarDesc: {
    fontSize: 10.5,
    color: '#64748B',
    lineHeight: 14,
    fontWeight: '500',
    marginTop: 1,
  },
  topSection: {
    width: '100%',
  },
  centerSection: {
    width: '100%',
    marginVertical: 4,
  },
  trialHighlightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDF9F0',
    borderWidth: 1.2,
    borderColor: '#EBD8B3',
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 8,
    gap: 10,
    shadowColor: '#C5A059',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  trialIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F7EBD3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  trialSparkle: {
    fontSize: 16,
  },
  trialTextWrap: {
    flex: 1,
  },
  trialHighlightTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#825B15',
  },
  trialHighlightSub: {
    fontSize: 10.5,
    color: '#9B7426',
    fontWeight: '600',
  },
  bottomBlock: {
    gap: 6,
    marginTop: 4,
  },
  primaryBtn: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.32,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryBtnText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  arrowCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '900',
  },
  secondaryBtn: {
    paddingVertical: 5,
    alignItems: 'center',
  },
  secondaryBtnText: {
    fontSize: 12.5,
    color: '#64748B',
    fontWeight: '600',
  },
  secondaryBtnHighlight: {
    color: colors.primary,
    fontWeight: '800',
  },
  footerNote: {
    textAlign: 'center',
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '500',
  },
});
