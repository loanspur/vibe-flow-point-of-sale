import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { MessageCircle, Search, Calendar, Phone, CheckCircle, XCircle, Clock, Eye } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface WhatsAppMessage {
  id: string;
  recipient_phone: string;
  recipient_name?: string;
  message_content: string;
  status: string;
  external_id?: string;
  cost?: number;
  sent_at: string;
  delivered_at?: string;
  read_at?: string;
  failed_at?: string;
  error_message?: string;
  template_id?: string;
  whatsapp_templates?: {
    name: string;
    type: string;
  } | null;
}

const WhatsAppMessageHistory: React.FC = () => {
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('7');
  const { toast } = useToast();

  useEffect(() => {
    fetchMessages();
  }, [statusFilter, dateFilter]);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('whatsapp_message_logs')
        .select(`
          *,
          whatsapp_templates(name, type)
        `)
        .order('sent_at', { ascending: false });

      // Apply status filter
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      // Apply date filter
      if (dateFilter !== 'all') {
        const daysAgo = new Date();
        daysAgo.setDate(daysAgo.getDate() - parseInt(dateFilter));
        query = query.gte('sent_at', daysAgo.toISOString());
      }

      const { data, error } = await query.limit(100);

      if (error) throw error;
      setMessages((data as any) || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch WhatsApp message history",
        variant: "destructive",
      });
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredMessages = messages.filter(message =>
    message.recipient_phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (message.recipient_name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
    message.message_content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: 'Pending', variant: 'outline' as const, icon: Clock },
      sent: { label: 'Sent', variant: 'default' as const, icon: MessageCircle },
      delivered: { label: 'Delivered', variant: 'default' as const, icon: CheckCircle },
      read: { label: 'Read', variant: 'default' as const, icon: Eye },
      failed: { label: 'Failed', variant: 'destructive' as const, icon: XCircle },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const IconComponent = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <IconComponent className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const formatCost = (cost?: number) => {
    if (!cost) return '-';
    return `$${cost.toFixed(4)}`;
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            <h2 className="text-xl font-semibold">WhatsApp Message History</h2>
          </div>
          <Button onClick={fetchMessages} variant="outline" size="sm">
            Refresh
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by phone, name, or message content..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="read">Read</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder="Time Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Last 24 hours</SelectItem>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Messages Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Recipient</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Template</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>Sent At</TableHead>
                <TableHead>Delivered</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMessages.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="flex flex-col items-center gap-2">
                      <MessageCircle className="h-8 w-8 text-muted-foreground" />
                      <p className="text-muted-foreground">No messages found</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredMessages.map((message) => (
                  <TableRow key={message.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{message.recipient_phone}</span>
                        </div>
                        {message.recipient_name && (
                          <span className="text-sm text-muted-foreground">{message.recipient_name}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs">
                        <p className="text-sm line-clamp-2">{message.message_content}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {message.whatsapp_templates ? (
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{message.whatsapp_templates.name}</span>
                          <span className="text-xs text-muted-foreground capitalize">{message.whatsapp_templates.type}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(message.status)}
                      {message.error_message && (
                        <p className="text-xs text-destructive mt-1">{message.error_message}</p>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{formatCost(message.cost)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{format(new Date(message.sent_at), 'MMM dd, HH:mm')}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {message.delivered_at ? (
                        <span className="text-sm">{format(new Date(message.delivered_at), 'MMM dd, HH:mm')}</span>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Sent</p>
                <p className="text-lg font-semibold">{filteredMessages.length}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Delivered</p>
                <p className="text-lg font-semibold">
                  {filteredMessages.filter(m => m.status === 'delivered' || m.status === 'read').length}
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-500" />
              <div>
                <p className="text-sm text-muted-foreground">Failed</p>
                <p className="text-lg font-semibold">
                  {filteredMessages.filter(m => m.status === 'failed').length}
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">Read</p>
                <p className="text-lg font-semibold">
                  {filteredMessages.filter(m => m.status === 'read').length}
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </Card>
  );
};

export default WhatsAppMessageHistory;