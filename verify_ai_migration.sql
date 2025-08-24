-- AI Migration Verification Script
-- Run this after the main migration to verify everything is working

-- Check if tables exist
SELECT 
    table_name,
    CASE 
        WHEN table_name IS NOT NULL THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'ai_insights',
    'ai_recommendations', 
    'ai_automation_rules',
    'ai_models',
    'ai_performance_metrics'
);

-- Check if RPC functions exist
SELECT 
    routine_name,
    CASE 
        WHEN routine_name IS NOT NULL THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
    'generate_sales_forecast',
    'generate_demand_forecast',
    'generate_customer_segments',
    'detect_anomalies'
);

-- Check sample data
SELECT 'ai_insights' as table_name, COUNT(*) as record_count FROM ai_insights
UNION ALL
SELECT 'ai_recommendations', COUNT(*) FROM ai_recommendations
UNION ALL
SELECT 'ai_models', COUNT(*) FROM ai_models;

-- Test RPC functions (replace with your actual tenant_id)
-- SELECT * FROM generate_sales_forecast('6742eb8a-434e-4c14-a91c-6d55adeb5750', 'monthly', 12);
-- SELECT * FROM generate_customer_segments('6742eb8a-434e-4c14-a91c-6d55adeb5750');
