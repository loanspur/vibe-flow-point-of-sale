-- Part 1: Add new enum values for permission system enhancement

-- Add new enum values for permission_resource
ALTER TYPE permission_resource ADD VALUE IF NOT EXISTS 'brands';
ALTER TYPE permission_resource ADD VALUE IF NOT EXISTS 'units';
ALTER TYPE permission_resource ADD VALUE IF NOT EXISTS 'stock_levels';
ALTER TYPE permission_resource ADD VALUE IF NOT EXISTS 'stock_transfers';
ALTER TYPE permission_resource ADD VALUE IF NOT EXISTS 'stock_receiving';
ALTER TYPE permission_resource ADD VALUE IF NOT EXISTS 'communication_settings';
ALTER TYPE permission_resource ADD VALUE IF NOT EXISTS 'cash_drawers';
ALTER TYPE permission_resource ADD VALUE IF NOT EXISTS 'cash_transactions';
ALTER TYPE permission_resource ADD VALUE IF NOT EXISTS 'cash_transfers';
ALTER TYPE permission_resource ADD VALUE IF NOT EXISTS 'pricing_rules';

-- Add new enum values for permission_action
ALTER TYPE permission_action ADD VALUE IF NOT EXISTS 'manage';
ALTER TYPE permission_action ADD VALUE IF NOT EXISTS 'process';
ALTER TYPE permission_action ADD VALUE IF NOT EXISTS 'transfer';
ALTER TYPE permission_action ADD VALUE IF NOT EXISTS 'reconcile';
ALTER TYPE permission_action ADD VALUE IF NOT EXISTS 'export';
ALTER TYPE permission_action ADD VALUE IF NOT EXISTS 'import';
ALTER TYPE permission_action ADD VALUE IF NOT EXISTS 'configure';
ALTER TYPE permission_action ADD VALUE IF NOT EXISTS 'send';
ALTER TYPE permission_action ADD VALUE IF NOT EXISTS 'schedule';