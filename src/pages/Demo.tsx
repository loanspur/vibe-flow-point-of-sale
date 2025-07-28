import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowRight, 
  Play, 
  ShoppingCart, 
  BarChart3, 
  Users, 
  Package, 
  Receipt, 
  Smartphone, 
  Check,
  Star,
  Monitor,
  Tablet,
  Globe,
  Mail,
  Target,
  Settings,
  Database,
  Shield,
  CreditCard,
  Eye,
  MousePointer,
  TrendingUp,
  Building2,
  Clock,
  Zap
} from "lucide-react";
import { Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import dashboardPreview from "@/assets/dashboard-preview.jpg";
import posSystemHero from "@/assets/pos-system-hero.jpg";

const Demo = () => {
  const [activeDemo, setActiveDemo] = useState("pos");

  // Preload demo images when component mounts
  useEffect(() => {
    const preloadImages = () => {
      const img1 = new Image();
      const img2 = new Image();
      img1.src = dashboardPreview;
      img2.src = posSystemHero;
    };
    preloadImages();
  }, []);

  const demoFeatures = [
    {
      id: "pos",
      title: "Point of Sale",
      description: "Experience our lightning-fast checkout process",
      icon: ShoppingCart,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      features: [
        "Barcode scanning",
        "Multiple payment methods",
        "Receipt customization",
        "Discount management",
        "Tax calculations"
      ]
    },
    {
      id: "inventory",
      title: "Inventory Management", 
      description: "Comprehensive stock control and tracking",
      icon: Package,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
      features: [
        "Real-time stock levels",
        "Low stock alerts",
        "Product variants",
        "Supplier management",
        "Purchase orders"
      ]
    },
    {
      id: "analytics",
      title: "Business Analytics",
      description: "Powerful insights and reporting dashboard",
      icon: BarChart3,
      color: "text-purple-500", 
      bgColor: "bg-purple-500/10",
      features: [
        "Sales reports",
        "Profit analysis",
        "Customer insights",
        "Trend analysis",
        "Performance metrics"
      ]
    },
    {
      id: "customers",
      title: "Customer Management",
      description: "Build lasting customer relationships",
      icon: Users,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
      features: [
        "Customer profiles",
        "Purchase history",
        "Loyalty programs",
        "Contact management",
        "Communication tools"
      ]
    },
    {
      id: "accounting",
      title: "Accounting & Finance",
      description: "Complete financial management solution",
      icon: Receipt,
      color: "text-cyan-500",
      bgColor: "bg-cyan-500/10",
      features: [
        "Chart of accounts",
        "Financial statements",
        "Transaction tracking",
        "Tax management",
        "Accounts payable/receivable"
      ]
    },
    {
      id: "marketing",
      title: "Email Marketing",
      description: "Advanced email campaigns and automation",
      icon: Mail,
      color: "text-red-500",
      bgColor: "bg-red-500/10",
      features: [
        "Campaign management",
        "Client segmentation",
        "Marketing automation",
        "Performance analytics",
        "Template library"
      ]
    }
  ];

  const deviceTypes = [
    {
      id: "desktop",
      name: "Desktop",
      icon: Monitor,
      description: "Full-featured admin experience"
    },
    {
      id: "tablet", 
      name: "Tablet",
      description: "Perfect for POS operations"
    },
    {
      id: "mobile",
      name: "Mobile",
      icon: Smartphone,
      description: "On-the-go management"
    }
  ];

  const superadminFeatures = [
    {
      icon: Database,
      title: "Multi-Tenant Management",
      description: "Manage multiple businesses with complete data isolation and custom branding."
    },
    {
      icon: Mail,
      title: "Email Campaign System",
      description: "Send targeted email campaigns to tenant admins with advanced segmentation."
    },
    {
      icon: Target,
      title: "Client Segmentation",
      description: "Create dynamic audience segments based on business criteria and behavior."
    },
    {
      icon: Eye,
      title: "Global Analytics",
      description: "Monitor system-wide performance, usage patterns, and business metrics."
    },
    {
      icon: Shield,
      title: "Security & Compliance",
      description: "Enterprise-grade security with role-based access and audit trails."
    },
    {
      icon: Settings,
      title: "Automation Rules",
      description: "Set up automated workflows and email sequences based on triggers."
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <Navigation />
      
      {/* Hero Section */}
      <section className="relative pt-24 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/5" />
        <div className="container relative mx-auto px-4">
          <div className="text-center space-y-8 max-w-4xl mx-auto">
            <Badge variant="outline" className="text-sm px-4 py-2">
              <Play className="h-4 w-4 mr-2" />
              Interactive Demo
            </Badge>
            
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight">
              Experience{" "}
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                VibePOS
              </span>{" "}
              in Action
            </h1>
            
            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Explore every feature of our comprehensive business management platform. 
              See how VibePOS can transform your operations with real-time demos.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button size="lg" className="text-lg px-8 py-6" asChild>
                <Link to="/signup">
                  Start Your Free Trial
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" className="text-lg px-8 py-6" onClick={() => {
                document.getElementById('demo-features')?.scrollIntoView({ behavior: 'smooth' });
              }}>
                <Play className="mr-2 h-5 w-5" />
                Watch Demo
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Demo Features Section */}
      <section id="demo-features" className="py-20 bg-muted/20">
        <div className="container mx-auto px-4">
          <div className="text-center space-y-4 mb-16">
            <Badge variant="outline" className="text-sm px-4 py-2">
              <Monitor className="h-4 w-4 mr-2" />
              Feature Demos
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold">
              Explore Every Feature
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Click through our interactive demos to see how VibePOS handles every aspect 
              of your business operations.
            </p>
          </div>

          <Tabs value={activeDemo} onValueChange={setActiveDemo} className="w-full">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 lg:grid-cols-6 mb-8">
              {demoFeatures.map((feature) => (
                <TabsTrigger key={feature.id} value={feature.id} className="text-xs md:text-sm">
                  <feature.icon className="h-4 w-4 mr-1" />
                  {feature.title}
                </TabsTrigger>
              ))}
            </TabsList>

            {demoFeatures.map((feature) => (
              <TabsContent key={feature.id} value={feature.id} className="space-y-8">
                <div className="grid lg:grid-cols-2 gap-12 items-center">
                  <div className="space-y-6">
                    <div className="flex items-center space-x-3">
                      <div className={`p-3 ${feature.bgColor} rounded-xl`}>
                        <feature.icon className={`h-8 w-8 ${feature.color}`} />
                      </div>
                      <div>
                        <h3 className="text-3xl font-bold">{feature.title}</h3>
                        <p className="text-lg text-muted-foreground">{feature.description}</p>
                      </div>
                    </div>
                    
                    <ul className="space-y-3">
                      {feature.features.map((item, index) => (
                        <li key={index} className="flex items-center space-x-3">
                          <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                          <span className="text-lg">{item}</span>
                        </li>
                      ))}
                    </ul>
                    
                    <div className="pt-4">
                      <Button size="lg" asChild>
                        <Link to="/signup">
                          Try This Feature
                          <ArrowRight className="ml-2 h-5 w-5" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                  
                  <div className="relative">
                    <img 
                      src={feature.id === "analytics" ? dashboardPreview : posSystemHero}
                      alt={`${feature.title} Demo`}
                      className="w-full h-auto rounded-2xl shadow-[var(--shadow-elegant)] transform hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-2xl" />
                    <div className="absolute bottom-4 left-4 right-4">
                      <Badge className="bg-white/90 text-black">
                        <Play className="h-3 w-3 mr-1" />
                        Interactive Demo
                      </Badge>
                    </div>
                  </div>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </section>

      {/* Superadmin Features */}
      <section className="py-20 bg-gradient-to-br from-blue-50/50 to-purple-50/50 dark:from-blue-950/20 dark:to-purple-950/20">
        <div className="container mx-auto px-4">
          <div className="text-center space-y-4 mb-16">
            <Badge variant="outline" className="text-sm px-4 py-2">
              <Database className="h-4 w-4 mr-2" />
              Superadmin Platform
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold">
              Advanced Management Console
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Powerful tools for managing multiple tenants, email campaigns, and system-wide operations.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {superadminFeatures.map((feature, index) => (
              <Card key={index} className="hover:shadow-lg transition-all hover:-translate-y-1">
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <feature.icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Device Compatibility */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center space-y-4 mb-16">
            <Badge variant="outline" className="text-sm px-4 py-2">
              <Globe className="h-4 w-4 mr-2" />
              Cross-Platform
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold">
              Works Everywhere
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              VibePOS adapts to any device, ensuring your business runs smoothly whether you're 
              at the counter, in the office, or on the go.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-16">
            {deviceTypes.map((device, index) => (
              <Card key={index} className="text-center hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-center mb-4">
                    <div className="p-4 bg-primary/10 rounded-xl">
                      {device.icon ? (
                        <device.icon className="h-8 w-8 text-primary" />
                      ) : (
                        <Tablet className="h-8 w-8 text-primary" />
                      )}
                    </div>
                  </div>
                  <CardTitle className="text-xl">{device.name}</CardTitle>
                  <CardDescription className="text-base">{device.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>

          {/* Performance Stats */}
          <div className="text-center bg-gradient-to-r from-primary/10 to-accent/10 rounded-2xl p-8">
            <h3 className="text-2xl font-bold mb-6">Trusted Performance</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="space-y-2">
                <div className="text-3xl font-bold text-primary">99.9%</div>
                <div className="text-sm text-muted-foreground">Uptime</div>
              </div>
              <div className="space-y-2">
                <div className="text-3xl font-bold text-primary">&lt;200ms</div>
                <div className="text-sm text-muted-foreground">Response Time</div>
              </div>
              <div className="space-y-2">
                <div className="text-3xl font-bold text-primary">1000+</div>
                <div className="text-sm text-muted-foreground">Active Users</div>
              </div>
              <div className="space-y-2">
                <div className="text-3xl font-bold text-primary">24/7</div>
                <div className="text-sm text-muted-foreground">Support</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Customer Testimonials */}
      <section className="py-20 bg-muted/20">
        <div className="container mx-auto px-4">
          <div className="text-center space-y-4 mb-16">
            <Badge variant="outline" className="text-sm px-4 py-2">
              <Star className="h-4 w-4 mr-2" />
              Customer Success
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold">
              What Our Customers Say
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                name: "Sarah Mwangi",
                business: "Mwangi Electronics",
                rating: 5,
                text: "VibePOS transformed our inventory management. We now track everything in real-time and our profits have increased by 30%."
              },
              {
                name: "James Ochieng",
                business: "Ochieng Pharmacy",
                rating: 5,
                text: "The multi-location support is incredible. I can manage all my branches from one dashboard. Highly recommended!"
              },
              {
                name: "Grace Wanjiku",
                business: "Wanjiku Fashion Store",
                rating: 5,
                text: "Customer management features helped us build a loyal customer base. The email campaigns work perfectly."
              }
            ].map((testimonial, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center">
                      <span className="text-white font-bold">{testimonial.name[0]}</span>
                    </div>
                    <div>
                      <h4 className="font-semibold">{testimonial.name}</h4>
                      <p className="text-sm text-muted-foreground">{testimonial.business}</p>
                    </div>
                  </div>
                  <div className="flex space-x-1">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground italic">"{testimonial.text}"</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

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
                14-day free trial • No credit card required • Full feature access
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Demo;