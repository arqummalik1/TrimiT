# Phase 1.2: One-Click Rescheduling - Technical Specification

## 🎯 Objective
Allow customers to change their booking time without canceling and re-booking, using atomic database operations to prevent race conditions.

---

## 🏗️ Architecture Overview

### Core Principle: Atomic Slot Swap
The reschedule operation must be **atomic** - either both the old slot is released AND the new slot is reserved, or neither happens. This prevents:
- Double bookings
- Lost bookings
- Orphaned slot holds
- Race conditions

### Database Strategy
```sql
-- Single transaction that:
1. Validates new slot availability
2. Releases old slot
3. Reserves new slot
4. Updates booking record
5. Creates audit trail
-- All or nothing
```

---

## 📊 Database Schema Changes

### 1. Add Reschedule Tracking
```sql
-- Track reschedule history
CREATE TABLE booking_reschedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  old_date DATE NOT NULL,
  old_time_slot VARCHAR(10) NOT NULL,
  new_date DATE NOT NULL,
  new_time_slot VARCHAR(10) NOT NULL,
  initiated_by UUID REFERENCES auth.users(id),
  initiated_by_role VARCHAR(20) CHECK (initiated_by_role IN ('customer', 'owner')),
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for performance
CREATE INDEX idx_booking_reschedules_booking_id ON booking_reschedules(booking_id);
CREATE INDEX idx_booking_reschedules_created_at ON booking_reschedules(created_at DESC);

-- RLS Policies
ALTER TABLE booking_reschedules ENABLE ROW LEVEL SECURITY;

-- Customers can view their own reschedule history
CREATE POLICY "Users can view own reschedule history"
  ON booking_reschedules FOR SELECT
  USING (
    initiated_by = auth.uid()
    OR booking_id IN (
      SELECT id FROM bookings WHERE user_id = auth.uid()
    )
  );

-- Owners can view reschedules for their salon bookings
CREATE POLICY "Owners can view salon reschedule history"
  ON booking_reschedules FOR SELECT
  USING (
    booking_id IN (
      SELECT b.id FROM bookings b
      JOIN salons s ON b.salon_id = s.id
      WHERE s.owner_id = auth.uid()
    )
  );
```

### 2. Add Reschedule Metadata to Bookings
```sql
-- Add reschedule tracking to bookings table
ALTER TABLE bookings 
ADD COLUMN reschedule_count INTEGER DEFAULT 0,
ADD COLUMN last_rescheduled_at TIMESTAMPTZ,
ADD COLUMN original_date DATE,
ADD COLUMN original_time_slot VARCHAR(10);

-- Populate original values for existing bookings
UPDATE bookings 
SET original_date = booking_date,
    original_time_slot = time_slot
WHERE original_date IS NULL;
```

---

## 🔧 Backend Implementation

