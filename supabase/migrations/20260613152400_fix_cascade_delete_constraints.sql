-- Update profiles table constraint to cascade delete
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_id_fkey,
  ADD CONSTRAINT profiles_id_fkey 
    FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update sessions table constraint to cascade delete
ALTER TABLE public.sessions
  DROP CONSTRAINT IF EXISTS sessions_user_id_fkey,
  ADD CONSTRAINT sessions_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Update follow_ups table constraints to cascade delete
ALTER TABLE public.follow_ups
  DROP CONSTRAINT IF EXISTS follow_ups_session_id_fkey,
  DROP CONSTRAINT IF EXISTS follow_ups_user_id_fkey,
  ADD CONSTRAINT follow_ups_session_id_fkey 
    FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE,
  ADD CONSTRAINT follow_ups_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Update feedback table constraint to cascade delete
ALTER TABLE public.feedback
  DROP CONSTRAINT IF EXISTS feedback_user_id_fkey,
  ADD CONSTRAINT feedback_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
