-- Add reseller status and credit limit fields to contacts table
ALTER TABLE contacts 
ADD COLUMN is_reseller BOOLEAN DEFAULT FALSE,
ADD COLUMN credit_limit DECIMAL(15,2) DEFAULT 0.00,
ADD COLUMN current_credit_balance DECIMAL(15,2) DEFAULT 0.00;

-- Add comments for documentation
COMMENT ON COLUMN contacts.is_reseller IS 'Indicates if this customer is a reseller eligible for wholesale pricing';
COMMENT ON COLUMN contacts.credit_limit IS 'Maximum credit limit allowed for this customer';
COMMENT ON COLUMN contacts.current_credit_balance IS 'Current outstanding credit balance for this customer';

-- Create index for better performance on reseller queries
CREATE INDEX idx_contacts_is_reseller ON contacts(is_reseller) WHERE is_reseller = TRUE;

-- Update RLS policies to include new fields
DROP POLICY IF EXISTS "Users can view contacts in their tenant" ON contacts;
CREATE POLICY "Users can view contacts in their tenant" ON contacts
    FOR SELECT USING (
        tenant_id IN (
            SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can insert contacts in their tenant" ON contacts;
CREATE POLICY "Users can insert contacts in their tenant" ON contacts
    FOR INSERT WITH CHECK (
        tenant_id IN (
            SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can update contacts in their tenant" ON contacts;
CREATE POLICY "Users can update contacts in their tenant" ON contacts
    FOR UPDATE USING (
        tenant_id IN (
            SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can delete contacts in their tenant" ON contacts;
CREATE POLICY "Users can delete contacts in their tenant" ON contacts
    FOR DELETE USING (
        tenant_id IN (
            SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
        )
    );

