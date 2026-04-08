import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  EnvelopeSimple, 
  Lock, 
  Eye, 
  EyeSlash, 
  User, 
  Phone, 
  Scissors,
  Storefront,
  Users
} from '@phosphor-icons/react';
import { useAuthStore } from '../store/authStore';

const SignupPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signup, isLoading, error, clearError } = useAuthStore();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: searchParams.get('role') || '',
  });
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRoleSelect = (role) => {
    setFormData({ ...formData, role });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    
    if (!formData.role) {
      return;
    }
    
    const result = await signup(
      formData.email, 
      formData.password, 
      formData.name, 
      formData.phone, 
      formData.role
    );
    
    if (result.success) {
      if (formData.role === 'owner') {
        navigate('/owner/salon');
      } else {
        navigate('/discover');
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-stone-50">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-orange-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Scissors size={32} weight="bold" className="text-white" />
          </div>
          <h1 className="font-heading text-3xl font-bold text-stone-900 mb-2">
            Join TrimiT
          </h1>
          <p className="text-stone-500">
            Create your account to get started
          </p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-3xl shadow-xl p-8 border border-stone-200">
          {/* Role Selection */}
          {!formData.role && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mb-8"
            >
              <h2 className="font-heading text-xl font-bold text-stone-900 mb-4 text-center">
                I am a...
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => handleRoleSelect('customer')}
                  data-testid="role-customer"
                  className="p-6 border-2 border-stone-200 rounded-2xl hover:border-orange-800 hover:bg-orange-50 transition-all group"
                >
                  <Users 
                    size={40} 
                    weight="duotone" 
                    className="mx-auto mb-3 text-stone-400 group-hover:text-orange-800 transition-colors" 
                  />
                  <span className="block font-semibold text-stone-900">Customer</span>
                  <span className="text-xs text-stone-500">Book appointments</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleRoleSelect('owner')}
                  data-testid="role-owner"
                  className="p-6 border-2 border-stone-200 rounded-2xl hover:border-orange-800 hover:bg-orange-50 transition-all group"
                >
                  <Storefront 
                    size={40} 
                    weight="duotone" 
                    className="mx-auto mb-3 text-stone-400 group-hover:text-orange-800 transition-colors" 
                  />
                  <span className="block font-semibold text-stone-900">Salon Owner</span>
                  <span className="text-xs text-stone-500">List your business</span>
                </button>
              </div>
            </motion.div>
          )}

          {/* Registration Form */}
          {formData.role && (
            <motion.form 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onSubmit={handleSubmit} 
              className="space-y-5"
            >
              {/* Selected Role Badge */}
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-stone-500">Signing up as:</span>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, role: '' })}
                  className="flex items-center gap-2 px-3 py-1.5 bg-orange-100 text-orange-800 rounded-full text-sm font-medium hover:bg-orange-200 transition-colors"
                >
                  {formData.role === 'customer' ? (
                    <Users size={16} weight="bold" />
                  ) : (
                    <Storefront size={16} weight="bold" />
                  )}
                  <span className="capitalize">{formData.role}</span>
                  <span className="text-orange-600">×</span>
                </button>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm"
                  data-testid="signup-error"
                >
                  {error}
                </motion.div>
              )}

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Full Name
                </label>
                <div className="relative">
                  <User 
                    size={20} 
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" 
                  />
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    data-testid="signup-name"
                    className="w-full pl-12 pr-4 py-3 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-800/20 focus:border-orange-800 transition-colors"
                    placeholder="John Doe"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <EnvelopeSimple 
                    size={20} 
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" 
                  />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    data-testid="signup-email"
                    className="w-full pl-12 pr-4 py-3 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-800/20 focus:border-orange-800 transition-colors"
                    placeholder="you@example.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone 
                    size={20} 
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" 
                  />
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    data-testid="signup-phone"
                    className="w-full pl-12 pr-4 py-3 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-800/20 focus:border-orange-800 transition-colors"
                    placeholder="+91 98765 43210"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock 
                    size={20} 
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" 
                  />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    data-testid="signup-password"
                    className="w-full pl-12 pr-12 py-3 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-800/20 focus:border-orange-800 transition-colors"
                    placeholder="Min 6 characters"
                    minLength={6}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                  >
                    {showPassword ? <EyeSlash size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                data-testid="signup-submit"
                className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  'Create Account'
                )}
              </button>
            </motion.form>
          )}

          <div className="mt-6 text-center">
            <p className="text-stone-500 text-sm">
              Already have an account?{' '}
              <Link 
                to="/login" 
                className="text-orange-800 font-semibold hover:underline"
                data-testid="login-link"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default SignupPage;
