# Streamkap TypeScript Transform Development Kit

TypeScript development environment for building Streamkap transforms with npm package support.

## What you get
- Use npm packages like moment.js, lodash, uuid in your transforms
- Full test suite (83 tests) to catch issues before deployment
- Self-contained output files with all dependencies bundled
- Support for all Streamkap transform types (map_filter, fan_out, enrich_async, un_nesting)

## Quick Start Requirements

**Important**: Always run `npm run build` before `npm test` - tests validate the generated output files.

**Prerequisites**: Node.js 16+, npm 8+

## Quick Start

```bash
# 1. Install all dependencies
npm install

# 2. CRITICAL: Build first (generates transform files)
npm run build

# 3. Verify everything works
npm test

# 4. Your transform files are ready to copy-paste!
ls -la transforms/
# Copy these .js files into Streamkap's Implementation tab
```

You should see generated JavaScript files in `transforms/` ready for Streamkap deployment.

## How to Use This Project

### 1. Customize Your Data Structures

Edit these TypeScript files to match your data:

```typescript
// src/OrderType1.ts - Your input data structure
export interface OrderType1 {
    _id: string;
    order_number: number;
    // Add your input fields here
}

// src/MergedOrder.ts - Your output data structure
export interface MergedOrder {
    _id: string;
    processed_at: string;
    // Add your output fields here
}

// src/Customer.ts - Customer data structure
export interface Customer {
    _id: string;
    name: string;
    // Add your customer fields
}
```

### 2. Implement Your Business Logic

```typescript
// src/OrderTransformer.ts - MAIN FILE: Your transform logic
export class OrderTransformer {
    transform(input: any): MergedOrder {
        // Your business logic here
        // Use moment.js, lodash, any npm dependencies
        const moment = require('moment');
        
        return {
            _id: input._id,
            processed_at: moment().toISOString(),
            // Your custom transformation logic
        };
    }
}
```

### 3. Add npm Dependencies

```bash
# Install any pure JavaScript libraries (no native extensions)
npm install moment lodash uuid
# Dependencies get bundled into generated files automatically
```

### 4. Build & Test

```bash
# IMPORTANT: Build first (tests depend on generated files)
npm run build

# Then run tests to ensure everything works
npm test
```

### 5. Deploy to Streamkap

1. **Create your transform** in Streamkap web interface
2. **Navigate to Implementation tab** 
3. **Copy entire contents** of your generated file:
   - For value transforms: `valueTransform.js`
   - For key transforms: `keyTransform.js`
   - For topic transforms: `topicTransform.js`
4. **Paste into Streamkap's code editor** (replaces the default JavaScript)
5. **Save and deploy** - your TypeScript code with all dependencies is now running!

**Pro Tip**: The generated files are completely self-contained with all npm dependencies bundled in.

## Generated Files Structure

```
transforms/
├── map-filter/
│   ├── value_transform.js
│   ├── key_transform.js
│   └── mapFilterTransform.js
├── fan-out/
│   ├── value_transform.js
│   ├── topic_transform.js
│   └── fanOutTransform.js
├── enrich-async/
│   ├── value_transform.js
│   └── enrichAsyncTransform.js
└── un-nesting/
    ├── value_transform.js
    └── unNestingTransform.js
```

Copy the complete contents of these files into Streamkap's Implementation tab.

## Project Structure

```
src/
├── OrderTransformer.ts              # Main business logic
├── OrderType1.ts                    # Input data structure
├── OrderType2.ts                    # Alternative input structure  
├── MergedOrder.ts                   # Output data structure
├── Customer.ts                      # Customer data structure
├── OrderTransformer.test.ts         # Core business logic tests
├── GeneratedTransforms.test.ts      # Tests for generated files
├── BuildProcess.test.ts             # Build process tests
└── index.ts                         # Entry point

build-multiple.js                    # Build system
package.json                         # Dependencies and scripts
transforms/                          # Generated output files
```

## What Each Generated File Contains

**Generated JavaScript files contain:**
- Your compiled TypeScript business logic
- Bundled npm dependencies with complete source included
- Shared utility functions
- Proper Streamkap function signatures
- Self-contained with no external dependencies needed


## Development workflow

```bash
# 1. Edit your business logic
vim src/OrderTransformer.ts

# 2. Add npm dependencies as needed
npm install moment axios uuid

# 3. Build and test
npm run build
npm test

# 4. Copy generated files to Streamkap and deploy
```

### Best practices
- Write tests first, then implement
- Commit TypeScript source files, not generated output
- Only use pure JavaScript libraries (no native bindings)
- Build → Test → Deploy cycle

## Example: Map/Filter Transform

Here's what gets generated for a map_filter transform:

```javascript
// transforms/map-filter/value_transform.js
function _streamkap_transform(valueObject, keyObject, topic, timestamp) {
    // Your OrderTransformer logic compiled to JavaScript
    // moment.js bundled and available
    // All utility functions included
    // Ready to paste into Streamkap
}
```

## Testing

Includes 83 tests covering:

- Core business logic (`OrderTransformer.test.ts`)
- Generated JavaScript files (`GeneratedTransforms.test.ts`)
- Build process validation (`BuildProcess.test.ts`)

Run tests: `npm test`

## Usage notes
- Build is fast (~2 seconds)
- Tests run in ~1.8 seconds
- You might see npm warnings about deprecated packages during install - these don't affect functionality
- Generated files are readable JavaScript if you need to debug

## Supported Transform Types

Generates code for JavaScript-based Streamkap transform types:
- **`map_filter`** - Transform and filter records
- **`fan_out`** - Route records to multiple topics  
- **`enrich_async`** - Async data enrichment
- **`un_nesting`** - Flatten nested objects

## Features

**Development:**
- TypeScript with full type checking
- npm ecosystem support (moment.js, lodash, etc.)
- Unit testing with Jest
- Standard development workflow

**Output:**
- All dependencies bundled into each file
- No external dependencies needed
- Proper function signatures for each transform type
- Organized by transform type

**Build:**
- Fast TypeScript compilation with esbuild
- Automatic dependency bundling
- Multiple output formats available

## Adding Dependencies

```bash
# Only pure JavaScript libraries (no native extensions)
npm install moment lodash uuid axios

# Dependencies automatically get bundled into generated files
npm run build
```

## Production Guidelines

### Dependency Requirements
**NOT Supported**: Native extensions, binaries, or Node.js-specific APIs  
**Fully Supported**: Pure JavaScript libraries (moment, lodash, axios, uuid, etc.)

### Deployment Architecture
**Self-Contained**: Each generated file includes ALL dependencies bundled (no external requires)  
**Copy-Paste Ready**: Files are designed for direct paste into Streamkap's code editor  
**Function Signatures**: Generated code follows Streamkap's exact convention requirements

### Security & Performance
- All dependencies are statically bundled
- Fast compilation with minimal bundle sizes
- Well-tested codebase

## Troubleshooting

### Common issues

**Tests failing?**
```bash
# Build first - tests validate generated files
npm run build
npm test -- --verbose
```

**Build errors?**
```bash
# Check for TypeScript or dependency issues
npm run build 2>&1 | grep -i error
npm install
```

**Streamkap deployment errors?**
- Copy complete file contents (including all bundled dependencies)
- Check Streamkap's error console for runtime issues
- Verify function signatures match expected format
- Test locally with `npm test` before deploying

**Need custom transform types?**
- Edit `build-multiple.js` to add/remove transform variants
- Update corresponding test files in `src/`
- Rebuild and test

### Documentation
- [Streamkap docs](https://docs.streamkap.com)
- This is a starter template - customize as needed