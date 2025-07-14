import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Star, ArrowRight, Zap, Shield, Users, BarChart3, CreditCard, Clock, Building2 } from "lucide-react";
import { Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import Dashboard from "@/components/Dashboard";
import Pricing from "@/components/Pricing";
import Footer from "@/components/Footer";

const plans = [
  {
    id: 'basic',
    name: 'Basic',
    price: '$29',
    period: '/month',
    description: 'Perfect for small businesses just getting started',
    features: [
      'Up to 5 users',
      'Basic POS functionality',
      'Sales reporting',
      'Customer management',
      'Email support'
    ],
    popular: false,
    highlight: 'Great for startups'
  },
  {
    id: 'premium',
    name: 'Premium',
    price: '$79',
    period: '/month',
    description: 'Ideal for growing businesses with advanced needs',
    features: [
      'Up to 25 users',
      'Advanced POS features',
      'Advanced analytics',
      'Inventory management',
      'Multi-location support',
      'Priority support'
    ],
    popular: true,
    highlight: 'Most popular choice'
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: '$199',
    period: '/month',
    description: 'For large businesses with complex requirements',
    features: [
      'Unlimited users',
      'All premium features',
      'Custom integrations',
      'Advanced reporting',
      'Dedicated account manager',
      '24/7 phone support'
    ],
    popular: false,
    highlight: 'Complete solution'
  }
];

const Index = () => {
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
              <Button size="lg" className="text-lg px-8 py-6" asChild>
                <Link to="/signup">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
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
            <p className="text-muted-foreground">Trusted by businesses worldwide</p>
            <div className="flex items-center justify-center space-x-8">
              <div className="flex items-center space-x-2">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <span className="text-sm font-medium">4.9/5 rating</span>
              </div>
              <div className="text-sm text-muted-foreground">500+ active businesses</div>
              <div className="text-sm text-muted-foreground">99.9% uptime</div>
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
              Start with a 14-day free trial. No setup fees, no hidden costs. 
              Cancel anytime during your trial.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {plans.map((plan) => (
              <Card 
                key={plan.id} 
                className={`relative transition-all hover:shadow-lg ${
                  plan.popular 
                    ? 'ring-2 ring-primary scale-105 shadow-xl' 
                    : 'hover:shadow-lg'
                }`}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    {plan.highlight}
                  </Badge>
                )}
                
                <CardHeader className="text-center pb-8">
                  <CardTitle className="text-2xl mb-2">{plan.name}</CardTitle>
                  <div className="space-y-2">
                    <div className="text-4xl font-bold">
                      {plan.price}
                      <span className="text-lg text-muted-foreground font-normal">
                        {plan.period}
                      </span>
                    </div>
                    <div className="text-sm text-green-600 font-medium">
                      Free for 14 days, then {plan.price}/month
                    </div>
                    <CardDescription className="text-base">
                      {plan.description}
                    </CardDescription>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-6">
                  <ul className="space-y-3">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center space-x-3">
                        <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <Button 
                    className="w-full" 
                    size="lg"
                    variant={plan.popular ? "default" : "outline"}
                    asChild
                  >
                    <Link to={`/signup?plan=${plan.id}`}>
                      Start Free Trial
                      <Zap className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
          
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
            </div>
          </div>
        </div>
      </section>

      <Features />
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
              <Button size="lg" className="text-lg px-8 py-6" asChild>
                <Link to="/signup">
                  Start Your Free Trial
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <p className="text-sm text-muted-foreground">
                14-day free trial • No credit card required • Setup in minutes
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
