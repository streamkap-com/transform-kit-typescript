// index.ts - Entry point for template-based transforms
// This file exports the main transform classes that will be bundled by esbuild

// Import all transform classes
import { CommonTransform } from './commonTransform';
import { ValueTransform } from './valueTransform';
import { KeyTransform } from './keyTransform';
import { TopicTransform } from './topicTransform';
import { ValueSchemaTransform } from './valueSchemaTransform';
import { KeySchemaTransform } from './keySchemaTransform';

// Export all classes for bundling
export {
    CommonTransform,
    ValueTransform,
    KeyTransform,
    TopicTransform,
    ValueSchemaTransform,
    KeySchemaTransform
};

// For convenience, create instances that can be used directly in generated code
export const commonTransform = new CommonTransform();
export const valueTransform = new ValueTransform();
export const keyTransform = new KeyTransform();
export const topicTransform = new TopicTransform();
export const valueSchemaTransform = new ValueSchemaTransform();
export const keySchemaTransform = new KeySchemaTransform();

// Export helper function to initialize all transforms
export function initializeTransforms() {
    return {
        common: commonTransform,
        value: valueTransform,
        key: keyTransform,
        topic: topicTransform,
        valueSchema: valueSchemaTransform,
        keySchema: keySchemaTransform
    };
}