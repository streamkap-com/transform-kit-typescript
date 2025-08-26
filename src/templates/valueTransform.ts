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
        try {
            // Enhanced input validation
            const validation = this.commonTransform.validateInput(valueObject, keyObject, topic, timestamp);
            if (!validation.valid) {
                this.commonTransform.log('error', 'Input validation failed', { errors: validation.errors });
                return null;
            }
            
            // Sanitize topic name
            const sanitizedTopic = this.commonTransform.sanitizeTopicName(topic);
            
            // Normalize timestamp
            const normalizedTimestamp = this.commonTransform.normalizeTimestamp(timestamp);
            
            // Validate and filter records (for map_filter transforms)
            if (!this.commonTransform.shouldKeepRecord(valueObject)) {
                return null; // null = filter out this record
            }
            
            // Apply your main business transformation
            const transformedRecord = this.commonTransform.transformRecord(valueObject, normalizedTimestamp);
            
            transformedRecord.source_topic = sanitizedTopic;
            transformedRecord.source_timestamp = normalizedTimestamp;
            transformedRecord.source_key = keyObject;
            
            transformedRecord.transform_type = 'value';
            
            // Memory optimization
            return this.commonTransform.removeUndefinedValues(transformedRecord);
            
        } catch (error) {
            const errorContext = this.commonTransform.createErrorContext(error, 'valueTransform', valueObject);
            this.commonTransform.log('error', 'Value transformation failed', errorContext);
            
            // Return original record with error context
            return {
                ...valueObject,
                transform_error: true,
                ...errorContext
            };
        }
    }
    
    /**
     * For enrich_async transforms - async value transformation
     */
    public async transformAsync(valueObject: any, keyObject: any, topic: string, timestamp: number): Promise<any | null> {
        try {
            // Enhanced input validation
            const validation = this.commonTransform.validateInput(valueObject, keyObject, topic, timestamp);
            if (!validation.valid) {
                this.commonTransform.log('error', 'Async input validation failed', { errors: validation.errors });
                return null;
            }
            
            // Sanitize topic name
            const sanitizedTopic = this.commonTransform.sanitizeTopicName(topic);
            
            // Normalize timestamp
            const normalizedTimestamp = this.commonTransform.normalizeTimestamp(timestamp);
            
            // Validate and filter records
            if (!this.commonTransform.shouldKeepRecord(valueObject)) {
                return null;
            }
            
            // Apply base transformation
            let transformedRecord = this.commonTransform.transformRecord(valueObject, normalizedTimestamp);
            
            // Apply async enrichment with timeout handling
            transformedRecord = await this.commonTransform.enrichRecord(transformedRecord);
            
            transformedRecord.source_topic = sanitizedTopic;
            transformedRecord.source_timestamp = normalizedTimestamp;
            transformedRecord.source_key = keyObject;
            transformedRecord.transform_type = 'async_value';
            
            // Memory optimization
            return this.commonTransform.removeUndefinedValues(transformedRecord);
            
        } catch (error) {
            const errorContext = this.commonTransform.createErrorContext(error, 'asyncValueTransform', valueObject);
            this.commonTransform.log('error', 'Async value transformation failed', errorContext);
            
            return {
                ...valueObject,
                transform_error: true,
                ...errorContext
            };
        }
    }
    
    /**
     * For un_nesting transforms - flatten the record structure
     */
    public transformFlatten(valueObject: any, keyObject: any, topic: string, timestamp: number): any | null {
        try {
            // Enhanced input validation
            const validation = this.commonTransform.validateInput(valueObject, keyObject, topic, timestamp);
            if (!validation.valid) {
                this.commonTransform.log('error', 'Flatten input validation failed', { errors: validation.errors });
                return null;
            }
            
            if (!this.commonTransform.validateRecord(valueObject)) {
                return null;
            }
            
            // Sanitize topic name
            const sanitizedTopic = this.commonTransform.sanitizeTopicName(topic);
            
            // Normalize timestamp
            const normalizedTimestamp = this.commonTransform.normalizeTimestamp(timestamp);
            
            // Apply flattening transformation
            const flattenedRecord = this.commonTransform.flattenRecord(valueObject);
            
            flattenedRecord.source_topic = sanitizedTopic;
            flattenedRecord.source_timestamp = normalizedTimestamp;
            flattenedRecord.source_key = keyObject;
            flattenedRecord.transform_type = 'flatten';
            
            // Memory optimization
            return this.commonTransform.removeUndefinedValues(flattenedRecord);
            
        } catch (error) {
            const errorContext = this.commonTransform.createErrorContext(error, 'flattenTransform', valueObject);
            this.commonTransform.log('error', 'Flatten transformation failed', errorContext);
            
            return {
                ...valueObject,
                transform_error: true,
                ...errorContext
            };
        }
    }
}