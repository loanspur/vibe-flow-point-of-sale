-- Fix cash_transactions constraint to allow 'account_transfer' transaction type
ALTER TABLE public.cash_transactions 
DROP CONSTRAINT IF EXISTS cash_transactions_transaction_type_check;

-- Add updated constraint that includes 'account_transfer'
ALTER TABLE public.cash_transactions 
ADD CONSTRAINT cash_transactions_transaction_type_check 
CHECK (transaction_type IN ('opening_balance', 'sale_payment', 'return_refund', 'manual_adjustment', 'transfer_in', 'transfer_out', 'account_transfer', 'bank_transfer', 'expense_payment', 'cash_in', 'cash_out'));

-- Now process any existing pending account transfer requests
DO $$
DECLARE
    req RECORD;
BEGIN
    -- Find all pending account transfer requests
    FOR req IN 
        SELECT id FROM public.transfer_requests 
        WHERE transfer_type = 'account' AND status = 'pending'
    LOOP
        -- Process the transfer directly with pending status
        PERFORM public.process_transfer_request(req.id, 'approve');
        
        -- Mark as completed
        UPDATE public.transfer_requests 
        SET status = 'completed', completed_at = now()
        WHERE id = req.id;
    END LOOP;
END $$;