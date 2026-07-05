import React, { useEffect, useRef } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme/ThemeContext";
import { Theme } from "../theme/tokens";
import { borderRadius, fonts, formatPrice } from "../lib/utils";

const { width } = Dimensions.get("window");

interface WelcomeVoucherModalProps {
  visible: boolean;
  code: string;
  discountAmount: number;
  minOrder: number;
  expiresAt: string;
  onExplore: () => void;
}

export function WelcomeVoucherModal({
  visible,
  code,
  discountAmount,
  minOrder,
  expiresAt,
  onExplore,
}: WelcomeVoucherModalProps) {
  const { theme } = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  const scale = useRef(new Animated.Value(0.85)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          friction: 7,
          tension: 80,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 280,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scale.setValue(0.85);
      opacity.setValue(0);
    }
  }, [visible, scale, opacity]);

  const expiryLabel = new Date(expiresAt).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <Animated.View
          style={[styles.card, { opacity, transform: [{ scale }] }]}
        >
          <Text style={styles.emoji}>🎉</Text>
          <Text style={styles.title}>Welcome to TrimiT!</Text>
          <Text style={styles.subtitle}>
            You've received a gift for your first booking
          </Text>

          <View style={styles.voucher}>
            <View style={styles.voucherLeft}>
              <Text style={styles.voucherAmount}>
                {formatPrice(discountAmount)}
              </Text>
              <Text style={styles.voucherOff}>OFF</Text>
            </View>
            <View style={styles.voucherRight}>
              <Text style={styles.voucherCode}>{code}</Text>
              <Text style={styles.voucherMeta}>
                Min order {formatPrice(minOrder)}
              </Text>
              <Text style={styles.voucherMeta}>Valid till {expiryLabel}</Text>
            </View>
          </View>

          <Text style={styles.hint}>
            Tap to apply at checkout — works on participating salons
          </Text>

          <TouchableOpacity style={styles.cta} onPress={onExplore}>
            <Text style={styles.ctaText}>Explore salons</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.55)",
      justifyContent: "center",
      alignItems: "center",
      padding: 24,
    },
    card: {
      width: Math.min(width - 48, 360),
      backgroundColor: theme.colors.surface,
      borderRadius: borderRadius.xl,
      padding: 24,
      alignItems: "center",
      borderWidth: 1,
      borderColor: theme.colors.primary + "30",
    },
    emoji: { fontSize: 40, marginBottom: 8 },
    title: {
      fontFamily: fonts.bodyBold,
      fontSize: 22,
      color: theme.colors.text,
      textAlign: "center",
    },
    subtitle: {
      fontFamily: fonts.body,
      fontSize: 14,
      color: theme.colors.textSecondary,
      textAlign: "center",
      marginTop: 6,
      marginBottom: 20,
    },
    voucher: {
      flexDirection: "row",
      width: "100%",
      borderRadius: borderRadius.lg,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: theme.colors.primary + "40",
      borderStyle: "dashed",
    },
    voucherLeft: {
      backgroundColor: theme.colors.primary,
      paddingVertical: 16,
      paddingHorizontal: 14,
      alignItems: "center",
      justifyContent: "center",
      minWidth: 88,
    },
    voucherAmount: {
      fontFamily: fonts.bodyBold,
      fontSize: 22,
      color: theme.colors.textInverse,
    },
    voucherOff: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 11,
      color: theme.colors.textInverse,
      opacity: 0.9,
    },
    voucherRight: {
      flex: 1,
      padding: 14,
      justifyContent: "center",
      backgroundColor: theme.colors.primary + "12",
    },
    voucherCode: {
      fontFamily: fonts.bodyBold,
      fontSize: 18,
      color: theme.colors.primary,
      letterSpacing: 1,
    },
    voucherMeta: {
      fontFamily: fonts.body,
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    hint: {
      fontFamily: fonts.body,
      fontSize: 12,
      color: theme.colors.textSecondary,
      textAlign: "center",
      marginTop: 14,
    },
    cta: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: theme.colors.primary,
      paddingVertical: 14,
      paddingHorizontal: 28,
      borderRadius: borderRadius.lg,
      marginTop: 20,
      width: "100%",
      justifyContent: "center",
    },
    ctaText: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 16,
      color: theme.colors.textInverse,
    },
  });
