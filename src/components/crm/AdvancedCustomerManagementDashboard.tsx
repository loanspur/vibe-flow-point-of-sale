import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { 
  Users, 
  Star, 
  MessageSquare, 
  Target, 
  Mail, 
  TrendingUp,
  Plus,
  Search,
  Filter,
  Download,
  RefreshCw,
  UserPlus,
  Crown,
  MessageCircle,
  BarChart3,
  Send,
  GitBranch
} from 'lucide-react';

export default function AdvancedCustomerManagementDashboard() {
  const { user, tenantId } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('crm');
  
  // Real-time data state
  const [customerStats, setCustomerStats] = useState({
    totalCustomers: 0,
    activeCustomers: 0,
    vipCustomers: 0,
    newCustomers: 0,
    churnedCustomers: 0
  });

  const [loyaltyStats, setLoyaltyStats] = useState({
    totalMembers: 0,
    totalPointsAwarded: 0,
    totalPointsRedeemed: 0,
    activePrograms: 0
  });

  const [feedbackStats, setFeedbackStats] = useState({
    totalFeedback: 0,
    pendingResponses: 0,
    averageRating: 0,
    positiveSentiment: 0
  });

  const [marketingStats, setMarketingStats] = useState({
    activeCampaigns: 0,
    totalRecipients: 0,
    averageOpenRate: 0,
    averageClickRate: 0
  });

  const [customerData, setCustomerData] = useState({
    profiles: [],
    interactions: [],
    opportunities: [],
    loyalty: [],
    feedback: [],
    campaigns: []
  });

  useEffect(() => {
    if (tenantId) {
      loadDashboardData();
    }
  }, [tenantId]);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      // Load all data in parallel for better performance
      const [
        customerProfilesRes,
        customerInteractionsRes,
        customerOpportunitiesRes,
        loyaltyProgramsRes,
        customerLoyaltyRes,
        loyaltyTransactionsRes,
        customerFeedbackRes,
        marketingCampaignsRes,
        customerLifecycleRes
      ] = await Promise.all([
        // Customer Profiles
        supabase
          .from('customer_profiles')
          .select('*')
          .eq('tenant_id', tenantId),
        
        // Customer Interactions
        supabase
          .from('customer_interactions')
          .select('*')
          .eq('tenant_id', tenantId)
          .order('created_at', { ascending: false })
          .limit(50),
        
        // Customer Opportunities
        supabase
          .from('customer_opportunities')
          .select('*')
          .eq('tenant_id', tenantId)
          .order('created_at', { ascending: false })
          .limit(50),
        
        // Loyalty Programs
        supabase
          .from('loyalty_programs')
          .select('*')
          .eq('tenant_id', tenantId)
          .eq('is_active', true),
        
        // Customer Loyalty
        supabase
          .from('customer_loyalty')
          .select(`
            *,
            loyalty_programs (name),
            loyalty_tiers (name, color)
          `)
          .eq('tenant_id', tenantId)
          .eq('is_enrolled', true),
        
        // Loyalty Transactions
        supabase
          .from('loyalty_transactions')
          .select('*')
          .eq('tenant_id', tenantId)
          .order('created_at', { ascending: false })
          .limit(100),
        
        // Customer Feedback
        supabase
          .from('customer_feedback')
          .select('*')
          .eq('tenant_id', tenantId)
          .order('created_at', { ascending: false })
          .limit(50),
        
        // Marketing Campaigns
        supabase
          .from('marketing_campaigns')
          .select('*')
          .eq('tenant_id', tenantId)
          .order('created_at', { ascending: false })
          .limit(20),
        
        // Customer Lifecycle
        supabase
          .from('customer_lifecycle')
          .select('*')
          .eq('tenant_id', tenantId)
      ]);

      // Process customer statistics
      const profiles = customerProfilesRes.data || [];
      const activeCustomers = profiles.filter(p => p.customer_status === 'active').length;
      const vipCustomers = profiles.filter(p => p.customer_tier === 'platinum' || p.customer_tier === 'gold').length;
      const newCustomers = profiles.filter(p => {
        const createdDate = new Date(p.created_at);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return createdDate > thirtyDaysAgo;
      }).length;
      const churnedCustomers = profiles.filter(p => p.customer_status === 'churned').length;

      setCustomerStats({
        totalCustomers: profiles.length,
        activeCustomers,
        vipCustomers,
        newCustomers,
        churnedCustomers
      });

      // Process loyalty statistics
      const loyaltyMembers = customerLoyaltyRes.data || [];
      const loyaltyTransactions = loyaltyTransactionsRes.data || [];
      const loyaltyPrograms = loyaltyProgramsRes.data || [];
      
      const totalPointsAwarded = loyaltyTransactions
        .filter(t => t.transaction_type === 'earned')
        .reduce((sum, t) => sum + t.points_amount, 0);
      
      const totalPointsRedeemed = loyaltyTransactions
        .filter(t => t.transaction_type === 'redeemed')
        .reduce((sum, t) => sum + t.points_amount, 0);

      setLoyaltyStats({
        totalMembers: loyaltyMembers.length,
        totalPointsAwarded,
        totalPointsRedeemed,
        activePrograms: loyaltyPrograms.length
      });

      // Process feedback statistics
      const feedback = customerFeedbackRes.data || [];
      const pendingResponses = feedback.filter(f => f.status === 'pending').length;
      const ratings = feedback.filter(f => f.rating).map(f => f.rating);
      const averageRating = ratings.length > 0 ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length : 0;
      const positiveSentiment = feedback.filter(f => f.sentiment_score && f.sentiment_score > 0.3).length;

      setFeedbackStats({
        totalFeedback: feedback.length,
        pendingResponses,
        averageRating: Math.round(averageRating * 10) / 10,
        positiveSentiment: feedback.length > 0 ? Math.round((positiveSentiment / feedback.length) * 100) : 0
      });

      // Process marketing statistics
      const campaigns = marketingCampaignsRes.data || [];
      const activeCampaigns = campaigns.filter(c => c.status === 'active').length;
      const totalRecipients = campaigns.reduce((sum, c) => sum + (c.total_recipients || 0), 0);
      
      const campaignsWithMetrics = campaigns.filter(c => c.sent_count > 0);
      const averageOpenRate = campaignsWithMetrics.length > 0 
        ? campaignsWithMetrics.reduce((sum, c) => sum + (c.opened_count / c.sent_count * 100), 0) / campaignsWithMetrics.length 
        : 0;
      const averageClickRate = campaignsWithMetrics.length > 0 
        ? campaignsWithMetrics.reduce((sum, c) => sum + (c.clicked_count / c.sent_count * 100), 0) / campaignsWithMetrics.length 
        : 0;

      setMarketingStats({
        activeCampaigns,
        totalRecipients,
        averageOpenRate: Math.round(averageOpenRate * 10) / 10,
        averageClickRate: Math.round(averageClickRate * 10) / 10
      });

      // Set all data
      setCustomerData({
        profiles,
        interactions: customerInteractionsRes.data || [],
        opportunities: customerOpportunitiesRes.data || [],
        loyalty: loyaltyMembers,
        feedback,
        campaigns
      });

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load dashboard data',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US').format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'KES'
    }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Advanced Customer Management</h1>
          <p className="text-muted-foreground">
            Comprehensive CRM, loyalty programs, and customer lifecycle management
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={loadDashboardData} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button>
            <Download className="h-4 w-4 mr-2" />
            Export Data
          </Button>
        </div>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Customer Metrics */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(customerStats.totalCustomers)}</div>
            <p className="text-xs text-muted-foreground">
              {customerStats.activeCustomers} active customers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">VIP Customers</CardTitle>
            <Crown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(customerStats.vipCustomers)}</div>
            <p className="text-xs text-muted-foreground">
              {customerStats.totalCustomers > 0 ? formatPercentage((customerStats.vipCustomers / customerStats.totalCustomers) * 100) : '0%'} of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Loyalty Members</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(loyaltyStats.totalMembers)}</div>
            <p className="text-xs text-muted-foreground">
              {formatNumber(loyaltyStats.totalPointsAwarded)} points awarded
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Feedback Rating</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{feedbackStats.averageRating.toFixed(1)}/5</div>
            <p className="text-xs text-muted-foreground">
              {formatNumber(feedbackStats.totalFeedback)} total feedback
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="crm" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            CRM
          </TabsTrigger>
          <TabsTrigger value="loyalty" className="flex items-center gap-2">
            <Star className="h-4 w-4" />
            Loyalty
          </TabsTrigger>
          <TabsTrigger value="feedback" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Feedback
          </TabsTrigger>
          <TabsTrigger value="segments" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Segments
          </TabsTrigger>
          <TabsTrigger value="marketing" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Marketing
          </TabsTrigger>
          <TabsTrigger value="lifecycle" className="flex items-center gap-2">
            <GitBranch className="h-4 w-4" />
            Lifecycle
          </TabsTrigger>
        </TabsList>

        {/* CRM Tab */}
        <TabsContent value="crm" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Customer Overview</CardTitle>
                <CardDescription>Customer distribution by status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Active</span>
                    <span className="font-medium">{customerStats.activeCustomers}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>New (30 days)</span>
                    <span className="font-medium">{customerStats.newCustomers}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>VIP</span>
                    <span className="font-medium">{customerStats.vipCustomers}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Churned</span>
                    <span className="font-medium">{customerStats.churnedCustomers}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Interactions</CardTitle>
                <CardDescription>Latest customer interactions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {customerData.interactions.slice(0, 5).map((interaction: any) => (
                    <div key={interaction.id} className="flex justify-between items-center">
                      <div>
                        <div className="font-medium text-sm">{interaction.interaction_type}</div>
                        <div className="text-xs text-muted-foreground">{interaction.subject}</div>
                      </div>
                      <Badge variant="outline">{interaction.outcome}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Sales Opportunities</CardTitle>
                <CardDescription>Active sales pipeline</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {customerData.opportunities.slice(0, 5).map((opportunity: any) => (
                    <div key={opportunity.id} className="flex justify-between items-center">
                      <div>
                        <div className="font-medium text-sm">{opportunity.title}</div>
                        <div className="text-xs text-muted-foreground">{opportunity.pipeline_stage}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-sm">{formatCurrency(opportunity.expected_value || 0)}</div>
                        <div className="text-xs text-muted-foreground">{opportunity.probability_percentage}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Loyalty Tab */}
        <TabsContent value="loyalty" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Loyalty Program Overview</CardTitle>
                <CardDescription>Program statistics and performance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Total Members</span>
                    <span className="font-medium">{formatNumber(loyaltyStats.totalMembers)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Points Awarded</span>
                    <span className="font-medium">{formatNumber(loyaltyStats.totalPointsAwarded)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Points Redeemed</span>
                    <span className="font-medium">{formatNumber(loyaltyStats.totalPointsRedeemed)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Active Programs</span>
                    <span className="font-medium">{loyaltyStats.activePrograms}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Member Tiers</CardTitle>
                <CardDescription>Distribution by loyalty tier</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {customerData.loyalty.reduce((acc: any, member: any) => {
                    const tierName = member.loyalty_tiers?.name || 'Unknown';
                    acc[tierName] = (acc[tierName] || 0) + 1;
                    return acc;
                  }, {}).map((tier: any, count: number) => (
                    <div key={tier} className="flex justify-between items-center">
                      <span className="capitalize">{tier}</span>
                      <span className="font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest loyalty transactions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {/* This would show recent loyalty transactions */}
                  <div className="text-center text-muted-foreground">
                    Loyalty transaction history will be displayed here
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Feedback Tab */}
        <TabsContent value="feedback" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Feedback Overview</CardTitle>
                <CardDescription>Customer feedback statistics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Total Feedback</span>
                    <span className="font-medium">{formatNumber(feedbackStats.totalFeedback)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Average Rating</span>
                    <span className="font-medium">{feedbackStats.averageRating}/5</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pending Responses</span>
                    <span className="font-medium">{feedbackStats.pendingResponses}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Positive Sentiment</span>
                    <span className="font-medium">{formatPercentage(feedbackStats.positiveSentiment)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Feedback</CardTitle>
                <CardDescription>Latest customer feedback</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {customerData.feedback.slice(0, 5).map((feedback: any) => (
                    <div key={feedback.id} className="flex justify-between items-center">
                      <div>
                        <div className="font-medium text-sm">{feedback.feedback_type}</div>
                        <div className="text-xs text-muted-foreground">{feedback.title}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-sm">{feedback.rating}/5</div>
                        <Badge variant={feedback.status === 'pending' ? 'destructive' : 'default'}>
                          {feedback.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Feedback Categories</CardTitle>
                <CardDescription>Feedback by category</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {customerData.feedback.reduce((acc: any, feedback: any) => {
                    const category = feedback.category || 'General';
                    acc[category] = (acc[category] || 0) + 1;
                    return acc;
                  }, {}).map((category: any, count: number) => (
                    <div key={category} className="flex justify-between items-center">
                      <span className="capitalize">{category}</span>
                      <span className="font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Segments Tab */}
        <TabsContent value="segments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Customer Segments</CardTitle>
              <CardDescription>Manage and analyze customer segments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center text-muted-foreground py-8">
                Customer segmentation features will be implemented here
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Marketing Tab */}
        <TabsContent value="marketing" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Campaign Overview</CardTitle>
                <CardDescription>Marketing campaign statistics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Active Campaigns</span>
                    <span className="font-medium">{marketingStats.activeCampaigns}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Recipients</span>
                    <span className="font-medium">{formatNumber(marketingStats.totalRecipients)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Avg Open Rate</span>
                    <span className="font-medium">{formatPercentage(marketingStats.averageOpenRate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Avg Click Rate</span>
                    <span className="font-medium">{formatPercentage(marketingStats.averageClickRate)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Campaigns</CardTitle>
                <CardDescription>Latest marketing campaigns</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {customerData.campaigns.slice(0, 5).map((campaign: any) => (
                    <div key={campaign.id} className="flex justify-between items-center">
                      <div>
                        <div className="font-medium text-sm">{campaign.name}</div>
                        <div className="text-xs text-muted-foreground">{campaign.campaign_type}</div>
                      </div>
                      <Badge variant={campaign.status === 'active' ? 'default' : 'secondary'}>
                        {campaign.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Campaign Performance</CardTitle>
                <CardDescription>Performance metrics by campaign type</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {customerData.campaigns.reduce((acc: any, campaign: any) => {
                    const type = campaign.campaign_type;
                    if (!acc[type]) {
                      acc[type] = { count: 0, totalRecipients: 0 };
                    }
                    acc[type].count += 1;
                    acc[type].totalRecipients += campaign.total_recipients || 0;
                    return acc;
                  }, {}).map((type: any, data: any) => (
                    <div key={type} className="flex justify-between items-center">
                      <span className="capitalize">{type}</span>
                      <div className="text-right">
                        <div className="font-medium text-sm">{data.count}</div>
                        <div className="text-xs text-muted-foreground">{formatNumber(data.totalRecipients)} recipients</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Lifecycle Tab */}
        <TabsContent value="lifecycle" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Customer Lifecycle</CardTitle>
              <CardDescription>Customer journey and lifecycle management</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center text-muted-foreground py-8">
                Customer lifecycle management features will be implemented here
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
