import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { 
  CreditCard, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  RefreshCw, 
  DollarSign, 
  Percent,
  Settings,
  Calendar,
  AlertTriangle,
  CheckCircle,
  X
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEffectivePricing } from "@/hooks/useEffectivePricing";
import { useCurrencyUpdate } from "@/hooks/useCurrencyUpdate";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface BillingPlan {
  id: string;
  name: string;
  price: number;
  period: string;
  badge?: string;
  badge_color?: string;
  description?: string;
  features?: any[];
}

interface TenantSubscription {
  id: string;
  tenant_id: string;
  billing_plan_id: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  billing_plans?: {
    name: string;
    price: number;
    period: string;
  };
}

interface Tenant {
  id: string;
  name: string;
  contact_email: string;
}

interface EnhancedSubscriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant: Tenant | null;
  subscription: TenantSubscription | null;
  billingPlans: BillingPlan[];
  onUpdateSubscription: (tenantId: string, planId: string) => Promise<void>;
  subscriptionLoading: boolean;
}

export default function EnhancedSubscriptionDialog({
  open,
  onOpenChange,
  tenant,
  subscription,
  billingPlans,
  onUpdateSubscription,
  subscriptionLoading
}: EnhancedSubscriptionDialogProps) {
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [showCustomPricing, setShowCustomPricing] = useState(false);
  const [customPricingForm, setCustomPricingForm] = useState({
    custom_amount: "",
    reason: "",
    notes: "",
    effective_date: new Date(),
    expires_at: undefined as Date | undefined
  });

  const { toast } = useToast();
  const { formatPrice } = useCurrencyUpdate();
  const { 
    effectivePricing, 
    loading: pricingLoading, 
    updateCustomPricing, 
    removeCustomPricing,
    refetch: refetchPricing
  } = useEffectivePricing(
    tenant?.id,
    selectedPlanId || subscription?.billing_plan_id
  );

  useEffect(() => {
    if (subscription?.billing_plan_id) {
      setSelectedPlanId(subscription.billing_plan_id);
    }
  }, [subscription]);

  const handlePlanSelect = (planId: string) => {
    setSelectedPlanId(planId);
    setShowCustomPricing(false);
  };

  const handleApplyCustomPricing = async () => {
    if (!tenant || !selectedPlanId) return;

    const customAmount = parseFloat(customPricingForm.custom_amount);
    if (isNaN(customAmount) || customAmount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid custom amount.",
        variant: "destructive"
      });
      return;
    }

    const success = await updateCustomPricing(
      tenant.id,
      selectedPlanId,
      customAmount,
      customPricingForm.reason,
      customPricingForm.notes,
      customPricingForm.effective_date,
      customPricingForm.expires_at
    );

    if (success) {
      toast({
        title: "Custom Pricing Applied",
        description: "Custom pricing has been successfully set for this tenant."
      });
      setShowCustomPricing(false);
      // Reset form
      setCustomPricingForm({
        custom_amount: "",
        reason: "",
        notes: "",
        effective_date: new Date(),
        expires_at: undefined
      });
    }
  };

  const handleRemoveCustomPricing = async () => {
    if (!tenant || !selectedPlanId) return;

    const success = await removeCustomPricing(tenant.id, selectedPlanId);
    if (success) {
      toast({
        title: "Custom Pricing Removed",
        description: "Standard pricing will now apply."
      });
    }
  };

  const handleUpdateSubscription = async () => {
    if (!tenant || !selectedPlanId) return;
    await onUpdateSubscription(tenant.id, selectedPlanId);
    onOpenChange(false);
  };

  const selectedPlan = billingPlans.find(p => p.id === selectedPlanId);
  const currentPlanPrice = subscription?.billing_plans?.price || 0;
  const isCurrentPlan = subscription?.billing_plan_id === selectedPlanId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Manage Subscription - {tenant?.name}
          </DialogTitle>
          <DialogDescription>
            Upgrade, downgrade, or manage the subscription plan for this tenant
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Subscription Info */}
          {subscription && (
            <div className="p-4 border rounded-lg bg-muted/50">
              <h3 className="font-medium mb-2">Current Subscription</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Plan: </span>
                  <span className="font-medium">{subscription.billing_plans?.name}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Status: </span>
                  <Badge variant={subscription.status === 'active' ? "default" : "secondary"}>
                    {subscription.status}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Price: </span>
                  <span className="font-medium">{formatPrice(currentPlanPrice)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Period: </span>
                  <span className="font-medium">{subscription.billing_plans?.period}</span>
                </div>
              </div>
            </div>
          )}

          {/* Plan Selection */}
          <div>
            <h3 className="font-semibold mb-4">
              {subscription ? 'Change Plan' : 'Select Plan'}
            </h3>
            <div className="grid gap-4">
              {billingPlans.map((plan) => {
                const isSelected = selectedPlanId === plan.id;
                const isUpgrade = plan.price > currentPlanPrice;
                const isDowngrade = plan.price < currentPlanPrice;
                
                return (
                  <div
                    key={plan.id}
                    className={`p-4 border rounded-lg transition-all cursor-pointer ${
                      isSelected 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => handlePlanSelect(plan.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {plan.badge && (
                          <Badge className={plan.badge_color}>
                            {plan.badge}
                          </Badge>
                        )}
                        <div>
                          <h4 className="font-medium flex items-center gap-2">
                            {plan.name}
                            {isCurrentPlan && (
                              <Badge variant="outline" className="text-xs">
                                Current
                              </Badge>
                            )}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {formatPrice(plan.price)} per {plan.period}
                          </p>
                          {plan.description && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {plan.description}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {subscription && !isCurrentPlan && (
                          <div className="text-right mr-3">
                            {isUpgrade && (
                              <div className="flex items-center gap-1 text-green-600">
                                <ArrowUpCircle className="h-4 w-4" />
                                <span className="text-xs">Upgrade</span>
                              </div>
                            )}
                            {isDowngrade && (
                              <div className="flex items-center gap-1 text-orange-600">
                                <ArrowDownCircle className="h-4 w-4" />
                                <span className="text-xs">Downgrade</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Custom Pricing Section */}
          {selectedPlan && (
            <div className="space-y-4">
              <Separator />
              
              {/* Current Effective Pricing */}
              {effectivePricing && (
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">Effective Pricing</h4>
                    {effectivePricing.is_custom && (
                      <Badge variant="outline" className="text-green-600">
                        <Percent className="h-3 w-3 mr-1" />
                        Custom Pricing Active
                      </Badge>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Standard Price: </span>
                      <span className="font-medium">{formatPrice(effectivePricing.original_amount)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Effective Price: </span>
                      <span className={`font-medium ${effectivePricing.is_custom ? 'text-green-600' : ''}`}>
                        {formatPrice(effectivePricing.effective_amount)}
                      </span>
                    </div>
                    {effectivePricing.is_custom && effectivePricing.discount_percentage && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Discount: </span>
                        <span className="font-medium text-green-600">
                          {effectivePricing.discount_percentage.toFixed(1)}% off
                        </span>
                      </div>
                    )}
                  </div>

                  {effectivePricing.is_custom && (
                    <div className="mt-3 pt-3 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRemoveCustomPricing}
                        className="text-destructive hover:text-destructive"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Remove Custom Pricing
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Custom Pricing Controls */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium">Custom Pricing</h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCustomPricing(!showCustomPricing)}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    {showCustomPricing ? 'Hide' : 'Set Custom Price'}
                  </Button>
                </div>

                {showCustomPricing && (
                  <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="custom_amount">Custom Amount</Label>
                        <Input
                          id="custom_amount"
                          type="number"
                          step="0.01"
                          value={customPricingForm.custom_amount}
                          onChange={(e) => setCustomPricingForm({
                            ...customPricingForm, 
                            custom_amount: e.target.value
                          })}
                          placeholder={`Standard: ${formatPrice(selectedPlan.price)}`}
                        />
                      </div>
                      <div>
                        <Label htmlFor="reason">Reason</Label>
                        <Input
                          id="reason"
                          value={customPricingForm.reason}
                          onChange={(e) => setCustomPricingForm({
                            ...customPricingForm, 
                            reason: e.target.value
                          })}
                          placeholder="e.g., Enterprise discount"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="notes">Notes (Optional)</Label>
                      <Textarea
                        id="notes"
                        value={customPricingForm.notes}
                        onChange={(e) => setCustomPricingForm({
                          ...customPricingForm, 
                          notes: e.target.value
                        })}
                        placeholder="Additional notes about this custom pricing"
                        rows={2}
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button onClick={handleApplyCustomPricing} size="sm">
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Apply Custom Pricing
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setShowCustomPricing(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateSubscription}
              disabled={!selectedPlanId || isCurrentPlan || subscriptionLoading}
            >
              {subscriptionLoading ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : isCurrentPlan ? (
                'Current Plan'
              ) : subscription ? (
                'Update Plan'
              ) : (
                'Add Plan'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}