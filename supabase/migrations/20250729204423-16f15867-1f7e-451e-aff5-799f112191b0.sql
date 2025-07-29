-- Update SSL status for all vibenet.shop subdomains to reflect wildcard SSL
UPDATE public.tenant_domains 
SET 
  ssl_status = 'issued',
  ssl_issued_at = NOW(),
  ssl_expires_at = NOW() + INTERVAL '90 days'
WHERE domain_type = 'subdomain' 
  AND domain_name LIKE '%.vibenet.shop' 
  AND ssl_status != 'issued';