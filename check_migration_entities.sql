-- Check required entities for migration system
-- This script verifies that the entities referenced in the migration exist

-- Check if required categories exist
SELECT 
  'Required categories for migration:' as info,
  name,
  id,
  tenant_id,
  is_active
FROM product_categories 
WHERE name IN ('Electronics', 'Clothing')
AND is_active = true
ORDER BY name;

-- Check if required units exist
SELECT 
  'Required units for migration:' as info,
  name,
  id,
  tenant_id,
  is_active
FROM product_units 
WHERE name IN ('Pieces', 'Units')
AND is_active = true
ORDER BY name;

-- Check if required locations exist
SELECT 
  'Required locations for migration:' as info,
  name,
  id,
  tenant_id,
  is_active
FROM store_locations 
WHERE name IN ('Main Store', 'Warehouse')
AND is_active = true
ORDER BY name;

-- Check if required accounts exist (for revenue mapping)
SELECT 
  'Required accounts for migration:' as info,
  name,
  id,
  tenant_id,
  is_active,
  code
FROM accounts 
WHERE (name ILIKE '%inventory%' OR name ILIKE '%stock%' OR code IN ('1200', '1020'))
AND is_active = true
ORDER BY name;

-- Create missing entities if they don't exist
DO $$
DECLARE
  tenant_id UUID;
BEGIN
  -- Get the first tenant ID for testing
  SELECT id INTO tenant_id FROM tenants LIMIT 1;
  
  IF tenant_id IS NULL THEN
    RAISE NOTICE 'No tenants found in the system';
    RETURN;
  END IF;
  
  RAISE NOTICE 'Using tenant ID: % for entity creation', tenant_id;
  
  -- Create Electronics category if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM product_categories WHERE name = 'Electronics' AND tenant_id = tenant_id) THEN
    INSERT INTO product_categories (tenant_id, name, description, is_active) 
    VALUES (tenant_id, 'Electronics', 'Electronic devices and accessories', true);
    RAISE NOTICE 'Created Electronics category';
  ELSE
    RAISE NOTICE 'Electronics category already exists';
  END IF;
  
  -- Create Clothing category if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM product_categories WHERE name = 'Clothing' AND tenant_id = tenant_id) THEN
    INSERT INTO product_categories (tenant_id, name, description, is_active) 
    VALUES (tenant_id, 'Clothing', 'Apparel and fashion items', true);
    RAISE NOTICE 'Created Clothing category';
  ELSE
    RAISE NOTICE 'Clothing category already exists';
  END IF;
  
  -- Create Pieces unit if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM product_units WHERE name = 'Pieces' AND tenant_id = tenant_id) THEN
    INSERT INTO product_units (tenant_id, name, description, is_active) 
    VALUES (tenant_id, 'Pieces', 'Individual pieces', true);
    RAISE NOTICE 'Created Pieces unit';
  ELSE
    RAISE NOTICE 'Pieces unit already exists';
  END IF;
  
  -- Create Units unit if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM product_units WHERE name = 'Units' AND tenant_id = tenant_id) THEN
    INSERT INTO product_units (tenant_id, name, description, is_active) 
    VALUES (tenant_id, 'Units', 'Generic units', true);
    RAISE NOTICE 'Created Units unit';
  ELSE
    RAISE NOTICE 'Units unit already exists';
  END IF;
  
  -- Create Main Store location if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM store_locations WHERE name = 'Main Store' AND tenant_id = tenant_id) THEN
    INSERT INTO store_locations (tenant_id, name, address, is_active) 
    VALUES (tenant_id, 'Main Store', 'Main store location', true);
    RAISE NOTICE 'Created Main Store location';
  ELSE
    RAISE NOTICE 'Main Store location already exists';
  END IF;
  
  -- Create Warehouse location if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM store_locations WHERE name = 'Warehouse' AND tenant_id = tenant_id) THEN
    INSERT INTO store_locations (tenant_id, name, address, is_active) 
    VALUES (tenant_id, 'Warehouse', 'Warehouse location', true);
    RAISE NOTICE 'Created Warehouse location';
  ELSE
    RAISE NOTICE 'Warehouse location already exists';
  END IF;
  
  -- Create Inventory account if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM accounts WHERE name ILIKE '%inventory%' AND tenant_id = tenant_id) THEN
    INSERT INTO accounts (tenant_id, name, code, account_type_id, is_active) 
    VALUES (
      tenant_id, 
      'Inventory', 
      '1200',
      (SELECT id FROM account_types WHERE name = 'Current Assets' LIMIT 1),
      true
    );
    RAISE NOTICE 'Created Inventory account';
  ELSE
    RAISE NOTICE 'Inventory account already exists';
  END IF;
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error creating entities: %', SQLERRM;
END $$;

-- Verify entities after creation
SELECT 
  'Final entity check:' as info,
  'Categories:' as entity_type,
  COUNT(*) as count
FROM product_categories 
WHERE name IN ('Electronics', 'Clothing')
AND is_active = true

UNION ALL

SELECT 
  'Final entity check:' as info,
  'Units:' as entity_type,
  COUNT(*) as count
FROM product_units 
WHERE name IN ('Pieces', 'Units')
AND is_active = true

UNION ALL

SELECT 
  'Final entity check:' as info,
  'Locations:' as entity_type,
  COUNT(*) as count
FROM store_locations 
WHERE name IN ('Main Store', 'Warehouse')
AND is_active = true

UNION ALL

SELECT 
  'Final entity check:' as info,
  'Accounts:' as entity_type,
  COUNT(*) as count
FROM accounts 
WHERE name ILIKE '%inventory%'
AND is_active = true;

SELECT 'Entity check and creation completed!' as status;
