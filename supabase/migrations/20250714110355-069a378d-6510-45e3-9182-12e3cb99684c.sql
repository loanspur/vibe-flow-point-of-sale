-- Create promotions table
CREATE TABLE public.promotions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('percentage', 'fixed_amount', 'bogo', 'bulk_pricing')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'expired')),
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE,
  
  -- Discount settings
  discount_percentage NUMERIC(5,2),
  discount_amount NUMERIC(10,2),
  
  -- BOGO settings
  buy_quantity INTEGER,
  get_quantity INTEGER,
  
  -- Bulk pricing settings
  min_quantity INTEGER,
  max_quantity INTEGER,
  
  -- Conditions
  min_purchase_amount NUMERIC(10,2),
  max_usage_count INTEGER,
  current_usage_count INTEGER DEFAULT 0,
  customer_type TEXT, -- 'all', 'new', 'returning'
  
  -- Product restrictions
  applies_to TEXT NOT NULL DEFAULT 'all' CHECK (applies_to IN ('all', 'categories', 'products')),
  category_ids JSONB,
  product_ids JSONB,
  
  -- Time restrictions
  days_of_week JSONB, -- [0,1,2,3,4,5,6] for Sun-Sat
  time_start TIME,
  time_end TIME,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL
);

-- Create promotion usage tracking table
CREATE TABLE public.promotion_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  promotion_id UUID NOT NULL REFERENCES public.promotions(id) ON DELETE CASCADE,
  sale_id UUID REFERENCES public.sales(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  discount_amount NUMERIC(10,2) NOT NULL,
  quantity_affected INTEGER DEFAULT 1,
  used_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  tenant_id UUID NOT NULL
);

-- Enable RLS
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotion_usage ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for promotions
CREATE POLICY "Tenant managers can manage promotions"
ON public.promotions
FOR ALL
TO authenticated
USING (tenant_id = get_user_tenant_id() AND get_current_user_role() = ANY(ARRAY['superadmin'::user_role, 'admin'::user_role, 'manager'::user_role]));

CREATE POLICY "Tenant users can view promotions"
ON public.promotions
FOR SELECT
TO authenticated
USING (tenant_id = get_user_tenant_id());

-- Create RLS policies for promotion usage
CREATE POLICY "Tenant staff can manage promotion usage"
ON public.promotion_usage
FOR ALL
TO authenticated
USING (tenant_id = get_user_tenant_id() AND get_current_user_role() = ANY(ARRAY['superadmin'::user_role, 'admin'::user_role, 'manager'::user_role, 'cashier'::user_role]));

CREATE POLICY "Tenant users can view promotion usage"
ON public.promotion_usage
FOR SELECT
TO authenticated
USING (tenant_id = get_user_tenant_id());

-- Create indexes
CREATE INDEX idx_promotions_tenant_id ON public.promotions(tenant_id);
CREATE INDEX idx_promotions_status ON public.promotions(status);
CREATE INDEX idx_promotions_dates ON public.promotions(start_date, end_date);
CREATE INDEX idx_promotions_type ON public.promotions(type);
CREATE INDEX idx_promotion_usage_tenant_id ON public.promotion_usage(tenant_id);
CREATE INDEX idx_promotion_usage_promotion_id ON public.promotion_usage(promotion_id);
CREATE INDEX idx_promotion_usage_sale_id ON public.promotion_usage(sale_id);

-- Create updated_at trigger for promotions
CREATE TRIGGER update_promotions_updated_at
  BEFORE UPDATE ON public.promotions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to check if promotion is valid
