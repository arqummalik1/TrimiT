import React, { useMemo } from "react";
import { View, Text, StyleSheet, FlatList } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { ScreenWrapper, TAB_BAR_BASE_HEIGHT } from "../../components/ScreenWrapper";
import { useTheme } from "../../theme/ThemeContext";
import { Theme } from "../../theme/tokens";
import { borderRadius, fonts, formatPrice } from "../../lib/utils";
import { promotionRepository } from "../../repositories/promotionRepository";
import { format } from "date-fns";
import { ProfileStackScreenProps } from "../../navigation/types";
import { EmptyState } from "../../components/EmptyState";
import { ErrorState } from "../../components/ErrorState";
import { HeaderBackButton, HeaderBackButtonSpacer } from "../../components/HeaderBackButton";
import { OfferListSkeleton } from "../../components/skeletons/OfferListSkeleton";
import { useMinLoadingTime } from "../../hooks/useMinLoadingTime";
import { handleApiError } from "../../lib/errorHandler";
import { resetToCustomerDiscover } from "../../lib/navigationHelpers";

export default function MyOffersScreen({
  navigation,
}: ProfileStackScreenProps<"MyOffers">) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();

  const {
    data: grants = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["myGrants"],
    queryFn: () => promotionRepository.getMyGrants(),
  });

  const showSkeleton = useMinLoadingTime(isLoading);
  const now = Date.now();

  const header = (
    <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
      <HeaderBackButton onPress={() => navigation.goBack()} />
      <Text style={styles.headerTitle}>My offers</Text>
      <HeaderBackButtonSpacer />
    </View>
  );

  if (isError && !showSkeleton) {
    const appErr = handleApiError(error);
    return (
      <ScreenWrapper variant="stack" edges={["top"]}>
        {header}
        <ErrorState
          title="Couldn't load your offers"
          message={appErr.message}
          kind={appErr.kind}
          onRetry={() => void refetch()}
        />
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper variant="stack" edges={["top"]}>
      {header}

      {showSkeleton ? (
        <OfferListSkeleton />
      ) : (
        <FlatList
          data={grants}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: TAB_BAR_BASE_HEIGHT + insets.bottom + 24 },
          ]}
          ListEmptyComponent={
            <EmptyState
              icon="pricetag-outline"
              title="No offers yet"
              message="Offers land here after you book. Explore salons near you to earn your first one."
              compact
              action={{
                label: "Explore salons",
                onPress: () => resetToCustomerDiscover(navigation),
              }}
            />
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
      paddingHorizontal: 8,
      paddingBottom: 8,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    headerTitle: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 18,
      color: theme.colors.text,
    },
    listContent: {
      padding: 16,
      flexGrow: 1,
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
