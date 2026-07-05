import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../theme/ThemeContext';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { Ionicons } from '@expo/vector-icons';
import { RootScreenProps } from '../../navigation/types';
import { ScreenWrapper } from '../../components/ScreenWrapper';

const phoneRegex = /^[6-9]\d{9}$/;
const upiRegex = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;
const profileSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    phone: z
      .string()
      .min(10, 'Phone number is required')
      .refine((val) => phoneRegex.test(val), {
        message: 'Enter a valid 10-digit Indian mobile (e.g. 9876543210)',
      }),
    role: z.enum(['customer', 'owner']),
    upi_id: z.string().optional().or(z.literal('')),
    termsAccepted: z.boolean().refine((val) => val === true, {
      message: 'You must accept the terms and conditions',
    }),
  })
  .superRefine((data, ctx) => {
    // UPI ID is REQUIRED for owners — customers must not see/submit it.
    if (data.role !== 'owner') return;
    const upi = (data.upi_id ?? '').trim();
    if (!upi) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['upi_id'],
        message: 'UPI ID is required so customers can pay you',
      });
      return;
    }
    if (!upiRegex.test(upi)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['upi_id'],
        message: 'Enter a valid UPI ID (e.g. glowsalon@okaxis)',
      });
    }
  });

type ProfileFormData = z.infer<typeof profileSchema>;

