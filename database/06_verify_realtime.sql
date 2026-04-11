-- ==========================================
-- VERIFY REALTIME IS ENABLED FOR BOOKINGS
-- ==========================================
-- Run this in Supabase SQL Editor to check if realtime is enabled

-- Check if the publication exists
SELECT * FROM pg_publication WHERE pubname = 'supabase_realtime';

-- Check if bookings table is in the publication
SELECT * FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' AND tablename = 'bookings';

-- If the above queries return no results, run this to enable realtime:
-- (This is the same as 05_enable_realtime_bookings.sql)

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

-- Verify again
SELECT * FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' AND tablename = 'bookings';
