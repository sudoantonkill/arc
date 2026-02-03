-- Fix RLS policy for wallets table to allow inserts
-- The trigger create_interviewer_wallet() needs to insert rows into wallets
-- when a new interviewer profile is created

-- Allow users to insert their own wallet (for the trigger)
CREATE POLICY "Users can create own wallet"
ON public.wallets
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Allow users to update their own wallet (for balance updates)
CREATE POLICY "Users can update own wallet"
ON public.wallets
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
