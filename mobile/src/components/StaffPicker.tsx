/**
 * StaffPicker Component
 * Horizontal scrollable staff selection with "Any Available" option
 * Optimized with React.memo and useCallback for performance
 */

import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { AvailableStaffMember } from '../types/staff';

interface StaffPickerProps {
  availableStaff: AvailableStaffMember[];
  selectedStaffId: string | null;
  anyStaffSelected: boolean;
  onSelectStaff: (staffId: string | null, isAnyStaff: boolean) => void;
  loading?: boolean;
  basePrice?: number;
}

const StaffPicker: React.FC<StaffPickerProps> = ({
  availableStaff,
  selectedStaffId,
  anyStaffSelected,
  onSelectStaff,
  loading = false,
  basePrice = 0,
}) => {
  // Handle "Any Available" selection
  const handleAnyStaffPress = useCallback(() => {
    onSelectStaff(null, true);
  }, [onSelectStaff]);

  // Handle specific staff selection
  const handleStaffPress = useCallback(
    (staffId: string) => {
      onSelectStaff(staffId, false);
    },
    [onSelectStaff]
  );

  // Calculate price difference for display
  const getPriceDifference = useCallback(
    (customPrice?: number) => {
      if (!customPrice || !basePrice || customPrice === basePrice) {
        return null;
      }

      const difference = customPrice - basePrice;
      const percentage = Math.abs((difference / basePrice) * 100);
      const isPremium = difference > 0;

      return {
        amount: Math.abs(difference),
        percentage: Math.round(percentage),
        isPremium,
        text: isPremium
          ? `+₹${Math.abs(difference)}`
          : `-₹${Math.abs(difference)}`,
        color: isPremium ? '#f59e0b' : '#10b981',
      };
    },
    [basePrice]
  );

  // Format rating for display
  const formatRating = useCallback((rating: number) => {
    return rating.toFixed(1);
  }, []);

  // Render loading state
  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Select Your Stylist</Text>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8b5cf6" />
          <Text style={styles.loadingText}>Loading available staff...</Text>
        </View>
      </View>
    );
  }

  // Render empty state
  if (availableStaff.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Select Your Stylist</Text>
        <View style={styles.emptyContainer}>
          <Ionicons name="people-outline" size={48} color="#9ca3af" />
          <Text style={styles.emptyText}>
            No staff available for this time slot
          </Text>
          <Text style={styles.emptySubtext}>
            Please select a different time
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Select Your Stylist</Text>
      <Text style={styles.subtitle}>
        Choose a specific stylist or let us assign one for you
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        style={styles.scrollView}
      >
        {/* "Any Available" Option */}
        <TouchableOpacity
          style={[
            styles.staffCard,
            anyStaffSelected && styles.staffCardSelected,
          ]}
          onPress={handleAnyStaffPress}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.avatarContainer,
              anyStaffSelected && styles.avatarContainerSelected,
            ]}
          >
            <Ionicons
              name="people"
              size={32}
              color={anyStaffSelected ? '#8b5cf6' : '#6b7280'}
            />
          </View>
          <Text
            style={[
              styles.staffName,
              anyStaffSelected && styles.staffNameSelected,
            ]}
          >
            Any Available
          </Text>
          <Text style={styles.staffSubtext}>We'll assign</Text>
          {anyStaffSelected && (
            <View style={styles.selectedBadge}>
              <Ionicons name="checkmark-circle" size={20} color="#8b5cf6" />
            </View>
          )}
        </TouchableOpacity>

        {/* Staff Members */}
        {availableStaff.map((staff) => {
          const isSelected = selectedStaffId === staff.staff_id;
          const priceDiff = getPriceDifference(staff.custom_price);

          return (
            <TouchableOpacity
              key={staff.staff_id}
              style={[styles.staffCard, isSelected && styles.staffCardSelected]}
              onPress={() => handleStaffPress(staff.staff_id)}
              activeOpacity={0.7}
            >
              {/* Avatar */}
              <View
                style={[
                  styles.avatarContainer,
                  isSelected && styles.avatarContainerSelected,
                ]}
              >
                {staff.staff_image_url ? (
                  <Image
                    source={{ uri: staff.staff_image_url }}
                    style={styles.avatar}
                  />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarInitial}>
                      {staff.staff_name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>

              {/* Name */}
              <Text
                style={[styles.staffName, isSelected && styles.staffNameSelected]}
                numberOfLines={1}
              >
                {staff.staff_name}
              </Text>

              {/* Rating */}
              {staff.total_reviews > 0 && (
                <View style={styles.ratingContainer}>
                  <Ionicons name="star" size={12} color="#fbbf24" />
                  <Text style={styles.ratingText}>
                    {formatRating(staff.average_rating)}
                  </Text>
                  <Text style={styles.reviewCount}>({staff.total_reviews})</Text>
                </View>
              )}

              {/* Price Difference */}
              {priceDiff && (
                <View
                  style={[
                    styles.priceBadge,
                    { backgroundColor: priceDiff.color + '20' },
                  ]}
                >
                  <Text style={[styles.priceText, { color: priceDiff.color }]}>
                    {priceDiff.text}
                  </Text>
                </View>
              )}

              {/* Selected Badge */}
              {isSelected && (
                <View style={styles.selectedBadge}>
                  <Ionicons name="checkmark-circle" size={20} color="#8b5cf6" />
                </View>
              )}

              {/* Premium/Discount Label */}
              {priceDiff && (
                <Text style={styles.priceLabel}>
                  {priceDiff.isPremium ? 'Premium' : 'Discount'}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Info Text */}
      <View style={styles.infoContainer}>
        <Ionicons name="information-circle-outline" size={16} color="#6b7280" />
        <Text style={styles.infoText}>
          {anyStaffSelected
            ? 'We will assign the next available stylist'
            : selectedStaffId
            ? 'You selected a specific stylist'
            : 'Tap to select your preferred stylist'}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
    paddingHorizontal: 16,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  scrollView: {
    marginBottom: 12,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  staffCard: {
    width: 110,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    marginRight: 12,
    position: 'relative',
  },
  staffCardSelected: {
    borderColor: '#8b5cf6',
    backgroundColor: '#f5f3ff',
  },
  avatarContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  avatarContainerSelected: {
    borderColor: '#8b5cf6',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#e0e7ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 24,
    fontWeight: '700',
    color: '#8b5cf6',
  },
  staffName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 2,
  },
  staffNameSelected: {
    color: '#8b5cf6',
  },
  staffSubtext: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 2,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1f2937',
    marginLeft: 2,
  },
  reviewCount: {
    fontSize: 10,
    color: '#9ca3af',
  },
  priceBadge: {
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  priceText: {
    fontSize: 12,
    fontWeight: '700',
  },
  priceLabel: {
    fontSize: 10,
    color: '#6b7280',
    marginTop: 2,
  },
  selectedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 6,
  },
  infoText: {
    fontSize: 12,
    color: '#6b7280',
    flex: 1,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  emptySubtext: {
    marginTop: 4,
    fontSize: 14,
    color: '#9ca3af',
  },
});

// Memoize component to prevent unnecessary re-renders
export default React.memo(StaffPicker);
