-- Now make customer_id NOT NULL since we've fixed all null values
ALTER TABLE public.sales 
ALTER COLUMN customer_id SET NOT NULL;

-- Add a foreign key constraint to ensure data integrity
ALTER TABLE public.sales 
ADD CONSTRAINT fk_sales_customer 
FOREIGN KEY (customer_id) REFERENCES public.customers(id);