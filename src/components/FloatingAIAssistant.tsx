import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  MessageCircle, 
  X, 
  Send, 
  Bot, 
  User, 
  Minimize2, 
  Maximize2,
  Loader2,
  ExternalLink,
  Lightbulb,
  Navigation
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  functionCall?: {
    name: string;
    arguments: any;
  };
  navigationAction?: {
    route: string;
    reason: string;
  };
  featureGuide?: {
    feature: string;
    steps: string[];
  };
  businessSuggestion?: {
    area: string;
    suggestions: string[];
  };
}

interface FloatingAIAssistantProps {
  className?: string;
}

export function FloatingAIAssistant({ className = '' }: FloatingAIAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: 'Hello! I\'m your VibePOS AI assistant with deep knowledge of every system feature. I can help you with:\n\n• Sales and POS operations\n• Inventory and product management\n• Customer analytics and insights\n• Financial reporting and accounting\n• Business optimization strategies\n• Feature navigation and tutorials\n\nWhat would you like to explore today?',
      role: 'assistant',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { user, tenantId } = useAuth();
  const { formatCurrency } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && !isMinimized && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, isMinimized]);

  const getCurrentPageContext = () => {
    const path = location.pathname;
    const contextMap: Record<string, string> = {
      '/admin': 'Main Dashboard - viewing business overview and key metrics',
      '/pos': 'Point of Sale - processing transactions and sales',
      '/admin/products': 'Product Management - managing inventory and catalog',
      '/admin/customers': 'Customer Management - handling customer relationships',
      '/admin/sales': 'Sales Management - tracking and managing sales',
      '/admin/purchases': 'Purchase Management - managing supplier orders',
      '/admin/reports': 'Reports & Analytics - business intelligence and insights',
      '/admin/accounting': 'Accounting - financial management and reporting',
      '/admin/team': 'Team Management - user and role administration',
      '/admin/settings': 'Business Settings - configuration and preferences'
    };
    return contextMap[path] || `Custom page: ${path}`;
  };

  const getBusinessContext = async () => {
    if (!tenantId) return null;

    try {
      // Fetch current business data for context
      const today = new Date().toISOString().split('T')[0];
      
      const [salesData, productsData, customersData] = await Promise.all([
        supabase
          .from('sales')
          .select('total_amount')
          .eq('tenant_id', tenantId)
          .gte('created_at', today),
        supabase
          .from('products')
          .select('id, stock_quantity, min_stock_level')
          .eq('tenant_id', tenantId)
          .eq('is_active', true),
        supabase
          .from('customers')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', tenantId)
      ]);

      const todayRevenue = salesData.data?.reduce((sum, sale) => sum + Number(sale.total_amount), 0) || 0;
      const lowStockProducts = productsData.data?.filter(p => 
        p.stock_quantity <= p.min_stock_level && p.min_stock_level > 0
      ).length || 0;

      return {
        todayRevenue: formatCurrency(todayRevenue),
        totalProducts: productsData.data?.length || 0,
        totalCustomers: customersData.count || 0,
        lowStockCount: lowStockProducts,
        hasLowStock: lowStockProducts > 0,
        hasSalesToday: todayRevenue > 0
      };
    } catch (error) {
      console.error('Error fetching business context:', error);
      return null;
    }
  };

  const handleNavigationAction = (route: string, reason: string) => {
    navigate(route);
    toast({
      title: "Navigation",
      description: reason,
      duration: 4000,
    });
  };

  const renderFunctionCallResponse = (message: Message) => {
    if (message.navigationAction) {
      return (
        <Alert className="mt-2">
          <Navigation className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{message.navigationAction.reason}</span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleNavigationAction(message.navigationAction!.route, message.navigationAction!.reason)}
              className="ml-2"
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              Go there
            </Button>
          </AlertDescription>
        </Alert>
      );
    }

    if (message.featureGuide) {
      return (
        <Alert className="mt-2">
          <Lightbulb className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">How to {message.featureGuide.feature}:</p>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                {message.featureGuide.steps.map((step, index) => (
                  <li key={index}>{step}</li>
                ))}
              </ol>
            </div>
          </AlertDescription>
        </Alert>
      );
    }

    if (message.businessSuggestion) {
      return (
        <Alert className="mt-2">
          <Lightbulb className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">Optimization suggestions for {message.businessSuggestion.area}:</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                {message.businessSuggestion.suggestions.map((suggestion, index) => (
                  <li key={index}>{suggestion}</li>
                ))}
              </ul>
            </div>
          </AlertDescription>
        </Alert>
      );
    }

    return null;
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input.trim(),
      role: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = input.trim();
    setInput('');
    setIsLoading(true);

    try {
      // Get current context
      const businessContext = await getBusinessContext();
      const pageContext = getCurrentPageContext();

      const context = {
        currentRoute: location.pathname,
        pageDescription: pageContext,
        userRole: user?.user_metadata?.role || 'user',
        businessData: businessContext,
        tenantId: tenantId
      };

      console.log('Sending context to AI:', context);

      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: {
          message: currentInput,
          context: context
        }
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw new Error(error.message || 'Failed to send a request to the Edge Function');
      }

      let assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: data.content || "I'm here to help! Could you rephrase your question?",
        role: 'assistant',
        timestamp: new Date()
      };

      // Handle function calls
      if (data.function_call) {
        const { name, arguments: args } = data.function_call;
        
        switch (name) {
          case 'navigate_to_page':
            assistantMessage.navigationAction = {
              route: args.route,
              reason: args.reason
            };
            break;
          case 'show_feature_guide':
            assistantMessage.featureGuide = {
              feature: args.feature,
              steps: args.steps
            };
            break;
          case 'suggest_business_optimization':
            assistantMessage.businessSuggestion = {
              area: args.area,
              suggestions: args.suggestions
            };
            break;
        }
        
        assistantMessage.functionCall = data.function_call;
      }

      setMessages(prev => [...prev, assistantMessage]);

    } catch (error) {
      console.error('AI Assistant Error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "I apologize, but I'm having trouble processing your request right now. Please try again or rephrase your question.",
        role: 'assistant',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      
      toast({
        title: "AI Assistant Error",
        description: "There was an issue processing your request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isOpen) {
    return (
      <div className={`fixed bottom-6 right-6 z-50 ${className}`}>
        <Button
          onClick={() => setIsOpen(true)}
          size="lg"
          className="rounded-full h-14 w-14 bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
        <Badge 
          variant="secondary" 
          className="absolute -top-2 -left-2 bg-blue-500 text-white border-white border-2 animate-pulse"
        >
          AI
        </Badge>
      </div>
    );
  }

  return (
    <div className={`fixed bottom-6 right-6 z-50 ${className}`}>
      <Card className={`shadow-xl border-2 transition-all duration-300 ${
        isMinimized ? 'w-80 h-16' : 'w-96 h-[500px]'
      }`}>
        <CardHeader className="pb-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <Bot className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold">VibePOS AI Assistant</CardTitle>
                <p className="text-xs text-muted-foreground">Smart business helper</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMinimized(!isMinimized)}
                className="h-8 w-8 p-0"
              >
                {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        {!isMinimized && (
          <CardContent className="p-0 flex flex-col h-[calc(500px-72px)]">
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div key={message.id}>
                    <div
                      className={`flex gap-2 ${
                        message.role === 'user' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      {message.role === 'assistant' && (
                        <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-1">
                          <Bot className="h-3 w-3 text-blue-600" />
                        </div>
                      )}
                      <div
                        className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                          message.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        <div className="whitespace-pre-wrap">{message.content}</div>
                        <div className={`text-xs mt-1 opacity-70 ${
                          message.role === 'user' ? 'text-primary-foreground' : 'text-muted-foreground'
                        }`}>
                          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      {message.role === 'user' && (
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                          <User className="h-3 w-3 text-primary" />
                        </div>
                      )}
                    </div>
                    {message.role === 'assistant' && renderFunctionCallResponse(message)}
                  </div>
                ))}
                {isLoading && (
                  <div className="flex gap-2 justify-start">
                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-1">
                      <Bot className="h-3 w-3 text-blue-600" />
                    </div>
                    <div className="bg-muted rounded-lg px-3 py-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span>Analyzing your request...</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            <div className="p-4 border-t bg-background">
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask about features, get business insights, or request help..."
                  className="flex-1"
                  disabled={isLoading}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!input.trim() || isLoading}
                  size="sm"
                  className="px-3"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Powered by AI with deep VibePOS knowledge
              </p>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}