import React from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import type { TrendData } from '../../types';
import { spacing } from '../../lib/utils';
import { useTheme, Theme } from '../../theme/ThemeContext';

interface BookingsTrendChartProps {
  data: TrendData[];
}

export const BookingsTrendChart: React.FC<BookingsTrendChartProps> = ({ data }) => {
  const { theme } = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  const { width: screenWidth } = useWindowDimensions();
  
  if (!data || data.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No booking data available</Text>
      </View>
    );
  }

  // Transform data for the chart - show last 14 days max
  const chartData = data.slice(-14).map((item) => ({
    value: item.count,
    label: item.date.slice(5), // MM-DD format
  }));

  // Calculate responsive chart width
  // Account for: screen padding (spacing.xxl * 2) + card padding (16 * 2) + chart margins
  const chartWidth = screenWidth - (spacing.xxl * 2) - 32 - 20;
  
  // Calculate dynamic spacing based on number of data points
  const dataPointSpacing = Math.max(Math.floor(chartWidth / chartData.length) - 10, 20);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bookings Trend</Text>
      <Text style={styles.subtitle}>Last {chartData.length} days</Text>
      
      <View style={styles.chartWrapper}>
        <LineChart
          data={chartData}
          width={chartWidth}
          height={180}
          spacing={dataPointSpacing}
          initialSpacing={10}
          color={theme.colors.primary}
          thickness={2}
          startFillColor={`${theme.colors.primary}20`}
          endFillColor={`${theme.colors.primary}05`}
          startOpacity={0.4}
          endOpacity={0.1}
          noOfSections={4}
          maxValue={Math.max(...chartData.map(d => d.value), 5)}
          yAxisTextStyle={styles.axisText}
          xAxisLabelTextStyle={styles.axisText}
          xAxisColor={theme.colors.border}
          yAxisColor={theme.colors.border}
          dataPointsColor={theme.colors.primary}
          dataPointsRadius={4}
          showValuesAsDataPointsText={false}
          focusEnabled
          showStripOnFocus
          stripColor={`${theme.colors.primary}30`}
          stripWidth={1}
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
});
