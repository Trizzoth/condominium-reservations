-- Migration: Add security fields to reservations
-- Run this in Supabase SQL Editor after the main schema

-- 1. Add check-in/out timestamps
ALTER TABLE reservations 
ADD COLUMN IF NOT EXISTS checked_in_at timestamptz,
ADD COLUMN IF NOT EXISTS checked_out_at timestamptz;

-- 2. Update status check constraint to include no_show
ALTER TABLE reservations 
DROP CONSTRAINT IF EXISTS reservations_status_check;

ALTER TABLE reservations 
ADD CONSTRAINT reservations_status_check 
CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled', 'no_show'));

-- 3. Update RLS policy for security role to view today's reservations
CREATE POLICY "Security can view today's reservations" ON reservations 
FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'security')
  AND start_time >= CURRENT_DATE
  AND start_time < CURRENT_DATE + INTERVAL '1 day'
);

-- 4. Security can update check-in/out
CREATE POLICY "Security can check-in/out" ON reservations 
FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'security')
) WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'security')
);

-- 5. Add index for security queries
CREATE INDEX IF NOT EXISTS idx_reservations_security 
ON reservations (start_time, status) 
WHERE status IN ('approved', 'no_show');

-- 6. Add security role to profiles check constraint (already exists in main schema)
-- The profiles table already has: role text CHECK (role IN ('resident', 'admin', 'security')) DEFAULT 'resident'