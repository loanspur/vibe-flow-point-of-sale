import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Plus,
  Package,
  Calendar,
  GitCommit,
  Star,
  AlertCircle,
  CheckCircle,
  Settings,
  History,
  RefreshCw
} from 'lucide-react';
import { useVersionTracking } from '@/hooks/useVersionTracking';
import { useToast } from '@/hooks/use-toast';
import { formatDate } from 'date-fns';

const versionSchema = z.object({
  version_number: z.string().min(1, 'Version number is required').regex(
    /^\d+\.\d+\.\d+(-\w+)?$/,
    'Version must follow semantic versioning (e.g., 1.0.0 or 1.0.0-beta)'
  ),
  version_name: z.string().optional(),
  release_notes: z.string().optional(),
  is_current: z.boolean().default(false),
  is_stable: z.boolean().default(true),
  build_number: z.coerce.number().optional(),
  git_commit_hash: z.string().optional(),
  features_added: z.string().optional(),
  bugs_fixed: z.string().optional(),
  breaking_changes: z.string().optional(),
});

type VersionFormData = z.infer<typeof versionSchema>;

export const VersionManagement = () => {
  const { 
    currentVersion, 
    allVersions, 
    tenantVersion, 
    loading, 
    error,
    createNewVersion,
    setCurrentVersionById,
    refreshData
  } = useVersionTracking();
  
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const form = useForm<VersionFormData>({
    resolver: zodResolver(versionSchema),
    defaultValues: {
      is_stable: true,
      is_current: false,
    },
  });

  const onSubmit = async (data: VersionFormData) => {
    setIsCreating(true);
    try {
      const versionData = {
        version_number: data.version_number,
        version_name: data.version_name,
        release_notes: data.release_notes,
        is_current: data.is_current,
        is_stable: data.is_stable,
        build_number: data.build_number,
        git_commit_hash: data.git_commit_hash,
        features_added: data.features_added ? data.features_added.split('\n').filter(f => f.trim()) : [],
        bugs_fixed: data.bugs_fixed ? data.bugs_fixed.split('\n').filter(f => f.trim()) : [],
        breaking_changes: data.breaking_changes ? data.breaking_changes.split('\n').filter(f => f.trim()) : [],
      };

      await createNewVersion(versionData);
      
      toast({
        title: 'Version Created',
        description: `Version ${data.version_number} has been created successfully.`,
      });

      form.reset();
      setIsDialogOpen(false);
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to create version',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleSetCurrentVersion = async (versionNumber: string) => {
    try {
      await setCurrentVersionById(versionNumber);
      toast({
        title: 'Current Version Updated',
        description: `Version ${versionNumber} is now the current version.`,
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to update current version',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Version Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin" />
            <span className="ml-2">Loading versions...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Version Management
              </CardTitle>
              <CardDescription>
                Manage application versions, releases, and deployments
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={refreshData}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    New Version
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Create New Version</DialogTitle>
                    <DialogDescription>
                      Add a new application version with release details
                    </DialogDescription>
                  </DialogHeader>
                  
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="version_number"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Version Number *</FormLabel>
                              <FormControl>
                                <Input placeholder="1.0.0" {...field} />
                              </FormControl>
                              <FormDescription>
                                Use semantic versioning (major.minor.patch)
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="version_name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Version Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Initial Release" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="build_number"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Build Number</FormLabel>
                              <FormControl>
                                <Input type="number" placeholder="1001" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="git_commit_hash"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Git Commit Hash</FormLabel>
                              <FormControl>
                                <Input placeholder="abc123def456" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="release_notes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Release Notes</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Describe what's new in this version..."
                                className="min-h-[100px]"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-3 gap-4">
                        <FormField
                          control={form.control}
                          name="features_added"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Features Added</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Feature 1&#10;Feature 2&#10;Feature 3"
                                  className="min-h-[80px]"
                                  {...field} 
                                />
                              </FormControl>
                              <FormDescription>One per line</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="bugs_fixed"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Bugs Fixed</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Bug fix 1&#10;Bug fix 2"
                                  className="min-h-[80px]"
                                  {...field} 
                                />
                              </FormControl>
                              <FormDescription>One per line</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="breaking_changes"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Breaking Changes</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Breaking change 1&#10;Breaking change 2"
                                  className="min-h-[80px]"
                                  {...field} 
                                />
                              </FormControl>
                              <FormDescription>One per line</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="flex items-center gap-6">
                        <FormField
                          control={form.control}
                          name="is_stable"
                          render={({ field }) => (
                            <FormItem className="flex items-center space-x-2">
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <FormLabel>Stable Release</FormLabel>
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="is_current"
                          render={({ field }) => (
                            <FormItem className="flex items-center space-x-2">
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <FormLabel>Set as Current Version</FormLabel>
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button type="submit" disabled={isCreating}>
                          {isCreating ? (
                            <>
                              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                              Creating...
                            </>
                          ) : (
                            'Create Version'
                          )}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Current Version Info */}
      {currentVersion && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-500" />
              Current Version
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium">Version</label>
                <p className="text-lg font-mono">{currentVersion.version_number}</p>
              </div>
              {currentVersion.version_name && (
                <div>
                  <label className="text-sm font-medium">Name</label>
                  <p className="text-lg">{currentVersion.version_name}</p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium">Released</label>
                <p className="text-lg">{formatDate(new Date(currentVersion.release_date), 'MMM dd, yyyy')}</p>
              </div>
              <div>
                <label className="text-sm font-medium">Status</label>
                <Badge variant={currentVersion.is_stable ? 'default' : 'secondary'}>
                  {currentVersion.is_stable ? 'Stable' : 'Beta'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Version History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Version History
          </CardTitle>
          <CardDescription>
            All application versions and their release information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Version</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Release Date</TableHead>
                <TableHead>Build</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allVersions.map((version) => (
                <TableRow key={version.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-mono">{version.version_number}</span>
                      {version.is_current && (
                        <Badge variant="default" className="h-5 text-xs">
                          <Star className="w-3 h-3 mr-1" />
                          Current
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{version.version_name || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={version.is_stable ? 'default' : 'secondary'}>
                      {version.is_stable ? (
                        <>
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Stable
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-3 h-3 mr-1" />
                          Beta
                        </>
                      )}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(new Date(version.release_date), 'MMM dd, yyyy')}
                    </div>
                  </TableCell>
                  <TableCell>
                    {version.build_number ? (
                      <span className="font-mono">#{version.build_number}</span>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>
                    {!version.is_current && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSetCurrentVersion(version.version_number)}
                      >
                        Set Current
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};