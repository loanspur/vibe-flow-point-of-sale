-- Create Mpesa configurations table
CREATE TABLE IF NOT EXISTS public.mpesa_configurations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL,
    is_enabled BOOLEAN DEFAULT false,
    environment TEXT NOT NULL DEFAULT 'sandbox' CHECK (environment IN ('sandbox', 'production')),
    consumer_key TEXT NOT NULL,
    consumer_secret TEXT NOT NULL,
    passkey TEXT NOT NULL,
    shortcode TEXT NOT NULL,
    api_user TEXT NOT NULL,
    callback_url TEXT NOT NULL,
    confirmation_url TEXT NOT NULL,
    validation_url TEXT,
    last_tested_at TIMESTAMP WITH TIME ZONE,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(tenant_id)
);

-- Create Mpesa transactions table
CREATE TABLE IF NOT EXISTS public.mpesa_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL,
    sale_id UUID,
    checkout_request_id TEXT NOT NULL,
    merchant_request_id TEXT,
    phone_number TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    reference TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'timeout')),
    mpesa_receipt_number TEXT,
    transaction_date TIMESTAMP WITH TIME ZONE,
    result_code INTEGER,
    result_description TEXT,
    callback_received_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(checkout_request_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_mpesa_configurations_tenant_id ON public.mpesa_configurations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mpesa_transactions_tenant_id ON public.mpesa_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mpesa_transactions_sale_id ON public.mpesa_transactions(sale_id);
CREATE INDEX IF NOT EXISTS idx_mpesa_transactions_checkout_request_id ON public.mpesa_transactions(checkout_request_id);
CREATE INDEX IF NOT EXISTS idx_mpesa_transactions_status ON public.mpesa_transactions(status);
CREATE INDEX IF NOT EXISTS idx_mpesa_transactions_created_at ON public.mpesa_transactions(created_at);

-- Enable RLS
ALTER TABLE public.mpesa_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mpesa_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for mpesa_configurations
CREATE POLICY "Tenant admins can manage mpesa configurations" ON public.mpesa_configurations
    FOR ALL USING (
        tenant_id = get_user_tenant_id() AND 
        get_current_user_role() = ANY(ARRAY['superadmin'::user_role, 'admin'::user_role, 'manager'::user_role])
    );

CREATE POLICY "Tenant users can view mpesa configurations" ON public.mpesa_configurations
    FOR SELECT USING (tenant_id = get_user_tenant_id());

-- RLS Policies for mpesa_transactions
CREATE POLICY "Tenant staff can manage mpesa transactions" ON public.mpesa_transactions
    FOR ALL USING (
        tenant_id = get_user_tenant_id() AND 
        get_current_user_role() = ANY(ARRAY['superadmin'::user_role, 'admin'::user_role, 'manager'::user_role, 'cashier'::user_role])
    );

CREATE POLICY "Tenant users can view mpesa transactions" ON public.mpesa_transactions
    FOR SELECT USING (tenant_id = get_user_tenant_id());

-- System policy for edge functions to manage transactions
CREATE POLICY "System can manage mpesa transactions" ON public.mpesa_transactions
    FOR ALL USING (true);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_mpesa_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_mpesa_configurations_updated_at
    BEFORE UPDATE ON public.mpesa_configurations
    FOR EACH ROW
    EXECUTE FUNCTION update_mpesa_updated_at();

CREATE TRIGGER update_mpesa_transactions_updated_at
    BEFORE UPDATE ON public.mpesa_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_mpesa_updated_at();