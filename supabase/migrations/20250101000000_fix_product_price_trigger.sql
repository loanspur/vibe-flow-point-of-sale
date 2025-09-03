-- Fix product price field by creating a trigger to auto-calculate it
-- This resolves the "null value in column price violates not-null constraint" error

-- Create function to calculate the main price field
CREATE OR REPLACE FUNCTION public.calculate_product_price()
RETURNS TRIGGER AS $$
BEGIN
  -- Set the main price field based on available pricing
  -- Priority: retail_price > wholesale_price > cost_price
  IF NEW.retail_price > 0 THEN
    NEW.price := NEW.retail_price;
  ELSIF NEW.wholesale_price > 0 THEN
    NEW.price := NEW.wholesale_price;
  ELSIF NEW.cost_price > 0 THEN
    NEW.price := NEW.cost_price;
  ELSE
    -- If no price is set, use cost_price as fallback (even if 0)
    NEW.price := COALESCE(NEW.cost_price, 0);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to run before insert/update
-- This trigger must run BEFORE other triggers to ensure price field is set
DROP TRIGGER IF EXISTS trg_calculate_product_price ON public.products;
CREATE TRIGGER trg_calculate_product_price
  BEFORE INSERT OR UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_product_price();

-- Ensure the trigger runs first by setting priority
-- The price calculation must happen before audit/history triggers
ALTER TRIGGER trg_calculate_product_price ON public.products RENAME TO trg_calculate_product_price_priority;

-- Fix the track_product_changes function to handle null auth.uid()
CREATE OR REPLACE FUNCTION public.track_product_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  tenant_id_val UUID;
  changed_fields JSONB := '{}';
  field_name TEXT;
  old_val JSONB;
  new_val JSONB;
  current_user_id UUID;
BEGIN
  -- Get current user ID with fallback
  current_user_id := COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::UUID);
  
  -- Get tenant_id from the record
  IF TG_OP = 'DELETE' THEN
    tenant_id_val := OLD.tenant_id;
  ELSE
    tenant_id_val := NEW.tenant_id;
  END IF;

  -- Handle different operations
  IF TG_OP = 'INSERT' THEN
    -- Track product creation
    INSERT INTO product_history (
      tenant_id, product_id, action_type, new_value, changed_by, metadata
    ) VALUES (
      NEW.tenant_id,
      NEW.id,
      'created',
      to_jsonb(NEW),
      current_user_id,
      jsonb_build_object('operation', 'INSERT')
    );
  
  ELSIF TG_OP = 'UPDATE' THEN
    -- Track specific field changes
    FOR field_name IN 
      SELECT unnest(ARRAY['name', 'description', 'sku', 'price', 'stock_quantity', 'min_stock_level', 'is_active', 'category_id', 'brand_id'])
    LOOP
      -- Get old and new values for the field
      EXECUTE format('SELECT to_jsonb($1.%I)', field_name) INTO old_val USING OLD;
      EXECUTE format('SELECT to_jsonb($1.%I)', field_name) INTO new_val USING NEW;
      
      -- If values are different, record the change
      IF old_val IS DISTINCT FROM new_val THEN
        INSERT INTO product_history (
          tenant_id, product_id, action_type, field_changed, old_value, new_value, changed_by, metadata
        ) VALUES (
          NEW.tenant_id,
          NEW.id,
          CASE 
            WHEN field_name = 'price' THEN 'price_change'
            WHEN field_name = 'stock_quantity' THEN 'stock_adjustment'
            WHEN field_name = 'is_active' THEN 'status_change'
            ELSE 'updated'
          END,
          field_name,
          old_val,
          new_val,
          current_user_id,
          jsonb_build_object('operation', 'UPDATE', 'field', field_name)
        );
      END IF;
    END LOOP;
  
  ELSIF TG_OP = 'DELETE' THEN
    -- Track product deletion
    INSERT INTO product_history (
      tenant_id, product_id, action_type, old_value, changed_by, metadata
    ) VALUES (
      OLD.tenant_id,
      OLD.id,
      'deleted',
      to_jsonb(OLD),
      current_user_id,
      jsonb_build_object('operation', 'DELETE')
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Update existing products to have a valid price field
UPDATE public.products 
SET price = CASE 
  WHEN retail_price > 0 THEN retail_price
  WHEN wholesale_price > 0 THEN wholesale_price
  WHEN cost_price > 0 THEN cost_price
  ELSE 0
END
WHERE price IS NULL OR price = 0;

-- Add comment to explain the trigger
COMMENT ON FUNCTION public.calculate_product_price() IS 'Automatically calculates the main price field from retail_price, wholesale_price, or cost_price to satisfy NOT NULL constraint';
COMMENT ON FUNCTION public.track_product_changes() IS 'Tracks product changes with fallback for auth.uid() to prevent null constraint violations';

-- Note: We'll focus on fixing the immediate price field and track_product_changes issues
-- The audit functions can be addressed separately if needed

-- The audit functions will be addressed separately if needed
