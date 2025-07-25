-- Remove duplicate tenant that has no associated data
-- This will clean up the older duplicate tenant: b9daf731-d99d-44c3-9246-19b3b1e951fc
-- The newer tenant (6742eb8a-434e-4c14-a91c-6d55adeb5750) will be preserved as it has active data

-- First, let's verify this tenant has no associated data before deletion
DO $$
DECLARE
    tenant_to_delete UUID := 'b9daf731-d99d-44c3-9246-19b3b1e951fc';
    associated_records INTEGER := 0;
BEGIN
    -- Check for any associated records across all tenant-related tables
    SELECT 
        (SELECT COUNT(*) FROM tenant_users WHERE tenant_id = tenant_to_delete) +
        (SELECT COUNT(*) FROM business_settings WHERE tenant_id = tenant_to_delete) +
        (SELECT COUNT(*) FROM products WHERE tenant_id = tenant_to_delete) +
        (SELECT COUNT(*) FROM customers WHERE tenant_id = tenant_to_delete) +
        (SELECT COUNT(*) FROM sales WHERE tenant_id = tenant_to_delete) +
        (SELECT COUNT(*) FROM payment_history WHERE tenant_id = tenant_to_delete) +
        (SELECT COUNT(*) FROM accounts WHERE tenant_id = tenant_to_delete) +
        (SELECT COUNT(*) FROM contacts WHERE tenant_id = tenant_to_delete)
    INTO associated_records;
    
    -- Only proceed with deletion if no associated records found
    IF associated_records = 0 THEN
        -- Delete the duplicate tenant
        DELETE FROM tenants WHERE id = tenant_to_delete;
        
        RAISE NOTICE 'Successfully removed duplicate tenant: % (traction energies - older entry)', tenant_to_delete;
        RAISE NOTICE 'Preserved tenant: 6742eb8a-434e-4c14-a91c-6d55adeb5750 (traction energies - newer entry with data)';
    ELSE
        RAISE NOTICE 'Cannot delete tenant % - it has % associated records', tenant_to_delete, associated_records;
    END IF;
END $$;

-- Add a unique constraint to prevent future duplicates based on contact email
ALTER TABLE tenants 
ADD CONSTRAINT unique_tenant_contact_email 
UNIQUE (contact_email);

-- Log the cleanup action
INSERT INTO communication_logs (
    channel,
    type,
    recipient,
    subject,
    content,
    status,
    metadata
) VALUES (
    'system',
    'maintenance',
    'system-admin',
    'Duplicate Tenant Cleanup',
    'Removed duplicate tenant entry for "traction energies" - preserved the newer entry with associated data',
    'sent',
    '{"cleanup_date": "' || NOW()::text || '", "removed_tenant": "b9daf731-d99d-44c3-9246-19b3b1e951fc", "preserved_tenant": "6742eb8a-434e-4c14-a91c-6d55adeb5750"}'::jsonb
);