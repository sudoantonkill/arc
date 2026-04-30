-- ================================================================
-- Fix Foreign Key Constraints for auth.users
-- This fixes the "Database error deleting user" issue in Supabase Auth
-- ================================================================

DO $$ 
DECLARE 
    r RECORD;
BEGIN 
    -- 1. Fix bookings table constraints
    FOR r IN (
        SELECT tc.constraint_name 
        FROM information_schema.table_constraints tc 
        JOIN information_schema.key_column_usage kcu 
          ON tc.constraint_name = kcu.constraint_name 
        WHERE tc.table_name = 'bookings' AND tc.constraint_type = 'FOREIGN KEY'
          AND kcu.column_name IN ('student_id', 'interviewer_id')
    ) LOOP 
        EXECUTE 'ALTER TABLE bookings DROP CONSTRAINT IF EXISTS ' || r.constraint_name;
    END LOOP;
    
    -- Re-add with ON DELETE CASCADE
    ALTER TABLE public.bookings 
    ADD CONSTRAINT bookings_student_id_fkey FOREIGN KEY (student_id) REFERENCES auth.users(id) ON DELETE CASCADE,
    ADD CONSTRAINT bookings_interviewer_id_fkey FOREIGN KEY (interviewer_id) REFERENCES auth.users(id) ON DELETE CASCADE;

    -- 2. Fix interviewer_reviews table constraints
    FOR r IN (
        SELECT tc.constraint_name 
        FROM information_schema.table_constraints tc 
        JOIN information_schema.key_column_usage kcu 
          ON tc.constraint_name = kcu.constraint_name 
        WHERE tc.table_name = 'interviewer_reviews' AND tc.constraint_type = 'FOREIGN KEY'
          AND kcu.column_name IN ('student_id', 'interviewer_id')
    ) LOOP 
        EXECUTE 'ALTER TABLE interviewer_reviews DROP CONSTRAINT IF EXISTS ' || r.constraint_name;
    END LOOP;
    
    -- Re-add with ON DELETE CASCADE
    ALTER TABLE public.interviewer_reviews 
    ADD CONSTRAINT interviewer_reviews_student_id_fkey FOREIGN KEY (student_id) REFERENCES auth.users(id) ON DELETE CASCADE,
    ADD CONSTRAINT interviewer_reviews_interviewer_id_fkey FOREIGN KEY (interviewer_id) REFERENCES auth.users(id) ON DELETE CASCADE;

END $$;
