import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  PanResponder,
  GestureResponderEvent,
} from 'react-native';
import { colors } from '../theme/colors';

interface ClockDialerProps {
  value: string; // e.g. "09:30 AM"
  onChange: (time: string) => void;
  language?: string;
}

const DIAL_SIZE = 240;
const RADIUS = 90;
const CENTER = DIAL_SIZE / 2;

export const ClockDialer: React.FC<ClockDialerProps> = ({ value, onChange }) => {
  // Parse initial value
  const parseTime = (str: string) => {
    try {
      const isPM = /pm/i.test(str);
      const clean = str.replace(/am|pm/gi, '').trim();
      const parts = clean.split(':');
      let h = parseInt(parts[0], 10) || 9;
      let m = parseInt(parts[1], 10) || 0;
      if (h > 12) h = h % 12 || 12;
      if (h === 0) h = 12;
      return {
        hours: h,
        minutes: m,
        period: (isPM ? 'PM' : 'AM') as 'AM' | 'PM',
      };
    } catch {
      return { hours: 9, minutes: 0, period: 'AM' as 'AM' | 'PM' };
    }
  };

  const parsed = parseTime(value);
  const [hours, setHours] = useState(parsed.hours);
  const [minutes, setMinutes] = useState(parsed.minutes);
  const [period, setPeriod] = useState<'AM' | 'PM'>(parsed.period);
  const [mode, setMode] = useState<'hours' | 'minutes'>('hours');

  // Notify parent on update
  const emitChange = (h: number, m: number, p: 'AM' | 'PM') => {
    const hh = String(h).padStart(2, '0');
    const mm = String(m).padStart(2, '0');
    onChange(`${hh}:${mm} ${p}`);
  };

  useEffect(() => {
    const p = parseTime(value);
    setHours(p.hours);
    setMinutes(p.minutes);
    setPeriod(p.period);
  }, [value]);

  const selectHour = (h: number, autoSwitch = true) => {
    setHours(h);
    emitChange(h, minutes, period);
    if (autoSwitch) {
      setMode('minutes');
    }
  };

  const selectMinute = (m: number) => {
    setMinutes(m);
    emitChange(hours, m, period);
  };

  const togglePeriod = (p: 'AM' | 'PM') => {
    setPeriod(p);
    emitChange(hours, minutes, p);
  };

  // Calculate angle from center of dial given touch coordinates
  const dialLayout = useRef({ x: 0, y: 0, width: DIAL_SIZE, height: DIAL_SIZE });

  const handleTouch = (evt: GestureResponderEvent) => {
    const { locationX, locationY } = evt.nativeEvent;
    const dx = locationX - CENTER;
    const dy = locationY - CENTER;

    // Angle in degrees from top (12 o'clock = 0 deg)
    let angleRad = Math.atan2(dy, dx) + Math.PI / 2;
    if (angleRad < 0) angleRad += 2 * Math.PI;
    const angleDeg = (angleRad * 180) / Math.PI;

    if (mode === 'hours') {
      // 360 deg / 12 = 30 deg per hour
      let h = Math.round(angleDeg / 30);
      if (h === 0) h = 12;
      selectHour(h, false);
    } else {
      // 360 deg / 60 = 6 deg per minute; round to nearest 5 min
      let m = Math.round(angleDeg / 30) * 5;
      if (m === 60) m = 0;
      selectMinute(m);
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => handleTouch(evt),
      onPanResponderMove: (evt) => handleTouch(evt),
    })
  ).current;

  // Hand pointer angle
  const currentAngle =
    mode === 'hours' ? (hours % 12) * 30 : (minutes / 60) * 360;

  // Hour numbers [12, 1, 2, ... 11]
  const hourNumbers = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  // Minute numbers ['00', '05', '10', ... '55']
  const minuteNumbers = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  return (
    <View style={styles.container}>
      {/* Digital Readout & Mode Switcher */}
      <View style={styles.displayRow}>
        <View style={styles.timeBoxContainer}>
          <TouchableOpacity
            style={[styles.timeBox, mode === 'hours' && styles.timeBoxActive]}
            onPress={() => setMode('hours')}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.timeBoxText,
                mode === 'hours' && styles.timeBoxTextActive,
              ]}
            >
              {String(hours).padStart(2, '0')}
            </Text>
            <Text style={styles.timeBoxSub}>Ghante</Text>
          </TouchableOpacity>

          <Text style={styles.colon}>:</Text>

          <TouchableOpacity
            style={[styles.timeBox, mode === 'minutes' && styles.timeBoxActive]}
            onPress={() => setMode('minutes')}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.timeBoxText,
                mode === 'minutes' && styles.timeBoxTextActive,
              ]}
            >
              {String(minutes).padStart(2, '0')}
            </Text>
            <Text style={styles.timeBoxSub}>Minute</Text>
          </TouchableOpacity>
        </View>

        {/* AM/PM Switch */}
        <View style={styles.periodContainer}>
          <TouchableOpacity
            style={[
              styles.periodBtn,
              period === 'AM' && styles.periodBtnActive,
            ]}
            onPress={() => togglePeriod('AM')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.periodBtnText,
                period === 'AM' && styles.periodBtnTextActive,
              ]}
            >
              AM
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.periodBtn,
              period === 'PM' && styles.periodBtnActive,
            ]}
            onPress={() => togglePeriod('PM')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.periodBtnText,
                period === 'PM' && styles.periodBtnTextActive,
              ]}
            >
              PM
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Mode hint text */}
      <Text style={styles.dialHint}>
        {mode === 'hours'
          ? '👉 Dial ghumakar ya number tap karke Ghanta chunein'
          : '👉 Dial ghumakar Minute chunein (00 - 55)'}
      </Text>

      {/* Circular Clock Dial */}
      <View style={styles.dialWrapper}>
        <View
          style={styles.dialFace}
          {...panResponder.panHandlers}
        >
          {/* Inner decorative circle */}
          <View style={styles.innerDottedRing} pointerEvents="none" />

          {/* Center Hub */}
          <View style={styles.centerDot} pointerEvents="none" />

          {/* Rotating Hand Pointer */}
          <View
            style={[
              styles.handWrapper,
              {
                transform: [{ rotate: `${currentAngle}deg` }],
              },
            ]}
            pointerEvents="none"
          >
            <View style={styles.handLine} />
            <View style={styles.handBubble} />
          </View>

          {/* Dial Numbers */}
          {mode === 'hours'
            ? hourNumbers.map((num, idx) => {
                const angleRad = (idx * 30 - 90) * (Math.PI / 180);
                const x = CENTER + RADIUS * Math.cos(angleRad) - 16;
                const y = CENTER + RADIUS * Math.sin(angleRad) - 16;
                const isSelected = hours === num;

                return (
                  <View
                    key={`h-${num}`}
                    style={[
                      styles.numberContainer,
                      { left: x, top: y },
                      isSelected && styles.numberContainerSelected,
                    ]}
                    pointerEvents="none"
                  >
                    <Text
                      style={[
                        styles.numberText,
                        isSelected && styles.numberTextSelected,
                      ]}
                    >
                      {num}
                    </Text>
                  </View>
                );
              })
            : minuteNumbers.map((num, idx) => {
                const angleRad = (idx * 30 - 90) * (Math.PI / 180);
                const x = CENTER + RADIUS * Math.cos(angleRad) - 16;
                const y = CENTER + RADIUS * Math.sin(angleRad) - 16;
                const isSelected = minutes === num;

                return (
                  <View
                    key={`m-${num}`}
                    style={[
                      styles.numberContainer,
                      { left: x, top: y },
                      isSelected && styles.numberContainerSelected,
                    ]}
                    pointerEvents="none"
                  >
                    <Text
                      style={[
                        styles.numberText,
                        isSelected && styles.numberTextSelected,
                      ]}
                    >
                      {String(num).padStart(2, '0')}
                    </Text>
                  </View>
                );
              })}
        </View>
      </View>

      {/* Fine-tuning +/- 1 min Stepper */}
      <View style={styles.fineTuneRow}>
        <TouchableOpacity
          style={styles.stepperBtn}
          onPress={() => {
            const nextM = (minutes - 1 + 60) % 60;
            selectMinute(nextM);
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.stepperBtnText}>- 1m</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.stepperBtn}
          onPress={() => {
            const nextM = (minutes - 5 + 60) % 60;
            selectMinute(nextM);
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.stepperBtnText}>- 5m</Text>
        </TouchableOpacity>

        <Text style={styles.fineTuneLabel}>Bariki Se Set Karein</Text>

        <TouchableOpacity
          style={styles.stepperBtn}
          onPress={() => {
            const nextM = (minutes + 5) % 60;
            selectMinute(nextM);
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.stepperBtnText}>+ 5m</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.stepperBtn}
          onPress={() => {
            const nextM = (minutes + 1) % 60;
            selectMinute(nextM);
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.stepperBtnText}>+ 1m</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 6,
  },
  displayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  timeBoxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 6,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  timeBox: {
    backgroundColor: '#F5F5F0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 64,
  },
  timeBoxActive: {
    backgroundColor: '#FFF2E0',
    borderWidth: 1.5,
    borderColor: colors.primaryOrange,
  },
  timeBoxText: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  timeBoxTextActive: {
    color: colors.primaryOrange,
  },
  timeBoxSub: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 2,
  },
  colon: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.primaryOrange,
    marginHorizontal: 6,
  },
  periodContainer: {
    backgroundColor: '#F5F5F0',
    borderRadius: 14,
    padding: 4,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  periodBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  periodBtnActive: {
    backgroundColor: colors.primaryOrange,
    shadowColor: colors.primaryOrange,
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  periodBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textSecondary,
  },
  periodBtnTextActive: {
    color: '#FFF',
  },
  dialHint: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 10,
  },
  dialWrapper: {
    width: DIAL_SIZE,
    height: DIAL_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialFace: {
    width: DIAL_SIZE,
    height: DIAL_SIZE,
    borderRadius: DIAL_SIZE / 2,
    backgroundColor: '#F8F9FA',
    borderWidth: 3,
    borderColor: '#E8ECF2',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  innerDottedRing: {
    position: 'absolute',
    top: 30,
    left: 30,
    width: DIAL_SIZE - 60,
    height: DIAL_SIZE - 60,
    borderRadius: (DIAL_SIZE - 60) / 2,
    borderWidth: 1,
    borderColor: '#E2E6ED',
    borderStyle: 'dashed',
  },
  centerDot: {
    position: 'absolute',
    top: CENTER - 6,
    left: CENTER - 6,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primaryOrange,
    zIndex: 10,
  },
  handWrapper: {
    position: 'absolute',
    top: 0,
    left: CENTER - 1.5,
    width: 3,
    height: CENTER,
    transformOrigin: 'bottom center',
    zIndex: 5,
  },
  handLine: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 3,
    height: RADIUS,
    backgroundColor: colors.primaryOrange,
    borderRadius: 2,
  },
  handBubble: {
    position: 'absolute',
    top: CENTER - RADIUS - 16,
    left: -14.5,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primaryOrange,
    opacity: 0.25,
  },
  numberContainer: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 8,
  },
  numberContainerSelected: {
    backgroundColor: colors.primaryOrange,
    shadowColor: colors.primaryOrange,
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  numberText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#343A40',
  },
  numberTextSelected: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  fineTuneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  stepperBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#F0EFEA',
  },
  stepperBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  fineTuneLabel: {
    fontSize: 11,
    color: colors.textSecondary,
  },
});

export default ClockDialer;
