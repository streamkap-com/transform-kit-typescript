/**
 * Tests for the build process and generated file structure
 * These tests ensure the customer can rely on the build output
 * Works with both example-based and template-based structures
 */

import { existsSync, readdirSync, statSync, readFileSync } from 'fs';
import { join } from 'path';

// Helper to detect project structure
function detectProjectStructure(): 'template' | 'example' {
    return existsSync('src/templates/index.ts') ? 'template' : 'example';
}

describe('Build Process and Generated Files', () => {
    
    describe('Transform Directory Structure', () => {
        it('should create transforms directory', () => {
            const transformsDir = join(process.cwd(), 'transforms');
            expect(existsSync(transformsDir)).toBe(true);
        });
        
        it('should create all expected transform type folders', () => {
            const transformsDir = join(process.cwd(), 'transforms');
            const expectedFolders = [
                'map-filter',
                'fan-out', 
                'enrich-async',
                'un-nesting'
            ];
            
            for (const folder of expectedFolders) {
                const folderPath = join(transformsDir, folder);
                expect(existsSync(folderPath)).toBe(true);
            }
        });
        
        it('should generate README.md in transforms directory', () => {
            const readmePath = join(process.cwd(), 'transforms', 'README.md');
            expect(existsSync(readmePath)).toBe(true);
            
            const readmeContent = readFileSync(readmePath, 'utf8');
            expect(readmeContent).toContain('Generated Streamkap Transforms');
            expect(readmeContent).toContain('Self-contained');
        });
    });
    
    describe('JavaScript Transform Files', () => {
        const jsTransformTypes = [
            { folder: 'map-filter', files: ['valueTransform.js', 'keyTransform.js'] },
            { folder: 'fan-out', files: ['valueTransform.js', 'topicTransform.js'] },
            { folder: 'enrich-async', files: ['valueTransform.js'] },
            { folder: 'un-nesting', files: ['valueTransform.js'] }
        ];
        
        jsTransformTypes.forEach(({ folder, files }) => {
            describe(`${folder} transforms`, () => {
                files.forEach(fileName => {
                    it(`should generate ${fileName}`, () => {
                        const filePath = join(process.cwd(), 'transforms', folder, fileName);
                        expect(existsSync(filePath)).toBe(true);
                    });
                    
                    it(`should have valid JavaScript syntax in ${fileName}`, () => {
                        const filePath = join(process.cwd(), 'transforms', folder, fileName);
                        const content = readFileSync(filePath, 'utf8');
                        
                        // Should not throw syntax errors
                        expect(() => new Function(content)).not.toThrow();
                    });
                    
                    it(`should be self-contained in ${fileName}`, () => {
                        const filePath = join(process.cwd(), 'transforms', folder, fileName);
                        const content = readFileSync(filePath, 'utf8');
                        const structure = detectProjectStructure();
                        
                        // Should contain bundled dependencies based on structure
                        if (structure === 'example') {
                            // Only value transform files should contain OrderTransformer
                            if (fileName.includes('valueTransform')) {
                                expect(content).toContain('OrderTransformer');
                            }
                        } else {
                            expect(content).toContain('CommonTransform');
                            expect(content).toContain('ValueTransform');
                        }
                        
                        // Only value transforms need moment.js bundled (key/topic transforms are simple)
                        if (fileName.includes('valueTransform')) {
                            expect(content).toContain('moment'); // Should have moment.js bundled
                        }
                    });
                    
                    it(`should have proper headers in ${fileName}`, () => {
                        const filePath = join(process.cwd(), 'transforms', folder, fileName);
                        const content = readFileSync(filePath, 'utf8');
                        
                        expect(content).toContain('// Streamkap');
                        expect(content).toContain('// Generated on:');
                    });
                });
            });
        });
        
        it('should generate files with reasonable sizes', () => {
            jsTransformTypes.forEach(({ folder, files }) => {
                files.forEach(fileName => {
                    const filePath = join(process.cwd(), 'transforms', folder, fileName);
                    const stats = statSync(filePath);
                    
                    // Should not be empty - different expectations for different file types
                    if (fileName.includes('valueTransform')) {
                        // Value transforms should be large (with bundled dependencies)
                        expect(stats.size).toBeGreaterThan(100000);
                    } else {
                        // Key and topic transforms are simpler
                        expect(stats.size).toBeGreaterThan(100);
                    }
                    
                    // Should not be excessively large (> 1MB indicates potential issues)
                    expect(stats.size).toBeLessThan(1024 * 1024);
                });
            });
        });
    });
    
    
    describe('Streamkap Function Signatures', () => {
        it('should have correct function signatures in value transforms', () => {
            const valuePaths = [
                'transforms/map-filter/valueTransform.js',
                'transforms/fan-out/valueTransform.js',
                'transforms/enrich-async/valueTransform.js',
                'transforms/un-nesting/valueTransform.js'
            ];
            
            valuePaths.forEach(path => {
                const filePath = join(process.cwd(), path);
                const content = readFileSync(filePath, 'utf8');
                
                // Should contain proper Streamkap function signature
                expect(content).toContain('function _streamkap_transform(valueObject, keyObject, topic, timestamp)');
            });
        });
        
        it('should have correct key transform signature', () => {
            const filePath = join(process.cwd(), 'transforms/map-filter/keyTransform.js');
            const content = readFileSync(filePath, 'utf8');
            
            expect(content).toContain('function _streamkap_transform_key(valueObject, keyObject, topic, timestamp)');
        });
        
        it('should have correct topic transform signature', () => {
            const filePath = join(process.cwd(), 'transforms/fan-out/topicTransform.js');
            const content = readFileSync(filePath, 'utf8');
            
            expect(content).toContain('function _streamkap_transform_topic(valueObject, keyObject, topic, timestamp)');
        });
        
        it('should have transform function for async enrichment', () => {
            const filePath = join(process.cwd(), 'transforms/enrich-async/valueTransform.js');
            const content = readFileSync(filePath, 'utf8');
            
            // Should have the regular transform function (async handling is internal via transformAsync)
            expect(content).toContain('function _streamkap_transform(valueObject, keyObject, topic, timestamp)');
        });
    });
    
    
    describe('Dependencies and Self-containment', () => {
        it('should not have external requires in generated files', () => {
            const jsFiles = [
                'transforms/map-filter/valueTransform.js',
                'transforms/fan-out/valueTransform.js'
            ];
            
            jsFiles.forEach(filePath => {
                const fullPath = join(process.cwd(), filePath);
                const content = readFileSync(fullPath, 'utf8');
                
                // Should not require external modules (except bundled dependencies)
                const requireMatches = content.match(/require\(['"]([^'"]+)['"]\)/g) || [];
                const allowedRequires = ['moment', 'lodash', 'uuid', 'util', 'crypto']; // bundled dependencies + Node.js built-ins
                
                for (const match of requireMatches) {
                    const moduleName = match.match(/require\(['"]([^'"]+)['"]\)/)?.[1];
                    const isAllowed = allowedRequires.some(allowed => moduleName?.includes(allowed));
                    expect(isAllowed).toBe(true); // Should only require bundled dependencies or built-ins
                }
            });
        });
        
        it('should bundle npm dependencies functionality', () => {
            const filePath = join(process.cwd(), 'transforms/map-filter/valueTransform.js');
            const content = readFileSync(filePath, 'utf8');
            
            // Should contain bundled npm dependencies
            expect(content).toContain('moment');
            expect(content).toContain('lodash');
            expect(content).toContain('uuid');
        });
    });
});