import { Customer } from "./Customer";

export interface OrderType1 {
    _id: string; // 'express-oweijfiwjoefowijf'
    order_type: string;
    order_number: number;
    location_id: string;
    channel: 'rpos' | 'express';
    customer: Customer;
    organization_id?: string; // Express does not utilize organization_id
}