import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import type { TrendData } from '../../types';
import { colors } from '../../lib/utils';

interface BookingsTrendChartProps {
  data: TrendData[];
}

const { width } = Dimensions.get('window');

export const BookingsTrendChart: React.FC<BookingsTrendChartProps> = ({ data }) => {
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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bookings Trend</Text>
      <Text style={styles.subtitle}>Last {chartData.length} days</Text>
      
      <LineChart
        data={chartData}
        width={width - 80}
        height={180}
        spacing={30}
        initialSpacing={10}
        color={colors.primary}
        thickness={2}
        startFillColor={`${colors.primary}20`}
        endFillColor={`${colors.primary}05`}
        startOpacity={0.4}
        endOpacity={0.1}
        noOfSections={4}
        maxValue={Math.max(...chartData.map(d => d.value), 5)}
        yAxisTextStyle={styles.axisText}
        xAxisLabelTextStyle={styles.axisText}
        xAxisColor={colors.border}
        yAxisColor={colors.border}
        dataPointsColor={colors.primary}
        dataPointsRadius={4}
        showValuesAsDataPointsText={false}
        focusEnabled
        showStripOnFocus
        stripColor={`${colors.primary}30`}
        stripWidth={1}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  emptyContainer: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  axisText: {
    fontSize: 10,
    color: colors.textSecondary,
  },
});
