let ownerRealtimeSubscribed = false;

export function setOwnerRealtimeSubscribed(active: boolean): void {
  ownerRealtimeSubscribed = active;
}

export function isOwnerRealtimeSubscribed(): boolean {
  return ownerRealtimeSubscribed;
}
