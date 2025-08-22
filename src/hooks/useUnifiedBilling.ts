import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { unifiedBillingService, SubscriptionData, PaymentData, BillingPlan, EffectivePricing } from '@/lib/unified-billing-service';
import { useToast } from '@/hooks/use-toast';

export const useUnifiedBilling = () => {
  const { tenantId } = useAuth();
  const { toast } = useToast();
  
  // State
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<PaymentData[]>([]);
  const [billingPlans, setBillingPlans] = useState<BillingPlan[]>([]);
  const [effectivePricing, setEffectivePricing] = useState<EffectivePricing | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);

  // Fetch all billing data
  const fetchBillingData = useCallback(async () => {
    if (!tenantId) return;

    try {
      setLoading(true);
      
      // Fetch data in parallel
      const [subscriptionData, paymentData, plansData] = await Promise.all([
        unifiedBillingService.getCurrentSubscription(tenantId),
        unifiedBillingService.getPaymentHistory(tenantId),
        unifiedBillingService.getBillingPlans()
      ]);

      setSubscription(subscriptionData);
      setPaymentHistory(paymentData);
      setBillingPlans(plansData);

      // Fetch effective pricing if subscription exists
      if (subscriptionData?.billing_plan_id) {
        const pricing = await unifiedBillingService.getEffectivePricing(tenantId, subscriptionData.billing_plan_id);
        setEffectivePricing(pricing);
      }
    } catch (error) {
      console.error('Error fetching billing data:', error);
      toast({
        title: "Error",
        description: "Failed to load billing information",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [tenantId, toast]);

  // Sync subscription status
  const syncSubscriptionStatus = useCallback(async () => {
    if (!tenantId) return false;
    
    try {
      const success = await unifiedBillingService.syncSubscriptionStatus(tenantId);
      if (success) {
        await fetchBillingData(); // Refresh data after sync
        toast({
          title: "Subscription Synced",
          description: "Subscription status has been updated"
        });
      }
      return success;
    } catch (error) {
      console.error('Error syncing subscription:', error);
      toast({
        title: "Error",
        description: "Failed to sync subscription status",
        variant: "destructive"
      });
      return false;
    }
  }, [tenantId, fetchBillingData, toast]);

  // Handle upgrade
  const handleUpgrade = useCallback(async (planId: string) => {
    if (!tenantId) {
      toast({
        title: "Error",
        description: "Please ensure you're logged in",
        variant: "destructive"
      });
      return;
    }

    setUpgrading(planId);
    
    try {
      const result = await unifiedBillingService.initiateCheckout(planId, tenantId);
      
      if (result.error) {
        throw new Error(result.error);
      }

      if (result.authorization_url) {
        // Open in new tab
        const newTab = window.open(result.authorization_url, '_blank', 'noopener,noreferrer');
        
        if (!newTab || newTab.closed) {
          // Popup blocked, redirect in current tab
          toast({
            title: "Redirecting to Payment",
            description: "Redirecting to payment page...",
            duration: 2000
          });
          setTimeout(() => {
            window.location.href = result.authorization_url!;
          }, 1000);
        } else {
          toast({
            title: "Payment Window Opened",
            description: "Complete your payment in the new tab to upgrade your plan"
          });
        }
      }
    } catch (error: any) {
      console.error('Upgrade error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to initiate upgrade",
        variant: "destructive"
      });
    } finally {
      setUpgrading(null);
    }
  }, [tenantId, toast]);

  // Verify payment
  const verifyPayment = useCallback(async (reference: string) => {
    try {
      // Use existing verify payment edge function
      const success = await unifiedBillingService.updatePaymentStatus(reference, 'completed');

      if (!success) {
        throw new Error('Payment verification failed');
      }

      toast({
        title: "Payment Verified!",
        description: "Your subscription has been activated successfully"
      });
      
      await fetchBillingData(); // Refresh data
      return true;
    } catch (error: any) {
      console.error('Payment verification error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to verify payment",
        variant: "destructive"
      });
      return false;
    }
  }, [fetchBillingData, toast]);

  // Get subscription access info
  const getSubscriptionAccess = useCallback(() => {
    return unifiedBillingService.checkSubscriptionAccess(subscription);
  }, [subscription]);

  // Get feature access
  const getFeatureAccess = useCallback(() => {
    return unifiedBillingService.getFeatureAccess(subscription);
  }, [subscription]);

  // Check if user has specific feature
  const hasFeature = useCallback((featureName: string): boolean => {
    const features = getFeatureAccess();
    const feature = features[featureName];
    return typeof feature === 'boolean' ? feature : false;
  }, [getFeatureAccess]);

  // Get feature limit
  const getFeatureLimit = useCallback((featureName: string): number => {
    const features = getFeatureAccess();
    const feature = features[featureName];
    return typeof feature === 'number' ? feature : 0;
  }, [getFeatureAccess]);

  // Load data on mount and tenant change
  useEffect(() => {
    if (tenantId) {
      fetchBillingData();
    }
  }, [tenantId, fetchBillingData]);

  return {
    // Data
    subscription,
    paymentHistory,
    billingPlans,
    effectivePricing,
    loading,
    upgrading,
    
    // Actions
    fetchBillingData,
    syncSubscriptionStatus,
    handleUpgrade,
    verifyPayment,
    
    // Computed values
    subscriptionAccess: getSubscriptionAccess(),
    featureAccess: getFeatureAccess(),
    hasFeature,
    getFeatureLimit,
  };
};