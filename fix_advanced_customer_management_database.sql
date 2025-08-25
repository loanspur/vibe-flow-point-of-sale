-- Advanced Customer Management Database Schema
-- Run this SQL in your Supabase SQL Editor

-- ============================================================================
-- STEP 1: CREATE CUSTOMER MANAGEMENT TABLES
-- ============================================================================

-- Customer Profiles Table
CREATE TABLE IF NOT EXISTS customer_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    
    -- Enhanced Profile Information
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    date_of_birth DATE,
    gender VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100),
    
    -- Customer Classification
    customer_type VARCHAR(50) DEFAULT 'regular', -- regular, vip, wholesale, etc.
    customer_status VARCHAR(50) DEFAULT 'active', -- active, inactive, suspended
    customer_tier VARCHAR(50) DEFAULT 'bronze', -- bronze, silver, gold, platinum
    
    -- Business Information
    company_name VARCHAR(255),
    job_title VARCHAR(100),
    industry VARCHAR(100),
    
    -- Preferences
    preferred_contact_method VARCHAR(20) DEFAULT 'email', -- email, phone, sms
    communication_preferences JSONB DEFAULT '{}',
    product_preferences JSONB DEFAULT '{}',
    
    -- Analytics Data
    total_orders INTEGER DEFAULT 0,
    total_spent DECIMAL(15,2) DEFAULT 0,
    average_order_value DECIMAL(15,2) DEFAULT 0,
    last_order_date TIMESTAMP WITH TIME ZONE,
    first_order_date TIMESTAMP WITH TIME ZONE,
    
    -- Lifecycle Information
    lifecycle_stage VARCHAR(50) DEFAULT 'prospect', -- prospect, lead, customer, advocate, churned
    acquisition_source VARCHAR(100), -- referral, website, social_media, etc.
    acquisition_date TIMESTAMP WITH TIME ZONE,
    
    -- Notes and Tags
    notes TEXT,
    tags TEXT[],
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(tenant_id, customer_id)
);

-- Customer Interactions Table
CREATE TABLE IF NOT EXISTS customer_interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    
    -- Interaction Details
    interaction_type VARCHAR(50) NOT NULL, -- call, email, meeting, support, purchase, etc.
    interaction_subtype VARCHAR(50), -- inbound, outbound, follow_up, etc.
    subject VARCHAR(255),
    description TEXT,
    
    -- Contact Information
    contact_method VARCHAR(20), -- phone, email, in_person, chat, etc.
    contact_person VARCHAR(255),
    
    -- Outcome
    outcome VARCHAR(50), -- successful, failed, pending, rescheduled
    next_action VARCHAR(255),
    follow_up_date TIMESTAMP WITH TIME ZONE,
    
    -- Sentiment and Rating
    sentiment_score INTEGER, -- 1-5 scale
    customer_satisfaction INTEGER, -- 1-5 scale
    notes TEXT,
    
    -- Related Records
    related_order_id UUID REFERENCES sales(id),
    related_opportunity_id UUID,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES auth.users(id)
);

-- Customer Opportunities Table
CREATE TABLE IF NOT EXISTS customer_opportunities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    
    -- Opportunity Details
    title VARCHAR(255) NOT NULL,
    description TEXT,
    opportunity_type VARCHAR(50), -- new_sale, upsell, cross_sell, renewal
    
    -- Financial Information
    expected_value DECIMAL(15,2),
    probability_percentage INTEGER DEFAULT 50, -- 0-100
    expected_close_date DATE,
    
    -- Pipeline Information
    pipeline_stage VARCHAR(50) DEFAULT 'prospecting', -- prospecting, qualification, proposal, negotiation, closed_won, closed_lost
    pipeline_position INTEGER DEFAULT 1,
    
    -- Source and Campaign
    lead_source VARCHAR(100),
    campaign_id UUID,
    
    -- Assignee
    assigned_to UUID REFERENCES auth.users(id),
    
    -- Status
    status VARCHAR(50) DEFAULT 'open', -- open, won, lost, cancelled
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES auth.users(id)
);

-- Loyalty Programs Table
CREATE TABLE IF NOT EXISTS loyalty_programs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Program Details
    name VARCHAR(255) NOT NULL,
    description TEXT,
    program_type VARCHAR(50) DEFAULT 'points', -- points, tiers, cashback
    
    -- Configuration
    points_per_currency DECIMAL(10,4) DEFAULT 1.0,
    minimum_redemption_points INTEGER DEFAULT 100,
    points_expiry_days INTEGER, -- NULL for no expiry
    auto_enrollment BOOLEAN DEFAULT false,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    start_date DATE,
    end_date DATE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Loyalty Tiers Table
