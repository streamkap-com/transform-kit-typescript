// valueTransform.ts - Main value transformation logic
// This is the primary transform function that processes record values

import { CommonTransform } from './commonTransform';

/**
 * Value Transform Class
 * 
 * This class handles the main transformation of record values.
 * Customize this based on your specific business logic and data structures.
 */
export class ValueTransform {
    private commonTransform: CommonTransform;
    
    constructor() {
        this.commonTransform = new CommonTransform();
    }
    
    /**
     * Main value transformation function
     * This will be called by Streamkap for each record
     * 
     * @param valueObject - The record value to transform
     * @param keyObject - The record key (for context)
     * @param topic - Source topic name
     * @param timestamp - Record timestamp
     * @returns Transformed value object or null to filter out
     */
    public transform(valueObject: any, keyObject: any, topic: string, timestamp: number): any | null {
        // Validate and filter records (for map_filter transforms)
        if (!this.commonTransform.shouldKeepRecord(valueObject)) {
            return null; // null = filter out this record
        }
        
        try {
            // Apply your main business transformation
            const transformedRecord = this.commonTransform.transformRecord(valueObject);
            
            // Add context from Streamkap parameters
            transformedRecord.source_topic = topic;
            transformedRecord.source_timestamp = timestamp;
            transformedRecord.source_key = keyObject;
            
            // Add any value-specific transformations here
            transformedRecord.transform_type = 'value';
            
            return transformedRecord;
            
        } catch (error) {
            console.error('Value transformation failed:', error);
            
            // Option 1: Return null to filter out problematic records
            // return null;
            
            // Option 2: Return original record with error flag
            return {
                ...valueObject,
                transform_error: true,
                error_message: error instanceof Error ? error.message : String(error),
                error_timestamp: new Date().toISOString()
            };
        }
    }
    
    /**
     * For enrich_async transforms - async value transformation
     */
    public async transformAsync(valueObject: any, keyObject: any, topic: string, timestamp: number): Promise<any | null> {
        // Validate and filter records
        if (!this.commonTransform.shouldKeepRecord(valueObject)) {
            return null;
        }
        
        try {
            // Apply base transformation
            let transformedRecord = this.commonTransform.transformRecord(valueObject);
            
            // Apply async enrichment
            transformedRecord = await this.commonTransform.enrichRecord(transformedRecord);
            
            // Add context from Streamkap parameters
            transformedRecord.source_topic = topic;
            transformedRecord.source_timestamp = timestamp;
            transformedRecord.source_key = keyObject;
            transformedRecord.transform_type = 'async_value';
            
            return transformedRecord;
            
        } catch (error) {
            console.error('Async value transformation failed:', error);
            return {
                ...valueObject,
                transform_error: true,
                error_message: error instanceof Error ? error.message : String(error),
                error_timestamp: new Date().toISOString()
            };
        }
    }
    
    /**
     * For un_nesting transforms - flatten the record structure
     */
    public transformFlatten(valueObject: any, keyObject: any, topic: string, timestamp: number): any | null {
        if (!this.commonTransform.validateRecord(valueObject)) {
            return null;
        }
        
        try {
            // Apply flattening transformation
            const flattenedRecord = this.commonTransform.flattenRecord(valueObject);
            
            // Add context
            flattenedRecord.source_topic = topic;
            flattenedRecord.source_timestamp = timestamp;
            flattenedRecord.source_key = keyObject;
            flattenedRecord.transform_type = 'flatten';
            
            return flattenedRecord;
            
        } catch (error) {
            console.error('Flatten transformation failed:', error);
            return valueObject; // Return original on error
        }
    }
}