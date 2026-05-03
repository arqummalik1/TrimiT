import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import type { TrendData } from '../../types';
import { spacing } from '../../lib/utils';
import { useTheme, Theme } from '../../theme/ThemeContext';

interface BookingsTrendChartProps {
  data: TrendData[];
}

const { width } = Dimensions.get('window');

export const BookingsTrendChart: React.FC<BookingsTrendChartProps> = ({ data }) => {
  const { theme } = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  
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
      />
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
