import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { recalculateInventoryLevels } from '@/lib/inventory-integration';
import { RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react';

interface RecalculationResult {
  productName: string;
  sku: string;
  calculatedStock: number;
  calculatedPurchasePrice: number;
  success: boolean;
}

export default function InventoryRecalculator() {
  const { tenantId } = useAuth();
  const { toast } = useToast();
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [results, setResults] = useState<RecalculationResult[]>([]);
  const [hasRecalculated, setHasRecalculated] = useState(false);

  const handleRecalculate = async () => {
    if (!tenantId) return;

    setIsRecalculating(true);
    setResults([]);
    
    try {
      const recalculationResults = await recalculateInventoryLevels(tenantId);
      
      setResults(recalculationResults.map(result => ({
        productName: result.productName,
        sku: result.sku,
        calculatedStock: result.calculatedStock,
        calculatedPurchasePrice: result.calculatedPurchasePrice,
        success: result.success
      })));

      setHasRecalculated(true);

      const successCount = recalculationResults.filter(r => r.success).length;
      const totalCount = recalculationResults.length;
      
      toast({
        title: "Inventory Recalculation Complete",
        description: `Successfully recalculated ${successCount}/${totalCount} products`,
      });

    } catch (error) {
      console.error('Recalculation error:', error);
      toast({
        title: "Recalculation Failed",
        description: "Failed to recalculate inventory. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsRecalculating(false);
    }
  };

  const updatedProducts = results.filter(r => r.success && r.calculatedPurchasePrice > 0);
  const unchangedProducts = results.filter(r => r.success && r.calculatedPurchasePrice === 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          Inventory & Purchase Price Recalculation
        </CardTitle>
        <CardDescription>
          Fix missing purchase prices by calculating them from purchase history using your stock accounting method (FIFO/LIFO/WAC).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            This will update product purchase prices based on your purchase history and stock accounting method. 
            Stock quantities will also be recalculated based on actual purchase and sales transactions.
          </AlertDescription>
        </Alert>

        <Button 
          onClick={handleRecalculate}
          disabled={isRecalculating}
          className="w-full"
        >
          {isRecalculating ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Recalculating...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Recalculate Inventory & Purchase Prices
            </>
          )}
        </Button>

        {hasRecalculated && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-800">Updated Products</span>
                </div>
                <p className="text-lg font-bold text-green-900">{updatedProducts.length}</p>
                <p className="text-xs text-green-700">Products with calculated purchase prices</p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">Unchanged Products</span>
                </div>
                <p className="text-lg font-bold text-blue-900">{unchangedProducts.length}</p>
                <p className="text-xs text-blue-700">Products with no purchase history</p>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-800">Total Processed</span>
                </div>
                <p className="text-lg font-bold text-gray-900">{results.length}</p>
                <p className="text-xs text-gray-700">All products checked</p>
              </div>
            </div>

            {updatedProducts.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium">Products with Updated Purchase Prices:</h4>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {updatedProducts.slice(0, 10).map((result, index) => (
                    <div key={index} className="flex justify-between items-center bg-green-50 p-2 rounded text-sm">
                      <span>{result.productName} ({result.sku})</span>
                      <span className="font-medium text-green-700">
                        ${result.calculatedPurchasePrice.toFixed(2)}
                      </span>
                    </div>
                  ))}
                  {updatedProducts.length > 10 && (
                    <p className="text-xs text-gray-500 text-center">
                      ... and {updatedProducts.length - 10} more products
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}