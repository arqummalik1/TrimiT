import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
} from "react-native";
import { ScreenWrapper } from "../../components/ScreenWrapper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  format,
  addDays,
  startOfToday,
  isToday,
  parseISO,
  isValid,
} from "date-fns";
import { Salon, TimeSlot, SlotsResponse } from "../../types";
import {
  fonts,
  borderRadius,
  formatPrice,
  formatTime,
  normalizeSlotTimeToHHMM,
} from "../../lib/utils";
import { useTheme } from "../../theme/ThemeContext";
import { Theme } from "../../theme/tokens";
import { logger } from "../../lib/logger";

import { Button } from "../../components/Button";
import { useBookingStore } from "../../store/bookingStore";
import {
  scheduleBookingReminder,
  presentBookingConfirmedLocal,
} from "../../lib/notifications";
import { openNativeDirections } from "../../lib/maps";
import {
  navigateToCustomerBookings,
  resetToCustomerDiscover,
} from "../../lib/navigationHelpers";
import { handleApiError } from "../../lib/errorHandler";
import { isAppError } from "../../types/error";
import { CustomerDiscoverScreenProps } from "../../navigation/types";

import { BookingParamsSchema } from "../../navigation/params";

import { analytics } from "../../lib/analytics";
import {
  ENABLE_STAFF_SELECTION,
  ENABLE_MULTI_BOOKING_PER_SLOT,
  ENABLE_SUBSCRIPTION_ENFORCEMENT,
} from "../../lib/featureFlags";
import { createIdempotencyKey } from "../../lib/idempotency";
import {
  isTransientNetworkError,
  withTransientNetworkRetry,
} from "../../lib/networkRetry";
import { salonRepository } from "../../repositories/salonRepository";
import { bookingRepository } from "../../repositories/bookingRepository";
import { promotionRepository } from "../../repositories/promotionRepository";
import { upiIntentService } from "../../services/upiIntentService";
import PaymentMethodPicker from "../../components/booking/PaymentMethodPicker";
import { createBookingStyles } from "../../components/booking/styles";
import { useInitiateUpi } from "../../hooks/usePayment";

// Staff selection imports
import StaffPicker from "../../components/StaffPicker";
import StaffProfileCard from "../../components/StaffProfileCard";
import UpiAppPickerSheet from "../../components/booking/UpiAppPickerSheet";
import type {
  AvailableStaffResponse,
  StaffWithServices,
} from "../../types/staff";

export const BookingScreen: React.FC<
  CustomerDiscoverScreenProps<"Booking">
