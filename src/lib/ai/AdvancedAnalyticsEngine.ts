import { supabase } from '@/lib/supabase';

export interface CustomerSegment {
  id: string;
  segment_name: string;
  segment_description: string;
  customer_count: number;
  avg_order_value: number;
  total_revenue: number;
  segment_score: number;
  criteria: {
    recency_days?: number;
    frequency_count?: number;
    monetary_value?: number;
    product_categories?: string[];
    location_preference?: string[];
  };
  created_at: string;
}

export interface PredictiveInsight {
  id: string;
  insight_type: 'sales_forecast' | 'demand_prediction' | 'customer_churn' | 'inventory_optimization' | 'pricing_recommendation';
  target_entity: string;
  entity_id: string;
  predicted_value: number;
  confidence_level: number;
  time_horizon: string;
  factors: string[];
  recommendation: string;
  created_at: string;
}

export interface AnomalyDetection {
  id: string;
  anomaly_type: 'sales_spike' | 'inventory_shortage' | 'payment_failure' | 'customer_behavior' | 'system_performance';
  entity_type: string;
  entity_id: string;
  anomaly_score: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  detected_at: string;
  resolved: boolean;
  resolution_notes?: string;
}

export interface BusinessMetric {
  id: string;
  metric_name: string;
  metric_value: number;
  metric_unit: string;
  period: string;
  comparison_period: string;
  change_percentage: number;
  trend: 'up' | 'down' | 'stable';
  target_value?: number;
  status: 'on_track' | 'at_risk' | 'exceeding';
  created_at: string;
}

export interface CustomerBehavior {
  customer_id: string;
  purchase_frequency: number;
  avg_order_value: number;
  preferred_categories: string[];
  preferred_payment_method: string;
  preferred_time: string;
  churn_risk: number;
  lifetime_value: number;
  last_purchase_date: string;
  total_orders: number;
}

// New interfaces for drill-down functionality
export interface CustomerDetail {
  id: string;
  name: string;
  email: string;
  phone: string;
  segment_name: string;
  total_orders: number;
  total_spent: number;
  avg_order_value: number;
  first_order_date: string;
  last_order_date: string;
  orders: OrderDetail[];
}

export interface OrderDetail {
  id: string;
  order_number: string;
  total_amount: number;
  status: string;
  created_at: string;
  items: OrderItemDetail[];
  payment_method: string;
}

export interface OrderItemDetail {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface AnomalyDetail {
  id: string;
  anomaly_type: string;
  entity_type: string;
  entity_id: string;
  entity_name: string;
  anomaly_score: number;
  severity: string;
  description: string;
  detected_at: string;
  resolved: boolean;
  resolution_notes?: string;
  related_data: any;
}

export interface TimeSeriesData {
  date: string;
  value: number;
  metric: string;
  category?: string;
}

export interface DrillDownFilter {
  startDate?: string;
  endDate?: string;
  segment?: string;
  category?: string;
  severity?: string;
  limit?: number;
  offset?: number;
}

export class AdvancedAnalyticsEngine {
  private static instance: AdvancedAnalyticsEngine;

  static getInstance(): AdvancedAnalyticsEngine {
    if (!AdvancedAnalyticsEngine.instance) {
      AdvancedAnalyticsEngine.instance = new AdvancedAnalyticsEngine();
    }
    return AdvancedAnalyticsEngine.instance;
  }

