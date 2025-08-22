/**
 * Tests for generated Streamkap transform functions
 * These tests verify that the actual bundled transforms work correctly
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { OrderType1 } from './OrderType1';
import { OrderType2 } from './OrderType2';
import { Customer } from './Customer';

// Mock data for testing
const mockCustomer: Customer = {
    version: "0.1.4",
    _id: "customer-123",
    name: "Test Customer",
    organization_id: "org-456"
};

const mockOrderType1: OrderType1 = {
    _id: "express-test123",
    order_type: "OrderType1", 
    order_number: 12345,
    location_id: "loc-789",
    channel: "express",
    customer: mockCustomer,
    organization_id: "org-456"
};

const mockOrderType2: OrderType2 = {
    order_id: "rpos-test456",
    order_type: "OrderType2",
    order_number: 67890, 
    location_id: "loc-123",
    channel: "rpos",
    customer: mockCustomer
};

// Helper to load and execute generated transform code
function loadTransformFunction(filePath: string, functionName: string) {
    const transformCode = readFileSync(filePath, 'utf8');
    
    // Create a safe execution environment
    const sandbox = {
        console,
        Date,
        Math,
        JSON,
        require: (module: string) => {
            if (module === 'moment') {
                return require('moment');
            }
            throw new Error(`Module ${module} not available in transform sandbox`);
        }
    };
    
    // Execute the transform code in sandbox
    const func = new Function(...Object.keys(sandbox), transformCode + `\nreturn ${functionName};`);
    return func(...Object.values(sandbox));
}

describe('Generated Transform Functions', () => {
    
    describe('Map/Filter Value Transform', () => {
        let valueTransform: Function;
        
        beforeAll(() => {
            const transformPath = join(process.cwd(), 'transforms', 'map-filter', 'value_transform.js');
            valueTransform = loadTransformFunction(transformPath, '_streamkap_transform');
        });
        
        it('should transform OrderType1 correctly', () => {
            // Use non-test ID to avoid filtering
            const testOrder = {
                ...mockOrderType1,
                _id: 'express-order123' // Remove 'test' from ID
            };
            
            const result = valueTransform(testOrder, 'key1', 'input_topic', Date.now());
            
            expect(result).toBeDefined();
            expect(result).not.toBeNull();
            expect(result._id).toBe('express-order123');
            expect(result.order_number).toBe(12345);
            expect(result.processed_at).toBeDefined();
            expect(result.processed_time).toBeDefined();
            expect(typeof result.processed_time).toBe('string');
            
            // Test new npm dependency functionality in generated files
            expect(result.processing_id).toBeDefined();
            expect(typeof result.processing_id).toBe('string');
            expect(result.processing_id.length).toBe(36); // UUID v4 format
            expect(result.processing_id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
            
            expect(result.has_valid_customer).toBe(true);
            expect(typeof result.has_valid_customer).toBe('boolean');
            
            expect(result.field_count).toBeGreaterThan(0);
            expect(typeof result.field_count).toBe('number');
        });
        
        it('should transform OrderType2 correctly', () => {
            const result = valueTransform(mockOrderType2, 'key2', 'input_topic', Date.now());
            
            expect(result).toBeDefined();
            expect(result._id).toBe('rpos-test456'); // Uses order_id
            expect(result.order_number).toBe(67890);
            expect(result.processed_at).toBeDefined();
        });
        
        it('should filter out invalid records', () => {
            const invalidOrder = {
                _id: 'test-invalid',
                order_type: 'OrderType1',
                order_number: 123
                // Missing customer
            };
            
            const result = valueTransform(invalidOrder, 'key', 'topic', Date.now());
            expect(result).toBeNull(); // Should be filtered out
        });
        
        it('should filter out test records', () => {
            const testOrder = {
                ...mockOrderType1,
                _id: 'test-should-filter'
            };
            
            const result = valueTransform(testOrder, 'key', 'topic', Date.now());
            expect(result).toBeNull(); // Should be filtered out
        });
    });
    
    describe('Map/Filter Key Transform', () => {
        let keyTransform: Function;
        
        beforeAll(() => {
            const transformPath = join(process.cwd(), 'transforms', 'map-filter', 'key_transform.js');
            keyTransform = loadTransformFunction(transformPath, '_streamkap_transform_key');
        });
        
        it('should transform key for OrderType1', () => {
            const result = keyTransform(mockOrderType1, 'original-key', 'topic', Date.now());
            
            expect(result).toContain('express-original-key');
        });
        
        it('should transform key for OrderType2', () => {
            const result = keyTransform(mockOrderType2, 'original-key', 'topic', Date.now());
            
            expect(result).toContain('rpos-original-key');
        });
        
        it('should add channel prefix to keys', () => {
            const result = keyTransform(mockOrderType1, 'test-key', 'topic', Date.now());
            
            // OrderType1 should get 'express' prefix
            expect(result).toBe('express-test-key');
        });
        
        it('should add date prefix for unknown order types', () => {
            const unknownOrder = {
                ...mockOrderType1,
                order_type: 'UnknownType'
            };
            const timestamp = new Date('2024-01-15').getTime();
            const result = keyTransform(unknownOrder, 'test-key', 'topic', timestamp);
            
            expect(result).toContain('2024-01-15');
        });
    });
    
    describe('Fan-Out Value Transform', () => {
        let fanOutTransform: Function;
        
        beforeAll(() => {
            const transformPath = join(process.cwd(), 'transforms', 'fan-out', 'value_transform.js');
            fanOutTransform = loadTransformFunction(transformPath, '_streamkap_transform');
        });
        
        it('should add routing metadata', () => {
            const timestamp = Date.now();
            const result = fanOutTransform(mockOrderType1, 'key', 'input_topic', timestamp);
            
            expect(result.routing_info).toBeDefined();
            expect(result.routing_info.source_topic).toBe('input_topic');
            expect(result.routing_info.processed_timestamp).toBe(timestamp);
            expect(result.routing_info.routing_rules_applied).toBe(true);
        });
    });
    
    describe('Fan-Out Topic Transform', () => {
        let topicTransform: Function;
        
        beforeAll(() => {
            const transformPath = join(process.cwd(), 'transforms', 'fan-out', 'topic_transform.js');
            topicTransform = loadTransformFunction(transformPath, '_streamkap_transform_topic');
        });
        
        it('should route express orders to express topic', () => {
            const result = topicTransform(mockOrderType1, 'key', 'topic', Date.now());
            expect(result).toBe('orders-express-processed');
        });
        
        it('should route rpos orders to rpos topic', () => {
            // Use order with low value to avoid high-value routing
            const lowValueOrder = {
                ...mockOrderType2,
                order_number: 100 // < 50000
            };
            const result = topicTransform(lowValueOrder, 'key', 'topic', Date.now());
            expect(result).toBe('orders-rpos-processed');
        });
        
        it('should route high-value orders to multiple topics', () => {
            const highValueOrder = {
                ...mockOrderType1,
                order_number: 100000 // > 50000
            };
            
            const result = topicTransform(highValueOrder, 'key', 'topic', Date.now());
            // High-value orders get routed to multiple topics (array)
            expect(Array.isArray(result)).toBe(true);
            expect(result).toContain('orders-express-processed');
            expect(result).toContain('orders-high-value');
        });
        
        it('should route orders without customer to error topic', () => {
            const errorOrder = {
                ...mockOrderType1,
                customer: undefined
            };
            
            const result = topicTransform(errorOrder, 'key', 'topic', Date.now());
            // Orders without customer get routed to multiple topics (array)
            expect(Array.isArray(result)).toBe(true);
            expect(result).toContain('orders-express-processed');
            expect(result).toContain('orders-errors');
        });
    });
    
    describe('Async Enrich Transform', () => {
        let asyncEnrichTransform: Function;
        
        beforeAll(() => {
            const transformPath = join(process.cwd(), 'transforms', 'enrich-async', 'value_transform.js');
            asyncEnrichTransform = loadTransformFunction(transformPath, '_streamkap_transform');
        });
        
        it('should enrich records with additional data', async () => {
            const result = await asyncEnrichTransform(mockOrderType1, 'key', 'topic', Date.now());
            
            expect(result).toBeDefined();
            expect(result.customer.credit_score).toBeDefined();
            expect(result.customer.loyalty_tier).toBeDefined();
            expect(result.enrichment_timestamp).toBeDefined();
        });
        
        it('should handle enrichment errors gracefully', async () => {
            const orderWithoutCustomer = {
                ...mockOrderType1,
                customer: undefined
            };
            
            const result = await asyncEnrichTransform(orderWithoutCustomer, 'key', 'topic', Date.now());
            
            // Should return transformed order with basic fields when enrichment fails
            expect(result).toBeDefined();
            expect(result._id).toBe(orderWithoutCustomer._id);
            expect(result.order_number).toBe(orderWithoutCustomer.order_number);
            // Should still have processing fields added
            expect(result.processed_at).toBeDefined();
            expect(result.processed_time).toBeDefined();
            expect(result.version).toBe('0.1.4');
        });
    });
    
    describe('Un-Nesting Transform', () => {
        let unNestingTransform: Function;
        
        beforeAll(() => {
            const transformPath = join(process.cwd(), 'transforms', 'un-nesting', 'value_transform.js');
            unNestingTransform = loadTransformFunction(transformPath, '_streamkap_transform');
        });
        
        it('should flatten customer object', () => {
            const result = unNestingTransform(mockOrderType1, 'key', 'topic', Date.now());
            
            expect(result.customer_id).toBe(mockCustomer._id);
            expect(result.customer_name).toBe(mockCustomer.name);
            expect(result.customer_organization_id).toBe(mockCustomer.organization_id);
            expect(result.customer_version).toBe(mockCustomer.version);
            
            // Original nested customer should be removed
            expect(result.customer).toBeUndefined();
            
            // Should have flattening metadata
            expect(result.flattened_at).toBeDefined();
            expect(result.original_structure_preserved).toBe(false);
        });
        
        it('should handle null input gracefully', () => {
            const result = unNestingTransform(null, 'key', 'topic', Date.now());
            expect(result).toBeNull();
        });
    });
    
    describe('Combined Transform Files', () => {
        it('should load combined map-filter transform without errors', () => {
            const transformPath = join(process.cwd(), 'transforms', 'map-filter', 'mapFilterTransform.js');
            const transformCode = readFileSync(transformPath, 'utf8');
            
            // Should contain both functions
            expect(transformCode).toContain('_streamkap_transform');
            expect(transformCode).toContain('_streamkap_transform_key');
            
            // Should not throw syntax errors
            expect(() => new Function(transformCode)).not.toThrow();
        });
        
        it('should load combined fan-out transform without errors', () => {
            const transformPath = join(process.cwd(), 'transforms', 'fan-out', 'fanOutTransform.js');
            const transformCode = readFileSync(transformPath, 'utf8');
            
            expect(transformCode).toContain('_streamkap_transform');
            expect(transformCode).toContain('_streamkap_transform_topic');
            expect(() => new Function(transformCode)).not.toThrow();
        });
    });
    
    describe('Shared Utilities', () => {
        let utils: any;
        
        beforeAll(() => {
            const transformPath = join(process.cwd(), 'transforms', 'map-filter', 'value_transform.js');
            const transformCode = readFileSync(transformPath, 'utf8');
            
            // Extract utility functions by executing the code
            const sandbox = { console, Date, Math, JSON, require: () => require('moment') };
            const func = new Function(...Object.keys(sandbox), transformCode + `\nreturn { formatTimestamp, generateProcessingId, validateOrderStructure, safeStringify };`);
            utils = func(...Object.values(sandbox));
        });
        
        it('should have formatTimestamp utility', () => {
            const timestamp = new Date('2024-01-15T10:30:00Z').getTime();
            const formatted = utils.formatTimestamp(timestamp);
            
            expect(formatted).toMatch(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/);
        });
        
        it('should have generateProcessingId utility', () => {
            const id1 = utils.generateProcessingId();
            const id2 = utils.generateProcessingId();
            
            expect(id1).toMatch(/^proc-/);
            expect(id2).toMatch(/^proc-/);
            expect(id1).not.toBe(id2); // Should be unique
        });
        
        it('should have validateOrderStructure utility', () => {
            expect(utils.validateOrderStructure(mockOrderType1)).toBe(true);
            expect(utils.validateOrderStructure(null)).toBe(null); // Function returns null for null input
            expect(utils.validateOrderStructure({})).toBe(false);
        });
        
        it('should have safeStringify utility', () => {
            expect(utils.safeStringify({ test: 'value' })).toBe('{"test":"value"}');
            
            // Test circular reference handling
            const circular: any = { a: 1 };
            circular.self = circular;
            expect(utils.safeStringify(circular)).toBe('[Unable to stringify object]');
        });
    });
});