import { useState } from 'react';
import { AlertTriangle, Crown, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Link } from 'react-router-dom';

interface FeatureRestrictionProps {
  featureName: string;
  upgradeMessage: string;
  children?: React.ReactNode;
  showUpgradeDialog?: boolean;
  className?: string;
}

export const FeatureRestriction = ({ 
  featureName, 
  upgradeMessage, 
  children, 
  showUpgradeDialog = true,
  className = ""
}: FeatureRestrictionProps) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!showUpgradeDialog) {
    return (
      <div className={`relative ${className}`}>
        <div className="opacity-50 pointer-events-none">
          {children}
        </div>
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-lg">
          <div className="text-center p-4">
            <Crown className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm font-medium text-muted-foreground">Premium Feature</p>
            <p className="text-xs text-muted-foreground mt-1">Upgrade required</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <div className={`relative cursor-pointer ${className}`}>
          <div className="opacity-50 pointer-events-none">
            {children}
          </div>
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 hover:bg-background/90 transition-colors rounded-lg">
            <div className="text-center p-4">
              <Crown className="h-8 w-8 mx-auto mb-2 text-orange-500" />
              <p className="text-sm font-medium">Premium Feature</p>
              <Badge variant="outline" className="mt-2 bg-orange-50 text-orange-700 border-orange-200">
                Click to upgrade
              </Badge>
            </div>
          </div>
        </div>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
              <Crown className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <DialogTitle>Premium Feature Required</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                Unlock advanced capabilities
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        
        <Card className="border-orange-200 bg-gradient-to-r from-orange-50 to-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-orange-900 mb-2">
                  Feature: {featureName}
                </p>
                <p className="text-sm text-orange-800">
                  {upgradeMessage}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <div className="flex gap-3 pt-4">
          <Button 
            variant="outline" 
            onClick={() => setIsOpen(false)}
            className="flex-1"
          >
            Cancel
          </Button>
          <Link to="/admin/settings?tab=billing" className="flex-1">
            <Button 
              className="w-full bg-orange-600 hover:bg-orange-700 text-white"
              onClick={() => setIsOpen(false)}
            >
              <Crown className="h-4 w-4 mr-2" />
              Upgrade Plan
              <ExternalLink className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
};

interface RestrictedSettingProps {
  settingName: string;
  upgradeMessage: string;
  children: React.ReactNode;
  isRestricted: boolean;
}

export const RestrictedSetting = ({ 
  settingName, 
  upgradeMessage, 
  children, 
  isRestricted 
}: RestrictedSettingProps) => {
  if (!isRestricted) {
    return <>{children}</>;
  }

  return (
    <FeatureRestriction
      featureName={settingName}
      upgradeMessage={upgradeMessage}
      showUpgradeDialog={true}
    >
      {children}
    </FeatureRestriction>
  );
};