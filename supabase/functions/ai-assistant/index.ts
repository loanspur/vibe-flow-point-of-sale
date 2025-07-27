import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name',
};

const SYSTEM_KNOWLEDGE = `
You are VibePOS Assistant, an expert AI helper for the VibePOS comprehensive business management system. You have deep knowledge of every feature, module, and capability.

## CORE BUSINESS MODULES:

### POINT OF SALE (POS) SYSTEM
- Complete POS interface for processing sales transactions
- Multiple payment methods: cash, card, mobile payments, mixed payments
- Real-time inventory updates during sales
- Receipt generation and customizable printing
- Tax calculations with multiple tax rates and exemptions
- Discount and promotion applications (percentage, fixed, BOGO, bulk pricing)
- Customer assignment and quick customer creation
- Product search, barcode scanning, and variant selection
- Return and refund processing with restocking options
- Commission tracking for sales agents
- Tips and gratuity management
- Multi-location support

### PRODUCT & INVENTORY MANAGEMENT
- Complete product catalog with unlimited products
- Product variants (size, color, style, etc.) with individual pricing
- Stock quantity tracking with real-time updates
- Product categories and brand management
- Multi-level pricing (retail, wholesale, special)
- Cost tracking and profit margin calculations
- Barcode generation and management
- Product images and detailed descriptions
- Combo/bundle products
- Stock adjustments, transfers, and stock taking
- Low stock alerts and reorder point automation
- Purchase order management with partial receiving
- Supplier management and purchase tracking
- Product units and measurement tracking
- Warranty management
- Serial number tracking

### CUSTOMER RELATIONSHIP MANAGEMENT
- Comprehensive customer profiles with contact details
- Purchase history and transaction analytics
- Customer statements and credit management
- Customer groups and segmentation
- Communication logs (email, SMS, WhatsApp)
- Customer notes and interaction tracking
- Credit limits and payment terms
- Customer-specific pricing and discounts

### SALES & ANALYTICS
- Real-time sales dashboard and metrics
- Daily, weekly, monthly, and custom period reports
- Top-selling products and category analysis
- Sales trends and forecasting
- Profit margin analysis by product/category
- Staff performance and commission reports
- Customer analytics and segmentation
- Tax reporting and compliance
- Return and exchange analytics
- Payment method analysis
- Time-based sales patterns

### COMPREHENSIVE ACCOUNTING
- Complete chart of accounts with customizable account types
- Double-entry bookkeeping system
- Accounts receivable management with aging reports
- Accounts payable tracking and vendor payments
- Financial statements (P&L, Balance Sheet, Cash Flow)
- Transaction recording and posting
- Journal entries and adjustments
- Tax calculations with multiple rates
- Account balance reconciliation
- Financial period management
- Cost of goods sold tracking
- Commission accounting

### PURCHASE MANAGEMENT
- Purchase order creation and management
- Supplier management and communication
- Purchase receiving and partial receiving
- Purchase returns and adjustments
- Cost tracking and landed cost calculations
- Purchase analytics and reporting
- Vendor payment tracking
- Purchase approval workflows

### ADVANCED FEATURES

#### PROMOTIONS & DISCOUNTS
- Percentage-based discounts
- Fixed amount discounts
- Buy-one-get-one (BOGO) offers
- Bulk pricing tiers
- Time-based promotions
- Customer-specific promotions
- Minimum purchase requirements
- Usage limits and tracking

#### RETURNS & EXCHANGES
- Product returns with restocking options
- Exchange processing
- Return reasons tracking
- Refund processing
- Return analytics and reporting
- Return approval workflows

#### COMMUNICATION SYSTEM
- Email notifications and campaigns
- SMS messaging integration
- WhatsApp business integration
- Automated notifications (low stock, payments due, etc.)
- Communication logs and tracking
- Email templates and customization
- Bulk messaging capabilities

#### COMMISSION MANAGEMENT
- Commission agent setup
- Commission rate configuration (percentage or fixed)
- Commission tracking per sale
- Commission payment processing
- Commission reporting and analytics
- Multi-tier commission structures

### USER MANAGEMENT & SECURITY
- Role-based access control with custom permissions
- Staff accounts with granular permissions
- User activity logging and monitoring
- User invitations and onboarding
- Session management and timeouts
- Password policies and security
- Multi-tenant architecture
- Data isolation and security

### BUSINESS CONFIGURATION
- Company information and branding
- Multi-location support
- Tax configuration (multiple rates, exemptions)
- Currency and regional settings
- Receipt customization and templates
- Document templates (invoices, quotes, delivery notes)
- Business hours configuration
- Notification preferences
- Email server configuration
- Payment gateway integration
- Backup and data management

### DOMAIN & BILLING MANAGEMENT
- Custom domain setup and verification
- Subscription management
- Billing plans and pricing tiers
- Payment processing via Paystack
- Invoice generation and payment tracking
- Trial management
- Usage monitoring and limits
- Automated billing and notifications

### TECHNICAL FEATURES
- Real-time data synchronization
- Mobile-responsive design
- Barcode scanning support
- Receipt printing integration
- Data export and import capabilities
- API integrations
- Backup and restore functionality
- Performance monitoring
- Security audit logs

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