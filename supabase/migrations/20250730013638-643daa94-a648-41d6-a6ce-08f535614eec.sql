-- Add to_account_id column to transfer_requests table for account transfers
ALTER TABLE public.transfer_requests 
ADD COLUMN to_account_id UUID;

-- Add foreign key constraint to ensure referential integrity
ALTER TABLE public.transfer_requests 
ADD CONSTRAINT transfer_requests_to_account_id_fkey 
FOREIGN KEY (to_account_id) REFERENCES public.accounts(id);

-- Update existing accounts that don't have proper account_type_id relationships
-- First, let's check if there are any accounts without account_type_id
UPDATE public.accounts 
SET account_type_id = (
  SELECT id FROM public.account_types 
  WHERE tenant_id = accounts.tenant_id 
  AND name = 'Current Assets' 
  AND category = 'assets'
  LIMIT 1
)
WHERE account_type_id IS NULL 
  AND code IN ('1020', '1030', '1000') -- Asset accounts
  AND tenant_id IS NOT NULL;

-- Update liability accounts
UPDATE public.accounts 
SET account_type_id = (
  SELECT id FROM public.account_types 
  WHERE tenant_id = accounts.tenant_id 
  AND name = 'Current Liabilities' 
  AND category = 'liabilities'
  LIMIT 1
)
WHERE account_type_id IS NULL 
  AND code IN ('2010', '2020') -- Liability accounts
  AND tenant_id IS NOT NULL;

-- Update income accounts
UPDATE public.accounts 
SET account_type_id = (
  SELECT id FROM public.account_types 
  WHERE tenant_id = accounts.tenant_id 
  AND name = 'Revenue' 
  AND category = 'income'
  LIMIT 1
)
WHERE account_type_id IS NULL 
  AND code IN ('4010') -- Income accounts
  AND tenant_id IS NOT NULL;

-- Update expense accounts
UPDATE public.accounts 
SET account_type_id = (
  SELECT id FROM public.account_types 
  WHERE tenant_id = accounts.tenant_id 
  AND name = 'Cost of Goods Sold' 
  AND category = 'expenses'
  LIMIT 1
)
WHERE account_type_id IS NULL 
  AND code IN ('5010', '5020') -- Expense accounts
  AND tenant_id IS NOT NULL;

-- Update equity accounts
UPDATE public.accounts 
SET account_type_id = (
  SELECT id FROM public.account_types 
  WHERE tenant_id = accounts.tenant_id 
  AND name = 'Equity' 
  AND category = 'equity'
  LIMIT 1
)
WHERE account_type_id IS NULL 
  AND code IN ('3010') -- Equity accounts
  AND tenant_id IS NOT NULL;

-- For any remaining accounts without proper account types, create operational expenses type
DO $$
DECLARE
    tenant_rec RECORD;
    expense_type_id UUID;
BEGIN
    FOR tenant_rec IN SELECT DISTINCT tenant_id FROM public.accounts WHERE account_type_id IS NULL
    LOOP
        -- Get or create operational expenses account type
        SELECT id INTO expense_type_id 
        FROM public.account_types 
        WHERE tenant_id = tenant_rec.tenant_id 
          AND name = 'Operational Expenses' 
          AND category = 'expenses';
        
        IF expense_type_id IS NULL THEN
            INSERT INTO public.account_types (tenant_id, name, category, is_active)
            VALUES (tenant_rec.tenant_id, 'Operational Expenses', 'expenses', true)
            RETURNING id INTO expense_type_id;
        END IF;
        
        -- Update remaining accounts
        UPDATE public.accounts 
        SET account_type_id = expense_type_id
        WHERE tenant_id = tenant_rec.tenant_id 
          AND account_type_id IS NULL;
    END LOOP;
END $$;