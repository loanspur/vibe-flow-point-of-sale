import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CustomerDetail, 
  OrderDetail, 
  AnomalyDetail, 
  TimeSeriesData 
} from '@/lib/ai/AdvancedAnalyticsEngine';
import { 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  DollarSign, 
  ShoppingCart, 
  TrendingUp, 
  AlertTriangle,
  X,
  Download,
  Eye,
  Users
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface CustomerDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: CustomerDetail | null;
}

export function CustomerDetailModal({ isOpen, onClose, customer }: CustomerDetailModalProps) {
  if (!customer) return null;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Customer Details: {customer.name}
          </DialogTitle>
          <DialogDescription>
            Detailed information about customer behavior and purchase history
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Customer Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Customer Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    Email
                  </div>
                  <p className="font-medium">{customer.email}</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    Phone
                  </div>
                  <p className="font-medium">{customer.phone || 'N/A'}</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    First Order
                  </div>
                  <p className="font-medium">{formatDate(customer.first_order_date)}</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    Last Order
                  </div>
                  <p className="font-medium">{formatDate(customer.last_order_date)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Customer Metrics */}
          <Card>
            <CardHeader>
              <CardTitle>Customer Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{customer.total_orders}</div>
                  <div className="text-sm text-muted-foreground">Total Orders</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{formatCurrency(customer.total_spent)}</div>
                  <div className="text-sm text-muted-foreground">Total Spent</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{formatCurrency(customer.avg_order_value)}</div>
                  <div className="text-sm text-muted-foreground">Avg Order Value</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <Badge variant="outline">{customer.segment_name}</Badge>
                  <div className="text-sm text-muted-foreground mt-1">Segment</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Order History */}
          <Card>
            <CardHeader>
              <CardTitle>Order History</CardTitle>
              <CardDescription>
                Complete purchase history and order details
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {customer.orders.map((order) => (
                  <div key={order.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-medium">Order #{order.order_number}</h4>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(order.created_at)} • {order.payment_method}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold">{formatCurrency(order.total_amount)}</div>
                        <Badge variant={order.status === 'completed' ? 'default' : 'secondary'}>
                          {order.status}
                        </Badge>
                      </div>
                    </div>
                    
                    {order.items.length > 0 && (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Product</TableHead>
                            <TableHead>Quantity</TableHead>
                            <TableHead>Unit Price</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {order.items.map((item, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-medium">{item.product_name}</TableCell>
                              <TableCell>{item.quantity}</TableCell>
                              <TableCell>{formatCurrency(item.unit_price)}</TableCell>
                              <TableCell className="text-right">{formatCurrency(item.total_price)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface SegmentCustomersModalProps {
  isOpen: boolean;
  onClose: () => void;
  segmentName: string;
  customers: CustomerDetail[];
  onCustomerClick: (customer: CustomerDetail) => void;
}

export function SegmentCustomersModal({ 
  isOpen, 
  onClose, 
  segmentName, 
  customers, 
  onCustomerClick 
}: SegmentCustomersModalProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {segmentName} Customers ({customers.length})
          </DialogTitle>
          <DialogDescription>
            Customers in the {segmentName} segment
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="text-sm text-muted-foreground">
              Showing {customers.length} customers
            </div>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Orders</TableHead>
                <TableHead>Total Spent</TableHead>
                <TableHead>Avg Order</TableHead>
                <TableHead>Last Order</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell className="font-medium">{customer.name}</TableCell>
                  <TableCell>{customer.email}</TableCell>
                  <TableCell>{customer.total_orders}</TableCell>
                  <TableCell>{formatCurrency(customer.total_spent)}</TableCell>
                  <TableCell>{formatCurrency(customer.avg_order_value)}</TableCell>
                  <TableCell>{formatDate(customer.last_order_date)}</TableCell>
                  <TableCell>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => onCustomerClick(customer)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface AnomalyDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  anomaly: AnomalyDetail | null;
}

export function AnomalyDetailModal({ isOpen, onClose, anomaly }: AnomalyDetailModalProps) {
  if (!anomaly) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'destructive';
      case 'high':
        return 'destructive';
      case 'medium':
        return 'secondary';
      case 'low':
        return 'default';
      default:
        return 'default';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Anomaly Details
          </DialogTitle>
          <DialogDescription>
            Detailed information about the detected anomaly
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Anomaly Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Anomaly Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Type</label>
                  <p className="font-medium">{anomaly.anomaly_type.replace('_', ' ')}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Severity</label>
                  <div className="mt-1">
                    <Badge variant={getSeverityColor(anomaly.severity)}>
                      {anomaly.severity}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Entity Type</label>
                  <p className="font-medium">{anomaly.entity_type}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Entity Name</label>
                  <p className="font-medium">{anomaly.entity_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Score</label>
                  <p className="font-medium">{anomaly.anomaly_score.toFixed(2)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Detected</label>
                  <p className="font-medium">{formatDate(anomaly.detected_at)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{anomaly.description}</p>
            </CardContent>
          </Card>

          {/* Status */}
          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Badge variant={anomaly.resolved ? 'default' : 'secondary'}>
                  {anomaly.resolved ? 'Resolved' : 'Active'}
                </Badge>
                {anomaly.resolution_notes && (
                  <p className="text-sm text-muted-foreground ml-2">
                    {anomaly.resolution_notes}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Related Data */}
          {Object.keys(anomaly.related_data).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Related Data</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(anomaly.related_data).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="text-sm font-medium text-muted-foreground">
                        {key.charAt(0).toUpperCase() + key.slice(1)}:
                      </span>
                      <span className="text-sm">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface TimeSeriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: TimeSeriesData[];
  metric: string;
  title: string;
}

export function TimeSeriesModal({ isOpen, onClose, data, metric, title }: TimeSeriesModalProps) {
  const formatValue = (value: number) => {
    if (metric === 'revenue') {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
    }
    return new Intl.NumberFormat('en-US').format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            {title}
          </DialogTitle>
          <DialogDescription>
            Detailed time series data for {metric}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Trend Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={formatDate}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={formatDate}
                    formatter={(value: number) => [formatValue(value), metric]}
                  />
                  <Line type="monotone" dataKey="value" stroke="#8884d8" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Data Table */}
          <Card>
            <CardHeader>
              <CardTitle>Detailed Data</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">{metric.charAt(0).toUpperCase() + metric.slice(1)}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{formatDate(item.date)}</TableCell>
                      <TableCell className="text-right">{formatValue(item.value)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
