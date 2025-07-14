-- Create accounting related tables for comprehensive reporting

-- Create account types table
CREATE TABLE public.account_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('assets', 'liabilities', 'equity', 'income', 'expenses')),
  parent_id UUID REFERENCES public.account_types(id),
  tenant_id UUID NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create accounts table
CREATE TABLE public.accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  account_type_id UUID NOT NULL REFERENCES public.account_types(id),
  tenant_id UUID NOT NULL,
  balance NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(code, tenant_id)
);

-- Create transactions table for double-entry bookkeeping
CREATE TABLE public.accounting_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_number TEXT NOT NULL,
  description TEXT NOT NULL,
  reference_type TEXT, -- 'sale', 'purchase', 'payment', 'adjustment', etc.
  reference_id UUID, -- ID of the related record
  tenant_id UUID NOT NULL,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  is_posted BOOLEAN DEFAULT false,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(transaction_number, tenant_id)
);

-- Create transaction entries for double-entry system
CREATE TABLE public.accounting_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES public.accounting_transactions(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.accounts(id),
  debit_amount NUMERIC DEFAULT 0,
  credit_amount NUMERIC DEFAULT 0,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create financial periods table
CREATE TABLE public.financial_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_closed BOOLEAN DEFAULT false,
  fiscal_year INTEGER NOT NULL,
  period_type TEXT NOT NULL CHECK (period_type IN ('monthly', 'quarterly', 'annual')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, start_date, end_date)
);

-- Create commission tracking table (enhanced from existing commission_agents)
CREATE TABLE public.commission_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commission_agent_id UUID NOT NULL REFERENCES public.commission_agents(id),
  sale_id UUID REFERENCES public.sales(id),
  tenant_id UUID NOT NULL,
  base_amount NUMERIC NOT NULL,
  commission_rate NUMERIC NOT NULL,
  commission_amount NUMERIC NOT NULL,
  commission_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
  payment_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX idx_accounts_tenant_id ON public.accounts(tenant_id);
CREATE INDEX idx_accounts_type_id ON public.accounts(account_type_id);
CREATE INDEX idx_accounting_transactions_tenant_id ON public.accounting_transactions(tenant_id);
CREATE INDEX idx_accounting_transactions_date ON public.accounting_transactions(transaction_date);
CREATE INDEX idx_accounting_transactions_reference ON public.accounting_transactions(reference_type, reference_id);
CREATE INDEX idx_accounting_entries_transaction_id ON public.accounting_entries(transaction_id);
CREATE INDEX idx_accounting_entries_account_id ON public.accounting_entries(account_id);
CREATE INDEX idx_commission_transactions_agent_id ON public.commission_transactions(commission_agent_id);
CREATE INDEX idx_commission_transactions_tenant_id ON public.commission_transactions(tenant_id);
CREATE INDEX idx_commission_transactions_date ON public.commission_transactions(commission_date);

-- Enable RLS on all tables
ALTER TABLE public.account_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_transactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Account Types
CREATE POLICY "Tenant managers can manage account types" ON public.account_types
  FOR ALL USING (tenant_id = get_user_tenant_id() AND get_current_user_role() = ANY(ARRAY['superadmin'::user_role, 'admin'::user_role, 'manager'::user_role]));

CREATE POLICY "Tenant users can view account types" ON public.account_types
  FOR SELECT USING (tenant_id = get_user_tenant_id());

-- Accounts
CREATE POLICY "Tenant managers can manage accounts" ON public.accounts
  FOR ALL USING (tenant_id = get_user_tenant_id() AND get_current_user_role() = ANY(ARRAY['superadmin'::user_role, 'admin'::user_role, 'manager'::user_role]));

CREATE POLICY "Tenant users can view accounts" ON public.accounts
  FOR SELECT USING (tenant_id = get_user_tenant_id());

-- Accounting Transactions
CREATE POLICY "Tenant staff can manage accounting transactions" ON public.accounting_transactions
  FOR ALL USING (tenant_id = get_user_tenant_id() AND get_current_user_role() = ANY(ARRAY['superadmin'::user_role, 'admin'::user_role, 'manager'::user_role, 'cashier'::user_role]));

CREATE POLICY "Tenant users can view accounting transactions" ON public.accounting_transactions
  FOR SELECT USING (tenant_id = get_user_tenant_id());

