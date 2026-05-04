/**
 * StaffFormModal Component
 * Modal for creating and editing staff members
 * Production-grade with comprehensive validation
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import type { StaffWithServices, StaffCreateInput, StaffUpdateInput } from '../types/staff';
import { DEFAULT_WORKING_HOURS } from '../types/staff';
import WorkingHoursEditor from './WorkingHoursEditor';

interface StaffFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  staff: StaffWithServices | null; // null for create, staff object for edit
  salonId: string;
}

const StaffFormModal: React.FC<StaffFormModalProps> = ({
  visible,
  onClose,
  onSuccess,
  staff,
  salonId,
}) => {
  const isEditMode = !!staff;

  // Form state
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [workingHours, setWorkingHours] = useState(DEFAULT_WORKING_HOURS);
  const [daysOff, setDaysOff] = useState<string[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [showWorkingHours, setShowWorkingHours] = useState(false);

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load staff data when editing
  useEffect(() => {
    if (staff) {
      setName(staff.name);
      setBio(staff.bio || '');
      setPhone(staff.phone || '');
      setEmail(staff.email || '');
      setWorkingHours(staff.working_hours);
      setDaysOff(staff.days_off);
      setSelectedServices(staff.services.map(s => s.id));
    } else {
      // Reset form for create mode
      setName('');
      setBio('');
      setPhone('');
      setEmail('');
      setWorkingHours(DEFAULT_WORKING_HOURS);
      setDaysOff([]);
      setSelectedServices([]);
    }
    setErrors({});
  }, [staff, visible]);

  // Fetch salon services
  const { data: services } = useQuery({
    queryKey: ['salonServices', salonId],
    queryFn: async () => {
      const response = await api.get(`/api/salons/${salonId}`);
      return response.data.services || [];
    },
    enabled: visible && !!salonId,
  });

  // Create staff mutation
  const createMutation = useMutation({
    mutationFn: async (data: StaffCreateInput) => {
      const response = await api.post('/api/v1/staff', data);
      return response.data;
    },
    onSuccess: async (newStaff) => {
      // Assign services
      if (selectedServices.length > 0) {
        try {
          await api.post('/api/v1/staff/services/assign-bulk', {
            staff_id: newStaff.id,
            service_ids: selectedServices,
          });
        } catch (error) {
          console.error('Failed to assign services:', error);
        }
      }
      Alert.alert('Success', 'Staff member created successfully');
      onSuccess();
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to create staff');
    },
  });

  // Update staff mutation
  const updateMutation = useMutation({
    mutationFn: async (data: { id: string; updates: StaffUpdateInput }) => {
      const response = await api.patch(`/api/v1/staff/${data.id}`, data.updates);
      return response.data;
    },
    onSuccess: () => {
      Alert.alert('Success', 'Staff member updated successfully');
      onSuccess();
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to update staff');
    },
  });

  // Validate form
  const validate = useCallback(() => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'Name is required';
    } else if (name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    if (phone && !/^\+?[0-9]{10,15}$/.test(phone)) {
      newErrors.phone = 'Invalid phone number';
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Invalid email address';
    }

    if (selectedServices.length === 0) {
      newErrors.services = 'Please select at least one service';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [name, phone, email, selectedServices]);

  // Handle submit
  const handleSubmit = useCallback(() => {
    if (!validate()) {
      return;
    }

    if (isEditMode && staff) {
      // Update existing staff
      const updates: StaffUpdateInput = {
        name: name.trim(),
        bio: bio.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        working_hours: workingHours,
        days_off: daysOff,
      };

      updateMutation.mutate({ id: staff.id, updates });
    } else {
      // Create new staff
      const data: StaffCreateInput = {
        salon_id: salonId,
        name: name.trim(),
        bio: bio.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        working_hours: workingHours,
        days_off: daysOff,
        is_active: true,
      };

      createMutation.mutate(data);
    }
  }, [
    validate,
    isEditMode,
    staff,
    name,
    bio,
    phone,
    email,
    workingHours,
    daysOff,
    salonId,
    selectedServices,
    createMutation,
    updateMutation,
  ]);

  // Toggle service selection
  const toggleService = useCallback((serviceId: string) => {
    setSelectedServices(prev =>
      prev.includes(serviceId)
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    );
  }, []);

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              {isEditMode ? 'Edit Staff Member' : 'Add Staff Member'}
            </Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={28} color="#1f2937" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Name */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>
                Name <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, errors.name && styles.inputError]}
                value={name}
                onChangeText={setName}
                placeholder="Enter staff name"
                placeholderTextColor="#9ca3af"
                editable={!isLoading}
              />
              {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
            </View>

            {/* Bio */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Bio</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={bio}
                onChangeText={setBio}
                placeholder="Tell customers about this staff member..."
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                editable={!isLoading}
              />
            </View>

            {/* Phone */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Phone</Text>
              <TextInput
                style={[styles.input, errors.phone && styles.inputError]}
                value={phone}
                onChangeText={setPhone}
                placeholder="+919876543210"
                placeholderTextColor="#9ca3af"
                keyboardType="phone-pad"
                editable={!isLoading}
              />
              {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
            </View>

            {/* Email */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={[styles.input, errors.email && styles.inputError]}
                value={email}
                onChangeText={setEmail}
                placeholder="staff@example.com"
                placeholderTextColor="#9ca3af"
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!isLoading}
              />
              {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
            </View>

            {/* Services */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>
                Services <Text style={styles.required}>*</Text>
              </Text>
              <Text style={styles.helperText}>
                Select services this staff member can perform
              </Text>
              {services && services.length > 0 ? (
                <View style={styles.servicesGrid}>
                  {services.map((service: any) => (
                    <TouchableOpacity
                      key={service.id}
                      style={[
                        styles.serviceChip,
                        selectedServices.includes(service.id) && styles.serviceChipSelected,
                      ]}
                      onPress={() => toggleService(service.id)}
                      disabled={isLoading}
                    >
                      <Text
                        style={[
                          styles.serviceChipText,
                          selectedServices.includes(service.id) && styles.serviceChipTextSelected,
                        ]}
                      >
                        {service.name}
                      </Text>
                      {selectedServices.includes(service.id) && (
                        <Ionicons name="checkmark-circle" size={16} color="#8b5cf6" />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <Text style={styles.noServicesText}>No services available</Text>
              )}
              {errors.services && <Text style={styles.errorText}>{errors.services}</Text>}
            </View>

            {/* Working Hours */}
            <View style={styles.formGroup}>
              <TouchableOpacity
                style={styles.expandButton}
                onPress={() => setShowWorkingHours(!showWorkingHours)}
              >
                <View style={styles.expandHeader}>
                  <Ionicons name="time-outline" size={20} color="#8b5cf6" />
                  <Text style={styles.expandTitle}>Working Hours</Text>
                </View>
                <Ionicons
                  name={showWorkingHours ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color="#6b7280"
                />
              </TouchableOpacity>
              {showWorkingHours && (
                <WorkingHoursEditor
                  workingHours={workingHours}
                  onChange={setWorkingHours}
                  disabled={isLoading}
                />
              )}
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
              disabled={isLoading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark" size={20} color="#fff" />
                  <Text style={styles.submitButtonText}>
                    {isEditMode ? 'Update' : 'Create'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
  },
  closeButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  required: {
    color: '#ef4444',
  },
  helperText: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1f2937',
  },
  inputError: {
    borderColor: '#ef4444',
  },
  textArea: {
    height: 100,
    paddingTop: 12,
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 4,
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  serviceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  serviceChipSelected: {
    backgroundColor: '#f5f3ff',
    borderColor: '#8b5cf6',
  },
  serviceChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#4b5563',
  },
  serviceChipTextSelected: {
    color: '#8b5cf6',
  },
  noServicesText: {
    fontSize: 14,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  expandButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  expandHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  expandTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4b5563',
  },
  submitButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#8b5cf6',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});

export default React.memo(StaffFormModal);
