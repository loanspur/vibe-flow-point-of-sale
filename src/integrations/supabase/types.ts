export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      account_types: {
        Row: {
          category: string
          created_at: string
          id: string
          is_active: boolean | null
          name: string
          parent_id: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          name: string
          parent_id?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          name?: string
          parent_id?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_types_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "account_types"
            referencedColumns: ["id"]
          },
        ]
      }
      accounting_entries: {
        Row: {
          account_id: string
          created_at: string
          credit_amount: number | null
          debit_amount: number | null
          description: string | null
          id: string
          transaction_id: string
        }
        Insert: {
          account_id: string
          created_at?: string
          credit_amount?: number | null
          debit_amount?: number | null
          description?: string | null
          id?: string
          transaction_id: string
        }
        Update: {
          account_id?: string
          created_at?: string
          credit_amount?: number | null
          debit_amount?: number | null
          description?: string | null
          id?: string
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounting_entries_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_entries_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "accounting_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      accounting_transactions: {
        Row: {
          created_at: string
          created_by: string
          description: string
          id: string
          is_posted: boolean | null
          reference_id: string | null
          reference_type: string | null
          tenant_id: string
          total_amount: number
          transaction_date: string
          transaction_number: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description: string
          id?: string
          is_posted?: boolean | null
          reference_id?: string | null
          reference_type?: string | null
          tenant_id: string
          total_amount?: number
          transaction_date?: string
          transaction_number: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string
          id?: string
          is_posted?: boolean | null
          reference_id?: string | null
          reference_type?: string | null
          tenant_id?: string
          total_amount?: number
          transaction_date?: string
          transaction_number?: string
          updated_at?: string
        }
        Relationships: []
      }
      accounts: {
        Row: {
          account_type_id: string
          balance: number | null
          code: string
          created_at: string
          id: string
          is_active: boolean | null
          name: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          account_type_id: string
          balance?: number | null
          code: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          name: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          account_type_id?: string
          balance?: number | null
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          name?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_account_type_id_fkey"
            columns: ["account_type_id"]
            isOneToOne: false
            referencedRelation: "account_types"
            referencedColumns: ["id"]
          },
        ]
      }
      business_settings: {
        Row: {
          account_lockout_duration: number | null
          address_line_1: string | null
          address_line_2: string | null
          auto_generate_sku: boolean | null
          business_hours: Json | null
          business_registration_number: string | null
          city: string | null
          company_logo_url: string | null
          company_name: string | null
          country: string | null
          created_at: string
          currency_code: string | null
          currency_symbol: string | null
          daily_reports: boolean | null
          date_format: string | null
          default_markup_percentage: number | null
          default_tax_rate: number | null
          delivery_note_auto_number: boolean | null
          delivery_note_prefix: string | null
          delivery_note_template: string | null
          email: string | null
          email_enable_ssl: boolean | null
          email_from_address: string | null
          email_from_name: string | null
          email_notifications: boolean | null
          email_smtp_host: string | null
          email_smtp_password: string | null
          email_smtp_port: number | null
          email_smtp_username: string | null
          enable_barcode_scanning: boolean | null
          enable_combo_products: boolean | null
          enable_gift_cards: boolean | null
          enable_loyalty_program: boolean | null
          enable_multi_location: boolean | null
          enable_negative_stock: boolean | null
          enable_online_orders: boolean | null
          enable_retail_pricing: boolean | null
          enable_user_roles: boolean | null
          enable_wholesale_pricing: boolean | null
          id: string
          invoice_auto_number: boolean | null
          invoice_number_prefix: string | null
          invoice_template: string | null
          invoice_terms_conditions: string | null
          low_stock_alerts: boolean | null
          low_stock_threshold: number | null
          max_login_attempts: number | null
          password_expiry_days: number | null
          phone: string | null
          pos_ask_customer_info: boolean | null
          pos_auto_print_receipt: boolean | null
          pos_default_payment_method: string | null
          pos_enable_discounts: boolean | null
          pos_enable_tips: boolean | null
          pos_max_discount_percent: number | null
          postal_code: string | null
          print_customer_copy: boolean | null
          print_merchant_copy: boolean | null
          purchase_auto_receive: boolean | null
          purchase_default_tax_rate: number | null
          purchase_enable_partial_receive: boolean | null
          quote_auto_number: boolean | null
          quote_number_prefix: string | null
          quote_template: string | null
          quote_validity_days: number | null
          receipt_footer: string | null
          receipt_header: string | null
          receipt_logo_url: string | null
          require_password_change: boolean | null
          session_timeout_minutes: number | null
          sms_api_key: string | null
          sms_enable_notifications: boolean | null
          sms_provider: string | null
          sms_sender_id: string | null
          state_province: string | null
          stock_accounting_method: string | null
          tax_identification_number: string | null
          tax_inclusive: boolean | null
          tax_name: string | null
          tenant_id: string
          timezone: string | null
          updated_at: string
          website: string | null
          whatsapp_api_key: string | null
          whatsapp_api_url: string | null
          whatsapp_enable_notifications: boolean | null
          whatsapp_phone_number: string | null
        }
        Insert: {
          account_lockout_duration?: number | null
          address_line_1?: string | null
          address_line_2?: string | null
          auto_generate_sku?: boolean | null
          business_hours?: Json | null
          business_registration_number?: string | null
          city?: string | null
          company_logo_url?: string | null
          company_name?: string | null
          country?: string | null
          created_at?: string
          currency_code?: string | null
          currency_symbol?: string | null
          daily_reports?: boolean | null
          date_format?: string | null
          default_markup_percentage?: number | null
          default_tax_rate?: number | null
          delivery_note_auto_number?: boolean | null
          delivery_note_prefix?: string | null
          delivery_note_template?: string | null
          email?: string | null
          email_enable_ssl?: boolean | null
          email_from_address?: string | null
          email_from_name?: string | null
          email_notifications?: boolean | null
          email_smtp_host?: string | null
          email_smtp_password?: string | null
          email_smtp_port?: number | null
          email_smtp_username?: string | null
          enable_barcode_scanning?: boolean | null
          enable_combo_products?: boolean | null
          enable_gift_cards?: boolean | null
          enable_loyalty_program?: boolean | null
          enable_multi_location?: boolean | null
          enable_negative_stock?: boolean | null
          enable_online_orders?: boolean | null
          enable_retail_pricing?: boolean | null
          enable_user_roles?: boolean | null
          enable_wholesale_pricing?: boolean | null
          id?: string
          invoice_auto_number?: boolean | null
          invoice_number_prefix?: string | null
          invoice_template?: string | null
          invoice_terms_conditions?: string | null
          low_stock_alerts?: boolean | null
          low_stock_threshold?: number | null
          max_login_attempts?: number | null
          password_expiry_days?: number | null
          phone?: string | null
          pos_ask_customer_info?: boolean | null
          pos_auto_print_receipt?: boolean | null
          pos_default_payment_method?: string | null
          pos_enable_discounts?: boolean | null
          pos_enable_tips?: boolean | null
          pos_max_discount_percent?: number | null
          postal_code?: string | null
          print_customer_copy?: boolean | null
          print_merchant_copy?: boolean | null
          purchase_auto_receive?: boolean | null
          purchase_default_tax_rate?: number | null
          purchase_enable_partial_receive?: boolean | null
          quote_auto_number?: boolean | null
          quote_number_prefix?: string | null
          quote_template?: string | null
          quote_validity_days?: number | null
          receipt_footer?: string | null
          receipt_header?: string | null
          receipt_logo_url?: string | null
          require_password_change?: boolean | null
          session_timeout_minutes?: number | null
          sms_api_key?: string | null
          sms_enable_notifications?: boolean | null
          sms_provider?: string | null
          sms_sender_id?: string | null
          state_province?: string | null
          stock_accounting_method?: string | null
          tax_identification_number?: string | null
          tax_inclusive?: boolean | null
          tax_name?: string | null
          tenant_id: string
          timezone?: string | null
          updated_at?: string
          website?: string | null
          whatsapp_api_key?: string | null
          whatsapp_api_url?: string | null
          whatsapp_enable_notifications?: boolean | null
          whatsapp_phone_number?: string | null
        }
        Update: {
          account_lockout_duration?: number | null
          address_line_1?: string | null
          address_line_2?: string | null
          auto_generate_sku?: boolean | null
          business_hours?: Json | null
          business_registration_number?: string | null
          city?: string | null
          company_logo_url?: string | null
          company_name?: string | null
          country?: string | null
          created_at?: string
          currency_code?: string | null
          currency_symbol?: string | null
          daily_reports?: boolean | null
          date_format?: string | null
          default_markup_percentage?: number | null
          default_tax_rate?: number | null
          delivery_note_auto_number?: boolean | null
          delivery_note_prefix?: string | null
          delivery_note_template?: string | null
          email?: string | null
          email_enable_ssl?: boolean | null
          email_from_address?: string | null
          email_from_name?: string | null
          email_notifications?: boolean | null
          email_smtp_host?: string | null
          email_smtp_password?: string | null
          email_smtp_port?: number | null
          email_smtp_username?: string | null
          enable_barcode_scanning?: boolean | null
          enable_combo_products?: boolean | null
          enable_gift_cards?: boolean | null
          enable_loyalty_program?: boolean | null
          enable_multi_location?: boolean | null
          enable_negative_stock?: boolean | null
          enable_online_orders?: boolean | null
          enable_retail_pricing?: boolean | null
          enable_user_roles?: boolean | null
          enable_wholesale_pricing?: boolean | null
          id?: string
          invoice_auto_number?: boolean | null
          invoice_number_prefix?: string | null
          invoice_template?: string | null
          invoice_terms_conditions?: string | null
          low_stock_alerts?: boolean | null
          low_stock_threshold?: number | null
          max_login_attempts?: number | null
          password_expiry_days?: number | null
          phone?: string | null
          pos_ask_customer_info?: boolean | null
          pos_auto_print_receipt?: boolean | null
          pos_default_payment_method?: string | null
          pos_enable_discounts?: boolean | null
          pos_enable_tips?: boolean | null
          pos_max_discount_percent?: number | null
          postal_code?: string | null
          print_customer_copy?: boolean | null
          print_merchant_copy?: boolean | null
          purchase_auto_receive?: boolean | null
          purchase_default_tax_rate?: number | null
          purchase_enable_partial_receive?: boolean | null
          quote_auto_number?: boolean | null
          quote_number_prefix?: string | null
          quote_template?: string | null
          quote_validity_days?: number | null
          receipt_footer?: string | null
          receipt_header?: string | null
          receipt_logo_url?: string | null
          require_password_change?: boolean | null
          session_timeout_minutes?: number | null
          sms_api_key?: string | null
          sms_enable_notifications?: boolean | null
          sms_provider?: string | null
          sms_sender_id?: string | null
          state_province?: string | null
          stock_accounting_method?: string | null
          tax_identification_number?: string | null
          tax_inclusive?: boolean | null
          tax_name?: string | null
          tenant_id?: string
          timezone?: string | null
          updated_at?: string
          website?: string | null
          whatsapp_api_key?: string | null
          whatsapp_api_url?: string | null
          whatsapp_enable_notifications?: boolean | null
          whatsapp_phone_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_agents: {
        Row: {
          commission_rate: number
          commission_type: string
          contact_id: string
          created_at: string
          id: string
          is_active: boolean | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          commission_rate?: number
          commission_type?: string
          contact_id: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          commission_rate?: number
          commission_type?: string
          contact_id?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commission_agents_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_agents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_transactions: {
        Row: {
          base_amount: number
          commission_agent_id: string
          commission_amount: number
          commission_date: string
          commission_rate: number
          created_at: string
          id: string
          notes: string | null
          payment_date: string | null
          sale_id: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          base_amount: number
          commission_agent_id: string
          commission_amount: number
          commission_date?: string
          commission_rate: number
          created_at?: string
          id?: string
          notes?: string | null
          payment_date?: string | null
          sale_id?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          base_amount?: number
          commission_agent_id?: string
          commission_amount?: number
          commission_date?: string
          commission_rate?: number
          created_at?: string
          id?: string
          notes?: string | null
          payment_date?: string | null
          sale_id?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commission_transactions_commission_agent_id_fkey"
            columns: ["commission_agent_id"]
            isOneToOne: false
            referencedRelation: "commission_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_transactions_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          address: string | null
          company: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          is_commission_agent: boolean | null
          name: string
          notes: string | null
          phone: string | null
          tenant_id: string | null
          type: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address?: string | null
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          is_commission_agent?: boolean | null
          name: string
          notes?: string | null
          phone?: string | null
          tenant_id?: string | null
          type: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: string | null
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          is_commission_agent?: boolean | null
          name?: string
          notes?: string | null
          phone?: string | null
          tenant_id?: string | null
          type?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      customers: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_periods: {
        Row: {
          created_at: string
          end_date: string
          fiscal_year: number
          id: string
          is_closed: boolean | null
          name: string
          period_type: string
          start_date: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_date: string
          fiscal_year: number
          id?: string
          is_closed?: boolean | null
          name: string
          period_type: string
          start_date: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_date?: string
          fiscal_year?: number
          id?: string
          is_closed?: boolean | null
          name?: string
          period_type?: string
          start_date?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      payment_methods: {
        Row: {
          created_at: string
          display_order: number | null
          id: string
          is_active: boolean | null
          name: string
          requires_reference: boolean | null
          tenant_id: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          requires_reference?: boolean | null
          tenant_id: string
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          requires_reference?: boolean | null
          tenant_id?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_methods_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          payment_method: string
          reference_number: string | null
          sale_id: string | null
          status: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          payment_method: string
          reference_number?: string | null
          sale_id?: string | null
          status?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          payment_method?: string
          reference_number?: string | null
          sale_id?: string | null
          status?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_categories: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_pricing: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          max_quantity: number | null
          min_quantity: number | null
          price: number
          pricing_type: string
          product_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          max_quantity?: number | null
          min_quantity?: number | null
          price: number
          pricing_type: string
          product_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          max_quantity?: number | null
          min_quantity?: number | null
          price?: number
          pricing_type?: string
          product_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_pricing_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_subcategories: {
        Row: {
          category_id: string
          created_at: string
          description: string | null
          id: string
          name: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_subcategories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_subcategories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          name: string
          price_adjustment: number | null
          product_id: string
          sku: string | null
          stock_quantity: number | null
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          name: string
          price_adjustment?: number | null
          product_id: string
          sku?: string | null
          stock_quantity?: number | null
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          name?: string
          price_adjustment?: number | null
          product_id?: string
          sku?: string | null
          stock_quantity?: number | null
          updated_at?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          barcode: string | null
          category_id: string | null
          cost: number | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          min_stock_level: number | null
          name: string
          price: number
          sku: string | null
          stock_quantity: number | null
          subcategory_id: string | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          barcode?: string | null
          category_id?: string | null
          cost?: number | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          min_stock_level?: number | null
          name: string
          price: number
          sku?: string | null
          stock_quantity?: number | null
          subcategory_id?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          barcode?: string | null
          category_id?: string | null
          cost?: number | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          min_stock_level?: number | null
          name?: string
          price?: number
          sku?: string | null
          stock_quantity?: number | null
          subcategory_id?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_products_category"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "product_subcategories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"] | null
          tenant_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"] | null
          tenant_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"] | null
          tenant_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_items: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          product_id: string
          purchase_id: string
          quantity_ordered: number
          quantity_received: number
          total_cost: number
          unit_cost: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          product_id: string
          purchase_id: string
          quantity_ordered: number
          quantity_received?: number
          total_cost: number
          unit_cost: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          product_id?: string
          purchase_id?: string
          quantity_ordered?: number
          quantity_received?: number
          total_cost?: number
          unit_cost?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_items_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      purchases: {
        Row: {
          created_at: string
          created_by: string
          expected_date: string | null
          id: string
          notes: string | null
          order_date: string
          purchase_number: string
          received_date: string | null
          status: string
          supplier_id: string
          tenant_id: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          expected_date?: string | null
          id?: string
          notes?: string | null
          order_date?: string
          purchase_number: string
          received_date?: string | null
          status?: string
          supplier_id: string
          tenant_id: string
          total_amount?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          expected_date?: string | null
          id?: string
          notes?: string | null
          order_date?: string
          purchase_number?: string
          received_date?: string | null
          status?: string
          supplier_id?: string
          tenant_id?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchases_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_items: {
        Row: {
          created_at: string
          id: string
          product_id: string | null
          quantity: number
          quote_id: string | null
          total_price: number
          unit_price: number
          variant_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          product_id?: string | null
          quantity: number
          quote_id?: string | null
          total_price: number
          unit_price: number
          variant_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string | null
          quantity?: number
          quote_id?: string | null
          total_price?: number
          unit_price?: number
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quote_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_items_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          cashier_id: string
          created_at: string
          customer_id: string | null
          discount_amount: number | null
          id: string
          notes: string | null
          quote_number: string
          status: string
          tax_amount: number | null
          tenant_id: string | null
          total_amount: number
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          cashier_id: string
          created_at?: string
          customer_id?: string | null
          discount_amount?: number | null
          id?: string
          notes?: string | null
          quote_number: string
          status?: string
          tax_amount?: number | null
          tenant_id?: string | null
          total_amount?: number
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          cashier_id?: string
          created_at?: string
          customer_id?: string | null
          discount_amount?: number | null
          id?: string
          notes?: string | null
          quote_number?: string
          status?: string
          tax_amount?: number | null
          tenant_id?: string | null
          total_amount?: number
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_items: {
        Row: {
          created_at: string
          id: string
          product_id: string
          quantity: number
          sale_id: string
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          quantity: number
          sale_id: string
          total_price: number
          unit_price: number
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          quantity?: number
          sale_id?: string
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          cashier_id: string
          created_at: string
          customer_id: string | null
          discount_amount: number | null
          id: string
          payment_method: string
          receipt_number: string
          status: string
          tax_amount: number | null
          tenant_id: string | null
          total_amount: number
          updated_at: string
        }
        Insert: {
          cashier_id: string
          created_at?: string
          customer_id?: string | null
          discount_amount?: number | null
          id?: string
          payment_method?: string
          receipt_number: string
          status?: string
          tax_amount?: number | null
          tenant_id?: string | null
          total_amount: number
          updated_at?: string
        }
        Update: {
          cashier_id?: string
          created_at?: string
          customer_id?: string | null
          discount_amount?: number | null
          id?: string
          payment_method?: string
          receipt_number?: string
          status?: string
          tax_amount?: number | null
          tenant_id?: string | null
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      store_locations: {
        Row: {
          address_line_1: string | null
          address_line_2: string | null
          city: string | null
          country: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean | null
          is_primary: boolean | null
          manager_name: string | null
          name: string
          phone: string | null
          postal_code: string | null
          state_province: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          address_line_1?: string | null
          address_line_2?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean | null
          is_primary?: boolean | null
          manager_name?: string | null
          name: string
          phone?: string | null
          postal_code?: string | null
          state_province?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          address_line_1?: string | null
          address_line_2?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean | null
          is_primary?: boolean | null
          manager_name?: string | null
          name?: string
          phone?: string | null
          postal_code?: string | null
          state_province?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_locations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      subscribers: {
        Row: {
          created_at: string
          email: string
          id: string
          is_trial: boolean
          stripe_customer_id: string | null
          subscribed: boolean
          subscription_end: string | null
          subscription_tier: string | null
          trial_end: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          is_trial?: boolean
          stripe_customer_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          trial_end?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_trial?: boolean
          stripe_customer_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          trial_end?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      system_notes: {
        Row: {
          created_at: string | null
          id: number
          note: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          note?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          note?: string | null
        }
        Relationships: []
      }
      tenant_users: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          role: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          role?: string
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          role?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          address: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          id: string
          is_active: boolean
          max_users: number | null
          name: string
          plan_type: string
          subdomain: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          max_users?: number | null
          name: string
          plan_type?: string
          subdomain?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          max_users?: number | null
          name?: string
          plan_type?: string
          subdomain?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_role_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          id: string
          is_active: boolean | null
          role_id: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          is_active?: boolean | null
          role_id: string
          tenant_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          is_active?: boolean | null
          role_id?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_role_assignments_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "user_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_role_assignments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          is_system_role: boolean | null
          name: string
          permissions: Json | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_system_role?: boolean | null
          name: string
          permissions?: Json | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_system_role?: boolean | null
          name?: string
          permissions?: Json | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_profit_loss: {
        Args: {
          tenant_id_param: string
          start_date_param: string
          end_date_param: string
        }
        Returns: {
          income: number
          expenses: number
          profit_loss: number
        }[]
      }
      calculate_purchase_total: {
        Args: { purchase_id_param: string }
        Returns: number
      }
      create_superadmin_profile: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      get_account_balance: {
        Args: { account_id_param: string; as_of_date?: string }
        Returns: number
      }
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: Database["public"]["Enums"]["user_role"]
      }
      get_user_contact_profile: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_user_tenant_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      is_tenant_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      link_user_to_contact: {
        Args: { contact_id: string }
        Returns: boolean
      }
      update_product_stock: {
        Args: { product_id: string; quantity_sold: number }
        Returns: undefined
      }
      update_variant_stock: {
        Args: { variant_id: string; quantity_sold: number }
        Returns: undefined
      }
    }
    Enums: {
      user_role: "superadmin" | "admin" | "manager" | "cashier" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      user_role: ["superadmin", "admin", "manager", "cashier", "user"],
    },
  },
} as const
