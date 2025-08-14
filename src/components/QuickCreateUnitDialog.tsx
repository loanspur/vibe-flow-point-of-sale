import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface QuickCreateUnitDialogProps {
  onUnitCreated: () => void;
}

type Unit = {
  id: string;
  name: string;
  abbreviation: string;
};

export default function QuickCreateUnitDialog({ onUnitCreated }: QuickCreateUnitDialogProps) {
  const { tenantId } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    abbreviation: '',
    is_base_unit: true,
    base_unit_id: '',
    conversion_factor: 1
  });

  const [baseUnits, setBaseUnits] = useState<Unit[]>([]);

  const generateUnitCode = (name: string) => {
    return name.toLowerCase().replace(/\s+/g, '_').substring(0, 10);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId) return;

    setLoading(true);
    
    try {
      const unitData = {
        tenant_id: tenantId,
        name: formData.name,
        abbreviation: formData.abbreviation,
        code: generateUnitCode(formData.name),
        is_base_unit: formData.is_base_unit,
        base_unit_id: formData.is_base_unit ? null : formData.base_unit_id || null,
        conversion_factor: formData.is_base_unit ? 1 : formData.conversion_factor
      };

      const { error } = await supabase
        .from('product_units')
        .insert([unitData]);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Unit created successfully',
      });

      // Reset form
      setFormData({
        name: '',
        abbreviation: '',
        is_base_unit: true,
        base_unit_id: '',
        conversion_factor: 1
      });

      setOpen(false);
      onUnitCreated();
    } catch (error: any) {
      console.error('Error creating unit:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create unit',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchBaseUnits = async () => {
    if (!tenantId) return;

    try {
      // Fetch units directly without complex typing
      const { data, error } = await (supabase as any)
        .from('product_units')
        .select('id, name, abbreviation')
        .eq('tenant_id', tenantId)
        .eq('is_base_unit', true);

      if (error) throw error;
      
      const units = (data || []).map((item: any) => ({
        id: item.id,
        name: item.name,
        abbreviation: item.abbreviation
      }));
      
      setBaseUnits(units);
    } catch (error) {
      console.error('Error fetching base units:', error);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) {
      fetchBaseUnits();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Unit</DialogTitle>
          <DialogDescription>
            Add a new unit of measurement for your products.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Unit Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Kilogram, Meter, Piece"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="abbreviation">Abbreviation</Label>
              <Input
                id="abbreviation"
                value={formData.abbreviation}
                onChange={(e) => setFormData({ ...formData, abbreviation: e.target.value })}
                placeholder="e.g., kg, m, pcs"
                required
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is_base_unit"
                checked={formData.is_base_unit}
                onCheckedChange={(checked) => setFormData({ ...formData, is_base_unit: checked })}
              />
              <Label htmlFor="is_base_unit">Base Unit</Label>
            </div>

            {!formData.is_base_unit && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="base_unit">Base Unit</Label>
                  <Select
                    value={formData.base_unit_id}
                    onValueChange={(value) => setFormData({ ...formData, base_unit_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select base unit" />
                    </SelectTrigger>
                    <SelectContent>
                      {baseUnits.map((unit) => (
                        <SelectItem key={unit.id} value={unit.id}>
                          {unit.name} ({unit.abbreviation})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="conversion_factor">Conversion Factor</Label>
                  <Input
                    id="conversion_factor"
                    type="number"
                    step="0.01"
                    value={formData.conversion_factor}
                    onChange={(e) => setFormData({ ...formData, conversion_factor: Number(e.target.value) })}
                    placeholder="1"
                    required
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Unit'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}