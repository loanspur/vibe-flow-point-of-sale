-- Update billing plans with realistic KES pricing for Kenyan market

-- Update Starter Plan (was $29, now ~KSh 4,500)
UPDATE billing_plans 
SET 
  price = 4500,
  original_price = 5500,
  pricing = jsonb_build_object(
    'monthly', 4500,
    'quarterly', 12150,  -- 10% discount
    'biannually', 22950, -- 15% discount
    'annually', 43200    -- 20% discount
  )
WHERE name = 'Starter';

-- Update Professional Plan (was $79, now ~KSh 12,000)
UPDATE billing_plans 
SET 
  price = 12000,
  original_price = 15000,
  pricing = jsonb_build_object(
    'monthly', 12000,
    'quarterly', 32400,  -- 10% discount
    'biannually', 61200, -- 15% discount
    'annually', 115200   -- 20% discount
  )
WHERE name = 'Professional';

-- Update Enterprise Plan (was $199, now ~KSh 28,000)
UPDATE billing_plans 
SET 
  price = 28000,
  original_price = 35000,
  pricing = jsonb_build_object(
    'monthly', 28000,
    'quarterly', 75600,  -- 10% discount
    'biannually', 142800, -- 15% discount
    'annually', 268800   -- 20% discount
  )
WHERE name = 'Enterprise';