import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, 
  DollarSign, 
  ShoppingBag, 
  Users,
  ArrowUpRight,
  Activity
} from "lucide-react";
import dashboardImage from "@/assets/dashboard-preview.jpg";

const Dashboard = () => {
  const metrics = [
    {
      title: "Today's Sales",
      value: "$2,847.52",
      change: "+12.5%",
      icon: DollarSign,
      trend: "up"
    },
    {
      title: "Transactions",
      value: "127",
      change: "+8.2%",
      icon: Activity,
      trend: "up"
    },
    {
      title: "Products Sold",
      value: "342",
      change: "+15.3%",
      icon: ShoppingBag,
      trend: "up"
    },
    {
      title: "Customers",
      value: "89",
      change: "+5.7%",
      icon: Users,
      trend: "up"
    }
  ];

  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-4xl lg:text-5xl font-bold text-foreground">
            Powerful insights at
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent"> your fingertips</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Make data-driven decisions with real-time analytics, comprehensive reporting, and actionable business insights.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div className="grid grid-cols-2 gap-4">
              {metrics.map((metric, index) => (
                <Card key={index} className="p-6 bg-card border-border hover:shadow-[var(--shadow-card)] transition-all duration-300">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground font-medium">{metric.title}</p>
                      <p className="text-2xl font-bold text-foreground">{metric.value}</p>
                      <div className="flex items-center gap-1">
                        <ArrowUpRight className="h-4 w-4 text-pos-success" />
                        <span className="text-sm text-pos-success font-medium">{metric.change}</span>
                      </div>
                    </div>
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <metric.icon className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <Card className="p-6 bg-gradient-to-br from-card to-card/50 border-border">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-foreground">Quick Actions</h3>
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Button variant="outline" className="justify-start">
                    New Sale
                  </Button>
                  <Button variant="outline" className="justify-start">
                    Add Product
                  </Button>
                  <Button variant="outline" className="justify-start">
                    View Reports
                  </Button>
                  <Button variant="outline" className="justify-start">
                    Manage Staff
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          <div className="relative">
            <div className="relative z-10">
              <img 
                src={dashboardImage} 
                alt="vibePOS Dashboard Analytics" 
                className="w-full h-auto rounded-2xl shadow-[var(--shadow-elegant)] border border-border"
              />
            </div>
            <div className="absolute -top-4 -right-4 -bottom-4 -left-4 bg-gradient-to-r from-primary/10 to-accent/10 rounded-3xl blur-xl"></div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Dashboard;