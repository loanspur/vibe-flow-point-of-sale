-- Fix missing columns in contacts table
-- Run this in your Supabase SQL editor

-- Add contact_type column to contacts table
ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS contact_type TEXT DEFAULT 'customer' 
CHECK (contact_type IN ('customer', 'supplier', 'vendor', 'agent', 'shipping_agent', 'sales_rep', 'partner'));

-- Add shipping-related columns to contacts table
ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS shipping_fee DECIMAL(15,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS shipping_zones TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS shipping_documents JSONB DEFAULT '[]';

-- Add comments for documentation
COMMENT ON COLUMN contacts.contact_type IS 'Type of contact: customer, supplier, vendor, agent, shipping_agent, sales_rep, partner';
COMMENT ON COLUMN contacts.shipping_fee IS 'Default shipping fee for this shipping agent';
COMMENT ON COLUMN contacts.shipping_zones IS 'Array of shipping zones this agent serves';
COMMENT ON COLUMN contacts.shipping_documents IS 'JSON array of shipping documents and certificates';

-- Update existing contacts to have default contact_type
UPDATE contacts
SET contact_type = 'customer'
WHERE contact_type IS NULL;

-- Set default values for shipping columns
UPDATE contacts
SET shipping_fee = 0.00,
    shipping_zones = '{}',
    shipping_documents = '[]'
WHERE shipping_fee IS NULL OR shipping_zones IS NULL OR shipping_documents IS NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_contacts_contact_type ON contacts(contact_type);
CREATE INDEX IF NOT EXISTS idx_contacts_shipping_agent ON contacts(contact_type) WHERE contact_type = 'shipping_agent';
CREATE INDEX IF NOT EXISTS idx_contacts_shipping_fee ON contacts(shipping_fee) WHERE shipping_fee > 0;
