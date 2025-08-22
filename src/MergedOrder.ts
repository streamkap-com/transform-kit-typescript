import { Customer } from "./Customer";

export interface MergedOrder {
    version: '0.1.4';
    _id: string; // 'express-oweijfiwjoefowijf'
    order_number: number;
    location_id: string;
    order_type: string;
    channel: 'rpos' | 'express';
    customer: Customer;
    organization_id?: string; // Express does not utilize organization_id
    processed_at: string; // ISO timestamp when record was processed
    processed_time: string; // Human readable processing time
    // Examples of using npm dependencies in transforms:
    processing_id: string; // UUID generated with uuid library
    has_valid_customer: boolean; // Validation using lodash
    field_count: number; // Count using lodash utilities
}