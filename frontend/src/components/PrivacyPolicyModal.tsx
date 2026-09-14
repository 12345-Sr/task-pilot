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

interface PrivacyPolicyModalProps {
  visible: boolean;
  onClose: () => void;
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({ visible, onClose }) => {
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
                <Text style={styles.shieldIcon}>🛡️</Text>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.title} numberOfLines={1}>
                    {isHindi ? 'Privacy Policy' : 'Privacy Policy'}
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

            {/* Scrollable Policy Content */}
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={true}
            >
              {isHindi ? (
                <>
                  <View style={styles.highlightBox}>
                    <Text style={styles.highlightText}>
                      Task Pilot ("Task Pilot", "हम", "हमें", या "हमारा") आपकी गोपनीयता का सम्मान करता है और हमारी कार्य-प्रबंधन और उत्पादकता सेवा का उपयोग करते समय आपके द्वारा प्रदान की जाने वाली जानकारी की सुरक्षा के लिए प्रतिबद्ध है।
                    </Text>
                  </View>

                  {/* Section 1 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>1. जो जानकारी हम एकत्र करते हैं (Information We Collect)</Text>
                    <Text style={styles.paragraph}>
                      जब आप एक Task Pilot अकाउंट बनाते और उपयोग करते हैं, तो हम निम्नलिखित जानकारी एकत्र और संग्रहीत कर सकते हैं:
                    </Text>
                    <Text style={styles.subheading}>खाता जानकारी (Account Information):</Text>
                    <Text style={styles.bulletPoint}>• नाम</Text>
                    <Text style={styles.bulletPoint}>• ईमेल पता</Text>
                    <Text style={styles.bulletPoint}>• पासवर्ड जानकारी (हैशेड)</Text>
                    <Text style={styles.bulletPoint}>• ईमेल सत्यापन जानकारी</Text>
                    <Text style={styles.paragraph}>
                      आपका पासवर्ड उपयुक्त पासवर्ड-हैशिंग/सुरक्षा तंत्र का उपयोग करके संग्रहीत किया जाता है और इसे सादे-पाठ (plain-text) डेटा के रूप में संग्रहीत करने का इरादा नहीं है।
                    </Text>

                    <Text style={styles.subheading}>टास्क और रिमाइंडर जानकारी:</Text>
                    <Text style={styles.paragraph}>
                      हम Task Pilot के भीतर आपके द्वारा बनाई गई जानकारी एकत्र और संग्रहीत करते हैं, जिसमें शामिल हैं:
                    </Text>
                    <Text style={styles.bulletPoint}>• टास्क के नाम या विवरण</Text>
                    <Text style={styles.bulletPoint}>• निर्धारित तिथियां</Text>
                    <Text style={styles.bulletPoint}>• निर्धारित समय</Text>
                    <Text style={styles.bulletPoint}>• रिमाइंडर जानकारी</Text>
                    <Text style={styles.bulletPoint}>• कार्य स्थिति (status)</Text>
                    <Text style={styles.bulletPoint}>• टाइमलाइन/रिपीट जानकारी</Text>
                    <Text style={styles.bulletPoint}>• कार्य-प्रबंधन कार्यक्षमता प्रदान करने के लिए आवश्यक अन्य जानकारी</Text>
                    <Text style={styles.paragraph}>
                      आप अपने द्वारा बनाई गई सामग्री का स्वामित्व बनाए रखते हैं।
                    </Text>

                    <Text style={styles.subheading}>डिवाइस और नोटिफिकेशन जानकारी:</Text>
                    <Text style={styles.paragraph}>
                      रिमाइंडर सूचनाएं प्रदान करने के लिए, हम आपके खाते या डिवाइस से जुड़े डिवाइस या पुश-नोटिफिकेशन टोकन को एकत्र और संग्रहीत कर सकते हैं। यह Task Pilot को आपके डिवाइस पर प्रासंगिक सूचनाएं भेजने की अनुमति देता है।
                    </Text>
                  </View>

                  {/* Section 2 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>2. हम आपकी जानकारी का उपयोग कैसे करते हैं</Text>
                    <Text style={styles.paragraph}>
                      हम एकत्रित जानकारी का उपयोग निम्नलिखित के लिए करते हैं:
                    </Text>
                    <Text style={styles.bulletPoint}>• आपका खाता बनाना और बनाए रखना।</Text>
                    <Text style={styles.bulletPoint}>• अपने खाते को प्रमाणित (authenticate) करना।</Text>
                    <Text style={styles.bulletPoint}>• अपना ईमेल पता सत्यापित करना।</Text>
                    <Text style={styles.bulletPoint}>• लॉगिन और पासवर्ड-पुनर्प्राप्ति कार्यक्षमता प्रदान करना।</Text>
                    <Text style={styles.bulletPoint}>• अपने कार्यों और रिमाइंडर्स को संग्रहीत और प्रदर्शित करना।</Text>
                    <Text style={styles.bulletPoint}>• सूचनाएं शेड्यूल और वितरित करना।</Text>
                    <Text style={styles.bulletPoint}>• Free और Pro कार्यक्षमता प्रदान करना।</Text>
                    <Text style={styles.bulletPoint}>• सब्सक्रिप्शन भुगतानों को प्रोसेस करना।</Text>
                    <Text style={styles.bulletPoint}>• ग्राहक सहायता (customer support) प्रदान करना।</Text>
                    <Text style={styles.bulletPoint}>• तकनीकी समस्याओं की जांच करना और उनका समाधान करना।</Text>
                    <Text style={styles.bulletPoint}>• सेवा को बनाए रखना और सुरक्षित करना।</Text>
                    <Text style={styles.bulletPoint}>• अनधिकृत या अपमानजनक गतिविधि का पता लगाना और उसे रोकना।</Text>
                    <Text style={styles.bulletPoint}>• लागू कानूनी दायित्वों का अनुपालन करना।</Text>
                    <Text style={styles.paragraph}>
                      हम विज्ञापन उद्देश्यों के लिए आपकी व्यक्तिगत जानकारी या कार्य सामग्री को बेचते नहीं हैं।
                    </Text>
                  </View>

                  {/* Section 3 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>3. आपका टास्क डेटा कैसे उपयोग किया जाता है</Text>
                    <Text style={styles.paragraph}>
                      आपकी कार्य और रिमाइंडर जानकारी मुख्य रूप से संसाधित और संग्रहीत की जाती है ताकि Task Pilot आपके द्वारा अनुरोधित कार्यक्षमता प्रदान कर सके।
                    </Text>
                    <Text style={styles.paragraph}>
                      उदाहरण के लिए, हमें आपके कार्यों को संग्रहीत करने की आवश्यकता है ताकि आप बाद में अपने खाते के माध्यम से उन तक पहुंच सकें और निर्धारित अनुस्मारक उत्पन्न किए जा सकें।
                    </Text>
                    <Text style={styles.paragraph}>
                      आपके कार्यों को सार्वजनिक रूप से प्रदर्शित करने या अन्य Task Pilot उपयोगकर्ताओं के लिए उपलब्ध कराने का इरादा नहीं है।
                    </Text>
                  </View>

                  {/* Section 4 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>4. खाता प्रमाणीकरण और सुरक्षा</Text>
                    <Text style={styles.paragraph}>
                      Task Pilot आपके खाते की सुरक्षा के लिए प्रमाणीकरण तंत्र का उपयोग करता है।
                    </Text>
                    <Text style={styles.paragraph}>
                      पासवर्ड को पढ़ने योग्य सादे-पाठ पासवर्ड के रूप में संग्रहीत करने के बजाय पासवर्ड-हैशिंग/सुरक्षा प्रथाओं का उपयोग करके नियंत्रित किया जाता है।
                    </Text>
                    <Text style={styles.paragraph}>
                      आप अपना ईमेल पता और पासवर्ड सुरक्षित रखने के लिए स्वयं जिम्मेदार हैं।
                    </Text>
                    <Text style={styles.paragraph}>
                      कोई भी ऑनलाइन सेवा पूर्ण सुरक्षा की गारंटी नहीं दे सकती। यद्यपि हम आपकी जानकारी की सुरक्षा के लिए उचित तकनीकी और संगठनात्मक उपाय करते हैं, हम यह गारंटी नहीं दे सकते कि अनधिकृत पहुंच, सुरक्षा घटनाएं या अन्य विफलताएं कभी नहीं होंगी।
                    </Text>
                  </View>

                  {/* Section 5 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>5. नोटिफिकेशन्स</Text>
                    <Text style={styles.paragraph}>
                      Task Pilot आपके डिवाइस पर रिमाइंडर देने के लिए पुश-नोटिफिकेशन सेवाओं का उपयोग कर सकता है। सूचनाएं प्राप्त करने के लिए, आपको अपने डिवाइस पर आवश्यक सूचना अनुमति प्रदान करनी होगी।
                    </Text>
                    <Text style={styles.paragraph}>
                      सूचनाओं में किसी निर्धारित कार्य की पहचान करने या आपको याद दिलाने के लिए आवश्यक जानकारी शामिल हो सकती है।
                    </Text>
                    <Text style={styles.paragraph}>
                      सूचना वितरण डिवाइस सेटिंग्स, ऑपरेटिंग-सिस्टम प्रतिबंधों, नेटवर्क स्थितियों, तृतीय-पक्ष अधिसूचना बुनियादी ढांचे, रखरखाव, या अन्य तकनीकी परिस्थितियों से प्रभावित हो सकता है।
                    </Text>
                  </View>

                  {/* Section 6 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>6. तृतीय-पक्ष सेवा प्रदाता (Third-Party Service Providers)</Text>
                    <Text style={styles.paragraph}>
                      हम Task Pilot को संचालित करने में सहायता के लिए तृतीय-पक्ष प्रदाताओं का उपयोग कर सकते हैं। इनमें निम्नलिखित सेवाएं शामिल हो सकती हैं:
                    </Text>
                    <Text style={styles.bulletPoint}>• <Text style={styles.bold}>भुगतान प्रसंस्करण (Payment processing):</Text> Razorpay</Text>
                    <Text style={styles.bulletPoint}>• <Text style={styles.bold}>पुश सूचनाएं (Push notifications):</Text> Expo और/या Firebase</Text>
                    <Text style={styles.bulletPoint}>• <Text style={styles.bold}>ईमेल वितरण (Email delivery):</Text> Resend और/या Gmail</Text>
                    <Text style={styles.bulletPoint}>• <Text style={styles.bold}>होस्टिंग/सर्वर अवसंरचना:</Text> लागू होस्टिंग और बुनियादी ढांचा प्रदाता</Text>
                    <Text style={styles.bulletPoint}>• Task Pilot को संचालित और बनाए रखने के लिए आवश्यक अन्य तकनीकी सेवाएं</Text>
                    <Text style={styles.paragraph}>
                      ये प्रदाता अपनी सेवाएं प्रदान करने के लिए आवश्यक होने पर हमारी ओर से जानकारी संसाधित कर सकते हैं। हम विज्ञापन उद्देश्यों के लिए आपकी व्यक्तिगत जानकारी इन प्रदाताओं को नहीं बेचते हैं। तृतीय-पक्ष प्रदाताओं की अपनी गोपनीयता नीतियां और शर्तें हो सकती हैं।
                    </Text>
                  </View>

                  {/* Section 7 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>7. पेमेंट्स (Payments)</Text>
                    <Text style={styles.paragraph}>
                      जब आप Task Pilot Pro खरीदते हैं, तो भुगतान प्रसंस्करण Razorpay या Task Pilot द्वारा उपलब्ध कराए गए किसी अन्य भुगतान प्रदाता के माध्यम से नियंत्रित किया जाता है।
                    </Text>
                    <Text style={styles.paragraph}>
                      भुगतान प्रदाता आपके लेन-देन को संसाधित करने के लिए आवश्यक जानकारी एकत्र कर सकते हैं।
                    </Text>
                    <Text style={styles.paragraph}>
                      सदस्यता सेवा प्रदान करने के लिए Task Pilot को आपकी पूरी भुगतान-कार्ड जानकारी संग्रहीत करने की आवश्यकता नहीं है। भुगतान जानकारी लागू भुगतान प्रदाता द्वारा अपनी नीतियों और कानूनी दायित्वों के अनुसार भी रखी जा सकती है।
                    </Text>
                  </View>

                  {/* Section 8 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>8. डेटा शेयरिंग (Data Sharing)</Text>
                    <Text style={styles.paragraph}>
                      हम आपकी व्यक्तिगत जानकारी या कार्य सामग्री को बेचते नहीं हैं। हम केवल उचित रूप से आवश्यक होने पर ही जानकारी का खुलासा कर सकते हैं, जिसमें शामिल हैं:
                    </Text>
                    <Text style={styles.bulletPoint}>• सेवा प्रदाताओं को जो हमें Task Pilot संचालित करने में मदद करते हैं।</Text>
                    <Text style={styles.bulletPoint}>• सेवा की सुरक्षा और अखंडता की रक्षा के लिए।</Text>
                    <Text style={styles.bulletPoint}>• धोखाधड़ी, दुरुपयोग या अनधिकृत गतिविधि की जांच करने के लिए।</Text>
                    <Text style={styles.bulletPoint}>• लागू कानूनों, विनियमों, कानूनी प्रक्रियाओं, अदालती आदेशों या अधिकृत सरकारी अधिकारियों के वैध अनुरोधों का पालन करने के लिए।</Text>
                    <Text style={styles.bulletPoint}>• जहां प्रकटीकरण अन्यथा आवश्यक हो या लागू कानून द्वारा अनुमत हो।</Text>
                    <Text style={styles.paragraph}>
                      जहां कानूनी रूप से अनुमति हो, हम प्रकटीकरण को लागू अनुरोध या उद्देश्य से संबंधित जानकारी तक सीमित करने के लिए उचित कदम उठा सकते हैं।
                    </Text>
                  </View>

                  {/* Section 9 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>9. डेटा प्रतिधारण (Data Retention)</Text>
                    <Text style={styles.paragraph}>
                      हम आपके खाते और कार्य की जानकारी तब तक बनाए रखते हैं जब तक सेवा प्रदान करने और आपके खाते को बनाए रखने के लिए उचित रूप से आवश्यक हो।
                    </Text>
                    <Text style={styles.paragraph}>
                      यदि कोई खाता समाप्त कर दिया जाता है, तो प्रासंगिक जानकारी को सुरक्षा, कानूनी, परिचालन, बैकअप, विवाद-समाधान, या अन्य वैध उद्देश्यों के लिए सीमित अवधि के लिए बनाए रखा जा सकता है।
                    </Text>
                    <Text style={styles.paragraph}>
                      लागू प्रतिधारण अवधि के बाद, जानकारी को हटाया या अनामित (anonymized) किया जा सकता है।
                    </Text>
                  </View>

                  {/* Section 10 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>10. खाता हटाना (Account Deletion)</Text>
                    <Text style={styles.paragraph}>
                      वर्तमान में, Task Pilot सीधे एप्लिकेशन के भीतर एक सेल्फ-सर्विस खाता हटाने का विकल्प प्रदान नहीं करता है।
                    </Text>
                    <Text style={styles.paragraph}>
                      यदि आप अपना खाता या व्यक्तिगत जानकारी हटाने का अनुरोध करना चाहते हैं, तो आप उपलब्ध समर्थन/संपर्क चैनल के माध्यम से Task Pilot से संपर्क कर सकते हैं।
                    </Text>
                    <Text style={styles.paragraph}>
                      एक वैध विलोपन अनुरोध प्राप्त करने के बाद, हम अनुरोध को सत्यापित कर सकते हैं और लागू कानून और हमारी वैध परिचालन और कानूनी आवश्यकताओं के अनुसार विलोपन की प्रक्रिया कर सकते हैं।
                    </Text>
                    <Text style={styles.paragraph}>
                      कुछ जानकारी को कानून द्वारा आवश्यक या अनुमत होने पर सीमित अवधि के लिए बनाए रखने की आवश्यकता हो सकती है।
                    </Text>
                  </View>

                  {/* Section 11 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>11. डेटा सुरक्षा (Data Security)</Text>
                    <Text style={styles.paragraph}>
                      हम आपकी जानकारी को अनधिकृत पहुंच, परिवर्तन, प्रकटीकरण या विनाश से बचाने के लिए डिज़ाइन किए गए उचित तकनीकी और संगठनात्मक उपायों का उपयोग करते हैं। इन उपायों में शामिल हो सकते हैं:
                    </Text>
                    <Text style={styles.bulletPoint}>• HTTPS/TLS का उपयोग करके सुरक्षित संचार</Text>
                    <Text style={styles.bulletPoint}>• पासवर्ड हैशिंग</Text>
                    <Text style={styles.bulletPoint}>• एक्सेस नियंत्रण</Text>
                    <Text style={styles.bulletPoint}>• सर्वर और डेटाबेस सुरक्षा उपाय</Text>
                    <Text style={styles.bulletPoint}>• सुरक्षा निगरानी और रखरखाव</Text>
                    <Text style={styles.bulletPoint}>• बैकअप और पुनर्प्राप्ति उपाय</Text>
                    <Text style={styles.paragraph}>
                      हालांकि, किसी भी इंटरनेट ट्रांसमिशन या इलेक्ट्रॉनिक स्टोरेज सिस्टम को पूरी तरह से सुरक्षित होने की गारंटी नहीं दी जा सकती है।
                    </Text>
                  </View>

                  {/* Section 12 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>12. बच्चों की गोपनीयता (Children's Privacy)</Text>
                    <Text style={styles.paragraph}>
                      Task Pilot का उपयोग ऐसे उद्देश्यों के लिए नहीं किया जाना चाहिए जिनके लिए हमें लागू कानून के उल्लंघन में बच्चों से जानबूझकर व्यक्तिगत जानकारी एकत्र करने की आवश्यकता हो।
                    </Text>
                    <Text style={styles.paragraph}>
                      यदि हमें पता चलता है कि हमने ऐसी परिस्थितियों में किसी बच्चे से व्यक्तिगत जानकारी एकत्र की है जहां ऐसा संग्रह अनुमत नहीं है, तो हम जानकारी को हटाने के लिए उचित कदम उठा सकते हैं।
                    </Text>
                    <Text style={styles.paragraph}>
                      माता-पिता या कानूनी अभिभावक जो मानते हैं कि किसी बच्चे ने हमें व्यक्तिगत जानकारी प्रदान की है, वे उपलब्ध सहायता चैनल के माध्यम से हमसे संपर्क कर सकते हैं।
                    </Text>
                  </View>

                  {/* Section 13 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>13. कुकीज़ और ट्रैकिंग (Cookies and Tracking)</Text>
                    <Text style={styles.paragraph}>
                      Task Pilot की मुख्य कार्य-प्रबंधन कार्यक्षमता के लिए हमें विज्ञापन उद्देश्यों के लिए व्यक्तिगत जानकारी या कार्य सामग्री बेचने की आवश्यकता नहीं है।
                    </Text>
                    <Text style={styles.paragraph}>
                      यदि भविष्य में एनालिटिक्स, कुकीज, पहचानकर्ता या इसी तरह की प्रौद्योगिकियां पेश की जाती हैं, तो इस गोपनीयता नीति को जहां लागू कानून द्वारा आवश्यक हो, उनके उपयोग को समझाने के लिए अद्यतन किया जा सकता है।
                    </Text>
                  </View>

                  {/* Section 14 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>14. आपके अधिकार (Your Rights)</Text>
                    <Text style={styles.paragraph}>
                      आपके स्थान और लागू कानून के आधार पर, आपके पास अपनी व्यक्तिगत जानकारी से संबंधित अधिकार हो सकते हैं, जिसमें निम्नलिखित अधिकार शामिल हो सकते हैं:
                    </Text>
                    <Text style={styles.bulletPoint}>• कुछ व्यक्तिगत जानकारी तक पहुंच का अनुरोध करना।</Text>
                    <Text style={styles.bulletPoint}>• गलत जानकारी को सही करने का अनुरोध करना।</Text>
                    <Text style={styles.bulletPoint}>• जहां कानूनी रूप से लागू हो, व्यक्तिगत जानकारी को हटाने का अनुरोध करना।</Text>
                    <Text style={styles.bulletPoint}>• आपकी जानकारी कैसे संसाधित की जाती है, इसके बारे में प्रश्न पूछना।</Text>
                    <Text style={styles.bulletPoint}>• गोपनीयता संबंधी चिंताओं या शिकायतों को उठाना।</Text>
                    <Text style={styles.paragraph}>
                      लागू अधिकारों का प्रयोग करने के लिए, Task Pilot द्वारा प्रदान की गई सहायता/संपर्क जानकारी का उपयोग करके हमसे संपर्क करें। कुछ अनुरोधों को संसाधित करने से पहले हमें आपकी पहचान सत्यापित करने की आवश्यकता हो सकती है।
                    </Text>
                  </View>

                  {/* Section 15 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>15. इस गोपनीयता नीति में परिवर्तन</Text>
                    <Text style={styles.paragraph}>
                      हम अपनी सेवा, प्रौद्योगिकी, कानूनी आवश्यकताओं या डेटा प्रथाओं में बदलाव को दर्शाने के लिए समय-समय पर इस गोपनीयता नीति को अपडेट कर सकते हैं।
                    </Text>
                    <Text style={styles.paragraph}>
                      जब हम परिवर्तन करेंगे, तो हम "अंतिम अपडेट" तिथि को अपडेट करेंगे और जहां उपयुक्त हो अतिरिक्त सूचना प्रदान कर सकते हैं।
                    </Text>
                    <Text style={styles.paragraph}>
                      हम आपको समय-समय पर इस गोपनीयता नीति की समीक्षा करने के लिए प्रोत्साहित करते हैं।
                    </Text>
                  </View>

                  {/* Section 16 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>16. संपर्क करें (Contact Us)</Text>
                    <Text style={styles.paragraph}>
                      यदि इस गोपनीयता नीति या आपकी जानकारी से निपटने के संबंध में आपके कोई प्रश्न, चिंताएं, शिकायतें या अनुरोध हैं, तो कृपया Task Pilot द्वारा प्रदान किए गए समर्थन/संपर्क विकल्पों के माध्यम से या हमारे आधिकारिक ईमेल (<Text style={styles.linkText}>support@taskpilot.com</Text>) पर हमसे संपर्क करें।
                    </Text>
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.highlightBox}>
                    <Text style={styles.highlightText}>
                      Task Pilot ("Task Pilot", "we", "us", or "our") respects your privacy and is committed to protecting the information you provide while using our task-management and productivity service. This Privacy Policy explains what information we collect, how we use it, how we protect it, and the choices available to you.
                    </Text>
                  </View>

                  {/* Section 1 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>1. Information We Collect</Text>
                    <Text style={styles.paragraph}>
                      When you create and use a Task Pilot account, we may collect and store:
                    </Text>
                    <Text style={styles.subheading}>Account Information</Text>
                    <Text style={styles.bulletPoint}>• Name</Text>
                    <Text style={styles.bulletPoint}>• Email address</Text>
                    <Text style={styles.bulletPoint}>• Password information</Text>
                    <Text style={styles.bulletPoint}>• Email verification information</Text>
                    <Text style={styles.paragraph}>
                      Your password is stored using appropriate password-hashing/security mechanisms and is not intended to be stored as plain-text password data.
                    </Text>

                    <Text style={styles.subheading}>Task and Reminder Information</Text>
                    <Text style={styles.paragraph}>
                      We collect and store information that you create within Task Pilot, including:
                    </Text>
                    <Text style={styles.bulletPoint}>• Task names or descriptions</Text>
                    <Text style={styles.bulletPoint}>• Scheduled dates</Text>
                    <Text style={styles.bulletPoint}>• Scheduled times</Text>
                    <Text style={styles.bulletPoint}>• Reminder information</Text>
                    <Text style={styles.bulletPoint}>• Task status</Text>
                    <Text style={styles.bulletPoint}>• Timeline/repeat information</Text>
                    <Text style={styles.bulletPoint}>• Other information necessary to provide task-management functionality</Text>
                    <Text style={styles.paragraph}>
                      You retain ownership of the content you create.
                    </Text>

                    <Text style={styles.subheading}>Device and Notification Information</Text>
                    <Text style={styles.paragraph}>
                      To provide reminder notifications, we may collect and store a device or push-notification token associated with your account or device. This allows Task Pilot to send relevant notifications to your device.
                    </Text>
                  </View>

                  {/* Section 2 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>2. How We Use Your Information</Text>
                    <Text style={styles.paragraph}>
                      We use collected information to:
                    </Text>
                    <Text style={styles.bulletPoint}>• Create and maintain your account.</Text>
                    <Text style={styles.bulletPoint}>• Authenticate your account.</Text>
                    <Text style={styles.bulletPoint}>• Verify your email address.</Text>
                    <Text style={styles.bulletPoint}>• Provide login and password-recovery functionality.</Text>
                    <Text style={styles.bulletPoint}>• Store and display your tasks and reminders.</Text>
                    <Text style={styles.bulletPoint}>• Schedule and deliver notifications.</Text>
                    <Text style={styles.bulletPoint}>• Provide Free and Pro functionality.</Text>
                    <Text style={styles.bulletPoint}>• Process subscription payments.</Text>
                    <Text style={styles.bulletPoint}>• Provide customer support.</Text>
                    <Text style={styles.bulletPoint}>• Investigate and resolve technical issues.</Text>
                    <Text style={styles.bulletPoint}>• Maintain and secure the Service.</Text>
                    <Text style={styles.bulletPoint}>• Detect and prevent unauthorized or abusive activity.</Text>
                    <Text style={styles.bulletPoint}>• Comply with applicable legal obligations.</Text>
                    <Text style={styles.paragraph}>
                      We do not sell your personal information or task content for advertising purposes.
                    </Text>
                  </View>

                  {/* Section 3 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>3. How Your Task Data Is Used</Text>
                    <Text style={styles.paragraph}>
                      Your task and reminder information is primarily processed and stored so that Task Pilot can provide the functionality you request.
                    </Text>
                    <Text style={styles.paragraph}>
                      For example, we need to store your tasks so that you can access them later through your account and so that scheduled reminders can be generated.
                    </Text>
                    <Text style={styles.paragraph}>
                      Your tasks are not intended to be publicly displayed or made available to other Task Pilot users.
                    </Text>
                  </View>

                  {/* Section 4 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>4. Account Authentication and Security</Text>
                    <Text style={styles.paragraph}>
                      Task Pilot uses authentication mechanisms to protect your account.
                    </Text>
                    <Text style={styles.paragraph}>
                      Passwords are handled using password-hashing/security practices rather than being stored as readable plain-text passwords.
                    </Text>
                    <Text style={styles.paragraph}>
                      You are responsible for keeping your email address and password secure.
                    </Text>
                    <Text style={styles.paragraph}>
                      No online service can guarantee absolute security. While we take reasonable technical and organizational measures to protect your information, we cannot guarantee that unauthorized access, security incidents, or other failures will never occur.
                    </Text>
                  </View>

                  {/* Section 5 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>5. Notifications</Text>
                    <Text style={styles.paragraph}>
                      Task Pilot may use push-notification services to deliver reminders to your device.
                    </Text>
                    <Text style={styles.paragraph}>
                      To receive notifications, you must provide the necessary notification permission on your device.
                    </Text>
                    <Text style={styles.paragraph}>
                      Notifications may include information necessary to identify or remind you about a scheduled task.
                    </Text>
                    <Text style={styles.paragraph}>
                      Notification delivery can be affected by device settings, operating-system restrictions, network conditions, third-party notification infrastructure, maintenance, or other technical circumstances.
                    </Text>
                  </View>

                  {/* Section 6 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>6. Third-Party Service Providers</Text>
                    <Text style={styles.paragraph}>
                      We may use third-party providers to help operate Task Pilot. These may include services for:
                    </Text>
                    <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Payment processing:</Text> Razorpay</Text>
                    <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Push notifications:</Text> Expo and/or Firebase</Text>
                    <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Email delivery:</Text> Resend and/or Gmail</Text>
                    <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Hosting/server infrastructure:</Text> Applicable hosting and infrastructure providers</Text>
                    <Text style={styles.bulletPoint}>• Other technical services required to operate and maintain Task Pilot</Text>
                    <Text style={styles.paragraph}>
                      These providers may process information on our behalf where necessary to provide their services. We do not sell your personal information to these providers for advertising purposes. Third-party providers may have their own privacy policies and terms governing their services.
                    </Text>
                  </View>

                  {/* Section 7 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>7. Payments</Text>
                    <Text style={styles.paragraph}>
                      When you purchase Task Pilot Pro, payment processing is handled through Razorpay or another payment provider made available by Task Pilot.
                    </Text>
                    <Text style={styles.paragraph}>
                      Payment providers may collect information required to process your transaction.
                    </Text>
                    <Text style={styles.paragraph}>
                      Task Pilot does not need to store your complete payment-card information in order to provide the subscription service. Payment information may also be retained by the applicable payment provider according to its own policies and legal obligations.
                    </Text>
                  </View>

                  {/* Section 8 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>8. Data Sharing</Text>
                    <Text style={styles.paragraph}>
                      We do not sell your personal information or task content.
                    </Text>
                    <Text style={styles.paragraph}>
                      We may disclose information only where reasonably necessary, including:
                    </Text>
                    <Text style={styles.bulletPoint}>• To service providers that help us operate Task Pilot.</Text>
                    <Text style={styles.bulletPoint}>• To protect the security and integrity of the Service.</Text>
                    <Text style={styles.bulletPoint}>• To investigate fraud, abuse, or unauthorized activity.</Text>
                    <Text style={styles.bulletPoint}>• To comply with applicable laws, regulations, legal processes, court orders, or valid requests from authorized government or law-enforcement authorities.</Text>
                    <Text style={styles.bulletPoint}>• Where disclosure is otherwise necessary or permitted by applicable law.</Text>
                    <Text style={styles.paragraph}>
                      Where legally permitted, we may take reasonable steps to limit disclosures to information relevant to the applicable request or purpose.
                    </Text>
                  </View>

                  {/* Section 9 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>9. Data Retention</Text>
                    <Text style={styles.paragraph}>
                      We retain your account and task information for as long as reasonably necessary to provide the Service and maintain your account.
                    </Text>
                    <Text style={styles.paragraph}>
                      If an account is terminated, relevant information may be retained for a limited period for security, legal, operational, backup, dispute-resolution, or other legitimate purposes.
                    </Text>
                    <Text style={styles.paragraph}>
                      After the applicable retention period, information may be deleted or anonymized. We may retain certain information where required by law or reasonably necessary to establish, exercise, or defend legal claims.
                    </Text>
                  </View>

                  {/* Section 10 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>10. Account Deletion</Text>
                    <Text style={styles.paragraph}>
                      At present, Task Pilot does not provide a self-service account deletion option directly within the application.
                    </Text>
                    <Text style={styles.paragraph}>
                      If you want to request deletion of your account or personal information, you may contact Task Pilot through the available support/contact channel.
                    </Text>
                    <Text style={styles.paragraph}>
                      After receiving a valid deletion request, we may verify the request and process the deletion in accordance with applicable law and our legitimate operational and legal requirements.
                    </Text>
                    <Text style={styles.paragraph}>
                      Some information may need to be retained for a limited period where required or permitted by law.
                    </Text>
                  </View>

                  {/* Section 11 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>11. Data Security</Text>
                    <Text style={styles.paragraph}>
                      We use reasonable technical and organizational measures designed to protect your information from unauthorized access, alteration, disclosure, or destruction.
                    </Text>
                    <Text style={styles.paragraph}>
                      These measures may include:
                    </Text>
                    <Text style={styles.bulletPoint}>• Secure communication using HTTPS/TLS</Text>
                    <Text style={styles.bulletPoint}>• Password hashing</Text>
                    <Text style={styles.bulletPoint}>• Access controls</Text>
                    <Text style={styles.bulletPoint}>• Server and database security measures</Text>
                    <Text style={styles.bulletPoint}>• Security monitoring and maintenance</Text>
                    <Text style={styles.bulletPoint}>• Backups and recovery measures</Text>
                    <Text style={styles.paragraph}>
                      However, no internet transmission or electronic storage system can be guaranteed to be completely secure.
                    </Text>
                  </View>

                  {/* Section 12 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>12. Children's Privacy</Text>
                    <Text style={styles.paragraph}>
                      Task Pilot is not intended to be used for purposes that require us to knowingly collect personal information from children in violation of applicable law.
                    </Text>
                    <Text style={styles.paragraph}>
                      If we become aware that we have collected personal information from a child in circumstances where such collection is not permitted, we may take appropriate steps to delete the information.
                    </Text>
                    <Text style={styles.paragraph}>
                      Parents or legal guardians who believe that a child has provided personal information to us may contact us through the available support channel.
                    </Text>
                  </View>

                  {/* Section 13 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>13. Cookies and Tracking</Text>
                    <Text style={styles.paragraph}>
                      Task Pilot's core task-management functionality does not require us to sell personal information or task content for advertising purposes.
                    </Text>
                    <Text style={styles.paragraph}>
                      If analytics, cookies, identifiers, or similar technologies are introduced in the future, this Privacy Policy may be updated to explain their use where required by applicable law.
                    </Text>
                  </View>

                  {/* Section 14 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>14. Your Rights</Text>
                    <Text style={styles.paragraph}>
                      Depending on your location and applicable law, you may have rights relating to your personal information, which may include the right to:
                    </Text>
                    <Text style={styles.bulletPoint}>• Request access to certain personal information.</Text>
                    <Text style={styles.bulletPoint}>• Request correction of inaccurate information.</Text>
                    <Text style={styles.bulletPoint}>• Request deletion of personal information where legally applicable.</Text>
                    <Text style={styles.bulletPoint}>• Ask questions about how your information is processed.</Text>
                    <Text style={styles.bulletPoint}>• Raise privacy-related concerns or complaints.</Text>
                    <Text style={styles.paragraph}>
                      To exercise applicable rights, contact us using the support/contact information provided by Task Pilot. We may need to verify your identity before processing certain requests.
                    </Text>
                  </View>

                  {/* Section 15 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>15. Changes to This Privacy Policy</Text>
                    <Text style={styles.paragraph}>
                      We may update this Privacy Policy from time to time to reflect changes to our Service, technology, legal requirements, or data practices.
                    </Text>
                    <Text style={styles.paragraph}>
                      When we make changes, we will update the "Last Updated" date and may provide additional notice where appropriate. We encourage you to review this Privacy Policy periodically.
                    </Text>
                  </View>

                  {/* Section 16 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>16. Contact Us</Text>
                    <Text style={styles.paragraph}>
                      If you have questions, concerns, complaints, or requests relating to this Privacy Policy or the handling of your information, please contact us through the support/contact options provided by Task Pilot or directly via <Text style={styles.linkText}>support@taskpilot.com</Text>.
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
                  {isHindi ? 'समझ गया (I Understand)' : 'I Understand'}
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
  shieldIcon: {
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
    fontWeight: '700',
    color: '#64748B',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 22,
    paddingVertical: 18,
    paddingBottom: 28,
  },
  highlightBox: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
  },
  highlightText: {
    fontSize: 13,
    color: '#9A3412',
    lineHeight: 19,
    fontWeight: '600',
  },
  section: {
    marginBottom: 22,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  subheading: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 6,
    marginBottom: 4,
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
    marginBottom: 5,
    paddingLeft: 6,
  },
  bold: {
    fontWeight: '700',
    color: '#1E293B',
  },
  linkText: {
    color: colors.primaryOrange,
    fontWeight: '700',
  },
  footer: {
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  doneBtn: {
    backgroundColor: colors.primaryOrange,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.card,
  },
  doneBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
});

export default PrivacyPolicyModal;
