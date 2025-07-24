-- Fix RLS policies to allow system operations for payment verification

-- Drop existing restrictive policies for tenant_subscription_details
DROP POLICY IF EXISTS "Tenant admins can update subscription details" ON public.tenant_subscription_details;
DROP POLICY IF EXISTS "Tenant admins can view subscription details" ON public.tenant_subscription_details;

-- Create new policies that allow system operations
CREATE POLICY "System can manage subscription details"
ON public.tenant_subscription_details
FOR ALL
USING (true);

CREATE POLICY "Tenant admins can view subscription details"
ON public.tenant_subscription_details
FOR SELECT
USING ((tenant_id = get_user_tenant_id()) AND is_tenant_admin());

CREATE POLICY "Tenant admins can update subscription details"
ON public.tenant_subscription_details
FOR UPDATE
USING ((tenant_id = get_user_tenant_id()) AND is_tenant_admin());

-- Ensure billing_plans allows system updates for statistics
CREATE POLICY "System can update billing plan statistics"
ON public.billing_plans
FOR UPDATE
USING (true);