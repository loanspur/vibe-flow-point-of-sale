-- Create trigger to automatically set up new tenants with default configurations

-- Create the trigger on tenants table to call handle_new_tenant() function
CREATE TRIGGER handle_new_tenant_trigger
  AFTER INSERT ON public.tenants
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_tenant();