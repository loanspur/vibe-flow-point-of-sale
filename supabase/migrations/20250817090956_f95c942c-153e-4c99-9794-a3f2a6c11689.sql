-- Add customer_name column to quotes table to persist client names
ALTER TABLE public.quotes 
ADD COLUMN IF NOT EXISTS customer_name TEXT;