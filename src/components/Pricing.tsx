import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle, Star } from "lucide-react";
import BillingPlansManager from "./BillingPlansManager";
import PaystackTestingInterface from "./PaystackTestingInterface";
import { usePricingCalculation } from "@/hooks/usePricingCalculation";
import { useState, useEffect } from "react";
import { TrialSignupModal } from "@/components/TrialSignupModal";
import { supabase } from "@/integrations/supabase/client";

interface BillingPlan {
  id: string;
  name: string;
  price: number;
  period: string;
  description: string;
  features: any;
  badge?: string;
  badge_color?: string;
}

const Pricing = () => {
  const [isAnnual, setIsAnnual] = useState(false);
  const [dbPlans, setDbPlans] = useState<BillingPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<BillingPlan | null>(null);
  const [isSignupModalOpen, setIsSignupModalOpen] = useState(false);

  useEffect(() => {
    const fetchPlans = async () => {
      const { data } = await supabase
        .from('billing_plans')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      
      if (data) setDbPlans(data);
    };
    
    fetchPlans();
  }, []);

  const handleStartTrial = (planName: string) => {
    // Find the corresponding plan in the database
    const dbPlan = dbPlans.find(p => p.name.toLowerCase() === planName.toLowerCase());
    setSelectedPlan(dbPlan || null);
    setIsSignupModalOpen(true);
  };

  const formatFeatures = (features: any) => {
    return Array.isArray(features) ? features : [];
  };

  const getDisplayPrice = (plan: BillingPlan) => {
    return `KES ${plan.price?.toLocaleString() || '0'}`;
  };

  const getDisplayPeriod = () => '/month';

  // Dynamic pricing configurations for each plan
  const starterPricing = usePricingCalculation({
    monthlyPrice: 29,
    annualDiscountMonths: 2,
    currency: 'USD'
  });

  const professionalPricing = usePricingCalculation({
    monthlyPrice: 79,
    annualDiscountMonths: 2, 
    currency: 'USD'
  });

  const enterprisePricing = usePricingCalculation({
    monthlyPrice: 199,
    annualDiscountMonths: 2,
    currency: 'USD'
  });

  const plans = [
    {
      name: "Starter",
      monthlyPrice: 29,
      price: starterPricing.getDisplayPriceFormatted(isAnnual),
      period: starterPricing.getPeriod(isAnnual),
      pricing: starterPricing,
      description: "Perfect for small businesses just getting started",
      features: [
        "1 Location",
        "Up to 3 Staff Users",
        "Up to 500 Products",
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
      monthlyPrice: 79,
      price: professionalPricing.getDisplayPriceFormatted(isAnnual),
      period: professionalPricing.getPeriod(isAnnual),
      pricing: professionalPricing,
      description: "Ideal for growing businesses with multiple needs",
      features: [
        "Up to 5 Locations",
        "Unlimited Staff Users",
        "Up to 5,000 Products",
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
      monthlyPrice: 199,
      price: enterprisePricing.getDisplayPriceFormatted(isAnnual),
      period: enterprisePricing.getPeriod(isAnnual),
      pricing: enterprisePricing,
      description: "For large businesses requiring advanced features",
      features: [
        "Unlimited Locations",
        "Unlimited Staff Users",
        "Unlimited Products",
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
              {isAnnual && (
                <span className="ml-2 text-sm font-medium text-pos-success bg-pos-success/10 px-2 py-1 rounded-full">
                  Save {starterPricing.getSavings().display}
                </span>
              )}
            </div>
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
                    onClick={() => plan.cta === "Start Free Trial" ? handleStartTrial(plan.name) : undefined}
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

      {/* Paystack Testing Interface */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Payment Testing</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Test the complete Paystack payment flow with Kenyan Shilling pricing
            </p>
          </div>
          <PaystackTestingInterface />
        </div>
      </section>

      {/* Trial Signup Modal */}
      <TrialSignupModal
        isOpen={isSignupModalOpen}
        onClose={() => setIsSignupModalOpen(false)}
        selectedPlan={selectedPlan}
        getDisplayPrice={getDisplayPrice}
        getDisplayPeriod={getDisplayPeriod}
        formatFeatures={formatFeatures}
      />
    </>
  );
};

export default Pricing;