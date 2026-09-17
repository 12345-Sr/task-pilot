import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';

export interface TimeSliderPickerProps {
  value: string; // e.g. "09:30 AM"
  onChange: (time: string) => void;
  language?: string;
  selectedDate?: string; // e.g. "2026-09-17"
  onValidationChange?: (isValid: boolean, errorMsg?: string) => void;
}

const ITEM_HEIGHT = 44;
const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')); // "01" .. "12"
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0')); // "00" .. "59" (full 60-min precision)
const PERIODS = ['AM', 'PM'] as const;

const HOUR_OFFSETS = HOURS.map((_, i) => i * ITEM_HEIGHT);
const MINUTE_OFFSETS = MINUTES.map((_, i) => i * ITEM_HEIGHT);

/**
 * Calculates the next valid future time (now + 30 mins rounded to nearest minute)
 */
export const getNextValidFutureTime = (): { hourStr: string; minuteStr: string; period: string } => {
  const now = new Date();
  now.setMinutes(now.getMinutes() + 30);
  let h = now.getHours();
  const isPM = h >= 12;
  if (h > 12) h -= 12;
  if (h === 0) h = 12;
  const m = now.getMinutes();
  return {
    hourStr: String(h).padStart(2, '0'),
    minuteStr: String(m).padStart(2, '0'),
    period: isPM ? 'PM' : 'AM',
  };
};

/**
 * Checks if a given time is in the past for a specific date
 */
