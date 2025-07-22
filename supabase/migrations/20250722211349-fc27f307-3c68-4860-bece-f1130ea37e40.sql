-- Add unique constraint to prevent duplicate invitations for the same email per tenant
-- First, remove any existing duplicate invitations
DELETE FROM user_invitations a
USING user_invitations b
WHERE a.id < b.id
  AND a.tenant_id = b.tenant_id
  AND a.email = b.email
  AND a.status = 'pending'
  AND b.status = 'pending';

-- Add unique constraint for pending invitations
CREATE UNIQUE INDEX idx_user_invitations_unique_pending 
ON user_invitations (tenant_id, email) 
WHERE status = 'pending';

-- Add comment for documentation
COMMENT ON INDEX idx_user_invitations_unique_pending IS 'Ensures only one pending invitation per email per tenant';