import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useDeletionControl } from '@/hooks/useDeletionControl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

import { Users, UserPlus, Link, Edit, Trash2, Phone, Mail, MapPin, Plus, UserCheck, Building, Eye, FileText, MoreHorizontal, ArrowUpDown, Filter, Truck } from 'lucide-react';
import ContactDetails from './ContactDetails';
import { CustomerStatement } from './CustomerStatement';
import { useApp } from '@/contexts/AppContext';

interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  address: string;
  shipping_address?: string;
  type: string;
  notes: string;
  is_active: boolean;
  user_id: string | null;
  tenant_id: string;
  created_at: string;
  is_commission_agent: boolean;
  is_reseller: boolean;
  credit_limit: number | null;
  current_credit_balance: number | null;
  // Shipping agent specific fields
  shipping_fee?: number;
  shipping_zones?: string[];
  shipping_documents?: any;
}

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string;
  role: string;
}

const CONTACT_TYPES = [
  { value: 'customer', label: 'Customer', icon: Users },
  { value: 'supplier', label: 'Supplier', icon: Building },
  { value: 'sales_rep', label: 'Sales Representative', icon: UserCheck },
  { value: 'vendor', label: 'Vendor', icon: Building },
  { value: 'partner', label: 'Partner', icon: Users },
  { value: 'shipping_agent', label: 'Shipping Agent', icon: Truck }
];

