import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { radius } from '../theme/radius';
import { shadows } from '../theme/shadows';
import { useAppStore } from '../store';

interface TermsAndConditionsModalProps {
  visible: boolean;
  onClose: () => void;
}

export const TermsAndConditionsModal: React.FC<TermsAndConditionsModalProps> = ({ visible, onClose }) => {
  const { language } = useAppStore();
  const isHindi = language === 'hi';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <SafeAreaView style={styles.safeContainer} edges={['top', 'bottom']}>
          <View style={styles.modalCard}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerTitleContainer}>
                <Text style={styles.scrollIcon}>📜</Text>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.title} numberOfLines={1}>
                    {isHindi ? 'Terms & Conditions' : 'Terms & Conditions'}
                  </Text>
                  <Text style={styles.subtitle} numberOfLines={1}>
                    {isHindi ? 'अंतिम अपडेट: सितंबर 2026' : 'Last Updated: September 2026'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={onClose}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Text style={styles.closeText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Scrollable Terms Content */}
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={true}
            >
              {isHindi ? (
                <>
                  <View style={styles.highlightBox}>
                    <Text style={styles.highlightText}>
                      Task Pilot में आपका स्वागत है। ये Terms & Conditions ("शर्तें") Task Pilot एप्लिकेशन और संबंधित सेवाओं ("Task Pilot", "हम", "हमें", या "हमारा") के आपके उपयोग को नियंत्रित करती हैं। अकाउंट बनाकर या Task Pilot का उपयोग करके, आप इन शर्तों का पालन करने के लिए सहमत होते हैं।
                    </Text>
                  </View>

                  {/* Section 1 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>1. Task Pilot के बारे में</Text>
                    <Text style={styles.paragraph}>
                      Task Pilot एक टास्क-मैनेजमेंट और प्रोडक्टिविटी एप्लिकेशन है जिसे उपयोगकर्ताओं को कार्यों और रिमाइंडर्स को बनाने, व्यवस्थित करने, शेड्यूल करने और प्रबंधित करने में मदद करने के लिए डिज़ाइन किया गया है।
                    </Text>
                    <Text style={styles.paragraph}>
                      Task Pilot का उपयोग व्यक्तिगत और व्यावसायिक दोनों उद्देश्यों के लिए किया जा सकता है।
                    </Text>
                    <Text style={styles.paragraph}>
                      Task Pilot एक उत्पादकता टूल है और इसका उद्देश्य पेशेवर, आपातकालीन, चिकित्सा, कानूनी, वित्तीय या अन्य महत्वपूर्ण सेवाओं को प्रतिस्थापित करना नहीं है।
                    </Text>
                  </View>

                  {/* Section 2 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>2. यूज़र अकाउंट्स</Text>
                    <Text style={styles.paragraph}>
                      Task Pilot का उपयोग करने के लिए, आपको एक अकाउंट बनाना होगा। रजिस्ट्रेशन के दौरान, आपको प्रदान करना आवश्यक हो सकता है:
                    </Text>
                    <Text style={styles.bulletPoint}>• आपका नाम</Text>
                    <Text style={styles.bulletPoint}>• आपका ईमेल पता</Text>
                    <Text style={styles.bulletPoint}>• एक पासवर्ड</Text>
                    <Text style={styles.paragraph}>
                      Task Pilot द्वारा प्रदान की गई वेरिफिकेशन प्रक्रिया का उपयोग करके आपका ईमेल पता सत्यापित होना चाहिए।
                    </Text>
                    <Text style={styles.paragraph}>
                      आप सटीक जानकारी प्रदान करने और अपने लॉगिन क्रेडेंशियल्स की गोपनीयता बनाए रखने के लिए जिम्मेदार हैं।
                    </Text>
                    <Text style={styles.paragraph}>
                      आपका Task Pilot अकाउंट आपके लिए व्यक्तिगत है। आपको अपने लॉगिन क्रेडेंशियल्स दूसरों के साथ साझा नहीं करने चाहिए या अनधिकृत व्यक्तियों को अपने खाते तक पहुंचने की अनुमति नहीं देनी चाहिए।
                    </Text>
                    <Text style={styles.paragraph}>
                      आप अपने अकाउंट के माध्यम से की जाने वाली गतिविधियों के लिए जिम्मेदार हैं और यदि आपको लगता है कि आपका खाता अनधिकृत रूप से एक्सेस किया गया है तो आपको हमें सूचित करना चाहिए।
                    </Text>
                  </View>

                  {/* Section 3 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>3. टास्क और रिमाइंडर डेटा</Text>
                    <Text style={styles.paragraph}>
                      उपयोगकर्ता Task Pilot के भीतर कार्यों और रिमाइंडर्स को बना, संपादित, शेड्यूल और हटा सकते हैं।
                    </Text>
                    <Text style={styles.paragraph}>
                      आप अपने द्वारा बनाए गए और Task Pilot में सबमिट किए गए टास्क और अन्य सामग्री का स्वामित्व बनाए रखते हैं।
                    </Text>
                    <Text style={styles.paragraph}>
                      Task Pilot आपकी टास्क जानकारी को प्रोसेस और स्टोर करता है ताकि सेवा अपनी टास्क-मैनेजमेंट और रिमाइंडर कार्यक्षमता प्रदान कर सके और आपको अपने अकाउंट का उपयोग करते समय अपनी जानकारी तक पहुंचने की अनुमति मिल सके।
                    </Text>
                    <Text style={styles.paragraph}>
                      Task Pilot आपके टास्क कंटेंट को बेचता नहीं है और न ही इसका उपयोग विज्ञापन उद्देश्यों के लिए करता है।
                    </Text>
                    <Text style={styles.paragraph}>
                      टास्क की जानकारी सार्वजनिक रूप से प्रदर्शित नहीं की जाती है या सेवा के माध्यम से अन्य उपयोगकर्ताओं के साथ साझा नहीं की जाती है।
                    </Text>
                  </View>

                  {/* Section 4 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>4. Free प्लान</Text>
                    <Text style={styles.paragraph}>
                      फ्री प्लान एक उपयोगकर्ता को 3 टास्क तक बनाने की अनुमति देता है।
                    </Text>
                    <Text style={styles.paragraph}>
                      एक बार 3 टास्क की अधिकतम सीमा पूरी हो जाने के बाद, उपयोगकर्ता फ्री प्लान के तहत अतिरिक्त टास्क नहीं बना सकता है।
                    </Text>
                    <Text style={styles.paragraph}>
                      किसी मौजूदा टास्क को हटाने से उपयोगकर्ता का टास्क-क्रिएशन कोटा रीसेट या बढ़ता नहीं है।
                    </Text>
                    <Text style={styles.paragraph}>
                      अतिरिक्त टास्क-मैनेजमेंट कार्यक्षमता के लिए Pro सब्सक्रिप्शन की आवश्यकता हो सकती है।
                    </Text>
                  </View>

                  {/* Section 5 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>5. Pro सब्सक्रिप्शन</Text>
                    <Text style={styles.paragraph}>
                      Task Pilot ₹399 में 30 दिनों के लिए Pro सब्सक्रिप्शन प्रदान करता है।
                    </Text>
                    <Text style={styles.paragraph}>
                      एक Pro सब्सक्रिप्शन अतिरिक्त कार्यक्षमता प्रदान करता है, जिसमें शामिल हैं:
                    </Text>
                    <Text style={styles.bulletPoint}>• अनलिमिटेड टास्क क्रिएशन (असीमित कार्य निर्माण)</Text>
                    <Text style={styles.bulletPoint}>• उपलब्ध टाइमलाइन/रिपीट कार्यक्षमता का उपयोग करके चयनित तिथियों या अवधियों में पहले बनाए गए कार्यों को पुन: उपयोग या दोहराने की क्षमता</Text>
                    <Text style={styles.paragraph}>
                      Pro एक्सेस लागू खरीद/सक्रियण अवधि से 30 दिनों के लिए उपलब्ध रहता है।
                    </Text>
                    <Text style={styles.paragraph}>
                      Pro सब्सक्रिप्शन वर्तमान में अपने आप (automatically) रिन्यू नहीं होते हैं।
                    </Text>
                    <Text style={styles.paragraph}>
                      30 दिनों की Pro अवधि समाप्त होने के बाद, उपयोगकर्ता को Pro सुविधाओं का उपयोग जारी रखने के लिए एक और खरीदारी करनी होगी।
                    </Text>
                    <Text style={styles.paragraph}>
                      हम भविष्य में सब्सक्रिप्शन सुविधाओं को पेश, संशोधित, जोड़ या हटा सकते हैं।
                    </Text>
                  </View>

                  {/* Section 6 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>6. पेमेंट्स</Text>
                    <Text style={styles.paragraph}>
                      Pro सब्सक्रिप्शन के भुगतान Razorpay या Task Pilot द्वारा उपलब्ध कराई गई अन्य भुगतान-प्रसंस्करण सेवाओं के माध्यम से संसाधित किए जाते हैं।
                    </Text>
                    <Text style={styles.paragraph}>
                      खरीदारी करके, आप लागू भुगतान प्रदाता को उसके लागू नियमों और नीतियों के अनुसार लेनदेन को संसाधित करने के लिए अधिकृत करते हैं।
                    </Text>
                    <Text style={styles.paragraph}>
                      Task Pilot अपने स्वयं के सर्वर पर आपके पूरे भुगतान-कार्ड विवरण संग्रहीत नहीं करता है जब तक कि स्पष्ट रूप से अन्यथा न कहा गया हो।
                    </Text>
                  </View>

                  {/* Section 7 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>7. रिफंड पॉलिसी</Text>
                    <Text style={styles.paragraph}>
                      सभी Pro खरीदारी गैर-वापसी योग्य (non-refundable) हैं, सिवाय इसके कि जहां लागू कानून द्वारा रिफंड आवश्यक हो या जहां Task Pilot यह निर्धारित करता है कि तकनीकी भुगतान समस्या के लिए सुधारात्मक कार्रवाई की आवश्यकता है।
                    </Text>
                    <Text style={styles.paragraph}>
                      यदि आपका भुगतान सफलतापूर्वक काट लिया गया है लेकिन तकनीकी समस्या के कारण आपका Pro एक्सेस सक्रिय नहीं हुआ है, तो आप उपलब्ध समर्थन या टिकट प्रणाली के माध्यम से Task Pilot से संपर्क कर सकते हैं।
                    </Text>
                    <Text style={styles.paragraph}>
                      हम लेनदेन की जांच कर सकते हैं और, जहां उपयुक्त हो, खरीदी गई सेवा को सक्रिय करके या अन्य उचित सुधारात्मक कार्रवाई करके समस्या का समाधान कर सकते हैं।
                    </Text>
                  </View>

                  {/* Section 8 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>8. नोटिफिकेशन्स और रिमाइंडर्स</Text>
                    <Text style={styles.paragraph}>
                      Task Pilot निर्धारित कार्यों और रिमाइंडर्स से संबंधित सूचनाएं भेज सकता है।
                    </Text>
                    <Text style={styles.paragraph}>
                      टास्क सेटिंग्स के आधार पर, रिमाइंडर सूचनाएं भेजी जा सकती हैं:
                    </Text>
                    <Text style={styles.bulletPoint}>• निर्धारित कार्य से लगभग 10 मिनट पहले, और</Text>
                    <Text style={styles.bulletPoint}>• निर्धारित कार्य के समय पर</Text>
                    <Text style={styles.paragraph}>
                      नोटिफिकेशन डिलीवरी के लिए आपके डिवाइस पर उपयुक्त नोटिफिकेशन अनुमतियों की आवश्यकता होती है।
                    </Text>
                    <Text style={styles.paragraph}>
                      Task Pilot यह गारंटी नहीं देता कि प्रत्येक सूचना हमेशा समय पर ही वितरित की जाएगी या बिल्कुल भी वितरित की जाएगी।
                    </Text>
                    <Text style={styles.paragraph}>
                      तकनीकी समस्याओं, डिवाइस सेटिंग्स, ऑपरेटिंग-सिस्टम प्रतिबंधों, नेटवर्क स्थितियों, तृतीय-पक्ष सेवाओं, रखरखाव, या हमारे उचित नियंत्रण से परे अन्य परिस्थितियों के कारण सूचनाओं में देरी, रुकावट या चूक हो सकती है।
                    </Text>
                    <Text style={styles.paragraph}>
                      आप अपने कार्यों की निगरानी और प्रबंधन के लिए स्वयं जिम्मेदार हैं।
                    </Text>
                    <Text style={styles.paragraph}>
                      Task Pilot का उपयोग आपातकालीन, चिकित्सा, जीवन-महत्वपूर्ण, खतरनाक, कानूनी या अन्य स्थितियों के लिए एकमात्र प्रणाली के रूप में नहीं किया जाना चाहिए जहां रिमाइंडर की विफलता से गंभीर नुकसान हो सकता है।
                    </Text>
                  </View>

                  {/* Section 9 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>9. स्वीकार्य उपयोग (Acceptable Use)</Text>
                    <Text style={styles.paragraph}>
                      आप Task Pilot का उपयोग केवल वैध उद्देश्यों के लिए करने के लिए सहमत हैं। आपको निम्नलिखित नहीं करना चाहिए:
                    </Text>
                    <Text style={styles.bulletPoint}>• अवैध गतिविधियों के लिए Task Pilot का उपयोग करना।</Text>
                    <Text style={styles.bulletPoint}>• बिना अनुमति के किसी अन्य उपयोगकर्ता के खाते या जानकारी तक पहुंचने का प्रयास करना।</Text>
                    <Text style={styles.bulletPoint}>• हमारे सिस्टम, सर्वर, डेटाबेस या बुनियादी ढांचे तक अनधिकृत पहुंच प्राप्त करने का प्रयास करना।</Text>
                    <Text style={styles.bulletPoint}>• सेवा के स्रोत कोड को हैक करना, रिवर्स इंजीनियर करना, डीकंपाइल करना या निकालने का प्रयास करना।</Text>
                    <Text style={styles.bulletPoint}>• एप्लिकेशन के अनधिकृत व्युत्पन्न संस्करणों को कॉपी, संशोधित, पुन: प्रस्तुत, वितरित या बनाना।</Text>
                    <Text style={styles.bulletPoint}>• मैलवेयर, वायरस, दुर्भावनापूर्ण कोड, या अन्य हानिकारक सामग्री को पेश करना।</Text>
                    <Text style={styles.bulletPoint}>• स्पैम, दुर्व्यवहार, उत्पीड़न या दुर्भावनापूर्ण गतिविधियों के लिए सेवा का उपयोग करना।</Text>
                    <Text style={styles.bulletPoint}>• सेवा या इसके बुनियादी ढांचे को बाधित करने, नुकसान पहुंचाने, ओवरलोड करने या हस्तक्षेप करने का प्रयास करना।</Text>
                    <Text style={styles.bulletPoint}>• सुरक्षा उपायों, उपयोग सीमाओं, या एक्सेस प्रतिबंधों को बायपास या दरकिनार करने का प्रयास करना।</Text>
                    <Text style={styles.bulletPoint}>• ऐसे तरीके से सेवा का उपयोग करना जो लागू कानूनों या विनियमों का उल्लंघन करता हो।</Text>
                    <Text style={styles.paragraph}>
                      हम प्रतिबंधित गतिविधियों में शामिल खातों के खिलाफ उचित कार्रवाई करने का अधिकार सुरक्षित रखते हैं।
                    </Text>
                  </View>

                  {/* Section 10 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>10. बौद्धिक संपदा (Intellectual Property)</Text>
                    <Text style={styles.paragraph}>
                      Task Pilot और इसकी अंतर्निहित तकनीक का स्वामित्व Task Pilot के पास है या उसके द्वारा लाइसेंस प्राप्त है। इसमें बिना किसी सीमा के शामिल हैं:
                    </Text>
                    <Text style={styles.bulletPoint}>• Task Pilot नाम</Text>
                    <Text style={styles.bulletPoint}>• लोगो और ब्रांडिंग</Text>
                    <Text style={styles.bulletPoint}>• एप्लिकेशन डिज़ाइन और यूज़र इंटरफ़ेस</Text>
                    <Text style={styles.bulletPoint}>• स्रोत कोड (Source code)</Text>
                    <Text style={styles.bulletPoint}>• सॉफ्टवेयर और फीचर्स</Text>
                    <Text style={styles.bulletPoint}>• ग्राफिक्स, टेक्स्ट और अन्य मालिकाना सामग्री</Text>
                    <Text style={styles.paragraph}>
                      इन शर्तों के अनुसार सेवा का उपयोग करने के सीमित अधिकार को छोड़कर, कोई भी स्वामित्व अधिकार आपको हस्तांतरित नहीं किया जाता है।
                    </Text>
                    <Text style={styles.paragraph}>
                      आप हमारी पूर्व लिखित अनुमति के बिना Task Pilot के किसी भी हिस्से से कॉपी, पुन: पेश, संशोधित, वितरित, बेच, लाइसेंस, रिवर्स इंजीनियर, या व्युत्पन्न कार्य नहीं बना सकते हैं।
                    </Text>
                    <Text style={styles.paragraph}>
                      सेवा के भीतर आपके द्वारा बनाई गई सामग्री पर आपका स्वामित्व अप्रभावित रहता है।
                    </Text>
                  </View>

                  {/* Section 11 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>11. सेवा की उपलब्धता (Service Availability)</Text>
                    <Text style={styles.paragraph}>
                      हमारा लक्ष्य Task Pilot को उपलब्ध और कार्यात्मक बनाए रखना है, लेकिन हम यह गारंटी नहीं देते कि सेवा हमेशा उपलब्ध, निर्बाध, त्रुटि रहित, सुरक्षित या तकनीकी समस्याओं से मुक्त होगी।
                    </Text>
                    <Text style={styles.paragraph}>
                      रखरखाव, अपग्रेड, सर्वर समस्याओं, सुरक्षा उपायों, तकनीकी समस्याओं या हमारे उचित नियंत्रण से परे परिस्थितियों के कारण Task Pilot कभी-कभी अनुपलब्ध हो सकता है।
                    </Text>
                    <Text style={styles.paragraph}>
                      हम उचित रूप से आवश्यक होने पर सेवा के कुछ हिस्सों को संशोधित, अपडेट, सुधार, निलंबित या बंद कर सकते हैं।
                    </Text>
                  </View>

                  {/* Section 12 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>12. सुविधाओं और योजनाओं में परिवर्तन</Text>
                    <Text style={styles.paragraph}>
                      Task Pilot सेवा के Free या Pro संस्करणों से सुविधाओं को जोड़, संशोधित, सुधार, प्रतिबंधित या हटा सकता है।
                    </Text>
                    <Text style={styles.paragraph}>
                      हम भविष्य में नई योजनाएं, सुविधाएं, मूल्य संरचनाएं या कार्यक्षमताएं भी पेश कर सकते हैं।
                    </Text>
                    <Text style={styles.paragraph}>
                      यदि Pro सब्सक्रिप्शन की कीमत बदलती है, तो नई कीमत भविष्य की खरीदारी पर लागू होगी। मूल्य परिवर्तन से पहले से खरीदी गई 30 दिनों की Pro अवधि में कोई बदलाव नहीं होगा।
                    </Text>
                  </View>

                  {/* Section 13 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>13. तृतीय-पक्ष सेवाएं (Third-Party Services)</Text>
                    <Text style={styles.paragraph}>
                      Task Pilot सेवा के कुछ हिस्सों को संचालित करने के लिए तीसरे पक्ष के सेवा प्रदाताओं पर भरोसा कर सकता है, जिसमें भुगतान प्रसंस्करण, ईमेल वितरण, सूचनाएं, होस्टिंग, बुनियादी ढांचा या अन्य तकनीकी सेवाएं शामिल हैं।
                    </Text>
                    <Text style={styles.paragraph}>
                      इन सेवाओं में Razorpay, Expo, Firebase, Resend, Gmail, होस्टिंग प्रदाता या समय-समय पर Task Pilot द्वारा उपयोग की जाने वाली अन्य सेवाएं शामिल हो सकती हैं।
                    </Text>
                    <Text style={styles.paragraph}>
                      तृतीय-पक्ष सेवाओं का आपका उपयोग उन प्रदाताओं के अपने नियमों और नीतियों के अधीन भी हो सकता है।
                    </Text>
                    <Text style={styles.paragraph}>
                      Task Pilot पूरी तरह से तृतीय-पक्ष सेवाओं के कारण होने वाली रुकावटों, विफलताओं या सीमाओं के लिए ज़िम्मेदार नहीं है।
                    </Text>
                  </View>

                  {/* Section 14 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>14. खाता निलंबन और समाप्ति (Account Suspension and Termination)</Text>
                    <Text style={styles.paragraph}>
                      यदि हम उचित रूप से यह निर्धारित करते हैं कि आपने इन शर्तों का उल्लंघन किया है या निषिद्ध, धोखाधड़ी, अपमानजनक, अवैध, या सुरक्षा के लिए खतरनाक गतिविधि में लगे हुए हैं, तो Task Pilot आपके खाते को निलंबित या समाप्त कर सकता है।
                    </Text>
                    <Text style={styles.paragraph}>
                      यह अधिकार Free और Pro दोनों खातों पर लागू होता है।
                    </Text>
                    <Text style={styles.paragraph}>
                      यदि इन शर्तों के उल्लंघन के कारण आपका खाता समाप्त कर दिया जाता है, तो आप किसी भी अप्रयुक्त Pro सदस्यता अवधि के लिए रिफंड के हकदार नहीं होंगे, सिवाय इसके कि जहां लागू कानून द्वारा आवश्यक हो।
                    </Text>
                    <Text style={styles.paragraph}>
                      समाप्ति के बाद, आपके कार्य और खाता डेटा को परिचालन, सुरक्षा, कानूनी या अन्य वैध उद्देश्यों के लिए सीमित अवधि के लिए बनाए रखा जा सकता है। यदि आगे कोई कार्रवाई आवश्यक नहीं है, तो ऐसे डेटा को बाद में हमारी डेटा-प्रतिधारण प्रथाओं और गोपनीयता नीति के अनुसार हटाया जा सकता है।
                    </Text>
                  </View>

                  {/* Section 15 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>15. अस्वीकरण (Disclaimer)</Text>
                    <Text style={styles.paragraph}>
                      Task Pilot एक उत्पादकता और कार्य-प्रबंधन सेवा के रूप में प्रदान किया जाता है।
                    </Text>
                    <Text style={styles.paragraph}>
                      हम गारंटी नहीं देते कि:
                    </Text>
                    <Text style={styles.bulletPoint}>• कार्य हमेशा बिना किसी रुकावट के उपलब्ध रहेंगे।</Text>
                    <Text style={styles.bulletPoint}>• सूचनाएं हमेशा डिलीवर की जाएंगी।</Text>
                    <Text style={styles.bulletPoint}>• सूचनाएं हमेशा ठीक इच्छित समय पर पहुंचेंगी।</Text>
                    <Text style={styles.bulletPoint}>• सेवा हमेशा त्रुटियों या तकनीकी समस्याओं से मुक्त रहेगी।</Text>
                    <Text style={styles.bulletPoint}>• डेटा या कार्यक्षमता कभी भी अस्थायी रूप से अनुपलब्ध नहीं होगी।</Text>
                    <Text style={styles.paragraph}>
                      आप अपने विवेक और जोखिम पर Task Pilot का उपयोग करते हैं। Task Pilot कोई आपातकालीन चेतावनी प्रणाली नहीं है और आपातकालीन, चिकित्सा, कानूनी, वित्तीय, सुरक्षा-महत्वपूर्ण या जीवन-महत्वपूर्ण मामलों के लिए इस पर भरोसा नहीं किया जाना चाहिए।
                    </Text>
                  </View>

                  {/* Section 16 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>16. दायित्व की सीमा (Limitation of Liability)</Text>
                    <Text style={styles.paragraph}>
                      लागू कानून द्वारा अनुमत अधिकतम सीमा तक, Task Pilot और इसके मालिक, संचालक, कर्मचारी, सहयोगी और सेवा प्रदाता सेवा के आपके उपयोग या उपयोग करने में असमर्थता से उत्पन्न या उससे संबंधित अप्रत्यक्ष, आकस्मिक, परिणामी, विशेष या दंडात्मक नुकसान के लिए उत्तरदायी नहीं होंगे।
                    </Text>
                    <Text style={styles.paragraph}>
                      इसमें, जहां कानून द्वारा अनुमति दी गई है, छूटी हुई, विलंबित या विफल सूचनाओं, कार्य उपलब्धता के मुद्दों, सेवा रुकावटों, तकनीकी विफलताओं, डिवाइस की समस्याओं, नेटवर्क समस्याओं, या महत्वपूर्ण मामलों के लिए सेवा पर निर्भरता के परिणामस्वरूप होने वाले नुकसान शामिल हैं।
                    </Text>
                    <Text style={styles.paragraph}>
                      इन शर्तों में कुछ भी ऐसे दायित्व को बाहर करने या सीमित करने का इरादा नहीं रखता है जिसे लागू कानून के तहत कानूनी रूप से बाहर या सीमित नहीं किया जा सकता है।
                    </Text>
                  </View>

                  {/* Section 17 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>17. गोपनीयता नीति (Privacy Policy)</Text>
                    <Text style={styles.paragraph}>
                      Task Pilot का आपका उपयोग हमारी गोपनीयता नीति द्वारा भी नियंत्रित होता है, जो बताती है कि हम व्यक्तिगत जानकारी कैसे एकत्र, उपयोग, संग्रहीत और सुरक्षित करते हैं।
                    </Text>
                    <Text style={styles.paragraph}>
                      हमारी गोपनीयता नीति इन शर्तों का हिस्सा है।
                    </Text>
                  </View>

                  {/* Section 18 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>18. इन शर्तों में परिवर्तन</Text>
                    <Text style={styles.paragraph}>
                      हम सेवा, सुविधाओं, मूल्य निर्धारण, कानूनी आवश्यकताओं या व्यावसायिक प्रथाओं में बदलाव को दर्शाने के लिए समय-समय पर इन शर्तों को अपडेट कर सकते हैं।
                    </Text>
                    <Text style={styles.paragraph}>
                      जब हम परिवर्तन करते हैं, तो हम "अंतिम अपडेट" तिथि को अपडेट कर सकते हैं और, जहां उपयुक्त हो, एप्लिकेशन या अन्य उचित माध्यमों से सूचना प्रदान कर सकते हैं।
                    </Text>
                    <Text style={styles.paragraph}>
                      लागू कानून द्वारा अनुमत सीमा तक, अद्यतन शर्तें प्रभावी होने के बाद Task Pilot का आपका निरंतर उपयोग संशोधित शर्तों की स्वीकृति का गठन करता है।
                    </Text>
                  </View>

                  {/* Section 19 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>19. शासी कानून (Governing Law)</Text>
                    <Text style={styles.paragraph}>
                      ये शर्तें कानून के सिद्धांतों के टकराव की परवाह किए बिना, भारत के लागू कानूनों के अनुसार शासित और व्याख्या की जाएंगी।
                    </Text>
                    <Text style={styles.paragraph}>
                      इन शर्तों या सेवा से संबंधित कोई भी विवाद लागू कानून के अधीन भारत में उपयुक्त क्षेत्राधिकार वाले न्यायालयों के अधिकार क्षेत्र के अधीन होगा।
                    </Text>
                  </View>

                  {/* Section 20 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>20. संपर्क करें (Contact Us)</Text>
                    <Text style={styles.paragraph}>
                      यदि इन शर्तों या Task Pilot के संबंध में आपके कोई प्रश्न, चिंताएं, शिकायतें या सहायता अनुरोध हैं, तो आप एप्लिकेशन के भीतर प्रदान किए गए समर्थन/संपर्क विकल्पों के माध्यम से या हमारे निर्दिष्ट सहायता संपर्क (<Text style={styles.linkText}>support@taskpilot.com</Text>) के माध्यम से हमसे संपर्क कर सकते हैं।
                    </Text>
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.highlightBox}>
                    <Text style={styles.highlightText}>
                      Welcome to Task Pilot. These Terms & Conditions ("Terms") govern your access to and use of the Task Pilot application and related services ("Task Pilot", "we", "us", or "our"). By creating an account or using Task Pilot, you agree to comply with these Terms. If you do not agree with these Terms, please do not use the Service.
                    </Text>
                  </View>

                  {/* Section 1 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>1. About Task Pilot</Text>
                    <Text style={styles.paragraph}>
                      Task Pilot is a task-management and productivity application designed to help users create, organize, schedule, and manage tasks and reminders.
                    </Text>
                    <Text style={styles.paragraph}>
                      Task Pilot may be used for both personal and business purposes.
                    </Text>
                    <Text style={styles.paragraph}>
                      Task Pilot is a productivity tool and is not intended to replace professional, emergency, medical, legal, financial, or other critical services.
                    </Text>
                  </View>

                  {/* Section 2 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>2. User Accounts</Text>
                    <Text style={styles.paragraph}>
                      To use Task Pilot, you must create an account.
                    </Text>
                    <Text style={styles.paragraph}>
                      During registration, you may be required to provide:
                    </Text>
                    <Text style={styles.bulletPoint}>• Your name</Text>
                    <Text style={styles.bulletPoint}>• Your email address</Text>
                    <Text style={styles.bulletPoint}>• A password</Text>
                    <Text style={styles.paragraph}>
                      Your email address must be verified using the verification process provided by Task Pilot.
                    </Text>
                    <Text style={styles.paragraph}>
                      You are responsible for providing accurate information and maintaining the confidentiality of your login credentials.
                    </Text>
                    <Text style={styles.paragraph}>
                      Your Task Pilot account is personal to you. You must not share your login credentials with others or allow unauthorized persons to access your account.
                    </Text>
                    <Text style={styles.paragraph}>
                      You are responsible for activities performed through your account and should notify us if you believe your account has been accessed without authorization.
                    </Text>
                  </View>

                  {/* Section 3 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>3. Task and Reminder Data</Text>
                    <Text style={styles.paragraph}>
                      Users may create, edit, schedule, and delete tasks and reminders within Task Pilot.
                    </Text>
                    <Text style={styles.paragraph}>
                      You retain ownership of the task and other content that you create and submit to Task Pilot.
                    </Text>
                    <Text style={styles.paragraph}>
                      Task Pilot processes and stores your task information so that the Service can provide its task-management and reminder functionality and allow you to access your information when using your account.
                    </Text>
                    <Text style={styles.paragraph}>
                      Task Pilot does not sell your task content or use it for advertising purposes.
                    </Text>
                    <Text style={styles.paragraph}>
                      Task information is not publicly displayed or shared with other users through the Service.
                    </Text>
                  </View>

                  {/* Section 4 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>4. Free Plan</Text>
                    <Text style={styles.paragraph}>
                      The Free Plan allows a user to create up to 3 tasks.
                    </Text>
                    <Text style={styles.paragraph}>
                      Once the maximum of 3 tasks has been reached, the user cannot create additional tasks under the Free Plan.
                    </Text>
                    <Text style={styles.paragraph}>
                      Deleting an existing task does not reset or increase the user's task-creation allowance.
                    </Text>
                    <Text style={styles.paragraph}>
                      Additional task-management functionality may require a Pro subscription.
                    </Text>
                  </View>

                  {/* Section 5 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>5. Pro Subscription</Text>
                    <Text style={styles.paragraph}>
                      Task Pilot offers a Pro subscription for ₹399 for 30 days.
                    </Text>
                    <Text style={styles.paragraph}>
                      A Pro subscription provides additional functionality, including:
                    </Text>
                    <Text style={styles.bulletPoint}>• Unlimited task creation</Text>
                    <Text style={styles.bulletPoint}>• The ability to reuse or repeat previously created tasks across selected dates or periods using the available timeline/repeat functionality</Text>
                    <Text style={styles.paragraph}>
                      Pro access remains available for 30 days from the applicable purchase/activation period.
                    </Text>
                    <Text style={styles.paragraph}>
                      Pro subscriptions currently do not automatically renew.
                    </Text>
                    <Text style={styles.paragraph}>
                      After the 30-day Pro period expires, the user must make another purchase to continue using Pro features.
                    </Text>
                    <Text style={styles.paragraph}>
                      We may introduce, modify, add, or remove subscription features in the future.
                    </Text>
                  </View>

                  {/* Section 6 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>6. Payments</Text>
                    <Text style={styles.paragraph}>
                      Payments for Pro subscriptions are processed through Razorpay or other payment-processing services made available by Task Pilot.
                    </Text>
                    <Text style={styles.paragraph}>
                      By making a purchase, you authorize the applicable payment provider to process the transaction according to its applicable terms and policies.
                    </Text>
                    <Text style={styles.paragraph}>
                      Task Pilot does not store your complete payment-card details on its own servers unless expressly stated otherwise.
                    </Text>
                  </View>

                  {/* Section 7 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>7. Refund Policy</Text>
                    <Text style={styles.paragraph}>
                      All Pro purchases are non-refundable, except where a refund is required by applicable law or where Task Pilot determines that a technical payment issue requires corrective action.
                    </Text>
                    <Text style={styles.paragraph}>
                      If your payment has been successfully deducted but your Pro access has not been activated due to a technical issue, you may contact Task Pilot through the available support or ticket system.
                    </Text>
                    <Text style={styles.paragraph}>
                      We may investigate the transaction and, where appropriate, resolve the issue by activating the purchased service or taking another appropriate corrective action.
                    </Text>
                  </View>

                  {/* Section 8 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>8. Notifications and Reminders</Text>
                    <Text style={styles.paragraph}>
                      Task Pilot may send notifications relating to scheduled tasks and reminders.
                    </Text>
                    <Text style={styles.paragraph}>
                      Depending on the task settings, reminder notifications may be sent:
                    </Text>
                    <Text style={styles.bulletPoint}>• Approximately 10 minutes before the scheduled task, and</Text>
                    <Text style={styles.bulletPoint}>• At the scheduled task time</Text>
                    <Text style={styles.paragraph}>
                      Notification delivery requires the appropriate notification permissions on your device.
                    </Text>
                    <Text style={styles.paragraph}>
                      Task Pilot does not guarantee that every notification will always be delivered exactly on time or delivered at all.
                    </Text>
                    <Text style={styles.paragraph}>
                      Notifications may be delayed, interrupted, or missed due to technical issues, device settings, operating-system restrictions, network conditions, third-party services, maintenance, or other circumstances outside our reasonable control.
                    </Text>
                    <Text style={styles.paragraph}>
                      You remain responsible for monitoring and managing your tasks.
                    </Text>
                    <Text style={styles.paragraph}>
                      Task Pilot should not be used as the sole system for emergency, medical, life-critical, hazardous, legal, or other situations where failure of a reminder could result in serious harm or loss.
                    </Text>
                  </View>

                  {/* Section 9 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>9. Acceptable Use</Text>
                    <Text style={styles.paragraph}>
                      You agree to use Task Pilot only for lawful purposes.
                    </Text>
                    <Text style={styles.paragraph}>
                      You must not:
                    </Text>
                    <Text style={styles.bulletPoint}>• Use Task Pilot for illegal activities.</Text>
                    <Text style={styles.bulletPoint}>• Attempt to access another user's account or information without authorization.</Text>
                    <Text style={styles.bulletPoint}>• Attempt to gain unauthorized access to our systems, servers, databases, or infrastructure.</Text>
                    <Text style={styles.bulletPoint}>• Hack, reverse engineer, decompile, disassemble, or otherwise attempt to derive the source code of the Service.</Text>
                    <Text style={styles.bulletPoint}>• Copy, modify, reproduce, distribute, or create unauthorized derivative versions of the application.</Text>
                    <Text style={styles.bulletPoint}>• Introduce malware, viruses, malicious code, or other harmful material.</Text>
                    <Text style={styles.bulletPoint}>• Use the Service for spam, abuse, harassment, or malicious activities.</Text>
                    <Text style={styles.bulletPoint}>• Attempt to disrupt, damage, overload, or interfere with the Service or its infrastructure.</Text>
                    <Text style={styles.bulletPoint}>• Circumvent or attempt to bypass security measures, usage limits, or access restrictions.</Text>
                    <Text style={styles.bulletPoint}>• Use the Service in a way that violates applicable laws or regulations.</Text>
                    <Text style={styles.paragraph}>
                      We reserve the right to take appropriate action against accounts involved in prohibited activities.
                    </Text>
                  </View>

                  {/* Section 10 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>10. Intellectual Property</Text>
                    <Text style={styles.paragraph}>
                      Task Pilot and its underlying technology are owned by or licensed to Task Pilot.
                    </Text>
                    <Text style={styles.paragraph}>
                      This includes, without limitation:
                    </Text>
                    <Text style={styles.bulletPoint}>• Task Pilot name</Text>
                    <Text style={styles.bulletPoint}>• Logo and branding</Text>
                    <Text style={styles.bulletPoint}>• Application design and user interface</Text>
                    <Text style={styles.bulletPoint}>• Source code</Text>
                    <Text style={styles.bulletPoint}>• Software</Text>
                    <Text style={styles.bulletPoint}>• Features</Text>
                    <Text style={styles.bulletPoint}>• Graphics</Text>
                    <Text style={styles.bulletPoint}>• Text and other proprietary materials</Text>
                    <Text style={styles.paragraph}>
                      Except for the limited right to use the Service in accordance with these Terms, no ownership rights are transferred to you.
                    </Text>
                    <Text style={styles.paragraph}>
                      You may not copy, reproduce, modify, distribute, sell, license, reverse engineer, or create derivative works from any part of Task Pilot without our prior written permission.
                    </Text>
                    <Text style={styles.paragraph}>
                      Your ownership of content that you create within the Service remains unaffected.
                    </Text>
                  </View>

                  {/* Section 11 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>11. Service Availability</Text>
                    <Text style={styles.paragraph}>
                      We aim to keep Task Pilot available and functional, but we do not guarantee that the Service will always be:
                    </Text>
                    <Text style={styles.bulletPoint}>• Available</Text>
                    <Text style={styles.bulletPoint}>• Uninterrupted</Text>
                    <Text style={styles.bulletPoint}>• Error-free</Text>
                    <Text style={styles.bulletPoint}>• Secure</Text>
                    <Text style={styles.bulletPoint}>• Free from bugs or technical issues</Text>
                    <Text style={styles.paragraph}>
                      Task Pilot may occasionally be unavailable because of maintenance, upgrades, server issues, security measures, technical problems, or circumstances beyond our reasonable control.
                    </Text>
                    <Text style={styles.paragraph}>
                      We may modify, update, improve, suspend, or discontinue parts of the Service when reasonably necessary.
                    </Text>
                  </View>

                  {/* Section 12 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>12. Changes to Features and Plans</Text>
                    <Text style={styles.paragraph}>
                      Task Pilot may add, modify, improve, restrict, or remove features from the Free or Pro versions of the Service.
                    </Text>
                    <Text style={styles.paragraph}>
                      We may also introduce new plans, features, pricing structures, or functionality in the future.
                    </Text>
                    <Text style={styles.paragraph}>
                      If the Pro subscription price changes, the new price will apply to future purchases. A price change will not alter the already-purchased 30-day Pro period.
                    </Text>
                  </View>

                  {/* Section 13 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>13. Third-Party Services</Text>
                    <Text style={styles.paragraph}>
                      Task Pilot may rely on third-party service providers to operate certain parts of the Service, including payment processing, email delivery, notifications, hosting, infrastructure, or other technical services.
                    </Text>
                    <Text style={styles.paragraph}>
                      These services may include providers such as Razorpay, Expo, Firebase, Resend, Gmail, hosting providers, or other services used by Task Pilot from time to time.
                    </Text>
                    <Text style={styles.paragraph}>
                      Your use of third-party services may also be subject to those providers' own terms and policies.
                    </Text>
                    <Text style={styles.paragraph}>
                      Task Pilot is not responsible for interruptions, failures, or limitations caused solely by third-party services.
                    </Text>
                  </View>

                  {/* Section 14 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>14. Account Suspension and Termination</Text>
                    <Text style={styles.paragraph}>
                      Task Pilot may suspend or terminate your account if we reasonably determine that you have violated these Terms or engaged in prohibited, fraudulent, abusive, illegal, or security-threatening activity.
                    </Text>
                    <Text style={styles.paragraph}>
                      This right applies to both Free and Pro accounts.
                    </Text>
                    <Text style={styles.paragraph}>
                      If your account is terminated because of a violation of these Terms, you will not be entitled to a refund for any unused Pro subscription period, except where required by applicable law.
                    </Text>
                    <Text style={styles.paragraph}>
                      Following termination, your task and account data may be retained for a limited period for operational, security, legal, or other legitimate purposes. If no further action is required, such data may subsequently be deleted in accordance with our data-retention practices and Privacy Policy.
                    </Text>
                  </View>

                  {/* Section 15 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>15. Disclaimer</Text>
                    <Text style={styles.paragraph}>
                      Task Pilot is provided as a productivity and task-management service.
                    </Text>
                    <Text style={styles.paragraph}>
                      We do not guarantee that:
                    </Text>
                    <Text style={styles.bulletPoint}>• Tasks will always be available without interruption.</Text>
                    <Text style={styles.bulletPoint}>• Notifications will always be delivered.</Text>
                    <Text style={styles.bulletPoint}>• Notifications will always arrive at the exact intended time.</Text>
                    <Text style={styles.bulletPoint}>• The Service will always be free from errors or technical problems.</Text>
                    <Text style={styles.bulletPoint}>• Data or functionality will never be temporarily unavailable.</Text>
                    <Text style={styles.paragraph}>
                      You use Task Pilot at your own discretion and risk.
                    </Text>
                    <Text style={styles.paragraph}>
                      Task Pilot is not an emergency alert system and should not be relied upon for emergency, medical, legal, financial, safety-critical, or life-critical matters.
                    </Text>
                  </View>

                  {/* Section 16 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>16. Limitation of Liability</Text>
                    <Text style={styles.paragraph}>
                      To the maximum extent permitted by applicable law, Task Pilot and its owners, operators, employees, affiliates, and service providers will not be liable for indirect, incidental, consequential, special, or punitive damages arising from or related to your use of, or inability to use, the Service.
                    </Text>
                    <Text style={styles.paragraph}>
                      This includes, where permitted by law, losses resulting from missed, delayed, or failed notifications, task availability issues, service interruptions, technical failures, device issues, network problems, or reliance on the Service for critical matters.
                    </Text>
                    <Text style={styles.paragraph}>
                      Nothing in these Terms is intended to exclude or limit liability that cannot legally be excluded or limited under applicable law.
                    </Text>
                  </View>

                  {/* Section 17 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>17. Privacy Policy</Text>
                    <Text style={styles.paragraph}>
                      Your use of Task Pilot is also governed by our Privacy Policy, which explains how we collect, use, store, and protect personal information.
                    </Text>
                    <Text style={styles.paragraph}>
                      Our Privacy Policy forms part of these Terms.
                    </Text>
                  </View>

                  {/* Section 18 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>18. Changes to These Terms</Text>
                    <Text style={styles.paragraph}>
                      We may update these Terms from time to time to reflect changes to the Service, features, pricing, legal requirements, or business practices.
                    </Text>
                    <Text style={styles.paragraph}>
                      When we make changes, we may update the "Last Updated" date and, where appropriate, provide notice through the application or other reasonable means.
                    </Text>
                    <Text style={styles.paragraph}>
                      Your continued use of Task Pilot after updated Terms become effective constitutes acceptance of the revised Terms, to the extent permitted by applicable law.
                    </Text>
                  </View>

                  {/* Section 19 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>19. Governing Law</Text>
                    <Text style={styles.paragraph}>
                      These Terms shall be governed by and interpreted in accordance with the applicable laws of India, without regard to conflict-of-law principles.
                    </Text>
                    <Text style={styles.paragraph}>
                      Any disputes relating to these Terms or the Service shall be subject to the jurisdiction of the courts having appropriate jurisdiction in India, subject to applicable law.
                    </Text>
                  </View>

                  {/* Section 20 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>20. Contact Us</Text>
                    <Text style={styles.paragraph}>
                      If you have questions, concerns, complaints, or support requests regarding these Terms or Task Pilot, you may contact us through the support/contact options provided within the application or through our designated support contact at <Text style={styles.linkText}>support@taskpilot.com</Text>.
                    </Text>
                  </View>
                </>
              )}
            </ScrollView>

            {/* Footer Button */}
            <View style={styles.footer}>
              <TouchableOpacity
                style={styles.doneBtn}
                activeOpacity={0.85}
                onPress={onClose}
              >
                <Text style={styles.doneBtnText}>
                  {isHindi ? 'स्वीकार करें (Accept)' : 'I Accept'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  safeContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    height: '90%',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    ...shadows.floating,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  scrollIcon: {
    fontSize: 28,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    flexShrink: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 28,
  },
  highlightBox: {
    backgroundColor: '#EFF6FF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    marginBottom: 20,
  },
  highlightText: {
    fontSize: 13.5,
    color: '#1E40AF',
    lineHeight: 20,
    fontWeight: '500',
  },
  section: {
    marginBottom: 20,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  paragraph: {
    fontSize: 13.5,
    color: '#334155',
    lineHeight: 20,
    marginBottom: 6,
  },
  bulletPoint: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 20,
    paddingLeft: 6,
    marginBottom: 5,
  },
  bold: {
    fontWeight: '700',
    color: '#0F172A',
  },
  linkText: {
    color: colors.primary,
    fontWeight: '700',
  },
  footer: {
    paddingHorizontal: 22,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  doneBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.card,
  },
  doneBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});

export default TermsAndConditionsModal;
