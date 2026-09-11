import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

export interface DayMetric {
  day: string;
  completed: number;
  total: number;
  active?: boolean;
}

interface WeeklyChartProps {
  data?: DayMetric[];
  days?: DayMetric[];
  completionRate?: number;
}

export const WeeklyChart: React.FC<WeeklyChartProps> = ({
  data,
  days,
  completionRate,
}) => {
  const chartData: DayMetric[] = (days && days.length > 0)
    ? days
    : (data && data.length > 0)
    ? data
    : [
        { day: 'M', completed: 0, total: 0, active: true },
        { day: 'T', completed: 0, total: 0, active: true },
        { day: 'W', completed: 0, total: 0, active: true },
        { day: 'T', completed: 0, total: 0, active: true },
        { day: 'F', completed: 0, total: 0, active: true },
        { day: 'S', completed: 0, total: 0, active: true },
        { day: 'S', completed: 0, total: 0, active: true },
      ];

  const maxCompleted = Math.max(...chartData.map((d) => d.completed || 0), 1);

  return (
    <View style={styles.container}>
      {chartData.map((item, index) => {
        const itemCompleted = item.completed || 0;
        const heightPct = itemCompleted > 0 ? Math.max((itemCompleted / maxCompleted) * 65, 14) : 6;
        const isBestDay = itemCompleted === maxCompleted && itemCompleted > 0;

        return (
          <View key={index} style={styles.column}>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  {
                    height: heightPct,
                    backgroundColor: itemCompleted === 0
                      ? '#E2E8F0'
                      : isBestDay
                      ? colors.successGreen
                      : '#86EFAC',
                  },
                ]}
              />
            </View>
            <Text style={[styles.dayLabel, isBestDay && styles.dayLabelBest]}>
              {item.day}
            </Text>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 90,
    paddingTop: 10,
  },
  column: {
    alignItems: 'center',
    flex: 1,
  },
  barTrack: {
    height: 70,
    width: 14,
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 6,
  },
  barFill: {
    width: 12,
    borderRadius: 6,
  },
  dayLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  dayLabelBest: {
    color: colors.textPrimary,
    fontWeight: '800',
  },
});

export default WeeklyChart;
