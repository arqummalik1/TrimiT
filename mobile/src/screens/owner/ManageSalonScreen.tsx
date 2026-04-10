import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import MapView, { Marker, MapPressEvent } from 'react-native-maps';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';
import api from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { showToast } from '../../store/toastStore';
import { Salon } from '../../types';

interface ManageSalonScreenProps {
  navigation: any;
}

export default function ManageSalonScreen({ navigation }: ManageSalonScreenProps) {
  const queryClient = useQueryClient();

  const { data: salon, isLoading } = useQuery<Salon | null>({
    queryKey: ['ownerSalon'],
    queryFn: async () => {
      const response = await api.get('/api/owner/salon');
      return response.data;
    },
  });

  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    address: '',
    city: '',
    latitude: '28.6139',
    longitude: '77.2090',
    phone: '',
    opening_time: '09:00',
    closing_time: '21:00',
    images: [] as string[],
  });

  useEffect(() => {
    if (salon) {
      setFormData({
        name: salon.name || '',
        description: salon.description || '',
        address: salon.address || '',
        city: salon.city || '',
        latitude: String(salon.latitude || 28.6139),
        longitude: String(salon.longitude || 77.2090),
        phone: salon.phone || '',
        opening_time: salon.opening_time || '09:00',
        closing_time: salon.closing_time || '21:00',
        images: salon.images || [],
      });
    }
  }, [salon]);

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post('/api/salons', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ownerSalon'] });
      showToast('Salon created successfully!', 'success');
      navigation.goBack();
    },
    onError: (error: any) => {
      showToast(error.response?.data?.detail || 'Failed to create salon', 'error');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.patch(`/api/salons/${salon!.id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ownerSalon'] });
      showToast('Salon updated successfully!', 'success');
    },
    onError: (error: any) => {
      showToast(error.response?.data?.detail || 'Failed to update salon', 'error');
    },
  });

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.address || !formData.city || !formData.phone) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    const payload = {
      ...formData,
      latitude: parseFloat(formData.latitude),
      longitude: parseFloat(formData.longitude),
    };

    if (salon) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  };

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission Required', 'Please allow access to your photo library.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsMultipleSelection: false,
    });

    if (!result.canceled && result.assets[0]) {
      await uploadImage(result.assets[0].uri);
    }
  };

  const uploadImage = async (uri: string) => {
    setUploading(true);
    try {
      const fileName = `salon-${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
      const response = await fetch(uri);
      const blob = await response.blob();

      const { data, error } = await supabase.storage
        .from('salon-images')
        .upload(fileName, blob, { contentType: 'image/jpeg' });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('salon-images')
        .getPublicUrl(data.path);

      setFormData((prev) => ({
        ...prev,
        images: [...prev.images, urlData.publicUrl],
      }));
      showToast('Image uploaded!', 'success');
    } catch (error: any) {
      showToast('Failed to upload image', 'error');
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>
            {salon ? 'Edit Salon' : 'Create Salon'}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Form */}
        <View style={[styles.card, shadows.sm]}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          <Input
            label="Salon Name *"
            value={formData.name}
            onChangeText={(v) => handleChange('name', v)}
            placeholder="Enter salon name"
            icon={<Ionicons name="storefront-outline" size={20} color={colors.textSecondary} />}
          />
          <Input
            label="Description"
            value={formData.description}
            onChangeText={(v) => handleChange('description', v)}
            placeholder="Describe your salon"
          />
          <Input
            label="Phone *"
            value={formData.phone}
            onChangeText={(v) => handleChange('phone', v)}
            placeholder="+91 98765 43210"
            keyboardType="phone-pad"
            icon={<Ionicons name="call-outline" size={20} color={colors.textSecondary} />}
          />
        </View>

        <View style={[styles.card, shadows.sm]}>
          <Text style={styles.sectionTitle}>Location</Text>
          <Input
            label="Address *"
            value={formData.address}
            onChangeText={(v) => handleChange('address', v)}
            placeholder="Street address"
            icon={<Ionicons name="location-outline" size={20} color={colors.textSecondary} />}
          />
          <Input
            label="City *"
            value={formData.city}
            onChangeText={(v) => handleChange('city', v)}
            placeholder="City name"
          />
          <Text style={styles.mapLabel}>Tap the map to set your salon location</Text>
          <View style={styles.mapContainer}>
            <MapView
              style={styles.locationMap}
              initialRegion={{
                latitude: parseFloat(formData.latitude) || 28.6139,
                longitude: parseFloat(formData.longitude) || 77.209,
                latitudeDelta: 0.02,
                longitudeDelta: 0.02,
              }}
              onPress={(e: MapPressEvent) => {
                const { latitude, longitude } = e.nativeEvent.coordinate;
                setFormData((prev) => ({
                  ...prev,
                  latitude: latitude.toFixed(6),
                  longitude: longitude.toFixed(6),
                }));
              }}
            >
              <Marker
                coordinate={{
                  latitude: parseFloat(formData.latitude) || 28.6139,
                  longitude: parseFloat(formData.longitude) || 77.209,
                }}
                pinColor={colors.primary}
              />
            </MapView>
          </View>
          <Text style={styles.coordText}>
            {parseFloat(formData.latitude).toFixed(4)}, {parseFloat(formData.longitude).toFixed(4)}
          </Text>
        </View>

        <View style={[styles.card, shadows.sm]}>
          <Text style={styles.sectionTitle}>Working Hours</Text>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Input
                label="Opening Time"
                value={formData.opening_time}
                onChangeText={(v) => handleChange('opening_time', v)}
                placeholder="09:00"
                icon={<Ionicons name="time-outline" size={20} color={colors.textSecondary} />}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Input
                label="Closing Time"
                value={formData.closing_time}
                onChangeText={(v) => handleChange('closing_time', v)}
                placeholder="21:00"
                icon={<Ionicons name="time-outline" size={20} color={colors.textSecondary} />}
              />
            </View>
          </View>
        </View>

        {/* Images */}
        <View style={[styles.card, shadows.sm]}>
          <Text style={styles.sectionTitle}>Salon Images</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageRow}>
            {formData.images.map((uri, index) => (
              <View key={index} style={styles.imageWrapper}>
                <Image source={{ uri }} style={styles.imageThumb} />
                <TouchableOpacity
                  style={styles.removeImageBtn}
                  onPress={() => removeImage(index)}
                >
                  <Ionicons name="close-circle" size={24} color={colors.error} />
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity style={styles.addImageBtn} onPress={pickImage} disabled={uploading}>
              {uploading ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <>
                  <Ionicons name="camera" size={28} color={colors.primary} />
                  <Text style={styles.addImageText}>Add Photo</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>

        <Button
          title={salon ? 'Save Changes' : 'Create Salon'}
          onPress={handleSubmit}
          loading={isSaving}
          style={{ marginTop: spacing.lg, marginBottom: spacing.xxxxl }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.lg,
  },
  backButton: {
    padding: spacing.sm,
  },
  title: {
    ...typography.h3,
    color: colors.text,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  mapLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  mapContainer: {
    height: 180,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  locationMap: {
    flex: 1,
  },
  coordText: {
    ...typography.caption,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  imageRow: {
    flexDirection: 'row',
  },
  imageWrapper: {
    marginRight: spacing.md,
    position: 'relative',
  },
  imageThumb: {
    width: 100,
    height: 100,
    borderRadius: borderRadius.md,
  },
  removeImageBtn: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: colors.surface,
    borderRadius: 12,
  },
  addImageBtn: {
    width: 100,
    height: 100,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  addImageText: {
    ...typography.caption,
    color: colors.primary,
  },
});
