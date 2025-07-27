import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/integrations/supabase/client';
import { useOptimizedQuery } from '@/hooks/useOptimizedQuery';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart3, 
  Users, 
  DollarSign, 
  ShoppingCart,
  Package,
  TrendingUp,
  ArrowUpRight,
  Eye,
  AlertTriangle,
  Crown,
  Settings,
  Calendar,
  TrendingDown,
  Boxes,
  PiggyBank
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCurrencyUpdate } from '@/hooks/useCurrencyUpdate';
import { FloatingAIAssistant } from '@/components/FloatingAIAssistant';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Area, AreaChart, Tooltip, Legend } from "recharts";

const getTimeBasedGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
};

export default function TenantAdminDashboard() {
  const { user, tenantId } = useAuth();
  const { formatCurrency } = useApp();
  const { formatPrice } = useCurrencyUpdate();
  const [currentSubscription, setCurrentSubscription] = useState<any>(null);
  const [dateRange, setDateRange] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  // Fetch subscription data
  useEffect(() => {
    if (tenantId) {
      console.log('Fetching subscription for tenant:', tenantId);
      fetchCurrentSubscription();
    }
  }, [tenantId]);

  const fetchCurrentSubscription = async () => {
    try {
      console.log('Starting subscription fetch...');
      const { data, error } = await supabase
        .from('tenant_subscription_details')
        .select(`
          *,
          billing_plans (
            name,
            price,
            period
          )
        `)
        .eq('tenant_id', tenantId)
        .in('status', ['active', 'pending'])
        .maybeSingle();

      console.log('Subscription fetch result:', { data, error });
      if (error && error.code !== 'PGRST116') throw error;
      setCurrentSubscription(data);
    } catch (error) {
      console.error('Error fetching subscription:', error);
    }
  };

  // Fetch enhanced dashboard data with date filtering
  const { data: dashboardData, loading } = useOptimizedQuery(
    async () => {
      if (!tenantId) return { data: null, error: null };
      
      const startDate = `${dateRange.startDate}T00:00:00.000Z`;
      const endDate = `${dateRange.endDate}T23:59:59.999Z`;
      
      try {
        console.log('Fetching dashboard data for tenant:', tenantId, 'Date range:', dateRange);
        
        // Fetch all data in parallel for better performance
        const [
          salesResponse, 
          productsResponse, 
          customersResponse, 
          purchasesResponse,
          saleItemsResponse,
          allSalesResponse,
          inventoryMovementsResponse,
          purchaseItemsResponse
        ] = await Promise.all([
          // Sales data for the date range including customer_id
          supabase
            .from('sales')
            .select('total_amount, created_at, customer_id, status, payment_method, discount_amount, tax_amount')
            .eq('tenant_id', tenantId)
            .gte('created_at', startDate)
            .lte('created_at', endDate),
          
          // Products with complete stock and pricing info including variants
          supabase
            .from('products')
            .select(`
              id, 
              name,
              sku,
              stock_quantity, 
              min_stock_level, 
              price, 
              cost_price, 
              is_active,
              created_at,
              product_variants(id, stock_quantity)
            `)
            .eq('tenant_id', tenantId)
            .eq('is_active', true),
          
          // Total unique customers count
          supabase
            .from('customers')
            .select('id, created_at', { count: 'exact', head: true })
            .eq('tenant_id', tenantId),
          
          // Purchases data for the date range with complete info
          supabase
            .from('purchases')
            .select('total_amount, created_at, status, supplier_id')
            .eq('tenant_id', tenantId)
            .gte('created_at', startDate)
            .lte('created_at', endDate),
          
          // Sale items with detailed product info for accurate COGS calculation
          supabase
            .from('sale_items')
            .select(`
              quantity,
              unit_price,
              total_price,
              product_id,
              variant_id,
              products!inner(cost_price, price, name),
              sales!inner(created_at, tenant_id, total_amount)
            `)
            .eq('sales.tenant_id', tenantId)
            .gte('sales.created_at', startDate)
            .lte('sales.created_at', endDate),
          
          // All sales for customer activity analysis
          supabase
            .from('sales')
            .select('customer_id, created_at')
            .eq('tenant_id', tenantId)
            .not('customer_id', 'is', null),
          
          // Recent inventory movements for stock accuracy - using correct table structure
          supabase
            .from('purchases')
            .select(`
              total_amount,
              created_at,
              status
            `)
            .eq('tenant_id', tenantId)
            .eq('status', 'completed')
            .order('created_at', { ascending: false })
            .limit(100),
            
          // Purchase items for FIFO costing - include both completed and received purchases
          supabase
            .from('purchase_items')
            .select(`
              product_id,
              quantity_ordered,
              quantity_received,
              unit_cost,
              total_cost,
              purchases!inner(created_at, status, tenant_id)
            `)
            .eq('purchases.tenant_id', tenantId)
            .in('purchases.status', ['completed', 'received'])
        ]);

        console.log('=== DASHBOARD DATA FETCH RESULTS ===');
        console.log('Sales response:', { status: salesResponse.status, count: salesResponse.data?.length });
        console.log('Products response:', { status: productsResponse.status, count: productsResponse.data?.length });
        console.log('Customers response:', { status: customersResponse.status, count: customersResponse.count });
        console.log('Purchases response:', { status: purchasesResponse.status, count: purchasesResponse.data?.length });
        console.log('Purchase Items response:', { 
          status: purchaseItemsResponse.status, 
          count: purchaseItemsResponse.data?.length,
          items: purchaseItemsResponse.data?.map(item => ({
            product_id: item.product_id,
            qty_received: item.quantity_received,
            unit_cost: item.unit_cost,
            purchase_date: item.purchases?.created_at,
            purchase_status: item.purchases?.status
          }))
        });
        console.log('Sale items response:', saleItemsResponse);
        console.log('All sales response:', allSalesResponse);

        // Check for errors
        if (salesResponse.error) throw salesResponse.error;
        if (productsResponse.error) throw productsResponse.error;
        if (customersResponse.error) throw customersResponse.error;
        if (purchasesResponse.error) throw purchasesResponse.error;
        if (saleItemsResponse.error) throw saleItemsResponse.error;
        if (allSalesResponse.error) throw allSalesResponse.error;
        if (inventoryMovementsResponse.error) throw inventoryMovementsResponse.error;
        if (purchaseItemsResponse.error) throw purchaseItemsResponse.error;

        // Enhanced metric calculations with better accuracy
        const sales = salesResponse.data || [];
        const products = productsResponse.data || [];
        const purchases = purchasesResponse.data || [];
        const saleItems = saleItemsResponse.data || [];
        const allSales = allSalesResponse.data || [];
        const inventoryMovements = inventoryMovementsResponse.data || [];
        const purchaseItems = purchaseItemsResponse.data || [];
        
        console.log('Purchase Items Data:', {
          count: purchaseItems.length,
          items: purchaseItems.map(item => ({
            product_id: item.product_id,
            qty_ordered: item.quantity_ordered,
            qty_received: item.quantity_received,
            unit_cost: item.unit_cost,
            date: item.purchases?.created_at
          }))
        });

        // Calculate accurate revenue (only completed sales)
        const completedSales = sales.filter(sale => sale.status !== 'cancelled' && sale.status !== 'refunded');
        const revenue = completedSales.reduce((sum, sale) => sum + Number(sale.total_amount || 0), 0);
        const salesCount = completedSales.length;
        
        // Calculate total customers and active customers more accurately
        const totalCustomers = customersResponse.count || 0;
        const uniqueActiveCustomerIds = [...new Set(
          allSales
            .filter(sale => sale.customer_id)
            .map(sale => sale.customer_id)
        )];
        const activeCustomers = uniqueActiveCustomerIds.length;
        
        // Calculate accurate purchase totals (only completed purchases)
        const completedPurchases = purchases.filter(purchase => purchase.status !== 'cancelled');
        const totalPurchases = completedPurchases.reduce((sum, purchase) => sum + Number(purchase.total_amount || 0), 0);
        
        // FIFO (First In, First Out) cost calculation with proper prorata distribution
        const calculateFIFOCost = (productId: string, requiredQty: number) => {
          const productPurchases = purchaseItems
            .filter(item => item.product_id === productId)
            .sort((a, b) => new Date(a.purchases.created_at).getTime() - new Date(b.purchases.created_at).getTime());
          
          console.log(`FIFO calculation for product ${productId}:`, {
            requiredQty,
            availablePurchases: productPurchases.length,
            purchaseDetails: productPurchases.map(p => ({
              qty_received: p.quantity_received,
              unitCost: p.unit_cost,
              date: p.purchases.created_at
            }))
          });

          if (productPurchases.length === 0) {
            console.log(`No purchase history found for product ${productId}`);
            return 0;
          }
          
          let totalCost = 0;
          let remainingQty = requiredQty;
          
          // Process purchases in FIFO order (oldest first)
          for (const purchase of productPurchases) {
            if (remainingQty <= 0) break;
            
            const availableQty = purchase.quantity_received || 0;
            const unitCost = purchase.unit_cost || 0;
            
            if (availableQty > 0 && unitCost > 0) {
              // Take the minimum of what we need and what's available from this purchase
              const qtyToTake = Math.min(availableQty, remainingQty);
              const costForThisBatch = qtyToTake * unitCost;
              
              totalCost += costForThisBatch;
              remainingQty -= qtyToTake;
              
              console.log(`FIFO batch: ${qtyToTake} units @ ${unitCost} = ${costForThisBatch}`);
            }
          }
          
          // If we couldn't fulfill the entire requirement from purchase history,
          // use the most recent unit cost for the remaining quantity
          if (remainingQty > 0 && productPurchases.length > 0) {
            const lastPurchase = productPurchases[productPurchases.length - 1];
            const fallbackCost = lastPurchase.unit_cost || 0;
            const remainingCost = remainingQty * fallbackCost;
            totalCost += remainingCost;
            
            console.log(`Remaining ${remainingQty} units valued at last purchase cost: ${fallbackCost} = ${remainingCost}`);
          }
          
          console.log(`Final FIFO cost for ${productId}: ${totalCost} (${requiredQty} units)`);
          return totalCost;
        };

        // Enhanced stock value calculations using FIFO costing
        const productsWithVariants = products.map(product => {
          // Calculate total stock from main product and variants
          const mainStock = product.stock_quantity || 0;
          const variantStock = (product.product_variants || []).reduce((sum, variant) => sum + (variant.stock_quantity || 0), 0);
          const totalStock = mainStock + variantStock;
          
          // Use FIFO cost calculation for accurate cost values with proper fallbacks
          let fifoCostValue = 0;
          
          if (totalStock > 0) {
            // Try FIFO calculation first
            fifoCostValue = calculateFIFOCost(product.id, totalStock);
            
            console.log(`FIFO calculation result for ${product.name}: ${fifoCostValue} for ${totalStock} units`);
            
            // If FIFO returns 0, use fallback calculations
            if (fifoCostValue === 0) {
              // Fallback 1: Use product cost price if available and > 0
              if (product.cost_price && product.cost_price > 0) {
                fifoCostValue = totalStock * product.cost_price;
                console.log(`Using product cost price fallback for ${product.name}: ${totalStock} * ${product.cost_price} = ${fifoCostValue}`);
              } 
              // Fallback 2: Estimate from purchase amounts - but use a more conservative approach
              else if (purchases.length > 0) {
                // Use a simple estimation: if we have recent purchases, estimate cost at 70% of sale price
                const estimatedUnitCost = product.price * 0.7; // 70% of sale price
                fifoCostValue = totalStock * estimatedUnitCost;
                console.log(`Using conservative estimate for ${product.name}: ${totalStock} * ${estimatedUnitCost} = ${fifoCostValue}`);
              }
              // Fallback 3: Use 60% of sale price as minimum cost estimate
              else {
                fifoCostValue = totalStock * (product.price * 0.6);
                console.log(`Using minimum estimate for ${product.name}: ${totalStock} * ${product.price * 0.6} = ${fifoCostValue}`);
              }
            }
          }
          
          const averageUnitCost = totalStock > 0 ? fifoCostValue / totalStock : 0;
          
          // Calculate sale values
          const productSalePrice = product.price || 0;
          const totalSaleValue = totalStock * productSalePrice;
          
          // Enhanced debugging for cost calculations
          console.log(`Final calculation for ${product.name}:`, {
            totalStock,
            fifoCostValue,
            averageUnitCost,
            productCostPrice: product.cost_price,
            productSalePrice,
            totalSaleValue,
            mainStock: product.stock_quantity,
            variantStock: (product.product_variants || []).reduce((sum, v) => sum + (v.stock_quantity || 0), 0),
            variants: (product.product_variants || []).map(v => ({ id: v.id, stock: v.stock_quantity }))
          });
          
          return {
            ...product,
            totalStock,
            totalCostValue: fifoCostValue,
            totalSaleValue,
            averageUnitCost
          };
        });
        
        const productsWithStock = productsWithVariants.filter(product => product.totalStock > 0);
        const productsWithoutStock = productsWithVariants.filter(product => product.totalStock === 0);
        
        // Calculate actual inventory values using FIFO costing
        const totalInventoryAtCost = productsWithVariants.reduce((sum, product) => sum + product.totalCostValue, 0);
        const totalInventoryAtSale = productsWithVariants.reduce((sum, product) => sum + product.totalSaleValue, 0);
        
        console.log('Stock Value Calculations:', {
          totalProducts: productsWithVariants.length,
          productsWithStock: productsWithStock.length,
          totalInventoryAtCost,
          totalInventoryAtSale,
          productsWithCostDetails: productsWithVariants.map(p => ({
            name: p.name,
            stock: p.totalStock,
            costValue: p.totalCostValue,
            saleValue: p.totalSaleValue
          }))
        });
        
        // Calculate weighted average cost from recent purchases (simplified)
        const totalRecentPurchases = inventoryMovements.reduce((sum, purchase) => sum + (purchase.total_amount || 0), 0);
        const avgPurchaseCost = inventoryMovements.length > 0 ? totalRecentPurchases / inventoryMovements.length : 0;
        
        // Calculate accurate COGS using multiple methods for validation
        const cogsByActualCost = saleItems.reduce((sum, item) => {
          const costPrice = item.products?.cost_price || 0;
          const quantity = item.quantity || 0;
          return sum + (quantity * costPrice);
        }, 0);
        
        const cogsByWeightedAvg = saleItems.reduce((sum, item) => {
          const quantity = item.quantity || 0;
          const itemCost = item.products?.cost_price || avgPurchaseCost || (item.unit_price * 0.7);
          return sum + (quantity * itemCost);
        }, 0);
        
        // Use the more accurate COGS calculation
        const cogs = cogsByActualCost > 0 ? cogsByActualCost : cogsByWeightedAvg;
        const grossProfit = revenue - cogs;
        const profitMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
        
        // Enhanced product analysis
        const profitableProducts = products.filter(product => {
          const price = product.price || 0;
          const cost = product.cost_price || 0;
          return price > cost && cost > 0;
        }).length;
        
        const lowStockProducts = products.filter(product => {
          const currentStock = product.stock_quantity || 0;
          const minStock = product.min_stock_level || 0;
          return currentStock <= minStock && minStock > 0;
        });
        
        const outOfStockProducts = products.filter(product => (product.stock_quantity || 0) === 0);
        
        // Calculate potential stock value (what we could have if fully stocked)
        const potentialStockValue = products.reduce((sum, product) => {
          const minStock = Math.max(product.min_stock_level || 0, 10); // Assume minimum 10 units
          const price = product.price || 0;
          return sum + (minStock * price);
        }, 0);

        const result = {
          revenue,
          salesCount,
          totalCustomers,
          activeCustomers,
          totalPurchases,
          stockByPurchasePrice: totalInventoryAtCost,
          stockBySalePrice: totalInventoryAtSale,
          potentialStockValue,
          profit: grossProfit,
          profitMargin,
          cogs,
          avgPurchaseCost,
          lowStockCount: lowStockProducts.length,
          outOfStockCount: outOfStockProducts.length,
          totalProducts: products.length,
          productsWithStock: productsWithStock.length,
          profitableProducts,
          // Additional metrics for drill-down accuracy
          completedSalesCount: salesCount,
          completedPurchasesCount: completedPurchases.length,
          uniqueCustomerIds: uniqueActiveCustomerIds,
          totalSaleItems: saleItems.length,
          avgSaleValue: salesCount > 0 ? revenue / salesCount : 0,
          inventoryTurnover: totalInventoryAtCost > 0 ? cogs / totalInventoryAtCost : 0
        };

        console.log('=== FINAL CARD VALUES ===');
        console.log('📊 Stock Value (Purchase):', totalInventoryAtCost);
        console.log('📊 Stock Value (Sale):', totalInventoryAtSale);
        console.log('📊 Total Revenue:', revenue);
        console.log('📊 Total Customers:', totalCustomers);
        console.log('📊 Products with detailed calculation:', productsWithVariants.map(p => ({
          name: p.name,
          stock: p.totalStock,
          costValue: p.totalCostValue,
          saleValue: p.totalSaleValue,
          avgUnitCost: p.averageUnitCost
        })));
        console.log('🎯 Final dashboard data being returned:', result);

        return {
          data: result,
          error: null
        };
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        return {
          data: {
            revenue: 0,
            salesCount: 0,
            totalCustomers: 0,
            activeCustomers: 0,
            totalPurchases: 0,
            stockByPurchasePrice: 0,
            stockBySalePrice: 0,
            potentialStockValue: 0,
            profit: 0,
            profitMargin: 0,
            cogs: 0,
            avgPurchaseCost: 0,
            lowStockCount: 0,
            outOfStockCount: 0,
            totalProducts: 0,
            productsWithStock: 0,
            profitableProducts: 0,
            completedSalesCount: 0,
            completedPurchasesCount: 0,
            uniqueCustomerIds: [],
            totalSaleItems: 0,
            avgSaleValue: 0,
            inventoryTurnover: 0
          },
          error: error
        };
      }
    },
    [tenantId, dateRange.startDate, dateRange.endDate],
    {
      enabled: !!tenantId,
      staleTime: 30 * 1000, // 30 seconds cache for more real-time accuracy
      cacheKey: `enhanced-dashboard-v2-${tenantId}-${dateRange.startDate}-${dateRange.endDate}`
    }
  );

  const businessStats = [
    {
      title: "Revenue",
      value: formatCurrency(dashboardData?.revenue || 0),
      change: dashboardData?.revenue ? `${dashboardData.salesCount} sales` : "No sales",
      changeType: dashboardData?.revenue ? "positive" : "neutral",
      icon: DollarSign,
      description: "selected period",
      trend: [0, 0, 0, dashboardData?.revenue || 0]
    },
    {
      title: "Total Purchases",
      value: formatCurrency(dashboardData?.totalPurchases || 0),
      change: dashboardData?.totalPurchases ? "purchases made" : "No purchases",
      changeType: dashboardData?.totalPurchases ? "neutral" : "neutral", 
      icon: ShoppingCart,
      description: "selected period",
      trend: [0, 0, 0, dashboardData?.totalPurchases || 0]
    },
    {
      title: "Stock Value (Purchase)",
      value: formatCurrency(dashboardData?.stockByPurchasePrice || 0),
      change: dashboardData?.outOfStockCount > 0 
        ? `${dashboardData.outOfStockCount} out of stock` 
        : dashboardData?.lowStockCount > 0 
        ? `${dashboardData.lowStockCount} low stock` 
        : `${dashboardData?.productsWithStock || 0} in stock`,
      changeType: dashboardData?.outOfStockCount > 0 
        ? "warning" 
        : dashboardData?.lowStockCount > 0 
        ? "warning" 
        : "positive",
      icon: Boxes,
      description: "at cost price",
      trend: [0, 0, 0, dashboardData?.stockByPurchasePrice || 0]
    },
    {
      title: "Stock Value (Sale)",
      value: formatCurrency(dashboardData?.stockBySalePrice || 0),
      change: dashboardData?.stockBySalePrice > 0 
        ? "potential revenue" 
        : "no stock value",
      changeType: dashboardData?.stockBySalePrice > 0 ? "positive" : "warning",
      icon: TrendingUp,
      description: "at selling price",
      trend: [0, 0, 0, dashboardData?.stockBySalePrice || 0]
    },
    {
      title: "Profit",
      value: formatCurrency(dashboardData?.profit || 0),
      change: dashboardData?.profitMargin 
        ? `${dashboardData.profitMargin.toFixed(1)}% margin` 
        : dashboardData?.profit && dashboardData.profit > 0 
        ? "profitable" 
        : dashboardData?.profit && dashboardData.profit < 0 
        ? "loss" 
        : "break even",
      changeType: dashboardData?.profit && dashboardData.profit > 0 ? "positive" : dashboardData?.profit && dashboardData.profit < 0 ? "warning" : "neutral",
      icon: dashboardData?.profit && dashboardData.profit < 0 ? TrendingDown : PiggyBank,
      description: "gross profit",
      trend: [0, 0, 0, Math.abs(dashboardData?.profit || 0)]
    },
    {
      title: "Active Customers",
      value: (dashboardData?.activeCustomers || 0).toString(),
      change: dashboardData?.totalCustomers 
        ? `${Math.round((dashboardData.activeCustomers / dashboardData.totalCustomers) * 100)}% of total` 
        : "no customers",
      changeType: dashboardData?.activeCustomers ? "positive" : "neutral",
      icon: Users,
      description: "unique buyers",
      trend: [0, 0, 0, dashboardData?.activeCustomers || 0]
    },
    {
      title: "Profitable Products",
      value: (dashboardData?.profitableProducts || 0).toString(),
      change: dashboardData?.profitableProducts ? "with positive margin" : "no profitable items",
      changeType: dashboardData?.profitableProducts ? "positive" : "warning",
      icon: TrendingUp,
      description: "in catalog",
      trend: [0, 0, 0, dashboardData?.profitableProducts || 0]
    }
  ];

  const quickActions = [
    {
      title: "New Sale",
      description: "Process a transaction",
      icon: ShoppingCart,
      href: "/pos",
      color: "bg-gradient-to-br from-green-50 to-emerald-50 border-green-200",
      iconColor: "text-green-600",
      primary: true
    },
    {
      title: "Add Product", 
      description: "Expand your inventory",
      icon: Package,
      href: "/admin/products",
      color: "bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200",
      iconColor: "text-blue-600"
    },
    {
      title: "View Reports",
      description: "Business analytics",
      icon: BarChart3,
      href: "/admin/reports",
      color: "bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200",
      iconColor: "text-purple-600"
    },
    {
      title: "Manage Team",
      description: "Staff & permissions",
      icon: Users,
      href: "/admin/team",
      color: "bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200",
      iconColor: "text-orange-600"
    }
  ];

  // Generate real activity based on actual data
  const recentActivity = [];
  
  if (dashboardData?.revenue && dashboardData.revenue > 0) {
    recentActivity.push({
      id: "#PERIOD",
      type: "sales_summary",
      customer: "Period Sales",
      amount: formatCurrency(dashboardData.revenue),
      time: "Selected Period",
      status: "completed",
      description: `${dashboardData.salesCount} sale(s) completed`
    });
  } else {
    recentActivity.push({
      id: "#NONE",
      type: "info",
      customer: "No Sales",
      amount: formatCurrency(0),
      time: "Selected Period",
      status: "info",
      description: "No transactions recorded for selected period"
    });
  }

  const alerts = [];
  
  if (dashboardData?.lowStockCount && dashboardData.lowStockCount > 0) {
    alerts.push({
      type: "warning",
      message: `${dashboardData.lowStockCount} products are running low on stock`,
      action: "View inventory",
      time: "Now"
    });
  }

  if (!dashboardData?.revenue || dashboardData.revenue === 0) {
    alerts.push({
      type: "info", 
      message: "No sales recorded for selected period - consider promoting your products",
      action: "View promotions",
      time: "Now"
    });
  }

  // Chart colors
  const chartColors = {
    primary: "hsl(var(--primary))",
    secondary: "hsl(var(--secondary))",
    muted: "hsl(var(--muted-foreground))",
    success: "#10b981",
    warning: "#f59e0b",
    danger: "#ef4444",
    info: "#3b82f6"
  };

  // Prepare chart data
  const revenueChartData = [
    { name: 'Previous Period', revenue: 0, sales: 0 },
    { name: 'Current Period', revenue: dashboardData?.revenue || 0, sales: dashboardData?.salesCount || 0 }
  ];

  const stockChartData = [
    { name: 'Cost Value', value: dashboardData?.stockByPurchasePrice || 0, fill: chartColors.info },
    { name: 'Sale Value', value: dashboardData?.stockBySalePrice || 0, fill: chartColors.success },
    { name: 'Potential Value', value: dashboardData?.potentialStockValue || 0, fill: chartColors.warning }
  ];

  const performanceChartData = [
    { metric: 'Revenue', value: dashboardData?.revenue || 0, target: (dashboardData?.potentialStockValue || 0) * 0.3 },
    { metric: 'Profit', value: dashboardData?.profit || 0, target: (dashboardData?.revenue || 0) * 0.2 },
    { metric: 'Stock Value', value: dashboardData?.stockBySalePrice || 0, target: dashboardData?.potentialStockValue || 0 },
    { metric: 'Customers', value: dashboardData?.activeCustomers || 0, target: Math.max((dashboardData?.totalCustomers || 0) * 0.5, 10) }
  ];

  const profitabilityData = [
    { name: 'Profitable', value: dashboardData?.profitableProducts || 0, fill: chartColors.success },
    { name: 'Break Even', value: Math.max(0, (dashboardData?.totalProducts || 0) - (dashboardData?.profitableProducts || 0) - (dashboardData?.outOfStockCount || 0)), fill: chartColors.warning },
    { name: 'Out of Stock', value: dashboardData?.outOfStockCount || 0, fill: chartColors.danger }
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Welcome Section */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          {getTimeBasedGreeting()}, {user?.user_metadata?.full_name || user?.email?.split('@')[0]}!
        </h1>
        <p className="text-muted-foreground">
          Here's what's happening with your business.
        </p>
      </div>

      {/* Date Filter Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Date Range Filter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                type="date"
                id="startDate"
                value={dateRange.startDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                type="date"
                id="endDate"
                value={dateRange.endDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                className="w-full"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button 
              variant={dateRange.startDate === new Date().toISOString().split('T')[0] && 
                       dateRange.endDate === new Date().toISOString().split('T')[0] ? "default" : "outline"}
              size="sm"
              onClick={() => setDateRange({
                startDate: new Date().toISOString().split('T')[0],
                endDate: new Date().toISOString().split('T')[0]
              })}
            >
              Today
            </Button>
            <Button 
              variant={(() => {
                const today = new Date();
                const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
                return dateRange.startDate === lastWeek.toISOString().split('T')[0] && 
                       dateRange.endDate === today.toISOString().split('T')[0] ? "default" : "outline";
              })()}
              size="sm"
              onClick={() => {
                const today = new Date();
                const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
                setDateRange({
                  startDate: lastWeek.toISOString().split('T')[0],
                  endDate: today.toISOString().split('T')[0]
                });
              }}
            >
              Last 7 Days
            </Button>
            <Button 
              variant={(() => {
                const today = new Date();
                const lastMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
                return dateRange.startDate === lastMonth.toISOString().split('T')[0] && 
                       dateRange.endDate === today.toISOString().split('T')[0] ? "default" : "outline";
              })()}
              size="sm"
              onClick={() => {
                const today = new Date();
                const lastMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
                setDateRange({
                  startDate: lastMonth.toISOString().split('T')[0],
                  endDate: today.toISOString().split('T')[0]
                });
              }}
            >
              Last 30 Days
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Billing Plan Display */}
      {currentSubscription ? (
        <Card className="mb-6 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Crown className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-blue-900">
                    {currentSubscription.billing_plans?.name} Plan
                  </p>
                  <p className="text-sm text-blue-600">
                    {currentSubscription.status === 'pending' ? (
                      <>Payment pending</>
                    ) : currentSubscription.trial_end && new Date(currentSubscription.trial_end) > new Date() ? (
                      <>Trial expires {new Date(currentSubscription.trial_end).toLocaleDateString()}</>
                    ) : currentSubscription.trial_end ? (
                      <>Trial expired - Payment required</>
                    ) : (
                      <>Active subscription</>
                    )}
                  </p>
                   {currentSubscription.next_billing_date && (
                     <p className="text-xs text-blue-500 mt-1">
                       Next billing: {(() => {
                         const nextBillingDate = new Date(currentSubscription.next_billing_date);
                         // Ensure billing is always on the 1st of the month
                         nextBillingDate.setDate(1);
                         return nextBillingDate.toLocaleDateString();
                       })()}
                     </p>
                   )}
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <p className="text-2xl font-bold text-blue-900">
                    {formatPrice(currentSubscription.billing_plans?.price || 0)}
                  </p>
                  <p className="text-sm text-blue-600">per {currentSubscription.billing_plans?.period}</p>
                </div>
                <Link to="/admin/settings?tab=billing">
                  <Button variant="outline" size="sm" className="border-blue-200 text-blue-700 hover:bg-blue-100">
                    <Settings className="h-4 w-4 mr-2" />
                    Manage Plan
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="mb-6 border-orange-200 bg-gradient-to-r from-orange-50 to-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="font-semibold text-orange-900">
                    No Active Subscription
                  </p>
                  <p className="text-sm text-orange-600">
                    Choose a plan to unlock all features
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Link to="/admin/settings?tab=billing">
                  <Button className="bg-orange-600 hover:bg-orange-700 text-white">
                    <Crown className="h-4 w-4 mr-2" />
                    Choose Plan
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

        {/* Alerts Bar */}
        {alerts.length > 0 && (
          <div className="mb-6 space-y-2">
            {alerts.map((alert, index) => (
              <div key={index} className={`flex items-center justify-between rounded-lg p-3 ${
                alert.type === 'warning' ? 'bg-orange-50 border border-orange-200' : 'bg-blue-50 border border-blue-200'
              }`}>
                <div className="flex items-center gap-2">
                  <AlertTriangle className={`h-4 w-4 ${
                    alert.type === 'warning' ? 'text-orange-600' : 'text-blue-600'
                  }`} />
                  <span className={`text-sm font-medium ${
                    alert.type === 'warning' ? 'text-orange-900' : 'text-blue-900'
                  }`}>{alert.message}</span>
                  <span className={`text-xs ${
                    alert.type === 'warning' ? 'text-orange-600' : 'text-blue-600'
                  }`}>• {alert.time}</span>
                </div>
                <Button variant="ghost" size="sm" className={`${
                  alert.type === 'warning' ? 'text-orange-700 hover:text-orange-900' : 'text-blue-700 hover:text-blue-900'
                }`}>
                  {alert.action}
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Dashboard Tabs */}
        <Tabs defaultValue="metrics" className="mb-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="metrics">Business Metrics</TabsTrigger>
            <TabsTrigger value="trends">Chart Trends</TabsTrigger>
          </TabsList>
          
          <TabsContent value="metrics" className="mt-6">
            {/* Enhanced Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {businessStats.map((stat, index) => {
                const Icon = stat.icon;
                const isPositive = stat.changeType === 'positive';
                const isWarning = stat.changeType === 'warning';
                const isNeutral = stat.changeType === 'neutral';
                
                const getNavigationPath = (title: string) => {
                  const params = new URLSearchParams({
                    startDate: dateRange.startDate,
                    endDate: dateRange.endDate,
                    tenantId: tenantId || ''
                  });
                  
                  switch (title) {
                    case 'Revenue':
                    case 'Profit':
                      return `/admin/reports?${params}&tab=financial`;
                    case 'Active Customers':
                      return `/admin/customers?${params}&filter=active`;
                    case 'Stock Value (Purchase)':
                    case 'Stock Value (Sale)':
                      return `/admin/products?${params}&tab=inventory`;
                    case 'Total Purchases':
                      return `/admin/purchases?${params}&status=completed`;
                    case 'Profitable Products':
                      return `/admin/products?${params}&filter=profitable`;
                    default:
                      return '/admin';
                  }
                };
                
                return (
                  <Link key={index} to={getNavigationPath(stat.title)}>
                    <Card className="relative overflow-hidden hover:shadow-lg transition-all duration-200 hover:-translate-y-1 cursor-pointer">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          {stat.title}
                        </CardTitle>
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          isWarning ? 'bg-orange-100' : isPositive ? 'bg-green-100' : 'bg-gray-100'
                        }`}>
                          <Icon className={`h-4 w-4 ${
                            isWarning ? 'text-orange-600' : isPositive ? 'text-green-600' : 'text-gray-600'
                          }`} />
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold mb-1">{stat.value}</div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            {isPositive && <ArrowUpRight className="h-3 w-3 text-green-600" />}
                            {isWarning && <AlertTriangle className="h-3 w-3 text-orange-600" />}
                            <span className={`text-xs font-medium ${
                              isWarning ? 'text-orange-600' : isPositive ? 'text-green-600' : 'text-muted-foreground'
                            }`}>
                              {stat.change}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground">{stat.description}</span>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </TabsContent>
          
          <TabsContent value="trends" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Revenue & Sales Performance Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Revenue & Sales Performance</CardTitle>
                  <CardDescription>Revenue vs target performance</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={performanceChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke={chartColors.muted} />
                        <XAxis dataKey="metric" fontSize={12} />
                        <YAxis fontSize={12} />
                        <Tooltip 
                          formatter={(value, name) => [formatCurrency(Number(value)), name === 'value' ? 'Actual' : 'Target']}
                          labelStyle={{ color: 'hsl(var(--foreground))' }}
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--background))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '6px'
                          }}
                        />
                        <Legend />
                        <Bar dataKey="value" fill={chartColors.primary} name="Actual" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="target" fill={chartColors.muted} name="Target" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              
              {/* Stock Value Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>Stock Value Breakdown</CardTitle>
                  <CardDescription>Cost vs Sale vs Potential values</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={stockChartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {stockChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value) => [formatCurrency(Number(value)), 'Value']}
                          labelStyle={{ color: 'hsl(var(--foreground))' }}
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--background))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '6px'
                          }}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              
              {/* Product Profitability Analysis */}
              <Card>
                <CardHeader>
                  <CardTitle>Product Profitability</CardTitle>
                  <CardDescription>Distribution of profitable vs out-of-stock products</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={profitabilityData}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {profitabilityData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value) => [value, 'Products']}
                          labelStyle={{ color: 'hsl(var(--foreground))' }}
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--background))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '6px'
                          }}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              
              {/* Business Metrics Trend */}
              <Card>
                <CardHeader>
                  <CardTitle>Business Overview</CardTitle>
                  <CardDescription>Key performance indicators</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={revenueChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke={chartColors.muted} />
                        <XAxis dataKey="name" fontSize={12} />
                        <YAxis fontSize={12} />
                        <Tooltip 
                          formatter={(value, name) => [
                            name === 'revenue' ? formatCurrency(Number(value)) : value,
                            name === 'revenue' ? 'Revenue' : 'Sales Count'
                          ]}
                          labelStyle={{ color: 'hsl(var(--foreground))' }}
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--background))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '6px'
                          }}
                        />
                        <Legend />
                        <Area
                          type="monotone"
                          dataKey="revenue"
                          stackId="1"
                          stroke={chartColors.success}
                          fill={chartColors.success}
                          fillOpacity={0.6}
                          name="Revenue"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Quick Actions Grid */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Quick Actions</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <Link key={index} to={action.href}>
                  <Card className={`${action.color} hover:shadow-lg transition-all duration-200 hover:-translate-y-1 cursor-pointer group ${action.primary ? 'ring-2 ring-green-200' : ''}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className={`w-10 h-10 rounded-lg ${action.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                          <Icon className={`h-5 w-5 ${action.iconColor}`} />
                        </div>
                        {action.primary && (
                          <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">
                            Primary
                          </Badge>
                        )}
                      </div>
                      <CardTitle className="text-base font-semibold">{action.title}</CardTitle>
                      <CardDescription className="text-sm">{action.description}</CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Activity and Performance */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <Card className="overflow-hidden">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Latest business transactions</CardDescription>
                </div>
                <Button variant="ghost" size="sm">
                  <Eye className="h-4 w-4 mr-2" />
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {recentActivity.map((activity, index) => (
                  <div key={index} className="p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-2 h-2 rounded-full ${
                          activity.status === 'completed' ? 'bg-green-500' : 
                          activity.status === 'refunded' ? 'bg-red-500' : 'bg-blue-500'
                        }`} />
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm">{activity.id}</p>
                            <Badge variant="outline" className="text-xs">
                              {activity.type}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{activity.customer}</p>
                          <p className="text-xs text-muted-foreground">{activity.description}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-medium ${activity.amount.startsWith('-') ? 'text-red-600' : 'text-green-600'}`}>
                          {activity.amount}
                        </p>
                        <p className="text-xs text-muted-foreground">{activity.time}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Performance Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Period Performance</CardTitle>
              <CardDescription>Sales summary and key metrics for selected period</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                  <div>
                    <p className="text-sm text-green-700 font-medium">Total Revenue</p>
                    <p className="text-2xl font-bold text-green-900">{formatCurrency(dashboardData?.revenue || 0)}</p>
                  </div>
                  <div className="text-right">
                    <TrendingUp className="h-6 w-6 text-green-600 mb-1" />
                    <Badge className="bg-green-100 text-green-700">Period</Badge>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Sales Count</span>
                    <span className="font-semibold">{dashboardData?.salesCount || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Average Sale Value</span>
                    <span className="font-semibold">{formatCurrency(dashboardData?.revenue && dashboardData?.salesCount ? dashboardData.revenue / dashboardData.salesCount : 0)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total Profit</span>
                    <span className={`font-semibold ${dashboardData?.profit && dashboardData.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(dashboardData?.profit || 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Products in Catalog</span>
                    <span className="font-semibold">{dashboardData?.totalProducts || 0}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

      {/* Floating AI Assistant */}
      <FloatingAIAssistant />
    </div>
  );
}