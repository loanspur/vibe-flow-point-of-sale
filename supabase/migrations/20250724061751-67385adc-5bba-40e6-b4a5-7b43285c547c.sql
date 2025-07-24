-- Create trigger to automatically setup tenant accounts after tenant creation
CREATE OR REPLACE FUNCTION auto_setup_tenant_accounts()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Set up default accounts for this tenant if they don't exist
  PERFORM setup_default_accounts(NEW.id);
  RETURN NEW;
END;
$$;

-- Create trigger on tenants table
DROP TRIGGER IF EXISTS trigger_setup_tenant_accounts ON tenants;
CREATE TRIGGER trigger_setup_tenant_accounts
  AFTER INSERT ON tenants
  FOR EACH ROW
  EXECUTE FUNCTION auto_setup_tenant_accounts();