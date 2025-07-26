import React, { useState } from 'react';
import { useRoleManagement, SystemFeature } from '@/hooks/useRoleManagement';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import {
  Settings,
  Plus,
  Edit,
  Trash2,
  Package,
  Crown,
  Star,
  Zap,
  Rocket,
  CheckCircle,
  XCircle,
  Eye,
  Filter,
  Search,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface SystemFeaturesProps {
  readonly?: boolean;
}

const SystemFeatures: React.FC<SystemFeaturesProps> = ({ readonly = false }) => {
  const { systemFeatures, loading, loadAllData } = useRoleManagement();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFeature, setEditingFeature] = useState<SystemFeature | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');

  const [formData, setFormData] = useState({
    name: '',
    display_name: '',
    description: '',
    feature_type: 'core' as 'core' | 'premium' | 'enterprise' | 'addon',
    status: 'active' as 'active' | 'inactive' | 'deprecated' | 'beta',
    category: '',
    icon: '',
    requires_subscription: false,
    min_plan_level: '',
    dependencies: [] as string[],
    metadata: {},
  });

  const categories = Array.from(new Set(systemFeatures.map(f => f.category)));
  const featureTypes = ['core', 'premium', 'enterprise', 'addon'];
  const statusOptions = ['active', 'inactive', 'deprecated', 'beta'];

  const getFeatureTypeIcon = (type: string) => {
    switch (type) {
      case 'core': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'premium': return <Crown className="h-4 w-4 text-blue-500" />;
      case 'enterprise': return <Rocket className="h-4 w-4 text-purple-500" />;
      case 'addon': return <Plus className="h-4 w-4 text-orange-500" />;
      default: return <Package className="h-4 w-4" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'inactive': return <XCircle className="h-4 w-4 text-gray-500" />;
      case 'deprecated': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'beta': return <Star className="h-4 w-4 text-yellow-500" />;
      default: return <Package className="h-4 w-4" />;
    }
  };

  const filteredFeatures = systemFeatures.filter(feature => {
    const matchesSearch = feature.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         feature.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         feature.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || feature.category === selectedCategory;
    const matchesType = selectedType === 'all' || feature.feature_type === selectedType;
    
    return matchesSearch && matchesCategory && matchesType;
  });

  const handleSave = async () => {
    try {
      const featureData = {
        ...formData,
        updated_at: new Date().toISOString(),
      };

      let query;
      if (editingFeature) {
        query = supabase
          .from('system_features')
          .update(featureData)
          .eq('id', editingFeature.id);
      } else {
        query = supabase
          .from('system_features')
          .insert([{ ...featureData, created_at: new Date().toISOString() }]);
      }

      const { error } = await query;
      if (error) throw error;

      toast.success(`Feature ${editingFeature ? 'updated' : 'created'} successfully`);
      setIsDialogOpen(false);
      resetForm();
      loadAllData();
    } catch (error) {
      console.error('Error saving feature:', error);
      toast.error('Failed to save feature');
    }
  };

  const handleDelete = async (featureId: string) => {
    if (!confirm('Are you sure you want to delete this feature?')) return;

    try {
      const { error } = await supabase
        .from('system_features')
        .delete()
        .eq('id', featureId);

      if (error) throw error;

      toast.success('Feature deleted successfully');
      loadAllData();
    } catch (error) {
      console.error('Error deleting feature:', error);
      toast.error('Failed to delete feature');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      display_name: '',
      description: '',
      feature_type: 'core',
      status: 'active',
      category: '',
      icon: '',
      requires_subscription: false,
      min_plan_level: '',
      dependencies: [],
      metadata: {},
    });
    setEditingFeature(null);
  };

  const openEditDialog = (feature: SystemFeature) => {
    setEditingFeature(feature);
    setFormData({
      name: feature.name,
      display_name: feature.display_name,
      description: feature.description || '',
      feature_type: feature.feature_type,
      status: feature.status,
      category: feature.category,
      icon: feature.icon || '',
      requires_subscription: feature.requires_subscription,
      min_plan_level: feature.min_plan_level || '',
      dependencies: feature.dependencies || [],
      metadata: feature.metadata || {},
    });
    setIsDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">System Features Management</h2>
          <p className="text-muted-foreground">Manage global system features and capabilities</p>
        </div>
        {!readonly && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Add Feature
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingFeature ? 'Edit Feature' : 'Create New Feature'}
                </DialogTitle>
                <DialogDescription>
                  Define a new system feature or modify an existing one
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Feature Name (unique)</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., advanced_reporting"
                    />
                  </div>
                  <div>
                    <Label htmlFor="display_name">Display Name</Label>
                    <Input
                      id="display_name"
                      value={formData.display_name}
                      onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                      placeholder="e.g., Advanced Reporting"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe what this feature does..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="feature_type">Feature Type</Label>
                    <Select value={formData.feature_type} onValueChange={(value: any) => setFormData({ ...formData, feature_type: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {featureTypes.map(type => (
                          <SelectItem key={type} value={type}>
                            <div className="flex items-center gap-2">
                              {getFeatureTypeIcon(type)}
                              {type.charAt(0).toUpperCase() + type.slice(1)}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select value={formData.status} onValueChange={(value: any) => setFormData({ ...formData, status: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map(status => (
                          <SelectItem key={status} value={status}>
                            <div className="flex items-center gap-2">
                              {getStatusIcon(status)}
                              {status.charAt(0).toUpperCase() + status.slice(1)}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Input
                      id="category"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      placeholder="e.g., analytics, pos, users"
                    />
                  </div>
                  <div>
                    <Label htmlFor="icon">Icon (Lucide name)</Label>
                    <Input
                      id="icon"
                      value={formData.icon}
                      onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                      placeholder="e.g., BarChart3, Users"
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={formData.requires_subscription}
                    onCheckedChange={(checked) => setFormData({ ...formData, requires_subscription: checked })}
                  />
                  <Label>Requires subscription</Label>
                </div>
                {formData.requires_subscription && (
                  <div>
                    <Label htmlFor="min_plan_level">Minimum Plan Level</Label>
                    <Input
                      id="min_plan_level"
                      value={formData.min_plan_level}
                      onChange={(e) => setFormData({ ...formData, min_plan_level: e.target.value })}
                      placeholder="e.g., professional, enterprise"
                    />
                  </div>
                )}
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSave}>
                    {editingFeature ? 'Update' : 'Create'} Feature
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="search">Search Features</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by name or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="w-full sm:w-48">
              <Label htmlFor="category">Category</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full sm:w-48">
              <Label htmlFor="type">Type</Label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {featureTypes.map(type => (
                    <SelectItem key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Features Table */}
      <Card>
        <CardHeader>
          <CardTitle>System Features ({filteredFeatures.length})</CardTitle>
          <CardDescription>
            All available system features and their configurations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Feature</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Subscription</TableHead>
                {!readonly && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFeatures.map((feature) => (
                <TableRow key={feature.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{feature.display_name}</div>
                      <div className="text-sm text-muted-foreground">{feature.name}</div>
                      {feature.description && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {feature.description}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getFeatureTypeIcon(feature.feature_type)}
                      {feature.feature_type}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {feature.category}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(feature.status)}
                      {feature.status}
                    </div>
                  </TableCell>
                  <TableCell>
                    {feature.requires_subscription ? (
                      <Badge variant="secondary">
                        <Crown className="h-3 w-3 mr-1" />
                        Required
                      </Badge>
                    ) : (
                      <Badge variant="outline">Free</Badge>
                    )}
                  </TableCell>
                  {!readonly && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(feature)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {!feature.is_system_feature && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(feature.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default SystemFeatures;