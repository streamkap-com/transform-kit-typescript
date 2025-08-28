// commonTransform.ts - Shared transformation logic
// This file contains common utilities and business logic shared across all transform types.

import moment from "moment";
import _ from "lodash";
import { v4 as uuidv4 } from "uuid";

/**
 * Common transformation utilities for Streamkap transforms
 * Replace this with your own business logic and data structures
 */
export class CommonTransform {
    
    /**
     * Transform your data structure here
     * Replace InputType and OutputType with your actual data interfaces
     */
    public transformRecord(inputRecord: any, timestamp?: number): any {
        // Example transformation - replace with your business logic
        const now = moment();
        const normalizedTimestamp = this.normalizeTimestamp(timestamp || Date.now());
        
        // Example using lodash for data manipulation
        const cleanedRecord = _.omitBy(inputRecord, _.isUndefined);
        // Align with validateRecord - check for id, _id, or order_id
        const hasValidData = Boolean(
            (cleanedRecord.id && !_.isEmpty(cleanedRecord.id)) ||
            (cleanedRecord._id && !_.isEmpty(cleanedRecord._id)) ||
            (cleanedRecord.order_id && !_.isEmpty(cleanedRecord.order_id))
        );
        
        // Example using uuid for unique identifiers
        const processingId = uuidv4();
        
        return {
            // Copy original fields (customize based on your data structure)
            ...cleanedRecord,
            
            // Always use UTC to avoid timezone ambiguity
            processed_at: now.utc().toISOString(),
            processed_time: now.utc().format('YYYY-MM-DD HH:mm:ss') + 'Z',
            processing_id: processingId,
            has_valid_data: hasValidData,
            field_count: _.keys(cleanedRecord).length,
            normalized_timestamp: normalizedTimestamp,
            
            transform_version: '1.0.0'
        };
    }
    
    /**
     * Normalize timestamp to ensure consistent format
     * Handles seconds, milliseconds, microseconds, and nanoseconds robustly
     */
    public normalizeTimestamp(timestamp: number): number {
        if (typeof timestamp !== 'number' || isNaN(timestamp) || timestamp <= 0) {
            return Date.now();
        }
        
        // Determine timestamp precision based on magnitude
        if (timestamp < 1e10) {
            // Seconds (10 digits or less) - convert to milliseconds
            return timestamp * 1000;
        } else if (timestamp < 1e13) {
            // Milliseconds (10-13 digits) - already correct format
            return timestamp;
        } else if (timestamp < 1e16) {
            // Microseconds (13-16 digits) - convert to milliseconds
            return Math.floor(timestamp / 1000);
        } else {
            // Nanoseconds (16+ digits) - convert to milliseconds
            return Math.floor(timestamp / 1000000);
        }
    }
    
    /**
     * Sanitize topic name to be Kafka-compliant
     */
    public sanitizeTopicName(topicName: string): string {
        if (!topicName || typeof topicName !== 'string') {
            return 'default-topic';
        }
        
        let sanitized = topicName.replace(/[^a-zA-Z0-9._-]/g, '-');
        
        // Ensure it doesn't start with a dot
        if (sanitized.startsWith('.')) {
            sanitized = 'topic' + sanitized;
        }
        
        // Truncate if too long (Kafka limit is 249 characters)
        if (sanitized.length > 249) {
            sanitized = sanitized.substring(0, 246) + '...';
        }
        
        return sanitized;
    }
    
    /**
     * Enhanced input validation with detailed checks
     */
    public validateInput(record: any, keyObject: any, topic: string, timestamp: number): { valid: boolean; errors: string[] } {
        const errors: string[] = [];
        
        // Validate record
        if (!record || typeof record !== 'object') {
            errors.push('Record must be a non-null object');
        }
        
        // Validate timestamp
        if (typeof timestamp !== 'number' || isNaN(timestamp) || timestamp <= 0) {
            errors.push('Timestamp must be a valid positive number');
        }
        
        // Validate topic
        if (!topic || typeof topic !== 'string' || topic.trim().length === 0) {
            errors.push('Topic must be a non-empty string');
        }
        
        return { valid: errors.length === 0, errors };
    }
    
