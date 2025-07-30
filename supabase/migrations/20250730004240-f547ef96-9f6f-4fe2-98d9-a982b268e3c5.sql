-- Fix foreign key constraints while handling NOT NULL constraints properly

-- First, ensure there's a generic "Walk-in Customer" contact for each tenant
DO $$ 
DECLARE
    tenant_record RECORD;
    walk_in_customer_id UUID;
BEGIN
    -- Create walk-in customers for each tenant if they don't exist
    FOR tenant_record IN 
        SELECT DISTINCT tenant_id 
        FROM accounts_receivable 
        WHERE customer_id NOT IN (SELECT id FROM contacts WHERE id IS NOT NULL)
    LOOP
        -- Check if walk-in customer already exists for this tenant
        SELECT id INTO walk_in_customer_id
        FROM contacts 
        WHERE tenant_id = tenant_record.tenant_id 
          AND type = 'customer' 
          AND name = 'Walk-in Customer'
        LIMIT 1;
        
        -- Create walk-in customer if it doesn't exist
        IF walk_in_customer_id IS NULL THEN
            INSERT INTO contacts (tenant_id, name, type, email, phone, is_active)
            VALUES (
                tenant_record.tenant_id,
                'Walk-in Customer',
                'customer',
                'walkin@' || tenant_record.tenant_id || '.local',
                '+000-000-0000',
                true
            )
            RETURNING id INTO walk_in_customer_id;
        END IF;
        
        -- Update orphaned records to use walk-in customer
        UPDATE accounts_receivable 
        SET customer_id = walk_in_customer_id
        WHERE tenant_id = tenant_record.tenant_id 
          AND customer_id NOT IN (SELECT id FROM contacts WHERE id IS NOT NULL);
    END LOOP;
END $$;

-- Now add the foreign key constraints
DO $$ 
BEGIN
    -- Add foreign key constraint for accounts_receivable -> contacts
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'accounts_receivable_customer_id_fkey' 
        AND table_name = 'accounts_receivable'
    ) THEN
        ALTER TABLE public.accounts_receivable 
        ADD CONSTRAINT accounts_receivable_customer_id_fkey 
        FOREIGN KEY (customer_id) 
        REFERENCES public.contacts(id) 
        ON DELETE RESTRICT;
    END IF;

    -- Add tenant_id foreign key for accounts_receivable
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'accounts_receivable_tenant_id_fkey' 
        AND table_name = 'accounts_receivable'
    ) THEN
        ALTER TABLE public.accounts_receivable 
        ADD CONSTRAINT accounts_receivable_tenant_id_fkey 
        FOREIGN KEY (tenant_id) 
        REFERENCES public.tenants(id) 
        ON DELETE CASCADE;
    END IF;
END $$;

-- Fix accounts_payable and purchases
DO $$ 
DECLARE
    tenant_record RECORD;
    default_supplier_id UUID;
BEGIN
    -- Handle accounts_payable orphaned suppliers
    FOR tenant_record IN 
        SELECT DISTINCT tenant_id 
        FROM accounts_payable 
        WHERE supplier_id NOT IN (
            SELECT id FROM contacts 
            WHERE id IS NOT NULL AND type = 'supplier'
        )
    LOOP
        -- Check if default supplier exists for this tenant
        SELECT id INTO default_supplier_id
        FROM contacts 
        WHERE tenant_id = tenant_record.tenant_id 
          AND type = 'supplier' 
          AND name = 'Default Supplier'
        LIMIT 1;
        
        -- Create default supplier if it doesn't exist
        IF default_supplier_id IS NULL THEN
            INSERT INTO contacts (tenant_id, name, type, company, email, phone, is_active)
            VALUES (
                tenant_record.tenant_id,
                'Default Supplier',
                'supplier',
                'Default Supplier Co.',
                'supplier@' || tenant_record.tenant_id || '.local',
                '+000-000-0000',
                true
            )
            RETURNING id INTO default_supplier_id;
        END IF;
        
        -- Update orphaned accounts_payable records
        UPDATE accounts_payable 
        SET supplier_id = default_supplier_id
        WHERE tenant_id = tenant_record.tenant_id 
          AND supplier_id NOT IN (
              SELECT id FROM contacts 
              WHERE id IS NOT NULL AND type = 'supplier'
          );
          
        -- Update orphaned purchases records
        UPDATE purchases 
        SET supplier_id = default_supplier_id
        WHERE tenant_id = tenant_record.tenant_id 
          AND supplier_id NOT IN (
              SELECT id FROM contacts 
              WHERE id IS NOT NULL AND type = 'supplier'
          );
    END LOOP;
END $$;

-- Add remaining foreign key constraints
DO $$ 
BEGIN
    -- Add foreign key constraint for accounts_payable -> contacts
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'accounts_payable_supplier_id_fkey' 
        AND table_name = 'accounts_payable'
    ) THEN
        ALTER TABLE public.accounts_payable 
        ADD CONSTRAINT accounts_payable_supplier_id_fkey 
        FOREIGN KEY (supplier_id) 
        REFERENCES public.contacts(id) 
        ON DELETE RESTRICT;
    END IF;

    -- Add foreign key constraint for purchases -> contacts
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'purchases_supplier_id_fkey' 
        AND table_name = 'purchases'
    ) THEN
        ALTER TABLE public.purchases 
        ADD CONSTRAINT purchases_supplier_id_fkey 
        FOREIGN KEY (supplier_id) 
        REFERENCES public.contacts(id) 
        ON DELETE RESTRICT;
    END IF;

    -- Add tenant foreign keys
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'accounts_payable_tenant_id_fkey' 
        AND table_name = 'accounts_payable'
    ) THEN
        ALTER TABLE public.accounts_payable 
        ADD CONSTRAINT accounts_payable_tenant_id_fkey 
        FOREIGN KEY (tenant_id) 
        REFERENCES public.tenants(id) 
        ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'purchases_tenant_id_fkey' 
        AND table_name = 'purchases'
    ) THEN
        ALTER TABLE public.purchases 
        ADD CONSTRAINT purchases_tenant_id_fkey 
        FOREIGN KEY (tenant_id) 
        REFERENCES public.tenants(id) 
        ON DELETE CASCADE;
    END IF;
END $$;