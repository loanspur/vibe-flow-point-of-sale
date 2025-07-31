import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Zap, Shield, Users, BarChart3, TrendingUp, Building2, Lock, Star, MousePointer } from "lucide-react";
import { Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { LazyImage } from "@/components/ui/image-lazy";
import { TenantCreationModal } from "@/components/TenantCreationModal";
import ContactForm from "@/components/ContactForm";
import { Pricing } from "@/components/Pricing";
import Features from "@/components/Features";
import { DemoSection } from "@/components/DemoSection";
import posSystemHero from "@/assets/pos-system-hero.jpg";
import dashboardPreview from "@/assets/dashboard-preview.jpg";

const Index = () => {
  const [isSignupModalOpen, setIsSignupModalOpen] = useState(false);

  const handleStartTrial = () => {
    setIsSignupModalOpen(true);
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
            <div className="flex flex-wrap items-center justify-center gap-4 mb-6">
              <Badge variant="outline" className="text-sm px-4 py-2">
                <Zap className="h-4 w-4 mr-2" />
                Start your 14-day free trial today
              </Badge>
              <Badge variant="outline" className="text-sm px-4 py-2 border-green-500/50 bg-green-50 text-green-700">
                <Lock className="h-4 w-4 mr-2" />
                Wildcard SSL Secured
              </Badge>
            </div>
            
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight">
              AI-Powered Modern POS with{" "}
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Smart Analytics
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Complete inventory management, stock reconciliation, and AI analytics. 
              Custom domains, own branded POS system for business growth.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button size="lg" className="text-lg px-8 py-6" onClick={handleStartTrial}>
                Start Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button variant="outline" size="lg" className="text-lg px-8 py-6" asChild>
                <Link to="/demo">View Demo</Link>
              </Button>
            </div>
            
            {/* Trust indicators */}
            <div className="flex flex-wrap items-center justify-center gap-8 mt-12 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                <span>Bank-level Security</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span>1000+ Happy Customers</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                <span>99.9% Uptime</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="py-16 border-t border-border/10">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div className="space-y-2">
              <div className="text-3xl font-bold text-primary">4.9/5</div>
              <div className="text-sm text-muted-foreground">Average Rating</div>
              <div className="flex justify-center">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-current text-yellow-400" />
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-primary">1000+</div>
              <div className="text-sm text-muted-foreground">Active Businesses</div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-primary">99.9%</div>
              <div className="text-sm text-muted-foreground">Uptime</div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-primary">24/7</div>
              <div className="text-sm text-muted-foreground">Support</div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section - Focused only on pricing */}
      <Pricing onStartTrial={handleStartTrial} />

      {/* Features Section - Focused only on features */}
      <Features />

      {/* Demo Section - Focused only on demo */}
      <DemoSection onStartTrial={handleStartTrial} />

      {/* Security & Trust Section */}
      <section className="py-20 bg-gradient-to-br from-primary/5 to-accent/5">
        <div className="container mx-auto px-4">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-4xl md:text-5xl font-bold">
              Enterprise-Grade Security
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Your data is protected with bank-level security and industry-leading compliance standards.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="text-center">
              <CardHeader>
                <Shield className="h-12 w-12 text-primary mx-auto mb-4" />
                <CardTitle>SSL Encryption</CardTitle>
                <CardDescription>256-bit SSL encryption for all data transmission</CardDescription>
              </CardHeader>
            </Card>
            <Card className="text-center">
              <CardHeader>
                <Lock className="h-12 w-12 text-primary mx-auto mb-4" />
                <CardTitle>Data Protection</CardTitle>
                <CardDescription>GDPR compliant with regular security audits</CardDescription>
              </CardHeader>
            </Card>
            <Card className="text-center">
              <CardHeader>
                <Building2 className="h-12 w-12 text-primary mx-auto mb-4" />
                <CardTitle>Daily Backups</CardTitle>
                <CardDescription>Automated daily backups with instant recovery</CardDescription>
              </CardHeader>
            </Card>
            <Card className="text-center">
              <CardHeader>
                <BarChart3 className="h-12 w-12 text-primary mx-auto mb-4" />
                <CardTitle>99.9% Uptime</CardTitle>
                <CardDescription>Guaranteed uptime with 24/7 monitoring</CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 bg-gradient-to-r from-primary to-accent text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-3xl mx-auto space-y-8">
            <h2 className="text-4xl md:text-5xl font-bold">
              Ready to Transform Your Business?
            </h2>
            <p className="text-xl opacity-90">
              Join thousands of businesses already using VibePOS to streamline operations 
              and boost sales. Start your free trial today.
            </p>
            <Button 
              size="lg" 
              variant="secondary" 
              className="text-lg px-8 py-6"
              onClick={handleStartTrial}
            >
              Start Your Free Trial Now
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <p className="text-sm opacity-75">
              No credit card required • Cancel anytime • 14-day free trial
            </p>
          </div>
        </div>
      </section>

      {/* Contact Form */}
      <ContactForm />

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