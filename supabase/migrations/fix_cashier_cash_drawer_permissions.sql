-- Fix existing cashier roles to include cash drawer permissions
DO $$
DECLARE
  cashier_role_record RECORD;
  cash_drawer_permission RECORD;
BEGIN
  -- Loop through all cashier roles
  FOR cashier_role_record IN 
    SELECT ur.id 
    FROM user_roles ur 
    WHERE ur.name = 'Cashier' AND ur.is_active = true
  LOOP
    -- Grant cash drawer permissions to existing cashier roles
    FOR cash_drawer_permission IN 
      SELECT sp.id 
      FROM system_permissions sp
      WHERE sp.category = 'pos'
      AND sp.name IN (
        'View Cash Drawers',
        'Open Cash Drawers', 
        'Close Cash Drawers',
        'Manage Cash Transactions'
      )
    LOOP
      INSERT INTO role_permissions (role_id, permission_id, granted)
      VALUES (cashier_role_record.id, cash_drawer_permission.id, true)
      ON CONFLICT (role_id, permission_id) DO UPDATE SET granted = true;
    END LOOP;
  END LOOP;
END $$;
