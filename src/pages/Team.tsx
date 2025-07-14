import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Plus, Search, Users, Mail, Phone, MoreHorizontal } from "lucide-react";
import { Link } from "react-router-dom";

const Team = () => {
  const teamMembers = [
    {
      id: 1,
      name: "Sarah Johnson",
      email: "sarah@business.com",
      role: "Manager",
      status: "Active",
      phone: "+1 (555) 123-4567",
      avatar: "/placeholder.svg",
      lastActive: "2 hours ago"
    },
    {
      id: 2,
      name: "Mike Chen",
      email: "mike@business.com",
      role: "Cashier",
      status: "Active",
      phone: "+1 (555) 234-5678",
      avatar: "/placeholder.svg",
      lastActive: "30 minutes ago"
    },
    {
      id: 3,
      name: "Emily Davis",
      email: "emily@business.com",
      role: "Cashier",
      status: "Active",
      phone: "+1 (555) 345-6789",
      avatar: "/placeholder.svg",
      lastActive: "1 hour ago"
    },
    {
      id: 4,
      name: "Alex Rodriguez",
      email: "alex@business.com",
      role: "Cashier",
      status: "Inactive",
      phone: "+1 (555) 456-7890",
      avatar: "/placeholder.svg",
      lastActive: "3 days ago"
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
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-600 to-amber-600 flex items-center justify-center">
                <Users className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Team Management</h1>
                <p className="text-muted-foreground">Manage staff and permissions</p>
              </div>
            </div>
          </div>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Team Member
          </Button>
        </div>

        {/* Search and Stats */}
        <div className="grid lg:grid-cols-4 gap-6 mb-6">
          <Card className="lg:col-span-2">
            <CardContent className="pt-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search team members..." 
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{teamMembers.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Active Now</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{teamMembers.filter(m => m.status === "Active").length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Team Members List */}
        <div className="space-y-4">
          {teamMembers.map((member) => (
            <Card key={member.id} className="hover:shadow-lg transition-all duration-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={member.avatar} alt={member.name} />
                      <AvatarFallback>{member.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                    </Avatar>
                    
                    <div>
                      <h3 className="font-semibold text-lg">{member.name}</h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {member.email}
                        </div>
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {member.phone}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Last active: {member.lastActive}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <Badge 
                        variant={member.role === "Manager" ? "default" : "secondary"}
                        className={member.role === "Manager" ? "bg-blue-100 text-blue-700" : ""}
                      >
                        {member.role}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">Role</p>
                    </div>
                    
                    <div className="text-right">
                      <Badge 
                        variant={member.status === "Active" ? "default" : "outline"}
                        className={member.status === "Active" ? "bg-green-100 text-green-700" : ""}
                      >
                        {member.status}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">Status</p>
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

        {/* Roles and Permissions */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Roles & Permissions</CardTitle>
            <CardDescription>Manage user roles and access levels</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold mb-2">Manager</h3>
                <p className="text-sm text-muted-foreground mb-3">Full access to all features and settings</p>
                <ul className="text-xs space-y-1 text-muted-foreground">
                  <li>• Manage products & inventory</li>
                  <li>• Access all reports</li>
                  <li>• Manage team members</li>
                  <li>• Configure settings</li>
                </ul>
              </div>
              
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold mb-2">Cashier</h3>
                <p className="text-sm text-muted-foreground mb-3">Basic POS operations and customer service</p>
                <ul className="text-xs space-y-1 text-muted-foreground">
                  <li>• Process sales</li>
                  <li>• Handle returns</li>
                  <li>• View basic reports</li>
                  <li>• Manage customers</li>
                </ul>
              </div>
              
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold mb-2">Custom Role</h3>
                <p className="text-sm text-muted-foreground mb-3">Create custom roles with specific permissions</p>
                <Button variant="outline" size="sm" className="mt-2">
                  Create Role
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Team;