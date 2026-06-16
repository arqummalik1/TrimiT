import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Linking,
} from 'react-native';
import { ScreenWrapper } from '../../components/ScreenWrapper';
import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import api from '../../lib/api';
import { handleApiError } from '../../lib/errorHandler';
import { Button } from '../../components/Button';
import { typography, spacing, borderRadius, shadows } from '../../lib/utils';
import { showToast } from '../../store/toastStore';
import { useTheme } from '../../theme/ThemeContext';
import { Theme } from '../../theme/tokens';
import { CustomerDiscoverScreenProps } from '../../navigation/types';
import { SUPPORT_EMAIL } from '../../lib/contactInfo';
import { reviewSchema } from '../../lib/validations';

export default function WriteReviewScreen({ navigation, route }: CustomerDiscoverScreenProps<'WriteReview'>) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { salonId, bookingId } = route.params;
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  const mutation = useMutation({
    mutationFn: () => {
      if (!bookingId) {
        throw new Error('Booking is required to submit a review');
      }
      return api.post('/reviews', {
        salon_id: salonId,
        booking_id: bookingId,
        rating,
        comment: comment.trim() || undefined,
      });
    },
    onSuccess: () => {
      showToast('Review submitted successfully!', 'success');
      navigation.goBack();
    },
    onError: (error) => {
      handleApiError(error);
    },
  });

  const handleSubmit = () => {
    if (!salonId || !bookingId) {
      showToast('Invalid salon or booking reference', 'error');
      return;
    }

    const parseResult = reviewSchema.safeParse({
      rating,
      comment: comment.trim() || undefined,
    });

    if (!parseResult.success) {
      showToast(parseResult.error.errors[0].message, 'error');
      return;
    }

    mutation.mutate();
  };

  return (
    <ScreenWrapper variant="stack">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={styles.title}>Write a Review</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Rating */}
          <View style={[styles.card, shadows.sm]}>
            <Text style={styles.sectionTitle}>How was your experience?</Text>
            <View style={styles.starsContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setRating(star)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={star <= rating ? 'star' : 'star-outline'}
                    size={44}
                    color={star <= rating ? theme.colors.star : theme.colors.border}
                  />
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.ratingLabel}>
              {rating === 0
                ? 'Tap a star to rate'
                : rating === 1
                ? 'Poor'
                : rating === 2
                ? 'Below Average'
                : rating === 3
                ? 'Average'
                : rating === 4
                ? 'Good'
                : 'Excellent'}
            </Text>
          </View>

          {/* Comment */}
          <View style={[styles.card, shadows.sm]}>
            <Text style={styles.sectionTitle}>Tell us more (optional)</Text>
            <TextInput
              style={styles.textInput}
              value={comment}
              onChangeText={setComment}
              placeholder="Share your experience..."
              placeholderTextColor={theme.colors.textTertiary}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              maxLength={500}
            />
            <Text style={styles.charCount}>{comment.length}/500</Text>
          </View>

          <Button
            title="Submit Review"
            onPress={handleSubmit}
            loading={mutation.isPending}
            disabled={rating === 0}
            style={{ marginTop: spacing.xxl }}
          />

          <Text style={styles.ugcNotice}>
            Reviews must be honest and based on your experience. To report inappropriate content,
            contact{' '}
            <Text
              style={styles.ugcLink}
              onPress={() => void Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}
            >
              {SUPPORT_EMAIL}
            </Text>
            .
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
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
    color: theme.colors.text,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xxl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.h4,
    color: theme.colors.text,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  ratingLabel: {
    ...typography.bodySmallMedium,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  textInput: {
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    ...typography.body,
    color: theme.colors.text,
    minHeight: 120,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  ugcNotice: {
    ...typography.caption,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.lg,
    lineHeight: 18,
  },
  ugcLink: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  charCount: {
    ...typography.caption,
    color: theme.colors.textTertiary,
    textAlign: 'right',
    marginTop: spacing.xs,
  },
});
