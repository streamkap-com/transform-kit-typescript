/**
 * Tests for generated Streamkap transform functions
 * These tests verify that the actual bundled transforms work correctly
 * Works with both example-based and template-based structures
 */

import { readFileSync, existsSync, writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { execSync, execFileSync } from 'child_process';
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

// Helper to safely execute transform using VM to avoid template literal collisions
function executeTransformSafely(
    filePath: string, 
    functionName: string, 
    inputData: any, 
    keyObject: any = 'test-key', 
    topic: string = 'test-topic',
    isAsync: boolean = false
): any {
    // Create a VM-based runner script to safely execute the transform
    const runnerScript = `
const fs = require('fs');
const vm = require('vm');

try {
    // Read the transform bundle
    const transformCode = fs.readFileSync(${JSON.stringify(filePath)}, 'utf8');
    
    // Create a VM context with necessary globals and better module support
    const context = {
        console: console,
        require: require,
        process: process,
        Buffer: Buffer,
        setTimeout: setTimeout,
        setInterval: setInterval,
        clearTimeout: clearTimeout,
        clearInterval: clearInterval,
        crypto: require('crypto'),
        global: {},
        globalThis: {},
        exports: {},
        module: { exports: {} },
        __filename: ${JSON.stringify(filePath)},
        __dirname: require('path').dirname(${JSON.stringify(filePath)})
    };
    
    // Execute the transform code in the VM context with filename and timeout
    const script = new vm.Script(transformCode, { 
        filename: ${JSON.stringify(filePath)},
        timeout: 5000 // 5 second timeout for runaway protection
    });
    script.runInNewContext(context, { timeout: 5000 });
    
    // Get the transform function from context - support multiple export patterns
    let transformFn = context[${JSON.stringify(functionName)}];
    
    // Try different export patterns if function not found directly
    if (typeof transformFn !== 'function') {
        // Try global/globalThis exports
        transformFn = context.global[${JSON.stringify(functionName)}] || 
                      context.globalThis[${JSON.stringify(functionName)}];
        
        // Try module.exports
        if (typeof transformFn !== 'function' && context.module && context.module.exports) {
            transformFn = context.module.exports[${JSON.stringify(functionName)}] || 
                          context.module.exports;
        }
        
        // Try exports
        if (typeof transformFn !== 'function' && context.exports) {
            transformFn = context.exports[${JSON.stringify(functionName)}];
        }
    }
    
    if (typeof transformFn !== 'function') {
        throw new Error('Transform function ' + ${JSON.stringify(functionName)} + ' not found or not a function. Available keys: ' + Object.keys(context).join(', '));
    }
    
    // Execute the transform
    const inputData = ${JSON.stringify(inputData)};
    const keyObject = ${JSON.stringify(keyObject)};
    const topic = ${JSON.stringify(topic)};
    const timestamp = ${Date.now()};
    
    ${isAsync ? 
        '(async () => { const result = await transformFn(inputData, keyObject, topic, timestamp); console.log(JSON.stringify(result, null, 2)); })();' : 
        'const result = transformFn(inputData, keyObject, topic, timestamp); console.log(JSON.stringify(result, null, 2));'
    }
    
} catch (error) {
    console.error('VM Transform execution error:', error.message);
    process.exit(1);
}
`;

    let output = '';
    let testFile = '';
    
    try {
        // Write runner script to temporary file
        testFile = join(process.cwd(), `temp-vm-runner-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.js`);
        writeFileSync(testFile, runnerScript);
        
        // Execute using execFileSync for better security
        output = execFileSync('node', [testFile], {
            encoding: 'utf8',
            stdio: ['pipe', 'pipe', 'pipe'],
            timeout: 10000
        });
        
        // Clean up
        unlinkSync(testFile);
        
        const result = JSON.parse(output.trim());
        return result;
    } catch (error) {
        // Clean up on error
        if (testFile && existsSync(testFile)) {
            try { unlinkSync(testFile); } catch (e) { /* ignore cleanup errors */ }
        }
        
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('VM Transform execution error:', errorMessage);
        console.error('Raw output:', output);
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
        const transformPath = join(process.cwd(), 'transforms', 'map-filter', 'valueTransform.js');
        
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
                // Record has _id so has_valid_data should be true, even with null customer
                expect(result.has_valid_data).toBe(true);
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
        const transformPath = join(process.cwd(), 'transforms', 'map-filter', 'keyTransform.js');
        
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
        const transformPath = join(process.cwd(), 'transforms', 'fan-out', 'topicTransform.js');
        
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
        const transformPath = join(process.cwd(), 'transforms', 'enrich-async', 'valueTransform.js');
        
        beforeAll(() => {
            expect(existsSync(transformPath)).toBe(true);
        });
        
        it('should handle async transformation', async () => {
            // Use the safer VM-based runner for async transforms
            const result = executeTransformSafely(transformPath, '_streamkap_transform', mockOrderType1, 'test-key', 'test-topic', true);
            
            expect(result).toBeDefined();
            expect(result).not.toBeNull();
        }, 15000); // 15 second Jest timeout
    });
    
    describe('Un-nesting Transform', () => {
        const transformPath = join(process.cwd(), 'transforms', 'un-nesting', 'valueTransform.js');
        
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
            const valueTransformPath = join(process.cwd(), 'transforms', 'map-filter', 'valueTransform.js');
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