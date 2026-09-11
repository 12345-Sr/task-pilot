import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { radius } from '../theme/radius';

interface LoadingSkeletonProps {
  count?: number;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({ count = 3 }) => {
  const items = Array.from({ length: count }, (_, i) => i);
  return (
    <View style={styles.container}>
      {items.map((key) => (
        <View key={key} style={styles.cardSkeleton}>
          <View style={styles.circleSkeleton} />
          <View style={styles.textGroup}>
            <View style={styles.titleSkeleton} />
            <View style={styles.timeSkeleton} />
          </View>
          <View style={styles.chipSkeleton} />
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 10,
    marginVertical: 6,
  },
  cardSkeleton: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  circleSkeleton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
    marginRight: 12,
  },
  textGroup: {
    flex: 1,
    gap: 6,
  },
  titleSkeleton: {
    width: '75%',
    height: 14,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
  },
  timeSkeleton: {
    width: '35%',
    height: 10,
    backgroundColor: '#F1F5F9',
    borderRadius: 3,
  },
  chipSkeleton: {
    width: 60,
    height: 22,
    borderRadius: radius.pill,
    backgroundColor: '#F1F5F9',
  },
});

export default LoadingSkeleton;
