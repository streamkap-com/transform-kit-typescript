// keyTransform.ts - Key transformation logic
// This handles transformation of record keys for routing and partitioning

import moment from "moment";

/**
 * Key Transform Class
 * 
 * This class handles the transformation of record keys.
 * Keys are important for partitioning and routing in Kafka/Streamkap.
 * Customize this based on your partitioning and routing strategy.
 */
export class KeyTransform {
    
    /**
     * Transform the record key
     * 
     * @param valueObject - The record value (for context)
     * @param keyObject - The original key to transform
     * @param topic - Source topic name
     * @param timestamp - Record timestamp
     * @returns New key string
     */
    public transform(valueObject: any, keyObject: any, topic: string, timestamp: number): string {
        try {
            // Example key transformation strategies:
            
            // Strategy 1: Prefix based on record type
            if (valueObject && valueObject.type) {
                return `${valueObject.type}-${keyObject}`;
            }
            
            // Strategy 2: Date-based partitioning
            const datePrefix = moment(timestamp).format('YYYY-MM-DD');
            
            // Strategy 3: Hash-based routing (for load distribution)
            if (valueObject && valueObject.user_id) {
                const userHash = this.simpleHash(valueObject.user_id) % 10;
                return `${datePrefix}-partition-${userHash}-${keyObject}`;
            }
            
            // Strategy 4: Topic-specific prefixing
            const topicPrefix = topic.replace(/[^a-zA-Z0-9]/g, '_');
            return `${topicPrefix}-${datePrefix}-${keyObject}`;
            
        } catch (error) {
            console.error('Key transformation failed:', error);
            
            // Fallback: return original key with error marker
            return `error-${keyObject}`;
        }
    }
    
    /**
     * Transform key with business logic context
     * Use this when you need more sophisticated key generation
     */
    public transformWithContext(valueObject: any, keyObject: any, topic: string, timestamp: number): string {
        try {
            // Example: Multi-tenant key strategy
            if (valueObject && valueObject.tenant_id) {
                const tenantPrefix = `tenant-${valueObject.tenant_id}`;
                const datePrefix = moment(timestamp).format('YYYY-MM');
                return `${tenantPrefix}-${datePrefix}-${keyObject}`;
            }
            
            // Example: Priority-based routing
            if (valueObject && valueObject.priority) {
                const priorityPrefix = valueObject.priority === 'high' ? 'pri-high' : 'pri-normal';
                return `${priorityPrefix}-${keyObject}`;
            }
            
            // Example: Geographic routing
            if (valueObject && valueObject.region) {
                return `${valueObject.region}-${keyObject}`;
            }
            
            // Fallback to simple transformation
            return this.transform(valueObject, keyObject, topic, timestamp);
            
        } catch (error) {
            console.error('Context key transformation failed:', error);
            return this.transform(valueObject, keyObject, topic, timestamp);
        }
    }
    
    /**
     * Generate deterministic key for fan-out scenarios
     * Ensures consistent routing across multiple output topics
     */
    public transformForFanOut(valueObject: any, keyObject: any, topic: string, timestamp: number): string {
        try {
            // For fan-out, you often want consistent keys across all output topics
            
            // Strategy 1: Use business identifier
            if (valueObject && valueObject.id) {
                return `fanout-${valueObject.id}`;
            }
            
            // Strategy 2: Composite key from multiple fields
            if (valueObject && valueObject.customer_id && valueObject.order_id) {
                return `${valueObject.customer_id}-${valueObject.order_id}`;
            }
            
            // Strategy 3: Hash of the entire record for uniqueness
            const recordHash = this.simpleHash(JSON.stringify(valueObject));
            return `fanout-${recordHash}-${keyObject}`;
            
        } catch (error) {
            console.error('Fan-out key transformation failed:', error);
            return `fanout-error-${keyObject}`;
        }
    }
    
    /**
     * Simple hash function for key generation
     * Replace with more sophisticated hashing if needed
     */
    private simpleHash(str: string): number {
        let hash = 0;
        if (str.length === 0) return hash;
        
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        
        return Math.abs(hash);
    }
    
    /**
     * Validate that a key is suitable for Kafka
     * Keys should be reasonably short and not contain problematic characters
     */
    public validateKey(key: string): boolean {
        if (!key || typeof key !== 'string') {
            return false;
        }
        
        // Check length (Kafka recommends keys under 1KB, but shorter is better)
        if (key.length > 255) {
            console.warn(`Key is quite long (${key.length} chars): ${key.substring(0, 50)}...`);
            return false;
        }
        
        // Check for problematic characters that might cause issues
        const problematicChars = /[<>:"/\\|?*\x00-\x1f]/;
        if (problematicChars.test(key)) {
            console.warn(`Key contains problematic characters: ${key}`);
            return false;
        }
        
        return true;
    }
    
    /**
     * Sanitize key to ensure it's safe for Kafka
     */
    public sanitizeKey(key: string): string {
        if (!key) return 'empty-key';
        
        // Replace problematic characters
        let sanitized = key.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_');
        
        // Truncate if too long
        if (sanitized.length > 255) {
            sanitized = sanitized.substring(0, 252) + '...';
        }
        
        return sanitized;
    }
}