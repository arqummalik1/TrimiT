import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
  Storefront, 
  MapPin, 
  Phone, 
  Clock, 
  FloppyDisk,
  Trash,
  Plus,
  Image as ImageIcon,
  Camera,
  X,
  Spinner
} from '@phosphor-icons/react';
import api from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { uploadImage, deleteImage } from '../../lib/supabase';

const ManageSalon = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { setHasSalon } = useAuthStore();
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const { data: salon, isLoading } = useQuery({
    queryKey: ['ownerSalon'],
    queryFn: async () => {
      const response = await api.get('/api/owner/salon');
      return response.data;
    },
  });

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    address: '',
    city: '',
    latitude: 28.6139,
    longitude: 77.2090,
    phone: '',
    opening_time: '09:00',
    closing_time: '21:00',
    images: [],
  });

  useEffect(() => {
    if (salon) {
      setFormData({
        name: salon.name || '',
        description: salon.description || '',
        address: salon.address || '',
        city: salon.city || '',
        latitude: salon.latitude || 28.6139,
        longitude: salon.longitude || 77.2090,
        phone: salon.phone || '',
        opening_time: salon.opening_time || '09:00',
        closing_time: salon.closing_time || '21:00',
        images: salon.images || [],
      });
    }
  }, [salon]);

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/api/salons', data);
      return response.data;
    },
    onSuccess: () => {
      setHasSalon(true);
      queryClient.invalidateQueries(['ownerSalon']);
      navigate('/owner/services');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.patch(`/api/salons/${salon.id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['ownerSalon']);
    },
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const [validationError, setValidationError] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    setValidationError(null);

    // Validate required fields
    if (!formData.name || formData.name.trim() === '') {
      setValidationError('Salon Name is required');
      return;
    }
    if (!formData.address || formData.address.trim() === '') {
      setValidationError('Address is required');
      return;
    }
    if (!formData.city || formData.city.trim() === '') {
      setValidationError('City is required');
      return;
    }
    if (!formData.phone || formData.phone.trim() === '') {
      setValidationError('Phone is required');
      return;
    }

    if (salon) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    setUploading(true);
    setUploadProgress(0);
    
    try {
      const uploadedUrls = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Validate file type
        if (!file.type.startsWith('image/')) {
          alert('Please select only image files (JPEG, PNG, etc.)');
          continue;
        }
        
        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          alert('File size must be less than 5MB');
          continue;
        }
        
        // Upload to Supabase Storage
        const publicUrl = await uploadImage(file, 'salon-images');
        uploadedUrls.push(publicUrl);
        
        setUploadProgress(Math.round(((i + 1) / files.length) * 100));
      }
      
      // Add uploaded URLs to form data
      if (uploadedUrls.length > 0) {
        setFormData(prev => ({ 
          ...prev, 
          images: [...prev.images, ...uploadedUrls] 
        }));
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };
  
  const handleAddImage = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveImage = async (index) => {
    const imageUrl = formData.images[index];
    
    // Try to delete from storage (best effort - don't block UI if fails)
    try {
      await deleteImage(imageUrl, 'salon-images');
    } catch (error) {
      console.error('Failed to delete image from storage:', error);
    }
    
    // Remove from form data
    const newImages = formData.images.filter((_, i) => i !== index);
    setFormData({ ...formData, images: newImages });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-stone-50 p-8">
        <div className="max-w-3xl mx-auto animate-pulse">
          {/* Header shimmer */}
          <div className="h-8 bg-stone-200 rounded mb-2 w-48" />
          <div className="h-4 bg-stone-200 rounded mb-8 w-64" />
          
          {/* Form shimmer */}
          <div className="bg-white rounded-2xl p-8 space-y-6">
            {/* Image upload shimmer */}
            <div className="h-32 bg-stone-200 rounded-xl mb-6" />
            
            {/* Input fields shimmer */}
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i}>
                <div className="h-4 bg-stone-200 rounded w-24 mb-2" />
                <div className="h-12 bg-stone-200 rounded-xl" />
              </div>
            ))}
            
            {/* Submit button shimmer */}
            <div className="h-12 bg-stone-200 rounded-full mt-8" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 pb-12" data-testid="manage-salon">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="font-heading text-3xl font-bold text-stone-900 mb-2">
            {salon ? 'Edit Salon' : 'Create Your Salon'}
          </h1>
          <p className="text-stone-500 mb-8">
            {salon ? 'Update your salon information' : 'Set up your salon profile to start receiving bookings'}
          </p>
        </motion.div>

        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl border border-stone-200 p-6 md:p-8"
        >
          {/* Basic Info */}
          <div className="mb-8">
            <h2 className="font-heading text-lg font-bold text-stone-900 mb-4 flex items-center gap-2">
              <Storefront size={22} weight="duotone" />
              Basic Information
            </h2>
            
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Salon Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  data-testid="salon-name"
                  className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-800/20 focus:border-orange-800"
                  placeholder="e.g., The Style Studio"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  data-testid="salon-description"
                  rows={3}
                  className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-800/20 focus:border-orange-800 resize-none"
                  placeholder="Tell customers about your salon..."
                />
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="mb-8">
            <h2 className="font-heading text-lg font-bold text-stone-900 mb-4 flex items-center gap-2">
              <MapPin size={22} weight="duotone" />
              Location
            </h2>
            
            <div className="grid md:grid-cols-2 gap-5">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Address *
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  data-testid="salon-address"
                  className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-800/20 focus:border-orange-800"
                  placeholder="123 Main Street, Sector 15"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  City *
                </label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  data-testid="salon-city"
                  className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-800/20 focus:border-orange-800"
                  placeholder="New Delhi"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Phone *
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  data-testid="salon-phone"
                  className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-800/20 focus:border-orange-800"
                  placeholder="+91 98765 43210"
                  required
                />
              </div>
            </div>
          </div>

          {/* Timings */}
          <div className="mb-8">
            <h2 className="font-heading text-lg font-bold text-stone-900 mb-4 flex items-center gap-2">
              <Clock size={22} weight="duotone" />
              Business Hours
            </h2>
            
            <div className="grid grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Opening Time
                </label>
                <input
                  type="time"
                  name="opening_time"
                  value={formData.opening_time}
                  onChange={handleChange}
                  data-testid="salon-opening"
                  className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-800/20 focus:border-orange-800"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Closing Time
                </label>
                <input
                  type="time"
                  name="closing_time"
                  value={formData.closing_time}
                  onChange={handleChange}
                  data-testid="salon-closing"
                  className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-800/20 focus:border-orange-800"
                />
              </div>
            </div>
          </div>

          {/* Images */}
          <div className="mb-8">
            <h2 className="font-heading text-lg font-bold text-stone-900 mb-4 flex items-center gap-2">
              <ImageIcon size={22} weight="duotone" />
              Salon Images
            </h2>
            
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              capture="environment"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            {/* Upload Progress */}
            {uploading && (
              <div className="mb-4 p-4 bg-blue-50 rounded-xl">
                <div className="flex items-center gap-2 text-blue-700 mb-2">
                  <Spinner size={20} className="animate-spin" />
                  <span className="font-medium">Uploading images...</span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-sm text-blue-600 mt-1">{uploadProgress}% complete</p>
              </div>
            )}
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {formData.images.map((url, index) => (
                <div key={index} className="relative aspect-video rounded-xl overflow-hidden group bg-stone-100">
                  <img 
                    src={url} 
                    alt={`Salon ${index + 1}`} 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.src = 'https://via.placeholder.com/400x300?text=Image+Error';
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(index)}
                    className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                    title="Remove image"
                  >
                    <X size={16} weight="bold" />
                  </button>
                </div>
              ))}
              
              {/* Add Image Button */}
              <button
                type="button"
                onClick={handleAddImage}
                disabled={uploading}
                className="aspect-video rounded-xl border-2 border-dashed border-stone-300 flex flex-col items-center justify-center text-stone-400 hover:border-orange-800 hover:text-orange-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Camera size={28} />
                <span className="text-sm mt-2 font-medium">Add Photo</span>
                <span className="text-xs text-stone-400 mt-1">Camera or Gallery</span>
              </button>
            </div>
            
            <p className="text-sm text-stone-500 mt-3">
              Upload high-quality images of your salon. First image will be used as the main thumbnail.
              Supported formats: JPEG, PNG. Max size: 5MB per image.
            </p>
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-4">
            <button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
              data-testid="save-salon-btn"
              className="btn-primary flex items-center gap-2"
            >
              {(createMutation.isPending || updateMutation.isPending) ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <FloppyDisk size={20} />
                  {salon ? 'Save Changes' : 'Create Salon'}
                </>
              )}
            </button>
          </div>

          {validationError && (
            <p className="mt-4 text-sm text-red-600 text-center font-medium">
              {validationError}
            </p>
          )}

          {(createMutation.isError || updateMutation.isError) && (
            <p className="mt-4 text-sm text-red-600 text-center">
              {createMutation.error?.response?.data?.detail || 
               updateMutation.error?.response?.data?.detail || 
               'Failed to save salon'}
            </p>
          )}

          {updateMutation.isSuccess && (
            <p className="mt-4 text-sm text-green-600 text-center">
              Salon updated successfully!
            </p>
          )}
        </motion.form>
      </div>
    </div>
  );
};

export default ManageSalon;
