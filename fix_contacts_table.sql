-- Fix contacts table to support all contact types and missing columns
-- Run this in your Supabase SQL editor

-- 1. First, update the type constraint to allow all contact types
ALTER TABLE contacts 
DROP CONSTRAINT IF EXISTS contacts_type_check;

ALTER TABLE contacts 
ADD CONSTRAINT contacts_type_check 
CHECK (type IN ('customer', 'supplier', 'vendor', 'agent', 'shipping_agent', 'sales_rep', 'partner'));

-- 2. Add missing columns that the form expects
ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS shipping_address TEXT,
ADD COLUMN IF NOT EXISTS is_commission_agent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_reseller BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS credit_limit DECIMAL(15,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS current_credit_balance DECIMAL(15,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS shipping_fee DECIMAL(15,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS shipping_zones TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS shipping_documents JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- 3. Add comments for documentation
COMMENT ON COLUMN contacts.shipping_address IS 'Shipping address for the contact';
COMMENT ON COLUMN contacts.is_commission_agent IS 'Whether this contact is a commission agent';
COMMENT ON COLUMN contacts.is_reseller IS 'Whether this contact is a reseller (gets wholesale pricing)';
COMMENT ON COLUMN contacts.credit_limit IS 'Credit limit for this customer';
COMMENT ON COLUMN contacts.current_credit_balance IS 'Current credit balance for this customer';
COMMENT ON COLUMN contacts.shipping_fee IS 'Default shipping fee for shipping agents';
COMMENT ON COLUMN contacts.shipping_zones IS 'Array of shipping zones this agent serves';
COMMENT ON COLUMN contacts.shipping_documents IS 'JSON object containing shipping agent documents';
COMMENT ON COLUMN contacts.user_id IS 'Linked user account ID';

-- 4. Set default values for existing records
UPDATE contacts 
SET shipping_address = address,
    is_commission_agent = false,
    is_reseller = false,
    credit_limit = 0.00,
    current_credit_balance = 0.00,
    shipping_fee = 0.00,
    shipping_zones = '{}',
    shipping_documents = '{}'
WHERE shipping_address IS NULL 
   OR is_commission_agent IS NULL 
   OR is_reseller IS NULL 
   OR credit_limit IS NULL 
   OR current_credit_balance IS NULL 
   OR shipping_fee IS NULL 
   OR shipping_zones IS NULL 
   OR shipping_documents IS NULL;

-- 5. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_contacts_type ON contacts(type);
CREATE INDEX IF NOT EXISTS idx_contacts_is_reseller ON contacts(is_reseller);
CREATE INDEX IF NOT EXISTS idx_contacts_credit_limit ON contacts(credit_limit);
CREATE INDEX IF NOT EXISTS idx_contacts_shipping_fee ON contacts(shipping_fee);

-- 6. Update RLS policies if needed
-- (The existing policies should work fine with the new columns)

-- 7. Verify the changes
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'contacts' 
ORDER BY ordinal_position;