    /**
     * Validate topic name according to Kafka standards
     */
    public validateTopicName(topicName: string): boolean {
        if (!topicName || typeof topicName !== 'string') {
            return false;
        }
        
        // Kafka topic naming rules
        const validPattern = /^[a-zA-Z0-9._-]+$/;
        if (!validPattern.test(topicName)) {
            return false;
        }
        
        // Length check (Kafka limit is 249 characters)
        if (topicName.length > 249) {
            return false;
        }
        
        return true;
    }
    
    /**
     * Enhanced error context for better debugging
     */
    public createErrorContext(error: any, operation: string, record?: any): any {
        return {
            error_message: error instanceof Error ? error.message : String(error),
            error_operation: operation,
            error_timestamp: new Date().toISOString(),
            error_stack: error instanceof Error ? error.stack : undefined,
            record_id: record?.id || record?._id || record?.order_id || 'unknown',
            record_type: record?.type || typeof record
        };
    }
    
    /**
     * Structured logging with levels
     */
    public log(level: 'info' | 'warn' | 'error', message: string, context?: any): void {
        const logEntry = {
            level,
            message,
            timestamp: new Date().toISOString(),
            context
        };
        
        switch (level) {
            case 'error':
                console.error(JSON.stringify(logEntry));
                break;
            case 'warn':
                console.warn(JSON.stringify(logEntry));
                break;
            default:
                console.log(JSON.stringify(logEntry));
        }
    }
    
    /**
     * Memory-efficient data type validation
     */
    public validateDataTypes(record: any): { valid: boolean; issues: string[] } {
        const issues: string[] = [];
        
        if (!record || typeof record !== 'object') {
            issues.push('Record must be an object');
            return { valid: false, issues };
        }
        
        Object.keys(record).forEach(key => {
            const value = record[key];
            
            // Test if object is serializable
            if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
                try {
                    JSON.stringify(value); // Test if object is serializable
                } catch {
                    issues.push(`Field '${key}' contains non-serializable object`);
                }
            }
            
            if (typeof value === 'string' && value.length > 100000) {
                issues.push(`Field '${key}' contains extremely large string (${value.length} chars)`);
            }
            
            if (typeof value === 'object' && value !== null) {
                const seen = new Set();
                try {
                    JSON.stringify(value, (k, v) => {
                        if (typeof v === 'object' && v !== null) {
                            if (seen.has(v)) throw new Error('Circular reference');
                            seen.add(v);
                        }
                        return v;
                    });
                } catch {
                    issues.push(`Field '${key}' may contain circular references`);
                }
            }
        });
        
