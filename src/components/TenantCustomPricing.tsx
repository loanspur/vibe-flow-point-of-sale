import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Edit, Trash2, Plus, CheckCircle, AlertTriangle, Percent } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useCurrencyUpdate } from "@/hooks/useCurrencyUpdate";

interface TenantCustomPricing {
  id: string;
  tenant_id: string;
  billing_plan_id: string;
  custom_amount: number;
  original_amount: number;
  discount_percentage?: number;
  reason?: string;
  setup_fee?: number;
  effective_date: string;
  expires_at?: string;
  is_active: boolean;
  created_by: string;
  approved_by?: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
  billing_plans?: {
    name: string;
    price: number;
  };
}

interface BillingPlan {
  id: string;
  name: string;
  price: number;
}

interface TenantCustomPricingProps {
  tenantId?: string;
  tenantName?: string;
}

export default function TenantCustomPricing({ tenantId, tenantName }: TenantCustomPricingProps = {}) {
  const [customPricingList, setCustomPricingList] = useState<TenantCustomPricing[]>([]);
  const [billingPlans, setBillingPlans] = useState<BillingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedPricing, setSelectedPricing] = useState<TenantCustomPricing | null>(null);
  const { toast } = useToast();
  const { formatPrice } = useCurrencyUpdate();

  // Form state
  const [formData, setFormData] = useState({
    billing_plan_id: "",
    custom_amount: "",
    discount_percentage: "",
    reason: "",
    setup_fee: "",
    effective_date: new Date(),
    expires_at: undefined as Date | undefined,
    is_active: true
  });

  useEffect(() => {
    if (tenantId) {
      fetchData();
    }
  }, [tenantId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchCustomPricing(),
        fetchBillingPlans()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomPricing = async () => {
    if (!tenantId) return;
    
    try {
      const { data, error } = await supabase
        .from('tenant_custom_pricing')
        .select(`
          *,
          billing_plans (name, price)
        `)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCustomPricingList(data || []);
    } catch (error) {
      console.error('Error fetching custom pricing:', error);
      toast({
        title: "Error",
        description: "Failed to fetch custom pricing data.",
        variant: "destructive"
      });
    }
  };

  const fetchBillingPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('billing_plans')
        .select('id, name, price')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setBillingPlans(data || []);
    } catch (error) {
      console.error('Error fetching billing plans:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!tenantId) {
      toast({
        title: "Error",
        description: "Tenant ID is required.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      const selectedPlan = billingPlans.find(p => p.id === formData.billing_plan_id);
      if (!selectedPlan) {
        toast({
          title: "Error",
          description: "Please select a billing plan.",
          variant: "destructive"
        });
        return;
      }

      const customAmount = parseFloat(formData.custom_amount);
      const originalAmount = selectedPlan.price;
      const discountPercentage = formData.discount_percentage 
        ? parseFloat(formData.discount_percentage)
        : ((originalAmount - customAmount) / originalAmount) * 100;

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('User not authenticated');

      const pricingData = {
        tenant_id: tenantId,
        billing_plan_id: formData.billing_plan_id,
        custom_amount: customAmount,
        original_amount: originalAmount,
        discount_percentage: discountPercentage,
        reason: formData.reason,
        setup_fee: formData.setup_fee ? parseFloat(formData.setup_fee) : null,
        effective_date: format(formData.effective_date, 'yyyy-MM-dd'),
        expires_at: formData.expires_at ? format(formData.expires_at, 'yyyy-MM-dd') : null,
        is_active: formData.is_active,
        created_by: userData.user.id,
        approved_by: userData.user.id,
        approved_at: new Date().toISOString()
      };

      if (selectedPricing) {
        // Update existing
        const { error } = await supabase
          .from('tenant_custom_pricing')
          .update(pricingData)
          .eq('id', selectedPricing.id);

        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabase
          .from('tenant_custom_pricing')
          .insert([pricingData]);

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: `Custom pricing ${selectedPricing ? 'updated' : 'created'} successfully.`
      });
      setIsDialogOpen(false);
      resetForm();
      await fetchCustomPricing();
    } catch (error: any) {
      console.error('Error saving custom pricing:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save custom pricing.",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (pricing: TenantCustomPricing) => {
    setSelectedPricing(pricing);
    setFormData({
      billing_plan_id: pricing.billing_plan_id,
      custom_amount: pricing.custom_amount.toString(),
      discount_percentage: pricing.discount_percentage?.toString() || "",
      reason: pricing.reason || "",
      setup_fee: pricing.setup_fee?.toString() || "",
      effective_date: new Date(pricing.effective_date),
      expires_at: pricing.expires_at ? new Date(pricing.expires_at) : undefined,
      is_active: pricing.is_active
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('tenant_custom_pricing')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Custom pricing deleted successfully."
      });
      await fetchCustomPricing();
    } catch (error: any) {
      console.error('Error deleting custom pricing:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete custom pricing.",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setFormData({
      billing_plan_id: "",
      custom_amount: "",
      discount_percentage: "",
      reason: "",
      setup_fee: "",
      effective_date: new Date(),
      expires_at: undefined,
      is_active: true
    });
    setSelectedPricing(null);
  };

  const PricingForm = () => (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-foreground">Custom Pricing for {tenantName}</h3>
        <p className="text-muted-foreground">Configure special pricing for this tenant</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="billing_plan">Billing Plan</Label>
        <Select 
          value={formData.billing_plan_id} 
          onValueChange={(value) => setFormData({...formData, billing_plan_id: value})}
          required
        >
          <SelectTrigger>
            <SelectValue placeholder="Select billing plan" />
          </SelectTrigger>
          <SelectContent>
            {billingPlans.map(plan => (
              <SelectItem key={plan.id} value={plan.id}>
                {plan.name} - {formatPrice(plan.price)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="custom_amount">Custom Amount</Label>
          <Input
            id="custom_amount"
            type="number"
            step="0.01"
            min="0"
            value={formData.custom_amount}
            onChange={(e) => {
              const value = e.target.value;
              setFormData(prev => ({
                ...prev, 
                custom_amount: value
              }));
              
              // Auto-calculate discount percentage
              const selectedPlan = billingPlans.find(p => p.id === formData.billing_plan_id);
              if (selectedPlan && value && !isNaN(parseFloat(value))) {
                const customAmount = parseFloat(value);
                const discountPercentage = ((selectedPlan.price - customAmount) / selectedPlan.price) * 100;
                setFormData(prev => ({
                  ...prev,
                  discount_percentage: discountPercentage > 0 ? discountPercentage.toFixed(2) : ""
                }));
              }
            }}
            placeholder="Enter custom amount"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="discount_percentage">Discount %</Label>
          <Input
            id="discount_percentage"
            type="number"
            step="0.01"
            min="0"
            max="100"
            value={formData.discount_percentage}
            onChange={(e) => {
              const value = e.target.value;
              setFormData(prev => ({
                ...prev,
                discount_percentage: value
              }));
              
              // Auto-calculate custom amount
              const selectedPlan = billingPlans.find(p => p.id === formData.billing_plan_id);
              if (selectedPlan && value && !isNaN(parseFloat(value))) {
                const discountPercentage = parseFloat(value);
                const customAmount = selectedPlan.price * (1 - discountPercentage / 100);
                setFormData(prev => ({
                  ...prev,
                  custom_amount: customAmount > 0 ? customAmount.toFixed(2) : ""
                }));
              }
            }}
            placeholder="Discount percentage"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="setup_fee">Setup Fee</Label>
          <Input
            id="setup_fee"
            type="number"
            step="0.01"
            min="0"
            value={formData.setup_fee}
            onChange={(e) => {
              const value = e.target.value;
              setFormData(prev => ({
                ...prev,
                setup_fee: value
              }));
            }}
            placeholder="One-time setup fee"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="reason">Reason</Label>
        <Input
          id="reason"
          type="text"
          value={formData.reason}
          onChange={(e) => {
            setFormData(prev => ({
              ...prev,
              reason: e.target.value
            }));
          }}
          placeholder="Reason for custom pricing"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Effective Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-full justify-start text-left font-normal")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(formData.effective_date, "PPP")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={formData.effective_date}
                onSelect={(date) => date && setFormData({...formData, effective_date: date})}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <Label>Expires At (Optional)</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-full justify-start text-left font-normal")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formData.expires_at ? format(formData.expires_at, "PPP") : "No expiry"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={formData.expires_at}
                onSelect={(date) => setFormData({...formData, expires_at: date})}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="is_active"
          checked={formData.is_active}
          onCheckedChange={(checked) => setFormData({...formData, is_active: checked})}
        />
        <Label htmlFor="is_active">Active</Label>
      </div>

      <div className="flex justify-end space-x-2">
        <Button 
          type="button" 
          variant="outline" 
          onClick={() => {
            setIsDialogOpen(false);
            resetForm();
          }}
        >
          Cancel
        </Button>
        <Button type="submit">
          {selectedPricing ? "Update" : "Create"} Custom Pricing
        </Button>
      </div>
    </form>
  );

  if (!tenantId) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Please select a tenant to view custom pricing.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Custom Pricing for {tenantName}</h2>
          <p className="text-muted-foreground">Manage custom pricing overrides for this tenant</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Add Custom Pricing
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedPricing ? "Edit" : "Create"} Custom Pricing
              </DialogTitle>
              <DialogDescription>
                {selectedPricing 
                  ? "Update the custom pricing override for this tenant and billing plan."
                  : "Set a custom pricing override for a specific tenant and billing plan."
                }
              </DialogDescription>
            </DialogHeader>
            <PricingForm />
          </DialogContent>
        </Dialog>
      </div>

      {/* Custom Pricing Table */}
      <Card>
        <CardHeader>
          <CardTitle>Custom Pricing Overrides</CardTitle>
          <CardDescription>
            {customPricingList.length} custom pricing override{customPricingList.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plan</TableHead>
                  <TableHead>Original Price</TableHead>
                  <TableHead>Custom Price</TableHead>
                  <TableHead>Setup Fee</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Effective Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customPricingList.map((pricing) => (
                  <TableRow key={pricing.id}>
                    <TableCell>{pricing.billing_plans?.name}</TableCell>
                    <TableCell>{formatPrice(pricing.original_amount)}</TableCell>
                    <TableCell className="font-medium">
                      {formatPrice(pricing.custom_amount)}
                    </TableCell>
                    <TableCell>
                      {pricing.setup_fee ? formatPrice(pricing.setup_fee) : '-'}
                    </TableCell>
                    <TableCell>
                      {pricing.discount_percentage && (
                        <Badge variant="outline" className="text-green-600">
                          <Percent className="h-3 w-3 mr-1" />
                          {pricing.discount_percentage.toFixed(1)}%
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={pricing.is_active ? "default" : "secondary"}>
                        {pricing.is_active ? (
                          <CheckCircle className="h-3 w-3 mr-1" />
                        ) : (
                          <AlertTriangle className="h-3 w-3 mr-1" />
                        )}
                        {pricing.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>{format(new Date(pricing.effective_date), "PPP")}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(pricing)}>
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleDelete(pricing.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {customPricingList.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No custom pricing overrides found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}