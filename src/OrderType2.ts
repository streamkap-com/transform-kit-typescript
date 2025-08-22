import { Customer } from "./Customer";

export interface OrderType2 {
    order_id: string; // 'express-oweijfiwjoefowijf'
    order_type: string;
    order_number: number;
    location_id: string;
    channel: 'rpos' | 'express';
    customer: Customer;
}