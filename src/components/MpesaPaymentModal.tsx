import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Smartphone, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  RefreshCw,
  X
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface MpesaPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  reference: string;
  description?: string;
  onSuccess: (transactionId: string) => void;
  onError: (error: string) => void;
}

interface PaymentStatus {
  status: 'pending' | 'success' | 'failed' | 'timeout';
  message: string;
  transactionId?: string;
  mpesaReceiptNumber?: string;
}

export function MpesaPaymentModal({
  isOpen,
  onClose,
  amount,
  reference,
  description = "Payment",
  onSuccess,
  onError
}: MpesaPaymentModalProps) {
  const { tenantId } = useAuth();
  const { toast } = useToast();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null);
  const [timeLeft, setTimeLeft] = useState(60); // 60 seconds timeout
  const [checkoutRequestId, setCheckoutRequestId] = useState<string | null>(null);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setPhoneNumber("");
      setIsProcessing(false);
      setPaymentStatus(null);
      setTimeLeft(60);
      setCheckoutRequestId(null);
    }
  }, [isOpen]);

  // Countdown timer
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (isProcessing && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleTimeout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isProcessing, timeLeft]);

  // Poll payment status
  useEffect(() => {
    let pollInterval: NodeJS.Timeout | null = null;
    
    if (checkoutRequestId && isProcessing) {
      pollInterval = setInterval(async () => {
        await checkPaymentStatus();
      }, 3000); // Check every 3 seconds
    }

    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [checkoutRequestId, isProcessing]);

  const formatPhoneNumber = (phone: string) => {
    // Remove any non-digit characters
    const cleaned = phone.replace(/\D/g, '');
    
    // Handle Kenyan phone numbers
    if (cleaned.startsWith('0')) {
      return '254' + cleaned.substring(1);
    } else if (cleaned.startsWith('254')) {
      return cleaned;
    } else if (cleaned.length === 9) {
      return '254' + cleaned;
    }
    
    return cleaned;
  };

  const initiateSTKPush = async () => {
    if (!phoneNumber || !tenantId) return;

    const formattedPhone = formatPhoneNumber(phoneNumber);
    
    if (formattedPhone.length !== 12 || !formattedPhone.startsWith('254')) {
      toast({
        title: "Invalid Phone Number",
        description: "Please enter a valid Kenyan phone number (e.g., 0712345678)",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setPaymentStatus({ status: 'pending', message: 'Initiating payment...' });

    try {
      const { data, error } = await supabase.functions.invoke('mpesa-stk-push', {
        body: {
          tenant_id: tenantId,
          phone_number: formattedPhone,
          amount: amount,
          reference: reference,
          description: description,
        }
      });

      if (error) throw error;

      if (data.success) {
        setCheckoutRequestId(data.checkout_request_id);
        setPaymentStatus({
          status: 'pending',
          message: 'Payment request sent to your phone. Please enter your M-Pesa PIN to complete the transaction.'
        });
        setTimeLeft(60); // Reset timer
      } else {
        throw new Error(data.message || 'Failed to initiate payment');
      }
    } catch (error: any) {
      console.error('STK Push failed:', error);
      setIsProcessing(false);
      setPaymentStatus({
        status: 'failed',
        message: error.message || 'Failed to send payment request'
      });
      
      onError(error.message || 'Failed to initiate payment');
    }
  };

  const checkPaymentStatus = async () => {
    if (!checkoutRequestId || !tenantId) return;

    try {
      const { data, error } = await supabase.functions.invoke('mpesa-payment-status', {
        body: {
          tenant_id: tenantId,
          checkout_request_id: checkoutRequestId,
        }
      });

      if (error) throw error;

      if (data.status === 'success') {
        setIsProcessing(false);
        setPaymentStatus({
          status: 'success',
          message: 'Payment completed successfully!',
          transactionId: data.transaction_id,
          mpesaReceiptNumber: data.mpesa_receipt_number
        });

        // Wait a moment to show success message, then close
        setTimeout(() => {
          onSuccess(data.transaction_id);
          onClose();
        }, 2000);

      } else if (data.status === 'failed') {
        setIsProcessing(false);
        setPaymentStatus({
          status: 'failed',
          message: data.message || 'Payment failed'
        });
        onError(data.message || 'Payment failed');
      }
      // If status is still pending, continue polling
    } catch (error: any) {
      console.error('Error checking payment status:', error);
    }
  };

  const handleTimeout = () => {
    setIsProcessing(false);
    setPaymentStatus({
      status: 'timeout',
      message: 'Payment request timed out. Please try again.'
    });
    onError('Payment request timed out');
  };

  const handleRetry = () => {
    setPaymentStatus(null);
    setCheckoutRequestId(null);
    setTimeLeft(60);
  };

  const handleCancel = () => {
    setIsProcessing(false);
    onClose();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-green-600" />
            M-Pesa Payment
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Payment Details */}
          <Card>
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Amount:</span>
                  <span className="font-medium">KES {amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Reference:</span>
                  <span className="font-medium">{reference}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Description:</span>
                  <span className="font-medium">{description}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {!isProcessing && !paymentStatus && (
            <>
              {/* Phone Number Input */}
              <div className="space-y-2">
                <Label htmlFor="phone">M-Pesa Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="0712345678 or 254712345678"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="text-center"
                />
                <p className="text-xs text-muted-foreground text-center">
                  Enter your Safaricom M-Pesa number
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  onClick={initiateSTKPush}
                  className="flex-1"
                  disabled={!phoneNumber.trim()}
                >
                  <Smartphone className="h-4 w-4 mr-2" />
                  Send Payment Request
                </Button>
                <Button variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
              </div>
            </>
          )}

          {/* Payment Status */}
          {paymentStatus && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {paymentStatus.status === 'pending' && (
                    <Clock className="h-5 w-5 text-blue-500 mt-0.5" />
                  )}
                  {paymentStatus.status === 'success' && (
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                  )}
                  {(paymentStatus.status === 'failed' || paymentStatus.status === 'timeout') && (
                    <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                  )}
                  
                  <div className="flex-1">
                    <Badge 
                      variant={
                        paymentStatus.status === 'success' ? 'default' :
                        paymentStatus.status === 'pending' ? 'secondary' : 'destructive'
                      }
                      className="mb-2"
                    >
                      {paymentStatus.status.toUpperCase()}
                    </Badge>
                    
                    <p className="text-sm">{paymentStatus.message}</p>
                    
                    {paymentStatus.mpesaReceiptNumber && (
                      <p className="text-xs text-muted-foreground mt-2">
                        M-Pesa Receipt: {paymentStatus.mpesaReceiptNumber}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Processing State */}
          {isProcessing && (
            <>
              <div className="text-center space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Waiting for payment...</span>
                </div>
                
                <div className="text-lg font-mono">
                  {formatTime(timeLeft)}
                </div>
                
                <p className="text-xs text-muted-foreground">
                  Complete the payment on your phone
                </p>
              </div>

              <Button
                variant="outline"
                onClick={handleCancel}
                className="w-full"
              >
                <X className="h-4 w-4 mr-2" />
                Cancel Payment
              </Button>
            </>
          )}

          {/* Retry Option */}
          {(paymentStatus?.status === 'failed' || paymentStatus?.status === 'timeout') && (
            <div className="flex gap-2">
              <Button onClick={handleRetry} className="flex-1">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}