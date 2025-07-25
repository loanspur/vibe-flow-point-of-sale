import React, { useState, useEffect, useCallback, useMemo } from 'react';
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

interface FormData {
  name: string;
  type: string;
  email: string;
  phone: string;
  address: string;
  company: string;
  notes: string;
  is_active: boolean;
}

// Memoized form field component
const FormField = React.memo<{
  label: string;
  children: React.ReactNode;
  required?: boolean;
}>(({ label, children, required = false }) => (
  <div className="space-y-2">
    <Label htmlFor={label.toLowerCase().replace(/\s+/g, '_')}>
      {label} {required && '*'}
    </Label>
    {children}
  </div>
));

// Memoized card section component
const FormSection = React.memo<{
  title: string;
  description?: string;
  icon?: React.ComponentType<any>;
  children: React.ReactNode;
}>(({ title, description, icon: Icon, children }) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        {Icon && <Icon className="w-5 h-5" />}
        {title}
      </CardTitle>
      {description && <CardDescription>{description}</CardDescription>}
    </CardHeader>
    <CardContent className="space-y-4">
      {children}
    </CardContent>
  </Card>
));

export const ContactFormOptimized = React.memo<ContactFormProps>(({ contact, onSuccess, onCancel }) => {
  const { tenantId } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState<FormData>({
    name: '',
    type: 'customer',
    email: '',
    phone: '',
    address: '',
    company: '',
    notes: '',
    is_active: true,
  });

  // Memoized initial form data based on contact
  const initialFormData = useMemo(() => ({
    name: contact?.name || '',
    type: contact?.type || 'customer',
    email: contact?.email || '',
    phone: contact?.phone || '',
    address: contact?.address || '',
    company: contact?.company || '',
    notes: contact?.notes || '',
    is_active: contact?.is_active ?? true,
  }), [contact]);

  useEffect(() => {
    setFormData(initialFormData);
  }, [initialFormData]);

  const handleInputChange = useCallback((field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
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
  }, [formData, contact, tenantId, toast, onSuccess]);

  // Memoized form validation
  const isFormValid = useMemo(() => {
    return formData.name.trim() !== '';
  }, [formData.name]);

  // Memoized icon component based on type
  const TypeIcon = useMemo(() => {
    return formData.type === 'customer' ? User : Building;
  }, [formData.type]);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <FormSection
        title="Contact Information"
        description={`${formData.type === 'customer' ? 'Customer' : 'Supplier'} details`}
        icon={TypeIcon}
      >
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Contact Name" required>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Enter contact name"
              required
            />
          </FormField>
          
          <FormField label="Type" required>
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
          </FormField>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Email">
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="contact@example.com"
            />
          </FormField>
          
          <FormField label="Phone">
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              placeholder="Phone number"
            />
          </FormField>
        </div>

        <FormField label="Company">
          <Input
            id="company"
            value={formData.company}
            onChange={(e) => handleInputChange('company', e.target.value)}
            placeholder="Company name"
          />
        </FormField>

        <FormField label="Address">
          <Textarea
            id="address"
            value={formData.address}
            onChange={(e) => handleInputChange('address', e.target.value)}
            placeholder="Full address"
            rows={2}
          />
        </FormField>

        <FormField label="Notes">
          <Textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            placeholder="Additional notes"
            rows={3}
          />
        </FormField>
      </FormSection>

      {/* Status */}
      <FormSection title="Status" description="Contact availability">
        <div className="flex items-center space-x-2">
          <Switch
            id="is_active"
            checked={formData.is_active}
            onCheckedChange={(checked) => handleInputChange('is_active', checked)}
          />
          <Label htmlFor="is_active">Active contact</Label>
        </div>
      </FormSection>

      {/* Form Actions */}
      <div className="flex justify-end space-x-2 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading || !isFormValid}>
          {loading ? 'Saving...' : contact ? 'Update Contact' : 'Create Contact'}
        </Button>
      </div>
    </form>
  );
});

export default ContactFormOptimized;