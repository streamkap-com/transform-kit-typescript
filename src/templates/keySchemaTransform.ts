// keySchemaTransform.ts - Key schema transformation logic
// This handles transformation and validation of record key schemas

/**
 * Key Schema Transform Class
 * 
 * This class handles schema transformation and validation for record keys.
 * Keys in Kafka/Streamkap are important for partitioning and should follow
 * consistent schemas for proper data distribution.
 */
export class KeySchemaTransform {
    
    /**
     * Transform key schema
     * 
     * @param valueObject - The record value (for context)
     * @param keyObject - The record key to transform
     * @param topic - Source topic name
     * @param timestamp - Record timestamp
     * @returns Schema-transformed key object
     */
    public transform(valueObject: any, keyObject: any, topic: string, timestamp: number): any {
        try {
            // Handle null or undefined keys
            if (!keyObject) {
                return this.generateDefaultKey(valueObject, topic, timestamp);
            }
            
            // Validate input key schema
            if (!this.validateInputKeySchema(keyObject)) {
                throw new Error('Input key schema validation failed');
            }
            
            // Transform to standardized key schema
            const transformedKey = this.transformToStandardKeySchema(keyObject, valueObject, topic, timestamp);
            
            // Validate output key schema
            if (!this.validateOutputKeySchema(transformedKey)) {
                throw new Error('Output key schema validation failed');
            }
            
            return transformedKey;
            
        } catch (error) {
            console.error('Key schema transformation failed:', error);
            
            // Return error-wrapped key
            return {
                _key_error: true,
                error_message: error instanceof Error ? error.message : String(error),
                original_key: keyObject,
                fallback_key: this.generateFallbackKey(valueObject, topic)
            };
        }
    }
    
    /**
     * Transform simple string key to structured key
     * Use this when you need to enhance simple keys with additional metadata
     */
    public transformStringToStructured(valueObject: any, keyObject: string, topic: string, timestamp: number): any {
        try {
            const structuredKey: any = {
                // Original key value
                key: keyObject,
                
                // Add partitioning information
                partition_info: this.calculatePartitionInfo(keyObject, valueObject),
                
                // Add temporal information
                time_bucket: this.getTimeBucket(timestamp),
                
                // Add business context
                business_context: this.extractBusinessContext(valueObject),
                
                // Add topic context
                source_topic: topic,
                
                // Schema version
                schema_version: '1.0.0'
            };
            
            return structuredKey;
            
        } catch (error) {
            console.error('String to structured key transformation failed:', error);
            return { key: keyObject, error: error instanceof Error ? error.message : String(error) };
        }
    }
    
    /**
     * Transform structured key back to optimized form
     * Use this to reduce key size while maintaining essential information
     */
    public transformToOptimized(valueObject: any, keyObject: any, topic: string, timestamp: number): any {
        try {
            if (typeof keyObject === 'string') {
                // Already optimized
                return keyObject;
            }
            
            const optimizedKey: any = {};
            
            // Keep only essential fields for partitioning
            if (keyObject.id) {
                optimizedKey.id = keyObject.id;
            }
            
            if (keyObject.tenant_id) {
                optimizedKey.tenant = keyObject.tenant_id;
            }
            
            if (keyObject.type) {
                optimizedKey.type = keyObject.type;
            }
            
            // Add compact timestamp for time-based partitioning
            optimizedKey.ts = Math.floor(timestamp / 1000); // Unix timestamp
            
            // Add hash for distribution if needed
            if (keyObject.key) {
                optimizedKey.hash = this.simpleHash(keyObject.key) % 100;
            }
            
            return optimizedKey;
            
        } catch (error) {
            console.error('Key optimization failed:', error);
            return keyObject; // Return original on error
        }
    }
    
    /**
     * Transform key for multi-tenant scenarios
     */
    public transformForMultiTenant(valueObject: any, keyObject: any, topic: string, timestamp: number): any {
        try {
            const tenantKey: any = {
                // Tenant identification (highest priority for partitioning)
                tenant_id: this.extractTenantId(valueObject, keyObject),
                
                // Original key within tenant context
                tenant_key: keyObject,
                
                // Tenant-specific metadata
                tenant_shard: this.calculateTenantShard(valueObject),
                
                // Time-based sub-partitioning within tenant
                time_partition: this.getTimePartition(timestamp),
                
                // Schema metadata
                schema_type: 'multi_tenant_key',
                version: '1.0.0'
            };
            
            return tenantKey;
            
        } catch (error) {
            console.error('Multi-tenant key transformation failed:', error);
            return this.generateTenantFallbackKey(valueObject, keyObject);
        }
    }
    
