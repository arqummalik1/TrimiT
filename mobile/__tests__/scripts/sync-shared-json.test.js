/**
 * @jest-environment node
 */
const fs = require('fs');
const path = require('path');
const { FILES } = require('../../scripts/sync-shared-json.cjs');

describe('sync-shared-json', () => {
  it('copies push-constants.json into mobile/src/config for Metro', () => {
    const dest = path.join(__dirname, '../../src/config/push-constants.json');
    expect(FILES).toContain('push-constants.json');
    expect(fs.existsSync(dest)).toBe(true);
    const parsed = JSON.parse(fs.readFileSync(dest, 'utf8'));
    expect(parsed.bookingChannelId).toBe('bookings_v4');
    expect(parsed.updatesChannelId).toBe('booking_updates');
    expect(parsed.ownerBookingCategoryId).toBe('owner_booking_actions');
    expect(parsed.ownerUrgentEventTypes).toEqual([
      'new_booking',
      'payment_received',
      'payment_awaiting_verification',
    ]);
  });
});
