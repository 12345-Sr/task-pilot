import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

interface CalendarIconProps {
  date?: string | Date;
  size?: number;
}

/**
 * Modern High-Definition Calendar Emblem with dynamic Month & Day Number.
 */
export const CalendarIcon: React.FC<CalendarIconProps> = ({ date, size = 36 }) => {
  const scale = size / 36;

  const { dayNum, monthStr } = React.useMemo(() => {
    let d: Date;
    if (!date) {
      d = new Date();
    } else if (date instanceof Date) {
      d = date;
    } else {
      const str = String(date).trim();
      const parsed = new Date(str.includes('T') ? str : `${str}T00:00:00`);
      d = isNaN(parsed.getTime()) ? new Date() : parsed;
    }
    const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    return {
      dayNum: String(d.getDate()),
      monthStr: MONTHS[d.getMonth()] || 'DAY',
    };
  }, [date]);

  const cardWidth = size;
  const cardHeight = size * 1.05;
  const bannerHeight = size * 0.35;
  const dayFontSize = Math.max(Math.round(size * 0.44), 10);
  const monthFontSize = Math.max(Math.round(size * 0.2), 6);

  return (
    <View style={[styles.wrapper, { width: cardWidth, height: cardHeight + 3 * scale }]}>
      {/* Top metallic binder rings */}
      <View style={styles.pinsRow}>
        <View style={[styles.pin, { width: 3.5 * scale, height: 6 * scale }]} />
        <View style={[styles.pin, { width: 3.5 * scale, height: 6 * scale }]} />
      </View>

      {/* Calendar Card Body */}
      <View style={[styles.card, { width: cardWidth, height: cardHeight }]}>
        {/* Sleek Warm Header Banner with Month */}
        <View style={[styles.headerBanner, { height: bannerHeight }]}>
          <Text style={[styles.monthText, { fontSize: monthFontSize }]}>{monthStr}</Text>
        </View>

        {/* Dynamic Day Number Body */}
        <View style={styles.body}>
          <Text style={[styles.dayText, { fontSize: dayFontSize }]}>{dayNum}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  pinsRow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 5,
    zIndex: 2,
  },
  pin: {
    borderRadius: 2,
    backgroundColor: '#78350F',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  headerBanner: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthText: {
    color: '#FFFFFF',
    fontWeight: '900',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  body: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: {
    color: '#0F172A',
    fontWeight: '900',
    textAlign: 'center',
    marginTop: -1,
  },
});

export default CalendarIcon;
