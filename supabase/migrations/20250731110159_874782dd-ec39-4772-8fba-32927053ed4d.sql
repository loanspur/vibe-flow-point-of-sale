-- Create client reviews and feedback system

-- Create reviews table for tracking all feedback
CREATE TABLE public.client_reviews (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL,
    contact_id UUID REFERENCES public.contacts(id),
    reviewer_name TEXT NOT NULL,
    reviewer_email TEXT NOT NULL,
    reviewer_phone TEXT,
    reviewer_company TEXT,
    client_type TEXT NOT NULL CHECK (client_type IN ('existing', 'prospective', 'trial', 'former')),
    review_type TEXT NOT NULL CHECK (review_type IN ('product_review', 'service_feedback', 'feature_request', 'bug_report', 'testimonial', 'complaint', 'suggestion')),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    pros TEXT,
    cons TEXT,
    source TEXT NOT NULL CHECK (source IN ('website', 'email', 'phone', 'in_person', 'survey', 'support_ticket', 'social_media')),
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'responded', 'escalated', 'resolved', 'archived')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    category TEXT,
    tags JSONB DEFAULT '[]'::jsonb,
    is_public BOOLEAN DEFAULT false,
    is_featured BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by UUID,
    responded_at TIMESTAMP WITH TIME ZONE,
    responded_by UUID,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create review responses table
CREATE TABLE public.review_responses (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    review_id UUID NOT NULL REFERENCES public.client_reviews(id) ON DELETE CASCADE,
    responder_id UUID NOT NULL,
    response_text TEXT NOT NULL,
    response_type TEXT NOT NULL CHECK (response_type IN ('public_reply', 'private_message', 'internal_note', 'escalation')),
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create review attachments table
CREATE TABLE public.review_attachments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    review_id UUID NOT NULL REFERENCES public.client_reviews(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size INTEGER,
    uploaded_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create review analytics table for tracking metrics
CREATE TABLE public.review_analytics (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_reviews INTEGER DEFAULT 0,
    average_rating NUMERIC(3,2) DEFAULT 0,
    new_reviews INTEGER DEFAULT 0,
    responded_reviews INTEGER DEFAULT 0,
    response_time_hours NUMERIC DEFAULT 0,
    satisfaction_score NUMERIC(3,2) DEFAULT 0,
    client_type_breakdown JSONB DEFAULT '{}'::jsonb,
    category_breakdown JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, date)
);

-- Enable RLS on all tables
ALTER TABLE public.client_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for client_reviews
CREATE POLICY "Tenant staff can manage reviews" 
ON public.client_reviews 
FOR ALL 
USING (tenant_id = get_user_tenant_id() AND get_current_user_role() = ANY(ARRAY['superadmin'::user_role, 'admin'::user_role, 'manager'::user_role]));

CREATE POLICY "Tenant users can view reviews" 
ON public.client_reviews 
FOR SELECT 
USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Anyone can submit reviews" 
ON public.client_reviews 
FOR INSERT 
WITH CHECK (true);

-- RLS Policies for review_responses
CREATE POLICY "Tenant staff can manage responses" 
ON public.review_responses 
FOR ALL 
USING (review_id IN (SELECT id FROM client_reviews WHERE tenant_id = get_user_tenant_id()) AND get_current_user_role() = ANY(ARRAY['superadmin'::user_role, 'admin'::user_role, 'manager'::user_role]));

CREATE POLICY "Tenant users can view responses" 
ON public.review_responses 
FOR SELECT 
USING (review_id IN (SELECT id FROM client_reviews WHERE tenant_id = get_user_tenant_id()));

-- RLS Policies for review_attachments
CREATE POLICY "Tenant staff can manage attachments" 
ON public.review_attachments 
FOR ALL 
USING (review_id IN (SELECT id FROM client_reviews WHERE tenant_id = get_user_tenant_id()) AND get_current_user_role() = ANY(ARRAY['superadmin'::user_role, 'admin'::user_role, 'manager'::user_role]));

CREATE POLICY "Tenant users can view attachments" 
ON public.review_attachments 
FOR SELECT 
USING (review_id IN (SELECT id FROM client_reviews WHERE tenant_id = get_user_tenant_id()));

-- RLS Policies for review_analytics
CREATE POLICY "Tenant staff can view analytics" 
ON public.review_analytics 
FOR SELECT 
USING (tenant_id = get_user_tenant_id());

CREATE POLICY "System can manage analytics" 
ON public.review_analytics 
FOR ALL 
USING (true);

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION update_review_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_client_reviews_updated_at
    BEFORE UPDATE ON public.client_reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_review_updated_at();

CREATE TRIGGER update_review_responses_updated_at
    BEFORE UPDATE ON public.review_responses
    FOR EACH ROW
    EXECUTE FUNCTION update_review_updated_at();

CREATE TRIGGER update_review_analytics_updated_at
    BEFORE UPDATE ON public.review_analytics
    FOR EACH ROW
    EXECUTE FUNCTION update_review_updated_at();

-- Create function to calculate review analytics
CREATE OR REPLACE FUNCTION public.calculate_review_analytics(tenant_id_param UUID, date_param DATE DEFAULT CURRENT_DATE)
RETURNS VOID AS $$
DECLARE
    review_stats RECORD;
    avg_response_time NUMERIC;
BEGIN
    -- Calculate daily review statistics
    SELECT 
        COUNT(*) as total_reviews,
        AVG(rating) as average_rating,
        COUNT(CASE WHEN DATE(created_at) = date_param THEN 1 END) as new_reviews,
        COUNT(CASE WHEN responded_at IS NOT NULL THEN 1 END) as responded_reviews
    INTO review_stats
    FROM public.client_reviews 
    WHERE tenant_id = tenant_id_param;
    
    -- Calculate average response time in hours
    SELECT AVG(EXTRACT(EPOCH FROM (responded_at - created_at))/3600)
    INTO avg_response_time
    FROM public.client_reviews 
    WHERE tenant_id = tenant_id_param 
    AND responded_at IS NOT NULL 
    AND DATE(created_at) = date_param;
    
    -- Insert or update analytics record
    INSERT INTO public.review_analytics (
        tenant_id, date, total_reviews, average_rating, new_reviews, 
        responded_reviews, response_time_hours
    ) VALUES (
        tenant_id_param, date_param, review_stats.total_reviews, 
        COALESCE(review_stats.average_rating, 0), review_stats.new_reviews,
        review_stats.responded_reviews, COALESCE(avg_response_time, 0)
    )
    ON CONFLICT (tenant_id, date) DO UPDATE SET
        total_reviews = EXCLUDED.total_reviews,
        average_rating = EXCLUDED.average_rating,
        new_reviews = EXCLUDED.new_reviews,
        responded_reviews = EXCLUDED.responded_reviews,
        response_time_hours = EXCLUDED.response_time_hours,
        updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes for better performance
CREATE INDEX idx_client_reviews_tenant_id ON public.client_reviews(tenant_id);
CREATE INDEX idx_client_reviews_status ON public.client_reviews(status);
CREATE INDEX idx_client_reviews_client_type ON public.client_reviews(client_type);
CREATE INDEX idx_client_reviews_rating ON public.client_reviews(rating);
CREATE INDEX idx_client_reviews_created_at ON public.client_reviews(created_at);
CREATE INDEX idx_review_responses_review_id ON public.review_responses(review_id);
CREATE INDEX idx_review_attachments_review_id ON public.review_attachments(review_id);
CREATE INDEX idx_review_analytics_tenant_date ON public.review_analytics(tenant_id, date);