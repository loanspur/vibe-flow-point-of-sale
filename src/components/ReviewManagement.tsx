import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useDataList } from '@/hooks/useDataList';
import { useCrudOperations } from '@/hooks/useCrudOperations';
import { useTableActions } from '@/hooks/useTableActions';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Star, MessageSquare, Reply, Eye, Filter, Plus, 
  Calendar, Clock, User, Mail, Phone, Building,
  AlertCircle, CheckCircle, XCircle, Archive,
  TrendingUp, BarChart3, Users
} from 'lucide-react';

interface ClientReview {
  id: string;
  tenant_id: string;
  contact_id?: string;
  reviewer_name: string;
  reviewer_email: string;
  reviewer_phone?: string;
  reviewer_company?: string;
  title: string;
  content: string;
  pros?: string;
  cons?: string;
  rating?: number;
  review_type: string;
  client_type: string;
  source: string;
  category?: string;
  status: string;
  priority: string;
  is_public: boolean;
  is_featured: boolean;
  tags: string[];
  metadata: any;
  reviewed_at?: string;
  reviewed_by?: string;
  responded_at?: string;
  responded_by?: string;
  created_at: string;
  updated_at: string;
}

interface ReviewResponse {
  id: string;
  review_id: string;
  response_text: string;
  is_public: boolean;
  response_type: string;
  created_by: string;
  created_at: string;
}

const REVIEW_TYPES = [
  { value: 'product', label: 'Product Review' },
  
  { value: 'support', label: 'Support Experience' },
  { value: 'general', label: 'General Feedback' },
  { value: 'feature_request', label: 'Feature Request' },
  { value: 'bug_report', label: 'Bug Report' },
  { value: 'testimonial', label: 'Testimonial' }
];

const CLIENT_TYPES = [
  { value: 'existing', label: 'Existing Client' },
  { value: 'prospective', label: 'Prospective Client' },
  { value: 'former', label: 'Former Client' },
  { value: 'trial', label: 'Trial User' }
];

const REVIEW_STATUS = [
  { value: 'new', label: 'New', color: 'bg-blue-100 text-blue-800' },
  { value: 'in_review', label: 'In Review', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'responded', label: 'Responded', color: 'bg-green-100 text-green-800' },
  { value: 'escalated', label: 'Escalated', color: 'bg-red-100 text-red-800' },
  { value: 'resolved', label: 'Resolved', color: 'bg-gray-100 text-gray-800' },
  { value: 'archived', label: 'Archived', color: 'bg-gray-50 text-gray-600' }
];

