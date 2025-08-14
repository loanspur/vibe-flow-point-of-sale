-- Ensure product_units table has proper constraints for unique abbreviations
ALTER TABLE product_units ADD CONSTRAINT unique_tenant_abbreviation UNIQUE (tenant_id, abbreviation);

-- Add missing columns to product_units if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'product_units' AND column_name = 'is_base_unit') THEN
        ALTER TABLE product_units ADD COLUMN is_base_unit BOOLEAN DEFAULT true;
    END IF;
END $$;