import { Database } from 'sqlite3';
import { open, Database as SQLiteDatabase } from 'sqlite';

// Core business entities for offline operations
export interface OfflineProduct {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  price: number;
  cost_price: number;
  sku: string;
  barcode?: string;
  category_id?: string;
  stock_quantity: number;
  min_stock_level: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  sync_status: 'synced' | 'pending' | 'conflict';
  last_synced_at?: string;
}

export interface OfflineCustomer {
  id: string;
  tenant_id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  loyalty_points: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  sync_status: 'synced' | 'pending' | 'conflict';
  last_synced_at?: string;
}

export interface OfflineOrder {
  id: string;
  tenant_id: string;
  order_number: string;
  customer_id?: string;
  total_amount: number;
  tax_amount: number;
  discount_amount: number;
  status: 'pending' | 'completed' | 'cancelled' | 'refunded';
  payment_method: string;
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  items: OfflineOrderItem[];
  created_at: string;
  updated_at: string;
  sync_status: 'synced' | 'pending' | 'conflict';
  last_synced_at?: string;
}

export interface OfflineOrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  discount_amount: number;
  created_at: string;
}

export interface OfflinePayment {
  id: string;
  tenant_id: string;
  order_id: string;
  amount: number;
  payment_method: string;
  transaction_id?: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  created_at: string;
  updated_at: string;
  sync_status: 'synced' | 'pending' | 'conflict';
  last_synced_at?: string;
}

// Sync metadata
export interface SyncOperation {
  id: string;
  device_id: string;
  tenant_id: string;
  operation_type: 'create' | 'update' | 'delete';
  entity_type: 'product' | 'customer' | 'order' | 'payment';
  entity_id: string;
  data: any;
  created_at: string;
  status: 'pending' | 'synced' | 'failed';
  retry_count: number;
  error_message?: string;
}

export interface SyncMetadata {
  device_id: string;
  tenant_id: string;
  last_sync_timestamp: string;
  sync_version: number;
  device_info: {
    platform: string;
    version: string;
    user_agent: string;
  };
  created_at: string;
  updated_at: string;
}

// Device and session management
export interface DeviceInfo {
  device_id: string;
  tenant_id: string;
  device_name: string;
  platform: 'android' | 'ios' | 'web';
  app_version: string;
  last_active: string;
  is_online: boolean;
  created_at: string;
  updated_at: string;
}

export interface OfflineSession {
  session_id: string;
  device_id: string;
  tenant_id: string;
  user_id: string;
  started_at: string;
  last_activity: string;
  is_active: boolean;
}

// Offline data model interface
export interface OfflineDataModel {
  // Core business data
  products: OfflineProduct[];
  customers: OfflineCustomer[];
  orders: OfflineOrder[];
  payments: OfflinePayment[];
  
  // Sync metadata
  syncQueue: SyncOperation[];
  syncMetadata: SyncMetadata;
  deviceInfo: DeviceInfo;
  activeSession?: OfflineSession;
}

