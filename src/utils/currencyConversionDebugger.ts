/**
 * Currency Conversion Troubleshooting Guide & Debugger
 * 
 * This utility provides comprehensive debugging tools and step-by-step 
 * troubleshooting for currency conversion issues.
 */

import { supabase } from '@/integrations/supabase/client';

export interface CurrencyConversionTestResult {
  step: string;
  status: 'pass' | 'fail' | 'warning';
  details: any;
  timestamp: string;
}

export interface CurrencyTroubleshootingReport {
  summary: {
    overallStatus: 'healthy' | 'issues' | 'critical';
    totalTests: number;
    passed: number;
    failed: number;
    warnings: number;
  };
  results: CurrencyConversionTestResult[];
  recommendations: string[];
}

export class CurrencyConversionDebugger {
  private results: CurrencyConversionTestResult[] = [];

  private addResult(step: string, status: 'pass' | 'fail' | 'warning', details: any) {
    this.results.push({
      step,
      status,
      details,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * STEP 1: Test Edge Function Connectivity
   */
  async testEdgeFunctionConnectivity(): Promise<void> {
    try {
      console.log('🔧 Testing edge function connectivity...');
      
      const { data, error } = await supabase.functions.invoke('currency-conversion', {
        body: { action: 'convert', amount: 100, fromCurrency: 'KES', toCurrency: 'USD' }
      });

      if (error) {
        this.addResult('Edge Function Connectivity', 'fail', {
          error: error.message,
          details: 'Edge function not reachable or returning errors'
        });
        return;
      }

      if (data) {
        this.addResult('Edge Function Connectivity', 'pass', {
          response: data,
          message: 'Edge function responding successfully'
        });
      } else {
        this.addResult('Edge Function Connectivity', 'warning', {
          message: 'Edge function responding but returning null data'
        });
      }
    } catch (err) {
      this.addResult('Edge Function Connectivity', 'fail', {
        error: err,
        message: 'Failed to invoke edge function'
      });
    }
  }

  /**
   * STEP 2: Test Exchange Rate Accuracy
   */
  async testExchangeRateAccuracy(): Promise<void> {
    try {
      console.log('🔧 Testing exchange rate accuracy...');

      const { data, error } = await supabase.functions.invoke('currency-conversion', {
        body: { action: 'convert', amount: 130, fromCurrency: 'KES', toCurrency: 'USD' }
      });

      if (error) {
        this.addResult('Exchange Rate Accuracy', 'fail', { error: error.message });
        return;
      }

      const expectedUSD = 1.0; // 130 KES should be ~$1 USD
      const actualUSD = data.convertedAmount;
      const tolerance = 0.2; // 20% tolerance

      if (Math.abs(actualUSD - expectedUSD) <= tolerance) {
        this.addResult('Exchange Rate Accuracy', 'pass', {
          expected: expectedUSD,
          actual: actualUSD,
          rate: data.rate,
          message: 'Exchange rate within acceptable range'
        });
      } else {
        this.addResult('Exchange Rate Accuracy', 'fail', {
          expected: expectedUSD,
          actual: actualUSD,
          rate: data.rate,
          message: `Exchange rate incorrect. 130 KES should be ~$1 USD, got $${actualUSD}`
        });
      }
    } catch (err) {
      this.addResult('Exchange Rate Accuracy', 'fail', { error: err });
    }
  }

  /**
   * STEP 3: Test Bulk Conversion
   */
  async testBulkConversion(): Promise<void> {
    try {
      console.log('🔧 Testing bulk conversion...');

      const testAmounts = [1500, 3900, 5900]; // KES amounts from pricing
      const { data, error } = await supabase.functions.invoke('currency-conversion', {
        body: { action: 'bulk-convert', amounts: testAmounts, targetCurrency: 'USD' }
      });

      if (error) {
        this.addResult('Bulk Conversion', 'fail', { error: error.message });
        return;
      }

      const conversions = data.conversions;
      const rate = data.rate;

      // Check if rate seems reasonable (KES to USD should be around 0.0077)
      if (rate < 0.005 || rate > 0.01) {
        this.addResult('Bulk Conversion', 'warning', {
          rate,
          conversions,
          message: `Exchange rate ${rate} seems unusual for KES->USD (expected ~0.0077)`
        });
      } else {
        this.addResult('Bulk Conversion', 'pass', {
          rate,
          conversions,
          message: 'Bulk conversion working correctly'
        });
      }
    } catch (err) {
      this.addResult('Bulk Conversion', 'fail', { error: err });
    }
  }

  /**
   * STEP 4: Test Frontend Integration
   */
  async testFrontendIntegration(): Promise<void> {
    console.log('🔧 Testing frontend integration...');

    try {
      // Check if useOptimizedPricing is properly handling conversion
      const billingPlansResponse = await supabase
        .from('billing_plans')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (billingPlansResponse.error) {
        this.addResult('Frontend Integration', 'fail', {
          error: billingPlansResponse.error,
          message: 'Cannot fetch billing plans'
        });
        return;
      }

      const plans = billingPlansResponse.data || [];
      const hasPlans = plans.length > 0;
      const hasValidPrices = plans.every(plan => plan.price > 0);

      if (hasPlans && hasValidPrices) {
        this.addResult('Frontend Integration', 'pass', {
          planCount: plans.length,
          plans: plans.map(p => ({ id: p.id, name: p.name, price: p.price })),
          message: 'Billing plans available with valid prices'
        });
      } else {
        this.addResult('Frontend Integration', 'warning', {
          planCount: plans.length,
          hasValidPrices,
          message: 'Issues with billing plans data'
        });
      }
    } catch (err) {
      this.addResult('Frontend Integration', 'fail', { error: err });
    }
  }

  /**
   * STEP 5: Test External API Fallback
   */
  async testExternalAPIFallback(): Promise<void> {
    console.log('🔧 Testing external API fallback...');

    try {
      // Test direct external API call (simulating what the edge function does)
      const response = await fetch('https://api.exchangerate-api.io/v4/latest/KES');
      
      if (response.ok) {
        const data = await response.json();
        const usdRate = data.rates?.USD;
        
        if (usdRate && usdRate > 0) {
          this.addResult('External API Fallback', 'pass', {
            apiResponse: data.success,
            usdRate,
            message: 'External exchange rate API working'
          });
        } else {
          this.addResult('External API Fallback', 'warning', {
            apiResponse: data,
            message: 'External API responding but USD rate missing/invalid'
          });
        }
      } else {
        this.addResult('External API Fallback', 'warning', {
          status: response.status,
          message: 'External API not responding, should use fallback rates'
        });
      }
    } catch (err) {
      this.addResult('External API Fallback', 'warning', {
        error: err,
        message: 'External API failed, should use fallback rates (this is expected behavior)'
      });
    }
  }

  /**
   * STEP 6: Test Cache Behavior
   */
  async testCacheBehavior(): Promise<void> {
    console.log('🔧 Testing cache behavior...');

    try {
      // Make two identical requests quickly to test caching
      const request1Start = Date.now();
      const { data: data1 } = await supabase.functions.invoke('currency-conversion', {
        body: { action: 'convert', amount: 100, fromCurrency: 'KES', toCurrency: 'USD' }
      });
      const request1Time = Date.now() - request1Start;

      await new Promise(resolve => setTimeout(resolve, 100)); // Small delay

      const request2Start = Date.now();
      const { data: data2 } = await supabase.functions.invoke('currency-conversion', {
        body: { action: 'convert', amount: 100, fromCurrency: 'KES', toCurrency: 'USD' }
      });
      const request2Time = Date.now() - request2Start;

      // Second request should be faster if caching works
      const rateSame = data1?.rate === data2?.rate;
      const fasterSecondRequest = request2Time < request1Time;

      this.addResult('Cache Behavior', rateSame ? 'pass' : 'warning', {
        request1Time,
        request2Time,
        rateSame,
        fasterSecondRequest,
        rate1: data1?.rate,
        rate2: data2?.rate,
        message: rateSame ? 'Cache working (same rates)' : 'Cache might not be working (different rates)'
      });
    } catch (err) {
      this.addResult('Cache Behavior', 'fail', { error: err });
    }
  }

  /**
   * Generate comprehensive troubleshooting report
   */
  generateReport(): CurrencyTroubleshootingReport {
    const passed = this.results.filter(r => r.status === 'pass').length;
    const failed = this.results.filter(r => r.status === 'fail').length;
    const warnings = this.results.filter(r => r.status === 'warning').length;

    let overallStatus: 'healthy' | 'issues' | 'critical';
    if (failed > 0) {
      overallStatus = 'critical';
    } else if (warnings > 0) {
      overallStatus = 'issues';
    } else {
      overallStatus = 'healthy';
    }

    const recommendations: string[] = [];

    // Generate recommendations based on results
    this.results.forEach(result => {
      if (result.status === 'fail') {
        switch (result.step) {
          case 'Edge Function Connectivity':
            recommendations.push('🔧 Check edge function deployment and logs');
            recommendations.push('🔧 Verify Supabase project configuration');
            break;
          case 'Exchange Rate Accuracy':
            recommendations.push('🔧 Check fallback exchange rates in edge function');
            recommendations.push('🔧 Verify external API keys or endpoints');
            break;
          case 'Bulk Conversion':
            recommendations.push('🔧 Debug bulk conversion logic in edge function');
            break;
          case 'Frontend Integration':
            recommendations.push('🔧 Check useOptimizedPricing hook implementation');
            recommendations.push('🔧 Verify billing plans data in database');
            break;
        }
      }
    });

    // Add general recommendations for warnings
    if (warnings > 0) {
      recommendations.push('⚠️ Review warning details for potential optimizations');
    }

    return {
      summary: {
        overallStatus,
        totalTests: this.results.length,
        passed,
        failed,
        warnings
      },
      results: this.results,
      recommendations: [...new Set(recommendations)] // Remove duplicates
    };
  }

  /**
   * Run all troubleshooting tests
   */
  async runFullDiagnostic(): Promise<CurrencyTroubleshootingReport> {
    console.log('🚀 Starting comprehensive currency conversion diagnostic...');
    
    this.results = []; // Reset results

    await this.testEdgeFunctionConnectivity();
    await this.testExchangeRateAccuracy();
    await this.testBulkConversion();
    await this.testFrontendIntegration();
    await this.testExternalAPIFallback();
    await this.testCacheBehavior();

    const report = this.generateReport();
    
    console.log('📊 Diagnostic Complete!');
    console.table(this.results.map(r => ({
      Step: r.step,
      Status: r.status,
      Details: typeof r.details === 'object' ? JSON.stringify(r.details).slice(0, 100) + '...' : r.details
    })));

    return report;
  }
}

/**
 * TROUBLESHOOTING STEPS REFERENCE
 * 
 * 1. EDGE FUNCTION ISSUES:
 *    - Check function logs in Supabase dashboard
 *    - Verify function is deployed and responding
 *    - Test function directly via Supabase dashboard
 * 
 * 2. EXCHANGE RATE ISSUES:
 *    - Verify fallback rates are correct in edge function
 *    - Check external API status (exchangerate-api.io)
 *    - Ensure rate calculation logic is correct
 * 
 * 3. FRONTEND INTEGRATION ISSUES:
 *    - Check useOptimizedPricing hook logic
 *    - Verify convertPricesToUSD function is called
 *    - Ensure user authentication state is handled correctly
 * 
 * 4. CACHE ISSUES:
 *    - Verify cache keys are consistent
 *    - Check cache duration settings
 *    - Test cache invalidation
 * 
 * 5. DATABASE ISSUES:
 *    - Verify billing_plans table has correct data
 *    - Check RLS policies aren't blocking access
 *    - Ensure plan prices are in expected currency (KES)
 */

// Export singleton instance for easy use
export const currencyDebugger = new CurrencyConversionDebugger();