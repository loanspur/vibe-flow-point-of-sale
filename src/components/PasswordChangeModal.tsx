import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export const PasswordChangeModal = () => {
  const { requirePasswordChange, updatePassword } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updating, setUpdating] = useState(false);

  const handlePasswordChange = async () => {
    if (!newPassword || !confirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setUpdating(true);
    try {
      const { error } = await updatePassword(newPassword);
      
      if (error) {
        toast.error('Failed to update password: ' + error.message);
      } else {
        toast.success('Password updated successfully');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (error) {
      toast.error('Failed to update password');
    } finally {
      setUpdating(false);
    }
  };

  if (!requirePasswordChange) return null;

  return (
    <Dialog open={true}>
      <DialogContent className="sm:max-w-md" onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Password Change Required
          </DialogTitle>
          <DialogDescription>
            For security reasons, you must change your password before you can continue using the application.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="new-password">New Password</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              disabled={updating}
            />
          </div>
          
          <div>
            <Label htmlFor="confirm-password">Confirm Password</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              disabled={updating}
            />
          </div>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-yellow-800">
              <strong>Password Requirements:</strong>
            </p>
            <ul className="text-sm text-yellow-700 mt-1 list-disc list-inside">
              <li>At least 6 characters long</li>
              <li>Use a strong, unique password</li>
            </ul>
          </div>
          
          <Button 
            onClick={handlePasswordChange} 
            disabled={updating || !newPassword || !confirmPassword}
            className="w-full"
          >
            {updating ? 'Updating Password...' : 'Update Password'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};