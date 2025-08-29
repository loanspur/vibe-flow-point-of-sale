import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface SubdomainFeature {
  name: string;
  description: string;
  availableOn: string[];
  badge?: string;
}

const SUBDOMAIN_FEATURES: SubdomainFeature[] = [
  {
    name: 'AI Features',
    description: 'Advanced AI-powered analytics, automation, and insights',
    availableOn: ['traction-energies', 'localhost'],
    badge: 'AI'
  },
  {
    name: 'Advanced Analytics',
    description: 'Enhanced reporting and business intelligence tools',
    availableOn: ['traction-energies', 'localhost'],
    badge: 'Pro'
  },
  {
    name: 'Bulk Operations',
    description: 'Mass import/export and bulk update capabilities',
    availableOn: ['traction-energies', 'localhost'],
    badge: 'Pro'
  },
  {
    name: 'Real-time Notifications',
    description: 'Instant alerts and push notifications',
    availableOn: ['traction-energies', 'localhost'],
    badge: 'Pro'
  }
];

export function useSubdomainFeatures() {
  const [currentSubdomain, setCurrentSubdomain] = useState<string>('');
  const [availableFeatures, setAvailableFeatures] = useState<SubdomainFeature[]>([]);
  const [unavailableFeatures, setUnavailableFeatures] = useState<SubdomainFeature[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    // Detect current subdomain
    const hostname = window.location.hostname;
    let subdomain = '';
    
    if (hostname.includes('localhost')) {
      subdomain = 'localhost';
    } else if (hostname.includes('traction-energies')) {
      subdomain = 'traction-energies';
    } else {
      // Extract subdomain from hostname
      const parts = hostname.split('.');
      if (parts.length > 2) {
        subdomain = parts[0];
      }
    }
    
    setCurrentSubdomain(subdomain);
    
    // Determine available and unavailable features
    const available = SUBDOMAIN_FEATURES.filter(feature => 
      feature.availableOn.includes(subdomain)
    );
    const unavailable = SUBDOMAIN_FEATURES.filter(feature => 
      !feature.availableOn.includes(subdomain)
    );
    
    setAvailableFeatures(available);
    setUnavailableFeatures(unavailable);
  }, []);

  const showFeatureAlert = (feature: SubdomainFeature) => {
    toast({
      title: `${feature.name} Available`,
      description: feature.description,
      variant: "default",
    });
  };

  const showUpgradeAlert = () => {
    if (unavailableFeatures.length > 0) {
      toast({
        title: "Upgrade Available",
        description: `${unavailableFeatures.length} premium features available on traction-energies subdomain. Contact support to upgrade.`,
        variant: "default",
      });
    }
  };

  return {
    currentSubdomain,
    availableFeatures,
    unavailableFeatures,
    showFeatureAlert,
    showUpgradeAlert,
    isTestTenant: currentSubdomain === 'traction-energies' || currentSubdomain === 'localhost'
  };
}
