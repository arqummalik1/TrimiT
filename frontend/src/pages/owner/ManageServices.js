import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
  Plus, 
  Pencil, 
  Trash, 
  Timer, 
  CurrencyInr,
  Scissors,
  FloppyDisk,
  X
} from '@phosphor-icons/react';
import api from '../../lib/api';
import { formatPrice } from '../../lib/utils';

const ManageServices = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    duration: 30,
  });

  const { data: salon, isLoading } = useQuery({
    queryKey: ['ownerSalon'],
    queryFn: async () => {
      const response = await api.get('/api/owner/salon');
      return response.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.post(`/api/salons/${salon.id}/services`, {
        ...data,
        price: parseFloat(data.price),
        duration: parseInt(data.duration),
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['ownerSalon']);
      closeModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await api.patch(`/api/services/${id}`, {
        ...data,
        price: parseFloat(data.price),
        duration: parseInt(data.duration),
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['ownerSalon']);
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/api/services/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['ownerSalon']);
    },
  });

  const openModal = (service = null) => {
    if (service) {
      setEditingService(service);
      setFormData({
        name: service.name,
        description: service.description || '',
        price: service.price.toString(),
        duration: service.duration,
        // Offer fields
        is_on_offer: service.is_on_offer || false,
        discount_percentage: service.discount_percentage || '',
        offer_end_date: service.offer_end_date || '',
        offer_tagline: service.offer_tagline || "Grab it before it's gone!",
      });
    } else {
      setEditingService(null);
      setFormData({ 
        name: '', 
        description: '', 
        price: '', 
        duration: 30,
        is_on_offer: false,
        discount_percentage: '',
        offer_end_date: '',
        offer_tagline: "Grab it before it's gone!"
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingService(null);
    setFormData({ 
      name: '', 
      description: '', 
      price: '', 
      duration: 30,
      is_on_offer: false,
      discount_percentage: '',
      offer_end_date: '',
      offer_tagline: "Grab it before it's gone!"
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingService) {
      updateMutation.mutate({ id: editingService.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this service?')) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-stone-50 p-8">
        <div className="max-w-4xl mx-auto animate-pulse">
          {/* Header shimmer */}
          <div className="h-8 bg-stone-200 rounded mb-2 w-40" />
          <div className="h-4 bg-stone-200 rounded mb-8 w-64" />
          
          {/* Add button shimmer */}
          <div className="flex justify-end mb-6">
            <div className="h-10 bg-stone-200 rounded-full w-32" />
          </div>
          
          {/* Services shimmer */}
          <div className="grid gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-stone-200 p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="h-5 bg-stone-200 rounded w-40" />
                  <div className="h-5 bg-stone-200 rounded w-20" />
                </div>
                <div className="h-4 bg-stone-200 rounded w-full mb-4" />
                <div className="flex justify-between">
                  <div className="h-6 bg-stone-200 rounded w-24" />
                  <div className="flex gap-2">
                    <div className="h-8 bg-stone-200 rounded w-20" />
                    <div className="h-8 bg-stone-200 rounded w-20" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!salon) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-8">
        <div className="text-center">
          <Scissors size={64} weight="duotone" className="mx-auto text-stone-300 mb-4" />
          <h2 className="font-heading text-2xl font-bold text-stone-700 mb-2">
            Create Your Salon First
          </h2>
          <p className="text-stone-500 mb-6">
            You need to create a salon before adding services.
          </p>
          <Link to="/owner/salon" className="btn-primary">
            Create Salon
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 pb-12" data-testid="manage-services">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div>
            <h1 className="font-heading text-3xl font-bold text-stone-900 mb-2">
              Services
            </h1>
            <p className="text-stone-500">
              Manage services for {salon.name}
            </p>
          </div>
          <button
            onClick={() => openModal()}
            data-testid="add-service-btn"
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={20} />
            Add Service
          </button>
        </motion.div>

        {salon.services?.length > 0 ? (
          <div className="space-y-4">
            {salon.services.map((service, index) => (
              <motion.div
                key={service.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`rounded-2xl p-5 transition-all duration-300 ${
                  service.is_on_offer 
                    ? 'bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-300 shadow-lg hover:shadow-xl' 
                    : 'bg-white border border-stone-200 hover:shadow-lg'
                }`}
                data-testid={`service-${service.id}`}
              >
                {/* Offer Badge */}
                {service.is_on_offer && service.discount_percentage && (
                  <div className="flex items-center justify-between mb-3">
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-orange-600 to-red-600 text-white text-xs font-bold rounded-full">
                      🔥 {service.discount_percentage}% OFF
                    </span>
                    {service.offer_end_date && (
                      <span className="text-xs text-orange-700 font-medium">
                        Ends {new Date(service.offer_end_date).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                )}
                
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-heading text-lg font-bold text-stone-900 mb-1">
                      {service.name}
                    </h3>
                    {service.description && (
                      <p className="text-sm text-stone-500 mb-3">
                        {service.description}
                      </p>
                    )}
                    
                    {/* Offer Tagline */}
                    {service.is_on_offer && service.offer_tagline && (
                      <p className="text-xs text-orange-700 italic mb-3">
                        🏷 {service.offer_tagline}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-6 text-sm">
                      <span className="flex items-center gap-1.5 text-stone-600">
                        <Timer size={18} weight="bold" />
                        {service.duration} mins
                      </span>
                      
                      {/* Price Display with Offer */}
                      <span className="flex items-center gap-2">
                        {service.is_on_offer && service.original_price ? (
                          <>
                            <span className="text-stone-400 line-through text-sm">
                              {formatPrice(service.original_price)}
                            </span>
                            <span className="font-bold text-orange-800 text-lg">
                              {formatPrice(service.price)}
                            </span>
                          </>
                        ) : (
                          <span className="font-semibold text-orange-800">
                            {formatPrice(service.price)}
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openModal(service)}
                      data-testid={`edit-service-${service.id}`}
                      className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
                    >
                      <Pencil size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(service.id)}
                      data-testid={`delete-service-${service.id}`}
                      className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash size={18} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-stone-200 p-12 text-center"
          >
            <Scissors size={64} weight="duotone" className="mx-auto text-stone-300 mb-4" />
            <h3 className="font-heading text-xl font-bold text-stone-700 mb-2">
              No Services Yet
            </h3>
            <p className="text-stone-500 mb-6">
              Add your first service to start accepting bookings
            </p>
            <button
              onClick={() => openModal()}
              className="btn-primary inline-flex items-center gap-2"
            >
              <Plus size={20} />
              Add Service
            </button>
          </motion.div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
          >
            <div className="flex items-center justify-between p-6 border-b border-stone-200">
              <h2 className="font-heading text-xl font-bold text-stone-900">
                {editingService ? 'Edit Service' : 'Add Service'}
              </h2>
              <button
                onClick={closeModal}
                className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Service Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  data-testid="service-name-input"
                  className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-800/20 focus:border-orange-800"
                  placeholder="e.g., Men's Haircut"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  data-testid="service-description-input"
                  rows={2}
                  className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-800/20 focus:border-orange-800 resize-none"
                  placeholder="Describe the service..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">
                    Price (₹) *
                  </label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    data-testid="service-price-input"
                    className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-800/20 focus:border-orange-800"
                    placeholder="500"
                    min="0"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">
                    Duration (mins) *
                  </label>
                  <select
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    data-testid="service-duration-input"
                    className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-800/20 focus:border-orange-800"
                  >
                    <option value="15">15 mins</option>
                    <option value="30">30 mins</option>
                    <option value="45">45 mins</option>
                    <option value="60">1 hour</option>
                    <option value="90">1.5 hours</option>
                    <option value="120">2 hours</option>
                  </select>
                </div>
              </div>

              {/* Offer Section */}
              <div className="border-t border-stone-200 pt-4 mt-4">
                <div className="flex items-center gap-2 mb-4">
                  <input
                    type="checkbox"
                    id="is_on_offer"
                    checked={formData.is_on_offer || false}
                    onChange={(e) => setFormData({ ...formData, is_on_offer: e.target.checked })}
                    className="w-4 h-4 text-orange-800 border-stone-300 rounded focus:ring-orange-800"
                  />
                  <label htmlFor="is_on_offer" className="text-sm font-medium text-stone-700">
                    Enable Special Offer
                  </label>
                </div>

                {formData.is_on_offer && (
                  <div className="space-y-4 bg-orange-50 p-4 rounded-xl border border-orange-100">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-stone-700 mb-2">
                          Discount % *
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            value={formData.discount_percentage || ''}
                            onChange={(e) => setFormData({ ...formData, discount_percentage: parseInt(e.target.value) || 0 })}
                            className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-800/20 focus:border-orange-800"
                            placeholder="20"
                            min="1"
                            max="99"
                            required={formData.is_on_offer}
                          />
                          <span className="absolute right-3 top-3 text-stone-500">%</span>
                        </div>
                        {formData.price && formData.discount_percentage && (
                          <p className="text-xs text-orange-700 mt-1">
                            Final price: ₹{Math.round(formData.price * (1 - (formData.discount_percentage || 0) / 100))}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-stone-700 mb-2">
                          Offer Ends *
                        </label>
                        <input
                          type="date"
                          value={formData.offer_end_date || ''}
                          onChange={(e) => setFormData({ ...formData, offer_end_date: e.target.value })}
                          className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-800/20 focus:border-orange-800"
                          min={new Date().toISOString().split('T')[0]}
                          required={formData.is_on_offer}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-2">
                        Offer Tagline
                      </label>
                      <select
                        value={formData.offer_tagline || "Grab it before it's gone!"}
                        onChange={(e) => setFormData({ ...formData, offer_tagline: e.target.value })}
                        className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-800/20 focus:border-orange-800"
                      >
                        <option value="Grab it before it's gone!">Grab it before it's gone!</option>
                        <option value="Limited Time Offer!">Limited Time Offer!</option>
                        <option value="Flash Sale!">Flash Sale!</option>
                        <option value="Today Only!">Today Only!</option>
                        <option value="Special Deal!">Special Deal!</option>
                        <option value="Hot Deal!">Hot Deal!</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-6 py-3 border border-stone-200 rounded-full font-semibold text-stone-700 hover:bg-stone-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="save-service-btn"
                  className="flex-1 btn-primary flex items-center justify-center gap-2"
                >
                  {(createMutation.isPending || updateMutation.isPending) ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <FloppyDisk size={20} />
                      Save
                    </>
                  )}
                </button>
              </div>

              {(createMutation.isError || updateMutation.isError) && (
                <p className="text-sm text-red-600 text-center">
                  {createMutation.error?.response?.data?.detail || 
                   updateMutation.error?.response?.data?.detail || 
                   'Failed to save service'}
                </p>
              )}
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default ManageServices;
