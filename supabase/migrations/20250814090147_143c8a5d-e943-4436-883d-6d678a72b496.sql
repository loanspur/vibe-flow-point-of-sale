-- First, remove duplicate units keeping the latest one
DELETE FROM product_units 
WHERE id NOT IN (
    SELECT DISTINCT ON (tenant_id, abbreviation) id
    FROM product_units
    ORDER BY tenant_id, abbreviation, created_at DESC
);

-- Now add the unique constraint
ALTER TABLE product_units ADD CONSTRAINT unique_tenant_abbreviation UNIQUE (tenant_id, abbreviation);