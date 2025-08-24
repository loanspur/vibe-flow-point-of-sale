import { supabase } from '@/lib/supabase';

export interface IntegrationConfig {
  id: string;
  integration_type: 'quickbooks' | 'kra_etims' | 'paystack' | 'mpesa' | 'custom';
  tenant_id: string;
  is_active: boolean;
  config_data: Record<string, any>;
  last_sync_at?: string;
  sync_frequency: 'hourly' | 'daily' | 'weekly' | 'manual';
  created_at: string;
  updated_at: string;
}

export interface SyncJob {
  id: string;
  integration_id: string;
  tenant_id: string;
  job_type: 'export' | 'import' | 'sync';
  status: 'pending' | 'running' | 'completed' | 'failed';
  data_type: string;
  records_processed: number;
  records_successful: number;
  records_failed: number;
  error_message?: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  integration_id: string;
  tenant_id: string;
  action: 'sync_started' | 'sync_completed' | 'sync_failed' | 'config_updated' | 'connection_test';
  details: Record<string, any>;
  user_id?: string;
  ip_address?: string;
  created_at: string;
}

export interface QuickBooksConfig {
  client_id: string;
  client_secret: string;
  refresh_token: string;
  access_token: string;
  realm_id: string;
  environment: 'sandbox' | 'production';
  sync_customers: boolean;
  sync_products: boolean;
  sync_invoices: boolean;
  sync_payments: boolean;
}

export interface KRATIMSConfig {
  api_key: string;
  api_secret: string;
  business_pin: string;
  environment: 'sandbox' | 'production';
  sync_sales: boolean;
  sync_purchases: boolean;
  sync_inventory: boolean;
}

export class ExternalIntegrationsManager {
  private static instance: ExternalIntegrationsManager;

  static getInstance(): ExternalIntegrationsManager {
    if (!ExternalIntegrationsManager.instance) {
      ExternalIntegrationsManager.instance = new ExternalIntegrationsManager();
    }
    return ExternalIntegrationsManager.instance;
  }

  // Integration Configuration Management
  async createIntegration(tenantId: string, config: Partial<IntegrationConfig>): Promise<IntegrationConfig> {
    try {
      const integration: IntegrationConfig = {
        id: `integration_${Date.now()}`,
        tenant_id: tenantId,
        is_active: true,
        sync_frequency: 'daily',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...config
      };

      const { data, error } = await supabase
        .from('external_integrations')
        .insert(integration)
        .select()
        .single();

      if (error) throw error;

      // Log the creation
      await this.logAuditEvent(integration.id, tenantId, 'config_updated', {
        action: 'integration_created',
        integration_type: integration.integration_type
      });

      return data;
    } catch (error) {
      console.error('Error creating integration:', error);
      throw error;
    }
  }

  async updateIntegration(integrationId: string, updates: Partial<IntegrationConfig>): Promise<IntegrationConfig> {
    try {
      const { data, error } = await supabase
        .from('external_integrations')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', integrationId)
        .select()
        .single();

      if (error) throw error;

      // Log the update
      await this.logAuditEvent(integrationId, data.tenant_id, 'config_updated', {
        action: 'integration_updated',
        updated_fields: Object.keys(updates)
      });

      return data;
    } catch (error) {
      console.error('Error updating integration:', error);
      throw error;
    }
  }

  async getIntegrations(tenantId: string): Promise<IntegrationConfig[]> {
    try {
      const { data, error } = await supabase
        .from('external_integrations')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching integrations:', error);
      throw error;
    }
  }

