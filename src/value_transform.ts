import { OrderTransformer } from "./OrderTransformer";

export function _streamkap_transform(valueObject: any, keyObject: any, topic: any, timestamp: any) {
    // Optional: Add filtering logic here if needed
    // Example: return null to filter out records
    
    var transformer = new OrderTransformer();
    var transformedRecord = transformer.transform(valueObject);
    return transformedRecord;
}