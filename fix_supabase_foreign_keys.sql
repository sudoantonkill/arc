-- Run this entire script in your Supabase SQL Editor online
-- It will automatically fix any broken foreign key relationships for the bookings table

DO $$ 
DECLARE
    r RECORD;
BEGIN 
    -- 1. Drop existing foreign keys on student_id and interviewer_id
    -- This handles it even if they were named something unexpected
    FOR r IN (
        SELECT tc.constraint_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_name = 'bookings'
          AND tc.table_schema = 'public'
          AND tc.constraint_type = 'FOREIGN KEY'
          AND kcu.column_name IN ('student_id', 'interviewer_id')
    ) LOOP
        EXECUTE 'ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS ' || quote_ident(r.constraint_name);
    END LOOP;

    -- 2. Re-add the correct foreign keys linking to the profile tables
    ALTER TABLE public.bookings 
    ADD CONSTRAINT bookings_student_profile_fkey 
    FOREIGN KEY (student_id) REFERENCES public.student_profiles(user_id) ON DELETE CASCADE;

    ALTER TABLE public.bookings 
    ADD CONSTRAINT bookings_interviewer_profile_fkey 
    FOREIGN KEY (interviewer_id) REFERENCES public.interviewer_profiles(user_id) ON DELETE CASCADE;

END $$;

-- 3. Force Supabase (PostgREST) to reload its schema cache immediately
NOTIFY pgrst, 'reload schema';
