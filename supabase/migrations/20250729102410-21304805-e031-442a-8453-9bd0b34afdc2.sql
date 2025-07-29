-- Setup payment methods for existing tenants that don't have them yet
DO $$
DECLARE
    tenant_rec RECORD;
BEGIN
    -- Loop through all tenants that don't have payment methods yet
    FOR tenant_rec IN 
        SELECT DISTINCT t.id as tenant_id 
        FROM tenants t
        LEFT JOIN payment_methods pm ON t.id = pm.tenant_id
        WHERE pm.tenant_id IS NULL
    LOOP
        -- Setup default payment methods for this tenant
        PERFORM setup_default_payment_methods(tenant_rec.tenant_id);
        
        RAISE NOTICE 'Setup payment methods for tenant: %', tenant_rec.tenant_id;
    END LOOP;
END $$;