export default function CompleteProfileScreen({ route }: RootScreenProps<'CompleteProfile'>) {
  const { theme } = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  const { completeProfile, logout, error, clearError } = useAuthStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const prefilled = route.params || {};

  const {
    control,
    handleSubmit,
    setValue,
    setError,
    watch,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: prefilled.prefilledName || '',
      phone: prefilled.prefilledPhone ? prefilled.prefilledPhone.replace(/^\+91/, '') : '',
      role: prefilled.prefilledRole || 'customer',
      upi_id: '',
      termsAccepted: false,
    },
  });

  const selectedRole = watch('role');
  const termsAccepted = watch('termsAccepted');

  const onSubmit = async (data: ProfileFormData) => {
    clearError();
    setLocalError(null);
    setIsSubmitting(true);
    
    const formattedPhone = `+91${data.phone.replace(/\D/g, '').slice(-10)}`;
    
    const result = await completeProfile({
      name: data.name,
      phone: formattedPhone,
      role: data.role,
      // Only owners send a UPI ID; customers never do.
      upi_id: data.role === 'owner' ? (data.upi_id ?? '').trim() : undefined,
    });
    
    if (!result.success) {
      // Map backend UPI validation codes to an inline field error rather than
      // a generic banner, so the owner knows exactly what to fix.
      if (result.errorCode === 'UPI_REQUIRED' || result.errorCode === 'INVALID_UPI') {
        setError('upi_id', {
          type: 'server',
          message:
            result.errorCode === 'UPI_REQUIRED'
              ? 'UPI ID is required so customers can pay you'
              : 'Enter a valid UPI ID (e.g. glowsalon@okaxis)',
        });
      } else if (result.errorCode === 'PHONE_ALREADY_REGISTERED') {
        setError('phone', {
          type: 'server',
          message: 'This mobile number is already registered.',
        });
      } else {
        setLocalError(result.error || 'Failed to complete profile');
      }
    }
    // On success, the RootNavigator will automatically unmount this screen 
    // and render the correct Tabs based on the new profileComplete state.
    
    setIsSubmitting(false);
  };

  return (
    <ScreenWrapper variant="auth">
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
      <ScrollView contentContainerStyle={styles.scrollContent} bounces={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Almost there!</Text>
          <Text style={styles.subtitle}>Let's finish setting up your profile</Text>
        </View>

        {(error || localError) && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{localError || error}</Text>
          </View>
        )}

        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>I am a...</Text>
          <View style={styles.roleContainer}>
            <TouchableOpacity
              style={[styles.roleCard, selectedRole === 'customer' && styles.roleCardActive]}
              onPress={() => setValue('role', 'customer')}
              activeOpacity={0.7}
            >
              <View style={[styles.iconContainer, selectedRole === 'customer' && styles.iconContainerActive]}>
                <Ionicons 
                  name="cut-outline" 
                  color={selectedRole === 'customer' ? (theme.isDark ? theme.colors.textInverse : theme.colors.text) : theme.colors.textSecondary} 
                  size={24} 
                />
              </View>
              <Text style={[styles.roleTitle, selectedRole === 'customer' && styles.roleTitleActive]}>
                Customer
              </Text>
              <Text style={[styles.roleDesc, selectedRole === 'customer' && styles.roleDescActive]}>Looking for grooming services</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.roleCard, selectedRole === 'owner' && styles.roleCardActive]}
              onPress={() => setValue('role', 'owner')}
              activeOpacity={0.7}
            >
              <View style={[styles.iconContainer, selectedRole === 'owner' && styles.iconContainerActive]}>
                <Ionicons 
                  name="storefront-outline" 
                  color={selectedRole === 'owner' ? (theme.isDark ? theme.colors.textInverse : theme.colors.text) : theme.colors.textSecondary} 
                  size={24} 
                />
              </View>
              <Text style={[styles.roleTitle, selectedRole === 'owner' && styles.roleTitleActive]}>
                Salon Owner
              </Text>
              <Text style={[styles.roleDesc, selectedRole === 'owner' && styles.roleDescActive]}>Managing my business</Text>
            </TouchableOpacity>
          </View>
          {errors.role && <Text style={styles.fieldErrorText}>{errors.role.message}</Text>}

          <View style={styles.inputGroup}>
            <Controller
              control={control}
              name="name"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Full Name *"
                  placeholder="John Doe"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.name?.message}
                  autoCapitalize="words"
                />
              )}
            />
          </View>

          <View style={styles.inputGroup}>
            <Controller
              control={control}
              name="phone"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Phone Number (Required)"
                  placeholder="98765 43210"
                  prefix="+91"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.phone?.message}
                  keyboardType="phone-pad"
                  maxLength={10}
                />
              )}
            />
          </View>

          {selectedRole === 'owner' && (
            <View style={styles.inputGroup}>
              <Controller
                control={control}
                name="upi_id"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="UPI ID *"
                    placeholder="glowsalon@okaxis"
                    value={value ?? ''}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.upi_id?.message}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                  />
                )}
              />
              <Text style={styles.upiHelpText}>
                Customers pay you directly on this UPI ID. You can update it later in Settings.
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.checkboxContainer}
            onPress={() => setValue('termsAccepted', !termsAccepted, { shouldValidate: true })}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, termsAccepted && styles.checkboxChecked]}>
              {termsAccepted && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.checkboxLabel}>
              I agree to the <Text style={styles.linkText}>Terms of Service</Text> and{' '}
              <Text style={styles.linkText}>Privacy Policy</Text>
            </Text>
          </TouchableOpacity>
          {errors.termsAccepted && (
            <Text style={[styles.fieldErrorText, { marginTop: -theme.spacing.sm, marginBottom: theme.spacing.md }]}>
              {errors.termsAccepted.message}
            </Text>
          )}

          <Button
            title="Complete Setup"
            onPress={handleSubmit(onSubmit)}
            loading={isSubmitting}
            disabled={isSubmitting}
            style={styles.submitButton}
          />

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => logout()}
            disabled={isSubmitting}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelButtonText}>Sign Out & Cancel</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: theme.spacing.xl,
    paddingTop: theme.spacing.xl,
  },
  header: {
    marginBottom: theme.spacing.xxl,
  },
  title: {
    ...theme.typography.h1,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  errorContainer: {
    backgroundColor: theme.colors.errorLight,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.lg,
  },
  errorText: {
    color: theme.colors.error,
    ...theme.typography.caption,
  },
  formSection: {
    flex: 1,
  },
  sectionTitle: {
    ...theme.typography.h4,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  roleContainer: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  roleCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
  },
  roleCardActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryLight,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
  },
  iconContainerActive: {
    backgroundColor: theme.colors.surface,
  },
  roleTitle: {
    ...theme.typography.bodySemiBold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  roleTitleActive: {
    color: theme.isDark ? theme.colors.textInverse : theme.colors.text,
  },
  roleDesc: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  roleDescActive: {
    color: theme.isDark ? theme.colors.textInverse : theme.colors.text,
  },
  inputGroup: {
    marginBottom: theme.spacing.lg,
  },
  fieldErrorText: {
    ...theme.typography.caption,
    color: theme.colors.error,
    marginBottom: theme.spacing.md,
  },
  upiHelpText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.xl,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 4,
    marginRight: theme.spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  checkmark: {
    color: theme.colors.textInverse,
    fontSize: 12,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
    flex: 1,
    lineHeight: 20,
  },
  linkText: {
    color: theme.colors.primary,
    textDecorationLine: 'underline',
  },
  submitButton: {
    marginTop: 'auto',
  },
  cancelButton: {
    marginTop: theme.spacing.md,
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
  },
  cancelButtonText: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
    textDecorationLine: 'underline',
  },
});
