import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { colors } from '../theme/colors';
import { t, LOCALIZED_DATES } from '../i18n';
import CalendarIcon from './CalendarIcon';

interface DatePickerCardProps {
  selectedDate: string; // YYYY-MM-DD
  onSelectDate: (dateStr: string) => void;
  language?: string;
}

export const DatePickerCard: React.FC<DatePickerCardProps> = ({
  selectedDate,
  onSelectDate,
  language = 'hi',
}) => {
  const [showCalendar, setShowCalendar] = useState(false);

  const getLocalDateStr = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const today = new Date();
  const todayStr = getLocalDateStr(today);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = getLocalDateStr(tomorrow);

  const isToday = selectedDate === todayStr;
  const isTomorrow = selectedDate === tomorrowStr;
  const isOther = !isToday && !isTomorrow;

  const locConfig = LOCALIZED_DATES[language] || LOCALIZED_DATES.hi;

  // Generate the next 30 days for horizontal quick picker using localized month and day names
  const upcomingDays = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const dateStr = getLocalDateStr(d);
    const dayName = locConfig.days[d.getDay()] || 'Day';
    const dayNum = d.getDate();
    const monthName = locConfig.months[d.getMonth()] || 'Mon';
    return { dateStr, dayName, dayNum, monthName, fullDate: d };
  });

  const formatDateDisplay = (dateStr: string) => {
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const d = parseInt(parts[2], 10);
        const dateObj = new Date(y, m, d);
        const dayName = locConfig.days[dateObj.getDay()] || '';
        const monthName = locConfig.months[m] || '';
        return `${dayName}, ${d} ${monthName} ${y}`;
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  return (
    <View style={styles.container}>
      {/* 1. Today and Tomorrow Quick Buttons */}
      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[styles.toggleBtn, isToday && styles.toggleBtnActive]}
          onPress={() => {
            onSelectDate(todayStr);
            setShowCalendar(false);
          }}
          activeOpacity={0.8}
        >
          <Text
            style={[styles.toggleBtnText, isToday && styles.toggleBtnTextActive]}
            numberOfLines={1}
          >
            {t(language, 'today_button')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.toggleBtn, isTomorrow && styles.toggleBtnActive]}
          onPress={() => {
            onSelectDate(tomorrowStr);
            setShowCalendar(false);
          }}
          activeOpacity={0.8}
        >
          <Text
            style={[styles.toggleBtnText, isTomorrow && styles.toggleBtnTextActive]}
            numberOfLines={1}
          >
            {t(language, 'tomorrow_button')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 2. "Other Date" button directly below Today and Tomorrow */}
      <TouchableOpacity
        style={[styles.otherDateBtn, (isOther || showCalendar) && styles.otherDateBtnActive]}
        onPress={() => setShowCalendar(!showCalendar)}
        activeOpacity={0.8}
      >
        <View style={styles.otherDateLeft}>
          <CalendarIcon size={26} />
          <View style={styles.otherDateTextWrap}>
            <Text style={styles.otherDateTitle} numberOfLines={1}>
              {isOther ? t(language, 'selected_date_title') : t(language, 'pick_other_date')}
            </Text>
            <Text style={styles.otherDateSubtitle} numberOfLines={1}>
              {formatDateDisplay(selectedDate)}
            </Text>
          </View>
        </View>
        <Text style={styles.chevronIcon}>
          {showCalendar ? t(language, 'close_picker') : t(language, 'open_picker')}
        </Text>
      </TouchableOpacity>

      {/* 3. Expandable Calendar / Date Strip */}
      {showCalendar && (
        <View style={styles.calendarContainer}>
          <Text style={styles.calendarPrompt}>
            {t(language, 'calendar_strip_prompt')}
          </Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.daysScroll}
          >
            {upcomingDays.map((item) => {
              const isSelected = selectedDate === item.dateStr;
              return (
                <TouchableOpacity
                  key={item.dateStr}
                  style={[styles.dayCard, isSelected && styles.dayCardActive]}
                  onPress={() => {
                    onSelectDate(item.dateStr);
                    setShowCalendar(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[styles.dayNameText, isSelected && styles.dayNameTextActive]}
                    numberOfLines={1}
                  >
                    {item.dayName}
                  </Text>
                  <Text style={[styles.dayNumText, isSelected && styles.dayNumTextActive]}>
                    {item.dayNum}
                  </Text>
                  <Text
                    style={[styles.monthText, isSelected && styles.monthTextActive]}
                    numberOfLines={1}
                  >
                    {item.monthName}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 10,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleBtnActive: {
    backgroundColor: '#FFF2E0',
    borderColor: colors.primaryOrange,
    shadowColor: colors.primaryOrange,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  toggleBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  toggleBtnTextActive: {
    color: colors.darkOrange,
  },
  otherDateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  otherDateBtnActive: {
    backgroundColor: '#FFF8F0',
    borderColor: colors.primaryOrange,
  },
  otherDateLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginRight: 8,
  },
  otherDateTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  otherDateIcon: {
    fontSize: 22,
  },
  otherDateTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  otherDateSubtitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryOrange,
    marginTop: 2,
  },
  chevronIcon: {
    flexShrink: 0,
    fontSize: 11,
    fontWeight: '800',
    color: colors.primaryOrange,
  },
  calendarContainer: {
    backgroundColor: '#F9FAFC',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  calendarPrompt: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  daysScroll: {
    gap: 8,
    paddingVertical: 4,
  },
  dayCard: {
    width: 62,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCardActive: {
    backgroundColor: colors.primaryOrange,
    borderColor: colors.darkOrange,
    shadowColor: colors.primaryOrange,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3,
  },
  dayNameText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 2,
    textAlign: 'center',
  },
  dayNameTextActive: {
    color: '#FFFFFF',
  },
  dayNumText: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.textPrimary,
    marginVertical: 1,
  },
  dayNumTextActive: {
    color: '#FFFFFF',
  },
  monthText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
    marginTop: 1,
    textAlign: 'center',
  },
  monthTextActive: {
    color: '#FFFFFF',
  },
});

export default DatePickerCard;