export const isTimeInPast = (
  hourStr: string,
  minuteStr: string,
  period: string,
  dateStr?: string
): boolean => {
  if (!dateStr) return false;
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const todayStr = `${y}-${m}-${d}`;

  // If selected date is strictly before today
  if (dateStr < todayStr) return true;
  // If selected date is strictly after today, any time is allowed
  if (dateStr > todayStr) return false;

  // Selected date is TODAY — evaluate 24h hours and minutes against current moment
  let h = parseInt(hourStr, 10);
  if (period === 'PM' && h < 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  const min = parseInt(minuteStr, 10);

  const nowH = now.getHours();
  const nowM = now.getMinutes();

  if (h < nowH) return true;
  if (h === nowH && min <= nowM) return true;
  return false;
};

export const TimeSliderPicker: React.FC<TimeSliderPickerProps> = ({
  value,
  onChange,
  language = 'hi',
  selectedDate,
  onValidationChange,
}) => {
  const parseTime = (str: string) => {
    try {
      const isPM = /pm/i.test(str);
      const clean = str.replace(/am|pm/gi, '').trim();
      const parts = clean.split(':');
      let h = parseInt(parts[0], 10) || 9;
      let m = parseInt(parts[1], 10) || 0;
      if (h > 12) h = h % 12 || 12;
      if (h === 0) h = 12;
      if (m < 0) m = 0;
      if (m > 59) m = 59;
      return {
        hourStr: String(h).padStart(2, '0'),
        minuteStr: String(m).padStart(2, '0'),
        period: isPM ? 'PM' : 'AM',
      };
    } catch {
      return { hourStr: '09', minuteStr: '00', period: 'AM' };
    }
  };

  const initial = parseTime(value);
  const [selectedHour, setSelectedHour] = useState(initial.hourStr);
  const [selectedMinute, setSelectedMinute] = useState(initial.minuteStr);
  const [selectedPeriod, setSelectedPeriod] = useState(initial.period);

  // Visual tracking state during scroll drag for instant 60fps highlighting
  const [visualHour, setVisualHour] = useState(initial.hourStr);
  const [visualMinute, setVisualMinute] = useState(initial.minuteStr);

  const hourScrollRef = useRef<ScrollView>(null);
  const minuteScrollRef = useRef<ScrollView>(null);
  const isUserInteractingHour = useRef(false);
  const isUserInteractingMinute = useRef(false);

  const isPast = isTimeInPast(selectedHour, selectedMinute, selectedPeriod, selectedDate);
  const suggested = getNextValidFutureTime();

  const scrollToHour = useCallback((h: string, animated = false) => {
    const idx = HOURS.indexOf(h);
    if (idx !== -1 && hourScrollRef.current) {
      hourScrollRef.current.scrollTo({ y: idx * ITEM_HEIGHT, animated });
    }
  }, []);

  const scrollToMinute = useCallback((m: string, animated = false) => {
    const idx = MINUTES.indexOf(m);
    if (idx !== -1 && minuteScrollRef.current) {
      minuteScrollRef.current.scrollTo({ y: idx * ITEM_HEIGHT, animated });
    }
  }, []);

  // Sync scroll position when prop changes externally
  useEffect(() => {
    const p = parseTime(value);
    setSelectedHour(p.hourStr);
    setVisualHour(p.hourStr);
    setSelectedMinute(p.minuteStr);
    setVisualMinute(p.minuteStr);
    setSelectedPeriod(p.period);

    const timer = setTimeout(() => {
      scrollToHour(p.hourStr, false);
      scrollToMinute(p.minuteStr, false);
    }, 60);

    return () => clearTimeout(timer);
  }, [value, scrollToHour, scrollToMinute]);

  // Validation callback
  useEffect(() => {
    onValidationChange?.(
      !isPast,
      isPast
        ? language === 'hi'
          ? 'Aaj ke liye beeta hua samay nahi chuna ja sakta'
          : 'Cannot schedule past time for today'
        : undefined
    );
  }, [isPast, language, onValidationChange]);

  const commitTime = (h: string, m: string, p: string) => {
    setSelectedHour(h);
    setVisualHour(h);
    setSelectedMinute(m);
    setVisualMinute(m);
    setSelectedPeriod(p);
    onChange(`${h}:${m} ${p}`);
  };

  // Real-time highlight during hour scroll
  const handleHourScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    const idx = Math.max(0, Math.min(HOURS.length - 1, Math.round(y / ITEM_HEIGHT)));
    const h = HOURS[idx];
    if (h && h !== visualHour) {
      setVisualHour(h);
    }
  };

  // Commit on end of hour scroll
  const handleHourScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    isUserInteractingHour.current = false;
    const y = e.nativeEvent.contentOffset.y;
    const idx = Math.max(0, Math.min(HOURS.length - 1, Math.round(y / ITEM_HEIGHT)));
    const newHour = HOURS[idx];
    if (newHour) {
      commitTime(newHour, selectedMinute, selectedPeriod);
    }
  };

  // Real-time highlight during minute scroll
  const handleMinuteScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    const idx = Math.max(0, Math.min(MINUTES.length - 1, Math.round(y / ITEM_HEIGHT)));
    const m = MINUTES[idx];
    if (m && m !== visualMinute) {
      setVisualMinute(m);
    }
  };

  // Commit on end of minute scroll
  const handleMinuteScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    isUserInteractingMinute.current = false;
    const y = e.nativeEvent.contentOffset.y;
    const idx = Math.max(0, Math.min(MINUTES.length - 1, Math.round(y / ITEM_HEIGHT)));
    const newMin = MINUTES[idx];
    if (newMin) {
      commitTime(selectedHour, newMin, selectedPeriod);
    }
  };

  // Direct tap on any item in wheel
  const selectHourDirect = (h: string, idx: number) => {
    commitTime(h, selectedMinute, selectedPeriod);
    hourScrollRef.current?.scrollTo({ y: idx * ITEM_HEIGHT, animated: true });
  };

  const selectMinuteDirect = (m: string, idx: number) => {
    commitTime(selectedHour, m, selectedPeriod);
    minuteScrollRef.current?.scrollTo({ y: idx * ITEM_HEIGHT, animated: true });
  };

  const handlePeriodChange = (p: 'AM' | 'PM') => {
    commitTime(selectedHour, selectedMinute, p);
  };

  // Quick preset offsets from current moment
  const applyQuickOffset = (minutesFromNow: number) => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + minutesFromNow);
    let h = d.getHours();
    const isPM = h >= 12;
    if (h > 12) h -= 12;
    if (h === 0) h = 12;
    const m = d.getMinutes();
    const hStr = String(h).padStart(2, '0');
    const mStr = String(m).padStart(2, '0');
    const pStr = isPM ? 'PM' : 'AM';

    commitTime(hStr, mStr, pStr);
    scrollToHour(hStr, true);
    scrollToMinute(mStr, true);
  };

  const applyFixedTime = (h: string, m: string, p: 'AM' | 'PM') => {
    commitTime(h, m, p);
    scrollToHour(h, true);
    scrollToMinute(m, true);
  };

  const handleAutoFix = () => {
    const next = getNextValidFutureTime();
    commitTime(next.hourStr, next.minuteStr, next.period);
    scrollToHour(next.hourStr, true);
    scrollToMinute(next.minuteStr, true);
  };

  return (
    <View style={styles.container}>
      {/* 1. Sleek Compact Past-Time Banner */}
      {isPast && (
        <View style={styles.pastBanner}>
          <View style={styles.pastBannerLeft}>
            <Text style={styles.pastBannerIcon}>⚠️</Text>
            <Text style={styles.pastBannerText}>
              {language === 'hi' ? 'Beeta hua samay chuna gaya hai' : 'Past time selected'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.fixBtn}
            onPress={handleAutoFix}
            activeOpacity={0.8}
          >
            <Text style={styles.fixBtnText}>
              ⚡ {suggested.hourStr}:{suggested.minuteStr} {suggested.period}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 2. Premium Scrolling Clock Card */}
      <View style={[styles.card, isPast && styles.cardPast]}>
        {/* Column Labels */}
        <View style={styles.columnLabelsRow}>
          <Text style={styles.columnLabel}>{language === 'hi' ? 'GHANTA' : 'HOUR'}</Text>
          <View style={styles.colonSpacer} />
          <Text style={styles.columnLabel}>{language === 'hi' ? 'MINUTE' : 'MIN'}</Text>
          <Text style={styles.columnLabelRight}>{language === 'hi' ? 'AM / PM' : 'PERIOD'}</Text>
        </View>

        {/* Wheel Viewport */}
        <View style={styles.wheelViewport}>
          {/* Frosted Center Selection Pill */}
          <View
            style={[styles.centerHighlightPill, isPast && styles.centerHighlightPillPast]}
            pointerEvents="none"
          />

          {/* Top & Bottom Fade Overlays */}
          <View style={styles.topFadeOverlay} pointerEvents="none" />
          <View style={styles.bottomFadeOverlay} pointerEvents="none" />

          <View style={styles.wheelsRow}>
            {/* Hours Scrolling Wheel */}
            <View style={styles.wheelColumn}>
              <ScrollView
                ref={hourScrollRef}
                style={styles.wheelScroll}
                contentContainerStyle={styles.wheelScrollContent}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled={true}
                snapToOffsets={HOUR_OFFSETS}
                snapToAlignment="start"
                decelerationRate="fast"
                bounces={false}
                scrollEventThrottle={16}
                onScrollBeginDrag={() => {
                  isUserInteractingHour.current = true;
                }}
                onScroll={handleHourScroll}
                onMomentumScrollEnd={handleHourScrollEnd}
                onScrollEndDrag={handleHourScrollEnd}
                onLayout={() => scrollToHour(selectedHour, false)}
              >
                {HOURS.map((h, idx) => {
                  const isCenter = visualHour === h;
                  return (
                    <TouchableOpacity
                      key={`hour-${h}`}
                      style={styles.itemRow}
                      onPress={() => selectHourDirect(h, idx)}
                      activeOpacity={0.65}
                    >
                      <Text
                        style={[
                          styles.itemText,
                          isCenter && styles.itemTextSelected,
                          isCenter && isPast && styles.itemTextPast,
                        ]}
                      >
                        {h}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Colon Separator */}
            <View style={styles.colonWrap} pointerEvents="none">
              <Text style={[styles.colonText, isPast && styles.colonTextPast]}>:</Text>
            </View>

            {/* Minutes Scrolling Wheel */}
            <View style={styles.wheelColumn}>
              <ScrollView
                ref={minuteScrollRef}
                style={styles.wheelScroll}
                contentContainerStyle={styles.wheelScrollContent}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled={true}
                snapToOffsets={MINUTE_OFFSETS}
                snapToAlignment="start"
                decelerationRate="fast"
                bounces={false}
                scrollEventThrottle={16}
                onScrollBeginDrag={() => {
                  isUserInteractingMinute.current = true;
                }}
                onScroll={handleMinuteScroll}
                onMomentumScrollEnd={handleMinuteScrollEnd}
                onScrollEndDrag={handleMinuteScrollEnd}
                onLayout={() => scrollToMinute(selectedMinute, false)}
              >
                {MINUTES.map((m, idx) => {
                  const isCenter = visualMinute === m;
                  return (
                    <TouchableOpacity
                      key={`min-${m}`}
                      style={styles.itemRow}
                      onPress={() => selectMinuteDirect(m, idx)}
                      activeOpacity={0.65}
                    >
                      <Text
                        style={[
                          styles.itemText,
                          isCenter && styles.itemTextSelected,
                          isCenter && isPast && styles.itemTextPast,
                        ]}
                      >
                        {m}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* AM / PM Segmented Control */}
            <View style={styles.periodContainer}>
              {PERIODS.map((p) => {
                const active = selectedPeriod === p;
                return (
                  <TouchableOpacity
                    key={p}
                    style={[styles.periodBtn, active && styles.periodBtnActive]}
                    onPress={() => handlePeriodChange(p)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.periodText, active && styles.periodTextActive]}>
                      {p}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        {/* Subtle Divider */}
        <View style={styles.cardDivider} />

        {/* Quick Presets Row */}
        <View style={styles.presetSection}>
          <Text style={styles.presetHeading}>
            {language === 'hi' ? '⚡ 1-Tap Samay:' : '⚡ Quick Presets:'}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.presetsRow}
          >
            <TouchableOpacity
              style={styles.presetChip}
              onPress={() => applyQuickOffset(15)}
              activeOpacity={0.75}
            >
              <Text style={styles.presetChipText}>+15 min</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.presetChip}
              onPress={() => applyQuickOffset(30)}
              activeOpacity={0.75}
            >
              <Text style={styles.presetChipText}>+30 min</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.presetChip}
              onPress={() => applyQuickOffset(60)}
              activeOpacity={0.75}
            >
              <Text style={styles.presetChipText}>+1 hr</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.presetChip}
              onPress={() => applyFixedTime('09', '00', 'AM')}
              activeOpacity={0.75}
            >
              <Text style={styles.presetChipText}>9:00 AM</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.presetChip}
              onPress={() => applyFixedTime('02', '00', 'PM')}
              activeOpacity={0.75}
            >
              <Text style={styles.presetChipText}>2:00 PM</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.presetChip}
              onPress={() => applyFixedTime('06', '00', 'PM')}
              activeOpacity={0.75}
            >
              <Text style={styles.presetChipText}>6:00 PM</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.presetChip}
              onPress={() => applyFixedTime('09', '00', 'PM')}
              activeOpacity={0.75}
            >
              <Text style={styles.presetChipText}>9:00 PM</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
  },
  pastBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
  },
  pastBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  pastBannerIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  pastBannerText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
    flexShrink: 1,
  },
  fixBtn: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  fixBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardPast: {
    borderColor: '#FCA5A5',
    backgroundColor: '#FFFBFB',
  },
  columnLabelsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 6,
  },
  columnLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  colonSpacer: {
    width: 20,
  },
  columnLabelRight: {
    width: 76,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.5,
    marginLeft: 8,
  },
  wheelViewport: {
    height: ITEM_HEIGHT * 3, // 132px (shows exactly 3 rows: above, center, below)
    position: 'relative',
    justifyContent: 'center',
  },
  centerHighlightPill: {
    position: 'absolute',
    left: 4,
    right: 88,
    top: ITEM_HEIGHT, // Exactly center row (44px)
    height: ITEM_HEIGHT,
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    borderWidth: 1.2,
    borderColor: '#CBD5E1',
  },
  centerHighlightPillPast: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  topFadeOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 88,
    height: ITEM_HEIGHT * 0.85,
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    zIndex: 2,
  },
  bottomFadeOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 88,
    height: ITEM_HEIGHT * 0.85,
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    zIndex: 2,
  },
  wheelsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: ITEM_HEIGHT * 3,
  },
  wheelColumn: {
    flex: 1,
    height: ITEM_HEIGHT * 3,
  },
  wheelScroll: {
    flex: 1,
  },
  wheelScrollContent: {
    paddingVertical: ITEM_HEIGHT, // Top & bottom 44px padding so index 0 & last index reach exact center
  },
  itemRow: {
    height: ITEM_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#94A3B8',
    opacity: 0.45,
  },
  itemTextSelected: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
    opacity: 1,
    letterSpacing: 0.5,
  },
  itemTextPast: {
    color: '#DC2626',
  },
  colonWrap: {
    width: 20,
    height: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
  colonText: {
    fontSize: 26,
    fontWeight: '900',
    color: '#334155',
    lineHeight: 30,
  },
  colonTextPast: {
    color: '#DC2626',
  },
  periodContainer: {
    width: 76,
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    padding: 3,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignSelf: 'center',
    marginLeft: 8,
  },
  periodBtn: {
    paddingVertical: 9,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodBtnActive: {
    backgroundColor: '#0F172A',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  periodText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  periodTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 10,
  },
  presetSection: {
    marginTop: 2,
  },
  presetHeading: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  presetsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingRight: 8,
  },
  presetChip: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  presetChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
});

export default TimeSliderPicker;
