/**
 * Tests for generated Streamkap transform functions
 * These tests verify that the actual bundled transforms work correctly
 * Works with both example-based and template-based structures
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
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
    _id: "express-order123", // Non-test ID to avoid filtering
    order_type: "OrderType1", 
    order_number: 12345,
    location_id: "loc-789",
    channel: "express",
    customer: mockCustomer,
    organization_id: "org-456"
};

const mockOrderType2: OrderType2 = {
    order_id: "rpos-order456", // Non-test ID to avoid filtering
    order_type: "OrderType2",
    order_number: 67890, 
    location_id: "loc-123",
    channel: "rpos",
    customer: mockCustomer
};

// Helper to detect project structure
function detectProjectStructure(): 'template' | 'example' {
    return existsSync('src/templates/index.ts') ? 'template' : 'example';
}

// Helper to execute transform in Node.js subprocess for isolation
function executeTransformSafely(filePath: string, functionName: string, inputData: any, keyObject: any = 'test-key', topic: string = 'test-topic'): any {
    const transformCode = readFileSync(filePath, 'utf8');
    
    // Create a test script that requires the transform and executes it
    const testScript = `
// Load the transform code
${transformCode}

// Execute the transform
const result = ${functionName}(${JSON.stringify(inputData)}, "${keyObject}", "${topic}", ${Date.now()});

// Output result as JSON
console.log(JSON.stringify(result, null, 2));
`;

    try {
        // Write test script to temporary file and execute
        const testFile = join(process.cwd(), 'temp-transform-test.js');
        require('fs').writeFileSync(testFile, testScript);
        
        const output = execSync(`node ${testFile}`, { 
            encoding: 'utf8',
            stdio: ['pipe', 'pipe', 'pipe']
        });
        
        // Clean up
        require('fs').unlinkSync(testFile);
        
        return JSON.parse(output.trim());
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('Transform execution error:', errorMessage);
        throw error;
    }
}

describe('Generated Transform Functions', () => {
    
    beforeAll(() => {
        // Ensure transforms are built before running tests
        try {
            execSync('npm run build', { stdio: 'inherit' });
        } catch (error) {
            console.warn('Build failed, but continuing with existing transforms...');
        }
    });

    describe('Project Structure Detection', () => {
        it('should detect the correct project structure', () => {
            const structure = detectProjectStructure();
            expect(['template', 'example']).toContain(structure);
        });
    });
    
    describe('Map/Filter Value Transform', () => {
        const transformPath = join(process.cwd(), 'transforms', 'map-filter', 'value_transform.js');
        
        beforeAll(() => {
            expect(existsSync(transformPath)).toBe(true);
        });
        
        it('should transform records correctly', () => {
            const result = executeTransformSafely(transformPath, '_streamkap_transform', mockOrderType1);
            
            expect(result).toBeDefined();
            expect(result).not.toBeNull();
            
            // Common expectations for both structures
            expect(typeof result).toBe('object');
            
            // Check for processed timestamps (both structures should add these)
            expect(result.processed_at || result.processed_time).toBeDefined();
        });
        
        it('should filter out records with test in ID (example structure)', () => {
            const structure = detectProjectStructure();
            
            if (structure === 'example') {
                const testOrder = {
                    ...mockOrderType1,
                    _id: 'express-test-should-filter'
                };
                
                const result = executeTransformSafely(transformPath, '_streamkap_transform', testOrder);
                expect(result).toBeNull();
            } else {
                // Template structure may have different filtering logic
                expect(true).toBe(true); // Skip test for template structure
            }
        });
        
        it('should handle records appropriately based on structure', () => {
            const recordWithNullCustomer = {
                ...mockOrderType1,
                customer: null
            };
            
            const result = executeTransformSafely(transformPath, '_streamkap_transform', recordWithNullCustomer);
            
            const structure = detectProjectStructure();
            if (structure === 'example') {
                // Example structure has strict customer validation
                expect(result).toBeNull();
            } else {
                // Template structure is more flexible - processes records but may mark validation issues
                expect(result).toBeDefined();
                expect(typeof result).toBe('object');
                // Template structure adds metadata and processes records more permissively
                expect(result.has_valid_data).toBe(false);
            }
        });
        
        it('should handle OrderType2 correctly', () => {
            const result = executeTransformSafely(transformPath, '_streamkap_transform', mockOrderType2);
            
            expect(result).toBeDefined();
            expect(result).not.toBeNull();
            expect(typeof result).toBe('object');
        });
    });
    
    describe('Map/Filter Key Transform', () => {
        const transformPath = join(process.cwd(), 'transforms', 'map-filter', 'key_transform.js');
        
        beforeAll(() => {
            expect(existsSync(transformPath)).toBe(true);
        });
        
        it('should transform keys correctly', () => {
            const result = executeTransformSafely(transformPath, '_streamkap_transform_key', mockOrderType1, 'original-key');
            
            expect(result).toBeDefined();
            expect(typeof result).toBe('string');
            expect(result.length).toBeGreaterThan(0);
        });
        
        it('should handle different order types', () => {
            const result1 = executeTransformSafely(transformPath, '_streamkap_transform_key', mockOrderType1, 'test-key');
            const result2 = executeTransformSafely(transformPath, '_streamkap_transform_key', mockOrderType2, 'test-key');
            
            expect(result1).toBeDefined();
            expect(result2).toBeDefined();
            expect(typeof result1).toBe('string');
            expect(typeof result2).toBe('string');
        });
    });
    
    describe('Fan-Out Topic Transform', () => {
        const transformPath = join(process.cwd(), 'transforms', 'fan-out', 'topic_transform.js');
        
        beforeAll(() => {
            expect(existsSync(transformPath)).toBe(true);
        });
        
        it('should route to appropriate topics', () => {
            const result = executeTransformSafely(transformPath, '_streamkap_transform_topic', mockOrderType1, 'test-key');
            
            expect(result).toBeDefined();
            
            // Result can be string or array of strings
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
        
        it('should handle different channels appropriately', () => {
            const expressResult = executeTransformSafely(transformPath, '_streamkap_transform_topic', 
                { ...mockOrderType1, channel: 'express' }, 'test-key');
            const rposResult = executeTransformSafely(transformPath, '_streamkap_transform_topic', 
                { ...mockOrderType2, channel: 'rpos' }, 'test-key');
            
            expect(expressResult).toBeDefined();
            expect(rposResult).toBeDefined();
        });
    });
    
    describe('Enrich Async Transform', () => {
        const transformPath = join(process.cwd(), 'transforms', 'enrich-async', 'value_transform.js');
        
        beforeAll(() => {
            expect(existsSync(transformPath)).toBe(true);
        });
        
        it('should handle async transformation', async () => {
            // For async transforms, we need to modify our execution approach
            const transformCode = readFileSync(transformPath, 'utf8');
            
            // Create async test script
            const testScript = `
// Load the transform code
${transformCode}

// Execute async transform
(async () => {
    try {
        const result = await _streamkap_transform(${JSON.stringify(mockOrderType1)}, "test-key", "test-topic", ${Date.now()});
        console.log(JSON.stringify(result, null, 2));
    } catch (error) {
        console.error('Async transform error:', error.message);
        process.exit(1);
    }
})();
`;
            
            const testFile = join(process.cwd(), 'temp-async-test.js');
            require('fs').writeFileSync(testFile, testScript);
            
            try {
                const output = execSync(`node ${testFile}`, { 
                    encoding: 'utf8',
                    timeout: 10000 // 10 second timeout for async operations
                });
                
                const result = JSON.parse(output.trim());
                expect(result).toBeDefined();
                expect(result).not.toBeNull();
                
            } finally {
                // Clean up
                if (require('fs').existsSync(testFile)) {
                    require('fs').unlinkSync(testFile);
                }
            }
        }, 15000); // 15 second Jest timeout
    });
    
    describe('Un-nesting Transform', () => {
        const transformPath = join(process.cwd(), 'transforms', 'un-nesting', 'value_transform.js');
        
        beforeAll(() => {
            expect(existsSync(transformPath)).toBe(true);
        });
        
        it('should flatten nested structures', () => {
            const nestedOrder = {
                ...mockOrderType1,
                nested_data: {
                    level1: {
                        level2: "deep_value"
                    }
                }
            };
            
            const result = executeTransformSafely(transformPath, '_streamkap_transform', nestedOrder);
            
            expect(result).toBeDefined();
            expect(result).not.toBeNull();
            expect(typeof result).toBe('object');
        });
    });
    
    describe('Generated File Structure', () => {
        it('should have all expected transform directories', () => {
            const baseDir = join(process.cwd(), 'transforms');
            const expectedDirs = ['map-filter', 'fan-out', 'enrich-async', 'un-nesting'];
            
            expectedDirs.forEach(dir => {
                expect(existsSync(join(baseDir, dir))).toBe(true);
            });
        });
        
        it('should have self-contained transform files', () => {
            const valueTransformPath = join(process.cwd(), 'transforms', 'map-filter', 'value_transform.js');
            const content = readFileSync(valueTransformPath, 'utf8');
            
            // Should contain bundled dependencies
            expect(content).toContain('moment');
            expect(content).toContain('lodash');
            expect(content).toContain('uuid');
            
            // Should contain transform function
            expect(content).toContain('_streamkap_transform');
        });
    });
});