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
    label = t(language, 'priority_zaroori');
    dotColor = colors.tealZaroori;
    bg = selected ? colors.tealZaroori : colors.softTeal;
    borderColor = selected ? colors.tealDark : '#B2F5EA';
    textCol = selected ? colors.white : '#0D9488';
  } else if (p === 'MEDIUM') {
    label = t(language, 'priority_medium');
    dotColor = colors.mediumYellow;
    bg = selected ? colors.mediumYellow : colors.softYellow;
    borderColor = selected ? colors.primary : '#FDE68A';
    textCol = selected ? colors.white : '#B45309';
  } else {
    label = t(language, 'priority_normal');
    dotColor = colors.normalGreen;
    bg = selected ? colors.normalGreen : colors.softGreen;
    borderColor = selected ? '#059669' : '#A7F3D0';
    textCol = selected ? colors.white : '#047857';
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
