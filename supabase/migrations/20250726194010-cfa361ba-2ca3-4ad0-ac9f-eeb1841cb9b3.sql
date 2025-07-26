-- Clean up verification tables since email verification is disabled
DROP TABLE IF EXISTS public.pending_email_verifications CASCADE;