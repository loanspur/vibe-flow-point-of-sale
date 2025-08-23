import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  UserPlus, Mail, Shield, Crown, Users, 
  CheckCircle, Clock, AlertTriangle 
} from 'lucide-react';

interface Role {
  id: string;
  name: string;
  description: string;
  level: number;
  color: string;
  user_count: number;
}

export const UserInvitation = () => {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const roles: Role[] = [
    {
      id: 'admin',
      name: 'Administrator',
      description: 'Full system access with all privileges',
      level: 1,
      color: '#dc2626',
      user_count: 2
    },
    {
      id: 'manager',
      name: 'Manager',
      description: 'Manage sales, inventory, and team members',
      level: 2,
      color: '#2563eb',
      user_count: 5
    },
    {
      id: 'cashier',
      name: 'Cashier',
      description: 'Process sales and manage customer interactions',
      level: 3,
      color: '#059669',
      user_count: 8
    },
    {
      id: 'user',
      name: 'User',
      description: 'Basic system access for viewing and basic operations',
      level: 4,
      color: '#6b7280',
      user_count: 12
    }
  ];

  const handleInvite = async () => {
    if (!email || !fullName || !selectedRole) {
      return;
    }

    setIsSending(true);
    try {
      // Invite user logic here
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API call
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Invite New User
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
              />
            </div>
            <div>
              <Label htmlFor="fullName">Full Name *</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Doe"
              />
            </div>
          </div>

          {/* Role Selection */}
          <div>
            <Label>Select Role *</Label>
            <div className="grid grid-cols-2 gap-4 mt-2">
              {roles.map((role) => (
                <Card 
                  key={role.id}
                  className={`cursor-pointer transition-all ${
                    selectedRole === role.id 
                      ? 'ring-2 ring-primary border-primary' 
                      : 'hover:border-muted-foreground/50'
                  }`}
                  onClick={() => setSelectedRole(role.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: role.color }}
                        />
                        <span className="font-medium">{role.name}</span>
                        {role.level === 1 && <Crown className="h-4 w-4 text-yellow-500" />}
                      </div>
                      <Badge variant="outline">Level {role.level}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {role.description}
                    </p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{role.user_count} users</span>
                      <Shield className="h-3 w-3" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Custom Message */}
          <div>
            <Label htmlFor="message">Personal Message (Optional)</Label>
            <Input
              id="message"
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="Add a personal message to the invitation..."
            />
          </div>

          {/* Send Button */}
          <Button 
            onClick={handleInvite}
            disabled={!email || !fullName || !selectedRole || isSending}
            className="w-full"
          >
            {isSending ? (
              <>
                <Clock className="h-4 w-4 mr-2 animate-spin" />
                Sending Invitation...
              </>
            ) : (
              <>
                <Mail className="h-4 w-4 mr-2" />
                Send Invitation
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
