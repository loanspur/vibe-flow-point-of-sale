import React, { useState, useMemo } from "react";
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
  Mail,
  Check,
  Monitor,
  Tablet,
  Smartphone,
  Globe
} from "lucide-react";
import { Link } from "react-router-dom";
import { LazyImage } from "@/components/ui/image-lazy";
import demoPosImage from "@/assets/demo-pos.jpg";
import demoInventoryImage from "@/assets/demo-inventory.jpg";
import demoAnalyticsImage from "@/assets/demo-analytics.jpg";
import demoCustomersImage from "@/assets/demo-customers.jpg";
import demoAccountingImage from "@/assets/demo-accounting.jpg";
import demoMarketingImage from "@/assets/demo-marketing.jpg";

interface DemoSectionProps {
  onStartTrial: () => void;
}

export const DemoSection: React.FC<DemoSectionProps> = ({ onStartTrial }) => {
  const [activeDemo, setActiveDemo] = useState("pos");

  const demoFeatures = useMemo(() => [
    {
      id: "pos",
      title: "Point of Sale",
      description: "Experience our lightning-fast checkout process",
      icon: ShoppingCart,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      image: demoPosImage,
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
      image: demoInventoryImage,
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
      image: demoAnalyticsImage,
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
      image: demoCustomersImage,
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
      image: demoAccountingImage,
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
      image: demoMarketingImage,
      features: [
        "Campaign management",
        "Client segmentation",
        "Marketing automation",
        "Performance analytics",
        "Template library"
      ]
    }
  ], []);

  const deviceTypes = useMemo(() => [
    {
      id: "desktop",
      name: "Desktop",
      icon: Monitor,
      description: "Full-featured admin experience"
    },
    {
      id: "tablet", 
      name: "Tablet",
      icon: Tablet,
      description: "Perfect for POS operations"
    },
    {
      id: "mobile",
      name: "Mobile",
      icon: Smartphone,
      description: "On-the-go management"
    }
  ], []);

  return (
    <>
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
                      <Button size="lg" onClick={onStartTrial}>
                        Try This Feature
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="relative">
                    <LazyImage 
                      src={feature.image}
                      alt={`${feature.title} Demo`}
                      className="w-full h-auto rounded-2xl shadow-[var(--shadow-elegant)] transform hover:scale-105 transition-transform duration-500"
                      loading="lazy"
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
                      <device.icon className="h-8 w-8 text-primary" />
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
    </>
  );
};