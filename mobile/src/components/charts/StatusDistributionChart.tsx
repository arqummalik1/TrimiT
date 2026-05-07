import React from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';
import type { StatusDistributionData } from '../../types';
import { useTheme, Theme } from '../../theme';

interface StatusDistributionChartProps {
  data: StatusDistributionData[];
}

export const StatusDistributionChart: React.FC<StatusDistributionChartProps> = ({ data }) => {
  const { theme } = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  const { width: screenWidth } = useWindowDimensions();

  if (!data || data.length === 0 || data.every(d => d.count === 0)) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No booking status data</Text>
      </View>
    );
  }

  // Filter out zero counts and transform for pie chart
  const pieData = data
    .filter(item => item.count > 0)
    .map(item => ({
      value: item.count,
      color: item.color,
      text: item.status,
    }));

  const total = pieData.reduce((sum, item) => sum + item.value, 0);
  
  // Calculate responsive pie chart radius based on screen width
  const availableWidth = screenWidth - 64; // Account for padding
  const pieRadius = Math.min(Math.floor(availableWidth * 0.2), 70);
  const pieInnerRadius = Math.floor(pieRadius * 0.57);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Booking Status</Text>
      
      <View style={styles.chartRow}>
        <View style={styles.pieWrapper}>
          <PieChart
            data={pieData}
            radius={pieRadius}
            innerRadius={pieInnerRadius}
            showText
            textColor={theme.colors.text}
            textSize={10}
            fontWeight="bold"
            strokeWidth={2}
            strokeColor={theme.colors.surface}
          />
        </View>
        
        {/* Legend */}
        <View style={styles.legend}>
          {pieData.map((item, index) => (
            <View key={index} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: item.color }]} />
              <Text style={styles.legendText} numberOfLines={1}>
                {item.text}: {item.value} ({Math.round((item.value / total) * 100)}%)
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 16,
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  pieWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  legend: {
    flex: 1,
    marginLeft: 16,
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    flexShrink: 0,
  },
  legendText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    flexShrink: 1,
  },
  emptyContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
});
