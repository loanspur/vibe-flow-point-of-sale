-- Fix security issues from the previous migration

-- Drop the problematic view that exposes auth users
DROP VIEW IF EXISTS public.transfer_requests_with_details;

-- Create a secure function to get transfer request details instead
CREATE OR REPLACE FUNCTION public.get_transfer_request_details(request_id UUID)
RETURNS TABLE(
    id UUID,
    tenant_id UUID,
    transfer_type TEXT,
    amount NUMERIC,
    currency_code TEXT,
    from_user_id UUID,
    from_drawer_id UUID,
    from_payment_method_id UUID,
    to_user_id UUID,
    to_drawer_id UUID,
    to_payment_method_id UUID,
    reason TEXT,
    notes TEXT,
    reference_number TEXT,
    status TEXT,
    requested_at TIMESTAMP WITH TIME ZONE,
    responded_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    responded_by UUID,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    from_drawer_name TEXT,
    to_drawer_name TEXT,
    from_payment_method_name TEXT,
    to_payment_method_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tr.id,
        tr.tenant_id,
        tr.transfer_type,
        tr.amount,
        tr.currency_code,
        tr.from_user_id,
        tr.from_drawer_id,
        tr.from_payment_method_id,
        tr.to_user_id,
        tr.to_drawer_id,
        tr.to_payment_method_id,
        tr.reason,
        tr.notes,
        tr.reference_number,
        tr.status,
        tr.requested_at,
        tr.responded_at,
        tr.completed_at,
        tr.responded_by,
        tr.created_at,
        tr.updated_at,
        cd_from.drawer_name as from_drawer_name,
        cd_to.drawer_name as to_drawer_name,
        pm_from.name as from_payment_method_name,
        pm_to.name as to_payment_method_name
    FROM public.transfer_requests tr
    LEFT JOIN public.cash_drawers cd_from ON tr.from_drawer_id = cd_from.id
    LEFT JOIN public.cash_drawers cd_to ON tr.to_drawer_id = cd_to.id
    LEFT JOIN public.payment_methods pm_from ON tr.from_payment_method_id = pm_from.id
    LEFT JOIN public.payment_methods pm_to ON tr.to_payment_method_id = pm_to.id
    WHERE tr.id = request_id
      AND tr.tenant_id = get_user_tenant_id()
      AND (
        auth.uid() = tr.from_user_id OR 
        auth.uid() = tr.to_user_id OR
        auth.uid() = tr.responded_by
      );
END;
$$;

-- Fix search path for existing functions to be secure
CREATE OR REPLACE FUNCTION public.update_transfer_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = 'public';