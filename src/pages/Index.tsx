import React, { useState, useEffect, useMemo, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Star, ArrowRight, Zap, Shield, Users, BarChart3, CreditCard, Clock, Building2, ShoppingCart, Package, Receipt, Smartphone, Globe, Settings, HeadphonesIcon, TrendingUp, Database, Lock, Mail, Target, Send, Eye, MousePointer, Monitor, Calculator, Play } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import Navigation from "@/components/Navigation";
import Hero from "@/components/Hero";
import Dashboard from "@/components/Dashboard";
import Footer from "@/components/Footer";
import { LazyImage } from "@/components/ui/image-lazy";
import { PricingCardSkeleton } from "@/components/ui/skeleton-loader";
import { useOptimizedPricing } from "@/hooks/useOptimizedPricing";
import { usePreloader } from "@/hooks/usePreloader";
import { TenantCreationModal } from "@/components/TenantCreationModal";

interface BillingPlan {
  id: string;
  name: string;
  price: number;
  period: string;
  description: string;
  features: any;
  badge?: string;
  badge_color?: string;
  customers: number;
  pricing?: any;
}

const Index = () => {
  const [isSignupModalOpen, setIsSignupModalOpen] = useState(false);
  
  const {
    plans,
    loading,
    isAnnual,
    setIsAnnual,
    stats,
    getDisplayPrice,
    getDisplayPeriod,
    getDynamicSavings,
    formatFeatures
  } = useOptimizedPricing();

  // Images are now preloaded at component level for better performance

  const formatPrice = (price: number) => {
    return `KES ${price.toLocaleString()}`;
  };

  const handleStartTrial = () => {
    // Find Enterprise plan and set it as selected
    const enterprisePlan = plans.find(plan => plan.name === 'Enterprise');
    if (enterprisePlan) {
      // For TenantCreationModal, we need to pass the plan id
      setIsSignupModalOpen(true);
    } else {
      setIsSignupModalOpen(true);
    }
  };

  const handleCloseSignupModal = () => {
    setIsSignupModalOpen(false);
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <Navigation />
      
      {/* Enhanced Hero Section */}
      <section className="relative overflow-hidden py-20 lg:py-32">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/5" />
        <div className="container relative mx-auto px-4">
          <div className="text-center space-y-8 max-w-4xl mx-auto">
            <Badge variant="outline" className="text-sm px-4 py-2">
              <Zap className="h-4 w-4 mr-2" />
              Start your 14-day free trial today
            </Badge>
            
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight">
              Transform Your Business with{" "}
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                VibePOS
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              The modern point-of-sale system that grows with your business. 
              Start free, scale fast, succeed everywhere.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button size="lg" className="text-lg px-8 py-6" onClick={handleStartTrial}>
                Start Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button variant="outline" size="lg" className="text-lg px-8 py-6" asChild>
                <Link to="/auth">
                  Sign In
                </Link>
              </Button>
            </div>
            
            <div className="flex items-center justify-center space-x-8 text-sm text-muted-foreground">
              <div className="flex items-center">
                <Shield className="h-4 w-4 mr-2 text-green-500" />
                No credit card required
              </div>
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-2 text-blue-500" />
                14-day free trial
              </div>
              <div className="flex items-center">
                <Users className="h-4 w-4 mr-2 text-purple-500" />
                Setup in minutes
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-12 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center space-y-8">
            <p className="text-muted-foreground">Trusted by businesses across Kenya</p>
            <div className="flex items-center justify-center space-x-8">
              <div className="flex items-center space-x-2">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <span className="text-sm font-medium">{stats.avgRating}/5 rating</span>
              </div>
              <div className="text-sm text-muted-foreground">{stats.totalCustomers}+ active businesses</div>
              <div className="text-sm text-muted-foreground">{stats.uptime}% uptime</div>
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced Pricing Section */}
      <section className="py-20" id="pricing">
        <div className="container mx-auto px-4">
          <div className="text-center space-y-4 mb-16">
            <Badge variant="outline" className="text-sm px-4 py-2">
              Pricing Plans
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold">
              Choose Your Perfect Plan
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Start with a 14-day free trial. Affordable pricing in Kenyan Shillings. 
              No setup fees, no hidden costs. Cancel anytime during your trial.
            </p>
            
            {/* Billing Toggle */}
            <div className="flex items-center justify-center gap-4 mt-8">
              <span className={`text-sm font-medium ${!isAnnual ? 'text-foreground' : 'text-muted-foreground'}`}>
                Monthly
              </span>
              <button
                onClick={() => setIsAnnual(!isAnnual)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  isAnnual ? 'bg-primary' : 'bg-muted'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isAnnual ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className={`text-sm font-medium ${isAnnual ? 'text-foreground' : 'text-muted-foreground'}`}>
                Annual
              </span>
              {isAnnual && plans.length > 0 && getDynamicSavings(plans[0]) && (
                <span className="ml-2 text-sm font-medium text-pos-success bg-pos-success/10 px-2 py-1 rounded-full">
                  {getDynamicSavings(plans[0])}
                </span>
              )}
            </div>
          </div>

          {loading ? (
            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {[...Array(3)].map((_, i) => (
                <PricingCardSkeleton key={i} />
              ))}
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {plans.map((plan) => {
                const features = formatFeatures(plan.features);
                const isPopular = plan.badge?.toLowerCase().includes('popular') || plan.name === 'Professional';
                
                return (
                  <Card 
                    key={plan.id} 
                    className={`relative transition-all hover:shadow-lg ${
                      isPopular
                        ? 'ring-2 ring-primary scale-105 shadow-xl' 
                        : 'hover:shadow-lg'
                    }`}
                  >
                    {plan.badge && (
                      <Badge className={`absolute -top-3 left-1/2 transform -translate-x-1/2 ${plan.badge_color || 'bg-primary'}`}>
                        <Star className="h-3 w-3 mr-1 fill-current" />
                        {plan.badge}
                      </Badge>
                    )}
                    
                    <CardHeader className="text-center pb-8">
                      <CardTitle className="text-2xl mb-2">{plan.name}</CardTitle>
                      <div className="space-y-2">
                         <div className="text-4xl font-bold">
                            {getDisplayPrice(plan)}
                            <span className="text-lg text-muted-foreground font-normal">
                              {getDisplayPeriod()}
                            </span>
                          </div>
                          <div className="text-sm text-green-600 font-medium">
                            Free for 14 days, then {getDisplayPrice(plan)}{getDisplayPeriod()}
                         </div>
                        <CardDescription className="text-base">
                          {plan.description}
                        </CardDescription>
                        {plan.customers > 0 && (
                          <div className="text-sm text-muted-foreground">
                            {plan.customers} businesses using this plan
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-6">
                      <ul className="space-y-3">
                        {features.slice(0, 6).map((feature: any, index: number) => (
                          <li key={index} className="flex items-center space-x-3">
                            <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                            <span className="text-sm">{typeof feature === 'string' ? feature : feature?.name || feature?.feature || 'Feature'}</span>
                          </li>
                        ))}
                        {features.length > 6 && (
                          <li className="text-sm text-muted-foreground">
                            +{features.length - 6} more features
                          </li>
                        )}
                      </ul>
                      
                      <Button 
                        className="w-full" 
                        size="lg"
                        variant={isPopular ? "default" : "outline"}
                        onClick={handleStartTrial}
                      >
                        Start Free Trial
                        <Zap className="ml-2 h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
          
          <div className="text-center mt-12 space-y-4">
            <p className="text-muted-foreground">
              All plans include 14-day free trial • No setup fees • Cancel anytime
            </p>
            <div className="flex items-center justify-center space-x-6 text-sm text-muted-foreground">
              <div className="flex items-center">
                <CreditCard className="h-4 w-4 mr-2" />
                Secure payments
              </div>
              <div className="flex items-center">
                <Shield className="h-4 w-4 mr-2" />
                SSL encrypted
              </div>
              <div className="flex items-center">
                <Building2 className="h-4 w-4 mr-2" />
                Enterprise ready
              </div>
              <div className="flex items-center">
                <span className="font-medium text-orange-600">Paystack</span>
                <span className="mx-1">&</span>
                <span className="font-medium text-green-600">M-Pesa</span>
                <span className="ml-1">accepted</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Comprehensive POS Features Section */}
      <section className="py-20 bg-muted/20" id="features">
        <div className="container mx-auto px-4">
          <div className="text-center space-y-4 mb-16">
            <Badge variant="outline" className="text-sm px-4 py-2">
              <Package className="h-4 w-4 mr-2" />
              Complete POS Solution
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold">
              Everything You Need to Run Your Business
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              From point-of-sale to inventory management, accounting to customer management - 
              VibePOS has all the tools your business needs in one powerful platform.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
            {/* Core POS Features */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <ShoppingCart className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">Point of Sale</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Fast checkout process</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Barcode scanning</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Multiple payment methods</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Receipt printing</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Discount management</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <Package className="h-6 w-6 text-blue-500" />
                  </div>
                  <CardTitle className="text-xl">Inventory Management</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Real-time stock tracking</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Low stock alerts</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Product variants & categories</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Purchase order management</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Stock adjustments</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-500/10 rounded-lg">
                    <BarChart3 className="h-6 w-6 text-green-500" />
                  </div>
                  <CardTitle className="text-xl">Financial Management</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Complete accounting system</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Accounts receivable/payable</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Tax management (VAT ready)</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Financial statements</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Profit & loss tracking</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-purple-500/10 rounded-lg">
                    <Users className="h-6 w-6 text-purple-500" />
                  </div>
                  <CardTitle className="text-xl">Customer Management</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Customer database</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Purchase history tracking</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Customer statements</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Loyalty programs</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Communication tools</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-orange-500/10 rounded-lg">
                    <TrendingUp className="h-6 w-6 text-orange-500" />
                  </div>
                  <CardTitle className="text-xl">Reports & Analytics</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Sales reports & analytics</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Inventory reports</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Financial reporting</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Custom dashboards</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Performance insights</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-red-500/10 rounded-lg">
                    <Smartphone className="h-6 w-6 text-red-500" />
                  </div>
                  <CardTitle className="text-xl">Multi-Platform Access</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Web-based application</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Mobile app access</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Offline mode support</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Multi-location support</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Cloud synchronization</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Additional Features Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center space-y-3">
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <Receipt className="h-6 w-6 text-primary" />
              </div>
              <h4 className="font-semibold">Quotes & Invoicing</h4>
              <p className="text-sm text-muted-foreground">Generate professional quotes and invoices</p>
            </div>
            
            <div className="text-center space-y-3">
              <div className="mx-auto w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center">
                <Settings className="h-6 w-6 text-blue-500" />
              </div>
              <h4 className="font-semibold">Role Management</h4>
              <p className="text-sm text-muted-foreground">User roles and permissions control</p>
            </div>
            
            <div className="text-center space-y-3">
              <div className="mx-auto w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center">
                <Globe className="h-6 w-6 text-green-500" />
              </div>
              <h4 className="font-semibold">API Integration</h4>
              <p className="text-sm text-muted-foreground">Connect with external systems</p>
            </div>
            
            <div className="text-center space-y-3">
              <div className="mx-auto w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center">
                <Lock className="h-6 w-6 text-purple-500" />
              </div>
              <h4 className="font-semibold">Data Security</h4>
              <p className="text-sm text-muted-foreground">Enterprise-grade security & backups</p>
            </div>
          </div>
        </div>
      </section>

      {/* Advanced Email Management Features */}
      <section className="py-20 bg-gradient-to-br from-blue-50/50 to-purple-50/50 dark:from-blue-950/20 dark:to-purple-950/20">
        <div className="container mx-auto px-4">
          <div className="text-center space-y-4 mb-16">
            <Badge variant="outline" className="text-sm px-4 py-2">
              <Mail className="h-4 w-4 mr-2" />
              Advanced Marketing
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold">
              Powerful Email Campaign Management
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Reach your customers with targeted email campaigns, advanced segmentation, 
              and comprehensive analytics. Perfect for superadmins managing multiple tenants.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
            {/* Email Campaigns */}
            <Card className="hover:shadow-lg transition-all hover:-translate-y-1">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <Send className="h-6 w-6 text-blue-500" />
                  </div>
                  <CardTitle className="text-xl">Email Campaigns</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Create targeted email campaigns</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Rich HTML email templates</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Schedule campaigns in advance</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>A/B testing capabilities</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Automated drip campaigns</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Client Segmentation */}
            <Card className="hover:shadow-lg transition-all hover:-translate-y-1">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-purple-500/10 rounded-lg">
                    <Target className="h-6 w-6 text-purple-500" />
                  </div>
                  <CardTitle className="text-xl">Smart Segmentation</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Advanced targeting criteria</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Dynamic audience updates</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Behavioral segmentation</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Geographic targeting</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Custom audience rules</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Analytics & Reporting */}
            <Card className="hover:shadow-lg transition-all hover:-translate-y-1">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-500/10 rounded-lg">
                    <Eye className="h-6 w-6 text-green-500" />
                  </div>
                  <CardTitle className="text-xl">Campaign Analytics</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Real-time campaign tracking</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Open & click-through rates</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Bounce & unsubscribe tracking</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Revenue attribution</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Performance insights</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Automation */}
            <Card className="hover:shadow-lg transition-all hover:-translate-y-1">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-orange-500/10 rounded-lg">
                    <Settings className="h-6 w-6 text-orange-500" />
                  </div>
                  <CardTitle className="text-xl">Marketing Automation</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Trigger-based automation</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Welcome email sequences</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Behavioral triggers</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Re-engagement campaigns</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Cross-tenant automation</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Tenant Management */}
            <Card className="hover:shadow-lg transition-all hover:-translate-y-1">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-red-500/10 rounded-lg">
                    <Database className="h-6 w-6 text-red-500" />
                  </div>
                  <CardTitle className="text-xl">Superadmin Controls</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Multi-tenant management</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Global campaign oversight</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>System-wide analytics</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Email blacklist management</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Compliance monitoring</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Deliverability */}
            <Card className="hover:shadow-lg transition-all hover:-translate-y-1">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-cyan-500/10 rounded-lg">
                    <MousePointer className="h-6 w-6 text-cyan-500" />
                  </div>
                  <CardTitle className="text-xl">Email Deliverability</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>High deliverability rates</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>SPF/DKIM authentication</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Reputation monitoring</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>ISP compliance</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Spam score optimization</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Email Management Stats */}
          <div className="text-center bg-gradient-to-r from-primary/10 to-accent/10 rounded-2xl p-8">
            <h3 className="text-2xl font-bold mb-6">Powerful Email Marketing at Scale</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="space-y-2">
                <div className="text-3xl font-bold text-primary">99.9%</div>
                <div className="text-sm text-muted-foreground">Uptime</div>
              </div>
              <div className="space-y-2">
                <div className="text-3xl font-bold text-primary">95%+</div>
                <div className="text-sm text-muted-foreground">Deliverability</div>
              </div>
              <div className="space-y-2">
                <div className="text-3xl font-bold text-primary">1M+</div>
                <div className="text-sm text-muted-foreground">Emails/Month</div>
              </div>
              <div className="space-y-2">
                <div className="text-3xl font-bold text-primary">24/7</div>
                <div className="text-sm text-muted-foreground">Support</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Detailed Plan Comparison */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center space-y-4 mb-16">
            <Badge variant="outline" className="text-sm px-4 py-2">
              Plan Comparison
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold">
              Compare All Features Across Plans
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              See exactly what's included in each plan to choose the perfect fit for your business
            </p>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading feature comparison...</p>
            </div>
          ) : plans.length > 0 && (
            <div className="max-w-7xl mx-auto">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-4 font-semibold">Features</th>
                      {plans.map((plan) => (
                        <th key={plan.id} className="text-center p-4">
                          <div className="space-y-2">
                            <div className="font-bold text-lg">{plan.name}</div>
                            <div className="text-2xl font-bold text-primary">
                              {formatPrice(plan.price)}<span className="text-sm text-muted-foreground">/{plan.period}</span>
                            </div>
                            {plan.badge && (
                              <Badge className={`${plan.badge_color || 'bg-primary'} text-xs`}>
                                {plan.badge}
                              </Badge>
                            )}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {/* Extract all unique features */}
                    {Array.from(
                      new Set(
                        plans.flatMap(plan => 
                          formatFeatures(plan.features).map((f: any) => 
                            typeof f === 'string' ? f : f?.name || f?.feature || 'Feature'
                          )
                        )
                      )
                    ).map((featureName, index) => (
                      <tr key={index} className="border-b hover:bg-muted/50">
                        <td className="p-4 font-medium">{featureName}</td>
                        {plans.map((plan) => {
                          const planFeatures = formatFeatures(plan.features);
                          const hasFeature = planFeatures.some((f: any) => {
                            const name = typeof f === 'string' ? f : f?.name || f?.feature || 'Feature';
                            return name === featureName;
                          });
                          
                          return (
                            <td key={plan.id} className="p-4 text-center">
                              {hasFeature ? (
                                <Check className="h-5 w-5 text-green-500 mx-auto" />
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td className="p-4"></td>
                      {plans.map((plan) => (
                         <td key={plan.id} className="p-4 text-center">
                          <Button 
                            className="w-full" 
                            onClick={handleStartTrial}
                          >
                            Choose {plan.name}
                          </Button>
                        </td>
                      ))}
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Enhanced Demo Section */}
      <section className="py-20 bg-gradient-to-br from-background via-muted/20 to-background">
        <div className="container mx-auto px-4">
          <div className="text-center space-y-4 mb-16">
            <Badge variant="outline" className="text-sm px-4 py-2">
              <Monitor className="h-4 w-4 mr-2" />
              Live Demo
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold">
              See VibePOS in Action
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Experience all the powerful features that make VibePOS the complete business management solution
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
            {/* Sales Management Demo */}
            <Card className="hover:shadow-lg transition-all hover:-translate-y-1 bg-gradient-to-br from-card to-card/50">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <ShoppingCart className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">Smart Sales Processing</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Barcode scanning & quick checkout</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Multiple payment methods</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Real-time inventory updates</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Custom receipt printing</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Sales returns & refunds</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Customer Management Demo */}
            <Card className="hover:shadow-lg transition-all hover:-translate-y-1 bg-gradient-to-br from-card to-card/50">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <Users className="h-6 w-6 text-blue-500" />
                  </div>
                  <CardTitle className="text-xl">Customer Relationship</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Complete customer profiles</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Purchase history tracking</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Customer statements</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Loyalty program management</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Email campaign integration</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Inventory Management Demo */}
            <Card className="hover:shadow-lg transition-all hover:-translate-y-1 bg-gradient-to-br from-card to-card/50">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-500/10 rounded-lg">
                    <Package className="h-6 w-6 text-green-500" />
                  </div>
                  <CardTitle className="text-xl">Stock Management</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Real-time stock tracking</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Low stock alerts</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Stock adjustments & transfers</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Product variants & categories</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Supplier management</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Accounting Integration Demo */}
            <Card className="hover:shadow-lg transition-all hover:-translate-y-1 bg-gradient-to-br from-card to-card/50">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-purple-500/10 rounded-lg">
                    <Calculator className="h-6 w-6 text-purple-500" />
                  </div>
                  <CardTitle className="text-xl">Financial Management</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Automated bookkeeping</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Chart of accounts setup</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>VAT & tax calculations</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Financial statements</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Profit & loss tracking</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Email Marketing Demo */}
            <Card className="hover:shadow-lg transition-all hover:-translate-y-1 bg-gradient-to-br from-card to-card/50">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-orange-500/10 rounded-lg">
                    <Mail className="h-6 w-6 text-orange-500" />
                  </div>
                  <CardTitle className="text-xl">Email Campaigns</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Targeted email campaigns</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Customer segmentation</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Template customization</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Automated workflows</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Campaign analytics</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Analytics & Reporting Demo */}
            <Card className="hover:shadow-lg transition-all hover:-translate-y-1 bg-gradient-to-br from-card to-card/50">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-red-500/10 rounded-lg">
                    <BarChart3 className="h-6 w-6 text-red-500" />
                  </div>
                  <CardTitle className="text-xl">Business Intelligence</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Real-time dashboards</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Sales performance metrics</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Inventory analytics</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Customer insights</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Export capabilities</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Demo CTA */}
          <div className="text-center space-y-6">
            <div className="max-w-2xl mx-auto">
              <h3 className="text-2xl font-bold mb-4">Experience the Complete Solution</h3>
              <p className="text-muted-foreground mb-6">
                See how VibePOS streamlines every aspect of your business operations with our comprehensive demo
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" className="px-8" onClick={handleStartTrial}>
                  Start Free Trial
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button variant="outline" size="lg" className="px-8" onClick={handleStartTrial}>
                  View Live Demo
                  <Play className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Dashboard />
      
      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-primary/10 to-accent/10">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-3xl mx-auto space-y-8">
            <h2 className="text-4xl md:text-5xl font-bold">
              Ready to Transform Your Business?
            </h2>
            <p className="text-xl text-muted-foreground">
              Join hundreds of businesses already using VibePOS to streamline their operations
            </p>
            <div className="space-y-4">
              <Button 
                size="lg" 
                className="text-lg px-8 py-6"
                onClick={handleStartTrial}
              >
                Start Your Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <p className="text-sm text-muted-foreground">
                14-day free trial • No credit card required • Paystack & M-Pesa accepted
              </p>
            </div>
          </div>
        </div>
      </section>
      
      {/* Tenant Creation Modal */}
      <TenantCreationModal
        isOpen={isSignupModalOpen}
        onClose={handleCloseSignupModal}
      />
      
      <Footer />
    </div>
  );
};

export default Index;
