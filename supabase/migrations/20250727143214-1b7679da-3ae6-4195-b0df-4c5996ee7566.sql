-- Update the Santalama Limited tenant to include a subdomain
UPDATE tenants 
SET subdomain = 'santalama'
WHERE contact_email = 'santalamaltd@gmail.com' AND subdomain IS NULL;