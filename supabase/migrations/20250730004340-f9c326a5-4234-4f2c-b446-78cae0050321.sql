-- Comprehensive fix: Drop all foreign key constraints and rebuild properly

-- Drop any existing foreign key constraints that might be causing issues
DO $$ 
BEGIN
    -- Try to drop various possible constraint names
    BEGIN
        ALTER TABLE public.accounts_receivable DROP CONSTRAINT IF EXISTS accounts_receivable_customer_id_fkey;
    EXCEPTION WHEN OTHERS THEN
        NULL; -- Ignore if doesn't exist
    END;
    
    BEGIN
        ALTER TABLE public.accounts_receivable DROP CONSTRAINT IF EXISTS fk_accounts_receivable_customer;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
    
    BEGIN
        ALTER TABLE public.accounts_payable DROP CONSTRAINT IF EXISTS accounts_payable_supplier_id_fkey;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
    
    BEGIN
        ALTER TABLE public.accounts_payable DROP CONSTRAINT IF EXISTS fk_accounts_payable_supplier;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
    
    BEGIN
        ALTER TABLE public.purchases DROP CONSTRAINT IF EXISTS purchases_supplier_id_fkey;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
    
    BEGIN
        ALTER TABLE public.purchases DROP CONSTRAINT IF EXISTS fk_purchases_supplier;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
    
    BEGIN
        ALTER TABLE public.sales DROP CONSTRAINT IF EXISTS fk_sales_customer;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
END $$;

-- Create default contacts for orphaned data
DO $$ 
DECLARE
    tenant_record RECORD;
    walk_in_customer_id UUID;
    default_supplier_id UUID;
BEGIN
    -- Handle each tenant separately
    FOR tenant_record IN SELECT DISTINCT id, name FROM tenants
    LOOP
        -- Create walk-in customer if needed
        SELECT id INTO walk_in_customer_id
        FROM contacts 
        WHERE tenant_id = tenant_record.id 
          AND type = 'customer' 
          AND name = 'Walk-in Customer'
        LIMIT 1;
        
        IF walk_in_customer_id IS NULL THEN
            INSERT INTO contacts (tenant_id, name, type, email, phone, is_active)
            VALUES (
                tenant_record.id,
                'Walk-in Customer',
                'customer',
                'walkin@company.local',
                '+000-000-0000',
                true
            )
            RETURNING id INTO walk_in_customer_id;
        END IF;
        
        -- Create default supplier if needed
        SELECT id INTO default_supplier_id
        FROM contacts 
        WHERE tenant_id = tenant_record.id 
          AND type = 'supplier' 
          AND name = 'Default Supplier'
        LIMIT 1;
        
        IF default_supplier_id IS NULL THEN
            INSERT INTO contacts (tenant_id, name, type, company, email, phone, is_active)
            VALUES (
                tenant_record.id,
                'Default Supplier',
                'supplier',
                'Default Supplier Co.',
                'supplier@company.local',
                '+000-000-0000',
                true
            )
            RETURNING id INTO default_supplier_id;
        END IF;
        
        -- Fix orphaned accounts_receivable
        UPDATE accounts_receivable 
        SET customer_id = walk_in_customer_id
        WHERE tenant_id = tenant_record.id 
          AND customer_id NOT IN (SELECT id FROM contacts WHERE tenant_id = tenant_record.id);
          
        -- Fix orphaned accounts_payable
        UPDATE accounts_payable 
        SET supplier_id = default_supplier_id
        WHERE tenant_id = tenant_record.id 
          AND supplier_id NOT IN (SELECT id FROM contacts WHERE tenant_id = tenant_record.id);
          
        -- Fix orphaned purchases
        UPDATE purchases 
        SET supplier_id = default_supplier_id
        WHERE tenant_id = tenant_record.id 
          AND supplier_id NOT IN (SELECT id FROM contacts WHERE tenant_id = tenant_record.id);
    END LOOP;
END $$;

-- Now add proper foreign key constraints
ALTER TABLE public.accounts_receivable 
ADD CONSTRAINT accounts_receivable_customer_id_fkey 
FOREIGN KEY (customer_id) 
REFERENCES public.contacts(id) 
ON DELETE RESTRICT;

ALTER TABLE public.accounts_receivable 
ADD CONSTRAINT accounts_receivable_tenant_id_fkey 
FOREIGN KEY (tenant_id) 
REFERENCES public.tenants(id) 
ON DELETE CASCADE;

ALTER TABLE public.accounts_payable 
ADD CONSTRAINT accounts_payable_supplier_id_fkey 
FOREIGN KEY (supplier_id) 
REFERENCES public.contacts(id) 
ON DELETE RESTRICT;

ALTER TABLE public.accounts_payable 
ADD CONSTRAINT accounts_payable_tenant_id_fkey 
FOREIGN KEY (tenant_id) 
REFERENCES public.tenants(id) 
ON DELETE CASCADE;

ALTER TABLE public.purchases 
ADD CONSTRAINT purchases_supplier_id_fkey 
FOREIGN KEY (supplier_id) 
REFERENCES public.contacts(id) 
ON DELETE RESTRICT;

ALTER TABLE public.purchases 
ADD CONSTRAINT purchases_tenant_id_fkey 
FOREIGN KEY (tenant_id) 
REFERENCES public.tenants(id) 
ON DELETE CASCADE;