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
            // Input validation
            if (!valueObject || typeof valueObject !== 'object') {
                console.warn('Invalid valueObject for key transformation');
                return this.sanitizeKey(`invalid-value-${keyObject}`);
            }
            
            if (!topic || typeof topic !== 'string') {
                console.warn('Invalid topic for key transformation');
                return this.sanitizeKey(`invalid-topic-${keyObject}`);
            }
            
            // Normalize timestamp
            const normalizedTimestamp = this.normalizeTimestamp(timestamp);
            
            // Example key transformation strategies:
            
            // Strategy 1: Prefix based on record type
            if (valueObject.type && typeof valueObject.type === 'string') {
                const result = `${valueObject.type}-${keyObject}`;
                return this.sanitizeKey(result);
            }
            
            // Strategy 2: Date-based partitioning
            const datePrefix = moment(normalizedTimestamp).format('YYYY-MM-DD');
            
            // Strategy 3: Hash-based routing (for load distribution)
            if (valueObject.user_id) {
                const userHash = this.simpleHash(String(valueObject.user_id)) % 10;
                const result = `${datePrefix}-partition-${userHash}-${keyObject}`;
                return this.sanitizeKey(result);
            }
            
            // Strategy 4: Topic-specific prefixing
            const topicPrefix = topic.replace(/[^a-zA-Z0-9]/g, '_');
            const result = `${topicPrefix}-${datePrefix}-${keyObject}`;
            return this.sanitizeKey(result);
            
        } catch (error) {
            console.error('Key transformation failed:', error);
            
            // Fallback: return sanitized key with error marker
            return this.sanitizeKey(`error-${keyObject}`);
        }
    }
    
    /**
     * Transform key with business logic context
     * Use this when you need more sophisticated key generation
     */
    public transformWithContext(valueObject: any, keyObject: any, topic: string, timestamp: number): string {
        try {
            // Input validation
            if (!valueObject || typeof valueObject !== 'object') {
                return this.transform(valueObject, keyObject, topic, timestamp);
            }
            
            // Normalize timestamp
            const normalizedTimestamp = this.normalizeTimestamp(timestamp);
            
            // Example: Multi-tenant key strategy
            if (valueObject.tenant_id && typeof valueObject.tenant_id === 'string') {
                const tenantPrefix = `tenant-${valueObject.tenant_id}`;
                const datePrefix = moment(normalizedTimestamp).format('YYYY-MM');
                const result = `${tenantPrefix}-${datePrefix}-${keyObject}`;
                return this.sanitizeKey(result);
            }
            
            // Example: Priority-based routing
            if (valueObject.priority && typeof valueObject.priority === 'string') {
                const priorityPrefix = valueObject.priority === 'high' ? 'pri-high' : 'pri-normal';
                const result = `${priorityPrefix}-${keyObject}`;
                return this.sanitizeKey(result);
            }
            
            // Example: Geographic routing
            if (valueObject.region && typeof valueObject.region === 'string') {
                const result = `${valueObject.region}-${keyObject}`;
                return this.sanitizeKey(result);
            }
            
            // Fallback to simple transformation
            return this.transform(valueObject, keyObject, topic, normalizedTimestamp);
            
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
            // Input validation
            if (!valueObject || typeof valueObject !== 'object') {
                return this.sanitizeKey(`fanout-invalid-${keyObject}`);
            }
            
            // For fan-out, you often want consistent keys across all output topics
            
            // Strategy 1: Use business identifier
            if (valueObject.id) {
                const result = `fanout-${valueObject.id}`;
                return this.sanitizeKey(result);
            }
            
            // Strategy 2: Composite key from multiple fields
            if (valueObject.customer_id && valueObject.order_id) {
                const result = `${valueObject.customer_id}-${valueObject.order_id}`;
                return this.sanitizeKey(result);
            }
            
            // Strategy 3: Hash of the entire record for uniqueness
            const recordHash = this.simpleHash(this.safeStringify(valueObject));
            const result = `fanout-${recordHash}-${keyObject}`;
            return this.sanitizeKey(result);
            
        } catch (error) {
            console.error('Fan-out key transformation failed:', error);
            return this.sanitizeKey(`fanout-error-${keyObject}`);
        }
    }
    
    /**
     * Normalize timestamp to ensure consistent format
     */
    private normalizeTimestamp(timestamp: number): number {
        // Ensure timestamp is in milliseconds
        if (typeof timestamp !== 'number' || isNaN(timestamp)) {
            return Date.now();
        }
        
        if (timestamp < 1000000000000) { // Less than year 2001 in milliseconds
            return timestamp * 1000; // Convert from seconds to milliseconds
        }
        return timestamp;
    }
    
    /**
     * Simple hash function for key generation
     * Replace with more sophisticated hashing if needed
     */
    private simpleHash(str: string): number {
        if (!str || typeof str !== 'string') {
            return 0;
        }
        
        let hash = 0;
        if (str.length === 0) return hash;
        
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash | 0; // Convert to 32-bit signed integer
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
        const problematicChars = /[<>:"/\\|?*]/u;
        if (problematicChars.test(key)) {
            console.warn(`Key contains problematic characters: ${key}`);
            return false;
        }
        
        // Check for control characters separately
        for (let i = 0; i < key.length; i++) {
            const charCode = key.charCodeAt(i);
            if (charCode >= 0 && charCode <= 31) {
                console.warn(`Key contains control character: ${key}`);
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * Sanitize key to ensure it's safe for Kafka
     */
    public sanitizeKey(key: string): string {
        if (!key) return 'empty-key';
        
        // Replace problematic characters
        let sanitized = key.replace(/[<>:"/\\|?*]/gu, '_');
        
        // Replace control characters
        sanitized = sanitized.replace(/[\x00-\x1f]/g, '_');
        
        // Truncate if too long
        if (sanitized.length > 255) {
            sanitized = sanitized.substring(0, 252) + '...';
        }
        
        return sanitized;
    }
    
    /**
     * Safe JSON stringify that handles circular references
     */
    private safeStringify(obj: any): string {
        try {
            const seen = new Set();
            return JSON.stringify(obj, (key, value) => {
                if (typeof value === 'object' && value !== null) {
                    if (seen.has(value)) {
                        return '[Circular]';
                    }
                    seen.add(value);
                }
                return value;
            });
        } catch (error) {
            console.warn('Failed to stringify object:', error);
            return '[Unstringifiable]';
        }
    }
}