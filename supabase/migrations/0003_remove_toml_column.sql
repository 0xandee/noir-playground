-- Remove toml column from shared_snippets table
-- TOML files are no longer needed in the UI or sharing functionality

ALTER TABLE public.shared_snippets 
DROP COLUMN toml;