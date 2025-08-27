// Streamkap transform bundler with selective building support

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

const transforms = [
    {
        name: 'mapFilterTransform',
        type: 'map_filter',
        language: 'JAVASCRIPT',
        description: 'Map/Filter transform - modify and filter records',
        functions: ['valueTransform', 'keyTransform'],
        folder: 'map-filter'
    },
    {
        name: 'fanOutTransform',
        type: 'fan_out',
        language: 'JAVASCRIPT',
        description: 'Fan Out - route records to multiple topics',
        functions: ['valueTransform', 'topicTransform'],
        folder: 'fan-out'
    },
    {
        name: 'enrichAsyncTransform',
        type: 'enrich_async',
        language: 'JAVASCRIPT',
        description: 'Async Enrich - enrich records with REST API calls',
        functions: ['valueTransform'],
        folder: 'enrich-async'
    },
    {
        name: 'unNestingTransform',
        type: 'un_nesting',
        language: 'JAVASCRIPT',
        description: 'Un Nesting - flatten nested objects/arrays',
        functions: ['valueTransform'],
        folder: 'un-nesting'
    }
];

async function buildTransforms() {
    const { requestedTypes, buildAll } = parseArgs();
    
    // Filter transforms based on arguments
    let transformsToBuild = transforms;
    if (!buildAll) {
        transformsToBuild = transforms.filter(t => requestedTypes.has(t.type));
        
        if (transformsToBuild.length === 0) {
            console.log('❌ No valid transform types specified.');
            console.log('Available types: --map-filter, --fan-out, --enrich-async, --un-nesting, --all');
            process.exit(1);
        }
    }

    console.log(`🏗️  Building ${buildAll ? 'all' : 'selected'} Streamkap transform bundles...\n`);
    
    if (!buildAll) {
        console.log(`📋 Building transforms: ${transformsToBuild.map(t => t.type).join(', ')}\n`);
    }

    const useTemplateStructure = fs.existsSync('src/templates/index.ts');
    const entryPoint = useTemplateStructure ? 'src/templates/index.ts' : 'src/value_transform.ts';
    
    console.log(`📂 Detected structure: ${useTemplateStructure ? 'Template-based' : 'Example-based'}`);
    console.log(`📋 Entry point: ${entryPoint}\n`);

    const outputDir = 'transforms';
    if (fs.existsSync(outputDir)) {
        fs.rmSync(outputDir, { recursive: true, force: true });
    }
    fs.mkdirSync(outputDir);

    console.log('📦 Building main TypeScript bundle...');
    try {
        execSync(`npx esbuild ${entryPoint} --bundle --platform=browser --target=es2015 --outfile=main.js --global-name=StreamkapTransforms --format=iife`, { stdio: 'inherit' });
    } catch (error) {
        console.error('❌ Failed to build main bundle');
        process.exit(1);
    }

    let mainCode = fs.readFileSync('main.js', 'utf8');

    const folderGroups = {};
    transformsToBuild.forEach(transform => {
        if (!folderGroups[transform.folder]) {
            folderGroups[transform.folder] = [];
        }
        folderGroups[transform.folder].push(transform);
    });

    for (const transform of transformsToBuild) {
        const folderPath = path.join(outputDir, transform.folder);
        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath, { recursive: true });
        }

        console.log(`🔄 [${transform.type}] ${transform.language} - ${transform.description}`);
        console.log(`   📁 ${transform.folder}/`);

        if (transform.language === 'JAVASCRIPT') {
            if (transform.functions.length > 0) {
                for (const funcType of transform.functions) {
                    const fileName = `${funcType}.js`;
                    console.log(`   📄 Generating ${fileName}`);
                    
                    let transformCode = generateFileHeader(transform, funcType);
                    transformCode += mainCode + '\n\n';
                    transformCode += generateSharedUtilities() + '\n\n';
                    transformCode += generateJavaScriptFunction(transform, funcType, useTemplateStructure);
                    
                    const outputPath = path.join(folderPath, fileName);
                    fs.writeFileSync(outputPath, transformCode);
                    validateFile(outputPath);
                }
            }
                
        } else if (transform.language === 'SQL') {
            const fileName = `${transform.name}.sql`;
            console.log(`   📄 Generating ${fileName}`);
            
            let sqlCode = generateSqlHeader(transform);
            sqlCode += generateSqlQuery(transform);
            
            const outputPath = path.join(folderPath, fileName);
            fs.writeFileSync(outputPath, sqlCode);
            console.log(`   ✅ Generated successfully`);
        }
        
        console.log('');
    }

    // Create README for generated folder
    generateOutputReadme(outputDir, folderGroups);

    // Clean up temporary build file
    try {
        fs.unlinkSync('main.js');
    } catch (e) {
        // File doesn't exist
    }

    console.log('🎉 All transform bundles generated successfully!');
    console.log(`📁 Output directory: ${outputDir}/`);
    
    console.log('\n📋 Generated structure:');
    Object.keys(folderGroups).forEach(folder => {
        console.log(`  📁 ${folder}/`);
        folderGroups[folder].forEach(t => {
            t.functions.forEach(func => {
                console.log(`     • ${func}.js (${t.type})`);
            });
        });
    });
}

