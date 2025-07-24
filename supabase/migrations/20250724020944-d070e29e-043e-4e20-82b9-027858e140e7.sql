-- Create billing plans table
CREATE TABLE public.billing_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  original_price NUMERIC,
  period TEXT NOT NULL DEFAULT 'month',
  description TEXT,
  badge TEXT,
  badge_color TEXT DEFAULT 'bg-blue-100 text-blue-800',
  popularity INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  customers INTEGER DEFAULT 0,
  mrr NUMERIC DEFAULT 0,
  arpu NUMERIC DEFAULT 0,
  churn_rate NUMERIC DEFAULT 0,
  conversion_rate NUMERIC DEFAULT 0,
  trial_conversion INTEGER DEFAULT 0,
  features JSONB DEFAULT '[]'::jsonb,
  pricing JSONB DEFAULT '{}'::jsonb,
  discounts JSONB DEFAULT '[]'::jsonb,
  add_ons JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  tenant_id UUID
);

-- Enable Row Level Security
ALTER TABLE public.billing_plans ENABLE ROW LEVEL SECURITY;

-- Create policies for superadmin access
CREATE POLICY "Superadmins can manage all billing plans" 
ON public.billing_plans 
FOR ALL 
USING (get_current_user_role() = 'superadmin'::user_role);

-- Create indexes
CREATE INDEX idx_billing_plans_status ON public.billing_plans(status);
CREATE INDEX idx_billing_plans_active ON public.billing_plans(is_active);
CREATE INDEX idx_billing_plans_order ON public.billing_plans(display_order);

-- Create trigger for updated_at
CREATE TRIGGER update_billing_plans_updated_at
  BEFORE UPDATE ON public.billing_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default billing plans
INSERT INTO public.billing_plans (
  name, price, original_price, description, badge, badge_color, popularity, status,
  customers, mrr, arpu, churn_rate, conversion_rate, trial_conversion,
  features, pricing, discounts, add_ons, display_order
) VALUES 
(
  'Starter', 29, 39, 'Perfect for small businesses just getting started', 'Popular', 'bg-blue-100 text-blue-800', 85, 'active',
  420, 12180, 29, 2.3, 18.5, 72,
  '[
    {"name": "1 Location", "included": true, "limit": "1"},
    {"name": "Up to 3 Staff Users", "included": true, "limit": "3"},
    {"name": "Basic Inventory Management", "included": true},
    {"name": "Standard Reports", "included": true},
    {"name": "Email Support", "included": true},
    {"name": "Mobile App Access", "included": true},
    {"name": "API Access", "included": false},
    {"name": "Custom Integrations", "included": false}
  ]'::jsonb,
  '{
    "monthly": 29,
    "quarterly": 87,
    "annually": 290,
    "biannually": 174
  }'::jsonb,
  '[
    {"type": "annual", "percentage": 17, "description": "Save 17% with annual billing"},
    {"type": "student", "percentage": 20, "description": "Student discount"}
  ]'::jsonb,
  '[
    {"name": "Extra User Seats", "price": 5, "unit": "per user/month"},
    {"name": "Additional Storage", "price": 10, "unit": "per 10GB/month"}
  ]'::jsonb,
  1
),
(
  'Professional', 79, 99, 'Ideal for growing businesses with multiple needs', 'Most Popular', 'bg-green-100 text-green-800', 95, 'active',
  580, 45820, 79, 1.8, 24.7, 84,
  '[
    {"name": "Up to 5 Locations", "included": true, "limit": "5"},
    {"name": "Unlimited Staff Users", "included": true},
    {"name": "Advanced Inventory & Analytics", "included": true},
    {"name": "Custom Reports & Dashboards", "included": true},
    {"name": "Priority Support", "included": true},
    {"name": "API Access", "included": true},
    {"name": "Customer Loyalty Programs", "included": true},
    {"name": "Multi-tenant Management", "included": true},
    {"name": "Custom Integrations", "included": false},
    {"name": "White-label Solutions", "included": false}
  ]'::jsonb,
  '{
    "monthly": 79,
    "quarterly": 237,
    "annually": 790,
    "biannually": 474
  }'::jsonb,
  '[
    {"type": "annual", "percentage": 17, "description": "Save 17% with annual billing"},
    {"type": "enterprise", "percentage": 15, "description": "Volume discount for 10+ seats"}
  ]'::jsonb,
  '[
    {"name": "Extra Locations", "price": 15, "unit": "per location/month"},
    {"name": "Advanced Analytics", "price": 25, "unit": "per month"},
    {"name": "Custom Integrations", "price": 100, "unit": "per integration"}
  ]'::jsonb,
  2
),
(
  'Enterprise', 199, 249, 'For large businesses requiring advanced features', 'Enterprise', 'bg-purple-100 text-purple-800', 78, 'active',
  247, 49153, 199, 1.2, 31.2, 91,
  '[
    {"name": "Unlimited Locations", "included": true},
    {"name": "Unlimited Staff Users", "included": true},
    {"name": "White-label Solutions", "included": true},
    {"name": "Custom Integrations", "included": true},
    {"name": "24/7 Phone Support", "included": true},
    {"name": "Dedicated Account Manager", "included": true},
    {"name": "Advanced Security Features", "included": true},
    {"name": "Custom Training", "included": true},
    {"name": "SLA Guarantee", "included": true},
    {"name": "Priority Feature Requests", "included": true}
  ]'::jsonb,
  '{
    "monthly": 199,
    "quarterly": 597,
    "annually": 1990,
    "biannually": 1194
  }'::jsonb,
  '[
    {"type": "annual", "percentage": 17, "description": "Save 17% with annual billing"},
    {"type": "custom", "percentage": 25, "description": "Custom enterprise pricing"}
  ]'::jsonb,
  '[
    {"name": "Custom Development", "price": 500, "unit": "per hour"},
    {"name": "Dedicated Support", "price": 1000, "unit": "per month"},
    {"name": "Training Sessions", "price": 200, "unit": "per session"}
  ]'::jsonb,
  3
);