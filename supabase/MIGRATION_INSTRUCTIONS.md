# Supabase Migration Instructions

## Applying Migration 0004 (Add toml Column)

This migration restores the `toml` column to enable sharing snippets with dependency information.

### Method 1: Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Open the file `supabase/migrations/0004_add_toml_column.sql`
4. Copy the SQL content and paste it into the SQL Editor
5. Click **Run** to execute the migration

### Method 2: Supabase CLI

If you have the Supabase CLI installed:

```bash
# Initialize Supabase (if not already done)
supabase init

# Link to your remote project
supabase link --project-ref YOUR_PROJECT_REF

# Push the new migration
supabase db push
```

### Method 3: Direct SQL Execution

Run this SQL directly in the Supabase SQL Editor:

```sql
-- Add toml column back to shared_snippets table
ALTER TABLE public.shared_snippets
ADD COLUMN toml text;

-- Add comment for the column
COMMENT ON COLUMN public.shared_snippets.toml IS 'Optional Nargo.toml configuration content including dependencies';
```

### Verification

After running the migration, verify it worked:

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'shared_snippets'
ORDER BY ordinal_position;
```

You should see `toml` listed as a `text` column with `is_nullable = YES`.

### Rollback (if needed)

If you need to remove the column again:

```sql
ALTER TABLE public.shared_snippets DROP COLUMN toml;
```

## Migration History

- **0001**: Initial table creation with toml column
- **0002**: Added public_inputs column
- **0003**: Removed toml column (decision later reversed)
- **0004**: Re-added toml column to support dependency sharing
