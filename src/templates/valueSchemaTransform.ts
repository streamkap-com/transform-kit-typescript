// valueSchemaTransform.ts - Value schema transformation logic
// This handles transformation and validation of record value schemas

/**
 * Value Schema Transform Class
 * 
 * This class handles schema transformation and validation for record values.
 * Use this when you need to transform data formats, validate schemas,
 * or convert between different data structures.
 */
export class ValueSchemaTransform {
    
    /**
     * Transform value schema
     * 
     * @param valueObject - The record value to transform
     * @param keyObject - The record key (for context)
     * @param topic - Source topic name
     * @param timestamp - Record timestamp
     * @returns Schema-transformed value object
     */
    public transform(valueObject: any, keyObject: any, topic: string, timestamp: number): any {
        try {
            // Validate input schema first
            if (!this.validateInputSchema(valueObject)) {
                throw new Error('Input schema validation failed');
            }
            
            // Transform to output schema
            const transformedValue = this.transformToOutputSchema(valueObject);
            
            transformedValue._schema = {
                version: '1.0.0',
                transformed_at: new Date().toISOString(),
                source_topic: topic,
                transformation_type: 'value_schema'
            };
            
            // Validate output schema
            if (!this.validateOutputSchema(transformedValue)) {
                throw new Error('Output schema validation failed');
            }
            
            return transformedValue;
            
        } catch (error) {
            console.error('Value schema transformation failed:', error);
            
            // Return error wrapper with original data
            return {
                _error: true,
                error_message: error instanceof Error ? error.message : String(error),
                error_timestamp: new Date().toISOString(),
                original_value: valueObject
            };
        }
    }
    
    /**
     * Transform from legacy schema to new schema
     * Use this when migrating between schema versions
     */
    public transformLegacyToNew(valueObject: any, keyObject: any, topic: string, timestamp: number): any {
        try {
            const newSchema: any = {};
            
            // Map legacy fields to new fields
            if (valueObject.old_field_name) {
                newSchema.new_field_name = valueObject.old_field_name;
            }
            
            // Transform data types
            if (valueObject.string_number && typeof valueObject.string_number === 'string') {
                newSchema.actual_number = parseInt(valueObject.string_number, 10);
            }
            
            // Restructure nested objects
            if (valueObject.flat_user_name && valueObject.flat_user_email) {
                newSchema.user = {
                    name: valueObject.flat_user_name,
                    email: valueObject.flat_user_email
                };
            }
            
            newSchema._migration = {
                from_schema: 'legacy_v1',
                to_schema: 'new_v2',
                migrated_at: new Date().toISOString(),
                source_topic: topic
            };
            
            // Copy unchanged fields
            Object.keys(valueObject).forEach(key => {
                if (!key.startsWith('old_') && !key.startsWith('flat_') && !newSchema[key]) {
                    newSchema[key] = valueObject[key];
                }
            });
            
            return newSchema;
            
        } catch (error) {
            console.error('Legacy schema transformation failed:', error);
            return this.wrapError(error instanceof Error ? error : new Error(String(error)), valueObject);
        }
    }
    
    /**
     * Transform data types to match schema requirements
     */
    public transformDataTypes(valueObject: any): any {
        const transformed: any = {};
        
        Object.keys(valueObject).forEach(key => {
            const value = valueObject[key];
            
            // Transform based on field naming conventions
            if (key.endsWith('_id') && typeof value !== 'string') {
                // IDs should be strings
                transformed[key] = String(value);
            } else if (key.endsWith('_count') || key.endsWith('_number')) {
                // Counts and numbers should be numbers
                transformed[key] = Number(value);
            } else if (key.endsWith('_flag') || key.endsWith('_enabled')) {
                // Flags should be booleans
                transformed[key] = Boolean(value);
            } else if (key.endsWith('_at') || key.endsWith('_time')) {
                // Timestamps should be ISO strings
                transformed[key] = this.ensureISOTimestamp(value);
            } else if (key.endsWith('_json') && typeof value === 'string') {
                // JSON fields should be parsed
                try {
                    transformed[key] = JSON.parse(value);
                } catch {
                    transformed[key] = value; // Keep as string if invalid JSON
                }
            } else {
                // Keep as-is
                transformed[key] = value;
            }
        });
        
        return transformed;
    }
    