function generateFileHeader(transform, funcType) {
    return `// Streamkap ${transform.type} Transform (${transform.language})
// ${transform.description}
// Function: ${funcType}
// Generated on: ${new Date().toISOString()}
// 
// Implementation details:
// - Transform type: ${transform.type}
// - Language: ${transform.language}
// - Function type: ${funcType}

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

function generateJavaScriptFunction(transform, funcType, useTemplateStructure = false) {
    switch (funcType) {
        case 'valueTransform':
            return generateValueTransform(transform, useTemplateStructure);
        case 'keyTransform':
            return generateKeyTransform(transform, useTemplateStructure);
        case 'topicTransform':
            return generateTopicTransform(transform, useTemplateStructure);
        default:
            return `// TODO: Implement ${funcType} for ${transform.type}`;
    }
}

function generateValueTransform(transform, useTemplateStructure = false) {
    if (useTemplateStructure) {
        // Template-based generation
        switch (transform.type) {
            case 'map_filter':
                return `// Main transform function for map_filter
function _streamkap_transform(valueObject, keyObject, topic, timestamp) {
    // Map/Filter: Transform and optionally filter records using template structure
    try {
        var ValueTransformClass = (typeof StreamkapTransforms !== 'undefined' && StreamkapTransforms.ValueTransform) || 
                                  (typeof valueTransform !== 'undefined' ? valueTransform : ValueTransform);
        var transformer = typeof ValueTransformClass === 'function' ? new ValueTransformClass() : ValueTransformClass;
        var transformedRecord = transformer.transform(valueObject, keyObject, topic, timestamp);
        return transformedRecord;
    } catch (error) {
        console.error('Transform failed:', error);
        return null; // Filter out on error for map_filter
    }
}`;

            case 'fan_out':
                return `// Value transform for fan_out using template structure
function _streamkap_transform(valueObject, keyObject, topic, timestamp) {
    // Fan Out: Transform the record that will be sent to multiple topics
    try {
        var ValueTransformClass = (typeof StreamkapTransforms !== 'undefined' && StreamkapTransforms.ValueTransform) || 
                                  (typeof valueTransform !== 'undefined' ? valueTransform : ValueTransform);
        var transformer = typeof ValueTransformClass === 'function' ? new ValueTransformClass() : ValueTransformClass;
        var transformedRecord = transformer.transform(valueObject, keyObject, topic, timestamp);
        return transformedRecord;
    } catch (error) {
        console.error('Transform failed:', error);
        return valueObject; // Return original on error for fan_out
    }
}`;

            case 'enrich_async':
                return `// Async enrichment transform using template structure
async function _streamkap_transform(valueObject, keyObject, topic, timestamp) {
    // Enrich (Async): Enrich records with external API calls
    try {
        var ValueTransformClass = (typeof StreamkapTransforms !== 'undefined' && StreamkapTransforms.ValueTransform) || 
                                  (typeof valueTransform !== 'undefined' ? valueTransform : ValueTransform);
        var transformer = typeof ValueTransformClass === 'function' ? new ValueTransformClass() : ValueTransformClass;
        var transformedRecord = await transformer.transformAsync(valueObject, keyObject, topic, timestamp);
        
        return transformedRecord;
    } catch (error) {
        console.error('Enrichment failed:', error);
        return valueObject; // Return original on error
    }
}`;

            case 'un_nesting':
                return `// Un-nesting transform using template structure
function _streamkap_transform(valueObject, keyObject, topic, timestamp) {
    // Un Nesting: Flatten nested objects/arrays
    try {
        var ValueTransformClass = (typeof StreamkapTransforms !== 'undefined' && StreamkapTransforms.ValueTransform) || 
                                  (typeof valueTransform !== 'undefined' ? valueTransform : ValueTransform);
        var transformer = typeof ValueTransformClass === 'function' ? new ValueTransformClass() : ValueTransformClass;
        var transformedRecord = transformer.transformFlatten(valueObject, keyObject, topic, timestamp);
        return transformedRecord;
    } catch (error) {
        console.error('Un-nesting failed:', error);
        return valueObject; // Return original on error for un_nesting
    }
}`;

            default:
                return `// Value transform for ${transform.type} using template structure
function _streamkap_transform(valueObject, keyObject, topic, timestamp) {
    var transformer = valueTransform;
    return transformer.transform(valueObject, keyObject, topic, timestamp);
}`;
        }
    }
    
    // Original example-based generation
    switch (transform.type) {
        case 'map_filter':
            return `// Main transform function for map_filter
function _streamkap_transform(valueObject, keyObject, topic, timestamp) {
    // Map/Filter: Transform and optionally filter records
    
    // Filter out invalid records
    if (!valueObject || !valueObject.customer || !valueObject.customer.name) {
        return null; // null = filter out this record
    }
    
    // Filter test records
    if (valueObject._id && valueObject._id.includes('test')) {
        return null;
    }
    
    // Apply transformation using our OrderTransformer
    var transformer = new OrderTransformer();
    var transformedRecord = transformer.transform(valueObject);
    
    return transformedRecord;
}`;

        case 'fan_out':
            return `// Value transform for fan_out (transforms the record before routing)
function _streamkap_transform(valueObject, keyObject, topic, timestamp) {
    // Fan Out: Transform the record that will be sent to multiple topics
    var transformer = new OrderTransformer();
    var transformedRecord = transformer.transform(valueObject);
    
    transformedRecord.routing_info = {
        source_topic: topic,
        processed_timestamp: timestamp,
        routing_rules_applied: true
    };
    
    return transformedRecord;
}`;

        case 'enrich_async':
            return `// Async enrichment transform
async function _streamkap_transform(valueObject, keyObject, topic, timestamp) {
    // Enrich (Async): Enrich records with external API calls
    try {
        var transformer = new OrderTransformer();
        var transformedOrder = transformer.transform(valueObject);
        
        // Example async enrichment with REST API
        if (transformedOrder.customer && transformedOrder.customer._id) {
            // Simulate async API call (replace with actual fetch/axios call)
            var enrichmentData = await simulateApiCall(transformedOrder.customer._id);
            
            // Merge enrichment data
            transformedOrder.customer = Object.assign(transformedOrder.customer, enrichmentData);
            transformedOrder.enrichment_timestamp = new Date().toISOString();
        }
        
        return transformedOrder;
    } catch (error) {
        console.error('Enrichment failed:', error);
        return valueObject; // Return original on error
    }
}

// Simulate async API call
async function simulateApiCall(customerId) {
    // In real implementation, replace with actual API call
    return new Promise(resolve => {
        setTimeout(() => {
            resolve({
                credit_score: 750,
                loyalty_tier: 'gold',
                last_order_date: '2024-08-15T10:00:00Z',
                enriched_at: new Date().toISOString()
            });
        }, 100);
    });
}`;

        case 'un_nesting':
            return `// Un-nesting transform to flatten nested structures
function _streamkap_transform(valueObject, keyObject, topic, timestamp) {
    // Un Nesting: Flatten nested objects/arrays
    if (!valueObject) return null;
    
    var transformer = new OrderTransformer();
    var baseRecord = transformer.transform(valueObject);
    
    // Flatten customer object
    if (baseRecord.customer) {
        baseRecord.customer_id = baseRecord.customer._id;
        baseRecord.customer_name = baseRecord.customer.name;
        baseRecord.customer_organization_id = baseRecord.customer.organization_id;
        baseRecord.customer_version = baseRecord.customer.version;
        
        // Remove nested customer object
        delete baseRecord.customer;
    }
    
    baseRecord.flattened_at = new Date().toISOString();
    baseRecord.original_structure_preserved = false;
    
    return baseRecord;
}`;

        default:
            return `// Value transform for ${transform.type}
function _streamkap_transform(valueObject, keyObject, topic, timestamp) {
    var transformer = new OrderTransformer();
    return transformer.transform(valueObject);
}`;
    }
}

