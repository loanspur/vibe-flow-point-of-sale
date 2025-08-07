import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Check } from "lucide-react";
import { useOptimizedPricing } from "@/hooks/useOptimizedPricing";
import { LoadingSpinner } from "@/components/LoadingSpinner";

interface PricingProps {
  onStartTrial: () => void;
}

export const Pricing: React.FC<PricingProps> = ({ onStartTrial }) => {
  const { 
    plans, 
    loading, 
    isAnnual, 
    setIsAnnual, 
    getDisplayPrice, 
    getDisplayPeriod, 
    getDynamicSavings, 
    formatFeatures 
  } = useOptimizedPricing();

  if (loading) {
    return (
      <section className="py-20 bg-gradient-to-br from-background to-background/80">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <div className="h-12 w-96 mx-auto mb-4 bg-muted animate-pulse rounded" />
            <div className="h-6 w-128 mx-auto bg-muted animate-pulse rounded" />
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-96 w-full bg-muted animate-pulse rounded" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="pricing" className="py-20 bg-gradient-to-br from-background to-background/80">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Simple, Transparent Pricing
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            Choose the perfect plan for your business. All plans include our core POS features with no hidden fees.
          </p>
          
          <div className="flex items-center justify-center space-x-4 mb-8">
            <Label htmlFor="billing-toggle" className="text-sm font-medium">
              Monthly
            </Label>
            <Switch
              id="billing-toggle"
              checked={isAnnual}
              onCheckedChange={setIsAnnual}
            />
            <Label htmlFor="billing-toggle" className="text-sm font-medium">
              Annual
              <Badge variant="secondary" className="ml-2 text-xs">
                Save up to 25%
              </Badge>
            </Label>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => {
            const savings = getDynamicSavings(plan);
            const isPopular = plan.name === "Professional";
            
            return (
              <Card 
                key={plan.id} 
                className={`relative transition-all duration-300 hover:shadow-xl ${
                  isPopular 
                    ? 'border-primary shadow-lg scale-105' 
                    : 'border-border hover:border-primary/50'
                }`}
              >
                {isPopular && (
                  <Badge 
                    className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground"
                  >
                    Most Popular
                  </Badge>
                )}
                
                <CardHeader className="text-center pb-4">
                  <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
                  <CardDescription className="text-base">{plan.description}</CardDescription>
                  
                  <div className="mt-6">
                    <div className="text-4xl font-bold">
                      {getDisplayPrice(plan)}
                      <span className="text-lg font-normal text-muted-foreground">
                        {getDisplayPeriod()}
                      </span>
                    </div>
                    
                    {isAnnual && savings && parseFloat(savings.replace(/[^0-9]/g, '')) > 0 && (
                      <div className="mt-2">
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          Save ${savings}/year
                        </Badge>
                      </div>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <Button 
                    className="w-full" 
                    variant={isPopular ? "default" : "outline"}
                    onClick={onStartTrial}
                  >
                    Start Free Trial
                  </Button>
                  
                  <ul className="space-y-3">
                    {formatFeatures(plan.features).map((feature: string, index: number) => (
                      <li key={index} className="flex items-start space-x-3">
                        <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="text-center mt-12">
          <p className="text-muted-foreground">
            All plans include 14-day free trial • No setup fees • Cancel anytime
          </p>
        </div>
      </div>
    </section>
  );
};