CREATE TABLE IF NOT EXISTS loyalty_tiers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    program_id UUID NOT NULL REFERENCES loyalty_programs(id) ON DELETE CASCADE,
    
    -- Tier Details
    name VARCHAR(100) NOT NULL, -- bronze, silver, gold, platinum
    description TEXT,
    tier_level INTEGER NOT NULL, -- 1, 2, 3, 4
    
    -- Requirements
    minimum_points INTEGER DEFAULT 0,
    minimum_spend DECIMAL(15,2) DEFAULT 0,
    minimum_orders INTEGER DEFAULT 0,
    
    -- Benefits
    points_multiplier DECIMAL(5,2) DEFAULT 1.0,
    discount_percentage DECIMAL(5,2) DEFAULT 0,
    free_shipping BOOLEAN DEFAULT false,
    exclusive_offers BOOLEAN DEFAULT false,
    
    -- Visual
    color VARCHAR(7) DEFAULT '#6B7280', -- hex color
    icon VARCHAR(50),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Customer Loyalty Table
CREATE TABLE IF NOT EXISTS customer_loyalty (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    program_id UUID NOT NULL REFERENCES loyalty_programs(id) ON DELETE CASCADE,
    
    -- Loyalty Status
    is_enrolled BOOLEAN DEFAULT true,
    enrollment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Current Status
    current_tier_id UUID REFERENCES loyalty_tiers(id),
    current_points INTEGER DEFAULT 0,
    lifetime_points INTEGER DEFAULT 0,
    
    -- Statistics
    total_orders INTEGER DEFAULT 0,
    total_spent DECIMAL(15,2) DEFAULT 0,
    last_activity_date TIMESTAMP WITH TIME ZONE,
    
    -- Preferences
    communication_preferences JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(tenant_id, customer_id, program_id)
);

-- Loyalty Transactions Table
CREATE TABLE IF NOT EXISTS loyalty_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    program_id UUID NOT NULL REFERENCES loyalty_programs(id) ON DELETE CASCADE,
    
    -- Transaction Details
    transaction_type VARCHAR(50) NOT NULL, -- earned, redeemed, expired, adjusted
    points_amount INTEGER NOT NULL,
    description TEXT,
    
    -- Related Records
    related_order_id UUID REFERENCES sales(id),
    related_reward_id UUID,
    
    -- Balance After Transaction
    balance_after INTEGER NOT NULL,
    
    -- Expiry Information
    expires_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Rewards Table
CREATE TABLE IF NOT EXISTS rewards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    program_id UUID NOT NULL REFERENCES loyalty_programs(id) ON DELETE CASCADE,
    
    -- Reward Details
    name VARCHAR(255) NOT NULL,
    description TEXT,
    reward_type VARCHAR(50) NOT NULL, -- discount, free_product, free_shipping, cashback
    
    -- Configuration
    points_cost INTEGER NOT NULL,
    discount_percentage DECIMAL(5,2), -- for discount type
    discount_amount DECIMAL(15,2), -- for fixed discount
    product_id UUID REFERENCES products(id), -- for free product
    max_redemptions INTEGER, -- NULL for unlimited
    current_redemptions INTEGER DEFAULT 0,
    
    -- Availability
    is_active BOOLEAN DEFAULT true,
    start_date DATE,
    end_date DATE,
    minimum_tier_id UUID REFERENCES loyalty_tiers(id),
    
    -- Visual
    image_url VARCHAR(500),
    color VARCHAR(7) DEFAULT '#6B7280',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Customer Feedback Table
CREATE TABLE IF NOT EXISTS customer_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    
    -- Feedback Details
    feedback_type VARCHAR(50) NOT NULL, -- review, survey, complaint, suggestion
    title VARCHAR(255),
    content TEXT NOT NULL,
    
    -- Rating
    rating INTEGER, -- 1-5 scale
    sentiment_score DECIMAL(3,2), -- -1 to 1 scale
    
    -- Categories
    category VARCHAR(100), -- product, service, support, etc.
    tags TEXT[],
    
    -- Related Records
    related_order_id UUID REFERENCES sales(id),
    related_product_id UUID REFERENCES products(id),
    
    -- Status
    status VARCHAR(50) DEFAULT 'pending', -- pending, reviewed, resolved, closed
    
    -- Response Information
    response_required BOOLEAN DEFAULT false,
    response_deadline TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Feedback Responses Table