    /**
     * Normalize schema structure
     * Ensures consistent field naming and structure
     */
    public normalizeSchema(valueObject: any): any {
        const normalized: any = {};
        
        Object.keys(valueObject).forEach(key => {
            // Normalize field names to snake_case
            const normalizedKey = this.toSnakeCase(key);
            const value = valueObject[key];
            
            if (value && typeof value === 'object' && !Array.isArray(value)) {
                // Recursively normalize nested objects
                normalized[normalizedKey] = this.normalizeSchema(value);
            } else if (Array.isArray(value)) {
                // Handle arrays
                normalized[normalizedKey] = value.map(item => 
                    (item && typeof item === 'object') ? this.normalizeSchema(item) : item
                );
            } else {
                normalized[normalizedKey] = value;
            }
        });
        
        return normalized;
    }
    
    /**
     * Validate input schema against expected structure
     */
    private validateInputSchema(valueObject: any): boolean {
        if (!valueObject || typeof valueObject !== 'object') {
            return false;
        }
        
        // Example validations:
        
        // Required fields check
        const requiredFields = ['id']; // Customize based on your requirements
        for (const field of requiredFields) {
            if (!valueObject.hasOwnProperty(field)) {
                console.error(`Missing required field: ${field}`);
                return false;
            }
        }
        
        // Type validations - align with CommonTransform by accepting string or number
        if (valueObject.id && typeof valueObject.id !== 'string' && typeof valueObject.id !== 'number') {
            console.error('Field "id" must be a string or number');
            return false;
        }
        
        if (valueObject.amount && typeof valueObject.amount !== 'number') {
            console.error('Field "amount" must be a number');
            return false;
        }
        
        return true;
    }
    
    /**
     * Validate output schema meets requirements
     */
    private validateOutputSchema(valueObject: any): boolean {
        if (!valueObject || typeof valueObject !== 'object') {
            return false;
        }
        
        // Example validations:
        
        // Ensure schema metadata exists
        if (!valueObject._schema) {
            console.error('Missing schema metadata');
            return false;
        }
        
        // Validate required output fields
        
        return true;
    }
    
    /**
     * Transform input to standardized output schema
     */
    private transformToOutputSchema(valueObject: any): any {
        // Start with normalized schema
        let output = this.normalizeSchema(valueObject);
        
        // Apply data type transformations
        output = this.transformDataTypes(output);
        
        output.processed_timestamp = new Date().toISOString();
        
        // Apply business-specific transformations
        output = this.applyBusinessTransformations(output);
        
        return output;
    }
    
    /**
     * Apply business-specific schema transformations
     */
    private applyBusinessTransformations(valueObject: any): any {
        const transformed = { ...valueObject };
        
        if (transformed.price && transformed.quantity) {
            transformed.total_amount = transformed.price * transformed.quantity;
        }
        
        if (transformed.status) {
            transformed.status = transformed.status.toLowerCase();
        }
        
        if (transformed.created_at) {
            const createdDate = new Date(transformed.created_at);
            const now = new Date();
            transformed.age_days = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
        }
        
        return transformed;
    }
    
    /**
     * Ensure timestamp is in ISO format
     */
    private ensureISOTimestamp(value: any): string {
        if (!value) return new Date().toISOString();
        
        try {
            // If it's already a valid date string, parse and re-format
            const date = new Date(value);
            if (isNaN(date.getTime())) {
                return new Date().toISOString(); // Invalid date, use current time
            }
            return date.toISOString();
        } catch {
            return new Date().toISOString();
        }
    }
    
    /**
     * Convert camelCase to snake_case
     */
    private toSnakeCase(str: string): string {
        return str
            .replace(/([A-Z])/g, '_$1')
            .toLowerCase()
            .replace(/^_/, '');
    }
    
    /**
     * Wrap error with original data
     */
    private wrapError(error: Error, originalValue: any): any {
        return {
            _schema_error: true,
            error_message: error.message,
            error_timestamp: new Date().toISOString(),
            original_value: originalValue
        };
    }
}