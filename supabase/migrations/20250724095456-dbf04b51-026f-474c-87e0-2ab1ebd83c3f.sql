-- Enable real-time updates for business_settings table
ALTER TABLE public.business_settings REPLICA IDENTITY FULL;

-- Add the table to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.business_settings;