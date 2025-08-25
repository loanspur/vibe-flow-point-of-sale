import { supabase } from '@/lib/supabase';

// CRM Interfaces
export interface CustomerProfile {
  id: string;
  tenant_id: string;
  name: string;
  email: string;
  phone: string;
  date_of_birth?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  address?: {
    street: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
  preferences: {
    communication_channel: 'email' | 'sms' | 'push' | 'mail';
    marketing_consent: boolean;
    newsletter_subscription: boolean;
    preferred_categories: string[];
    preferred_brands: string[];
  };
  social_media?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    linkedin?: string;
  };
  notes: string[];
  tags: string[];
  assigned_agent?: string;
  lead_source?: string;
  lead_score: number;
  status: 'prospect' | 'customer' | 'vip' | 'inactive' | 'churned';
  created_at: string;
  updated_at: string;
  last_contact_date?: string;
  next_follow_up_date?: string;
}

export interface CustomerInteraction {
  id: string;
  tenant_id: string;
  customer_id: string;
  interaction_type: 'call' | 'email' | 'meeting' | 'note' | 'purchase' | 'support' | 'marketing';
  subject: string;
  description: string;
  outcome: string;
  duration_minutes?: number;
  agent_id?: string;
  related_opportunity_id?: string;
  created_at: string;
  scheduled_follow_up?: string;
}

export interface CustomerOpportunity {
  id: string;
  tenant_id: string;
  customer_id: string;
  title: string;
  description: string;
  value: number;
  probability: number; // 0-100
  stage: 'prospecting' | 'qualification' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost';
  expected_close_date: string;
  assigned_agent?: string;
  created_at: string;
  updated_at: string;
}

