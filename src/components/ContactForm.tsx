import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { User, Building } from 'lucide-react';

interface ContactFormProps {
  contact?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function ContactForm({ contact, onSuccess, onCancel }: ContactFormProps) {
  const { tenantId } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    type: 'customer',
    email: '',
    phone: '',
    address: '',
    company: '',
    notes: '',
    is_active: true,
  });

  useEffect(() => {
    if (contact) {
      setFormData({
        name: contact.name || '',
        type: contact.type || 'customer',
        email: contact.email || '',
        phone: contact.phone || '',
        address: contact.address || '',
        company: contact.company || '',
        notes: contact.notes || '',
        is_active: contact.is_active ?? true,
      });
    }
  }, [contact]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const contactData = {
        name: formData.name,
        type: formData.type,
        email: formData.email || null,
        phone: formData.phone || null,
        address: formData.address || null,
        company: formData.company || null,
        notes: formData.notes || null,
        is_active: formData.is_active,
        tenant_id: tenantId,
      };

      let error;
      if (contact) {
        ({ error } = await supabase
          .from('contacts')
          .update(contactData)
          .eq('id', contact.id));
      } else {
        ({ error } = await supabase
          .from('contacts')
          .insert([contactData]));
      }

      if (error) throw error;

      toast({
        title: contact ? "Contact updated" : "Contact created",
        description: `${formData.name} has been ${contact ? 'updated' : 'created'} successfully.`,
      });

      onSuccess();
    } catch (error: any) {
      toast({
        title: `Error ${contact ? 'updating' : 'creating'} contact`,
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {formData.type === 'customer' ? <User className="w-5 h-5" /> : <Building className="w-5 h-5" />}
            Contact Information
          </CardTitle>
          <CardDescription>
            {formData.type === 'customer' ? 'Customer' : 'Supplier'} details
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Contact Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter contact name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Type *</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => handleInputChange('type', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="customer">Customer</SelectItem>
                  <SelectItem value="supplier">Supplier</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="contact@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="Phone number"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="company">Company</Label>
            <Input
              id="company"
              value={formData.company}
              onChange={(e) => handleInputChange('company', e.target.value)}
              placeholder="Company name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              placeholder="Full address"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Additional notes"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Status */}
      <Card>
        <CardHeader>
          <CardTitle>Status</CardTitle>
          <CardDescription>Contact availability</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => handleInputChange('is_active', checked)}
            />
            <Label htmlFor="is_active">Active contact</Label>
          </div>
        </CardContent>
      </Card>

      {/* Form Actions */}
      <div className="flex justify-end space-x-2 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading || !formData.name}>
          {loading ? 'Saving...' : contact ? 'Update Contact' : 'Create Contact'}
        </Button>
      </div>
    </form>
  );
}