CREATE OR REPLACE FUNCTION public.is_promotion_valid(
  promotion_id_param UUID,
  current_time_param TIMESTAMP WITH TIME ZONE DEFAULT now(),
  purchase_amount_param NUMERIC DEFAULT 0,
  customer_type_param TEXT DEFAULT 'all'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
DECLARE
  promo RECORD;
  current_day INTEGER;
  current_time_only TIME;
BEGIN
  -- Get promotion details
  SELECT * INTO promo FROM public.promotions WHERE id = promotion_id_param;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Check if promotion is active
  IF promo.status != 'active' THEN
    RETURN FALSE;
  END IF;
  
  -- Check date range
  IF current_time_param < promo.start_date THEN
    RETURN FALSE;
  END IF;
  
  IF promo.end_date IS NOT NULL AND current_time_param > promo.end_date THEN
    RETURN FALSE;
  END IF;
  
  -- Check usage limit
  IF promo.max_usage_count IS NOT NULL AND promo.current_usage_count >= promo.max_usage_count THEN
    RETURN FALSE;
  END IF;
  
  -- Check minimum purchase amount
  IF promo.min_purchase_amount IS NOT NULL AND purchase_amount_param < promo.min_purchase_amount THEN
    RETURN FALSE;
  END IF;
  
  -- Check customer type
  IF promo.customer_type IS NOT NULL AND promo.customer_type != 'all' AND promo.customer_type != customer_type_param THEN
    RETURN FALSE;
  END IF;
  
  -- Check day of week
  IF promo.days_of_week IS NOT NULL THEN
    current_day := EXTRACT(DOW FROM current_time_param);
    IF NOT (promo.days_of_week ? current_day::text) THEN
      RETURN FALSE;
    END IF;
  END IF;
  
  -- Check time range
  IF promo.time_start IS NOT NULL AND promo.time_end IS NOT NULL THEN
    current_time_only := current_time_param::TIME;
    IF current_time_only < promo.time_start OR current_time_only > promo.time_end THEN
      RETURN FALSE;
    END IF;
  END IF;
  
  RETURN TRUE;
END;
$$;

-- Create function to calculate discount amount
CREATE OR REPLACE FUNCTION public.calculate_promotion_discount(
  promotion_id_param UUID,
  item_price_param NUMERIC,
  item_quantity_param INTEGER DEFAULT 1,
  total_amount_param NUMERIC DEFAULT 0
)
RETURNS TABLE(discount_amount NUMERIC, affected_quantity INTEGER)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
DECLARE
  promo RECORD;
  calculated_discount NUMERIC DEFAULT 0;
  calculated_quantity INTEGER DEFAULT 0;
BEGIN
  -- Get promotion details
  SELECT * INTO promo FROM public.promotions WHERE id = promotion_id_param;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT 0::NUMERIC, 0::INTEGER;
    RETURN;
  END IF;
  
  CASE promo.type
    WHEN 'percentage' THEN
      calculated_discount := (item_price_param * item_quantity_param) * (promo.discount_percentage / 100);
      calculated_quantity := item_quantity_param;
      
    WHEN 'fixed_amount' THEN
      calculated_discount := LEAST(promo.discount_amount, item_price_param * item_quantity_param);
      calculated_quantity := item_quantity_param;
      
    WHEN 'bogo' THEN
      IF item_quantity_param >= promo.buy_quantity THEN
        calculated_quantity := (item_quantity_param / promo.buy_quantity) * promo.get_quantity;
        calculated_discount := calculated_quantity * item_price_param;
      END IF;
      
    WHEN 'bulk_pricing' THEN
      IF item_quantity_param >= promo.min_quantity AND 
         (promo.max_quantity IS NULL OR item_quantity_param <= promo.max_quantity) THEN
        IF promo.discount_percentage IS NOT NULL THEN
          calculated_discount := (item_price_param * item_quantity_param) * (promo.discount_percentage / 100);
        ELSIF promo.discount_amount IS NOT NULL THEN
          calculated_discount := promo.discount_amount * item_quantity_param;
        END IF;
        calculated_quantity := item_quantity_param;
      END IF;
  END CASE;
  
  RETURN QUERY SELECT calculated_discount, calculated_quantity;
END;
$$;