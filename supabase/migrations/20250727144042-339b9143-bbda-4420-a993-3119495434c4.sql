-- Add billing plan foreign key to tenants table for proper referential integrity

-- 1. Add billing_plan_id column as foreign key to billing_plans table (nullable first)
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS billing_plan_id uuid;

-- 2. Update existing tenants to have a default billing plan
-- First, find a suitable default billing plan (preferably trial or basic)
DO $$
DECLARE
    default_plan_id uuid;
BEGIN
    -- Try to find a trial or basic plan
    SELECT id INTO default_plan_id 
    FROM billing_plans 
    WHERE (name ILIKE '%trial%' OR name ILIKE '%basic%' OR name ILIKE '%starter%') 
    AND is_active = true
    ORDER BY price ASC
    LIMIT 1;
    
    -- If no trial/basic plan found, get the cheapest active plan
    IF default_plan_id IS NULL THEN
        SELECT id INTO default_plan_id 
        FROM billing_plans 
        WHERE is_active = true 
        ORDER BY price ASC
        LIMIT 1;
    END IF;
    
    -- Update all tenants without billing_plan_id
    IF default_plan_id IS NOT NULL THEN
        UPDATE tenants 
        SET billing_plan_id = default_plan_id
        WHERE billing_plan_id IS NULL;
    END IF;
END $$;

-- 3. Now make billing_plan_id NOT NULL (after all records have values)
ALTER TABLE tenants ALTER COLUMN billing_plan_id SET NOT NULL;

-- 4. Add foreign key constraint
ALTER TABLE tenants ADD CONSTRAINT fk_tenants_billing_plan 
FOREIGN KEY (billing_plan_id) REFERENCES billing_plans(id);

-- 5. Add comment for clarity
COMMENT ON COLUMN tenants.billing_plan_id IS 'Foreign key to billing_plans - NOT NULL, required, must reference active billing plan';