    /**
     * Validate input key schema
     */
    private validateInputKeySchema(keyObject: any): boolean {
        if (!keyObject) {
            return false; // null keys will be handled separately
        }
        
        // Allow string keys (most common)
        if (typeof keyObject === 'string') {
            return keyObject.length > 0 && keyObject.length <= 255;
        }
        
        // Allow numeric keys
        if (typeof keyObject === 'number') {
            return !isNaN(keyObject);
        }
        
        // Validate structured keys
        if (typeof keyObject === 'object') {
            // Check for essential fields
            if (!keyObject.id && !keyObject.key) {
                console.error('Structured key must have either "id" or "key" field');
                return false;
            }
            
            // Validate field types
            if (keyObject.id && typeof keyObject.id !== 'string' && typeof keyObject.id !== 'number') {
                console.error('Key "id" field must be string or number');
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * Validate output key schema
     */
    private validateOutputKeySchema(keyObject: any): boolean {
        if (!keyObject) {
            console.error('Output key cannot be null');
            return false;
        }
        
        // Check serialization size (keys should be reasonably small)
        const serialized = JSON.stringify(keyObject);
        if (serialized.length > 1024) { // 1KB limit
            console.warn(`Key is large (${serialized.length} bytes), may affect performance`);
        }
        
        return true;
    }
    
    /**
     * Transform to standardized key schema
     */
    private transformToStandardKeySchema(keyObject: any, valueObject: any, topic: string, timestamp: number): any {
        // Handle string keys
        if (typeof keyObject === 'string') {
            return {
                key: keyObject,
                type: 'string',
                partition_hint: this.simpleHash(keyObject) % 32 // 32 partitions
            };
        }
        
        // Handle numeric keys
        if (typeof keyObject === 'number') {
            return {
                key: keyObject.toString(),
                type: 'numeric',
                partition_hint: keyObject % 32
            };
        }
        
        // Handle structured keys
        if (typeof keyObject === 'object') {
            const standardKey: any = {
                ...keyObject,
                _metadata: {
                    transformed_at: new Date(timestamp).toISOString(),
                    source_topic: topic,
                    schema_version: '1.0.0'
                }
            };
            
            // Add partition hint if not present
            if (!standardKey.partition_hint) {
                const keyStr = standardKey.id || standardKey.key || JSON.stringify(standardKey);
                standardKey.partition_hint = this.simpleHash(keyStr) % 32;
            }
            
            return standardKey;
        }
        
        // Fallback
        return { key: String(keyObject), type: 'fallback' };
    }
    
    /**
     * Generate default key when none exists
     */
    private generateDefaultKey(valueObject: any, topic: string, timestamp: number): any {
        // Try to extract key from value object
        if (valueObject && valueObject.id) {
            return {
                key: valueObject.id,
                type: 'generated_from_value_id',
                generated_at: new Date(timestamp).toISOString()
            };
        }
        
        if (valueObject && valueObject.uuid) {
            return {
                key: valueObject.uuid,
                type: 'generated_from_value_uuid',
                generated_at: new Date(timestamp).toISOString()
            };
        }
        
        // Generate UUID-based key as last resort
        const uuid = this.generateUUID();
        return {
            key: uuid,
            type: 'generated_uuid',
            generated_at: new Date(timestamp).toISOString(),
            warning: 'No natural key found, generated UUID'
        };
    }
    
    /**
     * Generate fallback key for errors
     */
    private generateFallbackKey(valueObject: any, topic: string): string {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8);
        return `fallback-${topic}-${timestamp}-${random}`;
    }
    
    /**
     * Generate tenant-specific fallback key
     */
    private generateTenantFallbackKey(valueObject: any, keyObject: any): any {
        return {
            tenant_id: this.extractTenantId(valueObject, keyObject) || 'unknown',
            tenant_key: keyObject || 'fallback',
            error: true,
            generated_at: new Date().toISOString()
        };
    }
    
    /**
     * Extract tenant ID from value or key
     */
    private extractTenantId(valueObject: any, keyObject: any): string | null {
        // Try value object first
        if (valueObject && valueObject.tenant_id) {
            return valueObject.tenant_id;
        }
        
        if (valueObject && valueObject.organization_id) {
            return valueObject.organization_id;
        }
        
        // Try key object
        if (keyObject && typeof keyObject === 'object' && keyObject.tenant_id) {
            return keyObject.tenant_id;
        }
        
        return null;
    }
    
    /**
     * Calculate partition information
     */
    private calculatePartitionInfo(key: string, valueObject: any): any {
        const hash = this.simpleHash(key);
        return {
            hash: hash,
            suggested_partition: hash % 32,
            distribution_hint: hash % 10 // For load balancing
        };
    }
    
    /**
     * Get time bucket for temporal partitioning
     */
    private getTimeBucket(timestamp: number): string {
        const date = new Date(timestamp);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }
    
    /**
     * Get time partition (hour-based)
     */
    private getTimePartition(timestamp: number): string {
        const date = new Date(timestamp);
        return `${date.getHours()}`;
    }
    
    /**
     * Extract business context from value
     */
    private extractBusinessContext(valueObject: any): any {
        if (!valueObject) return {};
        
        const context: any = {};
        
        if (valueObject.type) context.record_type = valueObject.type;
        if (valueObject.category) context.category = valueObject.category;
        if (valueObject.priority) context.priority = valueObject.priority;
        
        return context;
    }
    
    /**
     * Calculate tenant shard
     */
    private calculateTenantShard(valueObject: any): number {
        const tenantId = this.extractTenantId(valueObject, null);
        if (!tenantId) return 0;
        
        return this.simpleHash(tenantId) % 8; // 8 shards per tenant
    }
    
    /**
     * Simple hash function
     */
    private simpleHash(str: string): number {
        let hash = 0;
        if (str.length === 0) return hash;
        
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        
        return Math.abs(hash);
    }
    
    /**
     * Generate simple UUID
     */
    private generateUUID(): string {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
}