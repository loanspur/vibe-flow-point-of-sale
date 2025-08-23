import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Download, FileText, Calendar, Building2, Users, Mail, Phone, MapPin } from 'lucide-react';
import { useBusinessSettingsManager } from '@/hooks/useBusinessSettingsManager';

interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  address: string;
  type: string;
  notes: string;
}

interface BusinessSettings {
  company_name: string;
  company_logo_url: string;
  email: string;
  phone: string;
  address_line_1: string;
  address_line_2: string;
  city: string;
  state_province: string;
  postal_code: string;
  country: string;
}

interface StatementTransaction {
  date: string;
  description: string;
  reference: string;
  debit: number;
  credit: number;
  balance: number;
  type: 'invoice' | 'payment' | 'adjustment';
}

interface ContactStatementProps {
  contact: Contact;
  isOpen: boolean;
  onClose: () => void;
}

const ContactStatement: React.FC<ContactStatementProps> = ({ contact, isOpen, onClose }) => {
  const { tenantId } = useAuth();
  const { settings: businessSettings, fetchSettings } = useBusinessSettingsManager();
  const printRef = useRef<HTMLDivElement>(null);
  
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState<StatementTransaction[]>([]);
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  });
  const [summary, setSummary] = useState({
    openingBalance: 0,
    totalDebits: 0,
    totalCredits: 0,
    closingBalance: 0
  });

  useEffect(() => {
    if (isOpen && contact.id) {
      fetchSettings();
    }
  }, [isOpen, contact.id, fetchSettings]);

  useEffect(() => {
    if (businessSettings) {
      fetchStatementData();
    }
  }, [businessSettings, dateRange]);

  const fetchStatementData = async () => {
    setLoading(true);
    try {
      const transactions: StatementTransaction[] = [];
      let runningBalance = 0;

      if (contact.type === 'customer') {
        // Fetch receivables and payments for customer
        const [receivablesResult, paymentsResult] = await Promise.all([
          supabase
            .from('accounts_receivable')
            .select('*')
            .eq('tenant_id', tenantId)
            .eq('customer_id', contact.id)
            .gte('invoice_date', dateRange.from)
            .lte('invoice_date', dateRange.to)
            .order('invoice_date'),
          
          supabase
            .from('ar_ap_payments')
            .select(`
              *,
              accounts_receivable!inner(customer_id, invoice_number)
            `)
            .eq('tenant_id', tenantId)
            .eq('payment_type', 'receivable')
            .eq('accounts_receivable.customer_id', contact.id)
            .gte('payment_date', dateRange.from)
            .lte('payment_date', dateRange.to)
            .order('payment_date')
        ]);

        // Process receivables (debits)
        receivablesResult.data?.forEach(receivable => {
          runningBalance += receivable.original_amount;
          transactions.push({
            date: receivable.invoice_date,
            description: `Invoice ${receivable.invoice_number}`,
            reference: receivable.invoice_number,
            debit: receivable.original_amount,
            credit: 0,
            balance: runningBalance,
            type: 'invoice'
          });
        });

        // Process payments (credits)
        paymentsResult.data?.forEach(payment => {
          runningBalance -= payment.amount;
          transactions.push({
            date: payment.payment_date,
            description: `Payment - ${payment.payment_method}`,
            reference: payment.reference_number || '',
            debit: 0,
            credit: payment.amount,
            balance: runningBalance,
            type: 'payment'
          });
        });

      } else if (contact.type === 'supplier') {
        // Fetch payables and payments for supplier
        const [payablesResult, paymentsResult] = await Promise.all([
          supabase
            .from('accounts_payable')
            .select('*')
            .eq('tenant_id', tenantId)
            .eq('supplier_id', contact.id)
            .gte('invoice_date', dateRange.from)
            .lte('invoice_date', dateRange.to)
            .order('invoice_date'),
          
          supabase
            .from('ar_ap_payments')
            .select(`
              *,
              accounts_payable!inner(supplier_id, invoice_number)
            `)
            .eq('tenant_id', tenantId)
            .eq('payment_type', 'payable')
            .eq('accounts_payable.supplier_id', contact.id)
            .gte('payment_date', dateRange.from)
            .lte('payment_date', dateRange.to)
            .order('payment_date')
        ]);

        // Process payables (credits for supplier perspective)
        payablesResult.data?.forEach(payable => {
          runningBalance += payable.original_amount;
          transactions.push({
            date: payable.invoice_date,
            description: `Invoice ${payable.invoice_number}`,
            reference: payable.invoice_number,
            debit: 0,
            credit: payable.original_amount,
            balance: runningBalance,
            type: 'invoice'
          });
        });

        // Process payments (debits for supplier perspective)
        paymentsResult.data?.forEach(payment => {
          runningBalance -= payment.amount;
          transactions.push({
            date: payment.payment_date,
            description: `Payment Received - ${payment.payment_method}`,
            reference: payment.reference_number || '',
            debit: payment.amount,
            credit: 0,
            balance: runningBalance,
            type: 'payment'
          });
        });
      }

      // Sort transactions by date
      transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // Recalculate running balances
      let balance = 0;
      const processedTransactions = transactions.map(transaction => {
        balance += (transaction.debit - transaction.credit);
        return { ...transaction, balance };
      });

      setTransactions(processedTransactions);

      // Calculate summary
      const totalDebits = transactions.reduce((sum, t) => sum + t.debit, 0);
      const totalCredits = transactions.reduce((sum, t) => sum + t.credit, 0);
      
      setSummary({
        openingBalance: 0, // Could be calculated from previous period
        totalDebits,
        totalCredits,
        closingBalance: balance
      });

    } catch (error) {
      console.error('Error fetching statement data:', error);
      toast.error('Failed to load statement data');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow && printRef.current) {
      const printContent = printRef.current.innerHTML;
      
      printWindow.document.write(`
        <html>
          <head>
            <title>Statement - ${contact.name}</title>
            <style>
              body { 
                font-family: Arial, sans-serif; 
                margin: 0; 
                padding: 20px; 
                color: #000;
                background: white;
              }
              .statement-container { 
                max-width: 800px; 
                margin: 0 auto; 
                background: white;
              }
              .statement-header { 
                border-bottom: 2px solid #e2e8f0; 
                padding-bottom: 20px; 
                margin-bottom: 30px; 
              }
              .company-info { 
                display: flex; 
                justify-content: space-between; 
                align-items: flex-start; 
                margin-bottom: 20px; 
              }
              .logo { 
                max-width: 150px; 
                max-height: 80px; 
              }
              .company-details { 
                text-align: right; 
                line-height: 1.4; 
              }
              .statement-title { 
                text-align: center; 
                font-size: 24px; 
                font-weight: bold; 
                margin: 20px 0; 
              }
              .contact-info { 
                background: #f8fafc; 
                padding: 15px; 
                border-radius: 8px; 
                margin-bottom: 20px; 
              }
              .date-range { 
                text-align: center; 
                margin: 20px 0; 
                font-weight: bold; 
              }
              .transactions-table { 
                width: 100%; 
                border-collapse: collapse; 
                margin-bottom: 20px; 
              }
              .transactions-table th, 
              .transactions-table td { 
                border: 1px solid #e2e8f0; 
                padding: 8px; 
                text-align: left; 
              }
              .transactions-table th { 
                background: #f1f5f9; 
                font-weight: bold; 
              }
              .transactions-table td.amount { 
                text-align: right; 
              }
              .summary-section { 
                border-top: 2px solid #e2e8f0; 
                padding-top: 20px; 
                margin-top: 20px; 
              }
              .summary-row { 
                display: flex; 
                justify-content: space-between; 
                padding: 5px 0; 
              }
              .summary-total { 
                font-weight: bold; 
                border-top: 1px solid #000; 
                padding-top: 10px; 
                margin-top: 10px; 
              }
              .footer { 
                margin-top: 40px; 
                text-align: center; 
                font-size: 12px; 
                color: #666; 
              }
              @media print {
                body { margin: 0; }
                .no-print { display: none; }
              }
            </style>
          </head>
          <body>
            ${printContent}
          </body>
        </html>
      `);
      
      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    }
  };

  const handleDownloadPDF = () => {
    handlePrint(); // For now, use print dialog which allows saving as PDF
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: tenantCurrency || 'USD'
    }).format(amount);
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="h-6 w-6 text-primary" />
              Account Statement - {contact.name}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handleDownloadPDF}>
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Date Range Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Statement Parameters</CardTitle>
              <CardDescription>Select the date range for the statement</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="from-date">From Date</Label>
                  <Input
                    id="from-date"
                    type="date"
                    value={dateRange.from}
                    onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="to-date">To Date</Label>
                  <Input
                    id="to-date"
                    type="date"
                    value={dateRange.to}
                    onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Statement Preview */}
          <Card>
            <CardContent className="p-0">
              <div ref={printRef} className="statement-container p-8 bg-white">
                {/* Header */}
                <div className="statement-header">
                  <div className="company-info">
                    <div>
                      {businessSettings?.company_logo_url && (
                        <img 
                          src={businessSettings.company_logo_url} 
                          alt="Company Logo" 
                          className="logo mb-4"
                        />
                      )}
                      <h1 className="text-2xl font-bold text-gray-900">
                        {businessSettings?.company_name || 'Company Name'}
                      </h1>
                    </div>
                    <div className="company-details text-sm text-gray-600">
                      {businessSettings?.address_line_1 && <div>{businessSettings.address_line_1}</div>}
                      {businessSettings?.address_line_2 && <div>{businessSettings.address_line_2}</div>}
                      <div>
                        {businessSettings?.city && `${businessSettings.city}, `}
                        {businessSettings?.state_province && `${businessSettings.state_province} `}
                        {businessSettings?.postal_code}
                      </div>
                      {businessSettings?.country && <div>{businessSettings.country}</div>}
                      {businessSettings?.phone && <div>Phone: {businessSettings.phone}</div>}
                      {businessSettings?.email && <div>Email: {businessSettings.email}</div>}
                    </div>
                  </div>

                  <div className="statement-title">
                    ACCOUNT STATEMENT
                  </div>

                  <div className="contact-info">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-lg flex items-center gap-2">
                          {contact.type === 'customer' ? (
                            <Users className="h-5 w-5" />
                          ) : (
                            <Building2 className="h-5 w-5" />
                          )}
                          {contact.name}
                        </h3>
                        {contact.company && (
                          <div className="text-gray-600 mt-1">{contact.company}</div>
                        )}
                        <div className="mt-2 space-y-1 text-sm text-gray-600">
                          {contact.email && (
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4" />
                              {contact.email}
                            </div>
                          )}
                          {contact.phone && (
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4" />
                              {contact.phone}
                            </div>
                          )}
                          {contact.address && (
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4" />
                              {contact.address}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right text-sm">
                        <div><strong>Statement Date:</strong> {format(new Date(), 'MMM d, yyyy')}</div>
                        <div><strong>Account Type:</strong> {contact.type.charAt(0).toUpperCase() + contact.type.slice(1)}</div>
                      </div>
                    </div>
                  </div>

                  <div className="date-range text-center py-2 bg-gray-50 rounded">
                    <Calendar className="h-4 w-4 inline mr-2" />
                    Statement Period: {format(new Date(dateRange.from), 'MMM d, yyyy')} to {format(new Date(dateRange.to), 'MMM d, yyyy')}
                  </div>
                </div>

                {/* Transactions Table */}
                <div className="transactions-section">
                  {loading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                      <p className="mt-2">Loading transactions...</p>
                    </div>
                  ) : (
                    <>
                      <table className="transactions-table">
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Description</th>
                            <th>Reference</th>
                            <th className="amount">Debit</th>
                            <th className="amount">Credit</th>
                            <th className="amount">Balance</th>
                          </tr>
                        </thead>
                        <tbody>
                          {transactions.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="text-center py-8 text-gray-500">
                                No transactions found for the selected period
                              </td>
                            </tr>
                          ) : (
                            transactions.map((transaction, index) => (
                              <tr key={index}>
                                <td>{format(new Date(transaction.date), 'MMM d, yyyy')}</td>
                                <td>{transaction.description}</td>
                                <td>{transaction.reference}</td>
                                <td className="amount">
                                  {transaction.debit > 0 ? formatCurrency(transaction.debit) : '-'}
                                </td>
                                <td className="amount">
                                  {transaction.credit > 0 ? formatCurrency(transaction.credit) : '-'}
                                </td>
                                <td className="amount font-semibold">
                                  {formatCurrency(transaction.balance)}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>

                      {/* Summary */}
                      <div className="summary-section">
                        <h3 className="font-bold text-lg mb-4">Statement Summary</h3>
                        <div className="w-full max-w-md ml-auto">
                          <div className="summary-row">
                            <span>Opening Balance:</span>
                            <span>{formatCurrency(summary.openingBalance)}</span>
                          </div>
                          <div className="summary-row">
                            <span>Total Debits:</span>
                            <span>{formatCurrency(summary.totalDebits)}</span>
                          </div>
                          <div className="summary-row">
                            <span>Total Credits:</span>
                            <span>{formatCurrency(summary.totalCredits)}</span>
                          </div>
                          <div className="summary-row summary-total">
                            <span><strong>Closing Balance:</strong></span>
                            <span><strong>{formatCurrency(summary.closingBalance)}</strong></span>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Footer */}
                <div className="footer">
                  <p>This statement is computer generated and does not require a signature.</p>
                  <p>For any queries regarding this statement, please contact us at {businessSettings?.email || 'your business email'}</p>
                  <p>Generated on {format(new Date(), 'MMM d, yyyy HH:mm')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ContactStatement;