const ContactManagement = () => {
  const { tenantId, userRole, user } = useAuth();
  const { toast } = useToast();
  const { canDelete, logDeletionAttempt } = useDeletionControl();
  const { formatCurrency } = useApp();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [isContactDetailsOpen, setIsContactDetailsOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isStatementOpen, setIsStatementOpen] = useState(false);
  const [statementCustomerId, setStatementCustomerId] = useState<string | undefined>();
  
  // Table states for each contact type
  const [sortField, setSortField] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCompany, setFilterCompany] = useState<string>('');
  
  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    address: '',
    shipping_address: '',
    type: 'customer',
    notes: '',
    is_commission_agent: false,
    is_reseller: false,
    credit_limit: 0,
    // Shipping agent specific fields
    shipping_fee: 0,
    shipping_zones: [] as string[],
    shipping_documents: {}
  });

  useEffect(() => {
    if (tenantId) {
      fetchContacts();
      fetchUsers();
    }
  }, [tenantId]);

  const fetchContacts = async () => {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select(`
          *
        `)
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setContacts(data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load contacts",
        variant: "destructive",
      });
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_id, full_name, role')
        .eq('tenant_id', tenantId);

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };



  const createContact = async () => {
    if (!formData.name.trim() || !formData.type) {
      toast({
        title: "Error",
        description: "Name and type are required",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('contacts')
        .insert({
          ...formData,
          tenant_id: tenantId,
          is_active: true
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Contact created successfully",
      });
      setFormData({
        name: '',
        email: '',
        phone: '',
        company: '',
        address: '',
        shipping_address: '',
        type: 'customer',
        notes: '',
        is_commission_agent: false,
        is_reseller: false,
        credit_limit: 0,
        // Shipping agent specific fields
        shipping_fee: 0,
        shipping_zones: [] as string[],
        shipping_documents: {}
      });
      setIsCreateOpen(false);
      fetchContacts();
    } catch (error: any) {
      console.error('Error creating contact:', error);
      if (error.code === '23505' && error.constraint === 'unique_email_per_tenant') {
        toast({
          title: "Error",
          description: "A contact with this email already exists",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to create contact",
          variant: "destructive",
        });
      }
    }
  };

  const updateContact = async () => {
    if (!editingContact || !formData.name.trim()) {
      toast({
        title: "Error",
        description: "Name is required",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('contacts')
        .update(formData)
        .eq('id', editingContact.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Contact updated successfully",
      });
      setIsEditOpen(false);
      setEditingContact(null);
      fetchContacts();
    } catch (error: any) {
      console.error('Error updating contact:', error);
      if (error.code === '23505' && error.constraint === 'unique_email_per_tenant') {
        toast({
          title: "Error",
          description: "A contact with this email already exists",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to update contact",
          variant: "destructive",
        });
      }
    }
  };

  const deleteContact = async (contactId: string) => {
    const contact = contacts.find(c => c.id === contactId);
    
    if (!canDelete('contact')) {
      logDeletionAttempt('contact', contactId, contact?.name);
      toast({
        title: "Deletion Disabled",
        description: "Contact deletion has been disabled to maintain audit trail and data integrity.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('contacts')
        .update({ is_active: false })
        .eq('id', contactId);

      if (error) throw error;

      toast({
        title: "Contact deactivated",
        description: "Contact has been deactivated successfully.",
      });
      fetchContacts();
    } catch (error) {
      console.error('Error deleting contact:', error);
      toast({
        title: "Error",
        description: "Failed to deactivate contact.",
        variant: "destructive",
      });
    }
  };

  const openCustomerStatement = (contactId: string) => {
    setStatementCustomerId(contactId);
    setIsStatementOpen(true);
  };

  const linkUserToContact = async (contactId: string) => {
    try {
      const { data, error } = await supabase.rpc('link_user_to_contact', {
        contact_id: contactId
      });

      if (error) throw error;

      if (data) {
        toast({
          title: "Success",
          description: "Successfully linked to your profile",
        });
        fetchContacts();
      } else {
        toast({
          title: "Error",
          description: "Failed to link contact - it may already be linked to another user",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error linking contact:', error);
      toast({
        title: "Error",
        description: "Failed to link contact to profile",
        variant: "destructive",
      });
    }
  };

  const unlinkUserFromContact = async (contactId: string) => {
    try {
      const { error } = await supabase
        .from('contacts')
        .update({ user_id: null })
        .eq('id', contactId)
        .eq('user_id', user?.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Contact unlinked from your profile",
      });
      fetchContacts();
    } catch (error) {
      console.error('Error unlinking contact:', error);
      toast({
        title: "Error",
        description: "Failed to unlink contact",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (contact: Contact) => {
    setEditingContact(contact);
    setFormData({
      name: contact.name,
      email: contact.email || '',
      phone: contact.phone || '',
      company: contact.company || '',
      address: contact.address || '',
      shipping_address: contact.shipping_address || '',
      type: contact.type,
      notes: contact.notes || '',
      is_commission_agent: contact.is_commission_agent || false,
      is_reseller: contact.is_reseller || false,
      credit_limit: contact.credit_limit || 0,
      // Shipping agent specific fields
      shipping_fee: contact.shipping_fee || 0,
      shipping_zones: contact.shipping_zones || [],
      shipping_documents: contact.shipping_documents || {}
    });
    setIsEditOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      company: '',
      address: '',
      shipping_address: '',
      type: 'customer',
      notes: '',
      is_commission_agent: false,
      is_reseller: false,
      credit_limit: 0,
      // Shipping agent specific fields
      shipping_fee: 0,
      shipping_zones: [] as string[],
      shipping_documents: {}
    });
  };

  // Sorting function
  const sortContacts = (contacts: Contact[]) => {
    return contacts.sort((a, b) => {
      let aValue = a[sortField as keyof Contact];
      let bValue = b[sortField as keyof Contact];
      
      if (typeof aValue === 'string') aValue = aValue.toLowerCase();
      if (typeof bValue === 'string') bValue = bValue.toLowerCase();
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  };

  // Filtering function
  const filterContacts = (contacts: Contact[]) => {
    return contacts.filter(contact => {
    const matchesSearch = contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         contact.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         contact.company?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'all' || contact.type === selectedType;
      const matchesStatus = filterStatus === 'all' || 
                           (filterStatus === 'linked' && contact.user_id) ||
                           (filterStatus === 'unlinked' && !contact.user_id);
      const matchesCompany = !filterCompany || contact.company?.toLowerCase().includes(filterCompany.toLowerCase());
      
      return matchesSearch && matchesType && matchesStatus && matchesCompany;
    });
  };

  const filteredContacts = filterContacts(contacts);
  const sortedContacts = sortContacts(filteredContacts);

  const getContactsByType = (type: string) => contacts.filter(contact => contact.type === type);
  const customers = getContactsByType('customer');
  const suppliers = getContactsByType('supplier');
  const salesReps = getContactsByType('sales_rep');
  const vendors = getContactsByType('vendor');
  const partners = getContactsByType('partner');
  const shippingAgents = getContactsByType('shipping_agent');
  const linkedSalesReps = salesReps.filter(contact => contact.user_id);
  const unlinkedSalesReps = salesReps.filter(contact => !contact.user_id);

  const getTypeIcon = (type: string) => {
    const contactType = CONTACT_TYPES.find(t => t.value === type);
    const Icon = contactType?.icon || Users;
    return <Icon className="h-4 w-4" />;
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const renderContactTable = (contacts: Contact[], title: string, description: string, showCustomerActions = false, showShippingAgentInfo = false) => (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
            {getTypeIcon(contacts[0]?.type || 'customer')}
            {title}
                </div>
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={resetForm}>
                      <Plus className="h-4 w-4 mr-2" />
                Add {title.slice(0, -1)}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                <DialogTitle>Create New {title.slice(0, -1)}</DialogTitle>
                      <DialogDescription>
                  Add a new {title.slice(0, -1).toLowerCase()} to your directory
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="name">Name *</Label>
                          <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                            placeholder="Contact name"
                          />
                        </div>
                        <div>
                          <Label htmlFor="type">Type *</Label>
                          <Select value={formData.type} onValueChange={(value) => setFormData({...formData, type: value})}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                              {CONTACT_TYPES.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="email">Email</Label>
                          <Input
                            id="email"
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({...formData, email: e.target.value})}
                            placeholder="email@example.com"
                          />
                        </div>
                        <div>
                          <Label htmlFor="phone">Phone</Label>
                          <Input
                            id="phone"
                            value={formData.phone}
                            onChange={(e) => setFormData({...formData, phone: e.target.value})}
                            placeholder="Phone number"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="company">Company</Label>
                          <Input
                            id="company"
                            value={formData.company}
                            onChange={(e) => setFormData({...formData, company: e.target.value})}
                            placeholder="Company name"
                          />
                        </div>
                        <div>
                          <Label htmlFor="address">Address</Label>
                          <Input
                            id="address"
                            value={formData.address}
                            onChange={(e) => setFormData({...formData, address: e.target.value})}
                            placeholder="Address"
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="shipping_address">Shipping Address</Label>
                        <Textarea
                          id="shipping_address"
                          value={formData.shipping_address}
                          onChange={(e) => setFormData({...formData, shipping_address: e.target.value})}
                          placeholder="Shipping address (optional)"
                          rows={3}
                        />
                        <p className="text-sm text-muted-foreground">
                          Separate shipping address for deliveries (optional)
                        </p>
                      </div>
                      <div>
                        <Label htmlFor="notes">Notes</Label>
                        <Textarea
                          id="notes"
                          value={formData.notes}
                          onChange={(e) => setFormData({...formData, notes: e.target.value})}
                          placeholder="Additional notes"
                        />
                      </div>
                
                {/* Customer-specific fields */}
                {formData.type === 'customer' && (
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="is_reseller"
                        checked={formData.is_reseller}
                        onCheckedChange={(checked) => setFormData({...formData, is_reseller: checked})}
                      />
                      <Label htmlFor="is_reseller">Reseller Customer</Label>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Reseller customers are eligible for wholesale pricing on products
                    </p>
                    
                    <div>
                      <Label htmlFor="credit_limit">Credit Limit</Label>
                      <Input
                        id="credit_limit"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.credit_limit}
                        onChange={(e) => setFormData({...formData, credit_limit: parseFloat(e.target.value) || 0})}
                        placeholder="0.00"
                      />
                      <p className="text-sm text-muted-foreground">
                        Maximum credit amount allowed for this customer (in {formatCurrency(0).replace('0.00', '')})
                      </p>
                    </div>
                  </div>
                )}

                {/* Shipping Agent-specific fields */}
                {formData.type === 'shipping_agent' && (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="shipping_fee">Default Shipping Fee</Label>
                      <Input
                        id="shipping_fee"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.shipping_fee}
                        onChange={(e) => setFormData({...formData, shipping_fee: parseFloat(e.target.value) || 0})}
                        placeholder="0.00"
                      />
                      <p className="text-sm text-muted-foreground">
                        Default shipping fee for this agent (in {formatCurrency(0).replace('0.00', '')})
                      </p>
                    </div>
                    
                    <div>
                      <Label htmlFor="shipping_zones">Shipping Zones</Label>
                      <Input
                        id="shipping_zones"
                        value={formData.shipping_zones.join(', ')}
                        onChange={(e) => setFormData({
                          ...formData, 
                          shipping_zones: e.target.value.split(',').map(zone => zone.trim()).filter(zone => zone)
                        })}
                        placeholder="Zone 1, Zone 2, Zone 3"
                      />
                      <p className="text-sm text-muted-foreground">
                        Comma-separated list of shipping zones this agent serves
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="shipping_documents">KYC Documents</Label>
                      <Textarea
                        id="shipping_documents"
                        value={JSON.stringify(formData.shipping_documents, null, 2)}
                        onChange={(e) => {
                          try {
                            const docs = JSON.parse(e.target.value);
                            setFormData({...formData, shipping_documents: docs});
                          } catch (error) {
                            // Keep the current value if JSON is invalid
                          }
                        }}
                        placeholder='{"business_license": "url", "insurance_certificate": "url", "vehicle_registration": "url"}'
                        rows={4}
                      />
                      <p className="text-sm text-muted-foreground">
                        JSON object containing shipping agent documents and credentials
                      </p>
                    </div>
                  </div>
                )}
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={createContact}>Create Contact</Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardTitle>
        <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-6">
                <div className="flex-1">
                  <Input
              placeholder={`Search ${title.toLowerCase()}...`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
          <div className="flex items-center gap-2">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="linked">Linked</SelectItem>
                <SelectItem value="unlinked">Unlinked</SelectItem>
                  </SelectContent>
                </Select>
            <Input
              placeholder="Filter by company..."
              value={filterCompany}
              onChange={(e) => setFilterCompany(e.target.value)}
              className="w-[200px]"
            />
          </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
              <TableHead>
                <Button variant="ghost" onClick={() => handleSort('name')} className="h-8 flex items-center gap-1">
                  Name
                  <ArrowUpDown className="h-4 w-4" />
                </Button>
              </TableHead>
                    <TableHead>Contact Info</TableHead>
              <TableHead>
                <Button variant="ghost" onClick={() => handleSort('company')} className="h-8 flex items-center gap-1">
                  Company
                  <ArrowUpDown className="h-4 w-4" />
                </Button>
              </TableHead>
                            <TableHead>Status</TableHead>
              {showCustomerActions && <TableHead>Customer Info</TableHead>}
              {showShippingAgentInfo && <TableHead>Shipping Agent Info</TableHead>}
              <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
            {contacts.map((contact) => (
                    <TableRow key={contact.id}>
                      <TableCell>
                        <div className="font-medium">{contact.name}</div>
                  <div className="text-sm text-muted-foreground">
                    Created {new Date(contact.created_at).toLocaleDateString()}
                  </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {contact.email && (
                            <div className="flex items-center gap-1 text-sm">
                              <Mail className="h-3 w-3" />
                              {contact.email}
                            </div>
                          )}
                          {contact.phone && (
                            <div className="flex items-center gap-1 text-sm">
                              <Phone className="h-3 w-3" />
                              {contact.phone}
                            </div>
                          )}
                          {contact.address && (
                            <div className="flex items-center gap-1 text-sm">
                              <MapPin className="h-3 w-3" />
                              {contact.address}
                            </div>
                          )}
                          {contact.shipping_address && (
                            <div className="flex items-center gap-1 text-sm">
                              <Truck className="h-3 w-3" />
                              <span className="text-muted-foreground">Shipping:</span> {contact.shipping_address}
                            </div>
                          )}
                        </div>
                      </TableCell>
                <TableCell>
                  <div className="font-medium">{contact.company || '-'}</div>
                </TableCell>
                      <TableCell>
                        {contact.user_id ? (
                          <Badge variant="default">
                            <UserCheck className="h-3 w-3 mr-1" />
                            Linked
                          </Badge>
                        ) : (
                          <Badge variant="outline">Unlinked</Badge>
                        )}
                      </TableCell>
                                {showCustomerActions && (
                  <TableCell>
                    <div className="space-y-1">
                      {contact.is_reseller && (
                        <Badge variant="secondary">Reseller</Badge>
                      )}
                      {contact.credit_limit && contact.credit_limit > 0 && (
                        <div className="text-sm">
                          <span className="text-muted-foreground">Credit Limit:</span> {formatCurrency(contact.credit_limit)}
                        </div>
                      )}
                      {contact.current_credit_balance && contact.current_credit_balance > 0 && (
                        <div className="text-sm">
                          <span className="text-muted-foreground">Balance:</span> {formatCurrency(contact.current_credit_balance)}
                        </div>
                      )}
                    </div>
                  </TableCell>
                )}
                {showShippingAgentInfo && (
                  <TableCell>
                    <div className="space-y-1">
                      {contact.shipping_fee && contact.shipping_fee > 0 && (
                        <div className="text-sm">
                          <span className="text-muted-foreground">Default Fee:</span> {formatCurrency(contact.shipping_fee)}
                        </div>
                      )}
                      {contact.shipping_zones && contact.shipping_zones.length > 0 && (
                        <div className="text-sm">
                          <span className="text-muted-foreground">Zones:</span> {contact.shipping_zones.join(', ')}
                        </div>
                      )}
                      {contact.shipping_documents && Object.keys(contact.shipping_documents).length > 0 && (
                        <div className="text-sm">
                          <span className="text-muted-foreground">Documents:</span> {Object.keys(contact.shipping_documents).length} uploaded
                        </div>
                      )}
                    </div>
                  </TableCell>
                )}
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => {
                                setSelectedContact(contact);
                                setIsContactDetailsOpen(true);
                      }}>
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </DropdownMenuItem>
                      {showCustomerActions && (
                        <DropdownMenuItem onClick={() => openCustomerStatement(contact.id)}>
                          <FileText className="h-4 w-4 mr-2" />
                          View Statement
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => openEditDialog(contact)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                          {contact.type === 'sales_rep' && !contact.user_id && (
                        <DropdownMenuItem onClick={() => linkUserToContact(contact.id)}>
                          <Link className="h-4 w-4 mr-2" />
                          Link to Profile
                        </DropdownMenuItem>
                          )}
                          {contact.user_id === user?.id && (
                        <DropdownMenuItem onClick={() => unlinkUserFromContact(contact.id)}>
                          <Link className="h-4 w-4 mr-2" />
                          Unlink from Profile
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem 
                            onClick={() => deleteContact(contact.id)}
                            disabled={!canDelete('contact')}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Deactivate
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
        {contacts.length === 0 && (
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No {title.toLowerCase()} found</h3>
            <p className="text-muted-foreground">
              Get started by adding your first {title.slice(0, -1).toLowerCase()}.
            </p>
          </div>
        )}
            </CardContent>
          </Card>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
                    <div>
          <h1 className="text-3xl font-bold tracking-tight">Contact Management</h1>
                    </div>
                    </div>

      <Tabs defaultValue="all-contacts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all-contacts">All Contacts ({contacts.length})</TabsTrigger>
          <TabsTrigger value="customers">Customers ({customers.length})</TabsTrigger>
          <TabsTrigger value="suppliers">Suppliers ({suppliers.length})</TabsTrigger>
          <TabsTrigger value="sales-reps">Sales Reps ({salesReps.length})</TabsTrigger>
          <TabsTrigger value="vendors">Vendors ({vendors.length})</TabsTrigger>
          <TabsTrigger value="partners">Partners ({partners.length})</TabsTrigger>
          <TabsTrigger value="shipping-agents">Shipping Agents ({shippingAgents.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all-contacts" className="space-y-4">
          {renderContactTable(sortedContacts, "All Contacts", "Manage all your business contacts")}
        </TabsContent>

        <TabsContent value="customers" className="space-y-4">
          {renderContactTable(customers, "Customers", "Manage your customer relationships and track credit information", true)}
        </TabsContent>

        <TabsContent value="suppliers" className="space-y-4">
          {renderContactTable(suppliers, "Suppliers", "Manage your supplier relationships and procurement contacts")}
        </TabsContent>

        <TabsContent value="sales-reps" className="space-y-4">
          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Linked Sales Representatives</CardTitle>
                <CardDescription>Sales reps connected to user profiles</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {linkedSalesReps.map((rep) => (
                    <div key={rep.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">{rep.name}</div>
                        <div className="text-sm text-muted-foreground">{rep.email}</div>
                      </div>
                      <Badge variant="default">
                        <UserCheck className="h-3 w-3 mr-1" />
                        Active
                      </Badge>
                    </div>
                  ))}
                  {linkedSalesReps.length === 0 && (
                    <p className="text-muted-foreground text-center py-4">No linked sales representatives</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Unlinked Sales Representatives</CardTitle>
                <CardDescription>Sales reps awaiting profile connection</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {unlinkedSalesReps.map((rep) => (
                    <div key={rep.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">{rep.name}</div>
                        <div className="text-sm text-muted-foreground">{rep.email}</div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => linkUserToContact(rep.id)}
                      >
                        <Link className="h-4 w-4 mr-1" />
                        Link to Me
                      </Button>
                    </div>
                  ))}
                  {unlinkedSalesReps.length === 0 && (
                    <p className="text-muted-foreground text-center py-4">No unlinked sales representatives</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="vendors" className="space-y-4">
          {renderContactTable(vendors, "Vendors", "Manage your vendor relationships and service providers")}
        </TabsContent>

        <TabsContent value="partners" className="space-y-4">
          {renderContactTable(partners, "Partners", "Manage your business partners and collaborators")}
        </TabsContent>

        <TabsContent value="shipping-agents" className="space-y-4">
          {renderContactTable(shippingAgents, "Shipping Agents", "Manage shipping agents and their KYC information", false, true)}
        </TabsContent>
      </Tabs>

      {/* Edit Contact Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Contact</DialogTitle>
            <DialogDescription>
              Update contact information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="editName">Name *</Label>
                <Input
                  id="editName"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Contact name"
                />
              </div>
              <div>
                <Label htmlFor="editType">Type *</Label>
                <Select value={formData.type} onValueChange={(value) => setFormData({...formData, type: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTACT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="editEmail">Email</Label>
                <Input
                  id="editEmail"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="email@example.com"
                />
              </div>
              <div>
                <Label htmlFor="editPhone">Phone</Label>
                <Input
                  id="editPhone"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  placeholder="Phone number"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="editCompany">Company</Label>
                <Input
                  id="editCompany"
                  value={formData.company}
                  onChange={(e) => setFormData({...formData, company: e.target.value})}
                  placeholder="Company name"
                />
              </div>
              <div>
                <Label htmlFor="editAddress">Address</Label>
                <Input
                  id="editAddress"
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  placeholder="Address"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="editShippingAddress">Shipping Address</Label>
              <Textarea
                id="editShippingAddress"
                value={formData.shipping_address}
                onChange={(e) => setFormData({...formData, shipping_address: e.target.value})}
                placeholder="Shipping address (optional)"
                rows={3}
              />
              <p className="text-sm text-muted-foreground">
                Separate shipping address for deliveries (optional)
              </p>
            </div>
            <div>
              <Label htmlFor="editNotes">Notes</Label>
              <Textarea
                id="editNotes"
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                placeholder="Additional notes"
              />
            </div>
            
            {/* Customer-specific fields */}
            {formData.type === 'customer' && (
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="editIsReseller"
                    checked={formData.is_reseller}
                    onCheckedChange={(checked) => setFormData({...formData, is_reseller: checked})}
                  />
                  <Label htmlFor="editIsReseller">Reseller Customer</Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  Reseller customers are eligible for wholesale pricing on products
                </p>
                
                <div>
                  <Label htmlFor="editCreditLimit">Credit Limit</Label>
                  <Input
                    id="editCreditLimit"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.credit_limit}
                    onChange={(e) => setFormData({...formData, credit_limit: parseFloat(e.target.value) || 0})}
                    placeholder="0.00"
                  />
                  <p className="text-sm text-muted-foreground">
                    Maximum credit amount allowed for this customer (in {formatCurrency(0).replace('0.00', '')})
                  </p>
                </div>
              </div>
            )}

            {/* Shipping Agent-specific fields */}
            {formData.type === 'shipping_agent' && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="editShippingFee">Default Shipping Fee</Label>
                  <Input
                    id="editShippingFee"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.shipping_fee}
                    onChange={(e) => setFormData({...formData, shipping_fee: parseFloat(e.target.value) || 0})}
                    placeholder="0.00"
                  />
                  <p className="text-sm text-muted-foreground">
                    Default shipping fee for this agent (in {formatCurrency(0).replace('0.00', '')})
                  </p>
                </div>
                
                <div>
                  <Label htmlFor="editShippingZones">Shipping Zones</Label>
                  <Input
                    id="editShippingZones"
                    value={formData.shipping_zones.join(', ')}
                    onChange={(e) => setFormData({
                      ...formData, 
                      shipping_zones: e.target.value.split(',').map(zone => zone.trim()).filter(zone => zone)
                    })}
                    placeholder="Zone 1, Zone 2, Zone 3"
                  />
                  <p className="text-sm text-muted-foreground">
                    Comma-separated list of shipping zones this agent serves
                  </p>
                </div>

                <div>
                  <Label htmlFor="editShippingDocuments">KYC Documents</Label>
                  <Textarea
                    id="editShippingDocuments"
                    value={JSON.stringify(formData.shipping_documents, null, 2)}
                    onChange={(e) => {
                      try {
                        const docs = JSON.parse(e.target.value);
                        setFormData({...formData, shipping_documents: docs});
                      } catch (error) {
                        // Keep the current value if JSON is invalid
                      }
                    }}
                    placeholder='{"business_license": "url", "insurance_certificate": "url", "vehicle_registration": "url"}'
                    rows={4}
                  />
                  <p className="text-sm text-muted-foreground">
                    JSON object containing shipping agent documents and credentials
                  </p>
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                Cancel
              </Button>
              <Button onClick={updateContact}>Update Contact</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Contact Details Dialog */}
      {selectedContact && (
        <ContactDetails
          contact={selectedContact}
          isOpen={isContactDetailsOpen}
          onClose={() => {
            setIsContactDetailsOpen(false);
            setSelectedContact(null);
          }}
        />
      )}

      {/* Customer Statement Dialog */}
      <CustomerStatement
        customerId={statementCustomerId}
        isOpen={isStatementOpen}
        onClose={() => {
          setIsStatementOpen(false);
          setStatementCustomerId(undefined);
        }}
      />
    </div>
  );
};

export default ContactManagement;