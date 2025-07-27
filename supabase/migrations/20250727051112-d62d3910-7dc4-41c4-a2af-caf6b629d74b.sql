-- Verify no null values remain and make customer_id NOT NULL
ALTER TABLE public.sales 
ALTER COLUMN customer_id SET NOT NULL;

-- Add foreign key constraint
ALTER TABLE public.sales 
ADD CONSTRAINT fk_sales_customer 
FOREIGN KEY (customer_id) REFERENCES public.customers(id);