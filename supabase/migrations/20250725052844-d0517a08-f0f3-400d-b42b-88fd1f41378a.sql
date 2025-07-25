-- Step 1: Remove the duplicate tenant (the older one without associated data)
DELETE FROM tenants 
WHERE id = 'b9daf731-d99d-44c3-9246-19b3b1e951fc'
  AND contact_email = 'tractionenergies@gmail.com'
  AND created_at = '2025-07-24 06:56:29.013483+00';

-- Step 2: Now add the unique constraint to prevent future duplicates
ALTER TABLE tenants 
ADD CONSTRAINT unique_tenant_contact_email 
UNIQUE (contact_email);

-- Step 3: Log the cleanup action
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