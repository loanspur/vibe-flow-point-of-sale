-- Add remaining foreign key constraints with proper existence checks

DO $$ 
BEGIN
    -- Add accounts_receivable constraints if they don't exist
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

    -- Add accounts_payable constraints if they don't exist
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

    -- Add purchases constraints if they don't exist
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

    -- This one already exists, so skip it
    -- purchases_tenant_id_fkey already exists
END $$;