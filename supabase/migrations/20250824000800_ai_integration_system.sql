-- Phase 5: Advanced Features and AI Integration
-- This migration implements AI-powered analytics, predictive models, and intelligent automation

-- Enable required extensions for AI features
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create AI models table for storing model configurations and metadata
CREATE TABLE IF NOT EXISTS public.ai_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  model_name VARCHAR(100) NOT NULL,
  model_type VARCHAR(50) NOT NULL CHECK (model_type IN ('prediction', 'classification', 'recommendation', 'anomaly_detection', 'forecasting')),
  model_version VARCHAR(20) NOT NULL,
  model_config JSONB DEFAULT '{}'::jsonb,
  model_metrics JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  last_trained_at TIMESTAMP WITH TIME ZONE,
  accuracy_score DECIMAL(5,4),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(tenant_id, model_name, model_version)
);

-- Create AI predictions table for storing model predictions
CREATE TABLE IF NOT EXISTS public.ai_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  model_id UUID REFERENCES public.ai_models(id) ON DELETE CASCADE,
  prediction_type VARCHAR(50) NOT NULL,
  input_data JSONB NOT NULL,
  prediction_result JSONB NOT NULL,
  confidence_score DECIMAL(5,4),
  actual_result JSONB,
  is_correct BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create AI insights table for storing generated insights
CREATE TABLE IF NOT EXISTS public.ai_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  insight_type VARCHAR(50) NOT NULL CHECK (insight_type IN ('trend', 'anomaly', 'recommendation', 'forecast', 'pattern')),
  insight_title VARCHAR(255) NOT NULL,
  insight_description TEXT NOT NULL,
  insight_data JSONB NOT NULL,
  confidence_level VARCHAR(20) CHECK (confidence_level IN ('low', 'medium', 'high')),
  is_actionable BOOLEAN DEFAULT true,
  action_taken BOOLEAN DEFAULT false,
  action_taken_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Create AI recommendations table for product and business recommendations
CREATE TABLE IF NOT EXISTS public.ai_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  recommendation_type VARCHAR(50) NOT NULL CHECK (recommendation_type IN ('product', 'pricing', 'inventory', 'marketing', 'customer')),
  target_entity_type VARCHAR(50) NOT NULL,
  target_entity_id UUID,
  recommendation_title VARCHAR(255) NOT NULL,
  recommendation_description TEXT NOT NULL,
  recommendation_data JSONB NOT NULL,
  expected_impact JSONB,
  priority_level VARCHAR(20) DEFAULT 'medium' CHECK (priority_level IN ('low', 'medium', 'high', 'critical')),
  is_implemented BOOLEAN DEFAULT false,
  implemented_at TIMESTAMP WITH TIME ZONE,
  implementation_result JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Create AI forecasting table for sales and demand predictions
