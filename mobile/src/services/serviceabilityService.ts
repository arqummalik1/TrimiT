import apiClient from "./apiClient";
import { ServiceabilityResult, WaitlistJoinPayload } from "../types";

export const serviceabilityService = {
  check: async (
    coords: { lat: number; lng: number } | null
  ): Promise<ServiceabilityResult> => {
    const params = new URLSearchParams();
    if (coords) {
      params.append("lat", String(coords.lat));
      params.append("lng", String(coords.lng));
    }
    const qs = params.toString();
    const response = await apiClient.get(
      `/serviceability/check${qs ? `?${qs}` : ""}`
    );
    return response.data as ServiceabilityResult;
  },

  joinWaitlist: async (
    payload: WaitlistJoinPayload
  ): Promise<{ message: string; code: string }> => {
    const response = await apiClient.post("/serviceability/waitlist", payload);
    return response.data;
  },
};
