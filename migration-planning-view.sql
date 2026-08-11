-- Ajoute une plage de planning indépendante des dates opérationnelles.
-- Les dates sont alignées sur des semaines dans l'interface.

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS planning_start_date DATE,
  ADD COLUMN IF NOT EXISTS planning_end_date DATE,
  ADD COLUMN IF NOT EXISTS planning_excluded BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.tasks
  DROP CONSTRAINT IF EXISTS tasks_planning_date_order;

ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_planning_date_order
  CHECK (
    planning_start_date IS NULL
    OR planning_end_date IS NULL
    OR planning_end_date >= planning_start_date
  );

CREATE INDEX IF NOT EXISTS idx_tasks_user_planning_dates
  ON public.tasks (user_id, planning_start_date, planning_end_date);

COMMENT ON COLUMN public.tasks.planning_start_date IS 'Début de la plage de planning macro';
COMMENT ON COLUMN public.tasks.planning_end_date IS 'Fin de la plage de planning macro';
COMMENT ON COLUMN public.tasks.planning_excluded IS 'Tâche utilisée comme pense-bête et exclue du planning macro';
