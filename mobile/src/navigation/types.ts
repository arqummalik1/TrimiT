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
  ForgotPassword: undefined;
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
  Payment: {
    bookingId: string;
    amount: number;
    salonName: string;
    serviceName: string;
    bookingDate: string;
    timeSlot: string;
  };
  WriteReview: { salonId: string; bookingId?: string };
  PrivacyPolicy: undefined;
  Terms: undefined;
  Contact: undefined;
};

export type ProfileStackParamList = {
  ProfileMain: undefined;
  PrivacyPolicy: undefined;
  Terms: undefined;
  Contact: undefined;
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
  PrivacyPolicy: undefined;
  Terms: undefined;
  Contact: undefined;
};

export type OwnerTabParamList = {
  Dashboard: NavigatorScreenParams<OwnerDashboardStackParamList>;
  Bookings: undefined;
  Services: undefined;
  Staff: undefined;
  Promos: undefined;
  Settings: NavigatorScreenParams<OwnerSettingsStackParamList>;
};

// =============================================================================
// ROOT
// =============================================================================
export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
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
