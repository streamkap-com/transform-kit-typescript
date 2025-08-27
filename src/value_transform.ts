import { OrderTransformer } from "./OrderTransformer";

export function _streamkap_transform(valueObject: any, keyObject: any, topic: any, timestamp: any) {
    var transformer = new OrderTransformer();
    var transformedRecord = transformer.transform(valueObject);
    return transformedRecord;
}