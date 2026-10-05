import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import {
  SoundService,
  ALARM_SOUNDS,
  AlarmSoundId,
  AlarmSoundMeta,
} from '../services/sound/sound.service';
import { SupportedLanguage } from '../types';

interface AlarmSoundPickerProps {
  selectedSound: AlarmSoundId;
  onSelectSound: (sound: AlarmSoundId) => void;
  language?: SupportedLanguage;
}

export const AlarmSoundPicker: React.FC<AlarmSoundPickerProps> = ({
  selectedSound,
  onSelectSound,
  language = 'hi',
}) => {
  const [playingId, setPlayingId] = useState<AlarmSoundId | null>(null);
  const [loadingId, setLoadingId] = useState<AlarmSoundId | null>(null);

  useEffect(() => {
    // Subscribe to sound playback events from SoundService
    const unsubscribe = SoundService.subscribePreviewChange((currentId) => {
      setPlayingId(currentId);
      setLoadingId(null);
    });

    return () => {
      unsubscribe();
      // Stop preview when unmounting component
      SoundService.stopPreview().catch(() => {});
    };
  }, []);

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

  const handleSelect = (soundId: AlarmSoundId) => {
    onSelectSound(soundId);
  };

  const selectedMeta = SoundService.getSoundMeta(selectedSound);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.sectionTitle}>
            {language === 'hi' ? 'अलार्म की आवाज़ चुनें' : 'Choose Alarm Sound'}
          </Text>
          <Text style={styles.sectionSubtitle}>
            {language === 'hi'
              ? 'आवाज़ सुनने के लिए ▶ दबाएं • चुनने के लिए कार्ड छुएं'
              : 'Tap to select • Press ▶ to preview sound'}
          </Text>
        </View>
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>
            {selectedMeta.emoji} {selectedMeta.name}
          </Text>
        </View>
      </View>

      {/* Sounds List */}
      <View style={styles.listCard}>
        {ALARM_SOUNDS.map((sound: AlarmSoundMeta, index: number) => {
          const isSelected = selectedSound === sound.id;
          const isPlaying = playingId === sound.id;
          const isLoading = loadingId === sound.id;
          const isLast = index === ALARM_SOUNDS.length - 1;

          return (
            <TouchableOpacity
              key={sound.id}
              activeOpacity={0.75}
              onPress={() => handleSelect(sound.id)}
              style={[
                styles.soundRow,
                isSelected && styles.soundRowSelected,
                !isLast && styles.soundRowBorder,
              ]}
            >
              {/* Left: Emoji & Names */}
              <View style={styles.soundLeft}>
                <View
                  style={[
                    styles.emojiContainer,
                    isSelected && styles.emojiContainerSelected,
                  ]}
                >
                  <Text style={styles.soundEmoji}>{sound.emoji}</Text>
                </View>

                <View style={styles.soundInfo}>
                  <View style={styles.nameRow}>
                    <Text
                      style={[
                        styles.soundName,
                        isSelected && styles.soundNameSelected,
                      ]}
                    >
                      {sound.name}
                    </Text>
                    {language === 'hi' && (
                      <Text style={styles.soundNameHi}>({sound.nameHi})</Text>
                    )}
                  </View>
                  <Text style={styles.soundDesc}>{sound.description}</Text>
                </View>
              </View>

              {/* Right: Play/Preview Button + Checkmark */}
              <View style={styles.soundRight}>
                {/* Preview Play/Stop Button */}
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
                    <Text style={styles.previewBtnIconPlaying}>⏸</Text>
                  ) : (
                    <Text style={styles.previewBtnIcon}>▶</Text>
                  )}
                </TouchableOpacity>

                {/* Selection Checkmark */}
                <View
                  style={[
                    styles.selectRadio,
                    isSelected && styles.selectRadioActive,
                  ]}
                >
                  {isSelected && <Text style={styles.checkmarkIcon}>✓</Text>}
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Selected Summary Badge Banner matching the diagram */}
      <View style={styles.selectedBanner}>
        <View style={styles.selectedBannerLeft}>
          <Text style={styles.selectedBannerEmoji}>{selectedMeta.emoji}</Text>
          <Text style={styles.selectedBannerText}>
            {language === 'hi' ? 'चुना गया:' : 'Selected:'}{' '}
            <Text style={styles.selectedBannerHighlight}>
              {selectedMeta.name}
            </Text>
          </Text>
        </View>
        <View style={styles.selectedCheckBadge}>
          <Text style={styles.selectedCheckBadgeText}>✓</Text>
        </View>
      </View>
    </View>
  );
};

export default AlarmSoundPicker;

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    gap: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  headerTitleWrap: {
    flex: 1,
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  sectionSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  headerBadge: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  headerBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
  listCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  soundRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
    paddingHorizontal: 14,
    backgroundColor: '#FFFFFF',
  },
  soundRowSelected: {
    backgroundColor: '#F0FDF4',
  },
  soundRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  soundLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  emojiContainer: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emojiContainerSelected: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
  },
  soundEmoji: {
    fontSize: 19,
  },
  soundInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  soundName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  soundNameSelected: {
    color: '#15803D',
    fontWeight: '800',
  },
  soundNameHi: {
    fontSize: 11.5,
    color: '#64748B',
    fontWeight: '500',
  },
  soundDesc: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  soundRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  previewBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  previewBtnPlaying: {
    backgroundColor: '#16A34A',
    borderColor: '#15803D',
  },
  previewBtnIcon: {
    fontSize: 12,
    color: '#334155',
    marginLeft: 2,
    fontWeight: '800',
  },
  previewBtnIconPlaying: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '900',
  },
  selectRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  selectRadioActive: {
    borderColor: '#16A34A',
    backgroundColor: '#16A34A',
  },
  checkmarkIcon: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
    marginTop: -1,
  },
  selectedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#DCFCE7',
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#86EFAC',
    marginTop: 2,
  },
  selectedBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectedBannerEmoji: {
    fontSize: 18,
  },
  selectedBannerText: {
    fontSize: 13,
    color: '#166534',
    fontWeight: '600',
  },
  selectedBannerHighlight: {
    fontWeight: '800',
    color: '#14532D',
  },
  selectedCheckBadge: {
    backgroundColor: '#16A34A',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedCheckBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
});
