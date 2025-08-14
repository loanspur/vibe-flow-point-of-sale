-- Add unit_id column to sale_items table
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS unit_id UUID REFERENCES product_units(id);

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_sale_items_unit_id ON sale_items(unit_id);