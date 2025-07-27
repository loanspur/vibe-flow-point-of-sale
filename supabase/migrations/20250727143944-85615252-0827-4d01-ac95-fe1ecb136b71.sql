-- Add billing plan foreign key to tenants table for proper referential integrity

-- 1. Add billing_plan_id column as foreign key to billing_plans table
ALTER TABLE tenants ADD COLUMN billing_plan_id uuid;

-- 2. Add foreign key constraint
ALTER TABLE tenants ADD CONSTRAINT fk_tenants_billing_plan 
FOREIGN KEY (billing_plan_id) REFERENCES billing_plans(id);

-- 3. Set default billing plan for existing tenants (get the basic plan ID)
UPDATE tenants 
SET billing_plan_id = (
  SELECT id FROM billing_plans 
  WHERE name ILIKE '%basic%' OR name ILIKE '%trial%' 
  LIMIT 1
)
WHERE billing_plan_id IS NULL;

-- 4. Make billing_plan_id NOT NULL to ensure every tenant has a billing plan
ALTER TABLE tenants ALTER COLUMN billing_plan_id SET NOT NULL;

-- 5. Add check constraint to ensure billing plan is active
ALTER TABLE tenants ADD CONSTRAINT check_active_billing_plan 
CHECK (billing_plan_id IN (SELECT id FROM billing_plans WHERE is_active = true));

-- 6. Add comment for clarity
COMMENT ON COLUMN tenants.billing_plan_id IS 'Foreign key to billing_plans - NOT NULL, required, must reference active billing plan';