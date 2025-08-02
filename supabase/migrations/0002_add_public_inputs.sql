-- Add public_inputs field to shared_snippets table
-- This allows storing public inputs alongside proof and witness data

ALTER TABLE public.shared_snippets 
ADD COLUMN public_inputs jsonb;

-- Add comment for the new column
COMMENT ON COLUMN public.shared_snippets.public_inputs IS 'JSON array containing public input values from the circuit execution';