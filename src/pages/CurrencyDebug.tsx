import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { currencyDebugger, CurrencyTroubleshootingReport } from '@/utils/currencyConversionDebugger';

const CurrencyDebug = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [report, setReport] = useState<CurrencyTroubleshootingReport | null>(null);

  const runDiagnostic = async () => {
    setIsRunning(true);
    try {
      const result = await currencyDebugger.runFullDiagnostic();
      setReport(result);
    } catch (error) {
      console.error('Diagnostic failed:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'fail':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pass':
        return 'bg-green-100 text-green-800';
      case 'fail':
        return 'bg-red-100 text-red-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getOverallStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-800';
      case 'issues':
        return 'bg-yellow-100 text-yellow-800';
      case 'critical':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Currency Conversion Diagnostic Tool</CardTitle>
            <CardDescription>
              Comprehensive testing and troubleshooting for currency conversion system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={runDiagnostic} 
              disabled={isRunning}
              className="w-full"
            >
              {isRunning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Running Diagnostic...
                </>
              ) : (
                'Run Full Diagnostic'
              )}
            </Button>
          </CardContent>
        </Card>

        {report && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Diagnostic Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{report.summary.passed}</div>
                    <div className="text-sm text-muted-foreground">Passed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{report.summary.failed}</div>
                    <div className="text-sm text-muted-foreground">Failed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">{report.summary.warnings}</div>
                    <div className="text-sm text-muted-foreground">Warnings</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{report.summary.totalTests}</div>
                    <div className="text-sm text-muted-foreground">Total Tests</div>
                  </div>
                </div>
                <div className="flex justify-center">
                  <Badge className={getOverallStatusColor(report.summary.overallStatus)}>
                    Overall Status: {report.summary.overallStatus.toUpperCase()}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Test Results</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {report.results.map((result, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        {getStatusIcon(result.status)}
                        <h3 className="font-medium">{result.step}</h3>
                        <Badge className={getStatusColor(result.status)}>
                          {result.status}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground mb-2">
                        {new Date(result.timestamp).toLocaleString()}
                      </div>
                      <div className="bg-gray-50 p-3 rounded text-sm">
                        <pre className="whitespace-pre-wrap overflow-auto">
                          {JSON.stringify(result.details, null, 2)}
                        </pre>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {report.recommendations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Recommendations</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {report.recommendations.map((rec, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <div className="h-2 w-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                        <span className="text-sm">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Quick Reference</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div><strong>Expected KES to USD rate:</strong> ~0.0077 (1 USD = ~130 KES)</div>
              <div><strong>Test amounts:</strong> 1500 KES → ~$12 USD, 3900 KES → ~$30 USD</div>
              <div><strong>Edge function:</strong> currency-conversion</div>
              <div><strong>Frontend hook:</strong> useOptimizedPricing</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CurrencyDebug;