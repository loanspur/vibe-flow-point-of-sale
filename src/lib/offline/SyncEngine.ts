import { supabase } from '@/lib/supabase';
import { OfflineDatabase, SyncOperation, SyncMetadata, DeviceInfo } from './OfflineDataModel';

export interface SyncResult {
  success: boolean;
  syncedOperations: number;
  conflicts: Conflict[];
  errors: SyncError[];
  timestamp: string;
}

export interface Conflict {
  id: string;
  entityType: 'product' | 'customer' | 'order' | 'payment';
  entityId: string;
  localData: any;
  remoteData: any;
  conflictType: 'update_conflict' | 'delete_conflict' | 'version_conflict';
  resolution: 'local_wins' | 'remote_wins' | 'manual' | 'unresolved';
}

export interface SyncError {
  operationId: string;
  error: string;
  retryCount: number;
  timestamp: string;
}

export interface SyncConfig {
  maxRetries: number;
  retryDelay: number;
  batchSize: number;
  conflictResolution: 'local_wins' | 'remote_wins' | 'manual';
  syncInterval: number;
}

export class SyncEngine {
  private offlineDb: OfflineDatabase;
  private deviceId: string;
  private tenantId: string;
  private config: SyncConfig;
  private isSyncing: boolean = false;
  private syncInterval?: NodeJS.Timeout;

  constructor(
    offlineDb: OfflineDatabase,
    deviceId: string,
    tenantId: string,
    config: Partial<SyncConfig> = {}
  ) {
    this.offlineDb = offlineDb;
    this.deviceId = deviceId;
    this.tenantId = tenantId;
    this.config = {
      maxRetries: 3,
      retryDelay: 5000,
      batchSize: 50,
      conflictResolution: 'remote_wins',
      syncInterval: 30000, // 30 seconds
      ...config
    };
  }

  // Start automatic sync
  async startAutoSync(): Promise<void> {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(async () => {
      if (navigator.onLine && !this.isSyncing) {
        await this.sync();
      }
    }, this.config.syncInterval);

    console.log('Auto sync started');
  }

