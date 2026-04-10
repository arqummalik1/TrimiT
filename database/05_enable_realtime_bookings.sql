-- Enable realtime for bookings table
-- This ensures that the bookings table sends realtime events to subscribers

-- First, check if the publication exists and create it if not
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;

-- Add bookings table to the realtime publication (if not already added)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'bookings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE bookings;
  END IF;
END $$;

-- Verify the table is in the publication
-- SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';

COMMENT ON TABLE bookings IS 'Bookings table with realtime enabled for live notifications';
