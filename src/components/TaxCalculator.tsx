import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calculator, DollarSign, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useApp } from "@/contexts/AppContext";

interface TaxRate {
  id: string;
  name: string;
  rate_percentage: number;
  tax_type: {
    name: string;
    is_compound: boolean;
    is_inclusive: boolean;
  };
  jurisdiction: {
    name: string;
  } | null;
}

interface TaxCalculation {
  tax_rate_id: string;
  rate_name: string;
  base_amount: number;
  tax_rate: number;
  tax_amount: number;
  final_amount: number;
}

export const TaxCalculator = () => {
  const [taxRates, setTaxRates] = useState<TaxRate[]>([]);
  const [baseAmount, setBaseAmount] = useState<number>(0);
  const [selectedTaxRates, setSelectedTaxRates] = useState<string[]>([]);
  const [calculations, setCalculations] = useState<TaxCalculation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { formatCurrency } = useApp();

  useEffect(() => {
    fetchTaxRates();
  }, []);

  useEffect(() => {
    if (baseAmount > 0 && selectedTaxRates.length > 0) {
      calculateTaxes();
    } else {
      setCalculations([]);
    }
  }, [baseAmount, selectedTaxRates, taxRates]);

  const fetchTaxRates = async () => {
    try {
      const { data, error } = await supabase
        .from('tax_rates')
        .select(`
          id,
          name,
          rate_percentage,
          tax_type:tax_types(name, is_compound, is_inclusive),
          jurisdiction:tax_jurisdictions(name)
        `)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      if (data) setTaxRates(data);
    } catch (error) {
      console.error('Error fetching tax rates:', error);
      toast({
        title: "Error",
        description: "Failed to load tax rates",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const calculateTaxes = () => {
    const newCalculations: TaxCalculation[] = [];
    let runningTotal = baseAmount;

    // Sort tax rates - non-compound first, then compound
    const sortedRates = selectedTaxRates
      .map(id => taxRates.find(rate => rate.id === id))
      .filter(Boolean)
      .sort((a, b) => {
        if (a!.tax_type.is_compound === b!.tax_type.is_compound) return 0;
        return a!.tax_type.is_compound ? 1 : -1;
      });

    for (const rate of sortedRates) {
      if (!rate) continue;

      let taxBase = rate.tax_type.is_compound ? runningTotal : baseAmount;
      
      if (rate.tax_type.is_inclusive) {
        // For inclusive taxes, the tax is already included in the base amount
        const taxAmount = (taxBase * rate.rate_percentage) / (100 + rate.rate_percentage);
        newCalculations.push({
          tax_rate_id: rate.id,
          rate_name: rate.name,
          base_amount: taxBase,
          tax_rate: rate.rate_percentage,
          tax_amount: taxAmount,
          final_amount: taxBase
        });
      } else {
        // For exclusive taxes, add the tax to the base amount
        const taxAmount = (taxBase * rate.rate_percentage) / 100;
        newCalculations.push({
          tax_rate_id: rate.id,
          rate_name: rate.name,
          base_amount: taxBase,
          tax_rate: rate.rate_percentage,
          tax_amount: taxAmount,
          final_amount: taxBase + taxAmount
        });
        
        if (rate.tax_type.is_compound) {
          runningTotal += taxAmount;
        }
      }
    }

    setCalculations(newCalculations);
  };

  const getTotalTax = () => {
    return calculations.reduce((sum, calc) => sum + calc.tax_amount, 0);
  };

  const getFinalTotal = () => {
    const hasInclusive = calculations.some(calc => 
      taxRates.find(rate => rate.id === calc.tax_rate_id)?.tax_type.is_inclusive
    );
    
    if (hasInclusive) {
      return baseAmount;
    }
    
    return baseAmount + getTotalTax();
  };

  const clearCalculation = () => {
    setBaseAmount(0);
    setSelectedTaxRates([]);
    setCalculations([]);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Calculator className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p>Loading tax calculator...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Tax Calculator</h2>
        <p className="text-muted-foreground">
          Calculate taxes for any amount using your configured tax rates
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Calculation Input
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Base Amount</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={baseAmount || ""}
                onChange={(e) => setBaseAmount(parseFloat(e.target.value) || 0)}
                placeholder="Enter amount to calculate tax for"
              />
            </div>

            <div>
              <Label>Select Tax Rates</Label>
              <Select
                value=""
                onValueChange={(value) => {
                  if (value && !selectedTaxRates.includes(value)) {
                    setSelectedTaxRates([...selectedTaxRates, value]);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Add tax rate" />
                </SelectTrigger>
                <SelectContent>
                  {taxRates
                    .filter(rate => !selectedTaxRates.includes(rate.id))
                    .map((rate) => (
                    <SelectItem key={rate.id} value={rate.id}>
                      {rate.name} ({rate.rate_percentage}%) - {rate.tax_type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Selected Tax Rates */}
            {selectedTaxRates.length > 0 && (
              <div>
                <Label>Selected Tax Rates</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedTaxRates.map((rateId) => {
                    const rate = taxRates.find(r => r.id === rateId);
                    if (!rate) return null;
                    
                    return (
                      <Badge
                        key={rateId}
                        variant="secondary"
                        className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                        onClick={() => setSelectedTaxRates(selectedTaxRates.filter(id => id !== rateId))}
                      >
                        {rate.name} ({rate.rate_percentage}%)
                        {rate.tax_type.is_compound && " (Compound)"}
                        {rate.tax_type.is_inclusive && " (Inclusive)"}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={clearCalculation} variant="outline" className="flex-1">
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Tax Calculation Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            {calculations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calculator className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Enter a base amount and select tax rates to see calculations</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Base Amount */}
                <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                  <span className="font-medium">Base Amount:</span>
                  <span className="text-lg font-semibold">
                    {formatCurrency ? formatCurrency(baseAmount) : `$${baseAmount.toFixed(2)}`}
                  </span>
                </div>

                {/* Individual Tax Calculations */}
                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                    Tax Breakdown
                  </h4>
                  {calculations.map((calc) => {
                    const rate = taxRates.find(r => r.id === calc.tax_rate_id);
                    return (
                      <div key={calc.tax_rate_id} className="border rounded-lg p-3 space-y-2">
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="font-medium">{calc.rate_name}</span>
                            <div className="flex gap-1 mt-1">
                              <Badge variant="outline">
                                {calc.tax_rate}%
                              </Badge>
                              {rate?.tax_type.is_compound && (
                                <Badge variant="outline">Compound</Badge>
                              )}
                              {rate?.tax_type.is_inclusive && (
                                <Badge variant="outline">Inclusive</Badge>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold">
                              {formatCurrency ? formatCurrency(calc.tax_amount) : `$${calc.tax_amount.toFixed(2)}`}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              on {formatCurrency ? formatCurrency(calc.base_amount) : `$${calc.base_amount.toFixed(2)}`}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Totals */}
                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Total Tax:</span>
                    <span className="text-lg font-semibold text-primary">
                      {formatCurrency ? formatCurrency(getTotalTax()) : `$${getTotalTax().toFixed(2)}`}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-primary/10 rounded-lg">
                    <span className="font-bold">Final Total:</span>
                    <span className="text-xl font-bold text-primary">
                      {formatCurrency ? formatCurrency(getFinalTotal()) : `$${getFinalTotal().toFixed(2)}`}
                    </span>
                  </div>
                </div>

                {/* Tax Rate Summary */}
                <div className="text-sm text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Effective Tax Rate:</span>
                    <span>{baseAmount > 0 ? ((getTotalTax() / baseAmount) * 100).toFixed(2) : 0}%</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};