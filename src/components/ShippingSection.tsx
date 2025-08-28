import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Truck, Package, MapPin, DollarSign } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ShippingAgent {
  id: string;
  name: string;
  shipping_fee: number;
  shipping_zones: string[];
  phone: string;
  email: string;
  address: string;
}

interface ShippingSectionProps {
  shippingAgentId: string | null;
  shippingFee: number;
  shippingAddress: string;
  shippingIncludedInTotal: boolean;
  onShippingChange: (data: {
    agentId: string | null;
    fee: number;
    address: string;
    includedInTotal: boolean;
  }) => void;
}

export function ShippingSection({
  shippingAgentId,
  shippingFee,
  shippingAddress,
  shippingIncludedInTotal,
  onShippingChange
}: ShippingSectionProps) {
  const { tenantId } = useAuth();
  const { toast } = useToast();
  const { formatCurrency } = useApp();
  
  const [shippingAgents, setShippingAgents] = useState<ShippingAgent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<ShippingAgent | null>(null);
  const [isShippingEnabled, setIsShippingEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchShippingAgents();
  }, [tenantId]);

  useEffect(() => {
    if (shippingAgentId) {
      const agent = shippingAgents.find(a => a.id === shippingAgentId);
      setSelectedAgent(agent || null);
      setIsShippingEnabled(true);
    }
  }, [shippingAgentId, shippingAgents]);

  const fetchShippingAgents = async () => {
    if (!tenantId) return;
    
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('type', 'shipping_agent')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;

      if (data) {
        setShippingAgents(data);
      }
    } catch (error) {
      console.error('Error fetching shipping agents:', error);
      toast({
        title: "Error",
        description: "Failed to load shipping agents",
        variant: "destructive",
      });
    }
  };

  const handleShippingToggle = (enabled: boolean) => {
    setIsShippingEnabled(enabled);
    if (!enabled) {
      // Reset shipping data when disabled
      onShippingChange({
        agentId: null,
        fee: 0,
        address: '',
        includedInTotal: true
      });
      setSelectedAgent(null);
    }
  };

  const handleAgentChange = (agentId: string) => {
    const agent = shippingAgents.find(a => a.id === agentId);
    setSelectedAgent(agent || null);
    
    if (agent) {
      onShippingChange({
        agentId: agent.id,
        fee: agent.shipping_fee || 0,
        address: shippingAddress,
        includedInTotal: shippingIncludedInTotal
      });
    }
  };

  const handleFeeChange = (fee: number) => {
    onShippingChange({
      agentId: selectedAgent?.id || null,
      fee: fee,
      address: shippingAddress,
      includedInTotal: shippingIncludedInTotal
    });
  };

  const handleAddressChange = (address: string) => {
    onShippingChange({
      agentId: selectedAgent?.id || null,
      fee: shippingFee,
      address: address,
      includedInTotal: shippingIncludedInTotal
    });
  };

  const handleIncludedInTotalChange = (included: boolean) => {
    onShippingChange({
      agentId: selectedAgent?.id || null,
      fee: shippingFee,
      address: shippingAddress,
      includedInTotal: included
    });
  };

  const getAgentZones = (zones: string[]) => {
    if (!zones || zones.length === 0) return 'All zones';
    return zones.join(', ');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Truck className="h-5 w-5" />
          Shipping Options
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Enable/Disable Shipping */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            <Label htmlFor="shipping-enabled">Enable Shipping</Label>
          </div>
          <Switch
            id="shipping-enabled"
            checked={isShippingEnabled}
            onCheckedChange={handleShippingToggle}
          />
        </div>

        {isShippingEnabled && (
          <>
            <Separator />

            {/* Shipping Agent Selection */}
            <div>
              <Label htmlFor="shipping-agent">Shipping Agent</Label>
              <Select 
                value={selectedAgent?.id || ''} 
                onValueChange={handleAgentChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select shipping agent" />
                </SelectTrigger>
                <SelectContent>
                  {shippingAgents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{agent.name}</span>
                        <span className="text-sm text-muted-foreground">
                          {formatCurrency(agent.shipping_fee || 0)} • {getAgentZones(agent.shipping_zones || [])}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {shippingAgents.length === 0 && (
                <p className="text-sm text-muted-foreground mt-2">
                  No shipping agents available. Add shipping agents in Contacts Management.
                </p>
              )}
            </div>

            {/* Selected Agent Details */}
            {selectedAgent && (
              <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">{selectedAgent.name}</h4>
                  <Badge variant="outline">
                    <DollarSign className="h-3 w-3 mr-1" />
                    {formatCurrency(selectedAgent.shipping_fee || 0)}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Phone:</span>
                    <p>{selectedAgent.phone || 'Not provided'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Email:</span>
                    <p>{selectedAgent.email || 'Not provided'}</p>
                  </div>
                </div>
                
                {selectedAgent.address && (
                  <div>
                    <span className="text-muted-foreground">Address:</span>
                    <p>{selectedAgent.address}</p>
                  </div>
                )}
                
                {selectedAgent.shipping_zones && selectedAgent.shipping_zones.length > 0 && (
                  <div>
                    <span className="text-muted-foreground">Service Zones:</span>
                    <p>{getAgentZones(selectedAgent.shipping_zones)}</p>
                  </div>
                )}
              </div>
            )}

            {/* Shipping Fee */}
            <div>
              <Label htmlFor="shipping-fee">
                Shipping Fee ({formatCurrency(0).replace('0.00', '')})
              </Label>
              <Input
                id="shipping-fee"
                type="number"
                step="0.01"
                min="0"
                value={shippingFee || ''}
                onChange={(e) => handleFeeChange(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
              />
              {selectedAgent && selectedAgent.shipping_fee && (
                <p className="text-sm text-muted-foreground mt-1">
                  Default fee: {formatCurrency(selectedAgent.shipping_fee)}
                </p>
              )}
            </div>

            {/* Shipping Address */}
            <div>
              <Label htmlFor="shipping-address">
                <MapPin className="h-4 w-4 inline mr-1" />
                Shipping Address
              </Label>
              <Textarea
                id="shipping-address"
                value={shippingAddress}
                onChange={(e) => handleAddressChange(e.target.value)}
                placeholder="Enter shipping address"
                rows={3}
              />
            </div>

            {/* Include in Total Payment */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                <Label htmlFor="include-in-total">Include shipping fee in total payment</Label>
              </div>
              <Switch
                id="include-in-total"
                checked={shippingIncludedInTotal}
                onCheckedChange={handleIncludedInTotalChange}
              />
            </div>

            {!shippingIncludedInTotal && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> Shipping fee will be paid directly to the shipping agent.
                  Customer will pay {formatCurrency(shippingFee)} separately to {selectedAgent?.name}.
                </p>
              </div>
            )}

            {/* Shipping Summary */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Shipping Summary</h4>
              <div className="space-y-1 text-sm text-blue-800">
                <div className="flex justify-between">
                  <span>Agent:</span>
                  <span>{selectedAgent?.name || 'Not selected'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Fee:</span>
                  <span>{formatCurrency(shippingFee)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Payment Method:</span>
                  <span>{shippingIncludedInTotal ? 'Included in sale' : 'Direct to agent'}</span>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
