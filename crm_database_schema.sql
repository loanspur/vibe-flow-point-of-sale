-- Advanced Customer Management Database Schema
-- Run this SQL in your Supabase SQL editor

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- CUSTOMER PROFILES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS customer_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    date_of_birth DATE,
    gender VARCHAR(20) CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
    address JSONB,
    preferences JSONB DEFAULT '{}',
    social_media JSONB DEFAULT '{}',
    notes TEXT[] DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    assigned_agent UUID REFERENCES profiles(id),
    lead_source VARCHAR(100),
    lead_score INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'prospect' CHECK (status IN ('prospect', 'customer', 'vip', 'inactive', 'churned')),
    last_contact_date TIMESTAMP WITH TIME ZONE,
    next_follow_up_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for customer_profiles
CREATE INDEX IF NOT EXISTS idx_customer_profiles_tenant_id ON customer_profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customer_profiles_email ON customer_profiles(email);
CREATE INDEX IF NOT EXISTS idx_customer_profiles_status ON customer_profiles(status);
CREATE INDEX IF NOT EXISTS idx_customer_profiles_lead_score ON customer_profiles(lead_score);

-- ============================================================================
-- CUSTOMER INTERACTIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS customer_interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customer_profiles(id) ON DELETE CASCADE,
    interaction_type VARCHAR(20) NOT NULL CHECK (interaction_type IN ('call', 'email', 'meeting', 'note', 'purchase', 'support', 'marketing')),
    subject VARCHAR(255) NOT NULL,
    description TEXT,
    outcome TEXT,
    duration_minutes INTEGER,
    agent_id UUID REFERENCES profiles(id),
    related_opportunity_id UUID,
    scheduled_follow_up TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for customer_interactions
CREATE INDEX IF NOT EXISTS idx_customer_interactions_tenant_id ON customer_interactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customer_interactions_customer_id ON customer_interactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_interactions_type ON customer_interactions(interaction_type);
CREATE INDEX IF NOT EXISTS idx_customer_interactions_created_at ON customer_interactions(created_at);

