import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTransferRequests, TransferRequest } from '@/hooks/useTransferRequests';
import { 
  ArrowRightLeft, 
  Wallet, 
  CreditCard, 
  CheckCircle, 
  XCircle, 
  Clock,
  Ban,
  Building2,
  AlertCircle
} from 'lucide-react';

interface EnhancedTransferRequestsProps {
  formatAmount: (amount: number) => string;
}

export function EnhancedTransferRequests({ formatAmount }: EnhancedTransferRequestsProps) {
  const {
    transferRequests,
    loading,
    respondToTransferRequest,
    cancelTransferRequest,
    pendingRequests,
    requestsForMe
  } = useTransferRequests();

  const getTransferTypeIcon = (type: string) => {
    switch (type) {
      case 'cash_drawer':
        return <Wallet className="h-4 w-4" />;
      case 'payment_method':
        return <Building2 className="h-4 w-4" />;
      default:
        return <ArrowRightLeft className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-warning/10 text-warning-foreground border-warning/20';
      case 'approved':
        return 'bg-info/10 text-info-foreground border-info/20';
      case 'completed':
        return 'bg-success/10 text-success-foreground border-success/20';
      case 'rejected':
        return 'bg-destructive/10 text-destructive-foreground border-destructive/20';
      case 'cancelled':
        return 'bg-muted text-muted-foreground border-muted';
      default:
        return 'bg-muted text-muted-foreground border-muted';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-3 w-3" />;
      case 'approved':
        return <AlertCircle className="h-3 w-3" />;
      case 'completed':
        return <CheckCircle className="h-3 w-3" />;
      case 'rejected':
        return <XCircle className="h-3 w-3" />;
      case 'cancelled':
        return <Ban className="h-3 w-3" />;
      default:
        return <Clock className="h-3 w-3" />;
    }
  };

  const formatTransferType = (type: string) => {
    switch (type) {
      case 'cash_drawer':
        return 'To Cash Drawer';
      case 'payment_method':
        return 'To Bank/Card';
      default:
        return 'Transfer';
    }
  };

  const handleApprove = async (requestId: string) => {
    try {
      await respondToTransferRequest(requestId, 'approved');
    } catch (error) {
      console.error('Failed to approve request:', error);
    }
  };

  const handleReject = async (requestId: string) => {
    try {
      await respondToTransferRequest(requestId, 'rejected');
    } catch (error) {
      console.error('Failed to reject request:', error);
    }
  };

  const handleCancel = async (requestId: string) => {
    try {
      await cancelTransferRequest(requestId);
    } catch (error) {
      console.error('Failed to cancel request:', error);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">Loading transfer requests...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowRightLeft className="h-5 w-5" />
          Enhanced Transfer Requests
        </CardTitle>
        <CardDescription>
          Track and approve cash transfers to other drawers or bank/card accounts
        </CardDescription>
      </CardHeader>
      <CardContent>
        {transferRequests.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">
            No transfer requests found
          </p>
        ) : (
          <div className="space-y-4">
            {requestsForMe.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-muted-foreground">
                  Requests awaiting your approval ({requestsForMe.length})
                </h4>
                {requestsForMe.map((request) => (
                  <TransferRequestCard
                    key={request.id}
                    request={request}
                    formatAmount={formatAmount}
                    getTransferTypeIcon={getTransferTypeIcon}
                    getStatusColor={getStatusColor}
                    getStatusIcon={getStatusIcon}
                    formatTransferType={formatTransferType}
                    showApprovalActions
                    onApprove={handleApprove}
                    onReject={handleReject}
                  />
                ))}
              </div>
            )}
            
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-muted-foreground">
                All Transfer Requests ({transferRequests.length})
              </h4>
              {transferRequests.map((request) => (
                <TransferRequestCard
                  key={request.id}
                  request={request}
                  formatAmount={formatAmount}
                  getTransferTypeIcon={getTransferTypeIcon}
                  getStatusColor={getStatusColor}
                  getStatusIcon={getStatusIcon}
                  formatTransferType={formatTransferType}
                  showCancelAction={request.status === 'pending'}
                  onCancel={handleCancel}
                />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface TransferRequestCardProps {
  request: TransferRequest;
  formatAmount: (amount: number) => string;
  getTransferTypeIcon: (type: string) => React.ReactNode;
  getStatusColor: (status: string) => string;
  getStatusIcon: (status: string) => React.ReactNode;
  formatTransferType: (type: string) => string;
  showApprovalActions?: boolean;
  showCancelAction?: boolean;
  onApprove?: (requestId: string) => void;
  onReject?: (requestId: string) => void;
  onCancel?: (requestId: string) => void;
}

function TransferRequestCard({
  request,
  formatAmount,
  getTransferTypeIcon,
  getStatusColor,
  getStatusIcon,
  formatTransferType,
  showApprovalActions = false,
  showCancelAction = false,
  onApprove,
  onReject,
  onCancel
}: TransferRequestCardProps) {
  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {getTransferTypeIcon(request.transfer_type)}
          <div>
            <p className="font-medium">
              {formatAmount(request.amount)} - {formatTransferType(request.transfer_type)}
            </p>
            <p className="text-sm text-muted-foreground">
              {request.reason || 'No reason provided'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={getStatusColor(request.status)}>
            {getStatusIcon(request.status)}
            <span className="ml-1 capitalize">{request.status}</span>
          </Badge>
          {request.reference_number && (
            <Badge variant="secondary" className="text-xs">
              {request.reference_number}
            </Badge>
          )}
        </div>
      </div>
      
      {request.notes && (
        <div className="text-sm text-muted-foreground bg-muted p-2 rounded">
          <strong>Notes:</strong> {request.notes}
        </div>
      )}
      
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Requested: {new Date(request.requested_at).toLocaleDateString()}
        </span>
        {request.responded_at && (
          <span>
            Responded: {new Date(request.responded_at).toLocaleDateString()}
          </span>
        )}
      </div>
      
      {showApprovalActions && (
        <div className="flex gap-2 pt-2">
          <Button
            size="sm"
            onClick={() => onApprove?.(request.id)}
            className="bg-green-600 hover:bg-green-700"
          >
            <CheckCircle className="h-4 w-4 mr-1" />
            Approve
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onReject?.(request.id)}
          >
            <XCircle className="h-4 w-4 mr-1" />
            Reject
          </Button>
        </div>
      )}
      
      {showCancelAction && (
        <div className="flex gap-2 pt-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onCancel?.(request.id)}
          >
            <Ban className="h-4 w-4 mr-1" />
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}