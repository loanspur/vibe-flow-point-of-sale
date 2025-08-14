-- Add missing shipping_amount column to quotes table
ALTER TABLE public.quotes 
ADD COLUMN IF NOT EXISTS shipping_amount NUMERIC DEFAULT 0;