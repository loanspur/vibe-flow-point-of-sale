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
  Info,
  FileDown,
  RotateCcw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { MigrationService, MigrationResult, ImportPreview } from '@/lib/migration-service';

export const UnifiedMigration: React.FC = () => {
  const { tenantId } = useAuth();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState('import');
  const [importType, setImportType] = useState<'products' | 'contacts' | 'categories'>('products');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<MigrationResult | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);

  const migrationService = new MigrationService(tenantId!);

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
    
    try {
      // Preview the file
      const previewData = await migrationService.previewCSV(file, importType);
      setPreview(previewData);
      
      if (!previewData.validation.isValid) {
        toast({
          title: "Validation Warning",
          description: `Missing required fields: ${previewData.validation.missing.join(', ')}`,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Preview Error",
        description: error instanceof Error ? error.message : 'Failed to preview file',
        variant: "destructive",
      });
      setSelectedFile(null);
    }
  }, [importType, migrationService, toast]);

  const handleImport = async () => {
    if (!selectedFile || !tenantId) return;

    setIsProcessing(true);
    setProgress(0);
    setResult(null);

    try {
      let importResult: MigrationResult;

      switch (importType) {
        case 'products':
          importResult = await migrationService.importProducts(selectedFile);
          break;
        case 'contacts':
          importResult = await migrationService.importContacts(selectedFile);
          break;
        case 'categories':
          importResult = await migrationService.importCategories(selectedFile);
          break;
        default:
          throw new Error('Invalid import type');
      }

      setResult(importResult);
      
      const resultMessage = importResult.failed === 0 
        ? `Successfully imported all ${importResult.success} records!`
        : `Import completed: ${importResult.success} successful, ${importResult.failed} failed. Check details below.`;
      
      toast({
        title: "Import Complete",
        description: resultMessage,
        variant: importResult.failed > 0 ? "destructive" : "default",
      });

    } catch (error) {
      console.error('Migration import error:', error);
      
      // Enhanced error handling with detailed information
      let errorMessage = 'Unknown error occurred';
      let errorDetails = '';
      
      if (error instanceof Error) {
        errorMessage = error.message;
        errorDetails = error.stack || '';
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error && typeof error === 'object') {
        errorMessage = JSON.stringify(error);
      }
      
      // Log detailed error for debugging
      console.error('Migration error details:', {
        error,
        message: errorMessage,
        stack: errorDetails,
        importType,
        fileName: selectedFile?.name
      });
      
      toast({
        title: "Import Error",
        description: `Migration failed: ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setProgress(100);
    }
  };

  const handleExport = async () => {
    if (!tenantId) return;

    setIsProcessing(true);

    try {
      let exportResult: { csvContent: string; fileName: string };

      switch (importType) {
        case 'products':
          exportResult = await migrationService.exportProducts();
          break;
        case 'contacts':
          exportResult = await migrationService.exportContacts();
          break;
        case 'categories':
          exportResult = await migrationService.exportCategories();
          break;
        default:
          throw new Error('Invalid export type');
      }

      migrationService.downloadCSV(exportResult.csvContent, exportResult.fileName);

      toast({
        title: "Export Complete",
        description: `Successfully exported ${importType}`,
      });

    } catch (error) {
      toast({
        title: "Export Error",
        description: error instanceof Error ? error.message : 'Failed to export data',
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadTemplate = () => {
    try {
      const template = migrationService.generateTemplate(importType);
      migrationService.downloadCSV(template.csvContent, template.fileName);
      
      toast({
        title: "Template Downloaded",
        description: `Downloaded ${importType} migration template`,
      });
    } catch (error) {
      toast({
        title: "Template Download Error",
        description: error instanceof Error ? error.message : 'Failed to download template',
        variant: "destructive",
      });
    }
  };

  const getEntityIcon = (type: string) => {
    switch (type) {
      case 'products': return <Package className="h-4 w-4" />;
      case 'contacts': return <Users className="h-4 w-4" />;
      case 'categories': return <FolderOpen className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getEntityLabel = (type: string) => {
    switch (type) {
      case 'products': return 'Products';
      case 'contacts': return 'Contacts';
      case 'categories': return 'Categories';
      default: return type;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Data Migration</h2>
          <p className="text-muted-foreground">
            Import and export data using CSV files. Supports products, contacts, and categories.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={downloadTemplate} className="flex items-center gap-2">
            <FileDown className="h-4 w-4" />
            <span>Download {getEntityLabel(importType)} Template</span>
          </Button>
        </div>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Important:</strong> Make sure your CSV file has the correct headers. 
          Download the template to see the required format. Categories, units, and locations 
          will be matched by name and must exist in your system before importing.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="import" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="import">Import Data</TabsTrigger>
          <TabsTrigger value="export">Export Data</TabsTrigger>
        </TabsList>

        <TabsContent value="import" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Import {getEntityLabel(importType)}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Entity Type Selection */}
              <div className="space-y-2">
                <Label>Select Data Type</Label>
                <div className="flex gap-2">
                  {(['products', 'contacts', 'categories'] as const).map((type) => (
                    <Button
                      key={type}
                      variant={importType === type ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setImportType(type);
                        setSelectedFile(null);
                        setPreview(null);
                      }}
                      className="flex items-center gap-2"
                    >
                      {getEntityIcon(type)}
                      {getEntityLabel(type)}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Template Download Section */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-blue-900">Need a template?</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      Download a sample CSV template for {getEntityLabel(importType)} to see the required format.
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={downloadTemplate}
                    className="border-blue-300 text-blue-700 hover:bg-blue-100"
                  >
                    <FileDown className="h-4 w-4 mr-2" />
                    Download Template
                  </Button>
                </div>
              </div>

              {/* File Selection */}
              <div className="space-y-2">
                <Label htmlFor="file-upload">Select CSV File</Label>
                <Input
                  id="file-upload"
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  disabled={isProcessing}
                />
                <p className="text-sm text-muted-foreground">
                  Select a CSV file with {importType} data. First row should contain column headers.
                </p>
              </div>

              {/* File Preview */}
              {selectedFile && preview && (
                <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">
                      <strong>Selected file:</strong> {selectedFile.name}
                    </p>
                    <Badge variant={preview.validation.isValid ? "default" : "destructive"}>
                      {preview.validation.isValid ? "Valid" : "Invalid"}
                    </Badge>
                  </div>
                  
                  <div className="text-sm text-muted-foreground">
                    <p>Total rows: {preview.totalRows}</p>
                    <p>Valid columns: {preview.validation.valid}/{preview.validation.total}</p>
                    {preview.validation.missing.length > 0 && (
                      <p className="text-destructive">
                        Missing: {preview.validation.missing.join(', ')}
                      </p>
                    )}
                  </div>

                  {/* Preview Table */}
                  {preview.rows.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs border-collapse">
                        <thead>
                          <tr className="border-b">
                            {preview.headers.map((header, index) => (
                              <th key={index} className="text-left p-2 font-medium">
                                {header}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {preview.rows.map((row, rowIndex) => (
                            <tr key={rowIndex} className="border-b">
                              {row.map((cell, cellIndex) => (
                                <td key={cellIndex} className="p-2">
                                  {cell}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Progress Bar */}
              {isProcessing && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Processing...</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <Progress value={progress} />
                </div>
              )}

              {/* Import Button */}
              <Button 
                onClick={handleImport} 
                disabled={!selectedFile || isProcessing || (preview && !preview.validation.isValid)}
                className="w-full"
              >
                {isProcessing ? (
                  <>
                    <RotateCcw className="h-4 w-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Import {getEntityLabel(importType)}
                  </>
                )}
              </Button>

              {/* Results */}
              {result && (
                <div className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Import Results</h4>
                    <Badge variant={result.failed === 0 ? "default" : "destructive"}>
                      {result.failed === 0 ? "Success" : "Partial"}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      <span>Successful: {result.success}</span>
                    </div>
                    {result.failed > 0 && (
                      <div className="flex items-center gap-2 text-red-600">
                        <AlertCircle className="h-4 w-4" />
                        <span>Failed: {result.failed}</span>
                      </div>
                    )}
                  </div>

                  {result.errors.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-red-600">Errors:</p>
                      <div className="max-h-32 overflow-y-auto space-y-1">
                        {result.errors.slice(0, 5).map((error, index) => (
                          <p key={index} className="text-xs text-red-600">{error}</p>
                        ))}
                        {result.errors.length > 5 && (
                          <p className="text-xs text-muted-foreground">
                            ... and {result.errors.length - 5} more errors
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="export" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Export {getEntityLabel(importType)}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Entity Type Selection for Export */}
              <div className="space-y-2">
                <Label>Select Data Type</Label>
                <div className="flex gap-2">
                  {(['products', 'contacts', 'categories'] as const).map((type) => (
                    <Button
                      key={type}
                      variant={importType === type ? "default" : "outline"}
                      size="sm"
                      onClick={() => setImportType(type)}
                      className="flex items-center gap-2"
                    >
                      {getEntityIcon(type)}
                      {getEntityLabel(type)}
                    </Button>
                  ))}
                </div>
              </div>

              <p className="text-sm text-muted-foreground">
                Export all {importType} to a CSV file. The exported file will include all data 
                including related information like categories, units, and locations.
              </p>

              <Button 
                onClick={handleExport} 
                disabled={isProcessing}
                className="w-full"
              >
                {isProcessing ? (
                  <>
                    <RotateCcw className="h-4 w-4 mr-2 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Export {getEntityLabel(importType)}
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
