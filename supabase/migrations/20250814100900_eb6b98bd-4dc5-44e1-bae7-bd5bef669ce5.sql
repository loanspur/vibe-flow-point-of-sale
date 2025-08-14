-- First, let's add the missing unit_id column to purchase_items table
ALTER TABLE purchase_items 
ADD COLUMN IF NOT EXISTS unit_id uuid REFERENCES product_units(id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_purchase_items_unit_id ON purchase_items(unit_id);

-- Update existing purchase_items to have unit_id based on their products
UPDATE purchase_items 
SET unit_id = (
  SELECT products.unit_id 
  FROM products 
  WHERE products.id = purchase_items.product_id
)
WHERE unit_id IS NULL;