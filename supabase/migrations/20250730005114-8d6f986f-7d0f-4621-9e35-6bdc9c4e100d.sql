-- Create enhanced transfer requests table for different payment methods and user transfers
CREATE TABLE IF NOT EXISTS public.transfer_requests (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    
    -- Transfer details
    transfer_type TEXT NOT NULL CHECK (transfer_type IN ('cash_drawer', 'user_to_user', 'payment_method')),
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    currency_code TEXT DEFAULT 'KES',
    
    -- From details
    from_user_id UUID NOT NULL,
    from_drawer_id UUID REFERENCES public.cash_drawers(id),
    from_payment_method_id UUID REFERENCES public.payment_methods(id),
    
    -- To details  
    to_user_id UUID NOT NULL,
    to_drawer_id UUID REFERENCES public.cash_drawers(id),
    to_payment_method_id UUID REFERENCES public.payment_methods(id),
    
    -- Request details
    reason TEXT,
    notes TEXT,
    reference_number TEXT,
    
    -- Status tracking
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed', 'cancelled')),
    requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    responded_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Who responded
    responded_by UUID,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_transfer_requests_tenant_id ON public.transfer_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_transfer_requests_from_user_id ON public.transfer_requests(from_user_id);
CREATE INDEX IF NOT EXISTS idx_transfer_requests_to_user_id ON public.transfer_requests(to_user_id);
CREATE INDEX IF NOT EXISTS idx_transfer_requests_status ON public.transfer_requests(status);
CREATE INDEX IF NOT EXISTS idx_transfer_requests_transfer_type ON public.transfer_requests(transfer_type);

-- Enable RLS
ALTER TABLE public.transfer_requests ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view transfer requests involving them" ON public.transfer_requests
    FOR SELECT USING (
        auth.uid() = from_user_id OR 
        auth.uid() = to_user_id OR
        auth.uid() = responded_by
    );

CREATE POLICY "Users can create transfer requests" ON public.transfer_requests
    FOR INSERT WITH CHECK (auth.uid() = from_user_id);

CREATE POLICY "Users can update their own pending transfer requests" ON public.transfer_requests
    FOR UPDATE USING (
        auth.uid() = from_user_id AND status = 'pending'
    );

CREATE POLICY "Recipients can respond to pending transfer requests" ON public.transfer_requests
    FOR UPDATE USING (
        auth.uid() = to_user_id AND status = 'pending'
    );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_transfer_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_transfer_requests_updated_at
    BEFORE UPDATE ON public.transfer_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.update_transfer_requests_updated_at();

-- Create a view for transfer requests with user details
CREATE OR REPLACE VIEW public.transfer_requests_with_details AS
SELECT 
    tr.*,
    fu.email as from_user_email,
    tu.email as to_user_email,
    cd_from.drawer_name as from_drawer_name,
    cd_to.drawer_name as to_drawer_name,
    pm_from.name as from_payment_method_name,
    pm_to.name as to_payment_method_name
FROM public.transfer_requests tr
LEFT JOIN auth.users fu ON tr.from_user_id = fu.id
LEFT JOIN auth.users tu ON tr.to_user_id = tu.id
LEFT JOIN public.cash_drawers cd_from ON tr.from_drawer_id = cd_from.id
LEFT JOIN public.cash_drawers cd_to ON tr.to_drawer_id = cd_to.id
LEFT JOIN public.payment_methods pm_from ON tr.from_payment_method_id = pm_from.id
LEFT JOIN public.payment_methods pm_to ON tr.to_payment_method_id = pm_to.id;