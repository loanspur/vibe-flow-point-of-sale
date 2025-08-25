import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { Loader2, Plus, Bell, Mail, MessageSquare, Calendar, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

const alertSchema = z.object({
  alert_type: z.enum(['trial_ending', 'trial_ended', 'renewal_due', 'payment_failed', 'subscription_expired']),
  alert_date: z.string().min(1, 'Alert date is required'),
  notification_method: z.enum(['email', 'whatsapp', 'sms']),
  recipient_email: z.string().email().optional().or(z.literal('')),
  recipient_phone: z.string().optional().or(z.literal('')),
  message_content: z.string().optional(),
});

type AlertFormData = z.infer<typeof alertSchema>;

interface SubscriptionAlert {
  id: string;
  tenant_id: string;
  alert_type: 'trial_ending' | 'trial_ended' | 'renewal_due' | 'payment_failed' | 'subscription_expired';
  alert_date: string;
  is_sent: boolean;
  sent_at?: string;
  notification_method: 'email' | 'whatsapp' | 'sms';
  recipient_email?: string;
  recipient_phone?: string;
  message_content?: string;
  created_at: string;
  updated_at: string;
}

interface TenantSubscription {
  id: string;
  tenant_id: string;
  billing_plan_id: string;
  status: string;
  next_billing_date: string;
  trial_ends_at?: string;
  created_at: string;
}

export default function SubscriptionAlerts() {
  const [alerts, setAlerts] = useState<SubscriptionAlert[]>([]);
  const [tenantSubscription, setTenantSubscription] = useState<TenantSubscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<AlertFormData>({
    resolver: zodResolver(alertSchema),
    defaultValues: {
      alert_type: 'trial_ending',
      alert_date: '',
      notification_method: 'email',
      recipient_email: '',
      recipient_phone: '',
      message_content: '',
    },
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch subscription alerts
      const { data: alertsData, error: alertsError } = await supabase
        .from('subscription_alerts')
        .select('*')
        .order('alert_date', { ascending: false });

      if (alertsError) throw alertsError;

      // Fetch tenant subscription
      const { data: subscriptionData, error: subscriptionError } = await supabase
        .from('tenant_subscriptions')
        .select('*')
        .single();

      if (subscriptionError && subscriptionError.code !== 'PGRST116') {
        throw subscriptionError;
      }

      setAlerts(alertsData || []);
      setTenantSubscription(subscriptionData);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load subscription alerts',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: AlertFormData) => {
    setIsSaving(true);
    try {
      const { error } = await supabase.rpc('create_subscription_alert', {
        p_tenant_id: tenantSubscription?.tenant_id,
        p_alert_type: data.alert_type,
        p_alert_date: data.alert_date,
        p_notification_method: data.notification_method,
        p_recipient_email: data.recipient_email || null,
        p_recipient_phone: data.recipient_phone || null,
        p_message_content: data.message_content || null,
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Subscription alert created successfully',
      });

      setIsDialogOpen(false);
      form.reset();
      await fetchData();
    } catch (error) {
      console.error('Error creating alert:', error);
      toast({
        title: 'Error',
        description: 'Failed to create subscription alert',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAlert = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('subscription_alerts')
        .delete()
        .eq('id', alertId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Alert deleted successfully',
      });

      await fetchData();
    } catch (error) {
      console.error('Error deleting alert:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete alert',
        variant: 'destructive',
      });
    }
  };

  const getAlertTypeInfo = (type: string) => {
    const types = {
      trial_ending: {
        label: 'Trial Ending',
        description: 'Trial period is about to expire',
        icon: AlertTriangle,
        color: 'warning',
      },
      trial_ended: {
        label: 'Trial Ended',
        description: 'Trial period has expired',
        icon: AlertTriangle,
        color: 'destructive',
      },
      renewal_due: {
        label: 'Renewal Due',
        description: 'Subscription renewal is due',
        icon: Calendar,
        color: 'default',
      },
      payment_failed: {
        label: 'Payment Failed',
        description: 'Payment processing failed',
        icon: AlertTriangle,
        color: 'destructive',
      },
      subscription_expired: {
        label: 'Subscription Expired',
        description: 'Subscription has expired',
        icon: AlertTriangle,
        color: 'destructive',
      },
    };

    return types[type as keyof typeof types] || {
      label: type,
      description: 'Custom alert',
      icon: Bell,
      color: 'default',
    };
  };

  const getNotificationMethodIcon = (method: string) => {
    switch (method) {
      case 'email':
        return Mail;
      case 'whatsapp':
        return MessageSquare;
      case 'sms':
        return MessageSquare;
      default:
        return Bell;
    }
  };

  const getStatusBadge = (isSent: boolean, sentAt?: string) => {
    if (isSent) {
      return (
        <Badge variant="default" className="flex items-center gap-1">
          <CheckCircle className="h-3 w-3" />
          Sent
        </Badge>
      );
    } else {
      return (
        <Badge variant="secondary" className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Pending
        </Badge>
      );
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getDefaultMessage = (alertType: string) => {
    const messages = {
      trial_ending: 'Your trial period is ending soon. Please upgrade to continue using our services.',
      trial_ended: 'Your trial period has ended. Please upgrade to continue using our services.',
      renewal_due: 'Your subscription renewal is due. Please ensure your payment method is up to date.',
      payment_failed: 'We were unable to process your payment. Please update your payment method.',
      subscription_expired: 'Your subscription has expired. Please renew to continue using our services.',
    };

    return messages[alertType as keyof typeof messages] || '';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Subscription Alerts</h2>
          <p className="text-muted-foreground">
            Manage trial and renewal notifications for your subscription
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Alert
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Subscription Alert</DialogTitle>
              <DialogDescription>
                Set up notifications for important subscription events
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="alert_type">Alert Type</Label>
                <Select
                  value={form.watch('alert_type')}
                  onValueChange={(value: AlertFormData['alert_type']) => {
                    form.setValue('alert_type', value);
                    form.setValue('message_content', getDefaultMessage(value));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select alert type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="trial_ending">Trial Ending</SelectItem>
                    <SelectItem value="trial_ended">Trial Ended</SelectItem>
                    <SelectItem value="renewal_due">Renewal Due</SelectItem>
                    <SelectItem value="payment_failed">Payment Failed</SelectItem>
                    <SelectItem value="subscription_expired">Subscription Expired</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="alert_date">Alert Date</Label>
                <Input
                  id="alert_date"
                  type="date"
                  {...form.register('alert_date')}
                />
                {form.formState.errors.alert_date && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.alert_date.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="notification_method">Notification Method</Label>
                <Select
                  value={form.watch('notification_method')}
                  onValueChange={(value: AlertFormData['notification_method']) => 
                    form.setValue('notification_method', value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select notification method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {form.watch('notification_method') === 'email' && (
                <div className="space-y-2">
                  <Label htmlFor="recipient_email">Recipient Email</Label>
                  <Input
                    id="recipient_email"
                    type="email"
                    {...form.register('recipient_email')}
                    placeholder="Enter email address"
                  />
                  {form.formState.errors.recipient_email && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.recipient_email.message}
                    </p>
                  )}
                </div>
              )}

              {(form.watch('notification_method') === 'whatsapp' || form.watch('notification_method') === 'sms') && (
                <div className="space-y-2">
                  <Label htmlFor="recipient_phone">Recipient Phone</Label>
                  <Input
                    id="recipient_phone"
                    {...form.register('recipient_phone')}
                    placeholder="Enter phone number"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="message_content">Custom Message (Optional)</Label>
                <Textarea
                  id="message_content"
                  {...form.register('message_content')}
                  placeholder="Enter custom message or leave empty for default"
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false);
                    form.reset();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Alert
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Subscription Status */}
      {tenantSubscription && (
        <Card>
          <CardHeader>
            <CardTitle>Current Subscription</CardTitle>
            <CardDescription>
              Your current subscription status and next billing information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Status</p>
                <Badge variant={tenantSubscription.status === 'active' ? 'default' : 'secondary'}>
                  {tenantSubscription.status}
                </Badge>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Next Billing</p>
                <p className="text-sm">{formatDate(tenantSubscription.next_billing_date)}</p>
              </div>
              {tenantSubscription.trial_ends_at && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Trial Ends</p>
                  <p className="text-sm">{formatDate(tenantSubscription.trial_ends_at)}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alerts Table */}
      <Card>
        <CardHeader>
          <CardTitle>Subscription Alerts</CardTitle>
          <CardDescription>
            Manage your subscription notifications and alerts
          </CardDescription>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <div className="text-center py-8">
              <Bell className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-semibold">No alerts</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Get started by creating your first subscription alert.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alerts.map((alert) => {
                  const typeInfo = getAlertTypeInfo(alert.alert_type);
                  const TypeIcon = typeInfo.icon;
                  const MethodIcon = getNotificationMethodIcon(alert.notification_method);

                  return (
                    <TableRow key={alert.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <TypeIcon className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{typeInfo.label}</p>
                            <p className="text-sm text-muted-foreground">
                              {typeInfo.description}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(alert.alert_date)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <MethodIcon className="h-4 w-4 text-muted-foreground" />
                          <span className="capitalize">{alert.notification_method}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {alert.recipient_email || alert.recipient_phone || 'Not specified'}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(alert.is_sent, alert.sent_at)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteAlert(alert.id)}
                        >
                          Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
