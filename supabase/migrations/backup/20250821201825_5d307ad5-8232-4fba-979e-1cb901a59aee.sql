-- Add account_id column to payment_methods table for accounting integration
ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES accounts(id);

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_payment_methods_account_id ON payment_methods(account_id);

-- Add comment to explain the purpose
COMMENT ON COLUMN payment_methods.account_id IS 'Links payment method to corresponding asset account in chart of accounts for financial tracking';