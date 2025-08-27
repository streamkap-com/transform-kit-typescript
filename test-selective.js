// Selective test runner for Streamkap transforms

const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

function parseTestArgs() {
    const args = process.argv.slice(2);
    const requestedTypes = new Set();
    let testAll = false;
    let shouldBuild = false;

    if (args.length === 0 || args.includes('--all')) {
        testAll = true;
        shouldBuild = true;
    } else {
        for (const arg of args) {
            if (arg.startsWith('--')) {
                const type = arg.substring(2).replace('-', '_');
                requestedTypes.add(type);
            }
        }
    }

    return { requestedTypes, testAll, shouldBuild };
}

// Get available transforms based on generated files
function getAvailableTransforms() {
    const transformsDir = path.join(process.cwd(), 'transforms');
    if (!fs.existsSync(transformsDir)) {
        console.log('❌ No transforms directory found. Run build first.');
        process.exit(1);
    }

    const folders = fs.readdirSync(transformsDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

    // Map folder names to transform types
    const folderToType = {
        'map-filter': 'map_filter',
        'fan-out': 'fan_out',
        'enrich-async': 'enrich_async',
        'un-nesting': 'un_nesting'
    };

    return folders.map(folder => folderToType[folder]).filter(Boolean);
}

function main() {
    const { requestedTypes, testAll, shouldBuild } = parseTestArgs();
    
    // If shouldBuild is true, run build first
    if (shouldBuild) {
        console.log('🏗️  Building all transforms first...');
        try {
            execSync('node build-multiple.js --all', { stdio: 'inherit' });
        } catch (error) {
            console.log('❌ Build failed.');
            process.exit(error.status || 1);
        }
    }
    const availableTransforms = getAvailableTransforms();

    if (availableTransforms.length === 0) {
        console.log('❌ No generated transforms found. Run build first.');
        process.exit(1);
    }

    // Filter transforms based on what's actually generated and what was requested
    let transformsToTest = availableTransforms;
    if (!testAll) {
        transformsToTest = availableTransforms.filter(t => requestedTypes.has(t));
        
        if (transformsToTest.length === 0) {
            console.log('❌ None of the requested transform types have been generated.');
            console.log(`Available generated types: ${availableTransforms.join(', ')}`);
            console.log('Available arguments: --map-filter, --fan-out, --enrich-async, --un-nesting, --all');
            process.exit(1);
        }
    }

    console.log(`🧪 Testing ${testAll ? 'all' : 'selected'} generated transforms...`);
    console.log(`📋 Testing transforms: ${transformsToTest.join(', ')}`);

    // Build test pattern for Jest
    let testPattern = '';
    if (!testAll) {
        // Create pattern to match transform-specific tests
        const patterns = transformsToTest.map(type => {
            switch(type) {
                case 'map_filter': return 'map.filter|mapFilter';
                case 'fan_out': return 'fan.out|fanOut';
                case 'enrich_async': return 'enrich.async|enrichAsync';
                case 'un_nesting': return 'un.nesting|unNesting';
                default: return type;
            }
        });
        testPattern = `--testNamePattern="(${patterns.join('|')})"`;
    }

    // Run Jest with the appropriate pattern
    const jestCommand = `npx jest ${testPattern}`;
    console.log(`🚀 Running: ${jestCommand}\n`);
    
    try {
        execSync(jestCommand, { stdio: 'inherit' });
    } catch (error) {
        process.exit(error.status || 1);
    }
}

main();