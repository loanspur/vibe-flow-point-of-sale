-- Fix transfer_requests check constraint to allow 'account' transfer type
ALTER TABLE public.transfer_requests 
DROP CONSTRAINT IF EXISTS transfer_requests_transfer_type_check;

-- Add updated constraint that includes 'account' and 'cash_drawer' types
ALTER TABLE public.transfer_requests 
ADD CONSTRAINT transfer_requests_transfer_type_check 
CHECK (transfer_type IN ('cash_drawer', 'account'));