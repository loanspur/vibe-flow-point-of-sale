-- Fix tenant table structure to ensure data integrity

-- 1. Add status field to tenants table
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'trial';

-- 2. Make subdomain NOT NULL and ensure all existing records have subdomains
-- First, update any NULL subdomains
UPDATE tenants 
SET subdomain = LOWER(REPLACE(REPLACE(name, ' ', ''), '''', '')) || '-' || SUBSTRING(id::text, 1, 8)
WHERE subdomain IS NULL;

-- Now make subdomain NOT NULL
ALTER TABLE tenants ALTER COLUMN subdomain SET NOT NULL;

-- 3. Add check constraints for data validation
ALTER TABLE tenants ADD CONSTRAINT check_subdomain_format 
CHECK (subdomain ~ '^[a-z0-9-]+$' AND LENGTH(subdomain) >= 3);

ALTER TABLE tenants ADD CONSTRAINT check_status_values 
CHECK (status IN ('trial', 'active', 'suspended', 'cancelled'));

-- 4. Add comment to make requirements clear
COMMENT ON COLUMN tenants.id IS 'Primary key - UUID, auto-generated, NOT NULL';
COMMENT ON COLUMN tenants.name IS 'Tenant business name - NOT NULL, required';
COMMENT ON COLUMN tenants.subdomain IS 'Unique subdomain identifier - NOT NULL, required, lowercase alphanumeric with hyphens only';
COMMENT ON COLUMN tenants.status IS 'Tenant subscription status - NOT NULL, must be trial/active/suspended/cancelled';