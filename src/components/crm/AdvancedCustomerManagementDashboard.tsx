import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { AdvancedCustomerManagement } from '@/lib/crm/AdvancedCustomerManagement';
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
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('crm');
  
  // Mock data for demonstration
  const [customerStats, setCustomerStats] = useState({
    totalCustomers: 1250,
    activeCustomers: 890,
    vipCustomers: 45,
    newCustomers: 23,
    churnedCustomers: 8
  });

  const [loyaltyStats, setLoyaltyStats] = useState({
    totalMembers: 890,
    totalPointsAwarded: 125000,
    totalPointsRedeemed: 45000,
    activePrograms: 3
  });

  const [feedbackStats, setFeedbackStats] = useState({
    totalFeedback: 156,
    pendingResponses: 12,
    averageRating: 4.2,
    positiveSentiment: 78
  });

  const [marketingStats, setMarketingStats] = useState({
    activeCampaigns: 5,
    totalRecipients: 2500,
    averageOpenRate: 24.5,
    averageClickRate: 3.2
  });

  const crmManager = AdvancedCustomerManagement.getInstance();

  useEffect(() => {
    loadDashboardData();
  }, [user?.tenant_id]);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      // Load dashboard statistics
      // In a real implementation, these would be fetched from the backend
      console.log('Loading dashboard data...');
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
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(customerStats.totalCustomers)}</div>
            <p className="text-xs text-muted-foreground">
              +{customerStats.newCustomers} new this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Loyalty Members</CardTitle>
            <Crown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(loyaltyStats.totalMembers)}</div>
            <p className="text-xs text-muted-foreground">
              {formatPercentage((loyaltyStats.totalMembers / customerStats.totalCustomers) * 100)} of customers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Rating</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{feedbackStats.averageRating}</div>
            <p className="text-xs text-muted-foreground">
              {formatPercentage(feedbackStats.positiveSentiment)} positive sentiment
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Campaign Open Rate</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPercentage(marketingStats.averageOpenRate)}</div>
            <p className="text-xs text-muted-foreground">
              {formatPercentage(marketingStats.averageClickRate)} click rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="crm" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            CRM
          </TabsTrigger>
          <TabsTrigger value="loyalty" className="flex items-center gap-2">
            <Crown className="h-4 w-4" />
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
            <Send className="h-4 w-4" />
            Marketing
          </TabsTrigger>
          <TabsTrigger value="lifecycle" className="flex items-center gap-2">
            <GitBranch className="h-4 w-4" />
            Lifecycle
          </TabsTrigger>
        </TabsList>

        {/* CRM Tab */}
        <TabsContent value="crm" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Customer Relationship Management</h2>
              <p className="text-muted-foreground">
                Manage customer profiles, interactions, and opportunities
              </p>
            </div>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              Add Customer
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Customer Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Active Customers</span>
                  <Badge variant="default">{formatNumber(customerStats.activeCustomers)}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>VIP Customers</span>
                  <Badge variant="secondary">{formatNumber(customerStats.vipCustomers)}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>New This Month</span>
                  <Badge variant="outline">{formatNumber(customerStats.newCustomers)}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Churned</span>
                  <Badge variant="destructive">{formatNumber(customerStats.churnedCustomers)}</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" />
                  Recent Interactions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span>Phone calls</span>
                    <span className="font-medium">12</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Emails sent</span>
                    <span className="font-medium">45</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Meetings</span>
                    <span className="font-medium">8</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Support tickets</span>
                    <span className="font-medium">23</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Opportunities
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span>Qualified leads</span>
                    <Badge variant="default">15</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>In negotiation</span>
                    <Badge variant="secondary">8</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Proposals sent</span>
                    <Badge variant="outline">12</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Closed this month</span>
                    <Badge variant="default">6</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Loyalty Tab */}
        <TabsContent value="loyalty" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Loyalty Programs</h2>
              <p className="text-muted-foreground">
                Manage loyalty programs, points, and rewards
              </p>
            </div>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Program
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="h-5 w-5" />
                  Program Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Total Members</span>
                  <Badge variant="default">{formatNumber(loyaltyStats.totalMembers)}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Active Programs</span>
                  <Badge variant="secondary">{loyaltyStats.activePrograms}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Points Awarded</span>
                  <Badge variant="outline">{formatNumber(loyaltyStats.totalPointsAwarded)}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Points Redeemed</span>
                  <Badge variant="default">{formatNumber(loyaltyStats.totalPointsRedeemed)}</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5" />
                  Tier Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span>Bronze</span>
                    <span className="font-medium">45%</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Silver</span>
                    <span className="font-medium">35%</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Gold</span>
                    <span className="font-medium">15%</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Platinum</span>
                    <span className="font-medium">5%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span>Points earned today</span>
                    <Badge variant="default">1,250</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Redemptions today</span>
                    <Badge variant="secondary">8</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>New members</span>
                    <Badge variant="outline">12</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Tier upgrades</span>
                    <Badge variant="default">3</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Feedback Tab */}
        <TabsContent value="feedback" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Customer Feedback & Reviews</h2>
              <p className="text-muted-foreground">
                Manage customer feedback, reviews, and sentiment analysis
              </p>
            </div>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              View All Feedback
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Feedback Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Total Feedback</span>
                  <Badge variant="default">{formatNumber(feedbackStats.totalFeedback)}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Pending Responses</span>
                  <Badge variant="destructive">{feedbackStats.pendingResponses}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Average Rating</span>
                  <Badge variant="secondary">{feedbackStats.averageRating}/5</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Positive Sentiment</span>
                  <Badge variant="default">{formatPercentage(feedbackStats.positiveSentiment)}</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Feedback Types
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span>Reviews</span>
                    <span className="font-medium">45%</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Complaints</span>
                    <span className="font-medium">25%</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Suggestions</span>
                    <span className="font-medium">20%</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Praise</span>
                    <span className="font-medium">10%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Response Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span>Avg response time</span>
                    <Badge variant="default">2.5 hours</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Resolution rate</span>
                    <Badge variant="secondary">94%</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Customer satisfaction</span>
                    <Badge variant="outline">4.3/5</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Follow-up rate</span>
                    <Badge variant="default">87%</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Segments Tab */}
        <TabsContent value="segments" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Customer Segmentation</h2>
              <p className="text-muted-foreground">
                Create and manage customer segments for targeted marketing
              </p>
            </div>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Segment
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Segment Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Total Segments</span>
                  <Badge variant="default">12</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Active Segments</span>
                  <Badge variant="secondary">8</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Dynamic Segments</span>
                  <Badge variant="outline">5</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Total Members</span>
                  <Badge variant="default">{formatNumber(customerStats.totalCustomers)}</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Top Segments
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span>High-Value Customers</span>
                    <Badge variant="default">156</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Frequent Buyers</span>
                    <Badge variant="secondary">234</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>New Customers</span>
                    <Badge variant="outline">89</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>At Risk</span>
                    <Badge variant="destructive">45</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Segment Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span>Avg engagement rate</span>
                    <Badge variant="default">24%</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Conversion rate</span>
                    <Badge variant="secondary">8.5%</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Revenue per segment</span>
                    <Badge variant="outline">$2,450</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Growth rate</span>
                    <Badge variant="default">+12%</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Marketing Tab */}
        <TabsContent value="marketing" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Marketing Automation</h2>
              <p className="text-muted-foreground">
                Create and manage marketing campaigns and automation workflows
              </p>
            </div>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Campaign
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="h-5 w-5" />
                  Campaign Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Active Campaigns</span>
                  <Badge variant="default">{marketingStats.activeCampaigns}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Total Recipients</span>
                  <Badge variant="secondary">{formatNumber(marketingStats.totalRecipients)}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Open Rate</span>
                  <Badge variant="outline">{formatPercentage(marketingStats.averageOpenRate)}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Click Rate</span>
                  <Badge variant="default">{formatPercentage(marketingStats.averageClickRate)}</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Campaign Types
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span>Email Campaigns</span>
                    <Badge variant="default">3</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>SMS Campaigns</span>
                    <Badge variant="secondary">1</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Push Notifications</span>
                    <Badge variant="outline">1</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Social Media</span>
                    <Badge variant="default">0</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Performance Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span>Revenue generated</span>
                    <Badge variant="default">$12,450</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Conversion rate</span>
                    <Badge variant="secondary">3.2%</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Unsubscribe rate</span>
                    <Badge variant="outline">0.8%</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Bounce rate</span>
                    <Badge variant="default">2.1%</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Lifecycle Tab */}
        <TabsContent value="lifecycle" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Customer Lifecycle Management</h2>
              <p className="text-muted-foreground">
                Track and manage customer journey through different lifecycle stages
              </p>
            </div>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              View Lifecycle
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GitBranch className="h-5 w-5" />
                  Lifecycle Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Awareness</span>
                  <Badge variant="default">450</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Consideration</span>
                  <Badge variant="secondary">320</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Purchase</span>
                  <Badge variant="outline">280</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Retention</span>
                  <Badge variant="default">890</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Advocacy</span>
                  <Badge variant="secondary">156</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Churn</span>
                  <Badge variant="destructive">45</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Stage Transitions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span>Awareness → Consideration</span>
                    <Badge variant="default">71%</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Consideration → Purchase</span>
                    <Badge variant="secondary">87%</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Purchase → Retention</span>
                    <Badge variant="outline">92%</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Retention → Advocacy</span>
                    <Badge variant="default">18%</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Risk & Engagement
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span>High-risk customers</span>
                    <Badge variant="destructive">23</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Low engagement</span>
                    <Badge variant="secondary">67</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>High value</span>
                    <Badge variant="default">89</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Ready to upgrade</span>
                    <Badge variant="outline">34</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
