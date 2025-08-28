/**
 * Tests specific to the template-based structure
 * These tests verify the template classes work correctly
 */

import { existsSync } from 'fs';
import { CommonTransform } from './templates/commonTransform';
import { ValueTransform } from './templates/valueTransform';
import { KeyTransform } from './templates/keyTransform';
import { TopicTransform } from './templates/topicTransform';
import { ValueSchemaTransform } from './templates/valueSchemaTransform';
import { KeySchemaTransform } from './templates/keySchemaTransform';

// Only run these tests if we're in template structure
const isTemplateStructure = existsSync('src/templates/index.ts');

const describeIfTemplate = isTemplateStructure ? describe : describe.skip;

describeIfTemplate('Template Structure Classes', () => {
    
    const mockRecord = {
        id: 'order-123',
        type: 'order',
        user: {
            id: 'user-456',
            name: 'John Doe',
            email: 'john@example.com'
        },
        amount: 99.99,
        created_at: new Date().toISOString()
    };

    describe('CommonTransform', () => {
        let commonTransform: CommonTransform;
        
        beforeEach(() => {
            commonTransform = new CommonTransform();
        });
        
        it('should transform records', () => {
            const result = commonTransform.transformRecord(mockRecord);
            
            expect(result).toBeDefined();
            expect(typeof result).toBe('object');
            expect(result.processed_at).toBeDefined();
            expect(result.transform_version).toBe('1.0.0');
        });
        
        it('should validate records', () => {
            expect(commonTransform.validateRecord(mockRecord)).toBe(true);
            expect(commonTransform.validateRecord(null)).toBe(false);
            expect(commonTransform.validateRecord({})).toBe(false);
        });
        
        it('should filter records appropriately', () => {
            expect(commonTransform.shouldKeepRecord(mockRecord)).toBe(true);
            
            const testRecord = { ...mockRecord, id: 'test-record' };
            expect(commonTransform.shouldKeepRecord(testRecord)).toBe(false);
        });
        
        it('should determine routing topics', () => {
            const result = commonTransform.getRoutingTopics(mockRecord, 'source-topic');
            
            expect(result).toBeDefined();
            if (typeof result === 'string') {
                expect(result.length).toBeGreaterThan(0);
            } else if (Array.isArray(result)) {
                expect(result.length).toBeGreaterThan(0);
            }
        });
        
        it('should handle async enrichment', async () => {
            const result = await commonTransform.enrichRecord(mockRecord);
            
            expect(result).toBeDefined();
            expect(result.enriched_at).toBeDefined();
            expect(result.enrichment).toBeDefined();
        });
        
        it('should flatten nested records', () => {
            const result = commonTransform.flattenRecord(mockRecord);
            
            expect(result).toBeDefined();
            expect(result.user_id).toBe('user-456');
            expect(result.user_name).toBe('John Doe');
            expect(result.user_email).toBe('john@example.com');
            expect(result.flattened_at).toBeDefined();
        });
    });
    
    describe('ValueTransform', () => {
        let valueTransform: ValueTransform;
        
        beforeEach(() => {
            valueTransform = new ValueTransform();
        });
        
        it('should transform values', () => {
            const result = valueTransform.transform(mockRecord, 'key-123', 'test-topic', Date.now());
            
            expect(result).toBeDefined();
            expect(result.source_topic).toBe('test-topic');
            expect(result.source_key).toBe('key-123');
            expect(result.transform_type).toBe('value');
        });
        
        it('should handle async transformation', async () => {
            const result = await valueTransform.transformAsync(mockRecord, 'key-123', 'test-topic', Date.now());
            
            expect(result).toBeDefined();
            expect(result.source_topic).toBe('test-topic');
            expect(result.transform_type).toBe('async_value');
        });
        
        it('should handle flattening transformation', () => {
            const result = valueTransform.transformFlatten(mockRecord, 'key-123', 'test-topic', Date.now());
            
            expect(result).toBeDefined();
            expect(result.source_topic).toBe('test-topic');
            expect(result.transform_type).toBe('flatten');
        });
        
        it('should filter invalid records', () => {
            const invalidRecord = null;
            const result = valueTransform.transform(invalidRecord, 'key-123', 'test-topic', Date.now());
            
            expect(result).toBeNull();
        });
    });
    
    describe('KeyTransform', () => {
        let keyTransform: KeyTransform;
        
        beforeEach(() => {
            keyTransform = new KeyTransform();
        });
        
        it('should transform keys', () => {
            const result = keyTransform.transform(mockRecord, 'original-key', 'test-topic', Date.now());
            
            expect(result).toBeDefined();
            expect(typeof result).toBe('string');
            expect(result.length).toBeGreaterThan(0);
        });
        
        it('should transform keys with context', () => {
            const result = keyTransform.transformWithContext(mockRecord, 'original-key', 'test-topic', Date.now());
            
            expect(result).toBeDefined();
            expect(typeof result).toBe('string');
            expect(result.length).toBeGreaterThan(0);
        });
        
        it('should transform keys for fan out', () => {
            const result = keyTransform.transformForFanOut(mockRecord, 'original-key', 'test-topic', Date.now());
            
            expect(result).toBeDefined();
            expect(typeof result).toBe('string');
            expect(result.length).toBeGreaterThan(0);
        });
        
        it('should validate keys', () => {
            expect(keyTransform.validateKey('valid-key')).toBe(true);
            expect(keyTransform.validateKey('')).toBe(false);
            expect(keyTransform.validateKey(null as any)).toBe(false);
        });
        
        it('should sanitize keys', () => {
            const dirtyKey = 'key<with>invalid:chars';
            const result = keyTransform.sanitizeKey(dirtyKey);
            
            expect(result).toBeDefined();
            expect(result).not.toContain('<');
            expect(result).not.toContain('>');
            expect(result).not.toContain(':');
        });
    });
    
    describe('TopicTransform', () => {
        let topicTransform: TopicTransform;
        
        beforeEach(() => {
            topicTransform = new TopicTransform();
        });
        
        it('should transform topics', () => {
            const result = topicTransform.transform(mockRecord, 'key-123', 'source-topic', Date.now());
            
            expect(result).toBeDefined();
            if (typeof result === 'string') {
                expect(result.length).toBeGreaterThan(0);
            } else if (Array.isArray(result)) {
                expect(result.length).toBeGreaterThan(0);
                result.forEach(topic => {
                    expect(typeof topic).toBe('string');
                    expect(topic.length).toBeGreaterThan(0);
                });
            }
        });
        
        it('should handle simple routing', () => {
            const result = topicTransform.simpleRoute(mockRecord, 'key-123', 'source-topic', Date.now());
            
            expect(result).toBeDefined();
            expect(typeof result).toBe('string');
            expect(result.length).toBeGreaterThan(0);
        });
        
        it('should handle complex routing', () => {
            const result = topicTransform.complexRoute(mockRecord, 'key-123', 'source-topic', Date.now());
            
            expect(result).toBeDefined();
            if (typeof result === 'string') {
                expect(result.length).toBeGreaterThan(0);
            } else if (Array.isArray(result)) {
                expect(result.length).toBeGreaterThan(0);
            }
        });
        
        it('should handle conditional routing', () => {
            const result = topicTransform.conditionalRoute(mockRecord, 'key-123', 'source-topic', Date.now());
            
            expect(result).toBeDefined();
            if (typeof result === 'string') {
                expect(result.length).toBeGreaterThan(0);
            } else if (Array.isArray(result)) {
                expect(result.length).toBeGreaterThan(0);
            }
        });
        
        it('should validate topic names', () => {
            expect(topicTransform.validateTopicName('valid-topic')).toBe(true);
            expect(topicTransform.validateTopicName('valid_topic.123')).toBe(true);
            expect(topicTransform.validateTopicName('')).toBe(false);
            expect(topicTransform.validateTopicName('invalid topic')).toBe(false);
        });
        
        it('should sanitize topic names', () => {
            const dirtyTopic = 'topic with spaces!@#$';
            const result = topicTransform.sanitizeTopicName(dirtyTopic);
            
            expect(result).toBeDefined();
            expect(result).not.toContain(' ');
            expect(result).not.toContain('!');
            expect(result).not.toContain('@');
        });
    });
    
    describe('ValueSchemaTransform', () => {
        let valueSchemaTransform: ValueSchemaTransform;
        
        beforeEach(() => {
            valueSchemaTransform = new ValueSchemaTransform();
        });
        
        it('should transform value schemas', () => {
            const result = valueSchemaTransform.transform(mockRecord, 'key-123', 'test-topic', Date.now());
            
            expect(result).toBeDefined();
            expect(result._schema).toBeDefined();
            expect(result._schema.version).toBe('1.0.0');
            expect(result._schema.source_topic).toBe('test-topic');
        });
        
        it('should handle legacy to new transformation', () => {
            const legacyRecord = {
                old_field_name: 'old_value',
                string_number: '42',
                flat_user_name: 'John Doe',
                flat_user_email: 'john@example.com'
            };
            
            const result = valueSchemaTransform.transformLegacyToNew(legacyRecord, 'key-123', 'test-topic', Date.now());
            
            expect(result).toBeDefined();
            expect(result.new_field_name).toBe('old_value');
            expect(result.actual_number).toBe(42);
            expect(result.user).toBeDefined();
            expect(result.user.name).toBe('John Doe');
            expect(result._migration).toBeDefined();
        });
        
        it('should normalize schema structure', () => {
            const camelCaseRecord = {
                firstName: 'John',
                lastName: 'Doe',
                userProfile: {
                    emailAddress: 'john@example.com'
                }
            };
            
            const result = valueSchemaTransform.normalizeSchema(camelCaseRecord);
            
            expect(result).toBeDefined();
            expect(result.first_name).toBe('John');
            expect(result.last_name).toBe('Doe');
            expect(result.user_profile).toBeDefined();
            expect(result.user_profile.email_address).toBe('john@example.com');
        });
    });
    
    describe('KeySchemaTransform', () => {
        let keySchemaTransform: KeySchemaTransform;
        
        beforeEach(() => {
            keySchemaTransform = new KeySchemaTransform();
        });
        
        it('should transform key schemas', () => {
            const result = keySchemaTransform.transform(mockRecord, 'simple-key', 'test-topic', Date.now());
            
            expect(result).toBeDefined();
            expect(typeof result).toBe('object');
        });
        
        it('should transform string to structured keys', () => {
            const result = keySchemaTransform.transformStringToStructured(mockRecord, 'simple-key', 'test-topic', Date.now());
            
            expect(result).toBeDefined();
            expect(result.key).toBe('simple-key');
            expect(result.partition_info).toBeDefined();
            expect(result.schema_version).toBe('1.0.0');
        });
        
        it('should transform to optimized form', () => {
            const structuredKey = {
                id: 'test-123',
                tenant_id: 'tenant-456',
                type: 'order'
            };
            
            const result = keySchemaTransform.transformToOptimized(mockRecord, structuredKey, 'test-topic', Date.now());
            
            expect(result).toBeDefined();
            expect(result.id).toBe('test-123');
            expect(result.tenant).toBe('tenant-456');
            expect(result.type).toBe('order');
        });
        
        it('should handle multi-tenant transformation', () => {
            const tenantRecord = { ...mockRecord, tenant_id: 'tenant-123' };
            
            const result = keySchemaTransform.transformForMultiTenant(tenantRecord, 'simple-key', 'test-topic', Date.now());
            
            expect(result).toBeDefined();
            expect(result.tenant_id).toBe('tenant-123');
            expect(result.tenant_key).toBe('simple-key');
            expect(result.schema_type).toBe('multi_tenant_key');
        });
    });
});

// Export detection function for use in other tests
export { isTemplateStructure };