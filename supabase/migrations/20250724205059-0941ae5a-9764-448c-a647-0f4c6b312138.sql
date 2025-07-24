-- Test payment verification manually
UPDATE payment_history 
SET 
  payment_status = 'completed',
  paid_at = now(),
  updated_at = now()
WHERE payment_reference = 'sub_11111111-1111-1111-1111-111111111111_1753389130340';