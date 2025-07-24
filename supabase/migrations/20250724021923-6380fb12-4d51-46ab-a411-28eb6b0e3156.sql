-- Reset billing plans to realistic starting values
UPDATE public.billing_plans 
SET 
  customers = 0,
  mrr = 0,
  churn_rate = 0,
  conversion_rate = 0,
  trial_conversion = 0
WHERE TRUE;