CREATE TABLE IF NOT EXISTS feedback_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    feedback_id UUID NOT NULL REFERENCES customer_feedback(id) ON DELETE CASCADE,
    
    -- Response Details
    response_type VARCHAR(50) NOT NULL, -- reply, resolution, follow_up
    content TEXT NOT NULL,
    
    -- Response Information
    is_public BOOLEAN DEFAULT false, -- for public responses to reviews
    internal_notes TEXT,
    
    -- Status
    status VARCHAR(50) DEFAULT 'draft', -- draft, sent, delivered, read
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES auth.users(id)
);

-- Customer Segments Table
CREATE TABLE IF NOT EXISTS customer_segments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Segment Details
    name VARCHAR(255) NOT NULL,
    description TEXT,
    segment_type VARCHAR(50) DEFAULT 'manual', -- manual, automatic, dynamic
    
    -- Criteria (JSON for flexible filtering)
    criteria JSONB NOT NULL DEFAULT '{}',
    
    -- Statistics
    member_count INTEGER DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Visual
    color VARCHAR(7) DEFAULT '#6B7280',
    icon VARCHAR(50),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Marketing Campaigns Table
CREATE TABLE IF NOT EXISTS marketing_campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Campaign Details
    name VARCHAR(255) NOT NULL,
    description TEXT,
    campaign_type VARCHAR(50) NOT NULL, -- email, sms, push, social, direct_mail
    
    -- Content
    subject_line VARCHAR(255),
    content TEXT,
    template_id UUID,
    
    -- Target Audience
    target_segment_id UUID REFERENCES customer_segments(id),
    target_criteria JSONB DEFAULT '{}',
    
    -- Schedule
    scheduled_at TIMESTAMP WITH TIME ZONE,
    start_date DATE,
    end_date DATE,
    
    -- Status
    status VARCHAR(50) DEFAULT 'draft', -- draft, scheduled, active, paused, completed, cancelled
    
    -- Performance Tracking
    total_recipients INTEGER DEFAULT 0,
    sent_count INTEGER DEFAULT 0,
    delivered_count INTEGER DEFAULT 0,
    opened_count INTEGER DEFAULT 0,
    clicked_count INTEGER DEFAULT 0,
    converted_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES auth.users(id)
);

