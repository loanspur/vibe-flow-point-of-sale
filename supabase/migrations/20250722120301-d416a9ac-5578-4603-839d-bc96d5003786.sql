-- Enable realtime for accounting tables
ALTER TABLE public.accounting_transactions REPLICA IDENTITY FULL;
ALTER TABLE public.accounting_entries REPLICA IDENTITY FULL;
ALTER TABLE public.accounts REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.accounting_transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.accounting_entries;
ALTER PUBLICATION supabase_realtime ADD TABLE public.accounts;