> = ({ navigation, route }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const pickerStyles = useMemo(() => createBookingStyles(theme), [theme]);
  const insets = useSafeAreaInsets();

  // Validate params
  const validation = BookingParamsSchema.safeParse(route.params);
  if (!validation.success) {
    console.error("[BookingScreen] Invalid params:", validation.error);
    return (
      <ScreenWrapper variant="stack">
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            padding: 20,
          }}
        >
          <Ionicons name="alert-circle" size={48} color={theme.colors.error} />
          <Text
            style={{
              marginTop: 16,
              textAlign: "center",
              color: theme.colors.text,
            }}
          >
            Invalid booking parameters.
          </Text>
          <Button
            title="Go Back"
            onPress={() => navigation.goBack()}
            style={{ marginTop: 24 }}
          />
        </View>
      </ScreenWrapper>
    );
  }

  const { salonId, serviceId } = validation.data;
  const queryClient = useQueryClient();
  const initiateUpiMutation = useInitiateUpi();

  const [selectedDate, setSelectedDate] = useState(
    format(new Date(), "yyyy-MM-dd"),
  );
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<
    "cash" | "upi"
  >("cash");
  const [bookingComplete, setBookingComplete] = useState(false);
  const [slotConflictError, setSlotConflictError] = useState<string | null>(
    null,
  );

  // Promo code state
  const [promoCode, setPromoCode] = useState("");
  const [promoApplied, setPromoApplied] = useState(false);
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [validatingPromo, setValidatingPromo] = useState(false);

  // Staff selection state
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [anyStaffSelected, setAnyStaffSelected] = useState(true); // Default to "Any Available"
  const [staffProfileVisible, setStaffProfileVisible] = useState(false);
  const [selectedStaffForProfile, setSelectedStaffForProfile] =
    useState<StaffWithServices | null>(null);
  const [effectivePrice, setEffectivePrice] = useState<number>(0);
  const [effectiveDuration, setEffectiveDuration] = useState<number>(0);

  // Hold state
  const [holdId, setHoldId] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);
  /** Stable key per confirm attempt so retries are safe; reset when slot/date changes. */
  const idempotencyKeyRef = React.useRef<string | null>(null);
  const successNavigatedRef = useRef(false);

  // UPI app picker state — after a UPI booking is created we detect installed
  // UPI apps and let the customer choose which one to pay with (instead of
  // Android silently opening only the default handler).
  const [upiPicker, setUpiPicker] = useState<{
    visible: boolean;
    bookingId: string;
    bookingReference: string;
    intentUri: string;
    upiId: string;
    payeeName: string;
    amount: number;
  } | null>(null);
  const [upiApps, setUpiApps] = useState<import("../../services/upiIntentService").UpiApp[]>([]);
  const [detectingUpiApps, setDetectingUpiApps] = useState(false);

  const resetBookingAttempt = useCallback(() => {
    idempotencyKeyRef.current = null;
  }, []);

  // Real-time booking store
  const {
    slots: realtimeSlots,
    justBookedSlots,
    needsRefresh,
    allowMultipleBookings,
    subscribeToSlots,
    unsubscribeFromSlots,
    updateSlots,
    refreshSlots,
  } = useBookingStore();

  // Get salon details
  const { data: salon } = useQuery<Salon>({
    queryKey: ["salon", salonId],
    queryFn: () => salonRepository.getSalon(salonId),
  });

  const service = salon?.services?.find((s) => s.id === serviceId);

  // Default to UPI when the salon has a UPI ID configured — it's the
  // recommended payment method. Falls back to cash if no UPI ID.
  useEffect(() => {
    if (salon?.upi_id) {
      setSelectedPaymentMethod('upi');
    }
  }, [salon?.upi_id]);

  // Phase 2: a frozen salon (lapsed owner subscription) is viewable but NOT
  // bookable. Block the booking flow here; backend also returns 403 as the hard
  // gate.
  const notBookable =
    ENABLE_SUBSCRIPTION_ENFORCEMENT && salon?.subscription_active === false;

  const slotsStaffId = useMemo(
    () => (!anyStaffSelected && selectedStaffId ? selectedStaffId : undefined),
    [anyStaffSelected, selectedStaffId],
  );

  // Get available slots with real-time sync
  const {
    data: slotsData,
    isLoading: slotsLoading,
    isSuccess: slotsQuerySuccess,
    refetch: refetchSlots,
  } = useQuery<SlotsResponse>({
    queryKey: ["slots", salonId, serviceId, selectedDate, slotsStaffId ?? ""],
    queryFn: async () => {
      const selected = parseISO(selectedDate);
      const isLocalToday = isValid(selected) && isToday(selected);
      const currentTime = format(new Date(), "HH:mm");
      logger.debug("[BookingFlow] slots.fetch.start", {
        salonId,
        serviceId,
        selectedDate,
        isLocalToday,
        currentTime,
        staffId: slotsStaffId,
      });
      const params: Record<string, string | boolean> = {
        salon_id: salonId,
        date: selectedDate,
        service_id: serviceId,
        current_time: currentTime,
        is_local_today: isLocalToday,
      };
      if (slotsStaffId) {
        params.staff_id = slotsStaffId;
      }
      const response = await bookingRepository.getSlots(params);
      const raw = response?.slots ?? [];
      logger.debug("[BookingFlow] slots.fetch.done", {
        salonId,
        selectedDate,
        staffId: slotsStaffId,
        slotCount: raw.length,
        timesSample: raw.slice(0, 6).map((s: TimeSlot) => s.time),
        allowMultiple: response?.allow_multiple_bookings_per_slot,
      });
      return response;
    },
    enabled: !!selectedDate,
  });

  // Server slots are source of truth; overlay realtime deltas by normalized time key.
  const displaySlots = useMemo(() => {
    const server = slotsData?.slots ?? [];
    const rt = realtimeSlots;
    if (rt.length === 0) return server;
    const overlay = new Map(
      rt.map((s) => [normalizeSlotTimeToHHMM(s.time), s]),
    );
    if (server.length === 0) return rt;
    return server.map((s) => overlay.get(normalizeSlotTimeToHHMM(s.time)) ?? s);
  }, [realtimeSlots, slotsData]);

  const visibleSlots = useMemo(() => {
    const safeSlots = displaySlots.filter(
      (s) => s?.time != null && String(s.time).trim().length > 0,
    );
    // Client-side guard: for today's date, hide slots earlier than current local time.
    // This ensures UX remains correct even if backend timezone differs from device timezone.
    // IMPORTANT: `new Date('YYYY-MM-DD')` is parsed as UTC in JS and can shift dates
    // on devices with non-UTC timezones. Use parseISO so "today" detection is correct.
    const selected = parseISO(selectedDate);
    if (!isValid(selected) || !isToday(selected)) {
      return safeSlots;
    }
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    return safeSlots.filter((slot) => {
      const t = slot.time;
      if (t == null || typeof t !== "string") return false;
      const parts = t.split(":");
      const h = parseInt(parts[0] ?? "", 10);
      const m = parseInt(parts[1] ?? "", 10);
      if (Number.isNaN(h) || Number.isNaN(m)) return false;
      return h * 60 + m >= nowMinutes;
    });
  }, [displaySlots, selectedDate]);

  const effectiveAllowMultiple =
    ENABLE_MULTI_BOOKING_PER_SLOT &&
    (slotsData?.allow_multiple_bookings_per_slot ?? allowMultipleBookings);

  // Get available staff for selected date/time/service
  const { data: availableStaffData, isLoading: staffLoading } =
    useQuery<AvailableStaffResponse>({
      queryKey: [
        "availableStaff",
        salonId,
        serviceId,
        selectedDate,
        selectedSlot,
      ],
      queryFn: async () => {
        if (!selectedSlot) throw new Error("No slot selected");

        return bookingRepository.getAvailableStaff({
          salonId,
          serviceId,
          bookingDate: selectedDate,
          timeSlot: selectedSlot,
        });
      },
      enabled: !!selectedSlot && !!selectedDate && !!serviceId,
    });

  // Update effective price and duration when staff selection changes
  useEffect(() => {
    if (!service) return;

    if (selectedStaffId && availableStaffData) {
      const selectedStaff = availableStaffData.available_staff.find(
        (s) => s.staff_id === selectedStaffId,
      );

      if (selectedStaff) {
        setEffectivePrice(selectedStaff.custom_price ?? service.price);
        setEffectiveDuration(selectedStaff.custom_duration ?? service.duration);
      } else {
        setEffectivePrice(service.price);
        setEffectiveDuration(service.duration);
      }
    } else {
      setEffectivePrice(service.price);
      setEffectiveDuration(service.duration);
    }
  }, [selectedStaffId, availableStaffData, service]);

  // Clear reserve timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Subscribe only while screen is focused (avoids leaking channel when switching tabs).
  useFocusEffect(
    useCallback(() => {
      if (
        !salonId ||
        !selectedDate ||
        !slotsQuerySuccess ||
        !slotsData?.slots
      ) {
        return undefined;
      }

      subscribeToSlots(
        salonId,
        selectedDate,
        slotsData.slots,
        !!slotsData.allow_multiple_bookings_per_slot,
      );

      return () => {
        unsubscribeFromSlots();
      };
    }, [
      salonId,
      serviceId,
      selectedDate,
      slotsStaffId,
      slotsQuerySuccess,
      slotsData?.slots,
      slotsData?.allow_multiple_bookings_per_slot,
    ]),
  );

  // Merge server slot list into the realtime store whenever the slots query updates.
  useEffect(() => {
    if (!slotsData?.slots) return;
    updateSlots(slotsData.slots, !!slotsData.allow_multiple_bookings_per_slot);
  }, [slotsData, updateSlots]);

  // Reserve slot mutation
  const RESERVE_TIMEOUT_MS = 28000;

  const reserveMutation = useMutation({
    mutationFn: async (slot: string) => {
      logger.debug("[BookingFlow] reserve.request", {
        salonId,
        serviceId,
        selectedDate,
        slot,
      });
      const slotKey = normalizeSlotTimeToHHMM(slot) || slot;
      const response = await withTransientNetworkRetry(
        () =>
          bookingRepository.reserveSlot(
            {
              salon_id: salonId,
              service_id: serviceId,
              booking_date: selectedDate,
              time_slot: slotKey,
            },
            { timeout: RESERVE_TIMEOUT_MS },
          ),
        { maxAttempts: 3, baseDelayMs: 500 },
      );
      logger.debug("[BookingFlow] reserve.response", {
        holdId: response?.hold_id,
        fallback: response?.fallback,
        expiresAt: response?.expires_at,
      });
      return response;
    },
    onSuccess: (data) => {
      setHoldId(data.hold_id);
      // Safely use a 90-second countdown regardless of backend timezone formatting
      // to avoid instant-expiration bugs due to clock drift or naive UTC strings.
      setTimeLeft(90);

      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev === null || prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    },
    onError: (error: unknown) => {
      const appErr = isAppError(error) ? error : handleApiError(error);
      logger.debug("[BookingFlow] reserve.error", {
        kind: appErr.kind,
        code: appErr.code,
        message: appErr.message,
      });
      const fallbackMsg = "This slot is currently being held by someone else.";
      const errorMsg = appErr.message || fallbackMsg;

      if (appErr.kind === "conflict") {
        Alert.alert("Slot Unavailable", errorMsg);
        setSelectedSlot(null);
        setHoldId(null);
        setTimeLeft(null);
        return;
      }

      // Keep selected slot; confirm will retry hold with the same retries.
      setHoldId(null);
      setTimeLeft(null);
      if (isTransientNetworkError(error)) {
        Alert.alert(
          "Connection issue",
          "We could not reserve this slot yet. Check your connection and tap Confirm booking to try again, or re-select the time slot.",
        );
        return;
      }

      Alert.alert(
        "Temporary server issue",
        "We could not place a temporary hold right now. Tap Confirm booking to try again, or pick another slot.",
      );
    },
  });

  // Timer expiration effect
  useEffect(() => {
    if (timeLeft === 0) {
      setSelectedSlot(null);
      setHoldId(null);
      setTimeLeft(null);
      Alert.alert(
        "Hold Expired",
        "Your temporary slot reservation has expired. Please select a slot again to continue.",
      );
    }
  }, [timeLeft]);

  // Validate promo code with proper error handling and analytics
  const handleApplyPromo = useCallback(async () => {
    if (!promoCode.trim()) {
      setPromoError("Please enter a promo code");
      return;
    }

    if (!service?.price) {
      setPromoError("Service price not available");
      return;
    }

    setValidatingPromo(true);
    setPromoError(null);

    const startTime = Date.now();

    try {
      const response = await promotionRepository.validatePromoCode({
        code: promoCode.trim().toUpperCase(),
        salon_id: salonId,
        booking_amount: service.price,
      });

      const validationTime = Date.now() - startTime;

      if (response.valid) {
        setPromoApplied(true);
        setPromoDiscount(response.discount_amount || 0);
        setPromoError(null);

        // Track successful promo application
        analytics.track("promo_applied", {
          code: promoCode.trim().toUpperCase(),
          discount: response.discount_amount,
          original_amount: service.price,
          final_amount: response.final_amount,
          validation_time: validationTime,
        });

        Alert.alert(
          "Promo Applied! 🎉",
          `You saved ${formatPrice(response.discount_amount || 0)}`,
          [{ text: "Great!", style: "default" }],
        );
      } else {
        setPromoApplied(false);
        setPromoDiscount(0);
        setPromoError(response.error || "Invalid promo code");

        // Track failed promo attempt
        analytics.track("promo_failed", {
          code: promoCode.trim().toUpperCase(),
          error: response.error,
          validation_time: validationTime,
        });
      }
    } catch (error: unknown) {
      setPromoApplied(false);
      setPromoDiscount(0);

      const appErr = handleApiError(error);
      const errorMessage = appErr.message || "Failed to validate promo code";

      setPromoError(errorMessage);

      // Track validation error
      analytics.track("promo_validation_error", {
        code: promoCode.trim().toUpperCase(),
        error: errorMessage,
      });
    } finally {
      setValidatingPromo(false);
    }
  }, [promoCode, salonId, service?.price]);

  const handleRemovePromo = useCallback(() => {
    analytics.track("promo_removed", {
      code: promoCode.trim().toUpperCase(),
      discount: promoDiscount,
    });

    setPromoCode("");
    setPromoApplied(false);
    setPromoDiscount(0);
    setPromoError(null);
  }, [promoCode, promoDiscount]);

  // Staff selection handlers
  const handleSelectStaff = useCallback(
    (staffId: string | null, isAnyStaff: boolean) => {
      setSelectedStaffId(staffId);
      setAnyStaffSelected(isAnyStaff);

      // Track staff selection
      analytics.track("staff_selected", {
        staff_id: staffId,
        any_staff: isAnyStaff,
        salon_id: salonId,
        service_id: serviceId,
      });
    },
    [salonId, serviceId],
  );

  const handleViewStaffProfile = useCallback(
    async (staffId: string) => {
      const fromList = availableStaffData?.available_staff?.find(
        (s) => s.staff_id === staffId,
      );
      if (fromList) {
        setSelectedStaffForProfile({
          id: fromList.staff_id,
          name: fromList.staff_name,
          image_url: fromList.staff_image_url,
          bio: fromList.staff_bio,
          average_rating: fromList.average_rating,
          total_reviews: fromList.total_reviews,
        } as StaffWithServices);
        setStaffProfileVisible(true);
        return;
      }
      Alert.alert(
        "Staff",
        "Profile details are shown from the list during booking.",
      );
    },
    [availableStaffData],
  );

  const handleSelectFromProfile = useCallback(() => {
    if (selectedStaffForProfile) {
      handleSelectStaff(selectedStaffForProfile.id, false);
    }
  }, [selectedStaffForProfile, handleSelectStaff]);

  // Navigate to the waiting screen after we've kicked off (or attempted) a
  // UPI launch. Kept separate so both the picker and the generic path reuse it.
  const goToPaymentWaiting = useCallback(
    (
      details: {
        bookingId: string;
        bookingReference: string;
        intentUri: string;
        upiId: string;
        payeeName: string;
        amount: number;
      },
      launched: boolean,
    ) => {
      if (!salon || !service) return;
      navigation.replace("PaymentWaiting", {
        bookingId: details.bookingId,
        bookingReference: details.bookingReference,
        salonName: salon.name,
        serviceName: service.name,
        upiId: details.upiId,
        payeeName: details.payeeName,
        amount: details.amount,
        intentUri: details.intentUri,
        appLaunched: launched,
      });
    },
    [salon, service, navigation],
  );

  // Customer picked a specific UPI app from the sheet.
  const handleSelectUpiApp = useCallback(
    async (app: import("../../services/upiIntentService").UpiApp) => {
      if (!upiPicker) return;
      const details = upiPicker;
      setUpiPicker(null);
      const { launched } = await upiIntentService.launchUpiAppByPackage(
        details.intentUri,
        app.androidPackage,
      );
      goToPaymentWaiting(details, launched);
    },
    [upiPicker, goToPaymentWaiting],
  );

  // Customer chose "any UPI app" (or no specific apps were detected) — fire the
  // generic intent and let the system handle it.
  const handlePayWithAnyUpi = useCallback(async () => {
    if (!upiPicker) return;
    const details = upiPicker;
    setUpiPicker(null);
    const { launched } = await upiIntentService.launchUpiApp(details.intentUri);
    goToPaymentWaiting(details, launched);
  }, [upiPicker, goToPaymentWaiting]);

  // Customer dismissed the sheet without choosing — still go to the waiting
  // screen so they can see the salon UPI ID and reopen a UPI app from there.
  const handleCloseUpiPicker = useCallback(() => {
    if (!upiPicker) return;
    const details = upiPicker;
    setUpiPicker(null);
    goToPaymentWaiting(details, false);
  }, [upiPicker, goToPaymentWaiting]);

  // Launch the UPI intent flow for a freshly-created UPI booking. Instead of
  // launching a UPI app directly (which on some devices opens only the default
  // handler), we detect the installed UPI apps and show a picker so the
  // customer chooses GPay / PhonePe / Paytm / WhatsApp themselves.
  const startUpiPayment = useCallback(
    async (bookingId: string) => {
      if (!salon || !service) return;
      try {
        const result = await initiateUpiMutation.mutateAsync(bookingId);
        const details = {
          bookingId,
          bookingReference: result.booking_reference,
          intentUri: result.upi.intent_uri,
          upiId: result.upi.payee_vpa,
          payeeName: result.upi.payee_name,
          amount: result.upi.amount,
        };

        // Open the picker immediately, then fill in detected apps async so the
        // sheet shows a brief "finding your apps" state rather than blocking.
        setUpiApps([]);
        setDetectingUpiApps(true);
        setUpiPicker({ visible: true, ...details });

        upiIntentService
          .getInstalledUpiApps(result.upi.intent_uri)
          .then((apps) => setUpiApps(apps))
          .catch(() => setUpiApps([]))
          .finally(() => setDetectingUpiApps(false));
      } catch (error: unknown) {
        const appErr = isAppError(error) ? error : handleApiError(error);
        Alert.alert(
          "Couldn't start UPI payment",
          appErr.message ||
            "We couldn't start the UPI payment. Your booking is saved — you can pay the salon directly.",
          [
            {
              text: "Go to my bookings",
              onPress: () => navigateToCustomerBookings(navigation),
            },
          ],
        );
      }
    },
    [salon, service, initiateUpiMutation, navigation],
  );

  // Create booking mutation
  const bookingMutation = useMutation({
    mutationFn: async () => {
      const dbPaymentMethod =
        selectedPaymentMethod === "upi" ? "upi" : "salon_cash";

      const normalizedSlot = selectedSlot
        ? normalizeSlotTimeToHHMM(selectedSlot)
        : "";
      const payload = {
        salon_id: salonId,
        service_id: serviceId,
        booking_date: selectedDate,
        time_slot: normalizedSlot || selectedSlot,
        payment_method: dbPaymentMethod,
        promo_code: promoApplied ? promoCode.trim().toUpperCase() : undefined,
        ...(ENABLE_STAFF_SELECTION
          ? {
              staff_id: selectedStaffId ?? undefined,
              any_staff: anyStaffSelected,
            }
          : {}),
      };
      logger.debug("[BookingFlow] booking.create.request", payload);

      if (!idempotencyKeyRef.current) {
        idempotencyKeyRef.current = await createIdempotencyKey();
      }
      const idempotencyKey = idempotencyKeyRef.current;

      const response = await withTransientNetworkRetry(
        () =>
          bookingRepository.createBooking(payload, {
            headers: { "Idempotency-Key": idempotencyKey },
            timeout: RESERVE_TIMEOUT_MS,
          }),
        { maxAttempts: 3, baseDelayMs: 500 },
      );
      logger.debug("[BookingFlow] booking.create.response", response);
      return response;
    },

    onSuccess: (booking: {
      booking_id?: string;
      id?: string;
      message?: string;
    }) => {
      idempotencyKeyRef.current = null;
      const bookingId = booking?.booking_id ?? booking?.id;
      logger.debug("[BookingFlow] booking.create.success", { bookingId });

      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      // Customer Bookings tab uses ['myBookings']; ensure it refetches immediately
      // instead of waiting for pull-to-refresh.
      queryClient.invalidateQueries({ queryKey: ["myBookings"] });
      queryClient.invalidateQueries({ queryKey: ["slots"] });
      unsubscribeFromSlots();

      void Promise.all([
        queryClient.refetchQueries({ queryKey: ["myBookings"] }),
        queryClient.refetchQueries({ queryKey: ["ownerBookings"] }),
        queryClient.refetchQueries({ queryKey: ["recentBookings"] }),
        queryClient.refetchQueries({ queryKey: ["ownerAnalytics"] }),
      ]).catch(() => {});

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setHoldId(null);
      setTimeLeft(null);

      // Schedule a reminder notification 1 hour before
      if (selectedDate && selectedSlot && salon && service) {
        analytics.track("booking_confirmed", {
          salon_id: salonId,
          service_id: serviceId,
          date: selectedDate,
          slot: selectedSlot,
          price: service.price,
        });

        if (bookingId) {
          scheduleBookingReminder({
            bookingId: String(bookingId),
            salonName: salon.name,
            serviceName: service.name,
            date: selectedDate,
            time: selectedSlot,
          }).catch(() => {}); // Silently ignore if notifications not permitted
          presentBookingConfirmedLocal({
            salonName: salon.name,
            serviceName: service.name,
            date: selectedDate,
            time: selectedSlot,
          }).catch(() => {});
        }
      }

      // UPI selected → start UPI intent flow. Booking logic stays independent
      // of payment logic: the booking already exists; we now kick off payment.
      // We NEVER show a "Payment Successful" alert for UPI — the customer is
      // routed to the waiting screen until the salon verifies.
      if (
        selectedPaymentMethod === "upi" &&
        bookingId &&
        service &&
        salon &&
        selectedSlot
      ) {
        void startUpiPayment(String(bookingId));
      } else {
        // Cash booking — keep selectedSlot/selectedDate until user leaves
        // success (success UI calls formatTime(selectedSlot)).
        setBookingComplete(true);
      }
    },
    onError: (error: unknown) => {
      logger.debug("[BookingFlow] booking.create.error", {
        error: String(error),
      });
      const appErr = isAppError(error) ? error : handleApiError(error);
      const errorDetail = appErr.message || "Failed to create booking";
      const statusCode = appErr.status;

      queryClient.invalidateQueries({
        queryKey: ["slots", salonId, serviceId, selectedDate],
      });
      refetchSlots();

      // Salon frozen (owner subscription lapsed) → backend returns 403
      // SALON_UNAVAILABLE. Show a clear, friendly message rather than a raw error.
      if (statusCode === 403 || appErr.code === "SALON_UNAVAILABLE") {
        resetBookingAttempt();
        setSelectedSlot(null);
        setHoldId(null);
        setTimeLeft(null);
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        Alert.alert(
          "Salon unavailable",
          "This salon isn't accepting bookings right now.",
        );
        return;
      }

      const isConflict = appErr.kind === "conflict" || statusCode === 409;
      const isHoldExpired =
        statusCode === 400 &&
        (errorDetail.toLowerCase().includes("hold") ||
          errorDetail.toLowerCase().includes("expired") ||
          errorDetail.toLowerCase().includes("unavailable"));

      if (isConflict || isHoldExpired) {
        resetBookingAttempt();
        setSelectedSlot(null);
        setHoldId(null);
        setTimeLeft(null);
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        Alert.alert(
          "Slot Unavailable",
          errorDetail || "Please pick a time slot again.",
        );
        setSlotConflictError(errorDetail);
        return;
      }

      // Retryable: keep slot + hold; same idempotency key for "Try again"
      Alert.alert("Booking Failed", errorDetail, [
        { text: "Try Again", onPress: () => bookingMutation.mutate() },
        {
          text: "Pick another slot",
          style: "cancel",
          onPress: () => {
            resetBookingAttempt();
            setSelectedSlot(null);
            setHoldId(null);
            setTimeLeft(null);
          },
        },
      ]);
    },
  });

  // Generate next 14 days
  const dates = useMemo(() => {
    const today = startOfToday();
    return [...Array(14)].map((_, i) => {
      const date = addDays(today, i);
      return {
        value: format(date, "yyyy-MM-dd"),
        day: format(date, "EEE"),
        date: format(date, "d"),
        month: format(date, "MMM"),
      };
    });
  }, []);

  const handleConfirmBooking = async () => {
    logger.debug("[BookingFlow] confirm.tap", {
      selectedSlot,
      holdId,
      timeLeft,
      effectiveAllowMultiple,
      salonId,
      serviceId,
      selectedDate,
    });
    if (notBookable) {
      Alert.alert(
        "Booking unavailable",
        "This salon isn't accepting bookings right now. Please check back later.",
      );
      return;
    }
    if (bookingMutation.isPending) {
      logger.debug("[BookingFlow] confirm.blocked", {
        reason: "mutation_pending",
      });
      return;
    }
    if (!selectedSlot) {
      logger.debug("[BookingFlow] confirm.blocked", { reason: "no_slot" });
      Alert.alert("Error", "Please select a time slot");
      return;
    }

    if (reserveMutation.isPending) {
      logger.debug("[BookingFlow] confirm.blocked", {
        reason: "reserve_in_flight",
      });
      return;
    }

    const scopedKey = `${selectedDate}::${selectedSlot}`;
    if (justBookedSlots.has(scopedKey) && !effectiveAllowMultiple) {
      logger.debug("[BookingFlow] confirm.blocked", {
        reason: "justBookedSlots",
        scopedKey,
      });
      Alert.alert(
        "Slot Unavailable",
        "This time slot was just booked by someone else. Please select another slot.",
        [
          {
            text: "OK",
            onPress: () => {
              resetBookingAttempt();
              setSelectedSlot(null);
              setHoldId(null);
              setTimeLeft(null);
              refetchSlots();
            },
          },
        ],
      );
      return;
    }

    let activeHoldId = holdId;

    // Re-place hold if missing (failed reserve on slot tap, or stale timer)
    if (!activeHoldId && selectedSlot) {
      try {
        logger.debug("[BookingFlow] confirm.reReserve", { slot: selectedSlot });
        const reserveData = await reserveMutation.mutateAsync(selectedSlot);
        activeHoldId = reserveData?.hold_id ?? null;
      } catch (reserveErr) {
        const appErr = isAppError(reserveErr)
          ? reserveErr
          : handleApiError(reserveErr);
        logger.debug("[BookingFlow] confirm.reReserve.failed", {
          message: appErr.message,
        });
        Alert.alert(
          isTransientNetworkError(reserveErr)
            ? "Connection issue"
            : "Could not reserve slot",
          isTransientNetworkError(reserveErr)
            ? "Please check your connection and try again in a moment."
            : "Please tap your time slot again, then confirm booking.",
        );
        return;
      }
    }

    if (!activeHoldId) {
      logger.debug("[BookingFlow] confirm.blocked", { reason: "no_hold" });
      Alert.alert(
        "Error",
        "Slot reservation not found. Please tap your time slot again.",
      );
      return;
    }
    if (timeLeft === null || timeLeft <= 0) {
      logger.debug("[BookingFlow] confirm.reReserve", {
        reason: "hold_expired",
        timeLeft,
      });
      try {
        const reserveData = await reserveMutation.mutateAsync(selectedSlot);
        activeHoldId = reserveData?.hold_id ?? activeHoldId;
      } catch {
        Alert.alert(
          "Hold expired",
          "Your temporary reservation expired. Please select your time slot again.",
        );
        resetBookingAttempt();
        setSelectedSlot(null);
        setHoldId(null);
        setTimeLeft(null);
        return;
      }
    }

    setSlotConflictError(null);
    bookingMutation.mutate();
  };

  // Handle refresh needed indicator
  const handleRefreshNeeded = () => {
    refreshSlots();
    refetchSlots();
  };

  // Show conflict error when booking fails due to conflict
  useEffect(() => {
    if (slotConflictError) {
      Alert.alert("Booking Conflict", slotConflictError, [
        {
          text: "OK",
          onPress: () => {
            setSelectedSlot(null);
            refetchSlots();
          },
        },
      ]);
    }
  }, [slotConflictError]);

  useEffect(() => {
    if (!bookingComplete) {
      successNavigatedRef.current = false;
      return;
    }
    const timer = setTimeout(() => {
      if (!successNavigatedRef.current) {
        successNavigatedRef.current = true;
        // Pop the Discover stack back to root before switching tabs so the
        // next tap on the Discover tab does not refocus this success screen.
        navigateToCustomerBookings(navigation);
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [bookingComplete, navigation]);

  if (bookingComplete) {
    return (
      <ScreenWrapper variant="auth">
        <ScrollView
          contentContainerStyle={styles.successScroll}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.successContent}>
            <View style={styles.successIconContainer}>
              <Ionicons
                name="checkmark"
                size={48}
                color={theme.colors.primary}
              />
            </View>
            <Text style={styles.successTitle}>Reservation Confirmed</Text>
            <Text style={styles.successSubtitle}>
              Your luxury experience awaits at {salon?.name}
            </Text>

            <View style={styles.confirmationCard}>
              <Text style={styles.confirmationHeader}>Booking Details</Text>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Service</Text>
                <Text style={styles.summaryValue}>{service?.name}</Text>
              </View>

              <View style={styles.summarySeparator} />

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Appointment</Text>
                <Text style={styles.summaryValue}>
                  {format(new Date(selectedDate), "EEEE, d MMM")}
                  {selectedSlot ? ` • ${formatTime(selectedSlot)}` : ""}
                </Text>
              </View>

              <View style={styles.summarySeparator} />

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Investment</Text>
                <Text style={styles.summaryValueGold}>
                  {formatPrice(service?.price || 0)}
                </Text>
              </View>
            </View>

            {/* Primary Action: Get Directions */}
            {salon?.latitude && salon?.longitude && (
              <TouchableOpacity
                style={styles.primaryDirectionButton}
                onPress={() =>
                  openNativeDirections(
                    { latitude: salon.latitude, longitude: salon.longitude },
                    salon.name,
                  )
                }
              >
                <Ionicons
                  name="location"
                  size={20}
                  color={theme.colors.textInverse}
                />
                <Text style={styles.primaryDirectionText}>
                  Get Directions to Salon
                </Text>
              </TouchableOpacity>
            )}

            <View style={styles.successActionRow}>
              <TouchableOpacity
                style={[styles.secondaryButton, styles.primarySuccessButton]}
                onPress={() => {
                  successNavigatedRef.current = true;
                  setBookingComplete(false);
                  setSelectedSlot(null);
                  setHoldId(null);
                  setTimeLeft(null);
                  navigateToCustomerBookings(navigation);
                }}
              >
                <Text style={styles.primarySuccessButtonText}>
                  View Bookings
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => {
                  successNavigatedRef.current = true;
                  setBookingComplete(false);
                  setSelectedSlot(null);
                  setHoldId(null);
                  setTimeLeft(null);
                  resetToCustomerDiscover(navigation);
                }}
              >
                <Text style={styles.secondaryButtonText}>Back to Home</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper variant="stack">
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Book Appointment</Text>
          <Text style={styles.headerSubtitle}>{salon?.name}</Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Frozen-salon notice (Phase 2): viewable but not bookable */}
        {notBookable && (
          <View style={styles.frozenBanner}>
            <Ionicons name="lock-closed" size={20} color={theme.colors.error} />
            <Text style={styles.frozenBannerText}>
              This salon isn&apos;t accepting bookings right now. Please check
              back later.
            </Text>
          </View>
        )}

        {/* Service Info */}
        {service && (
          <View style={styles.serviceCard}>
            <Text style={styles.serviceName}>{service.name}</Text>
            <View style={styles.serviceDetails}>
              <View style={styles.detailItem}>
                <Ionicons
                  name="time-outline"
                  size={16}
                  color={theme.colors.textSecondary}
                />
                <Text style={styles.detailText}>{service.duration} mins</Text>
              </View>
              <Text style={styles.servicePrice}>
                {formatPrice(service.price)}
              </Text>
            </View>
          </View>
        )}

        {/* Date Selection */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="calendar" size={20} color={theme.colors.primary} />
            <Text style={styles.sectionTitle}>Select Date</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.datesContainer}
          >
            {dates.map((date) => (
              <TouchableOpacity
                key={date.value}
                style={[
                  styles.dateCard,
                  selectedDate === date.value && styles.dateCardSelected,
                ]}
                onPress={() => {
                  setSelectedDate(date.value);
                  setSelectedSlot(null);
                  setSlotConflictError(null);
                  unsubscribeFromSlots(); // Unsubscribe from previous date
                }}
              >
                <Text
                  style={[
                    styles.dateDay,
                    selectedDate === date.value && styles.dateTextSelected,
                  ]}
                >
                  {date.day}
                </Text>
                <Text
                  style={[
                    styles.dateNum,
                    selectedDate === date.value && styles.dateTextSelected,
                  ]}
                >
                  {date.date}
                </Text>
                <Text
                  style={[
                    styles.dateMonth,
                    selectedDate === date.value && styles.dateTextSelected,
                  ]}
                >
                  {date.month}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Time Selection */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="time" size={20} color={theme.colors.primary} />
            <Text style={styles.sectionTitle}>Select Time</Text>
          </View>

          {/* Refresh needed indicator */}
          {needsRefresh && (
            <TouchableOpacity
              style={styles.refreshBanner}
              onPress={handleRefreshNeeded}
            >
              <Ionicons name="refresh" size={16} color={theme.colors.primary} />
              <Text style={styles.refreshText}>
                Bookings updated. Tap to refresh.
              </Text>
            </TouchableOpacity>
          )}

          {/* Hold Countdown */}
          {timeLeft !== null && timeLeft > 0 && selectedSlot && (
            <View
              style={[
                styles.infoBanner,
                {
                  backgroundColor: theme.colors.primary + "10",
                  borderColor: theme.colors.primary,
                },
              ]}
            >
              <Ionicons
                name="timer-outline"
                size={18}
                color={theme.colors.primary}
              />
              <Text
                style={[
                  styles.infoText,
                  { color: theme.colors.primary, fontFamily: fonts.bodyBold },
                ]}
              >
                Slot held for {Math.floor(timeLeft / 60)}:
                {(timeLeft % 60).toString().padStart(2, "0")}
              </Text>
            </View>
          )}

          {/* Multiple bookings info */}
          {effectiveAllowMultiple && (
            <View style={styles.infoBanner}>
              <Ionicons
                name="information-circle"
                size={16}
                color={theme.colors.primary}
              />
              <Text style={styles.infoText}>
                Up to {slotsData?.max_bookings_per_slot || 1} bookings per slot
              </Text>
            </View>
          )}

          {slotsLoading ? (
            <ActivityIndicator
              color={theme.colors.primary}
              style={{ marginTop: 20 }}
            />
          ) : visibleSlots && visibleSlots.length > 0 ? (
            <View style={styles.slotsGrid}>
              {visibleSlots.map((slot) => {
                const scopedKey = `${selectedDate}::${slot.time}`;
                const isJustBooked = justBookedSlots.has(scopedKey);
                const isMulti =
                  ENABLE_MULTI_BOOKING_PER_SLOT && slot.allow_multiple;
                const count = slot.booking_count || 0;
                const max = slot.max_bookings || 1;
                const isFillingUp = isMulti && count > 0 && count < max;
                const isFull = !slot.available;

                return (
                  <TouchableOpacity
                    key={slot.time}
                    style={[
                      styles.slotButton,
                      isFull && styles.slotDisabled,
                      isFillingUp && styles.slotFillingUp,
                      selectedSlot === slot.time && styles.slotSelected,
                      isJustBooked && !isMulti && styles.slotJustBooked,
                    ]}
                    onPress={() => {
                      if (selectedSlot !== slot.time) {
                        resetBookingAttempt();
                        setSelectedSlot(slot.time);
                        reserveMutation.mutate(slot.time);
                        setSelectedStaffId(null);
                        setAnyStaffSelected(true);
                      }
                    }}
                    disabled={!slot.available}
                  >
                    <Text
                      style={[
                        styles.slotText,
                        isFull && styles.slotTextDisabled,
                        selectedSlot === slot.time && styles.slotTextSelected,
                        isJustBooked && !isMulti && styles.slotTextJustBooked,
                      ]}
                    >
                      {formatTime(slot.time)}
                    </Text>
                    {/* Multi-booking: show count/max */}
                    {isMulti && (
                      <Text
                        style={[
                          styles.slotCapacityText,
                          isFull && styles.slotCapacityFull,
                          selectedSlot === slot.time &&
                            styles.slotCapacitySelected,
                          isFillingUp && styles.slotCapacityFilling,
                        ]}
                      >
                        {isFull ? "Full" : `${count}/${max}`}
                      </Text>
                    )}
                    {/* Single booking: show "Booked" label */}
                    {!isMulti && isFull && (
                      <Text style={styles.slotBookedLabel}>Booked</Text>
                    )}
                    {/* Just taken indicator (single mode only) */}
                    {isJustBooked && !isMulti && (
                      <View style={styles.justBookedIndicator}>
                        <Text style={styles.justBookedText}>Just taken!</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <View style={styles.noSlots}>
              <Ionicons
                name="alert-circle-outline"
                size={32}
                color={theme.colors.textSecondary}
              />
              <Text style={styles.noSlotsText}>
                No available slots for this date
              </Text>
            </View>
          )}
        </View>

        {/* Staff Selection - Only show when slot is selected (Phase 4 flag) */}
        {ENABLE_STAFF_SELECTION && selectedSlot && availableStaffData && (
          <StaffPicker
            availableStaff={availableStaffData.available_staff}
            selectedStaffId={selectedStaffId}
            anyStaffSelected={anyStaffSelected}
            onSelectStaff={handleSelectStaff}
            loading={staffLoading}
            basePrice={service?.price}
          />
        )}

        {/* Payment Method */}
        <PaymentMethodPicker
          selected={selectedPaymentMethod}
          onSelect={setSelectedPaymentMethod}
          salonHasUpi={!!salon?.upi_id}
          styles={pickerStyles}
        />

        {/* Promo Code Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="pricetag" size={20} color={theme.colors.primary} />
            <Text style={styles.sectionTitle}>Promo Code</Text>
          </View>

          {!promoApplied ? (
            <View style={styles.promoInputContainer}>
              <View style={styles.promoInputWrapper}>
                <Ionicons
                  name="ticket-outline"
                  size={20}
                  color={theme.colors.textSecondary}
                  style={{ marginLeft: 16 }}
                />
                <TextInput
                  style={styles.promoInput}
                  placeholder="Enter promo code"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={promoCode}
                  onChangeText={(text) => {
                    setPromoCode(text.toUpperCase());
                    setPromoError(null);
                  }}
                  autoCapitalize="characters"
                  editable={!validatingPromo}
                />
              </View>
              <TouchableOpacity
                style={[
                  styles.applyPromoButton,
                  validatingPromo && styles.applyPromoButtonDisabled,
                ]}
                onPress={handleApplyPromo}
                disabled={validatingPromo || !promoCode.trim()}
              >
                {validatingPromo ? (
                  <ActivityIndicator
                    size="small"
                    color={theme.colors.textInverse}
                  />
                ) : (
                  <Text style={styles.applyPromoText}>Apply</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.promoAppliedContainer}>
              <View style={styles.promoAppliedContent}>
                <Ionicons
                  name="checkmark-circle"
                  size={24}
                  color={theme.colors.success}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.promoAppliedCode}>{promoCode}</Text>
                  <Text style={styles.promoAppliedSavings}>
                    You saved {formatPrice(promoDiscount)}!
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={handleRemovePromo}>
                <Ionicons
                  name="close-circle"
                  size={24}
                  color={theme.colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
          )}

          {promoError && (
            <View style={styles.promoErrorContainer}>
              <Ionicons
                name="alert-circle"
                size={16}
                color={theme.colors.error}
              />
              <Text style={styles.promoErrorText}>{promoError}</Text>
            </View>
          )}
        </View>

        {selectedSlot && (
          <View style={styles.bookingSummary}>
            <Text style={styles.summaryTitle}>Booking Summary</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Date</Text>
              <Text style={styles.summaryValue}>
                {format(new Date(selectedDate), "EEEE, d MMMM yyyy")}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Time</Text>
              <Text style={styles.summaryValue}>
                {formatTime(selectedSlot)}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Duration</Text>
              <Text style={styles.summaryValue}>{effectiveDuration} mins</Text>
            </View>
            {/* Show staff selection */}
            {selectedStaffId && availableStaffData && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Stylist</Text>
                <Text style={styles.summaryValue}>
                  {availableStaffData.available_staff.find(
                    (s) => s.staff_id === selectedStaffId,
                  )?.staff_name || "Selected"}
                </Text>
              </View>
            )}
            {anyStaffSelected && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Stylist</Text>
                <Text style={styles.summaryValue}>Any Available</Text>
              </View>
            )}
            {promoApplied && promoDiscount > 0 && (
              <>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Original Price</Text>
                  <Text style={[styles.summaryValue, styles.strikethrough]}>
                    {formatPrice(effectivePrice)}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text
                    style={[
                      styles.summaryLabel,
                      { color: theme.colors.success },
                    ]}
                  >
                    Discount ({promoCode})
                  </Text>
                  <Text
                    style={[
                      styles.summaryValue,
                      { color: theme.colors.success },
                    ]}
                  >
                    -{formatPrice(promoDiscount)}
                  </Text>
                </View>
              </>
            )}
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>
                {formatPrice(effectivePrice - promoDiscount)}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Confirm Button */}
      {selectedSlot && (
        <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
          <Button
            title={selectedPaymentMethod === 'upi' ? 'Book & Pay' : 'Confirm Booking'}
            onPress={handleConfirmBooking}
            loading={bookingMutation.isPending || reserveMutation.isPending}
            disabled={notBookable}
            icon={
              <Ionicons
                name={selectedPaymentMethod === 'upi' ? 'phone-portrait-outline' : 'card-outline'}
                size={20}
                color={theme.colors.textInverse}
              />
            }
          />
        </View>
      )}

      {/* Staff Profile Modal */}
      <StaffProfileCard
        staff={selectedStaffForProfile}
        visible={staffProfileVisible}
        onClose={() => setStaffProfileVisible(false)}
        onSelect={handleSelectFromProfile}
        showSelectButton={true}
      />

      {/* UPI app picker — lets the customer choose which installed UPI app to
          pay with (GPay / PhonePe / Paytm / WhatsApp …) instead of Android
          silently opening only the default handler. */}
      <UpiAppPickerSheet
        visible={!!upiPicker}
        apps={upiApps}
        detecting={detectingUpiApps}
        amount={upiPicker?.amount ?? 0}
        payeeName={upiPicker?.payeeName}
        onSelectApp={handleSelectUpiApp}
        onPayWithAny={handlePayWithAnyUpi}
        onClose={handleCloseUpiPicker}
      />
    </ScreenWrapper>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
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
      alignItems: "center",
      justifyContent: "center",
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
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      backgroundColor: theme.colors.error + "14",
      borderWidth: 1,
      borderColor: theme.colors.error + "55",
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
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    detailItem: {
      flexDirection: "row",
      alignItems: "center",
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
      flexDirection: "row",
      alignItems: "center",
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
      justifyContent: "center",
      alignItems: "center",
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
      textTransform: "uppercase",
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
      flexDirection: "row",
      flexWrap: "wrap",
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
      alignItems: "center",
    },
    slotDisabled: {
      backgroundColor: "rgba(18, 20, 17, 0.3)",
      borderColor: "transparent",
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
      textDecorationLine: "line-through",
    },
    slotTextSelected: {
      color: theme.colors.textInverse,
    },
    noSlots: {
      alignItems: "center",
      padding: 40,
      backgroundColor: theme.colors.surface,
      borderRadius: 24,
      gap: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderStyle: "dashed",
    },
    noSlotsText: {
      fontFamily: fonts.body,
      color: theme.colors.textTertiary,
    },
    paymentOption: {
      flexDirection: "row",
      alignItems: "center",
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
      alignItems: "center",
      justifyContent: "center",
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
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: theme.colors.primary + "1A", // transparent primary
      padding: 12,
      borderRadius: 8,
      marginBottom: 16,
    },
    refreshText: {
      fontSize: 13,
      color: theme.colors.primary,
      fontWeight: "500",
    },
    infoBanner: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: theme.colors.secondary + "1A",
      padding: 12,
      borderRadius: 8,
      marginBottom: 16,
    },
    infoText: {
      fontSize: 13,
      color: theme.colors.secondary,
      fontWeight: "500",
    },
    slotFillingUp: {
      backgroundColor: theme.colors.warning + "1A",
      borderColor: theme.colors.warning,
    },
    slotCapacityText: {
      fontSize: 10,
      color: theme.colors.textSecondary,
      marginTop: 2,
      fontWeight: "500",
    },
    slotCapacityFull: {
      color: theme.colors.error,
      fontWeight: "600",
    },
    slotCapacitySelected: {
      color: "rgba(255,255,255,0.7)",
    },
    slotCapacityFilling: {
      color: theme.colors.warning,
    },
    slotBookedLabel: {
      fontSize: 10,
      color: theme.colors.error,
      marginTop: 2,
      fontWeight: "600",
    },
    slotJustBooked: {
      borderColor: theme.colors.error,
      borderWidth: 2,
    },
    slotTextJustBooked: {
      color: theme.colors.error,
    },
    justBookedIndicator: {
      position: "absolute",
      bottom: -6,
      left: "50%",
      transform: [{ translateX: -30 }],
      backgroundColor: theme.colors.error,
      borderRadius: 10,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    justBookedText: {
      fontSize: 9,
      color: "#FFFFFF",
      fontWeight: "600",
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
      fontWeight: "700",
      color: theme.colors.text,
      marginBottom: 16,
    },
    summaryRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 12,
    },
    summaryLabel: {
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    summaryValue: {
      fontSize: 14,
      fontWeight: "500",
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
      fontWeight: "600",
      color: theme.colors.text,
    },
    totalValue: {
      fontSize: 18,
      fontWeight: "700",
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
      alignItems: "center",
      justifyContent: "center",
    },
    successIconContainer: {
      width: 96,
      height: 96,
      borderRadius: 48,
      backgroundColor: theme.colors.primary + "1A",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 24,
    },
    successTitle: {
      fontFamily: fonts.heading,
      fontSize: 28,
      color: theme.colors.text,
      marginBottom: 12,
      textAlign: "center",
    },
    successSubtitle: {
      fontFamily: fonts.body,
      fontSize: 16,
      color: theme.colors.textSecondary,
      textAlign: "center",
      marginBottom: 40,
      paddingHorizontal: 20,
    },
    confirmationCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 24,
      padding: 24,
      width: "100%",
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginBottom: 24,
    },
    confirmationHeader: {
      fontFamily: fonts.bodyBold,
      fontSize: 14,
      color: theme.colors.textTertiary,
      textTransform: "uppercase",
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
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.primary,
      paddingVertical: 16,
      borderRadius: borderRadius.pill,
      width: "100%",
      marginBottom: 16,
      gap: 8,
    },
    primaryDirectionText: {
      fontFamily: fonts.bodyBold,
      color: theme.colors.textInverse,
      fontSize: 16,
    },
    successActionRow: {
      flexDirection: "row",
      gap: 12,
      width: "100%",
    },
    secondaryButton: {
      flex: 1,
      paddingVertical: 16,
      borderRadius: borderRadius.pill,
      backgroundColor: theme.colors.surfaceSecondary,
      alignItems: "center",
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
      flexDirection: "row",
      gap: 12,
      alignItems: "flex-start",
    },
    promoInputWrapper: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: theme.colors.border,
      overflow: "hidden",
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
      alignItems: "center",
      justifyContent: "center",
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
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: theme.colors.success + "1A",
      padding: 16,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: theme.colors.success,
    },
    promoAppliedContent: {
      flexDirection: "row",
      alignItems: "center",
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
      flexDirection: "row",
      alignItems: "center",
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
      textDecorationLine: "line-through",
      color: theme.colors.textTertiary,
    },
  });

export default BookingScreen;
