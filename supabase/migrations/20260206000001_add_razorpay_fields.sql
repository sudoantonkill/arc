-- ================================================================
-- Add Razorpay payment fields to bookings table
-- ================================================================

-- Add Razorpay-specific columns
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS razorpay_order_id TEXT,
ADD COLUMN IF NOT EXISTS razorpay_payment_id TEXT,
ADD COLUMN IF NOT EXISTS razorpay_refund_id TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_bookings_razorpay_order_id 
ON public.bookings(razorpay_order_id);