        return { valid: issues.length === 0, issues };
    }
    
    /**
     * Memory optimization - remove undefined values to reduce payload size
     * Uses cycle detection to prevent infinite recursion on circular references
     */
    public removeUndefinedValues(obj: any, seen = new WeakSet()): any {
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }
        
        // Cycle detection - prevent infinite recursion
        if (seen.has(obj)) {
            return '[Circular Reference]';
        }
        seen.add(obj);
        
        if (Array.isArray(obj)) {
            const result = obj.map(item => this.removeUndefinedValues(item, seen)).filter(item => item !== undefined);
            seen.delete(obj);
            return result;
        }
        
        const cleaned: any = {};
        Object.keys(obj).forEach(key => {
            const value = obj[key];
            if (value !== undefined) {
                cleaned[key] = this.removeUndefinedValues(value, seen);
            }
        });
        
        seen.delete(obj);
        return cleaned;
    }
    
    /**
     * Validate input record structure
     * Customize this based on your data requirements
     */
    public validateRecord(record: any): boolean {
        // Enhanced validation with null checks and type safety
        if (!record || typeof record !== 'object') {
            return false;
        }
        
        // Validate required ID fields (flexible for different id field names)
        const hasValidId = Boolean(
            (record.id && (typeof record.id === 'string' || typeof record.id === 'number')) || 
            (record._id && (typeof record._id === 'string' || typeof record._id === 'number')) ||
            (record.order_id && (typeof record.order_id === 'string' || typeof record.order_id === 'number'))
        );
        
        // Additional validation - check for empty objects
        const hasValidData = Object.keys(record).length > 0;
        
        return hasValidId && hasValidData;
    }
    
    /**
     * Filter logic for map_filter transforms
     * Return true to keep the record, false to filter it out
     */
    public shouldKeepRecord(record: any): boolean {
        // Example filtering logic - customize for your use case
        if (!this.validateRecord(record)) {
            return false;
        }
        
        // Filter out test records with enhanced null checking
        const idField = record.id || record._id || record.order_id;
        if (idField) {
            const idStr = String(idField).toLowerCase();
            if (idStr.includes('test') || idStr.includes('mock') || idStr.includes('dummy')) {
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * Determine routing topic for fan_out transforms
     * Return string or array of strings for topic routing
     */
    public getRoutingTopics(record: any, originalTopic: string): string | string[] {
        const topics: string[] = [];
        
        // Sanitize original topic name
        const sanitizedOriginalTopic = this.sanitizeTopicName(originalTopic);
        
        // Example routing logic - customize for your use case
        if (record?.type === 'high_priority') {
            topics.push(this.sanitizeTopicName('high-priority-records'));
        } else {
            topics.push(this.sanitizeTopicName('standard-records'));
        }
        
        // Route errors to special topic
        if (!this.validateRecord(record)) {
            topics.push(this.sanitizeTopicName('error-records'));
        }
        
        // Ensure all topic names are valid
        const validTopics = topics.filter(topic => this.validateTopicName(topic));
        
        return validTopics.length > 1 ? validTopics : validTopics[0] || sanitizedOriginalTopic;
    }
    
    /**
     * Async enrichment logic for enrich_async transforms
     * Add your API calls and enrichment logic here
     */
    public async enrichRecord(record: any): Promise<any> {
        try {
            // Validate input before enrichment
            const validation = this.validateDataTypes(record);
            if (!validation.valid) {
                this.log('warn', 'Data validation issues during enrichment', { issues: validation.issues });
            }
            
            // Simulate API call for enrichment
                const recordId = record?.id || record?._id || record?.order_id;
            if (!recordId) {
                throw new Error('No valid ID found for enrichment');
            }
            
            const enrichmentData = await this.simulateApiCall(String(recordId));
            
            const enrichedRecord = {
                ...record,
                enrichment: enrichmentData,
                enriched_at: new Date().toISOString(),
                enrichment_version: '1.0.0'
            };
            
            // Memory optimization - remove undefined values
            return this.removeUndefinedValues(enrichedRecord);
            
        } catch (error) {
            const errorContext = this.createErrorContext(error, 'enrichRecord', record);
            this.log('error', 'Enrichment failed', errorContext);
            return {
                ...record,
                enrichment_error: true,
                ...errorContext
            };
        }
    }
    
    /**
     * Flatten nested objects for un_nesting transforms
     */
    public flattenRecord(record: any): any {
        // Validate input first
        const validation = this.validateDataTypes(record);
        if (!validation.valid) {
            this.log('warn', 'Data validation issues during flattening', { issues: validation.issues });
        }
        
        // Example flattening logic - customize for your data structure
        const flattened = { ...record };
        
        if (record.user) {
            flattened.user_id = record.user.id;
            flattened.user_name = record.user.name;
            flattened.user_email = record.user.email;
            delete flattened.user;
        }
        
        if (record.metadata) {
            Object.keys(record.metadata).forEach(key => {
                flattened[`metadata_${key}`] = record.metadata[key];
            });
            delete flattened.metadata;
        }
        
        const result = {
            ...flattened,
            flattened_at: new Date().toISOString(),
            original_structure_preserved: false,
            flatten_version: '1.0.0'
        };
        
        // Memory optimization
        return this.removeUndefinedValues(result);
    }
    
    /**
     * Private helper: Simulate API call with timeout and error handling
     * Replace with your actual API integration
     */
    private async simulateApiCall(id: string): Promise<any> {
        return new Promise((resolve, reject) => {
            // Simulate network timeout
            const timeout = setTimeout(() => {
                reject(new Error('API call timeout after 5 seconds'));
            }, 5000);
            
            setTimeout(() => {
                clearTimeout(timeout);
                
                // Simulate occasional API failures
                if (Math.random() < 0.1) { // 10% failure rate for testing
                    reject(new Error('Simulated API failure'));
                    return;
                }
                
                resolve({
                    external_id: `ext_${id}`,
                    score: Math.floor(Math.random() * 100),
                    category: 'premium',
                    enriched_timestamp: new Date().toISOString(),
                    api_version: '1.2.3'
                });
            }, 100);
        });
    }
}