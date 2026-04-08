import React, { useState, useEffect } from 'react';
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
  Image as ImageIcon
} from '@phosphor-icons/react';
import api from '../../lib/api';

const ManageSalon = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (salon) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleAddImage = () => {
    const url = prompt('Enter image URL:');
    if (url) {
      setFormData({ ...formData, images: [...formData.images, url] });
    }
  };

  const handleRemoveImage = (index) => {
    const newImages = formData.images.filter((_, i) => i !== index);
    setFormData({ ...formData, images: newImages });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-stone-50 p-8">
        <div className="max-w-3xl mx-auto animate-pulse">
          <div className="h-8 bg-stone-200 rounded mb-8 w-48" />
          <div className="bg-white rounded-2xl p-8 space-y-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 bg-stone-200 rounded-xl" />
            ))}
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
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {formData.images.map((url, index) => (
                <div key={index} className="relative aspect-video rounded-xl overflow-hidden group">
                  <img src={url} alt={`Salon ${index + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(index)}
                    className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash size={16} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={handleAddImage}
                className="aspect-video rounded-xl border-2 border-dashed border-stone-300 flex flex-col items-center justify-center text-stone-400 hover:border-orange-800 hover:text-orange-800 transition-colors"
              >
                <Plus size={24} />
                <span className="text-sm mt-1">Add Image</span>
              </button>
            </div>
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
