import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle, Star } from "lucide-react";
import BillingPlansManager from "./BillingPlansManager";

const Pricing = () => {
  const plans = [
    {
      name: "Starter",
      price: "$29",
      period: "/month",
      description: "Perfect for small businesses just getting started",
      features: [
        "1 Location",
        "Up to 3 Staff Users",
        "Basic Inventory Management",
        "Standard Reports",
        "Email Support",
        "Mobile App Access"
      ],
      cta: "Start Free Trial",
      popular: false
    },
    {
      name: "Professional",
      price: "$79",
      period: "/month",
      description: "Ideal for growing businesses with multiple needs",
      features: [
        "Up to 5 Locations",
        "Unlimited Staff Users",
        "Advanced Inventory & Analytics",
        "Custom Reports & Dashboards",
        "Priority Support",
        "API Access",
        "Customer Loyalty Programs",
        "Multi-tenant Management"
      ],
      cta: "Start Free Trial",
      popular: true
    },
    {
      name: "Enterprise",
      price: "$199",
      period: "/month",
      description: "For large businesses requiring advanced features",
      features: [
        "Unlimited Locations",
        "Unlimited Staff Users",
        "White-label Solutions",
        "Custom Integrations",
        "24/7 Phone Support",
        "Dedicated Account Manager",
        "Advanced Security Features",
        "Custom Training"
      ],
      cta: "Contact Sales",
      popular: false
    }
  ];

  return (
    <>
      {/* Customer-facing pricing section */}
      <section id="pricing" className="py-20 bg-gradient-to-b from-background to-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold text-foreground">
              Simple, transparent
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent"> pricing</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Choose the perfect plan for your business. Start with a 14-day free trial, no credit card required.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {plans.map((plan, index) => (
              <Card 
                key={index} 
                className={`relative p-8 ${
                  plan.popular 
                    ? 'border-primary shadow-[var(--shadow-elegant)] bg-gradient-to-br from-card to-primary/5' 
                    : 'border-border bg-card hover:shadow-[var(--shadow-card)]'
                } transition-all duration-300 hover:-translate-y-1`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <div className="flex items-center gap-1 bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-semibold">
                      <Star className="h-4 w-4 fill-current" />
                      Most Popular
                    </div>
                  </div>
                )}

                <div className="space-y-6">
                  <div className="space-y-2">
                    <h3 className="text-2xl font-bold text-foreground">{plan.name}</h3>
                    <p className="text-muted-foreground">{plan.description}</p>
                  </div>

                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                    <span className="text-muted-foreground">{plan.period}</span>
                  </div>

                  <Button 
                    variant={plan.popular ? "hero" : "outline"} 
                    className="w-full"
                    size="lg"
                  >
                    {plan.cta}
                  </Button>

                  <div className="space-y-4">
                    <h4 className="font-semibold text-foreground">What's included:</h4>
                    <ul className="space-y-3">
                      {plan.features.map((feature, featureIndex) => (
                        <li key={featureIndex} className="flex items-center gap-3">
                          <CheckCircle className="h-5 w-5 text-pos-success flex-shrink-0" />
                          <span className="text-foreground">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <div className="text-center mt-12">
            <p className="text-muted-foreground">
              All plans include a 14-day free trial. No setup fees, cancel anytime.
            </p>
          </div>
        </div>
      </section>

      {/* Enhanced billing plans management section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <BillingPlansManager />
        </div>
      </section>
    </>
  );
};

export default Pricing;