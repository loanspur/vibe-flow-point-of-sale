import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  MessageCircle, 
  X, 
  Send, 
  Bot, 
  User, 
  Minimize2, 
  Maximize2,
  Loader2
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
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
      content: 'Hello! I\'m your AI business assistant. I can help you with sales insights, inventory management, customer queries, and business analytics. How can I assist you today?',
      role: 'assistant',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
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

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input.trim(),
      role: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Simulate AI response with business context
      const responses = [
        "I can help you analyze your sales data. Would you like me to show you today's performance summary?",
        "To improve your inventory management, I recommend setting up automated low-stock alerts. Shall I guide you through this?",
        "Based on your business type, I suggest focusing on customer retention strategies. Would you like some specific recommendations?",
        "I notice you might want to optimize your product pricing. Let me help you analyze your profit margins.",
        "For better business insights, I recommend checking your reports section. Would you like me to explain the key metrics?",
        "Your POS system can track more detailed analytics. Shall I show you how to access advanced features?",
        "I can help you understand your customer behavior patterns. Would you like me to explain what to look for?",
        "Setting up automated billing reminders can improve cash flow. Let me guide you through the process."
      ];

      // Simple keyword-based response selection
      const lowercaseInput = input.toLowerCase();
      let response = responses[Math.floor(Math.random() * responses.length)];

      if (lowercaseInput.includes('sales') || lowercaseInput.includes('revenue')) {
        response = "I can help you analyze your sales performance. Check your dashboard for today's revenue trends, and consider using the reports section for detailed analytics.";
      } else if (lowercaseInput.includes('inventory') || lowercaseInput.includes('stock')) {
        response = "For inventory management, I recommend monitoring your low-stock alerts and setting up automatic reorder points. Would you like me to guide you to the inventory section?";
      } else if (lowercaseInput.includes('customer') || lowercaseInput.includes('client')) {
        response = "Customer management is key to business growth. You can track customer orders, contact information, and purchase history in the customers section. Need help navigating there?";
      } else if (lowercaseInput.includes('report') || lowercaseInput.includes('analytics')) {
        response = "Your reports section contains valuable business insights including sales trends, top products, and customer analytics. I can help you understand which metrics to focus on.";
      }

      setTimeout(() => {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: response,
          role: 'assistant',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, assistantMessage]);
        setIsLoading(false);
      }, 1000 + Math.random() * 1000);

    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to get AI response. Please try again.",
        variant: "destructive",
      });
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
                <CardTitle className="text-sm font-semibold">AI Business Assistant</CardTitle>
                <p className="text-xs text-muted-foreground">Online and ready to help</p>
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
                  <div
                    key={message.id}
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
                      {message.content}
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
                ))}
                {isLoading && (
                  <div className="flex gap-2 justify-start">
                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-1">
                      <Bot className="h-3 w-3 text-blue-600" />
                    </div>
                    <div className="bg-muted rounded-lg px-3 py-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span>AI is thinking...</span>
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
                  placeholder="Ask about sales, inventory, customers..."
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
                AI can make mistakes. Verify important information.
              </p>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}