const PRIORITY_LEVELS = [
  { value: 'low', label: 'Low', color: 'bg-green-100 text-green-800' },
  { value: 'medium', label: 'Medium', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-800' },
  { value: 'urgent', label: 'Urgent', color: 'bg-red-100 text-red-800' }
];

const ReviewManagement = () => {
  const { tenantId, userRole, user } = useAuth();
  const { toast } = useToast();
  
  const [selectedReview, setSelectedReview] = useState<ClientReview | null>(null);
  const [isResponseDialogOpen, setIsResponseDialogOpen] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [isPublicResponse, setIsPublicResponse] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');

  // Data management
  const {
    data: reviews,
    loading,
    searchTerm,
    setSearchTerm,
    refetch: refetchReviews
  } = useDataList<ClientReview>({
    tableName: 'client_reviews',
    orderBy: 'created_at',
    ascending: false,
    searchFields: ['reviewer_name', 'reviewer_email', 'title', 'content'],
    filters: {
      tenant_id: tenantId,
      ...(filterStatus !== 'all' && { status: filterStatus }),
      ...(filterPriority !== 'all' && { priority: filterPriority }),
      ...(filterType !== 'all' && { review_type: filterType })
    }
  });

  const { update: updateReview } = useCrudOperations<ClientReview>({
    tableName: 'client_reviews',
    entityName: 'review'
  });

  const { create: createResponse } = useCrudOperations<ReviewResponse>({
    tableName: 'review_responses',
    entityName: 'response'
  });

  // Analytics data
  const [analytics, setAnalytics] = useState({
    totalReviews: 0,
    avgRating: 0,
    newReviews: 0,
    responseRate: 0,
    byStatus: {} as Record<string, number>,
    byType: {} as Record<string, number>
  });

  useEffect(() => {
    if (reviews.length > 0) {
      calculateAnalytics();
    }
  }, [reviews]);

  const calculateAnalytics = () => {
    const total = reviews.length;
    const avgRating = reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / total;
    const newReviews = reviews.filter(r => r.status === 'new').length;
    const respondedReviews = reviews.filter(r => r.responded_at).length;
    const responseRate = total > 0 ? (respondedReviews / total) * 100 : 0;

    const byStatus = reviews.reduce((acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byType = reviews.reduce((acc, r) => {
      acc[r.review_type] = (acc[r.review_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    setAnalytics({
      totalReviews: total,
      avgRating: Number(avgRating.toFixed(1)),
      newReviews,
      responseRate: Number(responseRate.toFixed(1)),
      byStatus,
      byType
    });
  };

  const handleUpdateStatus = async (reviewId: string, newStatus: string) => {
    const { error } = await updateReview(reviewId, { 
      status: newStatus,
      reviewed_at: new Date().toISOString(),
      reviewed_by: user?.id
    });
    
    if (!error) {
      refetchReviews();
    }
  };

  const handleUpdatePriority = async (reviewId: string, newPriority: string) => {
    const { error } = await updateReview(reviewId, { priority: newPriority });
    if (!error) {
      refetchReviews();
    }
  };

  const handleTogglePublic = async (reviewId: string, isPublic: boolean) => {
    const { error } = await updateReview(reviewId, { is_public: isPublic });
    if (!error) {
      refetchReviews();
    }
  };

  const handleToggleFeatured = async (reviewId: string, isFeatured: boolean) => {
    const { error } = await updateReview(reviewId, { is_featured: isFeatured });
    if (!error) {
      refetchReviews();
    }
  };

  const handleSendResponse = async () => {
    if (!selectedReview || !responseText.trim()) return;

    const { error } = await createResponse({
      review_id: selectedReview.id,
      response_text: responseText,
      is_public: isPublicResponse,
      response_type: 'standard',
      created_by: user?.id
    });

    if (!error) {
      // Update review status
      await updateReview(selectedReview.id, {
        status: 'responded',
        responded_at: new Date().toISOString(),
        responded_by: user?.id
      });

      setResponseText('');
      setIsResponseDialogOpen(false);
      setSelectedReview(null);
      refetchReviews();
      
      toast({
        title: "Response Sent",
        description: "Your response has been recorded successfully"
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = REVIEW_STATUS.find(s => s.value === status);
    return (
      <Badge className={statusConfig?.color || 'bg-gray-100 text-gray-800'}>
        {statusConfig?.label || status}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const priorityConfig = PRIORITY_LEVELS.find(p => p.value === priority);
    return (
      <Badge className={priorityConfig?.color || 'bg-gray-100 text-gray-800'}>
        {priorityConfig?.label || priority}
      </Badge>
    );
  };

  const getRatingStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star 
        key={i} 
        className={`h-4 w-4 ${i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
      />
    ));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Review Management</h1>
          <p className="text-muted-foreground">
            Track and manage client feedback and reviews
          </p>
        </div>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reviews</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalReviews}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.avgRating}/5</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Reviews</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.newReviews}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Response Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.responseRate}%</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="reviews" className="space-y-4">
        <TabsList>
          <TabsTrigger value="reviews">All Reviews</TabsTrigger>
          <TabsTrigger value="new">New ({analytics.newReviews})</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="reviews" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Client Reviews
                </div>
              </CardTitle>
              
              {/* Filters */}
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                  <Input
                    placeholder="Search reviews..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    {REVIEW_STATUS.map(status => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select value={filterPriority} onValueChange={setFilterPriority}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priority</SelectItem>
                    {PRIORITY_LEVELS.map(priority => (
                      <SelectItem key={priority.value} value={priority.value}>
                        {priority.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {REVIEW_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            
            <CardContent>
              <ScrollArea className="h-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Reviewer</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Rating</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reviews.map((review) => (
                      <TableRow key={review.id}>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium">{review.reviewer_name}</div>
                            <div className="text-sm text-muted-foreground flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {review.reviewer_email}
                            </div>
                            {review.reviewer_company && (
                              <div className="text-sm text-muted-foreground flex items-center gap-1">
                                <Building className="h-3 w-3" />
                                {review.reviewer_company}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium">{review.title}</div>
                            <div className="text-sm text-muted-foreground line-clamp-2">
                              {review.content}
                            </div>
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          {review.rating && (
                            <div className="flex items-center gap-1">
                              {getRatingStars(review.rating)}
                              <span className="ml-1 text-sm">{review.rating}/5</span>
                            </div>
                          )}
                        </TableCell>
                        
                        <TableCell>
                          <Badge variant="outline">
                            {REVIEW_TYPES.find(t => t.value === review.review_type)?.label || review.review_type}
                          </Badge>
                        </TableCell>
                        
                        <TableCell>
                          <Select 
                            value={review.status} 
                            onValueChange={(value) => handleUpdateStatus(review.id, value)}
                          >
                            <SelectTrigger className="w-[120px]">
                              <SelectValue>
                                {getStatusBadge(review.status)}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {REVIEW_STATUS.map(status => (
                                <SelectItem key={status.value} value={status.value}>
                                  {status.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        
                        <TableCell>
                          <Select 
                            value={review.priority} 
                            onValueChange={(value) => handleUpdatePriority(review.id, value)}
                          >
                            <SelectTrigger className="w-[100px]">
                              <SelectValue>
                                {getPriorityBadge(review.priority)}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {PRIORITY_LEVELS.map(priority => (
                                <SelectItem key={priority.value} value={priority.value}>
                                  {priority.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        
                        <TableCell>
                          <div className="text-sm">
                            {new Date(review.created_at).toLocaleDateString()}
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedReview(review);
                                setIsResponseDialogOpen(true);
                              }}
                            >
                              <Reply className="h-4 w-4" />
                            </Button>
                            
                            <Switch
                              checked={review.is_public}
                              onCheckedChange={(checked) => handleTogglePublic(review.id, checked)}
                              title="Make public"
                            />
                            
                            <Switch
                              checked={review.is_featured}
                              onCheckedChange={(checked) => handleToggleFeatured(review.id, checked)}
                              title="Feature review"
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="new" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>New Reviews Requiring Attention</CardTitle>
              <CardDescription>
                Reviews that haven't been reviewed or responded to yet
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {reviews.filter(r => r.status === 'new').map((review) => (
                  <Card key={review.id} className="border-l-4 border-l-orange-500">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <CardTitle className="text-lg">{review.title}</CardTitle>
                          <CardDescription>
                            By {review.reviewer_name} • {new Date(review.created_at).toLocaleDateString()}
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          {review.rating && (
                            <div className="flex items-center gap-1">
                              {getRatingStars(review.rating)}
                            </div>
                          )}
                          {getPriorityBadge(review.priority)}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground mb-4">{review.content}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{review.review_type}</Badge>
                          <Badge variant="outline">{review.client_type}</Badge>
                        </div>
                        <Button
                          onClick={() => {
                            setSelectedReview(review);
                            setIsResponseDialogOpen(true);
                          }}
                        >
                          <Reply className="h-4 w-4 mr-2" />
                          Respond
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Reviews by Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(analytics.byStatus).map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getStatusBadge(status)}
                      </div>
                      <span className="font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Reviews by Type</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(analytics.byType).map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between">
                      <span className="capitalize">
                        {REVIEW_TYPES.find(t => t.value === type)?.label || type}
                      </span>
                      <span className="font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Response Dialog */}
      <Dialog open={isResponseDialogOpen} onOpenChange={setIsResponseDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Respond to Review</DialogTitle>
            <DialogDescription>
              Send a response to {selectedReview?.reviewer_name}'s review
            </DialogDescription>
          </DialogHeader>
          
          {selectedReview && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">{selectedReview.title}</h4>
                <p className="text-sm text-muted-foreground mb-2">{selectedReview.content}</p>
                {selectedReview.rating && (
                  <div className="flex items-center gap-1">
                    {getRatingStars(selectedReview.rating)}
                  </div>
                )}
              </div>
              
              <div>
                <Label htmlFor="response">Your Response</Label>
                <Textarea
                  id="response"
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                  placeholder="Write your response..."
                  rows={4}
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="public-response"
                  checked={isPublicResponse}
                  onCheckedChange={setIsPublicResponse}
                />
                <Label htmlFor="public-response">Make this response public</Label>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsResponseDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSendResponse} disabled={!responseText.trim()}>
                  Send Response
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReviewManagement;