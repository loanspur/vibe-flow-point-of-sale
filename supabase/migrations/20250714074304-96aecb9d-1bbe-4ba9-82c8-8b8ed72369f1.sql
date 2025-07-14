-- Create functions to update product and variant stock quantities

CREATE OR REPLACE FUNCTION public.update_product_stock(
  product_id UUID,
  quantity_sold INTEGER
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.products 
  SET stock_quantity = GREATEST(0, stock_quantity - quantity_sold)
  WHERE id = product_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_variant_stock(
  variant_id UUID,
  quantity_sold INTEGER
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.product_variants 
  SET stock_quantity = GREATEST(0, stock_quantity - quantity_sold)
  WHERE id = variant_id;
END;
$$;