// Database schema definitions
export const OFFLINE_DB_SCHEMA = {
  // Products table
  products: `
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL,
      cost_price REAL NOT NULL,
      sku TEXT NOT NULL,
      barcode TEXT,
      category_id TEXT,
      stock_quantity INTEGER NOT NULL DEFAULT 0,
      min_stock_level INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      sync_status TEXT NOT NULL DEFAULT 'synced',
      last_synced_at TEXT,
      INDEX(tenant_id, sync_status)
    )
  `,
  
  // Customers table
  customers: `
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      address TEXT,
      loyalty_points INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      sync_status TEXT NOT NULL DEFAULT 'synced',
      last_synced_at TEXT,
      INDEX(tenant_id, sync_status)
    )
  `,
  
  // Orders table
  orders: `
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      order_number TEXT NOT NULL,
      customer_id TEXT,
      total_amount REAL NOT NULL,
      tax_amount REAL NOT NULL DEFAULT 0,
      discount_amount REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending',
      payment_method TEXT NOT NULL,
      payment_status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      sync_status TEXT NOT NULL DEFAULT 'synced',
      last_synced_at TEXT,
      INDEX(tenant_id, sync_status),
      INDEX(order_number)
    )
  `,
  
  // Order items table
  order_items: `
    CREATE TABLE IF NOT EXISTS order_items (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      total_price REAL NOT NULL,
      discount_amount REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE,
      INDEX(order_id)
    )
  `,
  
  // Payments table
  payments: `
    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      order_id TEXT NOT NULL,
      amount REAL NOT NULL,
      payment_method TEXT NOT NULL,
      transaction_id TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      sync_status TEXT NOT NULL DEFAULT 'synced',
      last_synced_at TEXT,
      FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE,
      INDEX(tenant_id, sync_status),
      INDEX(order_id)
    )
  `,
  
  // Sync operations queue
  sync_queue: `
    CREATE TABLE IF NOT EXISTS sync_queue (
      id TEXT PRIMARY KEY,
      device_id TEXT NOT NULL,
      tenant_id TEXT NOT NULL,
      operation_type TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      data TEXT NOT NULL,
      created_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      retry_count INTEGER NOT NULL DEFAULT 0,
      error_message TEXT,
      INDEX(tenant_id, status),
      INDEX(created_at)
    )
  `,
  
  // Sync metadata
  sync_metadata: `
    CREATE TABLE IF NOT EXISTS sync_metadata (
      device_id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      last_sync_timestamp TEXT NOT NULL,
      sync_version INTEGER NOT NULL DEFAULT 1,
      device_info TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `,
  
  // Device info
  device_info: `
    CREATE TABLE IF NOT EXISTS device_info (
      device_id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      device_name TEXT NOT NULL,
      platform TEXT NOT NULL,
      app_version TEXT NOT NULL,
      last_active TEXT NOT NULL,
      is_online INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `,
  
  // Offline sessions
  offline_sessions: `
    CREATE TABLE IF NOT EXISTS offline_sessions (
      session_id TEXT PRIMARY KEY,
      device_id TEXT NOT NULL,
      tenant_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      started_at TEXT NOT NULL,
      last_activity TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      INDEX(device_id, is_active)
    )
  `
};

// Database initialization
export class OfflineDatabase {
  private db: SQLiteDatabase | null = null;
  private deviceId: string;
  private tenantId: string;

  constructor(deviceId: string, tenantId: string) {
    this.deviceId = deviceId;
    this.tenantId = tenantId;
  }

  async initialize(): Promise<void> {
    try {
      this.db = await open({
        filename: `vibe_pos_offline_${this.tenantId}.db`,
        driver: require('sqlite3').Database
      });

      // Create all tables
      for (const [tableName, schema] of Object.entries(OFFLINE_DB_SCHEMA)) {
        await this.db.exec(schema);
      }

      // Initialize device info if not exists
      await this.initializeDeviceInfo();
      
      console.log('Offline database initialized successfully');
    } catch (error) {
      console.error('Failed to initialize offline database:', error);
      throw error;
    }
  }

  private async initializeDeviceInfo(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const deviceInfo: DeviceInfo = {
      device_id: this.deviceId,
      tenant_id: this.tenantId,
      device_name: navigator.userAgent,
      platform: this.detectPlatform(),
      app_version: '1.0.0',
      last_active: new Date().toISOString(),
      is_online: navigator.onLine,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await this.db.run(`
      INSERT OR REPLACE INTO device_info 
      (device_id, tenant_id, device_name, platform, app_version, last_active, is_online, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      deviceInfo.device_id,
      deviceInfo.tenant_id,
      deviceInfo.device_name,
      deviceInfo.platform,
      deviceInfo.app_version,
      deviceInfo.last_active,
      deviceInfo.is_online ? 1 : 0,
      deviceInfo.created_at,
      deviceInfo.updated_at
    ]);
  }

  private detectPlatform(): 'android' | 'ios' | 'web' {
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes('android')) return 'android';
    if (userAgent.includes('iphone') || userAgent.includes('ipad')) return 'ios';
    return 'web';
  }

  async close(): Promise<void> {
    if (this.db) {
      await this.db.close();
      this.db = null;
    }
  }

  getDatabase(): SQLiteDatabase {
    if (!this.db) throw new Error('Database not initialized');
    return this.db;
  }
}

// Export types for use in other modules
export type {
  OfflineProduct,
  OfflineCustomer,
  OfflineOrder,
  OfflineOrderItem,
  OfflinePayment,
  SyncOperation,
  SyncMetadata,
  DeviceInfo,
  OfflineSession,
  OfflineDataModel
};