  // Customer Segmentation using RFM Analysis
  async generateCustomerSegments(tenantId: string): Promise<CustomerSegment[]> {
    try {
      // Get customer purchase data for RFM analysis
      const { data: customers, error } = await supabase
        .from('customers')
        .select(`
          id,
          name,
          email,
          orders (
            id,
            total_amount,
            created_at,
            status
          )
        `)
        .eq('tenant_id', tenantId);

      if (error) throw error;

      const segments: CustomerSegment[] = [];
      const now = new Date();

      // Process each customer for RFM scoring
      for (const customer of customers || []) {
        const orders = customer.orders?.filter(o => o.status === 'completed') || [];
        
        if (orders.length === 0) continue;

        // Calculate RFM metrics
        const lastOrder = orders.reduce((latest, order) => 
          new Date(order.created_at) > new Date(latest.created_at) ? order : latest
        );
        
        const recency = Math.floor((now.getTime() - new Date(lastOrder.created_at).getTime()) / (1000 * 60 * 60 * 24));
        const frequency = orders.length;
        const monetary = orders.reduce((sum, order) => sum + order.total_amount, 0);

        // Assign segment based on RFM scores
        const segment = this.assignRFMSegment(recency, frequency, monetary);
        
        segments.push({
          id: customer.id,
          segment_name: segment.name,
          segment_description: segment.description,
          customer_count: 1,
          avg_order_value: monetary / frequency,
          total_revenue: monetary,
          segment_score: segment.score,
          criteria: {
            recency_days: recency,
            frequency_count: frequency,
            monetary_value: monetary
          },
          created_at: new Date().toISOString()
        });
      }

      // Aggregate segments
      const aggregatedSegments = this.aggregateSegments(segments);
      
      // Save to database
      await this.saveCustomerSegments(tenantId, aggregatedSegments);

      return aggregatedSegments;
    } catch (error) {
      console.error('Error generating customer segments:', error);
      throw error;
    }
  }

  private assignRFMSegment(recency: number, frequency: number, monetary: number): { name: string; description: string; score: number } {
    // RFM scoring logic
    const rScore = recency <= 30 ? 5 : recency <= 60 ? 4 : recency <= 90 ? 3 : recency <= 180 ? 2 : 1;
    const fScore = frequency >= 10 ? 5 : frequency >= 5 ? 4 : frequency >= 3 ? 3 : frequency >= 2 ? 2 : 1;
    const mScore = monetary >= 10000 ? 5 : monetary >= 5000 ? 4 : monetary >= 2000 ? 3 : monetary >= 1000 ? 2 : 1;

    const totalScore = rScore + fScore + mScore;

    if (totalScore >= 13) {
      return { name: 'Champions', description: 'High-value, frequent customers', score: totalScore };
    } else if (totalScore >= 10) {
      return { name: 'Loyal Customers', description: 'Regular customers with good value', score: totalScore };
    } else if (totalScore >= 7) {
      return { name: 'At Risk', description: 'Customers who may be losing interest', score: totalScore };
    } else if (totalScore >= 4) {
      return { name: 'Can\'t Lose', description: 'High-value customers at risk', score: totalScore };
    } else {
      return { name: 'Lost', description: 'Inactive customers', score: totalScore };
    }
  }

  private aggregateSegments(segments: CustomerSegment[]): CustomerSegment[] {
    const grouped = segments.reduce((acc, segment) => {
      if (!acc[segment.segment_name]) {
        acc[segment.segment_name] = {
          id: segment.segment_name,
          segment_name: segment.segment_name,
          segment_description: segment.segment_description,
          customer_count: 0,
          avg_order_value: 0,
          total_revenue: 0,
          segment_score: 0,
          criteria: segment.criteria,
          created_at: segment.created_at
        };
      }
      
      acc[segment.segment_name].customer_count++;
      acc[segment.segment_name].total_revenue += segment.total_revenue;
      acc[segment.segment_name].avg_order_value = acc[segment.segment_name].total_revenue / acc[segment.segment_name].customer_count;
      acc[segment.segment_name].segment_score = Math.max(acc[segment.segment_name].segment_score, segment.segment_score);
      
      return acc;
    }, {} as Record<string, CustomerSegment>);

    return Object.values(grouped);
  }

  private async saveCustomerSegments(tenantId: string, segments: CustomerSegment[]): Promise<void> {
    const { error } = await supabase
      .from('ai_customer_segments')
      .upsert(segments.map(segment => ({
        ...segment,
        tenant_id: tenantId
      })));

    if (error) throw error;
  }

