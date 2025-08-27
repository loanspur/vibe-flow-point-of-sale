import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Index from "./Index";
import { getCurrentDomain, isSubdomain, isCustomDomain } from "@/lib/domain-manager";
import { supabase } from "@/integrations/supabase/client";

export default function LandingPage() {
  const { user, loading, tenantId, userRole } = useAuth();
  const navigate = useNavigate();
  const [redirecting, setRedirecting] = useState(false);

  const { isMainDevDomain, shouldRedirect, isApexShop, isApexOnline } = useMemo(() => {
    const domain = getCurrentDomain();
    const isMainDev = domain === "vibenet.online" || domain === "www.vibenet.online" || domain === "localhost";
    const apexShop = domain === "vibenet.shop" || domain === "www.vibenet.shop";
    // isApexOnline should NOT include vibenet.online as it's the main dev domain
    const apexOnline = false; // No apex online domains currently
    const redirect = !isMainDev && (isSubdomain(domain) || isCustomDomain(domain) || apexShop);
    return { isMainDevDomain: isMainDev, shouldRedirect: redirect, isApexShop: apexShop, isApexOnline: apexOnline };
  }, []);

  // Prevent infinite redirects by tracking if redirect has been attempted
  const [redirectAttempted, setRedirectAttempted] = useState(false);

  useEffect(() => {
    // Only redirect once per user session
    if (!loading && user && !redirectAttempted) {
      setRedirectAttempted(true);
      
      const handleRedirect = async () => {
        // On apex domains, send authenticated users to their tenant's primary domain
        if (isApexShop || isApexOnline) {
          setRedirecting(true);
          console.info('LandingPage: apex redirect start', { domain: getCurrentDomain(), tenantId, userRole });
          try {
            // Superadmins should stay on apex and go to SuperAdmin
            if (userRole === 'superadmin') {
              console.info('LandingPage: superadmin on apex, routing to /superadmin');
              navigate('/superadmin');
              return;
            }

            if (!tenantId) {
              console.warn('LandingPage: missing tenantId, falling back to vibenet.online');
              window.location.href = "https://vibenet.online/dashboard";
              return;
            }
            // Try primary verified domain first
            const { data: primary, error: primaryError } = await supabase
              .from("tenant_domains")
              .select("domain_name")
              .eq("tenant_id", tenantId)
              .eq("is_active", true)
              .eq("is_primary", true)
              .eq("status", "verified")
              .maybeSingle();
            if (primaryError) console.warn('LandingPage: primary domain query error', primaryError);

            let targetDomain = primary?.domain_name as string | undefined;

            // If none, ensure a subdomain exists and use it
            if (!targetDomain) {
              const { data: ensuredId, error: ensureErr } = await supabase.rpc("ensure_tenant_subdomain", {
                tenant_id_param: tenantId,
              });
              if (ensureErr) console.warn('LandingPage: ensure subdomain error', ensureErr);
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
              console.info('LandingPage: redirecting to tenant domain', targetDomain);
              window.location.href = `https://${targetDomain}/dashboard`;
            } else {
              console.info('LandingPage: navigating to /dashboard on current domain');
              navigate("/dashboard");
            }
          } catch (e) {
            console.error('LandingPage: apex redirect failed, falling back', e);
            window.location.href = "https://vibenet.online/dashboard";
          }
        } else if (shouldRedirect) {
          setRedirecting(true);
          console.info('LandingPage: internal redirect to /dashboard');
          navigate('/dashboard');
        }
      };
      handleRedirect();
    }
  }, [user, loading]); // Reduced dependencies to prevent loops

  // Show landing page while loading
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show redirect loader if needed
  if (redirecting) {
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