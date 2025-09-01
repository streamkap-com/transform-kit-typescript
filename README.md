# Streamkap TypeScript Transform Development Kit

**Build Streamkap transforms with TypeScript + npm packages** → Get **self-contained JavaScript files** ready for deployment.

## 🏪 **Example Use Case: Data Unification and Cleaning**
Example of **cleaning and unifying multiple semi-structured data entities into a single common model** where:
- **Different data formats** (`OrderType1` vs `OrderType2`) need to be unified into `MergedOrder`  
- **Data flows from multiple sources** with varying structures and field names
- **Records are enriched** and validated across different input sources
- **Processing metadata is added** (timestamps, UUIDs, validation flags) using npm libraries

## 📋 Prerequisites
- Node.js 16+ 
- Basic TypeScript knowledge
- [Streamkap account](https://app.streamkap.com) for deployment

## ✨ What You Get

- **npm packages** (moment.js, lodash, uuid) bundled automatically  
- **Self-contained outputs** - no external dependencies needed
- **All transform types** - map_filter, fan_out, enrich_async, un_nesting
- **Complete test suite** to catch issues before deployment
- **Two integration options** - new project or existing codebase

## 🚀 Quick Start

**For New Project**: Clone this repo and customize
```bash
git clone https://github.com/streamkap-com/transform-kit-typescript.git && cd transform-kit-typescript
npm install && npm test  # Builds all transforms and runs all tests
```

**For Existing Project**: [See integration guide below](#option-2-existing-typescript-project)

📋 **Common Info**: [JSON Record Testing](#-json-record-testing-with-streamkap-topics-page) | [Deployment](#deploy-to-streamkap) | [File Selection](#which-file-to-use) | [Troubleshooting](#troubleshooting)

## 📋 JSON Record Testing with Streamkap Topics Page

Test with real data from your Streamkap Topics page. Copy complete records as JSON and use them directly in unit tests.

### Quick Start: Copy Real Records for Testing

1. **Streamkap Web App** → **Topics page** → Go into a Topic → open a topic message → **"Copy Record as JSON"**
2. **Open test template**: `src/RealProductionData.test.ts` 
3. **Replace mockRecord** with your copied JSON
4. **Update field names** in tests to match your real data structure
5. **Run**: `npx jest src/RealProductionData.test.ts`

**All tests pass by default with mock data. After pasting real data, tests will validate your actual Streamkap records.**

### Test Templates Available

- `src/RealProductionData.test.ts` - Template for real Streamkap data (replace mockRecord with your JSON)
- `src/JSONRecord.test.ts` - Complete examples using OrderTransformer 
- `src/JSONRecordHelper.test.ts` - Helper utility tests

📖 **See examples in test files for complete patterns and usage.**

## 🎯 Choose Your Path

### 🆕 **Option 1: New Project** (Start from scratch)
Use this entire repository as your development environment

### 🔄 **Option 2: Existing Project** (Add to your codebase)  
Copy our bundler into your existing TypeScript project

---

# 🆕 Option 1: Starting from Scratch

## How to Use This Project (Complete Example)

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
# Build all transforms
npm run build

# OR build specific transform types
npm run build:map-filter     # Only map/filter transforms
npm run build:fan-out        # Only fan-out transforms  
npm run build:enrich-async   # Only async enrichment transforms
npm run build:un-nesting     # Only un-nesting transforms

# You can also use the build script directly
node build-multiple.js --map-filter --fan-out  # Build multiple specific types
node build-multiple.js --all                   # Build all transforms

# Run tests
npm test                     # Build all transforms, then test all
npm test -- --map-filter     # Test only map/filter (uses existing builds)
npm test -- --fan-out        # Test only fan-out (uses existing builds)
npm test -- --enrich-async   # Test only async enrichment (uses existing builds)
npm test -- --un-nesting     # Test only un-nesting (uses existing builds)

# OR use specific test commands (builds first)
npm run test:map-filter      # Build map/filter, then test it
npm run test:fan-out         # Build fan-out, then test it
npm run test:enrich-async    # Build enrich-async, then test it  
npm run test:un-nesting      # Build un-nesting, then test it
```

### 5. Deploy to Streamkap

1. **Create your transform** in Streamkap Web App
2. **Navigate to Implementation tab** 
3. **Copy entire contents** of your generated file:
   - **Always required**: `valueTransform.js` 
   - **Optional**: `keyTransform.js` (leave blank in Streamkap if no key changes needed)
   - **Optional**: `topicTransform.js` (leave blank in Streamkap if no topic changes needed)
4. **Paste into Streamkap's code editor** (replaces the default JavaScript)
5. **Save and deploy** - your TypeScript code with all dependencies is now running!

📋 **Next Steps**: See [Common Reference](#common-reference) below for deployment instructions and file selection guide.


---

# Option 2: Existing TypeScript Project

Add Streamkap bundler to your existing codebase in 3 steps:

## 1. Copy Files
```bash
# Copy bundler and transform files
cp build-multiple.js your-project/
cp test-selective.js your-project/
mkdir -p your-project/src/
cp src/value_transform.ts your-project/src/
cp src/key_transform.ts your-project/src/
cp src/topic_transform.ts your-project/src/
# Optionally copy the example interfaces and transformer as reference
cp src/OrderTransformer.ts your-project/src/ 
cp src/Customer.ts your-project/src/
cp src/OrderType1.ts your-project/src/
cp src/OrderType2.ts your-project/src/
cp src/MergedOrder.ts your-project/src/
```

## 2. Update package.json
```json
{
  "scripts": {
    "build": "node build-multiple.js --all",
    "build:map-filter": "node build-multiple.js --map-filter",
    "build:fan-out": "node build-multiple.js --fan-out",
    "build:enrich-async": "node build-multiple.js --enrich-async",
    "build:un-nesting": "node build-multiple.js --un-nesting",
    "test": "node test-selective.js",
    "test:map-filter": "npm run build:map-filter && node test-selective.js --map-filter"
  },
  "dependencies": {
    "lodash": "^4.17.21",
    "moment": "^2.30.1", 
    "uuid": "^11.1.0"
  },
  "devDependencies": {
    "@types/lodash": "^4.17.20",
    "@types/moment": "^2.11.29",
    "@types/uuid": "^10.0.0",
    "esbuild": "^0.8.27",
    "typescript": "^4.0.0"
  }
}
```

## 3. Connect Your Logic

Create your own OrderTransformer or update the existing one:

```typescript
// src/YourTransformer.ts
import { YourService } from './your-existing-logic';

export class YourTransformer {
    private yourService = new YourService();
    
    public transform(input: any): any {
        // Use your existing business logic
        return this.yourService.processData(input);
    }
}
```

Then update the transform files to use your transformer:

```typescript
// src/value_transform.ts
import { YourTransformer } from "./YourTransformer";

export function _streamkap_transform(valueObject: any, keyObject: any, topic: any, timestamp: any) {
    var transformer = new YourTransformer();
    var transformedRecord = transformer.transform(valueObject);
    return transformedRecord;
}
```

## 4. Build & Deploy
```bash
# Install dependencies
npm install

# Build all transforms
npm run build

# OR build specific transforms only
npm run build:map-filter                            # Build specific type
node build-multiple.js --map-filter --enrich-async  # Build multiple types
node build-multiple.js --all                        # Build all transforms

# Check generated files
ls transforms/  # Copy these .js files to Streamkap
```

**That's it!** Your transforms are generated in `transforms/` folder. 

📋 **Next Steps**: See [Deploy to Streamkap](#deploy-to-streamkap) and [Which File to Use](#which-file-to-use) below.

---

---

# 🔧 Option 3: Custom Setup

For minimal changes, use just the bundler:

```bash
# Copy bundler only
cp build-multiple.js your-project/

# Add dependencies + script to package.json
npm install lodash moment uuid esbuild
```

Write transforms directly using your existing services:
```typescript
// src/my-transform.ts  
import { MyService } from './services/MyService';

const service = new MyService();

function _streamkap_transform(valueObject: any, keyObject: any, topic: string, timestamp: number) {
    return service.processData(valueObject);
}

export { _streamkap_transform };
```

Build with esbuild directly:
```bash
npx esbuild src/my-transform.ts --bundle --outfile=my-transform.js
```

## When to Use Each Option

| Use Case | Recommended Option |
|----------|-------------------|
| **New project** | Option 1 (from scratch) |
| **Existing project** | Option 2 (templates) |  
| **Minimal setup** | Option 3 (custom) |

---

# Common Reference

## Which File to Use?

| Transform Type | File to Copy | Purpose |
|----------------|--------------|---------|
| **map_filter** | `valueTransform.js` (**required**) | Transform and filter records |
|                | `keyTransform.js` (*optional*) | Leave blank in Streamkap if no key changes needed |
| **fan_out** | `valueTransform.js` (**required**) | Transform records for routing |
|             | `topicTransform.js` (*optional*) | Leave blank in Streamkap if no topic changes needed |
| **enrich_async** | `valueTransform.js` (**required**) | Enrich with external APIs |
| **un_nesting** | `valueTransform.js` (**required**) | Flatten nested objects |

💡 **Key Points**: 
- **`valueTransform.js`** is **always required**
- **`keyTransform.js`** and **`topicTransform.js`** are **optional** - leave blank in Streamkap if not needed

## 📁 Generated Files Structure

```
transforms/
├── map-filter/
│   ├── valueTransform.js
│   └── keyTransform.js
├── fan-out/
│   ├── valueTransform.js
│   └── topicTransform.js
├── enrich-async/
│   └── valueTransform.js
└── un-nesting/
    └── valueTransform.js
```

Each file is **completely self-contained** with all npm dependencies bundled inside.

## Deploy to Streamkap

1. **Create your transform** in Streamkap Web App
2. **Navigate to Implementation tab** 
3. **Copy entire contents** of your generated file (see table above)
4. **Paste into Streamkap's code editor** (replaces the default JavaScript)
5. **Save and deploy** - your TypeScript code with all dependencies is now running!

**Important**: Only paste the transforms you actually need - see [Which File to Use](#which-file-to-use) table above for details.

## 🛠️ Production Guidelines

### Dependency Requirements
**✅ Fully Supported**: Pure JavaScript libraries (moment, lodash, uuid, etc.)  
**❌ NOT Supported**: Native extensions, binaries, or Node.js-specific APIs

### Architecture
- **Self-Contained**: Each generated file includes ALL dependencies bundled
- **Copy-Paste Ready**: Files are designed for direct paste into Streamkap's code editor
- **Function Signatures**: Generated code follows Streamkap's exact convention requirements

## Troubleshooting

**Tests failing?**
```bash
npm run build  # Build first - tests validate generated files
npm test -- --verbose
```

**Build errors?**
```bash
npm install
npm run build 2>&1 | grep -i error
```

**Only need specific transforms?**
```bash
# Build individual transform types for faster development
npm run build:map-filter      # Only builds map/filter transforms
npm run test:enrich-async     # Builds and tests async enrichment

# Test without building (uses existing builds)
npm test -- --map-filter     # Test only map/filter transforms
npm test -- --fan-out --un-nesting  # Test multiple specific types

# Build multiple specific types
node build-multiple.js --fan-out --un-nesting

# Available types: --map-filter, --fan-out, --enrich-async, --un-nesting, --all
```

**Streamkap deployment errors?**
- Copy complete file contents (including all bundled dependencies)
- Check Streamkap's error console for runtime issues
- Test locally with `npm test` before deploying

**Dependencies not working?**
- Only use pure JavaScript libraries (no native extensions)
- Check if library is compatible with browser environment

## 📚 Transform Types Supported

- **`map_filter`** - Transform and filter records
- **`fan_out`** - Route records to multiple topics  
- **`enrich_async`** - Async data enrichment
- **`un_nesting`** - Flatten nested objects

---

# 📂 Project File Structure

## ✅ Your Files (Safe Zone)
```
src/
├── *.test.ts                    # 👈 CREATE YOUR TEST FILES HERE
├── JSONRecordHelper.ts          # ✅ Helper utilities (provided)
├── RealProductionData.test.ts   # ✅ Real data example (provided)  
├── JSONRecord.test.ts           # ✅ Complete examples (provided)
├── OrderTransformer.ts          # ✅ Your business logic
├── OrderType1.ts                # ✅ Your data interfaces
├── MergedOrder.ts               # ✅ Your data interfaces
└── templates/                   # ✅ Transform templates
    ├── valueTransform.ts
    ├── keyTransform.ts
    └── commonTransform.ts
```

## ❌ Generated Files (Clean Zone)
```
transforms/                      # ⚠️ GETS CLEANED - DON'T PUT FILES HERE
├── map-filter/
│   ├── valueTransform.js        # 🤖 Generated by esbuild
│   └── keyTransform.js          # 🤖 Generated by esbuild
├── fan-out/                     # 🤖 Generated by esbuild
├── enrich-async/                # 🤖 Generated by esbuild
└── un-nesting/                  # 🤖 Generated by esbuild
```

> 💡 **Rule**: Create test files in `/src/`, generated bundles go in `/transforms/` (auto-cleaned)

---

## 🧪 Advanced Testing Patterns

```typescript
// Multiple records from one real record
const batch = JSONRecordHelper.generateRecordSequence(realRecord, 10);

// Schema validation
const validation = JSONRecordHelper.validateSchema(record, ['_id', 'order_type']);

// Performance testing
const results = largeBatch.map(r => transformer.transform(r.value));
```

**See `src/JSONRecord.test.ts` and `src/RealProductionData.test.ts` for complete examples.**

---
- [Streamkap docs](https://docs.streamkap.com)
- This is a starter template - customize as needed