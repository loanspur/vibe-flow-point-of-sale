import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { X, Cookie, Shield, Settings } from 'lucide-react';
import { useLocalStorage } from '@/hooks/useLocalStorage';

interface CookieConsentProps {
  onAccept?: () => void;
  onDecline?: () => void;
}

const CookieConsent: React.FC<CookieConsentProps> = ({ onAccept, onDecline }) => {
  const [cookieConsent, setCookieConsent] = useLocalStorage('cookie-consent', null);
  const [isVisible, setIsVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Show banner if no consent has been given
    if (cookieConsent === null) {
      // Small delay to ensure smooth page load
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [cookieConsent]);

  const handleAccept = () => {
    setCookieConsent('accepted');
    setIsVisible(false);
    onAccept?.();
  };

  const handleDecline = () => {
    setCookieConsent('declined');
    setIsVisible(false);
    onDecline?.();
  };

  const handleClose = () => {
    // Treat close as acceptance for better UX
    handleAccept();
  };

  if (!isVisible || cookieConsent !== null) {
    return null;
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20 z-40 backdrop-blur-sm" />
      
      {/* Cookie Banner */}
      <div className="fixed bottom-4 left-4 right-4 md:left-6 md:right-6 lg:left-auto lg:right-6 lg:max-w-md z-50 animate-in slide-in-from-bottom-5 duration-500">
        <Card className="border-2 shadow-2xl bg-card/95 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Cookie className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-lg">Cookie Notice</h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 hover:bg-muted"
                onClick={handleClose}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4">
              <p className="text-sm text-muted-foreground leading-relaxed">
                We use cookies to enhance your browsing experience, provide personalized content, 
                and analyze our traffic. By clicking "Accept All", you consent to our use of cookies.
              </p>

              {showDetails && (
                <div className="bg-muted/50 p-4 rounded-lg space-y-3 text-sm">
                  <div className="flex items-start space-x-2">
                    <Shield className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Essential Cookies</p>
                      <p className="text-muted-foreground text-xs">
                        Required for basic site functionality and security.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-2">
                    <Settings className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Functional Cookies</p>
                      <p className="text-muted-foreground text-xs">
                        Remember your preferences and provide enhanced features.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2">
                <Button 
                  onClick={handleAccept} 
                  className="flex-1 text-sm"
                  size="sm"
                >
                  Accept All
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleDecline}
                  className="flex-1 text-sm"
                  size="sm"
                >
                  Decline
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setShowDetails(!showDetails)}
                  className="text-sm"
                  size="sm"
                >
                  {showDetails ? 'Hide' : 'Details'}
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                Learn more in our{' '}
                <a 
                  href="/privacy" 
                  className="text-primary hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Privacy Policy
                </a>
                {' '}and{' '}
                <a 
                  href="/terms" 
                  className="text-primary hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Terms of Service
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default CookieConsent;