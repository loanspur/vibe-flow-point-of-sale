import { Button } from "@/components/ui/button";
import { Menu, X, User, LogOut } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import ContactForm from "@/components/ContactForm";
import { TrialSignupModal } from "@/components/TrialSignupModal";
import { supabase } from "@/integrations/supabase/client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<BillingPlan | null>(null);
  const [isSignupModalOpen, setIsSignupModalOpen] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

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

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const navigation = [
    { name: "Features", href: "/#features" },
    { name: "Pricing", href: "/#pricing" },
    { name: "Demo", href: "/demo" },
  ];

  return (
    <>
      <nav className="bg-background/90 backdrop-blur-sm border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center py-4">
            {/* Logo */}
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">V</span>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                vibePOS
              </span>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              {navigation.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {item.name}
                </a>
              ))}
              
              <button
                onClick={() => setIsContactOpen(true)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Contact
              </button>
            </div>

            {/* Desktop Auth Section */}
            <div className="hidden md:flex items-center space-x-4">
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center space-x-2">
                      <User className="h-4 w-4" />
                      <span>Account</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => navigate('/dashboard')}>
                      Dashboard
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/profile')}>
                      Profile
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut}>
                      <LogOut className="h-4 w-4 mr-2" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <>
                  <Button variant="ghost" onClick={() => navigate('/auth')}>Sign In</Button>
                  <Button variant="default" onClick={handleStartTrial}>Start Free Trial</Button>
                </>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden"
              onClick={() => setIsOpen(!isOpen)}
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>

          {/* Mobile Menu */}
          {isOpen && (
            <div className="md:hidden py-4 border-t border-border">
              <div className="flex flex-col space-y-4">
                {navigation.map((item) => (
                  <a
                    key={item.name}
                    href={item.href}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    {item.name}
                  </a>
                ))}
                
                <button
                  onClick={() => {
                    setIsContactOpen(true);
                    setIsOpen(false);
                  }}
                  className="text-muted-foreground hover:text-foreground transition-colors text-left"
                >
                  Contact
                </button>

                <div className="pt-4 border-t border-border">
                  {user ? (
                    <div className="flex flex-col space-y-2">
                      <Button variant="ghost" onClick={() => navigate('/dashboard')} className="justify-start">
                        Dashboard
                      </Button>
                      <Button variant="ghost" onClick={handleSignOut} className="justify-start">
                        <LogOut className="h-4 w-4 mr-2" />
                        Sign Out
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col space-y-2">
                      <Button variant="ghost" onClick={() => navigate('/auth')} className="justify-start">
                        Sign In
                      </Button>
                      <Button variant="default" onClick={handleStartTrial} className="justify-start">
                        Start Free Trial
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Contact Form Modal */}
      <ContactForm 
        isOpen={isContactOpen} 
        onOpenChange={setIsContactOpen} 
      />

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

export default Navigation;