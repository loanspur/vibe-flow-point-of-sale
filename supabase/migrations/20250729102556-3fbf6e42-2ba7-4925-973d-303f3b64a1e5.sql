-- Create default payment methods for the current active tenant if they don't exist
INSERT INTO public.payment_methods (tenant_id, name, type, is_active, requires_reference, display_order)
SELECT 
  '6742eb8a-434e-4c14-a91c-6d55adeb5750'::uuid as tenant_id,
  name,
  type,
  is_active,
  requires_reference,
  display_order
FROM (VALUES 
  ('Cash', 'cash', true, false, 1),
  ('Credit/Debit Card', 'card', true, true, 2),
  ('Digital Wallet', 'digital', true, true, 3),
  ('Bank Transfer', 'bank_transfer', true, true, 4),
  ('Credit Sale', 'credit', true, true, 5)
) AS default_methods(name, type, is_active, requires_reference, display_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.payment_methods 
  WHERE tenant_id = '6742eb8a-434e-4c14-a91c-6d55adeb5750' 
  AND type = default_methods.type
);