import type { NavigatorScreenParams } from '@react-navigation/native';
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
  Booking: { salonId: string; serviceId: string };
  WriteReview: { salonId: string; bookingId?: string };
};

export type CustomerTabParamList = {
  Discover: NavigatorScreenParams<CustomerDiscoverStackParamList>;
  Bookings: undefined;
  Profile: undefined;
};

// =============================================================================
// OWNER NAVIGATION
// =============================================================================
export type OwnerDashboardStackParamList = {
  DashboardMain: undefined;
  ManageSalon: undefined;
};

export type OwnerTabParamList = {
  Dashboard: NavigatorScreenParams<OwnerDashboardStackParamList>;
  Bookings: undefined;
  Services: undefined;
  Settings: undefined;
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
  NativeStackScreenProps<AuthStackParamList, T>;

export type CustomerDiscoverScreenProps<T extends keyof CustomerDiscoverStackParamList> =
  NativeStackScreenProps<CustomerDiscoverStackParamList, T>;

export type CustomerTabScreenProps<T extends keyof CustomerTabParamList> =
  BottomTabScreenProps<CustomerTabParamList, T>;

export type OwnerDashboardScreenProps<T extends keyof OwnerDashboardStackParamList> =
  NativeStackScreenProps<OwnerDashboardStackParamList, T>;

export type OwnerTabScreenProps<T extends keyof OwnerTabParamList> =
  BottomTabScreenProps<OwnerTabParamList, T>;

export type RootScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;
