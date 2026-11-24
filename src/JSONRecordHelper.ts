/**
 * JSON Record Helper Utilities
 * 
 * Helper functions for working with JSON records copied from Streamkap Topics page.
 * Use these utilities to validate, normalize, and extract data from copied records.
 * 
 * Usage:
 * 1. Copy a record using "Copy Record as JSON" button in Topics page
 * 2. Paste the JSON into your test files
 * 3. Use these helpers to validate and extract data for testing
 */

export interface StreamkapRecord {
    key?: any;
    value?: any;
    keySchema?: any;
    valueSchema?: any;
    headers?: Record<string, any>;
    metadata: {
        offset: number;
        partition: number;
        timestamp: number;
        timestampType?: string;
        serializedHeaderSize?: number;
        serializedKeySize?: number;
        serializedValueSize?: number;
    };
}

export class JSONRecordHelper {
    /**
     * Validate that a JSON record has the expected structure
     */
    static validateRecordStructure(record: any): record is StreamkapRecord {
        if (!record || typeof record !== 'object') {
            return false;
        }

        // Check required fields
        const hasValue = 'value' in record;
        const hasMetadata = 'metadata' in record && 
                           typeof record.metadata === 'object' &&
                           typeof record.metadata.offset === 'number' &&
                           typeof record.metadata.partition === 'number' &&
                           typeof record.metadata.timestamp === 'number';

        return hasValue && hasMetadata;
    }

    /**
     * Extract just the value portion for transformation testing
     */
    static extractValue(record: StreamkapRecord): any {
        return record.value;
    }

    /**
     * Extract just the key portion
     */
    static extractKey(record: StreamkapRecord): any {
        return record.key;
    }

    /**
     * Get timestamp as Date object
     */
    static getTimestampAsDate(record: StreamkapRecord): Date {
        return new Date(record.metadata.timestamp);
    }

    /**
     * Get a summary of the record for logging/debugging
     */
    static getRecordSummary(record: StreamkapRecord): string {
        const value = record.value;
        const metadata = record.metadata;
        
        const id = value?._id || value?.order_id || value?.id || 'unknown';
        const type = value?.order_type || value?.type || 'unknown';
        
        return `Record[${id}] type=${type} offset=${metadata.offset} partition=${metadata.partition}`;
    }

    /**
     * Create test-friendly record with default values
     * Useful for creating variations of a base record
     */
    static createTestRecord(baseRecord: Partial<StreamkapRecord>, overrides: Partial<StreamkapRecord> = {}): StreamkapRecord {
        const defaultRecord: StreamkapRecord = {
            key: null,
            value: {},
            keySchema: null,
            valueSchema: null,
            headers: {},
            metadata: {
                offset: 0,
                partition: 0,
                timestamp: Date.now(),
                timestampType: 'CreateTime'
            }
        };

        return {
            ...defaultRecord,
            ...baseRecord,
            ...overrides,
            metadata: {
                ...defaultRecord.metadata,
                ...baseRecord.metadata,
                ...overrides.metadata
            }
        };
    }

    /**
     * Generate multiple test records with sequential values
     * Useful for batch testing
     */
    static generateRecordSequence(template: Partial<StreamkapRecord>, count: number): StreamkapRecord[] {
        const records = [];
        const baseValueId = template.value?._id;
        const baseOrderId = template.value?.order_id;
        const baseKeys = template.key ? { ...template.key } : null;
        
        for (let index = 0; index < count; index++) {
            // Create fresh template for each record to avoid mutation
            const freshTemplate = JSON.parse(JSON.stringify(template));
            const record = this.createTestRecord(freshTemplate);
            
            // Update sequential fields
            record.metadata.offset += index;
            record.metadata.timestamp += (index * 1000); // 1 second apart
            
            // Update value ID if present (use original base ID)
            if (baseValueId) {
                record.value._id = `${baseValueId}-${index}`;
            } else if (baseOrderId) {
                record.value.order_id = `${baseOrderId}-${index}`;
            }

            // Update key if present (use original base keys)
            if (baseKeys && typeof baseKeys === 'object') {
                Object.keys(baseKeys).forEach(keyField => {
                    if (typeof baseKeys[keyField] === 'string') {
                        record.key[keyField] = `${baseKeys[keyField]}-${index}`;
                    }
                });
            }

            records.push(record);
        }
        
        return records;
    }

    /**
     * Compare two records for testing equality (ignores processing timestamps)
     */
    static compareRecords(record1: any, record2: any, ignoreFields: string[] = ['processed_at', 'processing_id']): boolean {
        const clean1 = this.removeFields(record1, ignoreFields);
        const clean2 = this.removeFields(record2, ignoreFields);
        
        return JSON.stringify(clean1) === JSON.stringify(clean2);
    }

    /**
     * Remove specified fields from a record (useful for comparisons)
     */
    static removeFields(record: any, fieldsToRemove: string[]): any {
        if (!record || typeof record !== 'object') {
            return record;
        }

        const cleaned = { ...record };
        fieldsToRemove.forEach(field => {
            delete cleaned[field];
        });

        return cleaned;
    }

    /**
     * Validate that a record matches expected schema structure
     */
    static validateSchema(record: StreamkapRecord, expectedFields: string[]): { valid: boolean; missing: string[]; extra: string[] } {
        const actualFields = Object.keys(record.value || {});
        const missing = expectedFields.filter(field => !actualFields.includes(field));
        const extra = actualFields.filter(field => !expectedFields.includes(field));

        return {
            valid: missing.length === 0,
            missing,
            extra
        };
    }

    /**
     * Extract all unique field names from an array of records
     * Useful for schema discovery
     */
    static extractFieldNames(records: StreamkapRecord[]): string[] {
        const allFields = new Set<string>();
        
        records.forEach(record => {
            if (record.value && typeof record.value === 'object') {
                Object.keys(record.value).forEach(field => allFields.add(field));
            }
        });

        return Array.from(allFields).sort();
    }

    /**
     * Group records by a specific field value
     */
    static groupRecordsByField(records: StreamkapRecord[], fieldName: string): Record<string, StreamkapRecord[]> {
        const groups: Record<string, StreamkapRecord[]> = {};
        
        records.forEach(record => {
            const fieldValue = record.value?.[fieldName] || 'undefined';
            const key = String(fieldValue);
            
            if (!groups[key]) {
                groups[key] = [];
            }
            groups[key].push(record);
        });

        return groups;
    }

    /**
     * Create a mock Kafka message object for testing
     * Simulates what a real Kafka consumer would provide
     */
    static toKafkaMessage(record: StreamkapRecord): any {
        return {
            value: record.value,
            key: record.key,
            headers: record.headers || {},
            timestamp: record.metadata.timestamp,
            offset: record.metadata.offset.toString(),
            partition: record.metadata.partition,
            topic: 'test-topic' // Would be dynamic in real usage
        };
    }
}

/**
 * Type guard to check if a value is a valid StreamkapRecord
 */
export function isStreamkapRecord(value: any): value is StreamkapRecord {
    return JSONRecordHelper.validateRecordStructure(value);
}

/**
 * Convenience function to load and validate a JSON record
 */
export function loadJSONRecord(jsonString: string): StreamkapRecord {
    try {
        const parsed = JSON.parse(jsonString);
        if (!isStreamkapRecord(parsed)) {
            throw new Error('Invalid record structure');
        }
        return parsed;
    } catch (error) {
        throw new Error(`Failed to load JSON record: ${(error as Error).message}`);
    }
}