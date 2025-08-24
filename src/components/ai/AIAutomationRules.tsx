import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Zap, 
  Settings, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Play,
  Pause,
  Brain,
  Target,
  Users,
  Package,
  DollarSign,
  BarChart3,
  Loader2
} from 'lucide-react';

interface AutomationRule {
  id: string;
  rule_name: string;
  rule_description: string;
  rule_type: 'inventory' | 'pricing' | 'marketing' | 'customer' | 'sales' | 'custom';
  trigger_condition: string;
  trigger_threshold: number;
  action_type: 'notification' | 'email' | 'sms' | 'webhook' | 'database_update' | 'custom_action';
  action_config: any;
  is_active: boolean;
  execution_frequency: 'immediate' | 'hourly' | 'daily' | 'weekly' | 'monthly';
  last_executed: string | null;
  execution_count: number;
  success_rate: number;
  created_at: string;
  updated_at: string;
}

interface CreateRuleForm {
  rule_name: string;
  rule_description: string;
  rule_type: string;
  trigger_condition: string;
  trigger_threshold: number;
  action_type: string;
  action_config: string;
  execution_frequency: string;
}

export default function AIAutomationRules() {
  const { user, tenantId } = useAuth();
  const { toast } = useToast();
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedRule, setSelectedRule] = useState<AutomationRule | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  // Form state
  const [formData, setFormData] = useState<CreateRuleForm>({
    rule_name: '',
    rule_description: '',
    rule_type: 'inventory',
    trigger_condition: '',
    trigger_threshold: 0,
    action_type: 'notification',
    action_config: '',
    execution_frequency: 'immediate'
  });

  // Load automation rules
  const loadRules = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('ai_automation_rules')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('AI automation rules table not available:', error);
        setRules([]);
        return;
      }
      setRules(data || []);
    } catch (error) {
      console.error('Error loading automation rules:', error);
      toast({
        title: 'Error',
        description: 'Failed to load automation rules',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Create new rule
  const handleCreateRule = async () => {
    setIsCreating(true);
    try {
              const { data, error } = await supabase
          .from('ai_automation_rules')
          .insert({
            tenant_id: tenantId,
          rule_name: formData.rule_name,
          rule_description: formData.rule_description,
          rule_type: formData.rule_type,
          trigger_condition: formData.trigger_condition,
          trigger_threshold: formData.trigger_threshold,
          action_type: formData.action_type,
          action_config: JSON.parse(formData.action_config || '{}'),
          execution_frequency: formData.execution_frequency,
          is_active: true,
          execution_count: 0,
          success_rate: 0
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating rule:', error);
        toast({
          title: 'AI Automation Not Available',
          description: 'AI automation features require additional setup. Please contact support.',
          variant: 'destructive',
        });
        return;
      }

      setRules([data, ...rules]);
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: 'Success',
        description: 'Automation rule created successfully',
      });
    } catch (error) {
      console.error('Error creating rule:', error);
      toast({
        title: 'AI Automation Not Available',
        description: 'AI automation features require additional setup. Please contact support.',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  // Update rule
  const handleUpdateRule = async () => {
    if (!selectedRule) return;
    
    setIsUpdating(true);
    try {
      const { data, error } = await supabase
        .from('ai_automation_rules')
        .update({
          rule_name: formData.rule_name,
          rule_description: formData.rule_description,
          rule_type: formData.rule_type,
          trigger_condition: formData.trigger_condition,
          trigger_threshold: formData.trigger_threshold,
          action_type: formData.action_type,
          action_config: JSON.parse(formData.action_config || '{}'),
          execution_frequency: formData.execution_frequency
        })
        .eq('id', selectedRule.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating rule:', error);
        toast({
          title: 'AI Automation Not Available',
          description: 'AI automation features require additional setup. Please contact support.',
          variant: 'destructive',
        });
        return;
      }

      setRules(rules.map(rule => rule.id === selectedRule.id ? data : rule));
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: 'Success',
        description: 'Automation rule updated successfully',
      });
    } catch (error) {
      console.error('Error updating rule:', error);
      toast({
        title: 'AI Automation Not Available',
        description: 'AI automation features require additional setup. Please contact support.',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Delete rule
  const handleDeleteRule = async (ruleId: string) => {
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('ai_automation_rules')
        .delete()
        .eq('id', ruleId);

      if (error) {
        console.error('Error deleting rule:', error);
        toast({
          title: 'AI Automation Not Available',
          description: 'AI automation features require additional setup. Please contact support.',
          variant: 'destructive',
        });
        return;
      }

      setRules(rules.filter(rule => rule.id !== ruleId));
      toast({
        title: 'Success',
        description: 'Automation rule deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting rule:', error);
      toast({
        title: 'AI Automation Not Available',
        description: 'AI automation features require additional setup. Please contact support.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Toggle rule status
  const handleToggleRule = async (rule: AutomationRule) => {
    try {
      const { data, error } = await supabase
        .from('ai_automation_rules')
        .update({ is_active: !rule.is_active })
        .eq('id', rule.id)
        .select()
        .single();

      if (error) throw error;

      setRules(rules.map(r => r.id === rule.id ? data : r));
      toast({
        title: 'Success',
        description: `Rule ${data.is_active ? 'activated' : 'deactivated'} successfully`,
      });
    } catch (error) {
      console.error('Error toggling rule:', error);
      toast({
        title: 'Error',
        description: 'Failed to update rule status',
        variant: 'destructive',
      });
    }
  };

  // Open edit dialog
  const openEditDialog = (rule: AutomationRule) => {
    setSelectedRule(rule);
    setFormData({
      rule_name: rule.rule_name,
      rule_description: rule.rule_description,
      rule_type: rule.rule_type,
      trigger_condition: rule.trigger_condition,
      trigger_threshold: rule.trigger_threshold,
      action_type: rule.action_type,
      action_config: JSON.stringify(rule.action_config, null, 2),
      execution_frequency: rule.execution_frequency
    });
    setIsEditMode(true);
    setIsDialogOpen(true);
  };

  // Open create dialog
  const openCreateDialog = () => {
    setSelectedRule(null);
    resetForm();
    setIsEditMode(false);
    setIsDialogOpen(true);
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      rule_name: '',
      rule_description: '',
      rule_type: 'inventory',
      trigger_condition: '',
      trigger_threshold: 0,
      action_type: 'notification',
      action_config: '',
      execution_frequency: 'immediate'
    });
  };

  // Get rule type icon
  const getRuleTypeIcon = (type: string) => {
    switch (type) {
      case 'inventory':
        return Package;
      case 'pricing':
        return DollarSign;
      case 'marketing':
        return Target;
      case 'customer':
        return Users;
      case 'sales':
        return BarChart3;
      default:
        return Brain;
    }
  };

  // Get action type label
  const getActionTypeLabel = (type: string) => {
    switch (type) {
      case 'notification':
        return 'Send Notification';
      case 'email':
        return 'Send Email';
      case 'sms':
        return 'Send SMS';
      case 'webhook':
        return 'Call Webhook';
      case 'database_update':
        return 'Update Database';
      case 'custom_action':
        return 'Custom Action';
      default:
        return type;
    }
  };

  // Format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString();
  };

  // Load rules on component mount
  useEffect(() => {
    if (tenantId) {
      loadRules();
    }
  }, [tenantId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">AI Automation Rules</h2>
          <p className="text-muted-foreground">
            Configure intelligent automation rules to streamline your business operations
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Create Rule
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {isEditMode ? 'Edit Automation Rule' : 'Create Automation Rule'}
              </DialogTitle>
              <DialogDescription>
                Configure an intelligent automation rule that will trigger based on specific conditions.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="rule_name">Rule Name</Label>
                  <Input
                    id="rule_name"
                    value={formData.rule_name}
                    onChange={(e) => setFormData({ ...formData, rule_name: e.target.value })}
                    placeholder="e.g., Low Stock Alert"
                  />
                </div>
                <div>
                  <Label htmlFor="rule_type">Rule Type</Label>
                  <Select value={formData.rule_type} onValueChange={(value) => setFormData({ ...formData, rule_type: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inventory">Inventory</SelectItem>
                      <SelectItem value="pricing">Pricing</SelectItem>
                      <SelectItem value="marketing">Marketing</SelectItem>
                      <SelectItem value="customer">Customer</SelectItem>
                      <SelectItem value="sales">Sales</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="rule_description">Description</Label>
                <Textarea
                  id="rule_description"
                  value={formData.rule_description}
                  onChange={(e) => setFormData({ ...formData, rule_description: e.target.value })}
                  placeholder="Describe what this rule does..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="trigger_condition">Trigger Condition</Label>
                  <Input
                    id="trigger_condition"
                    value={formData.trigger_condition}
                    onChange={(e) => setFormData({ ...formData, trigger_condition: e.target.value })}
                    placeholder="e.g., stock_quantity < threshold"
                  />
                </div>
                <div>
                  <Label htmlFor="trigger_threshold">Threshold</Label>
                  <Input
                    id="trigger_threshold"
                    type="number"
                    value={formData.trigger_threshold}
                    onChange={(e) => setFormData({ ...formData, trigger_threshold: parseFloat(e.target.value) })}
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="action_type">Action Type</Label>
                  <Select value={formData.action_type} onValueChange={(value) => setFormData({ ...formData, action_type: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="notification">Send Notification</SelectItem>
                      <SelectItem value="email">Send Email</SelectItem>
                      <SelectItem value="sms">Send SMS</SelectItem>
                      <SelectItem value="webhook">Call Webhook</SelectItem>
                      <SelectItem value="database_update">Update Database</SelectItem>
                      <SelectItem value="custom_action">Custom Action</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="execution_frequency">Execution Frequency</Label>
                  <Select value={formData.execution_frequency} onValueChange={(value) => setFormData({ ...formData, execution_frequency: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="immediate">Immediate</SelectItem>
                      <SelectItem value="hourly">Hourly</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="action_config">Action Configuration (JSON)</Label>
                <Textarea
                  id="action_config"
                  value={formData.action_config}
                  onChange={(e) => setFormData({ ...formData, action_config: e.target.value })}
                  placeholder='{"recipient": "admin@example.com", "subject": "Alert"}'
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={isEditMode ? handleUpdateRule : handleCreateRule}
                disabled={isCreating || isUpdating}
              >
                {isCreating || isUpdating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Zap className="mr-2 h-4 w-4" />
                )}
                {isEditMode ? 'Update Rule' : 'Create Rule'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Rules Grid */}
      {rules.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Zap className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No automation rules configured</h3>
            <p className="text-muted-foreground mb-4">
              Create your first automation rule to start automating your business processes.
            </p>
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Create First Rule
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {rules.map((rule) => {
            const Icon = getRuleTypeIcon(rule.rule_type);
            return (
              <Card key={rule.id} className="relative">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                      <CardTitle className="text-lg">{rule.rule_name}</CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={rule.is_active}
                        onCheckedChange={() => handleToggleRule(rule)}
                      />
                      <Badge variant={rule.is_active ? 'default' : 'secondary'}>
                        {rule.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>
                  <CardDescription>{rule.rule_description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Type:</span>
                      <span className="ml-1 font-medium capitalize">{rule.rule_type}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Action:</span>
                      <span className="ml-1 font-medium">{getActionTypeLabel(rule.action_type)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Frequency:</span>
                      <span className="ml-1 font-medium capitalize">{rule.execution_frequency}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Executions:</span>
                      <span className="ml-1 font-medium">{rule.execution_count}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Last executed:</span>
                    <span>{formatDate(rule.last_executed)}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Success rate:</span>
                    <span>{(rule.success_rate * 100).toFixed(1)}%</span>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(rule)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteRule(rule.id)}
                      disabled={isDeleting}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
