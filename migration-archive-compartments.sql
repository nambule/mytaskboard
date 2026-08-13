-- Archivage réversible des compartiments.
ALTER TABLE public.compartments
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- Les compartiments archivés ne doivent pas bloquer la réorganisation des actifs.
ALTER TABLE public.compartments
  DROP CONSTRAINT IF EXISTS compartments_user_id_position_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_compartments_active_user_position
  ON public.compartments (user_id, position)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_compartments_user_archived
  ON public.compartments (user_id, archived_at);

-- Remplace l'ancienne politique ALL afin qu'un utilisateur ne puisse plus supprimer
-- physiquement un compartiment depuis le client. L'archivage devient la seule sortie.
DROP POLICY IF EXISTS "Users can manage their own compartments" ON public.compartments;

DROP POLICY IF EXISTS "Users can read their own compartments" ON public.compartments;
CREATE POLICY "Users can read their own compartments"
  ON public.compartments FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own compartments" ON public.compartments;
CREATE POLICY "Users can create their own compartments"
  ON public.compartments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own compartments" ON public.compartments;
CREATE POLICY "Users can update their own compartments"
  ON public.compartments FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.archive_compartment(p_compartment_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  completed_tasks INTEGER;
BEGIN
  -- Sérialise les archivages d'un même utilisateur et conserve toujours un compartiment actif.
  PERFORM 1
  FROM public.compartments
  WHERE user_id = auth.uid()
    AND archived_at IS NULL
  FOR UPDATE;

  IF (
    SELECT COUNT(*)
    FROM public.compartments
    WHERE user_id = auth.uid()
      AND archived_at IS NULL
  ) <= 1 THEN
    RAISE EXCEPTION 'At least one active compartment is required';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.compartments
    WHERE id = p_compartment_id
      AND user_id = auth.uid()
      AND archived_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Compartment not found or already archived';
  END IF;

  UPDATE public.tasks
  SET status = 'Done', updated_at = now()
  WHERE user_id = auth.uid()
    AND compartment_id = p_compartment_id
    AND status IS DISTINCT FROM 'Done';

  GET DIAGNOSTICS completed_tasks = ROW_COUNT;

  UPDATE public.compartments
  SET archived_at = now(), updated_at = now()
  WHERE id = p_compartment_id
    AND user_id = auth.uid();

  RETURN completed_tasks;
END;
$$;

REVOKE ALL ON FUNCTION public.archive_compartment(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.archive_compartment(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.restore_compartment(p_compartment_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  next_position INTEGER;
BEGIN
  SELECT COALESCE(MAX(position), -1) + 1
  INTO next_position
  FROM public.compartments
  WHERE user_id = auth.uid()
    AND archived_at IS NULL;

  UPDATE public.compartments
  SET archived_at = NULL,
      position = next_position,
      updated_at = now()
  WHERE id = p_compartment_id
    AND user_id = auth.uid()
    AND archived_at IS NOT NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Archived compartment not found';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.restore_compartment(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.restore_compartment(UUID) TO authenticated;
