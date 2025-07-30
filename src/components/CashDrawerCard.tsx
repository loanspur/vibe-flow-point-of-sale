import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  PiggyBank, 
  Building2, 
  User, 
  MapPin, 
  ArrowUpRight,
  Clock,
  DollarSign
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrencyUpdate } from '@/hooks/useCurrencyUpdate';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Link } from 'react-router-dom';

interface CashDrawerData {
  id: string;
  drawer_name: string;
  current_balance: number;
  status: string; // Changed from strict union to string
  location_name: string | null;
  user_id: string;
  opened_at: string | null;
  closed_at: string | null;
  profiles?: {
    full_name: string;
  } | null;
}

interface CashDrawerCardProps {
  dateRange: {
    startDate: string;
    endDate: string;
  };
}

export function CashDrawerCard({ dateRange }: CashDrawerCardProps) {
  const { tenantId } = useAuth();
  const { formatAmount } = useCurrencyUpdate();
  const [cashDrawers, setCashDrawers] = useState<CashDrawerData[]>([]);
  const [bankTransfers, setBankTransfers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (tenantId) {
      fetchCashDrawerData();
    }
  }, [tenantId, dateRange]);

  const fetchCashDrawerData = async () => {
    try {
      setLoading(true);
      
      // Fetch cash drawers without foreign key join
      const { data: drawersData, error: drawersError } = await supabase
        .from('cash_drawers')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true);

      if (drawersError) throw drawersError;

      // Fetch bank transfer requests for the date range
      const startDate = `${dateRange.startDate}T00:00:00.000Z`;
      const endDate = `${dateRange.endDate}T23:59:59.999Z`;
      
      const { data: transfersData, error: transfersError } = await supabase
        .from('cash_bank_transfer_requests')
        .select('*')
        .eq('tenant_id', tenantId)
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .eq('status', 'approved');

      if (transfersError) throw transfersError;

      setCashDrawers((drawersData as any) || []);
      setBankTransfers(transfersData || []);
    } catch (error) {
      console.error('Error fetching cash drawer data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate totals
  const totalUnbankedCash = cashDrawers.reduce((sum, drawer) => sum + drawer.current_balance, 0);
  const totalBankedCash = bankTransfers.reduce((sum, transfer) => sum + transfer.amount, 0);
  const openDrawersCount = cashDrawers.filter(drawer => drawer.status === 'open').length;
  const totalDrawersCount = cashDrawers.length;

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardHeader className="space-y-0 pb-2">
          <div className="h-4 bg-muted rounded w-3/4"></div>
        </CardHeader>
        <CardContent>
          <div className="h-8 bg-muted rounded w-1/2 mb-2"></div>
          <div className="h-3 bg-muted rounded w-full"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card 
        className="cursor-pointer hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200"
        onClick={() => setShowDetails(true)}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-green-800">Cash Management</CardTitle>
          <PiggyBank className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <div className="text-2xl font-bold text-green-900">
                {formatAmount(totalUnbankedCash)}
              </div>
              <p className="text-xs text-green-700">Unbanked Cash</p>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Building2 className="h-3 w-3 text-green-600" />
                <span className="text-xs text-green-700">Banked</span>
              </div>
              <span className="text-sm font-semibold text-green-800">
                {formatAmount(totalBankedCash)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Badge 
                variant="outline" 
                className="text-xs border-green-300 text-green-700"
              >
                {openDrawersCount}/{totalDrawersCount} Open
              </Badge>
              <ArrowUpRight className="h-3 w-3 text-green-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cash Drawer Details Modal */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PiggyBank className="h-5 w-5 text-green-600" />
              Cash Drawer Management
            </DialogTitle>
            <DialogDescription>
              Overview of all cash drawers and bank transfers for the selected period
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <PiggyBank className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-800">Total Unbanked</span>
                  </div>
                  <div className="text-xl font-bold text-green-900 mt-1">
                    {formatAmount(totalUnbankedCash)}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">Total Banked</span>
                  </div>
                  <div className="text-xl font-bold text-blue-900 mt-1">
                    {formatAmount(totalBankedCash)}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-purple-600" />
                    <span className="text-sm font-medium text-purple-800">Total Cash</span>
                  </div>
                  <div className="text-xl font-bold text-purple-900 mt-1">
                    {formatAmount(totalUnbankedCash + totalBankedCash)}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Cash Drawers List */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Cash Drawers by Location & User</h3>
              <div className="space-y-3">
                {cashDrawers.map((drawer) => (
                  <Card key={drawer.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${
                            drawer.status === 'open' ? 'bg-green-500' : 
                            drawer.status === 'closed' ? 'bg-gray-400' : 'bg-yellow-500'
                          }`} />
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">{drawer.drawer_name}</h4>
                              <Badge 
                                variant={drawer.status === 'open' ? 'default' : 'secondary'}
                                className="text-xs"
                              >
                                {drawer.status}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                              {drawer.location_name && (
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {drawer.location_name}
                                </div>
                              )}
                               <div className="flex items-center gap-1">
                                 <User className="h-3 w-3" />
                                 User ID: {drawer.user_id.slice(0, 8)}...
                               </div>
                              {drawer.status === 'open' && drawer.opened_at && (
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  Opened {new Date(drawer.opened_at).toLocaleTimeString()}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold">
                            {formatAmount(drawer.current_balance)}
                          </div>
                          <div className="text-xs text-muted-foreground">Current Balance</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {cashDrawers.length === 0 && (
                  <Card className="border-dashed">
                    <CardContent className="p-8 text-center">
                      <PiggyBank className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-muted-foreground mb-2">
                        No Cash Drawers Found
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Set up cash drawers to manage your cash transactions
                      </p>
                      <Link to="/admin/settings">
                        <Button variant="outline">
                          Setup Cash Drawers
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>

            {/* Bank Transfers */}
            {bankTransfers.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4">Bank Transfers (Period)</h3>
                <div className="space-y-2">
                  {bankTransfers.map((transfer) => (
                    <div key={transfer.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-blue-600" />
                        <div>
                          <div className="font-medium text-blue-900">{transfer.bank_account_name}</div>
                          <div className="text-xs text-blue-600">
                            {new Date(transfer.created_at).toLocaleDateString()} • {transfer.reference_number || 'No reference'}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-blue-900">{formatAmount(transfer.amount)}</div>
                        <div className="text-xs text-blue-600">Banked</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}