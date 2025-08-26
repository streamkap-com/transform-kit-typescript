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
npm install && npm run build && npm test
```

**For Existing Project**: [See integration guide below](#option-2-existing-typescript-project)

📋 **Common Info**: [Deployment](#deploy-to-streamkap) | [File Selection](#which-file-to-use) | [Troubleshooting](#troubleshooting)

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
# IMPORTANT: Build first (tests depend on generated files)
npm run build

# Then run tests to ensure everything works
npm test
```

### 5. Deploy to Streamkap

1. **Create your transform** in Streamkap Web App
2. **Navigate to Implementation tab** 
3. **Copy entire contents** of your generated file:
   - For value transforms: `value_transform.js`
   - For key transforms: `key_transform.js`
   - For topic transforms: `topic_transform.js`
4. **Paste into Streamkap's code editor** (replaces the default JavaScript)
5. **Save and deploy** - your TypeScript code with all dependencies is now running!

**Pro Tip**: The generated files are completely self-contained with all npm dependencies bundled in.

📋 **Next Steps**: See [Common Reference](#common-reference) below for deployment instructions and file selection guide.


---

# 🔄 Option 2: Existing TypeScript Project

Add Streamkap bundler to your existing codebase in 3 steps:

## 1. Copy Files
```bash
# Copy bundler and templates
cp build-multiple.js your-project/
mkdir -p your-project/src/templates/
cp src/templates/*.ts your-project/src/templates/
```

## 2. Update package.json
```json
{
  "scripts": {
    "bundle:streamkap": "node build-multiple.js"
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

Edit the template files to use your existing business logic:

```typescript
// src/templates/commonTransform.ts
import { YourService } from '../your-existing-logic';

export class CommonTransform {
    private yourService = new YourService();
    
    public transformRecord(input: any): any {
        // Use your existing business logic
        return this.yourService.processData(input);
    }
}
```

## 4. Build & Deploy
```bash
npm install && npm run bundle:streamkap
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

# 📋 Common Reference

## 🤔 Which File to Use?

| Transform Type | File to Copy | Purpose |
|----------------|--------------|---------|
| **map_filter** | `value_transform.js` | Transform and filter records |
| **fan_out** | `value_transform.js` + `topic_transform.js` | Route to multiple topics |
| **enrich_async** | `value_transform.js` | Enrich with external APIs |
| **un_nesting** | `value_transform.js` | Flatten nested objects |

💡 **Most users need**: `value_transform.js` (handles your main business logic)

## 📁 Generated Files Structure

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

Each file is **completely self-contained** with all npm dependencies bundled inside.

## 🚀 Deploy to Streamkap

1. **Create your transform** in Streamkap Web App
2. **Navigate to Implementation tab** 
3. **Copy entire contents** of your generated file (see table above)
4. **Paste into Streamkap's code editor** (replaces the default JavaScript)
5. **Save and deploy** - your TypeScript code with all dependencies is now running!

## 🛠️ Production Guidelines

### Dependency Requirements
**✅ Fully Supported**: Pure JavaScript libraries (moment, lodash, uuid, etc.)  
**❌ NOT Supported**: Native extensions, binaries, or Node.js-specific APIs

### Architecture
- **Self-Contained**: Each generated file includes ALL dependencies bundled
- **Copy-Paste Ready**: Files are designed for direct paste into Streamkap's code editor
- **Function Signatures**: Generated code follows Streamkap's exact convention requirements

## 🔧 Troubleshooting

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

### Documentation
- [Streamkap docs](https://docs.streamkap.com)
- This is a starter template - customize as needed