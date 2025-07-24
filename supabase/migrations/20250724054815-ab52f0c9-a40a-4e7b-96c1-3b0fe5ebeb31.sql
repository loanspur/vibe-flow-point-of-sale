-- Allow public access to view billing plans for signup/pricing pages
CREATE POLICY "Public can view active billing plans" ON public.billing_plans
FOR SELECT
USING (is_active = true);