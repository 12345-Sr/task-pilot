import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { colors } from '../theme/colors';
import { t } from '../i18n';

export interface TimeSliderPickerProps {
  value: string; // e.g. "09:30 AM"
  onChange: (time: string) => void;
  language?: string;
  selectedDate?: string; // e.g. "2026-09-11"
  onValidationChange?: (isValid: boolean, errorMsg?: string) => void;
}

const ITEM_HEIGHT = 48;
const VISIBLE_ITEMS = 3; // 1 above, 1 selected in center, 1 below

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0')); // 00, 05, 10 ... 55
const PERIODS = ['AM', 'PM'];

/**
 * Calculates the next valid future time (now + 30 mins rounded to next 5-minute interval)
 */
export const getNextValidFutureTime = (): { hourStr: string; minuteStr: string; period: string } => {
  const now = new Date();
  now.setMinutes(now.getMinutes() + 30);
  let h = now.getHours();
  const isPM = h >= 12;
  if (h > 12) h -= 12;
  if (h === 0) h = 12;
  const m = (Math.ceil(now.getMinutes() / 5) * 5) % 60;
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

  // If selected date is in the past (before today)
  if (dateStr < todayStr) return true;
  // If selected date is in the future (after today), any time is allowed
  if (dateStr > todayStr) return false;

  // Selected date is TODAY — evaluate hours and minutes against current moment
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
  // Parse incoming value safely
  const parseTime = (str: string) => {
    try {
      const isPM = /pm/i.test(str);
      const clean = str.replace(/am|pm/gi, '').trim();
      const parts = clean.split(':');
      let h = parseInt(parts[0], 10) || 9;
      let m = parseInt(parts[1], 10) || 0;
      if (h > 12) h = h % 12 || 12;
      if (h === 0) h = 12;
      const roundedM = (Math.round(m / 5) * 5) % 60;
      return {
        hourStr: String(h).padStart(2, '0'),
        minuteStr: String(roundedM).padStart(2, '0'),
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

  const hourScrollRef = useRef<ScrollView>(null);
  const minuteScrollRef = useRef<ScrollView>(null);

  // Evaluate if current selection is past
  const isPast = isTimeInPast(selectedHour, selectedMinute, selectedPeriod, selectedDate);

  // Sync with prop when value changes
  useEffect(() => {
    const p = parseTime(value);
    setSelectedHour(p.hourStr);
    setSelectedMinute(p.minuteStr);
    setSelectedPeriod(p.period);

    const hIdx = HOURS.indexOf(p.hourStr);
    if (hIdx !== -1 && hourScrollRef.current) {
      hourScrollRef.current.scrollTo({ y: hIdx * ITEM_HEIGHT, animated: false });
    }
    const mIdx = MINUTES.indexOf(p.minuteStr);
    if (mIdx !== -1 && minuteScrollRef.current) {
      minuteScrollRef.current.scrollTo({ y: mIdx * ITEM_HEIGHT, animated: false });
    }
  }, [value]);

  // Notify parent of validation status
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

  const updateTime = (h: string, m: string, p: string) => {
    setSelectedHour(h);
    setSelectedMinute(m);
    setSelectedPeriod(p);
    onChange(`${h}:${m} ${p}`);
  };

  const handleHourScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    const idx = Math.max(0, Math.min(HOURS.length - 1, Math.round(y / ITEM_HEIGHT)));
    const newHour = HOURS[idx];
    if (newHour && newHour !== selectedHour) {
      updateTime(newHour, selectedMinute, selectedPeriod);
    }
  };

  const handleMinuteScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    const idx = Math.max(0, Math.min(MINUTES.length - 1, Math.round(y / ITEM_HEIGHT)));
    const newMin = MINUTES[idx];
    if (newMin && newMin !== selectedMinute) {
      updateTime(selectedHour, newMin, selectedPeriod);
    }
  };

  const selectHourDirect = (h: string, idx: number) => {
    updateTime(h, selectedMinute, selectedPeriod);
    hourScrollRef.current?.scrollTo({ y: idx * ITEM_HEIGHT, animated: true });
  };

  const selectMinuteDirect = (m: string, idx: number) => {
    updateTime(selectedHour, m, selectedPeriod);
    minuteScrollRef.current?.scrollTo({ y: idx * ITEM_HEIGHT, animated: true });
  };

  const handleSetNextFutureTime = () => {
    const next = getNextValidFutureTime();
    updateTime(next.hourStr, next.minuteStr, next.period);
    const hIdx = HOURS.indexOf(next.hourStr);
    if (hIdx !== -1) {
      hourScrollRef.current?.scrollTo({ y: hIdx * ITEM_HEIGHT, animated: true });
    }
    const mIdx = MINUTES.indexOf(next.minuteStr);
    if (mIdx !== -1) {
      minuteScrollRef.current?.scrollTo({ y: mIdx * ITEM_HEIGHT, animated: true });
    }
  };

  const suggested = getNextValidFutureTime();

  return (
    <View style={styles.container}>
      {/* 1. Selected Time Banner */}
      <View style={[styles.timePreviewCard, isPast && styles.timePreviewCardWarning]}>
        <View style={styles.timePreviewLeft}>
          <Text style={styles.timePreviewLabel} numberOfLines={1}>
            {t(language, 'selected_time_label')}
          </Text>
          {isPast && (
            <View style={styles.pastBadge}>
              <Text style={styles.pastBadgeText}>⚠️ PAST TIME</Text>
            </View>
          )}
        </View>
        <Text style={[styles.timePreviewValue, isPast && styles.timePreviewValueWarning]}>
          {selectedHour}:{selectedMinute} {selectedPeriod}
        </Text>
      </View>

      {/* 1b. Past Time Error & 1-Tap Quick Fix */}
      {isPast && (
        <View style={styles.pastWarningBanner}>
          <Text style={styles.pastWarningText}>
            {language === 'hi'
              ? '⚠️ Beeta hua samay nahi chuna ja sakta. Kripya future time chunein.'
              : '⚠️ Cannot pick a past time for today. Please select a future time.'}
          </Text>
          <TouchableOpacity
            style={styles.autoFixBtn}
            onPress={handleSetNextFutureTime}
            activeOpacity={0.8}
          >
            <Text style={styles.autoFixBtnText}>
              ⚡ {language === 'hi' ? 'Agle Samay Par Set Karein' : 'Set Next Valid Time'}:{' '}
              {suggested.hourStr}:{suggested.minuteStr} {suggested.period}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 2. Column Titles Row */}
      <View style={styles.headersRow}>
        <View style={styles.headerColumn}>
          <Text style={styles.headerLabel}>{t(language, 'hours_label')}</Text>
        </View>
        <View style={styles.headerColonSpacer} />
        <View style={styles.headerColumn}>
          <Text style={styles.headerLabel}>{t(language, 'minutes_label')}</Text>
        </View>
        <View style={styles.headerPeriodColumn}>
          <Text style={styles.headerLabel}>{t(language, 'period_label')}</Text>
        </View>
      </View>

      {/* 3. 3-Column Sliding Roller Box */}
      <View style={[styles.sliderBox, isPast && styles.sliderBoxWarning]}>
        {/* Highlight band behind the center row */}
        <View
          style={[styles.centerHighlightBand, isPast && styles.centerHighlightBandWarning]}
          pointerEvents="none"
        />

        {/* Column 1: Hours Slider */}
        <View style={styles.columnWrapper}>
          <ScrollView
            ref={hourScrollRef}
            style={styles.scrollList}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled={true}
            snapToInterval={ITEM_HEIGHT}
            snapToAlignment="center"
            decelerationRate="fast"
            bounces={false}
            onScrollEndDrag={handleHourScroll}
            onMomentumScrollEnd={handleHourScroll}
          >
            {HOURS.map((h, idx) => {
              const isSelected = selectedHour === h;
              return (
                <TouchableOpacity
                  key={`hour-${h}`}
                  style={styles.itemRow}
                  onPress={() => selectHourDirect(h, idx)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.itemText,
                      isSelected && styles.itemTextActive,
                      isSelected && isPast && styles.itemTextWarning,
                    ]}
                  >
                    {h}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Separator Colon */}
        <View style={styles.colonWrap}>
          <Text style={[styles.colonText, isPast && styles.colonTextWarning]}>:</Text>
        </View>

        {/* Column 2: Minutes Slider */}
        <View style={styles.columnWrapper}>
          <ScrollView
            ref={minuteScrollRef}
            style={styles.scrollList}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled={true}
            snapToInterval={ITEM_HEIGHT}
            snapToAlignment="center"
            decelerationRate="fast"
            bounces={false}
            onScrollEndDrag={handleMinuteScroll}
            onMomentumScrollEnd={handleMinuteScroll}
          >
            {MINUTES.map((m, idx) => {
              const isSelected = selectedMinute === m;
              return (
                <TouchableOpacity
                  key={`min-${m}`}
                  style={styles.itemRow}
                  onPress={() => selectMinuteDirect(m, idx)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.itemText,
                      isSelected && styles.itemTextActive,
                      isSelected && isPast && styles.itemTextWarning,
                    ]}
                  >
                    {m}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Column 3: AM / PM Selector */}
        <View style={styles.periodColumn}>
          <View style={styles.periodPillWrap}>
            {PERIODS.map((p) => {
              const isSelected = selectedPeriod === p;
              return (
                <TouchableOpacity
                  key={p}
                  style={[
                    styles.periodPill,
                    isSelected && styles.periodPillActive,
                    isSelected && isPast && styles.periodPillWarning,
                  ]}
                  onPress={() => updateTime(selectedHour, selectedMinute, p)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.periodPillText,
                      isSelected && styles.periodPillTextActive,
                    ]}
                  >
                    {p}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>

      {/* 4. Slide Hint */}
      <Text style={styles.slideHint}>
        {language === 'hi'
          ? '☝️ उंगली से ऊपर-नीचे स्लाइड करके या सीधे टैप करके समय और AM/PM बदलें'
          : '☝️ Slide up/down or tap directly to change hours, minutes, and AM/PM'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    marginVertical: 4,
  },
  timePreviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    backgroundColor: '#FDF7EC',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#EBD8B3',
    marginBottom: 8,
  },
  timePreviewCardWarning: {
    backgroundColor: '#FEF2F2',
    borderColor: '#EF4444',
  },
  timePreviewLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
  },
  timePreviewLabel: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  pastBadge: {
    flexShrink: 0,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  pastBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#DC2626',
  },
  timePreviewValue: {
    flexShrink: 0,
    fontSize: 22,
    fontWeight: '900',
    color: colors.primary, // #C5A059 Champagne Camel Gold
    letterSpacing: 0.5,
  },
  timePreviewValueWarning: {
    color: '#DC2626',
  },
  pastWarningBanner: {
    width: '100%',
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    marginBottom: 10,
    gap: 6,
  },
  pastWarningText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B91C1C',
    textAlign: 'center',
  },
  autoFixBtn: {
    backgroundColor: '#DC2626',
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  autoFixBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  headersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 14,
    marginBottom: 6,
  },
  headerColumn: {
    flex: 1,
    alignItems: 'center',
  },
  headerColonSpacer: {
    width: 20,
  },
  headerPeriodColumn: {
    width: 72,
    alignItems: 'center',
  },
  headerLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  sliderBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: ITEM_HEIGHT * VISIBLE_ITEMS,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingHorizontal: 8,
    position: 'relative',
    width: '100%',
    overflow: 'hidden',
  },
  sliderBoxWarning: {
    borderColor: '#FCA5A5',
  },
  centerHighlightBand: {
    position: 'absolute',
    top: ITEM_HEIGHT,
    left: 8,
    right: 8,
    height: ITEM_HEIGHT,
    backgroundColor: '#FDF7EC',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  centerHighlightBandWarning: {
    backgroundColor: '#FEF2F2',
    borderColor: '#EF4444',
  },
  columnWrapper: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
  },
  scrollList: {
    width: '100%',
    height: '100%',
  },
  scrollContent: {
    paddingVertical: ITEM_HEIGHT,
  },
  itemRow: {
    height: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#94A3B8',
  },
  itemTextActive: {
    fontSize: 24,
    fontWeight: '900',
    color: '#825B15',
  },
  itemTextWarning: {
    color: '#DC2626',
  },
  colonWrap: {
    width: 20,
    justifyContent: 'center',
    alignItems: 'center',
    height: ITEM_HEIGHT * VISIBLE_ITEMS,
  },
  colonText: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.primary,
  },
  colonTextWarning: {
    color: '#DC2626',
  },
  periodColumn: {
    width: 72,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodPillWrap: {
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 3,
    gap: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    width: '100%',
  },
  periodPill: {
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: 'center',
  },
  periodPillActive: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 2,
  },
  periodPillWarning: {
    backgroundColor: '#DC2626',
    shadowColor: '#DC2626',
  },
  periodPillText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#64748B',
  },
  periodPillTextActive: {
    color: '#FFFFFF',
  },
  slideHint: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 8,
    textAlign: 'center',
  },
});

export default TimeSliderPicker;
