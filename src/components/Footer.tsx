import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useState, useEffect } from "react";
import { TrialSignupModal } from "@/components/TrialSignupModal";
import { supabase } from "@/integrations/supabase/client";
import { Facebook, Twitter, Instagram, Linkedin, Youtube } from "lucide-react";

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

const Footer = () => {
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<BillingPlan | null>(null);
  const [isSignupModalOpen, setIsSignupModalOpen] = useState(false);

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
    setSelectedPlan(plans[0] || null); // Use first plan as default
    setIsSignupModalOpen(true);
  };

  const formatFeatures = (features: any) => {
    return Array.isArray(features) ? features : [];
  };

  const getDisplayPrice = (plan: BillingPlan) => {
    return `KES ${plan.price?.toLocaleString() || '0'}`;
  };

  const getDisplayPeriod = () => '/month';

  const footerSections = [
    {
      title: "Product",
      links: [
        { label: "Features", href: "#features" },
        { label: "Pricing", href: "#pricing" },
        { label: "Demo", href: "#demo" },
        { label: "API", href: "#api" }
      ]
    },
    {
      title: "Company",
      links: [
        { label: "About", href: "#about" },
        { label: "Blog", href: "#blog" },
        { label: "Careers", href: "/careers" },
        { label: "Contact", href: "#contact" }
      ]
    },
    {
      title: "Support",
      links: [
        { label: "Documentation", href: "#docs" },
        { label: "Help Center", href: "#help" },
        { label: "Community", href: "#community" },
        { label: "Status", href: "#status" }
      ]
    }
  ];

  return (
    <>
      <footer className="bg-background border-t border-border">
        <div className="container mx-auto px-4 py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Brand Section */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">V</span>
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  vibePOS
                </span>
              </div>
              <p className="text-muted-foreground">
                The modern multi-tenant POS system that grows with your business.
              </p>
              <div className="flex space-x-3 mb-4">
                <a 
                  href="https://facebook.com/vibepos" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary transition-colors p-2 rounded-full hover:bg-primary/10"
                >
                  <Facebook size={20} />
                </a>
                <a 
                  href="https://twitter.com/vibepos" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary transition-colors p-2 rounded-full hover:bg-primary/10"
                >
                  <Twitter size={20} />
                </a>
                <a 
                  href="https://instagram.com/vibepos" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary transition-colors p-2 rounded-full hover:bg-primary/10"
                >
                  <Instagram size={20} />
                </a>
                <a 
                  href="https://linkedin.com/company/vibepos" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary transition-colors p-2 rounded-full hover:bg-primary/10"
                >
                  <Linkedin size={20} />
                </a>
                <a 
                  href="https://youtube.com/@vibepos" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary transition-colors p-2 rounded-full hover:bg-primary/10"
                >
                  <Youtube size={20} />
                </a>
              </div>
              <Button variant="hero" className="w-full" onClick={handleStartTrial}>
                Start Free Trial
              </Button>
            </div>

            {/* Links Sections */}
            {footerSections.map((section, index) => (
              <div key={index} className="space-y-4">
                <h3 className="font-semibold text-foreground">{section.title}</h3>
                <ul className="space-y-2">
                  {section.links.map((link, linkIndex) => (
                    <li key={linkIndex}>
                      <a 
                        href={link.href} 
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <Separator className="my-8" />

          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p className="text-muted-foreground text-sm">
              © 2024 vibePOS. All rights reserved.
            </p>
            <div className="flex items-center space-x-6">
              <a href="/privacy-policy" className="text-muted-foreground hover:text-foreground transition-colors">
                Privacy Policy
              </a>
              <a href="/terms-of-service" className="text-muted-foreground hover:text-foreground transition-colors">
                Terms of Service
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                Cookie Policy
              </a>
            </div>
          </div>
        </div>
      </footer>

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

export default Footer;