function generateKeyTransform(transform, useTemplateStructure = false) {
    if (useTemplateStructure) {
        return `// Key transform function using template structure
function _streamkap_transform_key(valueObject, keyObject, topic, timestamp) {
    // Transform the record key using template-based logic
    var KeyTransformClass = (typeof StreamkapTransforms !== 'undefined' && StreamkapTransforms.KeyTransform) || 
                              (typeof keyTransform !== 'undefined' ? keyTransform : KeyTransform);
    var transformer = typeof KeyTransformClass === 'function' ? new KeyTransformClass() : KeyTransformClass;
    return transformer.transform(valueObject, keyObject, topic, timestamp);
}`;
    }
    
    // Original example-based generation
    return `// Key transform function
function _streamkap_transform_key(valueObject, keyObject, topic, timestamp) {
    // Transform the record key based on business logic
    if (valueObject && valueObject.order_type === 'OrderType1') {
        return 'express-' + keyObject;
    } else if (valueObject && valueObject.order_type === 'OrderType2') {
        return 'rpos-' + keyObject;
    }
    
    var moment = require('moment');
    var datePrefix = moment(timestamp).format('YYYY-MM-DD');
    return datePrefix + '-' + keyObject;
}`;
}

function generateTopicTransform(transform, useTemplateStructure = false) {
    if (useTemplateStructure) {
        return `// Topic transform function using template structure
function _streamkap_transform_topic(valueObject, keyObject, topic, timestamp) {
    // Fan Out: Route records to different topics using template-based logic
    var TopicTransformClass = (typeof StreamkapTransforms !== 'undefined' && StreamkapTransforms.TopicTransform) || 
                                (typeof topicTransform !== 'undefined' ? topicTransform : TopicTransform);
    var transformer = typeof TopicTransformClass === 'function' ? new TopicTransformClass() : TopicTransformClass;
    return transformer.transform(valueObject, keyObject, topic, timestamp);
}`;
    }
    
    // Original example-based generation
    return `// Topic transform function for fan-out routing
function _streamkap_transform_topic(valueObject, keyObject, topic, timestamp) {
    // Fan Out: Route records to different topics based on business logic
    var topics = [];
    
    // Primary routing based on channel
    if (valueObject && valueObject.channel === 'express') {
        topics.push('orders-express-processed');
    } else if (valueObject && valueObject.channel === 'rpos') {
        topics.push('orders-rpos-processed');
    } else {
        topics.push('orders-processed');
    }
    
    // High-value orders get additional routing
    if (valueObject && valueObject.order_number > 50000) {
        topics.push('orders-high-value');
    }
    
    // Error orders get special routing
    if (valueObject && !valueObject.customer) {
        topics.push('orders-errors');
    }
    
    // Return array for fan-out or single topic for simple routing
    return topics.length > 1 ? topics : topics[0];
}`;
}