-- Customer Lifecycle Table
CREATE TABLE IF NOT EXISTS customer_lifecycle (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    
    -- Lifecycle Information
    current_stage VARCHAR(50) NOT NULL, -- prospect, lead, customer, advocate, churned
    previous_stage VARCHAR(50),
    
    -- Stage Transitions
    stage_transitions JSONB DEFAULT '[]', -- array of stage changes with dates
    
    -- Stage-specific Data
    stage_data JSONB DEFAULT '{}', -- additional data for each stage
    
    -- Metrics
    time_in_current_stage INTEGER, -- days
    total_lifetime_value DECIMAL(15,2) DEFAULT 0,
    
    -- Predictions
    churn_probability DECIMAL(5,4), -- 0-1 scale
    next_purchase_probability DECIMAL(5,4), -- 0-1 scale
    predicted_lifetime_value DECIMAL(15,2),
    
    -- Last Activity
    last_activity_date TIMESTAMP WITH TIME ZONE,
    last_purchase_date TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- STEP 2: CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Customer Profiles Indexes
CREATE INDEX IF NOT EXISTS idx_customer_profiles_tenant_customer ON customer_profiles(tenant_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_profiles_status ON customer_profiles(tenant_id, customer_status);
CREATE INDEX IF NOT EXISTS idx_customer_profiles_tier ON customer_profiles(tenant_id, customer_tier);
CREATE INDEX IF NOT EXISTS idx_customer_profiles_lifecycle ON customer_profiles(tenant_id, lifecycle_stage);

-- Customer Interactions Indexes
CREATE INDEX IF NOT EXISTS idx_customer_interactions_tenant_customer ON customer_interactions(tenant_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_interactions_type ON customer_interactions(tenant_id, interaction_type);
CREATE INDEX IF NOT EXISTS idx_customer_interactions_date ON customer_interactions(tenant_id, created_at);

-- Customer Opportunities Indexes
CREATE INDEX IF NOT EXISTS idx_customer_opportunities_tenant_customer ON customer_opportunities(tenant_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_opportunities_stage ON customer_opportunities(tenant_id, pipeline_stage);
CREATE INDEX IF NOT EXISTS idx_customer_opportunities_status ON customer_opportunities(tenant_id, status);

-- Loyalty Indexes
CREATE INDEX IF NOT EXISTS idx_customer_loyalty_tenant_customer ON customer_loyalty(tenant_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_loyalty_program ON customer_loyalty(tenant_id, program_id);
CREATE INDEX IF NOT EXISTS idx_customer_loyalty_tier ON customer_loyalty(tenant_id, current_tier_id);

-- Loyalty Transactions Indexes
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_tenant_customer ON loyalty_transactions(tenant_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_type ON loyalty_transactions(tenant_id, transaction_type);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_date ON loyalty_transactions(tenant_id, created_at);

-- Feedback Indexes
CREATE INDEX IF NOT EXISTS idx_customer_feedback_tenant_customer ON customer_feedback(tenant_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_feedback_type ON customer_feedback(tenant_id, feedback_type);
CREATE INDEX IF NOT EXISTS idx_customer_feedback_status ON customer_feedback(tenant_id, status);

-- Campaign Indexes
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_tenant ON marketing_campaigns(tenant_id);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_status ON marketing_campaigns(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_type ON marketing_campaigns(tenant_id, campaign_type);

-- Lifecycle Indexes
CREATE INDEX IF NOT EXISTS idx_customer_lifecycle_tenant_customer ON customer_lifecycle(tenant_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_lifecycle_stage ON customer_lifecycle(tenant_id, current_stage);

-- ============================================================================
-- STEP 3: ENABLE ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE customer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_loyalty ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_lifecycle ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 4: CREATE RLS POLICIES
-- ============================================================================

-- Customer Profiles Policies
CREATE POLICY "Users can view customer profiles for their tenant" ON customer_profiles
    FOR SELECT USING (tenant_id::text = (auth.jwt() ->> 'tenant_id'));

CREATE POLICY "Users can insert customer profiles for their tenant" ON customer_profiles
    FOR INSERT WITH CHECK (tenant_id::text = (auth.jwt() ->> 'tenant_id'));

CREATE POLICY "Users can update customer profiles for their tenant" ON customer_profiles
    FOR UPDATE USING (tenant_id::text = (auth.jwt() ->> 'tenant_id'));

-- Customer Interactions Policies
CREATE POLICY "Users can view customer interactions for their tenant" ON customer_interactions
    FOR SELECT USING (tenant_id::text = (auth.jwt() ->> 'tenant_id'));

CREATE POLICY "Users can insert customer interactions for their tenant" ON customer_interactions
    FOR INSERT WITH CHECK (tenant_id::text = (auth.jwt() ->> 'tenant_id'));

-- Customer Opportunities Policies
CREATE POLICY "Users can view customer opportunities for their tenant" ON customer_opportunities
    FOR SELECT USING (tenant_id::text = (auth.jwt() ->> 'tenant_id'));

CREATE POLICY "Users can insert customer opportunities for their tenant" ON customer_opportunities
    FOR INSERT WITH CHECK (tenant_id::text = (auth.jwt() ->> 'tenant_id'));

-- Loyalty Programs Policies
CREATE POLICY "Users can view loyalty programs for their tenant" ON loyalty_programs
    FOR SELECT USING (tenant_id::text = (auth.jwt() ->> 'tenant_id'));

CREATE POLICY "Users can manage loyalty programs for their tenant" ON loyalty_programs
    FOR ALL USING (tenant_id::text = (auth.jwt() ->> 'tenant_id'));

-- Customer Loyalty Policies
CREATE POLICY "Users can view customer loyalty for their tenant" ON customer_loyalty
    FOR SELECT USING (tenant_id::text = (auth.jwt() ->> 'tenant_id'));

CREATE POLICY "Users can manage customer loyalty for their tenant" ON customer_loyalty
    FOR ALL USING (tenant_id::text = (auth.jwt() ->> 'tenant_id'));

-- Loyalty Transactions Policies
CREATE POLICY "Users can view loyalty transactions for their tenant" ON loyalty_transactions
    FOR SELECT USING (tenant_id::text = (auth.jwt() ->> 'tenant_id'));

CREATE POLICY "Users can insert loyalty transactions for their tenant" ON loyalty_transactions
    FOR INSERT WITH CHECK (tenant_id::text = (auth.jwt() ->> 'tenant_id'));

-- Customer Feedback Policies
CREATE POLICY "Users can view customer feedback for their tenant" ON customer_feedback
    FOR SELECT USING (tenant_id::text = (auth.jwt() ->> 'tenant_id'));

CREATE POLICY "Users can manage customer feedback for their tenant" ON customer_feedback
    FOR ALL USING (tenant_id::text = (auth.jwt() ->> 'tenant_id'));

-- Marketing Campaigns Policies
CREATE POLICY "Users can view marketing campaigns for their tenant" ON marketing_campaigns
    FOR SELECT USING (tenant_id::text = (auth.jwt() ->> 'tenant_id'));

CREATE POLICY "Users can manage marketing campaigns for their tenant" ON marketing_campaigns
    FOR ALL USING (tenant_id::text = (auth.jwt() ->> 'tenant_id'));

-- ============================================================================
-- STEP 5: INSERT SAMPLE DATA
-- ============================================================================

-- Insert sample loyalty program
INSERT INTO loyalty_programs (
    tenant_id,
    name,
    description,
    program_type,
    points_per_currency,
    minimum_redemption_points,
    is_active
) VALUES (
    '6742eb8a-434e-4c14-a91c-6d55adeb5750'::UUID,
    'Vibe Rewards',
    'Earn points on every purchase and redeem for rewards',
    'points',
    1.0,
    100,
    true
) ON CONFLICT DO NOTHING;

-- Insert sample loyalty tiers
INSERT INTO loyalty_tiers (
    tenant_id,
    program_id,
    name,
    description,
    tier_level,
    minimum_points,
    points_multiplier,
    discount_percentage,
    color
) VALUES 
(
    '6742eb8a-434e-4c14-a91c-6d55adeb5750'::UUID,
    (SELECT id FROM loyalty_programs WHERE tenant_id = '6742eb8a-434e-4c14-a91c-6d55adeb5750'::UUID LIMIT 1),
    'Bronze',
    'New members start here',
    1,
    0,
    1.0,
    0,
    '#CD7F32'
),
(
    '6742eb8a-434e-4c14-a91c-6d55adeb5750'::UUID,
    (SELECT id FROM loyalty_programs WHERE tenant_id = '6742eb8a-434e-4c14-a91c-6d55adeb5750'::UUID LIMIT 1),
    'Silver',
    'Earn 1.2x points on purchases',
    2,
    1000,
    1.2,
    5,
    '#C0C0C0'
),
(
    '6742eb8a-434e-4c14-a91c-6d55adeb5750'::UUID,
    (SELECT id FROM loyalty_programs WHERE tenant_id = '6742eb8a-434e-4c14-a91c-6d55adeb5750'::UUID LIMIT 1),
    'Gold',
    'Earn 1.5x points and get 10% discount',
    3,
    5000,
    1.5,
    10,
    '#FFD700'
),
(
    '6742eb8a-434e-4c14-a91c-6d55adeb5750'::UUID,
    (SELECT id FROM loyalty_programs WHERE tenant_id = '6742eb8a-434e-4c14-a91c-6d55adeb5750'::UUID LIMIT 1),
    'Platinum',
    'Earn 2x points and get 15% discount with free shipping',
    4,
    10000,
    2.0,
    15,
    '#E5E4E2'
) ON CONFLICT DO NOTHING;

-- Insert sample customer segment
INSERT INTO customer_segments (
    tenant_id,
    name,
    description,
    segment_type,
    criteria,
    color,
    icon
) VALUES (
    '6742eb8a-434e-4c14-a91c-6d55adeb5750'::UUID,
    'High-Value Customers',
    'Customers with high lifetime value',
    'automatic',
    '{"min_lifetime_value": 1000, "min_orders": 5}',
    '#10B981',
    'star'
) ON CONFLICT DO NOTHING;

-- ============================================================================
-- STEP 6: VERIFICATION
-- ============================================================================

-- Check if tables were created
SELECT 'Table Creation Status' as info_type,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customer_profiles') THEN 'SUCCESS' ELSE 'FAILED' END as customer_profiles,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customer_interactions') THEN 'SUCCESS' ELSE 'FAILED' END as customer_interactions,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customer_opportunities') THEN 'SUCCESS' ELSE 'FAILED' END as customer_opportunities,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'loyalty_programs') THEN 'SUCCESS' ELSE 'FAILED' END as loyalty_programs,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customer_loyalty') THEN 'SUCCESS' ELSE 'FAILED' END as customer_loyalty,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customer_feedback') THEN 'SUCCESS' ELSE 'FAILED' END as customer_feedback,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'marketing_campaigns') THEN 'SUCCESS' ELSE 'FAILED' END as marketing_campaigns;

-- Check sample data
SELECT 'Sample Data Status' as info_type,
       (SELECT COUNT(*) FROM loyalty_programs WHERE tenant_id = '6742eb8a-434e-4c14-a91c-6d55adeb5750'::UUID) as loyalty_programs_count,
       (SELECT COUNT(*) FROM loyalty_tiers WHERE tenant_id = '6742eb8a-434e-4c14-a91c-6d55adeb5750'::UUID) as loyalty_tiers_count,
       (SELECT COUNT(*) FROM customer_segments WHERE tenant_id = '6742eb8a-434e-4c14-a91c-6d55adeb5750'::UUID) as customer_segments_count;
