-- Add location_id column to products table
ALTER TABLE products ADD COLUMN location_id uuid REFERENCES store_locations(id);

-- Add location_id column to sales table  
ALTER TABLE sales ADD COLUMN location_id uuid REFERENCES store_locations(id);

-- Add location_id column to purchases table
ALTER TABLE purchases ADD COLUMN location_id uuid REFERENCES store_locations(id);

-- Create store_locations table if it doesn't exist
CREATE TABLE IF NOT EXISTS store_locations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL,
  name text NOT NULL,
  address text,
  is_primary boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on store_locations
ALTER TABLE store_locations ENABLE ROW LEVEL SECURITY;

-- Create policies for store_locations
CREATE POLICY "Tenant managers can manage locations" 
ON store_locations 
FOR ALL 
USING (tenant_id = get_user_tenant_id() AND get_current_user_role() = ANY(ARRAY['superadmin'::user_role, 'admin'::user_role, 'manager'::user_role]));

CREATE POLICY "Tenant users can view locations" 
ON store_locations 
FOR SELECT 
USING (tenant_id = get_user_tenant_id());

-- Insert default location for existing tenants
INSERT INTO store_locations (tenant_id, name, is_primary, is_active)
SELECT DISTINCT t.id, 'Main Location', true, true
FROM tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM store_locations sl WHERE sl.tenant_id = t.id
);

-- Update existing products to use default location
UPDATE products 
SET location_id = (
  SELECT id FROM store_locations 
  WHERE tenant_id = products.tenant_id 
  AND is_primary = true 
  LIMIT 1
)
WHERE location_id IS NULL;