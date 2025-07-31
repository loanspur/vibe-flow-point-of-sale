-- Update billing plans to use USD pricing
-- Convert existing KES prices to USD (approximate rate: 1 USD = 130 KES)

UPDATE billing_plans 
SET 
  currency = 'USD',
  price = CASE 
    WHEN price = 1999 THEN 15  -- Starter plan: ~$15/month
    WHEN price = 4999 THEN 39  -- Professional plan: ~$39/month  
    WHEN price = 8999 THEN 69  -- Enterprise plan: ~$69/month
    ELSE ROUND(price / 130.0)
  END,
  original_price = CASE
    WHEN original_price = 5500 THEN 42   -- Starter original
    WHEN original_price = 15000 THEN 115 -- Professional original
    WHEN original_price = 35000 THEN 269 -- Enterprise original
    ELSE ROUND(original_price / 130.0)
  END,
  pricing = jsonb_build_object(
    'monthly', CASE 
      WHEN price = 1999 THEN 15
      WHEN price = 4999 THEN 39
      WHEN price = 8999 THEN 69
      ELSE ROUND(price / 130.0)
    END,
    'annually', CASE 
      WHEN price = 1999 THEN 150  -- 15 * 10 months (2 month discount)
      WHEN price = 4999 THEN 390  -- 39 * 10 months
      WHEN price = 8999 THEN 690  -- 69 * 10 months
      ELSE ROUND((price / 130.0) * 10)
    END,
    'quarterly', CASE 
      WHEN price = 1999 THEN 42   -- 15 * 2.8 months
      WHEN price = 4999 THEN 109  -- 39 * 2.8 months
      WHEN price = 8999 THEN 193  -- 69 * 2.8 months
      ELSE ROUND((price / 130.0) * 2.8)
    END,
    'biannually', CASE 
      WHEN price = 1999 THEN 84   -- 15 * 5.6 months
      WHEN price = 4999 THEN 218  -- 39 * 5.6 months
      WHEN price = 8999 THEN 386  -- 69 * 5.6 months
      ELSE ROUND((price / 130.0) * 5.6)
    END
  ),
  updated_at = now()
WHERE currency = 'KES';