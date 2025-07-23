import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Calculator,
  Plus,
  Edit,
  Trash2,
  MapPin,
  Shield,
  TrendingUp,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useApp } from "@/contexts/AppContext";

interface TaxType {
  id: string;
  name: string;
  description: string;
  type_code: string;
  is_compound: boolean;
  is_inclusive: boolean;
  is_active: boolean;
}

interface TaxJurisdiction {
  id: string;
  name: string;
  jurisdiction_code: string;
  country: string;
  state_province: string;
  city: string;
  postal_code_pattern: string;
  is_active: boolean;
}

interface TaxRate {
  id: string;
  tax_type_id: string;
  jurisdiction_id: string;
  name: string;
  rate_percentage: number;
  effective_date: string;
  expiry_date: string;
  is_active: boolean;
  tax_type?: TaxType;
  jurisdiction?: TaxJurisdiction;
}

interface TaxExemption {
  id: string;
  name: string;
  exemption_code: string;
  description: string;
  exemption_type: string;
  tax_type_id: string;
  exemption_percentage: number;
  effective_date: string;
  expiry_date: string;
  is_active: boolean;
  tax_type?: TaxType;
}

export const TaxManagement = () => {
  const [activeTab, setActiveTab] = useState("rates");
  const [taxTypes, setTaxTypes] = useState<TaxType[]>([]);
  const [taxJurisdictions, setTaxJurisdictions] = useState<TaxJurisdiction[]>([]);
  const [taxRates, setTaxRates] = useState<TaxRate[]>([]);
  const [taxExemptions, setTaxExemptions] = useState<TaxExemption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [tenantId, setTenantId] = useState<string>("");
  const { toast } = useToast();

  useEffect(() => {
    fetchTenantId();
  }, []);

  const fetchTenantId = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      
      const { data: tenantData } = await supabase
        .from('tenant_users')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single();
      
      if (tenantData) {
        setTenantId(tenantData.tenant_id);
        fetchTaxData();
      }
    } catch (error) {
      console.error('Error fetching tenant ID:', error);
      toast({
        title: "Error",
        description: "Failed to load tenant information",
        variant: "destructive",
      });
    }
  };

  const fetchTaxData = async () => {
    if (!tenantId) return;
    
    try {
      setIsLoading(true);
      
      // Fetch all tax-related data
      const [typesResult, jurisdictionsResult, ratesResult, exemptionsResult] = await Promise.all([
        supabase.from('tax_types').select('*').eq('tenant_id', tenantId).order('name'),
        supabase.from('tax_jurisdictions').select('*').eq('tenant_id', tenantId).order('name'),
        supabase.from('tax_rates').select(`
          *,
          tax_type:tax_types(*),
          jurisdiction:tax_jurisdictions(*)
        `).eq('tenant_id', tenantId).order('name'),
        supabase.from('tax_exemptions').select(`
          *,
          tax_type:tax_types(*)
        `).eq('tenant_id', tenantId).order('name')
      ]);

      if (typesResult.data) setTaxTypes(typesResult.data);
      if (jurisdictionsResult.data) setTaxJurisdictions(jurisdictionsResult.data);
      if (ratesResult.data) setTaxRates(ratesResult.data);
      if (exemptionsResult.data) setTaxExemptions(exemptionsResult.data);

    } catch (error) {
      console.error('Error fetching tax data:', error);
      toast({
        title: "Error",
        description: "Failed to load tax data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveTaxRate = async () => {
    try {
      if (!editingItem?.name || !editingItem?.tax_type_id || !editingItem?.rate_percentage) {
        toast({
          title: "Validation Error",
          description: "Please fill in all required fields",
          variant: "destructive",
        });
        return;
      }

      const saveData = {
        name: editingItem.name,
        tax_type_id: editingItem.tax_type_id,
        jurisdiction_id: editingItem.jurisdiction_id || null,
        rate_percentage: editingItem.rate_percentage,
        effective_date: editingItem.effective_date || new Date().toISOString().split('T')[0],
        expiry_date: editingItem.expiry_date || null,
        is_active: editingItem.is_active ?? true,
        tenant_id: tenantId
      };

      if (editingItem?.id) {
        const { error } = await supabase
          .from('tax_rates')
          .update(saveData)
          .eq('id', editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('tax_rates')
          .insert(saveData);
        if (error) throw error;
      }
      
      await fetchTaxData();
      setIsDialogOpen(false);
      setEditingItem(null);
      
      toast({
        title: "Success",
        description: `Tax rate ${editingItem?.id ? 'updated' : 'created'} successfully`,
      });
    } catch (error) {
      console.error('Error saving tax rate:', error);
      toast({
        title: "Error",
        description: "Failed to save tax rate",
        variant: "destructive",
      });
    }
  };

  const saveTaxType = async () => {
    try {
      if (!editingItem?.name || !editingItem?.type_code) {
        toast({
          title: "Validation Error",
          description: "Please fill in all required fields",
          variant: "destructive",
        });
        return;
      }

      const saveData = {
        name: editingItem.name,
        description: editingItem.description || null,
        type_code: editingItem.type_code,
        is_compound: editingItem.is_compound ?? false,
        is_inclusive: editingItem.is_inclusive ?? false,
        is_active: editingItem.is_active ?? true,
        tenant_id: tenantId
      };

      if (editingItem?.id) {
        const { error } = await supabase
          .from('tax_types')
          .update(saveData)
          .eq('id', editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('tax_types')
          .insert(saveData);
        if (error) throw error;
      }
      
      await fetchTaxData();
      setIsDialogOpen(false);
      setEditingItem(null);
      
      toast({
        title: "Success",
        description: `Tax type ${editingItem?.id ? 'updated' : 'created'} successfully`,
      });
    } catch (error) {
      console.error('Error saving tax type:', error);
      toast({
        title: "Error",
        description: "Failed to save tax type",
        variant: "destructive",
      });
    }
  };

  const deleteItem = async (table: 'tax_rates' | 'tax_types' | 'tax_jurisdictions' | 'tax_exemptions', id: string) => {
    try {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      await fetchTaxData();
      toast({
        title: "Success",
        description: "Item deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting item:', error);
      toast({
        title: "Error",
        description: "Failed to delete item",
        variant: "destructive",
      });
    }
  };

  const TaxRateForm = () => (
    <div className="space-y-4">
      <div>
        <Label>Rate Name *</Label>
        <Input 
          value={editingItem?.name || ""} 
          onChange={(e) => setEditingItem({...editingItem, name: e.target.value})}
          placeholder="Enter rate name"
        />
      </div>
      <div>
        <Label>Tax Type *</Label>
        <Select 
          value={editingItem?.tax_type_id || ""} 
          onValueChange={(value) => setEditingItem({...editingItem, tax_type_id: value})}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select tax type" />
          </SelectTrigger>
          <SelectContent>
            {taxTypes.map((type) => (
              <SelectItem key={type.id} value={type.id}>
                {type.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Jurisdiction (Optional)</Label>
        <Select 
          value={editingItem?.jurisdiction_id || ""} 
          onValueChange={(value) => setEditingItem({...editingItem, jurisdiction_id: value})}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select jurisdiction (optional)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Jurisdictions</SelectItem>
            {taxJurisdictions.map((jurisdiction) => (
              <SelectItem key={jurisdiction.id} value={jurisdiction.id}>
                {jurisdiction.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Rate Percentage *</Label>
        <Input 
          type="number"
          step="0.0001"
          min="0"
          max="100"
          value={editingItem?.rate_percentage || ""} 
          onChange={(e) => setEditingItem({...editingItem, rate_percentage: parseFloat(e.target.value) || 0})}
          placeholder="0.00"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Effective Date</Label>
          <Input 
            type="date"
            value={editingItem?.effective_date || ""} 
            onChange={(e) => setEditingItem({...editingItem, effective_date: e.target.value})}
          />
        </div>
        <div>
          <Label>Expiry Date (Optional)</Label>
          <Input 
            type="date"
            value={editingItem?.expiry_date || ""} 
            onChange={(e) => setEditingItem({...editingItem, expiry_date: e.target.value})}
          />
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <Switch 
          checked={editingItem?.is_active ?? true}
          onCheckedChange={(checked) => setEditingItem({...editingItem, is_active: checked})}
        />
        <Label>Active</Label>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
          Cancel
        </Button>
        <Button onClick={saveTaxRate}>
          {editingItem?.id ? 'Update' : 'Create'} Tax Rate
        </Button>
      </div>
    </div>
  );

  const TaxTypeForm = () => (
    <div className="space-y-4">
      <div>
        <Label>Type Name *</Label>
        <Input 
          value={editingItem?.name || ""} 
          onChange={(e) => setEditingItem({...editingItem, name: e.target.value})}
          placeholder="e.g., Sales Tax, VAT, GST"
        />
      </div>
      <div>
        <Label>Type Code *</Label>
        <Input 
          value={editingItem?.type_code || ""} 
          onChange={(e) => setEditingItem({...editingItem, type_code: e.target.value})}
          placeholder="e.g., sales_tax, vat, gst"
        />
      </div>
      <div>
        <Label>Description</Label>
        <Input 
          value={editingItem?.description || ""} 
          onChange={(e) => setEditingItem({...editingItem, description: e.target.value})}
          placeholder="Enter description"
        />
      </div>
      <div className="flex items-center space-x-2">
        <Switch 
          checked={editingItem?.is_compound ?? false}
          onCheckedChange={(checked) => setEditingItem({...editingItem, is_compound: checked})}
        />
        <Label>Compound Tax (applied on top of other taxes)</Label>
      </div>
      <div className="flex items-center space-x-2">
        <Switch 
          checked={editingItem?.is_inclusive ?? false}
          onCheckedChange={(checked) => setEditingItem({...editingItem, is_inclusive: checked})}
        />
        <Label>Tax Inclusive (included in price)</Label>
      </div>
      <div className="flex items-center space-x-2">
        <Switch 
          checked={editingItem?.is_active ?? true}
          onCheckedChange={(checked) => setEditingItem({...editingItem, is_active: checked})}
        />
        <Label>Active</Label>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
          Cancel
        </Button>
        <Button onClick={saveTaxType}>
          {editingItem?.id ? 'Update' : 'Create'} Tax Type
        </Button>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Calculator className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p>Loading tax management...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Tax Management</h1>
          <p className="text-muted-foreground">
            Manage tax types, rates, jurisdictions, and exemptions
          </p>
        </div>
      </div>

      {/* Tax Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tax Types</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{taxTypes.length}</div>
            <p className="text-xs text-muted-foreground">
              {taxTypes.filter(t => t.is_active).length} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Jurisdictions</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{taxJurisdictions.length}</div>
            <p className="text-xs text-muted-foreground">
              {taxJurisdictions.filter(j => j.is_active).length} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tax Rates</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{taxRates.length}</div>
            <p className="text-xs text-muted-foreground">
              {taxRates.filter(r => r.is_active).length} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Exemptions</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{taxExemptions.length}</div>
            <p className="text-xs text-muted-foreground">
              {taxExemptions.filter(e => e.is_active).length} active
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="rates">Tax Rates</TabsTrigger>
          <TabsTrigger value="types">Tax Types</TabsTrigger>
          <TabsTrigger value="jurisdictions">Jurisdictions</TabsTrigger>
          <TabsTrigger value="exemptions">Exemptions</TabsTrigger>
        </TabsList>

        {/* Tax Rates Tab */}
        <TabsContent value="rates" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Tax Rates</h2>
            <Button 
              onClick={() => {
                setEditingItem({});
                setIsDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Tax Rate
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-4">Name</th>
                      <th className="text-left p-4">Type</th>
                      <th className="text-left p-4">Jurisdiction</th>
                      <th className="text-left p-4">Rate</th>
                      <th className="text-left p-4">Effective</th>
                      <th className="text-left p-4">Status</th>
                      <th className="text-left p-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {taxRates.map((rate) => (
                      <tr key={rate.id} className="border-b">
                        <td className="p-4 font-medium">{rate.name}</td>
                        <td className="p-4">{rate.tax_type?.name}</td>
                        <td className="p-4">{rate.jurisdiction?.name || 'All'}</td>
                        <td className="p-4">{rate.rate_percentage}%</td>
                        <td className="p-4">{new Date(rate.effective_date).toLocaleDateString()}</td>
                        <td className="p-4">
                          <Badge variant={rate.is_active ? "default" : "secondary"}>
                            {rate.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => {
                                setEditingItem(rate);
                                setIsDialogOpen(true);
                              }}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => deleteItem('tax_rates', rate.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tax Types Tab */}
        <TabsContent value="types" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Tax Types</h2>
            <Button 
              onClick={() => {
                setEditingItem({});
                setActiveTab("types");
                setIsDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Tax Type
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-4">Name</th>
                      <th className="text-left p-4">Code</th>
                      <th className="text-left p-4">Description</th>
                      <th className="text-left p-4">Type</th>
                      <th className="text-left p-4">Status</th>
                      <th className="text-left p-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {taxTypes.map((type) => (
                      <tr key={type.id} className="border-b">
                        <td className="p-4 font-medium">{type.name}</td>
                        <td className="p-4">{type.type_code}</td>
                        <td className="p-4">{type.description || '-'}</td>
                        <td className="p-4">
                          <div className="flex gap-1">
                            {type.is_compound && <Badge variant="outline">Compound</Badge>}
                            {type.is_inclusive && <Badge variant="outline">Inclusive</Badge>}
                          </div>
                        </td>
                        <td className="p-4">
                          <Badge variant={type.is_active ? "default" : "secondary"}>
                            {type.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => {
                                setEditingItem(type);
                                setActiveTab("types");
                                setIsDialogOpen(true);
                              }}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => deleteItem('tax_types', type.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Placeholder tabs */}
        <TabsContent value="jurisdictions">
          <div className="text-center py-8">
            <p className="text-muted-foreground">Jurisdictions management coming soon...</p>
          </div>
        </TabsContent>

        <TabsContent value="exemptions">
          <div className="text-center py-8">
            <p className="text-muted-foreground">Tax exemptions management coming soon...</p>
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialog for creating/editing */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingItem?.id ? 'Edit' : 'Create'} {activeTab === "types" ? "Tax Type" : "Tax Rate"}
            </DialogTitle>
          </DialogHeader>
          {activeTab === "types" ? <TaxTypeForm /> : <TaxRateForm />}
        </DialogContent>
      </Dialog>
    </div>
  );
};