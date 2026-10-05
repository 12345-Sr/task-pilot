import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '../theme/colors';
import { radius } from '../theme/radius';
import { Priority } from '../types';
import { useAppStore } from '../store';
import { t } from '../i18n';

interface PriorityChipProps {
  priority?: Priority | string;
  selected?: boolean;
  onPress?: () => void;
  size?: 'sm' | 'md';
}

export const PriorityChip: React.FC<PriorityChipProps> = ({
  priority = 'MEDIUM',
  selected = false,
  onPress,
  size = 'md',
}) => {
  const { language } = useAppStore();
  const p = String(priority).toUpperCase();
  let label = t(language, 'priority_normal');
  let dotColor = colors.normalGreen;
  let bg = colors.softGreen;
  let borderColor = '#A7F3D0';
  let textCol = '#065F46';

  if (p === 'ZAROORI' || p === 'URGENT' || p === 'HIGH' || p === 'IMPORTANT') {
    label = language === 'hi' ? 'Zaroori' : 'High';
    dotColor = '#DC2626';
    bg = selected ? '#DC2626' : '#FEE2E2';
    borderColor = selected ? '#B91C1C' : '#FECACA';
    textCol = selected ? '#FFFFFF' : '#DC2626';
  } else if (p === 'MEDIUM') {
    label = 'Medium';
    dotColor = '#D97706';
    bg = selected ? '#D97706' : '#FEF3C7';
    borderColor = selected ? '#B45309' : '#FDE68A';
    textCol = selected ? '#FFFFFF' : '#D97706';
  } else {
    label = language === 'hi' ? 'Normal' : 'Normal';
    dotColor = '#15803D';
    bg = selected ? '#15803D' : '#DCFCE7';
    borderColor = selected ? '#166534' : '#BBF7D0';
    textCol = selected ? '#FFFFFF' : '#15803D';
  }

  const content = (
    <View
      style={[
        styles.chip,
        { backgroundColor: bg, borderColor },
        size === 'sm' && styles.chipSm,
      ]}
    >
      <View
        style={[
          styles.dot,
          { backgroundColor: selected ? colors.white : dotColor },
        ]}
      />
      <Text
        style={[
          styles.label,
          { color: textCol },
          size === 'sm' && styles.labelSm,
        ]}
      >
        {label}
      </Text>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.8} onPress={onPress}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 11,
    borderRadius: radius.pill,
    borderWidth: 1,
    gap: 6,
  },
  chipSm: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  labelSm: {
    fontSize: 10,
    fontWeight: '800',
  },
});

export default PriorityChip;