  async deleteIntegration(integrationId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('external_integrations')
        .delete()
        .eq('id', integrationId);

      if (error) throw error;

      // Log the deletion
      await this.logAuditEvent(integrationId, '', 'config_updated', {
        action: 'integration_deleted'
      });
    } catch (error) {
      console.error('Error deleting integration:', error);
      throw error;
    }
  }

  // QuickBooks Integration
  async syncQuickBooks(integrationId: string, dataType: 'customers' | 'products' | 'invoices' | 'payments'): Promise<SyncJob> {
    try {
      // Get integration config
      const { data: integration, error: configError } = await supabase
        .from('external_integrations')
        .select('*')
        .eq('id', integrationId)
        .single();

      if (configError) throw configError;

      const config = integration.config_data as QuickBooksConfig;

      // Create sync job
      const syncJob: SyncJob = {
        id: `sync_${Date.now()}`,
        integration_id: integrationId,
        tenant_id: integration.tenant_id,
        job_type: 'sync',
        status: 'running',
        data_type: dataType,
        records_processed: 0,
        records_successful: 0,
        records_failed: 0,
        started_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      };

      // Save sync job
      await this.saveSyncJob(syncJob);

      // Log sync start
      await this.logAuditEvent(integrationId, integration.tenant_id, 'sync_started', {
        data_type: dataType,
        sync_job_id: syncJob.id
      });

      try {
        // Perform QuickBooks sync based on data type
        switch (dataType) {
          case 'customers':
            await this.syncQuickBooksCustomers(config, integration.tenant_id, syncJob);
            break;
          case 'products':
            await this.syncQuickBooksProducts(config, integration.tenant_id, syncJob);
            break;
          case 'invoices':
            await this.syncQuickBooksInvoices(config, integration.tenant_id, syncJob);
            break;
          case 'payments':
            await this.syncQuickBooksPayments(config, integration.tenant_id, syncJob);
            break;
        }

        // Update sync job as completed
        syncJob.status = 'completed';
        syncJob.completed_at = new Date().toISOString();
        await this.updateSyncJob(syncJob);

        // Update integration last sync time
        await this.updateIntegration(integrationId, {
          last_sync_at: new Date().toISOString()
        });

        // Log sync completion
        await this.logAuditEvent(integrationId, integration.tenant_id, 'sync_completed', {
          data_type: dataType,
          sync_job_id: syncJob.id,
          records_processed: syncJob.records_processed,
          records_successful: syncJob.records_successful
        });

      } catch (syncError) {
        // Update sync job as failed
        syncJob.status = 'failed';
        syncJob.error_message = syncError instanceof Error ? syncError.message : 'Unknown error';
        syncJob.completed_at = new Date().toISOString();
        await this.updateSyncJob(syncJob);

        // Log sync failure
        await this.logAuditEvent(integrationId, integration.tenant_id, 'sync_failed', {
          data_type: dataType,
          sync_job_id: syncJob.id,
          error: syncJob.error_message
        });

        throw syncError;
      }

      return syncJob;
    } catch (error) {
      console.error('Error syncing QuickBooks:', error);
      throw error;
    }
  }

  private async syncQuickBooksCustomers(config: QuickBooksConfig, tenantId: string, syncJob: SyncJob): Promise<void> {
    // Simulate QuickBooks API call for customers
    console.log('Syncing QuickBooks customers...');
    
    // Get local customers
    const { data: customers, error } = await supabase
      .from('customers')
      .select('*')
      .eq('tenant_id', tenantId);

    if (error) throw error;

    // Simulate API processing
    for (const customer of customers || []) {
      syncJob.records_processed++;
      
      try {
        // Simulate QuickBooks API call
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Update customer with QuickBooks ID (simulated)
        await supabase
          .from('customers')
          .update({ 
            external_id: `qb_${customer.id}`,
            external_system: 'quickbooks'
          })
          .eq('id', customer.id);

        syncJob.records_successful++;
      } catch (error) {
        syncJob.records_failed++;
        console.error(`Failed to sync customer ${customer.id}:`, error);
      }
    }
  }

  private async syncQuickBooksProducts(config: QuickBooksConfig, tenantId: string, syncJob: SyncJob): Promise<void> {
    // Simulate QuickBooks API call for products
    console.log('Syncing QuickBooks products...');
    
    const { data: products, error } = await supabase
      .from('products')
      .select('*')
      .eq('tenant_id', tenantId);

    if (error) throw error;

    for (const product of products || []) {
      syncJob.records_processed++;
      
      try {
        await new Promise(resolve => setTimeout(resolve, 100));
        
        await supabase
          .from('products')
          .update({ 
            external_id: `qb_${product.id}`,
            external_system: 'quickbooks'
          })
          .eq('id', product.id);

        syncJob.records_successful++;
      } catch (error) {
        syncJob.records_failed++;
        console.error(`Failed to sync product ${product.id}:`, error);
      }
    }
  }

  private async syncQuickBooksInvoices(config: QuickBooksConfig, tenantId: string, syncJob: SyncJob): Promise<void> {
    // Simulate QuickBooks API call for invoices
    console.log('Syncing QuickBooks invoices...');
    
    const { data: invoices, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('tenant_id', tenantId);

    if (error) throw error;

    for (const invoice of invoices || []) {
      syncJob.records_processed++;
      
      try {
        await new Promise(resolve => setTimeout(resolve, 100));
        
        await supabase
          .from('invoices')
          .update({ 
            external_id: `qb_${invoice.id}`,
            external_system: 'quickbooks'
          })
          .eq('id', invoice.id);

        syncJob.records_successful++;
      } catch (error) {
        syncJob.records_failed++;
        console.error(`Failed to sync invoice ${invoice.id}:`, error);
      }
    }
  }

  private async syncQuickBooksPayments(config: QuickBooksConfig, tenantId: string, syncJob: SyncJob): Promise<void> {
    // Simulate QuickBooks API call for payments
    console.log('Syncing QuickBooks payments...');
    
    const { data: payments, error } = await supabase
      .from('payments')
      .select('*')
      .eq('tenant_id', tenantId);

    if (error) throw error;

    for (const payment of payments || []) {
      syncJob.records_processed++;
      
      try {
        await new Promise(resolve => setTimeout(resolve, 100));
        
        await supabase
          .from('payments')
          .update({ 
            external_id: `qb_${payment.id}`,
            external_system: 'quickbooks'
          })
          .eq('id', payment.id);

        syncJob.records_successful++;
      } catch (error) {
        syncJob.records_failed++;
        console.error(`Failed to sync payment ${payment.id}:`, error);
      }
    }
  }

  // KRA e-TIMS Integration
  async syncKRATIMS(integrationId: string, dataType: 'sales' | 'purchases' | 'inventory'): Promise<SyncJob> {
    try {
      const { data: integration, error: configError } = await supabase
        .from('external_integrations')
        .select('*')
        .eq('id', integrationId)
        .single();

      if (configError) throw configError;

      const config = integration.config_data as KRATIMSConfig;

      const syncJob: SyncJob = {
        id: `sync_${Date.now()}`,
        integration_id: integrationId,
        tenant_id: integration.tenant_id,
        job_type: 'export',
        status: 'running',
        data_type: dataType,
        records_processed: 0,
        records_successful: 0,
        records_failed: 0,
        started_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      };

      await this.saveSyncJob(syncJob);

      await this.logAuditEvent(integrationId, integration.tenant_id, 'sync_started', {
        data_type: dataType,
        sync_job_id: syncJob.id
      });

      try {
        switch (dataType) {
          case 'sales':
            await this.syncKRATIMSSales(config, integration.tenant_id, syncJob);
            break;
          case 'purchases':
            await this.syncKRATIMSPurchases(config, integration.tenant_id, syncJob);
            break;
          case 'inventory':
            await this.syncKRATIMSInventory(config, integration.tenant_id, syncJob);
            break;
        }

        syncJob.status = 'completed';
        syncJob.completed_at = new Date().toISOString();
        await this.updateSyncJob(syncJob);

        await this.updateIntegration(integrationId, {
          last_sync_at: new Date().toISOString()
        });

        await this.logAuditEvent(integrationId, integration.tenant_id, 'sync_completed', {
          data_type: dataType,
          sync_job_id: syncJob.id,
          records_processed: syncJob.records_processed,
          records_successful: syncJob.records_successful
        });

      } catch (syncError) {
        syncJob.status = 'failed';
        syncJob.error_message = syncError instanceof Error ? syncError.message : 'Unknown error';
        syncJob.completed_at = new Date().toISOString();
        await this.updateSyncJob(syncJob);

        await this.logAuditEvent(integrationId, integration.tenant_id, 'sync_failed', {
          data_type: dataType,
          sync_job_id: syncJob.id,
          error: syncJob.error_message
        });

        throw syncError;
      }

      return syncJob;
    } catch (error) {
      console.error('Error syncing KRA e-TIMS:', error);
      throw error;
    }
  }

  private async syncKRATIMSSales(config: KRATIMSConfig, tenantId: string, syncJob: SyncJob): Promise<void> {
    console.log('Syncing KRA e-TIMS sales...');
    
    const { data: sales, error } = await supabase
      .from('orders')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('status', 'completed');

    if (error) throw error;

    for (const sale of sales || []) {
      syncJob.records_processed++;
      
      try {
        // Simulate KRA e-TIMS API call
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Generate KRA e-TIMS invoice
        const kraInvoice = {
          invoice_number: `KRA_${sale.id}`,
          business_pin: config.business_pin,
          customer_name: sale.customer_name,
          total_amount: sale.total_amount,
          tax_amount: sale.total_amount * 0.16, // 16% VAT
          items: sale.order_items || []
        };

        // Update order with KRA reference
        await supabase
          .from('orders')
          .update({ 
            external_id: kraInvoice.invoice_number,
            external_system: 'kra_etims'
          })
          .eq('id', sale.id);

        syncJob.records_successful++;
      } catch (error) {
        syncJob.records_failed++;
        console.error(`Failed to sync sale ${sale.id}:`, error);
      }
    }
  }

  private async syncKRATIMSPurchases(config: KRATIMSConfig, tenantId: string, syncJob: SyncJob): Promise<void> {
    console.log('Syncing KRA e-TIMS purchases...');
    
    const { data: purchases, error } = await supabase
      .from('purchases')
      .select('*')
      .eq('tenant_id', tenantId);

    if (error) throw error;

    for (const purchase of purchases || []) {
      syncJob.records_processed++;
      
      try {
        await new Promise(resolve => setTimeout(resolve, 200));
        
        const kraPurchase = {
          purchase_number: `KRA_PUR_${purchase.id}`,
          business_pin: config.business_pin,
          supplier_name: purchase.supplier_name,
          total_amount: purchase.total_amount,
          tax_amount: purchase.total_amount * 0.16
        };

        await supabase
          .from('purchases')
          .update({ 
            external_id: kraPurchase.purchase_number,
            external_system: 'kra_etims'
          })
          .eq('id', purchase.id);

        syncJob.records_successful++;
      } catch (error) {
        syncJob.records_failed++;
        console.error(`Failed to sync purchase ${purchase.id}:`, error);
      }
    }
  }

  private async syncKRATIMSInventory(config: KRATIMSConfig, tenantId: string, syncJob: SyncJob): Promise<void> {
    console.log('Syncing KRA e-TIMS inventory...');
    
    const { data: products, error } = await supabase
      .from('products')
      .select('*')
      .eq('tenant_id', tenantId);

    if (error) throw error;

    for (const product of products || []) {
      syncJob.records_processed++;
      
      try {
        await new Promise(resolve => setTimeout(resolve, 200));
        
        const kraProduct = {
          product_code: `KRA_${product.sku}`,
          business_pin: config.business_pin,
          product_name: product.name,
          unit_price: product.price,
          stock_quantity: product.stock_quantity
        };

        await supabase
          .from('products')
          .update({ 
            external_id: kraProduct.product_code,
            external_system: 'kra_etims'
          })
          .eq('id', product.id);

        syncJob.records_successful++;
      } catch (error) {
        syncJob.records_failed++;
        console.error(`Failed to sync product ${product.id}:`, error);
      }
    }
  }

  // Connection Testing
  async testConnection(integrationId: string): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      const { data: integration, error } = await supabase
        .from('external_integrations')
        .select('*')
        .eq('id', integrationId)
        .single();

      if (error) throw error;

      let testResult: { success: boolean; message: string; details?: any };

      switch (integration.integration_type) {
        case 'quickbooks':
          testResult = await this.testQuickBooksConnection(integration.config_data);
          break;
        case 'kra_etims':
          testResult = await this.testKRATIMSConnection(integration.config_data);
          break;
        default:
          testResult = { success: false, message: 'Unsupported integration type' };
      }

      // Log connection test
      await this.logAuditEvent(integrationId, integration.tenant_id, 'connection_test', {
        success: testResult.success,
        message: testResult.message,
        details: testResult.details
      });

      return testResult;
    } catch (error) {
      console.error('Error testing connection:', error);
      throw error;
    }
  }

  private async testQuickBooksConnection(config: QuickBooksConfig): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      // Simulate QuickBooks API connection test
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Simulate API response
      const response = {
        success: true,
        company_info: {
          name: 'Test Company',
          id: config.realm_id
        }
      };

      return {
        success: true,
        message: 'QuickBooks connection successful',
        details: response
      };
    } catch (error) {
      return {
        success: false,
        message: 'QuickBooks connection failed',
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }

  private async testKRATIMSConnection(config: KRATIMSConfig): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      // Simulate KRA e-TIMS API connection test
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const response = {
        success: true,
        business_info: {
          business_name: 'Test Business',
          pin: config.business_pin
        }
      };

      return {
        success: true,
        message: 'KRA e-TIMS connection successful',
        details: response
      };
    } catch (error) {
      return {
        success: false,
        message: 'KRA e-TIMS connection failed',
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }

  // Sync Job Management
  private async saveSyncJob(syncJob: SyncJob): Promise<void> {
    const { error } = await supabase
      .from('integration_sync_jobs')
      .insert(syncJob);

    if (error) throw error;
  }

  private async updateSyncJob(syncJob: SyncJob): Promise<void> {
    const { error } = await supabase
      .from('integration_sync_jobs')
      .update(syncJob)
      .eq('id', syncJob.id);

    if (error) throw error;
  }

  async getSyncJobs(integrationId: string): Promise<SyncJob[]> {
    try {
      const { data, error } = await supabase
        .from('integration_sync_jobs')
        .select('*')
        .eq('integration_id', integrationId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching sync jobs:', error);
      throw error;
    }
  }

  // Audit Logging
  private async logAuditEvent(integrationId: string, tenantId: string, action: string, details: Record<string, any>): Promise<void> {
    try {
      const auditLog: AuditLog = {
        id: `audit_${Date.now()}`,
        integration_id: integrationId,
        tenant_id: tenantId,
        action: action as any,
        details,
        created_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('integration_audit_logs')
        .insert(auditLog);

      if (error) throw error;
    } catch (error) {
      console.error('Error logging audit event:', error);
      // Don't throw error for audit logging failures
    }
  }

  async getAuditLogs(integrationId: string): Promise<AuditLog[]> {
    try {
      const { data, error } = await supabase
        .from('integration_audit_logs')
        .select('*')
        .eq('integration_id', integrationId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      throw error;
    }
  }
}
