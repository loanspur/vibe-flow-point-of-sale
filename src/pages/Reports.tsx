import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BarChart3, Download, TrendingUp, DollarSign, ShoppingCart, Users } from "lucide-react";
import { Link } from "react-router-dom";

const Reports = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/dashboard" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Link>
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-600 to-violet-600 flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Reports</h1>
                <p className="text-muted-foreground">Business analytics and insights</p>
              </div>
            </div>
          </div>
          <Button>
            <Download className="h-4 w-4 mr-2" />
            Export Data
          </Button>
        </div>

        {/* Key Metrics */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">$45,231</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-green-600">+20.1%</span> from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">1,234</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-green-600">+15.3%</span> from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Customers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">567</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-green-600">+8.2%</span> from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg. Order Value</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">$36.65</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-green-600">+4.5%</span> from last month
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Report Categories */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                Sales Reports
              </CardTitle>
              <CardDescription>
                Daily, weekly, and monthly sales analytics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Today's Sales: <span className="font-semibold">$1,234</span></p>
                <p className="text-sm text-muted-foreground">This Week: <span className="font-semibold">$8,456</span></p>
                <p className="text-sm text-muted-foreground">This Month: <span className="font-semibold">$32,145</span></p>
              </div>
              <Button variant="outline" className="w-full mt-4">View Details</Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                Product Performance
              </CardTitle>
              <CardDescription>
                Best and worst performing products
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Top Seller: <span className="font-semibold">Espresso</span></p>
                <p className="text-sm text-muted-foreground">Low Stock: <span className="font-semibold">3 items</span></p>
                <p className="text-sm text-muted-foreground">Categories: <span className="font-semibold">8 active</span></p>
              </div>
              <Button variant="outline" className="w-full mt-4">View Details</Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-purple-600" />
                Customer Analytics
              </CardTitle>
              <CardDescription>
                Customer behavior and insights
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">New Customers: <span className="font-semibold">42</span></p>
                <p className="text-sm text-muted-foreground">Returning: <span className="font-semibold">78%</span></p>
                <p className="text-sm text-muted-foreground">Avg. Visits: <span className="font-semibold">2.3/month</span></p>
              </div>
              <Button variant="outline" className="w-full mt-4">View Details</Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-orange-600" />
                Financial Reports
              </CardTitle>
              <CardDescription>
                Profit, loss, and financial summaries
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Gross Profit: <span className="font-semibold">$28,450</span></p>
                <p className="text-sm text-muted-foreground">Expenses: <span className="font-semibold">$12,330</span></p>
                <p className="text-sm text-muted-foreground">Net Profit: <span className="font-semibold">$16,120</span></p>
              </div>
              <Button variant="outline" className="w-full mt-4">View Details</Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-indigo-600" />
                Inventory Reports
              </CardTitle>
              <CardDescription>
                Stock levels and inventory tracking
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Total Items: <span className="font-semibold">156</span></p>
                <p className="text-sm text-muted-foreground">Low Stock: <span className="font-semibold text-red-600">8 items</span></p>
                <p className="text-sm text-muted-foreground">Value: <span className="font-semibold">$15,420</span></p>
              </div>
              <Button variant="outline" className="w-full mt-4">View Details</Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-teal-600" />
                Custom Reports
              </CardTitle>
              <CardDescription>
                Create and schedule custom reports
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Saved Reports: <span className="font-semibold">5</span></p>
                <p className="text-sm text-muted-foreground">Scheduled: <span className="font-semibold">3</span></p>
                <p className="text-sm text-muted-foreground">Last Run: <span className="font-semibold">Today</span></p>
              </div>
              <Button variant="outline" className="w-full mt-4">Create Report</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Reports;