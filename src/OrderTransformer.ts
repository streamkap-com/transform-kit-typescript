import { MergedOrder } from "./MergedOrder";
import { OrderType1 } from "./OrderType1";
import { OrderType2 } from "./OrderType2";
import moment from "moment";
import _ from "lodash";
import { v4 as uuidv4 } from "uuid";

export class OrderTransformer {
    public transform(inputOrder: OrderType1 | OrderType2): MergedOrder {
        if (inputOrder.order_type == 'OrderType1') {
            return this.transformOrderType1(inputOrder as OrderType1);
        }
        return this.transformOrderType2(inputOrder as OrderType2);

    }

    private transformOrderType1(inputOrder: OrderType1): MergedOrder {
        const now = moment();
        
        // Example using lodash for data manipulation
        const cleanedOrder = _.omitBy(inputOrder, _.isUndefined);
        const hasValidCustomer = _.has(cleanedOrder, 'customer.name') && !_.isEmpty(cleanedOrder.customer.name);
        
        // Example using uuid for unique identifiers
        const processingId = uuidv4();
        
        return {
            version: '0.1.4',
            _id: inputOrder._id,
            order_number: inputOrder.order_number,
            location_id: inputOrder.location_id,
            order_type: inputOrder.order_type,
            channel: inputOrder.channel,
            customer: inputOrder.customer,
            organization_id: inputOrder.organization_id,
            processed_at: now.toISOString(),
            processed_time: now.format('YYYY-MM-DD HH:mm:ss'),
            // Examples of using npm dependencies:
            processing_id: processingId, // uuid generated
            has_valid_customer: hasValidCustomer, // lodash validation
            field_count: _.keys(cleanedOrder).length, // lodash utility
        };
    }
    private transformOrderType2(inputOrder: OrderType2): MergedOrder {
        const now = moment();
        
        // Example using lodash for data manipulation
        const cleanedOrder = _.omitBy(inputOrder, _.isUndefined);
        const hasValidCustomer = _.has(cleanedOrder, 'customer.name') && !_.isEmpty(cleanedOrder.customer.name);
        
        // Example using uuid for unique identifiers
        const processingId = uuidv4();
        
        return {
            version: '0.1.4',
            _id: inputOrder.order_id,
            order_number: inputOrder.order_number,
            location_id: inputOrder.location_id,
            order_type: inputOrder.order_type,
            channel: inputOrder.channel,
            customer: inputOrder.customer,
            organization_id: inputOrder.customer.organization_id,
            processed_at: now.toISOString(),
            processed_time: now.format('YYYY-MM-DD HH:mm:ss'),
            // Examples of using npm dependencies:
            processing_id: processingId, // uuid generated
            has_valid_customer: hasValidCustomer, // lodash validation
            field_count: _.keys(cleanedOrder).length, // lodash utility
        };
    }
}