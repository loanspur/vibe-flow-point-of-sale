import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { TrialSignupModal } from "@/components/TrialSignupModal";
import { supabase } from "@/integrations/supabase/client";
import heroImage from "@/assets/hero-pos.jpg";
import posSystemHero from "@/assets/pos-system-hero.jpg";

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

const Hero = () => {
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<BillingPlan | null>(null);
  const [isSignupModalOpen, setIsSignupModalOpen] = useState(false);

  // Preload hero images when component mounts
  useEffect(() => {
    const preloadImages = () => {
      const img1 = new Image();
      const img2 = new Image();
      img1.src = heroImage;
      img2.src = posSystemHero;
    };
    preloadImages();
  }, []);

  useEffect(() => {
    const fetchPlans = async () => {
      const { data } = await supabase
        .from('billing_plans')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      
      if (data) setPlans(data);
    };
    
    fetchPlans();
  }, []);

  const handleStartTrial = () => {
    // Find Enterprise plan and set it as selected
    const enterprisePlan = plans.find(plan => plan.name === 'Enterprise');
    setSelectedPlan(enterprisePlan || plans[0] || null);
    setIsSignupModalOpen(true);
  };

  const formatFeatures = (features: any) => {
    return Array.isArray(features) ? features : [];
  };

  const getDisplayPrice = (plan: BillingPlan) => {
    return `KES ${plan.price?.toLocaleString() || '0'}`;
  };

  const getDisplayPeriod = () => '/month';

  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-br from-background via-primary/5 to-accent/10 min-h-screen flex items-center">
        <div className="container mx-auto px-4 py-12 sm:py-16 lg:py-20">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div className="space-y-6 lg:space-y-8 order-2 lg:order-1">
              {/* Mobile-first layout with stacked content */}
              <div className="space-y-6">
                <div className="space-y-4">
                  <h1 className="text-responsive-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent leading-tight">
                    AI-Powered Modern POS System with Advanced Analytics
                  </h1>
                  <p className="text-responsive-base text-muted-foreground">
                    Custom branded multi-tenant point of sale with inventory management, stock reconciliation, and real-time business analytics
                  </p>
                </div>
                
                {/* Mobile image placement */}
                <div className="w-full sm:hidden">
                  <img 
                    src="/business-data-tracking.jpg" 
                    alt="Professional tracking business data on computer and phone" 
                    className="w-full h-auto rounded-xl shadow-[var(--shadow-elegant)] transform hover:scale-105 transition-transform duration-500"
                    onError={(e) => console.error('Image failed to load:', e)}
                    onLoad={() => console.log('Image loaded successfully')}
                  />
                </div>
              </div>
              
              <p className="text-responsive-base text-muted-foreground hidden sm:block">
                Complete inventory management, stock taking, reconciliation, and AI-powered analytics. Own branded POS with custom domains for professional business growth.
              </p>

              {/* Mobile-first button layout */}
              <div className="mobile-button-group">
                <Button variant="hero" size="lg" className="text-responsive-base px-6 py-4 sm:px-8 sm:py-6 w-full sm:w-auto" onClick={handleStartTrial}>
                  Start Free Trial
                  <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
                <Button variant="outline" size="lg" className="text-responsive-base px-6 py-4 sm:px-8 sm:py-6 w-full sm:w-auto" asChild>
                  <Link to="/demo">
                    View Demo
                  </Link>
                </Button>
              </div>

              {/* Mobile-optimized feature list */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pt-4 sm:pt-6">
                {[
                  "AI-powered analytics & insights",
                  "Real-time stock management",
                  "Custom domains & branding",
                  "Advanced reconciliation tools"
                ].map((feature, index) => (
                  <div key={index} className="flex items-center gap-3 touch-target">
                    <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-pos-success flex-shrink-0" />
                    <span className="text-responsive-sm text-foreground font-medium">{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Mobile-optimized image section */}
            <div className="relative space-y-4 sm:space-y-6 order-1 lg:order-2">
              {/* Main POS System Hero Image */}
              <div className="relative z-10">
                <img 
                  src={posSystemHero} 
                  alt="Modern POS System Interface" 
                  className="w-full h-auto rounded-2xl shadow-[var(--shadow-elegant)] transform hover:scale-105 transition-transform duration-500"
                />
              </div>
              
              {/* Secondary Dashboard Image - hidden on mobile for cleaner look */}
              <div className="relative z-10 transform translate-x-4 sm:translate-x-8 -translate-y-4 sm:-translate-y-8 hidden sm:block">
                <img 
                  src={heroImage} 
                  alt="vibePOS Dashboard Overview" 
                  className="w-3/4 h-auto rounded-xl shadow-[var(--shadow-elegant)] transform hover:scale-105 transition-transform duration-500 opacity-90"
                />
              </div>
              
              {/* Decorative gradient background */}
              <div className="absolute -top-4 -right-4 -bottom-4 -left-4 bg-gradient-to-r from-primary/20 to-accent/20 rounded-3xl blur-xl"></div>
            </div>
          </div>
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

export default Hero;