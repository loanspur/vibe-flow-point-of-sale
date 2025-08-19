export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
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
      accounts_payable: {
        Row: {
          created_at: string
          due_date: string
          id: string
          invoice_date: string
          invoice_number: string
          notes: string | null
          original_amount: number
          outstanding_amount: number
          paid_amount: number
          reference_id: string | null
          reference_type: string | null
          status: string
          supplier_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          due_date: string
          id?: string
          invoice_date: string
          invoice_number: string
          notes?: string | null
          original_amount: number
          outstanding_amount: number
          paid_amount?: number
          reference_id?: string | null
          reference_type?: string | null
          status?: string
          supplier_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          due_date?: string
          id?: string
          invoice_date?: string
          invoice_number?: string
          notes?: string | null
          original_amount?: number
          outstanding_amount?: number
          paid_amount?: number
          reference_id?: string | null
          reference_type?: string | null
          status?: string
          supplier_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_payable_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_payable_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      accounts_receivable: {
        Row: {
          created_at: string
          customer_id: string
          due_date: string
          id: string
          invoice_date: string
          invoice_number: string
          notes: string | null
          original_amount: number
          outstanding_amount: number
          paid_amount: number
          reference_id: string | null
          reference_type: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          due_date: string
          id?: string
          invoice_date: string
          invoice_number: string
          notes?: string | null
          original_amount: number
          outstanding_amount: number
          paid_amount?: number
          reference_id?: string | null
          reference_type?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          due_date?: string
          id?: string
          invoice_date?: string
          invoice_number?: string
          notes?: string | null
          original_amount?: number
          outstanding_amount?: number
          paid_amount?: number
          reference_id?: string | null
          reference_type?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_receivable_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_receivable_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      application_versions: {
        Row: {
          breaking_changes: Json | null
          bugs_fixed: Json | null
          build_number: number | null
          changelog: Json | null
          created_at: string
          created_by: string | null
          features_added: Json | null
          git_commit_hash: string | null
          id: string
          is_current: boolean
          is_stable: boolean
          release_date: string
          release_notes: string | null
          updated_at: string
          version_name: string | null
          version_number: string
        }
        Insert: {
          breaking_changes?: Json | null
          bugs_fixed?: Json | null
          build_number?: number | null
          changelog?: Json | null
          created_at?: string
          created_by?: string | null
          features_added?: Json | null
          git_commit_hash?: string | null
          id?: string
          is_current?: boolean
          is_stable?: boolean
          release_date?: string
          release_notes?: string | null
          updated_at?: string
          version_name?: string | null
          version_number: string
        }
        Update: {
          breaking_changes?: Json | null
          bugs_fixed?: Json | null
          build_number?: number | null
          changelog?: Json | null
          created_at?: string
          created_by?: string | null
          features_added?: Json | null
          git_commit_hash?: string | null
          id?: string
          is_current?: boolean
          is_stable?: boolean
          release_date?: string
          release_notes?: string | null
          updated_at?: string
          version_name?: string | null
          version_number?: string
        }
        Relationships: []
      }
      ar_ap_payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          notes: string | null
          payment_date: string
          payment_method: string
          payment_type: string
          reference_id: string
          reference_number: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          notes?: string | null
          payment_date: string
          payment_method: string
          payment_type: string
          reference_id: string
          reference_number?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string
          payment_type?: string
          reference_id?: string
          reference_number?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      billing_notifications: {
        Row: {
          created_at: string
          email_sent_to: string
          id: string
          notification_date: string
          notification_type: string
          sent_at: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          email_sent_to: string
          id?: string
          notification_date: string
          notification_type: string
          sent_at?: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          email_sent_to?: string
          id?: string
          notification_date?: string
          notification_type?: string
          sent_at?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_plans: {
        Row: {
          add_ons: Json | null
          allows_prorating: boolean | null
          annual_discount_months: number | null
          annual_discount_percentage: number | null
          arpu: number | null
          badge: string | null
          badge_color: string | null
          billing_day: number | null
          churn_rate: number | null
          conversion_rate: number | null
          created_at: string
          created_by: string | null
          currency: string | null
          customers: number | null
          description: string | null
          discounts: Json | null
          display_order: number | null
          features: Json | null
          id: string
          is_active: boolean | null
          mrr: number | null
          name: string
          original_price: number | null
          period: string
          popularity: number | null
          price: number
          pricing: Json | null
          pricing_config: Json | null
          proration_policy: string | null
          status: string
          tenant_id: string | null
          trial_conversion: number | null
          updated_at: string
        }
        Insert: {
          add_ons?: Json | null
          allows_prorating?: boolean | null
          annual_discount_months?: number | null
          annual_discount_percentage?: number | null
          arpu?: number | null
          badge?: string | null
          badge_color?: string | null
          billing_day?: number | null
          churn_rate?: number | null
          conversion_rate?: number | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          customers?: number | null
          description?: string | null
          discounts?: Json | null
          display_order?: number | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          mrr?: number | null
          name: string
          original_price?: number | null
          period?: string
          popularity?: number | null
          price?: number
          pricing?: Json | null
          pricing_config?: Json | null
          proration_policy?: string | null
          status?: string
          tenant_id?: string | null
          trial_conversion?: number | null
          updated_at?: string
        }
        Update: {
          add_ons?: Json | null
          allows_prorating?: boolean | null
          annual_discount_months?: number | null
          annual_discount_percentage?: number | null
          arpu?: number | null
          badge?: string | null
          badge_color?: string | null
          billing_day?: number | null
          churn_rate?: number | null
          conversion_rate?: number | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          customers?: number | null
          description?: string | null
          discounts?: Json | null
          display_order?: number | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          mrr?: number | null
          name?: string
          original_price?: number | null
          period?: string
          popularity?: number | null
          price?: number
          pricing?: Json | null
          pricing_config?: Json | null
          proration_policy?: string | null
          status?: string
          tenant_id?: string | null
          trial_conversion?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      brands: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          name: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
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
          enable_brands: boolean | null
          enable_combo_products: boolean | null
          enable_fixed_pricing: boolean | null
          enable_gift_cards: boolean | null
          enable_loyalty_program: boolean | null
          enable_multi_location: boolean | null
          enable_negative_stock: boolean | null
          enable_online_orders: boolean | null
          enable_overselling: boolean | null
          enable_product_units: boolean | null
          enable_retail_pricing: boolean | null
          enable_user_roles: boolean | null
          enable_warranty: boolean | null
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
          receipt_template: string | null
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
          use_global_whatsapp: boolean | null
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
          enable_brands?: boolean | null
          enable_combo_products?: boolean | null
          enable_fixed_pricing?: boolean | null
          enable_gift_cards?: boolean | null
          enable_loyalty_program?: boolean | null
          enable_multi_location?: boolean | null
          enable_negative_stock?: boolean | null
          enable_online_orders?: boolean | null
          enable_overselling?: boolean | null
          enable_product_units?: boolean | null
          enable_retail_pricing?: boolean | null
          enable_user_roles?: boolean | null
          enable_warranty?: boolean | null
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
          receipt_template?: string | null
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
          use_global_whatsapp?: boolean | null
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
          enable_brands?: boolean | null
          enable_combo_products?: boolean | null
          enable_fixed_pricing?: boolean | null
          enable_gift_cards?: boolean | null
          enable_loyalty_program?: boolean | null
          enable_multi_location?: boolean | null
          enable_negative_stock?: boolean | null
          enable_online_orders?: boolean | null
          enable_overselling?: boolean | null
          enable_product_units?: boolean | null
          enable_retail_pricing?: boolean | null
          enable_user_roles?: boolean | null
          enable_warranty?: boolean | null
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
          receipt_template?: string | null
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
          use_global_whatsapp?: boolean | null
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
      career_applications: {
        Row: {
          availability: string | null
          bio: string | null
          created_at: string
          email: string
          experience_years: number | null
          full_name: string
          id: string
          linkedin_url: string | null
          phone: string | null
          portfolio_url: string | null
          position_type: string
          resume_url: string | null
          salary_expectation: string | null
          skills: string[] | null
          updated_at: string
        }
        Insert: {
          availability?: string | null
          bio?: string | null
          created_at?: string
          email: string
          experience_years?: number | null
          full_name: string
          id?: string
          linkedin_url?: string | null
          phone?: string | null
          portfolio_url?: string | null
          position_type: string
          resume_url?: string | null
          salary_expectation?: string | null
          skills?: string[] | null
          updated_at?: string
        }
        Update: {
          availability?: string | null
          bio?: string | null
          created_at?: string
          email?: string
          experience_years?: number | null
          full_name?: string
          id?: string
          linkedin_url?: string | null
          phone?: string | null
          portfolio_url?: string | null
          position_type?: string
          resume_url?: string | null
          salary_expectation?: string | null
          skills?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      cash_bank_transfer_requests: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          bank_account_name: string
          cash_drawer_id: string
          created_at: string
          id: string
          reason: string | null
          reference_number: string | null
          requested_by: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          bank_account_name: string
          cash_drawer_id: string
          created_at?: string
          id?: string
          reason?: string | null
          reference_number?: string | null
          requested_by: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          bank_account_name?: string
          cash_drawer_id?: string
          created_at?: string
          id?: string
          reason?: string | null
          reference_number?: string | null
          requested_by?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_bank_transfer_requests_cash_drawer_id_fkey"
            columns: ["cash_drawer_id"]
            isOneToOne: false
            referencedRelation: "cash_drawers"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_drawers: {
        Row: {
          closed_at: string | null
          created_at: string
          current_balance: number
          drawer_name: string
          id: string
          is_active: boolean
          location_name: string | null
          opened_at: string | null
          opening_balance: number
          status: string
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          closed_at?: string | null
          created_at?: string
          current_balance?: number
          drawer_name?: string
          id?: string
          is_active?: boolean
          location_name?: string | null
          opened_at?: string | null
          opening_balance?: number
          status?: string
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          closed_at?: string | null
          created_at?: string
          current_balance?: number
          drawer_name?: string
          id?: string
          is_active?: boolean
          location_name?: string | null
          opened_at?: string | null
          opening_balance?: number
          status?: string
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      cash_transactions: {
        Row: {
          amount: number
          approved_by: string | null
          balance_after: number
          cash_drawer_id: string
          created_at: string
          description: string
          id: string
          performed_by: string
          reference_id: string | null
          reference_type: string | null
          tenant_id: string
          transaction_date: string
          transaction_type: string
        }
        Insert: {
          amount: number
          approved_by?: string | null
          balance_after: number
          cash_drawer_id: string
          created_at?: string
          description: string
          id?: string
          performed_by: string
          reference_id?: string | null
          reference_type?: string | null
          tenant_id: string
          transaction_date?: string
          transaction_type: string
        }
        Update: {
          amount?: number
          approved_by?: string | null
          balance_after?: number
          cash_drawer_id?: string
          created_at?: string
          description?: string
          id?: string
          performed_by?: string
          reference_id?: string | null
          reference_type?: string | null
          tenant_id?: string
          transaction_date?: string
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_transactions_cash_drawer_id_fkey"
            columns: ["cash_drawer_id"]
            isOneToOne: false
            referencedRelation: "cash_drawers"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_transfer_requests: {
        Row: {
          amount: number
          created_at: string
          from_drawer_id: string
          from_user_id: string
          id: string
          notes: string | null
          reason: string | null
          requested_at: string
          responded_at: string | null
          responded_by: string | null
          status: string
          tenant_id: string
          to_drawer_id: string
          to_user_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          from_drawer_id: string
          from_user_id: string
          id?: string
          notes?: string | null
          reason?: string | null
          requested_at?: string
          responded_at?: string | null
          responded_by?: string | null
          status?: string
          tenant_id: string
          to_drawer_id: string
          to_user_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          from_drawer_id?: string
          from_user_id?: string
          id?: string
          notes?: string | null
          reason?: string | null
          requested_at?: string
          responded_at?: string | null
          responded_by?: string | null
          status?: string
          tenant_id?: string
          to_drawer_id?: string
          to_user_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_transfer_requests_from_drawer_id_fkey"
            columns: ["from_drawer_id"]
            isOneToOne: false
            referencedRelation: "cash_drawers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_transfer_requests_to_drawer_id_fkey"
            columns: ["to_drawer_id"]
            isOneToOne: false
            referencedRelation: "cash_drawers"
            referencedColumns: ["id"]
          },
        ]
      }
      client_reviews: {
        Row: {
          category: string | null
          client_type: string
          cons: string | null
          contact_id: string | null
          content: string
          created_at: string
          id: string
          is_featured: boolean | null
          is_public: boolean | null
          metadata: Json | null
          priority: string
          pros: string | null
          rating: number | null
          responded_at: string | null
          responded_by: string | null
          review_type: string
          reviewed_at: string | null
          reviewed_by: string | null
          reviewer_company: string | null
          reviewer_email: string
          reviewer_name: string
          reviewer_phone: string | null
          source: string
          status: string
          tags: Json | null
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          client_type: string
          cons?: string | null
          contact_id?: string | null
          content: string
          created_at?: string
          id?: string
          is_featured?: boolean | null
          is_public?: boolean | null
          metadata?: Json | null
          priority?: string
          pros?: string | null
          rating?: number | null
          responded_at?: string | null
          responded_by?: string | null
          review_type: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_company?: string | null
          reviewer_email: string
          reviewer_name: string
          reviewer_phone?: string | null
          source: string
          status?: string
          tags?: Json | null
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          client_type?: string
          cons?: string | null
          contact_id?: string | null
          content?: string
          created_at?: string
          id?: string
          is_featured?: boolean | null
          is_public?: boolean | null
          metadata?: Json | null
          priority?: string
          pros?: string | null
          rating?: number | null
          responded_at?: string | null
          responded_by?: string | null
          review_type?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_company?: string | null
          reviewer_email?: string
          reviewer_name?: string
          reviewer_phone?: string | null
          source?: string
          status?: string
          tags?: Json | null
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_reviews_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      client_segments: {
        Row: {
          created_at: string
          created_by: string
          criteria: Json
          description: string | null
          id: string
          is_dynamic: boolean | null
          name: string
          tenant_count: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          criteria: Json
          description?: string | null
          id?: string
          is_dynamic?: boolean | null
          name: string
          tenant_count?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          criteria?: Json
          description?: string | null
          id?: string
          is_dynamic?: boolean | null
          name?: string
          tenant_count?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      combo_products: {
        Row: {
          combo_product_id: string
          component_product_id: string
          component_variant_id: string | null
          created_at: string
          id: string
          is_active: boolean | null
          quantity_required: number
          tenant_id: string
        }
        Insert: {
          combo_product_id: string
          component_product_id: string
          component_variant_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          quantity_required?: number
          tenant_id: string
        }
        Update: {
          combo_product_id?: string
          component_product_id?: string
          component_variant_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          quantity_required?: number
          tenant_id?: string
        }
        Relationships: []
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
      communication_logs: {
        Row: {
          channel: string
          content: string
          created_at: string
          delivered_at: string | null
          error_message: string | null
          external_id: string | null
          id: string
          metadata: Json | null
          read_at: string | null
          recipient: string
          sent_at: string | null
          status: Database["public"]["Enums"]["notification_status"]
          subject: string | null
          tenant_id: string | null
          type: string
          user_id: string | null
        }
        Insert: {
          channel: string
          content: string
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          external_id?: string | null
          id?: string
          metadata?: Json | null
          read_at?: string | null
          recipient: string
          sent_at?: string | null
          status: Database["public"]["Enums"]["notification_status"]
          subject?: string | null
          tenant_id?: string | null
          type: string
          user_id?: string | null
        }
        Update: {
          channel?: string
          content?: string
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          external_id?: string | null
          id?: string
          metadata?: Json | null
          read_at?: string | null
          recipient?: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notification_status"]
          subject?: string | null
          tenant_id?: string | null
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "communication_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
          location_id: string | null
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
          location_id?: string | null
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
          location_id?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          tenant_id?: string | null
          type?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "store_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_permissions: {
        Row: {
          action: string
          category: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_critical: boolean
          name: string
          resource: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          action: string
          category?: string
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_critical?: boolean
          name: string
          resource: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          action?: string
          category?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_critical?: boolean
          name?: string
          resource?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_permissions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
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
      domain_verification_logs: {
        Row: {
          checked_at: string
          domain_id: string
          error_message: string | null
          id: string
          response_data: Json | null
          status: string
          verification_type: string
        }
        Insert: {
          checked_at?: string
          domain_id: string
          error_message?: string | null
          id?: string
          response_data?: Json | null
          status: string
          verification_type: string
        }
        Update: {
          checked_at?: string
          domain_id?: string
          error_message?: string | null
          id?: string
          response_data?: Json | null
          status?: string
          verification_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "domain_verification_logs_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "tenant_domains"
            referencedColumns: ["id"]
          },
        ]
      }
      email_automation_rules: {
        Row: {
          created_at: string
          created_by: string
          delay_minutes: number | null
          description: string | null
          emails_sent: number | null
          id: string
          is_active: boolean | null
          last_triggered_at: string | null
          name: string
          template_id: string | null
          total_triggered: number | null
          trigger_conditions: Json | null
          trigger_event: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          delay_minutes?: number | null
          description?: string | null
          emails_sent?: number | null
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          name: string
          template_id?: string | null
          total_triggered?: number | null
          trigger_conditions?: Json | null
          trigger_event: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          delay_minutes?: number | null
          description?: string | null
          emails_sent?: number | null
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          name?: string
          template_id?: string | null
          total_triggered?: number | null
          trigger_conditions?: Json | null
          trigger_event?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_automation_rules_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      email_blacklist: {
        Row: {
          blacklisted_at: string
          blacklisted_by: string | null
          email: string
          id: string
          is_global: boolean | null
          notes: string | null
          reason: string
          tenant_id: string | null
        }
        Insert: {
          blacklisted_at?: string
          blacklisted_by?: string | null
          email: string
          id?: string
          is_global?: boolean | null
          notes?: string | null
          reason: string
          tenant_id?: string | null
        }
        Update: {
          blacklisted_at?: string
          blacklisted_by?: string | null
          email?: string
          id?: string
          is_global?: boolean | null
          notes?: string | null
          reason?: string
          tenant_id?: string | null
        }
        Relationships: []
      }
      email_campaign_analytics: {
        Row: {
          bounced_count: number | null
          campaign_id: string
          clicked_count: number | null
          created_at: string
          delivered_count: number | null
          id: string
          metric_date: string
          opened_count: number | null
          revenue_attributed: number | null
          sent_count: number | null
          unsubscribed_count: number | null
        }
        Insert: {
          bounced_count?: number | null
          campaign_id: string
          clicked_count?: number | null
          created_at?: string
          delivered_count?: number | null
          id?: string
          metric_date?: string
          opened_count?: number | null
          revenue_attributed?: number | null
          sent_count?: number | null
          unsubscribed_count?: number | null
        }
        Update: {
          bounced_count?: number | null
          campaign_id?: string
          clicked_count?: number | null
          created_at?: string
          delivered_count?: number | null
          id?: string
          metric_date?: string
          opened_count?: number | null
          revenue_attributed?: number | null
          sent_count?: number | null
          unsubscribed_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "email_campaign_analytics_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "email_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      email_campaign_recipients: {
        Row: {
          bounced_at: string | null
          campaign_id: string
          clicked_at: string | null
          created_at: string
          delivered_at: string | null
          error_message: string | null
          external_id: string | null
          id: string
          metadata: Json | null
          opened_at: string | null
          recipient_email: string
          recipient_name: string | null
          sent_at: string | null
          status: string
          tenant_id: string
          unsubscribed_at: string | null
        }
        Insert: {
          bounced_at?: string | null
          campaign_id: string
          clicked_at?: string | null
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          external_id?: string | null
          id?: string
          metadata?: Json | null
          opened_at?: string | null
          recipient_email: string
          recipient_name?: string | null
          sent_at?: string | null
          status?: string
          tenant_id: string
          unsubscribed_at?: string | null
        }
        Update: {
          bounced_at?: string | null
          campaign_id?: string
          clicked_at?: string | null
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          external_id?: string | null
          id?: string
          metadata?: Json | null
          opened_at?: string | null
          recipient_email?: string
          recipient_name?: string | null
          sent_at?: string | null
          status?: string
          tenant_id?: string
          unsubscribed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_campaign_recipients_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "email_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      email_campaigns: {
        Row: {
          campaign_type: string
          created_at: string
          created_by: string
          emails_bounced: number | null
          emails_clicked: number | null
          emails_delivered: number | null
          emails_opened: number | null
          emails_sent: number | null
          emails_unsubscribed: number | null
          html_content: string
          id: string
          metadata: Json | null
          name: string
          scheduled_at: string | null
          sender_email: string | null
          sender_name: string | null
          sent_at: string | null
          status: string
          subject: string
          target_audience: string | null
          template_id: string | null
          text_content: string | null
          total_recipients: number | null
          updated_at: string
        }
        Insert: {
          campaign_type?: string
          created_at?: string
          created_by: string
          emails_bounced?: number | null
          emails_clicked?: number | null
          emails_delivered?: number | null
          emails_opened?: number | null
          emails_sent?: number | null
          emails_unsubscribed?: number | null
          html_content: string
          id?: string
          metadata?: Json | null
          name: string
          scheduled_at?: string | null
          sender_email?: string | null
          sender_name?: string | null
          sent_at?: string | null
          status?: string
          subject: string
          target_audience?: string | null
          template_id?: string | null
          text_content?: string | null
          total_recipients?: number | null
          updated_at?: string
        }
        Update: {
          campaign_type?: string
          created_at?: string
          created_by?: string
          emails_bounced?: number | null
          emails_clicked?: number | null
          emails_delivered?: number | null
          emails_opened?: number | null
          emails_sent?: number | null
          emails_unsubscribed?: number | null
          html_content?: string
          id?: string
          metadata?: Json | null
          name?: string
          scheduled_at?: string | null
          sender_email?: string | null
          sender_name?: string | null
          sent_at?: string | null
          status?: string
          subject?: string
          target_audience?: string | null
          template_id?: string | null
          text_content?: string | null
          total_recipients?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_campaigns_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      email_queue: {
        Row: {
          created_at: string
          delivered_at: string | null
          error_message: string | null
          external_id: string | null
          failed_at: string | null
          from_email: string | null
          from_name: string | null
          html_content: string
          id: string
          max_retries: number | null
          priority: Database["public"]["Enums"]["notification_priority"] | null
          retry_count: number | null
          scheduled_for: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["notification_status"] | null
          subject: string
          template_id: string | null
          tenant_id: string | null
          text_content: string | null
          to_email: string
          to_name: string | null
          updated_at: string
          variables: Json | null
        }
        Insert: {
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          external_id?: string | null
          failed_at?: string | null
          from_email?: string | null
          from_name?: string | null
          html_content: string
          id?: string
          max_retries?: number | null
          priority?: Database["public"]["Enums"]["notification_priority"] | null
          retry_count?: number | null
          scheduled_for?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notification_status"] | null
          subject: string
          template_id?: string | null
          tenant_id?: string | null
          text_content?: string | null
          to_email: string
          to_name?: string | null
          updated_at?: string
          variables?: Json | null
        }
        Update: {
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          external_id?: string | null
          failed_at?: string | null
          from_email?: string | null
          from_name?: string | null
          html_content?: string
          id?: string
          max_retries?: number | null
          priority?: Database["public"]["Enums"]["notification_priority"] | null
          retry_count?: number | null
          scheduled_for?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notification_status"] | null
          subject?: string
          template_id?: string | null
          tenant_id?: string | null
          text_content?: string | null
          to_email?: string
          to_name?: string | null
          updated_at?: string
          variables?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "email_queue_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_queue_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          created_at: string
          created_by: string | null
          html_content: string
          id: string
          is_active: boolean | null
          is_system_template: boolean | null
          name: string
          subject: string
          tenant_id: string | null
          text_content: string | null
          type: Database["public"]["Enums"]["notification_type"]
          updated_at: string
          variables: Json | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          html_content: string
          id?: string
          is_active?: boolean | null
          is_system_template?: boolean | null
          name: string
          subject: string
          tenant_id?: string | null
          text_content?: string | null
          type: Database["public"]["Enums"]["notification_type"]
          updated_at?: string
          variables?: Json | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          html_content?: string
          id?: string
          is_active?: boolean | null
          is_system_template?: boolean | null
          name?: string
          subject?: string
          tenant_id?: string | null
          text_content?: string | null
          type?: Database["public"]["Enums"]["notification_type"]
          updated_at?: string
          variables?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "email_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      email_verification_otps: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          otp_code: string
          otp_type: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          expires_at: string
          id?: string
          otp_code: string
          otp_type: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          otp_code?: string
          otp_type?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      exchange_items: {
        Row: {
          created_at: string
          id: string
          product_id: string
          quantity: number
          return_id: string
          total_price: number
          unit_price: number
          variant_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          quantity: number
          return_id: string
          total_price: number
          unit_price: number
          variant_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          quantity?: number
          return_id?: string
          total_price?: number
          unit_price?: number
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exchange_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exchange_items_return_id_fkey"
            columns: ["return_id"]
            isOneToOne: false
            referencedRelation: "returns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exchange_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_sets: {
        Row: {
          created_at: string | null
          description: string | null
          display_name: string
          features: string[]
          id: string
          is_system_set: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_name: string
          features: string[]
          id?: string
          is_system_set?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_name?: string
          features?: string[]
          id?: string
          is_system_set?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
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
      legal_document_versions: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          document_id: string
          effective_date: string
          id: string
          is_current: boolean
          updated_at: string
          version_number: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          document_id: string
          effective_date?: string
          id?: string
          is_current?: boolean
          updated_at?: string
          version_number: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          document_id?: string
          effective_date?: string
          id?: string
          is_current?: boolean
          updated_at?: string
          version_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_document_versions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "legal_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_documents: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          document_type: string
          id: string
          is_active: boolean
          tenant_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          document_type: string
          id?: string
          is_active?: boolean
          tenant_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          document_type?: string
          id?: string
          is_active?: boolean
          tenant_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      mpesa_configurations: {
        Row: {
          api_user: string
          callback_url: string
          confirmation_url: string
          consumer_key: string
          consumer_secret: string
          created_at: string | null
          environment: string
          id: string
          is_enabled: boolean | null
          is_verified: boolean | null
          last_tested_at: string | null
          passkey: string
          shortcode: string
          tenant_id: string
          updated_at: string | null
          validation_url: string | null
        }
        Insert: {
          api_user: string
          callback_url: string
          confirmation_url: string
          consumer_key: string
          consumer_secret: string
          created_at?: string | null
          environment?: string
          id?: string
          is_enabled?: boolean | null
          is_verified?: boolean | null
          last_tested_at?: string | null
          passkey: string
          shortcode: string
          tenant_id: string
          updated_at?: string | null
          validation_url?: string | null
        }
        Update: {
          api_user?: string
          callback_url?: string
          confirmation_url?: string
          consumer_key?: string
          consumer_secret?: string
          created_at?: string | null
          environment?: string
          id?: string
          is_enabled?: boolean | null
          is_verified?: boolean | null
          last_tested_at?: string | null
          passkey?: string
          shortcode?: string
          tenant_id?: string
          updated_at?: string | null
          validation_url?: string | null
        }
        Relationships: []
      }
      mpesa_transactions: {
        Row: {
          amount: number
          callback_received_at: string | null
          checkout_request_id: string
          created_at: string | null
          description: string | null
          id: string
          merchant_request_id: string | null
          mpesa_receipt_number: string | null
          phone_number: string
          reference: string
          result_code: number | null
          result_description: string | null
          sale_id: string | null
          status: string
          tenant_id: string
          transaction_date: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          callback_received_at?: string | null
          checkout_request_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          merchant_request_id?: string | null
          mpesa_receipt_number?: string | null
          phone_number: string
          reference: string
          result_code?: number | null
          result_description?: string | null
          sale_id?: string | null
          status?: string
          tenant_id: string
          transaction_date?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          callback_received_at?: string | null
          checkout_request_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          merchant_request_id?: string | null
          mpesa_receipt_number?: string | null
          phone_number?: string
          reference?: string
          result_code?: number | null
          result_description?: string | null
          sale_id?: string | null
          status?: string
          tenant_id?: string
          transaction_date?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          created_at: string
          email_enabled: boolean | null
          id: string
          marketing_emails: boolean | null
          order_updates: boolean | null
          payment_reminders: boolean | null
          push_enabled: boolean | null
          security_alerts: boolean | null
          sms_enabled: boolean | null
          system_announcements: boolean | null
          tenant_id: string | null
          updated_at: string
          user_id: string | null
          whatsapp_enabled: boolean | null
        }
        Insert: {
          created_at?: string
          email_enabled?: boolean | null
          id?: string
          marketing_emails?: boolean | null
          order_updates?: boolean | null
          payment_reminders?: boolean | null
          push_enabled?: boolean | null
          security_alerts?: boolean | null
          sms_enabled?: boolean | null
          system_announcements?: boolean | null
          tenant_id?: string | null
          updated_at?: string
          user_id?: string | null
          whatsapp_enabled?: boolean | null
        }
        Update: {
          created_at?: string
          email_enabled?: boolean | null
          id?: string
          marketing_emails?: boolean | null
          order_updates?: boolean | null
          payment_reminders?: boolean | null
          push_enabled?: boolean | null
          security_alerts?: boolean | null
          sms_enabled?: boolean | null
          system_announcements?: boolean | null
          tenant_id?: string | null
          updated_at?: string
          user_id?: string | null
          whatsapp_enabled?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          channels: string[] | null
          created_at: string
          data: Json | null
          expires_at: string | null
          id: string
          is_read: boolean | null
          message: string
          priority: Database["public"]["Enums"]["notification_priority"] | null
          read_at: string | null
          scheduled_for: string | null
          tenant_id: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          channels?: string[] | null
          created_at?: string
          data?: Json | null
          expires_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          priority?: Database["public"]["Enums"]["notification_priority"] | null
          read_at?: string | null
          scheduled_for?: string | null
          tenant_id?: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          channels?: string[] | null
          created_at?: string
          data?: Json | null
          expires_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          priority?: Database["public"]["Enums"]["notification_priority"] | null
          read_at?: string | null
          scheduled_for?: string | null
          tenant_id?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_history: {
        Row: {
          amount: number
          billing_period_end: string | null
          billing_period_start: string | null
          billing_plan_id: string | null
          created_at: string
          currency: string
          failed_at: string | null
          full_period_amount: number | null
          id: string
          is_prorated: boolean | null
          metadata: Json | null
          notes: string | null
          paid_at: string | null
          payment_method: string | null
          payment_reference: string
          payment_status: string
          payment_type: string
          paystack_customer_id: string | null
          paystack_plan_id: string | null
          paystack_subscription_id: string | null
          prorated_days: number | null
          proration_end_date: string | null
          proration_start_date: string | null
          refunded_at: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          billing_period_end?: string | null
          billing_period_start?: string | null
          billing_plan_id?: string | null
          created_at?: string
          currency?: string
          failed_at?: string | null
          full_period_amount?: number | null
          id?: string
          is_prorated?: boolean | null
          metadata?: Json | null
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          payment_reference: string
          payment_status?: string
          payment_type?: string
          paystack_customer_id?: string | null
          paystack_plan_id?: string | null
          paystack_subscription_id?: string | null
          prorated_days?: number | null
          proration_end_date?: string | null
          proration_start_date?: string | null
          refunded_at?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          billing_period_end?: string | null
          billing_period_start?: string | null
          billing_plan_id?: string | null
          created_at?: string
          currency?: string
          failed_at?: string | null
          full_period_amount?: number | null
          id?: string
          is_prorated?: boolean | null
          metadata?: Json | null
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          payment_reference?: string
          payment_status?: string
          payment_type?: string
          paystack_customer_id?: string | null
          paystack_plan_id?: string | null
          paystack_subscription_id?: string | null
          prorated_days?: number | null
          proration_end_date?: string | null
          proration_start_date?: string | null
          refunded_at?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_history_billing_plan_id_fkey"
            columns: ["billing_plan_id"]
            isOneToOne: false
            referencedRelation: "billing_plans"
            referencedColumns: ["id"]
          },
        ]
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
      pending_email_verifications: {
        Row: {
          created_at: string | null
          email: string
          expires_at: string | null
          id: string
          tenant_id: string | null
          user_id: string | null
          verification_token: string
          verification_type: string | null
          verified_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          expires_at?: string | null
          id?: string
          tenant_id?: string | null
          user_id?: string | null
          verification_token: string
          verification_type?: string | null
          verified_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          expires_at?: string | null
          id?: string
          tenant_id?: string | null
          user_id?: string | null
          verification_token?: string
          verification_type?: string | null
          verified_at?: string | null
        }
        Relationships: []
      }
      permission_templates: {
        Row: {
          category: string
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_system_template: boolean | null
          name: string
          template_data: Json
          updated_at: string | null
        }
        Insert: {
          category?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_system_template?: boolean | null
          name: string
          template_data: Json
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_system_template?: boolean | null
          name?: string
          template_data?: Json
          updated_at?: string | null
        }
        Relationships: []
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
      product_history: {
        Row: {
          action_type: string
          change_reason: string | null
          changed_by: string
          created_at: string
          field_changed: string | null
          id: string
          ip_address: unknown | null
          metadata: Json | null
          new_value: Json | null
          old_value: Json | null
          product_id: string
          tenant_id: string
          user_agent: string | null
        }
        Insert: {
          action_type: string
          change_reason?: string | null
          changed_by: string
          created_at?: string
          field_changed?: string | null
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          new_value?: Json | null
          old_value?: Json | null
          product_id: string
          tenant_id: string
          user_agent?: string | null
        }
        Update: {
          action_type?: string
          change_reason?: string | null
          changed_by?: string
          created_at?: string
          field_changed?: string | null
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          new_value?: Json | null
          old_value?: Json | null
          product_id?: string
          tenant_id?: string
          user_agent?: string | null
        }
        Relationships: []
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
      product_units: {
        Row: {
          abbreviation: string
          base_unit_id: string | null
          code: string
          conversion_factor: number | null
          created_at: string
          id: string
          is_active: boolean | null
          name: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          abbreviation: string
          base_unit_id?: string | null
          code: string
          conversion_factor?: number | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          name: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          abbreviation?: string
          base_unit_id?: string | null
          code?: string
          conversion_factor?: number | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          name?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_units_base_unit_id_fkey"
            columns: ["base_unit_id"]
            isOneToOne: false
            referencedRelation: "product_units"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          created_at: string
          default_profit_margin: number | null
          id: string
          image_url: string | null
          is_active: boolean | null
          min_stock_level: number | null
          name: string
          price_adjustment: number | null
          product_id: string
          sale_price: number | null
          sku: string | null
          stock_quantity: number | null
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          default_profit_margin?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          min_stock_level?: number | null
          name: string
          price_adjustment?: number | null
          product_id: string
          sale_price?: number | null
          sku?: string | null
          stock_quantity?: number | null
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          default_profit_margin?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          min_stock_level?: number | null
          name?: string
          price_adjustment?: number | null
          product_id?: string
          sale_price?: number | null
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
          allow_negative_stock: boolean | null
          barcode: string | null
          brand_id: string | null
          category_id: string | null
          cost_price: number | null
          created_at: string
          default_profit_margin: number | null
          description: string | null
          expiry_date: string | null
          has_expiry_date: boolean | null
          id: string
          image_url: string | null
          is_active: boolean | null
          is_combo_product: boolean | null
          location_id: string | null
          min_stock_level: number | null
          name: string
          price: number
          purchase_price: number | null
          revenue_account_id: string | null
          sku: string | null
          stock_quantity: number | null
          subcategory_id: string | null
          tenant_id: string | null
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          allow_negative_stock?: boolean | null
          barcode?: string | null
          brand_id?: string | null
          category_id?: string | null
          cost_price?: number | null
          created_at?: string
          default_profit_margin?: number | null
          description?: string | null
          expiry_date?: string | null
          has_expiry_date?: boolean | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_combo_product?: boolean | null
          location_id?: string | null
          min_stock_level?: number | null
          name: string
          price: number
          purchase_price?: number | null
          revenue_account_id?: string | null
          sku?: string | null
          stock_quantity?: number | null
          subcategory_id?: string | null
          tenant_id?: string | null
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          allow_negative_stock?: boolean | null
          barcode?: string | null
          brand_id?: string | null
          category_id?: string | null
          cost_price?: number | null
          created_at?: string
          default_profit_margin?: number | null
          description?: string | null
          expiry_date?: string | null
          has_expiry_date?: boolean | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_combo_product?: boolean | null
          location_id?: string | null
          min_stock_level?: number | null
          name?: string
          price?: number
          purchase_price?: number | null
          revenue_account_id?: string | null
          sku?: string | null
          stock_quantity?: number | null
          subcategory_id?: string | null
          tenant_id?: string | null
          unit_id?: string | null
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
            foreignKeyName: "products_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "store_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_revenue_account_id_fkey"
            columns: ["revenue_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
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
          {
            foreignKeyName: "products_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "product_units"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          auth_method: string | null
          avatar_url: string | null
          created_at: string
          email_verified: boolean | null
          email_verified_at: string | null
          full_name: string | null
          google_id: string | null
          google_profile_data: Json | null
          id: string
          invitation_accepted_at: string | null
          invitation_status: string | null
          invited_at: string | null
          otp_required_always: boolean | null
          require_password_change: boolean | null
          role: Database["public"]["Enums"]["user_role"] | null
          tenant_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          auth_method?: string | null
          avatar_url?: string | null
          created_at?: string
          email_verified?: boolean | null
          email_verified_at?: string | null
          full_name?: string | null
          google_id?: string | null
          google_profile_data?: Json | null
          id?: string
          invitation_accepted_at?: string | null
          invitation_status?: string | null
          invited_at?: string | null
          otp_required_always?: boolean | null
          require_password_change?: boolean | null
          role?: Database["public"]["Enums"]["user_role"] | null
          tenant_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          auth_method?: string | null
          avatar_url?: string | null
          created_at?: string
          email_verified?: boolean | null
          email_verified_at?: string | null
          full_name?: string | null
          google_id?: string | null
          google_profile_data?: Json | null
          id?: string
          invitation_accepted_at?: string | null
          invitation_status?: string | null
          invited_at?: string | null
          otp_required_always?: boolean | null
          require_password_change?: boolean | null
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
      promotion_usage: {
        Row: {
          customer_id: string | null
          discount_amount: number
          id: string
          promotion_id: string
          quantity_affected: number | null
          sale_id: string | null
          tenant_id: string
          used_at: string
        }
        Insert: {
          customer_id?: string | null
          discount_amount: number
          id?: string
          promotion_id: string
          quantity_affected?: number | null
          sale_id?: string | null
          tenant_id: string
          used_at?: string
        }
        Update: {
          customer_id?: string | null
          discount_amount?: number
          id?: string
          promotion_id?: string
          quantity_affected?: number | null
          sale_id?: string | null
          tenant_id?: string
          used_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "promotion_usage_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_usage_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_usage_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      promotions: {
        Row: {
          applies_to: string
          buy_quantity: number | null
          category_ids: Json | null
          created_at: string
          created_by: string
          current_usage_count: number | null
          customer_type: string | null
          days_of_week: Json | null
          description: string | null
          discount_amount: number | null
          discount_percentage: number | null
          end_date: string | null
          get_quantity: number | null
          id: string
          max_quantity: number | null
          max_usage_count: number | null
          min_purchase_amount: number | null
          min_quantity: number | null
          name: string
          product_ids: Json | null
          start_date: string
          status: string
          tenant_id: string
          time_end: string | null
          time_start: string | null
          type: string
          updated_at: string
        }
        Insert: {
          applies_to?: string
          buy_quantity?: number | null
          category_ids?: Json | null
          created_at?: string
          created_by: string
          current_usage_count?: number | null
          customer_type?: string | null
          days_of_week?: Json | null
          description?: string | null
          discount_amount?: number | null
          discount_percentage?: number | null
          end_date?: string | null
          get_quantity?: number | null
          id?: string
          max_quantity?: number | null
          max_usage_count?: number | null
          min_purchase_amount?: number | null
          min_quantity?: number | null
          name: string
          product_ids?: Json | null
          start_date: string
          status?: string
          tenant_id: string
          time_end?: string | null
          time_start?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          applies_to?: string
          buy_quantity?: number | null
          category_ids?: Json | null
          created_at?: string
          created_by?: string
          current_usage_count?: number | null
          customer_type?: string | null
          days_of_week?: Json | null
          description?: string | null
          discount_amount?: number | null
          discount_percentage?: number | null
          end_date?: string | null
          get_quantity?: number | null
          id?: string
          max_quantity?: number | null
          max_usage_count?: number | null
          min_purchase_amount?: number | null
          min_quantity?: number | null
          name?: string
          product_ids?: Json | null
          start_date?: string
          status?: string
          tenant_id?: string
          time_end?: string | null
          time_start?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      purchase_items: {
        Row: {
          created_at: string
          expiry_date: string | null
          id: string
          notes: string | null
          product_id: string
          purchase_id: string
          quantity_ordered: number
          quantity_received: number
          total_cost: number
          unit_cost: number
          unit_id: string | null
          updated_at: string
          variant_id: string | null
        }
        Insert: {
          created_at?: string
          expiry_date?: string | null
          id?: string
          notes?: string | null
          product_id: string
          purchase_id: string
          quantity_ordered: number
          quantity_received?: number
          total_cost: number
          unit_cost: number
          unit_id?: string | null
          updated_at?: string
          variant_id?: string | null
        }
        Update: {
          created_at?: string
          expiry_date?: string | null
          id?: string
          notes?: string | null
          product_id?: string
          purchase_id?: string
          quantity_ordered?: number
          quantity_received?: number
          total_cost?: number
          unit_cost?: number
          unit_id?: string | null
          updated_at?: string
          variant_id?: string | null
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
          {
            foreignKeyName: "purchase_items_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "product_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      purchases: {
        Row: {
          created_at: string
          created_by: string
          discount_amount: number
          expected_date: string | null
          id: string
          location_id: string | null
          notes: string | null
          order_date: string
          purchase_number: string
          received_date: string | null
          shipping_amount: number
          status: string
          supplier_id: string | null
          tax_amount: number
          tenant_id: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          discount_amount?: number
          expected_date?: string | null
          id?: string
          location_id?: string | null
          notes?: string | null
          order_date?: string
          purchase_number: string
          received_date?: string | null
          shipping_amount?: number
          status?: string
          supplier_id?: string | null
          tax_amount?: number
          tenant_id: string
          total_amount?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          discount_amount?: number
          expected_date?: string | null
          id?: string
          location_id?: string | null
          notes?: string | null
          order_date?: string
          purchase_number?: string
          received_date?: string | null
          shipping_amount?: number
          status?: string
          supplier_id?: string | null
          tax_amount?: number
          tenant_id?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchases_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "store_locations"
            referencedColumns: ["id"]
          },
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
          tenant_id: string
          total_price: number
          unit_price: number
          updated_at: string
          variant_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          product_id?: string | null
          quantity: number
          quote_id?: string | null
          tenant_id: string
          total_price: number
          unit_price: number
          updated_at?: string
          variant_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string | null
          quantity?: number
          quote_id?: string | null
          tenant_id?: string
          total_price?: number
          unit_price?: number
          updated_at?: string
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
          customer_name: string | null
          discount_amount: number | null
          id: string
          notes: string | null
          quote_number: string
          shipping_amount: number | null
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
          customer_name?: string | null
          discount_amount?: number | null
          id?: string
          notes?: string | null
          quote_number: string
          shipping_amount?: number | null
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
          customer_name?: string | null
          discount_amount?: number | null
          id?: string
          notes?: string | null
          quote_number?: string
          shipping_amount?: number | null
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
            referencedRelation: "contacts"
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
      rate_limits: {
        Row: {
          action_type: string
          attempt_count: number | null
          blocked_until: string | null
          created_at: string | null
          id: string
          identifier: string
          updated_at: string | null
          window_start: string | null
        }
        Insert: {
          action_type: string
          attempt_count?: number | null
          blocked_until?: string | null
          created_at?: string | null
          id?: string
          identifier: string
          updated_at?: string | null
          window_start?: string | null
        }
        Update: {
          action_type?: string
          attempt_count?: number | null
          blocked_until?: string | null
          created_at?: string | null
          id?: string
          identifier?: string
          updated_at?: string | null
          window_start?: string | null
        }
        Relationships: []
      }
      return_items: {
        Row: {
          condition_notes: string | null
          created_at: string
          id: string
          original_sale_item_id: string | null
          product_id: string
          quantity_returned: number
          restock: boolean | null
          return_id: string
          total_price: number
          unit_price: number
          updated_at: string
          variant_id: string | null
        }
        Insert: {
          condition_notes?: string | null
          created_at?: string
          id?: string
          original_sale_item_id?: string | null
          product_id: string
          quantity_returned: number
          restock?: boolean | null
          return_id: string
          total_price: number
          unit_price: number
          updated_at?: string
          variant_id?: string | null
        }
        Update: {
          condition_notes?: string | null
          created_at?: string
          id?: string
          original_sale_item_id?: string | null
          product_id?: string
          quantity_returned?: number
          restock?: boolean | null
          return_id?: string
          total_price?: number
          unit_price?: number
          updated_at?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "return_items_original_sale_item_id_fkey"
            columns: ["original_sale_item_id"]
            isOneToOne: false
            referencedRelation: "sale_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_items_return_id_fkey"
            columns: ["return_id"]
            isOneToOne: false
            referencedRelation: "returns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      return_reason_codes: {
        Row: {
          code: string
          created_at: string
          description: string
          display_order: number | null
          id: string
          is_active: boolean | null
          requires_approval: boolean | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description: string
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          requires_approval?: boolean | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          requires_approval?: boolean | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      returns: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          completed_at: string | null
          created_at: string
          custom_reason: string | null
          customer_id: string | null
          exchange_difference: number
          id: string
          notes: string | null
          original_sale_id: string | null
          processed_by: string
          reason_code_id: string | null
          refund_amount: number
          refund_method: string | null
          return_number: string
          return_type: string
          status: string
          store_credit_amount: number
          subtotal_amount: number
          supplier_id: string | null
          tax_amount: number
          tenant_id: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          completed_at?: string | null
          created_at?: string
          custom_reason?: string | null
          customer_id?: string | null
          exchange_difference?: number
          id?: string
          notes?: string | null
          original_sale_id?: string | null
          processed_by: string
          reason_code_id?: string | null
          refund_amount?: number
          refund_method?: string | null
          return_number: string
          return_type?: string
          status?: string
          store_credit_amount?: number
          subtotal_amount?: number
          supplier_id?: string | null
          tax_amount?: number
          tenant_id: string
          total_amount?: number
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          completed_at?: string | null
          created_at?: string
          custom_reason?: string | null
          customer_id?: string | null
          exchange_difference?: number
          id?: string
          notes?: string | null
          original_sale_id?: string | null
          processed_by?: string
          reason_code_id?: string | null
          refund_amount?: number
          refund_method?: string | null
          return_number?: string
          return_type?: string
          status?: string
          store_credit_amount?: number
          subtotal_amount?: number
          supplier_id?: string | null
          tax_amount?: number
          tenant_id?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "returns_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "returns_original_sale_id_fkey"
            columns: ["original_sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "returns_reason_code_id_fkey"
            columns: ["reason_code_id"]
            isOneToOne: false
            referencedRelation: "return_reason_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "returns_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      review_analytics: {
        Row: {
          average_rating: number | null
          category_breakdown: Json | null
          client_type_breakdown: Json | null
          created_at: string
          date: string
          id: string
          new_reviews: number | null
          responded_reviews: number | null
          response_time_hours: number | null
          satisfaction_score: number | null
          tenant_id: string
          total_reviews: number | null
          updated_at: string
        }
        Insert: {
          average_rating?: number | null
          category_breakdown?: Json | null
          client_type_breakdown?: Json | null
          created_at?: string
          date?: string
          id?: string
          new_reviews?: number | null
          responded_reviews?: number | null
          response_time_hours?: number | null
          satisfaction_score?: number | null
          tenant_id: string
          total_reviews?: number | null
          updated_at?: string
        }
        Update: {
          average_rating?: number | null
          category_breakdown?: Json | null
          client_type_breakdown?: Json | null
          created_at?: string
          date?: string
          id?: string
          new_reviews?: number | null
          responded_reviews?: number | null
          response_time_hours?: number | null
          satisfaction_score?: number | null
          tenant_id?: string
          total_reviews?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      review_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_size: number | null
          file_type: string
          file_url: string
          id: string
          review_id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size?: number | null
          file_type: string
          file_url: string
          id?: string
          review_id: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size?: number | null
          file_type?: string
          file_url?: string
          id?: string
          review_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "review_attachments_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "client_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      review_responses: {
        Row: {
          created_at: string
          id: string
          is_public: boolean | null
          responder_id: string
          response_text: string
          response_type: string
          review_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_public?: boolean | null
          responder_id: string
          response_text: string
          response_type: string
          review_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_public?: boolean | null
          responder_id?: string
          response_text?: string
          response_type?: string
          review_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_responses_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "client_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          created_at: string | null
          granted: boolean | null
          id: string
          permission_id: string
          role_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          granted?: boolean | null
          id?: string
          permission_id: string
          role_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          granted?: boolean | null
          id?: string
          permission_id?: string
          role_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "system_permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "user_roles"
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
          unit_id: string | null
          unit_price: number
          variant_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          quantity: number
          sale_id: string
          total_price: number
          unit_id?: string | null
          unit_price: number
          variant_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          quantity?: number
          sale_id?: string
          total_price?: number
          unit_id?: string | null
          unit_price?: number
          variant_id?: string | null
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
          {
            foreignKeyName: "sale_items_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "product_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          cashier_id: string
          created_at: string
          customer_id: string | null
          customer_name: string | null
          discount_amount: number | null
          id: string
          location_id: string | null
          notes: string | null
          payment_method: string
          receipt_number: string
          sale_type: string
          shipping_amount: number
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
          customer_name?: string | null
          discount_amount?: number | null
          id?: string
          location_id?: string | null
          notes?: string | null
          payment_method?: string
          receipt_number: string
          sale_type?: string
          shipping_amount?: number
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
          customer_name?: string | null
          discount_amount?: number | null
          id?: string
          location_id?: string | null
          notes?: string | null
          payment_method?: string
          receipt_number?: string
          sale_type?: string
          shipping_amount?: number
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
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "store_locations"
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
      stock_adjustment_items: {
        Row: {
          adjustment_id: string
          adjustment_quantity: number
          created_at: string
          id: string
          location_id: string | null
          physical_quantity: number
          product_id: string
          reason: string | null
          system_quantity: number
          total_cost: number
          unit_cost: number
          variant_id: string | null
        }
        Insert: {
          adjustment_id: string
          adjustment_quantity: number
          created_at?: string
          id?: string
          location_id?: string | null
          physical_quantity?: number
          product_id: string
          reason?: string | null
          system_quantity?: number
          total_cost?: number
          unit_cost?: number
          variant_id?: string | null
        }
        Update: {
          adjustment_id?: string
          adjustment_quantity?: number
          created_at?: string
          id?: string
          location_id?: string | null
          physical_quantity?: number
          product_id?: string
          reason?: string | null
          system_quantity?: number
          total_cost?: number
          unit_cost?: number
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_adjustment_items_adjustment_id_fkey"
            columns: ["adjustment_id"]
            isOneToOne: false
            referencedRelation: "stock_adjustments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_adjustment_items_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "store_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_adjustments: {
        Row: {
          adjustment_date: string
          adjustment_number: string
          adjustment_type: string
          approved_at: string | null
          approved_by: string | null
          created_at: string
          created_by: string
          id: string
          notes: string | null
          reason: string
          reference_document: string | null
          status: string
          tenant_id: string
          total_value: number
          updated_at: string
        }
        Insert: {
          adjustment_date?: string
          adjustment_number: string
          adjustment_type: string
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by: string
          id?: string
          notes?: string | null
          reason: string
          reference_document?: string | null
          status?: string
          tenant_id: string
          total_value?: number
          updated_at?: string
        }
        Update: {
          adjustment_date?: string
          adjustment_number?: string
          adjustment_type?: string
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string
          id?: string
          notes?: string | null
          reason?: string
          reference_document?: string | null
          status?: string
          tenant_id?: string
          total_value?: number
          updated_at?: string
        }
        Relationships: []
      }
      stock_taking_items: {
        Row: {
          counted_at: string | null
          counted_by: string | null
          counted_quantity: number | null
          created_at: string
          id: string
          is_counted: boolean
          notes: string | null
          product_id: string
          session_id: string
          system_quantity: number
          unit_cost: number
          variance_quantity: number | null
          variance_value: number
          variant_id: string | null
        }
        Insert: {
          counted_at?: string | null
          counted_by?: string | null
          counted_quantity?: number | null
          created_at?: string
          id?: string
          is_counted?: boolean
          notes?: string | null
          product_id: string
          session_id: string
          system_quantity?: number
          unit_cost?: number
          variance_quantity?: number | null
          variance_value?: number
          variant_id?: string | null
        }
        Update: {
          counted_at?: string | null
          counted_by?: string | null
          counted_quantity?: number | null
          created_at?: string
          id?: string
          is_counted?: boolean
          notes?: string | null
          product_id?: string
          session_id?: string
          system_quantity?: number
          unit_cost?: number
          variance_quantity?: number | null
          variance_value?: number
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_taking_items_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "stock_taking_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_taking_sessions: {
        Row: {
          completed_at: string | null
          completed_by: string | null
          created_at: string
          created_by: string
          discrepancies_found: number
          id: string
          location_id: string | null
          notes: string | null
          products_counted: number
          session_date: string
          session_number: string
          status: string
          tenant_id: string
          total_products: number
          total_variance_value: number
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by: string
          discrepancies_found?: number
          id?: string
          location_id?: string | null
          notes?: string | null
          products_counted?: number
          session_date?: string
          session_number: string
          status?: string
          tenant_id: string
          total_products?: number
          total_variance_value?: number
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string
          discrepancies_found?: number
          id?: string
          location_id?: string | null
          notes?: string | null
          products_counted?: number
          session_date?: string
          session_number?: string
          status?: string
          tenant_id?: string
          total_products?: number
          total_variance_value?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_taking_sessions_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "store_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_transfer_items: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          product_id: string
          quantity_received: number
          quantity_requested: number
          quantity_shipped: number
          total_cost: number
          transfer_id: string
          unit_cost: number
          variant_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          product_id: string
          quantity_received?: number
          quantity_requested: number
          quantity_shipped?: number
          total_cost?: number
          transfer_id: string
          unit_cost?: number
          variant_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          product_id?: string
          quantity_received?: number
          quantity_requested?: number
          quantity_shipped?: number
          total_cost?: number
          transfer_id?: string
          unit_cost?: number
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_transfer_items_transfer_id_fkey"
            columns: ["transfer_id"]
            isOneToOne: false
            referencedRelation: "stock_transfers"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_transfers: {
        Row: {
          created_at: string
          created_by: string
          from_location_id: string
          id: string
          notes: string | null
          received_at: string | null
          received_by: string | null
          shipped_at: string | null
          status: string
          tenant_id: string
          to_location_id: string
          total_items: number
          total_value: number
          transfer_date: string
          transfer_number: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          from_location_id: string
          id?: string
          notes?: string | null
          received_at?: string | null
          received_by?: string | null
          shipped_at?: string | null
          status?: string
          tenant_id: string
          to_location_id: string
          total_items?: number
          total_value?: number
          transfer_date?: string
          transfer_number: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          from_location_id?: string
          id?: string
          notes?: string | null
          received_at?: string | null
          received_by?: string | null
          shipped_at?: string | null
          status?: string
          tenant_id?: string
          to_location_id?: string
          total_items?: number
          total_value?: number
          transfer_date?: string
          transfer_number?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_transfers_from_location_id_fkey"
            columns: ["from_location_id"]
            isOneToOne: false
            referencedRelation: "store_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transfers_to_location_id_fkey"
            columns: ["to_location_id"]
            isOneToOne: false
            referencedRelation: "store_locations"
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
      system_features: {
        Row: {
          category: string
          created_at: string | null
          dependencies: string[] | null
          description: string | null
          display_name: string
          feature_type: Database["public"]["Enums"]["feature_type"]
          icon: string | null
          id: string
          is_system_feature: boolean | null
          metadata: Json | null
          min_plan_level: string | null
          name: string
          requires_subscription: boolean | null
          status: Database["public"]["Enums"]["feature_status"]
          updated_at: string | null
        }
        Insert: {
          category?: string
          created_at?: string | null
          dependencies?: string[] | null
          description?: string | null
          display_name: string
          feature_type?: Database["public"]["Enums"]["feature_type"]
          icon?: string | null
          id?: string
          is_system_feature?: boolean | null
          metadata?: Json | null
          min_plan_level?: string | null
          name: string
          requires_subscription?: boolean | null
          status?: Database["public"]["Enums"]["feature_status"]
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          dependencies?: string[] | null
          description?: string | null
          display_name?: string
          feature_type?: Database["public"]["Enums"]["feature_type"]
          icon?: string | null
          id?: string
          is_system_feature?: boolean | null
          metadata?: Json | null
          min_plan_level?: string | null
          name?: string
          requires_subscription?: boolean | null
          status?: Database["public"]["Enums"]["feature_status"]
          updated_at?: string | null
        }
        Relationships: []
      }
      system_health_logs: {
        Row: {
          check_date: string
          created_at: string
          error_count: number | null
          health_score: number | null
          id: string
          metrics: Json | null
          performance_score: number | null
          tenant_id: string | null
          uptime_percentage: number | null
          user_satisfaction: number | null
          version_id: string | null
        }
        Insert: {
          check_date?: string
          created_at?: string
          error_count?: number | null
          health_score?: number | null
          id?: string
          metrics?: Json | null
          performance_score?: number | null
          tenant_id?: string | null
          uptime_percentage?: number | null
          user_satisfaction?: number | null
          version_id?: string | null
        }
        Update: {
          check_date?: string
          created_at?: string
          error_count?: number | null
          health_score?: number | null
          id?: string
          metrics?: Json | null
          performance_score?: number | null
          tenant_id?: string | null
          uptime_percentage?: number | null
          user_satisfaction?: number | null
          version_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "system_health_logs_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "application_versions"
            referencedColumns: ["id"]
          },
        ]
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
      system_permissions: {
        Row: {
          action: Database["public"]["Enums"]["permission_action"]
          category: string
          created_at: string | null
          description: string | null
          id: string
          is_critical: boolean | null
          name: string
          resource: Database["public"]["Enums"]["permission_resource"]
          updated_at: string | null
        }
        Insert: {
          action: Database["public"]["Enums"]["permission_action"]
          category?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_critical?: boolean | null
          name: string
          resource: Database["public"]["Enums"]["permission_resource"]
          updated_at?: string | null
        }
        Update: {
          action?: Database["public"]["Enums"]["permission_action"]
          category?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_critical?: boolean | null
          name?: string
          resource?: Database["public"]["Enums"]["permission_resource"]
          updated_at?: string | null
        }
        Relationships: []
      }
      tax_calculations: {
        Row: {
          base_amount: number
          calculation_date: string
          created_at: string
          exemption_amount: number | null
          exemption_id: string | null
          final_tax_amount: number
          id: string
          jurisdiction_id: string | null
          tax_amount: number
          tax_rate: number
          tax_rate_id: string | null
          tax_type_id: string
          tenant_id: string
          transaction_id: string
          transaction_type: string
        }
        Insert: {
          base_amount: number
          calculation_date?: string
          created_at?: string
          exemption_amount?: number | null
          exemption_id?: string | null
          final_tax_amount: number
          id?: string
          jurisdiction_id?: string | null
          tax_amount: number
          tax_rate: number
          tax_rate_id?: string | null
          tax_type_id: string
          tenant_id: string
          transaction_id: string
          transaction_type: string
        }
        Update: {
          base_amount?: number
          calculation_date?: string
          created_at?: string
          exemption_amount?: number | null
          exemption_id?: string | null
          final_tax_amount?: number
          id?: string
          jurisdiction_id?: string | null
          tax_amount?: number
          tax_rate?: number
          tax_rate_id?: string | null
          tax_type_id?: string
          tenant_id?: string
          transaction_id?: string
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "tax_calculations_exemption_id_fkey"
            columns: ["exemption_id"]
            isOneToOne: false
            referencedRelation: "tax_exemptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_calculations_jurisdiction_id_fkey"
            columns: ["jurisdiction_id"]
            isOneToOne: false
            referencedRelation: "tax_jurisdictions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_calculations_tax_rate_id_fkey"
            columns: ["tax_rate_id"]
            isOneToOne: false
            referencedRelation: "tax_rates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_calculations_tax_type_id_fkey"
            columns: ["tax_type_id"]
            isOneToOne: false
            referencedRelation: "tax_types"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_exemptions: {
        Row: {
          created_at: string
          description: string | null
          effective_date: string
          exemption_code: string
          exemption_percentage: number | null
          exemption_type: string
          expiry_date: string | null
          id: string
          is_active: boolean | null
          name: string
          tax_type_id: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          effective_date?: string
          exemption_code: string
          exemption_percentage?: number | null
          exemption_type: string
          expiry_date?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          tax_type_id?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          effective_date?: string
          exemption_code?: string
          exemption_percentage?: number | null
          exemption_type?: string
          expiry_date?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          tax_type_id?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tax_exemptions_tax_type_id_fkey"
            columns: ["tax_type_id"]
            isOneToOne: false
            referencedRelation: "tax_types"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_group_rates: {
        Row: {
          created_at: string
          id: string
          tax_group_id: string
          tax_rate_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          tax_group_id: string
          tax_rate_id: string
        }
        Update: {
          created_at?: string
          id?: string
          tax_group_id?: string
          tax_rate_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tax_group_rates_tax_group_id_fkey"
            columns: ["tax_group_id"]
            isOneToOne: false
            referencedRelation: "tax_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_group_rates_tax_rate_id_fkey"
            columns: ["tax_rate_id"]
            isOneToOne: false
            referencedRelation: "tax_rates"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_groups: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      tax_jurisdictions: {
        Row: {
          city: string | null
          country: string | null
          created_at: string
          id: string
          is_active: boolean | null
          jurisdiction_code: string
          name: string
          postal_code_pattern: string | null
          state_province: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          city?: string | null
          country?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          jurisdiction_code: string
          name: string
          postal_code_pattern?: string | null
          state_province?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          city?: string | null
          country?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          jurisdiction_code?: string
          name?: string
          postal_code_pattern?: string | null
          state_province?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      tax_rates: {
        Row: {
          created_at: string
          effective_date: string
          expiry_date: string | null
          id: string
          is_active: boolean | null
          jurisdiction_id: string | null
          name: string
          rate_percentage: number
          tax_type_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          effective_date?: string
          expiry_date?: string | null
          id?: string
          is_active?: boolean | null
          jurisdiction_id?: string | null
          name: string
          rate_percentage?: number
          tax_type_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          effective_date?: string
          expiry_date?: string | null
          id?: string
          is_active?: boolean | null
          jurisdiction_id?: string | null
          name?: string
          rate_percentage?: number
          tax_type_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tax_rates_jurisdiction_id_fkey"
            columns: ["jurisdiction_id"]
            isOneToOne: false
            referencedRelation: "tax_jurisdictions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_rates_tax_type_id_fkey"
            columns: ["tax_type_id"]
            isOneToOne: false
            referencedRelation: "tax_types"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_types: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          is_compound: boolean | null
          is_inclusive: boolean | null
          name: string
          tenant_id: string
          type_code: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_compound?: boolean | null
          is_inclusive?: boolean | null
          name: string
          tenant_id: string
          type_code: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_compound?: boolean | null
          is_inclusive?: boolean | null
          name?: string
          tenant_id?: string
          type_code?: string
          updated_at?: string
        }
        Relationships: []
      }
      tenant_custom_pricing: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          billing_plan_id: string
          created_at: string
          created_by: string
          custom_amount: number
          discount_percentage: number | null
          effective_date: string
          expires_at: string | null
          id: string
          is_active: boolean
          notes: string | null
          original_amount: number
          reason: string | null
          setup_fee: number | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          billing_plan_id: string
          created_at?: string
          created_by: string
          custom_amount: number
          discount_percentage?: number | null
          effective_date?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          original_amount: number
          reason?: string | null
          setup_fee?: number | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          billing_plan_id?: string
          created_at?: string
          created_by?: string
          custom_amount?: number
          discount_percentage?: number | null
          effective_date?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          original_amount?: number
          reason?: string | null
          setup_fee?: number | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_custom_pricing_billing_plan_id_fkey"
            columns: ["billing_plan_id"]
            isOneToOne: false
            referencedRelation: "billing_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_custom_pricing_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_domains: {
        Row: {
          created_at: string
          created_by: string
          domain_name: string
          domain_type: Database["public"]["Enums"]["domain_type"]
          id: string
          is_active: boolean
          is_primary: boolean
          notes: string | null
          ssl_expires_at: string | null
          ssl_issued_at: string | null
          ssl_status: Database["public"]["Enums"]["ssl_status"]
          status: Database["public"]["Enums"]["domain_status"]
          tenant_id: string
          updated_at: string
          verification_method: string | null
          verification_token: string | null
          verification_value: string | null
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          domain_name: string
          domain_type: Database["public"]["Enums"]["domain_type"]
          id?: string
          is_active?: boolean
          is_primary?: boolean
          notes?: string | null
          ssl_expires_at?: string | null
          ssl_issued_at?: string | null
          ssl_status?: Database["public"]["Enums"]["ssl_status"]
          status?: Database["public"]["Enums"]["domain_status"]
          tenant_id: string
          updated_at?: string
          verification_method?: string | null
          verification_token?: string | null
          verification_value?: string | null
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          domain_name?: string
          domain_type?: Database["public"]["Enums"]["domain_type"]
          id?: string
          is_active?: boolean
          is_primary?: boolean
          notes?: string | null
          ssl_expires_at?: string | null
          ssl_issued_at?: string | null
          ssl_status?: Database["public"]["Enums"]["ssl_status"]
          status?: Database["public"]["Enums"]["domain_status"]
          tenant_id?: string
          updated_at?: string
          verification_method?: string | null
          verification_token?: string | null
          verification_value?: string | null
          verified_at?: string | null
        }
        Relationships: []
      }
      tenant_feature_access: {
        Row: {
          created_at: string | null
          enabled_at: string | null
          enabled_by: string | null
          expires_at: string | null
          feature_name: string
          id: string
          is_enabled: boolean | null
          metadata: Json | null
          tenant_id: string
          updated_at: string | null
          usage_count: number | null
          usage_limit: number | null
        }
        Insert: {
          created_at?: string | null
          enabled_at?: string | null
          enabled_by?: string | null
          expires_at?: string | null
          feature_name: string
          id?: string
          is_enabled?: boolean | null
          metadata?: Json | null
          tenant_id: string
          updated_at?: string | null
          usage_count?: number | null
          usage_limit?: number | null
        }
        Update: {
          created_at?: string | null
          enabled_at?: string | null
          enabled_by?: string | null
          expires_at?: string | null
          feature_name?: string
          id?: string
          is_enabled?: boolean | null
          metadata?: Json | null
          tenant_id?: string
          updated_at?: string | null
          usage_count?: number | null
          usage_limit?: number | null
        }
        Relationships: []
      }
      tenant_subscription_details: {
        Row: {
          billing_day: number | null
          billing_plan_id: string | null
          cancelled_at: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          is_prorated_period: boolean | null
          metadata: Json | null
          next_billing_amount: number | null
          next_billing_date: string | null
          paystack_customer_id: string | null
          paystack_plan_id: string | null
          paystack_subscription_id: string | null
          status: string
          tenant_id: string
          trial_end: string | null
          trial_start: string | null
          updated_at: string
        }
        Insert: {
          billing_day?: number | null
          billing_plan_id?: string | null
          cancelled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          is_prorated_period?: boolean | null
          metadata?: Json | null
          next_billing_amount?: number | null
          next_billing_date?: string | null
          paystack_customer_id?: string | null
          paystack_plan_id?: string | null
          paystack_subscription_id?: string | null
          status?: string
          tenant_id: string
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string
        }
        Update: {
          billing_day?: number | null
          billing_plan_id?: string | null
          cancelled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          is_prorated_period?: boolean | null
          metadata?: Json | null
          next_billing_amount?: number | null
          next_billing_date?: string | null
          paystack_customer_id?: string | null
          paystack_plan_id?: string | null
          paystack_subscription_id?: string | null
          status?: string
          tenant_id?: string
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_subscription_details_billing_plan_id_fkey"
            columns: ["billing_plan_id"]
            isOneToOne: false
            referencedRelation: "billing_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_subscriptions: {
        Row: {
          amount: number
          billing_plan_id: string
          cancelled_at: string | null
          created_at: string
          currency: string
          expires_at: string | null
          id: string
          reference: string
          started_at: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          billing_plan_id: string
          cancelled_at?: string | null
          created_at?: string
          currency?: string
          expires_at?: string | null
          id?: string
          reference: string
          started_at?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          billing_plan_id?: string
          cancelled_at?: string | null
          created_at?: string
          currency?: string
          expires_at?: string | null
          id?: string
          reference?: string
          started_at?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_subscriptions_billing_plan_id_fkey"
            columns: ["billing_plan_id"]
            isOneToOne: false
            referencedRelation: "billing_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_users: {
        Row: {
          created_at: string
          id: string
          invitation_accepted_at: string | null
          invitation_status: string | null
          invited_at: string | null
          is_active: boolean
          location_id: string | null
          role: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invitation_accepted_at?: string | null
          invitation_status?: string | null
          invited_at?: string | null
          is_active?: boolean
          location_id?: string | null
          role?: string
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invitation_accepted_at?: string | null
          invitation_status?: string | null
          invited_at?: string | null
          is_active?: boolean
          location_id?: string | null
          role?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_users_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "store_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_version_tracking: {
        Row: {
          created_at: string
          deployed_at: string
          deployment_method: string | null
          deployment_status: string
          id: string
          performance_metrics: Json | null
          rollback_reason: string | null
          rollback_version_id: string | null
          tenant_id: string
          updated_at: string
          version_id: string
        }
        Insert: {
          created_at?: string
          deployed_at?: string
          deployment_method?: string | null
          deployment_status?: string
          id?: string
          performance_metrics?: Json | null
          rollback_reason?: string | null
          rollback_version_id?: string | null
          tenant_id: string
          updated_at?: string
          version_id: string
        }
        Update: {
          created_at?: string
          deployed_at?: string
          deployment_method?: string | null
          deployment_status?: string
          id?: string
          performance_metrics?: Json | null
          rollback_reason?: string | null
          rollback_version_id?: string | null
          tenant_id?: string
          updated_at?: string
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_version_tracking_rollback_version_id_fkey"
            columns: ["rollback_version_id"]
            isOneToOne: false
            referencedRelation: "application_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_version_tracking_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "application_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_whatsapp_configs: {
        Row: {
          api_key: string
          created_at: string
          display_name: string | null
          id: string
          is_active: boolean
          phone_number: string
          tenant_id: string
          updated_at: string
          webhook_url: string | null
        }
        Insert: {
          api_key: string
          created_at?: string
          display_name?: string | null
          id?: string
          is_active?: boolean
          phone_number: string
          tenant_id: string
          updated_at?: string
          webhook_url?: string | null
        }
        Update: {
          api_key?: string
          created_at?: string
          display_name?: string | null
          id?: string
          is_active?: boolean
          phone_number?: string
          tenant_id?: string
          updated_at?: string
          webhook_url?: string | null
        }
        Relationships: []
      }
      tenant_whatsapp_numbers: {
        Row: {
          business_profile: Json | null
          created_at: string
          created_by: string | null
          display_name: string | null
          id: string
          is_active: boolean | null
          last_verification_attempt: string | null
          monthly_fee: number | null
          phone_number: string
          status: string
          tenant_id: string
          updated_at: string
          verification_attempts: number | null
          verification_code: string | null
          verified_at: string | null
          waba_phone_number_id: string | null
          webhook_url: string | null
          webhook_verify_token: string | null
        }
        Insert: {
          business_profile?: Json | null
          created_at?: string
          created_by?: string | null
          display_name?: string | null
          id?: string
          is_active?: boolean | null
          last_verification_attempt?: string | null
          monthly_fee?: number | null
          phone_number: string
          status?: string
          tenant_id: string
          updated_at?: string
          verification_attempts?: number | null
          verification_code?: string | null
          verified_at?: string | null
          waba_phone_number_id?: string | null
          webhook_url?: string | null
          webhook_verify_token?: string | null
        }
        Update: {
          business_profile?: Json | null
          created_at?: string
          created_by?: string | null
          display_name?: string | null
          id?: string
          is_active?: boolean | null
          last_verification_attempt?: string | null
          monthly_fee?: number | null
          phone_number?: string
          status?: string
          tenant_id?: string
          updated_at?: string
          verification_attempts?: number | null
          verification_code?: string | null
          verified_at?: string | null
          waba_phone_number_id?: string | null
          webhook_url?: string | null
          webhook_verify_token?: string | null
        }
        Relationships: []
      }
      tenants: {
        Row: {
          address: string | null
          billing_plan_id: string
          contact_email: string | null
          contact_phone: string | null
          country: string | null
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          max_users: number | null
          name: string
          plan_type: string
          status: string
          subdomain: string
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          billing_plan_id: string
          contact_email?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          max_users?: number | null
          name: string
          plan_type?: string
          status?: string
          subdomain: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          billing_plan_id?: string
          contact_email?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          max_users?: number | null
          name?: string
          plan_type?: string
          status?: string
          subdomain?: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_tenants_billing_plan"
            columns: ["billing_plan_id"]
            isOneToOne: false
            referencedRelation: "billing_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      transfer_requests: {
        Row: {
          amount: number
          completed_at: string | null
          created_at: string
          currency_code: string | null
          from_drawer_id: string | null
          from_payment_method_id: string | null
          from_user_id: string
          id: string
          notes: string | null
          reason: string | null
          reference_number: string | null
          requested_at: string
          responded_at: string | null
          responded_by: string | null
          status: string
          tenant_id: string
          to_account_id: string | null
          to_drawer_id: string | null
          to_payment_method_id: string | null
          to_user_id: string
          transfer_type: string
          updated_at: string
        }
        Insert: {
          amount: number
          completed_at?: string | null
          created_at?: string
          currency_code?: string | null
          from_drawer_id?: string | null
          from_payment_method_id?: string | null
          from_user_id: string
          id?: string
          notes?: string | null
          reason?: string | null
          reference_number?: string | null
          requested_at?: string
          responded_at?: string | null
          responded_by?: string | null
          status?: string
          tenant_id: string
          to_account_id?: string | null
          to_drawer_id?: string | null
          to_payment_method_id?: string | null
          to_user_id: string
          transfer_type: string
          updated_at?: string
        }
        Update: {
          amount?: number
          completed_at?: string | null
          created_at?: string
          currency_code?: string | null
          from_drawer_id?: string | null
          from_payment_method_id?: string | null
          from_user_id?: string
          id?: string
          notes?: string | null
          reason?: string | null
          reference_number?: string | null
          requested_at?: string
          responded_at?: string | null
          responded_by?: string | null
          status?: string
          tenant_id?: string
          to_account_id?: string | null
          to_drawer_id?: string | null
          to_payment_method_id?: string | null
          to_user_id?: string
          transfer_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transfer_requests_from_drawer_id_fkey"
            columns: ["from_drawer_id"]
            isOneToOne: false
            referencedRelation: "cash_drawers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfer_requests_from_payment_method_id_fkey"
            columns: ["from_payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfer_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfer_requests_to_account_id_fkey"
            columns: ["to_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfer_requests_to_drawer_id_fkey"
            columns: ["to_drawer_id"]
            isOneToOne: false
            referencedRelation: "cash_drawers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfer_requests_to_payment_method_id_fkey"
            columns: ["to_payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
        ]
      }
      user_activity_logs: {
        Row: {
          action_type: string
          created_at: string
          details: Json | null
          id: string
          ip_address: unknown | null
          resource_id: string | null
          resource_type: string | null
          tenant_id: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: unknown | null
          resource_id?: string | null
          resource_type?: string | null
          tenant_id: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: unknown | null
          resource_id?: string | null
          resource_type?: string | null
          tenant_id?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_activity_permissions: {
        Row: {
          action: string
          conditions: Json | null
          created_at: string | null
          expires_at: string | null
          granted_at: string | null
          granted_by: string | null
          id: string
          is_allowed: boolean | null
          last_used_at: string | null
          resource: string
          tenant_id: string
          usage_count: number | null
          user_id: string
        }
        Insert: {
          action: string
          conditions?: Json | null
          created_at?: string | null
          expires_at?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          is_allowed?: boolean | null
          last_used_at?: string | null
          resource: string
          tenant_id: string
          usage_count?: number | null
          user_id: string
        }
        Update: {
          action?: string
          conditions?: Json | null
          created_at?: string | null
          expires_at?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          is_allowed?: boolean | null
          last_used_at?: string | null
          resource?: string
          tenant_id?: string
          usage_count?: number | null
          user_id?: string
        }
        Relationships: []
      }
      user_legal_acceptances: {
        Row: {
          accepted_at: string
          document_version_id: string
          id: string
          ip_address: unknown | null
          metadata: Json | null
          tenant_id: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          accepted_at?: string
          document_version_id: string
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          tenant_id?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          accepted_at?: string
          document_version_id?: string
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          tenant_id?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_legal_acceptances_document_version_id_fkey"
            columns: ["document_version_id"]
            isOneToOne: false
            referencedRelation: "legal_document_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          created_at: string
          id: string
          preferences: Json
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          preferences?: Json
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          preferences?: Json
          tenant_id?: string
          updated_at?: string
          user_id?: string
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
          can_manage_settings: boolean | null
          can_manage_users: boolean | null
          can_view_reports: boolean | null
          color: string | null
          created_at: string
          created_by: string | null
          description: string | null
          feature_set_id: string | null
          id: string
          is_active: boolean | null
          is_editable: boolean
          is_system_role: boolean | null
          level: number | null
          name: string
          permissions: Json | null
          resource_limits: Json | null
          sort_order: number | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          can_manage_settings?: boolean | null
          can_manage_users?: boolean | null
          can_view_reports?: boolean | null
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          feature_set_id?: string | null
          id?: string
          is_active?: boolean | null
          is_editable?: boolean
          is_system_role?: boolean | null
          level?: number | null
          name: string
          permissions?: Json | null
          resource_limits?: Json | null
          sort_order?: number | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          can_manage_settings?: boolean | null
          can_manage_users?: boolean | null
          can_view_reports?: boolean | null
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          feature_set_id?: string | null
          id?: string
          is_active?: boolean | null
          is_editable?: boolean
          is_system_role?: boolean | null
          level?: number | null
          name?: string
          permissions?: Json | null
          resource_limits?: Json | null
          sort_order?: number | null
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
      user_sessions: {
        Row: {
          created_at: string
          device_info: Json | null
          expires_at: string
          id: string
          ip_address: unknown | null
          is_active: boolean
          last_activity: string
          session_token: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_info?: Json | null
          expires_at: string
          id?: string
          ip_address?: unknown | null
          is_active?: boolean
          last_activity?: string
          session_token: string
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_info?: Json | null
          expires_at?: string
          id?: string
          ip_address?: unknown | null
          is_active?: boolean
          last_activity?: string
          session_token?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: []
      }
      warranty_info: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          product_id: string
          updated_at: string
          warranty_period_months: number
          warranty_terms: string | null
          warranty_type: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          product_id: string
          updated_at?: string
          warranty_period_months?: number
          warranty_terms?: string | null
          warranty_type?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          product_id?: string
          updated_at?: string
          warranty_period_months?: number
          warranty_terms?: string | null
          warranty_type?: string | null
        }
        Relationships: []
      }
      whatsapp_automation_settings: {
        Row: {
          conditions: Json | null
          created_at: string
          delay_minutes: number | null
          event_type: string
          id: string
          is_enabled: boolean | null
          template_id: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          conditions?: Json | null
          created_at?: string
          delay_minutes?: number | null
          event_type: string
          id?: string
          is_enabled?: boolean | null
          template_id?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          conditions?: Json | null
          created_at?: string
          delay_minutes?: number | null
          event_type?: string
          id?: string
          is_enabled?: boolean | null
          template_id?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      whatsapp_billing: {
        Row: {
          base_fee: number
          billing_period_end: string
          billing_period_start: string
          created_at: string
          currency: string | null
          id: string
          message_count: number | null
          message_fees: number | null
          paid_at: string | null
          phone_number_id: string
          status: string
          tenant_id: string
          total_amount: number
        }
        Insert: {
          base_fee?: number
          billing_period_end: string
          billing_period_start: string
          created_at?: string
          currency?: string | null
          id?: string
          message_count?: number | null
          message_fees?: number | null
          paid_at?: string | null
          phone_number_id: string
          status?: string
          tenant_id: string
          total_amount: number
        }
        Update: {
          base_fee?: number
          billing_period_end?: string
          billing_period_start?: string
          created_at?: string
          currency?: string | null
          id?: string
          message_count?: number | null
          message_fees?: number | null
          paid_at?: string | null
          phone_number_id?: string
          status?: string
          tenant_id?: string
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_billing_phone_number_id_fkey"
            columns: ["phone_number_id"]
            isOneToOne: false
            referencedRelation: "tenant_whatsapp_numbers"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_bulk_campaign_messages: {
        Row: {
          campaign_id: string
          contact_id: string
          contact_name: string | null
          created_at: string
          delivered_at: string | null
          error_message: string | null
          external_id: string | null
          id: string
          message_content: string
          phone_number: string
          sent_at: string | null
          status: string
        }
        Insert: {
          campaign_id: string
          contact_id: string
          contact_name?: string | null
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          external_id?: string | null
          id?: string
          message_content: string
          phone_number: string
          sent_at?: string | null
          status?: string
        }
        Update: {
          campaign_id?: string
          contact_id?: string
          contact_name?: string | null
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          external_id?: string | null
          id?: string
          message_content?: string
          phone_number?: string
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_bulk_campaign_messages_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_bulk_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_bulk_campaigns: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string
          failed_count: number | null
          id: string
          message_content: string
          name: string
          scheduled_for: string | null
          sent_count: number | null
          started_at: string | null
          status: string
          target_contacts: Json
          template_id: string | null
          tenant_id: string
          total_recipients: number | null
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by: string
          failed_count?: number | null
          id?: string
          message_content: string
          name: string
          scheduled_for?: string | null
          sent_count?: number | null
          started_at?: string | null
          status?: string
          target_contacts?: Json
          template_id?: string | null
          tenant_id: string
          total_recipients?: number | null
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string
          failed_count?: number | null
          id?: string
          message_content?: string
          name?: string
          scheduled_for?: string | null
          sent_count?: number | null
          started_at?: string | null
          status?: string
          target_contacts?: Json
          template_id?: string | null
          tenant_id?: string
          total_recipients?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      whatsapp_message_logs: {
        Row: {
          cost: number | null
          created_at: string
          delivered_at: string | null
          delivery_status: Json | null
          error_code: string | null
          error_message: string | null
          failed_at: string | null
          id: string
          media_type: string | null
          media_url: string | null
          message_content: string | null
          message_type: string
          phone_number_id: string
          read_at: string | null
          recipient_phone: string
          sent_at: string | null
          status: string
          template_id: string | null
          template_type: string | null
          tenant_id: string
          waba_message_id: string | null
        }
        Insert: {
          cost?: number | null
          created_at?: string
          delivered_at?: string | null
          delivery_status?: Json | null
          error_code?: string | null
          error_message?: string | null
          failed_at?: string | null
          id?: string
          media_type?: string | null
          media_url?: string | null
          message_content?: string | null
          message_type?: string
          phone_number_id: string
          read_at?: string | null
          recipient_phone: string
          sent_at?: string | null
          status?: string
          template_id?: string | null
          template_type?: string | null
          tenant_id: string
          waba_message_id?: string | null
        }
        Update: {
          cost?: number | null
          created_at?: string
          delivered_at?: string | null
          delivery_status?: Json | null
          error_code?: string | null
          error_message?: string | null
          failed_at?: string | null
          id?: string
          media_type?: string | null
          media_url?: string | null
          message_content?: string | null
          message_type?: string
          phone_number_id?: string
          read_at?: string | null
          recipient_phone?: string
          sent_at?: string | null
          status?: string
          template_id?: string | null
          template_type?: string | null
          tenant_id?: string
          waba_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_message_logs_phone_number_id_fkey"
            columns: ["phone_number_id"]
            isOneToOne: false
            referencedRelation: "tenant_whatsapp_numbers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_message_logs_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_message_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_message_templates: {
        Row: {
          body_text: string
          buttons: Json | null
          category: string
          created_at: string
          footer_text: string | null
          header_content: string | null
          header_type: string | null
          id: string
          is_system_template: boolean | null
          language: string
          quality_score: string | null
          status: string
          template_name: string
          tenant_id: string | null
          updated_at: string
          variables: Json | null
          waba_template_id: string | null
        }
        Insert: {
          body_text: string
          buttons?: Json | null
          category?: string
          created_at?: string
          footer_text?: string | null
          header_content?: string | null
          header_type?: string | null
          id?: string
          is_system_template?: boolean | null
          language?: string
          quality_score?: string | null
          status?: string
          template_name: string
          tenant_id?: string | null
          updated_at?: string
          variables?: Json | null
          waba_template_id?: string | null
        }
        Update: {
          body_text?: string
          buttons?: Json | null
          category?: string
          created_at?: string
          footer_text?: string | null
          header_content?: string | null
          header_type?: string | null
          id?: string
          is_system_template?: boolean | null
          language?: string
          quality_score?: string | null
          status?: string
          template_name?: string
          tenant_id?: string | null
          updated_at?: string
          variables?: Json | null
          waba_template_id?: string | null
        }
        Relationships: []
      }
      whatsapp_templates: {
        Row: {
          created_at: string
          created_by: string
          id: string
          is_active: boolean
          message_body: string
          name: string
          subject: string | null
          template_type: string
          tenant_id: string
          type: string | null
          updated_at: string
          variables: Json | null
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          is_active?: boolean
          message_body: string
          name: string
          subject?: string | null
          template_type: string
          tenant_id: string
          type?: string | null
          updated_at?: string
          variables?: Json | null
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean
          message_body?: string
          name?: string
          subject?: string | null
          template_type?: string
          tenant_id?: string
          type?: string | null
          updated_at?: string
          variables?: Json | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_aging_analysis: {
        Args: {
          analysis_type: string
          as_of_date?: string
          tenant_id_param: string
        }
        Returns: {
          current_amount: number
          days_30_amount: number
          days_60_amount: number
          days_90_amount: number
          days_over_90_amount: number
          total_amount: number
        }[]
      }
      calculate_next_billing_date: {
        Args: { input_date?: string }
        Returns: string
      }
      calculate_profit_loss: {
        Args: {
          end_date_param: string
          start_date_param: string
          tenant_id_param: string
        }
        Returns: {
          expenses: number
          income: number
          profit_loss: number
        }[]
      }
      calculate_promotion_discount: {
        Args: {
          item_price_param: number
          item_quantity_param?: number
          promotion_id_param: string
          total_amount_param?: number
        }
        Returns: {
          affected_quantity: number
          discount_amount: number
        }[]
      }
      calculate_prorated_amount: {
        Args: { billing_day?: number; full_amount: number; start_date: string }
        Returns: {
          days_in_period: number
          prorated_amount: number
          total_days_in_month: number
        }[]
      }
      calculate_purchase_total: {
        Args: { purchase_id_param: string }
        Returns: number
      }
      calculate_review_analytics: {
        Args: { date_param?: string; tenant_id_param: string }
        Returns: undefined
      }
      calculate_tax_amount: {
        Args: {
          base_amount_param: number
          exemption_id_param?: string
          tax_rate_id_param: string
          tenant_id_param: string
        }
        Returns: {
          exemption_amount: number
          final_tax_amount: number
          tax_amount: number
        }[]
      }
      check_rate_limit: {
        Args: {
          action_type_param: string
          block_minutes?: number
          identifier_param: string
          max_attempts?: number
          window_minutes?: number
        }
        Returns: boolean
      }
      copy_role: {
        Args: {
          new_role_description?: string
          new_role_name: string
          source_role_id: string
          target_tenant_id?: string
        }
        Returns: string
      }
      create_accounts_payable_record: {
        Args: {
          due_date_param?: string
          purchase_id_param: string
          supplier_id_param: string
          tenant_id_param: string
          total_amount_param: number
        }
        Returns: string
      }
      create_accounts_receivable_record: {
        Args: {
          customer_id_param: string
          due_date_param?: string
          sale_id_param: string
          tenant_id_param: string
          total_amount_param: number
        }
        Returns: string
      }
      create_initial_admin_role: {
        Args: { admin_user_id: string; tenant_id_param: string }
        Returns: string
      }
      create_otp_verification: {
        Args: {
          email_param: string
          otp_type_param?: string
          user_id_param: string
        }
        Returns: {
          expires_at: string
          otp_code: string
        }[]
      }
      create_payment_record: {
        Args: {
          amount_param: number
          billing_plan_id_param: string
          currency_param?: string
          payment_type_param?: string
          reference_param: string
          tenant_id_param: string
        }
        Returns: string
      }
      create_superadmin_profile: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      create_whatsapp_billing_record: {
        Args: {
          billing_period_end_param: string
          billing_period_start_param: string
          phone_number_id_param: string
          tenant_id_param: string
        }
        Returns: string
      }
      debug_user_auth: {
        Args: Record<PropertyKey, never>
        Returns: {
          auth_uid_result: string
          current_role_result: Database["public"]["Enums"]["user_role"]
          profile_exists: boolean
          tenant_user_exists: boolean
          user_tenant_id_result: string
        }[]
      }
      ensure_all_tenants_have_admin_roles: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      ensure_tenant_subdomain: {
        Args: { tenant_id_param: string }
        Returns: string
      }
      fix_tenants_without_subdomains: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      generate_domain_verification_token: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_otp_code: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_return_number: {
        Args: { tenant_id_param: string }
        Returns: string
      }
      get_account_balance: {
        Args: { account_id_param: string; as_of_date?: string }
        Returns: number
      }
      get_campaign_target_tenants: {
        Args: { segment_criteria_param?: Json; target_audience_param: string }
        Returns: {
          admin_email: string
          admin_name: string
          created_at: string
          status: string
          tenant_id: string
          tenant_name: string
        }[]
      }
      get_current_application_version: {
        Args: Record<PropertyKey, never>
        Returns: {
          build_number: number
          is_stable: boolean
          release_date: string
          version_name: string
          version_number: string
        }[]
      }
      get_current_legal_document: {
        Args: { document_type_param: string; tenant_id_param?: string }
        Returns: {
          content: string
          document_id: string
          effective_date: string
          title: string
          version_id: string
          version_number: string
        }[]
      }
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: Database["public"]["Enums"]["user_role"]
      }
      get_effective_subscription_status: {
        Args: { subscription_status: string; trial_end: string }
        Returns: string
      }
      get_product_history_summary: {
        Args: { product_id_param: string }
        Returns: {
          last_change_date: string
          most_active_user: string
          price_changes: number
          status_changes: number
          stock_adjustments: number
          total_changes: number
        }[]
      }
      get_tenant_by_domain: {
        Args: { domain_name_param: string }
        Returns: string
      }
      get_tenant_effective_pricing: {
        Args: { billing_plan_id_param: string; tenant_id_param: string }
        Returns: {
          custom_pricing_id: string
          discount_percentage: number
          effective_amount: number
          is_custom: boolean
          original_amount: number
        }[]
      }
      get_tenant_permissions: {
        Args: { tenant_id_param: string }
        Returns: {
          action: string
          category: string
          description: string
          id: string
          is_critical: boolean
          is_custom: boolean
          name: string
          resource: string
          tenant_id: string
        }[]
      }
      get_tenant_user_emails: {
        Args: { tenant_id: string } | { user_ids: string[] }
        Returns: {
          email: string
          user_id: string
        }[]
      }
      get_tenant_users_with_roles: {
        Args: {
          p_limit?: number
          p_offset?: number
          p_role_filter?: string
          p_search?: string
          p_tenant_id?: string
        }
        Returns: {
          created_at: string
          email: string
          full_name: string
          invited: boolean
          last_sign_in_at: string
          primary_role: string
          role_names: string[]
          status: string
          total_count: number
          user_id: string
        }[]
      }
      get_transfer_request_details: {
        Args: { request_id: string }
        Returns: {
          amount: number
          completed_at: string
          created_at: string
          currency_code: string
          from_drawer_id: string
          from_drawer_name: string
          from_payment_method_id: string
          from_payment_method_name: string
          from_user_id: string
          id: string
          notes: string
          reason: string
          reference_number: string
          requested_at: string
          responded_at: string
          responded_by: string
          status: string
          tenant_id: string
          to_drawer_id: string
          to_drawer_name: string
          to_payment_method_id: string
          to_payment_method_name: string
          to_user_id: string
          transfer_type: string
          updated_at: string
        }[]
      }
      get_user_contact_profile: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_user_default_location: {
        Args: { user_tenant_id: string }
        Returns: string
      }
      get_user_feature_access: {
        Args: { user_tenant_id: string }
        Returns: {
          expires_at: string
          feature_name: string
          is_enabled: boolean
        }[]
      }
      get_user_permissions: {
        Args: { user_id_param: string }
        Returns: {
          action: Database["public"]["Enums"]["permission_action"]
          category: string
          permission_name: string
          resource: Database["public"]["Enums"]["permission_resource"]
        }[]
      }
      get_user_tenant_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      is_domain_available: {
        Args: { domain_name_param: string }
        Returns: boolean
      }
      is_promotion_valid: {
        Args: {
          current_time_param?: string
          customer_type_param?: string
          promotion_id_param: string
          purchase_amount_param?: number
        }
        Returns: boolean
      }
      is_tenant_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      link_user_to_contact: {
        Args: { contact_id: string }
        Returns: boolean
      }
      log_security_event: {
        Args: {
          details?: Json
          event_type: string
          ip_address_param?: unknown
          user_agent_param?: string
          user_id_param: string
        }
        Returns: string
      }
      log_user_activity: {
        Args: {
          action_type_param: string
          details_param?: Json
          ip_address_param?: unknown
          resource_id_param?: string
          resource_type_param?: string
          tenant_id_param: string
          user_agent_param?: string
          user_id_param: string
        }
        Returns: string
      }
      open_cash_drawer: {
        Args: { drawer_id_param: string; opening_balance_param: number }
        Returns: boolean
      }
      process_bank_transfer: {
        Args: {
          action_param: string
          notes_param?: string
          transfer_id_param: string
        }
        Returns: boolean
      }
      process_cash_transfer: {
        Args: {
          action_param: string
          notes_param?: string
          transfer_request_id_param: string
        }
        Returns: boolean
      }
      process_cash_transfer_request: {
        Args: { action_param: string; transfer_request_id_param: string }
        Returns: boolean
      }
      process_return: {
        Args: { return_id_param: string }
        Returns: boolean
      }
      process_transfer_request: {
        Args: { action: string; transfer_request_id: string }
        Returns: boolean
      }
      queue_campaign_emails: {
        Args: { campaign_id_param: string }
        Returns: number
      }
      queue_email: {
        Args: {
          html_content_param: string
          priority_param?: string
          scheduled_for_param?: string
          subject_param: string
          template_id_param?: string
          tenant_id_param: string
          text_content_param?: string
          to_email_param: string
          to_name_param?: string
          variables_param?: Json
        }
        Returns: string
      }
      reactivate_tenant_membership: {
        Args: { target_email_param: string; tenant_id_param: string }
        Returns: boolean
      }
      record_cash_transaction_with_accounting: {
        Args: {
          amount_param: number
          description_param: string
          drawer_id_param: string
          reference_id_param?: string
          reference_type_param?: string
          transaction_type_param: string
        }
        Returns: string
      }
      set_current_version: {
        Args: { version_number_param: string }
        Returns: boolean
      }
      setup_default_accounts: {
        Args: { tenant_id_param: string }
        Returns: undefined
      }
      setup_default_business_settings: {
        Args: { tenant_id_param: string }
        Returns: undefined
      }
      setup_default_user_roles: {
        Args: { tenant_id_param: string }
        Returns: undefined
      }
      setup_monthly_billing_cycle: {
        Args: {
          billing_plan_id_param: string
          start_date_param?: string
          tenant_id_param: string
        }
        Returns: {
          billing_amount: number
          billing_period_end: string
          billing_period_start: string
          is_prorated: boolean
          next_billing_date: string
        }[]
      }
      setup_tenant_default_features: {
        Args: { tenant_id_param: string }
        Returns: undefined
      }
      track_tenant_deployment: {
        Args: {
          deployment_method_param?: string
          tenant_id_param: string
          version_number_param: string
        }
        Returns: string
      }
      update_account_balances_from_entries: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      update_campaign_statistics: {
        Args: { campaign_id_param: string }
        Returns: undefined
      }
      update_payment_status: {
        Args: {
          metadata_param?: Json
          reference_param: string
          status_param: string
        }
        Returns: boolean
      }
      update_product_stock: {
        Args: { product_id: string; quantity_sold: number }
        Returns: undefined
      }
      update_variant_stock: {
        Args: { quantity_sold: number; variant_id: string }
        Returns: undefined
      }
      user_has_feature_access: {
        Args: { feature_name_param: string; user_tenant_id: string }
        Returns: boolean
      }
      user_has_permission: {
        Args: {
          action_param: Database["public"]["Enums"]["permission_action"]
          resource_param: Database["public"]["Enums"]["permission_resource"]
          user_id_param: string
        }
        Returns: boolean
      }
      verify_otp_code: {
        Args:
          | {
              email_param: string
              otp_code_param: string
              otp_type_param?: string
              user_id_param: string
            }
          | {
              otp_code_param: string
              otp_type_param: string
              user_id_param: string
            }
        Returns: boolean
      }
    }
    Enums: {
      domain_status: "pending" | "verifying" | "verified" | "failed" | "expired"
      domain_type: "subdomain" | "custom_domain"
      feature_status: "active" | "inactive" | "deprecated" | "beta"
      feature_type: "core" | "premium" | "enterprise" | "addon"
      notification_priority: "low" | "medium" | "high" | "urgent"
      notification_status:
        | "pending"
        | "sent"
        | "delivered"
        | "failed"
        | "read"
        | "queued"
      notification_type:
        | "system"
        | "user_invitation"
        | "password_reset"
        | "account_verification"
        | "payment_reminder"
        | "order_confirmation"
        | "subscription_update"
        | "security_alert"
        | "marketing"
        | "announcement"
      permission_action:
        | "create"
        | "read"
        | "update"
        | "delete"
        | "approve"
        | "void"
        | "export"
        | "import"
        | "print"
        | "email"
        | "manage"
      permission_resource:
        | "dashboard"
        | "products"
        | "product_categories"
        | "product_variants"
        | "inventory_management"
        | "stock_adjustments"
        | "sales"
        | "sale_returns"
        | "quotes"
        | "purchases"
        | "purchase_returns"
        | "customers"
        | "suppliers"
        | "contacts"
        | "accounting"
        | "chart_of_accounts"
        | "financial_statements"
        | "accounts_receivable"
        | "accounts_payable"
        | "journal_entries"
        | "reports"
        | "sales_reports"
        | "inventory_reports"
        | "financial_reports"
        | "user_management"
        | "role_management"
        | "permission_management"
        | "business_settings"
        | "payment_methods"
        | "tax_settings"
        | "location_management"
        | "promotion_management"
        | "loyalty_program"
        | "gift_cards"
        | "barcode_management"
        | "data_import_export"
        | "system_backup"
        | "audit_logs"
        | "email_notifications"
        | "sms_notifications"
        | "whatsapp_notifications"
        | "api_access"
        | "pos_system"
        | "cashier_operations"
        | "discount_management"
        | "receipt_printing"
        | "session_management"
      ssl_status: "none" | "pending" | "issued" | "expired" | "failed"
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
      domain_status: ["pending", "verifying", "verified", "failed", "expired"],
      domain_type: ["subdomain", "custom_domain"],
      feature_status: ["active", "inactive", "deprecated", "beta"],
      feature_type: ["core", "premium", "enterprise", "addon"],
      notification_priority: ["low", "medium", "high", "urgent"],
      notification_status: [
        "pending",
        "sent",
        "delivered",
        "failed",
        "read",
        "queued",
      ],
      notification_type: [
        "system",
        "user_invitation",
        "password_reset",
        "account_verification",
        "payment_reminder",
        "order_confirmation",
        "subscription_update",
        "security_alert",
        "marketing",
        "announcement",
      ],
      permission_action: [
        "create",
        "read",
        "update",
        "delete",
        "approve",
        "void",
        "export",
        "import",
        "print",
        "email",
        "manage",
      ],
      permission_resource: [
        "dashboard",
        "products",
        "product_categories",
        "product_variants",
        "inventory_management",
        "stock_adjustments",
        "sales",
        "sale_returns",
        "quotes",
        "purchases",
        "purchase_returns",
        "customers",
        "suppliers",
        "contacts",
        "accounting",
        "chart_of_accounts",
        "financial_statements",
        "accounts_receivable",
        "accounts_payable",
        "journal_entries",
        "reports",
        "sales_reports",
        "inventory_reports",
        "financial_reports",
        "user_management",
        "role_management",
        "permission_management",
        "business_settings",
        "payment_methods",
        "tax_settings",
        "location_management",
        "promotion_management",
        "loyalty_program",
        "gift_cards",
        "barcode_management",
        "data_import_export",
        "system_backup",
        "audit_logs",
        "email_notifications",
        "sms_notifications",
        "whatsapp_notifications",
        "api_access",
        "pos_system",
        "cashier_operations",
        "discount_management",
        "receipt_printing",
        "session_management",
      ],
      ssl_status: ["none", "pending", "issued", "expired", "failed"],
      user_role: ["superadmin", "admin", "manager", "cashier", "user"],
    },
  },
} as const
