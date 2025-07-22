import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { 
  User, 
  Mail, 
  Shield, 
  Building, 
  Calendar,
  Key,
  Camera,
  Save,
  Eye,
  EyeOff
} from 'lucide-react';

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  role: string;
  avatar_url: string | null;
  tenant_id: string | null;
  created_at: string;
  updated_at: string;
}

interface ContactProfile {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  address: string | null;
  notes: string | null;
}

export default function UserProfileSettings() {
  const { user, userRole, tenantId } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [contactProfile, setContactProfile] = useState<ContactProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  
  // Form states
  const [fullName, setFullName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Contact form states
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactCompany, setContactCompany] = useState('');
  const [contactAddress, setContactAddress] = useState('');
  const [contactNotes, setContactNotes] = useState('');

  useEffect(() => {
    if (user) {
      fetchUserProfile();
      fetchContactProfile();
    }
  }, [user]);

  const fetchUserProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return;
      }

      setProfile(data);
      setFullName(data.full_name || '');
    } catch (error) {
      console.error('Error fetching user profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchContactProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching contact profile:', error);
        return;
      }

      if (data) {
        setContactProfile(data);
        setContactName(data.name || '');
        setContactEmail(data.email || '');
        setContactPhone(data.phone || '');
        setContactCompany(data.company || '');
        setContactAddress(data.address || '');
        setContactNotes(data.notes || '');
      }
    } catch (error) {
      console.error('Error fetching contact profile:', error);
    }
  };

  const handleUpdateProfile = async () => {
    if (!user || !profile) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim() || null,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) {
        toast.error('Failed to update profile');
        console.error('Error updating profile:', error);
        return;
      }

      toast.success('Profile updated successfully');
      await fetchUserProfile();
    } catch (error) {
      toast.error('Failed to update profile');
      console.error('Error updating profile:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateContactProfile = async () => {
    if (!user || !tenantId) return;

    setSaving(true);
    try {
      const contactData = {
        name: contactName.trim(),
        email: contactEmail.trim() || null,
        phone: contactPhone.trim() || null,
        company: contactCompany.trim() || null,
        address: contactAddress.trim() || null,
        notes: contactNotes.trim() || null,
        type: 'employee',
        tenant_id: tenantId,
        user_id: user.id,
        updated_at: new Date().toISOString()
      };

      let error;
      if (contactProfile) {
        // Update existing contact
        const { error: updateError } = await supabase
          .from('contacts')
          .update(contactData)
          .eq('id', contactProfile.id);
        error = updateError;
      } else {
        // Create new contact
        const { error: insertError } = await supabase
          .from('contacts')
          .insert({
            ...contactData,
            created_at: new Date().toISOString()
          });
        error = insertError;
      }

      if (error) {
        toast.error('Failed to update contact profile');
        console.error('Error updating contact profile:', error);
        return;
      }

      toast.success('Contact profile updated successfully');
      await fetchContactProfile();
    } catch (error) {
      toast.error('Failed to update contact profile');
      console.error('Error updating contact profile:', error);
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Please fill in all password fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        toast.error('Failed to change password');
        console.error('Error changing password:', error);
        return;
      }

      toast.success('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordChange(false);
    } catch (error) {
      toast.error('Failed to change password');
      console.error('Error changing password:', error);
    } finally {
      setSaving(false);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'superadmin': return 'bg-destructive text-destructive-foreground';
      case 'admin': return 'bg-primary text-primary-foreground';
      case 'manager': return 'bg-accent text-accent-foreground';
      case 'cashier': return 'bg-secondary text-secondary-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center p-8">
        <p className="text-muted-foreground">Profile not found</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Profile Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={profile.avatar_url || undefined} />
              <AvatarFallback className="text-lg">
                {profile.full_name ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase() : 
                 user?.email?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <CardTitle className="text-2xl">
                {profile.full_name || 'No Name Set'}
              </CardTitle>
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span>{user?.email}</span>
                </div>
                <Badge className={getRoleColor(profile.role)}>
                  <Shield className="h-3 w-3 mr-1" />
                  {profile.role}
                </Badge>
              </div>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Member since {new Date(profile.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Profile Management Tabs */}
      <Tabs defaultValue="personal" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="personal">Personal Info</TabsTrigger>
          <TabsTrigger value="contact">Contact Profile</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        {/* Personal Information Tab */}
        <TabsContent value="personal">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5" />
                <span>Personal Information</span>
              </CardTitle>
              <CardDescription>
                Update your personal details and profile information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    value={user?.email || ''}
                    disabled
                    className="bg-muted text-muted-foreground"
                  />
                  <p className="text-xs text-muted-foreground">
                    Email cannot be changed. Contact your administrator if needed.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <div className="flex items-center space-x-2">
                    <Badge className={getRoleColor(profile.role)}>
                      <Shield className="h-3 w-3 mr-1" />
                      {profile.role}
                    </Badge>
                    <p className="text-xs text-muted-foreground">
                      Role is managed by your administrator
                    </p>
                  </div>
                </div>

                {tenantId && (
                  <div className="space-y-2">
                    <Label htmlFor="tenant">Organization</Label>
                    <div className="flex items-center space-x-2">
                      <Building className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        Tenant ID: {tenantId}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              <div className="flex justify-end">
                <Button 
                  onClick={handleUpdateProfile}
                  disabled={saving}
                  className="flex items-center space-x-2"
                >
                  <Save className="h-4 w-4" />
                  <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contact Profile Tab */}
        <TabsContent value="contact">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5" />
                <span>Contact Profile</span>
              </CardTitle>
              <CardDescription>
                {contactProfile ? 
                  'Update your contact information visible to other team members' :
                  'Create a contact profile to be visible to other team members'
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contactName">Display Name *</Label>
                  <Input
                    id="contactName"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="How you want to appear to others"
                    required
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="contactEmail">Contact Email</Label>
                    <Input
                      id="contactEmail"
                      type="email"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      placeholder="your@email.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contactPhone">Phone Number</Label>
                    <Input
                      id="contactPhone"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contactCompany">Company/Department</Label>
                  <Input
                    id="contactCompany"
                    value={contactCompany}
                    onChange={(e) => setContactCompany(e.target.value)}
                    placeholder="Your department or company division"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contactAddress">Address</Label>
                  <Input
                    id="contactAddress"
                    value={contactAddress}
                    onChange={(e) => setContactAddress(e.target.value)}
                    placeholder="Work address or location"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contactNotes">Notes</Label>
                  <Input
                    id="contactNotes"
                    value={contactNotes}
                    onChange={(e) => setContactNotes(e.target.value)}
                    placeholder="Additional information about yourself"
                  />
                </div>
              </div>

              <Separator />

              <div className="flex justify-end">
                <Button 
                  onClick={handleUpdateContactProfile}
                  disabled={saving || !contactName.trim()}
                  className="flex items-center space-x-2"
                >
                  <Save className="h-4 w-4" />
                  <span>{saving ? 'Saving...' : (contactProfile ? 'Update Profile' : 'Create Profile')}</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Key className="h-5 w-5" />
                <span>Security Settings</span>
              </CardTitle>
              <CardDescription>
                Manage your account security and password
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Password</h4>
                    <p className="text-sm text-muted-foreground">
                      Last updated: {new Date(profile.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setShowPasswordChange(!showPasswordChange)}
                    className="flex items-center space-x-2"
                  >
                    {showPasswordChange ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    <span>{showPasswordChange ? 'Cancel' : 'Change Password'}</span>
                  </Button>
                </div>

                {showPasswordChange && (
                  <div className="border rounded-lg p-4 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="currentPassword">Current Password</Label>
                      <Input
                        id="currentPassword"
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Enter current password"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="newPassword">New Password</Label>
                      <Input
                        id="newPassword"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password (min. 6 characters)"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm New Password</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm new password"
                      />
                    </div>

                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowPasswordChange(false);
                          setCurrentPassword('');
                          setNewPassword('');
                          setConfirmPassword('');
                        }}
                      >
                        Cancel
                      </Button>
                      <Button 
                        onClick={handlePasswordChange}
                        disabled={saving}
                      >
                        {saving ? 'Updating...' : 'Update Password'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="font-medium mb-2">Account Information</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">User ID:</span>
                    <span className="font-mono text-xs">{user?.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Account Created:</span>
                    <span>{new Date(profile.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last Updated:</span>
                    <span>{new Date(profile.updated_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}