-- Add wholesale pricing fields to products table
ALTER TABLE products
ADD COLUMN wholesale_price DECIMAL(15,2) DEFAULT NULL,
ADD COLUMN retail_price DECIMAL(15,2) DEFAULT NULL;

-- Add comments for documentation
COMMENT ON COLUMN products.wholesale_price IS 'Wholesale price for reseller customers';
COMMENT ON COLUMN products.retail_price IS 'Retail price for regular customers';

-- Update existing products to set retail_price = price and wholesale_price = cost_price
UPDATE products 
SET retail_price = price,
    wholesale_price = cost_price
WHERE retail_price IS NULL OR wholesale_price IS NULL;

-- Add wholesale pricing fields to product_variants table
ALTER TABLE product_variants
ADD COLUMN wholesale_price DECIMAL(15,2) DEFAULT NULL,
ADD COLUMN retail_price DECIMAL(15,2) DEFAULT NULL;

-- Add comments for documentation
COMMENT ON COLUMN product_variants.wholesale_price IS 'Wholesale price for reseller customers';
COMMENT ON COLUMN product_variants.retail_price IS 'Retail price for regular customers';

-- Update existing product_variants to set retail_price = sale_price
UPDATE product_variants 
SET retail_price = sale_price
WHERE retail_price IS NULL;

-- Create indexes for better performance on pricing queries
CREATE INDEX idx_products_wholesale_price ON products(wholesale_price) WHERE wholesale_price IS NOT NULL;
CREATE INDEX idx_products_retail_price ON products(retail_price) WHERE retail_price IS NOT NULL;
CREATE INDEX idx_product_variants_wholesale_price ON product_variants(wholesale_price) WHERE wholesale_price IS NOT NULL;
CREATE INDEX idx_product_variants_retail_price ON product_variants(retail_price) WHERE retail_price IS NOT NULL;

