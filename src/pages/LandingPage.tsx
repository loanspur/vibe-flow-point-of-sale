import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Index from "./Index";
import { getCurrentDomain, isSubdomain, isCustomDomain } from "@/lib/domain-manager";
import { supabase } from "@/integrations/supabase/client";

export default function LandingPage() {
  const { user, loading, tenantId } = useAuth();
  const navigate = useNavigate();

  const { isMainDevDomain, shouldRedirect, isApexShop, isApexOnline } = useMemo(() => {
    const domain = getCurrentDomain();
    const isMainDev = domain === "vibenet.online" || domain === "www.vibenet.online";
    const apexShop = domain === "vibenet.shop" || domain === "www.vibenet.shop";
    const apexOnline = domain === "vibenet.online" || domain === "www.vibenet.online";
    const redirect = !isMainDev && (isSubdomain(domain) || isCustomDomain(domain) || apexShop);
    return { isMainDevDomain: isMainDev, shouldRedirect: redirect, isApexShop: apexShop, isApexOnline: apexOnline };
  }, []);

  useEffect(() => {
    if (!loading && user) {
      const handleRedirect = async () => {
        // On apex domains, send authenticated users to their tenant's primary domain
        if (isApexShop || isApexOnline) {
          try {
            if (!tenantId) {
              window.location.href = "https://vibenet.online/dashboard";
              return;
            }
            // Try primary verified domain first
            const { data: primary } = await supabase
              .from("tenant_domains")
              .select("domain_name")
              .eq("tenant_id", tenantId)
              .eq("is_active", true)
              .eq("is_primary", true)
              .eq("status", "verified")
              .maybeSingle();

            let targetDomain = primary?.domain_name as string | undefined;

            // If none, ensure a subdomain exists and use it
            if (!targetDomain) {
              const { data: ensuredId } = await supabase.rpc("ensure_tenant_subdomain", {
                tenant_id_param: tenantId,
              });
              if (ensuredId) {
                const { data: ensured } = await supabase
                  .from("tenant_domains")
                  .select("domain_name")
                  .eq("id", ensuredId)
                  .maybeSingle();
                targetDomain = ensured?.domain_name as string | undefined;
              }
            }

            if (targetDomain && getCurrentDomain() !== targetDomain) {
              window.location.href = `https://${targetDomain}/dashboard`;
            } else {
              navigate("/dashboard");
            }
          } catch {
            window.location.href = "https://vibenet.online/dashboard";
          }
        } else if (shouldRedirect) {
          navigate('/dashboard');
        }
      };
      handleRedirect();
    }
  }, [user, loading, tenantId, navigate, shouldRedirect, isApexShop, isApexOnline]);

  // Show landing page while loading
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // On main dev domain, always show landing page even if authenticated
  if (user && !isMainDevDomain) {
    return null; // Will redirect via useEffect
  }

  return <Index />;
}