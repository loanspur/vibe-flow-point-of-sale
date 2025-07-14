import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Search, Package, Edit, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";

const Products = () => {
  const products = [
    { id: 1, name: "Espresso", category: "Beverages", price: "$3.50", stock: 100, status: "Active" },
    { id: 2, name: "Croissant", category: "Pastries", price: "$2.25", stock: 25, status: "Active" },
    { id: 3, name: "Cappuccino", category: "Beverages", price: "$4.00", stock: 80, status: "Active" },
    { id: 4, name: "Blueberry Muffin", category: "Pastries", price: "$2.75", stock: 15, status: "Low Stock" },
    { id: 5, name: "Latte", category: "Beverages", price: "$4.50", stock: 60, status: "Active" },
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
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
                <Package className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Products</h1>
                <p className="text-muted-foreground">Manage your inventory</p>
              </div>
            </div>
          </div>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Button>
        </div>

        {/* Search and Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search products..." 
                  className="pl-10"
                />
              </div>
              <Button variant="outline">Filter</Button>
              <Button variant="outline">Export</Button>
            </div>
          </CardContent>
        </Card>

        {/* Products Grid */}
        <div className="grid gap-6">
          {products.map((product) => (
            <Card key={product.id} className="hover:shadow-lg transition-all duration-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg flex items-center justify-center">
                      <Package className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{product.name}</h3>
                      <p className="text-sm text-muted-foreground">{product.category}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-6">
                    <div className="text-right">
                      <p className="font-semibold text-lg">{product.price}</p>
                      <p className="text-sm text-muted-foreground">Price</p>
                    </div>
                    
                    <div className="text-right">
                      <p className="font-semibold">{product.stock}</p>
                      <p className="text-sm text-muted-foreground">In Stock</p>
                    </div>
                    
                    <div>
                      <Badge 
                        variant={product.status === "Active" ? "default" : "destructive"}
                        className={product.status === "Active" ? "bg-green-100 text-green-700" : ""}
                      >
                        {product.status}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Summary Stats */}
        <div className="grid md:grid-cols-4 gap-4 mt-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{products.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Active Products</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{products.filter(p => p.status === "Active").length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{products.filter(p => p.status === "Low Stock").length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">$2,450</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Products;