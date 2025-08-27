import { OrderTransformer } from "./OrderTransformer";
import { OrderType1 } from "./OrderType1";
import { OrderType2 } from "./OrderType2";
import { Customer } from "./Customer";
import moment from "moment";

describe("OrderTransformer", () => {
    let transformer: OrderTransformer;
    
    beforeEach(() => {
        transformer = new OrderTransformer();
    });

    const mockRecord = {
        key: {},
        value: {}, 
        keySchema: {}, 
        keyValue: {}
    };

    const mockCustomer: Customer = {
        version: "0.1.4",
        _id: "customer-123",
        name: "Test Customer",
        organization_id: "org-456"
    };

    describe("transformOrderType1", () => {
        it("should transform OrderType1 correctly", () => {
            const inputOrder: OrderType1 = {
                _id: "express-test123",
                order_type: "OrderType1",
                order_number: 12345,
                location_id: "loc-789",
                channel: "express",
                customer: mockCustomer,
                organization_id: "org-456"
            };

            const result = transformer.transform(inputOrder);

            expect(result.version).toBe("0.1.4");
            expect(result._id).toBe("express-test123");
            expect(result.order_number).toBe(12345);
            expect(result.location_id).toBe("loc-789");
            expect(result.order_type).toBe("OrderType1");
            expect(result.channel).toBe("express");
            expect(result.customer).toBe(mockCustomer);
            expect(result.organization_id).toBe("org-456");
            
            expect(result.processed_at).toBeDefined();
            expect(result.processed_time).toBeDefined();
            
            // Verify timestamp format
            expect(moment(result.processed_at).isValid()).toBe(true);
            expect(result.processed_time).toMatch(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/);
            
            expect(result.processing_id).toBeDefined();
            expect(typeof result.processing_id).toBe('string');
            expect(result.processing_id.length).toBe(36); // UUID v4 format length
            expect(result.processing_id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/); // UUID v4 format
            
            expect(result.has_valid_customer).toBe(true); // Customer is valid
            expect(typeof result.has_valid_customer).toBe('boolean');
            
            expect(result.field_count).toBeGreaterThan(0);
            expect(typeof result.field_count).toBe('number');
            expect(result.field_count).toBe(7); // Number of fields in input order (after cleaning undefined)
        });
    });

    describe("transformOrderType2", () => {
        it("should transform OrderType2 correctly", () => {
            const inputOrder: OrderType2 = {
                order_id: "rpos-test456", 
                order_type: "OrderType2",
                order_number: 67890,
                location_id: "loc-123",
                channel: "rpos",
                customer: {
                    ...mockCustomer,
                    organization_id: "org-789"
                }
            };

            const result = transformer.transform(inputOrder);

            expect(result.version).toBe("0.1.4");
            expect(result._id).toBe("rpos-test456"); // Uses order_id for OrderType2
            expect(result.order_number).toBe(67890);
            expect(result.location_id).toBe("loc-123");
            expect(result.order_type).toBe("OrderType2");
            expect(result.channel).toBe("rpos");
            expect(result.customer!.organization_id).toBe("org-789");
            expect(result.organization_id).toBe("org-789"); // Gets it from customer for OrderType2
            
            expect(result.processed_at).toBeDefined();
            expect(result.processed_time).toBeDefined();
            
            // Verify timestamp format
            expect(moment(result.processed_at).isValid()).toBe(true);
            expect(result.processed_time).toMatch(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/);
            
            expect(result.processing_id).toBeDefined();
            expect(typeof result.processing_id).toBe('string');
            expect(result.processing_id.length).toBe(36); // UUID v4 format length
            expect(result.processing_id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/); // UUID v4 format
            
            expect(result.has_valid_customer).toBe(true); // Customer is valid
            expect(typeof result.has_valid_customer).toBe('boolean');
            
            expect(result.field_count).toBeGreaterThan(0);
            expect(typeof result.field_count).toBe('number');
            expect(result.field_count).toBe(6); // Number of fields in input order (after cleaning undefined)
        });
    });

    describe("npm dependency functionality", () => {
        it("should generate unique UUIDs for each transformation", () => {
            const inputOrder: OrderType1 = {
                _id: "test-uuid",
                order_type: "OrderType1",
                order_number: 1,
                location_id: "loc-1",
                channel: "express",
                customer: mockCustomer,
                organization_id: "org-1"
            };

            const result1 = transformer.transform(inputOrder);
            const result2 = transformer.transform(inputOrder);

            // UUIDs should be unique
            expect(result1.processing_id).not.toBe(result2.processing_id);
            expect(result1.processing_id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
            expect(result2.processing_id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
        });

        it("should validate customer correctly with lodash", () => {
            // Test with valid customer
            const validOrder: OrderType1 = {
                _id: "test-valid-customer",
                order_type: "OrderType1",
                order_number: 1,
                location_id: "loc-1",
                channel: "express",
                customer: mockCustomer,
                organization_id: "org-1"
            };

            const validResult = transformer.transform(validOrder);
            expect(validResult.has_valid_customer).toBe(true);

            // Test with customer without name
            const invalidOrder: OrderType1 = {
                _id: "test-invalid-customer",
                order_type: "OrderType1",
                order_number: 2,
                location_id: "loc-2",
                channel: "express",
                customer: {
                    version: "0.1.4",
                    _id: "customer-invalid",
                    name: "", // Empty name
                    organization_id: "org-456"
                },
                organization_id: "org-2"
            };

            const invalidResult = transformer.transform(invalidOrder);
            expect(invalidResult.has_valid_customer).toBe(false);
        });

        it("should count fields correctly with lodash", () => {
            const inputOrder: OrderType1 = {
                _id: "test-field-count",
                order_type: "OrderType1",
                order_number: 1,
                location_id: "loc-1",
                channel: "express",
                customer: mockCustomer,
                organization_id: "org-1"
            };

            const result = transformer.transform(inputOrder);
            
            // Should count the number of defined fields in input
            expect(result.field_count).toBeGreaterThan(0);
            expect(typeof result.field_count).toBe('number');
        });

        it("should have consistent timestamps across transformations", () => {
            const inputOrder: OrderType1 = {
                _id: "test-consistency",
                order_type: "OrderType1",
                order_number: 1,
                location_id: "loc-1",
                channel: "express",
                customer: mockCustomer,
                organization_id: "org-1"
            };

            const result1 = transformer.transform(inputOrder);
            const result2 = transformer.transform(inputOrder);

            // Timestamps should be very close (within 1 second)
            const time1 = moment(result1.processed_at);
            const time2 = moment(result2.processed_at);
            const diff = Math.abs(time1.diff(time2));
            
            expect(diff).toBeLessThan(1000); // Less than 1 second difference
        });
    });
});