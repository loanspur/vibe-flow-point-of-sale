-- Create return reason codes table
CREATE TABLE public.return_reason_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  code TEXT NOT NULL,
  description TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  requires_approval BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, code)
);

-- Create returns table
CREATE TABLE public.returns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  return_number TEXT NOT NULL,
  original_sale_id UUID,
  customer_id UUID,
  processed_by UUID NOT NULL,
  return_type TEXT NOT NULL DEFAULT 'refund', -- 'refund', 'exchange', 'store_credit'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'completed', 'cancelled'
  reason_code_id UUID,
  custom_reason TEXT,
  subtotal_amount NUMERIC NOT NULL DEFAULT 0,
  tax_amount NUMERIC NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  refund_amount NUMERIC NOT NULL DEFAULT 0,
  store_credit_amount NUMERIC NOT NULL DEFAULT 0,
  exchange_difference NUMERIC NOT NULL DEFAULT 0,
  refund_method TEXT, -- 'cash', 'card', 'original_payment', 'store_credit'
  notes TEXT,
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, return_number)
);

-- Create return items table
CREATE TABLE public.return_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  return_id UUID NOT NULL,
  product_id UUID NOT NULL,
  variant_id UUID,
  original_sale_item_id UUID,
  quantity_returned INTEGER NOT NULL,
  unit_price NUMERIC NOT NULL,
  total_price NUMERIC NOT NULL,
  condition_notes TEXT, -- 'new', 'damaged', 'defective', 'opened', etc.
  restock BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create exchange items table (for items given in exchange)
CREATE TABLE public.exchange_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  return_id UUID NOT NULL,
  product_id UUID NOT NULL,
  variant_id UUID,
  quantity INTEGER NOT NULL,
  unit_price NUMERIC NOT NULL,
  total_price NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add foreign key constraints
ALTER TABLE public.returns ADD CONSTRAINT returns_original_sale_id_fkey 
  FOREIGN KEY (original_sale_id) REFERENCES public.sales(id);
ALTER TABLE public.returns ADD CONSTRAINT returns_customer_id_fkey 
  FOREIGN KEY (customer_id) REFERENCES public.customers(id);
ALTER TABLE public.returns ADD CONSTRAINT returns_reason_code_id_fkey 
  FOREIGN KEY (reason_code_id) REFERENCES public.return_reason_codes(id);

ALTER TABLE public.return_items ADD CONSTRAINT return_items_return_id_fkey 
  FOREIGN KEY (return_id) REFERENCES public.returns(id) ON DELETE CASCADE;
ALTER TABLE public.return_items ADD CONSTRAINT return_items_product_id_fkey 
  FOREIGN KEY (product_id) REFERENCES public.products(id);
ALTER TABLE public.return_items ADD CONSTRAINT return_items_variant_id_fkey 
  FOREIGN KEY (variant_id) REFERENCES public.product_variants(id);
ALTER TABLE public.return_items ADD CONSTRAINT return_items_original_sale_item_id_fkey 
  FOREIGN KEY (original_sale_item_id) REFERENCES public.sale_items(id);

ALTER TABLE public.exchange_items ADD CONSTRAINT exchange_items_return_id_fkey 
  FOREIGN KEY (return_id) REFERENCES public.returns(id) ON DELETE CASCADE;
ALTER TABLE public.exchange_items ADD CONSTRAINT exchange_items_product_id_fkey 
  FOREIGN KEY (product_id) REFERENCES public.products(id);
ALTER TABLE public.exchange_items ADD CONSTRAINT exchange_items_variant_id_fkey 
  FOREIGN KEY (variant_id) REFERENCES public.product_variants(id);

-- Enable Row Level Security
ALTER TABLE public.return_reason_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.return_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exchange_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for return_reason_codes
CREATE POLICY "Tenant admins can manage return reason codes" 
ON public.return_reason_codes FOR ALL 
USING (tenant_id = get_user_tenant_id() AND is_tenant_admin());

CREATE POLICY "Tenant users can view return reason codes" 
ON public.return_reason_codes FOR SELECT 
USING (tenant_id = get_user_tenant_id());

-- Create RLS policies for returns
CREATE POLICY "Tenant staff can manage returns" 
ON public.returns FOR ALL 
USING (tenant_id = get_user_tenant_id() AND get_current_user_role() = ANY(ARRAY['superadmin'::user_role, 'admin'::user_role, 'manager'::user_role, 'cashier'::user_role]));

CREATE POLICY "Tenant users can view returns" 
ON public.returns FOR SELECT 
USING (tenant_id = get_user_tenant_id());

