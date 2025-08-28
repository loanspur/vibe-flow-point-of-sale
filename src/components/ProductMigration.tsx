import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Upload, 
  Download, 
  FileText, 
  RefreshCw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export const ProductMigration: React.FC = () => {
  const { tenantId } = useAuth();
  const { toast } = useToast();
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const generateSKU = (name: string): string => {
    const prefix = name.substring(0, 3).toUpperCase();
    const timestamp = Date.now().toString().slice(-6);
    return `${prefix}${timestamp}`;
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
  };

  // Function to find category ID by name
  const findCategoryId = async (categoryName: string): Promise<string | null> => {
    if (!categoryName || !tenantId) return null;
    
    const { data, error } = await supabase
      .from('product_categories')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('name', categoryName.trim())
      .eq('is_active', true)
      .single();
    
    if (error || !data) return null;
    return data.id;
  };

  // Function to find unit ID by name
  const findUnitId = async (unitName: string): Promise<string | null> => {
    if (!unitName || !tenantId) return null;
    
    const { data, error } = await supabase
      .from('product_units')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('name', unitName.trim())
      .eq('is_active', true)
      .single();
    
    if (error || !data) return null;
    return data.id;
  };

  // Function to find location ID by name
  const findLocationId = async (locationName: string): Promise<string | null> => {
    if (!locationName || !tenantId) return null;
    
    const { data, error } = await supabase
      .from('store_locations')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('name', locationName.trim())
      .eq('is_active', true)
      .single();
    
    if (error || !data) return null;
    return data.id;
  };

  const handleImport = async () => {
    if (!selectedFile || !tenantId) return;

    setIsUploading(true);

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const text = e.target?.result as string;
          const lines = text.split('\n');
          
          if (lines.length < 2) {
            toast({
              title: 'Import Failed',
              description: 'CSV file must have at least a header row and one data row',
              variant: 'destructive',
            });
            setIsUploading(false);
            return;
          }

          const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
          const data = [];
          
          for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim() === '') continue;
            
            const values = lines[i].split(',').map(v => v.trim());
            const row: any = {};
            
            headers.forEach((header, index) => {
              row[header] = values[index] || '';
            });

            // Skip rows without name
            if (!row.name || !row.name.trim()) continue;

            // Process the row with enhanced pricing fields
            row.sku = row.sku || generateSKU(row.name);
            row.cost_price = parseFloat(row.cost_price) || 0;
            row.retail_price = parseFloat(row.price) || parseFloat(row.retail_price) || 0; // Map 'price' to 'retail_price'
            row.wholesale_price = parseFloat(row.wholesale_price) || 0;
            row.stock_quantity = parseInt(row.stock_quantity) || 0;
            
            data.push(row);
          }

          if (data.length === 0) {
            toast({
              title: 'Import Failed',
              description: 'No valid products found in CSV file',
              variant: 'destructive',
            });
            setIsUploading(false);
            return;
          }

          // Import products with enhanced pricing fields and proper ID mapping
          let successful = 0;
          let failed = 0;
          let skipped = 0;

          for (const row of data) {
            try {
              // Find category, unit, and location IDs by name
              const categoryId = row.category ? await findCategoryId(row.category) : null;
              const unitId = row.unit ? await findUnitId(row.unit) : null;
              const locationId = row.location ? await findLocationId(row.location) : null;

              // Skip if required fields are missing
              if (!row.name || row.retail_price <= 0) {
                console.warn('Skipping product due to missing required fields:', row.name);
                skipped++;
                continue;
              }

              const productData = {
                tenant_id: tenantId,
                name: row.name,
                description: row.description || '',
                sku: row.sku,
                cost_price: row.cost_price,
                retail_price: row.retail_price,
                wholesale_price: row.wholesale_price,
                price: row.retail_price, // Set main price to retail price for backward compatibility
                stock_quantity: row.stock_quantity,
                category_id: categoryId,
                unit_id: unitId,
                location_id: locationId,
                is_active: true
              };

              const { error } = await supabase
                .from('products')
                .insert(productData);

              if (error) {
                console.error('Database error for product:', row.name, error);
                failed++;
              } else {
                successful++;
              }
            } catch (error) {
              console.error('Error importing product:', row.name, error);
              failed++;
            }
          }

          toast({
            title: 'Import Completed',
            description: `Successfully imported ${successful} products${failed > 0 ? `, ${failed} failed` : ''}${skipped > 0 ? `, ${skipped} skipped` : ''}`,
            variant: failed > 0 ? 'destructive' : 'default',
          });

          setSelectedFile(null);

        } catch (error) {
          toast({
            title: 'Import Failed',
            description: 'Failed to process CSV file',
            variant: 'destructive',
          });
        } finally {
          setIsUploading(false);
        }
      };

      reader.onerror = () => {
        toast({
          title: 'File Read Error',
          description: 'Failed to read the selected file',
          variant: 'destructive',
        });
        setIsUploading(false);
      };

      reader.readAsText(selectedFile);

    } catch (error) {
      toast({
        title: 'Import Failed',
        description: 'Failed to start import',
        variant: 'destructive',
      });
      setIsUploading(false);
    }
  };

  const handleExport = async () => {
    if (!tenantId) return;

    setIsExporting(true);

    try {
      const { data: products, error: fetchError } = await supabase
        .from('products')
        .select(`
          *,
          product_categories(name),
          product_units(name),
          store_locations(name)
        `)
        .eq('tenant_id', tenantId)
        .eq('is_active', true);

      if (fetchError) throw fetchError;

      const headers = ['name', 'description', 'sku', 'cost_price', 'price', 'wholesale_price', 'stock_quantity', 'category', 'unit', 'location'];
      
      const csvContent = [
        headers.join(','),
        ...products.map(product => [
          product.name,
          product.description || '',
          product.sku || '',
          product.cost_price || 0,
          product.retail_price || product.price || 0, // Export as 'price' for compatibility
          product.wholesale_price || 0,
          product.stock_quantity || 0,
          product.product_categories?.name || '',
          product.product_units?.name || '',
          product.store_locations?.name || ''
        ].join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `products_export_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: 'Export Completed',
        description: `Successfully exported ${products.length} products`,
      });

    } catch (error) {
      toast({
        title: 'Export Failed',
        description: 'Failed to export products',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const downloadSampleTemplate = () => {
    const headers = ['name', 'description', 'sku', 'cost_price', 'price', 'wholesale_price', 'stock_quantity', 'category', 'unit', 'location'];
    const sampleData = [
      {
        name: 'Sample Product 1',
        description: 'This is a sample product description',
        sku: '',
        cost_price: '50.00',
        price: '100.00', // This maps to retail_price in our system
        wholesale_price: '80.00',
        stock_quantity: '50',
        category: 'Electronics',
        unit: 'Pieces',
        location: 'Main Store'
      },
      {
        name: 'Sample Product 2',
        description: 'Another sample product',
        sku: '',
        cost_price: '30.00',
        price: '75.50', // This maps to retail_price in our system
        wholesale_price: '60.00',
        stock_quantity: '25',
        category: 'Clothing',
        unit: 'Units',
        location: 'Warehouse'
      }
    ];

    const csvContent = [
      headers.join(','),
      ...sampleData.map(row => [
        row.name,
        row.description,
        row.sku,
        row.cost_price,
        row.price,
        row.wholesale_price,
        row.stock_quantity,
        row.category,
        row.unit,
        row.location
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'product_migration_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Product Migration</h2>
          <p className="text-muted-foreground">
            Import and export product data using CSV files. The 'price' column maps to retail price in our system.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={downloadSampleTemplate}>
            <Download className="h-4 w-4 mr-2" />
            Download Template
          </Button>
        </div>
      </div>

      <Alert>
        <AlertDescription>
          <strong>Important:</strong> The 'price' column in the CSV maps to 'Retail Price' in our system. 
          Categories, units, and locations will be matched by name. Make sure these exist in your system before importing.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="import" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="import">Import Products</TabsTrigger>
          <TabsTrigger value="export">Export Products</TabsTrigger>
        </TabsList>

        <TabsContent value="import" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Import Products
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="file-upload">Select CSV File</Label>
                <Input
                  id="file-upload"
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  disabled={isUploading}
                />
                <p className="text-sm text-muted-foreground">
                  Select a CSV file with product data. First row should contain column headers.
                  <br />
                  <strong>Required columns:</strong> name, price (maps to retail price)
                  <br />
                  <strong>Optional columns:</strong> description, sku, cost_price, wholesale_price, stock_quantity, category, unit, location
                </p>
              </div>

              {selectedFile && (
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm">
                    <strong>Selected file:</strong> {selectedFile.name}
                  </p>
                </div>
              )}

              <Button 
                onClick={handleImport} 
                disabled={!selectedFile || isUploading}
                className="w-full"
              >
                {isUploading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Import Products
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="export" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Export Products
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Export all active products to a CSV file. The exported file will include all product data including categories, units, and locations.
              </p>

              <Button 
                onClick={handleExport} 
                disabled={isExporting}
                className="w-full"
              >
                {isExporting ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Export Products
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
