-- First, check if location columns exist in tables that need them
-- Add location_id to products table if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'products' AND column_name = 'location_id') THEN
        ALTER TABLE products ADD COLUMN location_id UUID REFERENCES store_locations(id);
    END IF;
END $$;

-- Add location_id to sales table if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'sales' AND column_name = 'location_id') THEN
        ALTER TABLE sales ADD COLUMN location_id UUID REFERENCES store_locations(id);
    END IF;
END $$;

-- Add location_id to purchases table if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'purchases' AND column_name = 'location_id') THEN
        ALTER TABLE purchases ADD COLUMN location_id UUID REFERENCES store_locations(id);
    END IF;
END $$;

-- Add location_id to contacts table if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'contacts' AND column_name = 'location_id') THEN
        ALTER TABLE contacts ADD COLUMN location_id UUID REFERENCES store_locations(id);
    END IF;
END $$;

-- Add location_id to tenant_users table if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tenant_users' AND column_name = 'location_id') THEN
        ALTER TABLE tenant_users ADD COLUMN location_id UUID REFERENCES store_locations(id);
    END IF;
END $$;

-- Check if stock_transfer_items table exists, if not create it
CREATE TABLE IF NOT EXISTS stock_transfer_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transfer_id UUID NOT NULL REFERENCES stock_transfers(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    variant_id UUID REFERENCES product_variants(id),
    quantity_requested INTEGER NOT NULL DEFAULT 0,
    quantity_shipped INTEGER NOT NULL DEFAULT 0,
    quantity_received INTEGER NOT NULL DEFAULT 0,
    unit_cost NUMERIC(10,2) NOT NULL DEFAULT 0,
    total_cost NUMERIC(10,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on stock_transfer_items
ALTER TABLE stock_transfer_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for stock_transfer_items
CREATE POLICY "Tenant users can view transfer items" ON stock_transfer_items
    FOR SELECT USING (
        transfer_id IN (
            SELECT id FROM stock_transfers 
            WHERE tenant_id = get_user_tenant_id()
        )
    );

CREATE POLICY "Tenant staff can manage transfer items" ON stock_transfer_items
    FOR ALL USING (
        transfer_id IN (
            SELECT id FROM stock_transfers 
            WHERE tenant_id = get_user_tenant_id()
        ) AND get_current_user_role() = ANY(ARRAY['superadmin'::user_role, 'admin'::user_role, 'manager'::user_role, 'cashier'::user_role])
    );

-- Function to get user's default location (primary location for their tenant)
CREATE OR REPLACE FUNCTION get_user_default_location(user_tenant_id UUID)
RETURNS UUID
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
DECLARE
    location_id UUID;
BEGIN
    -- Get the primary location for the tenant
    SELECT id INTO location_id
    FROM store_locations
    WHERE tenant_id = user_tenant_id 
      AND is_primary = true 
      AND is_active = true
    LIMIT 1;
    
    -- If no primary location, get the first active location
    IF location_id IS NULL THEN
        SELECT id INTO location_id
        FROM store_locations
        WHERE tenant_id = user_tenant_id 
          AND is_active = true
        ORDER BY created_at ASC
        LIMIT 1;
    END IF;
    
    RETURN location_id;
END;
$$;