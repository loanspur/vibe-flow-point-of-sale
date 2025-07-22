import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
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
import { toast } from 'sonner';
import { Users, UserPlus, Link, Edit, Trash2, Phone, Mail, MapPin, Plus, UserCheck, Building, Eye } from 'lucide-react';
import ContactDetails from './ContactDetails';

interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  address: string;
  type: string;
  notes: string;
  is_active: boolean;
  user_id: string | null;
  tenant_id: string;
  created_at: string;
  is_commission_agent: boolean;
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
  { value: 'partner', label: 'Partner', icon: Users }
];

const ContactManagement = () => {
  const { tenantId, userRole, user } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [userContact, setUserContact] = useState<Contact | null>(null);
  const [isContactDetailsOpen, setIsContactDetailsOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  
  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    address: '',
    type: 'customer',
    notes: '',
    is_commission_agent: false
  });

  useEffect(() => {
    if (tenantId) {
      fetchContacts();
      fetchUsers();
      fetchUserContact();
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
      toast.error('Failed to load contacts');
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

  const fetchUserContact = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('user_id', user.id)
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (error) throw error;
      setUserContact(data);
    } catch (error) {
      // Error handled silently
    }
  };

  const createContact = async () => {
    if (!formData.name.trim() || !formData.type) {
      toast.error('Name and type are required');
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

      toast.success('Contact created successfully');
      setFormData({
        name: '',
        email: '',
        phone: '',
        company: '',
        address: '',
        type: 'customer',
        notes: '',
        is_commission_agent: false
      });
      setIsCreateOpen(false);
      fetchContacts();
    } catch (error: any) {
      console.error('Error creating contact:', error);
      if (error.code === '23505' && error.constraint === 'unique_email_per_tenant') {
        toast.error('A contact with this email already exists');
      } else {
        toast.error('Failed to create contact');
      }
    }
  };

  const updateContact = async () => {
    if (!editingContact || !formData.name.trim()) {
      toast.error('Name is required');
      return;
    }

    try {
      const { error } = await supabase
        .from('contacts')
        .update(formData)
        .eq('id', editingContact.id);

      if (error) throw error;

      toast.success('Contact updated successfully');
      setIsEditOpen(false);
      setEditingContact(null);
      fetchContacts();
      if (editingContact.user_id === user?.id) {
        fetchUserContact();
      }
    } catch (error: any) {
      console.error('Error updating contact:', error);
      if (error.code === '23505' && error.constraint === 'unique_email_per_tenant') {
        toast.error('A contact with this email already exists');
      } else {
        toast.error('Failed to update contact');
      }
    }
  };

  const deleteContact = async (contactId: string) => {
    try {
      const { error } = await supabase
        .from('contacts')
        .update({ is_active: false })
        .eq('id', contactId);

      if (error) throw error;

      toast.success('Contact deleted successfully');
      fetchContacts();
    } catch (error) {
      console.error('Error deleting contact:', error);
      toast.error('Failed to delete contact');
    }
  };

  const linkUserToContact = async (contactId: string) => {
    try {
      const { data, error } = await supabase.rpc('link_user_to_contact', {
        contact_id: contactId
      });

      if (error) throw error;

      if (data) {
        toast.success('Successfully linked to your profile');
        fetchContacts();
        fetchUserContact();
      } else {
        toast.error('Failed to link contact - it may already be linked to another user');
      }
    } catch (error) {
      console.error('Error linking contact:', error);
      toast.error('Failed to link contact to profile');
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

      toast.success('Contact unlinked from your profile');
      fetchContacts();
      fetchUserContact();
    } catch (error) {
      console.error('Error unlinking contact:', error);
      toast.error('Failed to unlink contact');
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
      type: contact.type,
      notes: contact.notes || '',
      is_commission_agent: contact.is_commission_agent || false
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
      type: 'customer',
      notes: '',
      is_commission_agent: false
    });
  };

  const filteredContacts = contacts.filter(contact => {
    const matchesSearch = contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         contact.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         contact.company?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'all' || contact.type === selectedType;
    return matchesSearch && matchesType;
  });

  const getContactsByType = (type: string) => contacts.filter(contact => contact.type === type);
  const customers = getContactsByType('customer');
  const suppliers = getContactsByType('supplier');
  const salesReps = getContactsByType('sales_rep');
  const linkedSalesReps = salesReps.filter(contact => contact.user_id);
  const unlinkedSalesReps = salesReps.filter(contact => !contact.user_id);

  const getTypeIcon = (type: string) => {
    const contactType = CONTACT_TYPES.find(t => t.value === type);
    const Icon = contactType?.icon || Users;
    return <Icon className="h-4 w-4" />;
  };

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
          <p className="text-muted-foreground">Manage customers, suppliers, sales reps and business contacts</p>
        </div>
      </div>

      <Tabs defaultValue="all-contacts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all-contacts">All Contacts</TabsTrigger>
          <TabsTrigger value="customers">Customers ({customers.length})</TabsTrigger>
          <TabsTrigger value="suppliers">Suppliers ({suppliers.length})</TabsTrigger>
          <TabsTrigger value="sales-reps">Sales Reps ({salesReps.length})</TabsTrigger>
          <TabsTrigger value="my-profile">My Profile</TabsTrigger>
        </TabsList>

        <TabsContent value="all-contacts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  All Contacts
                </div>
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={resetForm}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Contact
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New Contact</DialogTitle>
                      <DialogDescription>
                        Add a new contact to your directory
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
                        <Label htmlFor="notes">Notes</Label>
                        <Textarea
                          id="notes"
                          value={formData.notes}
                          onChange={(e) => setFormData({...formData, notes: e.target.value})}
                          placeholder="Additional notes"
                        />
                      </div>
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
              <CardDescription>Manage all your business contacts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-6">
                <div className="flex-1">
                  <Input
                    placeholder="Search contacts..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {CONTACT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Contact Info</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Linked User</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredContacts.map((contact) => (
                    <TableRow key={contact.id}>
                      <TableCell>
                        <div className="font-medium">{contact.name}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                          {getTypeIcon(contact.type)}
                          {CONTACT_TYPES.find(t => t.value === contact.type)?.label || contact.type}
                        </Badge>
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
                        </div>
                      </TableCell>
                      <TableCell>{contact.company || '-'}</TableCell>
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
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {(contact.type === 'customer' || contact.type === 'supplier') && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedContact(contact);
                                setIsContactDetailsOpen(true);
                              }}
                              title="View Details"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(contact)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {contact.type === 'sales_rep' && !contact.user_id && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => linkUserToContact(contact.id)}
                            >
                              <Link className="h-4 w-4" />
                            </Button>
                          )}
                          {contact.user_id === user?.id && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => unlinkUserFromContact(contact.id)}
                            >
                              Unlink
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteContact(contact.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Customer Contacts</CardTitle>
              <CardDescription>Manage your customer relationships</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {customers.map((customer) => (
                  <div key={customer.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">{customer.name}</div>
                      <div className="text-sm text-muted-foreground">{customer.email}</div>
                      {customer.company && <div className="text-sm text-muted-foreground">{customer.company}</div>}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedContact(customer);
                          setIsContactDetailsOpen(true);
                        }}
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => openEditDialog(customer)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {customers.length === 0 && (
                  <p className="text-muted-foreground text-center py-4">No customers found</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="suppliers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Supplier Contacts</CardTitle>
              <CardDescription>Manage your supplier relationships</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {suppliers.map((supplier) => (
                  <div key={supplier.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">{supplier.name}</div>
                      <div className="text-sm text-muted-foreground">{supplier.email}</div>
                      {supplier.company && <div className="text-sm text-muted-foreground">{supplier.company}</div>}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedContact(supplier);
                          setIsContactDetailsOpen(true);
                        }}
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => openEditDialog(supplier)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {suppliers.length === 0 && (
                  <p className="text-muted-foreground text-center py-4">No suppliers found</p>
                )}
              </div>
            </CardContent>
          </Card>
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

        <TabsContent value="my-profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>My Contact Profile</CardTitle>
              <CardDescription>Your linked contact information</CardDescription>
            </CardHeader>
            <CardContent>
              {userContact ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Name</Label>
                      <p className="text-sm font-medium">{userContact.name}</p>
                    </div>
                    <div>
                      <Label>Type</Label>
                      <Badge variant="secondary">
                        {CONTACT_TYPES.find(t => t.value === userContact.type)?.label || userContact.type}
                      </Badge>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Email</Label>
                      <p className="text-sm">{userContact.email || 'Not provided'}</p>
                    </div>
                    <div>
                      <Label>Phone</Label>
                      <p className="text-sm">{userContact.phone || 'Not provided'}</p>
                    </div>
                  </div>
                  <div>
                    <Label>Company</Label>
                    <p className="text-sm">{userContact.company || 'Not provided'}</p>
                  </div>
                  <div className="flex justify-end">
                    <Button onClick={() => openEditDialog(userContact)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Profile
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Contact Profile</h3>
                  <p className="text-muted-foreground mb-4">
                    You haven't linked your account to a contact profile yet.
                  </p>
                  <Button onClick={() => setIsCreateOpen(true)}>
                    Create Contact Profile
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
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
              <Label htmlFor="editNotes">Notes</Label>
              <Textarea
                id="editNotes"
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                placeholder="Additional notes"
              />
            </div>
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
    </div>
  );
};

export default ContactManagement;