-- Accounting Entries
CREATE POLICY "Tenant staff can manage accounting entries" ON public.accounting_entries
  FOR ALL USING (transaction_id IN (SELECT id FROM public.accounting_transactions WHERE tenant_id = get_user_tenant_id()) AND get_current_user_role() = ANY(ARRAY['superadmin'::user_role, 'admin'::user_role, 'manager'::user_role, 'cashier'::user_role]));

CREATE POLICY "Tenant users can view accounting entries" ON public.accounting_entries
  FOR SELECT USING (transaction_id IN (SELECT id FROM public.accounting_transactions WHERE tenant_id = get_user_tenant_id()));

-- Financial Periods
CREATE POLICY "Tenant managers can manage financial periods" ON public.financial_periods
  FOR ALL USING (tenant_id = get_user_tenant_id() AND get_current_user_role() = ANY(ARRAY['superadmin'::user_role, 'admin'::user_role, 'manager'::user_role]));

CREATE POLICY "Tenant users can view financial periods" ON public.financial_periods
  FOR SELECT USING (tenant_id = get_user_tenant_id());

-- Commission Transactions
CREATE POLICY "Tenant staff can manage commission transactions" ON public.commission_transactions
  FOR ALL USING (tenant_id = get_user_tenant_id() AND get_current_user_role() = ANY(ARRAY['superadmin'::user_role, 'admin'::user_role, 'manager'::user_role, 'cashier'::user_role]));

CREATE POLICY "Tenant users can view commission transactions" ON public.commission_transactions
  FOR SELECT USING (tenant_id = get_user_tenant_id());

-- Create triggers for updated_at
CREATE TRIGGER update_account_types_updated_at
  BEFORE UPDATE ON public.account_types
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_accounts_updated_at
  BEFORE UPDATE ON public.accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_accounting_transactions_updated_at
  BEFORE UPDATE ON public.accounting_transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_financial_periods_updated_at
  BEFORE UPDATE ON public.financial_periods
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_commission_transactions_updated_at
  BEFORE UPDATE ON public.commission_transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to get account balance
CREATE OR REPLACE FUNCTION public.get_account_balance(account_id_param UUID, as_of_date DATE DEFAULT CURRENT_DATE)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
DECLARE
  balance_result NUMERIC DEFAULT 0;
BEGIN
  SELECT 
    COALESCE(SUM(debit_amount), 0) - COALESCE(SUM(credit_amount), 0)
  INTO balance_result
  FROM public.accounting_entries ae
  JOIN public.accounting_transactions at ON ae.transaction_id = at.id
  WHERE ae.account_id = account_id_param
    AND at.transaction_date <= as_of_date
    AND at.is_posted = true;
    
  RETURN COALESCE(balance_result, 0);
END;
$$;

-- Create function to calculate profit/loss
CREATE OR REPLACE FUNCTION public.calculate_profit_loss(
  tenant_id_param UUID,
  start_date_param DATE,
  end_date_param DATE
)
RETURNS TABLE (
  income NUMERIC,
  expenses NUMERIC,
  profit_loss NUMERIC
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
DECLARE
  total_income NUMERIC DEFAULT 0;
  total_expenses NUMERIC DEFAULT 0;
BEGIN
  -- Calculate total income
  SELECT COALESCE(SUM(ae.credit_amount - ae.debit_amount), 0)
  INTO total_income
  FROM public.accounting_entries ae
  JOIN public.accounting_transactions at ON ae.transaction_id = at.id
  JOIN public.accounts a ON ae.account_id = a.id
  JOIN public.account_types act ON a.account_type_id = act.id
  WHERE at.tenant_id = tenant_id_param
    AND at.transaction_date BETWEEN start_date_param AND end_date_param
    AND at.is_posted = true
    AND act.category = 'income';

  -- Calculate total expenses
  SELECT COALESCE(SUM(ae.debit_amount - ae.credit_amount), 0)
  INTO total_expenses
  FROM public.accounting_entries ae
  JOIN public.accounting_transactions at ON ae.transaction_id = at.id
  JOIN public.accounts a ON ae.account_id = a.id
  JOIN public.account_types act ON a.account_type_id = act.id
  WHERE at.tenant_id = tenant_id_param
    AND at.transaction_date BETWEEN start_date_param AND end_date_param
    AND at.is_posted = true
    AND act.category = 'expenses';

  RETURN QUERY SELECT total_income, total_expenses, (total_income - total_expenses);
END;
$$;