// Loyalty Program Interfaces
export interface LoyaltyProgram {
  id: string;
  tenant_id: string;
  name: string;
  description: string;
  points_per_currency: number; // Points earned per dollar spent
  redemption_rate: number; // Points needed per dollar redeemed
  minimum_redemption: number;
  points_expiry_months: number;
  tiers: LoyaltyTier[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LoyaltyTier {
  id: string;
  program_id: string;
  name: string;
  description: string;
  minimum_points: number;
  benefits: string[];
  discount_percentage: number;
  free_shipping: boolean;
  exclusive_offers: boolean;
  priority_support: boolean;
}

export interface CustomerLoyalty {
  id: string;
  tenant_id: string;
  customer_id: string;
  program_id: string;
  current_points: number;
  lifetime_points: number;
  redeemed_points: number;
  current_tier: string;
  joined_date: string;
  last_activity_date: string;
  points_expiry_date?: string;
}

export interface LoyaltyTransaction {
  id: string;
  tenant_id: string;
  customer_id: string;
  program_id: string;
  transaction_type: 'earned' | 'redeemed' | 'expired' | 'adjusted';
  points: number;
  order_id?: string;
  description: string;
  created_at: string;
}

export interface Reward {
  id: string;
  tenant_id: string;
  program_id: string;
  name: string;
  description: string;
  points_cost: number;
  discount_amount?: number;
  discount_percentage?: number;
  free_product_id?: string;
  is_active: boolean;
  stock_quantity?: number;
  redemption_limit?: number;
  valid_from: string;
  valid_until?: string;
  created_at: string;
}

// Customer Feedback & Reviews
export interface CustomerFeedback {
  id: string;
  tenant_id: string;
  customer_id: string;
  feedback_type: 'review' | 'survey' | 'complaint' | 'suggestion' | 'praise';
  rating?: number; // 1-5 stars
  title: string;
  content: string;
  category: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  status: 'pending' | 'acknowledged' | 'resolved' | 'closed';
  assigned_to?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  order_id?: string;
  product_id?: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  resolution_notes?: string;
}

export interface FeedbackResponse {
  id: string;
  tenant_id: string;
  feedback_id: string;
  responder_id: string;
  response: string;
  is_public: boolean;
  created_at: string;
}

// Advanced Customer Segmentation
export interface CustomerSegment {
  id: string;
  tenant_id: string;
  name: string;
  description: string;
  criteria: SegmentCriteria;
  customer_count: number;
  is_dynamic: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SegmentCriteria {
  demographics?: {
    age_range?: { min: number; max: number };
    gender?: string[];
    location?: string[];
    income_range?: { min: number; max: number };
  };
  behavior?: {
    purchase_frequency?: { min: number; max: number };
    average_order_value?: { min: number; max: number };
    total_spent?: { min: number; max: number };
    last_purchase_days?: { min: number; max: number };
    preferred_categories?: string[];
    preferred_payment_methods?: string[];
  };
  engagement?: {
    email_open_rate?: { min: number; max: number };
    click_rate?: { min: number; max: number };
    social_media_engagement?: { min: number; max: number };
    support_tickets?: { min: number; max: number };
  };
  loyalty?: {
    loyalty_tier?: string[];
    points_range?: { min: number; max: number };
    member_since_days?: { min: number; max: number };
  };
  custom_fields?: Record<string, any>;
}

// Marketing Automation
export interface MarketingCampaign {
  id: string;
  tenant_id: string;
  name: string;
  description: string;
  campaign_type: 'email' | 'sms' | 'push' | 'social' | 'direct_mail';
  status: 'draft' | 'scheduled' | 'active' | 'paused' | 'completed' | 'cancelled';
  target_segments: string[];
  content: CampaignContent;
  schedule: CampaignSchedule;
  metrics: CampaignMetrics;
  created_at: string;
  updated_at: string;
  sent_at?: string;
  completed_at?: string;
}

export interface CampaignContent {
  subject?: string;
  body: string;
  template_id?: string;
  attachments?: string[];
  personalization_fields: string[];
}

export interface CampaignSchedule {
  send_date: string;
  send_time: string;
  timezone: string;
  is_recurring: boolean;
  recurrence_pattern?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  end_date?: string;
}

export interface CampaignMetrics {
  total_recipients: number;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  unsubscribed: number;
  conversion_rate: number;
  revenue_generated: number;
}

export interface MarketingAutomation {
  id: string;
  tenant_id: string;
  name: string;
  description: string;
  trigger_type: 'event' | 'schedule' | 'segment' | 'behavior';
  trigger_conditions: AutomationTrigger[];
  actions: AutomationAction[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AutomationTrigger {
  event_type: string;
  conditions: Record<string, any>;
  delay_minutes?: number;
}

export interface AutomationAction {
  action_type: 'send_email' | 'send_sms' | 'add_to_segment' | 'update_customer' | 'create_task';
  parameters: Record<string, any>;
  delay_minutes?: number;
}

// Customer Lifecycle Management
export interface CustomerLifecycle {
  id: string;
  tenant_id: string;
  customer_id: string;
  current_stage: LifecycleStage;
  stage_history: LifecycleStageHistory[];
  next_stage_prediction?: LifecycleStage;
  predicted_transition_date?: string;
  risk_score: number; // 0-100
  engagement_score: number; // 0-100
  value_score: number; // 0-100
  last_updated: string;
}

export interface LifecycleStage {
  stage: 'awareness' | 'consideration' | 'purchase' | 'retention' | 'advocacy' | 'churn';
  entered_date: string;
  duration_days: number;
  activities: string[];
  metrics: Record<string, number>;
}

export interface LifecycleStageHistory {
  stage: string;
  entered_date: string;
  exited_date?: string;
  duration_days: number;
  reason?: string;
}

export class AdvancedCustomerManagement {
  private static instance: AdvancedCustomerManagement;

  static getInstance(): AdvancedCustomerManagement {
    if (!AdvancedCustomerManagement.instance) {
      AdvancedCustomerManagement.instance = new AdvancedCustomerManagement();
    }
    return AdvancedCustomerManagement.instance;
  }

  // CRM Methods
  async createCustomerProfile(tenantId: string, profile: Omit<CustomerProfile, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>): Promise<CustomerProfile> {
    try {
      const { data, error } = await supabase
        .from('customer_profiles')
        .insert({
          ...profile,
          tenant_id: tenantId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating customer profile:', error);
      throw error;
    }
  }

  async updateCustomerProfile(tenantId: string, customerId: string, updates: Partial<CustomerProfile>): Promise<CustomerProfile> {
    try {
      const { data, error } = await supabase
        .from('customer_profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('tenant_id', tenantId)
        .eq('id', customerId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating customer profile:', error);
      throw error;
    }
  }

  async getCustomerProfile(tenantId: string, customerId: string): Promise<CustomerProfile> {
    try {
      const { data, error } = await supabase
        .from('customer_profiles')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('id', customerId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting customer profile:', error);
      throw error;
    }
  }

  async searchCustomers(tenantId: string, query: string, filters?: Record<string, any>): Promise<CustomerProfile[]> {
    try {
      let supabaseQuery = supabase
        .from('customer_profiles')
        .select('*')
        .eq('tenant_id', tenantId)
        .or(`name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%`);

      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          supabaseQuery = supabaseQuery.eq(key, value);
        });
      }

      const { data, error } = await supabaseQuery;
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error searching customers:', error);
      throw error;
    }
  }

  async addCustomerInteraction(tenantId: string, interaction: Omit<CustomerInteraction, 'id' | 'tenant_id' | 'created_at'>): Promise<CustomerInteraction> {
    try {
      const { data, error } = await supabase
        .from('customer_interactions')
        .insert({
          ...interaction,
          tenant_id: tenantId,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error adding customer interaction:', error);
      throw error;
    }
  }

  async getCustomerInteractions(tenantId: string, customerId: string): Promise<CustomerInteraction[]> {
    try {
      const { data, error } = await supabase
        .from('customer_interactions')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting customer interactions:', error);
      throw error;
    }
  }

  // Loyalty Program Methods
  async createLoyaltyProgram(tenantId: string, program: Omit<LoyaltyProgram, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>): Promise<LoyaltyProgram> {
    try {
      const { data, error } = await supabase
        .from('loyalty_programs')
        .insert({
          ...program,
          tenant_id: tenantId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating loyalty program:', error);
      throw error;
    }
  }

  async enrollCustomerInLoyalty(tenantId: string, customerId: string, programId: string): Promise<CustomerLoyalty> {
    try {
      const { data, error } = await supabase
        .from('customer_loyalty')
        .insert({
          tenant_id: tenantId,
          customer_id: customerId,
          program_id: programId,
          current_points: 0,
          lifetime_points: 0,
          redeemed_points: 0,
          current_tier: 'bronze',
          joined_date: new Date().toISOString(),
          last_activity_date: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error enrolling customer in loyalty program:', error);
      throw error;
    }
  }

  async awardPoints(tenantId: string, customerId: string, programId: string, points: number, description: string, orderId?: string): Promise<LoyaltyTransaction> {
    try {
      // Create transaction record
      const { data: transaction, error: transactionError } = await supabase
        .from('loyalty_transactions')
        .insert({
          tenant_id: tenantId,
          customer_id: customerId,
          program_id: programId,
          transaction_type: 'earned',
          points: points,
          order_id: orderId,
          description: description,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (transactionError) throw transactionError;

      // Update customer loyalty record
      const { error: updateError } = await supabase
        .from('customer_loyalty')
        .update({
          current_points: supabase.raw('current_points + ?', [points]),
          lifetime_points: supabase.raw('lifetime_points + ?', [points]),
          last_activity_date: new Date().toISOString()
        })
        .eq('tenant_id', tenantId)
        .eq('customer_id', customerId)
        .eq('program_id', programId);

      if (updateError) throw updateError;

      return transaction;
    } catch (error) {
      console.error('Error awarding points:', error);
      throw error;
    }
  }

  async redeemPoints(tenantId: string, customerId: string, programId: string, points: number, rewardId: string): Promise<LoyaltyTransaction> {
    try {
      // Check if customer has enough points
      const { data: loyalty, error: loyaltyError } = await supabase
        .from('customer_loyalty')
        .select('current_points')
        .eq('tenant_id', tenantId)
        .eq('customer_id', customerId)
        .eq('program_id', programId)
        .single();

      if (loyaltyError) throw loyaltyError;
      if (loyalty.current_points < points) {
        throw new Error('Insufficient points for redemption');
      }

      // Create transaction record
      const { data: transaction, error: transactionError } = await supabase
        .from('loyalty_transactions')
        .insert({
          tenant_id: tenantId,
          customer_id: customerId,
          program_id: programId,
          transaction_type: 'redeemed',
          points: -points,
          description: `Redeemed ${points} points for reward`,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (transactionError) throw transactionError;

      // Update customer loyalty record
      const { error: updateError } = await supabase
        .from('customer_loyalty')
        .update({
          current_points: supabase.raw('current_points - ?', [points]),
          redeemed_points: supabase.raw('redeemed_points + ?', [points]),
          last_activity_date: new Date().toISOString()
        })
        .eq('tenant_id', tenantId)
        .eq('customer_id', customerId)
        .eq('program_id', programId);

      if (updateError) throw updateError;

      return transaction;
    } catch (error) {
      console.error('Error redeeming points:', error);
      throw error;
    }
  }

  // Customer Feedback Methods
  async submitFeedback(tenantId: string, feedback: Omit<CustomerFeedback, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>): Promise<CustomerFeedback> {
    try {
      const { data, error } = await supabase
        .from('customer_feedback')
        .insert({
          ...feedback,
          tenant_id: tenantId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error submitting feedback:', error);
      throw error;
    }
  }

  async getCustomerFeedback(tenantId: string, customerId: string): Promise<CustomerFeedback[]> {
    try {
      const { data, error } = await supabase
        .from('customer_feedback')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting customer feedback:', error);
      throw error;
    }
  }

  async respondToFeedback(tenantId: string, feedbackId: string, response: Omit<FeedbackResponse, 'id' | 'tenant_id' | 'created_at'>): Promise<FeedbackResponse> {
    try {
      const { data, error } = await supabase
        .from('feedback_responses')
        .insert({
          ...response,
          tenant_id: tenantId,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // Update feedback status
      await supabase
        .from('customer_feedback')
        .update({
          status: 'acknowledged',
          updated_at: new Date().toISOString()
        })
        .eq('id', feedbackId);

      return data;
    } catch (error) {
      console.error('Error responding to feedback:', error);
      throw error;
    }
  }

  // Customer Segmentation Methods
  async createCustomerSegment(tenantId: string, segment: Omit<CustomerSegment, 'id' | 'tenant_id' | 'customer_count' | 'created_at' | 'updated_at'>): Promise<CustomerSegment> {
    try {
      const { data, error } = await supabase
        .from('customer_segments')
        .insert({
          ...segment,
          tenant_id: tenantId,
          customer_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating customer segment:', error);
      throw error;
    }
  }

  async updateSegmentMembers(tenantId: string, segmentId: string): Promise<number> {
    try {
      // This would typically involve complex query logic based on segment criteria
      // For now, we'll simulate updating the customer count
      const { data, error } = await supabase
        .from('customer_segments')
        .update({
          customer_count: supabase.raw('(SELECT COUNT(*) FROM customer_profiles WHERE tenant_id = ? AND segment_id = ?)', [tenantId, segmentId]),
          updated_at: new Date().toISOString()
        })
        .eq('id', segmentId)
        .select('customer_count')
        .single();

      if (error) throw error;
      return data.customer_count;
    } catch (error) {
      console.error('Error updating segment members:', error);
      throw error;
    }
  }

  // Marketing Campaign Methods
  async createMarketingCampaign(tenantId: string, campaign: Omit<MarketingCampaign, 'id' | 'tenant_id' | 'metrics' | 'created_at' | 'updated_at'>): Promise<MarketingCampaign> {
    try {
      const { data, error } = await supabase
        .from('marketing_campaigns')
        .insert({
          ...campaign,
          tenant_id: tenantId,
          metrics: {
            total_recipients: 0,
            sent: 0,
            delivered: 0,
            opened: 0,
            clicked: 0,
            bounced: 0,
            unsubscribed: 0,
            conversion_rate: 0,
            revenue_generated: 0
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating marketing campaign:', error);
      throw error;
    }
  }

  async sendCampaign(tenantId: string, campaignId: string): Promise<void> {
    try {
      // Update campaign status to active
      await supabase
        .from('marketing_campaigns')
        .update({
          status: 'active',
          sent_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', campaignId);

      // Here you would implement the actual sending logic
      // This could involve email service integration, SMS service, etc.
      console.log(`Campaign ${campaignId} sent successfully`);
    } catch (error) {
      console.error('Error sending campaign:', error);
      throw error;
    }
  }

  // Customer Lifecycle Methods
  async updateCustomerLifecycle(tenantId: string, customerId: string, stage: string, reason?: string): Promise<CustomerLifecycle> {
    try {
      const { data: existing, error: fetchError } = await supabase
        .from('customer_lifecycle')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('customer_id', customerId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

      const now = new Date().toISOString();
      const stageHistory = existing?.stage_history || [];

      // Update previous stage exit date
      if (existing?.current_stage) {
        const lastStage = stageHistory[stageHistory.length - 1];
        if (lastStage && !lastStage.exited_date) {
          lastStage.exited_date = now;
          lastStage.duration_days = Math.floor((new Date(now).getTime() - new Date(lastStage.entered_date).getTime()) / (1000 * 60 * 60 * 24));
        }
      }

      // Add new stage
      stageHistory.push({
        stage,
        entered_date: now,
        duration_days: 0,
        reason
      });

      const lifecycleData = {
        tenant_id: tenantId,
        customer_id: customerId,
        current_stage: {
          stage,
          entered_date: now,
          duration_days: 0,
          activities: [],
          metrics: {}
        },
        stage_history: stageHistory,
        last_updated: now
      };

      if (existing) {
        const { data, error } = await supabase
          .from('customer_lifecycle')
          .update(lifecycleData)
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('customer_lifecycle')
          .insert(lifecycleData)
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    } catch (error) {
      console.error('Error updating customer lifecycle:', error);
      throw error;
    }
  }

  async calculateCustomerScores(tenantId: string, customerId: string): Promise<{ risk_score: number; engagement_score: number; value_score: number }> {
    try {
      // This would involve complex calculations based on customer behavior
      // For now, we'll return simulated scores
      const risk_score = Math.floor(Math.random() * 100);
      const engagement_score = Math.floor(Math.random() * 100);
      const value_score = Math.floor(Math.random() * 100);

      return { risk_score, engagement_score, value_score };
    } catch (error) {
      console.error('Error calculating customer scores:', error);
      throw error;
    }
  }
}
