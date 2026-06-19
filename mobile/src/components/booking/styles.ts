/**
 * Shared BookingScreen style factory.
 *
 * Centralizes every style used across the booking flow so each extracted
 * presentational component (SlotGrid, HoldTimer, PromoInput, …) imports the
 * same `createBookingStyles(theme)` and references the exact style keys the
 * monolithic screen used before the split. No visual diff vs. the original.
 *
 * Colocated with the booking components under src/components/booking/.
 */
import { StyleSheet } from 'react-native';
import { fonts, borderRadius } from '../../lib/utils';
import type { Theme } from '../../theme/tokens';

export type BookingStyles = ReturnType<typeof createBookingStyles>;

/**
 * Build the full style sheet for the booking flow given the active theme.
 * The key names mirror the original BookingScreen.createStyles verbatim so
 * refs like `styles.slotButton` keep working after the refactor.
 */
export function createBookingStyles(theme: Theme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 20,
      backgroundColor: theme.colors.background,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    backButton: {
      width: 44,
      height: 44,
      backgroundColor: theme.colors.surface,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    headerText: {
      marginLeft: 16,
    },
    headerTitle: {
      fontFamily: fonts.heading,
      fontSize: 24,
      color: theme.colors.text,
    },
    headerSubtitle: {
      fontFamily: fonts.body,
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    content: {
      flex: 1,
      padding: 24,
    },
    serviceCard: {
      backgroundColor: theme.colors.surface,
      padding: 24,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginBottom: 32,
    },
    frozenBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: theme.colors.error + '14',
      borderWidth: 1,
      borderColor: theme.colors.error + '55',
      borderRadius: 16,
      padding: 14,
      marginBottom: 20,
    },
    frozenBannerText: {
      flex: 1,
      fontFamily: fonts.body,
      fontSize: 13,
      color: theme.colors.text,
      lineHeight: 18,
    },
    serviceName: {
      fontFamily: fonts.heading,
      fontSize: 22,
      color: theme.colors.text,
      marginBottom: 12,
    },
    serviceDetails: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    detailItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    detailText: {
      fontFamily: fonts.body,
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    servicePrice: {
      fontFamily: fonts.bodyBold,
      fontSize: 20,
      color: theme.colors.primary,
    },
    section: {
      marginBottom: 32,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 20,
      gap: 10,
    },
    sectionTitle: {
      fontFamily: fonts.heading,
      fontSize: 22,
      color: theme.colors.text,
      letterSpacing: 0.5,
    },
    datesContainer: {
      gap: 12,
      paddingRight: 24,
    },
    dateCard: {
      width: 70,
      height: 90,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    dateCardSelected: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    dateDay: {
      fontFamily: fonts.body,
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginBottom: 4,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    dateNum: {
      fontFamily: fonts.bodyBold,
      fontSize: 22,
      color: theme.colors.text,
    },
    dateMonth: {
      fontFamily: fonts.body,
      fontSize: 11,
      color: theme.colors.textTertiary,
      marginTop: 2,
    },
    dateTextSelected: {
      color: theme.colors.textInverse,
    },
    slotsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    slotButton: {
      paddingVertical: 14,
      paddingHorizontal: 20,
      backgroundColor: theme.colors.surface,
      borderRadius: borderRadius.pill,
      borderWidth: 1,
      borderColor: theme.colors.border,
      minWidth: 100,
      alignItems: 'center',
    },
    slotDisabled: {
      backgroundColor: 'rgba(18, 20, 17, 0.3)',
      borderColor: 'transparent',
    },
    slotSelected: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    slotText: {
      fontFamily: fonts.bodyBold,
      fontSize: 15,
      color: theme.colors.text,
    },
    slotTextDisabled: {
      color: theme.colors.textTertiary,
      textDecorationLine: 'line-through',
    },
    slotTextSelected: {
      color: theme.colors.textInverse,
    },
    noSlots: {
      alignItems: 'center',
      padding: 40,
      backgroundColor: theme.colors.surface,
      borderRadius: 24,
      gap: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderStyle: 'dashed',
    },
    noSlotsText: {
      fontFamily: fonts.body,
      color: theme.colors.textTertiary,
    },
    paymentOption: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 20,
      backgroundColor: theme.colors.surface,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: theme.colors.border,
      gap: 16,
    },
    paymentOptionSelected: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    paymentIconContainer: {
      width: 52,
      height: 52,
      borderRadius: 16,
      backgroundColor: theme.colors.surfaceSecondary,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    paymentTitle: {
      fontFamily: fonts.bodyBold,
      fontSize: 16,
      color: theme.colors.text,
    },
    paymentSub: {
      fontFamily: fonts.body,
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    paymentTextSelected: {
      color: theme.colors.textInverse,
    },
    refreshBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: theme.colors.primary + '1A', // transparent primary
      padding: 12,
      borderRadius: 8,
      marginBottom: 16,
    },
    refreshText: {
      fontSize: 13,
      color: theme.colors.primary,
      fontWeight: '500',
    },
    infoBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: theme.colors.secondary + '1A',
      padding: 12,
      borderRadius: 8,
      marginBottom: 16,
    },
    infoText: {
      fontSize: 13,
      color: theme.colors.secondary,
      fontWeight: '500',
    },
    slotFillingUp: {
      backgroundColor: theme.colors.warning + '1A',
      borderColor: theme.colors.warning,
    },
    slotCapacityText: {
      fontSize: 10,
      color: theme.colors.textSecondary,
      marginTop: 2,
      fontWeight: '500',
    },
    slotCapacityFull: {
      color: theme.colors.error,
      fontWeight: '600',
    },
    slotCapacitySelected: {
      color: 'rgba(255,255,255,0.7)',
    },
    slotCapacityFilling: {
      color: theme.colors.warning,
    },
    slotBookedLabel: {
      fontSize: 10,
      color: theme.colors.error,
      marginTop: 2,
      fontWeight: '600',
    },
    slotJustBooked: {
      borderColor: theme.colors.error,
      borderWidth: 2,
    },
    slotTextJustBooked: {
      color: theme.colors.error,
    },
    justBookedIndicator: {
      position: 'absolute',
      bottom: -6,
      left: '50%',
      transform: [{ translateX: -30 }],
      backgroundColor: theme.colors.error,
      borderRadius: 10,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    justBookedText: {
      fontSize: 9,
      color: '#FFFFFF',
      fontWeight: '600',
    },
    bookingSummary: {
      backgroundColor: theme.colors.surface,
      padding: 20,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    summaryTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.text,
      marginBottom: 16,
    },
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    summaryLabel: {
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    summaryValue: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.colors.text,
    },
    totalRow: {
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      paddingTop: 12,
      marginTop: 4,
      marginBottom: 0,
    },
    totalLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
    },
    totalValue: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.primary,
    },
    footer: {
      padding: 20,
      backgroundColor: theme.colors.surface,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    successContainer: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    successScroll: {
      flexGrow: 1,
    },
    successContent: {
      flex: 1,
      padding: 24,
      alignItems: 'center',
      justifyContent: 'center',
    },
    successIconContainer: {
      width: 96,
      height: 96,
      borderRadius: 48,
      backgroundColor: theme.colors.primary + '1A',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 24,
    },
    successTitle: {
      fontFamily: fonts.heading,
      fontSize: 28,
      color: theme.colors.text,
      marginBottom: 12,
      textAlign: 'center',
    },
    successSubtitle: {
      fontFamily: fonts.body,
      fontSize: 16,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginBottom: 40,
      paddingHorizontal: 20,
    },
    confirmationCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 24,
      padding: 24,
      width: '100%',
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginBottom: 24,
    },
    confirmationHeader: {
      fontFamily: fonts.bodyBold,
      fontSize: 14,
      color: theme.colors.textTertiary,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: 20,
    },
    summarySeparator: {
      height: 1,
      backgroundColor: theme.colors.border,
      marginVertical: 16,
    },
    summaryValueGold: {
      fontFamily: fonts.heading,
      fontSize: 24,
      color: theme.colors.primary,
    },
    primaryDirectionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.primary,
      paddingVertical: 16,
      borderRadius: borderRadius.pill,
      width: '100%',
      marginBottom: 16,
      gap: 8,
    },
    primaryDirectionText: {
      fontFamily: fonts.bodyBold,
      color: theme.colors.textInverse,
      fontSize: 16,
    },
    successActionRow: {
      flexDirection: 'row',
      gap: 12,
      width: '100%',
    },
    secondaryButton: {
      flex: 1,
      paddingVertical: 16,
      borderRadius: borderRadius.pill,
      backgroundColor: theme.colors.surfaceSecondary,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    secondaryButtonText: {
      fontFamily: fonts.bodySemiBold,
      color: theme.colors.text,
      fontSize: 15,
    },
    primarySuccessButton: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    primarySuccessButtonText: {
      fontFamily: fonts.bodySemiBold,
      color: theme.colors.textInverse,
      fontSize: 15,
    },
    // Promo Code Styles
    promoInputContainer: {
      flexDirection: 'row',
      gap: 12,
      alignItems: 'flex-start',
    },
    promoInputWrapper: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: theme.colors.border,
      overflow: 'hidden',
    },
    promoInput: {
      flex: 1,
      paddingVertical: 14,
      paddingHorizontal: 16,
      fontSize: 15,
      color: theme.colors.text,
      fontFamily: fonts.bodyBold,
    },
    applyPromoButton: {
      backgroundColor: theme.colors.primary,
      paddingVertical: 14,
      paddingHorizontal: 24,
      borderRadius: borderRadius.pill,
      minWidth: 80,
      alignItems: 'center',
      justifyContent: 'center',
    },
    applyPromoButtonDisabled: {
      opacity: 0.6,
    },
    applyPromoText: {
      fontFamily: fonts.bodyBold,
      fontSize: 15,
      color: theme.colors.textInverse,
    },
    promoAppliedContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.colors.success + '1A',
      padding: 16,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: theme.colors.success,
    },
    promoAppliedContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
    },
    promoAppliedCode: {
      fontFamily: fonts.bodyBold,
      fontSize: 16,
      color: theme.colors.text,
    },
    promoAppliedSavings: {
      fontFamily: fonts.body,
      fontSize: 13,
      color: theme.colors.success,
      marginTop: 2,
    },
    promoErrorContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 8,
      paddingHorizontal: 4,
    },
    promoErrorText: {
      fontFamily: fonts.body,
      fontSize: 13,
      color: theme.colors.error,
    },
    strikethrough: {
      textDecorationLine: 'line-through',
      color: theme.colors.textTertiary,
    },
  });
}
