import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { ScreenWrapper, TAB_BAR_BASE_HEIGHT } from "../../components/ScreenWrapper";
import { useTheme } from "../../theme/ThemeContext";
import { Theme } from "../../theme/tokens";
import { borderRadius, fonts, formatPrice } from "../../lib/utils";
import { promotionRepository } from "../../repositories/promotionRepository";
import { format } from "date-fns";
import { ProfileStackScreenProps } from "../../navigation/types";

export default function MyOffersScreen({
  navigation,
}: ProfileStackScreenProps<"MyOffers">) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();

  const { data: grants = [], isLoading } = useQuery({
    queryKey: ["myGrants"],
    queryFn: () => promotionRepository.getMyGrants(),
  });

  const now = Date.now();

  return (
    <ScreenWrapper variant="stack" edges={["top"]}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My offers</Text>
        <View style={{ width: 24 }} />
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={theme.colors.primary} />
      ) : (
        <FlatList
          data={grants}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            padding: 16,
            paddingBottom: TAB_BAR_BASE_HEIGHT + insets.bottom + 24,
          }}
          ListEmptyComponent={
            <Text style={styles.empty}>No offers yet — check back after booking!</Text>
          }
          renderItem={({ item }) => {
            const expired = new Date(item.expires_at).getTime() < now;
            const used = !!item.redeemed_at;
            const active = !expired && !used;
            return (
              <View
                style={[
                  styles.card,
                  !active && styles.cardInactive,
                ]}
              >
                <View style={styles.cardLeft}>
                  <Text style={styles.amount}>
                    {item.discount_type === "percent"
                      ? `${item.discount_value}%`
                      : formatPrice(item.discount_value || 0)}
                  </Text>
                  <Text style={styles.off}>OFF</Text>
                </View>
                <View style={styles.cardRight}>
                  <Text style={styles.code}>{item.code}</Text>
                  <Text style={styles.name}>{item.campaign_name || "TrimiT offer"}</Text>
                  {item.min_order_value ? (
                    <Text style={styles.meta}>
                      Min order {formatPrice(item.min_order_value)}
                    </Text>
                  ) : null}
                  <Text style={styles.meta}>
                    {used
                      ? `Used ${format(new Date(item.redeemed_at!), "d MMM yyyy")}`
                      : expired
                        ? "Expired"
                        : `Valid till ${format(new Date(item.expires_at), "d MMM yyyy")}`}
                  </Text>
                </View>
                {active && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>Active</Text>
                  </View>
                )}
              </View>
            );
          }}
        />
      )}
    </ScreenWrapper>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    headerTitle: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 18,
      color: theme.colors.text,
    },
    empty: {
      fontFamily: fonts.body,
      fontSize: 14,
      color: theme.colors.textSecondary,
      textAlign: "center",
      marginTop: 48,
    },
    card: {
      flexDirection: "row",
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.colors.primary + "40",
      marginBottom: 12,
      overflow: "hidden",
      backgroundColor: theme.colors.surface,
    },
    cardInactive: { opacity: 0.55 },
    cardLeft: {
      backgroundColor: theme.colors.primary,
      padding: 16,
      alignItems: "center",
      justifyContent: "center",
      minWidth: 80,
    },
    amount: {
      fontFamily: fonts.bodyBold,
      fontSize: 18,
      color: theme.colors.textInverse,
    },
    off: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 10,
      color: theme.colors.textInverse,
    },
    cardRight: { flex: 1, padding: 14 },
    code: {
      fontFamily: fonts.bodyBold,
      fontSize: 16,
      color: theme.colors.primary,
    },
    name: {
      fontFamily: fonts.body,
      fontSize: 13,
      color: theme.colors.text,
      marginTop: 2,
    },
    meta: {
      fontFamily: fonts.body,
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    badge: {
      position: "absolute",
      top: 8,
      right: 8,
      backgroundColor: theme.colors.success + "25",
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 8,
    },
    badgeText: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 10,
      color: theme.colors.success,
    },
  });
