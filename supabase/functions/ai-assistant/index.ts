import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name',
};

const SYSTEM_KNOWLEDGE = `
You are VibePOS Assistant, an expert AI helper for the VibePOS business management system. You have comprehensive knowledge of every feature and capability.

## CORE SYSTEM MODULES:

### POINT OF SALE (POS)
- Complete POS interface for processing transactions
- Support for cash, card, and mixed payments
- Receipt generation and printing
- Tax calculations and applications
- Discount and promotion applications
- Customer assignment to sales
- Product search and barcode scanning
- Return and refund processing

### PRODUCT MANAGEMENT
- Complete product catalog management
- Product variants (size, color, etc.)
- Stock quantity tracking and alerts
- Product categories and organization
- Pricing and cost management
- Barcode generation and management
- Product images and descriptions
- Bulk import/export capabilities

### INVENTORY MANAGEMENT
- Real-time stock tracking
- Low stock alerts and notifications
- Stock adjustments and corrections
- Stock transfers between locations
- Stock taking and audits
- Purchase order management
- Supplier management
- Reorder point automation

### CUSTOMER MANAGEMENT
- Customer profiles and contact information
- Purchase history and analytics
- Customer statements and credit tracking
- Customer groups and segmentation
- Customer communications
- Loyalty program integration

### SALES & REPORTING
- Comprehensive sales analytics
- Daily, weekly, monthly reports
- Top products and performance metrics
- Sales trends and forecasting
- Profit margin analysis
- Staff performance reports
- Customer analytics
- Tax reporting

### ACCOUNTING INTEGRATION
- Chart of accounts management
- Accounts receivable and payable
- Financial statements generation
- Transaction recording and posting
- Journal entries
- Tax calculations and reporting
- Account balance reconciliation

### USER & TEAM MANAGEMENT
- Role-based access control
- Staff accounts and permissions
- Activity logging and monitoring
- User invitations and onboarding
- Performance tracking

### BUSINESS SETTINGS
- Company information setup
- Tax configuration
- Currency and regional settings
- Receipt customization
- Notification preferences
- Domain management
- Billing and subscription management

## NAVIGATION PATHS:
- Dashboard: /admin
- POS System: /pos
- Products: /admin/products
- Customers: /admin/customers
- Sales: /admin/sales
- Purchases: /admin/purchases
- Reports: /admin/reports
- Accounting: /admin/accounting
- Team: /admin/team
- Settings: /admin/settings

## BILLING & SUBSCRIPTIONS:
- Multiple billing plans available
- Monthly billing on the 1st of each month
- Prorated billing for mid-month signups
- Feature restrictions based on plan
- Trial periods available
- Payment processing via Paystack

## KEY FEATURES TO HIGHLIGHT:
- Real-time inventory tracking
- Comprehensive reporting suite
- Multi-user access with role management
- Cloud-based with real-time sync
- Mobile-responsive design
- Secure payment processing
- Automated accounting integration
- Custom receipt templates
- Low stock notifications
- Customer analytics

Always provide specific, actionable guidance. When users ask about features, explain both what they can do and how to access them. Help users navigate to the right sections and understand the full capabilities of their business management system.

Be conversational, helpful, and demonstrate deep knowledge of business operations and how VibePOS solves common business challenges.
`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, context } = await req.json();

    if (!message) {
      throw new Error('Message is required');
    }

    if (!openAIApiKey) {
      throw new Error('OpenAI API key is not configured. Please contact your administrator.');
    }

    // Build contextual system prompt
    let contextualPrompt = SYSTEM_KNOWLEDGE;
    
    if (context?.currentRoute) {
      contextualPrompt += `\n\nCURRENT PAGE: The user is currently on ${context.currentRoute}. Provide relevant help for this specific page when appropriate.`;
    }

    if (context?.userRole) {
      contextualPrompt += `\n\nUSER ROLE: The user has ${context.userRole} permissions. Tailor advice to their access level.`;
    }

    if (context?.businessData) {
      contextualPrompt += `\n\nBUSINESS CONTEXT: ${JSON.stringify(context.businessData, null, 2)}`;
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          {
            role: 'system',
            content: contextualPrompt
          },
          {
            role: 'user',
            content: message
          }
        ],
        functions: [
          {
            name: 'navigate_to_page',
            description: 'Navigate user to a specific page in the system',
            parameters: {
              type: 'object',
              properties: {
                route: {
                  type: 'string',
                  description: 'The route to navigate to (e.g., /admin/products, /pos, /admin/reports)'
                },
                reason: {
                  type: 'string',
                  description: 'Explanation of why navigating to this page will help'
                }
              },
              required: ['route', 'reason']
            }
          },
          {
            name: 'show_feature_guide',
            description: 'Show a step-by-step guide for using a specific feature',
            parameters: {
              type: 'object',
              properties: {
                feature: {
                  type: 'string',
                  description: 'The feature to explain (e.g., "adding products", "processing sales", "generating reports")'
                },
                steps: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Step-by-step instructions'
                }
              },
              required: ['feature', 'steps']
            }
          },
          {
            name: 'suggest_business_optimization',
            description: 'Suggest ways to optimize business operations based on current data',
            parameters: {
              type: 'object',
              properties: {
                area: {
                  type: 'string',
                  description: 'Business area to optimize (e.g., "inventory", "sales", "customer retention")'
                },
                suggestions: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Specific optimization suggestions'
                }
              },
              required: ['area', 'suggestions']
            }
          }
        ],
        function_call: 'auto',
        temperature: 0.7,
        max_tokens: 800
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const assistantMessage = data.choices[0].message;

    let result = {
      content: assistantMessage.content,
      function_call: null
    };

    // Handle function calls
    if (assistantMessage.function_call) {
      const functionName = assistantMessage.function_call.name;
      const functionArgs = JSON.parse(assistantMessage.function_call.arguments);
      
      result.function_call = {
        name: functionName,
        arguments: functionArgs
      };
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in AI assistant function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      content: "I'm having trouble processing your request right now. Please try asking something else or contact support if this continues."
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});