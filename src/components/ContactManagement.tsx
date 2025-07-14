import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Search, Plus, Edit, User, Building, Mail, Phone } from 'lucide-react';
import ContactForm from './ContactForm';

interface Contact {
  id: string;
  name: string;
  type: 'customer' | 'supplier';
  email?: string;
  phone?: string;
  address?: string;
  company?: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
}

export default function ContactManagement() {
  const { tenantId } = useAuth();
  const { toast } = useToast();
  
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  useEffect(() => {
    fetchContacts();
  }, [tenantId]);

  useEffect(() => {
    filterContacts();
  }, [contacts, searchTerm, activeTab]);

  const fetchContacts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContacts((data || []) as Contact[]);
    } catch (error: any) {
      toast({
        title: "Error fetching contacts",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterContacts = () => {
    let filtered = contacts;

    // Filter by type
    if (activeTab !== 'all') {
      filtered = filtered.filter(contact => contact.type === activeTab);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(contact =>
        contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.company?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredContacts(filtered);
  };

  const handleCreateContact = () => {
    setSelectedContact(null);
    setShowForm(true);
  };

  const handleEditContact = (contact: Contact) => {
    setSelectedContact(contact);
    setShowForm(true);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setSelectedContact(null);
    fetchContacts();
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setSelectedContact(null);
  };

  const getTypeIcon = (type: string) => {
    return type === 'customer' ? <User className="w-4 h-4" /> : <Building className="w-4 h-4" />;
  };

  const getTypeBadgeVariant = (type: string) => {
    return type === 'customer' ? 'default' : 'secondary';
  };

  const customerCount = contacts.filter(c => c.type === 'customer').length;
  const supplierCount = contacts.filter(c => c.type === 'supplier').length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Contact Management</h2>
          <p className="text-muted-foreground">Manage your customers and suppliers</p>
        </div>
        <Button onClick={handleCreateContact}>
          <Plus className="w-4 h-4 mr-2" />
          Add Contact
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search contacts by name, email, or company..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">All Contacts ({contacts.length})</TabsTrigger>
          <TabsTrigger value="customer">Customers ({customerCount})</TabsTrigger>
          <TabsTrigger value="supplier">Suppliers ({supplierCount})</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>
                {activeTab === 'all' ? 'All Contacts' : 
                 activeTab === 'customer' ? 'Customers' : 'Suppliers'}
              </CardTitle>
              <CardDescription>
                {filteredContacts.length} contact{filteredContacts.length !== 1 ? 's' : ''} found
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Loading contacts...</p>
                </div>
              ) : filteredContacts.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No contacts found</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Contact Info</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredContacts.map((contact) => (
                      <TableRow key={contact.id}>
                        <TableCell className="font-medium">{contact.name}</TableCell>
                        <TableCell>
                          <Badge variant={getTypeBadgeVariant(contact.type)} className="flex items-center gap-1 w-fit">
                            {getTypeIcon(contact.type)}
                            {contact.type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {contact.email && (
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Mail className="w-3 h-3" />
                                {contact.email}
                              </div>
                            )}
                            {contact.phone && (
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Phone className="w-3 h-3" />
                                {contact.phone}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{contact.company || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={contact.is_active ? 'default' : 'secondary'}>
                            {contact.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleEditContact(contact)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Contact Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedContact ? 'Edit Contact' : 'Create New Contact'}
            </DialogTitle>
            <DialogDescription>
              {selectedContact ? 'Update contact information' : 'Add a new customer or supplier'}
            </DialogDescription>
          </DialogHeader>
          <ContactForm
            contact={selectedContact}
            onSuccess={handleFormSuccess}
            onCancel={handleFormCancel}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}