  // Stop automatic sync
  stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = undefined;
    }
    console.log('Auto sync stopped');
  }

  // Main sync method
  async sync(): Promise<SyncResult> {
    if (this.isSyncing) {
      throw new Error('Sync already in progress');
    }

    if (!navigator.onLine) {
      throw new Error('Device is offline');
    }

    this.isSyncing = true;
    const result: SyncResult = {
      success: false,
      syncedOperations: 0,
      conflicts: [],
      errors: [],
      timestamp: new Date().toISOString()
    };

    try {
      const db = this.offlineDb.getDatabase();

      // 1. Get pending sync operations
      const pendingOperations = await this.getPendingOperations(db);
      
      // 2. Send local changes to server
      const uploadResult = await this.uploadChanges(pendingOperations);
      result.syncedOperations += uploadResult.syncedCount;
      result.errors.push(...uploadResult.errors);

      // 3. Get remote changes
      const remoteChanges = await this.getRemoteChanges();
      
      // 4. Apply remote changes to local database
      const downloadResult = await this.downloadChanges(remoteChanges);
      result.syncedOperations += downloadResult.syncedCount;
      result.conflicts.push(...downloadResult.conflicts);

      // 5. Update sync metadata
      await this.updateSyncMetadata(db);

      result.success = true;
      console.log(`Sync completed: ${result.syncedOperations} operations synced`);
    } catch (error) {
      console.error('Sync failed:', error);
      result.errors.push({
        operationId: 'sync_engine',
        error: error instanceof Error ? error.message : 'Unknown error',
        retryCount: 0,
        timestamp: new Date().toISOString()
      });
    } finally {
      this.isSyncing = false;
    }

    return result;
  }

  // Get pending sync operations from local database
  private async getPendingOperations(db: any): Promise<SyncOperation[]> {
    const operations = await db.all(`
      SELECT * FROM sync_queue 
      WHERE tenant_id = ? AND status = 'pending'
      ORDER BY created_at ASC
      LIMIT ?
    `, [this.tenantId, this.config.batchSize]);

    return operations.map((op: any) => ({
      ...op,
      data: JSON.parse(op.data)
    }));
  }

  // Upload local changes to server
  private async uploadChanges(operations: SyncOperation[]): Promise<{
    syncedCount: number;
    errors: SyncError[];
  }> {
    const db = this.offlineDb.getDatabase();
    let syncedCount = 0;
    const errors: SyncError[] = [];

    for (const operation of operations) {
      try {
        const success = await this.uploadOperation(operation);
        if (success) {
          // Mark operation as synced
          await db.run(`
            UPDATE sync_queue 
            SET status = 'synced', retry_count = 0 
            WHERE id = ?
          `, [operation.id]);
          syncedCount++;
        } else {
          // Increment retry count
          await this.incrementRetryCount(db, operation.id);
        }
      } catch (error) {
        const syncError: SyncError = {
          operationId: operation.id,
          error: error instanceof Error ? error.message : 'Unknown error',
          retryCount: operation.retry_count,
          timestamp: new Date().toISOString()
        };
        errors.push(syncError);
        
        // Increment retry count
        await this.incrementRetryCount(db, operation.id);
      }
    }

    return { syncedCount, errors };
  }

  // Upload single operation to server
  private async uploadOperation(operation: SyncOperation): Promise<boolean> {
    const { entity_type, operation_type, entity_id, data } = operation;

    try {
      switch (entity_type) {
        case 'product':
          return await this.uploadProduct(operation_type, entity_id, data);
        case 'customer':
          return await this.uploadCustomer(operation_type, entity_id, data);
        case 'order':
          return await this.uploadOrder(operation_type, entity_id, data);
        case 'payment':
          return await this.uploadPayment(operation_type, entity_id, data);
        default:
          throw new Error(`Unknown entity type: ${entity_type}`);
      }
    } catch (error) {
      console.error(`Failed to upload ${entity_type}:`, error);
      return false;
    }
  }

  // Upload product changes
  private async uploadProduct(
    operationType: 'create' | 'update' | 'delete',
    entityId: string,
    data: any
  ): Promise<boolean> {
    const { data: result, error } = await supabase
      .from('products')
      [operationType === 'delete' ? 'delete' : operationType === 'create' ? 'insert' : 'update'](
        operationType === 'delete' ? { id: entityId } : data
      )
      .eq('id', entityId)
      .select()
      .single();

    return !error;
  }

  // Upload customer changes
  private async uploadCustomer(
    operationType: 'create' | 'update' | 'delete',
    entityId: string,
    data: any
  ): Promise<boolean> {
    const { data: result, error } = await supabase
      .from('customers')
      [operationType === 'delete' ? 'delete' : operationType === 'create' ? 'insert' : 'update'](
        operationType === 'delete' ? { id: entityId } : data
      )
      .eq('id', entityId)
      .select()
      .single();

    return !error;
  }

  // Upload order changes
  private async uploadOrder(
    operationType: 'create' | 'update' | 'delete',
    entityId: string,
    data: any
  ): Promise<boolean> {
    const { data: result, error } = await supabase
      .from('orders')
      [operationType === 'delete' ? 'delete' : operationType === 'create' ? 'insert' : 'update'](
        operationType === 'delete' ? { id: entityId } : data
      )
      .eq('id', entityId)
      .select()
      .single();

    return !error;
  }

  // Upload payment changes
  private async uploadPayment(
    operationType: 'create' | 'update' | 'delete',
    entityId: string,
    data: any
  ): Promise<boolean> {
    const { data: result, error } = await supabase
      .from('payments')
      [operationType === 'delete' ? 'delete' : operationType === 'create' ? 'insert' : 'update'](
        operationType === 'delete' ? { id: entityId } : data
      )
      .eq('id', entityId)
      .select()
      .single();

    return !error;
  }

  // Get remote changes from server
  private async getRemoteChanges(): Promise<any[]> {
    const lastSync = await this.getLastSyncTimestamp();
    
    // Get changes since last sync for each entity type
    const changes = [];
    
    // Products
    const { data: products } = await supabase
      .from('products')
      .select('*')
      .eq('tenant_id', this.tenantId)
      .gte('updated_at', lastSync);

    if (products) changes.push(...products.map(p => ({ ...p, entity_type: 'product' })));

    // Customers
    const { data: customers } = await supabase
      .from('customers')
      .select('*')
      .eq('tenant_id', this.tenantId)
      .gte('updated_at', lastSync);

    if (customers) changes.push(...customers.map(c => ({ ...c, entity_type: 'customer' })));

    // Orders
    const { data: orders } = await supabase
      .from('orders')
      .select('*')
      .eq('tenant_id', this.tenantId)
      .gte('updated_at', lastSync);

    if (orders) changes.push(...orders.map(o => ({ ...o, entity_type: 'order' })));

    // Payments
    const { data: payments } = await supabase
      .from('payments')
      .select('*')
      .eq('tenant_id', this.tenantId)
      .gte('updated_at', lastSync);

    if (payments) changes.push(...payments.map(p => ({ ...p, entity_type: 'payment' })));

    return changes;
  }

  // Download and apply remote changes
  private async downloadChanges(remoteChanges: any[]): Promise<{
    syncedCount: number;
    conflicts: Conflict[];
  }> {
    const db = this.offlineDb.getDatabase();
    let syncedCount = 0;
    const conflicts: Conflict[] = [];

    for (const change of remoteChanges) {
      try {
        const conflict = await this.applyRemoteChange(db, change);
        if (conflict) {
          conflicts.push(conflict);
        } else {
          syncedCount++;
        }
      } catch (error) {
        console.error('Failed to apply remote change:', error);
      }
    }

    return { syncedCount, conflicts };
  }

  // Apply single remote change to local database
  private async applyRemoteChange(db: any, change: any): Promise<Conflict | null> {
    const { entity_type, id, ...data } = change;

    // Check for conflicts
    const localData = await this.getLocalEntity(db, entity_type, id);
    if (localData && this.hasConflict(localData, data)) {
      return this.resolveConflict(localData, data, entity_type, id);
    }

    // Apply change
    await this.updateLocalEntity(db, entity_type, id, data);
    return null;
  }

  // Check if there's a conflict between local and remote data
  private hasConflict(localData: any, remoteData: any): boolean {
    // Simple timestamp-based conflict detection
    const localUpdated = new Date(localData.updated_at).getTime();
    const remoteUpdated = new Date(remoteData.updated_at).getTime();
    
    return Math.abs(localUpdated - remoteUpdated) < 1000; // Within 1 second
  }

  // Resolve conflict based on configuration
  private resolveConflict(
    localData: any,
    remoteData: any,
    entityType: string,
    entityId: string
  ): Conflict {
    const conflict: Conflict = {
      id: `${entityType}_${entityId}`,
      entityType: entityType as any,
      entityId,
      localData,
      remoteData,
      conflictType: 'update_conflict',
      resolution: this.config.conflictResolution
    };

    // Auto-resolve based on configuration
    if (this.config.conflictResolution === 'remote_wins') {
      // Remote data wins, update local
      this.updateLocalEntity(this.offlineDb.getDatabase(), entityType, entityId, remoteData);
    } else if (this.config.conflictResolution === 'local_wins') {
      // Local data wins, queue update to server
      this.queueOperation('update', entityType, entityId, localData);
    }
    // For 'manual' resolution, return conflict for user to resolve

    return conflict;
  }

  // Get local entity data
  private async getLocalEntity(db: any, entityType: string, entityId: string): Promise<any> {
    const result = await db.get(`SELECT * FROM ${entityType}s WHERE id = ?`, [entityId]);
    return result;
  }

  // Update local entity
  private async updateLocalEntity(db: any, entityType: string, entityId: string, data: any): Promise<void> {
    const columns = Object.keys(data).join(', ');
    const placeholders = Object.keys(data).map(() => '?').join(', ');
    const values = Object.values(data);

    await db.run(`
      INSERT OR REPLACE INTO ${entityType}s (${columns}) 
      VALUES (${placeholders})
    `, values);
  }

  // Queue operation for sync
  async queueOperation(
    operationType: 'create' | 'update' | 'delete',
    entityType: 'product' | 'customer' | 'order' | 'payment',
    entityId: string,
    data?: any
  ): Promise<void> {
    const db = this.offlineDb.getDatabase();
    
    const operation: SyncOperation = {
      id: `${operationType}_${entityType}_${entityId}_${Date.now()}`,
      device_id: this.deviceId,
      tenant_id: this.tenantId,
      operation_type: operationType,
      entity_type: entityType,
      entity_id: entityId,
      data: data || {},
      created_at: new Date().toISOString(),
      status: 'pending',
      retry_count: 0
    };

    await db.run(`
      INSERT INTO sync_queue 
      (id, device_id, tenant_id, operation_type, entity_type, entity_id, data, created_at, status, retry_count)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      operation.id,
      operation.device_id,
      operation.tenant_id,
      operation.operation_type,
      operation.entity_type,
      operation.entity_id,
      JSON.stringify(operation.data),
      operation.created_at,
      operation.status,
      operation.retry_count
    ]);
  }

  // Increment retry count for failed operation
  private async incrementRetryCount(db: any, operationId: string): Promise<void> {
    await db.run(`
      UPDATE sync_queue 
      SET retry_count = retry_count + 1,
          status = CASE 
            WHEN retry_count >= ? THEN 'failed'
            ELSE 'pending'
          END
      WHERE id = ?
    `, [this.config.maxRetries, operationId]);
  }

  // Get last sync timestamp
  private async getLastSyncTimestamp(): Promise<string> {
    const db = this.offlineDb.getDatabase();
    const result = await db.get(`
      SELECT last_sync_timestamp 
      FROM sync_metadata 
      WHERE device_id = ? AND tenant_id = ?
    `, [this.deviceId, this.tenantId]);

    return result?.last_sync_timestamp || new Date(0).toISOString();
  }

  // Update sync metadata
  private async updateSyncMetadata(db: any): Promise<void> {
    const now = new Date().toISOString();
    
    await db.run(`
      INSERT OR REPLACE INTO sync_metadata 
      (device_id, tenant_id, last_sync_timestamp, sync_version, device_info, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      this.deviceId,
      this.tenantId,
      now,
      1,
      JSON.stringify({
        platform: navigator.platform,
        version: '1.0.0',
        user_agent: navigator.userAgent
      }),
      now,
      now
    ]);
  }

  // Get sync status
  async getSyncStatus(): Promise<{
    isOnline: boolean;
    isSyncing: boolean;
    pendingOperations: number;
    lastSync: string;
    conflicts: number;
  }> {
    const db = this.offlineDb.getDatabase();
    
    const pendingCount = await db.get(`
      SELECT COUNT(*) as count 
      FROM sync_queue 
      WHERE tenant_id = ? AND status = 'pending'
    `, [this.tenantId]);

    const lastSync = await this.getLastSyncTimestamp();

    return {
      isOnline: navigator.onLine,
      isSyncing: this.isSyncing,
      pendingOperations: pendingCount?.count || 0,
      lastSync,
      conflicts: 0 // TODO: Implement conflict counting
    };
  }
}
