-- Remove the duplicate tenant (the older one without associated data)
DELETE FROM tenants 
WHERE id = 'b9daf731-d99d-44c3-9246-19b3b1e951fc';

-- Add the unique constraint to prevent future duplicates
ALTER TABLE tenants 
ADD CONSTRAINT unique_tenant_contact_email 
UNIQUE (contact_email);