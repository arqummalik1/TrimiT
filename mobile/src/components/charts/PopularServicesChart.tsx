import React from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import type { PopularServiceData } from '../../types';
import { spacing } from '../../lib/utils';
import { useTheme, Theme } from '../../theme/ThemeContext';

interface PopularServicesChartProps {
  data: PopularServiceData[];
}

export const PopularServicesChart: React.FC<PopularServicesChartProps> = ({ data }) => {
  const { theme } = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  const { width: screenWidth } = useWindowDimensions();
  
  if (!data || data.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No service data available</Text>
      </View>
    );
  }

  // Show top 4 services for better fit on mobile
  const topServices = data.slice(0, 4);
  
  // Calculate responsive chart width
  // Account for: screen padding (spacing.xxl * 2) + card padding (16 * 2) + chart margins
  const chartWidth = screenWidth - (spacing.xxl * 2) - 32 - 20;
  
  // Calculate dynamic bar width and spacing based on available width
  const numBars = topServices.length;
  const availableWidth = chartWidth - 40; // Reserve space for Y-axis
  const barWidth = Math.min(Math.floor(availableWidth / (numBars * 2)), 40);
  const barSpacing = Math.floor((availableWidth - (barWidth * numBars)) / (numBars + 1));
  
  const chartData = topServices.map((item, index) => ({
    value: item.bookings,
    label: item.name.length > 8 ? item.name.slice(0, 6) + '...' : item.name,
    frontColor: index === 0 ? theme.colors.primary : index === 1 ? theme.colors.primaryDark : index === 2 ? theme.colors.secondary : `${theme.colors.primary}99`,
    topLabelComponent: () => (
      <Text style={styles.barLabel}>{item.bookings}</Text>
    ),
  }));

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Popular Services</Text>
      <Text style={styles.subtitle}>Top {chartData.length} by bookings</Text>
      
      <View style={styles.chartWrapper}>
        <BarChart
          data={chartData}
          width={chartWidth}
          height={180}
          barWidth={barWidth}
          spacing={barSpacing}
          initialSpacing={Math.max(barSpacing, 10)}
          noOfSections={4}
          maxValue={Math.max(...chartData.map(d => d.value), 5)}
          yAxisTextStyle={styles.axisText}
          xAxisLabelTextStyle={styles.axisText}
          xAxisColor={theme.colors.border}
          yAxisColor={theme.colors.border}
          showVerticalLines
          verticalLinesColor={theme.colors.border}
          showYAxisIndices
          yAxisThickness={1}
          xAxisThickness={1}
        />
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
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 12,
  },
  chartWrapper: {
    width: '100%',
    overflow: 'hidden',
  },
  emptyContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  axisText: {
    fontSize: 10,
    color: theme.colors.textSecondary,
  },
  barLabel: {
    fontSize: 10,
    color: theme.colors.text,
    fontWeight: '600',
    marginBottom: 4,
  },
});
