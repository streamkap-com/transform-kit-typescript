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
    public transformRecord(inputRecord: any): any {
        // Example transformation - replace with your business logic
        const now = moment();
        
        // Example using lodash for data manipulation
        const cleanedRecord = _.omitBy(inputRecord, _.isUndefined);
        const hasValidData = _.has(cleanedRecord, 'id') && !_.isEmpty(cleanedRecord.id);
        
        // Example using uuid for unique identifiers
        const processingId = uuidv4();
        
        return {
            // Copy original fields (customize based on your data structure)
            ...cleanedRecord,
            
            // Add processing metadata
            processed_at: now.toISOString(),
            processed_time: now.format('YYYY-MM-DD HH:mm:ss'),
            processing_id: processingId,
            has_valid_data: hasValidData,
            field_count: _.keys(cleanedRecord).length,
            
            // Add version for tracking
            transform_version: '1.0.0'
        };
    }
    
    /**
     * Validate input record structure
     * Customize this based on your data requirements
     */
    public validateRecord(record: any): boolean {
        // Add your validation logic here - flexible for different id field names
        return Boolean(record && 
               typeof record === 'object' && 
               ((record.id && typeof record.id === 'string') || 
                (record._id && typeof record._id === 'string') ||
                (record.order_id && typeof record.order_id === 'string')));
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
        
        // Filter out test records
        const idField = record.id || record._id || record.order_id;
        if (idField && typeof idField === 'string' && idField.includes('test')) {
            return false;
        }
        
        // Add more filtering logic here
        return true;
    }
    
    /**
     * Determine routing topic for fan_out transforms
     * Return string or array of strings for topic routing
     */
    public getRoutingTopics(record: any, originalTopic: string): string | string[] {
        const topics: string[] = [];
        
        // Example routing logic - customize for your use case
        if (record.type === 'high_priority') {
            topics.push('high-priority-records');
        } else {
            topics.push('standard-records');
        }
        
        // Route errors to special topic
        if (!this.validateRecord(record)) {
            topics.push('error-records');
        }
        
        return topics.length > 1 ? topics : topics[0];
    }
    
    /**
     * Async enrichment logic for enrich_async transforms
     * Add your API calls and enrichment logic here
     */
    public async enrichRecord(record: any): Promise<any> {
        try {
            // Example: simulate API call for enrichment
            // Replace with your actual API calls
            const enrichmentData = await this.simulateApiCall(record.id);
            
            return {
                ...record,
                enrichment: enrichmentData,
                enriched_at: new Date().toISOString()
            };
        } catch (error) {
            console.error('Enrichment failed:', error);
            return record; // Return original on error
        }
    }
    
    /**
     * Flatten nested objects for un_nesting transforms
     */
    public flattenRecord(record: any): any {
        // Example flattening logic - customize for your data structure
        const flattened = { ...record };
        
        // Example: flatten nested user object
        if (record.user) {
            flattened.user_id = record.user.id;
            flattened.user_name = record.user.name;
            flattened.user_email = record.user.email;
            delete flattened.user;
        }
        
        // Example: flatten nested metadata
        if (record.metadata) {
            Object.keys(record.metadata).forEach(key => {
                flattened[`metadata_${key}`] = record.metadata[key];
            });
            delete flattened.metadata;
        }
        
        return {
            ...flattened,
            flattened_at: new Date().toISOString(),
            original_structure_preserved: false
        };
    }
    
    /**
     * Private helper: Simulate API call
     * Replace with your actual API integration
     */
    private async simulateApiCall(id: string): Promise<any> {
        return new Promise(resolve => {
            setTimeout(() => {
                resolve({
                    external_id: `ext_${id}`,
                    score: Math.floor(Math.random() * 100),
                    category: 'premium',
                    enriched_timestamp: new Date().toISOString()
                });
            }, 100);
        });
    }
}