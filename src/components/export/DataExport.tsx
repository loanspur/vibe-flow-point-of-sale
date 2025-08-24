import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Download, Filter, RefreshCw, Eye, X, Calendar } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface ExportJob {
  id: string;
  export_type: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  filters: any;
  file_path?: string;
  file_size?: number;
  record_count?: number;
  error_message?: string;
  created_at: string;
  completed_at?: string;
}

interface ExportFilters {
  date_from?: string;
  date_to?: string;
  status?: string;
  category?: string;
}

export default function DataExport() {
  const [exportJobs, setExportJobs] = useState<ExportJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [selectedExportType, setSelectedExportType] = useState<string>('');
  const [filters, setFilters] = useState<ExportFilters>({});
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchExportJobs();
  }, []);

  const fetchExportJobs = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.rpc('get_export_jobs');

      if (error) throw error;
      setExportJobs(data || []);
    } catch (error) {
      console.error('Error fetching export jobs:', error);
      toast({
        title: 'Error',
        description: 'Failed to load export jobs',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      
      const { data, error } = await supabase.rpc('generate_csv_export', {
        p_export_type: selectedExportType,
        p_filters: filters
      });

      if (error) throw error;
      
      toast({
        title: 'Export Started',
        description: 'Your export has been queued. You will receive a notification when it\'s ready.',
      });
      
      setIsExportDialogOpen(false);
      setSelectedExportType('');
      setFilters({});
      fetchExportJobs();
    } catch (error) {
      console.error('Error starting export:', error);
      toast({
        title: 'Error',
        description: 'Failed to start export',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleCancelExport = async (jobId: string) => {
    try {
      const { error } = await supabase.rpc('cancel_export_job', {
        p_export_id: jobId
      });

      if (error) throw error;
      
      toast({
        title: 'Success',
        description: 'Export job cancelled',
      });
      
      fetchExportJobs();
    } catch (error) {
      console.error('Error cancelling export:', error);
      toast({
        title: 'Error',
        description: 'Failed to cancel export',
        variant: 'destructive',
      });
    }
  };

  const handleDownload = async (job: ExportJob) => {
    if (!job.file_path) {
      toast({
        title: 'Error',
        description: 'No file available for download',
        variant: 'destructive',
      });
      return;
    }

    try {
      // In a real implementation, you would download the file from storage
      // For now, we'll just show a success message
      toast({
        title: 'Download Started',
        description: `Downloading ${job.export_type} export...`,
      });
    } catch (error) {
      console.error('Error downloading file:', error);
      toast({
        title: 'Error',
        description: 'Failed to download file',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: 'secondary',
      processing: 'default',
      completed: 'default',
      failed: 'destructive',
      cancelled: 'outline',
    } as const;

    return <Badge variant={variants[status as keyof typeof variants]}>{status}</Badge>;
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'N/A';
    
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const exportTypes = [
    { value: 'products', label: 'Products' },
    { value: 'orders', label: 'Orders' },
    { value: 'customers', label: 'Customers' },
    { value: 'invoices', label: 'Invoices' },
    { value: 'payments', label: 'Payments' },
    { value: 'stock_movements', label: 'Stock Movements' },
    { value: 'audit_logs', label: 'Audit Logs' },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading export jobs...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Data Export</h2>
          <p className="text-muted-foreground">
            Export your data to CSV format for analysis and backup
          </p>
        </div>
        <div className="flex space-x-2">
          <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Download className="mr-2 h-4 w-4" />
                New Export
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Export</DialogTitle>
                <DialogDescription>
                  Select the data type and filters for your export
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Export Type</label>
                  <Select
                    value={selectedExportType}
                    onValueChange={setSelectedExportType}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select export type" />
                    </SelectTrigger>
                    <SelectContent>
                      {exportTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Date From</label>
                    <Input
                      type="date"
                      value={filters.date_from || ''}
                      onChange={(e) => setFilters(prev => ({
                        ...prev,
                        date_from: e.target.value || undefined
                      }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Date To</label>
                    <Input
                      type="date"
                      value={filters.date_to || ''}
                      onChange={(e) => setFilters(prev => ({
                        ...prev,
                        date_to: e.target.value || undefined
                      }))}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Status</label>
                  <Select
                    value={filters.status || ''}
                    onValueChange={(value) => setFilters(prev => ({
                      ...prev,
                      status: value || undefined
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All statuses</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsExportDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleExport}
                    disabled={!selectedExportType || isExporting}
                  >
                    {isExporting ? (
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="mr-2 h-4 w-4" />
                    )}
                    Start Export
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Button variant="outline" onClick={fetchExportJobs}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Export Jobs</CardTitle>
          <CardDescription>
            Monitor the status of your data exports
          </CardDescription>
        </CardHeader>
        <CardContent>
          {exportJobs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No export jobs found. Create your first export to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Filters</TableHead>
                  <TableHead>File Info</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exportJobs.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell>
                      <div className="font-medium capitalize">
                        {job.export_type.replace('_', ' ')}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(job.status)}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {job.filters && Object.keys(job.filters).length > 0 ? (
                          <div className="space-y-1">
                            {Object.entries(job.filters).map(([key, value]) => (
                              <div key={key}>
                                <span className="font-medium">{key}:</span> {String(value)}
                              </div>
                            ))}
                          </div>
                        ) : (
                          'No filters'
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {job.status === 'completed' ? (
                          <div>
                            <div>Size: {formatFileSize(job.file_size)}</div>
                            <div>Records: {job.record_count?.toLocaleString() || 'N/A'}</div>
                          </div>
                        ) : (
                          'N/A'
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center text-sm">
                        <Calendar className="mr-1 h-4 w-4" />
                        {formatDate(job.created_at)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        {job.status === 'completed' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownload(job)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                        {job.status === 'pending' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCancelExport(job.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                        {job.error_message && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              toast({
                                title: 'Export Error',
                                description: job.error_message,
                                variant: 'destructive',
                              });
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