### 1. Atomic Reschedule RPC Function
```sql
CREATE OR REPLACE FUNCTION reschedule_booking_atomic(
  p_booking_id UUID,
  p_new_date DATE,
  p_new_time_slot VARCHAR(10),
  p_user_id UUID,
  p_user_role VARCHAR(20),
  p_reason TEXT DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
  v_booking RECORD;
  v_salon_id UUID;
  v_service_id UUID;
  v_old_date DATE;
  v_old_time_slot VARCHAR(10);
  v_slot_available BOOLEAN;
  v_current_bookings INTEGER;
  v_max_bookings INTEGER;
  v_allow_multiple BOOLEAN;
  v_result JSON;
BEGIN
  -- 1. Get current booking details with row lock
  SELECT 
    b.id, b.salon_id, b.service_id, b.booking_date, b.time_slot,
    b.status, b.user_id
  INTO v_booking
  FROM bookings b
  WHERE b.id = p_booking_id
  FOR UPDATE;  -- Lock the row

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Booking not found'
    );
  END IF;

  -- 2. Validate booking can be rescheduled
  IF v_booking.status NOT IN ('pending', 'confirmed') THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Only pending or confirmed bookings can be rescheduled'
    );
  END IF;

  -- 3. Validate user has permission
  IF p_user_role = 'customer' AND v_booking.user_id != p_user_id THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Unauthorized'
    );
  END IF;

  IF p_user_role = 'owner' THEN
    -- Verify owner owns the salon
    IF NOT EXISTS (
      SELECT 1 FROM salons 
      WHERE id = v_booking.salon_id AND owner_id = p_user_id
    ) THEN
      RETURN json_build_object(
        'success', false,
        'error', 'Unauthorized'
      );
    END IF;
  END IF;

  -- 4. Check if new slot is the same as current
  IF v_booking.booking_date = p_new_date 
     AND v_booking.time_slot = p_new_time_slot THEN
    RETURN json_build_object(
      'success', false,
      'error', 'New slot is the same as current slot'
    );
  END IF;

  -- 5. Check new slot availability
  SELECT 
    s.max_bookings_per_slot,
    s.allow_multiple_bookings_per_slot
  INTO v_max_bookings, v_allow_multiple
  FROM salons s
  WHERE s.id = v_booking.salon_id;

  -- Count current bookings for new slot (excluding this booking)
  SELECT COUNT(*)
  INTO v_current_bookings
  FROM bookings
  WHERE salon_id = v_booking.salon_id
    AND booking_date = p_new_date
    AND time_slot = p_new_time_slot
    AND status IN ('pending', 'confirmed')
    AND id != p_booking_id;

  -- Check if slot is available
  IF v_current_bookings >= v_max_bookings THEN
    RETURN json_build_object(
      'success', false,
      'error', 'New slot is not available'
    );
  END IF;

  -- 6. Store old values
  v_old_date := v_booking.booking_date;
  v_old_time_slot := v_booking.time_slot;

  -- 7. Update booking (atomic operation)
  UPDATE bookings
  SET 
    booking_date = p_new_date,
    time_slot = p_new_time_slot,
    reschedule_count = COALESCE(reschedule_count, 0) + 1,
    last_rescheduled_at = NOW(),
    updated_at = NOW()
  WHERE id = p_booking_id;

  -- 8. Create reschedule audit record
  INSERT INTO booking_reschedules (
    booking_id,
    old_date,
    old_time_slot,
    new_date,
    new_time_slot,
    initiated_by,
    initiated_by_role,
    reason
  ) VALUES (
    p_booking_id,
    v_old_date,
    v_old_time_slot,
    p_new_date,
    p_new_time_slot,
    p_user_id,
    p_user_role,
    p_reason
  );

  -- 9. Return success
  RETURN json_build_object(
    'success', true,
    'booking_id', p_booking_id,
    'old_date', v_old_date,
    'old_time_slot', v_old_time_slot,
    'new_date', p_new_date,
    'new_time_slot', p_new_time_slot,
    'reschedule_count', COALESCE(v_booking.reschedule_count, 0) + 1
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 2. FastAPI Endpoint
```python
# backend/routers/bookings.py

from pydantic import BaseModel
from datetime import date

class RescheduleRequest(BaseModel):
    new_date: date
    new_time_slot: str
    reason: str | None = None

