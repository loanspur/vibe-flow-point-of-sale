-- Add new columns to tenants table for better tracking

-- Add created_by column to track who created the tenant
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

-- Add country column for location tracking
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS country text;

-- Update existing tenants with default values if needed
UPDATE tenants 
SET created_by = (
  SELECT user_id FROM tenant_users 
  WHERE tenant_id = tenants.id 
  AND role IN ('owner', 'admin') 
  LIMIT 1
)
WHERE created_by IS NULL;

-- Add comments for clarity
COMMENT ON COLUMN tenants.created_by IS 'User who created this tenant - references auth.users';
COMMENT ON COLUMN tenants.country IS 'Country where the tenant is located';
COMMENT ON COLUMN tenants.created_at IS 'Date and time when tenant was created';