-- Update Starter plan to reorder features with product limit in top 4
UPDATE billing_plans 
SET features = '[
  {"name": "1 Location", "included": true, "limit": 1},
  {"name": "Up to 3 Staff Users", "included": true, "limit": 3},
  {"name": "Up to 500 Products", "included": true, "limit": 500},
  {"name": "Basic Inventory Management", "included": true},
  {"name": "Standard Reports", "included": true},
  {"name": "Email Support", "included": true},
  {"name": "Mobile App Access", "included": true},
  {"name": "API Access", "included": false},
  {"name": "Custom Integrations", "included": false},
  {"name": "Stock Management", "included": false}
]'::jsonb
WHERE name = 'Starter' AND is_active = true;

-- Update Professional plan to reorder features with product limit in top 4  
UPDATE billing_plans 
SET features = '[
  {"name": "Up to 5 Locations", "included": true, "limit": 5},
  {"name": "Unlimited Staff Users", "included": true},
  {"name": "Up to 5,000 Products", "included": true, "limit": 5000},
  {"name": "Advanced Inventory & Analytics", "included": true},
  {"name": "Custom Reports & Dashboards", "included": true},
  {"name": "Priority Support", "included": true},
  {"name": "API Access", "included": true},
  {"name": "Customer Loyalty Programs", "included": true},
  {"name": "Multi-tenant Management", "included": true},
  {"name": "Custom Integrations", "included": false},
  {"name": "White-label Solutions", "included": false},
  {"name": "Stock Management", "included": false}
]'::jsonb
WHERE name = 'Professional' AND is_active = true;

-- Update Enterprise plan to reorder features with product limit in top 4
UPDATE billing_plans 
SET features = '[
  {"name": "Unlimited Locations", "included": true},
  {"name": "Unlimited Staff Users", "included": true},
  {"name": "Unlimited Products", "included": true, "limit": "unlimited"},
  {"name": "Stock Management", "included": true},
  {"name": "White-label Solutions", "included": true},
  {"name": "Custom Integrations", "included": true},
  {"name": "24/7 Phone Support", "included": true},
  {"name": "Dedicated Account Manager", "included": true},
  {"name": "Advanced Security Features", "included": true},
  {"name": "Custom Training", "included": true},
  {"name": "SLA Guarantee", "included": true},
  {"name": "Priority Feature Requests", "included": true}
]'::jsonb
WHERE name = 'Enterprise' AND is_active = true;