CREATE TABLE IF NOT EXISTS public.ai_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  forecast_type VARCHAR(50) NOT NULL CHECK (forecast_type IN ('sales', 'demand', 'revenue', 'inventory', 'customer_growth')),
  forecast_period VARCHAR(20) NOT NULL CHECK (forecast_period IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')),
  forecast_date DATE NOT NULL,
  forecast_value DECIMAL(15,2) NOT NULL,
  confidence_interval_lower DECIMAL(15,2),
  confidence_interval_upper DECIMAL(15,2),
  actual_value DECIMAL(15,2),
  accuracy_percentage DECIMAL(5,2),
  model_used VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create AI anomaly detection table for detecting unusual patterns
CREATE TABLE IF NOT EXISTS public.ai_anomalies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  anomaly_type VARCHAR(50) NOT NULL CHECK (anomaly_type IN ('sales', 'inventory', 'customer', 'financial', 'system')),
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID,
  anomaly_score DECIMAL(5,4) NOT NULL,
  anomaly_description TEXT NOT NULL,
  anomaly_data JSONB NOT NULL,
  severity_level VARCHAR(20) DEFAULT 'medium' CHECK (severity_level IN ('low', 'medium', 'high', 'critical')),
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolution_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create AI customer segments table for intelligent customer segmentation
CREATE TABLE IF NOT EXISTS public.ai_customer_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  segment_name VARCHAR(100) NOT NULL,
  segment_description TEXT,
  segment_criteria JSONB NOT NULL,
  customer_count INTEGER DEFAULT 0,
  average_order_value DECIMAL(10,2),
  total_revenue DECIMAL(15,2),
  segment_score DECIMAL(5,4),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create AI customer behavior table for tracking customer patterns
CREATE TABLE IF NOT EXISTS public.ai_customer_behaviors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
  behavior_type VARCHAR(50) NOT NULL CHECK (behavior_type IN ('purchase', 'browsing', 'engagement', 'loyalty', 'churn_risk')),
  behavior_data JSONB NOT NULL,
  behavior_score DECIMAL(5,4),
  predicted_next_action VARCHAR(100),
  confidence_score DECIMAL(5,4),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create AI automation rules table for intelligent automation
CREATE TABLE IF NOT EXISTS public.ai_automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  rule_name VARCHAR(100) NOT NULL,
  rule_description TEXT,
  trigger_conditions JSONB NOT NULL,
  action_type VARCHAR(50) NOT NULL CHECK (action_type IN ('notification', 'order', 'adjustment', 'alert', 'report')),
  action_config JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  execution_count INTEGER DEFAULT 0,
  last_executed_at TIMESTAMP WITH TIME ZONE,
  success_rate DECIMAL(5,4),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create AI performance metrics table for tracking AI system performance
CREATE TABLE IF NOT EXISTS public.ai_performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  metric_name VARCHAR(100) NOT NULL,
  metric_value DECIMAL(15,4) NOT NULL,
  metric_unit VARCHAR(20),
  model_id UUID REFERENCES public.ai_models(id) ON DELETE SET NULL,
  metric_type VARCHAR(50) CHECK (metric_type IN ('accuracy', 'precision', 'recall', 'f1_score', 'latency', 'throughput')),
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_models_tenant_type ON public.ai_models(tenant_id, model_type);
CREATE INDEX IF NOT EXISTS idx_ai_models_active ON public.ai_models(tenant_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_ai_predictions_tenant_type ON public.ai_predictions(tenant_id, prediction_type);
CREATE INDEX IF NOT EXISTS idx_ai_predictions_model ON public.ai_predictions(model_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ai_insights_tenant_type ON public.ai_insights(tenant_id, insight_type);
CREATE INDEX IF NOT EXISTS idx_ai_insights_actionable ON public.ai_insights(tenant_id, is_actionable) WHERE is_actionable = true;
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_tenant_type ON public.ai_recommendations(tenant_id, recommendation_type);
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_priority ON public.ai_recommendations(tenant_id, priority_level);
CREATE INDEX IF NOT EXISTS idx_ai_forecasts_tenant_type ON public.ai_forecasts(tenant_id, forecast_type, forecast_date);
CREATE INDEX IF NOT EXISTS idx_ai_anomalies_tenant_severity ON public.ai_anomalies(tenant_id, severity_level);
CREATE INDEX IF NOT EXISTS idx_ai_anomalies_unresolved ON public.ai_anomalies(tenant_id, is_resolved) WHERE is_resolved = false;
CREATE INDEX IF NOT EXISTS idx_ai_customer_segments_tenant ON public.ai_customer_segments(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_ai_customer_behaviors_customer ON public.ai_customer_behaviors(customer_id, behavior_type);
CREATE INDEX IF NOT EXISTS idx_ai_automation_rules_tenant ON public.ai_automation_rules(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_ai_performance_metrics_tenant ON public.ai_performance_metrics(tenant_id, metric_type);

-- Add RLS policies
ALTER TABLE public.ai_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_anomalies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_customer_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_customer_behaviors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_performance_metrics ENABLE ROW LEVEL SECURITY;

-- AI Models policies
CREATE POLICY "Tenant users can manage their AI models" ON public.ai_models
  FOR ALL USING (tenant_id = auth.jwt() ->> 'tenant_id'::text);

CREATE POLICY "Superadmins can manage all AI models" ON public.ai_models
  FOR ALL USING (auth.jwt() ->> 'role' = 'superadmin');

-- AI Predictions policies
CREATE POLICY "Tenant users can view their AI predictions" ON public.ai_predictions
  FOR SELECT USING (tenant_id = auth.jwt() ->> 'tenant_id'::text);

CREATE POLICY "Service role can manage AI predictions" ON public.ai_predictions
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- AI Insights policies
CREATE POLICY "Tenant users can manage their AI insights" ON public.ai_insights
  FOR ALL USING (tenant_id = auth.jwt() ->> 'tenant_id'::text);

-- AI Recommendations policies
CREATE POLICY "Tenant users can manage their AI recommendations" ON public.ai_recommendations
  FOR ALL USING (tenant_id = auth.jwt() ->> 'tenant_id'::text);

-- AI Forecasts policies
CREATE POLICY "Tenant users can view their AI forecasts" ON public.ai_forecasts
  FOR SELECT USING (tenant_id = auth.jwt() ->> 'tenant_id'::text);

CREATE POLICY "Service role can manage AI forecasts" ON public.ai_forecasts
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- AI Anomalies policies
CREATE POLICY "Tenant users can manage their AI anomalies" ON public.ai_anomalies
  FOR ALL USING (tenant_id = auth.jwt() ->> 'tenant_id'::text);

-- AI Customer Segments policies
CREATE POLICY "Tenant users can manage their AI customer segments" ON public.ai_customer_segments
  FOR ALL USING (tenant_id = auth.jwt() ->> 'tenant_id'::text);

-- AI Customer Behaviors policies
CREATE POLICY "Tenant users can view their AI customer behaviors" ON public.ai_customer_behaviors
  FOR SELECT USING (tenant_id = auth.jwt() ->> 'tenant_id'::text);

CREATE POLICY "Service role can manage AI customer behaviors" ON public.ai_customer_behaviors
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- AI Automation Rules policies
CREATE POLICY "Tenant users can manage their AI automation rules" ON public.ai_automation_rules
  FOR ALL USING (tenant_id = auth.jwt() ->> 'tenant_id'::text);

-- AI Performance Metrics policies
CREATE POLICY "Tenant users can view their AI performance metrics" ON public.ai_performance_metrics
  FOR SELECT USING (tenant_id = auth.jwt() ->> 'tenant_id'::text);

CREATE POLICY "Service role can manage AI performance metrics" ON public.ai_performance_metrics
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Add updated_at triggers
CREATE TRIGGER ai_models_updated_at
  BEFORE UPDATE ON public.ai_models
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER ai_customer_segments_updated_at
  BEFORE UPDATE ON public.ai_customer_segments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER ai_automation_rules_updated_at
  BEFORE UPDATE ON public.ai_automation_rules
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Create function for AI sales forecasting
CREATE OR REPLACE FUNCTION public.generate_sales_forecast(
  p_tenant_id UUID,
  p_forecast_period VARCHAR(20) DEFAULT 'monthly',
  p_periods_ahead INTEGER DEFAULT 12
)
RETURNS TABLE(
  forecast_date DATE,
  forecast_value DECIMAL(15,2),
  confidence_lower DECIMAL(15,2),
  confidence_upper DECIMAL(15,2),
  model_confidence DECIMAL(5,4)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_historical_data RECORD;
  v_trend_factor DECIMAL(10,4);
  v_seasonality_factor DECIMAL(10,4);
  v_base_value DECIMAL(15,2);
  v_forecast_date DATE;
  v_confidence DECIMAL(5,4);
BEGIN
  -- Get historical sales data for trend analysis
  SELECT 
    AVG(total_amount) as avg_sales,
    STDDEV(total_amount) as sales_stddev,
    COUNT(*) as data_points
  INTO v_historical_data
  FROM public.orders
  WHERE tenant_id = p_tenant_id
    AND status = 'completed'
    AND created_at >= CURRENT_DATE - INTERVAL '12 months';

  -- Calculate trend factor (simplified linear trend)
  v_trend_factor := 1.05; -- 5% growth assumption
  
  -- Calculate seasonality factor (simplified)
  v_seasonality_factor := 1.0;
  
  -- Base forecast value
  v_base_value := COALESCE(v_historical_data.avg_sales, 0);
  
  -- Generate forecasts
  FOR i IN 1..p_periods_ahead LOOP
    v_forecast_date := CASE 
      WHEN p_forecast_period = 'daily' THEN CURRENT_DATE + (i || ' days')::INTERVAL
      WHEN p_forecast_period = 'weekly' THEN CURRENT_DATE + (i || ' weeks')::INTERVAL
      WHEN p_forecast_period = 'monthly' THEN CURRENT_DATE + (i || ' months')::INTERVAL
      WHEN p_forecast_period = 'quarterly' THEN CURRENT_DATE + (i * 3 || ' months')::INTERVAL
      WHEN p_forecast_period = 'yearly' THEN CURRENT_DATE + (i || ' years')::INTERVAL
      ELSE CURRENT_DATE + (i || ' months')::INTERVAL
    END;
    
    -- Calculate forecast value with trend and seasonality
    v_forecast_date := v_forecast_date::DATE;
    
    -- Confidence based on data quality
    v_confidence := CASE 
      WHEN v_historical_data.data_points > 100 THEN 0.85
      WHEN v_historical_data.data_points > 50 THEN 0.75
      WHEN v_historical_data.data_points > 20 THEN 0.65
      ELSE 0.50
    END;
    
    RETURN QUERY
    SELECT 
      v_forecast_date,
      v_base_value * POWER(v_trend_factor, i) * v_seasonality_factor,
      v_base_value * POWER(v_trend_factor, i) * v_seasonality_factor * (1 - (1 - v_confidence) * 0.5),
      v_base_value * POWER(v_trend_factor, i) * v_seasonality_factor * (1 + (1 - v_confidence) * 0.5),
      v_confidence;
  END LOOP;
END;
$$;

-- Create function for AI demand forecasting
CREATE OR REPLACE FUNCTION public.generate_demand_forecast(
  p_tenant_id UUID,
  p_product_id UUID DEFAULT NULL,
  p_forecast_period VARCHAR(20) DEFAULT 'monthly',
  p_periods_ahead INTEGER DEFAULT 12
)
RETURNS TABLE(
  product_id UUID,
  product_name VARCHAR(255),
  forecast_date DATE,
  forecast_quantity INTEGER,
  confidence_lower INTEGER,
  confidence_upper INTEGER,
  model_confidence DECIMAL(5,4)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_product RECORD;
  v_historical_data RECORD;
  v_forecast_date DATE;
  v_confidence DECIMAL(5,4);
BEGIN
  -- Get products to forecast
  FOR v_product IN 
    SELECT p.id, p.name
    FROM public.products p
    WHERE p.tenant_id = p_tenant_id
      AND p.is_active = true
      AND (p_product_id IS NULL OR p.id = p_product_id)
  LOOP
    -- Get historical demand data
    SELECT 
      AVG(oi.quantity) as avg_quantity,
      STDDEV(oi.quantity) as quantity_stddev,
      COUNT(*) as data_points
    INTO v_historical_data
    FROM public.order_items oi
    JOIN public.orders o ON oi.order_id = o.id
    WHERE o.tenant_id = p_tenant_id
      AND oi.product_id = v_product.id
      AND o.status = 'completed'
      AND o.created_at >= CURRENT_DATE - INTERVAL '12 months';

    -- Generate forecasts for each period
    FOR i IN 1..p_periods_ahead LOOP
      v_forecast_date := CASE 
        WHEN p_forecast_period = 'daily' THEN CURRENT_DATE + (i || ' days')::INTERVAL
        WHEN p_forecast_period = 'weekly' THEN CURRENT_DATE + (i || ' weeks')::INTERVAL
        WHEN p_forecast_period = 'monthly' THEN CURRENT_DATE + (i || ' months')::INTERVAL
        WHEN p_forecast_period = 'quarterly' THEN CURRENT_DATE + (i * 3 || ' months')::INTERVAL
        WHEN p_forecast_period = 'yearly' THEN CURRENT_DATE + (i || ' years')::INTERVAL
        ELSE CURRENT_DATE + (i || ' months')::INTERVAL
      END;
      
      v_forecast_date := v_forecast_date::DATE;
      
      -- Confidence based on data quality
      v_confidence := CASE 
        WHEN v_historical_data.data_points > 50 THEN 0.80
        WHEN v_historical_data.data_points > 20 THEN 0.70
        WHEN v_historical_data.data_points > 10 THEN 0.60
        ELSE 0.50
      END;
      
      RETURN QUERY
      SELECT 
        v_product.id,
        v_product.name,
        v_forecast_date,
        GREATEST(0, COALESCE(v_historical_data.avg_quantity, 0)::INTEGER),
        GREATEST(0, (COALESCE(v_historical_data.avg_quantity, 0) * (1 - (1 - v_confidence) * 0.3))::INTEGER),
        (COALESCE(v_historical_data.avg_quantity, 0) * (1 + (1 - v_confidence) * 0.3))::INTEGER,
        v_confidence;
    END LOOP;
  END LOOP;
END;
$$;

-- Create function for AI customer segmentation
CREATE OR REPLACE FUNCTION public.generate_customer_segments(
  p_tenant_id UUID
)
RETURNS TABLE(
  segment_name VARCHAR(100),
  segment_description TEXT,
  customer_count INTEGER,
  avg_order_value DECIMAL(10,2),
  total_revenue DECIMAL(15,2),
  segment_score DECIMAL(5,4)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- High-Value Customers (VIP)
  RETURN QUERY
  SELECT 
    'VIP Customers'::VARCHAR(100),
    'High-value customers with frequent purchases and high order values'::TEXT,
    COUNT(c.id)::INTEGER,
    AVG(COALESCE(customer_stats.avg_order_value, 0))::DECIMAL(10,2),
    SUM(COALESCE(customer_stats.total_spent, 0))::DECIMAL(15,2),
    0.95::DECIMAL(5,4)
  FROM public.customers c
  LEFT JOIN (
    SELECT 
      o.customer_id,
      AVG(o.total_amount) as avg_order_value,
      SUM(o.total_amount) as total_spent
    FROM public.orders o
    WHERE o.tenant_id = p_tenant_id AND o.status = 'completed'
    GROUP BY o.customer_id
  ) customer_stats ON c.id = customer_stats.customer_id
  WHERE c.tenant_id = p_tenant_id
    AND COALESCE(customer_stats.total_spent, 0) > 10000
    AND COALESCE(customer_stats.avg_order_value, 0) > 500;

  -- Regular Customers
  RETURN QUERY
  SELECT 
    'Regular Customers'::VARCHAR(100),
    'Regular customers with moderate purchase frequency and values'::TEXT,
    COUNT(c.id)::INTEGER,
    AVG(COALESCE(customer_stats.avg_order_value, 0))::DECIMAL(10,2),
    SUM(COALESCE(customer_stats.total_spent, 0))::DECIMAL(15,2),
    0.75::DECIMAL(5,4)
  FROM public.customers c
  LEFT JOIN (
    SELECT 
      o.customer_id,
      AVG(o.total_amount) as avg_order_value,
      SUM(o.total_amount) as total_spent
    FROM public.orders o
    WHERE o.tenant_id = p_tenant_id AND o.status = 'completed'
    GROUP BY o.customer_id
  ) customer_stats ON c.id = customer_stats.customer_id
  WHERE c.tenant_id = p_tenant_id
    AND COALESCE(customer_stats.total_spent, 0) BETWEEN 1000 AND 10000
    AND COALESCE(customer_stats.avg_order_value, 0) BETWEEN 100 AND 500;

  -- New Customers
  RETURN QUERY
  SELECT 
    'New Customers'::VARCHAR(100),
    'Recently acquired customers with limited purchase history'::TEXT,
    COUNT(c.id)::INTEGER,
    AVG(COALESCE(customer_stats.avg_order_value, 0))::DECIMAL(10,2),
    SUM(COALESCE(customer_stats.total_spent, 0))::DECIMAL(15,2),
    0.60::DECIMAL(5,4)
  FROM public.customers c
  LEFT JOIN (
    SELECT 
      o.customer_id,
      AVG(o.total_amount) as avg_order_value,
      SUM(o.total_amount) as total_spent
    FROM public.orders o
    WHERE o.tenant_id = p_tenant_id AND o.status = 'completed'
    GROUP BY o.customer_id
  ) customer_stats ON c.id = customer_stats.customer_id
  WHERE c.tenant_id = p_tenant_id
    AND c.created_at >= CURRENT_DATE - INTERVAL '3 months'
    AND (customer_stats.total_spent IS NULL OR customer_stats.total_spent < 1000);

  -- At-Risk Customers
  RETURN QUERY
  SELECT 
    'At-Risk Customers'::VARCHAR(100),
    'Customers who have not made purchases recently and may churn'::TEXT,
    COUNT(c.id)::INTEGER,
    AVG(COALESCE(customer_stats.avg_order_value, 0))::DECIMAL(10,2),
    SUM(COALESCE(customer_stats.total_spent, 0))::DECIMAL(15,2),
    0.40::DECIMAL(5,4)
  FROM public.customers c
  LEFT JOIN (
    SELECT 
      o.customer_id,
      AVG(o.total_amount) as avg_order_value,
      SUM(o.total_amount) as total_spent,
      MAX(o.created_at) as last_purchase
    FROM public.orders o
    WHERE o.tenant_id = p_tenant_id AND o.status = 'completed'
    GROUP BY o.customer_id
  ) customer_stats ON c.id = customer_stats.customer_id
  WHERE c.tenant_id = p_tenant_id
    AND (customer_stats.last_purchase IS NULL OR customer_stats.last_purchase < CURRENT_DATE - INTERVAL '6 months');
END;
$$;

-- Create function for AI anomaly detection
CREATE OR REPLACE FUNCTION public.detect_anomalies(
  p_tenant_id UUID,
  p_anomaly_type VARCHAR(50) DEFAULT 'sales'
)
RETURNS TABLE(
  anomaly_type VARCHAR(50),
  entity_type VARCHAR(50),
  entity_id UUID,
  anomaly_score DECIMAL(5,4),
  anomaly_description TEXT,
  severity_level VARCHAR(20)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_avg_sales DECIMAL(15,2);
  v_stddev_sales DECIMAL(15,2);
  v_sales_record RECORD;
BEGIN
  -- Calculate baseline metrics for sales anomaly detection
  SELECT 
    AVG(total_amount) as avg_amount,
    STDDEV(total_amount) as stddev_amount
  INTO v_avg_sales, v_stddev_sales
  FROM public.orders
  WHERE tenant_id = p_tenant_id
    AND status = 'completed'
    AND created_at >= CURRENT_DATE - INTERVAL '30 days';

  -- Detect sales anomalies
  IF p_anomaly_type = 'sales' THEN
    FOR v_sales_record IN
      SELECT 
        o.id,
        o.total_amount,
        o.created_at,
        ABS(o.total_amount - v_avg_sales) / NULLIF(v_stddev_sales, 0) as z_score
      FROM public.orders o
      WHERE o.tenant_id = p_tenant_id
        AND o.status = 'completed'
        AND o.created_at >= CURRENT_DATE - INTERVAL '7 days'
    LOOP
      -- Flag anomalies with z-score > 2 (statistical outliers)
      IF v_sales_record.z_score > 2 THEN
        RETURN QUERY
        SELECT 
          'sales'::VARCHAR(50),
          'order'::VARCHAR(50),
          v_sales_record.id,
          LEAST(1.0, v_sales_record.z_score / 5)::DECIMAL(5,4),
          'Unusual order amount detected: ' || v_sales_record.total_amount::TEXT || ' (Z-score: ' || v_sales_record.z_score::TEXT || ')',
          CASE 
            WHEN v_sales_record.z_score > 4 THEN 'critical'
            WHEN v_sales_record.z_score > 3 THEN 'high'
            ELSE 'medium'
          END::VARCHAR(20);
      END IF;
    END LOOP;
  END IF;

  -- Detect inventory anomalies (low stock)
  IF p_anomaly_type = 'inventory' THEN
    RETURN QUERY
    SELECT 
      'inventory'::VARCHAR(50),
      'product'::VARCHAR(50),
      p.id,
      0.8::DECIMAL(5,4),
      'Low stock alert: ' || p.name || ' (Stock: ' || p.stock_quantity || ', Min: ' || p.min_stock_level || ')',
      CASE 
        WHEN p.stock_quantity = 0 THEN 'critical'
        WHEN p.stock_quantity <= p.min_stock_level * 0.5 THEN 'high'
        ELSE 'medium'
      END::VARCHAR(20)
    FROM public.products p
    WHERE p.tenant_id = p_tenant_id
      AND p.is_active = true
      AND p.stock_quantity <= p.min_stock_level;
  END IF;
END;
$$;

-- Create function for AI recommendation generation
CREATE OR REPLACE FUNCTION public.generate_recommendations(
  p_tenant_id UUID,
  p_recommendation_type VARCHAR(50) DEFAULT 'product'
)
RETURNS TABLE(
  recommendation_type VARCHAR(50),
  target_entity_type VARCHAR(50),
  target_entity_id UUID,
  recommendation_title VARCHAR(255),
  recommendation_description TEXT,
  priority_level VARCHAR(20)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Product recommendations based on low stock
  IF p_recommendation_type = 'product' THEN
    RETURN QUERY
    SELECT 
      'product'::VARCHAR(50),
      'product'::VARCHAR(50),
      p.id,
      'Restock Recommendation: ' || p.name,
      'Product ' || p.name || ' is running low on stock. Current stock: ' || p.stock_quantity || ', Minimum level: ' || p.min_stock_level || '. Consider restocking soon.',
      CASE 
        WHEN p.stock_quantity = 0 THEN 'critical'
        WHEN p.stock_quantity <= p.min_stock_level * 0.5 THEN 'high'
        ELSE 'medium'
      END::VARCHAR(20)
    FROM public.products p
    WHERE p.tenant_id = p_tenant_id
      AND p.is_active = true
      AND p.stock_quantity <= p.min_stock_level;
  END IF;

  -- Pricing recommendations based on performance
  IF p_recommendation_type = 'pricing' THEN
    RETURN QUERY
    SELECT 
      'pricing'::VARCHAR(50),
      'product'::VARCHAR(50),
      p.id,
      'Pricing Optimization: ' || p.name,
      'Product ' || p.name || ' has shown strong performance. Consider reviewing pricing strategy to maximize profitability.',
      'medium'::VARCHAR(20)
    FROM public.products p
    WHERE p.tenant_id = p_tenant_id
      AND p.is_active = true
      AND EXISTS (
        SELECT 1 FROM public.order_items oi
        JOIN public.orders o ON oi.order_id = o.id
        WHERE oi.product_id = p.id
          AND o.tenant_id = p_tenant_id
          AND o.status = 'completed'
          AND o.created_at >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY oi.product_id
        HAVING COUNT(*) > 10
      );
  END IF;

  -- Customer engagement recommendations
  IF p_recommendation_type = 'customer' THEN
    RETURN QUERY
    SELECT 
      'customer'::VARCHAR(50),
      'customer'::VARCHAR(50),
      c.id,
      'Customer Re-engagement: ' || c.name,
      'Customer ' || c.name || ' has not made a purchase recently. Consider reaching out with personalized offers.',
      'medium'::VARCHAR(20)
    FROM public.customers c
    WHERE c.tenant_id = p_tenant_id
      AND NOT EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.customer_id = c.id
          AND o.tenant_id = p_tenant_id
          AND o.status = 'completed'
          AND o.created_at >= CURRENT_DATE - INTERVAL '3 months'
      );
  END IF;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.generate_sales_forecast TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.generate_demand_forecast TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.generate_customer_segments TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.detect_anomalies TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.generate_recommendations TO authenticated, service_role;

-- Insert default AI models for existing tenants
INSERT INTO public.ai_models (tenant_id, model_name, model_type, model_version, model_config, is_active)
SELECT 
  t.id,
  'sales_forecast_v1'::VARCHAR(100),
  'forecasting'::VARCHAR(50),
  '1.0.0'::VARCHAR(20),
  '{"algorithm": "linear_regression", "features": ["historical_sales", "seasonality", "trend"]}'::jsonb,
  true
FROM public.tenants t
ON CONFLICT (tenant_id, model_name, model_version) DO NOTHING;

INSERT INTO public.ai_models (tenant_id, model_name, model_type, model_version, model_config, is_active)
SELECT 
  t.id,
  'demand_forecast_v1'::VARCHAR(100),
  'forecasting'::VARCHAR(50),
  '1.0.0'::VARCHAR(20),
  '{"algorithm": "time_series", "features": ["product_demand", "seasonality"]}'::jsonb,
  true
FROM public.tenants t
ON CONFLICT (tenant_id, model_name, model_version) DO NOTHING;

INSERT INTO public.ai_models (tenant_id, model_name, model_type, model_version, model_config, is_active)
SELECT 
  t.id,
  'customer_segmentation_v1'::VARCHAR(100),
  'classification'::VARCHAR(50),
  '1.0.0'::VARCHAR(20),
  '{"algorithm": "k_means", "features": ["purchase_frequency", "order_value", "recency"]}'::jsonb,
  true
FROM public.tenants t
ON CONFLICT (tenant_id, model_name, model_version) DO NOTHING;

-- Create cron job for AI insights generation
SELECT cron.schedule(
  'generate-ai-insights',
  '0 */6 * * *', -- Every 6 hours
  'SELECT public.generate_ai_insights();'
);

-- Create function for AI insights generation (to be called by cron)
CREATE OR REPLACE FUNCTION public.generate_ai_insights()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tenant RECORD;
  v_insight_count INTEGER := 0;
BEGIN
  -- Generate insights for each tenant
  FOR v_tenant IN SELECT id FROM public.tenants LOOP
    -- Sales trend insights
    INSERT INTO public.ai_insights (tenant_id, insight_type, insight_title, insight_description, insight_data, confidence_level)
    SELECT 
      v_tenant.id,
      'trend'::VARCHAR(50),
      'Sales Trend Analysis',
      'Sales have been ' || 
      CASE 
        WHEN recent_avg > historical_avg * 1.1 THEN 'increasing'
        WHEN recent_avg < historical_avg * 0.9 THEN 'decreasing'
        ELSE 'stable'
      END || ' over the past 30 days compared to the previous period.',
      jsonb_build_object(
        'recent_avg', recent_avg,
        'historical_avg', historical_avg,
        'change_percentage', ((recent_avg - historical_avg) / historical_avg * 100)
      ),
      'high'::VARCHAR(20)
    FROM (
      SELECT 
        AVG(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN total_amount END) as recent_avg,
        AVG(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '60 days' AND created_at < CURRENT_DATE - INTERVAL '30 days' THEN total_amount END) as historical_avg
      FROM public.orders
      WHERE tenant_id = v_tenant.id AND status = 'completed'
    ) sales_data
    WHERE recent_avg IS NOT NULL AND historical_avg IS NOT NULL;

    v_insight_count := v_insight_count + 1;
  END LOOP;

  RETURN v_insight_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_ai_insights TO service_role;
