-- Périodes macro indépendantes des tâches et des projets.
CREATE TABLE IF NOT EXISTS public.planning_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (length(trim(title)) > 0),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT planning_periods_date_order CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_planning_periods_user_dates
  ON public.planning_periods (user_id, start_date, end_date);

ALTER TABLE public.planning_periods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their planning periods" ON public.planning_periods;
CREATE POLICY "Users can read their planning periods"
  ON public.planning_periods FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their planning periods" ON public.planning_periods;
CREATE POLICY "Users can create their planning periods"
  ON public.planning_periods FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their planning periods" ON public.planning_periods;
CREATE POLICY "Users can update their planning periods"
  ON public.planning_periods FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their planning periods" ON public.planning_periods;
CREATE POLICY "Users can delete their planning periods"
  ON public.planning_periods FOR DELETE
  USING (auth.uid() = user_id);