-- Create RLS policies for return_items
CREATE POLICY "Tenant staff can manage return items" 
ON public.return_items FOR ALL 
USING (return_id IN (
  SELECT id FROM public.returns 
  WHERE tenant_id = get_user_tenant_id()
) AND get_current_user_role() = ANY(ARRAY['superadmin'::user_role, 'admin'::user_role, 'manager'::user_role, 'cashier'::user_role]));

CREATE POLICY "Tenant users can view return items" 
ON public.return_items FOR SELECT 
USING (return_id IN (
  SELECT id FROM public.returns 
  WHERE tenant_id = get_user_tenant_id()
));

-- Create RLS policies for exchange_items
CREATE POLICY "Tenant staff can manage exchange items" 
ON public.exchange_items FOR ALL 
USING (return_id IN (
  SELECT id FROM public.returns 
  WHERE tenant_id = get_user_tenant_id()
) AND get_current_user_role() = ANY(ARRAY['superadmin'::user_role, 'admin'::user_role, 'manager'::user_role, 'cashier'::user_role]));

CREATE POLICY "Tenant users can view exchange items" 
ON public.exchange_items FOR SELECT 
USING (return_id IN (
  SELECT id FROM public.returns 
  WHERE tenant_id = get_user_tenant_id()
));

-- Create indexes for better performance
CREATE INDEX idx_returns_tenant_id ON public.returns(tenant_id);
CREATE INDEX idx_returns_original_sale_id ON public.returns(original_sale_id);
CREATE INDEX idx_returns_return_number ON public.returns(return_number);
CREATE INDEX idx_returns_status ON public.returns(status);
CREATE INDEX idx_return_items_return_id ON public.return_items(return_id);
CREATE INDEX idx_exchange_items_return_id ON public.exchange_items(return_id);

-- Create triggers for updated_at columns
CREATE TRIGGER update_return_reason_codes_updated_at
  BEFORE UPDATE ON public.return_reason_codes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_returns_updated_at
  BEFORE UPDATE ON public.returns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_return_items_updated_at
  BEFORE UPDATE ON public.return_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default return reason codes
INSERT INTO public.return_reason_codes (tenant_id, code, description, requires_approval, display_order) VALUES
  ('00000000-0000-0000-0000-000000000000', 'DEFECTIVE', 'Item is defective or damaged', false, 1),
  ('00000000-0000-0000-0000-000000000000', 'WRONG_SIZE', 'Wrong size ordered', false, 2),
  ('00000000-0000-0000-0000-000000000000', 'NOT_AS_DESCRIBED', 'Item not as described', false, 3),
  ('00000000-0000-0000-0000-000000000000', 'CHANGED_MIND', 'Customer changed mind', false, 4),
  ('00000000-0000-0000-0000-000000000000', 'DUPLICATE_ORDER', 'Duplicate order', false, 5),
  ('00000000-0000-0000-0000-000000000000', 'EXPIRED', 'Product expired', true, 6),
  ('00000000-0000-0000-0000-000000000000', 'WARRANTY', 'Warranty claim', true, 7),
  ('00000000-0000-0000-0000-000000000000', 'OTHER', 'Other reason', false, 8);

-- Create function to generate return number
CREATE OR REPLACE FUNCTION public.generate_return_number(tenant_id_param UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  sequence_num INTEGER;
  return_number TEXT;
BEGIN
  -- Get the next sequence number for this tenant
  SELECT COUNT(*) + 1 INTO sequence_num
  FROM public.returns 
  WHERE tenant_id = tenant_id_param;
  
  -- Format: RET-YYYYMMDD-NNNN
  return_number := 'RET-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(sequence_num::TEXT, 4, '0');
  
  RETURN return_number;
END;
$$;

-- Create function to process return and update stock
CREATE OR REPLACE FUNCTION public.process_return(return_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  return_record RECORD;
  item_record RECORD;
BEGIN
  -- Get return details
  SELECT * INTO return_record FROM public.returns WHERE id = return_id_param;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Update return status
  UPDATE public.returns 
  SET status = 'completed', completed_at = NOW()
  WHERE id = return_id_param;
  
  -- Process each return item and update stock if restocking
  FOR item_record IN 
    SELECT * FROM public.return_items WHERE return_id = return_id_param
  LOOP
    IF item_record.restock THEN
      -- Update product stock
      UPDATE public.products 
      SET stock_quantity = stock_quantity + item_record.quantity_returned
      WHERE id = item_record.product_id;
      
      -- Update variant stock if applicable
      IF item_record.variant_id IS NOT NULL THEN
        UPDATE public.product_variants 
        SET stock_quantity = stock_quantity + item_record.quantity_returned
        WHERE id = item_record.variant_id;
      END IF;
    END IF;
  END LOOP;
  
  RETURN TRUE;
END;
$$;