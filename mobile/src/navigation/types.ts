import type { NavigatorScreenParams, CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

// =============================================================================
// AUTH STACK
// =============================================================================
export type AuthStackParamList = {
  Login: undefined;
  RoleSelect: undefined;
  Signup: { role: 'customer' | 'owner' };
  ForgotPassword: { prefilledEmail?: string } | undefined;
  VerifyOtp: { 
    email: string; 
    type: 'signup' | 'recovery' | 'magiclink'; 
    isPending?: boolean;
    otpSendResult?: 'success' | 'error';
  };
  ResetPassword: { token: string };
  PrivacyPolicy: undefined;
  Terms: undefined;
};

// =============================================================================
// CUSTOMER NAVIGATION
// =============================================================================
export type CustomerDiscoverStackParamList = {
  DiscoverMain: undefined;
  SalonDetail: { salonId: string };
  ServiceDetail: { serviceId: string; salonId: string; salonName: string };
  Booking: { salonId: string; serviceId: string };
  RescheduleBooking: {
    bookingId: string;
    currentDate: string;
    currentSlot: string;
    salonId: string;
    serviceId: string;
    salonName: string;
    serviceName: string;
  };
  // UPI intent + manual-verification waiting screen. The customer pays the
  // salon's UPI ID directly; the booking is confirmed only after the salon
  // owner verifies. We never auto-show "Payment Successful".
  PaymentWaiting: {
    bookingId: string;
    bookingReference: string;
    salonName: string;
    serviceName: string;
    /** Salon UPI ID (payee VPA) shown for manual payment fallback. */
    upiId: string;
    payeeName: string;
    /** Total payable in rupees (display only; server is authoritative). */
    amount: number;
    /** `upi://pay?...` deep link for re-launching the UPI app on retry. */
    intentUri: string;
    /** Whether a UPI app actually opened on the first attempt. */
    appLaunched: boolean;
  };
  WriteReview: { salonId: string; bookingId: string };
  PrivacyPolicy: undefined;
  Terms: undefined;
  Contact: undefined;
  PaymentsHelp: undefined;
};

export type ProfileStackParamList = {
  ProfileMain: undefined;
  MyOffers: undefined;
  PrivacyPolicy: undefined;
  Terms: undefined;
  Contact: undefined;
  PaymentsHelp: undefined;
};

export type CustomerTabParamList = {
  Discover: NavigatorScreenParams<CustomerDiscoverStackParamList>;
  Bookings: undefined;
  Profile: NavigatorScreenParams<ProfileStackParamList>;
};

// =============================================================================
// OWNER NAVIGATION
// =============================================================================
export type OwnerDashboardStackParamList = {
  DashboardMain: undefined;
  ManageSalon: undefined;
};

export type OwnerSettingsStackParamList = {
  SettingsMain: undefined;
  ManageSalon: undefined;
  StaffManagement: undefined;
  PromoManagement: undefined;
  Subscription: undefined;
  SubscriptionCheckout: undefined;
  PaymentHistory: undefined;
  UpiPaymentSettings: undefined;
  PrivacyPolicy: undefined;
  Terms: undefined;
  Contact: undefined;
  PaymentsHelp: undefined;
  BankDetails: undefined;
};

export type OwnerTabParamList = {
  Dashboard: NavigatorScreenParams<OwnerDashboardStackParamList>;
  Bookings: { highlightBookingId?: string } | undefined;
  Services: { openAddService?: boolean } | undefined;
  Settings: NavigatorScreenParams<OwnerSettingsStackParamList>;
};

// =============================================================================
// ROOT
// =============================================================================
export type RootStackParamList = {
  Onboarding: undefined;
  Auth: NavigatorScreenParams<AuthStackParamList>;
  CompleteProfile: { prefilledName?: string; prefilledPhone?: string; prefilledRole?: 'customer' | 'owner' } | undefined;
  CustomerTabs: NavigatorScreenParams<CustomerTabParamList>;
  OwnerTabs: NavigatorScreenParams<OwnerTabParamList>;
};

// =============================================================================
// SCREEN PROP HELPERS
// =============================================================================
export type AuthScreenProps<T extends keyof AuthStackParamList> =
  CompositeScreenProps<
    NativeStackScreenProps<AuthStackParamList, T>,
    NativeStackScreenProps<RootStackParamList>
  >;

export type CustomerDiscoverScreenProps<T extends keyof CustomerDiscoverStackParamList> =
  CompositeScreenProps<
    NativeStackScreenProps<CustomerDiscoverStackParamList, T>,
    CompositeScreenProps<
      BottomTabScreenProps<CustomerTabParamList>,
      NativeStackScreenProps<RootStackParamList>
    >
  >;

export type CustomerTabScreenProps<T extends keyof CustomerTabParamList> =
  CompositeScreenProps<
    BottomTabScreenProps<CustomerTabParamList, T>,
    NativeStackScreenProps<RootStackParamList>
  >;

export type ProfileStackScreenProps<T extends keyof ProfileStackParamList> =
  CompositeScreenProps<
    NativeStackScreenProps<ProfileStackParamList, T>,
    CompositeScreenProps<
      BottomTabScreenProps<CustomerTabParamList>,
      NativeStackScreenProps<RootStackParamList>
    >
  >;

export type OwnerDashboardScreenProps<T extends keyof OwnerDashboardStackParamList> =
  CompositeScreenProps<
    NativeStackScreenProps<OwnerDashboardStackParamList, T>,
    CompositeScreenProps<
      BottomTabScreenProps<OwnerTabParamList>,
      NativeStackScreenProps<RootStackParamList>
    >
  >;

export type OwnerSettingsScreenProps<T extends keyof OwnerSettingsStackParamList> =
  CompositeScreenProps<
    NativeStackScreenProps<OwnerSettingsStackParamList, T>,
    CompositeScreenProps<
      BottomTabScreenProps<OwnerTabParamList>,
      NativeStackScreenProps<RootStackParamList>
    >
  >;

export type OwnerTabScreenProps<T extends keyof OwnerTabParamList> =
  CompositeScreenProps<
    BottomTabScreenProps<OwnerTabParamList, T>,
    NativeStackScreenProps<RootStackParamList>
  >;

export type RootScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;
