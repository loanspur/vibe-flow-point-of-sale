import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, FolderOpen, Tag } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface Category {
  id: string;
  name: string;
  description: string;
  color: string;
  subcategories?: Subcategory[];
}

interface Subcategory {
  id: string;
  name: string;
  description: string;
  category_id: string;
}

interface CategoryManagementProps {
  onUpdate?: () => void;
}

export default function CategoryManagement({ onUpdate }: CategoryManagementProps) {
  const { tenantId } = useAuth();
  const { toast } = useToast();
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [showSubcategoryForm, setShowSubcategoryForm] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<Subcategory | null>(null);
  const [selectedCategoryForSub, setSelectedCategoryForSub] = useState<string>('');

  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
    color: '#3B82F6',
  });

  const [subcategoryForm, setSubcategoryForm] = useState({
    name: '',
    description: '',
    category_id: undefined,
  });

  useEffect(() => {
    if (tenantId) {
      fetchCategories();
    }
  }, [tenantId]);

  const fetchCategories = async () => {
    if (!tenantId) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('product_categories')
        .select(`
          *,
          product_subcategories (*)
        `)
        .eq('tenant_id', tenantId)
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error: any) {
      toast({
        title: "Error fetching categories",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const categoryData = {
        ...categoryForm,
        tenant_id: tenantId,
      };

      let error;
      if (selectedCategory) {
        ({ error } = await supabase
          .from('product_categories')
          .update(categoryData)
          .eq('id', selectedCategory.id));
      } else {
        ({ error } = await supabase
          .from('product_categories')
          .insert([categoryData]));
      }

      if (error) throw error;

      toast({
        title: selectedCategory ? "Category updated" : "Category created",
        description: `${categoryForm.name} has been ${selectedCategory ? 'updated' : 'created'} successfully.`,
      });

      // Persist changes and refresh
      await fetchCategories();
      setShowCategoryForm(false);
      setSelectedCategory(null);
      setCategoryForm({ name: '', description: '', color: '#3B82F6' });
      onUpdate?.();
    } catch (error: any) {
      toast({
        title: "Error saving category",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSubcategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const subcategoryData = {
        ...subcategoryForm,
        tenant_id: tenantId,
      };

      let error;
      if (selectedSubcategory) {
        ({ error } = await supabase
          .from('product_subcategories')
          .update(subcategoryData)
          .eq('id', selectedSubcategory.id));
      } else {
        ({ error } = await supabase
          .from('product_subcategories')
          .insert([subcategoryData]));
      }

      if (error) throw error;

      toast({
        title: selectedSubcategory ? "Subcategory updated" : "Subcategory created",
        description: `${subcategoryForm.name} has been ${selectedSubcategory ? 'updated' : 'created'} successfully.`,
      });

      // Persist changes and refresh
      await fetchCategories();
      setShowSubcategoryForm(false);
      setSelectedSubcategory(null);
      setSubcategoryForm({ name: '', description: '', category_id: undefined });
      onUpdate?.();
    } catch (error: any) {
      toast({
        title: "Error saving subcategory",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    try {
      const { error } = await supabase
        .from('product_categories')
        .delete()
        .eq('id', categoryId);

      if (error) throw error;

      toast({
        title: "Category deleted",
        description: "Category has been successfully deleted.",
      });

      fetchCategories();
      onUpdate?.();
    } catch (error: any) {
      toast({
        title: "Error deleting category",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteSubcategory = async (subcategoryId: string) => {
    try {
      const { error } = await supabase
        .from('product_subcategories')
        .delete()
        .eq('id', subcategoryId);

      if (error) throw error;

      toast({
        title: "Subcategory deleted",
        description: "Subcategory has been successfully deleted.",
      });

      fetchCategories();
      onUpdate?.();
    } catch (error: any) {
      toast({
        title: "Error deleting subcategory",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const openCategoryForm = (category?: Category) => {
    if (category) {
      setSelectedCategory(category);
      setCategoryForm({
        name: category.name,
        description: category.description || '',
        color: category.color || '#3B82F6',
      });
    } else {
      setSelectedCategory(null);
      setCategoryForm({ name: '', description: '', color: '#3B82F6' });
    }
    setShowCategoryForm(true);
  };

  const openSubcategoryForm = (subcategory?: Subcategory, categoryId?: string) => {
    if (subcategory) {
      setSelectedSubcategory(subcategory);
      setSubcategoryForm({
        name: subcategory.name,
        description: subcategory.description || '',
        category_id: subcategory.category_id,
      });
    } else {
      setSelectedSubcategory(null);
      setSubcategoryForm({
        name: '',
        description: '',
        category_id: categoryId || selectedCategoryForSub,
      });
    }
    setShowSubcategoryForm(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Categories & Subcategories</h3>
          <p className="text-muted-foreground">Organize your products</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => openCategoryForm()}>
            <Plus className="h-4 w-4 mr-2" />
            Add Category
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add Subcategory
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Select Category</DialogTitle>
                <DialogDescription>
                  Choose a category to add a subcategory to
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                {categories.map((category) => (
                  <Button
                    key={category.id}
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => {
                      setSelectedCategoryForSub(category.id);
                      openSubcategoryForm(undefined, category.id);
                    }}
                  >
                    <div
                      className="w-3 h-3 rounded-full mr-2"
                      style={{ backgroundColor: category.color }}
                    />
                    {category.name}
                  </Button>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Categories List */}
      {categories.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Categories Found</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create categories to organize your products effectively.
            </p>
            <Button onClick={() => openCategoryForm()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Category
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {categories.map((category) => (
            <Card key={category.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    <div>
                      <CardTitle className="text-lg">{category.name}</CardTitle>
                      {category.description && (
                        <CardDescription>{category.description}</CardDescription>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {category.subcategories?.length || 0} subcategories
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openCategoryForm(category)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Category</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{category.name}"? This will also delete all subcategories and may affect products in this category.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteCategory(category.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardHeader>
              
              {category.subcategories && category.subcategories.length > 0 && (
                <CardContent>
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm text-muted-foreground">Subcategories</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {category.subcategories.map((subcategory) => (
                        <div
                          key={subcategory.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div className="flex items-center gap-2">
                            <Tag className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">{subcategory.name}</span>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openSubcategoryForm(subcategory)}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="text-destructive">
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Subcategory</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete "{subcategory.name}"?
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteSubcategory(subcategory.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => openSubcategoryForm(undefined, category.id)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Subcategory
                  </Button>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Category Form Dialog */}
      <Dialog open={showCategoryForm} onOpenChange={setShowCategoryForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedCategory ? 'Edit Category' : 'Add New Category'}
            </DialogTitle>
            <DialogDescription>
              {selectedCategory ? 'Update category information' : 'Create a new product category'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCategorySubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="category-name">Name *</Label>
              <Input
                id="category-name"
                value={categoryForm.name}
                onChange={(e) => setCategoryForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Category name"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="category-description">Description</Label>
              <Textarea
                id="category-description"
                value={categoryForm.description}
                onChange={(e) => setCategoryForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Category description"
                rows={3}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="category-color">Color</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  id="category-color"
                  value={categoryForm.color}
                  onChange={(e) => setCategoryForm(prev => ({ ...prev, color: e.target.value }))}
                  className="w-12 h-10 border rounded cursor-pointer"
                />
                <Input
                  value={categoryForm.color}
                  onChange={(e) => setCategoryForm(prev => ({ ...prev, color: e.target.value }))}
                  placeholder="#3B82F6"
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowCategoryForm(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {selectedCategory ? 'Update' : 'Create'} Category
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Subcategory Form Dialog */}
      <Dialog open={showSubcategoryForm} onOpenChange={setShowSubcategoryForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedSubcategory ? 'Edit Subcategory' : 'Add New Subcategory'}
            </DialogTitle>
            <DialogDescription>
              {selectedSubcategory ? 'Update subcategory information' : 'Create a new product subcategory'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubcategorySubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="subcategory-category">Parent Category *</Label>
              <select
                id="subcategory-category"
                value={subcategoryForm.category_id}
                onChange={(e) => setSubcategoryForm(prev => ({ ...prev, category_id: e.target.value }))}
                className="w-full px-3 py-2 border border-input rounded-md"
                required
              >
                <option value="">Select a category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="subcategory-name">Name *</Label>
              <Input
                id="subcategory-name"
                value={subcategoryForm.name}
                onChange={(e) => setSubcategoryForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Subcategory name"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="subcategory-description">Description</Label>
              <Textarea
                id="subcategory-description"
                value={subcategoryForm.description}
                onChange={(e) => setSubcategoryForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Subcategory description"
                rows={3}
              />
            </div>
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowSubcategoryForm(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {selectedSubcategory ? 'Update' : 'Create'} Subcategory
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}