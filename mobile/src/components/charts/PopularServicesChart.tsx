import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import type { PopularServiceData } from '../../types';
import { spacing } from '../../lib/utils';
import { useTheme, Theme } from '../../theme/ThemeContext';

interface PopularServicesChartProps {
  data: PopularServiceData[];
}

const { width } = Dimensions.get('window');

export const PopularServicesChart: React.FC<PopularServicesChartProps> = ({ data }) => {
  const { theme } = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  
  if (!data || data.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No service data available</Text>
      </View>
    );
  }

  // Show top 5 services
  const topServices = data.slice(0, 5);
  
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
      
      <BarChart
        data={chartData}
        width={width - 80}
        height={180}
        barWidth={30}
        spacing={20}
        initialSpacing={10}
        noOfSections={4}
        maxValue={Math.max(...chartData.map(d => d.value), 5)}
        yAxisTextStyle={styles.axisText}
        xAxisLabelTextStyle={styles.axisText}
        xAxisColor={theme.colors.border}
        yAxisColor={theme.colors.border}
        showVerticalLines
        verticalLinesColor={theme.colors.border}
        showYAxisIndices
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
  barLabel: {
    fontSize: 10,
    color: theme.colors.text,
    fontWeight: '600',
    marginBottom: 4,
  },
});
