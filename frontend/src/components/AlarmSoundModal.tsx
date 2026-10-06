import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radius, spacing, shadows } from '../theme';
import { useAppStore } from '../store';
import {
  SoundService,
  ALARM_SOUNDS,
  AlarmSoundId,
  AlarmSoundMeta,
} from '../services/sound/sound.service';

interface AlarmSoundModalProps {
  visible: boolean;
  onClose: () => void;
}

export const AlarmSoundModal: React.FC<AlarmSoundModalProps> = ({
  visible,
  onClose,
}) => {
  const { language, selectedAlarmSound, setSelectedAlarmSound } = useAppStore();
  const isHindi = language === 'hi';

  const [playingId, setPlayingId] = useState<AlarmSoundId | null>(null);
  const [loadingId, setLoadingId] = useState<AlarmSoundId | null>(null);

  useEffect(() => {
    const unsubscribe = SoundService.subscribePreviewChange((currentId) => {
      setPlayingId(currentId);
      setLoadingId(null);
    });

    return () => {
      unsubscribe();
      SoundService.stopPreview().catch(() => {});
    };
  }, []);

  const handleClose = () => {
    SoundService.stopPreview().catch(() => {});
    onClose();
  };

  const handleSelectSound = async (soundId: AlarmSoundId) => {
    setSelectedAlarmSound(soundId);
    // Play sound sample so user hears what they selected
    try {
      setLoadingId(soundId);
      await SoundService.playPreview(soundId);
    } catch {
      setLoadingId(null);
    }
  };

  const handleTogglePreview = async (soundId: AlarmSoundId) => {
    try {
      if (playingId === soundId) {
        await SoundService.stopPreview();
      } else {
        setLoadingId(soundId);
        await SoundService.playPreview(soundId);
      }
    } catch {
      setLoadingId(null);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <Pressable style={styles.overlay} onPress={handleClose}>
        <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIconCircle}>
                <Text style={styles.headerIcon}>⏰</Text>
              </View>
              <View>
                <Text style={styles.title}>
                  {isHindi ? 'अलार्म टोन / साउंड' : 'Alarm Ringtone'}
                </Text>
                <Text style={styles.subtitle}>
                  {isHindi
                    ? 'टास्क और रिमाइंडर्स के लिए आवाज़ चुनें'
                    : 'Choose sound for reminder alarms'}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Alarm Sounds List */}
          <ScrollView
            style={styles.soundsList}
            contentContainerStyle={styles.soundsListContent}
            showsVerticalScrollIndicator={false}
          >
            {ALARM_SOUNDS.map((sound: AlarmSoundMeta) => {
              const isSelected = selectedAlarmSound === sound.id;
              const isPlaying = playingId === sound.id;
              const isLoading = loadingId === sound.id;

              return (
                <TouchableOpacity
                  key={sound.id}
                  style={[
                    styles.soundItem,
                    isSelected && styles.soundItemActive,
                  ]}
                  onPress={() => handleSelectSound(sound.id)}
                  activeOpacity={0.72}
                >
                  {/* Left: Emoji Badge */}
                  <View
                    style={[
                      styles.soundEmojiCircle,
                      isSelected && styles.soundEmojiCircleActive,
                    ]}
                  >
                    <Text style={styles.soundEmoji}>{sound.emoji}</Text>
                  </View>

                  {/* Middle: Sound Title & Subtitle */}
                  <View style={styles.soundInfo}>
                    <View style={styles.soundTitleRow}>
                      <Text
                        style={[
                          styles.soundName,
                          isSelected && styles.soundNameActive,
                        ]}
                      >
                        {sound.name}
                      </Text>
                      {isHindi && (
                        <Text style={styles.soundNameHi}>({sound.nameHi})</Text>
                      )}
                    </View>
                    <Text style={styles.soundDesc}>{sound.description}</Text>
                  </View>

                  {/* Right: Play/Preview Button + Checkmark */}
                  <View style={styles.soundActions}>
                    {/* Preview Button */}
                    <TouchableOpacity
                      style={[
                        styles.previewBtn,
                        isPlaying && styles.previewBtnPlaying,
                      ]}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleTogglePreview(sound.id);
                      }}
                      activeOpacity={0.7}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      {isLoading ? (
                        <ActivityIndicator size="small" color="#16A34A" />
                      ) : isPlaying ? (
                        <Text style={styles.previewBtnTextPlaying}>⏸</Text>
                      ) : (
                        <Text style={styles.previewBtnText}>▶</Text>
                      )}
                    </TouchableOpacity>

                    {/* Radio Checkmark */}
                    <View
                      style={[
                        styles.radioCircle,
                        isSelected && styles.radioCircleActive,
                      ]}
                    >
                      {isSelected && <Text style={styles.radioCheck}>✓</Text>}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Bottom Actions */}
          <View style={styles.footer}>
            {/* Done Button */}
            <TouchableOpacity
              style={styles.doneBtn}
              onPress={handleClose}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#0D5C3A', '#15803D']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.doneBtnGradient}
              >
                <Text style={styles.doneBtnText}>
                  {isHindi ? 'हो गया' : 'Done'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    width: '100%',
    maxHeight: '85%',
    padding: spacing.lg,
    ...shadows.floating,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  headerIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIcon: {
    fontSize: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    padding: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: colors.background,
  },
  closeBtnText: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: 'bold',
  },
  soundsList: {
    marginTop: spacing.md,
    maxHeight: 380,
  },
  soundsListContent: {
    gap: 8,
    paddingBottom: 4,
  },
  soundItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    gap: 12,
  },
  soundItemActive: {
    borderColor: '#16A34A',
    backgroundColor: '#F0FDF4',
  },
  soundEmojiCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  soundEmojiCircleActive: {
    backgroundColor: '#DCFCE7',
  },
  soundEmoji: {
    fontSize: 20,
  },
  soundInfo: {
    flex: 1,
  },
  soundTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  soundName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  soundNameActive: {
    color: '#15803D',
  },
  soundNameHi: {
    fontSize: 12.5,
    color: '#64748B',
    fontWeight: '500',
  },
  soundDesc: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
  },
  soundActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  previewBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  previewBtnPlaying: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
  },
  previewBtnText: {
    fontSize: 13,
    color: '#15803D',
    fontWeight: '800',
    marginLeft: 2,
  },
  previewBtnTextPlaying: {
    fontSize: 12,
    color: '#16A34A',
    fontWeight: '800',
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleActive: {
    borderColor: '#16A34A',
    backgroundColor: '#16A34A',
  },
  radioCheck: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  footer: {
    marginTop: spacing.md,
  },
  doneBtn: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  doneBtnGradient: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
});

export default AlarmSoundModal;
