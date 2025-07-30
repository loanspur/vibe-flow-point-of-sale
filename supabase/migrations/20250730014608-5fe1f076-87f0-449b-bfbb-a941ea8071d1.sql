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
        -- Update status to approved
        UPDATE public.transfer_requests 
        SET status = 'approved', responded_at = now(), responded_by = from_user_id
        WHERE id = req.id;
        
        -- Process the transfer
        PERFORM public.process_transfer_request(req.id, 'approve');
        
        -- Mark as completed
        UPDATE public.transfer_requests 
        SET status = 'completed', completed_at = now()
        WHERE id = req.id;
    END LOOP;
END $$;