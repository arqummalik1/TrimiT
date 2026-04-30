import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Salon } from '../types';
import { colors, fonts, borderRadius, spacing, formatPrice } from '../lib/utils';


interface SalonCardProps {
  salon: Salon;
  onPress: () => void;
}

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1626383137804-ff908d2753a2?w=400';

export const SalonCard: React.FC<SalonCardProps> = ({ salon, onPress }) => {
  const lowestPrice = salon.services?.length
    ? Math.min(...salon.services.map((s) => s.price))
    : null;

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.9}>
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: salon.images?.[0] || DEFAULT_IMAGE }}
          style={styles.image}
          resizeMode="cover"
        />
        {salon.distance !== undefined && (
          <View style={styles.distanceBadge}>
            <Ionicons name="navigate" size={12} color={colors.text} />
            <Text style={styles.distanceText}>{salon.distance} km</Text>
          </View>
        )}
      </View>

      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.name} numberOfLines={1}>
            {salon.name}
          </Text>
          {(salon.avg_rating ?? 0) > 0 && (
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={12} color="#065F46" />
              <Text style={styles.ratingText}>{salon.avg_rating}</Text>
            </View>
          )}
        </View>

        <View style={styles.locationRow}>
          <Ionicons name="location" size={14} color={colors.textSecondary} />
          <Text style={styles.locationText} numberOfLines={1}>
            {salon.address}, {salon.city}
          </Text>
        </View>

        <View style={styles.footer}>
          <View style={styles.timeRow}>
            <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
            <Text style={styles.timeText}>
              {salon.opening_time} - {salon.closing_time}
            </Text>
          </View>
          {lowestPrice && (
            <Text style={styles.priceText}>From {formatPrice(lowestPrice)}</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  imageContainer: {
    position: 'relative',
    height: 180,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  distanceBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(18, 20, 17, 0.8)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.pill,
    gap: 4,
  },
  distanceText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    color: colors.primary,
    letterSpacing: 0.5,
  },
  content: {
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  name: {
    flex: 1,
    fontFamily: fonts.heading,
    fontSize: 22,
    color: colors.text,
    marginRight: 8,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warningLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    gap: 4,
  },
  ratingText: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.primary,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: 4,
  },
  locationText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textSecondary,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textTertiary,
  },
  priceText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: colors.primary,
  },
});

export default SalonCard;
