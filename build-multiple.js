// Streamkap Transform Builder
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function parseArgs() {
    const args = process.argv.slice(2);
    const requestedTypes = new Set();
    let buildAll = false;

    if (args.length === 0 || args.includes('--all')) {
        buildAll = true;
    } else {
        for (const arg of args) {
            if (arg.startsWith('--')) {
                const type = arg.substring(2).replace('-', '_');
                requestedTypes.add(type);
            }
        }
    }

    return { requestedTypes, buildAll };
}

// Transform type configurations
const transforms = [
    {
        type: 'map_filter',
        folder: 'map-filter',
        files: [
            { src: 'src/value_transform.ts', out: 'valueTransform.js' },
            { src: 'src/key_transform.ts', out: 'keyTransform.js' }
        ]
    },
    {
        type: 'fan_out',
        folder: 'fan-out',
        files: [
            { src: 'src/value_transform.ts', out: 'valueTransform.js' },
            { src: 'src/topic_transform.ts', out: 'topicTransform.js' }
        ]
    },
    {
        type: 'enrich_async',
        folder: 'enrich-async',
        files: [
            { src: 'src/value_transform.ts', out: 'valueTransform.js' }
        ]
    },
    {
        type: 'un_nesting',
        folder: 'un-nesting',
        files: [
            { src: 'src/value_transform.ts', out: 'valueTransform.js' }
        ]
    }
];

function generateFileHeader(transformType, fileName) {
    const timestamp = new Date().toISOString();
    return `// Streamkap ${transformType} Transform - ${fileName}
// Generated on: ${timestamp}
// Self-contained bundle with all dependencies

`;
}

function buildTransformFunction(outputDir, tmpDir, srcFile, outFile) {
    console.log(`   📄 Generating ${outFile}`);
    
    try {
        execSync(`npx esbuild ${srcFile} --bundle --outfile=${tmpDir}/${outFile} --format=cjs --platform=node --target=es2018`, {
            stdio: 'pipe'
        });
        
        let transformCode = fs.readFileSync(`${tmpDir}/${outFile}`, 'utf8');
        let fileName = `${outputDir}/${outFile}`;
        let code = generateFileHeader(path.basename(outputDir), outFile) + transformCode;
        fs.writeFileSync(fileName, code);
        
        console.log(`   ✅ Generated ${outFile}`);
    } catch (error) {
        console.error(`   ❌ Failed to generate ${outFile}:`, error.message);
    }
}

function buildTransform(transform) {
    const outputDir = path.join('transforms', transform.folder);
    const tmpDir = '.tmp.build';
    
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    console.log(`🔄 Building ${transform.type} transforms...`);
    console.log(`   📁 ${transform.folder}/`);

    for (const file of transform.files) {
        if (fs.existsSync(file.src)) {
            buildTransformFunction(outputDir, tmpDir, file.src, file.out);
        } else {
            console.log(`   ⚠️  Skipping ${file.out} - ${file.src} not found`);
        }
    }
}

function createREADME() {
    const readmePath = path.join('transforms', 'README.md');
    const readmeContent = `# Generated Streamkap Transforms

These are Self-contained JavaScript files ready for deployment to Streamkap.

## Files Structure

- **map-filter/**: Transform and filter records
  - \`valueTransform.js\` - Main transform logic
  - \`keyTransform.js\` - Key transformation

- **fan-out/**: Route records to multiple topics
  - \`valueTransform.js\` - Value transformation for routing
  - \`topicTransform.js\` - Topic routing logic

- **enrich-async/**: Async enrichment transforms
  - \`valueTransform.js\` - Async enrichment logic

- **un-nesting/**: Flatten nested structures  
  - \`valueTransform.js\` - Flattening transform logic

## Usage

Copy the entire contents of the relevant .js file and paste it into your Streamkap transform implementation tab.

Generated on: ${new Date().toISOString()}
`;
    
    fs.writeFileSync(readmePath, readmeContent);
}

function main() {
    const { requestedTypes, buildAll } = parseArgs();
    
    // Filter transforms based on what was requested
    let transformsToBuild = transforms;
    if (!buildAll) {
        transformsToBuild = transforms.filter(t => requestedTypes.has(t.type));
        
        if (transformsToBuild.length === 0) {
            console.log('❌ No valid transform types specified.');
            console.log('Available types: --map-filter, --fan-out, --enrich-async, --un-nesting, --all');
            process.exit(1);
        }
    }

    console.log('🏗️  Streamkap Transform Builder');
    console.log(`📋 Building: ${buildAll ? 'all transforms' : transformsToBuild.map(t => t.type).join(', ')}`);
    console.log('');

    // Ensure directories exist
    if (!fs.existsSync('transforms')) {
        fs.mkdirSync('transforms', { recursive: true });
    }
    if (!fs.existsSync('.tmp.build')) {
        fs.mkdirSync('.tmp.build', { recursive: true });
    }

    // Build selected transforms
    for (const transform of transformsToBuild) {
        buildTransform(transform);
    }

    // Create README
    createREADME();
    
    // Clean up temp directory
    fs.rmSync('.tmp.build', { recursive: true, force: true });
    
    console.log('');
    console.log('✅ Build complete!');
    console.log('📁 Check the transforms/ directory for generated files');
}

main();