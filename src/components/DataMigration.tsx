import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, 
  Download, 
  FileText, 
  Users, 
  Package, 
  FolderOpen, 
  Database,
  CheckCircle,
  AlertCircle,
  Info
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface MigrationResult {
  success: number;
  failed: number;
  errors: string[];
}

interface ImportPreview {
  headers: string[];
  rows: any[][];
  totalRows: number;
}

export const DataMigration: React.FC = () => {
  const [activeTab, setActiveTab] = useState('import');
  const [importType, setImportType] = useState<'contacts' | 'products' | 'categories' | 'inventory'>('contacts');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<MigrationResult | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast({
        title: "Invalid File",
        description: "Please select a CSV file.",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
    
    // Preview the file
    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length === 0) return;

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const rows = lines.slice(1, 6).map(line => 
      line.split(',').map(cell => cell.trim().replace(/"/g, ''))
    );

    setPreview({
      headers,
      rows,
      totalRows: lines.length - 1
    });
  }, [toast]);

  const validateContactsData = (headers: string[]) => {
    const requiredFields = ['name', 'type'];
    const optionalFields = ['email', 'phone', 'company', 'address', 'notes'];
    return validateHeaders(headers, requiredFields, optionalFields);
  };

  const validateProductsData = (headers: string[]) => {
    const requiredFields = ['name', 'price'];
    const optionalFields = ['description', 'sku', 'barcode', 'cost_price', 'stock_quantity', 'category', 'brand'];
    return validateHeaders(headers, requiredFields, optionalFields);
  };

  const validateCategoriesData = (headers: string[]) => {
    const requiredFields = ['name'];
    const optionalFields = ['description', 'color'];
    return validateHeaders(headers, requiredFields, optionalFields);
  };

  const validateInventoryData = (headers: string[]) => {
    const requiredFields = ['product_name', 'quantity'];
    const optionalFields = ['sku', 'location', 'notes'];
    return validateHeaders(headers, requiredFields, optionalFields);
  };

  const validateHeaders = (headers: string[], required: string[], optional: string[]) => {
    const lowerHeaders = headers.map(h => h.toLowerCase());
    const missing = required.filter(field => !lowerHeaders.includes(field.toLowerCase()));
    const valid = lowerHeaders.filter(h => 
      required.some(r => r.toLowerCase() === h) || 
      optional.some(o => o.toLowerCase() === h)
    );
    
    return { missing, valid: valid.length, total: headers.length };
  };

  const processImport = async () => {
    if (!selectedFile || !preview) return;

    setIsProcessing(true);
    setProgress(0);
    setResult(null);

    try {
      const text = await selectedFile.text();
      const lines = text.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, '').toLowerCase());
      
      let success = 0;
      let failed = 0;
      const errors: string[] = [];

      for (let i = 1; i < lines.length; i++) {
        const cells = lines[i].split(',').map(cell => cell.trim().replace(/"/g, ''));
        const rowData: any = {};
        
        headers.forEach((header, index) => {
          rowData[header] = cells[index] || '';
        });

        try {
          await processRow(rowData, importType);
          success++;
        } catch (error) {
          failed++;
          errors.push(`Row ${i}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }

        setProgress((i / (lines.length - 1)) * 100);
      }

      setResult({ success, failed, errors });
      
      toast({
        title: "Import Complete",
        description: `Successfully imported ${success} records. ${failed} failed.`,
      });

    } catch (error) {
      toast({
        title: "Import Error",
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const processRow = async (data: any, type: string) => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('user_id', user?.id)
      .single();

    if (!profile?.tenant_id) throw new Error('Tenant not found');

    switch (type) {
      case 'contacts':
        return await supabase.from('contacts').insert({
          tenant_id: profile.tenant_id,
          name: data.name,
          type: data.type || 'customer',
          email: data.email || null,
          phone: data.phone || null,
          company: data.company || null,
          address: data.address || null,
          notes: data.notes || null,
        });

      case 'categories':
        return await supabase.from('product_categories').insert({
          tenant_id: profile.tenant_id,
          name: data.name,
          description: data.description || null,
          color: data.color || null,
        });

      case 'products':
        // Get or create category if specified
        let categoryId = null;
        if (data.category) {
          const { data: category } = await supabase
            .from('product_categories')
            .select('id')
            .eq('name', data.category)
            .eq('tenant_id', profile.tenant_id)
            .single();
          
          if (category) {
            categoryId = category.id;
          }
        }

        return await supabase.from('products').insert({
          tenant_id: profile.tenant_id,
          name: data.name,
          description: data.description || null,
          price: parseFloat(data.price) || 0,
          cost_price: data.cost_price ? parseFloat(data.cost_price) : null,
          sku: data.sku || null,
          barcode: data.barcode || null,
          stock_quantity: data.stock_quantity ? parseInt(data.stock_quantity) : 0,
          category_id: categoryId,
          is_active: true,
        });

      case 'inventory':
        // Find product by name or SKU
        let query = supabase
          .from('products')
          .select('id')
          .eq('tenant_id', profile.tenant_id);

        if (data.sku) {
          query = query.eq('sku', data.sku);
        } else {
          query = query.eq('name', data.product_name);
        }

        const { data: product } = await query.single();
        
        if (!product) throw new Error(`Product not found: ${data.product_name || data.sku}`);

        // Update stock quantity
        return await supabase
          .from('products')
          .update({ 
            stock_quantity: parseInt(data.quantity) || 0 
          })
          .eq('id', product.id);

      default:
        throw new Error('Invalid import type');
    }
  };

  const exportData = async () => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('user_id', user?.id)
        .single();

      if (!profile?.tenant_id) throw new Error('Tenant not found');

      let data: any[] = [];
      let filename = '';
      let headers: string[] = [];

      switch (importType) {
        case 'contacts':
          const { data: contacts } = await supabase
            .from('contacts')
            .select('*')
            .eq('tenant_id', profile.tenant_id);
          
          data = contacts || [];
          headers = ['name', 'type', 'email', 'phone', 'company', 'address', 'notes'];
          filename = 'contacts_export.csv';
          break;

        case 'categories':
          const { data: categories } = await supabase
            .from('product_categories')
            .select('*')
            .eq('tenant_id', profile.tenant_id);
          
          data = categories || [];
          headers = ['name', 'description', 'color'];
          filename = 'categories_export.csv';
          break;

        case 'products':
          const { data: products } = await supabase
            .from('products')
            .select('*, product_categories(name)')
            .eq('tenant_id', profile.tenant_id);
          
          data = (products || []).map(p => ({
            ...p,
            category: p.product_categories?.name || ''
          }));
          headers = ['name', 'description', 'price', 'cost_price', 'sku', 'barcode', 'stock_quantity', 'category'];
          filename = 'products_export.csv';
          break;

        case 'inventory':
          const { data: inventory } = await supabase
            .from('products')
            .select('name, sku, stock_quantity')
            .eq('tenant_id', profile.tenant_id);
          
          data = (inventory || []).map(p => ({
            product_name: p.name,
            sku: p.sku || '',
            quantity: p.stock_quantity
          }));
          headers = ['product_name', 'sku', 'quantity'];
          filename = 'inventory_export.csv';
          break;
      }

      // Generate CSV
      const csvContent = [
        headers.join(','),
        ...data.map(row => 
          headers.map(header => {
            const value = row[header] || '';
            return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
          }).join(',')
        )
      ].join('\n');

      // Download file
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: "Export Complete",
        description: `Successfully exported ${data.length} records.`,
      });

    } catch (error) {
      toast({
        title: "Export Error",
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: "destructive",
      });
    }
  };

  const getValidationStatus = () => {
    if (!preview) return null;

    let validation;
    switch (importType) {
      case 'contacts':
        validation = validateContactsData(preview.headers);
        break;
      case 'products':
        validation = validateProductsData(preview.headers);
        break;
      case 'categories':
        validation = validateCategoriesData(preview.headers);
        break;
      case 'inventory':
        validation = validateInventoryData(preview.headers);
        break;
      default:
        return null;
    }

    return validation;
  };

  const validation = getValidationStatus();

  return (
    <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/50">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-xl">
          <Database className="h-5 w-5 text-primary" />
          Data Migration Center
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="import">Import Data</TabsTrigger>
            <TabsTrigger value="export">Export Data</TabsTrigger>
          </TabsList>

          <TabsContent value="import" className="space-y-6">
            {/* Data Type Selection */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { type: 'contacts', icon: Users, label: 'Contacts', desc: 'Customers & Suppliers' },
                { type: 'categories', icon: FolderOpen, label: 'Categories', desc: 'Product Categories' },
                { type: 'products', icon: Package, label: 'Products', desc: 'Product Catalog' },
                { type: 'inventory', icon: Database, label: 'Inventory', desc: 'Stock Quantities' },
              ].map(({ type, icon: Icon, label, desc }) => (
                <Card 
                  key={type}
                  className={`cursor-pointer transition-all ${
                    importType === type ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-muted/50'
                  }`}
                  onClick={() => setImportType(type as any)}
                >
                  <CardContent className="p-4 text-center">
                    <Icon className="h-8 w-8 mx-auto mb-2 text-primary" />
                    <h3 className="font-medium">{label}</h3>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* File Upload */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Upload CSV File
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="csv-file">Select CSV File</Label>
                  <Input
                    id="csv-file"
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    disabled={isProcessing}
                  />
                </div>

                {/* Required Fields Info */}
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Required fields for {importType}:</strong>
                    <br />
                    {importType === 'contacts' && 'name, type (customer/supplier)'}
                    {importType === 'products' && 'name, price'}
                    {importType === 'categories' && 'name'}
                    {importType === 'inventory' && 'product_name (or sku), quantity'}
                  </AlertDescription>
                </Alert>

                {/* Preview */}
                {preview && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">File Preview</h4>
                      <Badge variant="outline">{preview.totalRows} rows</Badge>
                    </div>

                    {/* Validation Status */}
                    {validation && (
                      <Alert className={validation.missing.length > 0 ? "border-destructive" : "border-green-500"}>
                        {validation.missing.length > 0 ? (
                          <AlertCircle className="h-4 w-4 text-destructive" />
                        ) : (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        )}
                        <AlertDescription>
                          {validation.missing.length > 0 ? (
                            <>Missing required fields: {validation.missing.join(', ')}</>
                          ) : (
                            <>All required fields present. Ready to import!</>
                          )}
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Headers */}
                    <div className="overflow-x-auto">
                      <table className="w-full border border-border rounded-md">
                        <thead className="bg-muted">
                          <tr>
                            {preview.headers.map((header, index) => (
                              <th key={index} className="p-2 text-left border-b text-sm font-medium">
                                {header}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {preview.rows.map((row, rowIndex) => (
                            <tr key={rowIndex} className="border-b">
                              {row.map((cell, cellIndex) => (
                                <td key={cellIndex} className="p-2 text-sm">
                                  {cell}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Import Button */}
                    <div className="flex gap-2">
                      <Button 
                        onClick={processImport}
                        disabled={isProcessing || (validation?.missing.length || 0) > 0}
                        className="flex-1"
                      >
                        {isProcessing ? 'Importing...' : 'Start Import'}
                      </Button>
                    </div>

                    {/* Progress */}
                    {isProcessing && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Import Progress</span>
                          <span>{Math.round(progress)}%</span>
                        </div>
                        <Progress value={progress} />
                      </div>
                    )}

                    {/* Results */}
                    {result && (
                      <Alert className={result.failed > 0 ? "border-yellow-500" : "border-green-500"}>
                        <CheckCircle className="h-4 w-4" />
                        <AlertDescription>
                          <div className="space-y-2">
                            <div>
                              Import completed: {result.success} successful, {result.failed} failed
                            </div>
                            {result.errors.length > 0 && (
                              <details className="mt-2">
                                <summary className="cursor-pointer text-sm font-medium">
                                  View Errors ({result.errors.length})
                                </summary>
                                <div className="mt-2 space-y-1 text-xs">
                                  {result.errors.slice(0, 10).map((error, index) => (
                                    <div key={index} className="text-destructive">{error}</div>
                                  ))}
                                  {result.errors.length > 10 && (
                                    <div className="text-muted-foreground">
                                      ... and {result.errors.length - 10} more errors
                                    </div>
                                  )}
                                </div>
                              </details>
                            )}
                          </div>
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="export" className="space-y-6">
            {/* Data Type Selection */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { type: 'contacts', icon: Users, label: 'Contacts', desc: 'Export all contacts' },
                { type: 'categories', icon: FolderOpen, label: 'Categories', desc: 'Export categories' },
                { type: 'products', icon: Package, label: 'Products', desc: 'Export product catalog' },
                { type: 'inventory', icon: Database, label: 'Inventory', desc: 'Export stock levels' },
              ].map(({ type, icon: Icon, label, desc }) => (
                <Card 
                  key={type}
                  className={`cursor-pointer transition-all ${
                    importType === type ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-muted/50'
                  }`}
                  onClick={() => setImportType(type as any)}
                >
                  <CardContent className="p-4 text-center">
                    <Icon className="h-8 w-8 mx-auto mb-2 text-primary" />
                    <h3 className="font-medium">{label}</h3>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Export Options */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Export {importType.charAt(0).toUpperCase() + importType.slice(1)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Alert>
                    <FileText className="h-4 w-4" />
                    <AlertDescription>
                      This will export all your {importType} data as a CSV file that can be imported later or used in other systems.
                    </AlertDescription>
                  </Alert>

                  <Button onClick={exportData} className="w-full">
                    <Download className="h-4 w-4 mr-2" />
                    Export {importType.charAt(0).toUpperCase() + importType.slice(1)} Data
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};