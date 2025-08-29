-- Create brands table for brand management
CREATE TABLE IF NOT EXISTS public.brands (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    website TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    logo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique brand names per tenant
    UNIQUE(tenant_id, name)
);

-- Add brand_id column to products table if it doesn't exist
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES public.brands(id) ON DELETE SET NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_brands_tenant_id ON public.brands(tenant_id);
CREATE INDEX IF NOT EXISTS idx_brands_name ON public.brands(name);
CREATE INDEX IF NOT EXISTS idx_products_brand_id ON public.products(brand_id);

-- Add RLS policies for brands table
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to view brands from their tenant
CREATE POLICY "Users can view brands from their tenant" ON public.brands
    FOR SELECT USING (
        tenant_id IN (
            SELECT tenant_id FROM public.tenant_members 
            WHERE user_id = auth.uid() AND status = 'active'
        )
    );

-- Policy to allow users to insert brands for their tenant
CREATE POLICY "Users can insert brands for their tenant" ON public.brands
    FOR INSERT WITH CHECK (
        tenant_id IN (
            SELECT tenant_id FROM public.tenant_members 
            WHERE user_id = auth.uid() AND status = 'active'
        )
    );

-- Policy to allow users to update brands from their tenant
CREATE POLICY "Users can update brands from their tenant" ON public.brands
    FOR UPDATE USING (
        tenant_id IN (
            SELECT tenant_id FROM public.tenant_members 
            WHERE user_id = auth.uid() AND status = 'active'
        )
    );

-- Policy to allow users to delete brands from their tenant
CREATE POLICY "Users can delete brands from their tenant" ON public.brands
    FOR DELETE USING (
        tenant_id IN (
            SELECT tenant_id FROM public.tenant_members 
            WHERE user_id = auth.uid() AND status = 'active'
        )
    );

-- Add comments to document the table
COMMENT ON TABLE public.brands IS 'Product brands for better organization and management';
COMMENT ON COLUMN public.brands.name IS 'Brand name (unique per tenant)';
COMMENT ON COLUMN public.brands.description IS 'Brand description';
COMMENT ON COLUMN public.brands.website IS 'Brand website URL';
COMMENT ON COLUMN public.brands.contact_email IS 'Brand contact email';
COMMENT ON COLUMN public.brands.contact_phone IS 'Brand contact phone number';
COMMENT ON COLUMN public.brands.logo_url IS 'Brand logo image URL';

