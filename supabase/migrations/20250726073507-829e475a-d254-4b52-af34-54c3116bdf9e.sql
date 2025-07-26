-- Remove user associations from traction tenant
DELETE FROM tenant_users 
WHERE tenant_id = '6742eb8a-434e-4c14-a91c-6d55adeb5750' 
AND user_id IN ('20437d89-c634-4865-9ed7-e9e267243235', '6ca9e922-ff70-4a47-8a2f-50e4289e95c1');

-- Remove any role assignments from traction tenant
DELETE FROM user_role_assignments 
WHERE tenant_id = '6742eb8a-434e-4c14-a91c-6d55adeb5750' 
AND user_id IN ('20437d89-c634-4865-9ed7-e9e267243235', '6ca9e922-ff70-4a47-8a2f-50e4289e95c1');

-- Remove any pending invitations for these emails in traction tenant
DELETE FROM user_invitations 
WHERE tenant_id = '6742eb8a-434e-4c14-a91c-6d55adeb5750' 
AND email IN ('damzaltd@gmail.com', 'loanspurcbs@gmail.com');