  // Predictive Analytics
  async generateSalesForecast(tenantId: string, days: number = 30): Promise<PredictiveInsight[]> {
    try {
      // Get historical sales data
      const { data: sales, error } = await supabase
        .from('orders')
        .select('total_amount, created_at')
        .eq('tenant_id', tenantId)
        .eq('status', 'completed')
        .gte('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Simple linear regression for forecasting
      const insights: PredictiveInsight[] = [];
      const dailySales = this.aggregateDailySales(sales || []);
      const forecast = this.calculateLinearForecast(dailySales, days);

      insights.push({
        id: `forecast_${Date.now()}`,
        insight_type: 'sales_forecast',
        target_entity: 'tenant',
        entity_id: tenantId,
        predicted_value: forecast.totalPredicted,
        confidence_level: forecast.confidence,
        time_horizon: `${days} days`,
        factors: ['historical_sales', 'seasonal_trends', 'growth_rate'],
        recommendation: `Expected sales of ${forecast.totalPredicted.toFixed(2)} over next ${days} days`,
        created_at: new Date().toISOString()
      });

      // Save insights
      await this.savePredictiveInsights(tenantId, insights);

      return insights;
    } catch (error) {
      console.error('Error generating sales forecast:', error);
      throw error;
    }
  }

  private aggregateDailySales(sales: any[]): { date: string; amount: number }[] {
    const dailyMap = sales.reduce((acc, sale) => {
      const date = sale.created_at.split('T')[0];
      acc[date] = (acc[date] || 0) + sale.total_amount;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(dailyMap).map(([date, amount]) => ({ date, amount }));
  }

  private calculateLinearForecast(dailySales: { date: string; amount: number }[], days: number): { totalPredicted: number; confidence: number } {
    if (dailySales.length < 7) {
      return { totalPredicted: 0, confidence: 0 };
    }

    // Calculate average daily sales
    const avgDaily = dailySales.reduce((sum, day) => sum + day.amount, 0) / dailySales.length;
    
    // Simple trend calculation
    const recentDays = dailySales.slice(-7);
    const recentAvg = recentDays.reduce((sum, day) => sum + day.amount, 0) / recentDays.length;
    
    // Growth rate
    const growthRate = recentAvg / avgDaily;
    
    // Predict future sales
    const totalPredicted = avgDaily * growthRate * days;
    
    // Confidence based on data consistency
    const variance = dailySales.reduce((sum, day) => sum + Math.pow(day.amount - avgDaily, 2), 0) / dailySales.length;
    const confidence = Math.max(0.5, 1 - (variance / (avgDaily * avgDaily)));

    return { totalPredicted, confidence };
  }

  private async savePredictiveInsights(tenantId: string, insights: PredictiveInsight[]): Promise<void> {
    const { error } = await supabase
      .from('ai_predictions')
      .upsert(insights.map(insight => ({
        ...insight,
        tenant_id: tenantId
      })));

    if (error) throw error;
  }

  // Anomaly Detection
  async detectAnomalies(tenantId: string): Promise<AnomalyDetection[]> {
    try {
      const anomalies: AnomalyDetection[] = [];

      // Sales spike detection
      const salesAnomalies = await this.detectSalesAnomalies(tenantId);
      anomalies.push(...salesAnomalies);

      // Inventory shortage detection
      const inventoryAnomalies = await this.detectInventoryAnomalies(tenantId);
      anomalies.push(...inventoryAnomalies);

      // Payment failure detection
      const paymentAnomalies = await this.detectPaymentAnomalies(tenantId);
      anomalies.push(...paymentAnomalies);

      // Save anomalies
      await this.saveAnomalies(tenantId, anomalies);

      return anomalies;
    } catch (error) {
      console.error('Error detecting anomalies:', error);
      throw error;
    }
  }

  private async detectSalesAnomalies(tenantId: string): Promise<AnomalyDetection[]> {
    const { data: sales, error } = await supabase
      .from('orders')
      .select('total_amount, created_at')
      .eq('tenant_id', tenantId)
      .eq('status', 'completed')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    if (error) throw error;

    const anomalies: AnomalyDetection[] = [];
    const dailySales = this.aggregateDailySales(sales || []);
    
    if (dailySales.length < 3) return anomalies;

    // Calculate average and standard deviation
    const amounts = dailySales.map(day => day.amount);
    const avg = amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length;
    const variance = amounts.reduce((sum, amount) => sum + Math.pow(amount - avg, 2), 0) / amounts.length;
    const stdDev = Math.sqrt(variance);

    // Detect outliers (2 standard deviations from mean)
    dailySales.forEach(day => {
      const zScore = Math.abs(day.amount - avg) / stdDev;
      if (zScore > 2) {
        anomalies.push({
          id: `sales_anomaly_${day.date}`,
          anomaly_type: 'sales_spike',
          entity_type: 'daily_sales',
          entity_id: day.date,
          anomaly_score: zScore,
          severity: zScore > 3 ? 'high' : 'medium',
          description: `Unusual sales activity: ${day.amount} vs average ${avg.toFixed(2)}`,
          detected_at: new Date().toISOString(),
          resolved: false
        });
      }
    });

    return anomalies;
  }

  private async detectInventoryAnomalies(tenantId: string): Promise<AnomalyDetection[]> {
    const { data: products, error } = await supabase
      .from('products')
      .select('id, name, stock_quantity, min_stock_level')
      .eq('tenant_id', tenantId)
      .eq('is_active', true);

    if (error) throw error;

    const anomalies: AnomalyDetection[] = [];

    products?.forEach(product => {
      if (product.stock_quantity <= product.min_stock_level) {
        anomalies.push({
          id: `inventory_anomaly_${product.id}`,
          anomaly_type: 'inventory_shortage',
          entity_type: 'product',
          entity_id: product.id,
          anomaly_score: 1.0,
          severity: product.stock_quantity === 0 ? 'critical' : 'high',
          description: `Low stock alert: ${product.name} has ${product.stock_quantity} units remaining`,
          detected_at: new Date().toISOString(),
          resolved: false
        });
      }
    });

    return anomalies;
  }

  private async detectPaymentAnomalies(tenantId: string): Promise<AnomalyDetection[]> {
    const { data: payments, error } = await supabase
      .from('payments')
      .select('id, amount, status, created_at')
      .eq('tenant_id', tenantId)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (error) throw error;

    const anomalies: AnomalyDetection[] = [];
    const failedPayments = payments?.filter(p => p.status === 'failed') || [];

    if (failedPayments.length > 5) {
      anomalies.push({
        id: `payment_anomaly_${Date.now()}`,
        anomaly_type: 'payment_failure',
        entity_type: 'payment_system',
        entity_id: tenantId,
        anomaly_score: failedPayments.length / 10,
        severity: failedPayments.length > 10 ? 'critical' : 'high',
        description: `High payment failure rate: ${failedPayments.length} failed payments in 24 hours`,
        detected_at: new Date().toISOString(),
        resolved: false
      });
    }

    return anomalies;
  }

  private async saveAnomalies(tenantId: string, anomalies: AnomalyDetection[]): Promise<void> {
    const { error } = await supabase
      .from('ai_anomalies')
      .upsert(anomalies.map(anomaly => ({
        ...anomaly,
        tenant_id: tenantId
      })));

    if (error) throw error;
  }

  // Business Metrics Dashboard
  async generateBusinessMetrics(tenantId: string): Promise<BusinessMetric[]> {
    try {
      const metrics: BusinessMetric[] = [];

      // Sales metrics
      const salesMetrics = await this.calculateSalesMetrics(tenantId);
      metrics.push(...salesMetrics);

      // Customer metrics
      const customerMetrics = await this.calculateCustomerMetrics(tenantId);
      metrics.push(...customerMetrics);

      // Inventory metrics
      const inventoryMetrics = await this.calculateInventoryMetrics(tenantId);
      metrics.push(...inventoryMetrics);

      // Save metrics
      await this.saveBusinessMetrics(tenantId, metrics);

      return metrics;
    } catch (error) {
      console.error('Error generating business metrics:', error);
      throw error;
    }
  }

  private async calculateSalesMetrics(tenantId: string): Promise<BusinessMetric[]> {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Current month sales
    const { data: currentSales, error: currentError } = await supabase
      .from('orders')
      .select('total_amount')
      .eq('tenant_id', tenantId)
      .eq('status', 'completed')
      .gte('created_at', thisMonth.toISOString());

    if (currentError) throw currentError;

    // Last month sales
    const { data: lastMonthSales, error: lastMonthError } = await supabase
      .from('orders')
      .select('total_amount')
      .eq('tenant_id', tenantId)
      .eq('status', 'completed')
      .gte('created_at', lastMonth.toISOString())
      .lt('created_at', thisMonth.toISOString());

    if (lastMonthError) throw lastMonthError;

    const currentTotal = currentSales?.reduce((sum, order) => sum + order.total_amount, 0) || 0;
    const lastMonthTotal = lastMonthSales?.reduce((sum, order) => sum + order.total_amount, 0) || 0;
    const changePercent = lastMonthTotal > 0 ? ((currentTotal - lastMonthTotal) / lastMonthTotal) * 100 : 0;

    return [{
      id: `sales_${Date.now()}`,
      metric_name: 'Monthly Sales',
      metric_value: currentTotal,
      metric_unit: 'currency',
      period: 'current_month',
      comparison_period: 'last_month',
      change_percentage: changePercent,
      trend: changePercent > 5 ? 'up' : changePercent < -5 ? 'down' : 'stable',
      status: changePercent > 0 ? 'on_track' : 'at_risk',
      created_at: new Date().toISOString()
    }];
  }

  private async calculateCustomerMetrics(tenantId: string): Promise<BusinessMetric[]> {
    const { data: customers, error } = await supabase
      .from('customers')
      .select('id, created_at')
      .eq('tenant_id', tenantId);

    if (error) throw error;

    const totalCustomers = customers?.length || 0;
    const newCustomersThisMonth = customers?.filter(c => 
      new Date(c.created_at) >= new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    ).length || 0;

    return [{
      id: `customers_${Date.now()}`,
      metric_name: 'Total Customers',
      metric_value: totalCustomers,
      metric_unit: 'count',
      period: 'all_time',
      comparison_period: 'last_month',
      change_percentage: newCustomersThisMonth,
      trend: newCustomersThisMonth > 0 ? 'up' : 'stable',
      status: 'on_track',
      created_at: new Date().toISOString()
    }];
  }

  private async calculateInventoryMetrics(tenantId: string): Promise<BusinessMetric[]> {
    const { data: products, error } = await supabase
      .from('products')
      .select('stock_quantity, min_stock_level')
      .eq('tenant_id', tenantId)
      .eq('is_active', true);

    if (error) throw error;

    const lowStockProducts = products?.filter(p => p.stock_quantity <= p.min_stock_level).length || 0;
    const totalProducts = products?.length || 0;
    const lowStockPercentage = totalProducts > 0 ? (lowStockProducts / totalProducts) * 100 : 0;

    return [{
      id: `inventory_${Date.now()}`,
      metric_name: 'Low Stock Products',
      metric_value: lowStockProducts,
      metric_unit: 'count',
      period: 'current',
      comparison_period: 'last_week',
      change_percentage: lowStockPercentage,
      trend: lowStockPercentage > 20 ? 'up' : 'stable',
      status: lowStockPercentage > 20 ? 'at_risk' : 'on_track',
      created_at: new Date().toISOString()
    }];
  }

  private async saveBusinessMetrics(tenantId: string, metrics: BusinessMetric[]): Promise<void> {
    const { error } = await supabase
      .from('ai_insights')
      .upsert(metrics.map(metric => ({
        ...metric,
        tenant_id: tenantId
      })));

    if (error) throw error;
  }

  // Customer Behavior Analysis
  async analyzeCustomerBehavior(tenantId: string): Promise<CustomerBehavior[]> {
    try {
      const { data: customers, error } = await supabase
        .from('customers')
        .select(`
          id,
          orders (
            id,
            total_amount,
            created_at,
            payment_method,
            order_items (
              product_id,
              products (
                category_id,
                categories (name)
              )
            )
          )
        `)
        .eq('tenant_id', tenantId);

      if (error) throw error;

      const behaviors: CustomerBehavior[] = [];

      for (const customer of customers || []) {
        const orders = customer.orders?.filter(o => o.status === 'completed') || [];
        
        if (orders.length === 0) continue;

        // Calculate behavior metrics
        const purchaseFrequency = orders.length / Math.max(1, this.getDaysSinceFirstOrder(orders));
        const avgOrderValue = orders.reduce((sum, order) => sum + order.total_amount, 0) / orders.length;
        const preferredPaymentMethod = this.getPreferredPaymentMethod(orders);
        const preferredTime = this.getPreferredTime(orders);
        const preferredCategories = this.getPreferredCategories(orders);
        const churnRisk = this.calculateChurnRisk(orders);
        const lifetimeValue = orders.reduce((sum, order) => sum + order.total_amount, 0);
        const lastPurchaseDate = orders.reduce((latest, order) => 
          new Date(order.created_at) > new Date(latest.created_at) ? order : latest
        ).created_at;

        behaviors.push({
          customer_id: customer.id,
          purchase_frequency,
          avg_order_value: avgOrderValue,
          preferred_categories: preferredCategories,
          preferred_payment_method: preferredPaymentMethod,
          preferred_time: preferredTime,
          churn_risk: churnRisk,
          lifetime_value: lifetimeValue,
          last_purchase_date: lastPurchaseDate,
          total_orders: orders.length
        });
      }

      return behaviors;
    } catch (error) {
      console.error('Error analyzing customer behavior:', error);
      throw error;
    }
  }

  private getDaysSinceFirstOrder(orders: any[]): number {
    if (orders.length === 0) return 0;
    
    const firstOrder = orders.reduce((earliest, order) => 
      new Date(order.created_at) < new Date(earliest.created_at) ? order : earliest
    );
    
    return Math.ceil((Date.now() - new Date(firstOrder.created_at).getTime()) / (1000 * 60 * 60 * 24));
  }

  private getPreferredPaymentMethod(orders: any[]): string {
    const methodCounts = orders.reduce((acc, order) => {
      acc[order.payment_method] = (acc[order.payment_method] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(methodCounts).reduce((preferred, [method, count]) => 
      count > (methodCounts[preferred] || 0) ? method : preferred
    , '');
  }

  private getPreferredTime(orders: any[]): string {
    const timeCounts = orders.reduce((acc, order) => {
      const hour = new Date(order.created_at).getHours();
      const timeSlot = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
      acc[timeSlot] = (acc[timeSlot] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(timeCounts).reduce((preferred, [time, count]) => 
      count > (timeCounts[preferred] || 0) ? time : preferred
    , 'morning');
  }

  private getPreferredCategories(orders: any[]): string[] {
    const categoryCounts: Record<string, number> = {};
    
    orders.forEach(order => {
      order.order_items?.forEach((item: any) => {
        const categoryName = item.products?.categories?.name;
        if (categoryName) {
          categoryCounts[categoryName] = (categoryCounts[categoryName] || 0) + 1;
        }
      });
    });

    return Object.entries(categoryCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([category]) => category);
  }

  private calculateChurnRisk(orders: any[]): number {
    if (orders.length < 2) return 0.5;

    const sortedOrders = orders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const lastOrderDate = new Date(sortedOrders[0].created_at);
    const daysSinceLastOrder = Math.ceil((Date.now() - lastOrderDate.getTime()) / (1000 * 60 * 60 * 24));

    // Higher risk if no recent orders
    if (daysSinceLastOrder > 90) return 0.9;
    if (daysSinceLastOrder > 60) return 0.7;
    if (daysSinceLastOrder > 30) return 0.5;
    if (daysSinceLastOrder > 7) return 0.3;
    
    return 0.1;
  }

  // Drill-down methods for detailed analytics

  // Get detailed customer information for drill-down
  async getCustomerDetail(tenantId: string, customerId: string): Promise<CustomerDetail> {
    try {
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .select(`
          id,
          name,
          email,
          phone,
          orders (
            id,
            order_number,
            total_amount,
            status,
            created_at,
            payment_method,
            order_items (
              id,
              quantity,
              unit_price,
              products (
                id,
                name
              )
            )
          )
        `)
        .eq('tenant_id', tenantId)
        .eq('id', customerId)
        .single();

      if (customerError) throw customerError;

      const orders = customer.orders?.filter(o => o.status === 'completed') || [];
      const totalSpent = orders.reduce((sum, order) => sum + order.total_amount, 0);
      const avgOrderValue = orders.length > 0 ? totalSpent / orders.length : 0;

      const orderDetails: OrderDetail[] = orders.map(order => ({
        id: order.id,
        order_number: order.order_number,
        total_amount: order.total_amount,
        status: order.status,
        created_at: order.created_at,
        payment_method: order.payment_method,
        items: order.order_items?.map(item => ({
          product_id: item.products?.id || '',
          product_name: item.products?.name || '',
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.quantity * item.unit_price
        })) || []
      }));

      // Determine segment
      const segment = await this.getCustomerSegment(tenantId, customerId);

      return {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        segment_name: segment?.segment_name || 'Unknown',
        total_orders: orders.length,
        total_spent: totalSpent,
        avg_order_value: avgOrderValue,
        first_order_date: orders.length > 0 ? orders.reduce((earliest, order) => 
          new Date(order.created_at) < new Date(earliest.created_at) ? order : earliest
        ).created_at : '',
        last_order_date: orders.length > 0 ? orders.reduce((latest, order) => 
          new Date(order.created_at) > new Date(latest.created_at) ? order : latest
        ).created_at : '',
        orders: orderDetails
      };
    } catch (error) {
      console.error('Error getting customer detail:', error);
      throw error;
    }
  }

  // Get customers in a specific segment
  async getSegmentCustomers(tenantId: string, segmentName: string, filter?: DrillDownFilter): Promise<CustomerDetail[]> {
    try {
      const { data: customers, error } = await supabase
        .from('customers')
        .select(`
          id,
          name,
          email,
          phone,
          orders (
            id,
            order_number,
            total_amount,
            status,
            created_at,
            payment_method
          )
        `)
        .eq('tenant_id', tenantId);

      if (error) throw error;

      const customerDetails: CustomerDetail[] = [];

      for (const customer of customers || []) {
        const orders = customer.orders?.filter(o => o.status === 'completed') || [];
        if (orders.length === 0) continue;

        // Calculate RFM metrics
        const now = new Date();
        const lastOrder = orders.reduce((latest, order) => 
          new Date(order.created_at) > new Date(latest.created_at) ? order : latest
        );
        
        const recency = Math.floor((now.getTime() - new Date(lastOrder.created_at).getTime()) / (1000 * 60 * 60 * 24));
        const frequency = orders.length;
        const monetary = orders.reduce((sum, order) => sum + order.total_amount, 0);

        const segment = this.assignRFMSegment(recency, frequency, monetary);
        
        if (segment.name === segmentName) {
          const totalSpent = orders.reduce((sum, order) => sum + order.total_amount, 0);
          const avgOrderValue = orders.length > 0 ? totalSpent / orders.length : 0;

          customerDetails.push({
            id: customer.id,
            name: customer.name,
            email: customer.email,
            phone: customer.phone,
            segment_name: segment.name,
            total_orders: orders.length,
            total_spent: totalSpent,
            avg_order_value: avgOrderValue,
            first_order_date: orders.reduce((earliest, order) => 
              new Date(order.created_at) < new Date(earliest.created_at) ? order : earliest
            ).created_at,
            last_order_date: orders.reduce((latest, order) => 
              new Date(order.created_at) > new Date(latest.created_at) ? order : latest
            ).created_at,
            orders: []
          });
        }
      }

      // Apply filters
      let filteredCustomers = customerDetails;
      if (filter?.startDate && filter?.endDate) {
        filteredCustomers = filteredCustomers.filter(customer => {
          const lastOrderDate = new Date(customer.last_order_date);
          return lastOrderDate >= new Date(filter.startDate!) && lastOrderDate <= new Date(filter.endDate!);
        });
      }

      // Apply pagination
      if (filter?.limit) {
        const offset = filter.offset || 0;
        filteredCustomers = filteredCustomers.slice(offset, offset + filter.limit);
      }

      return filteredCustomers;
    } catch (error) {
      console.error('Error getting segment customers:', error);
      throw error;
    }
  }

  // Get detailed anomaly information
  async getAnomalyDetail(tenantId: string, anomalyId: string): Promise<AnomalyDetail> {
    try {
      const { data: anomaly, error } = await supabase
        .from('ai_anomalies')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('id', anomalyId)
        .single();

      if (error) throw error;

      // Get related entity data based on anomaly type
      let relatedData = {};
      if (anomaly.entity_type === 'customer') {
        const { data: customer } = await supabase
          .from('customers')
          .select('id, name, email')
          .eq('id', anomaly.entity_id)
          .single();
        relatedData = customer || {};
      } else if (anomaly.entity_type === 'product') {
        const { data: product } = await supabase
          .from('products')
          .select('id, name, sku')
          .eq('id', anomaly.entity_id)
          .single();
        relatedData = product || {};
      }

      return {
        id: anomaly.id,
        anomaly_type: anomaly.anomaly_type,
        entity_type: anomaly.entity_type,
        entity_id: anomaly.entity_id,
        entity_name: relatedData.name || anomaly.entity_id,
        anomaly_score: anomaly.anomaly_score,
        severity: anomaly.severity,
        description: anomaly.description,
        detected_at: anomaly.detected_at,
        resolved: anomaly.resolved,
        resolution_notes: anomaly.resolution_notes,
        related_data: relatedData
      };
    } catch (error) {
      console.error('Error getting anomaly detail:', error);
      throw error;
    }
  }

  // Get time series data for drill-down
  async getTimeSeriesData(tenantId: string, metric: string, filter?: DrillDownFilter): Promise<TimeSeriesData[]> {
    try {
      let query = supabase
        .from('orders')
        .select('created_at, total_amount')
        .eq('tenant_id', tenantId)
        .eq('status', 'completed');

      if (filter?.startDate && filter?.endDate) {
        query = query.gte('created_at', filter.startDate).lte('created_at', filter.endDate);
      }

      const { data: orders, error } = await query;
      if (error) throw error;

      // Group by date and calculate metrics
      const dailyData: Record<string, { total: number; count: number }> = {};
      
      orders?.forEach(order => {
        const date = new Date(order.created_at).toISOString().split('T')[0];
        if (!dailyData[date]) {
          dailyData[date] = { total: 0, count: 0 };
        }
        dailyData[date].total += order.total_amount;
        dailyData[date].count += 1;
      });

      const timeSeriesData: TimeSeriesData[] = Object.entries(dailyData).map(([date, data]) => ({
        date,
        value: metric === 'revenue' ? data.total : data.count,
        metric
      }));

      return timeSeriesData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    } catch (error) {
      console.error('Error getting time series data:', error);
      throw error;
    }
  }

  // Get customer segment for a specific customer
  private async getCustomerSegment(tenantId: string, customerId: string): Promise<CustomerSegment | null> {
    try {
      const segments = await this.generateCustomerSegments(tenantId);
      return segments.find(segment => segment.id === customerId) || null;
    } catch (error) {
      console.error('Error getting customer segment:', error);
      return null;
    }
  }
}
