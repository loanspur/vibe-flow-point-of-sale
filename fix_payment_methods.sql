-- Fix missing columns in payment_methods table
-- Run this in your Supabase SQL editor

-- Add missing columns to payment_methods table
ALTER TABLE payment_methods
ADD COLUMN IF NOT EXISTS icon TEXT,
ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#000000';

-- Add comments for documentation
COMMENT ON COLUMN payment_methods.icon IS 'Icon emoji or identifier for the payment method';
COMMENT ON COLUMN payment_methods.color IS 'Color code for UI display';

-- Update existing payment methods with default values
UPDATE payment_methods
SET icon = CASE 
    WHEN type = 'cash' THEN '💵'
    WHEN type = 'card' THEN '💳'
    WHEN type = 'mobile_money' THEN '📱'
    WHEN type = 'bank_transfer' THEN '🏦'
    WHEN type = 'credit' THEN '📋'
    ELSE '💰'
  END,
    color = CASE 
    WHEN type = 'cash' THEN '#28a745'
    WHEN type = 'card' THEN '#007bff'
    WHEN type = 'mobile_money' THEN '#ff6b35'
    WHEN type = 'bank_transfer' THEN '#6f42c1'
    WHEN type = 'credit' THEN '#fd7e14'
    ELSE '#20c997'
  END
WHERE icon IS NULL OR color IS NULL;

-- Insert default payment methods if they don't exist
INSERT INTO payment_methods (name, type, requires_reference, icon, color) VALUES
('Cash', 'cash', FALSE, '💵', '#28a745'),
('Card', 'card', FALSE, '💳', '#007bff'),
('M-Pesa', 'mobile_money', TRUE, '📱', '#ff6b35'),
('Bank Transfer', 'bank_transfer', TRUE, '🏦', '#6f42c1'),
('Credit', 'credit', TRUE, '📋', '#fd7e14'),
('Cheque', 'other', TRUE, '📄', '#20c997')
ON CONFLICT DO NOTHING;

