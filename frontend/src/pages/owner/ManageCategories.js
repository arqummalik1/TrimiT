import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Plus, Pencil, Trash, ArrowLeft, X, FloppyDisk } from '@phosphor-icons/react';
import serviceCategoryService from '../../services/serviceCategoryService';
import { getApiErrorMessage } from '../../lib/utils';

const ManageCategories = () => {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [name, setName] = useState('');

  const { data: categories = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['ownerCategories'],
    queryFn: () => serviceCategoryService.list(),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['ownerCategories'] });
    queryClient.invalidateQueries({ queryKey: ['ownerSalon'] });
  };

  const createMutation = useMutation({
    mutationFn: (categoryName) => serviceCategoryService.create({ name: categoryName }),
    onSuccess: () => {
      invalidate();
      closeModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, categoryName }) => serviceCategoryService.update(id, { name: categoryName }),
    onSuccess: () => {
      invalidate();
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => serviceCategoryService.delete(id),
    onSuccess: invalidate,
  });

  const quickStartMutation = useMutation({
    mutationFn: () => serviceCategoryService.quickStart(),
    onSuccess: invalidate,
  });

  const openCreate = () => {
    setEditing(null);
    setName('');
    setModalOpen(true);
  };

  const openEdit = (cat) => {
    setEditing(cat);
    setName(cat.name);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    setName('');
  };

  const handleSave = (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    if (editing) {
      updateMutation.mutate({ id: editing.id, categoryName: trimmed });
    } else {
      createMutation.mutate(trimmed);
    }
  };

  const handleDelete = (cat) => {
    const count = cat.service_count ?? 0;
    if (count > 0) {
      window.alert('Remove all services from this category before deleting it.');
      return;
    }
    if (window.confirm(`Delete "${cat.name}"?`)) {
      deleteMutation.mutate(cat.id);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 pb-12" data-testid="manage-categories">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Link
            to="/owner/services"
            className="p-2 rounded-lg hover:bg-stone-200 transition-colors"
            data-testid="back-to-services"
          >
            <ArrowLeft size={22} />
          </Link>
          <div className="flex-1">
            <h1 className="font-heading text-3xl font-bold text-stone-900">Categories</h1>
            <p className="text-stone-500 text-sm">Menu sections for your services</p>
          </div>
          <button
            onClick={openCreate}
            data-testid="add-category-btn"
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={20} />
            Add
          </button>
        </div>

        {categories.length === 0 && !isLoading && (
          <div className="mb-6 p-6 rounded-2xl bg-white border border-stone-200">
            <h2 className="font-semibold text-stone-900 mb-2">Quick start</h2>
            <p className="text-sm text-stone-500 mb-4">
              Add Hair, Face, Beard, Spa and more in one tap — like Zomato menu sections.
            </p>
            <button
              onClick={() => quickStartMutation.mutate()}
              disabled={quickStartMutation.isPending}
              data-testid="quick-start-categories"
              className="btn-primary"
            >
              {quickStartMutation.isPending ? 'Adding…' : 'Add preset categories'}
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-stone-200 rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {categories.length === 0 ? (
              <p className="text-center text-stone-500 py-8">
                No categories yet. Create one or use quick start.
              </p>
            ) : (
              categories.map((cat, index) => {
                const locked = (cat.service_count ?? 0) > 0;
                return (
                  <motion.div
                    key={cat.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="flex items-center justify-between bg-white border border-stone-200 rounded-2xl p-5"
                    data-testid={`category-${cat.id}`}
                  >
                    <div>
                      <h3 className="font-semibold text-stone-900">{cat.name}</h3>
                      <p className="text-sm text-stone-500">
                        {cat.service_count ?? 0} service
                        {(cat.service_count ?? 0) === 1 ? '' : 's'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEdit(cat)}
                        data-testid={`edit-category-${cat.id}`}
                        className="p-2 text-stone-400 hover:text-stone-700 rounded-lg"
                      >
                        <Pencil size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(cat)}
                        disabled={locked}
                        data-testid={`delete-category-${cat.id}`}
                        className={`p-2 rounded-lg ${
                          locked
                            ? 'text-stone-300 cursor-not-allowed'
                            : 'text-stone-400 hover:text-red-600 hover:bg-red-50'
                        }`}
                        title={
                          locked
                            ? 'Remove all services from this category first'
                            : 'Delete category'
                        }
                      >
                        <Trash size={18} />
                      </button>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        )}

        {!isLoading && (
          <button
            onClick={() => refetch()}
            disabled={isRefetching}
            className="mt-6 text-sm text-stone-500 hover:text-stone-700"
          >
            {isRefetching ? 'Refreshing…' : 'Refresh'}
          </button>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
          >
            <div className="flex items-center justify-between p-6 border-b border-stone-200">
              <h2 className="font-heading text-xl font-bold">
                {editing ? 'Edit category' : 'New category'}
              </h2>
              <button onClick={closeModal} className="p-2 text-stone-400 hover:text-stone-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Category name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  data-testid="category-name-input"
                  className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-800/20"
                  placeholder="e.g. Hair, Face, Beard"
                  required
                />
              </div>
              {(createMutation.isError || updateMutation.isError) && (
                <p className="text-sm text-red-600">
                  {getApiErrorMessage(createMutation.error || updateMutation.error)}
                </p>
              )}
              <button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                data-testid="save-category-btn"
                className="w-full btn-primary flex items-center justify-center gap-2"
              >
                <FloppyDisk size={20} />
                {editing ? 'Save' : 'Create'}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default ManageCategories;
