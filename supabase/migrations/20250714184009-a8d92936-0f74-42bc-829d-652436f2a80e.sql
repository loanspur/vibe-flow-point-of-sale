-- Create accounts receivable table
CREATE TABLE public.accounts_receivable (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  customer_id UUID REFERENCES public.customers(id) NOT NULL,
  invoice_number TEXT NOT NULL,
  invoice_date DATE NOT NULL,
  due_date DATE NOT NULL,
  original_amount DECIMAL(10,2) NOT NULL,
  paid_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  outstanding_amount DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'outstanding' CHECK (status IN ('outstanding', 'paid', 'overdue', 'partial')),
  reference_type TEXT DEFAULT 'sale' CHECK (reference_type IN ('sale', 'invoice', 'service')),
  reference_id UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create accounts payable table
CREATE TABLE public.accounts_payable (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  supplier_id UUID REFERENCES public.contacts(id) NOT NULL,
  invoice_number TEXT NOT NULL,
  invoice_date DATE NOT NULL,
  due_date DATE NOT NULL,
  original_amount DECIMAL(10,2) NOT NULL,
  paid_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  outstanding_amount DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'outstanding' CHECK (status IN ('outstanding', 'paid', 'overdue', 'partial')),
  reference_type TEXT DEFAULT 'purchase' CHECK (reference_type IN ('purchase', 'expense', 'service')),
  reference_id UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create AR/AP payment tracking table
CREATE TABLE public.ar_ap_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  payment_type TEXT NOT NULL CHECK (payment_type IN ('receivable', 'payable')),
  reference_id UUID NOT NULL, -- references accounts_receivable.id or accounts_payable.id
  payment_date DATE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_method TEXT NOT NULL,
  reference_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.accounts_receivable ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts_payable ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ar_ap_payments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for accounts_receivable
CREATE POLICY "Tenant users can view their receivables" ON public.accounts_receivable
  FOR SELECT USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Tenant managers can manage receivables" ON public.accounts_receivable
  FOR ALL USING (
    tenant_id = get_user_tenant_id() AND 
    get_current_user_role() = ANY(ARRAY['superadmin'::user_role, 'admin'::user_role, 'manager'::user_role])
  );

-- Create RLS policies for accounts_payable
CREATE POLICY "Tenant users can view their payables" ON public.accounts_payable
  FOR SELECT USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Tenant managers can manage payables" ON public.accounts_payable
  FOR ALL USING (
    tenant_id = get_user_tenant_id() AND 
    get_current_user_role() = ANY(ARRAY['superadmin'::user_role, 'admin'::user_role, 'manager'::user_role])
  );

-- Create RLS policies for ar_ap_payments
CREATE POLICY "Tenant users can view their AR/AP payments" ON public.ar_ap_payments
  FOR SELECT USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Tenant managers can manage AR/AP payments" ON public.ar_ap_payments
  FOR ALL USING (
    tenant_id = get_user_tenant_id() AND 
    get_current_user_role() = ANY(ARRAY['superadmin'::user_role, 'admin'::user_role, 'manager'::user_role])
  );

-- Create indexes for performance
CREATE INDEX idx_accounts_receivable_tenant_id ON public.accounts_receivable(tenant_id);
CREATE INDEX idx_accounts_receivable_customer_id ON public.accounts_receivable(customer_id);
CREATE INDEX idx_accounts_receivable_due_date ON public.accounts_receivable(due_date);
CREATE INDEX idx_accounts_receivable_status ON public.accounts_receivable(status);

CREATE INDEX idx_accounts_payable_tenant_id ON public.accounts_payable(tenant_id);
CREATE INDEX idx_accounts_payable_supplier_id ON public.accounts_payable(supplier_id);
CREATE INDEX idx_accounts_payable_due_date ON public.accounts_payable(due_date);
CREATE INDEX idx_accounts_payable_status ON public.accounts_payable(status);

CREATE INDEX idx_ar_ap_payments_tenant_id ON public.ar_ap_payments(tenant_id);
CREATE INDEX idx_ar_ap_payments_reference_id ON public.ar_ap_payments(reference_id);
CREATE INDEX idx_ar_ap_payments_payment_type ON public.ar_ap_payments(payment_type);

-- Create triggers for updated_at
CREATE TRIGGER update_accounts_receivable_updated_at
  BEFORE UPDATE ON public.accounts_receivable
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_accounts_payable_updated_at
  BEFORE UPDATE ON public.accounts_payable
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ar_ap_payments_updated_at
  BEFORE UPDATE ON public.ar_ap_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to update outstanding amounts when payments are made
CREATE OR REPLACE FUNCTION public.update_ar_ap_outstanding_amount()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Update outstanding amount when payment is added
    IF NEW.payment_type = 'receivable' THEN
      UPDATE public.accounts_receivable 
      SET 
        paid_amount = paid_amount + NEW.amount,
        outstanding_amount = original_amount - (paid_amount + NEW.amount),
        status = CASE 
          WHEN (paid_amount + NEW.amount) >= original_amount THEN 'paid'
          WHEN (paid_amount + NEW.amount) > 0 THEN 'partial'
          ELSE 'outstanding'
        END,
        updated_at = now()
      WHERE id = NEW.reference_id;
    ELSIF NEW.payment_type = 'payable' THEN
      UPDATE public.accounts_payable 
      SET 
        paid_amount = paid_amount + NEW.amount,
        outstanding_amount = original_amount - (paid_amount + NEW.amount),
        status = CASE 
          WHEN (paid_amount + NEW.amount) >= original_amount THEN 'paid'
          WHEN (paid_amount + NEW.amount) > 0 THEN 'partial'
          ELSE 'outstanding'
        END,
        updated_at = now()
      WHERE id = NEW.reference_id;
    END IF;
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for payment updates
CREATE TRIGGER ar_ap_payment_update_trigger
  AFTER INSERT ON public.ar_ap_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_ar_ap_outstanding_amount();

-- Create function to calculate aging analysis
CREATE OR REPLACE FUNCTION public.calculate_aging_analysis(
  tenant_id_param UUID,
  analysis_type TEXT, -- 'receivable' or 'payable'
  as_of_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  current_amount DECIMAL,
  days_30_amount DECIMAL,
  days_60_amount DECIMAL,
  days_90_amount DECIMAL,
  days_over_90_amount DECIMAL,
  total_amount DECIMAL
) AS $$
BEGIN
  IF analysis_type = 'receivable' THEN
    RETURN QUERY
    SELECT 
      COALESCE(SUM(CASE WHEN as_of_date - due_date <= 0 THEN outstanding_amount ELSE 0 END), 0) as current_amount,
      COALESCE(SUM(CASE WHEN as_of_date - due_date BETWEEN 1 AND 30 THEN outstanding_amount ELSE 0 END), 0) as days_30_amount,
      COALESCE(SUM(CASE WHEN as_of_date - due_date BETWEEN 31 AND 60 THEN outstanding_amount ELSE 0 END), 0) as days_60_amount,
      COALESCE(SUM(CASE WHEN as_of_date - due_date BETWEEN 61 AND 90 THEN outstanding_amount ELSE 0 END), 0) as days_90_amount,
      COALESCE(SUM(CASE WHEN as_of_date - due_date > 90 THEN outstanding_amount ELSE 0 END), 0) as days_over_90_amount,
      COALESCE(SUM(outstanding_amount), 0) as total_amount
    FROM public.accounts_receivable
    WHERE tenant_id = tenant_id_param 
      AND status IN ('outstanding', 'partial', 'overdue')
      AND outstanding_amount > 0;
  ELSIF analysis_type = 'payable' THEN
    RETURN QUERY
    SELECT 
      COALESCE(SUM(CASE WHEN as_of_date - due_date <= 0 THEN outstanding_amount ELSE 0 END), 0) as current_amount,
      COALESCE(SUM(CASE WHEN as_of_date - due_date BETWEEN 1 AND 30 THEN outstanding_amount ELSE 0 END), 0) as days_30_amount,
      COALESCE(SUM(CASE WHEN as_of_date - due_date BETWEEN 31 AND 60 THEN outstanding_amount ELSE 0 END), 0) as days_60_amount,
      COALESCE(SUM(CASE WHEN as_of_date - due_date BETWEEN 61 AND 90 THEN outstanding_amount ELSE 0 END), 0) as days_90_amount,
      COALESCE(SUM(CASE WHEN as_of_date - due_date > 90 THEN outstanding_amount ELSE 0 END), 0) as days_over_90_amount,
      COALESCE(SUM(outstanding_amount), 0) as total_amount
    FROM public.accounts_payable
    WHERE tenant_id = tenant_id_param 
      AND status IN ('outstanding', 'partial', 'overdue')
      AND outstanding_amount > 0;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;