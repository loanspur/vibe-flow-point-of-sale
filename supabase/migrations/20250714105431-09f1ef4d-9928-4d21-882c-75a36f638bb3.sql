-- Create purchases table
CREATE TABLE IF NOT EXISTS public.purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_number TEXT NOT NULL,
  supplier_id UUID NOT NULL REFERENCES public.contacts(id),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'ordered', 'received', 'cancelled')),
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_date DATE,
  received_date DATE,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(purchase_number, tenant_id)
);

-- Create purchase_items table
CREATE TABLE IF NOT EXISTS public.purchase_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id UUID NOT NULL REFERENCES public.purchases(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  quantity_ordered INTEGER NOT NULL CHECK (quantity_ordered > 0),
  quantity_received INTEGER NOT NULL DEFAULT 0 CHECK (quantity_received >= 0),
  unit_cost DECIMAL(10,2) NOT NULL CHECK (unit_cost >= 0),
  total_cost DECIMAL(10,2) NOT NULL CHECK (total_cost >= 0),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on purchases table
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

-- Enable RLS on purchase_items table
ALTER TABLE public.purchase_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for purchases
CREATE POLICY "Tenant staff can manage tenant purchases"
ON public.purchases
FOR ALL
USING (
  (tenant_id = get_user_tenant_id()) AND 
  (get_current_user_role() = ANY (ARRAY['superadmin'::user_role, 'admin'::user_role, 'manager'::user_role, 'cashier'::user_role]))
);

CREATE POLICY "Tenant users can view tenant purchases"
ON public.purchases
FOR SELECT
USING (tenant_id = get_user_tenant_id());

-- Create RLS policies for purchase_items
CREATE POLICY "Tenant staff can manage purchase items"
ON public.purchase_items
FOR ALL
USING (
  (purchase_id IN (
    SELECT id FROM public.purchases 
    WHERE tenant_id = get_user_tenant_id()
  )) AND 
  (get_current_user_role() = ANY (ARRAY['superadmin'::user_role, 'admin'::user_role, 'manager'::user_role, 'cashier'::user_role]))
);

CREATE POLICY "Tenant users can view purchase items"
ON public.purchase_items
FOR SELECT
USING (
  purchase_id IN (
    SELECT id FROM public.purchases 
    WHERE tenant_id = get_user_tenant_id()
  )
);

-- Create indexes for better performance
CREATE INDEX idx_purchases_tenant_id ON public.purchases(tenant_id);
CREATE INDEX idx_purchases_supplier_id ON public.purchases(supplier_id);
CREATE INDEX idx_purchases_status ON public.purchases(status);
CREATE INDEX idx_purchases_order_date ON public.purchases(order_date);
CREATE INDEX idx_purchase_items_purchase_id ON public.purchase_items(purchase_id);
CREATE INDEX idx_purchase_items_product_id ON public.purchase_items(product_id);

-- Create triggers for updated_at timestamps
CREATE TRIGGER update_purchases_updated_at
  BEFORE UPDATE ON public.purchases
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_purchase_items_updated_at
  BEFORE UPDATE ON public.purchase_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to calculate purchase total
CREATE OR REPLACE FUNCTION public.calculate_purchase_total(purchase_id_param UUID)
RETURNS DECIMAL AS $$
DECLARE
  total_amount DECIMAL DEFAULT 0;
BEGIN
  SELECT COALESCE(SUM(total_cost), 0)
  INTO total_amount
  FROM public.purchase_items
  WHERE purchase_id = purchase_id_param;
  
  RETURN total_amount;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to update purchase total when items change
CREATE OR REPLACE FUNCTION public.update_purchase_total()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.purchases
  SET total_amount = public.calculate_purchase_total(
    CASE 
      WHEN TG_OP = 'DELETE' THEN OLD.purchase_id
      ELSE NEW.purchase_id
    END
  )
  WHERE id = CASE 
    WHEN TG_OP = 'DELETE' THEN OLD.purchase_id
    ELSE NEW.purchase_id
  END;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update purchase total
CREATE TRIGGER update_purchase_total_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.purchase_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_purchase_total();