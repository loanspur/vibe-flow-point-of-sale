-- Allow public access to read active/trial tenants for domain resolution
CREATE POLICY IF NOT EXISTS "Allow public access to active tenants for domain resolution"
ON public.tenants
FOR SELECT
TO public
USING (status IN ('active', 'trial'));