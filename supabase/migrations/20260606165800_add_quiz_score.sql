-- Add quiz_score column to sessions table
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS quiz_score text;

-- Add UPDATE policy for sessions (was missing entirely)
CREATE POLICY "Users can update own sessions"
  ON public.sessions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