-- ============================================================================
-- CUSTOMER OPPORTUNITIES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS customer_opportunities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customer_profiles(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    value DECIMAL(15,2) NOT NULL,
    probability INTEGER NOT NULL CHECK (probability BETWEEN 0 AND 100),
    stage VARCHAR(20) NOT NULL CHECK (stage IN ('prospecting', 'qualification', 'proposal', 'negotiation', 'closed_won', 'closed_lost')),
    expected_close_date DATE NOT NULL,
    assigned_agent UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for customer_opportunities
CREATE INDEX IF NOT EXISTS idx_customer_opportunities_tenant_id ON customer_opportunities(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customer_opportunities_customer_id ON customer_opportunities(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_opportunities_stage ON customer_opportunities(stage);
CREATE INDEX IF NOT EXISTS idx_customer_opportunities_close_date ON customer_opportunities(expected_close_date);

-- ============================================================================
-- LOYALTY PROGRAMS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS loyalty_programs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    points_per_currency DECIMAL(10,4) NOT NULL DEFAULT 1.0,
    redemption_rate DECIMAL(10,4) NOT NULL DEFAULT 100.0,
    minimum_redemption INTEGER NOT NULL DEFAULT 100,
    points_expiry_months INTEGER DEFAULT 12,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for loyalty_programs
CREATE INDEX IF NOT EXISTS idx_loyalty_programs_tenant_id ON loyalty_programs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_programs_active ON loyalty_programs(is_active) WHERE is_active = true;

-- ============================================================================
-- LOYALTY TIERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS loyalty_tiers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    program_id UUID NOT NULL REFERENCES loyalty_programs(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    minimum_points INTEGER NOT NULL,
    benefits JSONB DEFAULT '[]',
    discount_percentage DECIMAL(5,2) DEFAULT 0,
    free_shipping BOOLEAN DEFAULT false,
    exclusive_offers BOOLEAN DEFAULT false,
    priority_support BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for loyalty_tiers
CREATE INDEX IF NOT EXISTS idx_loyalty_tiers_program_id ON loyalty_tiers(program_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_tiers_minimum_points ON loyalty_tiers(minimum_points);

-- ============================================================================
-- CUSTOMER LOYALTY TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS customer_loyalty (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customer_profiles(id) ON DELETE CASCADE,
    program_id UUID NOT NULL REFERENCES loyalty_programs(id) ON DELETE CASCADE,
    tier_id UUID REFERENCES loyalty_tiers(id),
    current_points INTEGER DEFAULT 0,
    lifetime_points INTEGER DEFAULT 0,
    points_expiry_date DATE,
    member_since DATE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, customer_id, program_id)
);

-- Indexes for customer_loyalty
CREATE INDEX IF NOT EXISTS idx_customer_loyalty_tenant_id ON customer_loyalty(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customer_loyalty_customer_id ON customer_loyalty(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_loyalty_program_id ON customer_loyalty(program_id);
CREATE INDEX IF NOT EXISTS idx_customer_loyalty_points ON customer_loyalty(current_points);

-- ============================================================================
-- LOYALTY TRANSACTIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS loyalty_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_loyalty_id UUID NOT NULL REFERENCES customer_loyalty(id) ON DELETE CASCADE,
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('earned', 'redeemed', 'expired', 'adjusted')),
    points_amount INTEGER NOT NULL,
    description TEXT,
    related_order_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for loyalty_transactions
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_tenant_id ON loyalty_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_customer_loyalty_id ON loyalty_transactions(customer_loyalty_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_type ON loyalty_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_created_at ON loyalty_transactions(created_at);

-- ============================================================================
-- REWARDS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS rewards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    points_cost INTEGER NOT NULL,
    reward_type VARCHAR(20) NOT NULL CHECK (reward_type IN ('discount', 'free_item', 'free_shipping', 'cashback', 'gift_card')),
    reward_value DECIMAL(10,2),
    reward_data JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for rewards
CREATE INDEX IF NOT EXISTS idx_rewards_tenant_id ON rewards(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rewards_active ON rewards(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_rewards_points_cost ON rewards(points_cost);

-- ============================================================================
-- CUSTOMER FEEDBACK TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS customer_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customer_profiles(id) ON DELETE SET NULL,
    feedback_type VARCHAR(20) NOT NULL CHECK (feedback_type IN ('review', 'survey', 'complaint', 'suggestion', 'praise')),
    rating INTEGER CHECK (rating BETWEEN 1 AND 5),
    title VARCHAR(255),
    content TEXT NOT NULL,
    sentiment_score DECIMAL(3,2),
    is_anonymous BOOLEAN DEFAULT false,
    is_resolved BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for customer_feedback
CREATE INDEX IF NOT EXISTS idx_customer_feedback_tenant_id ON customer_feedback(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customer_feedback_customer_id ON customer_feedback(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_feedback_type ON customer_feedback(feedback_type);
CREATE INDEX IF NOT EXISTS idx_customer_feedback_rating ON customer_feedback(rating);
CREATE INDEX IF NOT EXISTS idx_customer_feedback_created_at ON customer_feedback(created_at);

-- ============================================================================
-- FEEDBACK RESPONSES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS feedback_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    feedback_id UUID NOT NULL REFERENCES customer_feedback(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES profiles(id),
    response_content TEXT NOT NULL,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for feedback_responses
CREATE INDEX IF NOT EXISTS idx_feedback_responses_tenant_id ON feedback_responses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_feedback_responses_feedback_id ON feedback_responses(feedback_id);
CREATE INDEX IF NOT EXISTS idx_feedback_responses_agent_id ON feedback_responses(agent_id);

-- ============================================================================
-- CUSTOMER SEGMENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS customer_segments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    segment_criteria JSONB NOT NULL,
    customer_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for customer_segments
CREATE INDEX IF NOT EXISTS idx_customer_segments_tenant_id ON customer_segments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customer_segments_active ON customer_segments(is_active) WHERE is_active = true;

-- ============================================================================
-- CUSTOMER SEGMENT MEMBERSHIPS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS customer_segment_memberships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customer_profiles(id) ON DELETE CASCADE,
    segment_id UUID NOT NULL REFERENCES customer_segments(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, customer_id, segment_id)
);

-- Indexes for customer_segment_memberships
CREATE INDEX IF NOT EXISTS idx_customer_segment_memberships_tenant_id ON customer_segment_memberships(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customer_segment_memberships_customer_id ON customer_segment_memberships(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_segment_memberships_segment_id ON customer_segment_memberships(segment_id);

-- ============================================================================
-- MARKETING CAMPAIGNS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS marketing_campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    campaign_type VARCHAR(20) NOT NULL CHECK (campaign_type IN ('email', 'sms', 'push', 'social', 'direct_mail')),
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'active', 'paused', 'completed', 'cancelled')),
    target_segment_id UUID REFERENCES customer_segments(id),
    content JSONB NOT NULL,
    scheduled_at TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    total_recipients INTEGER DEFAULT 0,
    total_sent INTEGER DEFAULT 0,
    total_opened INTEGER DEFAULT 0,
    total_clicked INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for marketing_campaigns
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_tenant_id ON marketing_campaigns(tenant_id);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_status ON marketing_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_scheduled_at ON marketing_campaigns(scheduled_at);

-- ============================================================================
-- CUSTOMER LIFECYCLE TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS customer_lifecycle (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customer_profiles(id) ON DELETE CASCADE,
    current_stage VARCHAR(20) NOT NULL CHECK (current_stage IN ('awareness', 'consideration', 'purchase', 'retention', 'advocacy', 'churned')),
    previous_stage VARCHAR(20),
    stage_changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    stage_duration_days INTEGER,
    churn_probability DECIMAL(5,4),
    next_stage_prediction VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for customer_lifecycle
CREATE INDEX IF NOT EXISTS idx_customer_lifecycle_tenant_id ON customer_lifecycle(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customer_lifecycle_customer_id ON customer_lifecycle(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_lifecycle_stage ON customer_lifecycle(current_stage);
CREATE INDEX IF NOT EXISTS idx_customer_lifecycle_churn_probability ON customer_lifecycle(churn_probability);

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================================
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
ALTER TABLE customer_segment_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_lifecycle ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Customer Profiles Policies
DROP POLICY IF EXISTS "Users can view customer_profiles for their tenant" ON customer_profiles;
CREATE POLICY "Users can view customer_profiles for their tenant" ON customer_profiles
    FOR SELECT USING (tenant_id::text = (auth.jwt() ->> 'tenant_id'));

DROP POLICY IF EXISTS "Users can insert customer_profiles for their tenant" ON customer_profiles;
CREATE POLICY "Users can insert customer_profiles for their tenant" ON customer_profiles
    FOR INSERT WITH CHECK (tenant_id::text = (auth.jwt() ->> 'tenant_id'));

DROP POLICY IF EXISTS "Users can update customer_profiles for their tenant" ON customer_profiles;
CREATE POLICY "Users can update customer_profiles for their tenant" ON customer_profiles
    FOR UPDATE USING (tenant_id::text = (auth.jwt() ->> 'tenant_id'));

DROP POLICY IF EXISTS "Users can delete customer_profiles for their tenant" ON customer_profiles;
CREATE POLICY "Users can delete customer_profiles for their tenant" ON customer_profiles
    FOR DELETE USING (tenant_id::text = (auth.jwt() ->> 'tenant_id'));

-- Customer Interactions Policies
DROP POLICY IF EXISTS "Users can view customer_interactions for their tenant" ON customer_interactions;
CREATE POLICY "Users can view customer_interactions for their tenant" ON customer_interactions
    FOR SELECT USING (tenant_id::text = (auth.jwt() ->> 'tenant_id'));

DROP POLICY IF EXISTS "Users can insert customer_interactions for their tenant" ON customer_interactions;
CREATE POLICY "Users can insert customer_interactions for their tenant" ON customer_interactions
    FOR INSERT WITH CHECK (tenant_id::text = (auth.jwt() ->> 'tenant_id'));

DROP POLICY IF EXISTS "Users can update customer_interactions for their tenant" ON customer_interactions;
CREATE POLICY "Users can update customer_interactions for their tenant" ON customer_interactions
    FOR UPDATE USING (tenant_id::text = (auth.jwt() ->> 'tenant_id'));

DROP POLICY IF EXISTS "Users can delete customer_interactions for their tenant" ON customer_interactions;
CREATE POLICY "Users can delete customer_interactions for their tenant" ON customer_interactions
    FOR DELETE USING (tenant_id::text = (auth.jwt() ->> 'tenant_id'));

-- Customer Opportunities Policies
DROP POLICY IF EXISTS "Users can view customer_opportunities for their tenant" ON customer_opportunities;
CREATE POLICY "Users can view customer_opportunities for their tenant" ON customer_opportunities
    FOR SELECT USING (tenant_id::text = (auth.jwt() ->> 'tenant_id'));

DROP POLICY IF EXISTS "Users can insert customer_opportunities for their tenant" ON customer_opportunities;
CREATE POLICY "Users can insert customer_opportunities for their tenant" ON customer_opportunities
    FOR INSERT WITH CHECK (tenant_id::text = (auth.jwt() ->> 'tenant_id'));

DROP POLICY IF EXISTS "Users can update customer_opportunities for their tenant" ON customer_opportunities;
CREATE POLICY "Users can update customer_opportunities for their tenant" ON customer_opportunities
    FOR UPDATE USING (tenant_id::text = (auth.jwt() ->> 'tenant_id'));

DROP POLICY IF EXISTS "Users can delete customer_opportunities for their tenant" ON customer_opportunities;
CREATE POLICY "Users can delete customer_opportunities for their tenant" ON customer_opportunities
    FOR DELETE USING (tenant_id::text = (auth.jwt() ->> 'tenant_id'));

-- Loyalty Programs Policies
DROP POLICY IF EXISTS "Users can view loyalty_programs for their tenant" ON loyalty_programs;
CREATE POLICY "Users can view loyalty_programs for their tenant" ON loyalty_programs
    FOR SELECT USING (tenant_id::text = (auth.jwt() ->> 'tenant_id'));

DROP POLICY IF EXISTS "Users can insert loyalty_programs for their tenant" ON loyalty_programs;
CREATE POLICY "Users can insert loyalty_programs for their tenant" ON loyalty_programs
    FOR INSERT WITH CHECK (tenant_id::text = (auth.jwt() ->> 'tenant_id'));

DROP POLICY IF EXISTS "Users can update loyalty_programs for their tenant" ON loyalty_programs;
CREATE POLICY "Users can update loyalty_programs for their tenant" ON loyalty_programs
    FOR UPDATE USING (tenant_id::text = (auth.jwt() ->> 'tenant_id'));

DROP POLICY IF EXISTS "Users can delete loyalty_programs for their tenant" ON loyalty_programs;
CREATE POLICY "Users can delete loyalty_programs for their tenant" ON loyalty_programs
    FOR DELETE USING (tenant_id::text = (auth.jwt() ->> 'tenant_id'));

-- Loyalty Tiers Policies
DROP POLICY IF EXISTS "Users can view loyalty_tiers for their tenant" ON loyalty_tiers;
CREATE POLICY "Users can view loyalty_tiers for their tenant" ON loyalty_tiers
    FOR SELECT USING (program_id IN (SELECT id FROM loyalty_programs WHERE tenant_id::text = (auth.jwt() ->> 'tenant_id')));

DROP POLICY IF EXISTS "Users can insert loyalty_tiers for their tenant" ON loyalty_tiers;
CREATE POLICY "Users can insert loyalty_tiers for their tenant" ON loyalty_tiers
    FOR INSERT WITH CHECK (program_id IN (SELECT id FROM loyalty_programs WHERE tenant_id::text = (auth.jwt() ->> 'tenant_id')));

DROP POLICY IF EXISTS "Users can update loyalty_tiers for their tenant" ON loyalty_tiers;
CREATE POLICY "Users can update loyalty_tiers for their tenant" ON loyalty_tiers
    FOR UPDATE USING (program_id IN (SELECT id FROM loyalty_programs WHERE tenant_id::text = (auth.jwt() ->> 'tenant_id')));

DROP POLICY IF EXISTS "Users can delete loyalty_tiers for their tenant" ON loyalty_tiers;
CREATE POLICY "Users can delete loyalty_tiers for their tenant" ON loyalty_tiers
    FOR DELETE USING (program_id IN (SELECT id FROM loyalty_programs WHERE tenant_id::text = (auth.jwt() ->> 'tenant_id')));

-- Customer Loyalty Policies
DROP POLICY IF EXISTS "Users can view customer_loyalty for their tenant" ON customer_loyalty;
CREATE POLICY "Users can view customer_loyalty for their tenant" ON customer_loyalty
    FOR SELECT USING (tenant_id::text = (auth.jwt() ->> 'tenant_id'));

DROP POLICY IF EXISTS "Users can insert customer_loyalty for their tenant" ON customer_loyalty;
CREATE POLICY "Users can insert customer_loyalty for their tenant" ON customer_loyalty
    FOR INSERT WITH CHECK (tenant_id::text = (auth.jwt() ->> 'tenant_id'));

DROP POLICY IF EXISTS "Users can update customer_loyalty for their tenant" ON customer_loyalty;
CREATE POLICY "Users can update customer_loyalty for their tenant" ON customer_loyalty
    FOR UPDATE USING (tenant_id::text = (auth.jwt() ->> 'tenant_id'));

DROP POLICY IF EXISTS "Users can delete customer_loyalty for their tenant" ON customer_loyalty;
CREATE POLICY "Users can delete customer_loyalty for their tenant" ON customer_loyalty
    FOR DELETE USING (tenant_id::text = (auth.jwt() ->> 'tenant_id'));

-- Loyalty Transactions Policies
DROP POLICY IF EXISTS "Users can view loyalty_transactions for their tenant" ON loyalty_transactions;
CREATE POLICY "Users can view loyalty_transactions for their tenant" ON loyalty_transactions
    FOR SELECT USING (tenant_id::text = (auth.jwt() ->> 'tenant_id'));

DROP POLICY IF EXISTS "Users can insert loyalty_transactions for their tenant" ON loyalty_transactions;
CREATE POLICY "Users can insert loyalty_transactions for their tenant" ON loyalty_transactions
    FOR INSERT WITH CHECK (tenant_id::text = (auth.jwt() ->> 'tenant_id'));

DROP POLICY IF EXISTS "Users can update loyalty_transactions for their tenant" ON loyalty_transactions;
CREATE POLICY "Users can update loyalty_transactions for their tenant" ON loyalty_transactions
    FOR UPDATE USING (tenant_id::text = (auth.jwt() ->> 'tenant_id'));

DROP POLICY IF EXISTS "Users can delete loyalty_transactions for their tenant" ON loyalty_transactions;
CREATE POLICY "Users can delete loyalty_transactions for their tenant" ON loyalty_transactions
    FOR DELETE USING (tenant_id::text = (auth.jwt() ->> 'tenant_id'));

-- Rewards Policies
DROP POLICY IF EXISTS "Users can view rewards for their tenant" ON rewards;
CREATE POLICY "Users can view rewards for their tenant" ON rewards
    FOR SELECT USING (tenant_id::text = (auth.jwt() ->> 'tenant_id'));

DROP POLICY IF EXISTS "Users can insert rewards for their tenant" ON rewards;
CREATE POLICY "Users can insert rewards for their tenant" ON rewards
    FOR INSERT WITH CHECK (tenant_id::text = (auth.jwt() ->> 'tenant_id'));

DROP POLICY IF EXISTS "Users can update rewards for their tenant" ON rewards;
CREATE POLICY "Users can update rewards for their tenant" ON rewards
    FOR UPDATE USING (tenant_id::text = (auth.jwt() ->> 'tenant_id'));

DROP POLICY IF EXISTS "Users can delete rewards for their tenant" ON rewards;
CREATE POLICY "Users can delete rewards for their tenant" ON rewards
    FOR DELETE USING (tenant_id::text = (auth.jwt() ->> 'tenant_id'));

-- Customer Feedback Policies
DROP POLICY IF EXISTS "Users can view customer_feedback for their tenant" ON customer_feedback;
CREATE POLICY "Users can view customer_feedback for their tenant" ON customer_feedback
    FOR SELECT USING (tenant_id::text = (auth.jwt() ->> 'tenant_id'));

DROP POLICY IF EXISTS "Users can insert customer_feedback for their tenant" ON customer_feedback;
CREATE POLICY "Users can insert customer_feedback for their tenant" ON customer_feedback
    FOR INSERT WITH CHECK (tenant_id::text = (auth.jwt() ->> 'tenant_id'));

DROP POLICY IF EXISTS "Users can update customer_feedback for their tenant" ON customer_feedback;
CREATE POLICY "Users can update customer_feedback for their tenant" ON customer_feedback
    FOR UPDATE USING (tenant_id::text = (auth.jwt() ->> 'tenant_id'));

DROP POLICY IF EXISTS "Users can delete customer_feedback for their tenant" ON customer_feedback;
CREATE POLICY "Users can delete customer_feedback for their tenant" ON customer_feedback
    FOR DELETE USING (tenant_id::text = (auth.jwt() ->> 'tenant_id'));

-- Feedback Responses Policies
DROP POLICY IF EXISTS "Users can view feedback_responses for their tenant" ON feedback_responses;
CREATE POLICY "Users can view feedback_responses for their tenant" ON feedback_responses
    FOR SELECT USING (tenant_id::text = (auth.jwt() ->> 'tenant_id'));

DROP POLICY IF EXISTS "Users can insert feedback_responses for their tenant" ON feedback_responses;
CREATE POLICY "Users can insert feedback_responses for their tenant" ON feedback_responses
    FOR INSERT WITH CHECK (tenant_id::text = (auth.jwt() ->> 'tenant_id'));

DROP POLICY IF EXISTS "Users can update feedback_responses for their tenant" ON feedback_responses;
CREATE POLICY "Users can update feedback_responses for their tenant" ON feedback_responses
    FOR UPDATE USING (tenant_id::text = (auth.jwt() ->> 'tenant_id'));

DROP POLICY IF EXISTS "Users can delete feedback_responses for their tenant" ON feedback_responses;
CREATE POLICY "Users can delete feedback_responses for their tenant" ON feedback_responses
    FOR DELETE USING (tenant_id::text = (auth.jwt() ->> 'tenant_id'));

-- Customer Segments Policies
DROP POLICY IF EXISTS "Users can view customer_segments for their tenant" ON customer_segments;
CREATE POLICY "Users can view customer_segments for their tenant" ON customer_segments
    FOR SELECT USING (tenant_id::text = (auth.jwt() ->> 'tenant_id'));

DROP POLICY IF EXISTS "Users can insert customer_segments for their tenant" ON customer_segments;
CREATE POLICY "Users can insert customer_segments for their tenant" ON customer_segments
    FOR INSERT WITH CHECK (tenant_id::text = (auth.jwt() ->> 'tenant_id'));

DROP POLICY IF EXISTS "Users can update customer_segments for their tenant" ON customer_segments;
CREATE POLICY "Users can update customer_segments for their tenant" ON customer_segments
    FOR UPDATE USING (tenant_id::text = (auth.jwt() ->> 'tenant_id'));

DROP POLICY IF EXISTS "Users can delete customer_segments for their tenant" ON customer_segments;
CREATE POLICY "Users can delete customer_segments for their tenant" ON customer_segments
    FOR DELETE USING (tenant_id::text = (auth.jwt() ->> 'tenant_id'));

-- Customer Segment Memberships Policies
DROP POLICY IF EXISTS "Users can view customer_segment_memberships for their tenant" ON customer_segment_memberships;
CREATE POLICY "Users can view customer_segment_memberships for their tenant" ON customer_segment_memberships
    FOR SELECT USING (tenant_id::text = (auth.jwt() ->> 'tenant_id'));

DROP POLICY IF EXISTS "Users can insert customer_segment_memberships for their tenant" ON customer_segment_memberships;
CREATE POLICY "Users can insert customer_segment_memberships for their tenant" ON customer_segment_memberships
    FOR INSERT WITH CHECK (tenant_id::text = (auth.jwt() ->> 'tenant_id'));

DROP POLICY IF EXISTS "Users can update customer_segment_memberships for their tenant" ON customer_segment_memberships;
CREATE POLICY "Users can update customer_segment_memberships for their tenant" ON customer_segment_memberships
    FOR UPDATE USING (tenant_id::text = (auth.jwt() ->> 'tenant_id'));

DROP POLICY IF EXISTS "Users can delete customer_segment_memberships for their tenant" ON customer_segment_memberships;
CREATE POLICY "Users can delete customer_segment_memberships for their tenant" ON customer_segment_memberships
    FOR DELETE USING (tenant_id::text = (auth.jwt() ->> 'tenant_id'));

-- Marketing Campaigns Policies
DROP POLICY IF EXISTS "Users can view marketing_campaigns for their tenant" ON marketing_campaigns;
CREATE POLICY "Users can view marketing_campaigns for their tenant" ON marketing_campaigns
    FOR SELECT USING (tenant_id::text = (auth.jwt() ->> 'tenant_id'));

DROP POLICY IF EXISTS "Users can insert marketing_campaigns for their tenant" ON marketing_campaigns;
CREATE POLICY "Users can insert marketing_campaigns for their tenant" ON marketing_campaigns
    FOR INSERT WITH CHECK (tenant_id::text = (auth.jwt() ->> 'tenant_id'));

DROP POLICY IF EXISTS "Users can update marketing_campaigns for their tenant" ON marketing_campaigns;
CREATE POLICY "Users can update marketing_campaigns for their tenant" ON marketing_campaigns
    FOR UPDATE USING (tenant_id::text = (auth.jwt() ->> 'tenant_id'));

DROP POLICY IF EXISTS "Users can delete marketing_campaigns for their tenant" ON marketing_campaigns;
CREATE POLICY "Users can delete marketing_campaigns for their tenant" ON marketing_campaigns
    FOR DELETE USING (tenant_id::text = (auth.jwt() ->> 'tenant_id'));

-- Customer Lifecycle Policies
DROP POLICY IF EXISTS "Users can view customer_lifecycle for their tenant" ON customer_lifecycle;
CREATE POLICY "Users can view customer_lifecycle for their tenant" ON customer_lifecycle
    FOR SELECT USING (tenant_id::text = (auth.jwt() ->> 'tenant_id'));

DROP POLICY IF EXISTS "Users can insert customer_lifecycle for their tenant" ON customer_lifecycle;
CREATE POLICY "Users can insert customer_lifecycle for their tenant" ON customer_lifecycle
    FOR INSERT WITH CHECK (tenant_id::text = (auth.jwt() ->> 'tenant_id'));

DROP POLICY IF EXISTS "Users can update customer_lifecycle for their tenant" ON customer_lifecycle;
CREATE POLICY "Users can update customer_lifecycle for their tenant" ON customer_lifecycle
    FOR UPDATE USING (tenant_id::text = (auth.jwt() ->> 'tenant_id'));

DROP POLICY IF EXISTS "Users can delete customer_lifecycle for their tenant" ON customer_lifecycle;
CREATE POLICY "Users can delete customer_lifecycle for their tenant" ON customer_lifecycle
    FOR DELETE USING (tenant_id::text = (auth.jwt() ->> 'tenant_id'));

-- ============================================================================
-- SAMPLE DATA
-- ============================================================================

-- Sample Customer Profiles
INSERT INTO customer_profiles (tenant_id, name, email, phone, status, lead_score, created_at) VALUES
('6742eb8a-434e-4c14-a91c-6d55adeb5750'::UUID, 'John Doe', 'john.doe@example.com', '+254700123456', 'customer', 85, NOW()),
('6742eb8a-434e-4c14-a91c-6d55adeb5750'::UUID, 'Jane Smith', 'jane.smith@example.com', '+254700123457', 'vip', 95, NOW()),
('6742eb8a-434e-4c14-a91c-6d55adeb5750'::UUID, 'Bob Johnson', 'bob.johnson@example.com', '+254700123458', 'prospect', 65, NOW()),
('6742eb8a-434e-4c14-a91c-6d55adeb5750'::UUID, 'Alice Brown', 'alice.brown@example.com', '+254700123459', 'customer', 75, NOW()),
('6742eb8a-434e-4c14-a91c-6d55adeb5750'::UUID, 'Charlie Wilson', 'charlie.wilson@example.com', '+254700123460', 'inactive', 45, NOW())
ON CONFLICT DO NOTHING;

-- Sample Loyalty Program
INSERT INTO loyalty_programs (tenant_id, name, description, points_per_currency, redemption_rate, minimum_redemption, created_at) VALUES
('6742eb8a-434e-4c14-a91c-6d55adeb5750'::UUID, 'Vibe Rewards', 'Earn points on every purchase', 1.0, 100.0, 100, NOW())
ON CONFLICT DO NOTHING;

-- Sample Customer Segments
INSERT INTO customer_segments (tenant_id, name, description, segment_criteria, customer_count, created_at) VALUES
('6742eb8a-434e-4c14-a91c-6d55adeb5750'::UUID, 'VIP Customers', 'High-value customers with premium status', '{"min_lead_score": 90, "status": "vip"}', 1, NOW()),
('6742eb8a-434e-4c14-a91c-6d55adeb5750'::UUID, 'Active Customers', 'Regular customers with recent activity', '{"status": "customer", "min_lead_score": 70}', 2, NOW()),
('6742eb8a-434e-4c14-a91c-6d55adeb5750'::UUID, 'Prospects', 'Potential customers to nurture', '{"status": "prospect"}', 1, NOW())
ON CONFLICT DO NOTHING;

-- Sample Marketing Campaign
INSERT INTO marketing_campaigns (tenant_id, name, description, campaign_type, status, content, total_recipients, total_sent, total_opened, total_clicked, created_at) VALUES
('6742eb8a-434e-4c14-a91c-6d55adeb5750'::UUID, 'Welcome Campaign', 'Welcome new customers to our loyalty program', 'email', 'completed', '{"subject": "Welcome to Vibe Rewards!", "body": "Start earning points today!"}', 100, 95, 45, 12, NOW())
ON CONFLICT DO NOTHING;

-- Sample Customer Feedback
INSERT INTO customer_feedback (tenant_id, customer_id, feedback_type, rating, title, content, sentiment_score, created_at) VALUES
('6742eb8a-434e-4c14-a91c-6d55adeb5750'::UUID, (SELECT id FROM customer_profiles WHERE email = 'john.doe@example.com' LIMIT 1), 'review', 5, 'Excellent Service', 'Great experience with the loyalty program!', 0.9, NOW()),
('6742eb8a-434e-4c14-a91c-6d55adeb5750'::UUID, (SELECT id FROM customer_profiles WHERE email = 'jane.smith@example.com' LIMIT 1), 'review', 4, 'Good Experience', 'The rewards system is working well for me.', 0.7, NOW())
ON CONFLICT DO NOTHING;

-- Sample Customer Lifecycle
INSERT INTO customer_lifecycle (tenant_id, customer_id, current_stage, previous_stage, churn_probability, created_at) VALUES
('6742eb8a-434e-4c14-a91c-6d55adeb5750'::UUID, (SELECT id FROM customer_profiles WHERE email = 'john.doe@example.com' LIMIT 1), 'retention', 'purchase', 0.1, NOW()),
('6742eb8a-434e-4c14-a91c-6d55adeb5750'::UUID, (SELECT id FROM customer_profiles WHERE email = 'jane.smith@example.com' LIMIT 1), 'advocacy', 'retention', 0.05, NOW()),
('6742eb8a-434e-4c14-a91c-6d55adeb5750'::UUID, (SELECT id FROM customer_profiles WHERE email = 'bob.johnson@example.com' LIMIT 1), 'consideration', 'awareness', 0.3, NOW())
ON CONFLICT DO NOTHING;

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================

-- Create trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at columns
CREATE TRIGGER update_customer_profiles_updated_at BEFORE UPDATE ON customer_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customer_opportunities_updated_at BEFORE UPDATE ON customer_opportunities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_loyalty_programs_updated_at BEFORE UPDATE ON loyalty_programs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_rewards_updated_at BEFORE UPDATE ON rewards FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customer_feedback_updated_at BEFORE UPDATE ON customer_feedback FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customer_segments_updated_at BEFORE UPDATE ON customer_segments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_marketing_campaigns_updated_at BEFORE UPDATE ON marketing_campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customer_lifecycle_updated_at BEFORE UPDATE ON customer_lifecycle FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify tables were created
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'customer_profiles', 'customer_interactions', 'customer_opportunities',
    'loyalty_programs', 'loyalty_tiers', 'customer_loyalty', 'loyalty_transactions',
    'rewards', 'customer_feedback', 'feedback_responses', 'customer_segments',
    'customer_segment_memberships', 'marketing_campaigns', 'customer_lifecycle'
)
ORDER BY table_name;

-- Verify sample data was inserted
SELECT 'customer_profiles' as table_name, COUNT(*) as count FROM customer_profiles
UNION ALL
SELECT 'loyalty_programs' as table_name, COUNT(*) as count FROM loyalty_programs
UNION ALL
SELECT 'customer_segments' as table_name, COUNT(*) as count FROM customer_segments
UNION ALL
SELECT 'marketing_campaigns' as table_name, COUNT(*) as count FROM marketing_campaigns
UNION ALL
SELECT 'customer_feedback' as table_name, COUNT(*) as count FROM customer_feedback
UNION ALL
SELECT 'customer_lifecycle' as table_name, COUNT(*) as count FROM customer_lifecycle;
