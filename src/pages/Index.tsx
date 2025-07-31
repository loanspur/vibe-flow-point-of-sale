import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Zap, Shield, Users, BarChart3, TrendingUp, Building2, Lock, Star, MousePointer, Menu, X } from "lucide-react";
import { Link } from "react-router-dom";
import { LazyImage } from "@/components/ui/image-lazy";
import { TenantCreationModal } from "@/components/TenantCreationModal";
import ContactForm from "@/components/ContactForm";
import { Pricing } from "@/components/Pricing";
import Features from "@/components/Features";
import { DemoSection } from "@/components/DemoSection";
import Footer from "@/components/Footer";
import posSystemHero from "@/assets/pos-system-hero.jpg";
import dashboardPreview from "@/assets/dashboard-preview.jpg";

const Index = () => {
  const [isSignupModalOpen, setIsSignupModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleStartTrial = () => {
    setIsSignupModalOpen(true);
  };

  const handleCloseSignupModal = () => {
    setIsSignupModalOpen(false);
  };

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setIsMobileMenuOpen(false);
    }
  };

  const navigationItems = [
    { name: "Home", id: "home" },
    { name: "Features", id: "features" },
    { name: "Pricing", id: "pricing" },
    { name: "Demo", id: "demo" },
    { name: "Security", id: "security" },
    { name: "Contact", id: "contact" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Fixed Navigation Header */}
      <nav className="fixed top-0 left-0 right-0 bg-background/95 backdrop-blur-lg border-b border-border z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-primary to-accent rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">V</span>
              </div>
              <span className="text-xl font-bold">VibePOS</span>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              {navigationItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  {item.name}
                </button>
              ))}
            </div>

            {/* CTA Button & Mobile Menu */}
            <div className="flex items-center space-x-4">
              <Button onClick={handleStartTrial} className="hidden sm:flex">
                Start Free Trial
              </Button>
              
              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2"
              >
                {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {/* Mobile Navigation Menu */}
          {isMobileMenuOpen && (
            <div className="md:hidden py-4 border-t border-border">
              <div className="flex flex-col space-y-4">
                {navigationItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => scrollToSection(item.id)}
                    className="text-left text-muted-foreground hover:text-primary transition-colors py-2"
                  >
                    {item.name}
                  </button>
                ))}
                <Button onClick={handleStartTrial} className="mt-4">
                  Start Free Trial
                </Button>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section id="home" className="relative overflow-hidden pt-32 pb-20 lg:py-40">
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
              <Button 
                variant="outline" 
                size="lg" 
                className="text-lg px-8 py-6"
                onClick={() => scrollToSection('demo')}
              >
                View Demo
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

          {/* Hero Images */}
          <div className="mt-16 grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
            <div className="relative">
              <LazyImage 
                src={posSystemHero}
                alt="POS System Interface"
                className="w-full h-auto rounded-2xl shadow-[var(--shadow-elegant)] transform hover:scale-105 transition-transform duration-500"
                loading="eager"
              />
              <Badge className="absolute top-4 left-4 bg-white/90 text-black">
                Live POS System
              </Badge>
            </div>
            <div className="relative">
              <LazyImage 
                src={dashboardPreview}
                alt="Analytics Dashboard"
                className="w-full h-auto rounded-2xl shadow-[var(--shadow-elegant)] transform hover:scale-105 transition-transform duration-500"
                loading="eager"
              />
              <Badge className="absolute top-4 left-4 bg-white/90 text-black">
                AI Analytics Dashboard
              </Badge>
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

      {/* Features Section */}
      <section id="features">
        <Features />
      </section>

      {/* Pricing Section */}
      <section id="pricing">
        <Pricing onStartTrial={handleStartTrial} />
      </section>

      {/* Demo Section */}
      <section id="demo">
        <DemoSection onStartTrial={handleStartTrial} />
      </section>

      {/* Security & Trust Section */}
      <section id="security" className="py-20 bg-gradient-to-br from-primary/5 to-accent/5">
        <div className="container mx-auto px-4">
          <div className="text-center space-y-4 mb-16">
            <Badge variant="outline" className="text-sm px-4 py-2">
              <Shield className="h-4 w-4 mr-2" />
              Enterprise Security
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold">
              Enterprise-Grade Security
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Your data is protected with bank-level security and industry-leading compliance standards.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <Shield className="h-12 w-12 text-primary mx-auto mb-4" />
                <CardTitle>SSL Encryption</CardTitle>
                <CardDescription>256-bit SSL encryption for all data transmission</CardDescription>
              </CardHeader>
            </Card>
            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <Lock className="h-12 w-12 text-primary mx-auto mb-4" />
                <CardTitle>Data Protection</CardTitle>
                <CardDescription>GDPR compliant with regular security audits</CardDescription>
              </CardHeader>
            </Card>
            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <Building2 className="h-12 w-12 text-primary mx-auto mb-4" />
                <CardTitle>Daily Backups</CardTitle>
                <CardDescription>Automated daily backups with instant recovery</CardDescription>
              </CardHeader>
            </Card>
            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <BarChart3 className="h-12 w-12 text-primary mx-auto mb-4" />
                <CardTitle>99.9% Uptime</CardTitle>
                <CardDescription>Guaranteed uptime with 24/7 monitoring</CardDescription>
              </CardHeader>
            </Card>
          </div>

          {/* Additional Security Features */}
          <div className="mt-16 bg-background/50 rounded-2xl p-8 backdrop-blur-sm border border-border/50">
            <h3 className="text-2xl font-bold text-center mb-8">Why Businesses Trust VibePOS</h3>
            <div className="grid md:grid-cols-3 gap-8 text-center">
              <div className="space-y-3">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <Shield className="h-8 w-8 text-green-600" />
                </div>
                <h4 className="font-semibold">ISO 27001 Certified</h4>
                <p className="text-sm text-muted-foreground">International security management standards</p>
              </div>
              <div className="space-y-3">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                  <Lock className="h-8 w-8 text-blue-600" />
                </div>
                <h4 className="font-semibold">PCI DSS Compliant</h4>
                <p className="text-sm text-muted-foreground">Secure payment card data handling</p>
              </div>
              <div className="space-y-3">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto">
                  <Building2 className="h-8 w-8 text-purple-600" />
                </div>
                <h4 className="font-semibold">SOC 2 Type II</h4>
                <p className="text-sm text-muted-foreground">Audited security controls and processes</p>
              </div>
            </div>
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
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button 
                size="lg" 
                variant="secondary" 
                className="text-lg px-8 py-6"
                onClick={handleStartTrial}
              >
                Start Your Free Trial Now
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="text-lg px-8 py-6 border-white/20 text-white hover:bg-white/10"
                onClick={() => scrollToSection('contact')}
              >
                Get in Touch
              </Button>
            </div>
            <p className="text-sm opacity-75">
              No credit card required • Cancel anytime • 14-day free trial
            </p>
          </div>
        </div>
      </section>

      {/* Contact Form Section */}
      <section id="contact">
        <ContactForm />
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