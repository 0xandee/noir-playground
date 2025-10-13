-- Add toml column back to shared_snippets table
-- This restores the ability to share snippets with dependency information

ALTER TABLE public.shared_snippets
ADD COLUMN toml text;

-- Add comment for the column
COMMENT ON COLUMN public.shared_snippets.toml IS 'Optional Nargo.toml configuration content including dependencies';
