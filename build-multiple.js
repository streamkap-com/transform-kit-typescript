// build-multiple.js
// This script generates multiple transform bundle outputs for Streamkap

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Transform types aligned with actual Streamkap implementation
const transforms = [
    {
        name: 'mapFilterTransform',
        type: 'map_filter',
        language: 'JAVASCRIPT',
        description: 'Map/Filter transform - modify and filter records',
        functions: ['value_transform', 'key_transform'],
        folder: 'map-filter'
    },
    {
        name: 'fanOutTransform',
        type: 'fan_out',
        language: 'JAVASCRIPT',
        description: 'Fan Out - route records to multiple topics',
        functions: ['value_transform', 'topic_transform'],
        folder: 'fan-out'
    },
    {
        name: 'enrichAsyncTransform',
        type: 'enrich_async',
        language: 'JAVASCRIPT',
        description: 'Async Enrich - enrich records with REST API calls',
        functions: ['value_transform'],
        folder: 'enrich-async'
    },
    {
        name: 'unNestingTransform',
        type: 'un_nesting',
        language: 'JAVASCRIPT',
        description: 'Un Nesting - flatten nested objects/arrays',
        functions: ['value_transform'],
        folder: 'un-nesting'
    }
];


function removeModuleWrapper(transformCode) {
    // Remove IIFE wrapper and clean up
    transformCode = transformCode.replace(/^"use strict";\s*\n?/, '');
    transformCode = transformCode.replace(/^\(\(\)\s*=>\s*\{\s*\n/, '');
    transformCode = transformCode.replace(/\s*\}\)\(\);?\s*$/, '');
    transformCode = transformCode.split('\n').map(line => line.replace(/^  /, '')).join('\n');
    transformCode = transformCode.trim();
    return transformCode;
}

async function buildTransforms() {
    console.log('🏗️  Building multiple Streamkap transform bundles...\n');

    // Create output directory structure
    const outputDir = 'transforms';
    const tmpDir = '.tmp.build';
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
    }

    // First build the main bundle
    buildTransformFunction(outputDir, tmpDir, 'value_transform');
    buildTransformFunction(outputDir, tmpDir, 'key_transform');
    buildTransformFunction(outputDir, tmpDir, 'topic_transform');

    // Create README for generated folder
    generateOutputReadme(outputDir);

    console.log('🎉 All transform bundles generated successfully!');
    console.log(`📁 Output directory: ${outputDir}/`);

}

function buildTransformFunction(outputDir, tmpDir, funcType) {

    // Clean up previous temporary build file
    try {
        fs.unlinkSync(`${tmpDir}/${funcType}.js`);
    } catch (e) {
        // Ignore if file doesn't exist
    }    

    console.log(`📦 Building ${funcType} TypeScript bundle...`);
    try {
        execSync(`npx esbuild src/${funcType}.ts --bundle --platform=browser --target=es2015 --outfile=${tmpDir}/${funcType}.js`, { stdio: 'inherit' });
    } catch (error) {
        console.error(`❌ Failed to build ${funcType} bundle`);
        process.exit(1);
    }

    // Read value_transform.js and process it
    let transformCode = fs.readFileSync(`${tmpDir}/${funcType}.js`, 'utf8');
    let fileName = `${outputDir}/${funcType}.js`;
    console.log(`   📄 Generating ${fileName}`);
    let code = generateFileHeader(funcType) + removeModuleWrapper(transformCode);
    fs.writeFileSync(fileName, code);
    console.log(`   ✅ Generated successfully`);

}

// Helper functions for new structure
function generateFileHeader(funcType) {
    return `// Streamkap transforms
// Function: ${funcType}
// Generated on: ${new Date().toISOString()}

`;
}

function generateSqlHeader(transform) {
    return `-- Streamkap ${transform.type} Transform (SQL)
-- ${transform.description}
-- Generated on: ${new Date().toISOString()}
-- 
-- This SQL query is used for ${transform.type} transforms in Streamkap

`;
}

function validateFile(filePath) {
    try {
        require.resolve('./' + filePath);
        console.log(`   ✅ Generated successfully`);
    } catch (e) {
        console.log(`   ⚠️  Generated (syntax validation skipped)`);
    }
}

function generateOutputReadme(outputDir) {
    let readmeContent = '# Generated Streamkap Transforms\n\n';
    readmeContent += 'This directory contains self-contained transform bundles for Streamkap.\n\n';
    readmeContent += 'Generated on: ' + new Date().toISOString() + '\n\n';
    
    readmeContent += '## Key Features\n\n';
    readmeContent += '- **Self-contained**: Each transform file includes all dependencies (moment.js bundled)\n';
    readmeContent += '- **Ready for Streamkap**: Upload directly to corresponding transform types\n';
    readmeContent += '- **TypeScript generated**: Clean, type-safe transforms compiled from TypeScript\n';
    readmeContent += '- **Individual & combined**: Both granular function files and combined transforms\n\n';
    
    readmeContent += '## Usage Instructions\n\n';
    readmeContent += '1. Select the appropriate transform file for your use case\n';
    readmeContent += '2. Upload to Streamkap in the corresponding transform type\n';
    readmeContent += '3. Configure input/output patterns and serialization\n';
    readmeContent += '4. Deploy and validate your transform\n\n';
    
    readmeContent += '## Transform Function Signatures\n\n';
    readmeContent += '- `_streamkap_transform(valueObject, keyObject, topic, timestamp)` - Main transform\n';
    readmeContent += '- `_streamkap_transform_key(valueObject, keyObject, topic, timestamp)` - Key transformation\n';
    readmeContent += '- `_streamkap_transform_topic(valueObject, keyObject, topic, timestamp)` - Topic routing\n\n';
    
    readmeContent += 'All functions include comprehensive error handling and moment.js integration.\n';

    fs.writeFileSync(path.join(outputDir, 'README.md'), readmeContent);
}

// Run the build
buildTransforms().catch(console.error);