-- Update any existing pending account transfer requests to be approved and processed
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