-- Comprehensive fix for all sales and purchase-related foreign key constraints

-- Fix accounts_receivable foreign key constraints
DO $$ 
BEGIN
    -- First clean up any orphaned records in accounts_receivable
    UPDATE public.accounts_receivable 
    SET customer_id = NULL 
    WHERE customer_id IS NOT NULL 
    AND customer_id NOT IN (SELECT id FROM public.contacts WHERE id IS NOT NULL);

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
        ON DELETE SET NULL;
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

-- Fix accounts_payable foreign key constraints  
DO $$ 
BEGIN
    -- Clean up any orphaned records in accounts_payable
    UPDATE public.accounts_payable 
    SET supplier_id = NULL 
    WHERE supplier_id IS NOT NULL 
    AND supplier_id NOT IN (
        SELECT id FROM public.contacts 
        WHERE id IS NOT NULL AND type = 'supplier'
    );

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
        ON DELETE SET NULL;
    END IF;

    -- Add tenant_id foreign key for accounts_payable
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
END $$;

-- Fix purchases foreign key constraints
DO $$ 
BEGIN
    -- Clean up any orphaned records in purchases
    UPDATE public.purchases 
    SET supplier_id = NULL 
    WHERE supplier_id IS NOT NULL 
    AND supplier_id NOT IN (
        SELECT id FROM public.contacts 
        WHERE id IS NOT NULL AND type = 'supplier'
    );

    -- Add foreign key constraint for purchases -> contacts (supplier)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'purchases_supplier_id_fkey' 
        AND table_name = 'purchases'
    ) THEN
        ALTER TABLE public.purchases 
        ADD CONSTRAINT purchases_supplier_id_fkey 
        FOREIGN KEY (supplier_id) 
        REFERENCES public.contacts(id) 
        ON DELETE SET NULL;
    END IF;

    -- Add tenant_id foreign key for purchases
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

-- Fix quotes table if it exists
DO $$ 
BEGIN
    -- Check if quotes table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quotes' AND table_schema = 'public') THEN
        -- Clean up any orphaned records in quotes
        UPDATE public.quotes 
        SET customer_id = NULL 
        WHERE customer_id IS NOT NULL 
        AND customer_id NOT IN (SELECT id FROM public.contacts WHERE id IS NOT NULL);

        -- Add foreign key constraint for quotes -> contacts
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'quotes_customer_id_fkey' 
            AND table_name = 'quotes'
        ) THEN
            ALTER TABLE public.quotes 
            ADD CONSTRAINT quotes_customer_id_fkey 
            FOREIGN KEY (customer_id) 
            REFERENCES public.contacts(id) 
            ON DELETE SET NULL;
        END IF;

        -- Add tenant_id foreign key for quotes
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'quotes_tenant_id_fkey' 
            AND table_name = 'quotes'
        ) THEN
            ALTER TABLE public.quotes 
            ADD CONSTRAINT quotes_tenant_id_fkey 
            FOREIGN KEY (tenant_id) 
            REFERENCES public.tenants(id) 
            ON DELETE CASCADE;
        END IF;
    END IF;
END $$;