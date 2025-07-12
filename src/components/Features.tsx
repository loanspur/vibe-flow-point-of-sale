import { Card } from "@/components/ui/card";
import { 
  ShoppingCart, 
  BarChart3, 
  Users, 
  Smartphone, 
  Shield, 
  Zap,
  Building2,
  CreditCard
} from "lucide-react";

const Features = () => {
  const features = [
    {
      icon: ShoppingCart,
      title: "Smart Sales Processing",
      description: "Lightning-fast checkout with barcode scanning, inventory management, and receipt customization."
    },
    {
      icon: BarChart3,
      title: "Advanced Analytics",
      description: "Real-time dashboards, sales reports, and business insights to drive growth and optimize operations."
    },
    {
      icon: Building2,
      title: "Multi-Tenant Architecture",
      description: "Serve multiple businesses with complete data isolation, custom branding, and tenant management."
    },
    {
      icon: Users,
      title: "Customer Management",
      description: "Build customer profiles, loyalty programs, and targeted marketing campaigns to increase retention."
    },
    {
      icon: Smartphone,
      title: "Mobile Optimized",
      description: "Works seamlessly on tablets, phones, and desktops with responsive design and offline capabilities."
    },
    {
      icon: Shield,
      title: "Enterprise Security",
      description: "Bank-level encryption, role-based access control, and compliance with industry standards."
    },
    {
      icon: CreditCard,
      title: "Payment Processing",
      description: "Accept all payment methods including cards, digital wallets, and contactless payments."
    },
    {
      icon: Zap,
      title: "Lightning Fast",
      description: "Optimized for speed with sub-second response times and efficient database operations."
    }
  ];

  return (
    <section className="py-20 bg-gradient-to-b from-background to-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-4xl lg:text-5xl font-bold text-foreground">
            Everything you need to
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent"> succeed</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            vibePOS combines powerful features with intuitive design to help businesses of all sizes streamline operations and boost sales.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <Card 
              key={index} 
              className="p-6 hover:shadow-[var(--shadow-card)] transition-all duration-300 hover:-translate-y-1 border-border bg-gradient-to-br from-card to-card/50"
            >
              <div className="space-y-4">
                <div className="w-12 h-12 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center">
                  <feature.icon className="h-6 w-6 text-primary-foreground" />
                </div>
                <h3 className="text-xl font-semibold text-foreground">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;