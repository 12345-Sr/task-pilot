import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { colors, radius, spacing } from '../theme';
import { SupportedLanguage } from '../types';
import { useAppStore } from '../store';
import { userRepository } from '../api';

export interface LanguageOption {
  code: SupportedLanguage;
  label: string;
  native: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'hi', label: 'Hinglish', native: 'Hinglish', flag: '🇮🇳' },
  { code: 'en', label: 'English', native: 'English', flag: '🌐' },
  { code: 'mr', label: 'Marathi', native: 'मराठी', flag: '🚩' },
  { code: 'bn', label: 'Bengali', native: 'বাংলা', flag: '🌸' },
  { code: 'ta', label: 'Tamil', native: 'தமிழ்', flag: '🪔' },
  { code: 'te', label: 'Telugu', native: 'తెలుగు', flag: '🌿' },
  { code: 'gu', label: 'Gujarati', native: 'ગુજરાતી', flag: '🦚' },
  { code: 'pa', label: 'Punjabi', native: 'ਪੰਜਾਬੀ', flag: '🌾' },
];

interface LanguageModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect?: (code: SupportedLanguage) => void;
}

export const LanguageModal: React.FC<LanguageModalProps> = ({
  visible,
  onClose,
  onSelect,
}) => {
  const { language, setLanguage, isAuthenticated } = useAppStore();

  const handleSelect = (code: SupportedLanguage) => {
    setLanguage(code);
    if (isAuthenticated) {
      userRepository.updateLanguage(code).catch(() => {});
    }
    if (onSelect) {
      onSelect(code);
    }
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.headerIcon}>🌐</Text>
              <Text style={styles.title}>
                {language === 'hi' ? 'Bhasha Chunein' : 'Select Language'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>
            {language === 'hi'
              ? 'Apni pasandeeda bhasha select karein'
              : 'Choose your preferred language'}
          </Text>

          <ScrollView style={styles.langList} showsVerticalScrollIndicator={false}>
            {SUPPORTED_LANGUAGES.map((item) => {
              const isSelected = item.code === language;
              return (
                <TouchableOpacity
                  key={item.code}
                  style={[styles.langItem, isSelected && styles.langItemActive]}
                  onPress={() => handleSelect(item.code)}
                  activeOpacity={0.7}
                >
                  <View style={styles.langItemLeft}>
                    <Text style={styles.langFlag}>{item.flag}</Text>
                    <View>
                      <Text
                        style={[
                          styles.langNative,
                          isSelected && styles.langNativeActive,
                        ]}
                      >
                        {item.native}
                      </Text>
                      <Text style={styles.langLabel}>{item.label}</Text>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.radioCircle,
                      isSelected && styles.radioCircleActive,
                    ]}
                  >
                    {isSelected && <View style={styles.radioDot} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '100%',
    maxWidth: 380,
    maxHeight: '80%',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIcon: {
    fontSize: 22,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 16,
  },
  langList: {
    maxHeight: 340,
  },
  langItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  langItemActive: {
    backgroundColor: '#EBFBF3',
    borderColor: '#0D5C3A',
  },
  langItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  langFlag: {
    fontSize: 22,
  },
  langNative: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  langNativeActive: {
    color: '#0D5C3A',
  },
  langLabel: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleActive: {
    borderColor: '#0D5C3A',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#0D5C3A',
  },
});

export default LanguageModal;