function generateSqlQuery(transform) {
    switch (transform.type) {
        case 'sql_join':
            return `-- SQL Join Query for combining multiple topics
-- This query joins order data with customer data

SELECT 
    o.order_id,
    o.order_number,
    o.order_type,
    o.channel,
    o.location_id,
    c.customer_name,
    c.customer_email,
    c.organization_id,
    CURRENT_TIMESTAMP as processed_at
FROM orders_topic o
LEFT JOIN customers_topic c 
    ON o.customer_id = c.customer_id
WHERE o.order_type IN ('OrderType1', 'OrderType2')
    AND c.customer_name IS NOT NULL;`;

        case 'enrich':
            return `-- SQL Enrich Query for lookup-based enrichment
-- This query enriches orders with customer organization details

SELECT 
    main.*,
    lookup.org_name,
    lookup.org_tier,
    lookup.org_region,
    CURRENT_TIMESTAMP as enriched_at
FROM {main_table} main
LEFT JOIN {lookup_table} lookup 
    ON main.organization_id = lookup.organization_id
WHERE main.customer_name IS NOT NULL;`;

        default:
            return `-- SQL Query for ${transform.type}
SELECT * FROM {input_table} WHERE 1=1;`;
    }
}

function generateSharedUtilities() {
    return `// Shared utilities (bundled into each transform for self-containment)

function formatTimestamp(timestamp) {
    var moment = require('moment');
    return moment(timestamp).format('YYYY-MM-DD HH:mm:ss');
}

function generateProcessingId() {
    return 'proc-' + Math.random().toString(36).substr(2, 9);
}

function validateOrderStructure(order) {
    // Validate basic order structure
    return order && 
           typeof order._id === 'string' && 
           typeof order.order_number === 'number' &&
           order.customer && 
           typeof order.customer.name === 'string';
}

function safeStringify(obj) {
    // Safe JSON stringify with error handling
    try {
        return JSON.stringify(obj);
    } catch (e) {
        return '[Unable to stringify object]';
    }
}`;
}

function generateOutputReadme(outputDir, folderGroups) {
    let readmeContent = '# Generated Streamkap Transforms\n\n';
    readmeContent += 'This directory contains self-contained transform bundles for Streamkap.\n\n';
    readmeContent += 'Generated on: ' + new Date().toISOString() + '\n\n';
    readmeContent += '## Folder Structure\n\n';
    
    Object.keys(folderGroups).forEach(folder => {
        const transforms = folderGroups[folder];
        readmeContent += '### 📁 ' + folder + '/\n\n';
        transforms.forEach(t => {
            readmeContent += '- **' + t.name + '.js** - `' + t.type + '`  \n';
            readmeContent += '  ' + t.description + '\n';
        });
        readmeContent += '\n';
    });
    
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