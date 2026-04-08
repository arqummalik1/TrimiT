import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Salon } from '../types';
import { colors, formatPrice } from '../lib/utils';

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
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  imageContainer: {
    position: 'relative',
    height: 160,
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
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  distanceText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  name: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginRight: 8,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#065F46',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 4,
  },
  locationText: {
    flex: 1,
    fontSize: 14,
    color: colors.textSecondary,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  priceText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
});

export default SalonCard;