@router.patch("/{booking_id}/reschedule")
@limiter.limit("5/minute")
async def reschedule_booking(
    request: Request,
    booking_id: str,
    data: RescheduleRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Reschedule a booking to a new date/time.
    Uses atomic database operation to prevent race conditions.
    """
    try:
        profile = current_user.get("profile", {})
        user_role = profile.get("role", "customer")
        
        # Call atomic RPC function
        response = await supabase.request(
            "POST",
            "rest/v1/rpc/reschedule_booking_atomic",
            json={
                "p_booking_id": booking_id,
                "p_new_date": data.new_date.isoformat(),
                "p_new_time_slot": data.new_time_slot,
                "p_user_id": current_user.get("id"),
                "p_user_role": user_role,
                "p_reason": data.reason
            }
        )
        
        if response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to reschedule booking"
            )
        
        result = response.json()
        
        if not result.get("success"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result.get("error", "Failed to reschedule booking")
            )
        
        # Send notification to customer (if owner initiated)
        if user_role == "owner":
            # TODO: Send push notification to customer
            pass
        
        # Send notification to owner (if customer initiated)
        if user_role == "customer":
            # TODO: Send push notification to owner
            pass
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Reschedule error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while rescheduling"
        )
```

---

## 📱 Mobile Implementation

### 1. Customer Reschedule Flow

#### MyBookings Screen - Add Reschedule Button
```typescript
// mobile/src/screens/customer/MyBookings.tsx

const BookingCard = ({ booking }: { booking: Booking }) => {
  const canReschedule = ['pending', 'confirmed'].includes(booking.status);
  
  return (
    <View style={styles.bookingCard}>
      {/* Existing booking details */}
      
      {canReschedule && (
        <TouchableOpacity
          style={styles.rescheduleButton}
          onPress={() => navigation.navigate('RescheduleBooking', {
            bookingId: booking.id,
            currentDate: booking.booking_date,
            currentSlot: booking.time_slot,
            salonId: booking.salon_id,
            serviceId: booking.service_id,
          })}
        >
          <Ionicons name="calendar-outline" size={18} color={theme.colors.primary} />
          <Text style={styles.rescheduleButtonText}>Reschedule</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};
```

#### New Screen: RescheduleBookingScreen
```typescript
// mobile/src/screens/customer/RescheduleBookingScreen.tsx

export const RescheduleBookingScreen = ({ route, navigation }) => {
  const { bookingId, currentDate, currentSlot, salonId, serviceId } = route.params;
  
  const [selectedDate, setSelectedDate] = useState(currentDate);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  
  // Fetch available slots (reuse existing logic)
  const { data: slotsData } = useQuery({
    queryKey: ['slots', salonId, serviceId, selectedDate],
    queryFn: async () => {
      const response = await api.get(`/api/salons/${salonId}/slots`, {
        params: { date: selectedDate, service_id: serviceId }
      });
      return response.data;
    },
  });
  
  // Reschedule mutation
  const rescheduleMutation = useMutation({
    mutationFn: async () => {
      const response = await api.patch(`/api/bookings/${bookingId}/reschedule`, {
        new_date: selectedDate,
        new_time_slot: selectedSlot,
        reason: reason || undefined,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      showToast('Booking rescheduled successfully!', 'success');
      navigation.goBack();
    },
    onError: (error) => {
      const appErr = handleApiError(error);
      showToast(appErr.message, 'error');
    },
  });
  
  return (
    <ScreenWrapper variant="stack">
      <View style={styles.header}>
        <Text style={styles.title}>Reschedule Booking</Text>
        <Text style={styles.subtitle}>
          Current: {format(new Date(currentDate), 'MMM d')} at {formatTime(currentSlot)}
        </Text>
      </View>
      
      {/* Date picker */}
      {/* Slot picker */}
      {/* Optional reason input */}
      
      <Button
        title="Confirm Reschedule"
        onPress={() => rescheduleMutation.mutate()}
        loading={rescheduleMutation.isPending}
        disabled={!selectedSlot || selectedSlot === currentSlot}
      />
    </ScreenWrapper>
  );
};
```

### 2. Owner Propose Reschedule Flow

#### ManageBookings Screen - Add Propose Reschedule
```typescript
// mobile/src/screens/owner/ManageBookingsScreen.tsx

const BookingCard = ({ booking }: { booking: Booking }) => {
  const [proposeModalVisible, setProposeModalVisible] = useState(false);
  
  return (
    <>
      <View style={styles.bookingCard}>
        {/* Existing booking details */}
        
        <TouchableOpacity
          style={styles.proposeButton}
          onPress={() => setProposeModalVisible(true)}
        >
          <Ionicons name="time-outline" size={18} color={theme.colors.secondary} />
          <Text style={styles.proposeButtonText}>Propose Reschedule</Text>
        </TouchableOpacity>
      </View>
      
      <ProposeRescheduleModal
        visible={proposeModalVisible}
        booking={booking}
        onClose={() => setProposeModalVisible(false)}
      />
    </>
  );
};
```

---

## 🎨 UX Considerations

### Customer Experience
1. **One-Click Access**: Reschedule button prominently displayed on booking card
2. **Visual Comparison**: Show current vs new time side-by-side
3. **Confirmation**: Clear confirmation dialog before rescheduling
4. **Instant Feedback**: Success animation and updated booking details
5. **History**: Show reschedule history in booking details

### Owner Experience
1. **Propose Feature**: Owner can suggest new time to customer
2. **Notification**: Customer gets push notification with proposal
3. **Accept/Decline**: Customer can accept or decline proposal
4. **Bulk Reschedule**: Owner can reschedule multiple bookings (future feature)

---

## 🔒 Security & Validation

### Validation Rules
1. ✅ Only pending/confirmed bookings can be rescheduled
2. ✅ Customer can only reschedule their own bookings
3. ✅ Owner can only reschedule bookings for their salon
4. ✅ New slot must be different from current slot
5. ✅ New slot must be available
6. ✅ Cannot reschedule to past dates
7. ✅ Rate limiting: 5 reschedules per minute per user

### Audit Trail
- Every reschedule is logged in `booking_reschedules` table
- Track who initiated (customer vs owner)
- Track reason (optional)
- Track timestamp
- Track old and new values

---

## 📊 Analytics Events

```typescript
// Track reschedule events
analytics.track('booking_rescheduled', {
  booking_id: string,
  old_date: string,
  old_slot: string,
  new_date: string,
  new_slot: string,
  initiated_by: 'customer' | 'owner',
  reason: string | null,
  reschedule_count: number,
});

analytics.track('reschedule_proposed', {
  booking_id: string,
  proposed_date: string,
  proposed_slot: string,
  proposed_by: 'owner',
});

analytics.track('reschedule_accepted', {
  booking_id: string,
  proposal_id: string,
});

analytics.track('reschedule_declined', {
  booking_id: string,
  proposal_id: string,
  reason: string | null,
});
```

---

## 🧪 Testing Strategy

### Unit Tests
- [ ] Atomic RPC function with concurrent requests
- [ ] Slot availability validation
- [ ] Permission validation
- [ ] Error handling

### Integration Tests
- [ ] Customer reschedule flow
- [ ] Owner propose reschedule flow
- [ ] Notification delivery
- [ ] Real-time updates

### Edge Cases
- [ ] Reschedule to fully booked slot
- [ ] Concurrent reschedule attempts
- [ ] Reschedule cancelled booking (should fail)
- [ ] Reschedule to past date (should fail)
- [ ] Network error during reschedule
- [ ] Reschedule with promo code (should preserve)

---

## 📈 Success Metrics

### Business Impact
- **Cancellation Rate**: -40% (reschedule instead of cancel)
- **Customer Satisfaction**: +25% (flexibility)
- **Rebooking Rate**: +60% (easier to change than cancel)
- **No-Show Rate**: -20% (customers update instead of forgetting)

### Technical Metrics
- **Reschedule Success Rate**: >99%
- **API Response Time**: <300ms
- **Race Condition Errors**: 0
- **Data Consistency**: 100%

---

## 🚀 Implementation Timeline

### Day 1: Database & Backend (4 hours)
- [ ] Create database schema
- [ ] Implement atomic RPC function
- [ ] Create FastAPI endpoint
- [ ] Write unit tests
- [ ] Deploy to staging

### Day 2: Mobile Customer Flow (4 hours)
- [ ] Add reschedule button to MyBookings
- [ ] Create RescheduleBookingScreen
- [ ] Implement date/slot picker
- [ ] Add confirmation dialog
- [ ] Test end-to-end

### Day 3: Mobile Owner Flow (3 hours)
- [ ] Add propose reschedule button
- [ ] Create ProposeRescheduleModal
- [ ] Implement notification system
- [ ] Test owner flow

### Day 4: Testing & Polish (3 hours)
- [ ] Integration testing
- [ ] Edge case testing
- [ ] Performance testing
- [ ] UI polish
- [ ] Documentation

**Total: 14 hours (2 days)**

---

## 🔄 Future Enhancements

### Phase 2
- [ ] Bulk reschedule (owner reschedules multiple bookings)
- [ ] Smart reschedule suggestions (AI-powered)
- [ ] Reschedule with different service
- [ ] Reschedule with different salon
- [ ] Reschedule fee (configurable by owner)

### Phase 3
- [ ] Automatic reschedule on cancellation
- [ ] Waitlist integration (offer slot to waitlisted users)
- [ ] Calendar sync (Google Calendar, Apple Calendar)
- [ ] SMS confirmation for reschedules

---

**Status**: 📋 Planning Complete - Ready for Implementation
**Next**: Start with database schema and atomic RPC function
