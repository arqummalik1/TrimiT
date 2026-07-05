import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../theme/ThemeContext";
import { Theme } from "../../theme/tokens";
import { borderRadius, fonts, formatPrice } from "../../lib/utils";
import type { CheckoutOffer } from "../../repositories/promotionRepository";

interface CheckoutOffersSectionProps {
  salonName?: string;
  salonOffers: CheckoutOffer[];
  platformOffers: CheckoutOffer[];
  selectedCode: string | null;
  manualCode: string;
  onManualCodeChange: (code: string) => void;
  onSelectOffer: (offer: CheckoutOffer) => void;
  onRemoveOffer: () => void;
  onApplyManual: () => void;
  validating: boolean;
  error: string | null;
  showManualInput: boolean;
  onToggleManual: () => void;
}

export function CheckoutOffersSection({
  salonName,
  salonOffers,
  platformOffers,
  selectedCode,
  manualCode,
  onManualCodeChange,
  onSelectOffer,
  onRemoveOffer,
  onApplyManual,
  validating,
  error,
  showManualInput,
  onToggleManual,
}: CheckoutOffersSectionProps) {
  const { theme } = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  const allOffers = [...platformOffers, ...salonOffers];

  const renderOffer = (offer: CheckoutOffer) => {
    const selected = selectedCode === offer.code;
    return (
      <TouchableOpacity
        key={`${offer.source}-${offer.code}`}
        style={[styles.offerCard, selected && styles.offerCardSelected]}
        onPress={() => (selected ? onRemoveOffer() : onSelectOffer(offer))}
        activeOpacity={0.85}
      >
        <View style={styles.offerIcon}>
          <Ionicons
            name={offer.source === "platform" ? "gift" : "pricetag"}
            size={20}
            color={selected ? theme.colors.textInverse : theme.colors.primary}
          />
        </View>
        <View style={styles.offerBody}>
          <Text
            style={[styles.offerCode, selected && styles.offerTextSelected]}
          >
            {offer.code}
            {offer.source === "platform" ? " · TrimiT" : ""}
          </Text>
          <Text
            style={[
              styles.offerDesc,
              selected && styles.offerSubSelected,
            ]}
            numberOfLines={2}
          >
            {offer.description || `Save ${formatPrice(offer.discount_amount || 0)}`}
          </Text>
        </View>
        <View style={styles.offerRight}>
          <Text
            style={[styles.offerSave, selected && styles.offerTextSelected]}
          >
            −{formatPrice(offer.discount_amount || 0)}
          </Text>
          {selected && (
            <Ionicons
              name="checkmark-circle"
              size={22}
              color={theme.colors.textInverse}
            />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Ionicons name="ticket" size={20} color={theme.colors.primary} />
        <Text style={styles.title}>
          {salonName ? `Offers · ${salonName}` : "Offers & coupons"}
        </Text>
      </View>

      {selectedCode ? (
        <View style={styles.appliedBanner}>
          <Ionicons name="checkmark-circle" size={22} color={theme.colors.success} />
          <Text style={styles.appliedText}>
            <Text style={styles.appliedCode}>{selectedCode}</Text> applied
          </Text>
          <TouchableOpacity onPress={onRemoveOffer} hitSlop={12}>
            <Text style={styles.removeText}>Remove</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {allOffers.length > 0 ? (
        <View style={styles.offerList}>{allOffers.map(renderOffer)}</View>
      ) : (
        <Text style={styles.empty}>No offers available for this booking</Text>
      )}

      <TouchableOpacity onPress={onToggleManual} style={styles.manualToggle}>
        <Text style={styles.manualToggleText}>
          {showManualInput ? "Hide promo code" : "Have another code?"}
        </Text>
      </TouchableOpacity>

      {showManualInput && !selectedCode && (
        <View style={styles.manualRow}>
          <TextInput
            style={styles.manualInput}
            placeholder="Enter code"
            placeholderTextColor={theme.colors.textSecondary}
            value={manualCode}
            onChangeText={(t) => onManualCodeChange(t.toUpperCase())}
            autoCapitalize="characters"
          />
          <TouchableOpacity
            style={[styles.applyBtn, validating && styles.applyBtnDisabled]}
            onPress={onApplyManual}
            disabled={validating || !manualCode.trim()}
          >
            {validating ? (
              <ActivityIndicator size="small" color={theme.colors.textInverse} />
            ) : (
              <Text style={styles.applyBtnText}>Apply</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {error ? (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle" size={16} color={theme.colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    section: { marginBottom: 8 },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 12,
    },
    title: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 16,
      color: theme.colors.text,
    },
    offerList: { gap: 10 },
    offerCard: {
      flexDirection: "row",
      alignItems: "center",
      padding: 14,
      borderRadius: borderRadius.lg,
      borderWidth: 1.5,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    offerCardSelected: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.primary,
    },
    offerIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.primary + "18",
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
    },
    offerBody: { flex: 1 },
    offerCode: {
      fontFamily: fonts.bodyBold,
      fontSize: 14,
      color: theme.colors.text,
    },
    offerDesc: {
      fontFamily: fonts.body,
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    offerRight: { alignItems: "flex-end", gap: 4 },
    offerSave: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 14,
      color: theme.colors.success,
    },
    offerTextSelected: { color: theme.colors.textInverse },
    offerSubSelected: { color: theme.colors.textInverse, opacity: 0.85 },
    appliedBanner: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      padding: 12,
      borderRadius: borderRadius.md,
      backgroundColor: theme.colors.success + "15",
      marginBottom: 12,
    },
    appliedText: { flex: 1, fontFamily: fonts.body, fontSize: 14 },
    appliedCode: { fontFamily: fonts.bodyBold },
    removeText: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 13,
      color: theme.colors.primary,
    },
    empty: {
      fontFamily: fonts.body,
      fontSize: 13,
      color: theme.colors.textSecondary,
      marginBottom: 8,
    },
    manualToggle: { marginTop: 12, marginBottom: 8 },
    manualToggleText: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 13,
      color: theme.colors.primary,
    },
    manualRow: { flexDirection: "row", gap: 8 },
    manualInput: {
      flex: 1,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: borderRadius.md,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontFamily: fonts.body,
      fontSize: 15,
      color: theme.colors.text,
      backgroundColor: theme.colors.surface,
    },
    applyBtn: {
      backgroundColor: theme.colors.primary,
      paddingHorizontal: 18,
      borderRadius: borderRadius.md,
      justifyContent: "center",
    },
    applyBtnDisabled: { opacity: 0.6 },
    applyBtnText: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 14,
      color: theme.colors.textInverse,
    },
    errorRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginTop: 8,
    },
    errorText: {
      fontFamily: fonts.body,
      fontSize: 13,
      color: theme.colors.error,
      flex: 1,
    },
  });
