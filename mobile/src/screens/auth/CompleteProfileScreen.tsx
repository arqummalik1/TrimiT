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

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().optional().or(z.literal('')),
  role: z.enum(['customer', 'owner']),
  termsAccepted: z.boolean().refine((val) => val === true, {
    message: 'You must accept the terms and conditions',
  }),
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
    watch,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: prefilled.prefilledName || '',
      phone: prefilled.prefilledPhone || '',
      role: prefilled.prefilledRole || 'customer',
      termsAccepted: false,
    },
  });

  const selectedRole = watch('role');
  const termsAccepted = watch('termsAccepted');

  const onSubmit = async (data: ProfileFormData) => {
    clearError();
    setLocalError(null);
    setIsSubmitting(true);
    
    const result = await completeProfile({
      name: data.name,
      phone: data.phone || undefined,
      role: data.role,
    });
    
    if (!result.success) {
      setLocalError(result.error || 'Failed to complete profile');
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
                  color={selectedRole === 'customer' ? theme.colors.primary : theme.colors.textSecondary} 
                  size={24} 
                />
              </View>
              <Text style={[styles.roleTitle, selectedRole === 'customer' && styles.roleTitleActive]}>
                Customer
              </Text>
              <Text style={styles.roleDesc}>Looking for grooming services</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.roleCard, selectedRole === 'owner' && styles.roleCardActive]}
              onPress={() => setValue('role', 'owner')}
              activeOpacity={0.7}
            >
              <View style={[styles.iconContainer, selectedRole === 'owner' && styles.iconContainerActive]}>
                <Ionicons 
                  name="storefront-outline" 
                  color={selectedRole === 'owner' ? theme.colors.primary : theme.colors.textSecondary} 
                  size={24} 
                />
              </View>
              <Text style={[styles.roleTitle, selectedRole === 'owner' && styles.roleTitleActive]}>
                Salon Owner
              </Text>
              <Text style={styles.roleDesc}>Managing my business</Text>
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
                  label="Phone Number (Optional)"
                  placeholder="+1 (555) 000-0000"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.phone?.message}
                  keyboardType="phone-pad"
                />
              )}
            />
          </View>

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
    color: theme.colors.primary,
  },
  roleDesc: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: theme.spacing.lg,
  },
  fieldErrorText: {
    ...theme.typography.caption,
    color: theme.colors.error,
    marginBottom: theme.spacing.md,
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
