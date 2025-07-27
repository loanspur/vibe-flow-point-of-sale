-- Create a tenant for the user santalamaltd@gmail.com
-- First, create the tenant
INSERT INTO tenants (name, contact_email, contact_phone, address, plan_type)
VALUES ('Santalama Limited', 'santalamaltd@gmail.com', NULL, NULL, 'basic');

-- Get the tenant ID we just created and update the user's profile
UPDATE profiles 
SET tenant_id = (
  SELECT id FROM tenants WHERE contact_email = 'santalamaltd@gmail.com' LIMIT 1
),
role = 'admin'
WHERE user_id = '2c30b788-b5d7-4742-9839-00caf5406120';