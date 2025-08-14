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
import { Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface QuickCreateUnitDialogProps {
  onUnitCreated: () => void;
}


export default function QuickCreateUnitDialog({ onUnitCreated }: QuickCreateUnitDialogProps) {
  const { tenantId } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    abbreviation: ''
  });

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
        is_base_unit: true,
        base_unit_id: null,
        conversion_factor: 1
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
        abbreviation: ''
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

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
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