-- Drop existing restrictive policies first and add public access for domain resolution
DROP POLICY IF EXISTS "Allow public access to active tenants for domain resolution" ON public.tenants;

-- Allow public access to read active/trial tenants for domain resolution
CREATE POLICY "Public can read active tenants for domain resolution"
ON public.tenants
FOR SELECT
TO public
USING (status IN ('active', 'trial'));