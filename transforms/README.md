# Generated Streamkap Transforms

This directory contains self-contained transform bundles for Streamkap.

Generated on: 2025-08-27T13:06:48.917Z

## Key Features

- **Self-contained**: Each transform file includes all dependencies (moment.js bundled)
- **Ready for Streamkap**: Upload directly to corresponding transform types
- **TypeScript generated**: Clean, type-safe transforms compiled from TypeScript
- **Individual & combined**: Both granular function files and combined transforms

## Usage Instructions

1. Select the appropriate transform file for your use case
2. Upload to Streamkap in the corresponding transform type
3. Configure input/output patterns and serialization
4. Deploy and validate your transform

## Transform Function Signatures

- `_streamkap_transform(valueObject, keyObject, topic, timestamp)` - Main transform
- `_streamkap_transform_key(valueObject, keyObject, topic, timestamp)` - Key transformation
- `_streamkap_transform_topic(valueObject, keyObject, topic, timestamp)` - Topic routing

All functions include comprehensive error handling and moment.js integration.
