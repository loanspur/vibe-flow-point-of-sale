import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Index from "./Index";
import { getCurrentDomain, isSubdomain, isCustomDomain } from "@/lib/domain-manager";

export default function LandingPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const { isMainDevDomain, shouldRedirect } = useMemo(() => {
    const domain = getCurrentDomain();
    const isMainDev = domain === "vibenet.online" || domain === "www.vibenet.online";
    const redirect = !isMainDev && (isSubdomain(domain) || isCustomDomain(domain) || domain === "vibenet.shop" || domain === "www.vibenet.shop");
    return { isMainDevDomain: isMainDev, shouldRedirect: redirect };
  }, []);

  useEffect(() => {
    // Redirect authenticated users to dashboard, except on main dev domain
    if (!loading && user && shouldRedirect) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate, shouldRedirect]);

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