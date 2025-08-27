# Generated Streamkap Transforms

These are Self-contained JavaScript files ready for deployment to Streamkap.

## Files Structure

- **map-filter/**: Transform and filter records
  - `valueTransform.js` - Main transform logic
  - `keyTransform.js` - Key transformation

- **fan-out/**: Route records to multiple topics
  - `valueTransform.js` - Value transformation for routing
  - `topicTransform.js` - Topic routing logic

- **enrich-async/**: Async enrichment transforms
  - `valueTransform.js` - Async enrichment logic

- **un-nesting/**: Flatten nested structures  
  - `valueTransform.js` - Flattening transform logic

## Usage

Copy the entire contents of the relevant .js file and paste it into your Streamkap transform implementation tab.

Generated on: 2025-08-27T14:50:33.213Z
