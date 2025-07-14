import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Plus, Search, Users, Mail, Phone, MapPin, MoreHorizontal } from "lucide-react";
import { Link } from "react-router-dom";

const Customers = () => {
  const customers = [
    {
      id: 1,
      name: "John Doe",
      email: "john.doe@email.com",
      phone: "+1 (555) 123-4567",
      address: "123 Main St, City",
      totalSpent: "$1,234.50",
      visits: 15,
      lastVisit: "2 days ago",
      status: "VIP",
      avatar: "/placeholder.svg"
    },
    {
      id: 2,
      name: "Sarah Wilson",
      email: "sarah.wilson@email.com",
      phone: "+1 (555) 234-5678",
      address: "456 Oak Ave, City",
      totalSpent: "$856.20",
      visits: 8,
      lastVisit: "1 week ago",
      status: "Regular",
      avatar: "/placeholder.svg"
    },
    {
      id: 3,
      name: "Mike Brown",
      email: "mike.brown@email.com",
      phone: "+1 (555) 345-6789",
      address: "789 Pine St, City",
      totalSpent: "$432.75",
      visits: 12,
      lastVisit: "3 days ago",
      status: "Regular",
      avatar: "/placeholder.svg"
    },
    {
      id: 4,
      name: "Lisa Garcia",
      email: "lisa.garcia@email.com",
      phone: "+1 (555) 456-7890",
      address: "321 Elm St, City",
      totalSpent: "$2,156.80",
      visits: 23,
      lastVisit: "Yesterday",
      status: "VIP",
      avatar: "/placeholder.svg"
    },
    {
      id: 5,
      name: "David Smith",
      email: "david.smith@email.com",
      phone: "+1 (555) 567-8901",
      address: "654 Maple Dr, City",
      totalSpent: "$189.45",
      visits: 3,
      lastVisit: "2 weeks ago",
      status: "New",
      avatar: "/placeholder.svg"
    }
  ];

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
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pink-600 to-rose-600 flex items-center justify-center">
                <Users className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Customers</h1>
                <p className="text-muted-foreground">Manage customer relationships</p>
              </div>
            </div>
          </div>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Customer
          </Button>
        </div>

        {/* Search and Stats */}
        <div className="grid lg:grid-cols-5 gap-6 mb-6">
          <Card className="lg:col-span-2">
            <CardContent className="pt-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search customers..." 
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{customers.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">VIP Customers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{customers.filter(c => c.status === "VIP").length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">New This Month</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{customers.filter(c => c.status === "New").length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Customers List */}
        <div className="space-y-4">
          {customers.map((customer) => (
            <Card key={customer.id} className="hover:shadow-lg transition-all duration-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={customer.avatar} alt={customer.name} />
                      <AvatarFallback>{customer.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                    </Avatar>
                    
                    <div>
                      <h3 className="font-semibold text-lg">{customer.name}</h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {customer.email}
                        </div>
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {customer.phone}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <MapPin className="h-3 w-3" />
                        {customer.address}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-6">
                    <div className="text-right">
                      <p className="font-semibold text-lg">{customer.totalSpent}</p>
                      <p className="text-xs text-muted-foreground">Total Spent</p>
                    </div>
                    
                    <div className="text-right">
                      <p className="font-semibold">{customer.visits}</p>
                      <p className="text-xs text-muted-foreground">Visits</p>
                    </div>
                    
                    <div className="text-right">
                      <p className="text-sm">{customer.lastVisit}</p>
                      <p className="text-xs text-muted-foreground">Last Visit</p>
                    </div>
                    
                    <div>
                      <Badge 
                        variant={customer.status === "VIP" ? "default" : 
                               customer.status === "New" ? "secondary" : "outline"}
                        className={
                          customer.status === "VIP" ? "bg-purple-100 text-purple-700" :
                          customer.status === "New" ? "bg-green-100 text-green-700" : ""
                        }
                      >
                        {customer.status}
                      </Badge>
                    </div>
                    
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Customer Insights */}
        <div className="grid md:grid-cols-3 gap-6 mt-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Customer Segments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">VIP Customers</span>
                  <Badge className="bg-purple-100 text-purple-700">
                    {customers.filter(c => c.status === "VIP").length}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Regular Customers</span>
                  <Badge variant="outline">
                    {customers.filter(c => c.status === "Regular").length}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">New Customers</span>
                  <Badge className="bg-green-100 text-green-700">
                    {customers.filter(c => c.status === "New").length}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Top Spenders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {customers
                  .sort((a, b) => parseFloat(b.totalSpent.replace('$', '').replace(',', '')) - parseFloat(a.totalSpent.replace('$', '').replace(',', '')))
                  .slice(0, 3)
                  .map((customer, index) => (
                    <div key={customer.id} className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono w-4">#{index + 1}</span>
                        <span className="text-sm">{customer.name}</span>
                      </div>
                      <span className="font-semibold text-sm">{customer.totalSpent}</span>
                    </div>
                  ))
                }
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-sm">
                  <p className="font-medium">Lisa Garcia</p>
                  <p className="text-muted-foreground text-xs">Purchased $45.60 • Yesterday</p>
                </div>
                <div className="text-sm">
                  <p className="font-medium">John Doe</p>
                  <p className="text-muted-foreground text-xs">Purchased $23.40 • 2 days ago</p>
                </div>
                <div className="text-sm">
                  <p className="font-medium">Mike Brown</p>
                  <p className="text-muted-foreground text-xs">Purchased $67.20 • 3 days ago</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Customers;