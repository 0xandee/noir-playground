-- Enable UUID extension for generating unique identifiers
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create shared_snippets table for storing Noir code snippets
-- This table stores code snippets shared by users in the playground
CREATE TABLE public.shared_snippets (
    -- Unique identifier for each shared snippet
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Human-readable title for the snippet
    title text NOT NULL,
    
    -- The Noir source code content
    code text NOT NULL,
    
    -- JSON object containing input values for the circuit
    inputs jsonb NOT NULL,
    
    -- Optional TOML configuration content
    toml text,
    
    -- Optional generated proof data (binary)
    proof bytea,
    
    -- Optional witness data (binary)
    witness bytea,
    
    -- Timestamp when the snippet was created
    created_at timestamptz DEFAULT now() NOT NULL
);

-- Enable Row Level Security (RLS) on the table
ALTER TABLE public.shared_snippets ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public read access to all shared snippets
-- This allows anyone to view shared code snippets
CREATE POLICY "Allow public read access" ON public.shared_snippets
    FOR SELECT USING (true);

-- Create policy to allow public insert access for creating new snippets
-- This allows anyone to share their code snippets
CREATE POLICY "Allow public insert access" ON public.shared_snippets
    FOR INSERT WITH CHECK (true);

-- Create index on created_at for efficient ordering of recent snippets
CREATE INDEX idx_shared_snippets_created_at ON public.shared_snippets (created_at DESC);