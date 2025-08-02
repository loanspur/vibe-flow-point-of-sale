-- Add foreign key constraint for sales.customer_id to contacts.id
-- This will ensure data integrity between sales and customer contacts

ALTER TABLE public.sales
ADD CONSTRAINT fk_sales_customer
FOREIGN KEY (customer_id)
REFERENCES public.contacts(id)
ON DELETE SET NULL
ON UPDATE CASCADE;

-- Add foreign key constraint for sales.tenant_id (should not be nullable)
ALTER TABLE public.sales
ALTER COLUMN tenant_id SET NOT NULL;

-- Add foreign key constraint for sales.cashier_id to auth.users
-- Note: We're creating a more flexible relationship that allows for user profile updates
ALTER TABLE public.sales
ADD CONSTRAINT fk_sales_cashier
FOREIGN KEY (cashier_id)
REFERENCES auth.users(id)
ON DELETE RESTRICT
ON UPDATE CASCADE;

-- Ensure purchase-related foreign keys are also properly set
ALTER TABLE public.purchases
ADD CONSTRAINT fk_purchases_supplier
FOREIGN KEY (supplier_id)
REFERENCES public.contacts(id)
ON DELETE SET NULL
ON UPDATE CASCADE;

-- Ensure tenant_id is not nullable for purchases
ALTER TABLE public.purchases
ALTER COLUMN tenant_id SET NOT NULL;

-- Add constraint to ensure customer_id in sales references only customers
ALTER TABLE public.sales
ADD CONSTRAINT chk_sales_customer_type
CHECK (
  customer_id IS NULL OR
  customer_id IN (
    SELECT id FROM public.contacts WHERE type = 'customer'
  )
);

-- Add constraint to ensure supplier_id in purchases references only suppliers
ALTER TABLE public.purchases
ADD CONSTRAINT chk_purchases_supplier_type
CHECK (
  supplier_id IS NULL OR
  supplier_id IN (
    SELECT id FROM public.contacts WHERE type = 'supplier'
  )
);

-- Create index for better performance on foreign key lookups
CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON public.sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_tenant_id ON public.sales(tenant_id);
CREATE INDEX IF NOT EXISTS idx_purchases_supplier_id ON public.purchases(supplier_id);
CREATE INDEX IF NOT EXISTS idx_contacts_type_tenant ON public.contacts(type, tenant_id);