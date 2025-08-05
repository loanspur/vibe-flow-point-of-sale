-- Fix Walela Wines & Spirits status - should be 'trial' since subscription is 'pending'
UPDATE tenants 
SET 
  status = 'trial',
  updated_at = now()
WHERE id = '24cf2d8c-7a7d-4d23-9999-de65800620ff' -- Walela Wines & Spirits
AND status != 'trial';