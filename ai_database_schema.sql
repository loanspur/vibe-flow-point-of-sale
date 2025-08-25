-- AI Database Schema Migration
-- This migration creates all necessary tables, indexes, RLS policies, and RPC functions for AI features

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ============================================================================
-- AI INSIGHTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS ai_insights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    insight_type VARCHAR(50) NOT NULL CHECK (insight_type IN ('trend', 'anomaly', 'recommendation', 'forecast', 'pattern')),
    insight_title VARCHAR(255) NOT NULL,
    insight_description TEXT,
    insight_data JSONB,
    confidence_level VARCHAR(20) NOT NULL CHECK (confidence_level IN ('low', 'medium', 'high')),
    is_actionable BOOLEAN DEFAULT false,
    action_taken BOOLEAN DEFAULT false,
    action_taken_at TIMESTAMP WITH TIME ZONE,
    action_taken_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for ai_insights
CREATE INDEX IF NOT EXISTS idx_ai_insights_tenant_id ON ai_insights(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_insights_type ON ai_insights(insight_type);
CREATE INDEX IF NOT EXISTS idx_ai_insights_created_at ON ai_insights(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_insights_actionable ON ai_insights(is_actionable) WHERE is_actionable = true;

-- ============================================================================
-- AI RECOMMENDATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS ai_recommendations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    recommendation_type VARCHAR(50) NOT NULL CHECK (recommendation_type IN ('product', 'pricing', 'inventory', 'marketing', 'customer')),
    target_entity_type VARCHAR(100),
    target_entity_id UUID,
    recommendation_title VARCHAR(255) NOT NULL,
    recommendation_description TEXT,
    recommendation_data JSONB,
    priority_level VARCHAR(20) NOT NULL CHECK (priority_level IN ('low', 'medium', 'high', 'critical')),
    is_implemented BOOLEAN DEFAULT false,
    implemented_at TIMESTAMP WITH TIME ZONE,
    implemented_by UUID REFERENCES users(id),
    implementation_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for ai_recommendations
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_tenant_id ON ai_recommendations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_type ON ai_recommendations(recommendation_type);
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_priority ON ai_recommendations(priority_level);
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_implemented ON ai_recommendations(is_implemented);
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_created_at ON ai_recommendations(created_at DESC);

-- ============================================================================
-- AI AUTOMATION RULES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS ai_automation_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    rule_name VARCHAR(255) NOT NULL,
    rule_description TEXT,
    rule_type VARCHAR(50) NOT NULL CHECK (rule_type IN ('trigger', 'schedule', 'condition', 'workflow')),
    trigger_condition TEXT,
    trigger_threshold DECIMAL(10,2),
    action_type VARCHAR(50) NOT NULL CHECK (action_type IN ('notification', 'email', 'sms', 'webhook', 'database_update')),
    action_config JSONB,
    execution_frequency VARCHAR(50) CHECK (execution_frequency IN ('immediate', 'hourly', 'daily', 'weekly', 'monthly')),
    is_active BOOLEAN DEFAULT true,
    execution_count INTEGER DEFAULT 0,
    success_rate DECIMAL(5,2) DEFAULT 0,
    last_executed_at TIMESTAMP WITH TIME ZONE,
    next_execution_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for ai_automation_rules
CREATE INDEX IF NOT EXISTS idx_ai_automation_rules_tenant_id ON ai_automation_rules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_automation_rules_type ON ai_automation_rules(rule_type);
CREATE INDEX IF NOT EXISTS idx_ai_automation_rules_active ON ai_automation_rules(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_ai_automation_rules_next_execution ON ai_automation_rules(next_execution_at) WHERE is_active = true;

-- ============================================================================
-- AI MODELS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS ai_models (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    model_name VARCHAR(255) NOT NULL,
    model_type VARCHAR(50) NOT NULL CHECK (model_type IN ('forecast', 'classification', 'regression', 'clustering', 'custom')),
    model_version VARCHAR(50) NOT NULL,
    model_config JSONB,
    accuracy_score DECIMAL(5,4) DEFAULT 0,
    latency_ms INTEGER DEFAULT 0,
    throughput_rps DECIMAL(10,2) DEFAULT 0,
    error_rate DECIMAL(5,4) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    is_training BOOLEAN DEFAULT false,
    last_trained TIMESTAMP WITH TIME ZONE,
    training_samples INTEGER DEFAULT 0,
    model_file_path TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for ai_models
CREATE INDEX IF NOT EXISTS idx_ai_models_tenant_id ON ai_models(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_models_type ON ai_models(model_type);
CREATE INDEX IF NOT EXISTS idx_ai_models_active ON ai_models(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_ai_models_accuracy ON ai_models(accuracy_score DESC);

-- ============================================================================
-- AI PERFORMANCE METRICS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS ai_performance_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    model_id UUID REFERENCES ai_models(id) ON DELETE CASCADE,
    metric_name VARCHAR(255) NOT NULL,
    metric_type VARCHAR(50) NOT NULL CHECK (metric_type IN ('accuracy', 'latency', 'throughput', 'error_rate', 'resource_usage', 'custom')),
    metric_value DECIMAL(15,4) NOT NULL,
    metric_unit VARCHAR(50),
    target_value DECIMAL(15,4),
    threshold_warning DECIMAL(15,4),
    threshold_critical DECIMAL(15,4),
    metric_data JSONB,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for ai_performance_metrics
CREATE INDEX IF NOT EXISTS idx_ai_performance_metrics_tenant_id ON ai_performance_metrics(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_performance_metrics_model_id ON ai_performance_metrics(model_id);
CREATE INDEX IF NOT EXISTS idx_ai_performance_metrics_type ON ai_performance_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_ai_performance_metrics_recorded_at ON ai_performance_metrics(recorded_at DESC);

-- ============================================================================
-- AI PREDICTIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS ai_predictions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    model_id UUID REFERENCES ai_models(id) ON DELETE CASCADE,
    prediction_type VARCHAR(50) NOT NULL CHECK (prediction_type IN ('sales', 'demand', 'customer_behavior', 'inventory', 'pricing')),
    target_entity_type VARCHAR(100),
    target_entity_id UUID,
    prediction_value DECIMAL(15,4) NOT NULL,
    confidence_score DECIMAL(5,4) DEFAULT 0,
    prediction_data JSONB,
    prediction_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for ai_predictions
CREATE INDEX IF NOT EXISTS idx_ai_predictions_tenant_id ON ai_predictions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_predictions_model_id ON ai_predictions(model_id);
CREATE INDEX IF NOT EXISTS idx_ai_predictions_type ON ai_predictions(prediction_type);
CREATE INDEX IF NOT EXISTS idx_ai_predictions_date ON ai_predictions(prediction_date);

-- ============================================================================
-- AI CUSTOMER SEGMENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS ai_customer_segments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    segment_name VARCHAR(255) NOT NULL,
    segment_description TEXT,
    segment_criteria JSONB,
    customer_count INTEGER DEFAULT 0,
    avg_order_value DECIMAL(15,2) DEFAULT 0,
    total_revenue DECIMAL(15,2) DEFAULT 0,
    segment_score DECIMAL(5,4) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for ai_customer_segments
CREATE INDEX IF NOT EXISTS idx_ai_customer_segments_tenant_id ON ai_customer_segments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_customer_segments_active ON ai_customer_segments(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_ai_customer_segments_score ON ai_customer_segments(segment_score DESC);

-- ============================================================================
-- AI CUSTOMER BEHAVIORS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS ai_customer_behaviors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    behavior_type VARCHAR(50) NOT NULL CHECK (behavior_type IN ('purchase_pattern', 'browsing_behavior', 'engagement', 'loyalty', 'churn_risk')),
    behavior_data JSONB,
    behavior_score DECIMAL(5,4) DEFAULT 0,
    confidence_level VARCHAR(20) CHECK (confidence_level IN ('low', 'medium', 'high')),
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for ai_customer_behaviors
CREATE INDEX IF NOT EXISTS idx_ai_customer_behaviors_tenant_id ON ai_customer_behaviors(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_customer_behaviors_customer_id ON ai_customer_behaviors(customer_id);
CREATE INDEX IF NOT EXISTS idx_ai_customer_behaviors_type ON ai_customer_behaviors(behavior_type);
CREATE INDEX IF NOT EXISTS idx_ai_customer_behaviors_recorded_at ON ai_customer_behaviors(recorded_at DESC);

-- ============================================================================
-- AI ANOMALIES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS ai_anomalies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    anomaly_type VARCHAR(50) NOT NULL CHECK (anomaly_type IN ('sales', 'inventory', 'customer', 'system', 'financial')),
    entity_type VARCHAR(100),
    entity_id UUID,
    anomaly_score DECIMAL(5,4) NOT NULL,
    anomaly_description TEXT,
    severity_level VARCHAR(20) NOT NULL CHECK (severity_level IN ('low', 'medium', 'high', 'critical')),
    anomaly_data JSONB,
    is_resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES users(id),
    resolution_notes TEXT,
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for ai_anomalies
CREATE INDEX IF NOT EXISTS idx_ai_anomalies_tenant_id ON ai_anomalies(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_anomalies_type ON ai_anomalies(anomaly_type);
CREATE INDEX IF NOT EXISTS idx_ai_anomalies_severity ON ai_anomalies(severity_level);
CREATE INDEX IF NOT EXISTS idx_ai_anomalies_resolved ON ai_anomalies(is_resolved);
CREATE INDEX IF NOT EXISTS idx_ai_anomalies_detected_at ON ai_anomalies(detected_at DESC);

-- ============================================================================
-- AI FORECASTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS ai_forecasts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    model_id UUID REFERENCES ai_models(id) ON DELETE CASCADE,
    forecast_type VARCHAR(50) NOT NULL CHECK (forecast_type IN ('sales', 'demand', 'revenue', 'inventory', 'customer_growth')),
    forecast_date DATE NOT NULL,
    forecast_value DECIMAL(15,4) NOT NULL,
    confidence_lower DECIMAL(15,4),
    confidence_upper DECIMAL(15,4),
    model_confidence DECIMAL(5,4) DEFAULT 0,
    forecast_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for ai_forecasts
CREATE INDEX IF NOT EXISTS idx_ai_forecasts_tenant_id ON ai_forecasts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_forecasts_model_id ON ai_forecasts(model_id);
CREATE INDEX IF NOT EXISTS idx_ai_forecasts_type ON ai_forecasts(forecast_type);
CREATE INDEX IF NOT EXISTS idx_ai_forecasts_date ON ai_forecasts(forecast_date);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all AI tables
ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_customer_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_customer_behaviors ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_anomalies ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_forecasts ENABLE ROW LEVEL SECURITY;

-- AI Insights RLS Policies
CREATE POLICY "Users can view ai_insights for their tenant" ON ai_insights
    FOR SELECT USING (tenant_id = auth.jwt() ->> 'tenant_id'::text);

CREATE POLICY "Users can insert ai_insights for their tenant" ON ai_insights
    FOR INSERT WITH CHECK (tenant_id = auth.jwt() ->> 'tenant_id'::text);

CREATE POLICY "Users can update ai_insights for their tenant" ON ai_insights
    FOR UPDATE USING (tenant_id = auth.jwt() ->> 'tenant_id'::text);

CREATE POLICY "Users can delete ai_insights for their tenant" ON ai_insights
    FOR DELETE USING (tenant_id = auth.jwt() ->> 'tenant_id'::text);

-- AI Recommendations RLS Policies
CREATE POLICY "Users can view ai_recommendations for their tenant" ON ai_recommendations
    FOR SELECT USING (tenant_id = auth.jwt() ->> 'tenant_id'::text);

CREATE POLICY "Users can insert ai_recommendations for their tenant" ON ai_recommendations
    FOR INSERT WITH CHECK (tenant_id = auth.jwt() ->> 'tenant_id'::text);

CREATE POLICY "Users can update ai_recommendations for their tenant" ON ai_recommendations
    FOR UPDATE USING (tenant_id = auth.jwt() ->> 'tenant_id'::text);

CREATE POLICY "Users can delete ai_recommendations for their tenant" ON ai_recommendations
    FOR DELETE USING (tenant_id = auth.jwt() ->> 'tenant_id'::text);

-- AI Automation Rules RLS Policies
CREATE POLICY "Users can view ai_automation_rules for their tenant" ON ai_automation_rules
    FOR SELECT USING (tenant_id = auth.jwt() ->> 'tenant_id'::text);

CREATE POLICY "Users can insert ai_automation_rules for their tenant" ON ai_automation_rules
    FOR INSERT WITH CHECK (tenant_id = auth.jwt() ->> 'tenant_id'::text);

CREATE POLICY "Users can update ai_automation_rules for their tenant" ON ai_automation_rules
    FOR UPDATE USING (tenant_id = auth.jwt() ->> 'tenant_id'::text);

CREATE POLICY "Users can delete ai_automation_rules for their tenant" ON ai_automation_rules
    FOR DELETE USING (tenant_id = auth.jwt() ->> 'tenant_id'::text);

-- AI Models RLS Policies
CREATE POLICY "Users can view ai_models for their tenant" ON ai_models
    FOR SELECT USING (tenant_id = auth.jwt() ->> 'tenant_id'::text);

CREATE POLICY "Users can insert ai_models for their tenant" ON ai_models
    FOR INSERT WITH CHECK (tenant_id = auth.jwt() ->> 'tenant_id'::text);

CREATE POLICY "Users can update ai_models for their tenant" ON ai_models
    FOR UPDATE USING (tenant_id = auth.jwt() ->> 'tenant_id'::text);

CREATE POLICY "Users can delete ai_models for their tenant" ON ai_models
    FOR DELETE USING (tenant_id = auth.jwt() ->> 'tenant_id'::text);

-- AI Performance Metrics RLS Policies
CREATE POLICY "Users can view ai_performance_metrics for their tenant" ON ai_performance_metrics
    FOR SELECT USING (tenant_id = auth.jwt() ->> 'tenant_id'::text);

CREATE POLICY "Users can insert ai_performance_metrics for their tenant" ON ai_performance_metrics
    FOR INSERT WITH CHECK (tenant_id = auth.jwt() ->> 'tenant_id'::text);

CREATE POLICY "Users can update ai_performance_metrics for their tenant" ON ai_performance_metrics
    FOR UPDATE USING (tenant_id = auth.jwt() ->> 'tenant_id'::text);

CREATE POLICY "Users can delete ai_performance_metrics for their tenant" ON ai_performance_metrics
    FOR DELETE USING (tenant_id = auth.jwt() ->> 'tenant_id'::text);

-- AI Predictions RLS Policies
CREATE POLICY "Users can view ai_predictions for their tenant" ON ai_predictions
    FOR SELECT USING (tenant_id = auth.jwt() ->> 'tenant_id'::text);

CREATE POLICY "Users can insert ai_predictions for their tenant" ON ai_predictions
    FOR INSERT WITH CHECK (tenant_id = auth.jwt() ->> 'tenant_id'::text);

CREATE POLICY "Users can update ai_predictions for their tenant" ON ai_predictions
    FOR UPDATE USING (tenant_id = auth.jwt() ->> 'tenant_id'::text);

CREATE POLICY "Users can delete ai_predictions for their tenant" ON ai_predictions
    FOR DELETE USING (tenant_id = auth.jwt() ->> 'tenant_id'::text);

-- AI Customer Segments RLS Policies
CREATE POLICY "Users can view ai_customer_segments for their tenant" ON ai_customer_segments
    FOR SELECT USING (tenant_id = auth.jwt() ->> 'tenant_id'::text);

CREATE POLICY "Users can insert ai_customer_segments for their tenant" ON ai_customer_segments
    FOR INSERT WITH CHECK (tenant_id = auth.jwt() ->> 'tenant_id'::text);

CREATE POLICY "Users can update ai_customer_segments for their tenant" ON ai_customer_segments
    FOR UPDATE USING (tenant_id = auth.jwt() ->> 'tenant_id'::text);

CREATE POLICY "Users can delete ai_customer_segments for their tenant" ON ai_customer_segments
    FOR DELETE USING (tenant_id = auth.jwt() ->> 'tenant_id'::text);

-- AI Customer Behaviors RLS Policies
CREATE POLICY "Users can view ai_customer_behaviors for their tenant" ON ai_customer_behaviors
    FOR SELECT USING (tenant_id = auth.jwt() ->> 'tenant_id'::text);

CREATE POLICY "Users can insert ai_customer_behaviors for their tenant" ON ai_customer_behaviors
    FOR INSERT WITH CHECK (tenant_id = auth.jwt() ->> 'tenant_id'::text);

CREATE POLICY "Users can update ai_customer_behaviors for their tenant" ON ai_customer_behaviors
    FOR UPDATE USING (tenant_id = auth.jwt() ->> 'tenant_id'::text);

CREATE POLICY "Users can delete ai_customer_behaviors for their tenant" ON ai_customer_behaviors
    FOR DELETE USING (tenant_id = auth.jwt() ->> 'tenant_id'::text);

-- AI Anomalies RLS Policies
CREATE POLICY "Users can view ai_anomalies for their tenant" ON ai_anomalies
    FOR SELECT USING (tenant_id = auth.jwt() ->> 'tenant_id'::text);

CREATE POLICY "Users can insert ai_anomalies for their tenant" ON ai_anomalies
    FOR INSERT WITH CHECK (tenant_id = auth.jwt() ->> 'tenant_id'::text);

CREATE POLICY "Users can update ai_anomalies for their tenant" ON ai_anomalies
    FOR UPDATE USING (tenant_id = auth.jwt() ->> 'tenant_id'::text);

CREATE POLICY "Users can delete ai_anomalies for their tenant" ON ai_anomalies
    FOR DELETE USING (tenant_id = auth.jwt() ->> 'tenant_id'::text);

-- AI Forecasts RLS Policies
CREATE POLICY "Users can view ai_forecasts for their tenant" ON ai_forecasts
    FOR SELECT USING (tenant_id = auth.jwt() ->> 'tenant_id'::text);

CREATE POLICY "Users can insert ai_forecasts for their tenant" ON ai_forecasts
    FOR INSERT WITH CHECK (tenant_id = auth.jwt() ->> 'tenant_id'::text);

CREATE POLICY "Users can update ai_forecasts for their tenant" ON ai_forecasts
    FOR UPDATE USING (tenant_id = auth.jwt() ->> 'tenant_id'::text);

CREATE POLICY "Users can delete ai_forecasts for their tenant" ON ai_forecasts
    FOR DELETE USING (tenant_id = auth.jwt() ->> 'tenant_id'::text);

-- ============================================================================
-- RPC FUNCTIONS
-- ============================================================================

-- Generate Sales Forecast RPC Function
CREATE OR REPLACE FUNCTION generate_sales_forecast(
    p_tenant_id UUID,
    p_forecast_period VARCHAR(20) DEFAULT 'monthly',
    p_periods_ahead INTEGER DEFAULT 12
)
RETURNS TABLE (
    forecast_date DATE,
    forecast_value DECIMAL(15,4),
    confidence_lower DECIMAL(15,4),
    confidence_upper DECIMAL(15,4),
    model_confidence DECIMAL(5,4)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- This is a simplified forecast function
    -- In a real implementation, this would use actual ML models
    RETURN QUERY
    WITH date_series AS (
        SELECT generate_series(
            CURRENT_DATE,
            CURRENT_DATE + (p_periods_ahead || ' ' || p_forecast_period)::INTERVAL,
            '1 ' || p_forecast_period
        )::DATE AS forecast_date
    ),
    base_forecast AS (
        SELECT 
            ds.forecast_date,
            -- Simulate forecast value based on historical data
            COALESCE(
                (SELECT AVG(total_amount) FROM orders 
                 WHERE tenant_id = p_tenant_id 
                 AND created_at >= CURRENT_DATE - INTERVAL '6 months'),
                1000.00
            ) * (1 + (random() * 0.2 - 0.1)) AS forecast_value,
            -- Simulate confidence intervals
            COALESCE(
                (SELECT AVG(total_amount) FROM orders 
                 WHERE tenant_id = p_tenant_id 
                 AND created_at >= CURRENT_DATE - INTERVAL '6 months'),
                1000.00
            ) * 0.8 AS confidence_lower,
            COALESCE(
                (SELECT AVG(total_amount) FROM orders 
                 WHERE tenant_id = p_tenant_id 
                 AND created_at >= CURRENT_DATE - INTERVAL '6 months'),
                1000.00
            ) * 1.2 AS confidence_upper,
            0.85 + (random() * 0.1) AS model_confidence
        FROM date_series ds
    )
    SELECT 
        bf.forecast_date,
        bf.forecast_value,
        bf.confidence_lower,
        bf.confidence_upper,
        bf.model_confidence
    FROM base_forecast bf
    ORDER BY bf.forecast_date;
END;
$$;

-- Generate Demand Forecast RPC Function
CREATE OR REPLACE FUNCTION generate_demand_forecast(
    p_tenant_id UUID,
    p_forecast_period VARCHAR(20) DEFAULT 'monthly',
    p_periods_ahead INTEGER DEFAULT 12
)
RETURNS TABLE (
    forecast_date DATE,
    forecast_value DECIMAL(15,4),
    confidence_lower DECIMAL(15,4),
    confidence_upper DECIMAL(15,4),
    model_confidence DECIMAL(5,4)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- This is a simplified demand forecast function
    RETURN QUERY
    WITH date_series AS (
        SELECT generate_series(
            CURRENT_DATE,
            CURRENT_DATE + (p_periods_ahead || ' ' || p_forecast_period)::INTERVAL,
            '1 ' || p_forecast_period
        )::DATE AS forecast_date
    ),
    base_forecast AS (
        SELECT 
            ds.forecast_date,
            -- Simulate demand forecast based on order items
            COALESCE(
                (SELECT AVG(quantity) FROM order_items oi
                 JOIN orders o ON oi.order_id = o.id
                 WHERE o.tenant_id = p_tenant_id 
                 AND o.created_at >= CURRENT_DATE - INTERVAL '6 months'),
                50.00
            ) * (1 + (random() * 0.3 - 0.15)) AS forecast_value,
            -- Simulate confidence intervals
            COALESCE(
                (SELECT AVG(quantity) FROM order_items oi
                 JOIN orders o ON oi.order_id = o.id
                 WHERE o.tenant_id = p_tenant_id 
                 AND o.created_at >= CURRENT_DATE - INTERVAL '6 months'),
                50.00
            ) * 0.7 AS confidence_lower,
            COALESCE(
                (SELECT AVG(quantity) FROM order_items oi
                 JOIN orders o ON oi.order_id = o.id
                 WHERE o.tenant_id = p_tenant_id 
                 AND o.created_at >= CURRENT_DATE - INTERVAL '6 months'),
                50.00
            ) * 1.3 AS confidence_upper,
            0.80 + (random() * 0.15) AS model_confidence
        FROM date_series ds
    )
    SELECT 
        bf.forecast_date,
        bf.forecast_value,
        bf.confidence_lower,
        bf.confidence_upper,
        bf.model_confidence
    FROM base_forecast bf
    ORDER BY bf.forecast_date;
END;
$$;

-- Generate Customer Segments RPC Function
CREATE OR REPLACE FUNCTION generate_customer_segments(
    p_tenant_id UUID
)
RETURNS TABLE (
    segment_name VARCHAR(255),
    segment_description TEXT,
    customer_count INTEGER,
    avg_order_value DECIMAL(15,2),
    total_revenue DECIMAL(15,2),
    segment_score DECIMAL(5,4)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- This function generates customer segments based on RFM analysis
    RETURN QUERY
    WITH customer_metrics AS (
        SELECT 
            c.id,
            c.name,
            COUNT(o.id) as order_count,
            AVG(o.total_amount) as avg_order_value,
            SUM(o.total_amount) as total_revenue,
            MAX(o.created_at) as last_order_date,
            EXTRACT(DAYS FROM (CURRENT_DATE - MAX(o.created_at))) as days_since_last_order
        FROM customers c
        LEFT JOIN orders o ON c.id = o.customer_id AND o.tenant_id = p_tenant_id
        WHERE c.tenant_id = p_tenant_id
        GROUP BY c.id, c.name
    ),
    segments AS (
        SELECT 
            id,
            name,
            order_count,
            avg_order_value,
            total_revenue,
            days_since_last_order,
            CASE 
                WHEN total_revenue >= 10000 AND order_count >= 10 AND days_since_last_order <= 30 THEN 'VIP Customers'
                WHEN total_revenue >= 5000 AND order_count >= 5 AND days_since_last_order <= 60 THEN 'High Value'
                WHEN total_revenue >= 1000 AND order_count >= 2 AND days_since_last_order <= 90 THEN 'Regular'
                WHEN total_revenue > 0 AND days_since_last_order <= 180 THEN 'Occasional'
                ELSE 'Inactive'
            END as segment_name,
            CASE 
                WHEN total_revenue >= 10000 AND order_count >= 10 AND days_since_last_order <= 30 THEN 'Most valuable customers with high engagement'
                WHEN total_revenue >= 5000 AND order_count >= 5 AND days_since_last_order <= 60 THEN 'High spending customers with good engagement'
                WHEN total_revenue >= 1000 AND order_count >= 2 AND days_since_last_order <= 90 THEN 'Regular customers with moderate engagement'
                WHEN total_revenue > 0 AND days_since_last_order <= 180 THEN 'Occasional customers with low engagement'
                ELSE 'Customers with no recent activity'
            END as segment_description,
            CASE 
                WHEN total_revenue >= 10000 AND order_count >= 10 AND days_since_last_order <= 30 THEN 0.95
                WHEN total_revenue >= 5000 AND order_count >= 5 AND days_since_last_order <= 60 THEN 0.80
                WHEN total_revenue >= 1000 AND order_count >= 2 AND days_since_last_order <= 90 THEN 0.60
                WHEN total_revenue > 0 AND days_since_last_order <= 180 THEN 0.30
                ELSE 0.10
            END as segment_score
        FROM customer_metrics
    )
    SELECT 
        s.segment_name,
        s.segment_description,
        COUNT(*) as customer_count,
        AVG(s.avg_order_value) as avg_order_value,
        SUM(s.total_revenue) as total_revenue,
        AVG(s.segment_score) as segment_score
    FROM segments s
    GROUP BY s.segment_name, s.segment_description
    ORDER BY segment_score DESC;
END;
$$;

-- Detect Anomalies RPC Function
CREATE OR REPLACE FUNCTION detect_anomalies(
    p_tenant_id UUID,
    p_anomaly_type VARCHAR(50) DEFAULT 'sales'
)
RETURNS TABLE (
    anomaly_type VARCHAR(50),
    entity_type VARCHAR(100),
    entity_id UUID,
    anomaly_score DECIMAL(5,4),
    anomaly_description TEXT,
    severity_level VARCHAR(20)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- This function detects anomalies in sales data
    RETURN QUERY
    WITH sales_metrics AS (
        SELECT 
            DATE(created_at) as sale_date,
            COUNT(*) as order_count,
            SUM(total_amount) as daily_revenue,
            AVG(total_amount) as avg_order_value
        FROM orders 
        WHERE tenant_id = p_tenant_id 
        AND created_at >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY DATE(created_at)
    ),
    anomaly_detection AS (
        SELECT 
            sale_date,
            order_count,
            daily_revenue,
            avg_order_value,
            -- Calculate z-scores for anomaly detection
            ABS((daily_revenue - AVG(daily_revenue) OVER ()) / NULLIF(STDDEV(daily_revenue) OVER (), 0)) as revenue_z_score,
            ABS((order_count - AVG(order_count) OVER ()) / NULLIF(STDDEV(order_count) OVER (), 0)) as order_z_score
        FROM sales_metrics
    )
    SELECT 
        'sales'::VARCHAR(50) as anomaly_type,
        'daily_sales'::VARCHAR(100) as entity_type,
        NULL::UUID as entity_id,
        GREATEST(revenue_z_score, order_z_score) as anomaly_score,
        CASE 
            WHEN revenue_z_score > 2.5 OR order_z_score > 2.5 THEN 
                'Unusual sales activity detected on ' || sale_date::TEXT
            ELSE 
                'Moderate sales variation on ' || sale_date::TEXT
        END as anomaly_description,
        CASE 
            WHEN revenue_z_score > 3.0 OR order_z_score > 3.0 THEN 'critical'
            WHEN revenue_z_score > 2.5 OR order_z_score > 2.5 THEN 'high'
            WHEN revenue_z_score > 2.0 OR order_z_score > 2.0 THEN 'medium'
            ELSE 'low'
        END as severity_level
    FROM anomaly_detection
    WHERE revenue_z_score > 2.0 OR order_z_score > 2.0
    ORDER BY anomaly_score DESC
    LIMIT 10;
END;
$$;

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT TIMESTAMPS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_ai_insights_updated_at BEFORE UPDATE ON ai_insights FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ai_recommendations_updated_at BEFORE UPDATE ON ai_recommendations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ai_automation_rules_updated_at BEFORE UPDATE ON ai_automation_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ai_models_updated_at BEFORE UPDATE ON ai_models FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ai_customer_segments_updated_at BEFORE UPDATE ON ai_customer_segments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SAMPLE DATA INSERTION (Optional)
-- ============================================================================

-- Insert sample AI insights
INSERT INTO ai_insights (tenant_id, insight_type, insight_title, insight_description, confidence_level, is_actionable) VALUES
(uuid_generate_v4(), 'trend', 'Sales Growth Trend', 'Sales have increased by 15% over the last 30 days', 'high', true),
(uuid_generate_v4(), 'anomaly', 'Unusual Order Pattern', 'Detected unusual order pattern in the evening hours', 'medium', true),
(uuid_generate_v4(), 'recommendation', 'Inventory Optimization', 'Consider reducing stock levels for slow-moving items', 'high', true);

-- Insert sample AI recommendations
INSERT INTO ai_recommendations (tenant_id, recommendation_type, recommendation_title, recommendation_description, priority_level) VALUES
(uuid_generate_v4(), 'pricing', 'Dynamic Pricing Strategy', 'Implement dynamic pricing for high-demand products', 'high'),
(uuid_generate_v4(), 'inventory', 'Stock Replenishment', 'Replenish stock for top-selling products', 'medium'),
(uuid_generate_v4(), 'marketing', 'Customer Retention Campaign', 'Launch targeted campaign for at-risk customers', 'critical');

-- Insert sample AI models
INSERT INTO ai_models (tenant_id, model_name, model_type, model_version, accuracy_score, latency_ms, throughput_rps, error_rate, is_active) VALUES
(uuid_generate_v4(), 'Sales Forecast Model', 'forecast', '1.0.0', 0.85, 150, 100.5, 0.02, true),
(uuid_generate_v4(), 'Customer Segmentation Model', 'clustering', '1.0.0', 0.92, 200, 75.3, 0.01, true),
(uuid_generate_v4(), 'Anomaly Detection Model', 'classification', '1.0.0', 0.88, 100, 200.0, 0.03, true);

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Log migration completion
DO $$
BEGIN
    RAISE NOTICE 'AI Database Schema Migration completed successfully!';
    RAISE NOTICE 'Created % AI tables with RLS policies and RPC functions', 10;
    RAISE NOTICE 'Sample data inserted for testing';
END $$;
