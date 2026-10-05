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
    source: require('../../../assets/sounds/classic_bell.m4a'),
  },
  {
    id: 'morning_alarm',
    name: 'Morning Alarm',
    nameHi: 'मॉर्निंग अलार्म',
    emoji: '⏰',
    description: 'Energetic morning wake-up chime',
    source: require('../../../assets/sounds/morning_alarm.m4a'),
  },
  {
    id: 'soft_chime',
    name: 'Soft Chime',
    nameHi: 'सॉफ्ट चाइम',
    emoji: '✨',
    description: 'Delicate metallic triangle chime',
    source: require('../../../assets/sounds/soft_chime.m4a'),
  },
  {
    id: 'gentle_tone',
    name: 'Gentle Tone',
    nameHi: 'जेंटल टोन',
    emoji: '🌊',
    description: 'Calm harmonic melodic chime',
    source: require('../../../assets/sounds/gentle_tone.m4a'),
  },
  {
    id: 'urgent_alert',
    name: 'Urgent Alert',
    nameHi: 'अर्जेंट अलर्ट',
    emoji: '🚨',
    description: 'High-priority pulsating emergency alert',
    source: require('../../../assets/sounds/urgent_alert.m4a'),
  },
  {
    id: 'digital_bell',
    name: 'Digital Bell',
    nameHi: 'डिजिटल बेल',
    emoji: '🎵',
    description: 'Modern electronic digital beeps',
    source: require('../../../assets/sounds/digital_bell.m4a'),
  },
];

// Lazy safely loaded expo-audio module
let createAudioPlayerFn: any = null;
let setAudioModeAsyncFn: any = null;

function getAudioFunctions() {
  if (createAudioPlayerFn) return { createAudioPlayer: createAudioPlayerFn, setAudioModeAsync: setAudioModeAsyncFn };
  try {
    const expoAudio = require('expo-audio');
    createAudioPlayerFn = expoAudio.createAudioPlayer;
    setAudioModeAsyncFn = expoAudio.setAudioModeAsync;
  } catch (err) {
    console.warn('[SoundService] expo-audio not available on this platform:', err);
  }
  return { createAudioPlayer: createAudioPlayerFn, setAudioModeAsync: setAudioModeAsyncFn };
}

class SoundServiceClass {
  private previewPlayer: any = null;
  private alarmPlayer: any = null;
  private currentPlayingId: AlarmSoundId | null = null;
  private previewListeners: Set<(id: AlarmSoundId | null) => void> = new Set();
  private hasConfiguredAudioMode = false;

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

  private async ensureAudioMode() {
    if (this.hasConfiguredAudioMode) return;
    try {
      const { setAudioModeAsync } = getAudioFunctions();
      if (typeof setAudioModeAsync === 'function') {
        await setAudioModeAsync({
          playsInSilentMode: true,
          staysActiveInBackground: true,
          shouldDuckAndroid: false,
        });
      }
      this.hasConfiguredAudioMode = true;
    } catch (e) {
      console.warn('[SoundService] setAudioModeAsync notice:', e);
    }
  }

  /**
   * Toggles playback preview of a sound.
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
      await this.ensureAudioMode();

      const { createAudioPlayer } = getAudioFunctions();
      if (!createAudioPlayer) {
        console.warn('[SoundService] Cannot play preview: createAudioPlayer not available');
        return;
      }

      const meta = this.getSoundMeta(id);
      const player = createAudioPlayer(meta.source);
      if (!player) return;

      player.loop = false;
      player.volume = 1.0;

      // Listen for playback completion
      if (typeof player.addListener === 'function') {
        const sub = player.addListener('playbackStatusUpdate', (status: any) => {
          if (status?.didJustFinish) {
            this.stopPreview().catch(() => {});
            try { sub?.remove?.(); } catch {}
          }
        });
      }

      this.previewPlayer = player;
      this.notifyPreviewChange(id);

      if (typeof player.play === 'function') {
        player.play();
      }
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
      if (this.previewPlayer) {
        const player = this.previewPlayer;
        this.previewPlayer = null;
        if (typeof player.pause === 'function') {
          player.pause();
        }
        if (typeof player.release === 'function') {
          player.release();
        } else if (typeof player.remove === 'function') {
          player.remove();
        }
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
      await this.ensureAudioMode();

      const { createAudioPlayer } = getAudioFunctions();
      if (!createAudioPlayer) {
        console.warn('[SoundService] Cannot start alarm loop: createAudioPlayer not available');
        return;
      }

      const meta = this.getSoundMeta(id);
      const player = createAudioPlayer(meta.source);
      if (!player) return;

      player.loop = true;
      player.volume = 1.0;

      this.alarmPlayer = player;

      if (typeof player.play === 'function') {
        player.play();
      }
    } catch (err) {
      console.warn('[SoundService] Failed to start alarm loop for', id, err);
    }
  }

  /**
   * Stops the looping alarm sound.
   */
  public async stopAlarmLoop(): Promise<void> {
    try {
      if (this.alarmPlayer) {
        const player = this.alarmPlayer;
        this.alarmPlayer = null;
        if (typeof player.pause === 'function') {
          player.pause();
        }
        if (typeof player.release === 'function') {
          player.release();
        } else if (typeof player.remove === 'function') {
          player.remove();
        }
      }
    } catch (err) {
      console.warn('[SoundService] Error stopping alarm loop:', err);
    }
  }
}

export const SoundService = new SoundServiceClass();
export default SoundService;
