import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTransferRequests } from '@/hooks/useTransferRequests';
import { Bell, Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

interface TransferStatusTrackerProps {
  formatAmount: (amount: number) => string;
}

export function TransferStatusTracker({ formatAmount }: TransferStatusTrackerProps) {
  const { requestsForMe, pendingRequests, transferRequests } = useTransferRequests();
  const [notifications, setNotifications] = useState<string[]>([]);

  // Track status changes and show notifications
  useEffect(() => {
    const newNotifications: string[] = [];
    
    if (requestsForMe.length > 0) {
      newNotifications.push(`You have ${requestsForMe.length} transfer request(s) awaiting approval`);
    }
    
    const recentlyCompleted = transferRequests.filter(
      r => r.status === 'completed' && 
      new Date(r.completed_at || '').getTime() > Date.now() - 24 * 60 * 60 * 1000 // Last 24 hours
    );
    
    if (recentlyCompleted.length > 0) {
      newNotifications.push(`${recentlyCompleted.length} transfer(s) completed in the last 24 hours`);
    }
    
    setNotifications(newNotifications);
  }, [requestsForMe, transferRequests]);

  const getStatusStats = () => {
    const stats = {
      pending: transferRequests.filter(r => r.status === 'pending').length,
      approved: transferRequests.filter(r => r.status === 'approved').length,
      completed: transferRequests.filter(r => r.status === 'completed').length,
      rejected: transferRequests.filter(r => r.status === 'rejected').length,
      cancelled: transferRequests.filter(r => r.status === 'cancelled').length
    };
    
    return stats;
  };

  const stats = getStatusStats();

  return (
    <div className="space-y-4">
      {/* Notifications */}
      {notifications.length > 0 && (
        <Card className="border-l-4 border-l-yellow-500">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Bell className="h-4 w-4" />
              Transfer Notifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {notifications.map((notification, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  <span>{notification}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Transfer Status Overview
          </CardTitle>
          <CardDescription>
            Track the status of all transfer requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center p-3 bg-yellow-50 rounded-lg">
              <div className="flex items-center justify-center mb-2">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
              <div className="text-sm text-yellow-700">Pending</div>
            </div>
            
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-center mb-2">
                <CheckCircle className="h-6 w-6 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-blue-600">{stats.approved}</div>
              <div className="text-sm text-blue-700">Approved</div>
            </div>
            
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="flex items-center justify-center mb-2">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
              <div className="text-sm text-green-700">Completed</div>
            </div>
            
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <div className="flex items-center justify-center mb-2">
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
              <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
              <div className="text-sm text-red-700">Rejected</div>
            </div>
            
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-center mb-2">
                <XCircle className="h-6 w-6 text-gray-600" />
              </div>
              <div className="text-2xl font-bold text-gray-600">{stats.cancelled}</div>
              <div className="text-sm text-gray-700">Cancelled</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transfer Activity</CardTitle>
          <CardDescription>
            Latest transfer request updates
          </CardDescription>
        </CardHeader>
        <CardContent>
          {transferRequests.slice(0, 5).map((request) => (
            <div key={request.id} className="flex items-center justify-between py-2 border-b last:border-0">
              <div className="flex items-center gap-3">
                <Badge className={
                  request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  request.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                  request.status === 'completed' ? 'bg-green-100 text-green-800' :
                  request.status === 'rejected' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }>
                  {request.status}
                </Badge>
                <div>
                  <p className="font-medium">{formatAmount(request.amount)}</p>
                  <p className="text-sm text-muted-foreground">
                    {request.transfer_type.replace('_', ' ')}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">
                  {new Date(request.requested_at).toLocaleDateString()}
                </p>
                {request.responded_at && (
                  <p className="text-xs text-muted-foreground">
                    Responded: {new Date(request.responded_at).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          ))}
          
          {transferRequests.length === 0 && (
            <p className="text-center text-muted-foreground py-4">
              No transfer requests found
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}