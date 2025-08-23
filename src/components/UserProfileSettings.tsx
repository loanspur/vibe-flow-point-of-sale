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
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
  EyeOff,
  Smartphone,
  Activity,
  LogOut,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Monitor,
  RefreshCw,
  Edit
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
  email_verified: boolean;
  email_verified_at: string | null;
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

interface LoginActivity {
  id: string;
  action_type: string;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  details: any;
}

export default function UserProfileSettings() {
  const { user, userRole, tenantId, signOut, refreshUserInfo } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [contactProfile, setContactProfile] = useState<ContactProfile | null>(null);
  const [loginActivity, setLoginActivity] = useState<LoginActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [showEmailChange, setShowEmailChange] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  // Form states
  const [fullName, setFullName] = useState('');
  const [newEmail, setNewEmail] = useState('');
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
  
  // Email verification states
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [verificationOTP, setVerificationOTP] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [resendTimeout, setResendTimeout] = useState(0);

  useEffect(() => {
    if (user) {
      fetchUserProfile();
      fetchContactProfile();
      fetchLoginActivity();
    }
  }, [user]);

  useEffect(() => {
    if (newPassword) {
      setPasswordStrength(calculatePasswordStrength(newPassword));
    }
  }, [newPassword]);

  const fetchUserProfile = async () => {
    if (!user) {
      setError('User not authenticated');
      setLoading(false);
      return;
    }

    try {
      setError(null);
      console.log('Fetching profile for user:', user.id);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        
        // If profile doesn't exist, create one
        if (error.code === 'PGRST116') {
          console.log('Profile not found, creating new profile...');
          await createUserProfile();
          return;
        }
        
        setError(`Failed to fetch profile: ${error.message}`);
        return;
      }

      console.log('Profile fetched successfully:', data);
      setProfile(data);
      setFullName(data.full_name || '');
    } catch (error) {
      console.error('Error fetching user profile:', error);
      setError('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const createUserProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .insert({
          user_id: user.id,
          full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
          email: user.email,
          role: userRole || 'user',
          tenant_id: tenantId,
          email_verified: user.email_confirmed_at ? true : false,
          email_verified_at: user.email_confirmed_at
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating profile:', error);
        setError(`Failed to create profile: ${error.message}`);
        return;
      }

      console.log('Profile created successfully:', data);
      setProfile(data);
      setFullName(data.full_name || '');
      toast.success('Profile created successfully');
    } catch (error) {
      console.error('Error creating user profile:', error);
      setError('Failed to create profile');
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

  const fetchLoginActivity = async () => {
    if (!user || !tenantId) return;

    try {
      const { data, error } = await supabase
        .from('user_activity_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('action_type', 'login')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error fetching login activity:', error);
        return;
      }

      setLoginActivity((data || []).map(item => ({
        ...item,
        ip_address: item.ip_address as string | null,
        user_agent: item.user_agent as string | null
      })));
    } catch (error) {
      console.error('Error fetching login activity:', error);
    }
  };

  const calculatePasswordStrength = (password: string): number => {
    let strength = 0;
    
    // Length check
    if (password.length >= 8) strength += 25;
    if (password.length >= 12) strength += 15;
    
    // Character variety checks
    if (/[a-z]/.test(password)) strength += 15;
    if (/[A-Z]/.test(password)) strength += 15;
    if (/[0-9]/.test(password)) strength += 15;
    if (/[^A-Za-z0-9]/.test(password)) strength += 15;
    
    return Math.min(strength, 100);
  };

  const getPasswordStrengthText = (strength: number): string => {
    if (strength < 40) return 'Weak';
    if (strength < 60) return 'Fair';
    if (strength < 80) return 'Good';
    return 'Strong';
  };

  const handleUpdateProfile = async () => {
    if (!user || !profile) {
      toast.error('User not found or not logged in');
      return;
    }

    // Check if we have a valid session before proceeding
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      toast.error('Session expired. Please log in again.');
      return;
    }

    setSaving(true);
    try {
      console.log('Updating profile for user:', user.id, 'with full_name:', fullName);
      
      // First update the database profile
      const { data, error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim() || null,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .select();

      if (error) {
        console.error('Database update error:', error);
        toast.error(`Failed to update profile: ${error.message}`);
        return;
      }

      console.log('Database update successful:', data);

      // Only update auth metadata if we have a valid session
      if (session) {
        const { error: authError } = await supabase.auth.updateUser({
          data: {
            full_name: fullName.trim() || null
          }
        });

        if (authError) {
          console.error('Auth metadata update error:', authError);
          // Don't fail the whole operation if auth metadata update fails
          console.warn('Auth metadata update failed but profile was updated successfully');
        } else {
          console.log('Auth metadata update successful');
        }
      }

      // Wait for auth update to propagate
      await new Promise(resolve => setTimeout(resolve, 300));

      toast.success('Profile updated successfully');
      await fetchUserProfile();
      
      // Refresh auth context to update UI
      if (refreshUserInfo) {
        await refreshUserInfo();
      }

      // Refresh data without page reload
      window.location.reload();
    } catch (error: any) {
      console.error('Unexpected error updating profile:', error);
      toast.error(`Failed to update profile: ${error.message || 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!user) {
      toast.error('User not found');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordStrength < 60) {
      toast.error('Password is too weak. Please choose a stronger password.');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        toast.error(`Failed to update password: ${error.message}`);
        return;
      }

      toast.success('Password updated successfully');
      setNewPassword('');
      setConfirmPassword('');
      setCurrentPassword('');
      setShowPasswordChange(false);
    } catch (error) {
      console.error('Error updating password:', error);
      toast.error('Failed to update password. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleEmailChange = async () => {
    if (!user) {
      toast.error('User not found');
      return;
    }

    if (!newEmail || newEmail === user.email) {
      toast.error('Please enter a different email address');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        email: newEmail
      });

      if (error) {
        toast.error(`Failed to update email: ${error.message}`);
        return;
      }

      toast.success('Email update request sent. Please check your new email for verification.');
      setShowEmailVerification(true);
      setOtpSent(true);
      setResendTimeout(60);
    } catch (error) {
      console.error('Error updating email:', error);
      toast.error('Failed to update email. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleVerifyEmail = async () => {
    if (!verificationOTP) {
      toast.error('Please enter the verification code');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: newEmail,
        token: verificationOTP,
        type: 'email_change'
      });

      if (error) {
        toast.error(`Verification failed: ${error.message}`);
        return;
      }

      toast.success('Email updated successfully');
      setShowEmailVerification(false);
      setVerificationOTP('');
      setNewEmail('');
      setShowEmailChange(false);
      
      // Refresh user info
      if (refreshUserInfo) {
        await refreshUserInfo();
      }
    } catch (error) {
      console.error('Error verifying email:', error);
      toast.error('Verification failed. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleResendOTP = async () => {
    if (!newEmail) {
      toast.error('No email address to resend to');
      return;
    }

    try {
      const { error } = await supabase.auth.resend({
        type: 'email_change',
        email: newEmail
      });

      if (error) {
        toast.error(`Failed to resend verification: ${error.message}`);
        return;
      }

      toast.success('Verification code resent');
      setResendTimeout(60);
    } catch (error) {
      console.error('Error resending OTP:', error);
      toast.error('Failed to resend verification code');
    }
  };

  const handleContactUpdate = async () => {
    if (!user) {
      toast.error('User not found');
      return;
    }

    setSaving(true);
    try {
      const contactData = {
        user_id: user.id,
        name: contactName.trim(),
        email: contactEmail.trim() || null,
        phone: contactPhone.trim() || null,
        company: contactCompany.trim() || null,
        address: contactAddress.trim() || null,
        notes: contactNotes.trim() || null
      };

      let result;
      if (contactProfile) {
        // Update existing contact
        result = await supabase
          .from('contacts')
          .update(contactData)
          .eq('id', contactProfile.id)
          .select();
      } else {
        // Create new contact
        result = await supabase
          .from('contacts')
          .insert(contactData)
          .select();
      }

      if (result.error) {
        toast.error(`Failed to update contact: ${result.error.message}`);
        return;
      }

      toast.success('Contact information updated successfully');
      await fetchContactProfile();
    } catch (error) {
      console.error('Error updating contact:', error);
      toast.error('Failed to update contact information');
    } finally {
      setSaving(false);
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {error}
            <Button 
              variant="outline" 
              size="sm" 
              className="ml-2"
              onClick={() => {
                setError(null);
                setLoading(true);
                fetchUserProfile();
              }}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Show profile not found state
  if (!profile) {
    return (
      <div className="p-6">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Profile not found. 
            <Button 
              variant="outline" 
              size="sm" 
              className="ml-2"
              onClick={createUserProfile}
            >
              <User className="h-4 w-4 mr-2" />
              Create Profile
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={profile.avatar_url || undefined} />
              <AvatarFallback>
                {profile.full_name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <CardTitle className="text-xl">{profile.full_name || 'User'}</CardTitle>
              <CardDescription className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                {user?.email}
                {profile.email_verified && (
                  <Badge variant="secondary" className="text-xs">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Verified
                  </Badge>
                )}
              </CardDescription>
              <div className="flex items-center gap-2 mt-1">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground capitalize">{userRole || 'User'}</span>
                <Badge variant="outline">{tenantId ? 'Tenant User' : 'System User'}</Badge>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Profile Tabs */}
      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="contact">Contact</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Basic Information
              </CardTitle>
              <CardDescription>
                Update your personal information and profile details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">
                    Email address cannot be changed from this form
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 pt-4">
                <Button onClick={handleUpdateProfile} disabled={saving}>
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={() => setFullName(profile.full_name || '')}>
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Password & Security
              </CardTitle>
              <CardDescription>
                Update your password and security settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!showPasswordChange ? (
                <Button onClick={() => setShowPasswordChange(true)} variant="outline">
                  <Key className="h-4 w-4 mr-2" />
                  Change Password
                </Button>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        placeholder="Enter new password"
                      />
                    </div>
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

                  {newPassword && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Password Strength</span>
                        <span>{getPasswordStrengthText(passwordStrength)}</span>
                      </div>
                      <Progress value={passwordStrength} className="h-2" />
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <Button onClick={handlePasswordChange} disabled={saving}>
                      {saving ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Updating...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Update Password
                        </>
                      )}
                    </Button>
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
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contact Tab */}
        <TabsContent value="contact" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Contact Information
              </CardTitle>
              <CardDescription>
                Update your contact details and business information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contactName">Contact Name</Label>
                  <Input
                    id="contactName"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Enter contact name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactEmail">Contact Email</Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="Enter contact email"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contactPhone">Phone Number</Label>
                  <Input
                    id="contactPhone"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="Enter phone number"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactCompany">Company</Label>
                  <Input
                    id="contactCompany"
                    value={contactCompany}
                    onChange={(e) => setContactCompany(e.target.value)}
                    placeholder="Enter company name"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="contactAddress">Address</Label>
                <Input
                  id="contactAddress"
                  value={contactAddress}
                  onChange={(e) => setContactAddress(e.target.value)}
                  placeholder="Enter address"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="contactNotes">Notes</Label>
                <Input
                  id="contactNotes"
                  value={contactNotes}
                  onChange={(e) => setContactNotes(e.target.value)}
                  placeholder="Enter any additional notes"
                />
              </div>
              
              <div className="flex items-center gap-2 pt-4">
                <Button onClick={handleContactUpdate} disabled={saving}>
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Contact Info
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Login Activity
              </CardTitle>
              <CardDescription>
                Recent login activity and account access
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loginActivity.length > 0 ? (
                <div className="space-y-3">
                  {loginActivity.map((activity) => (
                    <div key={activity.id} className="flex items-center gap-3 p-3 border rounded-lg">
                      <div className="flex-shrink-0">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">Login successful</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(activity.created_at).toLocaleString()}
                        </p>
                        {activity.ip_address && (
                          <p className="text-xs text-muted-foreground">
                            IP: {activity.ip_address}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No login activity recorded</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}