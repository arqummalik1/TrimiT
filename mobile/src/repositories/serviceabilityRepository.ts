import { serviceabilityService } from "../services/serviceabilityService";
import { ServiceabilityResult, WaitlistJoinPayload } from "../types";

export const serviceabilityRepository = {
  async check(
    coords: { lat: number; lng: number } | null
  ): Promise<ServiceabilityResult> {
    return await serviceabilityService.check(coords);
  },

  async joinWaitlist(
    payload: WaitlistJoinPayload
  ): Promise<{ message: string; code: string }> {
    return await serviceabilityService.joinWaitlist(payload);
  },
};
