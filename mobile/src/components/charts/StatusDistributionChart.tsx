import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';
import type { StatusDistributionData } from '../../types';
import { useTheme, Theme } from '../../theme';

interface StatusDistributionChartProps {
  data: StatusDistributionData[];
}

export const StatusDistributionChart: React.FC<StatusDistributionChartProps> = ({ data }) => {
  const { theme } = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Booking Status</Text>
      
      <View style={styles.chartRow}>
        <PieChart
          data={pieData}
          radius={70}
          innerRadius={40}
          showText
          textColor={theme.colors.text}
          textSize={10}
          fontWeight="bold"
          strokeWidth={2}
          strokeColor={theme.colors.surface}
        />
        
        {/* Legend */}
        <View style={styles.legend}>
          {pieData.map((item, index) => (
            <View key={index} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: item.color }]} />
              <Text style={styles.legendText}>
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
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
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
