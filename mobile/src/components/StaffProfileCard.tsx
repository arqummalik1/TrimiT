/**
 * StaffProfileCard Component
 * Detailed staff profile modal with bio, ratings, and services
 * Optimized with React.memo for performance
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { StaffWithServices } from '../types/staff';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface StaffProfileCardProps {
  staff: StaffWithServices | null;
  visible: boolean;
  onClose: () => void;
  onSelect?: () => void;
  showSelectButton?: boolean;
}

const StaffProfileCard: React.FC<StaffProfileCardProps> = ({
  staff,
  visible,
  onClose,
  onSelect,
  showSelectButton = true,
}) => {
  const handleSelect = useCallback(() => {
    onSelect?.();
    onClose();
  }, [onSelect, onClose]);

  const formatRating = useCallback((rating: number) => {
    return rating.toFixed(1);
  }, []);

  const getDayName = useCallback((day: string) => {
    return day.charAt(0).toUpperCase() + day.slice(1);
  }, []);

  if (!staff) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={28} color="#1f2937" />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Profile Section */}
            <View style={styles.profileSection}>
              {/* Avatar */}
              <View style={styles.avatarContainer}>
                {staff.image_url ? (
                  <Image
                    source={{ uri: staff.image_url }}
                    style={styles.avatar}
                  />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarInitial}>
                      {staff.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>

              {/* Name */}
              <Text style={styles.name}>{staff.name}</Text>

              {/* Rating */}
              {staff.total_reviews > 0 && (
                <View style={styles.ratingContainer}>
                  <View style={styles.ratingBadge}>
                    <Ionicons name="star" size={16} color="#fbbf24" />
                    <Text style={styles.ratingText}>
                      {formatRating(staff.average_rating)}
                    </Text>
                  </View>
                  <Text style={styles.reviewCount}>
                    {staff.total_reviews} review{staff.total_reviews !== 1 ? 's' : ''}
                  </Text>
                </View>
              )}

              {/* Stats */}
              <View style={styles.statsContainer}>
                <View style={styles.statItem}>
                  <Ionicons name="cut-outline" size={20} color="#8b5cf6" />
                  <Text style={styles.statValue}>{staff.total_bookings}</Text>
                  <Text style={styles.statLabel}>Bookings</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Ionicons name="briefcase-outline" size={20} color="#8b5cf6" />
                  <Text style={styles.statValue}>{staff.services.length}</Text>
                  <Text style={styles.statLabel}>Services</Text>
                </View>
              </View>
            </View>

            {/* Bio Section */}
            {staff.bio && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="person-outline" size={20} color="#8b5cf6" />
                  <Text style={styles.sectionTitle}>About</Text>
                </View>
                <Text style={styles.bioText}>{staff.bio}</Text>
              </View>
            )}

            {/* Services Section */}
            {staff.services.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="list-outline" size={20} color="#8b5cf6" />
                  <Text style={styles.sectionTitle}>Services</Text>
                </View>
                {staff.services.map((service, index) => (
                  <View key={service.id} style={styles.serviceItem}>
                    <View style={styles.serviceInfo}>
                      <Text style={styles.serviceName}>{service.name}</Text>
                      <Text style={styles.serviceDuration}>
                        {service.custom_duration || service.duration} min
                      </Text>
                    </View>
                    <Text style={styles.servicePrice}>
                      ₹{service.custom_price || service.price}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Working Hours Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="time-outline" size={20} color="#8b5cf6" />
                <Text style={styles.sectionTitle}>Working Hours</Text>
              </View>
              {Object.entries(staff.working_hours).map(([day, hours]) => (
                <View key={day} style={styles.workingHourItem}>
                  <Text style={styles.dayName}>{getDayName(day)}</Text>
                  {hours.enabled ? (
                    <Text style={styles.hoursText}>
                      {hours.start} - {hours.end}
                    </Text>
                  ) : (
                    <Text style={styles.hoursTextOff}>Off</Text>
                  )}
                </View>
              ))}
            </View>

            {/* Contact Section */}
            {(staff.phone || staff.email) && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="call-outline" size={20} color="#8b5cf6" />
                  <Text style={styles.sectionTitle}>Contact</Text>
                </View>
                {staff.phone && (
                  <View style={styles.contactItem}>
                    <Ionicons name="call" size={16} color="#6b7280" />
                    <Text style={styles.contactText}>{staff.phone}</Text>
                  </View>
                )}
                {staff.email && (
                  <View style={styles.contactItem}>
                    <Ionicons name="mail" size={16} color="#6b7280" />
                    <Text style={styles.contactText}>{staff.email}</Text>
                  </View>
                )}
              </View>
            )}
          </ScrollView>

          {/* Select Button */}
          {showSelectButton && onSelect && (
            <View style={styles.footer}>
              <TouchableOpacity
                style={styles.selectButton}
                onPress={handleSelect}
                activeOpacity={0.8}
              >
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.selectButtonText}>Select This Stylist</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  closeButton: {
    padding: 4,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#8b5cf6',
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#e0e7ff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#8b5cf6',
  },
  avatarInitial: {
    fontSize: 40,
    fontWeight: '700',
    color: '#8b5cf6',
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#92400e',
  },
  reviewCount: {
    fontSize: 14,
    color: '#6b7280',
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  statItem: {
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#e5e7eb',
  },
  section: {
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },
  bioText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#4b5563',
  },
  serviceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  serviceDuration: {
    fontSize: 13,
    color: '#6b7280',
  },
  servicePrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#8b5cf6',
  },
  workingHourItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  dayName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1f2937',
    width: 100,
  },
  hoursText: {
    fontSize: 15,
    color: '#4b5563',
  },
  hoursTextOff: {
    fontSize: 15,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  contactText: {
    fontSize: 15,
    color: '#4b5563',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8b5cf6',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  selectButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});

export default React.memo(StaffProfileCard);
