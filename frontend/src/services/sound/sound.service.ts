import { Audio } from 'expo-av';

export type AlarmSoundId =
  | 'classic_bell'
  | 'morning_alarm'
  | 'soft_chime'
  | 'gentle_tone'
  | 'urgent_alert'
  | 'digital_bell';

export interface AlarmSoundMeta {
  id: AlarmSoundId;
  name: string;
  nameHi: string;
  emoji: string;
  description: string;
  source: any;
}

export const ALARM_SOUNDS: AlarmSoundMeta[] = [
  {
    id: 'classic_bell',
    name: 'Classic Bell',
    nameHi: 'क्लासिक घंटी',
    emoji: '🔔',
    description: 'Loud traditional twin-bell alarm clock',
    source: require('../../../assets/sounds/classic_bell.wav'),
  },
  {
    id: 'morning_alarm',
    name: 'Morning Alarm',
    nameHi: 'मॉर्निंग अलार्म',
    emoji: '⏰',
    description: 'Energetic morning wake-up chime',
    source: require('../../../assets/sounds/morning_alarm.wav'),
  },
  {
    id: 'soft_chime',
    name: 'Soft Chime',
    nameHi: 'सॉफ्ट चाइम',
    emoji: '✨',
    description: 'Delicate metallic triangle chime',
    source: require('../../../assets/sounds/soft_chime.wav'),
  },
  {
    id: 'gentle_tone',
    name: 'Gentle Tone',
    nameHi: 'जेंटल टोन',
    emoji: '🌊',
    description: 'Calm harmonic melodic chime',
    source: require('../../../assets/sounds/gentle_tone.wav'),
  },
  {
    id: 'urgent_alert',
    name: 'Urgent Alert',
    nameHi: 'अर्जेंट अलर्ट',
    emoji: '🚨',
    description: 'High-priority pulsating emergency alert',
    source: require('../../../assets/sounds/urgent_alert.wav'),
  },
  {
    id: 'digital_bell',
    name: 'Digital Bell',
    nameHi: 'डिजिटल बेल',
    emoji: '🎵',
    description: 'Modern electronic digital beeps',
    source: require('../../../assets/sounds/digital_bell.wav'),
  },
];

class SoundServiceClass {
  private previewSound: Audio.Sound | null = null;
  private currentPlayingId: AlarmSoundId | null = null;
  private alarmLoopSound: Audio.Sound | null = null;
  private previewListeners: Set<(id: AlarmSoundId | null) => void> = new Set();

  constructor() {
    this.configureAudioMode();
  }

  private async configureAudioMode() {
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: false,
      });
    } catch (e) {
      console.warn('[SoundService] Audio mode configure notice:', e);
    }
  }

  public subscribePreviewChange(listener: (id: AlarmSoundId | null) => void): () => void {
    this.previewListeners.add(listener);
    return () => {
      this.previewListeners.delete(listener);
    };
  }

  private notifyPreviewChange(id: AlarmSoundId | null) {
    this.currentPlayingId = id;
    this.previewListeners.forEach((l) => {
      try {
        l(id);
      } catch (err) {
        console.warn('[SoundService] listener error:', err);
      }
    });
  }

  public getCurrentPlayingId(): AlarmSoundId | null {
    return this.currentPlayingId;
  }

  public getSoundMeta(id: AlarmSoundId): AlarmSoundMeta {
    return ALARM_SOUNDS.find((s) => s.id === id) || ALARM_SOUNDS[0];
  }

  /**
   * Toggles playback preview of a sound.
   * If already playing this sound, stops it.
   * If playing another, stops it and plays the new one.
   */
  public async togglePreview(id: AlarmSoundId): Promise<boolean> {
    if (this.currentPlayingId === id) {
      await this.stopPreview();
      return false;
    }
    await this.playPreview(id);
    return true;
  }

  /**
   * Plays a preview of the specified sound once.
   */
  public async playPreview(id: AlarmSoundId): Promise<void> {
    try {
      await this.stopPreview();

      const meta = this.getSoundMeta(id);
      await this.configureAudioMode();

      const { sound } = await Audio.Sound.createAsync(
        meta.source,
        { shouldPlay: true, volume: 1.0, isLooping: false },
        (status) => {
          if (status.isLoaded && status.didJustFinish) {
            this.stopPreview().catch(() => {});
          }
        }
      );

      this.previewSound = sound;
      this.notifyPreviewChange(id);
    } catch (err) {
      console.warn('[SoundService] Failed to play preview for', id, err);
      this.notifyPreviewChange(null);
    }
  }

  /**
   * Stops any currently playing preview sound.
   */
  public async stopPreview(): Promise<void> {
    try {
      if (this.previewSound) {
        const sound = this.previewSound;
        this.previewSound = null;
        await sound.stopAsync().catch(() => {});
        await sound.unloadAsync().catch(() => {});
      }
    } catch (err) {
      console.warn('[SoundService] Error stopping preview:', err);
    } finally {
      this.notifyPreviewChange(null);
    }
  }

  /**
   * Plays the alarm sound in a continuous loop (used during FullScreenAlarm ringing).
   */
  public async startAlarmLoop(id: AlarmSoundId): Promise<void> {
    try {
      await this.stopAlarmLoop();
      await this.stopPreview();

      const meta = this.getSoundMeta(id);
      await this.configureAudioMode();

      const { sound } = await Audio.Sound.createAsync(meta.source, {
        shouldPlay: true,
        volume: 1.0,
        isLooping: true,
      });

      this.alarmLoopSound = sound;
    } catch (err) {
      console.warn('[SoundService] Failed to start alarm loop for', id, err);
    }
  }

  /**
   * Stops the looping alarm sound.
   */
  public async stopAlarmLoop(): Promise<void> {
    try {
      if (this.alarmLoopSound) {
        const sound = this.alarmLoopSound;
        this.alarmLoopSound = null;
        await sound.stopAsync().catch(() => {});
        await sound.unloadAsync().catch(() => {});
      }
    } catch (err) {
      console.warn('[SoundService] Error stopping alarm loop:', err);
    }
  }
}

export const SoundService = new SoundServiceClass();
export default SoundService;
